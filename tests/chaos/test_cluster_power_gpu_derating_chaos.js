'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { analyzeAndPartitionClusters } = require('../../scripts/lib/boq/multi_cluster_splitter.js');
const { evalPowerEnvironment } = require('../../scripts/lib/aspects/power_environment.js');
const { evalSupportManufacturing } = require('../../scripts/lib/aspects/support_manufacturing.js');

test('Chaos & Fuzzing: Cluster Sizing, Power Derating, & Licensing (INV-27, INV-28, INV-29)', async (t) => {

  await t.test('100 to 500 Node Tenders Cluster Sizing Matrix Math (Fuzzing)', () => {
    const nodeCounts = [100, 250, 314, 500];

    nodeCounts.forEach(count => {
      const rawItems = [
        { sku: 'DL380_Gen12', description: 'Base Chassis', quantity: count, category: 'Base Chassis' },
        { sku: 'CPU1', description: 'Intel Xeon 16-core 205W Processor', quantity: count * 2, category: 'Processor' },
        { sku: 'PSU1', description: 'HPE 800W Flex Slot Platinum Power Supply', quantity: count * 2, category: 'Power Supply' },
        { sku: 'P52341-B21', description: 'HPE ProLiant DL380 Gen11 Easy Install Rail Kit', quantity: Math.floor(count / 2), category: 'Racking' }
      ];

      const result = analyzeAndPartitionClusters(rawItems);

      assert.strictEqual(result.clusters.length, 1);
      const sizing = result.clusters[0].clusterSizing;

      assert.strictEqual(sizing.serverCount, count, `Server count should be ${count}`);
      assert.strictEqual(sizing.totalRackUnits, count * 2, `Total Rack Units should be ${count * 2} (${count} * 2U)`);
      assert.strictEqual(sizing.standard42uRacksRequired, Math.ceil((count * 2) / 42), 'Standard 42U Racks Required should be calculated correctly');
      assert.strictEqual(sizing.railKitCoverage.providedCount, Math.floor(count / 2), 'Rail Kit coverage correctly counted');
      assert.strictEqual(sizing.railKitCoverage.isCompliant, false, `Rail Kit isCompliant should be false (${Math.floor(count / 2)} < ${count})`);
    });
  });

  await t.test('GPU Auxiliary Power Cable Kits and Fan Kits requirement (INV-27)', () => {
    const { evalPcieRiserSlots } = require('../../scripts/lib/aspects/pcie_riser.js');
    const itemsGPU = [
      { sku: 'CPU1', description: 'Intel Xeon 16-core 205W Processor', quantity: 2, category: 'Processor' },
      { sku: 'GPU1', description: 'NVIDIA H100 80GB PCIe Accelerator', quantity: 2, category: 'GPU / Accelerator' }
    ];

    const pcieRes = evalPcieRiserSlots(itemsGPU);
    assert.strictEqual(pcieRes.needsGpuPowerCableKit, true, 'Should flag needsGpuPowerCableKit for NVIDIA GPU');
  });

  await t.test('Power Derating & Utility Voltage (110V vs 220V) Advisory', () => {
    // Test 1: Below 800W, large PSU -> No high-line required
    const itemsLow = [
      { sku: 'CPU1', description: 'Intel Xeon 8-core 105W Processor', quantity: 1, category: 'Processor' },
      { sku: 'PSU1', description: 'HPE 1600W Flex Slot Platinum Power Supply', quantity: 2, category: 'Power Supply' }
    ];
    let powerRes = evalPowerEnvironment(itemsLow);
    assert.strictEqual(powerRes.needsHighLine220v, false, 'Should not need 220V for low load');

    // Test 2: High Node Wattage (>800W) with >= 1600W PSU -> Needs 220V
    const itemsHigh = [
      { sku: 'CPU1', description: 'Intel Xeon 32-core 250W Processor', quantity: 2, category: 'Processor' },
      { sku: 'GPU1', description: 'NVIDIA H100 80GB PCIe Accelerator', quantity: 2, category: 'GPU / Accelerator' },
      { sku: 'PSU1', description: 'HPE 1800W-2200W Flex Slot Titanium Power Supply', quantity: 2, category: 'Power Supply' }
    ];
    powerRes = evalPowerEnvironment(itemsHigh);
    assert.strictEqual(powerRes.needsHighLine220v, true, 'Should flag for 220V derating protection');
  });

  await t.test('Windows Server OS & Hypervisor Core Licensing Multiplier', () => {
    // 32-core CPU * 2 = 64 physical cores
    const itemsOS = [
      { sku: 'CPU1', description: 'Intel Xeon 32-core 205W Processor', quantity: 2, category: 'Processor' },
      { sku: 'WIN16', description: 'Windows Server 2022 Standard 16-core Base License', quantity: 1, category: 'Operating System' },
      { sku: 'WIN2', description: 'Windows Server 2022 Standard 2-core Additional License', quantity: 5, category: 'Operating System' } // 16 + 10 = 26 cores
    ];

    // Test support aspect logic
    const supportRes = evalSupportManufacturing(itemsOS, { parsedRules: [] });

    assert.strictEqual(supportRes.detectedCpuCores, 64, 'Correctly detected 64 physical cores');
    assert.strictEqual(supportRes.totalWindowsLicensedCores, 26, 'Correctly counted 26 Windows licensed cores');
    assert.strictEqual(supportRes.needsAdditionalWindowsCores, true, 'Flags that additional licenses are needed');
    assert.strictEqual(supportRes.missingCoreLicenses, 64 - 26, 'Calculates exact missing core discrepancy');
  });

});
