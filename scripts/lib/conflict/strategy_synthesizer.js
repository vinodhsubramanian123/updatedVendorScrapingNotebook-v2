'use strict';
/**
 * scripts/lib/conflict/strategy_synthesizer.js — 5-Tier Strategic Resolution Matrix Synthesizer
 *
 * Thin modular facade orchestrating rank synthesis across scripts/lib/conflict/ranks/*.
 */

const fs = require('fs');
const path = require('path');
const { extractWorkloadDna } = require('./workload_dna.js');
const { discoverDynamicStrategyAddons } = require('./cascading_impact_analyzer.js');
const { identifyTroublesomeSkus, buildLeastDeltaCandidate } = require('./least_delta_combinator.js');
const { createDecisionTraceLedger } = require('./decision_trace.js');
const {
  computeParetoFrontier,
  qualifyCandidatesBeforeRanking,
  rankQualifiedCandidatesDeterministically
} = require('./sizing/pareto_ranker.js');
const { computeCandidateRunwayAndTradeOffs } = require('./tradeoff_explainer.js');
const {
  loadCatalogAndPrices,
  parseLeadTimeDays,
  createSupplyAttributeResolver,
  calculateSupplyMetrics,
  createPriceResolver,
  computeBaseParts,
  computeFixParts
} = require('./ranks/supply_and_pricing.js');
const {
  setPhysicalMathValidator,
  getPhysicalMathValidator,
  computeBomFingerprint,
  _runPhysicalAspectsValidationLoop,
  revalidateCandidateParts
} = require('./ranks/candidate_revalidator.js');
const {
  computeCapabilityDowngradePenalty,
  computeArchitecturalDelta,
  scoreAndSortCandidates,
  includeAvailabilityRecommendations,
  normalizeCandidates
} = require('./ranks/downgrade_and_delta_scoring.js');
const {
  CERTIFIED_STORAGE_DOWNTIER_MAP,
  findCatalogAvailabilityMatches,
  synthesizeAvailabilityAlternatives,
  synthesizeFastShipAlternative,
  _tryBudgetStorageSubstitution,
  synthesizeBudgetMinimizationCandidate
} = require('./ranks/availability_and_budget_candidates.js');
const {
  _buildRank2PartsAndMetadata,
  _buildRank3PartsAndMetadata,
  _buildRank4PartsAndMetadata,
  _recordMandatoryFixesDecision,
  _recordLeastDeltaDecision,
  _buildRank1Candidate,
  _buildRankedAvailabilityCandidate,
  _buildRank2Candidate,
  _buildRank3Candidate,
  _buildRank4Candidate,
  _buildRank5Candidate
} = require('./ranks/tier_candidate_builders.js');

let _strategyAddonsCache = null;

function _clearStrategyAddonsCache() {
  _strategyAddonsCache = null;
}

function _loadStrategyAddonsJson() {
  if (_strategyAddonsCache) return _strategyAddonsCache;
  try {
    const configPath = path.join(__dirname, '..', '..', 'config', 'strategy_addons.json');
    if (fs.existsSync(configPath)) {
      _strategyAddonsCache = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return _strategyAddonsCache;
    }
  } catch (err) {
    require('../system/pipeline_logger.js').warn('STRATEGY_SYNTHESIZER', 'Failed to parse strategy_addons.json', err);
  }
  return { default: { rank2: [], rank3: [], rank4: [] } };
}

function _resolveStrategyKey(chassisInfo, strategyConfig) {
  const modelKey = (chassisInfo.model || '').toLowerCase();
  const familyKey = (chassisInfo.family || '').toLowerCase();
  const genKey = (chassisInfo.gen || '').toLowerCase();

  if (modelKey.includes('dl380a')) return strategyConfig.dl380a_gen12 ? 'dl380a_gen12' : (strategyConfig.dl380_gen12 ? 'dl380_gen12' : 'dl380');
  if (modelKey.includes('dl145')) return strategyConfig.dl145_gen11 ? 'dl145_gen11' : (strategyConfig.dl380_gen11 ? 'dl380_gen11' : 'default');
  if (modelKey.includes('dl380')) {
    if (genKey.includes('12') || modelKey.includes('gen12')) return 'dl380_gen12';
    if (genKey.includes('11') || modelKey.includes('gen11')) return 'dl380_gen11';
    return 'dl380';
  }
  if (familyKey.includes('alletra')) return 'alletra';
  if (familyKey.includes('synergy')) return 'synergy';
  if (familyKey.includes('cray')) return 'cray';
  if (familyKey.includes('storeever')) return 'storeever';
  return 'default';
}

function getStrategyConfig(chassisInfo) {
  const strategyConfig = _loadStrategyAddonsJson();
  const key = _resolveStrategyKey(chassisInfo, strategyConfig);
  const tierConfig = strategyConfig[key] || strategyConfig.default;
  const modelKey = (chassisInfo.model || '').toLowerCase();
  const genKey = (chassisInfo.gen || '').toLowerCase();
  return { tierConfig, isGen12: genKey.includes('12') || modelKey.includes('gen12') };
}

function _extractRagGroundingSnippet(res) {
  if (!res || !(res.confidenceScore > 0)) return '';
  const citationSnippet = Array.isArray(res.citations) && res.citations.length > 0 ? res.citations[0].snippet : '';
  const fallbackLine = !citationSnippet && typeof res.answer === 'string' && !res.answer.startsWith('### Local RAG Engine Response')
    ? (res.answer.split('\n').find((line) => line.trim()) || '')
    : '';
  return String(citationSnippet || fallbackLine)
    .replace(/^•\s*/, '')
    .replace(/\[Knowledge Delta - [^\]]+\]\s*/, '')
    .trim();
}

function createLiveRagGrounding(chassisInfo) {
  const memo = new Map();
  return (tierName, focusTerms = [], defaultSummary = '') => {
    const chassisName = chassisInfo.model || chassisInfo.chassis || '';
    const q = `${chassisName} ${focusTerms.join(' ')}`.trim();
    if (memo.has(q)) return memo.get(q);
    try {
      const { queryLocalKnowledgeBase } = require('../rag/local_rag_search.js');
      const res = queryLocalKnowledgeBase(q, chassisName);
      const snippet = _extractRagGroundingSnippet(res);
      if (snippet) {
        const cleanSnippet = snippet.length > 120 ? `${snippet.slice(0, 117)}...` : snippet;
        const formatted = `✅ Grounded in QuickSpecs & Local RAG: ${cleanSnippet}`;
        memo.set(q, formatted);
        return formatted;
      }
    } catch (_) {}
    memo.set(q, defaultSummary);
    return defaultSummary;
  };
}

function synthesize5TierRankedSolutions(items = [], evalResults = {}, graphResults = {}, chassisInfo = {}, targetDir = '', options = {}) {
  if (chassisInfo.family === 'SAN') return evalResults.conflictGraph?.rankedSolutions || [];
  const dna = extractWorkloadDna(items);
  const loadedCatalog = options?.loadedCatalog || evalResults?.catalogData || loadCatalogAndPrices(targetDir).loadedCatalog;
  const getPrice = createPriceResolver(targetDir, loadedCatalog);
  const resolveSupply = createSupplyAttributeResolver(loadedCatalog);

  const baseCost = items.reduce((acc, it) => acc + ((getPrice(it.sku) || it.unitPriceUsd || it.priceUsd || 0) * (it.quantity || 1)), 0);
  const fixes = evalResults.missingDependencies || [];
  const fixCost = fixes.reduce((acc, f) => acc + ((f.quantity || 1) * getPrice(f.sku)), 0);
  const baseParts = computeBaseParts(items, getPrice);
  const fixParts = computeFixParts(fixes, getPrice);

  const decisionLedger = createDecisionTraceLedger();
  _recordMandatoryFixesDecision(decisionLedger, fixes, getPrice);

  const rank1Parts = [...baseParts, ...fixParts];
  const rank1Cost = rank1Parts.reduce((acc, p) => acc + (p.extendedPriceUsd || (p.unitPriceUsd * p.quantity)), 0);
  const { tierConfig } = getStrategyConfig(chassisInfo);
  const dynamicDiscoveredAddons = discoverDynamicStrategyAddons(loadedCatalog, chassisInfo, dna);
  const getLiveRagGrounding = createLiveRagGrounding(chassisInfo);

  const troublesomeSkus = identifyTroublesomeSkus(items, evalResults, loadedCatalog, chassisInfo);
  const leastDeltaCandidate = buildLeastDeltaCandidate(baseParts, fixParts, troublesomeSkus, evalResults, loadedCatalog, chassisInfo, getPrice);
  _recordLeastDeltaDecision(decisionLedger, leastDeltaCandidate);

  const isStraightforwardWinner = fixes.length === 0 && (!evalResults.errors || evalResults.errors.length === 0);
  const rank1Name = isStraightforwardWinner ? 'Rank 1: Customer Configuration (Local Rules Passed)' : 'Rank 1: Customer Workload Intent Preserved (Optimal Match)';
  const rank1Reasoning = isStraightforwardWinner
    ? 'Normalized customer configuration passes local rules without additions, removals, or replacements. PORTAL VALIDATION PENDING.'
    : 'Preserves the exact customer configuration with mandatory aspect fixes applied to satisfy physical buildability.';

  const { rank2Parts, rank2AddonCost, rank2Name, rank2Reasoning, rank2IntentAlignment, rank2LeastDelta } =
    _buildRank2PartsAndMetadata({ leastDeltaCandidate, tierConfig, dynamicDiscoveredAddons, rank1Parts, rank1Cost, baseCost, getPrice, fixes });

  const arbitrationBranches = (evalResults.arbitrationResults || {}).branches || [];
  const { rank3Parts, rank3AddonCost, rank3Addons, rank3Name, rank3Reasoning, rank3IntentAlignment, rank3CascadingImpact, pcieStorageBranch } =
    _buildRank3PartsAndMetadata({ arbitrationBranches, tierConfig, dynamicDiscoveredAddons, leastDeltaCandidate, rank1Parts, rank2Parts, baseParts, fixParts, getPrice, loadedCatalog, chassisInfo, items, rank1Cost, dna, fixes });

  const { rank4Parts, rank4AddonCost, rank4Addons, rank4Name } =
    _buildRank4PartsAndMetadata({ tierConfig, dynamicDiscoveredAddons, leastDeltaCandidate, rank1Parts, rank2Parts, getPrice });

  const revalidateMemo = new Map();
  function revalidateCached(candidateParts) {
    const fp = computeBomFingerprint(candidateParts);
    if (revalidateMemo.has(fp)) {
      const cached = revalidateMemo.get(fp);
      return { ...cached, parts: cached.parts };
    }
    const res = revalidateCandidateParts(candidateParts, chassisInfo, getPrice, loadedCatalog, targetDir, options);
    revalidateMemo.set(fp, res);
    return res;
  }

  const v1 = revalidateCached(rank1Parts);
  const v2 = revalidateCached(rank2Parts);
  const v3 = revalidateCached(rank3Parts);
  const v4 = revalidateCached(rank4Parts);
  const v5 = synthesizeBudgetMinimizationCandidate(v1, evalResults, loadedCatalog, chassisInfo, getPrice, revalidateCached, { dna });

  const v1SupplyMetrics = calculateSupplyMetrics([...v1.parts, ...(options.availabilityGlobalItems || [])], resolveSupply);
  const availabilityAlternatives = synthesizeAvailabilityAlternatives(v1.parts, v1SupplyMetrics, loadedCatalog, chassisInfo, getPrice, revalidateCached, resolveSupply, options);
  const fastShipAlternative = availabilityAlternatives[0];

  const rawCandidates = [
    _buildRank1Candidate({ rank1Name, rank1Reasoning, leastDeltaCandidate, fixes, v1, baseCost, fixCost, dna, v1SupplyMetrics, fastShipAlternative, getLiveRagGrounding, decisionLedger }),
    _buildRank2Candidate({ options, fastShipAlternative, rank2LeastDelta, rank2Name, fixes, v2, baseCost, fixCost, rank2AddonCost, rank2Parts, rank1Parts, rank2IntentAlignment, rank2Reasoning, tierConfig, getLiveRagGrounding, decisionLedger }),
    _buildRank3Candidate({ rank3Name, rank3Reasoning, rank3AddonCost, rank3Addons, rank3IntentAlignment, rank3CascadingImpact, pcieStorageBranch, dna, fixes, v3, baseCost, fixCost, getLiveRagGrounding }),
    _buildRank4Candidate({ rank4Name, rank4AddonCost, rank4Addons, fixes, v4, baseCost, fixCost, getLiveRagGrounding }),
    _buildRank5Candidate({ v5, fixes, baseCost, fixCost, getLiveRagGrounding }),
    ...availabilityAlternatives.slice(options.prioritizeFastShipAsRank2 ? 1 : 0).map(alternative =>
      _buildRankedAvailabilityCandidate({ fastShipAlternative: alternative, fixes, baseCost, fixCost, decisionLedger }))
  ];

  const requestedSkuSet = scoreAndSortCandidates(rawCandidates, items, resolveSupply, options);
  const baselineCost = rawCandidates[0]?.estimatedCostUsd || rank1Cost;
  try { decisionLedger.persistLedger(); } catch (_) {}

  const normalized = normalizeCandidates(rawCandidates, requestedSkuSet, baselineCost, { ...options, priceResolver: getPrice });
  return computeCandidateRunwayAndTradeOffs(normalized, { chassisInfo, dna });
}

module.exports = {
  synthesize5TierRankedSolutions,
  synthesizeStrategies: synthesize5TierRankedSolutions,
  synthesizeFastShipAlternative,
  synthesizeAvailabilityAlternatives,
  findCatalogAvailabilityMatches,
  synthesizeBudgetMinimizationCandidate,
  _tryBudgetStorageSubstitution,
  CERTIFIED_STORAGE_DOWNTIER_MAP,
  parseLeadTimeDays,
  calculateSupplyMetrics,
  setPhysicalMathValidator,
  getPhysicalMathValidator,
  computeArchitecturalDelta,
  computeCapabilityDowngradePenalty,
  scoreAndSortCandidates,
  includeAvailabilityRecommendations,
  qualifyCandidatesBeforeRanking,
  rankQualifiedCandidatesDeterministically,
  computeParetoFrontier,
  _runPhysicalAspectsValidationLoop,
  _clearStrategyAddonsCache
};
