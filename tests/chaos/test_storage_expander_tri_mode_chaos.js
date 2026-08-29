const test = require('node:test');
const assert = require('node:assert');
const { evalStorageTriMode } = require('../../scripts/lib/aspects/storage_tri_mode.js');

test('Boundary 1: 8-port vs 16-port Tri-Mode controller drive limits (INV-26)', async (t) => {
  await t.test('16 drives on an 8-port OCP controller mandates SAS Expander', () => {
    const items = [
      { sku: 'P26264-B21', description: 'Broadcom MR408i-o Gen10 Plus Controller', quantity: 1 },
      { sku: 'P40496-B21', description: 'HPE 2.4TB SAS 12G 10K SFF HDD', quantity: 16 }
    ];
    const result = evalStorageTriMode(items);
    assert.strictEqual(result.driveCount, 16);
    assert.strictEqual(result.controllerDirectCapacity, 8);
    assert.strictEqual(result.needsSasExpander, true);
  });
  
  await t.test('24 drives on an 8-port OCP controller mandates SAS Expander', () => {
    const items = [
      { sku: 'P26264-B21', description: 'Broadcom MR408i-o Gen10 Plus Controller', quantity: 1 },
      { sku: 'P40496-B21', description: 'HPE 2.4TB SAS 12G 10K SFF HDD', quantity: 24 }
    ];
    const result = evalStorageTriMode(items);
    assert.strictEqual(result.driveCount, 24);
    assert.strictEqual(result.controllerDirectCapacity, 8);
    assert.strictEqual(result.needsSasExpander, true);
  });
  
  await t.test('8 drives on an 8-port OCP controller does NOT mandate SAS Expander', () => {
    const items = [
      { sku: 'P26264-B21', description: 'Broadcom MR408i-o Gen10 Plus Controller', quantity: 1 },
      { sku: 'P40496-B21', description: 'HPE 2.4TB SAS 12G 10K SFF HDD', quantity: 8 }
    ];
    const result = evalStorageTriMode(items);
    assert.strictEqual(result.driveCount, 8);
    assert.strictEqual(result.controllerDirectCapacity, 8);
    assert.strictEqual(result.needsSasExpander, false);
  });
  
  await t.test('16 drives on an 8-port PCIe controller (MR408i-p) mandates SAS Expander', () => {
    const items = [
      { sku: 'P26262-B21', description: 'Broadcom MR408i-p Gen10 Plus Controller', quantity: 1 },
      { sku: 'P40496-B21', description: 'HPE 2.4TB SAS 12G 10K SFF HDD', quantity: 16 }
    ];
    const result = evalStorageTriMode(items);
    assert.strictEqual(result.driveCount, 16);
    assert.strictEqual(result.controllerDirectCapacity, 8);
    assert.strictEqual(result.needsSasExpander, true);
  });

  await t.test('16 drives on a 16-port PCIe controller (MR416i-p) does NOT mandate SAS Expander', () => {
    const items = [
      { sku: 'P26266-B21', description: 'Broadcom MR416i-p Gen10 Plus Controller', quantity: 1 },
      { sku: 'P40496-B21', description: 'HPE 2.4TB SAS 12G 10K SFF HDD', quantity: 16 }
    ];
    const result = evalStorageTriMode(items);
    assert.strictEqual(result.driveCount, 16);
    assert.strictEqual(result.controllerDirectCapacity, 16);
    assert.strictEqual(result.needsSasExpander, false);
  });
});

test('Boundary 2: controller enablement cables (Rules 81354627 & 81354632)', async (t) => {
  await t.test('P48918-B21 used for OCP controllers on standard 8SFF cages', () => {
    const items = [
      { sku: 'P26264-B21', description: 'Broadcom MR408i-o Gen10 Plus Controller', quantity: 1 },
      { sku: 'P48918-B21', description: 'Storage Controller Enablement Cable Kit', quantity: 1 },
      { sku: 'P48813-B21', description: 'HPE ProLiant DL380 Gen11 8SFF Drive Cage', quantity: 1 }
    ];
    const result = evalStorageTriMode(items);
    assert.strictEqual(result.hasOcpController, true);
    assert.strictEqual(result.hasOcpCable, true);
    assert.strictEqual(result.hasDriveCage, true);
    assert.strictEqual(result.hasPremiumCage, false);
    assert.strictEqual(result.hasIncompatibleYCable, false);
  });

  await t.test('Y-splitter cable P48832-B21 restricted to PCIe riser cards on Premium cages (Valid)', () => {
    const items = [
      { sku: 'P26262-B21', description: 'Broadcom MR408i-p Gen10 Plus Controller', quantity: 1 },
      { sku: 'P48832-B21', description: 'Tri-Mode Y-Cable', quantity: 1 },
      { sku: 'P48814-B21', description: 'HPE ProLiant DL380 Gen11 U.3 Premium Cage', quantity: 1 }
    ];
    const result = evalStorageTriMode(items);
    assert.strictEqual(result.hasPcieController, true);
    assert.strictEqual(result.hasPremiumCage, true);
    assert.strictEqual(result.hasYCable, true);
    assert.strictEqual(result.hasIncompatibleYCable, false);
  });

  await t.test('Y-splitter cable P48832-B21 with OCP controller flags incompatible', () => {
    const items = [
      { sku: 'P26264-B21', description: 'Broadcom MR408i-o Gen10 Plus Controller', quantity: 1 },
      { sku: 'P48832-B21', description: 'Tri-Mode Y-Cable', quantity: 1 },
      { sku: 'P48814-B21', description: 'HPE ProLiant DL380 Gen11 U.3 Premium Cage', quantity: 1 }
    ];
    const result = evalStorageTriMode(items);
    assert.strictEqual(result.hasPcieController, false);
    assert.strictEqual(result.hasIncompatibleYCable, true);
  });

  await t.test('Y-splitter cable P48832-B21 with standard cage flags incompatible', () => {
    const items = [
      { sku: 'P26262-B21', description: 'Broadcom MR408i-p Gen10 Plus Controller', quantity: 1 },
      { sku: 'P48832-B21', description: 'Tri-Mode Y-Cable', quantity: 1 },
      { sku: 'P48813-B21', description: 'HPE ProLiant DL380 Gen11 8SFF Drive Cage', quantity: 1 }
    ];
    const result = evalStorageTriMode(items);
    assert.strictEqual(result.hasPremiumCage, false);
    assert.strictEqual(result.hasIncompatibleYCable, true);
  });
});

test('Boundary 3: Direct-Attach NVMe limits vs RAID controller ports across backplanes', async (t) => {
  await t.test('24 NVMe drives with direct attach bypasses storage controller limit requirements', () => {
    // If the user uses direct-attach NVMe (meaning no RAID controller), SAS expander is NOT required.
    const items = [
      { sku: 'P40496-B21', description: 'HPE 3.2TB NVMe Gen4 High Performance Mixed Use SFF U.3 PM1735a SSD', quantity: 24 }, // 24 drives
      { sku: 'P48814-B21', description: 'HPE ProLiant DL380 Gen11 U.3 Premium Cage', quantity: 3 } // Backplanes
    ];
    const result = evalStorageTriMode(items);
    assert.strictEqual(result.driveCount, 24);
    assert.strictEqual(result.hasStorageController, false);
    assert.strictEqual(result.needsSasExpander, false);
  });

  await t.test('8 NVMe drives on EDSFF backplane with OCP controller', () => {
    const items = [
      { sku: 'P26264-B21', description: 'Broadcom MR408i-o Gen10 Plus Controller', quantity: 1 },
      { sku: 'P48814-B21', description: 'HPE ProLiant DL380 Gen11 EDSFF Drive Cage', quantity: 1 },
      { sku: 'P40496-B21', description: 'HPE 3.2TB NVMe Gen4 High Performance Mixed Use EDSFF SSD', quantity: 8 }
    ];
    const result = evalStorageTriMode(items);
    assert.strictEqual(result.driveCount, 8);
    assert.strictEqual(result.hasStorageController, true);
    assert.strictEqual(result.hasOcpController, true);
    assert.strictEqual(result.needsSasExpander, false); // 8 <= 8
  });

  await t.test('24 NVMe drives mixed across 8SFF standard and U.3 premium cages without a controller', () => {
    const items = [
      { sku: 'P48813-B21', description: 'HPE ProLiant DL380 Gen11 8SFF Drive Cage', quantity: 1 },
      { sku: 'P48814-B21', description: 'HPE ProLiant DL380 Gen11 U.3 Premium Cage', quantity: 2 },
      { sku: 'P40496-B21', description: 'HPE 3.2TB NVMe Gen4 High Performance Mixed Use SFF U.3 SSD', quantity: 24 }
    ];
    const result = evalStorageTriMode(items);
    assert.strictEqual(result.driveCount, 24);
    assert.strictEqual(result.hasDriveCage, true);
    assert.strictEqual(result.hasPremiumCage, true);
    assert.strictEqual(result.hasStorageController, false);
    assert.strictEqual(result.needsSasExpander, false); 
  });
});