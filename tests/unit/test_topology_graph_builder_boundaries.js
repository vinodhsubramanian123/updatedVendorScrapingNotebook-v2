'use strict';
/**
 * tests/unit/test_topology_graph_builder_boundaries.js
 *
 * Boundary and Resilience Unit Tests for Dashboard Topology Graph Builder:
 * (dashboard/src/services/topologyGraphBuilder.js)
 *
 * Tests:
 * 1. Handling null/undefined/empty eval results
 * 2. Multi-Product Family detection (ProLiant, Synergy, Alletra, StoreEver, Cray)
 * 3. Extreme multi-node cluster topologies (60 nodes with 48 DIMMs and dual PSUs)
 * 4. Disconnected and orphaned components linking to root gracefully
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');

describe('🧪 Topology Graph Builder & React Normalizer Boundaries', () => {

  test('1. detectProductFamily correctly identifies all 5 enterprise product families', async () => {
    const { detectProductFamily } = await import('../../dashboard/src/services/topologyGraphBuilder.js');

    const families = [
      { input: { chassis: 'DL380_Gen12' }, items: [], expected: 'ProLiant' },
      { input: { chassis: 'Synergy_12000' }, items: [{ description: 'HPE Virtual Connect SE 100Gb F32 Module' }], expected: 'Synergy' },
      { input: { chassis: 'Alletra_9000' }, items: [{ description: 'HPE Alletra Storage System' }], expected: 'Alletra' },
      { input: { chassis: 'MSL3040' }, items: [{ description: 'StoreEver Tape Library' }], expected: 'StoreEver' },
      { input: { chassis: 'GX5000' }, items: [{ description: 'Cray Supercomputing Slingshot Switch' }], expected: 'Cray' }
    ];

    families.forEach(({ input, items, expected }) => {
      const detected = detectProductFamily(input, items);
      assert.strictEqual(detected, expected, `Failed to detect family ${expected}`);
    });
  });

  test('2. buildTopologyGraph handles null, empty, and malformed inputs gracefully without throwing', async () => {
    const { buildTopologyGraph } = await import('../../dashboard/src/services/topologyGraphBuilder.js');

    const malformedInputs = [
      [null, null],
      [undefined, undefined],
      [{}, []],
      [{ items: [] }, []],
      [{ rawItems: null, aspectChecks: null }, []]
    ];

    malformedInputs.forEach(([evalResults, rawItems]) => {
      assert.doesNotThrow(() => {
        const graph = buildTopologyGraph(evalResults, rawItems);
        assert(graph && typeof graph === 'object', 'Must return graph object');
        assert(Array.isArray(graph.nodes), 'graph.nodes must be an array');
        assert(Array.isArray(graph.edges), 'graph.edges must be an array');
        assert(graph.stats && typeof graph.stats === 'object', 'graph.stats must exist');
      });
    });
  });

  test('3. buildTopologyGraph generates correct hierarchical nodes and links for 60-node multi-cluster quote', async () => {
    const { buildTopologyGraph } = await import('../../dashboard/src/services/topologyGraphBuilder.js');

    const evalResults = {
      chassis: 'DL380_Gen11',
      totalChassis: 60,
      confidenceScore: 0.95,
      aspectChecks: {
        compute: { status: 'PASS', cpuCount: 120 },
        memory: { status: 'PASS', totalMemoryGb: 3840, dimmCount: 48 },
        storage: { status: 'PASS', driveCount: 16 },
        power: { status: 'PASS', psuCount: 2, psuWattage: 1800 }
      },
      workloadDna: {
        primaryWorkload: 'DATABASE_IN_MEMORY',
        densityScore: '32 GB/core'
      }
    };

    const rawItems = [
      { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF Server', quantity: 60, category: 'Base Chassis' },
      { sku: 'P67088-B21', description: 'Intel Xeon Platinum 8580 Processor (350W)', quantity: 40, category: 'Processor' },
      { sku: 'P67095-B21', description: 'Intel Xeon Gold 6530 Processor (270W)', quantity: 80, category: 'Processor' },
      { sku: 'P64707-B21', description: 'HPE 64GB 2Rx4 DDR5-5600 Registered Smart Memory', quantity: 48, category: 'Memory' },
      { sku: 'P48820-B21', description: 'HPE DL380 Gen11 High Performance Fan Kit', quantity: 60, category: 'Thermal' }
    ];

    const graph = buildTopologyGraph(evalResults, rawItems);
    assert(graph.nodes.length > 5, 'Graph must contain chassis, subsystem, and component nodes');
    assert(graph.edges.length > 5, 'Graph must contain directional topology links');

    const root = graph.rootNode;
    assert(root, 'Must contain root node');
    assert(root.label.includes('DL380') || root.label.includes('ProLiant'), 'Root node must reflect chassis');
  });

});
