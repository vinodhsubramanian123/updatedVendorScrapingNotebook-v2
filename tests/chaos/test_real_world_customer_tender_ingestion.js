'use strict';
/**
 * tests/chaos/test_real_world_customer_tender_ingestion.js
 *
 * Stresses raw customer spreadsheet ingestion, multi-sheet workbooks with Excel formulas,
 * multi-vendor mixed quotes (Cisco + NetApp + HPE), multi-currency symbols, and degraded OCR.
 */

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx-js-style');
const { parseSkuLines } = require('../../scripts/lib/boq/boq_parser.js');
const { preprocessAndGroupBOQ } = require('../../scripts/lib/boq/boq_preprocessor.js');

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
  console.log(`🧪 REAL-WORLD CUSTOMER TENDER INGESTION & PARSING TEST SUITE`);
  console.log(`================================================================\n`);

  const tempDir = path.join(__dirname, '..', '..', 'outputs', 'temp', 'test_tenders');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // -------------------------------------------------------------
  // Test Group 1: Multi-Sheet Workbook with Formulas & Merged Cells
  // -------------------------------------------------------------
  console.log(`🔹 Test Group 1: Multi-Sheet Workbook with Formulas & Merged Cells`);
  const multiSheetFile = path.join(tempDir, 'customer_tender_formulas.xlsx');
  const wb = xlsx.utils.book_new();

  // Tab 1: Executive Summary (no hardware parts, metadata only)
  const summaryWs = xlsx.utils.aoa_to_sheet([
    ['Customer Name:', 'ACME Global Enterprise'],
    ['Tender Reference:', 'RFQ-2026-99481-DXB'],
    ['Target Deployment:', 'Dubai Silicon Oasis DC3'],
    ['Total Proposed Budget:', 250000]
  ]);
  xlsx.utils.book_append_sheet(wb, summaryWs, 'Summary');

  // Tab 2: Server Cluster 1 (DL380 Gen12 with calculated formulas)
  const cluster1Ws = xlsx.utils.aoa_to_sheet([
    ['Line', 'Part Number', 'Qty', 'Unit Price ($)', 'Extended ($)', 'Notes'],
    [1, 'P73282-B21', 4, 2500, { f: 'C2*D2' }, 'HPE ProLiant DL380 Gen12 8SFF CTO'],
    [2, 'P73300-B21', 8, 3800, { f: 'C3*D3' }, 'Intel Xeon Gold 6530 32C CPU'],
    [3, 'P64707-B21', 32, 450, { f: 'C4*D4' }, 'HPE 64GB 2Rx4 DDR5-5600 Smart Memory'],
    [4, 'P50478-B21', 8, 850, { f: 'C5*D5' }, 'HPE 1.92TB NVMe Read Intensive SSD'],
    [5, 'P38997-B21', 8, 350, { f: 'C6*D6' }, 'HPE 1000W Titanium Power Supply'],
    ['TOTAL', '', '', '', { f: 'SUM(E2:E6)' }, 'Cluster Subtotal']
  ]);
  xlsx.utils.book_append_sheet(wb, cluster1Ws, 'HPE_Compute_Cluster');

  xlsx.writeFile(wb, multiSheetFile);

  const preprocessedResult = preprocessAndGroupBOQ(multiSheetFile);
  assert(preprocessedResult && preprocessedResult.variations && preprocessedResult.variations.length > 0, 'Multi-sheet workbook with Excel formulas successfully ingested');
  
  const allParsedSkus = preprocessedResult.variations.flatMap(v => v.items.map(i => i.sku));
  assert(allParsedSkus.includes('P73282-B21'), 'Base chassis SKU P73282-B21 cleanly extracted across formula rows');
  assert(allParsedSkus.includes('P64707-B21'), 'Memory SKU P64707-B21 cleanly extracted');
  assert(allParsedSkus.includes('P38997-B21'), 'Power supply SKU P38997-B21 cleanly extracted');

  // -------------------------------------------------------------
  // Test Group 2: Multi-Vendor Mixed Tenders (Cisco + NetApp + HPE)
  // -------------------------------------------------------------
  console.log(`\n🔹 Test Group 2: Multi-Vendor Mixed Tenders (Cisco + NetApp + HPE)`);
  const mixedVendorRaw = `
  # Tender Quote RFQ-88219 - Combined Multi-Vendor BOM
  # Section A: Core Networking (Cisco Systems)
  N9K-C93180YC-FX3       4  Cisco Nexus 93180YC-FX3 48p 1/10/25G SFP28 Switch
  QSFP-40/100-SRBD       8  Cisco 100G and 40G Dual-Rate BiDi QSFP28 Transceiver
  CAB-C13-C14-2M         8  Power Cord 2m C13 to C14

  # Section B: Primary Compute Cluster (HPE ProLiant Gen12)
  P73282-B21             2  HPE ProLiant DL380 Gen12 8SFF CTO Server
  P73300-B21             4  Intel Xeon-Gold 6530 2.1GHz 32-core Processor
  P64707-B21            16  HPE 64GB (1x64GB) Dual Rank x4 DDR5-5600 Registered Memory
  P48820-B21             2  HPE ProLiant DL380 Gen12 High Performance Fan Kit
  P38997-B21             4  HPE 1000W Flex Slot Titanium Hot Plug Low Halogen Power Supply

  # Section C: Unified Enterprise SAN (NetApp)
  AFF-A400-BASE          1  NetApp AFF A400 Dual Controller Storage Array
  X66060A-R6             4  NetApp 25GbE Optical SFP28 Transceiver
  `;

  const parsedMixed = parseSkuLines(mixedVendorRaw.split('\n'));
  const hpeSkus = parsedMixed.items.map(i => i.sku);

  assert(hpeSkus.includes('P73282-B21'), 'Extracted HPE chassis P73282-B21 from mixed tender');
  assert(hpeSkus.includes('P48820-B21'), 'Extracted HPE Fan Kit P48820-B21 from mixed tender');
  assert(!hpeSkus.some(s => s.startsWith('N9K-') || s.startsWith('AFF-') || s.startsWith('QSFP-')), 'Foreign OEM SKUs (Cisco/NetApp) safely excluded without false positive matches');
  assert(parsedMixed.items.length === 5, `Extracted exactly 5 HPE components from mixed quote (Actual: ${parsedMixed.items.length})`);

  // -------------------------------------------------------------
  // Test Group 3: Multi-Currency & Margin Multiplier Columns
  // -------------------------------------------------------------
  console.log(`\n🔹 Test Group 3: Multi-Currency & Margin Multipliers`);
  const currencyLines = [
    'Part No\tQty\tUnit Price\tCurrency\tTotal Price\tDescription',
    'P73282-B21\t2\t€2,450.50\tEUR\t€4,901.00\tHPE DL380 Gen12 Server',
    'P73300-B21\t4\t£3,120.00\tGBP\t£12,480.00\tIntel Xeon Gold 6530 CPU',
    'P64707-B21\t16\tAED 1,650.00\tAED\tAED 26,400.00\tHPE 64GB DDR5 DIMM',
    'P38997-B21\t4\t¥48,000\tJPY\t¥192,000\tHPE 1000W Titanium PSU'
  ];

  const parsedCurrency = parseSkuLines(currencyLines);
  assert(parsedCurrency.items.length === 4, 'Successfully parsed all 4 multi-currency tabular rows');
  assert(parsedCurrency.items.find(i => i.sku === 'P73282-B21')?.quantity === 2, 'Parsed EUR quantity accurately (2)');
  assert(parsedCurrency.items.find(i => i.sku === 'P64707-B21')?.quantity === 16, 'Parsed AED quantity accurately (16)');
  assert(parsedCurrency.items.find(i => i.sku === 'P38997-B21')?.quantity === 4, 'Parsed JPY quantity accurately (4)');

  // -------------------------------------------------------------
  // Test Group 4: Degraded / Watermarked & Obfuscated OCR Lines
  // -------------------------------------------------------------
  console.log(`\n🔹 Test Group 4: Degraded & Watermarked Text Lines`);
  const noisyOcrLines = [
    '*** CONFIDENTIAL DRAFT — FOR INTERNAL USE ONLY ***',
    'PAGE 1 OF 3   |   PROJECT TITAN ARCHITECTURE',
    '------------------------------------------------------------------',
    'ITEM | PART NO (SKU)   | QTY | DESCRIPTION & COMMENTS',
    '01   | [P73282-B21]    | 1x  | Base Chassis (SFF 8-Drive Cage)',
    '02   | **P73300-B21**  | 2   | Main CPU 32-core (Factory Int #0D1)',
    '03   | P64707-B21 #0D1 | 8   | 64GB DDR5 Smart Memory Module',
    '04   | P48820-B21      | 1   | High Perf Fan Kit (MANDATORY FOR >205W)',
    '------------------------------------------------------------------',
    'APPROVED BY: ARCHITECT TEAM   |   DATE: 2026-08-30'
  ];

  const parsedOcr = parseSkuLines(noisyOcrLines);
  assert(parsedOcr.items.length === 4, `Extracted all 4 SKUs from watermarked/noisy input (Actual: ${parsedOcr.items.length})`);
  assert(parsedOcr.items.find(i => i.sku === 'P73282-B21')?.quantity === 1, 'Extracted Bracketed SKU [P73282-B21] with qty 1');
  assert(parsedOcr.items.find(i => i.sku === 'P73300-B21')?.quantity === 2, 'Extracted Bold Markdown SKU **P73300-B21** with qty 2');
  assert(parsedOcr.items.find(i => i.sku === 'P64707-B21')?.isFactoryIntegrated === true || parsedOcr.items.find(i => i.sku === 'P64707-B21')?.quantity === 8, 'Recognized FIO suffix or quantity 8 for P64707-B21');

  // Clean temp files
  if (fs.existsSync(multiSheetFile)) {
    fs.unlinkSync(multiSheetFile);
  }

  console.log(`\n================================================================`);
  console.log(`📊 INGESTION TEST SUMMARY: ${totalPasses} PASSED | ${totalFails} FAILED`);
  console.log(`================================================================\n`);

  if (totalFails > 0) {
    process.exit(1);
  }
}

runTests();
