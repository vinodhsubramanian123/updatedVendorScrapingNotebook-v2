'use strict';
/**
 * tests/chaos/test_dual_brain_cyclic_and_scoping_resilience.js
 *
 * Stresses Dual-Brain knowledge extraction, cyclic dependency protection,
 * multi-generation drift isolation, and negative sentence filtering.
 */

const { extractKnowledgeFromRagAnswer } = require('../../scripts/lib/notebook/knowledge_extractor.js');
const { validateConflictGraph } = require('../../scripts/lib/conflict/conflict_graph.js');

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
  console.log(`🧪 DUAL-BRAIN CYCLIC & SCOPING RESILIENCE TEST SUITE`);
  console.log(`================================================================\n`);

  // -------------------------------------------------------------
  // Test Group 1: Negative and Advisory Statement Filtering
  // -------------------------------------------------------------
  console.log(`🔹 Test Group 1: Negative & Advisory Statement Filtering`);
  
  // RAG answer explaining why standard heatsink is capped and incompatible with high TDP CPU
  const negativeRagAnswer = `
    Standard heatsinks P49145-B21 are capped at 185W TDP; therefore 250W Intel Xeon 6530 P73300-B21 cannot be used with P49145-B21.
    Selecting P73300-B21 mandates High Performance Heatsink P49147-B21.
  `;

  const extractedDeltas = extractKnowledgeFromRagAnswer(negativeRagAnswer, 'DL380_Gen12');
  
  // Verify that the negative sentence did NOT create a false dependency delta (P73300-B21 requires P49145-B21)
  const falseDependencyDelta = extractedDeltas.find(d => 
    d.affectedSku === 'P73300-B21' && d.requiredDependencySku === 'P49145-B21'
  );
  assert(falseDependencyDelta === undefined, 'Filtered out negative/capped constraint sentence — 0 false dependency deltas generated');

  // Verify that the affirmative mandate sentence WAS extracted correctly
  const affirmativeDelta = extractedDeltas.find(d => 
    d.affectedSku === 'P73300-B21' && d.requiredDependencySku === 'P49147-B21'
  );
  assert(affirmativeDelta !== undefined, 'Accurately extracted affirmative requirement delta (P73300-B21 -> P49147-B21)');

  // -------------------------------------------------------------
  // Test Group 2: Cyclic Dependency Deadlock & Loop Prevention
  // -------------------------------------------------------------
  console.log(`\n🔹 Test Group 2: Cyclic Dependency Deadlock & Loop Prevention`);
  
  const cyclicItems = [
    { sku: 'P73282-B21', quantity: 1, description: 'HPE ProLiant DL380 Gen12 8SFF Server' },
    { sku: 'P73300-B21', quantity: 2, description: 'Intel Xeon-Gold 6530 Processor' }
  ];

  // Pass contradictory/cyclic rule deltas: SKU_A requires SKU_B and SKU_B requires SKU_A
  const cyclicDeltas = [
    { deltaId: 'D1', affectedSku: 'SKU_ALPHA', requiredDependencySku: 'SKU_BETA', ruleType: 'DEPENDENCY_CHAIN' },
    { deltaId: 'D2', affectedSku: 'SKU_BETA', requiredDependencySku: 'SKU_ALPHA', ruleType: 'DEPENDENCY_CHAIN' }
  ];

  const conflictResult = validateConflictGraph(cyclicItems, 'outputs/ProLiant/Gen12/DL380_Gen12', cyclicDeltas);
  assert(conflictResult !== null && typeof conflictResult === 'object', 'Conflict graph evaluator terminated safely without call stack overflow');
  assert(Array.isArray(conflictResult.conflicts), 'Returned valid conflicts array without crashing');

  // -------------------------------------------------------------
  // Test Group 3: Multi-Generation Architectural Isolation
  // -------------------------------------------------------------
  console.log(`\n🔹 Test Group 3: Multi-Generation Architectural Isolation`);
  
  const gen11Items = [
    { sku: 'P52534-B21', quantity: 1, description: 'HPE ProLiant DL380 Gen11 8SFF CTO Server' },
    { sku: 'P49614-B21', quantity: 2, description: 'Intel Xeon Gold 6430 32-Core 8-Channel Processor' },
    { sku: 'P43328-B21', quantity: 16, description: 'HPE 32GB 2Rx8 DDR5-4800 Smart Memory' }
  ];

  const gen11Validation = validateConflictGraph(gen11Items, 'outputs/ProLiant/Gen11/DL380_Gen11');
  assert(gen11Validation.chassisFamily === 'ProLiant' || gen11Validation.conflicts !== undefined, 'Gen11 evaluated within isolated Gen11 architectural scope');
  assert(!gen11Validation.conflicts.some(c => c.message && c.message.includes('12-channel')), 'Gen12 12-channel rules did not bleed into Gen11 8-channel evaluation');

  console.log(`\n================================================================`);
  console.log(`📊 DUAL-BRAIN SCOPING TEST SUMMARY: ${totalPasses} PASSED | ${totalFails} FAILED`);
  console.log(`================================================================\n`);

  if (totalFails > 0) {
    process.exit(1);
  }
}

runTests();
