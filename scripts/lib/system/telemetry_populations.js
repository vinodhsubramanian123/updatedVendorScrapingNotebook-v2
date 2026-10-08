'use strict';
// CP6 pure explicit-population summaries. Never reads or writes legacy telemetry.
const { RUN_KINDS, EVENT_TYPES, METRICS, validateTelemetryMeasurement } = require('./telemetry_measurement.js');

function numericSummary(entries, field) {
  const applicable = entries.map(e => e.metrics[field]).filter(m => m.status !== 'NOT_APPLICABLE');
  const observed = applicable.filter(m => m.status === 'OBSERVED');
  const total = observed.length ? observed.reduce((n, m) => n + m.value, 0) : null;
  const overflow = total !== null && (!Number.isFinite(total) || METRICS[field].integer && !Number.isSafeInteger(total));
  const sum = overflow ? null : total;
  return { eligible: applicable.length, observed: observed.length, unknown: applicable.length - observed.length,
    ineligible: entries.length - applicable.length, sum, mean: sum !== null ? sum / observed.length : null,
    coveragePercent: applicable.length ? observed.length / applicable.length * 100 : null,
    basis: 'OBSERVED_VALUES_ONLY', aggregationStatus: overflow ? 'OVERFLOW' : observed.length ? 'OBSERVED' : 'UNKNOWN' };
}

function outcomeSummary(entries, field) {
  const states = entries.map(e => e[field]);
  const eligible = states.filter(s => s.eligibility === 'ELIGIBLE');
  const observed = eligible.filter(s => s.status === 'OBSERVED');
  const numerator = observed.filter(s => s.value === true).length;
  return {
    numerator, denominator: observed.length, eligible: eligible.length, observed: observed.length,
    unknown: eligible.length - observed.length, unknownEligibility: states.filter(s => s.eligibility === 'UNKNOWN').length,
    ineligible: states.filter(s => s.eligibility === 'INELIGIBLE').length,
    ratePercent: observed.length ? numerator / observed.length * 100 : null,
    basis: 'OBSERVED_ELIGIBLE_EVENTS_ONLY', evidenceBasis: 'SOURCE_DECLARED_NOT_INDEPENDENTLY_VERIFIED'
  };
}

function checkPopulationInput(entries, selection) {
  const issues = [];
  if (!Array.isArray(entries)) return [{ code: 'POPULATION_NOT_ARRAY' }];
  if (!RUN_KINDS.includes(selection?.runKind) || !EVENT_TYPES.includes(selection?.eventType)) issues.push({ code: 'EXPLICIT_POPULATION_SELECTOR_REQUIRED' });
  const ids = new Set();
  for (const [index, entry] of entries.entries()) {
    for (const issue of validateTelemetryMeasurement(entry)) issues.push({ ...issue, index });
    if (ids.has(entry?.eventId)) issues.push({ code: 'DUPLICATE_EVENT_ID', index });
    ids.add(entry?.eventId);
  }
  return issues;
}

function summarizeTelemetryPopulation(entries, selection) {
  const issues = checkPopulationInput(entries, selection);
  if (issues.length) return { valid: false, schemaVersion: 1, activation: 'UNUSED', issues, summary: null };
  const population = entries.filter(e => e.runKind === selection.runKind && e.eventType === selection.eventType);
  const metrics = Object.fromEntries(Object.keys(METRICS).map(field => [field, numericSummary(population, field)]));
  const terminalObserved = population.filter(e => e.terminal.state !== 'UNKNOWN').length;
  return {
    valid: true, schemaVersion: 1, activation: 'UNUSED', issues: [],
    population: { runKind: selection.runKind, eventType: selection.eventType, selected: population.length, totalInput: entries.length, excluded: entries.length - population.length },
    metrics, affirmativeGrounding: outcomeSummary(population, 'affirmativeGrounding'),
    adjudicatedAccuracy: outcomeSummary(population, 'adjudicatedAccuracy'),
    terminalEvidence: { observed: terminalObserved, unknown: population.length - terminalObserved },
    limits: ['Declared populations and referenced observations only; evidence is not independently resolved.', 'Confidence coverage/mean are separate from independently adjudicated correctness.', 'newDeltasThisRun is observed event delta count; registry totals are never substituted.', 'Summaries describe the supplied collection only; no lifetime or retained-window total is inferred.']
  };
}

module.exports = { summarizeTelemetryPopulation };
