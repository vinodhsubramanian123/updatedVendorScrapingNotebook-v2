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
 * Get comprehensive audit timeline and version history for a given SKU.
 * @param {string} targetSku - Cleaned HPE SKU (e.g. 'P73282-B21' or 'P02498-B21')
 * @param {string} chassisDir - Relative or absolute path to chassis folder
 * @returns {object} Audit trail with price history, attribute changes, snapshots, and current status
 */
function getSkuAuditHistory(targetSku, chassisDir) {
  if (!targetSku) throw new Error('Target SKU is required for version audit');
  
  const cleanSku = String(targetSku).replace(/[^a-zA-Z0-9\-]/g, '').trim();
  const historyDir = path.join(chassisDir, 'history');
  
  const auditResult = {
    sku: cleanSku,
    chassisDir,
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

  // 1. Read price history
  const priceHistoryPath = path.join(historyDir, 'price_history.json');
  if (fs.existsSync(priceHistoryPath)) {
    try {
      const priceHistory = JSON.parse(fs.readFileSync(priceHistoryPath, 'utf-8'));
      if (priceHistory[cleanSku]) {
        auditResult.priceTimeline = priceHistory[cleanSku];
      }
    } catch (err) {
      console.warn(`[sku_versioning] Error reading price_history.json: ${err.message}`);
    }
  }

  // 2. Read attribute mutations
  const attrHistoryPath = path.join(historyDir, 'attribute_history.json');
  if (fs.existsSync(attrHistoryPath)) {
    try {
      const attrHistory = JSON.parse(fs.readFileSync(attrHistoryPath, 'utf-8'));
      if (Array.isArray(attrHistory)) {
        auditResult.attributeMutations = attrHistory.filter(item => 
          item.productNumber === cleanSku || item.sku === cleanSku
        );
      }
    } catch (err) {
      console.warn(`[sku_versioning] Error reading attribute_history.json: ${err.message}`);
    }
  }

  // 3. Read discontinued SKUs log
  const discontinuedPath = path.join(historyDir, 'discontinued_skus.json');
  if (fs.existsSync(discontinuedPath)) {
    try {
      const discontinuedList = JSON.parse(fs.readFileSync(discontinuedPath, 'utf-8'));
      if (Array.isArray(discontinuedList)) {
        const match = discontinuedList.find(d => d.productNumber === cleanSku || d.sku === cleanSku);
        if (match) {
          auditResult.discontinuedInfo = match;
          auditResult.currentStatus = 'DISCONTINUED';
        }
      }
    } catch (err) {
      console.warn(`[sku_versioning] Error reading discontinued_skus.json: ${err.message}`);
    }
  }

  // 4. Scan catalog snapshots
  const snapshots = fs.readdirSync(historyDir)
    .filter(f => f.startsWith('catalog_') && f.endsWith('.json') && f !== 'catalog_deltas.json')
    .sort();

  for (const file of snapshots) {
    const snapshotPath = path.join(historyDir, file);
    try {
      const content = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
      if (!content || typeof content !== 'object') continue;
      const scrapeDate = content.metadata?.scrapeDate || file.replace('catalog_', '').replace('.json', '');
      const checksum = calculateChecksum(content);

      let foundInSnapshot = false;
      let skuDetails = null;

      const entriesList = Array.isArray(content.entries) ? content.entries : [];
      for (const entry of entriesList) {
        const skusList = Array.isArray(entry.skus) ? entry.skus : [];
        for (const s of skusList) {
          const skuCode = s.sku || s['Product #'] || s['SKU'];
          if (skuCode === cleanSku) {
            foundInSnapshot = true;
            skuDetails = {
              parentCategory: entry.parentCategory,
              subCategory: entry.subCategory,
              description: s.description || s['Description'] || '',
              priceUsd: s.priceUsd || s['Unit Price (USD)'] || '0.00',
              optionType: s.optionType || s['Option Type'] || ''
            };
            break;
          }
        }
        if (foundInSnapshot) break;
      }

      if (foundInSnapshot) {
        if (auditResult.currentStatus !== 'DISCONTINUED') {
          auditResult.currentStatus = 'ACTIVE';
        }
        auditResult.latestDetails = skuDetails;
        auditResult.snapshotOccurrences.push({
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

/**
 * Query historical unit price of a single SKU at a specific point in time.
 * @param {string} targetSku - Cleaned HPE SKU
 * @param {string} targetDate - Date or month (e.g. '2026-08-15', 'Aug 2026', '2026-10')
 * @param {string} chassisDir - Path to chassis folder (defaults to DL380 Gen12 SFF)
 * @returns {object} Historical price details on that date
 */
function getHistoricalSkuPrice(targetSku, targetDateOrDir, maybeChassisDir) {
  let normalizedDate;
  let dir = '';

  if (maybeChassisDir !== undefined) {
    normalizedDate = normalizeTargetDate(targetDateOrDir);
    dir = maybeChassisDir || '';
  } else if (typeof targetDateOrDir === 'string' && (targetDateOrDir.includes('/') || targetDateOrDir.includes('\\') || !targetDateOrDir.includes('-'))) {
    // 2-arg signature: (targetSku, chassisDir)
    dir = targetDateOrDir;
    normalizedDate = normalizeTargetDate(new Date().toISOString().split('T')[0]);
  } else {
    normalizedDate = normalizeTargetDate(targetDateOrDir);
    dir = '';
  }

  const audit = dir ? getSkuAuditHistory(targetSku, dir) : { priceTimeline: [] };
  const cleanSku = String(targetSku).replace(/[^a-zA-Z0-9\-]/g, '').trim();
  const priceTimeline = Array.isArray(audit.priceTimeline) ? audit.priceTimeline : [];

  if (priceTimeline.length === 0) {
    // If no price timeline in history, check current catalog fallback price
    let fallbackPrice = 0;
    const catalogPath = path.join(dir, `${path.basename(dir)}_Catalog.json`);
    if (fs.existsSync(catalogPath)) {
      try {
        if (!catalogPriceCache.has(catalogPath)) {
          const cat = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
          const map = new Map();
          const entries = Array.isArray(cat.entries) ? cat.entries : [];
          entries.forEach(e => {
            const skus = Array.isArray(e.skus) ? e.skus : [];
            skus.forEach(s => map.set(s.sku || s['Product #'], s));
          });
          catalogPriceCache.set(catalogPath, map);
        }
        const match = catalogPriceCache.get(catalogPath).get(cleanSku);
        if (match) {
          fallbackPrice = parseFloat(String(match.priceUsd || match['Unit Price (USD)'] || 0).replace(/[^0-9.]/g, '')) || 0;
        }
      } catch (_) { /* ignore fallback read error */ }
    }

    return {
      sku: cleanSku,
      targetDate: normalizedDate,
      effectiveDate: normalizedDate,
      priceUsd: fallbackPrice,
      status: fallbackPrice > 0 ? 'CURRENT_PRICE' : 'NO_PRICE_RECORDED',
      isDiscontinued: audit.currentStatus === 'DISCONTINUED',
      priceTrail: audit.priceTimeline
    };
  }

  // Sort chronological ascending
  const sorted = [...priceTimeline].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const baselinePrice = sorted[0]?.price || 0;

  // Find latest recorded price event on or before normalizedDate
  const eventsOnOrBefore = sorted.filter(e => (e.date || '') <= normalizedDate);

  if (eventsOnOrBefore.length === 0) {
    // Target date is before earliest recorded scrape
    const earliest = sorted[0];
    return {
      sku: cleanSku,
      targetDate: normalizedDate,
      effectiveDate: earliest.date,
      priceUsd: earliest.price || 0,
      status: 'PRE_BASELINE_ESTIMATE',
      changeFromBaselinePercent: 0,
      isDiscontinued: false,
      priceTrail: sorted
    };
  }

  const effectiveEvent = eventsOnOrBefore[eventsOnOrBefore.length - 1];
  let effectivePrice = effectiveEvent.price || 0;
  if (effectivePrice === 0) {
    // Fall back to latest non-zero price recorded in trail on or before target date
    const nonZeroEvents = sorted.filter(e => e.price && e.price > 0 && (e.date || '') <= normalizedDate);
    if (nonZeroEvents.length > 0) {
      effectivePrice = nonZeroEvents[nonZeroEvents.length - 1].price;
    }
  }
  const changePercent = baselinePrice > 0 ? parseFloat((((effectivePrice - baselinePrice) / baselinePrice) * 100).toFixed(2)) : 0;

  return {
    sku: cleanSku,
    targetDate: normalizedDate,
    effectiveDate: effectiveEvent.date,
    priceUsd: effectivePrice,
    status: effectiveEvent.status || 'ACTIVE',
    changeFromBaselinePercent: changePercent,
    isDiscontinued: effectiveEvent.status === 'REMOVED' || audit.currentStatus === 'DISCONTINUED',
    priceTrail: sorted
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

  for (const it of items) {
    const cleanSku = it.sku;
    const qty = parseInt(it.quantity, 10) || 1;
    const hist = getHistoricalSkuPrice(cleanSku, normalizedDate, dir);
    const unitPrice = hist.priceUsd;
    const extendedPrice = unitPrice * qty;

    totalCapExUsd += extendedPrice;
    if (hist.isDiscontinued) discontinuedCount++;

    pricedItems.push({
      sku: cleanSku,
      description: it.description || cleanSku,
      quantity: qty,
      unitPriceUsd: unitPrice,
      extendedPriceUsd: extendedPrice,
      effectiveDate: hist.effectiveDate,
      status: hist.status,
      isDiscontinued: hist.isDiscontinued,
      changeFromBaselinePercent: hist.changeFromBaselinePercent || 0
    });
  }

  return {
    targetDate: normalizedDate,
    monthLabel: formatMonthLabel(normalizedDate),
    totalCapExUsd: parseFloat(totalCapExUsd.toFixed(2)),
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
      ...(catalogData.metadata || {}),
      snapshotChecksum: checksum,
      snapshotTimestamp: new Date().toISOString()
    }
  };

  safeWriteJsonAtomic(snapshotPath, versionedCatalog);
  return { snapshotPath, checksum, scrapeDate };
}

module.exports = {
  calculateChecksum,
  normalizeTargetDate,
  formatMonthLabel,
  getSkuAuditHistory,
  getHistoricalSkuPrice,
  getHistoricalBoqPricing,
  compareBoqPricingAcrossTimeline,
  recordVersionSnapshot,
  _clearCatalogPriceCache
};


