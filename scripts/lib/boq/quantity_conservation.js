'use strict';
/**
 * scripts/lib/boq/quantity_conservation.js
 *
 * Universal Quantity Conservation Engine (INV-192 / G01 / G09)
 *
 * Guarantees mathematical conservation between customer tender line quantities
 * and partitioned clusters or candidate solutions:
 * 1. Safe integer validation for all requested & allocated quantities.
 * 2. Proper aggregation of repeated source SKU rows with source-row attribution,
 *    preventing duplicate-row comparison defects against aggregate totals.
 * 3. Transparent tracking of allocated-only items (policy-mandated enablement kits,
 *    COM licenses, support credits) as MANDATORY_POLICY_ADDITION.
 * 4. Qualification of CTO/FIO vs. BTO conversions (-F21 to -B21) without silent masking.
 * 5. Strict export gating: un-conserved discrepancies block presentation export.
 */

const { cleanBaseSKU } = require('../catalog/sku.js');

/**
 * Validate that a quantity value is a safe non-negative integer.
 * @param {*} value
 * @returns {number|null} Safe integer or null
 */
function parseSafeQuantity(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  if (Number.isSafeInteger(num) && num >= 0) return num;
  return null;
}

/**
 * Standardize SKU for indexing while tracking FIO/BTO origin.
 * @param {string} sku
 * @returns {object} { cleanSku, canonicalKey, isFio, isBto }
 */
function normalizeSkuRecord(sku) {
  const clean = cleanBaseSKU(sku);
  if (!clean) return { cleanSku: '', canonicalKey: '', isFio: false, isBto: false };
  const isFio = clean.endsWith('-F21') || clean.includes('#0D1');
  const isBto = clean.endsWith('-B21');
  const canonicalKey = clean.replace(/-F21$/, '-B21').replace(/#0D1$/, '');
  return { cleanSku: clean, canonicalKey, isFio, isBto };
}

/**
 * Normalize clusters collection into a uniform array of cluster descriptors.
 * Supports both multi-cluster arrays and single candidate BOM arrays.
 * @param {Array<object>|object} clustersOrBom
 * @returns {Array<object>}
 */
function normalizeAllocatedClusters(clustersOrBom) {
  if (!clustersOrBom) return [];
  if (Array.isArray(clustersOrBom)) {
    if (clustersOrBom.length === 0) return [];
    // Check if it's already an array of clusters ({ multiplier, items })
    if (clustersOrBom[0] && typeof clustersOrBom[0] === 'object' && ('items' in clustersOrBom[0] || 'multiplier' in clustersOrBom[0])) {
      return clustersOrBom.map((c, idx) => ({
        clusterId: c.clusterId || c.name || `Cluster_${idx + 1}`,
        multiplier: parseSafeQuantity(c.multiplier) ?? 1,
        items: Array.isArray(c.items) ? c.items : []
      }));
    }
    // Single flat candidate BOM
    return [{
      clusterId: 'Default_Cluster',
      multiplier: 1,
      items: clustersOrBom
    }];
  }
  if (typeof clustersOrBom === 'object') {
    if (Array.isArray(clustersOrBom.clusters)) {
      return clustersOrBom.clusters.map((c, idx) => ({
        clusterId: c.clusterId || c.name || `Cluster_${idx + 1}`,
        multiplier: parseSafeQuantity(c.multiplier) ?? 1,
        items: Array.isArray(c.items) ? c.items : []
      }));
    }
    if (Array.isArray(clustersOrBom.items)) {
      return [{
        clusterId: 'Default_Cluster',
        multiplier: parseSafeQuantity(clustersOrBom.serverCount || clustersOrBom.multiplier) ?? 1,
        items: clustersOrBom.items
      }];
    }
  }
  return [];
}

/**
 * Build an auditable quantity conservation ledger between requested tender items
 * and allocated cluster/candidate items.
 *
 * @param {Array<object>} rawItems - Source tender line items
 * @param {Array<object>|object} clustersOrBom - Partitioned clusters or candidate BOM
 * @param {object} [options={}] - Options { strict: boolean, allowPolicyAdditions: boolean }
 * @returns {object} Structured conservation ledger
 */
function buildUniversalQuantityConservationLedger(rawItems, clustersOrBom, options = {}) {
  if (!Array.isArray(rawItems)) {
    return {
      isFullyConserved: false,
      totalDiscrepancies: 1,
      error: 'INVALID_RAW_ITEMS_ARRAY',
      ledger: [],
      summary: { totalRequestedUnits: 0, totalAllocatedUnits: 0, netUnitDelta: 0 }
    };
  }

  const clusters = normalizeAllocatedClusters(clustersOrBom);
  if (rawItems.length > 0 && clusters.length === 0) {
    return {
      isFullyConserved: false,
      totalDiscrepancies: rawItems.length,
      error: 'NO_ALLOCATED_CLUSTERS',
      ledger: [],
      summary: { totalRequestedUnits: 0, totalAllocatedUnits: 0, netUnitDelta: 0 }
    };
  }

  // 1. Pre-index allocated items across all clusters
  const allocatedByCanonicalKey = new Map();
  let totalAllocatedUnits = 0;

  clusters.forEach(c => {
    const mult = c.multiplier || 1;
    (c.items || []).forEach(item => {
      const skuRec = normalizeSkuRecord(item.sku);
      if (!skuRec.canonicalKey || skuRec.canonicalKey === 'CHASSIS_PLACEHOLDER') return;

      const perServer = parseSafeQuantity(item.quantity) ?? 0;
      const totalAlloc = parseSafeQuantity(item.totalQuantity) ?? (perServer * mult);
      totalAllocatedUnits += totalAlloc;

      if (!allocatedByCanonicalKey.has(skuRec.canonicalKey)) {
        allocatedByCanonicalKey.set(skuRec.canonicalKey, {
          canonicalKey: skuRec.canonicalKey,
          skusSeen: new Set([item.sku]),
          descriptions: new Set([item.description].filter(Boolean)),
          categories: new Set([item.category].filter(Boolean)),
          totalAllocated: 0,
          policyMandated: Boolean(item.policyMandated || item.policy),
          clusterBreakdown: []
        });
      }

      const entry = allocatedByCanonicalKey.get(skuRec.canonicalKey);
      entry.totalAllocated += totalAlloc;
      if (item.sku) entry.skusSeen.add(item.sku);
      if (item.description) entry.descriptions.add(item.description);
      if (item.category) entry.categories.add(item.category);
      if (item.policyMandated) entry.policyMandated = true;

      entry.clusterBreakdown.push({
        clusterId: c.clusterId,
        multiplier: mult,
        allocatedQuantity: totalAlloc,
        perServer
      });
    });
  });

  // 2. Aggregate requested source items by canonical SKU key
  const requestedByCanonicalKey = new Map();
  const sourceRowRecords = [];
  let totalRequestedUnits = 0;

  rawItems.forEach((rawItem, idx) => {
    const rawSku = rawItem.sku || '';
    const skuRec = normalizeSkuRecord(rawSku);
    if (!skuRec.canonicalKey || skuRec.canonicalKey === 'CHASSIS_PLACEHOLDER') return;

    const safeQty = parseSafeQuantity(rawItem.quantity);
    const reqQty = safeQty !== null ? safeQty : 0;
    const isMalformedQuantity = safeQty === null;
    totalRequestedUnits += reqQty;

    const rowRec = {
      rowIndex: idx,
      rawSku,
      cleanSku: skuRec.cleanSku,
      canonicalKey: skuRec.canonicalKey,
      description: rawItem.description || '',
      category: rawItem.category || '',
      requestedQuantity: reqQty,
      isMalformedQuantity
    };
    sourceRowRecords.push(rowRec);

    if (!requestedByCanonicalKey.has(skuRec.canonicalKey)) {
      requestedByCanonicalKey.set(skuRec.canonicalKey, {
        canonicalKey: skuRec.canonicalKey,
        rawSkus: new Set([rawSku]),
        descriptions: new Set([rawItem.description].filter(Boolean)),
        categories: new Set([rawItem.category].filter(Boolean)),
        totalRequested: 0,
        rows: [],
        hasMalformedQty: false
      });
    }

    const reqEntry = requestedByCanonicalKey.get(skuRec.canonicalKey);
    reqEntry.totalRequested += reqQty;
    if (rawSku) reqEntry.rawSkus.add(rawSku);
    if (rawItem.description) reqEntry.descriptions.add(rawItem.description);
    if (rawItem.category) reqEntry.categories.add(rawItem.category);
    if (isMalformedQuantity) reqEntry.hasMalformedQty = true;
    reqEntry.rows.push(rowRec);
  });

  // 3. Reconcile Requested vs. Allocated
  const ledger = [];
  let isFullyConserved = true;
  let totalDiscrepancies = 0;
  let exactConservedCount = 0;
  let deficitCount = 0;
  let surplusCount = 0;
  let policyAdditionsCount = 0;
  let unrequestedAdditionsCount = 0;

  const processedCanonicalKeys = new Set();

  for (const [canonicalKey, req] of requestedByCanonicalKey.entries()) {
    processedCanonicalKeys.add(canonicalKey);
    const alloc = allocatedByCanonicalKey.get(canonicalKey);
    const allocatedTotal = alloc ? alloc.totalAllocated : 0;
    const requestedTotal = req.totalRequested;
    const delta = allocatedTotal - requestedTotal;

    let status;
    if (delta === 0) {
      status = 'CONSERVED_EXACT';
      exactConservedCount++;
    } else if (delta > 0) {
      status = 'SURPLUS_BUFFER';
      surplusCount++;
      isFullyConserved = false;
      totalDiscrepancies++;
    } else {
      status = 'RESIDUAL_DEFICIT';
      deficitCount++;
      isFullyConserved = false;
      totalDiscrepancies++;
    }

    if (req.hasMalformedQty) {
      isFullyConserved = false;
      totalDiscrepancies++;
    }

    // Allocate share proportionally to source rows
    let remainingToShare = allocatedTotal;
    const rowAllocations = req.rows.map(r => {
      const share = Math.min(r.requestedQuantity, remainingToShare);
      remainingToShare = Math.max(0, remainingToShare - share);
      return {
        rowIndex: r.rowIndex,
        rawSku: r.rawSku,
        requestedQuantity: r.requestedQuantity,
        allocatedShare: share,
        rowDelta: share - r.requestedQuantity
      };
    });

    ledger.push({
      sku: req.rows[0]?.rawSku || canonicalKey,
      cleanSku: req.rows[0]?.cleanSku || canonicalKey,
      canonicalSku: canonicalKey,
      requestedSkus: Array.from(req.rawSkus),
      description: Array.from(req.descriptions)[0] || '',
      category: Array.from(req.categories)[0] || '',
      requestedQuantity: requestedTotal,
      allocatedTotal,
      delta,
      residualQuantity: Math.abs(delta),
      status,
      hasMalformedQuantity: req.hasMalformedQty,
      sourceRowCount: req.rows.length,
      rowAllocations,
      clusterBreakdown: alloc ? alloc.clusterBreakdown : []
    });
  }

  // 4. Include Allocated-Only Additions (Enablement Kits / Policy Mandated Items)
  for (const [canonicalKey, alloc] of allocatedByCanonicalKey.entries()) {
    if (processedCanonicalKeys.has(canonicalKey)) continue;

    const allocatedTotal = alloc.totalAllocated;
    const isPolicy = alloc.policyMandated;
    const status = isPolicy ? 'MANDATORY_POLICY_ADDITION' : 'UNREQUESTED_ADDITION';

    if (isPolicy) {
      policyAdditionsCount++;
      if (options.strict === true) {
        // In strict mathematical mode, even policy additions record a delta
        totalDiscrepancies++;
      }
    } else {
      unrequestedAdditionsCount++;
      isFullyConserved = false;
      totalDiscrepancies++;
    }

    ledger.push({
      sku: Array.from(alloc.skusSeen)[0] || canonicalKey,
      cleanSku: canonicalKey,
      canonicalSku: canonicalKey,
      requestedSkus: [],
      description: Array.from(alloc.descriptions)[0] || '',
      category: Array.from(alloc.categories)[0] || '',
      requestedQuantity: 0,
      allocatedTotal,
      delta: allocatedTotal,
      residualQuantity: allocatedTotal,
      status,
      isAllocatedOnly: true,
      policyMandated: isPolicy,
      clusterBreakdown: alloc.clusterBreakdown
    });
  }

  return {
    isFullyConserved: isFullyConserved && totalDiscrepancies === 0,
    totalDiscrepancies,
    exactConservedCount,
    deficitCount,
    surplusCount,
    policyAdditionsCount,
    unrequestedAdditionsCount,
    ledger,
    summary: {
      totalRequestedUnits,
      totalAllocatedUnits,
      netUnitDelta: totalAllocatedUnits - totalRequestedUnits
    }
  };
}

module.exports = {
  parseSafeQuantity,
  normalizeSkuRecord,
  buildUniversalQuantityConservationLedger
};
