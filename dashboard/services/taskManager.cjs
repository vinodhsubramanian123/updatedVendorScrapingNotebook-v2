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
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    client.write(payload);
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
/** @type {{ type: string, runId: string, pid: number, process: import('child_process').ChildProcess, startTime: number } | null} */
let activeTask = null;

/**
 * Check if a background task is currently running.
 * Auto-clears stale mutex if the process has already exited.
 */
function isTaskRunning() {
  if (!activeTask) return false;
  if (activeTask.process && (activeTask.process.exitCode !== null || activeTask.process.killed)) {
    activeTask = null;
    return false;
  }
  return true;
}

/** Return a copy of the current active task metadata (or null). */
function getActiveTask() { return activeTask ? { ...activeTask } : null; }

/**
 * Wire up a spawned child process as the active task, attach log streaming,
 * and respond immediately to the HTTP client.
 *
 * @param {string} type               Human-readable task type (e.g. 'SCRAPE_SOLUTION')
 * @param {import('child_process').ChildProcess} proc  Spawned child process
 * @param {import('express').Response} res             Express response to send 202 on
 * @param {string} outputsDir         Absolute path to the outputs directory
 */
function startTask(type, proc, res, outputsDir) {
  const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  const logs = [];

  activeTask = { type, runId, pid: proc.pid, process: proc, startTime: Date.now() };
  broadcastSSE({ type: 'TASK_STARTED', task: type, runId });

  const handleData = (data, streamType) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (!line.trim()) return;
      const logEntry = { timestamp: new Date().toISOString(), stream: streamType, text: line };
      logs.push(logEntry);

      try {
        const parsed = JSON.parse(line);
        if (parsed.type === 'progress' || parsed.type === 'log') {
          broadcastSSE({ ...parsed, type: parsed.type.toUpperCase(), stream: streamType });
          return;
        }
      } catch (_) {}

      broadcastSSE({ type: 'LOG', text: line, stream: streamType });
    });
  };

  proc.stdout.on('data', data => handleData(data, 'stdout'));
  proc.stderr.on('data', data => handleData(data, 'stderr'));

  proc.on('error', (err) => {
    activeTask = null;
    broadcastSSE({ type: 'LOG', text: `Task execution error: ${err.message}`, stream: 'stderr' });
    broadcastSSE({ type: 'TASK_COMPLETED', code: 1, task: type, runId });
  });

  proc.on('close', (code) => {
    const taskRef = activeTask;
    activeTask = null;
    const durationMs = taskRef ? Date.now() - taskRef.startTime : 0;
    broadcastSSE({ type: 'TASK_COMPLETED', code, task: type, runId, durationMs });

    // Persist trace log atomically
    const traceDir = path.join(outputsDir, 'history', 'runs');
    if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir, { recursive: true });
    try {
      const { safeWriteJsonAtomic } = require('../../scripts/lib/system/fs_compat.js');
      safeWriteJsonAtomic(path.join(traceDir, `${runId}.json`), {
        runId,
        taskType: type,
        startTime: taskRef ? new Date(taskRef.startTime).toISOString() : new Date().toISOString(),
        durationMs,
        exitCode: code,
        logs
      });
    } catch (e) {
      console.error(`[taskManager] Failed to persist trace ${runId}:`, e.message);
    }
  });

  res.json({ message: `${type} task started`, runId, pid: proc.pid });
}

/**
 * Internal setter for routes that manage their own process lifecycle
 * (e.g. the eval-boq route which has special stdout parsing).
 * @internal
 */
function _setActiveTask(task) { activeTask = task; }

module.exports = {
  broadcastSSE,
  addSseClient,
  removeSseClient,
  onTaskCompleted,
  onTaskStarted,
  isTaskRunning,
  getActiveTask,
  startTask,
  _setActiveTask
};
