'use strict';
/**
 * scripts/lib/catalog/product_metadata_manager.js
 *
 * Dedicated Product Generation Metadata & Freshness Lifecycle Manager
 *
 * Manages unique metadata for every scraped product generation:
 * - Scrape timestamps, age calculation (monthly 30-day cadence & 72h fast-track).
 * - Catalog SHA-256 fingerprints and SKU counts.
 * - Product-specific NotebookLM notebook binding and sync states.
 * - Atomic post-resync update guarantees (updates metadata & syncs to NotebookLM
 *   ONLY after portal resync and staging audit succeed).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { safeWriteJsonAtomic } = require('../system/fs_compat.js');
const { auditCatalogFreshness, normalizeCatalogMetadata } = require('./catalog_freshness_guard.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const OUTPUTS_ROOT = path.join(PROJECT_ROOT, 'outputs');
const CONFIG_NOTEBOOKS = path.join(PROJECT_ROOT, 'scripts', 'config', 'notebooks.json');
const MASTER_METADATA_PATH = path.join(OUTPUTS_ROOT, 'history', 'product_generation_metadata.json');

const DEFAULT_CADENCE_DAYS = 30; // Monthly cadence
const FAST_TRACK_STALE_HOURS = 72; // 72-hour warning for fast-moving components

/**
 * Calculate SHA-256 of file or content
 */
function calculateFileSha256(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Resolve product notebook details from scripts/config/notebooks.json
 */
function getProductNotebookMeta(productKey) {
  if (!fs.existsSync(CONFIG_NOTEBOOKS)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(CONFIG_NOTEBOOKS, 'utf-8'));
    const notebooks = raw.notebooks || {};
    if (notebooks[productKey]) return notebooks[productKey];

    const clean = productKey.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const [k, v] of Object.entries(notebooks)) {
      if (k.toLowerCase().replace(/[^a-z0-9]/g, '') === clean) {
        return v;
      }
    }
  } catch (e) {
    // Fail-safe
  }
  return null;
}

/**
 * Scan all outputs/ directories to discover all scraped product generations
 */
function discoverAllProductCatalogs() {
  const products = [];
  if (!fs.existsSync(OUTPUTS_ROOT)) return products;

  function scanDir(current) {
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }

    const jsonFile = entries.find(e => e.isFile() && e.name.endsWith('_Catalog.json'));
    if (jsonFile) {
      const fullJsonPath = path.join(current, jsonFile.name);
      products.push({
        chassisDir: path.basename(current),
        catalogPath: fullJsonPath,
        outputDir: current
      });
      return;
    }

    for (const entry of entries) {
      if (entry.isDirectory() && !['history', 'temp', 'raw_data', 'intermittent_scraps'].includes(entry.name)) {
        scanDir(path.join(current, entry.name));
      }
    }
  }

  scanDir(OUTPUTS_ROOT);
  return products;
}

/**
 * Inspect and extract complete unique metadata for a single product catalog
 */
function getProductGenerationMetadata(productKeyOrDir) {
  const discovered = discoverAllProductCatalogs();
  const target = discovered.find(p => 
    p.chassisDir.toLowerCase() === productKeyOrDir.toLowerCase() ||
    path.basename(p.catalogPath, '_Catalog.json').toLowerCase() === productKeyOrDir.toLowerCase()
  );

  if (!target || !fs.existsSync(target.catalogPath)) {
    return {
      productKey: productKeyOrDir,
      exists: false,
      freshnessStatus: 'UNSCRAPED',
      ageInDays: null,
      needsResync: true,
      error: `Catalog not found for product generation: ${productKeyOrDir}`
    };
  }

  let catalogData;
  try {
    catalogData = JSON.parse(fs.readFileSync(target.catalogPath, 'utf-8'));
  } catch (err) {
    return {
      productKey: target.chassisDir,
      exists: true,
      corrupted: true,
      freshnessStatus: 'CORRUPTED',
      needsResync: true,
      error: `Catalog JSON could not be parsed: ${err.message}`
    };
  }

  const normalized = normalizeCatalogMetadata(catalogData.metadata);
  const freshness = auditCatalogFreshness(catalogData, { staleWarningDays: DEFAULT_CADENCE_DAYS });
  const notebookMeta = getProductNotebookMeta(target.chassisDir);
  const sha256 = calculateFileSha256(target.catalogPath);

  // Check hours elapsed for fast-track alert (<72h warning)
  let ageInHours = null;
  if (normalized.scrapeTimestamp) {
    const elapsedMs = Date.now() - new Date(normalized.scrapeTimestamp).getTime();
    if (elapsedMs >= 0) {
      ageInHours = Math.floor(elapsedMs / (1000 * 60 * 60));
    }
  }

  const isStale = freshness.freshnessStatus === 'STALE_WARNING' || freshness.freshnessStatus === 'CRITICAL_OUTDATED';

  return {
    productKey: target.chassisDir,
    exists: true,
    family: normalized.family,
    generation: normalized.generation,
    model: normalized.chassis,
    chassisDir: target.chassisDir,
    catalogPath: target.catalogPath,
    outputDir: target.outputDir,
    scrapeDate: normalized.scrapeDate,
    scrapeTimestamp: normalized.scrapeTimestamp,
    ageInDays: freshness.ageInDays,
    ageInHours,
    cadencePolicyDays: DEFAULT_CADENCE_DAYS,
    freshnessStatus: freshness.freshnessStatus,
    isFresh: freshness.isFresh,
    isStale,
    isCriticalOutdated: freshness.isCriticalOutdated,
    needsResync: isStale || freshness.freshnessStatus === 'CRITICAL_OUTDATED',
    staleWarning72h: ageInHours !== null && ageInHours > FAST_TRACK_STALE_HOURS,
    totalUniqueSKUs: normalized.totalUniqueSKUs,
    totalSubcategories: normalized.totalSubcategories,
    totalTables: normalized.totalTables,
    catalogSha256: sha256,
    notebook: {
      notebookId: notebookMeta?.notebookId || null,
      lastSyncedAt: notebookMeta?.lastSyncedAt || null,
      queryEnabled: notebookMeta?.queryEnabled !== false,
      syncState: notebookMeta?.lastSyncedAt ? 'SYNCED' : 'UNSYNCED'
    },
    advisories: freshness.advisories
  };
}

/**
 * Generate and atomically save master product generation metadata registry
 */
function refreshMasterProductMetadata() {
  const discovered = discoverAllProductCatalogs();
  const registry = {
    generatedAt: new Date().toISOString(),
    schemaVersion: '2.0',
    cadencePolicy: 'MONTHLY_30_DAYS',
    products: {}
  };

  for (const item of discovered) {
    const meta = getProductGenerationMetadata(item.chassisDir);
    registry.products[meta.productKey] = meta;
  }

  safeWriteJsonAtomic(MASTER_METADATA_PATH, registry);
  return registry;
}

/**
 * Atomic Post-Resync Verification and Metadata Promotion
 * ONLY called after successful completion of live portal scrape and staging audit.
 * 
 * @param {object} params - { productKey, catalogPath, scrapeTimestamp, uniqueSKUs, stagingAuditPassed }
 * @returns {object} Updated metadata receipt
 */
function commitSuccessfulResyncMetadata(params) {
  const { productKey, catalogPath, scrapeTimestamp, uniqueSKUs, stagingAuditPassed } = params;

  if (!stagingAuditPassed) {
    throw new Error(`[ATOMIC_GUARD] Cannot commit metadata for ${productKey}: Staging audit did not pass!`);
  }

  if (!fs.existsSync(catalogPath)) {
    throw new Error(`[ATOMIC_GUARD] Cannot commit metadata for ${productKey}: Promoted catalog.json not found at ${catalogPath}`);
  }

  const catalogSha256 = calculateFileSha256(catalogPath);
  const now = scrapeTimestamp || new Date().toISOString();
  const dateStr = now.split('T')[0];

  let masterRegistry = { schemaVersion: '2.0', products: {} };
  if (fs.existsSync(MASTER_METADATA_PATH)) {
    try {
      masterRegistry = JSON.parse(fs.readFileSync(MASTER_METADATA_PATH, 'utf-8'));
    } catch {
      // Re-init
    }
  }

  const productMeta = getProductGenerationMetadata(productKey);

  const updatedRecord = {
    ...productMeta,
    productKey,
    scrapeDate: dateStr,
    scrapeTimestamp: now,
    ageInDays: 0,
    ageInHours: 0,
    freshnessStatus: 'FRESH',
    isFresh: true,
    isStale: false,
    needsResync: false,
    totalUniqueSKUs: uniqueSKUs || productMeta.totalUniqueSKUs,
    catalogSha256,
    lastPromotedAt: now,
    promotionVerified: true
  };

  masterRegistry.products[productKey] = updatedRecord;
  masterRegistry.lastUpdated = now;

  safeWriteJsonAtomic(MASTER_METADATA_PATH, masterRegistry);

  return {
    success: true,
    productKey,
    updatedRecord,
    readyForNotebookSync: true
  };
}

module.exports = {
  discoverAllProductCatalogs,
  getProductGenerationMetadata,
  refreshMasterProductMetadata,
  commitSuccessfulResyncMetadata,
  DEFAULT_CADENCE_DAYS,
  FAST_TRACK_STALE_HOURS,
  MASTER_METADATA_PATH
};
