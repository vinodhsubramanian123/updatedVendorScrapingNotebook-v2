'use strict';
// CP6 opt-in declarations/normalization only. No clocks, IO or environment inference.
const RUN_KINDS = Object.freeze(['PRODUCTION', 'TEST', 'FIXTURE', 'DEMO', 'UNCLASSIFIED']);
const EVENT_TYPES = Object.freeze(['EVALUATION', 'LEARNING', 'NOTEBOOK_CONSULTATION', 'CLEANSING', 'OCR', 'EXPORT', 'RECONCILIATION', 'GUARDRAIL', 'UNKNOWN']);
const METRICS = Object.freeze({
  durationMs: Object.freeze({ integer: false, max: Infinity }),
  confidenceScore: Object.freeze({ integer: false, max: 1 }),
  rulesEvaluated: Object.freeze({ integer: true, max: Number.MAX_SAFE_INTEGER }),
  newDeltasThisRun: Object.freeze({ integer: true, max: Number.MAX_SAFE_INTEGER })
});
const TERMINAL_STATES = ['COMPLETED', 'FAILED', 'CANCELLED', 'ACTION_REQUIRED'];
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.trim().length > 0;
const refs = value => Array.isArray(value) && value.every(text);

function numericMeasurement(raw, spec, field, issues) {
  const unknown = { status: 'UNKNOWN', value: null, evidenceRefs: [] };
  if (raw == null) return unknown;
  if (record(raw) && raw.status === 'NOT_APPLICABLE') return { ...unknown, status: 'NOT_APPLICABLE' };
  if (record(raw) && raw.status === 'UNKNOWN') return unknown;
  const validValue = record(raw) && typeof raw.value === 'number' && Number.isFinite(raw.value) && raw.value >= 0 && raw.value <= spec.max;
  const integerValid = !spec.integer || Number.isSafeInteger(raw?.value);
  if (!validValue || !integerValid || raw.status !== 'OBSERVED' || !refs(raw.evidenceRefs) || !raw.evidenceRefs.length) {
    issues.push({ code: 'MEASUREMENT_UNOBSERVED_OR_INVALID', field });
    return unknown;
  }
  return { status: 'OBSERVED', value: raw.value, evidenceRefs: [...raw.evidenceRefs] };
}

function outcomeMeasurement(raw, field, observerId, issues) {
  const result = { eligibility: 'UNKNOWN', status: 'UNKNOWN', value: null, evidenceRefs: [], nativeCitationRefs: [], reviewerId: null };
  if (raw == null) return result;
  if (!record(raw)) { issues.push({ code: 'OUTCOME_INVALID', field }); return result; }
  result.eligibility = raw.eligible === true ? 'ELIGIBLE' : raw.eligible === false ? 'INELIGIBLE' : 'UNKNOWN';
  if (result.eligibility === 'INELIGIBLE') return { ...result, status: 'NOT_APPLICABLE' };
  if (raw.status === 'UNKNOWN' || raw.status == null) return result;
  const observed = result.eligibility === 'ELIGIBLE' && raw.status === 'OBSERVED' && typeof raw.value === 'boolean' && refs(raw.evidenceRefs) && raw.evidenceRefs.length > 0;
  if (!observed) { issues.push({ code: 'OUTCOME_UNOBSERVED_OR_INVALID', field }); return result; }
  if (field === 'affirmativeGrounding' && raw.value && (!refs(raw.nativeCitationRefs) || !raw.nativeCitationRefs.length)) {
    issues.push({ code: 'GROUNDING_NATIVE_CITATIONS_MISSING', field }); return result;
  }
  if (field === 'adjudicatedAccuracy' && (!text(raw.reviewerId) || !text(observerId) || raw.reviewerId === observerId)) {
    issues.push({ code: 'ACCURACY_INDEPENDENT_REVIEW_MISSING', field }); return result;
  }
  return { ...result, status: 'OBSERVED', value: raw.value, evidenceRefs: [...raw.evidenceRefs], nativeCitationRefs: field === 'affirmativeGrounding' && raw.value ? [...raw.nativeCitationRefs] : [], reviewerId: field === 'adjudicatedAccuracy' ? raw.reviewerId : null };
}

function measurementIdentity(raw, issues) {
  if (!text(raw.eventId)) issues.push({ code: 'EVENT_ID_REQUIRED', field: 'eventId' });
  const runKind = RUN_KINDS.includes(raw.runKind) ? raw.runKind : 'UNCLASSIFIED';
  if (raw.runKind != null && runKind !== raw.runKind) issues.push({ code: 'RUN_KIND_INVALID', field: 'runKind' });
  const eventType = EVENT_TYPES.includes(raw.eventType) ? raw.eventType : 'UNKNOWN';
  if (raw.eventType != null && eventType !== raw.eventType) issues.push({ code: 'EVENT_TYPE_INVALID', field: 'eventType' });
  return {
    eventId: text(raw.eventId) ? raw.eventId : null, runKind, eventType,
    traceId: text(raw.traceId) ? raw.traceId : null, chassisModel: text(raw.chassisModel) ? raw.chassisModel : null,
    observerId: text(raw.observerId) ? raw.observerId : null,
    timestamp: text(raw.timestamp) ? raw.timestamp : null
  };
}

function terminalMeasurement(raw, issues) {
  const evidenceRefs = refs(raw.terminalEvidenceRefs) ? [...raw.terminalEvidenceRefs] : [];
  const claimed = TERMINAL_STATES.includes(raw.terminalState);
  if (claimed && !evidenceRefs.length) issues.push({ code: 'TERMINAL_EVIDENCE_MISSING', field: 'terminalState' });
  return { state: claimed && evidenceRefs.length ? raw.terminalState : 'UNKNOWN', declaredState: typeof raw.terminalState === 'string' ? raw.terminalState : null, evidenceRefs };
}

/** Input numeric/outcome observations must be explicitly tagged and referenced.
 * OBSERVED means caller-supplied observation; references/reviewer identities are
 * not independently resolved here. No legacy defaults count as measurements.
 */
function normalizeTelemetryMeasurement(input) {
  const issues = [], raw = record(input) ? input : {};
  if (!record(input)) issues.push({ code: 'MEASUREMENT_INPUT_INVALID' });
  if (raw.schemaVersion != null) issues.push({ code: 'VERSIONED_MEASUREMENT_USE_VALIDATOR', detail: 'Normalize raw observations only; validate versioned records without reinterpreting history.' });
  const identity = measurementIdentity(raw, issues);
  if (raw.metrics != null && !record(raw.metrics)) issues.push({ code: 'METRICS_INVALID' });
  const metrics = Object.fromEntries(Object.entries(METRICS).map(([field, spec]) => [field, numericMeasurement(raw.metrics?.[field], spec, field, issues)]));
  const stages = record(raw.stageDurations) ? raw.stageDurations : {};
  if (raw.stageDurations != null && !record(raw.stageDurations)) issues.push({ code: 'STAGES_INVALID' });
  const stageDurations = Object.fromEntries(Object.entries(stages).map(([name, value]) => [name, numericMeasurement(value, METRICS.durationMs, `stageDurations.${name}`, issues)]));
  return {
    schemaVersion: 1, activation: 'UNUSED', origin: 'EXPLICIT_OBSERVATION', evidenceBasis: 'SOURCE_DECLARED_NOT_INDEPENDENTLY_VERIFIED',
    ...identity, metrics, stageDurations, terminal: terminalMeasurement(raw, issues),
    affirmativeGrounding: outcomeMeasurement(raw.affirmativeGrounding, 'affirmativeGrounding', identity.observerId, issues),
    adjudicatedAccuracy: outcomeMeasurement(raw.adjudicatedAccuracy, 'adjudicatedAccuracy', identity.observerId, issues),
    issues
  };
}

function validNumeric(value, spec) {
  if (!record(value) || !refs(value.evidenceRefs)) return false;
  if (value.status === 'UNKNOWN' || value.status === 'NOT_APPLICABLE') return value.value === null;
  return value.status === 'OBSERVED' && value.evidenceRefs.length > 0 && typeof value.value === 'number' && Number.isFinite(value.value) && value.value >= 0 && value.value <= spec.max && (!spec.integer || Number.isSafeInteger(value.value));
}

function validOutcome(value, field, observerId) {
  if (!record(value) || !refs(value.evidenceRefs) || !refs(value.nativeCitationRefs)) return false;
  if (!['ELIGIBLE', 'INELIGIBLE', 'UNKNOWN'].includes(value.eligibility)) return false;
  if (value.status === 'NOT_APPLICABLE') return value.value === null && value.eligibility === 'INELIGIBLE';
  if (value.status === 'UNKNOWN') return value.value === null && value.eligibility !== 'INELIGIBLE';
  if (value.status !== 'OBSERVED' || value.eligibility !== 'ELIGIBLE' || typeof value.value !== 'boolean' || !value.evidenceRefs.length) return false;
  if (field === 'affirmativeGrounding') return !value.value || value.nativeCitationRefs.length > 0;
  return text(observerId) && text(value.reviewerId) && observerId !== value.reviewerId;
}

function validateLegacyProjection(value) {
  if (value.origin !== 'LEGACY_UNVERIFIED') return [];
  const source = value.legacySource;
  const lineageValid = record(source) && text(source.sourceRef) && text(source.stream) && Number.isSafeInteger(source.index) && source.index >= 0;
  const remainsUnknown = Object.values(value.metrics || {}).every(metric => metric?.status === 'UNKNOWN') && Object.keys(value.stageDurations || {}).length === 0 && value.terminal?.state === 'UNKNOWN' && value.affirmativeGrounding?.status === 'UNKNOWN' && value.adjudicatedAccuracy?.status === 'UNKNOWN';
  return value.runKind === 'UNCLASSIFIED' && lineageValid && remainsUnknown ? [] : [{ code: 'LEGACY_OBSERVATION_PROMOTION_PROHIBITED' }];
}

function validateTelemetryMeasurement(value) {
  const issues = [];
  if (!record(value) || value.schemaVersion !== 1 || value.activation !== 'UNUSED' || value.evidenceBasis !== 'SOURCE_DECLARED_NOT_INDEPENDENTLY_VERIFIED') return [{ code: 'MEASUREMENT_SCHEMA_INVALID' }];
  if (!text(value.eventId) || !RUN_KINDS.includes(value.runKind) || !EVENT_TYPES.includes(value.eventType)) issues.push({ code: 'MEASUREMENT_IDENTITY_INVALID' });
  if (!['EXPLICIT_OBSERVATION', 'LEGACY_UNVERIFIED'].includes(value.origin)) issues.push({ code: 'MEASUREMENT_ORIGIN_INVALID' });
  if (!Array.isArray(value.issues) || value.issues.length) issues.push({ code: 'MEASUREMENT_NORMALIZATION_ISSUES' });
  for (const [field, spec] of Object.entries(METRICS)) if (!validNumeric(value.metrics?.[field], spec)) issues.push({ code: 'METRIC_INVALID', field });
  if (!record(value.stageDurations)) issues.push({ code: 'STAGES_INVALID' });
  else for (const [field, stage] of Object.entries(value.stageDurations)) if (!validNumeric(stage, METRICS.durationMs)) issues.push({ code: 'STAGE_INVALID', field });
  for (const field of ['affirmativeGrounding', 'adjudicatedAccuracy']) if (!validOutcome(value[field], field, value.observerId)) issues.push({ code: 'OUTCOME_INVALID', field });
  const terminal = value.terminal;
  if (!record(terminal) || !refs(terminal.evidenceRefs) || ![...TERMINAL_STATES, 'UNKNOWN'].includes(terminal.state)) issues.push({ code: 'TERMINAL_INVALID' });
  else if (terminal.state !== 'UNKNOWN' && !terminal.evidenceRefs.length) issues.push({ code: 'TERMINAL_EVIDENCE_MISSING' });
  issues.push(...validateLegacyProjection(value));
  return issues;
}

module.exports = { RUN_KINDS, EVENT_TYPES, METRICS, normalizeTelemetryMeasurement, validateTelemetryMeasurement };
