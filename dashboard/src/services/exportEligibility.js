/**
 * dashboard/src/services/exportEligibility.js
 *
 * Pure helpers for deriving customer workbook export eligibility and
 * distinct evidence states from normalised evaluation results.
 */

function _blockedEligibility(reason) {
  return { eligible: false, state: 'BLOCKED', reason };
}

function _validateTierForExport(tier) {
  if (!tier) return null;
  if (tier.physicalMathClean === false) {
    return _blockedEligibility(`Strategy Rank ${tier.rank} failed physical math checks and cannot be exported.`);
  }
  const parts = tier.skuPartsList || tier.skuList || [];
  if (!Array.isArray(parts) || parts.length === 0) {
    return _blockedEligibility(`Strategy Rank ${tier.rank} contains zero candidate BOM items.`);
  }
  return null;
}

function _checkGateAndAuthEligibility(evalResults, inner) {
  const blockerDetail = inner.deliveryAuthError || evalResults.deliveryAuthError || null;
  const gate = inner.acceptanceGate || evalResults.acceptanceGate || null;
  if (!gate || gate.isValid !== true) {
    const gateBlockers = Array.isArray(gate?.blockers) && gate.blockers.length > 0
      ? gate.blockers.map(b => b.detail || b.name || b.id).join('; ')
      : null;
    return {
      blocked: _blockedEligibility(blockerDetail || gateBlockers || 'Pre-presentation acceptance gate did not pass (check offline grounding or blockers).')
    };
  }
  const auth = inner.deliveryAuthorization || evalResults.deliveryAuthorization || null;
  if (!auth || !auth.token || !auth.signature) {
    return { blocked: _blockedEligibility(blockerDetail || 'Cryptographic DeliveryAuthorization token is missing for this run.') };
  }
  return { blocked: null, auth };
}

export function getCandidateExportEligibility(evalResults, tier = null) {
  if (!evalResults || typeof evalResults !== 'object') {
    return { eligible: false, state: 'UNAVAILABLE', reason: 'No evaluation run loaded.' };
  }
  const inner = evalResults.evalResults && typeof evalResults.evalResults === 'object' ? evalResults.evalResults : evalResults;
  if (evalResults.isContractInvalid === true || inner.isContractInvalid === true || evalResults.contractStatus === 'SCHEMA_INVALID') {
    return _blockedEligibility('Evaluator output failed runtime schema contract validation.');
  }
  if ((inner.customerDisposition || evalResults.customerDisposition) === 'DELIVERY_BLOCKED_UNBUILDABLE') {
    return _blockedEligibility(inner.deliveryAuthError || evalResults.deliveryAuthError || 'Candidate is unbuildable until critical physical violations are resolved.');
  }
  const runId = evalResults.runId || inner.runId || null;
  if (!runId) {
    return _blockedEligibility('Server-held evaluation run ID is unavailable. Re-evaluate the BOQ before customer export.');
  }
  const authCheck = _checkGateAndAuthEligibility(evalResults, inner);
  if (authCheck.blocked) return authCheck.blocked;
  const tierBlocked = _validateTierForExport(tier);
  if (tierBlocked) return tierBlocked;

  return {
    eligible: true,
    state: 'AUTHORIZED',
    reason: null,
    runId,
    tokenPrefix: String(authCheck.auth.token).slice(0, 22),
    manifestFingerprint: inner.manifestFingerprint || evalResults.manifestFingerprint || authCheck.auth.manifestFingerprint || null
  };
}

export function deriveEvidenceStates(evalResults) {
  if (!evalResults || typeof evalResults !== 'object') {
    return {
      vendorAcceptance: 'PORTAL VALIDATION PENDING',
      candidateDocumentReview: 'UNVERIFIED',
      deliveryAuthorization: { state: 'UNAVAILABLE', reason: 'No evaluation run loaded.', tokenPrefix: null, manifestFingerprint: null }
    };
  }

  const rawPortal = evalResults.portalValidationStatus || 'PORTAL VALIDATION PENDING';
  const vendorAcceptance = rawPortal === 'PENDING' ? 'PORTAL VALIDATION PENDING' : rawPortal;

  const docReview = evalResults.ephemeralSourceValidation;
  let candidateDocumentReview = 'UNVERIFIED';
  if (docReview?.isCloudGrounded === true && docReview?.success === true) {
    candidateDocumentReview = docReview.doubleCheckVerdict || 'VERIFIED (GROUNDED)';
  } else if (docReview?.doubleCheckVerdict) {
    candidateDocumentReview = docReview.doubleCheckVerdict;
  } else if (evalResults.offlineMode === true || evalResults.effectivePolicy?.offline === true) {
    candidateDocumentReview = 'NOT RUN (LOCAL ONLY)';
  }

  return {
    vendorAcceptance,
    candidateDocumentReview,
    deliveryAuthorization: getCandidateExportEligibility(evalResults)
  };
}
