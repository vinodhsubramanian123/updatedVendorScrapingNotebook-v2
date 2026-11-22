'use strict';

const { cleanBaseSKU, classifyOptionType, isTaaGtaCatalogOption } = require('../catalog/sku.js');
const { parseStrictPrice } = require('../catalog/field_parsers.js');

const INSPECT_BACKPLANE_STATE_EXPR = `(() => {
  const isVis = el => Boolean(el && el.offsetWidth > 0 && el.offsetHeight > 0);
  const isActualDriveDesc = d => /\\b\\d+(?:\\.\\d+)?\\s*(?:TB|GB)\\b/i.test(d)
    && /\\b(?:SSD|HDD|NVMe|SAS|SATA|EDSFF|E3\\.S)\\b/i.test(d)
    && !/\\b(?:Drive\\s+Cage|Backplane|Cable\\s+Kit|Controller|Enablement|Blank|Riser|Optical|DVD|NS204i|Boot\\s+Optimized|DIMM|Memory|Processor|Xeon|EPYC|Adapter|Transceiver|Switch)\\b/i.test(d);
  const isDriveCageDesc = d => /\\b(?:Drive\\s+Cage|Backplane\\s+Kit|U\\.3.*Backplane|Tri-Mode.*Backplane|NVMe.*Backplane|SFF.*Drive\\s+Cage|LFF.*Drive\\s+Cage|EDSFF.*Drive\\s+Cage|Mid\\s+Tray\\s+Backplane|Rear.*Drive\\s+Cage)\\b/i.test(d)
    && !/\\b(?:Cable\\s+Kit|Power\\s+Cable|Blank|Optical|DVD|Thermal|Fan|Heatsink|Riser|Adapter|Controller)\\b/i.test(d);
  const allRows = Array.from(document.querySelectorAll('tr.item_tr'));
  let visibleHotPlugCount = 0;
  const candRows = [];
  for (const tr of allRows) {
    if (tr.closest('table.UavailableTable')) continue;
    const id = tr.id || '';
    const desc = (tr.children[1]?.textContent || tr.querySelector('.item_desc')?.textContent || '').replace(/\\s+/g, ' ').trim();
    const looksHotPlug = /HotPlugSFFChoice|HotPlugLFFChoice|EDSFFChoice/i.test(id) || isActualDriveDesc(desc);
    if (looksHotPlug && isVis(tr)) {
      visibleHotPlugCount++;
      continue;
    }
    const looksCage = /smartChassisDriveCage|storage_Backplane|driveCage|Backplane/i.test(id) || isDriveCageDesc(desc);
    if (!looksCage || !isVis(tr)) continue;
    const raw0 = (tr.children[0]?.textContent || '').replace(/\\s+/g, ' ').trim();
    const badgeMatch = raw0.match(/^(OB|CS|90|DS|PVT)\\s+(.+)$/i);
    const badge = badgeMatch ? badgeMatch[1].toUpperCase() : '';
    const sku = (badgeMatch ? badgeMatch[2] : raw0).trim();
    const qtyDiv = tr.querySelector('.item_qty_div, span[id^="selectedQty_"]');
    const qtyText = (qtyDiv?.textContent || '').trim();
    if (id && sku && !/^(?:OB|CS|DS|PVT)$/i.test(badge) && qtyText === '0') {
      candRows.push({ id, badge, sku, description: desc, qtyText });
    }
  }
  return {
    hasVisibleHotPlug: visibleHotPlugCount >= 5,
    visibleHotPlugCount,
    candidates: candRows
  };
})()`;

const EXTRACT_VISIBLE_DRIVE_ROWS_EXPR = `(() => {
  const isVis = el => Boolean(el && el.offsetWidth > 0 && el.offsetHeight > 0);
  const isActualDriveDesc = d => /\\b\\d+(?:\\.\\d+)?\\s*(?:TB|GB)\\b/i.test(d)
    && /\\b(?:SSD|HDD|NVMe|SAS|SATA|EDSFF|E3\\.S)\\b/i.test(d)
    && !/\\b(?:Drive\\s+Cage|Backplane|Cable\\s+Kit|Controller|Enablement|Blank|Riser|Optical|DVD|NS204i|Boot\\s+Optimized|DIMM|Memory|Processor|Xeon|EPYC|Adapter|Transceiver|Switch)\\b/i.test(d);
  const headerCache = new WeakMap();
  const getHeaders = (tableEl) => {
    if (!tableEl) return [];
    if (headerCache.has(tableEl)) return headerCache.get(tableEl);
    const directRows = Array.from(tableEl.querySelectorAll('tr')).filter(r => r.closest('table') === tableEl);
    const matched = directRows.find(r => {
      const texts = Array.from(r.children).map(c => (c.textContent || '').replace(/\\s+/g, ' ').trim().toLowerCase());
      return texts.some(t => t === 'product #' || t === 'product#' || t === 'sku' || t === 'part #')
        && texts.some(t => t.includes('description') || t.includes('price'));
    }) || tableEl.querySelector('tr.table_header, thead tr, tr:first-child');
    const hdrs = matched ? Array.from(matched.children).map(c => (c.textContent || '').replace(/\\s+/g, ' ').trim()) : [];
    headerCache.set(tableEl, hdrs);
    return hdrs;
  };
  const out = [];
  for (const tr of document.querySelectorAll('tr.item_tr')) {
    if (tr.closest('table.UavailableTable')) continue;
    const id = tr.id || '';
    const desc = (tr.children[1]?.textContent || tr.querySelector('.item_desc')?.textContent || '').replace(/\\s+/g, ' ').trim();
    if (!(/HotPlugSFFChoice|HotPlugLFFChoice|EDSFFChoice|SolidStateDrive|HardDrive|NVMeDrive|SSDReadIntensive|SSDMixedUse|SSDWriteIntensive/i.test(id) || isActualDriveDesc(desc))) {
      continue;
    }
    if (!isVis(tr)) continue;
    const headers = getHeaders(tr.closest('table'));
    const cells = Array.from(tr.children).map(td => (td.textContent || '').replace(/\\s+/g, ' ').trim());
    out.push({ id, className: tr.className || '', inUnavail: false, visible: true, headers, cells });
  }
  return out;
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
    const qtyText = (qtyEl?.textContent || '').trim();
    if (qtyText === ${JSON.stringify(String(targetQty))}) return { status: 'ALREADY_TARGET' };
    if (!row?.matches('tr.editing') || !qtyEl?.getClientRects().length) return { status: 'NOT_EDITING', qtyText };
    const origin = qtyEl.getBoundingClientRect();
    const options = [...document.querySelectorAll(${JSON.stringify(`ul.popup-menu-body a[name="${targetQty}"]`)})].filter(option => {
      const rect = option.getBoundingClientRect();
      return option.getClientRects().length && Math.abs(rect.x - origin.x) < 250 && Math.abs(rect.y - origin.y) < 250;
    });
    if (options.length !== 1) return { status: 'NO_POPUP_OPTION', qtyText };
    const option = options[0];
    setTimeout(() => {
      if (option.isConnected && row.matches('tr.editing')) option.click();
    }, 0);
    return { status: 'CLICKED_POPUP' };
  })()`;
}

function _buildReadRowQtyExpr(rowId) {
  return `(() => {
    const row = document.getElementById(${JSON.stringify(rowId)});
    const qtyEl = row?.querySelector('.item_qty_div') || row?.querySelector('span[id^="selectedQty_"]');
    return {
      present: Boolean(qtyEl?.getClientRects().length && !row.closest('table.UavailableTable')),
      qtyText: (qtyEl?.textContent || '').trim(),
      hotPlugCount: document.querySelectorAll('tr.item_tr[id*="HotPlugSFFChoice"], tr.item_tr[id*="HotPlugLFFChoice"], tr.item_tr[id*="EDSFFChoice"], tr.item_tr[id*="SSDReadIntensive"], tr.item_tr[id*="SSDMixedUse"]').length
    };
  })()`;
}

async function _evaluate(ws, sendCommand, expression, userGesture = false, timeoutMs = 90000) {
  const result = await sendCommand(ws, 'Runtime.evaluate', { expression, returnByValue: true, userGesture }, timeoutMs);
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
  let directToggleCount = 0;
  for (let attempt = 0; attempt < 20; attempt++) {
    await sleepFn(500);
    const res = await _evaluate(ws, sendCommand, choose, true);
    if (res === true || res?.status === 'CLICKED_POPUP' || res?.status === 'ALREADY_TARGET') break;
    if (res?.status === 'NOT_EDITING') {
      directToggleCount++;
      if (directToggleCount >= 2) break; // Binary 0<->1 toggle row: click already fired AJAX without popup menu
    }
  }
  let state;
  for (let attempt = 0; attempt < 30; attempt++) {
    state = await read();
    if (_isQuantity(state, targetQty)) break;
    await sleepFn(1000);
  }
  return state;
}

function _buildColMap(headers, cells) {
  const colMap = {};
  (headers || []).forEach((h, idx) => {
    if (h) colMap[h] = (cells && cells[idx]) || '';
  });
  return colMap;
}

function _classifyRevealedDriveSubCategory(rowId = '') {
  if (/HotPlugLFFChoice/i.test(rowId)) return 'Hot Plug LFF Drives (Backplane Selector)';
  if (/EDSFFChoice/i.test(rowId)) return 'EDSFF Drives (Backplane Selector)';
  if (/SSDReadIntensive/i.test(rowId)) return 'SSD - Read Intensive (Drive Cage Selector)';
  if (/SSDMixedUse/i.test(rowId)) return 'SSD - Mixed Use (Drive Cage Selector)';
  if (/SSDWriteIntensive/i.test(rowId)) return 'SSD - Write Intensive (Drive Cage Selector)';
  return 'Hot Plug SFF Drives (2SFF Stacking Backplane)';
}

function _buildRevealedDriveObject(rawRow, colMap, { cleanSku, rawCell0, badge, desc, triggerSku, triggerDesc }) {
  const listPrice = colMap['Unit Price (USD)'] ?? colMap['Price (USD)'] ?? colMap['List Price (USD)'] ?? '';
  const priceParsed = parseStrictPrice(listPrice, { sku: cleanSku, description: desc });
  const priceNum = priceParsed.priceUsd !== null ? priceParsed.priceUsd : null;
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
    subCategory: _classifyRevealedDriveSubCategory(rawRow.id || ''),
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
  const rawCell0 = String(colMap['Product #'] ?? colMap['Product#'] ?? colMap['Part #'] ?? colMap['SKU'] ?? cells[0] ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .trim();
  const badgeMatch = rawCell0.match(/^(OB|CS|90|DS|PVT)\s+(.+)$/i);
  const badge = badgeMatch ? badgeMatch[1].toUpperCase() : '';
  if (badge === 'OB') return null;
  const cleanSku = cleanBaseSKU(badgeMatch ? badgeMatch[2] : rawCell0);
  const desc = String(colMap['Description'] || cells[1] || '').replace(/[\r\n\t]+/g, ' ').trim();
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

async function _ensureMenuAndRowVisible(ws, sendCommand, rowId, sleepFn) {
  const state = await _evaluate(ws, sendCommand, _buildReadRowQtyExpr(rowId));
  if (state?.present) return state;
  await _evaluate(ws, sendCommand, `(() => {
    const active = document.querySelector('li.ui-tabs-active a')?.getAttribute('href') || '';
    if (active && active !== '#extended_overview_menu') {
      document.querySelector('a[href="#extended_overview_menu"]')?.click();
    }
    const ea = document.getElementById('expand_all');
    if (ea && ea.getClientRects().length) ea.click();
    return true;
  })()`);
  for (let i = 0; i < 8; i++) {
    await sleepFn(600);
    const next = await _evaluate(ws, sendCommand, _buildReadRowQtyExpr(rowId));
    if (next?.present) return next;
  }
  return _evaluate(ws, sendCommand, _buildReadRowQtyExpr(rowId));
}

async function _restoreBackplane(ws, sendCommand, cand, triggerSku, sleepFn) {
  try {
    let state = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      await _ensureMenuAndRowVisible(ws, sendCommand, cand.id, sleepFn);
      state = await _setSelectorRowQty(ws, sendCommand, cand.id, 0, sleepFn);
      if (_isQuantity(state, 0)) return state;
      await sleepFn(800);
    }
    const detail = state?.present && state.qtyText ? `remained at qty=${state.qtyText}` : 'quantity readback unavailable';
    throw new Error(detail);
  } catch (err) {
    throw new Error(`BACKPLANE_SELECTOR_RESTORE_FAILED: ${triggerSku} ${err.message}`, { cause: err });
  }
}

async function _expandDriveSectionsOnly(ws, sendCommand, sleepFn) {
  await _evaluate(ws, sendCommand, `(() => {
    const driveShowmore = Array.from(document.querySelectorAll('input[type="checkbox"][id*="showmore"], input[id*="showmore"]'))
      .filter(el => !el.checked && /storage|drive|ssd|hdd|hotplug|edsff|nvme/i.test(el.id || ''));
    for (const el of driveShowmore) {
      el.click();
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (typeof jQuery !== 'undefined' && driveShowmore.length) {
      try { jQuery(driveShowmore).prop('checked', true).trigger('change'); } catch (_) {}
    }
    return driveShowmore.length;
  })()`);
  await sleepFn(2000);
}

async function _probeSingleBackplaneCandidate(ws, sendCommand, cand, { baselineSkus, sleepFn }) {
  const triggerSku = cleanBaseSKU(cand.sku);
  const initial = await _evaluate(ws, sendCommand, _buildReadRowQtyExpr(cand.id));
  if (!_isQuantity(initial, 0)) return null;
  const revealed = [];
  const seenSkus = new Set();
  let restoreState;
  try {
    const selRes = await _setSelectorRowQty(ws, sendCommand, cand.id, 1, sleepFn);
    if (!_isQuantity(selRes, 1)) return null;
    await sleepFn(2500);
    await _expandDriveSectionsOnly(ws, sendCommand, sleepFn);
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
