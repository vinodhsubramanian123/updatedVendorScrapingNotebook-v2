'use strict';
/**
 * tests/unit/test_resource_arbitrator.js — Unit Tests for Contested Resource Arbitrator
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { arbitrateContestedResources, FORM_FACTOR_DUALS } = require('../../scripts/lib/conflict/resource_arbitrator.js');
const { validateConflictGraph } = require('../../scripts/lib/conflict/conflict_graph.js');

describe('Contested Resource Arbitrator Unit Tests', () => {

  const sampleTenderItems = [
    { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF NC CTO Server', quantity: 1 },
    { sku: 'P67088-B21', description: 'Intel Xeon-Platinum 8580 2.0GHz 60-core Processor', quantity: 2 },
    { sku: 'P64707-F21', description: 'HPE 64GB DDR5-5600 Registered Smart Memory', quantity: 8 },
    { sku: 'P58335-B21', description: 'HPE MR408i-o Gen11 x8 Lanes 4GB Cache OCP SPDM Storage Controller', quantity: 1 },
    { sku: 'P51181-B21', description: 'Broadcom BCM5719 Ethernet 1Gb 4-port BASE-T OCP3 Adapter for HPE', quantity: 1 },
    { sku: 'P10115-B21', description: 'Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 OCP3 Adapter for HPE', quantity: 1 },
    { sku: 'P26262-B21', description: 'Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 Adapter for HPE', quantity: 2 },
    { sku: 'R2E09A', description: 'HPE SN1610Q 32Gb 2-port Fibre Channel Host Bus Adapter', quantity: 2 },
    { sku: 'P48832-B21', description: 'HPE ProLiant DL380 Gen11 Tri-Mode Splitter Cable Kit', quantity: 1 }
  ];

  test('1. Detects OCP 3.0 slot contention between Storage Controller and multiple OCP NICs', () => {
    const res = arbitrateContestedResources(
      sampleTenderItems,
      { aspectChecks: { networkingOcp: { maxOcpSlots: 2 } } },
      { chassis: 'DL380_Gen11', model: 'DL380', gen: 'Gen11' }
    );

    assert.equal(res.hasContentions, true);
    assert.equal(res.contentionsCount, 1);
    assert.equal(res.contentions[0].resourceType, 'OCP_3_0_SLOTS');
    assert.equal(res.contentions[0].requestedDemands, 3);
    assert.equal(res.contentions[0].maxCapacity, 2);
  });

  test('2. Generates Branch A (OCP Storage Baseline) and Branch B (PCIe Storage + OCP NIC Retention)', () => {
    const res = arbitrateContestedResources(
      sampleTenderItems,
      { aspectChecks: { networkingOcp: { maxOcpSlots: 2 } } },
      { chassis: 'DL380_Gen11', model: 'DL380', gen: 'Gen11' }
    );

    assert.equal(res.branchesCount >= 2, true);
    const branchA = res.branches.find(b => b.branchId === 'branch_ocp_storage_baseline');
    const branchB = res.branches.find(b => b.branchId === 'branch_pcie_storage_ocp_nic');

    assert.ok(branchA, 'Branch A must exist');
    assert.equal(branchA.storageController.formFactor, 'OCP_3_0');
    assert.equal(branchA.storageController.sku, 'P58335-B21');
    assert.equal(branchA.cableKit.sku, 'P48918-B21');

    assert.ok(branchB, 'Branch B must exist');
    assert.equal(branchB.storageController.formFactor, 'PCIE_STANDUP');
    assert.equal(branchB.storageController.sku, 'P47777-B21');
    assert.equal(branchB.cableKit.sku, 'P48832-B21');
  });

  test('3. Evaluates Boot Device vs Rear Drive Cage Contention', () => {
    const bootContentionItems = [
      { sku: 'P48183-B21', description: 'HPE NS204i-u Gen11 NVMe Hot Plug Boot Optimized Storage Device', quantity: 1 },
      { sku: 'P48817-B21', description: 'HPE ProLiant DL380 Gen11 2SFF Rear Drive Cage Kit', quantity: 1 }
    ];

    const res = arbitrateContestedResources(bootContentionItems, {}, {});
    assert.equal(res.hasContentions, true);
    const bootContention = res.contentions.find(c => c.resourceType === 'REAR_CHASSIS_BAY_SPACE');
    assert.ok(bootContention);
    const branchC = res.branches.find(b => b.branchId === 'branch_pcie_boot_device');
    assert.ok(branchC);
  });

  test('4. End-to-End Conflict Graph integration populates Form-Factor Optimized tier (Rank 1 Intent Preserved)', () => {
    const graphRes = validateConflictGraph(sampleTenderItems, [], '');
    assert.ok(graphRes.arbitrationResults);
    assert.equal(graphRes.arbitrationResults.hasContentions, true);

    const ranks = graphRes.rankedSolutions;
    assert.equal(ranks.length, 5);

    const formFactorTier = ranks.find(r => r.name.includes('Contested Form-Factor Optimized') || r.name.includes('High-IOPS') || r.rank === 1);
    assert.ok(formFactorTier);

    // Form-Factor Optimized tier should reflect the PCIe Storage + OCP NIC Retention branch
    assert.ok(formFactorTier.name.includes('Contested Form-Factor Optimized') || formFactorTier.name.includes('High-IOPS') || formFactorTier.name.includes('Intent Preserved'));
    assert.ok(formFactorTier.skuPartsList.some(p => p.sku === 'P47777-B21' || (p.description && p.description.includes('MR416i-p'))));
    assert.ok(formFactorTier.skuPartsList.some(p => p.sku === 'P10115-B21'));
    assert.ok(formFactorTier.skuPartsList.some(p => p.sku === 'P48832-B21'));
  });

});
