'use strict';
const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');
const { isDeepStrictEqual } = require('util');
const { validIso, returnedTraceIds, isBoundLedger } = require('./golden_ledger_artifacts.js');
const { stages, marker, nonnegative, matches, formattedDuration, currentDecisions } = require('./golden_boq_runtime.js');
const { rfpEvaluation } = require('./golden_rfp_scope.js');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const clone = value => structuredClone(value);
const slash = value => value.split(path.sep).join('/');
const within = (base, file) => file === base || (!path.relative(base, file).startsWith('..') && !path.isAbsolute(path.relative(base, file)));
const datePaths = ['startedAt', 'completedAt', 'events.*.timestamp', 'candidateAttempts.*.timestamp', 'activeRulesReached.*.timestamp',
  'artifacts.*.recordedAt', 'skuAuditLedger.*.timestamp', 'notebookLmTraces.*.timestamp',
  'candidateAttempts.*.candidateGate.candidateResults.*.validation.checkedAt',
  'candidateAttempts.*.candidateGate.candidateResults.*.validation.graph.auditLog.*.timestamp',
  'candidateAttempts.*.candidateValidations.*.finalValidation.checkedAt',
  'candidateAttempts.*.candidateValidations.*.finalValidation.graph.auditLog.*.timestamp',
  ...Array.from({ length: 9 }, (_, i) => [`phases.phase_${i + 1}.startedAt`, `phases.phase_${i + 1}.completedAt`]).flat()];
const numberPaths = ['totalDurationMs', ...Array.from({ length: 9 }, (_, i) => `phases.phase_${i + 1}.durationMs`)];
const boqArtifactPolicy = Object.freeze({ binding: 'EXACT_RETURNED_PRODUCT_PATH_TRACE_AND_VERIFIED_RAW_ARCHIVE', datePaths: Object.freeze(datePaths), numberPaths: Object.freeze(numberPaths),
  analysisReportHash: 'RAW_SHA_SIZE_ROLE_PATH_VERIFIED_THEN_FULL_SEMANTIC_CONTENT_HASH', markdown: 'EXACT_PRODUCER_HEADER_AND_MATCHED_FORMATTED_LATENCY_LINES',
  histories: 'UNIQUE_INDEX_ZERO_CURRENT_RETURNED_ID_ONLY_AMBIGUITY_REJECTED_HISTORICAL_FIELDS_PRESERVED',
  rfpHistoryLedger: 'EXACT_TYPED_RFP_RETURNED_HISTORY_PATH_ALL_NINE_DECLARED_PHASE_NAMES_AND_RAW_BYTES', genericArtifacts: 'UNCHANGED', originalHashes: 'PRESERVED_IN_RAW_CAPTURE_AND_ARCHIVE' });
function projectLedger(value, segments = []) {
  if (datePaths.some(pattern => matches(pattern, segments)) && validIso(value)) return marker;
  if (numberPaths.some(pattern => matches(pattern, segments)) && nonnegative(value)) return marker;
  if (Array.isArray(value)) return value.map((part, index) => projectLedger(part, [...segments, String(index)]));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, part]) => [key, projectLedger(part, [...segments, key])]));
  return value;
}
function relativeReference(root, reference) {
  if (typeof reference !== 'string') return null;
  const file = path.resolve(root, reference);
  return within(root, file) ? slash(path.relative(root, file)) : null;
}
function canonicalViews(parsed) { return [parsed.response?.result, ...(parsed.envelopes || []).map(e => e?.data)].filter(Boolean); }
function verifiedBytes(artifact, root, options) {
  const records = (options.records || []).filter(record => record.path === artifact.path);
  if (records.length !== 1) return null;
  const record = records[0], base = path.resolve(options.artifactBase || root);
  const reference = options.artifactBase ? record.archivePath : record.path;
  if (typeof reference !== 'string') return null;
  const file = path.resolve(base, reference);
  try {
    if (!within(base, file) || fs.realpathSync(file) !== file || !fs.lstatSync(file).isFile()) return null;
    const bytes = fs.readFileSync(file);
    if (bytes.length !== record.bytes || digest(bytes) !== record.sha256) return null;
    if (artifact.state === 'EXACT_BYTES' && (artifact.sha256 !== record.sha256 || artifact.bytes !== record.bytes)) return null;
    if (artifact.state === 'PARSED_JSON' && !isDeepStrictEqual(JSON.parse(bytes.toString('utf8')), artifact.content)) return null;
    return { bytes, record };
  } catch { return null; }
}
function replaceRoot(text, root) {
  for (const variant of new Set([root, root.split('\\').join('/'), root.split('/').join('\\')])) text = text.split(variant).join('<ISOLATED_ROOT>');
  return text;
}
function replaceLine(text, prefix, suffix, validate) {
  const lines = text.split('\n'), indexes = lines.map((line, i) => line.startsWith(prefix) && line.endsWith(suffix) ? i : -1).filter(i => i >= 0);
  if (indexes.length !== 1) return null;
  const index = indexes[0], line = lines[index], value = line.slice(prefix.length, suffix ? -suffix.length : undefined);
  if (!validate(value)) return null;
  lines[index] = prefix + marker + suffix;
  return lines.join('\n');
}
function markdownProjection(artifact, parsed, root, raw) {
  const views = canonicalViews(parsed), report = views.some(view => relativeReference(root, view.outputReportPath) === artifact.path);
  const product = views.find(view => typeof view.chassisPrefix === 'string' && /^[A-Za-z0-9_-]+$/.test(view.chassisPrefix)
    && relativeReference(root, view.chassisDir) + `/notebook_sync_payload_${view.chassisPrefix}.md` === artifact.path);
  let text = raw.bytes.toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(raw.bytes)) return null;
  if (report && /^outputs\/[^/]+\/[^/]+\/[^/]+\/reports\/BOQ_Evaluation_[^/]+\.md$/.test(artifact.path)) {
    text = replaceLine(text, '**Evaluation Date**: ', '  ', validIso);
    if (text === null) return null;
    const timing = views.find(view => formattedDuration(view.notebookLmStatus?.timeTaken, view.notebookLmStatus?.latencyMs))?.notebookLmStatus;
    if (timing) {
      const projected = replaceLine(text, '> ⏱️ **Synthesis Time Taken**: `', '`', value => value === timing.timeTaken);
      if (projected === null) return null;
      text = projected;
    }
    text = replaceRoot(text, root);
  } else if (product) text = replaceLine(text, '**Sync Timestamp**: ', '', validIso);
  else if (artifact.path === 'outputs/history/master_universal_knowledge_charter.md') text = replaceLine(text, '**Document Version**: `2.0.0` | **Generated**: `', '`', validIso);
  else return null;
  return text === null ? null : { path: artifact.path, state: 'VERIFIED_GENERATED_MARKDOWN', content: text };
}
function projectDecisionHistory(content, parsed) {
  const ids = currentDecisions(parsed), current = content?.[0];
  if (!Array.isArray(content) || !/^SESSION-\d{13}$/.test(current?.sessionId) || !validIso(current.savedAt) || !Array.isArray(current.decisions)
    || !current.decisions.length || current.decisions.some(d => !ids.includes(d?.decisionId))) return content;
  if (content.filter(row => row?.sessionId === current.sessionId || (Array.isArray(row?.decisions) && row.decisions.some(d => ids.includes(d?.decisionId)))).length !== 1)
    throw new Error('BOQ_CURRENT_DECISION_HISTORY_AMBIGUOUS');
  const result = clone(content);
  result[0].sessionId = '<GENERATED_CURRENT_DECISION_SESSION>';
  result[0].savedAt = marker;
  result[0].decisions.forEach(d => { d.decisionId = `<GENERATED_DECISION_ID:${ids.indexOf(d.decisionId)}>`; if (validIso(d.timestamp)) d.timestamp = marker; });
  return result;
}
function projectTelemetry(content, parsed) {
  const current = content?.history?.[0];
  if (!returnedTraceIds(parsed).includes(current?.id) || current.traceId !== current.id) return content;
  if (content.history.filter(row => row?.id === current.id || row?.traceId === current.id).length !== 1)
    throw new Error('BOQ_CURRENT_TELEMETRY_HISTORY_AMBIGUOUS');
  const result = clone(content), entry = result.history[0];
  if (validIso(result.lastUpdated)) result.lastUpdated = marker;
  if (validIso(entry.timestamp)) entry.timestamp = marker;
  if (nonnegative(entry.durationMs)) entry.durationMs = marker;
  for (const key of stages) if (nonnegative(entry.stageBreakdown?.[key])) entry.stageBreakdown[key] = marker;
  for (const key of ['rssMb', 'heapUsedMb', 'heapTotalMb']) if (nonnegative(entry.memoryUsage?.[key])) entry.memoryUsage[key] = marker;
  return result;
}
function verifiedSummary(artifact, ledger, root, options, projectedLedger, raw) {
  try {
    const renderer = path.resolve(options.rendererRoot || root, 'scripts/lib/system/evidence_ledger.js');
    if (fs.realpathSync(renderer) !== renderer) return null;
    const { EvidenceLedger } = require(renderer), instance = Object.create(EvidenceLedger.prototype);
    Object.assign(instance, ledger.content);
    if (!Buffer.from(EvidenceLedger.prototype._renderMarkdownSummary.call(instance), 'utf8').equals(raw.bytes)) return null;
    return { path: artifact.path, state: 'VERIFIED_CANONICAL_BOQ_LEDGER_SUMMARY', pairedLedgerPath: ledger.path, rendererSha256: digest(fs.readFileSync(renderer)), content: projectedLedger };
  } catch { return null; }
}
const rfpPhaseNames = ['Presales Sizing Intake & Parsing', 'Dynamic Catalog Resolution', '7-Aspect Physical Evaluation of Sized Candidate BOM',
  'Workload DNA & Construction Plan Analysis', 'Strategy Synthesis & Multi-Node Cluster Sizing', 'Confidence Floor & Presales Clarification Scoring',
  'QuickSpecs & Dynamic Catalog Verification', 'Presales Candidate BOM Generation', 'Presales Evidence Trace Finalization'];
function isCurrentRfpLedger(artifact, parsed, root, ids) {
  return Boolean(rfpEvaluation(parsed) && relativeReference(root, parsed.response.result.evidenceLogPath) === artifact.path
    && isBoundLedger(artifact, ids) && Object.keys(artifact.content.phases).length === 9
    && rfpPhaseNames.every((name, i) => artifact.content.phases[`phase_${i + 1}`]?.phaseName === name));
}
function currentLedger(artifact, views, parsed, root, ids) {
  if (isCurrentRfpLedger(artifact, parsed, root, ids)) return true;
  return /^outputs\/[^/]+\/[^/]+\/[^/]+\/reports\/evidence\/evidence_log_[^/]+\.json$/.test(artifact.path)
    && views.some(view => relativeReference(root, view.evidenceLogPath) === artifact.path)
    && isBoundLedger({ ...artifact, path: `outputs/history/evidence_logs/evidence_log_${artifact.content?.traceId}.json` }, ids);
}
function ownedSummary(artifact, ledger, views, parsed, root, ids) {
  return artifact.path === ledger.path.replace('evidence_log_', 'evidence_summary_').replace(/\.json$/, '.md')
    && (isCurrentRfpLedger(ledger, parsed, root, ids) || views.some(view => relativeReference(root, view.evidenceSummaryPath) === artifact.path));
}
function projectBoqArtifacts(artifacts, parsed, root, options = {}) {
  const views = canonicalViews(parsed), ids = returnedTraceIds(parsed), proof = [], byPath = new Map(), bound = [];
  const isCurrentLedger = artifact => currentLedger(artifact, views, parsed, root, ids);
  for (const artifact of artifacts) {
    const raw = verifiedBytes(artifact, root, options);
    if (isCurrentLedger(artifact) && !raw) throw new Error(`BOQ_ARTIFACT_INTEGRITY_MISMATCH: ${artifact.path}`);
    if (!raw) { byPath.set(artifact.path, artifact); continue; }
    const md = artifact.state === 'EXACT_BYTES' ? markdownProjection(artifact, parsed, root, raw) : null;
    if (md) { byPath.set(artifact.path, md); proof.push({ path: artifact.path, rawSha256: raw.record.sha256, rawBytes: raw.record.bytes, projectedState: md.state }); continue; }
    if (artifact.state !== 'PARSED_JSON') { byPath.set(artifact.path, artifact); continue; }
    let content = artifact.content;
    if (artifact.path === 'outputs/history/decision_traces.json') content = projectDecisionHistory(content, parsed);
    else if (artifact.path === 'outputs/history/pipeline_telemetry.json') content = projectTelemetry(content, parsed);
    else if (artifact.path === 'outputs/history/master_knowledge_registry.json' && content?.registryVersion === '2.0.0') {
      content = clone(content);
      for (const key of ['generatedAt', 'lastUpdated']) if (validIso(content[key])) content[key] = marker;
    } else if (isCurrentLedger(artifact)) {
      content = projectLedger(content); bound.push({ artifact, projected: content });
    }
    byPath.set(artifact.path, { ...artifact, content });
  }
  for (const { artifact: ledger, projected } of bound) {
    for (let i = 0; i < ledger.content.artifacts.length; i++) {
      const entry = ledger.content.artifacts[i], relative = relativeReference(root, entry.filePath), target = byPath.get(relative);
      if (entry.role !== 'ANALYSIS_REPORT' || entry.exists !== true) continue;
      const original = artifacts.find(a => a.path === relative), raw = original && verifiedBytes(original, root, options);
      if (!views.some(view => relativeReference(root, view.outputReportPath) === relative) || !raw || entry.sha256 !== raw.record.sha256 || entry.sizeBytes !== raw.record.bytes)
        throw new Error(`BOQ_ANALYSIS_REPORT_INTEGRITY_MISMATCH: ${ledger.path}`);
      if (target?.state !== 'VERIFIED_GENERATED_MARKDOWN') continue;
      const bytes = Buffer.from(target.content, 'utf8');
      projected.artifacts[i].sha256 = `<VERIFIED_SEMANTIC_SHA256:${digest(bytes)}>`;
      projected.artifacts[i].sizeBytes = bytes.length;
      proof.push({ path: ledger.path, role: entry.role, target: relative, rawSha256: raw.record.sha256, rawBytes: raw.record.bytes, semanticSha256: digest(bytes), semanticBytes: bytes.length });
    }
    const summary = artifacts.find(a => ownedSummary(a, ledger, views, parsed, root, ids));
    if (!summary) continue;
    const raw = verifiedBytes(summary, root, options), projectedSummary = raw && verifiedSummary(summary, ledger, root, options, projected, raw);
    if (projectedSummary) { byPath.set(summary.path, projectedSummary); proof.push({ path: summary.path, rawSha256: raw.record.sha256, rawBytes: raw.record.bytes, projectedState: projectedSummary.state }); }
  }
  return { artifacts: artifacts.map(artifact => byPath.get(artifact.path)), proof };
}
module.exports = { boqArtifactPolicy, projectLedger, relativeReference, verifiedBytes, markdownProjection, projectDecisionHistory, projectTelemetry, projectBoqArtifacts };
