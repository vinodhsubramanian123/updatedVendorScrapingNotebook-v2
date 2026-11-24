'use strict';
/**
 * scripts/lib/boq/pipeline/eval_boq_stages.js — Physical Pre-Checks & Phase 1-6 Handlers
 */

const fs = require('fs');
const path = require('path');
const terminalOwner = require('../../lifecycle/canonical_terminal_owner.js');
const { evaluatePhysicalMath, formatNotebookQueryPayload } = require('../boq_evaluator.js');
const { applyConfigurationContext } = require('../configuration_context');
const { emitProgress } = require('../../system/progress.js');
const { optimizeForBudget } = require('../budget_optimizer.js');
const { candidateDelta, solutionFingerprint } = require('../solution_evidence');
const { loadActiveKnowledgeRules, recordRuleConsumption } = require('../../catalog/active_knowledge_router.js');
const { includeAvailabilityRecommendations } = require('../../conflict/strategy_synthesizer.js');
const logger = require('../../system/pipeline_logger.js');

// Ingest has already validated ownership and normalized quantities. Evaluate only
// its base configuration, then restore order scope through the shared contract.
function evaluateIngestedPhysicalContext(items, catalogData, chassisDir, configurationContext) {
  if (!configurationContext || configurationContext.ownershipEvidence === 'AMBIGUOUS_OWNERSHIP_RAW') {
    return evaluatePhysicalMath(items, catalogData, chassisDir);
  }
  const baseItems = configurationContext.items.filter(item => item.quantityScope !== 'global');
  const result = evaluatePhysicalMath(baseItems, catalogData, chassisDir, {
    baseConfigurationOnly: true,
    availabilityGlobalItems: configurationContext.items.filter(item => item.quantityScope === 'global')
  });
  return applyConfigurationContext(result, configurationContext);
}

function _attachPresalesLifecycleAdvisories(evalResults, items, chassisDir) {
  try {
    const { generatePresalesLifecycleAdvisories } = require('../../catalog/sku_versioning.js');
    const advisories = generatePresalesLifecycleAdvisories(items, chassisDir);
    evalResults.presalesLifecycleAdvisories = advisories;
    if (advisories && advisories.length > 0) {
      for (const adv of advisories) {
        evalResults.warnings.push(`[PRESALES_ADVISORY] ${adv.message}`);
      }
    }
  } catch {
    // Non-blocking presales advisory audit
  }
}

function _logAspectSummaryLines(evalResults) {
  console.log(`\n⚡ Phase 2: Modular ${evalResults.aspectChecks ? evalResults.aspectChecks.length : 'Multi'}-Aspect Physical Pre-Checks Completed:`);
  if (evalResults.aspectChecks && Array.isArray(evalResults.aspectChecks)) {
    evalResults.aspectChecks.forEach(asp => {
      const icon = asp.status === 'PASS' ? '✅ PASS' : (asp.status === 'FAIL' ? '❌ FAIL' : asp.status);
      console.log(`  ${asp.id}. ${asp.name.padEnd(25)} : ${icon} — ${asp.detail}`);
    });
    return;
  }
  console.log(`  1. Compute & Thermal : ${evalResults.cpuCount} CPUs (Max TDP: ${evalResults.maxCpuTdpWatts}W) | High-Perf Fans: ${evalResults.hasHighPerfFans ? '✅' : '❌'}`);
  console.log(`  2. Memory & Channels : ${evalResults.memoryCount} DIMMs (${evalResults.totalMemoryGb} GB Total)`);
  console.log(`  3. Storage & Tri-Mode: ${evalResults.driveCount} Drives | Controller Battery: ${evalResults.hasSmartBattery ? '✅' : '❌'}`);
  console.log(`  4. PCIe Expansion    : ${evalResults.requiredPcieCards || 0} Cards / ${evalResults.totalPcieSlotsAvailable || 2} Slots`);
  console.log(`  5. Networking & OCP  : OCP Adapter Present: ${evalResults.hasOcpAdapter ? '✅' : '❌'}`);
  console.log(`  6. Power & Ambient   : -48VDC PSU: ${evalResults.hasDcPowerSupply ? 'YES' : 'NO'} | Lug Kit: ${evalResults.hasDcLugKit ? '✅' : '❌'}`);
  console.log(`  7. Support Services  : Tech Care Support Present: ${evalResults.hasSupportService ? '✅' : '❌'}`);
}

function _logConflictGraphAndDiagnostics(evalResults, graph) {
  console.log(`\n🕸️ Phase 2.5: 5-Level Dependency Conflict Graph Validation:`);
  console.log(`  Chassis Variant    : ${graph.chassisInfo ? graph.chassisInfo.model : 'Unknown'}`);
  console.log(`  Rules Evaluated    : ${graph.totalRulesEvaluated || 0} across VENDOR, CHASSIS, CATEGORY, SUBCATEGORY, SKU levels`);
  console.log(`  Rules Source       : ${graph.rulesSource || 'N/A'} ${graph.isFallbackSource ? '(Fallback Safety Net)' : '(Dual Safety Net)'}`);
  if (graph.rulesSource === 'NONE') {
    console.log(`  Whole Solution     : ⚠️ NO_DATA (No rules evaluated)`);
  } else {
    console.log(`  Whole Solution     : ${graph.isWholeSolutionValid ? '✅ PASSED (No cross-aspect conflicts)' : '❌ CONFLICTS DETECTED'}`);
  }
  if (graph.resolvedFixes && graph.resolvedFixes.length > 0) {
    console.log(`  Cascading Fixes    : ${graph.resolvedFixes.length} fix(es) validated without downstream conflicts.`);
  }
  console.log(`\n  📊 Quantitative Confidence Score: ${evalResults.confidence.score} / 1.00`);
  console.log(JSON.stringify(evalResults, null, 2));
  console.log(`  ${evalResults.confidence.summary}`);

  if (evalResults.errors.length > 0) {
    console.log(`\n❌ CRITICAL PHYSICAL VIOLATIONS:`);
    evalResults.errors.forEach(e => console.log(`   - ${e}`));
  }
  if (evalResults.warnings.length > 0) {
    console.log(`\n⚠️ PHYSICAL WARNINGS:`);
    evalResults.warnings.forEach(w => console.log(`   - ${w}`));
  }
  if (graph.conflicts && graph.conflicts.length > 0) {
    const hints = graph.conflicts.filter(c => c.diagnosticHint).map(c => c.diagnosticHint);
    if (hints.length > 0) {
      evalResults.diagnosticHints = hints;
      console.log(`\n💡 HISTORICAL DIAGNOSTIC REFERENCES (${hints.length} known pattern(s) identified):`);
      hints.forEach(h => console.log(`   - ${h.referenceNotice || h.rule}`));
    }
  }
}

function executePhysicalPreChecks(items, catalogData, chassisDir, JSON_MODE, requirementResolution = null, configurationContext = null) {
  const tAspectStart = Date.now();
  const evalResults = evaluateIngestedPhysicalContext(items, catalogData, chassisDir, configurationContext);
  evalResults.catalogData = catalogData;
  const rulesPath = path.join(chassisDir, `${path.basename(chassisDir)}_Catalog_Rules.json`);
  evalResults.catalogRules = fs.existsSync(rulesPath) ? JSON.parse(fs.readFileSync(rulesPath, 'utf8')) : null;
  evalResults.requirementResolution = requirementResolution;
  if (requirementResolution?.requiresHumanClarification) {
    evalResults.confidence.isHitlTriggered = true;
    evalResults.confidence.score = Math.min(evalResults.confidence.score, 0.74);
    evalResults.confidence.confidenceReasons.push('[REQUIREMENT_AMBIGUITY] A part/category or attribute-only requirement needs human confirmation before solution learning.');
  }

  _attachPresalesLifecycleAdvisories(evalResults, items, chassisDir);

  const graph = evalResults.conflictGraph || {};
  const stage2AspectMathMs = Math.max(Date.now() - tAspectStart, 1);

  if (!JSON_MODE) {
    _logAspectSummaryLines(evalResults);
  }

  const queryPayload = formatNotebookQueryPayload(items, evalResults);
  evalResults.notebookPayload = queryPayload;

  if (!JSON_MODE) {
    _logConflictGraphAndDiagnostics(evalResults, graph);
  }

  return { evalResults, graph, queryPayload, stage2AspectMathMs };
}

function _findClicCorrectedCandidate(evalResults) {
  return evalResults.conflictGraph?.rankedSolutions?.find(
    candidate => candidate.portalValidationStatus === 'CLIC_ACCEPTED' && candidate.portalReceipt && candidate.physicalMathClean && candidate.removedSkus?.length
  ) || null;
}

function _isApplicableAspectPassing(aspect, correctedCandidate) {
  if (aspect.status === 'PASS' || aspect.status === 'NOT_APPLICABLE') return true;
  return Boolean(correctedCandidate && aspect.name === 'Bundled Optics Billing' && aspect.status === 'WARN');
}

function _logAspectPhaseChecklist(evalResults) {
  const aspectItems = (evalResults.aspectChecks || []).map(a => ({
    status: a.status || (a.checked ? 'PASS' : 'FAIL'),
    label: `${a.name || a.id}: ${a.detail || ''}`,
    formula: a.formula || a.equation || null,
    operands: a.operands || null
  }));
  logger.checklist(3, '7-Aspect Physical Pre-Flight Math', aspectItems);
}

function _recordAspectPhaseEvidence(evidenceLedger, evalResults, ingestCtx, options) {
  for (const dep of (evalResults.missingDependencies || [])) {
    evidenceLedger.recordActiveRuleReached({
      ruleId: dep.ruleId || 'PHYSICAL_ASPECT_DEP',
      ruleType: dep.category || 'MISSING_DEPENDENCY',
      chassis: path.basename(ingestCtx.chassisDir),
      affectedSku: dep.affectedSku || null,
      targetSku: dep.sku,
      reasoning: dep.reason || '',
      scopeTaxonomy: 'CHASSIS_SPECIFIC'
    });
  }
  const correctedCandidate = _findClicCorrectedCandidate(evalResults);
  const aspects = evalResults.aspectChecks || [];
  const applicableAspectsPassed = aspects.length > 0 && aspects.every(a => _isApplicableAspectPassing(a, correctedCandidate));
  const noMissingDeps = !evalResults.missingDependencies || evalResults.missingDependencies.length === 0;
  const aspectPhaseStatus = (evalResults.isMathClean === true && applicableAspectsPassed && noMissingDeps) ? 'PASSED' : 'ACTION_REQUIRED';

  evidenceLedger.completePhase(3, aspectPhaseStatus, {
    missingDependencies: evalResults.missingDependencies?.length || 0,
    aspectPassCount: aspects.filter(a => a.status === 'PASS').length,
    baselineWarningsResolvedByCandidate: correctedCandidate ? {
      rank: correctedCandidate.rank,
      removedSkus: correctedCandidate.removedSkus,
      receiptAt: correctedCandidate.portalReceipt.capturedAt
    } : null
  }, aspects);

  if (!options.JSON_MODE) {
    _logAspectPhaseChecklist(evalResults);
  }
}

function _recordCandidateValidationsEvidence(evidenceLedger, evalResults, ingestCtx) {
  const candidateValidations = (evalResults.conflictGraph?.rankedSolutions || []).map(candidate => ({
    rank: candidate.rank,
    name: candidate.name,
    rationale: candidate.reasoning,
    manifest: candidate.skuPartsList,
    delta: candidateDelta(ingestCtx.items, candidate),
    finalValidation: candidate.finalValidation,
    buildabilityStatus: candidate.buildabilityStatus
  }));
  evidenceLedger.recordCandidateAttempt({
    candidateValidations,
    manifestSha256: solutionFingerprint(evalResults),
    candidateGate: evalResults.adversarialGateResult
  });
}

function _recordGraphLearning(evidenceLedger, graph, activeRules) {
  const rulesById = new Map((activeRules?.allRules || []).map(rule => [rule.ruleId, rule]));
  const appliedEffects = (graph?.auditLog || [])
    .filter(entry => entry.level === 'LEARNED_DELTA' && entry.applied && rulesById.has(entry.ruleId))
    .map(entry => ({
      ruleId: entry.ruleId, sku: entry.skuTarget, action: entry.ruleType, effect: entry.status, reason: entry.details
    }));
  const consumption = recordRuleConsumption(activeRules, appliedEffects);
  for (const id of consumption.appliedRuleIds) evidenceLedger.recordActiveRuleReached(rulesById.get(id));
  return consumption;
}

function _sortAndSyncRecommendations(evalResults, ingestCtx) {
  if (!evalResults.conflictGraph?.recommendedSolutions) return;
  const ranked = evalResults.conflictGraph.rankedSolutions || [];
  const validCandidates = ranked
    .filter(c => c.physicalMathClean && c.isUniqueBom !== false && c.isParetoOptimal !== false);
  const closestUnits = Math.min(...validCandidates.map(c => c.customerDistance.changedUnits));
  const distanceWindow = Math.max(1, Math.ceil(ingestCtx.items.filter(it => it.quantityScope !== 'global').length * 0.15));
  const sortedValid = validCandidates
    .filter(c => c.customerDistance.changedUnits <= closestUnits + distanceWindow)
    .sort((a, b) =>
      (a.capabilityDowngradePenalty ?? 0) - (b.capabilityDowngradePenalty ?? 0) ||
      (a.architecturalDelta ?? Number.POSITIVE_INFINITY) - (b.architecturalDelta ?? Number.POSITIVE_INFINITY) ||
      a.customerDistance.changedLines - b.customerDistance.changedLines ||
      a.customerDistance.changedUnits - b.customerDistance.changedUnits ||
      (a.strategyRank ?? a.rank) - (b.strategyRank ?? b.rank)
    );
  const topRecs = includeAvailabilityRecommendations(sortedValid, ranked).map((candidate, index) => ({
    ...candidate,
    strategyRank: candidate.strategyRank ?? candidate.rank,
    rank: index + 1,
    name: candidate.name.replace(/^Rank \d+:/, `Rank ${index + 1}:`)
  }));
  evalResults.conflictGraph.recommendedSolutions = topRecs;

  const recFingerprints = new Set(topRecs.map(c => c.bomFingerprint || c.strategyId || c.name));
  const remaining = (evalResults.conflictGraph.rankedSolutions || [])
    .filter(c => !recFingerprints.has(c.bomFingerprint || c.strategyId || c.name));
  evalResults.conflictGraph.rankedSolutions = [...topRecs, ...remaining]
    .map((c, idx) => ({ ...c, strategyRank: c.strategyRank ?? c.rank, rank: idx + 1 }));
}

function _revalidateAndRankCandidates(evalResults, ingestCtx, evidenceLedger) {
  for (const candidate of evalResults.conflictGraph?.rankedSolutions || []) {
    const perNodeParts = (candidate.skuPartsList || []).filter(item => item.quantityScope !== 'global');
    const checked = evaluatePhysicalMath(perNodeParts, ingestCtx.catalogData, ingestCtx.chassisDir, { skipSynthesis: true });
    candidate.finalValidation = {
      aspectChecks: checked.aspectChecks || [],
      errors: checked.errors || [],
      missingDependencies: checked.missingDependencies || [],
      graph: checked.conflictGraph,
      checkedAt: new Date().toISOString()
    };
    candidate.physicalMathClean = (candidate.skuPartsList || []).length > 0 &&
      checked.isMathClean === true &&
      checked.conflictGraph?.isWholeSolutionValid === true &&
      !(checked.missingDependencies || []).length;
    candidate.buildabilityStatus = candidate.physicalMathClean ? 'LOCAL_RULE_CHECKED' : 'UNRESOLVED_PHYSICAL_GAPS';
    const delta = candidateDelta(ingestCtx.items, candidate);
    candidate.customerDistance = {
      changedLines: delta.length,
      changedUnits: delta.reduce((sum, row) => sum + Math.abs(row.after - row.before), 0),
      metric: 'SKU quantity delta; functional preservation requires independent candidate review'
    };
  }
  const validatedCandidates = evalResults.conflictGraph?.rankedSolutions || [];
  const publishedCandidates = validatedCandidates.filter(c => !c.availabilityPreference || c.physicalMathClean);
  if (evalResults.conflictGraph && publishedCandidates.length < validatedCandidates.length) {
    const retained = new Set(publishedCandidates.map(candidate => candidate.bomFingerprint));
    for (const candidate of publishedCandidates) {
      if (candidate.fastShipAlternative && !retained.has(candidate.fastShipAlternative.bomFingerprint)) {
        candidate.fastShipAlternative = null;
        candidate.availabilityTradeoffs = [];
        candidate.tradeoffMetrics.fastShipAlternativeAvailable = false;
        candidate.tradeoffMetrics.deliveryDaysSaved = null;
      }
    }
    evalResults.conflictGraph.rankedSolutions = publishedCandidates;
  }
  evalResults.adversarialGateResult = {
    kind: 'DETERMINISTIC_FINAL_CANDIDATE_REVALIDATION',
    manifestSha256: solutionFingerprint(evalResults),
    candidateResults: validatedCandidates.map(c => ({ rank: c.rank, passed: c.physicalMathClean, validation: c.finalValidation })),
    passed: publishedCandidates.length > 0 && publishedCandidates.every(c => c.physicalMathClean)
  };
  evalResults.adversarialGatePassed = evalResults.adversarialGateResult.passed;
  if (typeof evidenceLedger.recordCandidateAttempt === 'function') {
    evidenceLedger.recordCandidateAttempt({
      kind: 'DETERMINISTIC_FINAL_CANDIDATE_REVALIDATION',
      manifestSha256: solutionFingerprint(evalResults),
      passed: evalResults.adversarialGateResult.passed
    });
  }
  _sortAndSyncRecommendations(evalResults, ingestCtx);
  _recordCandidateValidationsEvidence(evidenceLedger, evalResults, ingestCtx);
}

async function runBoqIngestionPhase(ctx, options, evidenceLedger, ingestFn) {
  emitProgress(1, 10, 'Reading the BOQ', 'in_progress', 'Parsing intake and workload requirements.', { stage: 'LOAD' });
  evidenceLedger.startPhase(1, 'Intake, Ingestion & CTO Normalization', { boqFile: options.inputFile || options.BOQ_FILE });
  const ingestCtx = await ingestFn(options);
  emitProgress(2, 10, 'Resolving the platform', 'in_progress', `Identified platform: ${path.basename(ingestCtx.chassisDir || 'Unknown')} (${ingestCtx.items.length} items parsed)`, { stage: 'CLEANING' });
  if (ingestCtx.chassisDir) {
    evidenceLedger.updateTargetChassis(path.basename(ingestCtx.chassisDir), ingestCtx.chassisDir);
    evidenceLedger.recordArtifact('CATALOG', path.join(ingestCtx.chassisDir, `${path.basename(ingestCtx.chassisDir)}_Catalog.json`));
    evidenceLedger.recordArtifact('CATALOG_RULES', path.join(ingestCtx.chassisDir, `${path.basename(ingestCtx.chassisDir)}_Catalog_Rules.json`));
  }
  evidenceLedger.customerInput.totalRequestedLines = ingestCtx.items.length;
  evidenceLedger.customerInput.serverCount = options.serverCount !== undefined ? options.serverCount : (ingestCtx.serverCount || 1);
  evidenceLedger.sharedState.nodeMultiplier = options.serverCount !== undefined ? options.serverCount : (ingestCtx.serverCount || 1);
  if (options.parentRunId) evidenceLedger.sharedState.parentRunId = options.parentRunId;
  if (options.candidateDigest) evidenceLedger.sharedState.candidateDigest = options.candidateDigest;
  ingestCtx.items.forEach(item => evidenceLedger.recordSkuAudit(item.sku, 'NORMALIZED_INPUT', 'Parsed customer input; this record does not certify compatibility.', null, item.category, { quantity: item.quantity }));
  evidenceLedger.completePhase(1, 'PASSED', {
    itemsCount: ingestCtx.items.length,
    chassisDir: ingestCtx.chassisDir,
    nodeMultiplier: ingestCtx.serverCount || 1,
    chassisSelection: ingestCtx.chassisDetection,
    ocr: ingestCtx.ocrMetadata,
    catalogAudit: ingestCtx.catalogAudit
  });
  ctx.ingestCtx = ingestCtx;
  return {
    status: 'PASSED',
    summary: { itemsCount: ingestCtx.items.length, chassisDir: ingestCtx.chassisDir },
    checks: [
      { status: 'PASS', label: `BOQ parsed successfully (${ingestCtx.items.length} hardware items)` },
      { status: !ingestCtx.chassisDetection?.unknown ? 'PASS' : 'WARN', label: `Chassis identified: ${path.basename(ingestCtx.chassisDir || 'Unknown')}` },
      { status: 'PASS', label: `CTO multiplier normalized: ${ingestCtx.serverCount || 1} node(s)` }
    ]
  };
}

async function runBoqFingerprintingPhase(ctx, _options, evidenceLedger) {
  emitProgress(3, 10, 'Loading catalog rules', 'in_progress', 'Loading hardware constraints for the selected product.', { stage: 'VALIDATION' });
  evidenceLedger.startPhase(2, 'Active Knowledge Routing & Discovery', { chassis: path.basename(ctx.ingestCtx.chassisDir) });
  const activeRules = loadActiveKnowledgeRules(path.basename(ctx.ingestCtx.chassisDir), ctx.ingestCtx.chassisDir);
  evidenceLedger.completePhase(2, 'PASSED', {
    totalRulesAvailable: activeRules.allRules.length,
    availableRuleIds: activeRules.allRules.map(r => r.ruleId || r.deltaId),
    modernizationsCount: activeRules.generationalModernizations.length,
    substitutionsCount: activeRules.substitutions.length,
    dependenciesCount: activeRules.mandatoryDependencies.length
  });
  ctx.activeRules = activeRules;
  return {
    status: 'PASSED',
    summary: { totalRulesAvailable: activeRules.allRules.length },
    checks: [
      { status: 'PASS', label: `Catalog rules loaded: ${activeRules.allRules.length} rules active` },
      { status: 'PASS', label: `Generational modernizations available: ${activeRules.generationalModernizations.length}` },
      { status: 'PASS', label: `Mandatory hardware dependencies: ${activeRules.mandatoryDependencies.length}` }
    ]
  };
}

async function runBoqDomainAspectsPhase(ctx, options, evidenceLedger) {
  emitProgress(4, 10, 'Checking hardware constraints', 'in_progress', '', { stage: 'VALIDATION' });
  evidenceLedger.startPhase(3, '7-Aspect Physical Pre-Flight Math', { itemCount: ctx.ingestCtx.items.length });
  const { evalResults, graph, queryPayload, stage2AspectMathMs } = executePhysicalPreChecks(
    ctx.ingestCtx.items, ctx.ingestCtx.catalogData, ctx.ingestCtx.chassisDir, options.JSON_MODE, ctx.ingestCtx.requirementResolution, ctx.ingestCtx.configurationContext
  );
  evalResults.offlineMode = Boolean(options.OFFLINE_MODE || options.effectivePolicy?.offline);
  if (options.effectivePolicy) evalResults.effectivePolicy = options.effectivePolicy;
  ctx.ingestCtx.items = evalResults.items || ctx.ingestCtx.items;
  ctx.evalResults = evalResults;
  ctx.graph = graph;
  ctx.queryPayload = queryPayload;
  ctx.stage2AspectMathMs = stage2AspectMathMs;
  _recordAspectPhaseEvidence(evidenceLedger, evalResults, ctx.ingestCtx, options);
  const aspectPhaseStatus = terminalOwner.requestedPhaseStatus(evidenceLedger, 3,
    evidenceLedger.phases?.phase_3?.status || (evalResults.isMathClean ? 'PASSED' : 'ACTION_REQUIRED'));
  return {
    status: aspectPhaseStatus,
    summary: { missingDependencies: evalResults.missingDependencies?.length || 0 },
    checks: (evalResults.aspectChecks || []).map(a => ({ status: a.status || (a.checked ? 'PASS' : 'FAIL'), label: `${a.name || a.id}: ${a.detail || ''}` }))
  };
}

async function runBoqConflictGraphPhase(ctx, _options, evidenceLedger) {
  emitProgress(5, 10, 'Checking component conflicts', 'in_progress', '', { stage: 'VALIDATION' });
  evidenceLedger.startPhase(4, 'Conflict Graph & Contested Resource Arbitration', {});
  const phase4Passed = ctx.graph?.isWholeSolutionValid === true;
  evidenceLedger.completePhase(4, phase4Passed ? 'PASSED' : 'ACTION_REQUIRED', {
    conflicts: ctx.graph?.conflicts?.length || 0,
    hasContentions: Boolean(ctx.graph?.arbitrationResults?.hasContentions),
    ruleConsumption: _recordGraphLearning(evidenceLedger, ctx.graph, ctx.activeRules)
  });
  return {
    status: phase4Passed ? 'PASSED' : 'ACTION_REQUIRED',
    summary: { conflicts: ctx.graph?.conflicts?.length || 0 },
    checks: [
      { status: phase4Passed ? 'PASS' : 'WARN', label: `Cross-aspect conflict graph: ${ctx.graph?.conflicts?.length || 0} conflict(s)` },
      { status: !ctx.graph?.arbitrationResults?.hasContentions ? 'PASS' : 'WARN', label: `Contested slot arbitration: ${ctx.graph?.arbitrationResults?.hasContentions ? 'Contentions resolved' : 'Clean slot allocation'}` }
    ]
  };
}

async function runBoqModernizationPhase(ctx, _options, evidenceLedger) {
  emitProgress(6, 10, 'Reviewing alternative configurations', 'in_progress', '', { stage: 'RANKING' });
  evidenceLedger.startPhase(5, 'Generational Modernization & Least-Delta Combinator', {});
  const modCount = ctx.activeRules?.generationalModernizations ? ctx.activeRules.generationalModernizations.length : 0;
  const hasModernizations = Array.isArray(ctx.graph?.modernizations) && ctx.graph.modernizations.length > 0;
  const hasLeastDelta = Boolean(ctx.graph?.leastDeltaCandidate || ctx.graph?.tradeoffMatrix?.trigger);
  const phase5Status = (modCount > 0 || hasModernizations || hasLeastDelta) ? 'PASSED' : 'SKIPPED';
  const phase5Summary = {
    activeModernizationCount: modCount,
    hasModernizations,
    hasLeastDelta,
    skipReason: phase5Status === 'SKIPPED' ? 'No generational modernizations or least-delta alternatives required for this clean BOM' : undefined,
    policyCode: phase5Status === 'SKIPPED' ? 'INV-105_NO_MODERNIZATION_REQUIRED' : undefined
  };
  evidenceLedger.completePhase(5, phase5Status, phase5Summary);
  return {
    status: phase5Status,
    summary: phase5Summary,
    checks: [
      { status: phase5Status === 'PASSED' ? 'PASS' : 'SKIP', label: `Platform modernization evaluated (${modCount} rules checked)` },
      { status: hasLeastDelta ? 'PASS' : 'SKIP', label: hasLeastDelta ? 'Least-delta minimal mutation alternative synthesized' : 'No troublesome SKU mutations needed' }
    ]
  };
}

async function runBoqStrategySynthesisPhase(ctx, options, evidenceLedger) {
  evidenceLedger.startPhase(6, '5-Tier Strategy Matrix Synthesis', {});
  const tMatrixStart = Date.now();
  emitProgress(7, 10, 'Checking budget and pricing', 'in_progress', 'Evaluating cost tradeoffs and price availability.', { stage: 'RANKING' });
  const budgetOpt = optimizeForBudget(ctx.ingestCtx.items, ctx.evalResults, options.targetBudgetUsd, ctx.ingestCtx.catalogData, ctx.ingestCtx.chassisDir);
  ctx.evalResults.budgetOptimization = budgetOpt;
  ctx.budgetOpt = budgetOpt;
  ctx.stage5MatrixMs = Math.max(Date.now() - tMatrixStart, 1);
  const confidenceScore = ctx.evalResults.confidence?.score ?? 1.0;
  const isLowConfidence = confidenceScore < 0.55 || Boolean(ctx.evalResults.confidence?.isHitlTriggered);
  if (isLowConfidence) {
    for (const candidate of ctx.evalResults.conflictGraph?.rankedSolutions || []) {
      candidate.advisoryStatus = 'LOW_CONFIDENCE_ADVISORY';
    }
  }
  const ranks = ctx.evalResults.conflictGraph?.rankedSolutions || [];
  const phase6Passed = !isLowConfidence && ranks.length > 0;
  evidenceLedger.completePhase(6, phase6Passed ? 'PASSED' : 'ACTION_REQUIRED', {
    ranksProduced: ranks.length,
    budgetCapEx: budgetOpt?.hasZeroPriceSkus ? null : budgetOpt?.mandatoryBomCostUsd ?? null,
    confidenceScore,
    isLowConfidence
  });
  return {
    status: phase6Passed ? 'PASSED' : 'ACTION_REQUIRED',
    summary: { ranksProduced: ranks.length, isLowConfidence },
    checks: [
      { status: ranks.length > 0 ? 'PASS' : 'WARN', label: `Strategy tiers synthesized: ${ranks.length} candidate solutions` },
      { status: !isLowConfidence ? 'PASS' : 'WARN', label: `Confidence evaluation score: ${(confidenceScore * 100).toFixed(1)}%` },
      { status: budgetOpt?.hasZeroPriceSkus ? 'WARN' : 'PASS', label: `Order-level ${budgetOpt?.hasZeroPriceSkus ? 'known-price subtotal (INCOMPLETE)' : 'CapEx'}: ${(budgetOpt?.mandatoryBomCostUsd || 0).toLocaleString()} USD` }
    ]
  };
}

module.exports = {
  executePhysicalPreChecks,
  _revalidateAndRankCandidates,
  runBoqIngestionPhase,
  runBoqFingerprintingPhase,
  runBoqDomainAspectsPhase,
  runBoqConflictGraphPhase,
  runBoqModernizationPhase,
  runBoqStrategySynthesisPhase
};
