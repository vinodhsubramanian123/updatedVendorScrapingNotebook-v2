'use strict';

const { cleanBaseSKU, classifyOptionType, isTaaGtaCatalogOption } = require('../catalog/sku.js');

const INSPECT_BACKPLANE_STATE_EXPR = `(() => {
  const isVis = el => Boolean(el && el.offsetWidth > 0 && el.offsetHeight > 0 && getComputedStyle(el).display !== 'none');
  const hotPlugRows = Array.from(document.querySelectorAll('tr.item_tr[id*="HotPlugSFFChoice"], tr.item_tr[id*="HotPlugLFFChoice"]'))
    .filter(tr => !tr.closest('table.UavailableTable') && isVis(tr));
  const candRows = Array.from(document.querySelectorAll('tr.item_tr[id*="smartChassisDriveCage"], tr.item_tr[id*="storage_Backplane"]'))
    .filter(tr => !tr.closest('table.UavailableTable') && isVis(tr))
    .map(tr => {
      const tds = Array.from(tr.children);
      const raw0 = (tds[0]?.innerText || '').replace(/[\\r\\n\\t]+/g, ' ').trim();
      const badgeMatch = raw0.match(/^(OB|CS|90|DS|PVT)\\s+(.+)$/i);
      const badge = badgeMatch ? badgeMatch[1].toUpperCase() : '';
      const sku = (badgeMatch ? badgeMatch[2] : raw0).trim();
      const qtyDiv = tr.querySelector('.item_qty_div, span[id^="selectedQty_"]');
      const qtyText = (qtyDiv?.innerText || '').trim();
      return {
        id: tr.id || '',
        badge,
        sku,
        description: (tds[1]?.innerText || '').replace(/[\\r\\n\\t]+/g, ' ').trim(),
        qtyText
      };
    })
    .filter(c => c.id && c.sku && !/^(?:OB|CS|DS|PVT)$/i.test(c.badge) && c.qtyText === '0');
  return {
    hasVisibleHotPlug: hotPlugRows.length > 0,
    visibleHotPlugCount: hotPlugRows.length,
    candidates: candRows
  };
})()`;

const EXTRACT_VISIBLE_DRIVE_ROWS_EXPR = `(() => {
  const isVis = el => Boolean(el && el.offsetWidth > 0 && el.offsetHeight > 0 && getComputedStyle(el).display !== 'none');
  const rows = Array.from(document.querySelectorAll('tr.item_tr[id*="HotPlugSFFChoice"], tr.item_tr[id*="HotPlugLFFChoice"], tr.item_tr[id*="EDSFFChoice"]'));
  return rows.map(tr => {
    const tbl = tr.closest('table');
    const hdrTr = tbl ? tbl.querySelector('tr.table_header, thead tr, tr:first-child') : null;
    const headers = hdrTr ? Array.from(hdrTr.children).map(c => (c.innerText || '').replace(/\\s+/g, ' ').trim()) : [];
    const cells = Array.from(tr.children).map(td => (td.innerText || '').trim());
    return {
      id: tr.id || '',
      className: tr.className || '',
      inUnavail: Boolean(tr.closest('table.UavailableTable')),
      visible: isVis(tr),
      headers,
      cells
    };
  });
})()`;

function _buildSetQtyClickExpr(rowId) {
  return `(() => {
    const row = document.getElementById(${JSON.stringify(rowId)});
    const qtyEl = row?.querySelector('.item_qty_div') || row?.querySelector('span[id^="selectedQty_"]');
    if (!qtyEl?.getClientRects().length || row.closest('table.UavailableTable')) return false;
    if (row.matches('tr.editing')) return true;
    qtyEl.scrollIntoView({ block: 'center' });
    const rect = qtyEl.getBoundingClientRect();
    qtyEl.dispatchEvent(new MouseEvent('click', {
      bubbles: true, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2
    }));
    return true;
  })()`;
}

function _buildPopupOptionClickExpr(rowId, targetQty) {
  return `(() => {
    const row = document.getElementById(${JSON.stringify(rowId)});
    const qtyEl = row?.querySelector('.item_qty_div') || row?.querySelector('span[id^="selectedQty_"]');
    if (!row?.matches('tr.editing') || !qtyEl?.getClientRects().length) return false;
    const origin = qtyEl.getBoundingClientRect();
    const options = [...document.querySelectorAll(${JSON.stringify(`ul.popup-menu-body a[name="${targetQty}"]`)})].filter(option => {
      const rect = option.getBoundingClientRect();
      return option.getClientRects().length && Math.abs(rect.x - origin.x) < 250 && Math.abs(rect.y - origin.y) < 250;
    });
    if (options.length !== 1) return false;
    const option = options[0];
    setTimeout(() => {
      if (option.isConnected && row.matches('tr.editing')) option.click();
    }, 0);
    return true;
  })()`;
}

function _buildReadRowQtyExpr(rowId) {
  return `(() => {
    const row = document.getElementById(${JSON.stringify(rowId)});
    const qtyEl = row?.querySelector('.item_qty_div') || row?.querySelector('span[id^="selectedQty_"]');
    return {
      present: Boolean(qtyEl?.getClientRects().length && !row.closest('table.UavailableTable')),
      qtyText: (qtyEl?.innerText || '').trim(),
      hotPlugCount: document.querySelectorAll('tr.item_tr[id*="HotPlugSFFChoice"], tr.item_tr[id*="HotPlugLFFChoice"], tr.item_tr[id*="EDSFFChoice"]').length
    };
  })()`;
}

async function _evaluate(ws, sendCommand, expression, userGesture = false) {
  const result = await sendCommand(ws, 'Runtime.evaluate', { expression, returnByValue: true, userGesture });
  if (result?.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  }
  return result?.result?.value;
}

function _isQuantity(state, quantity) {
  return state?.present === true && state.qtyText === String(quantity);
}

async function _setSelectorRowQty(ws, sendCommand, rowId, targetQty, sleepFn) {
  const read = () => _evaluate(ws, sendCommand, _buildReadRowQtyExpr(rowId));
  const before = await read();
  if (_isQuantity(before, targetQty) || !before?.present) return before;
  if (!await _evaluate(ws, sendCommand, _buildSetQtyClickExpr(rowId), true)) return read();
  const choose = _buildPopupOptionClickExpr(rowId, targetQty);
  let picked = false;
  for (let attempt = 0; attempt < 20 && !picked; attempt++) {
    picked = await _evaluate(ws, sendCommand, choose, true);
    if (!picked) await sleepFn(250);
  }
  if (!picked) return read();
  let state;
  for (let attempt = 0; attempt < 30; attempt++) {
    state = await read();
    if (_isQuantity(state, targetQty)) break;
    await sleepFn(500);
  }
  return state;
}

function _buildColMap(headers, cells) {
  const colMap = {};
  (headers || []).forEach((h, idx) => { colMap[h] = (cells && cells[idx]) || ''; });
  return colMap;
}

function _buildRevealedDriveObject(rawRow, colMap, { cleanSku, rawCell0, badge, desc, triggerSku, triggerDesc }) {
  const listPrice = colMap['Unit Price (USD)'] ?? colMap['Price (USD)'] ?? '';
  const priceText = listPrice.replace(/^\$\s*/, '').replaceAll(',', '');
  const priceNum = /^\d+(?:\.\d{1,2})?$/.test(priceText) ? Number(priceText) : null;
  const isLff = /HotPlugLFFChoice/i.test(rawRow.id || '');
  return {
    sku: cleanSku,
    rawSku: rawCell0,
    badge,
    preferred: String(rawRow.className || '').includes('hpe-preferred'),
    description: desc,
    listPrice,
    numericListPrice: priceNum,
    leadTime: colMap['Est. Lead Time'] ?? colMap['Lead Time'] ?? '',
    startDate: colMap['Start'] ?? colMap['Start Date'] ?? '',
    discontinuedDate: colMap['Discontinued'] ?? colMap['Discontinued Date'] ?? '',
    obsoleteDate: colMap['Obsolete'] ?? colMap['Obsolete Date'] ?? '',
    optionType: classifyOptionType(cleanSku),
    parentCategory: 'Drive Enclosures / Drives',
    subCategory: isLff ? 'Hot Plug LFF Drives (Backplane Selector)' : 'Hot Plug SFF Drives (2SFF Stacking Backplane)',
    conditionType: 'SELECTOR_STATE_CONDITIONAL',
    conditionKey: 'backplaneSelector',
    operator: 'requires_selection',
    selectorTriggerSku: triggerSku,
    ruleContext: `Revealed when ${triggerSku} (${triggerDesc}) = 1; restored to 0`,
    visibilityReason: 'REVEALED_BY_PORTAL_SELECTOR',
    visibleAtDefaultC: false,
    observedInPortal: true,
    portalVerificationRequired: true
  };
}

function _parseRevealedDriveRow(rawRow, seenSkus, baselineSkus, triggerSku, triggerDesc) {
  if (!rawRow || rawRow.inUnavail || !rawRow.visible) return null;
  const cells = rawRow.cells || [];
  const colMap = _buildColMap(rawRow.headers, cells);
  const rawCell0 = String(cells[0] || '').replace(/[\r\n\t]+/g, ' ').trim();
  const badgeMatch = rawCell0.match(/^(OB|CS|90|DS|PVT)\s+(.+)$/i);
  const badge = badgeMatch ? badgeMatch[1].toUpperCase() : '';
  if (badge === 'OB') return null;
  const cleanSku = cleanBaseSKU(badgeMatch ? badgeMatch[2] : rawCell0);
  const desc = colMap['Description'] || cells[1] || '';
  if (!cleanSku || isTaaGtaCatalogOption(rawCell0, desc)) return null;
  if (baselineSkus.has(cleanSku) || seenSkus.has(cleanSku)) return null;
  seenSkus.add(cleanSku);
  return _buildRevealedDriveObject(rawRow, colMap, { cleanSku, rawCell0, badge, desc, triggerSku, triggerDesc });
}

function _rankBackplaneCandidates(candidates) {
  return [...(candidates || [])].sort((a, b) => {
    const score = c => (/\b2\s*sff\b/i.test(c.description) ? 4 : 0) +
      (/tri-mode|u\.3|stacking/i.test(c.description) ? 2 : 0) + (/sff/i.test(c.description) ? 1 : 0);
    return score(b) - score(a);
  });
}

async function _restoreBackplane(ws, sendCommand, cand, triggerSku, sleepFn) {
  try {
    const state = await _setSelectorRowQty(ws, sendCommand, cand.id, 0, sleepFn);
    if (_isQuantity(state, 0)) return state;
    const detail = state?.present && state.qtyText ? `remained at qty=${state.qtyText}` : 'quantity readback unavailable';
    throw new Error(detail);
  } catch (err) {
    throw new Error(`BACKPLANE_SELECTOR_RESTORE_FAILED: ${triggerSku} ${err.message}`, { cause: err });
  }
}

async function _probeSingleBackplaneCandidate(ws, sendCommand, cand, { expandSections, baselineSkus, sleepFn }) {
  const triggerSku = cleanBaseSKU(cand.sku);
  const initial = await _evaluate(ws, sendCommand, _buildReadRowQtyExpr(cand.id));
  if (!_isQuantity(initial, 0)) return null;
  const revealed = [];
  const seenSkus = new Set();
  let restoreState;
  try {
    const selRes = await _setSelectorRowQty(ws, sendCommand, cand.id, 1, sleepFn);
    if (!_isQuantity(selRes, 1)) return null;
    if (typeof expandSections === 'function') await expandSections(ws);
    const rows = await _evaluate(ws, sendCommand, EXTRACT_VISIBLE_DRIVE_ROWS_EXPR);
    const selectedState = await _evaluate(ws, sendCommand, _buildReadRowQtyExpr(cand.id));
    if (!_isQuantity(selectedState, 1) || !Array.isArray(rows)) return null;
    for (const row of rows) {
      const obs = _parseRevealedDriveRow(row, seenSkus, baselineSkus, triggerSku, cand.description);
      if (obs) revealed.push(obs);
    }
  } finally {
    restoreState = await _restoreBackplane(ws, sendCommand, cand, triggerSku, sleepFn);
  }
  return {
    revealed,
    selectorRecord: {
      selector: cand.id,
      sku: triggerSku,
      value: 'SET_1_CAPTURED_AND_RESTORED_0',
      revealedRows: revealed.length,
      restoredCountAfter: restoreState.hotPlugCount
    }
  };
}

async function probeBackplaneSelectorSkus(ws, sendCommand, options = {}) {
  const baselineSkus = options.baselineSkus || new Set();
  const requested = new Set((options.selectorSkus || []).map(cleanBaseSKU));
  const maxSelectors = Number.isInteger(options.maxSelectors) && options.maxSelectors > 0 ? options.maxSelectors : 2;
  const sleepFn = options.sleep || (ms => new Promise(r => setTimeout(r, ms)));

  const state = await _evaluate(ws, sendCommand, INSPECT_BACKPLANE_STATE_EXPR);
  if (!Array.isArray(state?.candidates)) throw new Error('BACKPLANE_SELECTOR_STATE_UNVERIFIED');
  if (state.hasVisibleHotPlug || state.candidates.length === 0) {
    return {
      conditionalSkus: [],
      observedSelectors: [],
      skipped: true,
      reason: state.hasVisibleHotPlug ? 'HOT_PLUG_DRIVES_ALREADY_VISIBLE' : 'NO_INACTIVE_BACKPLANE_SELECTORS'
    };
  }

  const candidates = requested.size ? state.candidates.filter(cand => requested.has(cleanBaseSKU(cand.sku))) : state.candidates;
  if (requested.size && candidates.length === 0) {
    return { conditionalSkus: [], observedSelectors: [], skipped: true, reason: 'REQUESTED_BACKPLANE_SELECTOR_UNAVAILABLE' };
  }
  const ordered = _rankBackplaneCandidates(candidates).slice(0, maxSelectors);
  const conditionalSkus = [];
  const observedSelectors = [];

  for (const cand of ordered) {
    const out = await _probeSingleBackplaneCandidate(ws, sendCommand, cand, {
      expandSections: options.expandSections,
      baselineSkus,
      sleepFn
    });
    if (!out) continue;
    conditionalSkus.push(...out.revealed);
    observedSelectors.push(out.selectorRecord);
  }

  const skipped = observedSelectors.length === 0;
  const reason = skipped ? 'NO_BACKPLANE_SELECTOR_ACTIVATION_VERIFIED' : 'BACKPLANE_SELECTOR_PROBED_AND_RESTORED';
  return { conditionalSkus, observedSelectors, skipped, reason };
}

module.exports = {
  probeBackplaneSelectorSkus,
  _parseRevealedDriveRow,
  _rankBackplaneCandidates
};
