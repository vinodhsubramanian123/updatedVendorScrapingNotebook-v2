'use strict';
/**
 * dashboard/services/taskManager.cjs — Background Task Mutex & SSE-aware Lifecycle
 *
 * Centralises the single-task mutex (activeTask), isTaskRunning(), startTask(),
 * and the SSE broadcast channel so routes don't duplicate task management code.
 * Extracted from server.cjs (GAP-L3a).
 */

const path = require('path');
const fs = require('fs');
const { captureEvent, getRunSnapshot } = require('./runState.cjs');
const { StringDecoder } = require('string_decoder');

// ── SSE Client Registry ────────────────────────────────────────────────────
const sseClients = new Set();

// ── Event Lifecycle Listeners (GAP-2 Decoupling) ───────────────────────────
const taskCompletedListeners = new Set();
const taskStartedListeners = new Set();

/** Register a callback to fire on any task completion. */
function onTaskCompleted(fn) {
  if (typeof fn === 'function') taskCompletedListeners.add(fn);
  return () => taskCompletedListeners.delete(fn);
}

/** Register a callback to fire on any task start. */
function onTaskStarted(fn) {
  if (typeof fn === 'function') taskStartedListeners.add(fn);
  return () => taskStartedListeners.delete(fn);
}

/** Write a JSON event to all connected SSE clients and notify lifecycle listeners. */
function broadcastSSE(data) {
  data = captureEvent(data);
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try { client.write(payload); } catch (_) { sseClients.delete(client); }
  }

  if (data?.type === 'TASK_COMPLETED') {
    for (const listener of taskCompletedListeners) {
      try { listener(data); } catch (e) { console.error('TaskCompleted listener error:', e); }
    }
  } else if (data?.type === 'TASK_STARTED') {
    for (const listener of taskStartedListeners) {
      try { listener(data); } catch (e) { console.error('TaskStarted listener error:', e); }
    }
  }
}

/** Register an Express response as an SSE client. */
function addSseClient(res) { sseClients.add(res); }

/** Remove an Express response from the SSE client set. */
function removeSseClient(res) { sseClients.delete(res); }

// ── Task Mutex ─────────────────────────────────────────────────────────────
/** @type {{ type: string, runId: string, pid?: number, process?: import('child_process').ChildProcess, abortController?: AbortController, startTime: number, closed?: boolean, cleaningUp?: boolean, cancellationRequested?: boolean, exitAt?: number, _cleanupPromise?: Promise<void>, _resolveCleanup?: Function, _abortPromise?: Promise<any> } | null} */
let activeTask = null;

function createCleanupDeferred() {
  let resolved = false;
  let resolveFn;
  const promise = new Promise((resolve) => { resolveFn = resolve; });
  return {
    promise,
    resolve: () => {
      if (resolved) return;
      resolved = true;
      resolveFn?.();
    }
  };
}

function attachCleanupPromise(taskObj) {
  if (!taskObj) return null;
  if (!taskObj._cleanupPromise || typeof taskObj._resolveCleanup !== 'function') {
    const deferred = createCleanupDeferred();
    taskObj._cleanupPromise = deferred.promise;
    taskObj._resolveCleanup = deferred.resolve;
  }
  const proc = taskObj.process;
  if (proc && typeof proc.once === 'function' && !taskObj._exitHookAttached) {
    taskObj._exitHookAttached = true;
    proc.once('exit', () => {
      if (!taskObj.closed) {
        taskObj.cleaningUp = true;
        taskObj.exitAt = Date.now();
      }
    });
  }
  return taskObj;
}

/**
 * Check if a background task is currently running.
 * Clears mutex ONLY on populated actual exitCode/signalCode or observed close.
 * Keeps mutex held while an observed exit is completing cleanup/persistence.
 */
function isTaskRunning() {
  if (!activeTask) return false;
  if (activeTask.closed) {
    activeTask = null;
    return false;
  }
  const proc = activeTask.process;
  if (proc) {
    const hasExitCode = proc.exitCode !== null && proc.exitCode !== undefined;
    const hasSignalCode = proc.signalCode !== null && proc.signalCode !== undefined;
    if (hasExitCode || hasSignalCode) {
      const withinCleanupGrace = Boolean(activeTask.cleaningUp) &&
        (!activeTask.exitAt || (Date.now() - activeTask.exitAt) < 10000);
      if (withinCleanupGrace) return true;
      activeTask = null;
      return false;
    }
  }
  return true;
}

/** Return a copy of the current active task metadata (or null). */
function getActiveTask() { return activeTask ? { ...activeTask } : null; }

function beginTaskCancellation(runId) {
  if (!activeTask) return null;
  if (runId && activeTask.runId !== runId) return null;
  activeTask.cleaningUp = true;
  activeTask.cancellationRequested = true;
  return activeTask;
}

function isCancellationRequested(runId) {
  if (!activeTask) return false;
  if (runId && activeTask.runId !== runId) return false;
  return Boolean(activeTask.cancellationRequested);
}

function setAbortPromise(runId, promise) {
  if (!activeTask || activeTask.runId !== runId) return null;
  activeTask._abortPromise = promise;
  return promise;
}

function _streamProcessChunk(data, streamType, logs, buffers, runId, flush = false) {
  buffers[streamType].text += flush ? buffers[streamType].decoder.end() : buffers[streamType].decoder.write(data);
  const lines = buffers[streamType].text.split('\n');
  buffers[streamType].text = flush ? '' : lines.pop();
  lines.forEach(line => {
    if (!line.trim()) return;
    const logEntry = { timestamp: new Date().toISOString(), stream: streamType, text: line };
    logs.push(logEntry);

    try {
      const parsed = JSON.parse(line);
      if (parsed.type === 'progress' || parsed.type === 'log') {
        broadcastSSE({ ...parsed, type: parsed.type.toUpperCase(), stream: streamType, runId });
        return;
      }
    } catch (_) {}

    broadcastSSE({ type: 'LOG', text: line, stream: streamType, runId });
  });
}

function _persistTaskTrace(outputsDir, runId, type, startTime, durationMs, exitCode, logs) {
  if (!outputsDir) return;
  const traceDir = path.join(outputsDir, 'history', 'runs');
  if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir, { recursive: true });
  try {
    const { safeWriteJsonAtomic } = require('../../scripts/lib/system/fs_compat.js');
    safeWriteJsonAtomic(path.join(traceDir, `${runId}.json`), {
      runId,
      taskType: type,
      startTime: new Date(startTime).toISOString(),
      durationMs,
      exitCode,
      logs
    });
  } catch (e) {
    console.error(`[taskManager] Failed to persist trace ${runId}:`, e.message);
  }
}

function _releaseTaskMutexIfOwned(runId, proc) {
  if (activeTask && (activeTask.runId === runId || (proc && activeTask.process === proc))) {
    const released = activeTask;
    released.closed = true;
    activeTask = null;
    try { released._resolveCleanup?.(); } catch (_) {}
  }
}

function releaseTaskMutex(runId, proc) {
  _releaseTaskMutexIfOwned(runId, proc);
}

function cancelAbortTask(runId, graceMs = 5000) {
  if (!activeTask || (runId && activeTask.runId !== runId) || !activeTask.abortController) return null;
  if (!activeTask._abortPromise) {
    activeTask.cleaningUp = true;
    activeTask.cancellationRequested = true;
    const target = activeTask;
    try { target.abortController.abort(new Error('User requested cancellation')); } catch (_) {}
    const waitMs = Number.isSafeInteger(graceMs) && graceMs > 0 ? graceMs : 5000;
    target._abortPromise = target._cleanupPromise
      ? Promise.race([
          target._cleanupPromise.then(() => ({ exitConfirmed: true })),
          new Promise(r => setTimeout(() => r({ exitConfirmed: false }), waitMs))
        ])
      : Promise.resolve({ exitConfirmed: false });
  }
  return activeTask._abortPromise;
}

async function awaitTaskCleanup(runId, timeoutMs = 2000) {
  if (!activeTask || (runId && activeTask.runId !== runId)) return true;
  if (!activeTask._cleanupPromise) return !isTaskRunning();
  const target = activeTask;
  const waitMs = Number.isSafeInteger(timeoutMs) && timeoutMs > 0 ? timeoutMs : 2000;
  const finished = await Promise.race([
    target._cleanupPromise.then(() => true),
    new Promise(r => setTimeout(() => r(false), waitMs))
  ]);
  return Boolean(finished || !isTaskRunning());
}

/**
 * Wire up a spawned child process as the active task, attach log streaming,
 * and respond immediately to the HTTP client.
 *
 * @param {string} type               Human-readable task type (e.g. 'SCRAPE_SOLUTION')
 * @param {import('child_process').ChildProcess} proc  Spawned child process
 * @param {import('express').Response} res             Express response to send 202 on
 * @param {string} outputsDir         Absolute path to the outputs directory
 */
function startTask(type, proc, res, outputsDir, product = null) {
  const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  const logs = [];
  let completed = false;
  const startTime = Date.now();
  const buffers = { stdout: { text: '', decoder: new StringDecoder('utf8') }, stderr: { text: '', decoder: new StringDecoder('utf8') } };

  const taskObj = attachCleanupPromise({ type, runId, pid: proc?.pid, process: proc, startTime });
  activeTask = taskObj;
  broadcastSSE({ type: 'TASK_STARTED', task: type, runId, product });

  if (proc?.stdout && typeof proc.stdout.on === 'function') {
    proc.stdout.on('data', data => _streamProcessChunk(data, 'stdout', logs, buffers, runId));
  }
  if (proc?.stderr && typeof proc.stderr.on === 'function') {
    proc.stderr.on('data', data => _streamProcessChunk(data, 'stderr', logs, buffers, runId));
  }

  if (proc && typeof proc.on === 'function') {
    proc.on('error', (err) => {
      broadcastSSE({ type: 'LOG', text: `Task execution error: ${err.message}`, stream: 'stderr', runId });
      const hasLivePid = Boolean(proc && typeof proc.pid === 'number' && proc.pid > 0);
      if (!hasLivePid && !completed) {
        completed = true;
        const cancelled = Boolean(taskObj.cancellationRequested);
        broadcastSSE({ type: 'TASK_COMPLETED', code: 1, task: type, runId, durationMs: 0, cancelled });
        _persistTaskTrace(outputsDir, runId, type, startTime, 0, 1, logs);
        _releaseTaskMutexIfOwned(runId, proc);
      }
    });

    proc.on('close', (code) => {
      if (completed) return;
      completed = true;
      for (const stream of ['stdout', 'stderr']) _streamProcessChunk(null, stream, logs, buffers, runId, true);
      const durationMs = Date.now() - startTime;
      const cancelled = Boolean(taskObj.cancellationRequested);
      broadcastSSE({ type: 'TASK_COMPLETED', code, task: type, runId, durationMs, cancelled });
      _persistTaskTrace(outputsDir, runId, type, startTime, durationMs, code, logs);
      _releaseTaskMutexIfOwned(runId, proc);
    });
  }

  if (res && typeof res.json === 'function') {
    res.json({ message: `${type} task started`, runId, pid: proc?.pid });
  }
}

/**
 * Internal setter for routes that manage their own process lifecycle
 * (e.g. the eval-boq route which has special stdout parsing).
 * @internal
 */
function _setActiveTask(task) {
  if (!task) {
    if (activeTask) {
      const prev = activeTask;
      prev.closed = true;
      activeTask = null;
      try { prev._resolveCleanup?.(); } catch (_) {}
    } else {
      activeTask = null;
    }
    return;
  }
  activeTask = attachCleanupPromise(task);
}

module.exports = {
  getRunSnapshot,
  broadcastSSE,
  addSseClient,
  removeSseClient,
  onTaskCompleted,
  onTaskStarted,
  isTaskRunning,
  getActiveTask,
  startTask,
  attachCleanupPromise,
  beginTaskCancellation,
  isCancellationRequested,
  releaseTaskMutex,
  cancelAbortTask,
  awaitTaskCleanup,
  setAbortPromise,
  _setActiveTask
};
