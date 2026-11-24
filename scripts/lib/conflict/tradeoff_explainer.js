'use strict';
/**
 * scripts/lib/conflict/tradeoff_explainer.js — Day-2 Runway & Marginal CapEx Trade-Off Scoring (INV-280)
 *
 * Computes nullable Day-2 expansion runway percentages (DIMM, PCIe, drive bays, PSU wattage)
 * and marginal trade-off deltas against baseline without ever fabricating missing CapEx or capacity.
 */

function _finiteNumber(val) {
  return typeof val === 'number' && Number.isFinite(val) ? val : null;
}

function _computeFreePct(used, total) {
  const u = _finiteNumber(used);
  const t = _finiteNumber(total);
  if (u === null || t === null || t <= 0 || u < 0) return null;
  const free = Math.max(0, t - u);
  return parseFloat(((free / t) * 100).toFixed(1));
}

function computeDay2Runway(candidate = {}, context = {}) {
  const profile = context.platformLimits || candidate.platformLimits || {};
  const dimmUsed = candidate.dimmCount ?? candidate.usedDimmSlots ?? candidate.memorySlotsUsed;
  const dimmMax = candidate.maxDimmSlots ?? profile.maxDimmSlots;
  const pcieUsed = candidate.pcieSlotsUsed ?? candidate.usedPcieSlots;
  const pcieMax = candidate.maxPcieSlots ?? profile.maxPcieSlots;
  const baysUsed = candidate.driveCount ?? candidate.usedDriveBays;
  const baysMax = candidate.maxDriveBays ?? profile.maxDriveBays;
  const nodeWatts = candidate.peakWatts ?? candidate.estimatedNodeWattage;
  const psuCapacityWatts = candidate.totalPsuCapacityWatts ?? candidate.maxPsuWattage;

  return {
    dimmSlotsFreePct: _computeFreePct(dimmUsed, dimmMax),
    pcieSlotsFreePct: _computeFreePct(pcieUsed, pcieMax),
    driveBaysFreePct: _computeFreePct(baysUsed, baysMax),
    psuWattageMarginPct: _computeFreePct(nodeWatts, psuCapacityWatts)
  };
}

function _extractComparableCostUsd(cand = {}) {
  if (cand.pricingComplete === false) return null;
  const candidates = [cand.estimatedCostUsd, cand.capexListUsd, cand.capexUsd, cand.totalCostUsd];
  for (const val of candidates) {
    if (typeof val === 'number' && Number.isFinite(val) && val >= 0) return val;
  }
  return null;
}

function _extractLeadTimeDays(cand = {}) {
  const candidates = [
    cand.supplyMetrics?.solutionEdtDays,
    cand.supplyMetrics?.maxLeadTimeDays,
    cand.maxLeadTimeDays,
    cand.leadTimeDays
  ];
  for (const val of candidates) {
    if (typeof val === 'number' && Number.isFinite(val) && val >= 0) return val;
  }
  return null;
}

function _extractSkuSet(cand = {}) {
  const list = cand.skuPartsList || cand.skuList || cand.candidateBom || cand.items || [];
  const set = new Set();
  for (const part of list) {
    const s = String(part?.sku || part?.['Product #'] || '').trim().toUpperCase();
    if (s) set.add(s);
  }
  return set;
}

function _buildTradeOffSummary(isBaseline, capExDeltaUsd, capExDeltaPct, addedCapabilities, sacrificedCapabilities) {
  if (isBaseline) return 'Baseline customer intent reference.';
  const costText = capExDeltaUsd === null
    ? 'Pricing incomplete — CapEx delta unmeasured (null)'
    : `${capExDeltaUsd >= 0 ? '+' : '-'}$${Math.abs(capExDeltaUsd).toLocaleString()} (${capExDeltaPct >= 0 ? '+' : ''}${capExDeltaPct}%)`;
  const parts = [costText];
  if (addedCapabilities.length > 0) parts.push(`gains: ${addedCapabilities.slice(0, 3).join(', ')}`);
  if (sacrificedCapabilities.length > 0) parts.push(`trades off: ${sacrificedCapabilities.slice(0, 3).join(', ')}`);
  return parts.join('; ');
}

function computeCandidateRunwayAndTradeOffs(candidates = [], context = {}) {
  if (!Array.isArray(candidates) || candidates.length === 0) return [];
  const baseline = candidates.find(c =>
    c?.strategyId === 'STRATEGY_CLOSEST_INTENT' ||
    c?.strategyIdentity === 'STRATEGY_CLOSEST_INTENT' ||
    (context.baselineId && (c?.candidateId === context.baselineId || c?.platform === context.baselineId)) ||
    c?.rank === 1
  ) || candidates[0];

  const baselineId = baseline.strategyId || baseline.candidateId || baseline.platform || baseline.name || 'BASELINE';
  const baseCost = _extractComparableCostUsd(baseline);
  const baseLead = _extractLeadTimeDays(baseline);
  const baseSkus = _extractSkuSet(baseline);

  const enriched = candidates.map(cand => {
    const isBaseline = cand === baseline;
    const day2Runway = cand.day2Runway || computeDay2Runway(cand, context);
    const candCost = _extractComparableCostUsd(cand);
    const candLead = _extractLeadTimeDays(cand);

    let capExDeltaUsd = null;
    let capExDeltaPct = null;
    if (isBaseline && baseCost !== null) {
      capExDeltaUsd = 0;
      capExDeltaPct = 0;
    } else if (!isBaseline && baseCost !== null && candCost !== null) {
      capExDeltaUsd = Number((candCost - baseCost).toFixed(2));
      capExDeltaPct = baseCost > 0 ? Number(((capExDeltaUsd / baseCost) * 100).toFixed(1)) : null;
    }

    const leadTimeDeltaDays = (baseLead !== null && candLead !== null) ? Number((candLead - baseLead).toFixed(1)) : null;
    const candSkus = _extractSkuSet(cand);
    const addedCapabilities = [...candSkus].filter(s => !baseSkus.has(s));
    const sacrificedCapabilities = [...baseSkus].filter(s => !candSkus.has(s));

    if (leadTimeDeltaDays !== null && leadTimeDeltaDays < 0) addedCapabilities.push(`${Math.abs(leadTimeDeltaDays)}d faster delivery`);
    if (cand.hasDowngradedComponents) sacrificedCapabilities.push('Down-tiered performance/redundancy envelope');

    const tradeOffVsBaseline = {
      baselineId,
      capExDeltaUsd,
      capExDeltaPct,
      leadTimeDeltaDays,
      addedCapabilities,
      sacrificedCapabilities,
      summary: _buildTradeOffSummary(isBaseline, capExDeltaUsd, capExDeltaPct, addedCapabilities, sacrificedCapabilities)
    };

    return {
      ...cand,
      day2Runway,
      tradeOffVsBaseline
    };
  });

  // Preserve custom array metadata properties (e.g. paretoFrontier, evaluatedCandidateSet)
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(candidates))) {
    if (key === 'length' || /^\d+$/.test(key)) continue;
    Object.defineProperty(enriched, key, descriptor);
  }
  return enriched;
}

module.exports = {
  computeDay2Runway,
  computeCandidateRunwayAndTradeOffs
};
