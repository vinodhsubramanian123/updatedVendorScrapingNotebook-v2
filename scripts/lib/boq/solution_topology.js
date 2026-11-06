'use strict';

// Product families identify catalogs; component roles select validation rules.
// A shared brand, link speed or accessory must never select a server profile.
const { cleanBaseSKU } = require('../catalog/sku');

function topologyRole(description = '') {
  const text = String(description).replace(/_/g, ' ');
  if (/\b(service|support|svc|installation|upgrade|license|cable|transceiver|adapter|riser|heatsink|fan|power supply|blank|rail|processor|memory|battery|ssd|hdd|kit|bezel|cma|backplane|cage|baffle|cooling|boot device|tracking|configuration|enablement|switchboard)\b/i.test(text)) return null;
  if (/\b(?:frame|enclosure)\b/i.test(text) && /synergy|blade|composable/i.test(text)) return 'enclosure';
  if (/virtual\s*connect|\binterconnect\b|\bfabric\s+(?:module|switch)\b|\bswitch\b|\b(?:synergy\s+)?vc\s*\d+\s*gb\b|\bsy100gb\s*f32\b/i.test(text)) return 'networking';
  if (/\b(?:tape library|storeever|msl\s*\d+)\b/i.test(text)) return 'archive';
  if (/alletra|nimble|storeonce|powerstore|powervault|\bstorage\s+(?:array|system|appliance)\b|\bmsa\s*\d+/i.test(text)) return 'storage';
  if (/\b(?:server|compute module|compute blade|proliant|poweredge|thinksystem)\b|\b(?:synergy\s*480|sy480|dl\s*\d{3}[a-z]?)\b/i.test(text)) return 'server';
  return null;
}

function _resolveTopologyNodes(items, map) {
  const nodes = [];
  for (const item of items) {
    const sku = cleanBaseSKU(item.sku);
    const exact = sku ? Object.values(map).find(entry => entry.baseSku && cleanBaseSKU(entry.baseSku) === sku) : null;
    // An exact registered base identity wins over customer wording about its
    // bundled options. Accessories mentioning the same model are not anchors.
    const description = exact ? `${exact.model || ''} ${exact.productId || ''} ${exact.formFactor || ''}` : item.description || '';
    const pillar = exact ? require('../catalog/product_scope').inferPillar(exact.family, description) : null;
    const role = topologyRole(description) || ({ SERVER: 'server', STORAGE: 'storage', NETWORKING: 'networking', COMPOSITE: 'enclosure' }[pillar] || null);
    if (role) {
      nodes.push({
        sku: item.sku,
        role,
        quantity: item.quantity,
        configurationId: item.configurationId || null,
        parentId: item.parentId || item.subParentId || null,
        productId: exact?.productId || exact?.id || null
      });
    }
  }
  return nodes;
}

function _resolveTopologyDomain(roles, nodes, chassisInfo, identityText) {
  const fallbackRole = topologyRole(identityText);
  if (!roles.length && fallbackRole && !chassisInfo.unknown) {
    roles.push(fallbackRole);
  }
  const nonServerAppliances = nodes.filter(node => node.role !== 'server');
  const repeatedAppliances = nonServerAppliances.some(node => Number(node.quantity) > 1);
  const multipleNonServerAppliances = nonServerAppliances.length > 1;
  const isComposite = roles.length > 1 || roles.includes('enclosure') || repeatedAppliances || multipleNonServerAppliances;
  return isComposite ? 'composite' : (roles[0] || (chassisInfo?.unknown ? 'server' : 'unknown'));
}

function _resolveCompositeRelationshipStatus(compositeChecks, relationshipChecks) {
  if (!compositeChecks.length) {
    return relationshipChecks.length ? 'NOT_EVALUATED' : 'NOT_APPLICABLE';
  }
  if (compositeChecks.every(c => ['PASS', 'NOT_APPLICABLE'].includes(c.status))) {
    return 'EVALUATED_PASS';
  }
  if (compositeChecks.some(c => c.status === 'FAIL')) {
    return 'EVALUATED_FAIL';
  }
  return 'EVALUATED_PARTIAL';
}

function resolveSolutionTopology(items = [], chassisInfo = {}, catalogData = null) {
  const map = require('../catalog/catalog_discovery').getChassisMap();
  const nodes = _resolveTopologyNodes(items, map);
  const roles = [...new Set(nodes.map(node => node.role))];
  const identityText = `${chassisInfo.model || ''} ${chassisInfo.id || ''} ${catalogData?.metadata?.chassis || ''}`;
  const domain = _resolveTopologyDomain(roles, nodes, chassisInfo, identityText);

  const synergy = /synergy|\bSY(?:480|100Gb)/i.test(identityText) || items.some(item => /synergy/i.test(item.description || ''));
  const isCompositeSolution = domain === 'composite' || synergy;
  const relationshipChecks = isCompositeSolution
    ? ['OWNERSHIP_AND_CONTAINMENT', 'ENCLOSURE_BAY_COMPATIBILITY', 'ADAPTER_TO_FABRIC_MAPPING', 'ENDPOINT_PROTOCOL_SPEED_OPTICS', 'SHARED_POWER_COOLING', 'PER_ICON_SUPPORT']
    : [];
  const compositeChecks = isCompositeSolution
    ? evaluateCompositeRelationships(items, { domain, roles, nodes }, chassisInfo, catalogData)
    : [];
  const compositeRelationshipStatus = _resolveCompositeRelationshipStatus(compositeChecks, relationshipChecks);

  return {
    domain,
    roles,
    nodes,
    relationshipChecks,
    compositeChecks,
    classificationBasis: 'BASE_PRODUCT_ROLE',
    scope: domain === 'composite' ? 'MULTI_COMPONENT_SOLUTION' : 'SINGLE_PRODUCT',
    requiresScopedCatalogs: domain === 'composite',
    relationshipStatus: compositeRelationshipStatus
  };
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

function _checkEnclosureBayCompatibility(items, topology, chassisInfo, catalogData) {
  const serverItems = items.filter(i => topologyRole(i.description || '') === 'server');
  const bladeCount = serverItems.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0);
  const maxBays = catalogData?.metadata?.maxBays || chassisInfo?.maxBays || 12;

  if (bladeCount > 0) {
    if (bladeCount <= maxBays) {
      return {
        id: 'ENCLOSURE_BAY_COMPATIBILITY',
        name: 'Enclosure Bay Compatibility',
        status: 'PASS',
        detail: `Blade count (${bladeCount}) is within frame bay capacity (${maxBays} bays).`
      };
    }
    return {
      id: 'ENCLOSURE_BAY_COMPATIBILITY',
      name: 'Enclosure Bay Compatibility',
      status: 'FAIL',
      detail: `Blade count (${bladeCount}) exceeds maximum frame bay capacity (${maxBays} bays). Additional enclosure required.`
    };
  }
  if (topology.roles?.includes('enclosure')) {
    return {
      id: 'ENCLOSURE_BAY_COMPATIBILITY',
      name: 'Enclosure Bay Compatibility',
      status: 'EVIDENCE_REQUIRED',
      detail: 'Enclosure frame detected but no compute blades found in BOM.'
    };
  }
  return {
    id: 'ENCLOSURE_BAY_COMPATIBILITY',
    name: 'Enclosure Bay Compatibility',
    status: 'NOT_APPLICABLE',
    detail: 'No composable enclosure or blade containment requirement.'
  };
}

function _extractLinkSpeeds(items, regex) {
  const speeds = new Set();
  items.forEach(i => {
    const text = (i.description || '').toLowerCase();
    if (regex && !regex.test(text)) return;
    const match = text.match(/\b(100|50|25|10)\s*gb\b/i);
    if (match) speeds.add(match[1]);
  });
  return speeds;
}

function _checkAdapterToFabricMapping(items, serverItems, networkingItems) {
  if (!networkingItems.length || !serverItems.length) {
    return {
      id: 'ADAPTER_TO_FABRIC_MAPPING',
      name: 'Adapter To Fabric Mapping',
      status: 'NOT_APPLICABLE',
      detail: 'Solution does not contain concurrent compute and fabric interconnect modules.'
    };
  }
  const netSpeeds = _extractLinkSpeeds(networkingItems, null);
  const adapterSpeeds = _extractLinkSpeeds(items, /adapter|mezzanine|ocp/i);

  if (!netSpeeds.size || !adapterSpeeds.size) {
    return {
      id: 'ADAPTER_TO_FABRIC_MAPPING',
      name: 'Adapter To Fabric Mapping',
      status: 'EVIDENCE_REQUIRED',
      detail: 'Networking and compute nodes present but adapter or fabric link speeds cannot be verified from description.'
    };
  }
  const common = [...netSpeeds].filter(s => adapterSpeeds.has(s));
  if (common.length > 0) {
    return {
      id: 'ADAPTER_TO_FABRIC_MAPPING',
      name: 'Adapter To Fabric Mapping',
      status: 'PASS',
      detail: `Mezzanine/adapter link speed (${[...adapterSpeeds].join('/')}Gb) matches fabric interconnect speed (${[...netSpeeds].join('/')}Gb).`
    };
  }
  return {
    id: 'ADAPTER_TO_FABRIC_MAPPING',
    name: 'Adapter To Fabric Mapping',
    status: 'FAIL',
    detail: `Speed mismatch between mezzanine adapter (${[...adapterSpeeds].join('/')}Gb) and fabric interconnect module (${[...netSpeeds].join('/')}Gb).`
  };
}

function _calculateComputeTdp(items) {
  let totalTdp = 0;
  let tdpCount = 0;
  items.forEach(i => {
    const text = (i.description || '').toLowerCase();
    const qty = Number(i.quantity) || 1;
    const tdpMatch = text.match(/(\d{2,3})\s*w\s*tdp/i) || text.match(/\b(\d{2,3})\s*w\b/i);
    if (/processor|xeon|epyc/i.test(text) && tdpMatch) {
      const watts = parseInt(tdpMatch[1], 10);
      if (watts >= 65 && watts <= 500) {
        totalTdp += watts * qty;
        tdpCount += qty;
      }
    }
  });
  return { totalTdp, tdpCount };
}

function _checkSharedPowerCooling(items, chassisInfo) {
  const { totalTdp, tdpCount } = _calculateComputeTdp(items);
  const maxPowerWatts = chassisInfo?.maxPowerWatts || 2650;

  if (tdpCount === 0) {
    return {
      id: 'SHARED_POWER_COOLING',
      name: 'Shared Power Cooling',
      status: 'EVIDENCE_REQUIRED',
      detail: 'CPU TDP specifications not explicitly stated in BOQ descriptions.'
    };
  }
  if (totalTdp <= maxPowerWatts) {
    return {
      id: 'SHARED_POWER_COOLING',
      name: 'Shared Power Cooling',
      status: 'PASS',
      detail: `Total compute TDP (${totalTdp}W across ${tdpCount} CPUs) is within chassis power/thermal envelope (${maxPowerWatts}W).`
    };
  }
  return {
    id: 'SHARED_POWER_COOLING',
    name: 'Shared Power Cooling',
    status: 'FAIL',
    detail: `Total compute TDP (${totalTdp}W) exceeds enclosure power budget (${maxPowerWatts}W). Additional power supply kits required.`
  };
}

/**
 * Evaluate composite solution cross-component relationships:
 * 1. ENCLOSURE_BAY_COMPATIBILITY
 * 2. ADAPTER_TO_FABRIC_MAPPING
 * 3. SHARED_POWER_COOLING
 */
function evaluateCompositeRelationships(items = [], topology = {}, chassisInfo = {}, catalogData = null) {
  const serverItems = items.filter(i => topologyRole(i.description || '') === 'server');
  const networkingItems = items.filter(i => topologyRole(i.description || '') === 'networking');

  return [
    _checkEnclosureBayCompatibility(items, topology, chassisInfo, catalogData),
    _checkAdapterToFabricMapping(items, serverItems, networkingItems),
    _checkSharedPowerCooling(items, chassisInfo)
  ];
}

module.exports = { topologyRole, resolveSolutionTopology, evaluateUnprofiledTopology, evaluateCompositeRelationships };
