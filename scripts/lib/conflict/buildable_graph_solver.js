'use strict';
/**
 * scripts/lib/conflict/buildable_graph_solver.js
 *
 * Typed SKU/Category Hypergraph & Bounded CSP Constraint Closure Solver.
 * Builds a typed dependency & resource graph (REQUIRES, EXCLUDES, CONSUMES_SLOT,
 * CONSUMES_POWER, SATISFIES_ROLE, QUANTITY_BOUND), detects N-node cycles and
 * contradictions, and performs bounded rollback-safe fixpoint closure via repair_transactions.
 */

const crypto = require('crypto');
const { cleanBaseSKU, buildCatalogSkuIndex, classifyLifecycleState } = require('../catalog/sku.js');
const { evaluateAllCatalogRules } = require('./catalog_rule_evaluator.js');

const EDGE_TYPES = Object.freeze({
  REQUIRES: 'REQUIRES',
  EXCLUDES: 'EXCLUDES',
  CONSUMES_SLOT: 'CONSUMES_SLOT',
  CONSUMES_POWER: 'CONSUMES_POWER',
  SATISFIES_ROLE: 'SATISFIES_ROLE',
  QUANTITY_BOUND: 'QUANTITY_BOUND'
});

function _hashPartsManifest(chassisModel, items = []) {
  const normalized = (items || []).map(it => ({
    sku: cleanBaseSKU(it?.sku || it?.['Product #'] || ''),
    quantity: Number(it?.quantity ?? it?.qty ?? 1) || 1
  }));
  normalized.sort((a, b) => a.sku.localeCompare(b.sku) || a.quantity - b.quantity);
  return crypto.createHash('sha256').update(JSON.stringify({ chassis: chassisModel || null, items: normalized })).digest('hex');
}

function _applyCandidateDeltas(parts, deltas) {
  const next = (parts || []).map(p => ({ ...p }));
  for (const delta of deltas) {
    if (delta.action !== 'ADD' || !delta.sku) continue;
    next.push({
      sku: delta.sku,
      description: delta.description,
      quantity: delta.quantity,
      isFixInjected: true
    });
  }
  return next;
}

function _addNode(nodes, id, type, meta = {}) {
  if (!nodes.has(id)) nodes.set(id, { id, type, ...meta });
}

function _ingestItemHypergraphNodes(items, skuIndex, nodes, edges) {
  for (const it of (items || [])) {
    const sku = cleanBaseSKU(it?.sku || it?.['Product #']);
    if (!sku) continue;
    const cat = skuIndex.get(sku);
    const desc = String(it?.description || cat?.skuData?.Description || '').toLowerCase();
    const skuNode = `SKU:${sku}`;
    const qty = Number(it.quantity ?? it.qty ?? 1) || 1;
    _addNode(nodes, skuNode, 'SKU', { sku, quantity: qty });

    const roleName = it.category || cat?.parentCategory;
    if (roleName) {
      const roleNode = `ROLE:${roleName}`;
      _addNode(nodes, roleNode, 'ROLE');
      edges.push({ type: EDGE_TYPES.SATISFIES_ROLE, from: skuNode, to: roleNode });
    }
    if (desc.includes('ocp')) {
      _addNode(nodes, 'POOL:OCP_SLOTS', 'RESOURCE_POOL');
      edges.push({ type: EDGE_TYPES.CONSUMES_SLOT, from: skuNode, to: 'POOL:OCP_SLOTS' });
    } else if (/pcie|gpu|hba|adapter|controller/i.test(desc) && !desc.includes('cable')) {
      _addNode(nodes, 'POOL:PCIE_SLOTS', 'RESOURCE_POOL');
      edges.push({ type: EDGE_TYPES.CONSUMES_SLOT, from: skuNode, to: 'POOL:PCIE_SLOTS' });
    }
    if (/\b(?:gpu|processor|xeon|epyc|drive|ssd|hdd)\b/i.test(desc)) {
      _addNode(nodes, 'POOL:POWER_WATTS', 'RESOURCE_POOL');
      edges.push({ type: EDGE_TYPES.CONSUMES_POWER, from: skuNode, to: 'POOL:POWER_WATTS' });
    }
  }
}

function _ingestRuleAndDependencyEdges(aspectResult, ruleEvalResult, nodes, edges) {
  for (const dep of (aspectResult?.missingDependencies || [])) {
    if (!dep?.sku) continue;
    const targetNode = `SKU:${cleanBaseSKU(dep.sku)}`;
    _addNode(nodes, targetNode, 'REQUIRED_SKU', { sku: cleanBaseSKU(dep.sku), rule: dep.rule || dep.key });
    const sourceNode = dep.sourceSku ? `SKU:${cleanBaseSKU(dep.sourceSku)}` : 'SOLUTION:ROOT';
    _addNode(nodes, sourceNode, 'ROOT');
    edges.push({ type: EDGE_TYPES.REQUIRES, from: sourceNode, to: targetNode, rule: dep.rule || dep.key });
  }
  for (const r of (ruleEvalResult?.missingRequirements || [])) {
    const from = `SKU:${cleanBaseSKU(r.sourceSku)}`;
    const to = `SKU:${cleanBaseSKU(r.requiredSku)}`;
    _addNode(nodes, from, 'SKU', { sku: cleanBaseSKU(r.sourceSku) });
    _addNode(nodes, to, 'REQUIRED_SKU', { sku: cleanBaseSKU(r.requiredSku) });
    edges.push({ type: EDGE_TYPES.REQUIRES, from, to, rule: 'CATALOG_RULE_REQUIRES' });
  }
  for (const v of (ruleEvalResult?.violations || [])) {
    if (v.ruleType === 'MUTUAL_EXCLUSION' && Array.isArray(v.skus) && v.skus.length >= 2) {
      const a = `SKU:${cleanBaseSKU(v.skus[0])}`;
      const b = `SKU:${cleanBaseSKU(v.skus[1])}`;
      _addNode(nodes, a, 'SKU', { sku: cleanBaseSKU(v.skus[0]) });
      _addNode(nodes, b, 'SKU', { sku: cleanBaseSKU(v.skus[1]) });
      edges.push({ type: EDGE_TYPES.EXCLUDES, from: a, to: b, message: v.message });
    }
  }
  for (const customEdge of (aspectResult?.dependencyEdges || [])) {
    if (!customEdge?.from || !customEdge?.to) continue;
    _addNode(nodes, customEdge.from, 'SKU');
    _addNode(nodes, customEdge.to, 'SKU');
    edges.push({ type: customEdge.type || EDGE_TYPES.REQUIRES, from: customEdge.from, to: customEdge.to });
  }
}

function buildConfigurationHypergraph(items = [], aspectResult = null, ruleEvalResult = null, catalogData = null) {
  const nodes = new Map();
  const edges = [];
  const skuIndex = catalogData ? buildCatalogSkuIndex(catalogData) : new Map();
  _ingestItemHypergraphNodes(items, skuIndex, nodes, edges);
  _ingestRuleAndDependencyEdges(aspectResult, ruleEvalResult, nodes, edges);
  return { nodes: Array.from(nodes.values()), edges };
}

function detectHypergraphCycles(graph) {
  const reqAdj = new Map();
  const excludedPairs = new Set();
  for (const edge of (graph?.edges || [])) {
    if (edge.type === EDGE_TYPES.REQUIRES) {
      if (!reqAdj.has(edge.from)) reqAdj.set(edge.from, []);
      reqAdj.get(edge.from).push(edge.to);
    } else if (edge.type === EDGE_TYPES.EXCLUDES) {
      excludedPairs.add(`${edge.from}|${edge.to}`);
      excludedPairs.add(`${edge.to}|${edge.from}`);
    }
  }

  const cycles = [];
  const state = new Map();
  const stack = [];
  function dfs(node) {
    state.set(node, 1);
    stack.push(node);
    for (const next of (reqAdj.get(node) || [])) {
      const st = state.get(next) || 0;
      if (st === 1) {
        const idx = stack.indexOf(next);
        cycles.push([...stack.slice(idx), next]);
      } else if (st === 0) {
        dfs(next);
      }
    }
    stack.pop();
    state.set(node, 2);
  }
  for (const n of reqAdj.keys()) {
    if ((state.get(n) || 0) === 0) dfs(n);
  }

  const contradictions = [];
  for (const [from, tos] of reqAdj.entries()) {
    for (const to of tos) {
      if (excludedPairs.has(`${from}|${to}`)) {
        contradictions.push({ from, to, reason: `Requirement cycle/contradiction: ${from} requires ${to} while also excluding it.` });
      }
    }
  }
  return { hasCycles: cycles.length > 0, cycles, contradictions };
}

function _collectLifecycleBlockers(parts, catalogData) {
  const skuIndex = catalogData ? buildCatalogSkuIndex(catalogData) : new Map();
  const blockers = [];
  for (const p of (parts || [])) {
    const clean = cleanBaseSKU(p?.sku);
    const cat = skuIndex.get(clean);
    const lc = classifyLifecycleState(
      p.lifecycleStatus || cat?.lifecycleStatus || '',
      p.diffStatus || cat?.diffStatus || '',
      clean,
      p.description || cat?.skuData?.Description || '',
      p.vendorSupplyStatus || ''
    );
    if (lc.isBlockedForProduction) {
      blockers.push({ sku: clean, status: lc.canonicalStatus, reason: `SKU ${clean} is ${lc.canonicalStatus} (non-buildable lifecycle state).` });
    }
  }
  return blockers;
}

function _buildCandidateDeltaList(aspectResult, ruleResult, currentParts) {
  const existing = new Set((currentParts || []).map(p => cleanBaseSKU(p.sku)).filter(Boolean));
  const deltas = [];
  for (const dep of (aspectResult?.missingDependencies || [])) {
    if (!dep?.sku || dep.pruneCandidate) continue;
    const sku = cleanBaseSKU(dep.sku);
    if (!sku || existing.has(sku)) continue;
    deltas.push({
      action: 'ADD',
      sku,
      description: dep.description || dep.rule || sku,
      quantity: Math.max(1, Number(dep.quantity || 1)),
      reason: dep.reasoning || dep.rule || 'Buildability dependency closure',
      isFixInjected: true
    });
    existing.add(sku);
  }
  for (const req of (ruleResult?.missingRequirements || [])) {
    const sku = cleanBaseSKU(req.requiredSku);
    if (!sku || existing.has(sku)) continue;
    deltas.push({
      action: 'ADD',
      sku,
      description: `Catalog required dependency (${sku})`,
      quantity: 1,
      reason: req.message,
      isFixInjected: true
    });
    existing.add(sku);
  }
  return deltas;
}

function _buildCycleFailureResult(workingParts, chassisModel, cycleCheck, repairsApplied, lastAspect, lastRules, catalogData) {
  return {
    status: cycleCheck.hasCycles ? 'CYCLE_DETECTED' : 'INFEASIBLE',
    isBuildable: false,
    parts: workingParts,
    manifestSha256: _hashPartsManifest(chassisModel, workingParts),
    cycles: cycleCheck.cycles,
    contradictions: cycleCheck.contradictions,
    repairsApplied,
    remainingErrors: [...(lastAspect?.errors || []), ...lastRules.violations.map(v => v.message)],
    remainingMissingDependencies: lastAspect?.missingDependencies || [],
    lifecycleBlockers: _collectLifecycleBlockers(workingParts, catalogData),
    ruleAuditSummary: { evaluatedRulesCount: lastRules.evaluatedRulesCount, violationsCount: lastRules.violations.length }
  };
}

function _evaluateRepairStep(workingParts, deltas, visitedHashes, context, state) {
  const { chassisInfo, catalogData, validator } = context;
  const baselineErrors = (state.lastAspect?.errors?.length || 0) + state.lastRules.violations.length;
  const nextParts = _applyCandidateDeltas(workingParts, deltas);
  const nextSha = _hashPartsManifest(chassisInfo.model, nextParts);
  if (visitedHashes.has(nextSha)) return { status: 'CYCLE_DETECTED' };

  if (validator && !context.isRevalidationPass) {
    const nextAspect = validator(nextParts, catalogData, context.targetDir || '', { skipGraphValidation: true, skipLifecycle: true });
    const nextRules = evaluateAllCatalogRules(nextParts, catalogData, chassisInfo, context.ruleOptions || {});
    if ((nextAspect?.errors?.length || 0) + nextRules.violations.length > baselineErrors) {
      return { status: 'INFEASIBLE' };
    }
    state.lastAspect = nextAspect;
    state.lastRules = nextRules;
  }
  visitedHashes.add(nextSha);
  return { status: 'CONTINUE', nextParts };
}

function solveBuildableConfiguration(items = [], context = {}) {
  const catalogData = context.catalogData || null;
  const chassisInfo = context.chassisInfo || {};
  const validator = typeof context.validateFn === 'function' ? context.validateFn : null;
  const maxIterations = Math.max(1, Math.min(10, Number(context.maxIterations || 5)));
  const maxElapsedMs = Number(context.maxElapsedMs || 3000);
  const startMs = Date.now();

  let workingParts = (items || []).map(p => ({ ...p }));
  const visitedHashes = new Set([_hashPartsManifest(chassisInfo.model, workingParts)]);
  const repairsApplied = [];
  let status = 'BUILDABLE';
  const state = {
    lastAspect: context.initialAspectResult || null,
    lastRules: evaluateAllCatalogRules(workingParts, catalogData, chassisInfo, context.ruleOptions || {})
  };

  for (let iter = 0; iter < maxIterations; iter++) {
    if ((Date.now() - startMs) > maxElapsedMs) {
      status = 'BOUND_EXCEEDED';
      break;
    }
    if (validator && !context.isRevalidationPass) {
      state.lastAspect = validator(workingParts, catalogData, context.targetDir || '', { skipGraphValidation: true, skipLifecycle: true });
    }
    state.lastRules = evaluateAllCatalogRules(workingParts, catalogData, chassisInfo, context.ruleOptions || {});
    const hypergraph = buildConfigurationHypergraph(workingParts, state.lastAspect, state.lastRules, catalogData);
    if (Array.isArray(context.extraDependencyEdges)) hypergraph.edges.push(...context.extraDependencyEdges);

    const cycleCheck = detectHypergraphCycles(hypergraph);
    if (cycleCheck.hasCycles || cycleCheck.contradictions.length > 0) {
      return _buildCycleFailureResult(workingParts, chassisInfo.model, cycleCheck, repairsApplied, state.lastAspect, state.lastRules, catalogData);
    }

    const deltas = context.skipRepairs ? [] : _buildCandidateDeltaList(state.lastAspect, state.lastRules, workingParts);
    if (deltas.length === 0) break;

    const stepRes = _evaluateRepairStep(workingParts, deltas, visitedHashes, { chassisInfo, catalogData, validator, ...context }, state);
    if (stepRes.status !== 'CONTINUE') {
      status = stepRes.status;
      break;
    }
    workingParts = stepRes.nextParts;
    repairsApplied.push(...deltas);
  }

  const lifecycleBlockers = _collectLifecycleBlockers(workingParts, catalogData);
  const remainingErrors = [
    ...(state.lastAspect?.errors || []),
    ...state.lastRules.violations.map(v => v.message),
    ...lifecycleBlockers.map(b => b.reason)
  ];
  const remainingMissing = state.lastAspect?.missingDependencies || [];
  const isBuildable = status === 'BUILDABLE' && remainingErrors.length === 0 && remainingMissing.length === 0;
  if (!isBuildable && status === 'BUILDABLE') status = 'INFEASIBLE';

  return {
    status,
    isBuildable,
    parts: workingParts,
    manifestSha256: _hashPartsManifest(chassisInfo.model, workingParts),
    cycles: [],
    contradictions: [],
    repairsApplied,
    remainingErrors,
    remainingMissingDependencies: remainingMissing,
    lifecycleBlockers,
    ruleAuditSummary: {
      evaluatedRulesCount: state.lastRules.evaluatedRulesCount,
      applicableRulesCount: state.lastRules.applicableRulesCount,
      violationsCount: state.lastRules.violations.length,
      conditionalGatesCount: state.lastRules.conditionalGates.length
    }
  };
}

module.exports = {
  EDGE_TYPES,
  buildConfigurationHypergraph,
  detectHypergraphCycles,
  solveBuildableConfiguration
};
