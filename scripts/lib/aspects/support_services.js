'use strict';
/**
 * scripts/lib/aspects/support_services.js — Lifecycle Status & EOL Aspect Evaluator
 */

const { cleanBaseSKU } = require('../catalog/sku.js');

function evalSupportServices(items, catalogData = null) {
  let hasObsoleteRisk = false;
  let hasEolWarning = false;

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
    if (catalogData && catalogData.entries) {
      const match = catalogData.entries.find(e => e.skus && e.skus.find(s => cleanBaseSKU(s['Product #']) === cleanBaseSKU(it.sku)));
      if (match && match.skus) {
        const skuEntry = match.skus.find(s => cleanBaseSKU(s['Product #']) === cleanBaseSKU(it.sku));
        catalogStatus = String(skuEntry['Lifecycle Status'] || '').toUpperCase();
      }
    }

    if (isObsolete || catalogStatus.includes('OB') || catalogStatus.includes('OBSOLETE')) {
      hasObsoleteRisk = true;
    }
    if (isEolWarning || catalogStatus.includes('90') || catalogStatus.includes('EOL')) {
      hasEolWarning = true;
    }
  }

  return { hasObsoleteRisk, hasEolWarning };
}

module.exports = {
  evalSupportServices
};