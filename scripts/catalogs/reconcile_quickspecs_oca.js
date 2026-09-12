'use strict';
/**
 * scripts/catalogs/reconcile_quickspecs_oca.js — Dual-Way QuickSpecs vs OCA Catalog Intelligence Recon
 *
 * Performs deep bi-directional reconciliation between vendor QuickSpecs documentation
 * (from PDF/NotebookLM RAG ground-truth) and live scraped OCA master catalogs.
 *
 * Identifies:
 * 1. QuickSpecs SKUs missing from OCA (e.g. collapsed WebLogic sub-menus, unclicked toggles)
 * 2. OCA SKUs missing from QuickSpecs (e.g. newer component releases, FIO factory-only SKUs)
 * 3. Parity score and actionable DOM expansion guidance for the scraper
 */

const fs = require('fs');
const path = require('path');
const { cleanBaseSKU, isValidHpeSKU } = require('../lib/catalog/sku.js');
const { safeWriteJsonAtomic } = require('../lib/system/fs_compat.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const OUTPUTS_DIR = path.join(PROJECT_ROOT, 'outputs');

/**
 * Extract SKUs from PDF binary stream buffer or text file
 * @param {string} filePath 
 * @returns {Set<string>} Set of extracted SKUs
 */
function extractSkusFromDocument(filePath) {
  const skus = new Set();
  if (!fs.existsSync(filePath)) return skus;

  const buffer = fs.readFileSync(filePath);
  // Scan raw buffer converted to latin1/utf-8 text to find SKU token matches
  const text = buffer.toString('latin1');
  const potentialMatches = text.match(/[A-Z0-9]{5,7}-[A-Z0-9]{3,4}|[A-Z0-9]{6}\b/g) || [];

  for (const m of potentialMatches) {
    const clean = cleanBaseSKU(m);
    if (isValidHpeSKU(clean)) {
      skus.add(clean);
    }
  }

  return skus;
}

/**
 * Extract SKUs from catalog.json
 * @param {string} catalogPath 
 * @returns {Map<string, object>} SKU map with item details
 */
function extractSkusFromCatalog(catalogPath) {
  const skuMap = new Map();
  if (!fs.existsSync(catalogPath)) return skuMap;

  try {
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
    const entries = catalog.entries || [];

    for (const entry of entries) {
      const parentCat = entry.parentCategory || '';
      const subCat = entry.subCategory || '';
      const items = entry.skus || [];

      for (const it of items) {
        const rawSku = it['Product #'] || it.sku || it.partNumber || '';
        const clean = cleanBaseSKU(rawSku);
        if (isValidHpeSKU(clean)) {
          skuMap.set(clean, {
            sku: clean,
            rawSku,
            description: it.Description || it.description || '',
            parentCategory: parentCat,
            subCategory: subCat,
            price: it['Price (USD)'] || it['Unit Price (USD)'] || 0
          });
        }
      }
    }
  } catch (err) {
    console.error(`Error reading catalog at ${catalogPath}:`, err.message);
  }

  return skuMap;
}

/**
 * Find catalog and QuickSpecs files for a product generation folder
 * @param {string} targetDir 
 * @returns {object} Discovered paths
 */
function discoverProductFiles(targetDir) {
  let catalogPath = '';
  let quickspecsPath = '';

  if (fs.existsSync(targetDir)) {
    const files = fs.readdirSync(targetDir);
    for (const f of files) {
      if (f.endsWith('_Catalog.json') || f === 'catalog.json') {
        catalogPath = path.join(targetDir, f);
      }
      if (f.endsWith('_QuickSpecs.pdf') || f.toLowerCase().includes('quickspecs')) {
        quickspecsPath = path.join(targetDir, f);
      }
    }

    // Fallback: If no local QuickSpecs PDF, check for NotebookLM sync payload markdown
    if (!quickspecsPath) {
      for (const f of files) {
        if (f.startsWith('notebook_sync_payload_') && f.endsWith('.md')) {
          quickspecsPath = path.join(targetDir, f);
          break;
        }
      }
    }
  }

  return { catalogPath, quickspecsPath };
}

/**
 * Reconcile QuickSpecs against OCA Catalog for a target directory
 * @param {string} targetDir 
 * @returns {object} Reconciliation report
 */
function reconcileProductCatalog(targetDir) {
  const resolvedDir = path.isAbsolute(targetDir) ? targetDir : path.resolve(process.cwd(), targetDir);
  const { catalogPath, quickspecsPath } = discoverProductFiles(resolvedDir);

  if (!catalogPath) {
    throw new Error(`No catalog JSON found in ${resolvedDir}`);
  }

  console.log(`\n================================================================`);
  console.log(`🔍 DUAL-WAY QUICKSPECS & OCA INTELLIGENCE RECONCILIATION`);
  console.log(`================================================================`);
  console.log(`Target Directory : ${resolvedDir}`);
  console.log(`Catalog JSON     : ${catalogPath ? path.basename(catalogPath) : 'NOT FOUND'}`);
  console.log(`QuickSpecs Doc   : ${quickspecsPath ? path.basename(quickspecsPath) : 'NOT FOUND'}`);

  const catalogSkuMap = extractSkusFromCatalog(catalogPath);
  const quickspecsSkus = quickspecsPath ? extractSkusFromDocument(quickspecsPath) : new Set();

  const shared = [];
  const ocaExclusive = [];
  const quickspecsExclusive = [];

  // Check OCA catalog SKUs
  for (const [sku, item] of catalogSkuMap.entries()) {
    if (quickspecsSkus.has(sku)) {
      shared.push(item);
    } else {
      ocaExclusive.push(item);
    }
  }

  // Check QuickSpecs SKUs
  for (const sku of quickspecsSkus) {
    if (!catalogSkuMap.has(sku)) {
      quickspecsExclusive.push({ sku });
    }
  }

  const totalCatalogSkus = catalogSkuMap.size;
  const totalQuickspecsSkus = quickspecsSkus.size;
  const parityPercent = totalCatalogSkus > 0 ? ((shared.length / totalCatalogSkus) * 100) : 0;

  // DOM sub-menu recovery suggestions
  const potentialCollapsedOptions = [];
  if (quickspecsExclusive.length > 0) {
    potentialCollapsedOptions.push(
      'Ensure WebLogic DOM expansion triggers all showmore_* and #show_extra_columns toggles.',
      'Verify whether missing SKUs are regional (e.g. EMEA / APJ only) or recently announced options.'
    );
  }

  const report = {
    targetDir: resolvedDir,
    timestamp: new Date().toISOString(),
    metrics: {
      totalCatalogSkus,
      totalQuickspecsSkus,
      sharedCount: shared.length,
      ocaExclusiveCount: ocaExclusive.length,
      quickspecsExclusiveCount: quickspecsExclusive.length,
      catalogQuickspecsParityPercent: parseFloat(parityPercent.toFixed(1))
    },
    recommendations: potentialCollapsedOptions,
    quickspecsExclusiveSample: quickspecsExclusive.slice(0, 50),
    ocaExclusiveSample: ocaExclusive.slice(0, 50)
  };

  console.log(`----------------------------------------------------------------`);
  console.log(`Total Catalog SKUs in OCA     : ${totalCatalogSkus}`);
  console.log(`Total SKUs in QuickSpecs      : ${totalQuickspecsSkus}`);
  console.log(`Shared Verified SKUs          : ${shared.length} (${parityPercent.toFixed(1)}% match)`);
  console.log(`OCA-Exclusive Options (New)   : ${ocaExclusive.length}`);
  console.log(`QuickSpecs-Only (Need Verify) : ${quickspecsExclusive.length}`);
  console.log(`================================================================\n`);

  // Write report atomically
  const historyDir = path.join(OUTPUTS_DIR, 'history');
  if (!fs.existsSync(historyDir)) fs.mkdirSync(historyDir, { recursive: true });
  const reportPath = path.join(historyDir, 'quickspecs_oca_reconciliation.json');
  safeWriteJsonAtomic(reportPath, report);
  console.log(`💾 Reconciliation report saved to: ${path.relative(process.cwd(), reportPath)}`);

  // Write DOM expansion guidance payload into target product history for scraper auto-enrichment (INV-20)
  const productHistoryDir = path.join(resolvedDir, 'history');
  if (fs.existsSync(productHistoryDir)) {
    const expansionGuidancePath = path.join(productHistoryDir, 'expansion_guidance.json');
    safeWriteJsonAtomic(expansionGuidancePath, {
      timestamp: new Date().toISOString(),
      targetDir: resolvedDir,
      missingQuickspecsSkusCount: quickspecsExclusive.length,
      missingQuickspecsSkus: quickspecsExclusive.map(q => q.sku),
      expansionRecommendations: potentialCollapsedOptions
    });
    console.log(`🧭 DOM Expansion guidance saved to: ${path.relative(process.cwd(), expansionGuidancePath)}`);
  }

  return report;
}

if (require.main === module) {
  const dirArg = process.argv[2] || path.join(OUTPUTS_DIR, 'ProLiant', 'Gen11', 'DL380_Gen11');
  try {
    reconcileProductCatalog(dirArg);
  } catch (err) {
    console.error('Reconciliation failed:', err.message);
    process.exit(1);
  }
}

module.exports = {
  reconcileProductCatalog,
  extractSkusFromCatalog,
  extractSkusFromDocument
};
