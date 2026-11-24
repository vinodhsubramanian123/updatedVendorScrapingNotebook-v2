'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  loadTelemetry,
  recordEvaluationTelemetry,
  recordFeedbackTelemetry,
  recordRoutedQueryTelemetry,
  getTelemetrySummary
} = require('../../scripts/lib/system/telemetry.js');
const {
  CANONICAL_EXECUTION_PHASES,
  mapStageTimingsToCanonicalPhases
} = require('../../scripts/lib/contracts/workflow_contract.js');
const { executeRoutedQuery } = require('../../scripts/evaluators/route_query.js');

const REPO_TELEMETRY = path.resolve(__dirname, '../../outputs/history/pipeline_telemetry.json');

describe('Telemetry Epistemic Honesty & Canonical 9-Phase Mapping (INV-278)', () => {
  it('1) preserves null/UNSPECIFIED_PLATFORM when confidence, rules, chassis, and stage timings are unmeasured', t => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telem-honest-1-'));
    t.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));
    const telemetryFile = path.join(tmpDir, 'telemetry.json');

    const entry = recordEvaluationTelemetry({}, '', null, { telemetryFile });
    assert.equal(entry.confidenceScore, null);
    assert.equal(entry.isHitlTriggered, null);
    assert.equal(entry.chassisModel, 'UNSPECIFIED_PLATFORM');
    assert.equal(entry.graphRulesEvaluated, null);
    assert.equal(entry.stageTimingsMeasured, false);
    assert.equal(entry.durationMs, null);
    for (const v of Object.values(entry.stageBreakdown)) assert.equal(v, null);
    for (const phase of CANONICAL_EXECUTION_PHASES) {
      assert.equal(entry.phaseDurationsMs[phase.key], null);
    }
  });

  it('2) returns null summary averages/latencies on empty or unscored stores and exact p50/p95 + learning stats when observed', t => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telem-honest-2-'));
    t.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));
    const telemetryFile = path.join(tmpDir, 'telemetry.json');

    const emptySummary = getTelemetrySummary({ telemetryFile });
    assert.equal(emptySummary.avgConfidenceScore, null);
    assert.equal(emptySummary.evalAccuracyScore, null);
    assert.equal(emptySummary.p50DurationMs, null);
    assert.equal(emptySummary.p95DurationMs, null);
    assert.equal(emptySummary.ragFallbackRatio, null);

    recordEvaluationTelemetry({
      confidence: { score: 0.9 },
      conflictGraph: { chassisInfo: { model: 'DL380 Gen12' }, totalRulesEvaluated: 42, isWholeSolutionValid: true },
      stageBreakdown: { stage1ParsingMs: 12, stage2AspectMathMs: 30, stage3RAGConsultationMs: 50, stage4GeminiVerificationMs: 25, stage5ResolutionMatrixMs: 8 },
      evidenceLedger: {
        activeRulesReached: [{ ruleId: 'R1' }, { ruleId: 'R2' }],
        skuAuditLedger: [{ sku: 'P48820-B21', action: 'INJECTED_MANDATORY_FIX' }]
      }
    }, 'sample_a.xlsx', 100, { telemetryFile });

    recordEvaluationTelemetry({
      confidence: { score: 0.7 },
      conflictGraph: { chassisInfo: { model: 'DL360 Gen12' }, totalRulesEvaluated: 20, isWholeSolutionValid: false }
    }, 'sample_b.xlsx', 500, { telemetryFile });

    recordEvaluationTelemetry({}, 'sample_c.xlsx', 1000, { telemetryFile });
    recordFeedbackTelemetry({ deltaId: 'DELTA-1', chassis: 'DL380_Gen12', governanceStatus: 'ACTIVE', ruleUpdate: 'Active rule' }, { telemetryFile });

    const summary = getTelemetrySummary({ telemetryFile });
    assert.equal(summary.evaluationsCount, 3);
    assert.equal(summary.avgConfidenceScore, 0.8);
    assert.equal(summary.evalAccuracyScore, 50);
    assert.equal(summary.p50DurationMs, 500);
    assert.equal(summary.p95DurationMs, 1000);
    assert.equal(summary.learningEffectiveness.activeRulesReachedCount, 2);
    assert.equal(summary.learningEffectiveness.appliedRulesCount, 1);
    assert.equal(summary.learningEffectiveness.proposedDeltasCount, 1);
    assert.equal(summary.learningEffectiveness.promotedDeltasCount, 1);

    const mapped = mapStageTimingsToCanonicalPhases({ stage1ParsingMs: 12, stage2AspectMathMs: 30 });
    assert.equal(mapped.phase_1, 12);
    assert.equal(mapped.phase_3, 30);
    assert.equal(mapped.phase_2, null);
    assert.equal(mapped.phase_7, null);
  });

  it('3) records routed queries and keeps repo production telemetry untouched under NODE_TEST_CONTEXT / test env', async t => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telem-honest-3-'));
    t.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));
    const telemetryFile = path.join(tmpDir, 'routed_telemetry.json');

    const beforeBytes = fs.existsSync(REPO_TELEMETRY) ? fs.readFileSync(REPO_TELEMETRY) : null;
    await executeRoutedQuery('Compare DL380 Gen11 vs DL380 Gen12 for virtualization', {
      offline: true,
      persistLedger: false,
      telemetryFile
    });

    const routedStore = loadTelemetry({ telemetryFile });
    assert.equal(routedStore.totalRoutedQueries, 1);
    assert.equal(routedStore.routedQueries.length, 1);
    assert.ok(routedStore.routedQueries[0].traceId);

    recordRoutedQueryTelemetry({
      traceId: 'TRC-MANUAL-ROUTE',
      classification: { intent: 'FREEFORM_QA', skillTarget: 'presales-query-router' },
      resolvedPlatform: null,
      classificationConfidence: null,
      executionTimeMs: 14
    });

    const afterBytes = fs.existsSync(REPO_TELEMETRY) ? fs.readFileSync(REPO_TELEMETRY) : null;
    if (beforeBytes !== null) {
      assert.deepEqual(afterBytes, beforeBytes, 'Test runs must never mutate repo outputs/history/pipeline_telemetry.json');
    }
  });

  it('4) concurrent locked telemetry updates preserve every recorded run', t => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telem-honest-4-'));
    t.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));
    const telemetryFile = path.join(tmpDir, 'concurrent.json');

    for (let i = 0; i < 8; i++) {
      recordEvaluationTelemetry({ confidence: { score: 0.9 } }, `boq_${i}.xlsx`, 50 + i, { telemetryFile });
    }
    const loaded = loadTelemetry({ telemetryFile });
    assert.equal(loaded.evaluationsCount, 8);
    assert.equal(loaded.history.length, 8);
  });
});
