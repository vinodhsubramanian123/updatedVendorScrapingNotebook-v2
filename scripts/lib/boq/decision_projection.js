'use strict';
/**
 * scripts/lib/boq/decision_projection.js — Unified Customer Decision Projection (SI-07)
 *
 * Pure leaf module producing the canonical SolutionIntelligenceEnvelope (v1.0)
 * consumed identically by JSON serializers, Markdown reports, analytical XLSX
 * workbooks, BOM verification gates, Dashboard routes/banners, Guardrail prompts,
 * and MCP tools.
 *
 * DAG invariant: NEVER import eval_output_serializer.js, generate_boq_xlsx.js,
 * bom_verifier.js, dashboard/*, or mcp_server.js from this module.
 */

const { verifyCurrentPortalReceipt } = require('./portal_receipt.js');

const SCHEMA_VERSION = '1.0';

function _isPlainObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function _firstNonNull(candidates) {
  for (const val of candidates) {
    if (val !== undefined && val !== null) return val;
  }
  return null;
}

function _firstNonEmptyArr(candidates) {
  for (const list of candidates) {
    if (Array.isArray(list) && list.length > 0) return list;
  }
  return [];
}

function _isFiniteNum(val) {
  return typeof val === 'number' && Number.isFinite(val);
}

function _unwrapEvaluation(evalResults) {
  if (!_isPlainObject(evalResults)) {
    return {
      isEmptyInput: true,
      top: {},
      inner: {},
      ev: {},
      items: [],
      aspectChecks: [],
      candidates: [],
      reqAcc: null,
      claimAdj: null,
      depInvalidation: null,
      docReview: null,
      constraintResults: [],
      traces: [],
      errors: [],
      missingDeps: [],
      resolvedFixes: []
    };
  }
  const top = evalResults;
  const inner = _isPlainObject(top.evalResults) ? top.evalResults : {};
  const ev = { ...inner, ...top };
  const items = _firstNonEmptyArr([top.items, inner.items, top.parsedItems, inner.parsedItems]);
  const aspectChecks = _firstNonEmptyArr([inner.aspectChecks, top.aspectChecks, inner.evalSummary?.aspectChecks, top.evalSummary?.aspectChecks]);
  const candidates = _firstNonEmptyArr([
    top.conflictGraph?.rankedSolutions,
    inner.conflictGraph?.rankedSolutions,
    top.rankedSolutions,
    inner.rankedSolutions,
    top.conflictGraph?.recommendedSolutions,
    inner.conflictGraph?.recommendedSolutions,
    top.recommendedSolutions,
    inner.recommendedSolutions
  ]);
  const reqAcc = _firstNonNull([
    top.requirementAccounting,
    inner.requirementAccounting,
    top.requirementResolution?.requirementAccounting,
    inner.requirementResolution?.requirementAccounting
  ]);
  const claimAdj = _firstNonNull([
    top.claimAdjudication,
    inner.claimAdjudication,
    top.ephemeralSourceValidation?.claimAdjudication,
    inner.ephemeralSourceValidation?.claimAdjudication
  ]);
  const depInvalidation = _firstNonNull([top.dependencyInvalidation, inner.dependencyInvalidation]);
  const docReview = _firstNonNull([top.ephemeralSourceValidation, inner.ephemeralSourceValidation, top.solutionDoubleCheck, inner.solutionDoubleCheck]);
  const constraintResults = _firstNonEmptyArr([
    top.conflictGraph?.constraintResults,
    inner.conflictGraph?.constraintResults,
    top.constraintResults,
    inner.constraintResults
  ]);
  const traces = _firstNonEmptyArr([
    top.decisionTrace,
    inner.decisionTrace,
    top.traces,
    inner.traces,
    top.workflowSteps,
    inner.workflowSteps,
    top.provenanceTrace?.stages,
    inner.provenanceTrace?.stages
  ]);
  const errors = _firstNonEmptyArr([inner.errors, top.errors]);
  const missingDeps = _firstNonEmptyArr([inner.missingDependencies, top.missingDependencies]);
  const resolvedFixes = _firstNonEmptyArr([
    top.conflictGraph?.resolvedFixes,
    inner.conflictGraph?.resolvedFixes,
    top.resolvedFixes,
    inner.resolvedFixes
  ]);

  return {
    isEmptyInput: false,
    top,
    inner,
    ev,
    items,
    aspectChecks,
    candidates,
    reqAcc,
    claimAdj,
    depInvalidation,
    docReview,
    constraintResults,
    traces,
    errors,
    missingDeps,
    resolvedFixes
  };
}

function _hasAnyCoreLists(ctx) {
  return (
    ctx.items.length > 0 ||
    ctx.aspectChecks.length > 0 ||
    ctx.candidates.length > 0 ||
    ctx.traces.length > 0
  );
}

function _hasAnyIssueOrContractSignals(ctx) {
  const reqCount = ctx.reqAcc?.records?.length || ctx.reqAcc?.totalClauses || 0;
  const claimCount = ctx.claimAdj?.claims?.length || 0;
  return Boolean(
    ctx.errors.length > 0 ||
    ctx.missingDeps.length > 0 ||
    ctx.resolvedFixes.length > 0 ||
    reqCount > 0 ||
    claimCount > 0 ||
    ctx.constraintResults.length > 0
  );
}

function _hasAnyEvaluationData(ctx) {
  if (ctx.isEmptyInput) return false;
  if (_hasAnyCoreLists(ctx) || _hasAnyIssueOrContractSignals(ctx)) return true;
  return Boolean(typeof ctx.ev.isMathClean === 'boolean' || ctx.ev.customerDisposition || ctx.docReview);
}

/**
 * Strict candidate document review check aligned 1:1 with Tier 2 governance rules.
 * NEVER promotes bare `{ success: true }` or mock/simulation reviews.
 *
 * @param {object|null} docReview
 * @returns {boolean}
 */
function isStrictDocumentReviewVerified(docReview) {
  if (!_isPlainObject(docReview)) return false;
  if (docReview.success !== true || docReview.isCloudGrounded !== true || docReview.sourceDetached !== true) return false;
  if (docReview.doubleCheckVerdict !== 'DOUBLE_CHECK_PASSED') return false;
  if (docReview.attachment?.isMock === true || docReview.isMock === true || docReview.simulationPassed === true) return false;
  if (!Array.isArray(docReview.citations) || docReview.citations.length === 0) return false;
  return Array.isArray(docReview.authoritativeSourceIds) && docReview.authoritativeSourceIds.length > 0;
}

function _hasPhysicalFailure(ctx) {
  if (ctx.ev.isMathClean === false || ctx.errors.length > 0 || ctx.missingDeps.length > 0) return true;
  if (ctx.aspectChecks.some(c => c && (c.status === 'FAIL' || c.status === 'FAILED'))) return true;
  return ctx.constraintResults.some(c => c && c.hardness === 'HARD' && c.status === 'FAIL');
}

function _hasIncompletePhysicalChecks(ctx) {
  const incompleteAspect = ctx.aspectChecks.some(c => c && ['UNKNOWN', 'NOT_EVALUATED', 'ACTION_REQUIRED'].includes(c.status));
  const incompleteHard = ctx.constraintResults.some(c => c && c.hardness === 'HARD' && ['UNKNOWN', 'NOT_EVALUATED'].includes(c.status));
  return incompleteAspect || incompleteHard;
}

function _resolveLocalPhysicalState(ctx, hasData) {
  if (!hasData) return 'NOT_EVALUATED';
  const hasChecks = ctx.aspectChecks.length > 0 || typeof ctx.ev.isMathClean === 'boolean' ||
    ctx.errors.length > 0 || ctx.missingDeps.length > 0 || ctx.constraintResults.length > 0;
  if (!hasChecks) return 'NOT_EVALUATED';
  if (_hasPhysicalFailure(ctx)) return 'FAILED';
  if (_hasIncompletePhysicalChecks(ctx)) return 'INCOMPLETE';
  return 'PASSED';
}

function _hasClaimContradiction(claimAdj) {
  if (!claimAdj) return false;
  return claimAdj.hasContradictions === true ||
    claimAdj.overallStatus === 'CONTRADICTED' ||
    (claimAdj.contradictionCount || 0) > 0;
}

function _resolveUnverifiedDocReviewState(dr) {
  if (dr.attachment?.isMock === true || dr.isMock === true || dr.simulationPassed === true) return 'SIMULATION_ONLY';
  if (dr.doubleCheckVerdict && dr.doubleCheckVerdict !== 'DOUBLE_CHECK_PASSED') return String(dr.doubleCheckVerdict);
  return 'INCOMPLETE_EVIDENCE';
}

function _resolveDocumentGroundingState(ctx, hasData, isOffline) {
  if (_hasClaimContradiction(ctx.claimAdj)) return 'CONTRADICTED';
  const dr = ctx.docReview;
  if (dr?.doubleCheckVerdict === 'DOUBLE_CHECK_REJECTED') return 'DOUBLE_CHECK_REJECTED';
  if (isStrictDocumentReviewVerified(dr)) return 'DOUBLE_CHECK_PASSED';
  if (_isPlainObject(dr)) return _resolveUnverifiedDocReviewState(dr);
  if (isOffline) return 'NOT_RUN_LOCAL_ONLY';
  if (ctx.ev.notebookHealth?.isHealthy === false || ctx.ev.notebookDegradedMode) return 'DEGRADED_UNGROUNDED';
  return hasData ? 'UNVERIFIED' : 'NOT_EVALUATED';
}

function _resolveLiveVendorState(ctx, options) {
  try {
    const verified = verifyCurrentPortalReceipt(ctx.ev, options);
    if (verified && (verified.manifestSha256 || verified.status === 'CLIC_ACCEPTED')) {
      return 'CLIC_ACCEPTED';
    }
  } catch (_) {
    // Missing or unreadable receipt falls through to PORTAL_VALIDATION_PENDING
  }
  return 'PORTAL_VALIDATION_PENDING';
}

function _resolveCloudSyncState(ctx, hasData, isOffline) {
  if (isOffline) return 'NOT_RUN_LOCAL_ONLY';
  if (ctx.ev.postFlowSync?.syncStatus) return String(ctx.ev.postFlowSync.syncStatus);
  if (ctx.ev.notebookHealth?.isHealthy === false || ctx.ev.cloudSyncState === 'FAILED' || ctx.ev.notebookDegradedMode) return 'DEGRADED';
  if (ctx.ev.cloudSyncState === 'VERIFIED' || ctx.ev.cloudGroundingStatus === 'CLOUD_VERIFIED') return 'CLOUD_VERIFIED';
  if (!hasData) return 'NOT_EVALUATED';
  return 'NOT_SYNCED';
}

function _resolveDeliveryAuthState(ctx, hasData) {
  if (ctx.depInvalidation?.isStale === true) return 'BLOCKED_STALE_DEPENDENCY';
  if (ctx.ev.acceptanceGate?.isValid === false || ctx.ev.customerDisposition === 'DELIVERY_BLOCKED_UNBUILDABLE' || ctx.ev.deliveryAuthError) {
    return 'BLOCKED';
  }
  if (ctx.ev.acceptanceGate?.isValid === true && ctx.ev.deliveryAuthorization?.token && ctx.ev.deliveryAuthorization?.signature) {
    return 'AUTHORIZED';
  }
  if (!hasData) return 'NOT_EVALUATED';
  return 'PENDING';
}

function _resolveDependencyInvalidationState(ctx) {
  if (ctx.depInvalidation?.isStale === true) return 'STALE_INVALIDATED';
  if (_isPlainObject(ctx.depInvalidation)) return 'VALID';
  return 'NOT_EVALUATED';
}

function _buildEvidenceStatesFromCtx(ctx, hasData, options = {}) {
  const isOffline = Boolean(
    ctx.ev.offlineMode === true ||
    ctx.ev.effectivePolicy?.offline === true ||
    options.offline === true
  );
  return {
    localPhysicalChecks: _resolveLocalPhysicalState(ctx, hasData),
    documentGrounding: _resolveDocumentGroundingState(ctx, hasData, isOffline),
    liveVendorAcceptance: _resolveLiveVendorState(ctx, options),
    cloudSynchronization: _resolveCloudSyncState(ctx, hasData, isOffline),
    deliveryAuthorization: _resolveDeliveryAuthState(ctx, hasData),
    dependencyInvalidationStatus: _resolveDependencyInvalidationState(ctx)
  };
}

/**
 * Build strictly separated independent evidence states for an evaluation.
 *
 * @param {object|null} evalResults
 * @param {object} [options]
 * @returns {object}
 */
function buildEvidenceSummaryStates(evalResults, options = {}) {
  const ctx = _unwrapEvaluation(evalResults);
  const hasData = _hasAnyEvaluationData(ctx);
  return _buildEvidenceStatesFromCtx(ctx, hasData, options);
}

function _tallyRawDispositions(dispositions, summary, cov) {
  let violatedHardCount = 0;
  let unresolvedHardCount = 0;
  for (const d of dispositions) {
    if (!d || d.hardness === 'PREFERENCE') continue;
    if (d.disposition === 'VIOLATED') violatedHardCount++;
    else if (d.disposition === 'UNRESOLVED') unresolvedHardCount++;
  }
  if (dispositions.length === 0 && cov) {
    violatedHardCount = Number(summary.violatedCount ?? cov.violatedHardCount ?? 0);
    unresolvedHardCount = Number(summary.unresolvedCount ?? cov.unresolvedHardCount ?? 0);
  }
  return { violatedHardCount, unresolvedHardCount };
}

function _countDispositionsForCandidate(cand, records) {
  const cov = cand?.requirementCoverage || null;
  const dispositions = Array.isArray(cov?.dispositions) ? cov.dispositions : [];
  const summary = cov?.summary || {};
  const dispMap = new Map(dispositions.map(d => [d.requirementId, d]));
  const { violatedHardCount, unresolvedHardCount } = _tallyRawDispositions(dispositions, summary, cov);
  const omittedIds = records.length > 0 ? records.filter(r => !dispMap.has(r.id)).map(r => r.id) : [];
  const omittedClausesCount = Number.isFinite(cov?.omittedClausesCount)
    ? Math.max(cov.omittedClausesCount, omittedIds.length)
    : omittedIds.length;

  return { cov, dispositions, dispMap, violatedHardCount, unresolvedHardCount, omittedClausesCount, omittedIds };
}

function _candidateBlocksRecommendation(counts) {
  return Boolean(
    counts.cov?.blocksPositiveRecommendation ||
    counts.violatedHardCount > 0 ||
    counts.unresolvedHardCount > 0 ||
    counts.omittedClausesCount > 0
  );
}

function _buildCandidateCoverageSummary(cand, records) {
  const counts = _countDispositionsForCandidate(cand, records);
  const summary = counts.cov?.summary || {};
  const satisfiedFallback = counts.dispositions.filter(d => d.disposition === 'SATISFIED').length;
  return {
    rank: cand?.rank ?? null,
    name: cand?.name || (cand?.rank != null ? `Rank ${cand.rank}` : 'Candidate'),
    coverageStatus: summary.coverageStatus || (counts.cov ? 'EVALUATED' : 'NOT_EVALUATED'),
    totalRequirements: summary.totalRequirements ?? counts.dispositions.length,
    satisfiedCount: summary.satisfiedCount ?? satisfiedFallback,
    violatedHardCount: counts.violatedHardCount,
    unresolvedHardCount: counts.unresolvedHardCount,
    omittedClausesCount: counts.omittedClausesCount,
    blocksPositiveRecommendation: _candidateBlocksRecommendation(counts),
    dispositions: counts.dispositions
  };
}

function _resolveSelectedCandidate(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  return candidates.find(c => c && c.qualifiedForRecommendation !== false && c.physicalMathClean !== false) || candidates[0];
}

function _buildClauseProjectionRow(rec, dispMap) {
  const disp = dispMap ? dispMap.get(rec.id) : null;
  const isUnknownClause = rec.parseStatus === 'UNINTERPRETED' || rec.isAmbiguous;
  const fallbackDisposition = isUnknownClause ? 'UNRESOLVED' : 'NOT_EVALUATED';
  const fallbackReason = rec.isAmbiguous ? 'AMBIGUOUS_REQUIREMENT' : (rec.parseStatus === 'UNINTERPRETED' ? 'UNINTERPRETED_CLAUSE' : null);
  return {
    id: rec.id,
    rawText: rec.rawText,
    hardness: rec.hardness || 'HARD_CONSTRAINT',
    parseStatus: rec.parseStatus || 'PARSED',
    scope: rec.scope || null,
    provenance: rec.provenance || null,
    disposition: disp ? disp.disposition : fallbackDisposition,
    reason: disp?.reason || fallbackReason
  };
}

function _resolveHardCountsBaseline(reqAcc, records, selectedStats) {
  const hardRecords = records.filter(r => r && r.hardness !== 'PREFERENCE');
  const covSummary = selectedStats?.cov?.summary || {};
  const fallbackHard = Number(covSummary.hardConstraintCount || 0) + Number(covSummary.exclusionCount || 0);
  const hardRequirementsCount = records.length > 0 ? hardRecords.length : Math.max(fallbackHard, Number(reqAcc.hardRequirementsCount || 0));
  const recordUnresolved = hardRecords.filter(r => r.parseStatus === 'UNINTERPRETED' || r.isAmbiguous).length;
  return { hardRecords, hardRequirementsCount, recordUnresolved };
}

function _computeHardCoverageAggregates(ctx, records, selectedStats) {
  const reqAcc = ctx.reqAcc || {};
  const fallbackOmitted = Array.isArray(reqAcc.omittedClauses) ? reqAcc.omittedClauses.length : 0;
  const explicitOmitted = Number(reqAcc.omittedClausesCount ?? fallbackOmitted);
  const omittedClausesCount = selectedStats ? Math.max(explicitOmitted, selectedStats.omittedClausesCount) : explicitOmitted;
  const { hardRecords, hardRequirementsCount, recordUnresolved } = _resolveHardCountsBaseline(reqAcc, records, selectedStats);
  const violatedHardCount = Math.max(selectedStats ? selectedStats.violatedHardCount : 0, Number(reqAcc.violatedHardCount || 0));
  const baseUnresolved = selectedStats ? selectedStats.unresolvedHardCount : recordUnresolved;
  let unresolvedHardCount = Math.max(baseUnresolved, Number(reqAcc.unresolvedHardCount || 0));
  if (!selectedStats?.cov && records.length > 0 && ctx.candidates.length === 0) {
    unresolvedHardCount = Math.max(unresolvedHardCount, hardRecords.length);
  }
  return { omittedClausesCount, hardRequirementsCount, violatedHardCount, unresolvedHardCount };
}

function _deriveRequirementCoverage(ctx, hasData) {
  const existing = _firstNonNull([ctx.ev.solutionIntelligence?.requirementCoverage]);
  if (!ctx.reqAcc && existing && hasData) return existing;
  const records = Array.isArray(ctx.reqAcc?.records) ? ctx.reqAcc.records : [];
  const selected = _resolveSelectedCandidate(ctx.candidates);
  const byCandidate = ctx.candidates.map(cand => _buildCandidateCoverageSummary(cand, records));
  const selectedStats = selected ? _countDispositionsForCandidate(selected, records) : null;
  const agg = _computeHardCoverageAggregates(ctx, records, selectedStats);
  return {
    totalClauses: ctx.reqAcc?.totalClauses ?? records.length,
    ...agg,
    clauses: records.map(rec => _buildClauseProjectionRow(rec, selectedStats?.dispMap)),
    byCandidate
  };
}

function _indexSkuQty(items = []) {
  const map = new Map();
  for (const it of items) {
    const sku = String(it?.sku || it?.['Product #'] || '').trim();
    if (!sku) continue;
    const qty = Number(it.quantity ?? it.qty ?? 1) || 1;
    const existing = map.get(sku) || { qty: 0, part: it };
    map.set(sku, { qty: existing.qty + qty, part: existing.part });
  }
  return map;
}

function _pickReasonAndSource(fixEntry, part, defaultReason, defaultSource) {
  const reason = _firstNonNull([fixEntry?.rule, fixEntry?.reason, part?.reason, fixEntry?.description, part?.description, defaultReason]);
  const fallbackSrc = part?.isFixInjected ? 'ASPECT_RULE_ENGINE' : defaultSource;
  const sourceRef = _firstNonNull([fixEntry?.ruleId, part?.ruleId, fixEntry?.rule, fallbackSrc]);
  return { reason: String(reason), sourceRef: String(sourceRef) };
}

function _buildSwapChangeEntry(sku, beforeQty, afterQty, swapOut, swapIn) {
  if (swapOut) {
    return {
      sku,
      beforeQty,
      afterQty,
      action: 'SUBSTITUTE_OUT',
      reason: `Replaced with ${swapOut.replacementSku} (${swapOut.originalLeadTimeDays ?? '?'}d -> ${swapOut.replacementLeadTimeDays ?? '?'}d)`,
      sourceRef: 'SUPPLY_LEAD_TIME_SUBSTITUTION'
    };
  }
  return {
    sku,
    beforeQty,
    afterQty,
    action: 'SUBSTITUTE_IN',
    reason: `Replaces ${swapIn.originalSku} (${swapIn.originalLeadTimeDays ?? '?'}d -> ${swapIn.replacementLeadTimeDays ?? '?'}d)`,
    sourceRef: 'SUPPLY_LEAD_TIME_SUBSTITUTION'
  };
}

function _buildFactualChangeEntry(sku, beforeQty, afterQty, part, fixEntry, swapOut, swapIn) {
  if (swapOut || swapIn) return _buildSwapChangeEntry(sku, beforeQty, afterQty, swapOut, swapIn);
  if (beforeQty === 0 && afterQty > 0) {
    const meta = _pickReasonAndSource(fixEntry, part, 'Added mandatory or strategy component', 'STRATEGY_SYNTHESIS');
    return { sku, beforeQty: 0, afterQty, action: 'ADD', ...meta };
  }
  if (beforeQty > 0 && afterQty === 0) {
    return { sku, beforeQty, afterQty: 0, action: 'REMOVE', reason: 'Removed component in candidate BOM', sourceRef: 'CANDIDATE_TRANSFORMATION' };
  }
  const meta = _pickReasonAndSource(fixEntry, part, `Quantity adjusted from ${beforeQty} to ${afterQty}`, 'QUANTITY_RULE');
  return { sku, beforeQty, afterQty, action: 'ADJUST_QTY', ...meta };
}

function _buildFixesIndex(missingDeps, resolvedFixes) {
  const fixesBySku = new Map();
  for (const f of [...missingDeps, ...resolvedFixes]) {
    const sku = String(f?.sku || f?.key || '').trim();
    if (sku && !fixesBySku.has(sku)) fixesBySku.set(sku, f);
  }
  return fixesBySku;
}

function _projectMissingFixesAsChanges(fixesBySku) {
  return [...fixesBySku.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([sku, f]) => ({
      sku,
      beforeQty: 0,
      afterQty: Number(f.quantity || 1),
      action: 'REQUIRED_ADD',
      reason: String(_firstNonNull([f.rule, f.reason, f.description, 'Mandatory physical dependency'])),
      sourceRef: String(_firstNonNull([f.ruleId, f.rule, 'LOCAL_PHYSICAL_CHECK']))
    }));
}

function _deriveChangesAndRationales(ctx, hasData) {
  if (!hasData) return [];
  const selected = _resolveSelectedCandidate(ctx.candidates);
  const fixesBySku = _buildFixesIndex(ctx.missingDeps, ctx.resolvedFixes);
  const candParts = selected ? (selected.skuPartsList || selected.skuList || []) : [];
  if (candParts.length === 0) return _projectMissingFixesAsChanges(fixesBySku);

  const baseMap = _indexSkuQty(ctx.items);
  const candMap = _indexSkuQty(candParts);
  const swaps = Array.isArray(selected.substitutedPacingItems) ? selected.substitutedPacingItems : [];
  const allSkus = [...new Set([...baseMap.keys(), ...candMap.keys()])].sort();

  const changes = [];
  for (const sku of allSkus) {
    const beforeQty = baseMap.get(sku)?.qty || 0;
    const afterEntry = candMap.get(sku);
    const afterQty = afterEntry?.qty || 0;
    if (beforeQty === afterQty) continue;
    const swapOut = swaps.find(s => s.originalSku === sku) || null;
    const swapIn = swaps.find(s => s.replacementSku === sku) || null;
    changes.push(_buildFactualChangeEntry(sku, beforeQty, afterQty, afterEntry?.part, fixesBySku.get(sku), swapOut, swapIn));
  }
  return changes;
}

function _resolveCandidateCostState(cand) {
  const parts = cand.skuPartsList || cand.skuList || [];
  const hasUnpricedPart = parts.some(p => p && p.priceKnown === false);
  const hasMissingSkus = Array.isArray(cand.priceUnavailableSkus) && cand.priceUnavailableSkus.length > 0;
  const rawCost = _firstNonNull([cand.priceMetadata?.costUsd, cand.totalOrderCostUsd, cand.totalCostUsd, cand.estimatedCostUsd]);
  const explicitIncomplete = cand.pricingComplete === false || cand.priceMetadata?.pricingComplete === false || hasUnpricedPart || hasMissingSkus;
  if (explicitIncomplete || !_isFiniteNum(rawCost)) {
    return { costUsd: null, pricingComplete: false };
  }
  if (rawCost === 0 && cand.pricingComplete !== true && cand.isConfirmedZeroPrice !== true) {
    return { costUsd: null, pricingComplete: false };
  }
  return { costUsd: rawCost, pricingComplete: true };
}

function _resolveCandidateLeadTimeState(cand) {
  const isStale = Boolean(cand.leadTimeMetadata?.isStaleLeadTime || cand.isStaleLeadTime || cand.leadTimeStale);
  const unknownSkus = cand.supplyMetrics?.unknownLeadTimeSkus || [];
  const rawLead = _firstNonNull([
    cand.leadTimeMetadata?.leadTimeDays,
    cand.leadTimeDays,
    cand.supplyMetrics?.solutionEdtDays
  ]);
  const leadTimeDays = _isFiniteNum(rawLead) ? rawLead : null;
  let leadTimeStatus = 'UNKNOWN';
  if (isStale) leadTimeStatus = 'STALE';
  else if (leadTimeDays !== null && unknownSkus.length > 0) leadTimeStatus = 'PARTIAL';
  else if (leadTimeDays !== null) leadTimeStatus = 'KNOWN';
  return { leadTimeDays, leadTimeStatus };
}

function _buildCandidateTradeOffNotes(cand, pricingComplete, leadTimeStatus) {
  const notes = [];
  if (cand.tradeoffMetrics?.costDeltaUsd) notes.push(`Cost delta: ${cand.tradeoffMetrics.costDeltaUsd}`);
  if (cand.workloadDnaMatch) notes.push(`Workload match: ${cand.workloadDnaMatch}`);
  if (cand.isParetoOptimal === true) notes.push('Pareto non-dominated');
  if (!pricingComplete) notes.push('Pricing incomplete (cost null)');
  if (leadTimeStatus === 'STALE' || leadTimeStatus === 'UNKNOWN') notes.push(`Lead time ${leadTimeStatus.toLowerCase()}`);
  if (Array.isArray(cand.disqualificationReasons) && cand.disqualificationReasons.length > 0) {
    notes.push(`Disqualified: ${cand.disqualificationReasons.map(r => r.code || r.message || r).join(', ')}`);
  }
  return notes;
}

function _deriveAlternatives(ctx, hasData) {
  if (!hasData) return [];
  const rawList = _firstNonEmptyArr([ctx.ev.paretoRankings, ctx.ev.conflictGraph?.paretoRankings, ctx.candidates]);
  return rawList.map(cand => {
    const { costUsd, pricingComplete } = _resolveCandidateCostState(cand);
    const { leadTimeDays, leadTimeStatus } = _resolveCandidateLeadTimeState(cand);
    const qualifiedForRecommendation = Boolean(
      cand.qualifiedForRecommendation !== false &&
      cand.physicalMathClean !== false &&
      cand.requirementCoverage?.blocksPositiveRecommendation !== true &&
      !(Array.isArray(cand.disqualificationReasons) && cand.disqualificationReasons.length > 0)
    );
    return {
      rank: cand.rank ?? cand.qualifiedRank ?? null,
      name: cand.name || (cand.rank != null ? `Rank ${cand.rank}` : 'Candidate'),
      costUsd,
      pricingComplete,
      leadTimeDays,
      leadTimeStatus,
      qualifiedForRecommendation,
      tradeOffNotes: _buildCandidateTradeOffNotes(cand, pricingComplete, leadTimeStatus)
    };
  });
}

function _collectRequirementUncertainties(ctx, uncertainties) {
  for (const amb of (ctx.reqAcc?.ambiguities || [])) {
    uncertainties.push({
      id: amb.ambiguityId || `UNC-AMB-${uncertainties.length + 1}`,
      kind: 'REQUIREMENT_AMBIGUITY',
      affectedDecision: 'REQUIREMENT_INTERPRETATION',
      missingFact: amb.message || 'Conflicting requirement clauses',
      impact: 'BLOCKS_POSITIVE_RECOMMENDATION',
      nextEvidenceAction: 'Clarify authoritative requirement constraint with customer.'
    });
  }
  for (const rec of (ctx.reqAcc?.uninterpretedClauses || [])) {
    if (rec.hardness === 'PREFERENCE') continue;
    uncertainties.push({
      id: `UNC-REQ-${rec.id}`,
      kind: 'UNINTERPRETED_REQUIREMENT',
      affectedDecision: 'CANDIDATE_QUALIFICATION',
      missingFact: `Uninterpreted clause: ${rec.rawText}`,
      impact: 'BLOCKS_POSITIVE_RECOMMENDATION',
      nextEvidenceAction: 'Translate requirement into testable technical metrics or request clarification.'
    });
  }
}

function _collectClaimUncertainties(claimAdj, uncertainties) {
  for (const claim of (claimAdj?.claims || [])) {
    if (claim.status !== 'UNKNOWN' && claim.status !== 'CONTRADICTED') continue;
    uncertainties.push({
      id: `UNC-CLM-${claim.claimId || uncertainties.length + 1}`,
      kind: claim.status === 'CONTRADICTED' ? 'EVIDENCE_CONTRADICTION' : 'UNSUPPORTED_CLAIM',
      affectedDecision: 'DOCUMENT_GROUNDING',
      missingFact: claim.assertion || 'Unverified material claim',
      impact: claim.status === 'CONTRADICTED' ? 'BLOCKS_CERTIFICATION' : 'CLAIM_REMAINS_UNKNOWN',
      nextEvidenceAction: 'Verify material claim against authoritative QuickSpecs passages.'
    });
  }
}

function _collectConstraintUncertainties(constraintResults, uncertainties) {
  for (const c of constraintResults) {
    if (c.status !== 'UNKNOWN' && c.status !== 'NOT_EVALUATED') continue;
    const missingText = (c.missingInputs || []).length > 0
      ? `Missing inputs: ${c.missingInputs.join(', ')}`
      : (c.detail || c.constraintId);
    uncertainties.push({
      id: `UNC-CONSTR-${c.constraintId}`,
      kind: c.status === 'NOT_EVALUATED' ? 'MISSING_DOMAIN_PROFILE' : 'UNKNOWN_CONSTRAINT_INPUT',
      affectedDecision: `CONSTRAINT_${String(c.domain || 'GENERAL').toUpperCase()}`,
      missingFact: missingText,
      impact: 'PHYSICAL_CHECK_INCOMPLETE',
      nextEvidenceAction: 'Supply missing physical/environmental parameters or load domain profile.'
    });
  }
}

function _collectConstraintAndClaimUncertainties(ctx, uncertainties) {
  _collectClaimUncertainties(ctx.claimAdj, uncertainties);
  _collectConstraintUncertainties(ctx.constraintResults, uncertainties);
}

function _collectEvidenceAndSupplyUncertainties(ctx, evidenceStates, alternatives, uncertainties) {
  if (alternatives.some(a => !a.pricingComplete) || ctx.ev.hasUnresolvedPrices) {
    uncertainties.push({
      id: 'UNC-PRICING-INCOMPLETE',
      kind: 'PRICING_INCOMPLETE',
      affectedDecision: 'COST_COMPARISON',
      missingFact: 'One or more candidate SKUs lack verified unit pricing',
      impact: 'TOTAL_COST_NULL_NO_GLOBAL_MIN',
      nextEvidenceAction: 'Obtain verified unit prices from catalog or formal vendor quote.'
    });
  }
  if (alternatives.some(a => a.leadTimeStatus === 'UNKNOWN' || a.leadTimeStatus === 'STALE' || a.leadTimeStatus === 'PARTIAL')) {
    uncertainties.push({
      id: 'UNC-LEADTIME-GAP',
      kind: 'LEAD_TIME_GAP',
      affectedDecision: 'DELIVERY_SCHEDULE',
      missingFact: 'Component lead times are missing or stale',
      impact: 'DELIVERY_EDT_UNCONFIRMED',
      nextEvidenceAction: 'Refresh catalog lead times or inspect live OCA availability.'
    });
  }
  if (evidenceStates.documentGrounding !== 'DOUBLE_CHECK_PASSED') {
    uncertainties.push({
      id: 'UNC-DOC-REVIEW',
      kind: 'DOCUMENT_GROUNDING_INCOMPLETE',
      affectedDecision: 'TIER_2_GROUNDING',
      missingFact: `Document grounding state is ${evidenceStates.documentGrounding}`,
      impact: 'NO_TIER_2_CERTIFICATION',
      nextEvidenceAction: evidenceStates.documentGrounding === 'NOT_RUN_LOCAL_ONLY'
        ? 'Execute online NotebookLM candidate review when connected.'
        : 'Run ephemeral NotebookLM validation with authoritative source citations.'
    });
  }
  if (evidenceStates.liveVendorAcceptance !== 'CLIC_ACCEPTED') {
    uncertainties.push({
      id: 'UNC-PORTAL-ACCEPTANCE',
      kind: 'PORTAL_VALIDATION_PENDING',
      affectedDecision: 'TIER_3_VENDOR_ACCEPTANCE',
      missingFact: 'No current live HPE OCA/CLIC portal receipt bound to candidate manifest',
      impact: 'CANNOT_CLAIM_VENDOR_ACCEPTANCE',
      nextEvidenceAction: 'Submit candidate BOM in authenticated HPE OCA/CLIC portal and capture receipt.'
    });
  }
  if (evidenceStates.dependencyInvalidationStatus === 'STALE_INVALIDATED') {
    uncertainties.push({
      id: 'UNC-STALE-DEPENDENCY',
      kind: 'STALE_INVALIDATED_DEPENDENCY',
      affectedDecision: 'DELIVERY_AUTHORIZATION',
      missingFact: ctx.depInvalidation?.reason || 'Upstream requirement, catalog, or rule revision changed',
      impact: 'BLOCKS_CUSTOMER_EXPORT',
      nextEvidenceAction: 'Re-evaluate BOQ against current requirements, catalog, and active rules.'
    });
  }
}

/**
 * Extract typed UncertaintyRecord[] from evaluation artifacts without inventing
 * claims on empty traces.
 *
 * @param {object|null} evalResults
 * @returns {Array<object>}
 */
function extractUncertaintyRecords(evalResults) {
  const ctx = _unwrapEvaluation(evalResults);
  const hasData = _hasAnyEvaluationData(ctx);
  if (!hasData) return [];

  const evidenceStates = _buildEvidenceStatesFromCtx(ctx, hasData);
  const alternatives = _deriveAlternatives(ctx, hasData);
  const uncertainties = [];

  _collectRequirementUncertainties(ctx, uncertainties);
  _collectConstraintAndClaimUncertainties(ctx, uncertainties);
  _collectEvidenceAndSupplyUncertainties(ctx, evidenceStates, alternatives, uncertainties);

  const missingSizing = ctx.ev.workloadDemand?.missingCriticalInputs || ctx.ev.sizingEvaluation?.missingCriticalInputs || [];
  if (Array.isArray(missingSizing) && missingSizing.length > 0) {
    uncertainties.push({
      id: 'UNC-SIZING-INPUTS',
      kind: 'MISSING_SIZING_DEMAND',
      affectedDecision: 'WORKLOAD_SIZING',
      missingFact: `Missing sizing inputs: ${missingSizing.join(', ')}`,
      impact: 'SIZING_REMAINS_DRAFT_RANGE',
      nextEvidenceAction: `Provide ${missingSizing[0]} to finalize deterministic sizing.`
    });
  }
  return uncertainties;
}

function _deriveConfidenceMetrics(ctx, hasData) {
  if (!hasData) {
    return { routingScore: null, similarityScore: null, evidenceCoverage: null, calibratedProbability: null };
  }
  const explicit = ctx.ev.confidenceMetrics || {};
  const routingScore = _isFiniteNum(explicit.routingScore)
    ? explicit.routingScore
    : (_isFiniteNum(ctx.ev.classification?.confidence) ? ctx.ev.classification.confidence : null);
  const similarityScore = _isFiniteNum(explicit.similarityScore)
    ? explicit.similarityScore
    : (_isFiniteNum(ctx.ev.chassisDetection?.confidenceScore) ? ctx.ev.chassisDetection.confidenceScore : null);

  let evidenceCoverage = _isFiniteNum(explicit.evidenceCoverage) ? explicit.evidenceCoverage : null;
  if (evidenceCoverage === null && ctx.claimAdj?.counts?.total > 0) {
    evidenceCoverage = Number((ctx.claimAdj.counts.supported / ctx.claimAdj.counts.total).toFixed(4));
  } else if (evidenceCoverage === null && ctx.aspectChecks.length > 0) {
    const cleanCount = ctx.aspectChecks.filter(c => ['PASS', 'PASSED', 'NOT_APPLICABLE'].includes(c?.status)).length;
    evidenceCoverage = Number((cleanCount / ctx.aspectChecks.length).toFixed(4));
  }
  const calibratedProbability = _isFiniteNum(explicit.calibratedProbability) ? explicit.calibratedProbability : null;

  return { routingScore, similarityScore, evidenceCoverage, calibratedProbability };
}

function _isMaterialClaim(c) {
  if (!c || typeof c !== 'object') return false;
  if (c.isMaterial === false || c.material === false) return false;
  const mat = String(c.materiality || '').toUpperCase();
  if (mat === 'INFORMATIONAL') return false;
  return c.isMaterial === true || c.material === true || mat === 'MATERIAL';
}

function _isBlockingClaimRecord(c) {
  if (!_isMaterialClaim(c)) return false;
  if (c.isSupported === false) return true;
  const st = String(c.supportState || c.status || '').toUpperCase();
  return st === 'UNSUPPORTED' || st === 'CONTRADICTED' || st === 'REJECTED' || st === 'UNKNOWN';
}

function _hasExplicitClaimCounters(claimAdj) {
  return Boolean(
    claimAdj.hasContradictions === true ||
    claimAdj.contradictionCount > 0 ||
    claimAdj.unsupportedMaterialCount > 0 ||
    claimAdj.counts?.rejected > 0
  );
}

function _hasBlockingClaims(ctx) {
  if (!ctx.claimAdj) return false;
  if (_hasExplicitClaimCounters(ctx.claimAdj)) return true;
  const claims = Array.isArray(ctx.claimAdj.claims) ? ctx.claimAdj.claims : [];
  if (claims.some(_isBlockingClaimRecord)) return true;
  const hasRelevantScope = claims.length === 0 ? (ctx.claimAdj.counts?.unknown > 0) : claims.some(_isMaterialClaim);
  const overall = String(ctx.claimAdj.overallStatus || '').toUpperCase();
  return hasRelevantScope && ['CONTRADICTED', 'REJECTED', 'UNKNOWN'].includes(overall);
}

function _deriveMathStatusFlags(ctx, selected, evidenceStates) {
  const localState = evidenceStates?.localPhysicalChecks;
  const mathFailed = localState === 'FAILED' ||
    ctx.ev.isMathClean === false ||
    ctx.ev.conflictGraph?.isWholeSolutionValid === false ||
    ctx.ev.customerDisposition === 'DELIVERY_BLOCKED_UNBUILDABLE' ||
    ctx.ev.isContractInvalid === true;
  const localIncomplete = localState === 'INCOMPLETE' || localState === 'NOT_EVALUATED';
  const mathPassed = !mathFailed && !localIncomplete &&
    (localState === 'PASSED' || ctx.ev.isMathClean === true || selected?.physicalMathClean === true);
  return { mathFailed, localIncomplete, mathPassed };
}

function _resolveBuildReadyOutcome(ctx, evidenceStates) {
  const liveAccepted = evidenceStates.liveVendorAcceptance === 'CLIC_ACCEPTED';
  const msg = liveAccepted
    ? 'Candidate accepted by current live vendor CLIC portal receipt.'
    : 'Local physical checks passed; live portal validation pending.';
  if (ctx.ev.customerDisposition) {
    return { disposition: ctx.ev.customerDisposition, summary: msg };
  }
  const disposition = evidenceStates.deliveryAuthorization === 'AUTHORIZED' ? 'DELIVERY_AUTHORIZED' : 'LOCAL_RULE_CHECKED';
  return { disposition, summary: msg };
}

function _resolveDispositionAndSummary(ctx, evidenceStates, flags) {
  if (flags.stale) {
    return { disposition: 'STALE_INVALIDATED', summary: 'Upstream requirement, catalog, or rule dependencies are stale and invalidated.' };
  }
  if (flags.mathFailed) {
    return { disposition: 'DELIVERY_BLOCKED_UNBUILDABLE', summary: 'Physical buildability violations detected in baseline or candidate configuration.' };
  }
  if (flags.reqBlocked || flags.claimBlocked) {
    return { disposition: 'ACTION_REQUIRED', summary: 'Hard requirement coverage or material claim support blockers remain unresolved.' };
  }
  if (flags.localIncomplete || !flags.isBuildable) {
    return { disposition: 'ACTION_REQUIRED', summary: 'Evaluation incomplete or physical checks contain unknown or not-evaluated constraints.' };
  }
  return _resolveBuildReadyOutcome(ctx, evidenceStates);
}

function _deriveOutcome(ctx, hasData, reqCoverage, evidenceStates) {
  if (!hasData) {
    return {
      disposition: 'NOT_EVALUATED',
      isBuildable: false,
      selectedRank: null,
      candidateCount: 0,
      summary: 'NO_CLAIMS_RECORDED'
    };
  }
  const selected = _resolveSelectedCandidate(ctx.candidates);
  const selectedRank = selected?.rank ?? null;
  const candidateCount = ctx.candidates.length;
  const stale = evidenceStates.dependencyInvalidationStatus === 'STALE_INVALIDATED';
  const reqBlocked = reqCoverage.omittedClausesCount > 0 || reqCoverage.violatedHardCount > 0 || reqCoverage.unresolvedHardCount > 0;
  const claimBlocked = _hasBlockingClaims(ctx);
  const { mathFailed, localIncomplete, mathPassed } = _deriveMathStatusFlags(ctx, selected, evidenceStates);
  const isBuildable = Boolean(mathPassed && !mathFailed && !localIncomplete && !stale && !reqBlocked && !claimBlocked);
  const { disposition, summary } = _resolveDispositionAndSummary(ctx, evidenceStates, {
    stale, mathFailed, localIncomplete, reqBlocked, claimBlocked, isBuildable
  });
  return { disposition, isBuildable, selectedRank, candidateCount, summary };
}

/**
 * Project canonical customer-facing decision record (SolutionIntelligenceEnvelope core).
 *
 * @param {object|null} evalResults
 * @param {object} [options]
 * @returns {object}
 */
function projectCustomerDecision(evalResults, options = {}) {
  const ctx = _unwrapEvaluation(evalResults);
  const hasData = _hasAnyEvaluationData(ctx);
  const evidenceStates = _buildEvidenceStatesFromCtx(ctx, hasData, options);
  const requirementCoverage = _deriveRequirementCoverage(ctx, hasData);
  const changesAndRationales = _deriveChangesAndRationales(ctx, hasData);
  const alternatives = _deriveAlternatives(ctx, hasData);
  const uncertainties = extractUncertaintyRecords(evalResults);
  const confidenceMetrics = _deriveConfidenceMetrics(ctx, hasData);
  const outcome = _deriveOutcome(ctx, hasData, requirementCoverage, evidenceStates);

  return {
    schemaVersion: SCHEMA_VERSION,
    outcome,
    requirementCoverage,
    changesAndRationales,
    alternatives,
    uncertainties,
    confidenceMetrics,
    evidenceStates
  };
}

/**
 * Build full canonical SolutionIntelligenceEnvelope v1.0 for API / MCP / exports.
 *
 * @param {object|null} evalResults
 * @param {object} [options]
 * @returns {object}
 */
function buildSolutionIntelligenceEnvelope(evalResults, options = {}) {
  const ctx = _unwrapEvaluation(evalResults);
  const projection = projectCustomerDecision(evalResults, options);
  return {
    ...projection,
    envelopeType: 'SOLUTION_INTELLIGENCE_ENVELOPE',
    track: options.track || ctx.ev.track || ctx.ev.classification?.intent || 'BOQ_EVALUATION',
    product: ctx.ev.chassis || ctx.ev.chassisVariant || ctx.ev.targetChassis || ctx.ev.chassisPrefix || null,
    manifestFingerprint: ctx.ev.manifestFingerprint || ctx.ev.deliveryAuthorization?.manifestFingerprint || null
  };
}

module.exports = {
  SCHEMA_VERSION,
  buildSolutionIntelligenceEnvelope,
  projectCustomerDecision,
  extractUncertaintyRecords,
  buildEvidenceSummaryStates,
  isStrictDocumentReviewVerified
};
