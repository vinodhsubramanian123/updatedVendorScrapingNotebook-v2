'use strict';
/**
 * dashboard/routes/evaluation.cjs — BOQ Upload, Preprocessing & Evaluation Routes
 *
 * Handles:
 *   POST /api/upload-boq
 *   POST /api/preprocess-boq
 *   POST /api/confirm-preflight-split
 *   POST /api/eval-boq  (async SSE-driven)
 *   POST /api/export-boq
 *   POST /api/audit-catalog
 *   POST /api/telemetry
 *   GET  /api/telemetry
 *
 * Extracted from server.cjs (GAP-L3e).
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { spawn, execFile } = require('child_process');
const multer = require('multer');

const { isTaskRunning, getActiveTask, broadcastSSE } = require('../services/taskManager.cjs');
const { assertSafePath } = require('../services/pathGuard.cjs');
const { asyncHandler, sendErrorResponse } = require('../services/errorHandler.cjs');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const OUTPUTS_DIR = path.join(PROJECT_ROOT, 'outputs');
const TEMP_DIR = path.join(OUTPUTS_DIR, 'temp');
const HISTORY_DIR = path.join(OUTPUTS_DIR, 'history');

function pruneStaleTempFiles(maxAgeMs = 2 * 60 * 60 * 1000) {
  try {
    if (!fs.existsSync(TEMP_DIR)) return;
    const now = Date.now();
    const files = fs.readdirSync(TEMP_DIR);
    for (const file of files) {
      const fullPath = path.join(TEMP_DIR, file);
      try {
        const stats = fs.statSync(fullPath);
        if (now - stats.mtimeMs > maxAgeMs) {
          fs.unlinkSync(fullPath);
        }
      } catch (_) {}
    }
  } catch (_) {}
}

// Multer config — kept local to this route module
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TEMP_DIR),
  filename: (req, file, cb) => {
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `boq_${Date.now()}_${cleanName}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.xlsx', '.xls', '.csv', '.tsv', '.json', '.txt', '.pdf', '.png', '.jpg', '.jpeg', '.webp'];
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not allowed for BOQ ingestion`));
    }
  }
});

// Top-level imports for lib helpers
const { preprocessAndGroupBOQ, savePreprocessingRuleFeedback } = require('../../scripts/lib/boq/boq_preprocessor.js');
const { resolveChassisDirectory } = require('../../scripts/lib/catalog/sku_versioning.js');
const { safeWriteJsonAtomic } = require('../../scripts/lib/system/fs_compat.js');
const { isImageFile, performGeminiOcr } = require('../../scripts/lib/ocr/ocr_service.js');
const { recordCleansingPreflightTelemetry, recordOcrTelemetry } = require('../../scripts/lib/system/telemetry.js');
const telemetryLib = require('../../scripts/lib/system/telemetry.js');
const { generateProfessionalBOQ } = require('../../scripts/lib/boq/generate_boq_xlsx.js');
const { safeParseEvalResult } = require('../../scripts/lib/system/schemas.js');
const { spawnObservedChild } = require('../../scripts/lib/system/observed_child_process.js');

// ── Upload BOQ ────────────────────────────────────────────────────────────────
router.post('/upload-boq', (req, res) => {
  upload.single('boqFile')(req, res, err => {
    if (err) return sendErrorResponse(res, 400, err.message || 'File upload failed', { source: 'EVALUATION_ROUTER' });
    if (!req.file) return sendErrorResponse(res, 400, 'No BOQ file uploaded', { source: 'EVALUATION_ROUTER' });
    if (isImageFile(req.file.path) && req.file.size > 25 * 1024 * 1024) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
      return sendErrorResponse(res, 400, `Image/PDF file exceeds maximum allowed OCR size of 25MB. Please upload a file under 25MB or provide CSV/XLSX text.`, { source: 'EVALUATION_ROUTER' });
    }
    res.json({ message: 'BOQ uploaded successfully', filepath: req.file.path, filename: req.file.originalname });
  });
});

// ── Preprocess BOQ ────────────────────────────────────────────────────────────
router.post('/preprocess-boq', asyncHandler(async (req, res) => {
  const { filepath, rawText, chassisDir } = req.body;
  let targetPath = null, inputContent = rawText || '', ocrResult = null;

  if (filepath) {
    try {
      targetPath = assertSafePath(filepath);
      if (fs.existsSync(targetPath)) {
        if (isImageFile(targetPath)) {
          broadcastSSE({ type: 'LOG', text: `📸 [OCR_SERVICE] Performing Gemini Vision OCR on ${path.basename(targetPath)}...`, stream: 'stdout' });
          ocrResult = await performGeminiOcr(targetPath);
          inputContent = ocrResult.text;
          recordOcrTelemetry({ fileName: path.basename(targetPath), fileSizeBytes: fs.statSync(targetPath).size, charLength: ocrResult.text?.length || 0, extractedSkusCount: ocrResult.detectedSkus?.length || 0 });
          broadcastSSE({ type: 'LOG', text: `✅ [OCR_SERVICE] Extracted ${ocrResult.lineCount} lines and ${ocrResult.detectedSkus.length} SKU(s).`, stream: 'stdout' });
        } else if (!targetPath.endsWith('.xlsx') && !targetPath.endsWith('.xls')) {
          inputContent = fs.readFileSync(targetPath, 'utf-8');
        }
      }
    } catch (err) { return sendErrorResponse(res, 403, err, { source: 'EVALUATION_ROUTER' }); }
  }

  try {
    const preflightResult = preprocessAndGroupBOQ(inputContent, targetPath || '', { chassisDir, ocrResult });
    let targetDir = HISTORY_DIR;
    if (chassisDir) {
      try {
        const safeDir = assertSafePath(resolveChassisDirectory(chassisDir));
        if (fs.existsSync(safeDir)) targetDir = safeDir;
      } catch (_) {}
    }
    safeWriteJsonAtomic(path.join(targetDir, 'preflight_audit_log.json'), preflightResult);
    if (preflightResult.preflightPipeline) {
      recordCleansingPreflightTelemetry(preflightResult.preflightPipeline, targetPath || 'BOQ_Text');
    }
    res.json({ status: 'SUCCESS', preflightData: preflightResult, isOcrProcessed: !!ocrResult });
  } catch (err) { sendErrorResponse(res, 500, `Preprocessing failed: ${err.message}`, { source: 'EVALUATION_ROUTER' }); }
}));

// ── Confirm Preflight Split ───────────────────────────────────────────────────
router.post('/confirm-preflight-split', (req, res) => {
  const { configId, splitReason, notes, chassisDir } = req.body;
  try {
    if (!chassisDir) return sendErrorResponse(res, 400, 'Exact chassisDir is required for preflight confirmation', { source: 'EVALUATION_ROUTER' });
    const targetDir = assertSafePath(resolveChassisDirectory(chassisDir));
    if (!fs.existsSync(targetDir)) return sendErrorResponse(res, 404, 'Product-generation directory does not exist', { source: 'EVALUATION_ROUTER' });
    const record = savePreprocessingRuleFeedback({ configId, splitReason, notes }, targetDir);
    res.json({ status: 'SUCCESS', record, governanceStatus: 'PREPROCESSING_HISTORY_ONLY', message: 'Split confirmation saved for preprocessing audit; active hardware knowledge was not changed.' });
  } catch (err) {
    const status = err.message?.startsWith('HTTP 403') ? 403 : 500;
    sendErrorResponse(res, status, err, { source: 'EVALUATION_ROUTER' });
  }
});

// ── Evaluate BOQ (async SSE-driven) ──────────────────────────────────────────
router.post('/eval-boq', (req, res) => {
  if (isTaskRunning()) return sendErrorResponse(res, 409, 'Another task is currently running', { source: 'EVALUATION_ROUTER', context: { task: getActiveTask()?.type } });

  const { filepath, rawText, chassisDir } = req.body;
  let safeFilepath = null, safeChassisDir = null;
  try {
    if (filepath) safeFilepath = assertSafePath(filepath);
    if (chassisDir) safeChassisDir = assertSafePath(chassisDir);
  } catch (err) { return sendErrorResponse(res, 403, err, { source: 'EVALUATION_ROUTER' }); }

  let targetPath = safeFilepath;
  if (!targetPath && rawText) {
    targetPath = path.join(TEMP_DIR, `boq_text_${Date.now()}_${require('crypto').randomBytes(4).toString('hex')}.txt`);
    fs.writeFileSync(targetPath, rawText, 'utf-8');
  }

  const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  const logs = [];

  if (!targetPath || !fs.existsSync(targetPath)) {
    const errorMsg = 'Valid BOQ file or text input is required';
    const traceDir = path.join(OUTPUTS_DIR, 'history', 'runs');
    try {
      const { safeWriteJsonAtomic } = require('../../scripts/lib/system/fs_compat.js');
      safeWriteJsonAtomic(path.join(traceDir, `${runId}.json`), { runId, taskType: 'EVAL_BOQ', startTime: new Date().toISOString(), durationMs: 0, exitCode: 1, logs });
    } catch (_) {
      console.warn(`[EVALUATION_ROUTER] Failed to persist error run trace ${runId}:`, _?.message);
    }
    broadcastSSE({ type: 'TASK_STARTED', task: 'EVAL_BOQ', runId });
    broadcastSSE({ type: 'LOG', text: errorMsg, stream: 'stderr' });
    broadcastSSE({ type: 'TASK_COMPLETED', code: 1, task: 'EVAL_BOQ', runId, durationMs: 0 });
    return res.status(400).json({ error: errorMsg });
  }

  const evalScript = path.join(PROJECT_ROOT, 'scripts', 'evaluators', 'eval_boq.js');
  const inputSha256 = require('crypto').createHash('sha256').update(fs.readFileSync(targetPath)).digest('hex');
  if (req.body.inputSha256 && req.body.inputSha256 !== inputSha256) return sendErrorResponse(res, 409, 'Original intake content changed. Upload or review the input again.', { source: 'EVALUATION_ROUTER' });
  const isCdpActive = ['1', 'true'].includes(String(process.env.ACTIVE_CDP_SESSION || '').trim().toLowerCase());
  const isOffline = ['1', 'true'].includes(String(process.env.OFFLINE_MODE || '').trim().toLowerCase()) ||
    ['1', 'true'].includes(String(process.env.LOCAL_EVAL_ONLY || '').trim().toLowerCase()) ||
    process.env.NODE_ENV === 'test' ||
    req.body.offline === true ||
    !isCdpActive;
  const inputDescriptor = { filepath: targetPath, sha256: inputSha256, offline: isOffline };
  const publishEvaluation = event => broadcastSSE({ ...event, inputDescriptor });
  const args = [evalScript, targetPath, '--json', '--defer-rag'];
  if (safeChassisDir) args.push('--chassis', safeChassisDir);
  if (isOffline) args.push('--offline');

  const ownedCli = process.env.PRESALES_TERMINAL_OWNER === '1';
  const proc = spawnObservedChild('eval_boq', __filename, (extraEnv) =>
    spawn('node', args, {
      cwd: PROJECT_ROOT,
      env: { ...process.env, STRUCTURED_PROGRESS: '1', ...extraEnv },
      stdio: ['pipe', 'pipe', 'pipe', 'ipc']
    })
  );
  if (ownedCli) proc._presalesCooperativeCancellation = true;
  const targetProduct = req.body.chassisName || (safeChassisDir ? path.basename(safeChassisDir) : null);
  broadcastSSE({ type: 'TASK_STARTED', task: 'EVAL_BOQ', runId, product: targetProduct });
  res.status(202).json({ status: 'ACCEPTED', runId, message: 'Evaluation job started in background' });

  let stdoutBuffer = '';
  let ipcResultPayload = null;
  const lineBuffers = { stdout: '', stderr: '' };
  const evalStartTime = Date.now();
  let completed = false;
  let lastErrorMessage = null;

  // Mark activeTask manually for mutex guard compatibility
  require('../services/taskManager.cjs')._setActiveTask({ type: 'EVAL_BOQ', runId, pid: proc.pid, process: proc, startTime: evalStartTime });

  if (proc.on && typeof proc.on === 'function') {
    proc.on('message', (msg) => {
      if (msg?.type === 'EVAL_RESULT_PAYLOAD') {
        ipcResultPayload = msg;
      }
    });
  }

  const handleData = (data, streamType) => {
    const chunkStr = data.toString();
    if (streamType === 'stdout') stdoutBuffer += chunkStr;
    const fullStr = lineBuffers[streamType] + chunkStr;
    const lines = fullStr.split('\n');
    lineBuffers[streamType] = lines.pop() || '';
    lines.forEach(line => {
      if (!line.trim()) return;
      if (logs.length >= 5000) logs.shift();
      logs.push({ timestamp: new Date().toISOString(), stream: streamType, text: line });
      try {
        const parsed = JSON.parse(line);
        if (parsed.type === 'progress' || parsed.type === 'log') {
          broadcastSSE({ ...parsed, type: parsed.type.toUpperCase(), task: parsed.task || 'EVAL_BOQ', runId, stream: streamType });
          return;
        }
      } catch (_) {}
      broadcastSSE({ type: 'LOG', text: line, stream: streamType });
    });
  };

  if (proc.stdout && typeof proc.stdout.on === 'function') {
    proc.stdout.on('data', data => handleData(data, 'stdout'));
  }
  if (proc.stderr && typeof proc.stderr.on === 'function') {
    proc.stderr.on('data', data => handleData(data, 'stderr'));
  }

  proc.on('error', (err) => {
    lastErrorMessage = err.message;
    broadcastSSE({ type: 'LOG', text: `Evaluator process error: ${err.message}`, stream: 'stderr' });

    const hasLivePid = Boolean(proc && typeof proc.pid === 'number' && proc.pid > 0);
    if (!hasLivePid) {
      // Spawn failure without pid can terminate once
      if (completed) return;
      completed = true;

      const currentTask = require('../services/taskManager.cjs').getActiveTask();
      if (currentTask && (currentTask.runId === runId || currentTask.process === proc)) {
        require('../services/taskManager.cjs')._setActiveTask(null);
      }

      broadcastSSE({ type: 'TASK_COMPLETED', code: 1, task: 'EVAL_BOQ', runId, durationMs: 0 });
      publishEvaluation({ type: 'EVAL_RESULT', error: err.message, runId });

      const traceDir = path.join(OUTPUTS_DIR, 'history', 'runs');
      if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir, { recursive: true });
      try {
        const { safeWriteJsonAtomic } = require('../../scripts/lib/system/fs_compat.js');
        safeWriteJsonAtomic(path.join(traceDir, `${runId}.json`), { runId, taskType: 'EVAL_BOQ', startTime: new Date(evalStartTime).toISOString(), durationMs: 0, exitCode: 1, logs });
      } catch (e) {
        console.error(`[evaluation.cjs] Failed to persist trace ${runId}:`, e.message);
      }
    }
  });

  proc.on('close', (code) => {
    if (completed) return;
    completed = true;

    ['stdout', 'stderr'].forEach(st => {
      if (lineBuffers[st]?.trim()) {
        logs.push({ timestamp: new Date().toISOString(), stream: st, text: lineBuffers[st] });
        broadcastSSE({ type: 'LOG', text: lineBuffers[st], stream: st });
      }
    });

    const currentTask = require('../services/taskManager.cjs').getActiveTask();
    if (currentTask && (currentTask.runId === runId || currentTask.process === proc)) {
      require('../services/taskManager.cjs')._setActiveTask(null);
    }

    const durationMs = Date.now() - evalStartTime;
    broadcastSSE({ type: 'TASK_COMPLETED', code, task: 'EVAL_BOQ', runId, durationMs });

    // Retain intake file for clarification/refresh replay; prune stale temp files (>2h)
    pruneStaleTempFiles();

    // Persist trace
    const traceDir = path.join(OUTPUTS_DIR, 'history', 'runs');
    if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir, { recursive: true });
    try {
      const { safeWriteJsonAtomic } = require('../../scripts/lib/system/fs_compat.js');
      safeWriteJsonAtomic(path.join(traceDir, `${runId}.json`), { runId, taskType: 'EVAL_BOQ', startTime: new Date(evalStartTime).toISOString(), durationMs, exitCode: code, logs });
    } catch (e) {
      console.error(`[evaluation.cjs] Failed to persist trace ${runId}:`, e.message);
    }

    // Extract and broadcast EVAL_RESULT from IPC payload (primary) or stdout (fallback)
    try {
      let parsedData = ipcResultPayload;
      if (!parsedData) {
        const markerTag = '__EVAL_RESULT_JSON__';
        const firstMarker = stdoutBuffer.indexOf(markerTag);
        const lastMarker = stdoutBuffer.lastIndexOf(markerTag);
        if (firstMarker !== -1 && lastMarker !== -1 && lastMarker > firstMarker) {
          try { parsedData = JSON.parse(stdoutBuffer.substring(firstMarker + markerTag.length, lastMarker).trim()); } catch (_) {}
        }
      }
      if (!parsedData) {
        const statusIdx = Math.max(
          stdoutBuffer.lastIndexOf('{"status":"SUCCESS"'), stdoutBuffer.lastIndexOf('{"status": "SUCCESS"'),
          stdoutBuffer.lastIndexOf('{"status":"ERROR"'), stdoutBuffer.lastIndexOf('{"status": "ERROR"')
        );
        if (statusIdx !== -1) {
          try { parsedData = JSON.parse(stdoutBuffer.substring(statusIdx, stdoutBuffer.lastIndexOf('}') + 1)); } catch (_) {}
        }
      }
      if (!parsedData) {
        const lines = stdoutBuffer.split('\n').map(l => l.trim()).filter(Boolean);
        for (let i = lines.length - 1; i >= 0; i--) {
          try {
            const obj = JSON.parse(lines[i]);
            if (obj && (obj.status === 'SUCCESS' || obj.status === 'ERROR' || obj.data)) { parsedData = obj; break; }
          } catch (_) {}
        }
      }
      if (parsedData?.data && parsedData.status !== 'CANCELLED' && (['SUCCESS', 'ACTION_REQUIRED'].includes(parsedData.status) || parsedData.data.items || parsedData.data.evalResults)) {
        const validated = safeParseEvalResult(parsedData.data);
        if (validated.success) {
          const blocked = validated.data.customerDisposition === 'DELIVERY_BLOCKED_UNBUILDABLE' ||
            validated.data.evalResults?.customerDisposition === 'DELIVERY_BLOCKED_UNBUILDABLE';
          const resultStatus = blocked && parsedData.status !== 'ERROR' ? 'ACTION_REQUIRED' : parsedData.status || validated.data.status;
          publishEvaluation({ type: 'EVAL_RESULT', data: { ...validated.data, status: resultStatus }, runId });
        } else {
          publishEvaluation({
            type: 'EVAL_RESULT',
            status: 'SCHEMA_INVALID',
            customerDisposition: 'DELIVERY_BLOCKED_UNBUILDABLE',
            error: {
              code: 'SCHEMA_VALIDATION_FAILED',
              message: 'Evaluator output failed runtime schema contract validation',
              issues: validated.errors || validated.error?.issues,
              runId
            },
            data: {
              ...parsedData.data,
              isContractInvalid: true,
              schemaErrors: validated.errors || validated.error?.issues,
              customerDisposition: 'DELIVERY_BLOCKED_UNBUILDABLE'
            },
            runId
          });
          return;
        }

      } else if (parsedData) {
        publishEvaluation({ type: 'EVAL_RESULT', error: parsedData, runId });
      } else {
        throw new Error('No valid JSON result found in stdout');
      }
    } catch (err) {
      publishEvaluation({ type: 'EVAL_RESULT', error: lastErrorMessage || 'Failed to parse evaluator JSON', runId });
    }
  });
});

// ── Export Corrected BOQ ──────────────────────────────────────────────────────
router.post(['/export-boq', '/export-boq-xlsx'], (req, res) => {
  const { evalResults, chassisId, rankTier, diagnostic } = req.body;
  if (!evalResults) return sendErrorResponse(res, 400, 'evalResults payload is required', { source: 'EVALUATION_ROUTER' });
  const actualEvalResults = evalResults.evalResults || evalResults.data?.evalResults || evalResults;
  if (evalResults.isContractInvalid === true || evalResults.data?.isContractInvalid === true || actualEvalResults.isContractInvalid === true || actualEvalResults.customerDisposition === 'DELIVERY_BLOCKED_UNBUILDABLE' || evalResults.status === 'SCHEMA_INVALID') {
    return sendErrorResponse(res, 422, 'Cannot export BOQ: Evaluator output failed schema contract validation or delivery authorization', { source: 'EVALUATION_ROUTER' });
  }
  const tier = rankTier || 1;
  const timestamp = Date.now();
  const exportDir = path.join(OUTPUTS_DIR, 'temp', 'exports');
  if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });
  const targetChassis = chassisId || actualEvalResults.chassis || actualEvalResults.chassisVariant || actualEvalResults.model || 'unknown';
  const cleanChassisId = String(targetChassis).replace(/[^a-zA-Z0-9_-]/g, '_');
  const exportFilename = `corrected_boq_rank${tier}_${cleanChassisId}_${timestamp}.xlsx`;
  const exportPath = path.join(exportDir, exportFilename);
  const isDiagnostic = Boolean(diagnostic || req.query?.diagnostic === 'true');
  try {
    generateProfessionalBOQ(actualEvalResults, exportPath, targetChassis, tier, {
      diagnostic: isDiagnostic,
      chassisKey: targetChassis,
      deliveryAuthorization: req.body.deliveryAuthorization || actualEvalResults.deliveryAuthorization
    });
  } catch (err) {
    return sendErrorResponse(res, 403, `Export blocked: ${err.message}`, { source: 'EVALUATION_ROUTER' });
  }
  const rankedSolution = evalResults.conflictGraph?.rankedSolutions?.find(s => s.rank === tier) || null;
  const historyExportsDir = path.join(OUTPUTS_DIR, 'history', 'exports');
  if (!fs.existsSync(historyExportsDir)) fs.mkdirSync(historyExportsDir, { recursive: true });
  const metadata = { id: `${timestamp}-${tier}`, filename: exportFilename, chassisId: chassisId || 'Unknown', rank: tier, solutionName: rankedSolution?.name || 'N/A', estimatedCostUsd: rankedSolution?.estimatedCostUsd ?? null, pricingComplete: rankedSolution?.pricingComplete ?? null, runId: evalResults.runId || null, manifestSha256: evalResults.manifestSha256 || null, downloadPath: `/artifacts/temp/exports/${exportFilename}`, exportedAt: new Date(timestamp).toISOString() };
  try {
    const { safeWriteJsonAtomic } = require('../../scripts/lib/system/fs_compat.js');
    safeWriteJsonAtomic(path.join(historyExportsDir, `${timestamp}-${tier}.json`), metadata);
  } catch (_) {
    console.warn('[EVALUATION_ROUTER] Failed to persist export metadata:', _?.message);
  }
  try { telemetryLib.recordExportTelemetry(metadata); } catch (_) {}
  res.json({ success: true, message: `Rank ${tier} corrected BOQ Excel exported`, filename: exportFilename, downloadPath: metadata.downloadPath, exportedAt: metadata.exportedAt });
});

// ── Audit Catalog ─────────────────────────────────────────────────────────────
router.post('/audit-catalog', (req, res) => {
  const { xlsxPath } = req.body;
  if (!xlsxPath) return sendErrorResponse(res, 400, 'xlsxPath required', { source: 'EVALUATION_ROUTER' });
  let fullXlsxPath;
  try { fullXlsxPath = assertSafePath(xlsxPath.replace(/^\/artifacts\//, '')); } catch (err) { return sendErrorResponse(res, 403, err, { source: 'EVALUATION_ROUTER' }); }
  const verifyScript = path.join(PROJECT_ROOT, 'tests', 'integration', 'verify_excel_tally.js');
  execFile('node', [verifyScript, fullXlsxPath, '--json'], (err, stdout) => {
    try { res.json(JSON.parse(stdout)); } catch (_) { res.json({ passed: false, error: err?.message || 'Audit output unparseable', raw: stdout }); }
  });
});

// ── Recompute Strategy Matrix with Grounded RAG ──────────────────────────────
function resolveRecomputeProduct(evalData, requestedDirectory) {
  const directory = evalData.chassisDir || evalData.evalResults?.chassisDir;
  const expected = assertSafePath(resolveChassisDirectory(directory));
  if (requestedDirectory && assertSafePath(resolveChassisDirectory(requestedDirectory)) !== expected) {
    const error = new Error('Product does not match the stored evaluation');
    error.status = 409;
    throw error;
  }
  return expected;
}

router.post('/recompute-matrix', (req, res) => {
  const { getRunSnapshot } = require('../services/taskManager.cjs');
  const { ragResult, chassisDir, runId } = req.body;
  const snapshot = getRunSnapshot();
  const stored = snapshot.latestResult;
  if (snapshot.activeTask?.task === 'EVAL_BOQ' && snapshot.activeTask.runId !== runId) {
    return sendErrorResponse(res, 409, 'A newer evaluation is running', { source: 'EVALUATION_ROUTER' });
  }
  if (!runId || stored?.runId !== runId || !stored.data) {
    return sendErrorResponse(res, 409, 'Recompute requires the current server-held evaluation run', { source: 'EVALUATION_ROUTER' });
  }
  const evalData = stored.data;
  if (!evalData || !ragResult) {
    return sendErrorResponse(res, 400, 'evalData and ragResult payloads are required', { source: 'EVALUATION_ROUTER' });
  }
  try {
    const { recomputeStrategyMatrixWithRag } = require('../../scripts/evaluators/eval_boq.js');
    let safeChassisDir;
    try { safeChassisDir = resolveRecomputeProduct(evalData, chassisDir); }
    catch (err) { return sendErrorResponse(res, err.status || 403, err, { source: 'EVALUATION_ROUTER' }); }
    const updatedData = recomputeStrategyMatrixWithRag(evalData, ragResult, safeChassisDir);
    broadcastSSE({ type: 'EVAL_RESULT_UPDATED', data: updatedData, runId, inputDescriptor: stored.inputDescriptor });
    res.json({ success: true, data: updatedData });
  } catch (err) {
    sendErrorResponse(res, 500, err, { source: 'EVALUATION_ROUTER' });
  }
});

// ── Telemetry ─────────────────────────────────────────────────────────────────
router.get('/telemetry', (req, res) => res.json(telemetryLib.loadTelemetry()));

// ── Decision Traces (GAP 7) ───────────────────────────────────────────────────
router.get('/decision-traces', (req, res) => {
  try {
    const { loadHistoricalDecisionTraces } = require('../../scripts/lib/conflict/decision_trace.js');
    const traces = loadHistoricalDecisionTraces(HISTORY_DIR);
    res.json(traces);
  } catch (err) {
    sendErrorResponse(res, 500, err, { source: 'EVALUATION_ROUTER' });
  }
});

// ── Presales Intent Query Router ──────────────────────────────────────────────
function resolveQueryContext(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Query context must be an object');
  const context = { ...input };
  for (const key of ['filePath', 'file', 'secondaryFilePath', 'vendorFilePath', 'customerFilePath']) {
    if (context[key]) context[key] = assertSafePath(context[key]);
  }
  if (context.chassisDir) context.chassisDir = assertSafePath(resolveChassisDirectory(context.chassisDir));
  return context;
}

router.post('/query/route', async (req, res) => {
  if (isTaskRunning()) return sendErrorResponse(res, 409, 'Another workflow is currently running', { source: 'EVALUATION_ROUTER' });
  const { query, context: inputContext } = req.body || {};
  if (typeof query !== 'string' || !query.trim()) return sendErrorResponse(res, 400, 'Missing query parameter', { source: 'EVALUATION_ROUTER' });
  let context;
  try { context = resolveQueryContext(inputContext || {}); }
  catch (err) { return sendErrorResponse(res, 400, err, { source: 'EVALUATION_ROUTER' }); }
  const { _setActiveTask, getActiveTask } = require('../services/taskManager.cjs');
  const runId = `query_${Date.now()}_${require('crypto').randomBytes(4).toString('hex')}`;
  const abortController = new AbortController();
  _setActiveTask({ type: 'PRESALES_QUERY', runId, startTime: Date.now(), abortController });
  broadcastSSE({ type: 'TASK_STARTED', task: 'PRESALES_QUERY', runId, product: context.chassisName });
  let code = 1;
  try {
    const { executeRoutedQuery } = require('../../scripts/evaluators/route_query.js');
    const result = await executeRoutedQuery(query, { ...context, signal: abortController.signal });
    result.cancellationRequested = abortController.signal.aborted;
    code = result.result?.status === 'ERROR' ? 1 : 0;
    broadcastSSE({ type: 'ROUTED_RESULT', runId, product: context.chassisName, data: result, cancellationRequested: abortController.signal.aborted });
    res.json(result);
  } catch (err) {
    sendErrorResponse(res, 500, err, { source: 'EVALUATION_ROUTER' });
  } finally {
    if (getActiveTask()?.runId === runId) _setActiveTask(null);
    broadcastSSE({ type: 'TASK_COMPLETED', task: 'PRESALES_QUERY', runId, code });
  }
});

router.post('/query/classify', (req, res) => {
  try {
    const { classifyQueryIntent } = require('../../scripts/evaluators/route_query.js');
    const { query, context } = req.body || {};
    if (!query) return sendErrorResponse(res, 400, 'Missing query parameter', { source: 'EVALUATION_ROUTER' });
    const classification = classifyQueryIntent(query, context || {});
    res.json(classification);
  } catch (err) {
    sendErrorResponse(res, 500, err, { source: 'EVALUATION_ROUTER' });
  }
});

module.exports = router;
