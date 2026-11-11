'use strict';
const path = require('path');
const fs = require('fs');
const { safeWriteJsonAtomic } = require('../../scripts/lib/system/fs_compat.js');
const DEFAULT_RUNS_DIR = path.resolve(__dirname, '../../outputs/history/dashboard_runs');

function getRunsDir() {
  return process.env.DASHBOARD_RUNS_DIR ? path.resolve(process.env.DASHBOARD_RUNS_DIR) : DEFAULT_RUNS_DIR;
}

function getStatePath() {
  return path.join(getRunsDir(), 'latest.json');
}

function shouldPersist() {
  return process.env.NODE_ENV !== 'test' || Boolean(process.env.DASHBOARD_RUNS_DIR);
}

const MAX_RUNS_HISTORY = 50;
const runsById = new Map();
let snapshot = { activeTask: null, latestResult: null, latestQueryResult: null, logs: [], progress: null };
let sequence = 0;
let latestTaskId = null;
const latestRunByResult = new Map();
const resultFieldByTask = { EVAL_BOQ: 'latestResult', PRESALES_QUERY: 'latestQueryResult' };

function isValidRunId(runId) {
  return typeof runId === 'string' && /^[a-zA-Z0-9_-]{2,80}$/.test(runId);
}

function persistRunRecord(run) {
  if (!run || !isValidRunId(run.runId) || !shouldPersist()) return;
  const now = Date.now();
  run.updatedAt = now;
  try {
    const dir = getRunsDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    safeWriteJsonAtomic(path.join(dir, `${run.runId}.json`), {
      runId: run.runId,
      task: run.task,
      product: run.product,
      startTime: run.startTime,
      status: run.status,
      stage: run.stage || null,
      exitCode: run.exitCode,
      durationMs: run.durationMs,
      effectivePolicy: run.effectivePolicy || null,
      inputDescriptor: run.inputDescriptor || null,
      inputSha256: run.inputSha256 || run.inputDescriptor?.sha256 || null,
      inputRef: run.inputRef || run.inputDescriptor?.filepath || null,
      candidateReference: run.candidateReference || null,
      evidenceRefs: run.evidenceRefs || null,
      error: run.error || null,
      cancellationRequested: Boolean(run.cancellationRequested),
      interruptedAt: run.interruptedAt || null,
      logs: run.logs,
      progress: run.progress,
      result: run.result,
      queryResult: run.queryResult,
      ragJobId: run.ragJobId,
      updatedAt: now
    });
  } catch (err) {
    console.error(`[runState] Could not persist run ${run.runId}:`, err.message);
  }
}

function persistResult() {
  if (!shouldPersist()) return;
  try {
    const dir = getRunsDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    safeWriteJsonAtomic(getStatePath(), {
      latestResult: snapshot.latestResult,
      latestQueryResult: snapshot.latestQueryResult
    });
  } catch (err) {
    console.error('[runState] Could not persist result:', err.message);
  }
}

function _loadSortedRunFiles(dir) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'latest.json');
  const parsed = [];
  for (const f of files) {
    try {
      const fullPath = path.join(dir, f);
      const runData = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      if (!runData || !isValidRunId(runData.runId)) continue;
      if (runData.status === 'RUNNING') {
        runData.status = 'INTERRUPTED';
        runData.stage = 'INTERRUPTED';
        runData.interruptedAt = Date.now();
        runData.error = runData.error || { code: 'INTERRUPTED_BY_RESTART', message: 'Backend restarted before run completed' };
        try { safeWriteJsonAtomic(fullPath, runData); } catch (_) {}
      }
      parsed.push(runData);
    } catch (_) {}
  }
  parsed.sort((a, b) => {
    const startDiff = Number(a.startTime || a.updatedAt || 0) - Number(b.startTime || b.updatedAt || 0);
    if (startDiff !== 0) return startDiff;
    return Number(a.updatedAt || 0) - Number(b.updatedAt || 0);
  });
  return parsed;
}

function _initHistoricalRuns() {
  if (!shouldPersist()) return;
  try {
    const dir = getRunsDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const parsed = _loadSortedRunFiles(dir);
    const recent = parsed.slice(-MAX_RUNS_HISTORY);
    for (const runData of recent) {
      runsById.set(runData.runId, runData);
    }
    if (recent.length > 0) {
      latestTaskId = recent[recent.length - 1].runId;
    }
  } catch (err) {
    console.warn('[runState] Historical runs init warning:', err.message);
  }
}

_initHistoricalRuns();

function _hydrateSnapshotResultsFromSavedState() {
  try {
    const statePath = getStatePath();
    if (shouldPersist() && fs.existsSync(statePath)) {
      const saved = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      snapshot.latestResult = saved.latestResult || null;
      snapshot.latestQueryResult = saved.latestQueryResult || null;
    }
  } catch (err) {
    console.warn('[runState] Saved result unavailable:', err.message);
  }
  const allLoaded = Array.from(runsById.values());
  if (!snapshot.latestResult) {
    const withEval = allLoaded.slice().reverse().find(r => r?.result);
    if (withEval) snapshot.latestResult = withEval.result;
  }
  if (!snapshot.latestQueryResult) {
    const withQuery = allLoaded.slice().reverse().find(r => r?.queryResult);
    if (withQuery) snapshot.latestQueryResult = withQuery.queryResult;
  }
  for (const field of Object.values(resultFieldByTask)) {
    if (snapshot[field]?.runId) latestRunByResult.set(field, snapshot[field].runId);
  }
}

_hydrateSnapshotResultsFromSavedState();

function _mergeRunDefaults(existing, defaults) {
  const fields = ['effectivePolicy', 'inputDescriptor', 'product', 'task', 'candidateReference', 'evidenceRefs', 'stage'];
  for (const key of fields) {
    if (defaults[key] && !existing[key]) existing[key] = defaults[key];
  }
  if (existing.inputDescriptor) {
    existing.inputSha256 = existing.inputSha256 || existing.inputDescriptor.sha256 || null;
    existing.inputRef = existing.inputRef || existing.inputDescriptor.filepath || null;
  }
}

function getOrCreateRun(runId, defaults = {}) {
  if (!isValidRunId(runId)) return null;
  if (!runsById.has(runId)) {
    if (runsById.size >= MAX_RUNS_HISTORY) {
      const oldestKey = [...runsById.keys()].find(key => key !== latestTaskId);
      if (oldestKey !== undefined) runsById.delete(oldestKey);
    }
    runsById.set(runId, {
      runId,
      task: defaults.task || null,
      product: defaults.product || null,
      startTime: defaults.startTime || Date.now(),
      status: defaults.status || 'RUNNING',
      stage: defaults.stage || null,
      effectivePolicy: defaults.effectivePolicy || null,
      inputDescriptor: defaults.inputDescriptor || null,
      inputSha256: defaults.inputDescriptor?.sha256 || null,
      inputRef: defaults.inputDescriptor?.filepath || null,
      candidateReference: defaults.candidateReference || null,
      evidenceRefs: defaults.evidenceRefs || null,
      error: null,
      cancellationRequested: false,
      logs: [],
      progress: null,
      result: null,
      queryResult: null,
      ragJobId: null
    });
  } else {
    _mergeRunDefaults(runsById.get(runId), defaults);
  }
  return runsById.get(runId);
}

function captureResult(field, scoped) {
  const newestRun = latestRunByResult.get(field);
  const staleUpdate = scoped.type === 'EVAL_RESULT_UPDATED' && snapshot[field]?.runId !== scoped.runId;
  if (staleUpdate || (newestRun && newestRun !== scoped.runId)) {
    scoped.historical = true;
    return;
  }
  if (scoped.runId) latestRunByResult.set(field, scoped.runId);
  snapshot[field] = scoped;
  persistResult();
}

function _extractEvidenceRefsFromEval(scoped) {
  const payload = scoped?.data || scoped?.error?.data || {};
  const evalObj = payload.evalResults || payload;
  if (!evalObj || typeof evalObj !== 'object') return null;
  return {
    traceId: payload.traceId || evalObj.traceId || null,
    evidenceLogPath: payload.evidenceLogPath || evalObj.evidenceLogPath || null,
    manifestFingerprint: payload.manifestFingerprint || evalObj.manifestFingerprint || null,
    deliveryAuthorization: payload.deliveryAuthorization || evalObj.deliveryAuthorization || null,
    acceptanceGate: evalObj.acceptanceGate || payload.acceptanceGate || null,
    portalValidationStatus: evalObj.portalValidationStatus || payload.portalValidationStatus || 'PENDING'
  };
}

function _extractEvidenceRefsFromRouted(scoped) {
  const envelope = scoped?.data || {};
  const res = envelope.result || {};
  const innerEval = res.evalResults || {};
  return {
    traceId: envelope.traceId || res.traceId || null,
    evidenceLogPath: res.evidenceLogPath || innerEval.evidenceLogPath || null,
    manifestFingerprint: res.candidateReference?.digest || innerEval.manifestFingerprint || null,
    acceptanceGate: res.acceptanceGate || null,
    deliveryAuthorization: innerEval.deliveryAuthorization || res.deliveryAuthorization || null,
    portalValidationStatus: innerEval.portalValidationStatus || res.portalValidationStatus || 'PENDING'
  };
}

function _captureTaskStarted(event) {
  const activeInfo = {
    runId: event.runId,
    task: event.task,
    startTime: event.startTime || Date.now(),
    product: event.product || null,
    stage: event.stage || 'STARTED',
    effectivePolicy: event.effectivePolicy || null,
    inputDescriptor: event.inputDescriptor || null,
    candidateReference: event.candidateReference || null
  };
  snapshot.activeTask = activeInfo;
  snapshot.logs = [];
  snapshot.progress = null;
  latestTaskId = event.runId;
  const resultField = resultFieldByTask[event.task];
  if (resultField && latestTaskId) latestRunByResult.set(resultField, latestTaskId);
  const createdRun = getOrCreateRun(event.runId, activeInfo);
  persistRunRecord(createdRun);
}

function _captureEvalEvent(targetRun, event, scoped) {
  if (!targetRun) return;
  targetRun.result = scoped;
  if (event.effectivePolicy || event.inputDescriptor?.effectivePolicy) {
    targetRun.effectivePolicy = event.effectivePolicy || event.inputDescriptor.effectivePolicy;
  }
  if (event.inputDescriptor) {
    targetRun.inputDescriptor = event.inputDescriptor;
    targetRun.inputSha256 = event.inputDescriptor.sha256 || targetRun.inputSha256 || null;
    targetRun.inputRef = event.inputDescriptor.filepath || targetRun.inputRef || null;
  }
  if (event.data?.candidateReference || event.data?.evalResults?.candidateReference) {
    targetRun.candidateReference = event.data.candidateReference || event.data.evalResults.candidateReference;
  }
  if (scoped.error) targetRun.error = scoped.error;
  const refs = _extractEvidenceRefsFromEval(scoped);
  if (refs) targetRun.evidenceRefs = refs;
  const needsClarification = Boolean(
    scoped.data?.clarificationRequired ||
    scoped.data?.evalResults?.clarificationRequired ||
    scoped.data?.code === 'PLATFORM_CLARIFICATION_REQUIRED' ||
    scoped.data?.evalResults?.code === 'PLATFORM_CLARIFICATION_REQUIRED'
  );
  if (scoped.status === 'CANCELLED' || scoped.error?.status === 'CANCELLED' || scoped.data?.status === 'CANCELLED' || targetRun.status === 'CANCELLED') {
    targetRun.status = 'CANCELLED';
    targetRun.stage = 'CANCELLED';
  } else if (needsClarification) {
    targetRun.status = 'ACTION_REQUIRED';
    targetRun.stage = 'CLARIFICATION_REQUIRED';
  } else if (scoped.status === 'SCHEMA_INVALID' || (scoped.error && !scoped.data)) {
    targetRun.status = 'FAILED';
    targetRun.stage = scoped.status === 'SCHEMA_INVALID' ? 'SCHEMA_INVALID' : 'FAILED';
  }
  persistRunRecord(targetRun);
}

function _captureRoutedEvent(targetRun, event, scoped) {
  if (!targetRun) return;
  targetRun.queryResult = scoped;
  if (event.effectivePolicy || event.data?.effectivePolicy) {
    targetRun.effectivePolicy = event.effectivePolicy || event.data.effectivePolicy;
  }
  if (event.data?.result?.candidateReference || event.candidateReference) {
    targetRun.candidateReference = event.data?.result?.candidateReference || event.candidateReference;
  }
  const refs = _extractEvidenceRefsFromRouted(scoped);
  if (refs) targetRun.evidenceRefs = refs;
  if (
    event.data?.result?.status === 'REQUIRES_HUMAN_CLARIFICATION' ||
    event.data?.result?.requiresHumanClarification === true ||
    event.data?.result?.code === 'PLATFORM_CLARIFICATION_REQUIRED'
  ) {
    targetRun.status = 'ACTION_REQUIRED';
    targetRun.stage = 'CLARIFICATION_REQUIRED';
  }
  persistRunRecord(targetRun);
}

function _captureTaskCompleted(targetRun, event, runId) {
  if (targetRun) {
    if (event.cancelled || targetRun.status === 'CANCELLED') {
      targetRun.status = 'CANCELLED';
      targetRun.stage = 'CANCELLED';
    } else if (event.code === 0) {
      const nextStatus = targetRun.status === 'ACTION_REQUIRED' ? 'ACTION_REQUIRED' : 'COMPLETED';
      targetRun.status = nextStatus;
      targetRun.stage = nextStatus;
    } else {
      targetRun.status = 'FAILED';
      targetRun.stage = 'FAILED';
    }
    targetRun.exitCode = event.code;
    targetRun.durationMs = event.durationMs;
    if (event.error) targetRun.error = event.error;
    persistRunRecord(targetRun);
  }
  if (runId === snapshot.activeTask?.runId) {
    snapshot.activeTask = null;
  }
}

function captureEvent(event) {
  const eventId = ++sequence;
  const runId = event.runId || snapshot.activeTask?.runId;
  const scoped = { ...event, runId, eventId };

  if (event.type === 'TASK_STARTED') _captureTaskStarted(event);
  const targetRun = runId ? getOrCreateRun(runId) : null;

  if (event.type === 'PROGRESS') {
    if (targetRun) {
      targetRun.progress = scoped;
      const nextStage = event.stage || event.action;
      if (nextStage && nextStage !== targetRun.stage) {
        targetRun.stage = nextStage;
        persistRunRecord(targetRun);
      }
    }
    if (runId === snapshot.activeTask?.runId) snapshot.progress = scoped;
  } else if (event.type === 'LOG') {
    if (targetRun) {
      if (targetRun.logs.length >= 200) targetRun.logs.shift();
      targetRun.logs.push(scoped);
    }
    if (!runId || runId === latestTaskId) {
      if (snapshot.logs.length >= 200) snapshot.logs.shift();
      snapshot.logs.push(scoped);
    }
  } else if (['EVAL_RESULT', 'EVAL_RESULT_UPDATED'].includes(event.type)) {
    _captureEvalEvent(targetRun, event, scoped);
    captureResult('latestResult', scoped);
  } else if (event.type === 'ROUTED_RESULT') {
    _captureRoutedEvent(targetRun, event, scoped);
    captureResult('latestQueryResult', scoped);
  } else if (event.type === 'TASK_COMPLETED') {
    _captureTaskCompleted(targetRun, event, runId);
  }

  return scoped;
}

function getRunById(runId) {
  if (!isValidRunId(runId)) return null;
  if (runsById.has(runId)) return runsById.get(runId);
  try {
    const runPath = path.join(getRunsDir(), `${runId}.json`);
    if (fs.existsSync(runPath)) {
      const data = JSON.parse(fs.readFileSync(runPath, 'utf8'));
      if (data && isValidRunId(data.runId)) return data;
    }
  } catch (_) {}
  return null;
}

function listPersistedRuns() {
  const byId = new Map();
  if (shouldPersist()) {
    try {
      const dir = getRunsDir();
      if (fs.existsSync(dir)) {
        for (const f of fs.readdirSync(dir).filter(name => name.endsWith('.json') && name !== 'latest.json')) {
          try {
            const parsed = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
            if (parsed && isValidRunId(parsed.runId)) byId.set(parsed.runId, parsed);
          } catch (_) {}
        }
      }
    } catch (_) {}
  }
  for (const [id, run] of runsById.entries()) {
    if (isValidRunId(id) && run) byId.set(id, run);
  }
  return Array.from(byId.values());
}

function getRunSnapshot() {
  const lastRun = runsById.get(latestTaskId);
  const allRuns = Array.from(runsById.values());
  const latestNonRunning = allRuns.slice().reverse().find(r => r && r.runId);
  const effectiveLast = lastRun || latestNonRunning || null;
  return {
    ...snapshot,
    isTaskRunning: Boolean(snapshot.activeTask),
    latestRunId: latestTaskId || effectiveLast?.runId || null,
    eventId: sequence,
    latestTask: effectiveLast && {
      runId: effectiveLast.runId, task: effectiveLast.task, product: effectiveLast.product,
      startTime: effectiveLast.startTime, status: effectiveLast.status,
      stage: effectiveLast.stage || null,
      code: effectiveLast.exitCode, durationMs: effectiveLast.durationMs
    },
    runsHistory: allRuns.slice(-10).reverse()
  };
}

function registerRagJob(runId, jobId) {
  if (!isValidRunId(runId)) return false;
  const targetRun = getRunById(runId);
  if (targetRun) {
    targetRun.ragJobId = jobId;
    persistRunRecord(targetRun);
  }
  if (snapshot.latestResult?.runId === runId) {
    snapshot.latestResult = { ...snapshot.latestResult, ragJobId: jobId };
    persistResult();
  }
  return true;
}

module.exports = {
  isValidRunId,
  captureEvent,
  getRunSnapshot,
  registerRagJob,
  getRunById,
  listPersistedRuns,
  persistRunRecord,
  runsById,
  getRunsDir
};
