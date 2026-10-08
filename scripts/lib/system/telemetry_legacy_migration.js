'use strict';
// Pure projection only: legacy values remain raw/unverified, never reclassified by guess.
const { normalizeTelemetryMeasurement } = require('./telemetry_measurement.js');
const LEGACY_STREAMS = Object.freeze({ history: 'EVALUATION', learnedDeltas: 'LEARNING', notebookConsultations: 'NOTEBOOK_CONSULTATION', cleansingAuditLogs: 'CLEANSING', ocrAuditLogs: 'OCR', exportHistory: 'EXPORT', reconciliationHistory: 'RECONCILIATION', guardrailHistory: 'GUARDRAIL' });

function migrateLegacyTelemetry(legacy, options = {}) {
  const issues = [], entries = [];
  const sourceRef = typeof options?.sourceRef === 'string' && options.sourceRef.trim() ? options.sourceRef : null;
  if (!sourceRef) issues.push({ code: 'LEGACY_SOURCE_REFERENCE_REQUIRED' });
  if (legacy === null || typeof legacy !== 'object' || Array.isArray(legacy)) issues.push({ code: 'LEGACY_SNAPSHOT_INVALID' });
  if (issues.length) return { valid: false, schemaVersion: 1, activation: 'UNUSED', legacySnapshot: legacy, entries, issues };
  for (const [stream, eventType] of Object.entries(LEGACY_STREAMS)) {
    if (legacy[stream] == null) continue;
    if (!Array.isArray(legacy[stream])) { issues.push({ code: 'LEGACY_STREAM_NOT_ARRAY', stream }); continue; }
    for (const [index, raw] of legacy[stream].entries()) {
      const entry = normalizeTelemetryMeasurement({ eventId: JSON.stringify([sourceRef, stream, index]), eventType });
      entry.origin = 'LEGACY_UNVERIFIED';
      entry.legacy = raw;
      entry.legacySource = { sourceRef, stream, index };
      entries.push(entry);
    }
  }
  return { valid: issues.length === 0, schemaVersion: 1, activation: 'UNUSED', sourceRef, legacySnapshot: legacy, entries, issues,
    limits: ['Projection does not edit, prune or persist source history.', 'All historical run kinds are UNCLASSIFIED; numeric/confidence/grounding/accuracy/delta/terminal values remain UNKNOWN.', 'Raw legacy values and unknown top-level fields remain in legacySnapshot; counts are migration coverage, not production metrics.'] };
}

module.exports = { LEGACY_STREAMS, migrateLegacyTelemetry };
