'use strict';
/**
 * scripts/lib/dom_extract.js — Shared DOM Extraction Helpers
 *
 * Consolidated DOM extraction routines (chunked text, row-array tables, section headers)
 * to prevent copy-paste drift across scraping scripts. Pure function helpers that
 * accept sendCommand explicitly to prevent cyclic dependencies.
 */

/**
 * Extract body text in safe <= 50,000 char chunks over CDP.
 * @param {WebSocket} ws
 * @param {Function} sendCommand
 * @param {number} [chunkSize=50000]
 * @returns {Promise<{ fullText: string, totalLen: number }>}
 */
async function extractChunkedText(ws, sendCommand, chunkSize = 50000) {
  // OCA is a reactive WebLogic UI. Reading document.body.innerText separately
  // for every chunk allows a mid-extraction render (often "Loading...") to
  // shrink or replace the DOM, producing a declared length of ~40K but a saved
  // payload of only a few hundred characters. Freeze one immutable snapshot in
  // the page execution context and chunk that value instead.
  const textLenRes = await sendCommand(ws, 'Runtime.evaluate', {
    expression: `(() => {
      globalThis.__ocaBodyTextSnapshot = document.body ? document.body.innerText : '';
      return globalThis.__ocaBodyTextSnapshot.length;
    })()`,
    returnByValue: true
  });
  const totalLen = textLenRes.result?.value || 0;

  let fullText = '';
  for (let i = 0; i < totalLen; i += chunkSize) {
    const chunk = await sendCommand(ws, 'Runtime.evaluate', {
      expression: `String(globalThis.__ocaBodyTextSnapshot || '').substring(${i}, ${i + chunkSize})`,
      returnByValue: true
    });
    fullText += chunk.result?.value || '';
  }

  try {
    await sendCommand(ws, 'Runtime.evaluate', {
      expression: 'delete globalThis.__ocaBodyTextSnapshot',
      returnByValue: true
    });
  } catch (_) {
    // Snapshot cleanup is best-effort; the OCA tab is short-lived.
  }

  return { fullText, totalLen };
}

/**
 * Extract DOM tables as ROW ARRAYS (for build_catalog.js classification engine).
 * @param {WebSocket} ws
 * @param {Function} sendCommand
 * @param {string} [scopeSelector] Optional sub-panel container selector
 * @returns {Promise<Array<{ tableIndex: number, rowCount: number, rows: Array<Array<string>> }>>}
 */
async function extractTablesAsRows(ws, sendCommand, scopeSelector = null) {
  const scopeExpr = scopeSelector ? `document.querySelector(${JSON.stringify(scopeSelector)})` : 'document';
  const tableResult = await sendCommand(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const root = ${scopeExpr} || document;
      const tables = root.querySelectorAll('table');
      const result = [];
      tables.forEach((table, idx) => {
        const rows = [];
        table.querySelectorAll('tr').forEach(tr => {
          const cells = [];
          const badgeSpan = tr.querySelector('.td_prod');
          const badge = badgeSpan ? (badgeSpan.innerText || '').trim() : '';
          tr.querySelectorAll('td, th').forEach(cell => {
            const pidSpan = cell.querySelector('._pid, .item_prod span._pid');
            if (pidSpan) {
              const pid = (pidSpan.innerText || '').trim();
              cells.push(badge ? (pid + ' [' + badge + ']') : pid);
            } else {
              cells.push((cell.innerText || '').trim());
            }
          });
          if (cells.length > 0) rows.push(cells);
        });
        if (rows.length > 0) result.push({ tableIndex: idx, rowCount: rows.length, rows });
      });
      return JSON.stringify(result);
    })()`,
    returnByValue: true
  });

  try {
    return JSON.parse(tableResult.result?.value || '[]');
  } catch (e) {
    console.warn(`[WARN] [DOM_EXTRACT] Failed to parse tables: ${e.message}`);
    return [];
  }
}

function deriveTextFromTables(tables) {
  const lines = [];
  let previous = null;
  for (const table of tables || []) {
    for (const row of table.rows || []) {
      const line = (row || []).map(cell => String(cell || '').trim()).filter(Boolean).join('\t');
      if (line && line !== previous) lines.push(line);
      previous = line;
    }
  }
  return lines.join('\n');
}

/**
 * Extract DOM section headers for landmark category matching.
 * @param {WebSocket} ws
 * @param {Function} sendCommand
 * @returns {Promise<Array<{ tagName: string, text: string, className: string }>>}
 */
async function extractSectionHeaders(ws, sendCommand) {
  const sectionsResult = await sendCommand(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const headers = Array.from(document.querySelectorAll(
        'h1, h2, h3, h4, .section-header, .menu_category_header, [class*="category_header"], [class*="section_title"]'
      ));
      return JSON.stringify(headers.map(h => ({
        tagName: h.tagName,
        text: (h.innerText || '').trim(),
        className: h.className || ''
      })).filter(h => h.text.length > 0));
    })()`,
    returnByValue: true
  });

  try {
    return JSON.parse(sectionsResult.result?.value || '[]');
  } catch (e) {
    console.warn(`[WARN] [DOM_EXTRACT] Failed to parse section headers: ${e.message}`);
    return [];
  }
}

module.exports = { deriveTextFromTables, extractChunkedText, extractTablesAsRows, extractSectionHeaders };
