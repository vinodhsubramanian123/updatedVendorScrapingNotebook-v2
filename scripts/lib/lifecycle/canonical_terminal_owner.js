'use strict';
// Private canonical owner. A branded context is not a delivery authorization.
const fs = require('fs');
const contexts = new WeakMap();
const ledgers = new WeakMap();
const results = new WeakMap();
const failures = new WeakMap();
const primitiveFailures = new Map();
const serializerContexts = new WeakMap();

function selectPipeline(legacy, owned) {
  return process.env.PRESALES_TERMINAL_OWNER === '1' ? owned() : legacy();
}

function serializerContext(context, serializer) {
  const state = contexts.get(context);
  if (state) serializerContexts.set(serializer, state);
  return serializer;
}

function prepareDeliverables(context, legacy, notebookHealth) {
  const state = contexts.get(context);
  if (!state) return legacy();
  results.set(context.evalResults, state);
  return notebookHealth();
}

function serializerSync(context, callback) {
  const state = serializerContexts.get(context);
  if (!state) return callback();
  state.sync = callback;
}

function serializerLedgerCompletion(context, completeArtifacts, completeTerminal) {
  completeArtifacts();
  if (!serializerContexts.has(context)) return completeTerminal();
}

function serializerEmission(context, callback) {
  const state = serializerContexts.get(context);
  if (!state) return callback();
  if (state.emit) throw new Error('Canonical terminal emission already registered');
  state.emit = callback;
}

function recordExporterFailure(result, error) {
  const state = results.get(result);
  if (state) state.exportError = { value: error };
}

function phase8Outcome(context, legacyOutcome) {
  const state = contexts.get(context);
  if (!state) return legacyOutcome;
  if (state.exportError) throw state.exportError.value;
  const result = context.evalResults;
  const plannedBlock = plannedDeliveryBlock(result);
  if (result.deliveryError && !plannedBlock) throw new Error(result.deliveryError);
  return legacyOutcome;
}

function plannedDeliveryBlock(result) {
  return result.acceptanceGate?.isValid === false || Boolean(result.deliveryAuthError) ||
    /Presentation export blocked:/.test(result.deliveryError || '');
}

function recordReflectionTarget(ledger, directory) {
  const state = ledgers.get(ledger);
  if (!state) return;
  if (!directory || !fs.existsSync(directory)) state.reflectionFaults.push('REFLECTION_TARGET_UNAVAILABLE');
}

function recordReflectionProposal(ledger, certificate) {
  const state = ledgers.get(ledger);
  if (state && !certificate?.persisted) state.reflectionFaults.push('LEARNING_PROPOSAL_NOT_PERSISTED');
}

function recordReflectionFailure(ledger) {
  const state = ledgers.get(ledger);
  if (state) state.reflectionFaults.push('LEARNING_PROPOSAL_FAILED');
}

function syncOutcome(context) {
  const sync = context.evalResults.postFlowSync;
  const requested = Boolean(context.options.SYNC_RAG);
  const offline = Boolean(context.options.OFFLINE_MODE || context.options.DEFER_RAG);
  if (offline) return { status: 'SKIPPED', skipReason: 'Cloud synchronization disabled by offline/deferred policy', policyCode: 'POLICY_OFFLINE_SKIP' };
  if (!sync && !requested) return { status: 'SKIPPED', skipReason: 'Cloud synchronization was not requested', policyCode: 'POLICY_NO_SYNC_REQUESTED' };
  if (sync?.success === true && sync.syncStatus === 'CLOUD_VERIFIED') return { status: 'PASSED' };
  if (!requested && sync?.success === true && sync.syncStatus === 'LOCAL_PAYLOAD_ONLY') return { status: 'PASSED' };
  return { status: 'ACTION_REQUIRED' };
}

async function runReflection(context, reflect, priceDrift) {
  const state = contexts.get(context);
  state.ledger.startPhase(9, 'Continuous Learning Reflection & Shared State Export', {});
  context.evalResults.newLearningsCount = reflect();
  priceDrift();
  if (!state.sync) throw new Error('Canonical phase 8 did not register synchronization work');
  await state.sync();
  const sync = syncOutcome(context);
  const status = state.reflectionFaults.length || sync.status === 'ACTION_REQUIRED' ? 'ACTION_REQUIRED' : 'PASSED';
  return { status, summary: { newLearningsCount: context.evalResults.newLearningsCount,
    postFlowSync: context.evalResults.postFlowSync || null, priceDrift: context.evalResults.priceDriftResult || null,
    localReflection: { status: state.reflectionFaults.length ? 'ACTION_REQUIRED' : 'PASSED', faults: [...state.reflectionFaults] },
    cloudSynchronization: sync }, checks: [
    { status: state.reflectionFaults.length ? 'WARN' : 'PASS', label: 'Actual local knowledge reflection completed' },
    { status: sync.status === 'ACTION_REQUIRED' ? 'WARN' : 'PASS', label: 'Cloud synchronization outcome recorded separately' }
  ] };
}

function errorMessage(error) {
  try { return typeof error?.message === 'string' ? error.message : String(error); } catch { return 'UNREADABLE_PRIMARY_ERROR'; }
}

function abortIfRequested(options) {
  const signal = options.signal;
  if (!signal) return;
  const aborted = Object.getOwnPropertyDescriptor(AbortSignal.prototype, 'aborted').get.call(signal);
  if (aborted) throw Object.getOwnPropertyDescriptor(AbortSignal.prototype, 'reason').get.call(signal);
}

function completeEvidence(state, record, pending) {
  const status = record.status === 'WARNED' ? 'WARNING' : record.status;
  const summary = { ...pending?.summary, ...record.outputSummary };
  if (!state.ledger.phases[`phase_${record.phaseNum}`]) state.ledger.startPhase(record.phaseNum, record.name, record.inputSummary);
  state.complete(record.phaseNum, status, summary, record.checklistItems, record.warnings, record.errors);
}

function canonicalHealth(state, originalHealth) {
  const base = originalHealth();
  const gaps = [...base.gaps];
  for (const phase of Object.values(state.ledger.phases)) {
    if (['NOT_RUN', 'NOT_REACHED'].includes(phase.status)) gaps.push(`PHASE_${phase.phaseNumber}_UNFINISHED`);
  }
  const lifecycle = state.engine.getHealth();
  return { healthy: gaps.length === 0 && lifecycle.healthy && base.workflowStatus === 'COMPLETE', gaps,
    workflowStatus: lifecycle.failures.length ? 'FAILED' : base.workflowStatus };
}

function requestedPhaseStatus(ledger, number, fallback) {
  return ledgers.get(ledger)?.pendingPhases?.get(number)?.status || fallback;
}

function installPhaseAdapter(state, handlers) {
  const ledger = state.ledger;
  state.complete = ledger.completePhase.bind(ledger);
  const pending = new Map();
  state.pendingPhases = pending;
  ledger.completePhase = (number, status, summary = {}, checks = [], warnings = [], errors = []) => {
    if (pending.has(number)) throw new Error(`Duplicate canonical phase completion request: ${number}`);
    pending.set(number, phaseRequest(state, number, { status, summary, checks, warnings, errors }));
  };
  const completeLifecycle = state.engine.completePhase.bind(state.engine);
  state.engine.completePhase = (id, status, summary, checks, warnings = [], errors = []) => {
    const phase = state.engine._findPhase(id);
    const requested = pending.get(phase.phaseNum);
    const effective = completeLifecycle(id, requested?.errors.length ? 'FAILED' : status, summary,
      [...new Set([...(requested?.checks || []), ...(checks || [])])], [...(requested?.warnings || []), ...warnings],
      [...(requested?.errors || []), ...errors]);
    pending.delete(phase.phaseNum);
    completeEvidence(state, effective, requested);
    return effective;
  };
  const originalHealth = ledger.getHealth.bind(ledger);
  ledger.getHealth = () => canonicalHealth(state, originalHealth);
  return Object.fromEntries(Object.entries(handlers).map(([id, handler]) => [id, async context => {
    await new Promise(resolve => setImmediate(resolve));
    abortIfRequested(state.options);
    return handler(context);
  }]));
}

function phaseRequest(state, number, requested) {
  if (number !== 8 || !plannedDeliveryBlock(state.context.evalResults)) return requested;
  return { ...requested, status: 'ACTION_REQUIRED', errors: [],
    summary: { ...requested.summary, deliveryError: state.context.evalResults.deliveryError || null },
    warnings: [...requested.warnings, ...requested.errors] };
}

function failRunningPhase(engine, phase, error, legacy) {
  if (!contexts.has(engine)) return legacy();
  try {
    if (engine.executedPhases.get(phase.id)?.status === 'RUNNING') engine.completePhase(phase.id, 'FAILED', { error: errorMessage(error) }, [], [], [errorMessage(error)]);
  } catch { /* Secondary lifecycle/evidence faults cannot replace the primary. */ }
}

function noteFailure(state, error) {
  const message = errorMessage(error);
  try { state.ledger.recordWorkflowFailure({ message }); } catch { /* Secondary. */ }
  for (let number = 1; number <= 9; number++) {
    try {
      const phase = state.ledger.phases[`phase_${number}`];
      if (!phase) {
        state.ledger.startPhase(number, `Phase ${number}`, {});
        state.complete(number, 'NOT_REACHED', { upstreamFailure: message }, [], [], [message]);
      } else if (phase.status === 'RUNNING') state.complete(number, 'FAILED', {}, [], [], [message]);
    } catch { /* Best effort only; no false terminal success. */ }
  }
  let exported;
  if (!state.sealAttempted) {
    state.sealAttempted = true;
    try { exported = state.ledger.finalizeAndExport(state.evidenceDir || state.options.evidenceDir); } catch { /* Original remains primary. */ }
  }
  const metadata = { traceId: state.ledger.traceId, evidenceLogPath: exported?.jsonPath || null, terminalEmissionAttempted: state.emissionAttempted,
    status: state.options.signal?.aborted && Object.is(error, state.options.signal.reason) ? 'CANCELLED' : 'ERROR' };
  if (error && (typeof error === 'object' || typeof error === 'function')) {
    failures.set(error, metadata);
    try { error.traceId = metadata.traceId; error.evidenceLogPath = metadata.evidenceLogPath; } catch { /* Frozen primary stays exact. */ }
  } else {
    if (primitiveFailures.size >= 64) primitiveFailures.delete(primitiveFailures.keys().next().value);
    primitiveFailures.set(error, metadata);
  }
}

function failureMetadata(error) { return failures.get(error) || primitiveFailures.get(error) || null; }

function reportCliFailure(error, jsonMode, legacy) {
  const metadata = failureMetadata(error);
  if (!metadata) return legacy();
  if (metadata.terminalEmissionAttempted) return;
  if (jsonMode) process.stdout.write('\n__EVAL_RESULT_JSON__' + JSON.stringify({ status: metadata.status, error: errorMessage(error),
    data: { traceId: metadata.traceId || null, evidenceLogPath: metadata.evidenceLogPath || null } }) + '__EVAL_RESULT_JSON__\n');
  else console.error('Fatal evaluation error:', error);
}

async function executeOwnedPipeline(configuration) {
  const state = { options: configuration.options, reflectionFaults: [], sealAttempted: false, emissionAttempted: false };
  try {
    state.ledger = configuration.createLedger();
    state.engine = configuration.createEngine();
    const context = configuration.createContext(state.ledger);
    state.context = context;
    contexts.set(context, state); contexts.set(state.engine, state); ledgers.set(state.ledger, state);
    const handlers = installPhaseAdapter(state, configuration.createHandlers(state.ledger));
    const health = await state.engine.executePipelineDAG(context, handlers);
    const result = context.evalResults;
    result.lifecycleEngine = state.engine; result.lifecycleHealth = health;
    await new Promise(resolve => setImmediate(resolve));
    abortIfRequested(state.options);
    if (!state.emit) throw new Error('Canonical serializer did not register terminal emission');
    state.sealAttempted = true;
    const exported = state.ledger.finalizeAndExport(state.evidenceDir || state.options.evidenceDir);
    result.evidenceLogPath = exported.jsonPath; result.evidenceSummaryPath = exported.mdPath; result.evidenceHealth = exported.payload.health;
    state.emissionAttempted = true;
    state.emit();
    return result;
  } catch (error) {
    if (state.ledger && state.complete) noteFailure(state, error);
    throw error;
  }
}

function setEvidenceDirectory(serializer, directory) {
  const state = serializerContexts.get(serializer);
  if (state) state.evidenceDir = directory;
}

module.exports = { requestedPhaseStatus, selectPipeline, executeOwnedPipeline, serializerContext, prepareDeliverables, serializerSync,
  serializerLedgerCompletion, serializerEmission, recordExporterFailure, phase8Outcome, recordReflectionTarget,
  recordReflectionProposal, recordReflectionFailure, runReflection, failRunningPhase, failureMetadata, setEvidenceDirectory, reportCliFailure };
