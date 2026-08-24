'use strict';
/**
 * tests/test_aspect_networking_ocp.js — Tests for Networking & OCP 3.0 Interconnect Aspect Pre-Check
 */

const { evalNetworkingOcp } = require('../scripts/lib/aspects/networking_ocp.js');

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
console.log(`🚀 NETWORKING & OCP 3.0 ASPECT TEST SUITE`);
console.log(`================================================================\n`);

console.log(`🔹 Test Group 1: Counting Network Ports`);
let items = [
  { sku: 'P12345-B21', description: 'HPE Ethernet 10Gb 2-port BASE-T Adapter', quantity: 2 }
];
let result = evalNetworkingOcp(items);
assert(result.networkPortsCount === 4, `Counted 4 ports (2x 2-port adapters)`);

items = [
  { sku: 'P12345-B21', description: 'HPE Ethernet 1Gb 4-port BASE-T Adapter', quantity: 1 }
];
result = evalNetworkingOcp(items);
assert(result.networkPortsCount === 4, `Counted 4 ports from 4-port description`);

items = [
  { sku: 'P12345-B21', description: 'HPE Ethernet 10/25Gb dual port SFP28 Adapter', quantity: 2 }
];
result = evalNetworkingOcp(items);
assert(result.networkPortsCount === 4, `Counted 4 ports using 'dual' keyword`);

items = [
  { sku: 'P12345-B21', description: 'HPE Ethernet 100Gb 1-port Adapter', quantity: 3 }
];
// Note: Changed description to avoid 'QSFP28' / 'QSFP56' since those trigger 'Transceiver' role
// mapping which are explicitly skipped by the `networking_ocp.js` evaluator.
result = evalNetworkingOcp(items);
assert(result.networkPortsCount === 3, `Counted 3 ports from 1-port description`);

items = [
  { sku: 'P12345-B21', description: 'HPE Ethernet 200Gb 1-port PCIe3 x16 Adapter', quantity: 1 }
];
result = evalNetworkingOcp(items);
assert(result.networkPortsCount === 1, `Counted 1 port from 1-port description`);

console.log(`\n🔹 Test Group 2: OCP Adapter Detection and Counting`);
items = [
  { sku: 'P54321-B21', description: 'HPE Ethernet 10/25Gb 2-port SFP28 OCP3 Adapter', quantity: 1 }
];
result = evalNetworkingOcp(items);
assert(result.hasOcpAdapter === true, `Detected OCP adapter`);
assert(result.ocpAdapterCount === 1, `Counted 1 OCP adapter`);

items = [
  { sku: 'P54321-B21', description: 'HPE Ethernet 10/25Gb 2-port SFP28 OCP3 Adapter', quantity: 3 }
];
result = evalNetworkingOcp(items);
assert(result.hasOcpAdapter === true, `Detected OCP adapter`);
assert(result.ocpAdapterCount === 3, `Counted 3 OCP adapters`);

items = [
  { sku: 'P12345-B21', description: 'HPE Ethernet 10/25Gb dual port SFP28 Adapter', quantity: 2 }
];
result = evalNetworkingOcp(items);
assert(result.hasOcpAdapter === false, `Did not detect OCP adapter when absent`);
assert(result.ocpAdapterCount === 0, `Counted 0 OCP adapters`);

console.log(`\n🔹 Test Group 3: OCP Slot Limit Logic`);
items = [
  { sku: 'P54321-B21', description: 'HPE Ethernet 10/25Gb 2-port SFP28 OCP3 Adapter', quantity: 3 }
];
result = evalNetworkingOcp(items);
assert(result.isExceedingOcpSlots === true, `3 OCP adapters exceeds default limit of 2`);

items = [
  { sku: 'P54321-B21', description: 'HPE Ethernet 10/25Gb 2-port SFP28 OCP3 Adapter', quantity: 2 }
];
result = evalNetworkingOcp(items);
assert(result.isExceedingOcpSlots === false, `2 OCP adapters does not exceed limit`);

const mockCatalog = {
  entries: [
    {
      subCategory: 'OCP Adapters',
      maxQty: 1
    }
  ]
};
items = [
  { sku: 'P54321-B21', description: 'HPE Ethernet 10/25Gb 2-port SFP28 OCP3 Adapter', quantity: 2 }
];
result = evalNetworkingOcp(items, mockCatalog);
assert(result.isExceedingOcpSlots === true, `2 OCP adapters exceeds dynamic limit of 1`);
assert(result.maxOcpSlots === 1, `Parsed max OCP slots from catalog`);

console.log(`\n================================================================`);
console.log(`📊 FINAL TEST SUMMARY: ${totalPasses} PASSED | ${totalFails} FAILED`);
console.log(`================================================================\n`);

if (totalFails > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
