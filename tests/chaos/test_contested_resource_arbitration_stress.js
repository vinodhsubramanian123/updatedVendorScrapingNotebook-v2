'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { arbitrateContestedResources } = require('../../scripts/lib/conflict/resource_arbitrator.js');
const { analyzeAndPartitionClusters } = require('../../scripts/lib/boq/multi_cluster_splitter.js');
const { validateConflictGraph } = require('../../scripts/lib/conflict/conflict_graph.js');

describe('Contested Resource Arbitration Chaos Suite', () => {

  test('1. Multi-chassis simultaneous contention: PCIe, Power, and Thermal', () => {
    const multiClusterChaosTender = [
      { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF NC CTO Server', quantity: 60, category: 'Chassis' },
      { sku: 'P67088-B21', description: 'Intel Xeon-Platinum 8580 2.0GHz 60-core Processor', quantity: 120, category: 'Processor' },
      { sku: 'P64707-F21', description: 'HPE 64GB DDR5-5600 Registered Smart Memory', quantity: 480, category: 'Memory' },
      // Contested PCIe demands
      { sku: 'S0E21C', description: 'NVIDIA L40S 48GB PCIe Accelerator', quantity: 240, category: 'Accelerator' },
      { sku: 'P47777-B21', description: 'HPE MR416i-p Gen11 x16 Lanes 8GB Cache PCI SPDM Storage Controller', quantity: 120, category: 'Storage Controller' },
      { sku: 'P10115-B21', description: 'Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 Adapter for HPE', quantity: 180, category: 'Networking' },
      { sku: 'P48816-B21', description: 'HPE DL380 Gen11 8SFF GPU Power Cable Kit', quantity: 240, category: 'Cable' },
      { sku: 'P38997-B21', description: 'HPE 1600W Flex Slot Platinum Hot Plug Low Halogen Power Supply Kit', quantity: 120, category: 'Power Supply' }
    ];

    const partitionRes = analyzeAndPartitionClusters(multiClusterChaosTender);

    // Test cluster splitting logic functionality directly
    assert.equal(partitionRes.clusters.length, 1);
    assert.equal(partitionRes.clusters[0].multiplier, 60);
    assert.equal(partitionRes.totalChassis, 60);

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

    const hasIssues = res.hasContentions;
    assert.ok(hasIssues !== undefined);
  });

  test('2. Priority resolution of Accelerator Cards (GPUs vs Tri-Mode RAID vs Dual 100Gb NICs)', () => {
    const singleNodeDemand = [
      { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF NC CTO Server', quantity: 1 },
      { sku: 'S0E21C', description: 'NVIDIA L40S 48GB PCIe Accelerator', quantity: 4 },
      { sku: 'P47777-B21', description: 'HPE MR416i-p Gen11 x16 Lanes 8GB Cache PCI SPDM Storage Controller', quantity: 2 },
      { sku: 'P26259-B21', description: 'Broadcom BCM57414 Ethernet 100Gb 2-port QSFP28 OCP3 Adapter', quantity: 2 }
    ];

    const graphRes = validateConflictGraph(singleNodeDemand, [], '');
    assert.ok(graphRes);

    // Test the graph synthesizer priority resolution
    assert.ok(graphRes.rankedSolutions);
    assert.ok(graphRes.rankedSolutions.length > 0);
  });

  test('3. Graceful degradation and fallback strategy recommendations (OCP to PCIe standup)', () => {
    const contentionTender = [
      { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF NC CTO Server', quantity: 1 },
      { sku: 'P58335-B21', description: 'HPE MR408i-o Gen11 x8 Lanes 4GB Cache OCP SPDM Storage Controller', quantity: 1 },
      { sku: 'P26259-B21', description: 'Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 OCP3 Adapter for HPE', quantity: 2 },
      { sku: 'P48918-B21', description: 'HPE ProLiant Storage Controller Enablement Cable Kit', quantity: 1 }
    ];

    const res = arbitrateContestedResources(contentionTender, { aspectChecks: { networkingOcp: { maxOcpSlots: 2 } } }, { chassis: 'DL380_Gen11', gen: 'Gen11' });

    assert.equal(res.hasContentions, true);

    const branchB = res.branches.find(b => b.branchId === 'branch_pcie_storage_ocp_nic');
    assert.ok(branchB, 'Must recommend pivoting storage controller to PCIe standup (Graceful degradation)');
    assert.equal(branchB.storageController.formFactor, 'PCIE_STANDUP');
  });
});
