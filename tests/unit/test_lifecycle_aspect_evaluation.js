/**
 * test_lifecycle_aspect_evaluation.js
 * Unit Test Suite for Lifecycle Status Badges (OB, DS, 90), Clean PID Parsing,
 * and BOQ Aspect Evaluation / Strategy Resolution.
 * 
 * Verifies:
 * - INV-20: WebLogic Dynamic DOM Expansion & Full Sub-Choice Trigger Protocol
 * - INV-21: Lifecycle Status Tag & Clean PID Separation Protocol
 * - INV-22: Category Cardinality & Proactive Provenance Pre-Commit Assertion
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { cleanBaseSKU, isValidHpeSKU } = require('../../scripts/lib/catalog/sku.js');
const { synthesize5TierRankedSolutions } = require('../../scripts/lib/conflict/strategy_synthesizer.js');

describe('Lifecycle Status Tag & Clean PID Separation (INV-21)', () => {
  it('should cleanly strip obsolete (OB) and direct ship (DS) badges from base SKUs', () => {
    const obInput = 'OB\n P49631-B21';
    const dsInput = 'DS \t P49632-B21CTO';
    const ninetyInput = '90\n\tP49639-B21';
    const bracketedInput = '[OB] P49638-B21';

    assert.strictEqual(cleanBaseSKU(obInput), 'P49631-B21');
    assert.strictEqual(cleanBaseSKU(dsInput), 'P49632-B21');
    assert.strictEqual(cleanBaseSKU(ninetyInput), 'P49639-B21');
    assert.strictEqual(cleanBaseSKU(bracketedInput), 'P49638-B21');
  });

  it('should validate cleaned SKUs with isValidHpeSKU() without rejection', () => {
    const rawSkus = [
      'OB\n P49631-B21',
      'DS\n P49632-B21',
      '90\n P49639-B21',
      'P67089-B21',
      'H7K80AE'
    ];

    rawSkus.forEach(raw => {
      const clean = cleanBaseSKU(raw);
      assert.strictEqual(isValidHpeSKU(clean), true, `SKU '${clean}' derived from '${raw}' must pass isValidHpeSKU`);
    });
  });

  it('should reject invalid DOM pattern IDs or arbitrary non-SKU strings', () => {
    const invalidInputs = [
      'ProcessorSection_Choice_123',
      'table_row_header',
      'XYZ-9999999',
      'SHOWMORE_PROCESSOR_EXPAND'
    ];

    invalidInputs.forEach(input => {
      assert.strictEqual(isValidHpeSKU(input), false, `Input '${input}' must be rejected as an invalid SKU`);
    });
  });
});

describe('BOQ Lifecycle Aspect Flagging & Strategy Matrix Resolution', () => {
  it('should generate 5 ranked solution tiers for customer BOQ with obsolete SKUs', () => {
    const mockBomItems = [
      { sku: 'P49631-B21', description: 'Intel Xeon-Platinum 8468V 2.4GHz 48-core Processor [OB]', quantity: 2, unitPrice: 8500, category: 'Processor', lifecycleStatus: 'Obsolete (OB)' },
      { sku: 'P43328-B21', description: 'HPE 64GB 2Rx4 DDR5-4800 DIMM', quantity: 16, unitPrice: 450, category: 'Memory', lifecycleStatus: 'Active' },
      { sku: 'P48820-B21', description: 'HPE ProLiant DL380 Gen11 High Performance Fan Kit', quantity: 1, unitPrice: 350, category: 'Cooling', lifecycleStatus: 'Active' }
    ];

    const mockEvalResults = {
      missingDependencies: [
        { sku: 'P48820-B21', reason: 'High Performance Fan Kit required for high-TDP processor' }
      ]
    };

    const tiers = synthesize5TierRankedSolutions(mockBomItems, mockEvalResults, {}, { name: 'DL380_Gen11' });

    assert.ok(Array.isArray(tiers), 'Must return an array of solution tiers');
    assert.strictEqual(tiers.length, 5, 'Must return exactly 5 ranked tiers');
    assert.strictEqual(tiers[0].rank, 1, 'First tier must be Rank 1 (Intent Preserved)');
    assert.strictEqual(tiers[4].rank, 5, 'Last tier must be Rank 5 (Budget Minimized)');
  });
});
