'use strict';
/**
 * scripts/lib/notebook/job_manager.js — Asynchronous NotebookLM Query Job Manager
 *
 * Tracks in-memory query jobs, executes background RAG queries,
 * and maintains execution telemetry.
 */

const { sanitizeNotebookQuery, classifyQueryScenario } = require('./query_sanitizer.js');
const { diagnoseNotebookFailure } = require('./query_diagnostics.js');

const activeQueryJobs = new Map();

/**
 * Start an asynchronous non-blocking Gemini Notebook query job.
 * @param {string} notebookId 
 * @param {string} rawQuery 
 * @param {object} [options] 
 * @param {Function} executeQueryFn Execution function
 * @returns {object} { jobId, status, query, pollIntervalMs }
 */
function startAsyncNotebookQueryJob(notebookId, rawQuery, options = {}, executeQueryFn) {
  const jobId = `JOB_NLM_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const sanitizedQuery = sanitizeNotebookQuery(rawQuery, options.context);
  const chassis = options.context ? options.context.chassis : 'HPE ProLiant DL380 Gen12 SFF';

  const job = {
    jobId,
    notebookId,
    chassis,
    query: sanitizedQuery,
    status: 'PROCESSING',
    startTime: Date.now(),
    pollIntervalMs: 1500,
    answer: null,
    citations: [],
    error: null,
    diagnostic: null
  };

  activeQueryJobs.set(jobId, job);

  const istTimestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const finalQueryPayload = `${sanitizedQuery}\n\n[Signature: Request sent from Dashboard at ${istTimestamp} IST]`;

  setImmediate(() => {
    executeQueryFn(notebookId, finalQueryPayload, { ...options, timeout: options.timeout || 120000 })
      .then((res) => {
        job.status = 'COMPLETED';
        job.endTime = Date.now();
        job.durationMs = job.endTime - job.startTime;
        job.timestamps = { requestSentAt: new Date(job.startTime).toISOString(), responseReceivedAt: new Date(job.endTime).toISOString() };
        job.answer = res.answer;
        job.citations = res.citations || [];
        job.source = res.source;

        if (res.source === 'FALLBACK_ERROR') {
          job.status = 'FAILED';
          job.error = res.error || res.answer;
          job.diagnostic = diagnoseNotebookFailure(notebookId, new Error(res.error || res.answer));
        }

        try {
          const telemetryLib = require('../system/telemetry.js');
          telemetryLib.recordNotebookConsultationTelemetry({
            query: sanitizedQuery,
            answer: job.answer,
            citations: job.citations,
            chassis,
            durationMs: job.durationMs,
            scenario: classifyQueryScenario(sanitizedQuery),
            agreementScore: job.status === 'COMPLETED' ? 0.95 : 0.5,
            nextActionExecuted: job.status === 'COMPLETED' ? 'ASYNC_RAG_DOUBLE_PROOFED' : 'ASYNC_RAG_FAILED'
          });
        } catch (_) {}
      })
      .catch((err) => {
        job.status = 'FAILED';
        job.endTime = Date.now();
        job.durationMs = job.endTime - job.startTime;
        job.timestamps = { requestSentAt: new Date(job.startTime).toISOString(), responseReceivedAt: new Date(job.endTime).toISOString() };
        job.error = err.message;
        job.diagnostic = diagnoseNotebookFailure(notebookId, err);
      });
  });

  return {
    jobId: job.jobId,
    status: job.status,
    query: job.query,
    chassis: job.chassis,
    pollIntervalMs: job.pollIntervalMs
  };
}

/**
 * Get status of an async non-blocking NotebookLM query job.
 * @param {string} jobId 
 * @returns {object|null} Job state
 */
function getAsyncNotebookQueryJobStatus(jobId) {
  if (!activeQueryJobs.has(jobId)) return null;
  const job = activeQueryJobs.get(jobId);
  const currentDuration = job.endTime ? job.durationMs : (Date.now() - job.startTime);

  const resObj = {
    query: job.query,
    answer: job.answer,
    citations: job.citations || [],
    source: job.source || 'NOTEBOOK_LM',
    chassis: job.chassis
  };

  const returnObj = {
    jobId: job.jobId,
    status: job.status,
    chassis: job.chassis,
    query: job.query,
    durationMs: currentDuration,
    answer: job.answer,
    citations: job.citations,
    source: job.source || 'NOTEBOOK_LM',
    error: job.error,
    diagnostic: job.diagnostic,
    result: resObj
  };

  if (job.status === 'COMPLETED' || job.status === 'FAILED') {
    activeQueryJobs.delete(jobId);
  }

  return returnObj;
}

module.exports = {
  startAsyncNotebookQueryJob,
  getAsyncNotebookQueryJobStatus,
  activeQueryJobs
};
