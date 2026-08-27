'use strict';
/**
 * tests/unit/test_feedback_persister.js
 *
 * Tests for scripts/lib/preprocessor/feedback_persister.js:
 * - savePreprocessingRuleFeedback creates history directory and file
 * - Atomic persistence of PREPROC-* record structure
 * - Handling missing outputDir and corrupted history JSON gracefully
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { savePreprocessingRuleFeedback } = require('../../scripts/lib/preprocessor/feedback_persister.js');

test('savePreprocessingRuleFeedback returns null if outputDir is missing or empty', () => {
  assert.strictEqual(savePreprocessingRuleFeedback({}, null), null);
  assert.strictEqual(savePreprocessingRuleFeedback({}, ''), null);
});

test('savePreprocessingRuleFeedback creates history directory and appends valid record', () => {
  const tmpDir = path.join(os.tmpdir(), `test_feedback_persister_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    const feedbackData = {
      configId: 'CONFIG-1001',
      splitReason: 'Multi-node CTO split requirement',
      notes: 'Customer requires 4 separate nodes per chassis'
    };

    const record = savePreprocessingRuleFeedback(feedbackData, tmpDir);
    assert.ok(record);
    assert.ok(record.feedbackId.startsWith('PREPROC-'));
    assert.strictEqual(record.configId, 'CONFIG-1001');
    assert.strictEqual(record.humanConfirmedReason, 'Multi-node CTO split requirement');
    assert.strictEqual(record.humanNotes, 'Customer requires 4 separate nodes per chassis');
    assert.strictEqual(record.chassis, path.basename(tmpDir));
    assert.strictEqual(record.status, 'CONFIRMED');

    const historyFile = path.join(tmpDir, 'history', 'preprocessing_rules_history.json');
    assert.ok(fs.existsSync(historyFile));

    const content = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
    assert.strictEqual(content.length, 1);
    assert.strictEqual(content[0].feedbackId, record.feedbackId);

    // Save second record
    const secondRecord = savePreprocessingRuleFeedback({
      configId: 'CONFIG-1002',
      splitReason: 'Unbalanced memory split'
    }, tmpDir);

    const updatedContent = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
    assert.strictEqual(updatedContent.length, 2);
    assert.strictEqual(updatedContent[1].configId, 'CONFIG-1002');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('savePreprocessingRuleFeedback recovers gracefully from corrupt history JSON', () => {
  const tmpDir = path.join(os.tmpdir(), `test_feedback_corrupt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
  const historyDir = path.join(tmpDir, 'history');
  fs.mkdirSync(historyDir, { recursive: true });
  fs.writeFileSync(path.join(historyDir, 'preprocessing_rules_history.json'), 'INVALID_JSON_CORRUPT{[');

  try {
    const record = savePreprocessingRuleFeedback({
      configId: 'CONFIG-RECOVER',
      splitReason: 'Recovery after corruption'
    }, tmpDir);

    assert.ok(record);
    assert.strictEqual(record.configId, 'CONFIG-RECOVER');

    const content = JSON.parse(fs.readFileSync(path.join(historyDir, 'preprocessing_rules_history.json'), 'utf-8'));
    assert.strictEqual(content.length, 1);
    assert.strictEqual(content[0].configId, 'CONFIG-RECOVER');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// GAP-B MISS-2 Regression: canonical scopeTaxonomy keys must not carry _RULES suffix.
// Guards against regression where processPortalFeedback produces stale taxonomy values
// that would corrupt buildMasterKnowledgeRegistry bucket routing.
test('processPortalFeedback generates KnowledgeDelta with canonical scopeTaxonomy (no _RULES suffix)', () => {
  const { processPortalFeedback } = require('../../scripts/lib/feedback/feedback_loop.js');
  const tmpDir = path.join(os.tmpdir(), `test_scope_taxonomy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    const portalError = 'P55415-B21 requires P01366-B21 Smart Storage Battery for write-back cache.';
    const delta = processPortalFeedback(portalError, tmpDir, {
      scopeTaxonomy: 'FAMILY_GEN',
      ruleUpdate: 'MR416i-o Tri-Mode Controller requires P01366-B21 battery kit.'
    });

    const CANONICAL_SCOPES = ['UNIVERSAL_VENDOR', 'FAMILY_GEN', 'CHASSIS_SPECIFIC'];

    assert.ok(delta, 'Delta must be returned');
    assert.ok(
      CANONICAL_SCOPES.includes(delta.scopeTaxonomy),
      `scopeTaxonomy "${delta.scopeTaxonomy}" must be one of [${CANONICAL_SCOPES.join(', ')}] — no _RULES suffix allowed`
    );
    assert.ok(
      CANONICAL_SCOPES.includes(delta.scope),
      `scope "${delta.scope}" must be one of [${CANONICAL_SCOPES.join(', ')}] — no _RULES suffix allowed`
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
