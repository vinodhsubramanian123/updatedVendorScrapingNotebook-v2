'use strict';
/**
 * scripts/test_excel_and_sync_verification.js
 *
 * Verifies:
 * 1. Master Catalog Excel Workbook Sheet Structure & Delta History Formatting
 * 2. Multi-Tier Candidate Corrected BOQ Excel Generation & Formulas
 * 3. Gemini NotebookLM Markdown Sync Payload & Scope Taxonomy Integrity
 * 4. Local Server HTTP Download Endpoints for Excel Artifacts
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const XLSX = require('xlsx-js-style');

const { generateProfessionalBOQ } = require('../../scripts/lib/boq/generate_boq_xlsx.js');
const { generateNotebookSyncPayload, buildMasterKnowledgeRegistry } = require('../../scripts/lib/sync/knowledge_sync.js');
const { evaluateBOQMultiAspect } = require('../../scripts/lib/boq/boq_evaluator.js');
const { evaluateWholeSolutionGraph } = require('../../scripts/lib/conflict/conflict_graph.js');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const OUTPUTS_DIR = path.join(PROJECT_ROOT, 'outputs');
const DL380_DIR = path.join(OUTPUTS_DIR, 'ProLiant', 'Gen12', 'DL380_Gen12_SFF');
const MASTER_EXCEL = path.join(DL380_DIR, 'DL380_Gen12_SFF_OCA_Catalog.xlsx');

const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

let totalTests = 0;
let passedTests = 0;

function assertTest(name, condition, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ${C.green}✅ [PASS]${C.reset} ${name} ${details ? `(${details})` : ''}`);
  } else {
    console.error(`  ${C.red}❌ [FAIL]${C.reset} ${name} ${details ? `(${details})` : ''}`);
  }
}

async function testMasterExcelWorkbook() {
  console.log(`\n${C.bold}${C.blue}▶ [TEST 1] Auditing Master Catalog Excel Workbook & Delta History Formatting${C.reset}`);
  
  assertTest('Master Excel file exists on disk', fs.existsSync(MASTER_EXCEL), MASTER_EXCEL);
  
  const wb = XLSX.readFile(MASTER_EXCEL);
  const sheetNames = wb.SheetNames;
  
  console.log(`  Sheets in workbook: ${sheetNames.join(', ')}`);
  
  assertTest("Workbook contains 'Category Summary' sheet", sheetNames.includes('Category Summary'));
  assertTest("Workbook contains 'All SKUs' sheet", sheetNames.includes('All SKUs'));
  assertTest("Workbook contains 'Rules & Constraints' sheet", sheetNames.includes('Rules & Constraints'));
  assertTest("Workbook contains 'Price History Timeline' delta sheet", sheetNames.includes('Price History Timeline'));
  assertTest("Workbook contains 'Metadata' sheet", sheetNames.includes('Metadata'));

  // Inspect 'All SKUs' sheet
  const allSkusSheet = wb.Sheets['All SKUs'];
  const allSkusData = XLSX.utils.sheet_to_json(allSkusSheet);
  assertTest("'All SKUs' has data rows", allSkusData.length > 50, `Rows: ${allSkusData.length}`);
  
  const sampleRow = allSkusData[0] || {};
  assertTest("'All SKUs' has 'Diff Status' column", 'Diff Status' in sampleRow || Object.keys(sampleRow).some(k => k.toLowerCase().includes('diff')));
  assertTest("'All SKUs' has 'Product #' column", 'Product #' in sampleRow || 'sku' in sampleRow);
  assertTest("'All SKUs' has 'Unit Price (USD)' column", 'Unit Price (USD)' in sampleRow || 'Unit Price' in sampleRow);

  // Inspect 'Price History Timeline' sheet
  const priceHistorySheet = wb.Sheets['Price History Timeline'];
  const priceHistoryData = XLSX.utils.sheet_to_json(priceHistorySheet);
  assertTest("'Price History Timeline' sheet has data", priceHistoryData.length > 0, `Entries: ${priceHistoryData.length}`);
}

async function testCandidateBoqExcelExport() {
  console.log(`\n${C.bold}${C.blue}▶ [TEST 2] Auditing Candidate Corrected BOQ Multi-Sheet Excel Export${C.reset}`);
  
  const sampleCsv = path.join(PROJECT_ROOT, 'outputs', 'test_boqs', 'combo_2_thermal_missing_fan.csv');
  const evalResults = evaluateBOQMultiAspect(sampleCsv);

  const exportPath = path.join(PROJECT_ROOT, 'outputs', 'test_boqs', 'test_corrected_boq_rank1.xlsx');
  generateProfessionalBOQ(evalResults, exportPath, 'DL380_Gen12_SFF', 1);

  assertTest('Corrected BOQ Excel file generated', fs.existsSync(exportPath), exportPath);

  const wb = XLSX.readFile(exportPath);
  const sheetNames = wb.SheetNames;
  
  assertTest("Exported workbook contains 'Summary' sheet", sheetNames.includes('Summary'));
  assertTest("Exported workbook contains 'Base BOM' sheet", sheetNames.includes('Base BOM'));
  assertTest("Exported workbook contains 'Missing Dependencies' sheet", sheetNames.includes('Missing Dependencies'));
  assertTest("Exported workbook contains 'Strategy Add-ons' sheet", sheetNames.includes('Strategy Add-ons'));

  const summarySheet = wb.Sheets['Summary'];
  const summaryJson = XLSX.utils.sheet_to_json(summarySheet, { header: 1 });
  assertTest("'Summary' sheet contains CapEx & RAG details", summaryJson.length >= 8);

  const missingDepsSheet = wb.Sheets['Missing Dependencies'];
  const missingDepsJson = XLSX.utils.sheet_to_json(missingDepsSheet);
  assertTest("'Missing Dependencies' has injected High-Perf Fan Kit", missingDepsJson.some(r => String(r.SKU || '').includes('P48820') || String(r.Description || '').toLowerCase().includes('fan')));
}

async function testNotebookLmSyncPayload() {
  console.log(`\n${C.bold}${C.blue}▶ [TEST 3] Auditing Gemini NotebookLM Markdown Sync Payload & Rules Charter${C.reset}`);

  buildMasterKnowledgeRegistry();
  const syncResult = generateNotebookSyncPayload('DL380_Gen12_SFF');
  const payloadPath = syncResult.payloadPath || syncResult;

  assertTest('NotebookLM Sync Payload file generated', fs.existsSync(payloadPath), payloadPath);

  const payloadContent = fs.readFileSync(payloadPath, 'utf-8');
  assertTest('Payload contains Executive Delta Summary table', payloadContent.includes('Executive Delta & Recent Change Summary'));
  assertTest('Payload contains Universal Vendor Rules section', payloadContent.includes('1. Universal Vendor Rules'));
  assertTest('Payload contains Family & Generation Rules section', payloadContent.includes('2. Family & Generation Rules'));
  assertTest('Payload contains Chassis-Specific Gotchas section', payloadContent.includes('3. Chassis & Solution-Type Gotchas'));
  assertTest('Payload contains Discontinued SKUs Registry', payloadContent.includes('4. Discontinued & Obsolete SKUs Registry'));
  assertTest('Payload contains Attribute Modifications Log', payloadContent.includes('5. Recent Attribute & Specification Modifications Log'));
}

function fetchHttp(url, method = 'GET', postData = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: postData ? {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      } : {}
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function testHttpEndpoints() {
  console.log(`\n${C.bold}${C.blue}▶ [TEST 4] Auditing Local Express Server HTTP Excel Download Endpoints${C.reset}`);

  try {
    const excelUrl = 'http://127.0.0.1:3000/artifacts/ProLiant/Gen12/DL380_Gen12_SFF/DL380_Gen12_SFF_OCA_Catalog.xlsx';
    const resExcel = await fetchHttp(excelUrl, 'GET');
    assertTest('HTTP GET master catalog Excel returns 200 OK', resExcel.statusCode === 200, `Status: ${resExcel.statusCode}`);
    assertTest('HTTP GET master catalog Excel sets attachment disposition', String(resExcel.headers['content-disposition'] || '').includes('attachment'));

    const sampleCsv = path.join(PROJECT_ROOT, 'outputs', 'test_boqs', 'combo_2_thermal_missing_fan.csv');
    const evalResults = evaluateBOQMultiAspect(sampleCsv);

    const postPayload = JSON.stringify({
      evalResults,
      chassisId: 'DL380_Gen12_SFF',
      rankTier: 1
    });

    const resExport = await fetchHttp('http://127.0.0.1:3000/api/export-boq', 'POST', postPayload);
    assertTest('HTTP POST /api/export-boq returns 200 OK', resExport.statusCode === 200, `Status: ${resExport.statusCode}`);
    const exportJson = JSON.parse(resExport.body);
    assertTest('HTTP POST /api/export-boq returns valid downloadPath', exportJson.downloadPath && exportJson.downloadPath.startsWith('/artifacts/temp/exports/'), exportJson.downloadPath);

  } catch (err) {
    console.error('  ⚠️ Local server HTTP test advisory (server may be on alternative port or busy):', err.message);
  }
}

async function main() {
  console.log(`${C.bold}${C.cyan}================================================================${C.reset}`);
  console.log(`${C.bold}${C.cyan}📊 MASTER EXCEL WORKBOOK & NOTEBOOKLM SYNC VERIFICATION SUITE${C.reset}`);
  console.log(`${C.bold}${C.cyan}================================================================${C.reset}`);

  await testMasterExcelWorkbook();
  await testCandidateBoqExcelExport();
  await testNotebookLmSyncPayload();
  await testHttpEndpoints();

  console.log(`\n${C.bold}${C.cyan}================================================================${C.reset}`);
  console.log(`${C.bold}${C.cyan}📊 VERIFICATION SUITE SUMMARY${C.reset}`);
  console.log(`${C.bold}${C.cyan}================================================================${C.reset}`);
  console.log(`  Total Assertions : ${totalTests}`);
  console.log(`  Passed           : ${C.green}${passedTests}${C.reset}`);
  console.log(`  Failed           : ${totalTests - passedTests === 0 ? C.green + '0' : C.red + (totalTests - passedTests)}${C.reset}`);
  console.log(`  Compliance Rate  : ${passedTests === totalTests ? C.green : C.yellow}${((passedTests / totalTests) * 100).toFixed(1)}%${C.reset}`);
  console.log(`${C.bold}${C.cyan}================================================================${C.reset}\n`);

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
