'use strict';
const path = require('path');
const fs = require('fs');
const { safeWriteJsonAtomic } = require('../../scripts/lib/system/fs_compat.js');
const STATE_PATH = path.resolve(__dirname, '../../outputs/history/dashboard_runs/latest.json');
let snapshot = { activeTask: null, latestResult: null, latestQueryResult: null, logs: [], progress: null };
let sequence = 0;
function persistResult() {
  if (process.env.NODE_ENV === 'test') return;
  try { safeWriteJsonAtomic(STATE_PATH, { latestResult: snapshot.latestResult, latestQueryResult: snapshot.latestQueryResult }); }
  catch (err) { console.error('[runState] Could not persist result:', err.message); }
}
try {
  if (process.env.NODE_ENV !== 'test' && fs.existsSync(STATE_PATH)) {
    const saved = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    // A process from a former server cannot be assumed to remain under our ownership.
    snapshot.latestResult = saved.latestResult || null;
    snapshot.latestQueryResult = saved.latestQueryResult || null;
  }
} catch (err) { console.warn('[runState] Saved result unavailable:', err.message); }

function captureEvent(event) {
  if (event.type === 'TASK_STARTED') {
    snapshot.activeTask = { runId: event.runId, task: event.task, startTime: Date.now(), product: event.product || null };
    snapshot.logs = [];
    snapshot.progress = null;
  }
  const runId = event.runId || snapshot.activeTask?.runId;
  const scoped = { ...event, runId, eventId: ++sequence };
  if (event.type === 'PROGRESS' && runId === snapshot.activeTask?.runId) snapshot.progress = scoped;
  if (event.type === 'LOG') snapshot.logs = [...snapshot.logs.slice(-199), scoped];
  if (['EVAL_RESULT', 'EVAL_RESULT_UPDATED'].includes(event.type)) {
    snapshot.latestResult = scoped;
    persistResult();
  }
  if (event.type === 'ROUTED_RESULT') { snapshot.latestQueryResult = scoped; persistResult(); }
  if (event.type === 'TASK_COMPLETED' && runId === snapshot.activeTask?.runId) snapshot.activeTask = null;
  return scoped;
}

function getRunSnapshot() { return { ...snapshot, eventId: sequence }; }
function registerRagJob(runId, jobId) {
  if (!runId || snapshot.latestResult?.runId !== runId) return false;
  snapshot.latestResult = { ...snapshot.latestResult, ragJobId: jobId };
  persistResult();
  return true;
}
module.exports = { captureEvent, getRunSnapshot, registerRagJob };
