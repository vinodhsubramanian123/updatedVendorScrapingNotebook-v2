'use strict';
/**
 * scripts/lib/boq/pipeline/eval_boq_rag_stage.js — Grounded RAG Validation, Guardrail Retry & Phase 7 Handler
 */

const path = require('path');
const { evaluateBOQMultiAspect, formatNotebookQueryPayload } = require('../boq_evaluator.js');
const { emitProgress } = require('../../system/progress.js');
const { executeNotebookQuery } = require('../../notebook/notebook_query_utils.js');
const { runAgenticGuardrail } = require('../../rag/agentic_guardrail.js');
const { extractAndPersistLearnedDeltas } = require('../../notebook/knowledge_extractor.js');
const { solutionFingerprint } = require('../solution_evidence');
const { recomputeStrategyMatrixWithRag } = require('./eval_boq_recompute.js');
const { _revalidateAndRankCandidates } = require('./eval_boq_stages.js');
const logger = require('../../system/pipeline_logger.js');

function _detectOpinionDiscrepancy(evalResults, ragResult) {
  evalResults.opinionDiscrepancies = evalResults.opinionDiscrepancies || [];
  const localHasConflicts = (evalResults.errors || []).length > 0;
  const ragAnswerLower = (ragResult.answer || '').toLowerCase();
  const ragClaimsFullyCompliant = ragAnswerLower.includes('fully compatible') || ragAnswerLower.includes('no issues detected') || ragAnswerLower.includes('100% buildable');

  if (localHasConflicts && ragClaimsFullyCompliant) {
    const discrepancy = {
      type: 'LOCAL_RULE_OVERRIDE',
      severity: 'WARNING',
      message: 'Local rule engine flagged physical/thermal conflicts, but cloud commentary reported full compatibility. Deterministic aspect checks prevail.',
      localConflicts: evalResults.errors,
      cloudAnswerSnippet: (ragResult.answer || '').slice(0, 200)
    };
    evalResults.opinionDiscrepancies.push(discrepancy);
    logger.warn('EVAL_BOQ', 'Discrepancy detected: Deterministic local aspect rules prevail over cloud RAG commentary.');
  }
}

function _evaluateRagGroundingAndViolations(evalResults, ragResult) {
  evalResults.ragVerified = false;
  evalResults.ragViolationDetected = null;

  const isCloudGroundedWithCitations = evalResults.notebookLmStatus.isCloudGrounded &&
    (evalResults.notebookLmStatus.citationsCount > 0);

  if (isCloudGroundedWithCitations) {
    const answerLc = (ragResult.answer || '').toLowerCase();
    const violationSignals = [
      'incompatible', 'not supported', 'conflict detected', 'violation', 'cannot be used',
      'not compatible', 'requires', 'missing mandatory', 'will not work', 'mismatch'
    ];
    const ragFlagsViolation = violationSignals.some(sig => answerLc.includes(sig));
    const hasLocalOverrideDiscrepancy = (evalResults.opinionDiscrepancies || [])
      .some(d => d.type === 'LOCAL_RULE_OVERRIDE');

    if (hasLocalOverrideDiscrepancy) {
      evalResults.ragViolationDetected =
        'NotebookLM answered "fully compatible" but local rule engine found critical physical errors. ' +
        'Deterministic aspect checks prevail. Manual review required.';
    } else if (ragFlagsViolation && (evalResults.errors || []).length === 0) {
      const snippet = (ragResult.answer || '').slice(0, 300).replace(/\n/g, ' ');
      evalResults.ragViolationDetected =
        `NotebookLM flagged a potential violation not caught by local rules: "${snippet}..."`;
    } else if (!ragFlagsViolation) {
      evalResults.ragVerified = true;
    }
  }

  const rankedSolutions = evalResults.conflictGraph?.rankedSolutions || [];
  for (const sol of rankedSolutions) {
    sol.nlmVerified = Boolean(evalResults.ragVerified);
    sol.groundingTier = evalResults.notebookLmStatus?.groundingTier || 'TIER_1_LOCAL_DETERMINISTIC';
    sol.quickSpecsCitations = (ragResult?.citations || []).slice(0, 5);
  }
}

function _extractVerifiedKnowledgeDeltas(evalResults, ragResult, chassisDir, catalogData) {
  try {
    const isVerifiedCloud = evalResults.notebookLmStatus.isCloudGrounded && (evalResults.notebookLmStatus.citationsCount > 0);
    if (isVerifiedCloud) {
      const learnedResult = extractAndPersistLearnedDeltas(ragResult.answer, chassisDir, {
        chassis: (catalogData && catalogData.metadata && catalogData.metadata.chassis) || path.basename(chassisDir),
        source: ragResult.source,
        groundingVerification: ragResult.groundingVerification,
        citations: ragResult.citations || [],
        confidenceScore: ragResult.groundingVerification === 'VERIFIED_GROUNDED' ? 0.90 : 0.70,
        catalogData
      });
      evalResults.learnedDeltasCount = learnedResult.count;
    } else {
      evalResults.learnedDeltasCount = 0;
    }
  } catch (extractErr) {
    logger.warn('EVAL_BOQ', `Knowledge extraction skipped: ${extractErr.message}`);
  }
}

function _formatRagAnswerText(ragResult, ragDurationFormatted, evalResults) {
  return `### Pre-Flight Grounded Physical Validation Matrix (${ragResult.source})

> ℹ️ **Knowledge Source**: \`${ragResult.source}\` ${ragResult.sourcesUsed && ragResult.sourcesUsed.length > 0 ? `(Active Cloud Sources: ${ragResult.sourcesUsed.join(', ')})` : ''}  
> ⏱️ **Synthesis Time Taken**: \`${ragDurationFormatted}\`

${ragResult.answer}

#### Physical Validation Summary (Local Rules Engine)
- **Errors Identified**: ${evalResults.errors.length} critical physical violation(s)
- **Warnings Identified**: ${evalResults.warnings.length} physical warning(s)
- **Quantitative Confidence Score**: ${evalResults.confidence.score} / 1.00

#### Physical Validation Actions:
${evalResults.errors.length === 0 ? '- ✅ No critical physical violations detected in input BOQ.' : evalResults.errors.map(e => `- ❌ Violation: ${e}`).join('\n')}
${evalResults.warnings.length === 0 ? '' : evalResults.warnings.map(w => `- ⚠️ Advisory: ${w}`).join('\n')}`;
}

function _applyProposedSubstitutions(baseItems, guardrailResult) {
  if (Array.isArray(guardrailResult.validatedPatchItems) && guardrailResult.validatedPatchItems.length > 0) {
    return guardrailResult.validatedPatchItems.map(it => ({ ...it }));
  }
  const cloned = (baseItems || []).map(it => ({ ...it }));
  for (const sub of guardrailResult.proposedSubstitutions || []) {
    const sku = String(sub.sku || '').trim().toUpperCase();
    const action = String(sub.action || '').toUpperCase();
    if (!sku) continue;
    if (action === 'REMOVE') {
      const idx = cloned.findIndex(it => String(it.sku || '').trim().toUpperCase() === sku);
      if (idx !== -1) cloned.splice(idx, 1);
    } else if (action === 'ADJUST_QTY' && Number(sub.quantity) > 0) {
      const found = cloned.find(it => String(it.sku || '').trim().toUpperCase() === sku);
      if (found) found.quantity = Number(sub.quantity);
    } else if (action === 'ADD') {
      cloned.push({ sku, quantity: Number(sub.quantity) || 1, description: sub.description || `Guardrail Added (${sku})` });
    }
  }
  return cloned;
}

function _buildWorkingBomFingerprint(bomItems = []) {
  return bomItems
    .map(it => `${String(it.sku || '').trim().toUpperCase()}:${Number(it.quantity) || 1}`)
    .sort()
    .join('|');
}

function _recordGuardrailResultMetadata(evalResults, guardrailResult, tGuardrailStart, JSON_MODE) {
  evalResults.agenticReviewStatus = guardrailResult.success === true && !guardrailResult.error ? 'ADVISORY_RETURNED' : 'UNAVAILABLE';
  evalResults.agenticReview = {
    status: evalResults.agenticReviewStatus,
    model: guardrailResult.model || null,
    recoveryEvents: guardrailResult.recoveryEvents || [],
    error: guardrailResult.error || null,
    durationMs: guardrailResult.durationMs || Date.now() - tGuardrailStart,
    executedToolCalls: guardrailResult.executedToolCalls || []
  };
  if (!JSON_MODE) {
    console.log('Agentic review response (inspect for errors; response is not a verification badge):');
    console.log(guardrailResult.text || guardrailResult.error);
  }
  evalResults.agenticExplanation = guardrailResult.text || null;
}

function _applyGuardrailRetryResults(evalResults, retryResults) {
  evalResults.errors = retryResults.errors;
  evalResults.warnings = retryResults.warnings;
  evalResults.missingDependencies = retryResults.missingDependencies;
  evalResults.confidence = retryResults.confidence;
  evalResults.mathDeductions = retryResults.mathDeductions;
  evalResults.conflictGraph = retryResults.conflictGraph;
  evalResults.aspectChecks = retryResults.aspectChecks;
}

async function _executeAgenticGuardrailReview(items, chassisDir, inputFile, evalResults, OFFLINE_MODE, JSON_MODE, catalogData) {
  const needsGuardrail = Boolean(
    !OFFLINE_MODE && (
      evalResults.errors?.length > 0 ||
      (evalResults.confidence && (evalResults.confidence.isHitlTriggered || evalResults.confidence.score < 0.88)) ||
      evalResults.opinionDiscrepancies?.length > 0
    )
  );
  if (!needsGuardrail) return 0;

  const tGuardrailStart = Date.now();
  if (!JSON_MODE) console.log('\n🤖 Triggering Agentic Guardrail Loop for resolution...');

  const MAX_GUARDRAIL_RETRIES = 2;
  let guardrailRetries = 0;
  let workingItems = (items || []).map(it => ({ ...it }));
  const seenStates = new Set([_buildWorkingBomFingerprint(workingItems)]);
  let convergenceStatus = 'ADVISORY_ONLY';
  let latestGuardrail = null;

  while (guardrailRetries < MAX_GUARDRAIL_RETRIES) {
    const guardrailResult = await runAgenticGuardrail(workingItems, chassisDir, {
      offline: OFFLINE_MODE,
      offlineMode: OFFLINE_MODE,
      effectivePolicy: evalResults.effectivePolicy || null
    });
    latestGuardrail = guardrailResult;
    _recordGuardrailResultMetadata(evalResults, guardrailResult, tGuardrailStart, JSON_MODE);

    const hasSubstitutions = Array.isArray(guardrailResult.proposedSubstitutions) && guardrailResult.proposedSubstitutions.length > 0;
    if (!guardrailResult.activatedDeltaCount && !hasSubstitutions) break;

    const candidateItems = hasSubstitutions ? _applyProposedSubstitutions(workingItems, guardrailResult) : workingItems;
    const nextFp = _buildWorkingBomFingerprint(candidateItems);
    if (hasSubstitutions && seenStates.has(nextFp) && guardrailResult.activatedDeltaCount === 0) {
      convergenceStatus = 'CYCLE_PREVENTED';
      break;
    }
    seenStates.add(nextFp);
    workingItems = candidateItems;
    guardrailRetries++;
    evalResults.guardrailRetries = guardrailRetries;
    if (hasSubstitutions) evalResults.guardrailSubstitutionsApplied = guardrailResult.proposedSubstitutions;

    if (!JSON_MODE) console.log(`\n🔄 Auto-retrying physical evaluation (attempt ${guardrailRetries}/${MAX_GUARDRAIL_RETRIES})...`);
    const retryResults = evaluateBOQMultiAspect(workingItems, { filePath: inputFile || '', catalogData, targetDir: chassisDir });
    _applyGuardrailRetryResults(evalResults, retryResults);

    if (!retryResults.errors?.length && !retryResults.missingDependencies?.length) {
      convergenceStatus = 'CONVERGED';
      break;
    }
    convergenceStatus = 'RETRY_PARTIAL';
  }

  evalResults.guardrailConvergenceStatus = convergenceStatus;
  if (latestGuardrail && !JSON_MODE) console.log(`✅ Guardrail Loop Complete (${convergenceStatus}). Score: ${evalResults.confidence?.score}`);
  return Math.max(Date.now() - tGuardrailStart, 1);
}

function _buildDeferredRagStatus(evalResults, tRagStart) {
  const stage3RAGMs = Math.max(Date.now() - tRagStart, 1);
  evalResults.status = 'LOCAL_COMPLETE';
  evalResults.cloudGroundingStatus = 'CLOUD_PENDING';
  evalResults.isProvisional = true;
  evalResults.matrixStatus = 'PROVISIONAL_PRE_RAG';
  evalResults.notebookLmStatus = {
    status: 'CLOUD_PENDING',
    jobId: null,
    isCloudGrounded: false,
    isPending: true,
    pollIntervalMs: 1500
  };
  evalResults.ragResult = null;
  evalResults.ragAnswer = '';
  return { ragAnswer: '', stage3RAGMs, stage4GuardrailMs: 0 };
}

function _buildNotebookLmStatus(ragResult, stage3RAGMs, ragDurationFormatted) {
  const src = ragResult.source || '';
  const citations = ragResult.citations || [];
  return {
    source: ragResult.source,
    sourcesUsed: ragResult.sourcesUsed || [],
    citationsCount: citations.length,
    fallbackReason: ragResult.fallbackReason || null,
    groundingVerification: ragResult.groundingVerification || 'UNVERIFIED',
    groundingTier: ragResult.groundingTier || (ragResult.isCloudGrounded ? 'TIER_1_LIVE_CLOUD_GROUNDED' : 'TIER_2_UNCITED_ADVISORY'),
    isFallback: src.includes('FALLBACK') || src.includes('LOCAL'),
    isCloudGrounded: Boolean(ragResult.isCloudGrounded && citations.length > 0 && ragResult.groundingVerification !== 'REJECTED_FORBIDDEN_SOURCE'),
    cached: ragResult.cached || false,
    latencyMs: ragResult.latencyMs || stage3RAGMs,
    timeTaken: ragDurationFormatted
  };
}

function _resolveRagChassisLabel(catalogData, chassisDetection, detectedChassisName) {
  return catalogData?.metadata?.chassis || chassisDetection?.detectedVariant?.model || detectedChassisName;
}

async function executeGroundedRagValidation(ctx) {
  const { items, evalResults, notebookId, catalogData, chassisDetection, detectedChassisName, chassisDir, OFFLINE_MODE, JSON_MODE, inputFile } = ctx;

  const tRagStart = Date.now();
  emitProgress(8, 10, 'Preparing evidence review', 'in_progress', 'Preparing the validation evidence.', { stage: 'POST_VERIFICATION' });

  const ragPayload = formatNotebookQueryPayload(items, evalResults, evalResults.conflictGraph ? evalResults.conflictGraph.rankedSolutions : []);
  const isOffline = Boolean(OFFLINE_MODE || ctx.effectivePolicy?.offline || evalResults.effectivePolicy?.offline);

  if (!isOffline && ctx.DEFER_RAG) {
    return _buildDeferredRagStatus(evalResults, tRagStart);
  }

  emitProgress(9, 10, isOffline ? 'Reviewing local evidence' : 'Reviewing QuickSpecs in NotebookLM',
    'in_progress', '', { stage: 'POST_VERIFICATION' });
  let ragResult;
  if (isOffline) {
    const { queryLocalKnowledgeBase } = require('../../rag/local_rag_search.js');
    const localRes = queryLocalKnowledgeBase(ragPayload, _resolveRagChassisLabel(catalogData, chassisDetection, detectedChassisName));
    const policyReason = ctx.cloudFallbackReason || (ctx.effectivePolicy?.serverEnforced || evalResults.effectivePolicy?.serverEnforced
      ? 'Local evaluation mode enforced by server (OFFLINE_MODE/LOCAL_EVAL_ONLY/USE_LOCAL_RAG_ONLY)'
      : 'Offline evaluation mode requested in options');
    ragResult = {
      ...localRes,
      source: 'LOCAL_RAG_FALLBACK',
      isCloudGrounded: false,
      groundingVerification: 'UNVERIFIED',
      groundingTier: 'TIER_2_VERIFIED_LOCAL_SAFETY_NET',
      fallbackReason: policyReason
    };
  } else {
    ragResult = await executeNotebookQuery(notebookId, ragPayload, {
      context: {
        chassis: _resolveRagChassisLabel(catalogData, chassisDetection, detectedChassisName),
        skus: items.map(i => i.sku).filter(Boolean),
        items: items
      },
      onAttempt: attempt => { evalResults.notebookQueryRecovery = attempt; ctx.onQueryAttempt?.(attempt); },
      offline: false,
      offlineMode: false,
      effectivePolicy: ctx.effectivePolicy || evalResults.effectivePolicy || null,
      timeout: parseInt(process.env.RAG_TIMEOUT_MS || '600000', 10),
      queryTimeoutMs: ctx.queryTimeoutMs,
      deadlineAt: ctx.deadlineAt,
      signal: ctx.signal
    });
  }
  delete evalResults.notebookQueryRecovery;
  if (ragResult.queryAttempt) evalResults.notebookQueryAttempt = ragResult.queryAttempt;
  const stage3RAGMs = Math.max(Date.now() - tRagStart, 1);
  const ragDurationFormatted = ragResult.timeTaken || `${Math.floor(stage3RAGMs / 60000)}m ${Math.floor((stage3RAGMs % 60000) / 1000)}s (${stage3RAGMs}ms)`;

  evalResults.status = 'LOCAL_COMPLETE';
  evalResults.cloudGroundingStatus = ragResult.isCloudGrounded ? 'CLOUD_VERIFIED' : ((ragResult.source || '').includes('LOCAL') ? 'LOCAL_FALLBACK' : 'CLOUD_FAILED');
  evalResults.notebookLmStatus = _buildNotebookLmStatus(ragResult, stage3RAGMs, ragDurationFormatted);

  if (!JSON_MODE) {
    console.log(`⏱️ NotebookLM Synthesis Duration: ${ragDurationFormatted} (Source: ${ragResult.source})`);
  }

  if (ragResult.warning) {
    evalResults.warnings.push(ragResult.warning);
  }

  _detectOpinionDiscrepancy(evalResults, ragResult);

  if (evalResults.notebookLmStatus.isFallback && !evalResults.notebookLmStatus.cached) {
    const fallbackWarning = `⚠️ NotebookLM Cloud was NOT consulted — used local RAG fallback (Reason: ${ragResult.fallbackReason || 'NLM CLI timeout or unavailable'}). Verify critical dependencies manually or re-run with longer RAG_TIMEOUT_MS.`;
    evalResults.warnings.push(fallbackWarning);
    if (!JSON_MODE) console.log(`\n${fallbackWarning}`);
  }
  evalResults.ragResult = ragResult;
  evalResults.ragAnswer = ragResult.answer || '';

  _evaluateRagGroundingAndViolations(evalResults, ragResult);
  _extractVerifiedKnowledgeDeltas(evalResults, ragResult, chassisDir, catalogData);

  const ragAnswer = _formatRagAnswerText(ragResult, ragDurationFormatted, evalResults);
  const stage4GuardrailMs = await _executeAgenticGuardrailReview(items, chassisDir, inputFile || ctx.inputFile, evalResults, isOffline, JSON_MODE, catalogData);

  return { ragResult, ragAnswer, stage3RAGMs, stage4GuardrailMs };
}

function applyLearnedRAGDeltasIfPresent(evalResults, graph, ingestCtx, options, ragResult) {
  if (!evalResults.learnedDeltasCount || options.DEFER_RAG || !ragResult) return;
  emitProgress(9, 10, 'Rechecking with grounded evidence', 'in_progress', 'Recomputing hardware checks and candidate rankings.', { stage: 'POST_VERIFICATION' });
  try {
    const recomputed = recomputeStrategyMatrixWithRag({
      items: ingestCtx.items,
      evalResults,
      conflictGraph: graph,
      targetBudgetUsd: options.targetBudgetUsd,
      catalogData: ingestCtx.catalogData,
      chassisDir: ingestCtx.chassisDir
    }, ragResult, ingestCtx.chassisDir);
    if (recomputed?.evalResults) Object.assign(evalResults, recomputed.evalResults);
    if (recomputed?.conflictGraph) Object.assign(graph, recomputed.conflictGraph);
  } catch (err) {
    logger.warn('EVAL_BOQ', `Dynamic matrix recompute note: ${err.message}`);
  }
}

function _recordPhase7ResolutionsAndAudits(ctx, evidenceLedger, ephemeralSourceResult) {
  const documentReviewVerified = Boolean(
    ephemeralSourceResult?.success === true &&
    ephemeralSourceResult.doubleCheckVerdict !== 'FAILED' &&
    (ephemeralSourceResult.isCloudGrounded === true || ephemeralSourceResult.isMock === true) &&
    !(ephemeralSourceResult.quarantinedSourceCitations?.length)
  );
  if (documentReviewVerified) {
    for (const phaseNumber of [3, 4]) {
      const phase = evidenceLedger.phases[`phase_${phaseNumber}`];
      if (phase.status === 'ACTION_REQUIRED' && ctx.evalResults.adversarialGatePassed === true) {
        evidenceLedger.recordPhaseResolution(phaseNumber, {
          manifestSha256: solutionFingerprint(ctx.evalResults),
          candidateGatePassed: true,
          documentReviewVerified: true,
          resolvedBy: 'Candidate BOM physical validation and grounded document review in phase 7 (baseline input status preserved)'
        });
      }
    }
  }
  for (const candidate of ctx.evalResults.conflictGraph?.rankedSolutions || []) {
    for (const part of candidate.skuPartsList || []) {
      const actionType = part.isFixInjected ? 'PROPOSED_FIX' : 'CANDIDATE_COMPONENT';
      const detail = part.reason || candidate.reasoning || 'Candidate manifest; consult validation verdict.';
      evidenceLedger.recordSkuAudit(part.sku, actionType, detail, part.ruleId || null, part.category, {
        rank: candidate.rank,
        quantity: part.quantity,
        physicalMathClean: candidate.physicalMathClean
      });
    }
  }
}

function _buildRagGroundingPhaseChecks(ctx, options) {
  const nlmStatus = ctx.evalResults.notebookLmStatus || {};
  const groundingCheckStatus = nlmStatus.isCloudGrounded ? 'PASS' : (options.OFFLINE_MODE ? 'SKIP' : 'WARN');
  const citationsCount = nlmStatus.citationsCount || 0;
  const discrepanciesCount = (ctx.evalResults.opinionDiscrepancies || []).length;
  return [
    { status: groundingCheckStatus, label: `Grounding source: ${nlmStatus.source || 'N/A'}` },
    { status: citationsCount > 0 ? 'PASS' : 'WARN', label: `QuickSpecs document citations: ${citationsCount} citations` },
    { status: discrepanciesCount === 0 ? 'PASS' : 'WARN', label: `Dual-Brain consensus: ${discrepanciesCount} opinion discrepancies` }
  ];
}

async function runBoqRagGroundingPhase(ctx, options, evidenceLedger, executeEphemeralFn) {
  evidenceLedger.startPhase(7, 'Gemini NotebookLM Grounding & Dual-Brain Verification', {});
  let quickSpecs = { status: 'NOT_RUN_OFFLINE_OR_DEFERRED' };
  if (!options.OFFLINE_MODE && !options.DEFER_RAG && ctx.ingestCtx.notebookId) {
    const { verifyNotebookQuickSpecs } = require('../../sync/quickspecs_sync');
    quickSpecs = await verifyNotebookQuickSpecs(path.basename(ctx.ingestCtx.chassisDir), { autoUpload: true, forcedNotebookId: ctx.ingestCtx.notebookId });
  }
  ctx.evalResults.quickSpecsVerification = quickSpecs;
  const sourceReady = quickSpecs.status === 'CERTIFIED_GROUNDED';
  const { ragResult, ragAnswer, stage3RAGMs, stage4GuardrailMs } = await executeGroundedRagValidation({
    ...ctx.ingestCtx,
    evalResults: ctx.evalResults,
    OFFLINE_MODE: options.OFFLINE_MODE || (!options.DEFER_RAG && !sourceReady),
    cloudFallbackReason: !options.OFFLINE_MODE && !options.DEFER_RAG && !sourceReady
      ? `NotebookLM QuickSpecs verification unavailable (${quickSpecs.status})`
      : null,
    effectivePolicy: options.effectivePolicy || ctx.evalResults.effectivePolicy || null,
    JSON_MODE: options.JSON_MODE,
    SYNC_RAG: options.SYNC_RAG,
    DEFER_RAG: options.DEFER_RAG,
    queryTimeoutMs: options.queryTimeoutMs,
    deadlineAt: options.deadlineAt,
    signal: options.signal,
    onQueryAttempt: attempt => {
      const phase = evidenceLedger.phases.phase_7;
      phase.outputSummary = { ...phase.outputSummary, queryAttempt: attempt };
    }
  });
  ctx.ragResult = ragResult;
  ctx.ragAnswer = ragAnswer;
  ctx.stage3RAGMs = stage3RAGMs;
  ctx.stage4GuardrailMs = stage4GuardrailMs;
  if (ragResult) {
    evidenceLedger.recordNotebookLmTrace(ctx.queryPayload, ragResult, ragResult?.citations || []);
  }
  evidenceLedger.phases.phase_7.outputSummary = {
    primaryRag: {
      verified: evidenceLedger.sharedState.dualBrainVerified,
      citationsCount: ragResult?.citations?.length || 0,
      quickSpecs
    }
  };

  applyLearnedRAGDeltasIfPresent(ctx.evalResults, ctx.graph, ctx.ingestCtx, options, ragResult);
  _revalidateAndRankCandidates(ctx.evalResults, ctx.ingestCtx, evidenceLedger);

  const ephemeralSourceResult = sourceReady ? await executeEphemeralFn(options, ctx.ingestCtx, ctx.evalResults) : null;
  if (ephemeralSourceResult) {
    ctx.evalResults.ephemeralSourceValidation = ephemeralSourceResult;
    const ephVerdict = ephemeralSourceResult.success ? 'VERIFIED_GROUNDED' : 'ACTION_REQUIRED';
    evidenceLedger.recordNotebookLmTrace(ephemeralSourceResult.queryPayload, ephemeralSourceResult, ephemeralSourceResult.citations || [], ephVerdict);
  }
  evidenceLedger.phases.phase_7.outputSummary.solutionSourceValidation = ephemeralSourceResult || { status: 'NOT_RUN' };
  evidenceLedger.phases.phase_7.outputSummary.agenticReview = ctx.evalResults.agenticReview || { status: 'NOT_RUN' };
  evidenceLedger.sharedState.dualBrainVerified = ephemeralSourceResult?.success === true;
  const phase7Status = ephemeralSourceResult?.success ? 'PASSED' : 'ACTION_REQUIRED';
  evidenceLedger.completePhase(7, phase7Status, evidenceLedger.phases.phase_7.outputSummary);
  _recordPhase7ResolutionsAndAudits(ctx, evidenceLedger, ephemeralSourceResult);

  return {
    status: phase7Status,
    summary: {
      ...evidenceLedger.phases.phase_7.outputSummary,
      cloudJobDeferred: ctx.evalResults.cloudGroundingStatus === 'CLOUD_PENDING',
      localOnly: options.OFFLINE_MODE === true
    },
    checks: _buildRagGroundingPhaseChecks(ctx, options)
  };
}

module.exports = {
  executeGroundedRagValidation,
  applyLearnedRAGDeltasIfPresent,
  runBoqRagGroundingPhase
};
