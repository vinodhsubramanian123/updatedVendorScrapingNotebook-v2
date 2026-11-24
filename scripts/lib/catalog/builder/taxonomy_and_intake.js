'use strict';
/**
 * scripts/lib/catalog/builder/taxonomy_and_intake.js — Catalog Builder Intake, Price Backfill & Taxonomy
 */

const fs = require('fs');
const path = require('path');
const { cleanBaseSKU, isServiceSku, isValidHpeSKU } = require('../sku.js');
const PipelineLogger = require('../../system/pipeline_logger.js');
const { ClassificationDiagnostics } = require('../classification_diagnostics.js');
const { parseProductMeta, synthesizeSubcategoryName, classifyComponentRole } = require('../product_meta.js');
const { loadProfile } = require('../../system/profile_loader.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

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
  { keywords: ['tape drive', 'tape drives', 'lto-', 'ultrium'], parent: 'Tape Drives' },
  { keywords: ['storage media', 'data cartridge', 'tape cartridge', 'cleaning cartridge', 'tape media'], parent: 'Storage Media' },
  { keywords: ['back-end switches', 'san switch', 'network switch', 'fabric switch'], parent: 'Networking' },
  { keywords: ['power supply', 'power supplies', 'flex slot', '-48vdc'], parent: 'Power Supplies' },
  { keywords: ['heatsink', 'heat sink', 'fan kit', 'fans', 'cooling', 'thermal'], parent: 'Cooling / Thermal' },
  { keywords: ['riser', 'pcie riser'], parent: 'PCIe Risers' },
  { keywords: ['storage controller', 'sas controller', 'megaraid', 'smart array', 'vroc'], parent: 'Storage Controllers' },
  { keywords: ['drive cage', 'drive enclosure', 'drive blank', 'solid state drive', 'nvme', 'sata', 'sas'], parent: 'Drive Enclosures / Drives' },
  { keywords: ['networking', 'ethernet', 'ocp3', 'infiniband', 'transceiver', 'fibre channel'], parent: 'Networking' },
  { keywords: ['cable kit', 'cables', 'power cord', 'jumper cord', 'jumper cable'], parent: 'Cables & Enablement Kits' },
  { keywords: ['software', 'license', 'operating system', 'windows server', 'windows cal', 'cal pack', 'red hat', 'suse', 'vmware', 'ilo', 'oneview', 'compute ops', 'cloud management server fio'], parent: 'Software & Licenses' },
  { keywords: ['support', 'pointnext', 'tech care', 'service'], parent: 'Support Services' },
  { keywords: ['chassis infrastructure', 'smart chassis', 'rail', 'bezel', 'blank', 'enablement', 'bluetooth', 'connectivity kit', 'options'], parent: 'Accessories & Infrastructure' },
  { keywords: ['base chassis', 'chassis variants', 'variants'], parent: 'Chassis' },
  { keywords: ['gpu', 'graphics', 'accelerator', 'nvidia'], parent: 'Graphics & GPU' }
]);

const ROLE_TO_PARENT_MAP = Object.freeze({
  'Processor': 'Processor',
  'Memory': 'Memory',
  'Power Supply': 'Power Supplies',
  'Tape Drive': 'Tape Drives',
  'Storage Media': 'Storage Media',
  'Storage Controller': 'Storage Controllers',
  'Drive Cage / Drive': 'Drive Enclosures / Drives',
  'Network Adapter': 'Networking',
  'Network Switch': 'Networking',
  'SAN Switch': 'Networking',
  'Fabric Interconnect': 'Networking',
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
    model,
    family,
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

function isClearlyPhysicalSkuRow(sku) {
  const description = String(sku?.Description || sku?.description || '');
  if (/\b(?:raid setting|fio setting|raid service|factory setting|custom defined raid|customer defined raid)\b/i.test(description)) {
    return true;
  }
  if (/\b(?:software|\bsw\b|license|subscription|\bsub\b|support|service|svc|saas|e-ltu|e-rtu|care\s*pack|education|learning\s*credits|virtual\s*workstation|ml\s*dev\s*env)\b/i.test(description)) return false;
  return /\b(?:adapter|card|cable|cord|kit|rail|drive|ssd|hdd|controller|processor|memory|dimm|transceiver|heatsink|heat sink|fan|riser|power supply|chassis|enclosure|accelerator|gpu|graphics|hba)\b/i.test(description);
}

function isServiceSkuRow(sku) {
  if (isClearlyPhysicalSkuRow(sku)) return false;
  return sku?.optionType === 'Service' || sku?.['Option Type'] === 'Service' ||
    sku?.rowType === 'SUPPORT_SERVICE' ||
    isServiceSku(sku?.sku || sku?.['Product #'] || '');
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

  const backfillCount = loadPortfolioPriceBackfill(historyPriceMap, targetDir);
  if (backfillCount > 0) {
    console.log(`  📊 Portfolio price backfill: ${backfillCount} SKUs enriched from sibling catalogs`);
  }

  return historyPriceMap;
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

  const registration = require('../../../config/notebooks.json').notebooks[filePrefix];
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

function parseConstraintMinMax(constraint) {
  const text = String(constraint || '');
  const minMatch = text.match(/min\s+(\d+)/i);
  const maxMatch = text.match(/max\s+(\d+)/i);
  const minQty = minMatch ? parseInt(minMatch[1], 10) : 0;
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
  const configPath = path.join(PROJECT_ROOT, 'scripts', 'config', 'categories.json');
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

module.exports = {
  PROJECT_ROOT,
  SUBCAT_KEYWORD_PARENT_MAP,
  ROLE_TO_PARENT_MAP,
  CATEGORY_DEFAULT_CONSTRAINTS,
  lookupChassisMapBaseSku,
  detectChassisFormFactor,
  getParentCategory,
  parseTSVRows,
  createCatalogMetadata,
  getUniqueSkuCount,
  isClearlyPhysicalSkuRow,
  partitionCatalogEntries,
  initCatalogBuild,
  parseConstraintMinMax,
  extractSubcategoriesAndParents
};
