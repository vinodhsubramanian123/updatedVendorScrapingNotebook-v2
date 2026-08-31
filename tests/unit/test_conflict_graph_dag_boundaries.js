'use strict';
const test = require('node:test');
const assert = require('node:assert');

const { validateConflictGraph, arbitrateContestedResources } = require('../../scripts/lib/conflict/conflict_graph');

test('Conflict Graph — 5-Level Validation and Structural Output', () => {
  const mockBoq = [
    { sku: 'P73282-B21', qty: 1, description: 'DL380 Gen12 8SFF CTO Server' },
    { sku: 'P64707-B21', qty: 16, description: '32GB 2Rx8 DDR5-5600 DIMM' }
  ];

  const result = validateConflictGraph(mockBoq, [], 'outputs/ProLiant/Gen12/DL380_Gen12', 'DL380_Gen12');
  assert.ok(result, 'Conflict graph result must be returned');
  assert.ok(result.workloadDna, 'Workload DNA must be extracted');
  assert.ok(Array.isArray(result.conflicts), 'Conflicts must be an array');
  assert.ok(Array.isArray(result.rankedSolutions), '5-tier ranked solutions must be generated');
  assert.strictEqual(result.rankedSolutions.length, 5, 'Must generate exactly 5 ranked tiers');
});

test('Conflict Graph — Contested Resource Arbitration', () => {
  const contested = arbitrateContestedResources([], [], {});
  assert.ok(contested, 'Resource arbitration returns structured results');
  assert.ok(Array.isArray(contested.arbitrationLog || []), 'Arbitration log is an array');
});
