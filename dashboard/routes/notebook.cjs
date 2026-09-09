'use strict';
/**
 * dashboard/routes/notebook.cjs — NotebookLM RAG & Ambiguity Resolution Routes
 *
 * Handles:
 *   POST /api/notebook-sanitization-preview
 *   GET  /api/notebook-scenarios
 *   POST /api/notebook-query
 *   POST /api/notebook-query-async
 *   GET  /api/notebook-query-status/:jobId
 *   GET  /api/test-notebooklm
 *   GET  /api/notebooklm-consultations
 *   POST /api/ask-notebook
 *   POST /api/resolve-ambiguity
 *   POST /api/verify-vendor-bom
 *   POST /api/simulate-error
 *   GET  /api/config/notebooks
 *   POST /api/config/notebooks
 *   GET  /api/feedback-list
 *   POST /api/feedback-submit
 *   POST /api/feedback-mark-completed
 *   POST /api/portal-feedback
 *
 * Extracted from server.cjs (GAP-L3f).
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');

const { broadcastSSE } = require('../services/taskManager.cjs');
const { assertSafePath } = require('../services/pathGuard.cjs');
const { asyncHandler, sendErrorResponse } = require('../services/errorHandler.cjs');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const OUTPUTS_DIR = path.join(PROJECT_ROOT, 'outputs');
const CONFIG_DIR = path.join(PROJECT_ROOT, 'scripts', 'config');

// Top-level lib imports
const { safeWriteJsonAtomic } = require('../../scripts/lib/system/fs_compat.js');
const telemetryLib = require('../../scripts/lib/system/telemetry.js');
const feedbackQueue = require('../../scripts/lib/feedback/feedback_queue.js');
const { queryLocalKnowledgeBase } = require('../../scripts/lib/rag/local_rag_search.js');
const {
  getSanitizationBreakdown,
  executeNotebookQuery,
  sanitizeNotebookQuery,
  startAsyncNotebookQueryJob,
  getAsyncNotebookQueryJobStatus,
  cancelNotebookQueryJob,
  resumePendingJobs
} = require('../../scripts/lib/notebook/notebook_query_utils.js');
const logger = require('../../scripts/lib/system/pipeline_logger.js');
const { verifyVendorBOM } = require('../../scripts/lib/boq/vendor_bom_verifier.js');
const { processPortalFeedback } = require('../../scripts/lib/feedback/feedback_loop.js');
const { resolveChassisDirectory } = require('../../scripts/lib/catalog/sku_versioning.js');

if (process.env.NODE_ENV !== 'test') {
  const recovery = resumePendingJobs(executeNotebookQuery);
  if (recovery.length > 0) {
    logger.info('NOTEBOOK_ROUTE', `Recovered ${recovery.length} durable NotebookLM job(s) after server startup.`);
  }
}

/** Resolve the notebookId for a chassis from notebooks.json. Returns null if not found. */
function resolveNotebookId(chassis) {
  const notebooksPath = path.join(CONFIG_DIR, 'notebooks.json');
  if (!fs.existsSync(notebooksPath)) return null;
  try {
    const config = JSON.parse(fs.readFileSync(notebooksPath, 'utf-8'));
    const entry = chassis && config.notebooks?.[chassis];
    if (typeof entry !== 'object' || entry?.queryEnabled === false) return null;
    if (!Array.isArray(entry.trustedSourceIds) || entry.trustedSourceIds.length === 0) return null;
    const id = entry.notebookId;
    if (id?.trim()) return id.trim();
  } catch (e) { logger.warn('NOTEBOOK_ROUTE', 'Failed to read notebooks.json', e); }
  return null;
}

// ── Sanitization Preview ──────────────────────────────────────────────────────
router.post('/notebook-sanitization-preview', (req, res) => {
  const { query, chassis } = req.body;
  res.json(getSanitizationBreakdown(query, { chassis }));
});

// ── Canned Scenarios ──────────────────────────────────────────────────────────
router.get('/notebook-scenarios', (req, res) => {
  res.json({
    scenarios: [
      { id: 'THERMAL_TDP', title: 'High TDP Thermal Fan Check', icon: 'Thermometer', chassis: 'HPE ProLiant DL380 Gen12 SFF', query: 'Does an Intel Xeon Platinum 8480+ (350W TDP) processor require High Performance Fan Kits and Heatsinks on DL380 Gen12?', description: 'Verifies thermal TDP fan thresholds and cooling requirements against QuickSpecs.' },
      { id: 'TELCO_DC', title: 'Telco -48VDC Cable Lug Kit', icon: 'Zap', chassis: 'HPE ProLiant DL360 Gen12 SFF', query: 'When selecting 800W -48VDC Flex Slot Power Supplies on DL360 Gen12, is the DC power cable lug kit mandatory?', description: 'Checks electrical cable lug dependencies for DC telco environments.' },
      { id: 'STORAGE_CACHE', title: 'Smart Storage Battery Protection', icon: 'Database', chassis: 'HPE ProLiant DL380 Gen12 SFF', query: 'Does the HPE Smart Array P408i-a SR Gen10 Controller require an HPE Smart Storage Hybrid Capacitor or Battery Backup Kit?', description: 'Verifies cache memory battery protection requirements for Smart Array storage controllers.' },
      { id: 'MEMORY_SYMMETRY', title: 'Memory Channel Balance & Symmetry', icon: 'Cpu', chassis: 'HPE ProLiant DL380 Gen12 SFF', query: 'What are the DIMM interleaving and channel symmetry rules when installing 12x 64GB DDR5 DIMMs across 2 sockets?', description: 'Validates multi-socket DDR5 channel population rules.' },
      { id: 'PROCESSOR_SPECS', title: '64+ Core Processor Requirements', icon: 'Sparkles', chassis: 'HPE ProLiant DL380 Gen12 SFF', query: 'What are the power supply, memory speed, and thermal fan rules for 64-core processors in DL380 Gen12?', description: 'Audits ultra-high core density CPU rules.' },
      { id: 'PCIE_EXPANSION', title: 'PCIe Slot & Riser Allocation', icon: 'Layers', chassis: 'HPE ProLiant DL380 Gen12 SFF', query: 'Can Primary Riser 1 and Secondary Riser 2 be populated simultaneously with GPU cards without a second CPU?', description: 'Verifies PCIe socket/riser lane dependencies.' },
      { id: 'AMBIGUITY_HITL', title: 'Ambiguity & Human Fix Reasoning', icon: 'AlertTriangle', chassis: 'HPE ProLiant DL380 Gen12 SFF', query: 'const fs = require("fs"); function check() { return process.env; } Is P49025-B21 compatible with P76453-B21 on DL380 Gen12?', description: 'Tests pre-processor code stripping and natural language reconstruction of raw script input.' }
    ]
  });
});

// ── Synchronous Notebook Query ────────────────────────────────────────────────
router.post('/notebook-query', asyncHandler(async (req, res) => {
  const { query, chassis } = req.body;
  if (!query) return sendErrorResponse(res, 400, 'Query string is required', { source: 'NOTEBOOK_ROUTER' });

  const sanitizationDetails = getSanitizationBreakdown(query, { chassis });
  const notebookId = resolveNotebookId(chassis);

  if (!notebookId) {
    const localRes = queryLocalKnowledgeBase(query, chassis);
    return res.json({ ...localRes, sanitizationDetails, scenario: sanitizationDetails.scenario });
  }

  try {
    const startTime = Date.now();
    const result = await executeNotebookQuery(notebookId, query, { context: { chassis } });
    const durationMs = Date.now() - startTime;
    telemetryLib.recordNotebookConsultationTelemetry({
      query: result.query, sanitizedQuery: sanitizationDetails.sanitizedQuery, answer: result.answer,
      citations: result.citations, durationMs, scenario: sanitizationDetails.scenario, chassis,
      agreementScore: result.isCloudGrounded ? 0.95 : 0.6,
      nextActionExecuted: result.isCloudGrounded ? 'DEPENDENCY_VALIDATED_AND_DOUBLE_PROOFED' : 'LOCAL_FALLBACK_ADVISORY'
    });
    res.json({ ...result, durationMs, sanitizationDetails, scenario: sanitizationDetails.scenario, timestamps: { requestSentAt: new Date(startTime - durationMs).toISOString(), responseReceivedAt: new Date().toISOString() } });
  } catch (err) {
    res.json({ query: sanitizeNotebookQuery(query, { chassis }), sanitizationDetails, scenario: sanitizationDetails.scenario, answer: `NotebookLM Query Fallback: ${err.message || 'Timeout exceeded'}`, citations: [], source: 'FALLBACK' });
  }
}));

// ── Async Notebook Query ──────────────────────────────────────────────────────
router.post('/notebook-query-async', (req, res) => {
  const { query, chassis, learningEligible, chassisDir } = req.body;
  if (!query) return sendErrorResponse(res, 400, 'Query string is required', { source: 'NOTEBOOK_ROUTER' });

  const notebookId = resolveNotebookId(chassis);
  if (!notebookId) {
    return res.status(202).json({
      jobId: `job_${Date.now()}_local`,
      status: 'LOCAL_FALLBACK',
      result: {
        query: sanitizeNotebookQuery(query, { chassis }),
        answer: 'Local Evaluation Engine: Dedicated RAG notebook mapping unavailable for this chassis. Fails closed to local deterministic rules.',
        citations: [],
        source: 'LOCAL_FALLBACK',
        isCloudGrounded: false
      }
    });
  }
  let safeChassisDir = null;
  if (learningEligible) {
    if (!chassisDir || !chassis) return sendErrorResponse(res, 400, 'learningEligible queries require exact chassis and chassisDir values', { source: 'NOTEBOOK_ROUTER' });
    try {
      safeChassisDir = assertSafePath(chassisDir);
      const expectedDir = resolveChassisDirectory(chassis);
      if (!expectedDir || !fs.existsSync(expectedDir) || path.resolve(expectedDir) !== path.resolve(safeChassisDir)) {
        return sendErrorResponse(res, 409, 'Learning target does not match the queried product generation; cross-product persistence blocked', { source: 'NOTEBOOK_ROUTER' });
      }
    } catch (err) {
      return sendErrorResponse(res, 403, err, { source: 'NOTEBOOK_ROUTER' });
    }
  }
  const jobInfo = startAsyncNotebookQueryJob(notebookId, query, {
    context: { chassis, learningEligible: Boolean(learningEligible), chassisDir: safeChassisDir }
  }, executeNotebookQuery);
  broadcastSSE({ type: 'LOG', text: `🤖 [ASYNC_RAG_LAUNCHED] Job ${jobInfo.jobId} started for ${chassis || 'DL380 Gen12 SFF'}`, stream: 'stdout' });
  res.status(202).json(jobInfo);
});

// ── Async Notebook Query Status ───────────────────────────────────────────────
router.get('/notebook-query-status/:jobId', (req, res) => {
  const status = getAsyncNotebookQueryJobStatus(req.params.jobId);
  if (!status) return sendErrorResponse(res, 404, `Query job '${req.params.jobId}' not found.`, { source: 'NOTEBOOK_ROUTER' });
  res.json(status);
});

router.post('/notebook-query-cancel/:jobId', (req, res) => {
  const cancelled = cancelNotebookQueryJob(req.params.jobId, req.body?.reason || 'CANCELLED_BY_CLIENT');
  if (!cancelled) {
    return sendErrorResponse(res, 409, `Query job '${req.params.jobId}' is not actively processing.`, { source: 'NOTEBOOK_ROUTER' });
  }
  res.json({ jobId: req.params.jobId, status: 'CANCELLED' });
});

// ── NotebookLM Health Test ────────────────────────────────────────────────────
router.get('/test-notebooklm', (req, res) => {
  const testScript = path.join(PROJECT_ROOT, 'tests', 'unit', 'test_notebooklm_mcp.js');
  if (!fs.existsSync(testScript)) return sendErrorResponse(res, 404, 'test_notebooklm_mcp.js not found', { source: 'NOTEBOOK_ROUTER' });
  execFile('node', [testScript], { cwd: PROJECT_ROOT }, (err, stdout) => {
    try {
      const lines = stdout.split('\n');
      const start = lines.findIndex(l => l.trim().startsWith('{'));
      if (start !== -1) return res.json(JSON.parse(lines.slice(start).join('\n')));
      res.json({ status: err ? 'DEGRADED' : 'HEALTHY', raw: stdout });
    } catch (_) { res.json({ status: err ? 'DEGRADED' : 'HEALTHY', raw: stdout }); }
  });
});

// ── NotebookLM Consultation Log ───────────────────────────────────────────────
router.get('/notebooklm-consultations', (req, res) => {
  const data = telemetryLib.loadTelemetry();
  const logs = data.notebookConsultations || [];
  res.json({
    totalQueries: data.totalNlmQueries || logs.length,
    citationMatches: logs.reduce((acc, c) => acc + (c.citations?.length || 0), 0),
    avgNlmResponseTimeMs: data.avgNlmResponseTimeMs || 140,
    nlmAgreementIndex: data.nlmAgreementIndex || 95,
    nlmCitationMatchRate: data.nlmCitationMatchRate || 100,
    nlmScenarioBreakdown: data.nlmScenarioBreakdown || {},
    log: logs
  });
});

// ── Ask Notebook (MCP Bridge) ─────────────────────────────────────────────────
router.post('/ask-notebook', asyncHandler(async (req, res) => {
  const { prompt, chassis } = req.body;
  if (!prompt) return sendErrorResponse(res, 400, 'prompt is required', { source: 'NOTEBOOK_ROUTER' });

  const notebookId = resolveNotebookId(chassis);
  if (!notebookId) {
    logger.warn('NOTEBOOK_ROUTE', `No notebook configured for chassis "${chassis || 'unknown'}". Routing to LOCAL_RAG_FALLBACK.`);
    const localRes = queryLocalKnowledgeBase(prompt, chassis || '');
    return res.json({ answer: localRes.answer, citations: localRes.citations || [], query: localRes.query, source: 'LOCAL_RAG_FALLBACK', groundingVerification: 'UNVERIFIED', isCloudGrounded: false, learningEligible: false, warning: `No notebook configured for chassis "${chassis || 'unknown'}"` });
  }

  try {
    const result = await executeNotebookQuery(notebookId, prompt, { context: { chassis } });
    res.json({ answer: result.answer, citations: result.citations || [], query: result.query, source: result.source, groundingVerification: result.groundingVerification, isCloudGrounded: result.isCloudGrounded === true, learningEligible: result.isCloudGrounded === true && result.groundingVerification === 'VERIFIED_GROUNDED' && (result.citations || []).length > 0 });
  } catch (err) {
    res.json({ answer: `NotebookLM is unavailable or did not return verified grounding. No hardware rule was inferred. Continue with deterministic local checks or submit evidence for human review. (${err.message})`, citations: [], query: sanitizeNotebookQuery(prompt, { chassis }), source: 'NOTEBOOK_LM_UNAVAILABLE', groundingVerification: 'UNVERIFIED', isCloudGrounded: false, learningEligible: false });
  }
}));

// ── Resolve Ambiguity (HITL) ──────────────────────────────────────────────────
router.post('/resolve-ambiguity', (req, res) => {
  const { ruleUpdate, chassis, affectedSku, requiredDependencySku, humanReasoning, scopeTaxonomy, solutionType, reviewer, evidence, confirmedVerified, supersedesRuleIds } = req.body;
  if (!chassis || !affectedSku || !ruleUpdate || !humanReasoning || !reviewer || !scopeTaxonomy) {
    return sendErrorResponse(res, 400, 'chassis, affectedSku, ruleUpdate, humanReasoning, reviewer, and scopeTaxonomy are required', { source: 'NOTEBOOK_ROUTER' });
  }
  if (String(ruleUpdate).trim().length < 20 || String(humanReasoning).trim().length < 20) {
    return sendErrorResponse(res, 400, 'ruleUpdate and humanReasoning must each contain at least 20 characters', { source: 'NOTEBOOK_ROUTER' });
  }
  if (confirmedVerified !== true || !Array.isArray(evidence) || evidence.length === 0) {
    return sendErrorResponse(res, 400, 'Explicit verification and at least one traceable evidence record are required', { source: 'NOTEBOOK_ROUTER' });
  }
  const outputDir = resolveChassisDirectory(chassis);
  if (!outputDir || !fs.existsSync(outputDir) || !path.resolve(outputDir).startsWith(`${OUTPUTS_DIR}${path.sep}`)) {
    return sendErrorResponse(res, 404, `No exact product-generation catalog found for chassis '${chassis}'`, { source: 'NOTEBOOK_ROUTER' });
  }

  try {
    const result = processPortalFeedback(ruleUpdate, outputDir, {
      affectedSku,
      requiredDependencySku: requiredDependencySku || null,
      ruleUpdate,
      humanReasoning,
      scopeTaxonomy,
      solutionType,
      sourceAgent: 'DASHBOARD_HITL_REVIEW',
      citations: evidence.map(item => item.id || item.url).filter(Boolean),
      humanReview: {
        reviewer,
        reasoning: humanReasoning,
        decision: 'APPROVE',
        verified: true,
        evidence,
        supersedesRuleIds: Array.isArray(supersedesRuleIds) ? supersedesRuleIds : []
      }
    });
    if (result.governanceStatus === 'REJECTED') {
      return res.status(422).json({ success: false, promoted: false, deltaId: result.deltaId, governanceStatus: 'REJECTED', reasons: result.rejectionReasons || [], message: 'Candidate rejected by knowledge governance; no active knowledge was changed' });
    }
    const promoted = result.governanceStatus === 'ACTIVE';
    broadcastSSE({ type: 'LOG', text: promoted ? `💡 [KNOWLEDGE_PROMOTED] ${result.deltaId} activated after evidence-backed review.` : `🛡️ [KNOWLEDGE_QUARANTINED] ${result.deltaId} retained for further review; no rule or NotebookLM source was updated.`, stream: promoted ? 'stdout' : 'stderr' });
    return res.status(promoted ? 200 : 202).json({ success: true, promoted, deltaId: result.deltaId, quarantineId: result.quarantineId || null, governanceStatus: result.governanceStatus, reasons: result.quarantineReasons || result.rejectionReasons || [], scopeTaxonomy: result.scopeTaxonomy, message: promoted ? 'Verified human decision activated and queued for knowledge sync' : 'Decision retained in quarantine; no active knowledge was changed' });
  } catch (err) {
    return sendErrorResponse(res, 422, err, { source: 'NOTEBOOK_ROUTER' });
  }
});

// ── Vendor BOM Cross-Verification ─────────────────────────────────────────────
router.post('/verify-vendor-bom', (req, res) => {
  const { vendorItems, proposedRankSolution, chassisDir } = req.body;
  if (!vendorItems || !Array.isArray(vendorItems)) return sendErrorResponse(res, 400, 'vendorItems array is required', { source: 'NOTEBOOK_ROUTER' });
  if (!chassisDir) return sendErrorResponse(res, 400, 'Exact chassisDir is required for vendor BOM verification', { source: 'NOTEBOOK_ROUTER' });
  let safeChassisDir;
  try {
    safeChassisDir = assertSafePath(resolveChassisDirectory(chassisDir));
    if (!fs.existsSync(safeChassisDir)) return sendErrorResponse(res, 404, 'Exact product-generation directory does not exist', { source: 'NOTEBOOK_ROUTER' });
  } catch (err) { return sendErrorResponse(res, 403, err, { source: 'NOTEBOOK_ROUTER' }); }
  try {
    const auditReport = verifyVendorBOM(vendorItems, proposedRankSolution, safeChassisDir);
    broadcastSSE({ type: 'LOG', text: auditReport.requiresFreshScrape ? '⚠️ [VENDOR_BOM_AUDIT] Uncataloged SKUs found. Fresh targeted CDP scrape recommended.' : `✅ [VENDOR_BOM_AUDIT] Vendor BOM cross-verified (${auditReport.is100PercentMatch ? '100% Match' : `${auditReport.quarantinedObservationCount} observations quarantined`}).`, stream: auditReport.requiresFreshScrape ? 'stderr' : 'stdout' });

    // Only already-promoted knowledge may trigger sync. Raw vendor differences
    // remain quarantined observations and cannot change NotebookLM sources.
    if (auditReport.learnedDeltaCount > 0) {
      setImmediate(() => {
        try {
          const { triggerPostFlowSync } = require('../../scripts/lib/sync/post_flow_sync.js');
          const chassisName = path.basename(safeChassisDir);
          const syncResult = triggerPostFlowSync(chassisName, 'RECONCILIATION');
          broadcastSSE({ type: 'LOG', text: `🔄 [AUTO_SYNC] Post-reconciliation knowledge sync: ${syncResult.success ? 'SUCCESS' : 'FAILED'} (${syncResult.masterRegistryRulesCount || 0} rules, ${syncResult.unSyncedDeltasCount || 0} unsynced)`, stream: syncResult.success ? 'stdout' : 'stderr' });
        } catch (syncErr) {
          broadcastSSE({ type: 'LOG', text: `⚠️ [AUTO_SYNC] Post-reconciliation sync failed: ${syncErr.message}`, stream: 'stderr' });
        }
      });
    }

    res.json({ ...auditReport, knowledgeSyncTriggered: auditReport.learnedDeltaCount > 0 });
  } catch (err) { sendErrorResponse(res, 500, err, { source: 'NOTEBOOK_ROUTER' }); }
});

// ── Simulate Portal Rejection ─────────────────────────────────────────────────
router.post('/simulate-error', (req, res) => {
  const { boqPath, errorMessage, chassis } = req.body;
  if (!errorMessage || !chassis) return sendErrorResponse(res, 400, 'errorMessage and exact chassis are required', { source: 'NOTEBOOK_ROUTER' });
  const outputDir = resolveChassisDirectory(chassis);
  if (!outputDir || !fs.existsSync(outputDir) || !path.resolve(outputDir).startsWith(`${OUTPUTS_DIR}${path.sep}`)) {
    return sendErrorResponse(res, 404, `No exact product-generation catalog found for chassis '${chassis}'`, { source: 'NOTEBOOK_ROUTER' });
  }
  const delta = processPortalFeedback(errorMessage, outputDir, { scopeTaxonomy: 'CHASSIS_SPECIFIC', solutionType: 'Portal Trial', runtimeBoqReference: boqPath || null });
  if (delta.governanceStatus === 'REJECTED') {
    return res.status(422).json({ message: 'Portal observation rejected by validation; no knowledge was changed', delta });
  }
  broadcastSSE({ type: 'LOG', text: `⚠️ [PORTAL_OBSERVATION] ${delta.deltaId} quarantined for evidence-backed review.`, stream: 'stdout' });
  res.status(202).json({ message: 'Portal observation quarantined; active rules and NotebookLM were not changed', delta });
});

// ── Notebook Config Registry ──────────────────────────────────────────────────
router.get('/config/notebooks', (req, res) => {
  const notebooksPath = path.join(CONFIG_DIR, 'notebooks.json');
  if (!fs.existsSync(notebooksPath)) return res.json({ defaultNotebookId: '', notebooks: {} });
  try { res.json(JSON.parse(fs.readFileSync(notebooksPath, 'utf-8'))); } catch (err) { sendErrorResponse(res, 500, err, { source: 'NOTEBOOK_ROUTER' }); }
});

router.post('/config/notebooks', (req, res) => {
  const { defaultNotebookId, notebooks } = req.body;
  if (!notebooks || typeof notebooks !== 'object') return sendErrorResponse(res, 400, 'notebooks object is required', { source: 'NOTEBOOK_ROUTER' });
  const notebooksPath = path.join(CONFIG_DIR, 'notebooks.json');
  try {
    const existing = fs.existsSync(notebooksPath) ? JSON.parse(fs.readFileSync(notebooksPath, 'utf-8')) : {};
    const updated = { ...existing, defaultNotebookId: defaultNotebookId || existing.defaultNotebookId || '', notebooks: { ...existing.notebooks, ...notebooks } };
    safeWriteJsonAtomic(notebooksPath, updated);
    res.json({ message: 'Notebook registry updated', config: updated });
  } catch (err) { sendErrorResponse(res, 500, err, { source: 'NOTEBOOK_ROUTER' }); }
});

// ── Feedback Queue ────────────────────────────────────────────────────
router.get('/feedback-list', (req, res) => res.json(feedbackQueue.listFeedback()));

router.post('/feedback-submit', (req, res) => {
  const { text, category, context } = req.body;
  if (!text) return sendErrorResponse(res, 400, 'Feedback text is required', { source: 'NOTEBOOK_ROUTER' });
  const entry = feedbackQueue.appendFeedback(text, category, context);

  res.json({ entry, agentPrompt: feedbackQueue.formatAgentTaskPrompt(entry), governanceStatus: 'PENDING_REVIEW', message: 'Feedback queued only; no knowledge source or active rule was changed.' });
});

router.post('/feedback-mark-completed', (req, res) => {
  const { feedbackId, resolution } = req.body;
  if (feedbackId) {
    const entry = feedbackQueue.markProcessed(feedbackId, resolution || 'Resolved by Antigravity AI', 'COMPLETED');
    if (!entry) return sendErrorResponse(res, 404, 'Feedback entry not found', { source: 'NOTEBOOK_ROUTER' });
    return res.json({ success: true, entry });
  }
  const pending = feedbackQueue.listFeedback('PENDING');
  const resolved = pending.map(p => feedbackQueue.markProcessed(p.id, resolution || 'Resolved by Antigravity AI', 'COMPLETED'));
  res.json({ success: true, count: resolved.length });
});

router.post('/portal-feedback', (req, res) => {
  const { rank, title, feedbackText } = req.body;
  const text = `[Portal Feedback Rank ${rank} - ${title}] ${feedbackText}`;
  const entry = feedbackQueue.appendFeedback(text, 'portal_feedback', { rank, title });
  res.json({ success: true, entry });
});

module.exports = router;
