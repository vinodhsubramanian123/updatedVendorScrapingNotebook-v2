'use strict';
/**
 * tests/test_aspect_memory_channel.js — Tests for Memory & Channel Symmetry Aspect Pre-Check
 */

const { evalMemoryChannel } = require('../scripts/lib/aspects/memory_channel.js');

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
console.log(`🚀 MEMORY & CHANNEL SYMMETRY ASPECT TEST SUITE`);
console.log(`================================================================\n`);

console.log(`🔹 Test Group 1: Memory Counting and Total GB calculation`);
let items = [
  { sku: 'P54321-B21', description: 'HPE 32GB 2Rx4 PC4-3200AA-R Smart Memory Kit', quantity: 4 }
];
let result = evalMemoryChannel(items);
assert(result.memoryCount === 4, `Counted 4 memory modules`);
assert(result.totalMemoryGb === 128, `Calculated 128GB total memory`);

items = [
  { sku: 'P54321-B21', description: 'HPE 64GB 2Rx4 PC4-3200AA-R Smart Memory Kit', quantity: 2 },
  { sku: 'P98765-B21', description: 'HPE 16GB 1Rx4 PC4-3200AA-R Smart Memory Kit', quantity: 8 }
];
result = evalMemoryChannel(items);
assert(result.memoryCount === 10, `Counted 10 memory modules`);
assert(result.totalMemoryGb === 256, `Calculated 256GB total memory`);

console.log(`\n🔹 Test Group 2: Balanced Memory Checking (Multiple of 8 per CPU)`);
// Assuming 2 CPUs by default if not specified
items = [
  { sku: 'P54321-B21', description: 'HPE 32GB 2Rx4 PC4-3200AA-R Smart Memory Kit', quantity: 16 }
];
result = evalMemoryChannel(items, 2);
assert(result.isBalancedChannel === true, `16 DIMMs with 2 CPUs (8 per CPU) is balanced`);

items = [
  { sku: 'P54321-B21', description: 'HPE 32GB 2Rx4 PC4-3200AA-R Smart Memory Kit', quantity: 12 }
];
result = evalMemoryChannel(items, 2);
assert(result.isBalancedChannel === false, `12 DIMMs with 2 CPUs (6 per CPU) is not a multiple of 8`);

items = [
  { sku: 'P54321-B21', description: 'HPE 32GB 2Rx4 PC4-3200AA-R Smart Memory Kit', quantity: 8 }
];
result = evalMemoryChannel(items, 1);
assert(result.isBalancedChannel === true, `8 DIMMs with 1 CPU (8 per CPU) is balanced`);

items = [
  { sku: 'P54321-B21', description: 'HPE 32GB 2Rx4 PC4-3200AA-R Smart Memory Kit', quantity: 15 }
];
result = evalMemoryChannel(items, 2);
assert(result.isBalancedChannel === false, `15 DIMMs with 2 CPUs (7.5 per CPU) is unbalanced`);

console.log(`\n🔹 Test Group 3: 1DPC vs 2DPC slot balance and odd channels`);
items = [
  { sku: 'P54321-B21', description: 'HPE 32GB 2Rx4 PC4-3200AA-R Smart Memory Kit', quantity: 16 }
];
result = evalMemoryChannel(items, 2);
assert(result.isBalancedChannel === true, `1DPC with 16 DIMMs across 2 CPUs is balanced`);

items = [
  { sku: 'P54321-B21', description: 'HPE 32GB 2Rx4 PC4-3200AA-R Smart Memory Kit', quantity: 32 }
];
result = evalMemoryChannel(items, 2);
assert(result.isBalancedChannel === true, `2DPC with 32 DIMMs across 2 CPUs is balanced (16 per CPU, mult of 8)`);

items = [
  { sku: 'P54321-B21', description: 'HPE 32GB 2Rx4 PC4-3200AA-R Smart Memory Kit', quantity: 24 }
];
result = evalMemoryChannel(items, 2);
assert(result.isBalancedChannel === false, `24 DIMMs across 2 CPUs (12 per CPU) is not mult of 8`);

items = [
  { sku: 'P54321-B21', description: 'HPE 32GB 2Rx4 PC4-3200AA-R Smart Memory Kit', quantity: 9 }
];
result = evalMemoryChannel(items, 2);
assert(result.isBalancedChannel === false, `Odd channel population is unbalanced`);

console.log(`\n🔹 Test Group 4: BTO vs FIO logic for CTO chassis`);
items = [
  { sku: 'P12345-B21', description: 'Configure-To-Order Chassis', quantity: 1 },
  { sku: 'P54321-B21', description: 'HPE 32GB 2Rx4 PC4-3200AA-R Smart Memory Kit', quantity: 4 }
];
result = evalMemoryChannel(items);
assert(result.hasBtoMemoryInCto === true, `Detected standalone BTO memory in CTO chassis`);
assert(result.btoMemoryViolations.length === 1, `Logged BTO memory violation`);
assert(result.btoMemoryViolations[0].btoSku === 'P54321-B21', `Violation specifies BTO SKU`);
assert(result.btoMemoryViolations[0].fioSku === 'P54321-F21', `Violation proposes FIO SKU`);

items = [
  { sku: 'P12345-B21', description: 'Configure-To-Order Chassis', quantity: 1 },
  { sku: 'P54321-F21', description: 'HPE 32GB 2Rx4 PC4-3200AA-R Smart Memory Kit FIO', quantity: 4 }
];
result = evalMemoryChannel(items);
assert(result.hasBtoMemoryInCto === false, `FIO memory in CTO chassis is allowed`);

items = [
  { sku: 'P12345-B21', description: 'Configure-To-Order Chassis', quantity: 1 },
  { sku: 'P54321-B21', description: 'HPE 32GB 2Rx4 PC4-3200AA-R Smart Memory Kit Factory Integrated', quantity: 4 }
];
result = evalMemoryChannel(items);
assert(result.hasBtoMemoryInCto === false, `BTO memory with 'factory integrated' description is allowed`);

items = [
  { sku: 'P12345-B21', description: 'Pre-configured Server', quantity: 1 },
  { sku: 'P54321-B21', description: 'HPE 32GB 2Rx4 PC4-3200AA-R Smart Memory Kit', quantity: 4 }
];
result = evalMemoryChannel(items);
assert(result.hasBtoMemoryInCto === false, `Standalone BTO memory allowed in non-CTO chassis`);

console.log(`\n🔹 Test Group 5: x4 vs x8 DRAM mixing rejection`);
// In `memory_channel.js`, there's no explicit x4/x8 check right now, but let's test that
// at least it parses the items properly. If it is implemented in the future, these tests will cover it.
items = [
  { sku: 'P54321-B21', description: 'HPE 32GB 2Rx4 PC4-3200AA-R Smart Memory Kit', quantity: 16 },
  { sku: 'P98765-B21', description: 'HPE 32GB 2Rx8 PC4-3200AA-R Smart Memory Kit', quantity: 16 }
];
result = evalMemoryChannel(items, 2);
assert(result.memoryItems.length === 2, `Parsed both x4 and x8 memory modules`);

console.log(`\n================================================================`);
console.log(`📊 FINAL TEST SUMMARY: ${totalPasses} PASSED | ${totalFails} FAILED`);
console.log(`================================================================\n`);

if (totalFails > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
