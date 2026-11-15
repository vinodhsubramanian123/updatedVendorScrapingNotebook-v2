const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx-js-style');

function extractRulesMapFromSheet(wb) {
  const rulesSheet = wb.Sheets['Rules & Constraints'];
  const rulesData = rulesSheet ? XLSX.utils.sheet_to_json(rulesSheet) : [];
  const rulesMap = new Map();
  for (const r of rulesData) {
    const key = `${r['Main Category']}||${r['Sub-Category']}`;
    if (!rulesMap.has(key)) rulesMap.set(key, []);
    rulesMap.get(key).push(r['Rule Text'] || '');
  }
  return rulesMap;
}

function _readCell(row, colIdx, key) {
  if (!row) return undefined;
  if (Array.isArray(row)) {
    const idx = colIdx instanceof Map ? colIdx.get(key) : colIdx?.[key];
    return idx !== undefined && idx >= 0 ? row[idx] : undefined;
  }
  return row[key];
}

function _hasCell(val) {
  return val !== undefined && val !== null && String(val).trim() !== '';
}

function _formatPreservedUsd(rawVal, signed = false) {
  if (typeof rawVal === 'number' && Number.isFinite(rawVal)) {
    const abs = Math.abs(rawVal).toFixed(2);
    if (!signed) return rawVal.toFixed(2);
    if (rawVal > 0) return `+$${abs}`;
    if (rawVal < 0) return `-$${abs}`;
    return '$0.00';
  }
  return String(rawVal).trim();
}

function _applyPreservedMetadata(skuObj, row, colIdx) {
  const diffStatus = _readCell(row, colIdx, 'Diff Status');
  const prevListPrice = _readCell(row, colIdx, 'Previous List Price (USD)');
  const priceChangeUsd = _readCell(row, colIdx, 'Price Change (USD)');
  const priceChangePct = _readCell(row, colIdx, 'Price Change (%)');
  const attrDeltas = _readCell(row, colIdx, 'Attribute Deltas');
  const historyTrail = _readCell(row, colIdx, 'Price History Trail');
  const discontinuedDate = _readCell(row, colIdx, 'Discontinued Date');
  const vendorAttrsRaw = _readCell(row, colIdx, 'Vendor Attributes (JSON)');

  if (_hasCell(diffStatus)) skuObj['Diff Status'] = String(diffStatus).trim();
  if (_hasCell(prevListPrice)) skuObj['Previous List Price (USD)'] = _formatPreservedUsd(prevListPrice, false);
  if (_hasCell(priceChangeUsd)) skuObj['Price Change (USD)'] = _formatPreservedUsd(priceChangeUsd, true);
  if (_hasCell(priceChangePct)) skuObj['Price Change (%)'] = String(priceChangePct).trim();
  if (_hasCell(attrDeltas)) skuObj['Attribute Deltas'] = String(attrDeltas).trim();
  if (_hasCell(historyTrail)) skuObj['Price History Trail'] = String(historyTrail).trim();
  if (_hasCell(discontinuedDate)) skuObj['Discontinued Date'] = String(discontinuedDate).trim();

  if (_hasCell(vendorAttrsRaw)) {
    const serialized = typeof vendorAttrsRaw === 'object'
      ? JSON.stringify(vendorAttrsRaw)
      : String(vendorAttrsRaw).trim();
    skuObj['Vendor Attributes (JSON)'] = serialized;
    try {
      const parsed = typeof vendorAttrsRaw === 'object' ? vendorAttrsRaw : JSON.parse(serialized);
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        skuObj.vendorAttributes = parsed;
      }
    } catch { /* keep raw JSON string */ }
  }
}

function _buildSkuFromRow(row, colIdx = null, meta = {}) {
  const sku = _readCell(row, colIdx, 'Product #');
  if (!sku) return null;

  const parentCat = meta.parentCat || _readCell(row, colIdx, 'Main Category') || 'General';
  const desc = _readCell(row, colIdx, 'Description') || '';
  const constraint = meta.constraint !== undefined ? meta.constraint : (_readCell(row, colIdx, 'Constraint Text') || '');
  const maxQtyRaw = meta.maxQtyRaw !== undefined ? meta.maxQtyRaw : _readCell(row, colIdx, 'Subcategory Max Qty');
  const unitPrice = parseFloat(String(_readCell(row, colIdx, 'Unit Price (USD)') ?? '0').replace(/[$,]/g, '')) || 0;
  const optionType = _readCell(row, colIdx, 'Option Type') || 'Standard';
  const startDate = _readCell(row, colIdx, 'Start Date') || '';
  const discontinuedDate = _readCell(row, colIdx, 'Discontinued Date') || '';
  const currentQty = parseInt(_readCell(row, colIdx, 'Current Qty'), 10) || 0;
  const lifecycleStatus = _readCell(row, colIdx, 'Lifecycle Status') || _readCell(row, colIdx, 'CLIC Status') || 'Active';
  const clicStatus = _readCell(row, colIdx, 'CLIC Status') || lifecycleStatus;
  const availability = _readCell(row, colIdx, 'Availability') || 'Available';
  const leadTime = _readCell(row, colIdx, 'Lead Time') || '';
  const leadTimeSource = _readCell(row, colIdx, 'Lead Time Source') || 'Not published by OCA';
  const vendorAttrs = _readCell(row, colIdx, 'Vendor Attributes (JSON)') || '{}';
  const role = _readCell(row, colIdx, 'Component Role') || (parentCat === 'Chassis' ? 'Base Chassis' : 'Option Component');
  const formattedPrice = `$${unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const skuObj = {
    'Product #': sku,
    'Description': desc,
    'Unit Price (USD)': unitPrice.toFixed(2),
    'Price (USD)': unitPrice.toFixed(2),
    'Current Qty': String(currentQty),
    'Option Type': optionType,
    'Lifecycle Status': lifecycleStatus,
    'CLIC Status': clicStatus,
    'lifecycleStatus': lifecycleStatus,
    'Availability': availability,
    'Lead Time': leadTime,
    'Lead Time Source': leadTimeSource,
    'Start Date': startDate,
    'Discontinued Date': discontinuedDate ? String(discontinuedDate).trim() : '',
    'Vendor Attributes (JSON)': typeof vendorAttrs === 'object' ? JSON.stringify(vendorAttrs) : String(vendorAttrs),
    'Constraint Text': constraint,
    'Subcategory Max Qty': maxQtyRaw,
    'Component Role': role,
    sku,
    description: desc,
    listPrice: unitPrice,
    listPriceFormatted: formattedPrice,
    qty: currentQty
  };

  _applyPreservedMetadata(skuObj, row, colIdx);
  return skuObj;
}

function appendXlsxRowToGrouped(row, grouped, uniqueSKUs, rulesMap) {
  const parentCat = row['Main Category'] || 'General';
  const subCat = row['Sub-Category'] || parentCat;
  const constraint = row['Constraint Text'] || '';
  const maxQtyRaw = row['Subcategory Max Qty'];
  const maxQty = maxQtyRaw ? parseInt(maxQtyRaw, 10) : -1;
  const skuObj = _buildSkuFromRow(row, null, { parentCat, subCat, constraint, maxQtyRaw });
  if (!skuObj) return;
  const sku = skuObj['Product #'];
  uniqueSKUs.add(sku);

  const key = `${parentCat}||${subCat}`;
  if (!grouped.has(key)) {
    grouped.set(key, {
      parentCategory: parentCat,
      subCategory: subCat,
      constraint: constraint,
      maxQty: maxQty,
      rules: Array.from(new Set(rulesMap.get(key) || [])),
      headers: ['Product #', 'Description', 'List Price', 'Qty', 'Start Date'],
      rows: [],
      skus: [],
      skuCount: 0
    });
  }

  const entry = grouped.get(key);
  entry.skus.push(skuObj);
  entry.rows.push([sku, skuObj['Description'], skuObj.listPriceFormatted, skuObj['Current Qty'], skuObj['Start Date']]);
  entry.skuCount = entry.skus.length;
}

function convertXlsxToCatalog(xlsxPath, jsonOutputPath) {
  if (!fs.existsSync(xlsxPath)) {
    console.error(`XLSX not found: ${xlsxPath}`);
    return false;
  }

  const wb = XLSX.readFile(xlsxPath);
  const sheet = wb.Sheets['All SKUs'];
  if (!sheet) {
    console.error(`'All SKUs' sheet not found in ${xlsxPath}`);
    return false;
  }

  const rulesMap = extractRulesMapFromSheet(wb);
  const data = XLSX.utils.sheet_to_json(sheet);
  const folderName = path.basename(path.dirname(xlsxPath));
  const chassisLabel = folderName.replace(/_/g, ' ');

  const grouped = new Map();
  const uniqueSKUs = new Set();

  for (const row of data) {
    appendXlsxRowToGrouped(row, grouped, uniqueSKUs, rulesMap);
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
      scrapeDate: new Date().toISOString().split('T')[0],
      scrapeTimestamp: new Date().toISOString(),
      totalSubcategories: subcategoriesMap.size,
      totalUniqueSKUs: uniqueSKUs.size,
      totalTables: entries.length,
      diffSummary: {
        added: uniqueSKUs.size,
        removed: 0,
        priceChanged: 0,
        unchanged: 0
      },
      source: 'Excel Master Recovery'
    },
    subcategories: Array.from(subcategoriesMap.values()),
    entries: entries
  };
  
  const targetDir = path.dirname(jsonOutputPath);
  const historyDir = path.join(targetDir, 'history');
  const { safeWriteJsonAtomic } = require('../lib/system/fs_compat.js');
  const allSkus = entries.flatMap(e => e.skus || []);
  const hasPreservedDiffs = allSkus.some(s =>
    _hasCell(s['Diff Status']) || _hasCell(s['Attribute Deltas']) || _hasCell(s['Price History Trail'])
  );

  if (hasPreservedDiffs) {
    catalogJSON.metadata.diffSummary = _summarizePreservedDiffs(allSkus);
  }

  try {
    if (!hasPreservedDiffs) {
      const { processCatalogDiff } = require('../lib/catalog/diff_catalog.js');
      processCatalogDiff(catalogJSON, historyDir);
    }
    safeWriteJsonAtomic(jsonOutputPath, catalogJSON, { validateSchema: true });
  } catch {
    safeWriteJsonAtomic(jsonOutputPath, catalogJSON);
  }
  console.log(`✅ Rebuilt ${jsonOutputPath} with ${uniqueSKUs.size} SKUs from XLSX.`);
  return true;
}

function _summarizePreservedDiffs(skus) {
  const summary = {
    added: 0,
    removed: 0,
    priceChanged: 0,
    attributeChanged: 0,
    priceAndAttributeChanged: 0,
    reinstated: 0,
    unchanged: 0
  };
  for (const s of skus) {
    const status = String(s['Diff Status'] || 'UNCHANGED').toUpperCase();
    if (status === 'ADDED') summary.added++;
    else if (status === 'REMOVED') summary.removed++;
    else if (status === 'PRICE_CHANGED') summary.priceChanged++;
    else if (status === 'ATTRIBUTE_CHANGED') summary.attributeChanged++;
    else if (status === 'PRICE_AND_ATTRIBUTE_CHANGED') summary.priceAndAttributeChanged++;
    else if (status === 'REINSTATED') summary.reinstated++;
    else summary.unchanged++;
  }
  return summary;
}

module.exports = {
  convertXlsxToCatalog,
  _buildSkuFromRow,
  extractRulesMapFromSheet,
  appendXlsxRowToGrouped
};

if (require.main === module) {
  const [,, xlsxPath, jsonPath] = process.argv;
  if (!xlsxPath || !jsonPath) {
    console.error('Usage: node scripts/xlsx_to_catalog.js <input.xlsx> <output.json>');
    process.exit(1);
  }
  convertXlsxToCatalog(xlsxPath, jsonPath);
}
