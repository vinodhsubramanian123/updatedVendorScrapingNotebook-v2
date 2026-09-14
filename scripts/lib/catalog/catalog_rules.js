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
  const isGen12 = gen.includes('12') || model.includes('gen12');

  let kitKey = 'DEFAULT';
  if (family.includes('alletra')) {
    kitKey = 'Alletra_Storage';
  } else if (model.includes('dl380a')) {
    kitKey = 'ProLiant_DL380a_Gen12';
  } else if (model.includes('dl145')) {
    kitKey = 'ProLiant_DL145_Gen11';
  } else if (model.includes('dl360')) {
    kitKey = 'ProLiant_DL360_Gen11';
  } else if (family.includes('synergy')) {
    kitKey = isGen12 ? 'Synergy_Gen12' : 'Synergy_General';
  } else if (family.includes('storeever') || model.includes('msl')) {
    kitKey = 'StoreEver_Tape';
  } else if (family.includes('cray')) {
    kitKey = 'Cray_General';
  } else if (model.includes('dl580')) {
    kitKey = 'ProLiant_DL580_Gen12';
  } else if (isGen12) {
    kitKey = 'ProLiant_Gen12';
  } else if (gen.includes('11') || model.includes('gen11')) {
    kitKey = 'ProLiant_Gen11';
  }

  const selectedKit = kits[kitKey] || kits.DEFAULT || {};

  return {
    HIGH_PERF_FAN_KIT: selectedKit.highPerfFanKit || DEFAULT_MANDATORY_SKUS.HIGH_PERF_FAN_KIT,
    HIGH_PERF_HEATSINK: selectedKit.highPerfHeatsink || DEFAULT_MANDATORY_SKUS.HIGH_PERF_HEATSINK,
    NO_DRIVE_FIO_KIT: selectedKit.noDriveFioKit || DEFAULT_MANDATORY_SKUS.NO_DRIVE_FIO_KIT,
    DC_LUG_KIT: selectedKit.dcLugKit || DEFAULT_MANDATORY_SKUS.DC_LUG_KIT,
    SMART_STORAGE_BATTERY: selectedKit.smartStorageBattery || DEFAULT_MANDATORY_SKUS.SMART_STORAGE_BATTERY,
    CONTROLLER_CABLE_KIT: selectedKit.controllerCableKit || DEFAULT_MANDATORY_SKUS.CONTROLLER_CABLE_KIT,
    TRI_MODE_SPLITTER_CABLE: selectedKit.triModeSplitterCable || DEFAULT_MANDATORY_SKUS.TRI_MODE_SPLITTER_CABLE,
    TRI_MODE_BOX12_CABLE: selectedKit.triModeBox12Cable || DEFAULT_MANDATORY_SKUS.TRI_MODE_BOX12_CABLE,
    PRIMARY_CABLE_KIT: selectedKit.primaryRiserCableKit || DEFAULT_MANDATORY_SKUS.PRIMARY_CABLE_KIT,
    SECONDARY_CABLE_KIT: selectedKit.secondaryRiserCableKit || DEFAULT_MANDATORY_SKUS.SECONDARY_CABLE_KIT,
    GPU_POWER_CABLE_KIT: selectedKit.gpuPowerCableKit || DEFAULT_MANDATORY_SKUS.GPU_POWER_CABLE_KIT,
    CE_REMOVAL_KIT: selectedKit.ceRemovalKit || DEFAULT_MANDATORY_SKUS.CE_REMOVAL_KIT,
    BOOT_DEVICE_ENABLEMENT: selectedKit.bootDeviceEnablement || DEFAULT_MANDATORY_SKUS.BOOT_DEVICE_ENABLEMENT,
    SAS_EXPANDER: selectedKit.sasExpander || DEFAULT_MANDATORY_SKUS.SAS_EXPANDER,
    TRI_MODE_SWITCH: selectedKit.triModeSwitch || DEFAULT_MANDATORY_SKUS.TRI_MODE_SWITCH,
    GENERIC_CAGE: selectedKit.genericCage || DEFAULT_MANDATORY_SKUS.GENERIC_CAGE,
    PREMIUM_CAGE: selectedKit.premiumCage || DEFAULT_MANDATORY_SKUS.PREMIUM_CAGE,
    CPU1_OCP_CABLE: selectedKit.cpu1OcpCable || DEFAULT_MANDATORY_SKUS.CPU1_OCP_CABLE,
    CPU2_OCP_CABLE: selectedKit.cpu2OcpCable || DEFAULT_MANDATORY_SKUS.CPU2_OCP_CABLE
  };
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

  let level = 'CATEGORY';
  let ruleType = 'MUTUAL_EXCLUSION';

  // Level classification
  if (lower.includes('bto') || lower.includes('cto base') || lower.includes('customer account') || lower.includes('supply constraints')) {
    level = 'VENDOR';
    ruleType = lower.includes('supply') ? 'SUPPLY_CONSTRAINT' : 'MODE_EXCLUSION';
  } else if (lower.includes('edsff') || lower.includes('8lff') || lower.includes('12lff') || lower.includes('8sff') || lower.includes('rack') || lower.includes('ambient temperature')) {
    level = 'CHASSIS';
    ruleType = 'CHASSIS_GATE';
  } else if (lower.includes('mixing') || lower.includes('cannot be selected together') || lower.includes('mixed with')) {
    level = 'CATEGORY';
    ruleType = 'MUTUAL_EXCLUSION';
  } else if (lower.includes('requires') || lower.includes('needed if') || lower.includes('supported only with')) {
    level = 'SKU';
    ruleType = 'DEPENDENCY_CHAIN';
  } else if (parentCategory || subCategory) {
    level = 'SUBCATEGORY';
    ruleType = 'SUBCATEGORY_RULE';
  }

  return {
    level,
    ruleType,
    parentCategory,
    subCategory,
    ruleText: text,
    isStrict: !lower.includes('recommended')
  };
}

/**
 * Load and parse all rules for a chassis directory using Dual Safety Net.
 * @param {string} targetDir E.g. "outputs/ProLiant/Gen12/DL380_Gen12_SFF"
 * @returns {object} { metadata, parsedRules: Array, subcategoryConstraints: Array, sourceFile, isFallback }
 */
function loadCatalogRules(targetDir) {
  let resolvedDir = '';
  if (typeof targetDir === 'string') {
    resolvedDir = targetDir;
  } else if (targetDir && typeof targetDir === 'object') {
    resolvedDir = targetDir.targetDir || targetDir.chassisDir || targetDir.chassis || '';
  }

  if (!resolvedDir) {
    return {
      metadata: {},
      parsedRules: [],
      subcategoryConstraints: [],
      sourceFile: 'NONE',
      isFallback: false
    };
  } else if (!fs.existsSync(resolvedDir)) {
    // If it's a model name or chassis ID like 'DL380_Gen11' or 'DL380_Gen12_SFF'
    try {
      const { findCatalogDirectory } = require('./catalog_discovery.js');
      const found = findCatalogDirectory(resolvedDir);
      if (found) resolvedDir = found;
      else {
        return {
          metadata: {},
          parsedRules: [],
          subcategoryConstraints: [],
          sourceFile: 'NONE',
          isFallback: false
        };
      }
    } catch (_) {
      return {
        metadata: {},
        parsedRules: [],
        subcategoryConstraints: [],
        sourceFile: 'NONE',
        isFallback: false
      };
    }
  }

  const prefix = path.basename(resolvedDir);
  const rulesJsonPath = path.join(resolvedDir, `${prefix}_Catalog_Rules.json`);
  const rulesBakPath = path.join(resolvedDir, `${prefix}_Catalog_Rules.json.bak`);
  const catalogJsonPath = path.join(resolvedDir, `${prefix}_Catalog.json`);
  const fixtureRulesPath = path.join(__dirname, '..', '..', 'tests', 'fixtures', 'sample_Catalog_Rules.json');

  let rawData = null;
  let sourceFile = '';
  let isFallback = false;

  if (fs.existsSync(rulesJsonPath)) {
    try {
      rawData = JSON.parse(fs.readFileSync(rulesJsonPath, 'utf-8'));
      sourceFile = rulesJsonPath;
    } catch (err) {
      const _logger = require('../system/pipeline_logger.js');
      _logger.warn('CATALOG_RULES', `Failed to parse ${rulesJsonPath}`, err);
    }
  }

  if (!rawData && fs.existsSync(rulesBakPath)) {
    try {
      rawData = JSON.parse(fs.readFileSync(rulesBakPath, 'utf-8'));
      sourceFile = rulesBakPath;
      isFallback = true;
    } catch (err) {
      const _logger = require('../system/pipeline_logger.js');
      _logger.warn('CATALOG_RULES', `Failed to parse ${rulesBakPath}`, err);
    }
  }

  if (!rawData && fs.existsSync(catalogJsonPath)) {
    try {
      rawData = JSON.parse(fs.readFileSync(catalogJsonPath, 'utf-8'));
      sourceFile = catalogJsonPath;
      isFallback = true;
    } catch (err) {
      const _logger = require('../system/pipeline_logger.js');
      _logger.warn('CATALOG_RULES', `Failed to parse ${catalogJsonPath}`, err);
    }
  }

  if (!rawData) {
    return {
      metadata: {},
      parsedRules: [],
      subcategoryConstraints: [],
      sourceFile: 'NONE',
      isFallback: false
    };
  }

  let parsedRules = [];

  // Extract from rules array if standalone Rules JSON
  if (Array.isArray(rawData)) {
    rawData.forEach(r => {
      if (r && typeof r === 'object') {
        parsedRules.push(r.level ? r : classifyRule(r.rule || r.ruleText || String(r), r.parentCategory, r.subCategory));
      }
    });
  } else if (Array.isArray(rawData.rules)) {
    rawData.rules.forEach(r => {
      parsedRules.push(classifyRule(r.rule || r.ruleText, r.parentCategory, r.subCategory));
    });
  } else if (Array.isArray(rawData.entries)) {
    // Extract from entries array if catalog JSON
    rawData.entries.forEach(e => {
      (e.rules || []).forEach(r => {
        parsedRules.push(classifyRule(r, e.parentCategory, e.subCategory));
      });
    });
  }

  // Dual-Safety Net extension: Extract individual SKU quantity constraints as SKU-level rules
  let companionCatalog = null;
  if (fs.existsSync(catalogJsonPath)) {
    try {
      companionCatalog = JSON.parse(fs.readFileSync(catalogJsonPath, 'utf-8'));
      if (companionCatalog && Array.isArray(companionCatalog.entries)) {
        companionCatalog.entries.forEach(e => {
          (e.skus || []).forEach(sku => {
            const pn = sku['Product #'] || sku.sku;
            const desc = sku['Description'] || sku.description || '';
            const constraint = sku['Constraint Text'] || sku.constraint || '';
            if (pn && constraint && constraint !== 'no max' && constraint !== 'Unlimited') {
              parsedRules.push({
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
      }
    } catch (_) {}
  }

  const subcategoryConstraints = (rawData.subcategories || []).map(sc => ({
    parentCategory: sc.parentCategory,
    subCategory: sc.name,
    constraint: sc.constraint,
    maxQty: sc.maxQty,
    level: 'SUBCATEGORY'
  }));

  const entries = Array.isArray(rawData.entries) ? rawData.entries : (companionCatalog && Array.isArray(companionCatalog.entries) ? companionCatalog.entries : []);

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
