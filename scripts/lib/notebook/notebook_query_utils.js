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

const { execFile, execFileSync } = require('child_process');
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
 * Execute Cloud Query with Autonomous Exponential Backoff Retries.
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

function findMatchingChatTurn(turns, cleanPrefix) {
  if (!Array.isArray(turns) || turns.length === 0) return null;
  for (let i = turns.length - 1; i >= 0; i--) {
    const turn = turns[i];
    const queryText = String(turn.query || turn.user_query || turn.question || turn.prompt || '').toLowerCase();
    const responseText = turn.answer || turn.response || turn.text || turn.model_turn?.text || '';
    const citations = Array.isArray(turn.citations) ? turn.citations : (turn.references || []);

    const isMatch = !cleanPrefix || queryText.includes(cleanPrefix.slice(0, 30)) || cleanPrefix.includes(queryText.slice(0, 30));
    if (isMatch && responseText && responseText.length > 20) {
      return { responseText, citations };
    }
  }
  return null;
}

function attemptGatewaySessionRecovery(nlmExecutable, targetNotebookId, sanitizedQuery, extendedPath, options = {}) {
  const logger = require('../system/pipeline_logger.js');
  if (options.bypassRecovery === true) return null;
  try {
    const listArgs = ['chats', 'list', targetNotebookId, '--json'];
    const stdout = execFileSync(nlmExecutable, listArgs, {
      encoding: 'utf-8',
      timeout: 10000,
      env: { ...process.env, PATH: extendedPath }
    });
    const parsed = JSON.parse(stdout);
    const chats = Array.isArray(parsed) ? parsed : (parsed?.chats || parsed?.sessions || []);
    if (!Array.isArray(chats) || chats.length === 0) return null;

    const cleanPrefix = sanitizedQuery.slice(0, 60).toLowerCase().trim();
    for (const chat of chats.slice(0, 5)) {
      const chatId = chat.id || chat.session_id || chat.chat_id;
      if (!chatId) continue;
      try {
        const getArgs = ['chats', 'get', targetNotebookId, chatId, '--json'];
        const chatStdout = execFileSync(nlmExecutable, getArgs, {
          encoding: 'utf-8',
          timeout: 15000,
          env: { ...process.env, PATH: extendedPath }
        });
        const chatData = JSON.parse(chatStdout);
        const turns = Array.isArray(chatData?.turns) ? chatData.turns : (chatData?.messages || []);
        const matched = findMatchingChatTurn(turns, cleanPrefix);
        if (matched) {
          logger.info('NOTEBOOK_QUERY', `🎯 Successfully recovered cloud response from gateway session [${chatId.slice(0, 8)}...]!`);
          return {
            rawAnswer: matched.responseText,
            citations: matched.citations,
            chatSessionId: chatId,
            recoveredFromGateway: true
          };
        }
      } catch {}
    }
    return null;
  } catch (err) {
    logger.warn('NOTEBOOK_QUERY', `Gateway session recovery probe noted: ${err.message}`);
    return null;
  }
}

function _executeCloudQueryWithRetry(nlmExecutable, targetNotebookId, sanitizedQuery, timeoutMs, extendedPath, options = {}) {
  const logger = require('../system/pipeline_logger.js');
  const maxAttempts = typeof options === 'number' ? options : (options.maxRetries || 3);

  return new Promise((resolve, reject) => {
    let attempt = 0;
    let settled = false;
    let retryTimer;
    let activeHeartbeat;
    const cleanup = () => { clearTimeout(retryTimer); clearInterval(activeHeartbeat); options.signal?.removeEventListener('abort', onAbort); };
    const finish = (callback, value) => { if (settled) return; settled = true; cleanup(); callback(value); };
    const onAbort = () => finish(reject, options.signal.reason);
    options.signal?.addEventListener('abort', onAbort, { once: true });
    const scheduleRetry = delay => {
      if (settled) return;
      const remaining = Number.isFinite(options.deadlineAt) ? options.deadlineAt - Date.now() : Infinity;
      retryTimer = setTimeout(runAttempt, Math.max(0, Math.min(delay, remaining)));
    };

    function runAttempt() {
      if (settled) return;
      try { throwIfQueryStopped(options); } catch (error) { return finish(reject, error); }
      attempt++;
      const startTime = Date.now();
      const remaining = Number.isFinite(options.deadlineAt) ? options.deadlineAt - Date.now() : Infinity;
      const currentTimeout = Math.max(1, Math.min(timeoutMs + (attempt > 1 ? 60000 : 0), remaining)); // Add 60s buffer on retry
      const budgetMin = Math.round(currentTimeout / 60000);
      const skuCount = options.context?.skus?.length || options.context?.items?.length || 0;
      const chassisName = options.context?.chassis || 'Target Solution';
      const focusDetail = skuCount > 0 ? `validating full solution (${skuCount} SKUs) across QuickSpecs topology` : `deep grounding synthesis`;

      logger.info('NOTEBOOK_QUERY', `🚀 Dispatching Cloud Notebook query to [${targetNotebookId.slice(0, 8)}...] for ${chassisName} (${focusDetail}) (Attempt ${attempt}/${maxAttempts}, Timeout Budget: ${budgetMin}m / ${Math.round(currentTimeout / 1000)}s)...`);

      const heartbeat = setInterval(() => {
        const elapsedMs = Date.now() - startTime;
        logger.info('NOTEBOOK_QUERY', `⏳ NotebookLM deep synthesis in progress: ${focusDetail} [Elapsed: ${formatQueryDuration(elapsedMs)} / Timeout Budget: ${budgetMin}m] (Notebook: ${targetNotebookId.slice(0, 8)}...)`);
      }, 15000);
      activeHeartbeat = heartbeat;
      if (typeof heartbeat.unref === 'function') heartbeat.unref();

      const trustedSourceIds = options.querySourceIds || [];
      if (!Array.isArray(trustedSourceIds) || trustedSourceIds.length === 0) {
        clearInterval(heartbeat);
        logger.warn('NOTEBOOK_QUERY', `[INV-24 FAIL_CLOSED] Empty trusted source allowlist for [${targetNotebookId}]; refusing unconstrained query.`);
        return finish(resolve, {
          answer: 'Grounding query blocked: no authoritative or trusted sources configured for notebook (fail-closed).',
          citations: [],
          isCloudGrounded: false,
          groundingVerification: 'DEGRADED_UNGROUNDED',
          status: 'DEGRADED',
          reason: 'EMPTY_TRUSTED_SOURCE_ALLOWLIST'
        });
      }
      const queryArgs = buildNotebookQueryArgs(targetNotebookId, sanitizedQuery, trustedSourceIds, currentTimeout);
      try {
        execFile(nlmExecutable, queryArgs, {
          timeout: currentTimeout,
          signal: options.signal,
          env: { ...process.env, PATH: extendedPath },
          maxBuffer: 10 * 1024 * 1024
        }, (err, stdout, stderr) => {
          clearInterval(heartbeat);
          if (settled) return;
          try { throwIfQueryStopped(options); } catch (error) { return finish(reject, error); }
          const latencyMs = Date.now() - startTime;
          const timeTaken = formatQueryDuration(latencyMs);
  
          if (err) {
            const isTimeout = err.killed || err.code === 'ETIMEDOUT' || (err.message && err.message.includes('timeout'));
            if (isTimeout) {
              logger.warn('NOTEBOOK_QUERY', `⏱️ Cloud query attempt ${attempt}/${maxAttempts} reached timeout limit after ${timeTaken} during validation of ${skuCount} SKUs.`);
            }

            if (isTimeout || (err.message && err.message.includes('socket'))) {
              const recovered = attemptGatewaySessionRecovery(nlmExecutable, targetNotebookId, sanitizedQuery, extendedPath, options);
              if (recovered && recovered.rawAnswer) {
                const processed = postProcessNotebookResult(JSON.stringify({ answer: recovered.rawAnswer, citations: recovered.citations }), sanitizedQuery, options.context);
                if (processed && processed.answer) {
                  return finish(resolve, {
                    ...processed,
                    source: 'NOTEBOOK_LM_CLOUD_RECOVERED',
                    targetNotebookId,
                    chatSessionId: recovered.chatSessionId,
                    latencyMs,
                    timeTaken,
                    attempts: attempt,
                    isCloudGrounded: true,
                    recoveredFromGateway: true
                  });
                }
              }
            }
  
            const isRetryable = attempt < maxAttempts && (
              (err.message && (err.message.includes('429') || err.message.includes('500') || err.message.includes('503') || err.message.includes('socket')))
            );
  
            if (isRetryable) {
              const backoffMs = Math.min(10000, 1500 * Math.pow(2, attempt - 1));
              logger.warn('NOTEBOOK_QUERY', `Cloud query attempt ${attempt}/${maxAttempts} failed (${err.message || 'Transient error'}). Retrying in ${backoffMs}ms...`);
              return scheduleRetry(backoffMs);
            }
  
            return finish(reject, { err, stderr, latencyMs, timeTaken, attempts: attempt });
          }
  
          logger.info('NOTEBOOK_QUERY', `✅ NotebookLM deep synthesis completed successfully in ${timeTaken}.`);
  
          let processed = postProcessNotebookResult(stdout, sanitizedQuery, options.context);
          if (!processed || !processed.answer || processed.answer.includes('No response returned')) {
            if (attempt < maxAttempts) {
              const backoffMs = 2000;
              logger.warn('NOTEBOOK_QUERY', `Empty answer received after ${timeTaken}. Retrying attempt ${attempt + 1}/${maxAttempts} in ${backoffMs}ms...`);
              return scheduleRetry(backoffMs);
            }
          }
  
          finish(resolve, {
            ...processed,
            source: 'NOTEBOOK_LM_CLOUD',
            targetNotebookId,
            latencyMs,
            timeTaken,
            attempts: attempt
          });
        });
      } catch (error) {
        clearInterval(heartbeat);
        finish(reject, error);
      }
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
  throwIfQueryStopped(options);
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
  const timeoutMs = options.timeout || options.timeoutMs || parseInt(process.env.RAG_TIMEOUT_MS || '120000', 10);
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
    const cloudResult = await _executeCloudQueryWithRetry(nlmExecutable, targetNotebookId, sanitizedQuery, timeoutMs, extendedPath, queryOptions);
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
    const diagnostic = diagnoseNotebookFailure(targetNotebookId, failure?.err);
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
  attemptGatewaySessionRecovery,
  findMatchingChatTurn
};
