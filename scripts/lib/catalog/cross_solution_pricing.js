'use strict';
/**
 * scripts/lib/catalog/cross_solution_pricing.js
 *
 * Compares SKU pricing, FIO/BTO variants, lifecycle status, CLIC status,
 * and lead times side-by-side across all scraped solutions in outputs/.
 * Preserves nullable pricing honesty (never coerces missing prices to $0).
 */

const fs = require('fs');
const path = require('path');
const { cleanBaseSKU } = require('./sku.js');
const { listAllCatalogs } = require('./catalog_discovery.js');
const { normalizeLifecycleLabel } = require('./portfolio_blindspots.js');
const {
  parseStrictPrice,
  reconcileConflictingPrices,
  parseLeadTimeOrEta,
  buildAvailabilityContract,
  classifyRowType
} = require('./field_parsers.js');

function _resolveRowDescription(skuRow) {
  const rawDesc = String(skuRow.Description || skuRow.description || '').trim();
  if (/^\d+(?:\.\d{1,2})?$/.test(rawDesc) && skuRow.Available && !/^\d+(?:\.\d{1,2})?$/.test(String(skuRow.Available).trim())) {
    return String(skuRow.Available).trim();
  }
  return rawDesc;
}

function _parseNullablePrice(skuRow) {
  const fieldPairs = [
    ['List Price (USD)', skuRow['List Price (USD)']],
    ['Unit Price (USD)', skuRow['Unit Price (USD)']],
    ['Price (USD)', skuRow['Price (USD)']],
    ['listPrice', skuRow.listPrice]
  ].filter(([, val]) => val !== null && val !== undefined && String(val).trim() !== '');

  if (fieldPairs.length === 0) {
    return { priceUsd: null, priceStatus: 'UNPRICED', priceState: 'UNPRICED' };
  }

  const desc = _resolveRowDescription(skuRow);
  if (fieldPairs.length > 1) {
    const candidates = fieldPairs.map(([source, raw]) => ({ source, raw, row: skuRow, description: desc }));
    const reconciled = reconcileConflictingPrices(candidates);
    if (reconciled.priceState === 'CONFLICTING_EVIDENCE') {
      return { priceUsd: null, priceStatus: 'CONFLICTING_EVIDENCE', priceState: 'CONFLICTING_EVIDENCE' };
    }
  }

  const parsed = parseStrictPrice(fieldPairs[0][1], { row: skuRow, description: desc });
  return {
    priceUsd: parsed.priceUsd,
    priceStatus: parsed.priceStatus,
    priceState: parsed.priceState
  };
}

function _loadCatalogAndServices(catEntry) {
  const rows = [];
  const loadFile = (filePath, sourceKind) => {
    if (!filePath || !fs.existsSync(filePath)) return;
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const scrapeDate = parsed?.metadata?.scrapeDate || catEntry.scrapeDate || null;
      for (const entry of (parsed.entries || [])) {
        for (const skuRow of (entry.skus || [])) {
          rows.push({
            skuRow,
            parentCategory: entry.parentCategory || skuRow.parentCategory || 'Uncategorized',
            subCategory: entry.subCategory || skuRow.subCategory || '',
            sourceKind,
            scrapeDate
          });
        }
      }
    } catch { /* unreadable catalog file ignored */ }
  };

  loadFile(catEntry.catalogJsonPath, 'CATALOG');
  const servicesPath = catEntry.servicesJsonPath || path.join(catEntry.catalogDir, `${catEntry.id}_Services.json`);
  loadFile(servicesPath, 'SERVICES');
  return rows;
}

function _matchesTargetSku(rawRowSku, targetClean) {
  const rowStr = String(rawRowSku || '').trim().toUpperCase();
  if (!rowStr) return false;
  const rowClean = cleanBaseSKU(rowStr);
  if (rowClean === targetClean) return true;
  const rowStem = rowClean.replace(/-[A-Z0-9]{2,4}$/, '');
  const targetStem = targetClean.replace(/-[A-Z0-9]{2,4}$/, '');
  return Boolean(targetStem.length >= 5 && rowStem === targetStem);
}

function _summarizeSolutionMatches(matches) {
  const priced = matches.filter(m => m.priceStatus === 'PRICED' && typeof m.listPriceUsd === 'number');
  const prices = priced.map(m => m.listPriceUsd);
  const minPriceUsd = prices.length > 0 ? Math.min(...prices) : null;
  const maxPriceUsd = prices.length > 0 ? Math.max(...prices) : null;
  const spreadUsd = (minPriceUsd !== null && maxPriceUsd !== null) ? Number((maxPriceUsd - minPriceUsd).toFixed(2)) : null;
  const spreadPct = (minPriceUsd && minPriceUsd > 0 && spreadUsd !== null)
    ? Number(((spreadUsd / minPriceUsd) * 100).toFixed(2))
    : null;
  return {
    solutionsFound: new Set(matches.map(m => m.product)).size,
    totalRowMatches: matches.length,
    pricedCount: priced.length,
    unpricedCount: matches.length - priced.length,
    minPriceUsd,
    maxPriceUsd,
    spreadUsd,
    spreadPct,
    hasPriceVariance: Boolean(spreadUsd !== null && spreadUsd > 0.01)
  };
}

function compareSkuAcrossSolutions(skuQuery, options = {}) {
  if (!skuQuery || !String(skuQuery).trim()) {
    throw new Error('SKU query is required for cross-solution comparison.');
  }
  const targetClean = cleanBaseSKU(String(skuQuery).trim());
  const catalogs = Array.isArray(options.catalogs) ? options.catalogs : listAllCatalogs();
  const matches = [];

  for (const cat of catalogs) {
    const rows = _loadCatalogAndServices(cat);
    for (const item of rows) {
      const rawSku = String(item.skuRow['Product #'] || item.skuRow.sku || '').trim();
      const exactMatch = cleanBaseSKU(rawSku) === targetClean;
      if (!exactMatch && !(options.includeRelatedVariants && _matchesTargetSku(rawSku, targetClean))) continue;
      const { priceUsd, priceStatus, priceState } = _parseNullablePrice(item.skuRow);
      const leadTime = parseLeadTimeOrEta(item.skuRow['Lead Time'] || item.skuRow.leadTime, item.skuRow.leadTimeDays, item.skuRow['Speed Tier']);
      const availabilityContract = buildAvailabilityContract({ skuRow: item.skuRow });
      const rowType = classifyRowType(item.skuRow, { isBase: /base\s*chassis/i.test(item.parentCategory) });
      const genMatch = String(cat.gen || cat.id || '').match(/\b(Gen\s*\d+)\b/i);
      matches.push({
        product: cat.id,
        ownerProduct: item.skuRow.ownerProduct || cat.id,
        chassis: cat.chassis || cat.id,
        gen: cat.gen || (genMatch ? genMatch[1].replace(/\s+/g, '') : null),
        sku: rawSku,
        baseSku: cleanBaseSKU(rawSku),
        exactMatch,
        rowType,
        optionType: item.skuRow['Option Type'] || item.skuRow.optionType || (item.sourceKind === 'SERVICES' ? 'Service' : 'Hardware'),
        parentCategory: item.parentCategory,
        subCategory: item.subCategory,
        description: _resolveRowDescription(item.skuRow),
        listPriceUsd: priceUsd,
        priceStatus,
        priceState,
        lifecycleStatus: normalizeLifecycleLabel(item.skuRow['Lifecycle Status'] || item.skuRow.lifecycleStatus || 'Active'),
        visibility: availabilityContract.visibility,
        availability: availabilityContract.availability,
        compatibility: availabilityContract.compatibility,
        clicStatus: item.skuRow['CLIC Status'] || 'Unpublished',
        leadTimeDays: leadTime.days,
        leadTimeText: item.skuRow['Lead Time'] || null,
        leadTime,
        scrapeDate: item.scrapeDate
      });
    }
  }

  matches.sort((a, b) => {
    const pa = a.listPriceUsd ?? Number.MAX_SAFE_INTEGER;
    const pb = b.listPriceUsd ?? Number.MAX_SAFE_INTEGER;
    return pa !== pb ? pa - pb : a.product.localeCompare(b.product);
  });

  return {
    querySku: targetClean,
    summary: _summarizeSolutionMatches(matches),
    matches
  };
}

function findCrossSolutionPriceVariances(options = {}) {
  const catalogs = Array.isArray(options.catalogs) ? options.catalogs : listAllCatalogs();
  const minSpreadUsd = Number(options.minSpreadUsd ?? 1);
  const bySku = new Map();

  for (const cat of catalogs) {
    const rows = _loadCatalogAndServices(cat);
    for (const item of rows) {
      const rawSku = String(item.skuRow['Product #'] || item.skuRow.sku || '').trim();
      const base = cleanBaseSKU(rawSku);
      if (!base) continue;
      const { priceUsd, priceStatus } = _parseNullablePrice(item.skuRow);
      if (priceStatus !== 'PRICED') continue;
      if (!bySku.has(base)) bySku.set(base, []);
      bySku.get(base).push({
        product: cat.id,
        sku: rawSku,
        description: _resolveRowDescription(item.skuRow),
        parentCategory: item.parentCategory,
        listPriceUsd: priceUsd,
        scrapeDate: item.scrapeDate
      });
    }
  }

  const variances = [];
  for (const [baseSku, entries] of bySku.entries()) {
    const distinctProducts = new Set(entries.map(e => e.product));
    if (distinctProducts.size < 2) continue;
    const prices = entries.map(e => e.listPriceUsd);
    const minPriceUsd = Math.min(...prices);
    const maxPriceUsd = Math.max(...prices);
    const spreadUsd = Number((maxPriceUsd - minPriceUsd).toFixed(2));
    if (spreadUsd < minSpreadUsd) continue;
    variances.push({
      sku: baseSku,
      description: entries[0].description,
      parentCategory: entries[0].parentCategory,
      solutionsCount: distinctProducts.size,
      minPriceUsd,
      maxPriceUsd,
      spreadUsd,
      spreadPct: minPriceUsd > 0 ? Number(((spreadUsd / minPriceUsd) * 100).toFixed(2)) : null,
      entries
    });
  }

  variances.sort((a, b) => b.spreadUsd - a.spreadUsd);
  return {
    totalSharedPricedSkus: bySku.size,
    variancesCount: variances.length,
    variances: variances.slice(0, Number(options.limit || 50))
  };
}

function _pickMostRecentMatch(matches, field, predicate) {
  const candidates = matches.filter(match => /^\d{4}-\d{2}-\d{2}/.test(match.scrapeDate || '') && predicate(match));
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => String(b.scrapeDate || '').localeCompare(String(a.scrapeDate || '')));
  const latest = candidates.filter(match => match.scrapeDate === candidates[0].scrapeDate);
  if (new Set(latest.map(match => match[field])).size > 1) return null;
  return candidates[0];
}

function _isSameGeneration(match, targetGen) {
  if (!targetGen) return true;
  const normTarget = String(targetGen).trim().toLowerCase().replace(/\s+/g, '');
  const mGen = String(match.gen || match.product || '').match(/gen[\s_-]*\d+/i)?.[0];
  return mGen?.toLowerCase().replace(/[\s_-]+/g, '') === normTarget;
}

function backfillMissingPricesAndLeadTimes(items = [], targetGen = null, options = {}) {
  if (!Array.isArray(items)) return [];
  const catalogs = Array.isArray(options.catalogs) ? options.catalogs : listAllCatalogs();
  return items.map(item => {
    const missingPrice = item?.unitPriceUsd == null;
    const missingLead = item?.leadTimeDays === null || item?.leadTimeDays === undefined;
    const rawSku = item?.sku || item?.['Product #'];
    if (!rawSku || (!missingPrice && !missingLead)) return item;

    const cmp = compareSkuAcrossSolutions(rawSku, { catalogs });
    const scopedMatches = cmp.matches.filter(m => m.exactMatch && _isSameGeneration(m, targetGen));
    const priceMatch = missingPrice ? _pickMostRecentMatch(scopedMatches, 'listPriceUsd', m => m.priceStatus === 'PRICED' && m.listPriceUsd > 0) : null;
    const leadMatch = missingLead ? _pickMostRecentMatch(scopedMatches, 'leadTimeDays', m => Number.isFinite(m.leadTimeDays)) : null;
    if (!priceMatch && !leadMatch) return item;

    return {
      ...item,
      ...(priceMatch ? { unitPriceUsd: priceMatch.listPriceUsd, priceBackfilledFrom: priceMatch.product,
        priceBackfillEvidence: { sku: priceMatch.sku, product: priceMatch.product, date: priceMatch.scrapeDate, classification: 'CATALOG_ESTIMATE' } } : {}),
      ...(leadMatch ? { leadTimeDays: leadMatch.leadTimeDays, leadTimeBackfilledFrom: leadMatch.product,
        leadTimeBackfillEvidence: { sku: leadMatch.sku, product: leadMatch.product, date: leadMatch.scrapeDate, classification: 'CATALOG_ESTIMATE' } } : {}),
      backfilledFromProduct: priceMatch?.product || leadMatch?.product
    };
  });
}

module.exports = {
  compareSkuAcrossSolutions,
  findCrossSolutionPriceVariances,
  backfillMissingPricesAndLeadTimes
};
