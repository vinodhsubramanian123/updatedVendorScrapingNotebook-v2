'use strict';
/**
 * tests/chaos/test_contested_resource_arbitration_stress.js
 *
 * Chaos & Boundary Stress Suite for Cross-Subsystem Contested Resource Arbitrator:
 * (scripts/lib/conflict/resource_arbitrator.js)
 *
 * Tests:
 * 1. OCP 3.0 Slot Contention & Form-Factor Pivot to PCIe standup (INV-39).
 * 2. Rear Bay space contention between NS204i-u boot device and rear 2SFF cage.
 * 3. Extreme high-demand BOM with 3 OCP adapters and dual storage controllers.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');

const { arbitrateContestedResources, resolveFormFactorDuals } = require('../../scripts/lib/conflict/resource_arbitrator.js');

describe('⚡ Contested Resource Arbitration & Multi-Cluster Stress Suite', () => {

  test('1. Detects OCP Slot Contention and emits Rank 3 / Branch A Form-Factor Pivot', () => {
    const rawItems = [
      { sku: 'P58335-B21', description: 'HPE MR408i-o Gen11 x8 Lanes OCP SPDM Storage Controller', quantity: 1 },
      { sku: 'P10115-B21', description: 'Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 OCP3 Adapter', quantity: 1 },
      { sku: 'P51181-B21', description: 'Intel E810-XXVDA2 Ethernet 10/25Gb 2-port SFP28 OCP3 Adapter', quantity: 1 }
    ];

    const result = arbitrateContestedResources(rawItems, 'DL380_Gen11');
    assert.strictEqual(result.hasContentions, true, 'Must detect resource contention');
    assert.strictEqual(result.contentionsCount >= 1, true, 'At least 1 contention detected');

    const ocpContention = result.contentions.find(c => c.resourceType === 'OCP_3_0_SLOTS');
    assert(ocpContention, 'Must identify OCP_3_0_SLOTS contention');
    assert.strictEqual(ocpContention.maxCapacity, 2);
    assert.strictEqual(ocpContention.requestedDemands, 3);

    const branch = result.branches.find(b => b.branchId === 'branch_pcie_storage_ocp_nic');
    assert(branch, 'Must synthesize branch_pcie_storage_ocp_nic');
    assert.strictEqual(branch.substitutions[0].injectedSku, 'P47777-B21', 'Must pivot to MR416i-p');
  });

  test('2. Detects Rear Chassis Bay Space Contention and pivots to PCIe boot device', () => {
    const rawItems = [
      { sku: 'P12965-B21', description: 'HPE NS204i-u Gen11 NVMe Hot Plug Boot Device', quantity: 1 },
      { sku: 'P48803-B21', description: 'HPE ProLiant DL380 Gen11 2SFF Rear Drive Cage Kit', quantity: 1 }
    ];

    const result = arbitrateContestedResources(rawItems, 'DL380_Gen11');
    assert.strictEqual(result.hasContentions, true);
    const rearContention = result.contentions.find(c => c.resourceType === 'REAR_CHASSIS_BAY_SPACE');
    assert(rearContention, 'Must identify REAR_CHASSIS_BAY_SPACE contention');
    const bootBranch = result.branches.find(b => b.branchId === 'branch_pcie_boot_device');
    assert(bootBranch, 'Must synthesize branch_pcie_boot_device');
  });

  test('3. Handles unconstrained BOM without contention cleanly', () => {
    const validItems = [
      { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF Server', quantity: 1 },
      { sku: 'P67088-B21', description: 'Intel Xeon Platinum 8580 Processor', quantity: 2 },
      { sku: 'P64707-B21', description: 'HPE 64GB DDR5 Smart Memory', quantity: 16 }
    ];

    const result = arbitrateContestedResources(validItems, 'DL380_Gen11');
    assert.strictEqual(result.hasContentions, false);
    assert.strictEqual(result.contentionsCount, 0);
    assert.strictEqual(result.branchesCount, 0);
  });

});
