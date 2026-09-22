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
const { SKU_BLACKLIST } = require('../feedback/quarantined_deltas.js');
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
 * Filter and categorize knowledge rules for a specific chassis variant
 * @param {string} chassisVariant - Target chassis string (e.g. 'DL380_Gen11', 'DL380_Gen12')
 * @param {string} [chassisDir] - Directory path to chassis outputs
 * @returns {object} Categorized active rules
 */
function loadActiveKnowledgeRules(chassisVariant = '', chassisDir = '', options = {}) {
  const rawDeltas = Array.isArray(options?.rawDeltas) ? options.rawDeltas : _loadRawDeltasFromDisk(chassisDir);
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

    // Gate 0: Governance & Approval status check
    const status = String(delta.governanceStatus || delta.status || 'ACTIVE').toUpperCase();
    if (status === 'PENDING' || status === 'QUARANTINED' || status === 'REJECTED' || status === 'DRAFT') {
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
  filterDeltaRules: (rawDeltas, chassisVariant = '', chassisDir = '') => loadActiveKnowledgeRules(chassisVariant, chassisDir, { rawDeltas }),
  MASTER_REGISTRY_PATH,
  GLOBAL_DELTAS_PATH
};
