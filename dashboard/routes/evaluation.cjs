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

const { isTaskRunning, getActiveTask, broadcastSSE, releaseTaskMutex, isCancellationRequested, _setActiveTask } = require('../services/taskManager.cjs');
const { isValidRunId, getRunById, runsById } = require('../services/runState.cjs');
const { assertSafePath } = require('../services/pathGuard.cjs');
const { asyncHandler, sendErrorResponse } = require('../services/errorHandler.cjs');
const policyResolver = require('../services/policyResolver.cjs');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const OUTPUTS_DIR = path.join(PROJECT_ROOT, 'outputs');
const TEMP_DIR = path.join(OUTPUTS_DIR, 'temp');
const HISTORY_DIR = path.join(OUTPUTS_DIR, 'history');
const DEFAULT_INTAKE_RETENTION_MS = 2 * 60 * 60 * 1000;

function getIntakeRetentionMs() {
  const parsed = parseInt(process.env.INTAKE_RETENTION_MS || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_INTAKE_RETENTION_MS;
}

function _collectProtectedTempPaths(retainedInput, now, maxAgeMs) {
  const protectedPaths = new Set();
  if (retainedInput) protectedPaths.add(path.resolve(retainedInput));
  try {
    for (const run of runsById.values()) {
      const ref = run?.inputDescriptor?.filepath;
      if (!ref) continue;
      const updated = Number(run.updatedAt || run.startTime || 0);
      if (run.status === 'RUNNING' || (run.status === 'ACTION_REQUIRED' && (now - updated) <= maxAgeMs)) {
        protectedPaths.add(path.resolve(ref));
      }
    }
  } catch (_) {}
  return protectedPaths;
}

function pruneStaleTempFiles(retainedInput, maxAgeMs = getIntakeRetentionMs()) {
  try {
    if (!fs.existsSync(TEMP_DIR)) return;
    const now = Date.now();
    const protectedPaths = _collectProtectedTempPaths(retainedInput, now, maxAgeMs);
    const files = fs.readdirSync(TEMP_DIR);
    for (const file of files) {
      if (!/^boq_(?:text_|candidate_)?\d+_[a-zA-Z0-9._-]+$/.test(file)) continue;
      const fullPath = path.join(TEMP_DIR, file);
      if (protectedPaths.has(path.resolve(fullPath))) continue;
      try {
        const stats = fs.statSync(fullPath);
        if (stats.isFile() && now - stats.mtimeMs > maxAgeMs) {
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
const crypto = require('crypto');
const { preprocessAndGroupBOQ, savePreprocessingRuleFeedback } = require('../../scripts/lib/boq/boq_preprocessor.js');
const { resolveChassisDirectory } = require('../../scripts/lib/catalog/sku_versioning.js');
const { safeWriteJsonAtomic } = require('../../scripts/lib/system/fs_compat.js');
const { isImageFile, performGeminiOcr } = require('../../scripts/lib/ocr/ocr_service.js');
const { recordCleansingPreflightTelemetry, recordOcrTelemetry } = require('../../scripts/lib/system/telemetry.js');
const telemetryLib = require('../../scripts/lib/system/telemetry.js');
const { generateProfessionalBOQ, _getRankedSolutions, _parseStrictRankTier } = require('../../scripts/lib/boq/generate_boq_xlsx.js');
const { deliveryFingerprint } = require('../../scripts/lib/boq/solution_evidence.js');
const { verifyDeliveryAuthorization } = require('../../scripts/lib/contracts/workflow_contract.js');
const { safeParseEvalResult } = require('../../scripts/lib/system/schemas.js');
const { spawnObservedChild } = require('../../scripts/lib/system/observed_child_process.js');

function isServerOffline() {
  if (typeof policyResolver.isServerOffline === 'function') {
    return policyResolver.isServerOffline({ includeRagOnly: false });
  }
  return ['1', 'true'].includes(String(process.env.OFFLINE_MODE || '').trim().toLowerCase()) ||
    ['1', 'true'].includes(String(process.env.LOCAL_EVAL_ONLY || '').trim().toLowerCase());
}

function safeIsImageFile(filePath) {
  if (typeof isImageFile === 'function') return isImageFile(filePath);
  if (!filePath || typeof filePath !== 'string') return false;
  return ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tiff', '.pdf'].includes(path.extname(filePath).toLowerCase());
}

function safeRandomHex(bytes = 4) {
  try {
    const cryptoLib = require('crypto');
    if (typeof cryptoLib.randomBytes === 'function') return cryptoLib.randomBytes(bytes).toString('hex');
  } catch (_) {}
  return Math.random().toString(16).slice(2, 2 + bytes * 2).padEnd(bytes * 2, '0');
}

function safeSha256(content) {
  try {
    const cryptoLib = require('crypto');
    if (typeof cryptoLib.createHash === 'function') {
      return cryptoLib.createHash('sha256').update(content || '').digest('hex');
    }
  } catch (_) {}
  return String(Buffer.from(content || '').length);
}

function safeReadBuffer(filePath) {
  if (typeof fs.readFileSync === 'function') return fs.readFileSync(filePath);
  return Buffer.from('');
}

function lookupRunByIdSafe(runId) {
  if (!runId) return null;
  try {
    const rs = require('../services/runState.cjs');
    if (typeof rs.getRunById === 'function') return rs.getRunById(runId);
  } catch (_) {}
  return null;
}

function resolveEffectivePolicySafe(params = {}) {
  if (typeof policyResolver.resolveEffectivePolicy === 'function') {
    return policyResolver.resolveEffectivePolicy(params);
  }
  const serverEnforced = isServerOffline();
  if (serverEnforced) {
    return {
      offline: true,
      offlineMode: true,
      serverEnforced: true,
      source: 'SERVER_ENFORCED',
      clientRequestedOffline: params.clientOffline ?? params.clientOfflineMode ?? null,
      ocrAllowed: false,
      cloudGroundingAllowed: false,
      resolvedAt: new Date().toISOString()
    };
  }
  if (params.inheritedPolicy?.serverEnforced === true || (params.lockInheritedOffline && params.inheritedPolicy?.offline === true)) {
    return {
      offline: true,
      offlineMode: true,
      serverEnforced: Boolean(params.inheritedPolicy.serverEnforced),
      source: params.inheritedPolicy.source || 'INHERITED_RUN_POLICY',
      clientRequestedOffline: params.clientOffline ?? params.clientOfflineMode ?? null,
      ocrAllowed: false,
      cloudGroundingAllowed: false,
      resolvedAt: new Date().toISOString()
    };
  }
  const offline = params.clientOffline === true || params.clientOfflineMode === true
    ? true
    : (params.clientOffline === false || params.clientOfflineMode === false || params.enableCloudValidation === true ? false : Boolean(params.defaultOffline));
  return {
    offline,
    offlineMode: offline,
    serverEnforced: false,
    source: offline ? 'DEFAULT_LOCAL_SAFE' : 'CLIENT_CLOUD_ENABLED',
    clientRequestedOffline: params.clientOffline ?? params.clientOfflineMode ?? null,
    ocrAllowed: !offline,
    cloudGroundingAllowed: !offline,
    resolvedAt: new Date().toISOString()
  };
}

// ── Upload BOQ ────────────────────────────────────────────────────────────────
router.post('/upload-boq', (req, res) => {
  upload.single('boqFile')(req, res, err => {
    if (err) return sendErrorResponse(res, 400, err.message || 'File upload failed', { source: 'EVALUATION_ROUTER' });
    if (!req.file) return sendErrorResponse(res, 400, 'No BOQ file uploaded', { source: 'EVALUATION_ROUTER' });
    if (safeIsImageFile(req.file.path) && req.file.size > 25 * 1024 * 1024) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
      return sendErrorResponse(res, 400, `Image/PDF file exceeds maximum allowed OCR size of 25MB. Please upload a file under 25MB or provide CSV/XLSX text.`, { source: 'EVALUATION_ROUTER' });
    }
    res.json({ message: 'BOQ uploaded successfully', filepath: req.file.path, filename: req.file.originalname });
  });
});

// ── Preprocess BOQ ────────────────────────────────────────────────────────────
function _buildOfflineInputBlockedPayload(effectivePolicy) {
  return {
    status: 'OFFLINE_INPUT_REQUIRED',
    error: 'Local-only execution is active. Image and scanned PDF OCR require cloud processing. Please provide pasted text or upload CSV/XLSX.',
    remediationAction: 'Provide pasted text or upload CSV/XLSX.',
    isOcrProcessed: false,
    effectivePolicy
  };
}

router.post('/preprocess-boq', asyncHandler(async (req, res) => {
  const { filepath, rawText, chassisDir, offline, offlineMode, enableCloudValidation, parentRunId, runId } = req.body || {};
  const parentRun = lookupRunByIdSafe(parentRunId || runId);
  const effectivePolicy = resolveEffectivePolicySafe({
    clientOffline: offline,
    clientOfflineMode: offlineMode,
    enableCloudValidation,
    inheritedPolicy: parentRun?.effectivePolicy || null,
    defaultOffline: true,
    lockInheritedOffline: true
  });
  const isOffline = effectivePolicy.offline;
  let targetPath = null, inputContent = rawText || '', ocrResult = null;

  if (filepath) {
    try {
      targetPath = assertSafePath(filepath);
    } catch (err) {
      return sendErrorResponse(res, 403, err, { source: 'EVALUATION_ROUTER', effectivePolicy });
    }
    if (fs.existsSync(targetPath)) {
      if (safeIsImageFile(targetPath)) {
        if (isOffline) {
          return res.status(422).json(_buildOfflineInputBlockedPayload(effectivePolicy));
        }
        broadcastSSE({ type: 'LOG', text: `📸 [OCR_SERVICE] Performing Gemini Vision OCR on ${path.basename(targetPath)}...`, stream: 'stdout' });
        ocrResult = await performGeminiOcr(targetPath, { offline: isOffline, offlineMode: isOffline, effectivePolicy });
        if (!ocrResult || !ocrResult.isOcrProcessed || ocrResult.ocrStatus === 'OFFLINE_BLOCKED' || ocrResult.ocrStatus !== 'SUCCESS') {
          const msg = ocrResult?.rawError || ocrResult?.remediationAction || ocrResult?.text || 'OCR processing could not extract items.';
          return res.status(422).json({
            status: ocrResult?.ocrStatus === 'OFFLINE_BLOCKED' ? 'OFFLINE_INPUT_REQUIRED' : 'OCR_EXTRACTION_FAILED',
            error: msg,
            remediationAction: ocrResult?.remediationAction || 'Provide pasted text or upload CSV/XLSX.',
            isOcrProcessed: false,
            effectivePolicy
          });
        }
        inputContent = ocrResult.text;
        const sizeBytes = typeof fs.statSync === 'function' ? fs.statSync(targetPath).size : Buffer.byteLength(inputContent || '');
        recordOcrTelemetry({ fileName: path.basename(targetPath), fileSizeBytes: sizeBytes, charLength: ocrResult.text?.length || 0, extractedSkusCount: ocrResult.detectedSkus?.length || 0 });
        broadcastSSE({ type: 'LOG', text: `✅ [OCR_SERVICE] Extracted ${ocrResult.lineCount} lines and ${ocrResult.detectedSkus.length} SKU(s).`, stream: 'stdout' });
      } else if (!targetPath.endsWith('.xlsx') && !targetPath.endsWith('.xls') && typeof fs.readFileSync === 'function') {
        inputContent = fs.readFileSync(targetPath, 'utf-8');
      }
    }
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
    res.json({ status: 'SUCCESS', preflightData: preflightResult, isOcrProcessed: !!ocrResult, effectivePolicy });
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
function _resolveRequestedRunId(rawRunId, defaultPrefix = 'run') {
  if (rawRunId === undefined || rawRunId === null || rawRunId === '') {
    return { runId: `${defaultPrefix}_${Date.now()}_${safeRandomHex(2)}` };
  }
  const candidate = String(rawRunId);
  if (!isValidRunId(candidate)) {
    return { errorStatus: 400, errorCode: 'INVALID_RUN_ID', errorMessage: 'Invalid runId format' };
  }
  if (getRunById(candidate)) {
    return { errorStatus: 409, errorCode: 'RUN_ID_ALREADY_EXISTS', errorMessage: `Run ID ${candidate} already exists` };
  }
  return { runId: candidate };
}

function _persistEvalTrace(runId, evalStartTime, durationMs, exitCode, logs, extra = {}) {
  const traceDir = path.join(OUTPUTS_DIR, 'history', 'runs');
  if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir, { recursive: true });
  try {
    safeWriteJsonAtomic(path.join(traceDir, `${runId}.json`), {
      runId,
      taskType: 'EVAL_BOQ',
      startTime: new Date(evalStartTime).toISOString(),
      durationMs,
      exitCode,
      ...extra,
      logs
    });
  } catch (e) {
    console.error(`[evaluation.cjs] Failed to persist trace ${runId}:`, e.message);
  }
}

function _extractStatusJsonPayload(stdoutBuffer) {
  const openBrace = String.fromCharCode(123);
  const closeBrace = String.fromCharCode(125);
  const markers = ['"SUCCESS"', ' "SUCCESS"', '"ERROR"', ' "ERROR"'].map(s => `${openBrace}"status":${s}`);
  const statusIdx = Math.max(...markers.map(m => stdoutBuffer.lastIndexOf(m)));
  if (statusIdx === -1) return null;
  const closeIdx = stdoutBuffer.lastIndexOf(closeBrace);
  if (closeIdx <= statusIdx) return null;
  try { return JSON.parse(stdoutBuffer.substring(statusIdx, closeIdx + 1)); } catch (_) { return null; }
}

function _extractLineJsonPayload(stdoutBuffer) {
  const lines = stdoutBuffer.split('\n').map(l => l.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const obj = JSON.parse(lines[i]);
      if (obj && (obj.status === 'SUCCESS' || obj.status === 'ERROR' || obj.data)) return obj;
    } catch (_) {}
  }
  return null;
}

function _parseEvalResultPayload(ipcResultPayload, stdoutBuffer) {
  if (ipcResultPayload) return ipcResultPayload;
  const markerTag = '__EVAL_RESULT_JSON__';
  const firstMarker = stdoutBuffer.indexOf(markerTag);
  const lastMarker = stdoutBuffer.lastIndexOf(markerTag);
  if (firstMarker !== -1 && lastMarker > firstMarker) {
    try { return JSON.parse(stdoutBuffer.substring(firstMarker + markerTag.length, lastMarker).trim()); } catch (_) {}
  }
  return _extractStatusJsonPayload(stdoutBuffer) || _extractLineJsonPayload(stdoutBuffer);
}

function _publishClosedEvalOutcome({ parsedData, cancelled, lastErrorMessage, runId, publishEvaluation }) {
  if (cancelled) {
    publishEvaluation({
      type: 'EVAL_RESULT',
      status: 'CANCELLED',
      error: { status: 'CANCELLED', message: 'Evaluation cancelled by user' },
      runId
    });
    return;
  }
  if (parsedData?.data && (['SUCCESS', 'ACTION_REQUIRED'].includes(parsedData.status) || parsedData.data.items || parsedData.data.evalResults)) {
    const validated = safeParseEvalResult(parsedData.data);
    if (validated.success) {
      const blocked = validated.data.customerDisposition === 'DELIVERY_BLOCKED_UNBUILDABLE' ||
        validated.data.evalResults?.customerDisposition === 'DELIVERY_BLOCKED_UNBUILDABLE';
      const resultStatus = blocked && parsedData.status !== 'ERROR' ? 'ACTION_REQUIRED' : parsedData.status || validated.data.status;
      publishEvaluation({ type: 'EVAL_RESULT', data: { ...validated.data, status: resultStatus }, runId });
      return;
    }
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
  if (parsedData) {
    publishEvaluation({ type: 'EVAL_RESULT', error: parsedData, runId });
  } else {
    publishEvaluation({ type: 'EVAL_RESULT', error: lastErrorMessage || 'Failed to parse evaluator JSON', runId });
  }
}

router.post('/eval-boq', (req, res) => {
  if (isTaskRunning()) return sendErrorResponse(res, 409, 'Another task is currently running', { source: 'EVALUATION_ROUTER', context: { task: getActiveTask()?.type } });

  const idCheck = _resolveRequestedRunId(req.body?.runId, 'run');
  if (idCheck.errorStatus) {
    return sendErrorResponse(res, idCheck.errorStatus, idCheck.errorMessage, { source: 'EVALUATION_ROUTER', code: idCheck.errorCode });
  }
  const runId = idCheck.runId;

  const { filepath, rawText } = req.body;
  const chassisDir = req.body.chassisDir || req.body.candidateReference?.chassisDir || req.body.candidateReference?.product;
  let safeFilepath = null, safeChassisDir = null;
  try {
    if (filepath) safeFilepath = assertSafePath(filepath);
    if (chassisDir) {
      safeChassisDir = assertSafePath(chassisDir);
      if (!fs.existsSync(safeChassisDir) && !String(chassisDir).includes('..') && !path.isAbsolute(String(chassisDir))) {
        const resolved = resolveChassisDirectory(chassisDir);
        if (resolved) safeChassisDir = assertSafePath(resolved);
      }
    }
  } catch (err) { return sendErrorResponse(res, 403, err, { source: 'EVALUATION_ROUTER' }); }

  const structuredItems = Array.isArray(req.body.candidateReference?.items) && req.body.candidateReference.items.length > 0
    ? req.body.candidateReference.items
    : (Array.isArray(req.body.items) && req.body.items.length > 0 ? req.body.items : null);
  let targetPath = safeFilepath;
  if (!targetPath && structuredItems) {
    targetPath = path.join(TEMP_DIR, `boq_candidate_${Date.now()}_${safeRandomHex(4)}.json`);
    fs.writeFileSync(targetPath, JSON.stringify({
      items: structuredItems,
      candidateReference: req.body.candidateReference || null
    }, null, 2), 'utf-8');
  } else if (!targetPath && rawText) {
    targetPath = path.join(TEMP_DIR, `boq_text_${Date.now()}_${safeRandomHex(4)}.txt`);
    fs.writeFileSync(targetPath, rawText, 'utf-8');
  }

  const logs = [];
  if (req.body.inputSha256) {
    const retentionMs = getIntakeRetentionMs();
    const expired = !targetPath || !fs.existsSync(targetPath) ||
      (typeof fs.statSync === 'function' && (Date.now() - fs.statSync(targetPath).mtimeMs) > retentionMs);
    if (expired) {
      return sendErrorResponse(res, 410, 'Original uploaded intake expired. Please re-upload the BOQ file.', {
        source: 'EVALUATION_ROUTER',
        code: 'INTAKE_EXPIRED',
        remediationAction: 'REUPLOAD_REQUIRED'
      });
    }
  }

  if (!targetPath || !fs.existsSync(targetPath)) {
    const errorMsg = 'Valid BOQ file or text input is required';
    _persistEvalTrace(runId, Date.now(), 0, 1, logs, { status: 'FAILED' });
    broadcastSSE({ type: 'TASK_STARTED', task: 'EVAL_BOQ', runId });
    broadcastSSE({ type: 'LOG', text: errorMsg, stream: 'stderr', runId });
    broadcastSSE({ type: 'TASK_COMPLETED', code: 1, task: 'EVAL_BOQ', runId, durationMs: 0 });
    return res.status(400).json({ error: errorMsg });
  }

  const evalScript = path.join(PROJECT_ROOT, 'scripts', 'evaluators', 'eval_boq.js');
  const inputSha256 = safeSha256(safeReadBuffer(targetPath));
  if (req.body.inputSha256 && req.body.inputSha256 !== inputSha256) {
    return sendErrorResponse(res, 409, 'Original intake content changed. Upload or review the input again.', {
      source: 'EVALUATION_ROUTER',
      code: 'INTAKE_CHANGED',
      remediationAction: 'REUPLOAD_REQUIRED'
    });
  }

  const candidateRef = req.body.candidateReference;
  const parentRun = lookupRunByIdSafe(candidateRef?.parentRunId || req.body.parentRunId);
  const effectivePolicy = resolveEffectivePolicySafe({
    clientOffline: req.body.offline !== undefined ? req.body.offline : candidateRef?.offlineMode,
    clientOfflineMode: req.body.offlineMode,
    enableCloudValidation: req.body.enableCloudValidation,
    inheritedPolicy: parentRun?.effectivePolicy || candidateRef?.effectivePolicy || req.body?.effectivePolicy || null,
    defaultOffline: true,
    lockInheritedOffline: true
  });
  const isOffline = effectivePolicy.offline;

  if (safeIsImageFile(targetPath) && isOffline) {
    const errorMsg = 'Local-only execution is active. Image and scanned PDF OCR require cloud processing. Please provide pasted text or upload CSV/XLSX.';
    return sendErrorResponse(res, 422, errorMsg, {
      source: 'EVALUATION_ROUTER',
      status: 'OFFLINE_INPUT_REQUIRED',
      isOcrProcessed: false,
      effectivePolicy,
      remediationAction: 'Provide pasted text or upload CSV/XLSX.'
    });
  }

  const inputDescriptor = { filepath: targetPath, sha256: inputSha256, offline: isOffline, effectivePolicy };
  const publishEvaluation = event => broadcastSSE({ ...event, inputDescriptor, effectivePolicy });
  const args = [evalScript, targetPath, '--json', '--defer-rag'];
  if (safeChassisDir) args.push('--chassis', safeChassisDir);
  if (isOffline) args.push('--offline');
  if (candidateRef?.serverCount || candidateRef?.nodeCount || req.body.serverCount) {
    args.push('--server-count', String(candidateRef?.serverCount || candidateRef?.nodeCount || req.body.serverCount));
  }
  if (candidateRef?.parentRunId || req.body.parentRunId) {
    args.push('--parent-run-id', String(candidateRef?.parentRunId || req.body.parentRunId));
  }
  if (candidateRef?.digest || req.body.candidateDigest) {
    args.push('--candidate-digest', String(candidateRef?.digest || req.body.candidateDigest));
  }

  const ownedCli = process.env.PRESALES_TERMINAL_OWNER === '1';
  const proc = spawnObservedChild('eval_boq', __filename, (extraEnv) =>
    spawn('node', args, {
      cwd: PROJECT_ROOT,
      env: { ...process.env, STRUCTURED_PROGRESS: '1', DASHBOARD_EFFECTIVE_POLICY: JSON.stringify(effectivePolicy), ...extraEnv },
      ...(ownedCli ? { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] } : {})
    })
  );
  if (ownedCli) proc._presalesCooperativeCancellation = true;

  const targetProduct = req.body.chassisName || candidateRef?.product || (safeChassisDir ? path.basename(safeChassisDir) : null);
  const evalStartTime = Date.now();
  _setActiveTask({ type: 'EVAL_BOQ', runId, pid: proc.pid, process: proc, startTime: evalStartTime, product: targetProduct });
  broadcastSSE({ type: 'TASK_STARTED', task: 'EVAL_BOQ', runId, product: targetProduct, effectivePolicy, inputDescriptor });
  res.status(202).json({ status: 'ACCEPTED', runId, product: targetProduct, effectivePolicy, inputDescriptor, message: 'Evaluation job started in background' });

  let stdoutBuffer = '';
  let ipcResultPayload = null;
  const lineBuffers = { stdout: '', stderr: '' };
  let completed = false;
  let lastErrorMessage = null;

  if (proc.on && typeof proc.on === 'function') {
    proc.on('message', (msg) => {
      if (msg?.type === 'EVAL_RESULT_PAYLOAD') ipcResultPayload = msg;
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
      broadcastSSE({ type: 'LOG', text: line, stream: streamType, runId });
    });
  };

  if (proc.stdout && typeof proc.stdout.on === 'function') proc.stdout.on('data', data => handleData(data, 'stdout'));
  if (proc.stderr && typeof proc.stderr.on === 'function') proc.stderr.on('data', data => handleData(data, 'stderr'));

  proc.on('error', (err) => {
    lastErrorMessage = err.message;
    broadcastSSE({ type: 'LOG', text: `Evaluator process error: ${err.message}`, stream: 'stderr', runId });
    const hasLivePid = Boolean(proc && typeof proc.pid === 'number' && proc.pid > 0);
    if (!hasLivePid && !completed) {
      completed = true;
      const cancelled = isCancellationRequested(runId);
      publishEvaluation({ type: 'EVAL_RESULT', error: cancelled ? { status: 'CANCELLED', message: 'Evaluation cancelled by user' } : err.message, runId });
      broadcastSSE({ type: 'TASK_COMPLETED', code: 1, task: 'EVAL_BOQ', runId, durationMs: 0, cancelled });
      _persistEvalTrace(runId, evalStartTime, 0, 1, logs, { product: targetProduct, status: cancelled ? 'CANCELLED' : 'FAILED' });
      releaseTaskMutex(runId, proc);
    }
  });

  proc.on('close', (code) => {
    if (completed) return;
    completed = true;

    ['stdout', 'stderr'].forEach(st => {
      if (lineBuffers[st]?.trim()) {
        logs.push({ timestamp: new Date().toISOString(), stream: st, text: lineBuffers[st] });
        broadcastSSE({ type: 'LOG', text: lineBuffers[st], stream: st, runId });
      }
    });

    const durationMs = Date.now() - evalStartTime;
    const parsedData = _parseEvalResultPayload(ipcResultPayload, stdoutBuffer);
    const cancelled = Boolean(isCancellationRequested(runId) || parsedData?.status === 'CANCELLED');

    _publishClosedEvalOutcome({ parsedData, cancelled, lastErrorMessage, runId, publishEvaluation });
    pruneStaleTempFiles(targetPath);
    broadcastSSE({ type: 'TASK_COMPLETED', code, task: 'EVAL_BOQ', runId, durationMs, cancelled });
    _persistEvalTrace(runId, evalStartTime, durationMs, code, logs, {
      product: targetProduct,
      status: cancelled ? 'CANCELLED' : undefined
    });
    releaseTaskMutex(runId, proc);
  });
});

// ── Export Corrected BOQ (Server-Owned Candidate & Cryptographic Gate) ───────
function _hasDiagnosticOverride(req) {
  const b = req.body || {};
  const q = req.query || {};
  return b.diagnostic !== undefined || b.isDiagnostic !== undefined || b.allowDiagnostic !== undefined ||
    q.diagnostic !== undefined || q.isDiagnostic !== undefined || q.allowDiagnostic !== undefined;
}

function _normalizeExportProductKey(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\b(hpe|proliant|synergy|alletra|storefabric|storeever|cray|cto|server|node|frame|enclosure)\b/gi, ' ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(?:_(?:8sff|24sff|8lff|12lff|edsff|sff|lff|nhp|rack|module))+$/i, '')
    .replace(/^_+|_+$/g, '');
}

function _isMatchingExportProduct(requestedChassis, storedTop, storedEval, serverRun) {
  const reqNorm = _normalizeExportProductKey(requestedChassis);
  if (!reqNorm || reqNorm === 'unknown') return true;
  const candidates = [
    storedEval?.chassis,
    storedEval?.chassisVariant,
    storedEval?.model,
    storedTop?.chassisPrefix,
    storedTop?.chassisDir ? path.basename(storedTop.chassisDir) : null,
    serverRun?.product
  ].filter(Boolean);
  if (candidates.length === 0) return true;
  return candidates.some(c => {
    const norm = _normalizeExportProductKey(c);
    return !norm || norm === 'unknown' || norm === reqNorm;
  });
}

function _resolveServerRunForExport(requestedRunId) {
  if (!requestedRunId || typeof requestedRunId !== 'string') return null;
  const { getRunSnapshot } = require('../services/taskManager.cjs');
  const { getRunById } = require('../services/runState.cjs');
  const direct = typeof getRunById === 'function' ? getRunById(requestedRunId) : null;
  if (direct) return direct;
  const snap = getRunSnapshot();
  if (snap.latestResult?.runId === requestedRunId) return snap.latestResult;
  return null;
}

function _extractStoredEvalFromRun(serverRun) {
  const top = serverRun?.result?.data || serverRun?.data || serverRun?.result || null;
  if (!top || typeof top !== 'object') return { top: null, evalObj: null };
  const inner = top.evalResults && typeof top.evalResults === 'object' ? top.evalResults : top;
  return { top, evalObj: inner };
}

function _normalizeItemSignatureList(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map(it => ({
      sku: String(it?.sku || it?.['Product #'] || '').trim().toUpperCase(),
      qty: Number(it?.quantity ?? it?.qty ?? 1)
    }))
    .filter(it => it.sku);
}

function _clientItemsDiffer(reqBody, clientEval, tier, storedCandidate) {
  const storedItems = _normalizeItemSignatureList(storedCandidate?.skuPartsList || storedCandidate?.skuList || []);
  const storedJson = JSON.stringify(storedItems);

  if (Array.isArray(reqBody.items) && reqBody.items.length > 0) {
    if (JSON.stringify(_normalizeItemSignatureList(reqBody.items)) !== storedJson) {
      return 'Requested items/quantities differ from stored candidate BOM';
    }
  }

  const clientSolutions = clientEval?.conflictGraph?.rankedSolutions || clientEval?.rankedSolutions || clientEval?.conflictGraph?.recommendedSolutions || [];
  const clientCandidate = Array.isArray(clientSolutions) ? clientSolutions.find(s => Number(s?.rank) === tier) : null;
  if (clientCandidate) {
    const clientItems = _normalizeItemSignatureList(clientCandidate.skuPartsList || clientCandidate.skuList || []);
    if (clientItems.length > 0 && JSON.stringify(clientItems) !== storedJson) {
      return 'Submitted candidate manifest differs from stored candidate BOM';
    }
  }
  return null;
}

function _verifyStoredDeliveryAuth(reqBody, storedTop, storedEval, storedProduct, tier, storedCandidate) {
  if (storedEval.isContractInvalid === true || storedTop?.isContractInvalid === true || storedEval.customerDisposition === 'DELIVERY_BLOCKED_UNBUILDABLE') {
    return { status: 422, code: 'CANDIDATE_BLOCKED', error: 'Export blocked: Candidate configuration is blocked or invalid' };
  }
  if (storedCandidate?.physicalMathClean === false) {
    return { status: 422, code: 'CANDIDATE_BLOCKED', error: `Export blocked: Strategy Rank ${tier} failed physical math checks` };
  }
  const acceptanceGate = storedEval.acceptanceGate || storedTop?.acceptanceGate;
  if (acceptanceGate?.isValid !== true) {
    const detail = storedEval.deliveryAuthError || acceptanceGate?.blockers?.map(b => b.detail || b.name || b.id).join('; ') || 'Pre-presentation acceptance gate did not pass';
    return { status: 403, code: 'DELIVERY_NOT_AUTHORIZED', error: `Export blocked: ${detail}` };
  }

  const storedAuth = storedEval.deliveryAuthorization || storedTop?.deliveryAuthorization || null;
  const authChassis = storedAuth?.chassisKey || storedEval.chassis || storedProduct;
  const fingerprint = deliveryFingerprint(storedEval);
  if (!verifyDeliveryAuthorization(storedAuth, fingerprint, { chassisKey: authChassis, profile: 'BOQ_EVALUATION' })) {
    return { status: 403, code: 'DELIVERY_NOT_AUTHORIZED', error: 'Export blocked: Stored DeliveryAuthorization is missing, expired, or failed cryptographic verification against the current candidate manifest' };
  }

  if (reqBody.deliveryAuthorization) {
    const reqAuth = reqBody.deliveryAuthorization;
    if (reqAuth.token !== storedAuth.token || reqAuth.signature !== storedAuth.signature) {
      return { status: 403, code: 'DELIVERY_NOT_AUTHORIZED', error: 'Export blocked: Submitted deliveryAuthorization does not match server-held run authorization' };
    }
  }
  return { ok: true, storedAuth, authChassis, tier };
}

function _buildCandidateAndWorkbookDigests(requestedRunId, authChassis, tier, candidateItems, exportPath) {
  const manifestPayload = {
    runId: requestedRunId,
    product: authChassis,
    rank: tier,
    items: candidateItems.map(it => ({
      sku: String(it.sku || it['Product #'] || '').trim(),
      qty: Number(it.quantity ?? it.qty ?? 1)
    }))
  };
  const candidateSha256 = crypto.createHash('sha256').update(JSON.stringify(manifestPayload)).digest('hex');
  const workbookSha256 = crypto.createHash('sha256').update(fs.readFileSync(exportPath)).digest('hex');
  return { candidateSha256, workbookSha256 };
}

router.post(['/export-boq', '/export-boq-xlsx'], (req, res) => {
  const body = req.body || {};
  if (_hasDiagnosticOverride(req)) {
    return sendErrorResponse(res, 400, 'Diagnostic export overrides are prohibited on customer export endpoints', { source: 'EVALUATION_ROUTER', code: 'DIAGNOSTIC_OVERRIDE_REJECTED' });
  }

  const clientPayload = body.evalResults && typeof body.evalResults === 'object' ? body.evalResults : {};
  const actualClientEval = clientPayload.evalResults || clientPayload.data?.evalResults || clientPayload;
  if (
    clientPayload.isContractInvalid === true ||
    clientPayload.data?.isContractInvalid === true ||
    actualClientEval.isContractInvalid === true ||
    clientPayload.status === 'SCHEMA_INVALID' ||
    actualClientEval.customerDisposition === 'DELIVERY_BLOCKED_UNBUILDABLE'
  ) {
    return sendErrorResponse(res, 422, 'Cannot export BOQ: Evaluator output failed schema contract validation or delivery authorization', { source: 'EVALUATION_ROUTER', code: 'SCHEMA_INVALID' });
  }

  const rawRank = body.rankTier !== undefined ? body.rankTier : body.rank;
  let tier;
  try {
    tier = _parseStrictRankTier(rawRank);
  } catch (rankErr) {
    return sendErrorResponse(res, 422, rankErr.message, { source: 'EVALUATION_ROUTER', code: 'INVALID_RANK' });
  }

  const requestedRunId = body.runId || clientPayload.runId || actualClientEval.runId || null;
  const serverRun = _resolveServerRunForExport(requestedRunId);
  if (!serverRun) {
    return sendErrorResponse(res, 404, 'Export blocked: Server-held evaluation run not found. Re-evaluate the BOQ before customer export.', { source: 'EVALUATION_ROUTER', code: 'RUN_NOT_FOUND', runId: requestedRunId });
  }

  const { top: storedTop, evalObj: storedEval } = _extractStoredEvalFromRun(serverRun);
  if (!storedEval) {
    return sendErrorResponse(res, 409, 'Export blocked: Stored run has no completed evaluation candidate', { source: 'EVALUATION_ROUTER', code: 'CANDIDATE_MISSING', runId: requestedRunId });
  }

  const storedProduct = storedEval.chassis || storedTop?.chassisPrefix || (storedTop?.chassisDir ? path.basename(storedTop.chassisDir) : '') || serverRun.product || 'unknown';
  const requestedChassis = body.chassisId || actualClientEval.chassis || actualClientEval.chassisVariant || actualClientEval.model || '';
  if (!_isMatchingExportProduct(requestedChassis, storedTop, storedEval, serverRun)) {
    return sendErrorResponse(res, 409, `Product mismatch: Export requested for ${requestedChassis} but evaluation run ${requestedRunId} belongs to ${storedProduct}`, { source: 'EVALUATION_ROUTER', code: 'PRODUCT_MISMATCH', runId: requestedRunId });
  }

  const storedSolutions = _getRankedSolutions(storedEval, { allowRawFallback: false, preferRankedList: true, diagnostic: false });
  const storedCandidate = storedSolutions.find(s => Number(s?.rank) === tier) || null;
  if (!storedCandidate) {
    return sendErrorResponse(res, 422, `Cannot export BOQ: Strategy Rank ${tier} does not exist in stored evaluation results`, { source: 'EVALUATION_ROUTER', code: 'UNSUPPORTED_RANK', runId: requestedRunId });
  }

  const candidateItems = storedCandidate.skuPartsList || storedCandidate.skuList || [];
  if (candidateItems.length === 0) {
    return sendErrorResponse(res, 422, `Cannot export BOQ: Strategy Rank ${tier} has no candidate items`, { source: 'EVALUATION_ROUTER', code: 'CANDIDATE_EMPTY', runId: requestedRunId });
  }

  const mismatchReason = _clientItemsDiffer(body, actualClientEval, tier, storedCandidate);
  if (mismatchReason) {
    return sendErrorResponse(res, 409, `Candidate mismatch: ${mismatchReason}`, { source: 'EVALUATION_ROUTER', code: 'CANDIDATE_MISMATCH', runId: requestedRunId });
  }

  const authCheck = _verifyStoredDeliveryAuth(body, storedTop, storedEval, storedProduct, tier, storedCandidate);
  if (!authCheck.ok) {
    return sendErrorResponse(res, authCheck.status, authCheck.error, { source: 'EVALUATION_ROUTER', code: authCheck.code, runId: requestedRunId });
  }

  const timestamp = Date.now();
  const exportDir = path.join(OUTPUTS_DIR, 'temp', 'exports');
  if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });
  const cleanChassisId = String(authCheck.authChassis).replace(/[^a-zA-Z0-9_-]/g, '_');
  const exportFilename = `corrected_boq_rank${tier}_${cleanChassisId}_${timestamp}.xlsx`;
  const exportPath = path.join(exportDir, exportFilename);

  try {
    generateProfessionalBOQ(storedEval, exportPath, authCheck.authChassis, tier, {
      diagnostic: false,
      chassisKey: authCheck.authChassis,
      profile: 'BOQ_EVALUATION'
    });
  } catch (err) {
    return sendErrorResponse(res, 403, `Export blocked: ${err.message}`, { source: 'EVALUATION_ROUTER', code: 'EXPORT_GENERATION_BLOCKED', runId: requestedRunId });
  }

  const { candidateSha256, workbookSha256 } = _buildCandidateAndWorkbookDigests(requestedRunId, authCheck.authChassis, tier, candidateItems, exportPath);
  const reviewState = storedEval.ephemeralSourceValidation?.doubleCheckVerdict || (storedEval.ephemeralSourceValidation?.success ? 'VERIFIED' : 'UNVERIFIED');
  const evidenceState = {
    vendorAcceptance: storedEval.portalValidationStatus || 'PORTAL_VALIDATION_PENDING',
    candidateDocumentReview: reviewState,
    deliveryAuthorization: 'AUTHORIZED',
    deliveryTokenPrefix: String(authCheck.storedAuth.token).slice(0, 22)
  };

  const historyExportsDir = path.join(OUTPUTS_DIR, 'history', 'exports');
  if (!fs.existsSync(historyExportsDir)) fs.mkdirSync(historyExportsDir, { recursive: true });
  const metadata = {
    id: `${timestamp}-${tier}`,
    filename: exportFilename,
    chassisId: authCheck.authChassis,
    product: storedProduct,
    rank: tier,
    solutionName: storedCandidate.name || 'N/A',
    estimatedCostUsd: storedCandidate.estimatedCostUsd ?? null,
    pricingComplete: storedCandidate.pricingComplete ?? null,
    runId: requestedRunId,
    isDiagnostic: false,
    candidateSha256,
    workbookSha256,
    evidenceState,
    downloadPath: `/artifacts/temp/exports/${exportFilename}`,
    exportedAt: new Date(timestamp).toISOString()
  };
  try {
    safeWriteJsonAtomic(path.join(historyExportsDir, `${timestamp}-${tier}.json`), metadata);
  } catch (e) {
    console.warn('[EVALUATION_ROUTER] Failed to persist export metadata:', e?.message);
  }
  try { telemetryLib.recordExportTelemetry(metadata); } catch (_) {}
  return res.json({
    success: true,
    message: `Rank ${tier} corrected BOQ Excel exported`,
    filename: exportFilename,
    runId: requestedRunId,
    chassisId: authCheck.authChassis,
    rank: tier,
    downloadPath: metadata.downloadPath,
    exportedAt: metadata.exportedAt,
    candidateSha256,
    workbookSha256,
    evidenceState
  });
});

// ── Isolated Internal Diagnostic Export (Excluded from Customer History) ───────
router.post('/export-boq-diagnostic', (req, res) => {
  const body = req.body || {};
  const rawRank = body.rankTier !== undefined ? body.rankTier : body.rank;
  let tier;
  try {
    tier = _parseStrictRankTier(rawRank);
  } catch (rankErr) {
    return sendErrorResponse(res, 422, rankErr.message, { source: 'EVALUATION_ROUTER', code: 'INVALID_RANK' });
  }

  let targetEval = body.evalResults ? (body.evalResults.evalResults || body.evalResults.data?.evalResults || body.evalResults) : null;
  if (!targetEval && body.runId) {
    const serverRun = _resolveServerRunForExport(body.runId);
    targetEval = _extractStoredEvalFromRun(serverRun).evalObj;
  }
  if (!targetEval || typeof targetEval !== 'object') {
    return sendErrorResponse(res, 400, 'evalResults or runId payload is required for diagnostic export', { source: 'EVALUATION_ROUTER' });
  }

  const targetChassis = body.chassisId || targetEval.chassis || targetEval.chassisVariant || targetEval.model || 'unknown';
  const diagDir = path.join(OUTPUTS_DIR, 'temp', 'diagnostic_exports');
  if (!fs.existsSync(diagDir)) fs.mkdirSync(diagDir, { recursive: true });
  const timestamp = Date.now();
  const cleanChassisId = String(targetChassis).replace(/[^a-zA-Z0-9_-]/g, '_');
  const exportFilename = `INTERNAL_DIAGNOSTIC_rank${tier}_${cleanChassisId}_${timestamp}.xlsx`;
  const exportPath = path.join(diagDir, exportFilename);

  try {
    generateProfessionalBOQ(targetEval, exportPath, targetChassis, tier, { diagnostic: true });
  } catch (err) {
    return sendErrorResponse(res, 422, `Diagnostic export failed: ${err.message}`, { source: 'EVALUATION_ROUTER', code: 'DIAGNOSTIC_EXPORT_FAILED' });
  }

  return res.json({
    success: true,
    diagnostic: true,
    message: `Rank ${tier} internal diagnostic workbook generated (excluded from customer export history)`,
    filename: exportFilename,
    rank: tier,
    chassisId: targetChassis,
    downloadPath: `/artifacts/temp/diagnostic_exports/${exportFilename}`,
    exportedAt: new Date(timestamp).toISOString()
  });
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
  const runRecord = lookupRunByIdSafe(runId);
  const offlineLocked = isServerOffline() ||
    runRecord?.effectivePolicy?.offline === true ||
    runRecord?.inputDescriptor?.offline === true ||
    stored?.effectivePolicy?.offline === true ||
    stored?.inputDescriptor?.offline === true ||
    evalData?.effectivePolicy?.offline === true ||
    evalData?.evalResults?.offlineMode === true ||
    evalData?.offlineMode === true;
  if (offlineLocked) {
    return sendErrorResponse(res, 409, 'Local-only run: deferred cloud recomputation is prohibited', { source: 'EVALUATION_ROUTER', runId });
  }
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
  const parentRun = lookupRunByIdSafe(context.parentRunId || context.runId);
  const effectivePolicy = resolveEffectivePolicySafe({
    clientOffline: context.offline,
    clientOfflineMode: context.offlineMode,
    enableCloudValidation: context.enableCloudValidation,
    inheritedPolicy: context.effectivePolicy || parentRun?.effectivePolicy || null,
    defaultOffline: true,
    lockInheritedOffline: true
  });
  context.effectivePolicy = effectivePolicy;
  context.offlineMode = effectivePolicy.offline;
  context.offline = effectivePolicy.offline;
  context.enableCloudValidation = effectivePolicy.offline ? false : true;
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

  const idCheck = _resolveRequestedRunId(req.body?.runId || context.runId, 'query');
  if (idCheck.errorStatus) {
    return sendErrorResponse(res, idCheck.errorStatus, idCheck.errorMessage, { source: 'EVALUATION_ROUTER', code: idCheck.errorCode });
  }
  const runId = idCheck.runId;
  context.runId = runId;

  const startTime = Date.now();
  const abortController = new AbortController();
  const routedProduct = context.chassisName || (context.chassisDir ? path.basename(context.chassisDir) : null);
  _setActiveTask({ type: 'PRESALES_QUERY', runId, startTime, abortController, product: routedProduct });
  broadcastSSE({ type: 'TASK_STARTED', task: 'PRESALES_QUERY', runId, product: routedProduct, effectivePolicy: context.effectivePolicy });
  let code = 1;
  try {
    const { executeRoutedQuery } = require('../../scripts/evaluators/route_query.js');
    const result = await executeRoutedQuery(query, { ...context, signal: abortController.signal, runId });
    const cancelled = Boolean(abortController.signal.aborted || isCancellationRequested(runId) || result?.result?.status === 'CANCELLED');
    result.runId = runId;
    result.effectivePolicy = context.effectivePolicy;
    result.cancellationRequested = cancelled;
    const isOfflineInputBlocked = result.result?.status === 'OFFLINE_INPUT_REQUIRED';
    code = (result.result?.status === 'ERROR' || isOfflineInputBlocked || cancelled) ? 1 : 0;
    broadcastSSE({ type: 'ROUTED_RESULT', runId, product: routedProduct, effectivePolicy: context.effectivePolicy, data: result, cancellationRequested: cancelled });
    if (isOfflineInputBlocked) {
      return res.status(422).json({
        ...result,
        status: 'OFFLINE_INPUT_REQUIRED',
        error: result.result.error,
        remediationAction: result.result.remediationAction || 'Provide pasted text or upload CSV/XLSX.'
      });
    }
    res.json(result);
  } catch (err) {
    sendErrorResponse(res, 500, err, { source: 'EVALUATION_ROUTER' });
  } finally {
    const cancelled = Boolean(abortController.signal.aborted || isCancellationRequested(runId));
    broadcastSSE({ type: 'TASK_COMPLETED', task: 'PRESALES_QUERY', runId, code, durationMs: Date.now() - startTime, cancelled });
    releaseTaskMutex(runId);
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
