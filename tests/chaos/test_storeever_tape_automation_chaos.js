const test = require('node:test');
const assert = require('node:assert');

const { evalStorageTriMode } = require('../../scripts/lib/aspects/storage_tri_mode.js');
const { evalSupportManufacturing } = require('../../scripts/lib/aspects/support_manufacturing.js');

test('StoreEver Tape Automation Chaos - Drive Interface Math', async (t) => {
  await t.test('Missing Mini-SAS HD Cable for LTO SAS Drive', () => {
    const items = [
      { sku: 'Q2078A', description: 'HPE StoreEver LTO-8 Ultrium 30750 External Tape Drive (SAS)' }
    ];
    const result = evalStorageTriMode(items);
    assert.strictEqual(result.ltoSasDriveCount, 1);
    assert.strictEqual(result.needsMiniSasHdCable, true);
  });

  await t.test('Present Mini-SAS HD Cable for LTO SAS Drive', () => {
    const items = [
      { sku: 'Q2078A', description: 'HPE StoreEver LTO-8 Ultrium 30750 External Tape Drive (SAS)' },
      { sku: '716189-B21', description: 'HPE 2.0m External Mini SAS High Density to Mini SAS Cable' }
    ];
    const result = evalStorageTriMode(items);
    assert.strictEqual(result.ltoSasDriveCount, 1);
    assert.strictEqual(result.needsMiniSasHdCable, false);
  });

  await t.test('Missing FC Transceiver for LTO FC Drive', () => {
    const items = [
      { sku: 'Q2078A', description: 'HPE StoreEver LTO-8 Ultrium 30750 External Tape Drive (FC)' }
    ];
    const result = evalStorageTriMode(items);
    assert.strictEqual(result.ltoFcDriveCount, 1);
    assert.strictEqual(result.needsFcTransceiver, true);
  });

  await t.test('Present FC Transceiver for LTO FC Drive', () => {
    const items = [
      { sku: 'Q2078A', description: 'HPE StoreEver LTO-8 Ultrium 30750 External Tape Drive (FC)' },
      { sku: 'AJ716B', description: 'HPE 8Gb Short Wave B-Series Fibre Channel 1 Pack SFP+ Transceiver' }
    ];
    const result = evalStorageTriMode(items);
    assert.strictEqual(result.ltoFcDriveCount, 1);
    assert.strictEqual(result.needsFcTransceiver, false);
  });
});

test('StoreEver Tape Automation Chaos - Cartridge Slot Capacity Math', async (t) => {
  await t.test('Base Module only (40 slots)', () => {
    const items = [
      { sku: 'Q6Q62B', description: 'HPE StoreEver MSL3040 Scalable Base Module' },
      { sku: 'Q2078A', description: 'HPE LTO-8 Ultrium 30TB RW Data Cartridge', quantity: 40 }
    ];
    const result = evalStorageTriMode(items);
    assert.strictEqual(result.totalMsl3040Slots, 40);
    assert.strictEqual(result.exceedsSlotCapacity, false);
  });

  await t.test('Base Module only with exceeding cartridges (41 slots)', () => {
    const items = [
      { sku: 'Q6Q62B', description: 'HPE StoreEver MSL3040 Scalable Base Module' },
      { sku: 'Q2078A', description: 'HPE LTO-8 Ultrium 30TB RW Data Cartridge', quantity: 41 }
    ];
    const result = evalStorageTriMode(items);
    assert.strictEqual(result.totalMsl3040Slots, 40);
    assert.strictEqual(result.exceedsSlotCapacity, true);
  });

  await t.test('Base + 1 Expansion Module (80 slots)', () => {
    const items = [
      { sku: 'Q6Q62B', description: 'HPE StoreEver MSL3040 Scalable Base Module' },
      { sku: 'Q6Q63A', description: 'HPE StoreEver MSL3040 Scalable Expansion Module' },
      { sku: 'Q2078A', description: 'HPE LTO-8 Ultrium 30TB RW Data Cartridge', quantity: 80 }
    ];
    const result = evalStorageTriMode(items);
    assert.strictEqual(result.totalMsl3040Slots, 80);
    assert.strictEqual(result.exceedsSlotCapacity, false);
  });

  await t.test('Max Expansion Modules (280 slots boundary check)', () => {
    const items = [
      { sku: 'Q6Q62B', description: 'HPE StoreEver MSL3040 Scalable Base Module' },
      { sku: 'Q6Q63A', description: 'HPE StoreEver MSL3040 Scalable Expansion Module', quantity: 6 },
      { sku: 'Q2078A', description: 'HPE LTO-8 Ultrium 30TB RW Data Cartridge', quantity: 280 }
    ];
    const result = evalStorageTriMode(items);
    assert.strictEqual(result.totalMsl3040Slots, 280);
    assert.strictEqual(result.exceedsMaxMsl3040Slots, false);
    assert.strictEqual(result.exceedsSlotCapacity, false);
  });

  await t.test('Exceeding Max Expansion Modules (>280 slots)', () => {
    const items = [
      { sku: 'Q6Q62B', description: 'HPE StoreEver MSL3040 Scalable Base Module' },
      { sku: 'Q6Q63A', description: 'HPE StoreEver MSL3040 Scalable Expansion Module', quantity: 7 },
      { sku: 'Q2078A', description: 'HPE LTO-8 Ultrium 30TB RW Data Cartridge', quantity: 281 }
    ];
    const result = evalStorageTriMode(items);
    assert.strictEqual(result.exceedsMaxMsl3040Slots, true);
    assert.strictEqual(result.totalMsl3040Slots, 280); // Cap at max
    assert.strictEqual(result.exceedsSlotCapacity, true);
  });
});

test('StoreEver Tape Automation Chaos - Cleaning and Barcode Labels', async (t) => {
  await t.test('1 to 20 Cartridges (needs 1 cleaning tape, 1 barcode label)', () => {
    const items = [
      { sku: 'Q2078A', description: 'HPE LTO-8 Ultrium 30TB RW Data Cartridge', quantity: 20 }
    ];
    const result = evalSupportManufacturing(items);
    assert.strictEqual(result.dataCartridgeCount, 20);
    assert.strictEqual(result.expectedCleaningCartridges, 1);
    assert.strictEqual(result.needsMoreCleaningCartridges, true);
    assert.strictEqual(result.missingCleaningCartridges, 1);
    
    assert.strictEqual(result.expectedBarcodeLabels, 1);
    assert.strictEqual(result.needsMoreBarcodeLabels, true);
    assert.strictEqual(result.missingBarcodeLabels, 1);
  });

  await t.test('21 Cartridges (needs 2 cleaning tape, 1 barcode label)', () => {
    const items = [
      { sku: 'Q2078A', description: 'HPE LTO-8 Ultrium 30TB RW Data Cartridge', quantity: 21 },
      { sku: 'C7978A', description: 'HPE Ultrium Universal Cleaning Cartridge', quantity: 1 }
    ];
    const result = evalSupportManufacturing(items);
    assert.strictEqual(result.dataCartridgeCount, 21);
    assert.strictEqual(result.cleaningCartridgeCount, 1);
    assert.strictEqual(result.expectedCleaningCartridges, 2);
    assert.strictEqual(result.needsMoreCleaningCartridges, true);
    assert.strictEqual(result.missingCleaningCartridges, 1);
    
    assert.strictEqual(result.expectedBarcodeLabels, 1);
  });

  await t.test('100 Cartridges (needs 5 cleaning tapes, 1 barcode label)', () => {
    const items = [
      { sku: 'Q2078A', description: 'HPE LTO-8 Ultrium 30TB RW Data Cartridge', quantity: 100 },
      { sku: 'C7978A', description: 'HPE Ultrium Universal Cleaning Cartridge', quantity: 5 },
      { sku: 'Q2014A', description: 'HPE LTO-8 Ultrium RW Bar Code Label Pack', quantity: 1 }
    ];
    const result = evalSupportManufacturing(items);
    assert.strictEqual(result.dataCartridgeCount, 100);
    assert.strictEqual(result.needsMoreCleaningCartridges, false);
    assert.strictEqual(result.expectedBarcodeLabels, 1);
    assert.strictEqual(result.needsMoreBarcodeLabels, false);
  });

  await t.test('101 Cartridges (needs 6 cleaning tapes, 2 barcode labels)', () => {
    const items = [
      { sku: 'Q2078A', description: 'HPE LTO-8 Ultrium 30TB RW Data Cartridge', quantity: 101 },
      { sku: 'C7978A', description: 'HPE Ultrium Universal Cleaning Cartridge', quantity: 5 },
      { sku: 'Q2014A', description: 'HPE LTO-8 Ultrium RW Bar Code Label Pack', quantity: 1 }
    ];
    const result = evalSupportManufacturing(items);
    assert.strictEqual(result.dataCartridgeCount, 101);
    
    assert.strictEqual(result.expectedCleaningCartridges, 6);
    assert.strictEqual(result.needsMoreCleaningCartridges, true);
    
    assert.strictEqual(result.expectedBarcodeLabels, 2);
    assert.strictEqual(result.needsMoreBarcodeLabels, true);
    assert.strictEqual(result.missingBarcodeLabels, 1);
  });
});