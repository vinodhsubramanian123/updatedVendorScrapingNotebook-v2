'use strict';
/**
 * tests/unit/test_persistent_job_store.js — Unit Tests for Durable Grounding Job Store
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  setJobsDirectory,
  computeIdempotencyKey,
  saveJob,
  getJob,
  updateJob,
  findJobByIdempotencyKey,
  listActiveJobs,
  pruneExpiredJobs
} = require('../../scripts/lib/notebook/persistent_job_store.js');

test('Durable Grounding Job Store Suite (Sandboxed)', async (t) => {
  const SANDBOX_DIR = path.join(os.tmpdir(), `vendor-notebook-job-store-${process.pid}-${Date.now()}`);
  setJobsDirectory(SANDBOX_DIR);

  const testJobId = `JOB_TEST_${Date.now()}_abc12`;

  t.after(() => {
    // Restore production directory and clean sandbox
    setJobsDirectory(null);
    if (fs.existsSync(SANDBOX_DIR)) {
      try { fs.rmSync(SANDBOX_DIR, { recursive: true, force: true }); } catch (_) {}
    }
  });

  await t.test('1. Deterministic Idempotency Key Computation', () => {
    const key1 = computeIdempotencyKey('nb-123', 'DL380_Gen12', 'What are memory channel rules?');
    const key2 = computeIdempotencyKey('nb-123', 'DL380_Gen12', 'What are memory channel rules?\n\n[Signature: Request sent from Dashboard at 9:30 PM IST]');
    assert.strictEqual(key1, key2, 'Volatile timestamp signatures must be stripped to maintain identical hash');
    assert.strictEqual(typeof key1, 'string');
    assert.strictEqual(key1.length, 64);
  });

  await t.test('2. Atomic Save & Retrieve Across Simulated Process Restart', () => {
    const initialJob = {
      jobId: testJobId,
      idempotencyKey: 'idemp-xyz-999',
      notebookId: 'nb-test-123',
      chassis: 'DL380_Gen12_SFF',
      query: 'What are the PCIe riser cable rules for DL380 Gen12?',
      status: 'PROCESSING',
      startTime: Date.now(),
      pollIntervalMs: 1500,
      answer: null
    };

    const saved = saveJob(initialJob);
    assert.strictEqual(saved.jobId, testJobId);
    assert.ok(saved.lastHeartbeatAt > 0);

    // Read back directly from disk as if a new process booted
    const retrieved = getJob(testJobId);
    assert.ok(retrieved !== null, 'Job must be retrievable from persistent disk store');
    assert.strictEqual(retrieved.jobId, testJobId);
    assert.strictEqual(retrieved.status, 'PROCESSING');
    assert.strictEqual(retrieved.chassis, 'DL380_Gen12_SFF');
  });

  await t.test('3. Atomic Update Job State', () => {
    const updates = {
      status: 'COMPLETED',
      endTime: Date.now(),
      durationMs: 4200,
      answer: 'Populate primary riser P48803-B21 with cable kit P56073-B21.',
      citations: [{ title: 'DL380 Gen12 QuickSpecs Section 4', index: '1' }]
    };

    const updated = updateJob(testJobId, updates);
    assert.ok(updated !== null);
    assert.strictEqual(updated.status, 'COMPLETED');
    assert.strictEqual(updated.answer, updates.answer);

    // Verify disk reflects the change
    const fromDisk = getJob(testJobId);
    assert.strictEqual(fromDisk.status, 'COMPLETED');
    assert.strictEqual(fromDisk.citations.length, 1);
  });

  await t.test('4. Find Job by Idempotency Key', () => {
    const found = findJobByIdempotencyKey('idemp-xyz-999');
    assert.ok(found !== null, 'Completed job must be locatable via idempotency key');
    assert.strictEqual(found.jobId, testJobId);
    assert.strictEqual(found.status, 'COMPLETED');

    const notFound = findJobByIdempotencyKey('nonexistent-key');
    assert.strictEqual(notFound, null);
  });

  await t.test('5. Prune Expired Jobs', () => {
    // Retention test: pruning with 0ms retention should prune test file
    const prunedCount = pruneExpiredJobs(0);
    assert.ok(prunedCount >= 1, `Expected at least 1 pruned file, got ${prunedCount}`);
    assert.strictEqual(getJob(testJobId), null);
  });
});
