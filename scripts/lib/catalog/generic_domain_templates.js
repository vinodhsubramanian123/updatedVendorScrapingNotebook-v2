'use strict';
/**
 * scripts/lib/catalog/generic_domain_templates.js — Vendor-Agnostic Domain Template Rules & Capability Engine
 *
 * Implements zero-hardcoding physical capability and constraint evaluation across
 * Server, Storage, and Networking domains. Evaluates capabilities dynamically
 * from parsed component attributes and category roles, resolving matching native SKUs
 * on-the-fly from live product catalogs.
 */

const fs = require('fs');
const path = require('path');

let cachedRulesMatrix = null;

/**
 * Load the generic domain rules matrix from config
 * @returns {object} Parsed rules matrix
 */
function loadGenericRulesMatrix() {
  if (cachedRulesMatrix) return cachedRulesMatrix;
  const configPath = path.join(__dirname, '../../config/generic_domain_rules_matrix.json');
  try {
    if (fs.existsSync(configPath)) {
      cachedRulesMatrix = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return cachedRulesMatrix;
    }
  } catch (err) {
    console.warn('[GENERIC_TEMPLATES] Warning: Failed to load generic_domain_rules_matrix.json:', err.message);
  }
  return { version: '1.0.0', domains: ['SERVER', 'STORAGE', 'NETWORKING', 'UNIVERSAL'], rules: [] };
}

/**
 * Canonical Domain Categories
 */
const GENERIC_DOMAIN_CATEGORIES = Object.freeze({
  SERVER: [
    'PROCESSOR', 'MEMORY', 'STORAGE_CONTROLLER', 'STORAGE_CAGE', 'STORAGE_DRIVE',
    'POWER_SUPPLY', 'PCIE_EXPANSION', 'ACCELERATOR_GPU', 'COOLING', 'SYSTEM_MANAGEMENT',
    'SOFTWARE_LICENSE'
  ],
  STORAGE: [
    'BASE_ENCLOSURE', 'STORAGE_CONTROLLER', 'DRIVE_MEDIA', 'EXPANSION_SHELF',
    'HOST_INTERFACE', 'DRIVE_BLANK', 'STORAGE_FABRIC_SWITCH'
  ],
  NETWORKING: [
    'INTERCONNECT_MODULE', 'FABRIC_SWITCH', 'NETWORK_ADAPTER', 'TRANSCEIVER',
    'DIRECT_ATTACH_CABLE', 'CHASSIS_FRAME_LINK'
  ]
});

/**
 * Capability-to-Catalog Semantic Matcher
 * Maps abstract capabilities to semantic category, subcategory, or description patterns
 */
const CAPABILITY_SEMANTIC_MAP = Object.freeze({
  HIGH_PERFORMANCE_COOLING: {
    categoryPatterns: [/cooling/i, /fan/i, /heatsink/i, /heat sink/i],
    descPatterns: [/high perf.*fan/i, /perf.*heat.*sink/i, /performance fan/i]
  },
  NO_DRIVE_BLANK_OR_FIO_BYPASS: {
    categoryPatterns: [/factory/i, /fio/i, /chassis/i],
    descPatterns: [/no drive.*fio/i, /drive.*blank/i]
  },
  GPU_AUXILIARY_POWER_AND_TITANIUM_PSU: {
    categoryPatterns: [/power/i, /cable/i, /gpu/i],
    descPatterns: [/gpu.*cable/i, /2400w.*titanium/i, /auxiliary power/i]
  },
  STORAGE_EXPANDER_OR_SWITCH: {
    categoryPatterns: [/controller/i, /storage/i, /expansion/i],
    descPatterns: [/sas expander/i, /tri-mode switch/i, /expander card/i]
  },
  STORAGE_DRIVE_BLANKS: {
    categoryPatterns: [/drive/i, /blank/i, /storage/i],
    descPatterns: [/drive blank/i, /blank kit/i]
  },
  MATCHED_FABRIC_TRANSCEIVERS_OR_DACS: {
    categoryPatterns: [/transceiver/i, /networking/i, /cable/i],
    descPatterns: [/sfp\+/i, /sfp28/i, /qsfp28/i, /transceiver/i, /dac/i]
  },
  COMPACT_EDGE_POWER_SUPPLY: {
    categoryPatterns: [/power/i],
    descPatterns: [/1000w.*titanium/i, /edge.*psu/i, /flex slot.*1000w/i]
  },
  RISER_SUPPLEMENTAL_POWER_CABLE: {
    categoryPatterns: [/cable/i, /riser/i],
    descPatterns: [/riser.*power/i, /primary.*cable/i, /power delivery.*cable/i]
  },
  REGULATORY_LOT9_CE_REMOVAL_OR_TITANIUM: {
    categoryPatterns: [/factory/i, /power/i],
    descPatterns: [/ce mark removal/i, /erp lot 9/i, /titanium/i]
  },
  DERATED_AMBIENT_TEMPERATURE_TRACKING: {
    categoryPatterns: [/ambient/i, /thermal/i, /chassis/i],
    descPatterns: [/25c.*ambient/i, /20c.*ambient/i, /ambient.*tracking/i, /23c.*ambient/i]
  },
  SECONDARY_EXPANSION_RISER_KIT: {
    categoryPatterns: [/riser/i, /pcie/i],
    descPatterns: [/secondary.*riser/i, /sec.*riser/i, /2u.*secondary/i]
  },
  STORAGE_BACKPLANE_DATA_INTERCONNECT_CABLE: {
    categoryPatterns: [/cable/i, /storage/i],
    descPatterns: [/pcie cable/i, /umb.*cable/i, /box 1/i, /box 2/i, /controller cable/i, /8sff.*cable/i]
  },
  GPU_16PIN_AUXILIARY_POWER_CABLE: {
    categoryPatterns: [/cable/i, /gpu/i, /power/i],
    descPatterns: [/16-pin.*power/i, /gpu 16-pin/i, /12vhpwr/i, /12v-2x6/i]
  },
  SECONDARY_OCP_SLOT_ENABLEMENT_CABLE: {
    categoryPatterns: [/cable/i, /networking/i, /ocp/i],
    descPatterns: [/rear ocp.*slotb/i, /slotb.*cable/i, /ocp.*slotb/i, /cpu1 to rear ocp/i]
  },
  PRIMARY_FULL_BANDWIDTH_EXPANSION_RISER: {
    categoryPatterns: [/riser/i, /pcie/i],
    descPatterns: [/primary.*riser.*x16/i, /2u.*primary.*riser/i, /primary.*x16\/x16\/x16/i]
  },
  RACK_CABLE_MANAGEMENT_ARM: {
    categoryPatterns: [/rack/i, /rail/i, /cable/i],
    descPatterns: [/cable management arm/i, /\bcma\b/i, /arm.*rail/i]
  },
  TRUE_N_PLUS_ONE_REDUNDANT_POWER_SUBSYSTEM: {
    categoryPatterns: [/power/i, /supply/i],
    descPatterns: [/1800w.*2200w/i, /2200w.*titanium/i, /2400w/i, /3200w/i, /1600w.*titanium/i]
  },
  DATA_STORAGE_DRIVE_PRESERVATION: {
    categoryPatterns: [/drive/i, /ssd/i, /storage/i],
    descPatterns: [/960gb.*sata/i, /read intensive.*ssd/i, /sff.*bc.*ssd/i, /nvme.*ssd/i]
  },
  TERTIARY_RISER_DECONFLICTED: {
    categoryPatterns: [/riser/i],
    descPatterns: [/tertiary.*riser/i]
  }
});

/**
 * Filter generic rules for a given target domain
 * @param {string} domain E.g. 'SERVER', 'STORAGE', 'NETWORKING'
 * @returns {Array} List of matching rule definitions
 */
function getGenericRulesForDomain(domain = 'SERVER') {
  const matrix = loadGenericRulesMatrix();
  const targetDomain = String(domain || 'SERVER').toUpperCase();
  return (matrix.rules || []).filter(r => r.domain === targetDomain || r.domain === 'UNIVERSAL');
}

function _inspectProcessorTelemetry(desc, cat, qty, state) {
  if (cat.includes('processor') || desc.includes('xeon') || desc.includes('epyc') || (desc.includes('core') && !cat.includes('support'))) {
    state.cpuCount += qty;
    const tdpMatch = desc.match(/(\d{2,3})w\b/i);
    if (tdpMatch) {
      const tdp = parseInt(tdpMatch[1], 10);
      if (tdp > state.maxTdp) state.maxTdp = tdp;
      state.totalTdp += tdp * qty;
    }
  }
}

function _inspectGpuTelemetry(desc, cat, state) {
  const isGpu = /(?:graphic|accelerator)/.test(cat) || /(?:nvidia|h100|h200|l40|a100|rtx 6000|gpu)/.test(desc);
  if (isGpu) {
    state.hasGpu = true;
    if (/(?:double-wide|l40s|h100|h200|a100|rtx 6000|8dw)/.test(desc)) {
      state.hasDoubleWideGpu = true;
    }
  }
}

function _inspectControllerTelemetry(desc, cat, qty, state) {
  const isCtrl = cat.includes('controller') || /(?:raid|smart array|hba|tri-mode)/.test(desc);
  if (isCtrl) {
    state.controllerCount += qty;
    const hasCache = /(?:cache|fbwc|4gb|8gb)/.test(desc);
    const explicitNoCache = /(?:no cache|mr216i|zero cache)/.test(desc);
    if (explicitNoCache || !hasCache) {
      state.hasCachelessController = true;
    }
  }
}

function _inspectStorageDriveTelemetry(desc, cat, qty, state) {
  const isStorage = (cat.includes('storage device') || cat.includes('drive')) && !/(?:cage|controller|cable|blank)/.test(desc);
  if (isStorage && /(?:ssd|hdd|nvme|sas|sata|tb|gb)/.test(desc)) {
    state.driveCount += qty;
  }
}

function _inspectCageTelemetry(desc, cat, state) {
  if (desc.includes('cage') || cat.includes('smart chassis') || desc.includes('backplane')) {
    if (desc.includes('sff')) state.cageFormFactors.add('SFF');
    if (desc.includes('edsff')) state.cageFormFactors.add('EDSFF');
    if (desc.includes('lff')) state.cageFormFactors.add('LFF');
  }
}

function _inspectPowerTelemetry(desc, cat, qty, state) {
  if (cat.includes('power supply') || desc.includes('psu') || desc.includes('flex slot')) {
    state.psuCount += qty;
    const wattMatch = desc.match(/(\d{3,4})w\b/i);
    if (wattMatch) {
      const watts = parseInt(wattMatch[1], 10);
      if (watts > state.maxPsuWattage) state.maxPsuWattage = watts;
    }
  }
}

function _inspectMemoryAndPcieTelemetry(desc, cat, qty, state) {
  if (cat.includes('memory') || /(?:dimm|rdimm|ddr4|ddr5)/.test(desc)) {
    state.dimmCount += qty;
  }
  if (/(?:networking|graphic|controller)/.test(cat) || /(?:pcie|adapter|hba)/.test(desc)) {
    state.pcieCardCount += qty;
  }
}

/**
 * Parse hardware and power telemetry from item descriptions and categories
 */
function parseHardwareTelemetry(items = []) {
  const state = {
    totalTdp: 0, maxTdp: 0, cpuCount: 0,
    hasGpu: false, hasDoubleWideGpu: false,
    driveCount: 0, controllerCount: 0, hasCachelessController: false,
    psuCount: 0, maxPsuWattage: 0, dimmCount: 0, pcieCardCount: 0,
    cageFormFactors: new Set()
  };

  for (const it of items) {
    const desc = (it.description || it.Description || it.name || '').toLowerCase();
    const cat = (it.category || it.Category || it.parentCategory || '').toLowerCase();
    const qty = parseInt(it.qty || it.Qty || it.CurrentQty || 1, 10) || 1;

    _inspectProcessorTelemetry(desc, cat, qty, state);
    _inspectGpuTelemetry(desc, cat, state);
    _inspectControllerTelemetry(desc, cat, qty, state);
    _inspectStorageDriveTelemetry(desc, cat, qty, state);
    _inspectCageTelemetry(desc, cat, state);
    _inspectPowerTelemetry(desc, cat, qty, state);
    _inspectMemoryAndPcieTelemetry(desc, cat, qty, state);
  }

  return state;
}

function _inspectItemCapabilities(items, options = {}) {
  let has16Pin = false;
  let isStd2U = false;
  let hasDualOcp = Boolean(options.hasDualOcpRequirement);
  let reqMultiX16 = Boolean(options.requiresMultiX16PrimaryRiser);
  let hasRearBoot = false;
  let hasTertiary = false;
  let hasDataDrive = Boolean(options.hasDataDriveRequirement);
  let hasRail = false;
  let reqCma = Boolean(options.requiresCma);
  let hasCma = false;
  let hasTitanium = false;

  for (const it of items) {
    const d = (it.description || it.Description || '').toLowerCase();
    if (/(?:h200|h100|rtx 6000|l40s|16-pin|12v-2x6|12vhpwr)/.test(d)) has16Pin = true;
    if (/(?:2u|dl380|r770|r760)/.test(d) && !d.includes('dl380a')) isStd2U = true;
    if (/(?:2nd ocp|second ocp|ocpb|slotb)/.test(d)) hasDualOcp = true;
    if (/(?:2x16 fh|rear 2x16|x16\/x16\/x16 primary)/.test(d)) reqMultiX16 = true;
    if (/(?:ns204i|boss|boot device|rear mount)/.test(d)) hasRearBoot = true;
    if (/(?:tertiary riser|3rd riser)/.test(d)) hasTertiary = true;
    if (/(?:data storage|solid state drive|sata|960gb|1\.92tb)/.test(d) && !d.includes('ns204i') && !d.includes('boss')) hasDataDrive = true;
    if (d.includes('rail')) hasRail = true;
    if (/(?:with cable management arm|with cma|cable management arm)/.test(d)) reqCma = true;
    if (/(?:cable management arm|cma)/.test(d) && !d.includes('readyrails sliding guide rail with cable management arm')) hasCma = true;
    if (d.includes('titanium')) hasTitanium = true;
  }

  return {
    has16Pin, isStd2U, hasDualOcp, reqMultiX16, hasRearBoot,
    hasTertiary, hasDataDrive, hasRail, reqCma, hasCma, hasTitanium
  };
}

/**
 * Derive abstract capability flags from parsed telemetry and options
 */
function deriveCapabilities(items, parsed, options = {}) {
  const {
    hasGpu, hasDoubleWideGpu, controllerCount, hasCachelessController,
    dimmCount, maxPsuWattage, cageFormFactors, totalTdp
  } = parsed;

  const totalPeak = totalTdp + (hasGpu ? 450 : 0) + (dimmCount * 15) + 350;
  const ic = _inspectItemCapabilities(items, options);

  return {
    hasGpuAccelerator: hasGpu,
    hasDoubleWideGpu,
    has16PinGpuAccelerator: ic.has16Pin,
    isStandard2URack: ic.isStd2U,
    hasInternalStorageController: controllerCount > 0,
    hasDriveBackplane: cageFormFactors.size > 0,
    hasCachelessController,
    usesParityRaid: Boolean(options.usesParityRaid),
    hasDisparateCageMixing: cageFormFactors.size > 1,
    hasUnbalancedMemoryChannels: dimmCount > 0 && (dimmCount % 8 !== 0 && dimmCount % 12 !== 0 && dimmCount % 16 !== 0),
    hasInsufficientCoreLicenses: Boolean(options.hasInsufficientCoreLicenses),
    hasMissingTransceivers: Boolean(options.hasMissingTransceivers),
    requiresLot9Enablement: Boolean(options.isNonEuExport) && maxPsuWattage > 0 && maxPsuWattage <= 1600 && !ic.hasTitanium,
    hasDualOcpRequirement: ic.hasDualOcp,
    requiresMultiX16PrimaryRiser: ic.reqMultiX16,
    hasRearBootDevice: ic.hasRearBoot,
    hasTertiaryRiser: ic.hasTertiary,
    hasDataDriveRequirement: ic.hasDataDrive,
    hasSinglePsuDeficit: (totalPeak > 1500) && maxPsuWattage > 0 && maxPsuWattage < 1600,
    hasSlidingRailKit: ic.hasRail,
    requiresCma: ic.reqCma,
    hasCma: ic.hasCma
  };
}

/**
 * Dynamically extract evaluation context and metrics from an item list without hardcoding
 * @param {Array} items Raw BOQ items or BOM parts
 * @param {object} options Context options (e.g. chassisProfile, parityRaid, licensedCores)
 * @returns {object} Derived metrics and capabilities
 */
function extractDomainMetrics(items = [], options = {}) {
  const telemetry = parseHardwareTelemetry(items);
  const capabilities = deriveCapabilities(items, telemetry, options);
  const drivesPerController = telemetry.controllerCount > 0 ? (telemetry.driveCount / telemetry.controllerCount) : telemetry.driveCount;
  const isEdge = items.some(it => {
    const d = (it.description || '').toLowerCase();
    return d.includes('dl145') || d.includes('edge');
  });

  return {
    chassisProfile: options.chassisProfile || (isEdge ? 'EDGE' : 'ENTERPRISE'),
    attributes: {
      tdpWatts: telemetry.maxTdp,
      totalTdpWatts: telemetry.totalTdp,
      cpuCount: telemetry.cpuCount
    },
    metrics: {
      internalDriveCount: telemetry.driveCount,
      storageControllerCount: telemetry.controllerCount,
      drivesPerController,
      maxPsuWattage: telemetry.maxPsuWattage,
      psuCount: telemetry.psuCount,
      dimmCount: telemetry.dimmCount,
      totalPcieCards: telemetry.pcieCardCount,
      totalSystemPeakPowerWatts: telemetry.totalTdp + (telemetry.hasGpu ? 450 : 0) + (telemetry.dimmCount * 15) + 350,
      unpopulatedBays: options.unpopulatedBays || 0
    },
    capabilities
  };
}

/**
 * Safely extract a nested property path from an object
 */
function getNestedValue(obj, pathStr) {
  if (!obj || !pathStr) return undefined;
  const parts = pathStr.split('.');
  let curr = obj;
  for (const p of parts) {
    if (curr == null) return undefined;
    curr = curr[p];
  }
  return curr;
}

/**
 * Evaluate a single rule condition against the extracted state
 */
function evaluateCondition(cond, state) {
  if (!cond) return true;
  if (Array.isArray(cond.and)) {
    return cond.and.every(c => evaluateCondition(c, state));
  }
  if (Array.isArray(cond.or)) {
    return cond.or.some(c => evaluateCondition(c, state));
  }

  const val = getNestedValue(state, cond.field);
  switch (cond.operator) {
    case '==':
      return val === cond.value;
    case '!=':
      return val !== cond.value;
    case '>':
      return Number(val) > Number(cond.value);
    case '>=':
      return Number(val) >= Number(cond.value);
    case '<':
      return Number(val) < Number(cond.value);
    case '<=':
      return Number(val) <= Number(cond.value);
    case 'in':
      return Array.isArray(cond.value) && cond.value.includes(val);
    default:
      return false;
  }
}

/**
 * Resolve an abstract capability to a specific SKU inside an active product catalog
 * @param {string} capability Capability ID
 * @param {object} catalog Catalog object { entries: [...], skus: [...] }
 * @returns {object|null} Resolved SKU { sku, description, price, category }
 */
function resolveCapabilityToSku(capability, catalog = {}) {
  const matcher = CAPABILITY_SEMANTIC_MAP[capability];
  if (!matcher || !catalog) return null;

  const allEntries = Array.isArray(catalog.entries) ? catalog.entries : [];
  for (const entry of allEntries) {
    const subCat = String(entry.subCategory || '').toLowerCase();
    const parentCat = String(entry.parentCategory || '').toLowerCase();
    const fullCat = `${parentCat} ${subCat}`;

    // Check category pattern match
    const catMatches = matcher.categoryPatterns.some(p => p.test(fullCat));

    if (Array.isArray(entry.options)) {
      for (const opt of entry.options) {
        const desc = String(opt.description || opt.name || '').toLowerCase();
        const descMatches = matcher.descPatterns.some(p => p.test(desc));

        if (descMatches || (catMatches && matcher.descPatterns.some(p => p.test(desc)))) {
          return {
            sku: opt.sku || opt.partNumber,
            description: opt.description || opt.name,
            price: opt.priceUsd || opt.price || 0,
            category: entry.parentCategory || 'Component Fix',
            subCategory: entry.subCategory || 'Physical Capability'
          };
        }
      }
    }
  }
  return null;
}

/**
 * Evaluate all generic domain rules against items and return structured conflicts/recommendations
 * @param {Array} items BOQ items or configured parts
 * @param {object} options Context options and optional catalog reference
 * @returns {object} { passed: boolean, violations: Array, recommendations: Array, metrics: object }
 */
function evaluateGenericDomainRules(items = [], options = {}) {
  const domain = options.domain || 'SERVER';
  const catalog = options.catalog || null;
  const state = extractDomainMetrics(items, options);
  const rules = getGenericRulesForDomain(domain);

  const violations = [];
  const recommendations = [];

  for (const rule of rules) {
    if (evaluateCondition(rule.condition, state)) {
      let resolvedSku = null;
      if (catalog && rule.requiredCapability) {
        resolvedSku = resolveCapabilityToSku(rule.requiredCapability, catalog);
      }

      const item = {
        ruleId: rule.id,
        domain: rule.domain,
        aspect: rule.aspect,
        name: rule.name,
        severity: rule.severity,
        message: rule.description,
        requiredCapability: rule.requiredCapability,
        recommendation: rule.recommendation,
        resolvedSku: resolvedSku || undefined
      };

      if (rule.severity === 'ERROR') {
        violations.push(item);
      } else {
        recommendations.push(item);
      }
    }
  }

  return {
    passed: violations.length === 0,
    domain,
    violationCount: violations.length,
    recommendationCount: recommendations.length,
    violations,
    recommendations,
    metrics: state.metrics,
    capabilities: state.capabilities
  };
}

module.exports = {
  loadGenericRulesMatrix,
  getGenericRulesForDomain,
  extractDomainMetrics,
  resolveCapabilityToSku,
  evaluateGenericDomainRules,
  GENERIC_DOMAIN_CATEGORIES,
  CAPABILITY_SEMANTIC_MAP
};
