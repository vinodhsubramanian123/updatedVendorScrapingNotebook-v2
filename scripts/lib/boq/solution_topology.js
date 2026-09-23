'use strict';

// Product families identify catalogs; component roles select validation rules.
// A shared brand, link speed or accessory must never select a server profile.
const { cleanBaseSKU } = require('../catalog/sku');

function topologyRole(description = '') {
  const text = String(description).replace(/_/g, ' ');
  if (/\b(service|support|svc|installation|upgrade|license|cable|transceiver|adapter|riser|heatsink|fan|power supply|blank|rail|processor|memory|battery|ssd|hdd|kit|bezel|cma|backplane|cage|baffle|cooling|boot device)\b/i.test(text)) return null;
  if (/\b(?:frame|enclosure)\b/i.test(text) && /synergy|blade|composable/i.test(text)) return 'enclosure';
  if (/virtual\s*connect|\binterconnect\b|\bfabric\s+(?:module|switch)\b|\bswitch\b|\b(?:synergy\s+)?vc\s*\d+\s*gb\b|\bsy100gb\s*f32\b/i.test(text)) return 'networking';
  if (/\b(?:tape library|storeever|msl\s*\d+)\b/i.test(text)) return 'archive';
  if (/alletra|nimble|storeonce|powerstore|powervault|\bstorage\s+(?:array|system|appliance)\b|\bmsa\s*\d+/i.test(text)) return 'storage';
  if (/\b(?:server|compute module|compute blade|proliant|poweredge|thinksystem)\b|\b(?:synergy\s*480|sy480|dl\s*\d{3}[a-z]?)\b/i.test(text)) return 'server';
  return null;
}

function resolveSolutionTopology(items = [], chassisInfo = {}, catalogData = null) {
  const map = require('../catalog/catalog_discovery').getChassisMap();
  const nodes = [];
  for (const item of items) {
    const sku = cleanBaseSKU(item.sku);
    const exact = sku ? Object.values(map).find(entry => entry.baseSku && cleanBaseSKU(entry.baseSku) === sku) : null;
    // An exact registered base identity wins over customer wording about its
    // bundled options. Accessories mentioning the same model are not anchors.
    const description = exact ? `${exact.model || ''} ${exact.productId || ''} ${exact.formFactor || ''}` : item.description || '';
    const pillar = exact ? require('../catalog/product_scope').inferPillar(exact.family, description) : null;
    const role = topologyRole(description) || ({ SERVER: 'server', STORAGE: 'storage', NETWORKING: 'networking', COMPOSITE: 'enclosure' }[pillar] || null);
    if (role) nodes.push({ sku: item.sku, role, quantity: item.quantity, configurationId: item.configurationId || null,
      parentId: item.parentId || item.subParentId || null, productId: exact?.productId || exact?.id || null });
  }
  const roles = [...new Set(nodes.map(node => node.role))];
  const identityText = `${chassisInfo.model || ''} ${chassisInfo.id || ''} ${catalogData?.metadata?.chassis || ''}`;
  const fallbackRole = topologyRole(identityText);
  if (!roles.length && fallbackRole && !chassisInfo.unknown) roles.push(fallbackRole);
  const repeatedAppliances = nodes.some(node => node.role !== 'server' && Number(node.quantity) > 1);
  const domain = roles.length > 1 || nodes.length > 1 || repeatedAppliances || roles.includes('enclosure') ? 'composite' : roles[0] || 'unknown';
  const synergy = /synergy|\bSY(?:480|100Gb)/i.test(identityText) || items.some(item => /synergy/i.test(item.description || ''));
  const relationshipChecks = domain === 'composite' || synergy
    ? ['OWNERSHIP_AND_CONTAINMENT', 'ENCLOSURE_BAY_COMPATIBILITY', 'ADAPTER_TO_FABRIC_MAPPING', 'ENDPOINT_PROTOCOL_SPEED_OPTICS', 'SHARED_POWER_COOLING', 'PER_ICON_SUPPORT'] : [];
  return { domain, roles, nodes, relationshipChecks, classificationBasis: 'BASE_PRODUCT_ROLE',
    scope: domain === 'composite' ? 'MULTI_COMPONENT_SOLUTION' : 'SINGLE_PRODUCT',
    requiresScopedCatalogs: domain === 'composite',
    relationshipStatus: relationshipChecks.length ? 'NOT_EVALUATED' : 'NOT_APPLICABLE' };
}

const DOMAIN_CHECKS = {
  networking: ['PORT_CAPACITY_AND_LICENSES', 'PROTOCOL_SPEED_OPTICS_CABLES', 'POWER_AIRFLOW_REDUNDANCY', 'PRODUCT_SUPPORT'],
  storage: ['CONTROLLERS_AND_REDUNDANCY', 'DRIVE_ENCLOSURE_AND_MEDIA_COMPATIBILITY', 'HOST_PORTS_AND_CONNECTIVITY', 'CAPACITY_AND_LICENSES', 'POWER_COOLING', 'PRODUCT_SUPPORT'],
  archive: ['LIBRARY_DRIVE_MEDIA_COMPATIBILITY', 'SLOT_AND_CAPACITY_LICENSES', 'HOST_CONNECTIVITY', 'POWER_AND_SUPPORT'],
  composite: ['OWNED_COMPONENT_CATALOGS', 'PER_COMPONENT_VALIDATION', 'CROSS_COMPONENT_DEPENDENCIES'],
  unknown: ['EXACT_PRODUCT_IDENTITY_AND_VALIDATION_PROFILE']
};

/** Safe boundary for domains without a complete product-specific evaluator.
 * Enumerate required evidence, preserve the BOQ, never inject server defaults.
 * A successful scrape or generic rule check is not a buildability certificate.
 */
function evaluateUnprofiledTopology(items, topology, chassisInfo) {
  const required = [...(DOMAIN_CHECKS[topology.domain] || DOMAIN_CHECKS.unknown), ...topology.relationshipChecks];
  const aspectChecks = required.map(id => ({ id, name: id.replace(/_/g, ' '), status: 'NOT_EVALUATED',
    detail: topology.domain === 'composite'
      ? 'Resolve each owned component against its exact catalog, then validate parent/bay, fabric, power and support relationships.'
      : 'A product-specific rule profile and vendor evidence are required; server CPU/DIMM/PCIe defaults do not apply.' }));
  const warning = `VALIDATION_PROFILE_REQUIRED: ${topology.domain} topology is identified, but complete scoped validation is pending.`;
  return { items, solutionTopology: topology, productType: topology.domain.toUpperCase(),
    isMathClean: false, isGraphClean: false, criticalViolationsCount: 0, errors: [], warnings: [warning],
    missingDependencies: [], mathDeductions: [], aspectChecks, portalValidationStatus: 'PENDING',
    evalSummary: { aspectChecks, solutionTopology: topology, errors: [], warnings: [warning], missingDependencies: [] },
    confidence: { score: 0, isHitlTriggered: true, confidenceReasons: [warning] },
    conflictGraph: { chassisInfo, rulesSource: 'DOMAIN_PROFILE_REQUIRED', isWholeSolutionValid: false,
      conflicts: [], resolvedFixes: [], unresolvedConflicts: [{ type: 'VALIDATION_PROFILE_REQUIRED', message: warning }], rankedSolutions: [] } };
}

module.exports = { topologyRole, resolveSolutionTopology, evaluateUnprofiledTopology };
