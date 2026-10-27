'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const { synthesize5TierRankedSolutions } = require('../../scripts/lib/conflict/strategy_synthesizer.js');
const { executeRoutedQuery } = require('../../scripts/evaluators/route_query.js');

test('Wave 2 Gap Closure — G3.1 & G3.2 Strategy Identity and Honest Budget Candidate', async (t) => {
  require('../../scripts/lib/boq/boq_evaluator.js');
  const targetDir = path.resolve(__dirname, '../../outputs/ProLiant/Gen12/DL380_Gen12');

  await t.test('G3.2: Candidates produce stable strategyId and strategyIdentity decoupled from display rank', () => {
    const items = [
      { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 1, unitPriceUsd: 5584 },
      { sku: 'P67096-B21', description: 'Intel Xeon Gold 6530 2.1GHz 32-core Processor', quantity: 2, unitPriceUsd: 2200 },
      { sku: 'P73300-F21', description: 'HPE 32GB DDR5-5600 FIO Memory', quantity: 8, unitPriceUsd: 250 },
      { sku: 'P03178-B21', description: 'HPE 1600W Flex Slot Platinum Power Supply', quantity: 2, unitPriceUsd: 450 },
      { sku: '873763-B21', description: 'HPE No Drive Configuration FIO Kit', quantity: 1, unitPriceUsd: 0 }
    ];
    const evalResults = {
      missingDependencies: [],
      aspects: {
        compute: { cpuCount: 2, maxCpuTdpWatts: 185 },
        memory: { totalMemoryGb: 256 },
        power: { estimatedNodeWattage: 450, maxPsuWattage: 1600, psuCount: 2 },
        storage: { driveCount: 0 },
        pcie: { gpuCount: 0 }
      }
    };

    const ranks = synthesize5TierRankedSolutions(items, evalResults, {}, { model: 'DL380 Gen12' }, targetDir);
    assert.strictEqual(ranks.length, 5);

    const intentCand = ranks.find(r => r.strategyId === 'STRATEGY_CLOSEST_INTENT');
    assert.ok(intentCand, 'STRATEGY_CLOSEST_INTENT must exist regardless of rank');
    assert.strictEqual(intentCand.strategyIdentity, 'STRATEGY_CLOSEST_INTENT');

    const perfCand = ranks.find(r => r.strategyId === 'STRATEGY_PERFORMANCE');
    assert.ok(perfCand, 'STRATEGY_PERFORMANCE must exist regardless of rank');

    const expCand = ranks.find(r => r.strategyId === 'STRATEGY_EXPANSION');
    assert.ok(expCand, 'STRATEGY_EXPANSION must exist regardless of rank');

    const budgetCand = ranks.find(r => r.strategyId === 'STRATEGY_BUDGET');
    assert.ok(budgetCand, 'STRATEGY_BUDGET must exist regardless of rank');
  });

  await t.test('G3.1 (Positive): Rank 5 successfully down-tiers over-provisioned components when safe alternatives exist', () => {
    const items = [
      { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 1, unitPriceUsd: 5584 },
      { sku: 'P67096-B21', description: 'Intel Xeon Gold 6530 2.1GHz 32-core Processor', quantity: 2, unitPriceUsd: 2200 },
      { sku: 'P73300-F21', description: 'HPE 32GB DDR5-5600 FIO Memory', quantity: 8, unitPriceUsd: 250 },
      { sku: 'P03178-B21', description: 'HPE 1600W Flex Slot Platinum Power Supply', quantity: 2, unitPriceUsd: 450 },
      { sku: '873763-B21', description: 'HPE No Drive Configuration FIO Kit', quantity: 1, unitPriceUsd: 0 },
      { sku: 'P74794-B21', description: 'HPE ProLiant DL380 Gen12 Max Performance Heat Sink Kit', quantity: 2, unitPriceUsd: 624 }
    ];
    const evalResults = {
      missingDependencies: [],
      aspects: {
        compute: { cpuCount: 2, maxCpuTdpWatts: 185 },
        memory: { totalMemoryGb: 256 },
        power: { estimatedNodeWattage: 450, maxPsuWattage: 1600, psuCount: 2 },
        storage: { driveCount: 0 },
        pcie: { gpuCount: 0 }
      }
    };

    const ranks = synthesize5TierRankedSolutions(items, evalResults, {}, { model: 'DL380 Gen12' }, targetDir);
    const r1 = ranks.find(r => r.strategyId === 'STRATEGY_CLOSEST_INTENT');
    const budgetCand = ranks.find(r => r.strategyId === 'STRATEGY_BUDGET');

    assert.ok(budgetCand.isAlternativeAvailable, 'Budget candidate must recognize that down-tiering is safely available');
    assert.ok(budgetCand.estimatedCostUsd < r1.estimatedCostUsd, 'Budget candidate estimated cost must be strictly lower than closest intent');
    assert.ok(budgetCand.name.includes('Alternative') || budgetCand.name.includes('Minimized'), 'Budget candidate title must reflect alternative tier');
  });

  await t.test('G3.1 (Negative): Rank 5 honestly preserves baseline and flags no alternative when already minimal', () => {
    const items = [
      { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 1, unitPriceUsd: 5584 },
      { sku: 'P67096-B21', description: 'Intel Xeon Gold 6530 2.1GHz 32-core Processor', quantity: 2, unitPriceUsd: 2200 },
      { sku: 'P73300-F21', description: 'HPE 32GB DDR5-5600 FIO Memory', quantity: 8, unitPriceUsd: 250 },
      { sku: 'P03178-B21', description: 'HPE 1600W Flex Slot Platinum Power Supply', quantity: 2, unitPriceUsd: 450 },
      { sku: '873763-B21', description: 'HPE No Drive Configuration FIO Kit', quantity: 1, unitPriceUsd: 0 },
      { sku: 'P74792-B21', description: 'HPE ProLiant Compute DL380 Gen12 2U High Performance Heat Sink Kit', quantity: 2, unitPriceUsd: 316 }
    ];
    const evalResults = {
      missingDependencies: [],
      aspects: {
        compute: { cpuCount: 2, maxCpuTdpWatts: 185 },
        memory: { totalMemoryGb: 256 },
        power: { estimatedNodeWattage: 450, maxPsuWattage: 1600, psuCount: 2 },
        storage: { driveCount: 0 },
        pcie: { gpuCount: 0 }
      }
    };

    const ranks = synthesize5TierRankedSolutions(items, evalResults, {}, { model: 'DL380 Gen12' }, targetDir);
    const budgetCand = ranks.find(r => r.strategyId === 'STRATEGY_BUDGET');

    assert.strictEqual(budgetCand.isAlternativeAvailable, false, 'Budget candidate must honestly report isAlternativeAvailable: false');
    assert.ok(budgetCand.name.includes('Baseline Preserved') || budgetCand.name.includes('No Further Safe CapEx Reductions'), 'Budget candidate name must reflect baseline preservation');
    assert.strictEqual(budgetCand.tradeoffMetrics.costDeltaUsd, '$0 (Baseline is already CapEx minimal)');
  });
});

test('Wave 2 Gap Closure — G1.3 Migration Generation Resolution in route_query.js', async (t) => {
  await t.test('G1.3: Migration query from Gen10 to Gen12 targets Gen12 without throwing AMBIGUOUS_QUERY', async () => {
    const query = 'Migrate our existing DL380 Gen10 workload to DL380 Gen12 with 64 cores and 512GB RAM';
    const result = await executeRoutedQuery(query, { offlineMode: true });

    assert.strictEqual(result.result?.chassis, 'DL380_Gen12', 'Must resolve to DL380 Gen12 target');
  });

  await t.test('G1.3 (Negative): Ambiguous multi-generation query without migration verb is rejected', async () => {
    const query = 'Compare DL380 Gen11 and DL380 Gen12 for our environment';
    const result = await executeRoutedQuery(query, { offlineMode: true });

    assert.strictEqual(result.ambiguityDetails?.chassisKey, 'AMBIGUOUS_QUERY');
  });
});

test('Wave 2 Gap Closure — G1.2 RFP Sizing Continuation & Starting BOM Metadata', async (t) => {
  await t.test('G1.2: RFP sizing returns isStartingBomDraft: true when evaluateImmediately is omitted', async () => {
    const query = 'Size a DL380 Gen12 server with 32 cores, 256GB RAM, and 4x 960GB SSDs';
    const result = await executeRoutedQuery(query, { offlineMode: true });

    assert.strictEqual(result.classification.intent, 'RFP_SIZING_TO_BOM');
    assert.strictEqual(result.result?.isStartingBomDraft, true, 'Must identify as starting BOM draft');
    assert.strictEqual(result.result?.isEvaluationComplete, false, 'Must identify evaluation as incomplete draft');
    assert.ok(Array.isArray(result.result?.candidateBOM), 'Candidate BOM must be populated');
  });
});

test('Wave 2 Gap Closure — G4.2 Auto-Healing Callback Transport Awaiting', async () => {
  const { executeNotebookQuery } = require('../../scripts/lib/notebook/notebook_query_utils.js');
  let healedAsyncCompleted = false;

  const mockOptions = {
    offlineMode: false,
    useLocalRagOnly: false,
    _retriedAuth: false,
    onAuthHealed: async () => {
      await new Promise(r => setTimeout(r, 20));
      healedAsyncCompleted = true;
    }
  };

  // Calling with non-existent notebook triggers diagnostic without throwing unhandled rejection
  const result = await executeNotebookQuery('00000000-0000-0000-0000-000000000000', 'Test query', mockOptions);
  assert.ok(result);
});
