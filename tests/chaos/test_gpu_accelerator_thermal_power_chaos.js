'use strict';
/**
 * test_gpu_accelerator_thermal_power_chaos.js
 * Chaos & Boundary Stress Test Suite for GPU Accelerator Power, Thermal and Bifurcation Envelopes.
 *
 * Adheres to Invariants INV-27 (Multi-GPU Titanium PSU mandate).
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { evaluatePhysicalMath } = require('../../scripts/lib/boq/boq_evaluator.js');
const { evalPcieRiserSlots } = require('../../scripts/lib/aspects/pcie_riser.js');

describe('GPU Accelerator Power, Thermal and Bifurcation Envelopes Chaos Suite', () => {

  it('1. Multi-GPU Thermal Envelope: 4x NVIDIA L40S mandates dual 1800W Titanium PSUs (INV-27)', () => {
    const items = [
      { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF CTO Server', quantity: 1 },
      { sku: 'P38995-B21', description: 'HPE 800W Flex Slot Platinum Power Supply', quantity: 2 },
      { sku: 'S0K89A', description: 'NVIDIA L40S 48GB PCIe GPU Accelerator', quantity: 4 }
    ];
    const evalResult = evaluatePhysicalMath(items, null, '');
    const titaniumMissing = evalResult.missingDependencies.find(d => d.key === 'TITANIUM_PSU_MULTI_GPU');
    assert.ok(titaniumMissing, 'Missing dependency for Titanium PSUs should be flagged for 4x GPUs');
    assert.strictEqual(titaniumMissing.sku, 'P44712-B21');
  });

  it('2. Multi-GPU Thermal Envelope: 2x H100 mandates dual 1800W Titanium PSUs (INV-27)', () => {
    const items = [
      { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF CTO Server', quantity: 1 },
      { sku: 'P38995-B21', description: 'HPE 800W Flex Slot Platinum Power Supply', quantity: 2 },
      { sku: 'S0E21A', description: 'NVIDIA H100 80GB PCIe GPU Accelerator', quantity: 2 }
    ];
    const evalResult = evaluatePhysicalMath(items, null, '');
    const titaniumMissing = evalResult.missingDependencies.find(d => d.key === 'TITANIUM_PSU_MULTI_GPU');
    assert.ok(titaniumMissing, 'Missing dependency for Titanium PSUs should be flagged for 2x H100');
    assert.strictEqual(titaniumMissing.sku, 'P44712-B21');
  });

  it('3. GPU Auxiliary Power Cable Kits: 1 per GPU required', () => {
    const items = [
      { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF CTO Server', quantity: 1 },
      { sku: 'S0K89A', description: 'NVIDIA L40S 48GB PCIe GPU Accelerator', quantity: 3 },
      { sku: 'P48816-B21', description: 'GPU Aux Power Cable Kit', quantity: 1 } // missing 2
    ];
    const evalResult = evaluatePhysicalMath(items, null, '');
    const cableMissing = evalResult.missingDependencies.find(d => d.key === 'GPU_AUX_POWER_CABLE_KIT');
    assert.ok(cableMissing, 'Missing dependency for GPU Aux Power Cable Kit should be flagged');
    assert.strictEqual(cableMissing.quantity, 2, 'Should request exactly the delta (3 GPUs - 1 provided = 2 required)');
  });

  it('4. High-Performance Fan Kit (P48820-B21) mandatory for any GPU', () => {
    const items = [
      { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF CTO Server', quantity: 1 },
      { sku: 'S0K89A', description: 'NVIDIA L40S 48GB PCIe GPU Accelerator', quantity: 1 }
      // missing fan kit
    ];
    const evalResult = evaluatePhysicalMath(items, null, '');
    const fanMissing = evalResult.missingDependencies.find(d => d.key === 'HIGH_PERF_FAN_KIT' || d.reasoning.includes('High-Performance Fan Kit'));
    assert.ok(fanMissing, 'Missing dependency for High-Performance Fan Kit should be flagged');
    assert.strictEqual(fanMissing.sku, 'P48820-B21');
  });

  it('5. PCIe Gen5 x16 slot bandwidth bifurcation checks (Active Slots Math)', () => {
    const items = [
      { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF CTO Server', quantity: 1 },
      { sku: 'P48803-B21', description: 'Primary Riser', quantity: 1 },
      // no primary cable kit
      { sku: 'S0K89A', description: 'NVIDIA L40S 48GB PCIe GPU Accelerator', quantity: 4 } // requires 4 slots
    ];

    // Evaluate pcie slots explicitly
    const pcieResult = evalPcieRiserSlots(items);
    assert.ok(pcieResult.requiredPcieCards >= 4, 'Should detect 4 PCIe cards');
    assert.strictEqual(pcieResult.activeSlotsAvailable, 2, 'Primary Riser without cable kit only provides 2 active slots');
    assert.strictEqual(pcieResult.isExceedingActiveSlots, true, 'Should flag exceeding active slots');
  });
});
