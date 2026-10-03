'use strict';

/**
 * tests/unit/test_m1_grounding_and_delivery_policy.js
 *
 * Milestone M1: Verifies affirmative grounding checks, effective source allowlist fail-closed,
 * canonical review envelope sensitivity, and lossless acceptance adapters.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

const { validateBoqEvaluationCriteria } = require('../../scripts/lib/boq/bom_verifier.js');
const { executeNotebookQuery } = require('../../scripts/lib/notebook/notebook_query_utils.js');
const { solutionFingerprint } = require('../../scripts/lib/boq/solution_evidence.js');
const { adaptAcceptanceDecision, toStageResult, AcceptanceDecisionSchema } = require('../../scripts/lib/contracts/workflow_contract.js');

describe('Milestone M1: Grounding, Review Identity & Delivery Policy', () => {

  // ── 1. B13 Affirmative Evidence Tests ──
  describe('B13 Affirmative Grounding Gate', () => {
    it('evaluates B13 to ACTION_REQUIRED when grounding evidence is absent', () => {
      const output = {
        catalogCertified: true,
        items: [{ sku: 'P73282-B21', qty: 1 }],
        notebookHealth: null,
        solutionDoubleCheck: null
      };
      const checks = validateBoqEvaluationCriteria(output, {});
      const b13 = checks.find(c => c.id === 'B13');
      assert.ok(b13, 'B13 check must exist');
      assert.strictEqual(b13.status, 'ACTION_REQUIRED', 'Missing grounding evidence must evaluate to ACTION_REQUIRED');
      assert.strictEqual(b13.passed, false, 'Unproven grounding cannot pass');
    });

    it('evaluates B13 to FAILED when doubleCheckVerdict is DOUBLE_CHECK_REJECTED', () => {
      const output = {
        catalogCertified: true,
        items: [{ sku: 'P73282-B21', qty: 1 }],
        solutionDoubleCheck: {
          doubleCheckVerdict: 'DOUBLE_CHECK_REJECTED',
          success: false
        }
      };
      const checks = validateBoqEvaluationCriteria(output, {});
      const b13 = checks.find(c => c.id === 'B13');
      assert.ok(b13);
      assert.strictEqual(b13.status, 'FAILED', 'Explicit doubleCheck rejection must FAIL');
      assert.strictEqual(b13.passed, false);
    });

    it('does not approve prose-only cloud claims without a current native scoped review', () => {
      const output = {
        catalogCertified: true,
        items: [{ sku: 'P73282-B21', qty: 1 }],
        solutionDoubleCheck: {
          doubleCheckVerdict: 'DOUBLE_CHECK_APPROVED',
          success: true,
          isCloudGrounded: true,
          citations: ['QuickSpecs Page 12']
        }
      };
      const checks = validateBoqEvaluationCriteria(output, {});
      const b13 = checks.find(c => c.id === 'B13');
      assert.ok(b13);
      assert.strictEqual(b13.status, 'ACTION_REQUIRED', 'A claimed approval and source title do not prove grounding');
      assert.strictEqual(b13.passed, false);
    });
  });

  // ── 2. B1 Aspect Uniqueness Tests ──
  describe('B1 Aspect Uniqueness Check', () => {
    it('fails B1 when 7 aspect checks are provided but with duplicate identities', () => {
      const duplicateAspects = [
        { id: 'COMPUTE_THERMAL', status: 'PASS' },
        { id: 'COMPUTE_THERMAL', status: 'PASS' },
        { id: 'COMPUTE_THERMAL', status: 'PASS' },
        { id: 'COMPUTE_THERMAL', status: 'PASS' },
        { id: 'COMPUTE_THERMAL', status: 'PASS' },
        { id: 'COMPUTE_THERMAL', status: 'PASS' },
        { id: 'COMPUTE_THERMAL', status: 'PASS' }
      ];
      const output = { aspectChecks: duplicateAspects };
      const checks = validateBoqEvaluationCriteria(output, {});
      const b1 = checks.find(c => c.id === 'B1');
      assert.ok(b1);
      assert.strictEqual(b1.status, 'FAILED', 'Duplicate aspect checks must fail unique identity check');
      assert.ok(b1.detail.includes('distinct identities'));
    });
  });

  // ── 3. Source Selection & Query Fail-Closed ──
  describe('Notebook Query Source Allowlist & Fail-Closed', () => {
    it('fails closed to LOCAL_RAG_FALLBACK when no trusted sources are configured', async () => {
      const res = await executeNotebookQuery('00000000-0000-0000-0000-000000000000', 'Check PCIe slots', {
        context: { chassis: 'UnknownChassis_Gen99' }
      });
      assert.strictEqual(res.isCloudGrounded, false);
      assert.strictEqual(res.source, 'LOCAL_RAG_FALLBACK');
    });
  });

  // ── 4. Versioned Canonical Review Envelope (F03) ──
  describe('Canonical Review Envelope Sensitivity', () => {
    it('changes solutionFingerprint when selectors or base chassis are modified', () => {
      const evalBase = {
        chassis: 'DL380_Gen12',
        base: '8SFF_CTO',
        owner: 'PrimaryCompute',
        selectors: { ambientTemp: 25 },
        items: [{ sku: 'P73282-B21', qty: 1 }],
        conflictGraph: {
          recommendedSolutions: [{ rank: 1, skuPartsList: [{ sku: 'P73282-B21', qty: 1 }] }]
        },
        catalogData: { metadata: { fingerprint: 'cat-sha-1234' } }
      };

      const hash1 = solutionFingerprint(evalBase);

      // Mutate selectors
      const evalMutatedSelectors = {
        ...evalBase,
        selectors: { ambientTemp: 35 }
      };
      const hash2 = solutionFingerprint(evalMutatedSelectors);
      assert.notStrictEqual(hash1, hash2, 'Changing selectors must invalidate solutionFingerprint');

      // Mutate owner
      const evalMutatedOwner = {
        ...evalBase,
        owner: 'SecondaryStorage'
      };
      const hash3 = solutionFingerprint(evalMutatedOwner);
      assert.notStrictEqual(hash1, hash3, 'Changing owner must invalidate solutionFingerprint');

      // Mutate catalog fingerprint
      const evalMutatedCatalog = {
        ...evalBase,
        catalogData: { metadata: { fingerprint: 'cat-sha-9999' } }
      };
      const hash4 = solutionFingerprint(evalMutatedCatalog);
      assert.notStrictEqual(hash1, hash4, 'Changing catalog fingerprint must invalidate solutionFingerprint');
    });
  });

  // ── 5. Lossless Adapters ──
  describe('Lossless Acceptance & Stage Adapters', () => {
    it('adapts acceptance decision between isValid and isApproved losslessly', () => {
      const decisionFromVerifier = { isValid: true, track: 'BOQ_EVALUATION', blockersCount: 0 };
      const adapted = adaptAcceptanceDecision(decisionFromVerifier);
      assert.strictEqual(adapted.isApproved, true);
      assert.strictEqual(adapted.isValid, true);
      assert.strictEqual(adapted.status, 'PASSED');

      // Validates under AcceptanceDecisionSchema without stripping properties
      const parsed = AcceptanceDecisionSchema.parse(adapted);
      assert.strictEqual(parsed.isApproved, true);
      assert.strictEqual(parsed.track, 'BOQ_EVALUATION');
    });

    it('maps ledger phase statuses to StageResult representation correctly', () => {
      const stagePassed = toStageResult(3, { status: 'PASSED', phaseName: 'Physical Math', completedAt: '2026-10-03T12:00:00Z' });
      assert.strictEqual(stagePassed.executionState, 'COMPLETED');
      assert.strictEqual(stagePassed.outcome, 'PASSED');

      const stageSkipped = toStageResult(5, { status: 'SKIPPED', skipReason: 'No modernizations', policyCode: 'POLICY-NONE' });
      assert.strictEqual(stageSkipped.executionState, 'SKIPPED');
      assert.strictEqual(stageSkipped.skipReason, 'No modernizations');
      assert.strictEqual(stageSkipped.policyCode, 'POLICY-NONE');

      const stageAction = toStageResult(7, { status: 'ACTION_REQUIRED' });
      assert.strictEqual(stageAction.executionState, 'COMPLETED');
      assert.strictEqual(stageAction.outcome, 'ACTION_REQUIRED');
    });
  });
});
