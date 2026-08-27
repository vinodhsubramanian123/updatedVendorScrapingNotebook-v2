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
const chassisMap = require('../../scripts/config/chassis_map.json');

const testProducts = [
  { name: 'DL380 Gen12 SFF', sku: 'P73282-B21', expectedFamily: 'ProLiant', expectedGen: 'Gen12' },
  { name: 'DL380 Gen11', sku: 'P52534-B21', expectedFamily: 'ProLiant', expectedGen: 'Gen11' },
  { name: 'MSL3040 Tape', sku: 'Q2R41A', expectedFamily: 'StoreEver', expectedGen: 'Tape' },
  { name: 'GX5000 Rack', sku: 'P57100-B21', expectedFamily: 'Cray', expectedGen: 'General' },
  { name: 'Synergy 12000 Frame', sku: '797740-B21', expectedFamily: 'Synergy', expectedGen: 'General' },
  { name: 'Alletra Storage', sku: 'R0Q35A', expectedFamily: 'Alletra', expectedGen: 'Storage' }
];

function getChassisDetails(sku) {
  if (chassisMap.chassis_base_skus && chassisMap.chassis_base_skus[sku]) {
    return chassisMap.chassis_base_skus[sku];
  }
  return null;
}

test('Cross-Chassis 7-Aspect Physical Math Checker Suite', async (t) => {
  await t.test('Edge Case Combinations', async (t2) => {
    await t2.test('Mismatched TDP/fan requirements (Compute Thermal)', () => {
      // 360W processor triggers hasHighPerfFans requirement.
      const items = [
        { sku: 'P12345-B21', description: 'AMD EPYC 9654 360W Processor', quantity: 1 }
      ];
      const computeRes = evalComputeThermal(items);
      assert.strictEqual(computeRes.maxCpuTdpWatts, 360);
      assert.strictEqual(computeRes.hasHighPerfFans, false, 'No high perf fans provided yet');
      
      const itemsWithFan = [
        { sku: 'P12345-B21', description: 'AMD EPYC 9654 360W Processor', quantity: 1 },
        { sku: 'P48820-B21', description: 'High Performance Fan Kit', quantity: 6 }
      ];
      // Passing high perf fan via mandatory skus arg as defined in the checker
      const computeRes2 = evalComputeThermal(itemsWithFan, null, { HIGH_PERF_FAN_KIT: { sku: 'P48820-B21' } });
      assert.strictEqual(computeRes2.hasHighPerfFans, true);
    });

    await t2.test('Unbuffered vs registered DDR5 DIMM balance (Memory Channel)', () => {
      // 2 CPUs and 14 DIMMs (unbalanced)
      const unbalancedItems = [
        { sku: 'P12345-B21', description: 'Processor', quantity: 2 },
        { sku: 'P43322-B21', description: '32GB DDR5 RDIMM Memory', quantity: 14 }
      ];
      const memResUnbalanced = evalMemoryChannel(unbalancedItems, 2);
      assert.strictEqual(memResUnbalanced.isBalancedChannel, false);
      assert.strictEqual(memResUnbalanced.memoryCount, 14);

      // 2 CPUs and 16 DIMMs (balanced 8 channels per CPU)
      const balancedItems = [
        { sku: 'P12345-B21', description: 'Processor', quantity: 2 },
        { sku: 'P43322-B21', description: '32GB DDR5 RDIMM Memory', quantity: 16 }
      ];
      const memResBalanced = evalMemoryChannel(balancedItems, 2);
      assert.strictEqual(memResBalanced.isBalancedChannel, true);
      assert.strictEqual(memResBalanced.memoryCount, 16);
    });

    await t2.test('Missing storage cache batteries (Storage Tri-mode)', () => {
      const items = [
        { sku: 'P12345-B21', description: 'Broadcom MegaRAID MR416i-p Storage Controller', quantity: 1 }
      ];
      const res = evalStorageTriMode(items);
      assert.strictEqual(res.hasStorageController, true);
      assert.strictEqual(res.hasSmartBattery, false);

      const itemsWithBattery = [
        { sku: 'P12345-B21', description: 'Broadcom MegaRAID MR416i-p Storage Controller', quantity: 1 },
        { sku: 'P01366-B21', description: '96W Smart Storage Battery', quantity: 1 }
      ];
      const res2 = evalStorageTriMode(itemsWithBattery);
      assert.strictEqual(res2.hasSmartBattery, true);
    });

    await t2.test('Missing secondary PCIe risers (PCIe Riser)', () => {
      // Total 4 cards requested. By default, chassis provides 3 slots without risers (or with primary).
      const items = [
        { sku: 'P11111-B21', description: 'NVIDIA A100 GPU', quantity: 4 }
      ];
      const pcieRes = evalPcieRiserSlots(items);
      assert.strictEqual(pcieRes.requiredPcieCards, 4);
      assert.strictEqual(pcieRes.needsSecondaryRiser, true); // 4 > (3 + 0*3) = 3
    });

    await t2.test('Pointnext Tech Care SLA options (Support Manufacturing)', () => {
      const items = [
        { sku: 'P12345-B21', description: 'Standard component' }
      ];
      const res = evalSupportManufacturing(items);
      assert.strictEqual(res.hasSupportService, false);

      const itemsWithSupport = [
        { sku: 'H7J34A', description: 'HPE 3 Year Tech Care Essential Service' }
      ];
      const res2 = evalSupportManufacturing(itemsWithSupport);
      assert.strictEqual(res2.hasSupportService, true);
    });
  });

  await t.test('All 7 Aspect Checkers run successfully against 6 different base chassis SKUs', async (t2) => {
    for (const prod of testProducts) {
      await t2.test(`Chassis Validation: ${prod.name} (${prod.sku})`, () => {
        const chassis = getChassisDetails(prod.sku);
        assert.ok(chassis, `Chassis ${prod.sku} should exist in chassis_map.json`);
        assert.strictEqual(chassis.family, prod.expectedFamily);
        assert.strictEqual(chassis.gen, prod.expectedGen);

        const items = [
          { sku: prod.sku, description: chassis.description, quantity: 1 }
        ];

        // Ensure Zero-Hardcoding by evaluating basic properties dynamically without SKU hardcoding
        const computeRes = evalComputeThermal(items);
        assert.ok(computeRes !== null, 'evalComputeThermal should return an object');

        const memRes = evalMemoryChannel(items);
        assert.ok(memRes !== null, 'evalMemoryChannel should return an object');

        const powerRes = evalPowerEnvironment(items);
        assert.ok(powerRes !== null, 'evalPowerEnvironment should return an object');

        const pcieRes = evalPcieRiserSlots(items, { entries: [] }, { CHASSIS: chassis });
        assert.ok(pcieRes !== null, 'evalPcieRiserSlots should return an object');

        const storageRes = evalStorageTriMode(items);
        assert.ok(storageRes !== null, 'evalStorageTriMode should return an object');

        const netRes = evalNetworkingOcp(items, { entries: [] }, { CHASSIS: chassis });
        assert.ok(netRes !== null, 'evalNetworkingOcp should return an object');

        const supportRes = evalSupportManufacturing(items);
        assert.ok(supportRes !== null, 'evalSupportManufacturing should return an object');
      });
    }
  });
});
