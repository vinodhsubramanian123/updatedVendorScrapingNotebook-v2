'use strict';
/**
 * scripts/lib/conflict/resolution_matrix.js — Generates recommendations for Lifecycle Risks
 */

const { cleanBaseSKU, buildCatalogSkuIndex } = require('../catalog/sku.js');
const { analyzeRetirementDate } = require('../catalog/lifecycle.js');

function _isObsoleteSku(rawSku, rawDesc, rawLifecycle, catalogStatus) {
  if (rawLifecycle.includes('OBSOLETE') || rawLifecycle.includes('(OB)')) return true;
  if (rawSku.includes('[OB]') || /^(?:OB|DS)\s+/i.test(rawSku)) return true;
  if (rawDesc.includes('[OB]')) return true;
  if (catalogStatus.includes('OB') || catalogStatus.includes('OBSOLETE')) return true;
  return false;
}

function _isEolWarningSku(rawSku, rawDesc, rawLifecycle, catalogStatus) {
  if (rawLifecycle.includes('90-DAY') || rawLifecycle.includes('EOL')) return true;
  if (rawSku.includes('[90]') || rawSku.includes('[EOL]') || rawSku.includes('90-DAY')) return true;
  if (/^(?:90|EOL)\s+/i.test(rawSku)) return true;
  if (rawDesc.includes('[90]') || rawDesc.includes('[EOL]') || rawDesc.includes('90-DAY')) return true;
  if (catalogStatus.includes('90') || catalogStatus.includes('EOL')) return true;
  return false;
}

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

function generateLifecycleRecommendations(items, catalogData = null, options = {}) {
  const recommendations = [];
  const skuIndex = buildCatalogSkuIndex(catalogData);

  for (const it of items) {
    const rawSku = String(it.sku || '').trim().toUpperCase();
    const cleanSku = cleanBaseSKU(it.sku);
    const rawDesc = String(it.description || '').trim().toUpperCase();
    const rawLifecycle = String(it.lifecycleStatus || '').trim().toUpperCase();

    const catalogItem = skuIndex.get(cleanSku);
    const catalogStatus = String(catalogItem?.lifecycleStatus || '').toUpperCase();
    const alternativeSku = catalogItem?.skuData?.['Alternative SKU'] || '';
    const rawDiscontinued = catalogItem?.skuData?.['Discontinued Date'] || catalogItem?.skuData?.discontinuedDate || it.discontinuedDate;
    const discontinuedDate = rawDiscontinued || '';
    const retirement = analyzeRetirementDate(discontinuedDate, options);

    if (_isObsoleteSku(rawSku, rawDesc, rawLifecycle, catalogStatus)) {
      recommendations.push({
        sku: cleanSku,
        originalDesc: it.description,
        risk: 'Obsolete (OB)',
        action: 'Upgrade to Next-Gen Equivalent',
        alternative: alternativeSku || 'Consult HPE QuickSpecs for direct replacement'
      });
    } else if (_isEolWarningSku(rawSku, rawDesc, rawLifecycle, catalogStatus)) {
      recommendations.push({
        sku: cleanSku,
        originalDesc: it.description,
        risk: 'EOL Warning (90-Day)',
        action: 'Plan upgrade within 90 days',
        alternative: alternativeSku || 'Prepare transition to next-gen equivalent'
      });
    } else if (retirement.known && (retirement.isNear || retirement.isPast)) {
      recommendations.push(_buildRetirementRecommendation(it, retirement, alternativeSku));
    }
  }

  return recommendations;
}

module.exports = {
  generateLifecycleRecommendations
};
