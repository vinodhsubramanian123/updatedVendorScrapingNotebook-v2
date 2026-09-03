'use strict';
/**
 * scripts/lib/notebook_query_utils.js — Centralized Gemini Notebook Query Coordinator
 *
 * Coordinates query sanitization, execution via nlm CLI, async job tracking,
 * and result post-processing.
 *
 * Refactored into modular subcomponents:
 * - scripts/lib/notebook/query_sanitizer.js
 * - scripts/lib/notebook/query_diagnostics.js
 * - scripts/lib/notebook/job_manager.js
 */

const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

const {
  SCRIPTING_PATTERNS,
  classifyQueryScenario,
  stripAnsi,
  sanitizeNotebookQuery,
  getSanitizationBreakdown
} = require('./query_sanitizer.js');

const {
  postProcessNotebookResult,
  diagnoseNotebookFailure
} = require('./query_diagnostics.js');

const {
  startAsyncNotebookQueryJob: startJob,
  getAsyncNotebookQueryJobStatus,
  activeQueryJobs
} = require('./job_manager.js');

// Fast in-memory & disk cache for repeated RAG queries within and across workflow steps
// Cache entries: { value: <result>, cachedAt: <ISO timestamp> }
const queryCache = new Map();
const RAG_CACHE_FILE = path.join(__dirname, '..', '..', '..', 'outputs', 'history', 'rag_cache.json');
const RAG_CACHE_TTL_MS = parseInt(process.env.RAG_CACHE_TTL_MS || String(24 * 60 * 60 * 1000), 10); // 24h default

function isCacheEntryFresh(entry) {
  if (!entry || !entry.cachedAt) return false;
  return (Date.now() - new Date(entry.cachedAt).getTime()) < RAG_CACHE_TTL_MS;
}

try {
  if (fs.existsSync(RAG_CACHE_FILE)) {
    const rawDisk = JSON.parse(fs.readFileSync(RAG_CACHE_FILE, 'utf-8'));
    if (typeof rawDisk === 'object' && rawDisk !== null) {
      let loadedCount = 0, evictedCount = 0;
      for (const [k, v] of Object.entries(rawDisk)) {
        // Support both old format (plain object) and new format ({value, cachedAt})
        const entry = (v && typeof v === 'object' && v.cachedAt) ? v : { value: v, cachedAt: new Date(0).toISOString() };
        if (isCacheEntryFresh(entry)) {
          queryCache.set(k, entry);
          loadedCount++;
        } else {
          evictedCount++;
        }
      }
      if (evictedCount > 0) {
        require('../system/pipeline_logger.js').info('RAG_CACHE', `Evicted ${evictedCount} stale cache entries (TTL: ${RAG_CACHE_TTL_MS / 3600000}h). Loaded ${loadedCount} fresh entries.`);
      }
    }
  }
} catch (_) {}

function persistRagCache() {
  try {
    const { safeWriteJsonAtomic } = require('../system/fs_compat.js');
    const obj = {};
    for (const [k, v] of queryCache.entries()) {
      obj[k] = v; // Already in { value, cachedAt } format
    }
    safeWriteJsonAtomic(RAG_CACHE_FILE, obj);
  } catch (_) {}
}

/**
 * Get a cached RAG result for a given cache key, respecting TTL.
 * Returns null if the entry is absent or stale.
 */
function getCachedRagResult(cacheKey) {
  const entry = queryCache.get(cacheKey);
  if (!entry) return null;
  if (!isCacheEntryFresh(entry)) {
    queryCache.delete(cacheKey); // Evict stale entry
    return null;
  }
  return entry.value;
}

/**
 * Store a RAG result in the cache with the current timestamp.
 */
function setCachedRagResult(cacheKey, result) {
  queryCache.set(cacheKey, { value: result, cachedAt: new Date().toISOString() });
  persistRagCache();
}

const KNOWN_NOTEBOOK_MAP = {
  'dl380_gen12': '1d190853-4e9c-48df-aa70-eae66c6f2c1f',
  'dl380_gen11': 'd37fa851-90cb-45b7-a8e1-78488a0bc6e6',
  'dl380a_gen12': 'b233ec88-4682-4164-a801-3ee6ca649dc1',
  'dl145_gen11': '7a48061a-331a-429b-8477-7e0473491714',
  'alletra': 'a67629ba-3434-42ab-b465-bd6d71852198',
  'synergy': '49a3c69e-115f-4332-9454-c5d4f2941327'
};

// In-memory cache for live notebook catalog from nlm CLI (10 min TTL)
let _cachedNotebookList = null;
let _cachedNotebookListTime = 0;
const NOTEBOOK_LIST_CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Fetch and memoize live notebook catalog from Google NotebookLM via nlm CLI.
 */
function fetchLiveNotebookCatalog(nlmExecutable, extendedPath) {
  const now = Date.now();
  if (_cachedNotebookList && (now - _cachedNotebookListTime) < NOTEBOOK_LIST_CACHE_TTL_MS) {
    return Promise.resolve(_cachedNotebookList);
  }
  return new Promise((resolve) => {
    execFile(nlmExecutable, ['notebook', 'list', '--json'], {
      timeout: 15000,
      env: { ...process.env, PATH: extendedPath },
      maxBuffer: 5 * 1024 * 1024
    }, (err, stdout) => {
      if (err || !stdout) {
        return resolve(_cachedNotebookList || []);
      }
      try {
        const clean = stripAnsi(stdout).trim();
        const parsed = JSON.parse(clean);
        if (Array.isArray(parsed)) {
          _cachedNotebookList = parsed;
          _cachedNotebookListTime = now;
        }
      } catch (_) {}
      resolve(_cachedNotebookList || []);
    });
  });
}

/**
 * Dynamically resolve target Notebook UUID:
 * 1. Explicit UUID if provided
 * 2. Static fast-path map (DL380 Gen12, Gen11, Alletra, Synergy)
 * 3. Live fuzzy-match against Google NotebookLM notebook catalog
 * 4. Safe flagship DL380 Gen12 fallback
 */
async function resolveNotebookIdAsync(requestedId, context = {}, nlmExecutable, extendedPath) {
  if (requestedId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedId.trim())) {
    return requestedId.trim();
  }
  const chassis = String(context?.chassis || context?.model || '').toLowerCase();
  if (chassis.includes('dl380a')) return KNOWN_NOTEBOOK_MAP.dl380a_gen12;
  if (chassis.includes('dl145')) return KNOWN_NOTEBOOK_MAP.dl145_gen11;
  if (chassis.includes('gen12') || chassis.includes('dl380 gen12')) return KNOWN_NOTEBOOK_MAP.dl380_gen12;
  if (chassis.includes('gen11') || chassis.includes('dl380 gen11')) return KNOWN_NOTEBOOK_MAP.dl380_gen11;
  if (chassis.includes('alletra')) return KNOWN_NOTEBOOK_MAP.alletra;
  if (chassis.includes('synergy')) return KNOWN_NOTEBOOK_MAP.synergy;

  // Live dynamic catalog fuzzy matching
  try {
    const list = await fetchLiveNotebookCatalog(nlmExecutable, extendedPath);
    if (Array.isArray(list) && list.length > 0 && chassis) {
      const match = list.find(nb => {
        const title = (nb.title || '').toLowerCase();
        return title.includes(chassis) || (chassis.includes('380') && title.includes('380'));
      });
      if (match && match.id) return match.id;
    }
  } catch (_) {}

  return KNOWN_NOTEBOOK_MAP.dl380_gen12; // Default to flagship Gen12 notebook
}

/**
 * Execute Cloud Query with Autonomous Exponential Backoff Retries.
 */
function _executeCloudQueryWithRetry(nlmExecutable, targetNotebookId, sanitizedQuery, timeoutMs, extendedPath, maxAttempts = 3) {
  const logger = require('../system/pipeline_logger.js');

  return new Promise((resolve, reject) => {
    let attempt = 0;

    function runAttempt() {
      attempt++;
      const startTime = Date.now();
      const currentTimeout = timeoutMs + (attempt > 1 ? 30000 : 0); // Add 30s buffer on retry

      execFile(nlmExecutable, ['notebook', 'query', targetNotebookId, sanitizedQuery, '--json'], {
        timeout: currentTimeout,
        env: { ...process.env, PATH: extendedPath },
        maxBuffer: 10 * 1024 * 1024
      }, (err, stdout, stderr) => {
        const latencyMs = Date.now() - startTime;

        if (err) {
          const isTimeout = err.killed || err.code === 'ETIMEDOUT' || (err.message && err.message.includes('timeout'));
          const isRetryable = !isTimeout && attempt < maxAttempts && (
            (err.message && (err.message.includes('429') || err.message.includes('500') || err.message.includes('503') || err.message.includes('socket')))
          );

          if (isRetryable) {
            const backoffMs = Math.min(10000, 1500 * Math.pow(2, attempt - 1));
            logger.warn('NOTEBOOK_QUERY', `Cloud query attempt ${attempt}/${maxAttempts} failed (${err.message || 'Transient error'}). Retrying in ${backoffMs}ms...`);
            return setTimeout(runAttempt, backoffMs);
          }

          return reject({ err, stderr, latencyMs, attempts: attempt });
        }

        let processed = postProcessNotebookResult(stdout, sanitizedQuery);
        if (!processed || !processed.answer || processed.answer.includes('No response returned')) {
          if (attempt < maxAttempts) {
            const backoffMs = 2000;
            logger.warn('NOTEBOOK_QUERY', `Empty response on attempt ${attempt}/${maxAttempts}. Retrying in ${backoffMs}ms...`);
            return setTimeout(runAttempt, backoffMs);
          }
        }

        processed.latencyMs = latencyMs;
        processed.attempts = attempt;
        processed.targetNotebookId = targetNotebookId;
        resolve(processed);
      });
    }

    runAttempt();
  });
}

/**
 * Safely execute Gemini Notebook query via nlm CLI with full guardrails:
 * - Dynamic live notebook resolution
 * - Autonomous exponential backoff retries (3 attempts)
 * - Strict Cloud Mode vs Verified Safety Net Dual-Brain Fallback
 * - Rich diagnostic provenance tracking
 *
 * @param {string} notebookId 
 * @param {string} rawQuery 
 * @param {object} [options] 
 * @returns {Promise<object>} Normalized result { query, answer, citations, source, isCloudGrounded }
 */
async function executeNotebookQuery(notebookId, rawQuery, options = {}) {
  const { queryLocalKnowledgeBase } = require('../rag/local_rag_search.js');
  const logger = require('../system/pipeline_logger.js');

  const envPath = process.env.PATH || '';
  const homeBin = path.join(process.env.HOME || '', '.local', 'bin');
  const nvmBin = path.join(process.env.HOME || '', '.nvm', 'versions', 'node', 'v22.12.0', 'bin');
  const extendedPath = `${nvmBin}:${homeBin}:${envPath}`;

  const nlmUserPath = path.join(homeBin, 'nlm');
  const hasNlm = fs.existsSync(nlmUserPath) || fs.existsSync(path.join(homeBin, 'nlm.cmd'));
  const nlmExecutable = fs.existsSync(nlmUserPath) ? nlmUserPath : 'nlm';

  const targetNotebookId = await resolveNotebookIdAsync(notebookId, options.context, nlmExecutable, extendedPath);
  const sanitizedQuery = sanitizeNotebookQuery(rawQuery, options.context);
  const timeoutMs = options.timeout || parseInt(process.env.RAG_TIMEOUT_MS || '120000', 10);
  const isStrictCloud = options.strictCloud === true || process.env.STRICT_NOTEBOOKLM_MODE === '1';

  const cacheKey = `${targetNotebookId}:${sanitizedQuery.trim()}`;
  if (!options.bypassCache) {
    const cached = getCachedRagResult(cacheKey);
    if (cached) {
      logger.info('NOTEBOOK_QUERY', `RAG query cache hit (fresh) for key [${cacheKey.slice(0, 40)}...]`);
      return { ...cached, cached: true };
    }
  }

  if (process.env.USE_LOCAL_RAG_ONLY === '1' || process.env.LOCAL_EVAL_ONLY === '1' || options.offlineMode === true || options.useLocalRagOnly === true) {
    const localRes = queryLocalKnowledgeBase(rawQuery, options.context ? options.context.chassis : '');
    return {
      ...localRes,
      source: 'LOCAL_RAG_FALLBACK',
      isCloudGrounded: false,
      fallbackReason: options.offlineMode ? 'Offline evaluation mode requested in options' : 'Local evaluation mode explicitly configured (USE_LOCAL_RAG_ONLY/LOCAL_EVAL_ONLY)'
    };
  }

  if (!hasNlm) {
    logger.warn('NOTEBOOK_QUERY', 'nlm CLI executable not found in PATH (~/.local/bin/nlm). Falling back to Local RAG.');
    const localRes = queryLocalKnowledgeBase(rawQuery, options.context ? options.context.chassis : '');
    return {
      ...localRes,
      source: 'LOCAL_RAG_FALLBACK',
      isCloudGrounded: false,
      fallbackReason: 'NLM CLI executable not installed in environment'
    };
  }

  try {
    const cloudResult = await _executeCloudQueryWithRetry(nlmExecutable, targetNotebookId, sanitizedQuery, timeoutMs, extendedPath, options.maxRetries || 3);
    cloudResult.isCloudGrounded = true;
    cloudResult.groundingTier = 'TIER_1_LIVE_CLOUD_GROUNDED';

    if (cloudResult.answer && !cloudResult.answer.includes('No response returned')) {
      setCachedRagResult(cacheKey, cloudResult);
    }
    return cloudResult;
  } catch (failure) {
    const diagnostic = diagnoseNotebookFailure(targetNotebookId, failure?.err);
    logger.warn('NOTEBOOK_QUERY', `Live NotebookLM Cloud query failed after ${failure?.attempts || 1} attempts (${diagnostic.rootCause}).`, { diagnostic, stderr: failure?.stderr });

    if (isStrictCloud) {
      return {
        query: sanitizedQuery,
        answer: `STRICT_CLOUD_ERROR: Live NotebookLM Cloud query failed (${diagnostic.rootCause}). Remediation: ${diagnostic.remediationAction}`,
        citations: [],
        source: 'NOTEBOOK_LM_FAILED',
        isCloudGrounded: false,
        diagnostic,
        error: failure?.err?.message || 'Strict Cloud Query Failure'
      };
    }

    // Safety net fallback to Local Rule RAG with rich diagnostics
    const localRes = queryLocalKnowledgeBase(rawQuery, options.context ? options.context.chassis : '');
    return {
      ...localRes,
      source: 'LOCAL_RAG_FALLBACK',
      isCloudGrounded: false,
      groundingTier: 'TIER_2_VERIFIED_LOCAL_SAFETY_NET',
      diagnostic,
      fallbackReason: `Live Cloud Query Error: ${diagnostic.rootCause} (Attempts: ${failure?.attempts || 1})`
    };
  }
}

function startAsyncNotebookQueryJob(notebookId, rawQuery, options = {}) {
  return startJob(notebookId, rawQuery, options, executeNotebookQuery);
}

const {
  extractKnowledgeFromRagAnswer,
  extractAndPersistLearnedDeltas
} = require('./knowledge_extractor.js');

function purgeExpiredRagCache() {
  let evicted = 0;
  for (const [k, entry] of queryCache.entries()) {
    if (!isCacheEntryFresh(entry)) {
      queryCache.delete(k);
      evicted++;
    }
  }
  if (evicted > 0) persistRagCache();
  return evicted;
}

const RAG_TIMEOUT_MS = 120000;

module.exports = {
  SCRIPTING_PATTERNS,
  sanitizeNotebookQuery,
  getSanitizationBreakdown,
  classifyQueryScenario,
  stripAnsi,
  postProcessNotebookResult,
  executeNotebookQuery,
  startAsyncNotebookQueryJob,
  getAsyncNotebookQueryJobStatus,
  diagnoseNotebookFailure,
  activeQueryJobs,
  extractKnowledgeFromRagAnswer,
  extractAndPersistLearnedDeltas,
  getCachedRagResult,
  setCachedRagResult,
  purgeExpiredRagCache,
  queryCache,
  RAG_CACHE_TTL_MS,
  RAG_TIMEOUT_MS
};
