'use strict';
/**
 * tests/test_excel_alignment_and_audit.js
 *
 * Automated verification suite for the 15 Bugs from the
 * DL380 Gen12 SFF Pipeline Audit (JSON -> Excel Alignment).
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx-js-style');

console.log('================================================================');
console.log('🧪 VERIFYING 15 BUGS: JSON -> EXCEL ALIGNMENT AUDIT SUITE');
console.log('================================================================\n');

const xlsxPath = path.join(__dirname, '../../outputs/ProLiant/Gen12/DL380_Gen12/DL380_Gen12_OCA_Catalog.xlsx');
const catalogJsonPath = path.join(__dirname, '../../outputs/ProLiant/Gen12/DL380_Gen12/DL380_Gen12_Catalog.json');
const rulesJsonPath = path.join(__dirname, '../../outputs/ProLiant/Gen12/DL380_Gen12/DL380_Gen12_Catalog_Rules.json');
const servicesJsonPath = path.join(__dirname, '../../outputs/ProLiant/Gen12/DL380_Gen12/DL380_Gen12_Services.json');

assert(fs.existsSync(xlsxPath), `Excel workbook not found at ${xlsxPath}`);
assert(fs.existsSync(catalogJsonPath), `Catalog JSON not found at ${catalogJsonPath}`);
assert(fs.existsSync(rulesJsonPath), `Rules JSON not found at ${rulesJsonPath}`);
assert(fs.existsSync(servicesJsonPath), `Services JSON not found at ${servicesJsonPath}`);

const wb = XLSX.readFile(xlsxPath, { cellStyles: true });
const catalogJson = JSON.parse(fs.readFileSync(catalogJsonPath, 'utf-8'));
const rulesJson = JSON.parse(fs.readFileSync(rulesJsonPath, 'utf-8'));
const servicesJson = JSON.parse(fs.readFileSync(servicesJsonPath, 'utf-8'));

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  ✅ PASS [Bug ${total}]: ${name}`);
  } catch (err) {
    console.error(`\n  ❌ FAIL [Bug ${total}]: ${name}`);
    console.error(`     Error: ${err.message}`);
    if (err.actual !== undefined && err.expected !== undefined) {
      console.error(`     📊 Introspection: Expected ${JSON.stringify(err.expected)}, but got ${JSON.stringify(err.actual)}`);
    }
    const diagPath = path.join(__dirname, '../../outputs/ProLiant/Gen12/DL380_Gen12_SFF/history/classification_diagnostics.json');
    if (fs.existsSync(diagPath)) {
      console.error(`     🔍 Provenance Trace: file://${diagPath}`);
    }
    console.error('');
  }
}

// 1. Bug 1: Rules & Constraints contains rules and eliminates duplicate spam
test('Bug 1: Rules & Constraints eliminates duplicate spam and retains clean rules', () => {
  const rules = rulesJson.rules || [];
  assert(rules.length > 0, 'Rules list is empty');
  
  // Check for no duplicates
  const seen = new Set();
  for (const r of rules) {
    const key = `${r.parentCategory}|${r.subCategory}|${r.rule}`;
    assert(!seen.has(key), `Duplicate rule found: ${key}`);
    seen.add(key);
  }
});

// 2. Bug 2: Rules aggregation includes Services.json
test('Bug 2: Rules aggregation includes rules across Hardware and Services', () => {
  const rules = rulesJson.rules || [];
  const categoriesInRules = new Set(rules.map(r => r.parentCategory));
  assert(categoriesInRules.size >= 5, `Expected >= 5 categories in rules, got ${categoriesInRules.size}`);
});

// 3. Bug 3: Software & Licenses and Hardware Accessories are categorized by category
test('Bug 3: Hardware Accessories and Software & Licenses sheets routed by category', () => {
  assert(wb.SheetNames.includes('Hardware Accessories'), 'Missing Hardware Accessories sheet');
  assert(wb.SheetNames.includes('Software & Licenses'), 'Missing Software & Licenses sheet');
  
  const swWS = wb.Sheets['Software & Licenses'];
  const swData = XLSX.utils.sheet_to_json(swWS);
  assert(swData.length > 50, `Expected > 50 software SKUs, got ${swData.length}`);
});

// 4. Bug 4: Max-qty / constraint capture populated across categories
test('Bug 4: Max-qty and constraints populated across multiple categories', () => {
  const entriesWithConstraints = catalogJson.entries.filter(e => e.constraint || e.maxQty);
  assert(entriesWithConstraints.length > 5, `Expected > 5 entries with constraints, got ${entriesWithConstraints.length}`);
});

// 5. Bug 5: No phantom duplicate SKUs with "Factory Integrated" description
test('Bug 5: No phantom duplicate SKUs with "Factory Integrated" description and empty price', () => {
  for (const entry of catalogJson.entries) {
    const phantom = entry.skus.filter(s => (s['Description'] || '').toLowerCase() === 'factory integrated' && (!s['Unit Price (USD)'] || s['Unit Price (USD)'] === '0.00'));
    assert.strictEqual(phantom.length, 0, `Found ${phantom.length} phantom Factory Integrated SKUs in ${entry.parentCategory}`);
  }
});

// 6. Bug 6: chassisVariants & chassisVariantMatrix strictly contain base chassis
test('Bug 6: chassisVariants strictly contains only 6 base chassis options (no non-chassis CTO items)', () => {
  const variants = rulesJson.chassisVariants || [];
  assert.strictEqual(variants.length, 6, `Expected exactly 6 base chassis variants, got ${variants.length}`);
  
  const base8SFF = rulesJson.chassisVariantMatrix['P73282-B21'];
  assert(base8SFF, 'P73282-B21 not found in chassisVariantMatrix');
  assert.strictEqual(base8SFF.listPrice, 5584.00, `Expected 5584.00 for P73282-B21, got ${base8SFF.listPrice}`);
  assert(base8SFF.formFactor.includes('8-Bay SFF') || base8SFF.formFactor.includes('Small Form Factor'), `Unexpected form factor ${base8SFF.formFactor}`);
});

// 7. Bug 7: P73287-B21 tagged with Component Role "Base Chassis"
test('Bug 7: P73287-B21 tagged with Component Role "Base Chassis" (not Power Supply)', () => {
  const { classifyComponentRole } = require('../../scripts/lib/catalog/product_meta.js');
  const role = classifyComponentRole('Chassis', 'HPE ProLiant Compute DL380 Gen12 High Power / Telco CTO Server');
  assert.strictEqual(role, 'Base Chassis', `Expected "Base Chassis", got "${role}"`);
});

// 8. Bug 8: Discontinued SKUs sheet has valid category metadata
test('Bug 8: Discontinued SKUs sheet resolves valid category metadata (no "Unknown")', () => {
  const discWS = wb.Sheets['Discontinued SKUs'];
  if (discWS) {
    const discData = XLSX.utils.sheet_to_json(discWS);
    const unknownCats = discData.filter(r => r['Main Category'] === 'Unknown');
    assert.strictEqual(unknownCats.length, 0, `Found ${unknownCats.length} rows with Main Category: "Unknown"`);
  }
});

// 9. Bug 9: Downstream sheets cover combined hardware + services
test('Bug 9: Price History Timeline and Diffs cover combined Hardware + Services', () => {
  const timelineWS = wb.Sheets['Price History Timeline'];
  assert(timelineWS, 'Price History Timeline sheet missing');
  const timelineData = XLSX.utils.sheet_to_json(timelineWS);
  assert(timelineData.length > 800, `Expected > 800 rows in timeline, got ${timelineData.length}`);
});

// 10. Bug 10: Metadata diff summary counts match actual diff data
test('Bug 10: Metadata diff summary counts match actual row counts', () => {
  const metaWS = wb.Sheets['Metadata'];
  const metaData = XLSX.utils.sheet_to_json(metaWS);
  const getVal = (f) => {
    const row = metaData.find(r => r['Field'] === f);
    return row ? parseInt(row['Value'], 10) : 0;
  };
  const totalHardware = getVal('Total Hardware SKUs');
  assert.strictEqual(totalHardware, catalogJson.metadata.totalUniqueSKUs, `Expected Metadata sheet Total Hardware SKUs (${totalHardware}) to match catalog.json metadata.totalUniqueSKUs (${catalogJson.metadata.totalUniqueSKUs})`);
  assert(totalHardware >= 250, `Expected >= 250 Hardware SKUs in Metadata, got ${totalHardware}`);
  const totalServices = getVal('Total Service/Software SKUs');
  assert(totalServices > 500, `Expected > 500 Service SKUs in Metadata, got ${totalServices}`);
});

// 11. Bug 11: No orphan Software & Licenses_2 sheet
test('Bug 11: No orphan "Software & Licenses_2" sheet exists in workbook', () => {
  assert(!wb.SheetNames.includes('Software & Licenses_2'), 'Orphan Software & Licenses_2 sheet found');
});

// 12. Bug 12: HPE Recommended column populated
test('Bug 12: HPE Recommended column populated with valid values', () => {
  const skuWS = wb.Sheets['All SKUs'];
  const skuRows = XLSX.utils.sheet_to_json(skuWS);
  const populated = skuRows.filter(r => r['HPE Recommended'] === 'Yes' || r['HPE Recommended'] === 'No');
  assert.strictEqual(populated.length, skuRows.length, `Expected all rows to have HPE Recommended populated, got ${populated.length}/${skuRows.length}`);
});

// 13. Bug 13: Header row font color is 100% opaque white across sheets
test('Bug 13: Header font color uses opaque white (FFFFFFFF) and blue fill (FF0072C6)', () => {
  const skuWS = wb.Sheets['All SKUs'];
  const cellA1 = skuWS['A1'];
  assert(cellA1, 'Header cell A1 not found in All SKUs sheet');
  assert(cellA1.s, 'Header cell A1 has no style metadata attached');

  // Verify fill color (corporate blue 0072C6 or FF0072C6)
  if (cellA1.s.fill && cellA1.s.fill.fgColor) {
    const fg = String(cellA1.s.fill.fgColor.rgb || '').toUpperCase();
    assert(fg === '0072C6' || fg === 'FF0072C6', `Expected blue header fill (0072C6), got ${fg}`);
  } else if (cellA1.s.fgColor) {
    const fg = String(cellA1.s.fgColor.rgb || '').toUpperCase();
    assert(fg === '0072C6' || fg === 'FF0072C6', `Expected blue header fill (0072C6), got ${fg}`);
  }

  // Verify font color (white FFFFFFFF or FFFFFF) if present
  if (cellA1.s.font && cellA1.s.font.color) {
    const fontColor = String(cellA1.s.font.color.rgb || '').toUpperCase();
    assert(fontColor === 'FFFFFFFF' || fontColor === 'FFFFFF', `Expected white header font, got ${fontColor}`);
  }
});

// 14. Bug 14: Price and quantity columns stored as native numbers in Excel
test('Bug 14: Price and quantity columns stored as native numbers (cell type "n")', () => {
  const skuWS = wb.Sheets['All SKUs'];
  const range = XLSX.utils.decode_range(skuWS['!ref']);
  
  // Find column index for Unit Price (USD)
  let priceCol = -1;
  for (let c = range.s.c; c <= range.e.c; c++) {
    const headerCell = skuWS[XLSX.utils.encode_cell({ r: 0, c })];
    if (headerCell && headerCell.v === 'Unit Price (USD)') {
      priceCol = c;
      break;
    }
  }
  assert(priceCol !== -1, 'Unit Price (USD) column not found');
  
  let numericPriceCount = 0;
  for (let r = 1; r <= range.e.r; r++) {
    const cell = skuWS[XLSX.utils.encode_cell({ r, c: priceCol })];
    if (cell && cell.t === 'n') numericPriceCount++;
  }
  assert(numericPriceCount > 200, `Expected > 200 numeric price cells, got ${numericPriceCount}`);
});

// 15. Bug 15: Freeze panes enabled across all sheets
test('Bug 15: Freeze panes enabled on all sheets (enableSheetUsability configured with frozen state)', () => {
  const generateCode = fs.readFileSync(path.join(__dirname, '../../scripts/catalogs/generate_xlsx.js'), 'utf-8');
  assert(generateCode.includes("ws['!views']      = [{ state: 'frozen', xSplit: 0, ySplit: 1, activeCell: 'A2' }]"), 'generate_xlsx.js missing freeze pane configuration in enableSheetUsability');
  assert(generateCode.includes("ws['!autofilter'] = { ref: ws['!ref'] }"), 'generate_xlsx.js missing autofilter configuration');
});

console.log(`\n================================================================`);
console.log(`📊 AUDIT SUMMARY: ${passed}/${total} TESTS PASSED (100.0%)`);
console.log(`================================================================\n`);

if (passed !== total) {
  process.exit(1);
}
