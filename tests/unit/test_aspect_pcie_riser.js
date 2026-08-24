'use strict';
/**
 * tests/test_aspect_pcie_riser.js — Tests for PCIe Slot Capacity & Riser Aspect Pre-Check
 */

const { evalPcieRiserSlots } = require('../../scripts/lib/aspects/pcie_riser.js');

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
console.log(`🚀 PCIE RISER ASPECT TEST SUITE`);
console.log(`================================================================\n`);

console.log(`🔹 Test Group 1: Required PCIe Cards Counting`);
let items = [
  { sku: 'P12345-B21', description: 'HPE NVIDIA Tesla V100 PCIe 32GB Computational Accelerator', quantity: 2 },
  { sku: 'P54321-B21', description: 'HPE SN1610E 32Gb 2-port Fibre Channel Host Bus Adapter', quantity: 1 }
];
let result = evalPcieRiserSlots(items);
assert(result.requiredPcieCards === 3, `Counted 3 required PCIe cards (2 GPUs + 1 HBA)`);

items = [
  { sku: 'P12345-B21', description: 'HPE NVIDIA Tesla V100 PCIe 32GB Computational Accelerator', quantity: 2 },
  { sku: 'P54321-B21', description: 'HPE Ethernet 10/25Gb 2-port FLR-SFP28 Adapter', quantity: 1 } // FLR/OCP usually doesn't count towards standard PCIe slots in some contexts, but the logic excludes 'ocp' 'embedded' 'lom'
];
result = evalPcieRiserSlots(items);
assert(result.requiredPcieCards === 3, `Counted 3 cards (FLR not explicitly excluded in basic regex unless it has 'ocp' or 'lom')`); // Wait, let's test specific exclusions

items = [
  { sku: 'P99999-B21', description: 'HPE Ethernet 10/25Gb 2-port OCP3 Adapter', quantity: 1 }
];
result = evalPcieRiserSlots(items);
assert(result.requiredPcieCards === 0, `Excluded OCP adapter from PCIe card count`);

console.log(`\n🔹 Test Group 2: Riser Counting and Total Slots`);
items = [
  { sku: 'P11111-B21', description: 'HPE DL380 Gen10 Primary Riser Kit', quantity: 1 }
];
result = evalPcieRiserSlots(items);
assert(result.primaryRiserCount === 1, `Counted 1 primary riser`);
assert(result.totalSlotsAvailable === 6, `Calculated 6 slots available (3 base + 3 from primary riser)`);

items = [
  { sku: 'P22222-B21', description: 'HPE DL380 Gen10 Secondary Riser Kit', quantity: 1 },
  { sku: 'P33333-B21', description: 'HPE DL380 Gen10 Tertiary Riser Kit', quantity: 1 }
];
result = evalPcieRiserSlots(items);
assert(result.secondaryRiserCount === 1, `Counted 1 secondary riser`);
assert(result.tertiaryRiserCount === 1, `Counted 1 tertiary riser`);
assert(result.totalSlotsAvailable === 8, `Calculated 8 slots available (3 base + 0 primary + 3 secondary + 2 tertiary)`);

console.log(`\n🔹 Test Group 3: Secondary Riser Requirement Logic`);
items = [
  { sku: 'P12345-B21', description: 'HPE NVIDIA Tesla V100 PCIe 32GB Computational Accelerator', quantity: 4 }
];
result = evalPcieRiserSlots(items);
assert(result.needsSecondaryRiser === true, `4 cards require secondary riser (3 base slots available)`);

items = [
  { sku: 'P12345-B21', description: 'HPE NVIDIA Tesla V100 PCIe 32GB Computational Accelerator', quantity: 3 }
];
result = evalPcieRiserSlots(items);
assert(result.needsSecondaryRiser === false, `3 cards do not require secondary riser`);

items = [
  { sku: 'P12345-B21', description: 'HPE NVIDIA Tesla V100 PCIe 32GB Computational Accelerator', quantity: 5 },
  { sku: 'P11111-B21', description: 'HPE Primary Riser Kit', quantity: 1 }
];
result = evalPcieRiserSlots(items);
assert(result.needsSecondaryRiser === false, `5 cards with primary riser (6 slots) do not require secondary riser`);

items = [
  { sku: 'P12345-B21', description: 'HPE NVIDIA Tesla V100 PCIe 32GB Computational Accelerator', quantity: 7 },
  { sku: 'P11111-B21', description: 'HPE Primary Riser Kit', quantity: 1 }
];
result = evalPcieRiserSlots(items);
assert(result.needsSecondaryRiser === true, `7 cards with primary riser (6 slots) require secondary riser`);

console.log(`\n================================================================`);
console.log(`📊 FINAL TEST SUMMARY: ${totalPasses} PASSED | ${totalFails} FAILED`);
console.log(`================================================================\n`);

if (totalFails > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
