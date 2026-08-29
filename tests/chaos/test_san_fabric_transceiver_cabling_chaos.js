const test = require('node:test');
const assert = require('node:assert');
const { evalNetworkingOcp } = require('../../scripts/lib/aspects/networking_ocp.js');

test('SAN Fibre Channel & Top-of-Rack Switch Transceiver subsystem', async (t) => {
  await t.test('Validate 32Gb vs 64Gb FC HBA transceiver pairing - 32Gb valid', () => {
    const items = [
      { sku: 'P9D94A', description: 'HPE SN1610Q 32Gb 2-port Fibre Channel Host Bus Adapter', quantity: 1 },
      { sku: 'AJ718A', description: 'HPE 8Gb Short Wave Fibre Channel SFP+ 1 Pack 32Gb', quantity: 2 },
    ];
    const result = evalNetworkingOcp(items);
    assert.strictEqual(result.fcHbaCount, 1);
    assert.strictEqual(result.fcHbaPortCount32Gb, 2);
    assert.strictEqual(result.transceiverCount32Gb, 2);
    assert.strictEqual(result.isMissing32GbTransceivers, false);
  });

  await t.test('Validate 32Gb vs 64Gb FC HBA transceiver pairing - 32Gb missing transceivers', () => {
    const items = [
      { sku: 'P9D94A', description: 'HPE SN1610Q 32Gb 2-port Fibre Channel Host Bus Adapter', quantity: 1 },
      { sku: 'AJ718A', description: 'HPE 8Gb Short Wave Fibre Channel SFP+ 1 Pack 32Gb', quantity: 1 },
    ];
    const result = evalNetworkingOcp(items);
    assert.strictEqual(result.fcHbaPortCount32Gb, 2);
    assert.strictEqual(result.transceiverCount32Gb, 1);
    assert.strictEqual(result.isMissing32GbTransceivers, true);
  });

  await t.test('Validate 32Gb vs 64Gb FC HBA transceiver pairing - 64Gb valid', () => {
    const items = [
      { sku: 'R2E09A', description: 'HPE SN1610Q 64Gb 2-port Fibre Channel Host Bus Adapter', quantity: 1 },
      { sku: 'fake', description: 'HPE 64Gb Short Wave Fibre Channel SFP+ 1 Pack', quantity: 2 },
    ];
    const result = evalNetworkingOcp(items);
    assert.strictEqual(result.fcHbaPortCount64Gb, 2);
    assert.strictEqual(result.transceiverCount64Gb, 2);
    assert.strictEqual(result.isMissing64GbTransceivers, false);
  });

  await t.test('Validate Optical Patch Cable math - valid', () => {
    const items = [
      { sku: 'P9D94A', description: 'HPE SN1610Q 32Gb 2-port Fibre Channel Host Bus Adapter', quantity: 1 },
      { sku: 'AJ718A', description: 'HPE 8Gb Short Wave Fibre Channel SFP+ 1 Pack 32Gb', quantity: 2 },
      { sku: 'QK734A', description: 'HPE Premier Flex MPO/MPO Multi-mode OM4 12 Fiber 10m Cable OM4 LC-LC', quantity: 2 }
    ];
    const result = evalNetworkingOcp(items);
    assert.strictEqual(result.activeOpticalTransceiverCount, 2);
    assert.strictEqual(result.opticalPatchCableCount, 2);
    assert.strictEqual(result.isMissingOpticalPatchCables, false);
  });

  await t.test('Validate Optical Patch Cable math - missing', () => {
    const items = [
      { sku: 'P9D94A', description: 'HPE SN1610Q 32Gb 2-port Fibre Channel Host Bus Adapter', quantity: 1 },
      { sku: 'AJ718A', description: 'HPE 8Gb Short Wave Fibre Channel SFP+ 1 Pack 32Gb', quantity: 2 },
      { sku: 'QK734A', description: 'HPE Premier Flex MPO/MPO Multi-mode OM4 12 Fiber 10m Cable OM4 LC-LC', quantity: 1 }
    ];
    const result = evalNetworkingOcp(items);
    assert.strictEqual(result.activeOpticalTransceiverCount, 2);
    assert.strictEqual(result.opticalPatchCableCount, 1);
    assert.strictEqual(result.isMissingOpticalPatchCables, true);
  });

  await t.test('Validate Dual-Fabric SAN Redundancy - valid (2 switches)', () => {
    const items = [
      { sku: 'P9D94A', description: 'HPE SN1610Q 32Gb 2-port Fibre Channel Host Bus Adapter', quantity: 1 },
      { sku: 'switch1', description: 'B-series SN3600B SAN Switch', quantity: 2 }
    ];
    const result = evalNetworkingOcp(items);
    assert.strictEqual(result.sanSwitchCount, 2);
    assert.strictEqual(result.hasSanSinglePointOfFailure, false);
  });

  await t.test('Validate Dual-Fabric SAN Redundancy - warning (1 switch)', () => {
    const items = [
      { sku: 'P9D94A', description: 'HPE SN1610Q 32Gb 2-port Fibre Channel Host Bus Adapter', quantity: 1 },
      { sku: 'switch1', description: 'B-series SN3600B SAN Switch', quantity: 1 }
    ];
    const result = evalNetworkingOcp(items);
    assert.strictEqual(result.sanSwitchCount, 1);
    assert.strictEqual(result.hasSanSinglePointOfFailure, true);
  });

  await t.test('Validate 100Gb QSFP28 breakout cables math', () => {
    const items = [
      { sku: 'breakout', description: 'HPE 100Gb QSFP28 to 4x 25Gb SFP28 3m DAC Cable', quantity: 3 }
    ];
    const result = evalNetworkingOcp(items);
    assert.strictEqual(result.qsfp28BreakoutCableCount, 3);
  });
});
