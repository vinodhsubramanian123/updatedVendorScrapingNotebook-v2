'use strict';
/**
 * scripts/csv_to_catalog.js — Converts Catalog_SKUs.csv to _Catalog.json
 * Enables full sync between GitHub CSV exports and AI Studio Dashboard.
 */

const fs = require('fs');
const path = require('path');

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function convertCSVToCatalogJSON(csvPath, jsonOutputPath) {
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found: ${csvPath}`);
    return false;
  }

  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return false;

  const header = parseCSVLine(lines[0]);
  const colIdx = {};
  header.forEach((h, i) => { colIdx[h.trim()] = i; });

  const getVal = (row, colName) => {
    const idx = colIdx[colName];
    return idx !== undefined && row[idx] !== undefined ? row[idx] : '';
  };

  const folderName = path.basename(path.dirname(csvPath));
  const chassisLabel = folderName.replace(/_/g, ' ');

  const grouped = new Map(); // key: MainCategory|SubCategory
  const uniqueSKUs = new Set();

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    const parentCat = getVal(row, 'Main Category') || 'General';
    const subCat = getVal(row, 'Sub-Category') || parentCat;
    const sku = getVal(row, 'Product #');
    const desc = getVal(row, 'Description');
    const constraint = getVal(row, 'Constraint Text') || '';
    const maxQtyRaw = getVal(row, 'Subcategory Max Qty');
    const maxQty = maxQtyRaw ? parseInt(maxQtyRaw, 10) : -1;
    const unitPriceStr = getVal(row, 'Unit Price (USD)').replace(/[$,]/g, '');
    const unitPrice = parseFloat(unitPriceStr) || 0;
    const optionType = getVal(row, 'Option Type') || 'Standard';
    const startDate = getVal(row, 'Start Date') || '';
    const discontinuedDate = getVal(row, 'Discontinued Date') || '';
    const currentQty = parseInt(getVal(row, 'Current Qty'), 10) || 0;

    if (!sku) continue;
    uniqueSKUs.add(sku);

    const key = `${parentCat}||${subCat}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        parentCategory: parentCat,
        subCategory: subCat,
        constraint: constraint,
        maxQty: maxQty,
        rules: [],
        headers: ['Product #', 'Description', 'List Price', 'Qty', 'Start Date'],
        rows: [],
        skus: [],
        skuCount: 0
      });
    }

    const entry = grouped.get(key);
    entry.skus.push({
      'Product #': sku,
      'Description': desc,
      'Unit Price (USD)': unitPrice.toFixed(2),
      'Price (USD)': unitPrice.toFixed(2),
      'Current Qty': String(currentQty),
      'Option Type': optionType,
      'Start Date': startDate,
      'Discontinued Date': discontinuedDate,
      'Constraint Text': constraint,
      'Subcategory Max Qty': maxQtyRaw,
      // Alias keys for legacy backward compatibility:
      sku,
      description: desc,
      listPrice: unitPrice,
      listPriceFormatted: `$${unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      qty: currentQty
    });

    entry.rows.push([
      sku,
      desc,
      `$${unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      String(currentQty),
      startDate
    ]);

    entry.skuCount = entry.skus.length;
  }

  const subcategoriesMap = new Map();
  const entries = Array.from(grouped.values());

  entries.forEach(e => {
    if (!subcategoriesMap.has(e.subCategory)) {
      subcategoriesMap.set(e.subCategory, {
        parentCategory: e.parentCategory,
        name: e.subCategory,
        constraint: e.constraint,
        maxQty: e.maxQty
      });
    }
  });

  const catalogJSON = {
    metadata: {
      chassis: chassisLabel,
      scrapeDate: new Date().toISOString(),
      totalSubcategories: subcategoriesMap.size,
      totalUniqueSKUs: uniqueSKUs.size,
      totalTables: entries.length,
      diffSummary: {
        added: uniqueSKUs.size,
        removed: 0,
        priceChanged: 0,
        unchanged: 0
      },
      source: 'GitHub Catalog CSV Sync'
    },
    subcategories: Array.from(subcategoriesMap.values()),
    entries: entries
  };

  // Process Catalog Diffs against snapshot history
  const targetDir = path.dirname(jsonOutputPath);
  const historyDir = path.join(targetDir, 'history');
  try {
    const { processCatalogDiff } = require('./lib/diff_catalog.js');
    processCatalogDiff(catalogJSON, historyDir);
    const { safeWriteJsonAtomic } = require('./lib/fs_compat.js');
    safeWriteJsonAtomic(jsonOutputPath, catalogJSON, { validateSchema: true });
  } catch (err) {
    console.warn(`  ⚠️ Catalog diff calculation skipped/failed for ${chassisLabel}: ${err.message}`);
    const { safeWriteJsonAtomic } = require('./lib/fs_compat.js');
    safeWriteJsonAtomic(jsonOutputPath, catalogJSON);
  }

  // Generate TSV intermediate scraps & rebuild Excel workbook
  try {
    const targetDir = path.dirname(jsonOutputPath);
    const scrapsDir = path.join(targetDir, 'intermittent_scraps');
    if (!fs.existsSync(scrapsDir)) fs.mkdirSync(scrapsDir, { recursive: true });

    const filePrefix = path.basename(jsonOutputPath, '.json').replace(/_Catalog$/, '');
    const { generateMainSheet, generateRulesSheet, generateSummarySheet } = require('./lib/catalog_formatter.js');

    const subcatList = Array.from(subcategoriesMap.values()).map(s => ({
      parentCategory: s.parentCategory,
      name: s.name,
      constraint: s.constraint,
      maxQty: s.maxQty
    }));

    fs.writeFileSync(path.join(scrapsDir, `${filePrefix}_Catalog_SKUs.tsv`), generateMainSheet(entries, chassisLabel), 'utf-8');
    fs.writeFileSync(path.join(scrapsDir, `${filePrefix}_Catalog_Rules.tsv`), generateRulesSheet(entries, subcatList), 'utf-8');
    fs.writeFileSync(path.join(scrapsDir, `${filePrefix}_Catalog_Summary.tsv`), generateSummarySheet(entries, subcatList), 'utf-8');

    const generateXlsxScript = path.join(__dirname, 'generate_xlsx.js');
    const xlsxPath = path.join(targetDir, `${filePrefix}_OCA_Catalog.xlsx`);
    if (fs.existsSync(generateXlsxScript)) {
      const { execSync } = require('child_process');
      execSync(`node "${generateXlsxScript}" "${xlsxPath}"`, { stdio: 'pipe' });
    }
  } catch (err) {
    console.warn(`  ⚠️ TSV/Excel generation failed during CSV sync: ${err.message}`);
  }

  console.log(`✅ Successfully generated ${jsonOutputPath} with ${uniqueSKUs.size} SKUs across ${entries.length} sections.`);
  return true;
}

if (require.main === module) {
  const csvPath = process.argv[2];
  const jsonPath = process.argv[3];
  if (!csvPath || !jsonPath) {
    console.error('Usage: node scripts/csv_to_catalog.js <input.csv> <output.json>');
    process.exit(1);
  }
  convertCSVToCatalogJSON(csvPath, jsonPath);
}

module.exports = { convertCSVToCatalogJSON };
