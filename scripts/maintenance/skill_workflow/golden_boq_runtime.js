'use strict';
const { isDeepStrictEqual } = require('util');
const { validIso } = require('./golden_ledger_artifacts.js');
const { nestedRoot, nestedGraphs, scopedRoots, scopedPaths } = require('./golden_rfp_scope.js');
const stages = Object.freeze(['stage1ParsingMs', 'stage2AspectMathMs', 'stage3RAGConsultationMs', 'stage4GeminiVerificationMs', 'stage5ResolutionMatrixMs']);
const roots = ['response.result', 'envelopes.*.data', 'envelopes.*.data.evalResults'];
const graphPaths = ['conflictGraph.auditLog.*.timestamp', 'conflictGraph.rankedSolutions.*.finalValidation.checkedAt',
  'conflictGraph.rankedSolutions.*.finalValidation.graph.auditLog.*.timestamp',
  'conflictGraph.recommendedSolutions.*.finalValidation.checkedAt',
  'conflictGraph.recommendedSolutions.*.finalValidation.graph.auditLog.*.timestamp'];
const boqRuntimePaths = Object.freeze([...roots, nestedRoot].flatMap(root => [
  ...graphPaths.map(field => `${root}.${field}`), ...stages.map(field => `${root}.stageBreakdown.${field}`),
  `${root}.notebookLmStatus.latencyMs`
]).concat(['response.result', 'envelopes.*.data.evalResults'].flatMap(root => [
  `${root}.adversarialGateResult.candidateResults.*.validation.checkedAt`, `${root}.adversarialGateResult.candidateResults.*.validation.graph.auditLog.*.timestamp`
]), ['timestamp', 'completedAt', 'totalDurationMs', 'stages.*.durationMs', 'grounding.latencyMs'].map(field => `envelopes.*.data.evalResults.provenanceTrace.${field}`),
['envelopes.*.data.durationMs', 'envelopes.*.data.provenanceTrace.grounding.latencyMs', 'envelopes.*.data.workflowSteps.*.durationMs', 'envelopes.*.data.evalResults.acceptanceGate.timestamp']));
const marker = '<GENERATED_BOQ_RUNTIME_FIELD>';
const nonnegative = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const patternParts = new Map();
function matches(pattern, segments) {
  if (!patternParts.has(pattern)) patternParts.set(pattern, pattern.split('.'));
  const parts = patternParts.get(pattern);
  return parts.length === segments.length && parts.every((part, index) => part === '*' || part === segments[index]);
}
function formattedDuration(value, latency) {
  return nonnegative(latency) && Number.isInteger(latency) && value === `${Math.floor(latency / 60000)}m ${Math.floor((latency % 60000) / 1000)}s (${latency}ms)`;
}
function currentDecisions(parsed) {
  const graphs = [parsed?.response?.result?.conflictGraph, ...nestedGraphs(parsed), ...(Array.isArray(parsed?.envelopes) ? parsed.envelopes : []).map(e => e?.data?.conflictGraph)];
  const entries = graphs.flatMap(graph => (Array.isArray(graph?.rankedSolutions) ? graph.rankedSolutions : [])
    .flatMap(rank => Array.isArray(rank?.decisionTrace) ? rank.decisionTrace : []));
  const ids = [];
  for (const entry of entries) if (/^DEC-\d{13}-[a-z0-9]{1,4}$/.test(entry?.decisionId) && validIso(entry.timestamp) && !ids.includes(entry.decisionId)) ids.push(entry.decisionId);
  return ids;
}
function boundRecommendation(parsed, segments) {
  const index = segments.indexOf('recommendedSolutions');
  if (index < 0) return true;
  const graph = segments.slice(0, index).reduce((value, key) => value?.[key], parsed);
  const candidate = graph?.recommendedSolutions?.[segments[index + 1]];
  const originals = (graph?.rankedSolutions || []).filter(rank => rank.rank === candidate?.strategyRank);
  return originals.length === 1 && isDeepStrictEqual(candidate.finalValidation, originals[0].finalValidation);
}
function matchesBoundRuntime(pattern, segments, parsed) {
  return matches(pattern, segments) && boundRecommendation(parsed, segments);
}
function projectBoqResponse(value) {
  const ids = currentDecisions(value);
  const activePaths = scopedPaths(value, boqRuntimePaths), activeRoots = scopedRoots(value, roots);
  const activeDecisions = activeRoots.map(root => `${root}.conflictGraph.rankedSolutions.*.decisionTrace.*`);
  function project(item, segments = [], parent = null) {
    if (segments.length === 1 && !['response', 'envelopes'].includes(segments[0])) return item;
    if (activePaths.some(pattern => matchesBoundRuntime(pattern, segments, value))) {
      const date = ['timestamp', 'completedAt', 'checkedAt'].includes(segments.at(-1));
      return (date ? validIso(item) : nonnegative(item)) ? marker : item;
    }
    if (activeRoots.some(root => matches(`${root}.notebookLmStatus.timeTaken`, segments)) && formattedDuration(item, parent?.latencyMs)) return marker;
    if (activeDecisions.some(pattern => matches(`${pattern}.decisionId`, segments)) && ids.includes(item)) return `<GENERATED_DECISION_ID:${ids.indexOf(item)}>`;
    if (activeDecisions.some(pattern => matches(`${pattern}.timestamp`, segments)) && ids.includes(parent?.decisionId) && validIso(item)) return marker;
    if (Array.isArray(item)) return item.map((part, index) => project(part, [...segments, String(index)], item));
    if (item && typeof item === 'object') return Object.fromEntries(Object.entries(item).map(([key, part]) => [key, project(part, [...segments, key], item)]));
    return item;
  }
  return project(value);
}
module.exports = { stages, boqRuntimePaths, marker, nonnegative, matches, formattedDuration, currentDecisions, projectBoqResponse };
