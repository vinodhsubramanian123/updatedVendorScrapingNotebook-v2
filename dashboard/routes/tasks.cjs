'use strict';
/**
 * dashboard/routes/tasks.cjs — Pipeline Task Trigger Routes
 *
 * Handles all long-running child process tasks:
 * scrape, rebuild, navigate-oca, launch-browser, sync-knowledge,
 * download-pdf, kill-task, verify-all.
 *
 * Extracted from server.cjs (GAP-L3d).
 */

const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const { isTaskRunning, getActiveTask, startTask, broadcastSSE } = require('../services/taskManager.cjs');
const { invalidateChassisMapCache } = require('../../scripts/lib/conflict_graph.js');
const { sendErrorResponse } = require('../services/errorHandler.cjs');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const OUTPUTS_DIR = path.join(PROJECT_ROOT, 'outputs');

// ── Scrape ────────────────────────────────────────────────────────────────────
router.post('/scrape', (req, res) => {
  if (isTaskRunning()) return sendErrorResponse(res, 409, 'Another task is currently running', { source: 'TASKS_ROUTER', context: { task: getActiveTask()?.type } });

  const { mode } = req.body; // 'solution' or 'storage'
  const scriptName = mode === 'storage' ? 'scrape_oca_storage_solution.js' : 'scrape_oca_solution.js';
  const scriptPath = path.join(PROJECT_ROOT, 'scripts', scriptName);

  const proc = spawn('node', [scriptPath], { cwd: PROJECT_ROOT, env: { ...process.env, STRUCTURED_PROGRESS: '1' } });
  startTask(`SCRAPE_${(mode || 'solution').toUpperCase()}`, proc, res, OUTPUTS_DIR);
});

// ── Rebuild All ───────────────────────────────────────────────────────────────
router.post('/rebuild', (req, res) => {
  if (isTaskRunning()) return sendErrorResponse(res, 409, 'Another task is currently running', { source: 'TASKS_ROUTER' });

  const scriptPath = path.join(PROJECT_ROOT, 'scripts', 'rebuild_all.js');
  const proc = spawn('node', [scriptPath], { cwd: PROJECT_ROOT });
  startTask('REBUILD_ALL', proc, res, OUTPUTS_DIR);
  // Invalidate chassis map cache after rebuild completes
  proc.on('close', () => invalidateChassisMapCache());
});

// ── Navigate OCA ──────────────────────────────────────────────────────────────
router.post('/navigate-oca', (req, res) => {
  if (isTaskRunning()) return sendErrorResponse(res, 409, 'Another task is currently running', { source: 'TASKS_ROUTER' });

  const scriptPath = path.join(PROJECT_ROOT, 'scripts', 'lib', 'navigate_oca.js');
  const proc = spawn('node', [scriptPath], { cwd: PROJECT_ROOT, env: { ...process.env, STRUCTURED_PROGRESS: '1' } });
  startTask('NAVIGATE_OCA', proc, res, OUTPUTS_DIR);
});

// ── Launch Browser (Zero-Touch CDP) ──────────────────────────────────────────
router.post('/launch-browser', (req, res) => {
  try {
    const profileDir = path.join(PROJECT_ROOT, '.chrome_sso_profile');
    if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });
    const proc = spawn('google-chrome', [
      '--remote-debugging-port=9222',
      `--user-data-dir=${profileDir}`,
      'https://partner.hpe.com'
    ], { detached: true, stdio: 'ignore' });
    proc.unref();
    res.json({ status: 'SUCCESS', message: 'Browser launched on port 9222' });
  } catch (err) {
    sendErrorResponse(res, 500, `Failed to launch browser: ${err.message}`, { source: 'TASKS_ROUTER' });
  }
});

// ── Knowledge Sync ────────────────────────────────────────────────────────────
router.post('/sync-knowledge', (req, res) => {
  if (isTaskRunning()) return sendErrorResponse(res, 409, 'Another task is currently running', { source: 'TASKS_ROUTER', context: { task: getActiveTask()?.type } });

  const syncScript = path.join(PROJECT_ROOT, 'scripts', 'lib', 'knowledge_sync.js');
  if (!fs.existsSync(syncScript)) return sendErrorResponse(res, 404, 'knowledge_sync.js not found', { source: 'TASKS_ROUTER' });

  const proc = spawn('node', [syncScript, '--auto-upload-nlm'], { cwd: PROJECT_ROOT, env: { ...process.env, STRUCTURED_PROGRESS: '1' } });
  startTask('KNOWLEDGE_SYNC', proc, res, OUTPUTS_DIR);
});

// ── Download QuickSpecs PDF ───────────────────────────────────────────────────
router.post('/download-pdf', (req, res) => {
  if (isTaskRunning()) return sendErrorResponse(res, 409, 'Another task is currently running', { source: 'TASKS_ROUTER', context: { task: getActiveTask()?.type } });

  const pdfScript = path.join(PROJECT_ROOT, 'scripts', 'download_quickspecs_pdf.js');
  if (!fs.existsSync(pdfScript)) return sendErrorResponse(res, 404, 'download_quickspecs_pdf.js not found', { source: 'TASKS_ROUTER' });

  const proc = spawn('node', [pdfScript], { cwd: PROJECT_ROOT, env: { ...process.env, STRUCTURED_PROGRESS: '1' } });
  startTask('DOWNLOAD_PDF', proc, res, OUTPUTS_DIR);
});

// ── Kill Active Task ──────────────────────────────────────────────────────────
router.post('/kill-task', (req, res) => {
  const activeTask = getActiveTask();
  if (!activeTask || (!activeTask.pid && !activeTask.process)) {
    return sendErrorResponse(res, 400, 'No active task to kill', { source: 'TASKS_ROUTER' });
  }
  try {
    if (activeTask.process) {
      activeTask.process.kill('SIGTERM');
    } else {
      process.kill(activeTask.pid, 'SIGTERM');
    }
    broadcastSSE({ type: 'LOG', text: `🛑 Task ${activeTask.type} (PID ${activeTask.pid}) cancelled by user.`, stream: 'stderr' });
    broadcastSSE({ type: 'TASK_COMPLETED', code: 143, task: activeTask.type });
    res.json({ message: 'Task cancelled successfully' });
  } catch (err) {
    sendErrorResponse(res, 500, err, { source: 'TASKS_ROUTER' });
  }
});

// ── Portfolio Verification Suite ──────────────────────────────────────────────
router.post('/verify-all', (req, res) => {
  if (isTaskRunning()) return sendErrorResponse(res, 409, 'Another task is currently running', { source: 'TASKS_ROUTER', context: { task: getActiveTask()?.type } });

  const verifyScript = path.join(PROJECT_ROOT, 'scripts', 'verify_all.js');
  const proc = spawn('node', [verifyScript], { cwd: PROJECT_ROOT, env: { ...process.env, STRUCTURED_PROGRESS: '1' } });
  startTask('VERIFY_ALL', proc, res, OUTPUTS_DIR);
});

module.exports = router;
