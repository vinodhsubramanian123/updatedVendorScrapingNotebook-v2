const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const fs = require('fs');
const path = require('path');

const {
  evalComputeThermal,
  evalMemoryChannel,
  evalStorageTriMode,
  evalNetworkingOcp,
  evalPcieRiserSlots,
  evalPowerEnvironment,
  evalSupportManufacturing,
  parseAndConsolidateBOQ,
  evaluateBOQMultiAspect
} = require('../lib/boq/boq_evaluator.js');
const { executeNotebookQuery } = require('../lib/notebook/notebook_query_utils.js');
const { queryLocalKnowledgeBase } = require('../lib/rag/local_rag_search.js');
const { loadNotebookConfig, getNotebookIdForChassis } = require('../lib/sync/knowledge_sync.js');
const { processPortalFeedback } = require('../lib/feedback/feedback_loop.js');
const { listAllCatalogs } = require('../lib/catalog/catalog_discovery.js');

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
        name: "evaluate_aspect_support",
        description: "Evaluates support services, management licenses, OS core licensing math, and manufacturing dependencies.",
        inputSchema: {
          type: "object",
          properties: {
            items_json: { type: "string", description: "JSON stringified array of BOQ items." },
            total_socket_cores: { type: "number", description: "Total physical cores across sockets (optional)." },
            server_count: { type: "number", description: "Number of server chassis nodes (default 1)." }
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
      },
      {
        name: "record_knowledge_delta",
        description: "Records a learned physical dependency rule to the persistent KnowledgeBase so the system automatically learns from this session.",
        inputSchema: {
          type: "object",
          properties: {
            chassis_id: { type: "string", description: "The chassis variant, e.g., 'DL380_Gen12_SFF'" },
            affected_sku: { type: "string", description: "The SKU that requires a fix." },
            required_sku: { type: "string", description: "The mandatory required SKU." },
            rule_update: { type: "string", description: "The explanation of the new rule." }
          },
          required: ["chassis_id", "affected_sku", "required_sku", "rule_update"]
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
      case "evaluate_aspect_support": {
        const result = evalSupportManufacturing(items, null, args.total_socket_cores || 0, args.server_count || 1);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      case "query_notebooklm": {
        const cfg = loadNotebookConfig();
        const notebookId = getNotebookIdForChassis(cfg, args.chassis_id);
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
      case "record_knowledge_delta": {
        const cat = listAllCatalogs().find(c => c.id === args.chassis_id);
        let outputDir = cat ? cat.catalogDir : null;
        if (!outputDir) {
          outputDir = path.resolve(__dirname, '..', '..', 'outputs', args.chassis_id);
        }
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        const result = processPortalFeedback("MCP tool rule update", outputDir, {
          affectedSku: args.affected_sku,
          requiredDependencySku: args.required_sku,
          ruleUpdate: args.rule_update,
          humanReasoning: "MCP Server tool-call derived knowledge delta",
          sourceAgent: 'MCP_EXTERNAL'
        });
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
