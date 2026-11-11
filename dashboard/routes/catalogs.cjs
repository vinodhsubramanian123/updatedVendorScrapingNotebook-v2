'use strict';
/**
 * dashboard/routes/catalogs.cjs — Catalog Discovery & Data Routes
 *
 * Handles:
 *   GET /api/available-catalogs
 *   GET /api/catalog-data
 *   GET /api/catalog-rules
 *   GET /api/chassis-sync-summary
 *   GET /api/price-analytics
 *   GET /api/sku-history
 *   GET /api/sku-version-audit
 *   GET /api/cdp-status
 *   GET /api/session-observability
 *   GET /api/price-history
 *   GET /api/history/runs
 *   GET /api/history/runs/:id
 *   GET /api/history/exports
 *
 * Extracted from server.cjs (GAP-L3c).
 *
 * PERFORMANCE: The catalog list is computed once and invalidated only when
 * a TASK_COMPLETED SSE event fires (via invalidateCatalogCache()).
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');

const { assertSafePath, OUTPUTS_DIR } = require('../services/pathGuard.cjs');
const { sendErrorResponse } = require('../services/errorHandler.cjs');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

// ── Catalog Registry Cache (GAP-L5) ──────────────────────────────────────────
let _catalogCache = null;
const _normalizedCatalogCache = new Map();

/** Call this after a scrape/rebuild SSE TASK_COMPLETED event. */
function invalidateCatalogCache() {
  _catalogCache = null;
  _normalizedCatalogCache.clear();
}

/**
 * Count total SKUs in a JSON catalog file.
 */
function countSKUsInJson(filePath) {
  if (!fs.existsSync(filePath)) return 0;
  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return content.metadata?.totalUniqueSKUs || content.entries?.reduce((acc, e) => acc + (e.skuCount || e.skus?.length || 0), 0) || 0;
  } catch (_) {
    return 0;
  }
}

function loadDiscontinuedSkuMap(folderPath) {
  const discontinuedPath = path.join(folderPath, 'history', 'discontinued_skus.json');
  if (!fs.existsSync(discontinuedPath)) return {};
  try {
    const rawDisc = JSON.parse(fs.readFileSync(discontinuedPath, 'utf-8'));
    if (Array.isArray(rawDisc)) {
      const map = {};
      for (const item of rawDisc) {
        const skuCode = item.productNumber || item.sku;
        if (skuCode) map[skuCode] = item;
      }
      return map;
    }
    if (typeof rawDisc === 'object' && rawDisc !== null) {
      return rawDisc;
    }
  } catch (_) {}
  return {};
}

function _applySkuLifecycleInfo(sku, discInfo) {
  if (discInfo) {
    sku.lifecycleStatus = discInfo.status || 'OBSOLETE';
    sku.obsoleteDate = discInfo.discontinuedDate || discInfo.discontinuedAt || null;
    sku.reinstatedDate = discInfo.reinstatedDate || null;
    sku.lifecycleReason = discInfo.reason || null;
    sku.replacementSku = discInfo.replacementSku || null;
    if (sku.lifecycleStatus === 'DISCONTINUED' || sku.lifecycleStatus === 'OBSOLETE') {
      sku.isObsolete = true;
    }
  } else if (!sku.lifecycleStatus) {
    sku.lifecycleStatus = 'ACTIVE';
  }
}

/**
 * Normalize an entry and its SKUs (SFF drive cages to Storage, FIO badges, lifecycle).
 */
function normalizeEntryAndSkus(entry, discontinuedMap = {}) {
  if (entry.subCategory && /sff drive cages/i.test(entry.subCategory) && entry.parentCategory === 'Networking') {
    entry.parentCategory = 'Drive Enclosures / Drives';
  }
  if (Array.isArray(entry.skus)) {
    for (const sku of entry.skus) {
      if (entry.parentCategory === 'Drive Enclosures / Drives' && sku.parentCategory === 'Networking') {
        sku.parentCategory = 'Drive Enclosures / Drives';
      }
      const rawPrice = sku['Unit Price (USD)'] ?? sku['Price (USD)'] ?? sku.listPrice ?? '';
      const numPrice = Number(parseFloat(String(rawPrice).replace(/[$,]/g, '')));
      const desc = String(sku.Description || sku.description || '');
      if (numPrice === 0 && (/fio|factory integrated/i.test(desc) || sku.isFio)) {
        sku.isFioIncluded = true;
        sku.fioBadge = 'FIO ($0.00 Included)';
      }
      const cleanSku = String(sku.SKU || sku.sku || sku.partNumber || '').trim();
      _applySkuLifecycleInfo(sku, discontinuedMap[cleanSku]);
    }
  }
}

/**
 * Load catalog JSON, merging companion *_Services.json entries and normalizing classifications.
 */
function loadAndNormalizeCatalog(fullPath) {
  let cacheKey = null;
  try {
    const stat = fs.statSync(fullPath);
    cacheKey = `${fullPath}:${stat.mtimeMs}`;
    if (_normalizedCatalogCache.has(cacheKey)) {
      return _normalizedCatalogCache.get(cacheKey);
    }
  } catch (_) {}

  const { catalogCounts } = require('../services/catalogCounts.cjs');
  const content = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
  if (!content.entries) content.entries = [];

  const folderPath = path.dirname(fullPath);
  const baseName = path.basename(fullPath);
  const servicesFileName = baseName.replace(/_Catalog\.json$/, '_Services.json');
  const servicesPath = path.join(folderPath, servicesFileName);

  if (baseName.endsWith('_Catalog.json') && fs.existsSync(servicesPath)) {
    try {
      const servicesContent = JSON.parse(fs.readFileSync(servicesPath, 'utf-8'));
      if (Array.isArray(servicesContent.entries)) {
        for (const sEntry of servicesContent.entries) {
          sEntry.optionType = 'Service';
          if (!sEntry.parentCategory || sEntry.parentCategory === 'Unknown') {
            sEntry.parentCategory = 'Support Services';
          }
          if (Array.isArray(sEntry.skus)) {
            for (const sSku of sEntry.skus) {
              sSku.optionType = 'Service';
              sSku['Option Type'] = 'Service';
              if (!sSku.parentCategory) sSku.parentCategory = sEntry.parentCategory;
            }
          }
          content.entries.push(sEntry);
        }
      }
      if (servicesContent.metadata?.totalUniqueSKUs) {
        if (!content.metadata) content.metadata = {};
        content.metadata.totalUniqueSKUs = (content.metadata.totalUniqueSKUs || 0) + servicesContent.metadata.totalUniqueSKUs;
      }
      content.metadata = { ...content.metadata, hasMergedServices: true };
    } catch (_) {}
  }

  const discontinuedMap = loadDiscontinuedSkuMap(folderPath);
  for (const entry of content.entries) {
    normalizeEntryAndSkus(entry, discontinuedMap);
  }

  content.metadata = { ...content.metadata, ...catalogCounts(content) };
  if (cacheKey) _normalizedCatalogCache.set(cacheKey, content);
  return content;
}

/**
 * Recursively discover chassis catalog files under OUTPUTS_DIR.
 * Returns built catalog list; result is cached until invalidated.
 */
function getCachedCatalogs() {
  if (_catalogCache) return _catalogCache;

  const catalogs = [];

  function findCatalogs(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        if (!['history', 'raw_data', 'intermittent_scraps', 'temp', 'runs'].includes(item.name)) {
          findCatalogs(fullPath);
        }
      } else if (item.isFile() && item.name.endsWith('_Catalog.json')) {
        const relativePath = path.relative(OUTPUTS_DIR, fullPath);
        const folderPath = path.dirname(fullPath);
        const folderName = path.basename(folderPath);

        let metadata = { chassis: folderName };
        let totalSKUs = countSKUsInJson(fullPath);
        try {
          const content = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
          metadata = content.metadata || metadata;
        } catch (_) {}

        const servicesFileName = item.name.replace(/_Catalog\.json$/, '_Services.json');
        const servicesFullPath = path.join(folderPath, servicesFileName);
        const servicesSKUs = countSKUsInJson(servicesFullPath);
        totalSKUs += servicesSKUs;
        try { totalSKUs = loadAndNormalizeCatalog(fullPath).metadata.totalUniqueSKUs; } catch (_) {}

        const pdfFile = fs.readdirSync(folderPath).find(f => f.endsWith('.pdf'));
        const xlsxFile = fs.readdirSync(folderPath).find(f => f.endsWith('.xlsx'));

        catalogs.push({
          id: folderName,
          chassis: metadata.chassis || folderName,
          family: relativePath.split(path.sep)[0] || 'Unknown',
          gen: relativePath.split(path.sep)[1] || 'Unknown',
          chassisDir: path.relative(OUTPUTS_DIR, folderPath).replace(/\\/g, '/'),
          jsonPath: `/artifacts/${relativePath.replace(/\\/g, '/')}`,
          xlsxPath: xlsxFile ? `/artifacts/${path.relative(OUTPUTS_DIR, path.join(folderPath, xlsxFile)).replace(/\\/g, '/')}` : null,
          pdfPath: pdfFile ? `/artifacts/${path.relative(OUTPUTS_DIR, path.join(folderPath, pdfFile)).replace(/\\/g, '/')}` : null,
          totalSKUs,
          scrapeDate: metadata.scrapeDate || 'N/A'
        });
      }
    }
  }

  findCatalogs(OUTPUTS_DIR);
  _catalogCache = catalogs;
  return catalogs;
}

// ── Helper: Recursively find a chassis folder by name ────────────────────────
function findChassisFolderRecursively(baseDir, folderName) {
  if (!fs.existsSync(baseDir)) return null;
  for (const item of fs.readdirSync(baseDir, { withFileTypes: true })) {
    if (!item.isDirectory()) continue;
    if (item.name === folderName) return path.join(baseDir, item.name);
    if (['history', 'raw_data', 'intermittent_scraps', 'temp', 'runs'].includes(item.name)) continue;
    const found = findChassisFolderRecursively(path.join(baseDir, item.name), folderName);
    if (found) return found;
  }
  return null;
}

// ── Routes ────────────────────────────────────────────────────────────────────

router.get('/available-catalogs', (req, res) => {
  res.json({ catalogs: getCachedCatalogs() });
});

router.get('/catalog-data', (req, res) => {
  const relPath = req.query.path;
  if (!relPath) return sendErrorResponse(res, 400, 'Missing path query parameter', { source: 'CATALOGS_ROUTER' });
  let fullPath;
  try { fullPath = assertSafePath(relPath); } catch (e) { return sendErrorResponse(res, 403, e, { source: 'CATALOGS_ROUTER' }); }
  if (!fs.existsSync(fullPath)) return sendErrorResponse(res, 404, 'Catalog file not found', { source: 'CATALOGS_ROUTER' });
  try {
    const data = loadAndNormalizeCatalog(fullPath);
    res.json(data);
  } catch (err) { sendErrorResponse(res, 500, err, { source: 'CATALOGS_ROUTER' }); }
});

router.get('/catalog-rules', (req, res) => {
  const chassisDir = req.query.chassisDir;
  if (!chassisDir) return sendErrorResponse(res, 400, 'Missing chassisDir parameter', { source: 'CATALOGS_ROUTER' });
  let targetPath;
  try { targetPath = assertSafePath(chassisDir); } catch (e) { return sendErrorResponse(res, 403, e, { source: 'CATALOGS_ROUTER' }); }
  if (!fs.existsSync(targetPath)) {
    const found = findChassisFolderRecursively(OUTPUTS_DIR, chassisDir);
    if (found) targetPath = found;
  }
  try {
    const { loadCatalogRules } = require('../../scripts/lib/catalog/catalog_rules.js');
    res.json(loadCatalogRules(targetPath));
  } catch (err) { sendErrorResponse(res, 500, err, { source: 'CATALOGS_ROUTER' }); }
});

router.get('/chassis-sync-summary', (req, res) => {
  const { listAllCatalogs } = require('../../scripts/lib/catalog/catalog_discovery.js');
  const { loadCatalogRules } = require('../../scripts/lib/catalog/catalog_rules.js');
  const { getCatalogPortfolioCoverage } = require('../../scripts/lib/catalog/catalog_portfolio.js');
  try {
    const rawCatalogs = listAllCatalogs();
    const coverageByProduct = new Map(getCatalogPortfolioCoverage().map(product => [product.product, product]));
    const summarized = new Set();
    const variantsSummary = [];
    let totalSKUsSum = 0, totalRulesSum = 0, healthyCount = 0, partialCount = 0;
    const familiesSet = new Set();

    rawCatalogs.forEach(cat => {
      const coverage = coverageByProduct.get(cat.id);
      summarized.add(cat.id);
      const relativePath = cat.relativeDir;
      const parts = relativePath.split(/[/\\]/);
      const family = parts.length >= 2 ? parts[1] : 'Unknown';
      const gen = parts.length >= 3 ? parts[2] : 'Unknown';
      if (family) familiesSet.add(family);

      let skuStatus = 'MISSING', totalSKUs = cat.skuCount || 0, baseVariants = [];
      let subcategoriesCount = cat.totalSubcategories || 0, tablesCount = cat.totalTables || 0;

      if (fs.existsSync(cat.catalogJsonPath)) {
        try {
          const content = loadAndNormalizeCatalog(cat.catalogJsonPath);
          totalSKUs = content.metadata?.totalUniqueSKUs || content.entries?.reduce((a, e) => a + (e.skuCount || 0), 0) || 0;
          subcategoriesCount = content.metadata?.totalSubcategories || content.entries?.length || 0;
          tablesCount = content.metadata?.totalTables || 0;
          skuStatus = totalSKUs > 0 ? 'PARSED' : 'EMPTY';
          content.entries?.forEach(entry => {
            const p = (entry.parentCategory || '').toLowerCase();
            const s = (entry.subCategory || '').toLowerCase();
            if (p.includes('server') || p.includes('base') || p.includes('chassis') || s.includes('variants')) {
              entry.skus?.forEach(sk => { if (sk.sku || sk['Product #']) baseVariants.push(sk.sku || sk['Product #']); });
            }
          });
        } catch (_) { skuStatus = 'CORRUPT'; }
      }

      let rulesStatus = 'MISSING', totalRules = 0;
      const ruleLevels = { VENDOR: 0, CHASSIS: 0, CATEGORY: 0, SUBCATEGORY: 0, SKU: 0 };
      let isRulesFallback = false;
      try {
        const rulesData = loadCatalogRules(cat.catalogDir);
        if (rulesData?.parsedRules) {
          totalRules = rulesData.parsedRules.length;
          isRulesFallback = !!rulesData.isFallback;
          rulesStatus = totalRules > 0 ? (isRulesFallback ? 'PARTIAL' : 'VALID') : 'EMPTY';
          rulesData.parsedRules.forEach(r => { if (r.level && ruleLevels[r.level] !== undefined) ruleLevels[r.level]++; });
        }
      } catch (_) { rulesStatus = 'ERROR'; }

      const hasExcel = !!cat.hasExcel, hasPdf = !!cat.pdf, hasDiffHistory = !!cat.hasDiffHistory;
      let syncStatus = 'INCOMPLETE';
      if (skuStatus === 'PARSED' && !coverage?.coverageIssues.length) {
        if (coverage?.freshnessStatus !== 'FRESH') { syncStatus = 'STALE_CAPTURE'; partialCount++; }
        else if (totalRules > 0 && hasExcel && !isRulesFallback) { syncStatus = 'HEALTHY'; healthyCount++; }
        else { syncStatus = 'PARSED_NO_RULES'; partialCount++; }
      }

      totalSKUsSum += totalSKUs;
      totalRulesSum += totalRules;
      variantsSummary.push({
        id: cat.id, chassis: cat.chassis || cat.id, family, gen,
        chassisDir: relativePath.replace(/\\/g, '/'),
        jsonPath: `/artifacts/${path.relative(OUTPUTS_DIR, cat.catalogJsonPath).replace(/\\/g, '/')}`,
        xlsxPath: cat.xlsxPath ? `/artifacts/${path.relative(OUTPUTS_DIR, cat.xlsxPath).replace(/\\/g, '/')}` : null,
        pdfPath: cat.pdf ? `/artifacts/${path.relative(OUTPUTS_DIR, cat.pdf.path).replace(/\\/g, '/')}` : null,
        skuStatus, totalSKUs, baseVariantsCount: baseVariants.length, subcategoriesCount, tablesCount,
        rulesStatus, totalRules, ruleLevels, isRulesFallback, hasExcel, hasPdf, hasDiffHistory, syncStatus,
        scrapeDate: cat.scrapeDate || 'N/A',
        capture: coverage
      });
    });

    for (const coverage of coverageByProduct.values()) {
      if (summarized.has(coverage.product)) continue;
      if (coverage.family) familiesSet.add(coverage.family);
      variantsSummary.push({
        id: coverage.product, chassis: coverage.name, family: coverage.family, gen: coverage.generation,
        skuStatus: 'MISSING', syncStatus: 'INCOMPLETE', totalSKUs: 0, totalRules: 0, capture: coverage
      });
    }

    const totalVariants = variantsSummary.length;
    res.json({
      summary: {
        totalFamilies: familiesSet.size, totalChassisVariants: totalVariants,
        families: [...familiesSet].sort(),
        healthyVariants: healthyCount, partialVariants: partialCount,
        totalPortfolioSKUs: totalSKUsSum, totalActiveRules: totalRulesSum,
        healthPercentage: totalVariants > 0 ? Math.round((healthyCount / totalVariants) * 100) : 0,
        generatedAt: new Date().toISOString(),
        lastSyncTimestamp: null,
        cloudSyncStatus: 'NOT_VERIFIED'
      },
      variants: variantsSummary
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/price-analytics', (req, res) => {
  const { chassisDir } = req.query;
  if (!chassisDir) return res.status(400).json({ error: 'Missing chassisDir parameter' });
  let targetChassisPath;
  try { targetChassisPath = assertSafePath(chassisDir); } catch (e) { return res.status(403).json({ error: e.message }); }
  if (!fs.existsSync(targetChassisPath)) {
    const found = findChassisFolderRecursively(OUTPUTS_DIR, chassisDir);
    if (found) targetChassisPath = found;
  }
  const historyDir = path.join(targetChassisPath, 'history');
  if (!fs.existsSync(historyDir)) return res.json({ snapshots: [], priceHistory: {}, summary: { totalSnapshots: 0 } });
  try {
    const priceHistoryFile = path.join(historyDir, 'price_history.json');
    const priceHistory = fs.existsSync(priceHistoryFile) ? JSON.parse(fs.readFileSync(priceHistoryFile, 'utf-8')) : {};
    const snapshots = fs.readdirSync(historyDir)
      .filter(f => f.startsWith('catalog_') && f.endsWith('.json') && !f.includes('deltas')).sort()
      .map(f => {
        try {
          const content = JSON.parse(fs.readFileSync(path.join(historyDir, f), 'utf-8'));
          return { filename: f, scrapeDate: content.metadata?.scrapeDate || f.replace('catalog_', '').replace('.json', ''), totalSKUs: content.metadata?.totalUniqueSKUs || 0, diffSummary: content.metadata?.diffSummary || null, priceAnalytics: content.metadata?.priceAnalytics || null };
        } catch (_) { return { filename: f, error: 'Failed to parse snapshot' }; }
      });
    res.json({ chassisDir, totalSnapshots: snapshots.length, snapshots, priceHistory });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/sku-history', (req, res) => {
  const { sku, chassisDir } = req.query;
  if (!sku || !chassisDir) return res.status(400).json({ error: 'Missing sku or chassisDir parameter' });
  try {
    const safeChassisDir = assertSafePath(chassisDir);
    const priceHistoryFile = path.join(safeChassisDir, 'history', 'price_history.json');
    if (!fs.existsSync(priceHistoryFile)) return res.json({ sku, history: [] });
    const priceHistory = JSON.parse(fs.readFileSync(priceHistoryFile, 'utf-8'));
    res.json({ sku, history: priceHistory[sku] || [] });
  } catch (err) { res.status(err.message.startsWith('HTTP 403') ? 403 : 500).json({ error: err.message }); }
});

router.get('/sku-version-audit', (req, res) => {
  const { sku, chassisDir } = req.query;
  if (!sku || !chassisDir) return res.status(400).json({ error: 'Missing sku or chassisDir parameter' });
  try {
    const safeChassisDir = assertSafePath(chassisDir);
    const { getSkuAuditHistory } = require('../../scripts/lib/catalog/sku_versioning.js');
    res.json(getSkuAuditHistory(sku, safeChassisDir));
  } catch (err) { res.status(err.message.startsWith('HTTP 403') ? 403 : 500).json({ error: err.message }); }
});

router.get('/cdp-status', async (req, res) => {
  try {
    const response = await fetch('http://127.0.0.1:9222/json', { signal: AbortSignal.timeout(1500) });
    if (!response.ok) throw new Error('CDP port not responding');
    const targets = await response.json();
    const pages = targets.filter(t => t.type === 'page');
    const ocaPage = pages.find(t => t.url.includes('oca.ext.hpe.com'));
    if (ocaPage) {
      const isSolutionRoot = ocaPage.url.includes('extended_overview_components') || ocaPage.url.includes('alletra_5000_wizard');
      return res.json({ status: 'READY', title: ocaPage.title, url: ocaPage.url, isSolutionRoot });
    }
    const loginPage = pages.find(t => t.url.includes('login.hpe.com') || t.url.includes('partner.hpe.com'));
    if (loginPage) return res.json({ status: 'AUTHENTICATING', title: loginPage.title });
    res.json({ status: 'NAVIGATING', message: 'OCA not found in open tabs' });
  } catch (err) {
    const hasOutputs = fs.existsSync(OUTPUTS_DIR) && fs.readdirSync(OUTPUTS_DIR).length > 0;
    res.json(hasOutputs
      ? { status: 'STANDBY', message: 'DOM Cache Ready (Offline Catalog Mode)', mode: 'OFFLINE_CACHE', error: err.message }
      : { status: 'DISCONNECTED', error: err.message });
  }
});

router.get('/session-observability', (req, res) => {
  const obsScript = path.join(PROJECT_ROOT, 'scripts', 'maintenance', 'observability_status.js');
  execFile('node', [obsScript, '--json'], (err, stdout) => {
    if (err) return res.status(500).json({ error: err.message, status: 'OFFLINE' });
    try { res.json(JSON.parse(stdout)); } catch (_) { res.json({ raw: stdout, status: 'RAW' }); }
  });
});

router.get('/price-history', (req, res) => {
  const { chassisDir, sku } = req.query;
  if (!sku || !chassisDir) return res.status(400).json({ error: 'Exact chassisDir and SKU parameters are required' });
  let historyFile = null;
  if (chassisDir) {
    try {
      const safeDir = assertSafePath(chassisDir);
      historyFile = path.join(safeDir, 'history', 'price_history.json');
    } catch (e) { return res.status(403).json({ error: e.message }); }
  } else {
    function searchHistory(dir) {
      if (!fs.existsSync(dir)) return;
      for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) searchHistory(fullPath);
        else if (item.name === 'price_history.json') { historyFile = fullPath; return; }
      }
    }
    searchHistory(OUTPUTS_DIR);
  }
  if (!historyFile || !fs.existsSync(historyFile)) return res.json({ sku, history: [] });
  try {
    const data = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
    res.json({ sku, history: data[sku] || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const LOG_MILESTONE_RULES = [
  ['CDP Handshake', txt => txt.includes('CDP') || txt.includes('Port 9222')],
  ['Portal Navigation', txt => txt.includes('Category') || txt.includes('navigat')],
  ['DOM SKU Extraction', txt => txt.includes('DOM') || txt.includes('extract')],
  ['Aspect Rules Synthesis', txt => txt.includes('Aspect') || txt.includes('Rules') || txt.includes('Conflict')],
  ['Catalog Artifact Generation', txt => txt.includes('Excel') || txt.includes('JSON') || txt.includes('Catalog created') || txt.includes('written')]
];

function _collectHistoryRunLogsSummary(logs, initialChassis) {
  let itemsScraped = 0;
  let chassis = initialChassis;
  let summaryText = '';
  const milestones = new Set();
  for (const entry of Array.isArray(logs) ? logs : []) {
    const txt = entry?.text || '';
    const skusMatch = txt.match(/(\d+)\s*(SKUs|unique SKUs|items|products|entries)/i);
    if (skusMatch) itemsScraped = Math.max(itemsScraped, parseInt(skusMatch[1], 10));
    const chassisMatch = !chassis && txt.match(/(DL380[^\s,]+|Alletra[^\s,]+|GX5000[^\s,]+|MSL3040[^\s,]+|SY100Gb[^\s,]+)/i);
    if (chassisMatch) chassis = chassisMatch[1];
    for (const [label, matcher] of LOG_MILESTONE_RULES) {
      if (matcher(txt)) milestones.add(label);
    }
    if (/PASS|SUCCESS|completed|Complete/.test(txt)) summaryText = txt.substring(0, 120);
  }
  return { itemsScraped, chassis, summaryText, milestones: [...milestones] };
}

function _deriveHistoryRunSummaryText(status, exitCode, existingText) {
  if (existingText) return existingText;
  const labels = {
    CANCELLED: 'Run cancelled by operator',
    INTERRUPTED: 'Interrupted by backend restart',
    ACTION_REQUIRED: 'Clarification or action required',
    RUNNING: 'Run in progress'
  };
  return labels[status] || (exitCode === 0 ? 'Task executed successfully' : 'Task finished with errors');
}

function _deriveHistoryRunSummary(data) {
  const logSummary = _collectHistoryRunLogsSummary(data.logs, data.product || null);
  const status = data.status || (data.exitCode === 0 ? 'COMPLETED' : 'FAILED');
  return {
    runId: data.runId,
    taskType: data.taskType || data.task || 'UNKNOWN',
    product: data.product || logSummary.chassis || null,
    status,
    stage: data.stage || null,
    startTime: data.startTime,
    durationMs: data.durationMs,
    exitCode: data.exitCode,
    itemsScraped: logSummary.itemsScraped,
    chassis: logSummary.chassis || 'General HPE Portfolio',
    effectivePolicy: data.effectivePolicy || null,
    hasRecoverableResult: Boolean(data.result || data.queryResult),
    milestones: logSummary.milestones,
    summaryText: _deriveHistoryRunSummaryText(status, data.exitCode, logSummary.summaryText),
    logCount: data.logs?.length || 0
  };
}

router.get('/history/runs', (req, res) => {
  const { listPersistedRuns, isValidRunId } = require('../services/runState.cjs');
  const runsDir = path.join(OUTPUTS_DIR, 'history', 'runs');
  try {
    const mergedById = new Map();
    if (fs.existsSync(runsDir)) {
      for (const f of fs.readdirSync(runsDir).filter(name => name.endsWith('.json'))) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(runsDir, f), 'utf-8'));
          if (data && isValidRunId(data.runId)) mergedById.set(data.runId, data);
        } catch (_) {}
      }
    }
    for (const runRec of listPersistedRuns()) {
      const existing = mergedById.get(runRec.runId) || {};
      const mergedLogs = (Array.isArray(existing.logs) && existing.logs.length > (runRec.logs?.length || 0))
        ? existing.logs
        : (runRec.logs || existing.logs || []);
      mergedById.set(runRec.runId, { ...existing, ...runRec, logs: mergedLogs });
    }
    const runs = Array.from(mergedById.values())
      .map(_deriveHistoryRunSummary)
      .sort((a, b) => new Date(b.startTime || 0) - new Date(a.startTime || 0));
    res.json(runs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/history/runs/:id', (req, res) => {
  const { id } = req.params;
  const { isValidRunId, getRunById } = require('../services/runState.cjs');
  if (!isValidRunId(id)) return res.status(400).json({ error: 'Invalid trace ID format' });
  const runFile = path.join(OUTPUTS_DIR, 'history', 'runs', `${id}.json`);
  let traceData = null;
  if (fs.existsSync(runFile)) {
    try { traceData = JSON.parse(fs.readFileSync(runFile, 'utf-8')); } catch (err) { return res.status(500).json({ error: err.message }); }
  }
  const runRecord = getRunById(id);
  if (!traceData && !runRecord) return res.status(404).json({ error: 'Run trace not found' });
  const mergedLogs = (Array.isArray(traceData?.logs) && traceData.logs.length > (runRecord?.logs?.length || 0))
    ? traceData.logs
    : (runRecord?.logs || traceData?.logs || []);
  return res.json({ ...traceData, ...runRecord, logs: mergedLogs });
});

router.get('/history/exports', (req, res) => {
  const historyExportsDir = path.join(OUTPUTS_DIR, 'history', 'exports');
  if (!fs.existsSync(historyExportsDir)) return res.json([]);
  try {
    const files = fs.readdirSync(historyExportsDir).filter(f => f.endsWith('.json'));
    const exportsList = files.map(f => {
      try { return JSON.parse(fs.readFileSync(path.join(historyExportsDir, f), 'utf-8')); } catch (_) { return null; }
    }).filter(item => item && item.isDiagnostic !== true && !String(item.filename || '').includes('INTERNAL_DIAGNOSTIC')).sort((a, b) => new Date(b.exportedAt) - new Date(a.exportedAt));
    const limit = parseInt(req.query.limit, 10) || 5;
    res.json(exportsList.slice(0, limit));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── QuickSpecs vs OCA Reconciliation Endpoints (GAP 4) ───────────────────────
router.post('/reconcile-quickspecs', (req, res) => {
  const { targetDir } = req.body || {};
  const resolvedDir = targetDir
    ? (path.isAbsolute(targetDir) ? targetDir : path.join(PROJECT_ROOT, targetDir))
    : path.join(OUTPUTS_DIR, 'ProLiant', 'Gen11', 'DL380_Gen11');

  try {
    assertSafePath(resolvedDir, [OUTPUTS_DIR]);
  } catch (err) {
    return sendErrorResponse(res, 403, `Invalid or unsafe path: ${err.message}`);
  }

  try {
    const { reconcileProductCatalog } = require(path.join(PROJECT_ROOT, 'scripts', 'catalogs', 'reconcile_quickspecs_oca.js'));
    const report = reconcileProductCatalog(resolvedDir);
    return res.json({ success: true, report });
  } catch (err) {
    return sendErrorResponse(res, 500, `QuickSpecs reconciliation failed: ${err.message}`);
  }
});

router.get('/reconcile-quickspecs/latest', (req, res) => {
  const reportPath = path.join(OUTPUTS_DIR, 'history', 'quickspecs_oca_reconciliation.json');
  if (!fs.existsSync(reportPath)) {
    return res.status(404).json({ error: 'No reconciliation report found' });
  }
  try {
    const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    return res.json(data);
  } catch (err) {
    return sendErrorResponse(res, 500, `Failed to read reconciliation report: ${err.message}`);
  }
});

module.exports = router;
module.exports.invalidateCatalogCache = invalidateCatalogCache;

