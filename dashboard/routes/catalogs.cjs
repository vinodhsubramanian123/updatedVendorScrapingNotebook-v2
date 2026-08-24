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

const { assertSafePath, tryResolveSafePath, OUTPUTS_DIR } = require('../services/pathGuard.cjs');
const { sendErrorResponse } = require('../services/errorHandler.cjs');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const CONFIG_DIR = path.join(PROJECT_ROOT, 'scripts', 'config');
const HISTORY_DIR = path.join(OUTPUTS_DIR, 'history');

// ── Catalog Registry Cache (GAP-L5) ──────────────────────────────────────────
let _catalogCache = null;

/** Call this after a scrape/rebuild SSE TASK_COMPLETED event. */
function invalidateCatalogCache() {
  _catalogCache = null;
}

/**
 * Recursively discover chassis catalog files under OUTPUTS_DIR.
 * Returns built catalog list; result is cached until invalidated.
 */
function getCachedCatalogs() {
  if (_catalogCache) return _catalogCache;

  let convertCSVToCatalogJSON = null;
  let syncAllProducts = null;
  try {
    const csvMod = require('../../scripts/catalogs/csv_to_catalog.js');
    convertCSVToCatalogJSON = csvMod.convertCSVToCatalogJSON;
    const syncMod = require('../../scripts/catalogs/sync_all_registered_catalogs.js');
    syncAllProducts = syncMod.syncAllProducts;
    if (syncAllProducts) syncAllProducts();
  } catch (_) {
    // Optional modules — skip gracefully
  }

  const catalogs = [];

  function findCatalogs(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir, { withFileTypes: true });

    // Auto-sync CSV → JSON if stale
    const csvFile = items.find(i => i.isFile() && i.name.endsWith('_Catalog_SKUs.csv'));
    if (csvFile) {
      const csvPath = path.join(dir, csvFile.name);
      const jsonName = csvFile.name.replace(/_Catalog_SKUs\.csv$/, '_Catalog.json');
      const jsonPath = path.join(dir, jsonName);
      let needsSync = !fs.existsSync(jsonPath);
      if (!needsSync) {
        try {
          const content = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
          const jsonSKUs = content.metadata?.totalUniqueSKUs || 0;
          const csvLines = fs.readFileSync(csvPath, 'utf-8').split('\n').filter(l => l.trim()).length;
          const csvSKUs = Math.max(0, csvLines - 1);
          if (jsonSKUs < csvSKUs) needsSync = true;
        } catch (_) { needsSync = true; }
      }
      if (needsSync && convertCSVToCatalogJSON) {
        try { convertCSVToCatalogJSON(csvPath, jsonPath); } catch (e) {
          console.error(`Error auto-converting ${csvFile.name}:`, e.message);
        }
      }
    }

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
        let totalSKUs = 0;
        try {
          const content = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
          metadata = content.metadata || metadata;
          totalSKUs = metadata.totalUniqueSKUs || content.entries?.reduce((acc, e) => acc + (e.skuCount || 0), 0) || 0;
        } catch (_) {}

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
    res.setHeader('Content-Type', 'application/json');
    res.send(fs.readFileSync(fullPath, 'utf-8'));
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
  try {
    const rawCatalogs = listAllCatalogs();
    const variantsSummary = [];
    let totalSKUsSum = 0, totalRulesSum = 0, healthyCount = 0, partialCount = 0;
    const familiesSet = new Set();

    rawCatalogs.forEach(cat => {
      const relativePath = cat.relativeDir;
      const parts = relativePath.split(/[/\\]/);
      const family = parts.length >= 2 ? parts[1] : 'Unknown';
      const gen = parts.length >= 3 ? parts[2] : 'Unknown';
      if (family) familiesSet.add(family);

      let skuStatus = 'MISSING', totalSKUs = cat.skuCount || 0, baseVariants = [];
      let subcategoriesCount = cat.totalSubcategories || 0, tablesCount = cat.totalTables || 0;

      if (fs.existsSync(cat.catalogJsonPath)) {
        try {
          const content = JSON.parse(fs.readFileSync(cat.catalogJsonPath, 'utf-8'));
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
      let syncStatus = 'HEALTHY';
      if (skuStatus === 'PARSED' && totalRules > 0 && hasExcel) { syncStatus = 'HEALTHY'; healthyCount++; }
      else if (skuStatus === 'PARSED') { syncStatus = 'PARSED_NO_RULES'; partialCount++; }
      else syncStatus = 'INCOMPLETE';

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
        scrapeDate: cat.scrapeDate || 'N/A'
      });
    });

    const totalVariants = variantsSummary.length;
    res.json({
      summary: {
        totalFamilies: familiesSet.size, totalChassisVariants: totalVariants,
        healthyVariants: healthyCount, partialVariants: partialCount,
        totalPortfolioSKUs: totalSKUsSum, totalActiveRules: totalRulesSum,
        healthPercentage: totalVariants > 0 ? Math.round((healthyCount / totalVariants) * 100) : 0,
        lastSyncTimestamp: new Date().toISOString()
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
      .filter(f => f.startsWith('catalog_') && f.endsWith('.json')).sort()
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
  if (!sku) return res.status(400).json({ error: 'SKU parameter required' });
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

router.get('/history/runs', (req, res) => {
  const runsDir = path.join(OUTPUTS_DIR, 'history', 'runs');
  if (!fs.existsSync(runsDir)) return res.json([]);
  try {
    const files = fs.readdirSync(runsDir).filter(f => f.endsWith('.json'));
    const runs = files.map(f => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(runsDir, f), 'utf-8'));
        let itemsScraped = 0, chassis = null, summaryText = '';
        const milestones = [];
        if (Array.isArray(data.logs)) {
          for (const l of data.logs) {
            const txt = l.text || '';
            const skusMatch = txt.match(/(\d+)\s*(SKUs|unique SKUs|items|products|entries)/i);
            if (skusMatch) itemsScraped = Math.max(itemsScraped, parseInt(skusMatch[1], 10));
            const chassisMatch = txt.match(/(DL380[^\s,]+|Alletra[^\s,]+|GX5000[^\s,]+|MSL3040[^\s,]+|SY100Gb[^\s,]+)/i);
            if (chassisMatch && !chassis) chassis = chassisMatch[1];
            if (txt.includes('CDP') || txt.includes('Port 9222')) milestones.push('CDP Handshake');
            if (txt.includes('Category') || txt.includes('navigat')) milestones.push('Portal Navigation');
            if (txt.includes('DOM') || txt.includes('extract')) milestones.push('DOM SKU Extraction');
            if (txt.includes('Aspect') || txt.includes('Rules') || txt.includes('Conflict')) milestones.push('Aspect Rules Synthesis');
            if (txt.includes('Excel') || txt.includes('JSON') || txt.includes('Catalog created') || txt.includes('written')) milestones.push('Catalog Artifact Generation');
            if (txt.includes('PASS') || txt.includes('SUCCESS') || txt.includes('completed') || txt.includes('Complete')) summaryText = txt.substring(0, 120);
          }
        }
        return {
          runId: data.runId, taskType: data.taskType, startTime: data.startTime,
          durationMs: data.durationMs, exitCode: data.exitCode, itemsScraped,
          chassis: chassis || 'General HPE Portfolio', milestones: [...new Set(milestones)],
          summaryText: summaryText || (data.exitCode === 0 ? 'Task executed successfully' : 'Task finished with errors'),
          logCount: data.logs?.length || 0
        };
      } catch (_) { return null; }
    }).filter(Boolean).sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    res.json(runs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/history/runs/:id', (req, res) => {
  const { id } = req.params;
  if (!/^[a-zA-Z0-9_\-]+$/.test(id)) return res.status(400).json({ error: 'Invalid trace ID format' });
  const runFile = path.join(OUTPUTS_DIR, 'history', 'runs', `${id}.json`);
  if (!fs.existsSync(runFile)) return res.status(404).json({ error: 'Run trace not found' });
  try { res.json(JSON.parse(fs.readFileSync(runFile, 'utf-8'))); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/history/exports', (req, res) => {
  const historyExportsDir = path.join(OUTPUTS_DIR, 'history', 'exports');
  if (!fs.existsSync(historyExportsDir)) return res.json([]);
  try {
    const files = fs.readdirSync(historyExportsDir).filter(f => f.endsWith('.json'));
    const exportsList = files.map(f => {
      try { return JSON.parse(fs.readFileSync(path.join(historyExportsDir, f), 'utf-8')); } catch (_) { return null; }
    }).filter(Boolean).sort((a, b) => new Date(b.exportedAt) - new Date(a.exportedAt));
    const limit = parseInt(req.query.limit, 10) || 5;
    res.json(exportsList.slice(0, limit));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
module.exports.invalidateCatalogCache = invalidateCatalogCache;
