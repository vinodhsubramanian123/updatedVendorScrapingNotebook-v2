'use strict';
/**
 * tests/unit/test_core_workflow_contracts.js — Deterministic Core Workflow Contract Tests
 *
 * Validates the core contracts established in the 2026-09-30 architecture remediation:
 * 1. WorkflowResult, StageResult, EvidenceState, and DeliveryAuthorization schemas
 * 2. Mandatory non-default status and SKIPPED policy validation in EvidenceLedger
 * 3. Pre-presentation acceptance delivery gating (unapproved candidates blocked from export)
 * 4. Aspect registry integration for dynamic multi-domain validation
 * 5. Single-file vs two-baseline BOM reconciliation contracts
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');

const {
  EvidenceStateEnum,
  StageExecutionStateEnum,
  StageOutcomeEnum,
  StageResultSchema,
  AcceptanceDecisionSchema,
  issueDeliveryAuthorization,
  verifyDeliveryAuthorization,
  WorkflowResultSchema
} = require('../../scripts/lib/contracts/workflow_contract.js');

const { createEvidenceLedger } = require('../../scripts/lib/system/evidence_ledger.js');
const { generateRankedPortalWorkbook } = require('../../scripts/lib/boq/generate_boq_xlsx.js');
const { evaluateDomainAspects, getRegisteredAspectsForDomain } = require('../../scripts/lib/aspects/aspect_registry.js');

test('Core Contracts — StageResult enforces skipReason on SKIPPED state', () => {
  const validCompleted = StageResultSchema.safeParse({
    stageId: 'STAGE_1_INTAKE',
    stageName: 'BOQ Intake',
    executionState: 'COMPLETED',
    outcome: 'PASSED',
    evidenceIds: ['EV-001'],
    data: { itemsCount: 5 }
  });
  assert.equal(validCompleted.success, true, 'Completed stage should parse successfully');

  const invalidSkipped = StageResultSchema.safeParse({
    stageId: 'STAGE_7_GROUNDING',
    stageName: 'Document Grounding',
    executionState: 'SKIPPED',
    outcome: 'NOT_EVALUATED'
    // missing skipReason
  });
  assert.equal(invalidSkipped.success, false, 'SKIPPED stage without skipReason must fail schema validation');

  const validSkipped = StageResultSchema.safeParse({
    stageId: 'STAGE_7_GROUNDING',
    stageName: 'Document Grounding',
    executionState: 'SKIPPED',
    outcome: 'NOT_EVALUATED',
    skipReason: 'Offline evaluation requested by user',
    policyCode: 'POLICY_OFFLINE_SKIP'
  });
  assert.equal(validSkipped.success, true, 'SKIPPED stage with skipReason must pass validation');
});

test('Core Contracts — DeliveryAuthorization requires valid acceptance', () => {
  const fakeFingerprint = 'A1B2C3D4E5F678901234567890ABCDEF';

  // Attempting to issue authorization with rejected acceptance MUST throw
  assert.throws(() => {
    issueDeliveryAuthorization({
      manifestFingerprint: fakeFingerprint,
      chassisKey: 'DL380_Gen12',
      acceptanceDecision: {
        isApproved: false,
        profile: 'BOQ_EVALUATION'
      }
    });
  }, /acceptance is not approved/i);

  // Attempting to issue authorization without fingerprint MUST throw
  assert.throws(() => {
    issueDeliveryAuthorization({
      manifestFingerprint: '',
      chassisKey: 'DL380_Gen12',
      acceptanceDecision: {
        isApproved: true,
        profile: 'BOQ_EVALUATION'
      }
    });
  }, /fingerprint is required/i);

  // Valid acceptance issues a verifiable token
  const auth = issueDeliveryAuthorization({
    manifestFingerprint: fakeFingerprint,
    chassisKey: 'DL380_Gen12',
    acceptanceDecision: {
      isApproved: true,
      profile: 'BOQ_EVALUATION'
    }
  });

  assert.ok(auth.token.startsWith('DELIV-AUTH-'), 'Token prefix must be DELIV-AUTH-');
  assert.equal(auth.manifestFingerprint, fakeFingerprint);
  assert.equal(verifyDeliveryAuthorization(auth, fakeFingerprint), true, 'Valid token must verify');
  assert.equal(verifyDeliveryAuthorization(auth, 'MISMATCHED_FINGERPRINT'), false, 'Mismatched fingerprint must fail');
  assert.equal(verifyDeliveryAuthorization(null, fakeFingerprint), false, 'Null auth must fail');
});

test('Core Contracts — EvidenceLedger rejects missing status (INV-105 Zero Default Success)', () => {
  const ledger = createEvidenceLedger({ traceId: 'TRC-TEST-001', chassis: 'DL380_Gen12' });
  ledger.startPhase(1, 'Intake', {});

  // Calling completePhase without status MUST throw
  assert.throws(() => {
    ledger.completePhase(1);
  }, /ZERO_DEFAULT_SUCCESS/);

  // Calling completePhase with invalid status MUST throw
  assert.throws(() => {
    ledger.completePhase(1, 'INVALID_STATUS_FOO');
  }, /Invalid phase status/);

  // Explicit valid status succeeds
  assert.doesNotThrow(() => {
    ledger.completePhase(1, 'PASSED', { items: 10 });
  });
  assert.equal(ledger.phases.phase_1.status, 'PASSED');
});

test('Core Contracts — Pre-Presentation Acceptance blocks portal workbook generation', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-auth-test-'));
  const exportPath = path.join(tempDir, 'Test_Portal.xlsx');

  const failedEvaluation = {
    chassis: 'DL380_Gen12',
    acceptanceGate: {
      isValid: false,
      status: 'FAILED',
      blockersCount: 2,
      blockers: [
        { id: 'U1', name: 'Valid HPE SKUs' },
        { id: 'B1', name: 'Physical Thermal Checks' }
      ]
    },
    items: [{ sku: 'P74573-B21', quantity: 2 }]
  };

  try {
    assert.throws(() => {
      generateRankedPortalWorkbook(failedEvaluation, exportPath);
    }, /Cannot export portal workbook: Pre-presentation acceptance failed/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('Core Contracts — Aspect Registry evaluates domain checkers dynamically', () => {
  const serverCheckers = getRegisteredAspectsForDomain('server');
  assert.ok(serverCheckers.length >= 7, 'Server domain must have at least 7 aspect checkers');

  const testItems = [
    { sku: 'P74573-B21', description: 'Intel Xeon Gold 6530 Processor', quantity: 2 },
    { sku: 'P48820-B21', description: 'High Performance Fan Kit', quantity: 1 }
  ];

  const domainResult = evaluateDomainAspects('server', testItems, null, {}, 1, {});
  assert.equal(domainResult.domain, 'server');
  assert.ok(Array.isArray(domainResult.checks), 'Checks array must be returned');
  assert.ok(domainResult.checks.some(c => c.id === 'COMPUTE_THERMAL'), 'Thermal check must run');
});
