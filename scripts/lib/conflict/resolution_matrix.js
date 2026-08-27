'use strict';
/**
 * scripts/lib/conflict/resolution_matrix.js — Generates recommendations for Lifecycle Risks
 */

const { cleanBaseSKU } = require('../catalog/sku.js');

function generateLifecycleRecommendations(items, catalogData = null) {
  const recommendations = [];

  for (const it of items) {
    const rawSku = String(it.sku || '').trim().toUpperCase();
    const rawDesc = String(it.description || '').trim().toUpperCase();
    const rawLifecycle = String(it.lifecycleStatus || '').trim().toUpperCase();

    // Check embedded brackets in SKU or Description (e.g. "[OB]")
    const isObsolete = rawLifecycle.includes('OBSOLETE') || rawLifecycle.includes('(OB)') || 
                       rawSku.includes('[OB]') || rawSku.startsWith('OB') ||
                       rawDesc.includes('[OB]');
                       
    const isEolWarning = rawLifecycle.includes('90-DAY') || rawLifecycle.includes('EOL') || 
                         rawSku.includes('[90]') || rawSku.includes('[EOL]') ||
                         rawSku.startsWith('90') || rawSku.startsWith('EOL') ||
                         rawDesc.includes('[90]') || rawDesc.includes('[EOL]');

    // Check matched catalog entries
    let catalogStatus = '';
    let alternativeSku = '';
    if (catalogData && catalogData.entries) {
      const match = catalogData.entries.find(e => e.skus && e.skus.find(s => cleanBaseSKU(s['Product #']) === cleanBaseSKU(it.sku)));
      if (match && match.skus) {
        const skuEntry = match.skus.find(s => cleanBaseSKU(s['Product #']) === cleanBaseSKU(it.sku));
        catalogStatus = String(skuEntry['Lifecycle Status'] || '').toUpperCase();
        alternativeSku = skuEntry['Alternative SKU'] || '';
      }
    }

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
    }
  }

  return recommendations;
}

module.exports = {
  generateLifecycleRecommendations
};