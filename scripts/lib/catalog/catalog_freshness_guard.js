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

const fs = require('fs');
const path = require('path');

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
    const scrapeTime = new Date(normMeta.scrapeTimestamp || normMeta.scrapeDate).getTime();
    if (!isNaN(scrapeTime)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(normMeta.scrapeDate) && new Date(scrapeTime).toISOString().slice(0, 10) !== normMeta.scrapeDate) {
        return { chassis: normMeta.chassis, normalizedMetadata: normMeta, ageInDays: null, freshnessStatus: 'UNKNOWN', isFresh: false, isStale: false, isCriticalOutdated: false, advisories: ['Invalid calendar date'] };
      }
      const diffMs = refDate.getTime() - scrapeTime;
      if (diffMs < 0) {
        freshnessStatus = 'INVALID_FUTURE_DATE';
        advisories.push(`Catalog scrapeDate '${normMeta.scrapeDate}' is in the future relative to reference date.`);
      } else {
        ageInDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        if (diffMs > criticalDays * 86400000) {
          freshnessStatus = 'CRITICAL_OUTDATED';
          advisories.push(`Catalog scrape for ${normMeta.chassis} is ${ageInDays} days old (> ${criticalDays} days). Price and option drift likely.`);
        } else if (diffMs > staleDays * 86400000) {
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

/**
 * Lightweight check if catalog directory has been updated within maxAgeHours.
 * Uses the vendor capture timestamp, never the rebuild/copy modification time.
 * Missing, malformed or future capture evidence is not fresh.
 * @param {string} catalogDir
 * @param {number} [maxAgeHours=72]
 * @returns {boolean}
 */
function isCatalogFresh(catalogDir, maxAgeHours = 72) {
  try {
    const fs = require('fs');
    const path = require('path');
    if (!catalogDir || !fs.existsSync(catalogDir)) return false;
    const prefix = path.basename(catalogDir);
    const catalogPath = path.join(catalogDir, `${prefix}_Catalog.json`);
    if (!fs.existsSync(catalogPath)) return false;
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    const capture = safeDate(normalizeCatalogMetadata(catalog.metadata).scrapeTimestamp);
    if (!capture || !Number.isFinite(maxAgeHours) || maxAgeHours < 0) return false;
    const ageHours = (Date.now() - capture.getTime()) / 3600000;
    return ageHours >= 0 && ageHours <= maxAgeHours;
  } catch (_) {
    return false;
  }
}

/**
 * Evaluates typed catalog freshness and evidence state.
 * Distinguishes FRESH, STALE, MISSING, CORRUPT, and FUTURE.
 *
 * @param {string} catalogDir
 * @param {object} [options]
 * @param {number} [options.maxAgeHours=72]
 * @returns {object} Typed freshness assessment
 */
function evaluateCatalogFreshness(catalogDir, options = {}) {
  const fs = require('fs');
  const path = require('path');
  const maxAgeHours = Number(options.maxAgeHours ?? 72);
  const result = {
    catalogDir: catalogDir || null,
    status: 'UNKNOWN',
    isFresh: false,
    ageHours: null,
    thresholdHours: maxAgeHours,
    captureTimestamp: null,
    reason: null
  };

  if (!catalogDir || !fs.existsSync(catalogDir)) {
    result.status = 'MISSING';
    result.reason = 'Catalog directory does not exist or was not specified.';
    return result;
  }

  const prefix = path.basename(catalogDir);
  const catalogPath = path.join(catalogDir, `${prefix}_Catalog.json`);
  if (!fs.existsSync(catalogPath)) {
    result.status = 'MISSING';
    result.reason = `Catalog JSON file missing at "${catalogPath}".`;
    return result;
  }

  let catalog;
  try {
    catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  } catch (err) {
    result.status = 'CORRUPT';
    result.reason = `Catalog JSON is corrupt or unparseable: ${err.message}`;
    return result;
  }

  const norm = normalizeCatalogMetadata(catalog?.metadata);
  const capture = safeDate(norm.scrapeTimestamp);
  if (!capture) {
    result.status = 'CORRUPT';
    result.reason = 'Catalog metadata missing valid scrapeTimestamp.';
    return result;
  }

  result.captureTimestamp = capture.toISOString();
  const ageHours = (Date.now() - capture.getTime()) / 3600000;
  result.ageHours = parseFloat(ageHours.toFixed(1));

  if (ageHours < 0) {
    result.status = 'CORRUPT';
    result.reason = `Catalog timestamp is in the future (${result.captureTimestamp}).`;
    return result;
  }

  if (ageHours <= maxAgeHours) {
    result.status = 'FRESH';
    result.isFresh = true;
    result.reason = `Catalog is fresh (${result.ageHours} hours old, threshold: ${maxAgeHours} hours).`;
  } else {
    result.status = 'STALE';
    result.isFresh = false;
    result.reason = `Catalog is stale (${result.ageHours} hours old, threshold: ${maxAgeHours} hours).`;
  }

  return result;
}

/**
 * Authoritative Pre-Sync & Post-Scraping Quality Gate (INV-124 / INV-139 / INV-158)
 *
 * Verifies that a scraped or staged catalog adheres strictly to:
 * 1. File existence and uncorrupted JSON/Excel structure.
 * 2. Exact match between metadata.totalUniqueSKUs and distinct SKUs in entries (INV-139).
 * 3. Tabular integrity (non-zero entries, zero corrupted SKU formats, non-empty tables).
 * 4. Honest pricing contract (finite numbers >= 0 or explicit null; zero NaN strings or negative numbers; INV-158).
 * 5. Server core category coverage (CPU, Memory, Storage/Drive, Power).
 * 6. Services companion file integrity if present.
 * 7. Human confirmation / verified capture receipt requirement if staging or requested.
 *
 * @param {string|object} catalogDirOrData - Path to catalog directory or parsed Catalog.json
 * @param {object} [options={}] - { chassisName, throwOnError, isStaging, requireHumanConfirmation, humanConfirmed }
 * @returns {{ isValid: boolean, chassis: string, totalHardwareSkus: number, totalServiceSkus: number, categoriesCount: number, errors: string[], warnings: string[] }}
 */
function assertScrapedCatalogQuality(catalogDirOrData, options = {}) {
  const errors = [];
  const warnings = [];
  let catalogData = null;
  let catalogDir = null;
  let chassisName = options.chassisName || null;

  if (typeof catalogDirOrData === 'string') {
    catalogDir = catalogDirOrData;
    if (!fs.existsSync(catalogDir)) {
      errors.push(`Catalog directory does not exist: "${catalogDir}"`);
      return _buildQualityResult(false, chassisName || 'UNKNOWN', 0, 0, 0, errors, warnings, options);
    }
    const prefix = chassisName || path.basename(catalogDir);
    const catalogPath = path.join(catalogDir, `${prefix}_Catalog.json`);
    if (!fs.existsSync(catalogPath)) {
      errors.push(`Master catalog JSON missing at "${catalogPath}"`);
      return _buildQualityResult(false, prefix, 0, 0, 0, errors, warnings, options);
    }
    try {
      catalogData = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    } catch (err) {
      errors.push(`Master catalog JSON is corrupted: ${err.message}`);
      return _buildQualityResult(false, prefix, 0, 0, 0, errors, warnings, options);
    }
  } else if (catalogDirOrData && typeof catalogDirOrData === 'object') {
    catalogData = catalogDirOrData;
    chassisName = chassisName || catalogData?.metadata?.chassis || 'UNKNOWN';
  } else {
    errors.push('Invalid catalog input: expected directory path or catalog data object.');
    return _buildQualityResult(false, 'UNKNOWN', 0, 0, 0, errors, warnings, options);
  }

  const normMeta = normalizeCatalogMetadata(catalogData.metadata);
  chassisName = chassisName || normMeta.chassis;

  // 1. Tabular integrity check
  const tabReport = verifyTabularIntegrity(catalogData);
  if (!tabReport.isValid) {
    errors.push(...tabReport.errors);
  }
  warnings.push(...tabReport.warnings);

  // 2. Strict SKU tally consistency check (INV-139)
  const { getUniqueSkuCount } = require('./sku.js');
  const actualUniqueHwSkus = getUniqueSkuCount(catalogData.entries);
  const metaReportedSkus = Number(catalogData.metadata?.totalUniqueSKUs ?? -1);

  if (metaReportedSkus <= 0) {
    errors.push(`Invalid catalog metadata.totalUniqueSKUs: ${metaReportedSkus} (must be > 0).`);
  } else if (metaReportedSkus !== actualUniqueHwSkus) {
    errors.push(`Tally Invariant Violation (INV-139): metadata.totalUniqueSKUs (${metaReportedSkus}) does not match counted unique SKUs in entries (${actualUniqueHwSkus}).`);
  }

  // 3. Category coverage & essential subsystems check
  const entries = catalogData.entries || [];
  const parentCategories = new Set(entries.map(e => String(e.parentCategory || '').toLowerCase()));
  const allSubcategories = new Set(entries.map(e => String(e.subCategory || '').toLowerCase()));

  const hasCpu = [...parentCategories, ...allSubcategories].some(c => c.includes('processor') || c.includes('cpu'));
  const hasMemory = [...parentCategories, ...allSubcategories].some(c => c.includes('memory') || c.includes('dimm') || c.includes('ram'));
  const hasPower = [...parentCategories, ...allSubcategories].some(c => c.includes('power') || c.includes('psu') || c.includes('supply'));

  const isServerProduct = !/^(msl|alletra|nimble|storeever|san|switch)/i.test(chassisName);
  if (isServerProduct && entries.length > 5) {
    if (!hasCpu) errors.push(`Missing mandatory server category: Processor / CPU options not found.`);
    if (!hasMemory) errors.push(`Missing mandatory server category: Memory options not found.`);
    if (!hasPower) errors.push(`Missing mandatory server category: Power Supply options not found.`);
  }

  // 4. Companion services audit
  let totalServiceSkus = 0;
  if (catalogDir) {
    const servicesPath = path.join(catalogDir, `${chassisName}_Services.json`);
    if (fs.existsSync(servicesPath)) {
      try {
        const servicesData = JSON.parse(fs.readFileSync(servicesPath, 'utf8'));
        const actualSvcSkus = getUniqueSkuCount(servicesData.entries);
        const metaSvcSkus = Number(servicesData.metadata?.totalUniqueSKUs ?? actualSvcSkus);
        if (metaSvcSkus !== actualSvcSkus) {
          errors.push(`Services Tally Invariant Violation: metadata.totalUniqueSKUs (${metaSvcSkus}) does not match counted unique services (${actualSvcSkus}).`);
        }
        totalServiceSkus = actualSvcSkus;
      } catch (svcErr) {
        errors.push(`Companion services file corrupt: ${svcErr.message}`);
      }
    }
  }

  // 5. Human / Governance confirmation gate before live sync
  const requireConfirmation = options.requireHumanConfirmation === true || options.isStaging === true;
  if (requireConfirmation && catalogDir) {
    const receiptPath = path.join(catalogDir, `${chassisName}_catalog_capture_receipt.json`);
    const genericReceiptPath = path.join(catalogDir, 'catalog_capture_receipt.json');
    const hasReceipt = fs.existsSync(receiptPath) || fs.existsSync(genericReceiptPath);
    let receiptValid = false;

    if (hasReceipt) {
      try {
        const receipt = JSON.parse(fs.readFileSync(fs.existsSync(receiptPath) ? receiptPath : genericReceiptPath, 'utf8'));
        receiptValid = ['LOCAL_PROMOTED', 'STAGING_AUDITED', 'VERIFIED'].includes(receipt.status);
      } catch (_) {}
    }

    if (!receiptValid && !options.humanConfirmed) {
      errors.push(`Governance Confirmation Required: Catalog changes require verified capture receipt or explicit human confirmation before live sync.`);
    }
  }

  const isValid = errors.length === 0;
  return _buildQualityResult(isValid, chassisName, actualUniqueHwSkus, totalServiceSkus, parentCategories.size, errors, warnings, options);
}

function _buildQualityResult(isValid, chassis, totalHardwareSkus, totalServiceSkus, categoriesCount, errors, warnings, options) {
  const result = {
    isValid,
    chassis,
    totalHardwareSkus,
    totalServiceSkus,
    categoriesCount,
    errors,
    warnings,
    summary: isValid
      ? `Catalog quality certified for ${chassis}: ${totalHardwareSkus} HW + ${totalServiceSkus} Svc SKUs across ${categoriesCount} categories.`
      : `Catalog quality check failed with ${errors.length} error(s): ${errors.slice(0, 3).join('; ')}`
  };

  if (!isValid && options.throwOnError !== false) {
    const err = new Error(`ScrapedCatalogQualityError: ${result.summary}`);
    err.details = result;
    throw err;
  }

  return result;
}

module.exports = {
  normalizeCatalogMetadata,
  auditCatalogFreshness,
  verifyTabularIntegrity,
  isCatalogFresh,
  evaluateCatalogFreshness,
  assertScrapedCatalogQuality
};
