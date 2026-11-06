'use strict';
/**
 * scripts/lib/catalog_rules.js — Multi-Level Catalog Rules Parser & Dual Safety Net Loader
 *
 * Implements rule parsing and extraction across 5 explicit hierarchy levels:
 * 1. VENDOR      — Portal-wide rules, BTO vs CTO exclusions, customer account restrictions
 * 2. CHASSIS     — Form-factor constraints (SFF, LFF, EDSFF, Rack), thermal/ambient caps
 * 3. CATEGORY    — Category-wide mixing & mutual exclusion rules (Memory x4/x8, PSU AC/DC)
 * 4. SUBCATEGORY — Quantity constraints (max N, required), slot caps
 * 5. SKU         — Direct SKU-to-SKU dependencies and pairing requirements
 *
 * Dual Safety Net:
 * Loads `<prefix>_Catalog_Rules.json` first; if missing, falls back seamlessly to `<prefix>_Catalog.json`.
 */

const fs = require('fs');
const path = require('path');

let cachedChassisMap = null;
function getChassisMap() {
  if (!cachedChassisMap) {
    try {
      const chassisMapPath = path.resolve(__dirname, '../../config/chassis_map.json');
      if (fs.existsSync(chassisMapPath)) {
        cachedChassisMap = JSON.parse(fs.readFileSync(chassisMapPath, 'utf8'));
      }
    } catch {
      cachedChassisMap = {};
    }
  }
  return cachedChassisMap || {};
}

/**
 * Standard default SKU mappings for mandatory physical dependencies
 */
const DEFAULT_MANDATORY_SKUS = {
  HIGH_PERF_FAN_KIT: { sku: 'P48820-B21', name: 'HPE ProLiant High Performance Fan Kit' },
  HIGH_PERF_HEATSINK: { sku: 'P74792-B21', name: 'HPE ProLiant Performance Heat Sink Kit' },
  NO_DRIVE_FIO_KIT: { sku: '873763-B21', name: 'HPE ProLiant Compute No Drive Configuration FIO Kit' },
  DC_LUG_KIT: { sku: 'P36877-B21', name: 'HPE 1600W -48VDC Power Cable Lug Kit' },
  SMART_STORAGE_BATTERY: { sku: 'P01366-B21', name: 'HPE 96W Smart Storage Battery' },
  CONTROLLER_CABLE_KIT: { sku: 'P48918-B21', name: 'HPE Storage Controller Cable Kit' },
  TRI_MODE_SPLITTER_CABLE: { sku: 'P48832-B21', name: 'HPE ProLiant Tri-Mode Splitter Cable Kit' },
  TRI_MODE_BOX12_CABLE: { sku: 'P76453-B21', name: 'HPE ProLiant Compute UMB PCIe Box 1/2 Cable Kit' },
  PRIMARY_CABLE_KIT: { sku: 'P56073-B21', name: 'HPE ProLiant DL380 Primary Cable Kit' },
  SECONDARY_CABLE_KIT: { sku: 'P56074-B21', name: 'HPE ProLiant DL380 Secondary Cable Kit' },
  GPU_POWER_CABLE_KIT: { sku: 'P48816-B21', name: 'HPE ProLiant GPU Auxiliary Power Cable Kit' },
  CE_REMOVAL_KIT: { sku: 'P35876-B21', name: 'HPE CE Mark Removal FIO Enablement Kit' },
  BOOT_DEVICE_ENABLEMENT: { sku: 'P54442-B21', name: 'HPE ProLiant DL380 Gen11 NS204i-u Boot Device Enablement Kit' },
  SAS_EXPANDER: { sku: 'P48835-B21', name: 'HPE ProLiant 24G SAS Expander Card with Cables' },
  TRI_MODE_SWITCH: { sku: 'P55806-B21', name: 'HPE ProLiant Tri-Mode Switch Card' },
  GENERIC_CAGE: { sku: 'P48813-B21', name: 'HPE ProLiant DL380 Gen11 8SFF Drive Cage Kit' },
  PREMIUM_CAGE: { sku: 'P48814-B21', name: 'HPE ProLiant DL380 Gen11 Premium 8SFF U.3 Drive Cage Kit' },
  CPU1_OCP_CABLE: { sku: 'P51911-B21', name: 'HPE ProLiant DL380 Gen11 CPU1 to OCP2 x8 Enablement Kit' },
  CPU2_OCP_CABLE: { sku: 'P48830-B21', name: 'HPE ProLiant DL380 Gen11 CPU2 to OCP2 x8 Enablement Kit' }
};

const MANDATORY_SKU_PROP_MAPPINGS = [
  ['HIGH_PERF_FAN_KIT', 'highPerfFanKit'],
  ['HIGH_PERF_HEATSINK', 'highPerfHeatsink'],
  ['NO_DRIVE_FIO_KIT', 'noDriveFioKit'],
  ['DC_LUG_KIT', 'dcLugKit'],
  ['SMART_STORAGE_BATTERY', 'smartStorageBattery'],
  ['CONTROLLER_CABLE_KIT', 'controllerCableKit'],
  ['TRI_MODE_SPLITTER_CABLE', 'triModeSplitterCable'],
  ['TRI_MODE_BOX12_CABLE', 'triModeBox12Cable'],
  ['PRIMARY_CABLE_KIT', 'primaryRiserCableKit'],
  ['SECONDARY_CABLE_KIT', 'secondaryRiserCableKit'],
  ['GPU_POWER_CABLE_KIT', 'gpuPowerCableKit'],
  ['CE_REMOVAL_KIT', 'ceRemovalKit'],
  ['BOOT_DEVICE_ENABLEMENT', 'bootDeviceEnablement'],
  ['SAS_EXPANDER', 'sasExpander'],
  ['TRI_MODE_SWITCH', 'triModeSwitch'],
  ['GENERIC_CAGE', 'genericCage'],
  ['PREMIUM_CAGE', 'premiumCage'],
  ['CPU1_OCP_CABLE', 'cpu1OcpCable'],
  ['CPU2_OCP_CABLE', 'cpu2OcpCable']
];

function _resolveKitKeyFromMatchers(matchers, familyNorm, modelNorm, genNorm, normalizeStr) {
  for (const m of matchers) {
    const fMatch = !m.familyPattern || m.familyPattern === '*' || familyNorm.includes(normalizeStr(m.familyPattern));
    const gMatch = !m.genPattern || m.genPattern === '*' || genNorm.includes(normalizeStr(m.genPattern));
    const mMatch = !m.modelPattern || m.modelPattern === '*' || modelNorm.includes(normalizeStr(m.modelPattern));
    if (fMatch && gMatch && mMatch) {
      return m.kitKey;
    }
  }
  return 'DEFAULT';
}

function _resolveKitKeyLegacy(familyNorm, modelNorm, genNorm) {
  if (familyNorm.includes('alletra')) return 'Alletra_Storage';
  if (modelNorm.includes('dl380a')) return 'ProLiant_DL380a_Gen12';
  if (modelNorm.includes('dl145')) return 'ProLiant_DL145_Gen11';
  if (modelNorm.includes('dl360')) return 'ProLiant_DL360_Gen11';
  if (familyNorm.includes('synergy')) return genNorm.includes('12') ? 'Synergy_Gen12' : 'Synergy_General';
  if (familyNorm.includes('storeever') || modelNorm.includes('msl')) return 'StoreEver_Tape';
  if (familyNorm.includes('cray')) return 'Cray_General';
  if (modelNorm.includes('dl580')) return 'ProLiant_DL580_Gen12';
  if (genNorm.includes('12')) return 'ProLiant_Gen12';
  if (genNorm.includes('11')) return 'ProLiant_Gen11';
  return 'DEFAULT';
}

function _buildMandatorySkusResult(selectedKit) {
  const result = {};
  for (const [resKey, kitProp] of MANDATORY_SKU_PROP_MAPPINGS) {
    result[resKey] = selectedKit[kitProp] || DEFAULT_MANDATORY_SKUS[resKey];
  }
  return result;
}

/**
 * Dynamically resolve mandatory SKUs for a given chassis from chassis_map.json enablement_kits
 * @param {object} chassisInfo 
 * @returns {object} Mandatory SKUs mapping
 */
function getMandatorySkusForChassis(chassisInfo) {
  const cmap = getChassisMap();
  const kits = cmap.enablement_kits || {};
  const family = (chassisInfo?.family || '').toLowerCase();
  const model = (chassisInfo?.model || '').toLowerCase();
  const gen = (chassisInfo?.gen || '').toLowerCase();

  const normalizeStr = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const familyNorm = normalizeStr(family);
  const modelNorm = normalizeStr(model);
  const genNorm = normalizeStr(gen);

  const matchers = cmap.kit_routing?.matchers || [];
  let kitKey = _resolveKitKeyFromMatchers(matchers, familyNorm, modelNorm, genNorm, normalizeStr);

  // Legacy fallback if kit_routing matchers not present
  if (kitKey === 'DEFAULT' && matchers.length === 0) {
    kitKey = _resolveKitKeyLegacy(familyNorm, modelNorm, genNorm);
  }

  const selectedKit = kits[kitKey] || kits.DEFAULT || {};
  return _buildMandatorySkusResult(selectedKit);
}

function _checkAmbientGateRule(lower, text, parentCategory, subCategory) {
  const ambientMatch = lower.match(/ambient\s*(?:temperature)?\s*(?:of|at|below|<=|≤|<|max)?\s*(\d+)\s*°?\s*c/i)
    || lower.match(/(\d+)\s*°?\s*c\s*(?:ambient|temperature|datacenter)/i);
  if (!ambientMatch && (!lower.includes('ambient temperature') || !lower.match(/(\d+)/))) {
    return null;
  }
  const thresholdMatch = text.match(/(\d+)/);
  const threshold = thresholdMatch ? parseInt(thresholdMatch[1], 10) : null;
  const operator = lower.includes('below') || lower.includes('<=') || lower.includes('≤') || lower.includes('<') || lower.includes('up to') ? 'lte' : 'gte';
  return {
    level: 'CHASSIS',
    ruleType: 'CONDITIONAL_VISIBILITY',
    conditionType: 'AMBIENT_GATE',
    conditionKey: 'ambientTempC',
    conditionOperator: operator,
    thresholdValue: threshold,
    parentCategory,
    subCategory,
    ruleText: text,
    isStrict: true,
    portalVerificationRequired: true,
    affectedSkus: []
  };
}

function _checkTdpGateRule(lower, text, parentCategory, subCategory) {
  const isTdp = lower.match(/tdp\s*(?:above|>=|>|over|exceeds)?\s*\d+\s*w/i) || (lower.includes('tdp') && lower.includes('watt'));
  if (!isTdp) {
    return null;
  }
  const tdpMatch = text.match(/(\d+)\s*(?:W|watt)/i);
  return {
    level: 'CHASSIS',
    ruleType: 'CONDITIONAL_VISIBILITY',
    conditionType: 'TDP_GATE',
    conditionKey: 'cpuTdpWatts',
    conditionOperator: 'gte',
    thresholdValue: tdpMatch ? parseInt(tdpMatch[1], 10) : null,
    parentCategory,
    subCategory,
    ruleText: text,
    isStrict: true,
    portalVerificationRequired: true,
    affectedSkus: []
  };
}

function _classifyStandardRuleLevel(lower, parentCategory, subCategory) {
  if (lower.includes('bto') || lower.includes('cto base') || lower.includes('customer account') || lower.includes('supply constraints')) {
    return {
      level: 'VENDOR',
      ruleType: lower.includes('supply') ? 'SUPPLY_CONSTRAINT' : 'MODE_EXCLUSION'
    };
  }
  if (lower.includes('edsff') || lower.includes('8lff') || lower.includes('12lff') || lower.includes('8sff') || lower.includes('rack') || lower.includes('ambient temperature')) {
    return { level: 'CHASSIS', ruleType: 'CHASSIS_GATE' };
  }
  if (lower.includes('mixing') || lower.includes('cannot be selected together') || lower.includes('mixed with')) {
    return { level: 'CATEGORY', ruleType: 'MUTUAL_EXCLUSION' };
  }
  if (lower.includes('requires') || lower.includes('needed if') || lower.includes('supported only with')) {
    return { level: 'SKU', ruleType: 'DEPENDENCY_CHAIN' };
  }
  if (parentCategory || subCategory) {
    return { level: 'SUBCATEGORY', ruleType: 'SUBCATEGORY_RULE' };
  }
  return { level: 'CATEGORY', ruleType: 'MUTUAL_EXCLUSION' };
}

/**
 * Classify a raw rule text into one of the 5 hierarchy levels and assign action type.
 * @param {string} ruleText 
 * @param {string} parentCategory 
 * @param {string} subCategory 
 * @returns {object} Rule structure
 */
function classifyRule(ruleText, parentCategory = '', subCategory = '') {
  const text = String(ruleText || '').trim();
  const lower = text.toLowerCase();

  const ambientRule = _checkAmbientGateRule(lower, text, parentCategory, subCategory);
  if (ambientRule) return ambientRule;

  const tdpRule = _checkTdpGateRule(lower, text, parentCategory, subCategory);
  if (tdpRule) return tdpRule;

  const { level, ruleType } = _classifyStandardRuleLevel(lower, parentCategory, subCategory);
  return {
    level,
    ruleType,
    parentCategory,
    subCategory,
    ruleText: text,
    isStrict: !lower.includes('recommended')
  };
}

function _resolveRulesDirectory(targetDir) {
  let resolvedDir = '';
  if (typeof targetDir === 'string') {
    resolvedDir = targetDir;
  } else if (targetDir && typeof targetDir === 'object') {
    resolvedDir = targetDir.targetDir || targetDir.chassisDir || targetDir.chassis || '';
  }

  if (!resolvedDir) return null;
  if (!fs.existsSync(resolvedDir)) {
    try {
      const { findCatalogDirectory } = require('./catalog_discovery.js');
      const found = findCatalogDirectory(resolvedDir);
      return found || null;
    } catch (_) {
      return null;
    }
  }
  return resolvedDir;
}

function _readJsonFileSafe(filePath, logContext = 'CATALOG_RULES') {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    const _logger = require('../system/pipeline_logger.js');
    _logger.warn(logContext, `Failed to parse ${filePath}`, err);
    return null;
  }
}

function _loadRulesRawData(resolvedDir) {
  const prefix = path.basename(resolvedDir);
  const rulesJsonPath = path.join(resolvedDir, `${prefix}_Catalog_Rules.json`);
  const rulesBakPath = path.join(resolvedDir, `${prefix}_Catalog_Rules.json.bak`);
  const catalogJsonPath = path.join(resolvedDir, `${prefix}_Catalog.json`);

  let rawData = _readJsonFileSafe(rulesJsonPath);
  let sourceFile = rawData ? rulesJsonPath : '';
  let isFallback = false;

  if (!rawData) {
    rawData = _readJsonFileSafe(rulesBakPath);
    if (rawData) {
      sourceFile = rulesBakPath;
      isFallback = true;
    }
  }

  if (!rawData) {
    rawData = _readJsonFileSafe(catalogJsonPath);
    if (rawData) {
      sourceFile = catalogJsonPath;
      isFallback = true;
    }
  }

  return { rawData, sourceFile, isFallback, catalogJsonPath };
}

function _parseRawRules(rawData) {
  const parsedRules = [];
  if (Array.isArray(rawData)) {
    rawData.forEach(r => {
      if (r && typeof r === 'object') {
        parsedRules.push(r.level ? r : classifyRule(r.rule || r.ruleText || String(r), r.parentCategory, r.subCategory));
      }
    });
  } else if (Array.isArray(rawData.rules)) {
    rawData.rules.forEach(r => {
      parsedRules.push(r.ruleType === 'CONDITIONAL_VISIBILITY'
        ? { ...r, ruleText: r.ruleText || r.rule }
        : classifyRule(r.rule || r.ruleText, r.parentCategory, r.subCategory));
    });
  } else if (Array.isArray(rawData.entries)) {
    rawData.entries.forEach(e => {
      (e.rules || []).forEach(r => {
        parsedRules.push(classifyRule(r, e.parentCategory, e.subCategory));
      });
    });
  }
  return parsedRules;
}

function _extractCompanionCatalogSkuConstraints(catalogJsonPath) {
  const constraints = [];
  const companionCatalog = _readJsonFileSafe(catalogJsonPath);
  if (!companionCatalog || !Array.isArray(companionCatalog.entries)) {
    return { constraints, companionCatalog };
  }

  companionCatalog.entries.forEach(e => {
    (e.skus || []).forEach(sku => {
      const pn = sku['Product #'] || sku.sku;
      const desc = sku['Description'] || sku.description || '';
      const constraint = sku['Constraint Text'] || sku.constraint || '';
      if (pn && constraint && constraint !== 'no max' && constraint !== 'Unlimited') {
        constraints.push({
          level: 'SKU',
          ruleType: 'QUANTITY_CONSTRAINT',
          parentCategory: e.parentCategory,
          subCategory: e.subCategory,
          ruleText: `SKU ${pn} (${desc.substring(0, 60)}${desc.length > 60 ? '...' : ''}) is limited to ${constraint}.`,
          isStrict: true
        });
      }
    });
  });

  return { constraints, companionCatalog };
}

/**
 * Load and parse all rules for a chassis directory using Dual Safety Net.
 * @param {string} targetDir E.g. "outputs/ProLiant/Gen12/DL380_Gen12_SFF"
 * @returns {object} { metadata, parsedRules: Array, subcategoryConstraints: Array, sourceFile, isFallback }
 */
function loadCatalogRules(targetDir) {
  const resolvedDir = _resolveRulesDirectory(targetDir);
  if (!resolvedDir) {
    return {
      metadata: {},
      parsedRules: [],
      subcategoryConstraints: [],
      sourceFile: 'NONE',
      isFallback: false
    };
  }

  const { rawData, sourceFile, isFallback, catalogJsonPath } = _loadRulesRawData(resolvedDir);
  if (!rawData) {
    return {
      metadata: {},
      parsedRules: [],
      subcategoryConstraints: [],
      sourceFile: 'NONE',
      isFallback: false
    };
  }

  const parsedRules = _parseRawRules(rawData);
  const { constraints: skuConstraints, companionCatalog } = _extractCompanionCatalogSkuConstraints(catalogJsonPath);
  parsedRules.push(...skuConstraints);

  const subcategoryConstraints = (rawData.subcategories || []).map(sc => ({
    parentCategory: sc.parentCategory,
    subCategory: sc.name,
    constraint: sc.constraint,
    maxQty: sc.maxQty,
    level: 'SUBCATEGORY'
  }));

  const entries = Array.isArray(rawData.entries)
    ? rawData.entries
    : (companionCatalog && Array.isArray(companionCatalog.entries) ? companionCatalog.entries : []);

  return {
    metadata: rawData.metadata || (companionCatalog ? companionCatalog.metadata : {}),
    parsedRules,
    subcategoryConstraints,
    entries,
    sourceFile,
    isFallback
  };
}

module.exports = {
  DEFAULT_MANDATORY_SKUS,
  getMandatorySkusForChassis,
  classifyRule,
  loadCatalogRules
};
