'use strict';
/**
 * scripts/lib/catalog/active_knowledge_router.js — Active Knowledge & Reachability Engine
 *
 * Discovers, categorizes, and dynamically routes learned knowledge deltas and master registry
 * rules directly into the Conflict Graph, Combinator, and Strategy Synthesizer.
 * Solves the "write-only learning" gap by guaranteeing all stored lessons are actively
 * reachable during evaluation.
 */

const fs = require('fs');
const path = require('path');
const { cleanBaseSKU, isValidHpeSKU } = require('./sku.js');
const { SKU_BLACKLIST, buildKnowledgeFingerprint } = require('../feedback/quarantined_deltas.js');
const logger = require('../system/pipeline_logger.js');
const { resolveProductIdentity, ruleAppliesToProduct } = require('./product_scope');
const notebookConfig = require('../../config/notebooks.json');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const MASTER_REGISTRY_PATH = path.join(PROJECT_ROOT, 'outputs', 'history', 'master_knowledge_registry.json');
const GLOBAL_DELTAS_PATH = path.join(PROJECT_ROOT, 'outputs', 'history', 'catalog_deltas.json');

/**
 * Load raw delta entries from standard registry locations
 */
function _loadRawDeltasFromDisk(chassisDir) {
  const pathsToSearch = [MASTER_REGISTRY_PATH, GLOBAL_DELTAS_PATH];
  if (chassisDir && typeof chassisDir === 'string' && fs.existsSync(chassisDir)) {
    pathsToSearch.push(path.join(chassisDir, 'history', 'catalog_deltas.json'));
  }

  const rawDeltas = [];
  const seenKeys = new Set();

  for (const p of pathsToSearch) {
    if (!fs.existsSync(p)) continue;
    try {
      const content = JSON.parse(fs.readFileSync(p, 'utf-8'));
      let list = [];
      if (Array.isArray(content)) {
        list = content;
      } else if (Array.isArray(content.deltas)) {
        list = content.deltas;
      } else if (content.universalRules || content.familyGenRules || content.chassisSpecificRules) {
        list = [
          ...(Array.isArray(content.universalRules) ? content.universalRules : []),
          ...(Array.isArray(content.familyGenRules) ? content.familyGenRules : []),
          ...(Array.isArray(content.chassisSpecificRules) ? content.chassisSpecificRules : [])
        ];
      }

      for (const d of list) {
        const key = d.deltaId || `${d.chassis}:${d.affectedSku}:${d.requiredDependencySku || ''}:${d.ruleType || ''}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          rawDeltas.push(d);
        }
      }
    } catch (e) {
      logger.warn('ACTIVE_KNOWLEDGE_ROUTER', `Failed to read delta file: ${p}`, e);
    }
  }

  return rawDeltas;
}

const REVOKED_DECISION_TYPES = new Set(['REJECTED', 'REVOKED', 'AUTO_REJECTED', 'EXPIRED', 'SUPERSEDED']);

function _applyDecisionRecords(revokedSet, records) {
  if (!Array.isArray(records)) return;
  for (const rec of records) {
    const dec = String(rec.decision || '').toUpperCase();
    const isRevoked = REVOKED_DECISION_TYPES.has(dec);
    const isPromoted = dec === 'PROMOTED';
    if (!isRevoked && !isPromoted) continue;

    const op = isRevoked ? 'add' : 'delete';
    if (rec.deltaId) revokedSet[op](rec.deltaId);
    if (rec.quarantineId) revokedSet[op](rec.quarantineId);
    if (rec.ruleId) revokedSet[op](rec.ruleId);
    if (rec.knowledgeFingerprint) revokedSet[op](rec.knowledgeFingerprint);
  }
}

function _applyQuarantineRecords(revokedSet, quarantined) {
  if (!Array.isArray(quarantined)) return;
  for (const item of quarantined) {
    if (item.deltaId) revokedSet.add(item.deltaId);
    if (item.quarantineId) revokedSet.add(item.quarantineId);
    if (item.ruleId) revokedSet.add(item.ruleId);
    if (item.knowledgeFingerprint) revokedSet.add(item.knowledgeFingerprint);
    try {
      const fp = buildKnowledgeFingerprint(item);
      if (fp) revokedSet.add(fp);
    } catch {}
  }
}

/**
 * Load revoked or rejected identifiers and fingerprints from decision ledgers & quarantine files
 */
function _loadRevokedIdentifiers(chassisDir) {
  const decisionPaths = [
    path.join(PROJECT_ROOT, 'outputs', 'history', 'knowledge_decisions.json')
  ];
  const quarantinePaths = [
    path.join(PROJECT_ROOT, 'outputs', 'history', 'quarantined_deltas.json')
  ];

  if (chassisDir && typeof chassisDir === 'string' && fs.existsSync(chassisDir)) {
    decisionPaths.push(path.join(chassisDir, 'history', 'knowledge_decisions.json'));
    quarantinePaths.push(path.join(chassisDir, 'history', 'quarantined_deltas.json'));
  }

  const revokedSet = new Set();

  for (const dp of decisionPaths) {
    if (!fs.existsSync(dp)) continue;
    try {
      _applyDecisionRecords(revokedSet, JSON.parse(fs.readFileSync(dp, 'utf-8')));
    } catch (e) {
      logger.warn('ACTIVE_KNOWLEDGE_ROUTER', `Failed to read decisions file: ${dp}`, e);
    }
  }

  for (const qp of quarantinePaths) {
    if (!fs.existsSync(qp)) continue;
    try {
      _applyQuarantineRecords(revokedSet, JSON.parse(fs.readFileSync(qp, 'utf-8')));
    } catch (e) {
      logger.warn('ACTIVE_KNOWLEDGE_ROUTER', `Failed to read quarantine file: ${qp}`, e);
    }
  }

  return revokedSet;
}

const INACTIVE_GOVERNANCE_STATUSES = new Set(['PENDING', 'QUARANTINED', 'REJECTED', 'DRAFT', 'REVOKED', 'EXPIRED', 'DEPRECATED']);

function _isDeltaRevokedOrInactive(delta, revokedSet) {
  const deltaId = delta.deltaId || delta.ruleId;
  let deltaFp = delta.knowledgeFingerprint;
  if (!deltaFp) {
    try { deltaFp = buildKnowledgeFingerprint(delta); } catch {}
  }
  if (
    (deltaId && revokedSet.has(deltaId)) ||
    (deltaFp && revokedSet.has(deltaFp)) ||
    (delta.quarantineId && revokedSet.has(delta.quarantineId)) ||
    delta.revoked === true ||
    delta.isRevoked === true
  ) {
    return true;
  }
  const status = String(delta.governanceStatus || delta.status || 'ACTIVE').toUpperCase();
  return INACTIVE_GOVERNANCE_STATUSES.has(status);
}

function _inferFamilyName(chassis) {
  if (chassis.includes('sy')) return 'synergy';
  if (chassis.includes('msl')) return 'storeever';
  if (chassis.includes('alletra')) return 'alletra';
  if (chassis.includes('gx') || chassis.includes('cray')) return 'cray';
  return 'proliant';
}

function _isDeltaScopePermitted(delta, targetIdentity, targetChassis, scope, isGen12Target, isGen11Target) {
  if (targetIdentity) {
    return ruleAppliesToProduct(delta, targetIdentity, notebookConfig);
  }
  if (scope === 'UNIVERSAL_VENDOR' || scope === 'UNIVERSAL') {
    return true;
  }
  const deltaChassis = String(delta.chassis || '').toLowerCase();
  const isGen12Delta = deltaChassis.includes('gen12') || deltaChassis.includes('g12');
  const isGen11Delta = deltaChassis.includes('gen11') || deltaChassis.includes('g11');

  if (isGen12Target && isGen11Delta) return false;
  if (isGen11Target && isGen12Delta) return false;

  const targetFamily = _inferFamilyName(targetChassis);
  const deltaFamily = deltaChassis ? _inferFamilyName(deltaChassis) : '';
  if (deltaFamily && targetFamily && deltaFamily !== targetFamily) {
    return false;
  }

  if (scope === 'CHASSIS_SPECIFIC' && targetChassis && deltaChassis) {
    if (!targetChassis.includes(deltaChassis) && !deltaChassis.includes(targetChassis)) {
      return false;
    }
  }
  return true;
}

function _categorizeActiveRule(ruleEntry, categorized) {
  const { ruleType, reasoning, affectedSku } = ruleEntry;
  categorized.allRules.push(ruleEntry);

  if (affectedSku) {
    if (!categorized.skuLookupMap.has(affectedSku)) {
      categorized.skuLookupMap.set(affectedSku, []);
    }
    categorized.skuLookupMap.get(affectedSku).push(ruleEntry);
  }

  const lowerMsg = (reasoning || '').toLowerCase();
  const isModernize = ruleType === 'GENERATIONAL_MODERNIZATION' || lowerMsg.includes('emerald rapids') || lowerMsg.includes('5th gen') || lowerMsg.includes('ddr5-5600');
  const isSubst = ruleType === 'SKU_SUBSTITUTION' || ruleType === 'OPTION_TYPE_SUBSTITUTION' || lowerMsg.includes('fio replacement') || lowerMsg.includes('superseded by');
  const isDep = ruleType === 'DEPENDENCY_CHAIN' || ruleType === 'PERMANENT_PHYSICAL_DEPENDENCY' || lowerMsg.includes('requires mandatory') || lowerMsg.includes('cable kit');

  if (isModernize) {
    categorized.generationalModernizations.push(ruleEntry);
  } else if (isSubst) {
    categorized.substitutions.push(ruleEntry);
  } else if (isDep) {
    categorized.mandatoryDependencies.push(ruleEntry);
  } else {
    categorized.advisories.push(ruleEntry);
  }
}

function _mergeRevokedIdentifiers(revokedSet, customRevokedOpt) {
  if (!customRevokedOpt) return;
  const list = Array.isArray(customRevokedOpt)
    ? customRevokedOpt
    : (customRevokedOpt instanceof Set ? Array.from(customRevokedOpt) : []);
  for (const rId of list) {
    if (rId) revokedSet.add(String(rId));
  }
}

/**
 * Filter and categorize knowledge rules for a specific chassis variant
 * @param {string} chassisVariant - Target chassis string (e.g. 'DL380_Gen11', 'DL380_Gen12')
 * @param {string} [chassisDir] - Directory path to chassis outputs
 * @param {object} [options] - Options (rawDeltas, revokedIdentifiers)
 * @returns {object} Categorized active rules
 */
function loadActiveKnowledgeRules(chassisVariant = '', chassisDir = '', options = {}) {
  const rawDeltas = Array.isArray(options?.rawDeltas) ? options.rawDeltas : _loadRawDeltasFromDisk(chassisDir);
  const revokedSet = _loadRevokedIdentifiers(chassisDir);
  _mergeRevokedIdentifiers(revokedSet, options?.revokedIdentifiers);

  const targetChassis = String(chassisVariant || (chassisDir ? path.basename(chassisDir) : '')).toLowerCase();
  const targetIdentity = resolveProductIdentity(chassisDir ? path.basename(chassisDir) : targetChassis, notebookConfig);
  const isGen12Target = targetChassis.includes('gen12') || targetChassis.includes('g12');
  const isGen11Target = targetChassis.includes('gen11') || targetChassis.includes('g11');

  const categorized = {
    allRules: [],
    mandatoryDependencies: [],
    substitutions: [],
    generationalModernizations: [],
    contestedAlternatives: [],
    advisories: [],
    skuLookupMap: new Map()
  };

  for (const delta of rawDeltas) {
    const affectedSku = cleanBaseSKU(delta.affectedSku || delta.sku || '');
    const requiredSku = cleanBaseSKU(delta.requiredDependencySku || delta.targetSku || delta.requiredSku || '');
    const ruleType = delta.ruleType || delta.errorType || 'KNOWLEDGE_DELTA';
    const msg = delta.rawMessage || delta.reasoning || delta.ruleUpdate || '';
    const scope = (delta.scopeTaxonomy || delta.scope || 'CHASSIS_SPECIFIC').toUpperCase();

    // Gate 0: Revocation & Governance check
    if (_isDeltaRevokedOrInactive(delta, revokedSet)) {
      continue;
    }

    // Gate 1: SKU syntax sanity
    if (affectedSku && (SKU_BLACKLIST.has(affectedSku.toUpperCase()) || !isValidHpeSKU(affectedSku))) {
      continue;
    }

    // Gate 2: Generation & Family Isolation Firewall (INV-48)
    if (!_isDeltaScopePermitted(delta, targetIdentity, targetChassis, scope, isGen12Target, isGen11Target)) {
      continue;
    }

    const ruleEntry = {
      ruleId: delta.deltaId || `RULE_${Date.now()}`,
      ruleType,
      affectedSku,
      requiredDependencySku: requiredSku,
      reasoning: msg,
      scopeTaxonomy: scope,
      chassis: delta.chassis || chassisVariant,
      rawDelta: delta
    };

    _categorizeActiveRule(ruleEntry, categorized);
  }

  return categorized;
}

module.exports = {
  loadActiveKnowledgeRules,
  filterDeltaRules: (rawDeltas, chassisVariant = '', chassisDir = '', options = {}) => loadActiveKnowledgeRules(chassisVariant, chassisDir, { rawDeltas, ...options }),
  _loadRevokedIdentifiers,
  MASTER_REGISTRY_PATH,
  GLOBAL_DELTAS_PATH
};
