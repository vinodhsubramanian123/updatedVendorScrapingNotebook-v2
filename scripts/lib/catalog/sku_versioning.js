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
const { cleanBaseSKU } = require('./sku.js');

const catalogPriceCache = new Map();

/**
 * Clear the internal catalog price cache (useful for tests/hot reloads).
 */
function _clearCatalogPriceCache() {
  catalogPriceCache.clear();
}

/**
 * Calculate SHA-256 checksum for a string or object.
 */
function calculateChecksum(content) {
  const str = typeof content === 'object' ? JSON.stringify(content) : String(content);
  return crypto.createHash('sha256').update(str).digest('hex');
}

/**
 * Resolve relative or model-name chassis directory to its path in outputs/
 */
function resolveChassisDirectory(dir) {
  if (!dir) return '';
  if (fs.existsSync(dir)) return dir;
  
  const outputsRoot = path.join(__dirname, '..', '..', '..', 'outputs');
  if (fs.existsSync(outputsRoot)) {
    const cleanDir = path.basename(dir).trim();
    function findDirRecursive(current) {
      try {
        const entries = fs.readdirSync(current, { withFileTypes: true });
        for (const ent of entries) {
          if (ent.isDirectory()) {
            const full = path.join(current, ent.name);
            if (ent.name === cleanDir || ent.name.toLowerCase() === cleanDir.toLowerCase()) {
              return full;
            }
            const found = findDirRecursive(full);
            if (found) return found;
          }
        }
      } catch (_) {}
      return null;
    }
    const match = findDirRecursive(outputsRoot);
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

function _loadPeerPriceTimeline(resolvedChassisDir, cleanSku, rawSku, rawSkuWithHash) {
  try {
    const parentDir = path.dirname(resolvedChassisDir);
    if (!fs.existsSync(parentDir)) return null;
    const peerDirs = fs.readdirSync(parentDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && path.join(parentDir, d.name) !== resolvedChassisDir)
      .map(d => path.join(parentDir, d.name));

    for (const peer of peerDirs) {
      const peerPriceHistoryPath = path.join(peer, 'history', 'price_history.json');
      if (fs.existsSync(peerPriceHistoryPath)) {
        try {
          const pHist = JSON.parse(fs.readFileSync(peerPriceHistoryPath, 'utf-8'));
          const pFound = _findInSkuMap(pHist, cleanSku, rawSku, rawSkuWithHash);
          if (pFound && pFound.some(e => Number(e.price) > 0)) return pFound;
        } catch (_) {}
      }
      const peerServicesPath = path.join(peer, 'services_history', 'services_price_history.json');
      if (fs.existsSync(peerServicesPath)) {
        try {
          const spHist = JSON.parse(fs.readFileSync(peerServicesPath, 'utf-8'));
          const spFound = _findInSkuMap(spHist, cleanSku, rawSku, rawSkuWithHash);
          if (spFound && spFound.some(e => Number(e.price) > 0)) return spFound;
        } catch (_) {}
      }
    }
  } catch (_) {}
  return null;
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

  // 1c. Cross-chassis fallback within same product generation
  if (resolvedChassisDir && priceTimeline.every(e => !e.price || e.price <= 0)) {
    priceTimeline = _loadPeerPriceTimeline(resolvedChassisDir, cleanSku, rawSku, rawSkuWithHash) || priceTimeline;
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
      const currentStatus = String(match.status || '').toUpperCase() === 'REINSTATED' ? 'ACTIVE' : 'DISCONTINUED';
      return { discontinuedInfo: match, currentStatus };
    }
  } catch (err) {
    console.warn(`[sku_versioning] Error reading discontinued_skus.json: ${err.message}`);
  }
  return { discontinuedInfo: null, currentStatus: 'UNKNOWN' };
}

function _findSkuInSnapshotEntries(content, cleanSku) {
  const entriesList = Array.isArray(content?.entries) ? content.entries : [];
  for (const entry of entriesList) {
    const skusList = Array.isArray(entry.skus) ? entry.skus : [];
    for (const s of skusList) {
      const skuCode = s.sku || s['Product #'] || s['SKU'];
      if (skuCode === cleanSku) {
        return {
          parentCategory: entry.parentCategory,
          subCategory: entry.subCategory,
          description: s.description || s['Description'] || '',
          priceUsd: s.priceUsd || s['Unit Price (USD)'] || '0.00',
          optionType: s.optionType || s['Option Type'] || ''
        };
      }
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
      const content = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
      if (!content || typeof content !== 'object') continue;
      const scrapeDate = content.metadata?.scrapeDate || file.replace('catalog_', '').replace('.json', '');
      const checksum = calculateChecksum(content);

      const skuDetails = _findSkuInSnapshotEntries(content, cleanSku);
      if (skuDetails) {
        if (currentStatus !== 'DISCONTINUED') currentStatus = 'ACTIVE';
        latestDetails = skuDetails;
        snapshotOccurrences.push({
          snapshotFile: file,
          scrapeDate,
          snapshotChecksum: checksum,
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
  const cleanSku = String(targetSku).replace(/[^a-zA-Z0-9-]/g, '').trim();
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

  if (!fs.existsSync(historyDir)) {
    return auditResult;
  }

  auditResult.priceTimeline = _loadPriceTimeline(historyDir, resolvedChassisDir, cleanSku, rawSku, rawSkuWithHash);
  auditResult.attributeMutations = _loadAttributeMutations(historyDir, cleanSku);

  const disc = _loadDiscontinuedInfo(historyDir, cleanSku);
  auditResult.discontinuedInfo = disc.discontinuedInfo;
  auditResult.currentStatus = disc.currentStatus;

  const snaps = _scanSnapshotOccurrences(historyDir, cleanSku, auditResult.currentStatus);
  auditResult.snapshotOccurrences = snaps.snapshotOccurrences;
  auditResult.latestDetails = snaps.latestDetails;
  auditResult.currentStatus = snaps.currentStatus;

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
  const year = yearMatch ? yearMatch[1] : '2026';

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

const CONFIRMED_ZERO_PARENT_CONTRACTS = new Set(['HA113A1', 'HU4B2A3']);

function isConfirmedFreeSku(sku, description) {
  const s = String(sku || '').toUpperCase().trim();
  const baseSku = s.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
  if (CONFIRMED_ZERO_PARENT_CONTRACTS.has(baseSku)) return true;
  const d = String(description || '').toUpperCase();
  // FIO enablement triggers, zero dollar configs, CE mark removal
  if (s === 'P35876-B21' || s === 'S1A05A') return true;
  if (s.endsWith('-F21') || s.includes('#0D1')) return true;
  if (d.includes('ENABLEMENT') && (d.includes('FIO') || d.includes('ZERO') || d.includes('CONFIG'))) return true;
  if (d.includes('FACTORY INTEGRATED') && d.includes('KIT')) return true;
  return false;
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
function _checkFileForSkuPrice(filePath, cleanSku) {
  if (!filePath || !fs.existsSync(filePath)) return 0;
  try {
    if (!catalogPriceCache.has(filePath)) {
      const cat = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const map = new Map();
      const parsePrice = (s) => parseFloat(String(s.priceUsd || s['Unit Price (USD)'] || s['Unit List Price (USD)'] || s.price || 0).replace(/[^0-9.]/g, '')) || 0;
      const entries = Array.isArray(cat.entries) ? cat.entries : [];
      entries.forEach(e => {
        const skus = Array.isArray(e.skus) ? e.skus : [];
        skus.forEach(s => {
          const k = (s.sku || s['Product #'] || s['SKU'] || '').replace(/[^a-zA-Z0-9-]/g, '').trim();
          if (k) map.set(k, parsePrice(s));
        });
      });
      if (Array.isArray(cat.skus)) {
        cat.skus.forEach(s => {
          const k = (s.sku || s['Product #'] || s['SKU'] || '').replace(/[^a-zA-Z0-9-]/g, '').trim();
          if (k) map.set(k, parsePrice(s));
        });
      }
      catalogPriceCache.set(filePath, map);
    }
    const match = catalogPriceCache.get(filePath).get(cleanSku);
    if (typeof match === 'number') return match;
    if (match) {
      return parseFloat(String(match.priceUsd || match['Unit Price (USD)'] || match['Unit List Price (USD)'] || match.price || 0).replace(/[^0-9.]/g, '')) || 0;
    }
  } catch (_) {}
  return 0;
}

function _resolvePeerFallbackPrice(dir, cleanSku) {
  if (!dir) return 0;
  try {
    const parentDir = path.dirname(dir);
    if (!fs.existsSync(parentDir)) return 0;
    const peers = fs.readdirSync(parentDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && path.join(parentDir, d.name) !== dir)
      .map(d => path.join(parentDir, d.name));
    for (const peer of peers) {
      let p = _checkFileForSkuPrice(path.join(peer, `${path.basename(peer)}_Catalog.json`), cleanSku);
      if (p > 0) return p;
      p = _checkFileForSkuPrice(path.join(peer, `${path.basename(peer)}_Services.json`), cleanSku);
      if (p > 0) return p;
    }
  } catch (_) {}
  return 0;
}

function _resolveFallbackCatalogPrice(dir, cleanSku) {
  let fallbackPrice = _checkFileForSkuPrice(path.join(dir, `${path.basename(dir)}_Catalog.json`), cleanSku);
  if (fallbackPrice <= 0) {
    fallbackPrice = _checkFileForSkuPrice(path.join(dir, `${path.basename(dir)}_Services.json`), cleanSku);
  }
  if (fallbackPrice <= 0) {
    fallbackPrice = _resolvePeerFallbackPrice(dir, cleanSku);
  }
  return fallbackPrice;
}

function _resolveEffectivePriceAndAnomaly(effectiveEvent, sorted, normalizedDate) {
  let effectivePrice = effectiveEvent.price || 0;
  let effectiveStatus = effectiveEvent.status || 'ACTIVE';
  let rejectedAnomaly = null;

  if (effectiveEvent.quarantined) {
    rejectedAnomaly = {
      rejectedPriceUsd: effectiveEvent.price,
      preservedPriceUsd: effectiveEvent.effectivePrice || 0,
      eventDate: effectiveEvent.date,
      validationState: effectiveEvent.validationState,
      provenance: effectiveEvent.anomalyProvenance
    };
    effectivePrice = effectiveEvent.effectivePrice || 0;
    effectiveStatus = effectiveEvent.validationState || 'ANOMALOUS_PORTAL_PRICE_REJECTED';
  } else if (effectivePrice === 0) {
    const nonZeroEvents = sorted.filter(e => e.price && e.price > 0 && !e.quarantined && (e.date || '') <= normalizedDate);
    if (nonZeroEvents.length > 0) {
      effectivePrice = nonZeroEvents[nonZeroEvents.length - 1].price;
      effectiveStatus = 'HISTORICAL_PRICE_PRESERVED_FROM_ZERO';
    }
  }

  return { effectivePrice, effectiveStatus, rejectedAnomaly };
}

function _detectPriceJumpAnomaly(eventsOnOrBefore, effectiveEvent, effectivePrice, rejectedAnomaly) {
  if (rejectedAnomaly || effectivePrice <= 0) {
    return { effectivePrice, effectiveStatus: null, rejectedAnomaly };
  }
  const priorNonZeroEvents = eventsOnOrBefore
    .slice(0, -1)
    .filter(e => Number(e.price) > 0 && !e.quarantined);
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
    effectiveDate: normalizedDate,
    priceUsd: 0,
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
  if (maybeChassisDir !== undefined) {
    return {
      normalizedDate: normalizeTargetDate(targetDateOrDir),
      dir: maybeChassisDir || ''
    };
  }
  if (typeof targetDateOrDir === 'string' && (targetDateOrDir.includes('/') || targetDateOrDir.includes('\\') || !targetDateOrDir.includes('-'))) {
    return {
      dir: targetDateOrDir,
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
  const audit = dir ? getSkuAuditHistory(targetSku, dir) : { priceTimeline: [] };
  const cleanSku = String(targetSku).replace(/[^a-zA-Z0-9-]/g, '').trim();
  const priceTimeline = Array.isArray(audit.priceTimeline) ? audit.priceTimeline : [];

  const hasTimelinePrice = priceTimeline.some(e => Number(e.price) > 0);

  if (!hasTimelinePrice) {
    const fallbackPrice = _resolveFallbackCatalogPrice(dir, cleanSku);
    if (fallbackPrice > 0) {
      return {
        sku: cleanSku,
        targetDate: normalizedDate,
        effectiveDate: normalizedDate,
        priceUsd: fallbackPrice,
        currency: 'USD',
        status: 'CURRENT_PRICE',
        pricingCategory: 'CURRENT_CATALOG_PRICE',
        quoteConfidence: 'HIGH',
        isResolved: true,
        sourceDirectory: dir,
        isDiscontinued: audit.currentStatus === 'DISCONTINUED',
        priceTrail: audit.priceTimeline
      };
    }

    if (priceTimeline.length === 0) {
      return _buildEmptyPriceTimelineResult(cleanSku, normalizedDate, dir, audit);
    }
  }

  const sorted = [...priceTimeline].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const baselinePrice = sorted[0]?.price || 0;
  const eventsOnOrBefore = sorted.filter(e => (e.date || '') <= normalizedDate);

  if (eventsOnOrBefore.length === 0) {
    const earliest = sorted[0];
    return {
      sku: cleanSku,
      targetDate: normalizedDate,
      effectiveDate: earliest.date,
      priceUsd: earliest.price || 0,
      currency: 'USD',
      status: 'PRE_BASELINE_ESTIMATE',
      pricingCategory: (earliest.price > 0) ? 'PRE_BASELINE_ESTIMATE' : 'UNRESOLVED_ZERO_PRICE',
      quoteConfidence: (earliest.price > 0) ? 'MEDIUM' : 'UNRESOLVED',
      isResolved: earliest.price > 0,
      sourceDirectory: dir,
      changeFromBaselinePercent: 0,
      isDiscontinued: false,
      priceTrail: sorted
    };
  }

  const effectiveEvent = eventsOnOrBefore[eventsOnOrBefore.length - 1];
  const resolved = _resolveEffectivePriceAndAnomaly(effectiveEvent, sorted, normalizedDate);
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

  return {
    sku: cleanSku,
    targetDate: normalizedDate,
    effectiveDate: effectiveEvent.date,
    priceUsd: effectivePrice,
    currency: 'USD',
    status: effectiveStatus,
    pricingCategory,
    quoteConfidence,
    isResolved,
    sourceDirectory: dir,
    changeFromBaselinePercent: changePercent,
    isDiscontinued: effectiveEvent.status === 'REMOVED' || audit.currentStatus === 'DISCONTINUED',
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
  const normalizedDate = normalizeTargetDate(targetDate);
  const dir = chassisDir || '';

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
    const hist = getHistoricalSkuPrice(cleanSku, normalizedDate, dir);
    const unitPrice = hist.priceUsd;
    const extendedPrice = unitPrice * qty;

    totalCapExUsd += extendedPrice;
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
    monthLabel: formatMonthLabel(normalizedDate),
    totalCapExUsd: parseFloat(totalCapExUsd.toFixed(2)),
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
  const baselineCapEx = monthlySnapshots[0]?.totalCapExUsd || 0;

  const timeline = monthlySnapshots.map((snap, idx) => {
    const prevSnap = idx > 0 ? monthlySnapshots[idx - 1] : null;
    const deltaBaseline = snap.totalCapExUsd - baselineCapEx;
    const deltaBaselinePct = baselineCapEx > 0 ? (deltaBaseline / baselineCapEx) * 100 : 0;
    const deltaPrev = prevSnap ? snap.totalCapExUsd - prevSnap.totalCapExUsd : 0;
    const deltaPrevPct = prevSnap && prevSnap.totalCapExUsd > 0 ? (deltaPrev / prevSnap.totalCapExUsd) * 100 : 0;

    return {
      date: snap.targetDate,
      monthLabel: snap.monthLabel,
      totalCapExUsd: snap.totalCapExUsd,
      deltaFromBaselineUsd: parseFloat(deltaBaseline.toFixed(2)),
      deltaFromBaselinePercent: parseFloat(deltaBaselinePct.toFixed(2)),
      deltaFromPrevMonthUsd: parseFloat(deltaPrev.toFixed(2)),
      deltaFromPrevMonthPercent: parseFloat(deltaPrevPct.toFixed(2)),
      discontinuedItemsCount: snap.discontinuedItemsCount
    };
  });

  // Calculate volatility metrics
  const allCosts = timeline.map(t => t.totalCapExUsd);
  const minCost = Math.min(...allCosts);
  const maxCost = Math.max(...allCosts);
  const minEntry = timeline.find(t => t.totalCapExUsd === minCost);
  const maxEntry = timeline.find(t => t.totalCapExUsd === maxCost);
  const varianceUsd = maxCost - minCost;
  const maxFluctuationPct = minCost > 0 ? parseFloat(((varianceUsd / minCost) * 100).toFixed(2)) : 0;

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
      netVarianceUsd: parseFloat(varianceUsd.toFixed(2)),
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
      if (history.discontinuedInfo || history.currentStatus === '90-Day Warning' || history.currentStatus === 'EOL') {
        const discDate = history.discontinuedInfo?.discontinuedAt || 'within 90 days';
        const subst = history.discontinuedInfo?.replacementSku ? ` (Recommended replacement: ${history.discontinuedInfo.replacementSku})` : '';
        advisories.push({
          sku,
          type: 'EOL_DISCONTINUATION_RISK',
          severity: 'HIGH',
          discontinuationDate: discDate,
          message: `SKU ${sku} has an announced discontinuation ${discDate}.${subst} Advance migration recommended.`
        });
      }

      // 2. Price Spike / Upward Trend Warning (>= 3% increase)
      const timeline = history.priceTimeline || [];
      if (timeline.length >= 2) {
        const validTimeline = timeline
          .map(e => ({ date: e.date || e.snapshotDate, price: typeof e.price === 'number' ? e.price : parseFloat(String(e.price || '0').replace(/[$,]/g, '')) }))
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
