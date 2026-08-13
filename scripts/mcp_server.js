const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const fs = require('fs');
const path = require('path');

/**
 * Load notebook config to resolve chassis → notebookId mapping.
 * @returns {object} { defaultNotebookId, notebooks }
 */
function loadNotebookConfig() {
  const configPath = path.join(__dirname, 'config', 'notebooks.json');
  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (e) { /* fallback below */ }
  }
  return { defaultNotebookId: '1d190853-4e9c-48df-aa70-eae66c6f2c1f', notebooks: {} };
}

const {
  evalComputeThermal,
  evalMemoryChannel,
  evalStorageTriMode,
  evalNetworkingOcp,
  evalPcieRiserSlots,
  evalPowerEnvironment,
  parseAndConsolidateBOQ,
  evaluateBOQMultiAspect
} = require('./lib/boq_evaluator.js');
const { executeNotebookQuery } = require('./lib/notebook_query_utils.js');
const { queryLocalKnowledgeBase } = require('./lib/local_rag_search.js');

const server = new Server(
  {
    name: "hpe-oca-boq-evaluator",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// We keep a session state to hold the items being evaluated so we don't have to pass them back and forth in their entirety.
// Note: MCP is stateless typically, but we can accept rawText and return the evaluation.
// To keep things simple, we'll let the user provide rawText or we'll pass the JSON string of items.

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "evaluate_aspect_thermal",
        description: "Evaluates the thermal computing aspect of a given BOQ (CPU TDP vs Cooling).",
        inputSchema: {
          type: "object",
          properties: {
            items_json: { type: "string", description: "JSON stringified array of BOQ items." }
          },
          required: ["items_json"]
        }
      },
      {
        name: "evaluate_aspect_memory",
        description: "Evaluates the memory channel balance of a given BOQ.",
        inputSchema: {
          type: "object",
          properties: {
            items_json: { type: "string", description: "JSON stringified array of BOQ items." },
            cpu_count: { type: "number", description: "Number of CPUs in the system (default 0 for auto)." }
          },
          required: ["items_json"]
        }
      },
      {
        name: "evaluate_aspect_storage",
        description: "Evaluates the storage tri-mode capabilities and drive cage dependencies.",
        inputSchema: {
          type: "object",
          properties: {
            items_json: { type: "string", description: "JSON stringified array of BOQ items." }
          },
          required: ["items_json"]
        }
      },
      {
        name: "evaluate_aspect_networking",
        description: "Evaluates the networking and OCP interconnect.",
        inputSchema: {
          type: "object",
          properties: {
            items_json: { type: "string", description: "JSON stringified array of BOQ items." }
          },
          required: ["items_json"]
        }
      },
      {
        name: "evaluate_aspect_pcie",
        description: "Evaluates PCIe riser slots capacity.",
        inputSchema: {
          type: "object",
          properties: {
            items_json: { type: "string", description: "JSON stringified array of BOQ items." }
          },
          required: ["items_json"]
        }
      },
      {
        name: "evaluate_aspect_power",
        description: "Evaluates power redundancy and environment dependencies.",
        inputSchema: {
          type: "object",
          properties: {
            items_json: { type: "string", description: "JSON stringified array of BOQ items." }
          },
          required: ["items_json"]
        }
      },
      {
        name: "query_notebooklm",
        description: "Queries the NotebookLM RAG engine for QuickSpecs grounding.",
        inputSchema: {
          type: "object",
          properties: {
            chassis_id: { type: "string", description: "The chassis variant to query, e.g., 'DL380_Gen12_SFF'" },
            query: { type: "string", description: "The natural language prompt to ask NotebookLM." }
          },
          required: ["chassis_id", "query"]
        }
      },
      {
        name: "query_catalog_db",
        description: "Queries the local Catalog DB (JSON/CSVs) for SKUs and pricing.",
        inputSchema: {
          type: "object",
          properties: {
            chassis_id: { type: "string", description: "The chassis variant to query, e.g., 'DL380_Gen12_SFF'" },
            query: { type: "string", description: "The search query." }
          },
          required: ["chassis_id", "query"]
        }
      },
      {
        name: "simulate_build",
        description: "Simulates evaluating the BOQ through the full multi-aspect rule engine.",
        inputSchema: {
          type: "object",
          properties: {
            items_json: { type: "string", description: "JSON stringified array of BOQ items." },
            chassis_id: { type: "string", description: "The chassis variant to evaluate against, e.g., 'DL380_Gen12_SFF'" }
          },
          required: ["items_json"]
        }
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const args = request.params.arguments;
    let items = [];
    if (args.items_json) {
      items = JSON.parse(args.items_json);
    }

    switch (request.params.name) {
      case "evaluate_aspect_thermal": {
        const result = evalComputeThermal(items);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      case "evaluate_aspect_memory": {
        const result = evalMemoryChannel(items, args.cpu_count || 0);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      case "evaluate_aspect_storage": {
        const result = evalStorageTriMode(items);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      case "evaluate_aspect_networking": {
        const result = evalNetworkingOcp(items);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      case "evaluate_aspect_pcie": {
        const result = evalPcieRiserSlots(items);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      case "evaluate_aspect_power": {
        const result = evalPowerEnvironment(items);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      case "query_notebooklm": {
        const cfg = loadNotebookConfig();
        const notebookId = (cfg.notebooks && cfg.notebooks[args.chassis_id]) || cfg.defaultNotebookId;
        const result = await executeNotebookQuery(notebookId, args.query, { context: { chassis: args.chassis_id } });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      case "query_catalog_db": {
        const result = queryLocalKnowledgeBase(args.query, args.chassis_id);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      case "simulate_build": {
        const result = evaluateBOQMultiAspect(items, { chassis: args.chassis_id });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error executing tool: ${error.message}` }],
      isError: true,
    };
  }
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("HPE BOQ Evaluator MCP Server running on stdio");
}

run().catch(console.error);
