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
function computeSkuHash(skuObj) {
  if (!skuObj) return '';
  const pn = String(skuObj.sku || skuObj['Product #'] || skuObj['SKU'] || '').trim();
  const desc = String(skuObj.description || skuObj['Description'] || '').trim();
  const price = String(skuObj.priceUsd || skuObj['Unit Price (USD)'] || skuObj.price || '0').trim();
  const optType = String(skuObj.optionType || skuObj['Option Type'] || '').trim();
  const qty = String(skuObj.currentQty || skuObj['Current Qty'] || '1').trim();

  const payload = `${pn}|${desc}|${price}|${optType}|${qty}`;
  return crypto.createHash('sha256').update(payload).digest('hex').substring(0, 16);
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
    return result;
  }

  result.isIncremental = true;

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

  // Estimate savings: Each unchanged SKU avoids ~150 LLM tokens and ~200ms processing
  result.stats.estimatedTokensSaved = result.stats.unchangedSkusCount * 150;
  result.stats.estimatedProcessingTimeSavedMs = result.stats.unchangedSkusCount * 200;

  return result;
}

module.exports = {
  computeSkuHash,
  computeTableHash,
  computeIncrementalDifferential
};
