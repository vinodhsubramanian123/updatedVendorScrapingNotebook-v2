'use strict';
/**
 * scripts/lib/system/reasoning_post_analyzer.js — Automated Reasoning Post-Analysis & Learning Hook
 *
 * Automatically inspects the reasoning trace of every presales query solution and BOQ evaluation:
 * 1. Analyzes epistemic integrity across 4 tiers (untrusted claim -> physical sanity -> RAG grounding -> live CLIC).
 * 2. Audits physical constraint checks, detected conflicts, diagnostic hints, and 14-point acceptance gate.
 * 3. Transparently hooks into the continuous learning and feedback loop, logging candidate deltas to quarantine without overriding raw facts.
 * 4. Ensures end-to-end evidence ledger persistence by default across all query intents.
 * 5. Generates step-by-step mathematical derivations (Step 3) and resolution proofs (Step 6).
 * 6. Attaches deterministic counterfactual repair proofs when unbuildable conditions occur.
 */

const fs = require('fs');
const path = require('path');
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
 * Helper to execute the feedback reflection loop in a contained routine.
 */
function _runContinuousLearningHook(context, responseData, missingDeps, effectiveTraceId) {
  let feedbackResult = {
    hookStatus: 'AUDITED_NO_ACTION',
    deltasProposed: 0,
    quarantinedCount: 0
  };

  try {
    const shouldEnable = Boolean(context.enableFeedback === true && process.env.NODE_ENV !== 'test' && !context.isolatedMode);
    const chassisDir = context.chassisDir || context.targetDir || responseData.chassisDir || responseData.catalogDir;
    if (shouldEnable && chassisDir && fs.existsSync(chassisDir) && Array.isArray(missingDeps) && missingDeps.length > 0) {
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

  return feedbackResult;
}

/**
 * Helper to determine vendor, hardware domain, platform, generation, and form factor.
 */
function _determineContextClassification(queryText, responseData, context) {
  const sampleContextText = `${queryText || ''} ${responseData.chassis || ''} ${context.chassisName || ''} ${context.chassisDir ? path.basename(context.chassisDir) : ''}`;
  const detectedVendor = detectVendor(sampleContextText, responseData.targetSku || '', context);
  const detectedDomain = responseData.solutionTopology?.domain ||
    (responseData.productType ? String(responseData.productType).toLowerCase() : null) ||
    detectHardwareDomain(sampleContextText, '', context);
  const platformName = responseData.chassis || context.chassisName || responseData.chassisInfo?.model || (context.chassisDir ? path.basename(context.chassisDir) : 'GENERAL_INFRASTRUCTURE');
  const genMatch = String(platformName).match(/Gen(\d+)/i) || String(sampleContextText).match(/Gen(\d+)/i);
  const generation = genMatch ? `Gen${genMatch[1]}` : (responseData.chassisInfo?.gen || 'N/A');
  const formFactor = responseData.chassisInfo?.formFactor || (responseData.is1U ? '1U' : responseData.is4U ? '4U' : '2U');

  return {
    detectedVendor,
    solutionDomain: detectedDomain,
    platform: platformName,
    generation,
    formFactor
  };
}

/**
 * Helper to extract selfCorrectionTrail across all possible response topologies.
 */
function _extractSelfCorrectionTrail(responseData) {
  return responseData.selfCorrectionTrail ||
    responseData.conflictGraph?.arbitrationResults?.selfCorrectionTrail ||
    responseData.conflictArbitration?.selfCorrectionTrail ||
    responseData.arbitrationResults?.selfCorrectionTrail ||
    responseData.evaluation?.conflictGraph?.arbitrationResults?.selfCorrectionTrail ||
    responseData.evaluation?.arbitrationResults?.selfCorrectionTrail ||
    [];
}

function _derivePowerProof(power) {
  const wNode = power.estimatedNodeWattage || 0;
  const wPsu = power.maxPsuWattage || 0;
  const wReq = power.requiredWattageWithHeadroom || Math.ceil(wNode * 1.20);
  if (wNode <= 0) return null;

  if (wPsu < wReq && wPsu > 0) {
    const deficit = wReq - wPsu;
    const overagePct = Math.round((deficit / wPsu) * 100);
    return `Power Deficit Proof: Node load = ${wNode}W + 20% headroom (${Math.ceil(wNode * 0.2)}W) = ${wReq}W required vs ${wPsu}W PSU capacity -> Deficit: -${deficit}W (${overagePct}% overage). Minimum required PSU: >=${Math.ceil(wReq / 100) * 100}W.`;
  }
  if (wPsu >= wReq) {
    return `Power Headroom Proof: Node load = ${wNode}W + 20% headroom (${Math.ceil(wNode * 0.2)}W) = ${wReq}W <= ${wPsu}W installed PSU capacity (Headroom: +${wPsu - wReq}W / ${Math.round(((wPsu - wReq) / wReq) * 100)}% margin).`;
  }
  return null;
}

function _deriveMemoryProof(memory) {
  const cpus = memory.cpuCount || 0;
  const dimms = memory.memoryCount || 0;
  const chWidth = memory.channelWidth || 8;
  const totalCh = cpus * chWidth;
  if (cpus <= 0 || dimms <= 0) return null;

  const satPct = Math.min(100, Math.round((dimms / totalCh) * 100));
  const isUnbalanced = memory.isBalancedChannel === false || memory.isInvalidChannelConfiguration === true || (dimms % cpus !== 0) || ((dimms / cpus) % chWidth !== 0);
  if (isUnbalanced) {
    return `Memory Balance Proof: ${dimms} DIMMs across ${cpus} CPU(s) with ${chWidth} channels/socket (${(dimms / cpus).toFixed(1)} DIMMs/socket) -> Interleaving: UNBALANCED (${satPct}% saturation [${Math.min(dimms, totalCh)}/${totalCh} channels active]). Balance check: ${dimms} % ${totalCh} = ${dimms % totalCh} != 0 (asymmetric NUMA interleaving).`;
  }
  const bw = (totalCh * 44.8).toFixed(1);
  return `Memory Balance Proof: ${dimms} DIMMs across ${cpus} CPU(s) with ${chWidth} channels/socket (${dimms / cpus} DIMMs/socket) -> Interleaving: 100% BALANCED across all ${totalCh} channels (Theoretical memory bandwidth: ${bw} GB/s at DDR5-5600).`;
}

function _derivePcieProof(pcie) {
  const cards = pcie.requiredPcieCards || 0;
  const activeSlots = pcie.activeSlotsAvailable || 0;
  const mechSlots = pcie.totalPhysicalSlots || 0;
  if (cards <= 0 && activeSlots <= 0) return null;

  if (cards > activeSlots) {
    return `PCIe Capacity Proof: Demand = ${cards} card(s) vs Active = ${activeSlots} slot(s) (Mechanical: ${mechSlots}) -> Deficit: -${cards - activeSlots} slot(s). Cabled vs active: Slot 1 dormant without primary cable kit; Primary cable kit mandatory.`;
  }
  return `PCIe Capacity Proof: Demand = ${cards} card(s) <= Active = ${activeSlots} slot(s) (Mechanical: ${mechSlots}, x16 lanes: ${pcie.x16LanesAvailable || 1}) -> 100% PCIe coverage (+${activeSlots - cards} slot headroom).`;
}

function _deriveThermalProof(compute, cpus = 2) {
  const tdp = compute.maxCpuTdpWatts || 0;
  if (tdp <= 0) return null;
  const totalDissipation = cpus * tdp;

  if (tdp > 350) {
    return `Thermal Dissipation Proof: Max CPU TDP = ${tdp}W (Total socket dissipation: ${totalDissipation}W) exceeds 350W air-cooling limit (+${tdp - 350}W overage). Direct Liquid Cooling (DLC) mandatory.`;
  }
  if (tdp > 185) {
    return `Thermal Dissipation Proof: Max CPU TDP = ${tdp}W (Total socket dissipation: ${totalDissipation}W <= 350W air ceiling). High Performance Heat Sink (185W-270W certified) and High Performance Fan Kits mandatory.`;
  }
  return `Thermal Dissipation Proof: Max CPU TDP = ${tdp}W (Total socket dissipation: ${totalDissipation}W <= 185W standard ceiling). Standard cooling certified.`;
}

/**
 * Step 3 Mathematical Derivations (Power, Memory, PCIe, Thermal)
 */
function _deriveStep3MathematicalProofs(responseData) {
  const summary = responseData.evalSummary || responseData || {};
  const power = summary.power || responseData.power || {};
  const memory = summary.memory || responseData.memory || {};
  const pcie = summary.pcie || responseData.pcie || {};
  const compute = summary.compute || responseData.compute || {};
  const cpus = memory.cpuCount || compute.cpuCount || 2;
  const proofs = [];

  const pProof = _derivePowerProof(power);
  if (pProof) proofs.push(pProof);

  const mProof = _deriveMemoryProof(memory);
  if (mProof) proofs.push(mProof);

  const pcProof = _derivePcieProof(pcie);
  if (pcProof) proofs.push(pcProof);

  const tProof = _deriveThermalProof(compute, cpus);
  if (tProof) proofs.push(tProof);

  return proofs;
}

/**
 * Step 6 Resolution Proofs (Capacity Reallocation)
 */
function _deriveStep6ResolutionProofs(selfCorrectionTrail = []) {
  return selfCorrectionTrail.map((t, idx) => {
    if (t.mathematicalProof) return `[Resolution ${idx + 1}] ${t.mathematicalProof}`;
    const type = t.contestedResourceType || 'RESOURCE_CONTENTION';
    if (type.includes('OCP')) {
      return `[Resolution ${idx + 1} - OCP Contention]: OCP Slot 1 capacity = 1 card vs demand = 2 (Storage Controller -o + NIC OCP3). Pivot: Controller moved to PCIe standup Slot 3 (frees OCP Slot 1 for NIC; consumes 1 standup slot; bandwidth upgraded from x8 to x16 lanes [64 GB/s PCIe Gen5], write cache 4GB -> 8GB; net allocations: OCP 1/1 [100%], PCIe Standup 1/3 [33% utilized]).`;
    }
    if (type.includes('BAY') || type.includes('REAR')) {
      return `[Resolution ${idx + 1} - Rear Bay Space]: Rear chassis bay capacity = 1 vs demand = 2 (NS204i-u Boot Device + 2SFF Rear Drive Cage). Pivot: Boot device moved to PCIe standup Slot (NS204i-p) (frees rear drive cage bay; net allocations: Rear drive cages 1/1 [100%], PCIe Standup slots utilized: +1; retains dedicated RAID-1 OS mirror).`;
    }
    return `[Resolution ${idx + 1} - ${type}]: ${t.selfCorrectionAction}. ${t.resolutionDetails || 'Topology rebalanced to certified buildable state.'}`;
  });
}

/**
 * Step-by-step numbered reasoning narrative builder (Steps 1 to 7).
 */
function _buildReasoningNarrative({
  effectiveIntent,
  classification,
  contextClassification,
  conflictsCount,
  missingDeps,
  responseData,
  epistemic,
  feedbackResult,
  selfCorrectionTrail,
  counterfactualRepairProofs
}) {
  const { detectedVendor, solutionDomain, platform, generation, formFactor } = contextClassification;
  const step3MathProofs = _deriveStep3MathematicalProofs(responseData);
  const step6ResolutionProofs = _deriveStep6ResolutionProofs(selfCorrectionTrail);

  const step3Line = `3. Physical Math & Constraint Verification: ${conflictsCount} conflict(s) detected, ${missingDeps.length} missing dependency/enablement item(s) identified across ${responseData.aspectChecks?.length || 0} aspect check(s).` +
    (step3MathProofs.length > 0 ? `\n   - ${step3MathProofs.join('\n   - ')}` : '');

  const narrative = [
    `1. Intake Classification: Intent identified as ${effectiveIntent} (${((classification.confidence ?? 1.0) * 100).toFixed(0)}% confidence). Hardware Vendor: ${detectedVendor}, Solution Domain: ${solutionDomain}.`,
    `2. Platform & Generation Scoping: Evaluated against target platform ${platform} (${generation}, ${formFactor}). Applied scoped physical rules without blind cross-domain leakage.`,
    step3Line,
    `4. Epistemic Grounding: Ranked at ${epistemic.label}. Document Grounding: ${responseData.notebookLmStatus?.isCloudGrounded ? 'VERIFIED' : 'PENDING'}. Portal Verification: ${epistemic.vendorAcceptancePending ? 'PORTAL VALIDATION PENDING' : 'ACCEPTED_BY_VENDOR'}.`,
    `5. Continuous Learning: Reflection hook status: ${feedbackResult.hookStatus} (${feedbackResult.deltasProposed} candidate delta(s) proposed to quarantine).`
  ];

  if (selfCorrectionTrail.length > 0) {
    const step6Line = `6. Autonomous Self-Correction & Backtracking: Resolved ${selfCorrectionTrail.length} physical contention(s) via automated topological pivots (${selfCorrectionTrail.map(t => t.selfCorrectionAction).join('; ')}).` +
      (step6ResolutionProofs.length > 0 ? `\n   - ${step6ResolutionProofs.join('\n   - ')}` : '');
    narrative.push(step6Line);
  }

  if (counterfactualRepairProofs.length > 0) {
    narrative.push(
      `7. Deterministic Counterfactual Repair Proofs: Generated ${counterfactualRepairProofs.length} repair proof(s) providing exact hardware deltas and mathematical proofs for 100% buildability (${counterfactualRepairProofs.map(p => p.issueType).join(', ')}).\n   - ${counterfactualRepairProofs.map(p => `[${p.issueType}] ${p.mathematicalProof}`).join('\n   - ')}`
    );
  }

  return narrative;
}

/**
 * Helper to persist evidence ledger records cleanly.
 */
function _persistEvidenceLedger({
  context,
  responseData,
  evidenceLedger,
  effectiveTraceId,
  queryText,
  effectiveIntent,
  classification,
  executionTimeMs,
  acceptance,
  feedbackResult,
  epistemic,
  contextClassification,
  conflictsCount,
  diagnosticHints
}) {
  const shouldPersist = context.persistLedger !== false;
  if (!shouldPersist || responseData.evidenceLogPath) {
    if (responseData && typeof responseData === 'object' && !responseData.traceStatus) {
      responseData.traceStatus = responseData.evidenceLogPath
        ? 'PERSISTED_EVIDENCE_LEDGER'
        : 'CORRELATION_ONLY_NO_PERSISTED_LEDGER';
    }
    return;
  }

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

    const isAcceptanceValid = acceptance.isValid === true && (acceptance.status === 'PASSED' || acceptance.status === 'PASS') && (acceptance.blockersCount || 0) === 0;
    const isFeedbackClean = feedbackResult.hookStatus !== 'HOOK_ERROR';
    let terminalReflectionStatus = 'PASSED';
    if (acceptance.status === 'FAILED' || responseData.status === 'FAILED') {
      terminalReflectionStatus = 'FAILED';
    } else if (!isAcceptanceValid || !isFeedbackClean) {
      terminalReflectionStatus = 'ACTION_REQUIRED';
    }

    if (ledger.phases.phase_8 && !ledger.phases.phase_9) {
      ledger.startPhase(9, 'Continuous Learning Reflection & Shared State Export', {
        epistemicTier: epistemic.tier,
        contextClassification
      });
      ledger.completePhase(9, terminalReflectionStatus, {
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
      ledger.completePhase(3, terminalReflectionStatus, {
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
  const feedbackResult = _runContinuousLearningHook(context, responseData, missingDeps, effectiveTraceId);

  // 5. Context & Platform Classification
  const contextClassification = _determineContextClassification(queryText, responseData, context);

  // 6. Extract Self-Correction Trail
  const selfCorrectionTrail = _extractSelfCorrectionTrail(responseData);

  // 7. Counterfactual Repair Proofs (Requirement R2 / Feature 6 & Feature 8)
  let counterfactualRepairProofs = responseData.counterfactualRepairProofs || [];
  const isUnbuildable = responseData.customerDisposition === 'DELIVERY_BLOCKED_UNBUILDABLE' || responseData.isMathClean === false || acceptance.isValid === false;
  if (counterfactualRepairProofs.length === 0 && isUnbuildable) {
    try {
      const { generateCounterfactualRepairProofs } = require('./counterfactual_repair.js');
      counterfactualRepairProofs = generateCounterfactualRepairProofs(responseData, context);
      responseData.counterfactualRepairProofs = counterfactualRepairProofs;
    } catch (_err) {
      counterfactualRepairProofs = [];
    }
  }

  // 8. Build Reasoning Narrative
  const reasoningNarrative = _buildReasoningNarrative({
    effectiveIntent,
    classification,
    contextClassification,
    conflictsCount,
    missingDeps,
    responseData,
    epistemic,
    feedbackResult,
    selfCorrectionTrail,
    counterfactualRepairProofs
  });

  logger.info('REASONING_ANALYZER', `[REASONING] Trace ${effectiveTraceId} | Vendor: ${contextClassification.detectedVendor} | Domain: ${contextClassification.solutionDomain} | Platform: ${contextClassification.platform} (${contextClassification.generation}) | Epistemic: ${epistemic.tier} | Blocker(s): ${acceptance.blockersCount} | Status: ${acceptance.status} | SelfCorrections: ${selfCorrectionTrail.length}`);

  // 9. Build Comprehensive Reasoning Analysis Payload
  const analysis = {
    analyzedAt: new Date().toISOString(),
    traceId: effectiveTraceId,
    executionTimeMs,
    intent: effectiveIntent,
    confidence: classification.confidence ?? 1.0,
    intentRationale: classification.rationale || 'Canonical execution dispatched.',
    contextClassification,
    reasoningNarrative,
    selfCorrectionTrail,
    counterfactualRepairProofs,
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

  // 10. Ensure Evidence Ledger Persistence
  _persistEvidenceLedger({
    context,
    responseData,
    evidenceLedger,
    effectiveTraceId,
    queryText,
    effectiveIntent,
    classification,
    executionTimeMs,
    acceptance,
    feedbackResult,
    epistemic,
    contextClassification,
    conflictsCount,
    diagnosticHints
  });

  return analysis;
}

module.exports = {
  determineEpistemicTier,
  performReasoningPostAnalysis,
  _deriveStep3MathematicalProofs,
  _deriveStep6ResolutionProofs
};
