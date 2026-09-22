'use strict';

/** Commercial default requested by the solution owner. It is a preference,
 * never evidence that a generic service SKU supports a particular product. */
const DEFAULT_SUPPORT_POLICY = Object.freeze({
  service: 'HPE Tech Care', years: 3, level: 'Basic',
  retentionPreference: 'None', fallbackRetention: 'PRODUCT_QUALIFIED_ONLY',
  ownership: 'ICON', applyToAllIcons: false, applyToAllNodes: false,
  scope: ['SERVER', 'STORAGE', 'NETWORKING'],
  source: 'Solution-owner instruction, 2026-09-22'
});

function resolveSupportPolicy(items = [], explicitPolicy = null) {
  if (explicitPolicy) return { ...DEFAULT_SUPPORT_POLICY, ...explicitPolicy, origin: 'EXPLICIT_REQUEST' };
  const requested = items.filter(item => /tech\s*care|hardware support/i.test(item.description || ''));
  if (requested.length) return { ...DEFAULT_SUPPORT_POLICY, origin: 'EXPLICIT_BOQ_PRESERVED', requestedSkus: requested.map(item => item.sku), automaticSubstitution: false };
  return { ...DEFAULT_SUPPORT_POLICY, origin: 'STANDARD_DEFAULT', requiresProductQualification: true,
    selectionRule: 'Use Components → target icon → Services → Edit. Try 3-year Basic without retention first; use an available product-qualified retention variant only when plain Basic is unavailable, retaining its exact CDMR/GDMR designation. Leave both apply-to-all options off. Preserve explicit alternatives and icon ownership. Never substitute a service SKU across products.' };
}

function applyRequestedDefaultSupport(items, targetDir) {
  if (new Set(items.map(item => item.configurationId).filter(Boolean)).size > 1) throw new Error('SUPPORT_ICON_SCOPE_REQUIRED: resolve each icon independently; bulk SLA propagation is disabled.');
  const { readPortalReceipt, normalizeSku } = require('./portal_receipt');
  const receipt = readPortalReceipt(targetDir);
  const support = receipt?.rows.filter(row => /3\s*(?:year|yr|y)\b.*tech\s*care\s*basic/i.test(row.description || '')) || [];
  if (support.length !== 1) throw new Error('SUPPORT_DEFAULT_UNQUALIFIED: capture live product-specific 3-year Basic service and CLIC evidence first.');
  const baseRows = items.filter(row => /\b(switch|server|storage\s+(?:system|array)|frame)\b/i.test(row.description || '') && !/\b(service|support|svc|inst|upgrade|license|transceiver|adapter|cable|kit)\b/i.test(row.description || ''));
  if (baseRows.length !== 1 || !receipt.rows.some(row => row.sku === normalizeSku(baseRows[0].sku) && row.quantity === Number(baseRows[0].quantity))) throw new Error('SUPPORT_PRODUCT_MISMATCH: require one exact base product and quantity; shared accessories do not qualify a service.');
  // Explicit default override is an intentional user change. Keep the source
  // workbook and audit the removed parent/child service rows separately.
  const originalServices = items.filter(row => /\b(service|support|svc|inst(?:all(?:ation)?)?)\b/i.test(row.description || ''));
  const installRequested = originalServices.some(row => /\binst(?:all(?:ation)?)?\b/i.test(row.description));
  const replacements = receipt.rows.filter(row => row === support[0] || (installRequested && /install/i.test(row.description || '')));
  return { items: [...items.filter(row => !originalServices.includes(row)), ...replacements.map(row => ({ ...row, sku: row.sku.replace(/#/g, ' '), supportPolicySource: 'EXPLICIT_STANDARD_DEFAULT', quantityScope: 'configuration' }))],
    removedServices: originalServices, receiptAt: receipt.capturedAt, supportPolicy: resolveSupportPolicy([], { level: 'Basic', years: 3 }) };
}

module.exports = { DEFAULT_SUPPORT_POLICY, resolveSupportPolicy, applyRequestedDefaultSupport };
