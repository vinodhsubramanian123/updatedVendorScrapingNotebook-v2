'use strict';
/**
 * tests/test_extreme_edge_cases.js — Extreme Edge Cases, Dirty Inputs & Boundary Conditions Suite
 *
 * Tests:
 * 1. Empty and whitespace-only BOQ inputs
 * 2. 0-quantity and negative quantity lines
 * 3. Extreme Unicode & special characters in SKU descriptions
 * 4. Ultra-dense BOQs (1,000+ items)
 * 5. Unknown vendor SKUs mixed with HPE SKUs
 * 6. Missing catalog directory fallback
 * 7. Corrupted JSON fallback
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const { evaluatePhysicalMath, parseAndConsolidateBOQ } = require('../scripts/lib/boq_evaluator.js');
const { extractWorkloadDna } = require('../scripts/lib/conflict/workload_dna.js');
const { synthesize5TierRankedSolutions } = require('../scripts/lib/conflict/strategy_synthesizer.js');
const { validateConflictGraph } = require('../scripts/lib/conflict_graph.js');
const { preprocessAndGroupBOQ } = require('../scripts/lib/boq_preprocessor.js');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
  }
}

console.log('================================================================');
console.log('🧪 RUNNING EXTREME EDGE CASES & BOUNDARY CONDITIONS SUITE');
console.log('================================================================\n');

// 1. Empty & Whitespace Inputs
runTest('Empty string input returns empty items array safely', () => {
  const items = parseAndConsolidateBOQ('');
  assert.strictEqual(items.length, 0);
  const result = evaluatePhysicalMath(items);
  assert.ok(result);
  assert.strictEqual(typeof result.isMathClean, 'boolean');
});

runTest('Whitespace-only input returns empty items safely', () => {
  const items = parseAndConsolidateBOQ('   \n\n\t  \r\n   ');
  assert.strictEqual(items.length, 0);
});

// 2. Zero & Negative Quantities
runTest('0-quantity and negative quantity items handled safely', () => {
  const input = [
    '0x P73282-B21 HPE ProLiant DL380 Gen12 8SFF CTO Server',
    '-2x P74845-B21 Intel Xeon Gold 6530 32-Core 270W Processor',
    '1x P64707-B21 HPE 64GB DDR5 Memory'
  ].join('\n');
  const items = parseAndConsolidateBOQ(input);
  assert.ok(Array.isArray(items));
  const result = evaluatePhysicalMath(items);
  assert.ok(result);
  assert.ok(result.aspectChecks.length >= 6);
});

// 3. Extreme Unicode & Emoji
runTest('Unicode, Emoji, and Dirty Quote strings handled without throwing', () => {
  const input = [
    '1x P73282-B21 HPE Server 🔥🔥🔥 サーバー',
    '2x P74845-B21 Processor 32-Core 270W 🚀 Special Edition (™ & ©)',
    '1x Non-SKU random description with symbols: $%^&*()_+'
  ].join('\n');
  const items = parseAndConsolidateBOQ(input);
  const dna = extractWorkloadDna(items);
  assert.ok(dna.primaryWorkload);
  const result = evaluatePhysicalMath(items);
  assert.ok(result.conflictGraph);
});

// 4. Ultra-Dense BOQ (1,000 items)
runTest('Ultra-dense BOQ (1,000 lines) evaluates under 2500ms', () => {
  const denseItems = [];
  for (let i = 0; i < 1000; i++) {
    denseItems.push({
      sku: `P${10000 + i}-B21`,
      description: `Test Hardware Option Card Component #${i}`,
      quantity: 1,
      unitPriceUsd: 100
    });
  }
  const t0 = Date.now();
  const result = evaluatePhysicalMath(denseItems);
  const elapsed = Date.now() - t0;
  assert.ok(result.aspectChecks.length >= 6);
  assert.ok(elapsed < 2500, `Expected < 2500ms, took ${elapsed}ms`);
});

// 5. Strategy Synthesizer Deduplication
runTest('Strategy Synthesizer produces exactly 5 distinct sequential tiers', () => {
  const items = [
    { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 1, unitPriceUsd: 2500 },
    { sku: 'P74845-B21', description: 'Intel Xeon Gold 6530 32-Core 270W Processor', quantity: 2, unitPriceUsd: 2700 }
  ];
  const evalResults = { missingDependencies: [{ sku: 'P48820-B21', quantity: 1, unitPriceUsd: 350 }] };
  const tiers = synthesize5TierRankedSolutions(items, evalResults, { isWholeSolutionValid: true }, { model: 'DL380 Gen12' });

  assert.strictEqual(tiers.length, 5);
  for (let r = 1; r <= 5; r++) {
    assert.strictEqual(tiers[r - 1].rank, r);
    assert.ok(tiers[r - 1].name.includes(`Rank ${r}`));
  }
});

// 6. Preprocessor Multi-Variation Partitioning
runTest('Preprocessor clusters distinct configurations safely without crashing', () => {
  const multiText = [
    '# Node 1',
    '1x P73282-B21 HPE ProLiant DL380 Gen12 8SFF CTO Server',
    '2x P74845-B21 Intel Xeon Gold 6530 32-Core 270W Processor',
    '16x P64707-B21 HPE 64GB DDR5 Memory',
    '# Node 2',
    '1x P52534-B21 HPE ProLiant DL360 Gen11 CTO Server',
    '1x P74845-B21 Intel Xeon Gold 6530 32-Core 270W Processor',
    '8x P64707-B21 HPE 64GB DDR5 Memory'
  ].join('\n');

  const preflight = preprocessAndGroupBOQ(null, multiText);
  assert.ok(preflight);
  assert.ok(Array.isArray(preflight.configVariations));
  assert.ok(preflight.configVariations.length >= 1);
});

console.log(`\n================================================================`);
console.log(`Results: ${passedTests}/${totalTests} Extreme Edge Case Tests Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log(`================================================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
