'use strict';
/**
 * tests/test_aspect_compute_thermal.js — Tests for Compute & Thermal Aspect Pre-Check
 */

const { evalComputeThermal } = require('../scripts/lib/aspects/compute_thermal.js');

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
console.log(`🚀 COMPUTE & THERMAL ASPECT TEST SUITE`);
console.log(`================================================================\n`);

console.log(`🔹 Test Group 1: Basic CPU counting and TDP Extraction`);
let items = [
  { sku: 'P12345-B21', description: 'Intel Xeon Gold 6330 2.0GHz 28-core 205W Processor', quantity: 2 },
  { sku: 'P54321-B21', description: 'HPE 32GB 2Rx4 PC4-3200AA-R Smart Kit', quantity: 8 }
];
let result = evalComputeThermal(items);
assert(result.cpuCount === 2, `Counted 2 CPUs`);
assert(result.maxCpuTdpWatts === 205, `Extracted 205W max TDP`);

console.log(`\n🔹 Test Group 2: Boundary Tests (>240W, >300W, >350W)`);
items = [
  { sku: 'P98765-B21', description: 'AMD EPYC 9534 2.45GHz 64-core 280W Processor', quantity: 1 }
];
result = evalComputeThermal(items);
assert(result.cpuCount === 1, `Counted 1 CPU`);
assert(result.maxCpuTdpWatts === 280, `Extracted 280W max TDP (>240W boundary)`);

items = [
  { sku: 'P11223-B21', description: 'Intel Xeon Platinum 8490H 1.9GHz 60-core 350W Processor', quantity: 2 }
];
result = evalComputeThermal(items);
assert(result.cpuCount === 2, `Counted 2 CPUs`);
assert(result.maxCpuTdpWatts === 350, `Extracted 350W max TDP (350W boundary)`);

items = [
  { sku: 'P44556-B21', description: 'AMD EPYC 9754 2.25GHz 128-core 360W Processor', quantity: 1 }
];
result = evalComputeThermal(items);
assert(result.maxCpuTdpWatts === 360, `Extracted 360W max TDP (>350W boundary)`);

console.log(`\n🔹 Test Group 3: High-Performance Fans and Heatsinks Triggers`);
items = [
  { sku: 'P11223-B21', description: 'Intel Xeon Platinum 8490H 1.9GHz 60-core 350W Processor', quantity: 2 }
];
result = evalComputeThermal(items, null, { HIGH_PERF_FAN_KIT: { sku: 'P48820-B21' }, HIGH_PERF_HEATSINK: { sku: 'P12345-B21' } });
assert(result.hasHighPerfFans === false, `High perf fans correctly identified as missing`);
assert(result.hasHeatsinks === false, `High perf heatsinks correctly identified as missing`);

items = [
  { sku: 'P11223-B21', description: 'Intel Xeon Platinum 8490H 1.9GHz 60-core 350W Processor', quantity: 2 },
  { sku: 'P48820-B21', description: 'HPE High Performance Fan Kit', quantity: 1 }
];
result = evalComputeThermal(items, null, { HIGH_PERF_FAN_KIT: { sku: 'P48820-B21' } });
assert(result.hasHighPerfFans === true, `High perf fans correctly identified as present`);

items = [
  { sku: 'P11223-B21', description: 'Intel Xeon Platinum 8490H 1.9GHz 60-core 350W Processor', quantity: 2 },
  { sku: 'P48820-B21', description: 'HPE High Performance Fan Kit', quantity: 1 },
  { sku: 'P12345-B21', description: 'HPE High Performance Heatsink Kit', quantity: 2 }
];
result = evalComputeThermal(items, null, { HIGH_PERF_FAN_KIT: { sku: 'P48820-B21' }, HIGH_PERF_HEATSINK: { sku: 'P12345-B21' } });
assert(result.hasHighPerfFans === true, `High perf fans correctly identified as present`);
assert(result.hasHeatsinks === true, `High perf heatsinks correctly identified as present`);

console.log(`\n🔹 Test Group 4: Dual-socket TDP Mismatch`);
items = [
  { sku: 'P11223-B21', description: 'Intel Xeon Platinum 8490H 1.9GHz 60-core 350W Processor', quantity: 1 },
  { sku: 'P12345-B21', description: 'Intel Xeon Gold 6330 2.0GHz 28-core 205W Processor', quantity: 1 }
];
result = evalComputeThermal(items);
assert(result.cpuCount === 2, `Counted 2 CPUs`);
assert(result.maxCpuTdpWatts === 350, `Extracted 350W max TDP correctly from multiple SKUs`);

console.log(`\n================================================================`);
console.log(`📊 FINAL TEST SUMMARY: ${totalPasses} PASSED | ${totalFails} FAILED`);
console.log(`================================================================\n`);

if (totalFails > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
