'use strict';
/**
 * tests/unit/test_wave1_gap_remediation.js
 *
 * Validates Wave 1 Remediation Deliverables:
 * 1. G-STR-01: Composite topology containment decoupling in boq_evaluator.js
 * 2. G-LOG-01: Classification confidence score calculation & hitlRequired floor
 * 3. G-LOG-02: Upfront Workload DNA query routing to RFP_SIZING_TO_BOM
 * 4. G-LOG-03: Compact and delimiter-less model token resolution
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { _assessConfidenceAndCleanliness } = require('../../scripts/lib/boq/boq_evaluator.js');
const { classifyQueryIntent, getChassisCatalog, executeRoutedQuery } = require('../../scripts/evaluators/route_query.js');
const { inferWorkloadDnaFromText } = require('../../scripts/lib/conflict/workload_dna.js');

test('G-STR-01: Composite topology with clean relationships achieves isMathClean = true and status PASS', () => {
  const errors = [];
  const warnings = [];
  const aspectChecks = [
    { id: 1, name: 'Compute Thermal', status: 'PASS' },
    { id: 2, name: 'Memory Channel', status: 'PASS' },
    { id: 3, name: 'Storage Tri-Mode', status: 'PASS' },
    { id: 4, name: 'Networking OCP', status: 'PASS' },
    { id: 5, name: 'PCIe Riser', status: 'PASS' },
    { id: 6, name: 'Power Environment', status: 'PASS' },
    { id: 7, name: 'Support Manufacturing', status: 'PASS' }
  ];
  const topology = {
    domain: 'composite',
    relationshipChecks: ['ENCLOSURE_BAY_COMPATIBILITY', 'ADAPTER_TO_FABRIC_MAPPING', 'SHARED_POWER_COOLING'],
    relationshipStatus: 'EVALUATED_PASS',
    compositeChecks: [
      { id: 'ENCLOSURE_BAY_COMPATIBILITY', status: 'PASS' },
      { id: 'ADAPTER_TO_FABRIC_MAPPING', status: 'PASS' },
      { id: 'SHARED_POWER_COOLING', status: 'PASS' }
    ]
  };
  const conflictGraphResults = {
    isWholeSolutionValid: true,
    conflicts: [],
    unresolvedConflicts: [],
    rankedSolutions: [{ id: 'Rank 1', isMathClean: true, physicalMathClean: true }]
  };

  const result = _assessConfidenceAndCleanliness(
    errors,
    warnings,
    topology,
    aspectChecks,
    { hasFailures: false, errors: [] },
    conflictGraphResults
  );

  assert.equal(result.isMathClean, true, 'Clean composite solution must achieve isMathClean = true');
  assert.equal(result.isGraphClean, true, 'Clean composite solution must achieve isGraphClean = true');
  assert.ok(result.confidence.score >= 0.85, `Confidence score must be >= 0.85 (got ${result.confidence.score})`);

  const crossDepCheck = aspectChecks.find(a => a.id === 'CROSS_COMPONENT_DEPENDENCIES');
  assert.ok(crossDepCheck, 'CROSS_COMPONENT_DEPENDENCIES aspect check must be present');
  assert.equal(crossDepCheck.status, 'PASS', 'CROSS_COMPONENT_DEPENDENCIES must be PASS for EVALUATED_PASS topology');
  assert.equal(conflictGraphResults.rankedSolutions[0].validationScope, 'COMPOSITE_SOLUTION_VERIFIED');
});

test('G-STR-01: Composite topology with unverified relationships is gated to isMathClean = false and <= 0.74 confidence', () => {
  const errors = [];
  const warnings = [];
  const aspectChecks = [
    { id: 1, name: 'Compute Thermal', status: 'PASS' },
    { id: 2, name: 'Memory Channel', status: 'PASS' }
  ];
  const topology = {
    domain: 'composite',
    relationshipChecks: ['ENCLOSURE_BAY_COMPATIBILITY'],
    relationshipStatus: 'NOT_EVALUATED',
    compositeChecks: []
  };
  const conflictGraphResults = {
    isWholeSolutionValid: true,
    conflicts: [],
    unresolvedConflicts: [],
    rankedSolutions: [{ id: 'Rank 1', isMathClean: true }]
  };

  const result = _assessConfidenceAndCleanliness(
    errors,
    warnings,
    topology,
    aspectChecks,
    { hasFailures: false, errors: [] },
    conflictGraphResults
  );

  assert.equal(result.isMathClean, false, 'Unverified composite solution must not be math clean');
  assert.ok(result.confidence.score <= 0.74, `Confidence must be clamped to <= 0.74 (got ${result.confidence.score})`);
  assert.equal(result.confidence.isHitlTriggered, true, 'HITL must be triggered for unverified topology');

  const crossDepCheck = aspectChecks.find(a => a.id === 'CROSS_COMPONENT_DEPENDENCIES');
  assert.ok(crossDepCheck);
  assert.equal(crossDepCheck.status, 'NOT_EVALUATED');
});

test('G-LOG-01: Routing confidence score is emitted and hitlRequired is set when confidence < 0.75', async () => {
  const result = await executeRoutedQuery('What is the price of an ambiguous gadget?');
  assert.ok(result, 'Result envelope must be returned');
  assert.equal(typeof result.classificationConfidence, 'number', 'classificationConfidence must be a number');
  assert.ok(result.classificationConfidence >= 0.0 && result.classificationConfidence <= 1.0, 'Confidence must be between 0 and 1');

  if (result.classificationConfidence < 0.75) {
    assert.equal(result.hitlRequired, true, 'hitlRequired must be true when classificationConfidence < 0.75');
  }
});

test('G-LOG-02: Upfront Workload DNA routes sizing queries with 0 SKUs to RFP_SIZING_TO_BOM', () => {
  const query = 'We need a 4-node cluster for SAP HANA with 1TB RAM and 8 NVMe drives';
  const classification = classifyQueryIntent(query);

  assert.equal(classification.intent, 'RFP_SIZING_TO_BOM');
  assert.ok(classification.workloadProfile, 'Must attach workloadProfile when Workload DNA is detected');
  assert.equal(classification.workloadProfile.workloadType, 'SAP_HANA');
  assert.ok(classification.confidence >= 0.90, 'Confidence must be >= 0.90 for explicit workload sizing');
});

test('G-LOG-02: Workload DNA inference helper accurately profiles enterprise workloads from text', () => {
  const hanaDna = inferWorkloadDnaFromText('Deploying SAP HANA in-memory analytics cluster');
  assert.ok(hanaDna);
  assert.equal(hanaDna.workloadType, 'SAP_HANA');

  const vcfDna = inferWorkloadDnaFromText('VMware Cloud Foundation private cloud deployment');
  assert.ok(vcfDna);
  assert.equal(vcfDna.workloadType, 'VMWARE_VCF');

  const sqlDna = inferWorkloadDnaFromText('High-concurrency Microsoft SQL Server OLTP node');
  assert.ok(sqlDna);
  assert.equal(sqlDna.workloadType, 'MICROSOFT_SQL_OLTP');

  const aiDna = inferWorkloadDnaFromText('Fine-tuning cluster for LLM model training and AI inference');
  assert.ok(aiDna);
  assert.equal(aiDna.workloadType, 'AI_INFERENCE_TRAINING');
  assert.equal(aiDna.hasGpu, true);
});

test('G-LOG-03: Compact and delimiter-less model tokens resolve to target catalogs', () => {
  // Test compact 380G12
  const g12 = getChassisCatalog('Configure a 380G12 server');
  assert.equal(g12.isAmbiguous, false, '380G12 should not be ambiguous');
  assert.equal(g12.chassisKey, 'DL380_Gen12', '380G12 should resolve to DL380_Gen12');

  // Test compact dl380gen12
  const dl380gen12 = getChassisCatalog('Build a quote for dl380gen12');
  assert.equal(dl380gen12.isAmbiguous, false, 'dl380gen12 should not be ambiguous');
  assert.equal(dl380gen12.chassisKey, 'DL380_Gen12');

  // Test compact 360g11
  const g11 = getChassisCatalog('Need specifications for 360g11');
  assert.equal(g11.isAmbiguous, false, '360g11 should not be ambiguous');
  assert.equal(g11.chassisKey, 'DL360_Gen11', '360g11 should resolve to DL360_Gen11');

  // Test compact 380ag12
  const dl380a = getChassisCatalog('4x H200 GPU cluster on 380aG12');
  assert.equal(dl380a.isAmbiguous, false, '380aG12 should not be ambiguous');
  assert.equal(dl380a.chassisKey, 'DL380a_Gen12', '380aG12 should resolve to DL380a_Gen12');
});
