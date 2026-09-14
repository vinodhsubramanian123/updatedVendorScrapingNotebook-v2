'use strict';
/**
 * tests/integration/test_intra_category_conflicts.js — Integration Test for Intra-Category & Presales Mutual Exclusion
 *
 * Verifies:
 * 1. Contradictory Support Services (Onsite Installation & Startup vs Remote Deployment)
 * 2. Power Architecture Conflict (AC Power Supplies mixed with -48VDC Power Supplies)
 * 3. Incompatible Memory Generation (DDR4 mixed with DDR5)
 * 4. Incompatible Memory Types (RDIMM mixed with LRDIMM)
 * 5. Processor Model Uniformity (Dual different CPU models on a single server node)
 * 6. Clean, homogeneous baseline configuration passes without category-level errors
 */

const { evaluatePhysicalMath } = require('../../scripts/lib/boq/boq_evaluator.js');
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

console.log('================================================================');
console.log('🧪 INTRA-CATEGORY & PRESALES MUTUAL EXCLUSION TEST SUITE');
console.log('================================================================\n');

// 1. Contradictory Support Services
console.log('--- Test 1: Contradictory Support Services (Onsite vs Remote) ---');
const boqContradictorySupport = [
  { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF CTO Server', quantity: 1 },
  { sku: 'P49610-B21', description: 'Intel Xeon-S 4410Y 2.0GHz 12-core Processor', quantity: 2 },
  { sku: 'P43328-B21', description: 'HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory Kit', quantity: 16 },
  { sku: 'P38997-B21', description: 'HPE 1600W Flex Slot Platinum Hot Plug Power Supply', quantity: 2 },
  { sku: 'HA114A1', description: 'HPE Installation and Startup Service', quantity: 1 },
  { sku: 'HA454A1', description: 'HPE Remote Installation and Startup Service', quantity: 1 }
];
const resSupport = evaluatePhysicalMath(boqContradictorySupport, null, '', { skipGraphValidation: true });
assert(resSupport.errors.some(e => e.includes('Contradictory Support Services')), 'Detected Contradictory Support Services error in BOQ evaluation');

// 2. Power Architecture Conflict (AC vs DC)
console.log('\n--- Test 2: Power Architecture Conflict (AC vs DC) ---');
const boqMixedPower = [
  { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF CTO Server', quantity: 1 },
  { sku: 'P49610-B21', description: 'Intel Xeon-S 4410Y 2.0GHz 12-core Processor', quantity: 2 },
  { sku: 'P43328-B21', description: 'HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory Kit', quantity: 16 },
  { sku: 'P38997-B21', description: 'HPE 1600W Flex Slot Platinum Hot Plug Power Supply', quantity: 1 },
  { sku: 'P17023-B21', description: 'HPE 1600W Flex Slot -48VDC Hot Plug Power Supply Kit', quantity: 1 },
  { sku: 'P36877-B21', description: 'HPE 1600W -48VDC Power Cable Lug Kit', quantity: 1 }
];
const resPower = evaluatePhysicalMath(boqMixedPower, null, '', { skipGraphValidation: true });
assert(resPower.errors.some(e => e.includes('Power Architecture Conflict')), 'Detected Power Architecture Conflict error in BOQ evaluation');

// 3. Memory Generation Conflict (DDR4 vs DDR5)
console.log('\n--- Test 3: Memory Generation Conflict (DDR4 vs DDR5) ---');
const boqMixedDdr = [
  { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF CTO Server', quantity: 1 },
  { sku: 'P49610-B21', description: 'Intel Xeon-S 4410Y 2.0GHz 12-core Processor', quantity: 2 },
  { sku: 'P43328-B21', description: 'HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory Kit', quantity: 8 },
  { sku: 'P00924-B21', description: 'HPE 32GB 2Rx4 DDR4-2933 Registered Smart Memory Kit', quantity: 8 },
  { sku: 'P38997-B21', description: 'HPE 1600W Flex Slot Platinum Hot Plug Power Supply', quantity: 2 }
];
const resDdr = evaluatePhysicalMath(boqMixedDdr, null, '', { skipGraphValidation: true });
assert(resDdr.errors.some(e => e.includes('Memory Generation Conflict')), 'Detected Memory Generation Conflict error in BOQ evaluation');

// 4. Memory Type Conflict (RDIMM vs LRDIMM)
console.log('\n--- Test 4: Memory Type Conflict (RDIMM vs LRDIMM) ---');
const boqMixedType = [
  { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF CTO Server', quantity: 1 },
  { sku: 'P49610-B21', description: 'Intel Xeon-S 4410Y 2.0GHz 12-core Processor', quantity: 2 },
  { sku: 'P43328-B21', description: 'HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory Kit', quantity: 8 },
  { sku: 'P43334-B21', description: 'HPE 128GB 4Rx4 DDR5-4800 Load-Reduced Smart Memory Kit', quantity: 8 },
  { sku: 'P38997-B21', description: 'HPE 1600W Flex Slot Platinum Hot Plug Power Supply', quantity: 2 }
];
const resType = evaluatePhysicalMath(boqMixedType, null, '', { skipGraphValidation: true });
assert(resType.errors.some(e => e.includes('Memory Architecture Conflict')), 'Detected Memory Architecture Conflict error in BOQ evaluation');

// 5. Processor Model Uniformity
console.log('\n--- Test 5: Processor Model Uniformity ---');
const boqMixedCpu = [
  { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF CTO Server', quantity: 1 },
  { sku: 'P49610-B21', description: 'Intel Xeon-S 4410Y 2.0GHz 12-core Processor', quantity: 1 },
  { sku: 'P49611-B21', description: 'Intel Xeon-S 4416+ 2.0GHz 20-core Processor', quantity: 1 },
  { sku: 'P43328-B21', description: 'HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory Kit', quantity: 16 },
  { sku: 'P38997-B21', description: 'HPE 1600W Flex Slot Platinum Hot Plug Power Supply', quantity: 2 }
];
const resCpu = evaluatePhysicalMath(boqMixedCpu, null, '', { skipGraphValidation: true, serverCount: 1 });
assert(resCpu.errors.some(e => e.includes('Processor Architecture Conflict')), 'Detected Processor Architecture Conflict error in BOQ evaluation');

// 6. Clean Configuration
console.log('\n--- Test 6: Clean Baseline Configuration ---');
const boqClean = [
  { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF CTO Server', quantity: 1 },
  { sku: 'P49610-B21', description: 'Intel Xeon-S 4410Y 2.0GHz 12-core Processor', quantity: 2 },
  { sku: 'P43328-B21', description: 'HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory Kit', quantity: 16 },
  { sku: 'P38997-B21', description: 'HPE 1600W Flex Slot Platinum Hot Plug Power Supply', quantity: 2 },
  { sku: 'HA114A1', description: 'HPE Installation and Startup Service', quantity: 1 }
];
const resClean = evaluatePhysicalMath(boqClean, null, '', { skipGraphValidation: true, serverCount: 1 });
assert(!resClean.errors.some(e => e.includes('Contradictory Support Services')), 'Clean config has no support contradiction');
assert(!resClean.errors.some(e => e.includes('Power Architecture Conflict')), 'Clean config has no power architecture conflict');
assert(!resClean.errors.some(e => e.includes('Memory Generation Conflict')), 'Clean config has no memory generation conflict');
assert(!resClean.errors.some(e => e.includes('Memory Architecture Conflict')), 'Clean config has no memory architecture conflict');
assert(!resClean.errors.some(e => e.includes('Processor Architecture Conflict')), 'Clean config has no processor architecture conflict');

// 7. Power Supply Efficiency Conflict (Platinum vs Titanium)
console.log('\n--- Test 7: Power Supply Efficiency Conflict (Platinum vs Titanium) ---');
const boqMixedEfficiency = [
  { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF CTO Server', quantity: 1 },
  { sku: 'P49610-B21', description: 'Intel Xeon-S 4410Y 2.0GHz 12-core Processor', quantity: 2 },
  { sku: 'P43328-B21', description: 'HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory Kit', quantity: 16 },
  { sku: 'P38997-B21', description: 'HPE 1600W Flex Slot Platinum Hot Plug Power Supply', quantity: 1 },
  { sku: 'P03178-B21', description: 'HPE 1000W Flex Slot Titanium Power Supply', quantity: 1 }
];
const resEfficiency = evaluatePhysicalMath(boqMixedEfficiency, null, '', { skipGraphValidation: true, serverCount: 1 });
assert(resEfficiency.errors.some(e => e.includes('Platinum and Titanium power supply efficiencies')), 'Detected Power Supply Efficiency Conflict');

// 8. SaaS vs Hardware Support Delineation
console.log('\n--- Test 8: SaaS vs Hardware Support Delineation ---');
const boqSaasOnly = [
  { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF CTO Server', quantity: 1 },
  { sku: 'P49610-B21', description: 'Intel Xeon-S 4410Y 2.0GHz 12-core Processor', quantity: 2 },
  { sku: 'P43328-B21', description: 'HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory Kit', quantity: 16 },
  { sku: 'P38997-B21', description: 'HPE 1600W Flex Slot Platinum Hot Plug Power Supply', quantity: 2 },
  { sku: 'R7A11AAE', description: 'HPE GreenLake for Compute Ops Management Standard 3-year SaaS', quantity: 1 }
];
const resSaas = evaluatePhysicalMath(boqSaasOnly, null, '', { skipGraphValidation: true, serverCount: 1 });
const supportAspect = evalSupportManufacturing(boqSaasOnly, null, 0, 1);
assert(supportAspect.hasSaasWithoutHardwareSupport === true, 'Flagged SaaS software present without physical hardware support in support aspect');
assert(resSaas.warnings.some(w => w.includes('SaaS vs Hardware Support Delineation')), 'Emitted SaaS vs Hardware Support Delineation advisory');

console.log('\n================================================================');
console.log(`📊 FINAL SUMMARY: ${totalPasses} PASSED | ${totalFails} FAILED`);
console.log('================================================================\n');

if (totalFails > 0) process.exit(1);
