'use strict';
/**
 * tests/unit/test_multi_rank_workbook_generator.js
 *
 * Tests the Multi-Rank Solution Workbook (.xlsx) & CSV (.csv) generator
 * ensuring all 5 strategy ranks, 10 standardized columns, formula-driven totals,
 * and physical math audit trails are correctly formatted for Partner Portal upload.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx-js-style');

const {
  generateMultiRankSolutionWorkbook,
  generateMultiRankSolutionCsv
} = require('../../scripts/lib/boq/generate_boq_xlsx.js');

describe('Multi-Rank Solution Workbook & Deliverable Suite', () => {
  const tempDir = path.join(__dirname, '..', '..', 'outputs', 'temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const tempWorkbookPath = path.join(tempDir, 'test_multirank_solution.xlsx');
  const tempCsvPath = path.join(tempDir, 'test_multirank_solution.csv');

  const mockEvalResults = {
    chassis: 'DL380_Gen12',
    aspectChecks: [
      { id: 1, name: 'Compute & Thermal', status: 'PASS', detail: '2x CPUs, High-Perf Fans verified' },
      { id: 2, name: 'Memory & Channels', status: 'PASS', detail: '16x 64GB DIMMs 1DPC balanced' },
      { id: 3, name: 'Storage & Tri-Mode', status: 'PASS', detail: 'MR408i-o with 96W Smart Battery' },
      { id: 4, name: 'PCIe Expansion', status: 'PASS', detail: 'Primary Riser with Slot 1 Cable' },
      { id: 5, name: 'Networking & OCP', status: 'PASS', detail: 'BCM5719 1Gb 4-port BASE-T OCP' },
      { id: 6, name: 'Power & Environment', status: 'PASS', detail: '2x 1600W Titanium Redundant PSUs' },
      { id: 7, name: 'Support Services', status: 'PASS', detail: '3Y Tech Care Basic' }
    ],
    items: [
      { sku: 'P52534-B21', quantity: 1, description: 'HPE ProLiant DL380 Gen11 8SFF Server', unitPriceUsd: 2500, extendedPriceUsd: 2500 },
      { sku: 'P67088-B21', quantity: 2, description: 'Intel Xeon-Platinum 8580 60-core Processor', unitPriceUsd: 4500, extendedPriceUsd: 9000 },
      { sku: 'P64707-B21', quantity: 16, description: 'HPE 64GB 2Rx4 PC5-5600B-R Smart Kit', unitPriceUsd: 450, extendedPriceUsd: 7200 }
    ],
    missingDependencies: [
      { sku: 'P48820-B21', quantity: 1, description: 'HPE DL380 Gen11 High Performance Fan Kit', rule: 'High TDP Fan Kit' }
    ],
    conflictGraph: {
      chassisInfo: { model: 'DL380 Gen12 SFF' },
      workloadDna: {
        workloadDescription: 'High Performance Virtualization',
        totalCores: 120,
        totalMemoryGb: 1024,
        storageWorkload: 'READ_INTENSIVE'
      },
      rankedSolutions: [
        {
          rank: 1,
          name: 'Intent Preserved (100% Buildable)',
          score: 0.98,
          estimatedCostUsd: 19500,
          workloadDnaMatch: 'EXACT',
          reasoning: 'Preserves customer chosen CPUs and memory; adds mandatory high-performance fans and controller battery.',
          skuList: [
            { sku: 'P52534-B21', quantity: 1, description: 'HPE ProLiant DL380 Gen11 8SFF Server', unitPriceUsd: 2500, extendedPriceUsd: 2500 },
            { sku: 'P67088-B21', quantity: 2, description: 'Intel Xeon-Platinum 8580 60-core Processor', unitPriceUsd: 4500, extendedPriceUsd: 9000 },
            { sku: 'P64707-B21', quantity: 16, description: 'HPE 64GB 2Rx4 PC5-5600B-R Smart Kit', unitPriceUsd: 450, extendedPriceUsd: 7200 },
            { sku: 'P48820-B21', quantity: 1, description: 'HPE DL380 Gen11 High Performance Fan Kit', unitPriceUsd: 350, extendedPriceUsd: 350, isFixInjected: true }
          ]
        },
        {
          rank: 2,
          name: 'Performance Density Optimized',
          score: 0.92,
          estimatedCostUsd: 22000,
          workloadDnaMatch: 'OPTIMIZED',
          reasoning: 'Upgrades memory to 128GB DIMMs and adds redundant 1800W Titanium PSUs for maximum compute headroom.',
          skuList: [
            { sku: 'P52534-B21', quantity: 1, description: 'HPE ProLiant DL380 Gen11 8SFF Server', unitPriceUsd: 2500, extendedPriceUsd: 2500 },
            { sku: 'P67088-B21', quantity: 2, description: 'Intel Xeon-Platinum 8580 60-core Processor', unitPriceUsd: 4500, extendedPriceUsd: 9000 },
            { sku: 'P48820-B21', quantity: 1, description: 'HPE DL380 Gen11 High Performance Fan Kit', unitPriceUsd: 350, extendedPriceUsd: 350, isFixInjected: true }
          ]
        },
        {
          rank: 3,
          name: 'Balanced Optimal TCO',
          score: 0.89,
          estimatedCostUsd: 18200,
          workloadDnaMatch: 'BALANCED',
          reasoning: 'Balances core count and memory bandwidth for lowest 5-year operating expenditure.',
          skuList: [
            { sku: 'P52534-B21', quantity: 1, description: 'HPE ProLiant DL380 Gen11 8SFF Server', unitPriceUsd: 2500, extendedPriceUsd: 2500 }
          ]
        },
        {
          rank: 4,
          name: 'Value Engineered Deal Winner',
          score: 0.85,
          estimatedCostUsd: 16500,
          workloadDnaMatch: 'VALUE',
          reasoning: 'Optimizes memory channels with high-volume 32GB DIMMs, trimming CapEx by 15%.',
          skuList: [
            { sku: 'P52534-B21', quantity: 1, description: 'HPE ProLiant DL380 Gen11 8SFF Server', unitPriceUsd: 2500, extendedPriceUsd: 2500 }
          ]
        },
        {
          rank: 5,
          name: 'Budget Minimized Floor',
          score: 0.81,
          estimatedCostUsd: 14900,
          workloadDnaMatch: 'BUDGET',
          reasoning: 'Absolute lowest price point to achieve 100% buildable hardware compliance.',
          skuList: [
            { sku: 'P52534-B21', quantity: 1, description: 'HPE ProLiant DL380 Gen11 8SFF Server', unitPriceUsd: 2500, extendedPriceUsd: 2500 }
          ]
        }
      ]
    }
  };

  test('1. generateMultiRankSolutionWorkbook creates all 6 sheets with executive summary and 5 ranks', () => {
    const wb = generateMultiRankSolutionWorkbook(mockEvalResults, tempWorkbookPath, 'DL380_Gen12', {
      clusterSizing: { serverCount: 4 }
    });

    assert.ok(fs.existsSync(tempWorkbookPath), 'Expected workbook file to be written on disk');
    assert.ok(wb.SheetNames.includes('Executive Summary & Aspects'), 'Expected Executive Summary & Aspects sheet');
    assert.ok(wb.SheetNames.some(n => n.startsWith('Rank 1')), 'Expected Rank 1 sheet');
    assert.ok(wb.SheetNames.some(n => n.startsWith('Rank 2')), 'Expected Rank 2 sheet');
    assert.ok(wb.SheetNames.some(n => n.startsWith('Rank 3')), 'Expected Rank 3 sheet');
    assert.ok(wb.SheetNames.some(n => n.startsWith('Rank 4')), 'Expected Rank 4 sheet');
    assert.ok(wb.SheetNames.some(n => n.startsWith('Rank 5')), 'Expected Rank 5 sheet');
    assert.strictEqual(wb.SheetNames.length, 6, 'Expected exactly 6 sheets');
  });

  test('2. Rank 1 sheet contains 10 standardized columns and correct headers', () => {
    const wb = XLSX.readFile(tempWorkbookPath);
    const rank1SheetName = wb.SheetNames.find(n => n.startsWith('Rank 1'));
    assert.ok(rank1SheetName, 'Rank 1 sheet name must exist');
    const ws = wb.Sheets[rank1SheetName];
    assert.ok(ws, 'Rank 1 sheet must exist');

    const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });
    // Row index 2 (Excel row 3) contains the column headers
    const headerRow = rawData[2];
    assert.ok(Array.isArray(headerRow), 'Header row must be an array');
    assert.strictEqual(headerRow[0], 'Part No');
    assert.strictEqual(headerRow[1], 'Per-Node Qty');
    assert.strictEqual(headerRow[2], 'Node Multiplier');
    assert.strictEqual(headerRow[3], 'Total Qty');
    assert.strictEqual(headerRow[4], 'Description');
    assert.strictEqual(headerRow[5], 'Component Role');
    assert.strictEqual(headerRow[6], 'Unit Price (USD)');
    assert.strictEqual(headerRow[7], 'Extended Price (USD)');
    assert.strictEqual(headerRow[8], 'Physical Math & Rule Engine Rationale');
    assert.strictEqual(headerRow[9], 'Gemini NotebookLM Badge');
    assert.strictEqual(headerRow[10], 'Agentic Guardrail & Evals Trace');
    assert.strictEqual(headerRow[11], 'CLIC Status / Rule Trace');
  });

  test('3. Rank 1 items contain formula-driven multiplier and extended price calculations', () => {
    const wb = XLSX.readFile(tempWorkbookPath);
    const rank1SheetName = wb.SheetNames.find(n => n.startsWith('Rank 1'));
    const ws = wb.Sheets[rank1SheetName];

    // Row 4: First SKU item
    const cellTotalQty = ws['D4'];
    const cellExtPrice = ws['H4'];

    assert.ok(cellTotalQty, 'Total Qty cell D4 must exist');
    assert.ok(cellExtPrice, 'Extended Price cell H4 must exist');

    // Total Qty formula = B4*C4
    assert.strictEqual(cellTotalQty.f, 'B4*C4', 'Expected formula B4*C4 for total quantity');
    // Extended price formula = D4*G4
    assert.strictEqual(cellExtPrice.f, 'D4*G4', 'Expected formula D4*G4 for extended price');
  });

  test('4. generateMultiRankSolutionCsv exports token-dense CSV matching all ranks', () => {
    const csvContent = generateMultiRankSolutionCsv(mockEvalResults, tempCsvPath, {
      clusterSizing: { serverCount: 4 }
    });

    assert.ok(fs.existsSync(tempCsvPath), 'Expected CSV file to be written on disk');
    assert.ok(csvContent.length > 200, 'Expected non-trivial CSV content');

    const lines = csvContent.trim().split('\n');
    const headerLine = lines[0];
    assert.ok(headerLine.includes('Strategy Rank'), 'Header should include Strategy Rank');
    assert.ok(headerLine.includes('Part No'), 'Header should include Part No');
    assert.ok(headerLine.includes('Node Multiplier'), 'Header should include Node Multiplier');
    assert.ok(headerLine.includes('Physical Math & Rule Engine Rationale'), 'Header should include Physical Math & Rule Engine Rationale');
    assert.ok(headerLine.includes('Gemini NotebookLM Badge'), 'Header should include Gemini NotebookLM Badge');
    assert.ok(headerLine.includes('Agentic Guardrail & Evals Trace'), 'Header should include Agentic Guardrail & Evals Trace');

    // Verify all 5 ranks are present in CSV
    assert.ok(csvContent.includes('"Rank 1"'), 'CSV must contain Rank 1 items');
    assert.ok(csvContent.includes('"Rank 2"'), 'CSV must contain Rank 2 items');
    assert.ok(csvContent.includes('"Rank 3"'), 'CSV must contain Rank 3 items');
    assert.ok(csvContent.includes('"Rank 4"'), 'CSV must contain Rank 4 items');
    assert.ok(csvContent.includes('"Rank 5"'), 'CSV must contain Rank 5 items');
  });
});
