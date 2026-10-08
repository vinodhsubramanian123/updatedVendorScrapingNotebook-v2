'use strict';
// CP5 checks response structure. Never calls hardware, portal or delivery gates.
const { getPresalesResponseProfile } = require('./presales_response_profiles.js');
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.trim().length > 0;
const meaningful = value => text(value) || Array.isArray(value) && value.length > 0 || record(value) && Object.keys(value).length > 0;
const evidenceDomains = ['localValidation', 'documentGrounding', 'portalAcceptance', 'delivery', 'learning', 'sync'];
const executionStatuses = new Set(['COMPLETED', 'ACTION_REQUIRED', 'FAILED', 'CANCELLED', 'UNKNOWN']);
const evidenceStatuses = new Set(['PASSED', 'FAILED', 'PENDING', 'NOT_EVALUATED', 'NOT_APPLICABLE', 'UNKNOWN']);

function validateEvidenceMetadata(response) {
  const issues = [];
  for (const domain of evidenceDomains) {
    const state = response.evidenceStates?.[domain];
    if (!record(state) || !evidenceStatuses.has(state.status) || !Array.isArray(state.evidenceRefs) || !state.evidenceRefs.every(text)) issues.push({ code: 'EVIDENCE_STATE_INVALID', field: domain });
    else if (state.status === 'PASSED' && state.evidenceRefs.length === 0) issues.push({ code: 'AFFIRMATIVE_EVIDENCE_MISSING', field: domain });
    if (!['UNOBSERVED', 'SOURCE_DECLARATION_NOT_INDEPENDENTLY_VERIFIED'].includes(state?.verification)) issues.push({ code: 'EVIDENCE_VERIFICATION_UNKNOWN', field: domain });
    if (state?.status === 'PASSED' && state.verification !== 'SOURCE_DECLARATION_NOT_INDEPENDENTLY_VERIFIED') issues.push({ code: 'EVIDENCE_VERIFICATION_OVERCLAIM', field: domain });
  }
  return issues;
}

function validateContractMetadata(response, profile) {
  const issues = [];
  if (!executionStatuses.has(response.executionStatus)) issues.push({ code: 'EXECUTION_STATUS_UNKNOWN_ENUM' });
  if (profile && (response.baseProfileId !== profile.profileId || response.profileKnown !== true)) issues.push({ code: 'PROFILE_ID_MISMATCH' });
  if (profile && response.responseDisposition !== 'DIAGNOSTIC' && response.responseDisposition !== profile.disposition) issues.push({ code: 'RESPONSE_DISPOSITION_MISMATCH' });
  if (profile && response.profileId !== (response.responseDisposition === 'DIAGNOSTIC' ? 'DIAGNOSTIC_ADVISORY' : profile.profileId)) issues.push({ code: 'PROFILE_ID_MISMATCH' });
  if (!Array.isArray(response.unresolvedRequirements) || !response.unresolvedRequirements.every(text)) issues.push({ code: 'UNRESOLVED_REQUIREMENTS_MISSING_OR_INVALID' });
  issues.push(...validateEvidenceMetadata(response));
  return issues;
}

function validateProfileContent(response, profile) {
  const data = response.payload;
  const issues = [];
  if (!record(data)) return [{ code: 'EMPTY_RESPONSE', detail: 'Expected a result object; original non-object value is retained in legacy.' }];
  if (!profile.contentFields.some(field => meaningful(data[field]))) issues.push({ code: 'PROFILE_CONTENT_MISSING', detail: `Expected meaningful ${profile.contentFields.join(' or ')}; a status/badge/message alone is not completed profile content.` });
  if (profile.intent === 'BOM_RECONCILIATION' && typeof data.isTwoBaselineComparison !== 'boolean') issues.push({ code: 'BASELINE_MODE_UNKNOWN', detail: 'Declare two-baseline comparison or single-file audit explicitly.' });
  if (profile.intent === 'ADVERSARIAL_VALIDATION' && (!Array.isArray(data.generatedBoq) || !record(data.evaluation))) issues.push({ code: 'SYNTHETIC_POPULATION_MISSING', detail: 'Synthetic test report requires generated population and observed evaluation; no customer certification.' });
  if (profile.intent === 'WORKBOOK_GENERATION' && !text(data.exportPath)) issues.push({ code: 'ARTIFACT_REFERENCE_MISSING', detail: 'Expected an explicit path; path presence is not file existence or delivery authorization.' });
  return issues;
}

function verifyPresalesResponseAcceptance(response) {
  const issues = [];
  if (!record(response) || response.schemaVersion !== 1 || response.acceptanceScope !== 'RESPONSE_STRUCTURE_ONLY') {
    return { responseValid: false, responseStatus: 'INVALID', deliveryAuthorized: false, issues: [{ code: 'INVALID_RESPONSE_CONTRACT', detail: 'Adapt using the opt-in versioned response adapter first.' }] };
  }
  const profile = getPresalesResponseProfile(response.intent);
  if (!profile) issues.push({ code: 'UNKNOWN_ROUTE_PROFILE', detail: 'No declared response profile; clarify the intended objective.' });
  if (response.deliveryAuthorized !== false) issues.push({ code: 'DELIVERY_AUTHORITY_LEAK', detail: 'Response validity must not authorize delivery.' });
  if (!Array.isArray(response.normalizationIssues)) issues.push({ code: 'NORMALIZATION_STATE_MISSING' });
  else issues.push(...response.normalizationIssues);
  issues.push(...validateContractMetadata(response, profile));
  if (response.responseDisposition === 'DIAGNOSTIC') {
    if (!text(response.diagnosticReason)) issues.push({ code: 'DIAGNOSTIC_REASON_MISSING', detail: 'State what failed or which input is missing.' });
    if (!text(response.nextAction)) issues.push({ code: 'DIAGNOSTIC_NEXT_ACTION_MISSING', detail: 'State the executable corrective step.' });
  } else if (profile) issues.push(...validateProfileContent(response, profile));
  const responseValid = issues.length === 0;
  return { responseValid, responseStatus: responseValid ? 'VALID' : 'INCOMPLETE', deliveryAuthorized: false, acceptanceScope: 'RESPONSE_STRUCTURE_ONLY', issues };
}

module.exports = { verifyPresalesResponseAcceptance };
