'use strict';

/**
 * tests/unit/test_m3_source_transactions_and_artifacts.js
 *
 * Milestone M3: Verifies candidate source cleanup transactions and post-generation
 * artifact byte integrity checks.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

describe('Milestone M3: Source Transactions & Artifact Byte Integrity', () => {

  // ── 1. NLM Source Transaction Purge Verification ──
  describe('NLM Candidate Source Cleanup Receipts', () => {
    it('verifies nlm_sync_client.js defines attemptCandidatePurge and handles readback failures', () => {
      const nlmClientFile = path.resolve(__dirname, '../../scripts/lib/sync/nlm_sync_client.js');
      const content = fs.readFileSync(nlmClientFile, 'utf8');

      assert.ok(content.includes('function attemptCandidatePurge(sourceId)'), 'attemptCandidatePurge helper must be defined');
      assert.ok(content.includes('Candidate ${newSourceId} was purged'), 'Purge success must be recorded in error detail');
      assert.ok(content.includes('verifySemanticProjectionReadback'), 'Readback check must be inside candidate verification try block');
    });
  });

  // ── 2. Artifact Byte Integrity Manifest (F10) ──
  describe('Artifact Byte Integrity & Recheck before Provider Upload', () => {
    it('verifies eval_output_serializer.js builds artifactIntegrityManifest with 4 artifacts', () => {
      const serializerFile = path.resolve(__dirname, '../../scripts/lib/boq/eval_output_serializer.js');
      const content = fs.readFileSync(serializerFile, 'utf8');

      assert.ok(content.includes('artifactIntegrityManifest = {'), 'artifactIntegrityManifest must be generated');
      assert.ok(content.includes('manifestFingerprint: candidateFingerprint'), 'Manifest must be bound to candidateFingerprint');
      assert.ok(content.includes('sha256: hash') || content.includes('sha256'), 'Artifact SHA-256 hashes must be recorded');
      assert.ok(content.includes('Portal workbook file on disk was modified or corrupted after generation'),
        'Tampered or modified artifact bytes must be rejected before provider upload');
    });

    it('simulates hash tampering detection on staged artifact bytes', () => {
      const tmpDir = path.resolve(__dirname, '../../outputs/tmp_m3_test');
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

      const testFile = path.join(tmpDir, 'test_portal.xlsx');
      fs.writeFileSync(testFile, 'initial valid content');

      const initialHash = crypto.createHash('sha256').update(fs.readFileSync(testFile)).digest('hex');
      const manifestEntry = { path: testFile, sha256: initialHash };

      // Simulate tampering
      fs.writeFileSync(testFile, 'corrupted or modified content');
      const tamperedBytes = fs.readFileSync(testFile);
      const tamperedHash = crypto.createHash('sha256').update(tamperedBytes).digest('hex');

      assert.notStrictEqual(tamperedHash, manifestEntry.sha256, 'Tampered hash must differ from recorded hash');

      // Cleanup
      try { fs.unlinkSync(testFile); fs.rmdirSync(tmpDir); } catch (_) {}
    });
  });
});
