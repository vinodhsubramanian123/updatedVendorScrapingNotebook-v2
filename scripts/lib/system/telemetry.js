'use strict';
/**
 * scripts/lib/system/telemetry.js — Pipeline Telemetry & Structured Audit Observability Engine (v2)
 *
 * Enforces epistemic honesty (INV-278): missing confidences, rules, platforms, or stage
 * timings stay null / 'UNSPECIFIED_PLATFORM' instead of fabricating 1.0 or synthetic splits.
 */

const fs = require('fs');
const path = require('path');
const { safeWriteJsonAtomic, withFileLock } = require('./fs_compat.js');
const { getTraceId } = require('./trace_context.js');
const {
  CANONICAL_EXECUTION_PHASES,
  mapStageTimingsToCanonicalPhases
} = require('../contracts/workflow_contract.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const TELEMETRY_FILE = path.join(PROJECT_ROOT, 'outputs', 'history', 'pipeline_telemetry.json');
const _ephemeralTestStores = new Map();

const MAX_TELEMETRY_ENTRIES = {
  history: 100,
  routedQueries: 100,
  learnedDeltas: 50,
  notebookConsultations: 50,
  cleansingAuditLogs: 50,
  ocrAuditLogs: 50,
  exportHistory: 100,
  reconciliationHistory: 100,
  guardrailHistory: 50,
  selfHealingEvents: 50,
  agentExecutions: 100
};

function _createEmptyTelemetryStore() {
  return {
    version: '2.0.0',
    lastUpdated: new Date().toISOString(),
    evaluationsCount: 0,
    totalRoutedQueries: 0,
    totalDeltasLearned: 0,
    totalRulesEvaluated: 0,
    avgConfidenceScore: null,
    evalAccuracyScore: null,
    ragFallbackRatio: null,
    cloudGroundingRatio: null,
    p50DurationMs: null,
    p95DurationMs: null,
    totalExports: 0,
    totalNlmQueries: 0,
    avgNlmResponseTimeMs: null,
    nlmAgreementIndex: null,
    nlmCitationMatchRate: null,
    totalGuardrailRuns: 0,
    avgGuardrailDurationMs: null,
    avgGuardrailTurns: null,
    guardrailSuccessRate: null,
    totalReconciliations: 0,
    totalSelfHealingEvents: 0,
    totalAgentRuns: 0,
    agentTierBreakdown: {},
    avgAgentDurationMs: null,
    providerFallbackCount: 0,
    providerRecoveryCounts: {},
    learningEffectiveness: {
      activeRulesReachedCount: 0,
      appliedRulesCount: 0,
      proposedDeltasCount: 0,
      promotedDeltasCount: 0
    },
    history: [],
    routedQueries: [],
    learnedDeltas: [],
    notebookConsultations: [],
    cleansingAuditLogs: [],
    ocrAuditLogs: [],
    exportHistory: [],
    reconciliationHistory: [],
    guardrailHistory: [],
    selfHealingEvents: [],
    agentExecutions: []
  };
}

function _resolveTargetFile(options = {}) {
  const explicitFile = options.telemetryFile || process.env.ANTIGRAVITY_TELEMETRY_FILE || null;
  return path.resolve(explicitFile || TELEMETRY_FILE);
}

function _isEphemeralTestTelemetryMode(targetFile, options = {}) {
  if (options.telemetryFile || process.env.ANTIGRAVITY_TELEMETRY_FILE) return false;
  if (process.env.SKILL_ISOLATION_ROOT) return false;
  const isTestEnv = process.env.NODE_ENV === 'test' || Boolean(process.env.NODE_TEST_CONTEXT);
  if (!isTestEnv) return false;
  return path.resolve(targetFile) === path.resolve(TELEMETRY_FILE);
}

function _finiteNonNegativeOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function _finiteScoreOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function _computePercentile(sortedValues, pct) {
  if (!Array.isArray(sortedValues) || sortedValues.length === 0) return null;
  const rank = Math.ceil((pct / 100) * sortedValues.length) - 1;
  const idx = Math.min(sortedValues.length - 1, Math.max(0, rank));
  return Math.round(sortedValues[idx]);
}

function pruneTelemetry(data) {
  let pruned = false;
  for (const [key, max] of Object.entries(MAX_TELEMETRY_ENTRIES)) {
    if (Array.isArray(data[key]) && data[key].length > max) {
      data[key] = data[key].slice(0, max);
      pruned = true;
    }
  }
  return pruned;
}

function _normalizeLoadedStore(data) {
  const defaults = _createEmptyTelemetryStore();
  if (!data || typeof data !== 'object' || Array.isArray(data)) return defaults;
  for (const key of Object.keys(MAX_TELEMETRY_ENTRIES)) {
    if (!Array.isArray(data[key])) data[key] = [];
  }
  if (!data.learningEffectiveness || typeof data.learningEffectiveness !== 'object') {
    data.learningEffectiveness = { ...defaults.learningEffectiveness };
  }
  if (!data.agentTierBreakdown || typeof data.agentTierBreakdown !== 'object') data.agentTierBreakdown = {};
  if (!data.providerRecoveryCounts || typeof data.providerRecoveryCounts !== 'object') data.providerRecoveryCounts = {};
  return data;
}

function loadTelemetry(options = {}) {
  const targetFile = _resolveTargetFile(options);
  const ephemeral = _isEphemeralTestTelemetryMode(targetFile, options);

  if (ephemeral && _ephemeralTestStores.has(targetFile)) {
    const cached = structuredClone(_ephemeralTestStores.get(targetFile));
    pruneTelemetry(cached);
    return cached;
  }

  if (fs.existsSync(targetFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(targetFile, 'utf-8'));
      const wasPruned = pruneTelemetry(data);
      if (wasPruned && !ephemeral && options.persist !== false) {
        data.lastUpdated = new Date().toISOString();
        withFileLock(targetFile, () => safeWriteJsonAtomic(targetFile, data));
      }
      return data;
    } catch (err) {
      const _logger = require('./pipeline_logger.js');
      _logger.warn('ERROR', 'telemetry.js', err);
    }
  }
  return _createEmptyTelemetryStore();
}

function _persistTelemetryUpdate(updater, options = {}) {
  const targetFile = _resolveTargetFile(options);
  const ephemeral = _isEphemeralTestTelemetryMode(targetFile, options);
  const skipDiskWrite = ephemeral || options.persist === false;

  const applyUpdate = () => {
    const data = _normalizeLoadedStore(loadTelemetry({ telemetryFile: options.telemetryFile || targetFile, persist: options.persist }));
    const entry = updater(data);
    pruneTelemetry(data);
    data.lastUpdated = new Date().toISOString();
    if (ephemeral && options.persist !== false) {
      _ephemeralTestStores.set(targetFile, structuredClone(data));
    } else if (!skipDiskWrite) {
      const dir = path.dirname(targetFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      safeWriteJsonAtomic(targetFile, data);
    }
    return entry;
  };

  if (skipDiskWrite) return applyUpdate();
  const dir = path.dirname(targetFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return withFileLock(targetFile, applyUpdate);
}

function _extractDomainMap(missingDependencies = []) {
  const domainMap = {
    THERMAL: 0,
    ELECTRICAL: 0,
    STORAGE_CACHE_BATTERY: 0,
    MEMORY_CHANNEL: 0,
    POWER_REDUNDANCY: 0,
    ACCESSORY_CABLE: 0
  };
  for (const dep of missingDependencies || []) {
    const key = (dep?.key || dep?.sku || '').toUpperCase();
    if (key.includes('FAN') || key.includes('HEATSINK') || key.includes('TDP')) domainMap.THERMAL++;
    else if (key.includes('LUG') || key.includes('DC') || key.includes('VOLT')) domainMap.ELECTRICAL++;
    else if (key.includes('BATTERY') || key.includes('CACHE') || key.includes('CONTROLLER')) domainMap.STORAGE_CACHE_BATTERY++;
    else if (key.includes('MEMORY') || key.includes('DIMM')) domainMap.MEMORY_CHANNEL++;
    else if (key.includes('POWER') || key.includes('PSU')) domainMap.POWER_REDUNDANCY++;
    else domainMap.ACCESSORY_CABLE++;
  }
  return domainMap;
}

function _deriveRootCauseAttribution(evalResults = {}) {
  const errors = evalResults.errors || [];
  const warnings = evalResults.warnings || [];
  const discrepancies = evalResults.opinionDiscrepancies || [];

  if (evalResults.requirementResolution?.requiresHumanClarification) return 'INPUT_AMBIGUITY';
  if (errors.some(e => /not found in.*catalog|uncataloged|invalid sku/i.test(String(e)))) return 'CATALOG_GAP';
  if (errors.length > 0) return 'PHYSICAL_VIOLATION';
  if (discrepancies.length > 0) return 'RAG_DISCREPANCY';
  if (evalResults.budgetOptimization?.isBudgetExceeded) return 'BUDGET_OVERRUN';
  if (warnings.length > 0) return 'ADVISORY_WARNING';
  return 'CLEAN_BUILD';
}

function _extractGroundingStatus(evalResults = {}) {
  const ragFallbackUsed = Boolean(evalResults.ragFallbackUsed);
  const notebookLmStatus = evalResults.notebookLmStatus || null;
  const notebookLmMode = notebookLmStatus?.source || (ragFallbackUsed ? 'LOCAL_RAG_FALLBACK' : 'UNMEASURED');
  const notebookLmSourcesUsed = notebookLmStatus?.sourcesUsed || [];
  const notebookLmCitationsCount = notebookLmStatus?.citationsCount || 0;
  const cloudGroundingConfirmed = Boolean(notebookLmStatus && notebookLmStatus.source === 'NOTEBOOK_LM_CLOUD' && !ragFallbackUsed);
  const groundingIntegrity = notebookLmStatus?.isCloudGrounded
    ? '100%_CLOUD_GROUNDED'
    : (ragFallbackUsed ? 'LOCAL_SAFETY_NET' : 'DETERMINISTIC_RULES');
  const silentFallbackDetected = Boolean(ragFallbackUsed && !notebookLmStatus?.diagnostic);

  return {
    ragFallbackUsed,
    notebookLmMode,
    notebookLmSourcesUsed,
    notebookLmCitationsCount,
    cloudGroundingConfirmed,
    groundingIntegrity,
    silentFallbackDetected
  };
}

function _updateRollingStatistics(data) {
  const history = Array.isArray(data.history) ? data.history : [];
  const scoredRuns = history.filter(h => _finiteScoreOrNull(h?.confidenceScore) !== null);
  if (scoredRuns.length > 0) {
    const totalScore = scoredRuns.reduce((acc, curr) => acc + curr.confidenceScore, 0);
    data.avgConfidenceScore = parseFloat((totalScore / scoredRuns.length).toFixed(2));
    const highConfidenceRuns = scoredRuns.filter(h => h.confidenceScore >= 0.85).length;
    data.evalAccuracyScore = parseFloat(((highConfidenceRuns / scoredRuns.length) * 100).toFixed(1));
  } else {
    data.avgConfidenceScore = null;
    data.evalAccuracyScore = null;
  }

  if (history.length > 0) {
    const fallbackRuns = history.filter(h => h?.ragFallbackUsed || h?.notebookLmMode === 'LOCAL_RAG_FALLBACK').length;
    data.ragFallbackRatio = parseFloat(((fallbackRuns / history.length) * 100).toFixed(1));
    data.cloudGroundingRatio = parseFloat((((history.length - fallbackRuns) / history.length) * 100).toFixed(1));
  } else {
    data.ragFallbackRatio = null;
    data.cloudGroundingRatio = null;
  }

  const durations = history.map(h => _finiteNonNegativeOrNull(h?.durationMs)).filter(v => v !== null).sort((a, b) => a - b);
  data.p50DurationMs = _computePercentile(durations, 50);
  data.p95DurationMs = _computePercentile(durations, 95);

  const deltas = Array.isArray(data.learnedDeltas) ? data.learnedDeltas : [];
  data.learningEffectiveness = {
    activeRulesReachedCount: history.reduce((sum, h) => sum + (Number.isFinite(h?.activeRulesReachedCount) ? h.activeRulesReachedCount : 0), 0),
    appliedRulesCount: history.reduce((sum, h) => sum + (Number.isFinite(h?.appliedRulesCount) ? h.appliedRulesCount : 0), 0),
    proposedDeltasCount: deltas.length,
    promotedDeltasCount: deltas.filter(d => d?.governanceStatus === 'ACTIVE' || d?.governanceStatus === 'PROMOTED').length
  };
}

function _extractLedgerLearningCounts(ledger) {
  const activeRulesReachedCount = Array.isArray(ledger?.activeRulesReached) ? ledger.activeRulesReached.length : 0;
  const appliedRulesCount = Array.isArray(ledger?.skuAuditLedger)
    ? ledger.skuAuditLedger.filter(s => ['INJECTED_MANDATORY_FIX', 'DELTA_AUTO_PROMOTED', 'REMEDIATED'].includes(s?.action)).length
    : 0;
  return { activeRulesReachedCount, appliedRulesCount };
}

function _buildTelemetryMemoryUsage() {
  const mem = process.memoryUsage ? process.memoryUsage() : { rss: 0, heapUsed: 0, heapTotal: 0 };
  return {
    rssMb: Math.round(mem.rss / (1024 * 1024)),
    heapUsedMb: Math.round(mem.heapUsed / (1024 * 1024)),
    heapTotalMb: Math.round(mem.heapTotal / (1024 * 1024))
  };
}

function _buildStageAndClusterSnapshot(evalResults) {
  const hasMeasuredStages = Boolean(evalResults.stageBreakdown && typeof evalResults.stageBreakdown === 'object');
  const stageBreakdown = hasMeasuredStages
    ? { ...evalResults.stageBreakdown }
    : { stage1ParsingMs: null, stage2AspectMathMs: null, stage3RAGConsultationMs: null, stage4GeminiVerificationMs: null, stage5ResolutionMatrixMs: null };
  const phaseDurationsMs = mapStageTimingsToCanonicalPhases(evalResults.stageBreakdown || {}, evalResults.evidenceLedger?.phases || null);
  const clusterPartitionCount = evalResults.clusters ? evalResults.clusters.length : (evalResults.clusterSizing?.totalNodes ? 1 : null);
  return {
    stageBreakdown,
    stageTimingsMeasured: hasMeasuredStages,
    phaseDurationsMs,
    clusterPartitionCount,
    totalNodesEvaluated: evalResults.clusterSizing?.totalNodes ?? evalResults.multiplier ?? null
  };
}

function _buildEvaluationTelemetryEntry(evalResults = {}, boqFile = '', durationMs = null) {
  const graph = evalResults.conflictGraph || {};
  const score = _finiteScoreOrNull(evalResults.confidence?.score);
  const activeTrace = getTraceId();
  const entryId = activeTrace !== 'NO_TRACE_CONTEXT' ? activeTrace : `EVAL-${Date.now()}`;
  const { activeRulesReachedCount, appliedRulesCount } = _extractLedgerLearningCounts(evalResults.evidenceLedger);
  const snapshot = _buildStageAndClusterSnapshot(evalResults);

  return {
    id: entryId,
    timestamp: new Date().toISOString(),
    boqFile: boqFile ? path.basename(String(boqFile)) : null,
    chassisModel: graph.chassisInfo?.model || evalResults.chassis || 'UNSPECIFIED_PLATFORM',
    confidenceScore: score,
    rootCauseAttribution: _deriveRootCauseAttribution(evalResults),
    isHitlTriggered: evalResults.confidence?.isHitlTriggered ?? (score !== null ? score < 0.75 : null),
    criticalViolationsCount: (evalResults.errors || []).length,
    warningsCount: (evalResults.warnings || []).length,
    missingDependenciesCount: (evalResults.missingDependencies || []).length,
    graphRulesEvaluated: _finiteNonNegativeOrNull(graph.totalRulesEvaluated),
    graphWholeSolutionValid: graph.isWholeSolutionValid === true,
    ...snapshot,
    domainMap: _extractDomainMap(evalResults.missingDependencies),
    ..._extractGroundingStatus(evalResults),
    syncStatus: evalResults.postFlowSync?.driftStatus || 'NOT_RUN',
    learnedDeltasThisRun: evalResults.postFlowSync?.masterRegistryRulesCount ?? null,
    activeRulesReachedCount,
    appliedRulesCount,
    valueEngineeringSavingsUsd: _finiteNonNegativeOrNull(evalResults.valueEngineering?.totalEstimatedSavingsUsd),
    guardrailRetries: evalResults.guardrailRetries || 0,
    traceId: evalResults.provenanceTrace?.traceId || entryId,
    provenanceTrace: evalResults.provenanceTrace || null,
    memoryUsage: _buildTelemetryMemoryUsage(),
    durationMs: _finiteNonNegativeOrNull(durationMs)
  };
}

function recordEvaluationTelemetry(evalResults = {}, boqFile = '', durationMs = null, options = {}) {
  const entry = _buildEvaluationTelemetryEntry(evalResults, boqFile, durationMs);
  return _persistTelemetryUpdate(data => {
    data.evaluationsCount = (data.evaluationsCount || 0) + 1;
    data.history.unshift(entry);
    _updateRollingStatistics(data);
    return entry;
  }, options);
}

function recordRoutedQueryTelemetry(envelope = {}, options = {}) {
  const cls = envelope.classification || {};
  const res = envelope.result || {};
  const entry = {
    id: envelope.traceId || `ROUTE-${Date.now()}`,
    traceId: envelope.traceId || null,
    timestamp: new Date().toISOString(),
    intent: cls.intent || 'UNKNOWN',
    skillTarget: cls.skillTarget || null,
    resolvedPlatform: envelope.resolvedPlatform || 'UNSPECIFIED_PLATFORM',
    classificationConfidence: _finiteScoreOrNull(envelope.classificationConfidence),
    hitlRequired: typeof envelope.hitlRequired === 'boolean' ? envelope.hitlRequired : null,
    executionTimeMs: _finiteNonNegativeOrNull(envelope.executionTimeMs),
    epistemicTier: envelope.reasoningAnalysis?.epistemicIntegrity?.tier || null,
    phaseDurationsMs: mapStageTimingsToCanonicalPhases(res.stageBreakdown || {}, res.evidenceLedger?.phases || null)
  };
  return _persistTelemetryUpdate(data => {
    data.totalRoutedQueries = (data.totalRoutedQueries || 0) + 1;
    data.routedQueries.unshift(entry);
    return entry;
  }, options);
}

function recordFeedbackTelemetry(delta = {}, options = {}) {
  const entry = {
    id: delta.deltaId || `DELTA-${Date.now()}`,
    timestamp: delta.timestamp || new Date().toISOString(),
    chassis: delta.chassis || 'UNSPECIFIED_PLATFORM',
    errorType: delta.errorType || 'PERMANENT_PHYSICAL_DEPENDENCY',
    affectedSku: delta.affectedSku || '',
    requiredSku: delta.requiredDependencySku || null,
    ruleUpdate: delta.ruleUpdate || '',
    governanceStatus: delta.governanceStatus || delta.status || 'UNKNOWN',
    knowledgeFingerprint: delta.knowledgeFingerprint || null,
    preConfidenceScore: _finiteScoreOrNull(delta.preConfidenceScore),
    postConfidenceScore: _finiteScoreOrNull(delta.postConfidenceScore ?? delta.confidenceScore),
    reviewer: delta.humanReview?.reviewer || delta.promotedBy || null,
    reviewerReasoning: delta.humanReview?.reasoning || delta.humanReasoning || null,
    evidenceIds: Array.isArray(delta.humanReview?.evidence)
      ? delta.humanReview.evidence.map(item => item.id || item.url).filter(Boolean)
      : []
  };
  return _persistTelemetryUpdate(data => {
    data.learnedDeltas.unshift(entry);
    data.totalDeltasLearned = (data.totalDeltasLearned || 0) + 1;
    _updateRollingStatistics(data);
    return entry;
  }, options);
}

function recordNotebookConsultationTelemetry(consultation = {}, options = {}) {
  const entry = {
    id: `NLM-${Date.now()}`,
    timestamp: new Date().toISOString(),
    query: consultation.query || '',
    sanitizedQuery: consultation.sanitizedQuery || consultation.query || '',
    answer: consultation.answer || '',
    citations: consultation.citations || [],
    durationMs: (typeof consultation.durationMs === 'number' && consultation.durationMs > 0) ? consultation.durationMs : null,
    scenario: consultation.scenario || 'GENERAL_QUICKSPECS',
    agreementScore: _finiteScoreOrNull(consultation.agreementScore),
    nextActionExecuted: consultation.nextActionExecuted || 'DEPENDENCY_VALIDATED',
    chassis: consultation.chassis || 'UNSPECIFIED_PLATFORM'
  };
  return _persistTelemetryUpdate(data => {
    data.notebookConsultations.unshift(entry);
    data.totalNlmQueries = (data.totalNlmQueries || 0) + 1;
    const consultations = data.notebookConsultations;
    const validDurations = consultations.filter(c => typeof c.durationMs === 'number' && c.durationMs > 0);
    data.avgNlmResponseTimeMs = validDurations.length > 0
      ? Math.round(validDurations.reduce((acc, c) => acc + c.durationMs, 0) / validDurations.length)
      : null;
    const validScores = consultations.filter(c => typeof c.agreementScore === 'number');
    data.nlmAgreementIndex = validScores.length > 0
      ? Math.round((validScores.reduce((acc, c) => acc + c.agreementScore, 0) / validScores.length) * 100)
      : null;
    const withCitations = consultations.filter(c => Array.isArray(c.citations) && c.citations.length > 0);
    data.nlmCitationMatchRate = consultations.length > 0
      ? Math.round((withCitations.length / consultations.length) * 100)
      : null;
    const scenarioCounts = {};
    for (const c of consultations) {
      const s = c.scenario || 'GENERAL_QUICKSPECS';
      scenarioCounts[s] = (scenarioCounts[s] || 0) + 1;
    }
    data.nlmScenarioBreakdown = scenarioCounts;
    return entry;
  }, options);
}

function recordCleansingPreflightTelemetry(preflightPipeline = {}, boqFile = '', options = {}) {
  const entry = {
    id: `PREFLIGHT-${Date.now()}`,
    timestamp: new Date().toISOString(),
    boqFile: boqFile ? path.basename(String(boqFile)) : null,
    hasNonIntegerFraction: Boolean(preflightPipeline?.hasNonInteger),
    baseChassisQty: preflightPipeline?.baseChassisQty ?? null,
    baseChassisSku: preflightPipeline?.baseChassisSku || 'UNSPECIFIED_CHASSIS',
    stagesCleared: (preflightPipeline?.stages || []).filter(s => s.passed).length,
    totalStages: preflightPipeline?.stages?.length ?? null,
    anomaliesCount: preflightPipeline?.totalAnomaliesCount || 0,
    status: preflightPipeline?.hasNonInteger ? 'FRACTIONAL_ANOMALY_FLAGGED' : 'CLEANSED_CLEARED'
  };
  return _persistTelemetryUpdate(data => {
    data.cleansingAuditLogs.unshift(entry);
    return entry;
  }, options);
}

function recordOcrTelemetry(ocrMeta = {}, options = {}) {
  const entry = {
    id: `OCR-${Date.now()}`,
    timestamp: new Date().toISOString(),
    fileName: ocrMeta.fileName || null,
    fileSizeBytes: _finiteNonNegativeOrNull(ocrMeta.fileSizeBytes),
    charLength: _finiteNonNegativeOrNull(ocrMeta.charLength),
    extractedSkusCount: _finiteNonNegativeOrNull(ocrMeta.extractedSkusCount),
    modelUsed: ocrMeta.modelUsed || process.env.GEMINI_MODEL_NAME || null,
    durationMs: _finiteNonNegativeOrNull(ocrMeta.durationMs)
  };
  return _persistTelemetryUpdate(data => {
    data.ocrAuditLogs.unshift(entry);
    return entry;
  }, options);
}

function recordExportTelemetry(exportData = {}, options = {}) {
  const entry = {
    id: exportData.id || `EXP-${Date.now()}`,
    timestamp: exportData.exportedAt || new Date().toISOString(),
    filename: exportData.filename,
    chassisId: exportData.chassisId,
    rank: exportData.rank,
    solutionName: exportData.solutionName,
    estimatedCostUsd: exportData.estimatedCostUsd ?? null
  };
  return _persistTelemetryUpdate(data => {
    data.totalExports = (data.totalExports || 0) + 1;
    data.exportHistory.unshift(entry);
    return entry;
  }, options);
}

function recordReconciliationTelemetry(auditReport = {}, options = {}) {
  const entry = {
    id: `RECON-${Date.now()}`,
    timestamp: auditReport.verificationTimestamp || new Date().toISOString(),
    chassisModel: auditReport.chassisModel || 'UNSPECIFIED_PLATFORM',
    proposedRank: auditReport.proposedRank ?? null,
    totalVendorSkus: auditReport.totalVendorSkus || 0,
    totalProposedSkus: auditReport.totalProposedSkus || 0,
    is100PercentMatch: Boolean(auditReport.is100PercentMatch),
    requiresFreshScrape: Boolean(auditReport.requiresFreshScrape),
    addedCount: auditReport.discrepancies?.addedByVendor?.length || 0,
    removedCount: auditReport.discrepancies?.removedByVendor?.length || 0,
    priceDeltaCount: auditReport.discrepancies?.priceDeltas?.length || 0,
    uncatalogedCount: auditReport.discrepancies?.uncatalogedSkus?.length || 0
  };
  return _persistTelemetryUpdate(data => {
    data.totalReconciliations = (data.totalReconciliations || 0) + 1;
    data.reconciliationHistory.unshift(entry);
    return entry;
  }, options);
}

function recordGuardrailTelemetry(guardrailResult = {}, chassisId = 'UNSPECIFIED_PLATFORM', preConfidence = null, postConfidence = null, options = {}) {
  const toolCalls = guardrailResult.executedToolCalls || [];
  const toolCallCounts = {};
  for (const t of toolCalls) toolCallCounts[t] = (toolCallCounts[t] || 0) + 1;
  const pre = _finiteScoreOrNull(preConfidence);
  const post = _finiteScoreOrNull(postConfidence);

  const entry = {
    id: `GUARD-${Date.now()}`,
    timestamp: new Date().toISOString(),
    chassisId,
    success: Boolean(guardrailResult.success),
    error: guardrailResult.error || null,
    turns: guardrailResult.turns ?? null,
    totalToolCalls: toolCalls.length,
    toolCallBreakdown: toolCallCounts,
    durationMs: _finiteNonNegativeOrNull(guardrailResult.durationMs),
    preConfidence: pre,
    postConfidence: post,
    confidenceLift: (pre !== null && post !== null) ? parseFloat((post - pre).toFixed(2)) : null,
    knowledgeDeltasRecorded: toolCallCounts.record_knowledge_delta || 0,
    simulateBuildsRun: toolCallCounts.simulate_build || 0,
    ragQueriesRun: (toolCallCounts.query_notebooklm || 0) + (toolCallCounts.query_catalog_db || 0)
  };
  return _persistTelemetryUpdate(data => {
    data.guardrailHistory.unshift(entry);
    data.totalGuardrailRuns = (data.totalGuardrailRuns || 0) + 1;
    const validDurations = data.guardrailHistory.filter(h => typeof h.durationMs === 'number' && h.durationMs > 0);
    data.avgGuardrailDurationMs = validDurations.length > 0
      ? Math.round(validDurations.reduce((acc, h) => acc + h.durationMs, 0) / validDurations.length)
      : null;
    const validTurns = data.guardrailHistory.filter(h => typeof h.turns === 'number');
    data.avgGuardrailTurns = validTurns.length > 0
      ? parseFloat((validTurns.reduce((acc, h) => acc + h.turns, 0) / validTurns.length).toFixed(1))
      : null;
    const successRuns = data.guardrailHistory.filter(h => h.success).length;
    data.guardrailSuccessRate = data.guardrailHistory.length > 0
      ? parseFloat(((successRuns / data.guardrailHistory.length) * 100).toFixed(1))
      : null;
    return entry;
  }, options);
}

function normalizeTelemetryMeasurement(input) {
  return require('./telemetry_measurement.js').normalizeTelemetryMeasurement(input);
}

function migrateLegacyTelemetry(legacy, options) {
  return require('./telemetry_legacy_migration.js').migrateLegacyTelemetry(legacy, options);
}

function summarizeTelemetryPopulation(entries, selection) {
  return require('./telemetry_populations.js').summarizeTelemetryPopulation(entries, selection);
}

function recordSelfHealingEvent(eventType, details = {}, options = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    traceId: getTraceId(),
    eventType: String(eventType || 'UNKNOWN_SELF_HEAL'),
    ...details
  };
  return _persistTelemetryUpdate(data => {
    data.selfHealingEvents.unshift(entry);
    data.totalSelfHealingEvents = (data.totalSelfHealingEvents || 0) + 1;
    return entry;
  }, options);
}

function recordAgentExecutionTelemetry(info = {}, options = {}) {
  const recoveryEvents = Array.isArray(info.recoveryEvents) ? info.recoveryEvents : [];
  const modeUsed = String(info.modeUsed || info.requestedMode || 'DETERMINISTIC');
  const entry = {
    timestamp: new Date().toISOString(),
    traceId: getTraceId(),
    runId: info.runId || null,
    requestedMode: info.requestedMode || null,
    modeUsed,
    tierTrail: Array.isArray(info.tierTrail) ? info.tierTrail : [modeUsed],
    modelUsed: info.modelUsed || null,
    copilotStatus: info.copilotStatus || null,
    agyStatus: info.agyStatus || null,
    durationMs: _finiteNonNegativeOrNull(info.durationMs),
    toolCallCount: Number.isFinite(info.toolCallCount) ? info.toolCallCount : 0,
    fallbackOccurred: Boolean(info.fallbackOccurred),
    recoveryEvents,
    chassis: info.chassis || null
  };
  return _persistTelemetryUpdate(data => {
    data.agentExecutions.unshift(entry);
    data.totalAgentRuns = (data.totalAgentRuns || 0) + 1;
    data.agentTierBreakdown[modeUsed] = (data.agentTierBreakdown[modeUsed] || 0) + 1;
    if (entry.fallbackOccurred) data.providerFallbackCount = (data.providerFallbackCount || 0) + 1;
    for (const evt of recoveryEvents) {
      if (evt?.action) data.providerRecoveryCounts[evt.action] = (data.providerRecoveryCounts[evt.action] || 0) + 1;
    }
    const valid = data.agentExecutions.map(e => _finiteNonNegativeOrNull(e.durationMs)).filter(v => v !== null);
    data.avgAgentDurationMs = valid.length > 0 ? Math.round(valid.reduce((s, v) => s + v, 0) / valid.length) : null;
    return entry;
  }, options);
}

function _buildAgentSummaryFields(data) {
  return {
    totalAgentRuns: data.totalAgentRuns || 0,
    agentTierBreakdown: data.agentTierBreakdown || {},
    avgAgentDurationMs: data.avgAgentDurationMs ?? null,
    providerFallbackCount: data.providerFallbackCount || 0,
    providerRecoveryCounts: data.providerRecoveryCounts || {}
  };
}

function getTelemetrySummary(options = {}) {
  const data = _normalizeLoadedStore(loadTelemetry(options));
  _updateRollingStatistics(data);
  return {
    version: data.version || '2.0.0',
    lastUpdated: data.lastUpdated || null,
    evaluationsCount: data.evaluationsCount || 0,
    totalRoutedQueries: data.totalRoutedQueries || 0,
    avgConfidenceScore: data.avgConfidenceScore ?? null,
    evalAccuracyScore: data.evalAccuracyScore ?? null,
    ragFallbackRatio: data.ragFallbackRatio ?? null,
    cloudGroundingRatio: data.cloudGroundingRatio ?? null,
    p50DurationMs: data.p50DurationMs ?? null,
    p95DurationMs: data.p95DurationMs ?? null,
    totalExports: data.totalExports || 0,
    totalDeltasLearned: data.totalDeltasLearned || 0,
    totalNlmQueries: data.totalNlmQueries || 0,
    avgNlmResponseTimeMs: data.avgNlmResponseTimeMs ?? null,
    nlmAgreementIndex: data.nlmAgreementIndex ?? null,
    nlmCitationMatchRate: data.nlmCitationMatchRate ?? null,
    totalGuardrailRuns: data.totalGuardrailRuns || 0,
    avgGuardrailDurationMs: data.avgGuardrailDurationMs ?? null,
    avgGuardrailTurns: data.avgGuardrailTurns ?? null,
    guardrailSuccessRate: data.guardrailSuccessRate ?? null,
    ..._buildAgentSummaryFields(data), learningEffectiveness: data.learningEffectiveness
  };
}

module.exports = {
  normalizeTelemetryMeasurement,
  migrateLegacyTelemetry,
  summarizeTelemetryPopulation,
  loadTelemetry,
  pruneTelemetry,
  MAX_TELEMETRY_ENTRIES,
  recordEvaluationTelemetry,
  recordFeedbackTelemetry,
  recordNotebookConsultationTelemetry,
  recordCleansingPreflightTelemetry,
  recordOcrTelemetry,
  recordExportTelemetry,
  recordReconciliationTelemetry,
  recordGuardrailTelemetry,
  recordSelfHealingEvent,
  recordAgentExecutionTelemetry,
  recordRoutedQueryTelemetry,
  getTelemetrySummary,
  CANONICAL_EXECUTION_PHASES
};
