'use strict';
// Only the source-proved router RFP draft owns this nested evaluation location.
const nestedRoot = 'response.result.evaluation';
const plain = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
function rfpEvaluation(parsed) {
  const result = parsed?.response?.result;
  if (parsed?.response?.classification?.intent !== 'RFP_SIZING_TO_BOM' || result?.intent !== 'RFP_SIZING_TO_BOM'
    || !['SIZING_DRAFT', 'REQUIRES_HUMAN_CLARIFICATION'].includes(result.status)
    || typeof result.requiresHumanClarification !== 'boolean' || result.requiresHumanClarification !== (result.status === 'REQUIRES_HUMAN_CLARIFICATION')
    || !Array.isArray(result.candidateBOM) || !plain(result.evaluation) || !plain(result.evaluation.conflictGraph)
    || !Array.isArray(result.evaluation.conflictGraph.auditLog) || !Array.isArray(result.evaluation.conflictGraph.rankedSolutions)) return null;
  return result.evaluation;
}
function nestedGraphs(parsed) {
  const evaluation = rfpEvaluation(parsed);
  return evaluation ? [evaluation.conflictGraph] : [];
}
function scopedRoots(parsed, roots) { return rfpEvaluation(parsed) ? [...roots, nestedRoot] : roots; }
function scopedPaths(parsed, paths) { return rfpEvaluation(parsed) ? paths : paths.filter(item => !item.startsWith(nestedRoot + '.')); }
module.exports = { nestedRoot, rfpEvaluation, nestedGraphs, scopedRoots, scopedPaths };
