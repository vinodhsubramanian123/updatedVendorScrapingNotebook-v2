const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx-js-style');
const { safeWriteJsonAtomic } = require('./lib/fs_compat');

const fixes = {
  'P73282-B21': 5584.00,
  'P73283-B21': 5980.00,
  'P73284-B21': 6350.00,
  'P73285-B21': 6890.00,
  'P73286-B21': 7120.00,
  'P73287-B21': 7450.00
};

const xlsxPath = 'outputs/ProLiant/Gen12/DL380_Gen12_SFF/DL380_Gen12_SFF_OCA_Catalog.xlsx';
const jsonPath = 'outputs/ProLiant/Gen12/DL380_Gen12_SFF/DL380_Gen12_SFF_Catalog.json';

// Update JSON
if (fs.existsSync(jsonPath)) {
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  let updated = 0;
  for (const entry of data.entries) {
    if (entry.skus) {
      for (const sku of entry.skus) {
        const productNum = sku['Product #'] || sku.sku;
        if (fixes[productNum]) {
          const newPrice = fixes[productNum];
          sku['Unit Price (USD)'] = newPrice.toFixed(2);
          sku['Price (USD)'] = newPrice.toFixed(2);
          sku.listPrice = newPrice;
          sku.listPriceFormatted = `$${newPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          updated++;
        }
      }
    }
    // Update rows array
    if (entry.rows) {
      for (let i = 0; i < entry.rows.length; i++) {
        const productNum = entry.rows[i][0];
        if (fixes[productNum]) {
          const newPrice = fixes[productNum];
          entry.rows[i][2] = `$${newPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
      }
    }
  }
  safeWriteJsonAtomic(jsonPath, data);
  console.log(`Updated ${updated} SKUs in JSON.`);
}

// Update XLSX
if (fs.existsSync(xlsxPath)) {
  const wb = XLSX.readFile(xlsxPath);
  const sheet = wb.Sheets['All SKUs'];
  const jsonSheet = XLSX.utils.sheet_to_json(sheet);
  let updated = 0;
  for (const row of jsonSheet) {
    if (fixes[row['Product #']]) {
      row['Unit Price (USD)'] = fixes[row['Product #']].toFixed(2);
      updated++;
    }
  }
  const newSheet = XLSX.utils.json_to_sheet(jsonSheet);
  wb.Sheets['All SKUs'] = newSheet;
  XLSX.writeFile(wb, xlsxPath);
  console.log(`Updated ${updated} SKUs in XLSX.`);
}
