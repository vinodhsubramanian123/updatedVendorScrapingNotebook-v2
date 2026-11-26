'use strict';

/**
 * scripts/lib/conflict/sizing/pareto_ranker.js
 *
 * SI-06: Hard-Requirement Pre-Ranking Qualification, Deterministic Closest-Rank
 * Ordering, and Null-Preserving Multi-Objective Pareto Frontier.
 */

const { cleanBaseSKU } = require('../../catalog/sku.js');

const VALID_PRICE_BASES = new Set(['QUOTE', 'LIST', 'HISTORICAL']);
const DEFAULT_STALE_LEAD_TIME_MS = 72 * 3600 * 1000;

const PRICE_BASIS_ALIASES = Object.freeze({
  QUOTE: 'QUOTE',
  CUSTOMER_QUOTE: 'QUOTE',
  QUOTE_UNIT_PRICE: 'QUOTE',
  LIST: 'LIST',
  CATALOG_PRICE: 'LIST',
  OCA_LIST: 'LIST',
  HISTORICAL: 'HISTORICAL',
  HISTORICAL_PRICE: 'HISTORICAL'
});

function _pickDefined(values, fallback = null) {
  for (const val of values) {
    if (val !== undefined && val !== null && val !== '') return val;
  }
  return fallback;
}

function _codePointCompare(a, b) {
  const sa = String(_pickDefined([a], ''));
  const sb = String(_pickDefined([b], ''));
  if (sa < sb) return -1;
  if (sa > sb) return 1;
  return 0;
}

function _isFiniteNumber(val) {
  return typeof val === 'number' && Number.isFinite(val);
}

function _firstFinite(values, fallback = null) {
  for (const val of values) {
    if (_isFiniteNumber(val)) return val;
  }
  return fallback;
}

function _resolveCandidateParts(candidate) {
  if (Array.isArray(candidate.skuPartsList)) return candidate.skuPartsList;
  if (Array.isArray(candidate.items)) return candidate.items;
  if (Array.isArray(candidate.parts)) return candidate.parts;
  return [];
}

function _resolveCandidateId(candidate, fallback = 'UNKNOWN') {
  return String(_pickDefined([candidate?.candidateId, candidate?.strategyIdentity, candidate?.strategyId, candidate?.name], fallback));
}

function _indexSkuQuantities(items = []) {
  const map = new Map();
  if (!Array.isArray(items)) return map;
  for (const it of items) {
    if (!it || typeof it !== 'object') continue;
    const sku = cleanBaseSKU(_pickDefined([it.sku, it['Product #']], ''));
    if (!sku) continue;
    const rawQty = Number(_pickDefined([it.quantity, it.qty], 1));
    const qty = (Number.isFinite(rawQty) && rawQty > 0) ? rawQty : 1;
    map.set(sku, (map.get(sku) || 0) + qty);
  }
  return map;
}

function _computeCanonicalBomSignature(parts = []) {
  if (!Array.isArray(parts) || parts.length === 0) return '';
  const map = _indexSkuQuantities(parts);
  return [...map.entries()]
    .sort((a, b) => _codePointCompare(a[0], b[0]))
    .map(([sku, qty]) => `${sku}:${qty}`)
    .join('|');
}

function _tallySkuDiffs(baselineQtyMap, candQtyMap) {
  const allSkus = new Set([...baselineQtyMap.keys(), ...candQtyMap.keys()]);
  let computedLines = 0;
  let computedUnits = 0;
  for (const sku of allSkus) {
    const reqQty = _pickDefined([baselineQtyMap.get(sku)], 0);
    const candQty = _pickDefined([candQtyMap.get(sku)], 0);
    const diff = Math.abs(reqQty - candQty);
    if (diff > 0) {
      computedLines += 1;
      computedUnits += diff;
    }
  }
  return { computedLines, computedUnits };
}

function _computeLineAndUnitDeltas(candidate, baselineQtyMap) {
  const hasBaseline = Boolean(baselineQtyMap && baselineQtyMap.size > 0);
  if (!hasBaseline) {
    return {
      changedSkuLines: _firstFinite([candidate.changedSkuLines], 0),
      changedUnits: _firstFinite([candidate.changedUnits, candidate.quantityDelta], 0)
    };
  }
  const candQtyMap = _indexSkuQuantities(_resolveCandidateParts(candidate));
  const { computedLines, computedUnits } = _tallySkuDiffs(baselineQtyMap, candQtyMap);
  return {
    changedSkuLines: _firstFinite([candidate.changedSkuLines], computedLines),
    changedUnits: _firstFinite([candidate.changedUnits, candidate.quantityDelta], computedUnits)
  };
}

function _checkRequirementCoverageBlockers(candidate, reasons) {
  const cov = candidate.requirementCoverage;
  if (!cov || typeof cov !== 'object') return;
  if (cov.blocksPositiveRecommendation === true) {
    reasons.push({
      code: 'REQUIREMENT_COVERAGE_BLOCKS_RECOMMENDATION',
      source: 'requirementCoverage',
      message: 'Candidate has violated or unresolved blocking customer requirements.'
    });
    return;
  }
  const violatedCount = _firstFinite([cov.summary?.violatedCount], 0);
  if (violatedCount > 0) {
    reasons.push({
      code: 'REQUIREMENT_DISPOSITION_VIOLATED',
      source: 'requirementCoverage.summary',
      message: `Candidate violates ${violatedCount} customer requirement(s).`
    });
  }
}

function _appendHardFailureList(hardFailures, reasons) {
  if (!Array.isArray(hardFailures)) return;
  for (const f of hardFailures) {
    reasons.push({
      code: String(_pickDefined([f?.code], 'HARD_CONSTRAINT_FAILURE')),
      source: 'hardConstraintFailures',
      message: String(_pickDefined([f?.message, f], 'Hard constraint failure.'))
    });
  }
}

function _checkPhysicalAndTypedConstraints(candidate, options, reasons) {
  const enforcePhysical = options.enforcePhysicalMath !== false;
  const mathFailed = candidate.physicalMathClean === false || candidate.isMathClean === false;
  if (enforcePhysical && mathFailed) {
    const firstErr = Array.isArray(candidate.aspectErrors) ? candidate.aspectErrors[0] : null;
    reasons.push({
      code: 'PHYSICAL_MATH_VIOLATION',
      source: 'physicalMathClean',
      message: _pickDefined([firstErr], 'Candidate failed 7-aspect physical math validation.')
    });
  }
  _appendHardFailureList(_pickDefined([candidate.hardConstraintFailures, candidate.sizingEvaluation?.hardConstraintFailures]), reasons);
  if (!Array.isArray(candidate.constraintResults)) return;

  const failedTyped = candidate.constraintResults.filter(
    c => Boolean(c && c.hardness === 'HARD' && (c.status === 'FAIL' || c.status === 'UNKNOWN'))
  );
  if (failedTyped.length > 0) {
    reasons.push({
      code: 'TYPED_HARD_CONSTRAINT_FAILED',
      source: 'constraintResults',
      message: `${failedTyped.length} hard typed constraint predicate(s) evaluated to FAIL/UNKNOWN.`
    });
  }
}

function _isGateObjectFailed(gate) {
  if (gate === false) return true;
  if (!gate || typeof gate !== 'object') return false;
  return gate.pass === false || gate.status === 'FAIL' || gate.status === 'UNKNOWN';
}

function _checkFabricAndServiceGates(candidate, reasons) {
  const fp = _pickDefined([candidate.fabricParity, candidate.sizingEvaluation?.checks?.fabricParity]);
  if (_isGateObjectFailed(fp)) {
    const msg = Array.isArray(fp?.violations) ? fp.violations.join(' ') : null;
    reasons.push({
      code: 'FABRIC_PARITY_VIOLATION',
      source: 'fabricParity',
      message: _pickDefined([msg], 'Candidate violates required fabric parity.')
    });
  }
  const svc = _pickDefined([
    candidate.explicitServiceRequirement,
    candidate.explicitServiceCheck,
    candidate.sizingEvaluation?.checks?.explicitService
  ]);
  if (_isGateObjectFailed(svc)) {
    const msg = Array.isArray(svc?.violations) ? svc.violations.join(' ') : null;
    reasons.push({
      code: 'EXPLICIT_SERVICE_REQUIREMENT_VIOLATION',
      source: 'explicitServiceRequirement',
      message: _pickDefined([msg], 'Candidate violates explicit customer support/service requirement.')
    });
  }
}

/**
 * Qualify candidates against all hard requirements BEFORE any ranking or Pareto evaluation.
 */
function qualifyCandidatesBeforeRanking(candidates = [], options = {}) {
  const safeList = Array.isArray(candidates) ? candidates : [];
  const qualifiedCandidates = [];
  const disqualifiedCandidates = [];

  for (const cand of safeList) {
    if (!cand || typeof cand !== 'object') continue;
    const reasons = [];
    _checkRequirementCoverageBlockers(cand, reasons);
    _checkPhysicalAndTypedConstraints(cand, options, reasons);
    _checkFabricAndServiceGates(cand, reasons);

    const isQualified = reasons.length === 0;
    const annotated = {
      ...cand,
      qualifiedForRecommendation: isQualified,
      disqualificationReasons: reasons
    };
    if (isQualified) qualifiedCandidates.push(annotated);
    else disqualifiedCandidates.push(annotated);
  }

  return {
    qualifiedCandidates,
    disqualifiedCandidates,
    qualificationSummary: {
      totalCandidates: safeList.length,
      qualifiedCount: qualifiedCandidates.length,
      disqualifiedCount: disqualifiedCandidates.length,
      allDisqualified: safeList.length > 0 && qualifiedCandidates.length === 0
    }
  };
}

function _inferPriceBasisFromParts(parts = []) {
  if (!Array.isArray(parts) || parts.length === 0) return null;
  const statuses = parts.map(p => String(_pickDefined([p?.pricingStatus, p?.priceSource], '')).toUpperCase());
  if (statuses.some(s => s.includes('QUOTE'))) return 'QUOTE';
  if (statuses.some(s => s.includes('HISTORICAL'))) return 'HISTORICAL';
  if (statuses.some(s => s.includes('CATALOG') || s.includes('LIST'))) return 'LIST';
  return null;
}

function _normalizePriceBasisToken(rawBasis, parts = []) {
  const upper = String(_pickDefined([rawBasis], '')).trim().toUpperCase();
  if (PRICE_BASIS_ALIASES[upper]) return PRICE_BASIS_ALIASES[upper];
  return _inferPriceBasisFromParts(parts);
}

function _hasExplicitNullCostProperty(cand) {
  for (const key of ['totalCostUsd', 'costUsd', 'estimatedCostUsd']) {
    if (Object.prototype.hasOwnProperty.call(cand, key) && cand[key] === null) return true;
  }
  return false;
}

function _hasUnpricedPart(parts = []) {
  if (!Array.isArray(parts)) return false;
  return parts.some(p => Boolean(p && p.priceKnown === false));
}

function _isCandidateCostComplete(cand, rawCost, hasExplicitNull, parts = []) {
  if (cand.pricingComplete === false || hasExplicitNull) return false;
  if (_hasUnpricedPart(parts)) return false;
  if (Array.isArray(cand.priceUnavailableSkus) && cand.priceUnavailableSkus.length > 0) return false;
  if (!_isFiniteNumber(rawCost) || rawCost < 0) return false;
  if (rawCost === 0 && cand.pricingComplete !== true && cand.isConfirmedZeroPrice !== true) return false;
  return true;
}

function _extractCandidatePriceMetadata(cand, options = {}) {
  const parts = _resolveCandidateParts(cand);
  const hasExplicitNull = _hasExplicitNullCostProperty(cand);
  const rawCost = hasExplicitNull
    ? null
    : _firstFinite([cand.totalCostUsd, cand.costUsd, cand.estimatedCostUsd, cand.budgetBreakdown?.totalBudgetUsd]);

  const pricingComplete = _isCandidateCostComplete(cand, rawCost, hasExplicitNull, parts);
  const costUsd = pricingComplete ? rawCost : null;
  const priceBasis = _normalizePriceBasisToken(_pickDefined([cand.priceBasis, cand.pricingBasis]), parts);
  const defaultCurrency = _pickDefined([options.currency, costUsd !== null ? 'USD' : null], null);
  const currency = cand.currency !== undefined ? cand.currency : defaultCurrency;

  return {
    costUsd,
    pricingComplete,
    priceBasis,
    currency,
    region: _pickDefined([cand.region, options.region], null),
    observedAt: _pickDefined([cand.priceObservedAt, cand.observedAt, options.observedAt], null)
  };
}

function _isTimestampStale(observedAt, nowMs, maxAgeMs) {
  if (!observedAt) return false;
  const parsed = Date.parse(observedAt);
  if (!Number.isFinite(parsed)) return false;
  return (nowMs - parsed) > maxAgeMs;
}

function _resolveRawLeadTimeDays(cand) {
  const unknownCount = _firstFinite([cand.supplyMetrics?.unknownLeadTimeCount], 0);
  if (unknownCount > 0 && cand.leadTimeDays === undefined) return null;
  const candidateVal = _firstFinite([
    cand.leadTimeDays,
    cand.supplyMetrics?.solutionEdtDays,
    cand.supplyMetrics?.maxLeadTimeDays
  ]);
  return (candidateVal !== null && candidateVal >= 0) ? candidateVal : null;
}

function _extractCandidateLeadTimeMetadata(cand, options = {}) {
  const leadTimeDays = _resolveRawLeadTimeDays(cand);
  const nowMs = _firstFinite([options.nowMs], Date.now());
  const maxAgeMs = _firstFinite([options.maxLeadTimeAgeMs], DEFAULT_STALE_LEAD_TIME_MS);
  const leadObservedAt = _pickDefined([cand.leadTimeObservedAt, cand.observedAt], null);
  const isStaleLeadTime = Boolean(
    cand.isStaleLeadTime === true ||
    cand.leadTimeStale === true ||
    _isTimestampStale(leadObservedAt, nowMs, maxAgeMs)
  );

  return {
    leadTimeDays,
    comparableLeadTimeDays: (leadTimeDays !== null && !isStaleLeadTime) ? leadTimeDays : null,
    isStaleLeadTime,
    leadTimeObservedAt: leadObservedAt
  };
}

function _extractPerformanceCapacityScore(cand) {
  const direct = _firstFinite([cand.performanceScore, cand.capacityScore, cand.throughputScore]);
  if (direct !== null) return direct;

  const resilience = cand.sizingEvaluation?.checks?.resilience;
  const survMem = _firstFinite([resilience?.survivingMemoryGb]);
  const survCores = _firstFinite([resilience?.survivingCores]);
  if (survMem !== null || survCores !== null) {
    return Number((_pickDefined([survMem], 0) + (_pickDefined([survCores], 0) * 8)).toFixed(2));
  }
  return null;
}

function _decorateCandidateForRanking(cand, baselineQtyMap, options) {
  const { changedSkuLines, changedUnits } = _computeLineAndUnitDeltas(cand, baselineQtyMap);
  const priceMeta = _extractCandidatePriceMetadata(cand, options);
  const leadMeta = _extractCandidateLeadTimeMetadata(cand, options);
  const perfScore = _extractPerformanceCapacityScore(cand);
  const downgradePenalty = _firstFinite([cand.capabilityDowngradePenalty], 0);
  const archDelta = _firstFinite([cand.architecturalDelta], 0);
  const parts = _resolveCandidateParts(cand);
  const canonicalBomSignature = _pickDefined([cand.bomFingerprint], _computeCanonicalBomSignature(parts));

  return {
    ...cand,
    changedSkuLines,
    changedUnits,
    quantityDelta: _firstFinite([cand.quantityDelta], changedUnits),
    capabilityDowngradePenalty: downgradePenalty,
    architecturalDelta: archDelta,
    bomFingerprint: canonicalBomSignature,
    priceMetadata: priceMeta,
    leadTimeMetadata: leadMeta,
    performanceCapacityScore: perfScore,
    workloadTradeoffs: {
      capabilityDowngradePenalty: downgradePenalty,
      isEquivalentCapability: downgradePenalty === 0,
      architecturalDelta: archDelta,
      performanceCapacityScore: perfScore,
      numaInterleavingMode: _pickDefined([cand.numaInterleavingMode, cand.sizingEvaluation?.checks?.numa?.interleavingMode], null),
      costUsd: priceMeta.costUsd,
      priceBasis: priceMeta.priceBasis,
      leadTimeDays: leadMeta.leadTimeDays,
      isStaleLeadTime: leadMeta.isStaleLeadTime,
      separatedFromEligibility: true
    },
    _canonicalIdentity: _resolveCandidateId(cand, ''),
    _canonicalBomSignature: canonicalBomSignature
  };
}

function _compareAsc(valA, valB) {
  if (valA === valB) return 0;
  return valA - valB;
}

function _compareQualifiedCandidates(a, b) {
  if (Boolean(a.qualifiedForRecommendation) !== Boolean(b.qualifiedForRecommendation)) {
    return a.qualifiedForRecommendation ? -1 : 1;
  }
  const mathA = _pickDefined([a.physicalMathClean], false);
  const mathB = _pickDefined([b.physicalMathClean], false);
  if (Boolean(mathA) !== Boolean(mathB)) return mathA ? -1 : 1;

  const primaryDiff = _compareAsc(a.capabilityDowngradePenalty, b.capabilityDowngradePenalty) ||
    _compareAsc(a.changedSkuLines, b.changedSkuLines) ||
    _compareAsc(a.changedUnits, b.changedUnits) ||
    _compareAsc(a.architecturalDelta, b.architecturalDelta);
  if (primaryDiff !== 0) return primaryDiff;

  return _compareSecondaryTieBreakers(a, b);
}

function _compareSecondaryTieBreakers(a, b) {
  const dynA = _firstFinite([a.dynamicScore, a.score], 0);
  const dynB = _firstFinite([b.dynamicScore, b.score], 0);
  if (dynB !== dynA) return dynB - dynA;

  const unavailA = _firstFinite([a.supplyMetrics?.unavailableCount], 0);
  const unavailB = _firstFinite([b.supplyMetrics?.unavailableCount], 0);
  if (unavailA !== unavailB) return unavailA - unavailB;

  const leadA = _firstFinite([a.leadTimeMetadata?.comparableLeadTimeDays], Number.POSITIVE_INFINITY);
  const leadB = _firstFinite([b.leadTimeMetadata?.comparableLeadTimeDays], Number.POSITIVE_INFINITY);
  if (leadA !== leadB) return leadA - leadB;

  const costA = _firstFinite([a.priceMetadata?.costUsd], Number.POSITIVE_INFINITY);
  const costB = _firstFinite([b.priceMetadata?.costUsd], Number.POSITIVE_INFINITY);
  if (costA !== costB) return costA - costB;

  return _codePointCompare(a._canonicalBomSignature, b._canonicalBomSignature) ||
    _codePointCompare(a._canonicalIdentity, b._canonicalIdentity);
}

function _stripInternalSortKeys(cand, qualifiedRank) {
  const copy = { ...cand, qualifiedRank };
  delete copy._canonicalIdentity;
  delete copy._canonicalBomSignature;
  return copy;
}

/**
 * Deterministically rank qualified candidates under customer closest-rank policy.
 */
function rankQualifiedCandidatesDeterministically(candidates = [], options = {}) {
  const baselineItems = _pickDefined([options.baselineItems, options.requestedItems], []);
  const baselineQtyMap = _indexSkuQuantities(baselineItems);
  const qualification = qualifyCandidatesBeforeRanking(candidates, options);

  const decoratedQualified = qualification.qualifiedCandidates
    .map(c => _decorateCandidateForRanking(c, baselineQtyMap, options))
    .sort(_compareQualifiedCandidates)
    .map((c, idx) => _stripInternalSortKeys(c, idx + 1));

  const decoratedDisqualified = qualification.disqualifiedCandidates
    .map(c => _decorateCandidateForRanking(c, baselineQtyMap, options))
    .sort(_compareQualifiedCandidates)
    .map(c => _stripInternalSortKeys(c, null));

  const result = [...decoratedQualified];
  Object.defineProperties(result, {
    rankedCandidates: { value: decoratedQualified, enumerable: false },
    qualifiedCandidates: { value: decoratedQualified, enumerable: false },
    disqualifiedCandidates: { value: decoratedDisqualified, enumerable: false },
    allCandidatesOrdered: { value: [...decoratedQualified, ...decoratedDisqualified], enumerable: false },
    qualificationSummary: { value: qualification.qualificationSummary, enumerable: false }
  });
  return result;
}

function _compareMinDimension(valA, valB) {
  if (valA === null && valB === null) {
    return { comparable: true, noWorse: true, strictlyBetter: false };
  }
  if (valA === null || valB === null) {
    return { comparable: false, noWorse: false, strictlyBetter: false };
  }
  return {
    comparable: true,
    noWorse: valA <= valB,
    strictlyBetter: valA < valB
  };
}

function _compareMaxDimension(valA, valB) {
  if (valA === null && valB === null) {
    return { noWorse: true, strictlyBetter: false };
  }
  if (valA === null || valB === null) {
    return { noWorse: valA !== null, strictlyBetter: false };
  }
  return { noWorse: valA >= valB, strictlyBetter: valA > valB };
}

function _currenciesMatch(metaA, metaB) {
  if (!metaA.currency || !metaB.currency) return true;
  return metaA.currency === metaB.currency;
}

function _candidateADominatesB(a, b) {
  if (!_currenciesMatch(a.priceMetadata, b.priceMetadata)) return false;

  const costCmp = _compareMinDimension(a.priceMetadata.costUsd, b.priceMetadata.costUsd);
  const leadCmp = _compareMinDimension(
    a.leadTimeMetadata.comparableLeadTimeDays,
    b.leadTimeMetadata.comparableLeadTimeDays
  );
  if (!costCmp.comparable || !leadCmp.comparable) return false;

  const perfCmp = _compareMaxDimension(a.performanceCapacityScore, b.performanceCapacityScore);
  const allNoWorse = costCmp.noWorse && leadCmp.noWorse && perfCmp.noWorse;
  const anyStrictlyBetter = costCmp.strictlyBetter || leadCmp.strictlyBetter || perfCmp.strictlyBetter;
  return allNoWorse && anyStrictlyBetter;
}

function _deduplicateEligibleCandidates(rankedQualified) {
  const seenFingerprints = new Set();
  const uniqueEligible = [];
  for (const cand of rankedQualified) {
    const fp = _pickDefined([cand.bomFingerprint], _resolveCandidateId(cand));
    if (fp && seenFingerprints.has(fp)) continue;
    if (fp) seenFingerprints.add(fp);
    uniqueEligible.push(cand);
  }
  return uniqueEligible;
}

function _findDominatingCandidateId(target, targetIndex, uniqueEligible) {
  for (let j = 0; j < uniqueEligible.length; j++) {
    if (targetIndex === j) continue;
    const contender = uniqueEligible[j];
    if (_candidateADominatesB(contender, target)) {
      return _resolveCandidateId(contender, `rank_${contender.qualifiedRank}`);
    }
  }
  return null;
}

function _buildEvaluatedCandidateSetScope(allSubmitted, qualified, disqualified, options = {}) {
  const searchSpaceComplete = options.searchSpaceComplete === true;
  const allEligiblePricesKnown = qualified.length > 0 &&
    qualified.every(c => c.priceMetadata.costUsd !== null && c.priceMetadata.pricingComplete === true);
  const allEligibleLeadTimesFresh = qualified.length > 0 &&
    qualified.every(c => c.leadTimeMetadata.comparableLeadTimeDays !== null);

  return {
    scopeId: _pickDefined([options.scopeId, options.product], 'SCOPED_CANDIDATE_SET'),
    product: _pickDefined([options.product, options.chassis], null),
    catalogRevision: _pickDefined([options.catalogRevision], null),
    totalCandidatesEvaluated: allSubmitted.length,
    eligibleCandidateCount: qualified.length,
    disqualifiedCandidateCount: disqualified.length,
    evaluatedCandidateIds: allSubmitted.map(c => _resolveCandidateId(c)),
    eligibleCandidateIds: qualified.map(c => _resolveCandidateId(c)),
    searchSpaceComplete,
    allEligiblePricesKnown,
    allEligibleLeadTimesFresh
  };
}

function _buildMinimumCostClaim(uniqueEligible, evaluatedCandidateSet) {
  const pricedEligible = uniqueEligible
    .filter(c => c.priceMetadata.costUsd !== null)
    .sort((a, b) => a.priceMetadata.costUsd - b.priceMetadata.costUsd);
  const minCostCandidate = _pickDefined([pricedEligible[0]], null);
  const isGlobalMinimum = Boolean(
    evaluatedCandidateSet.searchSpaceComplete === true &&
    evaluatedCandidateSet.allEligiblePricesKnown === true &&
    minCostCandidate !== null
  );

  return {
    isGlobalMinimum,
    minimumCostClaim: {
      lowestKnownCostUsd: minCostCandidate ? minCostCandidate.priceMetadata.costUsd : null,
      lowestKnownCostCandidateId: minCostCandidate ? _resolveCandidateId(minCostCandidate) : null,
      priceBasis: minCostCandidate ? minCostCandidate.priceMetadata.priceBasis : null,
      currency: minCostCandidate ? minCostCandidate.priceMetadata.currency : null,
      isGlobalMinimum,
      claimScope: isGlobalMinimum
        ? 'GLOBAL_MINIMUM_IN_COMPLETE_DECLARED_SCOPE'
        : 'SCOPED_TO_EVALUATED_CANDIDATE_SET_ONLY'
    }
  };
}

/**
 * Compute the non-dominated Pareto trade-off frontier across cost, delivery lead time,
 * and performance/capacity while preserving null prices and null/stale lead times.
 */
function computeParetoFrontier(candidates = [], options = {}) {
  const safeCandidates = Array.isArray(candidates) ? candidates : [];
  const rankedQualified = rankQualifiedCandidatesDeterministically(safeCandidates, options);
  const disqualified = rankedQualified.disqualifiedCandidates || [];
  const uniqueEligible = _deduplicateEligibleCandidates(rankedQualified);

  const frontier = [];
  const dominatedCandidates = [];

  for (let i = 0; i < uniqueEligible.length; i++) {
    const target = uniqueEligible[i];
    const dominatedBy = _findDominatingCandidateId(target, i, uniqueEligible);
    const annotated = {
      ...target,
      isParetoOptimal: dominatedBy === null,
      dominatedByCandidateId: dominatedBy
    };
    if (dominatedBy === null) frontier.push(annotated);
    else dominatedCandidates.push(annotated);
  }

  const evaluatedCandidateSet = _buildEvaluatedCandidateSetScope(
    safeCandidates,
    uniqueEligible,
    disqualified,
    options
  );
  const { isGlobalMinimum, minimumCostClaim } = _buildMinimumCostClaim(uniqueEligible, evaluatedCandidateSet);

  return {
    schemaVersion: '1.0',
    frontierCandidates: frontier,
    dominatedCandidates,
    disqualifiedCandidates: disqualified,
    evaluatedCandidateSet,
    isGlobalMinimum,
    minimumCostClaim
  };
}

module.exports = {
  VALID_PRICE_BASES,
  qualifyCandidatesBeforeRanking,
  rankQualifiedCandidatesDeterministically,
  computeParetoFrontier
};
