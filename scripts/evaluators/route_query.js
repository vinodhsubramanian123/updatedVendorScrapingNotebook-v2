'use strict';
/**
 * scripts/evaluators/route_query.js — Presales Unified Intent Router & Pipeline Dispatcher
 *
 * Thin modular facade orchestrating intent classification, platform resolution,
 * 19 presales track dispatches, acceptance gating, reasoning post-analysis, and CLI entry.
 * Domain implementations live in scripts/lib/router/*.
 */

if (require.main === module && process.argv.includes('--json')) {
  process.env.DOTENV_CONFIG_QUIET = 'true';
  process.env.DOTENV_CONFIG_DEBUG = 'false';
}

const fs = require('fs');
const path = require('path');
const { observeRouterEntry, observeActualInvocation, resolveEntryTraceId } = require('../lib/system/execution_trace_runtime.js');
const {
  OCR_IMAGE_EXTENSIONS,
  listAllCatalogs,
  getChassisCatalog,
  _resolveContextPolicy,
  _isOfflineContext,
  _compileCatalogSearch
} = require('../lib/router/platform_catalog_resolver.js');
const {
  classifyQueryIntent,
  _deriveClassificationConfidence
} = require('../lib/router/intent_classifier.js');
let {
  _handleFreeformQa,
  handleOcrQuoteIngestion,
  _handleCatalogIntelligence,
  _handlePresalesClearanceStrategy
} = require('../lib/router/catalog_and_clearance_handlers.js');
let {
  _handleRfpSizing,
  _handleBomReconciliation,
  _handleHeterogeneousTenderModernization,
  _handleCrossVendorTransformation
} = require('../lib/router/rfp_and_reconciliation_handlers.js');
let {
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
} = require('../lib/router/specialty_track_handlers.js');

// Retained verbatim slice for tests/unit/test_ingress_cancellation.js (BOQ -> OCR boundary).
function _boqPipelineFailure(error, context) {
  const cancelled = context.signal?.aborted && Object.is(error, context.signal.reason);
  return {
    status: cancelled ? 'CANCELLED' : 'ERROR',
    error: cancelled ? 'BOQ evaluation cancelled' : (error?.message ?? String(error)),
    traceId: error?.traceId || null,
    evidenceLogPath: error?.evidenceLogPath || null
  };
}

function _resolveBoqOfflineMode(context = {}) {
  return _resolveContextPolicy(context, { defaultOffline: false }).offline;
}

async function _handleBoqEvaluation(queryText, context) {
  const chassisInfo = getChassisCatalog(queryText, context);
  const policy = _resolveContextPolicy(context, { defaultOffline: false });
  if (context.filePath && OCR_IMAGE_EXTENSIONS.includes(path.extname(context.filePath).toLowerCase()) && policy.offline) {
    return {
      intent: 'BOQ_EVALUATION',
      status: 'OFFLINE_INPUT_REQUIRED',
      error: 'Local-only execution is active. Image and scanned PDF OCR require cloud processing. Please provide pasted text or upload CSV/XLSX.',
      remediationAction: 'Provide pasted text or upload CSV/XLSX.',
      isOcrProcessed: false,
      effectivePolicy: policy
    };
  }
  if (context.filePath && fs.existsSync(context.filePath)) {
    try {
      const { runEvaluationPipeline } = require('./eval_boq.js');
      return await runEvaluationPipeline({
        inputFile: context.filePath,
        chassisDir: context.chassisDir || (chassisInfo?.catalogDir || undefined),
        targetSheetName: context.targetSheet || undefined,
        signal: context.signal,
        traceId: context.traceId,
        JSON_MODE: true,
        OFFLINE_MODE: policy.offline,
        effectivePolicy: policy
      });
    } catch (pipeErr) {
      return _boqPipelineFailure(pipeErr, context);
    }
  } else if (context.items && Array.isArray(context.items)) {
    try {
      const { runEvaluationPipeline } = require('./eval_boq.js');
      return await runEvaluationPipeline({
        inputItems: context.items,
        chassisDir: context.chassisDir || (chassisInfo?.catalogDir || undefined),
        targetSheetName: context.targetSheet || undefined,
        signal: context.signal,
        traceId: context.traceId,
        JSON_MODE: true,
        OFFLINE_MODE: policy.offline,
        effectivePolicy: policy
      });
    } catch (pipeErr) {
      return _boqPipelineFailure(pipeErr, context);
    }
  } else {
    return {
      message: 'BOQ evaluation requested. Please upload or specify a BOQ file path or item list.',
      suggestedAction: 'UPLOAD_BOQ_SPREADSHEET'
    };
  }
}

async function _continueOcrDownstreamIfRequested(queryText, context, parsedItems) {
  if (context?.continueDownstream !== true || !context?.downstreamIntent) return null;
  return _dispatchIntentHandler(
    { intent: context.downstreamIntent },
    queryText,
    { ...context, items: parsedItems, filePath: undefined }
  );
}

async function _handleOcrQuoteIngestion(queryText, context) {
  return handleOcrQuoteIngestion(queryText, context, _continueOcrDownstreamIfRequested);
}

async function _dispatchIntentHandler(classification, queryText, context, chassisInfo) {
  switch (classification.intent) {
    case 'SOLUTION_COMPARISON':
      return await observeActualInvocation('_handleSolutionComparison', __filename, () => _handleSolutionComparison(queryText, context));

    case 'CROSS_VENDOR_TRANSFORMATION':
      return await observeActualInvocation('_handleCrossVendorTransformation', __filename, () => _handleCrossVendorTransformation(queryText, context));

    case 'HETEROGENEOUS_TENDER_MODERNIZATION':
      return await observeActualInvocation('_handleHeterogeneousTenderModernization', __filename, () => _handleHeterogeneousTenderModernization(queryText, context));

    case 'FREEFORM_QA':
      return await observeActualInvocation('_handleFreeformQa', __filename, () => _handleFreeformQa(queryText, context));

    case 'BOQ_EVALUATION':
      return await observeActualInvocation('_handleBoqEvaluation', __filename, () => _handleBoqEvaluation(queryText, context));

    case 'OCR_QUOTE_INGESTION':
      return await observeActualInvocation('_handleOcrQuoteIngestion', __filename, () => _handleOcrQuoteIngestion(queryText, context));

    case 'CATALOG_INTELLIGENCE':
      return observeActualInvocation('_handleCatalogIntelligence', __filename, () => _handleCatalogIntelligence(queryText, context));

    case 'RFP_SIZING_TO_BOM':
      return await observeActualInvocation('_handleRfpSizing', __filename, () => _handleRfpSizing(queryText, context, chassisInfo || undefined, require('./eval_boq.js').runEvaluationPipeline));

    case 'BOM_RECONCILIATION':
      return observeActualInvocation('_handleBomReconciliation', __filename, () => _handleBomReconciliation(queryText, context));

    case 'WORKLOAD_DNA':
      return await observeActualInvocation('_handleWorkloadDna', __filename, () => _handleWorkloadDna(queryText, context));

    case 'VALUE_ENGINEERING':
      return await observeActualInvocation('_handleValueEngineering', __filename, () => _handleValueEngineering(queryText, context));

    case 'LEAST_DELTA_SYNTHESIS':
      return await observeActualInvocation('_handleLeastDeltaSynthesis', __filename, () => _handleLeastDeltaSynthesis(queryText, context));

    case 'WORKBOOK_GENERATION':
      return await observeActualInvocation('_handleWorkbookGeneration', __filename, () => _handleWorkbookGeneration(queryText, context, _handleBoqEvaluation));

    case 'REMARKS_RECONCILIATION':
      return await observeActualInvocation('_handleRemarksReconciliation', __filename, () => _handleRemarksReconciliation(queryText, context));

    case 'MULTI_CLUSTER_TENDER':
      return await observeActualInvocation('_handleMultiClusterTender', __filename, () => _handleMultiClusterTender(queryText, context));

    case 'ADVERSARIAL_VALIDATION':
      return await observeActualInvocation('_handleAdversarialValidation', __filename, () => _handleAdversarialValidation(queryText, context, require('./adversarial_agent.js')));

    case 'CONTINUOUS_LEARNING':
      return await observeActualInvocation('_handleContinuousLearning', __filename, () => _handleContinuousLearning(queryText, context));

    case 'KNOWLEDGE_SYNC':
      return await observeActualInvocation('_handleKnowledgeSync', __filename, () => _handleKnowledgeSync(queryText, context));

    case 'PRESALES_CLEARANCE_STRATEGY':
      return await observeActualInvocation('_handlePresalesClearanceStrategy', __filename, () => _handlePresalesClearanceStrategy(queryText, context));

    case 'HARDWARE_ENVELOPE_ANALYTICS':
      return await observeActualInvocation('_handleHardwareEnvelopeAnalytics', __filename, () => _handleHardwareEnvelopeAnalytics(queryText, context));

    default:
      return {
        intent: classification.intent,
        skillTarget: classification.skillTarget,
        instructions: `Engage ${classification.skillTarget} to process: ${classification.rationale}`,
        promptContext: queryText
      };
  }
}

// CP7b report-only proposal. Disabled until independently verified CP0/CP6r parity.
async function executeRoutedQuery(queryText = '', context = {}) {
  return observeRouterEntry(__filename, queryText, () => _executeRoutedQueryWithShadow(queryText, context));
}

async function _executeRoutedQueryWithShadow(queryText = '', context = {}) {
  if (process.env.PRESALES_QUERY_SHADOW !== '1') return _executeLegacyRoutedQuery(queryText, context);
  let observe;
  try { observe = require('../lib/boq/presales_query_shadow.js').executeWithQueryShadow; }
  catch { return _executeLegacyRoutedQuery(queryText, context); }
  if (typeof observe !== 'function') return _executeLegacyRoutedQuery(queryText, context);
  return observe(queryText, context, _executeLegacyRoutedQuery);
}

function _resolvePlatformSelectionMemory(queryText, initialPlatform, context) {
  const platformSelectionMemory = { retrievedIds: [], usedIds: [], status: 'NOT_APPLICABLE' };
  let updatedContext = context;
  if (initialPlatform.isAmbiguous && initialPlatform.candidates?.length > 1) {
    try {
      const { retrievePlatformSelection } = require('../lib/boq/user_platform_selection_store.js');
      const memory = retrievePlatformSelection(queryText, initialPlatform.candidates, listAllCatalogs(), context);
      platformSelectionMemory.retrievedIds = memory.retrievedIds;
      platformSelectionMemory.status = memory.reason;
      if (memory.selected) {
        const selectedContext = { ...context, chassisName: memory.selected.selectedPlatform };
        const resolved = getChassisCatalog(queryText, selectedContext);
        if (!resolved.isAmbiguous && resolved.chassisKey === memory.selected.selectedPlatform) {
          updatedContext = selectedContext;
          platformSelectionMemory.usedIds = [memory.selected.id];
        }
      }
    } catch (error) {
      platformSelectionMemory.status = 'PREFERENCE_READ_FAILED';
      platformSelectionMemory.error = error.message;
    }
  }
  return { platformSelectionMemory, updatedContext };
}

function _resolveRoutedPlatform(queryText, context, classification) {
  const isCatalogMultiQuery = classification.intent === 'CATALOG_INTELLIGENCE' ||
    classification.intent === 'SOLUTION_COMPARISON' ||
    classification.intent === 'HARDWARE_ENVELOPE_ANALYTICS';
  const platformContext = classification.intent === 'RFP_SIZING_TO_BOM' ? { ...context, preferNamedProduct: true } : context;
  const initial = isCatalogMultiQuery ? {} : getChassisCatalog(queryText, platformContext);
  const { platformSelectionMemory, updatedContext } = _resolvePlatformSelectionMemory(queryText, initial, platformContext);
  let chassisInfoForConf = null;
  try {
    if (!isCatalogMultiQuery) {
      chassisInfoForConf = updatedContext === platformContext ? initial : getChassisCatalog(queryText, updatedContext);
    }
  } catch { chassisInfoForConf = null; }
  const unresolvedAmbiguity = ['AMBIGUOUS_QUERY', 'AMBIGUOUS_PRODUCT', 'GENERATION_MISMATCH'].includes(chassisInfoForConf?.chassisKey) ||
    classification.intent === 'AMBIGUOUS_QUERY';
  return { platformSelectionMemory, updatedContext, chassisInfoForConf, unresolvedAmbiguity };
}

function _buildAmbiguityResponse(queryText, classification, chassisInfoForConf, traceId) {
  const ambiguityDetails = {
    error: chassisInfoForConf?.error,
    candidates: chassisInfoForConf?.candidates || [],
    chassisKey: chassisInfoForConf?.chassisKey
  };
  const question = require('../lib/boq/platform_disambiguation_prompt.js').formatDisambiguationPrompt({
    query: queryText,
    classification,
    hitlRequired: true,
    ambiguityDetails
  }, queryText);
  const reasonText = chassisInfoForConf?.error || 'Ambiguous platform target requiring human clarification';
  return {
    status: 'ACTION_REQUIRED',
    code: 'PLATFORM_CLARIFICATION_REQUIRED',
    reason: reasonText,
    message: reasonText,
    nextAction: 'PRESENT_DISAMBIGUATION_CHOICE_TO_USER',
    question,
    traceId
  };
}

function _buildDispatchErrorResponse(dispatchErr, context, classification, traceId) {
  const cancelled = context.signal?.aborted && Object.is(dispatchErr, context.signal.reason);
  return {
    status: cancelled || dispatchErr.name === 'AbortError' ? 'CANCELLED' : 'FAILED',
    error: {
      code: dispatchErr.code || 'HANDLER_EXECUTION_FAILED',
      message: dispatchErr.message,
      stack: process.env.NODE_ENV === 'test' ? undefined : dispatchErr.stack
    },
    message: `Intent handler failed: ${dispatchErr.message}`,
    classification,
    customerDisposition: 'DELIVERY_BLOCKED_UNBUILDABLE',
    traceId
  };
}

function _attachAcceptanceGate(responseData, classification, context, chassisInfoForConf) {
  if (!responseData || typeof responseData !== 'object') return;
  try {
    const { verifyPrePresentationAcceptance } = require('../lib/boq/bom_verifier.js');
    const evalContext = {
      ...context,
      catalogData: context.catalogData || responseData.catalogData || responseData.chassisInfo?.catalogData || chassisInfoForConf?.catalogData,
      catalogDir: context.catalogDir || responseData.catalogDir || responseData.chassisInfo?.catalogDir || chassisInfoForConf?.catalogDir
    };
    const acceptance = responseData.acceptanceGate || verifyPrePresentationAcceptance(responseData, classification.intent, evalContext);
    responseData.acceptanceGate = {
      status: acceptance.status,
      isValid: acceptance.isValid,
      blockersCount: acceptance.blockersCount,
      warningsCount: acceptance.warningsCount,
      blockers: acceptance.blockers,
      warnings: acceptance.warnings
    };
    const DELIVERABLE_BLOCKABLE_INTENTS = new Set([
      'BOQ_EVALUATION', 'RFP_SIZING_TO_BOM', 'BOM_RECONCILIATION',
      'CROSS_VENDOR_TRANSFORMATION', 'HETEROGENEOUS_TENDER_MODERNIZATION',
      'LEAST_DELTA_SYNTHESIS', 'PRESALES_CLEARANCE_STRATEGY'
    ]);
    if (acceptance.isValid === false && DELIVERABLE_BLOCKABLE_INTENTS.has(classification.intent)) {
      responseData.deliveryBlocked = true;
      if (!responseData.customerDisposition || responseData.customerDisposition === 'PRESENTATION_READY') {
        responseData.customerDisposition = 'DELIVERY_BLOCKED_ACCEPTANCE_FAILED';
      }
    }
  } catch (error) {
    responseData.acceptanceGate = {
      status: 'ERROR', isValid: false, blockersCount: 1, warningsCount: 0,
      blockers: [{ id: 'ACCEPTANCE_ERROR', detail: error.message }]
    };
  }
}

function _attachQueryPlanIfAvailable(envelope, queryText, context) {
  try {
    const { planPresalesQuery } = require('../lib/boq/presales_query_planner.js');
    if (typeof planPresalesQuery === 'function') {
      const plan = planPresalesQuery(queryText, context);
      try {
        const { buildCompoundExecutionPlan } = require('../lib/boq/compound_execution.js');
        if (typeof buildCompoundExecutionPlan === 'function') {
          plan.compoundExecutionPlan = buildCompoundExecutionPlan(plan, context, {
            requirementAccounting: context?.requirementAccounting || envelope?.result?.requirementAccounting || null
          });
        }
      } catch { /* non-blocking if compound planner fails on malformed inputs */ }
      Object.defineProperty(envelope, 'queryPlan', {
        value: plan,
        enumerable: Boolean(context.includeQueryPlan),
        configurable: true
      });
    }
  } catch { /* ignore planner errors on malformed inputs */ }
}

async function _executeClassifiedOrAbortDispatch(classification, queryText, context, chassisInfoForConf, unresolvedAmbiguity, traceId) {
  if (context.signal?.aborted) {
    const abortErr = context.signal.reason instanceof Error
      ? context.signal.reason
      : new Error(String(context.signal.reason || 'Workflow cancelled'));
    abortErr.name = 'AbortError';
    return { confidence: 0.40, classificationBasis: 'AMBIGUOUS_QUERY', responseData: _buildDispatchErrorResponse(abortErr, context, classification, traceId) };
  }
  if (unresolvedAmbiguity) {
    return { confidence: 0.40, classificationBasis: 'AMBIGUOUS_QUERY', responseData: _buildAmbiguityResponse(queryText, classification, chassisInfoForConf, traceId) };
  }
  const scored = _deriveClassificationConfidence(queryText, context, classification, chassisInfoForConf);
  try {
    const responseData = await _dispatchIntentHandler(classification, queryText, context, chassisInfoForConf);
    if (context.signal?.aborted && responseData && typeof responseData === 'object') {
      responseData.status = 'CANCELLED';
      responseData.cancellationRequested = true;
    }
    return { ...scored, responseData };
  } catch (dispatchErr) {
    return { ...scored, responseData: _buildDispatchErrorResponse(dispatchErr, context, classification, traceId) };
  }
}

function _performReasoningSafe(queryText, context, classification, responseData, traceId, executionTimeMs) {
  try {
    const { performReasoningPostAnalysis } = require('../lib/system/reasoning_post_analyzer.js');
    return performReasoningPostAnalysis({
      queryText,
      context: { ...context, persistLedger: Boolean(context.persistLedger) },
      classification,
      responseData,
      traceId,
      executionTimeMs
    });
  } catch {
    if (responseData && typeof responseData === 'object' && !responseData.traceStatus) {
      responseData.traceStatus = responseData.evidenceLogPath ? 'PERSISTED_EVIDENCE_LEDGER' : 'CORRELATION_ONLY_NO_PERSISTED_LEDGER';
    }
    return null;
  }
}

function _routedEnvelopeScope(classification, context, responseData, chassisInfoForConf, unresolvedAmbiguity, dispatched) {
  const resolvedFilePlatform = (classification.intent === 'BOQ_EVALUATION' && context.filePath &&
    responseData?.chassis && !['UNKNOWN', 'UNKNOWN_PRODUCT'].includes(responseData.chassis))
    ? responseData.chassis
    : null;
  const resolvedCatalog = classification.intent === 'CATALOG_INTELLIGENCE'
    ? responseData?.chassis
    : (classification.intent === 'SOLUTION_COMPARISON' && Array.isArray(responseData?.comparedPlatforms) && responseData.comparedPlatforms.length > 0
      ? responseData.comparedPlatforms.join(',')
      : null);
  const confidence = resolvedCatalog === context.chassisName && resolvedCatalog ? 1 : dispatched.confidence;
  const resolvedPlatform = resolvedCatalog || (chassisInfoForConf && !chassisInfoForConf.isAmbiguous ? chassisInfoForConf.chassisKey : null) || resolvedFilePlatform;
  const isAmbiguous = resolvedFilePlatform ? false : (Boolean(chassisInfoForConf?.isAmbiguous) || unresolvedAmbiguity);
  return { resolvedPlatform, confidence, isAmbiguous };
}

async function _executeLegacyRoutedQuery(queryText = '', context = {}) {
  const resolvedPolicy = _resolveContextPolicy(context, { defaultOffline: false });
  context = {
    ...context,
    effectivePolicy: resolvedPolicy,
    offline: resolvedPolicy.offline,
    offlineMode: resolvedPolicy.offline,
    ...(resolvedPolicy.offline ? { enableCloudValidation: false } : {})
  };
  context.catalogSearchRequest = context.filePath || context.file ? null : _compileCatalogSearch(queryText, context);
  const classification = classifyQueryIntent(queryText, context, context.catalogSearchRequest);
  const startTime = Date.now();
  const { platformSelectionMemory, updatedContext, chassisInfoForConf, unresolvedAmbiguity } =
    _resolveRoutedPlatform(queryText, context, classification);
  context = updatedContext;
  let traceId = context.traceId || resolveEntryTraceId(() => `TRC-${Date.now()}-${require('crypto').randomBytes(3).toString('hex').toUpperCase()}`);
  context.traceId = traceId;

  const dispatched = await _executeClassifiedOrAbortDispatch(classification, queryText, context, chassisInfoForConf, unresolvedAmbiguity, traceId);
  const responseData = dispatched.responseData;
  traceId = responseData?.traceId || traceId;
  if (responseData && typeof responseData === 'object' && !responseData.traceId) responseData.traceId = traceId;

  _attachAcceptanceGate(responseData, classification, context, chassisInfoForConf);
  const executionTimeMs = Date.now() - startTime;
  const reasoningAnalysis = _performReasoningSafe(queryText, context, classification, responseData, traceId, executionTimeMs);

  const effectivePolicy = responseData?.effectivePolicy || resolvedPolicy;
  context.effectivePolicy = effectivePolicy;
  const { resolvedPlatform, confidence, isAmbiguous } = _routedEnvelopeScope(
    classification, context, responseData, chassisInfoForConf, unresolvedAmbiguity, dispatched
  );
  const envelope = {
    query: queryText,
    classification,
    effectivePolicy,
    result: responseData,
    reasoningAnalysis,
    traceId,
    executionTimeMs,
    classificationConfidence: confidence,
    hitlRequired: isAmbiguous || confidence < 0.75 || responseData?.requiresHumanClarification === true,
    platformSelectionMemory,
    resolvedPlatform,
    ambiguityDetails: isAmbiguous ? {
      error: chassisInfoForConf?.error,
      candidates: chassisInfoForConf?.candidates || chassisInfoForConf?.availableCatalogs || [],
      chassisKey: chassisInfoForConf?.chassisKey
    } : null,
    classificationBasis: dispatched.classificationBasis
  };

  _attachQueryPlanIfAvailable(envelope, queryText, context);
  try {
    if (context.skipTelemetry !== true) {
      const { recordRoutedQueryTelemetry } = require('../lib/system/telemetry.js');
      recordRoutedQueryTelemetry(envelope, {
        persist: context.persistTelemetry !== false,
        telemetryFile: context.telemetryFile
      });
    }
  } catch { /* telemetry recording must never abort routed presales responses */ }
  return envelope;
}

function _parseCliRouteArgs(args) {
  let queryText = '';
  const context = {};
  let jsonOutput = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) context.filePath = path.resolve(args[++i]);
    else if (args[i] === '--secondary-file' && args[i + 1]) context.secondaryFilePath = path.resolve(args[++i]);
    else if (args[i] === '--vendor' && args[i + 1]) context.vendorFilePath = path.resolve(args[++i]);
    else if (args[i] === '--customer' && args[i + 1]) context.customerFilePath = path.resolve(args[++i]);
    else if (args[i] === '--chassis' && args[i + 1]) context.chassisName = args[++i];
    else if ((args[i] === '--nodes' || args[i] === '--multiplier') && args[i + 1]) {
      context.nodeMultiplier = parseInt(args[++i], 10);
      context.nodes = context.nodeMultiplier;
    } else if ((args[i] === '--platform' || args[i] === '--target-platform') && args[i + 1]) {
      context.targetPlatform = args[++i];
    } else if (args[i] === '--json') jsonOutput = true;
    else if (args[i] === '--offline') { context.offline = true; context.offlineMode = true; }
    else if (args[i] === '--no-quarantine') context.skipQuarantine = true;
    else if (!args[i].startsWith('--')) queryText = queryText ? `${queryText} ${args[i]}` : args[i];
  }
  return { queryText, context, jsonOutput };
}

if (require.main === module) {
  const { queryText, context, jsonOutput } = _parseCliRouteArgs(process.argv.slice(2));
  if (!queryText && !context.filePath && !context.vendorFilePath) {
    console.log('Usage: node scripts/evaluators/route_query.js "<query_text>" [--file <path>] [--secondary-file <path>] [--vendor <path>] [--customer <path>] [--chassis <name>] [--platform <name>] [--nodes <n>] [--offline] [--json]');
    process.exit(0);
  }
  executeRoutedQuery(queryText, context)
    .then(res => {
      if (jsonOutput) {
        console.log(JSON.stringify(res, null, 2));
      } else {
        console.log('\n===============================================================');
        console.log(`🎯 PRESALES QUERY ROUTER: [${res.classification.intent}] (Confidence: ${(res.classification.confidence * 100).toFixed(1)}%)`);
        console.log(`📌 Target Skill: ${res.classification.skillTarget}`);
        console.log(`💡 Rationale: ${res.classification.rationale}`);
        console.log(`⏱️ Execution Time: ${res.executionTimeMs}ms`);
        console.log('---------------------------------------------------------------');
        console.log('RESULT SUMMARY:');
        console.dir(res.result, { depth: 3, colors: true });
        console.log('===============================================================\n');
      }
    })
    .catch(err => {
      console.error(`Execution error: ${err.message}`);
      process.exit(1);
    });
}

module.exports = {
  classifyQueryIntent,
  executeRoutedQuery,
  getChassisCatalog,
  _isOfflineContext
};
