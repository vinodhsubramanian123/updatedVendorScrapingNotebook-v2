'use strict';
/**
 * scripts/lib/boq/bom_verifier.js — Pre-Presentation Acceptance Gate (U1–U6, B1–B24)
 *
 * Thin modular orchestrator delegating gate families to scripts/lib/boq/gates/*.
 * Conforms to output-validation-skill (.agents/skills/output-validation-skill/SKILL.md):
 * - INV-105: Zero-Default Success Guard
 * - INV-104: Non-Repudiation on Disk
 * - INV-0: Four-Tier Epistemic Discipline
 */

const { isValidHpeSKU, cleanBaseSKU, buildCatalogSkuIndex } = require('../catalog/sku.js');
const { makeCheck } = require('./gates/gate_check_builder.js');
const { _checkPortalReceiptIntegrity } = require('./gates/portal_receipt_gates.js');
const { _checkTurnkeyDeploymentCompleteness } = require('./gates/turnkey_racking_gates.js');
const { _validateSolutionIntelligencePolicyChecks, _checkProductionLifecycleGate, SPECIALIZED_TRACK_VALIDATORS } = require('./gates/si_policy_gates.js');
const {
  _checkPhysicalAspects,
  _checkRankedSolutions,
  _checkFinancialPricing,
  _checkUnsolicitedServices,
  _checkMandatoryAccessories,
  _checkNotebookGrounding,
  _checkMandatoryComPolicy,
  _checkDeliveryFeasibility,
  _checkUnmatchedSkus,
  _checkUnresolvedRequirements,
  _checkQuantityConservation
} = require('./gates/boq_core_gates.js');

function _checkU1NonEmpty(output) {
  if (!output) return false;
  if (typeof output === 'string') return output.trim().length > 0;
  if (Array.isArray(output.items) && output.items.length > 0) return true;
  if (Array.isArray(output.rankedSolutions) && output.rankedSolutions.length > 0) return true;
  if (output.result && typeof output.result === 'object' && Object.keys(output.result).length > 0) return true;
  if (typeof output.answer === 'string' && output.answer.trim().length > 0) return true;
  if (typeof output.message === 'string' && output.message.trim().length > 0) return true;
  if (Array.isArray(output.extractedItems) && output.extractedItems.length > 0) return true;
  if (Array.isArray(output.recommendedBom) && output.recommendedBom.length > 0) return true;
  if (Array.isArray(output.generatedBoq) && output.generatedBoq.length > 0) return true;
  if (typeof output.exportPath === 'string' && output.exportPath.trim().length > 0) return true;
  if (Array.isArray(output.outputRows) && output.outputRows.length > 0) return true;

  const objectFields = [
    'pricingTrail', 'auditReport', 'liveDetails', 'carrierFleetSummary',
    'deliverableSummary', 'competitorSpec', 'dna', 'budgetOptimization',
    'leastDeltaCandidate', 'clusterAnalysis', 'feedbackProcessed', 'drift', 'syncResult',
    'comparisonMatrix', 'paretoFrontier'
  ];
  return objectFields.some(field => output[field] !== undefined);
}

function _extractAllOutputSkus(output) {
  const extractedSkus = [];
  if (Array.isArray(output?.items)) {
    extractedSkus.push(...output.items.map(it => it.sku || it['Product #']).filter(Boolean));
  }
  const ranked = output?.rankedSolutions || output?.conflictGraph?.rankedSolutions;
  if (Array.isArray(ranked)) {
    ranked.forEach(r => {
      const parts = r.skuPartsList || r.skuList || [];
      extractedSkus.push(...parts.map(p => p.sku || p['Product #']).filter(Boolean));
    });
  }
  if (Array.isArray(output?.synthesizedBom)) {
    extractedSkus.push(...output.synthesizedBom.map(it => it.sku || it['Product #']).filter(Boolean));
  }
  if (typeof output?.answer === 'string') {
    const rawMatches = output.answer.match(/\b([A-Z0-9]{3,8}-[A-Z0-9]{3,4}|[A-Z0-9]{6}|[A-Z0-9]{5,8}AAE|[HURS][A-Z0-9]{4,11})\b/g) || [];
    extractedSkus.push(...rawMatches);
  }
  return [...new Set(extractedSkus.map(cleanBaseSKU).filter(Boolean))];
}

function _checkU3SkusPresent(uniqueSkus, catalogData) {
  if (uniqueSkus.length === 0) {
    return makeCheck('U3', 'Referenced SKUs Present in Scoped Catalog', 'BLOCK', 'NOT_APPLICABLE', 'No hardware part numbers referenced in response.');
  }

  const invalidSyntaxSkus = uniqueSkus.filter(s => !isValidHpeSKU(s));
  if (invalidSyntaxSkus.length > 0) {
    return makeCheck('U3', 'Referenced SKUs Present in Scoped Catalog', 'BLOCK', 'FAILED',
      `SKU syntax check failed: ${invalidSyntaxSkus.length} invalid part number(s) [${invalidSyntaxSkus.join(', ')}].`,
      { invalidSyntaxSkus });
  }

  if (!catalogData) {
    return makeCheck('U3', 'Referenced SKUs Present in Scoped Catalog', 'BLOCK', 'UNKNOWN',
      `All ${uniqueSkus.length} SKU(s) have valid HPE syntax, but scoped catalog data was not provided to verify catalog presence and lifecycle status.`,
      { uniqueSkusCount: uniqueSkus.length, catalogSupplied: false });
  }

  const catalogIndex = buildCatalogSkuIndex(catalogData);
  const unverifiedSkus = uniqueSkus.filter(s => !catalogIndex.has(s));
  if (unverifiedSkus.length > 0) {
    return makeCheck('U3', 'Referenced SKUs Present in Scoped Catalog', 'BLOCK', 'FAILED',
      `SKU catalog check failed: ${unverifiedSkus.length} SKU(s) absent from scoped catalog [${unverifiedSkus.join(', ')}].`,
      { unverifiedSkus, totalReferenced: uniqueSkus.length });
  }

  return makeCheck('U3', 'Referenced SKUs Present in Scoped Catalog', 'BLOCK', 'PASSED',
    `All ${uniqueSkus.length} referenced SKU(s) verified present in scoped catalog; live orderability remains separate.`,
    { verifiedCount: uniqueSkus.length });
}

function _checkU5HonestUncertainty(output) {
  const isAmbiguous = Boolean(output?.isAmbiguous || output?.requiresUserConfirmation);
  const honestReported = !isAmbiguous ||
    (typeof output?.message === 'string' && output.message.toLowerCase().includes('ambiguous')) ||
    (output?.confidence && output.confidence.score < 0.95);
  return honestReported
    ? makeCheck('U5', 'Honest Uncertainty', 'BLOCK', 'PASSED', 'Uncertainties, ambiguities, or gaps are transparently surfaced.')
    : makeCheck('U5', 'Honest Uncertainty', 'BLOCK', 'FAILED', 'Output has unresolved ambiguities that were not explicitly reported to the user.', { isAmbiguous });
}

function _checkU6ConditionalDiscovery(output, context, catalogData, chassis) {
  const runtimePlan = require('./runtime_discovery_plan').buildRuntimeDiscoveryPlan(output || {}, {
    catalogData, targetDir: context.catalogDir || context.targetDir || output?.catalogDir,
    productId: context.chassisName || chassis
  });
  if (runtimePlan.configurations.some(config => config.probes.length || config.blockers.length)) {
    return makeCheck('U6', 'BOQ-scoped Conditional Discovery', 'BLOCK', 'UNKNOWN',
      'Investigate absent/conditional SKUs in the exact live configuration; a catalog miss is not proof of incompatibility. Runtime plan is not vendor acceptance.',
      { runtimeDiscoveryPlan: runtimePlan });
  }
  return null;
}

function validateUniversalCriteria(output, context = {}) {
  const checks = [];

  const hasContent = _checkU1NonEmpty(output);
  checks.push(
    hasContent
      ? makeCheck('U1', 'Non-Empty Response', 'BLOCK', 'PASSED', 'Response contains actionable recommendations, data, or findings.')
      : makeCheck('U1', 'Non-Empty Response', 'BLOCK', 'FAILED', 'Response payload is empty, null, or undefined.', { outputType: typeof output })
  );

  const chassis = output?.chassis || output?.targetChassis || output?.detectedChassis?.model || context?.chassisName || null;
  const hasModelIdentified = Boolean(chassis && chassis !== 'UNKNOWN' && chassis !== 'Unknown' && chassis !== 'UNKNOWN_CHASSIS');
  checks.push(
    output?.priceDrifts || output?.code === 'PRICE_DRIFT_SCOPE_REQUIRED'
      ? makeCheck('U2', 'Catalog Portfolio Scope', 'WARN', 'NOT_APPLICABLE', 'Dated catalog comparisons can cover more than one platform.')
      : (output?.intent === 'SOLUTION_COMPARISON' || Array.isArray(output?.comparisonMatrix))
      ? makeCheck('U2', 'Multi-Platform Comparison Scope', 'WARN', 'PASSED', `Multi-platform solution comparison evaluated ${(output?.comparedPlatforms || output?.comparisonMatrix || []).length} platform(s).`, { comparedPlatforms: output?.comparedPlatforms || [] })
      : hasModelIdentified
      ? makeCheck('U2', 'Server Model Identified', 'WARN', 'PASSED', `Target product model identified: ${chassis}`, { chassis })
      : makeCheck('U2', 'Server Model Identified', 'WARN', 'UNKNOWN', 'Target server model or chassis is unmapped or unknown; general platform defaults applied.', { chassis })
  );

  const uniqueSkus = _extractAllOutputSkus(output);
  const catalogData = context.catalogData || output?.catalogData || output?.chassisInfo?.catalogData;
  checks.push(_checkU3SkusPresent(uniqueSkus, catalogData));

  const hasProvenance = Boolean(
    output?.timestamp || output?.provenance || output?.traceId ||
    output?.catalogDir || context?.catalogDir || output?.source
  );
  checks.push(
    hasProvenance
      ? makeCheck('U4', 'Timestamp & Provenance', 'WARN', 'PASSED', 'Execution timestamp and source catalog provenance are present.')
      : makeCheck('U4', 'Timestamp & Provenance', 'WARN', 'UNKNOWN', 'Execution timestamp or source catalog attribution is missing.', { hasProvenance: false })
  );

  checks.push(_checkU5HonestUncertainty(output));

  const u6Check = _checkU6ConditionalDiscovery(output, context, catalogData, chassis);
  if (u6Check) checks.push(u6Check);
  return checks;
}

function validateBoqEvaluationCriteria(output, context = {}) {
  return [
    _checkPhysicalAspects(output),
    ..._checkRankedSolutions(output),
    ..._checkFinancialPricing(output),
    _checkUnsolicitedServices(output, context),
    _checkMandatoryAccessories(output),
    _checkNotebookGrounding(output, context),
    _checkMandatoryComPolicy(output, context),
    _checkDeliveryFeasibility(output, context),
    _checkUnmatchedSkus(output, context),
    _checkUnresolvedRequirements(output, context),
    _checkQuantityConservation(output, context),
    _checkTurnkeyDeploymentCompleteness(output, context),
    _checkProductionLifecycleGate(output, context),
    _checkPortalReceiptIntegrity(output, context),
    ..._validateSolutionIntelligencePolicyChecks(output)
  ];
}

function validateRfpSizingCriteria(output, _context = {}) {
  if (output?.code === 'NINJA_ONLINE_SIZING_REQUIRED') {
    return [makeCheck('R6', 'HPE Ninja Online Storage Sizing', 'BLOCK', 'ACTION_REQUIRED',
      'Complete HPE Ninja Online sizing and import the vendor export before evaluating a storage BOM.')];
  }
  const checks = [];
  const resolvedRoles = output?.synthesizedRoles || output?.resolvedRoles || output?.resolutions || [];
  const unresolvedRoles = output?.unresolvedRoles || [];
  if (resolvedRoles.length === 0 && unresolvedRoles.length === 0) {
    checks.push(makeCheck('R1', 'All Detected Roles Resolved', 'BLOCK', 'UNKNOWN', 'Component role resolution was not performed or produced 0 roles.', { resolvedCount: 0 }));
  } else if (unresolvedRoles.length > 0) {
    checks.push(makeCheck('R1', 'All Detected Roles Resolved', 'BLOCK', 'ACTION_REQUIRED', `Unresolved component role(s): ${unresolvedRoles.join(', ')}.`, { unresolvedRoles }));
  } else {
    checks.push(makeCheck('R1', 'All Detected Roles Resolved', 'BLOCK', 'PASSED', `All ${resolvedRoles.length} workload component role(s) mapped to target SKUs.`, { resolvedCount: resolvedRoles.length }));
  }

  const items = output?.candidateBOM || output?.synthesizedBom || output?.items || [];
  const hasBaseChassis = items.some(it => {
    const desc = (it.description || '').toLowerCase();
    const sku = cleanBaseSKU(it.sku);
    return desc.includes('server') || desc.includes('cto') || desc.includes('chassis') ||
      (output?.chassisInfo?.baseSku && sku === cleanBaseSKU(output.chassisInfo.baseSku));
  });
  checks.push(
    hasBaseChassis
      ? makeCheck('R2', 'Base Chassis CTO Present', 'BLOCK', 'PASSED', 'Base server CTO chassis SKU included in synthesized BOM.')
      : makeCheck('R2', 'Base Chassis CTO Present', 'BLOCK', 'FAILED', 'Synthesized BOM is missing a base CTO server chassis SKU.', { itemsChecked: items.length })
  );

  const powerKw = output?.facilitySizing?.totalFacilityPowerKw || output?.powerEnvelopeKw || output?.clusterSizing?.totalFacilityPowerKw || null;
  checks.push(
    powerKw !== null && Number.isFinite(powerKw) && powerKw > 0
      ? makeCheck('R4', 'Power Envelope Calculated', 'WARN', 'PASSED', `Facility power envelope calculated (${powerKw.toFixed(2)} kW).`, { powerKw })
      : makeCheck('R4', 'Power Envelope Calculated', 'WARN', 'UNKNOWN', 'Facility electrical power envelope calculation omitted or uncomputed.', { powerKw })
  );

  const aspectChecks = output?.evaluation?.aspectChecks || [];
  checks.push(
    Array.isArray(aspectChecks) && aspectChecks.length >= 7
      ? makeCheck('R5', 'Piped Through 7-Aspect Validation', 'BLOCK', 'PASSED', `Synthesized BOM was routed through physical constraint verification (${aspectChecks.length} checks).`, { aspectCount: aspectChecks.length })
      : makeCheck('R5', 'Piped Through 7-Aspect Validation', 'BLOCK', 'FAILED', 'Synthesized BOM was presented raw without full 7-aspect physical validation.', { aspectCount: aspectChecks.length })
  );

  return checks;
}

function validateBomReconciliationCriteria(output, _context = {}) {
  const checks = [];
  const report = output?.auditReport || output;

  const hasMatches = Array.isArray(report?.directMatches);
  const hasMissing = Array.isArray(report?.missingItems || report?.missingFromVendor || report?.discrepancies?.removedByVendor);
  const hasExtras = Array.isArray(report?.unsolicitedExtras || report?.addedByVendor || report?.discrepancies?.addedByVendor);
  const hasSubs = Array.isArray(report?.substitutions || report?.priceDeltas || report?.discrepancies?.uncatalogedSkus);
  checks.push(
    hasMatches && hasMissing && hasExtras && hasSubs
      ? makeCheck('C1', '4 Audit Dimensions Populated', 'BLOCK', 'PASSED', 'Reconciliation covers Matches, Missing Items, Unsolicited Extras, and Substitutions/Price Deltas.')
      : makeCheck('C1', '4 Audit Dimensions Populated', 'BLOCK', 'FAILED', 'Reconciliation audit report is missing mandatory discrepancy dimensions.', { hasMatches, hasMissing, hasExtras, hasSubs })
  );

  const netDelta = report?.netCapexDelta ?? report?.summary?.netPriceDeltaUsd;
  const hasDelta = typeof netDelta === 'number' && Number.isFinite(netDelta);
  checks.push(
    hasDelta
      ? makeCheck('C2', 'Net CapEx Delta Calculated', 'WARN', 'PASSED', `Net CapEx variance calculated ($${netDelta.toFixed(2)}).`, { netDelta })
      : makeCheck('C2', 'Net CapEx Delta Calculated', 'WARN', 'UNKNOWN', 'Financial delta calculation missing from reconciliation report.', { netDelta })
  );

  const extras = report?.unsolicitedExtras || report?.addedByVendor || report?.discrepancies?.addedByVendor || [];
  if (extras.length === 0) {
    checks.push(makeCheck('C3', 'Unsolicited Extras Itemized', 'BLOCK', 'NOT_APPLICABLE', 'Zero unsolicited vendor extras detected in reconciliation.'));
  } else {
    const isItemized = extras.every(e => e && (e.sku || e.partNumber) && (e.unitPriceUsd !== undefined || e.listPrice !== undefined || e.quantity !== undefined || e.description));
    checks.push(
      isItemized
        ? makeCheck('C3', 'Unsolicited Extras Itemized', 'BLOCK', 'PASSED', `${extras.length} unsolicited vendor extra(s) itemized with individual details.`, { extrasCount: extras.length })
        : makeCheck('C3', 'Unsolicited Extras Itemized', 'BLOCK', 'ACTION_REQUIRED', 'Unsolicited extras present but missing itemized details.', { extrasCount: extras.length })
    );
  }

  return checks;
}

function validateFreeformQaCriteria(output, context = {}) {
  const checks = [];
  const citations = output?.citations || output?.groundingSources || [];
  checks.push(
    Array.isArray(citations) && citations.length > 0
      ? makeCheck('Q1', 'Answer References Ground-Truth Sources', 'WARN', 'PASSED', `Answer cites official sources (${citations.length} citation(s) or QuickSpecs rules).`, { citationsCount: citations.length })
      : makeCheck('Q1', 'Answer References Ground-Truth Sources', 'WARN', 'ACTION_REQUIRED', 'Answer lacks explicit citation to QuickSpecs, CLIC rules, or certified catalog.', { citationsCount: 0 })
  );

  const answer = output?.answer || '';
  const skusInAnswer = (answer.match(/\b([A-Z0-9]{3,8}-[A-Z0-9]{3,4}|[A-Z0-9]{6}|[A-Z0-9]{5,8}AAE|[HURS][A-Z0-9]{4,11})\b/g) || []).filter(isValidHpeSKU);
  if (skusInAnswer.length === 0) {
    checks.push(makeCheck('Q2', 'Part Numbers Verified', 'BLOCK', 'NOT_APPLICABLE', 'No hardware part numbers cited in answer.'));
  } else {
    const catalogData = context.catalogData || output?.catalogData || output?.chassisInfo?.catalogData;
    if (!catalogData) {
      checks.push(makeCheck('Q2', 'Part Numbers Verified', 'BLOCK', 'UNKNOWN',
        `Syntax valid for ${skusInAnswer.length} SKU(s), but catalog data was not supplied to verify catalog presence.`, { citedSkus: skusInAnswer }));
    } else {
      const catalogIndex = buildCatalogSkuIndex(catalogData);
      const absentSkus = skusInAnswer.filter(s => !catalogIndex.has(cleanBaseSKU(s)));
      if (absentSkus.length > 0) {
        checks.push(makeCheck('Q2', 'Part Numbers Verified', 'BLOCK', 'FAILED', `${absentSkus.length} SKU(s) absent from scoped catalog [${absentSkus.join(', ')}].`, { absentSkus }));
      } else {
        checks.push(makeCheck('Q2', 'Part Numbers Verified', 'BLOCK', 'PASSED', `All ${skusInAnswer.length} referenced SKU(s) verified in scoped catalog.`, { verifiedCount: skusInAnswer.length }));
      }
    }
  }
  return checks;
}

function verifyPrePresentationAcceptance(outputArtifact, track = 'BOQ_EVALUATION', context = {}) {
  const checks = [];
  checks.push(...validateUniversalCriteria(outputArtifact, context));

  const normTrack = String(track).toUpperCase().replace(/[\s-]/g, '_');
  if (normTrack === 'BOQ_EVALUATION') checks.push(...validateBoqEvaluationCriteria(outputArtifact, context));
  else if (normTrack === 'RFP_SIZING_TO_BOM') checks.push(...validateRfpSizingCriteria(outputArtifact, context));
  else if (normTrack === 'BOM_RECONCILIATION') checks.push(...validateBomReconciliationCriteria(outputArtifact, context));
  else if (normTrack === 'FREEFORM_QA') checks.push(...validateFreeformQaCriteria(outputArtifact, context));
  else if (Object.hasOwn(SPECIALIZED_TRACK_VALIDATORS, normTrack)) checks.push(SPECIALIZED_TRACK_VALIDATORS[normTrack](outputArtifact, context));
  else checks.push(makeCheck('TRACK_PROFILE', 'Track Specific Acceptance Profile', 'BLOCK', 'UNKNOWN', `No implemented delivery acceptance profile for ${normTrack}; universal diagnostics cannot certify this track.`));

  const blockers = checks.filter(c => c.severity === 'BLOCK' && (c.status === 'FAILED' || c.status === 'UNKNOWN' || c.status === 'ACTION_REQUIRED' || !c.passed));
  const warnings = checks.filter(c => c.severity === 'WARN' && (c.status === 'FAILED' || c.status === 'UNKNOWN' || c.status === 'ACTION_REQUIRED' || !c.passed));

  const hasFailedBlocker = blockers.some(b => b.status === 'FAILED');
  const hasUnknownBlocker = blockers.some(b => b.status === 'UNKNOWN' || b.status === 'ACTION_REQUIRED');

  let status;
  if (hasFailedBlocker) status = 'FAILED';
  else if (hasUnknownBlocker) status = 'INCOMPLETE';
  else if (warnings.length > 0) status = 'ACTION_REQUIRED';
  else status = 'PASSED';

  const isValid = status === 'PASSED';
  return {
    isValid,
    isApproved: isValid,
    status,
    track: normTrack,
    timestamp: new Date().toISOString(),
    blockersCount: blockers.length,
    warningsCount: warnings.length,
    totalChecks: checks.length,
    passedChecks: checks.filter(c => c.passed).length,
    blockers: blockers.map(b => ({ id: b.id, name: b.name, status: b.status, detail: b.detail })),
    warnings: warnings.map(w => ({ id: w.id, name: w.name, status: w.status, detail: w.detail })),
    checks
  };
}

function getPresalesResponseProfile(track) {
  return require('./presales_response_profiles.js').getPresalesResponseProfile(track);
}

function adaptPresalesResponse(legacy, options) {
  return require('../contracts/presales_response_adapter.js').adaptPresalesResponse(legacy, options);
}

function verifyPresalesResponseAcceptance(response) {
  return require('./presales_response_validator.js').verifyPresalesResponseAcceptance(response);
}

module.exports = {
  getPresalesResponseProfile,
  adaptPresalesResponse,
  verifyPresalesResponseAcceptance,
  verifyPrePresentationAcceptance,
  validateUniversalCriteria,
  validateBoqEvaluationCriteria,
  validateRfpSizingCriteria,
  validateBomReconciliationCriteria,
  validateFreeformQaCriteria
};
