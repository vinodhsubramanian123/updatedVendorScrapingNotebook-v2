'use strict';
/**
 * tests/chaos/test_m2_evidence_adversarial_stress.js
 *
 * EMPIRICAL ADVERSARIAL CHALLENGER SUITE (Milestone 2 / Challenger M2_2)
 * Authentic Evidence & Receipt Adversarial Red-Teaming
 *
 * Rigorously stress-tests evidence verification in:
 * - scripts/lib/feedback/quarantined_deltas.js
 * - scripts/lib/feedback/feedback_loop.js
 *
 * Attack Vectors Tested:
 * 1. Prohibited synthetic mock tokens ('TEST_EVIDENCE', 'LOCAL_MOCK', 'mock_session_123', 'fake_evidence_token', etc.)
 * 2. Random UUIDs and traceIds formatted like real ones
 * 3. Non-existent files in outputs/history/oca_sessions/
 * 4. Files with status other than ACCEPTED_BY_VENDOR (NAVIGATED_TO_CONFIG_PAGE, TIMEOUT, FAILED, etc.)
 * 5. Files where SHA-256 fingerprint does not match content, tampered content, or corrupted JSON
 * 6. Forged QuickSpecs citations (invalid sections, empty doc IDs, bad syntax, directory traversal)
 * 7. Prototype pollution, null-byte injections, and path traversal in evidence IDs
 * 8. Evidence array poisoning and empty array rejection
 * 9. End-to-end quarantine promotion blockage and immutable audit decision logging
 * 10. Operational incident and workflow advisory isolation in feedback_loop.js
 * 11. Positive epistemic controls: genuine receipts and authentic QuickSpecs citations pass cleanly
 */

const { describe, it, before, after } = require('node:test');
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

const {
  processPortalFeedback,
  classifyPortalError
} = require('../../scripts/lib/feedback/feedback_loop.js');

describe('Milestone 2 Authentic Evidence Adversarial Red-Teaming (Challenger M2_2)', () => {
  const sandboxDir = path.join(os.tmpdir(), `adversarial_evidence_sandbox_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  const testQuarantineFile = path.join(sandboxDir, 'quarantined_deltas.json');
  const testSessionsDir = path.join(sandboxDir, 'oca_sessions');
  const testFeedbackOutputDir = path.join(sandboxDir, 'feedback_chassis');

  before(() => {
    fs.mkdirSync(sandboxDir, { recursive: true });
    fs.mkdirSync(testSessionsDir, { recursive: true });
    fs.mkdirSync(testFeedbackOutputDir, { recursive: true });
    setQuarantineFilePath(testQuarantineFile);
  });

  after(() => {
    setQuarantineFilePath(null);
    try {
      fs.rmSync(sandboxDir, { recursive: true, force: true });
    } catch (_) {}
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ATTACK VECTOR 1: Synthetic Mock Tokens
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Attack Vector 1: Synthetic Mock Tokens', () => {
    const syntheticTokens = [
      'TEST_EVIDENCE',
      'test_evidence',
      'LOCAL_MOCK',
      'local_mock',
      'mock_evidence',
      'mock_session',
      'mock_session_123',
      'fake_evidence_token',
      'synthetic_evidence',
      'dummy_evidence',
      'local_test'
    ];

    for (const token of syntheticTokens) {
      it(`blocks synthetic token '${token}' from verifying as authentic evidence`, () => {
        const res = verifyAuthenticEvidence(token, { sessionsDir: testSessionsDir });
        assert.equal(res.valid, false, `Token '${token}' must NOT be valid`);
        assert.equal(res.code, 'EVIDENCE_UNVERIFIABLE', `Token '${token}' must fail with EVIDENCE_UNVERIFIABLE`);
        assert.ok(res.reason, `Token '${token}' must provide rejection reason`);
      });

      it(`blocks quarantine promotion when candidate evidence is synthetic token '${token}'`, () => {
        const delta = {
          deltaId: `DELTA-SYNTH-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
          sessionsDir: testSessionsDir,
          evidence: token
        };

        const result = promoteQuarantinedDelta(pending.quarantineId, 'ATTACKER', options);
        assert.equal(result, null, `Promotion with token '${token}' must return null`);
        assert.equal(options.error, 'EVIDENCE_UNVERIFIABLE', `options.error must be EVIDENCE_UNVERIFIABLE for '${token}'`);

        const inQuarantine = getQuarantinedDeltas({ filePath: testQuarantineFile });
        const item = inQuarantine.find(d => d.quarantineId === pending.quarantineId);
        assert.ok(item, 'Item must remain in quarantine');
        assert.equal(item.status, 'IN_QUARANTINE', 'Status must remain IN_QUARANTINE');
        assert.equal(item.governanceStatus, 'QUARANTINED', 'Governance status must remain QUARANTINED');
        assert.ok(item.quarantineReasons.some(r => r.includes('EVIDENCE_UNVERIFIABLE')));
      });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ATTACK VECTOR 2: Random UUIDs, TraceIDs, and DeltaIDs
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Attack Vector 2: Random UUIDs and Unverified Trace/Delta IDs', () => {
    const ungroundedIdentifiers = [
      '550e8400-e29b-41d4-a716-446655440000',
      'c400206b-5c98-4e86-a878-977fdde42ebd',
      '00000000-0000-0000-0000-000000000000',
      'DELTA-1792436321472-abc12',
      'DELTA-0000000000000-zzzzz',
      'trace-1792436321472-998877'
    ];

    for (const id of ungroundedIdentifiers) {
      it(`strictly rejects ungrounded identifier '${id}' with EVIDENCE_UNVERIFIABLE`, () => {
        const res = verifyAuthenticEvidence(id, { sessionsDir: testSessionsDir });
        assert.equal(res.valid, false);
        assert.equal(res.code, 'EVIDENCE_UNVERIFIABLE');
      });
    }

    it('rejects promotion when no evidence passed and item has only random traceId/deltaId', () => {
      const delta = {
        deltaId: 'DELTA-1792436321472-abc12',
        traceId: '550e8400-e29b-41d4-a716-446655440000',
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

      const options = { filePath: testQuarantineFile, sessionsDir: testSessionsDir };
      const result = promoteQuarantinedDelta(pending.quarantineId, 'ATTACKER', options);

      assert.equal(result, null);
      assert.equal(options.error, 'EVIDENCE_UNVERIFIABLE');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ATTACK VECTOR 3: Non-Existent Files in outputs/history/oca_sessions/
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Attack Vector 3: Non-Existent Files in oca_sessions', () => {
    const nonExistentFiles = [
      'non_existent_session_9999.json',
      'session-404-not-found.json',
      'outputs/history/oca_sessions/missing_receipt.json',
      'session_does_not_exist',
      '../outside_file.json'
    ];

    for (const missingFile of nonExistentFiles) {
      it(`rejects non-existent session file '${missingFile}'`, () => {
        const res = verifyOcaSessionReceipt(missingFile, {}, { sessionsDir: testSessionsDir });
        assert.equal(res.valid, false);
        assert.equal(res.code, 'EVIDENCE_UNVERIFIABLE');
        assert.ok(res.reason.includes('not found on disk'));

        const authRes = verifyAuthenticEvidence(missingFile, { sessionsDir: testSessionsDir });
        assert.equal(authRes.valid, false);
        assert.equal(authRes.code, 'EVIDENCE_UNVERIFIABLE');
      });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ATTACK VECTOR 4: Files With Non-Accepted Vendor Statuses
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Attack Vector 4: Non-Accepted Vendor Status Receipts', () => {
    const invalidStatuses = [
      'NAVIGATED_TO_CONFIG_PAGE',
      'TIMEOUT',
      'FAILED',
      'CONFIG_PAGE_ERROR',
      'PORTAL_VALIDATION_PENDING',
      'REJECTED_BY_VENDOR',
      'UNVERIFIED',
      'UNKNOWN',
      'NOT_EVALUATED'
    ];

    for (const status of invalidStatuses) {
      it(`strictly rejects session receipt with status '${status}'`, () => {
        const fileName = `session-test-status-${status.toLowerCase()}.json`;
        const filePath = path.join(testSessionsDir, fileName);
        fs.writeFileSync(filePath, JSON.stringify({
          sessionId: `sess-${status}`,
          status,
          timestamp: new Date().toISOString(),
          chassis: 'DL380_Gen12'
        }, null, 2));

        const res = verifyOcaSessionReceipt(fileName, {}, { sessionsDir: testSessionsDir });
        assert.equal(res.valid, false);
        assert.equal(res.code, 'EVIDENCE_UNVERIFIABLE');
        assert.ok(res.reason.includes('not accepted by vendor'), `Reason must specify not accepted: ${res.reason}`);

        const authRes = verifyAuthenticEvidence(fileName, { sessionsDir: testSessionsDir });
        assert.equal(authRes.valid, false);
        assert.equal(authRes.code, 'EVIDENCE_UNVERIFIABLE');
      });
    }

    it('rejects real repository navigation receipt with status NAVIGATED_TO_CONFIG_PAGE', () => {
      const realReceipt = 'navigation-1792487255093.json';
      const realReceiptPath = path.join(__dirname, '..', '..', 'outputs', 'history', 'oca_sessions', realReceipt);
      if (fs.existsSync(realReceiptPath)) {
        const res = verifyOcaSessionReceipt(realReceipt);
        assert.equal(res.valid, false);
        assert.equal(res.code, 'EVIDENCE_UNVERIFIABLE');
        assert.ok(res.reason.includes('not accepted by vendor'));
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ATTACK VECTOR 5: SHA-256 Fingerprint Mismatches, Tampering, and Corrupted Receipts
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Attack Vector 5: SHA-256 Mismatch, Tampering, and Malformed Receipts', () => {
    it('rejects session receipt when caller provides mismatched SHA-256', () => {
      const fileName = 'session-sha-mismatch.json';
      const filePath = path.join(testSessionsDir, fileName);
      fs.writeFileSync(filePath, JSON.stringify({
        sessionId: 'sess-sha-01',
        status: 'ACCEPTED_BY_VENDOR',
        timestamp: new Date().toISOString()
      }, null, 2));

      const fakeSha = '0000000000000000000000000000000000000000000000000000000000000000';
      const res = verifyOcaSessionReceipt(fileName, { sha256: fakeSha }, { sessionsDir: testSessionsDir });
      assert.equal(res.valid, false);
      assert.equal(res.code, 'EVIDENCE_UNVERIFIABLE');
      assert.ok(res.reason.includes('Evidence SHA-256 mismatch'));
    });

    it('rejects receipt if file content is tampered after expected SHA was calculated', () => {
      const fileName = 'session-tampered.json';
      const filePath = path.join(testSessionsDir, fileName);
      const originalContent = JSON.stringify({
        sessionId: 'sess-tampered',
        status: 'ACCEPTED_BY_VENDOR',
        timestamp: new Date().toISOString()
      }, null, 2);
      fs.writeFileSync(filePath, originalContent);

      const originalSha = crypto.createHash('sha256').update(originalContent).digest('hex');

      // Tamper content on disk with valid JSON so JSON.parse succeeds but SHA-256 differs
      const tamperedObj = JSON.parse(originalContent);
      tamperedObj.tampered = true;
      fs.writeFileSync(filePath, JSON.stringify(tamperedObj, null, 2));

      const res = verifyOcaSessionReceipt(fileName, { sha256: originalSha }, { sessionsDir: testSessionsDir });
      assert.equal(res.valid, false);
      assert.equal(res.code, 'EVIDENCE_UNVERIFIABLE');
      assert.ok(res.reason.includes('Evidence SHA-256 mismatch'));
    });

    it('rejects receipt with non-hex declared fingerprint in manifestSha256', () => {
      const fileName = 'session-invalid-manifest-sha.json';
      const filePath = path.join(testSessionsDir, fileName);
      fs.writeFileSync(filePath, JSON.stringify({
        sessionId: 'sess-bad-hex',
        status: 'ACCEPTED_BY_VENDOR',
        manifestSha256: 'not_a_valid_64_char_hex_hash'
      }, null, 2));

      const res = verifyOcaSessionReceipt(fileName, {}, { sessionsDir: testSessionsDir });
      assert.equal(res.valid, false);
      assert.equal(res.code, 'EVIDENCE_UNVERIFIABLE');
      assert.ok(res.reason.includes('not a valid 64-char hex SHA-256'));
    });

    it('rejects syntactically corrupted JSON in session receipt', () => {
      const fileName = 'session-corrupt-syntax.json';
      const filePath = path.join(testSessionsDir, fileName);
      fs.writeFileSync(filePath, '{ invalid_json_syntax: [ missing_bracket ');

      const res = verifyOcaSessionReceipt(fileName, {}, { sessionsDir: testSessionsDir });
      assert.equal(res.valid, false);
      assert.equal(res.code, 'EVIDENCE_UNVERIFIABLE');
      assert.ok(res.reason.includes('Corrupted session receipt JSON'));
    });

    it('rejects session receipt formatted as a JSON array instead of an object', () => {
      const fileName = 'session-json-array.json';
      const filePath = path.join(testSessionsDir, fileName);
      fs.writeFileSync(filePath, JSON.stringify([{ status: 'ACCEPTED_BY_VENDOR' }]));

      const res = verifyOcaSessionReceipt(fileName, {}, { sessionsDir: testSessionsDir });
      assert.equal(res.valid, false);
      assert.equal(res.code, 'EVIDENCE_UNVERIFIABLE');
      assert.ok(res.reason.includes('Invalid session receipt format'));
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ATTACK VECTOR 6: Forged QuickSpecs Citations
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Attack Vector 6: Forged QuickSpecs Citations', () => {
    const invalidDocIds = [
      '',
      '   ',
      'QS:',
      'QuickSpecs:',
      'HPE QuickSpecs source ',
      'MALICIOUS_DOC_ID',
      'not-a-doc',
      'c123', // too few digits (needs 7-9)
      '12345', // too few digits (needs 8-12)
      'HPE-QS' // missing series identifier
    ];

    for (const docId of invalidDocIds) {
      it(`rejects invalid document ID syntax '${docId}'`, () => {
        const res = verifyQuickSpecsCitation(docId, { section: 'Memory' });
        assert.equal(res.valid, false);
        assert.equal(res.code, 'EVIDENCE_UNVERIFIABLE');
        assert.ok(res.reason.includes('Invalid QuickSpecs document ID syntax') || res.reason.includes('prohibited mock'));
      });
    }

    const invalidSections = [
      '',
      '   ',
      'test',
      'mock',
      'none',
      'null',
      'undefined',
      'tbd',
      'n/a',
      'na',
      'x',
      'ab'
    ];

    for (const sec of invalidSections) {
      it(`rejects invalid section name '${sec}' for authentic document ID`, () => {
        const res = verifyQuickSpecsCitation('c04111535', { section: sec });
        assert.equal(res.valid, false);
        assert.equal(res.code, 'EVIDENCE_UNVERIFIABLE');
        assert.ok(res.reason.includes('requires a valid document ID AND section name'));
      });
    }

    const pathTraversalDocIds = [
      '../../etc/passwd',
      '..\\..\\windows\\system32\\cmd.exe',
      '/etc/shadow',
      'C:\\boot.ini',
      'file:///etc/passwd'
    ];

    for (const traversal of pathTraversalDocIds) {
      it(`strictly rejects path traversal document ID '${traversal}'`, () => {
        const res = verifyQuickSpecsCitation(traversal, { section: 'Memory' });
        assert.equal(res.valid, false);
        assert.equal(res.code, 'EVIDENCE_UNVERIFIABLE');
      });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ATTACK VECTOR 7: Null-Byte Injections, Prototype Pollution, and Path Traversal
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Attack Vector 7: Null-Byte Injections and Prototype Pollution', () => {
    const nullByteRefs = [
      'session\0malicious.json',
      'c04111535\0#Memory',
      '\0',
      'test\0_evidence'
    ];

    for (const ref of nullByteRefs) {
      it(`safely handles and rejects null-byte injection '${ref}'`, () => {
        const res = verifyAuthenticEvidence(ref, { sessionsDir: testSessionsDir });
        assert.equal(res.valid, false);
        assert.equal(res.code, 'EVIDENCE_UNVERIFIABLE');
      });
    }

    it('rejects path traversal attempting to escape oca_sessions directory', () => {
      const traversalRef = '../../../../windows/win.ini';
      const res = verifyOcaSessionReceipt(traversalRef, {}, { sessionsDir: testSessionsDir });
      assert.equal(res.valid, false);
      assert.equal(res.code, 'EVIDENCE_UNVERIFIABLE');
      assert.ok(res.reason.includes('not found on disk'));
    });

    it('rejects prototype pollution attempts via object keys', () => {
      const pollutedEvidence = JSON.parse('{"__proto__": {"status": "ACCEPTED_BY_VENDOR", "valid": true}}');
      const res = verifyAuthenticEvidence(pollutedEvidence, { sessionsDir: testSessionsDir });
      assert.equal(res.valid, false);
      assert.equal(res.code, 'EVIDENCE_UNVERIFIABLE');
    });

    it('rejects evidence objects targeting special prototype keys', () => {
      const specialKeys = ['__proto__', 'constructor', 'prototype'];
      for (const key of specialKeys) {
        const res = verifyAuthenticEvidence({ id: key }, { sessionsDir: testSessionsDir });
        assert.equal(res.valid, false);
        assert.equal(res.code, 'EVIDENCE_UNVERIFIABLE');
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ATTACK VECTOR 8: Batch Array Poisoning and Empty Evidence Rejection
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Attack Vector 8: Batch Evidence Poisoning', () => {
    it('rejects evidence batch containing any prohibited synthetic mock token', () => {
      const poisonedBatch = [
        { type: 'OFFICIAL_QUICKSPECS', documentId: 'c04111535', section: 'Memory' },
        { type: 'OFFICIAL_VENDOR_PORTAL', id: 'TEST_EVIDENCE' }
      ];

      const res = verifyAuthenticEvidence(poisonedBatch, { sessionsDir: testSessionsDir });
      assert.equal(res.valid, false);
      assert.equal(res.code, 'EVIDENCE_UNVERIFIABLE');
      assert.ok(res.reason.includes('Rejected prohibited synthetic mock evidence token'));
    });

    it('rejects completely empty evidence array', () => {
      const res = verifyAuthenticEvidence([], { sessionsDir: testSessionsDir });
      assert.equal(res.valid, false);
      assert.equal(res.code, 'EVIDENCE_UNVERIFIABLE');
      assert.ok(res.reason.includes('Empty evidence array'));
    });

    it('rejects null or undefined evidence inputs', () => {
      const resNull = verifyAuthenticEvidence(null);
      assert.equal(resNull.valid, false);
      assert.equal(resNull.code, 'EVIDENCE_UNVERIFIABLE');

      const resUndef = verifyAuthenticEvidence(undefined);
      assert.equal(resUndef.valid, false);
      assert.equal(resUndef.code, 'EVIDENCE_UNVERIFIABLE');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ATTACK VECTOR 9: Full Quarantine Promotion Blockage & Audit Integrity
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Attack Vector 9: End-to-End Promotion Blockage and Audit Verification', () => {
    it('asserts failed promotion attempts append EVIDENCE_UNVERIFIABLE and log blocked decision', () => {
      const delta = {
        deltaId: `DELTA-BLOCK-AUDIT-${Date.now()}`,
        vendor: 'HPE',
        chassis: 'DL380_Gen12',
        scopeTaxonomy: 'CHASSIS_SPECIFIC',
        affectedSku: 'P55415-B21',
        requiredDependencySku: 'P01366-B21',
        confidenceScore: 0.70,
        ruleType: 'PREREQUISITE',
        rawMessage: 'P55415-B21 requires P01366-B21'
      };
      const pending = saveQuarantinedDelta(delta, ['Initial quarantine'], { filePath: testQuarantineFile });

      const options = {
        filePath: testQuarantineFile,
        sessionsDir: testSessionsDir,
        evidence: 'LOCAL_MOCK'
      };

      const result = promoteQuarantinedDelta(pending.quarantineId, 'AUDITOR', options);
      assert.equal(result, null);
      assert.equal(options.error, 'EVIDENCE_UNVERIFIABLE');

      // Check quarantine record on disk
      const inQuarantine = getQuarantinedDeltas({ filePath: testQuarantineFile });
      const record = inQuarantine.find(d => d.quarantineId === pending.quarantineId);
      assert.ok(record);
      assert.equal(record.status, 'IN_QUARANTINE');
      assert.ok(record.quarantineReasons.some(r => r.includes('EVIDENCE_UNVERIFIABLE')));
      assert.equal(record.lastPromotionAttempt.status, 'BLOCKED');
      assert.equal(record.lastPromotionAttempt.code, 'EVIDENCE_UNVERIFIABLE');

      // Check immutable decisions file
      const decisionFile = path.join(sandboxDir, 'knowledge_decisions.json');
      assert.ok(fs.existsSync(decisionFile), 'knowledge_decisions.json must exist');
      const decisions = JSON.parse(fs.readFileSync(decisionFile, 'utf-8'));
      const blockedDecision = decisions.find(d => d.quarantineId === pending.quarantineId && d.decision === 'PROMOTION_BLOCKED');
      assert.ok(blockedDecision, 'Decision file must contain PROMOTION_BLOCKED entry');
      assert.equal(blockedDecision.status, 'EVIDENCE_UNVERIFIABLE');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ATTACK VECTOR 10: Feedback Loop Quarantine & Operational Decoupling
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Attack Vector 10: Feedback Loop Quarantine Decoupling', () => {
    it('quarantines OPERATIONAL_INCIDENT errors without touching hardware knowledge base', () => {
      const netError = 'Failed to connect to CDP port 9222: ECONNREFUSED';
      const result = processPortalFeedback(netError, testFeedbackOutputDir);
      assert.equal(result.status, 'OPERATIONAL_INCIDENT_RECORDED');
      assert.equal(result.category, 'OPERATIONAL_INCIDENT');
      assert.equal(result.governanceStatus, 'IGNORED_FOR_HARDWARE_RULES');
    });

    it('records WORKFLOW_ADVISORY errors without affecting hardware rules', () => {
      const uiAdvisory = 'OCA Tab 1 Quick links button selector changed';
      const result = processPortalFeedback(uiAdvisory, testFeedbackOutputDir);
      assert.equal(result.status, 'WORKFLOW_ADVISORY_RECORDED');
      assert.equal(result.category, 'WORKFLOW_ADVISORY');
      assert.equal(result.governanceStatus, 'WORKFLOW_ADVISORY_ONLY');
    });

    it('classifies portal hardware rule errors and saves to quarantine with IN_QUARANTINE without auto-promoting', () => {
      const hwError = 'P55415-B21 cannot be installed without P01366-B21 in Slot 1';
      const result = processPortalFeedback(hwError, testFeedbackOutputDir, {
        affectedSku: 'P55415-B21',
        requiredDependencySku: 'P01366-B21'
      });
      assert.equal(result.status, 'IN_QUARANTINE');
      assert.equal(result.governanceStatus, 'QUARANTINED');
      assert.ok(result.quarantineId);
      assert.ok(result.quarantineReasons.length > 0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ATTACK VECTOR 11: Positive Epistemic Controls (Genuine Receipts & QuickSpecs)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Attack Vector 11: Positive Epistemic Controls', () => {
    let authenticSessionFile;

    before(() => {
      authenticSessionFile = 'session-authentic-portal-receipt.json';
      const filePath = path.join(testSessionsDir, authenticSessionFile);
      fs.writeFileSync(filePath, JSON.stringify({
        sessionId: 'sess-authentic-001',
        status: 'ACCEPTED_BY_VENDOR',
        timestamp: new Date().toISOString(),
        chassis: 'DL380_Gen12',
        vendorAcceptance: 'ACCEPTED_BY_VENDOR',
        manifest: [
          { sku: 'P55415-B21', qty: 1 },
          { sku: 'P01366-B21', qty: 1 }
        ]
      }, null, 2));
    });

    it('accepts genuine on-disk session receipt with status ACCEPTED_BY_VENDOR', () => {
      const res = verifyOcaSessionReceipt(authenticSessionFile, {}, { sessionsDir: testSessionsDir });
      assert.equal(res.valid, true);
      assert.equal(res.type, 'OFFICIAL_VENDOR_PORTAL');
      assert.equal(res.status, 'ACCEPTED_BY_VENDOR');
      assert.ok(res.sha256 && res.sha256.length === 64);
    });

    it('accepts genuine QuickSpecs citation with valid document ID and section', () => {
      const res = verifyQuickSpecsCitation('c04111535', { section: 'Memory' });
      assert.equal(res.valid, true);
      assert.equal(res.type, 'OFFICIAL_QUICKSPECS');
      assert.equal(res.documentId, 'c04111535');
      assert.equal(res.section, 'Memory');
    });

    it('accepts genuine compound QuickSpecs citation in docId#section format', () => {
      const res = verifyQuickSpecsCitation('QS-DL380-GEN12#Processors');
      assert.equal(res.valid, true);
      assert.equal(res.documentId, 'QS-DL380-GEN12');
      assert.equal(res.section, 'Processors');
    });

    it('successfully promotes quarantined delta when genuine session receipt is provided', () => {
      const delta = {
        deltaId: `DELTA-AUTH-PROMOTE-${Date.now()}`,
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
          reasoning: 'Verified in authentic portal session receipt with vendor acceptance.',
          decision: 'APPROVE',
          verified: true,
          evidence: [{ type: 'OFFICIAL_VENDOR_PORTAL', id: authenticSessionFile }]
        }
      });

      assert.ok(promoted, 'Promotion should succeed with authentic session receipt');
      assert.equal(promoted.status, 'PROMOTED');
      assert.equal(promoted.governanceStatus, 'ACTIVE');
      assert.ok(promoted.confidenceScore >= 0.85);
    });

    it('successfully promotes quarantined delta when genuine QuickSpecs citation is provided', () => {
      const delta = {
        deltaId: `DELTA-QS-PROMOTE-${Date.now()}`,
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
          reasoning: 'Verified in official QuickSpecs document section for configuration rules.',
          decision: 'APPROVE',
          verified: true,
          evidence: [{ type: 'OFFICIAL_QUICKSPECS', documentId: 'c04111535', section: 'Configuration Rules' }]
        }
      });

      assert.ok(promoted, 'Promotion should succeed with authentic QuickSpecs citation');
      assert.equal(promoted.status, 'PROMOTED');
      assert.equal(promoted.governanceStatus, 'ACTIVE');
      assert.ok(promoted.confidenceScore >= 0.85);
    });
  });
});
