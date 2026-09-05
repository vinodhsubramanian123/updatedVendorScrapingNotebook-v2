'use strict';
/**
 * tests/integration/test_long_running_jobs.js
 *
 * Comprehensive integration test for:
 * 1. Server restart with durable job recovery and resumption (`resumePendingJobs`).
 * 2. 15-minute deadline tracking and heartbeat preservation.
 * 3. In-flight duplicate query deduplication (`joinedInFlight`).
 * 4. Grounding job cancellation (`cancelNotebookQueryJob`).
 *
 * Strictly isolated: runs in sandboxed jobs directory so production files are never modified.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  setJobsDirectory,
  saveJob,
  getJob
} = require('../../scripts/lib/notebook/persistent_job_store.js');

const {
  startAsyncNotebookQueryJob,
  getAsyncNotebookQueryJobStatus,
  cancelNotebookQueryJob,
  resumePendingJobs,
  activeQueryJobs
} = require('../../scripts/lib/notebook/job_manager.js');

const SANDBOX_DIR = path.join(os.tmpdir(), `vendor-notebook-long-jobs-${process.pid}`);

test('Long-Running Grounding Jobs & Resilient Worker Integration', async (t) => {

  t.beforeEach(() => {
    if (fs.existsSync(SANDBOX_DIR)) fs.rmSync(SANDBOX_DIR, { recursive: true, force: true });
    fs.mkdirSync(SANDBOX_DIR, { recursive: true });
    setJobsDirectory(SANDBOX_DIR);
    activeQueryJobs.clear();
  });

  t.afterEach(() => {
    setJobsDirectory(null);
    if (fs.existsSync(SANDBOX_DIR)) fs.rmSync(SANDBOX_DIR, { recursive: true, force: true });
    activeQueryJobs.clear();
  });

  await t.test('1. In-flight duplicate query deduplication', async () => {
    let callCount = 0;
    const mockExecuteFn = async () => {
      callCount++;
      await new Promise(resolve => setTimeout(resolve, 80));
      return {
        answer: 'Verified grounded answer',
        citations: [{ index: '1', title: 'QuickSpecs 2026' }],
        isCloudGrounded: true,
        source: 'NOTEBOOK_LM_CLOUD'
      };
    };

    const job1 = startAsyncNotebookQueryJob(
      'nb-test-dedup',
      'What are the memory channels for DL380 Gen12?',
      { context: { chassis: 'DL380_Gen12' } },
      mockExecuteFn
    );

    assert.strictEqual(job1.status, 'PROCESSING');
    assert.ok(!job1.joinedInFlight);

    // Immediate second query with identical parameters
    const job2 = startAsyncNotebookQueryJob(
      'nb-test-dedup',
      'What are the memory channels for DL380 Gen12?',
      { context: { chassis: 'DL380_Gen12' } },
      mockExecuteFn
    );

    assert.strictEqual(job2.jobId, job1.jobId, 'Duplicate query should join same in-flight job');
    assert.strictEqual(job2.joinedInFlight, true, 'Should be flagged as joined in-flight');

    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 120));
    assert.strictEqual(callCount, 1, 'Underlying execution function should only be called once');

    const finalStatus = getAsyncNotebookQueryJobStatus(job1.jobId);
    assert.strictEqual(finalStatus.status, 'COMPLETED');
    assert.strictEqual(finalStatus.answer, 'Verified grounded answer');
  });

  await t.test('2. Grounding job cancellation', async () => {
    let executionAborted = false;
    let executionStarted = false;
    const slowExecuteFn = async (_notebookId, _query, options) => new Promise((resolve, reject) => {
      executionStarted = true;
      if (options.signal.aborted) {
        executionAborted = true;
        reject(options.signal.reason || new Error('aborted'));
        return;
      }
      const timer = setTimeout(() => resolve({ answer: 'Late answer' }), 300);
      options.signal.addEventListener('abort', () => {
        executionAborted = true;
        clearTimeout(timer);
        reject(options.signal.reason || new Error('aborted'));
      }, { once: true });
    });

    const job = startAsyncNotebookQueryJob(
      'nb-test-cancel',
      'Long running query to be cancelled',
      { context: { chassis: 'DL380_Gen12' } },
      slowExecuteFn
    );

    assert.strictEqual(job.status, 'PROCESSING');

    // Cancel while in flight
    const cancelOk = cancelNotebookQueryJob(job.jobId, 'User requested evaluation reset');
    assert.strictEqual(cancelOk, true, 'Cancellation should return true for active job');

    const statusAfterCancel = getAsyncNotebookQueryJobStatus(job.jobId);
    assert.strictEqual(statusAfterCancel.status, 'CANCELLED');
    assert.ok(statusAfterCancel.error.includes('User requested evaluation reset'));
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.ok(!executionStarted || executionAborted, 'Cancellation must prevent or abort the underlying query execution');
  });

  await t.test('3. Server restart recovery with resumePendingJobs', async () => {
    // Simulate expired job from a server crash 2 hours ago
    const expiredJob = {
      jobId: 'JOB_EXPIRED_001',
      idempotencyKey: 'key_expired_001',
      notebookId: 'nb-recover',
      chassis: 'DL380_Gen12',
      query: 'What are the thermal limits?',
      status: 'PROCESSING',
      startTime: Date.now() - (7200 * 1000), // 2 hours ago
      timeoutMs: 600000 // 10 minutes timeout
    };
    saveJob(expiredJob, SANDBOX_DIR);

    // Simulate active dangling job from a restart 10 seconds ago
    const activeDanglingJob = {
      jobId: 'JOB_ACTIVE_002',
      idempotencyKey: 'key_active_002',
      notebookId: 'nb-recover',
      chassis: 'DL380_Gen12',
      query: 'What are the power supplies?',
      status: 'PROCESSING',
      startTime: Date.now() - 10000, // 10s ago
      timeoutMs: 600000
    };
    saveJob(activeDanglingJob, SANDBOX_DIR);

    let resumedExecutionCalled = false;
    const resumeExecuteFn = async () => {
      resumedExecutionCalled = true;
      return {
        answer: 'Resumed answer after restart',
        citations: [{ title: 'QuickSpecs' }],
        isCloudGrounded: true,
        source: 'NOTEBOOK_LM_CLOUD'
      };
    };

    const recoveryResults = resumePendingJobs(resumeExecuteFn);
    assert.strictEqual(recoveryResults.length, 2);

    const expiredResult = recoveryResults.find(r => r.jobId === 'JOB_EXPIRED_001');
    assert.strictEqual(expiredResult.action, 'EXPIRED');

    const resumedResult = recoveryResults.find(r => r.jobId === 'JOB_ACTIVE_002');
    assert.strictEqual(resumedResult.action, 'RESUMED');

    // Check disk states
    const expiredDiskJob = getJob('JOB_EXPIRED_001');
    assert.strictEqual(expiredDiskJob.status, 'FAILED');
    assert.ok(expiredDiskJob.error.includes('expired while service was offline'));

    // Wait for resumed execution
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.strictEqual(resumedExecutionCalled, true);
    const resumedDiskJob = getJob('JOB_ACTIVE_002');
    assert.strictEqual(resumedDiskJob.status, 'COMPLETED');
    assert.strictEqual(resumedDiskJob.answer, 'Resumed answer after restart');
  });

  await t.test('4. 15-minute deadline tracking (900s timeout)', () => {
    const longJob = {
      jobId: 'JOB_15MIN_001',
      idempotencyKey: 'key_15min',
      notebookId: 'nb-long',
      chassis: 'DL380_Gen12',
      query: 'Very long multi-source synthesis',
      status: 'PROCESSING',
      startTime: Date.now() - 60000, // 1 minute elapsed
      timeoutMs: 900000, // 15 minutes (900s)
      lastHeartbeatAt: Date.now()
    };
    saveJob(longJob, SANDBOX_DIR);

    const status = getAsyncNotebookQueryJobStatus('JOB_15MIN_001');
    assert.strictEqual(status.status, 'PROCESSING', 'Job should still be processing within 15min deadline');
    assert.ok(status.durationMs >= 60000, 'Duration should reflect elapsed time');
  });

  await t.test('5. Dashboard defer mode returns without launching a child-owned cloud job', async () => {
    const { executeGroundedRagValidation } = require('../../scripts/evaluators/eval_boq.js');
    const beforeCount = activeQueryJobs.size;
    const evalResults = {
      errors: [], warnings: [], missingDependencies: [], confidence: { score: 1 },
      conflictGraph: { rankedSolutions: [] }
    };
    const startedAt = Date.now();
    await executeGroundedRagValidation({
      items: [{ sku: 'P12345-B21', quantity: 1, description: 'Test chassis' }],
      evalResults,
      notebookId: 'nb-dashboard-owned',
      catalogData: { metadata: { chassis: 'DL380_Gen12' } },
      chassisDetection: {},
      detectedChassisName: 'DL380_Gen12',
      chassisDir: SANDBOX_DIR,
      OFFLINE_MODE: false,
      DEFER_RAG: true,
      JSON_MODE: true
    });
    assert.ok(Date.now() - startedAt < 1000, 'Deferred local phase should return immediately');
    assert.strictEqual(evalResults.cloudGroundingStatus, 'CLOUD_PENDING');
    assert.strictEqual(activeQueryJobs.size, beforeCount, 'Evaluator must not own the dashboard cloud child process');
  });

});
