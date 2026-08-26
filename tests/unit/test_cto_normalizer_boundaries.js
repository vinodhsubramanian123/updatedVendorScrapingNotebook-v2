'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { detectAndNormalizeAtomicCto } = require('../../scripts/lib/preprocessor/cto_normalizer.js');
const { extractHardwareProfile } = require('../../scripts/lib/preprocessor/variation_clusterer.js');

test('CTO Normalizer and Variation Clusterer Boundary Tests', async (t) => {

  await t.test('(1) multi-chassis string parsing with anomalous whitespace and formatting', () => {
    // extractHardwareProfile looks for things like "processor", "\d+ w", "\d+ gb", etc.
    const items = [
      { sku: 'P52534-B21', description: '  HPE   ProLiant    DL360 Gen11 \t CTO Server ', quantity: 2 },
      { sku: 'P12345', description: 'Intel Xeon-Gold 6330 2.0GHz 28-core  1 8 0 \t W   Processor', quantity: 4 }, // "180 W" spread out won't match "\d{2,3} w" directly if spaces are inside the number, but let's test a realistic anomalous space "180  W"
      { sku: 'P12346', description: 'Intel Xeon-Gold 6330 2.0GHz 28-core  280   W   Processor', quantity: 4 },
      { sku: 'P12347', description: 'HPE 32 GB \n\r (1x32GB) Dual Rank x4 DDR4-3200 CAS-22-22-22 Registered Smart Memory Kit', quantity: 8 },
      { sku: 'P12348', description: 'HPE 800  GB NVMe Gen4 High Performance Mixed Use SFF SC U.3 PM1735a SSD', quantity: 4 }
    ];

    const profile = extractHardwareProfile(items);

    // CPU counts
    assert.strictEqual(profile.cpuCount, 8);
    // TDP should match 280 W
    assert.strictEqual(profile.maxTdpWatts, 280);
    // RAM should match 32 GB * 8
    assert.strictEqual(profile.totalRamGb, 256);
    // Drive count should match 4
    assert.strictEqual(profile.driveCount, 4);
    assert.strictEqual(profile.driveMedia.includes('NVMe SSD'), true);
  });

  await t.test('(2) nested CTO multiplier splitting', () => {
    // Base chassis quantity is 2, options.explicitMultiplier is 3
    const items = [
      { sku: 'P56900-B21', description: 'HPE ProLiant DL380 Gen11 8SFF CTO Server', quantity: 2 },
      { sku: 'P49145-B21', description: 'Intel Xeon-Silver 4410Y 2.0GHz 12-core 150W Processor Kit', quantity: 5 }, // non-integer anomaly
      { sku: 'P43322-B21', description: 'HPE 32GB 2Rx4 PC5-4800B-R Smart Kit', quantity: 8 }
    ];

    const options = { explicitMultiplier: 3 }; // Should be overridden by effectiveMultiplier = 3? Wait, cto_normalizer uses baseChassisQty (2) if baseChassisQty > 1, explicitMult only used if baseChassisQty == 1 or explicitMult > 1? Let's check logic: effectiveMultiplier = baseChassisQty > 1 ? baseChassisQty : (explicitMult > 1 ? explicitMult : 1);
    // If baseChassisQty is 2, effectiveMultiplier = 2.

    const res = detectAndNormalizeAtomicCto(items, options);

    assert.strictEqual(res.baseChassisQty, 2);
    assert.strictEqual(res.isMultipliedOrder, true);

    // P49145-B21 Qty 5, base is 2. 5/2 = 2.5 (non-integer)
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
    // Tests variations of hyphens, non-breaking spaces
    const items = [
      { sku: 'P52534-B21', description: 'HPE ProLiant DL360 Gen11 CTO Server', quantity: 1 },
      { sku: 'P12345', description: 'Intel Xeon-Gold 6330 2.0GHz 28-core\u00A0 280\u00A0W\u00A0Processor', quantity: 2 }, // non-breaking spaces
      { sku: 'P12347', description: 'HPE 32\u00A0GB (1x32GB) RAM Kit', quantity: 4 } // non-breaking spaces
    ];

    // the logic uses .toLowerCase().match(/(\d{2,3})\s*w/i), \s* matches non-breaking space
    const profile = extractHardwareProfile(items);
    assert.strictEqual(profile.maxTdpWatts, 280);
    assert.strictEqual(profile.totalRamGb, 128); // 32 * 4
  });

  await t.test('(4) deduplication across split line items with varied quantity rolls', () => {
    // areItemsAlreadyMultiplied logic
    const items = [
      { sku: 'P76706-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO', quantity: 1 },
      { sku: 'P11111', description: 'CPU', quantity: 6 },
      { sku: 'P22222', description: 'RAM', quantity: 24 }
    ];
    // if effective multiplier is 3, items might already be multiplied
    // effectiveMultiplier is 3
    const options = { explicitMultiplier: 3 };
    const res = detectAndNormalizeAtomicCto(items, options);

    assert.strictEqual(res.baseChassisQty, 3);
    assert.strictEqual(res.isMultipliedOrder, true);

    // check if it detected areItemsAlreadyMultiplied = true
    // "nonServiceItems.every(it => q >= effectiveMultiplier && Number.isInteger(q / effectiveMultiplier))"
    // 6 >= 3 (integer 2), 24 >= 3 (integer 8). So yes, they are already multiplied.

    const cpuItem = res.items.find(i => i.sku === 'P11111');
    assert.strictEqual(cpuItem.atomicQuantity, 2); // 6 / 3
    assert.strictEqual(cpuItem.totalQuantity, 6);

    const ramItem = res.items.find(i => i.sku === 'P22222');
    assert.strictEqual(ramItem.atomicQuantity, 8); // 24 / 3
    assert.strictEqual(ramItem.totalQuantity, 24);

    // Now test where they are NOT already multiplied (i.e. quantity is atomic)
    const itemsAtomic = [
      { sku: 'P76706-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO', quantity: 1 },
      { sku: 'P11111', description: 'CPU', quantity: 2 }, // < 3, so areItemsAlreadyMultiplied = false
      { sku: 'P22222', description: 'RAM', quantity: 8 }
    ];
    const resAtomic = detectAndNormalizeAtomicCto(itemsAtomic, options);

    const cpuItemAtomic = resAtomic.items.find(i => i.sku === 'P11111');
    assert.strictEqual(cpuItemAtomic.atomicQuantity, 2);
    assert.strictEqual(cpuItemAtomic.totalQuantity, 6); // 2 * 3

    const ramItemAtomic = resAtomic.items.find(i => i.sku === 'P22222');
    assert.strictEqual(ramItemAtomic.atomicQuantity, 8);
    assert.strictEqual(ramItemAtomic.totalQuantity, 24); // 8 * 3
  });

});
