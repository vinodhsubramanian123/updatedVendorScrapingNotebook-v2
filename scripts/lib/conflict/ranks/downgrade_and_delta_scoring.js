'use strict';
/**
 * scripts/lib/conflict/ranks/downgrade_and_delta_scoring.js — Capability Downgrades, Architectural Delta, Ranking & Normalization
 */

const { cleanBaseSKU } = require('../../catalog/sku.js');
const { validateNumaMemoryTopology } = require('../workload_dna.js');
const { extractComponentAttributes, scoreReplacementCandidate } = require('../least_delta_combinator.js');
const { rankQualifiedCandidatesDeterministically, computeParetoFrontier } = require('../sizing/pareto_ranker.js');
const { calculateSupplyMetrics } = require('./supply_and_pricing.js');
const { computeBomFingerprint } = require('./candidate_revalidator.js');

function _checkCacheDowngrade(reqDesc, candDescriptions) {
  if (reqDesc.includes('8gb') && reqDesc.includes('cache')) {
    const has8GbInCand = candDescriptions.some(d => d.includes('8gb') && d.includes('cache'));
    const has4GbInCand = candDescriptions.some(d => d.includes('4gb') && d.includes('cache'));
    if (!has8GbInCand && has4GbInCand) return 2.5;
  }
  return 0;
}

function _checkNetworkDowngrade(reqDesc, candDescriptions) {
  if (reqDesc.includes('100gb') || reqDesc.includes('100gbe')) {
    const has100InCand = candDescriptions.some(d => d.includes('100gb') || d.includes('100gbe'));
    const hasLowerInCand = candDescriptions.some(d => (d.includes('25gb') || d.includes('10gb')) && d.includes('adapter'));
    if (!has100InCand && hasLowerInCand) return 4.0;
  }
  return 0;
}

function _checkPsuDowngrade(reqDesc, candDescriptions) {
  if (reqDesc.includes('titanium') && reqDesc.includes('psu')) {
    const hasTitn = candDescriptions.some(d => d.includes('titanium'));
    const hasPlat = candDescriptions.some(d => d.includes('platinum'));
    if (!hasTitn && hasPlat) return 1.5;
  }
  return 0;
}

function _checkCpuDowngrade(reqDesc, candDescriptions) {
  const isCpu = reqDesc.includes('intel') || reqDesc.includes('xeon') || reqDesc.includes('epyc') || reqDesc.includes('processor');
  if (!isCpu) return 0;
  let penalty = 0;
  if (reqDesc.includes('platinum')) {
    const hasPlat = candDescriptions.some(d => d.includes('platinum'));
    const hasLower = candDescriptions.some(d => (d.includes('gold') || d.includes('silver') || d.includes('bronze')) && d.includes('processor'));
    if (!hasPlat && hasLower) penalty += 5.0;
  } else if (reqDesc.includes('gold')) {
    const hasGoldOrHigher = candDescriptions.some(d => (d.includes('gold') || d.includes('platinum')) && d.includes('processor'));
    const hasLower = candDescriptions.some(d => (d.includes('silver') || d.includes('bronze')) && d.includes('processor'));
    if (!hasGoldOrHigher && hasLower) penalty += 3.5;
  }

  const reqCores = reqDesc.match(/\b(\d{1,3})\s*-?\s*cores?\b/i);
  if (reqCores) {
    const targetCores = parseInt(reqCores[1], 10);
    const candMaxCores = candDescriptions.reduce((mx, d) => {
      if (!/xeon|epyc|processor/i.test(d)) return mx;
      const m = d.match(/\b(\d{1,3})\s*-?\s*cores?\b/i);
      return m ? Math.max(mx, parseInt(m[1], 10)) : mx;
    }, 0);
    if (candMaxCores > 0 && candMaxCores < targetCores * 0.8) penalty += 3.0;
  }
  return penalty;
}

function _checkMemoryDowngrade(reqDesc, candDescriptions) {
  let penalty = 0;
  if (reqDesc.includes('ddr5')) {
    const hasDdr5 = candDescriptions.some(d => d.includes('ddr5'));
    const hasDdr4 = candDescriptions.some(d => d.includes('ddr4'));
    if (!hasDdr5 && hasDdr4) penalty += 6.0;
  }
  const reqMts = reqDesc.match(/(?:ddr5[-\s]?|pc5[-\s]?)(\d{4})/i);
  if (reqMts) {
    const targetMts = parseInt(reqMts[1], 10);
    const candMaxMts = candDescriptions.reduce((mx, d) => {
      const m = d.match(/(?:ddr5[-\s]?|pc5[-\s]?)(\d{4})/i);
      return m ? Math.max(mx, parseInt(m[1], 10)) : mx;
    }, 0);
    if (candMaxMts > 0 && candMaxMts < targetMts) penalty += 1.5;
  }
  return penalty;
}

function _checkGpuDowngrade(reqDesc, candDescriptions) {
  let penalty = 0;
  if (reqDesc.includes('h100') || reqDesc.includes('h200') || reqDesc.includes('a100') || reqDesc.includes('b200')) {
    const hasHighTier = candDescriptions.some(d => d.includes('h100') || d.includes('h200') || d.includes('a100') || d.includes('b200'));
    const hasLowerTier = candDescriptions.some(d => (d.includes('l4') || d.includes('t4') || d.includes('l40')) && (d.includes('accelerator') || d.includes('gpu') || d.includes('nvidia')));
    if (!hasHighTier && hasLowerTier) penalty += 5.0;
  }
  if (reqDesc.includes('nvlink') || reqDesc.includes('nvl') || reqDesc.includes('sxm')) {
    const hasNvlink = candDescriptions.some(d => d.includes('nvlink') || d.includes('nvl') || d.includes('sxm'));
    const hasAnyGpu = candDescriptions.some(d => d.includes('nvidia') || d.includes('gpu') || d.includes('accelerator'));
    if (hasAnyGpu && !hasNvlink) penalty += 4.0;
  }
  return penalty;
}

function computeCapabilityDowngradePenalty(cand, items) {
  let penalty = 0;
  const candDescriptions = (cand.skuPartsList || []).map(p => (p.description || '').toLowerCase());
  for (const it of (items || [])) {
    const reqDesc = (it.description || '').toLowerCase();
    penalty += _checkCacheDowngrade(reqDesc, candDescriptions);
    penalty += _checkNetworkDowngrade(reqDesc, candDescriptions);
    penalty += _checkPsuDowngrade(reqDesc, candDescriptions);
    penalty += _checkCpuDowngrade(reqDesc, candDescriptions);
    penalty += _checkMemoryDowngrade(reqDesc, candDescriptions);
    penalty += _checkGpuDowngrade(reqDesc, candDescriptions);
  }
  const reqNuma = validateNumaMemoryTopology(items || []);
  const candNuma = validateNumaMemoryTopology(cand.skuPartsList || []);
  if (reqNuma.isBalancedInterleaving && !candNuma.isBalancedInterleaving && candNuma.dimmCount > 0) {
    penalty += 1.5;
  }
  return parseFloat(penalty.toFixed(2));
}

const CATEGORY_WEIGHT_RULES = [
  [/chassis|base/i, 10.0],
  [/processor|cpu|xeon|epyc/i, 8.0],
  [/gpu|accelerator|nvidia|h100|h200|l40|rtx/i, 8.0],
  [/memory|dimm|ram/i, 5.0],
  [/controller|storage|ssd|hdd|nvme/i, 4.0],
  [/network|adapter|ocp|nic|hba/i, 3.0],
  [/power|psu/i, 2.0],
  [/cable|bracket|enablement|kit|fan|heatsink/i, 0.2]
];

function _getCategoryArchitecturalWeight(cat = '') {
  const s = String(cat || '');
  for (const [rx, weight] of CATEGORY_WEIGHT_RULES) {
    if (rx.test(s)) return weight;
  }
  return 0.5;
}

function _computeEquivalenceReplacementCredit(requestedQuantities, candidateQuantities, origPartInfo, candPartInfo) {
  if (!origPartInfo || !candPartInfo) return 0;
  const unmatchedReq = [];
  const unmatchedCand = [];
  for (const [sku, qReq] of requestedQuantities.entries()) {
    const qCand = candidateQuantities.get(sku) || 0;
    if (qReq > qCand && origPartInfo.has(sku)) unmatchedReq.push({ sku, qty: qReq - qCand, info: origPartInfo.get(sku) });
  }
  for (const [sku, qCand] of candidateQuantities.entries()) {
    const qReq = requestedQuantities.get(sku) || 0;
    if (qCand > qReq && candPartInfo.has(sku)) unmatchedCand.push({ sku, qty: qCand - qReq, info: candPartInfo.get(sku) });
  }
  let credit = 0;
  const usedCand = new Set();
  for (const r of unmatchedReq) {
    const origAttrs = extractComponentAttributes(r.info.description, r.sku, r.info.category);
    if (origAttrs.componentCategory === 'UNKNOWN') continue;
    let bestIdx = -1;
    let bestScore = 0;
    unmatchedCand.forEach((c, idx) => {
      if (usedCand.has(idx)) return;
      const eqScore = scoreReplacementCandidate({ sku: c.sku, description: c.info.description, price: c.info.unitPriceUsd || 0 }, origAttrs, r.info.unitPriceUsd || 0);
      if (eqScore > bestScore) { bestScore = eqScore; bestIdx = idx; }
    });
    if (bestIdx !== -1 && bestScore >= 60) {
      usedCand.add(bestIdx);
      const pairedQty = Math.min(r.qty, unmatchedCand[bestIdx].qty);
      const weight = _getCategoryArchitecturalWeight(String(r.info.category || '').toLowerCase());
      credit += pairedQty * weight * 1.65;
    }
  }
  return credit;
}

function computeArchitecturalDelta(requestedQuantities, candidateQuantities, partCategoryMap = new Map(), origPartInfo = null, candPartInfo = null) {
  const allSkus = new Set([...requestedQuantities.keys(), ...candidateQuantities.keys()]);
  let totalWeightedDelta = 0;
  for (const sku of allSkus) {
    const diff = Math.abs((requestedQuantities.get(sku) || 0) - (candidateQuantities.get(sku) || 0));
    if (diff === 0) continue;
    totalWeightedDelta += diff * _getCategoryArchitecturalWeight(String(partCategoryMap.get(sku) || '').toLowerCase());
  }
  const eqCredit = _computeEquivalenceReplacementCredit(requestedQuantities, candidateQuantities, origPartInfo, candPartInfo);
  return parseFloat(Math.max(0, totalWeightedDelta - eqCredit).toFixed(2));
}

function _indexRequestedQuantities(items) {
  const requestedSkuSet = new Set((items || []).map(it => cleanBaseSKU(it.sku)).filter(Boolean));
  const requestedQuantities = new Map();
  const baseCategoryMap = new Map();
  for (const it of (items || [])) {
    const k = cleanBaseSKU(it.sku);
    if (!k) continue;
    const q = (typeof it.quantity === 'number' && Number.isFinite(it.quantity)) ? it.quantity : (Number(it.quantity) || 1);
    requestedQuantities.set(k, (requestedQuantities.get(k) || 0) + q);
    if (it.category) baseCategoryMap.set(k, it.category);
  }
  return { requestedSkuSet, requestedQuantities, baseCategoryMap };
}

function _scoreCandidateMetrics(cand, requestedSkuSet, requestedQuantities, baseCategoryMap, resolveSupply, items, globalItems) {
  cand.strategyIdentity = cand.strategyIdentity || cand.name;
  const candSkuSet = new Set((cand.skuPartsList || []).map(p => cleanBaseSKU(p.sku)).filter(Boolean));
  let matchedUniqueCount = 0;
  for (const sku of requestedSkuSet) if (candSkuSet.has(sku)) matchedUniqueCount++;
  const matchRatio = requestedSkuSet.size > 0 ? (matchedUniqueCount / requestedSkuSet.size) : 1.0;
  cand.intentMatchRatio = parseFloat(Math.min(1.0, Math.max(0.0, matchRatio)).toFixed(2));
  cand.dynamicScore = parseFloat(((cand.intentMatchRatio * 0.6) + (cand.score * 0.4)).toFixed(2));
  cand.supplyMetrics = calculateSupplyMetrics([...(cand.skuPartsList || []), ...globalItems], resolveSupply);

  const origPartInfo = new Map();
  for (const it of (items || [])) {
    const k = cleanBaseSKU(it.sku);
    if (k && !origPartInfo.has(k)) origPartInfo.set(k, it);
  }

  const candidateCategoryMap = new Map(baseCategoryMap);
  const candidateQuantities = new Map();
  const candPartInfo = new Map();
  for (const it of (cand.skuPartsList || [])) {
    const k = cleanBaseSKU(it.sku);
    if (!k) continue;
    const q = (typeof it.quantity === 'number' && Number.isFinite(it.quantity)) ? it.quantity : (Number(it.quantity) || 1);
    candidateQuantities.set(k, (candidateQuantities.get(k) || 0) + q);
    if (!candPartInfo.has(k)) candPartInfo.set(k, it);
    if (it.category && !candidateCategoryMap.has(k)) candidateCategoryMap.set(k, it.category);
  }
  cand.quantityDelta = [...new Set([...requestedQuantities.keys(), ...candidateQuantities.keys()])]
    .reduce((sum, sku) => sum + Math.abs((requestedQuantities.get(sku) || 0) - (candidateQuantities.get(sku) || 0)), 0);
  cand.architecturalDelta = computeArchitecturalDelta(requestedQuantities, candidateQuantities, candidateCategoryMap, origPartInfo, candPartInfo);
  cand.capabilityDowngradePenalty = computeCapabilityDowngradePenalty(cand, items);
}

function _compareCandidateTieBreakers(a, b) {
  if (a.supplyMetrics.unavailableCount !== b.supplyMetrics.unavailableCount) return a.supplyMetrics.unavailableCount - b.supplyMetrics.unavailableCount;
  const leadA = a.supplyMetrics.solutionEdtDays ?? Number.POSITIVE_INFINITY;
  const leadB = b.supplyMetrics.solutionEdtDays ?? Number.POSITIVE_INFINITY;
  if (leadA !== leadB) return leadA - leadB;
  if (Boolean(a.availabilityPreference) !== Boolean(b.availabilityPreference)) return a.availabilityPreference ? -1 : 1;
  const nameDiff = (a.strategyIdentity || a.name || '').localeCompare(b.strategyIdentity || b.name || '');
  return nameDiff !== 0 ? nameDiff : (a.bomFingerprint || '').localeCompare(b.bomFingerprint || '');
}

function _compareNumAsc(a, b) {
  return a === b ? 0 : a - b;
}

function _compareCandidateRanks(a, b) {
  const qualA = a.qualifiedForRecommendation !== false && a.physicalMathClean === true;
  const qualB = b.qualifiedForRecommendation !== false && b.physicalMathClean === true;
  if (qualA !== qualB) return qualA ? -1 : 1;
  if (Boolean(a.physicalMathClean) !== Boolean(b.physicalMathClean)) return a.physicalMathClean ? -1 : 1;
  const primary = _compareNumAsc(a.capabilityDowngradePenalty, b.capabilityDowngradePenalty) ||
    _compareNumAsc(a.changedSkuLines || 0, b.changedSkuLines || 0) ||
    _compareNumAsc(a.quantityDelta, b.quantityDelta) ||
    _compareNumAsc(a.architecturalDelta, b.architecturalDelta) ||
    _compareNumAsc(b.dynamicScore, a.dynamicScore);
  return primary !== 0 ? primary : _compareCandidateTieBreakers(a, b);
}

function _annotatePreRankingQualification(rawCandidates, items, options = {}) {
  rawCandidates.forEach(cand => {
    const rankedSingle = rankQualifiedCandidatesDeterministically([cand], {
      ...options,
      baselineItems: items,
      enforcePhysicalMath: options.enforcePhysicalMath !== false
    });
    const evaluated = rankedSingle.allCandidatesOrdered[0];
    cand.qualifiedForRecommendation = evaluated ? evaluated.qualifiedForRecommendation : true;
    cand.disqualificationReasons = evaluated ? evaluated.disqualificationReasons : [];
    cand.changedSkuLines = evaluated ? evaluated.changedSkuLines : 0;
    cand.changedUnits = evaluated ? evaluated.changedUnits : (cand.quantityDelta || 0);
  });
}

function _promoteFastShipToRank2IfEligible(rawCandidates) {
  const fsIdx = rawCandidates.findIndex(
    (c, idx) => idx > 0 && c.isFastShipRank2 && c.physicalMathClean === true && c.qualifiedForRecommendation !== false
  );
  if (fsIdx > 1 && rawCandidates[0]?.qualifiedForRecommendation !== false) {
    const [fsCand] = rawCandidates.splice(fsIdx, 1);
    rawCandidates.splice(1, 0, fsCand);
  }
}

function scoreAndSortCandidates(rawCandidates, items, resolveSupply = () => ({ leadTimeDays: null, availability: 'Unknown' }), options = {}) {
  const { requestedSkuSet, requestedQuantities, baseCategoryMap } = _indexRequestedQuantities(items);
  rawCandidates.forEach(cand => {
    _scoreCandidateMetrics(cand, requestedSkuSet, requestedQuantities, baseCategoryMap, resolveSupply, items, options.availabilityGlobalItems || []);
  });
  _annotatePreRankingQualification(rawCandidates, items, options);
  rawCandidates.sort(_compareCandidateRanks);
  if (options?.prioritizeFastShipAsRank2) _promoteFastShipToRank2IfEligible(rawCandidates);
  return requestedSkuSet;
}

function includeAvailabilityRecommendations(closest, ranked) {
  const availability = ['CLOSEST_MATCH', 'FASTEST'].map(preference => ranked.find(candidate =>
    candidate.availabilityPreference === preference && candidate.physicalMathClean === true && candidate.isUniqueBom !== false
  )).filter(Boolean);
  return [...new Set([...closest.slice(0, 1), ...availability, ...closest.slice(1)])].slice(0, 3);
}

function _normalizeCandidatePartsPricing(cand, priceResolver) {
  const unavailable = [];
  cand.skuPartsList = cand.skuPartsList.map(part => {
    const priceKnown = typeof priceResolver?.hasPrice === 'function'
      ? priceResolver.hasPrice(part.sku)
      : part.priceKnown !== false && Number(part.unitPriceUsd) > 0;
    if (!priceKnown) unavailable.push(cleanBaseSKU(part.sku));
    return {
      ...part,
      priceKnown,
      pricingStatus: priceKnown
        ? (typeof priceResolver?.status === 'function' ? priceResolver.status(part.sku) : (part.pricingStatus || 'CATALOG_PRICE'))
        : 'PRICE_UNAVAILABLE'
    };
  });
  cand.priceUnavailableSkus = Array.from(new Set(unavailable.filter(Boolean)));
  cand.pricingComplete = cand.priceUnavailableSkus.length === 0;
  cand.strategyId = cand.strategyId || cand.strategyIdentity || cand.name;
  cand.strategyIdentity = cand.strategyId;
}

function _assignBomFingerprintAndUniqueness(cand, seenFp) {
  const fp = cand.bomFingerprint || computeBomFingerprint(cand.skuPartsList);
  cand.bomFingerprint = fp;
  if (seenFp.has(fp)) {
    cand.isUniqueBom = false;
    cand.duplicateOfRank = seenFp.get(fp);
    cand.isParetoOptimal = false;
  } else {
    seenFp.set(fp, cand.rank);
    cand.isUniqueBom = true;
    cand.isParetoOptimal = true;
  }
}

function _computeCandidateEditDistance(candPartMap, addedSkus, omittedSkus, quantityDelta) {
  let weightedEditDistance = 0;
  addedSkus.forEach(s => {
    const cat = (candPartMap.get(s)?.category || '').toLowerCase();
    if (cat.includes('gpu') || cat.includes('accelerator') || cat.includes('processor') || cat.includes('cpu') || cat.includes('memory') || cat.includes('controller') || cat.includes('power supply')) weightedEditDistance += 1.0;
    else if (cat.includes('storage') || cat.includes('drive') || cat.includes('network') || cat.includes('nic')) weightedEditDistance += 0.6;
    else if (cat.includes('cable') || cat.includes('bracket') || cat.includes('enablement') || cat.includes('fix')) weightedEditDistance += 0.2;
    else weightedEditDistance += 0.1;
  });
  omittedSkus.forEach(() => { weightedEditDistance += 0.8; });
  return parseFloat((weightedEditDistance + (quantityDelta || 0)).toFixed(2));
}

function _buildCandidateProximityMetrics(cand, idx, costDeltaFromRank1, costDeltaPct, addedSkus, omittedSkus, weightedEditDistance) {
  const riskScore = (cand.aspectErrors?.length || 0) * 10 + (cand.changesCount || 0);
  let closenessRating = 'Differentiated Architecture (>8% cost variance)';
  if (idx === 0) closenessRating = 'Optimal Baseline';
  else if (costDeltaPct === null) closenessRating = 'Customer-distance ranked; certified pricing incomplete';
  else if (Math.abs(costDeltaPct) < 8) closenessRating = 'Very Close Alternative (<8% cost variance)';

  cand.proximityMetrics = {
    costDeltaFromRank1Usd: costDeltaFromRank1,
    costDeltaPct,
    addedSkuCount: addedSkus.length,
    omittedSkuCount: omittedSkus.length,
    addedSkus: addedSkus.slice(0, 5),
    omittedSkus: omittedSkus.slice(0, 5),
    weightedEditDistance,
    quantityDelta: cand.quantityDelta || 0,
    architecturalDelta: cand.architecturalDelta ?? 0,
    riskScore,
    disruptionScore: Math.min(100, Math.round(weightedEditDistance * 20)),
    isClosestRoute: idx <= 2,
    closenessRating
  };
  cand.configurationParity = {
    architecturalDelta: cand.architecturalDelta ?? 0,
    addedSkuCount: addedSkus.length,
    omittedSkuCount: omittedSkus.length
  };
}

function _resolveCandidateDecisionGuide(cand) {
  if (cand.availabilityPreference) return 'Compare catalog lead times and review the substitutions before confirming delivery in OCA.';
  const lowerName = cand.name.toLowerCase();
  if (lowerName.includes('intent preserved')) return 'Choose this when maximum fidelity to the customer RFP is mandated and minimum SKU deviations are required.';
  if (lowerName.includes('high-iops') || lowerName.includes('contested form-factor')) return 'Choose this when write-cache performance (8GB PCIe) and retaining customer OCP NIC part numbers outweigh standard CapEx constraints.';
  if (lowerName.includes('budget') || lowerName.includes('capex')) return 'Choose this when lowest possible purchase price is required without violating HPE factory buildability.';
  if (lowerName.includes('standardized')) return 'Choose this when factory standard cable management and tool-less rail kits are required for turnkey rack deployment.';
  return 'Choose this for maximum multi-GPU, multi-riser scalability and headroom expansion.';
}

function _applyParetoDominance(normalized) {
  for (let i = 0; i < normalized.length; i++) {
    const a = normalized[i];
    if (!a.isUniqueBom) continue;
    for (let j = 0; j < normalized.length; j++) {
      if (i === j) continue;
      const b = normalized[j];
      if (!b.isUniqueBom) continue;
      const costA = a.pricingComplete ? a.estimatedCostUsd : Number.POSITIVE_INFINITY;
      const costB = b.pricingComplete ? b.estimatedCostUsd : Number.POSITIVE_INFINITY;
      const riskA = a.proximityMetrics.riskScore;
      const riskB = b.proximityMetrics.riskScore;
      const distA = a.proximityMetrics.weightedEditDistance;
      const distB = b.proximityMetrics.weightedEditDistance;
      const leadA = a.supplyMetrics.solutionEdtDays ?? Number.POSITIVE_INFINITY;
      const leadB = b.supplyMetrics.solutionEdtDays ?? Number.POSITIVE_INFINITY;
      const aDominatesB = (costA <= costB && riskA <= riskB && distA <= distB && leadA <= leadB) &&
                          (costA < costB || riskA < riskB || distA < distB || leadA < leadB);
      if (aDominatesB) {
        b.isParetoOptimal = false;
        b.dominatedByRank = a.rank;
      }
    }
  }
}

function normalizeCandidates(rawCandidates, requestedSkuSet, baselineCost, options = {}) {
  const priceResolver = options.priceResolver;
  const seenFp = new Map();
  const normalized = rawCandidates.map((cand, idx) => {
    _normalizeCandidatePartsPricing(cand, priceResolver);
    cand.rank = idx + 1;
    if (!cand.name.startsWith(`Rank ${cand.rank}:`)) cand.name = cand.name.replace(/^Rank \d+:/, `Rank ${cand.rank}:`);
    _assignBomFingerprintAndUniqueness(cand, seenFp);
    const candPartMap = new Map();
    cand.skuPartsList.forEach(p => { const clean = cleanBaseSKU(p.sku); if (clean) candPartMap.set(clean, p); });
    const candSkuSet = new Set(candPartMap.keys());
    const addedSkus = Array.from(candSkuSet).filter(s => !requestedSkuSet.has(s));
    const omittedSkus = Array.from(requestedSkuSet).filter(s => !candSkuSet.has(s));
    const costDeltaFromRank1 = cand.pricingComplete && baselineCost > 0 ? cand.estimatedCostUsd - baselineCost : null;
    const costDeltaPct = costDeltaFromRank1 !== null ? parseFloat(((costDeltaFromRank1 / baselineCost) * 100).toFixed(2)) : null;
    const weightedEditDistance = _computeCandidateEditDistance(candPartMap, addedSkus, omittedSkus, cand.quantityDelta);
    _buildCandidateProximityMetrics(cand, idx, costDeltaFromRank1, costDeltaPct, addedSkus, omittedSkus, weightedEditDistance);
    cand.decisionGuide = _resolveCandidateDecisionGuide(cand);
    return cand;
  });

  _applyParetoDominance(normalized);
  const frontierReport = computeParetoFrontier(normalized, { ...options, enforcePhysicalMath: options.enforcePhysicalMath !== false });
  normalized.paretoFrontier = frontierReport;
  normalized.disqualifiedCandidates = frontierReport.disqualifiedCandidates;
  normalized.evaluatedCandidateSet = frontierReport.evaluatedCandidateSet;
  normalized.isGlobalMinimum = frontierReport.isGlobalMinimum;
  const paretoSolutions = normalized.filter(c => c.isParetoOptimal && c.isUniqueBom);
  normalized.paretoSolutions = paretoSolutions;
  normalized.paretoCount = paretoSolutions.length;
  return options.paretoOnly ? paretoSolutions : normalized;
}

module.exports = {
  computeCapabilityDowngradePenalty,
  computeArchitecturalDelta,
  scoreAndSortCandidates,
  includeAvailabilityRecommendations,
  normalizeCandidates
};
