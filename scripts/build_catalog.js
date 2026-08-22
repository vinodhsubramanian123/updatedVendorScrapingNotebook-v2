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
const { processCatalogDiff } = require('./lib/diff_catalog.js');
const { safeWriteJsonAtomic } = require('./lib/fs_compat.js');
const { computeIncrementalDifferential } = require('./lib/checksum_diff.js');
const { recordVersionSnapshot } = require('./lib/sku_versioning.js');
const { HPE_SKU_EXTRACT_REGEX, cleanBaseSKU, classifyOptionType, isServiceSku } = require('./lib/sku.js');
const { generateMainSheet, generateRulesSheet, generateSummarySheet } = require('./lib/catalog_formatter.js');
const { validateCatalogData } = require('./lib/data_validator.js');
const PipelineLogger = require('./lib/pipeline_logger.js');

// ── CLI Arguments ─────────────────────────────────────────────────────────────
const rawInputPath   = process.argv[2];
const jsonOutputPath = process.argv[3];
const IS_VERBOSE = process.argv.includes('--verbose') || process.argv.includes('-v');
const JSON_MODE  = process.argv.includes('--json');

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

// Derive chassis prefix early — available to all generator functions via closure
const catalogBaseName = path.basename(jsonOutputPath, '.json');   // e.g. DL380_Gen12_SFF_Catalog
const filePrefix      = catalogBaseName.replace(/_Catalog$/, ''); // e.g. DL380_Gen12_SFF
const chassisLabel    = filePrefix.replace(/_/g, ' ');            // e.g. DL380 Gen12 SFF

const pipelineLogger  = new PipelineLogger(filePrefix, targetDir);
pipelineLogger.logStep('Initialize Classification Engine', 'SUCCESS', { rawInputPath, jsonOutputPath });

const rawData  = JSON.parse(fs.readFileSync(rawInputPath, 'utf-8'));
const fullText = rawData.fullText || rawData.bodyText || '';
const tables   = rawData.tables || [];

const { parseProductMeta } = require('./lib/product_meta.js');
const { loadProfile } = require('./lib/profile_loader.js');
const meta = parseProductMeta(chassisLabel);
const profile = loadProfile(meta.family, meta.gen);

console.log(`Loaded Raw Scrape Payload:`);
console.log(`  Page Title:   "${rawData.pageTitle || 'N/A'}"`);
console.log(`  Full Text:    ${fullText.length.toLocaleString()} chars`);
console.log(`  Total Tables: ${tables.length}`);

// Extract CTO base SKU for hierarchy path (e.g. P73282-B21) — Rule on 4-level path
const _ctoIdx       = fullText.indexOf('Configure-to-order');
const _searchArea   = _ctoIdx > -1 ? fullText.substring(_ctoIdx, _ctoIdx + 300) : fullText.substring(0, 500);
const _baseSKUMatch = _searchArea.match(/\b([A-Z]\d{5}-[A-Z]\d{2}[A-Z0-9]*)\b/);
const baseSKU       = _baseSKUMatch ? _baseSKUMatch[1] : '';
const chassisRoot   = baseSKU ? `${chassisLabel} [${baseSKU}]` : chassisLabel;
console.log(`  Chassis Root: "${chassisRoot}"${baseSKU ? ` (Base SKU: ${baseSKU})` : ''}\n`);

// ============================================================
// Step 1: Build subcategory index from text
// ============================================================
console.log('--- Step 1: Extracting Subcategories & Quantity Constraints ---');

// GAP FIX #1 & #2: Expanded regex captures compound constraints like (min 1, max 2),
// standalone (max N), (min N), (required), (no max), and (optional).
// The full parenthesized content is captured as match[2] and parsed for both min + max.
const subcatRegex = /\n([^\n]{3,80})\s*\(((?:min\s+\d+\s*,\s*)?(?:max\s+\d+|required|no max|optional)(?:\s*,\s*min\s+\d+)?|min\s+\d+)\)/gi;
subcatRegex.lastIndex = 0;
const subcatList = [];
let match;
while ((match = subcatRegex.exec(fullText)) !== null) {
  let name = match[1].trim();
  name = name.replace(/^[\s\n\r\t]+/, '').trim();
  if (name.length < 3 || name.length > 80) continue;
  if (name.match(/^\d{4}/)) continue;  // Skip date-like patterns
  if (name.includes('\t')) continue;   // Skip tab-separated data

  const constraintRaw = match[2].toLowerCase();

  // GAP FIX #1: Parse both minQty and maxQty from compound constraint text
  const minMatch = constraintRaw.match(/min\s+(\d+)/);
  const maxMatch = constraintRaw.match(/max\s+(\d+)/);
  let minQty = minMatch ? parseInt(minMatch[1], 10) : 0;
  let maxQty = maxMatch ? parseInt(maxMatch[1], 10) : 0;
  if (constraintRaw.includes('no max')) maxQty = -1;         // Unlimited sentinel
  if (constraintRaw.includes('required')) { maxQty = -2; minQty = minQty || 1; }  // Required implies min 1
  // GAP FIX #5: (optional) gets its own sentinel instead of defaulting to maxQty=0
  if (constraintRaw === 'optional') maxQty = -3;             // Optional sentinel

  subcatList.push({
    name,
    constraint: match[2],
    minQty,     // GAP FIX #2: minQty is now stored and propagated
    maxQty,
    textIndex: match.index
  });
}

console.log(`Found ${subcatList.length} subcategory headers in text.`);
if (IS_VERBOSE) {
  subcatList.forEach((sc, i) => console.log(`  [${i+1}] "${sc.name}" (${sc.constraint}, minQty: ${sc.minQty}, maxQty: ${sc.maxQty}) @ pos ${sc.textIndex}`));
}

// ============================================================
// Step 2: Build parent category mapping
// ============================================================
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


// Hybrid category discovery: combine KNOWN_MAIN_CATEGORIES + dynamic section headings
const mainCategories = [...KNOWN_MAIN_CATEGORIES];

if (Array.isArray(rawData.sections)) {
  rawData.sections.forEach(sec => {
    const t = (sec.text || '').trim();
    if (t.length >= 3 && t.length <= 50 && !mainCategories.includes(t) && !t.includes('(')) {
      mainCategories.push(t);
    }
  });
}

// Skip navigation menu clustered at text positions < 1,010
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

function getParentCategory(textIdx) {
  let parent = 'Unknown';
  for (const mc of mainCatPositions) {
    if (mc.index < textIdx) parent = mc.name;
    else break;
  }
  return parent;
}

// Assign parent categories to subcategories
let unclassifiedSubcats = 0;
for (const sc of subcatList) {
  let parent = getParentCategory(sc.textIndex);
  if (parent === 'Unknown') {
    // Smart fallback: check if sc.name directly matches or contains a known main category
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

// ============================================================
// Step 3: Parse individual tables
// ============================================================
console.log('\n--- Step 3: Extracting Tables & SKUs ---');

const allSKURows   = [];
const allSKUMap    = new Map();
const processedPNs = new Set();
const tableEntries = [];
let skippedTables  = 0;

for (let ti = 1; ti < tables.length; ti++) {
  const table = tables[ti];
  if (!table.rows || table.rows.length < 2) {
    skippedTables++;
    continue;
  }

  // Find header row
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
    skippedTables++;
    continue;
  }

  // Extract data rows
  const skus = [];
  for (let ri = headerIdx + 1; ri < table.rows.length; ri++) {
    const row = table.rows[ri];
    if (row.length < 3) continue;

    const obj = {};
    let offset = 0;
    if (headers[0] === 'Product #' && row[0] === '' && row.length > headers.length) offset = 1;

    for (let hi = 0; hi < headers.length; hi++) {
      let header  = headers[hi];
      const cellIdx = hi + offset;
      if (header && cellIdx < row.length) {
        if (header === 'List Price') {
          header = 'Unit Price (USD)';
        }
        let val = row[cellIdx].replace(/\n/g, ' ').trim();
        if (header === 'Unit Price (USD)') {
          val = val.replace(/[\$,]/g, '').trim();
        }
        obj[header] = val;
      }
    }

    // Sanitize Product # — strictly extract HPE hardware and Service SKUs
    // Rejects internal DOM pattern IDs (e.g. dl380pat001b94fb), core count strings, and arbitrary numeric labels
    const { isValidHpeSKU } = require('./lib/sku.js');
    let rawPN = obj['Product #'] || '';
    if (rawPN) {
      rawPN = cleanBaseSKU(rawPN);
    }

    if (!rawPN || !isValidHpeSKU(rawPN)) {
      continue; // Skip rows that do not have a valid HPE hardware SKU
    }

    const pn = rawPN.toUpperCase();
    const optionType = classifyOptionType(pn);
    obj['Product #'] = pn;
    obj.sku = pn;
    obj['Option Type'] = optionType;

    // Sanitize Description field to strip raw DOM context markup and newline artifacts
    let descText = obj['Description'] || '';
    if (descText.includes('context":') || descText.includes('\n') || descText.includes('\\n') || descText.includes('\t')) {
      descText = descText.replace(/context":\s*/gi, '');
      descText = descText.replace(/\\n/g, '\n').replace(/\\t/g, ' ');
      const firstLine = descText.split('\n')[0].trim();
      descText = firstLine.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
      descText = descText.replace(/^["\s]+|["\s]+$/g, '');
    }
    if (!descText || descText.length < 5 || descText === pn) {
      descText = `HPE ProLiant Server Option (${pn})`;
    }
    obj['Description'] = descText;

    // Normalise Current Qty — clean integer string
    const rawQty = String(obj['Current Qty'] || obj['Quantity'] || '0').replace(/\s+/g, '').trim();
    obj['Current Qty'] = /^\d+$/.test(rawQty) ? rawQty : '0';
    delete obj['Quantity'];

    // Filter out TAA Compliant & GTA / #GTA SKUs for MEA (Dubai) region requirement
    if (/\bTAA\b|TAA Compliant|\bGTA\b|#GTA/i.test(pn) || /\bTAA\b|TAA Compliant|\bGTA\b|#GTA/i.test(descText)) {
      continue;
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

  // Find subcategory match via text position (primary pass)
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

  // GAP FIX #3: Secondary matching pass — match subcategory name keywords
  // against table header row cells and first SKU descriptions when primary
  // text-position matching yields only a fallback (Sub-table) name.
  if (!matchedSubcat && subcatList.length > 0) {
    const headerStr = (headers || []).join(' ').toLowerCase();
    const sampleDescs = skus.slice(0, 5).map(s => (s['Description'] || '').toLowerCase()).join(' ');
    const searchText = headerStr + ' ' + sampleDescs;

    // Score each subcategory by keyword overlap with table content
    let bestScore = 0;
    let bestSubcat = null;
    for (const sc of subcatList) {
      const words = sc.name.toLowerCase().split(/[\s\/\-,()]+/).filter(w => w.length >= 3);
      if (words.length === 0) continue;
      let score = 0;
      for (const w of words) {
        if (searchText.includes(w)) score++;
      }
      // Bonus: if the subcategory name appears verbatim in the table content
      if (searchText.includes(sc.name.toLowerCase())) score += words.length;
      if (score > bestScore) { bestScore = score; bestSubcat = sc; }
    }
    // Accept keyword match only if at least 2 words or 50%+ of words matched
    if (bestSubcat && (bestScore >= 2 || bestScore >= Math.ceil(bestSubcat.name.split(/[\s\/\-,()]+/).filter(w => w.length >= 3).length * 0.5))) {
      matchedSubcat = bestSubcat;
    }
  }

  // Tertiary fallback: table-index proportional mapping (preserved for edge cases)
  if (!matchedSubcat && subcatList.length > 0) {
    const subcatIdx = Math.min(Math.floor((ti / tables.length) * subcatList.length), subcatList.length - 1);
    matchedSubcat   = subcatList[subcatIdx];
  }

  let parentCat = matchedSubcat ? matchedSubcat.parentCategory :
                    (textPos > -1 ? getParentCategory(textPos) : 'Unknown');
  let subCat    = matchedSubcat ? matchedSubcat.name : '(Sub-table)';

  // Override with explicit wizard subTab / label if available
  if (table.subTab) parentCat = table.subTab;
  if (table.label)  subCat    = table.label;

  const sampleDesc = skus.map(s => s['Description'] || '').join(' ');

  // 1. Synthesize clean, descriptive subcategory name if unresolved (eliminates generic '(Sub-table)' placeholders)
  if (!subCat || subCat === '(Sub-table)') {
    const { synthesizeSubcategoryName } = require('./lib/product_meta.js');
    subCat = synthesizeSubcategoryName(parentCat, sampleDesc, tableRules);
  }

  // 2. Smart fallback: if parentCat is 'Unknown' or generic 'Option Component', classify using component role & semantic taxonomy
  if (parentCat === 'Unknown' || !parentCat || parentCat === 'Option Component' || parentCat === 'Option Components' || parentCat === 'General' || parentCat === 'MISC Hardware') {
    const { classifyComponentRole } = require('./lib/product_meta.js');
    const detectedRole = classifyComponentRole(subCat, sampleDesc, profile);
    
    const ROLE_TO_PARENT_MAP = {
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
    };
    
    parentCat = ROLE_TO_PARENT_MAP[detectedRole] || (detectedRole !== 'Option Component' ? detectedRole : 'Accessories & Infrastructure');
  }

  // Assign fallback category constraints if not explicitly captured
  const CATEGORY_DEFAULT_CONSTRAINTS = {
    'processor': { constraint: 'min 1, max 2', minQty: 1, maxQty: 2 },
    'memory': { constraint: 'max 32', minQty: 0, maxQty: 32 },
    'power supplies': { constraint: 'min 1, max 2', minQty: 1, maxQty: 2 },
    'pcie risers': { constraint: 'max 3', minQty: 0, maxQty: 3 },
    'chassis': { constraint: 'min 1, max 1 — Mandatory Base Chassis Selection', minQty: 1, maxQty: 1 },
    'storage controllers': { constraint: 'max 4', minQty: 0, maxQty: 4 },
    'drive enclosures / drives': { constraint: 'max 24', minQty: 0, maxQty: 24 },
    'networking': { constraint: 'max 8', minQty: 0, maxQty: 8 },
    'cooling / thermal': { constraint: 'max 6', minQty: 0, maxQty: 6 }
  };
  const defaultConstraintObj = CATEGORY_DEFAULT_CONSTRAINTS[parentCat.toLowerCase()] || {};
  let finalConstraint = matchedSubcat && matchedSubcat.constraint ? matchedSubcat.constraint : (defaultConstraintObj.constraint || '');
  let finalMaxQty = matchedSubcat && matchedSubcat.maxQty ? matchedSubcat.maxQty : (defaultConstraintObj.maxQty || '');
  let finalMinQty = matchedSubcat && matchedSubcat.minQty ? matchedSubcat.minQty : (defaultConstraintObj.minQty || 0);

  if (parentCat === 'Chassis' || subCat.toLowerCase().includes('variants') || skus.some(s => (s['Description'] || '').toLowerCase().includes('configure-to-order'))) {
    skus.forEach(sku => {
      sku['Option Type'] = 'CTO';
    });
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

  // Deduplicate into master SKU list with price-prioritization
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
    if (parentCat === 'Chassis') {
      newSKURow['Option Type'] = 'CTO';
    }

    const hasValidPrice = (row) => {
      const p = String(row['Unit Price (USD)'] || row['Price (USD)'] || row['Price'] || '').replace(/[\$,\s]/g, '');
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

// ============================================================
// Step 4: Merge sub-tables into parent subcategory
// ============================================================
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

// NOTE: Component role classification is handled by classifyComponentRole() in scripts/lib/product_meta.js
// which is called by catalog_formatter.js during SKU row generation.

// ============================================================
// Step 5: Process Catalog Diffs & History Snapshots
// ============================================================
console.log('\n--- Step 5: Catalog Diff Engine & Historical Price Tracking ---');

const historyDir = path.join(targetDir, 'history');

function isServiceEntry(e) {
  const pc = (e.parentCategory || '').toLowerCase();
  if (pc.includes('service') || pc.includes('pointnext') || pc.includes('tech care') || pc.includes('support')) return true;
  return (e.skus || []).some(s => {
    return s.optionType === 'Service' || s['Option Type'] === 'Service' || isServiceSku(s.sku || s['Product #'] || '');
  });
}

const hardwareEntries = [];
const servicesEntries = [];
orderedEntries.forEach(e => {
  if (isServiceEntry(e)) {
    servicesEntries.push(e);
  } else {
    hardwareEntries.push(e);
  }
});

// Ensure base CTO chassis entry is present in hardwareEntries
const hasChassisEntry = hardwareEntries.some(e =>
  (e.parentCategory || '').toLowerCase() === 'chassis' ||
  (e.subCategory || '').toLowerCase() === 'variants'
);

// GAP FIX #4: Removed hardcoded DL380 Gen12 chassis variants.
// Instead, dynamically load from history snapshots or log a clear warning.
if (!hasChassisEntry) {
  let injectedFromHistory = false;
  const historyDir = path.join(targetDir, 'history');
  if (fs.existsSync(historyDir)) {
    const histFiles = fs.readdirSync(historyDir)
      .filter(f => f.startsWith('catalog_') && f.endsWith('.json'))
      .sort().reverse();
    for (const hf of histFiles) {
      try {
        const hCat = JSON.parse(fs.readFileSync(path.join(historyDir, hf), 'utf-8'));
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
      } catch (_) { /* ignore corrupt history files */ }
    }
  }
  if (!injectedFromHistory) {
    console.warn(`  ⚠️  WARNING: No chassis entry found in scraped data or history for ${chassisLabel}.`);
    console.warn(`      The catalog may be incomplete — base CTO chassis variants are missing.`);
    console.warn(`      Ensure the OCA portal page shows the full product node menu.`);
  }
}

const getUniqueSkuCount = (entries) => {
  const set = new Set();
  entries.forEach(e => (e.skus || []).forEach(s => set.add(s.sku || s['Product #'])));
  return set.size;
};

const buildCatalogObject = (entries) => {
  return {
    metadata: {
      chassis:            filePrefix.replace(/_/g, ' '),
      model:              meta.cleanName || chassisLabel,
      family:             meta.family || 'ProLiant',
      generation:         meta.gen || 'Gen12',
      scrapeDate:         new Date().toISOString(),
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
};

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

const catalogObj = buildCatalogObject(hardwareEntries);
const servicesCatalogObj = buildCatalogObject(cleanServicesEntries);

// Run diff engine on HARDWARE entries
const { enrichedCatalog } = processCatalogDiff(catalogObj, historyDir);

// Run diff engine on SERVICES entries independently
// Uses separate snapshot prefix (services_catalog_YYYY-MM-DD.json) and
// separate price_history, attribute_history, discontinued_skus files
// so service pricing history never mingles with hardware history.
const servicesHistoryDir = path.join(targetDir, 'services_history');
const { enrichedCatalog: enrichedServicesCatalog } = processCatalogDiff(
  servicesCatalogObj, servicesHistoryDir, 'services'
);


// Perform Incremental Checksum Differential against existing catalog
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

// Record version snapshot with cryptographic SHA-256 checksum
recordVersionSnapshot(enrichedCatalog, historyDir);

pipelineLogger.logStep('Step 5: Catalog Diff Engine', 'SUCCESS', {
  totalSubcategories: enrichedCatalog.metadata?.totalSubcategories,
  totalUniqueSKUs: enrichedCatalog.metadata?.totalUniqueSKUs,
  incrementalStats: incrementalDiff.stats
});

// Record SKU classification tasks in logger
enrichedCatalog.entries?.forEach(e => {
  e.skus?.forEach(s => {
    const rawPn = s.sku || s['Product #'] || s['SKU'] || '';
    pipelineLogger.logSKUClassification(cleanBaseSKU(rawPn), e.parentCategory, e.subCategory, 'CLASSIFIED', {
      description: s.description || s['Description'] || '',
      optionType: s.optionType || s['Option Type'] || ''
    });
  });
});

// ============================================================
// Step 6: Validate & Write Outputs Atomically
// ============================================================
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

// Build Chassis Variant Matrix from the TSV (which has the most accurate classification).
const CHASSIS_FF_MAP = {
  '8SFF': 'Small Form Factor (8-Bay SFF)', '24SFF': 'Small Form Factor (24-Bay SFF)',
  '12LFF': 'Large Form Factor (12-Bay LFF)', '8LFF': 'Large Form Factor (8-Bay LFF)',
  '16EDSFF': 'eDesign SFF (16-Bay EDSFF)', 'High Power': 'High Power / Telco',
  'Telco': 'High Power / Telco'
};

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

// Read from both SKUs TSV and Services TSV to find CTO Base Chassis rows
const skuTSVRows = parseTSVRows(path.join(scrapsDir, `${filePrefix}_Catalog_SKUs.tsv`));
const srvTSVRows = parseTSVRows(path.join(scrapsDir, `${filePrefix}_Services_SKUs.tsv`));
const allTSVRows = [...skuTSVRows, ...srvTSVRows];

const chassisVariantRows = allTSVRows.filter(r => {
  const cat = (r['Main Category'] || '').toLowerCase();
  const sub = (r['Sub-Category'] || '').toLowerCase();
  const role = (r['Component Role'] || '').toLowerCase();
  const desc = (r['Description'] || '').toLowerCase();
  const isChassisCategory = cat === 'chassis' || role === 'base chassis';
  const isCtoServer = desc.includes('cto server') || desc.includes('cto chassis') || desc.includes('base server');
  const isNonChassisAccessory = desc.includes('factory integrated') || desc.includes('heatsink') || desc.includes('processor') || desc.includes('fan kit') || desc.includes('cable');
  return (isChassisCategory || isCtoServer) && !isNonChassisAccessory;
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
}).filter(v => v.sku && /^[A-Z0-9]+-[A-Z0-9]+$/.test(v.sku)); // Only valid HPE SKU format

const chassisVariantMatrix = {};
for (const v of chassisVariants) {
  if (v.sku) chassisVariantMatrix[v.sku] = v;
}

// Fallback: if no chassis variants found in current TSVs, load from history catalog snapshots
if (Object.keys(chassisVariantMatrix).length === 0) {
  const historyDir = path.join(targetDir, 'history');
  if (fs.existsSync(historyDir)) {
    const histFiles = fs.readdirSync(historyDir)
      .filter(f => f.startsWith('catalog_') && f.endsWith('.json'))
      .sort().reverse();
    for (const hf of histFiles) {
      try {
        const hCat = JSON.parse(fs.readFileSync(path.join(historyDir, hf), 'utf-8'));
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
        if (Object.keys(chassisVariantMatrix).length > 0) break;
      } catch (_) { /* ignore corrupt history files */ }
    }
  }
}

// Standalone Rules JSON (Dual Safety Net)
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


// Atomic write hardware catalog companion JSON with schema verification
safeWriteJsonAtomic(jsonOutputPath, enrichedCatalog, { validateSchema: true, rejectInvalid: true });

// Atomic write services catalog JSON — enriched with full diff annotations
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

  console.log('\n=== CATEGORY BREAKDOWN ===');
  Object.entries(catCounts).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`  • ${cat.padEnd(35)}: ${count} SKUs`);
  });
  console.log('\n✅ CLASSIFICATION COMPLETE.');
}
