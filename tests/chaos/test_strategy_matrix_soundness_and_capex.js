'use strict';
/**
 * tests/chaos/test_strategy_matrix_soundness_and_capex.js
 *
 * Stresses 5-Tier Strategic Resolution Matrix:
 * 1. 5 distinct solution tiers (Rank 1 through Rank 5) with zero duplicate ranks.
 * 2. CapEx monotonicity: Rank 4 >= Rank 3 >= Rank 5.
 * 3. Base chassis SKU retention across all 5 ranks.
 * 4. List price resolution and zero NaN/undefined budget calculations.
 */

const { synthesize5TierRankedSolutions } = require('../../scripts/lib/conflict/strategy_synthesizer.js');

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
  console.log(`🧪 5-TIER STRATEGY MATRIX SOUNDNESS & CAPEX TEST SUITE`);
  console.log(`================================================================\n`);

  const dl380Gen12Dir = 'outputs/ProLiant/Gen12/DL380_Gen12';
  const rawItems = [
    { sku: 'P73282-B21', category: 'Chassis', description: 'HPE ProLiant DL380 Gen12 8SFF Server', quantity: 1 },
    { sku: 'P73300-B21', category: 'Processor', description: 'Intel Xeon-Gold 6530 2.1GHz 32-core Processor', quantity: 2 },
    { sku: 'P64707-B21', category: 'Memory', description: 'HPE 64GB DDR5-5600 Smart Memory', quantity: 8 },
    { sku: 'P50478-B21', category: 'Storage Drive', description: 'HPE 1.92TB NVMe SSD', quantity: 4 },
    { sku: 'P38997-B21', category: 'Power Supply', description: 'HPE 1000W Titanium Power Supply', quantity: 2 }
  ];

  const evalResults = {
    missingDependencies: [
      { sku: 'P48820-B21', description: 'HPE ProLiant DL380 Gen12 High Performance Fan Kit', quantity: 1, reason: 'Required for high TDP processors' }
    ]
  };

  const graphResults = { conflicts: [] };
  const chassisInfo = { chassis: 'DL380_Gen12', model: 'DL380 Gen12', gen: 'Gen12' };

  // -------------------------------------------------------------
  // Test Group 1: 5 Distinct Solution Tiers & Zero Duplicates
  // -------------------------------------------------------------
  console.log(`🔹 Test Group 1: 5 Distinct Solution Tiers & Zero Duplicate Ranks`);
  const ranks = synthesize5TierRankedSolutions(rawItems, evalResults, graphResults, chassisInfo, dl380Gen12Dir);

  assert(Array.isArray(ranks) && ranks.length === 5, `Synthesized exactly 5 ranked tiers (Actual: ${ranks?.length})`);

  const rankIds = ranks.map(r => r.rank);
  const uniqueRankIds = new Set(rankIds);
  assert(uniqueRankIds.size === 5, `Zero duplicate rank IDs in matrix: [${rankIds.join(', ')}]`);

  // -------------------------------------------------------------
  // Test Group 2: Monotonic CapEx Consistency & Sound Pricing
  // -------------------------------------------------------------
  console.log(`\n🔹 Test Group 2: Monotonic CapEx Consistency & Sound Pricing`);
  
  const rank1 = ranks.find(r => r.rank === 1);
  const rank2 = ranks.find(r => r.rank === 2);
  const rank3 = ranks.find(r => r.rank === 3);
  const rank4 = ranks.find(r => r.rank === 4);
  const rank5 = ranks.find(r => r.rank === 5);

  assert(rank1 && rank1.estimatedCostUsd > 0, `Rank 1 has valid positive estimated CapEx: $${rank1?.estimatedCostUsd?.toLocaleString()}`);
  assert(rank4 && rank4.estimatedCostUsd > 0, `Rank 4 has valid positive estimated CapEx: $${rank4?.estimatedCostUsd?.toLocaleString()}`);
  assert(rank5 && rank5.estimatedCostUsd > 0, `Rank 5 has valid positive estimated CapEx: $${rank5?.estimatedCostUsd?.toLocaleString()}`);

  assert(rank4.estimatedCostUsd >= rank3.estimatedCostUsd, `Rank 4 (Max Density: $${rank4.estimatedCostUsd}) >= Rank 3 (High-IOPS: $${rank3.estimatedCostUsd})`);
  assert(rank4.estimatedCostUsd >= rank5.estimatedCostUsd, `Rank 4 (Max Density: $${rank4.estimatedCostUsd}) >= Rank 5 (Budget Min: $${rank5.estimatedCostUsd})`);

  // Verify zero NaN / undefined in budget math
  const allBudgetsValid = ranks.every(r => Number.isFinite(r.estimatedCostUsd) && !Number.isNaN(r.estimatedCostUsd));
  assert(allBudgetsValid, 'All 5 ranks have finite, non-NaN integer/float budgets');

  // -------------------------------------------------------------
  // Test Group 3: Base Chassis SKU Retention
  // -------------------------------------------------------------
  console.log(`\n🔹 Test Group 3: Foundational Chassis SKU Retention`);
  
  ranks.forEach(r => {
    const hasBaseChassis = (r.skuPartsList || []).some(p => p.sku === 'P73282-B21' || p.category === 'Base Chassis' || p.category === 'Chassis');
    assert(hasBaseChassis, `Rank ${r.rank} (${r.title}) retains foundational base chassis`);
  });

  console.log(`\n================================================================`);
  console.log(`📊 STRATEGY MATRIX TEST SUMMARY: ${totalPasses} PASSED | ${totalFails} FAILED`);
  console.log(`================================================================\n`);

  if (totalFails > 0) {
    process.exit(1);
  }
}

runTests();
