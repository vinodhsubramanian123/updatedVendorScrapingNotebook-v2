'use strict';

const path = require('path');

const FORM_FACTOR_SUFFIX = /_(?:SFF|LFF|EDSFF|NHP|RACK|MODULE|FRAME|ENCLOSURE)$/i;

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function inferPillar(family) {
  const normalized = normalize(family);
  if (['alletra', 'nimble', 'storeonce', 'msa', 'storeever'].includes(normalized)) return 'STORAGE';
  if (normalized === 'aruba') return 'NETWORKING';
  if (['proliant', 'synergy', 'cray', 'superdome', 'edgeline', 'simplivity'].includes(normalized)) return 'SERVER';
  return 'UNKNOWN';
}

function baseProductId(value) {
  return path.basename(String(value || '')).replace(FORM_FACTOR_SUFFIX, '');
}

function resolveProductIdentity(identifier, config = {}) {
  const notebooks = config.notebooks || {};
  const requested = baseProductId(identifier);
  const requestedNorm = normalize(requested);
  const match = Object.entries(notebooks).find(([key]) => normalize(baseProductId(key)) === requestedNorm);
  if (!match) return null;
  const [productId, rawEntry] = match;
  const entry = typeof rawEntry === 'object' && rawEntry !== null ? rawEntry : {};
  const family = entry.family || '';
  const generation = entry.gen || entry.generation || '';
  return {
    vendor: entry.vendor || 'HPE',
    pillar: entry.pillar || inferPillar(family),
    family,
    generation,
    productId: baseProductId(productId)
  };
}

function identityFromRule(rule, config) {
  const chassisIdentity = resolveProductIdentity(rule.chassis || rule.productId || '', config);
  return {
    vendor: rule.vendor || chassisIdentity?.vendor || '',
    pillar: rule.pillar || chassisIdentity?.pillar || '',
    family: rule.family || chassisIdentity?.family || '',
    generation: rule.gen || rule.generation || chassisIdentity?.generation || '',
    productId: baseProductId(rule.productId || rule.chassis || chassisIdentity?.productId || '')
  };
}

function same(left, right) {
  return Boolean(left && right && normalize(left) === normalize(right));
}

const SHARED_ACCESSORY_CLASSES = new Set([
  'CABLE', 'ENABLEMENT_KIT', 'RAIL', 'CABLE_MANAGEMENT_ARM',
  'POWER_CORD', 'TRANSCEIVER', 'OTHER_ACCESSORY'
]);

const TRUSTED_COMPATIBILITY_EVIDENCE = new Set([
  'OFFICIAL_VENDOR_DOC', 'CERTIFIED_OCA_CATALOG', 'VERIFIED_PORTAL_RULE'
]);

function isVerifiedSharedAccessoryRule(rule, target) {
  if (rule?.sharedAccessoryVerified !== true || !target || !rule.affectedSku) return false;
  const scope = String(rule.scopeTaxonomy || rule.scope || 'CHASSIS_SPECIFIC').toUpperCase().replace(/_RULES$/, '');
  if (scope !== 'CHASSIS_SPECIFIC') return false;
  if (!SHARED_ACCESSORY_CLASSES.has(String(rule.accessoryClass || '').toUpperCase())) return false;
  if (!TRUSTED_COMPATIBILITY_EVIDENCE.has(String(rule.compatibilityEvidenceType || '').toUpperCase())) return false;
  if (String(rule.verificationStatus || '').toUpperCase() !== 'VERIFIED') return false;
  if (!Array.isArray(rule.verificationSourceIds) || !rule.verificationSourceIds.some(id => String(id).trim())) return false;
  const compatibleProducts = Array.isArray(rule.compatibleProductIds) ? rule.compatibleProductIds : [];
  return compatibleProducts.some(productId => same(baseProductId(productId), target.productId));
}

function ruleAppliesToProduct(rule, target, config = {}) {
  if (!rule || !target) return false;
  const source = identityFromRule(rule, config);
  if (!same(source.vendor || target.vendor, target.vendor)) return false;
  if (rule.sharedAccessoryVerified === true) return isVerifiedSharedAccessoryRule(rule, target);
  const normalizedScope = String(rule.scopeTaxonomy || rule.scope || 'CHASSIS_SPECIFIC').toUpperCase().replace(/_RULES$/, '');
  if (normalizedScope === 'UNIVERSAL_VENDOR') return !rule.vendor || same(rule.vendor, target.vendor);

  if (source.pillar && !same(source.pillar, target.pillar)) return false;
  if (normalizedScope === 'FAMILY_GEN') {
    // A legacy record may be labelled FAMILY_GEN even though its provenance is
    // a single product. Cross-product reuse requires an explicit verification
    // marker; otherwise preserve the product firewall.
    if (source.productId && !same(source.productId, target.productId) && rule.familyWideVerified !== true) return false;
    return same(source.family, target.family) && same(source.generation, target.generation);
  }
  return same(source.productId, target.productId);
}

function scopeRegistryForProduct(registry, productId, config = {}) {
  const target = resolveProductIdentity(productId, config);
  if (!target) return { target: null, universalRules: [], familyGenRules: [], chassisSpecificRules: [], totalLearnedRules: 0 };
  const universalRules = (registry?.universalRules || []).filter(rule => ruleAppliesToProduct(rule, target, config));
  const familyGenRules = (registry?.familyGenRules || []).filter(rule => ruleAppliesToProduct(rule, target, config));
  const chassisSpecificRules = (registry?.chassisSpecificRules || []).filter(rule => ruleAppliesToProduct(rule, target, config));
  return {
    target,
    universalRules,
    familyGenRules,
    chassisSpecificRules,
    totalLearnedRules: universalRules.length + familyGenRules.length + chassisSpecificRules.length
  };
}

module.exports = {
  baseProductId,
  inferPillar,
  normalize,
  resolveProductIdentity,
  isVerifiedSharedAccessoryRule,
  ruleAppliesToProduct,
  scopeRegistryForProduct
};
