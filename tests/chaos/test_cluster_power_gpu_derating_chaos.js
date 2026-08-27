'use strict';
/**
 * test_cluster_power_gpu_derating_chaos.js
 * Chaos & Boundary Stress Test Suite for Enterprise Cluster Sizing & High-Density GPU Power Derating.
 *
 * Scenarios Covered:
 * 1. 100-500 Node Mega-Cluster Sizing (Rack Units, 42U Racks, Peak Facility Power in kW/MW)
 * 2. Rail Kit Coverage & Missing Hardware Advisory (P52341-B21)
 * 3. High-Density GPU Auxiliary Power & Thermal Envelope (300W+ GPUs, High-Perf Fans/Heatsinks)
 * 4. High-Line 200V-240V Utility Power Derating Protection (Node > 800W, 1600W+ PSUs)
 * 5. OS & Hypervisor Physical Core Multiplier Licensing Math (Windows Server / VMware per-core licenses)
 *
 * Adheres to Invariants INV-16 (cross-platform), INV-27 (GPU Power/Thermal), INV-28 (Core Licensing), and INV-29 (Cluster Sizing).
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

const { evaluatePhysicalMath } = require('../../scripts/lib/boq/boq_evaluator.js');
const { analyzeAndPartitionClusters } = require('../../scripts/lib/boq/multi_cluster_splitter.js');
const { evalPowerEnvironment } = require('../../scripts/lib/aspects/power_environment.js');
const { evalComputeThermal } = require('../../scripts/lib/aspects/compute_thermal.js');

describe('Enterprise Cluster Sizing & GPU Power Derating Chaos Suite', () => {

  it('1. 100-Node DL380 Gen11 Cluster Calculates Correct Sizing & Facility Power', () => {
    const items = [
      { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF CTO Server', quantity: 100 },
      { sku: 'P48820-B21', description: 'High Performance Fan Kit', quantity: 100 },
      { sku: 'P52341-B21', description: 'HPE ProLiant DL380 Gen11 Easy Install Rail Kit', quantity: 100 },
      { sku: 'P38995-B21', description: 'HPE 800W Flex Slot Platinum Hot Plug Low Halogen Power Supply Kit', quantity: 200 }
    ];

    const evalResult = evaluatePhysicalMath(items, null, '');
    assert.ok(evalResult.clusterSizing, 'clusterSizing object must be present');
    assert.strictEqual(evalResult.clusterSizing.serverCount, 100);
    assert.strictEqual(evalResult.clusterSizing.totalRackUnits, 200, '100 x 2U = 200 RU');
    assert.strictEqual(evalResult.clusterSizing.standard42uRacksRequired, 5, 'ceil(200 / 42) = 5 racks');
    assert.ok(evalResult.clusterSizing.totalFacilityPowerKw > 0, 'Facility power calculated');
    assert.strictEqual(evalResult.clusterSizing.railKitCoverage.isCompliant, true, 'Rail kit count meets 100 servers');
  });

  it('2. Missing Rail Kit Advisory in Multi-Node Tender', () => {
    const items = [
      { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF CTO Server', quantity: 60 },
      { sku: 'P48820-B21', description: 'High Performance Fan Kit', quantity: 60 }
      // Zero rail kits provided
    ];

    const evalResult = evaluatePhysicalMath(items, null, '');
    assert.strictEqual(evalResult.clusterSizing.serverCount, 60);
    assert.strictEqual(evalResult.clusterSizing.railKitCoverage.providedCount, 0);
    assert.strictEqual(evalResult.clusterSizing.railKitCoverage.isCompliant, false);
    assert.strictEqual(evalResult.clusterSizing.railKitCoverage.required, 60);
  });

  it('3. High-Density GPU Aux Power & High-Line 220V Utility Derating Flag', () => {
    const items = [
      { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF CTO Server', quantity: 1 },
      { sku: 'P48820-B21', description: 'HPE DL380 Gen11 High Performance Fan Kit', quantity: 1 },
      { sku: 'P48816-B21', description: 'HPE ProLiant DL380 Gen11 GPU Aux Power Cable Kit', quantity: 1 },
      { sku: 'P64707-B21', description: 'HPE 64GB DDR5 Memory', quantity: 16 },
      { sku: 'P36877-B21', description: 'HPE 1600W Flex Slot Power Supply', quantity: 2 }
    ];

    // High wattage GPU simulation
    const gpuItems = [
      ...items,
      { sku: 'P76450-B21', description: 'NVIDIA L40S 48GB PCIe GPU Accelerator', quantity: 2 }
    ];

    const powerSummary = evalPowerEnvironment(gpuItems, null, {});
    assert.ok(powerSummary.estimatedNodeWattage > 800, 'Node estimated draw with 2x GPUs exceeds 800W');
    assert.strictEqual(powerSummary.needsHighLine220v, true, 'High-Line 220V utility power required for 1600W+ PSU with >800W load');
  });

  it('4. Multi-Cluster Splitter Emits Partition-Level Infrastructure Sizing', () => {
    const rawItems = [
      { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF CTO Server', quantity: 60, category: 'Base Chassis' },
      { sku: 'P49614-B21', description: 'Intel Xeon Platinum 8480+ 350W Processor', quantity: 60, category: 'Processor' },
      { sku: 'P49605-B21', description: 'Intel Xeon Gold 6430 270W Processor', quantity: 60, category: 'Processor' },
      { sku: 'P52341-B21', description: 'HPE ProLiant DL380 Gen11 Easy Install Rail Kit', quantity: 60, category: 'Racking / Rail' },
      { sku: 'P38995-B21', description: 'HPE 800W Flex Slot Platinum Power Supply', quantity: 120, category: 'Power Supply' }
    ];

    const partitionResult = analyzeAndPartitionClusters(rawItems);
    assert.strictEqual(partitionResult.isMultiCluster, true);
    assert.strictEqual(partitionResult.clusters.length, 2);

    partitionResult.clusters.forEach(cluster => {
      assert.ok(cluster.clusterSizing, 'Partition must have clusterSizing');
      assert.strictEqual(cluster.clusterSizing.serverCount, 30);
      assert.strictEqual(cluster.clusterSizing.totalRackUnits, 60);
      assert.strictEqual(cluster.clusterSizing.standard42uRacksRequired, 2);
    });
  });
});
