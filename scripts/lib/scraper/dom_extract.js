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
async function extractChunkedText(ws, sendCommand, chunkSize = 50000, maxRetries = 3) {
  // OCA is a reactive WebLogic UI. Reading document.body.innerText separately
  // for every chunk allows a mid-extraction render (often "Loading...") to
  // shrink or replace the DOM, producing a declared length of ~40K but a saved
  // payload of only a few hundred characters. Freeze one immutable snapshot in
  // the page execution context and chunk that value instead.
  // Retry if page is caught in transient render/loading state.
  let totalLen = 0;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const textLenRes = await sendCommand(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const documents = [document];
        for (let i = 0; i < documents.length; i++) {
          for (const frame of documents[i].querySelectorAll('iframe')) {
            try { if (frame.contentDocument && !documents.includes(frame.contentDocument)) documents.push(frame.contentDocument); } catch (_) {}
          }
        }
        const isLoading = documents.some(doc => Array.from(doc.querySelectorAll('.loading, .spinner, #loading_indicator')).some(el => el.getClientRects().length));
        const text = documents.map(doc => doc.body?.innerText || '').filter(Boolean).join('\\n');
        globalThis.__ocaBodyTextSnapshot = text;
        return { length: text.length, isLoading };
      })()`,
      returnByValue: true
    });
    const rawVal = textLenRes.result?.value;
    const info = typeof rawVal === 'object' && rawVal !== null
      ? rawVal
      : { length: Number(rawVal) || 0, isLoading: false };
    totalLen = Number(info.length) || 0;

    if (totalLen > 0 && !info.isLoading) {
      break;
    }
    if (attempt < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, 600));
    }
  }

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
      let tables = Array.from(root.querySelectorAll('table'));
      try {
        const iframes = root.querySelectorAll('iframe');
        iframes.forEach(f => {
          try {
            if (f.contentDocument) {
              tables = tables.concat(Array.from(f.contentDocument.querySelectorAll('table')));
            }
          } catch (_) {}
        });
      } catch (_) {}

      const result = [];
      tables.forEach((table, idx) => {
        const rows = [];
        table.querySelectorAll('tr').forEach(tr => {
          if (tr.closest('table') !== table) return;
          const cells = [];
          const badgeSpan = tr.querySelector('.td_prod');
          const badge = badgeSpan ? (badgeSpan.innerText || badgeSpan.textContent || '').trim() : '';
          tr.querySelectorAll('td, th').forEach(cell => {
            if (cell.parentElement !== tr || cell.querySelector('table')) return;
            const pidSpan = cell.querySelector('._pid, .item_prod span._pid');
            if (pidSpan) {
              const pid = (pidSpan.innerText || pidSpan.textContent || '').trim();
              cells.push(badge ? (pid + ' [' + badge + ']') : pid);
            } else {
              const cellText = (cell.innerText || cell.textContent || '').trim();
              cells.push(cellText);
            }
          });
          if (cells.length > 0 && cells.some(c => c.length > 0)) rows.push(cells);
        });
        if (rows.length > 0) result.push({ tableIndex: idx, tableId: table.id || '', rowCount: rows.length, rows });
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
  const seenLines = new Set();
  for (const table of tables || []) {
    for (const row of table.rows || []) {
      const line = (row || []).map(cell => String(cell || '').trim()).filter(Boolean).join('\t');
      if (line && !seenLines.has(line)) {
        seenLines.add(line);
        lines.push(line);
      }
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
