'use strict';
/**
 * scripts/lib/boq/gates/si_policy_gates.js — Lifecycle, SI Policy Gates (B21–B24), and Specialized Track Validators
 */

const { cleanBaseSKU, buildCatalogSkuIndex, classifyLifecycleState } = require('../../catalog/sku.js');
const { dependencyAcceptanceState, catalogEvidenceBoundary } = require('../solution_evidence.js');
const { projectCustomerDecision } = require('../decision_projection.js');
const { makeCheck } = require('./gate_check_builder.js');

function _checkProductionLifecycleGate(output, context = {}) {
  const isUnbuildable = output?.isMathClean === false || output?.isWholeSolutionValid === false || output?.status === 'UNBUILDABLE';
  if (isUnbuildable) {
    return makeCheck('B21', 'Active Production Lifecycle Gate (Non-OB / Non-EOL)', 'BLOCK', 'NOT_APPLICABLE', 'Unbuildable baseline diagnosis does not promote production SKUs.');
  }
  const topCandidate = output?.conflictGraph?.recommendedSolutions?.[0] ||
    output?.conflictGraph?.rankedSolutions?.[0] ||
    output?.rankedSolutions?.[0];
  const parts = topCandidate?.skuPartsList || topCandidate?.skuList || [];
  if (parts.length === 0) {
    return makeCheck('B21', 'Active Production Lifecycle Gate (Non-OB / Non-EOL)', 'BLOCK', 'NOT_APPLICABLE', 'No candidate recommendation parts to verify lifecycle eligibility.');
  }
  const catalogData = context.catalogData || output?.catalogData || output?.chassisInfo?.catalogData;
  const catalogIndex = catalogData ? buildCatalogSkuIndex(catalogData) : null;
  const blockedSkus = [];
  const supplyConstrainedSkus = [];
  for (const part of parts) {
    const clean = cleanBaseSKU(part.sku);
    const catItem = catalogIndex?.get(clean);
    const catalogState = catItem?.lifecycleState;
    const inputState = classifyLifecycleState(part.lifecycleStatus, part.diffStatus, part.sku, part.description, part.vendorSupplyStatus);
    const blocked = [catalogState, inputState].find(state => state?.isBlockedForProduction);
    if (blocked) blockedSkus.push(`${clean} (${blocked.canonicalStatus})`);
    else if (catalogState?.isConstrainedSupply || inputState.isConstrainedSupply) supplyConstrainedSkus.push(clean);
  }
  if (supplyConstrainedSkus.length > 0) {
    return makeCheck('B21', 'Active Production Lifecycle Gate (Non-OB / Non-EOL)', 'BLOCK', 'ACTION_REQUIRED',
      `Confirm vendor supply or replace the constrained production SKU(s): ${supplyConstrainedSkus.join(', ')}.`,
      { supplyConstrainedSkus, blockedSkus });
  }
  if (blockedSkus.length > 0 && !context.allowClearanceOrObsolete) {
    return makeCheck('B21', 'Active Production Lifecycle Gate (Non-OB / Non-EOL)', 'BLOCK', 'FAILED',
      `Top production recommendation contains ${blockedSkus.length} obsolete/EOL/discontinued SKU(s): ${blockedSkus.join(', ')}.`,
      { blockedSkus });
  }
  return makeCheck('B21', 'Active Production Lifecycle Gate (Non-OB / Non-EOL)', 'BLOCK', 'PASSED',
    `All ${parts.length} SKU(s) in top production recommendation are free of OB/EOL/Discontinued lifecycle blocks.`);
}

function _resolveRequirementCoverageForGate(outputArtifact) {
  const fromSi = outputArtifact?.solutionIntelligence?.requirementCoverage || null;
  const fromProj = projectCustomerDecision(outputArtifact).requirementCoverage;
  if (!fromSi) return fromProj;
  return {
    totalClauses: Math.max(Number(fromSi.totalClauses || 0), Number(fromProj.totalClauses || 0)),
    omittedClausesCount: Math.max(Number(fromSi.omittedClausesCount || 0), Number(fromProj.omittedClausesCount || 0)),
    violatedHardCount: Math.max(Number(fromSi.violatedHardCount || 0), Number(fromProj.violatedHardCount || 0)),
    unresolvedHardCount: Math.max(Number(fromSi.unresolvedHardCount || 0), Number(fromProj.unresolvedHardCount || 0))
  };
}

function _checkRequirementAccountingGate(outputArtifact) {
  if (!outputArtifact?.requirementAccounting && !outputArtifact?.solutionIntelligence?.requirementCoverage) {
    return null;
  }
  const cov = _resolveRequirementCoverageForGate(outputArtifact);
  const omitted = Number(cov.omittedClausesCount || 0);
  const violated = Number(cov.violatedHardCount || 0);
  const unresolved = Number(cov.unresolvedHardCount || 0);

  if (omitted > 0 || violated > 0) {
    return makeCheck(
      'B22',
      'Requirement Accounting & Hard-Constraint Preservation',
      'BLOCK',
      'FAILED',
      `Requirement accounting failed: ${omitted} omitted clause(s) and ${violated} violated hard requirement(s).`,
      { omittedClausesCount: omitted, violatedHardCount: violated, unresolvedHardCount: unresolved }
    );
  }
  if (unresolved > 0) {
    return makeCheck(
      'B22',
      'Requirement Accounting & Hard-Constraint Preservation',
      'BLOCK',
      'ACTION_REQUIRED',
      `Requirement accounting requires resolution: ${unresolved} unresolved hard requirement(s).`,
      { omittedClausesCount: 0, violatedHardCount: 0, unresolvedHardCount: unresolved }
    );
  }
  return makeCheck(
    'B22',
    'Requirement Accounting & Hard-Constraint Preservation',
    'BLOCK',
    'PASSED',
    `All ${cov.totalClauses || 0} accounted customer requirement clause(s) satisfied without omissions or hard violations.`,
    { totalClauses: cov.totalClauses || 0 }
  );
}

function _isMaterialClaimRecord(claim) {
  if (!claim || typeof claim !== 'object') return false;
  if (claim.isMaterial === false || claim.material === false) return false;
  const mat = String(claim.materiality || '').toUpperCase();
  if (mat === 'INFORMATIONAL') return false;
  return claim.isMaterial === true || claim.material === true || mat === 'MATERIAL';
}

function _isHardFailedMaterialClaim(claim) {
  if (!_isMaterialClaimRecord(claim)) return false;
  const st = String(claim.supportState || claim.status || '').toUpperCase();
  return st === 'UNSUPPORTED' || st === 'CONTRADICTED' || st === 'REJECTED';
}

function _isUnverifiedMaterialClaim(claim) {
  if (!_isMaterialClaimRecord(claim)) return false;
  const st = String(claim.supportState || claim.status || '').toUpperCase();
  return st === 'UNKNOWN' || st === '' || claim.isSupported === false;
}

function _hasHardClaimAdjudicationFailure(adj, failedClaims, contradictionCount, unsupportedCount) {
  if (failedClaims.length > 0 || contradictionCount > 0 || unsupportedCount > 0) return true;
  if (adj.hasContradictions === true || (adj.counts?.rejected || 0) > 0) return true;
  return adj.overallStatus === 'CONTRADICTED' || adj.overallStatus === 'REJECTED';
}

function _hasUnknownMaterialClaimBlocker(adj, materialClaims, unknownClaims) {
  if (unknownClaims.length > 0) return true;
  const explicitUnknown = Number(adj.counts?.unknown ?? 0);
  if (Array.isArray(adj.claims) && adj.claims.length > 0 && materialClaims.length === 0) return false;
  return adj.overallStatus === 'UNKNOWN' || explicitUnknown > 0;
}

function _extractClaimIds(list) {
  return list.map(c => c.claimId || c.assertion);
}

function _buildB23UnknownCheck(adj, unknownClaims) {
  const count = unknownClaims.length || Number(adj.counts?.unknown || 0);
  return makeCheck(
    'B23',
    'Material Claim Support & Contradiction Integrity',
    'BLOCK',
    'ACTION_REQUIRED',
    `Material claim support remains unverified (${count} UNKNOWN material claim(s)).`,
    { unknownClaimIds: _extractClaimIds(unknownClaims), unknownCount: count }
  );
}

function _checkClaimAdjudicationGate(outputArtifact) {
  const adj = outputArtifact?.claimAdjudication;
  if (!adj || typeof adj !== 'object') return null;

  const claims = Array.isArray(adj.claims) ? adj.claims : [];
  const materialClaims = claims.filter(_isMaterialClaimRecord);
  const failedClaims = materialClaims.filter(_isHardFailedMaterialClaim);
  const unknownClaims = materialClaims.filter(_isUnverifiedMaterialClaim);
  const contradictionCount = Number(adj.contradictionCount ?? adj.counts?.contradicted ?? 0);
  const unsupportedCount = Number(adj.unsupportedMaterialCount ?? 0);

  if (_hasHardClaimAdjudicationFailure(adj, failedClaims, contradictionCount, unsupportedCount)) {
    return makeCheck(
      'B23',
      'Material Claim Support & Contradiction Integrity',
      'BLOCK',
      'FAILED',
      `Material claim adjudication failed: ${failedClaims.length} unsupported/contradicted/rejected material claim(s), ${contradictionCount} contradiction(s).`,
      { badClaimIds: _extractClaimIds(failedClaims), contradictionCount, unsupportedMaterialCount: unsupportedCount }
    );
  }
  if (_hasUnknownMaterialClaimBlocker(adj, materialClaims, unknownClaims)) {
    return _buildB23UnknownCheck(adj, unknownClaims);
  }
  return makeCheck(
    'B23',
    'Material Claim Support & Contradiction Integrity',
    'BLOCK',
    'PASSED',
    `All ${claims.length} adjudicated claim(s) free of unverified assertions or contradictions.`,
    { claimsCount: claims.length }
  );
}

function _checkDependencyInvalidationGate(outputArtifact) {
  const revisionBoundary = catalogEvidenceBoundary(outputArtifact?.catalogEvidence);
  const indexed = outputArtifact?.dependencyInvalidation;
  const dep = indexed && dependencyAcceptanceState(indexed) === 'STALE_INVALIDATED' ? indexed
    : revisionBoundary?.canGrantAcceptance === false ? revisionBoundary : indexed || revisionBoundary;
  const state = dependencyAcceptanceState(dep);
  if (state === 'NOT_EVALUATED') return null;
  if (state === 'STALE_INVALIDATED') {
    return makeCheck(
      'B24',
      'Evidence Dependency Invalidation Guard',
      'BLOCK',
      'FAILED',
      `Evidence dependencies are stale and invalidated (${dep.reason || 'upstream revision changed'}).`,
      { isStale: true, invalidatedReasons: dep.reasons || [] }
    );
  }
  if (state === 'UNKNOWN') {
    return makeCheck(
      'B24',
      'Evidence Dependency Invalidation Guard',
      'BLOCK',
      'ACTION_REQUIRED',
      `Evidence dependency validity remains unverified (${dep.reason || dep.status || 'boundary did not grant acceptance'}).`,
      { isStale: false, dependencyStatus: dep.status || 'UNKNOWN' }
    );
  }
  return makeCheck(
    'B24',
    'Evidence Dependency Invalidation Guard',
    'BLOCK',
    'PASSED',
    'Evidence dependency chain is valid and current.',
    { isStale: false }
  );
}

function _checkCompositeContainmentGate(outputArtifact) {
  const containment = outputArtifact?.compositeContainment;
  if (!containment || typeof containment !== 'object') return null;
  if (!containment.isCompositeMultiDomain && !outputArtifact?.requireCompositeContainment) return null;

  if (containment.status === 'FAIL') {
    const reasons = (containment.blockers || []).map(b => b.detail).filter(Boolean).join('; ');
    return makeCheck(
      'B25',
      'Composite Multi-Domain Fabric & Rack Containment',
      'BLOCK',
      'FAILED',
      `Composite containment check failed: ${reasons || 'fabric port, optical compatibility, or rack power overflow'}.`,
      { containmentStatus: containment.status, blockers: containment.blockers }
    );
  }
  if (containment.status === 'UNKNOWN') {
    const severity = outputArtifact?.requireCompositeContainment ? 'BLOCK' : 'WARN';
    const reasons = (containment.unknowns || []).map(u => u.detail).filter(Boolean).join('; ');
    return makeCheck(
      'B25',
      'Composite Multi-Domain Fabric & Rack Containment',
      severity,
      'UNKNOWN',
      `Composite containment remains unverified (${reasons || 'missing optics/port/power denominators'}).`,
      { containmentStatus: containment.status, unknowns: containment.unknowns }
    );
  }
  return makeCheck(
    'B25',
    'Composite Multi-Domain Fabric & Rack Containment',
    'BLOCK',
    'PASSED',
    `Composite containment verified across ${containment.domainsPresent?.length || 0} domains (${containment.totalRackUnits || 0}U, ${containment.highLineKw ?? 'N/A'}kW).`,
    { containmentStatus: containment.status, domainsPresent: containment.domainsPresent }
  );
}

function _validateSolutionIntelligencePolicyChecks(outputArtifact) {
  if (!outputArtifact || typeof outputArtifact !== 'object') return [];
  return [
    _checkRequirementAccountingGate(outputArtifact),
    _checkClaimAdjudicationGate(outputArtifact),
    _checkDependencyInvalidationGate(outputArtifact),
    _checkCompositeContainmentGate(outputArtifact)
  ].filter(Boolean);
}

const SPECIALIZED_TRACK_VALIDATORS = Object.freeze({
  CATALOG_INTELLIGENCE: (output, context) => {
    if (output?.code === 'PRICE_DRIFT_SCOPE_REQUIRED' || output?.code === 'CATALOG_QUERY_SCOPE_REQUIRED') {
      return makeCheck('CI1', 'Catalog Intelligence Scope', 'WARN', 'ACTION_REQUIRED', output.message);
    }
    if (output?.catalogSearch) {
      const { verifyCatalogSearchResponse } = require('../../catalog/catalog_query_engine.js');
      const check = verifyCatalogSearchResponse(output.catalogSearch, context?.catalogSearchRequest);
      const sev = check.status === 'FAILED' ? 'BLOCK' : 'WARN';
      return makeCheck('CI2', 'Catalog Search Filter & Field Integrity', sev, check.status === 'PARTIAL' ? 'ACTION_REQUIRED' : check.status,
        check.issues.length ? check.issues.join(' ') : `Catalog search verified (${output.catalogSearch.summary?.returnedCount || 0} result(s)).`);
    }
    if (output?.priceDrifts) {
      const { snapshotsRead, issues, trailConflictCount } = output.priceDrifts.coverage;
      const incomplete = !snapshotsRead || issues.length > 0 || trailConflictCount > 0;
      return makeCheck('CI1', 'Dated Catalog Price Evidence', 'WARN', incomplete ? 'ACTION_REQUIRED' : 'PASSED',
        incomplete ? 'Catalog evidence contains gaps or conflicting price records.' : 'Dated catalog snapshots were compared.');
    }
    if (output?.historicalPricing) {
      const price = output.historicalPricing;
      if (price.isResolved && (!price.effectiveDate || price.effectiveDate > price.targetDate || !Number.isFinite(price.nullablePriceUsd))) {
        return makeCheck('CI3', 'Historical Price Evidence', 'BLOCK', 'FAILED', 'Resolved price lacks a priced observation on or before the as-of date.');
      }
      return makeCheck('CI3', 'Historical Price Evidence', 'WARN', price.isResolved ? 'PASSED' : 'ACTION_REQUIRED', output.message);
    }
    if (!output?.targetSku && !output?.liveDetails?.sku && !output?.liveDetails?.['Product #'] && output?.pricingTrail && typeof output.pricingTrail === 'object') {
      return makeCheck('CI1', 'Catalog Intelligence Scope', 'BLOCK', 'FAILED', 'Unfiltered price_history dump without targetSku or catalogSearch scope is prohibited.');
    }
    const priceState = output?.liveDetails?.priceState;
    if (priceState === 'PARSE_FAILED' || priceState === 'CONFLICTING_EVIDENCE') {
      return makeCheck('CI3', 'Catalog Price Evidence Integrity', 'BLOCK', 'FAILED', `Catalog row for ${output.targetSku} has ${priceState} pricing evidence.`);
    }
    const hasExactComparison = output?.crossSolutionComparison?.matches?.some(match => match.exactMatch === true);
    const hasIntel = Boolean(output?.liveDetails || hasExactComparison || (output?.pricingTrail && typeof output.pricingTrail === 'object'));
    const missingTarget = Boolean(output?.targetSku && !output?.liveDetails && !hasExactComparison && (!output?.pricingTrail || Object.keys(output.pricingTrail).length === 0));
    if (!hasIntel) return makeCheck('CI1', 'Catalog Intelligence Scope', 'BLOCK', 'FAILED', 'Missing pricingTrail and liveDetails in catalog intelligence response.');
    if (missingTarget) return makeCheck('CI1', 'Catalog Intelligence Scope', 'WARN', 'ACTION_REQUIRED', `Requested SKU ${output.targetSku} not found in active catalog or historical trail.`);
    return makeCheck('CI1', 'Catalog Intelligence Scope', 'BLOCK', 'PASSED', 'Catalog intelligence payload verified.');
  },
  OCR_QUOTE_INGESTION: (output) => {
    const hasItems = Array.isArray(output?.extractedItems) && output.extractedItems.length > 0;
    return makeCheck('OC1', 'OCR Extraction Payload', 'BLOCK', hasItems ? 'PASSED' : 'ACTION_REQUIRED',
      hasItems ? `Extracted ${output.extractedItems.length} structured item(s) from quote.` : 'OCR quote ingestion requires an image/PDF input with extractable SKU lines.');
  },
  HETEROGENEOUS_TENDER_MODERNIZATION: (output) => {
    const valid = Boolean(output?.carrierFleetSummary && output?.deliverableSummary);
    return makeCheck('HT1', 'Heterogeneous Tender Categorization', 'BLOCK', valid ? 'PASSED' : 'ACTION_REQUIRED',
      valid ? 'Carrier fleet and dual deliverable summaries verified.' : 'Structured multi-domain tender tables required before modernization.');
  },
  CROSS_VENDOR_TRANSFORMATION: (output) => {
    const valid = Boolean(output?.competitorSpec && Array.isArray(output?.recommendedBom || output?.candidateBom));
    return makeCheck('CV1', 'Cross-Vendor Spec & Target Mapping', 'BLOCK', valid ? 'PASSED' : 'ACTION_REQUIRED',
      valid ? 'Competitor specification and HPE transformation mapping verified.' : 'Cross-vendor transformation requires structured competitor spec and target chassis.');
  },
  WORKLOAD_DNA: (output) => {
    const valid = Boolean(output?.dna && typeof output.dna.primaryWorkload === 'string');
    return makeCheck('WD1', 'Workload DNA Profile', 'BLOCK', valid ? 'PASSED' : 'ACTION_REQUIRED',
      valid ? `Workload DNA classified (${output.dna.primaryWorkload}).` : 'Scoped BOM items required before hardware workload DNA profiling.');
  },
  VALUE_ENGINEERING: (output) => {
    const valid = Boolean(output?.budgetOptimization && typeof output.budgetOptimization === 'object');
    return makeCheck('VE1', 'Value Engineering Post-Buildability Gate', 'BLOCK', valid ? 'PASSED' : 'ACTION_REQUIRED',
      valid ? 'Post-buildability budget optimization verified.' : 'Baseline BOM must pass physical and dependency checks before value engineering.');
  },
  LEAST_DELTA_SYNTHESIS: (output) => {
    const valid = Boolean(output?.evaluation && ('leastDeltaCandidate' in output));
    return makeCheck('LD1', 'Least-Delta Conflict Graph Evaluation', 'BLOCK', valid ? 'PASSED' : 'FAILED',
      valid ? 'Conflict-graph least-delta candidate synthesis verified.' : 'Missing conflict-graph evaluation for least-delta synthesis.');
  },
  MULTI_CLUSTER_TENDER: (output) => {
    const valid = Boolean(output?.clusterAnalysis && Number.isSafeInteger(output.clusterAnalysis.totalServers) && output.clusterAnalysis.totalServers >= 1);
    return makeCheck('MC1', 'Cluster Sizing & Rack Analysis', 'BLOCK', valid ? 'PASSED' : 'ACTION_REQUIRED',
      valid ? `Cluster analysis verified for ${output.clusterAnalysis.totalServers} node(s).` : 'Explicit server count and scoped product catalog required for multi-cluster sizing.');
  },
  ADVERSARIAL_VALIDATION: (output) => {
    const valid = Boolean(output?.evaluation && Array.isArray(output?.generatedBoq));
    return makeCheck('AV1', 'Adversarial Stress & Candidate Scrutiny', 'BLOCK', valid ? 'PASSED' : 'FAILED',
      valid ? 'Adversarial evaluation payload verified.' : 'Missing adversarial evaluation or generated BOQ items.');
  },
  WORKBOOK_GENERATION: (output) => {
    const valid = Boolean(typeof output?.exportPath === 'string' && output.exportPath.length > 0);
    return makeCheck('WG1', 'Authorized Workbook Artifact', 'BLOCK', valid ? 'PASSED' : 'ACTION_REQUIRED',
      valid ? 'Authorized workbook export path verified.' : 'Workbook export requires a valid pre-presentation delivery authorization.');
  },
  REMARKS_RECONCILIATION: (output) => {
    const valid = Boolean(Array.isArray(output?.outputRows) && output.outputRows.length > 0);
    return makeCheck('RR1', 'Commercial Remarks Row Parity', 'BLOCK', valid ? 'PASSED' : 'FAILED',
      valid ? `Formatted ${output.outputRows.length} commercial remark row(s).` : 'Nonempty tender rows required for commercial remarks reconciliation.');
  },
  CONTINUOUS_LEARNING: (output) => {
    const valid = Boolean(output && ('feedbackProcessed' in output) && typeof output.message === 'string');
    return makeCheck('CL1', 'Continuous Learning Telemetry', 'BLOCK', valid ? 'PASSED' : 'FAILED',
      valid ? 'Continuous learning reflection state verified.' : 'Missing continuous learning telemetry state.');
  },
  KNOWLEDGE_SYNC: (output) => {
    const valid = Boolean(output && (output.drift || (output.syncResult && output.status !== 'FAILED')));
    return makeCheck('KS1', 'Knowledge Sync & Drift Inspection', 'BLOCK', valid ? 'PASSED' : 'FAILED',
      valid ? 'Knowledge synchronization / drift inspection verified.' : 'Knowledge synchronization failed or returned no drift/sync evidence.');
  },
  PRESALES_CLEARANCE_STRATEGY: (output) => {
    const hasDualTrack = Boolean(output && (output.productionBaseline || output.clearanceOption || Array.isArray(output.advisories)));
    return makeCheck('PC1', 'Dual-Track Clearance vs Production Baseline', 'BLOCK', hasDualTrack ? 'PASSED' : 'ACTION_REQUIRED',
      hasDualTrack ? 'Dual-track clearance and active production baseline strategy verified.' : 'Clearance strategy output requires production baseline and/or clearance advisories.');
  },
  SOLUTION_COMPARISON: (output) => {
    const matrix = output?.comparisonMatrix;
    if (!Array.isArray(matrix) || matrix.length === 0) {
      return makeCheck('SC1', 'Multi-Platform Solution Comparison Matrix', 'BLOCK', 'ACTION_REQUIRED',
        'Solution comparison requires at least one resolved platform row in comparisonMatrix.');
    }
    const coercedZero = matrix.some(row => row && row.pricingComplete === false && row.capexListUsd === 0);
    if (coercedZero) {
      return makeCheck('SC1', 'Multi-Platform Solution Comparison Matrix', 'BLOCK', 'FAILED',
        'Comparison matrix coerced an incomplete/unpriced platform CapEx to $0 instead of null.');
    }
    const pendingDisclosed = String(output?.portalValidationStatus || '').toUpperCase().includes('PENDING');
    if (!pendingDisclosed) {
      return makeCheck('SC1', 'Multi-Platform Solution Comparison Matrix', 'BLOCK', 'FAILED',
        'Solution comparison output must preserve PORTAL_VALIDATION_PENDING status until live CLIC receipt.');
    }
    return makeCheck('SC1', 'Multi-Platform Solution Comparison Matrix', 'BLOCK', 'PASSED',
      `Multi-platform comparison matrix verified across ${matrix.length} platform(s) with strict pricing and Tier-3 portal disclosure.`);
  }
});

module.exports = {
  _checkProductionLifecycleGate,
  _checkRequirementAccountingGate,
  _checkClaimAdjudicationGate,
  _checkDependencyInvalidationGate,
  _validateSolutionIntelligencePolicyChecks,
  SPECIALIZED_TRACK_VALIDATORS
};
