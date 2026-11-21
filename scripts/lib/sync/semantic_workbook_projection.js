'use strict';
const crypto = require('crypto');

// Columns that carry diff-history text (Attribute Deltas, Price History Trail).
// These are written for human Excel viewers and audit trails; they are not needed
// for LLM inventory RAG (the LLM queries current price, lead time, availability,
// and rules — none of which require the per-SKU delta narrative).
// Stripping them prevents SEMANTIC_SOURCE_TOO_LARGE on large catalogs (e.g.
// DL360_Gen12 with 1,303 modified SKUs blows past 400,000 words without this).
const DIFF_HISTORY_COLUMNS = new Set([
  'Attribute Deltas',
  'Price History Trail',
  'Price Change (%)',
  'Price Change (USD)',
  'Previous List Price (USD)',
  'Diff Status',
]);

// Sheets that duplicate current-state data already present in 'All SKUs' and
// category sub-sheets, or that exist solely for human audit / Excel navigation.
// Excluding them from the NLM projection keeps the payload under 400k words
// while preserving all actionable inventory and rules content.
const EXCLUDED_FOR_LLM_SHEETS = new Set([
  'Catalog Diffs',
  'Price History Timeline',
  'Supply Chain & Lead Times',
]);

// Strip diff-history columns from a tab's rows. The header row drives column
// detection so row arrays of varying widths are handled correctly.
function _stripDiffHistoryColumnsFromTab(tab) {
  const rows = tab.rows || [];
  if (rows.length === 0) return tab;
  const hdr = rows[0];
  const keepIdxs = hdr.map((h, i) => (DIFF_HISTORY_COLUMNS.has(String(h).trim()) ? -1 : i)).filter(i => i >= 0);
  if (keepIdxs.length === hdr.length) return tab; // nothing to strip
  return { title: tab.title, rows: rows.map(row => keepIdxs.map(i => row[i] ?? '')) };
}

// Preserve displayed cell contents and column positions. A fingerprint proves
// identity only; it cannot replace the inventory/rules an LLM must retrieve.
function projectWorkbookToMarkdown(tabs, options = {}) {
  // Apply LLM-payload filtering when requested (default: ON for inventory safety).
  // Pass stripDiffHistoryColumns: false only in tests that explicitly verify
  // the raw diff-history content round-trip.
  const stripDiff = options.stripDiffHistoryColumns !== false;
  const activeTabs = (tabs || [])
    .filter(tab => !EXCLUDED_FOR_LLM_SHEETS.has(String(tab.title).trim()))
    .map(tab => (stripDiff ? _stripDiffHistoryColumnsFromTab(tab) : tab));

  const cell = value => String(value ?? '').replace(/\\/g, '/').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/\|/g, '&#124;').replace(/\r?\n/g, '<br>');
  const seen = new Map();
  const frequencies = new Map();
  for (const tab of activeTabs) for (const row of tab.rows || []) for (const value of row) {
    const text = String(value ?? '');
    if (text.length > 120) frequencies.set(text, (frequencies.get(text) || 0) + 1);
  }
  const sharedText = new Map([...frequencies].filter(([, count]) => count > 1)
    .map(([text], index) => [text, `TEXT_${index + 1}`]));
  const renderCell = value => sharedText.has(String(value ?? '')) ? `[${sharedText.get(String(value))}]` : cell(value);
  const lines = ['## Complete workbook text projection', '',
    'Displayed cell values follow by sheet and original row. Formatting, charts and formulas remain in the Excel artifact. Repeated rows refer to the first identical row and schema; no content is replaced by a fingerprint.', ''];
  let projectedRows = 0;
  let referencedRows = 0;
  for (const tab of activeTabs) {
    const rows = tab.rows || [];
    const width = Math.max(0, ...rows.map(row => row.length));
    lines.push(`### ${cell(tab.title)}`, '');
    if (!width) { lines.push('Empty sheet.', ''); continue; }
    const schema = rows[0] || [];
    lines.push(`| Original row | ${Array.from({ length: width }, (_, i) => `Column ${i + 1}`).join(' | ')} |`,
      `| --- | ${Array(width).fill('---').join(' | ')} |`);
    const references = [];
    rows.forEach((row, index) => {
      const key = crypto.createHash('sha256').update(JSON.stringify({ schema, row })).digest('hex');
      const prior = seen.get(key);
      if (index > 0 && prior) {
        referencedRows++;
        references.push(`Row ${index + 1}: identical to ${prior}.`);
      } else {
        projectedRows++;
        seen.set(key, `sheet ${cell(tab.title)}, row ${index + 1}`);
        lines.push(`| ${index + 1} | ${Array.from({ length: width }, (_, i) => renderCell(row[i])).join(' | ')} |`);
      }
    });
    lines.push('', ...references, '');
  }
  lines.push('## Shared cell text', '', 'Bracketed TEXT identifiers above refer to these exact repeated values. The surrounding sheet, column and row determine applicability.', '');
  for (const [text, id] of sharedText) lines.push(`### ${id}`, '', cell(text), '');
  const markdown = lines.join('\n');
  const words = markdown.split(/\s+/).filter(Boolean).length;
  if (words > (options.maxWords || 400000)) {
    throw new Error(`SEMANTIC_SOURCE_TOO_LARGE: ${words} words; partition the source before upload, never replace data with row counts`);
  }
  return { markdown, projectedRows, referencedRows, sheetCount: activeTabs.length, words };
}
function verifySemanticProjectionReadback(payload, indexedContent) {
  const projection = String(payload).split('## Complete workbook text projection')[1];
  if (!projection) throw new Error('SEMANTIC_PROJECTION_MISSING');
  let parsed;
  try { parsed = JSON.parse(indexedContent); } catch (_) { parsed = indexedContent; }
  // Only indexed source content is evidence; titles and other response metadata
  // must never fill a hole in the indexed body.
  const body = typeof parsed === 'string' ? parsed : parsed?.content;
  if (typeof body !== 'string' || !body.trim()) throw new Error('SEMANTIC_PROJECTION_READBACK_EMPTY');
  const normalize = value => String(value)
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/&(?:amp|lt|gt|#124|quot|#39|nbsp);/g, entity => ({
      '&amp;': '&', '&lt;': '<', '&gt;': '>', '&#124;': '|', '&quot;': '"', '&#39;': "'", '&nbsp;': ' '
    })[entity] || '')
    .replace(/^\s*\|(?:\s*:?-+:?\s*\|)+\s*$/gm, '')
    .replace(/^\s*#{1,6}\s+/gm, '')
    .replace(/\[(TEXT_\d+)\]/g, '$1')
    .replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g, '$1')
    .replace(/\/([.])/g, '$1')
    .replace(/\\/g, '/')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u00a0\u200b\u00ad]/g, '')
    .replace(/\|/g, '').replace(/\s/g, '');
  const actual = normalize(body);
  const expectedLines = projection.split('\n').map(normalize).filter(Boolean);
  // NotebookLM can insert whitespace inside words and SKUs in long cells.
  // Compare every normalized character in order, never a percentage of chunks:
  // a missing price, SKU or prerequisite must still fail readback.
  // Consume matches in order, so an earlier duplicate cannot conceal a missing
  // row or a value moved to the wrong sheet. Keep case, prices and operators.
  const heading = normalize('Complete workbook text projection');
  let cursor = actual.indexOf(heading);
  if (cursor < 0) throw new Error('SEMANTIC_PROJECTION_READBACK_INCOMPLETE: heading');
  cursor += heading.length;

  for (let i = 0; i < expectedLines.length; i++) {
    const line = expectedLines[i];
    const position = actual.indexOf(line, cursor);
    if (position < 0) {
      throw new Error(`SEMANTIC_PROJECTION_READBACK_INCOMPLETE: normalized line ${i + 1}`);
    }
    cursor = position + line.length;
  }
  return true;
}
module.exports = { projectWorkbookToMarkdown, verifySemanticProjectionReadback };
