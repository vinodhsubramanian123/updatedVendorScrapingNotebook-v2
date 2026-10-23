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
  const REVOKED_DECISION_TYPES = new Set(['REJECTED', 'REVOKED', 'AUTO_REJECTED', 'EXPIRED', 'SUPERSEDED']);

  // 1. Process decision logs
  for (const dp of decisionPaths) {
    if (!fs.existsSync(dp)) continue;
    try {
      const records = JSON.parse(fs.readFileSync(dp, 'utf-8'));
      if (Array.isArray(records)) {
        for (const rec of records) {
          const dec = String(rec.decision || '').toUpperCase();
          if (REVOKED_DECISION_TYPES.has(dec)) {
            if (rec.deltaId) revokedSet.add(rec.deltaId);
            if (rec.quarantineId) revokedSet.add(rec.quarantineId);
            if (rec.ruleId) revokedSet.add(rec.ruleId);
            if (rec.knowledgeFingerprint) revokedSet.add(rec.knowledgeFingerprint);
          } else if (dec === 'PROMOTED') {
            if (rec.deltaId) revokedSet.delete(rec.deltaId);
            if (rec.quarantineId) revokedSet.delete(rec.quarantineId);
            if (rec.ruleId) revokedSet.delete(rec.ruleId);
            if (rec.knowledgeFingerprint) revokedSet.delete(rec.knowledgeFingerprint);
          }
        }
      }
    } catch (e) {
      logger.warn('ACTIVE_KNOWLEDGE_ROUTER', `Failed to read decisions file: ${dp}`, e);
    }
  }

  // 2. Process active quarantined deltas (anything currently quarantined is not active)
  for (const qp of quarantinePaths) {
    if (!fs.existsSync(qp)) continue;
    try {
      const quarantined = JSON.parse(fs.readFileSync(qp, 'utf-8'));
      if (Array.isArray(quarantined)) {
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
    } catch (e) {
      logger.warn('ACTIVE_KNOWLEDGE_ROUTER', `Failed to read quarantine file: ${qp}`, e);
    }
  }

  return revokedSet;
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
  if (options?.revokedIdentifiers) {
    const customRevoked = Array.isArray(options.revokedIdentifiers)
      ? options.revokedIdentifiers
      : (options.revokedIdentifiers instanceof Set ? Array.from(options.revokedIdentifiers) : []);
    for (const rId of customRevoked) {
      if (rId) revokedSet.add(String(rId));
    }
  }

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
      continue;
    }

    const status = String(delta.governanceStatus || delta.status || 'ACTIVE').toUpperCase();
    if (status === 'PENDING' || status === 'QUARANTINED' || status === 'REJECTED' || status === 'DRAFT' || status === 'REVOKED' || status === 'EXPIRED' || status === 'DEPRECATED') {
      continue;
    }

    // Gate 1: SKU syntax sanity
    if (affectedSku && (SKU_BLACKLIST.has(affectedSku.toUpperCase()) || !isValidHpeSKU(affectedSku))) {
      continue;
    }

    // Apply the same product firewall used by notebook synchronization.
    if (targetIdentity && !ruleAppliesToProduct(delta, targetIdentity, notebookConfig)) continue;

    // Gate 2: Generation & Family Isolation Firewall (INV-48)
    if (!targetIdentity && scope !== 'UNIVERSAL_VENDOR' && scope !== 'UNIVERSAL') {
      const deltaChassis = String(delta.chassis || '').toLowerCase();
      const isGen12Delta = deltaChassis.includes('gen12') || deltaChassis.includes('g12');
      const isGen11Delta = deltaChassis.includes('gen11') || deltaChassis.includes('g11');

      if (isGen12Target && isGen11Delta) continue;
      if (isGen11Target && isGen12Delta) continue;

      // Family isolation check
      const targetFamily = targetChassis.includes('sy') ? 'synergy' : (targetChassis.includes('msl') ? 'storeever' : (targetChassis.includes('alletra') ? 'alletra' : (targetChassis.includes('gx') || targetChassis.includes('cray') ? 'cray' : 'proliant')));
      const deltaFamily = deltaChassis.includes('sy') ? 'synergy' : (deltaChassis.includes('msl') ? 'storeever' : (deltaChassis.includes('alletra') ? 'alletra' : (deltaChassis.includes('gx') || deltaChassis.includes('cray') ? 'cray' : (deltaChassis ? 'proliant' : ''))));
      if (deltaFamily && targetFamily && deltaFamily !== targetFamily) {
        continue;
      }

      if (scope === 'CHASSIS_SPECIFIC' && targetChassis && deltaChassis) {
        if (!targetChassis.includes(deltaChassis) && !deltaChassis.includes(targetChassis)) {
          continue;
        }
      }
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

    categorized.allRules.push(ruleEntry);

    // Index by affected SKU
    if (affectedSku) {
      if (!categorized.skuLookupMap.has(affectedSku)) {
        categorized.skuLookupMap.set(affectedSku, []);
      }
      categorized.skuLookupMap.get(affectedSku).push(ruleEntry);
    }

    // Semantic categorization
    const lowerMsg = msg.toLowerCase();
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

  return categorized;
}

module.exports = {
  loadActiveKnowledgeRules,
  filterDeltaRules: (rawDeltas, chassisVariant = '', chassisDir = '', options = {}) => loadActiveKnowledgeRules(chassisVariant, chassisDir, { rawDeltas, ...options }),
  _loadRevokedIdentifiers,
  MASTER_REGISTRY_PATH,
  GLOBAL_DELTAS_PATH
};
