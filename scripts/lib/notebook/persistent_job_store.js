'use strict';
/**
 * scripts/lib/notebook/persistent_job_store.js — Durable File-Backed Grounding Job Store
 *
 * Persists asynchronous NotebookLM grounding jobs to disk in `outputs/history/grounding_jobs/`
 * using atomic JSON writes, ensuring queries survive backend restarts, power loss,
 * and disconnects while supporting query idempotency and heartbeat tracking.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { safeWriteJsonAtomic } = require('../system/fs_compat.js');
const logger = require('../system/pipeline_logger.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
let currentJobsDir = path.join(PROJECT_ROOT, 'outputs', 'history', 'grounding_jobs');

function getJobsDir() {
  return currentJobsDir;
}

function setJobsDirectory(customDir = null) {
  currentJobsDir = customDir || path.join(PROJECT_ROOT, 'outputs', 'history', 'grounding_jobs');
  ensureJobsDir();
}

function ensureJobsDir() {
  if (!fs.existsSync(currentJobsDir)) {
    fs.mkdirSync(currentJobsDir, { recursive: true });
  }
}

/**
 * Generate a deterministic idempotency key based on notebook, chassis, and sanitized query.
 * Strips out volatile timestamps and request signatures.
 * @param {string} notebookId
 * @param {string} chassis
 * @param {string} query
 * @returns {string} SHA-256 hash string
 */
function computeIdempotencyKey(notebookId = '', chassis = '', query = '') {
  const cleanQuery = query.replace(/\[Signature:.*?\]/g, '').trim();
  const raw = `${String(notebookId).trim()}|${String(chassis).trim()}|${cleanQuery}`;
  return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
}

/**
 * Save or overwrite a grounding job to disk atomically.
 * @param {object} job
 * @param {string} [customDir]
 * @returns {object} The saved job
 */
function saveJob(job, customDir = null) {
  if (!job || !job.jobId) {
    throw new Error('saveJob requires a valid job object with a jobId property');
  }
  const targetDir = customDir || currentJobsDir;
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  const filePath = path.join(targetDir, `${job.jobId}.json`);
  const enriched = {
    ...job,
    lastHeartbeatAt: Date.now(),
    updatedAt: new Date().toISOString()
  };
  safeWriteJsonAtomic(filePath, enriched);
  return enriched;
}

/**
 * Retrieve a job by its unique jobId from disk.
 * @param {string} jobId
 * @returns {object|null}
 */
function getJob(jobId) {
  if (!jobId || typeof jobId !== 'string') return null;
  const safeId = path.basename(jobId);
  const filePath = path.join(currentJobsDir, `${safeId}.json`);
  if (!fs.existsSync(filePath)) return null;

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    logger.warn('JOB_STORE', `Failed to read job file ${filePath}: ${err.message}`);
    return null;
  }
}

/**
 * Update specific fields of an existing job atomically.
 * @param {string} jobId
 * @param {object} updates
 * @returns {object|null}
 */
function updateJob(jobId, updates = {}) {
  const existing = getJob(jobId);
  if (!existing) return null;

  const merged = {
    ...existing,
    ...updates,
    lastHeartbeatAt: Date.now(),
    updatedAt: new Date().toISOString()
  };
  return saveJob(merged);
}

/**
 * Find an existing completed or in-flight processing job matching the idempotency key.
 * @param {string} idempotencyKey
 * @param {number} [maxAgeMs=86400000] Default 24 hours
 * @returns {object|null}
 */
function findJobByIdempotencyKey(idempotencyKey, maxAgeMs = 86400000) {
  if (!idempotencyKey) return null;
  ensureJobsDir();

  const now = Date.now();
  try {
    const files = fs.readdirSync(currentJobsDir);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const job = getJob(path.basename(file, '.json'));
      if (job && job.idempotencyKey === idempotencyKey) {
        const jobAge = now - (job.startTime || 0);
        if (jobAge <= maxAgeMs && (job.status === 'COMPLETED' || job.status === 'PROCESSING')) {
          return job;
        }
      }
    }
  } catch (err) {
    logger.warn('JOB_STORE', `Error scanning jobs for idempotency key: ${err.message}`);
  }
  return null;
}

/**
 * List all currently active (PROCESSING) jobs.
 * @returns {Array<object>}
 */
function listActiveJobs() {
  ensureJobsDir();
  const active = [];
  try {
    const files = fs.readdirSync(currentJobsDir);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const job = getJob(path.basename(file, '.json'));
      if (job && job.status === 'PROCESSING') {
        active.push(job);
      }
    }
  } catch (err) {
    logger.warn('JOB_STORE', `Error listing active jobs: ${err.message}`);
  }
  return active;
}

/**
 * Prune finished jobs older than retention window (default 24h).
 * @param {number} [retentionMs=86400000]
 * @returns {number} Count of pruned files
 */
function pruneExpiredJobs(retentionMs = 86400000) {
  ensureJobsDir();
  let pruned = 0;
  const now = Date.now();

  try {
    const files = fs.readdirSync(currentJobsDir);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const filePath = path.join(currentJobsDir, file);
      try {
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > retentionMs) {
          fs.unlinkSync(filePath);
          pruned++;
        }
      } catch (_) {}
    }
  } catch (err) {
    logger.warn('JOB_STORE', `Error pruning expired jobs: ${err.message}`);
  }
  return pruned;
}

module.exports = {
  JOBS_DIR: currentJobsDir,
  getJobsDir,
  setJobsDirectory,
  computeIdempotencyKey,
  saveJob,
  getJob,
  updateJob,
  findJobByIdempotencyKey,
  listActiveJobs,
  pruneExpiredJobs
};
