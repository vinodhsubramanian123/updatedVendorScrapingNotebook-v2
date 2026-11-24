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
const { getCanonicalPhaseDescriptor } = require('../contracts/workflow_contract.js');
const logger = require('./pipeline_logger.js');
const { detectVendor, detectHardwareDomain } = require('../taxonomy/vendor_agnostic_schema.js');

function _isAuthoritativeCitationEntry(entry, ephemeralSourceId) {
  if (!entry) return false;
  if (typeof entry === 'string') return entry.trim().length > 0;
  if (typeof entry !== 'object' || entry.isEphemeral === true) return false;
  const sourceId = entry.sourceId || entry.source_id || entry.id || null;
  if (ephemeralSourceId && sourceId && String(sourceId) === String(ephemeralSourceId)) return false;
  return Boolean(sourceId || entry.title || entry.source || entry.excerpt || entry.quote || entry.passage);
}

function _hasVerifiedTier2Evidence(responseData) {
  const hasCandidateReview = Boolean(responseData?.ephemeralSourceValidation || responseData?.solutionDoubleCheck);
  if (hasCandidateReview) {
    const { candidateReviewCurrent } = require('../boq/solution_evidence.js');
    return candidateReviewCurrent(responseData);
  }
  const hasCandidates = Boolean(
    responseData?.conflictGraph?.recommendedSolutions?.length ||
    responseData?.conflictGraph?.rankedSolutions?.length ||
    responseData?.rankedSolutions?.length
  );
  if (hasCandidates) return false;
  const nlm = responseData?.notebookLmStatus;
  if (!nlm || nlm.isCloudGrounded !== true) return false;
  if (nlm.cloudSyncState === 'FAILED' || nlm.cloudSyncState === 'DEGRADED') return false;
  if (!Array.isArray(nlm.citations) || nlm.citations.length === 0) return false;
  return nlm.citations.some(entry => _isAuthoritativeCitationEntry(entry, nlm.ephemeralSourceId));
}

function _hasPhysicalChecks(responseData) {
  return responseData?.aspectChecksCompleted === true ||
    (Array.isArray(responseData?.aspectChecks) &&
      responseData.aspectChecks.some(check => ['PASS', 'WARN', 'FAIL'].includes(check?.status)));
}

/** Determine the epistemic tier of the completed solution (INV-231). */
function determineEpistemicTier(responseData, _classification, context = {}) {
  // Tier 3: Requires verified cryptographic vendor portal receipt OR live accepted portal receipt
  const receipt = require('../boq/portal_receipt').verifyCurrentPortalReceipt(responseData, context);
  const isLivePortalAccepted = Boolean(receipt);

  if (isLivePortalAccepted) {
    const fingerprint = receipt.manifestSha256;
    return {
      tier: 'TIER_3_OFFICIAL_VENDOR_ACCEPTANCE',
      label: 'Tier 3: Official Vendor Acceptance Receipt',
      vendorAcceptancePending: false,
      receiptFingerprint: fingerprint,
      description: 'Verified live against official vendor configurator / CLIC acceptance receipt.'
    };
  }

  // Tier 2: Requires canonical verified candidate review or authentic non-empty document citations
  if (_hasVerifiedTier2Evidence(responseData)) {
    return {
      tier: 'TIER_2_DOCUMENT_CITATION',
      label: 'Tier 2: Grounded Document Citation Check',
      vendorAcceptancePending: true,
      description: 'Cited from official vendor QuickSpecs PDFs and master catalogs. Live CLIC portal validation pending.'
    };
  }

  // Tier 1: Requires verified execution of deterministic physical aspect checks
  if (_hasPhysicalChecks(responseData)) {
    const checks = Array.isArray(responseData?.aspectChecks) ? responseData.aspectChecks : [];
    const passedCount = checks.filter(c => c?.status === 'PASS').length;
    const countStr = checks.length > 0 ? ` (${passedCount}/${checks.length} PASS)` : '';
    return {
      tier: 'TIER_1_PHYSICAL_SANITY',
      label: 'Tier 1: Pre-Flight Physical Sanity Check',
      vendorAcceptancePending: true,
      description: `Deterministic physical aspect checks evaluated${countStr} (TDP, memory, PCIe, power envelope). Document grounding and live validation pending.`
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
  const feedbackResult = {
    hookStatus: 'AUDITED_NO_ACTION',
    deltasProposed: 0,
    quarantinedCount: 0,
    activatedCount: 0,
    rejectedCount: 0,
    advisoryCount: 0,
    incidentCount: 0
  };

  try {
    const shouldEnable = Boolean(context.enableFeedback === true && process.env.NODE_ENV !== 'test' && !context.isolatedMode);
    const chassisDir = context.chassisDir || context.targetDir || responseData.chassisDir || responseData.catalogDir;
    if (!shouldEnable) return { ...feedbackResult, hookStatus: 'DISABLED' };
    if (missingDeps.length && (!chassisDir || !fs.existsSync(chassisDir))) {
      return { ...feedbackResult, hookStatus: 'SKIPPED_MISSING_DIRECTORY' };
    }
    if (missingDeps.length) {
      const { processPortalFeedback } = require('../feedback/feedback_loop.js');
      const counters = new Map([
        ['QUARANTINED', 'quarantinedCount'], ['ACTIVE', 'activatedCount'], ['REJECTED', 'rejectedCount'],
        ['WORKFLOW_ADVISORY_ONLY', 'advisoryCount'], ['IGNORED_FOR_HARDWARE_RULES', 'incidentCount']
      ]);
      for (const dep of missingDeps) {
        const depReason = typeof dep === 'string' ? dep : (dep?.reason || dep?.sku);
        if (!depReason) throw new Error('Missing dependency has no reason or SKU');
        const feedback = processPortalFeedback(depReason, chassisDir, {
          sourceAgent: 'AUTOMATED_REASONING_POST_ANALYSIS',
          source: 'DETERMINISTIC_ASPECT_EVALUATION',
          scopeTaxonomy: 'CHASSIS_SPECIFIC',
          traceId: effectiveTraceId,
          ruleUpdate: `Post-analysis learning: ${depReason}`
        });
        const counter = counters.get(feedback?.governanceStatus);
        if (!counter) throw new Error('Feedback receipt has no recognized governance outcome');
        feedbackResult[counter]++;
      }
      feedbackResult.hookStatus = feedbackResult.quarantinedCount === missingDeps.length
        ? 'DELTAS_PROPOSED_AND_QUARANTINED' : 'OUTCOMES_RECORDED';
    }
  } catch (err) {
    logger.warn('REASONING_ANALYZER', `Feedback reflection hook advisory: ${err.message}`);
    feedbackResult.hookStatus = 'HOOK_ERROR';
    feedbackResult.error = err.message;
  }

  feedbackResult.deltasProposed = feedbackResult.quarantinedCount + feedbackResult.rejectedCount + feedbackResult.activatedCount;
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
  const formFactor = responseData.chassisInfo?.formFactor ||
    (responseData.is1U ? '1U' : responseData.is4U ? '4U' : responseData.is2U ? '2U' : 'UNKNOWN');

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

function _resolveValidatorRequiredPower(power, wNode) {
  if (Number.isFinite(power.requiredWattageWithHeadroom) && power.requiredWattageWithHeadroom > 0) {
    const deltaW = Math.max(0, power.requiredWattageWithHeadroom - wNode);
    const label = power.headroomPolicy || (Number.isFinite(power.headroomPct)
      ? `${power.headroomPct}% headroom`
      : `validator-supplied headroom (+${deltaW}W)`);
    return { wReq: power.requiredWattageWithHeadroom, label, deltaW };
  }
  if (Number.isFinite(power.headroomFactor) && power.headroomFactor > 0) {
    const wReq = Math.ceil(wNode * (1 + power.headroomFactor));
    const pct = Math.round(power.headroomFactor * 100);
    return { wReq, label: power.headroomPolicy || `${pct}% headroom`, deltaW: wReq - wNode };
  }
  if (Number.isFinite(power.headroomPct) && power.headroomPct >= 0) {
    const wReq = Math.ceil(wNode * (1 + power.headroomPct / 100));
    return { wReq, label: power.headroomPolicy || `${power.headroomPct}% headroom`, deltaW: wReq - wNode };
  }
  return { wReq: null, label: null, deltaW: null };
}

function _derivePowerProof(power) {
  const wNode = power.estimatedNodeWattage || 0;
  const wPsu = power.maxPsuWattage || 0;
  if (wNode <= 0) return null;

  const { wReq, label, deltaW } = _resolveValidatorRequiredPower(power, wNode);
  if (wReq === null) {
    const psuLabel = wPsu > 0 ? `${wPsu}W` : 'UNKNOWN';
    return `Power Check: Node load = ${wNode}W vs ${psuLabel} PSU capacity; headroom policy not supplied by validator (required wattage with headroom: UNKNOWN).`;
  }
  if (wPsu <= 0) {
    return `Power Check: Node load = ${wNode}W + ${label} (+${deltaW}W) = ${wReq}W required vs UNKNOWN PSU capacity.`;
  }
  if (wPsu < wReq) {
    const deficit = wReq - wPsu;
    const overagePct = Math.round((deficit / wPsu) * 100);
    return `Power Deficit Proof: Node load = ${wNode}W + ${label} (${deltaW}W) = ${wReq}W required vs ${wPsu}W PSU capacity -> Deficit: -${deficit}W (${overagePct}% overage). Minimum required PSU: >=${Math.ceil(wReq / 100) * 100}W.`;
  }
  return `Power Headroom Proof: Node load = ${wNode}W + ${label} (${deltaW}W) = ${wReq}W <= ${wPsu}W installed PSU capacity (Headroom: +${wPsu - wReq}W / ${Math.round(((wPsu - wReq) / wReq) * 100)}% margin).`;
}

function _deriveMemoryProof(memory) {
  const cpus = memory.cpuCount || 0;
  const dimms = memory.memoryCount || 0;
  if (dimms <= 0) return null;

  const chWidth = (Number.isSafeInteger(memory.channelWidth) && memory.channelWidth > 0)
    ? memory.channelWidth
    : ((Number.isSafeInteger(memory.detectedChannelWidth) && memory.detectedChannelWidth > 0) ? memory.detectedChannelWidth : null);

  if (cpus <= 0 || chWidth === null) {
    const cpuLabel = cpus > 0 ? `${cpus} CPU(s)` : 'UNKNOWN CPU count';
    return `Memory Balance Check: ${dimms} DIMM(s) across ${cpuLabel}; memory channel width ${chWidth ?? 'UNKNOWN'} (interleaving balance: UNKNOWN).`;
  }

  const totalCh = cpus * chWidth;
  const remainder = dimms % totalCh;
  const distribution = remainder === 0
    ? `An even distribution would place ${dimms / totalCh} DIMM(s) per channel.`
    : `An even distribution across all channels leaves ${remainder} DIMM(s) over.`;
  const invalid = memory.isInvalidChannelConfiguration === true ? ' Validator flagged an invalid population.' : '';
  const imbalance = memory.isBalancedChannel === false ? ' Validator flagged channel imbalance.' : '';
  return `Memory Balance Check: ${dimms} DIMMs across ${cpus} CPU(s) with ${chWidth} channels/socket. ${distribution}${invalid}${imbalance}`;
}

function _derivePcieProof(pcie) {
  const totals = pcie.slotLayout?.clusterTotals;
  const cards = totals ? totals.pcieCardDemand : pcie.requiredPcieCards;
  const activeSlots = totals ? totals.electricallyActiveSlotCapacity : pcie.activeSlotsAvailable;
  const mechSlots = (totals ? totals.mechanicalSlotCapacity : pcie.totalPhysicalSlots) ?? 'UNKNOWN';
  if (cards == null && activeSlots == null) return null;
  if (![cards, activeSlots].every(value => Number.isFinite(value) && value >= 0)) {
    return `PCIe Capacity Check: Demand = ${cards ?? 'UNKNOWN'} card(s), active slots = ${activeSlots ?? 'UNKNOWN'}. Slot headroom is UNKNOWN.`;
  }
  const scope = totals ? ` across ${totals.serverCount ?? 'UNKNOWN'} servers` : '';

  if (cards > activeSlots) {
    let causeNote = 'Cause and enablement kit require scoped chassis PCIe rule verification.';
    if (pcie.deficitCause) {
      causeNote = String(pcie.deficitCause);
    } else if (pcie.needsPrimaryCableKit === true) {
      causeNote = 'Validator flagged primary riser cable kit deficit (needsPrimaryCableKit: true).';
    }
    return `PCIe Capacity Proof: Demand = ${cards} card(s) vs Active = ${activeSlots} slot(s)${scope} (Mechanical: ${mechSlots}) -> Deficit: -${cards - activeSlots} slot(s). ${causeNote}`;
  }
  return `PCIe Capacity Proof: Demand = ${cards} card(s) <= Active = ${activeSlots} slot(s)${scope} (Mechanical: ${mechSlots}). Slot headroom: +${activeSlots - cards}.`;
}

function _deriveThermalProof(compute, cpus = null) {
  const tdp = compute.maxCpuTdpWatts;
  if (!Number.isFinite(tdp) || tdp <= 0) return null;
  const rating = compute.installedCoolingCapacityWatts;
  const capacity = Number.isFinite(rating) && rating > 0
    ? `Reported per-socket cooling capacity: ${rating}W (${rating >= tdp ? 'meets' : 'below'} ${tdp}W TDP).`
    : 'Cooling capacity and enablement rules require scoped validation.';
  return `Thermal Check: ${tdp}W maximum CPU TDP across ${cpus ?? 'UNKNOWN'} reported socket(s). ${capacity}`;
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
  const cpus = memory.cpuCount || compute.cpuCount || null;
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
    if (t.mathematicalProof) return `[Correction ${idx + 1}] (${t.status || 'UNVERIFIED'}): ${t.mathematicalProof}`;
    const type = t.contestedResourceType || 'RESOURCE_CONTENTION';
    const action = t.selfCorrectionAction || 'Topological rebalance';
    const details = t.resolutionDetails || 'Validation outcome unavailable.';
    const status = t.status || 'UNVERIFIED';
    return `[Resolution ${idx + 1} - ${type}] (${status}): ${action}. ${details}`;
  });
}

function _deriveDocumentGroundingStatus(epistemic, responseData) {
  if (epistemic.tier === 'TIER_2_DOCUMENT_CITATION') return 'VERIFIED';
  if (epistemic.tier === 'TIER_3_OFFICIAL_VENDOR_ACCEPTANCE' && _hasVerifiedTier2Evidence(responseData)) {
    return 'VERIFIED';
  }
  if (responseData.notebookLmStatus?.isCloudGrounded === true || responseData.ephemeralSourceValidation?.isCloudGrounded === true) {
    return 'UNVERIFIED';
  }
  return 'PENDING';
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

  const confText = Number.isFinite(classification?.confidence)
    ? `${(classification.confidence * 100).toFixed(0)}% score`
    : 'UNASSESSED';
  const docStatus = _deriveDocumentGroundingStatus(epistemic, responseData);

  const narrative = [
    `1. Intake Classification: Intent identified as ${effectiveIntent} (${confText}). Hardware Vendor: ${detectedVendor}, Solution Domain: ${solutionDomain}.`,
    `2. Platform & Generation Scoping: Evaluated against target platform ${platform} (${generation}, ${formFactor}). Applied scoped physical rules without blind cross-domain leakage.`,
    step3Line,
    `4. Epistemic Grounding: Ranked at ${epistemic.label}. Document Grounding: ${docStatus}. Portal Verification: ${epistemic.vendorAcceptancePending ? 'PORTAL VALIDATION PENDING' : 'ACCEPTED_BY_VENDOR'}.`,
    `5. Continuous Learning: Reflection hook status: ${feedbackResult.hookStatus} (${feedbackResult.deltasProposed} candidate delta(s) proposed, ${feedbackResult.quarantinedCount} quarantined).`
  ];

  if (selfCorrectionTrail.length > 0) {
    const resolvedCount = selfCorrectionTrail.filter(t => t.status === 'RESOLVED' && t.verifiedBuildable === true).length;
    const step6Line = `6. Autonomous Self-Correction & Backtracking: Resolved ${resolvedCount} physical contention(s) (out of ${selfCorrectionTrail.length} processed) via automated topological pivots (${selfCorrectionTrail.map(t => t.selfCorrectionAction || t.contestedResourceType).join('; ')}).` +
      (step6ResolutionProofs.length > 0 ? `\n   - ${step6ResolutionProofs.join('\n   - ')}` : '');
    narrative.push(step6Line);
  }

  if (counterfactualRepairProofs.length > 0) {
    narrative.push(
      `7. Deterministic Counterfactual Repair Proposals: Generated ${counterfactualRepairProofs.length} repair proposal(s) with exact hardware deltas and mathematical predicates (${counterfactualRepairProofs.map(p => `${p.issueType} [${p.resultingStatus}]`).join(', ')}).\n   - ${counterfactualRepairProofs.map(p => `[${p.issueType}] (${p.resultingStatus}) ${p.mathematicalProof}`).join('\n   - ')}`
    );
  }

  return narrative;
}

function _initQueryEvidenceLedger({
  effectiveTraceId,
  responseData,
  context,
  queryText,
  effectiveIntent,
  classification,
  executionTimeMs
}) {
  const ledger = createEvidenceLedger({
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
    : (['ACTION_REQUIRED', 'PARTIAL'].includes(responseData.status) ? 'ACTION_REQUIRED' : 'PASSED');
  ledger.completePhase(2, execStatus, {
    status: responseData.status || 'COMPLETED',
    executionTimeMs
  });
  return ledger;
}

function _recordTerminalReflectionPhase(ledger, {
  acceptance,
  responseData,
  feedbackResult,
  epistemic,
  contextClassification,
  conflictsCount,
  diagnosticHints
}) {
  const isAcceptanceValid = acceptance.isValid === true && (acceptance.status === 'PASSED' || acceptance.status === 'PASS') && (acceptance.blockersCount || 0) === 0;
  const isFeedbackClean = feedbackResult.hookStatus !== 'HOOK_ERROR';
  let terminalReflectionStatus = 'PASSED';
  if (acceptance.status === 'FAILED' || ['FAILED', 'ERROR'].includes(responseData.status)) {
    terminalReflectionStatus = 'FAILED';
  } else if (!isAcceptanceValid || !isFeedbackClean) {
    terminalReflectionStatus = 'ACTION_REQUIRED';
  }

  const phaseNum = (ledger.phases.phase_8 && !ledger.phases.phase_9) ? 9 : (!ledger.phases.phase_3 ? 3 : null);
  if (!phaseNum) return;

  const canonicalPhase9 = getCanonicalPhaseDescriptor(9)?.name || 'Closed-Loop Reflection & Shared State Export';
  const phaseName = phaseNum === 9
    ? canonicalPhase9
    : 'Reasoning Post-Analysis & Continuous Learning Reflection';

  ledger.startPhase(phaseNum, phaseName, {
    epistemicTier: epistemic.tier,
    contextClassification
  });
  ledger.completePhase(phaseNum, terminalReflectionStatus, {
    epistemicTier: epistemic.tier,
    acceptanceGateValid: acceptance.isValid,
    conflictsCaught: conflictsCount,
    diagnosticHintsCount: diagnosticHints.length,
    feedbackHookStatus: feedbackResult.hookStatus
  });
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
    const ledger = evidenceLedger || _initQueryEvidenceLedger({
      effectiveTraceId,
      responseData,
      context,
      queryText,
      effectiveIntent,
      classification,
      executionTimeMs
    });

    _recordTerminalReflectionPhase(ledger, {
      acceptance,
      responseData,
      feedbackResult,
      epistemic,
      contextClassification,
      conflictsCount,
      diagnosticHints
    });

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

function _extractViolationStats(responseData) {
  const rawErrors = responseData.errors || responseData.evaluation?.errors || [];
  const rawWarnings = responseData.warnings || responseData.evaluation?.warnings || [];
  const missingDeps = responseData.missingDependencies || responseData.evaluation?.missingDependencies || [];
  const diagnosticHints = responseData.diagnosticHints || [];
  const conflictsCount = (responseData.conflicts?.length || 0) + (rawErrors.length > 0 ? rawErrors.length : 0);
  return { rawErrors, rawWarnings, missingDeps, diagnosticHints, conflictsCount };
}

function _resolveCounterfactualRepairProofs(responseData, context, acceptance) {
  let proofs = responseData.counterfactualRepairProofs || [];
  const isUnbuildable = responseData.customerDisposition === 'DELIVERY_BLOCKED_UNBUILDABLE' ||
    responseData.isMathClean === false || responseData.errors?.length > 0 || acceptance.isValid === false;
  if (proofs.length === 0 && isUnbuildable) {
    try {
      const { generateCounterfactualRepairProofs } = require('./counterfactual_repair.js');
      proofs = generateCounterfactualRepairProofs(responseData, context);
      responseData.counterfactualRepairProofs = proofs;
    } catch (_err) {
      proofs = [{
        issueType: 'REPAIR_EXECUTION_ERROR',
        rootCause: _err.message,
        requiredHardwareDeltas: [],
        requiredAction: { action: 'RESOLVE_SCOPED_CONSTRAINT', category: 'ENGINEERING_DIAGNOSTIC' },
        mathematicalProof: `Counterfactual repair engine encountered an execution error: ${_err.message}`,
        resultingStatus: 'ACTION_REQUIRED'
      }];
      responseData.counterfactualRepairProofs = proofs;
    }
  }
  return proofs;
}

function _reportedMathStatus(responseData, rawErrors) {
  const checks = Array.isArray(responseData.aspectChecks) ? responseData.aspectChecks : [];
  if (rawErrors.length || checks.some(check => check?.status === 'FAIL')) return false;
  return typeof responseData.isMathClean === 'boolean' ? responseData.isMathClean : null;
}

function _buildAnalysisPayload({
  effectiveTraceId,
  executionTimeMs,
  effectiveIntent,
  classification,
  contextClassification,
  reasoningNarrative,
  selfCorrectionTrail,
  counterfactualRepairProofs,
  epistemic,
  rawErrors,
  rawWarnings,
  missingDeps,
  conflictsCount,
  diagnosticHints,
  responseData,
  acceptance,
  feedbackResult
}) {
  return {
    analyzedAt: new Date().toISOString(),
    traceId: effectiveTraceId,
    executionTimeMs,
    intent: effectiveIntent,
    confidence: Number.isFinite(classification?.confidence) ? classification.confidence : null,
    intentRationale: classification.rationale || 'Canonical execution dispatched.',
    contextClassification,
    reasoningNarrative,
    selfCorrectionTrail,
    counterfactualRepairProofs,
    epistemicIntegrity: {
      ...epistemic,
      isMathClean: _reportedMathStatus(responseData, rawErrors),
      hasDiscrepancies: (responseData.opinionDiscrepancies?.length || 0) > 0 || (rawErrors.length > 0)
    },
    transparencyAudit: {
      physicalChecksEvaluated: _hasPhysicalChecks(responseData),
      conflictsDetectedCount: conflictsCount,
      missingDependenciesCount: missingDeps.length,
      diagnosticHintsAttachedCount: diagnosticHints.length,
      diagnosticHints: diagnosticHints.slice(0, 5),
      groundingSource: responseData.notebookLmStatus?.source || responseData.source || 'LOCAL_DETERMINISTIC_RULES'
    },
    acceptanceGate: {
      status: acceptance.status,
      isValid: acceptance.isValid,
      blockersCount: acceptance.blockersCount ?? (responseData.acceptanceGate ? rawErrors.length : null),
      warningsCount: acceptance.warningsCount ?? (responseData.acceptanceGate ? rawWarnings.length : null)
    },
    continuousLearningHook: feedbackResult
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
  const epistemic = determineEpistemicTier(responseData, classification, context);

  // 2. Extract violations, warnings, conflicts, and diagnostic hints
  const { rawErrors, rawWarnings, missingDeps, diagnosticHints, conflictsCount } = _extractViolationStats(responseData);

  // 3. Acceptance Gate State
  const acceptance = responseData.acceptanceGate || {
    isValid: null,
    status: 'NOT_EVALUATED'
  };

  // 4. Automated Feedback & Continuous Learning Reflection Hook
  const feedbackResult = _runContinuousLearningHook(context, responseData, missingDeps, effectiveTraceId);

  // 5. Context & Platform Classification
  const contextClassification = _determineContextClassification(queryText, responseData, context);

  // 6. Extract Self-Correction Trail
  const selfCorrectionTrail = _extractSelfCorrectionTrail(responseData);

  // 7. Counterfactual Repair Proofs (Requirement R2 / Feature 6 & Feature 8)
  const counterfactualRepairProofs = _resolveCounterfactualRepairProofs(responseData, context, acceptance);

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

  logger.info('REASONING_ANALYZER', `[REASONING] Trace ${effectiveTraceId} | Vendor: ${contextClassification.detectedVendor} | Domain: ${contextClassification.solutionDomain} | Platform: ${contextClassification.platform} (${contextClassification.generation}) | Epistemic: ${epistemic.tier} | Blocker(s): ${acceptance.blockersCount ?? 'UNKNOWN'} | Status: ${acceptance.status} | SelfCorrections: ${selfCorrectionTrail.length}`);

  // 9. Build Comprehensive Reasoning Analysis Payload
  const analysis = _buildAnalysisPayload({
    effectiveTraceId,
    executionTimeMs,
    effectiveIntent,
    classification,
    contextClassification,
    reasoningNarrative,
    selfCorrectionTrail,
    counterfactualRepairProofs,
    epistemic,
    rawErrors,
    rawWarnings,
    missingDeps,
    conflictsCount,
    diagnosticHints,
    responseData,
    acceptance,
    feedbackResult
  });

  try {
    const { runPostExecutionReflection } = require('../feedback/post_run_reflection.js');
    analysis.postRunReflection = runPostExecutionReflection({
      context,
      responseData,
      analysis,
      traceId: effectiveTraceId,
      options: context.reflectionOptions || {}
    });
  } catch (err) {
    analysis.postRunReflection = { status: 'REFLECTION_ERROR', error: err.message };
  }

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
