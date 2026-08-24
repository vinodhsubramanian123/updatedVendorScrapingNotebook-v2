const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx-js-style');

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

  // Extract rules from Rules & Constraints
  const rulesSheet = wb.Sheets['Rules & Constraints'];
  const rulesData = rulesSheet ? XLSX.utils.sheet_to_json(rulesSheet) : [];
  const rulesMap = new Map();
  for (const r of rulesData) {
    const key = `${r['Main Category']}||${r['Sub-Category']}`;
    if (!rulesMap.has(key)) rulesMap.set(key, []);
    rulesMap.get(key).push(r['Rule Text'] || '');
  }
  
  const data = XLSX.utils.sheet_to_json(sheet);
  const folderName = path.basename(path.dirname(xlsxPath));
  const chassisLabel = folderName.replace(/_/g, ' ');

  const grouped = new Map();
  const uniqueSKUs = new Set();
  
  for (const row of data) {
    const parentCat = row['Main Category'] || 'General';
    const subCat = row['Sub-Category'] || parentCat;
    const sku = row['Product #'];
    const desc = row['Description'];
    const constraint = row['Constraint Text'] || '';
    const maxQtyRaw = row['Subcategory Max Qty'];
    const maxQty = maxQtyRaw ? parseInt(maxQtyRaw, 10) : -1;
    const unitPrice = parseFloat(String(row['Unit Price (USD)']).replace(/[$,]/g, '')) || 0;
    const optionType = row['Option Type'] || 'Standard';
    const startDate = row['Start Date'] || '';
    const discontinuedDate = row['Discontinued Date'] || '';
    const currentQty = parseInt(row['Current Qty'], 10) || 0;

    if (!sku) continue;
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
      source: 'Excel Master Recovery'
    },
    subcategories: Array.from(subcategoriesMap.values()),
    entries: entries
  };
  
  fs.writeFileSync(jsonOutputPath, JSON.stringify(catalogJSON, null, 2), 'utf-8');
  console.log(`✅ Rebuilt ${jsonOutputPath} with ${uniqueSKUs.size} SKUs from XLSX.`);
}

if (require.main === module) {
  const [,, xlsxPath, jsonPath] = process.argv;
  if (!xlsxPath || !jsonPath) {
    console.error('Usage: node scripts/xlsx_to_catalog.js <input.xlsx> <output.json>');
    process.exit(1);
  }
  convertXlsxToCatalog(xlsxPath, jsonPath);
}
