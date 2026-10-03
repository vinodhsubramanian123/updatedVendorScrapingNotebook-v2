'use strict';
/**
 * scripts/lib/checksum_diff.js — Incremental Hash-Based Differential Scraping Engine
 *
 * Performs SHA-256 checksum comparisons between freshly scraped product data and
 * existing workspace JSON catalogs. Ensures only modified or new SKUs undergo
 * full processing, minimizing re-parsing, classification overhead, and API token usage.
 */

const crypto = require('crypto');

/**
 * Compute a deterministic SHA-256 hash for an individual SKU object.
 * @param {object} skuObj - SKU entry containing product #, description, price, optionType, etc.
 * @returns {string} 16-character hex hash prefix
 */
function computeSkuHash(skuObj, options = {}) {
  if (!skuObj) return '';
  const pn = String(skuObj.sku || skuObj['Product #'] || skuObj['SKU'] || '').trim();
  const desc = String(skuObj.description || skuObj['Description'] || '').trim();
  const price = String(skuObj.priceUsd ?? skuObj['Unit Price (USD)'] ?? skuObj.listPrice ?? skuObj.price ?? '').trim();
  const optType = String(skuObj.optionType || skuObj['Option Type'] || '').trim();
  const qty = String(skuObj.currentQty ?? skuObj['Current Qty'] ?? '').trim();

  const visibility = String(skuObj.visibilityState || 'VISIBLE').trim();
  const conditionType = String(skuObj.conditionType || '').trim();
  const payload = JSON.stringify([pn, desc, price, optType, qty, visibility, conditionType,
    skuObj['Lifecycle Status'] ?? skuObj.lifecycleStatus ?? '', skuObj['Availability'] ?? '',
    skuObj['Start Date'] ?? '', skuObj['Discontinued Date'] ?? '',
    skuObj.thresholdValue ?? skuObj.thresholdDegC ?? null,
    skuObj.conditionOperator ?? skuObj.operator ?? '', skuObj.conditionKey ?? '']);
  const fullHash = crypto.createHash('sha256').update(payload).digest('hex');
  return options.full ? fullHash : fullHash.substring(0, 16);
}

function computeFullSkuHash(skuObj) {
  return computeSkuHash(skuObj, { full: true });
}

/**
 * Compute a hash for an entire subcategory table payload.
 * @param {object} entryObj - Catalog entry with parentCategory, subCategory, and skus array
 * @returns {string} 16-character hex hash prefix
 */
function computeTableHash(entryObj) {
  if (!entryObj) return '';
  const catKey = `${entryObj.parentCategory || ''}>${entryObj.subCategory || ''}`;
  const skuHashes = (entryObj.skus || []).map(s => computeSkuHash(s)).sort().join(';');
  const payload = `${catKey}:${skuHashes}`;
  return crypto.createHash('sha256').update(payload).digest('hex').substring(0, 16);
}

/**
 * Compare freshly scraped product entries against an existing catalog JSON workspace.
 * Identifies UNCHANGED (skip re-classification), MODIFIED (update required), ADDED, and REMOVED SKUs.
 *
 * @param {Array} scrapedEntries - Incoming raw or parsed entries array
 * @param {object} existingCatalog - Existing workspace catalog JSON object
 * @returns {object} Differential result breakdown with stats and token savings estimation
 */
function computeIncrementalDifferential(scrapedEntries, existingCatalog) {
  const result = {
    timestamp: new Date().toISOString(),
    isIncremental: false,
    stats: {
      totalScrapedSkus: 0,
      unchangedSkusCount: 0,
      modifiedSkusCount: 0,
      addedSkusCount: 0,
      removedSkusCount: 0,
      estimatedTokensSaved: 0,
      estimatedProcessingTimeSavedMs: 0
    },
    unchangedSkus: [],
    modifiedSkus: [],
    addedSkus: [],
    removedSkus: []
  };

  if (!existingCatalog || !Array.isArray(existingCatalog.entries) || existingCatalog.entries.length === 0) {
    // No previous catalog -> Full scrape/build required
    existingCatalog = { entries: [] };
  } else {
    result.isIncremental = true;
  }

  // Build lookup map of existing SKUs with their hashes
  const existingSkuMap = new Map();
  for (const entry of existingCatalog.entries) {
    for (const sku of (entry.skus || [])) {
      const pn = String(sku.sku || sku['Product #'] || sku['SKU'] || '').trim();
      if (pn) {
        existingSkuMap.set(pn, {
          ...sku,
          parentCategory: entry.parentCategory,
          subCategory: entry.subCategory,
          hash: computeSkuHash(sku)
        });
      }
    }
  }

  const seenNewSkus = new Set();

  // Process incoming scraped entries
  for (const entry of (scrapedEntries || [])) {
    for (const sku of (entry.skus || [])) {
      const pn = String(sku.sku || sku['Product #'] || sku['SKU'] || '').trim();
      if (!pn) continue;
      if (seenNewSkus.has(pn)) continue;

      result.stats.totalScrapedSkus++;
      seenNewSkus.add(pn);

      const newHash = computeSkuHash(sku);
      const existing = existingSkuMap.get(pn);

      if (existing) {
        if (existing.hash === newHash) {
          // Checksum match! SKU is completely unchanged
          result.stats.unchangedSkusCount++;
          result.unchangedSkus.push({
            sku: pn,
            hash: newHash,
            status: 'UNCHANGED',
            action: 'SKIP_RE_CLASSIFICATION'
          });
        } else {
          // Checksum mismatch! SKU modified (e.g. price change or description update)
          result.stats.modifiedSkusCount++;
          result.modifiedSkus.push({
            sku: pn,
            oldHash: existing.hash,
            newHash,
            status: 'MODIFIED',
            changes: {
              oldPrice: existing.priceUsd || existing['Unit Price (USD)'],
              newPrice: sku.priceUsd || sku['Unit Price (USD)'],
              oldDesc: existing.description || existing['Description'],
              newDesc: sku.description || sku['Description']
            }
          });
        }
      } else {
        // Brand new SKU detected
        result.stats.addedSkusCount++;
        result.addedSkus.push({
          sku: pn,
          hash: newHash,
          status: 'ADDED',
          parentCategory: entry.parentCategory,
          subCategory: entry.subCategory
        });
      }
    }
  }

  // Detect removed / discontinued SKUs
  for (const [pn, existingSku] of existingSkuMap.entries()) {
    if (!seenNewSkus.has(pn)) {
      result.stats.removedSkusCount++;
      result.removedSkus.push({
        sku: pn,
        hash: existingSku.hash,
        status: 'REMOVED_DISCONTINUED',
        parentCategory: existingSku.parentCategory,
        subCategory: existingSku.subCategory
      });
    }
  }

  // A diff after classification is observational; it has not skipped any LLM call.

  return result;
}

/**
 * Asserts that the catalog differential falls within safe operational boundaries.
 * Catches silent DOM extraction failures, network drops, or truncated scrape outputs.
 *
 * @param {object} diffResult - Output from computeIncrementalDifferential
 * @param {object} existingCatalog - Existing catalog JSON object
 * @param {object} [options] - Options: maxDroppedRatio (default 0.25), minExistingSkusForCheck (default 30), allowLargeDiff (default false)
 * @returns {{ isSafe: boolean, status: string, droppedRatio: number, growthRatio: number, message: string }}
 */
function assertDiffAnomalyBounds(diffResult, existingCatalog, options = {}) {
  const maxDroppedRatio = Number.isFinite(options.maxDroppedRatio) ? options.maxDroppedRatio : 0.25;
  const minExistingSkus = Number.isFinite(options.minExistingSkusForCheck) ? options.minExistingSkusForCheck : 30;
  const allowLargeDiff = options.allowLargeDiff === true || process.env.FORCE_LARGE_CATALOG_DIFF === '1';

  const existingEntries = existingCatalog?.entries || [];
  const existingSkuCount = existingEntries.reduce((sum, e) => sum + (e.skus || []).length, 0);

  if (existingSkuCount < minExistingSkus) {
    return {
      isSafe: true,
      status: 'BASELINE_OR_SMALL_CATALOG',
      existingSkuCount,
      droppedRatio: 0,
      growthRatio: 0,
      message: `Established catalog threshold not met (${existingSkuCount} < ${minExistingSkus} SKUs); diff anomaly bounds not enforced.`
    };
  }

  const removedCount = diffResult?.stats?.removedSkusCount || 0;
  const addedCount = diffResult?.stats?.addedSkusCount || 0;
  const droppedRatio = removedCount / existingSkuCount;
  const growthRatio = addedCount / existingSkuCount;

  if (droppedRatio > maxDroppedRatio && !allowLargeDiff) {
    const pct = (droppedRatio * 100).toFixed(1);
    const msg = `ANOMALOUS_DIFF_SUSPECTED_SCRAPE_FAILURE: Rescrape dropped ${removedCount}/${existingSkuCount} SKUs (${pct}% > ${maxDroppedRatio * 100}% threshold). Probable silent DOM expansion or network failure. Catalog promotion blocked.`;
    return {
      isSafe: false,
      status: 'ANOMALY_EXCESSIVE_DROPPED_SKUS',
      existingSkuCount,
      removedCount,
      droppedRatio,
      growthRatio,
      message: msg
    };
  }

  return {
    isSafe: true,
    status: 'NORMAL_DELTA',
    existingSkuCount,
    removedCount,
    addedCount,
    droppedRatio,
    growthRatio,
    message: `Differential is within safe operational bounds (Dropped: ${(droppedRatio * 100).toFixed(1)}%, Added: ${(growthRatio * 100).toFixed(1)}%).`
  };
}

module.exports = {
  computeSkuHash,
  computeFullSkuHash,
  computeTableHash,
  computeIncrementalDifferential,
  assertDiffAnomalyBounds
};
