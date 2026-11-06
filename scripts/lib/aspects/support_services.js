'use strict';
/**
 * scripts/lib/aspects/support_services.js — Lifecycle Status & EOL Aspect Evaluator
 */

const { cleanBaseSKU, buildCatalogSkuIndex } = require('../catalog/sku.js');
const { analyzeRetirementDate } = require('../catalog/lifecycle.js');

function _isObsoleteSku(rawSku, rawDesc, rawLifecycle, catalogStatus) {
  if (catalogStatus.includes('OB') || catalogStatus.includes('OBSOLETE')) return true;
  if (rawLifecycle.includes('OBSOLETE') || rawLifecycle.includes('(OB)')) return true;
  if (rawSku.includes('[OB]') || /^(?:OB|DS)\s+/i.test(rawSku)) return true;
  return rawDesc.includes('[OB]');
}

function _isEolSku(rawSku, rawDesc, rawLifecycle, catalogStatus) {
  if (catalogStatus.includes('90') || catalogStatus.includes('EOL')) return true;
  if (rawLifecycle.includes('90-DAY') || rawLifecycle.includes('EOL')) return true;
  if (rawSku.includes('[90]') || rawSku.includes('[EOL]') || rawSku.includes('90-DAY') || /^(?:90|EOL)\s+/i.test(rawSku)) return true;
  return rawDesc.includes('[90]') || rawDesc.includes('[EOL]') || rawDesc.includes('90-DAY');
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

function evalSupportServices(items, catalogData = null, options = {}) {
  let hasObsoleteRisk = false;
  let hasEolWarning = false;
  const obsoleteSkus = [];
  const eolSkus = [];
  const nearExpirySkus = [];
  const skuIndex = buildCatalogSkuIndex(catalogData);

  for (const it of items) {
    const rawSku = String(it.sku || '').trim().toUpperCase();
    const cleanSku = cleanBaseSKU(it.sku);
    const rawDesc = String(it.description || '').trim().toUpperCase();
    const rawLifecycle = String(it.lifecycleStatus || '').trim().toUpperCase();

    const catalogItem = skuIndex.get(cleanSku);
    const catalogStatus = String(catalogItem?.lifecycleStatus || '').toUpperCase();
    const catalogSku = catalogItem?.skuData || {};

    if (_isObsoleteSku(rawSku, rawDesc, rawLifecycle, catalogStatus)) {
      hasObsoleteRisk = true;
      obsoleteSkus.push({
        sku: it.sku,
        cleanSku,
        description: it.description || '',
        status: 'OBSOLETE',
        quantity: it.quantity || 1
      });
    }

    if (_isEolSku(rawSku, rawDesc, rawLifecycle, catalogStatus)) {
      hasEolWarning = true;
      eolSkus.push({
        sku: it.sku,
        cleanSku,
        description: it.description || '',
        status: '90-DAY EOL',
        quantity: it.quantity || 1
      });
    }

    if (_inspectRetirement(it, cleanSku, catalogSku, options, nearExpirySkus, eolSkus)) {
      hasEolWarning = true;
    }
  }

  return { hasObsoleteRisk, hasEolWarning, obsoleteSkus, eolSkus, nearExpirySkus };
}

module.exports = {
  evalSupportServices
};
