'use strict';
/**
 * scripts/lib/aspects/support_services.js — Lifecycle Status & EOL Aspect Evaluator
 */

const fs = require('fs');
const path = require('path');
const { cleanBaseSKU, buildCatalogSkuIndex, classifyLifecycleState } = require('../catalog/sku.js');
const { analyzeRetirementDate } = require('../catalog/lifecycle.js');

function _loadDiscontinuedSet(chassisDir) {
  const set = new Set();
  if (!chassisDir) return set;
  try {
    const discFile = path.join(chassisDir, 'history', 'discontinued_skus.json');
    if (!fs.existsSync(discFile)) return set;
    const raw = JSON.parse(fs.readFileSync(discFile, 'utf8'));
    const list = Array.isArray(raw) ? raw : Object.values(raw || {});
    for (const entry of list) {
      if (String(entry?.status || '').toUpperCase() === 'DISCONTINUED') {
        const clean = cleanBaseSKU(entry.productNumber || entry.sku || '');
        if (clean) set.add(clean);
      }
    }
  } catch (_) {}
  return set;
}

function _inspectRetirement(it, cleanSku, catalogSku, options, nearExpirySkus, eolSkus) {
  const discontinuedDate = catalogSku['Discontinued Date'] || catalogSku.discontinuedDate || it.discontinuedDate || '';
  const retirement = analyzeRetirementDate(discontinuedDate, options);
  if (!retirement.known || (!retirement.isNear && !retirement.isPast)) return false;

  const warning = {
    sku: it.sku,
    cleanSku,
    description: it.description || catalogSku.Description || catalogSku.description || '',
    status: retirement.isPast ? 'DISCONTINUATION DATE PASSED' : 'APPROACHING DISCONTINUATION',
    discontinuedDate: retirement.retirementDate,
    daysRemaining: retirement.daysRemaining,
    quantity: it.quantity || 1
  };
  nearExpirySkus.push(warning);
  if (!eolSkus.some(entry => entry.cleanSku === cleanSku)) {
    eolSkus.push(warning);
  }
  return true;
}

function _resolveBlockedRiskLabel(isTombstone, itemLc, catLc) {
  if (isTombstone || itemLc.isDiscontinued || catLc.isDiscontinued) return 'DISCONTINUED';
  return (itemLc.isHardEol || catLc.isHardEol) ? 'EOL' : 'OBSOLETE';
}

function _evaluateSupportLifecycleItem(it, skuIndex, discontinuedSet, options, state) {
  const rawSku = String(it.sku || '').trim();
  const cleanSku = cleanBaseSKU(it.sku);
  const catalogItem = skuIndex.get(cleanSku);
  const catalogSku = catalogItem?.skuData || {};
  const diffStatus = catalogItem?.diffStatus || it.diffStatus || '';

  const itemLc = classifyLifecycleState(it.lifecycleStatus || '', it.diffStatus || '', rawSku, it.description || '');
  const catLc = classifyLifecycleState(catalogItem?.lifecycleStatus || '', diffStatus, rawSku, catalogSku.Description || catalogSku.description || '');
  const isTombstone = discontinuedSet.has(cleanSku);

  if (itemLc.isBlockedForProduction || catLc.isBlockedForProduction || isTombstone || /^DS\s+/i.test(rawSku)) {
    state.hasObsoleteRisk = true;
    state.obsoleteSkus.push({
      sku: it.sku,
      cleanSku,
      description: it.description || '',
      status: _resolveBlockedRiskLabel(isTombstone, itemLc, catLc),
      quantity: it.quantity || 1
    });
  }

  if (itemLc.is90DayWarning || catLc.is90DayWarning || itemLc.isDirectShip || catLc.isDirectShip) {
    state.hasEolWarning = true;
    state.eolSkus.push({
      sku: it.sku,
      cleanSku,
      description: it.description || '',
      status: (itemLc.isDirectShip || catLc.isDirectShip) ? 'DIRECT SHIP (DS)' : '90-DAY EOL',
      quantity: it.quantity || 1
    });
  }

  if (_inspectRetirement(it, cleanSku, catalogSku, options, state.nearExpirySkus, state.eolSkus)) {
    state.hasEolWarning = true;
  }
}

function evalSupportServices(items, catalogData = null, options = {}) {
  const state = {
    hasObsoleteRisk: false,
    hasEolWarning: false,
    obsoleteSkus: [],
    eolSkus: [],
    nearExpirySkus: []
  };
  const skuIndex = buildCatalogSkuIndex(catalogData);
  const discontinuedSet = _loadDiscontinuedSet(options.chassisDir || options.targetDir || catalogData?.metadata?.chassisDir || '');

  for (const it of items) {
    _evaluateSupportLifecycleItem(it, skuIndex, discontinuedSet, options, state);
  }

  return state;
}

module.exports = {
  evalSupportServices
};
