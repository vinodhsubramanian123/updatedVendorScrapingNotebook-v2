'use strict';
/**
 * scripts/lib/sync/drift_inspector.js — Knowledge Drift Inspector
 *
 * Inspects knowledge drift between local evaluator rules and target notebook.
 */

/**
 * Inspect knowledge drift between local evaluator rules and target notebook
 *
 * @param {string} chassisName
 * @param {object} registry
 * @param {object} cfg
 * @param {Function} generatePayloadFn
 * @returns {object} Drift metrics
 */
function inspectKnowledgeDrift(chassisName = 'Unknown_Chassis', registry = {}, cfg = {}, generatePayloadFn = null) {
  const entry = cfg.notebooks && cfg.notebooks[chassisName];
  const notebookId = (entry && typeof entry === 'object')
    ? entry.notebookId
    : (entry || cfg.defaultNotebookId || "17cb979a-14d2-430c-a99f-7c1514757e79");

  const lastSyncDeltaCount = (typeof entry === 'object' && entry !== null && typeof entry.lastSyncDeltaCount === 'number')
    ? entry.lastSyncDeltaCount
    : 0;

  const totalRules = registry.totalLearnedRules || 0;
  const unSyncedDeltasCount = Math.max(0, totalRules - lastSyncDeltaCount);

  const payload = generatePayloadFn ? generatePayloadFn(chassisName, false) : { payloadPath: null };

  let status = 'SYNCHRONIZED';
  if (unSyncedDeltasCount > 0) {
    status = 'DRIFT_DETECTED';
  } else if (totalRules === 0) {
    status = 'BASELINE_READY';
  }

  return {
    chassisName,
    notebookId,
    totalLearnedRules: totalRules,
    lastSyncedRulesCount: lastSyncDeltaCount,
    unSyncedDeltasCount,
    payloadPath: payload.payloadPath,
    status
  };
}

module.exports = {
  inspectKnowledgeDrift
};
