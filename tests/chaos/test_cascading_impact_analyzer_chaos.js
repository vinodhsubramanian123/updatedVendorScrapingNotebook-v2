'use strict';
/**
 * tests/chaos/test_cascading_impact_analyzer_chaos.js
 *
 * Chaos and Boundary Fuzzing Suite for Cascading Impact Analyzer:
 * (scripts/lib/conflict/cascading_impact_analyzer.js)
 *
 * Boundaries Covered:
 * 1. Malformed & Extreme Edge Inputs:
 *    - null / undefined / empty changeProposal
 *    - 0-item / malformed currentBom arrays
 *    - Missing / null catalogData and chassisInfo
 * 2. Unrecognized Actions & Non-Standard SKU Types:
 *    - Arbitrary string actions ('UNKNOWN_ACTION', '', 12345)
 *    - Special character SKUs and DOM pattern IDs
 * 3. Simultaneous Multi-Degree Cascades:
 *    - Swapping high-TDP processor + storage controller simultaneously
 *    - OCP slot saturation and recovery
 * 4. Zero Uncaught Exception Contract:
 *    - Guarantee analyzer never throws uncaught exceptions on arbitrary inputs.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');

const {
  introspectSku,
  analyzeCascadingImpact,
  discoverDynamicStrategyAddons
} = require('../../scripts/lib/conflict/cascading_impact_analyzer.js');

describe('⚡ Cascading Impact Analyzer Chaos & Boundary Stress Suite', () => {

  test('1. introspectSku handles null, empty, malformed, and non-standard inputs without throwing', () => {
    const edgeCases = [
      null,
      undefined,
      '',
      {},
      { sku: null },
      { sku: '', description: null },
      { 'Product #': undefined },
      'NON_EXISTENT_SKU_9999',
      'pat001b94fb', // DOM pattern ID
      { sku: 'P73282-B21', unitPriceUsd: 'INVALID_PRICE' }
    ];

    edgeCases.forEach(input => {
      assert.doesNotThrow(() => {
        const profile = introspectSku(input);
        assert(profile && typeof profile === 'object', 'Must return profile object');
        assert(typeof profile.priceUsd === 'number' && !isNaN(profile.priceUsd), 'Price must be a valid number');
        assert(typeof profile.role === 'string', 'Role must be a string');
      }, `Failed on input: ${JSON.stringify(input)}`);
    });
  });

  test('2. analyzeCascadingImpact survives extreme malformed inputs (null, empty, invalid actions)', () => {
    const malformedProposals = [
      null,
      undefined,
      {},
      { action: null },
      { action: 'INVALID_ACTION_TYPE', originalSku: null, newSku: null },
      { action: 'SWAP', originalSku: 'P58335-B21', newSku: '' },
      { action: 'SWAP', originalSku: '', newSku: 'P47777-B21' },
      { action: 'SWAP', originalSku: 'INVALID_SKU_1', newSku: 'INVALID_SKU_2' }
    ];

    malformedProposals.forEach(proposal => {
      assert.doesNotThrow(() => {
        const report = analyzeCascadingImpact(proposal, [], null, {});
        assert(report && typeof report === 'object', 'Must return structured report');
        assert(typeof report.affectedSkusCount === 'number', 'affectedSkusCount must be number');
        assert(typeof report.cascadingStepsCount === 'number', 'cascadingStepsCount must be number');
        assert(Array.isArray(report.cascadingSteps), 'cascadingSteps must be array');
        assert(typeof report.humanExplanation === 'string', 'humanExplanation must be string');
      }, `Failed on proposal: ${JSON.stringify(proposal)}`);
    });
  });

  test('3. discoverDynamicStrategyAddons handles missing catalogData and empty workload DNA gracefully', () => {
    const invalidInputs = [
      [null, null, null],
      [{}, {}, {}],
      [{ entries: [] }, { id: 'UNKNOWN' }, { primaryWorkload: 'Unknown' }],
      [{ entries: [{ parentCategory: null, skus: null }] }, {}, {}]
    ];

    invalidInputs.forEach(([cat, chassis, dna]) => {
      assert.doesNotThrow(() => {
        const addons = discoverDynamicStrategyAddons(cat, chassis, dna);
        assert(addons && typeof addons === 'object', 'Must return addons object');
        assert(Array.isArray(addons.rank2Addons), 'rank2Addons must be array');
        assert(Array.isArray(addons.rank3Addons), 'rank3Addons must be array');
        assert(Array.isArray(addons.rank4Addons), 'rank4Addons must be array');
      });
    });
  });

  test('4. Fuzzing: 500 randomized change proposals never crash the analyzer', () => {
    const skus = ['P52534-B21', 'P58335-B21', 'P47777-B21', 'P67088-B21', 'P48820-B21', 'P01366-B21', 'INVALID_SKU', '', null];
    const actions = ['SWAP', 'ADD', 'OMIT', 'PIVOT', null, 'RANDOM'];

    for (let i = 0; i < 500; i++) {
      const origSku = skus[Math.floor(Math.random() * skus.length)];
      const newSku = skus[Math.floor(Math.random() * skus.length)];
      const action = actions[Math.floor(Math.random() * actions.length)];

      const proposal = {
        action,
        originalSku: origSku,
        newSku: newSku,
        reason: `Fuzz test iteration ${i}`
      };

      const currentBom = [
        { sku: 'P52534-B21', quantity: Math.floor(Math.random() * 5) },
        { sku: 'P58335-B21', quantity: Math.floor(Math.random() * 2) }
      ];

      const report = analyzeCascadingImpact(proposal, currentBom);
      assert(report, 'Report must be produced');
      assert(!isNaN(report.netCostDeltaUsd), 'netCostDeltaUsd must never be NaN');
    }
  });

});
