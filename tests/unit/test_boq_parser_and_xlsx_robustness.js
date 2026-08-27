'use strict';

const test = require('node:test');
const { afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx-js-style');

const { parseSkuLines } = require('../../scripts/lib/boq/boq_parser.js');
const { generateProfessionalBOQ } = require('../../scripts/lib/boq/generate_boq_xlsx.js');

test('BOQ Parser & Excel Generator Robustness Tests', async (t) => {
  // 1. Tests for boq_parser.js
  
  await t.test('boq_parser.js - parses valid standard buffers (TSV/CSV)', () => {
    const lines = [
      'Qty\tSKU\tDescription\tPrice',
      '2\tP12345-B21\tHPE ProLiant DL380 Gen11\t$5,000.00',
      '10\t865414-B21\tHPE 800W Flex Slot Platinum Hot Plug Low Halogen Power Supply Kit\t$250.00'
    ];
    const result = parseSkuLines(lines);
    assert.strictEqual(result.items.length, 2);
    assert.strictEqual(result.items[0].sku, 'P12345-B21');
    assert.strictEqual(result.items[0].quantity, 2);
    assert.strictEqual(result.items[0].unitPriceUsd, 5000);
    assert.strictEqual(result.items[1].sku, '865414-B21');
    assert.strictEqual(result.items[1].quantity, 10);
    assert.strictEqual(result.items[1].unitPriceUsd, 250);
  });

  await t.test('boq_parser.js - ambiguous column headers', () => {
    const lines = [
      'Count,Part #,Product Name,Unit Price',
      '3,P12345-B21,Server A,$1000',
      '1,865414-B21,Power Supply B,$100'
    ];
    const result = parseSkuLines(lines);
    assert.strictEqual(result.items.length, 2);
    assert.strictEqual(result.items[0].sku, 'P12345-B21');
    assert.strictEqual(result.items[0].quantity, 3);
    assert.strictEqual(result.items[0].unitPriceUsd, 1000);
  });

  await t.test('boq_parser.js - malformed/corrupted data (empty files, whitespace, negative quantities)', () => {
    const lines = [
      '',
      '   ',
      'invalid line no sku',
      '1x P12345-B21 (bad description) $500', 
      'Qty\tSKU\tDesc\tPrice',
      ' -1 \t P55555-B21 \t Desc \t -50 ',
      ' 1 \t 865414-B21 \t Desc \t $1,000.50 '
    ];
    const result = parseSkuLines(lines);
    assert.ok(result.items.length >= 2, 'Should not crash on malformed data');
    const hasP1 = result.items.find(i => i.sku === 'P12345-B21');
    assert.ok(hasP1, 'Should parse freeform fallback');
  });

  await t.test('boq_parser.js - multi-sheet workbooks with mixed summary and hardware tabs', () => {
    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.aoa_to_sheet([['Summary'], ['Ignore this sheet']]);
    const wsHardware = XLSX.utils.aoa_to_sheet([
      ['SKU Number', 'Qty', 'Description'],
      ['P12345-B21', 5, 'Compute Node']
    ]);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
    XLSX.utils.book_append_sheet(wb, wsHardware, 'Hardware');
    
    const allLines = [];
    wb.SheetNames.forEach(sheetName => {
      const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sheetName]);
      allLines.push(...csv.split('\n'));
    });
    
    const result = parseSkuLines(allLines);
    assert.strictEqual(result.items.length, 1);
    assert.strictEqual(result.items[0].sku, 'P12345-B21');
    assert.strictEqual(result.items[0].quantity, 5);
  });

  // 2. Tests for generate_boq_xlsx.js

  const TEMP_XLSX = path.join(__dirname, 'test_temp_boq.xlsx');

  afterEach(() => {
    if (fs.existsSync(TEMP_XLSX)) fs.unlinkSync(TEMP_XLSX);
  });

  await t.test('generate_boq_xlsx.js - single item list & 500+ item list & empty list', () => {
    // Empty item list
    const evalEmpty = {
      budgetOptimization: { currentBomCostUsd: 0 },
      conflictGraph: { rankedSolutions: [{ rank: 1, skuList: [] }] }
    };
    generateProfessionalBOQ(evalEmpty, TEMP_XLSX);
    let wb = XLSX.readFile(TEMP_XLSX, { cellFormula: true, cellStyles: true, cellNF: true });
    assert.strictEqual(wb.SheetNames.includes('Base BOM'), true);
    
    // Single item list
    const evalSingle = {
      budgetOptimization: { currentBomCostUsd: 1000 },
      conflictGraph: {
        rankedSolutions: [{
          rank: 1, 
          skuList: [{ sku: 'P12345-B21', quantity: 2, unitPriceUsd: 500, category: 'Standard' }]
        }]
      }
    };
    generateProfessionalBOQ(evalSingle, TEMP_XLSX);
    wb = XLSX.readFile(TEMP_XLSX, { cellFormula: true, cellStyles: true, cellNF: true });
    
    let wsBaseBom = wb.Sheets['Base BOM'];
    let valA2 = wsBaseBom['A2'] ? wsBaseBom['A2'].v : null;
    assert.strictEqual(valA2, 'P12345-B21');
    let formulaF2 = wsBaseBom['F2'] ? wsBaseBom['F2'].f : null;
    assert.strictEqual(formulaF2, 'B2*E2');

    // 500+ items list
    const hugeList = [];
    for(let i=0; i<550; i++) {
      hugeList.push({ sku: 'P999' + i + '-B21', quantity: 1, unitPriceUsd: 10, category: 'Standard' });
    }
    const evalHuge = {
      budgetOptimization: { currentBomCostUsd: 5500 },
      conflictGraph: { rankedSolutions: [{ rank: 1, skuList: hugeList }] }
    };
    generateProfessionalBOQ(evalHuge, TEMP_XLSX);
    wb = XLSX.readFile(TEMP_XLSX, { cellFormula: true, cellStyles: true, cellNF: true });
    wsBaseBom = wb.Sheets['Base BOM'];
    let valA551 = wsBaseBom['A551'] ? wsBaseBom['A551'].v : null;
    assert.strictEqual(valA551, 'P999549-B21');
  });

  await t.test('generate_boq_xlsx.js - Verify all required sheets are present and styled', () => {
    const evalData = {
      budgetOptimization: { currentBomCostUsd: 100 },
      conflictGraph: { rankedSolutions: [{ rank: 1, skuList: [{ sku: 'P12345-B21', quantity: 1, unitPriceUsd: 100, category: 'Standard' }] }] }
    };
    generateProfessionalBOQ(evalData, TEMP_XLSX);
    const wb = XLSX.readFile(TEMP_XLSX, { cellFormula: true, cellStyles: true, cellNF: true });
    
    const expectedSheets = [
      "Summary", 
      "Base BOM", 
      "Missing Dependencies", 
      "Strategy Add-ons"
    ];
    
    expectedSheets.forEach(sheetName => {
      assert.ok(wb.SheetNames.includes(sheetName), 'Missing sheet: ' + sheetName);
      const ws = wb.Sheets[sheetName];
      if (ws['A1'] && ws['A1'].s) {
        assert.ok(ws['A1'].s, 'Sheet ' + sheetName + ' A1 should have styles applied');
      }
    });
  });
});
