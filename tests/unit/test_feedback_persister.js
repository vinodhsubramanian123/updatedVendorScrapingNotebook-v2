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
