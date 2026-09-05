'use strict';
/**
 * scripts/lib/aspects/support_services.js — Lifecycle Status & EOL Aspect Evaluator
 */

const { cleanBaseSKU, buildCatalogSkuIndex } = require('../catalog/sku.js');

function evalSupportServices(items, catalogData = null) {
  let hasObsoleteRisk = false;
  let hasEolWarning = false;
  const obsoleteSkus = [];
  const eolSkus = [];
  const skuIndex = buildCatalogSkuIndex(catalogData);

  for (const it of items) {
    const rawSku = String(it.sku || '').trim().toUpperCase();
    const cleanSku = cleanBaseSKU(it.sku);
    const rawDesc = String(it.description || '').trim().toUpperCase();
    const rawLifecycle = String(it.lifecycleStatus || '').trim().toUpperCase();

    // Check embedded brackets/tokens in SKU or Description (e.g. "[OB]", "(OB)", "OB P123")
    const isObsolete = rawLifecycle.includes('OBSOLETE') || rawLifecycle.includes('(OB)') || 
                       rawSku.includes('[OB]') || /^(?:OB|DS)\s+/i.test(rawSku) ||
                       rawDesc.includes('[OB]');
                       
    // Strict EOL check: require explicit delimiters to avoid false-positives on SKUs starting with '90'
    const isEolWarning = rawLifecycle.includes('90-DAY') || rawLifecycle.includes('EOL') || 
                         rawSku.includes('[90]') || rawSku.includes('[EOL]') ||
                         rawSku.includes('90-DAY') || /^(?:90|EOL)\s+/i.test(rawSku) ||
                         rawDesc.includes('[90]') || rawDesc.includes('[EOL]') || rawDesc.includes('90-DAY');

    // Check matched catalog entry via O(1) indexed lookup
    const catalogItem = skuIndex.get(cleanSku);
    const catalogStatus = String(catalogItem?.lifecycleStatus || '').toUpperCase();

    if (isObsolete || catalogStatus.includes('OB') || catalogStatus.includes('OBSOLETE')) {
      hasObsoleteRisk = true;
      obsoleteSkus.push({
        sku: it.sku,
        cleanSku,
        description: it.description || '',
        status: 'OBSOLETE',
        quantity: it.quantity || 1
      });
    }
    if (isEolWarning || catalogStatus.includes('90') || catalogStatus.includes('EOL')) {
      hasEolWarning = true;
      eolSkus.push({
        sku: it.sku,
        cleanSku,
        description: it.description || '',
        status: '90-DAY EOL',
        quantity: it.quantity || 1
      });
    }
  }

  return { hasObsoleteRisk, hasEolWarning, obsoleteSkus, eolSkus };
}

module.exports = {
  evalSupportServices
};