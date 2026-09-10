'use strict';
/**
 * scripts/lib/conflict/resolution_matrix.js — Generates recommendations for Lifecycle Risks
 */

const { cleanBaseSKU, buildCatalogSkuIndex } = require('../catalog/sku.js');
const { analyzeRetirementDate } = require('../catalog/lifecycle.js');

function generateLifecycleRecommendations(items, catalogData = null, options = {}) {
  const recommendations = [];
  const skuIndex = buildCatalogSkuIndex(catalogData);

  for (const it of items) {
    const rawSku = String(it.sku || '').trim().toUpperCase();
    const cleanSku = cleanBaseSKU(it.sku);
    const rawDesc = String(it.description || '').trim().toUpperCase();
    const rawLifecycle = String(it.lifecycleStatus || '').trim().toUpperCase();

    // Check embedded brackets in SKU or Description (e.g. "[OB]")
    const isObsolete = rawLifecycle.includes('OBSOLETE') || rawLifecycle.includes('(OB)') || 
                       rawSku.includes('[OB]') || /^(?:OB|DS)\s+/i.test(rawSku) ||
                       rawDesc.includes('[OB]');
                       
    const isEolWarning = rawLifecycle.includes('90-DAY') || rawLifecycle.includes('EOL') || 
                         rawSku.includes('[90]') || rawSku.includes('[EOL]') ||
                         rawSku.includes('90-DAY') || /^(?:90|EOL)\s+/i.test(rawSku) ||
                         rawDesc.includes('[90]') || rawDesc.includes('[EOL]') || rawDesc.includes('90-DAY');

    // Check matched catalog entries via O(1) lookup
    const catalogItem = skuIndex.get(cleanSku);
    const catalogStatus = String(catalogItem?.lifecycleStatus || '').toUpperCase();
    const alternativeSku = catalogItem?.skuData?.['Alternative SKU'] || '';
    const discontinuedDate = catalogItem?.skuData?.['Discontinued Date'] || catalogItem?.skuData?.discontinuedDate || it.discontinuedDate || '';
    const retirement = analyzeRetirementDate(discontinuedDate, options);

    if (isObsolete || catalogStatus.includes('OB') || catalogStatus.includes('OBSOLETE')) {
      recommendations.push({
        sku: cleanBaseSKU(it.sku),
        originalDesc: it.description,
        risk: 'Obsolete (OB)',
        action: 'Upgrade to Next-Gen Equivalent',
        alternative: alternativeSku || 'Consult HPE QuickSpecs for direct replacement'
      });
    } else if (isEolWarning || catalogStatus.includes('90') || catalogStatus.includes('EOL')) {
      recommendations.push({
        sku: cleanBaseSKU(it.sku),
        originalDesc: it.description,
        risk: 'EOL Warning (90-Day)',
        action: 'Plan upgrade within 90 days',
        alternative: alternativeSku || 'Prepare transition to next-gen equivalent'
      });
    } else if (retirement.known && (retirement.isNear || retirement.isPast)) {
      recommendations.push({
        sku: cleanBaseSKU(it.sku),
        originalDesc: it.description,
        risk: retirement.isPast ? 'Discontinuation Date Passed' : 'Approaching Discontinuation',
        action: retirement.isPast ? 'Do not use for a new design; select a supported successor' : 'Confirm supply and offer a supported successor option',
        alternative: alternativeSku || 'Resolve the closest supported equivalent from the same product-generation catalog',
        discontinuedDate: retirement.retirementDate,
        daysRemaining: retirement.daysRemaining
      });
    }
  }

  return recommendations;
}

module.exports = {
  generateLifecycleRecommendations
};
