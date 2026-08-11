const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx-js-style');
const { safeWriteJsonAtomic } = require('./lib/fs_compat');

const fixes = {
  'P73283-B21': 'HPE ProLiant DL380 Gen12 24SFF Configure-to-order Server',
  'P73285-B21': 'HPE ProLiant DL380 Gen12 8LFF Configure-to-order Server'
};

const xlsxPath = 'outputs/ProLiant/Gen12/DL380_Gen12_SFF/DL380_Gen12_SFF_OCA_Catalog.xlsx';
const jsonPath = 'outputs/ProLiant/Gen12/DL380_Gen12_SFF/DL380_Gen12_SFF_Catalog.json';

if (fs.existsSync(jsonPath)) {
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  let updated = 0;
  for (const entry of data.entries) {
    if (entry.skus) {
      for (const sku of entry.skus) {
        const productNum = sku['Product #'] || sku.sku;
        if (fixes[productNum]) {
          sku['Description'] = fixes[productNum];
          sku.description = fixes[productNum];
          updated++;
        }
      }
    }
    if (entry.rows) {
      for (let i = 0; i < entry.rows.length; i++) {
        const productNum = entry.rows[i][0];
        if (fixes[productNum]) {
          entry.rows[i][1] = fixes[productNum];
        }
      }
    }
  }
  safeWriteJsonAtomic(jsonPath, data);
  console.log(`Updated ${updated} SKUs in JSON.`);
}

if (fs.existsSync(xlsxPath)) {
  const wb = XLSX.readFile(xlsxPath);
  const sheet = wb.Sheets['All SKUs'];
  const jsonSheet = XLSX.utils.sheet_to_json(sheet);
  let updated = 0;
  for (const row of jsonSheet) {
    if (fixes[row['Product #']]) {
      row['Description'] = fixes[row['Product #']];
      updated++;
    }
  }
  const newSheet = XLSX.utils.json_to_sheet(jsonSheet);
  wb.Sheets['All SKUs'] = newSheet;
  XLSX.writeFile(wb, xlsxPath);
  console.log(`Updated ${updated} SKUs in XLSX.`);
}
