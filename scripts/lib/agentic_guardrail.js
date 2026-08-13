const { GoogleGenAI, Type } = require('@google/genai');
const { evaluateBOQMultiAspect } = require('./boq_evaluator.js');
const { executeNotebookQuery } = require('./notebook_query_utils.js');
const { queryLocalKnowledgeBase } = require('./local_rag_search.js');
const { processPortalFeedback } = require('./feedback_loop.js');
const path = require('path');
const fs = require('fs');
const { emitProgress } = require('./progress');

/**
 * Load notebook config to resolve chassis → notebookId mapping.
 */
function loadNotebookConfig() {
  const configPath = path.join(__dirname, '..', 'config', 'notebooks.json');
  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (e) { /* fallback below */ }
  }
  return { defaultNotebookId: '1d190853-4e9c-48df-aa70-eae66c6f2c1f', notebooks: {} };
}

const MODEL_NAME = 'gemini-3.5-flash';

const evaluationTools = [
  {
    name: 'simulate_build',
    description: 'Simulates evaluating the BOQ through the full multi-aspect local rule engine. Call this to check the confidence score of the current BOQ state or to test a hypothesis.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        chassis_id: { type: Type.STRING, description: "The chassis variant to evaluate against, e.g., 'DL380_Gen12_SFF'" },
        items_json: { type: Type.STRING, description: "JSON stringified array of BOQ items." }
      },
      required: ['items_json', 'chassis_id']
    }
  },
  {
    name: 'query_notebooklm',
    description: 'Queries the NotebookLM RAG engine for QuickSpecs grounding. Use this when the local rule engine returns a low confidence score or when you need to fact-check a hardware dependency.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        chassis_id: { type: Type.STRING, description: "The chassis variant to query, e.g., 'DL380_Gen12_SFF'" },
        query: { type: Type.STRING, description: "The natural language prompt to ask NotebookLM." }
      },
      required: ['chassis_id', 'query']
    }
  },
  {
    name: 'query_catalog_db',
    description: 'Queries the local Catalog DB (JSON/CSVs) for SKUs and pricing.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        chassis_id: { type: Type.STRING, description: "The chassis variant to query, e.g., 'DL380_Gen12_SFF'" },
        query: { type: Type.STRING, description: "The search query." }
      },
      required: ['chassis_id', 'query']
    }
  },
  {
    name: 'record_knowledge_delta',
    description: 'Records a new physical dependency rule or fix to the persistent KnowledgeBase so the system automatically learns from this session.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        chassis_id: { type: Type.STRING, description: "The chassis variant, e.g., 'DL380_Gen12_SFF'" },
        affected_sku: { type: Type.STRING, description: "The SKU that requires a fix." },
        required_sku: { type: Type.STRING, description: "The mandatory required SKU." },
        rule_update: { type: Type.STRING, description: "The explanation of the new rule." }
      },
      required: ['chassis_id', 'affected_sku', 'required_sku', 'rule_update']
    }
  }
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runAgenticGuardrail(items, chassisDir) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { error: 'GEMINI_API_KEY environment variable is required.' };
  }

  const chassisId = path.basename(chassisDir);
  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `You are the HPE BOQ Evaluation Orchestrator (Intent Brain) with a Guardrail Loop.
Your task is to analyze the user's BOQ configuration.
Guardrail Loop:
1. Call 'simulate_build' to run the local rule engine and get the confidence score.
2. If the confidence score is low (e.g. < 1.0 or has conflicts), you MUST autonomously call 'query_notebooklm' to fact-check the hardware dependency against QuickSpecs.
3. If you decide to apply a fix based on NotebookLM's answer (or catalog DB), call 'simulate_build' again with the modified items_json to test your hypothesis.
4. If the fix is successful and resolves a previously unknown dependency, YOU MUST call 'record_knowledge_delta' to save this learning to the system.
5. Once you have a high confidence score, or after verifying the dependencies, provide a final summary of the BOQ's physical validity.
Never output arbitrary JSON in your final answer, just clear markdown text.`;

  const chat = ai.chats.create({
    model: MODEL_NAME,
    config: {
      systemInstruction,
      tools: [{ functionDeclarations: evaluationTools }],
      temperature: 0.1
    }
  });

  const initialItemsJson = JSON.stringify(items);
  let response;
  
  emitProgress(4, 10, 'Agentic AI Cross-Verification', 'in_progress', `Engaging Gemini LLM for Dual-Brain Verification Guardrail Loop.`);
  
  try {
    response = await chat.sendMessage({ message: `Please evaluate this BOQ configuration containing ${items.length} items. Chassis ID is ${chassisId}.\nItems JSON: ${initialItemsJson}` });
  } catch (err) {
    return { error: err.message };
  }

  let turns = 0;
  while (response.functionCalls && response.functionCalls.length > 0 && turns < 15) {
    turns++;
    const calls = response.functionCalls;
    const toolResponses = [];

    for (const call of calls) {
      let result = null;
      try {
        const args = call.args;
        switch (call.name) {
          case 'simulate_build': {
            const parsedItems = JSON.parse(args.items_json);
            result = evaluateBOQMultiAspect(parsedItems, { chassis: args.chassis_id });
            break;
          }
          case 'query_notebooklm': {
            const cfg = loadNotebookConfig();
            const notebookId = (cfg.notebooks && cfg.notebooks[args.chassis_id]) || cfg.defaultNotebookId;
            result = await executeNotebookQuery(notebookId, args.query, { context: { chassis: args.chassis_id } });
            break;
          }
          case 'query_catalog_db': {
            result = queryLocalKnowledgeBase(args.query, args.chassis_id);
            break;
          }
          case 'record_knowledge_delta': {
            // Dynamically resolve chassis output directory instead of hardcoding ProLiant/Gen12
            const { findChassisOutputDir } = require('./catalog_discovery');
            let outputDir = findChassisOutputDir(args.chassis_id);
            if (!outputDir) {
              // Fallback: create under outputs using chassis_id as folder name
              outputDir = path.join(__dirname, '..', '..', 'outputs', args.chassis_id);
            }
            if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
            result = processPortalFeedback("Agentic rule update", outputDir, {
              affectedSku: args.affected_sku,
              requiredDependencySku: args.required_sku,
              ruleUpdate: args.rule_update,
              humanReasoning: "Agentic Guardrail Loop derived from RAG/DB fact-check"
            });
            break;
          }
          default:
            result = { error: `Tool ${call.name} not found.` };
        }
      } catch (e) {
        result = { error: e.message };
      }

      toolResponses.push({
        functionResponse: {
          name: call.name,
          id: call.id,
          response: result
        }
      });
    }

    let retryCount = 0;
    while (true) {
      try {
        response = await chat.sendMessage({ message: toolResponses });
        break;
      } catch (err) {
        if (err.status === 429 && retryCount < 3) {
          console.warn('⚠️ Rate limit hit. Waiting 15s before retrying...');
          await sleep(15000);
          retryCount++;
        } else {
          console.error("Agentic loop chat error:", err);
          return { error: err.message, text: response ? response.text : '' };
        }
      }
    }
  }

  return { text: response.text, success: true };
}

module.exports = { runAgenticGuardrail };
