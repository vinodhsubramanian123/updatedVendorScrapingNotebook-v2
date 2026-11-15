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
  evalSupportServices,
  evaluateBOQMultiAspect,
  getMandatorySkusForChassis,
  analyzeCategoryDependencies,
  getCategoryDependencyMatrix,
  queryLocalGraphifyNeighborhood
} = require('../lib/boq/boq_evaluator.js');
const { executeNotebookQuery } = require('../lib/notebook/notebook_query_utils.js');
const { queryLocalKnowledgeBase } = require('../lib/rag/local_rag_search.js');
const { loadNotebookConfig, getNotebookIdForChassis, getNotebookDegradedMode, normalizeChassisName } = require('../lib/sync/knowledge_sync.js');
const { processPortalFeedback } = require('../lib/feedback/feedback_loop.js');
const { listAllCatalogs } = require('../lib/catalog/catalog_discovery.js');

function _resolveMcpCatalogContext(rawChassisId) {
  if (!rawChassisId) return { chassisId: null, cat: null, catalogData: null, mandatorySkus: null };
  const chassisId = normalizeChassisName(rawChassisId);
  const cat = listAllCatalogs().find(c => c.id === chassisId || c.id === rawChassisId) || null;
  let catalogData = null;
  if (cat?.catalogDir && fs.existsSync(cat.catalogDir) && typeof fs.readdirSync === 'function') {
    const catFile = fs.readdirSync(cat.catalogDir).find(f => f.endsWith('_Catalog.json') && !f.endsWith('_Rules.json'));
    if (catFile) {
      try {
        catalogData = JSON.parse(fs.readFileSync(path.join(cat.catalogDir, catFile), 'utf8'));
      } catch (_) {}
    }
  }
  const mandatorySkus = typeof getMandatorySkusForChassis === 'function'
    ? getMandatorySkusForChassis(cat || { model: chassisId })
    : null;
  return { chassisId, cat, catalogData, mandatorySkus };
}

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
            items_json: { type: "string", description: "JSON stringified array of BOQ items." },
            chassis_id: { type: "string", description: "Optional chassis variant, e.g., 'DL380_Gen12'." }
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
            cpu_count: { type: "number", description: "Number of CPUs in the system (default 0 for auto)." },
            chassis_id: { type: "string", description: "Optional chassis variant, e.g., 'DL380_Gen12'." },
            is_cto: { type: "boolean", description: "Whether the base chassis is Configure-To-Order (CTO)." },
            channel_width: { type: "number", description: "Memory channels per CPU socket (default 8)." }
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
            items_json: { type: "string", description: "JSON stringified array of BOQ items." },
            chassis_id: { type: "string", description: "Optional chassis variant, e.g., 'DL380_Gen12'." }
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
            items_json: { type: "string", description: "JSON stringified array of BOQ items." },
            chassis_id: { type: "string", description: "Optional chassis variant, e.g., 'DL380_Gen12'." }
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
            items_json: { type: "string", description: "JSON stringified array of BOQ items." },
            chassis_id: { type: "string", description: "Optional chassis variant, e.g., 'DL380_Gen12'." }
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
            items_json: { type: "string", description: "JSON stringified array of BOQ items." },
            chassis_id: { type: "string", description: "Optional chassis variant, e.g., 'DL380_Gen12'." }
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
            server_count: { type: "number", description: "Number of server chassis nodes (default 1)." },
            chassis_id: { type: "string", description: "Optional chassis variant, e.g., 'DL380_Gen12'." }
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
      },
      {
        name: "inspect_category_dependencies",
        description: "Returns cross-category prerequisites, exemptions (e.g. Direct-Connect / No-Drive vs Controller-Routed drive cages), and NotebookLM/Graphify/Web ambiguity escalation hints.",
        inputSchema: {
          type: "object",
          properties: {
            items_json: { type: "string", description: "Optional JSON stringified array of BOQ items." },
            chassis_id: { type: "string", description: "Optional chassis variant, e.g., 'DL380_Gen12'." },
            category_filter: { type: "string", description: "Optional category or keyword filter." },
            graph_concept: { type: "string", description: "Optional Graphify codebase concept query." }
          }
        }
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request, extra = {}) => {
  const { observeActualInvocation } = require('../lib/system/execution_trace_runtime.js');
  return observeActualInvocation(`MCP:${request.params.name}`, __filename,
    () => executeToolRequest(request, extra));
});

function throwIfRequestAborted(signal) {
  if (signal?.aborted) throw signal.reason;
}

function formatMcpJsonText(payload) {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

async function handleQueryNotebookLmTool(args, signal) {
  const chassisId = normalizeChassisName(args.chassis_id);
  const cfg = loadNotebookConfig();
  const notebookId = getNotebookIdForChassis(cfg, chassisId) || getNotebookIdForChassis(cfg, args.chassis_id);
  let result;
  if (!notebookId) {
    const degradedMode = getNotebookDegradedMode(cfg, chassisId) || getNotebookDegradedMode(cfg, args.chassis_id);
    const localResult = queryLocalKnowledgeBase(args.query, chassisId);
    result = { ...localResult, source: 'LOCAL_RAG_NO_NOTEBOOK_MAPPED', degradedMode };
  } else {
    result = await executeNotebookQuery(notebookId, args.query, { context: { chassis: chassisId }, signal });
    throwIfRequestAborted(signal);
  }
  return formatMcpJsonText(result);
}

function handleRecordKnowledgeDeltaTool(args) {
  const chassisId = normalizeChassisName(args.chassis_id);
  const cat = listAllCatalogs().find(c => c.id === chassisId || c.id === args.chassis_id);
  let outputDir = cat ? cat.catalogDir : null;
  if (!outputDir) {
    const rawChassisId = String(chassisId || args.chassis_id || '').trim();
    if (!rawChassisId || !rawChassisId.replace(/[^a-zA-Z0-9]/g, '')) throw new Error('Invalid chassis_id');
    const cleanChassisId = rawChassisId.replace(/[^a-zA-Z0-9_-]/g, '_');
    outputDir = path.resolve(__dirname, '..', '..', 'outputs', cleanChassisId);
  }
  const outputsRoot = path.resolve(__dirname, '..', '..', 'outputs');
  if (!outputDir.startsWith(outputsRoot + path.sep) && outputDir !== outputsRoot) {
    throw new Error('Path Traversal: outputDir must reside within outputs directory');
  }
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const result = processPortalFeedback("MCP tool rule update", outputDir, {
    affectedSku: args.affected_sku,
    requiredDependencySku: args.required_sku,
    ruleUpdate: args.rule_update,
    humanReasoning: "MCP Server tool-call derived knowledge delta",
    sourceAgent: 'MCP_EXTERNAL'
  });
  return formatMcpJsonText(result);
}

function _executeAspectMcpTool(toolName, args, items, context) {
  const { cat, catalogData, mandatorySkus } = context;
  const mand = mandatorySkus || undefined;
  switch (toolName) {
    case "evaluate_aspect_thermal":
      return formatMcpJsonText(evalComputeThermal(items, catalogData, mand));
    case "evaluate_aspect_memory":
      return formatMcpJsonText(evalMemoryChannel(items, args.cpu_count || 0, catalogData, Boolean(args.is_cto), args.channel_width || 8));
    case "evaluate_aspect_storage":
      return formatMcpJsonText(evalStorageTriMode(items, catalogData, mand));
    case "evaluate_aspect_networking":
      return formatMcpJsonText(evalNetworkingOcp(items, catalogData));
    case "evaluate_aspect_pcie":
      return formatMcpJsonText(evalPcieRiserSlots(items, catalogData));
    case "evaluate_aspect_power":
      return formatMcpJsonText(evalPowerEnvironment(items, catalogData, mand));
    case "evaluate_aspect_support": {
      const mfg = evalSupportManufacturing(items, catalogData, args.total_socket_cores || 0, args.server_count || 1);
      const svc = typeof evalSupportServices === 'function'
        ? evalSupportServices(items, catalogData, { chassisDir: cat?.catalogDir, serverCount: args.server_count || 1 })
        : null;
      return formatMcpJsonText({ ...mfg, ...(svc ? { supportServices: svc } : {}) });
    }
    default:
      return null;
  }
}

async function _dispatchMcpTool(toolName, args, items, context, signal) {
  const aspectResp = _executeAspectMcpTool(toolName, args, items, context);
  if (aspectResp) return aspectResp;
  if (toolName === "query_notebooklm") return await handleQueryNotebookLmTool(args, signal);
  if (toolName === "query_catalog_db") return formatMcpJsonText(queryLocalKnowledgeBase(args.query, normalizeChassisName(args.chassis_id)));
  if (toolName === "simulate_build") {
    const chassisId = normalizeChassisName(args.chassis_id);
    const matchedCat = listAllCatalogs().find(c => c.id === chassisId || c.id === args.chassis_id);
    const result = evaluateBOQMultiAspect(items, { chassis: chassisId, targetDir: matchedCat?.catalogDir });
    return formatMcpJsonText({
      simulationType: 'LOCAL_PHYSICAL_MATH_SIMULATION',
      portalValidationStatus: 'PORTAL VALIDATION PENDING',
      ...result
    });
  }
  if (toolName === "record_knowledge_delta") return handleRecordKnowledgeDeltaTool(args);
  if (toolName === "inspect_category_dependencies") {
    const analysis = items.length > 0 && typeof analyzeCategoryDependencies === 'function'
      ? analyzeCategoryDependencies(items, context.catalogData, { chassisId: context.chassisId || args.chassis_id })
      : null;
    return formatMcpJsonText({
      matrix: typeof getCategoryDependencyMatrix === 'function' ? getCategoryDependencyMatrix(args.category_filter || '') : [],
      analysis,
      graphMatches: args.graph_concept && typeof queryLocalGraphifyNeighborhood === 'function'
        ? queryLocalGraphifyNeighborhood(args.graph_concept)
        : undefined
    });
  }
  throw new Error(`Unknown tool: ${toolName}`);
}

async function executeToolRequest(request, extra) {
  const signal = extra.signal;
  try {
    throwIfRequestAborted(signal);
    const toolName = request.params?.name || request.name;
    const args = request.params?.arguments || request.arguments || {};
    const items = args.items_json ? JSON.parse(args.items_json) : [];
    const context = _resolveMcpCatalogContext(args.chassis_id);
    return await _dispatchMcpTool(toolName, args, items, context, signal);
  } catch (error) {
    if (signal?.aborted && Object.is(error, signal.reason)) {
      return { content: [{ type: "text", text: "Tool request cancelled" }], isError: true };
    }
    return { content: [{ type: "text", text: `Error executing tool: ${error?.message ?? String(error)}` }], isError: true };
  }
}

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (require.main === module) {
  run().catch(console.error);
}

module.exports = {
  executeToolRequest,
  server,
  run
};
