'use strict';
/**
 * tests/unit/test_composite_topology_and_domain_sniff.js
 *
 * Validates Phase 3A composite topology validation and domain sniffing:
 * 1. ENCLOSURE_BAY_COMPATIBILITY evaluation
 * 2. ADAPTER_TO_FABRIC_MAPPING evaluation
 * 3. SHARED_POWER_COOLING evaluation
 * 4. sniffDomainComposition() mixed-domain detection
 * 5. generateEvaluationNarrative() output structure
 */

const assert = require('assert');
const { evaluateCompositeRelationships, resolveSolutionTopology } = require('../../scripts/lib/boq/solution_topology.js');
const { generateEvaluationNarrative } = require('../../scripts/lib/boq/eval_output_serializer.js');

console.log('🧪 Starting test_composite_topology_and_domain_sniff...');

// Test 1: ENCLOSURE_BAY_COMPATIBILITY
{
  const itemsWithin = [
    { description: 'HPE Synergy 480 Gen12 Compute Blade', quantity: 6 }
  ];
  const checksWithin = evaluateCompositeRelationships(itemsWithin, { roles: ['server', 'enclosure'] }, { maxBays: 12 });
  const bayCheck = checksWithin.find(c => c.id === 'ENCLOSURE_BAY_COMPATIBILITY');
  assert(bayCheck, 'Enclosure bay check must exist');
  assert.strictEqual(bayCheck.status, 'PASS', '6 blades in 12-bay frame should PASS');

  const itemsExceed = [
    { description: 'HPE Synergy 480 Gen12 Compute Blade', quantity: 14 }
  ];
  const checksExceed = evaluateCompositeRelationships(itemsExceed, { roles: ['server', 'enclosure'] }, { maxBays: 12 });
  const bayCheckExceed = checksExceed.find(c => c.id === 'ENCLOSURE_BAY_COMPATIBILITY');
  assert.strictEqual(bayCheckExceed.status, 'FAIL', '14 blades in 12-bay frame should FAIL');
  console.log('  ✅ Test 1 Passed: ENCLOSURE_BAY_COMPATIBILITY validates capacity boundaries');
}

// Test 2: ADAPTER_TO_FABRIC_MAPPING
{
  const matchingItems = [
    { description: 'HPE Synergy 480 Compute Module', quantity: 2 },
    { description: 'HPE Synergy 100Gb Mezzanine Adapter', quantity: 2 },
    { description: 'HPE Virtual Connect SE 100Gb F32 Module for Synergy', quantity: 2 }
  ];
  const checksMatch = evaluateCompositeRelationships(matchingItems, { roles: ['server', 'networking'] });
  const fabricCheck = checksMatch.find(c => c.id === 'ADAPTER_TO_FABRIC_MAPPING');
  assert(fabricCheck, 'Fabric check must exist');
  assert.strictEqual(fabricCheck.status, 'PASS', '100Gb adapter to 100Gb fabric should PASS');

  const mismatchItems = [
    { description: 'HPE Synergy 480 Compute Module', quantity: 2 },
    { description: 'HPE Synergy 25Gb Mezzanine Adapter', quantity: 2 },
    { description: 'HPE Virtual Connect SE 100Gb F32 Module for Synergy', quantity: 2 }
  ];
  const checksMismatch = evaluateCompositeRelationships(mismatchItems, { roles: ['server', 'networking'] });
  const fabricCheckMismatch = checksMismatch.find(c => c.id === 'ADAPTER_TO_FABRIC_MAPPING');
  assert.strictEqual(fabricCheckMismatch.status, 'FAIL', '25Gb adapter to 100Gb fabric should FAIL');
  console.log('  ✅ Test 2 Passed: ADAPTER_TO_FABRIC_MAPPING verifies link speed alignment');
}

// Test 3: SHARED_POWER_COOLING
{
  const powerOk = [
    { description: 'Intel Xeon Platinum 8580 350W TDP Processor', quantity: 4 } // 1400W < 2650W
  ];
  const checksOk = evaluateCompositeRelationships(powerOk, {}, { maxPowerWatts: 2650 });
  const powerCheckOk = checksOk.find(c => c.id === 'SHARED_POWER_COOLING');
  assert(powerCheckOk, 'Power check must exist');
  assert.strictEqual(powerCheckOk.status, 'PASS', '1400W total TDP should PASS in 2650W budget');

  const powerExceed = [
    { description: 'Intel Xeon Platinum 8580 350W TDP Processor', quantity: 10 } // 3500W > 2650W
  ];
  const checksExceed = evaluateCompositeRelationships(powerExceed, {}, { maxPowerWatts: 2650 });
  const powerCheckExceed = checksExceed.find(c => c.id === 'SHARED_POWER_COOLING');
  assert.strictEqual(powerCheckExceed.status, 'FAIL', '3500W total TDP should FAIL in 2650W budget');
  console.log('  ✅ Test 3 Passed: SHARED_POWER_COOLING enforces frame power budget');
}

// Test 4: Domain Sniff in Preprocessor
{
  const { preprocessAndGroupBOQ } = require('../../scripts/lib/boq/boq_preprocessor.js');
  const mixedRaw = `
P73282-B21  HPE ProLiant DL380 Gen12 8SFF Server  2
R7R97A      HPE StoreFabric SN3600B 32Gb FC Switch  1
R4Z00A      HPE Alletra 9000 Storage System  1
`;
  const result = preprocessAndGroupBOQ(null, mixedRaw);
  assert(result.auditTrail, 'Audit trail must exist');
  const sniffStep = result.auditTrail.find(s => s.name === 'Mixed-Domain Tender Detected');
  assert(sniffStep, 'Must detect mixed-domain tender in audit steps');
  console.log('  ✅ Test 4 Passed: Domain sniff correctly identifies mixed-domain tenders');
}

// Test 5: generateEvaluationNarrative
{
  const mockEval = {
    items: [
      { role: 'server', quantity: 2 },
      { role: 'networking', quantity: 1 }
    ],
    evalSummary: {
      aspectChecks: [
        { id: 'COMPUTE_THERMAL', name: 'Compute & Thermal', status: 'PASS', detail: 'TDP bounds verified' },
        { id: 'POWER_ENVIRONMENT', name: 'Power Environment', status: 'PASS', detail: 'Redundant Titanium PSUs' }
      ]
    },
    conflictGraph: {
      conflicts: [],
      rankedSolutions: [
        { rank: 'Rank 1A', label: 'Primary Verified BOM', nlmCitationVerified: true, portalValidationStatus: 'VERIFIED' }
      ]
    },
    portalValidationStatus: 'VERIFIED',
    catalogVersion: 'DL380_Gen12_2026-09-20'
  };
  const narrative = generateEvaluationNarrative(mockEval, { cleanName: 'DL380_Gen12' });
  assert(narrative.includes('Step 1 — BOM Detection Summary'), 'Must have Step 1');
  assert(narrative.includes('Step 2 — Physical Aspect Check Results'), 'Must have Step 2');
  assert(narrative.includes('Step 3 — Conflicts & Catalog Rules Triggered'), 'Must have Step 3');
  assert(narrative.includes('Step 4 — Ranked Strategy Matrix & Supporting Evidence'), 'Must have Step 4');
  assert(narrative.includes('Step 5 — Required Customer Actions Before Quoting'), 'Must have Step 5');
  assert(narrative.includes('Anti-Hallucination Audit Trail'), 'Must include anti-hallucination heading');
  console.log('  ✅ Test 5 Passed: generateEvaluationNarrative produces complete 5-step trace');
}

console.log('🎉 All test_composite_topology_and_domain_sniff tests passed successfully!\n');
process.exit(0);
