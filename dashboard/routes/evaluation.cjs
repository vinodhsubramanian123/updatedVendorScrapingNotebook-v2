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

// Multer config — kept local to this route module
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TEMP_DIR),
  filename: (req, file, cb) => {
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `boq_${Date.now()}_${cleanName}`);
  }
});
const upload = multer({ storage });

// Top-level imports for lib helpers
const { preprocessAndGroupBOQ, savePreprocessingRuleFeedback } = require('../../scripts/lib/boq/boq_preprocessor.js');
const { safeWriteJsonAtomic } = require('../../scripts/lib/system/fs_compat.js');
const { isImageFile, performGeminiOcr } = require('../../scripts/lib/ocr/ocr_service.js');
const { recordCleansingPreflightTelemetry, recordOcrTelemetry } = require('../../scripts/lib/system/telemetry.js');
const telemetryLib = require('../../scripts/lib/system/telemetry.js');
const { generateProfessionalBOQ } = require('../../scripts/lib/boq/generate_boq_xlsx.js');
const { safeParseEvalResult } = require('../../scripts/lib/system/schemas.js');

// ── Upload BOQ ────────────────────────────────────────────────────────────────
router.post('/upload-boq', upload.single('boqFile'), (req, res) => {
  if (!req.file) return sendErrorResponse(res, 400, 'No BOQ file uploaded', { source: 'EVALUATION_ROUTER' });
  res.json({ message: 'BOQ uploaded successfully', filepath: req.file.path, filename: req.file.originalname });
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
    const targetDir = chassisDir && fs.existsSync(chassisDir) ? chassisDir : HISTORY_DIR;
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
    let safeChassisDir = null;
    if (chassisDir) safeChassisDir = assertSafePath(chassisDir);
    const targetDir = safeChassisDir && fs.existsSync(safeChassisDir) ? safeChassisDir : path.join(OUTPUTS_DIR, 'ProLiant', 'Gen12', 'DL380_Gen12_SFF');
    const record = savePreprocessingRuleFeedback({ configId, splitReason, notes }, targetDir);
    const deltasFile = path.join(targetDir, 'history', 'catalog_deltas.json');
    let deltas = [];
    try { if (fs.existsSync(deltasFile)) deltas = JSON.parse(fs.readFileSync(deltasFile, 'utf-8')); } catch (_) {}
    deltas.push({ deltaId: `PREPROC-DELTA-${Date.now()}`, timestamp: new Date().toISOString(), ruleType: 'PREPROCESSING_SPLIT_CONFIRMED', ruleUpdate: `Confirmed split reason '${splitReason}' for ${configId}`, notes: notes || '', scopeTaxonomy: 'CHASSIS_SPECIFIC' });
    safeWriteJsonAtomic(deltasFile, deltas);
    res.json({ status: 'SUCCESS', record });
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
    targetPath = path.join(TEMP_DIR, `boq_text_${Date.now()}.json`);
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
      fs.writeFileSync(path.join(traceDir, `${runId}.json`), JSON.stringify({ runId, taskType: 'EVAL_BOQ', startTime: new Date().toISOString(), durationMs: 0, exitCode: 1, logs }, null, 2));
    }
    broadcastSSE({ type: 'TASK_STARTED', task: 'EVAL_BOQ', runId });
    broadcastSSE({ type: 'LOG', text: errorMsg, stream: 'stderr' });
    broadcastSSE({ type: 'TASK_COMPLETED', code: 1, task: 'EVAL_BOQ', runId, durationMs: 0 });
    return res.status(400).json({ error: errorMsg });
  }

  const evalScript = path.join(PROJECT_ROOT, 'scripts', 'evaluators', 'eval_boq.js');
  const args = [evalScript, targetPath, '--json'];
  if (safeChassisDir) args.push('--chassis', safeChassisDir);
  if (process.env.OFFLINE_MODE === '1' || process.env.NODE_ENV === 'test') args.push('--offline');

  const proc = spawn('node', args, { cwd: PROJECT_ROOT, env: { ...process.env, STRUCTURED_PROGRESS: '1' } });
  // Set activeTask directly via internal reference — taskManager owns the state
  const { startTime: _t, ...rest } = { startTime: Date.now() };
  // Use broadcastSSE to signal start; we manage this eval task inline since it has
  // special stdout-parsing logic for EVAL_RESULT extraction
  broadcastSSE({ type: 'TASK_STARTED', task: 'EVAL_BOQ', runId });
  res.status(202).json({ status: 'ACCEPTED', runId, message: 'Evaluation job started in background' });

  let stdoutBuffer = '';
  const lineBuffers = { stdout: '', stderr: '' };
  const evalStartTime = Date.now();

  // Mark activeTask manually for mutex guard compatibility
  // (taskManager.getActiveTask() is checked by isTaskRunning)
  require('../services/taskManager.cjs')._setActiveTask({ type: 'EVAL_BOQ', runId, pid: proc.pid, process: proc, startTime: evalStartTime });

  const handleData = (data, streamType) => {
    const chunkStr = data.toString();
    if (streamType === 'stdout') stdoutBuffer += chunkStr;
    const fullStr = lineBuffers[streamType] + chunkStr;
    const lines = fullStr.split('\n');
    lineBuffers[streamType] = lines.pop() || '';
    lines.forEach(line => {
      if (!line.trim()) return;
      logs.push({ timestamp: new Date().toISOString(), stream: streamType, text: line });
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

  proc.on('close', (code) => {
    ['stdout', 'stderr'].forEach(st => {
      if (lineBuffers[st]?.trim()) {
        logs.push({ timestamp: new Date().toISOString(), stream: st, text: lineBuffers[st] });
        broadcastSSE({ type: 'LOG', text: lineBuffers[st], stream: st });
      }
    });
    require('../services/taskManager.cjs')._setActiveTask(null);
    const durationMs = Date.now() - evalStartTime;
    broadcastSSE({ type: 'TASK_COMPLETED', code, task: 'EVAL_BOQ', runId, durationMs });

    if (targetPath?.includes(TEMP_DIR) && fs.existsSync(targetPath)) {
      try { fs.unlinkSync(targetPath); } catch (_) {}
    }

    // Persist trace
    const traceDir = path.join(OUTPUTS_DIR, 'history', 'runs');
    if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir, { recursive: true });
    try {
      const { safeWriteJsonAtomic } = require('../../scripts/lib/system/fs_compat.js');
      safeWriteJsonAtomic(path.join(traceDir, `${runId}.json`), { runId, taskType: 'EVAL_BOQ', startTime: new Date(evalStartTime).toISOString(), durationMs, exitCode: code, logs });
    } catch (e) {
      console.error(`[evaluation.cjs] Failed to persist trace ${runId}:`, e.message);
    }

    // Extract and broadcast EVAL_RESULT from stdout
    try {
      let parsedData = null;
      const markerTag = '__EVAL_RESULT_JSON__';
      const firstMarker = stdoutBuffer.indexOf(markerTag);
      const lastMarker = stdoutBuffer.lastIndexOf(markerTag);
      if (firstMarker !== -1 && lastMarker !== -1 && lastMarker > firstMarker) {
        try { parsedData = JSON.parse(stdoutBuffer.substring(firstMarker + markerTag.length, lastMarker).trim()); } catch (_) {}
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
      if (parsedData?.status === 'SUCCESS' && parsedData.data) {
        const validated = safeParseEvalResult(parsedData.data);
        const broadcastPayload = validated.success ? validated.data : parsedData.data;
        broadcastSSE({ type: 'EVAL_RESULT', data: broadcastPayload, runId });
      } else if (parsedData) {
        broadcastSSE({ type: 'EVAL_RESULT', error: parsedData, runId });
      } else {
        throw new Error('No valid JSON result found in stdout');
      }
    } catch (err) {
      broadcastSSE({ type: 'EVAL_RESULT', error: 'Failed to parse evaluator JSON', runId });
    }
  });

  proc.on('error', (err) => {
    require('../services/taskManager.cjs')._setActiveTask(null);
    broadcastSSE({ type: 'LOG', text: `Evaluator process error: ${err.message}`, stream: 'stderr' });
    broadcastSSE({ type: 'EVAL_RESULT', error: err.message, runId });
  });
});

// ── Export Corrected BOQ ──────────────────────────────────────────────────────
router.post('/export-boq', (req, res) => {
  const { evalResults, chassisId, rankTier } = req.body;
  if (!evalResults) return sendErrorResponse(res, 400, 'evalResults payload is required', { source: 'EVALUATION_ROUTER' });
  const tier = rankTier || 1;
  const timestamp = Date.now();
  const exportDir = path.join(OUTPUTS_DIR, 'temp', 'exports');
  if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });
  const cleanChassisId = String(chassisId || 'unknown').replace(/[^a-zA-Z0-9_\-]/g, '_');
  const exportFilename = `corrected_boq_rank${tier}_${cleanChassisId}_${timestamp}.xlsx`;
  const exportPath = path.join(exportDir, exportFilename);
  generateProfessionalBOQ(evalResults, exportPath, chassisId, tier);
  const rankedSolution = evalResults.conflictGraph?.rankedSolutions?.find(s => s.rank === tier) || null;
  const historyExportsDir = path.join(OUTPUTS_DIR, 'history', 'exports');
  if (!fs.existsSync(historyExportsDir)) fs.mkdirSync(historyExportsDir, { recursive: true });
  const metadata = { id: `${timestamp}-${tier}`, filename: exportFilename, chassisId: chassisId || 'Unknown', rank: tier, solutionName: rankedSolution?.name || 'N/A', estimatedCostUsd: rankedSolution?.estimatedCostUsd || 0, downloadPath: `/artifacts/temp/exports/${exportFilename}`, exportedAt: new Date(timestamp).toISOString() };
  try {
    const { safeWriteJsonAtomic } = require('../../scripts/lib/system/fs_compat.js');
    safeWriteJsonAtomic(path.join(historyExportsDir, `${timestamp}-${tier}.json`), metadata);
  } catch (_) {
    fs.writeFileSync(path.join(historyExportsDir, `${timestamp}-${tier}.json`), JSON.stringify(metadata, null, 2));
  }
  try { telemetryLib.recordExportTelemetry(metadata); } catch (_) {}
  res.json({ message: `Rank ${tier} corrected BOQ Excel exported`, filename: exportFilename, downloadPath: metadata.downloadPath, exportedAt: metadata.exportedAt });
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

// ── Telemetry ─────────────────────────────────────────────────────────────────
router.get('/telemetry', (req, res) => res.json(telemetryLib.loadTelemetry()));

module.exports = router;
