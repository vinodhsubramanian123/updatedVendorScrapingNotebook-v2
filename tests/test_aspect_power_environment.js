'use strict';
/**
 * tests/test_aspect_power_environment.js — Tests for Power & Environmental Aspect Pre-Check
 */

const { evalPowerEnvironment } = require('../scripts/lib/aspects/power_environment.js');

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
console.log(`🚀 POWER & ENVIRONMENTAL ASPECT TEST SUITE`);
console.log(`================================================================\n`);

console.log(`🔹 Test Group 1: PSU Counting and AC vs DC Detection`);
let items = [
  { sku: 'P12345-B21', description: 'HPE 800W Flex Slot Platinum Hot Plug Low Halogen Power Supply Kit', quantity: 2 }
];
let result = evalPowerEnvironment(items);
assert(result.psuCount === 2, `Counted 2 PSUs`);
assert(result.hasDcPowerSupply === false, `Correctly identified AC power supply (no DC flag)`);

items = [
  { sku: 'P17023-B21', description: 'HPE 1600W Flex Slot -48VDC Hot Plug Power Supply Kit', quantity: 2 }
];
result = evalPowerEnvironment(items);
assert(result.psuCount === 2, `Counted 2 PSUs`);
assert(result.hasDcPowerSupply === true, `Detected -48VDC power supply`);

items = [
  { sku: 'P54321-B21', description: 'HPE 800W Flex Slot 48V DC Hot Plug Power Supply Kit', quantity: 4 }
];
result = evalPowerEnvironment(items);
assert(result.hasDcPowerSupply === true, `Detected 48V DC power supply by description`);

console.log(`\n🔹 Test Group 2: DC Lug Kit Detection`);
items = [
  { sku: 'P36877-B21', description: 'HPE DC Power Cable Lug Kit', quantity: 1 }
];
result = evalPowerEnvironment(items);
assert(result.hasDcLugKit === true, `Detected DC Lug Kit by SKU`);

items = [
  { sku: 'P99999-B21', description: 'HPE Power Cable Lug Kit', quantity: 2 }
];
result = evalPowerEnvironment(items);
assert(result.hasDcLugKit === true, `Detected DC Lug Kit by description`);

items = [
  { sku: 'P12345-B21', description: 'HPE 800W Flex Slot Platinum Hot Plug Low Halogen Power Supply Kit', quantity: 2 }
];
result = evalPowerEnvironment(items);
assert(result.hasDcLugKit === false, `Did not detect DC Lug Kit when absent`);

console.log(`\n🔹 Test Group 3: High-line 277V requirement triggers`);
// Note: evalPowerEnvironment currently focuses on count, DC, and lug kits.
// For completeness, we verify it correctly identifies high-line as standard AC (not DC)
items = [
  { sku: 'P12345-B21', description: 'HPE 1600W Flex Slot Platinum Hot Plug Low Halogen 277VAC Power Supply Kit', quantity: 2 }
];
result = evalPowerEnvironment(items);
assert(result.psuCount === 2, `Counted 2 high-line PSUs`);
assert(result.hasDcPowerSupply === false, `High-line 277VAC is not marked as DC`);

console.log(`\n================================================================`);
console.log(`📊 FINAL TEST SUMMARY: ${totalPasses} PASSED | ${totalFails} FAILED`);
console.log(`================================================================\n`);

if (totalFails > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
