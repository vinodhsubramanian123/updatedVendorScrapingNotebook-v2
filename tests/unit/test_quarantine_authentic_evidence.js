'use strict';
/**
 * tests/unit/test_quarantine_authentic_evidence.js — Authentic Evidence Verification Test Suite (Feature 7 / Requirement R2)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const {
  promoteQuarantinedDelta,
  saveQuarantinedDelta,
  getQuarantinedDeltas,
  setQuarantineFilePath,
  verifyAuthenticEvidence,
  verifyOcaSessionReceipt,
  verifyQuickSpecsCitation,
  isSyntheticOrMockToken
} = require('../../scripts/lib/feedback/quarantined_deltas.js');

describe('Authentic Evidence Quarantine Verification (Feature 7 / Requirement R2)', () => {
  const sandboxDir = path.join(os.tmpdir(), `sandbox_evidence_test_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
  const testQuarantineFile = path.join(sandboxDir, 'quarantined_deltas.json');
  const testSessionsDir = path.join(sandboxDir, 'oca_sessions');

  // Setup sandbox directories
  fs.mkdirSync(sandboxDir, { recursive: true });
  fs.mkdirSync(testSessionsDir, { recursive: true });

  it('1. isSyntheticOrMockToken identifies prohibited mock tokens and random UUIDs', () => {
    assert.equal(isSyntheticOrMockToken('TEST_EVIDENCE'), true);
    assert.equal(isSyntheticOrMockToken('local_mock'), true);
    assert.equal(isSyntheticOrMockToken('mock_session'), true);
    assert.equal(isSyntheticOrMockToken('fake_evidence'), true);
    assert.equal(isSyntheticOrMockToken('550e8400-e29b-41d4-a716-446655440000'), true);
    assert.equal(isSyntheticOrMockToken('DELTA-1792436321472-abc12'), true);

    // Genuine references must return false
    assert.equal(isSyntheticOrMockToken('c04111535'), false);
    assert.equal(isSyntheticOrMockToken('QS-DL380-GEN12'), false);
    assert.equal(isSyntheticOrMockToken('session-1792436321472.json'), false);
  });

  it('2. verifyQuickSpecsCitation validates official QuickSpecs document IDs and sections', () => {
    // Valid document ID with explicit section
    const res1 = verifyQuickSpecsCitation('c04111535', { section: 'Memory' });
    assert.equal(res1.valid, true);
    assert.equal(res1.type, 'OFFICIAL_QUICKSPECS');
    assert.equal(res1.documentId, 'c04111535');
    assert.equal(res1.section, 'Memory');

    // Valid compound document ID: docId#section
    const res2 = verifyQuickSpecsCitation('QS-DL380-GEN12#Processors');
    assert.equal(res2.valid, true);
    assert.equal(res2.documentId, 'QS-DL380-GEN12');
    assert.equal(res2.section, 'Processors');

    // Reject prohibited mock token
    const resMock = verifyQuickSpecsCitation('TEST_EVIDENCE', { section: 'Processors' });
    assert.equal(resMock.valid, false);
    assert.equal(resMock.code, 'EVIDENCE_UNVERIFIABLE');

    // Reject missing section
    const resNoSec = verifyQuickSpecsCitation('c04111535', { section: '' });
    assert.equal(resNoSec.valid, false);
    assert.equal(resNoSec.code, 'EVIDENCE_UNVERIFIABLE');

    // Infer section from context reasoning
    const resInferred = verifyQuickSpecsCitation('c04111535', {}, { reasoning: 'Verified processor TDP cooling requirements in QuickSpecs.' });
    assert.equal(resInferred.valid, true);
    assert.equal(resInferred.section, 'Processors');
  });

  it('3. verifyOcaSessionReceipt verifies on-disk session receipts with ACCEPTED_BY_VENDOR and SHA-256', () => {
    // Create an unaccepted session receipt (NAVIGATED_TO_CONFIG_PAGE)
    const unacceptedSession = {
      sessionId: 'session-nav-001',
      status: 'NAVIGATED_TO_CONFIG_PAGE',
      timestamp: new Date().toISOString()
    };
    const unacceptedPath = path.join(testSessionsDir, 'session-nav-001.json');
    fs.writeFileSync(unacceptedPath, JSON.stringify(unacceptedSession, null, 2));

    const resUnaccepted = verifyOcaSessionReceipt('session-nav-001.json', {}, { sessionsDir: testSessionsDir });
    assert.equal(resUnaccepted.valid, false);
    assert.equal(resUnaccepted.code, 'EVIDENCE_UNVERIFIABLE');
    assert.ok(resUnaccepted.reason.includes('not accepted by vendor'));

    // Create an authentic accepted session receipt
    const acceptedSession = {
      sessionId: 'session-accepted-002',
      status: 'ACCEPTED_BY_VENDOR',
      timestamp: new Date().toISOString(),
      chassis: 'DL380_Gen12'
    };
    const acceptedPath = path.join(testSessionsDir, 'session-accepted-002.json');
    fs.writeFileSync(acceptedPath, JSON.stringify(acceptedSession, null, 2));

    const resAccepted = verifyOcaSessionReceipt('session-accepted-002.json', {}, { sessionsDir: testSessionsDir });
    assert.equal(resAccepted.valid, true);
    assert.equal(resAccepted.type, 'OFFICIAL_VENDOR_PORTAL');
    assert.equal(resAccepted.status, 'ACCEPTED_BY_VENDOR');
    assert.ok(resAccepted.sha256);
  });

  it('4. promoteQuarantinedDelta strictly rejects synthetic mock evidence with EVIDENCE_UNVERIFIABLE', () => {
    setQuarantineFilePath(testQuarantineFile);

    const delta = {
      deltaId: 'DELTA-TEST-MOCK-001',
      vendor: 'HPE',
      chassis: 'DL380_Gen12',
      scopeTaxonomy: 'CHASSIS_SPECIFIC',
      affectedSku: 'P55415-B21',
      requiredDependencySku: 'P01366-B21',
      confidenceScore: 0.70,
      ruleType: 'PREREQUISITE',
      rawMessage: 'P55415-B21 requires P01366-B21'
    };
    const pending = saveQuarantinedDelta(delta, ['Awaiting review'], { filePath: testQuarantineFile });

    const options = {
      filePath: testQuarantineFile,
      humanReview: {
        reviewer: 'LEAD_ARCHITECT',
        reasoning: 'Attempting promotion with synthetic mock evidence ID.',
        decision: 'APPROVE',
        verified: true,
        evidence: [{ type: 'OFFICIAL_VENDOR_PORTAL', id: 'TEST_EVIDENCE' }]
      }
    };

    const result = promoteQuarantinedDelta(pending.quarantineId, 'LEAD_ARCHITECT', options);
    assert.equal(result, null);
    assert.equal(options.error, 'EVIDENCE_UNVERIFIABLE');

    // Confirm delta remains quarantined with EVIDENCE_UNVERIFIABLE in reasons
    const inQuarantine = getQuarantinedDeltas({ filePath: testQuarantineFile });
    const item = inQuarantine.find(d => d.quarantineId === pending.quarantineId);
    assert.ok(item, 'Item must remain in quarantine');
    assert.ok(item.quarantineReasons.some(r => r.includes('EVIDENCE_UNVERIFIABLE')));

    // Confirm decision record logged
    const decisionFile = path.join(sandboxDir, 'knowledge_decisions.json');
    const decisions = JSON.parse(fs.readFileSync(decisionFile, 'utf-8'));
    assert.ok(decisions.some(d => d.decision === 'PROMOTION_BLOCKED' && d.status === 'EVIDENCE_UNVERIFIABLE'));

    setQuarantineFilePath(null);
  });

  it('5. promoteQuarantinedDelta promotes successfully when authentic session receipt is supplied', () => {
    setQuarantineFilePath(testQuarantineFile);

    const delta = {
      deltaId: 'DELTA-TEST-AUTH-002',
      vendor: 'HPE',
      chassis: 'DL380_Gen12',
      scopeTaxonomy: 'CHASSIS_SPECIFIC',
      affectedSku: 'P55415-B21',
      requiredDependencySku: 'P01366-B21',
      confidenceScore: 0.75,
      ruleType: 'PREREQUISITE',
      rawMessage: 'P55415-B21 requires P01366-B21'
    };
    const pending = saveQuarantinedDelta(delta, ['Awaiting verification'], { filePath: testQuarantineFile });

    // Mock catalog data for DL380_Gen12
    const catalogData = {
      entries: [
        { skus: [{ 'Product #': 'P55415-B21' }, { 'Product #': 'P01366-B21' }] }
      ]
    };

    const promoted = promoteQuarantinedDelta(pending.quarantineId, 'LEAD_ARCHITECT', {
      filePath: testQuarantineFile,
      sessionsDir: testSessionsDir,
      catalogData,
      skipActivation: true,
      humanReview: {
        reviewer: 'LEAD_ARCHITECT',
        reasoning: 'Verified in authenticated OCA session with customer configuration.',
        decision: 'APPROVE',
        verified: true,
        evidence: [{ type: 'OFFICIAL_VENDOR_PORTAL', id: 'session-accepted-002.json' }]
      }
    });

    assert.ok(promoted, 'Promotion should succeed with authentic session receipt');
    assert.equal(promoted.status, 'PROMOTED');
    assert.equal(promoted.governanceStatus, 'ACTIVE');
    assert.ok(promoted.confidenceScore > promoted.preConfidenceScore);

    setQuarantineFilePath(null);
  });
});
