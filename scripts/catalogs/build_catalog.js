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

// ============================================================
// Constants & Taxonomy Maps
// ============================================================
const CHASSIS_FF_MAP = Object.freeze({
  '8SFF': 'Small Form Factor (8-Bay SFF)',
  '24SFF': 'Small Form Factor (24-Bay SFF)',
  '12LFF': 'Large Form Factor (12-Bay LFF)',
  '8LFF': 'Large Form Factor (8-Bay LFF)',
  '16EDSFF': 'eDesign SFF (16-Bay EDSFF)',
  'High Power': 'High Power / Telco',
  'Telco': 'High Power / Telco'
});

const SUBCAT_KEYWORD_PARENT_MAP = Object.freeze([
  { keywords: ['processor', 'xeon', 'epyc'], parent: 'Processor' },
  { keywords: ['memory', 'dimm', 'ddr5', 'ddr4', 'smart memory'], parent: 'Memory' },
  { keywords: ['power supply', 'power supplies', 'flex slot', '-48vdc'], parent: 'Power Supplies' },
  { keywords: ['heatsink', 'heat sink', 'fan kit', 'fans', 'cooling', 'thermal'], parent: 'Cooling / Thermal' },
  { keywords: ['riser', 'pcie riser'], parent: 'PCIe Risers' },
  { keywords: ['storage controller', 'sas controller', 'megaraid', 'smart array', 'vroc'], parent: 'Storage Controllers' },
  { keywords: ['drive cage', 'drive enclosure', 'drive blank', 'solid state drive', 'nvme', 'sata', 'sas'], parent: 'Drive Enclosures / Drives' },
  { keywords: ['networking', 'ethernet', 'ocp3', 'infiniband', 'transceiver', 'fibre channel'], parent: 'Networking' },
  { keywords: ['cable kit', 'cables', 'jumper cable'], parent: 'Cables & Enablement Kits' },
  { keywords: ['software', 'license', 'operating system', 'windows server', 'red hat', 'suse', 'vmware', 'ilo', 'oneview'], parent: 'Software & Licenses' },
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

function isServiceEntry(e) {
  const pc = (e.parentCategory || '').toLowerCase();
  if (pc.includes('service') || pc.includes('pointnext') || pc.includes('tech care') || pc.includes('support')) return true;
  return (e.skus || []).some(s => {
    return s.optionType === 'Service' || s['Option Type'] === 'Service' || isServiceSku(s.sku || s['Product #'] || '');
  });
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
  const _baseSKUMatch = _searchArea.match(/\b([A-Z]\d{5}-[A-Z]\d{2}[A-Z0-9]*)\b/);
  const baseSKU       = _baseSKUMatch ? _baseSKUMatch[1] : '';
  const chassisRoot   = baseSKU ? `${chassisLabel} [${baseSKU}]` : chassisLabel;
  console.log(`  Chassis Root: "${chassisRoot}"${baseSKU ? ` (Base SKU: ${baseSKU})` : ''}\n`);

  return {
    rawInputPath, jsonOutputPath, IS_VERBOSE, JSON_MODE,
    targetDir, scrapsDir, catalogBaseName, filePrefix, chassisLabel,
    pipelineLogger, diagnostics, historyPriceMap,
    rawData, fullText, tables, meta, profile, baseSKU, chassisRoot
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
  return historyPriceMap;
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

  console.log(`Found ${subcatList.length} subcategory headers in text.`);
  if (IS_VERBOSE) {
    subcatList.forEach((sc, i) => console.log(`  [${i+1}] "${sc.name}" (${sc.constraint}, minQty: ${sc.minQty}, maxQty: ${sc.maxQty}) @ pos ${sc.textIndex}`));
  }

  console.log('\n--- Step 2: Mapping Parent Categories ---');
  const configPath = path.join(__dirname, 'config', 'categories.json');
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
      if (header === 'List Price' || header === 'Price') {
        header = 'Unit Price (USD)';
      } else if (header === 'Product Description') {
        header = 'Description';
      } else if (header === 'Qty' || header === 'Quantity') {
        header = 'Current Qty';
      }
      let val = row[cellIdx].replace(/\n/g, ' ').trim();
      if (header === 'Unit Price (USD)') {
        val = val.replace(/[\$,]/g, '').trim();
      }
      obj[header] = val;
    }
  }

  let rawPN = obj['Product #'] || '';
  if (!rawPN || !isValidHpeSKU(cleanBaseSKU(rawPN))) {
    const foundCell = row.find(c => isValidHpeSKU(cleanBaseSKU(c.trim())));
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

  if (rawPN) rawPN = cleanBaseSKU(rawPN);
  if (!rawPN || !isValidHpeSKU(rawPN)) return null;

  const pn = rawPN.toUpperCase();
  obj['Product #'] = pn;
  obj.sku = pn;
  obj['Option Type'] = classifyOptionType(pn);
  obj['CLIC Status'] = lifecycleStatus;
  obj.lifecycleStatus = lifecycleStatus;
  obj.lifecycleBadge = lifecycleBadge;

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

  const rawQty = String(obj['Current Qty'] || obj['Quantity'] || '0').replace(/\s+/g, '').trim();
  obj['Current Qty'] = /^\d+$/.test(rawQty) ? rawQty : '0';
  delete obj['Quantity'];

  let priceStr = String(obj['Unit Price (USD)'] || obj['Price (USD)'] || obj['Price'] || '').replace(/[\$,]/g, '').trim();
  if (isNaN(parseFloat(priceStr)) || priceStr === pn || parseFloat(priceStr) < 0) {
    const numCell = row.find(c => {
      const p = c.replace(/[\$,]/g, '').trim();
      return p && !isNaN(parseFloat(p)) && parseFloat(p) >= 0 && c !== pn;
    });
    priceStr = numCell ? numCell.replace(/[\$,]/g, '').trim() : '0.00';
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

  if (!matchedSubcat && subcatList.length > 0) {
    const subcatIdx = Math.min(Math.floor((ti / totalTables) * subcatList.length), subcatList.length - 1);
    matchedSubcat   = subcatList[subcatIdx];
  }

  return { matchedSubcat, textPos };
}

function resolveTableTaxonomyAndRole(matchedSubcat, textPos, table, tableRules, profile, skus) {
  let parentCat = matchedSubcat ? matchedSubcat.parentCategory :
                  (textPos > -1 ? getParentCategory(textPos, []) : 'Unknown');
  let subCat    = matchedSubcat ? matchedSubcat.name : '(Sub-table)';

  if (table.subTab) parentCat = table.subTab;
  if (table.label)  subCat    = table.label;

  const sampleDesc = skus.map(s => s['Description'] || '').join(' ');

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

  const detectedRole = classifyComponentRole(subCat, sampleDesc, profile);

  if (matchedParent) {
    parentCat = matchedParent;
  } else if (detectedRole && detectedRole !== 'Option Component' && ROLE_TO_PARENT_MAP[detectedRole]) {
    parentCat = ROLE_TO_PARENT_MAP[detectedRole];
  } else if (!parentCat || parentCat === 'Unknown') {
    parentCat = 'Accessories & Infrastructure';
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

  return { parentCat, subCat, finalConstraint, finalMinQty, finalMaxQty, detectedRole, matchedParent };
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

    let headerIdx  = -1;
    let headers    = [];
    let tableRules = [];

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
    const { parentCat, subCat, finalConstraint, finalMinQty, finalMaxQty, detectedRole, matchedParent } =
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
      matchedVia: matchedParent ? 'direct_taxonomy_keyword' : (matchedSubcat ? 'text_position' : 'role_classifier'),
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

  const hardwareEntries = [];
  const servicesEntries = [];
  orderedEntries.forEach(e => {
    if (isServiceEntry(e)) {
      servicesEntries.push(e);
    } else {
      hardwareEntries.push(e);
    }
  });

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
async function injectChassisVariantsFromHistory(hardwareEntries, targetDir, chassisLabel) {
  const hasChassisEntry = hardwareEntries.some(e =>
    (e.parentCategory || '').toLowerCase() === 'chassis' ||
    (e.subCategory || '').toLowerCase() === 'variants'
  );

  if (hasChassisEntry) return;

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
              return (s['Component Role'] === 'Base Chassis' || (s['Option Type'] || s.optionType) === 'CTO') &&
                     (desc.includes('cto server') || desc.includes('base chassis') || desc.includes('server cto') || desc.includes('cto rack') || desc.includes('cto chassis'));
            })
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
    console.warn(`  ⚠️  WARNING: No chassis entry found in scraped data or history for ${chassisLabel}.`);
    console.warn(`      The catalog may be incomplete — base CTO chassis variants are missing.`);
    console.warn(`      Ensure the OCA portal page shows the full product node menu.`);
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

async function reconcilePriceAndLifecycleHistory(hardwareEntries, cleanServicesEntries, subcatList, targetDir, filePrefix, meta, chassisLabel, pipelineLogger) {
  console.log('\n--- Step 5: Catalog Diff Engine & Historical Price Tracking ---');

  await injectChassisVariantsFromHistory(hardwareEntries, targetDir, chassisLabel);

  const catalogObj = buildCatalogObject(hardwareEntries, filePrefix, meta, chassisLabel, subcatList);
  const servicesCatalogObj = buildCatalogObject(cleanServicesEntries, filePrefix, meta, chassisLabel, subcatList);

  const historyDir = path.join(targetDir, 'history');
  const { enrichedCatalog } = processCatalogDiff(catalogObj, historyDir);

  const servicesHistoryDir = path.join(targetDir, 'services_history');
  const { enrichedCatalog: enrichedServicesCatalog } = processCatalogDiff(
    servicesCatalogObj, servicesHistoryDir, 'services'
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
    const isCtoServer = (desc.includes('cto server') || desc.includes('server cto') || desc.includes('cto rack') || desc.includes('cto chassis')) && desc.includes('gen12');
    const isNonChassisAccessory = desc.includes('factory integrated') || desc.includes('heatsink') || desc.includes('processor') || desc.includes('fan kit') || desc.includes('cable') || desc.includes('riser') || desc.includes('cage') || desc.includes('cord') || desc.includes('power supply') || desc.includes('bezel') || desc.includes('rail');
    return (isChassisCategory || isCtoServer) && !isNonChassisAccessory && role === 'base chassis';
  });

  const chassisVariants = chassisVariantRows.map(r => {
    const desc = r['Description'] || '';
    let formFactor = 'Unknown';
    for (const [key, label] of Object.entries(CHASSIS_FF_MAP)) {
      if (desc.includes(key)) { formFactor = label; break; }
    }
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
              if (!pn || chassisVariantMatrix[pn]) continue;
              const desc = s.description || s.Description || s['Description'] || '';
              let formFactor = 'Unknown';
              for (const [key, label] of Object.entries(CHASSIS_FF_MAP)) {
                if (desc.includes(key)) { formFactor = label; break; }
              }
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
    hardwareEntries, cleanServicesEntries, subcatList, ctx.targetDir, ctx.filePrefix, ctx.meta, ctx.chassisLabel, ctx.pipelineLogger
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
  injectChassisVariantsFromHistory,
  buildCatalogObject,
  reconcilePriceAndLifecycleHistory,
  buildChassisVariantMatrix,
  exportCatalogArtifacts
};
