'use strict';
/**
 * build_catalog.js — Classification Engine for HPE OCA Catalog Scrapes
 * Usage: node scripts/build_catalog.js <raw_input.json> <catalog_output.json> [--verbose]
 *
 * Parses raw CDP scrape output (oca_raw_data_full.json) into structured,
 * classified catalog JSON + TSV intermediates for Excel & Notebook LM.
 */

const fs   = require('fs');
const path = require('path');
const { processCatalogDiff } = require('../lib/catalog/diff_catalog.js');
const { safeWriteJsonAtomic } = require('../lib/system/fs_compat.js');
const { computeIncrementalDifferential, assertDiffAnomalyBounds } = require('../lib/catalog/checksum_diff.js');
const { recordVersionSnapshot } = require('../lib/catalog/sku_versioning.js');
const { cleanBaseSKU, classifyOptionType, isServiceSku, isValidHpeSKU } = require('../lib/catalog/sku.js');
const { generateMainSheet, generateRulesSheet, generateSummarySheet } = require('../lib/catalog/catalog_formatter.js');
const { validateCatalogData } = require('../lib/system/data_validator.js');
const PipelineLogger = require('../lib/system/pipeline_logger.js');
const { ClassificationDiagnostics } = require('../lib/catalog/classification_diagnostics.js');
const { parseProductMeta, synthesizeSubcategoryName, classifyComponentRole } = require('../lib/catalog/product_meta.js');
const { extractCompactCanonicalSpecs } = require('../lib/catalog/attribute_vectors.js');
const { loadProfile } = require('../lib/system/profile_loader.js');
const {
  parseStrictPrice,
  parseLeadTimeOrEta,
  normalizeLifecycleCanonical,
  classifyRowType
} = require('../lib/catalog/field_parsers.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

function matchFamilyGenGroupBaseSku(byFamilyGen, cleanNorm, cleanTarget) {
  for (const [key, group] of Object.entries(byFamilyGen)) {
    const normKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normModel = (group.modelFamily || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normKey.includes(cleanNorm) || (normModel && cleanNorm.includes(normModel))) {
      const skus = group.skus || {};
      if (cleanTarget && skus[cleanTarget]) {
        return { sku: cleanTarget, ...skus[cleanTarget] };
      }
      const firstSku = Object.keys(skus)[0];
      if (firstSku) return { sku: firstSku, ...skus[firstSku] };
    }
  }
  return null;
}

function lookupChassisMapBaseSku(chassisLabel, meta, targetSku = '') {
  try {
    const chassisMapPath = path.join(PROJECT_ROOT, 'scripts', 'config', 'chassis_map.json');
    if (!fs.existsSync(chassisMapPath)) return null;
    const cmap = JSON.parse(fs.readFileSync(chassisMapPath, 'utf8'));
    const byFamilyGen = cmap.chassis_base_skus_by_family_gen || {};
    const cleanNorm = (meta?.cleanName || chassisLabel || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanTarget = cleanBaseSKU(targetSku || '');

    const groupMatch = matchFamilyGenGroupBaseSku(byFamilyGen, cleanNorm, cleanTarget);
    if (groupMatch) return groupMatch;

    // 2. Fallback to candidate base SKUs in chassis_base_skus
    const baseSkus = cmap.chassis_base_skus || {};
    if (cleanTarget && baseSkus[cleanTarget]) {
      return { sku: cleanTarget, ...baseSkus[cleanTarget] };
    }
    const targetFam = (meta?.family || '').toLowerCase();
    const targetGen = (meta?.gen || '').toLowerCase();
    for (const [skuId, info] of Object.entries(baseSkus)) {
      const normModel = (info.model || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const famMatch = (info.family || '').toLowerCase() === targetFam;
      const genMatch = (info.gen || '').toLowerCase() === targetGen;
      if (famMatch && genMatch && normModel && cleanNorm.includes(normModel)) {
        return { sku: skuId, ...info };
      }
    }
  } catch (err) {
    PipelineLogger.debug('BUILD_CATALOG', `Chassis map lookup note: ${err?.message}`);
  }
  return null;
}

// ============================================================
// Constants & Taxonomy Maps
// ============================================================
const CHASSIS_FF_MAP = Object.freeze({
  '24SFF': 'Small Form Factor (24-Bay SFF)',
  '8SFF': 'Small Form Factor (8-Bay SFF)',
  '12LFF': 'Large Form Factor (12-Bay LFF)',
  '8LFF': 'Large Form Factor (8-Bay LFF)',
  '16EDSFF': 'eDesign SFF (16-Bay EDSFF)',
  'EDSFF': 'eDesign SFF (16-Bay EDSFF)',
  'High Power': 'High Power / Telco',
  'Telco': 'High Power / Telco',
  'SFF': 'Small Form Factor (8-Bay SFF)',
  'LFF': 'Large Form Factor (8-Bay LFF)'
});

function detectChassisFormFactor(desc) {
  const text = String(desc || '');
  if (/\b24\s*SFF\b/i.test(text) || text.includes('24SFF')) return 'Small Form Factor (24-Bay SFF)';
  if (/\b12\s*LFF\b/i.test(text) || text.includes('12LFF')) return 'Large Form Factor (12-Bay LFF)';
  if (/\b8\s*LFF\b/i.test(text) || text.includes('8LFF')) return 'Large Form Factor (8-Bay LFF)';
  if (/\b16\s*EDSFF\b/i.test(text) || text.includes('16EDSFF') || /\bEDSFF\b/i.test(text)) return 'eDesign SFF (16-Bay EDSFF)';
  if (/\b8\s*SFF\b/i.test(text) || text.includes('8SFF')) return 'Small Form Factor (8-Bay SFF)';
  if (/\bHigh Power\b/i.test(text) || /\bTelco\b/i.test(text)) return 'High Power / Telco';
  if (/\bSFF\b/i.test(text) || /\bSmall Form Factor\b/i.test(text)) return 'Small Form Factor (8-Bay SFF)';
  if (/\bLFF\b/i.test(text) || /\bLarge Form Factor\b/i.test(text)) return 'Large Form Factor (8-Bay LFF)';

  for (const [key, label] of Object.entries(CHASSIS_FF_MAP)) {
    if (text.includes(key)) return label;
  }
  return 'Unknown';
}

const SUBCAT_KEYWORD_PARENT_MAP = Object.freeze([
  { keywords: ['processor', 'xeon', 'epyc'], parent: 'Processor' },
  { keywords: ['memory', 'dimm', 'ddr5', 'ddr4', 'smart memory'], parent: 'Memory' },
  { keywords: ['power supply', 'power supplies', 'flex slot', '-48vdc'], parent: 'Power Supplies' },
  { keywords: ['heatsink', 'heat sink', 'fan kit', 'fans', 'cooling', 'thermal'], parent: 'Cooling / Thermal' },
  { keywords: ['riser', 'pcie riser'], parent: 'PCIe Risers' },
  { keywords: ['storage controller', 'sas controller', 'megaraid', 'smart array', 'vroc'], parent: 'Storage Controllers' },
  { keywords: ['drive cage', 'drive enclosure', 'drive blank', 'solid state drive', 'nvme', 'sata', 'sas'], parent: 'Drive Enclosures / Drives' },
  { keywords: ['networking', 'ethernet', 'ocp3', 'infiniband', 'transceiver', 'fibre channel'], parent: 'Networking' },
  { keywords: ['cable kit', 'cables', 'power cord', 'jumper cord', 'jumper cable'], parent: 'Cables & Enablement Kits' },
  { keywords: ['software', 'license', 'operating system', 'windows server', 'windows cal', 'cal pack', 'red hat', 'suse', 'vmware', 'ilo', 'oneview', 'compute ops', 'cloud management server fio'], parent: 'Software & Licenses' },
  { keywords: ['support', 'pointnext', 'tech care', 'service'], parent: 'Support Services' },
  { keywords: ['chassis infrastructure', 'smart chassis', 'rail', 'bezel', 'blank', 'enablement', 'options'], parent: 'Accessories & Infrastructure' },
  { keywords: ['base chassis', 'chassis variants', 'variants'], parent: 'Chassis' },
  { keywords: ['gpu', 'graphics', 'accelerator', 'nvidia'], parent: 'Graphics & GPU' }
]);

const ROLE_TO_PARENT_MAP = Object.freeze({
  'Processor': 'Processor',
  'Memory': 'Memory',
  'Power Supply': 'Power Supplies',
  'Storage Controller': 'Storage Controllers',
  'Drive Cage / Drive': 'Drive Enclosures / Drives',
  'Network Adapter': 'Networking',
  'Transceiver': 'Networking',
  'Fibre Channel HBA': 'Networking',
  'PCIe Riser': 'PCIe Risers',
  'Cooling / Thermal': 'Cooling / Thermal',
  'Cable Kit': 'Cables & Enablement Kits',
  'GPU / Accelerator': 'Graphics & GPU',
  'Storage Battery': 'Storage Controllers',
  'Boot Device': 'OS Boot Device',
  'Base Chassis': 'Chassis',
  'Operating System / License': 'Software & Licenses',
  'Chassis Infrastructure': 'Accessories & Infrastructure',
  'Service & Support': 'Support Services'
});

const CATEGORY_DEFAULT_CONSTRAINTS = Object.freeze({
  'processor': { constraint: 'min 1, max 2', minQty: 1, maxQty: 2, maxQtySemantics: 'BOUNDED' },
  'processors': { constraint: 'min 1, max 2', minQty: 1, maxQty: 2, maxQtySemantics: 'BOUNDED' },
  'memory': { constraint: 'max 32', minQty: 0, maxQty: 32, maxQtySemantics: 'BOUNDED' },
  'power supplies': { constraint: 'min 1, max 2', minQty: 1, maxQty: 2, maxQtySemantics: 'BOUNDED' },
  'power supply': { constraint: 'min 1, max 2', minQty: 1, maxQty: 2, maxQtySemantics: 'BOUNDED' },
  'pcie risers': { constraint: 'max 3', minQty: 0, maxQty: 3, maxQtySemantics: 'BOUNDED' },
  'pcie riser': { constraint: 'max 3', minQty: 0, maxQty: 3, maxQtySemantics: 'BOUNDED' },
  'chassis': { constraint: 'min 1, max 1 — Mandatory Base Chassis Selection', minQty: 1, maxQty: 1, maxQtySemantics: 'BOUNDED' },
  'storage controllers': { constraint: 'max 4', minQty: 0, maxQty: 4, maxQtySemantics: 'BOUNDED' },
  'storage controller': { constraint: 'max 4', minQty: 0, maxQty: 4, maxQtySemantics: 'BOUNDED' },
  'drive enclosures / drives': { constraint: 'max 24', minQty: 0, maxQty: 24, maxQtySemantics: 'BOUNDED' },
  'networking': { constraint: 'max 8', minQty: 0, maxQty: 8, maxQtySemantics: 'BOUNDED' },
  'cooling / thermal': { constraint: 'max 6', minQty: 0, maxQty: 6, maxQtySemantics: 'BOUNDED' },
  'software & licenses': { constraint: 'no max', minQty: 0, maxQty: null, maxQtySemantics: 'UNBOUNDED' },
  'accessories & infrastructure': { constraint: 'optional', minQty: 0, maxQty: null, maxQtySemantics: 'OPTIONAL' }
});

// ============================================================
// Utility Helpers
// ============================================================
function getParentCategory(textIdx, mainCatPositions) {
  let parent = 'Unknown';
  for (const mc of mainCatPositions) {
    if (mc.index < textIdx) parent = mc.name;
    else break;
  }
  return parent;
}

function parseTSVRows(tsvPath) {
  if (!fs.existsSync(tsvPath)) return [];
  const lines = fs.readFileSync(tsvPath, 'utf-8').split('\n');
  const headers = lines[0].split('\t');
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const cells = line.split('\t');
    const obj = {};
    headers.forEach((h, i) => { obj[h] = cells[i] || ''; });
    return obj;
  });
}

function createCatalogMetadata(family = 'ProLiant', gen = 'Gen12', model = 'DL380_Gen12_SFF') {
  return {
    chassis: model.replace(/_/g, ' '),
    model: model,
    family: family,
    generation: gen,
    scrapeDate: new Date().toISOString().split('T')[0],
    scrapeTimestamp: new Date().toISOString()
  };
}

function getUniqueSkuCount(entries) {
  const set = new Set();
  entries.forEach(e => (e.skus || []).forEach(s => {
    const pn = String(s.sku || s['Product #'] || '').trim();
    if (pn) set.add(pn);
  }));
  return set.size;
}

function isServiceCategoryEntry(e) {
  const pc = (e.parentCategory || '').toLowerCase();
  return pc.includes('service') || pc.includes('pointnext') || pc.includes('tech care') || pc.includes('support');
}

function isServiceSkuRow(sku) {
  if (isClearlyPhysicalSkuRow(sku)) return false;
  return sku?.optionType === 'Service' || sku?.['Option Type'] === 'Service' ||
    sku?.rowType === 'SUPPORT_SERVICE' ||
    isServiceSku(sku?.sku || sku?.['Product #'] || '');
}

function isClearlyPhysicalSkuRow(sku) {
  const description = String(sku?.Description || sku?.description || '');
  if (/\b(?:raid setting|fio setting|raid service|factory setting|custom defined raid|customer defined raid)\b/i.test(description)) {
    return true;
  }
  if (/\b(?:software|\bsw\b|license|subscription|\bsub\b|support|service|svc|saas|e-ltu|e-rtu|care\s*pack|education|learning\s*credits|virtual\s*workstation|ml\s*dev\s*env)\b/i.test(description)) return false;
  return /\b(?:adapter|card|cable|cord|kit|rail|drive|ssd|hdd|controller|processor|memory|dimm|transceiver|heatsink|heat sink|fan|riser|power supply|chassis|enclosure|accelerator|gpu|graphics|hba)\b/i.test(description);
}

function appendRetaxonomizedPhysicalEntries(target, entry, skus) {
  const groups = new Map();
  for (const sku of skus) {
    const description = sku.Description || sku.description || '';
    const role = classifyComponentRole('', description);
    const parentCategory = ROLE_TO_PARENT_MAP[role] || 'Accessories & Infrastructure';
    const subCategory = synthesizeSubcategoryName(parentCategory, description, entry.rules || []);
    const key = `${parentCategory}\u001f${subCategory}`;
    if (!groups.has(key)) groups.set(key, { parentCategory, subCategory, skus: [] });
    groups.get(key).skus.push({ ...sku, 'Component Role': role });
  }
  for (const group of groups.values()) {
    target.push({ ...entry, ...group, skuCount: group.skus.length });
  }
}

function _isSoftwareRowForPartition(sku) {
  const desc = String(sku?.Description || sku?.description || '');
  if (isClearlyPhysicalSkuRow(sku) || sku?.rowType === 'SUPPORT_SERVICE') return false;
  if (/\b(?:tech\s*care|foundation\s*care|pointnext|prosupport|smartnet|hi-care|integrat(?:ion)?\s*svc|\bsvc\b)\b/i.test(desc)) return false;
  return sku?.rowType === 'SOFTWARE_SUBSCRIPTION'
    || /\b(?:e-[lr]tu|saas|ml\s*dev\s*env|virtual\s*workstation|cloudera)\b/i.test(desc);
}

function _partitionHardwareEntry(entry, hardwareEntries, servicesEntries) {
  const physicalOverride = /\b(?:\bsw\b|software)\b/i.test(entry.subCategory || '')
    ? (entry.skus || []).filter(sku => !isServiceSkuRow(sku) && isClearlyPhysicalSkuRow(sku))
    : [];
  if (physicalOverride.length > 0) appendRetaxonomizedPhysicalEntries(hardwareEntries, entry, physicalOverride);

  const remaining = physicalOverride.length > 0
    ? (entry.skus || []).filter(sku => !physicalOverride.includes(sku))
    : (entry.skus || []);
  const softwareSkus = remaining.filter(_isSoftwareRowForPartition);
  const serviceSkus = remaining.filter(sku => !softwareSkus.includes(sku) && isServiceSkuRow(sku));
  const hardwareSkus = remaining.filter(sku => !serviceSkus.includes(sku) && !softwareSkus.includes(sku));

  if (hardwareSkus.length > 0) hardwareEntries.push({ ...entry, skus: hardwareSkus, skuCount: hardwareSkus.length });
  if (softwareSkus.length > 0) {
    hardwareEntries.push({
      ...entry,
      parentCategory: 'Software & Licenses',
      subCategory: 'Server Management & Operating System Licenses',
      skus: softwareSkus,
      skuCount: softwareSkus.length
    });
  }
  if (serviceSkus.length > 0) {
    servicesEntries.push({
      ...entry,
      parentCategory: 'Support Services',
      subCategory: 'Support & Deployment Services',
      skus: serviceSkus,
      skuCount: serviceSkus.length
    });
  }
}

function partitionCatalogEntries(entries) {
  const hardwareEntries = [];
  const servicesEntries = [];
  for (const entry of entries || []) {
    if (isServiceCategoryEntry(entry)) {
      const physicalSkus = (entry.skus || []).filter(sku => !isServiceSkuRow(sku) && isClearlyPhysicalSkuRow(sku));
      const serviceSkus = (entry.skus || []).filter(sku => !physicalSkus.includes(sku));
      if (physicalSkus.length > 0) appendRetaxonomizedPhysicalEntries(hardwareEntries, entry, physicalSkus);
      if (serviceSkus.length > 0) servicesEntries.push({ ...entry, skus: serviceSkus, skuCount: serviceSkus.length });
      continue;
    }

    const pc = (entry.parentCategory || '').toLowerCase();
    if (pc.includes('software') || pc.includes('license')) {
      const physicalSkus = (entry.skus || []).filter(sku => !isServiceSkuRow(sku) && isClearlyPhysicalSkuRow(sku));
      const remainingSkus = (entry.skus || []).filter(sku => !physicalSkus.includes(sku));
      if (physicalSkus.length > 0) appendRetaxonomizedPhysicalEntries(hardwareEntries, entry, physicalSkus);
      const hardwareSkus = remainingSkus.filter(sku => !isServiceSkuRow(sku));
      const serviceSkus = remainingSkus.filter(isServiceSkuRow);
      if (hardwareSkus.length > 0) hardwareEntries.push({ ...entry, skus: hardwareSkus, skuCount: hardwareSkus.length });
      if (serviceSkus.length > 0) servicesEntries.push({ ...entry, skus: serviceSkus, skuCount: serviceSkus.length });
      continue;
    }

    _partitionHardwareEntry(entry, hardwareEntries, servicesEntries);
  }
  return { hardwareEntries, servicesEntries };
}

// ============================================================
// Pipeline Stage 1: Ingestion & Environment Setup
// ============================================================
function validateBuildCliArgs(rawInputPath, jsonOutputPath, JSON_MODE) {
  if (JSON_MODE) {
    console.log = () => {};
    console.warn = () => {};
    console.info = () => {};
    console.error = () => {};
  }

  if (!rawInputPath || !jsonOutputPath) {
    if (JSON_MODE) {
      process.stdout.write(JSON.stringify({ status: 'ERROR', error: 'Missing required CLI arguments rawInputPath and jsonOutputPath' }));
    } else {
      console.error('Usage: node scripts/build_catalog.js <raw_data/oca_raw_data_full.json> <outputs/.../Catalog.json> [--verbose]');
    }
    process.exit(1);
  }
  if (!fs.existsSync(rawInputPath)) {
    if (JSON_MODE) {
      process.stdout.write(JSON.stringify({ status: 'ERROR', error: `Raw input file not found: ${rawInputPath}` }));
    } else {
      console.error(`❌ ERROR: Raw input file not found: ${rawInputPath}`);
    }
    process.exit(1);
  }
}

function resolveInitialBaseSku(fullText, chassisDiscovery, chassisLabel, meta) {
  const _ctoIdx = fullText.indexOf('Configure-to-order');
  const _searchArea = _ctoIdx > -1 ? fullText.substring(_ctoIdx, _ctoIdx + 300) : fullText.substring(0, 500);
  const _baseSKUMatch = _searchArea.match(/\b([A-Z]\d{5}-[A-Z]\d{2}[A-Z0-9]*|[A-Z0-9]{6})\b/);
  const discoveredSku = cleanBaseSKU(chassisDiscovery?.selectedSku || '');
  const matchedSku = _baseSKUMatch ? _baseSKUMatch[1] : '';
  const mapChassis = lookupChassisMapBaseSku(chassisLabel, meta, discoveredSku || matchedSku);
  const baseSKU = discoveredSku || matchedSku || mapChassis?.sku || '';
  const chassisRoot = baseSKU ? `${chassisLabel} [${baseSKU}]` : chassisLabel;
  return { baseSKU, chassisRoot };
}

async function initCatalogBuild(rawInputPath, jsonOutputPath, argv = process.argv) {
  const IS_VERBOSE = argv.includes('--verbose') || argv.includes('-v');
  const JSON_MODE  = argv.includes('--json');

  validateBuildCliArgs(rawInputPath, jsonOutputPath, JSON_MODE);

  if (!JSON_MODE) {
    console.log('================================================================');
    console.log('📦 CLASSIFICATION ENGINE — BUILD CATALOG');
    console.log(`Input:  ${rawInputPath}`);
    console.log(`Output: ${jsonOutputPath}`);
    console.log('================================================================\n');
  }

  const targetDir = path.dirname(jsonOutputPath);
  const scrapsDir = path.join(targetDir, 'intermittent_scraps');
  fs.mkdirSync(scrapsDir, { recursive: true });

  const catalogBaseName = path.basename(jsonOutputPath, '.json');
  const filePrefix      = catalogBaseName.replace(/_Catalog$/, '');
  const chassisLabel    = filePrefix.replace(/_/g, ' ');

  const pipelineLogger  = new PipelineLogger(filePrefix, targetDir);
  pipelineLogger.logStep('Initialize Classification Engine', 'SUCCESS', { rawInputPath, jsonOutputPath, chassisLabel });

  const diagnostics = new ClassificationDiagnostics(filePrefix, targetDir);

  const historyPriceMap = loadHistoricalPriceMap(targetDir);

  const rawData  = JSON.parse(fs.readFileSync(rawInputPath, 'utf-8'));
  const discoveryPath = path.join(path.dirname(rawInputPath), 'chassis_discovery.json');
  let chassisDiscovery = rawData.chassisDiscovery || null;
  if (!chassisDiscovery && fs.existsSync(discoveryPath)) {
    try { chassisDiscovery = JSON.parse(fs.readFileSync(discoveryPath, 'utf8')); } catch (err) {
      PipelineLogger.warn('BUILD_CATALOG', `Failed reading chassis discovery at ${discoveryPath}: ${err.message}`);
    }
  }
  const fullText = rawData.fullText || rawData.bodyText || '';
  const tables   = rawData.tables || [];
  diagnostics.setRawTableCount(tables.length);

  const registration = require('../config/notebooks.json').notebooks[filePrefix];
  const meta = registration?.captureViaParent
    ? { cleanName: filePrefix, family: registration.family, gen: registration.gen || registration.generation, pillar: registration.pillar }
    : parseProductMeta(chassisLabel);
  const capturedAt = rawData.timestamp || rawData.scrapeTimestamp || rawData.metadata?.scrapeTimestamp || rawData.metadata?.timestamp;
  const capturedMs = capturedAt ? new Date(capturedAt).getTime() : NaN;
  if (!Number.isFinite(capturedMs) || capturedMs > Date.now()) {
    throw new Error('ERR_CAPTURE_TIMESTAMP: Raw vendor capture requires a valid, non-future timestamp; rebuilding cannot establish freshness.');
  }
  meta.scrapeTimestamp = new Date(capturedMs).toISOString();
  const profile = await loadProfile(meta.family, meta.gen);

  console.log(`Loaded Raw Scrape Payload:`);
  console.log(`  Page Title:   "${rawData.pageTitle || 'N/A'}"`);
  console.log(`  Full Text:    ${fullText.length.toLocaleString()} chars`);
  console.log(`  Total Tables: ${tables.length}`);

  const { baseSKU, chassisRoot } = resolveInitialBaseSku(fullText, chassisDiscovery, chassisLabel, meta);
  console.log(`  Chassis Root: "${chassisRoot}"${baseSKU ? ` (Base SKU: ${baseSKU})` : ''}\n`);

  return {
    rawInputPath, jsonOutputPath, IS_VERBOSE, JSON_MODE,
    targetDir, scrapsDir, catalogBaseName, filePrefix, chassisLabel,
    pipelineLogger, diagnostics, historyPriceMap,
    rawData, fullText, tables, meta, profile, baseSKU, chassisRoot, chassisDiscovery
  };
}

function loadHistoricalPriceMap(targetDir) {
  const historyPriceMap = new Map();
  const historyDir = path.join(targetDir, 'history');
  if (fs.existsSync(historyDir)) {
    const priceHistoryPath = path.join(historyDir, 'price_history.json');
    if (fs.existsSync(priceHistoryPath)) {
      try {
        const ph = JSON.parse(fs.readFileSync(priceHistoryPath, 'utf-8'));
        for (const [k, trail] of Object.entries(ph)) {
          if (Array.isArray(trail)) {
            for (let i = trail.length - 1; i >= 0; i--) {
              const p = parseFloat(trail[i].price);
              if (!isNaN(p) && p > 0) {
                historyPriceMap.set(k.toUpperCase(), p.toFixed(2));
                break;
              }
            }
          }
        }
      } catch (err) {
        PipelineLogger.debug('BUILD_CATALOG', `Failed parsing price history file at ${priceHistoryPath}: ${err.message}`);
      }
    }
  }

  // INV-95: Portfolio-wide cross-chassis price backfill
  // When this chassis's own history lacks prices (e.g. OCA didn't render the Price column),
  // scan sibling catalog JSON files in the outputs tree to backfill from shared SKUs.
  // Priority: own history > sibling catalog (same gen) > other gen catalogs
  const backfillCount = loadPortfolioPriceBackfill(historyPriceMap, targetDir);
  if (backfillCount > 0) {
    console.log(`  📊 Portfolio price backfill: ${backfillCount} SKUs enriched from sibling catalogs`);
  }

  return historyPriceMap;
}

/**
 * INV-95: Cross-chassis portfolio price backfill.
 * Scans all sibling product catalog JSON files in the outputs directory tree
 * and imports their SKU prices for any SKU not already in the historyPriceMap.
 * This ensures shared components (processors, memory, NICs, etc.) that appear
 * across multiple server models get correct prices even if one chassis's OCA
 * scrape failed to render the price column.
 *
 * @param {Map<string,string>} historyPriceMap - Existing price map to augment (mutated in place)
 * @param {string} targetDir - The current chassis's output directory
 * @returns {number} Count of newly backfilled SKU prices
 */
const IGNORED_BACKFILL_DIRS = new Set([
  'history', 'temp', 'intermittent_scraps', 'raw_data', 'reports', 'services_history', 'node_modules'
]);

function collectSiblingCatalogFiles(dir, currentDirName, catalogFiles, depth = 0) {
  if (depth > 4) return;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !IGNORED_BACKFILL_DIRS.has(entry.name)) {
        if (entry.name === currentDirName && depth > 0) continue;
        collectSiblingCatalogFiles(fullPath, currentDirName, catalogFiles, depth + 1);
      } else if (entry.isFile() && entry.name.endsWith('_Catalog.json') &&
                 !entry.name.includes('Services') && !entry.name.includes('Rules')) {
        catalogFiles.push(fullPath);
      }
    }
  } catch (err) {
    PipelineLogger.debug('BUILD_CATALOG', `Portfolio backfill directory traversal note: ${err?.message}`);
  }
}

function loadPortfolioPriceBackfill(historyPriceMap, targetDir) {
  let backfillCount = 0;
  try {
    const outputsRoot = path.resolve(targetDir, '..', '..', '..');
    if (!fs.existsSync(outputsRoot)) return 0;

    const currentDirName = path.basename(targetDir);
    const catalogFiles = [];
    collectSiblingCatalogFiles(outputsRoot, currentDirName, catalogFiles);

    for (const catPath of catalogFiles) {
      try {
        const cat = JSON.parse(fs.readFileSync(catPath, 'utf-8'));
        for (const entry of (cat.entries || [])) {
          for (const sku of (entry.skus || [])) {
            const pn = (sku['Product #'] || sku.sku || '').toUpperCase();
            const price = sku.listPrice || parseFloat(sku['Unit Price (USD)']) || 0;
            if (pn && price > 0 && !historyPriceMap.has(pn)) {
              historyPriceMap.set(pn, price.toFixed(2));
              backfillCount++;
            }
          }
        }
      } catch (err) {
        PipelineLogger.debug('BUILD_CATALOG', `Failed reading sibling catalog at ${catPath}: ${err?.message}`);
      }
    }
  } catch (err) {
    PipelineLogger.debug('BUILD_CATALOG', `loadPortfolioPriceBackfill note: ${err?.message}`);
  }
  return backfillCount;
}

// ============================================================
// Pipeline Stage 2: Subcategories & Parent Taxonomy
// ============================================================
function parseConstraintMinMax(constraint) {
  const text = String(constraint || '');
  const minMatch = text.match(/min\s+(\d+)/i);
  const maxMatch = text.match(/max\s+(\d+)/i);
  let minQty = minMatch ? parseInt(minMatch[1], 10) : 0;
  if (/required/i.test(text)) {
    return { minQty: minQty || 1, maxQty: null, maxQtySemantics: 'REQUIRED' };
  }
  if (/no\s+max/i.test(text)) {
    return { minQty, maxQty: null, maxQtySemantics: 'UNBOUNDED' };
  }
  if (/^optional$/i.test(text.trim()) || /\boptional\b/i.test(text)) {
    return { minQty, maxQty: null, maxQtySemantics: 'OPTIONAL' };
  }
  if (maxMatch) {
    return { minQty, maxQty: parseInt(maxMatch[1], 10), maxQtySemantics: 'BOUNDED' };
  }
  return { minQty, maxQty: null, maxQtySemantics: 'UNBOUNDED' };
}

function recoverTableSubcategoryConstraints(rawData, fullText, subcatList) {
  const seenSubcategories = new Set(subcatList.map(item => `${item.name.toLowerCase()}|${item.constraint.toLowerCase()}`));
  for (const table of (rawData.tables || [])) {
    for (let rowIndex = 0; rowIndex < (table.rows || []).length; rowIndex++) {
      for (const cell of (table.rows[rowIndex] || [])) {
        const constraintMatch = String(cell).match(/(?:^|\n)\s*([^\n()]{3,80}?)\s*\(((?:min\s+\d+\s*,\s*)?(?:max\s+\d+|required|no max|optional)(?:\s*,\s*min\s+\d+)?|min\s+\d+)\)/i);
        if (!constraintMatch) continue;
        const name = constraintMatch[1].trim();
        const constraint = constraintMatch[2].trim();
        if (name.includes('Product #') || /^\d/.test(name)) continue;
        const key = `${name.toLowerCase()}|${constraint.toLowerCase()}`;
        if (seenSubcategories.has(key)) continue;

        const { minQty, maxQty, maxQtySemantics } = parseConstraintMinMax(constraint);
        const followingRows = (table.rows || []).slice(rowIndex + 1);
        const firstSku = followingRows.flat().map(value => cleanBaseSKU(value)).find(isValidHpeSKU);
        const textIndex = firstSku ? fullText.indexOf(firstSku) : fullText.indexOf(name);
        subcatList.push({ name, constraint, minQty, maxQty, maxQtySemantics, textIndex: Math.max(0, textIndex), source: 'OCA table constraint' });
        seenSubcategories.add(key);
      }
    }
  }
}

function locateMainCategoryPositions(mainCategories, fullText) {
  const NAV_MENU_END = 1010;
  const mainCatPositions = [];
  for (const mc of mainCategories) {
    const patterns = ['\n ' + mc + '\n', '\n' + mc + '\n'];
    let bestIdx = -1;
    for (const p of patterns) {
      let searchPos = NAV_MENU_END;
      while (true) {
        const idx = fullText.indexOf(p, searchPos);
        if (idx === -1) break;
        if (idx > NAV_MENU_END) {
          if (bestIdx === -1 || idx < bestIdx) bestIdx = idx;
          break;
        }
        searchPos = Math.max(searchPos + 1, idx + p.length);
      }
    }
    if (bestIdx > -1) {
      mainCatPositions.push({ name: mc, index: bestIdx });
    }
  }
  mainCatPositions.sort((a, b) => a.index - b.index);
  return mainCatPositions;
}

function extractSubcategoriesAndParents(fullText, rawData, IS_VERBOSE) {
  console.log('--- Step 1: Extracting Subcategories & Quantity Constraints ---');

  const subcatRegex = /\n([^\n]{3,80})\s*\(((?:min\s+\d+\s*,\s*)?(?:max\s+\d+|required|no max|optional)(?:\s*,\s*min\s+\d+)?|min\s+\d+)\)/gi;
  subcatRegex.lastIndex = 0;
  const subcatList = [];
  let match;
  while ((match = subcatRegex.exec(fullText)) !== null) {
    const name = match[1].trim().replace(/^[\s\n\r\t]+/, '').trim();
    if (name.length < 3 || name.length > 80 || /^\d{4}/.test(name) || name.includes('\t')) continue;

    const { minQty, maxQty, maxQtySemantics } = parseConstraintMinMax(match[2]);
    subcatList.push({
      name,
      constraint: match[2],
      minQty,
      maxQty,
      maxQtySemantics,
      textIndex: match.index
    });
  }

  recoverTableSubcategoryConstraints(rawData, fullText, subcatList);
  subcatList.sort((a, b) => a.textIndex - b.textIndex);

  console.log(`Found ${subcatList.length} subcategory headers in text.`);
  if (IS_VERBOSE) {
    subcatList.forEach((sc, i) => console.log(`  [${i+1}] "${sc.name}" (${sc.constraint}, minQty: ${sc.minQty}, maxQty: ${sc.maxQty}) @ pos ${sc.textIndex}`));
  }

  console.log('\n--- Step 2: Mapping Parent Categories ---');
  const configPath = path.join(__dirname, '..', 'config', 'categories.json');
  let KNOWN_MAIN_CATEGORIES = [];
  if (fs.existsSync(configPath)) {
    try {
      const parsedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      KNOWN_MAIN_CATEGORIES = parsedConfig.mainCategories || [];
    } catch (err) {
      console.warn(`  ⚠️ Failed to parse config/categories.json: ${err.message}`);
    }
  }

  const mainCategories = [...KNOWN_MAIN_CATEGORIES];
  if (Array.isArray(rawData.sections)) {
    rawData.sections.forEach(sec => {
      const t = (sec.text || '').trim();
      if (t.length >= 3 && t.length <= 50 && !mainCategories.includes(t) && !t.includes('(')) {
        mainCategories.push(t);
      }
    });
  }

  const mainCatPositions = locateMainCategoryPositions(mainCategories, fullText);

  console.log(`Discovered ${mainCatPositions.length} active Main Category headers in content area:`);
  mainCatPositions.forEach(mc => console.log(`  • ${mc.name.padEnd(35)} (position ${mc.index})`));

  let unclassifiedSubcats = 0;
  for (const sc of subcatList) {
    let parent = getParentCategory(sc.textIndex, mainCatPositions);
    if (parent === 'Unknown') {
      const scLower = sc.name.toLowerCase();
      const directMatch = mainCategories.find(mc => scLower.includes(mc.toLowerCase()));
      if (directMatch) parent = directMatch;
    }
    sc.parentCategory = parent;
    if (sc.parentCategory === 'Unknown') unclassifiedSubcats++;
  }

  if (unclassifiedSubcats > 0) {
    console.warn(`⚠️  WARNING: ${unclassifiedSubcats} subcategories mapped to 'Unknown' parent category. Inspect textIndex positioning.`);
  }

  return { subcatList, mainCatPositions };
}

// ============================================================
// Pipeline Stage 3: Table Parsing & SKU Synthesis
// ============================================================
function expandTableSections(sourceTables) {
  const expandedTables = [];
  for (let ti = 0; ti < sourceTables.length; ti++) {
    const table = sourceTables[ti];
    if (!table.rows || table.rows.length === 0) continue;

    let internalSections = [];
    let currentSec = null;

    for (let ri = 0; ri < table.rows.length; ri++) {
      const row = table.rows[ri];
      const rowStr = row.join(' ');
      const constraintMatch = rowStr.match(/([A-Za-z0-9\s\-_/]+)\s*\(((?:min\s+\d+\s*,\s*)?(?:max\s+\d+|required|no max|optional)(?:\s*,\s*min\s+\d+)?|min\s+\d+)\)/i);

      if (constraintMatch && constraintMatch[1].trim().length >= 3 && !constraintMatch[1].includes('Product #')) {
        if (currentSec && currentSec.rows.length > 0) internalSections.push(currentSec);
        currentSec = {
          tableIndex: expandedTables.length + internalSections.length,
          label: constraintMatch[1].trim(),
          constraintText: constraintMatch[2],
          rows: []
        };
      } else if (currentSec) {
        currentSec.rows.push(row);
      }
    }
    if (currentSec && currentSec.rows.length > 0) internalSections.push(currentSec);

    if (internalSections.length > 1) {
      expandedTables.push(...internalSections);
    } else {
      expandedTables.push(table);
    }
  }
  return expandedTables;
}

const DIRECT_HEADER_MAP = Object.freeze({
  'cost': 'Cost (USD)',
  'cost (usd)': 'Cost (USD)',
  'unit cost': 'Cost (USD)',
  'purchase cost': 'Cost (USD)',
  'list price': 'Unit Price (USD)',
  'list price (usd)': 'Unit Price (USD)',
  'price': 'Unit Price (USD)',
  'price (usd)': 'Unit Price (USD)',
  'unit price': 'Unit Price (USD)',
  'unit price (usd)': 'Unit Price (USD)',
  'product description': 'Description',
  'qty': 'Current Qty',
  'quantity': 'Current Qty',
  'interface': 'Interface',
  'form factor': 'Form Factor'
});

const REGEX_HEADER_RULES = [
  [/^start(?: date)?$/, 'Start Date'],
  [/^(?:discontinued|obsolete|end)(?: date)?$/, 'Discontinued Date'],
  [/^(?:availability|available|supply status)$/, 'Availability'],
  [/^(?:(?:estimated|est\.?)\s*(?:availability\s*)?)?lead\s*time|estimated\s*delivery|delivery\s*estimate|edt$/i, 'Lead Time'],
  [/^(?:clic\s*status|validation\s*status)$/i, 'CLIC Status'],
  [/^(?:lifecycle\s*status|sku\s*status)$/i, 'Lifecycle Status'],
  [/^(?:allocation\s*status|supply\s*status|market\s*availability)$/i, 'Allocation Status'],
  [/^(?:hpe\s*)?recommended$/, 'HPE Recommended'],
  [/^price\s*delta(?:\s*\(usd\))?$/i, 'Price Delta (USD)'],
  [/^ext(?:ended)?\s*price(?:\s*\(usd\))?$/i, 'Extended Price (USD)'],
  [/^price\s*per\s*gb(?:\s*\(usd\))?$/i, 'Price per GB (USD)'],
  [/^(?:qty\s*)?drive\s*cages?$/, 'Qty Drive Cages'],
  [/^(?:qty\s*)?bays?$/, 'Qty Bays'],
  [/^(?:qty\s*)?pci(?:e)?\s*slots?$/, 'Qty PCI Slots'],
  [/^(?:cntrls|controllers?)(?::\s*da)?$/, 'Controllers'],
  [/^workload(?:\s*type)?|endurance$/, 'Workload Type']
];

function normalizeHeaderName(header) {
  if (!header) return '';
  const nh = String(header).trim().toLowerCase();
  if (DIRECT_HEADER_MAP[nh]) return DIRECT_HEADER_MAP[nh];
  for (const [pattern, normalized] of REGEX_HEADER_RULES) {
    if (pattern.test(nh)) return normalized;
  }
  return header;
}

function extractRowSkuAndLifecycle(row, obj) {
  let rawPN = obj['Product #'] || '';
  const stripLifecycleBadge = value => String(value || '').replace(/\s*\[(?:OB|DS|90|EOL|CS)\]\s*/ig, '').trim();
  if (!rawPN || !isValidHpeSKU(cleanBaseSKU(stripLifecycleBadge(rawPN)))) {
    const foundCell = row.find(c => isValidHpeSKU(cleanBaseSKU(stripLifecycleBadge(c))));
    if (foundCell) rawPN = foundCell;
  }

  let lifecycleStatus = 'Active';
  let lifecycleBadge = '';
  const badgeMatch = String(rawPN).match(/^(OB|DS|90|EOL|CS)\b/i) || String(rawPN).match(/\[(OB|DS|90|EOL|CS)\]/i);
  if (badgeMatch) {
    lifecycleBadge = badgeMatch[1].toUpperCase();
    if (lifecycleBadge === 'OB') lifecycleStatus = 'Obsolete (OB)';
    else if (lifecycleBadge === 'DS') lifecycleStatus = 'Direct Ship (DS)';
    else if (lifecycleBadge === '90') lifecycleStatus = 'EOL Warning (90-Day)';
    else if (lifecycleBadge === 'EOL') lifecycleStatus = 'End of Life (EOL)';
    else if (lifecycleBadge === 'CS') lifecycleStatus = 'Constrained Supply (CS)';
  }

  if (rawPN) rawPN = cleanBaseSKU(stripLifecycleBadge(rawPN));
  if (!rawPN || !isValidHpeSKU(rawPN)) return null;

  return { pn: rawPN.toUpperCase(), lifecycleStatus, lifecycleBadge };
}

function extractRowDescription(row, obj, pn) {
  let descText = obj['Description'] || '';
  if (!descText || descText === pn) {
    const otherCells = row.filter(c => c !== pn && c.trim().length > 5);
    if (otherCells.length > 0) descText = otherCells[0];
  }
  if (descText.includes('context":') || descText.includes('\n') || descText.includes('\\n') || descText.includes('\t')) {
    descText = descText.replace(/context":\s*/gi, '').replace(/\\n/g, '\n').replace(/\\t/g, ' ');
    const firstLine = descText.split('\n')[0].trim();
    descText = firstLine.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^["\s]+|["\s]+$/g, '');
  }
  descText = descText.replace(/(?:Product is obsolete:\s*[A-Z0-9-]+\s*)+/gi, '').trim().replace(/^(?:OB|DS|90|EOL)\s+/i, '').trim();
  if (!descText || descText.length < 5 || descText === pn) {
    descText = `HPE Hardware Option (${pn})`;
  }
  return descText;
}

function resolveRowRecommendation(obj, headers) {
  const hasRecommendedHeader = headers.some(h => /^(?:hpe\s*)?recommended$/i.test(String(h).trim()));
  let hpeRecommended = obj['HPE Recommended'] || obj['Recommended'] || '';
  const isExplicitYes = /^(?:yes|true|recommended|selected|✓|✔|√)$/i.test(String(hpeRecommended).trim());
  const isExplicitNo = /^(?:no|false|not recommended)$/i.test(String(hpeRecommended).trim());

  if (isExplicitYes) {
    hpeRecommended = 'Yes';
  } else if (hasRecommendedHeader || isExplicitNo) {
    hpeRecommended = 'No';
  } else {
    hpeRecommended = 'No';
  }
  return hpeRecommended;
}

function resolveRowPrice(_row, _headers, obj, pn) {
  // Only the named current price field establishes a price. Quantity,
  // extended totals, dates, and shifted SKUs must not coerce to a price.
  const raw = obj['List Price (USD)'] ?? obj['Unit Price (USD)'] ?? obj['Price (USD)'] ?? obj.Price;
  return parseStrictPrice(raw, { row: obj, sku: pn, description: obj.Description || '' });
}

function populateLeadTimeAndSpeedTier(obj) {
  const rawLt = String(obj['Lead Time'] || obj.leadTime || '').trim();
  const parsed = parseLeadTimeOrEta(rawLt, null, null);
  obj['Lead Time'] = parsed.raw;
  obj.leadTime = parsed.raw;
  obj.leadTimeDays = parsed.days;
  obj['Lead Time Days'] = parsed.days !== null ? String(parsed.days) : '';
  obj.leadTimeUnit = parsed.unit;
  obj.etaDate = parsed.etaDate;
  obj['Lead Time Source'] = parsed.isPublished ? 'OCA row attribute' : 'Unpublished';
  obj['Speed Tier'] = (!parsed.isPublished && /unavailable|out of stock|allocation hold/i.test(obj.Availability || ''))
    ? 'Constrained / Allocation Hold'
    : parsed.speedTier;
}

function populateNumericAndPriceAttrs(obj, row, headers, pn, historyPriceMap, diagnostics = null) {
  if (obj['Qty Drive Cages']) obj.qtyDriveCages = parseInt(obj['Qty Drive Cages'], 10) || obj['Qty Drive Cages'];
  if (obj['Qty Bays']) obj.qtyBays = parseInt(obj['Qty Bays'], 10) || obj['Qty Bays'];
  if (obj['Qty PCI Slots']) obj.qtyPciSlots = parseInt(obj['Qty PCI Slots'], 10) || obj['Qty PCI Slots'];
  if (obj['Controllers']) obj.controllers = obj['Controllers'];

  const rawQty = String(obj['Current Qty'] || obj['Quantity'] || '0').replace(/\s+/g, '').trim();
  obj['Current Qty'] = /^\d+$/.test(rawQty) ? rawQty : '0';
  delete obj['Quantity'];

  const priceParsed = resolveRowPrice(row, headers, obj, pn, historyPriceMap);
  const priceStr = priceParsed.priceUsd === null ? '' : priceParsed.priceUsd.toFixed(2);
  obj['Unit Price (USD)'] = priceStr;
  obj['List Price (USD)'] = priceStr;
  obj.listPrice = priceParsed.priceUsd;
  obj.priceState = priceParsed.priceState;
  obj.priceStatus = priceParsed.priceStatus;
  if (priceParsed.priceState === 'PARSE_FAILED') {
    diagnostics?.recordAnomaly?.('unparseablePrices', { sku: pn, rawPrice: priceParsed.raw, reason: priceParsed.reason });
  }

  const rawCost = obj['Cost (USD)'] ? String(obj['Cost (USD)']).trim() : '';
  const costParsed = rawCost ? parseStrictPrice(rawCost, { row: obj, sku: pn }) : null;
  if (costParsed && costParsed.priceUsd !== null) {
    obj['Cost (USD)'] = costParsed.priceUsd.toFixed(2);
    obj.costPrice = costParsed.priceUsd;
  } else {
    obj['Cost (USD)'] = '';
    obj.costPrice = null;
  }
}

const CANONICAL_ROW_KEYS = new Set([
  'Product #', 'Description', 'Current Qty', 'Unit Price (USD)', 'List Price (USD)', 'Cost (USD)', 'Price (USD)', 'Price',
  'Price Delta (USD)', 'Extended Price (USD)', 'Price per GB (USD)',
  'Option Type', 'CLIC Status', 'Lifecycle Status', 'Start Date', 'Discontinued Date',
  'Availability', 'Lead Time', 'Lead Time Days', 'Speed Tier', 'Lead Time Source', 'HPE Recommended',
  'sku', 'lifecycleStatus', 'lifecycleBadge', 'clicStatus', 'costPrice', 'leadTimeDays',
  'vendorRecommended', 'qtyDriveCages', 'qtyBays', 'qtyPciSlots', 'controllers'
]);

function parseSingleTableRow(row, headers, offset, historyPriceMap) {
  const obj = {};
  const priceHeaders = new Set(['Unit Price (USD)', 'Cost (USD)', 'List Price (USD)']);
  for (let hi = 0; hi < headers.length; hi++) {
    const cellIdx = hi + offset;
    if (headers[hi] && cellIdx < row.length) {
      const header = normalizeHeaderName(headers[hi]);
      let val = row[cellIdx].replace(/\n/g, ' ').trim();
      if (priceHeaders.has(header)) {
        val = val.replace(/[$,]/g, '').trim();
      }
      obj[header] = val;
    }
  }

  const skuInfo = extractRowSkuAndLifecycle(row, obj);
  if (!skuInfo) return null;
  const { pn, lifecycleStatus, lifecycleBadge } = skuInfo;

  const isCsBadge = lifecycleBadge === 'CS' || row.some(value => {
    const text = String(value || '').trim();
    return /\[CS\]/i.test(text) && (cleanBaseSKU(text).toUpperCase() === pn || /^\[CS\]$/i.test(text));
  });
  const effectiveLifecycleStatus = (isCsBadge && lifecycleBadge !== 'OB') ? 'Constrained Supply (CS)' : lifecycleStatus;
  const effectiveLifecycleBadge = (isCsBadge && lifecycleBadge !== 'OB') ? 'CS' : lifecycleBadge;
  if (isCsBadge) {
    obj['Vendor Status Badge'] = 'CS';
    obj.isSupplyConstrained = true;
    obj.Availability = 'Constrained Supply (CS)';
    obj.vendorSupplyStatus = 'CONSTRAINED_SUPPLY';
    obj.supplyConstraintDetails = 'This SKU is currently unavailable based on supply constraints. Select equivalent alternative SKU.';
  }

  obj['Product #'] = pn;
  obj.sku = pn;
  obj['Option Type'] = isClearlyPhysicalSkuRow(obj) && classifyOptionType(pn) === 'Service' ? 'Standard' : classifyOptionType(pn);

  obj['CLIC Status'] = obj['CLIC Status'] || 'Unpublished';
  obj.clicStatus = obj['CLIC Status'];
  obj['Lifecycle Status'] = effectiveLifecycleStatus;
  obj.lifecycleStatus = effectiveLifecycleStatus;
  obj.lifecycleBadge = effectiveLifecycleBadge;
  obj.Availability = String(obj.Availability || '').trim() || (effectiveLifecycleStatus === 'Active' ? 'Not published by OCA' : effectiveLifecycleStatus);

  populateLeadTimeAndSpeedTier(obj);

  const dateMatches = row.filter(c => /^\d{2}\/\d{2}\/\d{4}$/.test(c.trim()));
  if (dateMatches.length >= 1 && !obj['Start Date']) obj['Start Date'] = dateMatches[0].trim();
  if (dateMatches.length >= 2 && !obj['Discontinued Date']) obj['Discontinued Date'] = dateMatches[1].trim();

  const descText = extractRowDescription(row, obj, pn);
  const hpeRecommended = resolveRowRecommendation(obj, headers);
  obj['HPE Recommended'] = hpeRecommended;
  obj.vendorRecommended = (hpeRecommended === 'Yes');

  const lcNorm = normalizeLifecycleCanonical(effectiveLifecycleStatus, false);
  obj.lifecycleCanonical = lcNorm.lifecycleCanonical;
  populateNumericAndPriceAttrs(obj, row, headers, pn, historyPriceMap);
  obj.rowType = classifyRowType(obj);

  obj.vendorAttributes = Object.fromEntries(Object.entries(obj).filter(([key, value]) =>
    !CANONICAL_ROW_KEYS.has(key) && String(value ?? '').trim()
  ));

  if (require('../lib/catalog/sku.js').isTaaGtaCatalogOption(pn, descText)) {
    return null;
  }

  return { obj, pn, descText };
}

function matchSubcategoryForTable(skus, headers, fullText, subcatList, ti, totalTables) {
  let matchedSubcat = null;
  let textPos = -1;

  for (const s of skus) {
    const pn = s['Product #'];
    if (pn) {
      const pos = fullText.indexOf(pn);
      if (pos > -1) { textPos = pos; break; }
    }
  }

  if (textPos > -1) {
    for (let i = 0; i < subcatList.length; i++) {
      if (textPos >= subcatList[i].textIndex) {
        if (i === subcatList.length - 1 || textPos < subcatList[i + 1].textIndex) {
          matchedSubcat = subcatList[i];
          break;
        }
      }
    }
  }

  if (!matchedSubcat && subcatList.length > 0) {
    const headerStr = (headers || []).join(' ').toLowerCase();
    const sampleDescs = skus.slice(0, 5).map(s => (s['Description'] || '').toLowerCase()).join(' ');
    const searchText = headerStr + ' ' + sampleDescs;

    let bestScore = 0;
    let bestSubcat = null;
    for (const sc of subcatList) {
      const words = sc.name.toLowerCase().split(/[\s/\-,()]+/).filter(w => w.length >= 3);
      if (words.length === 0) continue;
      let score = 0;
      for (const w of words) {
        if (searchText.includes(w)) score++;
      }
      if (searchText.includes(sc.name.toLowerCase())) score += words.length;
      if (score > bestScore) { bestScore = score; bestSubcat = sc; }
    }
    if (bestSubcat && (bestScore >= 2 || bestScore >= Math.ceil(bestSubcat.name.split(/[\s/\-,()]+/).filter(w => w.length >= 3).length * 0.5))) {
      matchedSubcat = bestSubcat;
    }
  }

  // If not matched by score, leave matchedSubcat = null so that SKU descriptions
  // and role classification can accurately determine the taxonomy.

  return { matchedSubcat, textPos };
}

function resolveTableConstraintBounds(matchedSubcat, parentCat, table, subCat, tableRules) {
  const defaultConstraintObj = CATEGORY_DEFAULT_CONSTRAINTS[parentCat.toLowerCase()] || {};
  let finalConstraint = matchedSubcat?.constraint || defaultConstraintObj.constraint || '';
  const parsedFinal = finalConstraint ? parseConstraintMinMax(finalConstraint) : null;
  let finalMaxQty = matchedSubcat?.maxQty !== undefined ? matchedSubcat.maxQty : (parsedFinal?.maxQty ?? defaultConstraintObj.maxQty ?? null);
  let finalMaxQtySemantics = matchedSubcat?.maxQtySemantics || parsedFinal?.maxQtySemantics || defaultConstraintObj.maxQtySemantics || 'UNBOUNDED';
  let finalMinQty = matchedSubcat?.minQty !== undefined ? matchedSubcat.minQty : (parsedFinal?.minQty ?? defaultConstraintObj.minQty ?? 0);

  if (table.constraintText) {
    finalConstraint = table.constraintText;
    const parsedBounds = parseConstraintMinMax(finalConstraint);
    finalMinQty = parsedBounds.minQty;
    finalMaxQty = parsedBounds.maxQty;
    finalMaxQtySemantics = parsedBounds.maxQtySemantics;
  }

  if (tableRules.length === 0 && finalConstraint) {
    tableRules.push(`Selection constraint for ${subCat}: ${finalConstraint}`);
  }
  return { finalConstraint, finalMinQty, finalMaxQty, finalMaxQtySemantics };
}

function _resolveTaxonomyClassification({ matchedSubcat, textPos, parentCat, subCat, table, tableRules, profile, sampleDesc }) {
  const detectedRole = classifyComponentRole(subCat, sampleDesc, profile);
  const subCatLower = (subCat || '').toLowerCase();
  const matchedMapEntry = SUBCAT_KEYWORD_PARENT_MAP.find(m => m.keywords.some(k => subCatLower.includes(k)));
  const matchedParent = matchedMapEntry ? matchedMapEntry.parent : null;

  if (matchedParent && matchedParent !== 'Accessories & Infrastructure') {
    return { parentCat: matchedParent, subCat, detectedRole, matchedParent, matchedVia: 'direct_taxonomy_keyword' };
  }
  if (detectedRole && detectedRole !== 'Option Component' && ROLE_TO_PARENT_MAP[detectedRole]) {
    const resolvedParent = ROLE_TO_PARENT_MAP[detectedRole];
    let resolvedSub = subCat;
    if (!table.label || subCat === '(Sub-table)' || !subCatLower.includes(resolvedParent.toLowerCase().split(' ')[0])) {
      const synthesized = synthesizeSubcategoryName(resolvedParent, sampleDesc, tableRules);
      if (synthesized && !synthesized.includes('Options')) resolvedSub = synthesized;
    }
    return { parentCat: resolvedParent, subCat: resolvedSub, detectedRole, matchedParent, matchedVia: 'role_classifier' };
  }
  if (matchedParent) {
    return { parentCat: matchedParent, subCat, detectedRole, matchedParent, matchedVia: 'direct_taxonomy_keyword' };
  }
  if (!parentCat || parentCat === 'Unknown') {
    return { parentCat: 'Accessories & Infrastructure', subCat, detectedRole, matchedParent, matchedVia: 'fallback_accessories' };
  }
  return {
    parentCat,
    subCat,
    detectedRole,
    matchedParent,
    matchedVia: matchedSubcat ? 'portal_text_position' : 'portal_parent'
  };
}

function resolveTableTaxonomyAndRole(matchedSubcat, textPos, table, tableRules, profile, skus) {
  let parentCat = table.subTab || (matchedSubcat ? matchedSubcat.parentCategory : (textPos > -1 ? getParentCategory(textPos, []) : 'Unknown'));
  let subCat    = table.label || (matchedSubcat ? matchedSubcat.name : '(Sub-table)');
  const rawSubCategory = subCat;
  const sampleDesc = skus.map(s => s['Description'] || '').join(' ');
  if (!subCat || subCat === '(Sub-table)') {
    subCat = synthesizeSubcategoryName(parentCat, sampleDesc, tableRules);
  }
  const classified = _resolveTaxonomyClassification({ matchedSubcat, textPos, parentCat, subCat, table, tableRules, profile, sampleDesc });
  const bounds = resolveTableConstraintBounds(matchedSubcat, classified.parentCat, table, classified.subCat, tableRules);
  for (const s of skus) {
    if (!s['Component Role']) s['Component Role'] = classified.detectedRole;
    if (!s.rawSubCategory && rawSubCategory && rawSubCategory !== '(Sub-table)') s.rawSubCategory = rawSubCategory;
  }
  return { ...classified, ...bounds };
}

function _isSkippedReportTable(table, ti, diagnostics) {
  if (!table.rows || table.rows.length < 2) {
    diagnostics.recordSkippedTable(ti, 'Table rows < 2 or empty');
    return true;
  }
  const firstRowsText = (table.rows.slice(0, 3).map(r => r.join(' ')).join(' ')).toLowerCase();
  if (firstRowsText.includes('node level quantity') || firstRowsText.includes('support install action')) {
    diagnostics.recordSkippedTable(ti, 'BOM summary report table header');
    return true;
  }
  const allHeaderCells = (table.rows[0] || []).map(c => String(c || '').toLowerCase().trim());
  const isHierarchyBOMTable = allHeaderCells.includes('hierarchy') ||
                              (allHeaderCells.includes('config name') && allHeaderCells.includes('unit reseller price (usd)')) ||
                              (allHeaderCells.includes('qty') && allHeaderCells.includes('product #') && allHeaderCells.includes('config name'));
  if (isHierarchyBOMTable) {
    diagnostics.recordSkippedTable(ti, 'Solution hierarchy BOM summary table');
    return true;
  }
  return false;
}

function classifySampleCellHeader(val, ci, state, headers) {
  if (!state.foundSku && isValidHpeSKU(cleanBaseSKU(val))) {
    state.foundSku = true;
    return 'Product #';
  }
  if (state.foundSku && !state.foundDesc && val.length > 8 && !/^\d+$/.test(val) && !/^\$?[\d,]+(?:\.\d{2})?$/.test(val)) {
    state.foundDesc = true;
    return 'Description';
  }
  if (/^\d{1,4}$/.test(val) && headers.includes('Description') && !headers.includes('Quantity')) {
    return 'Quantity';
  }
  if (/^[+-]\$?[\d,]+(?:\.\d{2})?$/.test(val)) {
    return 'Price Delta (USD)';
  }
  if (/^\$?[\d,]+(?:\.\d{2})?$/.test(val) || val === 'NA' || val === 'N/A') {
    if (!state.foundPrice) {
      state.foundPrice = true;
      return 'Price (USD)';
    }
    if (!headers.includes('Extended Price (USD)')) return 'Extended Price (USD)';
    if (!headers.includes('Price per GB (USD)')) return 'Price per GB (USD)';
    return `Column_${ci}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
    state.dateCount++;
    if (state.dateCount === 1) return 'Start Date';
    if (state.dateCount === 2) return 'Discontinued Date';
    return `Date_${state.dateCount}`;
  }
  if (/^(?:yes|no|selected)$/i.test(val)) return 'HPE Recommended';
  return (ci === 0 && val === '') ? '' : `Column_${ci}`;
}

function synthesizeHeaderFromSampleRow(sampleRow) {
  const defaultHeaders = ['Product #', 'Description', 'Quantity', 'Price (USD)', 'Price Delta (USD)', 'Extended Price (USD)', 'HPE Recommended', 'Start', 'Discontinued'];
  if (!Array.isArray(sampleRow) || sampleRow.length === 0) {
    return defaultHeaders;
  }
  const headers = [];
  const state = { foundSku: false, foundDesc: false, foundPrice: false, dateCount: 0 };

  for (let ci = 0; ci < sampleRow.length; ci++) {
    const val = String(sampleRow[ci] || '').trim();
    headers.push(classifySampleCellHeader(val, ci, state, headers));
  }
  return headers.length >= 4 ? headers : defaultHeaders;
}

function _isInvalidHeaderCandidateRow(row) {
  if (!Array.isArray(row) || row.length > 20) return true;
  const cells = row.map(c => String(c || '').trim()).filter(Boolean);
  if (cells.length === 0) return true;
  const hasExplicitProductCol = cells.some(c => /^(?:product\s*#(?:\s*\/\s*option)?|part\s*number|sku)$/i.test(c));
  if (hasExplicitProductCol) return false;
  return cells.some(c =>
    /^\$[\d,]+(?:\.\d{2})?$/.test(c)
    || /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(c)
    || isValidHpeSKU(cleanBaseSKU(c))
    || c.length > 80
  );
}

function _detectTableHeadersAndRules(table, ti, diagnostics) {
  let headerIdx  = -1;
  let headers    = [];
  let tableRules = [];
  let tableAvailability = '';

  for (let ri = 0; ri < Math.min(4, table.rows.length); ri++) {
    const row = table.rows[ri];
    if (_isInvalidHeaderCandidateRow(row)) continue;
    const hasProductHeader = row.some(c => c === 'Product #' || c === 'Product # / Option');
    const hasDescHeader    = row.some(c => c === 'Description' || c === 'Product Description');

    if (hasProductHeader || hasDescHeader) {
      headerIdx = ri;
      headers   = row.map(h => h === 'Product Description' ? 'Description' : h);
      break;
    } else {
      const text = row.join(' ').trim();
      if (!tableAvailability && /^(?:available|not available|these products are hidden due to .+constraints)$/i.test(text)) {
        tableAvailability = text;
      }
      if (text && text !== 'Available' && text.length > 5 && text.length < 300) {
        tableRules.push(text);
      }
    }
  }

  if (headerIdx === -1) {
    const skuRow = table.rows.find(r => Array.isArray(r) && r.length <= 20 && r.some(c => isValidHpeSKU(cleanBaseSKU(String(c || '').trim()))));
    if (skuRow) {
      headers = synthesizeHeaderFromSampleRow(skuRow);
      headerIdx = -1;
    } else {
      diagnostics?.recordSkippedTable?.(ti, 'No valid SKU or headers detected');
      diagnostics?.recordRejectedRow?.({ tableIndex: ti, reason: 'NO_VALID_HEADER_OR_SKU', sampleCells: (table.rows[0] || []).slice(0, 8) });
      return null;
    }
  }

  const isPrivateTable = tableRules.some(r => /private\s+product\s+is\s+not\s+valid\s+for\s+current\s+customer\s+account/i.test(r));
  return { headerIdx, headers, tableRules, tableAvailability, isPrivateTable };
}

function _applyPrivateAndRegionalPriceState(obj, row, headerInfo, pn) {
  const unpriced = obj.listPrice === null || obj.listPrice <= 0;
  if (!unpriced) return;
  if (headerInfo.isPrivateTable || /\bPVT\b/i.test(row.join(' '))) {
    obj.isPrivateSku = true;
    obj.priceState = 'PRIVATE_UNPRICED';
    obj.priceStatus = 'PRIVATE_UNPRICED';
    return;
  }
  const rawPriceText = String(obj['Unit Price (USD)'] || obj['List Price (USD)'] || '').trim();
  if (/-A[AB]1$/i.test(pn) && /^(?:|na|n\/a)$/i.test(rawPriceText)) {
    obj.priceState = 'REGIONAL_NA_UNPRICED';
    obj.priceStatus = 'REGIONAL_NA_UNPRICED';
  }
}

function _extractSkusFromTable(table, headerInfo, historyPriceMap, allSKUMap) {
  const { headerIdx, headers, tableAvailability } = headerInfo;
  const skus = [];

  for (let ri = headerIdx + 1; ri < table.rows.length; ri++) {
    const row = table.rows[ri];
    if (row.length < 2) continue;

    let offset = 0;
    if (headers[0] === 'Product #' && row[0] === '' && row.length > headers.length) offset = 1;

    const parsed = parseSingleTableRow(row, headers, offset, historyPriceMap);
    if (!parsed) continue;

    const { obj, pn, descText } = parsed;
    _applyPrivateAndRegionalPriceState(obj, row, headerInfo, pn);
    if ((!obj.Availability || obj.Availability === 'Not published by OCA') && tableAvailability) {
      obj.Availability = tableAvailability;
    }
    const isPhantomFio = descText.toLowerCase() === 'factory integrated' ||
                         (descText.toLowerCase().includes('factory integrated') && (!obj['Unit Price (USD)'] || obj['Unit Price (USD)'] === '0.00' || obj['Unit Price (USD)'] === '0'));

    const existingSkuIndex = skus.findIndex(s => s['Product #'] === pn);
    if (existingSkuIndex !== -1) {
      if (isPhantomFio || obj['Option Type'] === 'CTO') {
        skus[existingSkuIndex]['Option Type'] = 'CTO';
        skus[existingSkuIndex].isFactoryIntegrated = true;
      }
      continue;
    }

    if (isPhantomFio && allSKUMap.has(pn)) {
      const prev = allSKUMap.get(pn);
      prev['Option Type'] = 'CTO';
      prev.isFactoryIntegrated = true;
      continue;
    }

    if (pn && pn.length >= 3 && pn.length < 30 && !pn.includes('Product #') && !pn.includes('Optional') && !pn.includes('Please make')) {
      skus.push(obj);
    }
  }

  return skus;
}

function _extractSmartChassisCombinations(table, headerIdx, smartChassisCombinations) {
  const isPatternTable = (table.rows || []).some(r => (r || []).some(c => /^(?:dl\d+pat|dl\d+smtch)/i.test(String(c || '').trim())));
  if (!isPatternTable) return;

  for (let ri = (headerIdx >= 0 ? headerIdx + 1 : 0); ri < table.rows.length; ri++) {
    const row = table.rows[ri];
    const patternId = (row || []).find(c => /^(?:dl\d+pat|dl\d+smtch)/i.test(String(c || '').trim()));
    if (!patternId) continue;
    const desc = (row || []).find(c => /drive cage|riser|controller|smart chassis/i.test(String(c || ''))) || '';
    const priceCell = (row || []).find(c => /^\d[\d,]*\.\d{2}$/.test(String(c || '').trim())) || '0.00';
    const price = parseFloat(String(priceCell).replace(/,/g, '')) || 0;

    const cageMatch = desc.match(/(\d+)\s*drive\s*cage/i);
    const qtyDriveCages = cageMatch ? parseInt(cageMatch[1], 10) : 0;
    let qtyBays = 0;
    if (/8sff/i.test(desc)) qtyBays = qtyDriveCages * 8;
    else if (/4lff|8lff|12lff/i.test(desc)) qtyBays = qtyDriveCages * 8;
    else if (/edsff/i.test(desc)) qtyBays = qtyDriveCages * 12;

    let qtyPciSlots = 3;
    if (/secondary riser/i.test(desc)) qtyPciSlots += 3;
    if (/tertiary riser/i.test(desc)) qtyPciSlots += 2;

    let controllers = 'DA';
    const cntrlMatch = desc.match(/\b(MR\d+i-[op]|SR\d+i-[op])\b/i);
    if (cntrlMatch) controllers = cntrlMatch[1].toUpperCase();

    smartChassisCombinations.push({
      patternId,
      description: desc,
      price,
      qtyDriveCages,
      qtyBays,
      qtyPciSlots,
      controllers,
      source: 'HPE OCA Top Selling Smart Chassis Combinations'
    });
  }
}

function _isStructuralWrapperTable(table, ti, allTables) {
  if (!Array.isArray(allTables) || allTables.length <= 1 || !Array.isArray(table?.rows)) return false;
  if (ti === 0 && table.rows.length > 500) return true;
  const sample = table.rows.slice(0, 20);
  const maxWidth = Math.max(0, ...sample.map(r => (Array.isArray(r) ? r.length : 0)));
  if (maxWidth >= 25) return true;
  const maxCellLen = Math.max(0, ...sample.flat().map(c => String(c || '').length));
  return maxWidth >= 15 && maxCellLen > 500;
}

function _applyInheritedEntryMetadata(entry, parentEntry) {
  entry.parentCategory = parentEntry.parentCategory;
  entry.subCategory    = parentEntry.subCategory;
  entry.constraint     = parentEntry.constraint;
  entry.minQty         = parentEntry.minQty;
  entry.maxQty         = parentEntry.maxQty;
  entry.maxQtySemantics = parentEntry.maxQtySemantics;
}

function _mergeSubtableInheritance(tableEntries) {
  const orderedEntries = [...tableEntries].sort((a, b) => a.tableIndex - b.tableIndex);
  let lastMatchedSubcat = null;
  let mergedSubtableCount = 0;

  for (const entry of orderedEntries) {
    if (entry.subCategory !== '(Sub-table)') {
      lastMatchedSubcat = entry;
    } else if (lastMatchedSubcat) {
      _applyInheritedEntryMetadata(entry, lastMatchedSubcat);
      mergedSubtableCount++;
    }
  }
  console.log(`Merged ${mergedSubtableCount} sub-tables into preceding parent subcategories (DOM index order).`);
  return orderedEntries;
}

function _selfHealUnclassifiedEntries(orderedEntries, profile, diagnostics) {
  for (const entry of orderedEntries) {
    const isFallback = entry.parentCategory === 'Unknown' ||
      entry.subCategory === 'Unknown' ||
      entry.subCategory === '(Sub-table)' ||
      (entry.parentCategory === 'Accessories & Infrastructure' && /^(other options|\(sub-table\)|unknown)$/i.test(entry.subCategory || ''));
    if (!isFallback || !Array.isArray(entry.skus) || entry.skus.length === 0) continue;

    const parentVotes = {};
    for (const sku of entry.skus) {
      const desc = String(sku['Description'] || '');
      const role = classifyComponentRole('', desc, profile);
      let inferredParent = (role && role !== 'Option Component' && ROLE_TO_PARENT_MAP[role]) ? ROLE_TO_PARENT_MAP[role] : null;
      if (!inferredParent) {
        if (/\b(transceiver|sfp\+|qsfp|fc\s+switch|fabric\s+vision|isl\s+kit|optic|gbic)\b/i.test(desc)) inferredParent = 'Networking';
        else if (/\b(lto-\d|tape\s+drive|data\s+cartridge|cleaning\s+cartridge|nvme|ssd|hdd|sff\s+sc|lff\s+lp)\b/i.test(desc)) inferredParent = 'Storage';
        else if (/\b(power\s+supply|hot\s+plug\s+psu|power\s+cord|pdu|heatsink|fan\s+kit)\b/i.test(desc)) inferredParent = 'Power & Cooling';
        else if (/\b(license|e-ltu|ltu|subscription|compute\s+ops|ilo\s+advanced)\b/i.test(desc)) inferredParent = 'Software & Licenses';
      }
      if (inferredParent) {
        parentVotes[inferredParent] = (parentVotes[inferredParent] || 0) + 1;
      }
    }

    const bestParent = Object.entries(parentVotes).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (bestParent) {
      const sampleDesc = entry.skus.map(s => s['Description'] || '').join(' ');
      const healedSubcat = synthesizeSubcategoryName(bestParent, sampleDesc, entry.rules || []);
      entry.parentCategory = bestParent;
      if (healedSubcat && healedSubcat !== '(Sub-table)') entry.subCategory = healedSubcat;
      entry.skus.forEach(s => {
        s.parentCategory = entry.parentCategory;
        s.subCategory = entry.subCategory;
      });
      diagnostics?.recordSelfHealedTable?.(entry.tableIndex, entry.parentCategory, entry.subCategory, entry.skus.length);
    }
  }
  return orderedEntries;
}

function _partitionAndDeduplicateServices(orderedEntries) {
  const { hardwareEntries, servicesEntries } = partitionCatalogEntries(orderedEntries);

  const seenHwSkus = new Set();
  hardwareEntries.forEach(e => {
    (e.skus || []).forEach(s => {
      const pn = s['Product #'] || s.sku;
      if (pn) seenHwSkus.add(pn);
    });
  });

  const seenServiceSkus = new Set();
  const cleanServicesEntries = servicesEntries.map(e => ({
    ...e,
    skus: (e.skus || []).filter(s => {
      const pn = s['Product #'] || s.sku;
      if (!pn || seenHwSkus.has(pn) || seenServiceSkus.has(pn)) return false;
      seenServiceSkus.add(pn);
      return true;
    })
  })).filter(e => e.skus.length > 0);

  return { hardwareEntries, cleanServicesEntries };
}

function _recordTableSkusInCatalog(skus, parentCat, subCat, finalConstraint, tableRules, processedPNs, allSKUMap) {
  const hasValidPrice = (r) => {
    const p = String(r['Unit Price (USD)'] || r['Price (USD)'] || r['Price'] || '').replace(/[$,\s]/g, '');
    return !isNaN(parseFloat(p)) && parseFloat(p) > 0;
  };

  for (const sku of skus) {
    const pn = sku['Product #'];
    if (!pn) continue;

    const newSKURow = {
      parentCategory: parentCat,
      subCategory:    subCat,
      constraint:     finalConstraint,
      rules:          tableRules.join(' | '),
      ...sku
    };
    if (parentCat === 'Chassis') newSKURow['Option Type'] = 'CTO';

    if (!processedPNs.has(pn)) {
      processedPNs.add(pn);
      allSKUMap.set(pn, newSKURow);
    } else {
      const existing = allSKUMap.get(pn);
      if (existing && !hasValidPrice(existing) && hasValidPrice(newSKURow)) {
        allSKUMap.set(pn, newSKURow);
      }
    }
  }
}

function synthesizeCatalogEntries(tables, fullText, subcatList, historyPriceMap, diagnostics, profile, IS_VERBOSE) {
  console.log('\n--- Step 3: Extracting Tables & SKUs ---');

  const sourceTables = [];
  for (let rawIdx = 0; rawIdx < (tables || []).length; rawIdx++) {
    const t = tables[rawIdx];
    if (_isStructuralWrapperTable(t, rawIdx, tables)) {
      diagnostics?.recordSkippedTable?.(rawIdx, 'Structural outer wrapper table filtered');
      diagnostics?.recordRejectedRow?.({ tableIndex: rawIdx, reason: 'STRUCTURAL_WRAPPER_TABLE', rowCount: t?.rows?.length || 0, sampleCells: (t?.rows?.[0] || []).slice(0, 8) });
      continue;
    }
    sourceTables.push(t);
  }

  const expandedTables = expandTableSections(sourceTables);
  const allSKURows   = [];
  const allSKUMap    = new Map();
  const processedPNs = new Set();
  const tableEntries = [];
  const smartChassisCombinations = [];
  let skippedTables  = 0;

  for (let ti = 0; ti < expandedTables.length; ti++) {
    const table = expandedTables[ti];
    if (_isSkippedReportTable(table, ti, diagnostics)) {
      skippedTables++;
      continue;
    }

    const headerInfo = _detectTableHeadersAndRules(table, ti, diagnostics);
    if (!headerInfo) {
      skippedTables++;
      continue;
    }

    const skus = _extractSkusFromTable(table, headerInfo, historyPriceMap, allSKUMap);
    if (skus.length === 0) {
      _extractSmartChassisCombinations(table, headerInfo.headerIdx, smartChassisCombinations);
      skippedTables++;
      continue;
    }

    const { matchedSubcat, textPos } = matchSubcategoryForTable(skus, headerInfo.headers, fullText, subcatList, ti, tables.length);
    const { parentCat, subCat, finalConstraint, finalMinQty, finalMaxQty, finalMaxQtySemantics, detectedRole, matchedVia } =
      resolveTableTaxonomyAndRole(matchedSubcat, textPos, table, headerInfo.tableRules, profile, skus);

    if (parentCat === 'Chassis' || subCat.toLowerCase().includes('variants') || skus.some(s => (s['Description'] || '').toLowerCase().includes('configure-to-order'))) {
      skus.forEach(sku => { sku['Option Type'] = 'CTO'; });
    }

    tableEntries.push({
      tableIndex:      ti,
      parentCategory:  parentCat,
      subCategory:     subCat,
      constraint:      finalConstraint,
      minQty:          finalMinQty,
      maxQty:          finalMaxQty,
      maxQtySemantics: finalMaxQtySemantics,
      rules:           headerInfo.tableRules,
      headers:         headerInfo.headers,
      skuCount:        skus.length,
      skus
    });

    diagnostics.recordTableDecision({
      tableIndex: ti,
      subCategory: subCat,
      parentCategory: parentCat,
      matchedVia,
      detectedRole,
      constraint: finalConstraint,
      minQty: finalMinQty,
      maxQty: finalMaxQty,
      maxQtySemantics: finalMaxQtySemantics,
      skuCount: skus.length,
      rules: headerInfo.tableRules
    });

    _recordTableSkusInCatalog(skus, parentCat, subCat, finalConstraint, headerInfo.tableRules, processedPNs, allSKUMap);

    if (IS_VERBOSE) {
      console.log(`  Table #${ti}: ${skus.length} SKUs → Subcat: "${matchedSubcat ? matchedSubcat.name : '(Sub-table)'}" (${parentCat})`);
    }
  }

  console.log(`Processed ${tableEntries.length} valid product tables (${skippedTables} non-SKU/wrapper tables skipped).`);
  allSKURows.push(...allSKUMap.values());
  console.log(`Extracted ${processedPNs.size} unique SKUs.`);

  // Step 4: Merging sub-tables & self-healing fallback classifications
  console.log('\n--- Step 4: Merging Sub-Tables & Subcategory Inheritance ---');
  const orderedEntries = _selfHealUnclassifiedEntries(_mergeSubtableInheritance(tableEntries), profile, diagnostics);
  const { hardwareEntries, cleanServicesEntries } = _partitionAndDeduplicateServices(orderedEntries);

  return {
    hardwareEntries,
    cleanServicesEntries,
    tableEntries,
    allSKUMap,
    processedPNs,
    smartChassisCombinations
  };
}

// ============================================================
// Solution Manifest & Baseline Hierarchy Extraction
// ============================================================
function extractCommercialBreakdown(tables) {
  for (const table of tables) {
    const rows = table.rows || [];
    if (rows.length === 0) continue;
    const flatText = rows.slice(0, 3).map(r => (r || []).join(' ')).join(' ');
    if (/Hardware.*Support.*Services/i.test(flatText) || (/Hardware/i.test(flatText) && /Total/i.test(flatText))) {
      const breakdown = {};
      rows.forEach(row => {
        for (let i = 0; i < row.length; i += 2) {
          const key = String(row[i] || '').trim().toLowerCase();
          const valStr = String(row[i + 1] || '').trim();
          const num = parseFloat(valStr.replace(/[^0-9.-]+/g, '')) || 0;
          if (key.includes('hardware')) breakdown.hardware = num;
          else if (key.includes('support')) breakdown.support = num;
          else if (key.includes('service')) breakdown.services = num;
          else if (key.includes('software')) breakdown.software = num;
          else if (key.includes('total')) breakdown.total = num;
        }
      });
      if (Object.keys(breakdown).length > 0) return breakdown;
    }
  }
  return null;
}

function extractDeliveryAndSupport(tables) {
  for (const table of tables) {
    const rows = table.rows || [];
    if (rows.length === 0) continue;
    const iconCell = rows.flat().find(c => /Icon ID:\s*([A-Za-z0-9_-]+)/i.test(String(c || '')));
    if (!iconCell) continue;

    const text = String(iconCell);
    const iconIdMatch = text.match(/Icon ID:\s*([A-Za-z0-9_-]+?)(?=EDT:|\s|$)/i);
    const edtMatch = text.match(/EDT:\s*([0-9\s\-+]+(?:days|weeks)?)/i);
    const configNameMatch = text.match(/Icon\s*#\d+\s*-\s*([^\n\r]+)/i);

    const delivery = {
      iconId: iconIdMatch ? iconIdMatch[1].trim() : '',
      edt: edtMatch ? edtMatch[1].trim() : '',
      configName: configNameMatch ? configNameMatch[1].trim() : '',
      attachedServices: []
    };

    const headers = (rows[0] || []).map(h => String(h || '').trim().toLowerCase());
    const reactiveIdx = headers.findIndex(h => h.includes('reactive support'));
    const installIdx = headers.findIndex(h => h.includes('install'));
    const specificIdx = headers.findIndex(h => h.includes('device specific'));

    for (let ri = 1; ri < rows.length; ri++) {
      const row = rows[ri] || [];
      const firstCell = String(row[0] || '').trim();
      if (firstCell && !firstCell.includes('Icon ID:')) {
        delivery.attachedServices.push({
          deviceTarget: firstCell,
          reactiveSupport: reactiveIdx >= 0 ? String(row[reactiveIdx] || '').trim() : '',
          installation: installIdx >= 0 ? String(row[installIdx] || '').trim() : '',
          deviceSpecific: specificIdx >= 0 ? String(row[specificIdx] || '').trim() : ''
        });
      }
    }
    return delivery;
  }
  return null;
}

function buildHierarchyColMap(headerRow) {
  const colMap = {};
  headerRow.forEach((h, ci) => {
    const norm = String(h || '').trim().toLowerCase();
    if (norm.includes('hierarchy')) colMap.hierarchy = ci;
    else if (norm === 'qty' || norm.includes('quantity')) colMap.qty = ci;
    else if (norm.includes('product #') || norm.includes('product number')) colMap.sku = ci;
    else if (norm.includes('description')) colMap.description = ci;
    else if (norm.includes('config name')) colMap.configName = ci;
    else if (norm.startsWith('start')) colMap.startDate = ci;
    else if (norm.startsWith('disc')) colMap.discDate = ci;
    else if (norm.includes('unit price') || norm.includes('unit reseller')) colMap.unitPrice = ci;
    else if (norm.includes('ext. price') || norm.includes('ext. reseller')) colMap.extPrice = ci;
  });
  return colMap;
}

function parseHierarchyRow(row, colMap) {
  const getCell = (idx, def = '') => idx !== undefined ? String(row[idx] || def).trim() : def;
  const rawSku = getCell(colMap.sku);
  if (!rawSku) return null;

  const skuParts = rawSku.split(/\s+/);
  const qtyStr = getCell(colMap.qty, '1');
  const unitPriceStr = getCell(colMap.unitPrice, '0').replace(/[^0-9.-]+/g, '');
  const extPriceStr = getCell(colMap.extPrice, '0').replace(/[^0-9.-]+/g, '');

  return {
    hierarchyLevel: getCell(colMap.hierarchy),
    sku: skuParts[0],
    optionCode: skuParts.slice(1).join(' ') || '',
    quantity: parseInt(qtyStr, 10) || 1,
    description: getCell(colMap.description),
    configName: getCell(colMap.configName),
    unitPrice: parseFloat(unitPriceStr) || 0,
    extPrice: parseFloat(extPriceStr) || 0,
    startDate: getCell(colMap.startDate),
    discDate: getCell(colMap.discDate)
  };
}

function extractBaselineHierarchy(tables) {
  for (const table of tables) {
    const rows = table.rows || [];
    if (rows.length <= 1) continue;
    const headerRow = rows[0] || [];
    const isHierarchyTable = headerRow.some(c => /hierarchy/i.test(String(c || ''))) &&
                             headerRow.some(c => /product\s*#|product\s*number/i.test(String(c || '')));
    if (!isHierarchyTable) continue;

    const colMap = buildHierarchyColMap(headerRow);
    if (colMap.sku === undefined) continue;

    const hierarchy = [];
    for (let ri = 1; ri < rows.length; ri++) {
      const parsed = parseHierarchyRow(rows[ri] || [], colMap);
      if (parsed) hierarchy.push(parsed);
    }
    if (hierarchy.length > 0) return hierarchy;
  }
  return [];
}

function extractSolutionManifest(tables) {
  if (!Array.isArray(tables) || tables.length === 0) return null;
  const commercialBreakdown = extractCommercialBreakdown(tables);
  const deliveryAndSupport = extractDeliveryAndSupport(tables);
  const baselineHierarchy = extractBaselineHierarchy(tables);

  if (!commercialBreakdown && !deliveryAndSupport && baselineHierarchy.length === 0) {
    return null;
  }
  return {
    commercialBreakdown,
    deliveryAndSupport,
    baselineHierarchy
  };
}

// ============================================================
// Pipeline Stage 4: Historical Reconcile & Diff Engine
// ============================================================
function buildBaseChassisRecordFromMetadata(effectiveSku, discovered, mapInfo, chassisLabel, chassisDiscovery) {
  let rawDesc = discovered?.description || discovered?.text || mapInfo?.description || `${chassisLabel} Configure-to-order Server`;
  rawDesc = rawDesc.replace(/^[A-Z0-9-]+\s*-\s*/, '').trim();
  const discPrice = Number(discovered?.listPriceUsd || 0);
  const resolvedPrice = discPrice > 0 ? discPrice : Number(mapInfo?.listPrice || 0);
  const registration = require('../config/notebooks.json').notebooks[parseProductMeta(chassisLabel).cleanName];
  const price = resolvedPrice > 0 ? resolvedPrice : (registration?.requireExactOcaBase ? null : 0);
  const formattedPrice = price === null ? '' : price.toFixed(2);
  const status = discovered?.status || 'Active';
  const leadTime = discovered?.leadTime || chassisDiscovery?.deliveryEstimate || '';
  return {
    'Product #': effectiveSku,
    sku: effectiveSku,
    'Option Type': 'CTO',
    'Component Role': 'Base Chassis',
    Description: rawDesc,
    'Current Qty': '1',
    'Unit Price (USD)': formattedPrice,
    listPrice: price,
    'CLIC Status': status,
    'Lifecycle Status': status,
    lifecycleStatus: status,
    'HPE Recommended': 'Yes',
    Availability: discovered?.availability || 'Available in OCA product catalog',
    'Lead Time': leadTime,
    'Lead Time Source': leadTime ? 'OCA configuration estimate' : 'Not published by OCA',
    'Start Date': discovered?.startDate || mapInfo?.startDate || '',
    'Discontinued Date': discovered?.discontinuedDate || '',
    provenance: chassisDiscovery?.source || 'HPE OCA product catalog metadata'
  };
}

function extractBaseChassisEvidence(tables, baseSKU, chassisLabel, chassisDiscovery = null, meta = null) {
  const mapInfo = lookupChassisMapBaseSku(chassisLabel, meta, baseSKU);
  const effectiveSku = cleanBaseSKU(baseSKU || mapInfo?.sku || '');
  if (!effectiveSku || !isValidHpeSKU(effectiveSku)) return null;

  const discovered = (chassisDiscovery?.candidates || []).find(candidate =>
    cleanBaseSKU(candidate.sku) === effectiveSku && candidate.eligible !== false
  );

  if (discovered || mapInfo) {
    return buildBaseChassisRecordFromMetadata(effectiveSku, discovered, mapInfo, chassisLabel, chassisDiscovery);
  }

  for (const table of tables || []) {
    for (const row of table.rows || []) {
      const skuIndex = row.findIndex(cell => cleanBaseSKU(cell) === effectiveSku);
      if (skuIndex < 0) continue;
      const description = row.slice(skuIndex + 1).find(cell => /configure-to-order|cto server/i.test(String(cell || '')));
      if (description) {
        const price = Number(mapInfo?.listPrice || 0);
        const leadTime = chassisDiscovery?.deliveryEstimate || '';
        const hasValidPrice = price > 0;
        return {
          'Product #': effectiveSku,
          sku: effectiveSku,
          'Option Type': 'CTO',
          'Component Role': 'Base Chassis',
          Description: String(description).replace(/^[A-Z0-9-]+\s*-\s*/, '').trim(),
          'Current Qty': '1',
          'Unit Price (USD)': hasValidPrice ? price.toFixed(2) : '',
          'List Price (USD)': hasValidPrice ? price.toFixed(2) : '',
          listPrice: hasValidPrice ? price : null,
          priceState: hasValidPrice ? 'PRICED' : 'UNPRICED',
          rowType: 'BASE_SYSTEM',
          'CLIC Status': 'Active',
          'Lifecycle Status': 'Active',
          lifecycleStatus: 'Active',
          'HPE Recommended': 'Yes',
          Availability: 'Available in active OCA configuration',
          'Lead Time': leadTime || 'Unpublished',
          'Lead Time Source': leadTime ? 'OCA configuration estimate' : 'Not published by OCA',
          provenance: `OCA active configuration for ${chassisLabel}`
        };
      }
    }
  }
  return null;
}

function _isCanonicalNonProLiantBaseText(family, text) {
  if (/\b(?:upgrade|license|support|service|kit|expansion|drive|magazine)\b/i.test(text)) return false;
  if (family === 'SAN') return /\bswitch\b/i.test(text);
  if (family === 'StoreEver') return /\b(?:base\s+module|library|autoloader)\b/i.test(text);
  return ['Cray', 'Alletra'].includes(family);
}

function isCanonicalCtoChassisCandidate(candidate, chassisLabel) {
  const text = String(candidate?.description || candidate?.text || '').trim();
  const sku = cleanBaseSKU(candidate?.sku || '');
  if (!sku || !isValidHpeSKU(sku) || !text || candidate?.eligible === false) return false;
  if (candidate?.isBto || candidate?.isTaa || candidate?.isGta || /\b(?:TAA|GTA|BTO)\b|#GTA/i.test(text)) return false;
  const registeredId = String(chassisLabel).replace(/ /g, '_');
  const expected = require('../config/notebooks.json').notebooks[registeredId]?.captureViaParent ? registeredId : parseProductMeta(chassisLabel).cleanName;
  const observedMeta = parseProductMeta(text);
  const observed = observedMeta.cleanName;
  const registration = require('../config/notebooks.json').notebooks[expected];
  if (registration?.captureViaParent) {
    return registration.baseSku === sku && require('../lib/catalog/catalog_hierarchy').registeredOwnedMenuMatches({ ...registration, productId: expected }, text);
  }
  const hasCtoOrFamilyBase = /configure[\s-]+to[\s-]+order|\bcto\b/i.test(text) || _isCanonicalNonProLiantBaseText(observedMeta.family, text);
  if (expected !== observed || !hasCtoOrFamilyBase) return false;
  return !/\b(?:OEM|solutions?|Commvault|Cohesity|Veeam|vSAN|template)\b/i.test(text);
}

async function loadHistoricalChassisEvidence(targetDir, chassisLabel) {
  const result = new Map();
  const historyDir = path.join(targetDir, 'history');
  if (!fs.existsSync(historyDir)) return result;
  const expected = parseProductMeta(chassisLabel).cleanName;
  const files = fs.readdirSync(historyDir).filter(f => /^catalog_.*\.json$/.test(f)).sort().reverse();
  for (const file of files) {
    try {
      const catalog = JSON.parse(await fs.promises.readFile(path.join(historyDir, file), 'utf8'));
      for (const entry of catalog.entries || []) {
        const isChassis = String(entry.parentCategory || '').toLowerCase() === 'chassis' || String(entry.subCategory || '').toLowerCase() === 'variants';
        if (!isChassis) continue;
        for (const sku of entry.skus || []) {
          const description = String(sku.Description || sku.description || '').replace(/^\[REMOVED SKU\]\s*/i, '');
          const productNumber = cleanBaseSKU(sku['Product #'] || sku.sku || '');
          if (productNumber && isValidHpeSKU(productNumber) && parseProductMeta(description).cleanName === expected && !result.has(productNumber)) {
            result.set(productNumber, { ...sku, Description: description });
          }
        }
      }
    } catch (err) {
      PipelineLogger.debug('BUILD_CATALOG', `Failed reading historical chassis evidence from ${file}: ${err.message}`);
    }
  }
  return result;
}

function resolveDiscoveredVariantPriceWithProvenance(candidate, previous, chassisLabel, productNumber) {
  if (candidate.priceVerified && candidate.listPriceUsd === 0) {
    return { price: 0, priceProvenance: 'OCA_CANDIDATE_VERIFIED_ZERO' };
  }
  const currentPrice = Number(candidate.listPriceUsd || 0);
  if (currentPrice > 0) return { price: currentPrice, priceProvenance: 'OCA_CANDIDATE' };
  const mapInfo = lookupChassisMapBaseSku(chassisLabel, null, productNumber);
  const mapPrice = Number(mapInfo?.listPrice || 0);
  if (mapPrice > 0) return { price: mapPrice, priceProvenance: 'CHASSIS_MAP_FALLBACK' };
  const registration = require('../config/notebooks.json').notebooks[parseProductMeta(chassisLabel).cleanName];
  if (registration?.requireExactOcaBase || registration?.captureViaParent) {
    return { price: null, priceProvenance: 'UNPRICED' };
  }
  const historicalPrice = Number(previous.listPrice || previous['Unit Price (USD)'] || previous['Price (USD)'] || 0);
  return historicalPrice > 0
    ? { price: historicalPrice, priceProvenance: 'HISTORICAL_CATALOG_FALLBACK' }
    : { price: 0, priceProvenance: 'UNPRICED' };
}

function buildDiscoveredVariantRecord(candidate, previous, productNumber, chassisLabel, chassisDiscovery) {
  const description = String(candidate.description || candidate.text || previous.Description || '')
    .replace(/^\s*[A-Z0-9-]+(?:#GTA)?\s*-\s*/i, '').trim();
  const { price, priceProvenance } = resolveDiscoveredVariantPriceWithProvenance(candidate, previous, chassisLabel, productNumber);
  const isSelectedVariant = cleanBaseSKU(chassisDiscovery.selectedSku || '') === productNumber;
  const leadTime = candidate.leadTime || (isSelectedVariant ? (chassisDiscovery.deliveryEstimate || '') : '');
  const formattedPrice = price === null ? '' : price.toFixed(2);
  const clicStatus = candidate.clicStatus || (chassisDiscovery.parentConfiguration ? 'Not evaluated' : 'Valid');
  const lifecycleStatus = candidate.status || 'Active';
  const leadTimeSource = !leadTime ? 'Not published by OCA' : (chassisDiscovery.parentOption ? 'OCA parent option row'
    : (candidate.leadTime ? 'OCA candidate estimate' : 'OCA configuration estimate'));

  return {
    'Product #': productNumber,
    sku: productNumber,
    'Option Type': 'CTO',
    'Component Role': 'Base Chassis',
    Description: description || `${chassisLabel} Configure-to-order Server`,
    'Current Qty': '1',
    'Unit Price (USD)': formattedPrice,
    'List Price (USD)': formattedPrice,
    'Cost (USD)': '',
    costPrice: null,
    listPrice: price,
    priceProvenance,
    'CLIC Status': clicStatus,
    clicStatus,
    'Lifecycle Status': lifecycleStatus,
    lifecycleStatus,
    'HPE Recommended': previous['HPE Recommended'] === 'Yes' ? 'Yes' : 'No',
    Availability: candidate.availability || 'Available in OCA product catalog',
    'Lead Time': leadTime,
    'Lead Time Days': candidate.leadTimeDays == null ? '' : String(candidate.leadTimeDays),
    leadTimeDays: candidate.leadTimeDays ?? null,
    'Speed Tier': candidate.leadTimeDays != null ? 'OCA Estimate' : (leadTime ? 'Standard Delivery (8-30d)' : 'Unpublished'),
    'Lead Time Source': leadTimeSource,
    'Start Date': candidate.startDate || previous['Start Date'] || '',
    'Discontinued Date': candidate.discontinuedDate || previous['Discontinued Date'] || '',
    provenance: chassisDiscovery.source || 'HPE OCA product search'
  };
}

async function extractDiscoveredChassisVariants(targetDir, chassisLabel, chassisDiscovery) {
  const candidates = (chassisDiscovery?.candidates || []).filter(c => isCanonicalCtoChassisCandidate(c, chassisLabel));
  if (candidates.length === 0) return [];
  const historical = await loadHistoricalChassisEvidence(targetDir, chassisLabel);
  const bySku = new Map();
  for (const candidate of candidates) {
    const productNumber = cleanBaseSKU(candidate.sku);
    if (bySku.has(productNumber)) continue;
    const previous = historical.get(productNumber) || {};
    bySku.set(productNumber, buildDiscoveredVariantRecord(candidate, previous, productNumber, chassisLabel, chassisDiscovery));
  }
  return Array.from(bySku.values());
}

const CTO_HISTORY_KEYWORDS = ['cto server', 'base chassis', 'server cto', 'cto rack', 'cto chassis', 'compute module', 'cto frame'];

function extractValidHistoricalChassisEntries(hCat, targetProduct) {
  const hChassisEntries = (hCat.entries || []).filter(e =>
    (e.parentCategory || '').toLowerCase() === 'chassis' ||
    (e.subCategory || '').toLowerCase() === 'variants'
  );
  if (hChassisEntries.length === 0) return [];

  return hChassisEntries.map(e => ({
    ...e,
    parentCategory: 'Chassis',
    subCategory: 'Variants',
    minQty: 1,
    maxQty: 1,
    skus: (e.skus || []).filter(s => {
      const desc = (s['Description'] || s.description || '').toLowerCase();
      const historicalProduct = parseProductMeta(desc).cleanName;
      const isBaseOrCto = s['Component Role'] === 'Base Chassis' || (s['Option Type'] || s.optionType) === 'CTO';
      return isBaseOrCto && historicalProduct === targetProduct && CTO_HISTORY_KEYWORDS.some(kw => desc.includes(kw));
    })
  })).map(e => ({ ...e, skuCount: e.skus.length })).filter(e => e.skus.length > 0);
}

async function tryInjectVariantsFromHistoryDir(hardwareEntries, targetDir, chassisLabel) {
  const historyDir = path.join(targetDir, 'history');
  if (!fs.existsSync(historyDir)) return false;

  const histFiles = fs.readdirSync(historyDir)
    .filter(f => f.startsWith('catalog_') && f.endsWith('.json'))
    .sort().reverse();

  const histFilesData = await Promise.all(histFiles.map(async (hf) => {
    try {
      const rawContent = await fs.promises.readFile(path.join(historyDir, hf), 'utf-8');
      return { hf, rawContent };
    } catch (_) {
      return null;
    }
  }));

  const targetProduct = parseProductMeta(chassisLabel).cleanName;
  for (const data of histFilesData) {
    if (!data) continue;
    const { hf, rawContent } = data;
    if (!/"parentCategory"\s*:\s*"Chassis"|"subCategory"\s*:\s*"Variants"/.test(rawContent)) continue;
    try {
      const hCat = JSON.parse(rawContent);
      const cleanChassisEntries = extractValidHistoricalChassisEntries(hCat, targetProduct);
      if (cleanChassisEntries.length > 0) {
        hardwareEntries.unshift(...cleanChassisEntries);
        console.log(`  📦 Chassis variants injected from history snapshot: ${hf} (${cleanChassisEntries.reduce((sum, e) => sum + e.skus.length, 0)} SKUs)`);
        return true;
      }
    } catch (err) {
      PipelineLogger.debug('BUILD_CATALOG', `Failed reading history snapshot ${hf}: ${err.message}`);
    }
  }
  return false;
}

async function injectChassisVariantsFromHistory(hardwareEntries, targetDir, chassisLabel, baseSKU = '', tables = [], chassisDiscovery = null, meta = null) {
  const hasChassisEntry = hardwareEntries.some(e =>
    (e.subCategory || '').toLowerCase() === 'variants' &&
    (e.skus || []).some(s => s['Component Role'] === 'Base Chassis' && String(s['Lead Time'] || '').trim())
  );

  if (hasChassisEntry) return;

  const discoveredVariants = await extractDiscoveredChassisVariants(targetDir, chassisLabel, chassisDiscovery);
  if (discoveredVariants.length > 0) {
    hardwareEntries.unshift({
      tableIndex: -1,
      parentCategory: 'Chassis',
      subCategory: 'Variants',
      constraint: 'min 1, max 1 — Active OCA CTO chassis',
      minQty: 1,
      maxQty: 1,
      maxQtySemantics: 'BOUNDED',
      rules: ['Select exactly one currently discoverable, non-TAA/non-GTA CTO base chassis'],
      headers: ['Product #', 'Description', 'Unit Price (USD)', 'Start Date', 'Discontinued Date', 'Lead Time'],
      skuCount: discoveredVariants.length,
      skus: discoveredVariants
    });
    console.log(`  📦 ${discoveredVariants.length} active exact-product CTO chassis variant(s) injected from current OCA discovery.`);
    return;
  }

  const injectedFromHistory = await tryInjectVariantsFromHistoryDir(hardwareEntries, targetDir, chassisLabel);
  if (!injectedFromHistory) {
    const baseChassis = extractBaseChassisEvidence(tables, baseSKU, chassisLabel, chassisDiscovery, meta);
    if (baseChassis) {
      hardwareEntries.unshift({
        tableIndex: -1,
        parentCategory: 'Chassis',
        subCategory: 'Variants',
        constraint: 'min 1, max 1 — Active OCA Base Chassis',
        minQty: 1,
        maxQty: 1,
        maxQtySemantics: 'BOUNDED',
        rules: ['Base chassis captured from the active OCA configuration summary'],
        headers: ['Product #', 'Description'],
        skuCount: 1,
        skus: [baseChassis]
      });
      console.log(`  📦 Active OCA base chassis injected from configuration evidence: ${baseChassis.sku}`);
    } else {
      console.warn(`  ⚠️  WARNING: No exact-product chassis entry found in scraped data or history for ${chassisLabel}.`);
    }
  }
}

function _stampCatalogRow(s, e, ownerProduct) {
  const desc = s.Description || s.description || '';
  const componentRole = s['Component Role'] || classifyComponentRole(e.parentCategory || e.subCategory || '', desc);
  const rawLifecycle = s['Lifecycle Status'] || s.lifecycleStatus || 'Active';
  const lifecycleCanonical = s.lifecycleCanonical || normalizeLifecycleCanonical(rawLifecycle).lifecycleCanonical;
  const rowType = s.rowType || classifyRowType({ ...s, 'Component Role': componentRole }, { isBase: e.parentCategory === 'Chassis' });
  const canonicalSpecs = s.canonicalSpecs || extractCompactCanonicalSpecs(s, { parentCategory: e.parentCategory });
  return {
    ...s,
    ownerProduct: s.ownerProduct || ownerProduct,
    subCategory: s.subCategory || e.subCategory,
    'Component Role': componentRole,
    lifecycleCanonical,
    rowType,
    canonicalSpecs
  };
}

function buildCatalogObject(entries, filePrefix, meta, chassisLabel, subcatList) {
  return {
    metadata: {
      chassis:            filePrefix.replace(/_/g, ' '),
      model:              meta.cleanName || chassisLabel,
      family:             meta.family || 'General',
      generation:         meta.gen || 'General',
      pillar:             meta.pillar || require('../lib/catalog/product_scope').inferPillar(meta.family, meta.cleanName || filePrefix),
      validationScope:    'CATALOG_ONLY_REQUIRES_PRODUCT_AND_TOPOLOGY_CHECKS',
      scrapeDate:         meta.scrapeTimestamp ? meta.scrapeTimestamp.split('T')[0] : null,
      scrapeTimestamp:    meta.scrapeTimestamp || null,
      builtAt:            new Date().toISOString(),
      totalSubcategories: new Set(entries.map(e => e.subCategory)).size,
      totalUniqueSKUs:    getUniqueSkuCount(entries),
      totalTables:        entries.length
    },
    subcategories: subcatList.filter(sc => entries.some(e => e.parentCategory === sc.parentCategory && e.subCategory === sc.name)).map(sc => ({
      parentCategory:  sc.parentCategory,
      name:            sc.name,
      constraint:      sc.constraint,
      minQty:          sc.minQty,
      maxQty:          sc.maxQty ?? null,
      maxQtySemantics: sc.maxQtySemantics || (sc.maxQty !== null && sc.maxQty !== undefined ? 'BOUNDED' : 'UNBOUNDED')
    })),
    entries: entries.map(e => {
      const ownerProduct = filePrefix || meta?.cleanName || null;
      const stampedSkus = (e.skus || []).map(s => _stampCatalogRow(s, e, ownerProduct));
      return {
        parentCategory:  e.parentCategory,
        subCategory:     e.subCategory,
        constraint:      e.constraint,
        minQty:          e.minQty || 0,
        maxQty:          e.maxQty ?? null,
        maxQtySemantics: e.maxQtySemantics || (e.maxQty !== null && e.maxQty !== undefined ? 'BOUNDED' : 'UNBOUNDED'),
        rules:           e.rules,
        headers:         e.headers,
        skuCount:        e.skuCount,
        skus:            stampedSkus
      };
    })
  };
}

async function reconcilePriceAndLifecycleHistory(hardwareEntries, cleanServicesEntries, subcatList, targetDir, filePrefix, meta, chassisLabel, pipelineLogger, baseSKU = '', tables = [], chassisDiscovery = null) {
  console.log('\n--- Step 5: Catalog Diff Engine & Historical Price Tracking ---');

  await injectChassisVariantsFromHistory(hardwareEntries, targetDir, chassisLabel, baseSKU, tables, chassisDiscovery, meta);

  // Preserve unpublished lifecycle dates. Observation dates belong in history,
  // never in vendor Start/Discontinued Date fields.

  const catalogObj = buildCatalogObject(hardwareEntries, filePrefix, meta, chassisLabel, subcatList);
  const servicesCatalogObj = buildCatalogObject(cleanServicesEntries, filePrefix, meta, chassisLabel, subcatList);

  const historyDir = path.join(targetDir, 'history');
  const targetProduct = parseProductMeta(chassisLabel).cleanName;
  const previousSkuFilter = ({ entry, sku }) => {
    const isChassis = String(entry.parentCategory || '').toLowerCase() === 'chassis' ||
      String(entry.subCategory || '').toLowerCase() === 'variants';
    if (!isChassis) return true;
    const description = sku.Description || sku.description || '';
    return parseProductMeta(description).cleanName === targetProduct;
  };
  const { enrichedCatalog } = processCatalogDiff(
    catalogObj,
    historyDir,
    'catalog',
    { previousSkuFilter, companionCatalog: servicesCatalogObj }
  );

  const servicesHistoryDir = path.join(targetDir, 'services_history');
  const { enrichedCatalog: enrichedServicesCatalog } = processCatalogDiff(
    servicesCatalogObj,
    servicesHistoryDir,
    'services',
    { companionCatalog: catalogObj }
  );

  if (enrichedCatalog?.metadata) {
    enrichedCatalog.metadata.totalUniqueSKUs = getUniqueSkuCount(enrichedCatalog.entries);
    enrichedCatalog.metadata.totalSubcategories = new Set(enrichedCatalog.entries.map(e => e.subCategory)).size;
  }
  if (enrichedServicesCatalog?.metadata) {
    enrichedServicesCatalog.metadata.totalUniqueSKUs = getUniqueSkuCount(enrichedServicesCatalog.entries);
    enrichedServicesCatalog.metadata.totalSubcategories = new Set(enrichedServicesCatalog.entries.map(e => e.subCategory)).size;
  }

  let existingCatalogForDiff = null;
  const currentCatalogJsonFile = path.join(targetDir, `${filePrefix}_Catalog.json`);
  if (fs.existsSync(currentCatalogJsonFile)) {
    try { existingCatalogForDiff = JSON.parse(fs.readFileSync(currentCatalogJsonFile, 'utf-8')); } catch (err) {
      PipelineLogger.warn('BUILD_CATALOG', `Failed reading existing catalog for diff at ${currentCatalogJsonFile}: ${err.message}`);
    }
  }
  const incrementalDiff = computeIncrementalDifferential(catalogObj.entries, existingCatalogForDiff);
  if (incrementalDiff.isIncremental) {
    console.log(`  ⚡ [INCREMENTAL_DIFF] Checksum Analysis: ${incrementalDiff.stats.unchangedSkusCount} Unchanged, ${incrementalDiff.stats.modifiedSkusCount} Modified, ${incrementalDiff.stats.addedSkusCount} Added, ${incrementalDiff.stats.removedSkusCount} Removed.`);
    console.log(`  [INCREMENTAL_DIFF] ${incrementalDiff.stats.unchangedSkusCount} unchanged SKUs; classification already ran locally. No measured API-token savings claimed.`);
    enrichedCatalog.metadata.incrementalStats = incrementalDiff.stats;

    // Check for anomalous drops / silent scrape truncation (INV-118/INV-119 guard)
    const anomalyCheck = assertDiffAnomalyBounds(incrementalDiff, existingCatalogForDiff, {
      allowLargeDiff: process.argv.includes('--force-large-diff') || process.env.FORCE_LARGE_CATALOG_DIFF === '1'
    });
    if (!anomalyCheck.isSafe) {
      pipelineLogger.logError(anomalyCheck.message);
      console.error(`\n❌ [ANOMALY_GUARD] ${anomalyCheck.message}`);
      throw new Error(anomalyCheck.message);
    }
    console.log(`  🛡️ [ANOMALY_GUARD] Diff Anomaly Check: ${anomalyCheck.status} (${anomalyCheck.message})`);
  }

  recordVersionSnapshot(enrichedCatalog, historyDir);

  pipelineLogger.logStep('Step 5: Catalog Diff Engine', 'SUCCESS', {
    totalSubcategories: enrichedCatalog.metadata?.totalSubcategories,
    totalUniqueSKUs: enrichedCatalog.metadata?.totalUniqueSKUs,
    incrementalStats: incrementalDiff.stats
  });

  enrichedCatalog.entries?.forEach(e => {
    e.skus?.forEach(s => {
      const rawPn = s.sku || s['Product #'] || s['SKU'] || '';
      pipelineLogger.logSKUClassification(cleanBaseSKU(rawPn), e.parentCategory, e.subCategory, 'CLASSIFIED', {
        description: s.description || s['Description'] || '',
        optionType: s.optionType || s['Option Type'] || ''
      });
    });
  });

  console.log('\n--- Step 6: Pre-Commit Validation & Atomic File Commit ---');
  const validationResult = validateCatalogData(enrichedCatalog);
  if (validationResult.warnings.length > 0) {
    validationResult.warnings.forEach(w => pipelineLogger.logWarning(w));
  }
  if (validationResult.errors.length > 0) {
    validationResult.errors.forEach(e => pipelineLogger.logError(e));
  }

  pipelineLogger.logStep('Pre-Commit Data Integrity Validation', validationResult.isValid ? 'SUCCESS' : 'FAILED', {
    isValid: validationResult.isValid,
    errorCount: validationResult.errors.length,
    warningCount: validationResult.warnings.length,
    stats: validationResult.stats
  });

  return { enrichedCatalog, enrichedServicesCatalog, validationResult, incrementalDiff };
}

// ============================================================
// Pipeline Stage 5: Artifact Generation & Export
// ============================================================
const NON_CHASSIS_ACCESSORY_KEYWORDS = [
  'factory integrated', 'heatsink', 'processor', 'fan kit', 'cable', 'riser', 'cage', 'cord', 'power supply', 'bezel', 'rail'
];
const CTO_SERVER_KEYWORDS = ['cto server', 'server cto', 'cto rack', 'cto chassis'];

function isTsvChassisVariantRow(r) {
  const cat = (r['Main Category'] || '').toLowerCase();
  const sub = (r['Sub-Category'] || '').toLowerCase();
  const role = (r['Component Role'] || '').toLowerCase();
  const desc = (r['Description'] || '').toLowerCase();
  const isChassisCategory = cat === 'chassis' && ['variants', 'base chassis', 'chassis'].includes(sub);
  const isCtoServer = CTO_SERVER_KEYWORDS.some(kw => desc.includes(kw));
  const isNonChassisAccessory = NON_CHASSIS_ACCESSORY_KEYWORDS.some(kw => desc.includes(kw));
  return (isChassisCategory || isCtoServer) && !isNonChassisAccessory && role === 'base chassis';
}

function mapTsvRowToChassisVariant(r) {
  const desc = r['Description'] || '';
  const priceParsed = parseStrictPrice(r['Unit Price (USD)'] ?? r['List Price (USD)'], { description: desc });
  const price = priceParsed.priceUsd !== null ? priceParsed.priceUsd : 0;
  const rec = r['HPE Recommended'] || 'Unknown';
  return {
    sku: r['Product #'] || '',
    description: desc,
    formFactor: detectChassisFormFactor(desc),
    listPrice: priceParsed.priceUsd,
    listPriceFormatted: priceParsed.priceUsd !== null ? `$${price.toFixed(2)}` : '',
    optionType: r['Option Type'] || 'CTO',
    hpeRecommended: rec,
    'HPE Recommended': rec,
    startDate: r['Start Date'] || '',
    discontinuedDate: r['Discontinued Date'] || '',
    constraint: r['Constraint Text'] || 'max 1 — Mandatory Base Chassis Selection',
    maxQty: r['Subcategory Max Qty'] || '1',
    diffStatus: r['Diff Status'] || '',
    priceHistoryTrail: r['Price History Trail'] || ''
  };
}

function _buildHistoricalVariantRecord(s, pn, desc, e, hf) {
  const priceParsed = parseStrictPrice(s.listPrice ?? s['Unit Price (USD)'] ?? s['List Price (USD)'], { sku: pn, description: desc, row: s });
  const rec = s['HPE Recommended'] || s.hpeRecommended || 'Unknown';
  return {
    sku: pn,
    description: desc,
    formFactor: detectChassisFormFactor(desc),
    listPrice: priceParsed.priceUsd,
    listPriceFormatted: priceParsed.priceUsd !== null ? `$${priceParsed.priceUsd.toFixed(2)}` : '',
    optionType: s['Option Type'] || s.optionType || 'CTO',
    hpeRecommended: rec,
    'HPE Recommended': rec,
    startDate: s['Start Date'] || s.startDate || '',
    discontinuedDate: s['Discontinued Date'] || s.discontinuedDate || '',
    constraint: e.constraint || 'max 1 — Mandatory Base Chassis Selection',
    maxQty: e.maxQty ?? '1',
    sourceSnapshot: hf
  };
}

function appendHistoricalChassisVariantsFromCat(hCat, filePrefix, hf, chassisVariantMatrix) {
  const hChassisEntries = (hCat.entries || []).filter(e =>
    (e.parentCategory || '').toLowerCase() === 'chassis' ||
    (e.subCategory || '').toLowerCase() === 'variants'
  );
  for (const e of hChassisEntries) {
    for (const s of (e.skus || [])) {
      const pn = s.sku || s['Product #'] || '';
      const desc = s.description || s.Description || '';
      const isBto = String(s['Option Type'] || s.optionType || '').toUpperCase() === 'BTO';
      if (!pn || chassisVariantMatrix[pn] || !isCanonicalCtoChassisCandidate({ sku: pn, text: desc, isBto }, filePrefix)) continue;
      chassisVariantMatrix[pn] = _buildHistoricalVariantRecord(s, pn, desc, e, hf);
    }
  }
}

async function backfillVariantMatrixFromHistory(chassisVariantMatrix, targetDir, filePrefix) {
  const historyDir = path.join(targetDir, 'history');
  if (!fs.existsSync(historyDir)) return;

  const histFiles = fs.readdirSync(historyDir)
    .filter(f => f.startsWith('catalog_') && f.endsWith('.json'))
    .sort().reverse();

  const histFilesData = await Promise.all(histFiles.map(async (hf) => {
    try {
      const rawContent = await fs.promises.readFile(path.join(historyDir, hf), 'utf-8');
      return { hf, rawContent };
    } catch (_) {
      return null;
    }
  }));

  for (const data of histFilesData) {
    if (!data) continue;
    const { hf, rawContent } = data;
    if (!/"parentCategory"\s*:\s*"Chassis"|"subCategory"\s*:\s*"Variants"/.test(rawContent)) continue;
    try {
      const hCat = JSON.parse(rawContent);
      appendHistoricalChassisVariantsFromCat(hCat, filePrefix, hf, chassisVariantMatrix);
      if (Object.keys(chassisVariantMatrix).length >= 6) break;
    } catch (err) {
      PipelineLogger.debug('BUILD_CATALOG', `Failed parsing chassis variant from history ${hf}: ${err.message}`);
    }
  }
}

function _buildCatalogVariantRecord(s, pn, e, priceParsed) {
  const desc = s.Description || s.description || '';
  const rec = s['HPE Recommended'] || s.hpeRecommended || 'Unknown';
  return {
    sku: pn,
    description: desc,
    formFactor: detectChassisFormFactor(desc),
    listPrice: priceParsed.priceUsd,
    listPriceFormatted: priceParsed.priceUsd !== null ? `$${priceParsed.priceUsd.toFixed(2)}` : '',
    optionType: s['Option Type'] || s.optionType || 'CTO',
    hpeRecommended: rec,
    'HPE Recommended': rec,
    startDate: s['Start Date'] || '',
    discontinuedDate: s['Discontinued Date'] || '',
    constraint: e.constraint || 'max 1 — Mandatory Base Chassis Selection',
    maxQty: e.maxQty ?? null,
    maxQtySemantics: e.maxQtySemantics || null,
    priceProvenance: s.priceProvenance || (priceParsed.priceUsd > 0 ? 'CATALOG_ROW' : 'UNPRICED'),
    diffStatus: s['Diff Status'] || '',
    priceHistoryTrail: s['Price History Trail'] || ''
  };
}

function _reconcileVariantMatrixFromCatalog(chassisVariantMatrix, enrichedCatalog) {
  if (!enrichedCatalog || !Array.isArray(enrichedCatalog.entries)) return;
  for (const e of enrichedCatalog.entries) {
    const isChassis = (e.parentCategory || '').toLowerCase() === 'chassis' || (e.subCategory || '').toLowerCase() === 'variants';
    for (const s of e.skus || []) {
      const pn = cleanBaseSKU(s.sku || s['Product #']);
      if (!pn || !isValidHpeSKU(pn)) continue;
      if (!isChassis && s['Component Role'] !== 'Base Chassis' && s.rowType !== 'BASE_SYSTEM') continue;
      const p = parseStrictPrice(s.listPrice ?? s['List Price (USD)'] ?? s['Unit Price (USD)'], { row: s, sku: pn });
      const existing = chassisVariantMatrix[pn];
      const existingUnpriced = !existing || existing.listPrice === null || existing.listPrice === 0;
      if (existingUnpriced && (!existing || (p.priceUsd !== null && p.priceUsd > 0))) {
        chassisVariantMatrix[pn] = _buildCatalogVariantRecord(s, pn, e, p);
      }
    }
  }
}

async function buildChassisVariantMatrix(scrapsDir, filePrefix, targetDir, enrichedCatalog = null) {
  const skuTSVRows = parseTSVRows(path.join(scrapsDir, `${filePrefix}_Catalog_SKUs.tsv`));
  const srvTSVRows = parseTSVRows(path.join(scrapsDir, `${filePrefix}_Services_SKUs.tsv`));
  const allTSVRows = [...skuTSVRows, ...srvTSVRows];

  const chassisVariants = allTSVRows
    .filter(isTsvChassisVariantRow)
    .map(mapTsvRowToChassisVariant)
    .filter(v => v.sku && isValidHpeSKU(cleanBaseSKU(v.sku)));

  const chassisVariantMatrix = {};
  for (const v of chassisVariants) {
    chassisVariantMatrix[cleanBaseSKU(v.sku) || v.sku] = v;
  }

  _reconcileVariantMatrixFromCatalog(chassisVariantMatrix, enrichedCatalog);

  if (Object.keys(chassisVariantMatrix).length < 6) {
    await backfillVariantMatrixFromHistory(chassisVariantMatrix, targetDir, filePrefix);
  }

  return chassisVariantMatrix;
}

function loadExistingLearnedRules(rulesJsonPath) {
  if (!fs.existsSync(rulesJsonPath)) return [];
  try {
    const existingRulesObj = JSON.parse(fs.readFileSync(rulesJsonPath, 'utf-8'));
    if (Array.isArray(existingRulesObj.rules)) {
      return existingRulesObj.rules.filter(r => {
        const pc = (r.parentCategory || '').toLowerCase();
        return pc.includes('feedback') || pc.includes('learned');
      });
    }
  } catch (err) {
    PipelineLogger.warn('BUILD_CATALOG', `Failed reading existing learned rules from ${rulesJsonPath}: ${err.message}`);
  }
  return [];
}

function writeCatalogTsvIntermediates(scrapsDir, filePrefix, mainTSV, rulesTSV, summaryTSV, servicesTSV, unavailableRules) {
  fs.mkdirSync(scrapsDir, { recursive: true });
  fs.writeFileSync(path.join(scrapsDir, `${filePrefix}_Catalog_SKUs.tsv`),    mainTSV);
  fs.writeFileSync(path.join(scrapsDir, `${filePrefix}_Catalog_Rules.tsv`),   rulesTSV);
  fs.writeFileSync(path.join(scrapsDir, `${filePrefix}_Catalog_Summary.tsv`), summaryTSV);
  if (unavailableRules && unavailableRules.length > 0) {
    const unavailHeaders = ['Rule ID', 'Rule Type', 'Section', 'Constraint / Reason', 'Affected SKU Count', 'Affected SKUs'];
    const unavailRows = [unavailHeaders.join('\t')];
    unavailableRules.forEach((r, idx) => {
      const id = r.ruleId || `RULE_${idx + 1}`;
      const skus = (r.affectedSkus || []).join(', ');
      unavailRows.push([id, r.ruleType || 'MUTUAL_EXCLUSION', r.parentCategory || 'General', r.ineligibilityReason || r.rule || '', (r.affectedSkus || []).length, skus].join('\t'));
    });
    fs.writeFileSync(path.join(scrapsDir, `${filePrefix}_Unavailable_Rules.tsv`), unavailRows.join('\n'));
  }
  if (servicesTSV && servicesTSV.trim()) {
    fs.writeFileSync(path.join(scrapsDir, `${filePrefix}_Services_SKUs.tsv`), servicesTSV);
  }
}

function deduplicateCatalogRules(ctx, allCombinedEntries, existingLearnedRules) {
  const combinedRules = allCombinedEntries.flatMap(e => (e.rules || []).map(r => ({
    parentCategory: e.parentCategory,
    subCategory: e.subCategory,
    constraint: e.constraint || '',
    maxQty: e.maxQty || '',
    rule: r
  })));

  const dedupeMap = new Map();
  [...(ctx.networkRules || []), ...(ctx.conditionalRules || []), ...(ctx.unavailableRules || []), ...combinedRules, ...existingLearnedRules].forEach(r => {
    const ruleText = r.rule || r.description || '';
    if (!ruleText || ruleText.length < 5) return;
    const key = `${r.parentCategory}|${r.subCategory}|${ruleText.trim()}`;
    if (!dedupeMap.has(key)) {
      dedupeMap.set(key, {
        ...r,
        parentCategory: r.parentCategory,
        subCategory: r.subCategory,
        constraint: r.constraint || '',
        maxQty: r.maxQty || '',
        rule: ruleText.trim()
      });
    }
  });
  return Array.from(dedupeMap.values());
}

async function exportCatalogArtifacts(ctx) {
  const {
    enrichedCatalog, enrichedServicesCatalog, validationResult,
    subcatList, fullText, targetDir, scrapsDir, filePrefix, chassisRoot,
    profile, jsonOutputPath, diagnostics, pipelineLogger,
    JSON_MODE, chassisLabel, catalogBaseName
  } = ctx;

  const rulesJsonPath = path.join(targetDir, `${filePrefix}_Catalog_Rules.json`);
  const existingLearnedRules = loadExistingLearnedRules(rulesJsonPath);

  const allCombinedEntries = [...(enrichedCatalog.entries || []), ...(enrichedServicesCatalog.entries || [])];
  const mainTSV    = generateMainSheet(enrichedCatalog.entries, chassisRoot, profile);
  const rulesTSV   = generateRulesSheet(allCombinedEntries, subcatList, fullText, [...existingLearnedRules, ...(ctx.unavailableRules || [])]);
  const summaryTSV = generateSummarySheet(allCombinedEntries, subcatList);
  const servicesTSV = generateMainSheet(enrichedServicesCatalog.entries, chassisRoot, profile);

  writeCatalogTsvIntermediates(scrapsDir, filePrefix, mainTSV, rulesTSV, summaryTSV, servicesTSV, ctx.unavailableRules);

  const chassisVariantMatrix = await buildChassisVariantMatrix(scrapsDir, filePrefix, targetDir, enrichedCatalog);
  const deduplicatedRules = deduplicateCatalogRules(ctx, allCombinedEntries, existingLearnedRules);
  if (diagnostics?.trace?.rejectedRows?.length > 0) {
    safeWriteJsonAtomic(path.join(targetDir, 'raw_data', 'rejected_rows.json'), {
      schemaVersion: '1.0.0',
      product: filePrefix,
      generatedAt: new Date().toISOString(),
      rejectedCount: diagnostics.trace.summary.rejectedRowsCount || diagnostics.trace.rejectedRows.length,
      rows: diagnostics.trace.rejectedRows
    }, { validateSchema: false });
  }

  if (ctx.smartChassisCombinations && ctx.smartChassisCombinations.length > 0) {
    enrichedCatalog.smartChassisCombinations = ctx.smartChassisCombinations;
  }
  if (ctx.solutionManifest) {
    enrichedCatalog.solutionManifest = ctx.solutionManifest;
  }

  const crypto = require('crypto');
  const snapshotFingerprint = crypto.createHash('sha256')
    .update(JSON.stringify(enrichedCatalog.entries || []))
    .digest('hex');
  enrichedCatalog.metadata.snapshotFingerprint = snapshotFingerprint;

  const rulesJsonData = {
    metadata: {
      ...enrichedCatalog.metadata,
      snapshotFingerprint,
      chassisVariantCount: Object.keys(chassisVariantMatrix).length,
      rulesGeneratedAt: new Date().toISOString()
    },
    chassisVariants: Object.values(chassisVariantMatrix),
    chassisVariantMatrix,
    smartChassisCombinations: ctx.smartChassisCombinations || [],
    solutionManifest: ctx.solutionManifest || null,
    subcategories: enrichedCatalog.subcategories,
    rules: deduplicatedRules
  };

  // Commit Catalog.json first with strict schema validation
  safeWriteJsonAtomic(jsonOutputPath, enrichedCatalog, { validateSchema: true, rejectInvalid: true });
  // Once catalog passes schema validation gate, commit rules companion with matching snapshot fingerprint
  safeWriteJsonAtomic(rulesJsonPath, rulesJsonData);

  const servicesJsonOutputPath = jsonOutputPath.replace('_Catalog.json', '_Services.json');
  safeWriteJsonAtomic(servicesJsonOutputPath, enrichedServicesCatalog, { validateSchema: false, rejectInvalid: false });
  console.log(`  📄 ${filePrefix}_Services.json  (${enrichedServicesCatalog.metadata.totalUniqueSKUs} observed service/software SKUs)`);

  try {
    const { reconcileRebuiltCaptureReceipt } = require('../lib/catalog/catalog_capture_receipt.js');
    reconcileRebuiltCaptureReceipt(targetDir, filePrefix);
  } catch { /* ignore if receipt not present */ }

  pipelineLogger.logStep('Step 6: Atomic Save Output JSON', 'SUCCESS', { path: jsonOutputPath });
  pipelineLogger.finalizeRun(validationResult.isValid ? 'COMPLETED' : 'PARTIAL_SUCCESS', {
    totalUniqueSKUs: enrichedCatalog.metadata?.totalUniqueSKUs,
    validationStats: validationResult.stats
  });

  const catCounts = {};
  for (const e of enrichedCatalog.entries) {
    catCounts[e.parentCategory] = (catCounts[e.parentCategory] || 0) + e.skuCount;
  }

  if (JSON_MODE) {
    const jsonResult = {
      status: 'SUCCESS',
      data: {
        jsonOutputPath,
        chassisLabel,
        metadata: enrichedCatalog.metadata,
        totalEntries: enrichedCatalog.entries.length,
        totalUniqueSKUs: enrichedCatalog.metadata.totalUniqueSKUs,
        rulesCount: rulesJsonData.rules.length,
        categoryBreakdown: catCounts,
        validation: validationResult
      }
    };
    process.stdout.write(JSON.stringify(jsonResult));
  } else {
    console.log('=== FILES SAVED ATOMICALLY ===');
    console.log(`  📄 ${filePrefix}_Catalog_SKUs.tsv    (${mainTSV.split('\n').length} rows)`);
    console.log(`  📄 ${filePrefix}_Catalog_Rules.tsv   (${rulesTSV.split('\n').length} rows)`);
    console.log(`  📄 ${filePrefix}_Catalog_Summary.tsv (${summaryTSV.split('\n').length} rows)`);
    console.log(`  📄 ${filePrefix}_Catalog_Rules.json  (${rulesJsonData.rules.length} rules, dual safety net)`);
    console.log(`  📄 ${catalogBaseName}.json        (structured companion JSON, verified atomic)`);

    diagnostics.finalize(enrichedCatalog, rulesJsonData);

    console.log('\n=== CATEGORY BREAKDOWN ===');
    Object.entries(catCounts).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
      console.log(`  • ${cat.padEnd(35)}: ${count} SKUs`);
    });
    console.log(`  📄 classification_diagnostics.json (observability trace logged)`);
    console.log('\n✅ CLASSIFICATION COMPLETE.');
  }
}

function resolveConditionalRawData(rawData, rawInputPath) {
  const obs = [...(rawData?.conditionalSkus || [])];
  const seen = new Set(obs.map(s => `${cleanBaseSKU(s.sku || '')}|${s.conditionType || ''}|${s.selectorTriggerSku || ''}|${s.ruleContext || ''}`));
  if (rawInputPath) {
    try {
      const condPath = path.join(path.dirname(rawInputPath), 'conditional_skus.json');
      if (fs.existsSync(condPath)) {
        const parsed = JSON.parse(fs.readFileSync(condPath, 'utf8'));
        const extra = Array.isArray(parsed) ? parsed : (parsed.skus || parsed.conditionalSkus || []);
        for (const item of extra) {
          const key = `${cleanBaseSKU(item?.sku || '')}|${item?.conditionType || ''}|${item?.selectorTriggerSku || ''}|${item?.ruleContext || ''}`;
          if (item && !seen.has(key)) {
            seen.add(key);
            obs.push(item);
          }
        }
      }
    } catch (err) {
      PipelineLogger.warn('BUILD_CATALOG', `Failed reading conditional_skus.json from ${rawInputPath}: ${err.message}`);
    }
  }
  return obs;
}

function resolveUnavailableRawData(rawData, rawInputPath) {
  const rules = [...(rawData?.unavailableRules || [])];
  const skus = [...(rawData?.unavailableSkus || [])];
  if (rules.length === 0 && rawInputPath) {
    try {
      const rawDir = path.dirname(rawInputPath);
      const unavailPath = path.join(rawDir, 'unavailable_rules.json');
      if (fs.existsSync(unavailPath)) {
        const parsed = JSON.parse(fs.readFileSync(unavailPath, 'utf8'));
        rules.push(...(parsed.rules || []));
        skus.push(...(parsed.skus || []));
      }
    } catch (err) {
      PipelineLogger.warn('BUILD_CATALOG', `Failed reading unavailable_rules.json from ${rawInputPath}: ${err.message}`);
    }
  }
  return { rules, skus };
}

function resolveNetworkSniffedRawData(rawData, rawInputPath) {
  const rules = [...(rawData?.networkSniffedRules || [])];
  if (rules.length === 0 && rawInputPath) {
    try {
      const rawDir = path.dirname(rawInputPath);
      const sniffedPath = path.join(rawDir, 'network_sniffed_rules.json');
      if (fs.existsSync(sniffedPath)) {
        const parsed = JSON.parse(fs.readFileSync(sniffedPath, 'utf8'));
        const loaded = Array.isArray(parsed) ? parsed : (parsed.rules || parsed.capturedRules || []);
        rules.push(...loaded);
      }
    } catch (err) {
      PipelineLogger.warn('BUILD_CATALOG', `Failed reading network_sniffed_rules.json from ${rawInputPath}: ${err.message}`);
    }
  }
  return rules;
}

function _formatNetworkSniffedRules(rawData, rawInputPath = null) {
  const rules = resolveNetworkSniffedRawData(rawData, rawInputPath);
  return rules
    .filter(r => ['REQUIRED_DEPENDENCY', 'MUTUAL_EXCLUSION', 'CAPACITY_CONSTRAINT', 'THERMAL_CONSTRAINT', 'DYNAMIC_RULE'].includes(r.ruleType))
    .map(r => ({
      parentCategory: r.parentCategory || 'System Options',
      subCategory: r.subCategory || 'Configuration Rules',
      constraint: r.constraint || r.rule,
      maxQty: r.maxQty || '',
      rule: r.rule,
      ruleType: r.ruleType || 'DYNAMIC_RULE',
      affectedSkus: r.affectedSkus || [],
      source: 'BACKEND_NETWORK_SNIFFER'
    }));
}

// ============================================================
// Main Orchestrator
// ============================================================
async function main(rawInputPath = process.argv[2], jsonOutputPath = process.argv[3]) {
  const ctx = await initCatalogBuild(rawInputPath, jsonOutputPath, process.argv);

  const { subcatList } = extractSubcategoriesAndParents(ctx.fullText, ctx.rawData, ctx.IS_VERBOSE);
  ctx.subcatList = subcatList;

  const { hardwareEntries, cleanServicesEntries, smartChassisCombinations } = synthesizeCatalogEntries(
    ctx.tables, ctx.fullText, subcatList, ctx.historyPriceMap, ctx.diagnostics, ctx.profile, ctx.IS_VERBOSE
  );
  ctx.smartChassisCombinations = smartChassisCombinations || [];
  ctx.solutionManifest = extractSolutionManifest(ctx.rawData?.tables || ctx.tables || []);
  const { applyConditionalDiscovery, applyUnavailableDomRulesAndSkus } = require('../lib/catalog/conditional_discovery.js');
  const conditionalObs = resolveConditionalRawData(ctx.rawData, rawInputPath);
  ctx.conditionalRules = applyConditionalDiscovery(
    [...hardwareEntries, ...cleanServicesEntries], conditionalObs, hardwareEntries);
  const unavail = resolveUnavailableRawData(ctx.rawData, rawInputPath);
  ctx.unavailableRules = applyUnavailableDomRulesAndSkus(
    hardwareEntries, cleanServicesEntries, unavail.rules, unavail.skus);
  if (ctx.meta.cleanName === 'Synergy_12000_Frame') {
    // CTO modules selectable within this frame are options. The exact frame
    // base is injected separately from authenticated chassis discovery.
    for (const entry of hardwareEntries) {
      if (entry.parentCategory === 'Chassis') entry.parentCategory = 'Frame Options';
      if (entry.subCategory === 'Variants') entry.subCategory = 'Frame Options';
    }
  }
  ctx.networkRules = _formatNetworkSniffedRules(ctx.rawData, rawInputPath);

  const { enrichedCatalog, enrichedServicesCatalog, validationResult } = await reconcilePriceAndLifecycleHistory(
    hardwareEntries, cleanServicesEntries, subcatList, ctx.targetDir, ctx.filePrefix, ctx.meta, ctx.chassisLabel, ctx.pipelineLogger, ctx.baseSKU, ctx.tables, ctx.chassisDiscovery
  );

  await exportCatalogArtifacts({
    ...ctx,
    enrichedCatalog,
    enrichedServicesCatalog,
    validationResult
  });
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error during classification:', err);
    process.exit(1);
  });
}

module.exports = {
  main,
  createCatalogMetadata,
  initCatalogBuild,
  extractSubcategoriesAndParents,
  expandTableSections,
  parseSingleTableRow,
  matchSubcategoryForTable,
  resolveTableTaxonomyAndRole,
  synthesizeCatalogEntries,
  partitionCatalogEntries,
  injectChassisVariantsFromHistory,
  extractBaseChassisEvidence,
  isCanonicalCtoChassisCandidate,
  extractDiscoveredChassisVariants,
  buildCatalogObject,
  reconcilePriceAndLifecycleHistory,
  buildChassisVariantMatrix,
  detectChassisFormFactor,
  exportCatalogArtifacts,
  parseConstraintMinMax,
  _isInvalidHeaderCandidateRow,
  _isStructuralWrapperTable,
  _reconcileVariantMatrixFromCatalog
};
