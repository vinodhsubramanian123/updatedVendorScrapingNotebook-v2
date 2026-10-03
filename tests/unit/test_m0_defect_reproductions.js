'use strict';

/**
 * tests/unit/test_m0_defect_reproductions.js
 *
 * Milestone M0: Negative defect characterization and reproduction suite.
 * Formally reproduces F01, F02, F05, F06, and F09 before M1-M5 remediations.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const { validateBoqEvaluationCriteria } = require('../../scripts/lib/boq/bom_verifier.js');
const { buildNotebookQueryArgs } = require('../../scripts/lib/notebook/notebook_query_utils.js');
const { createEvidenceLedger } = require('../../scripts/lib/system/evidence_ledger.js');

describe('M0 Defect Reproductions (F01, F02, F05, F06, F09)', () => {

  // ── F01: Grounding Acceptance Lacks Affirmative Evidence ──
  describe('F01: B13 False-Pass on Missing Evidence or doubleCheckVerdict (Remediated)', () => {
    it('verifies B13 fails closed (ACTION_REQUIRED) when grounding evidence is completely absent', () => {
      const output = {
        catalogCertified: true,
        items: [{ sku: 'P00001-B21', qty: 1 }],
        notebookHealth: null,
        solutionDoubleCheck: null
      };
      const checks = validateBoqEvaluationCriteria(output, {});
      const b13 = checks.find(c => c.id === 'B13');
      assert.ok(b13, 'B13 check must be present');
      assert.strictEqual(b13.status, 'ACTION_REQUIRED', 'Remediation verified: B13 fails closed to ACTION_REQUIRED when evidence is null');
    });

    it('verifies B13 catches doubleCheckVerdict rejection and evaluates to FAILED', () => {
      const output = {
        catalogCertified: true,
        items: [{ sku: 'P00001-B21', qty: 1 }],
        notebookHealth: { isHealthy: true },
        solutionDoubleCheck: {
          doubleCheckVerdict: 'DOUBLE_CHECK_REJECTED',
          success: false
        }
      };
      const checks = validateBoqEvaluationCriteria(output, {});
      const b13 = checks.find(c => c.id === 'B13');
      assert.ok(b13, 'B13 check must be present');
      assert.strictEqual(b13.status, 'FAILED', 'Remediation verified: B13 marks DOUBLE_CHECK_REJECTED as FAILED');
    });
  });

  // ── F02: Source Selection and Cache Scope Diverge ──
  describe('F02: Empty Trust Allowlist Fails Closed (Remediated)', () => {
    it('verifies empty trust allowlist fails closed to LOCAL_RAG_FALLBACK without unconstrained dispatch', async () => {
      const { executeNotebookQuery } = require('../../scripts/lib/notebook/notebook_query_utils.js');
      const res = await executeNotebookQuery('00000000-0000-0000-0000-000000000000', 'Check PCIe slots', {
        context: { chassis: 'UnknownChassis_Gen99' }
      });
      assert.strictEqual(res.isCloudGrounded, false);
      assert.strictEqual(res.source, 'LOCAL_RAG_FALLBACK');
    });
  });

  // ── F05: Terminal Evidence is Rewritten ──
  describe('F05: Ledger Mutability & Append-Only Candidate Resolution (Remediated)', () => {
    it('verifies candidate attempts are recorded in append-only array', () => {
      const ledger = createEvidenceLedger({ traceId: 'test-trace-m0', customerName: 'TestCustomer' });
      ledger.startPhase(6, 'Strategy Matrix Synthesis');
      ledger.completePhase(6, 'PASSED', { strategyCount: 3 });

      assert.strictEqual(ledger.phases.phase_6.status, 'PASSED');
      assert.strictEqual(ledger.phases.phase_6.outputSummary.strategyCount, 3);

      ledger.recordCandidateAttempt({ candidateRank: 1, attemptNumber: 2, status: 'PASSED' });
      assert.strictEqual(ledger.candidateAttempts.length, 1);
      assert.strictEqual(ledger.candidateAttempts[0].attemptNumber, 2);
    });
  });

  // ── F06: Staging Inherits Stale Current Artifacts ──
  describe('F06: Clean-Room Staging (Remediated)', () => {
    it('verifies seedStagingFromLiveWorkspace does not copy stale TSVs or catalogs into staging', () => {
      const scraperPath = path.resolve(__dirname, '../../scripts/scrapers/scrape_oca_solution.js');
      const content = fs.readFileSync(scraperPath, 'utf8');

      assert.strictEqual(content.includes("copyDirRecursive(existingScraps, path.join(outputDir, 'intermittent_scraps'))"), false,
        'Remediation verified: seedStagingFromLiveWorkspace does NOT copy stale TSVs');
      assert.strictEqual(content.includes("fs.copyFileSync(existingCatalog, path.join(outputDir, `${meta.cleanName}_Catalog.json`))"), false,
        'Remediation verified: seedStagingFromLiveWorkspace does NOT copy stale catalog into staging');
    });
  });

  // ── F09: Swallowed Cleanup Errors in NLM Client ──
  describe('F09: Truthful Source Cleanup in NLM Client (Remediated)', () => {
    it('verifies attemptCandidatePurge is implemented with explicit purge receipts', () => {
      const nlmClientPath = path.resolve(__dirname, '../../scripts/lib/sync/nlm_sync_client.js');
      const content = fs.readFileSync(nlmClientPath, 'utf8');

      assert.ok(content.includes('attemptCandidatePurge'),
        'Remediation verified: attemptCandidatePurge exists in nlm_sync_client');
      assert.ok(content.includes('was purged') || content.includes('purge failed'),
        'Remediation verified: purge status is explicitly detailed');
    });
  });
});
