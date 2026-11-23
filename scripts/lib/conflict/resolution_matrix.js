'use strict';
/**
 * scripts/lib/conflict/resolution_matrix.js — Generates recommendations for lifecycle risks.
 */

const { cleanBaseSKU, buildCatalogSkuIndex, classifyLifecycleState } = require('../catalog/sku.js');
const { analyzeRetirementDate } = require('../catalog/lifecycle.js');
const { formatLifecycleCommercialRemarks } = require('../boq/commercial_remarks.js');
const { findActiveLifecycleReplacement } = require('./least_delta_combinator.js');

const LIFECYCLE_ADVICE = {
  OBSOLETE: ['Obsolete (OB)', 'Upgrade to Next-Gen Equivalent'],
  DISCONTINUED: ['Discontinued', 'Select an active successor'],
  EOL: ['End of Life (EOL)', 'Select an active successor'],
  CONSTRAINED_SUPPLY: ['Constrained Supply (CS)', 'Confirm vendor supply or select an active equivalent'],
  DIRECT_SHIP: ['Direct Ship (DS)', 'Confirm direct-ship terms and supply with HPE'],
  '90_DAY_WARNING': ['EOL Warning (90-Day)', 'Plan upgrade within 90 days'],
  RETIRED: ['Discontinuation Date Passed', 'Select a supported successor for new designs'],
  APPROACHING_RETIREMENT: ['Approaching Discontinuation', 'Confirm supply and offer a supported successor']
};

function getLifecycleRecommendation(part, skuIndex, options) {
  const sku = cleanBaseSKU(part.sku);
  const catalogItem = skuIndex.get(sku);
  const row = catalogItem?.skuData || {};
  const description = row.Description || row.description || part.description || '';
  const retirement = analyzeRetirementDate(row['Discontinued Date'] || row.discontinuedDate || part.discontinuedDate || '', options);
  const input = classifyLifecycleState(part.lifecycleStatus, part.diffStatus, part.sku, part.description, part.vendorSupplyStatus);
  const catalog = catalogItem?.lifecycleState;
  const status = [input, catalog].find(state => state?.isBlockedForProduction)?.canonicalStatus
    || (retirement.isPast ? 'RETIRED' : null)
    || [input, catalog].find(state => state?.isClearanceOrRestricted)?.canonicalStatus
    || (retirement.isNear ? 'APPROACHING_RETIREMENT' : null);
  if (!status) return null;

  const [risk, action] = LIFECYCLE_ADVICE[status];
  const replacement = findActiveLifecycleReplacement({ ...part, sku, description }, skuIndex, options);
  return {
    sku,
    originalDesc: description,
    lifecycleStatus: status,
    risk,
    action,
    replacement,
    alternative: replacement?.sku || 'Confirm a compatible active SKU with HPE',
    discontinuedDate: retirement.retirementDate ?? null,
    daysRemaining: retirement.daysRemaining ?? null,
    commercialRemarks: formatLifecycleCommercialRemarks({ sku, status, risk, retirement, replacement })
  };
}

function generateLifecycleRecommendations(items, catalogData = null, options = {}) {
  const skuIndex = buildCatalogSkuIndex(catalogData);
  return items.map(part => getLifecycleRecommendation(part, skuIndex, options)).filter(Boolean);
}

module.exports = {
  getLifecycleRecommendation,
  generateLifecycleRecommendations
};
