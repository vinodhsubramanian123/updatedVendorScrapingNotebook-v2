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

/**
 * Extract DOM elements that are currently hidden (display:none / visibility:hidden) but contain product IDs.
 * Captures SKUs that are conditionally visible (e.g. under ≤27°C ambient or high-TDP CPU trigger).
 * @param {WebSocket} ws
 * @param {Function} sendCommand
 * @returns {Promise<Array<{ sku: string, ruleContext: string, visibilityReason: string, parentClass: string }>>}
 */
async function extractHiddenElements(ws, sendCommand) {
  const result = await sendCommand(ws, 'Runtime.evaluate', {
    expression: String.raw`(() => {
      const hidden = [];
      const seen = new Set();
      // All elements tagged with product ID classes
      const allPidEls = Array.from(document.querySelectorAll('._pid, [class*="_pid"]'));
      for (const el of allPidEls) {
        let rawSku = (el.innerText || el.textContent || '').replace(/[\r\n\t]+/g, ' ').trim();
        rawSku = rawSku.replace(/^(?:OB|CS|90)\s+/i, '').trim();
        const sku = rawSku.replace(/\s+PVT$/i, '').trim();
        if (!sku || sku === 'Product #' || /^(?:OB|CS|90|DS|PVT|NA|N\/A)$/i.test(sku) || /^(?:dl\d+pat|cntr\d+|da\d+|dl\d+smtch)/i.test(sku) || seen.has(sku)) continue;
        // Walk up the DOM to determine if this element or any ancestor is hidden
        let isHidden = false;
        let ancestor = el;
        let hiddenAncestor = null;
        while (ancestor && ancestor !== document.body) {
          try {
            const style = window.getComputedStyle(ancestor);
            if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) {
              isHidden = true;
              hiddenAncestor = ancestor;
              break;
            }
          } catch (_) {}
          ancestor = ancestor.parentElement;
        }
        if (isHidden) {
          const row = el.closest('tr, .item_row, [data-item-id]');
          const table = row?.closest('table');
          const isUnavailableTable = Boolean(table?.closest('.UavailableTable, .uavailableTable_tr, [class*="uavailable"]'));
          const redHeader = table?.querySelector('.choice_header1[style*="red"], .choice_header1.unavailable, [style*="color: red"], [style*="color:red"]');
          let ruleContext = (redHeader?.innerText || redHeader?.textContent || '').replace(/[\r\n\t]+/g, ' ').trim();

          // Only treat as conditional if inside an unavailable table or with an explicit constraint header
          if (!isUnavailableTable && !ruleContext) {
            continue;
          }

          seen.add(sku);
          const badge = row ? (row.querySelector('.td_prod')?.innerText || '').trim() : '';
          hidden.push({
            sku,
            badge,
            ruleContext: ruleContext || 'Gated by configuration choice',
            visibilityReason: 'HIDDEN_IN_DEFAULT_DOM_STATE',
            hiddenAncestorClass: hiddenAncestor?.className || '',
            parentClass: el.parentElement?.className || ''
          });
        }
      }
      return JSON.stringify(hidden);
    })()`,
    returnByValue: true
  });
  try {
    return JSON.parse(result.result?.value || '[]');
  } catch (e) {
    console.warn(`[WARN] [DOM_EXTRACT] Failed to parse hidden elements: ${e.message}`);
    return [];
  }
}

/**
 * Probe ambient-temperature conditional SKU visibility by iterating known OCA threshold values.
 * For each threshold, simulates the ambient selector change and diffs the visible SKU set.
 * Returns conditional SKU records for any SKU that appears under a non-default ambient.
 *
 * IMPORTANT: Restores original ambient value before returning.
 *
 * @param {WebSocket} ws
 * @param {Function} sendCommand
 * @param {Array<number>} [thresholds=[35, 30, 27, 25]] Ambient °C values to probe
 * @returns {Promise<Array<{ sku: string, conditionType: string, operator: string, thresholdDegC: number, visibleAtDefaultC: boolean, evidence: string }>>}
 */
async function probeConditionalSkuVisibility(ws, sendCommand, thresholds = [35, 30, 27, 25], captureState = null) {
  const conditionalSkus = [];
  const seen = new Set();

  // Detect the ambient selector
  const selectorRes = await sendCommand(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const el = document.querySelector('select[name*="ambient"], select[id*="ambient"], select[aria-label*="ambient" i], select[title*="ambient" i]');
      if (!el) return JSON.stringify({ found: false, id: null, currentValue: null, options: [] });
      return JSON.stringify({
        found: true,
        id: el.id || el.name || '',
        currentValue: el.value,
        options: Array.from(el.options).map(o => ({ value: o.value, text: o.text.trim() }))
      });
    })()`,
    returnByValue: true
  });

  let selectorInfo = {};
  try { selectorInfo = JSON.parse(selectorRes.result?.value || '{}'); } catch (_) {}

  if (!selectorInfo.found) {
    const rowResults = await require('./ambient_row_probe').probeAmbientRows(ws, sendCommand, thresholds, captureState);
    if (rowResults !== null) return rowResults;
    // No ambient selector found — still capture hidden elements as PORTAL_CONDITIONAL_VIEW
    const hiddenAtDefault = await extractHiddenElements(ws, sendCommand);
    for (const item of hiddenAtDefault) {
      if (!seen.has(item.sku)) {
        seen.add(item.sku);
        conditionalSkus.push({
          ...item,
          conditionType: 'PORTAL_CONDITIONAL_VIEW',
          operator: 'requires_selection',
          thresholdDegC: null,
          visibleAtDefaultC: false,
          evidence: item.ruleContext ? `Gated/conditional: ${item.ruleContext}` : 'SKU hidden in default DOM state (requires selector activation)'
        });
      }
    }
    return conditionalSkus;
  }

  const originalValue = selectorInfo.currentValue;
  const selectedText = selectorInfo.options.find(option => option.value === originalValue)?.text || '';
  const defaultTemp = Number(selectedText.match(/\d+(?:\.\d+)?/)?.[0] || originalValue);

  // Snapshot the default-visible SKU set
  const defaultVisibleRes = await sendCommand(ws, 'Runtime.evaluate', {
    expression: `JSON.stringify(Array.from(document.querySelectorAll('._pid')).map(e => (e.innerText || '').trim()).filter(Boolean))`,
    returnByValue: true
  });
  let defaultVisible = new Set();
  try { defaultVisible = new Set(JSON.parse(defaultVisibleRes.result?.value || '[]')); } catch (_) {}

  try {
  for (const threshold of thresholds) {
    if (parseFloat(threshold) === defaultTemp) continue; // skip default

    // Find the matching option value for this threshold
    const matchingOption = (selectorInfo.options || []).find(o =>
      parseFloat(o.value) === threshold || o.text.includes(String(threshold)));
    if (!matchingOption) continue;

    // Set ambient to threshold
    const setRes = await sendCommand(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const el = ${selectorInfo.id ? `document.getElementById(${JSON.stringify(selectorInfo.id)}) || ` : ''}document.querySelector('select[name*="ambient"], select[id*="ambient"], select[aria-label*="ambient" i], select[title*="ambient" i]');
        if (!el) return { success: false, error: 'Ambient selector disappeared' };
        el.value = ${JSON.stringify(matchingOption.value)};
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return { success: true };
      })()`,
      returnByValue: true
    });
    if (!setRes?.result?.value?.success) {
      console.warn('⚠️  Ambient selector could not be set to threshold:', setRes?.result?.value?.error);
      continue;
    }

    // Wait for WebLogic re-render
    await new Promise(resolve => setTimeout(resolve, 2500));
    if (captureState) await captureState({ conditionKey: 'ambient_temp', thresholdValue: threshold });

    // Snapshot newly visible SKUs
    const probeRes = await sendCommand(ws, 'Runtime.evaluate', {
      expression: `JSON.stringify(Array.from(document.querySelectorAll('._pid')).map(e => (e.innerText || '').trim()).filter(Boolean))`,
      returnByValue: true
    });
    let probeVisible = new Set();
    try { probeVisible = new Set(JSON.parse(probeRes.result?.value || '[]')); } catch (_) {}

    // SKUs that appear at this threshold but NOT at default = conditional SKUs
    for (const sku of probeVisible) {
      if (!defaultVisible.has(sku) && !seen.has(sku)) {
        seen.add(sku);
        conditionalSkus.push({
          sku,
          conditionType: 'AMBIENT_GATE',
          operator: threshold < defaultTemp ? 'lte' : 'gte',
          thresholdDegC: threshold,
          visibleAtDefaultC: false,
          visibleAt27C: threshold === 27,
          evidence: `HPE OCA DOM — SKU became visible when ambient selector set to ≤${threshold}°C (default: ${defaultTemp}°C)`,
          portalVerificationRequired: true
        });
      }
    }
  }

  } finally {
    // Restore original ambient value safely
    try {
      await sendCommand(ws, 'Runtime.evaluate', {
        expression: `(() => {
          const el = ${selectorInfo.id ? `document.getElementById(${JSON.stringify(selectorInfo.id)}) || ` : ''}document.querySelector('select[name*="ambient"], select[id*="ambient"], select[aria-label*="ambient" i], select[title*="ambient" i]');
          if (el) {
            el.value = ${JSON.stringify(originalValue)};
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
        })()`,
        returnByValue: true
      });
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (restoreErr) {
      console.warn('⚠️  Could not restore ambient selector:', restoreErr.message);
    }
  }

  return conditionalSkus;
}

const { extractUnavailableDomRules, parseUnavailableDomRules } = require('./dom_unavailable_rules.js');

module.exports = {
  deriveTextFromTables,
  extractChunkedText,
  extractTablesAsRows,
  extractSectionHeaders,
  extractHiddenElements,
  probeConditionalSkuVisibility,
  extractUnavailableDomRules,
  parseUnavailableDomRules
};

