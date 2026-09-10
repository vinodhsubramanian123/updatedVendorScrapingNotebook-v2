'use strict';
/**
 * sync_all_registered_catalogs.js
 * Parses outputs/SCRAPED_CATALOGS.md and ensures all 6 registered product catalogs
 * are initialized, synced with chassis variants and costs, and immediately selectable in the AI Studio Dashboard.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { convertCSVToCatalogJSON } = require('./csv_to_catalog.js');
const { getHistoricalSkuPrice } = require('../lib/catalog/sku_versioning.js');
const { isCanonicalCtoChassisCandidate } = require('./build_catalog.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const OUTPUTS_DIR = path.join(PROJECT_ROOT, 'outputs');
const REGISTRY_FILE = path.join(OUTPUTS_DIR, 'SCRAPED_CATALOGS.md');
const chassisMap = require('../config/chassis_map.json');

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

  // Match the exact product only. Family+generation fallback caused DL380
  // variants to contaminate DL145 and is intentionally forbidden.
  let targetGroup = null;
  const normShorthand = (prod.chassisShorthand || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [groupKey, group] of Object.entries(byFamilyGen)) {
    const normKey = groupKey.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normModel = (group.modelFamily || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normKey.includes(normShorthand) || (normModel && normShorthand.includes(normModel))) {
      targetGroup = group;
      break;
    }
  }

  const candidateSkus = targetGroup ? targetGroup.skus : {};

  for (const [skuId, info] of Object.entries(candidateSkus)) {
    const desc = info.description || '';
    const isExactCto = isCanonicalCtoChassisCandidate({ sku: skuId, text: desc }, prod.chassisShorthand);

    if (isExactCto) {
      const historical = getHistoricalSkuPrice(skuId, prod.fullOutputDir);
      const priceVal = Number(historical?.priceUsd || 0);
      const priceStr = priceVal > 0 ? `$${priceVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '';

      matchedSkus.push({
        'Product #': skuId,
        'Description': info.description,
        'Unit Price (USD)': priceVal.toFixed(2),
        'Price (USD)': priceVal.toFixed(2),
        'Current Qty': '1',
        'Option Type': 'CTO',
        'Lifecycle Status': 'Active',
        'Availability': 'Catalog identity only — verify in current OCA discovery',
        'Lead Time': '',
        'Lead Time Source': 'Not published by OCA',
        'Start Date': info.startDate || '',
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
        info.startDate || ''
      ]);
    }
  }

  if (matchedSkus.length === 0) return null;

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

    if (!catalogData) {
      console.warn(`Skipping ${prod.chassisShorthand}: no certified scraped catalog exists. Registry sync never fabricates a placeholder catalog.`);
      continue;
    } else if (chassisEntry) {
      if (!catalogData.entries) catalogData.entries = [];
      const hasCertifiedChassis = catalogData.entries.some(entry =>
        String(entry.parentCategory || '').toLowerCase() === 'chassis' || String(entry.subCategory || '').toLowerCase() === 'variants'
      );
      if (!hasCertifiedChassis) {
        console.log(`Adding exact-product chassis identity for ${prod.chassisShorthand}; current SKU/pricing still requires OCA certification.`);
        catalogData.entries.unshift(chassisEntry);
      } else {
        console.log(`Preserving current OCA-certified chassis rows for ${prod.chassisShorthand}.`);
      }
    } else {
      console.warn(`Preserving current ${prod.chassisShorthand} chassis rows: no exact-product certified registry mapping was found.`);
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
      const { processCatalogDiff } = require('../lib/catalog/diff_catalog.js');
      processCatalogDiff(catalogData, historyDir);
    } catch (err) {
      if (!fs.existsSync(historyDir)) fs.mkdirSync(historyDir, { recursive: true });
    }

    const { safeWriteJsonAtomic } = require('../lib/system/fs_compat.js');
    safeWriteJsonAtomic(prod.jsonPath, catalogData);
    console.log(`✅ Synced catalog JSON for ${prod.chassisShorthand} (${actualUniqueSkus.size} SKUs across ${catalogData.entries.length} categories) with Base Chassis Variants.`);

    // Generate TSV intermediate scraps & rebuild Excel workbook for Master Catalog
    try {
      const scrapsDir = path.join(prod.fullOutputDir, 'intermittent_scraps');
      if (!fs.existsSync(scrapsDir)) fs.mkdirSync(scrapsDir, { recursive: true });

      const { generateMainSheet, generateRulesSheet, generateSummarySheet } = require('../lib/catalog/catalog_formatter.js');
      const subcatList = catalogData.subcategories || [];

      fs.writeFileSync(path.join(scrapsDir, `${prod.chassisShorthand}_Catalog_SKUs.tsv`), generateMainSheet(catalogData.entries, prod.solutionName || prod.chassisShorthand), 'utf-8');
      fs.writeFileSync(path.join(scrapsDir, `${prod.chassisShorthand}_Catalog_Rules.tsv`), generateRulesSheet(catalogData.entries, subcatList), 'utf-8');
      fs.writeFileSync(path.join(scrapsDir, `${prod.chassisShorthand}_Catalog_Summary.tsv`), generateSummarySheet(catalogData.entries, subcatList), 'utf-8');

      const generateXlsxScript = path.join(__dirname, 'generate_xlsx.js');
      const xlsxPath = path.join(prod.fullOutputDir, `${prod.chassisShorthand}_OCA_Catalog.xlsx`);
      if (fs.existsSync(generateXlsxScript)) {
        execFileSync(process.execPath, [generateXlsxScript, xlsxPath], { stdio: 'pipe' });
        console.log(`  📊 Rebuilt Master Excel Catalog: ${xlsxPath}`);

        try {
          const xlsx = require('xlsx-js-style');
          const wb = xlsx.readFile(xlsxPath);
          const sheet = wb.Sheets['All SKUs'] || wb.Sheets[wb.SheetNames[0]];
          if (sheet) {
            const csvData = xlsx.utils.sheet_to_csv(sheet);
            fs.writeFileSync(path.join(prod.fullOutputDir, `${prod.chassisShorthand}_Master_Catalog.csv`), csvData, 'utf-8');
          }
        } catch (_) { /* non-fatal */ }
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
