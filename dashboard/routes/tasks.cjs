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

const { isTaskRunning, getActiveTask, startTask } = require('../services/taskManager.cjs');
const { invalidateChassisMapCache } = require('../../scripts/lib/conflict/conflict_graph.js');
const { sendErrorResponse } = require('../services/errorHandler.cjs');
const { requestChildTermination } = require('../../scripts/lib/system/child_termination.js');
const { spawnObservedChild } = require('../../scripts/lib/system/observed_child_process.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const OUTPUTS_DIR = path.join(PROJECT_ROOT, 'outputs');

// ── Scrape ────────────────────────────────────────────────────────────────────
router.post('/scrape', (req, res) => {
  if (isTaskRunning()) return sendErrorResponse(res, 409, 'Another task is currently running', { source: 'TASKS_ROUTER', context: { task: getActiveTask()?.type } });

  const { mode, chassis, query, recover } = req.body || {};
  const scriptName = mode === 'storage' ? 'scrape_oca_storage_solution.js' : 'scrape_oca_solution.js';
  const scriptPath = path.join(PROJECT_ROOT, 'scripts', 'scrapers', scriptName);

  const args = [scriptPath];
  const targetChassis = chassis || query;
  if (targetChassis) {
    args.push('--chassis', String(targetChassis).trim());
  }
  if (recover) {
    args.push('--recover');
  }

  const proc = spawnObservedChild('scrape', __filename, (extraEnv) =>
    spawn('node', args, { cwd: PROJECT_ROOT, env: { ...process.env, STRUCTURED_PROGRESS: '1', ...extraEnv } })
  );
  startTask(`SCRAPE_${(mode || 'solution').toUpperCase()}`, proc, res, OUTPUTS_DIR);
});

// ── Rebuild All ───────────────────────────────────────────────────────────────
router.post('/rebuild', (req, res) => {
  if (isTaskRunning()) return sendErrorResponse(res, 409, 'Another task is currently running', { source: 'TASKS_ROUTER' });

  const scriptPath = path.join(PROJECT_ROOT, 'scripts', 'catalogs', 'rebuild_all.js');
  const proc = spawnObservedChild('rebuild', __filename, (extraEnv) => {
    const spawnOpts = Object.keys(extraEnv).length > 0
      ? { cwd: PROJECT_ROOT, env: { ...process.env, ...extraEnv } }
      : { cwd: PROJECT_ROOT };
    return spawn('node', [scriptPath], spawnOpts);
  });
  startTask('REBUILD_ALL', proc, res, OUTPUTS_DIR);
  // Invalidate chassis map cache after rebuild completes
  proc.on('close', () => invalidateChassisMapCache());
});

// ── Navigate OCA ──────────────────────────────────────────────────────────────
router.post('/navigate-oca', (req, res) => {
  if (isTaskRunning()) return sendErrorResponse(res, 409, 'Another task is currently running', { source: 'TASKS_ROUTER' });

  const { chassis, query, recover } = req.body || {};
  const scriptPath = path.join(PROJECT_ROOT, 'scripts', 'lib', 'scraper', 'navigate_oca.js');
  const targetChassis = chassis || query || 'DL380 Gen12';
  const args = [scriptPath, String(targetChassis).trim()];
  if (recover) {
    args.push('--recover');
  }

  const proc = spawnObservedChild('navigate_oca', __filename, (extraEnv) =>
    spawn('node', args, { cwd: PROJECT_ROOT, env: { ...process.env, STRUCTURED_PROGRESS: '1', ...extraEnv } })
  );
  startTask('NAVIGATE_OCA', proc, res, OUTPUTS_DIR);
});

// ── Launch Browser (Zero-Touch CDP) ──────────────────────────────────────────
router.post('/launch-browser', async (req, res) => {
  try {
    const { ensureChromeBrowserRunning } = require('../../scripts/lib/scraper/browser_launcher.js');
    await ensureChromeBrowserRunning(9222, 'https://partner.hpe.com');
    res.json({ status: 'SUCCESS', message: 'Browser session active and verified on port 9222' });
  } catch (err) {
    sendErrorResponse(res, 500, `Failed to launch browser: ${err.message}`, { source: 'TASKS_ROUTER' });
  }
});

// ── Knowledge Sync ────────────────────────────────────────────────────────────
router.post('/sync-knowledge', (req, res) => {
  if (isTaskRunning()) return sendErrorResponse(res, 409, 'Another task is currently running', { source: 'TASKS_ROUTER', context: { task: getActiveTask()?.type } });

  const syncScript = path.join(PROJECT_ROOT, 'scripts', 'lib', 'sync', 'knowledge_sync.js');
  if (!fs.existsSync(syncScript)) return sendErrorResponse(res, 404, 'knowledge_sync.js not found', { source: 'TASKS_ROUTER' });

  const proc = spawnObservedChild('sync_knowledge', __filename, (extraEnv) =>
    spawn('node', [syncScript, '--auto-upload-nlm'], { cwd: PROJECT_ROOT, env: { ...process.env, STRUCTURED_PROGRESS: '1', ...extraEnv } })
  );
  startTask('KNOWLEDGE_SYNC', proc, res, OUTPUTS_DIR);
});

// ── Download QuickSpecs PDF ───────────────────────────────────────────────────
router.post('/download-pdf', (req, res) => {
  if (isTaskRunning()) return sendErrorResponse(res, 409, 'Another task is currently running', { source: 'TASKS_ROUTER', context: { task: getActiveTask()?.type } });

  const pdfScript = path.join(PROJECT_ROOT, 'scripts', 'scrapers', 'download_quickspecs_pdf.js');
  if (!fs.existsSync(pdfScript)) return sendErrorResponse(res, 404, 'download_quickspecs_pdf.js not found', { source: 'TASKS_ROUTER' });

  const proc = spawnObservedChild('download_pdf', __filename, (extraEnv) =>
    spawn('node', [pdfScript], { cwd: PROJECT_ROOT, env: { ...process.env, STRUCTURED_PROGRESS: '1', ...extraEnv } })
  );
  startTask('DOWNLOAD_PDF', proc, res, OUTPUTS_DIR);
});

// ── Kill Active Task ──────────────────────────────────────────────────────────
router.post('/kill-task', async (req, res) => {
  const activeTask = getActiveTask();
  if (!activeTask) {
    return sendErrorResponse(res, 400, 'No active task to kill', { source: 'TASKS_ROUTER', runId: null });
  }
  if (!activeTask.process || typeof activeTask.process.on !== 'function') {
    return sendErrorResponse(res, 400, 'No active tracked process to terminate', { source: 'TASKS_ROUTER', runId: activeTask.runId });
  }

  const proc = activeTask.process;
  const runId = activeTask.runId;
  const taskType = activeTask.type;

  // Validate optional duration parameters before caching promise
  let graceMs;
  let confirmationMs;
  try {
    if (req.body?.graceMs !== undefined) {
      if (!Number.isSafeInteger(req.body.graceMs) || req.body.graceMs <= 0) {
        throw new TypeError('graceMs must be a positive safe integer');
      }
      graceMs = req.body.graceMs;
    }
    if (req.body?.confirmationMs !== undefined) {
      if (!Number.isSafeInteger(req.body.confirmationMs) || req.body.confirmationMs <= 0) {
        throw new TypeError('confirmationMs must be a positive safe integer');
      }
      confirmationMs = req.body.confirmationMs;
    }
  } catch (valErr) {
    return sendErrorResponse(res, 400, valErr.message, { source: 'TASKS_ROUTER', runId });
  }

  // Repeated concurrent kill requests reuse one in-flight termination
  if (!proc._terminationPromise) {
    const opts = {
      reason: req.body?.reason !== undefined ? req.body.reason : 'user_cancellation',
      ...(proc._presalesCooperativeCancellation === true
        ? { cooperative: true, graceMs: graceMs === undefined ? 5000 : graceMs }
        : (graceMs !== undefined ? { graceMs } : {})),
      ...(confirmationMs !== undefined ? { confirmationMs } : {})
    };
    const termPromise = requestChildTermination(proc, opts)
      .then((receipt) => {
        proc._terminationReceipt = receipt;
        // A completed observation may be retried while the same live task retains ownership.
        if (!receipt.exitConfirmed && proc._terminationPromise === termPromise) {
          delete proc._terminationPromise;
        }
        return receipt;
      })
      .catch((err) => {
        if (proc._terminationPromise === termPromise) {
          delete proc._terminationPromise;
          delete proc._terminationReceipt;
        }
        throw err;
      });
    proc._terminationPromise = termPromise;
  }

  try {
    const receipt = await proc._terminationPromise;

    if (receipt.exitConfirmed) {
      return res.json({
        message: 'Task cancelled successfully',
        status: 'CANCELLED',
        runId,
        task: taskType,
        receipt
      });
    }

    // EXIT_UNCONFIRMED: termination requested with exact receipt, mutex still held
    return res.json({
      message: 'Termination requested',
      status: 'EXIT_UNCONFIRMED',
      runId,
      task: taskType,
      receipt,
      mutexHeld: true
    });
  } catch (err) {
    return sendErrorResponse(res, 500, err, { source: 'TASKS_ROUTER', runId });
  }
});

// ── Portfolio Verification Suite ──────────────────────────────────────────────
router.post('/verify-all', (req, res) => {
  if (isTaskRunning()) return sendErrorResponse(res, 409, 'Another task is currently running', { source: 'TASKS_ROUTER', context: { task: getActiveTask()?.type } });

  const verifyScript = path.join(PROJECT_ROOT, 'tests', 'integration', 'verify_all.js');
  const proc = spawnObservedChild('verify_all', __filename, (extraEnv) =>
    spawn('node', [verifyScript], { cwd: PROJECT_ROOT, env: { ...process.env, STRUCTURED_PROGRESS: '1', ...extraEnv } })
  );
  startTask('VERIFY_ALL', proc, res, OUTPUTS_DIR);
});

module.exports = router;
