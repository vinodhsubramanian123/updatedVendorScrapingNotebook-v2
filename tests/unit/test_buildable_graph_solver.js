'use strict';
/**
 * tests/unit/test_buildable_graph_solver.js
 * Unit tests for Wave C Typed SKU Hypergraph, N-Node Cycle Detection & Bounded CSP Solver.
 */

const assert = require('assert');
const {
  EDGE_TYPES,
  buildConfigurationHypergraph,
  detectHypergraphCycles,
  solveBuildableConfiguration
} = require('../../scripts/lib/conflict/buildable_graph_solver.js');

let passed = 0;
function test(name, fn) {
  fn();
  console.log(`  PASS: ${name}`);
  passed++;
}

console.log('=== WAVE C BUILDABLE GRAPH SOLVER TEST SUITE ===');

test('Detects arbitrary 3-node directed dependency cycles (A -> B -> C -> A)', () => {
  const g = {
    nodes: [{ id: 'SKU:A' }, { id: 'SKU:B' }, { id: 'SKU:C' }],
    edges: [
      { type: EDGE_TYPES.REQUIRES, from: 'SKU:A', to: 'SKU:B' },
      { type: EDGE_TYPES.REQUIRES, from: 'SKU:B', to: 'SKU:C' },
      { type: EDGE_TYPES.REQUIRES, from: 'SKU:C', to: 'SKU:A' }
    ]
  };
  const res = detectHypergraphCycles(g);
  assert.strictEqual(res.hasCycles, true);
  assert.ok(res.cycles[0].length >= 4);
});

test('Detects REQUIRES + EXCLUDES contradiction cleanly', () => {
  const g = buildConfigurationHypergraph(
    [{ sku: 'P10001-B21', description: 'NIC', quantity: 1 }],
    null,
    {
      missingRequirements: [{ sourceSku: 'P10001-B21', requiredSku: 'P20002-B21' }],
      violations: [{ ruleType: 'MUTUAL_EXCLUSION', skus: ['P10001-B21', 'P20002-B21'], message: 'Conflict' }]
    }
  );
  const res = detectHypergraphCycles(g);
  assert.strictEqual(res.contradictions.length, 1);
});

test('Solves fixpoint dependency closure and re-validates repaired BOM to BUILDABLE', () => {
  const mockValidate = (parts) => {
    const hasCable = parts.some(p => p.sku === 'P48832-B21');
    return hasCable
      ? { isMathClean: true, errors: [], missingDependencies: [] }
      : {
          isMathClean: false,
          errors: [],
          missingDependencies: [{ key: 'CTRL_CABLE', sku: 'P48832-B21', description: 'Cable Kit', quantity: 1 }]
        };
  };
  const res = solveBuildableConfiguration(
    [{ sku: 'P47777-B21', description: 'HPE MR416i-p PCIe Controller', quantity: 1 }],
    { validateFn: mockValidate, chassisInfo: { model: 'DL380 Gen11' } }
  );
  assert.strictEqual(res.status, 'BUILDABLE');
  assert.strictEqual(res.isBuildable, true);
  assert.strictEqual(res.repairsApplied.length, 1);
  assert.ok(res.parts.some(p => p.sku === 'P48832-B21'));
});

test('Rejects buildability when lifecycle blocker (OB/EOL) remains in BOM', () => {
  const catalogData = {
    entries: [
      {
        parentCategory: 'Processor',
        subCategory: 'Processor',
        skus: [{ 'Product #': 'P99999-B21', Description: 'Legacy CPU', 'Lifecycle Status': 'OB' }]
      }
    ]
  };
  const res = solveBuildableConfiguration(
    [{ sku: 'P99999-B21', description: 'Legacy CPU', quantity: 2 }],
    { catalogData, validateFn: () => ({ isMathClean: true, errors: [], missingDependencies: [] }) }
  );
  assert.strictEqual(res.isBuildable, false);
  assert.strictEqual(res.lifecycleBlockers.length, 1);
});

test('Terminates CYCLE_DETECTED cleanly when validator re-requests a previously seen cycle edge', () => {
  const res = solveBuildableConfiguration(
    [{ sku: 'A-B21', description: 'Node A', quantity: 1 }],
    {
      extraDependencyEdges: [
        { type: EDGE_TYPES.REQUIRES, from: 'SKU:A-B21', to: 'SKU:B-B21' },
        { type: EDGE_TYPES.REQUIRES, from: 'SKU:B-B21', to: 'SKU:A-B21' }
      ],
      validateFn: () => ({ isMathClean: true, errors: [], missingDependencies: [] })
    }
  );
  assert.strictEqual(res.status, 'CYCLE_DETECTED');
  assert.strictEqual(res.isBuildable, false);
});

console.log(`\nSUMMARY: ${passed} passed, 0 failed`);
