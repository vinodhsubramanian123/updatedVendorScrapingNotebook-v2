'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { evalComputeThermal } = require('../../scripts/lib/aspects/compute_thermal.js');
const { evalMemoryChannel } = require('../../scripts/lib/aspects/memory_channel.js');
const { evalPowerEnvironment } = require('../../scripts/lib/aspects/power_environment.js');
const { evalPcieRiserSlots } = require('../../scripts/lib/aspects/pcie_riser.js');
const { evalStorageTriMode } = require('../../scripts/lib/aspects/storage_tri_mode.js');
const { evalNetworkingOcp } = require('../../scripts/lib/aspects/networking_ocp.js');
const { evalSupportManufacturing } = require('../../scripts/lib/aspects/support_manufacturing.js');

test('Physical Aspect Checkers Comprehensive Suite', async (t) => {

  await t.test('evalComputeThermal', async (t2) => {
    await t2.test('Identifies standard CPUs correctly', () => {
      const items = [{ sku: 'P12345-B21', description: 'Intel Xeon Gold 5218 125W Processor', quantity: 2 }];
      const result = evalComputeThermal(items);
      assert.strictEqual(result.cpuCount, 2);
      assert.strictEqual(result.maxCpuTdpWatts, 125);
      assert.strictEqual(result.hasHighPerfFans, false);
      assert.strictEqual(result.hasHeatsinks, true); // True by default if mandatory SKU not provided
    });

    await t2.test('Identifies high TDP CPUs and cooling kits', () => {
      const items = [
        { sku: 'P99999-B21', description: 'AMD EPYC 9654 360W Processor', quantity: 1 },
        { sku: 'P48820-B21', description: 'High Performance Fan Kit', quantity: 6 }
      ];
      const result = evalComputeThermal(items, null, { HIGH_PERF_FAN_KIT: { sku: 'P48820-B21' } });
      assert.strictEqual(result.cpuCount, 1);
      assert.strictEqual(result.maxCpuTdpWatts, 360);
      assert.strictEqual(result.hasHighPerfFans, true);
    });

    await t2.test('Handles missing TDP info gracefully', () => {
      const items = [{ sku: 'P11111-B21', description: 'Generic Processor', quantity: 1 }];
      const result = evalComputeThermal(items);
      assert.strictEqual(result.cpuCount, 1);
      assert.strictEqual(result.maxCpuTdpWatts, 0);
    });
    
    await t2.test('Handles empty item list', () => {
      const result = evalComputeThermal([]);
      assert.strictEqual(result.cpuCount, 0);
      assert.strictEqual(result.maxCpuTdpWatts, 0);
      assert.strictEqual(result.hasHighPerfFans, false);
      assert.strictEqual(result.hasHeatsinks, true);
    });
  });

  await t.test('evalMemoryChannel', async (t2) => {
    await t2.test('Identifies balanced memory (8 channels, 2 CPUs, 16 DIMMs)', () => {
      const items = [
        { sku: 'P00000-B21', description: 'Intel Xeon Processor', quantity: 2 },
        { sku: 'P40028-B21', description: '32GB DDR4 Memory', quantity: 16 }
      ];
      const result = evalMemoryChannel(items);
      assert.strictEqual(result.memoryCount, 16);
      assert.strictEqual(result.totalMemoryGb, 512);
      assert.strictEqual(result.isBalancedChannel, true);
      assert.strictEqual(result.hasBtoMemoryInCto, false);
    });

    await t2.test('Identifies unbalanced memory (2 CPUs, 14 DIMMs)', () => {
      const items = [
        { sku: 'P00000-B21', description: 'Intel Xeon Processor', quantity: 2 },
        { sku: 'P40028-B21', description: '32GB DDR4 Memory', quantity: 14 }
      ];
      const result = evalMemoryChannel(items);
      assert.strictEqual(result.memoryCount, 14);
      assert.strictEqual(result.isBalancedChannel, false);
    });

    await t2.test('Detects BTO memory in CTO environment', () => {
      const items = [
        { sku: 'P40028-B21', description: '32GB DDR4 Memory', quantity: 8 }
      ];
      // evalMemoryChannel signature: (items, passedCpuCount = 0, catalogData = null, isCtoChassis = false)
      const result = evalMemoryChannel(items, 0, null, true); 
      assert.strictEqual(result.hasBtoMemoryInCto, true);
      assert.strictEqual(result.btoMemoryViolations.length, 1);
    });

    await t2.test('Handles FIO memory in CTO gracefully', () => {
      const items = [
        { sku: 'P40028-F21', description: '32GB DDR4 Memory FIO', quantity: 8 }
      ];
      const result = evalMemoryChannel(items, 0, null, true);
      assert.strictEqual(result.hasBtoMemoryInCto, false);
    });
    
    await t2.test('Handles empty items list', () => {
      const result = evalMemoryChannel([]);
      assert.strictEqual(result.memoryCount, 0);
      assert.strictEqual(result.totalMemoryGb, 0);
      assert.strictEqual(result.isBalancedChannel, false);
      assert.strictEqual(result.hasBtoMemoryInCto, false);
    });
  });

  await t.test('evalPowerEnvironment', async (t2) => {
    await t2.test('Identifies standard AC power supplies', () => {
      const items = [{ sku: 'P38995-B21', description: '800W Flex Slot Platinum Hot Plug Low Halogen Power Supply Kit', quantity: 2 }];
      const result = evalPowerEnvironment(items);
      assert.strictEqual(result.psuCount, 2);
      assert.strictEqual(result.hasDcPowerSupply, false);
      assert.strictEqual(result.hasDcLugKit, false);
    });

    await t2.test('Identifies -48VDC power supply and lug kit', () => {
      const items = [
        { sku: 'P17023-B21', description: '1600W Flex Slot -48VDC Hot Plug Power Supply Kit', quantity: 2 },
        { sku: 'P36877-B21', description: 'DC Power Cable Lug Kit', quantity: 1 }
      ];
      const result = evalPowerEnvironment(items, null, { DC_LUG_KIT: { sku: 'P36877-B21' } });
      assert.strictEqual(result.psuCount, 2);
      assert.strictEqual(result.hasDcPowerSupply, true);
      assert.strictEqual(result.hasDcLugKit, true);
    });
    
    await t2.test('Identifies empty lists', () => {
      const result = evalPowerEnvironment([]);
      assert.strictEqual(result.psuCount, 0);
      assert.strictEqual(result.hasDcPowerSupply, false);
      assert.strictEqual(result.hasDcLugKit, false);
    });
  });

  await t.test('evalPcieRiserSlots', async (t2) => {
    await t2.test('Calculates slots and risers correctly (No secondary needed)', () => {
      const items = [
        { sku: 'P11111-B21', description: 'NVIDIA T4 GPU Accelerator', quantity: 2 },
        { sku: 'P22222-B21', description: 'Primary Riser Kit', quantity: 1 }
      ];
      const result = evalPcieRiserSlots(items);
      assert.strictEqual(result.requiredPcieCards, 2);
      assert.strictEqual(result.primaryRiserCount, 1);
      assert.strictEqual(result.secondaryRiserCount, 0);
      assert.strictEqual(result.totalSlotsAvailable, 6); // 3 (base) + 3 (primary)
      assert.strictEqual(result.needsSecondaryRiser, false);
    });

    await t2.test('Calculates slots and risers correctly (Needs secondary)', () => {
      const items = [
        { sku: 'P11111-B21', description: 'Broadcom Network Adapter', quantity: 5 }
      ];
      const result = evalPcieRiserSlots(items);
      assert.strictEqual(result.requiredPcieCards, 5);
      assert.strictEqual(result.primaryRiserCount, 0);
      assert.strictEqual(result.totalSlotsAvailable, 3); // 3 (base)
      assert.strictEqual(result.needsSecondaryRiser, true); // 5 > 3
    });
    
    await t2.test('Calculates OCP and embedded cards (Should ignore)', () => {
      const items = [
        { sku: 'P11111-B21', description: 'Broadcom OCP Network Adapter', quantity: 2 }
      ];
      const result = evalPcieRiserSlots(items);
      assert.strictEqual(result.requiredPcieCards, 0);
      assert.strictEqual(result.needsSecondaryRiser, false);
    });
    
    await t2.test('Empty items list', () => {
      const result = evalPcieRiserSlots([]);
      assert.strictEqual(result.requiredPcieCards, 0);
      assert.strictEqual(result.primaryRiserCount, 0);
      assert.strictEqual(result.secondaryRiserCount, 0);
      assert.strictEqual(result.tertiaryRiserCount, 0);
      assert.strictEqual(result.totalSlotsAvailable, 3);
      assert.strictEqual(result.needsSecondaryRiser, false);
    });
  });

  await t.test('evalStorageTriMode', async (t2) => {
    await t2.test('Identifies drives and storage controllers', () => {
      const items = [
        { sku: 'P28028-B21', description: '2.4TB SAS 10K SFF HDD', quantity: 8 },
        { sku: 'P26262-B21', description: 'MR416i-a Gen10 Plus Storage Controller', quantity: 1 }
      ];
      const result = evalStorageTriMode(items);
      assert.strictEqual(result.driveCount, 8);
      assert.strictEqual(result.hasStorageController, true);
      assert.strictEqual(result.hasSmartBattery, false);
      assert.strictEqual(result.hasNoDriveKit, false);
    });

    await t2.test('Identifies Smart Storage Battery and No Drive Kit', () => {
      const items = [
        { sku: 'P01366-B21', description: 'Smart Storage Battery', quantity: 1 },
        { sku: '873763-B21', description: 'No Drive FIO Kit', quantity: 1 }
      ];
      const result = evalStorageTriMode(items, null, {
        SMART_STORAGE_BATTERY: { sku: 'P01366-B21' },
        NO_DRIVE_FIO_KIT: { sku: '873763-B21' }
      });
      assert.strictEqual(result.driveCount, 0);
      assert.strictEqual(result.hasStorageController, false);
      assert.strictEqual(result.hasSmartBattery, true);
      assert.strictEqual(result.hasNoDriveKit, true);
    });
    
    await t2.test('Empty items list', () => {
      const result = evalStorageTriMode([]);
      assert.strictEqual(result.driveCount, 0);
      assert.strictEqual(result.hasStorageController, false);
      assert.strictEqual(result.hasSmartBattery, false);
      assert.strictEqual(result.hasNoDriveKit, false);
    });
  });

  await t.test('evalNetworkingOcp', async (t2) => {
    await t2.test('Calculates networking ports and OCP slots correctly (under limit)', () => {
      const items = [
        { sku: 'P11111-B21', description: 'Broadcom BCM57416 Ethernet 10Gb 2-port BASE-T OCP3 Adapter', quantity: 1 },
        { sku: 'P22222-B21', description: 'Intel E810-XXVDA4 Ethernet 10/25Gb 4-port SFP28 OCP3 Adapter', quantity: 1 }
      ];
      const result = evalNetworkingOcp(items);
      assert.strictEqual(result.hasOcpAdapter, true);
      assert.strictEqual(result.ocpAdapterCount, 2);
      assert.strictEqual(result.networkPortsCount, 6); // 2-port + 4-port
      assert.strictEqual(result.isExceedingOcpSlots, false); // default max is 2
    });

    await t2.test('Calculates networking ports and OCP slots correctly (over limit)', () => {
      const items = [
        { sku: 'P11111-B21', description: 'Broadcom OCP3 Adapter', quantity: 3 }
      ];
      const result = evalNetworkingOcp(items);
      assert.strictEqual(result.hasOcpAdapter, true);
      assert.strictEqual(result.ocpAdapterCount, 3);
      assert.strictEqual(result.isExceedingOcpSlots, true);
    });
    
    await t2.test('Calculates quad and single port names correctly', () => {
      const items = [
        { sku: 'P11111-B21', description: 'Quad port ethernet adapter', quantity: 1 },
        { sku: 'P22222-B21', description: 'Single port ethernet adapter', quantity: 1 },
      ];
      const result = evalNetworkingOcp(items);
      assert.strictEqual(result.networkPortsCount, 5); // 4 + 1
    });

    await t2.test('Catalog max qty override', () => {
      const items = [
        { sku: 'P11111-B21', description: 'Broadcom OCP3 Adapter', quantity: 3 }
      ];
      const catalogData = {
        entries: [
          { parentCategory: 'Network', maxQty: 4 }
        ]
      };
      const result = evalNetworkingOcp(items, catalogData);
      assert.strictEqual(result.hasOcpAdapter, true);
      assert.strictEqual(result.ocpAdapterCount, 3);
      assert.strictEqual(result.isExceedingOcpSlots, false);
      assert.strictEqual(result.maxOcpSlots, 4);
    });
    
    await t2.test('Empty items list', () => {
      const result = evalNetworkingOcp([]);
      assert.strictEqual(result.networkPortsCount, 0);
      assert.strictEqual(result.hasOcpAdapter, false);
      assert.strictEqual(result.ocpAdapterCount, 0);
      assert.strictEqual(result.maxOcpSlots, 2);
      assert.strictEqual(result.isExceedingOcpSlots, false);
    });
  });

  await t.test('evalSupportManufacturing', async (t2) => {
    await t2.test('Identifies Tech Care support service', () => {
      const items = [
        { sku: 'H8QB3E', description: 'HPE 3Y Tech Care Basic Service', quantity: 1 }
      ];
      const result = evalSupportManufacturing(items);
      assert.strictEqual(result.hasSupportService, true);
    });

    await t2.test('Identifies standard component without support service', () => {
      const items = [
        { sku: 'P11111-B21', description: 'Standard Processor', quantity: 1 }
      ];
      const result = evalSupportManufacturing(items);
      assert.strictEqual(result.hasSupportService, false);
    });
    
    await t2.test('Empty items list', () => {
      const result = evalSupportManufacturing([]);
      assert.strictEqual(result.hasSupportService, false);
    });
  });

});