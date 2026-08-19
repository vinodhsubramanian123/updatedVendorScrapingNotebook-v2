'use strict';
/**
 * scripts/test_notebook_scenarios.js
 *
 * Automated Scenario Verification Suite for NotebookLM RAG Pipeline.
 * Tests:
 * 1. Query Sanitization & Code Pattern Stripping across 7 distinct hardware evaluation scenarios.
 * 2. Scenario Classification Accuracy (`classifyQueryScenario`).
 * 3. Sanitization Breakdown & Payload Metadata Inspection (`getSanitizationBreakdown`).
 * 4. Local RAG Fallback Execution & Citation Formatting.
 * 5. Telemetry Analytics & Performance Latency Metrics calculation.
 */

const {
  sanitizeNotebookQuery,
  getSanitizationBreakdown,
  classifyQueryScenario,
  postProcessNotebookResult,
  diagnoseNotebookFailure
} = require('./lib/notebook_query_utils.js');

const { queryLocalKnowledgeBase } = require('./lib/local_rag_search.js');
const { recordNotebookConsultationTelemetry, loadTelemetry } = require('./lib/system/telemetry.js');

async function runScenarioVerificationSuite() {
  console.log('========================================================================');
  console.log('🚀 GEMINI NOTEBOOKLM RAG HARDWARE SCENARIOS VERIFICATION SUITE');
  console.log('========================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, testName, detail = '') {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`   Details: ${detail}`);
    }
  }

  // --- SCENARIO 1: Thermal TDP Fans ---
  const q1 = 'Does an Intel Xeon Platinum 8480+ (350W TDP) processor require High Performance Fan Kits and Heatsinks on DL380 Gen12?';
  const sc1 = classifyQueryScenario(q1);
  const bd1 = getSanitizationBreakdown(q1, { chassis: 'HPE ProLiant DL380 Gen12 SFF' });
  assert(
    sc1 === 'THERMAL_TDP' && bd1.productScope.chassis === 'HPE ProLiant DL380 Gen12 SFF',
    'Scenario 1: Classify High TDP Thermal Fan query and inject chassis scope',
    `Scenario: ${sc1}, Scope: ${JSON.stringify(bd1.productScope)}`
  );

  // --- SCENARIO 2: Telco -48VDC Cable Lug Kit ---
  const q2 = 'When selecting 800W -48VDC Flex Slot Power Supplies on DL360 Gen12, is the DC power cable lug kit mandatory?';
  const sc2 = classifyQueryScenario(q2);
  assert(
    sc2 === 'TELCO_DC',
    'Scenario 2: Classify Telco -48VDC Cable Lug Kit query',
    `Scenario: ${sc2}`
  );

  // --- SCENARIO 3: Smart Storage Controller Cache Battery ---
  const q3 = 'Does the HPE Smart Array P408i-a SR Gen10 Controller require an HPE Smart Storage Hybrid Capacitor or Battery Backup Kit?';
  const sc3 = classifyQueryScenario(q3);
  assert(
    sc3 === 'STORAGE_CACHE',
    'Scenario 3: Classify Smart Storage Controller Cache Battery query',
    `Scenario: ${sc3}`
  );

  // --- SCENARIO 4: Memory Channel Symmetry ---
  const q4 = 'What are the DIMM interleaving and channel symmetry rules when installing 12x 64GB DDR5 DIMMs across 2 sockets?';
  const sc4 = classifyQueryScenario(q4);
  assert(
    sc4 === 'MEMORY_SYMMETRY',
    'Scenario 4: Classify Memory Channel Balance & Symmetry query',
    `Scenario: ${sc4}`
  );

  // --- SCENARIO 5: 64+ Core Processor Requirements ---
  const q5 = 'What are the power supply, memory speed, and thermal fan rules for 64-core processors in DL380 Gen12?';
  const sc5 = classifyQueryScenario(q5);
  assert(
    sc5 === 'PROCESSOR_SPECS',
    'Scenario 5: Classify Ultra-High Core Processor query',
    `Scenario: ${sc5}`
  );

  // --- SCENARIO 6: PCIe Slot & Risers Allocation ---
  const q6 = 'Can Primary Riser 1 and Secondary Riser 2 be populated simultaneously with GPU cards without a second CPU?';
  const sc6 = classifyQueryScenario(q6);
  assert(
    sc6 === 'PCIE_EXPANSION',
    'Scenario 6: Classify PCIe Slot & Riser Allocation query',
    `Scenario: ${sc6}`
  );

  // --- SCENARIO 7: Code Stripping & Ambiguity Resolution ---
  const rawCodeQuery = 'const fs = require("fs"); function check() { return process.env; } Is P49025-B21 compatible with P76453-B21 on DL380 Gen12?';
  const bd7 = getSanitizationBreakdown(rawCodeQuery, { chassis: 'HPE ProLiant DL380 Gen12 SFF' });
  assert(
    bd7.containsCode === true &&
    bd7.extractedSkus.includes('P49025-B21') &&
    bd7.extractedSkus.includes('P76453-B21') &&
    !bd7.sanitizedQuery.includes('const fs') &&
    !bd7.sanitizedQuery.includes('require('),
    'Scenario 7: Code stripping & SKUs retention in raw scripting query',
    `Sanitized: "${bd7.sanitizedQuery}"`
  );

  // --- SCENARIO 8: Local RAG Fallback Verification ---
  console.log('\n🔍 Testing Local Knowledge Base RAG Search Fallback...');
  const localRes = queryLocalKnowledgeBase('What are the memory channels for DL380 Gen12?', 'HPE ProLiant DL380 Gen12 SFF');
  assert(
    localRes.answer && localRes.source === 'LOCAL_CATALOG_RAG' && Array.isArray(localRes.citations),
    'Scenario 8: Local RAG Knowledge Base fallback executes cleanly',
    `Source: ${localRes.source}, Answer length: ${localRes.answer.length}`
  );

  // --- SCENARIO 9: Telemetry Metrics Calculation ---
  console.log('\n📊 Testing Telemetry RAG Metrics Calculation...');
  recordNotebookConsultationTelemetry({
    query: q1,
    sanitizedQuery: bd1.sanitizedQuery,
    answer: 'Intel Xeon Platinum 8480+ (350W TDP) requires High Performance Fan Kits (P14608-B21) and High Performance Heatsinks.',
    citations: [{ source: 'QuickSpecs DL380 Gen12', snippet: 'Processors >240W require High Perf Fans' }],
    durationMs: 145,
    scenario: 'THERMAL_TDP',
    agreementScore: 0.95,
    chassis: 'HPE ProLiant DL380 Gen12 SFF'
  });

  const tele = loadTelemetry();
  assert(
    typeof tele.avgNlmResponseTimeMs === 'number' &&
    typeof tele.nlmAgreementIndex === 'number' &&
    typeof tele.nlmCitationMatchRate === 'number',
    'Scenario 9: Telemetry records durationMs, scenario, and computes aggregate metrics',
    `Avg Duration: ${tele.avgNlmResponseTimeMs}ms, Agreement: ${tele.nlmAgreementIndex}%, Citations Match: ${tele.nlmCitationMatchRate}%`
  );

  console.log(`\n========================================================================`);
  console.log(`📊 SCENARIO TEST SUMMARY: ${passed}/${total} assertions passed (${Math.round(passed / total * 100)}%)`);
  console.log(`========================================================================\n`);

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runScenarioVerificationSuite().catch(err => {
  console.error('❌ Scenario verification suite failed:', err);
  process.exit(1);
});
