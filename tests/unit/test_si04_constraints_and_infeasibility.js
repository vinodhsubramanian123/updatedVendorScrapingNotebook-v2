'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  CONSTRAINT_SCHEMA_VERSION,
  RESULT_CATEGORY,
  createConstraintResult,
  adaptAspectChecksToConstraints,
  evaluateHardBeforePreferences,
  summarizeConstraintResults
} = require('../../scripts/lib/conflict/constraints/constraint_results.js');

const {
  computeMinimalConflictingSet,
  diagnoseInfeasibility,
  runBoundedFeasibilitySearch,
  classifyFeasibilityOutcome
} = require('../../scripts/lib/conflict/constraints/conflict_explanations.js');

const { evaluateDomainAspects } = require('../../scripts/lib/aspects/aspect_registry.js');
const { evalComputeThermal } = require('../../scripts/lib/aspects/compute_thermal.js');
const { auditOpticalLinkEndpoints } = require('../../scripts/lib/aspects/networking_ocp.js');
const { validateConflictGraph } = require('../../scripts/lib/conflict/conflict_graph.js');

test('SI-04 [1/8]: impossible CPU/thermal combo produces typed HARD FAIL and blocks positive ranking', () => {
  const thermalItems = [
    { sku: 'P73282-B21', description: 'HPE DL380 Gen12 8SFF CTO Server', quantity: 1 },
    { sku: 'P73311-B21', description: 'Intel Xeon 6780E 144C 385W Processor', quantity: 2 }
  ];
  const computeResult = evalComputeThermal(thermalItems, null, {
    HIGH_PERF_FAN_KIT: { sku: 'P74795-B21' },
    HIGH_PERF_HEATSINK: { sku: 'P74792-B21' }
  }, 1, {});

  assert.equal(computeResult.needsDirectLiquidCooling, true);
  assert.equal(computeResult.needsHighPerfCooling, true);

  const constraints = adaptAspectChecksToConstraints([
    {
      id: 'COMPUTE_THERMAL',
      name: 'Compute & Thermal Aspect',
      status: 'FAIL',
      result: computeResult,
      errors: [
        'Direct Liquid Cooling required for 385W TDP processor',
        'High-TDP processor (>185W) requires High-Performance Fan Kit'
      ],
      warnings: [],
      requirementIds: ['REQ-CPU-01']
    },
    {
      id: 'MEMORY_CHANNEL',
      name: 'Memory Channel Preference',
      status: 'PASS',
      hardness: 'PREFERENCE',
      operands: { dimmsPerCpu: 8, channelsPerCpu: 8 },
      detail: 'Balanced 1DPC memory interleaving.'
    }
  ]);

  const thermal = constraints.find(c => c.constraintId === 'CONSTR-COMPUTE-THERMAL');
  assert.ok(thermal);
  assert.equal(thermal.schemaVersion, CONSTRAINT_SCHEMA_VERSION);
  assert.equal(thermal.resultCategory, RESULT_CATEGORY);
  assert.notEqual(thermal.resultCategory, 'PASSED');
  assert.equal(thermal.status, 'FAIL');
  assert.equal(thermal.hardness, 'HARD');
  assert.equal(thermal.domain, 'compute_thermal');
  assert.equal(thermal.owner, 'node:compute');
  assert.deepEqual(thermal.predicate, {
    subject: 'maxCpuTdpWatts',
    operator: 'LTE',
    target: 185,
    unit: 'W'
  });
  assert.equal(thermal.inputs.maxCpuTdpWatts.value, 385);
  assert.equal(thermal.inputs.maxCpuTdpWatts.unit, 'W');
  assert.deepEqual(thermal.requirementIds, ['REQ-CPU-01']);
  assert.ok(thermal.evidenceRefs.includes('CLIC-81354654'));

  const hardFirst = evaluateHardBeforePreferences(constraints, () => 1.0);
  assert.deepEqual(hardFirst.evaluationOrder, ['HARD', 'PREFERENCE']);
  assert.equal(hardFirst.hardEvaluationCompletedBeforePreferences, true);
  assert.equal(hardFirst.blocksPositiveRanking, true);
  assert.equal(hardFirst.allowPositiveRanking, false);
  assert.equal(hardFirst.preferenceSummary.rawPreferenceScore, 1.0);
  assert.equal(hardFirst.preferenceSummary.effectivePreferenceScore, null);

  const diagnosis = diagnoseInfeasibility(constraints, {
    product: 'DL380 Gen12',
    catalogRevision: '2026-11-rev1'
  });
  assert.equal(diagnosis.outcome, 'INFEASIBLE_IN_EVALUATED_SCOPE');
  assert.equal(diagnosis.universalImpossibilityClaimed, false);
  assert.ok(diagnosis.minimalConflictingSet.constraintIds.includes('CONSTR-COMPUTE-THERMAL'));
});

test('SI-04 [2/8]: shared slot collision distinguishes verified irreducibility ablation from unverified subsets', () => {
  const cStorageOcp = createConstraintResult({
    constraintId: 'CONSTR-OCP-STORAGE',
    domain: 'networking',
    owner: 'slot:ocp1',
    predicate: { subject: 'ocpSlotDemand', operator: 'LTE', target: 1, unit: 'slots' },
    inputs: { requestedSlots: { value: 1, unit: 'slots' }, maxSlots: { value: 1, unit: 'slots' } },
    status: 'FAIL',
    hardness: 'HARD',
    requirementIds: ['REQ-RAID-OCP'],
    evidenceRefs: ['CLIC-81355854']
  });
  const cNicOcp = createConstraintResult({
    constraintId: 'CONSTR-OCP-NIC',
    domain: 'networking',
    owner: 'slot:ocp1',
    predicate: { subject: 'ocpSlotDemand', operator: 'LTE', target: 1, unit: 'slots' },
    inputs: { requestedSlots: { value: 1, unit: 'slots' }, maxSlots: { value: 1, unit: 'slots' } },
    status: 'FAIL',
    hardness: 'HARD',
    requirementIds: ['REQ-NIC-25G'],
    evidenceRefs: ['OCP_3_0_SLOT_LIMIT']
  });
  const cMemoryPass = createConstraintResult({
    constraintId: 'CONSTR-MEM-BALANCE',
    domain: 'memory',
    owner: 'node:memory',
    predicate: { subject: 'dimmsPerCpu', operator: 'EQ', target: 8, unit: 'DIMMs/socket' },
    inputs: { dimmsPerCpu: { value: 8, unit: 'DIMMs/socket' } },
    status: 'PASS',
    hardness: 'HARD',
    requirementIds: ['REQ-MEM-512G'],
    evidenceRefs: ['CLIC-81354490']
  });

  const allConstraints = [cStorageOcp, cNicOcp, cMemoryPass];

  // Without ablation callback -> unverified subset
  const unverified = computeMinimalConflictingSet(allConstraints);
  assert.equal(unverified.isIrreducible, false);
  assert.equal(unverified.irreducibilityBasis, 'UNVERIFIED_SUBSET');
  assert.equal(unverified.ablationRan, false);
  assert.deepEqual(unverified.constraintIds, ['CONSTR-OCP-STORAGE', 'CONSTR-OCP-NIC']);

  // With single-constraint removal ablation verifying shared slot capacity (max 1 OCP slot)
  const checkOcpSlotFeasible = subset => {
    const ocpSlotsUsed = subset
      .filter(c => c.owner === 'slot:ocp1')
      .reduce((sum, c) => sum + (c.inputs?.requestedSlots?.value || 0), 0);
    return ocpSlotsUsed <= 1;
  };

  const verified = computeMinimalConflictingSet(allConstraints, {
    checkFeasibleSubsetFn: checkOcpSlotFeasible
  });
  assert.equal(verified.isIrreducible, true);
  assert.equal(verified.irreducibilityBasis, 'SINGLE_CONSTRAINT_ABLATION_VERIFIED');
  assert.equal(verified.ablationRan, true);
  assert.deepEqual(verified.constraintIds, ['CONSTR-OCP-STORAGE', 'CONSTR-OCP-NIC']);
  assert.deepEqual(verified.requirementIds, ['REQ-RAID-OCP', 'REQ-NIC-25G']);
  assert.deepEqual(verified.evidenceRefs, ['CLIC-81355854', 'OCP_3_0_SLOT_LIMIT']);
  assert.equal(verified.ablationChecks.length, 2);
  assert.equal(verified.ablationChecks.every(a => a.subsetFeasible === true), true);

  // Verify-only on a non-minimal superset containing unrelated constraint -> stays unverified
  const nonMinimalSuperset = computeMinimalConflictingSet(allConstraints, {
    verifyOnly: true,
    checkFeasibleSubsetFn: checkOcpSlotFeasible
  });
  assert.equal(nonMinimalSuperset.isIrreducible, false);
  assert.equal(nonMinimalSuperset.irreducibilityBasis, 'UNVERIFIED_SUBSET');
});

test('SI-04 [3/8]: owned backplane and controller dependencies preserve owner and block ranking when missing', () => {
  const storageFail = adaptAspectChecksToConstraints([
    {
      id: 'STORAGE_TRI_MODE',
      name: 'Storage & Controller Cabling',
      owner: 'cage:box2-8sff',
      status: 'FAIL',
      operands: { driveCount: 8, hasStorageController: true, hasSmartBattery: false, hasNoDriveKit: false },
      errors: [
        'Storage controller requires backplane signal cable kit (P76456-B21)',
        'Smart Storage Battery required for controller write cache'
      ],
      requirementIds: ['REQ-STORAGE-RAID10'],
      detail: 'Controller-routed Box 2 drive cage missing backplane cabling and cache battery.'
    }
  ]);

  assert.equal(storageFail.length, 1);
  assert.equal(storageFail[0].owner, 'cage:box2-8sff');
  assert.equal(storageFail[0].domain, 'storage');
  assert.equal(storageFail[0].status, 'FAIL');
  assert.equal(storageFail[0].inputs.driveCount.value, 8);
  assert.equal(storageFail[0].inputs.driveCount.unit, 'drives');
  assert.ok(storageFail[0].evidenceRefs.includes('CLIC-81354627'));

  const hardCheck = evaluateHardBeforePreferences(storageFail);
  assert.equal(hardCheck.blocksPositiveRanking, true);

  const storagePass = adaptAspectChecksToConstraints([
    {
      id: 'STORAGE_TRI_MODE',
      name: 'Storage & Controller Cabling',
      owner: 'cage:box2-8sff',
      status: 'PASS',
      operands: { driveCount: 8, hasStorageController: true, hasSmartBattery: true, hasNoDriveKit: false },
      detail: 'Backplane signal cable and Smart Storage Battery verified.'
    }
  ]);
  assert.equal(storagePass[0].status, 'PASS');
  assert.equal(evaluateHardBeforePreferences(storagePass).allowPositiveRanking, true);
});

test('SI-04 [4/8]: optical and endpoint speed/form-factor constraints detect speed/form-factor mismatches', () => {
  const mismatchedParts = [
    { sku: 'P21112-B21', description: 'Mellanox ConnectX-6 Lx 100GbE 2-port QSFP28 Adapter', quantity: 1 },
    { sku: '845398-B21', description: 'HPE 25Gb SFP28 SR 100m Transceiver', quantity: 2 }
  ];
  const mismatchAudit = auditOpticalLinkEndpoints(mismatchedParts);
  assert.equal(mismatchAudit.isCompatible, false);

  const mismatchConstraints = adaptAspectChecksToConstraints([], {
    opticalAudit: mismatchAudit,
    requirementIds: ['REQ-NET-100G']
  });
  assert.equal(mismatchConstraints.length, 1);
  assert.equal(mismatchConstraints[0].constraintId, 'CONSTR-OPTICAL-ENDPOINT-PARITY');
  assert.equal(mismatchConstraints[0].domain, 'optical');
  assert.equal(mismatchConstraints[0].owner, 'port:optical_endpoint');
  assert.equal(mismatchConstraints[0].status, 'FAIL');
  assert.deepEqual(mismatchConstraints[0].requirementIds, ['REQ-NET-100G']);
  assert.match(mismatchConstraints[0].detail, /100G.*25G/);

  const matchedParts = [
    { sku: 'P10115-B21', description: 'Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 OCP3 Adapter', quantity: 1 },
    { sku: '845398-B21', description: 'HPE 25Gb SFP28 SR 100m Transceiver', quantity: 2 }
  ];
  const matchedAudit = auditOpticalLinkEndpoints(matchedParts);
  const matchedConstraints = adaptAspectChecksToConstraints([], { opticalAudit: matchedAudit });
  assert.equal(matchedConstraints[0].status, 'PASS');
  assert.equal(diagnoseInfeasibility(matchedConstraints, { product: 'DL380 Gen12' }).outcome, 'FEASIBLE_IN_EVALUATED_SCOPE');
});

test('SI-04 [5/8]: unknown electrical input remains UNKNOWN, never coerced to PASS, and blocks positive ranking', () => {
  // Direct factory guard: attempting to pass status='PASS' with missing electrical input must stay UNKNOWN
  const forcedUnknown = createConstraintResult({
    constraintId: 'CONSTR-POWER-LINE-VOLTAGE',
    domain: 'power',
    owner: 'subsystem:power',
    predicate: { subject: 'inputVoltage', operator: 'GTE', target: 200, unit: 'V' },
    inputs: { inputVoltage: { value: null, unit: 'V' }, estimatedNodeWattage: { value: 1450, unit: 'W' } },
    missingInputs: ['inputVoltage'],
    status: 'PASS',
    hardness: 'HARD',
    evidenceRefs: ['PSU_DERATING_SPEC']
  });
  assert.equal(forcedUnknown.status, 'UNKNOWN');
  assert.deepEqual(forcedUnknown.missingInputs, ['inputVoltage']);

  // Adapted high-line aspect with unspecified inputVoltage
  const adaptedPower = adaptAspectChecksToConstraints([
    {
      id: 'POWER_ENVIRONMENT',
      name: 'Power Supply & Environmental Aspect',
      status: 'PASS',
      result: {
        psuCount: 2,
        maxPsuWattage: 1600,
        estimatedNodeWattage: 1400,
        needsHighLine220v: true,
        derating: { isInputVoltageUnspecified: true }
      }
    }
  ]);
  assert.equal(adaptedPower[0].status, 'UNKNOWN');
  assert.ok(adaptedPower[0].missingInputs.includes('inputVoltage'));

  const hardFirst = evaluateHardBeforePreferences(adaptedPower);
  assert.equal(hardFirst.blocksPositiveRanking, true);
  assert.equal(hardFirst.hardSummary.unknownCount, 1);

  const diagnosis = diagnoseInfeasibility(adaptedPower, { product: 'DL380 Gen12' });
  assert.equal(diagnosis.outcome, 'UNKNOWN');
  assert.ok(diagnosis.missingInputs.includes('inputVoltage'));
});

test('SI-04 [6/8]: missing domain profile remains NOT_EVALUATED, distinct from workflow statuses, never PASS', () => {
  const archiveEval = evaluateDomainAspects('unprofiled_edge_appliance', [{ sku: 'X1', description: 'Edge Box', quantity: 1 }], null, {}, 1);
  const adapted = adaptAspectChecksToConstraints(archiveEval);

  assert.equal(adapted.length, 1);
  assert.equal(adapted[0].status, 'NOT_EVALUATED');
  assert.equal(adapted[0].resultCategory, 'CONSTRAINT_PREDICATE');
  assert.ok(adapted[0].missingInputs.includes('domainProfile'));

  // Factory guard: even if caller attempts status: 'PASS' with domainProfileAvailable: false, never coerce to PASS
  const directMissingProfile = createConstraintResult({
    constraintId: 'CONSTR-DOMAIN-PROFILE',
    domain: 'unprofiled_edge_appliance',
    status: 'PASS',
    domainProfileAvailable: false,
    hardness: 'HARD'
  });
  assert.equal(directMissingProfile.status, 'NOT_EVALUATED');

  const diagnosis = diagnoseInfeasibility(adapted, { product: 'EdgeAppliance' });
  assert.equal(diagnosis.outcome, 'UNKNOWN');
  assert.deepEqual(diagnosis.notEvaluatedDomains, ['unprofiled_edge_appliance']);
  assert.equal(diagnosis.hardBeforePreferences.blocksPositiveRanking, true);
});

test('SI-04 [7/8]: bounded feasibility search returns SEARCH_EXHAUSTED on budget limit while retaining bestValidatedCandidate', () => {
  const candidates = [
    { id: 'cand-1', score: 45, feasible: true },
    { id: 'cand-2', score: 88, feasible: true },
    { id: 'cand-3', score: 999, feasible: false },
    { id: 'cand-4', score: 95, feasible: true },
    { id: 'cand-5', score: 100, feasible: true }
  ];

  const searchRes = runBoundedFeasibilitySearch({
    candidates,
    scope: { product: 'DL380 Gen12', catalogRevision: '2026-11-rev1', searchSpaceExhaustive: true },
    budget: { maxIterations: 3, maxCandidates: 3, maxElapsedMs: 5000 },
    evaluateCandidateFn: cand => ({
      feasible: cand.feasible,
      score: cand.score,
      constraints: [
        createConstraintResult({
          constraintId: `CONSTR-${cand.id}`,
          domain: 'compute_thermal',
          status: cand.feasible ? 'PASS' : 'FAIL',
          hardness: 'HARD'
        })
      ]
    })
  });

  assert.equal(searchRes.outcome, 'SEARCH_EXHAUSTED');
  assert.equal(searchRes.budget.exhausted, true);
  assert.equal(searchRes.budget.candidatesEvaluated, 3);
  assert.equal(searchRes.evaluatedScope.candidateCountEvaluated, 3);
  assert.equal(searchRes.evaluatedScope.searchSpaceExhaustive, false);
  assert.equal(searchRes.universalImpossibilityClaimed, false);
  assert.ok(searchRes.bestValidatedCandidate);
  assert.equal(searchRes.bestValidatedCandidate.candidate.id, 'cand-2');
  assert.equal(searchRes.bestValidatedCandidate.score, 88);

  // Elapsed-ms budget exhaustion check with deterministic clock
  let fakeNow = 1000;
  const timedSearch = runBoundedFeasibilitySearch({
    candidates,
    scope: { product: 'DL380 Gen12', catalogRevision: '2026-11-rev1' },
    budget: {
      maxIterations: 10,
      maxCandidates: 10,
      maxElapsedMs: 50,
      nowFn: () => fakeNow
    },
    evaluateCandidateFn: cand => {
      fakeNow += 60;
      return { feasible: cand.feasible, score: cand.score };
    }
  });
  assert.equal(timedSearch.outcome, 'SEARCH_EXHAUSTED');
  assert.equal(timedSearch.budget.exhaustionReason, 'MAX_ELAPSED_MS_REACHED');
  assert.equal(timedSearch.bestValidatedCandidate.candidate.id, 'cand-1');
  assert.equal(classifyFeasibilityOutcome({ exhausted: true, hasFeasibleCandidate: true }), 'SEARCH_EXHAUSTED');

  // UNKNOWN or NOT_EVALUATED status without constraints must NEVER be promoted as bestValidatedCandidate
  const unknownStatusSearch = runBoundedFeasibilitySearch({
    candidates: [{ id: 'unknown-cand' }, { id: 'not-eval-cand' }],
    scope: { product: 'DL380 Gen12', catalogRevision: '2026-11-rev1' },
    evaluateCandidateFn: cand => ({
      feasible: true,
      status: cand.id === 'unknown-cand' ? 'UNKNOWN' : 'NOT_EVALUATED',
      score: 100
    })
  });
  assert.equal(unknownStatusSearch.outcome, 'UNKNOWN');
  assert.equal(unknownStatusSearch.bestValidatedCandidate, null);
});

test('SI-04 [8/8]: restricted scope infeasibility never claims universal impossibility + conflict_graph.js integration', () => {
  // Restricted subset of 2 candidates that both fail, while an out-of-scope candidate exists elsewhere
  const restrictedSearch = runBoundedFeasibilitySearch({
    candidates: [
      { id: '8SFF-OCP-COLLISION-1', feasible: false },
      { id: '8SFF-OCP-COLLISION-2', feasible: false }
    ],
    scope: {
      product: 'DL380 Gen12',
      catalogRevision: 'local-subset-only',
      searchSpaceExhaustive: false
    },
    budget: { maxIterations: 10, maxCandidates: 10, maxElapsedMs: 5000 },
    evaluateCandidateFn: cand => ({
      feasible: false,
      constraints: [
        createConstraintResult({
          constraintId: `CONSTR-${cand.id}`,
          domain: 'networking',
          status: 'FAIL',
          hardness: 'HARD'
        })
      ]
    })
  });

  assert.equal(restrictedSearch.outcome, 'INFEASIBLE_IN_EVALUATED_SCOPE');
  assert.equal(restrictedSearch.evaluatedScope.searchSpaceExhaustive, false);
  assert.equal(restrictedSearch.universalImpossibilityClaimed, false);
  assert.equal(restrictedSearch.bestValidatedCandidate, null);
  assert.match(restrictedSearch.explanation, /Universal vendor impossibility is NOT claimed/i);

  // Integration check with conflict_graph.js validateConflictGraph
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'si04-conflict-graph-'));
  try {
    const chassisDir = path.join(tmpDir, 'DL380_Gen12_SFF');
    fs.mkdirSync(chassisDir, { recursive: true });
    fs.writeFileSync(path.join(chassisDir, 'DL380_Gen12_SFF_Catalog_Rules.json'), JSON.stringify([]));

    const cleanBoq = [
      { sku: 'P73282-B21', description: 'HPE DL380 Gen12 SFF Server', quantity: 1 },
      { sku: 'P69728-B21', description: '64GB Dual Rank x4 DDR5-6400 Smart Memory Kit', quantity: 2 },
      { sku: 'P73325-B21', description: 'HPE ProLiant Compute Localization FIO Kit', quantity: 1 },
      { sku: 'R7A11AAE', description: 'HPE Compute Ops Management Standard 3-year Upfront SaaS', quantity: 1 },
      { sku: 'P79558-B21', description: 'HPE ProLiant Compute 25C Ambient Temp Config Tracking', quantity: 1 }
    ];
    const cleanGraph = validateConflictGraph(cleanBoq, [], chassisDir);
    assert.equal(cleanGraph.isWholeSolutionValid, true);
    assert.ok(Array.isArray(cleanGraph.constraintResults));
    assert.ok(cleanGraph.constraintResults.length >= 1);
    assert.equal(cleanGraph.constraintResults.every(c => c.resultCategory === 'CONSTRAINT_PREDICATE'), true);
    assert.equal(cleanGraph.feasibilityDiagnosis.outcome, 'FEASIBLE_IN_EVALUATED_SCOPE');
    assert.equal(cleanGraph.feasibilityDiagnosis.universalImpossibilityClaimed, false);

    // Conflict graph with mixed memory + optical speed mismatch
    const conflictedBoq = [
      { sku: 'P73282-B21', description: 'HPE DL380 Gen12 SFF Server', quantity: 1 },
      { sku: 'P69728-B21', description: '64GB Dual Rank x4 DDR5-6400 Smart Memory Kit', quantity: 1 },
      { sku: 'P69729-B21', description: '32GB Single Rank x8 DDR5-6400 Smart Memory Kit', quantity: 1 },
      { sku: 'P21112-B21', description: 'Mellanox ConnectX-6 Lx 100GbE 2-port QSFP28 Adapter', quantity: 1 },
      { sku: '845398-B21', description: 'HPE 25Gb SFP28 SR 100m Transceiver', quantity: 2 }
    ];
    const conflictedGraph = validateConflictGraph(conflictedBoq, [], chassisDir);
    assert.equal(conflictedGraph.isWholeSolutionValid, false);
    assert.equal(conflictedGraph.feasibilityDiagnosis.outcome, 'INFEASIBLE_IN_EVALUATED_SCOPE');
    assert.equal(conflictedGraph.feasibilityDiagnosis.universalImpossibilityClaimed, false);
    assert.equal(conflictedGraph.feasibilityDiagnosis.hardBeforePreferences.blocksPositiveRanking, true);
    assert.ok(
      conflictedGraph.constraintResults.some(c => c.constraintId === 'CONSTR-OPTICAL-ENDPOINT-PARITY' && c.status === 'FAIL')
    );

    const summary = summarizeConstraintResults(conflictedGraph.constraintResults);
    assert.equal(summary.overallConstraintStatus, 'FAIL');
    assert.equal(summary.blocksPositiveRanking, true);

    // Unrecognized chassis must emit NOT_EVALUATED domainProfile and keep feasibilityDiagnosis.outcome UNKNOWN
    const unknownChassisGraph = validateConflictGraph(
      [{ sku: 'UNKNOWN-999', description: 'Mystery Appliance', quantity: 1 }],
      [],
      chassisDir
    );
    assert.equal(unknownChassisGraph.chassisInfo.unknown, true);
    assert.ok(
      unknownChassisGraph.constraintResults.some(
        c => c.status === 'NOT_EVALUATED' && c.missingInputs.includes('domainProfile')
      )
    );
    assert.equal(unknownChassisGraph.feasibilityDiagnosis.outcome, 'UNKNOWN');
    assert.equal(unknownChassisGraph.feasibilityDiagnosis.hardBeforePreferences.blocksPositiveRanking, true);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
