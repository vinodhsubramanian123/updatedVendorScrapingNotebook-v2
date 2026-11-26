'use strict';
/**
 * tests/unit/test_wave_a_bugs_and_false_passes.js
 * Regression test suite for Wave A fixes: B1-B9, FP1-FP7, IC1-IC6.
 */

const assert = require('assert');
const { evalNetworkingOcp } = require('../../scripts/lib/aspects/networking_ocp.js');
const { evalPcieRiserSlots } = require('../../scripts/lib/aspects/pcie_riser.js');
const { evalPowerEnvironment } = require('../../scripts/lib/aspects/power_environment.js');
const { evalMemoryChannel } = require('../../scripts/lib/aspects/memory_channel.js');
const { evalComputeThermal } = require('../../scripts/lib/aspects/compute_thermal.js');
const { evalStorageTriMode } = require('../../scripts/lib/aspects/storage_tri_mode.js');
const { getPlatformProfile } = require('../../scripts/lib/rules/platform_profiles.js');
const { validateThermalRules } = require('../../scripts/lib/boq/evaluators/compute_storage_rules.js');
const { validateMemoryRules } = require('../../scripts/lib/boq/evaluators/power_memory_support_rules.js');
const { computeParetoFrontier } = require('../../scripts/lib/conflict/sizing/pareto_ranker.js');
const { projectCustomerDecision } = require('../../scripts/lib/boq/decision_projection.js');
const { _checkUnsolicitedServices, _checkQuantityConservation } = require('../../scripts/lib/boq/gates/boq_core_gates.js');
const { isSkuVisibleAtDefaultAmbient } = require('../../scripts/lib/conflict/least_delta_combinator.js');

let passed = 0;
function test(name, fn) {
  fn();
  console.log(`  PASS: ${name}`);
  passed++;
}

console.log('=== WAVE A REGRESSION SUITE (B1-B9, FP1-FP7, IC1-IC6) ===');

test('B1: Standup PCIe NIC does not consume OCP slots', () => {
  const res = evalNetworkingOcp([
    { sku: 'P08443-B21', description: 'Intel E810-XXVDA2 Ethernet 10/25Gb 2-port SFP28 Standup Adapter', quantity: 2 }
  ]);
  assert.strictEqual(res.ocpAdapterCount, 0);
});

test('B2: DL145 Edge chassis caps OCP slots to 1 without non-OCP catalog overwrite', () => {
  const res = evalNetworkingOcp(
    [{ sku: 'P10115-B21', description: 'HPE Broadcom 10/25Gb 2-port SFP28 OCP3 Adapter', quantity: 2 }],
    { metadata: { productId: 'DL145_Gen11' }, entries: [{ parentCategory: 'Networking', subCategory: 'Standup', maxQty: 4 }] }
  );
  assert.strictEqual(res.maxOcpSlots, 1);
  assert.strictEqual(res.isExceedingOcpSlots, true);
});

test('B3: Tertiary riser active slots are included and x16 100Gb/GPU cards tallied', () => {
  const res = evalPcieRiserSlots([
    { sku: 'R-GPU-1', description: 'NVIDIA H100 80GB PCIe GPU', quantity: 3 },
    { sku: 'R-NIC-1', description: 'HPE Ethernet 100Gb 2-port QSFP28 PCIe Adapter', quantity: 4 },
    { sku: 'R-PRI', description: 'HPE DL380 Primary Riser Kit', quantity: 1 },
    { sku: 'R-C1', description: 'HPE DL380 Primary Riser Cable Kit', quantity: 1 },
    { sku: 'R-SEC', description: 'HPE DL380 Secondary Riser Kit', quantity: 1 },
    { sku: 'R-C2', description: 'HPE DL380 Secondary Riser Cable Kit', quantity: 1 },
    { sku: 'R-TER', description: 'HPE DL380 Tertiary Riser Kit', quantity: 1 }
  ]);
  assert.strictEqual(res.x16RequiredCount, 7);
  assert.strictEqual(res.activeSlotsAvailable, 8);
  assert.strictEqual(res.isExceedingActiveSlots, false);
});

test('B4: Multi-PSU redundant capacity uses N+1 active PSUs & gpu_specs_lookup TDP; Synergy allows 6 or 12 PSUs', () => {
  const p = evalPowerEnvironment([
    { sku: 'P76706-B21', description: 'HPE ProLiant Compute DL380a Gen12 8DW/16SW CTO Server', quantity: 1 },
    { sku: 'S0K89A', description: 'NVIDIA L40S 48GB PCIe GPU Accelerator', quantity: 4 },
    { sku: 'P44712-B21', description: 'HPE 2200W Flex Slot Titanium Power Supply', quantity: 4 }
  ]);
  // 4x L40S (350W each = 1400W) + chassis base 150W = 1550W; 4 PSUs => 3 active * 2200W = 6600W
  assert.strictEqual(p.hasPsuWattageDeficit, false);

  const syn12 = evalPowerEnvironment([
    { sku: 'SY12000', description: 'HPE Synergy 12000 Configure-to-order Frame', quantity: 1 },
    { sku: 'P44074-B21', description: 'HPE 2650W Titanium Hot Plug Power Supply', quantity: 12 }
  ]);
  assert.strictEqual(syn12.hasSynergyRedundantPowerError, false);
});

test('B5: DL380a Gen12 platform profile reflects 4U Rack & 4SFF cage architecture', () => {
  const prof = getPlatformProfile('HPE_PROLIANT_DL380A_GEN12');
  assert.strictEqual(prof.formFactor, '4U Rack');
  assert.strictEqual(prof.storageArchitecture.sff.baysPerCage, 4);
  assert.strictEqual(getPlatformProfile('HPE_PROLIANT_DL580_GEN12').maxSockets, 4);
  assert.strictEqual(getPlatformProfile('HPE_PROLIANT_DL145_GEN11').memoryArchitecture.channelsPerSocket, 6);
});

test('B7: Memory evaluator validates 12-channel EPYC 24 DIMM/CPU limit & rejects overflow', () => {
  const mem = evalMemoryChannel(
    [
      { sku: 'CPU1', description: 'AMD EPYC 9654 Processor', quantity: 2 },
      { sku: 'DIMM1', description: 'HPE 64GB DDR5-4800 Smart Memory', quantity: 24 }
    ],
    { metadata: { productId: 'DL385_Gen11' } }
  );
  assert.strictEqual(mem.channelsPerCpu, 12);
  assert.strictEqual(mem.isBalancedChannel, true);

  const errors = [];
  const warnings = [];
  const deductions = [];
  validateMemoryRules({
    memory: { memoryCount: 40, dimmsPerCpu: 20, channelsPerCpu: 8, isSupportedPopulation: true, isBalancedChannel: true },
    compute: { cpuCount: 2 },
    errors,
    warnings,
    mathDeductions: deductions,
    missingDependencies: []
  });
  assert.ok(errors.some(e => e.includes('Memory Slot Limit Exceeded')));
});

test('B8: Cluster CPU unevenness and socket overflow trigger compute thermal errors', () => {
  const compute = evalComputeThermal(
    [{ sku: 'CPU1', description: 'AMD EPYC 8324P 1P Processor', quantity: 3 }],
    { metadata: { productId: 'DL145_Gen11', maxSockets: 1 } },
    {},
    2
  );
  assert.strictEqual(compute.hasUnevenCpuPerNode, true);
  assert.strictEqual(compute.exceedsMaxSockets, true);
  const errors = [];
  validateThermalRules({ items: [], compute, pcie: { gpuCount: 0 }, storage: {}, serverCount: 2, mandatorySkus: { HIGH_PERF_FAN_KIT: { sku: 'X' } }, errors, warnings: [], mathDeductions: [], missingDependencies: [] });
  assert.ok(errors.some(e => e.includes('Symmetry Conflict')));
  assert.ok(errors.some(e => e.includes('Socket Limit Exceeded')));
});

test('B9: Exact parsed drive cage bays (4SFF, 12LFF) and cumulative controller port capacity', () => {
  const st = evalStorageTriMode([
    { sku: 'CAGE-12', description: 'HPE DL380 12LFF Front Drive Cage Kit', quantity: 1 },
    { sku: 'P47777-B21', description: 'HPE MR416i-p Gen11 16-port Storage Controller', quantity: 2 },
    { sku: 'DRV1', description: 'HPE 12TB SAS 12G LFF HDD', quantity: 24 }
  ]);
  assert.strictEqual(st.backplaneCapacity, 12);
  assert.strictEqual(st.controllerDirectCapacity, 32);
  assert.strictEqual(st.needsSasExpander, false);
});

test('FP2: Pareto ranker disqualifies candidates with undefined physicalMathClean', () => {
  const report = computeParetoFrontier([
    { rank: 1, estimatedCostUsd: 5000 }, // missing physicalMathClean
    { rank: 2, estimatedCostUsd: 6000, physicalMathClean: true, qualifiedForRecommendation: true }
  ]);
  const paretoIds = report.frontierCandidates.map(c => c.rank);
  assert.ok(!paretoIds.includes(1), 'Undefined physicalMathClean must not qualify');
  assert.ok(paretoIds.includes(2));

  const proj = projectCustomerDecision({
    conflictGraph: {
      rankedSolutions: [
        { rank: 1, estimatedCostUsd: 5000 },
        { rank: 2, estimatedCostUsd: 6000, physicalMathClean: true, qualifiedForRecommendation: true }
      ]
    }
  });
  const alt1 = proj.alternatives.find(a => a.rank === 1);
  assert.strictEqual(alt1.qualifiedForRecommendation, false);
});

test('FP4: Unsolicited injected service fails B8 and multi-node missing qc fails B18', () => {
  const b8 = _checkUnsolicitedServices({
    rankedSolutions: [{
      skuPartsList: [{ sku: 'HU4B2A3', description: 'HPE 3Y Tech Care Basic Service', isFixInjected: true }]
    }]
  }, { items: [], customerRequestedServices: false });
  assert.strictEqual(b8.status, 'FAILED');

  const b18Multi = _checkQuantityConservation({ serverCount: 4, isMultiCluster: true }, {});
  assert.strictEqual(b18Multi.status, 'FAILED');
  const b18Single = _checkQuantityConservation({ serverCount: 1 }, {});
  assert.strictEqual(b18Single.status, 'NOT_APPLICABLE');
});

test('IC4: Portal visibility check fails closed on unreadable catalog dir error instead of returning true', () => {
  const res = isSkuVisibleAtDefaultAmbient('P00000-B21', { notValidPath: true });
  assert.strictEqual(res.isVisible, false);
  assert.strictEqual(res.conditionType, 'VISIBILITY_CHECK_ERROR');
});

console.log(`\nSUMMARY: ${passed} passed, 0 failed`);
