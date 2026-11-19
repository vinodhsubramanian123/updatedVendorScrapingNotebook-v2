#!/usr/bin/env node
'use strict';
/**
 * scripts/maintenance/evaluate_solution_intelligence_quality.js
 *
 * SI-10 Engineering Quality Evaluation Runner (dev vs held_out scenario families):
 * - Runs all 24 scenario families (48 independently adjudicated cases across 5 matrix dimensions)
 * - Executes canonical SI-01..SI-09 modules directly without mutating repo fixtures
 * - Computes all 10 required SI-10 metrics with strict null on zero denominators
 * - Saves versioned receipt to outputs/history/solution_intelligence/si10_quality_evaluation_receipt.json ONLY on --save / options.savePath
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const { safeWriteJsonAtomic } = require('../lib/system/fs_compat.js');
const { classifyQueryIntent } = require('../evaluators/route_query.js');
const { extractRequirementRecords } = require('../lib/boq/requirements/requirement_records.js');
const { evaluateCandidateRequirementCoverage } = require('../lib/boq/requirements/coverage.js');
const claimRecords = require('../lib/boq/evidence/claim_records.js');
const { adjudicateSolutionClaims } = require('../lib/boq/evidence/source_adjudicator.js');
const { diagnoseInfeasibility, runBoundedFeasibilitySearch } = require('../lib/conflict/constraints/conflict_explanations.js');
const { executeVerifiedRepairTransaction } = require('../lib/conflict/repair_transactions.js');
const { executeCompoundWorkflow } = require('../lib/boq/compound_execution.js');
const { evaluateWorkloadSizingPilot } = require('../lib/conflict/sizing/workload_demand.js');
const { computeParetoFrontier, rankQualifiedCandidatesDeterministically } = require('../lib/conflict/sizing/pareto_ranker.js');
const {
  projectCustomerDecision,
  buildSolutionIntelligenceEnvelope,
  isStrictDocumentReviewVerified
} = require('../lib/boq/decision_projection.js');
const { verifyPrePresentationAcceptance } = require('../lib/boq/bom_verifier.js');
const { generateMarkdownReport } = require('../lib/boq/eval_output_serializer.js');
const { generateMultiRankSolutionWorkbook, generateRankedPortalWorkbook } = require('../lib/boq/generate_boq_xlsx.js');
const mcpServer = require('../services/mcp_server.js');
const { deliveryFingerprint } = require('../lib/boq/solution_evidence.js');
const { issueDeliveryAuthorization, verifyDeliveryAuthorization } = require('../lib/contracts/workflow_contract.js');
const depIndex = require('../lib/boq/evidence/dependency_index.js');
const { loadActiveKnowledgeRules, recordRuleConsumption } = require('../lib/catalog/active_knowledge_router.js');
const { preservePrimaryErrorOnReflectionFailure } = require('../lib/feedback/quarantined_deltas.js');

const ROOT = path.resolve(__dirname, '..', '..');
const FIXTURE_PATH = path.join(ROOT, 'tests', 'fixtures', 'solution_intelligence', 'scenario_families.js');
const SI00_BASELINE_PATH = path.join(ROOT, 'outputs', 'history', 'solution_intelligence', 'si00_baseline_receipt.json');
const DEFAULT_RECEIPT_PATH = path.join(ROOT, 'outputs', 'history', 'solution_intelligence', 'si10_quality_evaluation_receipt.json');
const SCHEMA_VERSION = '1.0';

function _sha256File(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function _ratioOrNull(num, den) {
  if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return null;
  return Number((num / den).toFixed(6));
}

function _matchesExact(actual, expectedVal) {
  return expectedVal === undefined || actual === expectedVal;
}

function _matchesMin(actual, minVal) {
  return minVal === undefined || actual >= minVal;
}

function _matchesMax(actual, maxVal) {
  return maxVal === undefined || actual <= maxVal;
}

function _matchesJson(actual, expectedVal) {
  return expectedVal === undefined || JSON.stringify(actual) === JSON.stringify(expectedVal);
}

function _buildEvidenceFromSpec(item, context = {}) {
  const base = {
    sourceId: item.sourceId,
    scope: item.scope,
    passageText: item.passageText,
    contentSha256: item.contentSha256,
    stance: item.stance || 'SUPPORTING',
    isEphemeral: item.isEphemeral === true
  };
  const builders = {
    OFFICIAL_DOC: () => claimRecords.createOfficialDocumentPassageEvidence(base),
    DETERMINISTIC: () => claimRecords.createDeterministicCalculationEvidence(base),
    MODEL_PROPOSAL: () => claimRecords.createModelProposalEvidence(base),
    UNTRUSTED: () => claimRecords.createUntrustedInputEvidence(base)
  };
  return builders[item.kind] ? builders[item.kind]() : claimRecords.createCatalogObservationEvidence({ ...base, inventoryStatus: context.inventoryStatus });
}

function _evalRouterTrack(scenario) {
  const { input, expected } = scenario;
  const classified = classifyQueryIntent(input.query, input.context || {});
  let emptyOk = true;
  if (input.emptyProjectionCheck) {
    const emptyProj = projectCustomerDecision(null);
    emptyOk = emptyProj.outcome.disposition === expected.emptyDisposition &&
      emptyProj.evidenceStates.liveVendorAcceptance === expected.portalStatus &&
      !emptyProj.outcome.isBuildable;
  }
  const passed = classified.intent === expected.intent && emptyOk;
  const falseAcc = !passed && scenario.criticalSafetyGate ? 1 : 0;
  return {
    passed,
    observed: { intent: classified.intent, emptyOk },
    clarificationStats: { criticalAmbiguitiesCaught: 0, unnecessaryClarifications: 0, safeAbstentions: Number(emptyOk), avoidableIncompleteness: Number(!passed) },
    safetyStats: { criticalChecked: Number(Boolean(scenario.criticalSafetyGate)), falseAcceptance: falseAcc }
  };
}

function _countReqDispositions(accounting, coverage) {
  const disp = coverage.dispositions;
  const isHard = d => d.hardness !== 'PREFERENCE';
  return {
    totalClauses: accounting.totalClauses,
    accountedClauses: disp.length,
    satisfiedHard: disp.filter(d => isHard(d) && d.disposition === 'SATISFIED').length,
    applicableHard: disp.filter(d => isHard(d) && d.disposition !== 'NOT_APPLICABLE').length,
    violatedHard: disp.filter(d => isHard(d) && d.disposition === 'VIOLATED').length,
    unresolvedHard: disp.filter(d => isHard(d) && d.disposition === 'UNRESOLVED').length
  };
}

function _evalRequirementCoverageScenario(scenario) {
  const { input, expected } = scenario;
  const accounting = extractRequirementRecords(input.requirementsText);
  const coverage = evaluateCandidateRequirementCoverage(input.candidate, accounting, { baselineItems: input.baselineItems });
  const c = _countReqDispositions(accounting, coverage);
  const checks = [
    c.totalClauses === expected.totalClauses,
    c.accountedClauses === expected.accountedClauses,
    _matchesExact(coverage.blocksPositiveRecommendation, expected.blocksPositive),
    _matchesMin(c.violatedHard, expected.minViolatedHard),
    _matchesMin(c.unresolvedHard, expected.unresolvedHardMin),
    _matchesExact(c.violatedHard, expected.violatedHard),
    _matchesExact(accounting.uninterpretedCount, expected.uninterpretedCount)
  ];
  const passed = checks.every(Boolean);
  const expectsBlock = Boolean(expected.blocksPositive);
  const actualBlocked = coverage.blocksPositiveRecommendation === true;
  const falseAcc = scenario.criticalSafetyGate && expectsBlock && !actualBlocked ? 1 : 0;
  const satisfiedHard = !actualBlocked ? c.satisfiedHard : 0;
  const applicableHard = !actualBlocked ? c.applicableHard : 0;
  return {
    passed,
    observed: { ...c, blocksPositiveRecommendation: coverage.blocksPositiveRecommendation },
    requirementStats: { accountedClauses: c.accountedClauses, adjudicatedClauses: c.totalClauses, satisfiedHard, applicableHard },
    constraintStats: {
      tp: Number(expectsBlock && actualBlocked), fp: Number(!expectsBlock && actualBlocked),
      tn: Number(!expectsBlock && !actualBlocked), fn: Number(expectsBlock && !actualBlocked)
    },
    clarificationStats: {
      criticalAmbiguitiesCaught: Number(accounting.clarificationQuestions.length > 0),
      unnecessaryClarifications: Number(expected.blocksPositive === false && accounting.clarificationQuestions.length > 0),
      safeAbstentions: Number(expectsBlock && actualBlocked),
      avoidableIncompleteness: Number(expected.blocksPositive === false && actualBlocked)
    },
    safetyStats: { criticalChecked: Number(Boolean(scenario.criticalSafetyGate)), falseAcceptance: falseAcc }
  };
}

function _evalRequirementParseScenario(scenario) {
  const { input, expected } = scenario;
  const acc = extractRequirementRecords(input.requirementsText);
  const presentMetrics = new Set(acc.records.flatMap(r => r.extractedMetrics.map(m => m.metric)));
  const hasAll = (expected.mustContainMetrics || []).every(m => presentMetrics.has(m));
  const hasNoneForbidden = (expected.mustNotContainMetrics || []).every(m => !presentMetrics.has(m));
  const hasAmbiguity = acc.ambiguityCount > 0;
  const passed = [
    hasAll, hasNoneForbidden,
    _matchesExact(hasAmbiguity, expected.hasBlockingAmbiguity),
    _matchesExact(acc.uninterpretedCount, expected.uninterpretedCount),
    _matchesMin(acc.ambiguityCount, expected.minAmbiguities),
    _matchesMin(acc.clarificationQuestions.length, expected.minClarificationQuestions)
  ].every(Boolean);
  const falseAcc = !passed && scenario.criticalSafetyGate ? 1 : 0;
  return {
    passed,
    observed: { metrics: [...presentMetrics], ambiguityCount: acc.ambiguityCount, clarificationCount: acc.clarificationQuestions.length },
    requirementStats: { accountedClauses: acc.records.length, adjudicatedClauses: acc.totalClauses, satisfiedHard: 0, applicableHard: 0 },
    clarificationStats: {
      criticalAmbiguitiesCaught: Number(Boolean(expected.hasBlockingAmbiguity && hasAmbiguity)),
      unnecessaryClarifications: Number(!expected.hasBlockingAmbiguity && acc.clarificationQuestions.length > 0),
      safeAbstentions: 0, avoidableIncompleteness: 0
    },
    safetyStats: { criticalChecked: Number(Boolean(scenario.criticalSafetyGate)), falseAcceptance: falseAcc }
  };
}

function _evalWorkloadSizingScenario(scenario) {
  const { input, expected } = scenario;
  const res = evaluateWorkloadSizingPilot(input.demand, input.candidate);
  const missingOrUnprofiled = res.missingCriticalInputs.length > 0 || res.pilotCoverage !== 'PILOT_SUPPORTED';
  const passed = [
    res.isQualified === expected.isQualified,
    res.extrapolationRefused === expected.extrapolationRefused,
    _matchesExact(res.sizingStatus, expected.sizingStatus),
    _matchesExact(missingOrUnprofiled, expected.hasMissingInputOrUnprofiled)
  ].every(Boolean);
  const expectsReject = expected.isQualified === false;
  const actualReject = res.isQualified === false;
  return {
    passed,
    observed: { sizingStatus: res.sizingStatus, isQualified: res.isQualified, extrapolationRefused: res.extrapolationRefused },
    clarificationStats: {
      criticalAmbiguitiesCaught: Number(missingOrUnprofiled),
      unnecessaryClarifications: 0,
      safeAbstentions: Number(expectsReject && actualReject),
      avoidableIncompleteness: Number(!expectsReject && actualReject)
    },
    safetyStats: { criticalChecked: Number(Boolean(scenario.criticalSafetyGate)), falseAcceptance: Number(expectsReject && !actualReject) }
  };
}

async function _evalCompoundWorkflowScenario(scenario) {
  const { input, expected } = scenario;
  let signal = null;
  if (input.preAbortSignal) {
    const ac = new AbortController();
    ac.abort();
    signal = ac.signal;
  }
  const out = await executeCompoundWorkflow(input.query, input.context, { handlers: input.handlers || {}, signal });
  const ledger = Object.values(out.invocationLedger || {});
  const invokedOps = ledger.filter(e => e.invocations > 0).map(e => e.operation);
  const maxInv = ledger.reduce((m, e) => Math.max(m, e.invocations || 0), 0);
  const excludedOk = !expected.mustExcludeOp || (out.plan.excludedOperations || []).includes(expected.mustExcludeOp);

  const passed = [
    out.status === expected.status,
    !expected.blockerCodePresent || Boolean(out.blockerCode),
    _matchesJson(invokedOps, expected.expectedSteps),
    excludedOk,
    _matchesMax(maxInv, expected.maxStepInvocations)
  ].every(Boolean);
  const falseAcc = Number(Boolean(scenario.criticalSafetyGate) && expected.status === 'BLOCKED' && out.status === 'COMPLETED');
  return {
    passed,
    observed: { status: out.status, blockerCode: out.blockerCode, invokedOps, cancelled: out.cancelled },
    recoveryStats: { terminalRecoveryOk: Number(passed), terminalRecoveryTotal: 1, retractionInvalidationOk: 0, retractionInvalidationTotal: 0, freshProcessAppliedRuleEvidence: 0 },
    safetyStats: { criticalChecked: Number(Boolean(scenario.criticalSafetyGate)), falseAcceptance: falseAcc }
  };
}

function _checkAdjudicationGate(input, adj) {
  const gate = verifyPrePresentationAcceptance({
    chassis: input.product,
    aspectChecksCompleted: true,
    aspectChecks: Array.from({ length: 7 }, (_, i) => ({ id: i + 1, status: 'PASS', detail: 'OK' })),
    items: [{ sku: 'P73282-B21', qty: 1 }],
    claimAdjudication: adj
  }, 'BOQ_EVALUATION');
  return gate.isValid === false;
}

function _evalClaimAdjudicationScenario(scenario) {
  const { input, expected } = scenario;
  const ctx = { product: input.product, generation: input.generation, ephemeralSourceId: input.ephemeralSourceId, inventoryStatus: input.inventoryStatus };
  const claim = claimRecords.createClaimRecord(input.claim);
  const evidence = (input.evidence || []).map(e => _buildEvidenceFromSpec(e, ctx));
  const adj = adjudicateSolutionClaims([claim], evidence, ctx);
  const gateOk = expected.bomVerifierBlocked ? _checkAdjudicationGate(input, adj) : true;

  const passed = [
    adj.overallStatus === expected.overallStatus,
    _matchesMin(adj.counts.rejectedEvidence, expected.rejectedEvidenceMin),
    _matchesMin(adj.counts.contradicted, expected.contradictionCountMin),
    gateOk
  ].every(Boolean);
  const unsupportedPos = Number(adj.overallStatus === 'SUPPORTED' && Boolean(expected.blocksPositive));
  return {
    passed,
    observed: { overallStatus: adj.overallStatus, counts: adj.counts, gateOk },
    claimStats: {
      materialCount: 1,
      supportedCount: Number(adj.overallStatus === 'SUPPORTED'),
      contradictionCount: adj.counts.contradicted,
      unknownCount: adj.counts.unknown,
      rejectedEvidenceCount: adj.counts.rejectedEvidence,
      unsupportedPositiveAcceptance: unsupportedPos
    },
    safetyStats: { criticalChecked: Number(Boolean(scenario.criticalSafetyGate)), falseAcceptance: Number(!gateOk || unsupportedPos > 0) }
  };
}

function _evalInfeasibilityDiagnosisScenario(scenario) {
  const { input, expected } = scenario;
  const badSet = new Set(input.incompatibleIds || []);
  const checkFeasibleSubsetFn = input.incompatibleIds ? (subset => subset.every(c => !badSet.has(c.constraintId))) : undefined;
  const diag = diagnoseInfeasibility(input.constraints, { product: input.product, checkFeasibleSubsetFn });
  const subsetIds = diag.minimalConflictingSet?.constraintIds || [];

  const passed = [
    diag.outcome === expected.outcome,
    diag.universalImpossibilityClaimed === expected.universalImpossibilityClaimed,
    _matchesExact(diag.minimalConflictingSet.isIrreducible, expected.isIrreducible),
    _matchesJson(subsetIds, expected.minimalSubset),
    _matchesJson(diag.notEvaluatedDomains, expected.notEvaluatedDomains),
    _matchesJson(diag.missingInputs, expected.missingInputs)
  ].every(Boolean);
  const expectsBlocked = expected.outcome !== 'FEASIBLE';
  return {
    passed,
    observed: { outcome: diag.outcome, subsetIds, notEvaluatedDomains: diag.notEvaluatedDomains, missingInputs: diag.missingInputs },
    constraintStats: {
      tp: Number(expectsBlocked && diag.outcome !== 'FEASIBLE'),
      fp: Number(!expectsBlocked && diag.outcome !== 'FEASIBLE'),
      tn: Number(!expectsBlocked && diag.outcome === 'FEASIBLE'),
      fn: Number(expectsBlocked && diag.outcome === 'FEASIBLE')
    },
    safetyStats: { criticalChecked: Number(Boolean(scenario.criticalSafetyGate)), falseAcceptance: Number(expectsBlocked && diag.outcome === 'FEASIBLE') }
  };
}

function _evalBoundedSearchScenario(scenario) {
  const { input, expected } = scenario;
  const out = runBoundedFeasibilitySearch({
    candidates: input.candidates,
    budget: input.budget,
    evaluateCandidateFn: c => ({ isValid: Boolean(c.valid), hasUnknown: Boolean(c.hasUnknown), score: c.score })
  });
  const bestId = out.bestValidatedCandidate?.candidate?.id || null;
  const passed = out.budget.exhausted === expected.exhausted &&
    out.budget.candidatesEvaluated === expected.candidatesEvaluated &&
    bestId === expected.bestCandidateId &&
    out.universalImpossibilityClaimed === expected.universalImpossibilityClaimed;
  const falseAcc = !passed && scenario.criticalSafetyGate ? 1 : 0;
  return {
    passed,
    observed: { exhausted: out.budget.exhausted, candidatesEvaluated: out.budget.candidatesEvaluated, bestId },
    repairStats: { attempted: 0, rejected: 0, exhausted: Number(out.budget.exhausted), regressions: 0 },
    safetyStats: { criticalChecked: Number(Boolean(scenario.criticalSafetyGate)), falseAcceptance: falseAcc }
  };
}

async function _evalRepairTransactionScenario(scenario) {
  const { input, expected } = scenario;
  const tx = await executeVerifiedRepairTransaction(input.baseline, input.delta, {
    baselineValidation: input.baselineValidation,
    validateFn: input.candidateValidation ? () => input.candidateValidation : undefined
  });
  const cleared = tx.invalidatedReceipts || [];
  const baselineOk = !expected.baselinePreserved || JSON.stringify(tx.state.items) === JSON.stringify(input.baseline.items);
  const passed = [
    tx.outcome === expected.outcome,
    _matchesExact(tx.regressionDetected, expected.regressionDetected),
    _matchesExact(tx.manifestChanged, expected.manifestChanged),
    _matchesExact(tx.receiptInvalidated, expected.receiptInvalidated),
    _matchesMin(cleared.length, expected.expectedClearedFieldsCount),
    baselineOk
  ].every(Boolean);
  const regressed = expected.outcome === 'ROLLED_BACK' && tx.outcome === 'ACCEPTED';
  return {
    passed,
    observed: { outcome: tx.outcome, regressionDetected: tx.regressionDetected, clearedFields: cleared },
    repairStats: { attempted: 1, rejected: Number(tx.outcome === 'ROLLED_BACK'), exhausted: 0, regressions: Number(regressed) },
    safetyStats: { criticalChecked: Number(Boolean(scenario.criticalSafetyGate)), falseAcceptance: Number(regressed) }
  };
}

function _buildSampleDepGraph(targetProduct, unrelatedProduct) {
  const index = depIndex.createDependencyIndex();
  depIndex.registerDependencyNode(index, { id: 'RULE-1', kind: 'RULE', product: targetProduct, revision: 'r1' });
  depIndex.registerDependencyNode(index, { id: 'SRC-1', kind: 'SOURCE', product: targetProduct, revision: 's1' });
  depIndex.registerDependencyNode(index, { id: 'REQ-1', kind: 'REQUIREMENT', product: targetProduct, revision: 'q1' });
  depIndex.registerDependencyNode(index, { id: 'AUTH-TARGET', kind: 'AUTHORIZATION', product: targetProduct, revision: 'a1', immutableReceiptPath: 'outputs/receipt_v1.json' });
  depIndex.registerDependencyNode(index, { id: 'AUTH-OTHER', kind: 'AUTHORIZATION', product: unrelatedProduct, revision: 'u1' });
  depIndex.addDependencyEdge(index, 'RULE-1', 'AUTH-TARGET', 'GOVERNS');
  depIndex.addDependencyEdge(index, 'SRC-1', 'AUTH-TARGET', 'EVIDENCES');
  depIndex.addDependencyEdge(index, 'REQ-1', 'AUTH-TARGET', 'REQUIRES');
  return index;
}

function _evalCycleRejectionCase(scenario) {
  const { input } = scenario;
  const idx = depIndex.createDependencyIndex();
  depIndex.registerDependencyNode(idx, { id: 'NODE-A', kind: 'CLAIM', product: input.targetProduct });
  depIndex.registerDependencyNode(idx, { id: 'NODE-B', kind: 'FACT', product: input.targetProduct });
  depIndex.addDependencyEdge(idx, 'NODE-A', 'NODE-B', 'SUPPORTS');
  const cycleRes = depIndex.addDependencyEdge(idx, 'NODE-B', 'NODE-A', 'SUPPORTS');
  const passed = cycleRes.accepted === false && cycleRes.cyclicEvidenceRejected === true;
  return {
    passed,
    observed: { cycleRes },
    recoveryStats: { terminalRecoveryOk: Number(passed), terminalRecoveryTotal: 1, retractionInvalidationOk: 0, retractionInvalidationTotal: 0, freshProcessAppliedRuleEvidence: 0 },
    safetyStats: { criticalChecked: Number(Boolean(scenario.criticalSafetyGate)), falseAcceptance: Number(!passed) }
  };
}

function _evalDependencyInvalidationScenario(scenario) {
  const { input, expected } = scenario;
  if (input.mode === 'CYCLE_REJECTION') return _evalCycleRejectionCase(scenario);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'si10-dep-'));
  try {
    const idxPath = path.join(tmpDir, 'dep_index.json');
    const idx = _buildSampleDepGraph(input.targetProduct, input.unrelatedProduct);
    if (input.mode === 'RULE_RETRACTION') depIndex.invalidateByRetractedRule(idx, 'RULE-1', 'RULE_RETRACTED');
    else {
      depIndex.invalidateBySourceChange(idx, 'SRC-1', 's2', 'SOURCE_UPDATED');
      depIndex.invalidateByRequirementChange(idx, 'REQ-1', 'q2', 'REQ_UPDATED');
    }
    depIndex.saveDependencyIndexAtomic(idxPath, idx);
    const reloaded = depIndex.loadDependencyIndex(idxPath);
    const targetBoundary = depIndex.evaluateInvalidationBoundary(reloaded, 'AUTH-TARGET');
    const otherBoundary = depIndex.evaluateInvalidationBoundary(reloaded, 'AUTH-OTHER');
    const staleOk = targetBoundary.status === 'STALE_INVALIDATED' && !targetBoundary.canGrantAcceptance;
    const otherOk = otherBoundary.status === 'VALID' && otherBoundary.canGrantAcceptance;
    const receiptsOk = !expected.receiptsPreserved || reloaded.preservedReceipts.some(r => r.immutableReceiptPath === 'outputs/receipt_v1.json');
    const passed = staleOk && otherOk && receiptsOk;
    return {
      passed,
      observed: { targetBoundary, otherBoundary, queueCount: reloaded.reevaluationQueue.length },
      recoveryStats: {
        terminalRecoveryOk: Number(passed), terminalRecoveryTotal: 1,
        retractionInvalidationOk: Number(staleOk), retractionInvalidationTotal: 1, freshProcessAppliedRuleEvidence: 0
      },
      safetyStats: { criticalChecked: Number(Boolean(scenario.criticalSafetyGate)), falseAcceptance: Number(targetBoundary.canGrantAcceptance) }
    };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function _evalParetoRankingScenario(scenario) {
  const { input, expected } = scenario;
  const f1 = computeParetoFrontier(input.candidates, { baselineItems: input.baselineItems, searchSpaceComplete: input.searchSpaceComplete });
  const r1 = rankQualifiedCandidatesDeterministically(input.candidates, { baselineItems: input.baselineItems });
  const r2 = rankQualifiedCandidatesDeterministically([...input.candidates].reverse(), { baselineItems: input.baselineItems });
  const order1 = r1.map(c => c.name);
  const permSame = JSON.stringify(order1) === JSON.stringify(r2.map(c => c.name));
  const firstCand = f1.frontierCandidates[0] || r1[0] || {};
  const nullCostOk = !expected.mustPreserveNullCost || (firstCand.priceMetadata?.costUsd === null && firstCand.priceMetadata?.pricingComplete === false);
  const nullLeadOk = !expected.mustPreserveNullComparableLeadTime || firstCand.leadTimeMetadata?.comparableLeadTimeDays === null;
  const passed = [
    f1.evaluatedCandidateSet.eligibleCandidateCount === expected.qualifiedCount,
    f1.disqualifiedCandidates.length === expected.disqualifiedCount,
    f1.isGlobalMinimum === expected.isGlobalMinimum,
    _matchesExact(order1[0], expected.topQualifiedName),
    permSame, nullCostOk, nullLeadOk
  ].every(Boolean);
  const topDisq = r1.some(c => c.requirementCoverage?.blocksPositiveRecommendation === true);
  return {
    passed,
    observed: { order1, order2: r2.map(c => c.name), disqualifiedCount: f1.disqualifiedCandidates.length, isGlobalMinimum: f1.isGlobalMinimum },
    rankingStats: {
      pairwiseCorrect: Number(!expected.topQualifiedName || order1[0] === expected.topQualifiedName),
      pairwiseTotal: Number(Boolean(expected.topQualifiedName)),
      permutationDeterministic: Number(permSame),
      permutationTested: 1,
      hardViolationsExcluded: f1.disqualifiedCandidates.length
    },
    safetyStats: { criticalChecked: Number(Boolean(scenario.criticalSafetyGate)), falseAcceptance: Number(topDisq) }
  };
}

function _verifyParityWorkbookOutputs(evalResults, proj) {
  const md = generateMarkdownReport({ inputFile: 'si10_parity.csv', catalogData: { metadata: { chassis: 'DL380 Gen12' } }, evalResults });
  const isAuthorized = evalResults.acceptanceGate?.isValid === true;
  const evalForXlsx = isAuthorized
    ? {
        ...evalResults,
        deliveryAuthorization: issueDeliveryAuthorization({
          manifestFingerprint: deliveryFingerprint(evalResults),
          chassisKey: evalResults.chassis || 'DL380_Gen12',
          acceptanceDecision: { isApproved: true, profile: 'BOQ_EVALUATION' }
        })
      }
    : { ...evalResults, solutionIntelligence: proj };
  const wbOpts = isAuthorized ? { diagnostic: false, chassisKey: 'DL380_Gen12' } : { diagnostic: true, chassisKey: 'DL380_Gen12' };
  const multiWb = generateMultiRankSolutionWorkbook(evalForXlsx, '', 'DL380_Gen12', wbOpts);
  const portalWb = isAuthorized ? generateRankedPortalWorkbook(evalForXlsx, null, { diagnostic: false, chassisKey: 'DL380_Gen12' }) : null;
  const portalOk = !portalWb || !portalWb.SheetNames.includes('Decision & Evidence');
  return md.length > 0 && portalOk && Boolean(multiWb && multiWb.SheetNames.includes('Decision & Evidence'));
}

async function _evalProjectionParityScenario(scenario) {
  const { input, expected } = scenario;
  const proj = projectCustomerDecision(input.evalResults);
  const env = buildSolutionIntelligenceEnvelope(input.evalResults);
  const mcpResp = await mcpServer.executeToolRequest({
    params: { name: 'get_solution_intelligence_envelope', arguments: { eval_result: input.evalResults } }
  });
  const mcpEnv = mcpResp.isError ? null : JSON.parse(mcpResp.content[0].text);
  const parityOk = Boolean(mcpEnv) &&
    _matchesJson(proj.outcome, env.outcome) &&
    _matchesJson(proj.outcome, mcpEnv.outcome) &&
    _matchesJson(proj.evidenceStates, mcpEnv.evidenceStates);

  const xlsxOk = (expected.mustKeepPortal7Columns && input.evalResults)
    ? _verifyParityWorkbookOutputs(input.evalResults, proj)
    : true;

  const passed = [
    parityOk, xlsxOk,
    _matchesExact(proj.outcome.disposition, expected.disposition),
    _matchesExact(proj.outcome.summary, expected.summary),
    _matchesExact(proj.outcome.isBuildable, expected.isBuildable),
    _matchesExact(proj.evidenceStates.documentGrounding, expected.documentGrounding),
    _matchesExact(proj.evidenceStates.liveVendorAcceptance, expected.liveVendorAcceptance)
  ].every(Boolean);
  const falseAcc = !passed && scenario.criticalSafetyGate ? 1 : 0;
  return {
    passed,
    observed: { disposition: proj.outcome.disposition, evidenceStates: proj.evidenceStates, parityOk, xlsxOk },
    safetyStats: { criticalChecked: Number(Boolean(scenario.criticalSafetyGate)), falseAcceptance: falseAcc }
  };
}

function _evalErrorPreservationScenario(scenario) {
  const { input } = scenario;
  const err = Object.assign(new Error(input.primaryErrorMessage), { code: input.primaryErrorCode });
  const preserved = preservePrimaryErrorOnReflectionFailure(err, () => {
    throw new Error(input.reflectionErrorMessage);
  });
  const passed = preserved.primaryError.code === input.primaryErrorCode &&
    preserved.reflectionFailed === true &&
    preserved.reflectionError.message === input.reflectionErrorMessage;
  return {
    passed,
    observed: preserved,
    recoveryStats: { terminalRecoveryOk: Number(passed), terminalRecoveryTotal: 1, retractionInvalidationOk: 0, retractionInvalidationTotal: 0, freshProcessAppliedRuleEvidence: 0 },
    safetyStats: { criticalChecked: Number(Boolean(scenario.criticalSafetyGate)), falseAcceptance: Number(!passed) }
  };
}

function _evalLearningSegregationScenario(scenario) {
  const { input, expected } = scenario;
  const rules = loadActiveKnowledgeRules(input.chassis, '', { rawDeltas: input.rawDeltas, registryPaths: [], decisionPaths: [], quarantinePaths: [] });
  const consumption = recordRuleConsumption(rules, [{ ruleId: input.appliedRuleId, action: 'ADD_FAN', effect: 'APPLIED' }]);
  const passed = rules.physicalRules.length === expected.activePhysicalCount &&
    rules.segregatedEntries.length === expected.segregatedCount &&
    _matchesJson(consumption.appliedRuleIds, expected.appliedRuleIds) &&
    Boolean(consumption.cloudSyncStatus) === expected.cloudSyncSeparate;
  return {
    passed,
    observed: { physicalCount: rules.physicalRules.length, segregatedCount: rules.segregatedEntries.length, consumption },
    recoveryStats: {
      terminalRecoveryOk: Number(passed), terminalRecoveryTotal: 1,
      retractionInvalidationOk: 0, retractionInvalidationTotal: 0,
      freshProcessAppliedRuleEvidence: Number(consumption.appliedRuleIds.length > 0)
    },
    safetyStats: { criticalChecked: Number(Boolean(scenario.criticalSafetyGate)), falseAcceptance: Number(!passed) }
  };
}

function _evalFingerprintStaleTokenCase(scenario) {
  const ev = scenario.input.evaluation;
  const fp1 = deliveryFingerprint(ev);
  const auth = issueDeliveryAuthorization({ manifestFingerprint: fp1, chassisKey: ev.chassis, acceptanceDecision: { isApproved: true, profile: 'BOQ_EVALUATION' } });
  const validBefore = verifyDeliveryAuthorization(auth, fp1, { chassisKey: ev.chassis, profile: 'BOQ_EVALUATION' });
  const fp2 = deliveryFingerprint({ ...ev, dependencyInvalidation: { isStale: true, indexRevisionSha256: 'rev-2' } });
  const validAfter = verifyDeliveryAuthorization(auth, fp2, { chassisKey: ev.chassis, profile: 'BOQ_EVALUATION' });
  const passed = validBefore === true && validAfter === false && fp1 !== fp2;
  return {
    passed,
    observed: { validBefore, validAfter, fingerprintChanged: fp1 !== fp2 },
    safetyStats: { criticalChecked: Number(Boolean(scenario.criticalSafetyGate)), falseAcceptance: Number(validAfter) }
  };
}

function _evalExportGateScenario(scenario) {
  const { input } = scenario;
  if (input.mode === 'FINGERPRINT_STALE_TOKEN') return _evalFingerprintStaleTokenCase(scenario);

  const partialOk = isStrictDocumentReviewVerified(input.partialReview);
  const gate = verifyPrePresentationAcceptance(input.evalArtifact, 'BOQ_EVALUATION', { catalogData: input.evalArtifact.catalogData });
  const b22 = gate.checks.find(c => c.id === 'B22');
  const b24 = gate.checks.find(c => c.id === 'B24');
  const passed = !partialOk && !gate.isValid && b22?.status === 'FAILED' && b24?.status === 'FAILED';
  return {
    passed,
    observed: { partialOk, gateIsValid: gate.isValid, b22: b22?.status, b24: b24?.status },
    constraintStats: { tp: Number(!gate.isValid), fp: 0, tn: 0, fn: Number(gate.isValid) },
    safetyStats: { criticalChecked: Number(Boolean(scenario.criticalSafetyGate)), falseAcceptance: Number(partialOk || gate.isValid) }
  };
}

const EVALUATOR_HANDLERS = Object.freeze({
  ROUTER_TRACK: _evalRouterTrack,
  REQUIREMENT_COVERAGE: _evalRequirementCoverageScenario,
  REQUIREMENT_ACCOUNTING_PARSE: _evalRequirementParseScenario,
  WORKLOAD_SIZING: _evalWorkloadSizingScenario,
  COMPOUND_WORKFLOW: _evalCompoundWorkflowScenario,
  CLAIM_ADJUDICATION: _evalClaimAdjudicationScenario,
  INFEASIBILITY_DIAGNOSIS: _evalInfeasibilityDiagnosisScenario,
  BOUNDED_SEARCH: _evalBoundedSearchScenario,
  REPAIR_TRANSACTION: _evalRepairTransactionScenario,
  DEPENDENCY_INVALIDATION: _evalDependencyInvalidationScenario,
  PARETO_RANKING: _evalParetoRankingScenario,
  PROJECTION_PARITY: _evalProjectionParityScenario,
  ERROR_PRESERVATION: _evalErrorPreservationScenario,
  LEARNING_SEGREGATION: _evalLearningSegregationScenario,
  EXPORT_GATE: _evalExportGateScenario
});

async function evaluateScenario(scenario) {
  const startNs = process.hrtime.bigint();
  const handler = EVALUATOR_HANDLERS[scenario?.evaluatorKind];
  if (!handler) {
    return {
      id: scenario?.id || 'UNKNOWN',
      familyId: scenario?.familyId || null,
      dimension: scenario?.dimension || null,
      split: scenario?.split || 'dev',
      origin: scenario?.origin || 'synthetic',
      environment: scenario?.environment || 'offline',
      adjudicationSource: scenario?.adjudicationSource || 'UNSPECIFIED',
      criticalSafetyGate: Boolean(scenario?.criticalSafetyGate),
      passed: false,
      elapsedMs: 0,
      error: `UNKNOWN_EVALUATOR_KIND:${scenario?.evaluatorKind}`
    };
  }
  const detail = await handler(scenario);
  const elapsedMs = Number((Number(process.hrtime.bigint() - startNs) / 1e6).toFixed(3));
  return {
    id: scenario.id,
    familyId: scenario.familyId,
    dimension: scenario.dimension,
    split: scenario.split,
    origin: scenario.origin,
    environment: scenario.environment,
    adjudicationSource: scenario.adjudicationSource,
    criticalSafetyGate: Boolean(scenario.criticalSafetyGate),
    title: scenario.title,
    passed: Boolean(detail.passed),
    elapsedMs,
    ...detail
  };
}

function _sumField(results, group, field) {
  return results.reduce((sum, r) => sum + Number(r[group]?.[field] || 0), 0);
}

function _computeLatencyStats(results, baselineRef) {
  const times = results.map(r => r.elapsedMs).filter(Number.isFinite).sort((a, b) => a - b);
  if (times.length === 0) {
    return { medianMs: null, p95Ms: null, totalMs: 0, scenarioCount: 0, si00BaselineRef: baselineRef };
  }
  const mid = Math.floor(times.length / 2);
  const medianMs = times.length % 2 === 1 ? times[mid] : Number(((times[mid - 1] + times[mid]) / 2).toFixed(3));
  const p95Idx = Math.min(times.length - 1, Math.floor(0.95 * (times.length - 1)));
  const totalMs = Number(times.reduce((a, b) => a + b, 0).toFixed(3));
  return { medianMs, p95Ms: times[p95Idx], totalMs, scenarioCount: times.length, si00BaselineRef: baselineRef };
}

function _computeRequirementAndClaimMetrics(results) {
  const reqAcct = _sumField(results, 'requirementStats', 'accountedClauses');
  const reqTotal = _sumField(results, 'requirementStats', 'adjudicatedClauses');
  const hardSat = _sumField(results, 'requirementStats', 'satisfiedHard');
  const hardApp = _sumField(results, 'requirementStats', 'applicableHard');
  const matTotal = _sumField(results, 'claimStats', 'materialCount');
  const matSupp = _sumField(results, 'claimStats', 'supportedCount');
  return {
    requirementDispositionCoverage: { rate: _ratioOrNull(reqAcct, reqTotal), accountedClauses: reqAcct, adjudicatedClauses: reqTotal },
    hardRequirementPreservation: { rate: _ratioOrNull(hardSat, hardApp), satisfiedHard: hardSat, applicableHard: hardApp },
    materialClaimSupport: {
      supportedRate: _ratioOrNull(matSupp, matTotal),
      supportedCount: matSupp,
      materialCount: matTotal,
      contradictionCount: _sumField(results, 'claimStats', 'contradictionCount'),
      unknownCount: _sumField(results, 'claimStats', 'unknownCount'),
      rejectedEvidenceCount: _sumField(results, 'claimStats', 'rejectedEvidenceCount'),
      unsupportedPositiveAcceptances: _sumField(results, 'claimStats', 'unsupportedPositiveAcceptance')
    }
  };
}

function _computeConstraintAndSafetyMetrics(results) {
  const tp = _sumField(results, 'constraintStats', 'tp');
  const fp = _sumField(results, 'constraintStats', 'fp');
  const fn = _sumField(results, 'constraintStats', 'fn');
  const critChecked = _sumField(results, 'safetyStats', 'criticalChecked');
  const falseAcc = _sumField(results, 'safetyStats', 'falseAcceptance');
  return {
    constraintPrecisionRecall: { precision: _ratioOrNull(tp, tp + fp), recall: _ratioOrNull(tp, tp + fn), tp, fp, tn: _sumField(results, 'constraintStats', 'tn'), fn },
    falseAcceptance: { count: falseAcc, criticalCasesEvaluated: critChecked, rate: _ratioOrNull(falseAcc, critChecked), scopeBoundNote: 'Scoped to evaluated offline SI-10 critical scenarios only.' },
    repairRegression: {
      regressions: _sumField(results, 'repairStats', 'regressions'),
      attempted: _sumField(results, 'repairStats', 'attempted'),
      rejected: _sumField(results, 'repairStats', 'rejected'),
      exhausted: _sumField(results, 'repairStats', 'exhausted')
    },
    clarificationAbstention: {
      criticalAmbiguitiesCaught: _sumField(results, 'clarificationStats', 'criticalAmbiguitiesCaught'),
      unnecessaryClarifications: _sumField(results, 'clarificationStats', 'unnecessaryClarifications'),
      safeAbstentions: _sumField(results, 'clarificationStats', 'safeAbstentions'),
      avoidableIncompleteness: _sumField(results, 'clarificationStats', 'avoidableIncompleteness')
    }
  };
}

function _computeRankingAndLearningMetrics(results) {
  const pairCorrect = _sumField(results, 'rankingStats', 'pairwiseCorrect');
  const pairTotal = _sumField(results, 'rankingStats', 'pairwiseTotal');
  const permDet = _sumField(results, 'rankingStats', 'permutationDeterministic');
  const permTotal = _sumField(results, 'rankingStats', 'permutationTested');
  const recOk = _sumField(results, 'recoveryStats', 'terminalRecoveryOk');
  const recTotal = _sumField(results, 'recoveryStats', 'terminalRecoveryTotal');
  const retOk = _sumField(results, 'recoveryStats', 'retractionInvalidationOk');
  const retTotal = _sumField(results, 'recoveryStats', 'retractionInvalidationTotal');
  return {
    rankingQuality: {
      pairwisePreferenceAccuracy: _ratioOrNull(pairCorrect, pairTotal),
      permutationDeterminismRate: _ratioOrNull(permDet, permTotal),
      hardViolationsExcludedCount: _sumField(results, 'rankingStats', 'hardViolationsExcluded')
    },
    recoveryLearning: {
      terminalRecoveryAccuracy: _ratioOrNull(recOk, recTotal),
      retractionInvalidationAccuracy: _ratioOrNull(retOk, retTotal),
      freshProcessAppliedRuleEvidence: _sumField(results, 'recoveryStats', 'freshProcessAppliedRuleEvidence')
    }
  };
}

function _resolveReleaseGate(totalCases, passedCount, safety, reqAndClaim) {
  if (totalCases === 0) return { passed: false, reason: 'ZERO_SCENARIOS_EVALUATED' };
  const blocked = safety.falseAcceptance.count > 0 ||
    reqAndClaim.materialClaimSupport.unsupportedPositiveAcceptances > 0 ||
    safety.repairRegression.regressions > 0 ||
    passedCount < totalCases;
  return { passed: !blocked, reason: blocked ? 'SAFETY_OR_SCENARIO_FAILURE_DETECTED' : 'ALL_SCOPED_OFFLINE_CHECKS_PASSED' };
}

function computeQualityMetrics(results = [], options = {}) {
  const list = Array.isArray(results) ? results : [];
  const passedCount = list.filter(r => r.passed).length;
  const reqAndClaim = _computeRequirementAndClaimMetrics(list);
  const safety = _computeConstraintAndSafetyMetrics(list);
  const rankAndLearn = _computeRankingAndLearningMetrics(list);
  const latencyResource = _computeLatencyStats(list, options.si00BaselineRef || SI00_BASELINE_PATH);
  latencyResource.familyCount = new Set(list.map(r => r.familyId).filter(Boolean)).size;
  latencyResource.devCount = list.filter(r => r.split === 'dev').length;
  latencyResource.heldOutCount = list.filter(r => r.split === 'held_out').length;
  return {
    totalCases: list.length,
    passedCases: passedCount,
    failedCases: list.length - passedCount,
    passRate: _ratioOrNull(passedCount, list.length),
    ...reqAndClaim,
    ...safety,
    ...rankAndLearn,
    latencyResource,
    releaseGate: _resolveReleaseGate(list.length, passedCount, safety, reqAndClaim)
  };
}

async function evaluateAllScenarios(scenarios = null, options = {}) {
  const loaded = scenarios ? null : require(FIXTURE_PATH);
  const list = scenarios || loaded.SCENARIO_CASES;
  const results = [];
  for (const sc of list) {
    results.push(await evaluateScenario(sc));
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    evaluatedAt: new Date().toISOString(),
    environment: 'offline',
    liveQualificationStatus: 'NOT_RUN_OFFLINE_CERTIFICATION_ONLY',
    overall: computeQualityMetrics(results, options),
    splits: {
      dev: computeQualityMetrics(results.filter(r => r.split === 'dev'), options),
      held_out: computeQualityMetrics(results.filter(r => r.split === 'held_out'), options)
    },
    results
  };
}

async function runSolutionIntelligenceQualityEvaluation(options = {}) {
  const loaded = require(FIXTURE_PATH);
  const evalOut = await evaluateAllScenarios(options.scenarios || loaded.SCENARIO_CASES, options);
  const receipt = {
    ...evalOut,
    workPackage: 'SI-10',
    fixtureSchemaVersion: loaded.SCENARIO_SCHEMA_VERSION,
    requiredDimensions: loaded.REQUIRED_DIMENSIONS,
    familyCount: loaded.SCENARIO_FAMILIES.length,
    dependencyHashes: {
      scenarioFamiliesSha256: _sha256File(FIXTURE_PATH),
      evaluatorSha256: _sha256File(__filename),
      si00BaselineSha256: _sha256File(SI00_BASELINE_PATH)
    }
  };
  const savePath = options.savePath || (options.save ? DEFAULT_RECEIPT_PATH : null);
  if (savePath) safeWriteJsonAtomic(savePath, receipt);
  return receipt;
}

if (require.main === module) {
  const save = process.argv.includes('--save');
  runSolutionIntelligenceQualityEvaluation({ save })
    .then(report => {
      const summary = {
        schemaVersion: report.schemaVersion,
        familyCount: report.familyCount,
        totalCases: report.overall.totalCases,
        passedCases: report.overall.passedCases,
        failedCases: report.overall.failedCases,
        devPassed: `${report.splits.dev.passedCases}/${report.splits.dev.totalCases}`,
        heldOutPassed: `${report.splits.held_out.passedCases}/${report.splits.held_out.totalCases}`,
        falseAcceptances: report.overall.falseAcceptance.count,
        unsupportedPositiveAcceptances: report.overall.materialClaimSupport.unsupportedPositiveAcceptances,
        repairRegressions: report.overall.repairRegression.regressions,
        releaseGate: report.overall.releaseGate,
        liveQualificationStatus: report.liveQualificationStatus,
        savedTo: save ? DEFAULT_RECEIPT_PATH : null
      };
      console.log(JSON.stringify(summary, null, 2));
      if (!report.overall.releaseGate.passed) {
        const failed = report.results.filter(r => !r.passed).map(r => ({ id: r.id, title: r.title, observed: r.observed }));
        console.error('Failed scenarios:', JSON.stringify(failed, null, 2));
        process.exitCode = 1;
      }
    })
    .catch(err => {
      console.error(err);
      process.exitCode = 1;
    });
}

module.exports = {
  SCHEMA_VERSION,
  DEFAULT_RECEIPT_PATH,
  evaluateScenario,
  evaluateAllScenarios,
  computeQualityMetrics,
  runSolutionIntelligenceQualityEvaluation
};
