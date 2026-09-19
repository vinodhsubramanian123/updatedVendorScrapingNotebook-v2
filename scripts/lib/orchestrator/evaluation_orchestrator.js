'use strict';

/**
 * Programmatic adapter to the production evaluation pipeline. This module must
 * not implement a second set of grounding, quantity, or delivery semantics.
 * Unsupported vendor catalogs are rejected by the production catalog gate.
 */
async function runCanonicalEvaluation(request = {}, options = {}) {
  const startTime = Date.now();
  const { runEvaluationPipeline } = require('../../evaluators/eval_boq.js');
  const result = await runEvaluationPipeline({
    ...request,
    ...options,
    inputFile: request.filePath || request.inputFile || request.boqFile || options.inputFile,
    inputItems: request.items,
    rawText: request.text ?? request.rawText,
    chassisDir: request.chassisDir || options.chassisDir || request.chassis || request.model,
    JSON_MODE: options.JSON_MODE ?? options.jsonMode ?? true,
    OFFLINE_MODE: options.OFFLINE_MODE ?? options.offlineMode ?? false,
    DEFER_RAG: options.DEFER_RAG ?? options.deferRag ?? false,
    SYNC_RAG: options.SYNC_RAG ?? options.syncRag ?? false,
    UPLOAD_DRIVE: options.UPLOAD_DRIVE ?? options.uploadDrive ?? false,
    explicitOutputPath: options.explicitOutputPath || options.outputPath || (options.outputDir ? require('path').join(options.outputDir, `Evaluation_${require('crypto').randomUUID()}.md`) : undefined),
    targetSheetName: options.targetSheetName || request.sheetName,
    targetBudgetUsd: options.targetBudgetUsd ?? request.targetBudgetUsd ?? 0
  });
  return {
    ...result,
    totalDurationMs: Date.now() - startTime,
    itemCount: Array.isArray(request.items) ? request.items.length : (Array.isArray(result.items) ? result.items.length : undefined),
    success: result.evidenceHealth?.workflowStatus === 'COMPLETE' && !result.deliveryError,
    physicalEval: result,
    strategyMatrix: result.conflictGraph?.rankedSolutions || [],
    evidenceLedger: {
      jsonPath: result.evidenceLogPath,
      mdPath: result.evidenceSummaryPath,
      health: result.evidenceHealth
    },
    lifecycleHealth: result.evidenceHealth,
    portalValidationStatus: 'PORTAL VALIDATION PENDING'
  };
}

module.exports = { runCanonicalEvaluation };
