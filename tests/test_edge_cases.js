'use strict';
/**
 * tests/test_edge_cases.js — Edge Case, Robustness & Fuzz Testing Suite
 *
 * Tests:
 * 1. Empty, Null, Garbage & Malformed BOQ Input Resilience
 * 2. Extreme Quantities, Multipliers & Negative/Zero Handling
 * 3. Extreme Physical & Conflict Edge Cases (High TDP 400W, Power Supply & Memory mixing)
 * 4. Local RAG Fallback & Knowledge Delta Robustness
 * 5. Adversarial Fuzz Testing (30 randomized mutations)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { parseAndConsolidateBOQ, evaluatePhysicalMath } = require('../scripts/lib/boq_evaluator');
const { validateConflictGraph } = require('../scripts/lib/conflict_graph');
const { queryLocalKnowledgeBase } = require('../scripts/lib/local_rag_search');
const { processPortalFeedback } = require('../scripts/lib/feedback_loop');

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
console.log('🧪 EDGE CASE, ROBUSTNESS & FUZZ TESTING SUITE');
console.log('================================================================\n');

// ─────────────────────────────────────────────────────────────────────────────
// 1. EMPTY, NULL, GARBAGE & MALFORMED BOQ INPUT RESILIENCE
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 1. Empty, Null, Garbage & Malformed BOQ Resilience ---');

const resNull = parseAndConsolidateBOQ(null);
assert(Array.isArray(resNull) && resNull.length === 0, 'Null input parsed to empty array without throwing');

const resUndefined = parseAndConsolidateBOQ(undefined);
assert(Array.isArray(resUndefined) && resUndefined.length === 0, 'Undefined input parsed to empty array without throwing');

const resEmptyStr = parseAndConsolidateBOQ('');
assert(Array.isArray(resEmptyStr) && resEmptyStr.length === 0, 'Empty string input parsed to empty array without throwing');

const resGarbage = parseAndConsolidateBOQ('lorem ipsum random text with no valid skus 12345 !@#$%^&*()');
assert(Array.isArray(resGarbage) && resGarbage.length === 0, 'Garbage non-BOQ text parsed to empty array without throwing');

const evalEmpty = evaluatePhysicalMath([]);
assert(evalEmpty.confidence.score < 0.75 && evalEmpty.confidence.isHitlTriggered === true, 'Empty BOQ evaluation correctly triggers HITL safeguarding');

const evalMalformedItem = evaluatePhysicalMath([{ sku: 'INVALID-SKU', description: 'Bad SKU', quantity: -5 }]);
assert(evalMalformedItem.confidence.score >= 0, 'Evaluator handles malformed SKU and negative quantity without crashing');

// ─────────────────────────────────────────────────────────────────────────────
// 2. EXTREME QUANTITIES, MULTIPLIERS & ZERO/NEGATIVE HANDLING
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. Extreme Quantities, Multipliers & Edge Values ---');

const extremeBoq = `
50x HPE ProLiant DL380 Gen12 Server Nodes
P73282-B21\tBase Chassis\t0
P69728-B21\t64GB DIMM\t-10
P69728-B21\t64GB DIMM\t999999
`;
const extremeItems = parseAndConsolidateBOQ(extremeBoq);
assert(extremeItems.length > 0, 'Parsed extreme multiplier and items without throwing');

// ─────────────────────────────────────────────────────────────────────────────
// 3. EXTREME PHYSICAL & CONFLICT EDGE CASES
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. Extreme Physical & Conflict Edge Cases ---');

// 3A. Extreme TDP 400W Processor without fans
const extremeTdpBoq = `
P73282-B21\tHPE DL380 Gen12 SFF Server\t1
P74579-B21\tIntel Xeon 6799P 400W Processor for HPE\t2
`;
const extremeTdpItems = parseAndConsolidateBOQ(extremeTdpBoq);
const extremeTdpEval = evaluatePhysicalMath(extremeTdpItems);
assert(extremeTdpEval.errors.some(e => e.includes('High TDP')), 'Caught extreme 400W processor missing High-Performance Fan Kit');

// 3B. Triple Power Supply Mixing (AC 1000W + DC 1600W + Titanium 1800W)
const triplePsuBoq = `
P73282-B21\tHPE DL380 Gen12 SFF Server\t1
P03178-B21\tHPE 1000W Flex Slot Titanium Power Supply\t1
P17023-B21\tHPE 1600W -48VDC Power Supply\t1
P93501-B21\tHPE 1800W-2200W Titanium Power Supply\t1
`;
const triplePsuItems = parseAndConsolidateBOQ(triplePsuBoq);
const triplePsuEval = evaluatePhysicalMath(triplePsuItems);
assert(triplePsuEval.conflictGraph.conflicts.length > 0, 'Detected multi-PSU type mixing conflict across AC and DC power supplies');

// ─────────────────────────────────────────────────────────────────────────────
// 4. LOCAL RAG & FEEDBACK LOOP ROBUSTNESS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 4. Local RAG & Feedback Loop Robustness ---');

const ragRes = queryLocalKnowledgeBase('nonexistent_query_xyz_12345_abc', 'DL380 Gen12');
assert(ragRes && typeof ragRes.answer === 'string' && Array.isArray(ragRes.citations), 'Local RAG returns valid result structure for unmatched query');

const tmpTestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-test-'));
const fbRes = processPortalFeedback('', tmpTestDir);
assert(fbRes && fbRes.deltaId, 'Feedback processor handles empty error string gracefully');
try { fs.rmSync(tmpTestDir, { recursive: true, force: true }); } catch (e) {}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ADVERSARIAL FUZZ TESTING SUITE (30 MUTATIONS)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 5. Adversarial Fuzz Testing Suite (30 Mutations) ---');

const baseValidSkus = [
  'P73282-B21', 'P74573-B21', 'P48820-B21', 'P69728-B21', 
  'P47777-B21', 'P01366-B21', 'P63829-B21', 'P03178-B21'
];

let fuzzSuccessCount = 0;
const totalFuzzRuns = 30;

for (let i = 0; i < totalFuzzRuns; i++) {
  try {
    // Generate randomized noise BOQ string
    let fuzzLines = [];
    const lineCount = Math.floor(Math.random() * 15) + 1;
    for (let j = 0; j < lineCount; j++) {
      const randSku = baseValidSkus[Math.floor(Math.random() * baseValidSkus.length)];
      const noise = Math.random() > 0.5 ? `[NOISE-${Math.random()}]` : ' / | + -- ';
      const qty = Math.floor(Math.random() * 10) - 2; // Can include negative or zero
      fuzzLines.push(`${qty}x ${randSku} ${noise} Description item ${j}`);
    }
    const fuzzText = fuzzLines.join('\n');
    const parsedFuzz = parseAndConsolidateBOQ(fuzzText);
    const evalFuzz = evaluatePhysicalMath(parsedFuzz);
    if (evalFuzz && typeof evalFuzz.confidence.score === 'number') {
      fuzzSuccessCount++;
    }
  } catch (err) {
    console.error(`  ❌ Fuzz run ${i} threw unhandled exception:`, err);
  }
}

assert(fuzzSuccessCount === totalFuzzRuns, `All ${totalFuzzRuns} adversarial fuzz test iterations executed without crashing`);

// Cleanup tmp dir
try { fs.rmSync(tmpTestDir, { recursive: true, force: true }); } catch (e) {}

// Summary
console.log('\n================================================================');
console.log(`📊 EDGE CASE TEST SUMMARY: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log('🎉 100% EDGE CASES & ROBUSTNESS TESTS PASSED!');
} else {
  console.log('⚠️ Some edge case tests failed — review output above.');
}
console.log('================================================================\n');

if (failed > 0) process.exit(1);
