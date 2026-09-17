'use strict';

const assert = require('assert');

async function runTests() {
  console.log('🧪 Starting Eval Normalizer Test Suite...');

  // Since evalNormalizer.js is an ES module, we must import it dynamically
  const { buildAspectChecksFromEval } = await import('../../dashboard/src/services/evalNormalizer.js');

  console.log('▶ Test: Empty or null input');
  assert.deepStrictEqual(buildAspectChecksFromEval(null), [], 'Should return empty array for null');
  assert.deepStrictEqual(buildAspectChecksFromEval({}), [], 'Should return empty array for empty object');

  console.log('▶ Test: All PASS scenario');
  const passData = {
    cpuCount: 2,
    maxCpuTdpWatts: 250,
    hasHighPerfFans: true,
    isBalancedChannel: true,
    memoryCount: 16,
    totalMemoryGb: 512,
    driveCount: 8,
    hasSmartBattery: true,
    requiredPcieCards: 4,
    totalPcieSlotsAvailable: 8,
    hasOcpAdapter: true,
    hasDcPowerSupply: true,
    hasDcLugKit: true,
    hasSupportService: true
  };

  const passResult = buildAspectChecksFromEval(passData);
  assert.strictEqual(passResult.length, 7, 'Should generate 7 aspect checks');
  passResult.forEach(aspect => {
    assert.strictEqual(aspect.status, 'PASS', `Aspect ${aspect.name} should pass`);
  });

  // Check specific details for formatting correctness
  const computeAspect = passResult.find(a => a.id === 1);
  assert.ok(computeAspect.detail.includes('2 CPUs'), 'Should format CPUs correctly');
  assert.ok(computeAspect.detail.includes('250W'), 'Should format TDP correctly');
  assert.ok(computeAspect.detail.includes('✅'), 'Should format High-Perf Fans correctly');

  console.log('▶ Test: All FAIL scenario');
  const failData = {
    hasHighPerfFans: false,
    isBalancedChannel: false,
    hasSmartBattery: false,
    requiredPcieCards: 10,
    totalPcieSlotsAvailable: 8,
    hasDcPowerSupply: true,
    hasDcLugKit: false
  };

  const failResult = buildAspectChecksFromEval(failData);
  assert.strictEqual(failResult.length, 7, 'Should generate 7 aspect checks');

  // Specific failing aspects
  const failAspects = failResult.filter(a => a.status === 'FAIL');
  assert.strictEqual(failAspects.length, 5, 'Should have 5 failing aspects');

  const pcieAspect = failResult.find(a => a.id === 4);
  assert.strictEqual(pcieAspect.status, 'FAIL', 'PCIe should fail due to lacking slots');

  const powerAspect = failResult.find(a => a.id === 6);
  assert.strictEqual(powerAspect.status, 'FAIL', 'Power should fail due to missing lug kit for DC PSU');
  assert.ok(powerAspect.detail.includes('Lug Kit: ❌'), 'Should format missing lug kit correctly');

  console.log('▶ Test: Default fallbacks (undefined values)');
  const defaultData = {
    cpuCount: 1
  };
  const defaultResult = buildAspectChecksFromEval(defaultData);
  assert.strictEqual(defaultResult.length, 7, 'Should generate 7 aspect checks for default data');

  const defaultCompute = defaultResult.find(a => a.id === 1);
  assert.strictEqual(defaultCompute.status, 'UNKNOWN', 'Compute must be UNKNOWN if hasHighPerfFans is undefined');

  const defaultPower = defaultResult.find(a => a.id === 6);
  assert.strictEqual(defaultPower.status, 'UNKNOWN', 'Power must be UNKNOWN if power supply type is undefined');

  console.log('▶ Test: Hoisting of evidence health and deliverable paths');
  const { normalizeEvalResult } = await import('../../dashboard/src/services/evalNormalizer.js');
  const normalized = normalizeEvalResult({
    data: {
      traceId: 'TRC-TEST-123',
      evidenceHealth: { healthy: true, gaps: [], workflowStatus: 'COMPLETE' },
      portalWorkbookPath: 'outputs/temp/test_Partner_Portal.xlsx',
      deliveryError: null,
      manifestSha256: 'abc123sha'
    }
  });
  assert.strictEqual(normalized.evidenceHealth?.healthy, true, 'evidenceHealth should be hoisted');
  assert.strictEqual(normalized.portalWorkbookPath, 'outputs/temp/test_Partner_Portal.xlsx', 'portalWorkbookPath should be hoisted');
  assert.strictEqual(normalized.manifestSha256, 'abc123sha', 'manifestSha256 should be hoisted');

  console.log('✅ All Eval Normalizer tests passed!\n');
}

runTests().catch(err => {
  console.error('Fatal Test Error:', err);
  process.exit(1);
});
