'use strict';

const { test } = require('node:test');
const assert = require('node:assert');

const { synthesize5TierRankedSolutions, _clearStrategyAddonsCache } = require('../../scripts/lib/conflict/strategy_synthesizer.js');
const { optimizeForBudget } = require('../../scripts/lib/boq/budget_optimizer.js');
const { extractWorkloadDna } = require('../../scripts/lib/conflict/workload_dna.js');

test('Budget Optimizer & Tradeoff Strategy Chaos', async (t) => {

  await t.test('1. Impossible Budget Overruns (Golden Rule)', () => {
    // Customer budget is set to $5,000, but mandatory buildability fixes cost $15,000 (total $20k)
    const baseItems = [
      { sku: 'BASE-1', description: 'Server Base', quantity: 1 }
    ];
    const missingDeps = [
      { sku: 'FIX-1', description: 'Mandatory Cooling', quantity: 1, rule: 'Thermal constraint' }
    ];
    const evalResults = { missingDependencies: missingDeps };

    // Mock catalog to provide prices
    const catalogData = {
      entries: [
        { skus: [{ 'Product #': 'BASE-1', 'Unit Price (USD)': '5000' }] },
        { skus: [{ 'Product #': 'FIX-1', 'Unit Price (USD)': '15000' }] }
      ]
    };

    const budgetAnalysis = optimizeForBudget(baseItems, evalResults, 5000, catalogData);

    assert.strictEqual(budgetAnalysis.isBudgetExceeded, true, 'Budget should be exceeded');
    assert.strictEqual(budgetAnalysis.mandatoryBomCostUsd, 20000, 'Mandatory BOM cost should be 20000');
    assert.strictEqual(budgetAnalysis.budgetOverrunUsd, 15000, 'Overrun should be 15000');
    assert.ok(budgetAnalysis.goldenRuleSummary.includes('GOLDEN RULE MANDATE'), 'Golden rule mandate should be summarized');

    // Also verify synthesize5TierRankedSolutions
    const graphResults = { resolvedFixes: missingDeps };
    const tiers = synthesize5TierRankedSolutions(baseItems, evalResults, graphResults, { model: 'DL380 Gen12' });
    
    assert.strictEqual(tiers.length, 5, 'Should generate 5 tiers');
    tiers.forEach(tier => {
      const allSkus = tier.skuPartsList.map(p => p.sku);
      assert.ok(allSkus.includes('FIX-1'), `Tier ${tier.rank} must include mandatory buildability fix`);
    });
  });

});

test('Budget Optimizer & Tradeoff Strategy Chaos - Part 2', async (t) => {

  await t.test('2. Extreme Surplus Optimization', () => {
    const baseItems = [
      { sku: 'BASE-1', description: 'Server Base', quantity: 1 }
    ];
    
    // Base cost is 10k, budget is 500k. Surplus = 490k.
    const catalogData = {
      metadata: { family: 'ProLiant' },
      entries: [
        { skus: [{ 'Product #': 'BASE-1', 'Unit Price (USD)': '10000' }] }
      ]
    };
    
    // We also need to mock `fs.readFileSync` for the `loadUpgradeTemplates` function temporarily
    // to return some known upgrades for ProLiant, but let's see if the config exists natively.
    
    const budgetAnalysis = optimizeForBudget(baseItems, {}, 500000, catalogData);

    assert.strictEqual(budgetAnalysis.isBudgetExceeded, false, 'Budget should NOT be exceeded');
    assert.strictEqual(budgetAnalysis.remainingBudgetUsd, 490000, 'Remaining budget should be 490000');
    assert.ok(Array.isArray(budgetAnalysis.recommendedUpgrades), 'Recommended upgrades should be an array');
    
    // If the upgrade templates file is missing or empty in CI, it might be an empty array, 
    // but the goldenRuleSummary should reflect the surplus.
    assert.ok(budgetAnalysis.goldenRuleSummary.includes('Surplus: $490,000'), 'Golden rule summary should mention the surplus correctly');
    
    // Test that synthesizer does not hallucinate
    const tiers = synthesize5TierRankedSolutions(baseItems, {}, { resolvedFixes: [] }, { model: 'DL380 Gen12' });
    assert.strictEqual(tiers.length, 5);
    tiers.forEach(tier => {
      tier.skuPartsList.forEach(p => {
        assert.ok(p.sku && p.sku !== 'HALLUCINATED_SKU', 'SKU must not be hallucinated');
      });
    });
  });

});

test('Budget Optimizer & Tradeoff Strategy Chaos - Part 3', async (t) => {

  await t.test('3. Identical Base Cost Tradeoffs', () => {
    // When Rank 1 and Rank 5 have identical component bases (e.g. no missing deps and no addons for rank 5)
    const baseItems = [
      { sku: 'BASE-1', description: 'Server Base', quantity: 1 }
    ];
    
    // Clear cache to ensure clean run
    _clearStrategyAddonsCache();

    const tiers = synthesize5TierRankedSolutions(baseItems, {}, { resolvedFixes: [] }, { model: 'DL380 Gen12' });
    
    const rank1 = tiers.find(t => t.rank === 1);
    const rank5 = tiers.find(t => t.rank === 5);

    assert.ok(rank1, 'Rank 1 must exist');
    assert.ok(rank5, 'Rank 5 must exist');
    
    assert.notStrictEqual(rank1.name, rank5.name, 'Rank 1 and Rank 5 must have distinct names');
    
    // Check Tradeoff metrics exist
    assert.ok(rank1.tradeoffMetrics, 'Rank 1 must have tradeoff metrics');
    assert.ok(rank5.tradeoffMetrics, 'Rank 5 must have tradeoff metrics');
    
    assert.ok(rank1.tradeoffMetrics.intentAlignment, 'Rank 1 must have intentAlignment');
    assert.ok(rank5.tradeoffMetrics.intentAlignment, 'Rank 5 must have intentAlignment');
    
    assert.notStrictEqual(rank1.tradeoffMetrics.intentAlignment, rank5.tradeoffMetrics.intentAlignment, 'Intent alignments should differ');
    
    // Assert no NaNs in strings
    const r1String = JSON.stringify(rank1.tradeoffMetrics);
    const r5String = JSON.stringify(rank5.tradeoffMetrics);
    
    assert.strictEqual(r1String.includes('NaN'), false, 'Rank 1 metrics should not contain NaN');
    assert.strictEqual(r5String.includes('NaN'), false, 'Rank 5 metrics should not contain NaN');
  });

});

test('Budget Optimizer & Tradeoff Strategy Chaos - Part 4', async (t) => {

  await t.test('4. Mutually Exclusive Fix Cascades', () => {
    const baseItems = [
      { sku: 'BASE-1', description: 'Server Base', quantity: 1 }
    ];
    
    // Conflicting fixes for the same rule (e.g. storage limits)
    const missingDeps = [
      { sku: 'FIX-A', description: 'SAS Expander Card', quantity: 1, rule: 'Storage limits' },
      { sku: 'FIX-B', description: '2nd Controller', quantity: 1, rule: 'Storage limits' }
    ];
    
    const evalResults = { missingDependencies: missingDeps };
    
    // We expect the synthesizer to take these missing deps as resolvedFixes from conflictGraph if provided,
    // or from evalResults if conflictGraph didn't resolve them.
    const graphResults = { resolvedFixes: missingDeps };

    _clearStrategyAddonsCache();
    
    const tiers = synthesize5TierRankedSolutions(baseItems, evalResults, graphResults, { model: 'DL380 Gen12' });
    
    assert.strictEqual(tiers.length, 5, 'Should generate 5 tiers deterministically');
    
    // All tiers must retain the specific ordering 1 through 5
    const expectedRanks = [1, 2, 3, 4, 5];
    const actualRanks = tiers.map(t => t.rank);
    assert.deepStrictEqual(actualRanks, expectedRanks, 'Ranks must be ordered and distinct');
    
    // Check that both fixes exist in the mandatory ranks 1 and 5
    const rank1 = tiers.find(t => t.rank === 1);
    const r1Skus = rank1.skuPartsList.map(p => p.sku);
    assert.ok(r1Skus.includes('FIX-A'), 'Rank 1 must include FIX-A');
    assert.ok(r1Skus.includes('FIX-B'), 'Rank 1 must include FIX-B');
    
    const rank5 = tiers.find(t => t.rank === 5);
    const r5Skus = rank5.skuPartsList.map(p => p.sku);
    assert.ok(r5Skus.includes('FIX-A'), 'Rank 5 must include FIX-A');
    assert.ok(r5Skus.includes('FIX-B'), 'Rank 5 must include FIX-B');
  });

});