'use strict';
/**
 * scripts/lib/boq/delivery_pacing_analyzer.js — Delivery Pacing & Release Wave Analyzer
 *
 * Implements Invariant INV-177 / INV-180:
 * 1. Analyzes component General Availability (GA) Start Dates to detect Release Wave Disparities
 *    (e.g. Intel Xeon 6740P in Wave 2 [Feb 2025] vs 6748P in Wave 3 [June 2025] = 98-day gap).
 * 2. Identifies Pacing Item Lead-Time Bottlenecks where manufacturing build duration is bounded
 *    by the slowest item (e.g. 30 days for Fibre Channel HBA R2E09A vs 4 days standard server).
 * 3. Proactively advises presales architects to partition into separate UCIDs / Order Icons to
 *    prevent factory dispatch holds on standard components.
 */

const { cleanBaseSKU, buildCatalogSkuIndex, isServiceSku } = require('../catalog/sku.js');

/**
 * Parse a standard date string (MM/DD/YYYY or YYYY-MM-DD) into a timestamp.
 * Returns null if invalid or unpublished.
 * @param {string} dateStr 
 * @returns {number|null} Epoch ms or null
 */
function parseDateToMs(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (['unpublished', 'none', '(none)', 'n/a', 'na'].includes(trimmed.toLowerCase())) return null;

  // Handle MM/DD/YYYY
  const mdyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    const [, month, day, year] = mdyMatch;
    const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    return isNaN(d.getTime()) ? null : d.getTime();
  }

  // Handle YYYY-MM-DD
  const ymdMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    return isNaN(d.getTime()) ? null : d.getTime();
  }

  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? null : parsed.getTime();
}

/**
 * Format timestamp into standard YYYY-MM-DD string.
 * @param {number} ms 
 * @returns {string}
 */
function formatMsToDateStr(ms) {
  if (!ms || isNaN(ms)) return '';
  const d = new Date(ms);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Analyze delivery pacing and release wave feasibility for a list of BOM items.
 *
 * @param {Array<object>} items - BOM items (may have sku, description, quantity, startDate, leadTime)
 * @param {object} [options={}]
 * @param {object} [options.catalogData=null] - Optional catalog JSON to enrich missing fields
 * @param {number} [options.waveGapThresholdDays=30] - Minimum start date gap (days) to trigger wave disparity
 * @param {number} [options.leadTimeBottleneckDays=21] - Lead time (days) threshold to flag pacing bottleneck
 * @returns {object} Pacing analysis result
 */
function analyzeDeliveryPacing(items = [], options = {}) {
  const waveGapThreshold = options.waveGapThresholdDays ?? 30;
  const leadTimeBottleneckThreshold = options.leadTimeBottleneckDays ?? 21;

  let catalogIndex = null;
  if (options.catalogData) {
    catalogIndex = buildCatalogSkuIndex(options.catalogData);
  }

  const enrichedItems = [];
  const datedItems = [];
  const leadTimeItems = [];

  for (const it of items) {
    const rawSku = it.sku || it['Product #'] || '';
    const clean = cleanBaseSKU(rawSku);
    const desc = it.description || it.Description || it['Product Description'] || '';
    const catEntry = catalogIndex ? catalogIndex.get(clean) : null;
    const skuData = catEntry?.skuData || {};

    const rawStartDate = it.startDate || it['Start Date'] || skuData['Start Date'] || '';
    const startMs = parseDateToMs(rawStartDate);

    const rawLeadTime = it.leadTime || it['Lead Time'] || it['Estimated Availability Lead Time'] || skuData['Lead Time'] || '';
    let leadDays = it.leadTimeDays ?? skuData.leadTimeDays ?? null;

    if (leadDays === null && rawLeadTime) {
      const match = String(rawLeadTime).match(/(\d+)/);
      if (match) {
        leadDays = parseInt(match[1], 10);
      }
    }

    const itemRecord = {
      sku: rawSku,
      cleanSku: clean,
      description: desc || skuData.Description || '',
      category: it.category || catEntry?.parentCategory || catEntry?.subCategory || '',
      startDate: startMs ? formatMsToDateStr(startMs) : null,
      startMs,
      leadTimeDays: leadDays,
      quantity: it.quantity || it.Qty || 1
    };

    enrichedItems.push(itemRecord);

    if (startMs !== null) {
      datedItems.push(itemRecord);
    }
    if (leadDays !== null && leadDays > 0) {
      leadTimeItems.push(itemRecord);
    }
  }

  // 1. Release Wave Gap Analysis
  let hasReleaseWaveGap = false;
  let releaseWaveGapDays = 0;
  let earliestStart = null;
  let latestStart = null;
  const wavePacingItems = [];

  // Filter dated items to focus on physical hardware (exclude software E-LTUs, subscriptions, and services)
  const hardwareDated = datedItems.filter(d => {
    const descLower = d.description.toLowerCase();
    const clean = d.cleanSku || '';
    const isSoftwareSku = clean.endsWith('AAE') || clean.startsWith('R7A') || clean.startsWith('E5Y') || clean.startsWith('S5E') || clean.startsWith('S2E');
    const isServiceOrSoftware = isServiceSku(clean) || isSoftwareSku ||
      descLower.includes('tech care') || descLower.includes('credit') ||
      descLower.includes('service') || descLower.includes('license') || descLower.includes('e-ltu') ||
      descLower.includes('compute ops') || descLower.includes('oneview') ||
      d.category.toLowerCase().includes('software') || d.category.toLowerCase().includes('service');
    return !isServiceOrSoftware;
  });

  if (hardwareDated.length >= 2) {
    hardwareDated.sort((a, b) => a.startMs - b.startMs);
    earliestStart = hardwareDated[0];
    latestStart = hardwareDated[hardwareDated.length - 1];

    const diffDays = Math.round((latestStart.startMs - earliestStart.startMs) / (1000 * 60 * 60 * 24));
    if (diffDays >= waveGapThreshold) {
      hasReleaseWaveGap = true;
      releaseWaveGapDays = diffDays;

      // Identify items that are in the later wave
      const cutoffMs = earliestStart.startMs + (waveGapThreshold * 24 * 60 * 60 * 1000);
      hardwareDated.filter(d => d.startMs >= cutoffMs).forEach(d => {
        if (!wavePacingItems.some(w => w.cleanSku === d.cleanSku)) {
          wavePacingItems.push(d);
        }
      });
    }
  }

  // 2. Lead Time Bottleneck Analysis
  let maxLeadTimeDays = 0;
  let leadTimeBottleneckItem = null;
  const leadPacingItems = [];

  if (leadTimeItems.length > 0) {
    leadTimeItems.sort((a, b) => b.leadTimeDays - a.leadTimeDays);
    maxLeadTimeDays = leadTimeItems[0].leadTimeDays;
    leadTimeBottleneckItem = leadTimeItems[0];

    leadTimeItems.filter(l => l.leadTimeDays >= leadTimeBottleneckThreshold).forEach(l => {
      if (!leadPacingItems.some(p => p.cleanSku === l.cleanSku)) {
        leadPacingItems.push(l);
      }
    });
  }

  // 3. Synthesize Advisories & UCID Recommendation
  const advisories = [];
  let recommendedUcidSplit = false;
  let ucidSplitReason = null;

  if (hasReleaseWaveGap && latestStart && earliestStart) {
    recommendedUcidSplit = true;
    ucidSplitReason = `Release Wave Disparity: ${latestStart.sku} (${latestStart.description}) has General Availability start date ${latestStart.startDate}, which is ${releaseWaveGapDays} days after ${earliestStart.sku} (${earliestStart.startDate}).`;
    advisories.push(
      `⏱️ [INV-177 / INV-180] Release Wave Disparity Detected: ${latestStart.sku} (${latestStart.description}) becomes available on ${latestStart.startDate} (+${releaseWaveGapDays} days after ${earliestStart.sku}). Bundling these in a single UCID will trigger Factory Assembly Lock and delay dispatch of the entire solution. Recommended Action: Partition into separate UCIDs / Order Icons (Wave 1 vs Wave 2).`
    );
  }

  if (leadTimeBottleneckItem && maxLeadTimeDays >= leadTimeBottleneckThreshold) {
    advisories.push(
      `⏱️ [INV-177] Pacing Item Bottleneck: ${leadTimeBottleneckItem.sku} (${leadTimeBottleneckItem.description}) has a factory lead time of ${maxLeadTimeDays} days, governing the entire solution delivery envelope. If immediate delivery is required, evaluate Fast-Ship alternatives or quote in a separate order icon.`
    );
  }

  return {
    hasPacingBottleneck: hasReleaseWaveGap || leadPacingItems.length > 0,
    hasReleaseWaveGap,
    releaseWaveGapDays,
    earliestStartDate: earliestStart?.startDate || null,
    latestStartDate: latestStart?.startDate || null,
    wavePacingItems,
    maxLeadTimeDays,
    leadTimeBottleneckItem,
    leadPacingItems,
    recommendedUcidSplit,
    ucidSplitReason,
    advisories,
    enrichedItems
  };
}

module.exports = {
  analyzeDeliveryPacing,
  parseDateToMs,
  formatMsToDateStr
};
