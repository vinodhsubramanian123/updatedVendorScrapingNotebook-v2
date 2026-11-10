/** Present execution evidence without converting an absent result into a passing stage. */
const STEP_IDS = { LOAD: 1, CLEANING: 1, VALIDATION: 2, RANKING: 5, POST_VERIFICATION: 3 };

function workflowStep(id, state) {
  return state.evalResults?.workflowSteps?.find(step => step.stepId === STEP_IDS[id]);
}

function translateStatus(status) {
  if (['PASSED', 'PASS', 'COMPLETED', 'CLOUD_VERIFIED'].includes(status)) return 'COMPLETED';
  if (['FAILED', 'FAIL', 'ERROR', 'CANCELLED'].includes(status)) return 'FAILED';
  if (['RUNNING', 'IN_PROGRESS'].includes(status)) return 'RUNNING';
  if (['SKIPPED', 'NOT_RUN', 'NOT_EVALUATED', 'NOT_REACHED'].includes(status)) return 'SKIPPED';
  return 'WARNING';
}

function validationStatus(result) {
  const checks = result.aspectChecks || [];
  if (!checks.length) return 'WARNING';
  if (checks.some(check => ['FAIL', 'FAILED'].includes(check.status))) return 'WARNING';
  return checks.every(check => ['PASS', 'PASSED', 'NOT_APPLICABLE'].includes(check.status)) ? 'COMPLETED' : 'WARNING';
}

function finalStageStatus(id, state) {
  const result = state.evalResults;
  if (id === 'RECONCILIATION') return state.auditReport ? (state.auditReport.is100PercentMatch === true ? 'COMPLETED' : 'WARNING') : 'READY';
  if (id === 'NOTEBOOK_SYNC') {
    if (state.isTaskRunning && state.activeProgress?.task === 'KNOWLEDGE_SYNC') return 'RUNNING';
    return result?.postFlowSync ? translateStatus(result.postFlowSync.syncStatus) : 'READY';
  }
  if (!result) return 'READY';
  if (['ERROR', 'CANCELLED'].includes(result.status)) return 'FAILED';
  if (result.clarificationRequired) return 'WARNING';
  if (id === 'VALIDATION') return validationStatus(result);
  if (id === 'POST_VERIFICATION') return result.ephemeralSourceValidation?.success === true ? 'COMPLETED' : 'WARNING';
  if (id === 'SOLUTION_PRESENTATION') return result.customerDisposition === 'PRESENTATION_READY' ? 'COMPLETED' : 'WARNING';
  if (id === 'TELEMETRY') return result.traceId ? 'COMPLETED' : 'WARNING';
  if (id === 'RANKING' && !(result.rankedSolutions?.length > 0)) return 'WARNING';
  const step = workflowStep(id, state);
  return step ? translateStatus(step.status) : 'WARNING';
}

export function deriveEvidenceStatus(id, state) {
  // Structured progress identifies the actual running step; earlier step numbers
  // alone do not prove those stages passed.
  if (state.isTaskRunning && state.activeProgress?.task === 'EVAL_BOQ') {
    const running = { LOAD: 1, CLEANING: 2, VALIDATION: 3, RANKING: 4, POST_VERIFICATION: 5 };
    if (state.activeProgress.currentStep === running[id]) return 'RUNNING';
  }
  return finalStageStatus(id, state);
}

function validationMetrics(result) {
    const checks = result?.aspectChecks || [];
    return { 'Checks passed': checks.filter(check => ['PASS', 'PASSED'].includes(check.status)).length,
      'Checks reported': checks.length, 'Physical rules': result?.conflictGraph?.totalRulesEvaluated ?? 'Unknown' };
}

export function deriveEvidenceMetrics(id, state) {
  const result = state.evalResults;
  if (id === 'VALIDATION') return validationMetrics(result);
  if (id === 'RANKING') return { 'Candidate tiers': result?.rankedSolutions?.length ?? 0, 'Confidence': result?.confidence?.score ?? 'Not assessed' };
  if (id === 'POST_VERIFICATION') return { 'Candidate review': result?.ephemeralSourceValidation?.success === true ? 'Recorded' : 'Pending',
    'Guardrail': result?.agenticReviewStatus ?? 'NOT_RUN' };
  if (id === 'SOLUTION_PRESENTATION') return { 'Disposition': result?.customerDisposition ?? 'Not evaluated', 'Vendor acceptance': result?.portalValidationStatus ?? 'PENDING' };
  if (id === 'NOTEBOOK_SYNC') return { 'Sync status': result?.postFlowSync?.syncStatus ?? 'Not verified', 'Product': result?.chassis ?? state.selectedChassis ?? 'Unknown' };
  if (id === 'RECONCILIATION') return { 'Quote match': state.auditReport?.is100PercentMatch === true ? 'Rows matched' : 'Pending or differences require review' };
  if (id === 'TELEMETRY') return { 'Trace': result?.traceId ?? 'Unavailable' };
  return workflowStep(id, state)?.metrics || { 'Status': result ? 'No stage metrics reported' : 'Awaiting input' };
}

export function deriveEvidenceDuration(id, state) {
  const duration = workflowStep(id, state)?.durationMs;
  return Number.isFinite(duration) && duration >= 0 ? duration : null;
}

export function isEvidenceStageTerminal(id, state) {
  if (id === 'RECONCILIATION') return Boolean(state.auditReport);
  if (id === 'TELEMETRY') return Boolean(state.evalResults?.traceId);
  if (id === 'NOTEBOOK_SYNC') return ['LOCAL_PAYLOAD_ONLY', 'CLOUD_VERIFIED', 'CLOUD_FAILED', 'SKIPPED'].includes(state.evalResults?.postFlowSync?.syncStatus);
  if (id === 'SOLUTION_PRESENTATION') return Boolean(state.evalResults?.customerDisposition);
  const status = workflowStep(id, state)?.status;
  return ['COMPLETED', 'WARNING', 'FAILED', 'SKIPPED', 'LOCAL_FALLBACK', 'CLOUD_VERIFIED'].includes(status);
}
