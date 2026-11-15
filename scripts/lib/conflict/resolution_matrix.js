'use strict';
/**
 * scripts/lib/conflict/resolution_matrix.js — Generates recommendations for Lifecycle Risks
 */

const { cleanBaseSKU, buildCatalogSkuIndex, classifyLifecycleState } = require('../catalog/sku.js');
const { analyzeRetirementDate } = require('../catalog/lifecycle.js');

function _buildRetirementRecommendation(it, retirement, alternativeSku) {
  const isPast = retirement.isPast;
  return {
    sku: cleanBaseSKU(it.sku),
    originalDesc: it.description,
    risk: isPast ? 'Discontinuation Date Passed' : 'Approaching Discontinuation',
    action: isPast ? 'Do not use for a new design; select a supported successor' : 'Confirm supply and offer a supported successor option',
    alternative: alternativeSku || 'Resolve the closest supported equivalent from the same product-generation catalog',
    discontinuedDate: retirement.retirementDate,
    daysRemaining: retirement.daysRemaining
  };
}

function _buildBlockedLifecycleRec(cleanSku, it, itemLc, catLc, alternativeSku) {
  let risk = 'Obsolete (OB)';
  if (itemLc.isHardEol || catLc.isHardEol) risk = 'End of Life (EOL)';
  else if (itemLc.isDiscontinued || catLc.isDiscontinued) risk = 'Discontinued';
  return {
    sku: cleanSku,
    originalDesc: it.description,
    risk,
    action: 'Upgrade to Next-Gen Equivalent',
    alternative: alternativeSku || 'Consult HPE QuickSpecs for direct replacement'
  };
}

function _classifyItemLifecycleRecommendation(it, skuIndex, options) {
  const rawSku = String(it.sku || '').trim();
  const cleanSku = cleanBaseSKU(it.sku);
  const catalogItem = skuIndex.get(cleanSku);
  const skuData = catalogItem?.skuData || {};
  const diffStatus = catalogItem?.diffStatus || it.diffStatus || '';
  const alternativeSku = skuData['Alternative SKU'] || '';

  const itemLc = classifyLifecycleState(it.lifecycleStatus || '', it.diffStatus || '', rawSku, it.description || '');
  const catLc = classifyLifecycleState(catalogItem?.lifecycleStatus || '', diffStatus, rawSku, skuData.Description || '');

  if (itemLc.isBlockedForProduction || catLc.isBlockedForProduction || /^DS\s+/i.test(rawSku)) {
    return _buildBlockedLifecycleRec(cleanSku, it, itemLc, catLc, alternativeSku);
  }
  if (itemLc.is90DayWarning || catLc.is90DayWarning || itemLc.isDirectShip || catLc.isDirectShip) {
    return {
      sku: cleanSku,
      originalDesc: it.description,
      risk: (itemLc.isDirectShip || catLc.isDirectShip) ? 'Direct Ship (DS)' : 'EOL Warning (90-Day)',
      action: 'Plan upgrade within 90 days',
      alternative: alternativeSku || 'Prepare transition to next-gen equivalent'
    };
  }
  const retirement = analyzeRetirementDate(skuData['Discontinued Date'] || skuData.discontinuedDate || it.discontinuedDate || '', options);
  if (retirement.known && (retirement.isNear || retirement.isPast)) {
    return _buildRetirementRecommendation(it, retirement, alternativeSku);
  }
  return null;
}

function generateLifecycleRecommendations(items, catalogData = null, options = {}) {
  const recommendations = [];
  const skuIndex = buildCatalogSkuIndex(catalogData);
  for (const it of items) {
    const rec = _classifyItemLifecycleRecommendation(it, skuIndex, options);
    if (rec) recommendations.push(rec);
  }
  return recommendations;
}

module.exports = {
  generateLifecycleRecommendations
};
