'use strict';
/**
 * tests/unit/test_aspect_challenger_m1_it2.js
 *
 * EMPIRICAL ADVERSARIAL CHALLENGER TEST SUITE — Milestone 1 Iteration 2
 *
 * Dedicated adversarial stress harness verifying remediations across:
 * 1. Compute Thermal (compute_thermal.js):
 *    - DLC cold plate modules with high-TDP CPUs (>350W).
 *    - Air baffles, cable guides, blanks, brackets, ducting with 'heatsink' in description.
 *    - Standard air heatsinks positive detection.
 * 2. Memory Channel (memory_channel.js):
 *    - JEDEC PC4-3200 and PC5-4800 DIMMs mixed together.
 *    - NVMe flash storage drives with 'memory' in description excluded from RAM.
 *    - Standard RDIMMs correctly counted and validated.
 * 3. PCIe Riser (pcie_riser.js):
 *    - P56073-B21 / P56074-B21 riser cable kits alone yield 0 active slots and keep needsPrimaryRiser = true.
 *    - Actual physical primary, secondary, and tertiary riser cards provide exact slots.
 */

const { evalComputeThermal } = require('../../scripts/lib/aspects/compute_thermal.js');
const { evalMemoryChannel } = require('../../scripts/lib/aspects/memory_channel.js');
const { evalPcieRiserSlots } = require('../../scripts/lib/aspects/pcie_riser.js');
const { normalizeAspectResult, evaluateDomainAspects } = require('../../scripts/lib/aspects/aspect_registry.js');

let totalPasses = 0;
let totalFails = 0;
const failureDetails = [];

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    totalPasses++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    totalFails++;
    failureDetails.push(message);
  }
}

console.log('================================================================');
console.log('🔥 EMPIRICAL CHALLENGER TEST HARNESS — M1_IT2 VERIFICATION');
console.log('================================================================\n');

// ============================================================================
// DOMAIN 1: COMPUTE THERMAL ADVERSARIAL STRESS
// ============================================================================
console.log('🔹 DOMAIN 1: Compute Thermal Aspect Stress Testing');

// 1.1 DLC Cold Plate Module with High-TDP CPUs (> 350W)
console.log('\n  --- 1.1 DLC Cold Plate Modules with High-TDP CPUs ---');

// Scenario 1.1a: Single 360W AMD EPYC 9754 with HPE Direct Liquid Cooling Module Kit
let items = [
  { sku: 'P44556-B21', description: 'AMD EPYC 9754 2.25GHz 128-core 360W Processor', quantity: 1 },
  { sku: 'P56000-B21', description: 'HPE Direct Liquid Cooling Module Kit', quantity: 1 }
];
let res = evalComputeThermal(items);
assert(res.cpuCount === 1, 'Extracted 1 CPU');
assert(res.maxCpuTdpWatts === 360, 'Extracted 360W max TDP (>350W boundary)');
assert(res.hasDirectLiquidCooling === true, 'DLC module identified as present');
assert(res.needsDirectLiquidCooling === false, 'needsDirectLiquidCooling is FALSE when DLC module is installed');
assert(res.needsHeatsink === false, 'needsHeatsink is FALSE when DLC module is installed on high-TDP CPU');
assert(res.needsHighPerfCooling === true, 'High TDP CPU (>185W) still mandates High-Performance Fan Kit');

// Scenario 1.1a-full: 360W CPU + DLC module + High-Performance Fan Kit yields 100% PASS
items = [
  { sku: 'P44556-B21', description: 'AMD EPYC 9754 2.25GHz 128-core 360W Processor', quantity: 1 },
  { sku: 'P56000-B21', description: 'HPE Direct Liquid Cooling Module Kit', quantity: 1 },
  { sku: 'P48820-B21', description: 'HPE ProLiant DL380 Gen11 High Performance Fan Kit', quantity: 1 }
];
res = evalComputeThermal(items);
assert(res.needsHeatsink === false, 'DLC module satisfies cooling and clears needsHeatsink');
assert(res.needsDirectLiquidCooling === false, 'needsDirectLiquidCooling is false');
assert(res.needsHighPerfCooling === false, 'High-perf fan kit satisfies needsHighPerfCooling');
let norm = normalizeAspectResult('COMPUTE_THERMAL', res);
assert(norm.status === 'PASS', 'Normalized COMPUTE_THERMAL status is PASS with DLC module + High Perf Fan Kit');
assert(!norm.errors.some(e => e.includes('heatsink')), 'No heatsink error emitted');
assert(!norm.errors.some(e => e.includes('Direct Liquid Cooling')), 'No DLC deficit error emitted');

// Scenario 1.1b: Dual 385W AMD EPYC 9684X with P74796-B21 DLC Cold Plate Module
items = [
  { sku: 'P98765-B21', description: 'AMD EPYC 9684X 2.55GHz 96-core 385W Processor', quantity: 2 },
  { sku: 'P74796-B21', description: 'HPE ProLiant Compute Direct Liquid Cooling Cold Plate Kit', quantity: 1 }
];
res = evalComputeThermal(items);
assert(res.cpuCount === 2, 'Extracted 2 CPUs');
assert(res.maxCpuTdpWatts === 385, 'Extracted 385W max TDP');
assert(res.hasDirectLiquidCooling === true, 'P74796-B21 registered DLC cold plate kit');
assert(res.needsHeatsink === false, 'Dual 385W CPUs with DLC cold plate clears needsHeatsink');
assert(res.needsDirectLiquidCooling === false, 'Dual 385W CPUs with DLC clears needsDirectLiquidCooling');

// Scenario 1.1c: 400W Intel Xeon with 'cold plate' in description
items = [
  { sku: 'P99990-B21', description: 'Intel Xeon Platinum 6980P 500W Processor', quantity: 1 },
  { sku: 'P99991-B21', description: 'HPE Server Direct Liquid Cooling Cold Plate Assembly', quantity: 1 }
];
res = evalComputeThermal(items);
assert(res.hasDirectLiquidCooling === true, 'Description with "cold plate" identified as DLC');
assert(res.needsHeatsink === false, 'needsHeatsink is FALSE with DLC cold plate assembly');
assert(res.needsDirectLiquidCooling === false, 'needsDirectLiquidCooling is FALSE with DLC cold plate assembly');

// Scenario 1.1d: Negative Test — 360W CPU with NO cooling whatsoever
items = [
  { sku: 'P44556-B21', description: 'AMD EPYC 9754 2.25GHz 128-core 360W Processor', quantity: 1 }
];
res = evalComputeThermal(items);
assert(res.needsHeatsink === true, 'High-TDP CPU with 0 cooling flags needsHeatsink: true');
assert(res.needsDirectLiquidCooling === true, 'High-TDP CPU with 0 cooling flags needsDirectLiquidCooling: true');
norm = normalizeAspectResult('COMPUTE_THERMAL', res);
assert(norm.status === 'FAIL', 'Status is FAIL when high-TDP CPU has no cooling');
assert(norm.errors.some(e => e.includes('Missing required processor heatsink')), 'Emits missing heatsink error');
assert(norm.errors.some(e => e.includes('Direct Liquid Cooling required')), 'Emits DLC required error');

// Scenario 1.1e: Negative Test — 380W CPU with standard air heatsink but NO DLC
items = [
  { sku: 'P98765-B21', description: 'AMD EPYC 9684X 2.55GHz 96-core 385W Processor', quantity: 1 },
  { sku: 'P48818-B21', description: 'HPE ProLiant DL380 Gen11 High Performance Heat Sink Kit', quantity: 1 }
];
res = evalComputeThermal(items);
assert(res.hasHeatsinks === true, 'Standard air heatsink detected');
assert(res.needsHeatsink === false, 'Air heatsink satisfies basic needsHeatsink');
assert(res.needsDirectLiquidCooling === true, '>350W CPU mandates DLC even if air heatsink is present');
norm = normalizeAspectResult('COMPUTE_THERMAL', res);
assert(norm.status === 'FAIL', 'Status is FAIL because DLC is missing on >350W CPU');
assert(norm.errors.some(e => e.includes('Direct Liquid Cooling required for high-TDP processor')), 'Flags DLC requirement');

// 1.2 Air Baffles, Cable Guides, Blanks, Brackets, and Ducts Masquerading as Heatsinks
console.log('\n  --- 1.2 Air Baffles and Accessories with "heatsink" Rejected ---');

const deceptiveAccessories = [
  { name: 'Air Baffle', desc: 'HPE DL380 Gen11 Standard Air Baffle for Heatsink' },
  { name: 'Cable Guide', desc: 'HPE DL380 Gen11 Heatsink Cable Guide Kit' },
  { name: 'Heatsink Blank', desc: 'HPE ProLiant Heatsink Blank Kit' },
  { name: 'Retaining Bracket', desc: 'HPE ProLiant Heatsink Retaining Bracket' },
  { name: 'Air Duct', desc: 'HPE Air Duct Heatsink Kit' },
  { name: 'Sensor Cable', desc: 'HPE Heatsink Thermal Sensor Cable' },
  { name: 'Cable Kit', desc: 'HPE Heatsink Cable Kit' },
  { name: 'Cbl Kit', desc: 'HPE Heatsink Thermal Cbl Kit' }
];

for (const acc of deceptiveAccessories) {
  const testBOM = [
    { sku: 'P12345-B21', description: 'Intel Xeon Gold 6330 2.0GHz 28-core 205W Processor', quantity: 1 },
    { sku: 'P99999-B21', description: acc.desc, quantity: 1 }
  ];
  const testRes = evalComputeThermal(testBOM);
  assert(testRes.hasHeatsinks === false, `${acc.name} ("${acc.desc}") correctly rejected as thermal heatsink`);
  assert(testRes.needsHeatsink === true, `CPU with only ${acc.name} flags needsHeatsink === true`);
}

// All deceptive accessories combined without any real heatsink
const allDeceptiveBOM = [
  { sku: 'P12345-B21', description: 'Intel Xeon Gold 6330 2.0GHz 28-core 205W Processor', quantity: 1 },
  ...deceptiveAccessories.map((a, idx) => ({ sku: `P8888${idx}-B21`, description: a.desc, quantity: 1 }))
];
const allDeceptiveRes = evalComputeThermal(allDeceptiveBOM);
assert(allDeceptiveRes.hasHeatsinks === false, 'All combined deceptive non-heatsink accessories yield hasHeatsinks: false');
assert(allDeceptiveRes.needsHeatsink === true, 'All combined deceptive accessories yield needsHeatsink: true');

// 1.3 Standard Air Heatsinks (Positive Recognition)
console.log('\n  --- 1.3 Standard Air Heatsinks Positive Recognition ---');

const validHeatsinks = [
  { sku: 'P49145-B21', desc: 'HPE ProLiant DL380 Gen11 Standard Heat Sink Kit' },
  { sku: 'P48818-B21', desc: 'HPE ProLiant DL380 Gen11 High Performance Heat Sink Kit' },
  { sku: 'P74792-B21', desc: 'HPE ProLiant Compute DL380 Gen12 2U High Performance Heat Sink Kit' },
  { sku: 'P74794-B21', desc: 'HPE ProLiant Compute DL380 Gen12 2U Max Performance Heat Sink Kit' },
  { sku: 'P58458-B21', desc: 'HPE ProLiant DL385 Gen11 1U Standard Heat Sink Kit' },
  { sku: 'P48809-B21', desc: 'HPE ProLiant DL380 2U High Performance Heat Sink' },
  { sku: 'P99988-B21', desc: 'HPE ProLiant Server Standard Heatsink Kit' },
  { sku: 'P99989-B21', desc: 'HPE ProLiant Server Standard Heat Sink Kit' }
];

for (const hs of validHeatsinks) {
  const testBOM = [
    { sku: 'P12345-B21', description: 'Intel Xeon Gold 6330 2.0GHz 28-core 205W Processor', quantity: 1 },
    { sku: hs.sku, description: hs.desc, quantity: 1 }
  ];
  const testRes = evalComputeThermal(testBOM);
  assert(testRes.hasHeatsinks === true, `Valid heatsink ${hs.sku} ("${hs.desc}") recognized as present`);
  assert(testRes.needsHeatsink === false, `Valid heatsink ${hs.sku} clears needsHeatsink`);
}


// ============================================================================
// DOMAIN 2: MEMORY CHANNEL ADVERSARIAL STRESS
// ============================================================================
console.log('\n🔹 DOMAIN 2: Memory Channel Aspect Stress Testing');

// 2.1 JEDEC PC4 / PC5 Token Mixing Tests
console.log('\n  --- 2.1 JEDEC PC4 / PC5 Generation Mixing ---');

// Scenario 2.1a: Standard JEDEC PC4-3200 and PC5-4800 DIMMs mixed
items = [
  { sku: 'P54321-B21', description: 'HPE 32GB 2Rx4 PC4-3200AA-R Smart Memory Kit', quantity: 4 },
  { sku: 'P54322-B21', description: 'HPE 32GB 2Rx4 PC5-4800B-R Smart Memory Kit', quantity: 4 }
];
res = evalMemoryChannel(items, 2);
assert(res.hasDdr4Memory === true, 'PC4-3200 recognized as DDR4');
assert(res.hasDdr5Memory === true, 'PC5-4800 recognized as DDR5');
assert(res.hasMixedDdrGeneration === true, 'JEDEC PC4 and PC5 mixed triggers hasMixedDdrGeneration: true');
norm = normalizeAspectResult('MEMORY_CHANNEL', res);
assert(norm.status === 'FAIL', 'Normalized status is FAIL when mixing PC4 and PC5');
assert(
  norm.errors.some(e => e.includes('DDR4 and DDR5 memory generations cannot be mixed')),
  'Emits DDR4 and DDR5 mixed generation error'
);

// Scenario 2.1b: PC4-2933Y and PC5-5600B mixed
items = [
  { sku: 'P00441-B21', description: 'HPE 32GB (1x32GB) Dual Rank x4 PC4-2933Y-R Registered Smart Kit', quantity: 4 },
  { sku: 'P69728-B21', description: 'HPE 64GB (1x64GB) Dual Rank x4 PC5-5600B-R Smart Kit', quantity: 4 }
];
res = evalMemoryChannel(items, 2);
assert(res.hasMixedDdrGeneration === true, 'PC4-2933Y-R and PC5-5600B-R triggers hasMixedDdrGeneration: true');

// Scenario 2.1c: Underscore token PC4_3200 and PC5_4800
items = [
  { sku: 'P11111-B21', description: '32GB 2Rx4 PC4_3200AA-R Memory', quantity: 4 },
  { sku: 'P22222-B21', description: '32GB 2Rx4 PC5_4800B-R Memory', quantity: 4 }
];
res = evalMemoryChannel(items, 2);
assert(res.hasMixedDdrGeneration === true, 'PC4_3200 and PC5_4800 with underscores triggers hasMixedDdrGeneration: true');

// Scenario 2.1d: Pure PC4 DIMMs (Must NOT trigger hasMixedDdrGeneration)
items = [
  { sku: 'P54321-B21', description: 'HPE 32GB 2Rx4 PC4-3200AA-R Smart Memory Kit', quantity: 8 },
  { sku: 'P00441-B21', description: 'HPE 32GB 2Rx4 PC4-2933Y-R Smart Memory Kit', quantity: 8 }
];
res = evalMemoryChannel(items, 2);
assert(res.hasDdr4Memory === true, 'Pure PC4 recognized as DDR4');
assert(res.hasDdr5Memory === false, 'Pure PC4 does not set hasDdr5Memory');
assert(res.hasMixedDdrGeneration === false, 'Pure PC4 does NOT trigger hasMixedDdrGeneration');

// Scenario 2.1e: Pure PC5 DIMMs (Must NOT trigger hasMixedDdrGeneration)
items = [
  { sku: 'P54322-B21', description: 'HPE 32GB 2Rx4 PC5-4800B-R Smart Memory Kit', quantity: 8 },
  { sku: 'P69728-B21', description: 'HPE 64GB 2Rx4 PC5-5600B-R Smart Memory Kit', quantity: 8 }
];
res = evalMemoryChannel(items, 2);
assert(res.hasDdr4Memory === false, 'Pure PC5 does not set hasDdr4Memory');
assert(res.hasDdr5Memory === true, 'Pure PC5 recognized as DDR5');
assert(res.hasMixedDdrGeneration === false, 'Pure PC5 does NOT trigger hasMixedDdrGeneration');

// 2.2 NVMe Flash Storage Drives with 'memory' in description excluded from RAM
console.log('\n  --- 2.2 NVMe Flash Storage Drives Excluded from RAM ---');

const flashStorageItems = [
  { name: 'NVMe Flash Storage Drive', desc: 'HPE 800GB NVMe High Performance Mixed Use Flash Memory Storage Drive' },
  { name: 'Solid State Storage Memory', desc: 'HPE 1.92TB NVMe Read Intensive Solid State Storage Memory' },
  { name: 'SAS Flash Memory Drive', desc: 'HPE 3.84TB SAS 12G Read Intensive Flash Memory Drive' },
  { name: 'SATA SSD', desc: 'HPE 960GB SATA 6G Mixed Use SSD' },
  { name: 'NVMe Boot Device', desc: 'HPE 480GB NVMe M.2 Flash Memory Boot Device' },
  { name: 'Storage Battery', desc: 'HPE 96W Smart Storage Battery with 145mm Cable Kit' },
  { name: 'DIMM Blank', desc: 'HPE DDR5 DIMM Blank Kit' },
  { name: 'Memory Blank', desc: 'HPE ProLiant Memory Blank' }
];

for (const storage of flashStorageItems) {
  const testBOM = [
    { sku: 'P12345-B21', description: 'Intel Xeon Gold 6330 2.0GHz 28-core 205W Processor', quantity: 1 },
    { sku: 'P99999-B21', description: storage.desc, quantity: 4 }
  ];
  const testRes = evalMemoryChannel(testBOM);
  assert(testRes.memoryCount === 0, `${storage.name} ("${storage.desc}") contributes 0 to memoryCount`);
  assert(testRes.totalMemoryGb === 0, `${storage.name} contributes 0 to totalMemoryGb`);
  assert(testRes.needsMemory === true, `CPU with only ${storage.name} flags needsMemory: true`);
}

// All flash storage drives combined with 0 actual RAM
const allStorageBOM = [
  { sku: 'P12345-B21', description: 'Intel Xeon Gold 6330 2.0GHz 28-core 205W Processor', quantity: 2 },
  ...flashStorageItems.map((s, idx) => ({ sku: `P7777${idx}-B21`, description: s.desc, quantity: 2 }))
];
const allStorageRes = evalMemoryChannel(allStorageBOM, 2);
assert(allStorageRes.memoryCount === 0, 'Combined storage and accessory items yield memoryCount: 0');
assert(allStorageRes.needsMemory === true, 'Combined storage items on 2 CPUs flag needsMemory: true');
norm = normalizeAspectResult('MEMORY_CHANNEL', allStorageRes);
assert(norm.status === 'FAIL', 'Normalized status is FAIL when 0 RAM is installed');
assert(
  norm.errors.some(e => e.includes('Missing required system memory (0 RAM modules installed for server CPU)')),
  'Emits missing required system memory error'
);

// 2.3 Standard RDIMMs Counted Correctly
console.log('\n  --- 2.3 Standard RDIMMs Correctly Counted and Validated ---');

// Scenario 2.3a: 8x 32GB DDR5 RDIMMs on 1 CPU (8-channel balanced)
items = [
  { sku: 'P12345-B21', description: 'Intel Xeon Gold 6330 2.0GHz 28-core 205W Processor', quantity: 1 },
  { sku: 'P43328-B21', description: 'HPE 32GB (1x32GB) Single Rank x4 DDR5-4800 Registered Smart Memory Kit', quantity: 8 }
];
res = evalMemoryChannel(items, 1);
assert(res.cpuCount === 1, 'Extracted 1 CPU');
assert(res.memoryCount === 8, 'Extracted 8 memory modules');
assert(res.totalMemoryGb === 256, 'Calculated 256GB total memory (8 * 32GB)');
assert(res.hasRdimm === true, 'Identified as RDIMM');
assert(res.hasLrdimm === false, 'hasLrdimm is false');
assert(res.hasMrdimm === false, 'hasMrdimm is false');
assert(res.hasMixedMemoryTypes === false, 'No mixed memory types');
assert(res.needsMemory === false, 'needsMemory is false');
assert(res.isSupportedPopulation === true, '8 DIMMs on 1 CPU is supported population');
assert(res.isBalancedChannel === true, '8 DIMMs on 1 CPU is balanced 8-channel interleaving');
assert(res.isInvalidChannelConfiguration === false, 'isInvalidChannelConfiguration is false');
norm = normalizeAspectResult('MEMORY_CHANNEL', res);
assert(norm.status === 'PASS', 'Normalized status is PASS for balanced 8x RDIMM configuration');

// Scenario 2.3b: Mixed RDIMM and LRDIMM (Conflict test)
items = [
  { sku: 'P43328-B21', description: 'HPE 32GB (1x32GB) Single Rank x4 DDR5-4800 Registered Smart Memory Kit', quantity: 8 },
  { sku: 'P43334-B21', description: 'HPE 128GB (1x128GB) Quad Rank x4 DDR5-4800 Load-Reduced Smart Memory Kit', quantity: 8 }
];
res = evalMemoryChannel(items, 2);
assert(res.hasRdimm === true, 'Detected RDIMM');
assert(res.hasLrdimm === true, 'Detected LRDIMM');
assert(res.hasMixedMemoryTypes === true, 'Flagged hasMixedMemoryTypes: true for RDIMM + LRDIMM mix');
norm = normalizeAspectResult('MEMORY_CHANNEL', res);
assert(norm.status === 'FAIL', 'Status is FAIL for RDIMM + LRDIMM mix');
assert(
  norm.errors.some(e => e.includes('RDIMM, LRDIMM, and MRDIMM memory types cannot be mixed')),
  'Emits memory type mixing error'
);

// Scenario 2.3c: Mixed RDIMM and MRDIMM (Conflict test)
items = [
  { sku: 'P43328-B21', description: 'HPE 32GB Registered Smart Memory Kit', quantity: 8 },
  { sku: 'P43335-B21', description: 'HPE 64GB MRDIMM Multiplexed Rank Memory Kit', quantity: 8 }
];
res = evalMemoryChannel(items, 2);
assert(res.hasRdimm === true, 'Detected RDIMM');
assert(res.hasMrdimm === true, 'Detected MRDIMM');
assert(res.hasMixedMemoryTypes === true, 'Flagged hasMixedMemoryTypes: true for RDIMM + MRDIMM mix');


// ============================================================================
// DOMAIN 3: PCIE RISER ADVERSARIAL STRESS
// ============================================================================
console.log('\n🔹 DOMAIN 3: PCIe Slot Capacity & Riser Aspect Stress Testing');

// 3.1 P56073-B21 Riser Cable Kit Alone (Disambiguation)
console.log('\n  --- 3.1 P56073-B21 Riser Cable Kit Disambiguation ---');

// Scenario 3.1a: 1 PCIe Network Adapter + P56073-B21 Primary Riser Cable Kit (0 Riser Cards)
items = [
  { sku: 'P08443-B21', description: 'Intel E810-XXVDA2 Ethernet 10/25Gb 2-port SFP28 Adapter for HPE', quantity: 1 },
  { sku: 'P56073-B21', description: 'HPE ProLiant DL380 Gen11 Primary Riser Cable Kit', quantity: 1 }
];
res = evalPcieRiserSlots(items);
assert(res.primaryRiserCount === 0, 'P56073-B21 Cable Kit yields primaryRiserCount === 0 (not counted as physical card)');
assert(res.activeSlotsAvailable === 0, 'Active slots available is 0 when only cable kit is present');
assert(res.hasPrimaryCableKit === true, 'hasPrimaryCableKit is TRUE (cable is present)');
assert(res.needsPrimaryRiser === true, 'needsPrimaryRiser is TRUE when PCIe cards are present with only cable kit');
assert(res.isExceedingActiveSlots === true, '1 PCIe card exceeds 0 active slots');
norm = normalizeAspectResult('PCIE_RISER', res);
assert(norm.status === 'FAIL', 'Status is FAIL when only cable kit is provided without physical riser card');
assert(norm.errors.some(e => e.includes('Primary Riser Kit required for PCIe expansion')), 'Emits Primary Riser Kit required error');
assert(norm.errors.some(e => e.includes('PCIe card count exceeds electrically cabled active slots')), 'Emits exceeds active slots error');

// Scenario 3.1b: Secondary Riser Cable Kit P56074-B21 alone
items = [
  { sku: 'P56074-B21', description: 'HPE ProLiant DL380 Gen11 Secondary Riser Cable Kit', quantity: 1 }
];
res = evalPcieRiserSlots(items);
assert(res.secondaryRiserCount === 0, 'P56074-B21 Cable Kit yields secondaryRiserCount === 0');
assert(res.hasSecondaryCableKit === true, 'hasSecondaryCableKit is TRUE');

// Scenario 3.1c: Non-card Riser Accessories (Blanks, Brackets, Baffles)
const nonCardRiserItems = [
  { sku: 'P99991-B21', desc: 'HPE ProLiant DL380 Gen11 Primary Riser Blank Kit' },
  { sku: 'P99992-B21', desc: 'HPE ProLiant DL380 Gen11 Secondary Riser Retaining Bracket' },
  { sku: 'P99993-B21', desc: 'HPE ProLiant DL380 Gen11 Tertiary Riser Air Baffle' }
];
for (const ri of nonCardRiserItems) {
  const testBOM = [
    { sku: 'P08443-B21', description: 'Intel E810-XXVDA2 Adapter', quantity: 1 },
    { sku: ri.sku, description: ri.desc, quantity: 1 }
  ];
  const testRes = evalPcieRiserSlots(testBOM);
  assert(testRes.primaryRiserCount === 0, `${ri.desc} does not count as primary riser`);
  assert(testRes.secondaryRiserCount === 0, `${ri.desc} does not count as secondary riser`);
  assert(testRes.tertiaryRiserCount === 0, `${ri.desc} does not count as tertiary riser`);
  assert(testRes.activeSlotsAvailable === 0, `${ri.desc} provides 0 active slots`);
  assert(testRes.needsPrimaryRiser === true, `Needs primary riser remains TRUE with ${ri.desc}`);
}

// 3.2 Actual Primary, Secondary, and Tertiary Riser Cards (Proper Slot Calculation)
console.log('\n  --- 3.2 Actual Physical Riser Cards Provide Proper Slots ---');

// Scenario 3.2a: Actual Primary Riser Card WITHOUT cable kit
items = [
  { sku: 'P08443-B21', description: 'Intel E810-XXVDA2 Ethernet 10/25Gb 2-port SFP28 Adapter for HPE', quantity: 1 },
  { sku: 'P48803-B21', description: 'HPE ProLiant DL380 Gen11 x16/x8/x8 Primary Riser Kit', quantity: 1 }
];
res = evalPcieRiserSlots(items);
assert(res.primaryRiserCount === 1, 'P48803-B21 counted as physical primary riser');
assert(res.needsPrimaryRiser === false, 'needsPrimaryRiser is FALSE when physical primary riser is installed');
assert(res.activeSlotsAvailable === 2, 'Primary riser without cable kit activates 2 slots (Slot 1 inactive)');
assert(res.isExceedingActiveSlots === false, '1 PCIe card fits in 2 active slots');
assert(res.needsPrimaryCableKit === false, '1 card does not demand cable kit');

// Scenario 3.2b: Actual Primary Riser Card WITH cable kit (Activates Slot 1 -> 3 active slots)
items = [
  { sku: 'P08443-B21', description: 'Intel E810-XXVDA2 Ethernet 10/25Gb 2-port SFP28 Adapter for HPE', quantity: 3 },
  { sku: 'P48803-B21', description: 'HPE ProLiant DL380 Gen11 x16/x8/x8 Primary Riser Kit', quantity: 1 },
  { sku: 'P56073-B21', description: 'HPE ProLiant DL380 Gen11 Primary Riser Cable Kit', quantity: 1 }
];
res = evalPcieRiserSlots(items);
assert(res.primaryRiserCount === 1, 'Primary riser counted');
assert(res.hasPrimaryCableKit === true, 'Primary cable kit detected');
assert(res.activeSlotsAvailable === 3, 'Primary riser WITH cable kit activates all 3 slots');
assert(res.isExceedingActiveSlots === false, '3 PCIe cards fit cleanly in 3 active slots');
norm = normalizeAspectResult('PCIE_RISER', res);
assert(norm.status === 'PASS', 'Status is PASS for 3 cards in 3 active cabled primary slots');

// Scenario 3.2c: Primary Riser with 3 PCIe cards and MISSING Cable Kit (Slot 1 deficit)
items = [
  { sku: 'P08443-B21', description: 'Intel E810-XXVDA2 Ethernet 10/25Gb 2-port SFP28 Adapter for HPE', quantity: 3 },
  { sku: 'P48803-B21', description: 'HPE ProLiant DL380 Gen11 x16/x8/x8 Primary Riser Kit', quantity: 1 }
];
res = evalPcieRiserSlots(items);
assert(res.requiredPcieCards === 3, '3 cards demanded');
assert(res.activeSlotsAvailable === 2, 'Only 2 active slots without cable kit');
assert(res.isExceedingActiveSlots === true, '3 cards exceed 2 active slots');
assert(res.needsPrimaryCableKit === true, 'needsPrimaryCableKit is TRUE to activate Slot 1');
norm = normalizeAspectResult('PCIE_RISER', res);
assert(norm.status === 'FAIL', 'Status is FAIL when 3 cards exceed 2 uncabled active slots');
assert(norm.errors.some(e => e.includes('Primary riser cable kit required to activate Slot 1')), 'Emits primary cable kit error');

// Scenario 3.2d: Secondary Riser Card P48800-B21
items = [
  { sku: 'P08443-B21', description: 'Intel E810-XXVDA2 Adapter', quantity: 4 },
  { sku: 'P48803-B21', description: 'HPE ProLiant DL380 Gen11 x16/x8/x8 Primary Riser Kit', quantity: 1 },
  { sku: 'P56073-B21', description: 'HPE ProLiant DL380 Gen11 Primary Riser Cable Kit', quantity: 1 },
  { sku: 'P48800-B21', description: 'HPE ProLiant DL380 Gen11 3-slot Secondary Riser Kit', quantity: 1 }
];
res = evalPcieRiserSlots(items);
assert(res.secondaryRiserCount === 1, 'P48800-B21 counted as physical secondary riser');
assert(res.activeSlotsAvailable === 5, '3 primary + 2 uncabled secondary = 5 active slots');
assert(res.isExceedingActiveSlots === false, '4 cards fit cleanly in 5 active slots');

// Scenario 3.2e: Tertiary Riser Card P48806-B21
items = [
  { sku: 'P48806-B21', description: 'HPE ProLiant DL380 Gen11 2x16 Tertiary Riser Kit', quantity: 1 }
];
res = evalPcieRiserSlots(items);
assert(res.tertiaryRiserCount === 1, 'P48806-B21 counted as physical tertiary riser');

// Scenario 3.2f: DL380a Gen12 Rear FIO Kit (P74690-B21) Native 3 Slots
items = [
  { sku: 'P08443-B21', description: 'Intel E810-XXVDA2 Adapter', quantity: 2 },
  { sku: 'P74690-B21', description: 'HPE ProLiant DL380a Gen12 Rear 3-slot FIO Kit', quantity: 1 }
];
res = evalPcieRiserSlots(items);
assert(res.activeSlotsAvailable === 3, 'DL380a rear FIO kit provides 3 native active slots');
assert(res.needsPrimaryRiser === false, 'needsPrimaryRiser is false for DL380a rear kit');
assert(res.isExceedingActiveSlots === false, '2 cards fit in 3 active slots');


// ============================================================================
// DOMAIN 4: E2E DOMAIN INTEGRATION ADVERSARIAL AUDIT
// ============================================================================
console.log('\n🔹 DOMAIN 4: Full Multi-Aspect Domain Orchestration Stress Test');

// 4.1 Valid BOM with DLC Cold Plate + DDR5 RDIMMs + Primary Riser + Cable Kit
const validCompositeBOM = [
  { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 1 },
  { sku: 'P44556-B21', description: 'AMD EPYC 9754 2.25GHz 128-core 360W Processor', quantity: 2 },
  { sku: 'P56000-B21', description: 'HPE Direct Liquid Cooling Module Kit', quantity: 1 },
  { sku: 'P48820-B21', description: 'HPE ProLiant DL380 Gen11 High Performance Fan Kit', quantity: 1 },
  { sku: 'P43328-F21', description: 'HPE 32GB (1x32GB) Single Rank x4 DDR5-4800 Registered Smart Memory FIO Kit', quantity: 16 },
  { sku: 'P08443-B21', description: 'Intel E810-XXVDA2 Ethernet 10/25Gb 2-port SFP28 Adapter for HPE', quantity: 2 },
  { sku: 'P48803-B21', description: 'HPE ProLiant DL380 Gen11 x16/x8/x8 Primary Riser Kit', quantity: 1 },
  { sku: 'P56073-B21', description: 'HPE ProLiant DL380 Gen11 Primary Riser Cable Kit', quantity: 1 },
  { sku: 'P03178-B21', description: 'HPE 1600W Flex Slot Titanium Hot Plug Low Halogen Power Supply Kit', quantity: 2 },
  { sku: 'R7A11AAE', description: 'HPE Compute Ops Management Standard 3-year Upfront ProLiant SaaS', quantity: 1 }
];

const domainRes = evaluateDomainAspects('server', validCompositeBOM, null, {}, 1, {
  chassisInfo: { channelWidth: 8 }
});

const thermalAspect = domainRes.checks.find(c => c.id === 'COMPUTE_THERMAL');
const memoryAspect = domainRes.checks.find(c => c.id === 'MEMORY_CHANNEL');
const pcieAspect = domainRes.checks.find(c => c.id === 'PCIE_RISER');

assert(thermalAspect && thermalAspect.status === 'PASS', 'COMPUTE_THERMAL passes with 360W CPUs + DLC kit');
assert(memoryAspect && memoryAspect.status === 'PASS', 'MEMORY_CHANNEL passes with 16x DDR5 RDIMMs');
assert(pcieAspect && pcieAspect.status === 'PASS', 'PCIE_RISER passes with 2 adapters + primary riser + cable kit');
assert(domainRes.isAllPassed === true, 'All domain aspects pass for valid composite BOM');


console.log('\n================================================================');
console.log(`📊 ADVERSARIAL CHALLENGER TEST RESULTS:`);
console.log(`   Total Assertions Executed : ${totalPasses + totalFails}`);
console.log(`   Passed                    : ${totalPasses} ✅`);
console.log(`   Failed                    : ${totalFails} ❌`);
console.log('================================================================\n');

if (totalFails > 0) {
  console.error('❌ Adversarial verification discovered failures:');
  for (const f of failureDetails) {
    console.error(`   - ${f}`);
  }
  process.exit(1);
} else {
  console.log('✨ All adversarial challenges and stress assertions passed with 0 defects!');
  process.exit(0);
}
