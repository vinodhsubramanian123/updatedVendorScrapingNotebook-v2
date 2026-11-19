'use strict';
/**
 * scripts/lib/boq/evidence/dependency_index.js — Versioned Evidence Dependency Index & Invalidation (SI-08)
 *
 * Leaf module tracking dependencies across REQUIREMENT -> FACT/RULE/SOURCE -> CLAIM ->
 * CANDIDATE -> REVIEW -> ARTIFACT -> AUTHORIZATION, enforcing:
 * - Deterministic cycle detection & rejection (cyclic evidence can never grant authority)
 * - Transitive invalidation on source revision change, requirement change, or rule retraction
 * - Immutable receipt preservation & explicit reevaluationQueue[]
 * - Read/authorization boundary verification (evaluateInvalidationBoundary)
 * - Atomic persistence via safeWriteJsonAtomic
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { safeWriteJsonAtomic } = require('../../system/fs_compat.js');

const SCHEMA_VERSION = '1.0';
const NODE_KINDS = Object.freeze([
  'REQUIREMENT', 'FACT', 'RULE', 'SOURCE',
  'CLAIM', 'CANDIDATE', 'REVIEW', 'ARTIFACT', 'AUTHORIZATION'
]);
const NODE_KIND_SET = new Set(NODE_KINDS);
const DOWNSTREAM_INVALIDATABLE_KINDS = new Set([
  'CLAIM', 'CANDIDATE', 'REVIEW', 'ARTIFACT', 'AUTHORIZATION'
]);
const DEFAULT_DEPENDENCY_INDEX_PATH = path.resolve(
  __dirname, '..', '..', '..', '..', 'outputs', 'history', 'evidence_dependency_index.json'
);

function _canonicalSort(value) {
  if (Array.isArray(value)) return value.map(_canonicalSort);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const key of Object.keys(value).sort()) {
    if (value[key] !== undefined) out[key] = _canonicalSort(value[key]);
  }
  return out;
}

function _computeIndexSha256(index) {
  const payload = _canonicalSort({
    schemaVersion: index.schemaVersion || SCHEMA_VERSION,
    nodes: index.nodes || {},
    edges: index.edges || [],
    reevaluationQueue: index.reevaluationQueue || [],
    preservedReceipts: index.preservedReceipts || []
  });
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function _refreshIndexDigest(index, nowIso = new Date().toISOString()) {
  index.schemaVersion = SCHEMA_VERSION;
  index.updatedAt = nowIso;
  index.indexRevisionSha256 = _computeIndexSha256(index);
  return index;
}

function _normalizeIndex(raw = {}) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const index = {
    schemaVersion: SCHEMA_VERSION,
    indexRevisionSha256: src.indexRevisionSha256 || null,
    updatedAt: src.updatedAt || new Date().toISOString(),
    nodes: src.nodes && typeof src.nodes === 'object' && !Array.isArray(src.nodes) ? { ...src.nodes } : {},
    edges: Array.isArray(src.edges) ? src.edges.map(e => ({ ...e })) : [],
    reevaluationQueue: Array.isArray(src.reevaluationQueue) ? src.reevaluationQueue.map(q => ({ ...q })) : [],
    preservedReceipts: Array.isArray(src.preservedReceipts) ? src.preservedReceipts.map(r => ({ ...r })) : []
  };
  if (!index.indexRevisionSha256) index.indexRevisionSha256 = _computeIndexSha256(index);
  return index;
}

function createDependencyIndex(initial = {}) {
  return _normalizeIndex(initial);
}

function loadDependencyIndex(filePath = DEFAULT_DEPENDENCY_INDEX_PATH) {
  if (!filePath || !fs.existsSync(filePath)) return createDependencyIndex();
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return _normalizeIndex(parsed);
}

function saveDependencyIndexAtomic(filePath = DEFAULT_DEPENDENCY_INDEX_PATH, index, writer = safeWriteJsonAtomic) {
  const normalized = _normalizeIndex(index);
  _refreshIndexDigest(normalized, normalized.updatedAt || new Date().toISOString());
  const writeResult = writer(filePath, normalized);
  return { filePath, index: normalized, writeResult };
}

function _preserveReceiptForNode(index, node, triggerNodeId = null, preservedAt = new Date().toISOString()) {
  const receiptPath = node?.immutableReceiptPath;
  if (!receiptPath) return false;
  const exists = index.preservedReceipts.some(
    r => r.nodeId === node.id && r.immutableReceiptPath === receiptPath
  );
  if (exists) return false;
  index.preservedReceipts.push({
    nodeId: node.id,
    kind: node.kind,
    product: node.product || null,
    revision: node.revision || null,
    immutableReceiptPath: receiptPath,
    triggerNodeId,
    preservedAt
  });
  return true;
}

function _pickField(primary, secondary, fallback = null) {
  if (primary !== undefined) return primary;
  if (secondary !== undefined) return secondary;
  return fallback;
}

function _buildRegisteredNode(id, kind, nodeSpec, existing, now) {
  const invalidatedBy = Array.isArray(nodeSpec.invalidatedBy)
    ? [...nodeSpec.invalidatedBy]
    : (Array.isArray(existing?.invalidatedBy) ? [...existing.invalidatedBy] : []);
  return {
    id,
    kind,
    product: _pickField(nodeSpec.product, existing?.product, null),
    revision: _pickField(nodeSpec.revision, existing?.revision, null),
    status: nodeSpec.status || existing?.status || 'VALID',
    immutableReceiptPath: _pickField(nodeSpec.immutableReceiptPath, existing?.immutableReceiptPath, null),
    createdAt: existing?.createdAt || nodeSpec.createdAt || now,
    updatedAt: now,
    invalidatedBy
  };
}

function registerDependencyNode(index, nodeSpec = {}) {
  const target = _normalizeIndexIfNeeded(index);
  const id = String(nodeSpec.id || '').trim();
  if (!id) throw new Error('registerDependencyNode requires a non-empty id');
  const kind = String(nodeSpec.kind || '').toUpperCase();
  if (!NODE_KIND_SET.has(kind)) throw new Error(`Invalid dependency node kind: "${nodeSpec.kind}"`);

  const now = nodeSpec.updatedAt || new Date().toISOString();
  const node = _buildRegisteredNode(id, kind, nodeSpec, target.nodes[id], now);
  target.nodes[id] = node;
  _preserveReceiptForNode(target, node, null, now);
  _refreshIndexDigest(target, now);
  return node;
}

function _normalizeIndexIfNeeded(index) {
  if (!index || typeof index !== 'object') throw new Error('Dependency index object is required');
  if (!index.nodes) index.nodes = {};
  if (!Array.isArray(index.edges)) index.edges = [];
  if (!Array.isArray(index.reevaluationQueue)) index.reevaluationQueue = [];
  if (!Array.isArray(index.preservedReceipts)) index.preservedReceipts = [];
  return index;
}

function _buildOutAdjacency(edges) {
  const adj = new Map();
  for (const edge of edges || []) {
    if (!edge?.fromId || !edge?.toId) continue;
    if (!adj.has(edge.fromId)) adj.set(edge.fromId, []);
    adj.get(edge.fromId).push(edge.toId);
  }
  return adj;
}

function _findShortestPathBfs(adj, startId, goalId) {
  const queue = [startId];
  const visited = new Set([startId]);
  const parent = new Map();
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i];
    if (cur === goalId) return _reconstructBfsPath(parent, startId, goalId);
    for (const next of adj.get(cur) || []) {
      if (!visited.has(next)) {
        visited.add(next);
        parent.set(next, cur);
        queue.push(next);
      }
    }
  }
  return null;
}

function _reconstructBfsPath(parent, startId, goalId) {
  const pathList = [goalId];
  let cur = goalId;
  while (cur !== startId && parent.has(cur)) {
    cur = parent.get(cur);
    pathList.push(cur);
  }
  return pathList.reverse();
}

function detectDependencyCycle(index, fromId, toId) {
  if (!fromId || !toId) return { hasCycle: false, cyclePath: [] };
  if (fromId === toId) return { hasCycle: true, cyclePath: [fromId, toId] };
  const adj = _buildOutAdjacency(index?.edges);
  const pathFromTo = _findShortestPathBfs(adj, toId, fromId);
  if (!pathFromTo) return { hasCycle: false, cyclePath: [] };
  return { hasCycle: true, cyclePath: [...pathFromTo, toId] };
}

function addDependencyEdge(index, fromId, toId, relation = 'SUPPORTS') {
  const target = _normalizeIndexIfNeeded(index);
  const from = String(fromId || '').trim();
  const to = String(toId || '').trim();
  if (!from || !to) {
    return { accepted: false, cyclicEvidenceRejected: false, cyclePath: [], reason: 'INVALID_NODE_ID' };
  }
  const cycle = detectDependencyCycle(target, from, to);
  if (cycle.hasCycle) {
    return {
      accepted: false,
      cyclicEvidenceRejected: true,
      cyclePath: cycle.cyclePath,
      reason: 'CYCLIC_EVIDENCE_REJECTED'
    };
  }
  const rel = String(relation || 'SUPPORTS');
  const duplicate = target.edges.some(e => e.fromId === from && e.toId === to && e.relation === rel);
  if (!duplicate) {
    target.edges.push({ fromId: from, toId: to, relation: rel });
    _refreshIndexDigest(target);
  }
  return { accepted: true, cyclicEvidenceRejected: false, edge: { fromId: from, toId: to, relation: rel } };
}

function _ensureTriggerNode(index, triggerId, defaultKind, newRevision, nowIso) {
  const existing = index.nodes[triggerId];
  const existedInIndex = Boolean(existing);
  const priorRevision = existing?.revision ?? null;
  if (!existing) {
    index.nodes[triggerId] = {
      id: triggerId,
      kind: defaultKind,
      product: null,
      revision: newRevision !== undefined ? newRevision : null,
      status: 'VALID',
      immutableReceiptPath: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      invalidatedBy: []
    };
  } else if (newRevision !== undefined) {
    index.nodes[triggerId].revision = newRevision;
  }
  return { triggerNode: index.nodes[triggerId], existedInIndex, priorRevision };
}

function _collectDownstreamNodesBfs(index, triggerId) {
  const adj = _buildOutAdjacency(index.edges);
  const visited = new Set([triggerId]);
  const queue = [triggerId];
  const downstream = [];
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i];
    for (const nextId of adj.get(cur) || []) {
      if (!visited.has(nextId)) {
        visited.add(nextId);
        queue.push(nextId);
        downstream.push(nextId);
      }
    }
  }
  return downstream;
}

function _appendInvalidationMark(node, marker, nowIso) {
  if (!Array.isArray(node.invalidatedBy)) node.invalidatedBy = [];
  node.invalidatedBy.push(marker);
  node.updatedAt = nowIso;
}

function _buildQueueItem(triggerNodeId, triggerType, affectedNode, reason, priorRevision, newRevision, nowIso, queueIndex) {
  const seed = `${triggerNodeId}::${triggerType}::${affectedNode.id}::${newRevision ?? ''}::${nowIso}::${queueIndex}`;
  const queueId = `REEVAL-${crypto.createHash('sha256').update(seed).digest('hex').slice(0, 12).toUpperCase()}`;
  return {
    queueId,
    triggerNodeId,
    triggerType,
    affectedNodeId: affectedNode.id,
    affectedKind: affectedNode.kind,
    affectedProduct: affectedNode.product || null,
    reason,
    priorRevision,
    newRevision: newRevision !== undefined ? newRevision : null,
    status: 'PENDING_REEVALUATION',
    queuedAt: nowIso
  };
}

function _applyTransitiveInvalidation(index, spec) {
  const target = _normalizeIndexIfNeeded(index);
  const { triggerId, defaultKind, triggerType, triggerStatus, newRevision, reason } = spec;
  const nowIso = new Date().toISOString();
  const { triggerNode, existedInIndex, priorRevision } = _ensureTriggerNode(
    target, triggerId, defaultKind, newRevision, nowIso
  );
  triggerNode.status = triggerStatus;
  const marker = {
    triggerNodeId: triggerId,
    triggerType,
    reason,
    priorRevision,
    newRevision: newRevision !== undefined ? newRevision : triggerNode.revision,
    at: nowIso
  };
  _appendInvalidationMark(triggerNode, marker, nowIso);
  let preservedCount = _preserveReceiptForNode(target, triggerNode, triggerId, nowIso) ? 1 : 0;

  const downstreamIds = _collectDownstreamNodesBfs(target, triggerId);
  const affectedNodeIds = [];
  const queuedItems = [];
  for (const nodeId of downstreamIds) {
    const node = target.nodes[nodeId];
    if (!node) continue;
    if (_preserveReceiptForNode(target, node, triggerId, nowIso)) preservedCount++;
    if (DOWNSTREAM_INVALIDATABLE_KINDS.has(node.kind)) {
      node.status = 'STALE_INVALIDATED';
      _appendInvalidationMark(node, marker, nowIso);
      const qItem = _buildQueueItem(triggerId, triggerType, node, reason, priorRevision, marker.newRevision, nowIso, target.reevaluationQueue.length);
      target.reevaluationQueue.push(qItem);
      affectedNodeIds.push(nodeId);
      queuedItems.push(qItem);
    }
  }
  _refreshIndexDigest(target, nowIso);
  return {
    triggerNodeId: triggerId,
    triggerType,
    triggerStatus,
    priorRevision,
    newRevision: marker.newRevision,
    existedInIndex,
    affectedNodeIds,
    queuedItems,
    preservedReceiptsAdded: preservedCount,
    indexRevisionSha256: target.indexRevisionSha256
  };
}

function invalidateBySourceChange(index, sourceId, newRevision, reason = 'SOURCE_REVISION_CHANGED') {
  return _applyTransitiveInvalidation(index, {
    triggerId: String(sourceId || '').trim(),
    defaultKind: 'SOURCE',
    triggerType: 'SOURCE_CHANGE',
    triggerStatus: 'STALE_INVALIDATED',
    newRevision,
    reason: String(reason || 'SOURCE_REVISION_CHANGED')
  });
}

function invalidateByRequirementChange(index, requirementId, newRevision, reason = 'REQUIREMENT_CHANGED') {
  return _applyTransitiveInvalidation(index, {
    triggerId: String(requirementId || '').trim(),
    defaultKind: 'REQUIREMENT',
    triggerType: 'REQUIREMENT_CHANGE',
    triggerStatus: 'STALE_INVALIDATED',
    newRevision,
    reason: String(reason || 'REQUIREMENT_CHANGED')
  });
}

function invalidateByRetractedRule(index, ruleId, reason = 'RULE_RETRACTED') {
  return _applyTransitiveInvalidation(index, {
    triggerId: String(ruleId || '').trim(),
    defaultKind: 'RULE',
    triggerType: 'RULE_RETRACTION',
    triggerStatus: 'RETRACTED',
    newRevision: undefined,
    reason: String(reason || 'RULE_RETRACTED')
  });
}

function _buildIncomingAdjacency(edges) {
  const incoming = new Map();
  for (const edge of edges || []) {
    if (!edge?.fromId || !edge?.toId) continue;
    if (!incoming.has(edge.toId)) incoming.set(edge.toId, []);
    incoming.get(edge.toId).push(edge.fromId);
  }
  return incoming;
}

function _walkUpstreamAncestors(incoming, targetNodeId) {
  const visited = new Set();
  const visiting = new Set();
  const ancestors = [];
  let cyclePath = null;

  function dfs(nodeId, stack) {
    if (visiting.has(nodeId)) {
      const idx = stack.indexOf(nodeId);
      cyclePath = idx >= 0 ? [...stack.slice(idx), nodeId] : [nodeId];
      return;
    }
    if (visited.has(nodeId)) return;
    visiting.add(nodeId);
    stack.push(nodeId);
    for (const parentId of incoming.get(nodeId) || []) {
      ancestors.push(parentId);
      dfs(parentId, stack);
    }
    stack.pop();
    visiting.delete(nodeId);
    visited.add(nodeId);
  }

  dfs(targetNodeId, []);
  return { ancestors: [...new Set(ancestors)], cyclePath };
}

function _collectBoundaryIssues(index, nodesToCheck, currentRevisions) {
  const invalidatedBy = [];
  const mismatchedRevisions = [];
  for (const id of nodesToCheck) {
    const node = index.nodes[id];
    if (!node) {
      invalidatedBy.push({ nodeId: id, kind: null, status: 'UNKNOWN', invalidatedBy: [] });
      continue;
    }
    if (node.status !== 'VALID') {
      invalidatedBy.push({ nodeId: id, kind: node.kind, status: node.status, invalidatedBy: node.invalidatedBy || [] });
    }
    if (currentRevisions && currentRevisions[id] && node.revision && currentRevisions[id] !== node.revision) {
      mismatchedRevisions.push({ nodeId: id, expectedRevision: node.revision, currentRevision: currentRevisions[id] });
    }
  }
  return { invalidatedBy, mismatchedRevisions };
}

function evaluateInvalidationBoundary(index, targetNodeId, currentRevisions = {}) {
  if (!index || typeof index !== 'object' || !index.nodes || !targetNodeId || !index.nodes[targetNodeId]) {
    return {
      status: 'UNKNOWN',
      canGrantAcceptance: false,
      isStale: false,
      invalidatedBy: [],
      reason: 'DEPENDENCY_INDEX_OR_NODE_MISSING'
    };
  }

  const incoming = _buildIncomingAdjacency(index.edges);
  const { ancestors, cyclePath } = _walkUpstreamAncestors(incoming, targetNodeId);
  const { invalidatedBy, mismatchedRevisions } = _collectBoundaryIssues(index, [targetNodeId, ...ancestors], currentRevisions);

  if (cyclePath) {
    return {
      status: 'STALE_INVALIDATED',
      canGrantAcceptance: false,
      isStale: true,
      cyclicEvidenceRejected: true,
      cyclePath,
      invalidatedBy,
      reason: 'CYCLIC_EVIDENCE_DETECTED'
    };
  }
  if (invalidatedBy.length > 0 || mismatchedRevisions.length > 0) {
    return {
      status: 'STALE_INVALIDATED',
      canGrantAcceptance: false,
      isStale: true,
      invalidatedBy,
      mismatchedRevisions,
      reason: mismatchedRevisions.length > 0 ? 'REVISION_DRIFT_DETECTED' : 'DEPENDENCY_INVALIDATED'
    };
  }
  return {
    status: 'VALID',
    canGrantAcceptance: true,
    isStale: false,
    invalidatedBy: [],
    reason: 'ALL_DEPENDENCIES_CURRENT'
  };
}

function _resolveTargetNodeIdForOutcome(target, outcomeSpec) {
  if (outcomeSpec.affectedNodeId || outcomeSpec.nodeId) {
    return String(outcomeSpec.affectedNodeId || outcomeSpec.nodeId).trim();
  }
  if (outcomeSpec.queueId) {
    const match = target.reevaluationQueue.find(q => q.queueId === outcomeSpec.queueId);
    return match ? match.affectedNodeId : null;
  }
  return null;
}

function _findLatestReevaluationByTrigger(target, affectedNodeId) {
  const latest = new Map();
  for (const item of target.reevaluationQueue) {
    if (item.affectedNodeId === affectedNodeId) latest.set(item.triggerNodeId, item);
  }
  return latest;
}

function _checkQueuedOutcome(target, affectedNodeId, queueId) {
  const latest = _findLatestReevaluationByTrigger(target, affectedNodeId);
  const item = [...latest.values()].find(entry => entry.queueId === queueId);
  if (!item || item.status !== 'PENDING_REEVALUATION') return 'REEVALUATION_QUEUE_ITEM_NOT_CURRENT';
  if (target.nodes[item.triggerNodeId]?.revision !== item.newRevision) return 'REEVALUATION_REVISION_CHANGED';
  return null;
}

function _canRestoreRevisionTrigger(index, triggerNodeId) {
  const triggerNode = index.nodes[triggerNodeId];
  if (!triggerNode || triggerNode.status !== 'STALE_INVALIDATED') return false;
  const incoming = _buildIncomingAdjacency(index.edges);
  const { ancestors, cyclePath } = _walkUpstreamAncestors(incoming, triggerNodeId);
  if (cyclePath) return false;
  return ancestors.every(id => index.nodes[id]?.status === 'VALID');
}

function _updateQueueEntriesForOutcome(target, outcomeSpec, affectedNodeId, nextStatus, nowIso) {
  const isValidOutcome = nextStatus === 'VALID';
  const resolvedQueueIds = [];
  const triggerIds = new Set();

  for (const item of target.reevaluationQueue) {
    const matchesQueue = outcomeSpec.queueId
      ? item.queueId === outcomeSpec.queueId
      : item.affectedNodeId === affectedNodeId;
    if (!matchesQueue || item.status !== 'PENDING_REEVALUATION') continue;
    item.status = isValidOutcome ? 'COMPLETED' : 'FAILED_REEVALUATION';
    item.outcome = nextStatus;
    item.resolvedAt = nowIso;
    if (outcomeSpec.reason) item.resolutionReason = String(outcomeSpec.reason);
    resolvedQueueIds.push(item.queueId);
    if (item.triggerNodeId) triggerIds.add(item.triggerNodeId);
  }
  return { resolvedQueueIds, triggerIds };
}

function _restoreEligibleTriggers(target, triggerIds, nowIso) {
  for (const tid of triggerIds) {
    if (_canRestoreRevisionTrigger(target, tid)) {
      target.nodes[tid].status = 'VALID';
      target.nodes[tid].invalidatedBy = [];
      target.nodes[tid].updatedAt = nowIso;
    }
  }
}

function recordReevaluationOutcome(index, outcomeSpec = {}) {
  const target = _normalizeIndexIfNeeded(index);
  const affectedNodeId = _resolveTargetNodeIdForOutcome(target, outcomeSpec);
  if (!affectedNodeId || !target.nodes[affectedNodeId]) {
    return { updated: false, reason: 'AFFECTED_NODE_NOT_FOUND' };
  }
  if (outcomeSpec.queueId) {
    const reason = _checkQueuedOutcome(target, affectedNodeId, outcomeSpec.queueId);
    if (reason) return { updated: false, reason };
  }

  const nowIso = outcomeSpec.resolvedAt || new Date().toISOString();
  const nextStatus = String(outcomeSpec.status || outcomeSpec.outcome || 'UNKNOWN').toUpperCase();
  const { resolvedQueueIds, triggerIds } = _updateQueueEntriesForOutcome(
    target, outcomeSpec, affectedNodeId, nextStatus, nowIso
  );

  const node = target.nodes[affectedNodeId];
  const latest = _findLatestReevaluationByTrigger(target, affectedNodeId);
  if (outcomeSpec.queueId && nextStatus === 'VALID' && [...latest.values()].some(item => item.status !== 'COMPLETED')) {
    _refreshIndexDigest(target, nowIso);
    return { updated: true, affectedNodeId, status: node.status, resolvedQueueIds, indexRevisionSha256: target.indexRevisionSha256 };
  }
  node.status = nextStatus;
  node.updatedAt = nowIso;
  if (outcomeSpec.newRevision !== undefined) node.revision = outcomeSpec.newRevision;
  if (nextStatus === 'VALID') {
    node.invalidatedBy = [];
    _restoreEligibleTriggers(target, new Set([...triggerIds, ...latest.keys()]), nowIso);
  }
  _refreshIndexDigest(target, nowIso);
  return {
    updated: true,
    affectedNodeId,
    status: node.status,
    resolvedQueueIds,
    indexRevisionSha256: target.indexRevisionSha256
  };
}

module.exports = {
  SCHEMA_VERSION,
  NODE_KINDS,
  DEFAULT_DEPENDENCY_INDEX_PATH,
  createDependencyIndex,
  loadDependencyIndex,
  saveDependencyIndexAtomic,
  registerDependencyNode,
  addDependencyEdge,
  detectDependencyCycle,
  invalidateBySourceChange,
  invalidateByRequirementChange,
  invalidateByRetractedRule,
  evaluateInvalidationBoundary,
  recordReevaluationOutcome
};
