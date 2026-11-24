'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  SCENARIO_SCHEMA_VERSION,
  REQUIRED_DIMENSIONS,
  SCENARIO_FAMILIES,
  SCENARIO_CASES
} = require('../fixtures/solution_intelligence/scenario_families.js');
const {
  SCHEMA_VERSION,
  DEFAULT_RECEIPT_PATH,
  evaluateScenario,
  evaluateAllScenarios,
  computeQualityMetrics,
  runSolutionIntelligenceQualityEvaluation
} = require('../../scripts/maintenance/evaluate_solution_intelligence_quality.js');

describe('SI-10 Solution Intelligence Quality Evaluation (Dev & Held-Out)', () => {
  it('1) declares >= 24 scenario families across all 5 dimensions with balanced dev/held_out splits', () => {
    assert.equal(SCENARIO_SCHEMA_VERSION, '1.0');
    assert.ok(SCENARIO_FAMILIES.length >= 24, `Expected >= 24 families, got ${SCENARIO_FAMILIES.length}`);

    const dimsPresent = new Set(SCENARIO_FAMILIES.map(f => f.dimension));
    for (const dim of REQUIRED_DIMENSIONS) {
      assert.ok(dimsPresent.has(dim), `Missing required matrix dimension: ${dim}`);
    }

    const devCases = SCENARIO_CASES.filter(c => c.split === 'dev');
    const heldOutCases = SCENARIO_CASES.filter(c => c.split === 'held_out');
    assert.ok(devCases.length >= 24);
    assert.ok(heldOutCases.length >= 24);
    assert.equal(SCENARIO_CASES.length, devCases.length + heldOutCases.length);

    for (const c of SCENARIO_CASES) {
      assert.ok(['synthetic', 'anonymized_customer_derived'].includes(c.origin), `${c.id} invalid origin`);
      assert.equal(c.environment, 'offline', `${c.id} must be tagged offline`);
      assert.equal(c.adjudicationSource, 'INDEPENDENT_RULE_ADJUDICATION', `${c.id} must be independently adjudicated`);
    }
  });

  it('2) executes all 48 dev + held-out scenarios with zero false acceptances or regressions', async () => {
    const report = await evaluateAllScenarios();
    assert.equal(report.schemaVersion, SCHEMA_VERSION);
    assert.equal(report.liveQualificationStatus, 'NOT_RUN_OFFLINE_CERTIFICATION_ONLY');

    assert.equal(report.overall.totalCases, 56);
    assert.equal(report.overall.failedCases, 0, JSON.stringify(report.results.filter(r => !r.passed), null, 2));
    assert.equal(report.overall.passedCases, 56);
    assert.equal(report.splits.dev.passedCases, 28);
    assert.equal(report.splits.held_out.passedCases, 28);

    assert.equal(report.overall.falseAcceptance.count, 0);
    assert.equal(report.overall.materialClaimSupport.unsupportedPositiveAcceptances, 0);
    assert.equal(report.overall.repairRegression.regressions, 0);
    assert.equal(report.overall.requirementDispositionCoverage.rate, 1);
    assert.equal(report.overall.hardRequirementPreservation.rate, 1);
    assert.equal(report.overall.rankingQuality.permutationDeterminismRate, 1);
    assert.equal(report.overall.recoveryLearning.retractionInvalidationAccuracy, 1);
    assert.equal(report.overall.constraintPrecisionRecall.precision, 1);
    assert.equal(report.overall.constraintPrecisionRecall.recall, 1);
    assert.equal(report.overall.releaseGate.passed, true);
  });

  it('3) returns null (never 1.0 or 100%) on every zero-denominator metric', () => {
    const empty = computeQualityMetrics([]);
    assert.equal(empty.totalCases, 0);
    assert.equal(empty.passRate, null);
    assert.equal(empty.requirementDispositionCoverage.rate, null);
    assert.equal(empty.hardRequirementPreservation.rate, null);
    assert.equal(empty.materialClaimSupport.supportedRate, null);
    assert.equal(empty.constraintPrecisionRecall.precision, null);
    assert.equal(empty.constraintPrecisionRecall.recall, null);
    assert.equal(empty.falseAcceptance.rate, null);
    assert.equal(empty.rankingQuality.pairwisePreferenceAccuracy, null);
    assert.equal(empty.rankingQuality.permutationDeterminismRate, null);
    assert.equal(empty.recoveryLearning.terminalRecoveryAccuracy, null);
    assert.equal(empty.recoveryLearning.retractionInvalidationAccuracy, null);
    assert.equal(empty.latencyResource.medianMs, null);
    assert.equal(empty.latencyResource.p95Ms, null);
    assert.equal(empty.releaseGate.passed, false);
    assert.equal(empty.releaseGate.reason, 'ZERO_SCENARIOS_EVALUATED');
  });

  it('4) rejects adversarial negative counterexamples and unknown evaluator kinds cleanly', async () => {
    const badKind = await evaluateScenario({
      id: 'NEG-UNKNOWN-KIND',
      familyId: 'NEG',
      dimension: 'EVIDENCE',
      split: 'held_out',
      evaluatorKind: 'NON_EXISTENT_KIND',
      criticalSafetyGate: true
    });
    assert.equal(badKind.passed, false);
    assert.match(badKind.error, /UNKNOWN_EVALUATOR_KIND/);

    const falseExpectedReport = await evaluateAllScenarios([{
      id: 'NEG-CLAIM-MISMATCH',
      familyId: 'NEG',
      dimension: 'EVIDENCE',
      split: 'held_out',
      origin: 'synthetic',
      environment: 'offline',
      adjudicationSource: 'INDEPENDENT_RULE_ADJUDICATION',
      evaluatorKind: 'CLAIM_ADJUDICATION',
      criticalSafetyGate: true,
      title: 'Wrong-generation evidence cannot satisfy SUPPORTED expectation',
      input: {
        product: 'DL380_Gen12',
        generation: 'Gen12',
        claim: { assertion: 'Claim', materiality: 'MATERIAL', scope: { product: 'DL380_Gen12', generation: 'Gen12' } },
        evidence: [{ kind: 'CATALOG', sourceId: 'cat-g11', scope: { product: 'DL380_Gen11', generation: 'Gen11' }, passageText: 'Gen11', contentSha256: 'sha' }]
      },
      expected: { overallStatus: 'SUPPORTED', blocksPositive: false, bomVerifierBlocked: true }
    }]);
    assert.equal(falseExpectedReport.overall.failedCases, 1);
    assert.equal(falseExpectedReport.overall.releaseGate.passed, false);
  });

  it('5) writes atomic versioned receipt only to explicit savePath without touching default path when save=false', async () => {
    const beforeMtime = fs.existsSync(DEFAULT_RECEIPT_PATH) ? fs.statSync(DEFAULT_RECEIPT_PATH).mtimeMs : null;
    const unsaved = await runSolutionIntelligenceQualityEvaluation({ save: false });
    assert.equal(unsaved.overall.releaseGate.passed, true);
    const afterUnsavedMtime = fs.existsSync(DEFAULT_RECEIPT_PATH) ? fs.statSync(DEFAULT_RECEIPT_PATH).mtimeMs : null;
    assert.equal(afterUnsavedMtime, beforeMtime);

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'si10-receipt-'));
    try {
      const target = path.join(tmpDir, 'si10_receipt.json');
      const saved = await runSolutionIntelligenceQualityEvaluation({ savePath: target });
      assert.equal(saved.workPackage, 'SI-10');
      assert.ok(fs.existsSync(target));
      const disk = JSON.parse(fs.readFileSync(target, 'utf8'));
      assert.equal(disk.overall.passedCases, 56);
      assert.ok(/^[a-f0-9]{64}$/.test(disk.dependencyHashes.scenarioFamiliesSha256));
      assert.ok(/^[a-f0-9]{64}$/.test(disk.dependencyHashes.evaluatorSha256));
      assert.equal(disk.liveQualificationStatus, 'NOT_RUN_OFFLINE_CERTIFICATION_ONLY');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
