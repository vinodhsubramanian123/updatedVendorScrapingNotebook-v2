'use strict';
/**
 * tests/unit/test_hardware_envelope_solver.js
 * Unit tests for Wave B Unified Hardware Capability Envelope & Category Min/Max Math Solver.
 */

const assert = require('assert');
const {
  computeCategoryBounds,
  solveMaxPcieAndOcpTopology,
  solveMaxGpuTopology,
  solveMemoryEnvelope,
  computeFullPlatformEnvelope
} = require('../../scripts/lib/rules/hardware_envelope_solver.js');
const { executeRoutedQuery } = require('../../scripts/evaluators/route_query.js');
const { buildToolRegistry } = require('../../scripts/lib/rag/agentic_guardrail.js');

async function run() {
  let passed = 0;
  async function check(name, fn) {
    await fn();
    console.log(`  PASS: ${name}`);
    passed++;
  }

  console.log('=== WAVE B HARDWARE ENVELOPE SOLVER TEST SUITE ===');

  await check('DL145_Gen11 has 1 socket, 1 OCP slot, 6-channel 1DPC memory (max 6 DIMMs)', () => {
    const env = computeFullPlatformEnvelope('DL145_Gen11');
    assert.strictEqual(env.cpu.maxSockets, 1);
    assert.strictEqual(env.ocp.maxSlots, 1);
    assert.strictEqual(env.memory.channelsPerSocket, 6);
    assert.strictEqual(env.memory.maxDimmsChassis, 6);
  });

  await check('DL360_Gen12 caps active PCIe at 2 (1P) or 3 (2P) and OCP 1->2 by CPU count', () => {
    const t1 = solveMaxPcieAndOcpTopology('DL360_Gen12', null, { cpuCount: 1 });
    const t2 = solveMaxPcieAndOcpTopology('DL360_Gen12', null, { cpuCount: 2 });
    assert.strictEqual(t1.ocp.maxSlots, 1);
    assert.strictEqual(t1.pcie.maxElectricallyActiveSlots, 2);
    assert.strictEqual(t2.ocp.maxSlots, 2);
    assert.strictEqual(t2.pcie.maxElectricallyActiveSlots, 3);
  });

  await check('DL380_Gen12 supports up to 8 active PCIe slots with Primary+Secondary+Tertiary risers & 3 DW / 8 SW GPUs', () => {
    const pcie = solveMaxPcieAndOcpTopology('DL380_Gen12', null, { cpuCount: 2 });
    const gpu = solveMaxGpuTopology('DL380_Gen12', null, { gpuModel: 'H100' });
    assert.strictEqual(pcie.pcie.maxElectricallyActiveSlots, 8);
    assert.strictEqual(pcie.pcie.maxX16Slots, 5);
    assert.strictEqual(gpu.maxDoubleWideGpus, 3);
    assert.strictEqual(gpu.maxSingleWideGpus, 8);
    assert.strictEqual(gpu.targetGpuSpec.tdpWatts, 350);
  });

  await check('DL380a_Gen12 supports up to 8 DW / 16 SW GPUs and 4+ PSUs', () => {
    const gpu = solveMaxGpuTopology('DL380a_Gen12', null, { gpuModel: 'L40S' });
    assert.strictEqual(gpu.maxDoubleWideGpus, 8);
    assert.strictEqual(gpu.maxSingleWideGpus, 16);
    assert.strictEqual(gpu.minPsuCountForMaxGpu, 4);
  });

  await check('DL385_Gen11 has 12-channel EPYC memory (24 DIMMs max across 2P)', () => {
    const mem = solveMemoryEnvelope('DL385_Gen11', null, { cpuCount: 2 });
    assert.strictEqual(mem.channelsPerSocket, 12);
    assert.strictEqual(mem.maxDimmsForCurrentCpus, 24);
  });

  await check('DL580_Gen12 supports 4 sockets, 16 PCIe slots at 4P, and 64 DIMMs max', () => {
    const env = computeFullPlatformEnvelope('DL580_Gen12', null, { cpuCount: 4 });
    assert.strictEqual(env.cpu.maxSockets, 4);
    assert.strictEqual(env.pcie.maxElectricallyActiveSlots, 16);
    assert.strictEqual(env.memory.maxDimmsChassis, 64);
  });

  await check('Synergy_12000_Frame enforces 6/12 valid PSU counts and 0 server OCP slots', () => {
    const env = computeFullPlatformEnvelope('Synergy_12000_Frame');
    assert.strictEqual(env.ocp.maxSlots, 0);
    assert.deepStrictEqual(env.power.validPsuCounts, [6, 12]);
  });

  await check('computeCategoryBounds aggregates scraped catalog subcategory minQty/maxQty accurately', () => {
    const bounds = computeCategoryBounds({
      subcategories: [
        { parentCategory: 'GPU / Accelerators', subCategory: 'Double Wide', minQty: 0, maxQty: 8 },
        { parentCategory: 'GPU / Accelerators', subCategory: 'Single Wide', minQty: 0, maxQty: 16 }
      ],
      entries: []
    }, 'gpu');
    assert.strictEqual(bounds.matchedSubcategories, 2);
    assert.strictEqual(bounds.minQty, 0);
    assert.strictEqual(bounds.maxQty, 16);
  });

  await check('Router dispatches envelope analytics queries to HARDWARE_ENVELOPE_ANALYTICS', async () => {
    const res = await executeRoutedQuery('What are the maximum PCIe slots and OCP ports with risers on DL380 Gen12?', {
      platformId: 'DL380_Gen12',
      offline: true
    });
    assert.strictEqual(res.classification?.intent || res.intent, 'HARDWARE_ENVELOPE_ANALYTICS');
    const resultObj = res.result || res;
    assert.strictEqual(resultObj.envelope.pcie.maxElectricallyActiveSlots, 8);
    assert.strictEqual(resultObj.envelope.ocp.maxSlots, 2);
  });

  await check('Unresolved platform cannot inherit a server hardware envelope', async () => {
    const res = await executeRoutedQuery('What are the maximum PCIe slots?', { offline: true });
    const result = res.result || res;
    assert.strictEqual(result.requiresHumanClarification, true);
    assert.strictEqual(result.envelope, undefined);
  });

  await check('Guardrail tool registry includes query_hardware_envelope', async () => {
    const registry = buildToolRegistry({ chassisId: 'DL380a_Gen12', catalogData: null, items: [] });
    assert.ok(registry.has('query_hardware_envelope'));
    const out = await registry.get('query_hardware_envelope').execute({ chassis_id: 'DL380a_Gen12', cpu_count: 2 });
    assert.strictEqual(out.gpu.maxDoubleWideGpus, 8);
  });

  console.log(`\nSUMMARY: ${passed} passed, 0 failed`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
