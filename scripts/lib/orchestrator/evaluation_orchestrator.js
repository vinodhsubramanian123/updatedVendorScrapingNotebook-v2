'use strict';

const path = require('path');
const crypto = require('crypto');

/**
 * Programmatic adapter to the production evaluation pipeline. This module must
 * not implement a second set of grounding, quantity, or delivery semantics.
 * Unsupported vendor catalogs are rejected by the production catalog gate.
 */

function _resolveFlag(val1, val2, defaultVal) {
  if (val1 != null) return Boolean(val1);
  if (val2 != null) return Boolean(val2);
  return defaultVal;
}

function _resolveInputFile(request, options) {
  return request.filePath || request.inputFile || request.boqFile || options.inputFile;
}

function _resolveChassisDir(request, options) {
  return request.chassisDir || options.chassisDir || request.chassis || request.model;
}

function _resolveExplicitOutputPath(options) {
  if (options.explicitOutputPath) return options.explicitOutputPath;
  if (options.outputPath) return options.outputPath;
  if (options.outputDir) {
    return path.join(options.outputDir, `Evaluation_${crypto.randomUUID()}.md`);
  }
  return undefined;
}

function _resolveItemCount(requestItems, resultItems) {
  if (Array.isArray(requestItems)) return requestItems.length;
  if (Array.isArray(resultItems)) return resultItems.length;
  return undefined;
}

function _buildEvaluationPipelineArgs(request, options) {
  const targetBudget = options.targetBudgetUsd != null
    ? options.targetBudgetUsd
    : (request.targetBudgetUsd != null ? request.targetBudgetUsd : 0);

  return {
    ...request,
    ...options,
    inputFile: _resolveInputFile(request, options),
    inputItems: request.items,
    rawText: request.text != null ? request.text : request.rawText,
    chassisDir: _resolveChassisDir(request, options),
    JSON_MODE: _resolveFlag(options.JSON_MODE, options.jsonMode, true),
    OFFLINE_MODE: _resolveFlag(options.OFFLINE_MODE, options.offlineMode, false),
    DEFER_RAG: _resolveFlag(options.DEFER_RAG, options.deferRag, false),
    SYNC_RAG: _resolveFlag(options.SYNC_RAG, options.syncRag, false),
    UPLOAD_DRIVE: _resolveFlag(options.UPLOAD_DRIVE, options.uploadDrive, false),
    explicitOutputPath: _resolveExplicitOutputPath(options),
    targetSheetName: options.targetSheetName || request.sheetName,
    targetBudgetUsd: targetBudget
  };
}

function _buildEvaluationReturnPayload(result, startTime, request) {
  const isComplete = result.evidenceHealth?.workflowStatus === 'COMPLETE';
  const success = Boolean(isComplete && !result.deliveryError);

  return {
    ...result,
    totalDurationMs: Date.now() - startTime,
    itemCount: _resolveItemCount(request.items, result.items),
    success,
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

async function runCanonicalEvaluation(request = {}, options = {}) {
  const startTime = Date.now();
  const { runEvaluationPipeline } = require('../../evaluators/eval_boq.js');
  const pipelineArgs = _buildEvaluationPipelineArgs(request, options);
  const result = await runEvaluationPipeline(pipelineArgs);
  return _buildEvaluationReturnPayload(result, startTime, request);
}

module.exports = { runCanonicalEvaluation };
