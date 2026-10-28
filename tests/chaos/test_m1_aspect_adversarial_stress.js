'use strict';
/**
 * tests/chaos/test_m1_aspect_adversarial_stress.js
 *
 * Empirical Adversarial Verification Suite for Milestone 1:
 * Physical Aspect Checkers (Storage Tri-Mode, Power Environment, and Domain Stubs)
 *
 * Exercises all 9 required challenge scenarios + boundary fuzzing:
 * 1. Zero PSUs on standard server chassis (MUST fail).
 * 2. Integrated power chassis (Alletra, StoreEver, Aruba) with 0 PSUs (MUST pass without false error).
 * 3. PSU wattage deficit (e.g., 1400W system with 500W PSUs MUST fail).
 * 4. PSU headroom deficit (<20% margin MUST warn).
 * 5. Drive count exceeding backplane capacity (MUST fail isBackplaneCapacityExceeded).
 * 6. Storage controller without cable kit (MUST fail needsCableKit) + Empirical defect detection on battery mask.
 * 7. LFF drives in SFF chassis, missing Alletra controller node, missing StoreEver SAS cable (MUST fail) + Alletra battery false-positive defect detection.
 * 8. SWITCH_FABRIC_PORTS port oversubscription on networking switches (MUST fail).
 * 9. ARCHIVE_COLD_STORAGE cartridge count exceeding tape library capacity (MUST fail).
 * 10. Boundary stress and multi-node scaling fuzzing.
 */

const test = require('node:test');
const assert = require('node:assert');

const { evalStorageTriMode } = require('../../scripts/lib/aspects/storage_tri_mode.js');
const { evalPowerEnvironment } = require('../../scripts/lib/aspects/power_environment.js');
const {
  evaluateDomainAspects,
  normalizeAspectResult
} = require('../../scripts/lib/aspects/aspect_registry.js');

// ─────────────────────────────────────────────────────────────────────────────
// CHALLENGE 1: Zero PSUs on standard server chassis (MUST fail)
// ─────────────────────────────────────────────────────────────────────────────
test('Adversarial 1: Zero PSUs on standard server chassis MUST fail', () => {
  const items = [
    { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 1 },
    { sku: 'P73299-B21', description: 'Intel Xeon Gold 6548Y 2.8GHz 32C 280W Processor', quantity: 2 },
    { sku: 'P73300-B21', description: 'HPE 64GB 2Rx8 DDR5-5600 Smart Memory FIO Kit', quantity: 16 }
  ];

  const rawPower = evalPowerEnvironment(items, null, {}, 1);
  assert.strictEqual(rawPower.psuCount, 0, 'PSU count should be 0');
  assert.strictEqual(rawPower.hasIntegratedPower, false, 'Server should not have integrated power');
  assert.strictEqual(rawPower.hasZeroPsus, true, 'hasZeroPsus should be true');

  const normalized = normalizeAspectResult('POWER_ENVIRONMENT', rawPower);
  assert.strictEqual(normalized.status, 'FAIL', 'Zero PSUs must produce status: FAIL');
  assert.ok(
    normalized.errors.some(e => e.includes('Power supply required: 0 power supplies configured')),
    `Expected 0-PSU error, got: ${JSON.stringify(normalized.errors)}`
  );

  // Also verify via evaluateDomainAspects
  const domainEval = evaluateDomainAspects('server', items, null, {}, 1);
  const psuCheck = domainEval.checks.find(c => c.id === 'POWER_ENVIRONMENT');
  assert.ok(psuCheck, 'POWER_ENVIRONMENT check must exist');
  assert.strictEqual(psuCheck.status, 'FAIL');
  assert.ok(domainEval.errors.some(e => e.includes('0 power supplies configured')));
});

// ─────────────────────────────────────────────────────────────────────────────
// CHALLENGE 2: Integrated power chassis with 0 PSUs (MUST pass without false error)
// ─────────────────────────────────────────────────────────────────────────────
test('Adversarial 2: Integrated power chassis (Alletra, StoreEver, Switch) with 0 PSUs MUST pass power check', () => {
  // 2a. Alletra storage array
  const alletraItems = [
    { sku: 'R0Q35A', description: 'HPE Alletra 6000 24SFF Storage Array Base', quantity: 1 },
    { sku: 'R0Q36A', description: 'HPE Alletra 6000 Node Controller Pair', quantity: 2 },
    { sku: 'R0Q37A', description: 'HPE 1.92TB NVMe SSD', quantity: 8 }
  ];
  const alletraPower = evalPowerEnvironment(alletraItems, null, {}, 1);
  assert.strictEqual(alletraPower.hasIntegratedPower, true, 'Alletra should have integrated power');
  assert.strictEqual(alletraPower.hasZeroPsus, false, 'Alletra should not flag hasZeroPsus');
  const alletraNorm = normalizeAspectResult('POWER_ENVIRONMENT', alletraPower);
  assert.ok(
    !alletraNorm.errors.some(e => e.includes('0 power supplies configured')),
    `Alletra should not have 0-PSU error: ${JSON.stringify(alletraNorm.errors)}`
  );

  // 2b. StoreEver MSL tape library
  const storeEverItems = [
    { sku: 'Q6Q67B', description: 'HPE StoreEver MSL3040 Tape Library 0-drive Base Module', quantity: 1 },
    { sku: 'N7P37A', description: 'HPE StoreEver MSL LTO-9 Ultrium 30750 SAS Tape Drive', quantity: 1 },
    { sku: '716195-B21', description: 'HPE 2.0m External Mini-SAS HD Cable', quantity: 1 }
  ];
  const storeEverPower = evalPowerEnvironment(storeEverItems, null, {}, 1);
  assert.strictEqual(storeEverPower.hasIntegratedPower, true, 'StoreEver should have integrated power');
  assert.strictEqual(storeEverPower.hasZeroPsus, false, 'StoreEver should not flag hasZeroPsus');
  const storeEverNorm = normalizeAspectResult('POWER_ENVIRONMENT', storeEverPower);
  assert.ok(
    !storeEverNorm.errors.some(e => e.includes('0 power supplies configured')),
    `StoreEver should not have 0-PSU error: ${JSON.stringify(storeEverNorm.errors)}`
  );

  // 2c. Aruba networking switch
  const switchItems = [
    { sku: 'JL661A', description: 'Aruba CX 6300M 48G 4SFP56 Switch', quantity: 1 },
    { sku: 'J9150D', description: 'Aruba 10G SFP+ LC SR 300m MMF Transceiver', quantity: 2 },
    { sku: 'QK734A', description: 'HPE Premier Flex LC/LC Multi-mode OM4 2-fiber 5m Cable', quantity: 2 }
  ];
  const switchPower = evalPowerEnvironment(switchItems, null, {}, 1);
  assert.strictEqual(switchPower.hasIntegratedPower, true, 'Switch should have integrated power');
  assert.strictEqual(switchPower.hasZeroPsus, false, 'Switch should not flag hasZeroPsus');
  const switchNorm = normalizeAspectResult('POWER_ENVIRONMENT', switchPower);
  assert.ok(
    !switchNorm.errors.some(e => e.includes('0 power supplies configured')),
    `Switch should not have 0-PSU error: ${JSON.stringify(switchNorm.errors)}`
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// CHALLENGE 3: PSU wattage deficit (MUST fail)
// ─────────────────────────────────────────────────────────────────────────────
test('Adversarial 3: PSU wattage deficit (high-power hardware vs small PSU) MUST fail', () => {
  // Dual 280W Xeon CPUs (560W) + 2x NVIDIA A100 GPUs (800W) + 16 DIMMs (128W) + base (150W) = ~1638W
  // Configured with 500W Platinum PSUs (maxPsuWattage: 500W)
  const items = [
    { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 1 },
    { sku: 'P73299-B21', description: 'Intel Xeon Gold 6548Y 2.8GHz 32C 280W Processor', quantity: 2 },
    { sku: 'P73300-B21', description: 'HPE 64GB 2Rx8 DDR5-5600 Smart Memory FIO Kit', quantity: 16 },
    { sku: 'R9S37C', description: 'NVIDIA A100 80GB PCIe Accelerator', quantity: 2 },
    { sku: '865408-B21', description: 'HPE 500W Flex Slot Platinum Hot Plug Low Halogen Power Supply Kit', quantity: 2 }
  ];

  const rawPower = evalPowerEnvironment(items, null, {}, 1);
  assert.strictEqual(rawPower.maxPsuWattage, 500);
  assert.ok(rawPower.estimatedNodeWattage > 1400, `Estimated wattage should be >1400W, got ${rawPower.estimatedNodeWattage}W`);
  assert.strictEqual(rawPower.hasPsuWattageDeficit, true, 'hasPsuWattageDeficit MUST be true');

  const normalized = normalizeAspectResult('POWER_ENVIRONMENT', rawPower);
  assert.strictEqual(normalized.status, 'FAIL', 'Wattage deficit must cause status: FAIL');
  assert.ok(
    normalized.errors.some(e => e.includes('Power supply wattage deficit')),
    `Expected wattage deficit error, got: ${JSON.stringify(normalized.errors)}`
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// CHALLENGE 4: PSU headroom deficit (<20% margin MUST warn)
// ─────────────────────────────────────────────────────────────────────────────
test('Adversarial 4: PSU headroom deficit (<20% safety margin) MUST produce warning', () => {
  // Dual 205W Xeon CPUs (410W) + 8 DIMMs (64W) + 8 drives (120W) + base (150W) = 744W
  // Required with 20% headroom = Math.ceil(744 * 1.20) = 893W
  // Configured with 800W Titanium PSUs
  // Here maxPsuWattage (800W) >= estimatedNodeWattage (744W) -> NO wattage deficit error
  // BUT maxPsuWattage (800W) < requiredWattageWithHeadroom (893W) -> headroom deficit warning!
  const items = [
    { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 1 },
    { sku: 'P73298-B21', description: 'Intel Xeon Gold 5515+ 3.2GHz 8C 205W Processor', quantity: 2 },
    { sku: 'P73300-B21', description: 'HPE 32GB 2Rx8 DDR5-5600 Smart Memory FIO Kit', quantity: 8 },
    { sku: 'P40498-B21', description: 'HPE 960GB SAS 12G Read Intensive SFF SSD', quantity: 8 },
    { sku: '865414-B21', description: 'HPE 800W Flex Slot Titanium Hot Plug Low Halogen Power Supply Kit', quantity: 2 }
  ];

  const rawPower = evalPowerEnvironment(items, null, {}, 1);
  assert.strictEqual(rawPower.maxPsuWattage, 800);
  assert.ok(rawPower.estimatedNodeWattage <= 800, `Estimated load ${rawPower.estimatedNodeWattage}W should be <= 800W`);
  assert.ok(rawPower.requiredWattageWithHeadroom > 800, `Headroom requirement ${rawPower.requiredWattageWithHeadroom}W should be > 800W`);
  assert.strictEqual(rawPower.hasPsuWattageDeficit, false, 'Should not have hard wattage deficit');
  assert.strictEqual(rawPower.hasPsuHeadroomDeficit, true, 'MUST flag hasPsuHeadroomDeficit: true');

  const normalized = normalizeAspectResult('POWER_ENVIRONMENT', rawPower);
  assert.ok(
    normalized.warnings.some(w => w.includes('Power supply headroom deficit')),
    `Expected headroom deficit warning, got: ${JSON.stringify(normalized.warnings)}`
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// CHALLENGE 5: Drive count exceeding backplane capacity (MUST fail isBackplaneCapacityExceeded)
// ─────────────────────────────────────────────────────────────────────────────
test('Adversarial 5: Drive count exceeding backplane capacity MUST fail isBackplaneCapacityExceeded', () => {
  // Standard 8SFF chassis has 8 drive bays by default.
  // We configure 12 SFF SSDs without adding a second drive cage.
  const items = [
    { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 1 },
    { sku: 'P40498-B21', description: 'HPE 960GB SAS 12G Read Intensive SFF SSD', quantity: 12 },
    { sku: 'P48820-B21', description: 'HPE DL380 Gen11 High Performance Fan Kit', quantity: 1 }
  ];

  const rawStorage = evalStorageTriMode(items, null, {}, 1);
  assert.strictEqual(rawStorage.driveCount, 12);
  assert.strictEqual(rawStorage.backplaneCapacity, 8, 'Default 8SFF chassis should have 8 bays capacity');
  assert.strictEqual(rawStorage.isBackplaneCapacityExceeded, true, 'isBackplaneCapacityExceeded MUST be true');

  const normalized = normalizeAspectResult('STORAGE_TRI_MODE', rawStorage);
  assert.strictEqual(normalized.status, 'FAIL', 'Over-capacity backplane MUST produce status: FAIL');
  assert.ok(
    normalized.errors.some(e => e.includes('Installed drives (12) exceed backplane drive capacity (8)')),
    `Expected backplane capacity error, got: ${JSON.stringify(normalized.errors)}`
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// CHALLENGE 6: Storage controller without cable kit (MUST fail needsCableKit) + DEFECT PROOF
// ─────────────────────────────────────────────────────────────────────────────
test('Adversarial 6A: Storage controller without controller enablement cable MUST fail needsCableKit', () => {
  // Storage controller MR416i-o configured without P48918-B21 or P76700-B21 cable kit
  const items = [
    { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 1 },
    { sku: 'P06367-B21', description: 'HPE MR416i-o Gen11 x16 Lanes 8GB Cache OCP Storage Controller', quantity: 1 },
    { sku: 'P40498-B21', description: 'HPE 960GB SAS 12G Read Intensive SFF SSD', quantity: 4 }
  ];

  const rawStorage = evalStorageTriMode(items, null, {}, 1);
  assert.strictEqual(rawStorage.hasStorageController, true, 'hasStorageController should be true');
  assert.strictEqual(rawStorage.hasOcpCable, false, 'hasOcpCable should be false');
  assert.strictEqual(rawStorage.needsCableKit, true, 'needsCableKit MUST be true');

  const normalized = normalizeAspectResult('STORAGE_TRI_MODE', rawStorage);
  assert.strictEqual(normalized.status, 'FAIL', 'Missing cable kit MUST produce status: FAIL');
  assert.ok(
    normalized.errors.some(e => e.includes('Storage cable kit required for controller backplane connection')),
    `Expected cable kit error, got: ${JSON.stringify(normalized.errors)}`
  );

  // Remediation: Add P76700-B21 cable kit -> needsCableKit becomes false
  const remediatedItems = [
    ...items,
    { sku: 'P76700-B21', description: 'HPE ProLiant DL380 Gen12 Storage Controller Enablement Cable Kit', quantity: 1 }
  ];
  const remStorage = evalStorageTriMode(remediatedItems, null, {}, 1);
  assert.strictEqual(remStorage.needsCableKit, false, 'remediated build must NOT need cable kit');
});

test('Adversarial 6B: REMEDIATION VERIFICATION — P01366-B21 Smart Storage Battery must not mask missing controller cable kit', () => {
  // Real enterprise configuration flaw:
  // Presales engineer adds P01366-B21 Smart Storage Battery and MR416i-o controller,
  // but OMITS the mandatory P76700-B21 controller backplane cable kit.
  const items = [
    { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 1 },
    { sku: 'P01366-B21', description: 'HPE 96W Smart Storage Battery with 145mm Cable Kit', quantity: 1 },
    { sku: 'P06367-B21', description: 'HPE MR416i-o Gen11 x16 Lanes 8GB Cache OCP Storage Controller', quantity: 1 },
    { sku: 'P40498-B21', description: 'HPE 960GB SAS 12G Read Intensive SFF SSD', quantity: 4 }
  ];

  const rawStorage = evalStorageTriMode(items, null, {}, 1);
  assert.strictEqual(rawStorage.hasOcpCable, false, 'Battery kit must NOT satisfy hasOcpCable');
  assert.strictEqual(rawStorage.needsCableKit, true, 'needsCableKit MUST be true when controller enablement cable is missing');
  assert.strictEqual(rawStorage.needsCapacitorCable, true, 'needsCapacitorCable (Rule 81354652) MUST be true when controller enablement cable is missing');
});

// ─────────────────────────────────────────────────────────────────────────────
// CHALLENGE 7: LFF in SFF, missing Alletra node, missing StoreEver SAS cable (MUST fail)
// ─────────────────────────────────────────────────────────────────────────────
test('Adversarial 7a: LFF 3.5in drives in SFF chassis MUST fail', () => {
  const items = [
    { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 1 },
    { sku: 'P53553-B21', description: 'HPE 18TB SAS 12G Business Critical 7.2K LFF 3.5in HDD', quantity: 4 }
  ];

  const rawStorage = evalStorageTriMode(items, null, {}, 1);
  assert.strictEqual(rawStorage.isLffChassis, false);
  assert.strictEqual(rawStorage.lffDriveCount, 4);
  assert.strictEqual(rawStorage.hasLffDrivesInSffChassis, true, 'hasLffDrivesInSffChassis MUST be true');

  const normalized = normalizeAspectResult('STORAGE_TRI_MODE', rawStorage);
  assert.strictEqual(normalized.status, 'FAIL');
  assert.ok(
    normalized.errors.some(e => e.includes('LFF 3.5-inch drives cannot be installed in SFF chassis')),
    `Expected LFF-in-SFF error, got: ${JSON.stringify(normalized.errors)}`
  );
});

test('Adversarial 7b: Alletra storage array with missing controller node MUST fail', () => {
  // Only 1 controller node instead of active-active pair (2)
  const items = [
    { sku: 'R0Q35A', description: 'HPE Alletra 6000 24SFF Storage Array Base', quantity: 1 },
    { sku: 'R0Q36A', description: 'HPE Alletra 6000 Node Controller Single', quantity: 1 },
    { sku: 'R0Q37A', description: 'HPE 1.92TB NVMe SSD', quantity: 6 }
  ];

  const rawStorage = evalStorageTriMode(items, null, {}, 1);
  assert.strictEqual(rawStorage.isAlletraArray, true);
  assert.strictEqual(rawStorage.controllerNodeCount, 1);
  assert.strictEqual(rawStorage.hasMissingControllerNode, true, 'hasMissingControllerNode MUST be true');

  const normalized = normalizeAspectResult('STORAGE_TRI_MODE', rawStorage);
  assert.strictEqual(normalized.status, 'FAIL');
  assert.ok(
    normalized.errors.some(e => e.includes('Alletra storage array requires exactly two active controller nodes')),
    `Expected missing controller node error, got: ${JSON.stringify(normalized.errors)}`
  );
});

test('Adversarial 7c: StoreEver tape storage missing Mini-SAS HD cable MUST fail', () => {
  // LTO SAS tape drive with 0 Mini-SAS HD cables
  const items = [
    { sku: 'Q6Q67B', description: 'HPE StoreEver MSL3040 Tape Library 0-drive Base Module', quantity: 1 },
    { sku: 'N7P37A', description: 'HPE StoreEver MSL LTO-9 Ultrium 30750 SAS Tape Drive', quantity: 2 }
    // Missing mini-sas cable
  ];

  const rawStorage = evalStorageTriMode(items, null, {}, 1);
  assert.strictEqual(rawStorage.ltoSasDriveCount, 2);
  assert.strictEqual(rawStorage.needsMiniSasHdCable, true, 'needsMiniSasHdCable MUST be true');

  const normalized = normalizeAspectResult('STORAGE_TRI_MODE', rawStorage);
  assert.strictEqual(normalized.status, 'FAIL');
  assert.ok(
    normalized.errors.some(e => e.includes('StoreEver LTO SAS tape drive requires Mini-SAS HD cable')),
    `Expected tape SAS cable error, got: ${JSON.stringify(normalized.errors)}`
  );
});

test('Adversarial 7d: REMEDIATION VERIFICATION — Alletra "Controller Node Pair" must not trigger server Smart Storage Battery error', () => {
  // An authentic Alletra storage array:
  // Base chassis + Controller Node Pair (2 nodes) + NVMe SSDs
  const items = [
    { sku: 'R0Q35A', description: 'HPE Alletra 6000 24SFF Storage Array Base', quantity: 1 },
    { sku: 'R0Q36A', description: 'HPE Alletra 6000 Controller Node Pair', quantity: 2 },
    { sku: 'R0Q37A', description: 'HPE 1.92TB NVMe SSD', quantity: 8 }
  ];

  const rawStorage = evalStorageTriMode(items, null, {}, 1);
  assert.strictEqual(rawStorage.hasStorageController, false, 'Alletra controller nodes must NOT be treated as server storage controllers');
  assert.strictEqual(rawStorage.needsSmartStorageBattery, false, 'Alletra array must NOT require ProLiant Smart Storage Battery');
  const normalized = normalizeAspectResult('STORAGE_TRI_MODE', rawStorage);
  assert.ok(
    !normalized.errors.some(e => e.includes('Smart Storage Battery')),
    'Alletra array must NOT have battery error'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// CHALLENGE 8: SWITCH_FABRIC_PORTS port oversubscription (MUST fail)
// ─────────────────────────────────────────────────────────────────────────────
test('Adversarial 8: SWITCH_FABRIC_PORTS port oversubscription on networking switches MUST fail', () => {
  // 1 switch with 4 uplink ports (Aruba CX 6300M 48G 4SFP56 Switch)
  // Configured with 8 optical transceivers (demand 8 > uplink capacity 4)
  const items = [
    { sku: 'JL661A', description: 'Aruba CX 6300M 48G 4SFP56 Switch', quantity: 1 },
    { sku: 'J9150D', description: 'Aruba 10G SFP+ LC SR 300m MMF Transceiver', quantity: 8 },
    { sku: 'QK734A', description: 'HPE Premier Flex LC/LC Multi-mode OM4 2-fiber 5m Cable', quantity: 8 }
  ];

  const domainEval = evaluateDomainAspects('networking', items, null, {}, 1);
  const switchCheck = domainEval.checks.find(c => c.id === 'SWITCH_FABRIC_PORTS');
  assert.ok(switchCheck, 'SWITCH_FABRIC_PORTS aspect must be present');
  assert.strictEqual(switchCheck.status, 'FAIL', 'Oversubscription must cause status: FAIL');
  assert.ok(
    switchCheck.errors.some(e => e.includes('exceed available switch uplink port capacity (4)')),
    `Expected uplink oversubscription error, got: ${JSON.stringify(switchCheck.errors)}`
  );

  // Speed mismatch challenge: 100G QSFP28 transceiver on switch supporting max 10G/25G
  const speedMismatchItems = [
    { sku: 'JL661A', description: 'Aruba CX 6300M 48G 4SFP56 Switch', quantity: 1 },
    { sku: '845408-B21', description: 'HPE 100Gb QSFP28 to QSFP28 5m Direct Attach Copper Cable', quantity: 2 }
  ];
  const speedEval = evaluateDomainAspects('networking', speedMismatchItems, null, {}, 1);
  const speedCheck = speedEval.checks.find(c => c.id === 'SWITCH_FABRIC_PORTS');
  assert.strictEqual(speedCheck.status, 'FAIL');
  assert.ok(
    speedCheck.errors.some(e => e.includes('Incompatible transceiver speed: 100G QSFP28 optics')),
    `Expected speed mismatch error, got: ${JSON.stringify(speedCheck.errors)}`
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// CHALLENGE 9: ARCHIVE_COLD_STORAGE cartridge count exceeding capacity (MUST fail)
// ─────────────────────────────────────────────────────────────────────────────
test('Adversarial 9: ARCHIVE_COLD_STORAGE cartridge count exceeding tape library capacity MUST fail', () => {
  // MSL3040 Base module supports exactly 40 slots.
  // Configured with 60 LTO-9 data cartridges (demand 60 > capacity 40).
  const items = [
    { sku: 'Q6Q67B', description: 'HPE StoreEver MSL3040 Tape Library 0-drive Base Module', quantity: 1 },
    { sku: 'N7P37A', description: 'HPE StoreEver MSL LTO-9 Ultrium 30750 SAS Tape Drive', quantity: 2 },
    { sku: '716195-B21', description: 'HPE 2.0m External Mini-SAS HD Cable', quantity: 2 },
    { sku: 'Q2079A', description: 'HPE LTO-9 Ultrium 45TB RW Data Cartridge', quantity: 60 },
    { sku: 'C7978A', description: 'HPE Universal Ultrium Cleaning Cartridge', quantity: 3 },
    { sku: 'Q2015A', description: 'HPE LTO-9 Ultrium RW Bar Code Label Pack', quantity: 1 }
  ];

  const archiveEval = evaluateDomainAspects('archive', items, null, {}, 1);
  const tapeCheck = archiveEval.checks.find(c => c.id === 'ARCHIVE_COLD_STORAGE');
  assert.ok(tapeCheck, 'ARCHIVE_COLD_STORAGE check must exist');
  assert.strictEqual(tapeCheck.status, 'FAIL', 'Over-capacity cartridge count MUST cause status: FAIL');
  assert.ok(
    tapeCheck.errors.some(e => e.includes('Cartridge count (63) exceeds library slot capacity (40)')),
    `Expected slot capacity error, got: ${JSON.stringify(tapeCheck.errors)}`
  );

  // Expansion module limit challenge: > 6 expansion modules on MSL3040
  const overExpandedItems = [
    { sku: 'Q6Q67B', description: 'HPE StoreEver MSL3040 Tape Library 0-drive Base Module', quantity: 1 },
    { sku: 'Q6Q68B', description: 'HPE StoreEver MSL3040 Tape Library Expansion Module', quantity: 8 },
    { sku: 'N7P37A', description: 'HPE StoreEver MSL LTO-9 Ultrium 30750 SAS Tape Drive', quantity: 2 },
    { sku: '716195-B21', description: 'HPE 2.0m External Mini-SAS HD Cable', quantity: 2 }
  ];
  const expEval = evaluateDomainAspects('archive', overExpandedItems, null, {}, 1);
  const expCheck = expEval.checks.find(c => c.id === 'ARCHIVE_COLD_STORAGE');
  assert.strictEqual(expCheck.status, 'FAIL');
  assert.ok(
    expCheck.errors.some(e => e.includes('exceeds maximum expansion module limit (maximum 6 expansion modules)')),
    `Expected expansion limit error, got: ${JSON.stringify(expCheck.errors)}`
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// CHALLENGE 10: Boundary stress, multi-node scaling, and fuzzing
// ─────────────────────────────────────────────────────────────────────────────
test('Adversarial 10: Multi-node scaling and edge-case boundary fuzzing', () => {
  // 10a. Multi-node serverCount = 4
  // 4 servers, total 48 drives across 4 nodes = 12 drives per node > 8 bays per node
  const multiNodeOverload = [
    { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 4 },
    { sku: 'P40498-B21', description: 'HPE 960GB SAS 12G Read Intensive SFF SSD', quantity: 48 },
    { sku: '865414-B21', description: 'HPE 800W Flex Slot Titanium Hot Plug Power Supply Kit', quantity: 8 }
  ];
  const multiNodeRes = evalStorageTriMode(multiNodeOverload, null, {}, 4);
  assert.strictEqual(multiNodeRes.driveCount, 48);
  assert.strictEqual(multiNodeRes.backplaneCapacity, 32, '4 nodes * 8 bays = 32 bays');
  assert.strictEqual(multiNodeRes.isBackplaneCapacityExceeded, true, '12 drives/node > 8 bays/node must flag exceeded');

  // 10b. Empty items array
  const emptyRes = evaluateDomainAspects('server', [], null, {}, 1);
  assert.strictEqual(emptyRes.isAllPassed, false);

  // 10c. Network domain with transceivers but 0 switches MUST fail
  const orphanOptics = [
    { sku: 'J9150D', description: 'Aruba 10G SFP+ LC SR 300m MMF Transceiver', quantity: 4 }
  ];
  const orphanEval = evaluateDomainAspects('networking', orphanOptics, null, {}, 1);
  const orphanCheck = orphanEval.checks.find(c => c.id === 'SWITCH_FABRIC_PORTS');
  assert.strictEqual(orphanCheck.status, 'FAIL');
  assert.ok(orphanCheck.errors.some(e => e.includes('without a host switch chassis')));

  // 10d. Tape domain with tape library but 0 drives MUST fail
  const drivelessLibrary = [
    { sku: 'Q6Q67B', description: 'HPE StoreEver MSL3040 Tape Library 0-drive Base Module', quantity: 1 }
  ];
  const drivelessEval = evaluateDomainAspects('archive', drivelessLibrary, null, {}, 1);
  const drivelessCheck = drivelessEval.checks.find(c => c.id === 'ARCHIVE_COLD_STORAGE');
  assert.strictEqual(drivelessCheck.status, 'FAIL');
  assert.ok(drivelessCheck.errors.some(e => e.includes('requires at least one LTO tape drive installed')));
});
