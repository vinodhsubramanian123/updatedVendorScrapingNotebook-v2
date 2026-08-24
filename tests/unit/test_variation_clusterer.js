'use strict';
const assert = require('assert');
const { extractHardwareProfile, calculateImprobabilityMetrics, buildConfigDiffMatrix } = require('../../scripts/lib/preprocessor/variation_clusterer.js');

function runTests() {
  console.log('🧪 Starting Variation Clusterer Test Suite...');

  const mockItemsHighTdp = [
    { sku: 'P76706-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 1, atomicQuantity: 1 },
    { sku: 'P49033-B21', description: 'HPE DL38X Gen12 Intel Xeon-G 6430 250W CPU', quantity: 2, atomicQuantity: 2 },
    { sku: 'P43331-B21', description: 'HPE 64GB 2Rx4 PC5-4800B-R Smart Memory Kit', quantity: 32, atomicQuantity: 32 },
    { sku: 'P40502-B21', description: 'HPE 800GB NVMe Gen4 High Performance SSD', quantity: 8, atomicQuantity: 8 },
    { sku: 'P36877-B21', description: 'DC Power Cable Lug Kit', quantity: 1, atomicQuantity: 1 },
    { sku: 'P12345-B21', description: 'HPE 1600W -48VDC Power Supply Kit', quantity: 2, atomicQuantity: 2 }
  ];

  const mockItemsLowTdp = [
    { sku: 'P56900-B21', description: 'HPE ProLiant DL380 Gen11 8SFF CTO Server', quantity: 1, atomicQuantity: 1 },
    { sku: 'P49030-B21', description: 'HPE DL38X Gen11 Intel Xeon-S 4410Y 150W CPU', quantity: 1, atomicQuantity: 1 },
    { sku: 'P43328-B21', description: 'HPE 32GB 2Rx4 PC5-4800B-R Smart Memory Kit', quantity: 4, atomicQuantity: 4 },
    { sku: 'P40502-B21', description: 'HPE 800GB NVMe Gen4 High Performance SSD', quantity: 2, atomicQuantity: 2 },
    { sku: 'P12346-B21', description: 'HPE 800W Flex Slot Platinum Hot Plug Low Halogen Power Supply Kit', quantity: 2, atomicQuantity: 2 }
  ];

  console.log('▶ Test: extractHardwareProfile');
  const profileHigh = extractHardwareProfile(mockItemsHighTdp);
  assert.strictEqual(profileHigh.cpuCount, 2, 'Should extract 2 CPUs');
  assert.strictEqual(profileHigh.maxTdpWatts, 250, 'Should extract 250W TDP');
  assert.strictEqual(profileHigh.dimmCount, 32, 'Should extract 32 DIMMs');
  assert.strictEqual(profileHigh.driveCount, 8, 'Should extract 8 drives');
  assert.strictEqual(profileHigh.hasDcLugKit, true, 'Should detect DC lug kit');
  assert.strictEqual(profileHigh.psuType, '-48VDC Telco Power', 'Should detect DC power type');

  const profileLow = extractHardwareProfile(mockItemsLowTdp);
  assert.strictEqual(profileLow.cpuCount, 1, 'Should extract 1 CPU');
  assert.strictEqual(profileLow.maxTdpWatts, 150, 'Should extract 150W TDP');
  assert.strictEqual(profileLow.dimmCount, 4, 'Should extract 4 DIMMs');

  console.log('▶ Test: calculateImprobabilityMetrics');
  // High TDP without high-perf fans, -48VDC with Lug kit
  const mockItemsHighTdpNoFans = [
      ...mockItemsHighTdp.slice(0, 3)
  ];
  // P48820-B21 is high perf fan kit. Let's make sure it's absent
  const profileHighNoFans = extractHardwareProfile(mockItemsHighTdpNoFans);
  const metricsHigh = calculateImprobabilityMetrics({ profile: profileHighNoFans, items: mockItemsHighTdpNoFans });
  assert.ok(metricsHigh.anomalies.some(a => a.type === 'HIGH_TDP_THERMAL_IMPROBABILITY'), 'Should flag high TDP anomaly');

  // Unbalanced single channel memory (2 CPUs, 1 DIMM)
  const mockItemsUnbalanced = [
    { sku: 'P76706-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 1, atomicQuantity: 1 },
    { sku: 'P49033-B21', description: 'HPE DL38X Gen12 Intel Xeon-G 6430 180W CPU', quantity: 2, atomicQuantity: 2 },
    { sku: 'P43331-B21', description: 'HPE 64GB 2Rx4 PC5-4800B-R Smart Memory Kit', quantity: 1, atomicQuantity: 1 }
  ];
  const profileUnbalanced = extractHardwareProfile(mockItemsUnbalanced);
  const metricsUnbalanced = calculateImprobabilityMetrics({ profile: profileUnbalanced, items: mockItemsUnbalanced });
  assert.ok(metricsUnbalanced.anomalies.some(a => a.type === 'UNBALANCED_CPU_RAM_RATIO'), 'Should flag unbalanced CPU/RAM anomaly');

  console.log('▶ Test: buildConfigDiffMatrix');
  const variations = [
    { configId: 'config_1', name: 'High Perf Node', profile: profileHigh },
    { configId: 'config_2', name: 'Low Perf Node', profile: profileLow }
  ];
  const diffMatrix = buildConfigDiffMatrix(variations);

  assert.strictEqual(diffMatrix.comparedConfigs.length, 2, 'Should compare 2 configs');

  const cpuDiff = diffMatrix.differences.find(d => d.aspect.includes('Processor'));
  assert.ok(cpuDiff, 'Should identify processor differences');

  const ramDiff = diffMatrix.differences.find(d => d.aspect.includes('Memory'));
  assert.ok(ramDiff, 'Should identify memory differences');

  const psuDiff = diffMatrix.differences.find(d => d.aspect.includes('Power'));
  assert.ok(psuDiff, 'Should identify power differences');

  console.log('✅ All Variation Clusterer tests passed!\n');
}

runTests();
