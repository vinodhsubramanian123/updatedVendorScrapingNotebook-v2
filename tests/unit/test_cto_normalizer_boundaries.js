'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { detectAndNormalizeAtomicCto } = require('../../scripts/lib/preprocessor/cto_normalizer.js');
const { extractHardwareProfile } = require('../../scripts/lib/preprocessor/variation_clusterer.js');

test('CTO Normalizer and Variation Clusterer Boundary Tests', async (t) => {

  await t.test('(1) multi-chassis string parsing with anomalous whitespace and formatting', () => {
    const items = [
      { sku: 'P52534-B21', description: '  HPE   ProLiant    DL360 Gen11 \t CTO Server ', quantity: 2 },
      { sku: 'P12345', description: 'Intel Xeon-Gold 6330 2.0GHz 28-core  1 8 0 \t W   Processor', quantity: 4 },
      { sku: 'P12346', description: 'Intel Xeon-Gold 6330 2.0GHz 28-core  280   W   Processor', quantity: 4 },
      { sku: 'P12347', description: 'HPE 32 GB \n\r (1x32GB) Dual Rank x4 DDR4-3200 CAS-22-22-22 Registered Smart Memory Kit', quantity: 8 },
      { sku: 'P12348', description: 'HPE 800  GB NVMe Gen4 High Performance Mixed Use SFF SC U.3 PM1735a SSD', quantity: 4 }
    ];

    const profile = extractHardwareProfile(items);
    
    assert.strictEqual(profile.cpuCount, 8);
    assert.strictEqual(profile.maxTdpWatts, 280);
    assert.strictEqual(profile.totalRamGb, 256);
    assert.strictEqual(profile.driveCount, 4);
    assert.strictEqual(profile.driveMedia.includes('NVMe SSD'), true);
  });

  await t.test('(2) nested CTO multiplier splitting', () => {
    const items = [
      { sku: 'P56900-B21', description: 'HPE ProLiant DL380 Gen11 8SFF CTO Server', quantity: 2 },
      { sku: 'P49145-B21', description: 'Intel Xeon-Silver 4410Y 2.0GHz 12-core 150W Processor Kit', quantity: 5 },
      { sku: 'P43322-B21', description: 'HPE 32GB 2Rx4 PC5-4800B-R Smart Kit', quantity: 8 }
    ];

    const options = { explicitMultiplier: 3 };
    const res = detectAndNormalizeAtomicCto(items, options);
    
    assert.strictEqual(res.baseChassisQty, 2);
    assert.strictEqual(res.isMultipliedOrder, true);
    assert.strictEqual(res.hasNonIntegerDivisor, true);
    assert.strictEqual(res.ctoAnomalies.length, 1);
    assert.strictEqual(res.ctoAnomalies[0].type, 'NON_INTEGER_CTO_DIVISOR_ANOMALY');
    assert.strictEqual(res.ctoAnomalies[0].perUnitQty, 2.5);
    
    const cpuItem = res.items.find(i => i.sku === 'P49145-B21');
    assert.strictEqual(cpuItem.atomicQuantity, 2.5);
    assert.strictEqual(cpuItem.isIntegerDivisor, false);

    const ramItem = res.items.find(i => i.sku === 'P43322-B21');
    assert.strictEqual(ramItem.atomicQuantity, 4);
    assert.strictEqual(ramItem.isIntegerDivisor, true);
  });

  await t.test('(3) unicode punctuation normalization', () => {
    const items = [
      { sku: 'P52534-B21', description: 'HPE ProLiant DL360 Gen11 CTO Server', quantity: 1 },
      { sku: 'P12345', description: 'Intel Xeon-Gold 6330 2.0GHz 28-core\u00A0 280\u00A0W\u00A0Processor', quantity: 2 },
      { sku: 'P12347', description: 'HPE 32\u00A0GB (1x32GB) RAM Kit', quantity: 4 }
    ];

    const profile = extractHardwareProfile(items);
    assert.strictEqual(profile.maxTdpWatts, 280);
    assert.strictEqual(profile.totalRamGb, 128);
  });

  await t.test('(4) deduplication across split line items with varied quantity rolls', () => {
    const items = [
      { sku: 'P76706-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO', quantity: 1 },
      { sku: 'P11111', description: 'CPU', quantity: 6 },
      { sku: 'P22222', description: 'RAM', quantity: 24 }
    ];
    const options = { explicitMultiplier: 3 };
    const res = detectAndNormalizeAtomicCto(items, options);
    
    assert.strictEqual(res.baseChassisQty, 3);
    assert.strictEqual(res.isMultipliedOrder, true);
    
    const cpuItem = res.items.find(i => i.sku === 'P11111');
    assert.strictEqual(cpuItem.atomicQuantity, 2);
    assert.strictEqual(cpuItem.totalQuantity, 6);
    
    const ramItem = res.items.find(i => i.sku === 'P22222');
    assert.strictEqual(ramItem.atomicQuantity, 8);
    assert.strictEqual(ramItem.totalQuantity, 24);
    
    const itemsAtomic = [
      { sku: 'P76706-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO', quantity: 1 },
      { sku: 'P11111', description: 'CPU', quantity: 2 },
      { sku: 'P22222', description: 'RAM', quantity: 8 }
    ];
    const resAtomic = detectAndNormalizeAtomicCto(itemsAtomic, options);
    
    const cpuItemAtomic = resAtomic.items.find(i => i.sku === 'P11111');
    assert.strictEqual(cpuItemAtomic.atomicQuantity, 2);
    assert.strictEqual(cpuItemAtomic.totalQuantity, 6);
    
    const ramItemAtomic = resAtomic.items.find(i => i.sku === 'P22222');
    assert.strictEqual(ramItemAtomic.atomicQuantity, 8);
    assert.strictEqual(ramItemAtomic.totalQuantity, 24);
  });

});
