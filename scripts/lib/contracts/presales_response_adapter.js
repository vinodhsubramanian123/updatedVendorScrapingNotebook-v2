'use strict';
// CP5 pure, opt-in adapter. No clocks, IO, evaluator imports or delivery authority.
const { normalizeIntent, getPresalesResponseProfile } = require('../boq/presales_response_profiles.js');
const EVIDENCE_DOMAINS = Object.freeze(['localValidation', 'documentGrounding', 'portalAcceptance', 'delivery', 'learning', 'sync']);
const EVIDENCE_STATUSES = new Set(['PASSED', 'FAILED', 'PENDING', 'NOT_EVALUATED', 'NOT_APPLICABLE', 'UNKNOWN']);
const ACTION_STATUSES = new Set(['ACTION_REQUIRED', 'INPUT_REQUIRED', 'STRUCTURED_TENDER_REQUIRED', 'TARGET_PRODUCT_REQUIRED', 'SCOPED_SIZING_REQUIRED', 'BASELINE_VALIDATION_REQUIRED', 'REQUIRES_HUMAN_CLARIFICATION', 'VALIDATION_REQUIRED', 'NO_LEAST_DELTA_CANDIDATE', 'READY_FOR_OCR']);
const COMPLETED_STATUSES = new Set(['PASSED', 'PASS', 'SUCCESS', 'COMPLETED', 'ADVISORY', 'INSPECTED', 'FORMATTED']);
const DRAFT_STATUSES = new Set(['SIZING_DRAFT', 'DRAFT_VALIDATION_REQUIRED', 'CANDIDATE_EVALUATION_REQUIRED', 'CANDIDATE_REVIEW_REQUIRED', 'GENERATED_DRAFT', 'SINGLE_FILE_AUDIT']);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.trim().length > 0;

function mapExecutionStatus(status, blocked) {
  if (status === 'ERROR' || status === 'FAILED' || status === 'FAIL') return 'FAILED';
  if (status === 'CANCELLED' || status === 'CANCELED') return 'CANCELLED';
  if (blocked) return 'ACTION_REQUIRED'; // A planned candidate block cannot hide a fatal status.
  if (ACTION_STATUSES.has(status) || DRAFT_STATUSES.has(status)) return 'ACTION_REQUIRED';
  return COMPLETED_STATUSES.has(status) ? 'COMPLETED' : 'UNKNOWN';
}

function adaptEvidenceStates(declarations, issues) {
  const source = record(declarations) ? declarations : {};
  if (declarations != null && !record(declarations)) issues.push({ code: 'EVIDENCE_DECLARATIONS_INVALID', field: 'evidenceStates' });
  return Object.fromEntries(EVIDENCE_DOMAINS.map(domain => {
    const claim = source[domain];
    if (claim == null) return [domain, { status: 'UNKNOWN', declaredStatus: null, evidenceRefs: [], verification: 'UNOBSERVED' }];
    const validRefs = record(claim) && Array.isArray(claim.evidenceRefs) && claim.evidenceRefs.every(text);
    const refs = validRefs ? [...claim.evidenceRefs] : [];
    const validStatus = record(claim) && EVIDENCE_STATUSES.has(claim.status);
    const supported = validStatus && validRefs && (claim.status !== 'PASSED' || refs.length > 0);
    if (!supported) issues.push({ code: 'EVIDENCE_DECLARATION_INCOMPLETE', field: domain, detail: 'Unknown state or affirmative declaration without references.' });
    return [domain, { status: supported ? claim.status : 'UNKNOWN', declaredStatus: validStatus ? claim.status : null, evidenceRefs: refs, verification: 'SOURCE_DECLARATION_NOT_INDEPENDENTLY_VERIFIED' }];
  }));
}

function adaptCorrectiveContext(data, settings, profile, issues) {
  const diagnosticReason = text(data.message) ? data.message : text(data.error) ? data.error : null;
  const unresolved = settings.unresolvedRequirements ?? data.unresolvedRequirements ?? [];
  const validRequirements = Array.isArray(unresolved) && unresolved.every(text);
  if (!validRequirements) issues.push({ code: 'INVALID_UNRESOLVED_REQUIREMENTS', field: 'unresolvedRequirements' });
  const nextAction = text(data.suggestedAction) ? data.suggestedAction : text(settings.nextAction) ? settings.nextAction : profile?.nextAction || null;
  return { diagnosticReason, nextAction, unresolvedRequirements: validRequirements ? [...unresolved] : [] };
}

/**
 * Explicitly select RESULT (default) or ROUTER_ENVELOPE; never guess a wrapper.
 * legacy/payload are preserved by reference. New fields describe response shape
 * and source-declared evidence; they do not certify facts or authorize delivery.
 * No raw isApproved/PASS/badge/path/citation is promoted to evidence PASSED.
 */
function adaptPresalesResponse(legacy, options = {}) {
  const settings = record(options) ? options : {};
  const issues = [];
  const inputKind = settings.inputKind || 'RESULT';
  const router = inputKind === 'ROUTER_ENVELOPE';
  if (!['RESULT', 'ROUTER_ENVELOPE'].includes(inputKind)) issues.push({ code: 'UNKNOWN_INPUT_KIND', field: 'inputKind' });
  const payload = router ? (record(legacy) ? legacy.result : undefined) : legacy;
  const data = record(payload) ? payload : {};
  const intent = normalizeIntent(settings.intent ?? (router ? legacy?.classification?.intent : data.intent));
  const profile = getPresalesResponseProfile(intent);
  const legacyStatus = typeof data.status === 'string' ? data.status : null;
  const normalizedStatus = normalizeIntent(legacyStatus);
  const blocked = data.customerDisposition === 'DELIVERY_BLOCKED_UNBUILDABLE';
  const executionStatus = mapExecutionStatus(normalizedStatus, blocked);
  const diagnostic = blocked || ACTION_STATUSES.has(normalizedStatus) || ['FAILED', 'CANCELLED'].includes(executionStatus);
  const correctiveContext = adaptCorrectiveContext(data, settings, profile, issues);
  return {
    schemaVersion: 1, activation: 'UNUSED', legacy, payload, intent,
    profileId: diagnostic ? 'DIAGNOSTIC_ADVISORY' : profile?.profileId || null,
    baseProfileId: profile?.profileId || null, profileKnown: Boolean(profile), inputKind,
    executionStatus, legacyStatus,
    responseDisposition: diagnostic ? 'DIAGNOSTIC' : profile?.disposition || 'UNKNOWN',
    ...correctiveContext,
    evidenceStates: adaptEvidenceStates(settings.evidenceStates, issues),
    normalizationIssues: issues, deliveryAuthorized: false,
    acceptanceScope: 'RESPONSE_STRUCTURE_ONLY'
  };
}

module.exports = { EVIDENCE_DOMAINS, adaptPresalesResponse };
