'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const {
  BENCHMARK_REPORT_SCHEMA_VERSION,
  DEFAULT_REPORT_PATH,
  scoreBenchmarkScenario,
  computeBenchmarkMetrics,
  readBenchmarkReport,
  runBenchmarkSuite
} = require('../integration/test_boq_eval_benchmarks.js');
const {
  determineEpistemicTier,
  performReasoningPostAnalysis,
  _deriveStep3MathematicalProofs
} = require('../../scripts/lib/system/reasoning_post_analyzer.js');
const { createDecisionTraceLedger } = require('../../scripts/lib/conflict/decision_trace.js');
const { generateMarkdownReport } = require('../../scripts/lib/boq/eval_output_serializer.js');
const { generateCounterfactualRepairProofs } = require('../../scripts/lib/system/counterfactual_repair.js');
const { extractWorkloadDna } = require('../../scripts/lib/conflict/workload_dna.js');

function _makeTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test('SI-01 [1/10]: benchmark scoring enforces false-positive detection on clean and fault BOQs', () => {
  const cleanBench = { id: 'CLEAN-1', name: 'Clean BOQ', expectedViolations: [] };

  const cleanWithDep = scoreBenchmarkScenario(cleanBench, {
    errors: [],
    warnings: [],
    missingDependencies: [{ key: 'HIGH_PERF_FAN_KIT', sku: 'P48820-B21' }],
    confidence: { score: 0.9 }
  });
  assert.equal(cleanWithDep.passed, false);
  assert.equal(cleanWithDep.falsePositives, 1);
  assert.deepEqual(cleanWithDep.unexpectedViolations, ['HIGH_PERF_FAN_KIT']);

  const cleanWithError = scoreBenchmarkScenario(cleanBench, {
    errors: ['Unexpected drive cage conflict'],
    warnings: [],
    missingDependencies: [],
    confidence: { score: 0.9 }
  });
  assert.equal(cleanWithError.passed, false);
  assert.equal(cleanWithError.falsePositives, 1);
  assert.deepEqual(cleanWithError.unexpectedErrors, ['Unexpected drive cage conflict']);

  const faultBench = { id: 'FAULT-1', name: 'Fault BOQ', expectedViolations: ['HIGH_PERF_FAN_KIT'] };
  const faultWithExtra = scoreBenchmarkScenario(faultBench, {
    errors: [
      'High-TDP processor (>185W) requires High-Performance Fan Kit',
      'Unexpected PCIe riser shortage'
    ],
    warnings: [],
    missingDependencies: [
      { key: 'HIGH_PERF_FAN_KIT', sku: 'P48820-B21' },
      { key: 'CE_MARK_REMOVAL_KIT', sku: 'P35876-B21' }
    ],
    confidence: { score: 0.6 }
  });
  assert.equal(faultWithExtra.passed, false);
  assert.equal(faultWithExtra.truePositives, 1);
  assert.equal(faultWithExtra.falsePositives, 2);
});

test('SI-01 [2/10]: computeBenchmarkMetrics returns null instead of 100 on zero denominators', () => {
  const cleanOnly = scoreBenchmarkScenario(
    { id: 'CLEAN-0', name: 'Zero violation clean BOQ', expectedViolations: [] },
    { errors: [], warnings: [], missingDependencies: [], confidence: null }
  );
  assert.equal(cleanOnly.passed, true);
  assert.equal(cleanOnly.confidenceScore, null);

  const metrics = computeBenchmarkMetrics([cleanOnly]);
  assert.equal(metrics.precision, null);
  assert.equal(metrics.recall, null);
  assert.equal(metrics.accuracy, 100);
  assert.equal(metrics.schemaVersion, BENCHMARK_REPORT_SCHEMA_VERSION);
});

test('SI-01 [3/10]: scoreBenchmarkScenario rejects invalid eval structure and keeps missing confidence null', () => {
  const missingConf = scoreBenchmarkScenario(
    { id: 'B-NULL-CONF', name: 'Missing conf', expectedViolations: [] },
    { errors: [], warnings: [], missingDependencies: [] },
    { rankedSolutions: [{ rank: 1, physicalMathClean: true }, { rank: 2, physicalMathClean: false }] }
  );
  assert.equal(missingConf.passed, true);
  assert.equal(missingConf.confidenceScore, null);
  assert.equal(missingConf.ranksGenerated, 2);
  assert.equal(missingConf.validatedTiersCount, 1);

  const invalid = scoreBenchmarkScenario(
    { id: 'B-INVALID', name: 'Invalid result', expectedViolations: ['DC_LUG_KIT'] },
    { errors: null, warnings: [] }
  );
  assert.equal(invalid.passed, false);
  assert.equal(invalid.invalidResult, true);
  assert.equal(invalid.confidenceScore, null);
  assert.equal(invalid.falseNegatives, 1);
});

test('SI-01 [4/10]: runBenchmarkSuite isolates temp CSVs, gates saves, and reads v2/legacy v1 reports', async () => {
  const fixturesDir = path.resolve(__dirname, '../fixtures');
  const fixtureSnapshotBefore = fs.readdirSync(fixturesDir).filter(f => f.startsWith('BENCH-'));
  const defaultMtimeBefore = fs.existsSync(DEFAULT_REPORT_PATH) ? fs.statSync(DEFAULT_REPORT_PATH).mtimeMs : null;

  const tempDir = _makeTempDir('si01-bench-save-');
  try {
    const customReportPath = path.join(tempDir, 'bench_v2.json');
    let observedTempCsvPath = null;

    const unsaved = await runBenchmarkSuite({
      quiet: true,
      save: false,
      recordTelemetry: false,
      scenarios: [{
        id: 'SI01-ISOLATED-PROBE',
        name: 'Isolated probe',
        boqContent: 'Product #,Description,Qty\nP73282-B21,Server,1',
        expectedViolations: []
      }],
      evaluateFn: async (filePath) => {
        observedTempCsvPath = filePath;
        return { items: [], chassisInfo: {}, errors: [], warnings: [], missingDependencies: [] };
      },
      graphFn: async () => ({ rankedSolutions: [{ rank: 1, physicalMathClean: true }] })
    });

    assert.ok(observedTempCsvPath && !observedTempCsvPath.startsWith(fixturesDir), 'Benchmark CSV must run in OS temp dir');
    assert.equal(fs.existsSync(observedTempCsvPath), false, 'Temp CSV must be removed after suite');
    assert.equal(unsaved.passedScenarios, 1);
    assert.equal(unsaved.precision, null);
    assert.equal(unsaved.recall, null);

    const fixtureSnapshotAfter = fs.readdirSync(fixturesDir).filter(f => f.startsWith('BENCH-'));
    assert.deepEqual(fixtureSnapshotAfter, fixtureSnapshotBefore);
    const defaultMtimeAfter = fs.existsSync(DEFAULT_REPORT_PATH) ? fs.statSync(DEFAULT_REPORT_PATH).mtimeMs : null;
    assert.equal(defaultMtimeAfter, defaultMtimeBefore, 'Default report path must stay untouched when save=false');

    await runBenchmarkSuite({
      quiet: true,
      save: true,
      reportPath: customReportPath,
      scenarios: [{
        id: 'SI01-SAVE-V2',
        name: 'Atomic v2 save',
        boqContent: 'Product #,Description,Qty\nP73282-B21,Server,1',
        expectedViolations: ['HIGH_PERF_FAN_KIT']
      }],
      evaluateFn: async () => ({
        items: [],
        chassisInfo: {},
        errors: [],
        warnings: [],
        missingDependencies: [{ key: 'HIGH_PERF_FAN_KIT', sku: 'P48820-B21' }]
      }),
      graphFn: async () => ({ rankedSolutions: [{ rank: 1, physicalMathClean: true }] })
    });

    const v2Report = readBenchmarkReport(customReportPath);
    assert.equal(v2Report.schemaVersion, 2);
    assert.equal(v2Report.isLegacySchema, false);
    assert.equal(v2Report.precision, 100);
    assert.equal(v2Report.recall, 100);
    assert.equal(v2Report.results[0].confidenceScore, null);

    const legacyV1Path = path.join(tempDir, 'bench_v1.json');
    fs.writeFileSync(legacyV1Path, JSON.stringify({
      timestamp: '2026-11-16T20:32:35.151Z',
      accuracy: 100,
      passedScenarios: 1,
      totalScenarios: 1,
      results: [{ id: 'LEGACY-1', passed: true }]
    }), 'utf-8');
    const v1Report = readBenchmarkReport(legacyV1Path);
    assert.equal(v1Report.schemaVersion, 1);
    assert.equal(v1Report.isLegacySchema, true);
    assert.equal(v1Report.precision, null);
    assert.equal(v1Report.results[0].confidenceScore, null);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('SI-01 [5/10]: reasoning_post_analyzer blocks Tier 2 spoofing and emits UNKNOWN instead of defaults', () => {
  const bareCount = determineEpistemicTier({ notebookLmStatus: { isCloudGrounded: true, citationsCount: 5 } });
  assert.notEqual(bareCount.tier, 'TIER_2_DOCUMENT_CITATION');

  const detachedFalseCandidate = determineEpistemicTier({
    conflictGraph: { recommendedSolutions: [{ rank: 1 }] },
    ephemeralSourceValidation: {
      success: true,
      isCloudGrounded: true,
      sourceDetached: false,
      doubleCheckVerdict: 'DOUBLE_CHECK_PASSED',
      citations: [{ sourceId: 's1', title: 'QuickSpecs' }],
      authoritativeSourceIds: ['s1']
    }
  });
  assert.notEqual(detachedFalseCandidate.tier, 'TIER_2_DOCUMENT_CITATION');

  const authenticQa = determineEpistemicTier({
    notebookLmStatus: {
      isCloudGrounded: true,
      citations: [{ sourceId: 'qs-dl380', title: 'HPE DL380 Gen12 QuickSpecs' }]
    }
  }, { intent: 'FREEFORM_QA' });
  assert.equal(authenticQa.tier, 'TIER_2_DOCUMENT_CITATION');

  const proofs = _deriveStep3MathematicalProofs({
    power: { estimatedNodeWattage: 900, maxPsuWattage: 1600 },
    memory: { cpuCount: 2, memoryCount: 8 },
    pcie: { requiredPcieCards: 5, activeSlotsAvailable: 4 },
    compute: { maxCpuTdpWatts: 270 }
  });
  assert.ok(proofs.some(p => p.includes('required wattage with headroom: UNKNOWN')));
  assert.ok(proofs.some(p => p.includes('interleaving balance: UNKNOWN')));
  assert.ok(proofs.some(p => p.includes('scoped chassis PCIe rule verification')) && !proofs.some(p => p.includes('Missing Primary Riser Cable Kit')));

  const unknownSocketProof = _deriveStep3MathematicalProofs({
    compute: { maxCpuTdpWatts: 270 }
  });
  assert.ok(unknownSocketProof.some(p => p.includes('UNKNOWN reported socket(s)')));

  const analysis = performReasoningPostAnalysis({
    queryText: 'Evaluate server topology',
    context: { persistLedger: false },
    classification: { intent: 'BOQ_EVALUATION' },
    responseData: { status: 'PASSED', aspectChecksCompleted: true, errors: [] }
  });
  assert.equal(analysis.contextClassification.formFactor, 'UNKNOWN');
  assert.equal(analysis.confidence, null);
  assert.ok(analysis.reasoningNarrative.some(line => line.includes('UNASSESSED')));
});

test('SI-01 [6/10]: dashboard exportEligibility & workflowEvidence enforce complete document review fields', async () => {
  const eligibilityMod = await import(pathToFileURL(path.resolve(__dirname, '../../dashboard/src/services/exportEligibility.js')).href);
  const evidenceMod = await import(pathToFileURL(path.resolve(__dirname, '../../dashboard/src/services/workflowEvidence.js')).href);

  const partialReview = { success: true };
  assert.equal(eligibilityMod.isVerifiedCandidateDocumentReview(partialReview), false);

  const mockReview = {
    success: true,
    isCloudGrounded: true,
    sourceDetached: true,
    doubleCheckVerdict: 'DOUBLE_CHECK_PASSED',
    citations: [{ sourceId: 'qs-1', title: 'QuickSpecs' }],
    authoritativeSourceIds: ['qs-1'],
    attachment: { isMock: true }
  };
  assert.equal(eligibilityMod.isVerifiedCandidateDocumentReview(mockReview), false);

  const verifiedReview = {
    success: true,
    isCloudGrounded: true,
    sourceDetached: true,
    doubleCheckVerdict: 'DOUBLE_CHECK_PASSED',
    citations: [{ sourceId: 'qs-1', title: 'QuickSpecs' }],
    authoritativeSourceIds: ['qs-1']
  };
  assert.equal(eligibilityMod.isVerifiedCandidateDocumentReview(verifiedReview), true);

  const partialStates = eligibilityMod.deriveEvidenceStates({ ephemeralSourceValidation: partialReview });
  assert.equal(partialStates.candidateDocumentReview, 'INCOMPLETE_EVIDENCE');
  assert.equal(evidenceMod.deriveEvidenceStatus('POST_VERIFICATION', { isTaskRunning: false, evalResults: { ephemeralSourceValidation: partialReview } }), 'WARNING');
  assert.equal(evidenceMod.deriveEvidenceMetrics('POST_VERIFICATION', { evalResults: { ephemeralSourceValidation: partialReview } })['Candidate review'], 'Incomplete');

  const verifiedStates = eligibilityMod.deriveEvidenceStates({ ephemeralSourceValidation: verifiedReview });
  assert.equal(verifiedStates.candidateDocumentReview, 'DOUBLE_CHECK_PASSED');
  assert.equal(evidenceMod.deriveEvidenceStatus('POST_VERIFICATION', { isTaskRunning: false, evalResults: { ephemeralSourceValidation: verifiedReview } }), 'COMPLETED');
  assert.equal(evidenceMod.deriveEvidenceMetrics('POST_VERIFICATION', { evalResults: { ephemeralSourceValidation: verifiedReview } })['Candidate review'], 'Verified');
});

test('SI-01 [7/10]: decision_trace avoids empty buildability claim and preserves null vs zero deltas', () => {
  const ledger = createDecisionTraceLedger('SI01-TRACE');
  assert.equal(/100%\s*buildable/i.test(ledger.toMarkdownSummary()), false);

  const entry = ledger.recordDecision({
    decisionPoint: 'KEEP_BASELINE',
    trigger: 'Zero cost option test',
    alternativesEvaluated: [
      { id: 'A', description: 'Unpriced' },
      { id: 'B', description: 'Confirmed zero', capExDeltaUsd: 0 }
    ],
    selectedAlternative: { id: 'B', description: 'Confirmed zero', capExDeltaUsd: 0 },
    confidence: 0
  });
  assert.equal(entry.alternativesEvaluated[0].capExDeltaUsd, null);
  assert.equal(entry.alternativesEvaluated[1].capExDeltaUsd, 0);
  assert.equal(entry.selectedAlternative.capExDeltaUsd, 0);
  assert.equal(entry.selectedAlternative.selectionRationale, null);
  assert.equal(entry.confidence, 0);
});

test('SI-01 [8/10]: eval_output_serializer avoids false receipt status, $0 totals, PASS defaults, and guessed DNA', () => {
  const md = generateMarkdownReport({
    inputFile: 'test.csv',
    catalogData: { metadata: { chassis: 'DL380 Gen12' } },
    evalResults: {
      portalValidationStatus: 'ACCEPTED_BY_VENDOR',
      items: [],
      cpuCount: 2
    },
    graph: {
      recommendedSolutions: [{
        rank: 1,
        name: 'Incomplete Candidate',
        pricingComplete: false,
        knownOrderSubtotalUsd: 1200
      }, {
        rank: 2,
        name: 'Unpriced Candidate',
        pricingComplete: false
      }]
    },
    budgetOpt: null,
    targetBudgetUsd: 0,
    ragAnswer: 'Local only'
  });

  assert.ok(md.includes('PORTAL VALIDATION PENDING.'), 'Unverified string status must not claim vendor verification');
  assert.ok(md.includes('High-Perf Fans: ❓ Unknown'), 'Missing boolean checks must render Unknown, not Present');
  assert.ok(md.includes('UNCLASSIFIED'), 'Missing workload DNA must render UNCLASSIFIED');
  assert.ok(md.includes('INCOMPLETE (Subtotal: $1,200)'), 'Partial pricing must render explicit incomplete subtotal');
  assert.ok(md.includes('| **Rank 2** | Unpriced Candidate | `N/A` | INCOMPLETE |'), 'Missing pricing must not render $0');
});

test('SI-01 [9/10]: counterfactual_repair discloses assumed power headroom and refuses unrequested support SLA fabrication', () => {
  const catalog = {
    metadata: { model: 'DL380_Gen12' },
    entries: [
      { parentCategory: 'Power Supplies', skus: [{ sku: 'P38997-B21', Description: '1600W Power Supply' }] },
      { parentCategory: 'Services', skus: [{ sku: 'HU4B1A3', Description: '3 Year Tech Care Basic' }] }
    ]
  };

  const assumedPower = generateCounterfactualRepairProofs({
    chassis: 'DL380_Gen12',
    catalogData: catalog,
    evalSummary: {
      power: { hasZeroPsus: true, estimatedNodeWattage: 850 },
      support: { hasSupportService: false }
    }
  });
  const powerAssumedProof = assumedPower.find(p => p.issueType === 'POWER_PSU_MISSING');
  assert.equal(powerAssumedProof.headroomAssumed, true);
  assert.equal(powerAssumedProof.headroomPolicy, 'ASSUMED_20_PCT_FALLBACK');
  assert.ok(powerAssumedProof.mathematicalProof.includes('assuming 20% headroom'));

  const unspecSupportProof = assumedPower.find(p => p.issueType === 'SUPPORT_SERVICE_MISSING');
  assert.equal(unspecSupportProof.resultingStatus, 'ACTION_REQUIRED');
  assert.deepEqual(unspecSupportProof.requiredHardwareDeltas, []);

  const explicitPower = generateCounterfactualRepairProofs({
    chassis: 'DL380_Gen12',
    catalogData: catalog,
    evalSummary: {
      power: { hasZeroPsus: true, requiredWattageWithHeadroom: 1100, headroomPolicy: 'OEM_10_PCT' },
      support: { hasSupportService: false }
    }
  }, { customerRequirements: { supportLevel: 'Basic' } });
  assert.equal(explicitPower[0].headroomAssumed, false);
  assert.equal(explicitPower[0].headroomPolicy, 'OEM_10_PCT');
  assert.equal(explicitPower[1].assumedTermYears, 3);
  assert.equal(explicitPower[1].assumedServiceLevel, undefined);
});

test('SI-01 [10/10]: workload_dna avoids silent 8-channel assumption on unknown CPUs and tracks GPU/storage bases', () => {
  const unknownDna = extractWorkloadDna([
    { sku: 'CUSTOM-CPU', quantity: 2, description: 'Custom 32-core Processor' },
    { sku: 'CUSTOM-MEM', quantity: 8, description: '32GB DDR5 Smart Memory' },
    { sku: 'CUSTOM-GPU', quantity: 1, description: 'NVIDIA L40S 48GB PCIe Accelerator' },
    { sku: 'CUSTOM-SSD', quantity: 2, description: '1.92TB NVMe SSD' }
  ]);
  assert.equal(unknownDna.numaTopology.channelWidth, null);
  assert.equal(unknownDna.numaTopology.interleavingMode, 'UNKNOWN_CHANNEL_WIDTH');
  assert.equal(unknownDna.gpuPowerBasis, 'HEURISTIC_ESTIMATE');
  assert.equal(unknownDna.storageWorkload, 'UNKNOWN');

  const knownDna = extractWorkloadDna([
    { sku: 'P49610-B21', quantity: 2, description: 'Intel Xeon Gold 6430 32-core Processor' },
    { sku: 'P64707-B21', quantity: 16, description: 'HPE 32GB DDR5 Smart Memory' },
    { sku: 'S0000A', quantity: 1, description: 'NVIDIA L4 24GB 72W PCIe Accelerator' }
  ]);
  assert.equal(knownDna.numaTopology.channelWidth, 8);
  assert.equal(knownDna.numaTopology.interleavingMode, '1DPC_BALANCED_OPTIMAL');
  assert.equal(knownDna.gpuPowerBasis, 'PARSED_DESCRIPTION');
  assert.equal(knownDna.storageWorkload, 'NONE');
  assert.equal(knownDna.storageType, 'NONE');
});
