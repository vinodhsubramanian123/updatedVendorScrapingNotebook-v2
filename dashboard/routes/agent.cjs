'use strict';
/**
 * dashboard/routes/agent.cjs — 3-Tier Autonomous Presales Agent Runtime Routes
 *
 * Supports:
 *   GET  /api/agent/runtime-status
 *   POST /api/agent/query  (SMART_AUTO | DETERMINISTIC | GEMINI_AGENT | AGY_DEEP)
 */

const express = require('express');
const path = require('path');
const router = express.Router();

const { sendErrorResponse } = require('../services/errorHandler.cjs');
const policyResolver = require('../services/policyResolver.cjs');
const {
  broadcastSSE, isTaskRunning, isCancellationRequested, releaseTaskMutex, _setActiveTask
} = require('../services/taskManager.cjs');
const { resolveQueryContext, _resolveRequestedRunId } = require('./evaluation.cjs');
const { executeRoutedQuery } = require('../../scripts/evaluators/route_query.js');
const { runPresalesCopilot } = require('../../scripts/lib/rag/presales_copilot_agent.js');
const { checkAgyAvailability, runAgyEscalation } = require('../../scripts/lib/rag/agy_escalation_bridge.js');
const { resolveModelForTask, getPoolStatus } = require('../../scripts/lib/system/gemini_rotator.js');

const VALID_MODES = new Set(['SMART_AUTO', 'DETERMINISTIC', 'GEMINI_AGENT', 'AGY_DEEP']);

function _isDeterministicSufficient(detResult) {
  const status = detResult?.result?.status;
  const intent = detResult?.classification?.intent;
  const conf = Number(detResult?.classification?.confidence ?? 0);
  if (['ERROR', 'FAILED', 'ACTION_REQUIRED', 'REQUIRES_HUMAN_CLARIFICATION'].includes(status)) return false;
  if (intent === 'FREEFORM_QA') return false;
  return conf >= 0.85;
}

function _buildAgentResponseEnvelope({
  detResult, runId, effectivePolicy, cancelled,
  requestedMode, modeUsed, tierTrail, copilotRes, agyRes
}) {
  const agentAnswer = agyRes?.answer || copilotRes?.answer || null;
  const baseResult = detResult?.result ? { ...detResult.result } : {};
  if (agentAnswer) {
    baseResult.agentSynthesis = agentAnswer;
  }
  return {
    ...detResult,
    result: baseResult,
    runId,
    effectivePolicy,
    cancellationRequested: cancelled,
    requestedMode,
    modeUsed,
    tierTrail,
    copilotConfidence: copilotRes?.confidence ?? null,
    agentAnswer,
    toolCallsUsed: copilotRes?.toolCallsUsed || [],
    agyEscalated: modeUsed === 'AGY_DEEP',
    agyStatus: agyRes?.status || null,
    agyConversationId: agyRes?.conversationId || null
  };
}

async function _executeThreeTierPipeline({
  effectiveQuery, requestedMode, context, runId, agyConversationId, signal, onProgress, onLog, onEvent
}) {
  const tierTrail = ['DETERMINISTIC'];
  const detResult = await executeRoutedQuery(effectiveQuery, { ...context, signal, runId, onProgress: evt => onProgress({ ...evt, tier: 'DETERMINISTIC' }), onLog });
  const effectiveMode = context.effectivePolicy.offline ? 'DETERMINISTIC' : requestedMode;

  if (signal.aborted || effectiveMode === 'DETERMINISTIC' || (effectiveMode === 'SMART_AUTO' && _isDeterministicSufficient(detResult))) {
    return { detResult, modeUsed: 'DETERMINISTIC', tierTrail, copilotRes: null, agyRes: null };
  }

  let copilotRes = null;
  if (effectiveMode === 'GEMINI_AGENT' || effectiveMode === 'SMART_AUTO' || effectiveMode === 'AGY_DEEP') {
    tierTrail.push('GEMINI_AGENT');
    copilotRes = await runPresalesCopilot({
      query: effectiveQuery, context, deterministicResult: detResult, onProgress: evt => onProgress({ ...evt, tier: 'GEMINI_AGENT' }), onLog, onEvent
    });
  }

  const shouldEscalateAgy = effectiveMode === 'AGY_DEEP'
    || (effectiveMode === 'SMART_AUTO' && Boolean(copilotRes?.needsDeepEscalation));

  let agyRes = null;
  if (shouldEscalateAgy && !signal.aborted) {
    onEvent({ type: 'ESCALATION', tool: 'Antigravity', summary: 'Deep evaluation requested' });
    tierTrail.push('AGY_DEEP');
    onProgress({ stage: 'AGY_ESCALATION', tier: 'AGY_DEEP', action: 'Escalating low-confidence query to Antigravity CLI' });
    agyRes = await runAgyEscalation({
      query: effectiveQuery,
      deterministicResult: detResult,
      copilotSummary: copilotRes?.answer || null,
      conversationId: agyConversationId || null,
      effectivePolicy: context.effectivePolicy,
      signal,
      onLog
    });
  }

  const modeUsed = agyRes?.status === 'SUCCESS'
    ? 'AGY_DEEP'
    : (copilotRes?.status === 'SUCCESS' ? 'GEMINI_AGENT' : 'DETERMINISTIC');

  return { detResult, modeUsed, tierTrail, copilotRes, agyRes };
}

router.get('/agent/runtime-status', (_req, res) => {
  const policy = policyResolver.resolveEffectivePolicy();
  const pool = typeof getPoolStatus === 'function' ? getPoolStatus() : [];
  res.json({
    status: 'READY',
    offlineLocked: policy.offline,
    geminiKeyCount: Array.isArray(pool) ? pool.length : (pool?.totalKeys || 0),
    activeModels: {
      guardrailFast: resolveModelForTask('guardrail_fast').model,
      reasoningDeep: resolveModelForTask('reasoning_deep').model,
      synthesisStructured: resolveModelForTask('synthesis_structured').model
    },
    agy: checkAgyAvailability(),
    supportedModes: Array.from(VALID_MODES)
  });
});

router.post('/agent/query', async (req, res) => {
  if (isTaskRunning()) return sendErrorResponse(res, 409, 'Another workflow is currently running', { source: 'AGENT_ROUTER' });
  const { query, mode = 'SMART_AUTO', context: inputContext, agyConversationId } = req.body || {};

  let context;
  try { context = resolveQueryContext(inputContext || {}); }
  catch (err) { return sendErrorResponse(res, 400, err, { source: 'AGENT_ROUTER' }); }

  const hasAttachedFile = Boolean(context.filePath || context.file || context.secondaryFilePath);
  if ((typeof query !== 'string' || !query.trim()) && !hasAttachedFile) {
    return sendErrorResponse(res, 400, 'Missing query parameter', { source: 'AGENT_ROUTER' });
  }

  const idCheck = _resolveRequestedRunId(req.body?.runId || context.runId, 'agent');
  if (idCheck.errorStatus) {
    return sendErrorResponse(res, idCheck.errorStatus, idCheck.errorMessage, { source: 'AGENT_ROUTER', code: idCheck.errorCode });
  }

  const runId = idCheck.runId;
  context.runId = runId;
  const requestedMode = context.effectivePolicy.offline
    ? 'DETERMINISTIC'
    : (VALID_MODES.has(mode) ? mode : 'SMART_AUTO');

  const startTime = Date.now();
  const abortController = new AbortController();
  const routedProduct = context.chassisName || (context.chassisDir ? path.basename(context.chassisDir) : null);
  _setActiveTask({ type: 'PRESALES_QUERY', runId, startTime, abortController, product: routedProduct });
  broadcastSSE({ type: 'TASK_STARTED', task: 'PRESALES_QUERY', runId, product: routedProduct, tier: 'DETERMINISTIC', effectivePolicy: context.effectivePolicy });

  let code = 1;
  try {
    const onProgress = ({ percent, stage, action, tier }) => broadcastSSE({
      type: 'PROGRESS', task: 'PRESALES_QUERY', runId, percent, currentStep: stage, stage, action, tier
    });
    const onLog = (text) => broadcastSSE({ type: 'LOG', task: 'PRESALES_QUERY', runId, text, stream: 'stdout' });

    const onEvent = event => broadcastSSE({ ...event, task: 'PRESALES_QUERY', runId });
    const out = await _executeThreeTierPipeline({
      effectiveQuery: typeof query === 'string' ? query : '',
      requestedMode, context, runId, agyConversationId,
      signal: abortController.signal, onProgress, onLog, onEvent
    });
    const cancelled = Boolean(abortController.signal.aborted || isCancellationRequested(runId) || out.detResult?.result?.status === 'CANCELLED');
    const payload = _buildAgentResponseEnvelope({
      ...out, runId, effectivePolicy: context.effectivePolicy, cancelled, requestedMode
    });
    const isOfflineBlocked = payload.result?.status === 'OFFLINE_INPUT_REQUIRED';
    code = (['ERROR', 'FAILED'].includes(payload.result?.status) || isOfflineBlocked || cancelled) ? 1 : 0;
    onProgress({ percent: code === 0 ? 100 : undefined, stage: 'ROUTED_COMPLETE', tier: out.modeUsed, action: 'Routed result available' });

    broadcastSSE({ type: 'ROUTED_RESULT', runId, product: routedProduct, effectivePolicy: context.effectivePolicy, data: payload, cancellationRequested: cancelled });
    if (isOfflineBlocked) {
      return res.status(422).json({ ...payload, status: 'OFFLINE_INPUT_REQUIRED', error: payload.result.error });
    }
    return res.json(payload);
  } catch (err) {
    return sendErrorResponse(res, 500, err, { source: 'AGENT_ROUTER' });
  } finally {
    const cancelled = Boolean(abortController.signal.aborted || isCancellationRequested(runId));
    broadcastSSE({ type: 'TASK_COMPLETED', task: 'PRESALES_QUERY', runId, code, durationMs: Date.now() - startTime, cancelled });
    releaseTaskMutex(runId);
  }
});

module.exports = router;
