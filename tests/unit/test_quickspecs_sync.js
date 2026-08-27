'use strict';
/**
 * tests/unit/test_quickspecs_sync.js — Unit Tests for QuickSpecs Fingerprinting & Isolation
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const {
  computePdfFingerprint,
  verifyNotebookQuickSpecs,
  KNOWN_QUICKSPECS_DOC_MAP
} = require('../../scripts/lib/sync/quickspecs_sync.js');

describe('QuickSpecs Sync & Fingerprinting Engine', () => {
  it('correctly maps canonical Document IDs and patterns per chassis', () => {
    assert.equal(KNOWN_QUICKSPECS_DOC_MAP['DL380_Gen11'].docId, 'a50004307enw');
    assert.equal(KNOWN_QUICKSPECS_DOC_MAP['DL380_Gen11'].expectedGen, 'Gen11');
    assert.ok(KNOWN_QUICKSPECS_DOC_MAP['DL380_Gen11'].blockedPattern.test('DL380 Gen12'));
    assert.ok(KNOWN_QUICKSPECS_DOC_MAP['DL380_Gen11'].blockedPattern.test('DL380a Gen11'));

    assert.equal(KNOWN_QUICKSPECS_DOC_MAP['DL380_Gen12_SFF'].docId, 'a00073551enw');
    assert.equal(KNOWN_QUICKSPECS_DOC_MAP['DL380_Gen12_SFF'].expectedGen, 'Gen12');
    assert.ok(KNOWN_QUICKSPECS_DOC_MAP['DL380_Gen12_SFF'].blockedPattern.test('DL380 Gen11'));
  });

  it('computes deterministic MD5 and SHA-256 fingerprints for files', () => {
    const tmpFile = path.join(os.tmpdir(), `test_fingerprint_${Date.now()}.pdf`);
    const testContent = Buffer.alloc(150000, 'A'); // 150KB
    fs.writeFileSync(tmpFile, testContent);

    try {
      const fp = computePdfFingerprint(tmpFile);
      const expectedMd5 = crypto.createHash('md5').update(testContent).digest('hex');
      const expectedSha256 = crypto.createHash('sha256').update(testContent).digest('hex');

      assert.equal(fp.md5, expectedMd5);
      assert.equal(fp.sha256, expectedSha256);
      assert.equal(fp.sizeBytes, 150000);
      assert.equal(fp.valid, true);
    } finally {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    }
  });

  it('handles non-existent or invalid files gracefully without throwing', () => {
    const fp = computePdfFingerprint('/non/existent/file.pdf');
    assert.equal(fp.valid, false);
    assert.equal(fp.md5, null);
    assert.equal(fp.sizeBytes, 0);
  });

  it('verifies DL380 Gen11 isolation and grounding structure', async () => {
    const result = await verifyNotebookQuickSpecs('DL380_Gen11');
    assert.equal(result.chassis, 'DL380_Gen11');
    assert.equal(result.notebookId, 'd37fa851-90cb-45b7-a8e1-78488a0bc6e6');
    assert.equal(result.expectedDocId, 'a50004307enw');
    assert.equal(result.isIsolated, true);
    assert.equal(result.pollutedSources.length, 0);
  });
});
