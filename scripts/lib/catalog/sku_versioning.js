'use strict';
/**
 * scripts/lib/sku_versioning.js — HPE SKU Data Layer Versioning & History Audit System
 *
 * Captures historical snapshots, price trails, attribute mutations, and checksums
 * for any SKU within the HPE product ecosystem.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { safeWriteJsonAtomic } = require('../system/fs_compat.js');
const { cleanBaseSKU, classifyLifecycleState } = require('./sku.js');
const {
  parseStrictPrice,
  reconcileConflictingPrices,
  loadZeroPricePolicies,
  classifyConfirmedZeroByPolicy,
  normalizeLifecycleCanonical
} = require('./field_parsers.js');

const catalogPriceCache = new Map();
const snapshotIndexCache = new Map();
const MAX_SNAPSHOT_INDEX_CACHE = 128;

/**
 * Clear internal catalog price and snapshot index caches (useful for tests/hot reloads).
 */
function _clearCatalogPriceCache() {
  catalogPriceCache.clear();
  snapshotIndexCache.clear();
}

/**
 * Calculate SHA-256 checksum for a string or object.
 */
function calculateChecksum(content) {
  const str = typeof content === 'object' ? JSON.stringify(content) : String(content);
  return crypto.createHash('sha256').update(str).digest('hex');
}

const SKIP_CHASSIS_SCAN_DIRS = new Set(['history', 'runs', 'uploads', 'staging', 'backups', '_archive_scripts']);

function _findChassisDirRecursive(current, targetLower, underscoreLower) {
  let entries;
  try {
    entries = fs.readdirSync(current, { withFileTypes: true });
  } catch (_) {
    return null;
  }
  for (const ent of entries) {
    if (!ent.isDirectory() || ent.name.startsWith('.') || SKIP_CHASSIS_SCAN_DIRS.has(ent.name)) continue;
    const full = path.join(current, ent.name);
    const nameLower = ent.name.toLowerCase();
    if (nameLower === targetLower || nameLower === underscoreLower) return full;
    const found = _findChassisDirRecursive(full, targetLower, underscoreLower);
    if (found) return found;
  }
  return null;
}

/**
 * Resolve relative or model-name chassis directory to its path in outputs/
 */
function resolveChassisDirectory(dir) {
  if (!dir) return '';
  if (fs.existsSync(dir)) return dir;

  const outputsRoot = path.join(__dirname, '..', '..', '..', 'outputs');
  if (fs.existsSync(outputsRoot)) {
    const cleanDir = path.basename(String(dir)).trim();
    const match = _findChassisDirRecursive(
      outputsRoot,
      cleanDir.toLowerCase(),
      cleanDir.replace(/\s+/g, '_').toLowerCase()
    );
    if (match) return match;
  }
  return dir;
}

/**
 * Get comprehensive audit timeline and version history for a given SKU.
 * @param {string} targetSku - Cleaned HPE SKU (e.g. 'P73282-B21' or 'P02498-B21')
 * @param {string} chassisDir - Relative or absolute path to chassis folder
 * @returns {object} Audit trail with price history, attribute changes, snapshots, and current status
 */
function _findInSkuMap(histObj, cleanSku, rawSku, rawSkuWithHash) {
  if (!histObj || typeof histObj !== 'object') return null;
  return histObj[cleanSku] || histObj[rawSku] || histObj[rawSkuWithHash] || null;
}

function _loadPriceTimeline(historyDir, resolvedChassisDir, cleanSku, rawSku, rawSkuWithHash) {
  let priceTimeline = [];

  // 1. Read price history
  const priceHistoryPath = path.join(historyDir, 'price_history.json');
  if (fs.existsSync(priceHistoryPath)) {
    try {
      const priceHistory = JSON.parse(fs.readFileSync(priceHistoryPath, 'utf-8'));
      const found = _findInSkuMap(priceHistory, cleanSku, rawSku, rawSkuWithHash);
      if (found) priceTimeline = found;
    } catch (err) {
      console.warn(`[sku_versioning] Error reading price_history.json: ${err.message}`);
    }
  }

  // 1b. Read services price history
  const servicesPriceHistoryPath = path.join(resolvedChassisDir, 'services_history', 'services_price_history.json');
  if (fs.existsSync(servicesPriceHistoryPath)) {
    try {
      const sPriceHistory = JSON.parse(fs.readFileSync(servicesPriceHistoryPath, 'utf-8'));
      const sFound = _findInSkuMap(sPriceHistory, cleanSku, rawSku, rawSkuWithHash);
      if (sFound && priceTimeline.every(e => !e.price || e.price <= 0)) {
        priceTimeline = sFound;
      }
    } catch (err) {
      console.warn(`[sku_versioning] Error reading services_price_history.json: ${err.message}`);
    }
  }

  return priceTimeline;
}

function _loadAttributeMutations(historyDir, cleanSku) {
  const attrHistoryPath = path.join(historyDir, 'attribute_history.json');
  if (!fs.existsSync(attrHistoryPath)) return [];
  try {
    const attrHistory = JSON.parse(fs.readFileSync(attrHistoryPath, 'utf-8'));
    if (Array.isArray(attrHistory)) {
      return attrHistory.filter(item => item.productNumber === cleanSku || item.sku === cleanSku);
    }
  } catch (err) {
    console.warn(`[sku_versioning] Error reading attribute_history.json: ${err.message}`);
  }
  return [];
}

function _loadDiscontinuedInfo(historyDir, cleanSku) {
  const discontinuedPath = path.join(historyDir, 'discontinued_skus.json');
  if (!fs.existsSync(discontinuedPath)) return { discontinuedInfo: null, currentStatus: 'UNKNOWN' };
  try {
    const discontinuedList = JSON.parse(fs.readFileSync(discontinuedPath, 'utf-8'));
    const candidates = Array.isArray(discontinuedList) ? discontinuedList : Object.values(discontinuedList || {});
    const match = candidates.find(d => d.productNumber === cleanSku || d.sku === cleanSku);
    if (match) {
      const st = String(match.status || '').toUpperCase();
      const isActivelyDiscontinued = st === 'DISCONTINUED' || st === 'REMOVED';
      const currentStatus = isActivelyDiscontinued ? 'DISCONTINUED' : 'ACTIVE';
      return { discontinuedInfo: isActivelyDiscontinued ? match : null, currentStatus };
    }
  } catch (err) {
    console.warn(`[sku_versioning] Error reading discontinued_skus.json: ${err.message}`);
  }
  return { discontinuedInfo: null, currentStatus: 'UNKNOWN' };
}

function _projectSnapshotSkuRow(entry, s, skuCode) {
  return {
    parentCategory: entry.parentCategory,
    subCategory: entry.subCategory,
    description: s.description || s['Description'] || '',
    priceUsd: s.priceUsd ?? s['List Price (USD)'] ?? s['Unit Price (USD)'] ?? null,
    optionType: s.optionType || s['Option Type'] || '',
    lifecycleStatus: s['Lifecycle Status'] || s.lifecycleStatus || s.Status || '',
    vendorSupplyStatus: s.vendorSupplyStatus,
    rawSku: skuCode,
    diffStatus: s['Diff Status'] || s.diffStatus || ''
  };
}

function _buildSnapshotSkuIndex(content) {
  const byCleanSku = new Map();
  const entriesList = Array.isArray(content?.entries) ? content.entries : [];
  for (const entry of entriesList) {
    const skusList = Array.isArray(entry.skus) ? entry.skus : [];
    for (const s of skusList) {
      const skuCode = s.sku || s['Product #'] || s['SKU'];
      const cleanKey = cleanBaseSKU(skuCode);
      if (!cleanKey || byCleanSku.has(cleanKey)) continue;
      byCleanSku.set(cleanKey, _projectSnapshotSkuRow(entry, s, skuCode));
    }
  }
  return byCleanSku;
}

function _getIndexedCatalogSnapshot(filePath) {
  const stat = fs.statSync(filePath, { bigint: true });
  const fingerprint = [stat.ino, stat.mtimeNs, stat.size].join('|');
  const existing = snapshotIndexCache.get(filePath);
  if (existing?.fingerprint === fingerprint) return existing;

  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  if (!content || typeof content !== 'object') return null;

  const cached = {
    fingerprint,
    checksum: calculateChecksum(content),
    scrapeDate: content.metadata?.scrapeDate || null,
    byCleanSku: _buildSnapshotSkuIndex(content)
  };
  if (snapshotIndexCache.size >= MAX_SNAPSHOT_INDEX_CACHE) {
    const oldestKey = snapshotIndexCache.keys().next().value;
    if (oldestKey !== undefined) snapshotIndexCache.delete(oldestKey);
  }
  snapshotIndexCache.set(filePath, cached);
  return cached;
}

function _resolveObservedSkuLifecycle(details) {
  const lc = classifyLifecycleState(details.lifecycleStatus, details.diffStatus, details.rawSku, details.description, details.vendorSupplyStatus);
  if (lc.canonicalStatus === '90_DAY_WARNING') return '90-Day Warning';
  if (lc.isDirectShip && lc.canonicalStatus === 'DIRECT_SHIP') return 'Direct Ship (DS)';
  if (lc.canonicalStatus !== 'ACTIVE') return lc.canonicalStatus;
  return normalizeLifecycleCanonical(details.lifecycleStatus).lifecycleCanonical.toUpperCase();
}

function _readCurrentSkuDetails(dir, sku) {
  const product = path.basename(dir);
  const cleanKey = cleanBaseSKU(sku);
  for (const suffix of ['Catalog', 'Services']) {
    const file = path.join(dir, `${product}_${suffix}.json`);
    if (!fs.existsSync(file)) continue;
    try {
      const indexed = _getIndexedCatalogSnapshot(file);
      const hit = indexed?.byCleanSku.get(cleanKey);
      if (hit) return { ...hit };
    } catch (error) {
      console.warn(`[sku_versioning] Error reading ${path.basename(file)}: ${error.message}`);
    }
  }
  return null;
}

function _scanSnapshotOccurrences(historyDir, cleanSku, initialStatus) {
  const snapshots = fs.readdirSync(historyDir)
    .filter(f => f.startsWith('catalog_') && f.endsWith('.json') && f !== 'catalog_deltas.json')
    .sort();

  const snapshotOccurrences = [];
  let latestDetails = null;
  let currentStatus = initialStatus;

  for (const file of snapshots) {
    const snapshotPath = path.join(historyDir, file);
    try {
      const indexed = _getIndexedCatalogSnapshot(snapshotPath);
      if (!indexed) continue;
      const scrapeDate = indexed.scrapeDate || file.replace('catalog_', '').replace('.json', '');
      const hit = indexed.byCleanSku.get(cleanSku);
      if (hit) {
        const skuDetails = { ...hit };
        if (currentStatus !== 'DISCONTINUED') {
          currentStatus = _resolveObservedSkuLifecycle(skuDetails);
        }
        latestDetails = skuDetails;
        snapshotOccurrences.push({
          snapshotFile: file,
          scrapeDate,
          snapshotChecksum: indexed.checksum,
          skuDetails
        });
      }
    } catch (err) {
      console.warn(`[sku_versioning] Error reading snapshot ${file}: ${err.message}`);
    }
  }

  return { snapshotOccurrences, latestDetails, currentStatus };
}

function getSkuAuditHistory(targetSku, chassisDir) {
  if (!targetSku) throw new Error('Target SKU is required for version audit');
  
  const resolvedChassisDir = resolveChassisDirectory(chassisDir);
  const cleanSku = cleanBaseSKU(targetSku);
  const historyDir = path.join(resolvedChassisDir, 'history');
  
  const rawSku = String(targetSku || '').trim();
  const rawSkuWithHash = rawSku.replace(/\s+/g, '#');

  const auditResult = {
    sku: cleanSku,
    chassisDir: resolvedChassisDir,
    auditedAt: new Date().toISOString(),
    currentStatus: 'UNKNOWN',
    latestDetails: null,
    priceTimeline: [],
    attributeMutations: [],
    discontinuedInfo: null,
    snapshotOccurrences: []
  };

  auditResult.priceTimeline = resolvedChassisDir ? _loadPriceTimeline(historyDir, resolvedChassisDir, cleanSku, rawSku, rawSkuWithHash) : [];
  if (!resolvedChassisDir) return auditResult;
  auditResult.attributeMutations = _loadAttributeMutations(historyDir, cleanSku);

  const disc = _loadDiscontinuedInfo(historyDir, cleanSku);
  auditResult.discontinuedInfo = disc.discontinuedInfo;
  auditResult.currentStatus = disc.currentStatus;

  if (fs.existsSync(historyDir)) {
    const snaps = _scanSnapshotOccurrences(historyDir, cleanSku, auditResult.currentStatus);
    auditResult.snapshotOccurrences = snaps.snapshotOccurrences;
    auditResult.latestDetails = snaps.latestDetails;
    auditResult.currentStatus = snaps.currentStatus;
  }
  const current = _readCurrentSkuDetails(resolvedChassisDir, cleanSku);
  if (current && auditResult.currentStatus !== 'DISCONTINUED') {
    auditResult.latestDetails = current;
    auditResult.currentStatus = _resolveObservedSkuLifecycle(current);
  }

  return auditResult;
}

/**
 * Helper to get the last day of a given month.
 */
function getLastDayOfMonth(year, monthNum) {
  const y = parseInt(year, 10) || 2026;
  const m = parseInt(monthNum, 10) || 1;
  const daysInMonth = [31, (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const d = daysInMonth[m - 1] || 30;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Normalize human-friendly dates/month names into YYYY-MM-DD.
 * Specific dates (e.g. '2026-08-15') are preserved.
 * Month-level strings (e.g. 'Aug 2026', 'September', '2026-10') resolve to end-of-month (e.g. '2026-08-31', '2026-09-30')
 * so that mid-month price changes are fully captured.
 */
function normalizeTargetDate(targetDate) {
  if (!targetDate) return new Date().toISOString().split('T')[0];
  const s = String(targetDate).trim().toLowerCase();

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  
  if (/^\d{4}-\d{2}$/.test(s)) {
    const [y, m] = s.split('-');
    return getLastDayOfMonth(y, m);
  }

  const months = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };

  const monthMatch = s.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/i);
  const yearMatch = s.match(/\b(20\d{2})\b/);
  const year = yearMatch ? yearMatch[1] : String(new Date().getUTCFullYear());

  if (monthMatch) {
    const mPrefix = monthMatch[1].toLowerCase().slice(0, 3);
    const monthNum = months[mPrefix] || '01';
    return getLastDayOfMonth(year, monthNum);
  }

  return new Date().toISOString().split('T')[0];
}

/**
 * Format a YYYY-MM-DD date into a readable month label (e.g. 'Aug 2026')
 */
function formatMonthLabel(isoDate) {
  const [year, month] = (isoDate || '2026-01-01').split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mIdx = Math.max(0, Math.min(11, (parseInt(month, 10) || 1) - 1));
  return `${monthNames[mIdx]} ${year}`;
}

const CONFIRMED_ZERO_PARENT_CONTRACTS = new Set(
  (loadZeroPricePolicies().confirmedZeroParentContracts || []).map((s) => String(s).toUpperCase())
);

function isConfirmedFreeSku(sku, description) {
  return classifyConfirmedZeroByPolicy(sku, description, null, { strictOnly: true }).matched;
}

/**
 * Resolve price details for a specific SKU on a specific target date.
 * Supports date string (YYYY-MM-DD or Month YYYY) or 2-arg (targetSku, chassisDir).
 *
 * @param {string} targetSku - Cleaned HPE SKU
 * @param {string} targetDate - Date or month (e.g. '2026-08-15', 'Aug 2026', '2026-10')
 * @param {string} chassisDir - Path to chassis folder (defaults to DL380 Gen12 SFF)
 * @returns {object} Historical price details on that date
 */
function _readCatalogPriceRows(file, fingerprint) {
  const content = fs.readFileSync(file, 'utf8');
  const data = JSON.parse(content);
  const rows = [...(data.entries || []).flatMap(entry => entry.skus || []), ...(data.skus || [])];
  const bySku = new Map();
  for (const row of rows) {
    if (row['Diff Status'] === 'REMOVED' || /^\[REMOVED SKU\]/i.test(row.Description || '')) continue;
    const key = cleanBaseSKU(row.sku || row['Product #'] || row.SKU);
    if (!key) continue;
    if (!bySku.has(key)) bySku.set(key, []);
    bySku.get(key).push({ raw: row.priceUsd ?? row['List Price (USD)'] ?? row['Unit Price (USD)'] ?? row['Price (USD)'] ?? row['Unit List Price (USD)'] ?? row.listPrice ?? row.price, row, source: file });
  }
  const capturedAt = data.metadata?.scrapeTimestamp || data.metadata?.scrapeDate || null;
  return { fingerprint, bySku, capturedAt, sha256: calculateChecksum(content) };
}

function _readCatalogPriceObservation(file, sku, archiveDate = null) {
  try {
    const stat = fs.statSync(file, { bigint: true });
    const fingerprint = [stat.ino, stat.mtimeNs, stat.size].join('|');
    let capture = catalogPriceCache.get(file);
    if (capture?.fingerprint !== fingerprint) {
      capture = _readCatalogPriceRows(file, fingerprint);
      catalogPriceCache.set(file, capture);
    }
    const candidates = capture.bySku.get(sku);
    if (!candidates?.length) return null;
    const priced = candidates.filter(item => item.raw != null && String(item.raw).trim() !== '');
    if (!priced.length) return null;
    const price = priced.length === 1 ? parseStrictPrice(priced[0].raw, { row: priced[0].row, sku })
      : reconcileConflictingPrices(priced, { toleranceUsd: 0 });
    const date = String(capture.capturedAt || '').match(/^\d{4}-\d{2}-\d{2}(?=T|$)/)?.[0] || archiveDate;
    return { ...price, date, capturedAt: capture.capturedAt, source: file, sha256: capture.sha256 };
  } catch { return null; }
}

function _latestArchivedPrice(dir, sku, targetDate, name, pattern) {
  const archive = path.join(dir, name);
  let filenames;
  try { filenames = fs.readdirSync(archive); } catch { return null; }
  for (const filename of filenames.sort().reverse()) {
    const date = filename.match(pattern)?.[1];
    if (!date || date > targetDate) continue;
    const observation = _readCatalogPriceObservation(path.join(archive, filename), sku, date);
    if (observation && observation.date <= targetDate &&
        (observation.priceUsd != null || observation.priceState === 'CONFLICTING_EVIDENCE')) return observation;
  }
  return null;
}

function _ownCatalogPriceObservations(dir, sku, date) {
  if (!dir) return [];
  const name = path.basename(dir);
  const current = ['Catalog', 'Services'].map(kind => _readCatalogPriceObservation(path.join(dir, name + '_' + kind + '.json'), sku));
  return [...current,
    _latestArchivedPrice(dir, sku, date, 'history', /^catalog_(\d{4}-\d{2}-\d{2})\.json$/),
    _latestArchivedPrice(dir, sku, date, 'services_history', /^services_catalog_(\d{4}-\d{2}-\d{2})\.json$/)
  ].filter(Boolean);
}

function _priceWithoutEarlierTrail(sku, date, dir, audit, implicitDate) {
  const observations = _ownCatalogPriceObservations(dir, sku, date);
  const usable = observations.filter(item => ((item.date && item.date <= date) || (!item.date && implicitDate)) &&
    (item.priceUsd != null || item.priceState === 'CONFLICTING_EVIDENCE'));
  const latest = usable.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))[0];
  const contemporaneous = usable.filter(item => item.date === latest?.date);
  const conflict = contemporaneous.some(item => item.priceState === 'CONFLICTING_EVIDENCE') ||
    new Set(contemporaneous.map(item => item.priceUsd)).size > 1;
  if (conflict) return { ..._buildEmptyPriceTimelineResult(sku, date, dir, audit), priceState: 'CONFLICTING_EVIDENCE',
    status: 'CONFLICTING_EVIDENCE', priceUsd: null, nullablePriceUsd: null, isResolved: false, quoteConfidence: 'UNRESOLVED', observations };
  if (latest) return { ..._buildEmptyPriceTimelineResult(sku, date, dir, audit),
    effectiveDate: latest.date, priceUsd: latest.priceUsd, nullablePriceUsd: latest.priceUsd,
    priceState: latest.priceState, status: 'CATALOG_OBSERVED_PRICE', pricingCategory: 'DATED_CATALOG_PRICE',
    quoteConfidence: latest.date ? 'HIGH' : 'MEDIUM', isResolved: true, observation: latest };
  const unresolved = _buildEmptyPriceTimelineResult(sku, date, dir, audit);
  const zeroObservation = audit.priceTimeline?.findLast(event => event.date && event.date <= date && event.price === 0 && !event.quarantined);
  if (unresolved.priceState === 'CONFIRMED_ZERO' && !implicitDate && !zeroObservation) {
    return { ...unresolved, status: 'NO_PRICE_RECORDED', pricingCategory: 'NO_PRICE_RECORDED',
      effectiveDate: null, priceUsd: null, nullablePriceUsd: null, isResolved: false, priceState: 'UNPRICED', quoteConfidence: 'UNRESOLVED', observations };
  }
  if (zeroObservation) {
    if (unresolved.priceState === 'CONFIRMED_ZERO') return { ...unresolved, effectiveDate: zeroObservation.date, observations };
    return { ...unresolved, status: 'UNRESOLVED_ZERO_PRICE', pricingCategory: 'UNRESOLVED_ZERO_PRICE', observations };
  }
  return { ...unresolved, observations };
}

function _resolveEffectivePriceAndAnomaly(effectiveEvent, eventsOnOrBefore, sku) {
  const observed = parseStrictPrice(effectiveEvent.price, { sku });
  let effectivePrice = observed.priceUsd ?? 0;
  let effectiveStatus = effectiveEvent.status || 'ACTIVE';
  let rejectedAnomaly = null;

  if (effectiveEvent.quarantined || observed.priceUsd === null) {
    const prior = eventsOnOrBefore.slice(0, -1).findLast(event => !event.quarantined && parseStrictPrice(event.price, { sku }).priceUsd > 0);
    const priorPrice = prior ? parseStrictPrice(prior.price, { sku }).priceUsd : 0;
    effectivePrice = priorPrice;
    effectiveStatus = 'HISTORICAL_PRICE_PRESERVED_FROM_ZERO';
    if (!effectiveEvent.quarantined && observed.priceState !== 'PARSE_FAILED') {
      return { effectivePrice, effectiveStatus, rejectedAnomaly };
    }
    rejectedAnomaly = {
      rejectedPriceUsd: effectiveEvent.price,
      preservedPriceUsd: priorPrice,
      eventDate: effectiveEvent.date,
      validationState: effectiveEvent.validationState,
      provenance: effectiveEvent.anomalyProvenance
    };
    effectiveStatus = effectiveEvent.validationState || 'ANOMALOUS_PORTAL_PRICE_REJECTED';
  }

  return { effectivePrice, effectiveStatus, rejectedAnomaly };
}

function _detectPriceJumpAnomaly(eventsOnOrBefore, effectiveEvent, effectivePrice, rejectedAnomaly) {
  if (rejectedAnomaly || effectivePrice <= 0) {
    return { effectivePrice, effectiveStatus: null, rejectedAnomaly };
  }
  const priorNonZeroEvents = eventsOnOrBefore
    .slice(0, -1)
    .filter(e => parseStrictPrice(e.price).priceUsd > 0 && !e.quarantined);
  const priorPrice = Number(priorNonZeroEvents[priorNonZeroEvents.length - 1]?.price || 0);
  if (priorPrice >= 20) {
    const ratio = effectivePrice / priorPrice;
    if (ratio > 20 || ratio < 0.05) {
      return {
        effectivePrice: priorPrice,
        effectiveStatus: 'ANOMALOUS_PORTAL_PRICE_REJECTED',
        rejectedAnomaly: {
          rejectedPriceUsd: effectivePrice,
          preservedPriceUsd: priorPrice,
          eventDate: effectiveEvent.date,
          ratio: parseFloat(ratio.toFixed(6))
        }
      };
    }
  }
  return { effectivePrice, effectiveStatus: null, rejectedAnomaly };
}

function _classifyHistoricalConfidence(effectivePrice, effectiveStatus, effectiveEvent, cleanSku, description) {
  if (effectivePrice > 0) {
    const isFallback = effectiveStatus === 'HISTORICAL_PRICE_PRESERVED_FROM_ZERO' || 
                       effectiveStatus.includes('ANOMALOUS') || 
                       effectiveEvent.quarantined;
    return {
      pricingCategory: isFallback ? 'HISTORICAL_PRICE_FALLBACK' : 'OBSERVED_PORTAL_PRICE',
      quoteConfidence: isFallback ? 'MEDIUM' : 'HIGH',
      effectiveStatus
    };
  }

  const isFree = isConfirmedFreeSku(cleanSku, description);
  return {
    pricingCategory: isFree ? 'CONFIRMED_ZERO_PRICE_TRIGGER' : 'UNRESOLVED_ZERO_PRICE',
    quoteConfidence: isFree ? 'HIGH' : 'UNRESOLVED',
    effectiveStatus: isFree ? effectiveStatus : 'UNRESOLVED_ZERO_PRICE'
  };
}

function _buildEmptyPriceTimelineResult(cleanSku, normalizedDate, dir, audit) {
  const isFree = isConfirmedFreeSku(cleanSku, audit.description);
  const category = isFree ? 'CONFIRMED_ZERO_PRICE_TRIGGER' : 'NO_PRICE_RECORDED';
  const confidence = isFree ? 'HIGH' : 'UNRESOLVED';
  return {
    sku: cleanSku,
    targetDate: normalizedDate,
    effectiveDate: null,
    priceUsd: isFree ? 0 : null,
    nullablePriceUsd: isFree ? 0 : null,
    priceState: isFree ? 'CONFIRMED_ZERO' : 'UNPRICED',
    currency: 'USD',
    status: isFree ? 'CONFIRMED_ZERO_PRICE' : 'NO_PRICE_RECORDED',
    pricingCategory: category,
    quoteConfidence: confidence,
    isResolved: confidence !== 'UNRESOLVED',
    sourceDirectory: dir,
    isDiscontinued: audit.currentStatus === 'DISCONTINUED',
    priceTrail: audit.priceTimeline
  };
}

function _normalizeHistoricalPriceArgs(targetDateOrDir, maybeChassisDir) {
  const looksDated = typeof targetDateOrDir === 'string' &&
    /^(?:\d{4}-(?:0[1-9]|1[0-2])(?:-\d{2})?|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*(?:\s+20\d{2})?)$/i.test(targetDateOrDir.trim());
  if (maybeChassisDir !== undefined) {
    return {
      normalizedDate: targetDateOrDir && !looksDated ? null : normalizeTargetDate(targetDateOrDir),
      dir: maybeChassisDir || ''
    };
  }
  if (typeof targetDateOrDir === 'string' && !looksDated) {
    return {
      dir: targetDateOrDir,
      implicitDate: true,
      normalizedDate: normalizeTargetDate(new Date().toISOString().split('T')[0])
    };
  }
  return {
    normalizedDate: normalizeTargetDate(targetDateOrDir),
    dir: ''
  };
}

function getHistoricalSkuPrice(targetSku, targetDateOrDir, maybeChassisDir) {
  const args = _normalizeHistoricalPriceArgs(targetDateOrDir, maybeChassisDir);
  const normalizedDate = args.normalizedDate;
  const dir = resolveChassisDirectory(args.dir);
  const cleanSku = cleanBaseSKU(targetSku);
  const validDate = new Date(normalizedDate + 'T00:00:00Z');
  if (!Number.isFinite(validDate.getTime()) || validDate.toISOString().slice(0, 10) !== normalizedDate) {
    return { ..._buildEmptyPriceTimelineResult(cleanSku, normalizedDate, dir, {}), status: 'INVALID_AS_OF_DATE',
      priceUsd: null, nullablePriceUsd: null, priceState: 'UNPRICED', isResolved: false, quoteConfidence: 'UNRESOLVED' };
  }
  const audit = dir ? getSkuAuditHistory(targetSku, dir) : { priceTimeline: [] };
  const priceTimeline = Array.isArray(audit.priceTimeline) ? audit.priceTimeline : [];
  const sorted = priceTimeline.filter(event => /^\d{4}-\d{2}-\d{2}$/.test(event?.date || ''))
    .sort((a, b) => a.date.localeCompare(b.date));
  const eventsOnOrBefore = sorted.filter(event => event.date <= normalizedDate);
  if (!eventsOnOrBefore.length || !eventsOnOrBefore.some(event => Number(event.price) > 0)) {
    return _priceWithoutEarlierTrail(cleanSku, normalizedDate, dir, audit, args.implicitDate);
  }
  const baselinePrice = eventsOnOrBefore[0]?.price || 0;

  const effectiveEvent = eventsOnOrBefore[eventsOnOrBefore.length - 1];
  const resolved = _resolveEffectivePriceAndAnomaly(effectiveEvent, eventsOnOrBefore, cleanSku);
  let effectivePrice = resolved.effectivePrice;
  let effectiveStatus = resolved.effectiveStatus;
  let rejectedAnomaly = resolved.rejectedAnomaly;

  const jumpCheck = _detectPriceJumpAnomaly(eventsOnOrBefore, effectiveEvent, effectivePrice, rejectedAnomaly);
  effectivePrice = jumpCheck.effectivePrice;
  if (jumpCheck.effectiveStatus) effectiveStatus = jumpCheck.effectiveStatus;
  if (jumpCheck.rejectedAnomaly) rejectedAnomaly = jumpCheck.rejectedAnomaly;

  const classification = _classifyHistoricalConfidence(effectivePrice, effectiveStatus, effectiveEvent, cleanSku, audit.description);
  const pricingCategory = classification.pricingCategory;
  const quoteConfidence = classification.quoteConfidence;
  effectiveStatus = classification.effectiveStatus;

  const isResolved = quoteConfidence !== 'UNRESOLVED';
  const changePercent = baselinePrice > 0 ? parseFloat((((effectivePrice - baselinePrice) / baselinePrice) * 100).toFixed(2)) : 0;

  const isFreeResolved = pricingCategory === 'CONFIRMED_ZERO_PRICE_TRIGGER';
  const nullablePriceUsd = effectivePrice > 0 ? effectivePrice : (isFreeResolved ? 0 : null);
  const priceState = effectivePrice > 0 ? 'PRICED' : (isFreeResolved ? 'CONFIRMED_ZERO' : 'UNPRICED');

  return {
    sku: cleanSku,
    targetDate: normalizedDate,
    effectiveDate: pricingCategory === 'HISTORICAL_PRICE_FALLBACK'
      ? (eventsOnOrBefore.slice(0, -1).findLast(event => !event.quarantined && Number(event.price) === Number(effectivePrice))?.date || null)
      : effectiveEvent.date,
    priceUsd: nullablePriceUsd,
    nullablePriceUsd,
    priceState,
    currency: 'USD',
    status: effectiveStatus,
    pricingCategory,
    quoteConfidence,
    isResolved,
    sourceDirectory: dir,
    changeFromBaselinePercent: changePercent,
    isDiscontinued: effectiveEvent.status === 'REMOVED',
    priceTrail: sorted,
    ...(rejectedAnomaly ? { rejectedAnomaly } : {})
  };
}

/**
 * Query consolidated BOQ total pricing at a specific historical point in time.
 * @param {string|Array<object>} boqInput - Raw BOQ text, CSV, or parsed items array
 * @param {string} targetDate - Date or month (e.g. '2026-09-01', 'Oct 2026')
 * @param {string} chassisDir - Path to chassis folder
 * @returns {object} Consolidated BOQ breakdown on that date
 */
function getHistoricalBoqPricing(boqInput, targetDate, chassisDir) {
  const dir = chassisDir || '';
  const { normalizedDate } = _normalizeHistoricalPriceArgs(targetDate, dir);

  let items = [];
  if (Array.isArray(boqInput)) {
    items = boqInput;
  } else {
    const { parseSkuLines } = require('../boq/boq_parser.js');
    const lines = String(boqInput || '').split(/\r?\n/);
    items = parseSkuLines(lines).items;
  }

  let totalCapExUsd = 0;
  const pricedItems = [];
  let discontinuedCount = 0;
  const unresolvedSkus = [];

  for (const it of items) {
    const cleanSku = it.sku;
    const qty = parseInt(it.quantity, 10) || 1;
    const hist = getHistoricalSkuPrice(cleanSku, targetDate, dir);
    const unitPrice = hist.nullablePriceUsd;
    const extendedPrice = unitPrice === null ? null : unitPrice * qty;

    totalCapExUsd += extendedPrice ?? 0;
    if (hist.isDiscontinued) discontinuedCount++;
    if (!hist.isResolved) unresolvedSkus.push(cleanSku);

    pricedItems.push({
      sku: cleanSku,
      description: it.description || cleanSku,
      quantity: qty,
      unitPriceUsd: unitPrice,
      extendedPriceUsd: extendedPrice,
      effectiveDate: hist.effectiveDate,
      status: hist.status,
      pricingCategory: hist.pricingCategory,
      quoteConfidence: hist.quoteConfidence,
      currency: hist.currency || 'USD',
      isResolved: hist.isResolved,
      isDiscontinued: hist.isDiscontinued,
      changeFromBaselinePercent: hist.changeFromBaselinePercent || 0
    });
  }

  const isPricingComplete = unresolvedSkus.length === 0;

  return {
    targetDate: normalizedDate,
    monthLabel: normalizedDate ? formatMonthLabel(normalizedDate) : null,
    totalCapExUsd: isPricingComplete ? Number(totalCapExUsd.toFixed(2)) : null,
    pricedSubtotalUsd: Number(totalCapExUsd.toFixed(2)),
    totalCapExFormatted: isPricingComplete
      ? `$${totalCapExUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `$${totalCapExUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (INCOMPLETE — ${unresolvedSkus.length} SKU(s) unresolved)`,
    currency: 'USD',
    isPricingComplete,
    unresolvedCount: unresolvedSkus.length,
    unresolvedSkus,
    itemsCount: items.length,
    discontinuedItemsCount: discontinuedCount,
    items: pricedItems
  };
}

/**
 * Compare consolidated BOQ and component prices across a multi-month timeline.
 * e.g. timeline across ['2026-08', '2026-09', '2026-10', '2026-11', '2026-12']
 * @param {string|Array<object>} boqInput - BOQ text or items array
 * @param {Array<string>} timelineDates - Array of dates or month names
 * @param {string} chassisDir - Path to chassis folder
 * @returns {object} Full comparative time-series report
 */
function compareBoqPricingAcrossTimeline(boqInput, timelineDates, chassisDir) {
  const dates = (timelineDates && timelineDates.length > 0)
    ? timelineDates
    : ['2026-08-01', '2026-09-01', '2026-10-01', '2026-11-01', '2026-12-01'];

  const dir = chassisDir || '';

  const monthlySnapshots = dates.map(d => getHistoricalBoqPricing(boqInput, d, dir));
  const baselineCapEx = monthlySnapshots[0]?.isPricingComplete ? monthlySnapshots[0].totalCapExUsd : null;

  const timeline = monthlySnapshots.map((snap, idx) => {
    const prevSnap = idx > 0 ? monthlySnapshots[idx - 1] : null;
    const capEx = snap.isPricingComplete ? snap.totalCapExUsd : null;
    const deltaBaseline = capEx !== null && baselineCapEx !== null ? capEx - baselineCapEx : null;
    const deltaBaselinePct = deltaBaseline !== null && baselineCapEx > 0 ? (deltaBaseline / baselineCapEx) * 100 : null;
    const deltaPrev = capEx !== null && prevSnap?.isPricingComplete ? capEx - prevSnap.totalCapExUsd : null;
    const deltaPrevPct = deltaPrev !== null && prevSnap.totalCapExUsd > 0 ? (deltaPrev / prevSnap.totalCapExUsd) * 100 : null;

    return {
      date: snap.targetDate,
      monthLabel: snap.monthLabel,
      totalCapExUsd: capEx,
      pricedSubtotalUsd: snap.pricedSubtotalUsd,
      isPricingComplete: snap.isPricingComplete,
      deltaFromBaselineUsd: deltaBaseline === null ? null : Number(deltaBaseline.toFixed(2)),
      deltaFromBaselinePercent: deltaBaselinePct === null ? null : Number(deltaBaselinePct.toFixed(2)),
      deltaFromPrevMonthUsd: deltaPrev === null ? null : Number(deltaPrev.toFixed(2)),
      deltaFromPrevMonthPercent: deltaPrevPct === null ? null : Number(deltaPrevPct.toFixed(2)),
      discontinuedItemsCount: snap.discontinuedItemsCount
    };
  });

  // Calculate volatility metrics
  const allCosts = timeline.map(t => t.totalCapExUsd).filter(Number.isFinite);
  const minCost = allCosts.length ? Math.min(...allCosts) : null;
  const maxCost = allCosts.length ? Math.max(...allCosts) : null;
  const minEntry = timeline.find(t => t.totalCapExUsd === minCost);
  const maxEntry = timeline.find(t => t.totalCapExUsd === maxCost);
  const varianceUsd = allCosts.length ? maxCost - minCost : null;
  const maxFluctuationPct = minCost > 0 ? Number(((varianceUsd / minCost) * 100).toFixed(2)) : null;

  // Build component-level price trail matrix across the timeline
  const skuMap = new Map();
  monthlySnapshots.forEach(snap => {
    snap.items.forEach(it => {
      if (!skuMap.has(it.sku)) {
        skuMap.set(it.sku, {
          sku: it.sku,
          description: it.description,
          quantity: it.quantity,
          timeline: []
        });
      }
      skuMap.get(it.sku).timeline.push({
        date: snap.targetDate,
        monthLabel: snap.monthLabel,
        unitPriceUsd: it.unitPriceUsd,
        extendedPriceUsd: it.extendedPriceUsd,
        status: it.status
      });
    });
  });

  return {
    baselineDate: timeline[0]?.date,
    baselineCapExUsd: baselineCapEx,
    timeline,
    volatilityMetrics: {
      lowestCostMonth: minEntry?.monthLabel,
      lowestCapExUsd: minCost,
      highestCostMonth: maxEntry?.monthLabel,
      highestCapExUsd: maxCost,
      netVarianceUsd: varianceUsd === null ? null : Number(varianceUsd.toFixed(2)),
      maxFluctuationPercent: maxFluctuationPct
    },
    componentMatrix: Array.from(skuMap.values())
  };
}

/**
 * Record a version snapshot of a catalog JSON payload with checksums.
 */
function recordVersionSnapshot(catalogData, historyDir) {
  fs.mkdirSync(historyDir, { recursive: true });
  const scrapeDate = catalogData.metadata?.scrapeDate || new Date().toISOString().split('T')[0];
  const snapshotPath = path.join(historyDir, `catalog_${scrapeDate}.json`);

  const checksum = calculateChecksum(catalogData);
  const versionedCatalog = {
    ...catalogData,
    metadata: {
      ...catalogData.metadata,
      snapshotChecksum: checksum,
      snapshotTimestamp: new Date().toISOString()
    }
  };

  safeWriteJsonAtomic(snapshotPath, versionedCatalog);
  return { snapshotPath, checksum, scrapeDate };
}

/**
 * Proactive Presales Lifecycle & Price Trend Advisories (G-EVD-02)
 * Audits BOM line items against historical price trends and lifecycle milestones.
 *
 * @param {Array<object>} items - Evaluated hardware items
 * @param {string} chassisDir - Product catalog directory containing history/
 * @returns {Array<object>} Structured presales advisories
 */
function generatePresalesLifecycleAdvisories(items = [], chassisDir = '') {
  if (!Array.isArray(items) || items.length === 0 || !chassisDir) return [];
  const advisories = [];
  const seenSkus = new Set();

  for (const item of items) {
    const rawSku = item.sku || item['Product #'] || '';
    const sku = cleanBaseSKU(rawSku);
    if (!sku || seenSkus.has(sku)) continue;
    seenSkus.add(sku);

    try {
      const history = getSkuAuditHistory(sku, chassisDir);

      // 1. EOL / Announced Discontinuation Risk
      if (history.discontinuedInfo || ['90-Day Warning', 'EOL', 'OBSOLETE', 'DISCONTINUED'].includes(history.currentStatus)) {
        const discDate = history.discontinuedInfo?.discontinuedAt || (history.currentStatus === '90-Day Warning' ? 'within 90 days' : history.currentStatus);
        const subst = history.discontinuedInfo?.replacementSku ? ` (Recommended replacement: ${history.discontinuedInfo.replacementSku})` : '';
        advisories.push({
          sku,
          type: 'EOL_DISCONTINUATION_RISK',
          severity: 'HIGH',
          lifecycleStatus: history.currentStatus,
          discontinuationDate: discDate,
          message: `SKU ${sku} has lifecycle risk (${history.currentStatus}, ${discDate}).${subst} Advance migration recommended.`
        });
      }

      // 1B. Supply Constraint Risk (CS Badge)
      const inputLifecycle = classifyLifecycleState(item.lifecycleStatus || item['Lifecycle Status'] || item.vendorSupplyStatus,
        item.diffStatus, rawSku, item.description);
      if (history.currentStatus === 'CONSTRAINED_SUPPLY' || inputLifecycle.isConstrainedSupply ||
          item.vendorSupplyStatus === 'CONSTRAINED_SUPPLY' || item.isSupplyConstrained) {
        advisories.push({
          sku,
          type: 'SUPPLY_CONSTRAINT_RISK',
          severity: 'HIGH',
          lifecycleStatus: 'Constrained Supply (CS)',
          message: `SKU ${sku} is marked with vendor status [CS] (Constrained Supply: currently unavailable based on supply constraints). Recommend selecting an available equivalent alternative.`
        });
      }

      // 2. Price Spike / Upward Trend Warning (>= 3% increase)
      const timeline = history.priceTimeline || [];
      if (timeline.length >= 2) {
        const validTimeline = timeline
          .map(e => {
            const p = parseStrictPrice(e.price);
            return { date: e.date || e.snapshotDate, price: p.priceUsd !== null ? p.priceUsd : 0 };
          })
          .filter(e => e.price > 0)
          .sort((a, b) => new Date(a.date) - new Date(b.date));

        if (validTimeline.length >= 2) {
          const latest = validTimeline[validTimeline.length - 1];
          const previous = validTimeline[validTimeline.length - 2];
          if (latest.price > previous.price) {
            const deltaUsd = latest.price - previous.price;
            const percentIncrease = ((deltaUsd / previous.price) * 100);
            if (percentIncrease >= 3.0) {
              advisories.push({
                sku,
                type: 'PRICE_INCREASE_TREND',
                severity: 'MEDIUM',
                previousPrice: previous.price,
                latestPrice: latest.price,
                percentIncrease: parseFloat(percentIncrease.toFixed(1)),
                message: `SKU ${sku} experienced a +${percentIncrease.toFixed(1)}% price increase from $${previous.price} to $${latest.price} (+$${deltaUsd.toFixed(2)}).`
              });
            }
          }
        }
      }
    } catch (_err) {
      // Non-blocking per-SKU audit
    }
  }

  return advisories;
}

module.exports = {
  calculateChecksum,
  resolveChassisDirectory,
  normalizeTargetDate,
  formatMonthLabel,
  getSkuAuditHistory,
  getHistoricalSkuPrice,
  getHistoricalBoqPricing,
  compareBoqPricingAcrossTimeline,
  recordVersionSnapshot,
  isConfirmedFreeSku,
  CONFIRMED_ZERO_PARENT_CONTRACTS,
  generatePresalesLifecycleAdvisories,
  _clearCatalogPriceCache
};
