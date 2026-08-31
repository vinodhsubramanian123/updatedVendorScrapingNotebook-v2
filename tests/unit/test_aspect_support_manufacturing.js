'use strict';
/**
 * tests/test_aspect_support_manufacturing.js — Tests for Support & Manufacturing Aspect Pre-Check
 */

const { evalSupportManufacturing } = require('../../scripts/lib/aspects/support_manufacturing.js');

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
items = [
  { sku: 'P12345-B21', description: 'HPE ProLiant DL380 Gen11 CTO Server', quantity: 1 },
  { sku: 'P54321-F21', description: 'HPE 32GB Smart Memory FIO Kit', quantity: 2 },
  { sku: 'H1K92A3', description: 'HPE 3 Year Tech Care Critical Service', quantity: 1 }
];
result = evalSupportManufacturing(items);
assert(result.hasSupportService === true, `Detected tech care service among CTO and FIO parts`);

console.log(`\n🔹 Test Group 3: Windows Server Core Multiplier & Licensing Math (INV-28)`);
// Single node with 32 cores (2x 16-core CPU) and 1x 16-core base license -> Under-licensed
items = [
  { sku: 'P49610-B21', description: 'Intel Xeon-S 4410Y 2.0GHz 16-core Processor', quantity: 2 },
  { sku: 'P11058-B21', description: 'Microsoft Windows Server 2022 Standard 16-Core Base License', quantity: 1 }
];
result = evalSupportManufacturing(items, null, 0, 1);
assert(result.hasWindowsServer === true, `Detected Windows Server`);
assert(result.detectedCpuCores === 32, `Detected 32 physical CPU cores`);
assert(result.totalCoveredWindowsCores === 16, `Calculated 16 covered Windows cores`);
assert(result.isWindowsLicenseUnderprovisioned === true, `Flagged underprovisioned Windows Server`);
assert(result.missingCoreLicenses === 16, `Calculated 16 missing Windows core licenses`);

// Single node with 32 cores + 16-core base + 16-core add-on -> Compliant
items = [
  { sku: 'P49610-B21', description: 'Intel Xeon-S 4410Y 2.0GHz 16-core Processor', quantity: 2 },
  { sku: 'P11058-B21', description: 'Microsoft Windows Server 2022 Standard 16-Core Base License', quantity: 1 },
  { sku: 'P11060-B21', description: 'Microsoft Windows Server 2022 Additional 16-Core License', quantity: 1 }
];
result = evalSupportManufacturing(items, null, 0, 1);
assert(result.isWindowsLicenseUnderprovisioned === false, `Windows Server fully licensed with add-on pack`);
assert(result.missingCoreLicenses === 0, `0 missing Windows core licenses`);

console.log(`\n🔹 Test Group 4: VMware Core Licensing Math (16-core/socket minimum)`);
// Single socket 8-core CPU -> 16-core minimum enforced -> 16 required
items = [
  { sku: 'P49610-B21', description: 'Intel Xeon-B 3408U 1.8GHz 8-core Processor', quantity: 1 },
  { sku: 'VMW-01', description: 'VMware vSphere Foundation 8-Core License', quantity: 1 }
];
result = evalSupportManufacturing(items, null, 0, 1);
assert(result.hasVmware === true, `Detected VMware license`);
assert(result.requiredVmwareCores === 16, `Enforced 16-core per socket minimum for VMware`);
assert(result.isVmwareLicenseUnderprovisioned === true, `Flagged VMware under-licensing`);
assert(result.missingVmwareCores === 8, `Calculated 8 missing VMware core licenses`);

// Dual socket 32-core CPUs with 64-core VMware license -> Compliant
items = [
  { sku: 'P49610-B21', description: 'Intel Xeon-G 6430 2.1GHz 32-core Processor', quantity: 2 },
  { sku: 'VMW-02', description: 'VMware Cloud Foundation 64-Core Subscription', quantity: 1 }
];
result = evalSupportManufacturing(items, null, 0, 1);
assert(result.requiredVmwareCores === 64, `Calculated 64 required VMware cores for dual 32-core CPUs`);
assert(result.isVmwareLicenseUnderprovisioned === false, `VMware fully licensed`);

console.log(`\n🔹 Test Group 5: Linux (RHEL / SLES) 1-2 Socket Boundary`);
// Quad-socket system with only 1x 2-socket subscription -> Under-licensed
items = [
  { sku: 'P49610-B21', description: 'Intel Xeon-P 8460Y 2.0GHz 32-core Processor', quantity: 4 },
  { sku: 'RHEL-01', description: 'Red Hat Enterprise Linux Server 1-2 Socket Subscription', quantity: 1 }
];
result = evalSupportManufacturing(items, null, 0, 1);
assert(result.hasLinux === true, `Detected Linux subscription`);
assert(result.requiredLinuxSubscriptions === 2, `Calculated 2 required subscriptions for 4 sockets`);
assert(result.isLinuxSubscriptionUnderprovisioned === true, `Flagged under-provisioned Linux subscriptions`);
assert(result.missingLinuxSubscriptions === 1, `Calculated 1 missing Linux subscription`);

console.log(`\n🔹 Test Group 6: INV-32 Unsolicited Software / Startup Services`);
items = [
  { sku: 'HA114A1', description: 'HPE Installation and Startup Service', quantity: 1, unitPrice: 2500 },
  { sku: 'S1A05A', description: 'HPE Optional SaaS Add-on', quantity: 2, unitPrice: 500 },
  { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 CTO Server', quantity: 1 }
];
result = evalSupportManufacturing(items, null, 0, 1);
assert(result.unsolicitedOptionalItems.length === 2, `Identified 2 unsolicited optional items (INV-32)`);
assert(result.totalUnsolicitedCostUsd === 3500, `Calculated correct totalUnsolicitedCostUsd ($3,500)`);

console.log(`\n🔹 Test Group 7: StoreEver Tape Automation Math`);
items = [
  { sku: 'Q2078A', description: 'HPE LTO-8 Ultrium 30TB RW Data Cartridge', quantity: 50 },
  { sku: 'C7978A', description: 'HPE Universal Cleaning Cartridge', quantity: 1 },
  { sku: 'Q2014A', description: 'HPE LTO-8 Ultrium Barcode Label Pack', quantity: 1 }
];
result = evalSupportManufacturing(items, null, 0, 1);
assert(result.dataCartridgeCount === 50, `Counted 50 data cartridges`);
assert(result.expectedCleaningCartridges === 3, `Calculated 3 expected cleaning cartridges for 50 tapes (1 per 20)`);
assert(result.needsMoreCleaningCartridges === true, `Flagged need for more cleaning cartridges (found 1, expected 3)`);
assert(result.missingCleaningCartridges === 2, `Calculated 2 missing cleaning cartridges`);

console.log(`\n================================================================`);
console.log(`📊 FINAL TEST SUMMARY: ${totalPasses} PASSED | ${totalFails} FAILED`);
console.log(`================================================================\n`);

if (totalFails > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
