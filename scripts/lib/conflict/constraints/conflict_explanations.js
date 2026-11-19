'use strict';
/**
 * scripts/lib/conflict/constraints/conflict_explanations.js
 *
 * Minimal conflicting set extraction (with single-constraint removal ablation),
 * bounded feasibility search, and scope-honest infeasibility diagnosis.
 *
 * Guarantees:
 * - isIrreducible: true ONLY when single-constraint removal ablation confirms
 *   removing EVERY included constraint makes the subset feasible.
 * - universalImpossibilityClaimed: false ALWAYS — never infers universal vendor
 *   impossibility from restricted search scope, catalog misses, or budget exhaustion.
 */

const {
  createConstraintResult,
  evaluateHardBeforePreferences,
  summarizeConstraintResults
} = require('./constraint_results.js');

const EXPLANATION_SCHEMA_VERSION = '1.0';
const FEASIBILITY_OUTCOMES = Object.freeze([
  'FEASIBLE_IN_EVALUATED_SCOPE',
  'INFEASIBLE_IN_EVALUATED_SCOPE',
  'UNKNOWN',
  'SEARCH_EXHAUSTED'
]);

function _normalizePreservingProps(constraint) {
  const typed = createConstraintResult(constraint);
  if (constraint && typeof constraint === 'object' && !Array.isArray(constraint)) {
    return { ...constraint, ...typed };
  }
  return typed;
}

function _dedupeOrdered(items) {
  const out = [];
  const seen = new Set();
  for (const item of items) {
    if (!item) continue;
    const key = typeof item === 'string' ? item : JSON.stringify(item);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

function _collectRefsFromConstraints(constraints) {
  const constraintIds = [];
  const requirementIds = [];
  const evidenceRefs = [];
  for (const c of constraints) {
    constraintIds.push(c.constraintId);
    if (Array.isArray(c.requirementIds)) requirementIds.push(...c.requirementIds);
    if (Array.isArray(c.evidenceRefs)) evidenceRefs.push(...c.evidenceRefs);
  }
  return {
    constraintIds: _dedupeOrdered(constraintIds),
    requirementIds: _dedupeOrdered(requirementIds),
    evidenceRefs: _dedupeOrdered(evidenceRefs)
  };
}

function _isSubsetFeasibleResult(res) {
  if (res === true) return true;
  return Boolean(res && typeof res === 'object' && res.feasible === true);
}

function _safeCheckSubset(checkFn, subset, context) {
  try {
    const raw = checkFn(subset, context);
    return { ok: true, feasible: _isSubsetFeasibleResult(raw) };
  } catch (err) {
    return { ok: false, feasible: false, error: err.message };
  }
}

function _selectFailingFallback(normalized) {
  const hardFails = normalized.filter(c => c.status === 'FAIL' && c.hardness === 'HARD');
  if (hardFails.length > 0) return hardFails;
  return normalized.filter(c => c.status === 'FAIL');
}

function _minimizeByDeletion(candidates, checkFn, context) {
  let working = [...candidates];
  for (const candidate of candidates) {
    const withoutCandidate = working.filter(item => item !== candidate);
    const check = _safeCheckSubset(checkFn, withoutCandidate, context);
    if (check.ok && !check.feasible) {
      working = withoutCandidate;
    }
  }
  return working;
}

function _verifySingleRemovalAblation(working, checkFn, context) {
  if (working.length === 0) {
    return { isIrreducible: false, ablationChecks: [] };
  }
  const fullCheck = _safeCheckSubset(checkFn, working, context);
  if (!fullCheck.ok || fullCheck.feasible) {
    return { isIrreducible: false, ablationChecks: [] };
  }
  const ablationChecks = [];
  let allRestoredFeasibility = true;
  for (const item of working) {
    const withoutItem = working.filter(other => other !== item);
    const subCheck = _safeCheckSubset(checkFn, withoutItem, context);
    const subsetFeasible = subCheck.ok && subCheck.feasible;
    ablationChecks.push({
      removedConstraintId: item.constraintId,
      subsetSize: withoutItem.length,
      subsetFeasible
    });
    if (!subsetFeasible) {
      allRestoredFeasibility = false;
    }
  }
  return { isIrreducible: allRestoredFeasibility, ablationChecks };
}

function _buildConflictSetPayload(constraints, isIrreducible, ablationRan, ablationChecks) {
  const refs = _collectRefsFromConstraints(constraints);
  return {
    schemaVersion: EXPLANATION_SCHEMA_VERSION,
    constraints,
    constraintIds: refs.constraintIds,
    requirementIds: refs.requirementIds,
    evidenceRefs: refs.evidenceRefs,
    isIrreducible: Boolean(isIrreducible),
    irreducibilityBasis: isIrreducible ? 'SINGLE_CONSTRAINT_ABLATION_VERIFIED' : 'UNVERIFIED_SUBSET',
    ablationRan: Boolean(ablationRan),
    ablationChecks: ablationChecks || []
  };
}

/**
 * Extract the minimal conflicting set of constraints.
 * Sets isIrreducible: true ONLY when single-constraint removal ablation confirms
 * removing every included constraint yields a feasible subset.
 *
 * @param {Array<object>} [constraints=[]]
 * @param {object} [options={}]
 * @returns {object} Minimal conflicting set record
 */
function computeMinimalConflictingSet(constraints = [], options = {}) {
  const normalized = (Array.isArray(constraints) ? constraints : []).map(_normalizePreservingProps);
  const checkFn = typeof options?.checkFeasibleSubsetFn === 'function' ? options.checkFeasibleSubsetFn : null;

  if (!checkFn || normalized.length === 0) {
    const fallbackSet = _selectFailingFallback(normalized);
    return _buildConflictSetPayload(fallbackSet, false, false, []);
  }

  const fullCheck = _safeCheckSubset(checkFn, normalized, options.context);
  if (!fullCheck.ok || fullCheck.feasible) {
    const fallbackSet = _selectFailingFallback(normalized);
    return _buildConflictSetPayload(fallbackSet, false, fullCheck.ok, []);
  }

  const working = options.verifyOnly === true
    ? normalized
    : _minimizeByDeletion(normalized, checkFn, options.context);
  const { isIrreducible, ablationChecks } = _verifySingleRemovalAblation(working, checkFn, options.context);

  const selected = working.length > 0 ? working : _selectFailingFallback(normalized);
  return _buildConflictSetPayload(selected, isIrreducible, true, ablationChecks);
}

/**
 * Strictly classify feasibility outcomes within evaluated scope.
 *
 * @param {object} [params={}]
 * @returns {'FEASIBLE_IN_EVALUATED_SCOPE'|'INFEASIBLE_IN_EVALUATED_SCOPE'|'UNKNOWN'|'SEARCH_EXHAUSTED'}
 */
function classifyFeasibilityOutcome(params = {}) {
  if (params.exhausted === true) return 'SEARCH_EXHAUSTED';
  if (params.hasFeasibleCandidate === true) return 'FEASIBLE_IN_EVALUATED_SCOPE';
  if ((params.unknownHardCount || 0) > 0 || (params.notEvaluatedCount || 0) > 0 || params.hasUnknown === true) {
    return 'UNKNOWN';
  }
  if ((params.hardFailuresCount || 0) > 0 || params.infeasibleEvaluated === true) {
    return 'INFEASIBLE_IN_EVALUATED_SCOPE';
  }
  return 'UNKNOWN';
}

function _normalizeSearchBudget(budget = {}) {
  return {
    maxIterations: Number.isFinite(budget.maxIterations) ? Math.max(0, budget.maxIterations) : 100,
    maxCandidates: Number.isFinite(budget.maxCandidates) ? Math.max(0, budget.maxCandidates) : 100,
    maxElapsedMs: Number.isFinite(budget.maxElapsedMs) ? Math.max(0, budget.maxElapsedMs) : 5000,
    nowFn: typeof budget.nowFn === 'function' ? budget.nowFn : Date.now
  };
}

function _isCandidateEvalValid(evalOut, hardEval) {
  if (!evalOut || typeof evalOut !== 'object') return false;
  const rawStatus = String(evalOut.status || '').toUpperCase();
  if (rawStatus === 'UNKNOWN' || rawStatus === 'NOT_EVALUATED' || rawStatus === 'FAIL') return false;
  if (evalOut.feasible === false || evalOut.isValid === false) return false;
  if (hardEval && hardEval.blocksPositiveRanking) return false;
  if (evalOut.feasible === true || evalOut.isValid === true) return true;
  return Boolean(hardEval);
}

function _isCandidateEvalUnknown(evalOut, hardEval) {
  const rawStatus = String(evalOut?.status || '').toUpperCase();
  if (rawStatus === 'UNKNOWN' || rawStatus === 'NOT_EVALUATED') return true;
  if (!hardEval) return false;
  return hardEval.hardSummary.unknownCount > 0 || hardEval.hardSummary.notEvaluatedCount > 0;
}

function _evaluateSingleSearchCandidate(candidate, index, iteration, evaluateCandidateFn) {
  const evalOut = typeof evaluateCandidateFn === 'function'
    ? evaluateCandidateFn(candidate, { index, iteration })
    : { constraints: candidate?.constraints || [], score: candidate?.score };

  const constraints = Array.isArray(evalOut?.constraints)
    ? evalOut.constraints.map(createConstraintResult)
    : null;
  const hardEval = constraints ? evaluateHardBeforePreferences(constraints) : null;
  const isValid = _isCandidateEvalValid(evalOut, hardEval);
  const hasUnknown = _isCandidateEvalUnknown(evalOut, hardEval);
  const fallbackScore = hardEval?.preferenceSummary?.effectivePreferenceScore ?? 0;
  const score = Number.isFinite(evalOut?.score) ? evalOut.score : fallbackScore;
  const candidateObj = (evalOut && 'candidate' in evalOut && evalOut.candidate !== undefined) ? evalOut.candidate : candidate;

  return {
    isValid,
    hasUnknown,
    score,
    record: { candidate: candidateObj, score, index, constraints: constraints || [], evaluation: evalOut }
  };
}

function _checkBudgetExhausted(state, limits, totalCandidates) {
  if (state.index >= totalCandidates) return null;
  if (state.iterationsUsed >= limits.maxIterations) return 'MAX_ITERATIONS_REACHED';
  if (state.candidatesEvaluated >= limits.maxCandidates) return 'MAX_CANDIDATES_REACHED';
  const elapsed = limits.nowFn() - state.startMs;
  if (elapsed >= limits.maxElapsedMs && (state.index > 0 || limits.maxElapsedMs <= 0)) {
    return 'MAX_ELAPSED_MS_REACHED';
  }
  return null;
}

function _buildSearchExplanation(outcome, evaluatedScope, bestValidatedCandidate, exhaustionReason) {
  const scopeDesc = `product=${evaluatedScope.product}, catalogRevision=${evaluatedScope.catalogRevision}, evaluated=${evaluatedScope.candidateCountEvaluated}/${evaluatedScope.totalCandidatesProvided}, exhaustive=${evaluatedScope.searchSpaceExhaustive}`;
  if (outcome === 'SEARCH_EXHAUSTED') {
    const retained = bestValidatedCandidate ? ' Best validated candidate retained.' : ' No validated candidate found prior to exhaustion.';
    return `Bounded feasibility search exhausted (${exhaustionReason}) within scope [${scopeDesc}].${retained} Universal vendor impossibility is not claimed.`;
  }
  if (outcome === 'FEASIBLE_IN_EVALUATED_SCOPE') {
    return `Feasible candidate verified within evaluated scope [${scopeDesc}].`;
  }
  if (outcome === 'INFEASIBLE_IN_EVALUATED_SCOPE') {
    return `No feasible candidate found within evaluated scope [${scopeDesc}]. Universal vendor impossibility is NOT claimed outside the evaluated catalog/selector scope.`;
  }
  return `Feasibility remains UNKNOWN within evaluated scope [${scopeDesc}] due to missing inputs or unevaluated constraints.`;
}

function _buildEvaluatedSearchScope(scope, candidatesEvaluated, totalCandidates, exhausted) {
  const isExhaustive = scope?.searchSpaceExhaustive === true && !exhausted && candidatesEvaluated === totalCandidates;
  return {
    product: String(scope?.product || 'UNKNOWN_PRODUCT'),
    catalogRevision: String(scope?.catalogRevision || 'UNSPECIFIED'),
    candidateCountEvaluated: candidatesEvaluated,
    totalCandidatesProvided: totalCandidates,
    searchSpaceExhaustive: Boolean(isExhaustive)
  };
}

function _buildBoundedSearchBudget(limits, state, exhausted, exhaustionReason) {
  return {
    maxIterations: limits.maxIterations,
    maxCandidates: limits.maxCandidates,
    maxElapsedMs: limits.maxElapsedMs,
    iterationsUsed: state.iterationsUsed,
    candidatesEvaluated: state.candidatesEvaluated,
    elapsedMs: Math.max(0, limits.nowFn() - state.startMs),
    exhausted,
    exhaustionReason
  };
}

/**
 * Run a bounded feasibility search over candidate solutions while tracking scope,
 * enforcing iteration/candidate/time limits, and retaining the best validated candidate.
 *
 * @param {object} [params={}]
 * @returns {object} Bounded feasibility search result
 */
function runBoundedFeasibilitySearch({ candidates = [], evaluateCandidateFn, budget = {}, scope = {} } = {}) {
  const safeCandidates = Array.isArray(candidates) ? candidates : [];
  const limits = _normalizeSearchBudget(budget);
  const state = {
    index: 0,
    iterationsUsed: 0,
    candidatesEvaluated: 0,
    startMs: limits.nowFn(),
    bestValidatedCandidate: null,
    bestScore: Number.NEGATIVE_INFINITY,
    hasUnknown: false,
    evaluatedResults: []
  };
  let exhaustionReason = null;

  while (state.index < safeCandidates.length) {
    exhaustionReason = _checkBudgetExhausted(state, limits, safeCandidates.length);
    if (exhaustionReason) break;

    const evaluated = _evaluateSingleSearchCandidate(safeCandidates[state.index], state.index, state.iterationsUsed, evaluateCandidateFn);
    state.iterationsUsed += 1;
    state.candidatesEvaluated += 1;
    state.evaluatedResults.push(evaluated.record);
    if (evaluated.hasUnknown) state.hasUnknown = true;
    if (evaluated.isValid && evaluated.score > state.bestScore) {
      state.bestScore = evaluated.score;
      state.bestValidatedCandidate = evaluated.record;
    }
    state.index += 1;
  }

  const exhausted = Boolean(exhaustionReason);
  const evaluatedScope = _buildEvaluatedSearchScope(scope, state.candidatesEvaluated, safeCandidates.length, exhausted);
  const outcome = classifyFeasibilityOutcome({
    exhausted,
    hasFeasibleCandidate: Boolean(state.bestValidatedCandidate),
    hasUnknown: state.hasUnknown || state.candidatesEvaluated === 0,
    infeasibleEvaluated: state.candidatesEvaluated > 0 && !state.bestValidatedCandidate && !state.hasUnknown
  });

  return {
    schemaVersion: EXPLANATION_SCHEMA_VERSION,
    outcome,
    universalImpossibilityClaimed: false,
    scope: evaluatedScope,
    evaluatedScope,
    budget: _buildBoundedSearchBudget(limits, state, exhausted, exhaustionReason),
    bestValidatedCandidate: state.bestValidatedCandidate,
    evaluatedCandidates: state.evaluatedResults,
    explanation: _buildSearchExplanation(outcome, evaluatedScope, state.bestValidatedCandidate, exhaustionReason)
  };
}

function _buildDiagnosisExplanation(outcome, summary, minimalConflictingSet, notEvaluatedDomains, scope) {
  if (outcome === 'INFEASIBLE_IN_EVALUATED_SCOPE') {
    const ids = minimalConflictingSet.constraintIds.join(', ') || summary.failingHardConstraintIds.join(', ');
    const basis = minimalConflictingSet.isIrreducible ? 'irreducible subset verified by ablation' : 'unverified subset';
    return `Configuration is infeasible in evaluated scope (product=${scope.product}, revision=${scope.catalogRevision}) due to [${ids}] (${basis}). Universal vendor impossibility is not claimed.`;
  }
  if (outcome === 'UNKNOWN') {
    const missingDesc = summary.missingInputs.length > 0 ? ` missing inputs: [${summary.missingInputs.join(', ')}];` : '';
    const domainDesc = notEvaluatedDomains.length > 0 ? ` unevaluated domains: [${notEvaluatedDomains.join(', ')}]` : '';
    return `Feasibility is UNKNOWN in evaluated scope (product=${scope.product});${missingDesc}${domainDesc}`.trim();
  }
  return `All evaluated hard constraints passed within scope (product=${scope.product}, revision=${scope.catalogRevision}).`;
}

/**
 * Produce a complete scope-honest infeasibility diagnosis for a constraint set.
 *
 * @param {Array<object>} [constraints=[]]
 * @param {object} [options={}]
 * @returns {object} Feasibility diagnosis report
 */
function diagnoseInfeasibility(constraints = [], options = {}) {
  const normalized = (Array.isArray(constraints) ? constraints : []).map(_normalizePreservingProps);
  const summary = summarizeConstraintResults(normalized);
  const hardBeforePreferences = evaluateHardBeforePreferences(normalized, options);
  const hasConflictTrigger = summary.hardCounts.FAIL > 0 || typeof options?.checkFeasibleSubsetFn === 'function';
  const minimalConflictingSet = hasConflictTrigger
    ? computeMinimalConflictingSet(normalized, options)
    : _buildConflictSetPayload([], false, false, []);

  const hasFeasibleCandidate = summary.total > 0 &&
    summary.hardCounts.FAIL === 0 &&
    summary.hardCounts.UNKNOWN === 0 &&
    summary.hardCounts.NOT_EVALUATED === 0;

  const outcome = classifyFeasibilityOutcome({
    hasFeasibleCandidate,
    hardFailuresCount: summary.hardCounts.FAIL,
    unknownHardCount: summary.hardCounts.UNKNOWN,
    notEvaluatedCount: summary.hardCounts.NOT_EVALUATED,
    infeasibleEvaluated: summary.hardCounts.FAIL > 0
  });

  const scope = {
    product: String(options?.product || 'UNKNOWN_PRODUCT'),
    catalogRevision: String(options?.catalogRevision || 'UNSPECIFIED'),
    candidateCountEvaluated: options?.candidateCountEvaluated ?? 1,
    searchSpaceExhaustive: Boolean(options?.searchSpaceExhaustive === true)
  };
  const notEvaluatedDomains = _dedupeOrdered(
    normalized.filter(c => c.status === 'NOT_EVALUATED').map(c => c.domain)
  );

  return {
    schemaVersion: EXPLANATION_SCHEMA_VERSION,
    outcome,
    universalImpossibilityClaimed: false,
    scope,
    summary,
    hardBeforePreferences,
    minimalConflictingSet,
    missingInputs: summary.missingInputs,
    notEvaluatedDomains,
    explanation: _buildDiagnosisExplanation(outcome, summary, minimalConflictingSet, notEvaluatedDomains, scope)
  };
}

module.exports = {
  EXPLANATION_SCHEMA_VERSION,
  FEASIBILITY_OUTCOMES,
  computeMinimalConflictingSet,
  diagnoseInfeasibility,
  runBoundedFeasibilitySearch,
  classifyFeasibilityOutcome
};
