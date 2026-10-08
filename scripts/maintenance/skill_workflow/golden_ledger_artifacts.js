'use strict';
// CP0 v2: exact returned-trace ledger artifacts only. Generic artifacts stay intact.
const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');
const BASE = 'outputs/history/evidence_logs/';
const RUNTIME_VALUE = '<GENERATED_LEDGER_RUNTIME_FIELD>';
const timestampPaths = Object.freeze(['startedAt', 'completedAt', 'events.*.timestamp', 'artifacts.*.recordedAt',
  'phases.phase_1.startedAt', 'phases.phase_1.completedAt', 'phases.phase_2.startedAt', 'phases.phase_2.completedAt']);
const elapsedPaths = Object.freeze(['totalDurationMs', 'phases.phase_1.durationMs', 'phases.phase_2.durationMs']);
const ledgerArtifactPolicy = Object.freeze({ schemaVersion: '2.0.0', binding: 'EXACT_RETURNED_TRACE_ID_AND_LEDGER_PATH',
  timestampPaths, elapsedPaths, summary: 'EXACT_UTF8_REPRODUCTION_BY_COPIED_CANONICAL_LEDGER_RENDERER',
  genericArtifacts: 'UNCHANGED', completeLedgerFacts: 'PRESERVED', rawArtifactBytesAndHashes: 'RETAINED' });
const plain = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
function returnedTraceIds(parsed) {
  return [...new Set([parsed.response?.traceId, parsed.response?.result?.traceId,
    ...(parsed.envelopes || []).map(envelope => envelope?.data?.traceId)]
    .filter(id => typeof id === 'string' && /^(?:TRC|TRACE)-[A-Za-z0-9_-]+$/.test(id)))];
}
function validIso(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().replace('.000Z', 'Z') === value.replace('.000Z', 'Z');
}
function matches(pattern, segments) {
  const parts = pattern.split('.');
  return parts.length === segments.length && parts.every((part, index) => part === '*' || part === segments[index]);
}
function projectLedgerRuntime(value, segments = []) {
  if (timestampPaths.some(pattern => matches(pattern, segments)) && validIso(value)) return RUNTIME_VALUE;
  if (elapsedPaths.some(pattern => matches(pattern, segments)) && typeof value === 'number' && Number.isFinite(value) && value >= 0) return RUNTIME_VALUE;
  if (Array.isArray(value)) return value.map((item, index) => projectLedgerRuntime(item, [...segments, String(index)]));
  if (plain(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, projectLedgerRuntime(item, [...segments, key])]));
  return value;
}
function isBoundLedger(artifact, ids) {
  const content = artifact.content;
  if (artifact.state !== 'PARSED_JSON' || !plain(content) || content.version !== '2.0.0' || !ids.includes(content.traceId) ||
    artifact.path !== `${BASE}evidence_log_${content.traceId}.json`) return false;
  const arrays = ['events', 'candidateAttempts', 'phaseResolutions', 'workflowFailures', 'artifacts', 'activeRulesReached',
    'arbitrationDecisions', 'modernizationDecisions', 'skuAuditLedger', 'notebookLmTraces'];
  return arrays.every(key => Array.isArray(content[key])) && ['execution', 'health', 'customerInput', 'sharedState', 'phases'].every(key => plain(content[key]))
    && content.events.every(plain) && Object.values(content.phases).every(plain);
}
function verifiedSummary(artifact, ledger, root) {
  const file = path.resolve(root, artifact.path), renderer = path.resolve(root, 'scripts/lib/system/evidence_ledger.js');
  try {
    if (fs.realpathSync(file) !== file || fs.realpathSync(renderer) !== renderer) return null;
    const bytes = fs.readFileSync(file);
    if (bytes.length !== artifact.bytes || createHash('sha256').update(bytes).digest('hex') !== artifact.sha256) return null;
    const { EvidenceLedger } = require(renderer);
    const instance = Object.create(EvidenceLedger.prototype);
    Object.defineProperties(instance, Object.fromEntries(Object.entries(ledger.content).map(([key, value]) => [key, { value, enumerable: true, writable: true, configurable: true }])));
    const rendered = EvidenceLedger.prototype._renderMarkdownSummary.call(instance);
    if (!Buffer.from(rendered, 'utf8').equals(bytes)) return null;
    return { path: artifact.path, state: 'VERIFIED_CANONICAL_LEDGER_SUMMARY', pairedLedgerPath: ledger.path,
      rendererSha256: createHash('sha256').update(fs.readFileSync(renderer)).digest('hex'), content: projectLedgerRuntime(ledger.content) };
  } catch { return null; }
}
function projectLedgerArtifacts(artifacts, parsed, root) {
  const ids = returnedTraceIds(parsed), bound = artifacts.filter(artifact => isBoundLedger(artifact, ids));
  return artifacts.map(artifact => {
    if (bound.includes(artifact)) return { path: artifact.path, state: 'BOUND_EVIDENCE_LEDGER', content: projectLedgerRuntime(artifact.content) };
    if (artifact.state !== 'EXACT_BYTES') return artifact;
    const ledger = bound.find(item => artifact.path === `${BASE}evidence_summary_${item.content.traceId}.md`);
    return ledger ? verifiedSummary(artifact, ledger, root) || artifact : artifact;
  });
}
module.exports = { ledgerArtifactPolicy, returnedTraceIds, validIso, projectLedgerRuntime, isBoundLedger, verifiedSummary, projectLedgerArtifacts };
