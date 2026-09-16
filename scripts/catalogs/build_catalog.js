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
const { computeIncrementalDifferential } = require('../lib/catalog/checksum_diff.js');
const { recordVersionSnapshot } = require('../lib/catalog/sku_versioning.js');
const { cleanBaseSKU, classifyOptionType, isServiceSku, isValidHpeSKU } = require('../lib/catalog/sku.js');
const { generateMainSheet, generateRulesSheet, generateSummarySheet } = require('../lib/catalog/catalog_formatter.js');
const { validateCatalogData } = require('../lib/system/data_validator.js');
const PipelineLogger = require('../lib/system/pipeline_logger.js');
const { ClassificationDiagnostics } = require('../lib/catalog/classification_diagnostics.js');
const { parseProductMeta, synthesizeSubcategoryName, classifyComponentRole } = require('../lib/catalog/product_meta.js');
const { loadProfile } = require('../lib/system/profile_loader.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

function lookupChassisMapBaseSku(chassisLabel, meta, targetSku = '') {
  try {
    const chassisMapPath = path.join(PROJECT_ROOT, 'scripts', 'config', 'chassis_map.json');
    if (!fs.existsSync(chassisMapPath)) return null;
    const cmap = JSON.parse(fs.readFileSync(chassisMapPath, 'utf8'));
    const byFamilyGen = cmap.chassis_base_skus_by_family_gen || {};
    const cleanNorm = (meta?.cleanName || chassisLabel || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanTarget = cleanBaseSKU(targetSku || '');

    // 1. Match specific group by key or modelFamily
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

    // 2. Fallback to candidate base SKUs in chassis_base_skus
    const baseSkus = cmap.chassis_base_skus || {};
    if (cleanTarget && baseSkus[cleanTarget]) {
      return { sku: cleanTarget, ...baseSkus[cleanTarget] };
    }
    for (const [skuId, info] of Object.entries(baseSkus)) {
      const normModel = (info.model || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const famMatch = (info.family || '').toLowerCase() === (meta?.family || '').toLowerCase();
      const genMatch = (info.gen || '').toLowerCase() === (meta?.gen || '').toLowerCase();
      if (famMatch && genMatch && normModel && cleanNorm.includes(normModel)) {
        return { sku: skuId, ...info };
      }
    }
  } catch (_) {}
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
  { keywords: ['software', 'license', 'operating system', 'windows server', 'windows cal', 'cal pack', 'red hat', 'suse', 'vmware', 'ilo', 'oneview'], parent: 'Software & Licenses' },
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
  'processor': { constraint: 'min 1, max 2', minQty: 1, maxQty: 2 },
  'processors': { constraint: 'min 1, max 2', minQty: 1, maxQty: 2 },
  'memory': { constraint: 'max 32', minQty: 0, maxQty: 32 },
  'power supplies': { constraint: 'min 1, max 2', minQty: 1, maxQty: 2 },
  'power supply': { constraint: 'min 1, max 2', minQty: 1, maxQty: 2 },
  'pcie risers': { constraint: 'max 3', minQty: 0, maxQty: 3 },
  'pcie riser': { constraint: 'max 3', minQty: 0, maxQty: 3 },
  'chassis': { constraint: 'min 1, max 1 — Mandatory Base Chassis Selection', minQty: 1, maxQty: 1 },
  'storage controllers': { constraint: 'max 4', minQty: 0, maxQty: 4 },
  'storage controller': { constraint: 'max 4', minQty: 0, maxQty: 4 },
  'drive enclosures / drives': { constraint: 'max 24', minQty: 0, maxQty: 24 },
  'networking': { constraint: 'max 8', minQty: 0, maxQty: 8 },
  'cooling / thermal': { constraint: 'max 6', minQty: 0, maxQty: 6 },
  'software & licenses': { constraint: 'no max', minQty: 0, maxQty: -1 },
  'accessories & infrastructure': { constraint: 'optional', minQty: 0, maxQty: -3 }
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
  entries.forEach(e => (e.skus || []).forEach(s => set.add(s.sku || s['Product #'])));
  return set.size;
}

function isServiceCategoryEntry(e) {
  const pc = (e.parentCategory || '').toLowerCase();
  return pc.includes('service') || pc.includes('pointnext') || pc.includes('tech care') || pc.includes('support');
}

function isServiceSkuRow(sku) {
  return sku?.optionType === 'Service' || sku?.['Option Type'] === 'Service' ||
    isServiceSku(sku?.sku || sku?.['Product #'] || '');
}

function isClearlyPhysicalSkuRow(sku) {
  const description = String(sku?.Description || sku?.description || '');
  if (/\b(?:software|license|subscription|support|service|saas|e-ltu|care pack)\b/i.test(description)) return false;
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

    const hardwareSkus = (entry.skus || []).filter(sku => !isServiceSkuRow(sku));
    const serviceSkus = (entry.skus || []).filter(isServiceSkuRow);
    if (hardwareSkus.length > 0) hardwareEntries.push({ ...entry, skus: hardwareSkus, skuCount: hardwareSkus.length });
    if (serviceSkus.length > 0) servicesEntries.push({ ...entry, skus: serviceSkus, skuCount: serviceSkus.length });
  }
  return { hardwareEntries, servicesEntries };
}

// ============================================================
// Pipeline Stage 1: Ingestion & Environment Setup
// ============================================================
async function initCatalogBuild(rawInputPath, jsonOutputPath, argv = process.argv) {
  const IS_VERBOSE = argv.includes('--verbose') || argv.includes('-v');
  const JSON_MODE  = argv.includes('--json');

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
    try { chassisDiscovery = JSON.parse(fs.readFileSync(discoveryPath, 'utf8')); } catch (_) {}
  }
  const fullText = rawData.fullText || rawData.bodyText || '';
  const tables   = rawData.tables || [];
  diagnostics.setRawTableCount(tables.length);

  const meta = parseProductMeta(chassisLabel);
  const profile = await loadProfile(meta.family, meta.gen);

  console.log(`Loaded Raw Scrape Payload:`);
  console.log(`  Page Title:   "${rawData.pageTitle || 'N/A'}"`);
  console.log(`  Full Text:    ${fullText.length.toLocaleString()} chars`);
  console.log(`  Total Tables: ${tables.length}`);

  const _ctoIdx       = fullText.indexOf('Configure-to-order');
  const _searchArea   = _ctoIdx > -1 ? fullText.substring(_ctoIdx, _ctoIdx + 300) : fullText.substring(0, 500);
  const _baseSKUMatch = _searchArea.match(/\b([A-Z]\d{5}-[A-Z]\d{2}[A-Z0-9]*|[A-Z0-9]{6})\b/);
  const discoveredSku = cleanBaseSKU(chassisDiscovery?.selectedSku || '');
  const mapChassis    = lookupChassisMapBaseSku(chassisLabel, meta, discoveredSku || (_baseSKUMatch ? _baseSKUMatch[1] : ''));
  const baseSKU       = discoveredSku || (_baseSKUMatch ? _baseSKUMatch[1] : '') || mapChassis?.sku || '';
  const chassisRoot   = baseSKU ? `${chassisLabel} [${baseSKU}]` : chassisLabel;
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
      } catch (_) {}
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
function loadPortfolioPriceBackfill(historyPriceMap, targetDir) {
  let backfillCount = 0;
  try {
    // Walk up to the outputs root (e.g. outputs/ProLiant/Gen11/DL360_Gen11 → outputs)
    const outputsRoot = path.resolve(targetDir, '..', '..', '..');
    if (!fs.existsSync(outputsRoot)) return 0;

    const currentDirName = path.basename(targetDir);
    const catalogFiles = [];

    // Recursively find all *_Catalog.json files under outputs/
    const walkDir = (dir, depth = 0) => {
      if (depth > 4) return; // Safety limit
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory() && entry.name !== 'history' && entry.name !== 'temp' &&
              entry.name !== 'intermittent_scraps' && entry.name !== 'raw_data' &&
              entry.name !== 'reports' && entry.name !== 'services_history' &&
              entry.name !== 'node_modules') {
            // Skip the current chassis directory to avoid self-reference
            if (entry.name === currentDirName && depth > 0) continue;
            walkDir(fullPath, depth + 1);
          } else if (entry.isFile() && entry.name.endsWith('_Catalog.json') &&
                     !entry.name.includes('Services') && !entry.name.includes('Rules')) {
            catalogFiles.push(fullPath);
          }
        }
      } catch (_) {}
    };

    walkDir(outputsRoot);

    for (const catPath of catalogFiles) {
      try {
        const cat = JSON.parse(fs.readFileSync(catPath, 'utf-8'));
        const entries = cat.entries || [];
        for (const entry of entries) {
          const skus = entry.skus || [];
          for (const sku of skus) {
            const pn = (sku['Product #'] || sku.sku || '').toUpperCase();
            const price = sku.listPrice || parseFloat(sku['Unit Price (USD)']) || 0;
            if (pn && price > 0 && !historyPriceMap.has(pn)) {
              historyPriceMap.set(pn, price.toFixed(2));
              backfillCount++;
            }
          }
        }
      } catch (_) {}
    }
  } catch (_) {}
  return backfillCount;
}

// ============================================================
// Pipeline Stage 2: Subcategories & Parent Taxonomy
// ============================================================
function extractSubcategoriesAndParents(fullText, rawData, IS_VERBOSE) {
  console.log('--- Step 1: Extracting Subcategories & Quantity Constraints ---');

  const subcatRegex = /\n([^\n]{3,80})\s*\(((?:min\s+\d+\s*,\s*)?(?:max\s+\d+|required|no max|optional)(?:\s*,\s*min\s+\d+)?|min\s+\d+)\)/gi;
  subcatRegex.lastIndex = 0;
  const subcatList = [];
  let match;
  while ((match = subcatRegex.exec(fullText)) !== null) {
    let name = match[1].trim().replace(/^[\s\n\r\t]+/, '').trim();
    if (name.length < 3 || name.length > 80) continue;
    if (name.match(/^\d{4}/)) continue;
    if (name.includes('\t')) continue;

    const constraintRaw = match[2].toLowerCase();
    const minMatch = constraintRaw.match(/min\s+(\d+)/);
    const maxMatch = constraintRaw.match(/max\s+(\d+)/);
    let minQty = minMatch ? parseInt(minMatch[1], 10) : 0;
    let maxQty = maxMatch ? parseInt(maxMatch[1], 10) : 0;
    if (constraintRaw.includes('no max')) maxQty = -1;
    if (constraintRaw.includes('required')) { maxQty = -2; minQty = minQty || 1; }
    if (constraintRaw === 'optional') maxQty = -3;

    subcatList.push({
      name,
      constraint: match[2],
      minQty,
      maxQty,
      textIndex: match.index
    });
  }

  // Current OCA renders min/max labels in nested table cells, while body
  // innerText may flatten the parentheses into unrelated lines. Recover those
  // authoritative constraints directly from the captured table tree.
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

        const minMatch = constraint.match(/min\s+(\d+)/i);
        const maxMatch = constraint.match(/max\s+(\d+)/i);
        let minQty = minMatch ? parseInt(minMatch[1], 10) : 0;
        let maxQty = maxMatch ? parseInt(maxMatch[1], 10) : 0;
        if (/no max/i.test(constraint)) maxQty = -1;
        if (/required/i.test(constraint)) { maxQty = -2; minQty = minQty || 1; }
        if (/optional/i.test(constraint)) maxQty = -3;

        const followingRows = (table.rows || []).slice(rowIndex + 1);
        const firstSku = followingRows.flat().map(value => cleanBaseSKU(value)).find(isValidHpeSKU);
        const textIndex = firstSku ? fullText.indexOf(firstSku) : fullText.indexOf(name);
        subcatList.push({ name, constraint, minQty, maxQty, textIndex: Math.max(0, textIndex), source: 'OCA table constraint' });
        seenSubcategories.add(key);
      }
    }
  }
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
        if (idx > NAV_MENU_END) { bestIdx = idx; break; }
        searchPos = Math.max(searchPos + 1, idx + p.length);
      }
    }
    if (bestIdx > -1) {
      mainCatPositions.push({ name: mc, index: bestIdx });
    }
  }
  mainCatPositions.sort((a, b) => a.index - b.index);

  console.log(`Discovered ${mainCatPositions.length} active Main Category headers in content area:`);
  mainCatPositions.forEach(mc => console.log(`  • ${mc.name.padEnd(35)} (position ${mc.index})`));

  let unclassifiedSubcats = 0;
  for (const sc of subcatList) {
    let parent = getParentCategory(sc.textIndex, mainCatPositions);
    if (parent === 'Unknown') {
      const directMatch = mainCategories.find(mc =>
        sc.name.toLowerCase() === mc.toLowerCase() || sc.name.toLowerCase().includes(mc.toLowerCase())
      );
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

function parseSingleTableRow(row, headers, offset, historyPriceMap) {
  const obj = {};
  for (let hi = 0; hi < headers.length; hi++) {
    let header = headers[hi];
    const cellIdx = hi + offset;
    if (header && cellIdx < row.length) {
      const normalizedHeader = String(header).trim().toLowerCase();
      if (normalizedHeader === 'list price' || normalizedHeader === 'price' || normalizedHeader === 'price (usd)' || normalizedHeader === 'cost (usd)' || normalizedHeader === 'cost') {
        header = 'Unit Price (USD)';
      } else if (normalizedHeader === 'product description') {
        header = 'Description';
      } else if (normalizedHeader === 'qty' || normalizedHeader === 'quantity') {
        header = 'Current Qty';
      } else if (/^start(?: date)?$/.test(normalizedHeader)) {
        header = 'Start Date';
      } else if (/^(?:discontinued|obsolete|end)(?: date)?$/.test(normalizedHeader)) {
        header = 'Discontinued Date';
      } else if (/^(?:availability|available|supply status)$/.test(normalizedHeader)) {
        header = 'Availability';
      } else if (/^(?:lead time|estimated delivery|delivery estimate|edt)$/.test(normalizedHeader)) {
        header = 'Lead Time';
      }
      let val = row[cellIdx].replace(/\n/g, ' ').trim();
      if (header === 'Unit Price (USD)') {
        val = val.replace(/[\$,]/g, '').trim();
      }
      obj[header] = val;
    }
  }

  let rawPN = obj['Product #'] || '';
  const stripLifecycleBadge = value => String(value || '').replace(/\s*\[(?:OB|DS|90|EOL)\]\s*/ig, '').trim();
  if (!rawPN || !isValidHpeSKU(cleanBaseSKU(stripLifecycleBadge(rawPN)))) {
    const foundCell = row.find(c => isValidHpeSKU(cleanBaseSKU(stripLifecycleBadge(c))));
    if (foundCell) rawPN = foundCell;
  }

  let lifecycleStatus = 'Active';
  let lifecycleBadge = '';
  const badgeMatch = String(rawPN).match(/^(OB|DS|90|EOL)\b/i) || String(rawPN).match(/\[(OB|DS|90|EOL)\]/i);
  if (badgeMatch) {
    lifecycleBadge = badgeMatch[1].toUpperCase();
    if (lifecycleBadge === 'OB') lifecycleStatus = 'Obsolete (OB)';
    else if (lifecycleBadge === 'DS') lifecycleStatus = 'Direct Ship (DS)';
    else if (lifecycleBadge === '90') lifecycleStatus = 'EOL Warning (90-Day)';
    else if (lifecycleBadge === 'EOL') lifecycleStatus = 'End of Life (EOL)';
  }

  if (rawPN) rawPN = cleanBaseSKU(stripLifecycleBadge(rawPN));
  if (!rawPN || !isValidHpeSKU(rawPN)) return null;

  const pn = rawPN.toUpperCase();
  obj['Product #'] = pn;
  obj.sku = pn;
  obj['Option Type'] = classifyOptionType(pn);
  obj['CLIC Status'] = lifecycleStatus;
  obj['Lifecycle Status'] = lifecycleStatus;
  obj.lifecycleStatus = lifecycleStatus;
  obj.lifecycleBadge = lifecycleBadge;
  obj.Availability = String(obj.Availability || '').trim() || (lifecycleStatus === 'Active' ? 'Not published by OCA' : lifecycleStatus);
  obj['Lead Time'] = String(obj['Lead Time'] || '').trim();
  obj['Lead Time Source'] = obj['Lead Time'] ? 'OCA row attribute' : 'Not published by OCA';

  const dateMatches = row.filter(c => /^\d{2}\/\d{2}\/\d{4}$/.test(c.trim()));
  if (dateMatches.length >= 1 && !obj['Start Date']) obj['Start Date'] = dateMatches[0].trim();
  if (dateMatches.length >= 2 && !obj['Discontinued Date']) obj['Discontinued Date'] = dateMatches[1].trim();

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
    descText = `HPE ProLiant Server Option (${pn})`;
  }
  obj['Description'] = descText;

  const canonicalKeys = new Set([
    'Product #', 'Description', 'Current Qty', 'Unit Price (USD)', 'Price (USD)', 'Price',
    'Option Type', 'CLIC Status', 'Lifecycle Status', 'Start Date', 'Discontinued Date',
    'Availability', 'Lead Time', 'Lead Time Source'
  ]);
  obj.vendorAttributes = Object.fromEntries(Object.entries(obj).filter(([key, value]) =>
    !canonicalKeys.has(key) && !['sku', 'lifecycleStatus', 'lifecycleBadge'].includes(key) && String(value ?? '').trim()
  ));

  const rawQty = String(obj['Current Qty'] || obj['Quantity'] || '0').replace(/\s+/g, '').trim();
  obj['Current Qty'] = /^\d+$/.test(rawQty) ? rawQty : '0';
  delete obj['Quantity'];

  let priceStr = String(obj['Unit Price (USD)'] || obj['Price (USD)'] || obj['Price'] || '').replace(/[\$,]/g, '').trim();
  const hasPriceHeader = headers.some(h => {
    const nh = String(h).trim().toLowerCase();
    return nh === 'unit price (usd)' || nh === 'price (usd)' || nh === 'cost (usd)' || nh === 'list price' || nh === 'price' || nh === 'cost';
  });
  if (isNaN(parseFloat(priceStr)) || priceStr === pn || parseFloat(priceStr) < 0) {
    // Only attempt fallback if a price-type header existed but the value was bad.
    // If the OCA page simply didn't render a price column, record $0.00 and let
    // history/chassis_map backfill handle it. This prevents picking up Bus Width,
    // Core Count, Wattage, or other numeric vendor attribute columns as prices.
    if (hasPriceHeader) {
      const qtyVal = String(obj['Current Qty'] || obj['Quantity'] || '').trim();
      const numCell = row.find(c => {
        const raw = c.trim();
        const p = raw.replace(/[\$,]/g, '').trim();
        // Must look like a price: has $, comma separator, or decimal cents
        const looksLikePrice = raw.includes('$') || raw.includes(',') || /^\d+\.\d{2}$/.test(p);
        return p && looksLikePrice && !isNaN(parseFloat(p)) && parseFloat(p) >= 0 && c !== pn
          && p !== qtyVal && !/^[A-Z]\d{5}/.test(raw);
      });
      priceStr = numCell ? numCell.replace(/[\$,]/g, '').trim() : '0.00';
    } else {
      priceStr = '0.00';
    }
  }
  if ((!priceStr || parseFloat(priceStr) === 0) && historyPriceMap.has(pn)) {
    priceStr = historyPriceMap.get(pn);
  }
  obj['Unit Price (USD)'] = priceStr;
  obj.listPrice = parseFloat(priceStr) || 0;

  if (/\bTAA\b|TAA Compliant|\bGTA\b|#GTA/i.test(pn) || /\bTAA\b|TAA Compliant|\bGTA\b|#GTA/i.test(descText)) {
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
      const words = sc.name.toLowerCase().split(/[\s\/\-,()]+/).filter(w => w.length >= 3);
      if (words.length === 0) continue;
      let score = 0;
      for (const w of words) {
        if (searchText.includes(w)) score++;
      }
      if (searchText.includes(sc.name.toLowerCase())) score += words.length;
      if (score > bestScore) { bestScore = score; bestSubcat = sc; }
    }
    if (bestSubcat && (bestScore >= 2 || bestScore >= Math.ceil(bestSubcat.name.split(/[\s\/\-,()]+/).filter(w => w.length >= 3).length * 0.5))) {
      matchedSubcat = bestSubcat;
    }
  }

  // If not matched by score, leave matchedSubcat = null so that SKU descriptions
  // and role classification can accurately determine the taxonomy.

  return { matchedSubcat, textPos };
}

function resolveTableTaxonomyAndRole(matchedSubcat, textPos, table, tableRules, profile, skus) {
  let parentCat = matchedSubcat ? matchedSubcat.parentCategory :
                  (textPos > -1 ? getParentCategory(textPos, []) : 'Unknown');
  let subCat    = matchedSubcat ? matchedSubcat.name : (table.label || '(Sub-table)');

  if (table.subTab) parentCat = table.subTab;
  if (table.label)  subCat    = table.label;

  const sampleDesc = skus.map(s => s['Description'] || '').join(' ');
  const detectedRole = classifyComponentRole(subCat, sampleDesc, profile);

  if (!subCat || subCat === '(Sub-table)') {
    subCat = synthesizeSubcategoryName(parentCat, sampleDesc, tableRules);
  }

  const subCatLower = (subCat || '').toLowerCase();
  let matchedParent = null;
  for (const mapEntry of SUBCAT_KEYWORD_PARENT_MAP) {
    if (mapEntry.keywords.some(k => subCatLower.includes(k))) {
      matchedParent = mapEntry.parent;
      break;
    }
  }

  let matchedVia = 'fallback_accessories';
  if (matchedParent && matchedParent !== 'Accessories & Infrastructure') {
    parentCat = matchedParent;
    matchedVia = 'direct_taxonomy_keyword';
  } else if (detectedRole && detectedRole !== 'Option Component' && ROLE_TO_PARENT_MAP[detectedRole]) {
    parentCat = ROLE_TO_PARENT_MAP[detectedRole];
    matchedVia = 'role_classifier';
    if (!table.label || subCat === '(Sub-table)' || !subCatLower.includes(parentCat.toLowerCase().split(' ')[0])) {
      const synthesized = synthesizeSubcategoryName(parentCat, sampleDesc, tableRules);
      if (synthesized && !synthesized.includes('Options')) {
        subCat = synthesized;
      }
    }
  } else if (matchedParent) {
    parentCat = matchedParent;
    matchedVia = 'direct_taxonomy_keyword';
  } else if (!parentCat || parentCat === 'Unknown') {
    parentCat = 'Accessories & Infrastructure';
  } else {
    matchedVia = matchedSubcat ? 'portal_text_position' : 'portal_parent';
  }

  const defaultConstraintObj = CATEGORY_DEFAULT_CONSTRAINTS[parentCat.toLowerCase()] || {};
  let finalConstraint = matchedSubcat && matchedSubcat.constraint ? matchedSubcat.constraint : (defaultConstraintObj.constraint || '');
  let finalMaxQty = matchedSubcat && matchedSubcat.maxQty ? matchedSubcat.maxQty : (defaultConstraintObj.maxQty || '');
  let finalMinQty = matchedSubcat && matchedSubcat.minQty ? matchedSubcat.minQty : (defaultConstraintObj.minQty || 0);

  if (table.constraintText) {
    finalConstraint = table.constraintText;
    const minMatch = finalConstraint.match(/min\s+(\d+)/i);
    const maxMatch = finalConstraint.match(/max\s+(\d+)/i);
    if (minMatch) finalMinQty = parseInt(minMatch[1], 10);
    if (maxMatch) finalMaxQty = parseInt(maxMatch[1], 10);
    if (finalConstraint.includes('no max')) finalMaxQty = -1;
    if (finalConstraint.includes('required')) { finalMaxQty = -2; finalMinQty = finalMinQty || 1; }
    if (finalConstraint.includes('optional')) finalMaxQty = -3;
  }

  if (tableRules.length === 0 && finalConstraint) {
    tableRules.push(`Selection constraint for ${subCat}: ${finalConstraint}`);
  }

  return { parentCat, subCat, finalConstraint, finalMinQty, finalMaxQty, detectedRole, matchedParent, matchedVia };
}

function synthesizeCatalogEntries(tables, fullText, subcatList, historyPriceMap, diagnostics, profile, IS_VERBOSE) {
  console.log('\n--- Step 3: Extracting Tables & SKUs ---');

  let sourceTables = tables;
  if (tables.length > 1 && tables[0].rows && tables[0].rows.length > 500) {
    sourceTables = tables.slice(1);
  }

  const expandedTables = expandTableSections(sourceTables);
  const allSKURows   = [];
  const allSKUMap    = new Map();
  const processedPNs = new Set();
  const tableEntries = [];
  let skippedTables  = 0;

  for (let ti = 0; ti < expandedTables.length; ti++) {
    const table = expandedTables[ti];
    if (!table.rows || table.rows.length < 2) {
      diagnostics.recordSkippedTable(ti, 'Table rows < 2 or empty');
      skippedTables++;
      continue;
    }

    const firstRowsText = (table.rows.slice(0, 3).map(r => r.join(' ')).join(' ')).toLowerCase();
    if (firstRowsText.includes('node level quantity') || firstRowsText.includes('support install action')) {
      diagnostics.recordSkippedTable(ti, 'BOM summary report table header');
      skippedTables++;
      continue;
    }
    const allHeaderCells = (table.rows[0] || []).map(c => String(c || '').toLowerCase().trim());
    const isHierarchyBOMTable = allHeaderCells.includes('hierarchy') ||
                                (allHeaderCells.includes('config name') && allHeaderCells.includes('unit reseller price (usd)')) ||
                                (allHeaderCells.includes('qty') && allHeaderCells.includes('product #') && allHeaderCells.includes('config name'));
    if (isHierarchyBOMTable) {
      diagnostics.recordSkippedTable(ti, 'Solution hierarchy BOM summary table');
      skippedTables++;
      continue;
    }

    let headerIdx  = -1;
    let headers    = [];
    let tableRules = [];
    let tableAvailability = '';

    for (let ri = 0; ri < Math.min(4, table.rows.length); ri++) {
      const row = table.rows[ri];
      const hasProductHeader = row.some(c => c === 'Product #' || c === 'Product # / Option');
      const hasDescHeader    = row.some(c => c === 'Description' || c === 'Product Description');

      if (hasProductHeader || hasDescHeader) {
        headerIdx = ri;
        headers   = row.filter(h => h.length > 0).map(h => h === 'Product Description' ? 'Description' : h);
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
      const hasAnySku = table.rows.some(r => r.some(c => isValidHpeSKU(cleanBaseSKU(c.trim()))));
      if (hasAnySku) {
        headers = ['Product #', 'Description', 'Quantity', 'Price (USD)', 'Price Delta (USD)', 'Extended Price (USD)', 'HPE Recommended', 'Start', 'Discontinued'];
        headerIdx = -1;
      } else {
        diagnostics.recordSkippedTable(ti, 'No valid SKU or headers detected');
        skippedTables++;
        continue;
      }
    }

    const skus = [];
    for (let ri = headerIdx + 1; ri < table.rows.length; ri++) {
      const row = table.rows[ri];
      if (row.length < 2) continue;

      let offset = 0;
      if (headers[0] === 'Product #' && row[0] === '' && row.length > headers.length) offset = 1;

      const parsed = parseSingleTableRow(row, headers, offset, historyPriceMap);
      if (!parsed) continue;

      const { obj, pn, descText } = parsed;
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

    if (skus.length === 0) {
      skippedTables++;
      continue;
    }

    const { matchedSubcat, textPos } = matchSubcategoryForTable(skus, headers, fullText, subcatList, ti, tables.length);
    const { parentCat, subCat, finalConstraint, finalMinQty, finalMaxQty, detectedRole, matchedVia } =
      resolveTableTaxonomyAndRole(matchedSubcat, textPos, table, tableRules, profile, skus);

    if (parentCat === 'Chassis' || subCat.toLowerCase().includes('variants') || skus.some(s => (s['Description'] || '').toLowerCase().includes('configure-to-order'))) {
      skus.forEach(sku => { sku['Option Type'] = 'CTO'; });
    }

    tableEntries.push({
      tableIndex:     ti,
      parentCategory: parentCat,
      subCategory:    subCat,
      constraint:     finalConstraint,
      minQty:         finalMinQty,
      maxQty:         finalMaxQty,
      rules:          tableRules,
      headers,
      skuCount:       skus.length,
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
      skuCount: skus.length,
      rules: tableRules
    });

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

      const hasValidPrice = (r) => {
        const p = String(r['Unit Price (USD)'] || r['Price (USD)'] || r['Price'] || '').replace(/[\$,\s]/g, '');
        return !isNaN(parseFloat(p)) && parseFloat(p) > 0;
      };

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

    if (IS_VERBOSE) {
      console.log(`  Table #${ti}: ${skus.length} SKUs → Subcat: "${matchedSubcat ? matchedSubcat.name : '(Sub-table)'}" (${parentCat})`);
    }
  }

  console.log(`Processed ${tableEntries.length} valid product tables (${skippedTables} non-SKU/wrapper tables skipped).`);
  allSKURows.push(...allSKUMap.values());
  console.log(`Extracted ${processedPNs.size} unique SKUs.`);

  // Step 4: Merging sub-tables
  console.log('\n--- Step 4: Merging Sub-Tables & Subcategory Inheritance ---');
  const orderedEntries = [...tableEntries].sort((a, b) => a.tableIndex - b.tableIndex);
  let lastMatchedSubcat = null;
  let mergedSubtableCount = 0;

  for (const entry of orderedEntries) {
    if (entry.subCategory !== '(Sub-table)') {
      lastMatchedSubcat = entry;
    } else if (lastMatchedSubcat) {
      entry.parentCategory = lastMatchedSubcat.parentCategory;
      entry.subCategory    = lastMatchedSubcat.subCategory;
      entry.constraint     = lastMatchedSubcat.constraint;
      entry.minQty         = lastMatchedSubcat.minQty;
      entry.maxQty         = lastMatchedSubcat.maxQty;
      mergedSubtableCount++;
    }
  }
  console.log(`Merged ${mergedSubtableCount} sub-tables into preceding parent subcategories (DOM index order).`);

  // OCA occasionally places service-like SKUs in a table that also contains
  // physical accessories. Classifying the entire table from one service SKU
  // silently moved valid rails/cables/kits out of the hardware catalog. Split
  // mixed tables at row granularity and preserve the original taxonomy.
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

  return {
    hardwareEntries,
    cleanServicesEntries,
    tableEntries,
    allSKUMap,
    processedPNs
  };
}

// ============================================================
// Pipeline Stage 4: Historical Reconcile & Diff Engine
// ============================================================
function extractBaseChassisEvidence(tables, baseSKU, chassisLabel, chassisDiscovery = null, meta = null) {
  const mapInfo = lookupChassisMapBaseSku(chassisLabel, meta, baseSKU);
  const effectiveSku = cleanBaseSKU(baseSKU || mapInfo?.sku || '');
  if (!effectiveSku) return null;

  const discovered = (chassisDiscovery?.candidates || []).find(candidate =>
    cleanBaseSKU(candidate.sku) === effectiveSku && candidate.eligible !== false
  );

  if (discovered || mapInfo) {
    let rawDesc = discovered?.description || discovered?.text || mapInfo?.description || `${chassisLabel} Configure-to-order Server`;
    rawDesc = rawDesc.replace(/^[A-Z0-9-]+\s*-\s*/, '').trim();
    let price = Number(discovered?.listPriceUsd || 0);
    if (!price || price <= 0) {
      price = Number(mapInfo?.listPrice || 0);
    }
    return {
      'Product #': effectiveSku,
      sku: effectiveSku,
      'Option Type': 'CTO',
      'Component Role': 'Base Chassis',
      Description: rawDesc,
      'Current Qty': '1',
      'Unit Price (USD)': price > 0 ? price.toFixed(2) : '0.00',
      listPrice: price,
      'CLIC Status': discovered?.status || 'Active',
      'Lifecycle Status': discovered?.status || 'Active',
      lifecycleStatus: discovered?.status || 'Active',
      Availability: discovered?.availability || 'Available in OCA product catalog',
      'Lead Time': discovered?.leadTime || chassisDiscovery?.deliveryEstimate || 'EDT 17 - 21 days',
      'Lead Time Source': discovered?.leadTime || chassisDiscovery?.deliveryEstimate ? 'OCA configuration estimate' : 'OCA standard configuration estimate',
      'Start Date': discovered?.startDate || mapInfo?.startDate || '',
      'Discontinued Date': discovered?.discontinuedDate || '',
      provenance: chassisDiscovery?.source || 'HPE OCA product catalog metadata'
    };
  }

  for (const table of tables || []) {
    for (const row of table.rows || []) {
      const skuIndex = row.findIndex(cell => cleanBaseSKU(cell) === effectiveSku);
      if (skuIndex < 0) continue;
      const description = row.slice(skuIndex + 1).find(cell => /configure-to-order|cto server/i.test(String(cell || '')));
      if (description) {
        const price = Number(mapInfo?.listPrice || 0);
        return {
          'Product #': effectiveSku,
          sku: effectiveSku,
          'Option Type': 'CTO',
          'Component Role': 'Base Chassis',
          Description: String(description).replace(/^[A-Z0-9-]+\s*-\s*/, '').trim(),
          'Current Qty': '1',
          'Unit Price (USD)': price > 0 ? price.toFixed(2) : '0.00',
          listPrice: price,
          'CLIC Status': 'Active',
          'Lifecycle Status': 'Active',
          lifecycleStatus: 'Active',
          Availability: 'Available in active OCA configuration',
          'Lead Time': chassisDiscovery?.deliveryEstimate || '',
          'Lead Time Source': chassisDiscovery?.deliveryEstimate ? 'OCA configuration estimate' : 'Not published by OCA',
          provenance: `OCA active configuration for ${chassisLabel}`
        };
      }
    }
  }
  return null;
}

function isCanonicalCtoChassisCandidate(candidate, chassisLabel) {
  const text = String(candidate?.description || candidate?.text || '').trim();
  const sku = cleanBaseSKU(candidate?.sku || '');
  if (!sku || !isValidHpeSKU(sku) || !text || candidate?.eligible === false) return false;
  if (candidate?.isBto || candidate?.isTaa || candidate?.isGta || /\b(?:TAA|GTA|BTO)\b|#GTA/i.test(text)) return false;
  const expected = parseProductMeta(chassisLabel).cleanName;
  const observed = parseProductMeta(text).cleanName;
  if (expected !== observed || !/configure[\s-]+to[\s-]+order|\bcto\b/i.test(text)) return false;
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
    } catch (_) {}
  }
  return result;
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
    const description = String(candidate.description || candidate.text || previous.Description || '')
      .replace(/^\s*[A-Z0-9-]+(?:#GTA)?\s*-\s*/i, '').trim();
    const currentPrice = Number(candidate.listPriceUsd || 0);
    const historicalPrice = Number(previous.listPrice || previous['Unit Price (USD)'] || previous['Price (USD)'] || 0);
    const mapInfo = lookupChassisMapBaseSku(chassisLabel, null, productNumber);
    const mapPrice = Number(mapInfo?.listPrice || 0);
    // Authoritative chassis_map listPrice must take precedence over unverified/stale historicalPrice
    const price = currentPrice > 0 ? currentPrice : (mapPrice > 0 ? mapPrice : (historicalPrice > 0 ? historicalPrice : 0));
    const isSelectedVariant = cleanBaseSKU(chassisDiscovery.selectedSku || '') === productNumber;
    const leadTime = candidate.leadTime || (isSelectedVariant ? (chassisDiscovery.deliveryEstimate || 'EDT 17 - 21 days') : '');
    bySku.set(productNumber, {
      'Product #': productNumber,
      sku: productNumber,
      'Option Type': 'CTO',
      'Component Role': 'Base Chassis',
      Description: description || `${chassisLabel} Configure-to-order Server`,
      'Current Qty': '1',
      'Unit Price (USD)': price > 0 ? price.toFixed(2) : '0.00',
      listPrice: price,
      'CLIC Status': candidate.status || 'Active',
      'Lifecycle Status': candidate.status || 'Active',
      lifecycleStatus: candidate.status || 'Active',
      Availability: candidate.availability || 'Available in OCA product catalog',
      'Lead Time': leadTime,
      'Lead Time Source': leadTime ? (candidate.leadTime ? 'OCA candidate estimate' : 'OCA configuration estimate') : '',
      'Start Date': candidate.startDate || previous['Start Date'] || '',
      'Discontinued Date': candidate.discontinuedDate || previous['Discontinued Date'] || '',
      provenance: chassisDiscovery.source || 'HPE OCA product search'
    });
  }
  return Array.from(bySku.values());
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
      rules: ['Select exactly one currently discoverable, non-TAA/non-GTA CTO base chassis'],
      headers: ['Product #', 'Description', 'Unit Price (USD)', 'Start Date', 'Discontinued Date', 'Lead Time'],
      skuCount: discoveredVariants.length,
      skus: discoveredVariants
    });
    console.log(`  📦 ${discoveredVariants.length} active exact-product CTO chassis variant(s) injected from current OCA discovery.`);
    return;
  }

  let injectedFromHistory = false;
  const historyDir = path.join(targetDir, 'history');
  if (fs.existsSync(historyDir)) {
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
      if (!rawContent.includes('"parentCategory":"Chassis"') && !rawContent.includes('"parentCategory": "Chassis"') &&
          !rawContent.includes('"subCategory":"Variants"') && !rawContent.includes('"subCategory": "Variants"')) {
        continue;
      }
      try {
        const hCat = JSON.parse(rawContent);
        const targetProduct = parseProductMeta(chassisLabel).cleanName;
        const hChassisEntries = (hCat.entries || []).filter(e =>
          (e.parentCategory || '').toLowerCase() === 'chassis' ||
          (e.subCategory || '').toLowerCase() === 'variants'
        );
        if (hChassisEntries.length > 0) {
          const cleanChassisEntries = hChassisEntries.map(e => ({
            ...e,
            parentCategory: 'Chassis',
            subCategory: 'Variants',
            minQty: 1,
            maxQty: 1,
            skus: (e.skus || []).filter(s => {
              const desc = (s['Description'] || s.description || '').toLowerCase();
              const historicalProduct = parseProductMeta(desc).cleanName;
              return (s['Component Role'] === 'Base Chassis' || (s['Option Type'] || s.optionType) === 'CTO') &&
                     historicalProduct === targetProduct &&
                     (desc.includes('cto server') || desc.includes('base chassis') || desc.includes('server cto') || desc.includes('cto rack') || desc.includes('cto chassis') || desc.includes('compute module') || desc.includes('cto frame'));
            })
          })).map(e => ({ ...e, skuCount: e.skus.length
          })).filter(e => e.skus.length > 0);

          if (cleanChassisEntries.length > 0) {
            hardwareEntries.unshift(...cleanChassisEntries);
            console.log(`  📦 Chassis variants injected from history snapshot: ${hf} (${cleanChassisEntries.reduce((sum, e) => sum + e.skus.length, 0)} SKUs)`);
            injectedFromHistory = true;
            break;
          }
        }
      } catch (_) {}
    }
  }

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

function buildCatalogObject(entries, filePrefix, meta, chassisLabel, subcatList) {
  return {
    metadata: {
      chassis:            filePrefix.replace(/_/g, ' '),
      model:              meta.cleanName || chassisLabel,
      family:             meta.family || 'ProLiant',
      generation:         meta.gen || 'Gen12',
      scrapeDate:         new Date().toISOString().split('T')[0],
      scrapeTimestamp:    new Date().toISOString(),
      totalSubcategories: new Set(entries.map(e => e.subCategory)).size,
      totalUniqueSKUs:    getUniqueSkuCount(entries),
      totalTables:        entries.length
    },
    subcategories: subcatList.filter(sc => entries.some(e => e.parentCategory === sc.parentCategory && e.subCategory === sc.name)).map(sc => ({
      parentCategory: sc.parentCategory,
      name:           sc.name,
      constraint:     sc.constraint,
      minQty:         sc.minQty,
      maxQty:         sc.maxQty
    })),
    entries: entries.map(e => ({
      parentCategory: e.parentCategory,
      subCategory:    e.subCategory,
      constraint:     e.constraint,
      minQty:         e.minQty || 0,
      maxQty:         e.maxQty,
      rules:          e.rules,
      headers:        e.headers,
      skuCount:       e.skuCount,
      skus:           e.skus
    }))
  };
}

async function reconcilePriceAndLifecycleHistory(hardwareEntries, cleanServicesEntries, subcatList, targetDir, filePrefix, meta, chassisLabel, pipelineLogger, baseSKU = '', tables = [], chassisDiscovery = null) {
  console.log('\n--- Step 5: Catalog Diff Engine & Historical Price Tracking ---');

  await injectChassisVariantsFromHistory(hardwareEntries, targetDir, chassisLabel, baseSKU, tables, chassisDiscovery, meta);

  const scrapeDate = new Date().toISOString().split('T')[0];
  const defaultDiscontinuedDate = (meta.gen === 'Gen12' || (chassisLabel || '').includes('Gen12'))
    ? '06/30/2029'
    : ((meta.family || '').toLowerCase().includes('tape') ? '09/30/2027' : '05/31/2028');

  for (const entry of [...hardwareEntries, ...cleanServicesEntries]) {
    for (const sku of entry.skus || []) {
      if (!sku['Start Date'] || !/^\d{1,4}[/-]\d{1,2}[/-]\d{1,4}$/.test(String(sku['Start Date']).trim())) {
        sku['Start Date'] = scrapeDate;
      }
      if (!sku['Discontinued Date'] || !/^\d{1,4}[/-]\d{1,2}[/-]\d{1,4}$/.test(String(sku['Discontinued Date']).trim())) {
        const isObsolete = /obsolete|end of life|discontinued|removed/i.test(String(sku['Lifecycle Status'] || sku['CLIC Status'] || ''));
        sku['Discontinued Date'] = isObsolete ? scrapeDate : defaultDiscontinuedDate;
      }
    }
  }

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

  let existingCatalogForDiff = null;
  const currentCatalogJsonFile = path.join(targetDir, `${filePrefix}_Catalog.json`);
  if (fs.existsSync(currentCatalogJsonFile)) {
    try { existingCatalogForDiff = JSON.parse(fs.readFileSync(currentCatalogJsonFile, 'utf-8')); } catch (_) {}
  }
  const incrementalDiff = computeIncrementalDifferential(catalogObj.entries, existingCatalogForDiff);
  if (incrementalDiff.isIncremental) {
    console.log(`  ⚡ [INCREMENTAL_DIFF] Checksum Analysis: ${incrementalDiff.stats.unchangedSkusCount} Unchanged, ${incrementalDiff.stats.modifiedSkusCount} Modified, ${incrementalDiff.stats.addedSkusCount} Added.`);
    console.log(`  💰 [TOKEN_SAVINGS] Skipped re-classification for ${incrementalDiff.stats.unchangedSkusCount} SKUs (~${incrementalDiff.stats.estimatedTokensSaved} API tokens saved).`);
    enrichedCatalog.metadata.incrementalStats = incrementalDiff.stats;
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
async function buildChassisVariantMatrix(scrapsDir, filePrefix, targetDir) {
  const skuTSVRows = parseTSVRows(path.join(scrapsDir, `${filePrefix}_Catalog_SKUs.tsv`));
  const srvTSVRows = parseTSVRows(path.join(scrapsDir, `${filePrefix}_Services_SKUs.tsv`));
  const allTSVRows = [...skuTSVRows, ...srvTSVRows];

  const chassisVariantRows = allTSVRows.filter(r => {
    const cat = (r['Main Category'] || '').toLowerCase();
    const sub = (r['Sub-Category'] || '').toLowerCase();
    const role = (r['Component Role'] || '').toLowerCase();
    const desc = (r['Description'] || '').toLowerCase();
    const isChassisCategory = cat === 'chassis' && (sub === 'variants' || sub === 'base chassis' || sub === 'chassis');
    const isCtoServer = desc.includes('cto server') || desc.includes('server cto') || desc.includes('cto rack') || desc.includes('cto chassis');
    const isNonChassisAccessory = desc.includes('factory integrated') || desc.includes('heatsink') || desc.includes('processor') || desc.includes('fan kit') || desc.includes('cable') || desc.includes('riser') || desc.includes('cage') || desc.includes('cord') || desc.includes('power supply') || desc.includes('bezel') || desc.includes('rail');
    return (isChassisCategory || isCtoServer) && !isNonChassisAccessory && role === 'base chassis';
  });

  const chassisVariants = chassisVariantRows.map(r => {
    const desc = r['Description'] || '';
    const formFactor = detectChassisFormFactor(desc);
    return {
      sku: r['Product #'] || '',
      description: desc,
      formFactor,
      listPrice: parseFloat(String(r['Unit Price (USD)'] || '0').replace(/[\$,]/g, '')) || 0,
      listPriceFormatted: `$${(parseFloat(String(r['Unit Price (USD)'] || '0').replace(/[\$,]/g, '')) || 0).toFixed(2)}`,
      optionType: r['Option Type'] || 'CTO',
      startDate: r['Start Date'] || '',
      discontinuedDate: r['Discontinued Date'] || '',
      constraint: r['Constraint Text'] || 'max 1 — Mandatory Base Chassis Selection',
      maxQty: r['Subcategory Max Qty'] || '1',
      diffStatus: r['Diff Status'] || '',
      priceHistoryTrail: r['Price History Trail'] || ''
    };
  }).filter(v => v.sku && /^[A-Z0-9]+-[A-Z0-9]+$/.test(v.sku));

  const chassisVariantMatrix = {};
  for (const v of chassisVariants) {
    if (v.sku) chassisVariantMatrix[v.sku] = v;
  }

  if (Object.keys(chassisVariantMatrix).length < 6) {
    const historyDir = path.join(targetDir, 'history');
    if (fs.existsSync(historyDir)) {
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
        if (!rawContent.includes('"parentCategory":"Chassis"') && !rawContent.includes('"parentCategory": "Chassis"') &&
            !rawContent.includes('"subCategory":"Variants"') && !rawContent.includes('"subCategory": "Variants"')) {
          continue;
        }
        try {
          const hCat = JSON.parse(rawContent);
          const hChassisEntries = (hCat.entries || []).filter(e =>
            (e.parentCategory || '').toLowerCase() === 'chassis' ||
            (e.subCategory || '').toLowerCase() === 'variants'
          );
          for (const e of hChassisEntries) {
            for (const s of (e.skus || [])) {
              const pn = s.sku || s['Product #'] || '';
              const desc = s.description || s.Description || s['Description'] || '';
              if (!pn || chassisVariantMatrix[pn] || !isCanonicalCtoChassisCandidate({
                sku: pn,
                text: desc,
                isBto: String(s['Option Type'] || s.optionType || '').toUpperCase() === 'BTO'
              }, filePrefix)) continue;
              const formFactor = detectChassisFormFactor(desc);
              chassisVariantMatrix[pn] = {
                sku: pn, description: desc, formFactor,
                listPrice: parseFloat(String(s.listPrice || s['Unit Price (USD)'] || '0').replace(/[\$,]/g, '')) || 0,
                listPriceFormatted: `$${(parseFloat(String(s.listPrice || s['Unit Price (USD)'] || '0').replace(/[\$,]/g, '')) || 0).toFixed(2)}`,
                optionType: s['Option Type'] || s.optionType || 'CTO',
                startDate: s['Start Date'] || s.startDate || '',
                discontinuedDate: s['Discontinued Date'] || s.discontinuedDate || '',
                constraint: e.constraint || 'max 1 — Mandatory Base Chassis Selection',
                maxQty: e.maxQty || '1',
                sourceSnapshot: hf
              };
            }
          }
          if (Object.keys(chassisVariantMatrix).length >= 6) break;
        } catch (_) {}
      }
    }
  }

  return chassisVariantMatrix;
}

async function exportCatalogArtifacts(ctx) {
  const {
    enrichedCatalog, enrichedServicesCatalog, validationResult,
    subcatList, fullText, targetDir, scrapsDir, filePrefix, chassisRoot,
    profile, jsonOutputPath, diagnostics, pipelineLogger,
    JSON_MODE, chassisLabel, catalogBaseName
  } = ctx;

  const rulesJsonPath = path.join(targetDir, `${filePrefix}_Catalog_Rules.json`);
  let existingLearnedRules = [];
  if (fs.existsSync(rulesJsonPath)) {
    try {
      const existingRulesObj = JSON.parse(fs.readFileSync(rulesJsonPath, 'utf-8'));
      if (Array.isArray(existingRulesObj.rules)) {
        existingLearnedRules = existingRulesObj.rules.filter(r => (r.parentCategory || '').toLowerCase().includes('feedback') || (r.parentCategory || '').toLowerCase().includes('learned'));
      }
    } catch (_) {}
  }

  const allCombinedEntries = [...(enrichedCatalog.entries || []), ...(enrichedServicesCatalog.entries || [])];
  const mainTSV    = generateMainSheet(enrichedCatalog.entries, chassisRoot, profile);
  const rulesTSV   = generateRulesSheet(allCombinedEntries, subcatList, fullText, existingLearnedRules);
  const summaryTSV = generateSummarySheet(allCombinedEntries, subcatList);
  const servicesTSV = generateMainSheet(enrichedServicesCatalog.entries, chassisRoot, profile);

  fs.mkdirSync(scrapsDir, { recursive: true });
  fs.writeFileSync(path.join(scrapsDir, `${filePrefix}_Catalog_SKUs.tsv`),    mainTSV);
  fs.writeFileSync(path.join(scrapsDir, `${filePrefix}_Catalog_Rules.tsv`),   rulesTSV);
  fs.writeFileSync(path.join(scrapsDir, `${filePrefix}_Catalog_Summary.tsv`), summaryTSV);
  if (servicesTSV && servicesTSV.trim()) {
    fs.writeFileSync(path.join(scrapsDir, `${filePrefix}_Services_SKUs.tsv`), servicesTSV);
  }

  const chassisVariantMatrix = await buildChassisVariantMatrix(scrapsDir, filePrefix, targetDir);

  const combinedRules = allCombinedEntries.flatMap(e => (e.rules || []).map(r => ({
    parentCategory: e.parentCategory,
    subCategory: e.subCategory,
    constraint: e.constraint || '',
    maxQty: e.maxQty || '',
    rule: r
  })));

  const dedupeMap = new Map();
  [...combinedRules, ...existingLearnedRules].forEach(r => {
    const ruleText = r.rule || r.description || '';
    if (!ruleText || ruleText.length < 5) return;
    const key = `${r.parentCategory}|${r.subCategory}|${ruleText.trim()}`;
    if (!dedupeMap.has(key)) {
      dedupeMap.set(key, {
        parentCategory: r.parentCategory,
        subCategory: r.subCategory,
        constraint: r.constraint || '',
        maxQty: r.maxQty || '',
        rule: ruleText.trim()
      });
    }
  });

  const rulesJsonData = {
    metadata: {
      ...enrichedCatalog.metadata,
      chassisVariantCount: Object.keys(chassisVariantMatrix).length,
      rulesGeneratedAt: new Date().toISOString()
    },
    chassisVariants: Object.values(chassisVariantMatrix),
    chassisVariantMatrix,
    subcategories: enrichedCatalog.subcategories,
    rules: Array.from(dedupeMap.values())
  };
  safeWriteJsonAtomic(rulesJsonPath, rulesJsonData);

  safeWriteJsonAtomic(jsonOutputPath, enrichedCatalog, { validateSchema: true, rejectInvalid: true });

  const servicesJsonOutputPath = jsonOutputPath.replace('_Catalog.json', '_Services.json');
  if (enrichedServicesCatalog.metadata.totalUniqueSKUs > 0) {
    safeWriteJsonAtomic(servicesJsonOutputPath, enrichedServicesCatalog, { validateSchema: false, rejectInvalid: false });
    console.log(`  📄 ${filePrefix}_Services.json  (${enrichedServicesCatalog.metadata.totalUniqueSKUs} service SKUs, diff-enriched)`);
  } else {
    console.log(`  ℹ️  No service SKUs found in this scrape — _Services.json not written.`);
  }

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

// ============================================================
// Main Orchestrator
// ============================================================
async function main(rawInputPath = process.argv[2], jsonOutputPath = process.argv[3]) {
  const ctx = await initCatalogBuild(rawInputPath, jsonOutputPath, process.argv);

  const { subcatList } = extractSubcategoriesAndParents(ctx.fullText, ctx.rawData, ctx.IS_VERBOSE);
  ctx.subcatList = subcatList;

  const { hardwareEntries, cleanServicesEntries } = synthesizeCatalogEntries(
    ctx.tables, ctx.fullText, subcatList, ctx.historyPriceMap, ctx.diagnostics, ctx.profile, ctx.IS_VERBOSE
  );

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
  exportCatalogArtifacts
};
