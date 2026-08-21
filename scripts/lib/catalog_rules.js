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
  TRI_MODE_BOX12_CABLE: { sku: 'P76453-B21', name: 'HPE ProLiant Compute UMB PCIe Box 1/2 Cable Kit' }
};

/**
 * Dynamically resolve mandatory SKUs for a given chassis or fallback to default mappings
 * @param {object} chassisInfo 
 * @returns {object} Mandatory SKUs mapping
 */
function getMandatorySkusForChassis(chassisInfo) {
  const skus = { ...DEFAULT_MANDATORY_SKUS };
  const family = (chassisInfo?.family || '').toLowerCase();
  const model = (chassisInfo?.model || '').toLowerCase();

  if (family.includes('alletra')) {
    skus.NO_DRIVE_FIO_KIT = { sku: 'R0Q21A', name: 'HPE Alletra Storage Drive Blank Kit' };
  } else if (model.includes('dl360')) {
    skus.HIGH_PERF_FAN_KIT = { sku: 'P48821-B21', name: 'HPE ProLiant DL360 High Performance Fan Kit' };
    skus.HIGH_PERF_HEATSINK = { sku: 'P48822-B21', name: 'HPE ProLiant DL360 Performance Heat Sink Kit' };
  }
  return skus;
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
    resolvedDir = path.join(__dirname, '..', '..', 'outputs', 'ProLiant', 'Gen12', 'DL380_Gen12_SFF');
  } else if (!fs.existsSync(resolvedDir)) {
    // If it's a model name like 'DL380_Gen12_SFF'
    try {
      const { findCatalogDirectory } = require('./catalog_discovery.js');
      const found = findCatalogDirectory(resolvedDir);
      if (found) resolvedDir = found;
    } catch (_) {}
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
      const _logger = require('./pipeline_logger.js');
      _logger.warn('CATALOG_RULES', `Failed to parse ${rulesJsonPath}`, err);
    }
  }

  if (!rawData && fs.existsSync(rulesBakPath)) {
    try {
      rawData = JSON.parse(fs.readFileSync(rulesBakPath, 'utf-8'));
      sourceFile = rulesBakPath;
      isFallback = true;
    } catch (err) {
      const _logger = require('./pipeline_logger.js');
      _logger.warn('CATALOG_RULES', `Failed to parse ${rulesBakPath}`, err);
    }
  }

  if (!rawData && fs.existsSync(catalogJsonPath)) {
    try {
      rawData = JSON.parse(fs.readFileSync(catalogJsonPath, 'utf-8'));
      sourceFile = catalogJsonPath;
      isFallback = true;
    } catch (err) {
      const _logger = require('./pipeline_logger.js');
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
  if (fs.existsSync(catalogJsonPath)) {
    try {
      const companionCatalog = JSON.parse(fs.readFileSync(catalogJsonPath, 'utf-8'));
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

  return {
    metadata: rawData.metadata || {},
    parsedRules,
    subcategoryConstraints,
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
