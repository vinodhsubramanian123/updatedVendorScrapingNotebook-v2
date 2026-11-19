'use strict';
// CP7b engineering observation only; no customer handler dispatch or certification.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { planPresalesQuery } = require('./presales_query_planner.js');
const { safeWriteJsonAtomic } = require('../system/fs_compat.js');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const REPORT_DIR = path.join(REPO_ROOT, 'outputs/history/skill_workflow_excellence/CP7b/shadow');
const text = value => typeof value === 'string' ? value.slice(0, 256) : null;
const list = values => Array.isArray(values) ? values.slice(0, 32).map(text).filter(Boolean) : [];

function projectPlan(plan) {
  return {
    status: text(plan.status), objective: text(plan.objective),
    objectiveCandidates: list(plan.objectiveCandidates), explicitIntent: text(plan.explicitIntent),
    legacyExplicitOverride: plan.legacyExplicitOverride === true,
    requestedCapabilities: list(plan.requestedCapabilities), transforms: list(plan.transforms),
    modality: text(plan.inputModality?.kind),
    scope: { kind: text(plan.scope?.kind), nodeCounts: Array.isArray(plan.scope?.nodeCounts)
      ? plan.scope.nodeCounts.slice(0, 32).filter(Number.isSafeInteger) : [],
    chassisHint: text(plan.scope?.chassisHint), vendorHint: text(plan.scope?.vendorHint),
    resolutionState: 'NOT_VALIDATED' },
    ambiguityCodes: Array.isArray(plan.ambiguities) ? plan.ambiguities.slice(0, 32).map(a => text(a.code)).filter(Boolean) : [],
    execution: { state: 'NOT_EXECUTED', dispatchAllowed: false, deliveryAuthorized: false }
  };
}

function errorObservation(error) {
  // Error messages and arbitrary thrown values can contain customer requirements.
  return { name: text(error?.name), code: text(error?.code) };
}

function sourceFingerprints() {
  const files = ['scripts/evaluators/route_query.js', 'scripts/lib/boq/presales_query_shadow.js',
    'scripts/lib/boq/presales_query_planner.js', 'scripts/lib/boq/presales_query_plan_rules.js'];
  return files.map(file => ({ file, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(REPO_ROOT, file))).digest('hex') }));
}

const SHADOW_CONTRACT = Object.freeze({
  singleInvocationEnforced: true,
  preservesOriginalError: true,
  reportOnly: true
});

function buildObservation(proposal, plannerError, outcome, result, error) {
  const intent = outcome === 'RETURNED' ? text(result?.classification?.intent) : null;
  const differences = [];
  if (proposal && intent && proposal.objective !== intent) differences.push({ code: 'OBJECTIVE_DIFFERENCE', proposed: proposal.objective, legacyClassified: intent });
  if (proposal && intent) {
    for (const capability of proposal.requestedCapabilities.filter(value => value !== intent)) {
      differences.push({ code: 'CAPABILITY_NOT_REPRESENTED_BY_LEGACY_CLASSIFICATION', capability,
        executionObservation: 'NOT_OBSERVABLE' });
    }
  }
  return { schemaVersion: 1, checkpoint: 'CP7b', mode: 'REPORT_ONLY', owner: 'presales-query-router',
    evidenceKind: 'ENGINEERING_OBSERVATION_NOT_SKILL_INVOCATION',
    singleInvocationEnforced: true,
    shadowId: crypto.randomUUID(), observedAt: new Date().toISOString(), sourceFiles: sourceFingerprints(),
    planner: proposal ? { outcome: 'PROPOSED', proposal } : { outcome: 'FAILED', error: plannerError },
    legacy: { outcome, classifiedIntent: intent, traceId: outcome === 'RETURNED' ? text(result?.traceId) : null,
      error: outcome === 'REJECTED' ? errorObservation(error) : null,
      handlerInvocations: 'NOT_OBSERVABLE', childExecution: 'NOT_OBSERVABLE' }, differences };
}

function writeShadowObservation(observation) {
  // Only internally generated UUID filenames; neither input nor context controls paths.
  if (!/^[a-f0-9-]{36}$/.test(observation.shadowId)) throw new Error('Invalid shadow identity');
  return safeWriteJsonAtomic(path.join(REPORT_DIR, `${observation.shadowId}.json`), observation);
}

function _toStructuredErrorDetail(err) {
  return {
    name: text(err?.name) || 'Error',
    message: typeof err?.message === 'string' ? err.message : String(err),
    code: text(err?.code)
  };
}

async function reportSafely(proposal, plannerError, outcome, result, error, sink) {
  let timeout;
  let observerError = null;
  try {
    const pending = sink(buildObservation(proposal, plannerError, outcome, result, error));
    if (pending && typeof pending.then === 'function') {
      const guarded = Promise.resolve(pending).catch(err => {
        observerError = _toStructuredErrorDetail(err);
      });
      await Promise.race([guarded, new Promise(resolve => { timeout = setTimeout(resolve, 50); })]);
    }
  } catch (err) {
    // Observation failures cannot alter legacy results/errors or returned CLI fields.
    observerError = _toStructuredErrorDetail(err);
  } finally { if (timeout) clearTimeout(timeout); }
  return { observed: observerError === null, observerError };
}

function _preserveStructuredErrorMetadata(error, reportOutcome) {
  const originalError = _toStructuredErrorDetail(error);
  const observerErrors = reportOutcome?.observerError ? [reportOutcome.observerError] : [];
  if (error && typeof error === 'object') {
    try {
      if (!Object.hasOwn(error, 'originalError')) {
        Object.defineProperty(error, 'originalError', { value: originalError, configurable: true });
      }
      if (!Object.hasOwn(error, 'observerErrors')) {
        Object.defineProperty(error, 'observerErrors', { value: observerErrors, configurable: true });
      }
      if (!Object.hasOwn(error, 'singleInvocationEnforced')) {
        Object.defineProperty(error, 'singleInvocationEnforced', { value: true, configurable: true });
      }
    } catch { /* preserve frozen errors unmodified */ }
  }
  return { originalError, observerErrors };
}

/** Internal dependency seam. Exactly one legacy callback; never retries dispatch. */
async function executeWithQueryShadow(queryText, context, legacyExecute, options = {}) {
  let proposal = null;
  let plannerError = null;
  try { proposal = projectPlan((options.planner || planPresalesQuery)(queryText, context)); }
  catch (error) { try { plannerError = errorObservation(error); } catch { plannerError = { name: null, code: null }; } }
  let sink = writeShadowObservation;
  let onError = null;
  try {
    sink = options.sink || sink;
    onError = typeof options.onError === 'function' ? options.onError : null;
  } catch {}
  let invoked = false;
  const invokeOnce = () => {
    if (invoked) throw new Error('Shadow single-invocation violation: legacyExecute may only execute once');
    invoked = true;
    return legacyExecute(queryText, context);
  };
  let result;
  try { result = await invokeOnce(); }
  catch (error) {
    const reportOutcome = await reportSafely(proposal, plannerError, 'REJECTED', null, error, sink);
    const preserved = _preserveStructuredErrorMetadata(error, reportOutcome);
    if (onError) { try { onError({ ...preserved, singleInvocationEnforced: true }); } catch {} }
    throw error;
  }
  await reportSafely(proposal, plannerError, 'RETURNED', result, null, sink);
  return result;
}

executeWithQueryShadow.contract = SHADOW_CONTRACT;
executeWithQueryShadow.singleInvocationEnforced = true;

module.exports = { executeWithQueryShadow, writeShadowObservation, SHADOW_CONTRACT };
