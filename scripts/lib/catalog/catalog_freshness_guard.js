'use strict';
/**
 * scripts/lib/catalog/catalog_freshness_guard.js
 *
 * Catalog Freshness, Staleness & Tabular Anti-Corruption Guardrail
 *
 * Provides normalized metadata extraction, staleness evaluation,
 * and tabular pre-flight integrity assertions across all scraped catalogs
 * to prevent stale or corrupted data from polluting workbook sheets.
 */

/**
 * Normalize heterogeneous catalog metadata keys across generations
 * @param {object} [metadata={}] - Raw catalog metadata object
 * @returns {object} Normalized metadata record
 */
/**
 * Normalize heterogeneous catalog metadata keys across generations
 * @param {object} [metadata={}] - Raw catalog metadata object
 * @returns {object} Normalized metadata record
 */
function safeDate(value) {
  const numeric = typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value));
  const date = new Date(numeric ? Number(value) : value);
  return value !== null && value !== undefined && Number.isFinite(date.getTime()) ? date : null;
}

function normalizeCatalogMetadata(metadata = {}) {
  const meta = metadata || {};
  const gen = meta.generation || meta.gen || 'General';
  const family = meta.family || 'General';
  const chassis = meta.chassis || meta.model || 'Unknown';

  let timestamp = meta.scrapeTimestamp;
  if (typeof timestamp === 'number' && Number.isFinite(timestamp)) {
    timestamp = safeDate(timestamp)?.toISOString() || null;
  } else if (typeof timestamp === 'string' && /^\d+$/.test(timestamp)) {
    const num = Number(timestamp);
    if (Number.isFinite(num)) {
      timestamp = safeDate(num)?.toISOString() || null;
    }
  }

  let rawDate = meta.scrapeDate;
  if (typeof rawDate === 'number' && Number.isFinite(rawDate)) {
    rawDate = safeDate(rawDate)?.toISOString().split('T')[0] || null;
  } else if (!rawDate || rawDate === '—') {
    if (timestamp) {
      const parsed = new Date(timestamp);
      if (!isNaN(parsed.getTime())) {
        rawDate = parsed.toISOString().split('T')[0];
      } else {
        rawDate = null;
      }
    } else {
      rawDate = null;
    }
  }

  if (!timestamp && rawDate && rawDate !== '—') {
    timestamp = `${rawDate}T00:00:00.000Z`;
  }

  return {
    chassis,
    family,
    generation: gen,
    gen,
    scrapeDate: rawDate,
    scrapeTimestamp: timestamp,
    totalUniqueSKUs: Number(meta.totalUniqueSKUs || 0),
    totalSubcategories: Number(meta.totalSubcategories || 0),
    totalTables: Number(meta.totalTables || 0),
    diffSummary: meta.diffSummary || null,
    source: meta.source || meta.provenance || 'OCA WebLogic'
  };
}

/**
 * Audit catalog freshness against reference date
 * @param {object} catalogData - In-memory catalog JSON
 * @param {object} [options={}] - { referenceDate, staleWarningDays, criticalOutdatedDays }
 * @returns {object} Freshness audit results
 */
function auditCatalogFreshness(catalogData, options = {}) {
  const normMeta = normalizeCatalogMetadata(catalogData?.metadata);
  const refDate = options.referenceDate ? new Date(options.referenceDate) : new Date();
  const staleDays = Number(options.staleWarningDays ?? 30);
  const criticalDays = Number(options.criticalOutdatedDays ?? 90);
  if (!Number.isFinite(refDate.getTime()) || !Number.isFinite(staleDays) || !Number.isFinite(criticalDays) || staleDays < 0 || criticalDays < staleDays) throw new Error('Invalid catalog freshness policy or reference date');

  const advisories = [];
  let ageInDays = null;
  let freshnessStatus = 'UNKNOWN';

  if (normMeta.scrapeDate) {
    const scrapeTime = new Date(normMeta.scrapeDate).getTime();
    if (!isNaN(scrapeTime)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(normMeta.scrapeDate) && new Date(scrapeTime).toISOString().slice(0, 10) !== normMeta.scrapeDate) {
        return { chassis: normMeta.chassis, normalizedMetadata: normMeta, ageInDays: null, freshnessStatus: 'UNKNOWN', isFresh: false, isStale: false, isCriticalOutdated: false, advisories: ['Invalid calendar date'] };
      }
      const diffMs = refDate.getTime() - scrapeTime;
      // Buffer of 24 hours for timezone boundaries
      if (diffMs < -86400000) {
        freshnessStatus = 'INVALID_FUTURE_DATE';
        advisories.push(`Catalog scrapeDate '${normMeta.scrapeDate}' is in the future relative to reference date.`);
      } else {
        ageInDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        if (ageInDays > criticalDays) {
          freshnessStatus = 'CRITICAL_OUTDATED';
          advisories.push(`Catalog scrape for ${normMeta.chassis} is ${ageInDays} days old (> ${criticalDays} days). Price and option drift likely.`);
        } else if (ageInDays > staleDays) {
          freshnessStatus = 'STALE_WARNING';
          advisories.push(`Catalog scrape for ${normMeta.chassis} is ${ageInDays} days old (> ${staleDays} days). Refresh recommended.`);
        } else {
          freshnessStatus = 'FRESH';
        }
      }
    } else {
      advisories.push(`Invalid scrape date format: '${normMeta.scrapeDate}'.`);
    }
  } else {
    advisories.push(`Catalog ${normMeta.chassis} has no recorded scrapeDate. Catalog may be a baseline stub.`);
  }

  return {
    chassis: normMeta.chassis,
    normalizedMetadata: normMeta,
    ageInDays,
    freshnessStatus,
    isFresh: freshnessStatus === 'FRESH',
    isStale: freshnessStatus === 'STALE_WARNING' || freshnessStatus === 'CRITICAL_OUTDATED',
    isCriticalOutdated: freshnessStatus === 'CRITICAL_OUTDATED',
    advisories
  };
}

/**
 * Validate tabular integrity and check for scraping corruption before sheet generation
 * @param {object} catalogData - Catalog JSON
 * @returns {object} Integrity verification report
 */
function verifyTabularIntegrity(catalogData) {
  const entries = catalogData?.entries || [];
  const errors = [];
  const warnings = [];
  const pricesBySku = new Map();
  let totalSkus = 0;
  let emptyTablesCount = 0;
  let priceAnomaliesCount = 0;

  if (!Array.isArray(entries) || entries.length === 0) {
    errors.push('Catalog has 0 entries / section tables.');
    return {
      isValid: false,
      totalEntries: 0,
      totalSkus: 0,
      emptyTablesCount: 0,
      priceAnomaliesCount: 0,
      errors,
      warnings
    };
  }

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry || typeof entry !== 'object') { errors.push(`Invalid table at index ${i}`); continue; }
    const parent = entry.parentCategory || 'Uncategorized';
    const sub = entry.subCategory || 'General';
    const label = `${parent} > ${sub} (Table #${i + 1})`;

    if (!Array.isArray(entry.headers) || entry.headers.length === 0) {
      warnings.push(`Missing table column headers in ${label}.`);
    }

    const skus = entry.skus || [];
    if (!Array.isArray(skus) || skus.length === 0) {
      emptyTablesCount++;
      warnings.push(`Empty section table in ${label}.`);
      continue;
    }

    totalSkus += skus.length;
    const seenTableSkus = new Set();

    for (const sku of skus) {
      if (!sku || typeof sku !== 'object') { errors.push(`Invalid row in ${label}`); continue; }
      const skuCode = require('./sku.js').cleanBaseSKU(sku.sku || sku['Product #'] || '');

      // SKU code format validation
      if (!skuCode || skuCode === 'UNKNOWN_SKU') {
        errors.push(`Missing or empty SKU identifier in ${label}`);
      } else if (!/^[A-Z0-9#._-]{3,30}$/i.test(skuCode) || /<[^>]+>/.test(skuCode)) {
        errors.push(`Corrupted SKU identifier '${skuCode}' in ${label}`);
      }

      if (skuCode) {
        const cleanKey = skuCode.toUpperCase();
        if (seenTableSkus.has(cleanKey)) {
          warnings.push(`Duplicate SKU '${skuCode}' detected in ${label}`);
        } else {
          seenTableSkus.add(cleanKey);
        }
      }

      // Explicit zero vs missing price check
      const rawPrice = sku.listPrice ?? sku['Unit Price (USD)'] ?? sku.price;
      if (rawPrice === null || rawPrice === undefined || rawPrice === '' || rawPrice === '—') {
        warnings.push(`Missing list price for SKU ${skuCode || 'UNKNOWN'} in ${label}`);
      } else {
        const parsedPrice = require('../taxonomy/sku_resolver.js').extractCatalogItemPrice({ listPrice: rawPrice });
        const price = parsedPrice.hasPrice ? parsedPrice.price : NaN;
        if (Number.isFinite(price)) {
          if (pricesBySku.has(skuCode) && pricesBySku.get(skuCode) !== price) errors.push(`Conflicting prices for ${skuCode}`);
          pricesBySku.set(skuCode, price);
        }
        if (!Number.isFinite(price) || price < 0) {
          priceAnomaliesCount++;
          errors.push(`Invalid price for SKU ${skuCode || 'UNKNOWN'} in ${label}: ${rawPrice}`);
        } else if (price === 1.00) {
          // Quantity as price check: High value hardware (Processor, Server) cannot have list price of exactly $1.00
          const desc = String(sku.Description || sku.description || '').toLowerCase();
          if (desc.includes('server') || desc.includes('xeon') || desc.includes('epyc') || desc.includes('cto server')) {
            priceAnomaliesCount++;
            warnings.push(`Suspicious price anomaly for SKU ${skuCode} ($1.00 for server/CPU): possible quantity-as-price corruption.`);
          }
        }
      }
    }
  }

  if (totalSkus === 0) {
    errors.push('Catalog has 0 total SKUs across all tables.');
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    totalEntries: entries.length,
    totalSkus,
    emptyTablesCount,
    priceAnomaliesCount,
    errors,
    warnings
  };
}

module.exports = {
  normalizeCatalogMetadata,
  auditCatalogFreshness,
  verifyTabularIntegrity
};
