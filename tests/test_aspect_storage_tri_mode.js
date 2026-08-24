'use strict';
/**
 * tests/test_aspect_storage_tri_mode.js — Tests for Storage & Tri-Mode Controller Aspect Pre-Check
 */

const { evalStorageTriMode } = require('../scripts/lib/aspects/storage_tri_mode.js');

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
assert(result.hasSmartBattery === true, `Detected battery backup requirement for Tri-Mode`);

console.log(`\n================================================================`);
console.log(`📊 FINAL TEST SUMMARY: ${totalPasses} PASSED | ${totalFails} FAILED`);
console.log(`================================================================\n`);

if (totalFails > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
