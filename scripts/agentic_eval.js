'use strict';
const fs = require('fs');
const path = require('path');
const { GoogleGenAI, Type } = require('@google/genai');
const lib = require('./lib/index.js');
const { parseAndConsolidateBOQ, evaluateBOQMultiAspect } = lib.boq.evaluator;
const { executeNotebookQuery } = lib.rag.notebookQuery;
const { queryLocalKnowledgeBase } = lib.rag.localSearch;
const { processPortalFeedback } = lib.feedback.loop;

const sleep = ms => new Promise(r => setTimeout(r, ms));

const MODEL_NAME = 'gemini-3.5-flash';

// Define strict JSON-schema for tool declarations
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

async function runAgenticEval(inputFile) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY environment variable is required.');
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });
  const rawText = fs.readFileSync(inputFile, 'utf-8');
  
  console.log('⚡ Phase 1: Parsing BOQ');
  const items = parseAndConsolidateBOQ(rawText);
  console.log(`Found ${items.length} items.\n`);
  
  const chassisMatch = rawText.match(/DL380_Gen12_SFF/i) ? 'DL380_Gen12_SFF' : 'DL380_Gen12_SFF';

  const systemInstruction = `You are the HPE BOQ Evaluation Orchestrator (Intent Brain) with a Guardrail Loop.
Your task is to analyze the user's BOQ configuration.
Guardrail Loop:
1. Call 'simulate_build' to run the local rule engine and get the confidence score.
2. If the confidence score is low (e.g. < 1.0 or has conflicts), you MUST autonomously call 'query_notebooklm' to fact-check the hardware dependency against QuickSpecs.
3. If you decide to apply a fix based on NotebookLM's answer (or catalog DB), call 'simulate_build' again with the modified items_json to test your hypothesis.
4. If the fix is successful and resolves a previously unknown dependency, YOU MUST call 'record_knowledge_delta' to save this learning to the system.
5. Once you have a high confidence score, or after verifying the dependencies, provide a final summary of the BOQ's physical validity.
Never output arbitrary JSON in your final answer, just clear markdown text.`;

  console.log('🤖 Agent starting evaluation (Guardrail Loop enabled)...');
  
  const chat = ai.chats.create({
    model: MODEL_NAME,
    config: {
      systemInstruction,
      tools: [{ functionDeclarations: evaluationTools }],
      temperature: 0.1
    }
  });

  const initialItemsJson = JSON.stringify(items);
  let response = await chat.sendMessage({ message: `Please evaluate this BOQ configuration containing ${items.length} items. Chassis ID is ${chassisMatch}.\nItems JSON: ${initialItemsJson}` });
  
  // Agentic Loop
  let turns = 0;
  while (response.functionCalls && response.functionCalls.length > 0 && turns < 15) {
    turns++;
    const calls = response.functionCalls;
    const toolResponses = [];
    
    for (const call of calls) {
      console.log(`   [Agent Called Tool]: ${call.name}`);
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
            const payload = {
              messages: [{ role: 'user', content: args.query }],
              metadata: { chassisId: args.chassis_id }
            };
            result = await executeNotebookQuery(payload);
            break;
          }

          case 'record_knowledge_delta': {
            const outputDir = path.join(__dirname, '..', 'outputs', 'ProLiant', 'Gen12', args.chassis_id);
            if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
            result = processPortalFeedback("Agentic rule update", outputDir, {
              affectedSku: args.affected_sku,
              requiredDependencySku: args.required_sku,
              ruleUpdate: args.rule_update,
              humanReasoning: "Agentic Guardrail Loop derived from RAG/DB fact-check"
            });
            break;
          }
          case 'query_catalog_db': {
            result = queryLocalKnowledgeBase(args.query, args.chassis_id);
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
    
    // Send tool responses back to the model
    
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
          throw err;
        }
      }
    }

  }
  
  console.log('\n✅ Agent Final Summary:');
  console.log(response.text);
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node scripts/agentic_eval.js <boq_file.csv>');
  process.exit(1);
}

runAgenticEval(args[0]).catch(err => {
  console.error('Agentic run failed:', err);
});
