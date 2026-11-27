'use strict';
/**
 * scripts/lib/rag/presales_copilot_agent.js — Tier-2 Native Gemini Tool-Calling Copilot
 *
 * Executes read-only presales reasoning using rotating Gemini API keys and model routing
 * before escalating low-confidence or ambiguous cases to Tier-3 `agy` deep reasoning.
 */

const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
const rotator = require('../system/gemini_rotator.js');
const { createChat, sendGuardrailMessage } = require('./guardrail_transport.js');
const { isServerOffline } = require('../system/policy_resolver.js');
const { executeRoutedQuery } = require('../../evaluators/route_query.js');
const { computeFullPlatformEnvelope } = require('../rules/hardware_envelope_solver.js');
const { loadAllProductManifests } = require('../rules/product_manifest_loader.js');
const { listVendorAdapters } = require('../adapters/adapter_registry.js');
const { queryLocalKnowledgeBase } = require('./local_rag_search.js');
const { compareSkuAcrossSolutions } = require('../catalog/cross_solution_pricing.js');
const { resolveChassisDirectory } = require('../catalog/sku_versioning.js');
const { executeNotebookQuery, getNotebookConfigEntry } = require('../notebook/notebook_query_utils.js');

const COPILOT_TOOL_DECLARATIONS = [
  {
    name: 'run_routed_query',
    description: 'Run deterministic presales query router for BOQ sizing, SKU search, price drift, or comparison.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Presales query text' },
        platform: { type: 'STRING', description: 'Optional HPE product key such as DL380_Gen12' }
      },
      required: ['query']
    }
  },
  {
    name: 'query_hardware_envelope',
    description: 'Compute deterministic min/max hardware bounds (CPUs, OCP, PCIe risers, GPUs, DIMMs, drives, PSUs).',
    parameters: {
      type: 'OBJECT',
      properties: {
        platform: { type: 'STRING', description: 'Platform ID such as DL380_Gen12 or DL360_Gen12' },
        category: { type: 'STRING', description: 'Optional hardware category filter' },
        cpuCount: { type: 'NUMBER', description: 'Optional socket count (1 or 2)' }
      },
      required: ['platform']
    }
  },
  {
    name: 'list_product_manifests',
    description: 'List all validated HPE product capability manifests and their domain/formFactor metadata.',
    parameters: { type: 'OBJECT', properties: {} }
  },
  {
    name: 'list_vendor_adapters',
    description: 'List supported cross-vendor adapters (HPE, DELL, HUAWEI, CISCO, LENOVO) and evidence limits.',
    parameters: { type: 'OBJECT', properties: {} }
  },
  {
    name: 'search_local_knowledge',
    description: 'Search local QuickSpecs markdown knowledge snippets for a product line.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Technical search terms' },
        product: { type: 'STRING', description: 'Product ID or chassis name' }
      },
      required: ['query']
    }
  },
  {
    name: 'compare_sku_prices',
    description: 'Look up SKU price and availability variance across all scraped HPE solutions.',
    parameters: {
      type: 'OBJECT',
      properties: { sku: { type: 'STRING', description: 'HPE SKU such as P73282-B21' } },
      required: ['sku']
    }
  },
  {
    name: 'query_notebooklm_quickspecs',
    description: 'Query official vendor QuickSpecs documentation via NotebookLM for a product line (falls back to local index when offline).',
    parameters: {
      type: 'OBJECT',
      properties: {
        product: { type: 'STRING', description: 'Product ID such as DL360_Gen12 or DL380_Gen12' },
        query: { type: 'STRING', description: 'Technical QuickSpecs compatibility question' }
      },
      required: ['query']
    }
  }
];

function _runEnvelopeTool(args = {}) {
  const platform = String(args.platform || '').trim();
  if (!platform) return { error: 'platform is required' };
  const dir = resolveChassisDirectory(platform);
  const files = dir && fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  const catalogFile = files.find(f => /Catalog\.json$/i.test(f));
  const catalogPath = catalogFile ? path.join(dir, catalogFile) : null;
  if (!catalogPath) return { error: `Catalog not found for ${platform}` };
  const raw = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const entries = Array.isArray(raw) ? raw : (raw.entries || []);
  return computeFullPlatformEnvelope(platform, { entries, metadata: raw.metadata || {} }, {
    category: args.category,
    cpuCount: args.cpuCount ? Number(args.cpuCount) : undefined
  });
}

async function _runQuickSpecsTool(args = {}, context = {}) {
  const product = String(args.product || context.chassisName || '').trim();
  const question = String(args.query || '').trim();
  if (!question) return { error: 'query is required' };
  const offline = isServerOffline() || context?.offline === true || context?.effectivePolicy?.offline === true;
  const entry = product ? getNotebookConfigEntry(product) : null;
  if (!offline && entry?.notebookId) {
    try {
      return await executeNotebookQuery(entry.notebookId, question, {
        context: { chassis: product },
        offline: false,
        effectivePolicy: context.effectivePolicy
      });
    } catch (_) { /* fall through to local knowledge base */ }
  }
  return queryLocalKnowledgeBase(question, product);
}

async function _executeCopilotTool(name, args = {}, context = {}) {
  if (name === 'query_hardware_envelope') return _runEnvelopeTool(args);
  if (name === 'list_product_manifests') {
    return Array.from(loadAllProductManifests().values()).map(m => ({
      productId: m.productId, domain: m.domain, family: m.family, formFactor: m.formFactor
    }));
  }
  if (name === 'list_vendor_adapters') return listVendorAdapters();
  if (name === 'search_local_knowledge') return queryLocalKnowledgeBase(args.query || '', args.product || context.chassisName || '');
  if (name === 'compare_sku_prices') return compareSkuAcrossSolutions(String(args.sku || '').trim());
  if (name === 'query_notebooklm_quickspecs') return _runQuickSpecsTool(args, context);
  if (name === 'run_routed_query') {
    return executeRoutedQuery(String(args.query || ''), {
      ...context,
      chassisName: args.platform || context.chassisName,
      onProgress: undefined,
      onLog: undefined
    });
  }
  return { error: `Unknown tool: ${name}` };
}

function _formatPriorTurnsPrompt(priorTurns = []) {
  if (!Array.isArray(priorTurns) || priorTurns.length === 0) return '';
  const summaryLines = priorTurns.slice(-3).map((t, idx) => (
    `Turn ${idx + 1} Q: ${String(t.query || '').slice(0, 180)}\nTurn ${idx + 1} A: ${String(t.summary || t.answer || '').slice(0, 260)}`
  ));
  return `\nConversation History:\n${summaryLines.join('\n')}`;
}

function _buildCopilotSystemPrompt(deterministicResult, priorTurns = []) {
  const detJson = deterministicResult ? JSON.stringify({
    intent: deterministicResult.classification?.intent,
    status: deterministicResult.result?.status,
    missingRequirements: deterministicResult.result?.missingRequirements,
    message: deterministicResult.result?.message || deterministicResult.result?.error
  }).slice(0, 1400) : 'none';

  return [
    'You are the HPE ProLiant AI Studio Presales Copilot (Tier-2 Gemini Agent).',
    'Never fabricate SKUs, prices, lead times, or OCA CLIC acceptance.',
    'Keep Tier-3 vendor acceptance status explicitly PORTAL VALIDATION PENDING when no live receipt exists.',
    'Always inspect deterministic tools and/or QuickSpecs before concluding bounds, pricing, cable kits, or cross-vendor parity.',
    'If user confirmation is needed before finalizing a configuration, include a short "Confirmation Needed:" section with bulleted options.',
    `Initial Tier-1 Deterministic Context: ${detJson}${_formatPriorTurnsPrompt(priorTurns)}`
  ].join('\n');
}

function evaluateCopilotEscalation({ deterministicResult, answer, toolCallsUsed = [] }) {
  const status = deterministicResult?.result?.status;
  let confidence = typeof deterministicResult?.classification?.confidence === 'number'
    ? deterministicResult.classification.confidence
    : 0.78;
  const trimmed = String(answer || '').trim();

  if (trimmed.length >= 60 && status === 'SUCCESS') confidence = Math.max(confidence, 0.86);
  if (toolCallsUsed.length > 0 && trimmed.length >= 80 && !['ACTION_REQUIRED', 'REQUIRES_HUMAN_CLARIFICATION'].includes(status)) {
    confidence = Math.max(confidence, 0.84);
  }
  if (['REQUIRES_HUMAN_CLARIFICATION', 'ACTION_REQUIRED', 'ERROR', 'FAILED'].includes(status)) {
    confidence = Math.min(confidence, 0.65);
  }
  if (!trimmed || trimmed.length < 40) confidence = Math.min(confidence, 0.45);
  if (/\[OPINION_DISCREPANCY_FLAG\]|\[TRUSTED_WEB_VERIFICATION_REQUIRED\]/i.test(trimmed)) {
    confidence = Math.min(confidence, 0.74);
  }
  const rounded = Number(confidence.toFixed(2));
  return { confidence: rounded, needsDeepEscalation: rounded < 0.8 };
}

function _extractFunctionCalls(response) {
  if (Array.isArray(response?.functionCalls) && response.functionCalls.length > 0) {
    return response.functionCalls;
  }
  const parts = response?.candidates?.[0]?.content?.parts || [];
  return parts.filter(p => p?.functionCall).map(p => p.functionCall);
}

async function _runToolLoop(state, query, context, onEvent, onProgress, maxTurns = 4) {
  const toolCallsUsed = [];
  let promptInput = query;
  let finalText = '';

  for (let turn = 0; turn < maxTurns; turn++) {
    if (context.signal?.aborted) break;
    const maxAttempts = Math.max(8, (state.models?.length || 1) * 3);
    const response = await sendGuardrailMessage(promptInput, state, maxAttempts, Date.now() + 90000, {
      onRecovery: evt => {
        onEvent?.({ type: 'PROVIDER_RECOVERY', ...evt });
        onProgress?.({ percent: 74, stage: 'COPILOT_RECOVERY', action: `${evt.action}: switching to ${evt.model} (HTTP ${evt.status || 'timeout'})` });
      }
    });
    const calls = _extractFunctionCalls(response);
    if (calls.length === 0) {
      finalText = String(response?.text || '').trim();
      break;
    }
    const outputs = [];
    for (const call of calls) {
      if (context.signal?.aborted) break;
      const started = Date.now();
      onEvent?.({ type: 'TOOL_CALL', tool: call.name });
      toolCallsUsed.push({ name: call.name });
      const resData = await _executeCopilotTool(call.name, call.args || {}, context);
      onEvent?.({ type: 'TOOL_RESULT', tool: call.name, durationMs: Date.now() - started, summary: resData?.error ? 'Tool returned an error' : 'Tool returned a result' });
      outputs.push({ functionResponse: { name: call.name, response: { output: resData } } });
    }
    promptInput = outputs;
  }
  return { answer: finalText, toolCallsUsed };
}

function _buildCopilotState(routing, keyInfo, activeApiKey, deterministicResult, priorTurns) {
  const models = [...new Set([
    routing.model,
    ...(Array.isArray(routing.fallbackModels) ? routing.fallbackModels : [])
  ])];
  return {
    model: routing.model,
    models,
    fallbackModels: models,
    apiTimeoutMs: 30000,
    currentApiKey: activeApiKey,
    activeKeyInfo: typeof keyInfo === 'object' ? keyInfo : null,
    systemInstruction: _buildCopilotSystemPrompt(deterministicResult, priorTurns),
    toolDeclarations: COPILOT_TOOL_DECLARATIONS
  };
}

async function runPresalesCopilot({
  query,
  context = {},
  deterministicResult = null,
  priorTurns = [],
  onProgress = null,
  onLog = null,
  onEvent = null,
  _chatRunner = null
} = {}) {
  const blocked = isServerOffline() || context?.offline === true || context?.effectivePolicy?.offline === true;
  if (blocked) {
    return { status: 'BLOCKED_OFFLINE', answer: null, confidence: 0, needsDeepEscalation: false, toolCallsUsed: [] };
  }

  const keyInfo = rotator.getActiveKey();
  const activeApiKey = typeof keyInfo === 'string' ? keyInfo : keyInfo?.apiKey;
  const keysExhausted = Boolean(keyInfo && typeof keyInfo === 'object' && keyInfo.allExhausted);
  if ((!activeApiKey || keysExhausted) && typeof _chatRunner !== 'function') {
    const fallbackEval = evaluateCopilotEscalation({ deterministicResult, answer: '', toolCallsUsed: [] });
    return {
      status: 'UNAVAILABLE',
      answer: null,
      ...fallbackEval,
      toolCallsUsed: [],
      error: keysExhausted ? 'All Gemini API keys are currently exhausted or cooling down' : 'No active Gemini API key available'
    };
  }

  const routing = rotator.resolveModelForTask('reasoning_deep');
  onProgress?.({ percent: 72, stage: 'COPILOT_REASONING', action: `Running Gemini Copilot (${routing.model})` });
  onLog?.(`🤖 [GEMINI_AGENT] Invoking ${routing.model} copilot over tool registry...`);

  let state = null;
  try {
    if (typeof _chatRunner === 'function') {
      const custom = await _chatRunner({ query, context, deterministicResult, model: routing.model, priorTurns });
      const ev = evaluateCopilotEscalation({
        deterministicResult,
        answer: custom?.answer || '',
        toolCallsUsed: custom?.toolCallsUsed || []
      });
      return { status: 'SUCCESS', model: routing.model, recoveryEvents: custom?.recoveryEvents || [], ...ev, ...custom };
    }

    state = _buildCopilotState(routing, keyInfo, activeApiKey, deterministicResult, priorTurns);
    createChat(state, [], cfg => new GoogleGenAI(cfg));
    const loopRes = await _runToolLoop(state, query, context, onEvent, onProgress);
    const ev = evaluateCopilotEscalation({
      deterministicResult,
      answer: loopRes.answer,
      toolCallsUsed: loopRes.toolCallsUsed
    });
    return { status: loopRes.answer ? 'SUCCESS' : 'UNAVAILABLE', model: state.model, recoveryEvents: state.recoveryEvents || [], ...loopRes, ...ev };
  } catch (err) {
    const ev = evaluateCopilotEscalation({ deterministicResult, answer: '', toolCallsUsed: [] });
    onLog?.(`⚠️ [GEMINI_AGENT] Copilot failed safely: ${err.message}`);
    return { status: 'UNAVAILABLE', model: state?.model || routing.model, recoveryEvents: state?.recoveryEvents || [], answer: null, ...ev, toolCallsUsed: [], error: err.message };
  }
}

module.exports = {
  COPILOT_TOOL_DECLARATIONS,
  evaluateCopilotEscalation,
  runPresalesCopilot
};
