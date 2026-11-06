'use strict';
/**
 * scripts/lib/sync/drift_inspector.js — Knowledge Drift Inspector
 *
 * Inspects knowledge drift between local evaluator rules and target notebook.
 */

const fs = require('fs');
const crypto = require('crypto');
const { normalizeLearningText } = require('./google_sheets_writer.js');

function _resolveNotebookEntry(cfg = {}, chassisName) {
  const entry = cfg.notebooks ? cfg.notebooks[chassisName] : null;
  const defaultId = cfg.defaultNotebookId !== undefined ? cfg.defaultNotebookId : null;
  const notebookId = (entry && typeof entry === 'object')
    ? entry.notebookId
    : (entry !== undefined && entry !== null ? entry : defaultId);

  const isObj = typeof entry === 'object' && entry !== null;
  const lastSyncDeltaCount = (isObj && typeof entry.lastSyncDeltaCount === 'number')
    ? entry.lastSyncDeltaCount
    : 0;
  const lastSyncedAt = isObj ? (entry.lastSyncedAt || null) : null;

  return { entry, notebookId, lastSyncDeltaCount, lastSyncedAt };
}

function _countChassisRules(registry = {}, chassisName) {
  const chassisRules = [
    ...(registry.chassisSpecificRules || []),
    ...(registry.familyGenRules || []),
    ...(registry.universalRules || [])
  ].filter(r => !r.chassis || r.chassis === chassisName || r.scopeTaxonomy === 'UNIVERSAL_VENDOR' || r.scopeTaxonomy === 'FAMILY_GEN');
  return chassisRules.length;
}

function _computePayloadChecksum(payload) {
  if (typeof payload?.markdownText === 'string') {
    return crypto.createHash('sha256').update(normalizeLearningText(payload.markdownText)).digest('hex');
  }
  if (payload && payload.payloadPath && fs.existsSync(payload.payloadPath)) {
    try {
      const normalizedPayload = normalizeLearningText(fs.readFileSync(payload.payloadPath, 'utf8'));
      return crypto.createHash('sha256').update(normalizedPayload).digest('hex');
    } catch (_) {}
  }
  return null;
}

function _determineDriftStatus(notebookId, chassisRuleCount, unSyncedDeltasCount, entry, payloadChecksum, previousFingerprint, currentFingerprint) {
  if (!notebookId) return 'NO_NOTEBOOK_CONFIGURED';
  if (chassisRuleCount === 0) return 'BASELINE_READY';

  const checksumMismatch = Boolean(entry && entry.lastPayloadChecksum && payloadChecksum && entry.lastPayloadChecksum !== payloadChecksum);
  const fingerprintMismatch = Boolean(previousFingerprint && currentFingerprint && previousFingerprint !== currentFingerprint);

  if (unSyncedDeltasCount > 0 || checksumMismatch || fingerprintMismatch) {
    return 'DRIFT_DETECTED';
  }
  return 'SYNCHRONIZED';
}

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
  const { entry, notebookId, lastSyncDeltaCount, lastSyncedAt } = _resolveNotebookEntry(cfg, chassisName);
  const chassisRuleCount = _countChassisRules(registry, chassisName);
  const unSyncedDeltasCount = Math.max(0, chassisRuleCount - lastSyncDeltaCount);

  const payload = generatePayloadFn ? generatePayloadFn(chassisName, false) : { payloadPath: null };
  const payloadChecksum = _computePayloadChecksum(payload);

  const contentFingerprint = payload?.contentFingerprints?.combined || null;
  const previousContentFingerprint = entry?.lastContentFingerprints?.combined || null;

  const status = _determineDriftStatus(
    notebookId, chassisRuleCount, unSyncedDeltasCount, entry, payloadChecksum, previousContentFingerprint, contentFingerprint
  );

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
