'use strict';
/**
 * dashboard/routes/intelligence.cjs — Wave B–F Platform Envelope, Manifests, Adapters,
 * Global Search, Model Routing & Multi-Notebook Coordinator Routes.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const { sendErrorResponse, asyncHandler } = require('../services/errorHandler.cjs');
const policyResolver = require('../services/policyResolver.cjs');
const { getCachedCatalogs, loadAndNormalizeCatalog } = require('./catalogs.cjs');
const { safeWriteJsonAtomic } = require('../../scripts/lib/system/fs_compat.js');
const { computeFullPlatformEnvelope } = require('../../scripts/lib/rules/hardware_envelope_solver.js');
const { loadAllProductManifests } = require('../../scripts/lib/rules/product_manifest_loader.js');
const { listVendorAdapters } = require('../../scripts/lib/adapters/adapter_registry.js');
const { coordinateMultiNotebookQueries } = require('../../scripts/lib/notebook/multi_notebook_coordinator.js');
const { executeNotebookQuery } = require('../../scripts/lib/notebook/notebook_query_utils.js');
const { queryLocalKnowledgeBase } = require('../../scripts/lib/rag/local_rag_search.js');
const { ACTIVE_VERSION } = require('../../scripts/lib/prompts/guardrail_prompt.js');
const { getPoolStatus } = require('../../scripts/lib/system/gemini_rotator.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const MODEL_ROUTING_PATH = path.join(PROJECT_ROOT, 'scripts', 'config', 'model_routing.json');

const STATIC_ACTIONS = [
  { id: 'orchestrator', label: 'BOQ & Presales Studio', tab: 'orchestrator', keywords: 'boq upload presales query size' },
  { id: 'matrix', label: '5-Tier Resolution Matrix', tab: 'matrix', keywords: 'matrix rank conflict topology' },
  { id: 'reconciliation', label: 'BOM Reconciliation', tab: 'reconciliation', keywords: 'reconcile quote tender delta' },
  { id: 'catalog', label: 'Catalog Explorer & Envelope', tab: 'catalog', keywords: 'sku catalog envelope bounds' },
  { id: 'portfolio', label: 'Portfolio, Manifests & Adapters', tab: 'portfolio', keywords: 'portfolio manifest adapter cisco dell lenovo' },
  { id: 'pipeline', label: 'Pipeline, Scraper & Rules', tab: 'pipeline', keywords: 'scraper oca pipeline rules' },
  { id: 'artifacts', label: 'Exports & Artifacts', tab: 'artifacts', keywords: 'xlsx excel artifact history' },
  { id: 'telemetry', label: 'Telemetry & Evidence Traces', tab: 'telemetry', keywords: 'telemetry trace ledger audit' }
];

function _resolveCatalogRecord(platformQuery) {
  const needle = String(platformQuery || '').trim().toLowerCase();
  if (!needle) return null;
  const normNeedle = needle.replace(/[_\s]+/g, '');
  return getCachedCatalogs().find((c) => {
    const idNorm = String(c.id || '').toLowerCase().replace(/[_\s]+/g, '');
    const chNorm = String(c.chassis || '').toLowerCase().replace(/[_\s]+/g, '');
    const dirNorm = String(c.chassisDir || '').toLowerCase().replace(/\\/g, '/');
    return idNorm === normNeedle || chNorm === normNeedle || dirNorm.endsWith(needle.replace(/\\/g, '/'));
  }) || null;
}

function _resolveCatalogFsPath(rec) {
  if (!rec?.jsonPath) return null;
  const rel = String(rec.jsonPath).replace(/^\/artifacts[\\/]?/, '');
  const fullPath = path.join(PROJECT_ROOT, 'outputs', rel);
  return fs.existsSync(fullPath) ? fullPath : null;
}

function _loadNormalizedEnvelope(platformQuery, opts = {}) {
  const rec = _resolveCatalogRecord(platformQuery);
  const fullPath = _resolveCatalogFsPath(rec);
  if (!fullPath) return null;
  const catalogData = loadAndNormalizeCatalog(fullPath);
  const envelope = computeFullPlatformEnvelope(rec.id, catalogData, opts);
  return { platformId: rec.id, envelope };
}

const skuSearchRows = new WeakMap();

function _skuSearchRows(catalog) {
  if (skuSearchRows.has(catalog)) return skuSearchRows.get(catalog);
  const rows = (catalog.entries || []).flatMap(entry => (entry.skus || []).map(item => {
    const sku = String(item.sku || item['Product #'] || item.partNumber || '').trim();
    const description = item.Description || item.description || '';
    const category = entry.subCategory || entry.parentCategory || 'Component';
    const rawPrice = item['Unit Price (USD)'] ?? item['Price (USD)'] ?? item.listPrice;
    const price = rawPrice == null || rawPrice === '' ? NaN : Number(String(rawPrice).replace(/[$,]/g, ''));
    return { sku, description, category, listPriceUsd: Number.isFinite(price) ? price : null,
      searchText: [sku, description, category, entry.parentCategory].join(' ').toLowerCase() };
  })).filter(row => row.sku);
  skuSearchRows.set(catalog, rows);
  return rows;
}

function _searchSkus(qLower, limit) {
  const exact = [];
  const partial = [];
  for (const cat of getCachedCatalogs()) {
    const fullPath = _resolveCatalogFsPath(cat);
    if (!fullPath) continue;
    const seen = new Set();
    for (const { searchText, ...row } of _skuSearchRows(loadAndNormalizeCatalog(fullPath))) {
      if (seen.has(row.sku) || !searchText.includes(qLower)) continue;
      seen.add(row.sku);
      const matches = row.sku.toLowerCase() === qLower ? exact : partial;
      if (matches.length < limit) matches.push({ ...row, platformId: cat.id, chassis: cat.chassis });
    }
    if (exact.length >= limit) break;
  }
  return exact.concat(partial).slice(0, limit);
}

function _readModelRoutingConfig() {
  try {
    if (fs.existsSync(MODEL_ROUTING_PATH)) {
      return JSON.parse(fs.readFileSync(MODEL_ROUTING_PATH, 'utf8'));
    }
  } catch (_) {}
  return { tiers: {} };
}

router.get('/platform-envelope', (req, res) => {
  const target = req.query.platformId || req.query.platform || req.query.product || req.query.chassisDir;
  if (!target) return sendErrorResponse(res, 400, 'Query parameter "platform" is required', { source: 'INTELLIGENCE_ROUTER' });
  const result = _loadNormalizedEnvelope(target, {
    categoryKey: req.query.categoryKey || req.query.category || undefined,
    gpuWidth: req.query.gpuWidth || undefined,
    cpuCount: req.query.cpuCount ? Number(req.query.cpuCount) : undefined,
    target: req.query.target || undefined
  });
  if (!result) return sendErrorResponse(res, 404, `No catalog found for platform "${target}"`, { source: 'INTELLIGENCE_ROUTER' });
  return res.json({ status: 'SUCCESS', ...result });
});

router.get('/product-manifests', (_req, res) => {
  const map = loadAllProductManifests();
  const manifests = Array.from(map.values()).map((manifest) => ({
    productId: manifest.productId,
    displayName: manifest.displayName || String(manifest.productId || '').replace(/_/g, ' '),
    domain: manifest.domain || 'server',
    family: manifest.family || 'ProLiant',
    generation: manifest.generation || null,
    formFactor: manifest.formFactor || null,
    manifest
  }));
  res.json({ status: 'SUCCESS', count: manifests.length, manifests });
});

router.get('/vendor-adapters', (_req, res) => {
  const adapters = listVendorAdapters();
  res.json({ status: 'SUCCESS', count: adapters.length, adapters });
});

router.get('/global-search', (req, res) => {
  const query = String(req.query.q || '').trim();
  const qLower = query.toLowerCase();
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  if (!qLower) return res.json({ status: 'SUCCESS', query, results: { skus: [], platforms: [], adapters: [], actions: [] } });

  const manifests = Array.from(loadAllProductManifests().values());
  const platforms = manifests
    .filter(m => [m.productId, m.displayName, m.family, m.domain].join(' ').replaceAll('_', ' ').toLowerCase().includes(qLower.replaceAll('_', ' ')))
    .slice(0, limit)
    .map(m => ({ productId: m.productId, domain: m.domain || 'server', family: m.family || 'HPE', formFactor: m.formFactor || null }));
  const adapters = listVendorAdapters()
    .filter(a => `${a.vendorId} ${(a.descriptor?.domains || []).join(' ')}`.toLowerCase().includes(qLower))
    .slice(0, limit);
  const actions = STATIC_ACTIONS.filter(a => `${a.label} ${a.keywords}`.toLowerCase().includes(qLower)).slice(0, 8);
  const skus = _searchSkus(qLower, limit);

  return res.json({ status: 'SUCCESS', query, results: { skus, platforms, adapters, actions } });
});

router.get('/config/model-routing', (_req, res) => {
  const routing = _readModelRoutingConfig();
  const policy = policyResolver.resolveEffectivePolicy({ includeRagOnly: true });
  const fallbackRaw = process.env.GUARDRAIL_FALLBACK_MODELS || 'gemini-3.7-flash,gemini-3.5-flash-lite';
  const pool = typeof getPoolStatus === 'function' ? getPoolStatus() : [];
  const poolSummary = Array.isArray(pool)
    ? { totalKeys: pool.length, activeKeys: pool.filter(k => !k.exhausted && !k.coolingDown).length }
    : pool;
  res.json({
    status: 'SUCCESS',
    routing,
    activePromptVersion: ACTIVE_VERSION,
    fallbackModels: fallbackRaw.split(',').map(s => s.trim()).filter(Boolean),
    keyPool: poolSummary,
    offlineLocked: policy.offline
  });
});

router.post('/config/model-routing', (req, res) => {
  const { tiers } = req.body || {};
  if (!tiers || typeof tiers !== 'object' || Array.isArray(tiers)) {
    return sendErrorResponse(res, 400, 'Body must contain a "tiers" object', { source: 'INTELLIGENCE_ROUTER' });
  }
  const existing = _readModelRoutingConfig();
  const updated = { ...existing, tiers: { ...existing.tiers, ...tiers }, updatedAt: new Date().toISOString() };
  safeWriteJsonAtomic(MODEL_ROUTING_PATH, updated);
  return res.json({ status: 'SUCCESS', routing: updated, activePromptVersion: ACTIVE_VERSION });
});

function _buildMultiNotebookQueryFn(effectivePolicy) {
  return async (notebookId, query, opts = {}) => {
    const productKey = opts?.context?.chassis || '';
    if (effectivePolicy.offline || !notebookId) {
      const localAns = queryLocalKnowledgeBase(query, productKey);
      return {
        status: 'LOCAL_FALLBACK',
        isCloudGrounded: false,
        notebookId: notebookId || null,
        answer: localAns?.answer || `Local fallback response for ${productKey}`,
        citations: localAns?.citations || [],
        source: 'LOCAL_RAG'
      };
    }
    const cloud = await executeNotebookQuery(notebookId, query, {
      context: { chassis: productKey },
      offline: false,
      effectivePolicy
    });
    return { ...cloud, notebookId };
  };
}

router.post('/multi-notebook-query', asyncHandler(async (req, res) => {
  const domains = Array.isArray(req.body?.domains) ? req.body.domains : req.body?.domainRequests;
  if (!Array.isArray(domains) || domains.length === 0) {
    return sendErrorResponse(res, 400, 'Request body requires non-empty "domains" array', { source: 'INTELLIGENCE_ROUTER' });
  }
  const effectivePolicy = policyResolver.resolveEffectivePolicy({
    clientOffline: req.body?.offline,
    clientOfflineMode: req.body?.offlineMode,
    includeRagOnly: true
  });
  const startedAt = Date.now();
  const report = await coordinateMultiNotebookQueries(domains, {
    concurrency: req.body?.concurrency ?? req.body?.maxConcurrency,
    queryFn: _buildMultiNotebookQueryFn(effectivePolicy)
  });
  try {
    const telemetryLib = require('../../scripts/lib/system/telemetry.js');
    const allCitations = (report.results || []).flatMap(r => r.citations || []);
    telemetryLib.recordNotebookConsultationTelemetry({
      query: String(domains[0]?.query || 'multi-notebook-query'),
      sanitizedQuery: `Multi-notebook fan-out (${report.totalDomains || 0})`,
      answer: `${report.verifiedCount || 0}/${report.totalDomains || 0} grounded`,
      citations: allCitations,
      durationMs: Date.now() - startedAt,
      scenario: 'MULTI_NOTEBOOK_FANOUT',
      chassis: domains.map(d => d.productKey || d.chassisId).filter(Boolean).join(','),
      agreementScore: report.allGrounded ? 0.95 : (report.verifiedCount > 0 ? 0.75 : 0.5),
      nextActionExecuted: report.verifiedCount > 0 ? 'MULTI_NOTEBOOK_CLOUD_GROUNDED' : 'LOCAL_FALLBACK_ADVISORY'
    });
  } catch (_) {}
  return res.json({ status: 'SUCCESS', effectivePolicy, ...report });
}));

module.exports = router;
