'use strict';
/**
 * scripts/lib/system/reasoning_post_analyzer.js — Automated Reasoning Post-Analysis & Learning Hook
 *
 * Automatically inspects the reasoning trace of every presales query solution and BOQ evaluation:
 * 1. Analyzes epistemic integrity across 4 tiers (untrusted claim -> physical sanity -> RAG grounding -> live CLIC).
 * 2. Audits physical constraint checks, detected conflicts, diagnostic hints, and 14-point acceptance gate.
 * 3. Transparently hooks into the continuous learning and feedback loop, logging candidate deltas to quarantine without overriding raw facts.
 * 4. Ensures end-to-end evidence ledger persistence by default across all query intents.
 */

const fs = require('fs');
const { createEvidenceLedger } = require('./evidence_ledger.js');
const logger = require('./pipeline_logger.js');
const { detectVendor, detectHardwareDomain } = require('../taxonomy/vendor_agnostic_schema.js');

/**
 * Determine the Epistemic Tier of the completed solution
 */
function determineEpistemicTier(responseData, _classification) {
  const isClicVerified = responseData?.clicValidation?.isValid === true ||
    responseData?.portalValidationStatus === 'ACCEPTED_BY_VENDOR';
  if (isClicVerified) {
    return {
      tier: 'TIER_3_OFFICIAL_VENDOR_ACCEPTANCE',
      label: 'Tier 3: Official Vendor Acceptance Receipt',
      vendorAcceptancePending: false,
      description: 'Verified live against official vendor configurator / CLIC acceptance receipt.'
    };
  }

  const isCloudGrounded = responseData?.notebookLmStatus?.isCloudGrounded === true &&
    (responseData?.notebookLmStatus?.citationsCount || 0) > 0;
  if (isCloudGrounded) {
    return {
      tier: 'TIER_2_DOCUMENT_CITATION',
      label: 'Tier 2: Grounded Document Citation Check',
      vendorAcceptancePending: true,
      description: 'Cited from official vendor QuickSpecs PDFs and master catalogs. Live CLIC portal validation pending.'
    };
  }

  const hasPhysicalMath = responseData?.aspectChecksCompleted === true ||
    responseData?.isMathClean !== undefined ||
    Array.isArray(responseData?.errors);
  if (hasPhysicalMath) {
    return {
      tier: 'TIER_1_PHYSICAL_SANITY',
      label: 'Tier 1: Pre-Flight Physical Sanity Check',
      vendorAcceptancePending: true,
      description: 'Deterministic 7-aspect physical rules evaluated (TDP, memory, PCIe, power envelope). Document grounding and live validation pending.'
    };
  }

  return {
    tier: 'TIER_0_UNTRUSTED_CLAIM',
    label: 'Tier 0: Presales Intake & Specification',
    vendorAcceptancePending: true,
    description: 'Initial candidate inputs parsed. Deterministic physical and portal validation pending.'
  };
}

/**
 * Perform automated post-analysis on the reasoning trace of a solved query or evaluation.
 *
 * @param {object} params
 * @param {string} params.queryText - Original user query or input description
 * @param {object} params.context - Query execution context
 * @param {object} params.classification - Intent classification object
 * @param {object} params.responseData - Result produced by the target skill/handler
 * @param {string} [params.traceId] - Active execution trace ID
 * @param {number} [params.executionTimeMs] - Milliseconds elapsed
 * @param {object} [params.evidenceLedger] - Active evidence ledger (if already created)
 * @returns {object} Reasoning analysis summary
 */
function performReasoningPostAnalysis({
  queryText = '',
  context = {},
  classification = {},
  responseData = {},
  traceId = null,
  executionTimeMs = 0,
  evidenceLedger = null
}) {
  const effectiveTraceId = traceId || responseData.traceId || `TRC-${Date.now()}`;
  const effectiveIntent = classification.intent || responseData.intent || 'UNKNOWN';

  // 1. Determine Epistemic Tier
  const epistemic = determineEpistemicTier(responseData, classification);

  // 2. Extract violations, warnings, conflicts, and diagnostic hints
  const rawErrors = responseData.errors || responseData.evaluation?.errors || [];
  const rawWarnings = responseData.warnings || responseData.evaluation?.warnings || [];
  const missingDeps = responseData.missingDependencies || responseData.evaluation?.missingDependencies || [];
  const diagnosticHints = responseData.diagnosticHints || [];
  const conflictsCount = (responseData.conflicts?.length || 0) + (rawErrors.length > 0 ? rawErrors.length : 0);

  // 3. Acceptance Gate State
  const acceptance = responseData.acceptanceGate || {
    isValid: responseData.status === 'PASSED',
    status: responseData.status || 'UNKNOWN',
    blockersCount: rawErrors.length
  };

  // 4. Automated Feedback & Continuous Learning Reflection Hook
  let feedbackResult = {
    hookStatus: 'AUDITED_NO_ACTION',
    deltasProposed: 0,
    quarantinedCount: 0
  };

  try {
    const shouldEnableFeedback = Boolean(context.enableFeedback === true && process.env.NODE_ENV !== 'test' && !context.isolatedMode);
    const chassisDir = context.chassisDir || context.targetDir || responseData.chassisDir || responseData.catalogDir;
    if (shouldEnableFeedback && chassisDir && fs.existsSync(chassisDir) && Array.isArray(missingDeps) && missingDeps.length > 0) {
      const { processPortalFeedback } = require('../feedback/feedback_loop.js');
      let proposed = 0;
      for (const dep of missingDeps) {
        const depReason = typeof dep === 'string' ? dep : (dep.reason || dep.sku || 'Mandatory hardware dependency');
        const feedback = processPortalFeedback(depReason, chassisDir, {
          sourceAgent: 'AUTOMATED_REASONING_POST_ANALYSIS',
          source: 'DETERMINISTIC_ASPECT_EVALUATION',
          scopeTaxonomy: 'CHASSIS_SPECIFIC',
          traceId: effectiveTraceId,
          ruleUpdate: `Post-analysis learning: ${depReason}`
        });
        if (feedback && feedback.status !== 'OPERATIONAL_INCIDENT_RECORDED') {
          proposed++;
        }
      }
      feedbackResult = {
        hookStatus: proposed > 0 ? 'DELTAS_PROPOSED_AND_QUARANTINED' : 'AUDITED_NO_ACTION',
        deltasProposed: proposed,
        quarantinedCount: proposed
      };
    }
  } catch (err) {
    logger.warn('REASONING_ANALYZER', `Feedback reflection hook advisory: ${err.message}`);
    feedbackResult = {
      hookStatus: 'HOOK_ERROR',
      error: err.message,
      deltasProposed: 0,
      quarantinedCount: 0
    };
  }

  // 4.5. Dynamic Context & Platform Classification
  const sampleContextText = `${queryText || ''} ${responseData.chassis || ''} ${context.chassisName || ''} ${context.chassisDir ? require('path').basename(context.chassisDir) : ''}`;
  const detectedVendor = detectVendor(sampleContextText, responseData.targetSku || '', context);
  const detectedDomain = responseData.solutionTopology?.domain ||
    (responseData.productType ? String(responseData.productType).toLowerCase() : null) ||
    detectHardwareDomain(sampleContextText, '', context);
  const platformName = responseData.chassis || context.chassisName || responseData.chassisInfo?.model || (context.chassisDir ? require('path').basename(context.chassisDir) : 'GENERAL_INFRASTRUCTURE');
  const genMatch = String(platformName).match(/Gen(\d+)/i) || String(sampleContextText).match(/Gen(\d+)/i);
  const generation = genMatch ? `Gen${genMatch[1]}` : (responseData.chassisInfo?.gen || 'N/A');
  const formFactor = responseData.chassisInfo?.formFactor || (responseData.is1U ? '1U' : responseData.is4U ? '4U' : '2U');

  const contextClassification = {
    detectedVendor,
    solutionDomain: detectedDomain,
    platform: platformName,
    generation,
    formFactor
  };

  const reasoningNarrative = [
    `1. Intake Classification: Intent identified as ${effectiveIntent} (${((classification.confidence ?? 1.0) * 100).toFixed(0)}% confidence). Hardware Vendor: ${detectedVendor}, Solution Domain: ${detectedDomain}.`,
    `2. Platform & Generation Scoping: Evaluated against target platform ${platformName} (${generation}, ${formFactor}). Applied scoped physical rules without blind cross-domain leakage.`,
    `3. Physical Math & Constraint Verification: ${conflictsCount} conflict(s) detected, ${missingDeps.length} missing dependency/enablement item(s) identified across ${responseData.aspectChecks?.length || 0} aspect check(s).`,
    `4. Epistemic Grounding: Ranked at ${epistemic.label}. Document Grounding: ${responseData.notebookLmStatus?.isCloudGrounded ? 'VERIFIED' : 'PENDING'}. Portal Verification: ${epistemic.vendorAcceptancePending ? 'PORTAL VALIDATION PENDING' : 'ACCEPTED_BY_VENDOR'}.`,
    `5. Continuous Learning: Reflection hook status: ${feedbackResult.hookStatus} (${feedbackResult.deltasProposed} candidate delta(s) proposed to quarantine).`
  ];

  logger.info('REASONING_ANALYZER', `[REASONING] Trace ${effectiveTraceId} | Vendor: ${detectedVendor} | Domain: ${detectedDomain} | Platform: ${platformName} (${generation}) | Epistemic: ${epistemic.tier} | Blocker(s): ${acceptance.blockersCount} | Status: ${acceptance.status}`);

  // 5. Build Comprehensive Reasoning Analysis Payload
  const analysis = {
    analyzedAt: new Date().toISOString(),
    traceId: effectiveTraceId,
    executionTimeMs,
    intent: effectiveIntent,
    confidence: classification.confidence ?? 1.0,
    intentRationale: classification.rationale || 'Canonical execution dispatched.',
    contextClassification,
    reasoningNarrative,
    epistemicIntegrity: {
      ...epistemic,
      isMathClean: responseData.isMathClean ?? (rawErrors.length === 0),
      hasDiscrepancies: (responseData.opinionDiscrepancies?.length || 0) > 0 || (rawErrors.length > 0)
    },
    transparencyAudit: {
      physicalChecksEvaluated: Boolean(responseData.aspectChecksCompleted || responseData.stage2AspectMathMs),
      conflictsDetectedCount: conflictsCount,
      missingDependenciesCount: missingDeps.length,
      diagnosticHintsAttachedCount: diagnosticHints.length,
      diagnosticHints: diagnosticHints.slice(0, 5),
      groundingSource: responseData.notebookLmStatus?.source || responseData.source || 'LOCAL_DETERMINISTIC_RULES'
    },
    acceptanceGate: {
      status: acceptance.status,
      isValid: acceptance.isValid,
      blockersCount: acceptance.blockersCount ?? (rawErrors.length),
      warningsCount: acceptance.warningsCount ?? (rawWarnings.length)
    },
    continuousLearningHook: feedbackResult
  };

  // Attach analysis transparently to responseData
  if (responseData && typeof responseData === 'object') {
    responseData.reasoningAnalysis = analysis;
  }

  // 6. Ensure Evidence Ledger Persistence by Default
  const shouldPersist = context.persistLedger !== false;
  if (shouldPersist && !responseData.evidenceLogPath) {
    try {
      let ledger = evidenceLedger;
      if (!ledger) {
        ledger = createEvidenceLedger({
          traceId: effectiveTraceId,
          chassis: responseData.chassis || context.chassisName || 'PRESALES_QUERY_SOLUTION',
          filePath: context.filePath || 'PRESALES_QUERY_INPUT'
        });
        ledger.mandatoryPhaseKeys = ['phase_1', 'phase_2', 'phase_3'];
        ledger.recordInlineArtifact('CUSTOMER_INPUT', queryText || String(context.filePath || 'PRESALES_QUERY_INPUT'));
        ledger.recordSkuAudit(
          responseData.targetSku || responseData.chassis || 'QUERY_SCOPE',
          'ROUTED_QUERY_EVALUATED',
          classification.rationale || `Evaluated via ${effectiveIntent}`
        );

        ledger.startPhase(1, 'Presales Query Intake & Intent Classification', {
          query: queryText,
          intent: effectiveIntent
        });
        ledger.completePhase(1, effectiveIntent !== 'UNKNOWN' ? 'PASSED' : 'ACTION_REQUIRED', {
          intent: effectiveIntent,
          confidence: classification.confidence,
          rationale: classification.rationale
        });

        ledger.startPhase(2, 'Router Dispatch & Solution Execution', {
          skillTarget: classification.skillTarget || 'presales-query-router'
        });
        const execStatus = (responseData.status === 'ERROR' || responseData.status === 'FAILED')
          ? 'FAILED'
          : (responseData.status === 'ACTION_REQUIRED' ? 'ACTION_REQUIRED' : 'PASSED');
        ledger.completePhase(2, execStatus, {
          status: responseData.status || 'COMPLETED',
          executionTimeMs
        });
      }

      if (ledger.phases.phase_8 && !ledger.phases.phase_9) {
        ledger.startPhase(9, 'Continuous Learning Reflection & Shared State Export', {
          epistemicTier: epistemic.tier,
          contextClassification
        });
        ledger.completePhase(9, 'PASSED', {
          epistemicTier: epistemic.tier,
          acceptanceGateValid: acceptance.isValid,
          conflictsCaught: conflictsCount,
          diagnosticHintsCount: diagnosticHints.length,
          feedbackHookStatus: feedbackResult.hookStatus
        });
      } else if (!ledger.phases.phase_3) {
        ledger.startPhase(3, 'Reasoning Post-Analysis & Continuous Learning Reflection', {
          epistemicTier: epistemic.tier,
          contextClassification
        });
        ledger.completePhase(3, 'PASSED', {
          epistemicTier: epistemic.tier,
          acceptanceGateValid: acceptance.isValid,
          conflictsCaught: conflictsCount,
          diagnosticHintsCount: diagnosticHints.length,
          feedbackHookStatus: feedbackResult.hookStatus
        });
      }

      const exported = ledger.finalizeAndExport();
      responseData.evidenceLogPath = exported.jsonPath;
      responseData.traceStatus = 'PERSISTED_EVIDENCE_LEDGER';
    } catch (ledgerErr) {
      logger.warn('REASONING_ANALYZER', `Evidence ledger persistence advisory: ${ledgerErr.message}`);
      if (!responseData.traceStatus) {
        responseData.traceStatus = 'CORRELATION_ONLY_NO_PERSISTED_LEDGER';
      }
    }
  } else if (responseData && typeof responseData === 'object' && !responseData.traceStatus) {
    responseData.traceStatus = responseData.evidenceLogPath
      ? 'PERSISTED_EVIDENCE_LEDGER'
      : 'CORRELATION_ONLY_NO_PERSISTED_LEDGER';
  }

  return analysis;
}

module.exports = {
  determineEpistemicTier,
  performReasoningPostAnalysis
};
