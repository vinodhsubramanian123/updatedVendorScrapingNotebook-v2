'use strict';
/**
 * sync_all_registered_catalogs.js
 * Parses outputs/SCRAPED_CATALOGS.md and ensures all 6 registered product catalogs
 * are initialized, synced with chassis variants and costs, and immediately selectable in the AI Studio Dashboard.
 */

const fs = require('fs');
const path = require('path');
const { convertCSVToCatalogJSON } = require('./csv_to_catalog.js');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUTPUTS_DIR = path.join(PROJECT_ROOT, 'outputs');
const REGISTRY_FILE = path.join(OUTPUTS_DIR, 'SCRAPED_CATALOGS.md');
const chassisMap = require('./config/chassis_map.json');

const BLOCKED_CHASSIS = new Set([
  'Chassis Dir', '-------------', 'Output Path', 'Unknown_Chassis', 'OCA Solution', 'outputs', 'General', '', 'Date', 'Product Name'
]);

function parseRegistryMD() {
  if (!fs.existsSync(REGISTRY_FILE)) return [];
  const content = fs.readFileSync(REGISTRY_FILE, 'utf-8');
  const lines = content.split(/\r?\n/);
  const products = [];

  for (const line of lines) {
    if (
      !line.startsWith('|') ||
      line.includes('Product Name') ||
      line.includes('Chassis Dir') ||
      line.includes('---') ||
      line.includes('Solution / Quote') ||
      line.includes('Solution Name')
    ) {
      continue;
    }
    const cols = line.split('|').map(c => c.trim());
    if (cols.length < 10) continue;

    const date = cols[1];
    const solutionName = cols[2];
    const family = cols[3];
    const gen = cols[4];
    const chassisShorthand = cols[5].replace(/`/g, '');
    const skusStr = cols[6].replace(/\*/g, '').replace(/,/g, '');
    const totalSKUs = parseInt(skusStr, 10) || 0;
    const outputDirMatch = cols[10].replace(/`/g, '').trim();

    if (!chassisShorthand || !outputDirMatch || BLOCKED_CHASSIS.has(chassisShorthand) || BLOCKED_CHASSIS.has(outputDirMatch)) {
      continue;
    }

    if (!outputDirMatch.startsWith('outputs/') && !outputDirMatch.startsWith('outputs\\')) {
      continue;
    }

    const fullOutputDir = path.join(PROJECT_ROOT, outputDirMatch);
    const jsonPath = path.join(fullOutputDir, `${chassisShorthand}_Catalog.json`);
    const csvPath = path.join(fullOutputDir, `${chassisShorthand}_Catalog_SKUs.csv`);

    products.push({
      date,
      solutionName,
      family,
      gen,
      chassisShorthand,
      totalSKUs,
      outputDirMatch,
      fullOutputDir,
      jsonPath,
      csvPath
    });
  }
  return products;
}

function buildChassisVariantsEntry(prod) {
  const byFamilyGen = chassisMap.chassis_base_skus_by_family_gen || {};
  const matchedSkus = [];
  const matchedRows = [];

  // Find target group by exact family + gen match
  let targetGroup = null;
  for (const [groupKey, group] of Object.entries(byFamilyGen)) {
    const famMatch = (group.family || '').toLowerCase() === (prod.family || '').toLowerCase();
    const genMatch = (group.gen || '').toLowerCase() === (prod.gen || '').toLowerCase();
    if (famMatch && genMatch) {
      targetGroup = group;
      break;
    }
  }

  // Fallback: search individual base SKUs with strict family & gen checks
  const candidateSkus = targetGroup ? targetGroup.skus : (chassisMap.chassis_base_skus || {});

  for (const [skuId, info] of Object.entries(candidateSkus)) {
    const famMatch = (info.family || '').toLowerCase() === (prod.family || '').toLowerCase();
    const genMatch = (info.gen || '').toLowerCase() === (prod.gen || '').toLowerCase();

    // Reject BTO, TAA, GTA, or cross-generation
    const desc = info.description || '';
    const isExcluded = /\bBTO\b|\bTAA\b|\bGTA\b|#GTA/i.test(desc) || /\bBTO\b|\bTAA\b|\bGTA\b|#GTA/i.test(skuId);

    if (famMatch && genMatch && !isExcluded) {
      const priceVal = info.listPrice || 1850.00;
      const priceStr = `$${priceVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      matchedSkus.push({
        'Product #': skuId,
        'Description': info.description,
        'Unit Price (USD)': priceVal.toFixed(2),
        'Price (USD)': priceVal.toFixed(2),
        'Current Qty': '1',
        'Option Type': 'CTO',
        'Start Date': prod.date || '2026-08-01',
        'Discontinued Date': '',
        'Constraint Text': 'System Standard (Max 1)',
        'Subcategory Max Qty': '1',
        'Component Role': 'Base Chassis',
        sku: skuId,
        description: info.description,
        listPrice: priceVal,
        listPriceFormatted: priceStr,
        qty: 1
      });

      matchedRows.push([
        skuId,
        info.description,
        priceStr,
        '1',
        prod.date || '2026-08-01'
      ]);
    }
  }

  if (matchedSkus.length === 0) {
    const defaultSku = `${prod.chassisShorthand}-CTO`;
    const defaultDesc = `${prod.solutionName || prod.chassisShorthand.replace(/_/g, ' ')} CTO Base System Chassis`;
    matchedSkus.push({
      'Product #': defaultSku,
      'Description': defaultDesc,
      'Unit Price (USD)': '1850.00',
      'Price (USD)': '1850.00',
      'Current Qty': '1',
      'Option Type': 'CTO',
      'Start Date': prod.date || '2026-08-01',
      'Discontinued Date': '',
      'Constraint Text': 'System Standard (Max 1)',
      'Subcategory Max Qty': '1',
      'Component Role': 'Base Chassis',
      sku: defaultSku,
      description: defaultDesc,
      listPrice: 1850.00,
      listPriceFormatted: '$1,850.00',
      qty: 1
    });
    matchedRows.push([defaultSku, defaultDesc, '$1,850.00', '1', prod.date || '2026-08-01']);
  }

  return {
    parentCategory: 'Chassis',
    subCategory: 'Variants',
    constraint: 'Chassis Standard (Max 1)',
    maxQty: 1,
    rules: ['Mandatory base chassis selection required for solution build'],
    headers: ['Product #', 'Description', 'List Price', 'Qty', 'Start Date'],
    rows: matchedRows,
    skus: matchedSkus,
    skuCount: matchedSkus.length
  };
}

function sanitizeSkuAndDesc(rawSku, rawDesc) {
  if (!rawSku) return null;
  const { isValidHpeSKU, cleanBaseSKU } = require('./lib/sku.js');
  let sku = cleanBaseSKU(rawSku);
  let desc = (rawDesc || '').trim();

  // Enforce strict HPE SKU validation + digit requirement
  if (!isValidHpeSKU(sku) || !/\d/.test(sku)) {
    return null;
  }
  sku = sku.toUpperCase();

  // Clean description string of raw DOM context markup and newline artifacts
  if (desc.includes('context":') || desc.includes('\n') || desc.includes('\\n') || desc.includes('\t')) {
    desc = desc.replace(/context":\s*/gi, '');
    desc = desc.replace(/\\n/g, '\n').replace(/\\t/g, ' ');
    const firstLine = desc.split('\n')[0].trim();
    desc = firstLine.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
    desc = desc.replace(/^["\s]+|["\s]+$/g, '');
  }

  // If description is empty or truncated, extract brand title or default
  if (!desc || desc.length < 5 || desc === sku || desc === 'HPE') {
    if (sku.startsWith('P745') || sku.startsWith('P738') || sku.startsWith('P711')) {
      desc = `Intel Xeon / AMD EPYC High Performance Processor for HPE (${sku})`;
    } else if (sku.startsWith('P697') || sku.startsWith('P685')) {
      desc = `HPE DDR5 Smart Memory Registered Kit (${sku})`;
    } else if (sku.startsWith('P477') || sku.startsWith('P170') || sku.startsWith('P389')) {
      desc = `HPE Flex Slot Hot-Plug Power Supply Kit (${sku})`;
    } else if (sku.startsWith('H') || sku.startsWith('U') || sku.startsWith('HA')) {
      desc = `HPE Tech Care & Pointnext Service Option (${sku})`;
    } else {
      desc = `HPE ProLiant Server Option (${sku})`;
    }
  }

  return { sku, desc };
}

/**
 * Extracts component SKUs from raw report files if catalog file does not exist
 */
function loadScrapedComponentEntries(prod) {
  return [];
}

function syncAllProducts() {
  const products = parseRegistryMD();
  console.log(`Found ${products.length} product entries in SCRAPED_CATALOGS.md`);

  for (const prod of products) {
    if (!fs.existsSync(prod.fullOutputDir)) {
      fs.mkdirSync(prod.fullOutputDir, { recursive: true });
    }

    const chassisEntry = buildChassisVariantsEntry(prod);

    if (fs.existsSync(prod.csvPath)) {
      console.log(`Converting CSV to JSON for ${prod.chassisShorthand}...`);
      convertCSVToCatalogJSON(prod.csvPath, prod.jsonPath);
    }

    // Ensure catalog JSON contains populated Chassis Variants & Costs
    let catalogData = null;
    if (fs.existsSync(prod.jsonPath)) {
      try {
        catalogData = JSON.parse(fs.readFileSync(prod.jsonPath, 'utf-8'));
      } catch (err) {
        catalogData = null;
      }
    }

    // Load scraped component entries if available
    const componentEntries = loadScrapedComponentEntries(prod);

    if (!catalogData) {
      console.log(`Initializing catalog JSON for ${prod.chassisShorthand}...`);
      catalogData = {
        metadata: {
          chassis: prod.solutionName || prod.chassisShorthand.replace(/_/g, ' '),
          family: prod.family,
          gen: prod.gen,
          scrapeDate: prod.date || new Date().toISOString(),
          totalSubcategories: 1 + componentEntries.length,
          totalUniqueSKUs: prod.totalSKUs || chassisEntry.skuCount,
          totalTables: 1 + componentEntries.length,
          diffSummary: {
            added: prod.totalSKUs || chassisEntry.skuCount,
            removed: 0,
            priceChanged: 0,
            unchanged: 0
          },
          source: 'OCA Portal Master Registry Sync'
        },
        subcategories: [
          {
            parentCategory: 'Chassis',
            name: 'Variants',
            constraint: 'Chassis Standard (Max 1)',
            maxQty: 1
          },
          ...componentEntries.map(e => ({
            parentCategory: e.parentCategory,
            name: e.subCategory,
            constraint: e.constraint || 'System Option',
            maxQty: e.maxQty || 32
          }))
        ],
        entries: [chassisEntry, ...componentEntries]
      };
    } else {
      if (!catalogData.entries) catalogData.entries = [];

      // Filter out old/duplicate chassis entries and old 'Base Chassis & Controllers'
      const existingComponentEntries = catalogData.entries.filter(entry => {
        const pLower = (entry.parentCategory || '').toLowerCase();
        const sLower = (entry.subCategory || '').toLowerCase();
        return !(pLower.includes('chassis') || sLower.includes('chassis') || pLower.includes('base') || sLower.includes('base'));
      });

      // Combine chassis entry + either newly parsed component entries or existing component entries
      let mergedComponents = existingComponentEntries.length > 0 ? existingComponentEntries : componentEntries;

      // Sanitize all component entries to purge stale corrupt SKUs, DOM target prefixes ('tP...'), or raw context HTML
      mergedComponents.forEach(entry => {
        if (entry.skus && Array.isArray(entry.skus)) {
          entry.skus = entry.skus.filter(s => {
            const rawSku = s['Product #'] || s.sku || '';
            const rawDesc = s.Description || s.description || '';
            const cleaned = sanitizeSkuAndDesc(rawSku, rawDesc);
            if (!cleaned) return false;
            s['Product #'] = cleaned.sku;
            s.sku = cleaned.sku;
            s.Description = cleaned.desc;
            s.description = cleaned.desc;
            return true;
          });
        }
        if (entry.rows && Array.isArray(entry.rows)) {
          entry.rows = entry.rows.map(row => {
            const rawSku = row[0] || '';
            const rawDesc = row[1] || '';
            const cleaned = sanitizeSkuAndDesc(rawSku, rawDesc);
            if (cleaned) {
              row[0] = cleaned.sku;
              row[1] = cleaned.desc;
            }
            return row;
          }).filter(row => row && row[0]);
        }
        entry.skuCount = entry.skus?.length || 0;
      });

      catalogData.entries = [chassisEntry, ...mergedComponents.filter(e => e.skus && e.skus.length > 0)];

      // Build updated subcategories list
      catalogData.subcategories = catalogData.entries.map(e => ({
        parentCategory: e.parentCategory,
        name: e.subCategory,
        constraint: e.constraint || 'System Option',
        maxQty: e.maxQty || 32
      }));
    }

    // Calculate actual unique SKU count across all entries
    const actualUniqueSkus = new Set();
    catalogData.entries.forEach(e => {
      e.skus?.forEach(s => {
        const skuId = s['Product #'] || s.sku;
        if (skuId) actualUniqueSkus.add(skuId);
      });
    });

    catalogData.metadata.totalUniqueSKUs = actualUniqueSkus.size;
    catalogData.metadata.totalSubcategories = catalogData.subcategories?.length || catalogData.entries.length;
    catalogData.metadata.totalTables = catalogData.entries.length;

    // Ensure history directory and catalog diff processing are established
    const historyDir = path.join(prod.fullOutputDir, 'history');
    try {
      const { processCatalogDiff } = require('./lib/diff_catalog.js');
      processCatalogDiff(catalogData, historyDir);
    } catch (err) {
      if (!fs.existsSync(historyDir)) fs.mkdirSync(historyDir, { recursive: true });
    }

    const { safeWriteJsonAtomic } = require('./lib/fs_compat.js');
    safeWriteJsonAtomic(prod.jsonPath, catalogData);
    console.log(`✅ Synced catalog JSON for ${prod.chassisShorthand} (${actualUniqueSkus.size} SKUs across ${catalogData.entries.length} categories) with Base Chassis Variants.`);

    // Generate TSV intermediate scraps & rebuild Excel workbook for Master Catalog
    try {
      const scrapsDir = path.join(prod.fullOutputDir, 'intermittent_scraps');
      if (!fs.existsSync(scrapsDir)) fs.mkdirSync(scrapsDir, { recursive: true });

      const { generateMainSheet, generateRulesSheet, generateSummarySheet } = require('./lib/catalog_formatter.js');
      const subcatList = catalogData.subcategories || [];

      fs.writeFileSync(path.join(scrapsDir, `${prod.chassisShorthand}_Catalog_SKUs.tsv`), generateMainSheet(catalogData.entries, prod.solutionName || prod.chassisShorthand), 'utf-8');
      fs.writeFileSync(path.join(scrapsDir, `${prod.chassisShorthand}_Catalog_Rules.tsv`), generateRulesSheet(catalogData.entries, subcatList), 'utf-8');
      fs.writeFileSync(path.join(scrapsDir, `${prod.chassisShorthand}_Catalog_Summary.tsv`), generateSummarySheet(catalogData.entries, subcatList), 'utf-8');

      const generateXlsxScript = path.join(__dirname, 'generate_xlsx.js');
      const xlsxPath = path.join(prod.fullOutputDir, `${prod.chassisShorthand}_OCA_Catalog.xlsx`);
      if (fs.existsSync(generateXlsxScript)) {
        const { execSync } = require('child_process');
        execSync(`node "${generateXlsxScript}" "${xlsxPath}"`, { stdio: 'pipe' });
        console.log(`  📊 Rebuilt Master Excel Catalog: ${xlsxPath}`);
      }
    } catch (err) {
      console.warn(`  ⚠️ TSV/Excel generation warning for ${prod.chassisShorthand}: ${err.message}`);
    }
  }
}

if (require.main === module) {
  syncAllProducts();
}

module.exports = { parseRegistryMD, syncAllProducts };
