'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { preprocessAndGroupBOQ } = require('../../scripts/lib/boq/boq_preprocessor');
const { detectAndNormalizeAtomicCto } = require('../../scripts/lib/preprocessor/cto_normalizer');
const { extractHardwareProfile, calculateImprobabilityMetrics } = require('../../scripts/lib/preprocessor/variation_clusterer');

test('Multi-Config BOQ Preprocessor Clustering & Normalization', async (t) => {
  await t.test('Complex multi-chassis quote containing mixed product families in a single document', (t2) => {
    // Generate text mimicking a multi-chassis document
    // We'll use segment block banners to ensure the parser groups them correctly
    const rawBoqText = `
Configuration 1 - Compute Node
P73282-B21	HPE ProLiant DL380 Gen12 8SFF CTO Server	2
P48820-B21	HPE DL38X Gen12 High Perf Fan Kit	8
P49611-B21	Intel Xeon-G 6430 2.1GHz 32-core 270W Processor	4

Configuration 2 - Storage
R0Q21A	HPE Alletra 5000 Base Array	1
R0Q22A	HPE Alletra 5000 Drive Enclosure	2

Configuration 3 - Tape Backup
Q6Q62B	HPE MSL3040 Scalable Base Module	1
Q6Q68A	HPE MSL LTO-8 SAS Drive Upgrade Kit	2
`;

    const result = preprocessAndGroupBOQ(rawBoqText);

    // There should be 3 configuration blocks detected
    assert.strictEqual(result.variations.length, 3, 'Should parse exactly 3 configuration blocks');

    const computeConf = result.variations[0];
    const storageConf = result.variations[1];
    const tapeConf = result.variations[2];

    assert.strictEqual(computeConf.chassis, 'DL380 Gen12 SFF', 'First config should be identified as DL380 Gen12');
    assert.strictEqual(computeConf.family, 'ProLiant', 'First config should be ProLiant family');

    assert.strictEqual(storageConf.chassis, 'Alletra Storage System', 'Second config should be identified as Alletra');
    assert.strictEqual(storageConf.solutionType, 'STORAGE', 'Second config should be STORAGE type');

    assert.strictEqual(tapeConf.chassis, 'MSL3040 Tape', 'Third config should be identified as MSL3040');
    assert.strictEqual(tapeConf.solutionType, 'TAPE', 'Third config should be TAPE type');
    assert.strictEqual(tapeConf.family, 'StoreEver', 'Third config should be StoreEver family');
  });

  await t.test('CTO multi-node splitting and fractional anomaly detection', (t2) => {
    // 5x chassis total in a batch, components scaled accordingly
    const items = [
      { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: '5' },
      { sku: 'P49611-B21', description: 'Intel Xeon-G 6430 2.1GHz 32-core 270W Processor', quantity: '10' }, // 2 per node
      { sku: 'P43322-B21', description: 'HPE 32GB 1Rx4 PC5-4800B-R Smart Kit', quantity: '40' }, // 8 per node
      { sku: 'P40502-B21', description: 'HPE 800W Flex Slot Platinum Hot Plug Low Halogen Power Supply Kit', quantity: '10' }, // 2 per node
      { sku: 'U44H5E', description: 'HPE 3 Year Tech Care Essential Service', quantity: '5' } // Service SKU, should remain as is or split integers
    ];

    const ctoNorm = detectAndNormalizeAtomicCto(items, { explicitMultiplier: 1 });

    assert.strictEqual(ctoNorm.isMultipliedOrder, true, 'Should detect a multiplied order based on base chassis qty');
    assert.strictEqual(ctoNorm.baseChassisQty, 5, 'Base chassis quantity should be 5');
    assert.strictEqual(ctoNorm.hasNonIntegerDivisor, false, 'Quantities should divide perfectly without fractional anomalies');

    const cpuItem = ctoNorm.items.find(i => i.sku === 'P49611-B21');
    assert.strictEqual(cpuItem.atomicQuantity, 2, 'CPU atomic quantity should be 2');
    assert.strictEqual(cpuItem.totalQuantity, 10, 'CPU total quantity should be 10');

    const ramItem = ctoNorm.items.find(i => i.sku === 'P43322-B21');
    assert.strictEqual(ramItem.atomicQuantity, 8, 'RAM atomic quantity should be 8');
    assert.strictEqual(ramItem.totalQuantity, 40, 'RAM total quantity should be 40');

    // Fractional anomaly test
    const invalidItems = [
      { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: '5' },
      { sku: 'P49611-B21', description: 'Intel Xeon-G 6430 2.1GHz 32-core 270W Processor', quantity: '7' } // 7 cannot divide by 5
    ];

    const invalidNorm = detectAndNormalizeAtomicCto(invalidItems, { explicitMultiplier: 1 });
    assert.strictEqual(invalidNorm.hasNonIntegerDivisor, true, 'Should flag non-integer divisor');
    assert.strictEqual(invalidNorm.ctoAnomalies.length, 1, 'Should generate one CTO anomaly');
    assert.strictEqual(invalidNorm.ctoAnomalies[0].type, 'NON_INTEGER_CTO_DIVISOR_ANOMALY', 'Anomaly type should match');
  });

  await t.test('BTO-to-FIO substitution detection and constraint anomalies', (t2) => {
    // A configuration missing high-perf fans with a high TDP processor
    const items = [
      { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: '1', atomicQuantity: 1 },
      { sku: 'P49611-B21', description: 'Intel Xeon-G 6430 2.1GHz 32-core 270W Processor', quantity: '2', atomicQuantity: 2 },
      { sku: 'P43322-B21', description: 'HPE 32GB 1Rx4 PC5-4800B-R Smart Memory Kit', quantity: '1', atomicQuantity: 1 } // Only 1 DIMM for 2 CPUs = channel imbalance
    ];

    const v = { items, hasNonIntegerDivisor: false, ctoAnomalies: [] };
    v.profile = extractHardwareProfile(v.items);

    assert.strictEqual(v.profile.cpuCount, 2, 'Should detect 2 processors');
    assert.strictEqual(v.profile.maxTdpWatts, 270, 'Max TDP should be parsed as 270W');
    assert.strictEqual(v.profile.hasHighPerfFans, false, 'High perf fans should be false as none were included');
    assert.strictEqual(v.profile.dimmCount, 1, 'Should detect 1 RAM DIMM');

    const metrics = calculateImprobabilityMetrics(v);

    // Check if HIGH_TDP_THERMAL_IMPROBABILITY is raised
    const hasThermalAnomaly = metrics.anomalies.some(a => a.type === 'HIGH_TDP_THERMAL_IMPROBABILITY');
    assert.strictEqual(hasThermalAnomaly, true, 'Should raise HIGH_TDP_THERMAL_IMPROBABILITY anomaly');

    // Check if UNBALANCED_CPU_RAM_RATIO is raised
    const hasBalanceAnomaly = metrics.anomalies.some(a => a.type === 'UNBALANCED_CPU_RAM_RATIO');
    assert.strictEqual(hasBalanceAnomaly, true, 'Should raise UNBALANCED_CPU_RAM_RATIO anomaly');

    assert.strictEqual(metrics.isHighlyAnomalous, true, 'Improbability index should exceed 0.35 threshold');
  });
});
