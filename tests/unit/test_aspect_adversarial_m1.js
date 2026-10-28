'use strict';
/**
 * tests/unit/test_aspect_adversarial_m1.js
 *
 * Adversarial Stress & Verification Harness for Milestone 1:
 * Empirical validation and stress-testing of Thermal, Memory, and PCIe Riser aspects.
 *
 * Part 1: Mandatory Milestone 1 Scenarios (Verification of Baseline Rules)
 * Part 2: Adversarial Stress & Subversive Boundary Probes (Vulnerability Mining)
 */

const { evalComputeThermal } = require('../../scripts/lib/aspects/compute_thermal.js');
const { evalMemoryChannel } = require('../../scripts/lib/aspects/memory_channel.js');
const { evalPcieRiserSlots } = require('../../scripts/lib/aspects/pcie_riser.js');
const { evaluateDomainAspects, normalizeAspectResult } = require('../../scripts/lib/aspects/aspect_registry.js');

let totalPasses = 0;
let totalFails = 0;
const vulnerabilityFindings = [];

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    totalPasses++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    totalFails++;
  }
}

function recordVulnerability(id, title, attackScenario, blastRadius, observedBehavior) {
  vulnerabilityFindings.push({ id, title, attackScenario, blastRadius, observedBehavior });
  console.log(`  ⚠️ VULNERABILITY DETECTED [${id}]: ${title}`);
  console.log(`     Scenario: ${attackScenario}`);
  console.log(`     Observed: ${observedBehavior}\n`);
}

console.log('================================================================');
console.log('🔥 EMPIRICAL CHALLENGER HARNESS — MILESTONE 1 VERIFICATION');
console.log('================================================================\n');

// ============================================================================
// PART 1: MANDATORY MILESTONE 1 BASELINE VERIFICATION
// ============================================================================

console.log('--- SECTION 1: Zero Heatsinks on Installed CPUs ---');
let items = [
  { sku: 'P12345-B21', description: 'Intel Xeon Gold 6330 2.0GHz 28-core 205W Processor', quantity: 2 }
];
let res = evalComputeThermal(items);
assert(res.cpuCount === 2, 'Counted 2 CPUs');
assert(res.hasHeatsinks === false, 'hasHeatsinks is FALSE when 0 heatsinks provided');
assert(res.needsHeatsink === true, 'needsHeatsink is TRUE when 0 heatsinks provided');
let norm = normalizeAspectResult('COMPUTE_THERMAL', res);
assert(norm.status === 'FAIL', 'normalizeAspectResult status is FAIL');
assert(norm.errors.some(e => e.includes('Missing required processor heatsink')), 'Emits heatsink deficit error');

// Positive test: Heatsink provided
items = [
  { sku: 'P12345-B21', description: 'Intel Xeon Gold 6330 2.0GHz 28-core 205W Processor', quantity: 2 },
  { sku: 'P48809-B21', description: 'HPE ProLiant DL380 2U High Performance Heat Sink', quantity: 2 }
];
res = evalComputeThermal(items);
assert(res.hasHeatsinks === true, 'P48809-B21 recognized as valid heatsink');
assert(res.needsHeatsink === false, 'needsHeatsink clears to FALSE when heatsink provided');


console.log('\n--- SECTION 2: High-TDP CPUs (>350W) Without Liquid Cooling ---');
items = [
  { sku: 'P53714-B21', description: 'AMD EPYC 9754 2.25GHz 128-core 360W Processor for HPE', quantity: 2 },
  { sku: 'P48809-B21', description: 'HPE ProLiant DL380 2U High Performance Heat Sink', quantity: 2 }
];
res = evalComputeThermal(items);
assert(res.maxCpuTdpWatts === 360, 'Extracted 360W TDP');
assert(res.hasDirectLiquidCooling === false, 'hasDirectLiquidCooling is FALSE without DLC');
assert(res.needsDirectLiquidCooling === true, 'needsDirectLiquidCooling is TRUE for 360W CPU without DLC');
norm = normalizeAspectResult('COMPUTE_THERMAL', res);
assert(norm.status === 'FAIL', 'Status is FAIL for >350W CPU without DLC');
assert(norm.errors.some(e => e.includes('Direct Liquid Cooling required for high-TDP processor')), 'Emits DLC required error');

// Positive test: DLC module provided
items = [
  { sku: 'P53714-B21', description: 'AMD EPYC 9754 2.25GHz 128-core 360W Processor for HPE', quantity: 2 },
  { sku: 'P74796-B21', description: 'HPE ProLiant Direct Liquid Cooling Module Kit', quantity: 2 }
];
res = evalComputeThermal(items);
assert(res.hasDirectLiquidCooling === true, 'P74796-B21 recognized as valid DLC module');
assert(res.needsDirectLiquidCooling === false, 'needsDirectLiquidCooling clears to FALSE with DLC');

// Boundary test: Exactly 350W CPU does not mandate DLC (air-coolable threshold)
items = [
  { sku: 'P49619-B21', description: 'Intel Xeon Platinum 8490H 1.9GHz 60-core 350W Processor', quantity: 2 },
  { sku: 'P48809-B21', description: 'HPE ProLiant DL380 2U High Performance Heat Sink', quantity: 2 }
];
res = evalComputeThermal(items);
assert(res.maxCpuTdpWatts === 350, 'Extracted 350W TDP');
assert(res.needsDirectLiquidCooling === false, '350W exact boundary does not require DLC');


console.log('\n--- SECTION 3: Zero RAM Modules on Server CPUs ---');
items = [
  { sku: 'P12345-B21', description: 'Intel Xeon Gold 6330 2.0GHz 28-core 205W Processor', quantity: 2 }
];
res = evalMemoryChannel(items);
assert(res.cpuCount === 2, 'Counted 2 CPUs');
assert(res.memoryCount === 0, 'memoryCount is 0');
assert(res.needsMemory === true, 'needsMemory is TRUE for CPUs with 0 RAM');
norm = normalizeAspectResult('MEMORY_CHANNEL', res);
assert(norm.status === 'FAIL', 'Status is FAIL for 0 RAM');
assert(norm.errors.some(e => e.includes('Missing required system memory')), 'Emits missing memory error');

// Positive test: RAM provided
items = [
  { sku: 'P12345-B21', description: 'Intel Xeon Gold 6330 2.0GHz 28-core 205W Processor', quantity: 2 },
  { sku: 'P69728-B21', description: 'HPE 64GB Dual Rank x4 DDR5-6400 Registered Smart Memory Kit', quantity: 16 }
];
res = evalMemoryChannel(items);
assert(res.memoryCount === 16, 'memoryCount is 16');
assert(res.needsMemory === false, 'needsMemory clears to FALSE when RAM provided');


console.log('\n--- SECTION 4: Mixed DDR4 + DDR5 & Mixed RDIMM + LRDIMM/MRDIMM ---');
// 4A: Mixed DDR4 + DDR5
items = [
  { sku: 'P12345-B21', description: 'Intel Xeon Gold 6330 2.0GHz 28-core 205W Processor', quantity: 2 },
  { sku: 'P54321-B21', description: 'HPE 32GB 2Rx4 PC4-3200AA-R Smart Kit DDR4 Memory', quantity: 8 },
  { sku: 'P69728-B21', description: 'HPE 32GB 1Rx4 DDR5-6400 Registered Smart Memory Kit', quantity: 8 }
];
res = evalMemoryChannel(items);
assert(res.hasMixedDdrGeneration === true, 'hasMixedDdrGeneration is TRUE for DDR4 + DDR5');
norm = normalizeAspectResult('MEMORY_CHANNEL', res);
assert(norm.status === 'FAIL', 'Status is FAIL for mixed DDR generations');
assert(norm.errors.some(e => e.includes('DDR4 and DDR5 memory generations cannot be mixed')), 'Emits mixed DDR error');

// 4B: Mixed RDIMM + LRDIMM
items = [
  { sku: 'P12345-B21', description: 'Intel Xeon Gold 6330 2.0GHz 28-core 205W Processor', quantity: 2 },
  { sku: 'P69728-B21', description: 'HPE 64GB Dual Rank x4 DDR5-6400 Registered Smart Memory Kit RDIMM', quantity: 8 },
  { sku: 'P69730-B21', description: 'HPE 128GB Quad Rank x4 DDR5-6400 Load-Reduced Smart Memory Kit LRDIMM', quantity: 8 }
];
res = evalMemoryChannel(items);
assert(res.hasMixedMemoryTypes === true, 'hasMixedMemoryTypes is TRUE for RDIMM + LRDIMM');
norm = normalizeAspectResult('MEMORY_CHANNEL', res);
assert(norm.status === 'FAIL', 'Status is FAIL for mixed memory types');
assert(norm.errors.some(e => e.includes('RDIMM, LRDIMM, and MRDIMM memory types cannot be mixed')), 'Emits mixed type error');

// 4C: Mixed RDIMM + MRDIMM
items = [
  { sku: 'P12345-B21', description: 'Intel Xeon Gold 6330 2.0GHz 28-core 205W Processor', quantity: 2 },
  { sku: 'P69728-B21', description: 'HPE 64GB Dual Rank x4 DDR5-6400 Registered Smart Memory Kit RDIMM', quantity: 8 },
  { sku: 'P89000-B21', description: 'HPE 128GB Dual Rank x4 DDR5-8800 Multiplexed MRDIMM Smart Kit', quantity: 8 }
];
res = evalMemoryChannel(items);
assert(res.hasMixedMemoryTypes === true, 'hasMixedMemoryTypes is TRUE for RDIMM + MRDIMM');


console.log('\n--- SECTION 5: Single-Socket CPU & Memory Channel Population ---');
// 5A: Single-socket CPU honest counting (no fallback to 2)
items = [
  { sku: 'P53696-B21', description: 'AMD EPYC 9124 3.0GHz 16-core 200W Processor for HPE', quantity: 1 },
  { sku: 'P69728-B21', description: 'HPE 64GB Dual Rank x4 DDR5-6400 Registered Smart Memory Kit', quantity: 8 }
];
res = evalMemoryChannel(items);
assert(res.cpuCount === 1, 'Honest 1 CPU counted without heuristic fallback to 2');
assert(res.dimmsPerCpu === 8, '8 DIMMs per CPU');
assert(res.isSupportedPopulation === true, '8 DIMMs is supported population');
assert(res.isBalancedChannel === true, '8 DIMMs on 8 channels is balanced');
assert(res.isInvalidChannelConfiguration === false, 'isInvalidChannelConfiguration is FALSE');

// 5B: 1 CPU with 5 DIMMs on 8-channel socket (Unsupported population)
items = [
  { sku: 'P53696-B21', description: 'AMD EPYC 9124 3.0GHz 16-core 200W Processor for HPE', quantity: 1 },
  { sku: 'P69728-B21', description: 'HPE 64GB Dual Rank x4 DDR5-6400 Registered Smart Memory Kit', quantity: 5 }
];
res = evalMemoryChannel(items);
assert(res.isSupportedPopulation === false, '5 DIMMs is NOT supported population');
assert(res.isInvalidChannelConfiguration === true, 'isInvalidChannelConfiguration is TRUE for 5 DIMMs');
norm = normalizeAspectResult('MEMORY_CHANNEL', res);
assert(norm.status === 'FAIL', 'Status is FAIL for 5 DIMMs');
assert(norm.errors.some(e => e.includes('Invalid memory channel population')), 'Emits invalid channel population error');

// 5C: 1 CPU with 4 DIMMs on 8-channel socket (Supported, but unbalanced bandwidth)
items = [
  { sku: 'P53696-B21', description: 'AMD EPYC 9124 3.0GHz 16-core 200W Processor for HPE', quantity: 1 },
  { sku: 'P69728-B21', description: 'HPE 64GB Dual Rank x4 DDR5-6400 Registered Smart Memory Kit', quantity: 4 }
];
res = evalMemoryChannel(items, 1, null, false, 8);
assert(res.isSupportedPopulation === true, '4 DIMMs is supported population (half-populated socket)');
assert(res.isBalancedChannel === false, '4 DIMMs on 8 channels is UNBALANCED (4 % 8 !== 0)');
norm = normalizeAspectResult('MEMORY_CHANNEL', res);
assert(norm.status === 'WARN', 'Status is WARN for unbalanced interleaving');
assert(norm.warnings.some(w => w.includes('Unbalanced memory channel interleaving bandwidth')), 'Emits unbalanced bandwidth warning');


console.log('\n--- SECTION 6: PCIe Cards Installed Without Primary Riser ---');
// 6A: 1 PCIe card without primary riser on DL380 Gen11
items = [
  { sku: 'P08443-B21', description: 'Intel E810-XXVDA2 Ethernet 10/25Gb 2-port SFP28 Adapter for HPE', quantity: 1 }
];
res = evalPcieRiserSlots(items);
assert(res.requiredPcieCards === 1, 'Counted 1 required PCIe card');
assert(res.activeSlotsAvailable === 0, 'activeSlotsAvailable is 0 without primary riser');
assert(res.isExceedingActiveSlots === true, 'isExceedingActiveSlots is TRUE (1 card > 0 active slots)');
assert(res.needsPrimaryRiser === true, 'needsPrimaryRiser is TRUE');
norm = normalizeAspectResult('PCIE_RISER', res);
assert(norm.status === 'FAIL', 'Status is FAIL without primary riser');
assert(norm.errors.some(e => e.includes('PCIe card count exceeds electrically cabled active slots')), 'Emits active slots exceeded error');
assert(norm.errors.some(e => e.includes('Primary Riser Kit required for PCIe expansion')), 'Emits Primary Riser Kit required error');

// 6B: 3 PCIe cards without primary riser
items = [
  { sku: 'P08443-B21', description: 'Intel E810-XXVDA2 Ethernet 10/25Gb 2-port SFP28 Adapter for HPE', quantity: 1 },
  { sku: 'R2E09A', description: 'HPE SN1610Q 32Gb 2-port Fibre Channel Host Bus Adapter', quantity: 1 },
  { sku: 'P47777-B21', description: 'HPE MR416i-p Gen11 x16 Lanes 8GB Cache PCI SPDM Plug-in Storage Controller', quantity: 1 }
];
res = evalPcieRiserSlots(items);
assert(res.requiredPcieCards === 3, 'Counted 3 required PCIe cards');
assert(res.activeSlotsAvailable === 0, '0 active slots available');
assert(res.isExceedingActiveSlots === true, '3 cards exceed 0 active slots');
assert(res.needsPrimaryRiser === true, 'needsPrimaryRiser is TRUE');

// 6C: DL380a Gen12 architecture has 3 native active rear slots
items = [
  { sku: 'P76706-B21', description: 'HPE ProLiant DL380a Gen12 8GPU Configure-to-order Server', quantity: 1 },
  { sku: 'P08443-B21', description: 'Intel E810-XXVDA2 Ethernet 10/25Gb 2-port SFP28 Adapter for HPE', quantity: 2 }
];
res = evalPcieRiserSlots(items);
assert(res.activeSlotsAvailable === 3, 'DL380a provides 3 native active rear slots');
assert(res.needsPrimaryRiser === false, 'DL380a does not demand primary riser for 2 cards');
assert(res.isExceedingActiveSlots === false, '2 cards fit in DL380a 3 active slots');


console.log('\n--- SECTION 7: x16 Lane Oversubscription (laneBifurcationConstraint) ---');
// 7A: DL380 Gen11 with primary riser P48803-B21 but NO primary cable kit
// Only 1 x16 lane is active without primary cable kit P56073-B21
items = [
  { sku: 'S0K89A', description: 'NVIDIA L40S 48GB PCIe GPU Accelerator', quantity: 2 },
  { sku: 'P48803-B21', description: 'HPE ProLiant DL380 Gen11 x16/x8/x8 Primary Riser Kit', quantity: 1 },
  { sku: 'P52410-B21', description: 'HPE DL380 Gen11 GPU Power Cable Kit', quantity: 2 }
];
res = evalPcieRiserSlots(items);
assert(res.x16RequiredCount === 2, 'Counted 2x x16 card demand');
assert(res.x16LanesAvailable === 1, 'Only 1 x16 lane available without cable kit');
assert(res.laneBifurcationConstraint === true, 'laneBifurcationConstraint is TRUE (2 cards > 1 lane)');
norm = normalizeAspectResult('PCIE_RISER', res);
assert(norm.status === 'FAIL', 'Status is FAIL for x16 lane oversubscription');
assert(norm.errors.some(e => e.includes('PCIe x16 lane demand exceeds available x16 physical slots')), 'Emits x16 lane oversubscription error');

// 7B: Primary Cable Kit P56073-B21 activates Slot 1 as x16 (2 x16 lanes total)
items = [
  { sku: 'S0K89A', description: 'NVIDIA L40S 48GB PCIe GPU Accelerator', quantity: 2 },
  { sku: 'P48803-B21', description: 'HPE ProLiant DL380 Gen11 x16/x8/x8 Primary Riser Kit', quantity: 1 },
  { sku: 'P56073-B21', description: 'HPE ProLiant DL380 Gen11 Primary Riser Cable Kit', quantity: 1 },
  { sku: 'P52410-B21', description: 'HPE DL380 Gen11 GPU Power Cable Kit', quantity: 2 }
];
res = evalPcieRiserSlots(items);
assert(res.x16LanesAvailable === 2, '2 x16 lanes available with primary cable kit');
assert(res.laneBifurcationConstraint === false, 'laneBifurcationConstraint clears to FALSE with 2 lanes');

// 7C: 3x x16 cards with only primary riser + cable kit (max 2 x16 lanes)
items = [
  { sku: 'S0K89A', description: 'NVIDIA L40S 48GB PCIe GPU Accelerator', quantity: 3 },
  { sku: 'P48803-B21', description: 'HPE ProLiant DL380 Gen11 x16/x8/x8 Primary Riser Kit', quantity: 1 },
  { sku: 'P56073-B21', description: 'HPE ProLiant DL380 Gen11 Primary Riser Cable Kit', quantity: 1 },
  { sku: 'P52410-B21', description: 'HPE DL380 Gen11 GPU Power Cable Kit', quantity: 3 }
];
res = evalPcieRiserSlots(items);
assert(res.laneBifurcationConstraint === true, 'laneBifurcationConstraint is TRUE for 3 cards on 2 lanes');


// ============================================================================
// PART 2: ADVERSARIAL STRESS PROBES & SUBVERSIVE BOUNDARY ATTACKS
// ============================================================================
console.log('\n================================================================');
console.log('⚡ PART 2: ADVERSARIAL STRESS & SUBVERSIVE BOUNDARY ATTACKS');
console.log('================================================================\n');

// ----------------------------------------------------------------------------
// ATTACK 1: Riser Cable Kit Subversion in pcie_riser.js
// Attack: Provide ONLY a Primary Riser Cable Kit (P56073-B21) with NO Riser Card
// Expected physical behavior: Should flag needsPrimaryRiser=true (cannot install cards into a bare cable)
// ----------------------------------------------------------------------------
console.log('🔹 Attack 1: Riser Cable Kit Subversion in pcie_riser.js');
const cableOnlyBOM = [
  { sku: 'P08443-B21', description: 'Intel E810-XXVDA2 Ethernet 10/25Gb 2-port SFP28 Adapter for HPE', quantity: 1 },
  { sku: 'P56073-B21', description: 'HPE ProLiant DL380 Gen11 Primary Riser Cable Kit', quantity: 1 }
];
const cableOnlyRes = evalPcieRiserSlots(cableOnlyBOM);

if (cableOnlyRes.primaryRiserCount > 0 && cableOnlyRes.needsPrimaryRiser === false) {
  recordVulnerability(
    'VULN-PCIE-01',
    'Primary Riser Cable Kit Tallied as Physical Riser Card Bypassing needsPrimaryRiser',
    'Customer specifies PCIe card + Primary Riser Cable Kit (P56073-B21) without the physical Primary Riser Card (P48803-B21)',
    'A server with 0 physical PCIe riser slots is validated as 100% buildable with 3 active slots; customer receives cables but no slot board',
    `primaryRiserCount=${cableOnlyRes.primaryRiserCount}, activeSlotsAvailable=${cableOnlyRes.activeSlotsAvailable}, needsPrimaryRiser=${cableOnlyRes.needsPrimaryRiser}`
  );
}

// ----------------------------------------------------------------------------
// ATTACK 2: Flash Memory / NVMe Drive Subversion in memory_channel.js
// Attack: Provide 0 RAM DIMMs, but provide an NVMe Storage Drive with "Flash Memory" in description
// Expected physical behavior: Should flag needsMemory=true (flash storage is not main DDR5 memory)
// ----------------------------------------------------------------------------
console.log('🔹 Attack 2: Flash Memory Storage Drive Subversion in memory_channel.js');
const flashStorageBOM = [
  { sku: 'P12345-B21', description: 'Intel Xeon Gold 6330 2.0GHz 28-core 205W Processor', quantity: 1 },
  { sku: 'P13662-B21', description: 'HPE 800GB NVMe High Performance Mixed Use Flash Memory Storage Drive', quantity: 2 }
];
const flashStorageRes = evalMemoryChannel(flashStorageBOM);

if (flashStorageRes.memoryCount > 0 && flashStorageRes.needsMemory === false) {
  recordVulnerability(
    'VULN-MEM-01',
    'Storage Drive or Battery with "Memory" Description Counted as System RAM DIMM',
    'Customer specifies server CPU + NVMe Flash Memory Storage Drive with 0 system RAM DIMMs',
    'Server with 0 RAM modules is validated as having system RAM (memoryCount=2, 1600GB RAM); passes needsMemory physical baseline',
    `memoryCount=${flashStorageRes.memoryCount}, totalMemoryGb=${flashStorageRes.totalMemoryGb}, needsMemory=${flashStorageRes.needsMemory}`
  );
}

// ----------------------------------------------------------------------------
// ATTACK 3: Air Baffle Subversion in compute_thermal.js
// Attack: Provide CPU + Air Baffle with "heatsink" in description with NO actual Heatsink
// Expected physical behavior: Should flag needsHeatsink=true (air baffle is plastic ducting, not thermal heatsink)
// ----------------------------------------------------------------------------
console.log('🔹 Attack 3: Air Baffle Subversion in compute_thermal.js');
const airBaffleBOM = [
  { sku: 'P12345-B21', description: 'Intel Xeon Gold 6330 2.0GHz 28-core 205W Processor', quantity: 1 },
  { sku: 'P99999-B21', description: 'HPE DL380 Gen11 Standard Air Baffle for Heatsink', quantity: 1 }
];
const airBaffleRes = evalComputeThermal(airBaffleBOM);

if (airBaffleRes.hasHeatsinks === true && airBaffleRes.needsHeatsink === false) {
  recordVulnerability(
    'VULN-THERM-01',
    'Air Baffle or Accessory with "Heatsink" in Description Counted as Thermal Heatsink',
    'Customer specifies server CPU + Air Baffle ("Standard Air Baffle for Heatsink") with 0 processor heatsinks',
    'Server with 0 heatsinks is validated as cooled; physical CPU will suffer thermal shutdown on power-on',
    `hasHeatsinks=${airBaffleRes.hasHeatsinks}, needsHeatsink=${airBaffleRes.needsHeatsink}`
  );
}

// ============================================================================
// PART 3: DOMAIN INTEGRATION EVALUATION (evaluateDomainAspects)
// ============================================================================
console.log('\n--- SECTION 8: Domain Evaluation Integration ---');
const domainTestBOM = [
  { sku: 'P12345-B21', description: 'Intel Xeon Gold 6330 2.0GHz 28-core 205W Processor', quantity: 2 },
  { sku: 'P48809-B21', description: 'HPE ProLiant DL380 2U High Performance Heat Sink', quantity: 2 },
  { sku: 'P48820-B21', description: 'HPE ProLiant DL380 Gen11 High Performance Fan Kit', quantity: 1 },
  { sku: 'P69728-B21', description: 'HPE 64GB Dual Rank x4 DDR5-6400 Registered Smart Memory Kit', quantity: 16 },
  { sku: 'P08443-B21', description: 'Intel E810-XXVDA2 Ethernet 10/25Gb 2-port SFP28 Adapter for HPE', quantity: 1 },
  { sku: 'P48803-B21', description: 'HPE ProLiant DL380 Gen11 x16/x8/x8 Primary Riser Kit', quantity: 1 },
  { sku: 'P56073-B21', description: 'HPE ProLiant DL380 Gen11 Primary Riser Cable Kit', quantity: 1 },
  { sku: 'P03178-B21', description: 'HPE 1600W Flex Slot Titanium Hot Plug Low Halogen Power Supply Kit', quantity: 2 },
  { sku: 'R7A11AAE', description: 'HPE Compute Ops Management Standard 3-year Upfront ProLiant SaaS', quantity: 1 }
];

const domainEval = evaluateDomainAspects('server', domainTestBOM, null, {}, 1, {
  chassisInfo: { channelWidth: 8 }
});

const thermalCheck = domainEval.checks.find(c => c.id === 'COMPUTE_THERMAL');
const memoryCheck = domainEval.checks.find(c => c.id === 'MEMORY_CHANNEL');
const pcieCheck = domainEval.checks.find(c => c.id === 'PCIE_RISER');

assert(thermalCheck && thermalCheck.status === 'PASS', 'COMPUTE_THERMAL passes on valid BOM');
assert(memoryCheck && memoryCheck.status === 'PASS', 'MEMORY_CHANNEL passes on valid BOM');
assert(pcieCheck && pcieCheck.status === 'PASS', 'PCIE_RISER passes on valid BOM');
assert(domainEval.isAllPassed === true, 'All domain aspect checks passed on valid BOM');


console.log('\n================================================================');
console.log(`📊 ADVERSARIAL HARNESS SUMMARY:`);
console.log(`   Baseline Requirements : ${totalPasses} Passed | ${totalFails} Failed`);
console.log(`   Vulnerabilities Found : ${vulnerabilityFindings.length} Physical Modeling Flaws Discovered`);
console.log('================================================================\n');

if (vulnerabilityFindings.length > 0) {
  console.log('⚠️  CHALLENGE RESULT: Physical modeling vulnerabilities uncovered! See details above.');
}

if (totalFails > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
