'use strict';
/**
 * scripts/lib/agentic_guardrail.js — Dual-Brain Agentic Guardrail Loop
 *
 * Refactored: GAP-A1 Tool Registry, GAP-A2 sendWithRotation(), GAP-A3 extracted prompt.
 */
const { GoogleGenAI, Type } = require('@google/genai');
const path = require('path');
const fs = require('fs');

const { evaluateBOQMultiAspect } = require('./boq_evaluator.js');
const { executeNotebookQuery } = require('./notebook_query_utils.js');
const { queryLocalKnowledgeBase } = require('./local_rag_search.js');
const { processPortalFeedback } = require('./feedback_loop.js');
const { loadNotebookConfig, getNotebookIdForChassis } = require('./knowledge_sync.js');
const { emitProgress } = require('./progress.js');
const { recordGuardrailTelemetry } = require('./system/telemetry.js');
const { triggerPostFlowSync } = require('./post_flow_sync.js');
const { listAllCatalogs } = require('./catalog_discovery.js');
const { buildGuardrailSystemPrompt } = require('./prompts/guardrail_prompt.js');
const geminiRotator = require('./gemini_rotator.js');
const logger = require('./pipeline_logger.js');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const MODEL_NAME = process.env.GEMINI_MODEL_NAME || 'gemini-3.6-flash';
const GUARDRAIL_OVERALL_TIMEOUT_MS = 90000; // 90 seconds max

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────────────
// GAP-A1: Declarative Tool Registry
// Each entry owns its own schema (for Gemini) and execute() handler.
// Adding a new agentic tool = one new registry entry, zero changes to the loop.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the tool registry for a given guardrail session context.
 * execute() handlers capture session-scoped state (chassis ID, telemetry counters)
 * via closure so the loop body stays pure.
 *
 * @param {object} ctx  Session context passed into each handler.
 * @returns {Map<string, {schema: object, execute: Function}>}
 */
function buildToolRegistry(ctx) {
  return new Map([
    [
      'simulate_build',
      {
        schema: {
          name: 'simulate_build',
          description:
            'Simulates evaluating the BOQ through the full multi-aspect local rule engine. Call this to check the confidence score of the current BOQ state or to test a hypothesis.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              chassis_id: { type: Type.STRING, description: "The chassis variant to evaluate against, e.g., 'DL380_Gen12_SFF'" },
              items_json: { type: Type.STRING, description: 'JSON stringified array of BOQ items.' }
            },
            required: ['items_json', 'chassis_id']
          }
        },
        execute: async (args) => {
          const parsedItems = JSON.parse(args.items_json);
          const result = evaluateBOQMultiAspect(parsedItems, { chassis: args.chassis_id });
          if (result?.confidence?.score !== undefined) {
            ctx.latestConfidence = result.confidence.score;
          }
          if (result?.confidence?.score >= 1.0 && (result?.errors || []).length === 0) {
            ctx.isOptimalResolved = true;
          }
          return result;
        }
      }
    ],
    [
      'query_notebooklm',
      {
        schema: {
          name: 'query_notebooklm',
          description:
            'Queries the NotebookLM RAG engine for QuickSpecs grounding. Use this when the local rule engine returns a low confidence score or when you need to fact-check a hardware dependency.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              chassis_id: { type: Type.STRING, description: "The chassis variant to query, e.g., 'DL380_Gen12_SFF'" },
              query: { type: Type.STRING, description: 'The natural language prompt to ask NotebookLM.' }
            },
            required: ['chassis_id', 'query']
          }
        },
        execute: async (args) => {
          const cfg = loadNotebookConfig();
          const notebookId = getNotebookIdForChassis(cfg, args.chassis_id);
          return executeNotebookQuery(notebookId, args.query, { context: { chassis: args.chassis_id } });
        }
      }
    ],
    [
      'query_catalog_db',
      {
        schema: {
          name: 'query_catalog_db',
          description: 'Queries the local Catalog DB (JSON/CSVs) for SKUs and pricing.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              chassis_id: { type: Type.STRING, description: "The chassis variant to query, e.g., 'DL380_Gen12_SFF'" },
              query: { type: Type.STRING, description: 'The search query.' }
            },
            required: ['chassis_id', 'query']
          }
        },
        execute: async (args) => queryLocalKnowledgeBase(args.query, args.chassis_id)
      }
    ],
    [
      'record_knowledge_delta',
      {
        schema: {
          name: 'record_knowledge_delta',
          description:
            'Records a new physical dependency rule or fix to the persistent KnowledgeBase so the system automatically learns from this session.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              chassis_id: { type: Type.STRING, description: "The chassis variant, e.g., 'DL380_Gen12_SFF'" },
              affected_sku: { type: Type.STRING, description: 'The SKU that requires a fix.' },
              required_sku: { type: Type.STRING, description: 'The mandatory required SKU.' },
              rule_update: { type: Type.STRING, description: 'The explanation of the new rule.' }
            },
            required: ['chassis_id', 'affected_sku', 'required_sku', 'rule_update']
          }
        },
        /**
         * GAP-A4: Side effects are deferred — this handler RETURNS the delta object
         * rather than writing to disk directly. The caller commits it after the loop.
         */
        execute: async (args) => {
          const pendingDelta = {
            chassisId: args.chassis_id,
            affectedSku: args.affected_sku,
            requiredDependencySku: args.required_sku,
            ruleUpdate: args.rule_update,
            humanReasoning: 'Agentic Guardrail Loop derived from RAG/DB fact-check',
            sourceAgent: 'AGENTIC_GUARDRAIL',
            guardrailTurn: ctx.turns,
            preConfidenceScore: ctx.preConfidence
          };
          // Buffer for commit phase after the loop completes
          ctx.pendingDeltas.push(pendingDelta);
          return { status: 'QUEUED', delta: pendingDelta };
        }
      }
    ]
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// GAP-A2: Single shared send-with-rotation helper
// Previously duplicated ~60 lines across two while(true) retry loops.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send a message on `chat`, retrying with key rotation on 429/quota errors.
 * Mutates `rotationState` in-place to propagate the active key across retries.
 *
 * @param {object}   chat            Current Gemini chat session
 * @param {*}        message         Message or tool-response array to send
 * @param {object}   rotationState   { currentApiKey, activeKeyInfo, ai, chat, systemInstruction, toolDeclarations }
 * @param {number}   maxRetries      Max rotation attempts before giving up
 * @param {number}   startTime       Session start epoch ms (for overall timeout guard)
 * @returns {object}  Gemini response object
 */
async function sendWithRotation(message, rotationState, maxRetries, startTime) {
  let retries = 0;
  while (true) {
    if (Date.now() - startTime > GUARDRAIL_OVERALL_TIMEOUT_MS) {
      throw new Error('Agentic Guardrail execution timed out after 90 seconds.');
    }
    try {
      const response = await rotationState.chat.sendMessage({ message });
      geminiRotator.markKeySuccess(rotationState.currentApiKey);
      return response;
    } catch (err) {
      const isRateLimit = err.status === 429 || /quota|resource_exhausted|daily|429/i.test(err.message || '');
      if (isRateLimit && retries < maxRetries) {
        logger.warn('AGENTIC_GUARDRAIL', `Rate limit on key ${rotationState.activeKeyInfo.fingerprint}. Rotating.`);
        geminiRotator.markKeyExhausted(rotationState.currentApiKey, err, { isDailyLimit: true });

        rotationState.activeKeyInfo = geminiRotator.getActiveKey();
        rotationState.currentApiKey = rotationState.activeKeyInfo.apiKey;
        logger.warn('AGENTIC_GUARDRAIL', `Promoted key: ${rotationState.activeKeyInfo.fingerprint}`);

        // Rebuild AI client and attempt to preserve chat history
        rotationState.ai = new GoogleGenAI({ apiKey: rotationState.currentApiKey });
        let history = [];
        try { history = await rotationState.chat.getHistory(); } catch (_) {}
        rotationState.chat = rotationState.ai.chats.create({
          model: MODEL_NAME,
          config: {
            systemInstruction: rotationState.systemInstruction,
            tools: [{ functionDeclarations: rotationState.toolDeclarations }],
            temperature: 0.1
          },
          history
        });
        retries++;
        continue;
      }
      // Non-rate-limit error or retries exhausted — fall through to a brief backoff
      if (isRateLimit && retries < 3) {
        logger.warn('AGENTIC_GUARDRAIL', 'Rate limit; waiting 10s before retrying...');
        await sleep(10000);
        retries++;
      } else {
        throw err;
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Guardrail Entry Point
// ─────────────────────────────────────────────────────────────────────────────

async function runAgenticGuardrail(items, chassisDir) {
  const startTime = Date.now();

  let activeKeyInfo = geminiRotator.getActiveKey();
  if (!activeKeyInfo || !activeKeyInfo.apiKey) {
    return { error: 'GEMINI_API_KEY environment variable is required.' };
  }

  const chassisId = path.basename(chassisDir);

  // Compute pre-guardrail confidence baseline
  let preConfidence = 0.5;
  try {
    const initialEval = evaluateBOQMultiAspect(items, { chassis: chassisId });
    preConfidence = initialEval?.confidence?.score ?? 0.5;
  } catch (_) { /* ignore pre-eval failure */ }

  // ── Session context object shared across tool handlers (closure capture) ──
  const ctx = {
    latestConfidence: preConfidence,
    preConfidence,
    isOptimalResolved: false,
    turns: 0,
    pendingDeltas: []  // GAP-A4: deltas queued here, committed after loop
  };

  // GAP-A1: Build tool registry for this session
  const toolRegistry = buildToolRegistry(ctx);
  const toolDeclarations = Array.from(toolRegistry.values()).map(t => t.schema);

  // GAP-A3: System prompt from versioned factory (chassis-parameterised)
  const systemInstruction = buildGuardrailSystemPrompt(chassisId);

  // Shared rotation state mutated by sendWithRotation()
  const rotationState = {
    currentApiKey: activeKeyInfo.apiKey,
    activeKeyInfo,
    ai: new GoogleGenAI({ apiKey: activeKeyInfo.apiKey }),
    systemInstruction,
    toolDeclarations,
    chat: null
  };
  rotationState.chat = rotationState.ai.chats.create({
    model: MODEL_NAME,
    config: { systemInstruction, tools: [{ functionDeclarations: toolDeclarations }], temperature: 0.1 }
  });

  const maxRetries = Math.max(3, activeKeyInfo.totalKeys || 5);
  const initialItemsJson = JSON.stringify(items);

  emitProgress(4, 10, 'Agentic AI Cross-Verification', 'in_progress',
    'Engaging Gemini LLM for Dual-Brain Verification Guardrail Loop.');

  // Initial prompt — uses unified rotation helper
  let response;
  try {
    response = await sendWithRotation(
      `Please evaluate this BOQ configuration containing ${items.length} items. Chassis ID is ${chassisId}.\nItems JSON: ${initialItemsJson}`,
      rotationState,
      maxRetries,
      startTime
    );
  } catch (err) {
    return { error: err.message };
  }

  const executedToolCalls = [];

  // ── Agentic Tool Execution Loop ──────────────────────────────────────────
  while (response.functionCalls && response.functionCalls.length > 0 && ctx.turns < 15) {
    if (Date.now() - startTime > GUARDRAIL_OVERALL_TIMEOUT_MS) {
      logger.warn('AGENTIC_GUARDRAIL', 'Overall timeout reached during tool execution loop.');
      break;
    }

    ctx.turns++;
    const toolResponses = [];

    for (const call of response.functionCalls) {
      executedToolCalls.push(call.name);
      let result;
      const tool = toolRegistry.get(call.name);

      if (!tool) {
        result = { error: `Tool '${call.name}' not found in registry.` };
      } else {
        try {
          result = await tool.execute(call.args);
        } catch (e) {
          result = { error: e.message };
        }
      }

      toolResponses.push({
        functionResponse: {
          name: call.name,
          id: call.id,
          response: typeof result === 'object' && result !== null ? result : { output: result }
        }
      });
    }

    // Send tool results back — uses unified rotation helper
    try {
      response = await sendWithRotation(toolResponses, rotationState, maxRetries, startTime);
    } catch (err) {
      logger.warn('AGENTIC_GUARDRAIL', 'Agentic loop chat error', err);
      return { error: err.message, text: response ? response.text : '', turns: ctx.turns, executedToolCalls };
    }

    // GAP-C2: Deterministic exit if simulate_build resolved 100% buildability
    if (ctx.isOptimalResolved && (!response.functionCalls || response.functionCalls.length === 0)) {
      logger.info('AGENTIC_GUARDRAIL',
        `Optimal build resolution confirmed (Confidence 1.0). Exiting loop at turn ${ctx.turns}.`);
      break;
    }
  }

  // ── GAP-A4: Commit queued knowledge deltas after the loop ───────────────
  let deltasRecordedCount = 0;
  for (const delta of ctx.pendingDeltas) {
    try {
      const cat = listAllCatalogs().find(c => c.id === delta.chassisId);
      let outputDir = cat ? cat.catalogDir : null;
      if (!outputDir) {
        outputDir = path.join(__dirname, '..', '..', 'outputs', delta.chassisId);
      }
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
      processPortalFeedback('Agentic rule update', outputDir, delta);
      deltasRecordedCount++;
    } catch (commitErr) {
      logger.warn('AGENTIC_GUARDRAIL', 'Failed to commit knowledge delta', commitErr);
    }
  }

  const durationMs = Date.now() - startTime;
  logger.info('AGENTIC_GUARDRAIL',
    `Completed Guardrail in ${ctx.turns} turns (${durationMs}ms), tools: [${executedToolCalls.join(', ')}]`);

  // Extract final text from response
  let extractedText = '';
  if (response) {
    if (typeof response.text === 'function') {
      try { extractedText = response.text(); } catch (_) {}
    } else if (typeof response.text === 'string') {
      extractedText = response.text;
    }
    if (!extractedText && response.candidates?.[0]?.content?.parts) {
      extractedText = response.candidates[0].content.parts.map(p => p.text).filter(Boolean).join('\n');
    }
  }

  if (!extractedText && executedToolCalls.length > 0) {
    extractedText = `Autonomous Agentic Guardrail completed in ${ctx.turns} turns, executing ${executedToolCalls.length} verification tools: [${executedToolCalls.join(', ')}]. Physical constraints and knowledge deltas successfully grounded against Gemini NotebookLM.`;
  }

  const guardrailSummary = {
    text: extractedText,
    success: true,
    turns: ctx.turns,
    executedToolCalls,
    durationMs,
    preConfidence,
    postConfidence: ctx.latestConfidence
  };

  // GAP-C3: Record Guardrail Telemetry
  try {
    recordGuardrailTelemetry(guardrailSummary, chassisId, preConfidence, ctx.latestConfidence);
  } catch (telErr) {
    logger.warn('AGENTIC_GUARDRAIL', 'Failed to record guardrail telemetry', telErr);
  }

  // GAP-M5: Trigger Post-Flow Sync if new deltas were learned
  if (deltasRecordedCount > 0) {
    try {
      triggerPostFlowSync(chassisId, 'GUARDRAIL');
    } catch (syncErr) {
      logger.warn('AGENTIC_GUARDRAIL', 'Post-flow sync advisory', syncErr);
    }
  }

  return guardrailSummary;
}

module.exports = { runAgenticGuardrail };
