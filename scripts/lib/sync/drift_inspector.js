'use strict';
/**
 * scripts/lib/sync/drift_inspector.js — Knowledge Drift Inspector
 *
 * Inspects knowledge drift between local evaluator rules and target notebook.
 */

const fs = require('fs');
const crypto = require('crypto');
const { normalizeLearningText } = require('./google_sheets_writer.js');

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
  const entry = cfg && cfg.notebooks && cfg.notebooks[chassisName];
  const defaultId = (cfg && cfg.defaultNotebookId !== undefined) ? cfg.defaultNotebookId : null;
  const notebookId = (entry && typeof entry === 'object')
    ? entry.notebookId
    : (entry !== undefined && entry !== null ? entry : defaultId);

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

  let payloadChecksum = null;
  if (payload && payload.payloadPath && fs.existsSync(payload.payloadPath)) {
    try {
      const normalizedPayload = normalizeLearningText(fs.readFileSync(payload.payloadPath, 'utf8'));
      payloadChecksum = crypto.createHash('sha256').update(normalizedPayload).digest('hex');
    } catch (_) {}
  }

  const contentFingerprint = payload?.contentFingerprints?.combined || null;
  const previousContentFingerprint = entry?.lastContentFingerprints?.combined || null;

  let status = 'SYNCHRONIZED';
  if (!notebookId) {
    status = 'NO_NOTEBOOK_CONFIGURED';
  } else if (chassisRuleCount === 0) {
    status = 'BASELINE_READY';
  } else if (
    unSyncedDeltasCount > 0
    || (entry && entry.lastPayloadChecksum && payloadChecksum && entry.lastPayloadChecksum !== payloadChecksum)
    || (previousContentFingerprint && contentFingerprint && previousContentFingerprint !== contentFingerprint)
  ) {
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
    payloadChecksum,
    contentFingerprint,
    previousContentFingerprint,
    status
  };
}

module.exports = {
  inspectKnowledgeDrift
};
