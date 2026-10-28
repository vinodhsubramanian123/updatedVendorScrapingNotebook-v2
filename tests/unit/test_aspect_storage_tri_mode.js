'use strict';
/**
 * tests/test_aspect_storage_tri_mode.js — Tests for Storage & Tri-Mode Controller Aspect Pre-Check
 */

const { evalStorageTriMode } = require('../../scripts/lib/aspects/storage_tri_mode.js');

let totalPasses = 0;
let totalFails = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    totalPasses++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    totalFails++;
  }
}

console.log(`================================================================`);
console.log(`🚀 STORAGE & TRI-MODE CONTROLLER ASPECT TEST SUITE`);
console.log(`================================================================\n`);

console.log(`🔹 Test Group 1: Drive counting and storage controller detection`);
let items = [
  { sku: 'P12345-B21', description: 'HPE 1.2TB SAS 10K SFF HDD', quantity: 8 },
  { sku: 'P54321-B21', description: 'HPE MR416i-p Gen11 x16 Lanes 4GB Cache NVMe/SAS 12G Controller', quantity: 1 }
];
let result = evalStorageTriMode(items);
assert(result.driveCount === 8, `Counted 8 drives`);
assert(result.hasStorageController === true, `Detected storage controller`);

items = [
  { sku: 'P12345-B21', description: 'HPE 1.2TB SAS 10K SFF HDD', quantity: 4 },
  { sku: 'P54321-B21', description: 'HPE 800GB SAS 12G Mixed Use SFF SSD', quantity: 4 }
];
result = evalStorageTriMode(items);
assert(result.driveCount === 8, `Counted 8 drives (HDD + SSD)`);
assert(result.hasStorageController === false, `No storage controller detected`);

console.log(`\n🔹 Test Group 2: Smart Storage Battery Detection`);
items = [
  { sku: 'P01366-B21', description: 'HPE 96W Smart Storage Battery with 145mm Cable Kit', quantity: 1 }
];
result = evalStorageTriMode(items);
assert(result.hasSmartBattery === true, `Detected smart storage battery by SKU`);

items = [
  { sku: 'P99999-B21', description: 'HPE Smart Storage Battery', quantity: 1 }
];
result = evalStorageTriMode(items);
assert(result.hasSmartBattery === true, `Detected smart storage battery by description`);

items = [
  { sku: 'P54321-B21', description: 'HPE MR416i-p Gen11 x16 Lanes 4GB Cache NVMe/SAS 12G Controller', quantity: 1 }
];
result = evalStorageTriMode(items);
assert(result.hasSmartBattery === false, `Did not detect smart storage battery when absent`);

console.log(`\n🔹 Test Group 3: No Drive Kit Detection`);
items = [
  { sku: '873763-B21', description: 'HPE ProLiant DL380 Gen10 SFF No Drive FIO Configuration', quantity: 1 }
];
result = evalStorageTriMode(items);
assert(result.hasNoDriveKit === true, `Detected No Drive Kit by SKU`);
assert(result.driveCount === 0, `Drive count is 0 when No Drive Kit is present`);

items = [
  { sku: 'P99999-B21', description: 'HPE No Drive Configuration', quantity: 1 }
];
result = evalStorageTriMode(items);
assert(result.hasNoDriveKit === true, `Detected No Drive Kit by description`);

console.log(`\n🔹 Test Group 4: Tri-Mode Controller Dependencies (Basic Component Extraction)`);
// Note: Detailed dependency resolution is in boq_evaluator.js, we test if the base inputs are extracted correctly
items = [
  { sku: 'P54321-B21', description: 'HPE MR416i-p Gen11 x16 Lanes 4GB Cache NVMe/SAS 12G Controller', quantity: 1 },
  { sku: 'P01366-B21', description: 'HPE 96W Smart Storage Battery', quantity: 1 }
];
result = evalStorageTriMode(items);
assert(result.hasStorageController === true, `Detected controller for Tri-Mode cabling`);
console.log(`\n🔹 Test Group 5: Drive Form Factor Tracking and LFF in SFF Mismatch`);
items = [
  { sku: 'P12345-B21', description: 'HPE 960GB SAS 12G Read Intensive SFF BC Multi Vendor SSD', quantity: 4 },
  { sku: 'P54321-B21', description: 'HPE 18TB SAS 12G Business Critical 7.2K LFF LP 512e Multi Vendor HDD', quantity: 2 }
];
result = evalStorageTriMode(items);
assert(result.sffDriveCount === 4, `Counted 4 SFF drives`);
assert(result.lffDriveCount === 2, `Counted 2 LFF drives`);
assert(result.hasLffDrivesInSffChassis === true, `Flagged LFF drives in non-LFF chassis`);

console.log(`\n🔹 Test Group 6: Intel VROC and Boot Device Battery Exemption (INV-0, INV-72)`);
items = [
  { sku: 'R7J57A', description: 'Intel Virtual RAID on CPU Premium FIO Software for HPE', quantity: 1 },
  { sku: 'P84244-B21', description: 'HPE 3.84TB NVMe Gen4 Read Intensive SFF BC U.3 SSD', quantity: 4 }
];
result = evalStorageTriMode(items);
assert(result.hasVroc === true, `Identified Intel VROC software RAID`);
assert(result.hasStorageController === false, `VROC is not marked as hardware storage controller`);
assert(result.needsSmartStorageBattery === false, `Intel VROC direct-attach does not require Smart Storage Battery`);

items = [
  { sku: 'P78279-B21', description: 'HPE NS204i-u v2 480GB NVMe Hot Plug Boot Optimized Storage Device', quantity: 1 }
];
result = evalStorageTriMode(items);
assert(result.hasBootController === true, `Identified NS204i-u boot controller`);
assert(result.hasStorageController === false, `Boot controller is not marked as hardware storage controller`);
assert(result.needsSmartStorageBattery === false, `NS204i-u does not require Smart Storage Battery`);

// Test: Battery cables decoupled from hasOcpCable
items = [
  { sku: 'P73282-B21', description: 'DL380 Gen12 8SFF Server', quantity: 1 },
  { sku: 'P01366-B21', description: 'HPE 96W Smart Storage Battery with 145mm Cable Kit', quantity: 1 },
  { sku: 'P06367-B21', description: 'HPE MR416i-o Gen11 Controller', quantity: 1 },
  { sku: 'P40498-B21', description: '960GB SAS SSD', quantity: 4 }
];
result = evalStorageTriMode(items);
assert(result.hasOcpCable === false, 'Battery kit with 145mm cable does not satisfy hasOcpCable');
assert(result.needsCableKit === true, 'needsCableKit is true when controller enablement cable is missing');
assert(result.needsCapacitorCable === true, 'needsCapacitorCable is true when controller enablement cable is missing');

// Test: Alletra Controller Node Pair does not trigger server battery error
items = [
  { sku: 'R0Q35A', description: 'HPE Alletra 6000 24SFF Storage Array Base', quantity: 1 },
  { sku: 'R0Q36A', description: 'HPE Alletra 6000 Controller Node Pair', quantity: 2 },
  { sku: 'R0Q37A', description: 'HPE 1.92TB NVMe SSD', quantity: 8 }
];
result = evalStorageTriMode(items);
assert(result.hasStorageController === false, 'Alletra controller node pair is not a server storage controller');
assert(result.needsSmartStorageBattery === false, 'Alletra storage array does not need Smart Storage Battery');

console.log(`\n================================================================`);
console.log(`📊 FINAL TEST SUMMARY: ${totalPasses} PASSED | ${totalFails} FAILED`);
console.log(`================================================================\n`);

if (totalFails > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

