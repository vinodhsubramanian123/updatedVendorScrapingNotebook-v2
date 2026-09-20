'use strict';
/**
 * scripts/lib/notebook/job_manager.js — Asynchronous NotebookLM Query Job Manager
 *
 * Tracks durable, file-backed query jobs, executes background RAG queries,
 * maintains execution telemetry, supports 10-15 minute deadlines, and ensures
 * queries survive server restarts and reconnections.
 */

const { sanitizeNotebookQuery, classifyQueryScenario } = require('./query_sanitizer.js');
const { diagnoseNotebookFailure } = require('./query_diagnostics.js');
const {
  computeIdempotencyKey,
  saveJob,
  getJob,
  updateJob,
  findJobByIdempotencyKey,
  listActiveJobs
} = require('./persistent_job_store.js');

// In-memory mirror for low-latency lookups and backward-compatibility
const activeQueryJobs = new Map();
const activeAbortControllers = new Map();

function isTerminalStatus(status) {
  return ['COMPLETED', 'CLOUD_VERIFIED', 'LOCAL_FALLBACK', 'FAILED', 'CANCELLED'].includes(status);
}

function launchPersistedJob(job, executeQueryFn, options = {}) {
  if (typeof executeQueryFn !== 'function') return;

  const controller = new AbortController();
  activeAbortControllers.set(job.jobId, controller);
  const heartbeat = setInterval(() => {
    const current = getJob(job.jobId);
    if (!current || current.status !== 'PROCESSING') return;
    updateJob(job.jobId, { lastHeartbeatAt: Date.now() });
  }, Math.max(1000, options.heartbeatIntervalMs || 10000));
  if (typeof heartbeat.unref === 'function') heartbeat.unref();

  const finalQueryPayload = `${job.query}\n\n[Signature: Request sent from Dashboard (IdempotencyKey: ${job.idempotencyKey.slice(0, 12)})]`;
  const executionOptions = {
    ...options,
    context: job.context || { chassis: job.chassis },
    timeout: options.timeout || job.timeoutMs,
    signal: controller.signal
  };

  setImmediate(() => {
    const beforeStart = getJob(job.jobId);
    if (!beforeStart || beforeStart.status === 'CANCELLED' || controller.signal.aborted) {
      clearInterval(heartbeat);
      activeAbortControllers.delete(job.jobId);
      return;
    }
    Promise.resolve(executeQueryFn(job.notebookId, finalQueryPayload, executionOptions))
      .then((res) => {
        const persisted = getJob(job.jobId);
        if (!persisted || persisted.status === 'CANCELLED') return;

        const endTime = Date.now();
        const durationMs = endTime - job.startTime;
        const source = String(res?.source || '');
        const isFallback = source.includes('FALLBACK') || source.includes('LOCAL');
        const isCloudGrounded = Boolean(
          res?.isCloudGrounded &&
          res?.groundingVerification === 'VERIFIED_GROUNDED' &&
          (res?.citations || []).length > 0
        );
        const updates = {
          status: isFallback ? 'LOCAL_FALLBACK' : 'COMPLETED',
          cloudGroundingStatus: isCloudGrounded ? 'CLOUD_VERIFIED' : (isFallback ? 'LOCAL_FALLBACK' : 'CLOUD_FAILED'),
          endTime,
          durationMs,
          timestamps: {
            requestSentAt: new Date(job.startTime).toISOString(),
            responseReceivedAt: new Date(endTime).toISOString()
          },
          answer: res?.answer || '',
          citations: res?.citations || [],
          source: res?.source,
          isCloudGrounded,
          groundingVerification: res?.groundingVerification || (isCloudGrounded ? 'VERIFIED_GROUNDED' : 'UNVERIFIED'),
          groundingTier: isCloudGrounded ? 'TIER_1_LIVE_CLOUD_GROUNDED' : (res?.groundingTier || 'TIER_2_UNCITED_ADVISORY')
        };

        if (res?.source === 'FALLBACK_ERROR' || res?.source === 'NOTEBOOK_LM_FAILED') {
          updates.status = 'FAILED';
          updates.cloudGroundingStatus = 'CLOUD_FAILED';
          updates.error = res.error || res.answer;
          updates.diagnostic = diagnoseNotebookFailure(job.notebookId, new Error(res.error || res.answer));
        }

        Object.assign(job, updates);
        updateJob(job.jobId, updates);
        activeQueryJobs.set(job.jobId, job);

        if (isCloudGrounded && job.context?.learningEligible && job.context?.chassisDir) {
          try {
            const { extractAndPersistLearnedDeltas } = require('./knowledge_extractor.js');
            const learned = extractAndPersistLearnedDeltas(job.answer, job.context.chassisDir, {
              chassis: job.chassis,
              source: job.source,
              groundingVerification: job.groundingVerification,
              citations: job.citations,
              confidenceScore: 0.70
            });
            const learningUpdates = {
              learnedDeltasCount: learned.count || 0,
              quarantinedDeltasCount: learned.quarantinedCount || 0
            };
            Object.assign(job, learningUpdates);
            updateJob(job.jobId, learningUpdates);
          } catch (learningError) {
            updateJob(job.jobId, { learningError: learningError.message });
          }
        }

        try {
          const telemetryLib = require('../system/telemetry.js');
          telemetryLib.recordNotebookConsultationTelemetry({
            query: job.query,
            answer: job.answer,
            citations: job.citations,
            chassis: job.chassis,
            durationMs: job.durationMs,
            scenario: classifyQueryScenario(job.query),
            agreementScore: isCloudGrounded ? 0.95 : (isFallback ? 0.70 : 0.50),
            nextActionExecuted: isCloudGrounded ? 'ASYNC_RAG_CLOUD_VERIFIED' : (isFallback ? 'ASYNC_RAG_LOCAL_FALLBACK' : 'ASYNC_RAG_UNVERIFIED')
          });
        } catch (_) {}
      })
      .catch((err) => {
        const persisted = getJob(job.jobId);
        if (!persisted || persisted.status === 'CANCELLED') return;
        const endTime = Date.now();
        const updates = {
          status: 'FAILED',
          cloudGroundingStatus: 'CLOUD_FAILED',
          endTime,
          durationMs: endTime - job.startTime,
          error: err?.message || 'NotebookLM query failed',
          diagnostic: diagnoseNotebookFailure(job.notebookId, err)
        };
        Object.assign(job, updates);
        updateJob(job.jobId, updates);
        activeQueryJobs.set(job.jobId, job);
      })
      .finally(() => {
        clearInterval(heartbeat);
        activeAbortControllers.delete(job.jobId);
      });
  });
}

/**
 * Start an asynchronous non-blocking Gemini Notebook query job with durable persistence.
 * @param {string} notebookId 
 * @param {string} rawQuery 
 * @param {object} [options] 
 * @param {Function} executeQueryFn Execution function
 * @returns {object} { jobId, status, query, pollIntervalMs, cached, joinedInFlight }
 */
function startAsyncNotebookQueryJob(notebookId, rawQuery, options = {}, executeQueryFn) {
  const sanitizedQuery = sanitizeNotebookQuery(rawQuery, options.context);
  const chassis = (options.context && options.context.chassis) ? options.context.chassis : 'UNSPECIFIED';
  const idempotencyKey = computeIdempotencyKey(notebookId, chassis, sanitizedQuery);

  // In-flight and completed query deduplication
  const existingJob = findJobByIdempotencyKey(idempotencyKey);
  if (existingJob) {
    if (isTerminalStatus(existingJob.status) && existingJob.answer && existingJob.isCloudGrounded === true) {
      activeQueryJobs.set(existingJob.jobId, existingJob);
      return {
        jobId: existingJob.jobId,
        status: existingJob.status,
        query: existingJob.query,
        chassis: existingJob.chassis,
        pollIntervalMs: 1000,
        cached: true
      };
    } else if (existingJob.status === 'PROCESSING') {
      activeQueryJobs.set(existingJob.jobId, existingJob);
      return {
        jobId: existingJob.jobId,
        status: existingJob.status,
        query: existingJob.query,
        chassis: existingJob.chassis,
        pollIntervalMs: 1500,
        joinedInFlight: true
      };
    }
  }

  const jobId = `JOB_NLM_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const timeoutMs = options.timeout || parseInt(process.env.RAG_TIMEOUT_MS || '600000', 10); // 10 minutes default

  const job = {
    jobId,
    idempotencyKey,
    notebookId,
    chassis,
    query: sanitizedQuery,
    status: 'PROCESSING',
    startTime: Date.now(),
    pollIntervalMs: 1500,
    timeoutMs,
    answer: null,
    citations: [],
    error: null,
    diagnostic: null,
    lastHeartbeatAt: Date.now(),
    context: {
      chassis,
      skus: Array.isArray(options.context?.skus) ? options.context.skus : [],
      learningEligible: options.context?.learningEligible === true,
      chassisDir: options.context?.chassisDir || null
    }
  };

  // Persist to disk atomically and register in-memory
  saveJob(job);
  activeQueryJobs.set(jobId, job);

  launchPersistedJob(job, executeQueryFn, { ...options, timeout: timeoutMs });

  return {
    jobId: job.jobId,
    status: job.status,
    query: job.query,
    chassis: job.chassis,
    pollIntervalMs: job.pollIntervalMs
  };
}

/**
 * Get status of an async non-blocking NotebookLM query job with persistent recovery.
 * Completed jobs are kept readable in the persistent store for the retention window.
 * @param {string} jobId 
 * @returns {object|null} Job state
 */
function getAsyncNotebookQueryJobStatus(jobId) {
  // Query memory first, then disk store (recovers across server restarts)
  const job = activeQueryJobs.get(jobId) || getJob(jobId);
  if (!job) return null;

  const currentDuration = job.endTime ? job.durationMs : (Date.now() - job.startTime);

  // Check for timeout if still processing
  if (job.status === 'PROCESSING' && job.timeoutMs && currentDuration > job.timeoutMs) {
    const timeoutErr = new Error(`Query deadline exceeded after ${Math.round(currentDuration / 1000)}s (configured timeout: ${Math.round(job.timeoutMs / 1000)}s)`);
    const updates = {
      status: 'FAILED',
      endTime: Date.now(),
      durationMs: currentDuration,
      error: timeoutErr.message,
      diagnostic: diagnoseNotebookFailure(job.notebookId, timeoutErr)
    };
    Object.assign(job, updates);
    updateJob(jobId, updates);
    activeQueryJobs.set(jobId, job);
  }

  const resObj = {
    query: job.query,
    answer: job.answer,
    citations: job.citations || [],
    source: job.source || 'NOTEBOOK_LM',
    chassis: job.chassis,
    isCloudGrounded: Boolean(job.isCloudGrounded),
    groundingTier: job.groundingTier || 'TIER_2_UNCITED_ADVISORY',
    groundingVerification: job.groundingVerification || 'UNVERIFIED',
    learnedDeltasCount: job.learnedDeltasCount || 0,
    quarantinedDeltasCount: job.quarantinedDeltasCount || 0
  };

  return {
    jobId: job.jobId,
    status: job.status,
    chassis: job.chassis,
    query: job.query,
    durationMs: currentDuration,
    answer: job.answer,
    citations: job.citations || [],
    source: job.source || 'NOTEBOOK_LM',
    error: job.error,
    diagnostic: job.diagnostic,
    lastHeartbeatAt: job.lastHeartbeatAt || Date.now(),
    isCloudGrounded: Boolean(job.isCloudGrounded),
    result: resObj
  };
}

/**
 * Cancel an active in-flight grounding job.
 * @param {string} jobId
 * @param {string} [reason]
 * @returns {boolean}
 */
function cancelNotebookQueryJob(jobId, reason = 'CANCELLED_BY_CLIENT') {
  const job = activeQueryJobs.get(jobId) || getJob(jobId);
  if (!job || job.status !== 'PROCESSING') return false;

  const updates = {
    status: 'CANCELLED',
    endTime: Date.now(),
    durationMs: Date.now() - job.startTime,
    error: `Job cancelled: ${reason}`
  };
  Object.assign(job, updates);
  updateJob(jobId, updates);
  activeQueryJobs.set(jobId, job);
  const controller = activeAbortControllers.get(jobId);
  if (controller) controller.abort(new Error(updates.error));
  return true;
}

/**
 * Resume or fail lingering in-flight jobs on server restart.
 * @param {Function} executeQueryFn
 * @returns {Array<object>} Resumed / failed job records
 */
function resumePendingJobs(executeQueryFn) {
  const active = listActiveJobs();
  const resumed = [];
  const now = Date.now();

  for (const job of active) {
    const elapsed = now - (job.startTime || now);
    if (elapsed > (job.timeoutMs || 600000)) {
      const updates = {
        status: 'FAILED',
        endTime: now,
        durationMs: elapsed,
        error: 'Server restart recovery: query deadline expired while service was offline.'
      };
      updateJob(job.jobId, updates);
      resumed.push({ jobId: job.jobId, action: 'EXPIRED' });
    } else if (typeof executeQueryFn === 'function') {
      job.status = 'PROCESSING';
      job.recoveredAt = new Date(now).toISOString();
      job.recoveryCount = (job.recoveryCount || 0) + 1;
      updateJob(job.jobId, job);
      activeQueryJobs.set(job.jobId, job);
      launchPersistedJob(job, executeQueryFn, {
        context: job.context || { chassis: job.chassis },
        timeout: (job.timeoutMs || 600000) - elapsed
      });
      resumed.push({ jobId: job.jobId, action: 'RESUMED' });
    }
  }
  return resumed;
}

module.exports = {
  startAsyncNotebookQueryJob,
  getAsyncNotebookQueryJobStatus,
  cancelNotebookQueryJob,
  resumePendingJobs,
  activeQueryJobs,
  activeAbortControllers
};
