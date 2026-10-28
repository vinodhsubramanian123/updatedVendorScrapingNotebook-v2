'use strict';

const fs = require('fs');
const path = require('path');
const Module = require('module');

// 1. Test simulated pcie_riser fix
const pcieRiserPath = path.resolve(__dirname, '../../../scripts/lib/aspects/pcie_riser.js');
let pcieCode = fs.readFileSync(pcieRiserPath, 'utf8');

pcieCode = pcieCode.replace(
  'function tallyRiserCards(tally, desc, sku, qty, role) {',
  `function tallyRiserCards(tally, desc, sku, qty, role) {
  if (role === 'Cable Kit' || role === 'PCIe Riser Cable' || desc.includes('cable') || desc.includes('cbl') || desc.includes('cord') || sku === 'P56073-B21' || sku === 'P56074-B21') return;
  if (desc.includes('blank') || desc.includes('bracket') || desc.includes('baffle')) return;`
);

const pcieMod = new Module(pcieRiserPath, module);
pcieMod.filename = pcieRiserPath;
pcieMod.paths = Module._nodeModulePaths(path.dirname(pcieRiserPath));
pcieMod._compile(pcieCode, pcieRiserPath);

const { evalPcieRiserSlots } = pcieMod.exports;

console.log('=== PCIE RISER VERIFICATION ===');
// Attack 1 test:
const cableOnlyRes = evalPcieRiserSlots([
  { sku: 'P08443-B21', description: 'Intel E810-XXVDA2 Adapter', quantity: 1 },
  { sku: 'P56073-B21', description: 'HPE ProLiant DL380 Gen11 Primary Riser Cable Kit', quantity: 1 }
]);
console.log('Attack 1 (Only Cable Kit):', {
  primaryRiserCount: cableOnlyRes.primaryRiserCount,
  needsPrimaryRiser: cableOnlyRes.needsPrimaryRiser,
  activeSlotsAvailable: cableOnlyRes.activeSlotsAvailable,
  hasPrimaryCableKit: cableOnlyRes.hasPrimaryCableKit
});

// Normal test: Riser board + Cable Kit
const normalRes = evalPcieRiserSlots([
  { sku: 'P48803-B21', description: 'HPE ProLiant DL380 Gen11 x16/x8/x8 Primary Riser Kit', quantity: 1 },
  { sku: 'P56073-B21', description: 'HPE ProLiant DL380 Gen11 Primary Riser Cable Kit', quantity: 1 }
]);
console.log('Normal (Riser board + Cable Kit):', {
  primaryRiserCount: normalRes.primaryRiserCount,
  needsPrimaryRiser: normalRes.needsPrimaryRiser,
  activeSlotsAvailable: normalRes.activeSlotsAvailable,
  hasPrimaryCableKit: normalRes.hasPrimaryCableKit
});

// 2. Test simulated storage_tri_mode fix
const storagePath = path.resolve(__dirname, '../../../scripts/lib/aspects/storage_tri_mode.js');
let storageCode = fs.readFileSync(storagePath, 'utf8');

// Fix 1: Exclude controller node, node pair, alletra from isHardwareStorageController
storageCode = storageCode.replace(
  "!desc.includes('node controller') &&",
  "!desc.includes('node controller') &&\n    !desc.includes('controller node') &&\n    !desc.includes('node pair') &&\n    !desc.includes('alletra') &&"
);

// Fix 2: Decouple battery cables from hasOcpCable, add P48918-B21
storageCode = storageCode.replace(
  `sku === 'P76700-B21' || sku === 'P01367-B21' || sku === 'P01366-B21' ||
      desc.includes('with 260mm cable') || desc.includes('with 145mm cable') ||`,
  `sku === 'P76700-B21' || sku === 'P48918-B21' ||`
);

// Fix 3: export isServerChassis from validateStorageCablingAndBackplane
storageCode = storageCode.replace(
  `    backplaneCapacity
  };`,
  `    backplaneCapacity,
    isServerChassis
  };`
);

// Fix 4: Scope needsSmartStorageBattery to isServerChassis
storageCode = storageCode.replace(
  `    needsSmartStorageBattery: t.hasStorageController && !t.hasSmartBattery,`,
  `    needsSmartStorageBattery: Boolean(cabling.isServerChassis && t.hasStorageController && !t.hasSmartBattery),`
);

const storageMod = new Module(storagePath, module);
storageMod.filename = storagePath;
storageMod.paths = Module._nodeModulePaths(path.dirname(storagePath));
storageMod._compile(storageCode, storagePath);

const { evalStorageTriMode } = storageMod.exports;
const { normalizeAspectResult } = require('../../../scripts/lib/aspects/aspect_registry.js');

console.log('\n=== STORAGE TRI-MODE VERIFICATION ===');
// Test 1: P01366-B21 with MR416i-o without P76700-B21
const items1 = [
  { sku: 'P73282-B21', description: 'DL380 Gen12 8SFF Server', quantity: 1 },
  { sku: 'P01366-B21', description: 'HPE 96W Smart Storage Battery with 145mm Cable Kit', quantity: 1 },
  { sku: 'P06367-B21', description: 'HPE MR416i-o Gen11 Controller', quantity: 1 },
  { sku: 'P40498-B21', description: '960GB SAS SSD', quantity: 4 }
];
const res1 = evalStorageTriMode(items1);
console.log('Test 1 (Battery without controller cable):', {
  hasStorageController: res1.hasStorageController,
  hasSmartBattery: res1.hasSmartBattery,
  hasOcpCable: res1.hasOcpCable,
  needsCableKit: res1.needsCableKit,
  needsCapacitorCable: res1.needsCapacitorCable
});

// Test 1b: Remediated with P76700-B21
const items1b = [
  ...items1,
  { sku: 'P76700-B21', description: 'HPE ProLiant DL380 Gen12 Storage Controller Enablement Cable Kit', quantity: 1 }
];
const res1b = evalStorageTriMode(items1b);
console.log('Test 1b (Battery with controller cable):', {
  hasOcpCable: res1b.hasOcpCable,
  needsCableKit: res1b.needsCableKit,
  needsCapacitorCable: res1b.needsCapacitorCable
});

// Test 1c: Remediated with P48918-B21
const items1c = [
  ...items1,
  { sku: 'P48918-B21', description: 'HPE ProLiant DL380 Gen11 Cable Kit', quantity: 1 }
];
const res1c = evalStorageTriMode(items1c);
console.log('Test 1c (Battery with Gen11 controller cable P48918-B21):', {
  hasOcpCable: res1c.hasOcpCable,
  needsCableKit: res1c.needsCableKit,
  needsCapacitorCable: res1c.needsCapacitorCable
});

// Test 2: Alletra Array
const items2 = [
  { sku: 'R0Q35A', description: 'HPE Alletra 6000 24SFF Storage Array Base', quantity: 1 },
  { sku: 'R0Q36A', description: 'HPE Alletra 6000 Controller Node Pair', quantity: 2 },
  { sku: 'R0Q37A', description: 'HPE 1.92TB NVMe SSD', quantity: 8 }
];
const res2 = evalStorageTriMode(items2);
const norm2 = normalizeAspectResult('STORAGE_TRI_MODE', res2);
console.log('Test 2 (Alletra):', {
  hasStorageController: res2.hasStorageController,
  needsSmartStorageBattery: res2.needsSmartStorageBattery,
  isAlletraArray: res2.isAlletraArray,
  controllerNodeCount: res2.controllerNodeCount,
  normErrors: norm2.errors
});
