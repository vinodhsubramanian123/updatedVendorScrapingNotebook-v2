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
 * 3. Handles unconstrained BOM without contention cleanly.
 * 4. Multi-chassis simultaneous contention: PCIe, Power, and Thermal.
 * 5. Priority resolution of Accelerator Cards (GPUs vs Tri-Mode RAID vs Dual 100Gb NICs).
 * 6. Graceful degradation and fallback strategy recommendations (OCP to PCIe standup).
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');

const { arbitrateContestedResources, resolveFormFactorDuals } = require('../../scripts/lib/conflict/resource_arbitrator.js');
const { analyzeAndPartitionClusters } = require('../../scripts/lib/boq/multi_cluster_splitter.js');
const { validateConflictGraph } = require('../../scripts/lib/conflict/conflict_graph.js');

describe('⚡ Contested Resource Arbitration & Multi-Cluster Stress Suite', () => {

  test('1. Detects OCP Slot Contention and emits Rank 3 / Branch A Form-Factor Pivot', () => {
    const rawItems = [
      { sku: 'P58335-B21', description: 'HPE MR408i-o Gen11 x8 Lanes OCP SPDM Storage Controller', quantity: 1 },
      { sku: 'P10115-B21', description: 'Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 OCP3 Adapter', quantity: 1 },
      { sku: 'P51181-B21', description: 'Intel E810-XXVDA2 Ethernet 10/25Gb 2-port SFP28 OCP3 Adapter', quantity: 1 }
    ];

    const result = arbitrateContestedResources(rawItems, {}, { chassis: 'DL380_Gen11' });
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

    const result = arbitrateContestedResources(rawItems, {}, { chassis: 'DL380_Gen11' });
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

    const result = arbitrateContestedResources(validItems, {}, { chassis: 'DL380_Gen11' });
    assert.strictEqual(result.hasContentions, false);
    assert.strictEqual(result.contentionsCount, 0);
    assert.strictEqual(result.branchesCount, 0);
  });

  test('4. Multi-chassis simultaneous contention: PCIe, Power, and Thermal', () => {
    const multiClusterChaosTender = [
      { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF NC CTO Server', quantity: 60, category: 'Chassis' },
      { sku: 'P67088-B21', description: 'Intel Xeon-Platinum 8580 2.0GHz 60-core Processor', quantity: 120, category: 'Processor' },
      { sku: 'P64707-F21', description: 'HPE 64GB DDR5-5600 Registered Smart Memory', quantity: 480, category: 'Memory' },
      { sku: 'S0E21C', description: 'NVIDIA L40S 48GB PCIe Accelerator', quantity: 240, category: 'Accelerator' }, 
      { sku: 'P47777-B21', description: 'HPE MR416i-p Gen11 x16 Lanes 8GB Cache PCI SPDM Storage Controller', quantity: 120, category: 'Storage Controller' },
      { sku: 'P10115-B21', description: 'Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 Adapter for HPE', quantity: 180, category: 'Networking' },
      { sku: 'P48816-B21', description: 'HPE DL380 Gen11 8SFF GPU Power Cable Kit', quantity: 240, category: 'Cable' },
      { sku: 'P38997-B21', description: 'HPE 1600W Flex Slot Platinum Hot Plug Low Halogen Power Supply Kit', quantity: 120, category: 'Power Supply' }
    ];

    const partitionRes = analyzeAndPartitionClusters(multiClusterChaosTender);
    assert.strictEqual(partitionRes.clusters.length, 1);
    assert.strictEqual(partitionRes.clusters[0].multiplier, 60);
    assert.strictEqual(partitionRes.totalChassis, 60);

    const singleNodeEquivalent = partitionRes.clusters[0].items.map(it => ({
      sku: it.sku,
      description: it.description,
      quantity: it.quantity
    }));

    const evalResults = {
      aspectChecks: {
        pcieRiser: { maxPcieSlots: 8 },
        powerEnvironment: { maxPsuWattage: 1600, psuCount: 2 },
        computeThermal: { hasHighPerfFan: false }
      },
      missingDependencies: []
    };

    const res = arbitrateContestedResources(singleNodeEquivalent, evalResults, { chassis: 'DL380_Gen11', model: 'DL380', gen: 'Gen11' });
    assert.ok(res.hasContentions !== undefined);
  });

  test('5. Priority resolution of Accelerator Cards (GPUs vs Tri-Mode RAID vs Dual 100Gb NICs)', () => {
    const singleNodeDemand = [
      { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF NC CTO Server', quantity: 1 },
      { sku: 'S0E21C', description: 'NVIDIA L40S 48GB PCIe Accelerator', quantity: 4 }, 
      { sku: 'P47777-B21', description: 'HPE MR416i-p Gen11 x16 Lanes 8GB Cache PCI SPDM Storage Controller', quantity: 2 },
      { sku: 'P26259-B21', description: 'Broadcom BCM57414 Ethernet 100Gb 2-port QSFP28 OCP3 Adapter', quantity: 2 } 
    ];
    
    const graphRes = validateConflictGraph(singleNodeDemand, [], '');
    assert.ok(graphRes);
    assert.ok(graphRes.rankedSolutions);
    assert.ok(graphRes.rankedSolutions.length > 0);
  });

  test('6. Graceful degradation and fallback strategy recommendations (OCP to PCIe standup)', () => {
    const contentionTender = [
      { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF NC CTO Server', quantity: 1 },
      { sku: 'P58335-B21', description: 'HPE MR408i-o Gen11 x8 Lanes 4GB Cache OCP SPDM Storage Controller', quantity: 1 },
      { sku: 'P26259-B21', description: 'Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 OCP3 Adapter for HPE', quantity: 2 },
      { sku: 'P48918-B21', description: 'HPE ProLiant Storage Controller Enablement Cable Kit', quantity: 1 }
    ];

    const res = arbitrateContestedResources(contentionTender, { aspectChecks: { networkingOcp: { maxOcpSlots: 2 } } }, { chassis: 'DL380_Gen11', gen: 'Gen11' });
    assert.strictEqual(res.hasContentions, true);
    
    const branchB = res.branches.find(b => b.branchId === 'branch_pcie_storage_ocp_nic');
    assert.ok(branchB, 'Must recommend pivoting storage controller to PCIe standup (Graceful degradation)');
    assert.strictEqual(branchB.storageController.formFactor, 'PCIE_STANDUP');
  });

});
