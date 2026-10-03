'use strict';

/**
 * tests/unit/test_m4_lifecycle_and_ledger.js
 *
 * Milestone M4: Verifies 9-phase canonical lifecycle engine, DAG callback scheduling,
 * append-only candidate resolution attempts, and immutable phase amendments.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

const { LifecycleEngine, CANONICAL_BOQ_9_PHASES, CANONICAL_BOQ_PHASES } = require('../../scripts/lib/lifecycle/lifecycle_engine.js');
const { createEvidenceLedger } = require('../../scripts/lib/system/evidence_ledger.js');

describe('Milestone M4: Lifecycle & Append-Only Evidence', () => {

  // ── 1. 9-Phase Compatibility Manifest ──
  describe('Canonical 9-Phase Lifecycle Alignment', () => {
    it('verifies CANONICAL_BOQ_9_PHASES has exactly 9 phases in correct sequence', () => {
      assert.strictEqual(CANONICAL_BOQ_9_PHASES.length, 9, 'Must have exactly 9 canonical phases');
      assert.strictEqual(CANONICAL_BOQ_9_PHASES[0].id, 'INGESTION');
      assert.strictEqual(CANONICAL_BOQ_9_PHASES[1].id, 'FINGERPRINTING');
      assert.strictEqual(CANONICAL_BOQ_9_PHASES[2].id, 'DOMAIN_ASPECTS');
      assert.strictEqual(CANONICAL_BOQ_9_PHASES[3].id, 'CONFLICT_GRAPH');
      assert.strictEqual(CANONICAL_BOQ_9_PHASES[4].id, 'MODERNIZATION_LEAST_DELTA');
      assert.strictEqual(CANONICAL_BOQ_9_PHASES[5].id, 'STRATEGY_SYNTHESIS');
      assert.strictEqual(CANONICAL_BOQ_9_PHASES[6].id, 'RAG_GROUNDING');
      assert.strictEqual(CANONICAL_BOQ_9_PHASES[7].id, 'DELIVERABLES_FINALIZATION');
      assert.strictEqual(CANONICAL_BOQ_9_PHASES[8].id, 'REFLECTION_LEARNING');

      // Backward compatibility alias
      assert.strictEqual(CANONICAL_BOQ_PHASES, CANONICAL_BOQ_9_PHASES);
    });

    it('executes pipeline DAG callbacks according to topological dependencies', async () => {
      const engine = new LifecycleEngine('test_dag', [
        { id: 'PHASE_A', phaseNum: 1, mandatory: true, dependsOn: [] },
        { id: 'PHASE_B', phaseNum: 2, mandatory: true, dependsOn: ['PHASE_A'] },
        { id: 'PHASE_C', phaseNum: 3, mandatory: false, dependsOn: ['PHASE_B'] }
      ]);

      const executionOrder = [];
      const handlers = {
        PHASE_A: async () => { executionOrder.push('A'); return { status: 'PASSED' }; },
        PHASE_B: async () => { executionOrder.push('B'); return { status: 'PASSED' }; },
        PHASE_C: async () => { executionOrder.push('C'); return { status: 'SKIPPED', summary: { skipReason: 'Optional', policyCode: 'P-1' } }; }
      };

      const health = await engine.executePipelineDAG({}, handlers);
      assert.deepStrictEqual(executionOrder, ['A', 'B', 'C'], 'Phases must execute in exact dependency order');
      assert.strictEqual(health.healthy, true);
    });
  });

  // ── 2. Append-Only Evidence Ledger ──
  describe('Append-Only Candidate Attempts & Amendments', () => {
    it('records candidate attempts in append-only array and events trail', () => {
      const ledger = createEvidenceLedger({ traceId: 'trace-m4-cand' });
      const attempt1 = ledger.recordCandidateAttempt({ rank: 1, passed: true, costUsd: 15000 });
      assert.strictEqual(attempt1.attemptIndex, 1);
      assert.strictEqual(ledger.candidateAttempts.length, 1);

      const attempt2 = ledger.recordCandidateAttempt({ rank: 2, passed: true, costUsd: 18000 });
      assert.strictEqual(attempt2.attemptIndex, 2);
      assert.strictEqual(ledger.candidateAttempts.length, 2);

      const attemptEvents = ledger.events.filter(e => e.event === 'CANDIDATE_ATTEMPT');
      assert.strictEqual(attemptEvents.length, 2);
    });

    it('preserves terminal baseline evidence and appends a separate candidate resolution', () => {
      const ledger = createEvidenceLedger({ traceId: 'trace-m4-amend' });
      ledger.startPhase(3, '7-Aspect Physical Pre-Flight Math');
      ledger.completePhase(3, 'ACTION_REQUIRED', { missingThermalCooling: true });

      assert.strictEqual(ledger.phases.phase_3.status, 'ACTION_REQUIRED');
      assert.strictEqual(ledger.phases.phase_3.outputSummary.missingThermalCooling, true);

      assert.throws(() => ledger.completePhase(3, 'RESOLVED', { resolvedWithFanKit: true }), /immutable/i);
      ledger.recordPhaseResolution(3, { manifestSha256: 'a'.repeat(64), candidateGatePassed: true,
        documentReviewVerified: true, resolvedWithFanKit: true });
      assert.strictEqual(ledger.phases.phase_3.status, 'ACTION_REQUIRED');
      assert.strictEqual(ledger.phases.phase_3.outputSummary.missingThermalCooling, true);
      assert.strictEqual(ledger.phaseResolutions[0].status, 'RESOLVED');
      assert.strictEqual(ledger.events.filter(e => e.event === 'CANDIDATE_RESOLUTION').length, 1);
    });
  });
});
