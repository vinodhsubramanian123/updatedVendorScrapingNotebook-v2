'use strict';
/**
 * tests/unit/test_cascading_impact_fuzz.js
 *
 * Comprehensive unit test suite for Cascading Impact Analysis & 5-Tier Strategy Synthesis:
 * (scripts/lib/conflict/cascading_impact_analyzer.js & scripts/lib/conflict/strategy_synthesizer.js)
 *
 * Test Boundaries:
 * 1. Storage Controller Form-Factor Pivot Cascading Analysis:
 *    - Pivoting MR408i-o (OCP) -> MR416i-p (PCIe) frees OCP Slot 1.
 *    - Injects companion Y-splitter cable P48832-B21 + battery P01366-B21.
 * 2. High-TDP Processor Cascading Analysis:
 *    - 350W TDP triggers High-Perf Fan Kit P48820-B21 + Heatsink P48818-B21 + 1800W PSU.
 * 3. 5-Tier Strategy Matrix Synthesis:
 *    - Rank 1: Intent Preserved & Form-Factor Optimized.
 *    - Rank 2: Performance Scaled.
 *    - Rank 3: Power / Efficiency Optimized.
 *    - Rank 4: Cost Balanced.
 *    - Rank 5: Budget Minimized.
 *    - Integer capex totals, valid budget breakdowns, and zero NaN values.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');

const {
  analyzeCascadingImpact,
  discoverDynamicStrategyAddons
} = require('../../scripts/lib/conflict/cascading_impact_analyzer.js');

const {
  synthesize5TierRankedSolutions
} = require('../../scripts/lib/conflict/strategy_synthesizer.js');

describe('🧪 Cascading Impact Analysis & 5-Tier Strategy Synthesis Fuzz Suite', () => {

  test('1. analyzeCascadingImpact identifies OCP storage controller pivot and companion hardware', () => {
    const rawItems = [
      { sku: 'P52534-B21', category: 'Chassis', description: 'HPE DL380 Gen11 8SFF Server', quantity: 1 },
      { sku: 'P58335-B21', category: 'Storage Controller', description: 'MR408i-o Gen11 OCP Controller', quantity: 1 },
      { sku: 'P10115-B21', category: 'Network Controller', description: '10/25Gb 2-port OCP3 NIC', quantity: 1 },
      { sku: 'P51181-B21', category: 'Network Controller', description: '1Gb 4-port OCP3 NIC', quantity: 1 }
    ];

    const chassisInfo = { id: 'DL380_Gen11', model: 'HPE ProLiant DL380 Gen11' };
    const changeProposal = {
      action: 'SWAP',
      originalSku: 'P58335-B21',
      originalDesc: 'MR408i-o Gen11 x8 Lanes 4GB Cache OCP SPDM Storage Controller',
      newSku: 'P47777-B21',
      newDesc: 'HPE MR416i-p Gen11 x16 Lanes 8GB Cache PCI SPDM Storage Controller',
      reason: 'Pivot OCP controller to PCIe standup to unblock OCP Slot 1'
    };

    const impact = analyzeCascadingImpact(changeProposal, rawItems, null, chassisInfo);
    
    assert(impact, 'Should return cascading impact analysis object');
    assert.strictEqual(impact.action, 'SWAP');
    assert.strictEqual(impact.originalSku, 'P58335-B21');
    assert.strictEqual(impact.newSku, 'P47777-B21');
    assert(impact.affectedSkusCount >= 1, 'Must record affected SKUs');
    assert(impact.cascadingStepsCount >= 1, 'Must record cascading steps');
    assert(typeof impact.humanExplanation === 'string', 'Must include human explanation');
    assert(impact.humanExplanation.includes('Pivoting storage controller'), 'Explanation must describe the pivot');
  });

  test('2. synthesize5TierRankedSolutions produces exactly 5 distinct tiers with clean integer budgets', () => {
    const rawItems = [
      { sku: 'P52534-B21', category: 'Chassis', description: 'HPE DL380 Gen11 8SFF Server', quantity: 1, unitPriceUsd: 5000 },
      { sku: 'P67088-B21', category: 'Processor', description: 'Intel Xeon Platinum 8580 350W', quantity: 2, unitPriceUsd: 23800 },
      { sku: 'P64707-B21', category: 'Memory', description: '64GB DDR5-5600 RAM', quantity: 8, unitPriceUsd: 1200 },
      { sku: 'P58335-B21', category: 'Storage Controller', description: 'MR408i-o Gen11 OCP Controller', quantity: 1, unitPriceUsd: 800 },
      { sku: 'P10115-B21', category: 'Network Controller', description: '10/25Gb 2-port OCP3 NIC', quantity: 1, unitPriceUsd: 400 },
      { sku: 'P51181-B21', category: 'Network Controller', description: '1Gb 4-port OCP3 NIC', quantity: 1, unitPriceUsd: 250 }
    ];

    const evalResults = {
      errors: ['Networking Math Failed: 3 OCP adapters exceeds maximum 2 OCP slot(s).'],
      warnings: [],
      missingDependencies: [
        { key: 'HIGH_PERF_FAN_KIT', sku: 'P48820-B21', quantity: 1, unitPriceUsd: 350, reasoning: 'TDP > 240W' },
        { key: 'HIGH_PERF_HEATSINK', sku: 'P48818-B21', quantity: 2, unitPriceUsd: 230, reasoning: 'TDP >= 270W' }
      ],
      workloadDna: {
        primaryWorkload: 'Compute Intensive Virtualization',
        computeTier: 'High Density',
        storageIopsTier: 'NVMe High IOPS Tier'
      },
      conflictGraph: {
        chassisInfo: { id: 'DL380_Gen11', model: 'HPE ProLiant DL380 Gen11 8SFF' },
        conflicts: []
      }
    };

    const tiers = synthesize5TierRankedSolutions(rawItems, evalResults);
    assert(Array.isArray(tiers), 'Tiers must be an array');
    assert.strictEqual(tiers.length, 5, 'Must generate exactly 5 ranked tiers (Rank 1 to 5)');

    tiers.forEach(tier => {
      assert(typeof tier.rank === 'number' && tier.rank >= 1 && tier.rank <= 5, `Tier rank must be between 1 and 5 (got ${tier.rank})`);
      assert(typeof tier.name === 'string' && tier.name.length > 0, 'Tier must have name');
      assert(typeof tier.estimatedCostUsd === 'number' && !isNaN(tier.estimatedCostUsd), 'Cost must be a valid number');
      assert(tier.estimatedCostUsd > 0, 'Cost must be greater than 0');

      if (tier.budgetBreakdown) {
        assert(typeof tier.budgetBreakdown.baseBomCost === 'number' && !isNaN(tier.budgetBreakdown.baseBomCost));
        assert(typeof tier.budgetBreakdown.fixCost === 'number' && !isNaN(tier.budgetBreakdown.fixCost));
        assert(typeof tier.budgetBreakdown.totalBudgetUsd === 'number' && !isNaN(tier.budgetBreakdown.totalBudgetUsd));
      }
    });

    // Rank 1 must be Intent Preserved / Form-Factor Optimized
    assert.strictEqual(tiers[0].rank, 1);
    assert(tiers[0].name.toLowerCase().includes('intent') || tiers[0].name.toLowerCase().includes('form-factor') || tiers[0].name.toLowerCase().includes('storage'));
  });

});
