const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx-js-style');

const xlsxPath = 'outputs/ProLiant/Gen12/DL380_Gen12_SFF/DL380_Gen12_SFF_OCA_Catalog.xlsx';
const rulesJsonPath = 'outputs/ProLiant/Gen12/DL380_Gen12_SFF/DL380_Gen12_SFF_Catalog_Rules.json';

const wb = XLSX.readFile(xlsxPath);
const sheet = wb.Sheets['Rules & Constraints'];
const rules = XLSX.utils.sheet_to_json(sheet);

const catalogJsonPath = 'outputs/ProLiant/Gen12/DL380_Gen12_SFF/DL380_Gen12_SFF_Catalog.json';
const catalogData = JSON.parse(fs.readFileSync(catalogJsonPath, 'utf-8'));

catalogData.metadata.totalRules = rules.length;
catalogData.metadata.source = 'Excel Master Recovery with Rules';

// Re-write catalogData
fs.writeFileSync(catalogJsonPath, JSON.stringify(catalogData, null, 2));

const rulesCatalog = {
  metadata: catalogData.metadata,
  rules: rules.map(r => ({
    parentCategory: r['Main Category'],
    subCategory: r['Sub-Category'],
    constraint: r['Constraint'],
    ruleType: r['Rule Type'],
    ruleText: r['Rule Text']
  }))
};

fs.writeFileSync(rulesJsonPath, JSON.stringify(rulesCatalog, null, 2));
console.log(`Regenerated ${rulesJsonPath} with ${rules.length} rules.`);
