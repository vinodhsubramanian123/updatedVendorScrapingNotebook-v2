'use strict';
/**
 * scripts/lib/router/specialty_track_handlers.js
 * Handlers for WORKLOAD_DNA, VALUE_ENGINEERING, LEAST_DELTA_SYNTHESIS, ADVERSARIAL_VALIDATION,
 * CONTINUOUS_LEARNING, KNOWLEDGE_SYNC, WORKBOOK_GENERATION, REMARKS_RECONCILIATION,
 * MULTI_CLUSTER_TENDER, and SOLUTION_COMPARISON.
 */

const fs = require('fs');
const path = require('path');
const { evaluateBOQMultiAspect } = require('../boq/boq_evaluator.js');
const logger = require('../system/pipeline_logger.js');
const {
  getChassisMap,
  getChassisCatalog,
  _resolveContextPolicy,
  readRoutedItems,
  requireScopedCatalog,
  evaluateWorkloadBranch
} = require('./platform_catalog_resolver.js');

async function _handleWorkloadDna(queryText, context) {
  const { extractWorkloadDna } = require('../conflict/workload_dna.js');
  const { arbitrateContestedResources } = require('../conflict/resource_arbitrator.js');
  if (!context.items && !context.filePath) {
    const dnaProfile = extractWorkloadDna([{ description: queryText }]);
    return {
      intent: 'WORKLOAD_DNA',
      status: 'SCOPED_SIZING_REQUIRED',
      requestedWorkload: queryText,
      dnaProfile,
      recommendedSizingConstraints: {
        memoryChannelMode: 'BALANCED_1DPC_OR_2DPC',
        minFlashEndurance: /hana|redis|kafka|cassandra|sql|oltp/i.test(queryText) ? 'MU_OR_WI' : 'RI'
      },
      message: 'Preserve the requested workload and size an exact product candidate before hardware profiling.'
    };
  }
  const items = readRoutedItems(context);
  const dna = extractWorkloadDna(items);
  const chassisInfo = getChassisCatalog(queryText, context);
  const arbitration = arbitrateContestedResources(items, chassisInfo.chassisKey);

  const evaluatedBranches = arbitration.branches.map(branch => evaluateWorkloadBranch(branch, items, chassisInfo));
  const evaluatedCount = evaluatedBranches.filter(branch => branch.evaluationStatus === 'EVALUATED').length;

  return {
    intent: 'WORKLOAD_DNA',
    status: arbitration.hasContentions ? 'CONTENTION_ARBITRATED' : 'ADVISORY',
    requestedWorkload: queryText,
    chassis: chassisInfo.chassisKey,
    dna,
    items,
    arbitrationAvailable: true,
    hasContentions: arbitration.hasContentions,
    contentionsCount: arbitration.contentionsCount,
    contentions: arbitration.contentions,
    selfCorrectionTrail: arbitration.selfCorrectionTrail || [],
    arbitrationBranches: evaluatedBranches,
    message: arbitration.hasContentions
      ? `Workload DNA analyzed (${dna.primaryWorkload}). Detected ${arbitration.contentionsCount} physical resource contention(s). Evaluated ${evaluatedCount} of ${arbitration.branchesCount} proposed branches.`
      : `Workload DNA analyzed (${dna.primaryWorkload}). Zero resource collisions detected across solution slots.`
  };
}

async function _handleValueEngineering(queryText, context) {
  const scope = requireScopedCatalog(queryText, context);
  const items = readRoutedItems(context);
  const budgetMatch = queryText.match(/(?:\$|USD\s*|budget\s*(?:of|:|=)?\s*)([\d,]+(?:\.\d+)?)/i)
    || queryText.match(/([\d,]+(?:\.\d+)?)\s*(?:USD|dollars?)\b/i);
  const budget = context.budget ?? (budgetMatch ? Number(budgetMatch[1].replace(/,/g, '')) : 0);
  if (!Number.isFinite(Number(budget)) || Number(budget) < 0) throw new Error('Budget must be a nonnegative USD amount.');
  const evaluation = evaluateBOQMultiAspect(items, { catalogData: scope.catalogData, targetDir: scope.catalogDir });
  if (evaluation.isMathClean !== true || evaluation.isGraphClean !== true) {
    return {
      intent: 'VALUE_ENGINEERING', status: 'BASELINE_VALIDATION_REQUIRED', evaluation,
      message: 'Resolve physical and dependency gaps before optimization.'
    };
  }
  const result = require('../boq/budget_optimizer.js').optimizeForBudget(items, evaluation, Number(budget), scope.catalogData, scope.catalogDir);
  return {
    intent: 'VALUE_ENGINEERING', status: 'ADVISORY', chassis: scope.chassisKey,
    budgetOptimization: result, targetBudgetUsd: Number(budget),
    goldenRuleCompliant: result.hasBudgetConstraint && result.budgetAssessmentComplete === true && result.isBudgetExceeded === false && !result.hasZeroPriceSkus,
    message: result.goldenRuleSummary
  };
}

async function _handleLeastDeltaSynthesis(queryText, context) {
  const scope = requireScopedCatalog(queryText, context);
  const items = readRoutedItems(context);
  const evaluation = evaluateBOQMultiAspect(items, { catalogData: scope.catalogData, targetDir: scope.catalogDir });
  const candidates = evaluation.conflictGraph?.rankedSolutions || [];
  const candidate = candidates.find(rank => /1L/i.test(String(rank.rank)) || /least.delta/i.test(rank.name || '')) || null;
  return {
    intent: 'LEAST_DELTA_SYNTHESIS', chassis: scope.chassisKey,
    status: candidate ? 'CANDIDATE_REVIEW_REQUIRED' : 'NO_LEAST_DELTA_CANDIDATE',
    leastDeltaCandidate: candidate, evaluation, portalValidationStatus: 'PORTAL VALIDATION PENDING',
    message: 'Returned the canonical conflict-graph result; no separate unpriced candidate was fabricated.'
  };
}

async function _handleAdversarialValidation(queryText, context, adversarialOps) {
  const { generateAdversarialBOQ, scrutinizeCandidateBOM } = adversarialOps;
  const chassisInfo = getChassisCatalog(queryText, context);
  const targetChassis = context.chassisName || chassisInfo.chassisKey;

  if (context.items || context.filePath) {
    const candidateItems = readRoutedItems(context);
    const scrutinyResult = scrutinizeCandidateBOM(candidateItems, {
      chassis: targetChassis,
      targetDir: chassisInfo.catalogDir || '',
      catalogData: chassisInfo.catalogData
    });
    return {
      intent: 'ADVERSARIAL_VALIDATION',
      skillTarget: 'adversarial-validation-skill',
      mode: 'CANDIDATE_SCRUTINY',
      isSyntheticTest: false,
      chassis: targetChassis,
      generatedBoq: candidateItems,
      candidateBoq: candidateItems,
      evaluation: {
        isCaught: scrutinyResult.totalIssuesCaught > 0,
        totalIssuesCaught: scrutinyResult.totalIssuesCaught,
        errors: scrutinyResult.errors,
        missingDependencies: scrutinyResult.missingDependencies.map(m => m.reason || m.sku || m.key)
      },
      scrutiny: scrutinyResult,
      status: scrutinyResult.status,
      message: scrutinyResult.message
    };
  }

  const fakeBoq = await generateAdversarialBOQ(targetChassis);
  const evalResult = evaluateBOQMultiAspect(fakeBoq, {
    chassis: targetChassis,
    targetDir: chassisInfo.catalogDir || '',
    catalogData: chassisInfo.catalogData
  });

  const errors = evalResult.errors || [];
  const missing = evalResult.missingDependencies || [];
  const totalIssuesCaught = errors.length + missing.length;

  return {
    intent: 'ADVERSARIAL_VALIDATION',
    skillTarget: 'adversarial-validation-skill',
    mode: 'SYNTHETIC_CHAOS',
    isSyntheticTest: true,
    customerDisposition: 'NOT_FOR_CUSTOMER_DELIVERY',
    syntheticPassNeverCertifiesCandidate: true,
    chassis: targetChassis,
    generatedBoq: fakeBoq,
    evaluation: {
      isCaught: totalIssuesCaught > 0,
      totalIssuesCaught,
      errors,
      missingDependencies: missing.map(m => m.reason || m.sku || m.key)
    },
    status: totalIssuesCaught > 0 ? 'SYNTHETIC_STRESS_PASSED' : 'SYNTHETIC_STRESS_ANOMALY_MISSED',
    message: totalIssuesCaught > 0
      ? `Adversarial stress-testing successful: physical constraint checkers caught ${totalIssuesCaught} anomaly(ies) in synthetic test (never certifies customer deliverables).`
      : 'Adversarial advisory: Evaluator did not flag violations on the generated synthetic test configuration.'
  };
}

async function _handleContinuousLearning(queryText, context) {
  const { processPortalFeedback } = require('../feedback/feedback_loop.js');
  const chassisInfo = getChassisCatalog(queryText, context);
  const targetChassis = context.chassisName || chassisInfo.chassisKey;

  let feedbackResult = null;
  if (context.feedbackMessage || context.errorMessage) {
    feedbackResult = processPortalFeedback(context.feedbackMessage || context.errorMessage, requireScopedCatalog(queryText, context).catalogDir, {
      source: 'USER_SUPPLIED_PORTAL_FEEDBACK', citations: context.citations || []
    });
  }

  return {
    intent: 'CONTINUOUS_LEARNING',
    skillTarget: 'continuous-learning-skill',
    chassis: targetChassis,
    feedbackProcessed: feedbackResult,
    message: feedbackResult
      ? `Continuous learning feedback processed for ${targetChassis}: ${feedbackResult.message || 'Delta registered'}`
      : `Continuous learning subsystem ready for reflection and quarantine on ${targetChassis}.`
  };
}

async function _handleKnowledgeSync(queryText, context) {
  const scope = requireScopedCatalog(queryText, context);
  const policy = _resolveContextPolicy(context, { defaultOffline: false, includeRagOnly: true });
  const { inspectKnowledgeDrift } = require('../sync/knowledge_sync.js');
  if (/\binspect\b/i.test(queryText) && !/\b(?:sync|synchronize|upload|publish)\b/i.test(queryText)) {
    return {
      intent: 'KNOWLEDGE_SYNC', chassis: scope.chassisKey, status: 'INSPECTED',
      drift: inspectKnowledgeDrift(scope.chassisKey), effectivePolicy: policy, message: 'Read-only drift inspection completed.'
    };
  }
  const result = await require('../sync/post_flow_sync.js').triggerPostFlowSyncAsync(scope.chassisKey, 'ROUTED_QUERY_SYNC', {
    targetDir: scope.catalogDir, autoUploadNLM: !policy.offline && context.autoUploadNLM === true
  });
  return {
    intent: 'KNOWLEDGE_SYNC', chassis: scope.chassisKey,
    status: result.success === false ? 'FAILED' : result.syncStatus || 'UNKNOWN', syncResult: result,
    effectivePolicy: policy,
    message: result.error || 'Synchronization result retained with its actual local/cloud evidence status.'
  };
}

async function _handleWorkbookGeneration(queryText, context, evaluateBoqFn) {
  const scope = requireScopedCatalog(queryText, context);
  const input = { ...context, items: context.items || context.evalResults?.items || context.evalResults?.parsedItems };
  const items = readRoutedItems(input);
  const evaluation = await evaluateBoqFn(queryText, {
    ...context, items, filePath: undefined, chassisDir: scope.catalogDir
  });
  if (evaluation.status === 'ERROR') return { ...evaluation, intent: 'WORKBOOK_GENERATION' };
  const { deliveryFingerprint } = require('../boq/solution_evidence.js');
  const { verifyDeliveryAuthorization } = require('../contracts/workflow_contract.js');
  const authorized = evaluation.acceptanceGate?.isValid === true &&
    verifyDeliveryAuthorization(evaluation.deliveryAuthorization, deliveryFingerprint(evaluation), {
      chassisKey: scope.chassisKey, profile: 'BOQ_EVALUATION'
    });
  const exportPath = evaluation.portalWorkbookPath;
  if (!authorized || evaluation.deliveryError || !exportPath || !fs.existsSync(exportPath)) {
    return {
      intent: 'WORKBOOK_GENERATION', status: 'VALIDATION_REQUIRED', evaluation,
      acceptanceGate: evaluation.acceptanceGate,
      message: evaluation.deliveryError || 'Canonical evaluation did not produce an authorized portal workbook.'
    };
  }
  return {
    intent: 'WORKBOOK_GENERATION', status: 'GENERATED_DRAFT', chassis: scope.chassisKey,
    exportPath, fileName: path.basename(exportPath), evaluation, acceptanceGate: evaluation.acceptanceGate,
    portalValidationStatus: 'PORTAL VALIDATION PENDING',
    schema: '7-column Partner Portal reconciliation workbook',
    message: 'Draft workbook exported from evaluated candidate data.'
  };
}

async function _handleRemarksReconciliation(queryText, context) {
  const { appendCommercialRemarks } = require('../boq/commercial_remarks.js');
  if (!Array.isArray(context.rows) || !context.rows.length) throw new Error('Tender rows are required.');
  const result = appendCommercialRemarks(context.rows, context.remarksByRow || {}, context.headerIndex ?? 0);
  return {
    intent: 'REMARKS_RECONCILIATION', status: 'FORMATTED', rowsCount: result.rows.length,
    outputRows: result.rows, columns: result.columns,
    message: 'Remarks formatted; row parity and allocation evidence remain caller responsibilities.'
  };
}

function _extractClusterPartition(context) {
  if (context.filePath && fs.existsSync(context.filePath)) {
    try {
      const { analyzeAndPartitionClusters, extractRawItemsFromWorkbook } = require('../boq/multi_cluster_splitter.js');
      const rawItems = extractRawItemsFromWorkbook(context.filePath);
      return analyzeAndPartitionClusters(rawItems, path.basename(context.filePath));
    } catch (err) {
      logger.debug('ROUTE_QUERY', `Failed extracting cluster partition from ${context.filePath}: ${err?.message}`);
      return null;
    }
  }
  if (Array.isArray(context.items) && context.items.length > 0) {
    try {
      const { analyzeAndPartitionClusters } = require('../boq/multi_cluster_splitter.js');
      return analyzeAndPartitionClusters(context.items, 'tender_items');
    } catch (err) {
      logger.debug('ROUTE_QUERY', `Failed analyzing cluster partition from context items: ${err?.message}`);
      return null;
    }
  }
  return null;
}

function _evaluatePartitionedClusters(partitionResult, scope) {
  if (!Array.isArray(partitionResult?.clusters) || partitionResult.clusters.length === 0 || !scope?.catalogData) {
    return null;
  }
  return partitionResult.clusters
    .filter(c => Array.isArray(c?.items) && c.items.length > 0)
    .map(c => {
      try {
        const evalRes = evaluateBOQMultiAspect(c.items, {
          chassis: scope.chassisKey,
          catalogData: scope.catalogData,
          targetDir: scope.catalogDir,
          serverCount: c.multiplier || 1
        });
        return { clusterName: c.name || c.clusterId || 'Cluster', serverCount: c.multiplier || 1, evaluation: evalRes };
      } catch (err) {
        return { clusterName: c.name || c.clusterId || 'Cluster', serverCount: c.multiplier || 1, error: err.message };
      }
    });
}

async function _handleMultiClusterTender(queryText, context) {
  const scope = requireScopedCatalog(queryText, context);
  const profile = getChassisMap()[scope.chassisKey];
  const partitionResult = _extractClusterPartition(context);
  const perClusterEvaluations = _evaluatePartitionedClusters(partitionResult, scope);

  const counts = [...queryText.matchAll(/\b(\d+)\s*(?:nodes?|servers?|units?)\b/gi)].map(match => Number(match[1]));
  const count = context.serverCount ?? (partitionResult?.totalChassis || (counts.length === 1 ? counts[0] : null));
  if (!Number.isSafeInteger(count) || count < 1) throw new Error('Supply an explicit serverCount or decompose multiple groups before rack sizing.');
  const rackUnits = context.usableRackUnits;
  const watts = context.nodePowerWatts;
  if (rackUnits != null && (!Number.isFinite(rackUnits) || rackUnits <= 0)) throw new Error('usableRackUnits must be positive.');
  if (watts != null && (!Number.isFinite(watts) || watts <= 0)) throw new Error('nodePowerWatts must be positive.');
  const uHeight = profile?.uHeight;
  const totalRackUnits = Number.isFinite(uHeight) && uHeight > 0 ? count * uHeight : null;
  return {
    intent: 'MULTI_CLUSTER_TENDER',
    status: 'DRAFT_VALIDATION_REQUIRED',
    chassis: scope.chassisKey,
    clusterAnalysis: {
      totalServers: count,
      totalRackUnits,
      rackCount: totalRackUnits != null && rackUnits != null ? Math.ceil(totalRackUnits / rackUnits) : null,
      powerEnvelopeKw: watts != null ? count * watts / 1000 : null,
      discoveredClusters: partitionResult?.clusters || null,
      clusterCount: partitionResult?.clusters?.length || 1,
      perClusterEvaluations,
      quantityConservation: partitionResult?.quantityConservation || null
    },
    message: 'Rack and power estimates use explicit product height and supplied site/power inputs. Blade enclosure and multi-tier relationships require separate sizing.'
  };
}

async function _handleSolutionComparison(queryText, context) {
  const { compareSolutionsAcrossPlatforms } = require('../boq/solution_comparator.js');
  const { coordinateMultiNotebookQueries } = require('../notebook/multi_notebook_coordinator.js');
  const specOrQuery = context.comparisonSpec || queryText;
  const comparison = compareSolutionsAcrossPlatforms(specOrQuery, {
    catalogs: context.availableCatalogs,
    catalogDataById: context.catalogDataById,
    maxPlatforms: context.maxPlatforms,
    includePriceTrends: Boolean(context.includePriceTrends)
  });
  if (context.includeMultiNotebookGrounding === true && Array.isArray(comparison.comparedPlatforms) && comparison.comparedPlatforms.length > 0) {
    comparison.multiNotebookGrounding = await coordinateMultiNotebookQueries(
      comparison.comparedPlatforms.map(productKey => ({
        productKey,
        query: `${queryText || 'Verify configuration and component compatibility rules'} for ${productKey}`
      })),
      { queryOptions: { strictCloud: Boolean(context.strictCloud), offline: _resolveContextPolicy(context, { includeRagOnly: true }).offline } }
    );
  }
  return comparison;
}

async function _handleHardwareEnvelopeAnalytics(queryText, context) {
  const {
    computeFullPlatformEnvelope,
    solveMaxPcieAndOcpTopology,
    solveMaxGpuTopology,
    solveMemoryEnvelope
  } = require('../rules/hardware_envelope_solver.js');
  const { resolveManifestForKey } = require('../rules/product_manifest_loader.js');
  const scope = getChassisCatalog(queryText, { ...context, chassisName: context.platformId || context.chassisName });
  const platformId = scope.chassisKey;
  if (scope.isAmbiguous || !resolveManifestForKey(platformId)) {
    return {
      intent: 'HARDWARE_ENVELOPE_ANALYTICS', status: 'REQUIRES_HUMAN_CLARIFICATION',
      code: 'PLATFORM_CLARIFICATION_REQUIRED', requiresHumanClarification: true,
      missingRequirements: ['Target product and generation'],
      message: scope.error || 'Choose a product with a current capability manifest.'
    };
  }
  const opts = {
    cpuCount: context.cpuCount,
    gpuModel: context.gpuModel,
    gpuWidth: context.gpuWidth,
    categoryKey: context.categoryKey
  };
  const envelope = computeFullPlatformEnvelope(platformId, scope.catalogData || context.catalogData || null, opts);
  return {
    intent: 'HARDWARE_ENVELOPE_ANALYTICS',
    status: 'COMPUTED',
    platformId,
    envelope,
    pcieAndOcp: solveMaxPcieAndOcpTopology(platformId, scope.catalogData || null, opts),
    gpuTopology: solveMaxGpuTopology(platformId, scope.catalogData || null, opts),
    memoryEnvelope: solveMemoryEnvelope(platformId, scope.catalogData || null, opts),
    message: `Computed hardware capability envelope for ${platformId}: max ${envelope.cpu.maxSockets} sockets, ${envelope.pcie.maxElectricallyActiveSlots} active PCIe slots, ${envelope.ocp.maxSlots} OCP 3.0 slots, ${envelope.gpu.maxDoubleWideGpus} DW / ${envelope.gpu.maxSingleWideGpus} SW GPUs.`
  };
}

module.exports = {
  _handleWorkloadDna,
  _handleValueEngineering,
  _handleLeastDeltaSynthesis,
  _handleAdversarialValidation,
  _handleContinuousLearning,
  _handleKnowledgeSync,
  _handleWorkbookGeneration,
  _handleRemarksReconciliation,
  _handleMultiClusterTender,
  _handleSolutionComparison,
  _handleHardwareEnvelopeAnalytics
};
