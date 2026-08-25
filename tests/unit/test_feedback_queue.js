'use strict';
/**
 * tests/unit/test_feedback_queue.js — Unit Tests for Feedback Queue Manager
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const feedbackQueueLib = require('../../scripts/lib/feedback/feedback_queue.js');
const {
  loadQueue,
  saveQueue,
  appendFeedback,
  listFeedback,
  markProcessed,
  getQueueSummary
} = feedbackQueueLib;

const QUEUE_FILE = path.join(__dirname, '..', '..', 'outputs', 'history', 'user_feedback_queue.json');

describe('Feedback Queue Manager Suite', () => {
  let originalQueueContent = null;

  beforeEach(() => {
    // Backup original queue if exists
    if (fs.existsSync(QUEUE_FILE)) {
      originalQueueContent = fs.readFileSync(QUEUE_FILE, 'utf-8');
    } else {
      originalQueueContent = null;
    }
    // Initialize clean queue for test
    saveQueue([]);
  });

  afterEach(() => {
    // Restore original queue content
    if (originalQueueContent !== null) {
      fs.writeFileSync(QUEUE_FILE, originalQueueContent, 'utf-8');
    } else if (fs.existsSync(QUEUE_FILE)) {
      try { fs.unlinkSync(QUEUE_FILE); } catch (_) {}
    }
  });

  it('appendFeedback should create an entry with default category and pending status', () => {
    const entry = appendFeedback('Please add export button for CSV');
    assert(entry, 'Entry should be returned');
    assert(entry.id && entry.id.startsWith('FB-'), 'ID should have FB- prefix');
    assert.strictEqual(entry.text, 'Please add export button for CSV');
    assert.strictEqual(entry.category, 'feature_request');
    assert.strictEqual(entry.status, 'PENDING');
    assert.strictEqual(entry.resolution, null);
    assert.strictEqual(entry.resolvedAt, null);

    const current = loadQueue();
    assert.strictEqual(current.length, 1);
    assert.strictEqual(current[0].id, entry.id);
  });

  it('appendFeedback should preserve custom category and context metadata', () => {
    const context = { component: 'ResolutionMatrix', chassis: 'DL380_Gen12_SFF' };
    const entry = appendFeedback('Fix tooltip alignment on mobile', 'ui_tweak', context);
    assert.strictEqual(entry.category, 'ui_tweak');
    assert.deepStrictEqual(entry.context, context);
  });

  it('listFeedback should filter entries by status', () => {
    const e1 = appendFeedback('Request 1', 'bug_report');
    const e2 = appendFeedback('Request 2', 'feature_request');
    markProcessed(e1.id, 'Resolved in v1.2', 'COMPLETED');

    const pending = listFeedback('PENDING');
    assert.strictEqual(pending.length, 1);
    assert.strictEqual(pending[0].id, e2.id);

    const completed = listFeedback('COMPLETED');
    assert.strictEqual(completed.length, 1);
    assert.strictEqual(completed[0].id, e1.id);

    const all = listFeedback();
    assert.strictEqual(all.length, 2);
  });

  it('markProcessed should update entry status and resolution timestamp', () => {
    const entry = appendFeedback('Investigate memory leak');
    const updated = markProcessed(entry.id, 'Fixed in worker lifecycle', 'COMPLETED');
    assert(updated !== null);
    assert.strictEqual(updated.status, 'COMPLETED');
    assert.strictEqual(updated.resolution, 'Fixed in worker lifecycle');
    assert(typeof updated.resolvedAt === 'string');

    const nonExistent = markProcessed('FB-invalid-id', 'test');
    assert.strictEqual(nonExistent, null);
  });

  it('getQueueSummary should accurately calculate queue metrics', () => {
    const e1 = appendFeedback('T1');
    const e2 = appendFeedback('T2');
    const e3 = appendFeedback('T3');
    const e4 = appendFeedback('T4');

    markProcessed(e1.id, 'Done', 'COMPLETED');
    markProcessed(e2.id, 'Rejected as out of scope', 'REJECTED');
    markProcessed(e3.id, 'Investigating', 'IN_PROGRESS');

    const summary = getQueueSummary();
    assert.strictEqual(summary.total, 4);
    assert.strictEqual(summary.pending, 1);
    assert.strictEqual(summary.inProgress, 1);
    assert.strictEqual(summary.completed, 1);
    assert.strictEqual(summary.rejected, 1);
  });
});
