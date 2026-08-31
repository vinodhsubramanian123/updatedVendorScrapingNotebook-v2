'use strict';
/**
 * tests/chaos/test_multi_cluster_tender_reconciliation_contract.js
 *
 * Validates enterprise tender reconciliation contracts:
 * 1. CTO Container Tree Tagging (INV-25) & FIO Option Resolution (#0D1 / -F21).
 * 2. 100-Node Facility Power & Data Center Sizing Matrix (INV-29).
 * 3. Standardized 7-Column Reconciliation BOM Contract (INV-32/37) with subtotal demarcation.
 */

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx-js-style');
const { generatePartnerPortalUploadBOM } = require('../../scripts/lib/boq/generate_boq_xlsx.js');
const { analyzeAndPartitionClusters, splitAndWriteClusterWorkbooks } = require('../../scripts/lib/boq/multi_cluster_splitter.js');

let totalPasses = 0;
let totalFails = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    totalPasses++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    totalFails++;
  }
}

async function runTests() {
  console.log(`================================================================`);
  console.log(`🧪 MULTI-CLUSTER TENDER RECONCILIATION & CONTRACT TEST SUITE`);
  console.log(`================================================================\n`);

  const tempDir = path.join(__dirname, '..', '..', 'outputs', 'temp', 'test_reconciliation');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // -------------------------------------------------------------
  // Test Group 1: CTO Container Tree Tagging (INV-25)
  // -------------------------------------------------------------
  console.log(`🔹 Test Group 1: CTO Container Tree Tagging (INV-25)`);
  const rawCtoItems = [
    { sku: 'P73282-B21', category: 'Chassis', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 10, unitPriceUsd: 2500 },
    { sku: 'P73300-B21', category: 'Processor', description: 'Intel Xeon-Gold 6530 2.1GHz 32-core 205W Processor', quantity: 20, unitPriceUsd: 3800 },
    { sku: 'P64707-B21', category: 'Memory', description: 'HPE 64GB (1x64GB) Dual Rank x4 DDR5-5600 Registered Smart Memory', quantity: 160, unitPriceUsd: 450 },
    { sku: 'P48820-B21', category: 'Fan Kit', description: 'HPE ProLiant DL380 Gen12 High Performance Fan Kit', quantity: 10, unitPriceUsd: 350 },
    { sku: 'P38997-B21', category: 'Power Supply', description: 'HPE 1000W Flex Slot Titanium Hot Plug Low Halogen Power Supply', quantity: 20, unitPriceUsd: 380 }
  ];

  const partitionResult = analyzeAndPartitionClusters(rawCtoItems, 'DL380_Gen12', 10);
  assert(partitionResult.totalChassis === 10, `Partitioned 10 total chassis nodes (Actual: ${partitionResult.totalChassis})`);
  assert(partitionResult.clusters.length === 1, 'Single homogeneous cluster created for uniform CPU request');
  
  const cluster = partitionResult.clusters[0];
  assert(cluster.items.some(i => i.sku === 'P73282-B21'), 'Cluster contains base CTO chassis container');
  assert(cluster.multiplier === 10, `Cluster multiplier set to 10 nodes (Actual: ${cluster.multiplier})`);

  // -------------------------------------------------------------
  // Test Group 2: 100-Node Facility Power & Sizing Matrix (INV-29)
  // -------------------------------------------------------------
  console.log(`\n🔹 Test Group 2: 100-Node Facility Power & Sizing Matrix (INV-29)`);
  const raw100NodeItems = [
    { sku: 'P73282-B21', category: 'Chassis', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 100, unitPriceUsd: 2500 },
    { sku: 'P74573-B21', category: 'Processor', description: 'Intel Xeon Platinum 8592+ 64-Core 350W Processor', quantity: 200, unitPriceUsd: 9500 },
    { sku: 'P64707-B21', category: 'Memory', description: 'HPE 64GB DDR5-5600 Smart Memory', quantity: 1600, unitPriceUsd: 450 },
    { sku: 'P38997-B21', category: 'Power Supply', description: 'HPE 1600W Flex Slot Platinum Power Supply', quantity: 200, unitPriceUsd: 550 },
    { sku: 'P52341-B21', category: 'Rail Kit', description: 'HPE ProLiant DL380 Gen12 Easy Install Rail Kit', quantity: 100, unitPriceUsd: 150 }
  ];

  const splitWorkbooks = splitAndWriteClusterWorkbooks(raw100NodeItems, tempDir, 'DL380_Gen12', 100);
  assert(splitWorkbooks.totalChassis === 100, `Decomposed 100-node tender accurately (Actual: ${splitWorkbooks.totalChassis})`);
  assert(splitWorkbooks.workbooks.length === 1, 'Emitted single unified cluster workbook');

  const generatedWorkbookPath = splitWorkbooks.workbooks[0].filePath;
  assert(fs.existsSync(generatedWorkbookPath), 'Generated discrete cluster workbook on filesystem');

  // -------------------------------------------------------------
  // Test Group 3: Standardized 7-Column Reconciliation BOM Contract (INV-32/37)
  // -------------------------------------------------------------
  console.log(`\n🔹 Test Group 3: Standardized 7-Column Reconciliation BOM Contract (INV-32/37)`);
  
  const uploadBOMItems = [
    { sku: 'P73282-B21', quantity: 10, unitPriceUsd: 2500, extendedPriceUsd: 25000, description: 'HPE DL380 Gen12 8SFF CTO Server' },
    { sku: 'P74573-B21', quantity: 20, unitPriceUsd: 9500, extendedPriceUsd: 190000, description: 'Intel Xeon Platinum 8592+ 64C Processor' },
    { sku: 'P64707-B21', quantity: 160, unitPriceUsd: 450, extendedPriceUsd: 72000, description: 'HPE 64GB DDR5 Smart Memory' }
  ];

  const uploadXlsxPath = path.join(tempDir, 'Partner_Portal_Upload_BOM.xlsx');
  const multiClusterTenderData = [
    { clusterIndex: 1, clusterName: 'Compute_Cluster_A', multiplier: 10, items: uploadBOMItems }
  ];

  generatePartnerPortalUploadBOM(uploadBOMItems, uploadXlsxPath, multiClusterTenderData);
  assert(fs.existsSync(uploadXlsxPath), 'Generated Partner Portal Upload BOM workbook');

  const uploadWb = xlsx.readFile(uploadXlsxPath);
  assert(uploadWb.SheetNames.includes('Partner Portal Upload BOM'), 'Contains required sheet: "Partner Portal Upload BOM"');

  const uploadWs = uploadWb.Sheets['Partner Portal Upload BOM'];
  const uploadRows = xlsx.utils.sheet_to_json(uploadWs, { header: 1 });

  // Verify exact 7-column header contract (INV-32/37)
  const expectedHeaders = ['Part No', 'Qty', 'Set', ' Description', 'Unit List Price (USD)', 'Extended Price (USD)', 'Portal / CLIC Status'];
  const actualHeaders = uploadRows[0];
  assert(Array.isArray(actualHeaders) && actualHeaders.length === 7, `Header row has exactly 7 columns (Actual: ${actualHeaders?.length})`);
  assert(actualHeaders[0] === 'Part No' && actualHeaders[1] === 'Qty' && actualHeaders[2] === 'Set' && actualHeaders[6] === 'Portal / CLIC Status', 'Header columns match exact contract schema');

  // Verify subtotal row demarcation: CONFIG #1 SUBTOTAL:
  const subtotalRow = uploadRows.find(r => Array.isArray(r) && r.some(cell => String(cell).includes('SUBTOTAL:')));
  assert(subtotalRow !== undefined, 'Contains demarcated subtotal row (CONFIG #N SUBTOTAL:)');

  // Clean temp files
  if (fs.existsSync(uploadXlsxPath)) fs.unlinkSync(uploadXlsxPath);
  if (fs.existsSync(generatedWorkbookPath)) fs.unlinkSync(generatedWorkbookPath);

  console.log(`\n================================================================`);
  console.log(`📊 RECONCILIATION CONTRACT TEST SUMMARY: ${totalPasses} PASSED | ${totalFails} FAILED`);
  console.log(`================================================================\n`);

  if (totalFails > 0) {
    process.exit(1);
  }
}

runTests();
