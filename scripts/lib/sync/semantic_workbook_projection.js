'use strict';
const crypto = require('crypto');

// Preserve displayed cell contents and column positions. A fingerprint proves
// identity only; it cannot replace the inventory/rules an LLM must retrieve.
function projectWorkbookToMarkdown(tabs, options = {}) {
  const cell = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/\|/g, '&#124;').replace(/\r?\n/g, '<br>');
  const seen = new Map();
  const frequencies = new Map();
  for (const tab of tabs || []) for (const row of tab.rows || []) for (const value of row) {
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
  for (const tab of tabs || []) {
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
  return { markdown, projectedRows, referencedRows, sheetCount: (tabs || []).length, words };
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
    .replace(/&(?:amp|lt|gt|#124);/g, entity => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&#124;': '|' })[entity])
    .replace(/^\s*\|(?:\s*:?-+:?\s*\|)+\s*$/gm, '')
    .replace(/^\s*#{1,6}\s+/gm, '')
    .replace(/\[(TEXT_\d+)\]/g, '$1')
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
