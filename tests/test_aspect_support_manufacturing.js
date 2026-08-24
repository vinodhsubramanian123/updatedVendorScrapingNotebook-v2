'use strict';
/**
 * tests/test_aspect_support_manufacturing.js — Tests for Support & Manufacturing Aspect Pre-Check
 */

const { evalSupportManufacturing } = require('../scripts/lib/aspects/support_manufacturing.js');

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
console.log(`🚀 SUPPORT & MANUFACTURING ASPECT TEST SUITE`);
console.log(`================================================================\n`);

console.log(`🔹 Test Group 1: Support Service Detection`);
let items = [
  { sku: 'HU4A6A50C4V', description: 'HPE 3 Year Tech Care Essential Service', quantity: 1 }
];
let result = evalSupportManufacturing(items);
assert(result.hasSupportService === true, `Detected support service by SKU format`);

items = [
  { sku: 'P99999-B21', description: 'HPE 3 Year Tech Care Basic Service', quantity: 1 }
];
result = evalSupportManufacturing(items);
assert(result.hasSupportService === true, `Detected support service by 'tech care' description`);

items = [
  { sku: 'P99999-B21', description: 'HPE 3 Year Support Warranty', quantity: 1 }
];
result = evalSupportManufacturing(items);
assert(result.hasSupportService === true, `Detected support service by 'warranty' description`);

items = [
  { sku: 'P12345-B21', description: 'HPE ProLiant DL380 Gen11 Server', quantity: 1 }
];
result = evalSupportManufacturing(items);
assert(result.hasSupportService === false, `Did not detect support service when absent`);

console.log(`\n🔹 Test Group 2: Pointnext Tech Care SLA validation and FIO option consistency`);
// Detailed SLA logic is usually part of boq_evaluator.js or catalog checks,
// but we ensure the basic `hasSupportService` picks up typical tech care combinations.
items = [
  { sku: 'P12345-B21', description: 'HPE ProLiant DL380 Gen11 CTO Server', quantity: 1 },
  { sku: 'P54321-F21', description: 'HPE 32GB Smart Memory FIO Kit', quantity: 2 },
  { sku: 'H1K92A3', description: 'HPE 3 Year Tech Care Critical Service', quantity: 1 }
];
result = evalSupportManufacturing(items);
assert(result.hasSupportService === true, `Detected tech care service among CTO and FIO parts`);

console.log(`\n================================================================`);
console.log(`📊 FINAL TEST SUMMARY: ${totalPasses} PASSED | ${totalFails} FAILED`);
console.log(`================================================================\n`);

if (totalFails > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
