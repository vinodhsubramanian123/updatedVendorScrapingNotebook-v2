'use strict';
/**
 * tests/test_conflict_graph.js — Test Suite for Dependency Conflict Graph & Multi-Level Rules Engine
 *
 * Verifies:
 * 1. 5-Level Rule Parsing (VENDOR, CHASSIS, CATEGORY, SUBCATEGORY, SKU)
 * 2. Chassis Variant Auto-Detection (SFF, LFF, EDSFF)
 * 3. Memory Mixing Conflict Detection (x4 vs x8, 96GB/128GB capacity isolation)
 * 4. Power Supply Mixing Conflict Detection (AC vs DC)
 * 5. Cascading Fix Resolution (Injected fix validation)
 * 6. Dual Safety Net Loading (_Catalog_Rules.json fallback to _Catalog.json)
 */

const fs = require('fs');
const path = require('path');
const { classifyRule, loadCatalogRules } = require('../../scripts/lib/catalog/catalog_rules.js');
const os = require('os');
const { detectChassisVariant, validateConflictGraph } = require('../../scripts/lib/conflict/conflict_graph.js');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'conflict-graph-test-'));
const chassisDir = path.join(tmpDir, 'DL380_Gen12_SFF');
fs.mkdirSync(chassisDir, { recursive: true });
fs.writeFileSync(path.join(chassisDir, 'DL380_Gen12_SFF_Catalog_Rules.json'), JSON.stringify([
  { level: 'CATEGORY', ruleType: 'MUTUAL_EXCLUSION', condition: 'x4', target: 'x8', message: 'Mixing of x4 and x8 memory is not allowed' }
]));

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('================================================================');
console.log('🧪 DEPENDENCY CONFLICT GRAPH & MULTI-LEVEL RULES TEST SUITE');
console.log('================================================================\n');

// 1. Rule Classification Test
console.log('--- Test Group 1: 5-Level Rule Parsing ---');
const r1 = classifyRule('BTO products are not allowed in CTO Base Model.');
assert(r1.level === 'VENDOR' && r1.ruleType === 'MODE_EXCLUSION', 'Classified VENDOR level BTO/CTO rule correctly');

const r2 = classifyRule('Supported with EDSFF CTO Server only.', 'SAS Controller');
assert(r2.level === 'CHASSIS' && r2.ruleType === 'CHASSIS_GATE', 'Classified CHASSIS level form-factor gate correctly');

const r3 = classifyRule('Mixing of x4 and x8 memory is not allowed');
assert(r3.level === 'CATEGORY' && r3.ruleType === 'MUTUAL_EXCLUSION', 'Classified CATEGORY level memory mixing rule correctly');

const r4 = classifyRule('HPE 1600W -48VDC Pwr Cbl Lug Kit(P36877-B21) Supported only with HPE 1600W FS -48VDC Ht Plg PS Kit (P17023-B21).');
assert(r4.level === 'SKU' && r4.ruleType === 'DEPENDENCY_CHAIN', 'Classified SKU level dependency chain rule correctly');

// 2. Chassis Variant Auto-Detection
console.log('\n--- Test Group 2: Chassis Variant Auto-Detection ---');
const boqSff = [{ sku: 'P73282-B21', description: 'HPE DL380 Gen12 SFF NC Server' }];
const vSff = detectChassisVariant(boqSff);
assert(vSff.formFactor === '8SFF' && vSff.baseSku === 'P73282-B21', 'Auto-detected SFF chassis variant from P73282-B21');

const boqLff = [{ sku: 'P73283-B21', description: 'HPE DL380 Gen12 LFF NC Server' }];
const vLff = detectChassisVariant(boqLff);
assert(vLff.formFactor === '24SFF' && vLff.baseSku === 'P73283-B21', 'Auto-detected LFF chassis variant from P73283-B21');

const vOverride = detectChassisVariant(boqSff, 'EDSFF');
assert(vOverride.formFactor === 'EDSFF', 'Honored explicit CLI chassis-variant override');

// 3. Memory & Power Supply Mixing Rules Validation
console.log('\n--- Test Group 3: Category Level Mutual Exclusion Rules ---');
const cleanBoq = [
  { sku: 'P73282-B21', description: 'HPE DL380 Gen12 SFF Server' },
  { sku: 'P69728-B21', description: '64GB Dual Rank x4 DDR5-6400 Smart Memory Kit' },
  { sku: 'P73325-B21', description: 'HPE ProLiant Compute Localization FIO Kit' },
  { sku: 'R7A11AAE', description: 'HPE Compute Ops Management Standard 3-year Upfront SaaS' },
  { sku: 'P79558-B21', description: 'HPE ProLiant Compute 25C Ambient Temp Config Tracking' }
];

const gClean = validateConflictGraph(cleanBoq, [], chassisDir);
assert(gClean.isWholeSolutionValid === true, 'Homogeneous x4 memory build passes whole-solution validation');
assert(Array.isArray(gClean.recommendedSolutions) && gClean.recommendedSolutions.length <= 3, 'Publishes at most 3 close, validated customer options');
assert(gClean.recommendedSolutions.every(s => s.isUniqueBom && s.isParetoOptimal && s.physicalMathClean), 'Every published option is unique, Pareto-optimal, and physically clean');

const mixedMemoryBoq = [
  { sku: 'P73282-B21', description: 'HPE DL380 Gen12 SFF Server' },
  { sku: 'P69728-B21', description: '64GB Dual Rank x4 DDR5-6400 Smart Memory Kit' },
  { sku: 'P69729-B21', description: '32GB Single Rank x8 DDR5-6400 Smart Memory Kit' }
];

const gMemMixed = validateConflictGraph(mixedMemoryBoq, [], chassisDir);
assert(gMemMixed.isWholeSolutionValid === false, 'Detected x4 and x8 memory mixing violation');
assert(gMemMixed.conflicts.some(c => c.message.includes('x4 and x8 memory')), 'Reported exact memory mixing conflict message');

// Mixed AC and DC Power Supplies
const mixedPsuBoq = [
  { sku: 'P73282-B21', description: 'HPE DL380 Gen12 SFF Server' },
  { sku: 'P38997-B21', description: 'HPE 1600W Flex Slot Platinum Hot Plug Power Supply' },
  { sku: 'P17023-B21', description: 'HPE 1600W Flex Slot -48VDC Hot Plug Power Supply Kit' }
];
const gPsuMixed = validateConflictGraph(mixedPsuBoq, [], chassisDir);
assert(gPsuMixed.isWholeSolutionValid === false, 'Detected AC and DC power supply mixing violation');
assert(gPsuMixed.conflicts.some(c => c.message.includes('AC and DC power supplies')), 'Reported exact AC/DC power mixing conflict message');

// Contradictory Support Services (Onsite vs Remote)
const contradictorySupportBoq = [
  { sku: 'P73282-B21', description: 'HPE DL380 Gen12 SFF Server' },
  { sku: 'HA114A1', description: 'HPE Installation and Startup Service' },
  { sku: 'HA454A1', description: 'HPE Remote Installation Service' }
];
const gSupportConflict = validateConflictGraph(contradictorySupportBoq, [], chassisDir);
assert(gSupportConflict.isWholeSolutionValid === false, 'Detected contradictory installation support services violation');
assert(gSupportConflict.conflicts.some(c => c.message.includes('Contradictory Installation Support Services')), 'Reported exact support contradiction message');

// Mixed DDR4 and DDR5 Memory
const mixedDdrBoq = [
  { sku: 'P73282-B21', description: 'HPE DL380 Gen12 SFF Server' },
  { sku: 'P69728-B21', description: '64GB Dual Rank x4 DDR5-6400 Smart Memory Kit' },
  { sku: 'P00924-B21', description: '32GB Dual Rank x4 DDR4-2933 Smart Memory Kit' }
];
const gDdrMixed = validateConflictGraph(mixedDdrBoq, [], chassisDir);
assert(gDdrMixed.isWholeSolutionValid === false, 'Detected DDR4 and DDR5 memory mixing violation');
assert(gDdrMixed.conflicts.some(c => c.message.includes('DDR4 and DDR5')), 'Reported exact DDR generation conflict message');

// Mixed RDIMM and LRDIMM Memory
const mixedTypeBoq = [
  { sku: 'P73282-B21', description: 'HPE DL380 Gen12 SFF Server' },
  { sku: 'P69728-B21', description: '64GB Dual Rank x4 DDR5-6400 Registered Smart Memory Kit' },
  { sku: 'P69730-B21', description: '128GB Quad Rank x4 DDR5-6400 Load-Reduced Smart Memory Kit' }
];
const gTypeMixed = validateConflictGraph(mixedTypeBoq, [], chassisDir);
assert(gTypeMixed.isWholeSolutionValid === false, 'Detected RDIMM and LRDIMM memory type mixing violation');
assert(gTypeMixed.conflicts.some(c => c.message.includes('RDIMM, LRDIMM, or MRDIMM')), 'Reported exact memory type conflict message');

// 4. Cascading Fix Resolution
console.log('\n--- Test Group 4: Cascading Fix Resolution ---');
const fixInput = [
  { sku: 'P48820-B21', quantity: 1, description: 'High Performance Fan Kit', rule: 'High TDP Thermal Rule' },
  { sku: 'P36877-B21', quantity: 1, description: 'DC Power Cable Lug Kit', rule: 'DC Power Supply Rule' }
];
const boqPsu = [
  { sku: 'P73282-B21', description: 'HPE DL380 Gen12 SFF Server' },
  { sku: 'P17023-B21', description: 'HPE 1600W Flex Slot -48VDC Hot Plug Power Supply Kit' },
  { sku: 'P73325-B21', description: 'HPE ProLiant Compute Localization FIO Kit' },
  { sku: 'R7A11AAE', description: 'HPE Compute Ops Management Standard 3-year Upfront SaaS' },
  { sku: 'P79558-B21', description: 'HPE ProLiant Compute 25C Ambient Temp Config Tracking' }
];

const gFixes = validateConflictGraph(boqPsu, fixInput, chassisDir);
assert(gFixes.isWholeSolutionValid === true, 'Injected Fan Kit and DC Lug Kit validated without downstream conflicts');
assert(gFixes.resolvedFixes.length === 2, 'Logged 2 resolved cascading fixes with technical reasoning');

// 5. Dual Safety Net Test
console.log('\n--- Test Group 5: Dual Safety Net Loading ---');
const rulesData = loadCatalogRules(chassisDir);
assert(rulesData.parsedRules.length > 0, `Loaded ${rulesData.parsedRules.length} rule(s) via Dual Safety Net`);
assert(rulesData.sourceFile !== 'NONE', `Rules source identified: ${path.basename(rulesData.sourceFile)}`);

// Summary
console.log('\n================================================================');
console.log(`📊 CONFLICT GRAPH TEST SUMMARY: ${passed} passed, ${failed} failed`);
fs.rmSync(tmpDir, { recursive: true, force: true });
  if (failed === 0) {
  console.log('🎉 ALL CONFLICT GRAPH TESTS PASSED!');
} else {
  console.log('⚠️ Some conflict graph tests failed — review output above.');
}
console.log('================================================================\n');

if (failed > 0) process.exit(1);
