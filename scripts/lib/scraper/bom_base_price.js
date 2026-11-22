'use strict';

const { cleanBaseSKU, isValidHpeSKU } = require('../catalog/sku.js');
const { parseStrictPrice } = require('../catalog/field_parsers.js');

const LIFECYCLE_PREFIX_RE = /^(90|OB|CS|DS)\s*(?=[A-Z0-9])/i;

function parseBomLifecycleBadge(rawProductId = '') {
  const trimmed = String(rawProductId || '').replace(/[\r\n\t]+/g, ' ').trim();
  const match = trimmed.match(LIFECYCLE_PREFIX_RE);
  if (!match) return { sku: cleanBaseSKU(trimmed), lifecycleStatus: 'Active', badge: '' };
  const badge = match[1].toUpperCase();
  const remainder = trimmed.slice(match[0].length).trim();
  const sku = cleanBaseSKU(remainder);
  if (!isValidHpeSKU(sku)) return { sku: cleanBaseSKU(trimmed), lifecycleStatus: 'Active', badge: '' };
  const map = {
    '90': 'EOL Warning (90-Day)',
    OB: 'Obsolete (OB)',
    CS: 'Constrained Supply (CS)',
    DS: 'Direct Ship (DS)'
  };
  return { sku, lifecycleStatus: map[badge] || 'Active', badge };
}

function _locateBomHeaderIndexes(headerRow = []) {
  const lower = headerRow.map(cell => String(cell || '').trim().toLowerCase());
  const findCol = (patterns) => lower.findIndex(h => patterns.some(p => p.test(h)));
  return {
    hierarchy: findCol([/^hierarchy$/]),
    product: findCol([/^product\s*#$/, /^part\s*#$/, /^sku$/]),
    description: findCol([/description/]),
    leadTime: findCol([/lead\s*time/]),
    startDate: findCol([/^start/]),
    discontinuedDate: findCol([/^disc/]),
    obsoleteDate: findCol([/^obs/]),
    unitPrice: findCol([/unit\s*price/, /^price/])
  };
}

const EXPLICIT_PRICE_STATES = new Set(['PRICED', 'ZERO_CONFIRMED', 'ZERO_UNCONFIRMED', 'EXPLICIT_ZERO']);

function _cellAt(row, idx) {
  return idx >= 0 ? String(row[idx] || '').trim() : '';
}

function _parseSingleBomRow(row, cols) {
  if (!Array.isArray(row)) return null;
  const { sku, lifecycleStatus, badge } = parseBomLifecycleBadge(row[cols.product]);
  if (!sku || !isValidHpeSKU(sku)) return null;
  const hierarchy = _cellAt(row, cols.hierarchy);
  const rawPrice = _cellAt(row, cols.unitPrice);
  const priceParsed = parseStrictPrice(rawPrice);
  const pState = priceParsed.priceState || priceParsed.state || 'UNPRICED';
  const hasExplicitPrice = EXPLICIT_PRICE_STATES.has(pState);
  const unitPriceUsd = hasExplicitPrice && priceParsed.priceUsd !== null ? Number(priceParsed.priceUsd) : null;
  const rawLead = _cellAt(row, cols.leadTime);
  const leadDays = /^\d+$/.test(rawLead) ? Number(rawLead) : null;
  return {
    sku,
    hierarchy,
    isTopLevel: hierarchy === '(1)' || hierarchy === '1',
    description: _cellAt(row, cols.description),
    rawPrice,
    unitPriceUsd,
    priceState: pState,
    priceVerified: hasExplicitPrice,
    leadTime: leadDays !== null ? `${leadDays} days` : rawLead,
    leadTimeDays: leadDays,
    startDate: _cellAt(row, cols.startDate),
    discontinuedDate: _cellAt(row, cols.discontinuedDate),
    obsoleteDate: _cellAt(row, cols.obsoleteDate),
    lifecycleStatus,
    badge
  };
}

function parseBomGridRows(rows = []) {
  if (!Array.isArray(rows) || rows.length < 2) return [];
  const headerIdx = rows.findIndex(r => Array.isArray(r) && r.some(c => /product\s*#/i.test(String(c || ''))) && r.some(c => /unit\s*price/i.test(String(c || ''))));
  if (headerIdx < 0) return [];
  const cols = _locateBomHeaderIndexes(rows[headerIdx]);
  if (cols.product < 0 || cols.unitPrice < 0) return [];

  const parsed = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const rec = _parseSingleBomRow(rows[i], cols);
    if (rec) parsed.push(rec);
  }
  return parsed;
}

function applyBomPricesToChassisDiscovery(chassisDiscovery, bomRows = []) {
  if (!chassisDiscovery || !Array.isArray(chassisDiscovery.candidates) || !Array.isArray(bomRows) || bomRows.length === 0) {
    return 0;
  }
  const bySku = new Map();
  for (const row of bomRows) {
    if (!row?.sku) continue;
    const key = cleanBaseSKU(row.sku);
    if (!bySku.has(key) || (row.isTopLevel && !bySku.get(key).isTopLevel)) {
      bySku.set(key, row);
    }
  }
  let updated = 0;
  for (const candidate of chassisDiscovery.candidates) {
    const key = cleanBaseSKU(candidate?.sku || '');
    const match = bySku.get(key);
    if (!match || !match.priceVerified) continue;
    candidate.listPriceUsd = match.unitPriceUsd;
    candidate.priceVerified = true;
    candidate.priceSource = 'OCA_BOM_TAB';
    if (match.leadTime && !candidate.leadTime) candidate.leadTime = match.leadTime;
    if (match.leadTimeDays !== null && candidate.leadTimeDays == null) candidate.leadTimeDays = match.leadTimeDays;
    if (match.startDate && !candidate.startDate) candidate.startDate = match.startDate;
    if (match.discontinuedDate && !candidate.discontinuedDate) candidate.discontinuedDate = match.discontinuedDate;
    if (match.lifecycleStatus && match.lifecycleStatus !== 'Active') candidate.status = match.lifecycleStatus;
    updated++;
  }
  return updated;
}

async function extractBomBasePricesFromActiveTab(ws, sendCommand, options = {}) {
  const timeoutMs = options.timeoutMs || 12000;
  const pause = options.pause || (ms => new Promise(r => setTimeout(r, ms)));
  await sendCommand(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const bom = document.querySelector('a[href="#extended_overview_bom"]')
        || Array.from(document.querySelectorAll('a')).find(a => (a.innerText || '').trim() === 'BOM');
      if (bom) { bom.click(); return true; }
      return false;
    })()`,
    returnByValue: true
  });

  const start = Date.now();
  let rows = null;
  while (Date.now() - start < timeoutMs) {
    await pause(800);
    const res = await sendCommand(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const tbl = document.querySelector('table[id^="bom_grid"]');
        if (!tbl) return null;
        const extracted = Array.from(tbl.querySelectorAll('tr')).map(tr =>
          Array.from(tr.querySelectorAll('th,td')).map(td => (td.innerText || '').replace(/\\s+/g, ' ').trim())
        ).filter(r => r.some(Boolean));
        return extracted.length >= 2 ? JSON.stringify(extracted) : null;
      })()`,
      returnByValue: true
    });
    if (res?.result?.value) {
      rows = JSON.parse(res.result.value);
      break;
    }
  }

  // Always restore Menu tab so subsequent menu-scoped extraction stays anchored
  await sendCommand(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const menu = document.querySelector('a[href="#extended_overview_menu"]');
      if (menu) menu.click();
    })()`,
    returnByValue: true
  });
  await pause(600);
  return parseBomGridRows(rows || []);
}

module.exports = {
  parseBomLifecycleBadge,
  parseBomGridRows,
  applyBomPricesToChassisDiscovery,
  extractBomBasePricesFromActiveTab
};
