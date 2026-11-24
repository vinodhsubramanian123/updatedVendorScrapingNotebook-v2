'use strict';
/**
 * scripts/lib/feedback/instruction_promoter.js — Regression-Gated Continuous Learning Promoter (INV-279)
 *
 * Promotes queued reflection proposals with >= 3 authoritative observations (INV-225) or verified
 * portal/HITL receipts into master_knowledge_registry.json, Catalog_Rules.json, and ACTIVE_LEARNINGS_DIGEST.md.
 * Rolls back all mutations atomically if the supplied validation gate fails or regresses.
 */

const fs = require('fs');
const path = require('path');
const { safeWriteJsonAtomic, withFileLock } = require('../system/fs_compat.js');
const {
  DEFAULT_IMPROVEMENT_QUEUE_PATH,
  DEFAULT_ACTIVE_DIGEST_PATH,
  refreshActiveLearningsDigest
} = require('./post_run_reflection.js');
const { MASTER_REGISTRY_PATH } = require('../catalog/active_knowledge_router.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

function _isEligibleForPromotion(entry) {
  if (!entry || typeof entry !== 'object') return false;
  if (entry.status !== 'PENDING' && entry.status !== 'READY_FOR_PROMOTION') return false;
  if (entry.tier0Contaminated === true) return false;
  const obs = Number(entry.authoritativeObservationCount || 0);
  return obs >= 3 || entry.verifiedPortalOrHumanReceipt === true;
}

function _loadJsonOrDefault(filePath, fallback) {
  if (fs.existsSync(filePath)) {
    try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { /* fallback */ }
  }
  return structuredClone(fallback);
}

function _captureSnapshots(filePaths) {
  const snapshots = new Map();
  for (const p of filePaths) {
    const resolved = path.resolve(p);
    if (snapshots.has(resolved)) continue;
    snapshots.set(resolved, fs.existsSync(resolved) ? fs.readFileSync(resolved) : null);
  }
  return snapshots;
}

function _restoreSnapshots(snapshots) {
  for (const [filePath, buf] of snapshots.entries()) {
    if (buf === null) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } else {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, buf);
    }
  }
}

function _findChassisRulesPath(chassisName, catalogRulesMap = {}) {
  if (catalogRulesMap[chassisName]) return path.resolve(catalogRulesMap[chassisName]);
  const outputsDir = path.join(PROJECT_ROOT, 'outputs');
  if (!fs.existsSync(outputsDir)) return null;
  const targetClean = String(chassisName || '').toLowerCase();
  if (!targetClean || targetClean === 'unspecified_platform') return null;
  const stack = [outputsDir];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'history' && entry.name !== 'evidence' && entry.name !== 'reports') stack.push(full);
      } else if (entry.name.toLowerCase() === `${targetClean}_catalog_rules.json`) {
        return full;
      }
    }
  }
  return null;
}

function _appendRuleToRegistry(registry, entry, now) {
  if (!Array.isArray(registry.deltas)) registry.deltas = [];
  if (!Array.isArray(registry.chassisSpecificRules)) registry.chassisSpecificRules = [];
  const deltaRecord = {
    deltaId: entry.proposalId,
    ruleId: entry.proposalId,
    chassis: entry.chassis,
    productId: entry.chassis,
    ruleType: entry.category || 'LEARNED_INSTRUCTION',
    errorType: entry.category || 'LEARNED_INSTRUCTION',
    scopeTaxonomy: entry.chassis && entry.chassis !== 'UNSPECIFIED_PLATFORM' ? 'CHASSIS_SPECIFIC' : 'UNIVERSAL_VENDOR',
    affectedSku: entry.affectedSku || null,
    requiredDependencySku: entry.targetSku || null,
    ruleUpdate: entry.ruleUpdate,
    governanceStatus: 'ACTIVE',
    authoritativeObservationCount: entry.authoritativeObservationCount,
    promotedAt: now
  };
  if (!registry.deltas.some(d => d.deltaId === deltaRecord.deltaId)) {
    registry.deltas.push(deltaRecord);
  }
  if (!registry.chassisSpecificRules.some(r => r.ruleId === deltaRecord.ruleId)) {
    registry.chassisSpecificRules.push(deltaRecord);
  }
  registry.lastUpdated = now;
}

function _appendRuleToChassisFile(rulesPath, entry, now) {
  const existing = _loadJsonOrDefault(rulesPath, []);
  const row = {
    ruleId: entry.proposalId,
    category: entry.category,
    affectedSku: entry.affectedSku || null,
    targetSku: entry.targetSku || null,
    ruleText: entry.ruleUpdate,
    source: 'POST_RUN_REFLECTION_PROMOTED',
    promotedAt: now
  };
  if (Array.isArray(existing)) {
    if (!existing.some(r => r.ruleId === row.ruleId)) existing.push(row);
    safeWriteJsonAtomic(rulesPath, existing);
  } else if (existing && typeof existing === 'object') {
    if (!Array.isArray(existing.learnedRules)) existing.learnedRules = [];
    if (!existing.learnedRules.some(r => r.ruleId === row.ruleId)) existing.learnedRules.push(row);
    safeWriteJsonAtomic(rulesPath, existing);
  }
}

async function promoteLearnedInstructions(options = {}) {
  const queuePath = path.resolve(options.queuePath || DEFAULT_IMPROVEMENT_QUEUE_PATH);
  const digestPath = path.resolve(options.digestPath || DEFAULT_ACTIVE_DIGEST_PATH);
  const masterRegistryPath = path.resolve(options.masterRegistryPath || MASTER_REGISTRY_PATH);
  const apply = Boolean(options.apply);

  const queue = _loadJsonOrDefault(queuePath, { version: '1.0.0', lastUpdated: new Date().toISOString(), entries: [] });
  const eligible = (queue.entries || []).filter(_isEligibleForPromotion);

  if (!apply) {
    return {
      mode: 'DRY_RUN',
      status: eligible.length > 0 ? 'ELIGIBLE_CANDIDATES_FOUND' : 'NOTHING_TO_PROMOTE',
      eligibleCount: eligible.length,
      promotedCount: 0,
      rolledBack: false,
      candidates: eligible.map(e => ({
        proposalId: e.proposalId,
        chassis: e.chassis,
        category: e.category,
        observationCount: e.authoritativeObservationCount,
        verifiedReceipt: e.verifiedPortalOrHumanReceipt,
        ruleUpdate: e.ruleUpdate
      }))
    };
  }

  if (eligible.length === 0) {
    return {
      mode: 'APPLIED',
      status: 'NOTHING_TO_PROMOTE',
      eligibleCount: 0,
      promotedCount: 0,
      rolledBack: false,
      promotedIds: []
    };
  }

  const chassisRulesTargets = new Map();
  if (options.updateCatalogRules !== false) {
    for (const e of eligible) {
      const targetPath = _findChassisRulesPath(e.chassis, options.catalogRulesMap);
      if (targetPath) chassisRulesTargets.set(e.chassis, targetPath);
    }
  }

  const trackedFiles = [queuePath, masterRegistryPath, digestPath, ...chassisRulesTargets.values()];
  const snapshots = _captureSnapshots(trackedFiles);
  const now = new Date().toISOString();

  return withFileLock(queuePath, async () => {
    try {
      const registry = _loadJsonOrDefault(masterRegistryPath, { registryVersion: '2.0.0', deltas: [], chassisSpecificRules: [] });
      for (const entry of eligible) {
        entry.status = 'PROMOTED';
        entry.promotedAt = now;
        _appendRuleToRegistry(registry, entry, now);
        const rulesPath = chassisRulesTargets.get(entry.chassis);
        if (rulesPath) _appendRuleToChassisFile(rulesPath, entry, now);
      }
      queue.lastUpdated = now;
      safeWriteJsonAtomic(queuePath, queue);
      safeWriteJsonAtomic(masterRegistryPath, registry);
      if (options.refreshDigest !== false) refreshActiveLearningsDigest(queue, digestPath);

      let gateResult = { skipped: true };
      if (typeof options.validatorFn === 'function') {
        gateResult = await options.validatorFn();
        if (gateResult === false || gateResult?.valid === false || gateResult?.ok === false || gateResult?.releaseGate?.passed === false) {
          throw new Error(gateResult?.error || gateResult?.reason || 'Promotion validation gate rejected candidate update');
        }
      }
      return {
        mode: 'APPLIED',
        status: 'PROMOTED',
        eligibleCount: eligible.length,
        promotedCount: eligible.length,
        rolledBack: false,
        promotedIds: eligible.map(e => e.proposalId),
        gateResult
      };
    } catch (err) {
      _restoreSnapshots(snapshots);
      return {
        mode: 'APPLIED',
        status: 'ROLLED_BACK',
        eligibleCount: eligible.length,
        promotedCount: 0,
        rolledBack: true,
        error: err.message
      };
    }
  });
}

module.exports = {
  promoteLearnedInstructions,
  _isEligibleForPromotion
};
