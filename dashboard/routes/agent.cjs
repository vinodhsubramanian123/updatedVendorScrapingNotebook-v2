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
const ARCH_RULE_QUERY_RE = /\b(require|requirement|mandatory|cable\s*kit|can\s+i|how\s+many|rules?|compatible|compatibility|explain|why|must|support|enablement)\b/i;

function _isDeterministicSufficient(detResult, queryText = '') {
  const status = detResult?.result?.status;
  const intent = detResult?.classification?.intent;
  const conf = Number(detResult?.classification?.confidence ?? 0);
  if (['ERROR', 'FAILED', 'ACTION_REQUIRED', 'REQUIRES_HUMAN_CLARIFICATION'].includes(status)) return false;
  if (intent === 'FREEFORM_QA') return false;
  if (intent === 'CATALOG_INTELLIGENCE' && ARCH_RULE_QUERY_RE.test(String(queryText || ''))) return false;
  return conf >= 0.85;
}

function _extractClarificationPrompt(detResult, agentAnswer) {
  const res = detResult?.result || {};
  const candidates = res.candidates || res.platforms || [];
  if (res.code === 'PLATFORM_CLARIFICATION_REQUIRED' && Array.isArray(candidates) && candidates.length > 0) {
    return {
      type: 'PLATFORM_CHOICE',
      question: res.question || res.message || 'Confirm target platform:',
      options: candidates.map(c => (typeof c === 'string' ? c : (c.label || c.chassis || c.id))).filter(Boolean)
    };
  }
  if (Array.isArray(res.missingRequirements) && res.missingRequirements.length > 0) {
    return {
      type: 'MISSING_REQUIREMENTS',
      question: res.message || 'Provide missing sizing/workload details to complete build:',
      options: res.missingRequirements.slice(0, 6)
    };
  }
  const match = String(agentAnswer || '').match(/Confirmation Needed:\s*([\s\S]+?)(?:\n\n|$)/i);
  if (match) {
    const opts = match[1].split(/\r?\n/).map(l => l.replace(/^[-*\d.)\s]+/, '').trim()).filter(Boolean).slice(0, 5);
    if (opts.length > 0) return { type: 'AGENT_CONFIRMATION', question: 'Confirm or clarify with Antigravity:', options: opts };
  }
  return null;
}

function _buildProviderFallbackNotice(requestedMode, modeUsed, effectivePolicy, copilotRes, agyRes) {
  if (effectivePolicy?.offline || requestedMode === 'DETERMINISTIC') return null;
  if (requestedMode === 'GEMINI_AGENT' && modeUsed !== 'GEMINI_AGENT' && copilotRes?.status && copilotRes.status !== 'SUCCESS') {
    return `Gemini Copilot could not complete (${copilotRes.status}${copilotRes.error ? `: ${copilotRes.error}` : ''}); showing Tier-1 deterministic output.`;
  }
  if (requestedMode === 'AGY_DEEP' && modeUsed !== 'AGY_DEEP' && agyRes?.status && agyRes.status !== 'SUCCESS') {
    return `Antigravity Deep did not complete (${agyRes.status}${agyRes.error ? `: ${agyRes.error}` : ''}); showing fallback tier (${modeUsed}).`;
  }
  return null;
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
    copilotStatus: copilotRes?.status || null,
    copilotError: copilotRes?.error || null,
    copilotConfidence: copilotRes?.confidence ?? null,
    agentAnswer,
    toolCallsUsed: copilotRes?.toolCallsUsed || [],
    agyEscalated: modeUsed === 'AGY_DEEP',
    agyStatus: agyRes?.status || null,
    agyError: agyRes?.error || null,
    agyConversationId: agyRes?.conversationId || null,
    providerFallbackNotice: _buildProviderFallbackNotice(requestedMode, modeUsed, effectivePolicy, copilotRes, agyRes),
    clarificationPrompt: _extractClarificationPrompt(detResult, agentAnswer)
  };
}

async function _executeThreeTierPipeline({
  effectiveQuery, requestedMode, context, runId, agyConversationId, priorTurns, signal, onProgress, onLog, onEvent
}) {
  const tierTrail = ['DETERMINISTIC'];
  const detResult = await executeRoutedQuery(effectiveQuery, { ...context, signal, runId, onProgress: evt => onProgress({ ...evt, tier: 'DETERMINISTIC' }), onLog });
  const effectiveMode = context.effectivePolicy.offline ? 'DETERMINISTIC' : requestedMode;

  if (signal.aborted || effectiveMode === 'DETERMINISTIC' || (effectiveMode === 'SMART_AUTO' && _isDeterministicSufficient(detResult, effectiveQuery))) {
    return { detResult, modeUsed: 'DETERMINISTIC', tierTrail, copilotRes: null, agyRes: null };
  }

  let copilotRes = null;
  if (effectiveMode === 'GEMINI_AGENT' || effectiveMode === 'SMART_AUTO' || effectiveMode === 'AGY_DEEP') {
    tierTrail.push('GEMINI_AGENT');
    copilotRes = await runPresalesCopilot({
      query: effectiveQuery, context, deterministicResult: detResult, priorTurns, onProgress: evt => onProgress({ ...evt, tier: 'GEMINI_AGENT' }), onLog, onEvent
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
      priorTurns,
      conversationId: agyConversationId || null,
      effectivePolicy: context.effectivePolicy,
      signal,
      onEvent,
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
  const { query, mode = 'SMART_AUTO', context: inputContext, agyConversationId, priorTurns } = req.body || {};

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
      priorTurns: Array.isArray(priorTurns) ? priorTurns : [],
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

function _buildFeedbackAnalysisPrompt({ feedbackText, category, chassis, userConfirmation, queryText }) {
  return [
    'Analyze this dashboard user feedback / run correction strictly in read-only mode (do NOT edit repository files).',
    'Do NOT run broad repository searches or tool calls; classify directly from the feedback and context below.',
    `Category: ${category || 'feedback'} | Platform: ${chassis || 'Unspecified'}`,
    queryText ? `Original Presales Query: ${String(queryText).slice(0, 400)}` : '',
    `User Feedback: ${String(feedbackText).trim()}`,
    userConfirmation ? `User Confirmation Reply: ${String(userConfirmation).trim()}` : '',
    'Classify into one of: RULE_DELTA_PROPOSAL (verified hardware compatibility rule), NEEDS_USER_CONFIRMATION (if missing SKU/chassis/evidence), or ENGINEERING_TICKET (UI/code change).',
    'Include one JSON fence with keys: disposition, summary, chassis, affectedSku, requiredDependencySku, ruleUpdate, confirmationQuestion, options (array of strings).'
  ].filter(Boolean).join('\n\n');
}

function _parseAgentFeedbackResponse(rawAnswer, fallbackChassis) {
  const text = String(rawAnswer || '').trim();
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i) || text.match(/(\{[\s\S]*"disposition"[\s\S]*\})/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      return {
        disposition: parsed.disposition || 'ENGINEERING_TICKET',
        summary: parsed.summary || text,
        proposedDelta: parsed.ruleUpdate ? {
          chassis: parsed.chassis || fallbackChassis || 'DL380_Gen12',
          affectedSku: parsed.affectedSku || null,
          requiredDependencySku: parsed.requiredDependencySku || null,
          ruleUpdate: parsed.ruleUpdate
        } : null,
        confirmationPrompt: parsed.confirmationQuestion
          ? { type: 'AGENT_CONFIRMATION', question: parsed.confirmationQuestion, options: Array.isArray(parsed.options) ? parsed.options : [] }
          : null
      };
    } catch (_) {}
  }
  return { disposition: 'NEEDS_USER_CONFIRMATION', summary: text, proposedDelta: null, confirmationPrompt: null };
}

router.post('/feedback/analyze-with-agent', async (req, res) => {
  const policy = policyResolver.resolveEffectivePolicy();
  if (policy.offline) {
    return sendErrorResponse(res, 422, 'Antigravity feedback analysis is disabled in OFFLINE_MODE', { source: 'AGENT_ROUTER', status: 'BLOCKED_OFFLINE' });
  }
  const { feedbackText, category, chassis, queryText, agyConversationId, userConfirmation } = req.body || {};
  if (typeof feedbackText !== 'string' || !feedbackText.trim()) {
    return sendErrorResponse(res, 400, 'feedbackText is required', { source: 'AGENT_ROUTER' });
  }

  const prompt = _buildFeedbackAnalysisPrompt({ feedbackText, category, chassis, queryText, userConfirmation });
  let agentRes = await runAgyEscalation({ query: prompt, conversationId: agyConversationId || null, effectivePolicy: policy, effort: 'low', timeoutMs: 45000 });
  if (agentRes.status !== 'SUCCESS') {
    const copilotFallback = await runPresalesCopilot({ query: prompt, context: { chassisName: chassis, effectivePolicy: policy } });
    if (copilotFallback.status === 'SUCCESS') agentRes = { ...copilotFallback, conversationId: agyConversationId || null };
  }
  if (agentRes.status !== 'SUCCESS' || !agentRes.answer) {
    return res.status(503).json({
      status: agentRes.status || 'UNAVAILABLE',
      error: agentRes.error || 'Neither Antigravity CLI nor Gemini Copilot was able to complete feedback analysis.'
    });
  }
  const parsed = _parseAgentFeedbackResponse(agentRes.answer, chassis);
  res.json({
    status: 'SUCCESS',
    agyConversationId: agentRes.conversationId || agyConversationId || null,
    answer: agentRes.answer,
    ...parsed
  });
});

module.exports = router;
