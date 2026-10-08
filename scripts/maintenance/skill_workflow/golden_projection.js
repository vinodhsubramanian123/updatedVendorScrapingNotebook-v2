'use strict';
const { ledgerArtifactPolicy } = require('./golden_ledger_artifacts.js');
const { projectBoqResponse, boqRuntimePaths } = require('./golden_boq_runtime.js');
const { boqArtifactPolicy } = require('./golden_boq_artifacts.js');
const { currentExecutionPolicy } = require('./golden_current_execution.js');
// Explicit CP0 comparison policy. Domain status, identity, prices and source
// dates remain intact; only named generated runtime fields are normalized.
const runtimePaths = [
  'response.traceId', 'response.timestamp', 'response.executionTimeMs', 'response.result.traceId',
  'response.result.lifecycleEngine.startTime',
  'response.result.auditReport.verificationTimestamp',
  'envelopes.*.data.traceId', 'envelopes.*.data.provenanceTrace.traceId',
  'envelopes.*.data.provenanceTrace.timestamp', 'envelopes.*.data.provenanceTrace.completedAt',
  'envelopes.*.data.provenanceTrace.totalDurationMs', 'envelopes.*.data.provenanceTrace.stages.*.durationMs',
  'envelopes.*.data.tracePayloads.*.timestamp',
  ...['parsingTimeMs', 'aspectMathTimeMs', 'ragTimeMs', 'guardrailTimeMs', 'matrixTimeMs', 'totalEvalTimeMs'].map(key => `envelopes.*.data.telemetry.${key}`)
];
const policy = Object.freeze({ version: 5, runtimePaths: Object.freeze(runtimePaths), boqRuntimePaths, ledgerArtifactProjection: ledgerArtifactPolicy, boqArtifactProjection: boqArtifactPolicy,
  currentExecutionProjection: currentExecutionPolicy, copiedRoot: 'EXACT_COPIED_ROOT_ONLY',
  generatedIds: 'EXACT_RETURNED_TRACE_IDS_ONLY', ordering: 'PRESERVED',
  generatedDecisionIds: 'EXACT_CURRENT_RETURNED_GRAPH_ID_WITH_TYPED_TIMESTAMP_ONLY', historicalRows: 'ALL_FIELDS_UNTOUCHED_IN_EXACT_DECISION_AND_TELEMETRY_HISTORY_PATHS',
  facts: 'STATUSES_QUANTITIES_PRICES_OWNERS_SKUS_CITATIONS_SOURCE_DATES_AND_MANIFEST_HASHES_PRESERVED' });

function matches(pattern, segments) {
  const parts = pattern.split('.');
  return parts.length === segments.length && parts.every((part, i) => part === '*' || part === segments[i]);
}
function isGeneratedRuntimeValue(item, segments, ids) {
  const field = segments.at(-1);
  if (field === 'traceId') return ids.includes(item);
  if (field === 'timestamp' || field === 'completedAt' || field === 'verificationTimestamp') {
    return typeof item === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(item)
      && Number.isFinite(Date.parse(item)) && new Date(item).toISOString().replace('.000Z', 'Z') === item.replace('.000Z', 'Z');
  }
  return typeof item === 'number' && Number.isFinite(item) && item >= 0;
}
function replaceRuntimeReferences(text, root, ids) {
  let value = text;
  for (const id of [...ids].sort((a, b) => b.length - a.length)) if (id) value = value.split(id).join('<GENERATED_TRACE_ID>');
  if (root) {
    const variants = [...new Set([root, root.split(String.fromCharCode(92)).join('/'), root.split('/').join(String.fromCharCode(92))])];
    for (const variant of variants) value = value.split(variant).join('<ISOLATED_ROOT>');
  }
  return value;
}
function semanticProjection(value, options = {}) {
  const ids = [...new Set([value?.response?.traceId, value?.response?.result?.traceId,
    ...(value?.envelopes || []).map(e => e?.data?.traceId)].filter(id => typeof id === 'string' && /^(?:TRC|TRACE)-/.test(id)))];
  function project(item, segments = []) {
    const artifact = segments[0] === 'artifacts' && segments[2] === 'content' ? value?.artifacts?.[segments[1]] : null;
    if (artifact?.path === 'outputs/history/decision_traces.json' && segments.length === 4 && /^[1-9]\d*$/.test(segments[3])) return item;
    if (artifact?.path === 'outputs/history/pipeline_telemetry.json' && segments.length === 5 && ['history', 'reconciliationHistory'].includes(segments[3]) && /^[1-9]\d*$/.test(segments[4])) return item;
    if (runtimePaths.some(pattern => matches(pattern, segments))) {
      return isGeneratedRuntimeValue(item, segments, ids) ? '<GENERATED_RUNTIME_FIELD>' : item;
    }
    if (typeof item === 'string') return replaceRuntimeReferences(item, options.root, ids);
    if (Array.isArray(item)) return item.map((part, i) => project(part, [...segments, String(i)]));
    if (item && typeof item === 'object') return Object.fromEntries(Object.keys(item).sort().map(key => [key, project(item[key], [...segments, key])]));
    return item;
  }
  return project(projectBoqResponse(value));
}
function compareGolden(before, after) {
  const differences = [];
  function compare(left, right, location) {
    if (Object.is(left, right)) return;
    if (Array.isArray(left) && Array.isArray(right)) {
      if (left.length !== right.length) differences.push({ path: location, code: 'ARRAY_LENGTH', before: left.length, after: right.length });
      for (let i = 0; i < Math.max(left.length, right.length); i++) compare(left[i], right[i], `${location}[${i}]`);
      return;
    }
    if (left && right && typeof left === 'object' && typeof right === 'object' && !Array.isArray(left) && !Array.isArray(right)) {
      for (const key of [...new Set([...Object.keys(left), ...Object.keys(right)])].sort()) {
        if (!Object.hasOwn(left, key) || !Object.hasOwn(right, key)) differences.push({ path: `${location}.${key}`, code: 'FIELD_PRESENCE', beforePresent: Object.hasOwn(left, key), afterPresent: Object.hasOwn(right, key) });
        else compare(left[key], right[key], `${location}.${key}`);
      }
      return;
    }
    differences.push({ path: location, code: 'VALUE_CHANGED', before: left, after: right });
  }
  compare(before, after, '$');
  return { equal: differences.length === 0, differences };
}
module.exports = { policy, semanticProjection, compareGolden };
