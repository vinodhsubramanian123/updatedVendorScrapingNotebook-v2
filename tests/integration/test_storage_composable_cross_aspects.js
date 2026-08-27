const { describe, it } = require('node:test');
const assert = require('node:assert');

// Aspects
const { evalStorageTriMode } = require('../../scripts/lib/aspects/storage_tri_mode.js');
const { evalPcieRiserSlots } = require('../../scripts/lib/aspects/pcie_riser.js');
const { evalPowerEnvironment } = require('../../scripts/lib/aspects/power_environment.js');
const { evalComputeThermal } = require('../../scripts/lib/aspects/compute_thermal.js');

describe('Cross-Product Composable & Storage Cluster Validation Matrix', () => {

  it('1. Synergy Composable Platform Evaluates Without Unhandled Errors', () => {
    const items = [
      { sku: '797740-B21', description: 'HPE Synergy 12000 Configure-to-order Frame Chassis', quantity: 1 },
      { sku: 'P25902-B21', description: 'HPE Synergy 480 Gen10 Plus CTO Compute Module Chassis', quantity: 2 },
      { sku: '864273-B21', description: 'HPE Synergy 100Gb F32 Module', quantity: 1 },
      { sku: 'Q1J92A', description: 'HPE Synergy D3940 Storage Module', quantity: 1 },
      { sku: 'P28028-B21', description: 'HPE 2.4TB SAS 12G Mission Critical 10K SFF HDD', quantity: 40 }
    ];

    const storageSummary = evalStorageTriMode(items, null, {});
    assert.ok(storageSummary !== undefined, 'evalStorageTriMode returned successfully');
    
    const pcieSummary = evalPcieRiserSlots(items, null);
    assert.ok(pcieSummary !== undefined, 'evalPcieRiserSlots returned successfully');
  });

  it('2. Alletra Storage Systems - SAS Expander Logic Evaluates Correctly', () => {
    const items = [
      { sku: 'R0Q35A', description: 'HPE Alletra 6000 NVMe Storage Array Base System CTO Chassis', quantity: 1 },
      { sku: 'R4B02A', description: 'HPE Alletra 9000 4-way NVMe Base Chassis', quantity: 1 },
      { sku: 'P48835-B21', description: 'HPE ProLiant DL380 Gen11 24SFF SAS Expander Card Kit', quantity: 1 },
      { sku: 'P28028-B21', description: 'HPE 2.4TB SAS 12G Mission Critical 10K SFF HDD', quantity: 16 }
    ];

    const storageSummary = evalStorageTriMode(items, null, {});
    assert.ok(storageSummary !== undefined, 'evalStorageTriMode returned successfully');
    
    // As it has an expander (P48835-B21), it should either satisfy drive limits or evaluate successfully without errors
    assert.strictEqual(storageSummary.needsSasExpander, false, 'Should not need an expander as it is already present or correctly handled');
  });

  it('3. StoreEver MSL3040 Tape Library Evaluates Correctly', () => {
    const items = [
      { sku: 'Q2R41A', description: 'HPE StoreEver MSL3040 Tape Library Base Module CTO Chassis', quantity: 1 },
      { sku: 'Q6Q62B', description: 'HPE StoreEver MSL3040 Scalable Library Base Module', quantity: 1 }
    ];

    const storageSummary = evalStorageTriMode(items, null, {});
    assert.ok(storageSummary !== undefined, 'evalStorageTriMode returned successfully');
  });

  it('4. Cray Supercomputing GX5000 Evaluates Correctly', () => {
    const items = [
      { sku: 'P57100-B21', description: 'HPE Cray GX5000 Rack', quantity: 1 },
      { sku: 'P36877-B21', description: 'HPE 1600W -48VDC Power Cable Lug Kit', quantity: 2 },
      { sku: 'P17023-B21', description: 'HPE 1600W Flex Slot -48VDC Hot Plug Power Supply Kit', quantity: 2 },
      { sku: 'P48820-B21', description: 'High Performance Fan Kit (Liquid cooling simulation fallback)', quantity: 1 }
    ];

    const powerSummary = evalPowerEnvironment(items, null, { DC_LUG_KIT: { sku: 'P36877-B21' } });
    assert.ok(powerSummary !== undefined, 'evalPowerEnvironment returned successfully');
    assert.strictEqual(powerSummary.hasDcPowerSupply, true, 'Should detect -48VDC PSU');
    assert.strictEqual(powerSummary.hasDcLugKit, true, 'Should detect DC Lug Kit');

    const thermalSummary = evalComputeThermal(items, null, {}, 1);
    assert.ok(thermalSummary !== undefined, 'evalComputeThermal returned successfully');
  });
});