'use strict';
/**
 * tests/chaos/test_m1_it2_challenger_stress.js
 *
 * EMPIRICAL ADVERSARIAL CHALLENGER SUITE (M1_It2)
 * Independent empirical stress tests and boundary fuzzing targeting:
 * 1. Power Environment (power_environment.js) — multi-node normalization & single-node deficit detection
 * 2. Support & Manufacturing (support_manufacturing.js & aspect_registry.js) — Rule 81322276 scoping
 * 3. Storage Tri-Mode (storage_tri_mode.js) — battery cable decoupling & Alletra storage controller isolation
 */

const test = require('node:test');
const assert = require('node:assert');

const { evalPowerEnvironment } = require('../../scripts/lib/aspects/power_environment.js');
const { evalSupportManufacturing } = require('../../scripts/lib/aspects/support_manufacturing.js');
const { evalStorageTriMode } = require('../../scripts/lib/aspects/storage_tri_mode.js');
const {
  normalizeAspectResult,
  evaluateDomainAspects
} = require('../../scripts/lib/aspects/aspect_registry.js');

// ═════════════════════════════════════════════════════════════════════════════
// 1. POWER ENVIRONMENT ADVERSARIAL CHALLENGES
// ═════════════════════════════════════════════════════════════════════════════

test('Power Challenge 1A: 10-node cluster power math must normalize per node without false deficits', () => {
  // 10 nodes with 20x 205W CPUs (4100W total) and 20x 1600W PSUs (redundant pairs per node)
  const items = [
    { sku: 'P12345-B21', description: 'Intel Xeon Gold 6330 205W Processor', quantity: 20 },
    { sku: 'P38997-B21', description: 'HPE 1600W Flex Slot Platinum Hot Plug Low Halogen Power Supply Kit', quantity: 20 }
  ];

  const rawPower = evalPowerEnvironment(items, null, {}, 10);

  // Per-node calculation: 4100W / 10 = 410W + 150W baseline = 560W estimated load per node
  assert.strictEqual(rawPower.estimatedNodeWattage, 560, 'Per-node estimated wattage must be 560W, NOT 4250W');
  assert.strictEqual(rawPower.maxPsuWattage, 1600, 'Max PSU wattage must be 1600W');
  assert.strictEqual(rawPower.hasPsuWattageDeficit, false, '1600W PSU must NOT have wattage deficit for 560W load');
  assert.strictEqual(rawPower.hasPsuHeadroomDeficit, false, '1600W PSU must NOT have headroom deficit for 672W headroom requirement');
  assert.strictEqual(rawPower.hasMixedWattagePsus, false, '20 matching PSUs across 10 nodes must not flag mixed wattage');
  assert.strictEqual(rawPower.minPsusRequired, 10, 'Minimum required PSUs for 10 nodes is 10');

  const normalized = normalizeAspectResult('POWER_ENVIRONMENT', rawPower);
  assert.ok(
    !normalized.errors.some(e => e.includes('Power supply wattage deficit')),
    `Normalized result must not contain wattage deficit error: ${JSON.stringify(normalized.errors)}`
  );
  assert.ok(
    !normalized.warnings.some(w => w.includes('Power supply headroom deficit')),
    `Normalized result must not contain headroom deficit warning: ${JSON.stringify(normalized.warnings)}`
  );
});

test('Power Challenge 1B: Multi-node scaling fuzzing and parameter format robustness', () => {
  const items = [
    { sku: 'P12345-B21', description: 'Intel Xeon Gold 6330 205W Processor', quantity: 8 }, // 4 nodes x 2 CPUs = 8 CPUs (1640W)
    { sku: 'P38997-B21', description: 'HPE 800W Flex Slot Platinum Power Supply', quantity: 8 }
  ];

  // Test passing serverCount as number
  const r1 = evalPowerEnvironment(items, null, {}, 4);
  assert.strictEqual(r1.estimatedNodeWattage, Math.round(1640 / 4) + 150); // 410 + 150 = 560W
  assert.strictEqual(r1.hasPsuWattageDeficit, false);

  // Test passing serverCount inside options object
  const r2 = evalPowerEnvironment(items, null, {}, { serverCount: 4 });
  assert.strictEqual(r2.estimatedNodeWattage, 560);

  // Test passing serverCount inside catalogData
  const r3 = evalPowerEnvironment(items, { serverCount: 4 }, {}, null);
  assert.strictEqual(r3.estimatedNodeWattage, 560);

  // Boundary edge cases: serverCount 0, -5, NaN, null
  const rZero = evalPowerEnvironment(items, null, {}, 0);
  assert.strictEqual(rZero.estimatedNodeWattage, 1640 + 150, 'serverCount=0 must fall back safely to 1 node');
  assert.strictEqual(rZero.hasPsuWattageDeficit, true, 'Single node with 1790W on 800W PSU must flag deficit');

  const rNeg = evalPowerEnvironment(items, null, {}, -5);
  assert.strictEqual(rNeg.estimatedNodeWattage, 1640 + 150, 'Negative serverCount must fall back safely to 1 node');

  const rNull = evalPowerEnvironment(items, null, {}, null);
  assert.strictEqual(rNull.estimatedNodeWattage, 1640 + 150, 'null serverCount must fall back safely to 1 node');
});

test('Power Challenge 1C: Single-node server with insufficient PSU wattage MUST flag deficit', () => {
  // Heavy configuration: Dual 300W CPUs (600W) + 2x 350W L40S GPUs (700W) + 16 DIMMs (128W) + 8 SSDs (120W) + 150W base = 1698W
  // Configured with 800W PSUs (maxPsuWattage: 800W)
  const items = [
    { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 1 },
    { sku: 'P11111-B21', description: 'Intel Xeon Platinum 8480+ 300W Processor', quantity: 2 },
    { sku: 'P22222-B21', description: 'NVIDIA L40S 48GB PCIe Accelerator', quantity: 2 },
    { sku: 'P33333-B21', description: 'HPE 64GB DDR5 Smart Memory Kit', quantity: 16 },
    { sku: 'P44444-B21', description: 'HPE 1.92TB SAS SSD', quantity: 8 },
    { sku: 'P55555-B21', description: 'HPE 800W Flex Slot Platinum Hot Plug Power Supply', quantity: 2 }
  ];

  const rawPower = evalPowerEnvironment(items, null, {}, 1);
  assert.strictEqual(rawPower.hasPsuWattageDeficit, true, 'Must flag hasPsuWattageDeficit when peak load exceeds active PSU capacity');
  assert.strictEqual(rawPower.hasPsuHeadroomDeficit, true, 'Must flag hasPsuHeadroomDeficit when peak load exceeds 80% headroom');

  const normalized = normalizeAspectResult('POWER_ENVIRONMENT', rawPower);
  assert.strictEqual(normalized.status, 'FAIL', 'Wattage deficit must cause status: FAIL');
  assert.ok(
    normalized.errors.some(e => e.includes('Power supply wattage deficit')),
    `Expected wattage deficit error, got: ${JSON.stringify(normalized.errors)}`
  );
  assert.ok(
    normalized.warnings.some(w => w.includes('Power supply headroom deficit')),
    `Expected headroom deficit warning, got: ${JSON.stringify(normalized.warnings)}`
  );
});

test('Power Challenge 1D: Mixed PSU wattage and efficiency parity detection', () => {
  // 1. Single node with mixed wattages (1x 800W + 1x 1600W)
  const mixedWattageSingle = [
    { sku: 'P00001-B21', description: 'HPE 800W Flex Slot Platinum Power Supply', quantity: 1 },
    { sku: 'P00002-B21', description: 'HPE 1600W Flex Slot Platinum Power Supply', quantity: 1 }
  ];
  const rMixedWatt = evalPowerEnvironment(mixedWattageSingle, null, {}, 1);
  assert.strictEqual(rMixedWatt.hasMixedWattagePsus, true, 'Single node with different PSU wattages must flag mixed wattages');

  // 2. Single node with mixed efficiencies (1x Platinum + 1x Titanium)
  const mixedEffSingle = [
    { sku: 'P00001-B21', description: 'HPE 800W Flex Slot Platinum Power Supply', quantity: 1 },
    { sku: 'P00003-B21', description: 'HPE 800W Flex Slot Titanium Power Supply', quantity: 1 }
  ];
  const rMixedEff = evalPowerEnvironment(mixedEffSingle, null, {}, 1);
  assert.strictEqual(rMixedEff.hasMixedEfficiencyPsus, true, 'Single node with Platinum and Titanium must flag mixed efficiencies');

  // 3. Multi-node cluster with odd PSU count per model (unbalanced redundant pairs)
  const oddPsuMulti = [
    { sku: 'P00001-B21', description: 'HPE 1600W Flex Slot Platinum Power Supply', quantity: 9 } // 9 PSUs across 4 nodes
  ];
  const rOddMulti = evalPowerEnvironment(oddPsuMulti, null, {}, 4);
  assert.strictEqual(rOddMulti.hasMixedWattagePsus, true, 'Odd PSU count across nodes must flag unbalanced redundant pairs');
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. SUPPORT & MANUFACTURING ADVERSARIAL CHALLENGES (RULE 81322276 SCOPING)
// ═════════════════════════════════════════════════════════════════════════════

test('Support Challenge 2A: Empty BOM MUST NOT trigger Rule 81322276 management license error', () => {
  const rawSupport = evalSupportManufacturing([]);
  assert.strictEqual(rawSupport.hasCtoServer, false, 'Empty BOM must have hasCtoServer: false');
  assert.strictEqual(rawSupport.hasManagementLicense, false);

  const normalized = normalizeAspectResult('SUPPORT_MANUFACTURING', rawSupport);
  assert.strictEqual(normalized.status, 'PASS', 'Empty BOM must PASS support manufacturing aspect');
  assert.ok(
    !normalized.errors.some(e => e.includes('81322276')),
    `Rule 81322276 must NOT be in errors: ${JSON.stringify(normalized.errors)}`
  );
});

test('Support Challenge 2B: Loose CPU and spare component BOM MUST NOT trigger Rule 81322276', () => {
  const looseItems = [
    { sku: 'P12345-B21', description: 'Intel Xeon Gold 6330 205W Processor', quantity: 2 },
    { sku: 'P54321-B21', description: 'HPE 32GB 2Rx4 DDR5-4800 Memory Kit', quantity: 4 },
    { sku: 'P56073-B21', description: 'HPE ProLiant DL380 Gen11 Primary Riser Cable Kit', quantity: 1 },
    { sku: 'P48820-B21', description: 'HPE ProLiant DL380 Gen11 High Performance Fan Kit', quantity: 1 },
    { sku: 'P49145-B21', description: 'HPE ProLiant DL380 Gen11 Standard Heat Sink Kit', quantity: 2 }
  ];

  const rawSupport = evalSupportManufacturing(looseItems);
  assert.strictEqual(rawSupport.hasCtoServer, false, 'Loose parts order must NOT be classified as CTO server');

  const normalized = normalizeAspectResult('SUPPORT_MANUFACTURING', rawSupport);
  assert.strictEqual(normalized.status, 'PASS', 'Loose components must PASS support manufacturing');
  assert.ok(
    !normalized.errors.some(e => e.includes('81322276')),
    'Loose parts must not trigger Rule 81322276'
  );
});

test('Support Challenge 2C: ProLiant CTO Server WITHOUT management license MUST trigger Rule 81322276', () => {
  const ctoItems = [
    { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 1 },
    { sku: 'P12345-B21', description: 'Intel Xeon Gold 6330 205W Processor', quantity: 2 },
    { sku: 'P54321-B21', description: 'HPE 32GB 2Rx4 DDR5-4800 Memory Kit', quantity: 4 }
  ];

  const rawSupport = evalSupportManufacturing(ctoItems);
  assert.strictEqual(rawSupport.hasCtoServer, true, 'DL380 Gen12 CTO Server must have hasCtoServer: true');
  assert.strictEqual(rawSupport.hasManagementLicense, false, 'hasManagementLicense must be false when no license is selected');

  const normalized = normalizeAspectResult('SUPPORT_MANUFACTURING', rawSupport);
  assert.strictEqual(normalized.status, 'FAIL', 'CTO server without license must FAIL support manufacturing');
  assert.ok(
    normalized.errors.some(e => e.includes('Rule 81322276')),
    `Expected Rule 81322276 in errors, got: ${JSON.stringify(normalized.errors)}`
  );
});

test('Support Challenge 2D: ProLiant CTO Server WITH management license MUST PASS Rule 81322276', () => {
  // 1. With Compute Ops Management 3yr SaaS (R7A11AAE)
  const ctoWithCom = [
    { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 1 },
    { sku: 'R7A11AAE', description: 'HPE Compute Ops Management Enhanced 3-year SaaS E-LTU', quantity: 1 }
  ];
  const rCom = evalSupportManufacturing(ctoWithCom);
  assert.strictEqual(rCom.hasCtoServer, true);
  assert.strictEqual(rCom.hasManagementLicense, true);
  const nCom = normalizeAspectResult('SUPPORT_MANUFACTURING', rCom);
  assert.ok(
    !nCom.errors.some(e => e.includes('Rule 81322276')),
    'R7A11AAE must satisfy Rule 81322276'
  );

  // 2. With OneView Advanced FIO (E5Y43A)
  const ctoWithOneView = [
    { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 1 },
    { sku: 'E5Y43A', description: 'HPE OneView w/o iLO including 3yr 24x7 Support Track 1-Server FIO LTU', quantity: 1 }
  ];
  const rOv = evalSupportManufacturing(ctoWithOneView);
  assert.strictEqual(rOv.hasManagementLicense, true);
  const nOv = normalizeAspectResult('SUPPORT_MANUFACTURING', rOv);
  assert.ok(
    !nOv.errors.some(e => e.includes('Rule 81322276')),
    'E5Y43A must satisfy Rule 81322276'
  );

  // 3. With S1A05A optional pre-claim token ALONE (without R7A11AAE)
  // S1A05A is only an FIO cloud token; it does NOT satisfy Rule 81322276 by itself
  const ctoWithS1A05A = [
    { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 1 },
    { sku: 'S1A05A', description: 'HPE Compute Cloud Management Server FIO Enablement', quantity: 1 }
  ];
  const rS1A05A = evalSupportManufacturing(ctoWithS1A05A);
  assert.strictEqual(rS1A05A.hasManagementLicense, false, 'S1A05A alone must NOT satisfy management license');
  const nS1A05A = normalizeAspectResult('SUPPORT_MANUFACTURING', rS1A05A);
  assert.ok(
    nS1A05A.errors.some(e => e.includes('Rule 81322276')),
    'S1A05A alone must still trigger Rule 81322276'
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. STORAGE TRI-MODE ADVERSARIAL CHALLENGES
// ═════════════════════════════════════════════════════════════════════════════

test('Storage Challenge 3A: P01366-B21 Smart Storage Battery must not mask missing controller cable kit', () => {
  // Real presales trap: presales engineer includes P01366-B21 with 145mm cable,
  // MR416i-o controller and SAS SSDs, but OMITS the controller backplane cable kit (P76700-B21).
  const items = [
    { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 1 },
    { sku: 'P01366-B21', description: 'HPE 96W Smart Storage Battery with 145mm Cable Kit', quantity: 1 },
    { sku: 'P06367-B21', description: 'HPE MR416i-o Gen11 x16 Lanes 8GB Cache OCP Storage Controller', quantity: 1 },
    { sku: 'P40498-B21', description: 'HPE 960GB SAS 12G Read Intensive SFF SSD', quantity: 4 }
  ];

  const rawStorage = evalStorageTriMode(items, null, {}, 1);
  assert.strictEqual(rawStorage.hasOcpCable, false, 'Battery 145mm cable kit must NOT set hasOcpCable to true');
  assert.strictEqual(rawStorage.needsCableKit, true, 'needsCableKit MUST remain true');
  assert.strictEqual(rawStorage.needsCapacitorCable, true, 'needsCapacitorCable (Rule 81354652) MUST remain true');

  const normalized = normalizeAspectResult('STORAGE_TRI_MODE', rawStorage);
  assert.strictEqual(normalized.status, 'FAIL', 'Missing controller cable MUST cause status: FAIL');
  assert.ok(
    normalized.errors.some(e => e.includes('Storage cable kit required for controller backplane connection')),
    `Expected backplane cable error, got: ${JSON.stringify(normalized.errors)}`
  );
  assert.ok(
    normalized.errors.some(e => e.includes('Smart Storage Battery requires controller enablement cable kit (CLIC Rule 81354652)')),
    `Expected CLIC Rule 81354652 error, got: ${JSON.stringify(normalized.errors)}`
  );
});

test('Storage Challenge 3B: P01367-B21 (260mm cable kit) must also NOT mask missing controller cable kit', () => {
  const items = [
    { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 1 },
    { sku: 'P01367-B21', description: 'HPE 96W Smart Storage Battery with 260mm Cable Kit', quantity: 1 },
    { sku: 'P06367-B21', description: 'HPE MR416i-o Gen11 x16 Lanes 8GB Cache OCP Storage Controller', quantity: 1 },
    { sku: 'P40498-B21', description: 'HPE 960GB SAS 12G Read Intensive SFF SSD', quantity: 4 }
  ];

  const rawStorage = evalStorageTriMode(items, null, {}, 1);
  assert.strictEqual(rawStorage.hasOcpCable, false, 'Battery 260mm cable kit must NOT set hasOcpCable to true');
  assert.strictEqual(rawStorage.needsCableKit, true, 'needsCableKit MUST remain true');
  assert.strictEqual(rawStorage.needsCapacitorCable, true, 'needsCapacitorCable MUST remain true');
});

test('Storage Challenge 3C: Adding genuine controller enablement cable kit remediates both cable checks', () => {
  const items = [
    { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 1 },
    { sku: 'P01366-B21', description: 'HPE 96W Smart Storage Battery with 145mm Cable Kit', quantity: 1 },
    { sku: 'P06367-B21', description: 'HPE MR416i-o Gen11 x16 Lanes 8GB Cache OCP Storage Controller', quantity: 1 },
    { sku: 'P40498-B21', description: 'HPE 960GB SAS 12G Read Intensive SFF SSD', quantity: 4 },
    { sku: 'P76700-B21', description: 'HPE ProLiant DL380 Gen12 Storage Controller Enablement Cable Kit', quantity: 1 }
  ];

  const rawStorage = evalStorageTriMode(items, null, {}, 1);
  assert.strictEqual(rawStorage.hasOcpCable, true, 'P76700-B21 must set hasOcpCable to true');
  assert.strictEqual(rawStorage.needsCableKit, false, 'needsCableKit must be false');
  assert.strictEqual(rawStorage.needsCapacitorCable, false, 'needsCapacitorCable must be false');
});

test('Storage Challenge 3D: Alletra 6000 storage array base with Controller Node Pair MUST NOT trigger server controller or battery errors', () => {
  const items = [
    { sku: 'R0Q35A', description: 'HPE Alletra 6000 24SFF Storage Array Base', quantity: 1 },
    { sku: 'R0Q36A', description: 'HPE Alletra 6000 Controller Node Pair', quantity: 2 },
    { sku: 'R0Q37A', description: 'HPE 1.92TB NVMe SSD', quantity: 8 }
  ];

  const rawStorage = evalStorageTriMode(items, null, {}, 1);
  assert.strictEqual(rawStorage.isAlletraArray, true, 'Must identify as Alletra storage array');
  assert.strictEqual(rawStorage.hasStorageController, false, 'Alletra controller node pair must NOT be classified as server RAID controller');
  assert.strictEqual(rawStorage.needsSmartStorageBattery, false, 'Alletra array must NOT demand Smart Storage Battery');
  assert.strictEqual(rawStorage.needsCableKit, false, 'Alletra array must NOT demand server controller cable kit');
  assert.strictEqual(rawStorage.needsDriveCageForController, false, 'Alletra array must NOT demand server drive cage');
  assert.strictEqual(rawStorage.hasMissingControllerNode, false, '2 controller nodes present must satisfy node pair requirement');

  const normalized = normalizeAspectResult('STORAGE_TRI_MODE', rawStorage);
  assert.strictEqual(normalized.status, 'PASS', 'Authentic Alletra 6000 configuration must PASS storage tri-mode');
  assert.strictEqual(normalized.errors.length, 0, `Alletra array must have zero errors: ${JSON.stringify(normalized.errors)}`);
});

test('Storage Challenge 3E: Alletra failure modes must still be caught deterministically', () => {
  // 1. Missing 2nd controller node (only 1 node configured)
  const singleNodeArray = [
    { sku: 'R0Q35A', description: 'HPE Alletra 6000 24SFF Storage Array Base', quantity: 1 },
    { sku: 'R0Q36A', description: 'HPE Alletra 6000 Node Controller Single', quantity: 1 },
    { sku: 'R0Q37A', description: 'HPE 1.92TB NVMe SSD', quantity: 8 }
  ];
  const r1 = evalStorageTriMode(singleNodeArray, null, {}, 1);
  assert.strictEqual(r1.hasMissingControllerNode, true, 'Must catch missing second controller node');

  // 2. Asymmetric HBAs (1 HBA across dual-node array)
  const asymmetricHbaArray = [
    { sku: 'R0Q35A', description: 'HPE Alletra 6000 24SFF Storage Array Base', quantity: 1 },
    { sku: 'R0Q36A', description: 'HPE Alletra 6000 Controller Node Pair', quantity: 2 },
    { sku: 'R0Q38A', description: 'HPE Alletra 32Gb 2-port Fibre Channel Host Bus Adapter', quantity: 1 },
    { sku: 'R0Q37A', description: 'HPE 1.92TB NVMe SSD', quantity: 8 }
  ];
  const r2 = evalStorageTriMode(asymmetricHbaArray, null, {}, 1);
  assert.strictEqual(r2.hasAsymmetricHbas, true, 'Must catch asymmetric HBA count');

  // 3. RAID 6 with fewer than 6 SSDs
  const insufficientRaid6 = [
    { sku: 'R0Q35A', description: 'HPE Alletra 6000 24SFF Storage Array Base', quantity: 1 },
    { sku: 'R0Q36A', description: 'HPE Alletra 6000 Controller Node Pair', quantity: 2 },
    { sku: 'R0Q39A', description: 'HPE RAID 6 Parity Configuration', quantity: 1 },
    { sku: 'R0Q37A', description: 'HPE 1.92TB NVMe SSD', quantity: 4 }
  ];
  const r3 = evalStorageTriMode(insufficientRaid6, null, {}, 1);
  assert.strictEqual(r3.insufficientRaid6Drives, true, 'Must catch insufficient SSDs for RAID 6');
});
