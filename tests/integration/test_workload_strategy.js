'use strict';

const { extractWorkloadDna } = require('../../scripts/lib/conflict/workload_dna.js');
const { synthesizeStrategies } = require('../../scripts/lib/conflict/strategy_synthesizer.js');
const { queryLocalKnowledgeBase } = require('../../scripts/lib/rag/local_rag_search.js');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('================================================================');
console.log('🧪 WORKLOAD DNA & STRATEGY SYNTHESIZER TEST SUITE');
console.log('================================================================\n');

// 1. Test Workload DNA classification
console.log('--- 1. Workload DNA Classification ---');

// High-density AI/VDI GPU config
const gpuConfig = extractWorkloadDna([
  { description: 'NVIDIA H100 80GB PCIe Gen5 Accelerator', quantity: 4 }
]);
assert(gpuConfig.primaryWorkload === 'VDI_AI_GRAPHICS', 'Classifies high-density GPU config correctly');

// DB OLTP high-IOPS storage config
const storageConfig = extractWorkloadDna([
  { description: 'HPE 3.2TB NVMe Gen4 High Performance Mixed Use SFF BC U.3 PM1735a SSD', quantity: 10 }
]);
assert(storageConfig.primaryWorkload === 'STORAGE_HIGH_IOPS', 'Classifies DB OLTP high-IOPS storage config correctly');

// Edge compute nodes (dense virtualization)
const denseConfig = extractWorkloadDna([
  { description: 'Intel Xeon-Platinum 8468 (2.1GHz/48-core/105MB/350W) Processor', quantity: 2 }
]);
assert(denseConfig.primaryWorkload === 'VIRTUALIZATION_DENSE', 'Classifies edge compute dense virtualization correctly');


// 2. Verify Ranks 1-5 Generation
console.log('\n--- 2. Strategy Synthesizer 5-Tier Generation ---');
const dummySkus = [{ sku: 'P73282-B21', description: 'Base Chassis', quantity: 1 }];
const dummyEvalResults = {};
const dummyGraphResults = { resolvedFixes: [] };
const dummyChassisInfo = { model: 'DL380 Gen12' };

const strategies = synthesizeStrategies(dummySkus, dummyEvalResults, dummyGraphResults, dummyChassisInfo);

assert(Array.isArray(strategies) && strategies.length === 5, 'Generates exactly 5 ranks');
const ranks = strategies.map(s => s.rank);
const uniqueRanks = new Set(ranks);
assert(uniqueRanks.size === 5 && Math.min(...ranks) === 1 && Math.max(...ranks) === 5, 'Ranks 1 through 5 generated dynamically without duplicates');
assert(strategies.every(s => s.skuPartsList.length > 0 && s.skuPartsList.every(p => p.sku && p.sku !== 'HALLUCINATED_SKU')), 'No hallucinated SKU part numbers');
assert(strategies.every(s => s.budgetBreakdown && s.budgetBreakdown.totalBudgetUsd > 0), 'Each tier calculates a budget greater than zero');

// 3. Stress-test fallback local RAG grounding
console.log('\n--- 3. Fallback Local RAG Grounding ---');
const ragResponse = queryLocalKnowledgeBase('NVIDIA H100 80GB', 'DL380 Gen12');
assert(ragResponse && ragResponse.answer, 'Returns a valid RAG response');
assert(ragResponse.source === 'LOCAL_CATALOG_RAG', 'Properly falls back to local catalog search when no Gemini/OpenAI API is available');


console.log('\n================================================================');
console.log(`📊 WORKLOAD & STRATEGY TEST SUMMARY: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log('🎉 ALL TESTS PASSED!');
} else {
  console.log('⚠️ Some tests failed — review output above.');
}
console.log('================================================================\n');

if (failed > 0) process.exit(1);
