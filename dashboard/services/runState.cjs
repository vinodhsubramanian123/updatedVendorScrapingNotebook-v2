'use strict';
const path = require('path');
const fs = require('fs');
const { safeWriteJsonAtomic } = require('../../scripts/lib/system/fs_compat.js');
const STATE_PATH = path.resolve(__dirname, '../../outputs/history/dashboard_runs/latest.json');

const MAX_RUNS_HISTORY = 20;
const runsById = new Map();
let snapshot = { activeTask: null, latestResult: null, latestQueryResult: null, logs: [], progress: null };
let sequence = 0;
let latestTaskId = null;
const latestRunByResult = new Map();
const resultFieldByTask = { EVAL_BOQ: 'latestResult', PRESALES_QUERY: 'latestQueryResult' };

function persistResult() {
  if (process.env.NODE_ENV === 'test') return;
  try {
    safeWriteJsonAtomic(STATE_PATH, {
      latestResult: snapshot.latestResult,
      latestQueryResult: snapshot.latestQueryResult
    });
  } catch (err) {
    console.error('[runState] Could not persist result:', err.message);
  }
}

try {
  if (process.env.NODE_ENV !== 'test' && fs.existsSync(STATE_PATH)) {
    const saved = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    snapshot.latestResult = saved.latestResult || null;
    snapshot.latestQueryResult = saved.latestQueryResult || null;
    for (const field of Object.values(resultFieldByTask)) {
      if (snapshot[field]?.runId) latestRunByResult.set(field, snapshot[field].runId);
    }
  }
} catch (err) {
  console.warn('[runState] Saved result unavailable:', err.message);
}

function getOrCreateRun(runId, defaults = {}) {
  if (!runId) return null;
  if (!runsById.has(runId)) {
    if (runsById.size >= MAX_RUNS_HISTORY) {
      const oldestKey = [...runsById.keys()].find(key => key !== latestTaskId);
      runsById.delete(oldestKey);
    }
    runsById.set(runId, {
      runId,
      task: defaults.task || null,
      product: defaults.product || null,
      startTime: defaults.startTime || Date.now(),
      status: 'RUNNING',
      logs: [],
      progress: null,
      result: null,
      queryResult: null,
      ragJobId: null
    });
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

function captureEvent(event) {
  const eventId = ++sequence;
  const runId = event.runId || snapshot.activeTask?.runId;
  const scoped = { ...event, runId, eventId };

  if (event.type === 'TASK_STARTED') {
    const activeInfo = {
      runId: event.runId,
      task: event.task,
      startTime: Date.now(),
      product: event.product || null
    };
    snapshot.activeTask = activeInfo;
    snapshot.logs = [];
    snapshot.progress = null;
    latestTaskId = event.runId;
    const resultField = resultFieldByTask[event.task];
    if (resultField && latestTaskId) latestRunByResult.set(resultField, latestTaskId);
    getOrCreateRun(event.runId, activeInfo);
  }

  const targetRun = runId ? getOrCreateRun(runId) : null;

  if (event.type === 'PROGRESS') {
    if (targetRun) targetRun.progress = scoped;
    if (runId === snapshot.activeTask?.runId) snapshot.progress = scoped;
  }

  if (event.type === 'LOG') {
    if (targetRun) {
      if (targetRun.logs.length >= 200) targetRun.logs.shift();
      targetRun.logs.push(scoped);
    }
    if (!runId || runId === latestTaskId) {
      if (snapshot.logs.length >= 200) snapshot.logs.shift();
      snapshot.logs.push(scoped);
    }
  }

  if (['EVAL_RESULT', 'EVAL_RESULT_UPDATED'].includes(event.type)) {
    if (targetRun) targetRun.result = scoped;
    captureResult('latestResult', scoped);
  }

  if (event.type === 'ROUTED_RESULT') {
    if (targetRun) targetRun.queryResult = scoped;
    captureResult('latestQueryResult', scoped);
  }

  if (event.type === 'TASK_COMPLETED') {
    if (targetRun) {
      targetRun.status = event.code === 0 ? 'COMPLETED' : 'FAILED';
      targetRun.exitCode = event.code;
      targetRun.durationMs = event.durationMs;
    }
    if (runId === snapshot.activeTask?.runId) {
      snapshot.activeTask = null;
    }
  }

  return scoped;
}

function getRunSnapshot() {
  const lastRun = runsById.get(latestTaskId);
  return {
    ...snapshot,
    eventId: sequence,
    latestTask: lastRun && {
      runId: lastRun.runId, task: lastRun.task, product: lastRun.product,
      startTime: lastRun.startTime, status: lastRun.status,
      code: lastRun.exitCode, durationMs: lastRun.durationMs
    },
    runsHistory: Array.from(runsById.values()).slice(-10).reverse()
  };
}

function registerRagJob(runId, jobId) {
  if (!runId) return false;
  const targetRun = runsById.get(runId);
  if (targetRun) targetRun.ragJobId = jobId;
  if (snapshot.latestResult?.runId === runId) {
    snapshot.latestResult = { ...snapshot.latestResult, ragJobId: jobId };
    persistResult();
  }
  return true;
}

module.exports = { captureEvent, getRunSnapshot, registerRagJob };
