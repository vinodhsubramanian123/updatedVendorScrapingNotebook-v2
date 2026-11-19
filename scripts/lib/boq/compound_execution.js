'use strict';

/**
 * scripts/lib/boq/compound_execution.js
 *
 * Compound Execution Planner & Once-Only Workflow Executor:
 * - Adapts planPresalesQuery output + optional requirementAccounting into ordered compound steps
 * - Enforces negative exclusions (do not export, without cloud sync, etc.), prerequisites, and owner scope
 * - Qualifies the 6 core objective paths independently without blanket execution
 * - Enforces exact once-only per-step invocation via invocationLedger, AbortSignal cancellation,
 *   and structured originalError preservation when observer/reflection/reporting hooks fail.
 */

const crypto = require('crypto');
const { planPresalesQuery } = require('./presales_query_planner.js');

const SCHEMA_VERSION = '1.0';

const CORE_OBJECTIVE_PATHS = Object.freeze([
  'BOQ_EVALUATION',
  'RFP_SIZING_TO_BOM',
  'OCR_QUOTE_INGESTION',
  'BOM_RECONCILIATION',
  'CROSS_VENDOR_TRANSFORMATION',
  'HETEROGENEOUS_TENDER_MODERNIZATION'
]);

function _hasAnyBomInput(context, priorOps) {
  return Boolean(
    (Array.isArray(context.items) && context.items.length > 0) ||
    context.filePath ||
    context.file ||
    priorOps.has('OCR_QUOTE_INGESTION')
  );
}

function _qualifyBoqEvaluation(context, _plan, priorOps) {
  const missing = [];
  if (!_hasAnyBomInput(context, priorOps)) missing.push('BOM_INPUT_PRESENT');
  return {
    path: 'BOQ_EVALUATION',
    prerequisites: ['BOM_INPUT_PRESENT'],
    missingPrerequisites: missing,
    blocked: missing.length > 0,
    blockerCode: missing.length > 0 ? 'BOQ_INPUT_REQUIRED' : null,
    mode: priorOps.has('OCR_QUOTE_INGESTION') ? 'OCR_TO_BOQ_EVALUATION' : 'DIRECT_BOQ_EVALUATION'
  };
}

function _qualifyRfpSizing(context, plan) {
  const hasDemand = Boolean(
    String(plan.source?.queryText || '').trim() ||
    context.requirements ||
    context.requirementAccounting?.records?.length
  );
  const missing = hasDemand ? [] : ['SIZING_REQUIREMENTS_PRESENT'];
  return {
    path: 'RFP_SIZING_TO_BOM',
    prerequisites: ['SIZING_REQUIREMENTS_PRESENT'],
    missingPrerequisites: missing,
    blocked: missing.length > 0,
    blockerCode: missing.length > 0 ? 'SIZING_REQUIREMENTS_REQUIRED' : null,
    mode: 'SIZING_SYNTHESIS'
  };
}

function _qualifyOcrIngestion(context, plan) {
  const sourcePath = plan.inputModality?.sourcePath || context.filePath || context.file || null;
  const offline = context.offline === true || context.offlineMode === true;
  const missing = [];
  if (!sourcePath) missing.push('OCR_SOURCE_PRESENT');
  if (offline) missing.push('ONLINE_OCR_PERMITTED');
  const blockerCode = !sourcePath ? 'OCR_SOURCE_REQUIRED' : (offline ? 'OFFLINE_OCR_BLOCKED' : null);
  return {
    path: 'OCR_QUOTE_INGESTION',
    prerequisites: ['OCR_SOURCE_PRESENT', 'ONLINE_OCR_PERMITTED'],
    missingPrerequisites: missing,
    blocked: missing.length > 0,
    blockerCode,
    mode: 'MULTIMODAL_OCR_INTAKE'
  };
}

function _hasPrimaryReconciliationInput(context, priorOps) {
  if (context.filePath || context.file || context.vendorFilePath) return true;
  if (Array.isArray(context.items) && context.items.length > 0) return true;
  return priorOps.has('OCR_QUOTE_INGESTION');
}

function _hasSecondaryReconciliationBaseline(context) {
  if (context.secondaryFilePath || context.customerFilePath || context.proposedSolution) return true;
  if (context.baselineProvided === true) return true;
  return Array.isArray(context.baselineItems) && context.baselineItems.length > 0;
}

function _qualifyBomReconciliation(context, priorOps) {
  const hasPrimary = _hasPrimaryReconciliationInput(context, priorOps);
  const hasSecondary = _hasSecondaryReconciliationBaseline(context);
  const singleAudit = context.reconciliationMode === 'SINGLE_FILE_AUDIT';
  const missing = [];
  if (!hasPrimary) missing.push('PRIMARY_QUOTE_INPUT_PRESENT');
  if (!hasSecondary && !singleAudit) missing.push('SECONDARY_BASELINE_OR_SINGLE_FILE_AUDIT');
  let blockerCode = null;
  if (!hasPrimary) blockerCode = 'RECONCILIATION_PRIMARY_INPUT_REQUIRED';
  else if (!hasSecondary && !singleAudit) blockerCode = 'RECONCILIATION_BASELINE_UNCONFIRMED';
  const mode = singleAudit ? 'SINGLE_FILE_AUDIT' : (hasSecondary ? 'TWO_BASELINE_COMPARISON' : 'BASELINE_UNCONFIRMED');
  return {
    path: 'BOM_RECONCILIATION',
    prerequisites: ['PRIMARY_QUOTE_INPUT_PRESENT', 'SECONDARY_BASELINE_OR_SINGLE_FILE_AUDIT'],
    missingPrerequisites: missing,
    blocked: missing.length > 0,
    blockerCode,
    mode
  };
}

function _qualifyCrossVendor(context, plan) {
  const hasCompetitorInput = Boolean(
    context.competitorSpec ||
    (Array.isArray(context.sourceItems) && context.sourceItems.length > 0) ||
    context.filePath ||
    context.file ||
    plan.scope?.vendorHint ||
    /\b(?:dell|cisco|lenovo|supermicro|huawei)\b/i.test(plan.source?.queryText || '')
  );
  const missing = hasCompetitorInput ? [] : ['COMPETITOR_INPUT_PRESENT'];
  return {
    path: 'CROSS_VENDOR_TRANSFORMATION',
    prerequisites: ['COMPETITOR_INPUT_PRESENT'],
    missingPrerequisites: missing,
    blocked: missing.length > 0,
    blockerCode: missing.length > 0 ? 'COMPETITOR_SOURCE_REQUIRED' : null,
    mode: 'SOURCE_TO_HPE_TRANSPILATION'
  };
}

function _qualifyHeterogeneous(context) {
  const hasTables = Boolean(
    (Array.isArray(context.tables) && context.tables.length > 0) ||
    (Array.isArray(context.sheets) && context.sheets.length > 0) ||
    (Array.isArray(context.items) && context.items.length > 0) ||
    context.filePath ||
    context.file
  );
  const missing = hasTables ? [] : ['STRUCTURED_TENDER_TABLES_PRESENT'];
  return {
    path: 'HETEROGENEOUS_TENDER_MODERNIZATION',
    prerequisites: ['STRUCTURED_TENDER_TABLES_PRESENT'],
    missingPrerequisites: missing,
    blocked: missing.length > 0,
    blockerCode: missing.length > 0 ? 'STRUCTURED_TENDER_REQUIRED' : null,
    mode: 'MULTI_DOMAIN_OWNER_PRESERVED'
  };
}

function _qualifyTransformOrSupport(operation, context, priorOps) {
  if (operation === 'REMARKS_RECONCILIATION') {
    const ok = priorOps.has('BOM_RECONCILIATION') || Boolean((Array.isArray(context.rows) && context.rows.length > 0) || context.auditReport);
    return {
      path: operation,
      prerequisites: ['RECONCILIATION_OR_ROWS_PRESENT'],
      missingPrerequisites: ok ? [] : ['RECONCILIATION_OR_ROWS_PRESENT'],
      blocked: !ok,
      blockerCode: ok ? null : 'RECONCILIATION_REQUIRED_BEFORE_REMARKS',
      mode: 'COMMERCIAL_REMARKS'
    };
  }
  if (operation === 'WORKBOOK_GENERATION') {
    const ok = ['BOQ_EVALUATION', 'BOM_RECONCILIATION', 'RFP_SIZING_TO_BOM', 'CROSS_VENDOR_TRANSFORMATION', 'HETEROGENEOUS_TENDER_MODERNIZATION']
      .some(p => priorOps.has(p)) || Boolean((Array.isArray(context.items) && context.items.length > 0) || context.evalResults);
    return {
      path: operation,
      prerequisites: ['EVALUATED_OR_RECONCILED_CANDIDATE'],
      missingPrerequisites: ok ? [] : ['EVALUATED_OR_RECONCILED_CANDIDATE'],
      blocked: !ok,
      blockerCode: ok ? null : 'CANDIDATE_REQUIRED_BEFORE_EXPORT',
      mode: 'AUTHORIZED_WORKBOOK_EXPORT'
    };
  }
  return {
    path: operation,
    prerequisites: [],
    missingPrerequisites: [],
    blocked: false,
    blockerCode: null,
    mode: 'STANDARD_CAPABILITY'
  };
}

function qualifyObjectivePath(operation, context = {}, plan = {}, priorOps = new Set()) {
  let raw;
  if (operation === 'BOQ_EVALUATION') raw = _qualifyBoqEvaluation(context, plan, priorOps);
  else if (operation === 'RFP_SIZING_TO_BOM') raw = _qualifyRfpSizing(context, plan);
  else if (operation === 'OCR_QUOTE_INGESTION') raw = _qualifyOcrIngestion(context, plan);
  else if (operation === 'BOM_RECONCILIATION') raw = _qualifyBomReconciliation(context, priorOps);
  else if (operation === 'CROSS_VENDOR_TRANSFORMATION') raw = _qualifyCrossVendor(context, plan);
  else if (operation === 'HETEROGENEOUS_TENDER_MODERNIZATION') raw = _qualifyHeterogeneous(context);
  else raw = _qualifyTransformOrSupport(operation, context, priorOps);

  return {
    ...raw,
    qualified: !raw.blocked,
    status: raw.blocked ? 'BLOCKED_PREREQUISITE' : 'QUALIFIED'
  };
}

function _buildOwnerScope(plan, context, accounting) {
  const scope = plan.scope || {};
  const records = Array.isArray(accounting?.records) ? accounting.records : [];
  const scopedReqIds = records.filter(r => r && r.id).map(r => r.id);
  return {
    owner: context.owner || context.configurationName || null,
    chassisHint: scope.chassisHint || context.chassisName || context.targetPlatform || null,
    vendorHint: scope.vendorHint || context.vendor || context.sourceVendor || null,
    nodeCounts: Array.isArray(scope.nodeCounts) ? [...scope.nodeCounts] : [],
    scopeKind: scope.kind || 'UNRESOLVED',
    requirementIds: scopedReqIds
  };
}

const EXCLUDED_OP_MATCHERS = [
  [/export|excel|workbook|generat/i, 'WORKBOOK_GENERATION'],
  [/sync/i, 'KNOWLEDGE_SYNC'],
  [/convert|convers|cross[\s-]*vendor|transpil/i, 'CROSS_VENDOR_TRANSFORMATION'],
  [/reconcil/i, 'BOM_RECONCILIATION'],
  [/optimiz|value[\s-]*engineering/i, 'VALUE_ENGINEERING'],
  [/evaluat|validat/i, 'BOQ_EVALUATION'],
  [/install/i, 'INSTALLATION_SERVICE']
];

function _inferExcludedOperationFromText(rawText = '') {
  const found = EXCLUDED_OP_MATCHERS.find(([re]) => re.test(rawText));
  return found ? found[1] : null;
}

function _exclusionDedupKey(entry) {
  return `${entry.operation || ''}::${entry.rawText || ''}::${entry.requirementId || ''}`;
}

function _mergeExclusions(plan, accounting) {
  const fromPlan = Array.isArray(plan.exclusions) ? plan.exclusions : [];
  const seen = new Set(fromPlan.map(_exclusionDedupKey));
  const out = [...fromPlan];
  for (const rec of (accounting?.records || [])) {
    if (!rec || rec.hardness !== 'EXCLUSION') continue;
    const entry = {
      source: 'REQUIREMENT_ACCOUNTING',
      operation: _inferExcludedOperationFromText(rec.rawText),
      rawText: rec.rawText || '',
      requirementId: rec.id || null,
      excludedSku: null,
      excludedCategory: null
    };
    const key = _exclusionDedupKey(entry);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
  }
  return out;
}

function _deriveOrderedOperations(plan, excludedOps) {
  if (Array.isArray(plan.orderedOperations) && plan.orderedOperations.length > 0) {
    return plan.orderedOperations.filter(entry => entry && entry.operation && !excludedOps.has(entry.operation));
  }
  const rawOps = [
    ...(plan.inputModality?.inspectionRequired || plan.inputModality?.requestedOcr ? ['OCR_QUOTE_INGESTION'] : []),
    ...(plan.objective ? [plan.objective] : []),
    ...(Array.isArray(plan.transforms) ? plan.transforms : [])
  ];
  const uniqueOps = [...new Set(rawOps)].filter(op => op && !excludedOps.has(op));
  return uniqueOps.map((operation, idx) => ({
    sequence: idx + 1,
    operation,
    role: operation === 'OCR_QUOTE_INGESTION' ? 'MODALITY' : (operation === plan.objective ? 'OBJECTIVE' : 'TRANSFORM'),
    source: 'FALLBACK_PLAN_ORDER'
  }));
}

function _buildExcludedSteps(exclusions) {
  return exclusions
    .filter(e => e.operation)
    .map(e => ({
      operation: e.operation,
      source: e.source,
      requirementId: e.requirementId || null,
      rawText: e.rawText || '',
      status: 'EXCLUDED_BY_REQUIREMENT'
    }));
}

function _buildExecutionSteps(ordered, ctx, plan, ownerScope) {
  const priorOps = new Set();
  return ordered.map((entry, idx) => {
    const qualification = qualifyObjectivePath(entry.operation, ctx, plan, priorOps);
    if (!qualification.blocked) priorOps.add(entry.operation);
    return {
      stepId: `STEP-${String(idx + 1).padStart(2, '0')}-${entry.operation}`,
      sequence: idx + 1,
      operation: entry.operation,
      role: entry.role || 'OBJECTIVE',
      orderSource: entry.source || 'TEXT_ORDER',
      ownerScope,
      qualification,
      prerequisites: qualification.prerequisites,
      missingPrerequisites: qualification.missingPrerequisites,
      blocked: qualification.blocked,
      blockerCode: qualification.blockerCode,
      status: qualification.blocked ? 'BLOCKED_PREREQUISITE' : 'READY'
    };
  });
}

function _buildPathQualifications(steps, ctx, plan) {
  const pathQualifications = {};
  for (const op of CORE_OBJECTIVE_PATHS) {
    const existing = steps.find(s => s.operation === op);
    pathQualifications[op] = existing ? existing.qualification : qualifyObjectivePath(op, ctx, plan, new Set());
  }
  return pathQualifications;
}

function _resolveSourcePlanAndContext(planOrQuery, context) {
  const plan = typeof planOrQuery === 'string'
    ? planPresalesQuery(planOrQuery, context)
    : (planOrQuery && typeof planOrQuery === 'object' ? planOrQuery : planPresalesQuery('', context));
  const hasExplicitCtx = context && Object.keys(context).length > 0;
  const ctx = hasExplicitCtx ? context : (plan.source?.context || {});
  return { plan, ctx };
}

function buildCompoundExecutionPlan(planOrQuery, context = {}, options = {}) {
  const { plan, ctx } = _resolveSourcePlanAndContext(planOrQuery, context);
  const accounting = options.requirementAccounting || ctx.requirementAccounting || null;
  const exclusions = _mergeExclusions(plan, accounting);
  const excludedOps = new Set(exclusions.map(e => e.operation).filter(Boolean));
  const excludedSteps = _buildExcludedSteps(exclusions);
  const ownerScope = _buildOwnerScope(plan, ctx, accounting);
  const steps = _buildExecutionSteps(_deriveOrderedOperations(plan, excludedOps), ctx, plan, ownerScope);
  const pathQualifications = _buildPathQualifications(steps, ctx, plan);
  const blockingReasons = steps
    .filter(s => s.blocked)
    .map(s => ({ stepId: s.stepId, operation: s.operation, blockerCode: s.blockerCode, missingPrerequisites: s.missingPrerequisites }));
  const requirementRevisionSha256 = accounting?.inputRevisionSha256 || plan.requirementRevisionSha256 || null;
  const planId = crypto.createHash('sha256')
    .update(JSON.stringify({ objective: plan.objective, steps: steps.map(s => s.operation), excluded: [...excludedOps], requirementRevisionSha256 }))
    .digest('hex')
    .slice(0, 16);

  return {
    schemaVersion: SCHEMA_VERSION,
    planId,
    objective: plan.objective || null,
    requirementRevisionSha256,
    ownerScope,
    exclusions,
    excludedOperations: [...excludedOps],
    excludedSteps,
    steps,
    pathQualifications,
    blocked: blockingReasons.length > 0,
    blockingReasons,
    dispatchReady: steps.length > 0 && blockingReasons.length === 0
  };
}

function _toStructuredError(err, step = null) {
  return {
    name: err?.name || 'Error',
    message: err?.message || String(err),
    code: err?.code || null,
    stepId: step?.stepId || null,
    operation: step?.operation || null
  };
}

async function _runSafeHooks(options, payload, observerErrors) {
  for (const hookName of ['onObserve', 'onReflect', 'onReport']) {
    const fn = options[hookName];
    if (typeof fn !== 'function') continue;
    try {
      await fn(payload);
    } catch (hookErr) {
      observerErrors.push({
        hook: hookName,
        name: hookErr?.name || 'Error',
        message: hookErr?.message || String(hookErr),
        code: hookErr?.code || null
      });
    }
  }
}

function _buildWorkflowEnvelope(fields) {
  return {
    schemaVersion: SCHEMA_VERSION,
    planId: fields.plan.planId,
    status: fields.status,
    blockerCode: fields.blockerCode || null,
    completedSteps: fields.completedSteps,
    failedStep: fields.failedStep || null,
    blockedStep: fields.blockedStep || null,
    stepResults: fields.stepResults,
    invocationLedger: fields.invocationLedger,
    singleInvocationEnforced: true,
    originalError: fields.originalError || null,
    observerErrors: fields.observerErrors,
    cancelled: Boolean(fields.cancelled),
    plan: fields.plan
  };
}

function _markRemainingCancelled(steps, startIdx, invocationLedger) {
  for (let i = startIdx; i < steps.length; i++) {
    const s = steps[i];
    if (!invocationLedger[s.stepId]) {
      invocationLedger[s.stepId] = { stepId: s.stepId, operation: s.operation, invocations: 0, status: 'CANCELLED' };
    }
  }
}

async function _invokeStepOnce(step, stepContext, handlers, executeStep, invocationLedger) {
  const existing = invocationLedger[step.stepId];
  if (existing && existing.invocations >= 1) {
    const dupErr = new Error(`DUPLICATE_STEP_INVOCATION_BLOCKED: Step ${step.stepId} already invoked once.`);
    dupErr.code = 'DUPLICATE_STEP_INVOCATION_BLOCKED';
    throw dupErr;
  }
  const fn = handlers[step.operation] || executeStep;
  if (typeof fn !== 'function') {
    const missErr = new Error(`MISSING_STEP_HANDLER: No handler supplied for ${step.operation}.`);
    missErr.code = 'MISSING_STEP_HANDLER';
    throw missErr;
  }
  invocationLedger[step.stepId] = {
    stepId: step.stepId,
    operation: step.operation,
    invocations: 1,
    status: 'RUNNING',
    ownerScope: step.ownerScope
  };
  return await fn(step, stepContext);
}

function _propagateStepArtifacts(stepContext, result) {
  if (!result || typeof result !== 'object') return;
  if (Array.isArray(result.items) && result.items.length > 0) stepContext.items = result.items;
  if (result.auditReport) stepContext.auditReport = result.auditReport;
  if (result.evaluation) stepContext.evalResults = result.evaluation;
  if (result.evaluatedSolution) stepContext.evalResults = result.evaluatedSolution;
  if (Array.isArray(result.rows)) stepContext.rows = result.rows;
}

function _resolveCompoundPlan(planOrQuery, context, options) {
  if (planOrQuery && typeof planOrQuery === 'object' && Array.isArray(planOrQuery.steps) && planOrQuery.planId) {
    return planOrQuery;
  }
  return buildCompoundExecutionPlan(planOrQuery, context, options);
}

async function _handleStepFailure(err, step, state, options) {
  if (state.invocationLedger[step.stepId]) state.invocationLedger[step.stepId].status = 'FAILED';
  const originalError = _toStructuredError(err, step);
  const out = _buildWorkflowEnvelope({
    plan: state.plan, status: 'FAILED', completedSteps: state.completedSteps, failedStep: step.stepId,
    stepResults: state.stepResults, invocationLedger: state.invocationLedger, originalError, observerErrors: state.observerErrors
  });
  await _runSafeHooks(options, out, state.observerErrors);
  if (options.throwOnError === true) {
    try { err.originalError = originalError; err.observerErrors = state.observerErrors; } catch { /* ignore frozen */ }
    throw err;
  }
  return out;
}

async function _runSingleWorkflowStep(step, index, state, options) {
  if (state.signal?.aborted) {
    _markRemainingCancelled(state.plan.steps, index, state.invocationLedger);
    const out = _buildWorkflowEnvelope({ ...state, status: 'CANCELLED', cancelled: true });
    await _runSafeHooks(options, out, state.observerErrors);
    return out;
  }
  if (step.blocked) {
    state.invocationLedger[step.stepId] = { stepId: step.stepId, operation: step.operation, invocations: 0, status: 'BLOCKED_PREREQUISITE', blockerCode: step.blockerCode };
    const out = _buildWorkflowEnvelope({ ...state, status: 'BLOCKED', blockerCode: step.blockerCode || 'BLOCKED_PREREQUISITE', blockedStep: step });
    await _runSafeHooks(options, out, state.observerErrors);
    return out;
  }
  try {
    const result = await _invokeStepOnce(step, state.stepContext, state.handlers, options.executeStep, state.invocationLedger);
    state.invocationLedger[step.stepId].status = 'COMPLETED';
    state.stepResults[step.operation] = result;
    state.completedSteps.push(step.stepId);
    _propagateStepArtifacts(state.stepContext, result);
    return null;
  } catch (err) {
    return _handleStepFailure(err, step, state, options);
  }
}

async function executeCompoundWorkflow(planOrQuery, context = {}, options = {}) {
  const plan = _resolveCompoundPlan(planOrQuery, context, options);
  const stepResults = {};
  const state = {
    plan,
    signal: options.signal || context.signal || null,
    handlers: options.handlers || options.stepHandlers || {},
    invocationLedger: options.invocationLedger || {},
    stepResults,
    completedSteps: [],
    observerErrors: [],
    stepContext: { ...context, previousResults: stepResults, requirementRevisionSha256: plan.requirementRevisionSha256 }
  };

  if (plan.steps.length === 0 && !(plan.excludedOperations && plan.excludedOperations.length > 0)) {
    const out = _buildWorkflowEnvelope({ ...state, status: 'BLOCKED', blockerCode: 'UNRESOLVED_NO_STEPS' });
    await _runSafeHooks(options, out, state.observerErrors);
    return out;
  }

  for (let i = 0; i < plan.steps.length; i++) {
    const haltOutcome = await _runSingleWorkflowStep(plan.steps[i], i, state, options);
    if (haltOutcome) return haltOutcome;
  }

  const finalStatus = state.signal?.aborted ? 'CANCELLED' : 'COMPLETED';
  const out = _buildWorkflowEnvelope({ ...state, status: finalStatus, cancelled: finalStatus === 'CANCELLED' });
  await _runSafeHooks(options, out, state.observerErrors);
  return out;
}

module.exports = {
  SCHEMA_VERSION,
  CORE_OBJECTIVE_PATHS,
  qualifyObjectivePath,
  buildCompoundExecutionPlan,
  executeCompoundWorkflow
};
