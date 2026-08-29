'use strict';
/**
 * tests/chaos/test_storage_array_controller_pair_chaos.js
 * Validates Enterprise Storage Array and Controller Pair boundaries (INV-29/Storage bounds).
 */

const test = require('node:test');
const assert = require('node:assert');
const { evalStorageTriMode } = require('../../scripts/lib/aspects/storage_tri_mode.js');

test('Storage Array Controller Pair Chaos Suite', async (t) => {
  await t.test('1. Validates Controller Node Pair requirement (exactly 2 nodes)', (t2) => {
    // Valid: 2 nodes
    const validItems = [
      { sku: 'R0Q21A', description: 'HPE Alletra Storage System', quantity: 1 },
      { sku: 'P12345', description: 'HPE Alletra Controller Node', quantity: 2 }
    ];
    let res = evalStorageTriMode(validItems);
    assert.strictEqual(res.isAlletraArray, true);
    assert.strictEqual(res.controllerNodeCount, 2);
    assert.strictEqual(res.hasMissingControllerNode, false);

    // Invalid: 1 node
    const invalidItems = [
      { sku: 'R0Q21A', description: 'HPE Alletra Storage System', quantity: 1 },
      { sku: 'P12345', description: 'HPE Alletra Controller Node', quantity: 1 }
    ];
    res = evalStorageTriMode(invalidItems);
    assert.strictEqual(res.hasMissingControllerNode, true);
  });

  await t.test('2. Validates Host Bus Adapter (HBA) symmetry (even counts per SKU)', (t2) => {
    // Valid: 4 HBAs (symmetric for 2 nodes)
    const validItems = [
      { sku: 'R0Q21A', description: 'HPE Alletra Storage System', quantity: 1 },
      { sku: 'P12345', description: 'HPE 32Gb PCIe FC Host Bus Adapter', quantity: 4 }
    ];
    let res = evalStorageTriMode(validItems);
    assert.strictEqual(res.hbaCount, 4);
    assert.strictEqual(res.hasAsymmetricHbas, false);

    // Invalid: 3 HBAs (asymmetric)
    const invalidItems = [
      { sku: 'R0Q21A', description: 'HPE Alletra Storage System', quantity: 1 },
      { sku: 'P12345', description: 'HPE 32Gb PCIe FC Host Bus Adapter', quantity: 3 }
    ];
    res = evalStorageTriMode(invalidItems);
    assert.strictEqual(res.hasAsymmetricHbas, true);
  });

  await t.test('3. Validates Drive Enclosure Daisy-Chain Cabling (2 cables per shelf)', (t2) => {
    // Valid: 1 shelf, 2 cables
    const validItems = [
      { sku: 'R0Q21A', description: 'HPE Alletra Storage System', quantity: 1 },
      { sku: 'Q1J92A', description: 'HPE D3940 Expansion Shelf', quantity: 1 },
      { sku: 'P40243-B21', description: 'HPE SAS Mini-HD to Mini-HD Cable', quantity: 2 }
    ];
    let res = evalStorageTriMode(validItems);
    assert.strictEqual(res.expansionShelfCount, 1);
    assert.strictEqual(res.sasDaisyChainCableCount, 2);
    assert.strictEqual(res.missingDaisyChainCables, false);

    // Invalid: 1 shelf, 1 cable
    const invalidItems = [
      { sku: 'R0Q21A', description: 'HPE Alletra Storage System', quantity: 1 },
      { sku: 'Q1J92A', description: 'HPE D3940 Expansion Shelf', quantity: 1 },
      { sku: 'P40243-B21', description: 'HPE SAS Mini-HD to Mini-HD Cable', quantity: 1 }
    ];
    res = evalStorageTriMode(invalidItems);
    assert.strictEqual(res.missingDaisyChainCables, true);
  });

  await t.test('4. Validates minimum drive counts per RAID type', async (t2) => {
    await t2.test('RAID-6 >= 6 SSDs', () => {
      // Valid: 6 SSDs
      let items = [
        { sku: 'R0Q21A', description: 'HPE Alletra Storage System', quantity: 1 },
        { sku: 'P11111', description: 'HPE 1.92TB SAS SSD', quantity: 6 },
        { sku: 'FIO-R6', description: 'RAID 6 Configuration', quantity: 1 }
      ];
      let res = evalStorageTriMode(items);
      assert.strictEqual(res.hasRaid6, true);
      assert.strictEqual(res.ssdCount, 6);
      assert.strictEqual(res.insufficientRaid6Drives, false);

      // Invalid: 5 SSDs
      items = [
        { sku: 'R0Q21A', description: 'HPE Alletra Storage System', quantity: 1 },
        { sku: 'P11111', description: 'HPE 1.92TB SAS SSD', quantity: 5 },
        { sku: 'FIO-R6', description: 'RAID 6 Configuration', quantity: 1 }
      ];
      res = evalStorageTriMode(items);
      assert.strictEqual(res.insufficientRaid6Drives, true);
    });

    await t2.test('RAID-10 >= 4 SSDs', () => {
      // Valid: 4 SSDs
      let items = [
        { sku: 'R0Q21A', description: 'HPE Alletra Storage System', quantity: 1 },
        { sku: 'P11111', description: 'HPE 1.92TB SAS SSD', quantity: 4 },
        { sku: 'FIO-R10', description: 'RAID 10 Configuration', quantity: 1 }
      ];
      let res = evalStorageTriMode(items);
      assert.strictEqual(res.hasRaid10, true);
      assert.strictEqual(res.ssdCount, 4);
      assert.strictEqual(res.insufficientRaid10Drives, false);

      // Invalid: 3 SSDs
      items = [
        { sku: 'R0Q21A', description: 'HPE Alletra Storage System', quantity: 1 },
        { sku: 'P11111', description: 'HPE 1.92TB SAS SSD', quantity: 3 },
        { sku: 'FIO-R10', description: 'RAID 10 Configuration', quantity: 1 }
      ];
      res = evalStorageTriMode(items);
      assert.strictEqual(res.insufficientRaid10Drives, true);
    });
  });
});
