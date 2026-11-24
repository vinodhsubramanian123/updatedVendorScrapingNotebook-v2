'use strict';
/**
 * scripts/lib/boq/pipeline/eval_boq_recompute.js — Post-RAG Strategy Matrix Recomputation
 */

const fs = require('fs');
const path = require('path');
const { evaluateBOQMultiAspect } = require('../boq_evaluator.js');
const { applyConfigurationContext } = require('../configuration_context.js');
const { synthesize5TierRankedSolutions } = require('../../conflict/conflict_graph.js');
const { optimizeForBudget } = require('../budget_optimizer.js');
const { extractAndPersistLearnedDeltas } = require('../../notebook/knowledge_extractor.js');

function _resolveRecomputeContext(baseData, chassisDirOverride) {
  const items = baseData.items || baseData.evalResults?.items || [];
  const targetDir = chassisDirOverride || baseData.chassisDir || baseData.evalResults?.targetDir || '';
  const chassisPrefix = path.basename(targetDir || '');
  const catalogPath = path.join(targetDir, `${chassisPrefix}_Catalog.json`);
  let catalogData = baseData.catalogData || null;
  if (!catalogData && fs.existsSync(catalogPath)) {
    try { catalogData = JSON.parse(fs.readFileSync(catalogPath, 'utf-8')); } catch {}
  }
  return { items, targetDir, chassisPrefix, catalogData };
}

function _extractRagDeltasForRecompute(ragResult, targetDir, catalogData, chassisPrefix) {
  if (!ragResult.isCloudGrounded || !(ragResult.citations || []).length) return 0;
  try {
    const learned = extractAndPersistLearnedDeltas(ragResult.answer || '', targetDir, {
      chassis: catalogData?.metadata?.chassis || chassisPrefix,
      source: ragResult.source,
      groundingVerification: ragResult.groundingVerification,
      citations: ragResult.citations || [],
      catalogData
    });
    return learned.count || 0;
  } catch {
    return 0;
  }
}

function _resolveRecomputeScopeFields(baseData, configContext) {
  const prevEval = baseData.evalResults || {};
  const serverCount = baseData.serverCount || configContext?.multiplier || prevEval.serverCount || 1;
  const effectivePolicy = baseData.effectivePolicy || prevEval.effectivePolicy || null;
  return {
    serverCount,
    nodeCount: baseData.nodeCount || prevEval.nodeCount || serverCount,
    quantityBasis: baseData.quantityBasis || prevEval.quantityBasis || (serverCount > 1 ? 'CLUSTER_MULTIPLIED' : 'SINGLE_NODE'),
    parentRunId: baseData.parentRunId || prevEval.parentRunId || null,
    candidateDigest: baseData.candidateDigest || prevEval.candidateDigest || null,
    candidateReference: baseData.candidateReference || prevEval.candidateReference || null,
    effectivePolicy,
    offlineMode: baseData.offlineMode ?? effectivePolicy?.offline ?? prevEval.offlineMode ?? false
  };
}

/**
 * Recompute Strategy Matrix with Grounded Cloud RAG findings.
 * Takes baseData (or raw eval results), the resolved RAG answer / citations,
 * extracts any newly learned deltas, re-runs aspect math, and re-synthesizes the 5-Tier Strategy Matrix.
 * @param {object} baseData
 * @param {object} ragResult
 * @param {string} [chassisDirOverride]
 * @returns {object} Updated data object with verified matrix
 */
function recomputeStrategyMatrixWithRag(baseData, ragResult, chassisDirOverride = '') {
  if (!baseData || !ragResult) return baseData;
  const { items, targetDir, chassisPrefix, catalogData } = _resolveRecomputeContext(baseData, chassisDirOverride);
  const learnedCount = _extractRagDeltasForRecompute(ragResult, targetDir, catalogData, chassisPrefix);
  const configContext = baseData.configurationContext || baseData.evalResults?.configurationContext || null;

  const hasUnambiguousScope = configContext && configContext.ownershipEvidence !== 'AMBIGUOUS_OWNERSHIP_RAW';
  const perNodeItems = hasUnambiguousScope ? items.filter(it => it.quantityScope !== 'global') : items;
  const availabilityGlobalItems = hasUnambiguousScope ? items.filter(it => it.quantityScope === 'global') : [];
  const rawReEval = evaluateBOQMultiAspect(perNodeItems, { filePath: baseData.inputFile, catalogData, targetDir, availabilityGlobalItems });

  const updatedGraph = rawReEval.conflictGraph || {};
  const combinedGraph = {
    ...baseData.conflictGraph,
    ...updatedGraph,
    rankedSolutions: synthesize5TierRankedSolutions(
      perNodeItems, rawReEval, updatedGraph, updatedGraph.chassisInfo || { model: chassisPrefix }, targetDir, { availabilityGlobalItems }
    )
  };
  const reEval = hasUnambiguousScope
    ? applyConfigurationContext({ ...rawReEval, conflictGraph: combinedGraph }, configContext)
    : { ...rawReEval, conflictGraph: combinedGraph };

  const budgetOpt = optimizeForBudget(perNodeItems, reEval, baseData.targetBudgetUsd || 0, catalogData);
  const cloudStatus = ragResult.isCloudGrounded ? 'CLOUD_VERIFIED' : 'LOCAL_FALLBACK';
  const scopeFields = _resolveRecomputeScopeFields(baseData, configContext);

  return {
    ...baseData,
    ...scopeFields,
    configurationContext: reEval.configurationContext || configContext,
    isProvisional: true,
    matrixStatus: 'CANDIDATE_REVIEW_REQUIRED',
    cloudGroundingStatus: cloudStatus,
    ragAnswer: ragResult.answer || baseData.ragAnswer,
    ragResult,
    notebookLmStatus: {
      status: cloudStatus,
      source: ragResult.source,
      sourcesUsed: ragResult.sourcesUsed || [],
      citationsCount: (ragResult.citations || []).length,
      isCloudGrounded: Boolean(ragResult.isCloudGrounded),
      learnedDeltasCount: learnedCount
    },
    evalResults: {
      ...baseData.evalResults,
      ...reEval,
      ...scopeFields,
      configurationContext: reEval.configurationContext || configContext,
      isProvisional: true,
      matrixStatus: 'CANDIDATE_REVIEW_REQUIRED',
      cloudGroundingStatus: cloudStatus,
      ragAnswer: ragResult.answer,
      ragResult
    },
    conflictGraph: reEval.conflictGraph || combinedGraph,
    budgetOptimization: budgetOpt
  };
}

module.exports = {
  recomputeStrategyMatrixWithRag
};
