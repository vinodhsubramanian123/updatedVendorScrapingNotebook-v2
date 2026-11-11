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

const {
  isTaskRunning,
  getActiveTask,
  startTask,
  beginTaskCancellation,
  cancelAbortTask,
  awaitTaskCleanup
} = require('../services/taskManager.cjs');
const { isValidRunId, getRunById } = require('../services/runState.cjs');
const { invalidateChassisMapCache } = require('../../scripts/lib/conflict/conflict_graph.js');
const { sendErrorResponse } = require('../services/errorHandler.cjs');
const { requestChildTermination } = require('../../scripts/lib/system/child_termination.js');
const { spawnObservedChild } = require('../../scripts/lib/system/observed_child_process.js');
const { assertSafePath } = require('../services/pathGuard.cjs');
const { resolveChassisDirectory } = require('../../scripts/lib/catalog/sku_versioning.js');

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
  startTask(`SCRAPE_${(mode || 'solution').toUpperCase()}`, proc, res, OUTPUTS_DIR, targetChassis ? String(targetChassis).trim() : null);
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
  const targetChassis = chassis || query;
  if (!targetChassis) return sendErrorResponse(res, 400, 'Select the exact target product before navigating OCA', { source: 'TASKS_ROUTER' });
  const args = [scriptPath, String(targetChassis).trim()];
  if (recover) {
    args.push('--recover');
  }

  const proc = spawnObservedChild('navigate_oca', __filename, (extraEnv) =>
    spawn('node', args, { cwd: PROJECT_ROOT, env: { ...process.env, STRUCTURED_PROGRESS: '1', ...extraEnv } })
  );
  startTask('NAVIGATE_OCA', proc, res, OUTPUTS_DIR, String(targetChassis).trim());
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

  let docId, destination, product;
  try {
    const { chassisId } = req.body || {};
    if (!chassisId) throw new Error('Exact product is required to download QuickSpecs');
    const dir = assertSafePath(resolveChassisDirectory(chassisId));
    product = path.basename(dir);
    const { KNOWN_QUICKSPECS_DOC_MAP } = require('../../scripts/lib/sync/quickspecs_sync.js');
    docId = KNOWN_QUICKSPECS_DOC_MAP[product]?.docId;
    if (!docId) throw new Error(`No verified QuickSpecs document mapping for ${product}. Add its official mapping before download.`);
    destination = path.join(dir, `HPE_${product}_QuickSpecs_${docId}.pdf`);
  } catch (err) { return sendErrorResponse(res, 422, err, { source: 'TASKS_ROUTER' }); }

  const proc = spawnObservedChild('download_pdf', __filename, (extraEnv) =>
    spawn('node', [pdfScript, docId, destination], { cwd: PROJECT_ROOT, env: { ...process.env, STRUCTURED_PROGRESS: '1', ...extraEnv } })
  );
  startTask('DOWNLOAD_PDF', proc, res, OUTPUTS_DIR, product);
});

// ── Kill Active Task ──────────────────────────────────────────────────────────
function _parseKillDuration(val, label) {
  if (val === undefined) return undefined;
  if (!Number.isSafeInteger(val) || val <= 0) {
    throw new TypeError(`${label} must be a positive safe integer`);
  }
  return val;
}

async function _handleAbortControllerCancel(activeTask, graceMs, res) {
  const result = await cancelAbortTask(activeTask.runId, graceMs ?? 5000);
  if (result?.exitConfirmed) {
    return res.json({
      message: 'Task cancelled successfully',
      status: 'CANCELLED',
      runId: activeTask.runId,
      task: activeTask.type
    });
  }
  return res.json({
    status: 'EXIT_UNCONFIRMED',
    message: 'Cancellation requested; waiting for the workflow to finish cleanup',
    runId: activeTask.runId,
    task: activeTask.type,
    mutexHeld: true
  });
}

router.post('/kill-task', async (req, res) => {
  const requestedRunId = req.body?.runId;
  if (requestedRunId !== undefined && requestedRunId !== null && requestedRunId !== '' && !isValidRunId(String(requestedRunId))) {
    return sendErrorResponse(res, 400, 'Invalid run ID format', { source: 'TASKS_ROUTER', code: 'INVALID_RUN_ID', runId: String(requestedRunId) });
  }

  let graceMs;
  let confirmationMs;
  try {
    graceMs = _parseKillDuration(req.body?.graceMs, 'graceMs');
    confirmationMs = _parseKillDuration(req.body?.confirmationMs, 'confirmationMs');
  } catch (valErr) {
    return sendErrorResponse(res, 400, valErr.message, { source: 'TASKS_ROUTER', runId: requestedRunId || null });
  }

  const activeTask = getActiveTask();
  if (!activeTask) {
    if (requestedRunId) {
      const recorded = getRunById(String(requestedRunId));
      if (recorded && recorded.status === 'CANCELLED') {
        return res.json({
          message: 'Run was already cancelled',
          status: 'CANCELLED',
          runId: recorded.runId,
          task: recorded.task,
          idempotent: true
        });
      }
    }
    return sendErrorResponse(res, 400, 'No active task to kill', { source: 'TASKS_ROUTER', runId: null, code: 'NO_ACTIVE_TASK' });
  }
  if (requestedRunId && activeTask.runId !== requestedRunId) {
    return sendErrorResponse(res, 409, `Target runId ${requestedRunId} does not match active task ${activeTask.runId}; cancellation ignored`, {
      source: 'TASKS_ROUTER',
      code: 'RUN_ID_MISMATCH',
      activeRunId: activeTask.runId,
      requestedRunId
    });
  }

  if (activeTask.abortController) {
    return _handleAbortControllerCancel(activeTask, graceMs, res);
  }
  if (!activeTask.process || typeof activeTask.process.on !== 'function') {
    return sendErrorResponse(res, 400, 'No active tracked process to terminate', { source: 'TASKS_ROUTER', runId: activeTask.runId });
  }

  const proc = activeTask.process;
  const runId = activeTask.runId;
  const taskType = activeTask.type;
  beginTaskCancellation(runId);

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
      const cleanupSettled = await awaitTaskCleanup(runId, confirmationMs ?? 2000);
      if (cleanupSettled) {
        return res.json({
          message: 'Task cancelled successfully',
          status: 'CANCELLED',
          runId,
          task: taskType,
          receipt
        });
      }
      return res.json({
        message: 'Process exited; waiting for cleanup to finish',
        status: 'EXIT_UNCONFIRMED',
        runId,
        task: taskType,
        receipt,
        mutexHeld: true
      });
    }

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
