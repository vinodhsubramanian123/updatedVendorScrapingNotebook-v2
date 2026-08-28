'use strict';
/**
 * tests/chaos/test_contested_resource_arbitration_chaos.js — Adversarial Chaos Suite for Resource Arbitrator
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { arbitrateContestedResources } = require('../../scripts/lib/conflict/resource_arbitrator.js');
const { validateConflictGraph } = require('../../scripts/lib/conflict/conflict_graph.js');

describe('Contested Resource Arbitration Chaos & Adversarial Suite', () => {

  test('1. Extreme OCP Over-Subscription Fuzzing (5 competing OCP adapters)', () => {
    const extremeOcpItems = [
      { sku: 'P58335-B21', description: 'HPE MR408i-o Storage Controller', quantity: 2 },
      { sku: 'P51181-B21', description: 'Broadcom 1Gb 4-port BASE-T OCP3 Adapter', quantity: 1 },
      { sku: 'P10115-B21', description: 'Broadcom 10/25Gb 2-port SFP28 OCP3 Adapter', quantity: 2 },
      { sku: 'P42041-B21', description: 'Mellanox MCX6314 10/25GbE 2p SFP28 OCP3 Adapter', quantity: 1 }
    ];

    const res = arbitrateContestedResources(extremeOcpItems, { aspectChecks: { networkingOcp: { maxOcpSlots: 2 } } }, {});
    assert.equal(res.hasContentions, true);
    assert.equal(res.contentions[0].requestedDemands >= 5, true);
    assert.ok(res.branches.length > 0);
  });

  test('2. Missing Descriptions & Dirty SKUs Resilience', () => {
    const dirtyItems = [
      { sku: 'P58335-B21  0D1', description: '', quantity: 1 },
      { sku: 'P10115-B21', description: null, quantity: 1 },
      { sku: 'UNKNOWN-SKU', description: 'HPE OCP 3.0 Adapter', quantity: 1 }
    ];

    // Must not throw unhandled exception
    assert.doesNotThrow(() => {
      const res = arbitrateContestedResources(dirtyItems, {}, {});
      assert.ok(res);
    });
  });

  test('3. Cross-Chassis Generality (DL380 Gen12, Alletra, Synergy)', () => {
    const chassisVariants = [
      { chassis: 'DL380_Gen12_SFF', model: 'DL380', gen: 'Gen12' },
      { chassis: 'Alletra_Storage_System', family: 'Alletra', model: 'Alletra 9000' },
      { chassis: 'SY100Gb_F32_Module', family: 'Synergy', model: 'Synergy 12000' }
    ];

    const items = [
      { sku: 'P58335-B21', description: 'HPE MR408i-o Storage Controller', quantity: 1 },
      { sku: 'P10115-B21', description: 'Broadcom 10/25Gb OCP3 Adapter', quantity: 1 },
      { sku: 'P51181-B21', description: 'Broadcom 1Gb OCP3 Adapter', quantity: 1 }
    ];

    chassisVariants.forEach(c => {
      const res = arbitrateContestedResources(items, { aspectChecks: { networkingOcp: { maxOcpSlots: 2 } } }, c);
      assert.equal(res.hasContentions, true);
      assert.ok(res.branches.length >= 2);
    });
  });

  test('4. Empty and Single-Item BOQs Return Graceful Defaults', () => {
    const emptyRes = arbitrateContestedResources([], {}, {});
    assert.equal(emptyRes.hasContentions, false);
    assert.equal(emptyRes.contentionsCount, 0);
    assert.equal(emptyRes.branchesCount, 0);

    const singleRes = arbitrateContestedResources([{ sku: 'P52534-B21', description: 'Chassis' }], {}, {});
    assert.equal(singleRes.hasContentions, false);
  });

});
