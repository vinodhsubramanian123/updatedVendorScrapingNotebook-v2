'use strict';
const path = require('path');
const fs = require('fs');
const { safeWriteJsonAtomic } = require('../../scripts/lib/system/fs_compat.js');
const STATE_PATH = path.resolve(__dirname, '../../outputs/history/dashboard_runs/latest.json');

const MAX_RUNS_HISTORY = 20;
const runsById = new Map();
let snapshot = { activeTask: null, latestResult: null, latestQueryResult: null, logs: [], progress: null };
let sequence = 0;

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
  }
} catch (err) {
  console.warn('[runState] Saved result unavailable:', err.message);
}

function getOrCreateRun(runId, defaults = {}) {
  if (!runId) return null;
  if (!runsById.has(runId)) {
    if (runsById.size >= MAX_RUNS_HISTORY) {
      const oldestKey = runsById.keys().next().value;
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
    if (runId === snapshot.activeTask?.runId || !snapshot.activeTask) {
      if (snapshot.logs.length >= 200) snapshot.logs.shift();
      snapshot.logs.push(scoped);
    }
  }

  if (['EVAL_RESULT', 'EVAL_RESULT_UPDATED'].includes(event.type)) {
    if (targetRun) targetRun.result = scoped;
    const isActiveRun = Boolean(snapshot.activeTask && snapshot.activeTask.runId === runId);
    const isUnboundOrIdle = !snapshot.activeTask;
    if (isActiveRun || isUnboundOrIdle) {
      snapshot.latestResult = scoped;
      persistResult();
    }
  }

  if (event.type === 'ROUTED_RESULT') {
    if (targetRun) targetRun.queryResult = scoped;
    const isActiveRun = Boolean(snapshot.activeTask && snapshot.activeTask.runId === runId);
    const isUnboundOrIdle = !snapshot.activeTask;
    if (isActiveRun || isUnboundOrIdle) {
      snapshot.latestQueryResult = scoped;
      persistResult();
    }
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
  return {
    ...snapshot,
    eventId: sequence,
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
