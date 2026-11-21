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
const {
  evaluateInvalidationBoundary,
  loadDependencyIndex
} = require('../boq/evidence/dependency_index.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const MASTER_REGISTRY_PATH = path.join(PROJECT_ROOT, 'outputs', 'history', 'master_knowledge_registry.json');
const GLOBAL_DELTAS_PATH = path.join(PROJECT_ROOT, 'outputs', 'history', 'catalog_deltas.json');

function _normalizePathList(value) {
  if (Array.isArray(value)) return value.filter(p => typeof p === 'string' && p.trim().length > 0);
  if (typeof value === 'string' && value.trim().length > 0) return [value];
  return [];
}

function _resolveRegistryPaths(chassisDir, options = {}) {
  const custom = _normalizePathList(options.registryPaths);
  const pathsToSearch = custom.length > 0
    ? [...custom]
    : (options.isolated === true && chassisDir ? [] : [GLOBAL_DELTAS_PATH, MASTER_REGISTRY_PATH]);

  if (chassisDir && typeof chassisDir === 'string' && fs.existsSync(chassisDir) && options.includeChassisDirDeltas !== false) {
    const chassisDeltaPath = path.join(chassisDir, 'history', 'catalog_deltas.json');
    if (!pathsToSearch.includes(chassisDeltaPath)) pathsToSearch.unshift(chassisDeltaPath);
  }
  return pathsToSearch;
}

function _extractDeltaArray(content) {
  if (Array.isArray(content)) return content;
  if (Array.isArray(content?.deltas)) return content.deltas;
  if (content?.universalRules || content?.familyGenRules || content?.chassisSpecificRules) {
    return [
      ...(Array.isArray(content.universalRules) ? content.universalRules : []),
      ...(Array.isArray(content.familyGenRules) ? content.familyGenRules : []),
      ...(Array.isArray(content.chassisSpecificRules) ? content.chassisSpecificRules : [])
    ];
  }
  return [];
}

/**
 * Load raw delta entries from standard or custom registry locations
 */
function _loadRawDeltasFromDisk(chassisDir, options = {}) {
  const pathsToSearch = _resolveRegistryPaths(chassisDir, options);
  const rawDeltas = [];
  const seenKeys = new Set();

  for (const p of pathsToSearch) {
    if (!fs.existsSync(p)) continue;
    try {
      const content = JSON.parse(fs.readFileSync(p, 'utf-8'));
      for (const d of _extractDeltaArray(content)) {
        const scopeKey = d.productId || d.chassis || '';
        const key = d.deltaId
          ? `${d.deltaId}::${scopeKey}`
          : `${scopeKey}:${d.affectedSku}:${d.requiredDependencySku || ''}:${d.ruleType || ''}`;
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

const REVOKED_DECISION_TYPES = new Set(['REJECTED', 'REVOKED', 'RETRACTED', 'AUTO_REJECTED', 'EXPIRED', 'SUPERSEDED']);

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

function _resolveLedgerPaths(chassisDir, fileName, customListOpt, isolatedOpt) {
  const custom = _normalizePathList(customListOpt);
  const paths = custom.length > 0
    ? [...custom]
    : (isolatedOpt === true && chassisDir ? [] : [path.join(PROJECT_ROOT, 'outputs', 'history', fileName)]);

  if (chassisDir && typeof chassisDir === 'string' && fs.existsSync(chassisDir)) {
    const chassisFile = path.join(chassisDir, 'history', fileName);
    if (!paths.includes(chassisFile)) paths.push(chassisFile);
  }
  return paths;
}

/**
 * Load revoked or rejected identifiers and fingerprints from decision ledgers & quarantine files
 */
function _loadRevokedIdentifiers(chassisDir, options = {}) {
  const decisionPaths = _resolveLedgerPaths(chassisDir, 'knowledge_decisions.json', options.decisionPaths, options.isolated);
  const quarantinePaths = _resolveLedgerPaths(chassisDir, 'quarantined_deltas.json', options.quarantinePaths, options.isolated);
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

const INACTIVE_GOVERNANCE_STATUSES = new Set(['PENDING', 'QUARANTINED', 'REJECTED', 'DRAFT', 'REVOKED', 'RETRACTED', 'SUPERSEDED', 'EXPIRED', 'DEPRECATED']);

function _isDeltaRevokedOrInactive(delta, revokedSet) {
  if (delta.active === false) return true;
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
  return [delta.governanceStatus, delta.status].some(status => INACTIVE_GOVERNANCE_STATUSES.has(String(status || '').toUpperCase()));
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

const SEGREGATED_RECORD_KINDS = new Set([
  'OPERATIONAL_INCIDENT',
  'WORKFLOW_INCIDENT',
  'USER_PREFERENCE',
  'LOCAL_USER_PREFERENCE',
  'USER_PLATFORM_SELECTION'
]);

const AGENT_EXPLANATION_MARKERS = new Set([
  'AGENT_SELF_EXPLANATION',
  'AGENT_EXPLANATION',
  'AGENT_GENERATED_EXPLANATION'
]);

function _classifySegregationReason(delta) {
  if (!delta || typeof delta !== 'object') return null;
  const kindTokens = [
    delta.ruleType, delta.errorType, delta.category,
    delta.type, delta.governanceStatus, delta.status
  ].map(v => String(v || '').trim().toUpperCase());

  const matchedKind = kindTokens.find(tok => SEGREGATED_RECORD_KINDS.has(tok));
  if (matchedKind) return matchedKind;

  const originTokens = [
    delta.sourceType, delta.evidenceType, delta.origin
  ].map(v => String(v || '').trim().toUpperCase());

  if (originTokens.some(tok => AGENT_EXPLANATION_MARKERS.has(tok))) {
    return 'AGENT_SELF_EXPLANATION';
  }
  return null;
}

function _isWorkflowAdvisoryDelta(delta, ruleType) {
  const evType = String(delta?.evidenceType || '').trim().toUpperCase();
  const rt = String(ruleType || '').trim().toUpperCase();
  return evType === 'WORKFLOW_REVIEW' || rt.startsWith('WORKFLOW_');
}

const MODERNIZE_HINTS = ['emerald rapids', '5th gen', 'ddr5-5600'];
const SUBST_HINTS = ['fio replacement', 'superseded by'];
const DEP_HINTS = ['requires mandatory', 'cable kit'];

function _matchesHint(lowerMsg, hints) {
  return hints.some(hint => lowerMsg.includes(hint));
}

function _resolveRuleCategoryBucket(ruleType, lowerMsg) {
  if (ruleType === 'GENERATIONAL_MODERNIZATION' || _matchesHint(lowerMsg, MODERNIZE_HINTS)) {
    return 'generationalModernizations';
  }
  if (ruleType === 'SKU_SUBSTITUTION' || ruleType === 'OPTION_TYPE_SUBSTITUTION' || _matchesHint(lowerMsg, SUBST_HINTS)) {
    return 'substitutions';
  }
  if (ruleType === 'DEPENDENCY_CHAIN' || ruleType === 'PERMANENT_PHYSICAL_DEPENDENCY' || _matchesHint(lowerMsg, DEP_HINTS)) {
    return 'mandatoryDependencies';
  }
  return 'advisories';
}

function _categorizeActiveRule(ruleEntry, categorized) {
  categorized.allRules.push(ruleEntry);
  categorized.retrievedRuleIds.push(ruleEntry.ruleId);

  if (ruleEntry.isWorkflowAdvisory) {
    categorized.workflowAdvisories.push(ruleEntry);
    categorized.advisories.push(ruleEntry);
    return;
  }

  categorized.physicalRules.push(ruleEntry);
  if (ruleEntry.affectedSku) {
    if (!categorized.skuLookupMap.has(ruleEntry.affectedSku)) {
      categorized.skuLookupMap.set(ruleEntry.affectedSku, []);
    }
    categorized.skuLookupMap.get(ruleEntry.affectedSku).push(ruleEntry);
  }

  const lowerMsg = String(ruleEntry.reasoning || '').toLowerCase();
  const bucket = _resolveRuleCategoryBucket(ruleEntry.ruleType, lowerMsg);
  categorized[bucket].push(ruleEntry);
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

function _collectRetractedIdsFromIndex(depIndex, revokedSet) {
  const retractedRuleIds = [];
  for (const node of Object.values(depIndex.nodes || {})) {
    if (node && node.status === 'RETRACTED' && node.id) {
      revokedSet.add(String(node.id));
      retractedRuleIds.push(String(node.id));
    }
  }
  return retractedRuleIds;
}

function _resolveDependencyContext(options, revokedSet) {
  let depIndex = options?.dependencyIndex || null;
  if (!depIndex && options?.dependencyIndexPath) {
    depIndex = loadDependencyIndex(options.dependencyIndexPath);
  }
  if (!depIndex || typeof depIndex !== 'object') return null;

  const retractedRuleIds = _collectRetractedIdsFromIndex(depIndex, revokedSet);
  const targetNodeId = options.targetDependencyNodeId || options.dependencyNodeId || null;
  if (targetNodeId) {
    return evaluateInvalidationBoundary(depIndex, targetNodeId, options.currentRevisions || {});
  }
  return {
    status: 'INDEX_LOADED',
    indexRevisionSha256: depIndex.indexRevisionSha256 || null,
    retractedRuleIds
  };
}

function _defineNonEnumerableArray(target, propName) {
  Object.defineProperty(target, propName, {
    value: [],
    enumerable: false,
    configurable: true,
    writable: true
  });
}

function _buildInitialCategorizedResult(dependencyBoundary) {
  const result = {
    allRules: [],
    physicalRules: [],
    workflowAdvisories: [],
    mandatoryDependencies: [],
    substitutions: [],
    generationalModernizations: [],
    contestedAlternatives: [],
    advisories: [],
    retrievedRuleIds: [],
    dependencyBoundary,
    skuLookupMap: new Map()
  };
  // Keep audit/exclusion arrays non-enumerable so legacy Object.values(res).filter(Array.isArray) assertions stay intact.
  for (const prop of ['segregatedEntries', 'candidateRuleIds', 'excludedRevokedRuleIds', 'excludedScopeRuleIds']) {
    _defineNonEnumerableArray(result, prop);
  }
  return result;
}

function _firstNonEmpty(values, fallback = '') {
  for (const val of values) {
    if (val !== undefined && val !== null && String(val).trim() !== '') return val;
  }
  return fallback;
}

function _buildRuleEntryFromDelta(delta, affectedSku, ruleType, scope, chassisVariant) {
  const isWorkflowAdvisory = _isWorkflowAdvisoryDelta(delta, ruleType);
  const reqRaw = _firstNonEmpty([delta.requiredDependencySku, delta.targetSku, delta.requiredSku], '');
  return {
    ruleId: _firstNonEmpty([delta.deltaId, delta.ruleId], `RULE_${Date.now()}`),
    ruleType,
    affectedSku,
    requiredDependencySku: cleanBaseSKU(reqRaw),
    reasoning: _firstNonEmpty([delta.rawMessage, delta.reasoning, delta.ruleUpdate], ''),
    scopeTaxonomy: scope,
    chassis: delta.chassis || chassisVariant,
    isWorkflowAdvisory,
    isPhysicalRule: !isWorkflowAdvisory,
    rawDelta: delta
  };
}

function _evaluateSingleDelta(delta, ctx, categorized) {
  const candidateId = delta.deltaId || delta.ruleId || null;
  if (candidateId) categorized.candidateRuleIds.push(candidateId);

  const segregationReason = _classifySegregationReason(delta);
  if (segregationReason) {
    categorized.segregatedEntries.push({
      ruleId: candidateId,
      ruleType: _firstNonEmpty([delta.ruleType, delta.errorType, delta.category], null),
      segregationReason,
      rawDelta: delta
    });
    return;
  }

  if (_isDeltaRevokedOrInactive(delta, ctx.revokedSet)) {
    if (candidateId) categorized.excludedRevokedRuleIds.push(candidateId);
    return;
  }

  const affectedSku = cleanBaseSKU(_firstNonEmpty([delta.affectedSku, delta.sku], ''));
  if (affectedSku && (SKU_BLACKLIST.has(affectedSku.toUpperCase()) || !isValidHpeSKU(affectedSku))) {
    return;
  }

  const ruleType = _firstNonEmpty([delta.ruleType, delta.errorType], 'KNOWLEDGE_DELTA');
  const scope = String(_firstNonEmpty([delta.scopeTaxonomy, delta.scope], 'CHASSIS_SPECIFIC')).toUpperCase();
  if (!_isDeltaScopePermitted(delta, ctx.targetIdentity, ctx.targetChassis, scope, ctx.isGen12Target, ctx.isGen11Target)) {
    if (candidateId) categorized.excludedScopeRuleIds.push(candidateId);
    return;
  }

  _categorizeActiveRule(_buildRuleEntryFromDelta(delta, affectedSku, ruleType, scope, ctx.chassisVariant), categorized);
}

/**
 * Filter and categorize knowledge rules for a specific chassis variant
 * @param {string} chassisVariant - Target chassis string (e.g. 'DL380_Gen11', 'DL380_Gen12')
 * @param {string} [chassisDir] - Directory path to chassis outputs
 * @param {object} [options] - Options (rawDeltas, revokedIdentifiers, custom paths, dependencyIndex)
 * @returns {object} Categorized active rules
 */
function loadActiveKnowledgeRules(chassisVariant = '', chassisDir = '', options = {}) {
  const rawDeltas = Array.isArray(options?.rawDeltas) ? options.rawDeltas : _loadRawDeltasFromDisk(chassisDir, options);
  const revokedSet = _loadRevokedIdentifiers(chassisDir, options);
  _mergeRevokedIdentifiers(revokedSet, options?.revokedIdentifiers);
  const dependencyBoundary = _resolveDependencyContext(options, revokedSet);

  const targetChassis = String(chassisVariant || (chassisDir ? path.basename(chassisDir) : '')).toLowerCase();
  const targetIdentity = resolveProductIdentity(chassisDir ? path.basename(chassisDir) : targetChassis, notebookConfig);
  const ctx = {
    chassisVariant,
    revokedSet,
    targetChassis,
    targetIdentity,
    isGen12Target: targetChassis.includes('gen12') || targetChassis.includes('g12'),
    isGen11Target: targetChassis.includes('gen11') || targetChassis.includes('g11')
  };

  const categorized = _buildInitialCategorizedResult(dependencyBoundary);
  for (const delta of rawDeltas) {
    _evaluateSingleDelta(delta, ctx, categorized);
  }
  return categorized;
}

function _extractRetrievedRuleIds(loadedRules) {
  if (Array.isArray(loadedRules)) return [...new Set(loadedRules.map(r => String(r)).filter(Boolean))];
  if (Array.isArray(loadedRules?.retrievedRuleIds)) return [...new Set(loadedRules.retrievedRuleIds.map(String).filter(Boolean))];
  if (Array.isArray(loadedRules?.allRules)) return [...new Set(loadedRules.allRules.map(r => String(r?.ruleId || '')).filter(Boolean))];
  return [];
}

function _normalizeAppliedEffect(effectEntry) {
  return {
    ruleId: String(effectEntry.ruleId),
    sku: effectEntry.sku || null,
    action: effectEntry.action || null,
    effect: effectEntry.effect || null,
    reason: effectEntry.reason || null
  };
}

/**
 * Record rule consumption distinguishing retrieved rule IDs from actually applied rule IDs & effects.
 */
function recordRuleConsumption(loadedRules, appliedEffects = [], options = {}) {
  const retrievedRuleIds = _extractRetrievedRuleIds(loadedRules);
  const normalizedEffects = (Array.isArray(appliedEffects) ? appliedEffects : [])
    .filter(e => e && e.ruleId)
    .map(_normalizeAppliedEffect);
  const appliedRuleIds = [...new Set(normalizedEffects.map(e => e.ruleId))];
  const appliedSet = new Set(appliedRuleIds);
  const unappliedRuleIds = retrievedRuleIds.filter(id => !appliedSet.has(id));

  return {
    valid: true,
    retrievedRuleIds,
    appliedRuleIds,
    unappliedRuleIds,
    appliedEffects: normalizedEffects,
    isZeroNewLessonsRun: retrievedRuleIds.length === 0,
    repeatedIncidentStats: options?.repeatedIncidentStats || null,
    cloudSyncStatus: options?.cloudSyncStatus || 'SEPARATE_FROM_LOCAL_CONSUMPTION',
    recordedAt: new Date().toISOString()
  };
}

module.exports = {
  loadActiveKnowledgeRules,
  filterDeltaRules: (rawDeltas, chassisVariant = '', chassisDir = '', options = {}) => loadActiveKnowledgeRules(chassisVariant, chassisDir, { rawDeltas, ...options }),
  recordRuleConsumption,
  _loadRevokedIdentifiers,
  _isDeltaRevokedOrInactive,
  MASTER_REGISTRY_PATH,
  GLOBAL_DELTAS_PATH
};
