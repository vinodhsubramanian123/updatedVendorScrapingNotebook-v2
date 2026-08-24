const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx-js-style');
const { generateProfessionalBOQ } = require('../../scripts/lib/boq/generate_boq_xlsx.js');

test('Excel Interactive Matrix - Multi-Chassis & Formulas & Formatting', async (t) => {
  const exportPath = path.join(__dirname, '../../outputs/test_boq_matrix.xlsx');

  // Setup mock data simulating a multi-chassis combined quote
  const mockEvalResults = {
    budgetOptimization: { currentBomCostUsd: 150000 },
    conflictGraph: {
      rankedSolutions: [
        {
          rank: 1,
          name: 'Combined Edge & Storage Build',
          tradeoffMetrics: { intentAlignment: '95%' },
          budgetBreakdown: { fixCost: 500, strategyAddonCost: 1200 },
          estimatedCostUsd: 151700,
          reasoning: 'Combines Gen12 compute, MSL3040 tape, and Alletra storage into a single BOM.',
          skuList: [
            // ProLiant Gen12 SKUs
            { sku: 'P52532-B21', quantity: 5, description: 'HPE ProLiant DL380 Gen11 8SFF NC CTO Server', category: 'Compute', unitPriceUsd: 4500, status: 'Active' },
            { sku: 'P49611-B21', quantity: 10, description: 'Intel Xeon-Silver 4410Y 2.0GHz 12-core', category: 'Processor', unitPriceUsd: 850, status: 'Active' },
            // StoreEver MSL3040 SKUs
            { sku: 'Q6Q62B', quantity: 2, description: 'HPE StoreEver MSL3040 Scalable Library Base Module', category: 'Storage Tape', unitPriceUsd: 7500, status: 'Discontinued' }, // Marked as discontinued for test
            // Alletra Storage SKUs
            { sku: 'R4B02A', quantity: 1, description: 'HPE Alletra 9000 4-way NVMe Base Chassis', category: 'Storage Array', unitPriceUsd: 25000, status: 'Active' },
          ]
        }
      ]
    }
  };

  await t.test('Generates Excel workbook for multi-chassis combined quote', () => {
    const resultPath = generateProfessionalBOQ(mockEvalResults, exportPath, 'Combined-Multi-Chassis', 1);
    assert.strictEqual(fs.existsSync(resultPath), true, 'Excel file should be created');
  });

  await t.test('Validates Cell Formula Calculations', () => {
    // xlsx-js-style uses cellNF: true and cellFormula: true to read formulas properly
    const wb = XLSX.readFile(exportPath, { cellFormula: true, cellNF: true, cellStyles: true });
    const ws = wb.Sheets['Base BOM'];

    // Check extended price formulas (Row 2, 3, 4, 5 are data rows)
    const extPriceCell1 = ws['F2'];
    assert.ok(extPriceCell1, 'Extended price cell F2 should exist');
    assert.strictEqual(extPriceCell1.f, 'B2*E2', 'Extended price formula should be quantity * unit price');

    const extPriceCell3 = ws['F4'];
    assert.ok(extPriceCell3, 'Extended price cell F4 should exist');
    assert.strictEqual(extPriceCell3.f, 'B4*E4', 'Extended price formula should be quantity * unit price');

    // Check Total formula (Row 6)
    const totalCell = ws['F6'];
    assert.ok(totalCell, 'Total cell F6 should exist');
    assert.strictEqual(totalCell.f, 'SUM(F2:F5)', 'Total formula should sum extended prices');
  });

  await t.test('Validates Conditional Formatting Rules (Discontinued SKUs)', () => {
    const wb = XLSX.readFile(exportPath, { cellStyles: true });
    const ws = wb.Sheets['Base BOM'];

    // Row 4 corresponds to Q6Q62B (Discontinued)
    // In XLSX-JS-Style, styles are stored in the `s` property of the cell object.
    const discontinuedCellA = ws['A4'];
    const discontinuedCellB = ws['B4'];

    assert.ok(discontinuedCellA.s, 'Cell A4 should have style object');
    assert.ok(discontinuedCellA.s.fgColor, 'Cell A4 should have fill styling');
    assert.strictEqual(discontinuedCellA.s.fgColor.rgb, 'FFC000', 'Discontinued SKU should have warning fill color (FFC000)');

    assert.ok(discontinuedCellB.s, 'Cell B4 should have style object');
    assert.ok(discontinuedCellB.s.fgColor, 'Cell B4 should have fill styling');
    assert.strictEqual(discontinuedCellB.s.fgColor.rgb, 'FFC000', 'Discontinued SKU quantity cell should have warning fill color (FFC000)');

    // Row 2 corresponds to P52532-B21 (Active)
    const activeCellA = ws['A2'];
    // We expect active cells NOT to have the warning fill.
    // They might have a fill property if inherited, but it shouldn't be FFC000.
    const activeHasWarningFill = !!(activeCellA.s && activeCellA.s.fgColor && activeCellA.s.fgColor.rgb === 'FFC000');
    assert.strictEqual(activeHasWarningFill, false, 'Active SKU should NOT have warning fill color');
  });

  // Cleanup
  t.after(() => {
    if (fs.existsSync(exportPath)) {
      fs.unlinkSync(exportPath);
    }
  });
});
