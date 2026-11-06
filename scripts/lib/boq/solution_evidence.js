'use strict';
const crypto = require('crypto');
const { outputQuantities } = require('./configuration_context');

function manifestQuantities(part, multiplier) {
  try { return outputQuantities(part, multiplier); }
  catch { return { perNodeQty: null, nodeMult: null, totalQty: null }; }
}

function _resolveEvaluationNodeCount(evaluation) {
  const cs = evaluation?.clusterSizing;
  if (cs && cs.serverCount != null) return cs.serverCount;
  if (cs && cs.totalNodes != null) return cs.totalNodes;
  if (evaluation?.serverCount != null) return evaluation.serverCount;
  return 1;
}

function _sortCandidateParts(a, b) {
  const skuComp = a.sku.localeCompare(b.sku);
  if (skuComp !== 0) return skuComp;
  const qtyComp = a.quantity - b.quantity;
  if (qtyComp !== 0) return qtyComp;
  return canonicalJson(a).localeCompare(canonicalJson(b));
}

function _buildCandidatePart(part, nodeCount) {
  const sku = String(part.sku || part['Product #'] || '').trim();
  const quantity = Number(part.quantity != null ? part.quantity : part.qty);
  const quantities = manifestQuantities(part, nodeCount);

  return {
    sku,
    quantity,
    quantityScope: part.quantityScope || 'configuration',
    configurationId: part.configurationId != null ? part.configurationId : null,
    quantityBasis: part.quantityBasis != null ? part.quantityBasis : null,
    configurationMultiplier: part.configurationMultiplier != null ? part.configurationMultiplier : null,
    isClusterPreMultiplied: part.isClusterPreMultiplied != null ? Boolean(part.isClusterPreMultiplied) : false,
    owner: part.owner != null ? part.owner : (part.ownerId != null ? part.ownerId : null),
    parentId: part.parentId != null ? part.parentId : null,
    subParentId: part.subParentId != null ? part.subParentId : null,
    baseSku: part.baseSku != null ? part.baseSku : null,
    ...quantities
  };
}

function _mapCandidate(candidate, nodeCount) {
  const rawParts = candidate.skuPartsList || candidate.skuList || [];
  const parts = rawParts.map(part => _buildCandidatePart(part, nodeCount));
  parts.sort(_sortCandidateParts);
  return {
    rank: candidate.rank,
    nodeCount,
    parts
  };
}

function solutionManifest(evaluation) {
  if (!evaluation || typeof evaluation !== 'object') return [];
  const candidates = evaluation.conflictGraph?.recommendedSolutions || evaluation.conflictGraph?.rankedSolutions || [];
  const nodeCount = _resolveEvaluationNodeCount(evaluation);
  return candidates
    .map(candidate => _mapCandidate(candidate, nodeCount))
    .sort((a, b) => String(a.rank).localeCompare(String(b.rank)));
}

function canonicalJson(value) {
  return JSON.stringify(value, (key, entry) => {
    if (key.startsWith('_')) return undefined;
    return entry && typeof entry === 'object' && !Array.isArray(entry)
      ? Object.fromEntries(Object.keys(entry).filter(k => !k.startsWith('_')).sort().map(k => [k, entry[k]]))
      : entry;
  });
}

function _canonicalBaselinePart(part) {
  return {
    sku: String(part.sku || part['Product #'] || '').trim(),
    quantity: Number(part.quantity ?? part.qty),
    quantityScope: part.quantityScope || 'configuration',
    configurationId: part.configurationId || null,
    configurationMultiplier: part.configurationMultiplier ?? 1,
    quantityBasis: part.quantityBasis ?? null,
    isClusterPreMultiplied: part.isClusterPreMultiplied ?? false,
    owner: part.owner ?? part.ownerId ?? null,
    parentId: part.parentId ?? null,
    subParentId: part.subParentId ?? null,
    description: part.description || ''
  };
}

function _resolveReviewChassis(ev) {
  return ev.chassis || ev.chassisVariant || ev.targetChassis || ev.detectedChassis || null;
}

function canonicalReviewEnvelope(evaluation, catalogData = null) {
  const ev = evaluation && typeof evaluation === 'object' ? evaluation : {};
  const catalog = catalogData || ev.catalogData || null;
  // Content changes must invalidate review even when timestamps/counts or a
  // caller-supplied metadata fingerprint were accidentally left unchanged.
  const catalogFingerprint = catalog ? crypto.createHash('sha256').update(canonicalJson(catalog)).digest('hex') : 'UNKNOWN_CATALOG';

  const baseline = (ev.items || [])
    .map(_canonicalBaselinePart)
    .sort((a, b) => a.sku.localeCompare(b.sku) || a.quantity - b.quantity);

  return {
    version: '2.0',
    chassis: _resolveReviewChassis(ev),
    base: ev.base || ev.baseChassis || null,
    owner: ev.owner || null,
    selectors: ev.selectors || null,
    selectorsByConfiguration: ev.selectorsByConfiguration || null,
    supportPolicy: ev.supportPolicy || null,
    requirements: ev.requirementResolution || null,
    configurationContext: ev.configurationContext || null,
    clusters: ev.clusters || null,
    multiplier: ev.multiplier ?? null,
    catalogRules: ev.catalogRules || null,
    baseline,
    candidates: solutionManifest(ev),
    catalogFingerprint
  };
}

function solutionFingerprint(evaluation, catalogData = null) {
  const envelope = canonicalReviewEnvelope(evaluation, catalogData);
  return crypto.createHash('sha256').update(canonicalJson(envelope)).digest('hex');
}

/** Bind presentation inputs, not a caller-supplied cached fingerprint. Keep
 * lifecycle/ledger/export paths out: those legitimately change after issuance.
 * Both candidate collections and both SKU representations are included because
 * different public writers consume them (including SAN and baseline fallbacks).
 */
function deliveryFingerprint(evaluation) {
  const ev = evaluation && typeof evaluation === 'object' ? evaluation : {};
  const graph = ev.conflictGraph || {};
  const content = {
    chassis: ev.chassis || ev.chassisVariant || ev.targetChassis || ev.detectedChassis || null,
    productType: ev.productType,
    items: ev.items,
    parsedItems: ev.parsedItems,
    clusters: ev.clusters,
    multiplier: ev.multiplier,
    recommendedSolutions: graph.recommendedSolutions,
    rankedSolutions: graph.rankedSolutions,
    resolvedFixes: graph.resolvedFixes,
    missingDependencies: ev.missingDependencies,
    clusterSizing: ev.clusterSizing,
    serverCount: ev.serverCount,
    requirements: ev.requirementResolution,
    selectors: ev.selectors,
    selectorsByConfiguration: ev.selectorsByConfiguration,
    supportPolicy: ev.supportPolicy,
    budgetOptimization: ev.budgetOptimization,
    catalogData: ev.catalogData,
    validationClaims: {
      isMathClean: ev.isMathClean,
      aspectChecks: ev.aspectChecks,
      notebookLmStatus: ev.notebookLmStatus,
      cloudGroundingStatus: ev.cloudGroundingStatus,
      ephemeralSourceValidation: ev.ephemeralSourceValidation,
      acceptanceGate: ev.acceptanceGate,
      isWholeSolutionValid: graph.isWholeSolutionValid
    }
  };
  return crypto.createHash('sha256').update(canonicalJson(content)).digest('hex');
}

function _isManifestValid(manifest) {
  if (!manifest || manifest.length === 0) return false;
  return manifest.every(candidate =>
    Number.isSafeInteger(candidate.nodeCount) &&
    candidate.nodeCount > 0 &&
    Array.isArray(candidate.parts) &&
    candidate.parts.length > 0 &&
    candidate.parts.every(part =>
      Boolean(part.sku) &&
      Number.isSafeInteger(part.quantity) &&
      part.quantity > 0 &&
      Number.isSafeInteger(part.totalQty) &&
      part.totalQty > 0
    )
  );
}

function _isReviewStructureValid(review, manifest, evaluation) {
  if (!review || review.success !== true || review.isCloudGrounded !== true || review.sourceDetached !== true) return false;
  if (!Array.isArray(review.authoritativeSourceIds) || review.attachment?.isMock === true || review.simulationPassed === true) return false;
  if (review.doubleCheckVerdict !== 'DOUBLE_CHECK_PASSED') return false;
  if (review.manifestSha256 !== solutionFingerprint(evaluation)) return false;

  const ranks = new Set(manifest.map(candidate => String(candidate.rank)));
  if (ranks.size !== manifest.length) return false;

  return true;
}

function _isReviewFresh(reviewedAt, RAG_CACHE_TTL_MS) {
  const ts = Date.parse(reviewedAt);
  if (!Number.isFinite(ts) || ts > Date.now()) return false;
  if (!Number.isFinite(RAG_CACHE_TTL_MS) || RAG_CACHE_TTL_MS <= 0) return false;
  return (Date.now() - ts) < RAG_CACHE_TTL_MS;
}

function _isGovernanceScopeMatching(evaluation, review, getNotebookConfigEntry, getAuthoritativeSourceIds) {
  const mapped = getNotebookConfigEntry(null, { chassis: canonicalReviewEnvelope(evaluation).chassis });
  const entry = mapped?.entry;
  const normalizeProduct = value => String(value || '')
    .replace(/_(8SFF|24SFF|8LFF|12LFF|EDSFF|SFF|LFF|NHP|RACK|MODULE|FRAME|ENCLOSURE)$/i, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();

  if (normalizeProduct(mapped?.key) !== normalizeProduct(canonicalReviewEnvelope(evaluation).chassis)) return false;
  if (!entry || entry.notebookId !== review.notebookId || entry.queryEnabled === false || entry.cloudSyncState !== 'VERIFIED') return false;

  const scopeSha256 = crypto.createHash('sha256').update(canonicalJson(entry)).digest('hex');
  if (review.authoritativeScopeSha256 !== scopeSha256) return false;

  const currentIds = getAuthoritativeSourceIds(entry).sort();
  if (canonicalJson(currentIds) !== canonicalJson([...(review.authoritativeSourceIds || [])].sort())) return false;

  return true;
}

function _filterNativeCitations(review) {
  const trusted = new Set(Array.isArray(review.authoritativeSourceIds) ? review.authoritativeSourceIds : []);
  const citations = Array.isArray(review.citations) ? review.citations : [];
  return citations.filter(citation =>
    citation &&
    typeof citation === 'object' &&
    trusted.has(citation.sourceId || citation.source_id || citation.id) &&
    String(citation.sourceId || citation.source_id || citation.id) !== String(review.sourceId)
  );
}

function _verifyManifestRankVerdicts(manifest, review, native) {
  if (!Array.isArray(review.rankVerdicts)) return false;

  return manifest.every(candidate => {
    const matches = review.rankVerdicts.filter(row => row && String(row.rank) === String(candidate.rank));
    if (matches.length !== 1) return false;

    const row = matches[0];
    const isClean = row.verdict === 'PASS' &&
      row.intentPreserved === true &&
      row.mandatoryChangesOnly === true &&
      Array.isArray(row.issues) &&
      row.issues.length === 0 &&
      Array.isArray(row.citations);

    if (!isClean) return false;

    return row.citations.some(citation => native.some(ref => {
      const index = ref.index ?? ref.citation_number ?? ref.citationNumber;
      return index != null && String(citation).includes(`[${index}]`);
    }));
  });
}

function candidateReviewCurrent(evaluation) {
  if (!evaluation || typeof evaluation !== 'object') return false;

  const review = evaluation.ephemeralSourceValidation || evaluation.solutionDoubleCheck;
  const manifest = solutionManifest(evaluation);

  if (!_isManifestValid(manifest)) return false;
  if (!_isReviewStructureValid(review, manifest, evaluation)) return false;

  // Re-read current governance at each delivery boundary. Cached review cannot
  // survive remapping, source quarantine, or a failed knowledge refresh.
  const { getNotebookConfigEntry, getAuthoritativeSourceIds, RAG_CACHE_TTL_MS } = require('../notebook/notebook_query_utils.js');
  if (!_isReviewFresh(review.reviewedAt, RAG_CACHE_TTL_MS)) return false;

  if (!_isGovernanceScopeMatching(evaluation, review, getNotebookConfigEntry, getAuthoritativeSourceIds)) return false;

  const native = _filterNativeCitations(review);
  if (!native.length) return false;

  return _verifyManifestRankVerdicts(manifest, review, native);
}

function candidateDelta(baseline, candidate) {
  const quantities = parts => {
    const map = new Map();
    for (const part of parts) {
      const sku = String(part.sku || part['Product #'] || '').trim();
      map.set(sku, (map.get(sku) || 0) + Number(part.quantity ?? part.qty ?? 0));
    }
    return map;
  };
  const before = quantities(baseline);
  const after = quantities(candidate.skuPartsList || candidate.skuList || []);
  return [...new Set([...before.keys(), ...after.keys()])].sort().map(sku => ({ sku, before: before.get(sku) || 0, after: after.get(sku) || 0 })).filter(row => row.before !== row.after);
}
module.exports = {
  canonicalJson,
  solutionManifest,
  solutionFingerprint,
  deliveryFingerprint,
  candidateReviewCurrent,
  candidateDelta,
  canonicalReviewEnvelope
};
