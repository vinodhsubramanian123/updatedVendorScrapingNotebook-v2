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
        description: "Queries local catalogs. Structured catalog requests return a versioned routed result with scope and evidence.",
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
      },
      {
        name: "inspect_catalog_deltas",
        description: "Inspects structured catalog SKU diff counts, detailed price and attribute changes, price/attribute history highlights, and NotebookLM verification receipt sync status across Server, Storage, and Networking products.",
        inputSchema: {
          type: "object",
          properties: {
            product: { type: "string", description: "Optional product ID or chassis query (e.g. 'DL380_Gen12', 'Alletra_6000', 'SN3600B_FC'). Omit to summarize across all catalogs." },
            includeUnchanged: { type: "boolean", description: "When true, includes unchanged SKUs alongside changed SKUs." }
          }
        }
      },
      {
        name: "check_portal_and_sync_readiness",
        description: "Checks vendor portal session policy, scraper adapter readiness, supported Server/Storage/Networking pillars, local catalog freshness, and NotebookLM/Google Drive sync verification state.",
        inputSchema: {
          type: "object",
          properties: {
            vendor: { type: "string", description: "Optional vendor key (e.g. 'HPE', 'Dell', 'Cisco', 'Lenovo', or custom vendor)." },
            product: { type: "string", description: "Optional product ID or query. Omit to summarize across configured Server/Storage/Networking products." },
            pillar: { type: "string", description: "Optional solution pillar filter ('Server', 'Storage', 'Networking', 'Composite')." },
            portalUrl: { type: "string", description: "Optional portal URL to resolve vendor portal policy and DOM adapter readiness." }
          }
        }
      },
      {
        name: "inspect_portfolio_blindspots",
        description: "Audits collected, skipped, and classified catalog artifacts across all scraped solutions for hidden blind spots ($0 base variants, fragmented lifecycle labels, sentinel maxQty, lead time and cost gaps).",
        inputSchema: {
          type: "object",
          properties: {
            product: { type: "string", description: "Optional product ID filter (e.g. 'DL360_Gen12')." }
          }
        }
      },
      {
        name: "compare_sku_across_solutions",
        description: "Compares a SKU's list price, FIO/BTO status, lead time, CLIC status, and lifecycle state across all scraped solutions, or lists top cross-solution price variances when sku is omitted.",
        inputSchema: {
          type: "object",
          properties: {
            sku: { type: "string", description: "Optional target SKU (e.g. 'R7A11AAE' or 'P50224-B21'). Omit to return top cross-solution price variances." },
            minSpreadUsd: { type: "number", description: "Minimum USD price spread when listing variances." },
            limit: { type: "number", description: "Maximum number of variance entries to return." }
          }
        }
      },
      {
        name: "get_solution_intelligence_envelope",
        description: "Produces the canonical SolutionIntelligenceEnvelope (v1.0) projecting outcome, requirement coverage, factual changes/rationales, candidate alternatives, typed uncertainties, and strictly separated evidence states (local checks, document grounding, live vendor acceptance, cloud sync, delivery authorization).",
        inputSchema: {
          type: "object",
          properties: {
            eval_result: { type: "object", description: "Optional pre-computed evaluation result object to project deterministically into SolutionIntelligenceEnvelope v1.0. When omitted without items, returns NOT_EVALUATED / NO_CLAIMS_RECORDED." },
            chassis_id: { type: "string", description: "Optional target chassis ID when evaluating raw items directly." },
            items_json: { type: "string", description: "Optional JSON string of [{ sku, description, qty }] items to simulate and project if eval_result is omitted." },
            options: { type: "object", description: "Optional projection flags (e.g. { offline: true })." }
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

function _safeReadJsonFile(filePath) {
  if (!filePath || typeof fs.readFileSync !== 'function' || !fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return null;
  }
}

function _loadPortalExtensionModules() {
  const router = require('../lib/scraper/vendor_portal_router.js');
  const adapterMod = require('../lib/scraper/vendor_scraper_adapter.js');
  const scope = require('../lib/catalog/product_scope.js');
  const metaMgr = require('../lib/catalog/product_metadata_manager.js');
  return { router, adapterMod, scope, metaMgr };
}

function _createEmptyDiffCounts() {
  return {
    added: 0,
    modified: 0,
    priceChanged: 0,
    attributeChanged: 0,
    priceAndAttributeChanged: 0,
    removed: 0,
    unchanged: 0,
    totalSkus: 0
  };
}

function _normalizeDeltaField(row, keys, fallback = null) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
  }
  return fallback;
}

function _extractSkuDeltaRecord(row, sourceKind) {
  const sku = _normalizeDeltaField(row, ['Product #', 'sku', 'partNumber', 'SKU'], '');
  const description = _normalizeDeltaField(row, ['Description', 'description', 'name'], '');
  const diffStatus = String(_normalizeDeltaField(row, ['Diff Status', 'diffStatus', 'status'], 'UNCHANGED')).toUpperCase();
  const previousPrice = _normalizeDeltaField(row, ['Previous List Price (USD)', 'Previous Price (USD)', 'previousPrice'], null);
  const currentPrice = _normalizeDeltaField(row, ['Unit Price (USD)', 'List Price (USD)', 'listPrice', 'price'], null);
  const priceDelta = _normalizeDeltaField(row, ['Price Change (USD)', 'Price Delta (USD)', 'priceDelta'], null);
  const priceDeltaPct = _normalizeDeltaField(row, ['Price Change (%)', 'priceDeltaPct'], null);
  const attributeDeltas = _normalizeDeltaField(row, ['Attribute Deltas', 'attributeDeltas'], null);
  return {
    sku,
    description,
    diffStatus,
    previousPrice,
    currentPrice,
    priceDelta,
    priceDeltaPct,
    attributeDeltas,
    catalogType: sourceKind
  };
}

function _collectCatalogSkuRows(catalogDir, catalogJsonPath) {
  const rows = [];
  const primary = _safeReadJsonFile(catalogJsonPath);
  const pushFromDoc = (doc, kind) => {
    for (const entry of doc?.entries || []) {
      for (const skuRow of entry?.skus || []) {
        rows.push(_extractSkuDeltaRecord(skuRow, kind));
      }
    }
  };
  pushFromDoc(primary, 'hardware');
  if (catalogDir && typeof fs.readdirSync === 'function' && fs.existsSync(catalogDir)) {
    const svcFile = fs.readdirSync(catalogDir).find(f => f.endsWith('_Services.json'));
    if (svcFile) {
      pushFromDoc(_safeReadJsonFile(path.join(catalogDir, svcFile)), 'services');
    }
  }
  return rows;
}

function _tallyDiffCounts(rows) {
  const counts = _createEmptyDiffCounts();
  counts.totalSkus = rows.length;
  for (const row of rows) {
    const s = row.diffStatus;
    if (s === 'ADDED' || s === 'NEW') counts.added += 1;
    else if (s === 'PRICE_CHANGED') { counts.priceChanged += 1; counts.modified += 1; }
    else if (s === 'ATTRIBUTE_CHANGED') { counts.attributeChanged += 1; counts.modified += 1; }
    else if (s === 'PRICE_AND_ATTRIBUTE_CHANGED') { counts.priceAndAttributeChanged += 1; counts.modified += 1; }
    else if (s === 'MODIFIED') counts.modified += 1;
    else if (s === 'REMOVED' || s === 'DISCONTINUED') counts.removed += 1;
    else counts.unchanged += 1;
  }
  return counts;
}

function _mergeDiffCounts(target, part) {
  for (const key of Object.keys(target)) {
    target[key] += Number(part?.[key] || 0);
  }
}

function _summarizePriceHistoryFile(filePath, limit = 20) {
  const data = _safeReadJsonFile(filePath);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { trackedSkusCount: 0, latestSnapshotDate: null, recentChanges: [] };
  }
  let latestDate = null;
  const changes = [];
  for (const [sku, history] of Object.entries(data)) {
    if (!Array.isArray(history) || history.length === 0) continue;
    const latest = history[history.length - 1] || {};
    if (latest.date && (!latestDate || latest.date > latestDate)) latestDate = latest.date;
    const status = String(latest.status || '').toUpperCase();
    if ((status && status !== 'UNCHANGED') || latest.prevPrice !== undefined) {
      changes.push({
        sku,
        date: latest.date || null,
        status: latest.status || 'CHANGED',
        prevPrice: latest.prevPrice ?? null,
        price: latest.price ?? null,
        attributeDeltas: latest.attributeDeltas || null
      });
    }
  }
  changes.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  return {
    trackedSkusCount: Object.keys(data).length,
    latestSnapshotDate: latestDate,
    recentChanges: changes.slice(0, limit)
  };
}

function _summarizeAttributeHistoryFile(filePath, limit = 20) {
  const data = _safeReadJsonFile(filePath);
  if (!Array.isArray(data)) {
    return { totalEvents: 0, latestEventDate: null, recentChanges: [] };
  }
  const latestEventDate = data.length > 0 ? (data[data.length - 1]?.date || null) : null;
  const recentChanges = data.slice(-limit).reverse().map(ev => ({
    date: ev.date || null,
    sku: ev.productNumber || ev.sku || null,
    field: ev.field || null,
    oldValue: ev.oldValue ?? null,
    newValue: ev.newValue ?? null,
    category: ev.mainCategory || null
  }));
  return { totalEvents: data.length, latestEventDate, recentChanges };
}

const VERIFIED_CLOUD_STATES = new Set(['CLOUD_VERIFIED', 'VERIFIED']);

function _formatVerificationReceipt(verRaw) {
  if (!verRaw) return { present: false };
  const pf = verRaw.postflight || {};
  return {
    present: true,
    verifiedAt: verRaw.verifiedAt || null,
    pass: Boolean(pf.pass),
    status: pf.status || null,
    cloudSyncState: pf.cloudSyncState || null,
    notebookId: pf.notebookId || null,
    verifiedSourceId: pf.verifiedSourceId || null,
    verifiedSourceName: pf.verifiedSourceName || null,
    readbackVerified: pf.readbackVerified !== undefined ? Boolean(pf.readbackVerified) : null,
    payloadSha256: pf.payloadSha256 || null,
    diffCounts: pf.diffCounts || null
  };
}

function _formatCaptureReceipt(capRaw) {
  if (!capRaw) return { present: false };
  return {
    present: true,
    vendor: capRaw.vendor || null,
    status: capRaw.status || null,
    capturedAt: capRaw.capturedAt || null,
    cloud: capRaw.cloud || null,
    deltas: capRaw.deltas || null,
    counts: capRaw.counts || null
  };
}

function _formatNotebookSyncStatusSummary(nbEntry) {
  if (!nbEntry) return { mapped: false };
  return {
    mapped: true,
    notebookId: nbEntry.notebookId || null,
    cloudSyncState: nbEntry.cloudSyncState || 'UNKNOWN',
    lastSyncedAt: nbEntry.lastSyncedAt || null,
    lastSyncedSourceId: nbEntry.lastSyncedSourceId || null,
    lastSyncAttemptStatus: nbEntry.lastSyncAttemptStatus || null,
    lastSyncError: nbEntry.lastSyncError || null
  };
}

function _isNlmSyncConfirmed(verificationReceipt, captureReceipt, notebookSyncStatus) {
  const receiptState = String(verificationReceipt?.cloudSyncState || '').toUpperCase();
  const receiptOk = Boolean(
    verificationReceipt?.present &&
    verificationReceipt?.pass &&
    VERIFIED_CLOUD_STATES.has(receiptState) &&
    verificationReceipt?.readbackVerified !== false
  );
  const captureState = String(captureReceipt?.cloud?.syncStatus || captureReceipt?.cloud?.status || '').toUpperCase();
  const nbState = String(notebookSyncStatus?.cloudSyncState || '').toUpperCase();
  return Boolean(receiptOk || VERIFIED_CLOUD_STATES.has(captureState) || VERIFIED_CLOUD_STATES.has(nbState));
}

function _readReceiptsAndNotebookStatus(catalogDir, productId, notebookConfig) {
  const verRaw = catalogDir ? _safeReadJsonFile(path.join(catalogDir, 'scraping_verification_receipt.json')) : null;
  const capRaw = catalogDir ? _safeReadJsonFile(path.join(catalogDir, 'capture_receipt.json')) : null;
  const nbEntry = notebookConfig?.notebooks?.[productId] || null;
  const verificationReceipt = _formatVerificationReceipt(verRaw);
  const captureReceipt = _formatCaptureReceipt(capRaw);
  const notebookSyncStatus = _formatNotebookSyncStatusSummary(nbEntry);
  const nlmSyncConfirmed = _isNlmSyncConfirmed(verificationReceipt, captureReceipt, notebookSyncStatus);
  return { verificationReceipt, captureReceipt, notebookSyncStatus, nlmSyncConfirmed };
}

function _inspectSingleCatalogDeltas(cat, includeUnchanged, notebookConfig, portalMods) {
  const productId = cat.id;
  const nbEntry = notebookConfig?.notebooks?.[productId] || null;
  const { router, scope } = portalMods;
  const rawPillar = nbEntry?.pillar || scope.inferPillar(nbEntry?.family || cat.family, productId);
  const pillar = router.normalizeSolutionPillar(rawPillar, 'Server');
  const vendor = nbEntry?.vendor || 'HPE';
  const rows = _collectCatalogSkuRows(cat.catalogDir, cat.catalogJsonPath);
  const diffCounts = _tallyDiffCounts(rows);
  const modifiedSkus = rows.filter(r => r.diffStatus !== 'UNCHANGED');
  const unchangedSkus = includeUnchanged ? rows.filter(r => r.diffStatus === 'UNCHANGED') : undefined;
  const priceHistory = _summarizePriceHistoryFile(path.join(cat.catalogDir, 'history', 'price_history.json'));
  const attributeHistory = _summarizeAttributeHistoryFile(path.join(cat.catalogDir, 'history', 'attribute_history.json'));
  const receipts = _readReceiptsAndNotebookStatus(cat.catalogDir, productId, notebookConfig);
  return {
    product: productId,
    vendor,
    pillar,
    scrapeDate: cat.scrapeDate || null,
    catalogDir: cat.catalogDir,
    diffCounts,
    modifiedSkus,
    ...(includeUnchanged ? { unchangedSkus } : {}),
    priceHistoryHighlights: priceHistory,
    attributeHistoryHighlights: attributeHistory,
    ...receipts
  };
}

function _findMatchingCatalog(catalogs, productQuery, scope) {
  if (!productQuery) return null;
  const normQuery = normalizeChassisName(productQuery);
  const nbCfg = loadNotebookConfig();
  const identity = typeof scope?.resolveProductIdentity === 'function'
    ? scope.resolveProductIdentity(productQuery, nbCfg)
    : null;
  const targetId = identity?.productId || normQuery;
  return catalogs.find(c =>
    c.id === targetId ||
    c.id === normQuery ||
    c.id === productQuery ||
    String(c.id || '').toLowerCase() === String(productQuery).toLowerCase()
  ) || null;
}

function inspectCatalogDeltas(args = {}) {
  const includeUnchanged = Boolean(args.includeUnchanged);
  const notebookConfig = loadNotebookConfig() || { notebooks: {} };
  const portalMods = _loadPortalExtensionModules();
  const catalogs = listAllCatalogs();
  if (args.product) {
    const matched = _findMatchingCatalog(catalogs, args.product, portalMods.scope);
    if (!matched) {
      return {
        found: false,
        product: args.product,
        diffCounts: _createEmptyDiffCounts(),
        modifiedSkus: [],
        ...(includeUnchanged ? { unchangedSkus: [] } : {}),
        priceHistoryHighlights: { trackedSkusCount: 0, latestSnapshotDate: null, recentChanges: [] },
        attributeHistoryHighlights: { totalEvents: 0, latestEventDate: null, recentChanges: [] },
        verificationReceipt: { present: false },
        captureReceipt: { present: false },
        notebookSyncStatus: _readReceiptsAndNotebookStatus(null, args.product, notebookConfig).notebookSyncStatus,
        nlmSyncConfirmed: false
      };
    }
    return {
      found: true,
      mode: 'SINGLE_PRODUCT',
      ..._inspectSingleCatalogDeltas(matched, includeUnchanged, notebookConfig, portalMods)
    };
  }

  const totalCounts = _createEmptyDiffCounts();
  const byPillar = {};
  const allModified = [];
  const allUnchanged = [];
  const recentPriceHighlights = [];
  const recentAttributeHighlights = [];
  const summaries = catalogs.map(cat => {
    const detail = _inspectSingleCatalogDeltas(cat, includeUnchanged, notebookConfig, portalMods);
    _mergeDiffCounts(totalCounts, detail.diffCounts);
    byPillar[detail.pillar] = (byPillar[detail.pillar] || 0) + 1;
    for (const row of detail.modifiedSkus) allModified.push({ product: detail.product, ...row });
    if (includeUnchanged && Array.isArray(detail.unchangedSkus)) {
      for (const row of detail.unchangedSkus) allUnchanged.push({ product: detail.product, ...row });
    }
    for (const ph of detail.priceHistoryHighlights.recentChanges.slice(0, 5)) {
      recentPriceHighlights.push({ product: detail.product, ...ph });
    }
    for (const ah of detail.attributeHistoryHighlights.recentChanges.slice(0, 5)) {
      recentAttributeHighlights.push({ product: detail.product, ...ah });
    }
    return {
      product: detail.product,
      vendor: detail.vendor,
      pillar: detail.pillar,
      scrapeDate: detail.scrapeDate,
      diffCounts: detail.diffCounts,
      modifiedCount: detail.modifiedSkus.length,
      nlmSyncConfirmed: detail.nlmSyncConfirmed,
      verificationReceipt: detail.verificationReceipt,
      captureReceipt: detail.captureReceipt
    };
  });

  return {
    found: summaries.length > 0,
    mode: 'PORTFOLIO_SUMMARY',
    catalogCount: summaries.length,
    diffCounts: totalCounts,
    modifiedSkus: allModified.slice(0, 200),
    modifiedTotalCount: allModified.length,
    ...(includeUnchanged ? { unchangedSkus: allUnchanged.slice(0, 200) } : {}),
    priceHistoryHighlights: {
      recentChanges: recentPriceHighlights.slice(0, 30)
    },
    attributeHistoryHighlights: {
      recentChanges: recentAttributeHighlights.slice(0, 30)
    },
    byPillar,
    catalogs: summaries
  };
}

function handleInspectCatalogDeltasTool(args = {}) {
  return formatMcpJsonText(inspectCatalogDeltas(args));
}

function _hasSelectors(obj) {
  return Boolean(obj && Object.keys(obj).length > 0);
}

function _summarizePortalSelectorCoverage(policy) {
  return {
    loginSelectors: _hasSelectors(policy.loginSelectors),
    navigationSelectors: _hasSelectors(policy.navigationSelectors),
    tableSelectors: _hasSelectors(policy.tableSelectors),
    ruleSelectors: _hasSelectors(policy.ruleSelectors),
    networkRulePatterns: Array.isArray(policy.networkRulePatterns) ? policy.networkRulePatterns.length : 0
  };
}

function _buildPortalPolicyReadiness(args, portalMods) {
  const { router, adapterMod } = portalMods;
  const policy = router.resolvePortalSessionPolicy({
    vendor: args.vendor,
    portalUrl: args.portalUrl,
    product: args.product,
    pillar: args.pillar
  });
  const activePortalUrl = args.portalUrl || policy.activePortalUrl || policy.portalUrl || null;
  const adapter = adapterMod.getVendorAdapter(policy.vendor, { portalUrl: activePortalUrl });
  const supportedPillars = policy.supportedPillars || adapter?.supportedPillars || ['Server'];
  const normalizedPillar = args.pillar ? router.normalizeSolutionPillar(args.pillar) : null;
  const registry = router.getVendorPortalRegistry();
  return {
    vendor: policy.vendor,
    isRegistered: Boolean(policy.isRegistered),
    isCustomRegistered: Boolean(policy.isCustom || policy.isCustomRegistered),
    portalUrl: activePortalUrl,
    urlPatterns: policy.urlPatterns || [],
    ssoHost: policy.ssoHost || policy.anchorTabUrl || null,
    supportedPillars,
    requestedPillar: normalizedPillar,
    requestedPillarSupported: normalizedPillar ? supportedPillars.includes(normalizedPillar) : true,
    adapterName: adapter?.constructor?.name || 'GenericSpreadsheetAdapter',
    adapterType: adapter?.adapterType || 'DEFAULT',
    scrapingInstructions: policy.scrapingInstructions || null,
    selectorCoverage: _summarizePortalSelectorCoverage(policy),
    registeredVendors: Object.keys(registry),
    registeredAdapters: adapterMod.listRegisteredVendorAdapters()
  };
}

function _normalizeCatalogsForMetadata(catalogs, metaMgr) {
  if (typeof metaMgr?.discoverAllProductCatalogs === 'function') {
    try {
      const discovered = metaMgr.discoverAllProductCatalogs();
      if (Array.isArray(discovered) && discovered.length > 0) return discovered;
    } catch (_) {}
  }
  return (Array.isArray(catalogs) ? catalogs : [])
    .filter(c => c && (c.outputDir || c.catalogDir))
    .map(c => ({
      chassisDir: c.chassisDir || c.id,
      catalogPath: c.catalogPath || c.catalogJsonPath || '',
      outputDir: c.outputDir || c.catalogDir
    }));
}

function _readProductFreshnessSummary(productId, metaCatalogs, metaMgr) {
  const defaultFreshness = { status: 'MISSING', ageDays: null, skuCount: 0, isFresh: false, needsResync: true };
  try {
    const meta = metaMgr.getProductGenerationMetadata(productId, metaCatalogs);
    if (!meta) return defaultFreshness;
    const status = meta.freshnessStatus || meta.status || (meta.stale || meta.isStale ? 'STALE' : 'FRESH');
    const isFresh = meta.isFresh !== undefined ? Boolean(meta.isFresh) : status === 'FRESH';
    const needsResync = meta.needsResync !== undefined
      ? Boolean(meta.needsResync)
      : Boolean(meta.isStale || meta.stale || status === 'STALE' || status === 'MISSING');
    return {
      status,
      ageDays: meta.ageInDays ?? meta.ageDays ?? null,
      skuCount: meta.totalUniqueSKUs ?? meta.skuCount ?? 0,
      lastScrapeDate: meta.scrapeDate || meta.lastScrapeDate || meta.scrapeTimestamp || null,
      isFresh,
      needsResync
    };
  } catch (_) {
    return defaultFreshness;
  }
}

function _formatProductNotebookSyncConfig(nbEntry) {
  const entry = nbEntry || {};
  return {
    notebookId: entry.notebookId || null,
    queryEnabled: Boolean(entry.queryEnabled),
    cloudSyncState: entry.cloudSyncState || 'UNKNOWN',
    canonicalDriveEnabled: Boolean(entry.canonicalDriveEnabled),
    publishDriveWorkbook: Boolean(entry.publishDriveWorkbook),
    driveSheetId: entry.driveSheetId || null,
    lastSyncedAt: entry.lastSyncedAt || null,
    lastSyncedSourceId: entry.lastSyncedSourceId || null,
    lastSyncAttemptStatus: entry.lastSyncAttemptStatus || null,
    lastSyncError: entry.lastSyncError || null
  };
}

function _buildSingleProductSyncReadiness(productId, nbEntry, catalogs, portalMods, metaCatalogs) {
  const { router, scope, metaMgr } = portalMods;
  const entry = nbEntry || {};
  const rawPillar = entry.pillar || scope.inferPillar(entry.family, productId);
  const pillar = router.normalizeSolutionPillar(rawPillar, 'Server');
  const freshness = _readProductFreshnessSummary(productId, metaCatalogs, metaMgr);
  const matchedCat = catalogs.find(c => c.id === productId);
  const receipts = _readReceiptsAndNotebookStatus(matchedCat?.catalogDir || null, productId, { notebooks: { [productId]: nbEntry } });
  return {
    product: productId,
    vendor: entry.vendor || 'HPE',
    pillar,
    family: entry.family || null,
    gen: entry.gen || null,
    catalogFound: Boolean(matchedCat),
    freshness,
    notebookSync: _formatProductNotebookSyncConfig(nbEntry),
    verificationReceipt: receipts.verificationReceipt,
    captureReceipt: receipts.captureReceipt,
    nlmSyncConfirmed: receipts.nlmSyncConfirmed
  };
}

function _collectMatchingProductsForReadiness(args, notebookConfig, catalogs, portalMods, metaCatalogs) {
  const notebooks = notebookConfig?.notebooks || {};
  const { router, scope } = portalMods;
  const targetPillar = args.pillar ? router.normalizeSolutionPillar(args.pillar) : null;
  const targetVendor = args.vendor ? String(args.vendor).trim().toLowerCase() : null;
  if (args.product) {
    const identity = typeof scope.resolveProductIdentity === 'function'
      ? scope.resolveProductIdentity(args.product, notebookConfig)
      : null;
    const productId = identity?.productId || normalizeChassisName(args.product);
    const nbEntry = notebooks[productId] || null;
    return [_buildSingleProductSyncReadiness(productId, nbEntry, catalogs, portalMods, metaCatalogs)];
  }
  const results = [];
  for (const [productId, nbEntry] of Object.entries(notebooks)) {
    const entryVendor = String(nbEntry?.vendor || 'HPE').toLowerCase();
    const entryPillar = router.normalizeSolutionPillar(nbEntry?.pillar || scope.inferPillar(nbEntry?.family, productId), 'Server');
    if (targetVendor && entryVendor !== targetVendor) continue;
    if (targetPillar && entryPillar !== targetPillar) continue;
    results.push(_buildSingleProductSyncReadiness(productId, nbEntry, catalogs, portalMods, metaCatalogs));
  }
  return results;
}

const NON_FRESH_STATUSES = new Set(['MISSING', 'UNSCRAPED', 'CORRUPTED', 'STALE', 'STALE_WARNING', 'CRITICAL_OUTDATED']);

function checkPortalAndSyncReadiness(args = {}) {
  const portalMods = _loadPortalExtensionModules();
  const notebookConfig = loadNotebookConfig() || { notebooks: {} };
  const catalogs = listAllCatalogs();
  const metaCatalogs = _normalizeCatalogsForMetadata(catalogs, portalMods.metaMgr);
  const portalReadiness = _buildPortalPolicyReadiness(args, portalMods);
  const products = _collectMatchingProductsForReadiness(args, notebookConfig, catalogs, portalMods, metaCatalogs);
  const byPillar = {};
  let freshCount = 0;
  let staleOrMissingCount = 0;
  let needsResyncCount = 0;
  let cloudVerifiedCount = 0;
  let driveEnabledCount = 0;
  for (const prod of products) {
    byPillar[prod.pillar] = (byPillar[prod.pillar] || 0) + 1;
    if (NON_FRESH_STATUSES.has(prod.freshness.status) || !prod.freshness.isFresh) staleOrMissingCount += 1;
    else freshCount += 1;
    if (prod.freshness.needsResync) needsResyncCount += 1;
    if (prod.nlmSyncConfirmed) cloudVerifiedCount += 1;
    if (prod.notebookSync.driveSheetId || prod.notebookSync.publishDriveWorkbook || prod.notebookSync.canonicalDriveEnabled) {
      driveEnabledCount += 1;
    }
  }
  return {
    portalReadiness,
    summary: {
      totalProducts: products.length,
      freshCount,
      staleOrMissingCount,
      needsResyncCount,
      cloudVerifiedCount,
      driveEnabledCount,
      byPillar
    },
    products
  };
}

function _loadDecisionProjection() {
  if (typeof require.resolve !== 'function') return null;
  return require('../lib/boq/decision_projection.js');
}

function handleGetSolutionIntelligenceEnvelopeTool(args = {}, items = []) {
  const dp = _loadDecisionProjection();
  if (!dp || typeof dp.buildSolutionIntelligenceEnvelope !== 'function') {
    throw new Error('decision_projection module is unavailable in this environment');
  }
  const effectiveItems = Array.isArray(items) && items.length > 0
    ? items
    : (Array.isArray(args.items) ? args.items : []);
  let evalInput = args.eval_result !== undefined ? args.eval_result : null;
  if (!evalInput && effectiveItems.length > 0 && args.chassis_id) {
    const chassisId = normalizeChassisName(args.chassis_id);
    const matchedCat = listAllCatalogs().find(c => c.id === chassisId || c.id === args.chassis_id);
    evalInput = evaluateBOQMultiAspect(effectiveItems, { chassis: chassisId, targetDir: matchedCat?.catalogDir });
  }
  const envelope = dp.buildSolutionIntelligenceEnvelope(evalInput, args.options || {});
  return formatMcpJsonText(envelope);
}

function handleCheckPortalAndSyncReadinessTool(args = {}) {
  return formatMcpJsonText(checkPortalAndSyncReadiness(args));
}

function handleSimulateBuildTool(args = {}, items = []) {
  const chassisId = normalizeChassisName(args.chassis_id);
  const matchedCat = listAllCatalogs().find(c => c.id === chassisId || c.id === args.chassis_id);
  const result = evaluateBOQMultiAspect(items, { chassis: chassisId, targetDir: matchedCat?.catalogDir });
  const simPayload = {
    simulationType: 'LOCAL_PHYSICAL_MATH_SIMULATION',
    portalValidationStatus: 'PORTAL VALIDATION PENDING',
    ...result
  };
  const dp = _loadDecisionProjection();
  if (dp?.buildSolutionIntelligenceEnvelope) {
    simPayload.solutionIntelligence = dp.buildSolutionIntelligenceEnvelope(simPayload);
  }
  return formatMcpJsonText(simPayload);
}

function handleInspectCategoryDependenciesTool(args = {}, items = [], context = {}) {
  const analysis = items.length > 0 && typeof analyzeCategoryDependencies === 'function'
    ? analyzeCategoryDependencies(items, context.catalogData, { chassisId: context.chassisId || args.chassis_id })
    : null;
  const matrix = typeof getCategoryDependencyMatrix === 'function' ? getCategoryDependencyMatrix(args.category_filter || '') : [];
  const graphMatches = args.graph_concept && typeof queryLocalGraphifyNeighborhood === 'function'
    ? queryLocalGraphifyNeighborhood(args.graph_concept)
    : undefined;
  return formatMcpJsonText({ matrix, analysis, graphMatches });
}

function handleInspectPortfolioBlindspotsTool(args = {}) {
  const { auditPortfolioBlindspots } = require('../lib/catalog/portfolio_blindspots.js');
  return formatMcpJsonText(auditPortfolioBlindspots({ product: args.product || null }));
}

function handleCompareSkuAcrossSolutionsTool(args = {}) {
  const { compareSkuAcrossSolutions, findCrossSolutionPriceVariances } = require('../lib/catalog/cross_solution_pricing.js');
  const payload = args.sku
    ? compareSkuAcrossSolutions(args.sku)
    : findCrossSolutionPriceVariances({ minSpreadUsd: args.minSpreadUsd ?? 1, limit: args.limit ?? 25 });
  return formatMcpJsonText(payload);
}

async function handleQueryCatalogDb(args, context, signal) {
  const { classifyQueryIntent, executeRoutedQuery } = require('../evaluators/route_query.js');
  const queryContext = { chassisName: context.cat?.id || args.chassis_id, offline: true, signal };
  if (classifyQueryIntent(args.query, queryContext).intent === 'CATALOG_INTELLIGENCE') {
    const routed = await executeRoutedQuery(args.query, queryContext);
    return formatMcpJsonText({ schemaVersion: '2.0.0', ...routed });
  }
  return formatMcpJsonText(queryLocalKnowledgeBase(args.query, normalizeChassisName(args.chassis_id)));
}

async function _dispatchMcpTool(toolName, args, items, context, signal) {
  const aspectResp = _executeAspectMcpTool(toolName, args, items, context);
  if (aspectResp) return aspectResp;
  if (toolName === "query_notebooklm") return await handleQueryNotebookLmTool(args, signal);
  const syncHandlers = {
    query_catalog_db: () => handleQueryCatalogDb(args, context, signal),
    simulate_build: () => handleSimulateBuildTool(args, items),
    record_knowledge_delta: () => handleRecordKnowledgeDeltaTool(args),
    inspect_category_dependencies: () => handleInspectCategoryDependenciesTool(args, items, context),
    inspect_catalog_deltas: () => handleInspectCatalogDeltasTool(args),
    check_portal_and_sync_readiness: () => handleCheckPortalAndSyncReadinessTool(args),
    inspect_portfolio_blindspots: () => handleInspectPortfolioBlindspotsTool(args),
    compare_sku_across_solutions: () => handleCompareSkuAcrossSolutionsTool(args),
    get_solution_intelligence_envelope: () => handleGetSolutionIntelligenceEnvelopeTool(args, items)
  };
  const handler = syncHandlers[toolName];
  if (handler) return handler();
  throw new Error(`Unknown tool: ${toolName}`);
}

async function executeToolRequest(request, extra = {}) {
  const signal = extra?.signal;
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
  inspectCatalogDeltas,
  checkPortalAndSyncReadiness,
  handleInspectCatalogDeltasTool,
  handleCheckPortalAndSyncReadinessTool,
  handleGetSolutionIntelligenceEnvelopeTool,
  server,
  run
};
