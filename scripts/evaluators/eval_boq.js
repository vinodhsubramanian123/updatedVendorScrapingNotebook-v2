'use strict';
/**
 * scripts/eval_boq.js — CLI Pre-Flight BOQ Evaluator, Multi-Sheet Parser & Gemini Notebook Validator
 *
 * Thin canonical pipeline orchestrator delegating intake, physical/RAG phases, and matrix
 * recomputation to scripts/lib/boq/pipeline/*.
 *
 * Supports:
 *   --chassis <dir>    Target chassis catalog directory (auto-detected from BOQ if omitted)
 *   --json             Machine-parseable JSON output mode for dashboard SSE consumption
 *   --notebook-id <id> Override Gemini Notebook ID
 */

const fs = require('fs');
const terminalOwner = require('../lib/lifecycle/canonical_terminal_owner.js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { serializeAndExportResults, generateMarkdownReport } = require('../lib/boq/eval_output_serializer.js');
const { validateSolutionWithEphemeralSource } = require('../lib/sync/nlm_solution_source_validator.js');
const { emitProgress } = require('../lib/system/progress.js');
const { createEvidenceLedger } = require('../lib/system/evidence_ledger.js');
const { runWithTrace } = require('../lib/system/trace_context');
const { observeActualInvocation, associateCanonicalTrace } = require('../lib/system/execution_trace_runtime.js');
const { loadActiveKnowledgeRules } = require('../lib/catalog/active_knowledge_router.js');
const { recordAndCertifyLearnedRule } = require('../lib/feedback/continuous_learning_verifier.js');
const { LifecycleEngine } = require('../lib/lifecycle/lifecycle_engine.js');
const logger = require('../lib/system/pipeline_logger.js');

const {
  getDefaultNotebookId,
  parseEvaluationArguments,
  ingestAndConsolidateBoq
} = require('../lib/boq/pipeline/eval_boq_intake.js');
const {
  executePhysicalPreChecks,
  runBoqIngestionPhase,
  runBoqFingerprintingPhase,
  runBoqDomainAspectsPhase,
  runBoqConflictGraphPhase,
  runBoqModernizationPhase,
  runBoqStrategySynthesisPhase
} = require('../lib/boq/pipeline/eval_boq_stages.js');
const {
  executeGroundedRagValidation,
  runBoqRagGroundingPhase
} = require('../lib/boq/pipeline/eval_boq_rag_stage.js');
const { recomputeStrategyMatrixWithRag } = require('../lib/boq/pipeline/eval_boq_recompute.js');

// ============================================================
// Stage 6: Ephemeral Solution Source Validation & Strategy Double-Check (INV-97)
// ============================================================
async function executeEphemeralSourceValidation(options, ingestCtx, evalResults) {
  // Autonomous Strategy Double-Check (INV-97):
  // Runs whenever sheet validation is explicitly requested OR when cloud RAG is active and a live product notebook is mapped.
  const shouldValidate = options.SHEET_VALIDATION || (!options.OFFLINE_MODE && !options.DEFER_RAG && ingestCtx.notebookId);
  if (!shouldValidate) return null;
  emitProgress(9, 10, 'Checking candidate evidence', 'in_progress', 'Validating the ranked solution sheets.', { stage: 'POST_VERIFICATION' });
  try {
    const result = await validateSolutionWithEphemeralSource(evalResults, {
      notebookId: ingestCtx.notebookId,
      chassisName: ingestCtx.detectedChassisName || ingestCtx.chassisPrefix,
      targetDir: ingestCtx.chassisDir,
      isMock: options.OFFLINE_MODE,
      signal: options.signal,
      timeoutMs: options.timeoutMs ?? options.queryTimeoutMs,
      queryTimeoutMs: options.queryTimeoutMs ?? options.timeoutMs,
      deadlineAt: options.deadlineAt
    });
    if (result) {
      evalResults.solutionDoubleCheck = {
        status: result.doubleCheckVerdict || (result.isCloudGrounded ? 'DOUBLE_CHECK_PASSED' : (result.isMock ? 'OFFLINE_MOCK_VERIFIED' : 'LOCAL_RULES_PASSED')),
        verdict: result.doubleCheckVerdict,
        sourceId: result.sourceId,
        citationsCount: (result.citations || []).length,
        extractedDeltasCount: (result.extractedDeltas || []).length,
        ...(result.queryRecovery ? { queryRecovery: result.queryRecovery } : {})
      };
    }
    return result;
  } catch (ephErr) {
    const recovery = require('../lib/notebook/query_attempt_record.js').getNotebookQueryRecovery?.(ephErr, options.signal);
    if (recovery) { evalResults.notebookQueryRecovery = recovery; throw ephErr; }
    if ((options.signal?.aborted && Object.is(ephErr, options.signal.reason)) || ephErr?.code === 'NOTEBOOK_QUERY_DEADLINE_EXCEEDED') throw ephErr;
    const _logger = require('../lib/system/pipeline_logger.js');
    _logger.warn('EVAL_BOQ', `Ephemeral source validation note: ${ephErr.message}`);
    return null;
  }
}

// ============================================================
// Stage 7: Continuous Learning Reflection & Self-Reinforcement
// ============================================================
function _reconcileQuarantinedAndPromotedDeltas(chassisDir, activeRules, evalResults, evidenceLedger) {
  const {
    getQuarantinedDeltas,
    promoteQuarantinedDelta,
    retractPromotedDelta,
    pruneInvalidQuarantinedDeltas
  } = require('../lib/feedback/quarantined_deltas.js');

  const summary = { pruned: 0, autoPromoted: 0, retracted: 0 };
  try {
    const pruneRes = pruneInvalidQuarantinedDeltas();
    summary.pruned = pruneRes?.prunedCount || 0;
  } catch (_) {}

  try {
    const chassisName = path.basename(chassisDir);
    const quarantined = getQuarantinedDeltas();
    for (const item of quarantined) {
      if (String(item.chassis || '').toLowerCase() !== chassisName.toLowerCase()) continue;
      const hasCitations = Array.isArray(item.citations) && item.citations.length > 0;
      if (item.autoPromotable === true && item.evidenceObservationCount >= 3 && hasCitations && Number(item.confidenceScore) >= 0.85) {
        const promoted = promoteQuarantinedDelta(item.quarantineId || item.deltaId, 'AUTONOMOUS_REINFORCEMENT_GATE', {
          activationDirectory: chassisDir,
          reasoning: `Reinforced by ${item.evidenceObservationCount} observations with distinct cited evidence (score ${item.confidenceScore}).`
        });
        if (promoted) {
          summary.autoPromoted++;
          evidenceLedger?.recordSkuAudit?.(promoted.requiredDependencySku || promoted.affectedSku, 'DELTA_AUTO_PROMOTED',
            promoted.ruleUpdate, promoted.deltaId, 'Continuous Learning Auto-Promotion',
            { observationCount: item.observationCount, evidenceObservationCount: item.evidenceObservationCount });
        }
      }
    }
  } catch (_) {}

  try {
    const contradictions = evalResults?.contradictedLearnedRuleIds || [];
    for (const ruleId of contradictions) {
      if (retractPromotedDelta(ruleId, 'CONTRADICTED_BY_RUNTIME_VERIFICATION', { chassisDir })) {
        summary.retracted++;
        evidenceLedger?.recordSkuAudit?.(ruleId, 'DELTA_RETRACTED', 'Learned rule contradicted by verified runtime check and retracted.', ruleId, 'Continuous Learning Retraction', {});
      }
    }
  } catch (_) {}

  return summary;
}

function executeContinuousLearningReflection(evidenceLedger, ingestCtx, evalResults, _options) {
  const chassisDir = ingestCtx.chassisDir;
  terminalOwner.recordReflectionTarget(evidenceLedger, chassisDir);
  if (!chassisDir || !fs.existsSync(chassisDir)) return 0;

  const chassisName = path.basename(chassisDir);
  const activeRules = loadActiveKnowledgeRules(chassisName, chassisDir);
  const existingPairings = new Set(activeRules.allRules.map(r => `${(r.affectedSku || '').toUpperCase()}:${(r.requiredDependencySku || '').toUpperCase()}`));
  let learnedCount = 0;

  if (Array.isArray(evalResults.missingDependencies)) {
    const baseChassis = ingestCtx.items.find(i => i.isCTO || i.category === 'Base Chassis')?.sku || '';
    for (const dep of evalResults.missingDependencies) {
      if (!dep.sku || !baseChassis) continue;
      const pairKey = `${baseChassis.toUpperCase()}:${dep.sku.toUpperCase()}`;
      if (!existingPairings.has(pairKey)) {
        const delta = {
          deltaId: `DELTA_AUTO_${Date.now()}_${dep.sku.replace(/[^A-Za-z0-9]/g, '')}`,
          affectedSku: baseChassis,
          requiredDependencySku: dep.sku,
          ruleType: 'MANDATORY_DEPENDENCY',
          scopeTaxonomy: 'CHASSIS_SPECIFIC',
          confidenceScore: 0.95,
          ruleUpdate: dep.reason || `Mandatory dependency ${dep.sku} required by 7-aspect physical math.`,
          sourceCitation: 'AUTOMATED_PHYSICAL_MATH_DISCOVERY',
          status: 'PENDING',
          governanceStatus: 'PENDING',
          verificationStatus: 'REQUIRES_INDEPENDENT_VENDOR_EVIDENCE'
        };
        try {
          const cert = recordAndCertifyLearnedRule(delta, chassisDir);
          terminalOwner.recordReflectionProposal(evidenceLedger, cert);
          if (cert && cert.persisted) {
            learnedCount++;
            existingPairings.add(pairKey);
            evidenceLedger.recordSkuAudit(dep.sku, 'LEARNING_PROPOSED', delta.ruleUpdate, delta.deltaId, 'Mandatory dependency proposal', { status: 'PENDING' });
          }
        } catch (learnErr) {
          terminalOwner.recordReflectionFailure(evidenceLedger);
          const _logger = require('../lib/system/pipeline_logger.js');
          _logger.warn('EVAL_BOQ', `Continuous learning proposal failed: ${learnErr.message}`);
        }
      }
    }
  }

  evalResults.quarantineReconciliation = _reconcileQuarantinedAndPromotedDeltas(chassisDir, activeRules, evalResults, evidenceLedger);
  return learnedCount;
}

// ============================================================
// Main Orchestrator Pipeline
// ============================================================
function runEvaluationPipeline(options) {
  require('../lib/system/execution_budget.js').assertCallerActive(options, Date.now());
  return observeActualInvocation('runEvaluationPipeline', __filename, () => runWithTrace(options.traceId, () => {
    associateCanonicalTrace();
    return runEvaluationPipelineWithinTrace(options);
  }));
}

function _handlePipelineFailure(error, evidenceLedger, options) {
  let failedPhaseNum = 1;
  let recordedFailure = false;
  for (const phase of Object.values(evidenceLedger.phases)) {
    if (phase.status === 'RUNNING') {
      recordedFailure = true;
      failedPhaseNum = phase.phaseNumber;
      evidenceLedger.completePhase(phase.phaseNumber, 'FAILED', {}, [], [], [error.message]);
    }
  }
  if (!recordedFailure) {
    failedPhaseNum = evidenceLedger.phases.phase_8 ? 8 : 1;
    evidenceLedger.recordWorkflowFailure(error);
  }
  for (let n = 1; n <= 9; n++) {
    if (!evidenceLedger.phases[`phase_${n}`]) {
      evidenceLedger.phases[`phase_${n}`] = {
        phaseNumber: n,
        phaseName: `Phase ${n}`,
        status: 'NOT_REACHED',
        startedAt: null,
        completedAt: null,
        durationMs: 0,
        inputSummary: {},
        outputSummary: null,
        checks: [],
        warnings: [],
        errors: [`Pipeline aborted due to upstream failure in phase ${failedPhaseNum}: ${error.message}`]
      };
    }
  }
  const exported = evidenceLedger.finalizeAndExport(options.evidenceDir);
  error.traceId = evidenceLedger.traceId;
  error.evidenceLogPath = exported.jsonPath;
}

function _qualificationReason(record) {
  const summary = record.outputSummary || {};
  if (record.status === 'RUNNING') return 'Checks in progress.';
  if (record.errors?.length) return record.errors[0];
  if (summary.skipReason) return summary.skipReason;
  if (typeof summary.deliveryError === 'string') return summary.deliveryError;
  if (record.id === 'RAG_GROUNDING') {
    if (summary.solutionSourceValidation?.success) return 'NotebookLM returned applicable document evidence for the candidate.';
    if (summary.cloudJobDeferred) return 'Local evidence prepared. NotebookLM grounding continues after local evaluation.';
    if (summary.localOnly) return 'Local-only policy selected. Cloud document verification was skipped.';
  }
  const checks = record.checklistItems || [];
  const relevant = record.status === 'PASSED'
    ? checks.filter(check => check.status === 'PASS')
    : checks.filter(check => ['FAIL', 'FAILED', 'WARN', 'WARNING'].includes(check.status));
  return relevant.slice(0, 3).map(check => check.detail || check.details || check.label).filter(Boolean).join(' · ')
    || summary.error || 'See the evaluation evidence for this phase.';
}

function _createBoqQualificationReporter(engine) {
  if (process.env.STRUCTURED_PROGRESS !== '1') return undefined;
  let qualifications = engine.getPhases().map(phase => ({
    step: phase.phaseNum,
    title: phase.name,
    mode: 'Sequential',
    status: 'NOT_STARTED'
  }));
  return record => {
    const reason = _qualificationReason(record);
    qualifications = qualifications.map(phase => phase.step === record.phaseNum
      ? { ...phase, status: record.status, reason }
      : phase);
    emitProgress(record.phaseNum, qualifications.length, record.name,
      record.status === 'RUNNING' ? 'in_progress' : record.status === 'FAILED' ? 'error' : 'completed',
      reason, { stage: record.id, qualifications });
  };
}

async function _handleBoqIngestionPhase(ctx, options, evidenceLedger) {
  return runBoqIngestionPhase(ctx, options, evidenceLedger, ingestAndConsolidateBoq);
}

async function _handleBoqFingerprintingPhase(ctx, options, evidenceLedger) {
  return runBoqFingerprintingPhase(ctx, options, evidenceLedger);
}

async function _handleBoqDomainAspectsPhase(ctx, options, evidenceLedger) {
  return runBoqDomainAspectsPhase(ctx, options, evidenceLedger);
}

async function _handleBoqConflictGraphPhase(ctx, options, evidenceLedger) {
  return runBoqConflictGraphPhase(ctx, options, evidenceLedger);
}

async function _handleBoqModernizationPhase(ctx, options, evidenceLedger) {
  return runBoqModernizationPhase(ctx, options, evidenceLedger);
}

async function _handleBoqStrategySynthesisPhase(ctx, options, evidenceLedger) {
  return runBoqStrategySynthesisPhase(ctx, options, evidenceLedger);
}

async function _handleBoqRagGroundingPhase(ctx, options, evidenceLedger) {
  return runBoqRagGroundingPhase(ctx, options, evidenceLedger, executeEphemeralSourceValidation);
}

function _prepareNotebookDeliveryHealth(ctx) {
  ctx.evalResults.notebookHealth = ctx.ingestCtx.notebookHealth || null;
  ctx.evalResults.notebookDegradedMode = ctx.ingestCtx.notebookDegradedMode || null;
  if (ctx.ingestCtx.notebookHealth && !ctx.ingestCtx.notebookHealth.isHealthy) {
    if (!ctx.evalResults.warnings) ctx.evalResults.warnings = [];
    ctx.evalResults.warnings.push(`[DEGRADED_NOTEBOOK] Notebook for "${ctx.ingestCtx.detectedChassisName}" is degraded (${ctx.ingestCtx.notebookDegradedMode}). Confidence: ${ctx.ingestCtx.notebookHealth.confidenceLabel}.`);
  }
}

function _promoteTerminalPriceDrift(ctx, options) {
  if (Array.isArray(options.priceDriftItems) && options.priceDriftItems.length) {
    ctx.evalResults.priceDriftResult = require('../lib/feedback/feedback_loop.js').promotePriceDriftDeltas(ctx.ingestCtx.chassisDir, options.priceDriftItems, options.priceDriftMetadata || {});
  }
}

function _runLegacyDeliverablesPrelude(ctx, options, evidenceLedger) {
  const newLearningsCount = executeContinuousLearningReflection(evidenceLedger, ctx.ingestCtx, ctx.evalResults, options);
  ctx.evalResults.newLearningsCount = newLearningsCount;
  _prepareNotebookDeliveryHealth(ctx);
  _promoteTerminalPriceDrift(ctx, options);
}

function _assignDeliverablesScope(ctx, options) {
  const dirBase = ctx.ingestCtx.chassisDir ? path.basename(ctx.ingestCtx.chassisDir) : '';
  const targetChassis = ctx.ingestCtx.chassisPrefix || dirBase || ctx.evalResults.chassis || ctx.ingestCtx.detectedChassisName || 'PROLIANT_SERVER';
  const resolvedServerCount = ctx.ingestCtx.serverCount || options.serverCount || ctx.evalResults.configurationContext?.multiplier || 1;
  ctx.evalResults.chassis = targetChassis;
  ctx.evalResults.serverCount = resolvedServerCount;
  ctx.evalResults.nodeCount = ctx.ingestCtx.nodeCount || resolvedServerCount;
  ctx.evalResults.quantityBasis = ctx.ingestCtx.quantityBasis || (resolvedServerCount > 1 ? 'CLUSTER_MULTIPLIED' : 'SINGLE_NODE');
  if (ctx.ingestCtx.parentRunId || options.parentRunId) ctx.evalResults.parentRunId = ctx.ingestCtx.parentRunId || options.parentRunId;
  if (ctx.ingestCtx.candidateDigest || options.candidateDigest) ctx.evalResults.candidateDigest = ctx.ingestCtx.candidateDigest || options.candidateDigest;
  if (ctx.ingestCtx.candidateReference || options.candidateReference) ctx.evalResults.candidateReference = ctx.ingestCtx.candidateReference || options.candidateReference;
  return targetChassis;
}

function _applyAcceptanceDeliveryState(ctx, options, acceptance, targetChassis) {
  if (acceptance.isValid) {
    const { deliveryFingerprint } = require('../lib/boq/solution_evidence.js');
    const { issueDeliveryAuthorization } = require('../lib/contracts/workflow_contract.js');
    const rawFingerprint = deliveryFingerprint(ctx.evalResults);
    ctx.evalResults.manifestFingerprint = rawFingerprint;
    try {
      ctx.evalResults.deliveryAuthorization = issueDeliveryAuthorization({
        manifestFingerprint: rawFingerprint,
        chassisKey: targetChassis,
        acceptanceDecision: {
          isApproved: true,
          profile: 'BOQ_EVALUATION',
          evaluatedChecksCount: acceptance.totalChecks,
          passedChecks: acceptance.checks.filter(c => c.passed).map(c => c.id),
          failedChecks: acceptance.blockers.map(b => b.id),
          blockingErrors: acceptance.blockers.map(b => b.detail),
          warnings: acceptance.warnings.map(w => w.detail)
        }
      });
    } catch (authErr) {
      ctx.evalResults.deliveryAuthError = authErr.message;
      require('../lib/system/pipeline_logger.js').warn('EVAL_BOQ', `Delivery authorization issuance deferred: ${authErr.message}`);
    }
    ctx.evalResults.customerDisposition = 'VALIDATION_REQUIRED';
    return;
  }

  ctx.evalResults.customerDisposition = ctx.evalResults.isMathClean === false ? 'DELIVERY_BLOCKED_UNBUILDABLE' : 'VALIDATION_REQUIRED';
  if (!ctx.evalResults.deliveryAuthError && acceptance.blockersCount > 0) {
    ctx.evalResults.deliveryAuthError = `Pre-presentation acceptance failed with ${acceptance.blockersCount} blocker(s): ${acceptance.blockers.map(b => b.name || b.id).join(', ')}`;
  }
  if (ctx.evalResults.customerDisposition !== 'DELIVERY_BLOCKED_UNBUILDABLE') return;
  try {
    const { generateCounterfactualRepairProofs } = require('../lib/system/counterfactual_repair.js');
    ctx.evalResults.counterfactualRepairProofs = generateCounterfactualRepairProofs(ctx.evalResults, { ...options, ...ctx.ingestCtx });
  } catch (cfErr) {
    ctx.evalResults.counterfactualRepairProofs = [{
      issueType: 'REPAIR_EXECUTION_ERROR',
      rootCause: cfErr.message,
      requiredHardwareDeltas: [],
      requiredAction: { action: 'RESOLVE_SCOPED_CONSTRAINT', category: 'ENGINEERING_DIAGNOSTIC' },
      mathematicalProof: `Counterfactual repair engine encountered an execution error: ${cfErr.message}`,
      resultingStatus: 'ACTION_REQUIRED'
    }];
  }
}

async function _handleBoqDeliverablesPhase(ctx, options, evidenceLedger, startTime) {
  emitProgress(10, 10, 'Finalizing results and audit', 'in_progress', 'Recording the evaluation outcome and delivery eligibility.', { stage: 'SOLUTION_PRESENTATION' });
  evidenceLedger.startPhase(8, 'Multi-Rank Solution Deliverables & Excel Generation', {});
  Object.defineProperty(ctx.evalResults, 'evidenceLedger', { value: evidenceLedger, enumerable: false, configurable: true });

  terminalOwner.prepareDeliverables(ctx,
    () => _runLegacyDeliverablesPrelude(ctx, options, evidenceLedger),
    () => _prepareNotebookDeliveryHealth(ctx));

  const { verifyPrePresentationAcceptance } = require('../lib/boq/bom_verifier.js');
  ctx.evalResults.catalogEvidence = ctx.ingestCtx.catalogEvidence;
  const acceptance = verifyPrePresentationAcceptance(ctx.evalResults, 'BOQ_EVALUATION', {
    ...options,
    ...ctx.ingestCtx,
    catalogData: ctx.ingestCtx.catalogData || options.catalogData
  });
  ctx.evalResults.acceptanceGate = acceptance;
  const targetChassis = _assignDeliverablesScope(ctx, options);
  _applyAcceptanceDeliveryState(ctx, options, acceptance, targetChassis);

  await serializeAndExportResults(terminalOwner.serializerContext(ctx, {
    ...options,
    ...ctx.ingestCtx,
    evalResults: ctx.evalResults,
    graph: ctx.graph,
    ragAnswer: ctx.ragAnswer,
    budgetOpt: ctx.budgetOpt,
    queryPayload: ctx.queryPayload,
    startTime,
    stage2AspectMathMs: ctx.stage2AspectMathMs,
    stage3RAGMs: ctx.stage3RAGMs,
    stage4GuardrailMs: ctx.stage4GuardrailMs,
    stage5MatrixMs: ctx.stage5MatrixMs
  }));

  const exportOk = Boolean(
    ctx.evalResults.multiRankWorkbookPath &&
    ctx.evalResults.multiRankCsvPath &&
    ctx.evalResults.portalWorkbookPath &&
    !ctx.evalResults.deliveryError
  );
  return terminalOwner.phase8Outcome(ctx, {
    status: exportOk ? 'PASSED' : 'ACTION_REQUIRED',
    summary: { multiRankWorkbookPath: ctx.evalResults.multiRankWorkbookPath, deliveryError: ctx.evalResults.deliveryError || null },
    checks: [
      { status: ctx.evalResults.multiRankWorkbookPath ? 'PASS' : 'WARN', label: `Multi-Rank Matrix (.xlsx): ${ctx.evalResults.multiRankWorkbookPath ? path.basename(ctx.evalResults.multiRankWorkbookPath) : 'Pending'}` },
      { status: ctx.evalResults.multiRankCsvPath ? 'PASS' : 'WARN', label: `Token-Dense CSV: ${ctx.evalResults.multiRankCsvPath ? path.basename(ctx.evalResults.multiRankCsvPath) : 'Pending'}` },
      { status: ctx.evalResults.portalWorkbookPath ? 'PASS' : 'WARN', label: `Partner Portal Sheet: ${ctx.evalResults.portalWorkbookPath ? path.basename(ctx.evalResults.portalWorkbookPath) : 'Pending'}` }
    ]
  });
}

async function _handleBoqReflectionPhase(ctx) {
  let reasoningAnalysis = null;
  let reflectionError = null;
  try {
    const { performReasoningPostAnalysis } = require('../lib/system/reasoning_post_analyzer.js');
    reasoningAnalysis = performReasoningPostAnalysis({
      queryText: ctx.options.inputFile || ctx.options.BOQ_FILE || 'BOQ_EVALUATION',
      context: ctx.options,
      classification: { intent: 'BOQ_EVALUATION', confidence: 1.0, rationale: 'Canonical Multi-Rank BOQ Evaluation' },
      responseData: ctx.evalResults,
      traceId: ctx.evalResults.traceId || ctx.evidenceLedger?.traceId,
      executionTimeMs: Date.now() - ctx.startTime,
      evidenceLedger: ctx.evidenceLedger
    });
    ctx.evalResults.reasoningAnalysis = reasoningAnalysis;
  } catch (err) {
    reflectionError = err;
    ctx.evalResults.reflectionError = err.message;
    if (typeof logger.warn === 'function') {
      logger.warn('EVAL_BOQ', `Post-evaluation reasoning analysis failed (INV-231): ${err?.message || err}`);
    }
  }

  if (reflectionError) {
    return {
      status: 'ACTION_REQUIRED',
      summary: {
        newLearningsCount: 0,
        evidenceLogPath: ctx.evalResults.evidenceLogPath || null,
        epistemicTier: 'UNKNOWN',
        error: reflectionError.message
      },
      checks: [
        { status: 'FAIL', label: `Knowledge reflection failed: ${reflectionError.message}` },
        { status: ctx.evalResults.evidenceLogPath ? 'PASS' : 'WARN', label: `Evidence ledger exported: ${ctx.evalResults.evidenceLogPath ? path.basename(ctx.evalResults.evidenceLogPath) : 'Pending'}` }
      ]
    };
  }

  return {
    status: 'PASSED',
    summary: {
      newLearningsCount: ctx.evalResults.newLearningsCount || 0,
      evidenceLogPath: ctx.evalResults.evidenceLogPath || null,
      epistemicTier: reasoningAnalysis?.epistemicIntegrity?.tier || 'TIER_1_PHYSICAL_SANITY'
    },
    checks: [
      { status: 'PASS', label: `Knowledge reflection complete (${ctx.evalResults.newLearningsCount || 0} new learnings evaluated)` },
      { status: ctx.evalResults.evidenceLogPath ? 'PASS' : 'WARN', label: `Evidence ledger exported: ${ctx.evalResults.evidenceLogPath ? path.basename(ctx.evalResults.evidenceLogPath) : 'Pending'}` }
    ]
  };
}

function _createOwnedEvaluationLedger(options) {
  const evidenceLedger = createEvidenceLedger({
    chassis: options.chassisDir ? path.basename(options.chassisDir) : (options.CHASSIS_OVERRIDE || 'UNKNOWN_CHASSIS'),
    filePath: options.inputFile || options.BOQ_FILE || (options.inputItems || options.rawText !== undefined ? 'IN_MEMORY_BOM' : null)
  });
  if (!options.inputFile && (options.inputItems || options.rawText !== undefined)) {
    evidenceLedger.recordInlineArtifact('CUSTOMER_INPUT', options.inputItems ?? options.rawText);
  } else {
    evidenceLedger.recordArtifact('CUSTOMER_INPUT', options.inputFile || options.BOQ_FILE);
  }
  return evidenceLedger;
}

function _createOwnedDagContext(options, evidenceLedger, startTime) {
  return {
    options,
    evidenceLedger,
    startTime,
    ingestCtx: null,
    activeRules: null,
    evalResults: null,
    graph: null,
    queryPayload: null,
    stage2AspectMathMs: 0,
    stage3RAGMs: 0,
    stage4GuardrailMs: 0,
    stage5MatrixMs: 0,
    budgetOpt: null,
    ragResult: null,
    ragAnswer: null
  };
}

function _createOwnedPhaseHandlers(options, evidenceLedger, startTime) {
  return {
    INGESTION: ctx => _handleBoqIngestionPhase(ctx, options, evidenceLedger),
    FINGERPRINTING: ctx => _handleBoqFingerprintingPhase(ctx, options, evidenceLedger),
    DOMAIN_ASPECTS: ctx => _handleBoqDomainAspectsPhase(ctx, options, evidenceLedger),
    CONFLICT_GRAPH: ctx => _handleBoqConflictGraphPhase(ctx, options, evidenceLedger),
    MODERNIZATION_LEAST_DELTA: ctx => _handleBoqModernizationPhase(ctx, options, evidenceLedger),
    STRATEGY_SYNTHESIS: ctx => _handleBoqStrategySynthesisPhase(ctx, options, evidenceLedger),
    RAG_GROUNDING: ctx => _handleBoqRagGroundingPhase(ctx, options, evidenceLedger),
    DELIVERABLES_FINALIZATION: ctx => _handleBoqDeliverablesPhase(ctx, options, evidenceLedger, startTime),
    REFLECTION_LEARNING: async ctx => {
      const res = await terminalOwner.runReflection(ctx,
        () => {
          const learnedCount = executeContinuousLearningReflection(evidenceLedger, ctx.ingestCtx, ctx.evalResults, options);
          const { performReasoningPostAnalysis } = require('../lib/system/reasoning_post_analyzer.js');
          ctx.evalResults.reasoningAnalysis = performReasoningPostAnalysis({
            queryText: ctx.options.inputFile || ctx.options.BOQ_FILE || 'BOQ_EVALUATION',
            context: ctx.options,
            classification: { intent: 'BOQ_EVALUATION', confidence: 1.0, rationale: 'Canonical Multi-Rank BOQ Evaluation' },
            responseData: ctx.evalResults,
            traceId: ctx.evalResults.traceId || evidenceLedger?.traceId,
            executionTimeMs: Date.now() - ctx.startTime,
            evidenceLedger
          });
          return learnedCount;
        },
        () => _promoteTerminalPriceDrift(ctx, options));
      if (res?.status === 'ACTION_REQUIRED' || ctx.evalResults.reflectionError) {
        return { ...res, status: 'ACTION_REQUIRED' };
      }
      return res;
    }
  };
}

async function _runLegacyEvaluationPipelineWithinTrace(options) {
  const startTime = Date.now();
  const evidenceLedger = _createOwnedEvaluationLedger(options);
  try {
    const lifecycleEngine = new LifecycleEngine('canonical_boq_eval');
    const dagContext = _createOwnedDagContext(options, evidenceLedger, startTime);
    const phaseHandlers = {
      ..._createOwnedPhaseHandlers(options, evidenceLedger, startTime),
      REFLECTION_LEARNING: ctx => _handleBoqReflectionPhase(ctx)
    };
    const lifecycleHealth = await lifecycleEngine.executePipelineDAG(dagContext, phaseHandlers, _createBoqQualificationReporter(lifecycleEngine));
    dagContext.evalResults.lifecycleEngine = lifecycleEngine;
    dagContext.evalResults.lifecycleHealth = lifecycleHealth;
    return dagContext.evalResults;
  } catch (error) {
    _handlePipelineFailure(error, evidenceLedger, options);
    throw error;
  }
}

function _resolvePipelineEffectivePolicy(options) {
  const { resolveEffectivePolicy } = require('../lib/system/policy_resolver.js');
  let inheritedPolicy = options.effectivePolicy || null;
  if (!inheritedPolicy && process.env.DASHBOARD_EFFECTIVE_POLICY) {
    try { inheritedPolicy = JSON.parse(process.env.DASHBOARD_EFFECTIVE_POLICY); } catch {}
  }
  const policy = resolveEffectivePolicy({
    clientOffline: options.OFFLINE_MODE !== undefined ? options.OFFLINE_MODE : options.offline,
    clientOfflineMode: options.offlineMode,
    enableCloudValidation: options.enableCloudValidation,
    inheritedPolicy,
    defaultOffline: false,
    lockInheritedOffline: true
  });
  options.OFFLINE_MODE = policy.offline;
  options.effectivePolicy = policy;
  return policy;
}

function runEvaluationPipelineWithinTrace(options) {
  _resolvePipelineEffectivePolicy(options);
  return terminalOwner.selectPipeline(
    () => _runLegacyEvaluationPipelineWithinTrace(options),
    () => {
      const startTime = Date.now();
      return terminalOwner.executeOwnedPipeline({
        options,
        createLedger: () => _createOwnedEvaluationLedger(options),
        createEngine: () => new LifecycleEngine('canonical_boq_eval'),
        createContext: ledger => _createOwnedDagContext(options, ledger, startTime),
        createHandlers: ledger => _createOwnedPhaseHandlers(options, ledger, startTime)
      });
    });
}

async function main() {
  const options = parseEvaluationArguments(process.argv.slice(2));
  if (!options) return;
  await require('../lib/lifecycle/canonical_cli_cancellation.js').runCliPipeline(options, runEvaluationPipeline);
}

if (require.main === module) {
  main().catch(err => {
    const JSON_MODE = process.argv.includes('--json');
    if (process.send && process.connected) {
      try {
        process.send({
          type: 'EVAL_RESULT_PAYLOAD',
          version: '1.0.0',
          status: 'ERROR',
          error: err.message,
          data: {
            traceId: err.traceId || null,
            evidenceLogPath: err.evidenceLogPath || null
          }
        });
      } catch (_) {}
    }
    terminalOwner.reportCliFailure(err, JSON_MODE, () => {
      if (JSON_MODE) {
        process.stdout.write('\n__EVAL_RESULT_JSON__' + JSON.stringify({
          status: 'ERROR',
          error: err.message,
          data: {
            traceId: err.traceId || null,
            evidenceLogPath: err.evidenceLogPath || null
          }
        }) + '__EVAL_RESULT_JSON__\n');
      } else {
        console.error('Fatal evaluation error:', err);
      }
    });
    process.exit(1);
  });
}

module.exports = {
  runEvaluationPipeline,
  main,
  getDefaultNotebookId,
  parseEvaluationArguments,
  ingestAndConsolidateBoq,
  executePhysicalPreChecks,
  executeGroundedRagValidation,
  generateMarkdownReport,
  serializeAndExportResults,
  recomputeStrategyMatrixWithRag,
  _handleBoqReflectionPhase
};
