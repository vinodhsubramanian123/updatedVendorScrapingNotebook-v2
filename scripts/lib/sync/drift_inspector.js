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

  const lastSyncedAt = (typeof entry === 'object' && entry !== null) ? (entry.lastSyncedAt || null) : null;

  // Use chassis-specific rule count, not global total.
  // A chassis that has no catalog_deltas.json of its own should not inherit
  // another chassis's unsynced count — it's simply at baseline.
  const chassisRules = [
    ...(registry.chassisSpecificRules || []),
    ...(registry.familyGenRules || []),
    ...(registry.universalRules || [])
  ].filter(r => !r.chassis || r.chassis === chassisName || r.scopeTaxonomy === 'UNIVERSAL_VENDOR' || r.scopeTaxonomy === 'FAMILY_GEN');

  const chassisRuleCount = chassisRules.length;
  const unSyncedDeltasCount = Math.max(0, chassisRuleCount - lastSyncDeltaCount);

  const payload = generatePayloadFn ? generatePayloadFn(chassisName, false) : { payloadPath: null };

  let status = 'SYNCHRONIZED';
  if (!notebookId) {
    status = 'NO_NOTEBOOK_CONFIGURED';
  } else if (chassisRuleCount === 0) {
    status = 'BASELINE_READY';
  } else if (unSyncedDeltasCount > 0) {
    status = 'DRIFT_DETECTED';
  }

  return {
    chassisName,
    notebookId,
    chassisRuleCount,
    totalLearnedRules: registry.totalLearnedRules || 0,
    lastSyncedRulesCount: lastSyncDeltaCount,
    lastSyncedAt,
    unSyncedDeltasCount,
    payloadPath: payload.payloadPath,
    status
  };
}

module.exports = {
  inspectKnowledgeDrift
};
