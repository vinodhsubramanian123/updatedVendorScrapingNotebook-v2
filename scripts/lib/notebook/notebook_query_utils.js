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
const os = require('os');

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
  cancelNotebookQueryJob,
  resumePendingJobs,
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
} catch {}

function persistRagCache() {
  try {
    const { safeWriteJsonAtomic } = require('../system/fs_compat.js');
    const obj = {};
    for (const [k, v] of queryCache.entries()) {
      obj[k] = v; // Already in { value, cachedAt } format
    }
    safeWriteJsonAtomic(RAG_CACHE_FILE, obj);
  } catch {}
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

const NOTEBOOK_CONFIG_FILE = path.join(__dirname, '..', '..', 'config', 'notebooks.json');

function getNotebookConfigEntry(notebookId, context = {}) {
  try {
    const cfg = JSON.parse(fs.readFileSync(NOTEBOOK_CONFIG_FILE, 'utf8'));
    const entries = Object.entries(cfg.notebooks || {});
    if (notebookId) {
      const exact = entries.find(([, entry]) => (typeof entry === 'string' ? entry : entry?.notebookId) === notebookId);
      if (exact) return { key: exact[0], entry: exact[1] };
    }

    const contextText = String(context.chassis || context.model || context.query || context.text || '').toLowerCase();
    const normalizedContext = contextText.replace(/[^a-z0-9]/g, '');

    // 1. Direct key match or alias match via product_scope
    const { resolveProductIdentity } = require('../catalog/product_scope.js');
    const resolvedProduct = resolveProductIdentity(context.chassis || context.model || contextText, cfg);
    if (resolvedProduct && cfg.notebooks[resolvedProduct.productId]) {
      return { key: resolvedProduct.productId, entry: cfg.notebooks[resolvedProduct.productId] };
    }

    // 2. Strict DL380a vs DL380 separation
    const isDl380a = /\bdl\s*380\s*a\b/i.test(contextText) || normalizedContext.includes('380a') || normalizedContext.includes('dl380a');
    if (isDl380a && cfg.notebooks['DL380a_Gen12']) {
      return { key: 'DL380a_Gen12', entry: cfg.notebooks['DL380a_Gen12'] };
    }

    // 3. Normalized key containment with strict firewall
    const matches = entries
      .map(([key, entry]) => ({ key, entry, normalizedKey: key.toLowerCase().replace(/[^a-z0-9]/g, '') }))
      .filter(item => {
        if (isDl380a) return item.normalizedKey.includes('380a');
        if (normalizedContext.includes('380') && !isDl380a && item.normalizedKey.includes('380a')) {
          return false; // Prevent DL380 from matching DL380a
        }
        return (item.normalizedKey && normalizedContext.includes(item.normalizedKey)) ||
               (normalizedContext.length >= 5 && item.normalizedKey.startsWith(normalizedContext));
      })
      .sort((a, b) => b.normalizedKey.length - a.normalizedKey.length);

    return matches[0] || null;
  } catch {
    return null;
  }
}

function getAuthoritativeSourceIds(entry = {}) {
  if (!entry || typeof entry !== 'object') return [];
  const quarantined = new Set((entry.quarantinedSourceIds || []).map(String));
  return Array.from(new Set([
    ...(entry.officialSourceIds || []),
    ...(entry.certifiedCatalogSourceIds || []),
    ...(entry.verifiedLearningSourceIds || []),
    ...(entry.canonicalKnowledgeSourceIds || [])
  ].filter(id => id && !quarantined.has(String(id))).map(String)));
}

// Retrieval may include a run-owned candidate, but that candidate is never
// vendor authority. Use the same scope for dispatch, cache and citation checks.
function resolveQuerySourceScope(notebookId, entry = {}, options = {}) {
  const authoritativeSourceIds = getAuthoritativeSourceIds(entry).sort();
  const trusted = new Set(authoritativeSourceIds);
  const requested = options.sourceIds ?? (options.sourceId ? [options.sourceId] : options.querySourceIds) ?? options.context?.authoritativeSourceIds ?? [];
  if (!Array.isArray(requested) || requested.some(id => typeof id !== 'string' || !trusted.has(id))) {
    return { valid: false, reason: 'UNTRUSTED_QUERY_SOURCE', authoritativeSourceIds, querySourceIds: [] };
  }
  const ephemeral = options.ephemeralSource;
  const ownedCandidate = ephemeral?.createdThisRun === true && ephemeral.notebookId === notebookId &&
    typeof ephemeral.sourceId === 'string' && ephemeral.sourceId.trim().length > 0 &&
    !(entry.quarantinedSourceIds || []).includes(ephemeral.sourceId);
  if (ephemeral && !ownedCandidate) {
    return { valid: false, reason: 'INVALID_EPHEMERAL_SOURCE_SCOPE', authoritativeSourceIds, querySourceIds: [] };
  }
  return {
    valid: authoritativeSourceIds.length > 0,
    reason: authoritativeSourceIds.length ? null : 'EMPTY_TRUSTED_SOURCE_ALLOWLIST',
    authoritativeSourceIds,
    querySourceIds: [...new Set([...authoritativeSourceIds, ...(ownedCandidate ? [ephemeral.sourceId] : [])])].sort()
  };
}

/**
 * Dynamically resolve target Notebook UUID:
 * 1. Explicit UUID if provided
 * 2. Exact product mapping from scripts/config/notebooks.json
 * 3. Fail closed when no dedicated mapping exists
 */
async function resolveNotebookIdAsync(requestedId, context = {}, _nlmExecutable, _extendedPath) {
  if (requestedId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedId.trim())) {
    const requested = getNotebookConfigEntry(requestedId.trim(), {});
    if (typeof requested?.entry !== 'object') return null;
    if (requested.entry.queryEnabled === false) return null;
    if (getAuthoritativeSourceIds(requested.entry).length === 0) return null;
    return requestedId.trim();
  }
  const configured = getNotebookConfigEntry(null, context);
  const configuredId = typeof configured?.entry === 'string' ? configured.entry : configured?.entry?.notebookId;
  if (typeof configured?.entry !== 'object') return null;
  if (configured.entry?.queryEnabled === false) return null;
  if (getAuthoritativeSourceIds(configured.entry).length === 0) return null;
  if (configuredId && /^[0-9a-f-]{36}$/i.test(configuredId)) return configuredId;

  // Fail-closed to null if no explicit or dedicated notebook is mapped.
  // Never cross-contaminate unmapped chassis with the DL380 Gen12 notebook (INV-24).
  return null;
}

/**
 * Execute one durable cloud query without ambiguous resubmission.
 */
function buildNotebookQueryArgs(targetNotebookId, sanitizedQuery, trustedSourceIds, timeoutMs) {
  const args = ['notebook', 'query', targetNotebookId, sanitizedQuery];
  if (trustedSourceIds.length > 0) args.push('--source-ids', trustedSourceIds.join(','));
  args.push('--timeout', String(Math.ceil(timeoutMs / 1000)), '--new-conversation', '--json');
  return args;
}

function formatQueryDuration(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}m ${sec < 10 ? '0' : ''}${sec}s (${ms}ms)`;
}

function throwIfQueryStopped(options) {
  if (options.signal?.aborted) throw options.signal.reason;
  if (Number.isFinite(options.deadlineAt) && Date.now() >= options.deadlineAt) {
    const error = new Error('NotebookLM query deadline exceeded');
    error.code = 'NOTEBOOK_QUERY_DEADLINE_EXCEEDED';
    throw error;
  }
}

// Compatibility helper only: an exact whole question is necessary, never sufficient,
// for remote provenance. Automatic query execution does not call this helper.
function findMatchingChatTurn(turns, wholeQuestion) {
  if (!Array.isArray(turns) || typeof wholeQuestion !== 'string' || !wholeQuestion.trim()) return null;
  const expected = wholeQuestion.trim();
  const matches = turns.filter(turn => {
    const query = turn?.query ?? turn?.user_query ?? turn?.question ?? turn?.prompt;
    return typeof query === 'string' && query.trim() === expected;
  });
  if (matches.length !== 1) return null;
  const turn = matches[0];
  const responseText = turn.answer || turn.response || turn.text || turn.model_turn?.text;
  if (typeof responseText !== 'string' || !responseText.trim()) return null;
  return { responseText, citations: Array.isArray(turn.citations) ? turn.citations : (Array.isArray(turn.references) ? turn.references : []) };
}

// Retain the public name while failing closed. No verified attempt-owned transcript
// polling contract exists; a supplied local job/conversation ID does not prove it.
function attemptGatewaySessionRecovery(_nlmExecutable, _notebookId, _wholeQuestion, _extendedPath, _options = {}) {
  return null;
}

function _executeCloudQuery(nlmExecutable, targetNotebookId, sanitizedQuery, timeoutMs, extendedPath, options = {}) {
  const logger = require('../system/pipeline_logger.js');
  const { createAttempt, markRemoteUnknown, returnedConversationId } = require('./query_attempt_record.js');
  return new Promise((resolve, reject) => {
    let settled = false, heartbeat, attemptRecord, child, dispatched = false;
    const cleanup = () => { clearInterval(heartbeat); options.signal?.removeEventListener('abort', onAbort); };
    const finish = (callback, value, fields) => {
      if (settled) return;
      settled = true;
      attemptRecord?.update({ finishedAt: Date.now(), ...fields });
      if (value?.queryAttempt && attemptRecord?.diagnostic().persistence) value.queryAttempt.persistence = attemptRecord.diagnostic().persistence;
      cleanup();
      callback(value);
    };
    const failUnknown = error => {
      markRemoteUnknown(error, () => attemptRecord?.diagnostic() || null, options.signal);
      finish(reject, error, { status: 'LOCAL_QUERY_FAILED', verification: 'NOT_VERIFIED', remoteState: 'REMOTE_STATE_UNKNOWN',
        error: { name: error?.name || null, code: error?.code || null, message: error?.message || null } });
    };
    const onAbort = () => {
      if (dispatched) markRemoteUnknown(options.signal.reason, () => attemptRecord?.diagnostic() || null, options.signal);
      finish(reject, options.signal.reason, { status: dispatched ? 'LOCAL_ABORT_REQUESTED' : 'ABORTED_BEFORE_DISPATCH',
        verification: 'NOT_VERIFIED', remoteState: dispatched ? 'REMOTE_STATE_UNKNOWN' : 'NOT_SUBMITTED' });
    };
    options.signal?.addEventListener('abort', onAbort, { once: true });
    try {
      throwIfQueryStopped(options);
      const currentTimeout = Math.max(1, Math.min(timeoutMs, options.deadlineAt - Date.now()));
      const trustedSourceIds = options.querySourceIds || [];
      if (!Array.isArray(trustedSourceIds) || trustedSourceIds.length === 0) {
        return finish(resolve, { answer: 'Grounding query blocked: no authoritative or trusted sources configured for notebook (fail-closed).',
          citations: [], isCloudGrounded: false, source: 'NOTEBOOK_LM_CLOUD', targetNotebookId,
          fallbackReason: 'No trusted sources configured', attempts: 0 });
      }
      attemptRecord = createAttempt({ notebookId: targetNotebookId, query: sanitizedQuery, sourceIds: trustedSourceIds,
        startedAt: Date.now(), deadlineAt: options.deadlineAt, timeoutMs: currentTimeout });
      if (settled) return;
      if (typeof options.onAttempt === 'function') options.onAttempt(attemptRecord.diagnostic());
      throwIfQueryStopped(options);
      const startTime = Date.now();
      logger.info('NOTEBOOK_QUERY', 'Dispatching one logical NotebookLM query. Ambiguous failure never triggers automatic resubmission.');
      heartbeat = setInterval(() => logger.info('NOTEBOOK_QUERY', 'NotebookLM local CLI pending; elapsed ' + formatQueryDuration(Date.now() - startTime)), 15000);
      heartbeat.unref?.();
      dispatched = true;
      child = execFile(nlmExecutable, buildNotebookQueryArgs(targetNotebookId, sanitizedQuery, trustedSourceIds, currentTimeout), {
        timeout: currentTimeout, signal: options.signal, env: { ...process.env, PATH: extendedPath }, maxBuffer: 10 * 1024 * 1024
      }, (error, stdout, stderr) => {
        const conversationId = returnedConversationId(stdout);
        if (conversationId) attemptRecord.update({ conversationId });
        if (settled) return;
        try {
          if (error) {
            // Native spawn ENOENT plus absent local PID proves this local command never started.
            // It still does not merit an automatic new-conversation retry.
            if (error.code === 'ENOENT' && String(error.syscall || '').startsWith('spawn') && !child?.pid) {
              return finish(reject, error, { status: 'SPAWN_FAILED_BEFORE_SUBMISSION', remoteState: 'NOT_SUBMITTED', verification: 'NOT_VERIFIED' });
            }
            return failUnknown(error);
          }
          throwIfQueryStopped(options);
          const processed = postProcessNotebookResult(stdout, sanitizedQuery, options.context);
          if (!processed?.answer || processed.answer.includes('No response returned')) {
            const empty = new Error('NotebookLM returned no usable response; remote state is unknown. Do not automatically resubmit.');
            empty.code = 'NOTEBOOK_QUERY_REMOTE_STATE_UNKNOWN';
            return failUnknown(empty);
          }
          const latencyMs = Date.now() - startTime;
          finish(resolve, { ...processed, source: 'NOTEBOOK_LM_CLOUD', targetNotebookId, latencyMs,
            timeTaken: formatQueryDuration(latencyMs), attempts: 1,
            queryAttempt: { ...attemptRecord.diagnostic(), verification: processed.groundingVerification || 'NOT_VERIFIED', remoteState: 'RESPONSE_RECEIVED' } },
          { status: 'LOCAL_RESPONSE_RECEIVED', remoteState: 'RESPONSE_RECEIVED', verification: processed.groundingVerification || 'NOT_VERIFIED' });
        } catch (failure) { failUnknown(failure); }
      });
      if (child?.pid) attemptRecord.update({ localChildPid: child.pid });
    } catch (failure) {
      // Synchronous executor validation/spawn throws cannot have submitted a remote query.
      if (dispatched) return failUnknown(failure);
      finish(reject, failure, { status: 'LOCAL_EXECUTOR_THROW', remoteState: dispatched ? 'REMOTE_STATE_UNKNOWN' : 'NOT_SUBMITTED', verification: 'NOT_VERIFIED' });
    }
  });
}

/**
 * Safely execute Gemini Notebook query via nlm CLI with full guardrails:
 * - Dynamic live notebook resolution
 * - One submission with durable remote-ambiguity provenance
 * - Strict Cloud Mode vs Verified Safety Net Dual-Brain Fallback
 * - Rich diagnostic provenance tracking
 *
 * @param {string} notebookId 
 * @param {string} rawQuery 
 * @param {object} [options] 
 * @returns {Promise<object>} Normalized result { query, answer, citations, source, isCloudGrounded }
 */
async function executeNotebookQuery(notebookId, rawQuery, options = {}) {
  throwIfQueryStopped(options);
  options = require('../system/execution_budget.js').logicalQueryOptions(options, Date.now(), parseInt(process.env.RAG_TIMEOUT_MS || '600000', 10));
  const { queryLocalKnowledgeBase } = require('../rag/local_rag_search.js');
  const logger = require('../system/pipeline_logger.js');

  const envPath = process.env.PATH || '';
  const homeBin = path.join(os.homedir(), '.local', 'bin');
  const macPaths = process.platform === 'darwin' ? ['/opt/homebrew/bin', '/usr/local/bin'] : [];
  const extendedPath = [homeBin, ...macPaths, envPath].filter(Boolean).join(path.delimiter);

  const binName = process.platform === 'win32' ? 'nlm.exe' : 'nlm';
  const nlmUserPath = path.join(homeBin, binName);
  const macHomebrewPath = path.join('/opt/homebrew', 'bin', binName);
  const macUsrPath = path.join('/usr/local', 'bin', binName);
  const nlmExecutable = fs.existsSync(nlmUserPath)
    ? nlmUserPath
    : (fs.existsSync(macHomebrewPath) ? macHomebrewPath : (fs.existsSync(macUsrPath) ? macUsrPath : binName));

  const targetNotebookId = await resolveNotebookIdAsync(notebookId, options.context, nlmExecutable, extendedPath);
  throwIfQueryStopped(options);
  const sanitizedQuery = sanitizeNotebookQuery(rawQuery, options.context);
  const timeoutMs = options.queryTimeoutMs;
  const isStrictCloud = options.strictCloud === true || process.env.STRICT_NOTEBOOKLM_MODE === '1';

  // Fail-closed to Local RAG if no notebook mapped for this chassis
  if (!targetNotebookId) {
    logger.info('NOTEBOOK_QUERY', 'No dedicated Notebook ID configured for this product. Failing-closed to deterministic Local RAG.');
    const localRes = queryLocalKnowledgeBase(rawQuery, options.context ? options.context.chassis : '');
    return {
      ...localRes,
      source: 'LOCAL_RAG_FALLBACK',
      isCloudGrounded: false,
      fallbackReason: 'No dedicated Notebook ID configured for this product (fail-closed to local rules)'
    };
  }

  const configured = getNotebookConfigEntry(targetNotebookId, options.context || {});
  const configuredEntry = configured && typeof configured.entry === 'object' ? configured.entry : {};
  const scope = resolveQuerySourceScope(targetNotebookId, configuredEntry, options);
  const { authoritativeSourceIds, querySourceIds: combinedSourceIds } = scope;

  if (!scope.valid) {
    logger.info('NOTEBOOK_QUERY', 'Notebook has no canary-verified trusted source allow-list (INV-24 fail-closed).');
    const localRes = queryLocalKnowledgeBase(rawQuery, options.context ? options.context.chassis : '');
    return {
      ...localRes,
      source: 'LOCAL_RAG_FALLBACK',
      isCloudGrounded: false,
      fallbackReason: scope.reason
    };
  }

  const cacheKey = `trusted_query_v2:${targetNotebookId}:${sanitizedQuery.trim()}:${JSON.stringify(configuredEntry)}:${JSON.stringify(combinedSourceIds)}`;
  if (!options.bypassCache && !options.offlineMode && !options.useLocalRagOnly && process.env.USE_LOCAL_RAG_ONLY !== '1' && process.env.LOCAL_EVAL_ONLY !== '1') {
    const cached = getCachedRagResult(cacheKey);
    const verifiedCache = cached && postProcessNotebookResult(cached, sanitizedQuery, { ...options.context, authoritativeSourceIds });
    if (verifiedCache?.isCloudGrounded === true && verifiedCache?.groundingVerification === 'VERIFIED_GROUNDED') {
      logger.info('NOTEBOOK_QUERY', `RAG query cache hit (fresh) for key [${cacheKey.slice(0, 40)}...]`);
      return { ...cached, cached: true };
    } else if (cached) {
      queryCache.delete(cacheKey);
      persistRagCache();
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

  try {
    const queryOptions = {
      ...options,
      querySourceIds: combinedSourceIds,
      context: { ...options.context, authoritativeSourceIds }
    };
    const cloudResult = await _executeCloudQuery(nlmExecutable, targetNotebookId, sanitizedQuery, timeoutMs, extendedPath, queryOptions);
    throwIfQueryStopped(options);
    if (cloudResult.groundingVerification === 'VERIFIED_GROUNDED') {
      cloudResult.isCloudGrounded = true;
      cloudResult.groundingTier = 'TIER_1_LIVE_CLOUD_GROUNDED';
    } else {
      cloudResult.isCloudGrounded = false;
      // Preserve groundingTier and warning from validateGroundingCitations
    }

    if (cloudResult.isCloudGrounded && cloudResult.answer && !cloudResult.answer.includes('No response returned')) {
      setCachedRagResult(cacheKey, cloudResult);
    }
    return cloudResult;
  } catch (failure) {
    if ((options.signal?.aborted && Object.is(failure, options.signal.reason)) || failure?.code === 'NOTEBOOK_QUERY_DEADLINE_EXCEEDED') throw failure;
    if (require('./query_attempt_record.js').isRemoteUnknown(failure)) throw failure;
    const diagnostic = diagnoseNotebookFailure(targetNotebookId, failure?.err || failure);
    const timeTaken = failure?.timeTaken || (failure?.latencyMs ? `${Math.floor(failure.latencyMs / 1000)}s` : 'unknown');
    diagnostic.timeTaken = timeTaken;
    diagnostic.latencyMs = failure?.latencyMs || 0;
    logger.warn('NOTEBOOK_QUERY', `Live NotebookLM Cloud query failed after ${failure?.attempts || 1} attempts and ${timeTaken} (${diagnostic.rootCause}).`, { diagnostic, stderr: failure?.stderr });

    if (isStrictCloud) {
      return {
        query: sanitizedQuery,
        answer: `STRICT_CLOUD_ERROR: Live NotebookLM Cloud query failed (${diagnostic.rootCause}). Remediation: ${diagnostic.remediationAction}`,
        citations: [],
        source: 'NOTEBOOK_LM_FAILED',
        isCloudGrounded: false,
        diagnostic,
        latencyMs: failure?.latencyMs || 0,
        timeTaken,
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
      latencyMs: failure?.latencyMs || 0,
      timeTaken,
      fallbackReason: `Live Cloud Query Error: ${diagnostic.rootCause} (Elapsed: ${timeTaken}, Attempts: ${failure?.attempts || 1})`
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

const RAG_TIMEOUT_MS = 600000;

module.exports = {
  SCRIPTING_PATTERNS,
  sanitizeNotebookQuery,
  getSanitizationBreakdown,
  classifyQueryScenario,
  stripAnsi,
  postProcessNotebookResult,
  buildNotebookQueryArgs,
  resolveNotebookIdAsync,
  executeNotebookQuery,
  getNotebookQueryRecovery: (...args) => require('./query_attempt_record.js').getNotebookQueryRecovery(...args),
  startAsyncNotebookQueryJob,
  getAsyncNotebookQueryJobStatus,
  cancelNotebookQueryJob,
  resumePendingJobs,
  diagnoseNotebookFailure,
  activeQueryJobs,
  extractKnowledgeFromRagAnswer,
  extractAndPersistLearnedDeltas,
  getCachedRagResult,
  setCachedRagResult,
  purgeExpiredRagCache,
  queryCache,
  RAG_CACHE_TTL_MS,
  RAG_TIMEOUT_MS,
  getAuthoritativeSourceIds,
  getNotebookConfigEntry,
  resolveQuerySourceScope,
  findMatchingChatTurn,
  attemptGatewaySessionRecovery
};
