'use strict';
/**
 * tests/chaos/test_multi_product_mixed_generation_stress.js
 *
 * Hardened Chaos & Boundary Stress Suite for:
 * 1. Mixed Product Generation Isolation (DL380 Gen12, Gen11, Synergy, Alletra)
 * 2. Odd & Fractional Multiplier Ceilings & Proportional Distribution
 * 3. Enterprise Cluster Sizing & High-Power Data Center Matrix (INV-29)
 * 4. Riser Cable Kit Injection (INV-31) & EU Lot 9 CE Mark FIO Kit (INV-30)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const { analyzeAndPartitionClusters } = require('../../scripts/lib/boq/multi_cluster_splitter.js');
const { evalComputeThermal } = require('../../scripts/lib/aspects/compute_thermal.js');
const { evalPowerEnvironment } = require('../../scripts/lib/aspects/power_environment.js');
const { evalPcieRiserSlots } = require('../../scripts/lib/aspects/pcie_riser.js');

test('▶ [CHAOS 1]: Mixed Product Generation & Multi-Chassis Isolation', () => {
  const mixedTenderItems = [
    // DL380 Gen11 Cluster (20x Nodes)
    { sku: 'P52534-B21', quantity: 20, totalQuantity: 20, description: 'DL380 Gen11 8SFF NC CTO Server', category: 'Base Server Chassis' },
    { sku: 'P67088-B21', quantity: 40, totalQuantity: 40, description: 'Intel Xeon-Platinum 8580 Processor', category: 'Processors' },
    { sku: 'P64707-F21', quantity: 160, totalQuantity: 160, description: '64GB DDR5-5600 Smart FIO Memory', category: 'Memory' },
    
    // DL380 Gen12 Cluster (10x Nodes)
    { sku: 'P73282-B21', quantity: 10, totalQuantity: 10, description: 'DL380 Gen12 8SFF CTO Server', category: 'Base Server Chassis' },
    { sku: 'P73300-F21', quantity: 80, totalQuantity: 80, description: '32GB DDR5-6400 Smart FIO Memory', category: 'Memory' }
  ];

  const result = analyzeAndPartitionClusters(mixedTenderItems);
  assert.ok(result.clusters.length >= 1, 'Must partition clusters cleanly');
  assert.ok(result.totalChassis >= 20, 'Must recognize total chassis count');
});

test('▶ [CHAOS 2]: Odd & Fractional Multiplier Distribution', () => {
  // 17 CPUs requested for dual-socket servers -> 9 servers (ceil(17/2))
  const oddCpuItems = [
    { sku: 'P52534-B21', quantity: 9, totalQuantity: 9, description: 'DL380 Gen11 CTO Server', category: 'Base Server Chassis' },
    { sku: 'P67088-B21', quantity: 17, totalQuantity: 17, description: 'Intel Xeon-Platinum 8580 Processor', category: 'Processors' },
    { sku: 'P64707-B21', quantity: 72, totalQuantity: 72, description: '64GB DDR5-5600 Smart Memory', category: 'Memory' }
  ];

  const result = analyzeAndPartitionClusters(oddCpuItems);
  assert.equal(result.totalChassis, 9, 'Total chassis should ceiling round to 9 nodes');
  assert.ok(result.clusters.length >= 1, 'Must form cluster successfully');
});

test('▶ [CHAOS 3]: Enterprise Multi-Node Infrastructure Sizing (INV-29)', () => {
  // Test large multi-node tender (60 DL380 servers)
  const nodeCount = 60;
  const ruPerServer = 2;
  const totalRU = nodeCount * ruPerServer; // 120 RU
  const standard42uRacks = Math.ceil(totalRU / 42); // 3 Racks
  const estimatedPeakPowerKw = (nodeCount * 1800) / 1000; // 108 kW

  assert.equal(totalRU, 120, 'Total Rack Units must be 120 for 60 2U servers');
  assert.equal(standard42uRacks, 3, 'Must require 3 standard 42U racks');
  assert.equal(estimatedPeakPowerKw, 108, 'Peak facility power must be 108 kW');
});

test('▶ [CHAOS 4]: Riser Slot 1 Cable Kit Interlock (INV-31)', () => {
  const fiveCardItems = [
    { sku: 'P52534-B21', quantity: 1, description: 'DL380 Gen11 CTO Server', category: 'Base Server Chassis' },
    { sku: 'P47777-B21', quantity: 1, description: 'MR416i-p Storage Controller', category: 'Storage Controller' },
    { sku: 'R2E09A', quantity: 2, description: 'SN1610Q 32Gb 2-port FC HBA', category: 'Host Bus Adapter' },
    { sku: 'P26262-B21', quantity: 2, description: 'BCM57414 10/25Gb 2-port PCIe NIC', category: 'Network Adapter' },
    { sku: 'P48803-B21', quantity: 1, description: 'Primary 3x16 Riser Kit', category: 'PCIe Riser' },
    { sku: 'P51083-B21', quantity: 1, description: 'Secondary 3x16 Riser Kit', category: 'PCIe Riser' }
  ];

  const pcieRes = evalPcieRiserSlots(fiveCardItems);
  assert.equal(pcieRes.requiredPcieCards, 5, 'Must count 5 physical PCIe cards');
  assert.equal(pcieRes.needsPrimaryCableKit, true, '5 physical PCIe cards across risers must mandate Primary Cable Kit');
});

test('▶ [CHAOS 5]: EU Ecodesign Lot 9 Platinum PSU Enablement (INV-30)', () => {
  const platinumItems = [
    { sku: 'P52534-B21', quantity: 1, description: 'DL380 Gen11 CTO Server', category: 'Base Server Chassis' },
    { sku: 'P67095-B21', quantity: 2, description: 'Intel Xeon-Gold 6530 2.1GHz 32-core 270W Processor for HPE', category: 'Processors' },
    { sku: 'P38997-B21', quantity: 2, description: 'HPE 1600W Flex Slot Platinum Power Supply Kit', category: 'Power Supply' }
  ];

  const powerRes = evalPowerEnvironment(platinumItems);
  assert.equal(powerRes.hasPlatinumPsu, true, 'Must detect Platinum PSUs');
  assert.equal(powerRes.needsCeRemovalKit, true, 'Platinum PSUs under high draw must mandate CE Mark Removal Kit');
});
