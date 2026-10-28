'use strict';
/**
 * tests/test_aspect_compute_thermal.js — Tests for Compute & Thermal Aspect Pre-Check
 */

const { evalComputeThermal } = require('../../scripts/lib/aspects/compute_thermal.js');

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
assert(result.hasMixedCpuModels === true, `Flagged mixed CPU models on single node`);

console.log(`\n🔹 Test Group 5: Elevated Ambient Temperature Gating (>30°C / ambientGate)`);
items = [
  { sku: 'P12345-B21', description: 'Intel Xeon Silver 4410Y 2.0GHz 12-core 150W Processor', quantity: 2 }
];
result = evalComputeThermal(items);
assert(result.needsHighPerfCooling === false, `150W TDP at standard ambient does not mandate high-perf cooling`);

result = evalComputeThermal(items, null, {}, 1, { ambientTemp: 35 });
assert(result.isElevatedAmbient === true, `Ambient 35°C correctly flagged as elevated ambient`);
assert(result.needsHighPerfCooling === true, `Elevated ambient mandates high-performance cooling`);

result = evalComputeThermal(items, null, {}, 1, { ambientGate: true });
assert(result.isElevatedAmbient === true, `ambientGate option flagged as elevated ambient`);
assert(result.needsHighPerfCooling === true, `ambientGate mandates high-performance cooling`);

console.log(`\n🔹 Test Group 6: Fan Packaging Modality (INV-206 Modular vs Bundled)`);
// Test 6A: Bundled Fan Kit on DL380 (P48820-B21): 1 kit per server allowed, 2 kits exceeds max
items = [
  { sku: 'P12345-B21', description: 'Intel Xeon Gold 6430 Processor', quantity: 2 },
  { sku: 'P48820-B21', description: 'HPE ProLiant DL380 Gen11 High Performance Fan Kit', quantity: 1 }
];
result = evalComputeThermal(items, null, {}, 1);
assert(result.isModularFan === false, `DL380 fan kit recognized as bundled`);
assert(result.maxFanKitsAllowed === 1, `DL380 bundled fan kit max allowed is 1`);
assert(result.fanKitExceedsMax === false, `1 bundled fan kit does not exceed max`);

items = [
  { sku: 'P12345-B21', description: 'Intel Xeon Gold 6430 Processor', quantity: 2 },
  { sku: 'P48820-B21', description: 'HPE ProLiant DL380 Gen11 High Performance Fan Kit', quantity: 2 }
];
result = evalComputeThermal(items, null, {}, 1);
assert(result.fanKitExceedsMax === true, `2 bundled fan kits correctly flagged as exceeding max 1`);

// Test 6B: Modular Fan Kit on DL385 Gen11 (P58465-B21): 6 kits per 2P server allowed, 7 kits exceeds max
items = [
  { sku: 'P53712-B21', description: 'AMD EPYC 9334 32-core Processor for HPE', quantity: 2 },
  { sku: 'P58465-B21', description: 'HPE ProLiant DL3X5 Gen11 2U Performance Fan Kit', quantity: 6 }
];
result = evalComputeThermal(items, null, {}, 1);
assert(result.isModularFan === true, `DL3X5 fan kit recognized as modular`);
assert(result.maxFanKitsAllowed === 6, `DL385 2P modular fan kit max allowed is 6`);
assert(result.fanKitExceedsMax === false, `6 modular fan kits for 2P does not exceed max`);

// Test 6C: Modular Fan Kit on DL385 Gen11 with 10 servers (60 fan kits total = 6/server)
items = [
  { sku: 'P53712-B21', description: 'AMD EPYC 9334 32-core Processor for HPE', quantity: 20 },
  { sku: 'P58465-B21', description: 'HPE ProLiant DL3X5 Gen11 2U Performance Fan Kit', quantity: 60 }
];
result = evalComputeThermal(items, null, {}, 10);
assert(result.fanKitsPerServer === 6, `Correctly computed 6 modular fan kits per server`);
assert(result.fanKitExceedsMax === false, `60 modular fan kits across 10 servers does not exceed max`);

// Test 6D: Multi-node 1P Modular Fan Kit (10 1P servers = 10 CPUs, 40 fan kits = 4/server)
items = [
  { sku: 'P53712-B21', description: 'AMD EPYC 9334 32-core Processor for HPE', quantity: 10 },
  { sku: 'P58465-B21', description: 'HPE ProLiant DL3X5 Gen11 2U Performance Fan Kit', quantity: 40 }
];
result = evalComputeThermal(items, null, {}, 10);
assert(result.cpusPerServer === 1, `Correctly computed 1 CPU per server on 10-node 1P cluster`);
assert(result.maxFanKitsAllowed === 4, `1P modular fan max allowed is 4 per server`);
assert(result.fanKitExceedsMax === false, `40 modular fan kits across 10 1P servers passes`);

console.log(`\n🔹 Test Group 7: Heatsink Right-Sizing (INV-208), S1A05A vs R7A11AAE (INV-207) & 0D1 Deduplication (INV-209)`);
const { analyzeDealValueEngineering } = require('../../scripts/lib/boq/deal_optimizer.js');
const { evalPcieRiserSlots } = require('../../scripts/lib/aspects/pcie_riser.js');
const { evalSupportManufacturing } = require('../../scripts/lib/aspects/support_manufacturing.js');

// Test 7A: Heatsink Right-Sizing (INV-208) — 1x P74794-B21 per server (9 total) on 225W Xeon 6530P flags 45d->4d lead-time optimization to 2x P74792-B21 per server (18 total)
items = [
  { sku: 'P74571-B21', description: 'Intel Xeon 6530P 2.3GHz 32-core 225W Processor for HPE', quantity: 18 },
  { sku: 'P74571-B21  0D1', description: 'Factory Integrated', quantity: 18 },
  { sku: 'P74794-B21', description: 'HPE ProLiant Compute DL380 Gen12 2U Max Performance Heat Sink Kit', quantity: 9 }
];
result = evalComputeThermal(items, null, {}, 9);
assert(result.cpuCount === 18, `INV-209: 0D1 row skipped so cpuCount is 18 (not 36)`);
assert(result.hasOverprovisionedMaxHeatsink === true, `INV-208: P74794-B21 on 225W CPU flagged as over-provisioned`);
assert(result.recommendedHeatsinkSku === 'P74792-B21', `INV-208: Recommends P74792-B21 High Performance Heatsink`);

const veReport = analyzeDealValueEngineering(items, { aspects: { compute: result } });
const hsOpt = veReport.opportunities.find(o => o.id === 'VE-OPT-HEATSINK-TIER-RIGHT-SIZING');
assert(Boolean(hsOpt) && hsOpt.leadTimeSavedDays === 41 && hsOpt.recommendedAlternative.includes('18 kit(s)'), `INV-208: Deal optimizer recommends 18x P74792-B21 (2/server) replacing 9x P74794-B21 (1/server) with 41-day lead-time reduction`);

// Test 7B: PCIe Riser 0D1 Deduplication (INV-209) & S1A05A vs R7A11AAE Separation (INV-207)
const pcieItems = [
  { sku: 'P08443-B21', description: 'Intel E810-XXVDA2 Ethernet 10/25Gb 2-port SFP28 Adapter for HPE', quantity: 9 },
  { sku: 'P08443-B21  0D1', description: 'Factory Integrated', quantity: 9 },
  { sku: 'R2E09A', description: 'HPE SN1610Q 32Gb 2-port Fibre Channel Host Bus Adapter', quantity: 9 },
  { sku: 'R2E09A      0D1', description: 'Factory Integrated', quantity: 9 },
  { sku: 'R7A11AAE', description: 'HPE Compute Ops Management Standard 3-year Upfront ProLiant SaaS', quantity: 9 },
  { sku: 'S1A05A', description: 'HPE Compute Cloud Management Server FIO Enablement', quantity: 9, unitPrice: 1 }
];
const pcieRes = evalPcieRiserSlots(pcieItems, null, {}, 9);
assert(pcieRes.requiredPcieCards === 18, `INV-209: PCIe cards not double-counted by 0D1 tracking rows (18 total = 2/server)`);
assert(pcieRes.isExceedingTotalSlots === false, `INV-209: 2 PCIe cards per server fit cleanly in 3 native primary slots`);

const suppRes = evalSupportManufacturing(pcieItems, null, {}, 9);
assert(suppRes.hasManagementLicense === true, `INV-207: R7A11AAE recognized as valid management license`);
assert(suppRes.unsolicitedOptionalItems.length === 1 && suppRes.unsolicitedOptionalItems[0].sku === 'S1A05A', `INV-207: S1A05A flagged as unsolicited optional FIO pre-claim token while R7A11AAE is kept`);

console.log(`\n🔹 Test Group 8: Mandatory Heatsink Detection & Direct Liquid Cooling (DLC) Gating`);
items = [
  { sku: 'P12345-B21', description: 'Intel Xeon Gold 6330 2.0GHz 28-core 205W Processor', quantity: 2 }
];
result = evalComputeThermal(items);
assert(result.needsHeatsink === true, `CPUs present without heatsink flags needsHeatsink`);
assert(result.hasHeatsinks === false, `hasHeatsinks is false when no heatsink item present`);

items = [
  { sku: 'P12345-B21', description: 'Intel Xeon Gold 6330 2.0GHz 28-core 205W Processor', quantity: 2 },
  { sku: 'P48809-B21', description: 'HPE ProLiant DL380 2U High Performance Heat Sink', quantity: 2 }
];
result = evalComputeThermal(items);
assert(result.needsHeatsink === false, `Heatsinks provided clears needsHeatsink`);
assert(result.hasHeatsinks === true, `P48809-B21 recognized as valid heatsink`);

items = [
  { sku: 'P99999-B21', description: 'AMD EPYC 9654 360W Processor', quantity: 2 }
];
result = evalComputeThermal(items);
assert(result.needsDirectLiquidCooling === true, `360W TDP mandates Direct Liquid Cooling`);
assert(result.hasDirectLiquidCooling === false, `Missing DLC cooling kit flagged`);

items = [
  { sku: 'P99999-B21', description: 'AMD EPYC 9654 360W Processor', quantity: 2 },
  { sku: 'P56000-B21', description: 'HPE Direct Liquid Cooling Module Kit', quantity: 1 }
];
result = evalComputeThermal(items);
assert(result.needsDirectLiquidCooling === false, `DLC module clears needsDirectLiquidCooling`);
assert(result.hasDirectLiquidCooling === true, `DLC module recognized as present`);
assert(result.needsHeatsink === false, 'DLC module satisfies cooling and clears needsHeatsink');

// Test Air Baffle rejection:
items = [
  { sku: 'P12345-B21', description: 'Intel Xeon Gold 6330 Processor', quantity: 1 },
  { sku: 'P99999-B21', description: 'HPE DL380 Gen11 Standard Air Baffle for Heatsink', quantity: 1 }
];
result = evalComputeThermal(items);
assert(result.hasHeatsinks === false, 'Air Baffle not classified as thermal heatsink');
assert(result.needsHeatsink === true, 'Air baffle with 0 heatsinks flags needsHeatsink');

items = [
  { sku: 'P53712-B21', description: 'AMD EPYC 9334 32-core Processor for HPE', quantity: 2 },
  { sku: 'P58465-B21', description: 'HPE ProLiant DL3X5 Gen11 2U Performance Fan Kit', quantity: 3 }
];
result = evalComputeThermal(items, null, {}, 1);
assert(result.fanKitUnderPopulated === true, `3 modular fan kits on 2P server flagged as underpopulated (needs 6)`);

console.log(`\n================================================================`);
console.log(`📊 FINAL TEST SUMMARY: ${totalPasses} PASSED | ${totalFails} FAILED`);
console.log(`================================================================\n`);

if (totalFails > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
