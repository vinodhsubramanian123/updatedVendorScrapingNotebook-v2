'use strict';

/** Commercial default requested by the solution owner. It is a preference,
 * never evidence that a generic service SKU supports a particular product. */
const DEFAULT_SUPPORT_POLICY = Object.freeze({
  service: 'HPE Tech Care', years: 3, level: 'Basic',
  retentionPreference: 'None', fallbackRetention: 'PRODUCT_QUALIFIED_ONLY',
  selectionObjective: 'LOWEST_COST_QUALIFIED_FIXED_OR_FLEXIBLE',
  explicitRequirementsTakePriority: true,
  ownership: 'ICON', applyToAllIcons: false, applyToAllNodes: false,
  scope: ['SERVER', 'STORAGE', 'NETWORKING'],
  source: 'Solution-owner instruction, 2026-09-22'
});

function resolveSupportPolicy(items = [], explicitPolicy = null) {
  if (explicitPolicy) return { ...DEFAULT_SUPPORT_POLICY, ...explicitPolicy, origin: 'EXPLICIT_REQUEST' };
  const requested = items.filter(item => /tech\s*care|hardware support/i.test(item.description || ''));
  if (requested.length) {
    const descriptions = requested.map(item => item.description).join(' ');
    const years = [...new Set(requested.map(item => Number(item.description.match(/\b(\d+)\s*(?:years?|yrs?|y)\b/i)?.[1])).filter(Boolean))];
    const levels = [...new Set(requested.map(item => item.description.match(/\b(Basic|Essential|Critical)\b/i)?.[1]).filter(Boolean))];
    return { ...DEFAULT_SUPPORT_POLICY, years: years.length === 1 ? years[0] : null, level: levels.length === 1 ? levels[0] : null,
      retentionPreference: describeRetention(descriptions), origin: 'EXPLICIT_BOQ_PRESERVED', requestedSkus: requested.map(item => item.sku), automaticSubstitution: false };
  }
  return { ...DEFAULT_SUPPORT_POLICY, origin: 'STANDARD_DEFAULT', requiresProductQualification: true,
    selectionRule: 'Use Components → target icon → Services → Edit. Compare both fixed Care Pack and flexible support for the required term and tier. If retention is unspecified, choose the cheapest product-qualified option that meets the request; disclose DMR/CDMR/GDMR rather than adding broader retention by default. Keep flexible parent and product suffix together. Leave both apply-to-all options off. Preserve explicit customer requirements in the closest rank; cost alternatives must disclose any deviation. Never substitute service SKUs across products.' };
}

function describeRetention(description = '') {
  if (/\bCDMR\b|wCDMR|comprehensive\s+(?:defective\s+)?material/i.test(description)) return 'CDMR';
  if (/\bGDMR\b|wGDMR/i.test(description)) return 'GDMR';
  if (/\bDMR\b|wDMR|defective\s+media\s+retention/i.test(description)) return 'DMR';
  return 'Unspecified';
}

function applyRequestedDefaultSupport(items, targetDir) {
  if (new Set(items.map(item => item.configurationId).filter(Boolean)).size > 1) throw new Error('SUPPORT_ICON_SCOPE_REQUIRED: resolve each icon independently; bulk SLA propagation is disabled.');
  const { readPortalReceipt, normalizeSku } = require('./portal_receipt');
  const receipt = readPortalReceipt(targetDir);
  const support = receipt?.rows.filter(row => /3\s*(?:years?|yrs?|y)\b.*tech\s*care\s*basic/i.test(row.description || '')) || [];
  if (support.length !== 1) throw new Error('SUPPORT_DEFAULT_UNQUALIFIED: capture live product-specific 3-year Basic service and CLIC evidence first.');
  const baseRows = items.filter(row => /\b(switch|server|storage\s+(?:system|array)|frame)\b/i.test(row.description || '') && !/\b(service|support|svc|inst|upgrade|license|transceiver|adapter|cable|kit)\b/i.test(row.description || ''));
  if (baseRows.length !== 1 || !receipt.rows.some(row => row.sku === normalizeSku(baseRows[0].sku) && row.quantity === Number(baseRows[0].quantity))) throw new Error('SUPPORT_PRODUCT_MISMATCH: require one exact base product and quantity; shared accessories do not qualify a service.');
  // Explicit default override is an intentional user change. Keep the source
  // workbook and audit the removed parent/child service rows separately.
  const originalServices = items.filter(row => /\b(service|support|svc|inst(?:all(?:ation)?)?)\b/i.test(row.description || ''));
  const installRequested = originalServices.some(row => /\binst(?:all(?:ation)?)?\b/i.test(row.description));
  const serviceBases = new Set([support[0].sku.split('#')[0]]);
  if (installRequested) for (const row of receipt.rows) if (/\binst(?:all(?:ation)?)?\b/i.test(row.description || '')) serviceBases.add(row.sku.split('#')[0]);
  const replacements = receipt.rows.filter(row => serviceBases.has(row.sku.split('#')[0]));
  return { items: [...items.filter(row => !originalServices.includes(row)), ...replacements.map(row => ({ ...row, sku: row.sku.replace(/#/g, ' '), isConfirmedZeroPrice: row.unitPriceUsd === 0, priceSource: `Live OCA BOM ${receipt.capturedAt}`, supportPolicySource: 'EXPLICIT_STANDARD_DEFAULT', quantityScope: 'configuration' }))],
    removedServices: originalServices, receiptAt: receipt.capturedAt, retention: describeRetention(support[0].description), supportPolicy: resolveSupportPolicy([], { level: 'Basic', years: 3, retentionPreference: describeRetention(support[0].description) }) };
}

module.exports = { DEFAULT_SUPPORT_POLICY, resolveSupportPolicy, applyRequestedDefaultSupport, describeRetention };
