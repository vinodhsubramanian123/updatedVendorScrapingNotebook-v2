'use strict';
const test = require('node:test');
const assert = require('node:assert');

const { synthesize5TierRankedSolutions } = require('../../scripts/lib/conflict/strategy_synthesizer');
const { extractWorkloadDna } = require('../../scripts/lib/conflict/workload_dna');

test('Fuzzy Category & Upward Matching (INV-52) — Workload DNA Role Extraction', () => {
  const items = [
    { sku: 'P73282-B21', description: 'HPE ProLiant Compute DL380 Gen12 8SFF NC CTO Server', quantity: 1 },
    { sku: 'P64707-B21', description: 'HPE 32GB 2Rx8 DDR5-5600 Registered Smart Memory Kit', quantity: 16 },
    { sku: 'P48820-B21', description: 'HPE ProLiant DL380 Gen11 High Performance Fan Kit', quantity: 1 }
  ];

  const dna = extractWorkloadDna(items);
  assert.ok(dna, 'Workload DNA must be extracted');
  assert.strictEqual(dna.totalMemoryGb, 16 * 32, 'Must accurately compute total RAM capacity');
});

test('Fuzzy Category & Upward Matching (INV-52) — 5-Tier Strategy Rank 1 Intent Preservation', () => {
  const baseItems = [
    { sku: 'P73282-B21', description: 'DL380 Gen12 8SFF CTO Server', quantity: 1, unitPriceUsd: 5584 },
    { sku: 'P64707-B21', description: '32GB DDR5-5600 DIMM', quantity: 16, unitPriceUsd: 245 }
  ];

  const missingFixes = {
    missingDependencies: [
      { sku: 'P48820-B21', description: 'High Performance Fan Kit', quantity: 1, unitPriceUsd: 650, reason: 'Thermal Compliance' }
    ]
  };

  const ranked = synthesize5TierRankedSolutions(baseItems, missingFixes, {}, { model: 'DL380_Gen12', gen: 'Gen12' });
  assert.strictEqual(ranked.length, 5, 'Must synthesize exactly 5 ranked tiers');

  // Rank 1 must preserve customer items and inject mandatory physical compliance fixes
  const rank1 = ranked[0];
  assert.strictEqual(rank1.rank, 1);
  assert.ok(rank1.skuPartsList.some(p => p.sku === 'P73282-B21'), 'Rank 1 must include base server');
  assert.ok(rank1.skuPartsList.some(p => p.sku === 'P48820-B21'), 'Rank 1 must include injected thermal fix');
  assert.strictEqual(rank1.intentMatchRatio, 1.0, 'Rank 1 must match 100% of customer requested SKUs');

  // Rank 5 must provide minimal CapEx baseline
  const rank5 = ranked[4];
  assert.strictEqual(rank5.rank, 5);
  assert.ok(rank5.estimatedCostUsd <= rank1.estimatedCostUsd, 'Rank 5 CapEx must be less than or equal to Rank 1');
});
