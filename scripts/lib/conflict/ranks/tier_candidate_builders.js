'use strict';
/**
 * scripts/lib/conflict/ranks/tier_candidate_builders.js — 5-Tier Rank Metadata, Parts & Candidate Envelope Builders
 */

const { cleanBaseSKU } = require('../../catalog/sku.js');
const { getMandatorySkusForChassis } = require('../../catalog/catalog_rules.js');
const { analyzeCascadingImpact } = require('../cascading_impact_analyzer.js');
const { computeBomFingerprint } = require('./candidate_revalidator.js');

function buildRank3PcieStorageBranchParts(ctx) {
  const { pcieStorageBranch, baseParts, fixParts, getPrice, loadedCatalog, chassisInfo, items, rank1Cost } = ctx;
  const pcieCtrl = pcieStorageBranch.storageController;
  const cableKit = pcieStorageBranch.cableKit;

  const rank3CascadingImpact = analyzeCascadingImpact(
    {
      action: 'SWAP',
      originalSku: pcieStorageBranch.substitutions?.[0]?.originalSku || 'P58335-B21',
      newSku: pcieCtrl.sku,
      originalDesc: pcieStorageBranch.substitutions?.[0]?.originalDesc || 'MR408i-o',
      newDesc: pcieCtrl.desc
    },
    items, loadedCatalog, chassisInfo
  );

  const rank3Parts = baseParts.map(p => {
    if (/mr408i-o|sr416i-o|\b-o\b/i.test(p.description) && /controller|raid|storage/i.test(p.description)) {
      const price = getPrice(pcieCtrl.sku);
      return { sku: cleanBaseSKU(pcieCtrl.sku), description: pcieCtrl.desc, quantity: p.quantity || 1, unitPriceUsd: price, extendedPriceUsd: price * (p.quantity || 1), isFixInjected: false, isStrategyAddon: true, category: 'Storage Performance' };
    }
    return p;
  });

  const ocpNicSub = pcieStorageBranch.substitutions.find(s => s.action === 'RETAIN_OCP_NIC_IN_FREED_SLOT');
  if (ocpNicSub) {
    const ocpPrice = getPrice(ocpNicSub.retainedSku);
    rank3Parts.push({ sku: cleanBaseSKU(ocpNicSub.retainedSku), description: ocpNicSub.retainedDesc, quantity: 1, unitPriceUsd: ocpPrice, extendedPriceUsd: ocpPrice, isFixInjected: false, isStrategyAddon: true, category: 'Network Adapter (OCP3)' });
  }

  if (cableKit) {
    const cablePrice = getPrice(cableKit.sku);
    rank3Parts.push({ sku: cleanBaseSKU(cableKit.sku), description: cableKit.description, quantity: 1, unitPriceUsd: cablePrice, extendedPriceUsd: cablePrice, isFixInjected: true, isStrategyAddon: true, category: 'Storage Controller Cable' });
  }

  fixParts.filter(f => !/p48918|enablement cable/i.test(f.sku + (f.description || ''))).forEach(f => rank3Parts.push(f));

  const mandatory = getMandatorySkusForChassis(chassisInfo);
  const batterySku = mandatory.SMART_STORAGE_BATTERY?.sku || 'P01366-B21';
  const batteryName = mandatory.SMART_STORAGE_BATTERY?.name || 'HPE 96W Smart Storage Battery';
  const hasBattery = rank3Parts.some(p => cleanBaseSKU(p.sku) === cleanBaseSKU(batterySku) || /smart.*battery|hybrid.*capacitor/i.test(p.sku + (p.description || '')));
  if (!hasBattery) {
    const batteryPrice = getPrice(batterySku);
    rank3Parts.push({ sku: batterySku, description: batteryName, quantity: 1, unitPriceUsd: batteryPrice, extendedPriceUsd: batteryPrice, isFixInjected: true, isStrategyAddon: true, category: 'Storage Performance' });
  }

  const rank3Cost = rank3Parts.reduce((acc, p) => acc + (p.extendedPriceUsd || (p.unitPriceUsd * p.quantity)), 0);
  return { rank3Parts, rank3Cost, rank3AddonCost: Math.max(0, rank3Cost - rank1Cost), rank3CascadingImpact };
}

function _buildRank2PartsAndMetadata({ leastDeltaCandidate, tierConfig, dynamicDiscoveredAddons, rank1Parts, rank1Cost, baseCost, getPrice, fixes }) {
  if (leastDeltaCandidate) {
    const rank2Parts = leastDeltaCandidate.parts;
    const rank2Cost = leastDeltaCandidate.estimatedCapex;
    return {
      rank2Parts,
      rank2Cost,
      rank2AddonCost: Math.max(0, rank2Cost - baseCost),
      rank2Name: leastDeltaCandidate.tierTitle,
      rank2Reasoning: leastDeltaCandidate.sharedIntelligenceReasoning,
      rank2IntentAlignment: `100% Functional Match (${leastDeltaCandidate.deltaSummary})`,
      rank2LeastDelta: leastDeltaCandidate
    };
  }
  const rank2RawList = (tierConfig.rank2 || []).length > 0 ? tierConfig.rank2 : dynamicDiscoveredAddons.rank2Addons;
  const rank2Addons = rank2RawList.map(a => {
    const price = getPrice(a.sku);
    return { sku: cleanBaseSKU(a.sku), description: a.description || a.name || `Factory Accessory (${a.sku})`, quantity: a.quantity || 1, unitPriceUsd: price, extendedPriceUsd: price * (a.quantity || 1), isFixInjected: false, isStrategyAddon: true, category: a.category || 'Factory Baseline Accessory' };
  });
  const rank2Parts = [...rank1Parts, ...rank2Addons];
  const rank2AddonCost = rank2Addons.reduce((acc, a) => acc + a.extendedPriceUsd, 0);
  return {
    rank2Parts,
    rank2Cost: rank1Cost + rank2AddonCost,
    rank2AddonCost,
    rank2Name: 'Rank 2: Standardized CTO Baseline & Factory Default Accessories',
    rank2Reasoning: 'Standardizes baseline options with factory default cable and rail accessories for maximum factory assembly stability.',
    rank2IntentAlignment: `${Math.max(80, 95 - fixes.length * 3)}% (Standardized)`,
    rank2LeastDelta: null
  };
}

function _buildRank3PartsAndMetadata({ arbitrationBranches, tierConfig, dynamicDiscoveredAddons, leastDeltaCandidate, rank1Parts, rank2Parts, baseParts, fixParts, getPrice, loadedCatalog, chassisInfo, items, rank1Cost, fixes }) {
  const pcieStorageBranch = arbitrationBranches.find(b => b.branchId === 'branch_pcie_storage_ocp_nic');
  if (pcieStorageBranch) {
    const pcieRes = buildRank3PcieStorageBranchParts({ pcieStorageBranch, baseParts, fixParts, getPrice, loadedCatalog, chassisInfo, items, rank1Cost });
    const retainedOcpSkus = (items || [])
      .filter(it => /ocp/i.test(String(it.description || '')) && !/storage|controller|mr\d+|sr\d+/i.test(String(it.description || '')))
      .map(it => cleanBaseSKU(it.sku))
      .filter(Boolean);
    const pivotSku = pcieStorageBranch.substitutions?.[0]?.toSku || 'PCIe Storage Controller';
    const retainedSummary = retainedOcpSkus.length > 0 ? retainedOcpSkus.join(', ') : 'customer OCP adapter';
    return {
      rank3Parts: pcieRes.rank3Parts,
      rank3AddonCost: pcieRes.rank3AddonCost,
      rank3Addons: [],
      rank3Name: 'Rank 3: High-IOPS & Contested Form-Factor Optimized (PCIe Storage + OCP NIC Retention)',
      rank3Reasoning: `Pivoted storage controller to PCIe (${pivotSku}) to free OCP Slot 1 for ${retainedSummary}.`,
      rank3IntentAlignment: retainedOcpSkus.length > 0 ? `Exact Part Number Retention (${retainedSummary})` : '100% Customer OCP Intent Preserved',
      rank3CascadingImpact: pcieRes.rank3CascadingImpact,
      pcieStorageBranch: { ...pcieStorageBranch, retainedOcpSkus }
    };
  }
  const rank3RawList = (tierConfig.rank3 || []).length > 0 ? tierConfig.rank3 : dynamicDiscoveredAddons.rank3Addons;
  const rank3Addons = rank3RawList.map(a => {
    const price = getPrice(a.sku);
    return { sku: cleanBaseSKU(a.sku), description: a.description || a.name || `Performance Component (${a.sku})`, quantity: a.quantity || 1, unitPriceUsd: price, extendedPriceUsd: price * (a.quantity || 1), isFixInjected: false, isStrategyAddon: true, category: a.category || 'Performance Acceleration' };
  });
  const isModernizedGen5 = leastDeltaCandidate?.strategyName === 'MODERNIZED_5TH_GEN_PLATFORM';
  const rank3Parts = [...(isModernizedGen5 ? rank2Parts : rank1Parts), ...rank3Addons];
  const rank3AddonCost = rank3Addons.reduce((acc, a) => acc + a.extendedPriceUsd, 0);
  return {
    rank3Parts,
    rank3AddonCost,
    rank3Addons,
    rank3Name: isModernizedGen5 ? 'Rank 3: High-IOPS & Storage Performance Optimized (Modernized 5th Gen Platform)' : 'Rank 3: High-IOPS & Storage Performance Optimized',
    rank3Reasoning: isModernizedGen5 ? 'Upgrades storage write-cache and smart hybrid battery protection on the modernized 5th Gen platform for enhanced transactional database read/write IOPS.' : 'Upgrades storage write-cache and smart hybrid battery protection for enhanced transactional database read/write IOPS.',
    rank3IntentAlignment: `${Math.max(75, 90 - fixes.length * 3)}% (Storage Heavy)`,
    rank3CascadingImpact: null,
    pcieStorageBranch: null
  };
}

function _buildRank4PartsAndMetadata({ tierConfig, dynamicDiscoveredAddons, leastDeltaCandidate, rank1Parts, rank2Parts, getPrice }) {
  const isModernizedGen5 = leastDeltaCandidate?.strategyName === 'MODERNIZED_5TH_GEN_PLATFORM';
  const rank4RawList = (tierConfig.rank4 || []).length > 0 ? tierConfig.rank4 : dynamicDiscoveredAddons.rank4Addons;
  const rank4Addons = rank4RawList.map(a => {
    const price = getPrice(a.sku);
    return { sku: cleanBaseSKU(a.sku), description: a.description || a.name || `Expansion Riser / Fan (${a.sku})`, quantity: a.quantity || 1, unitPriceUsd: price, extendedPriceUsd: price * (a.quantity || 1), isFixInjected: false, isStrategyAddon: true, category: a.category || 'Expansion Infrastructure' };
  });
  return {
    rank4Parts: [...(isModernizedGen5 ? rank2Parts : rank1Parts), ...rank4Addons],
    rank4AddonCost: rank4Addons.reduce((acc, a) => acc + a.extendedPriceUsd, 0),
    rank4Addons,
    rank4Name: isModernizedGen5 ? 'Rank 4: Maximum Density & Future Scalability Expansion (Modernized 5th Gen Platform)' : 'Rank 4: Maximum Density & Future Scalability Expansion'
  };
}

function _recordMandatoryFixesDecision(decisionLedger, fixes, getPrice) {
  if (!fixes || fixes.length === 0) return;
  decisionLedger.recordDecision({
    decisionPoint: 'MANDATORY_ASPECT_RULE_ENFORCEMENT',
    trigger: `${fixes.length} physical aspect mismatch(es) detected in customer drafted BOQ`,
    alternativesEvaluated: fixes.map(f => ({
      id: f.sku, description: f.description || `Required hardware kit (${f.sku})`,
      pros: ['Guarantees 100% buildability in vendor configurator', 'Satisfies thermal/electrical safety'],
      cons: [`Adds $${(getPrice(f.sku) * (f.quantity || 1)).toLocaleString()} CapEx`], status: 'SELECTED'
    })),
    selectedAlternative: { id: 'INJECT_ALL_MANDATORY_FIXES', description: `${fixes.length} certified accessory kit(s)`, selectionRationale: 'Golden Rule mandates 100% elimination of unbuildable errors before quote submission' },
    downstreamImpact: fixes.map(f => f.sku),
    confidence: 0.99
  });
}

function _recordLeastDeltaDecision(decisionLedger, leastDeltaCandidate) {
  if (!leastDeltaCandidate) return;
  decisionLedger.recordDecision({
    decisionPoint: 'LEAST_DELTA_CASCADE_PRUNING',
    trigger: leastDeltaCandidate.troublesomeReason,
    alternativesEvaluated: [
      { id: 'DIRECT_ADDITIVE_FIXES', description: `Retain ${leastDeltaCandidate.troublesomeRootSku} and append all cascading dependencies`, pros: ['Preserves exact customer drafted SKU'], cons: [`Forces ${leastDeltaCandidate.cascadingSkusEliminated.length} cascading accessories`, 'Higher complexity and CapEx'], status: 'OFFERED_AS_RANK_1' },
      { id: 'LEAST_DELTA_SUBSTITUTION', description: `Substitute with ${leastDeltaCandidate.alternativeSku || 'pruned'} (${leastDeltaCandidate.presalesValuePitch})`, pros: ['Eliminates cascading dependencies', 'Lowest delta operations to customer intent', '100% buildable and functionally equivalent'], cons: ['Substitutes part number with modern alternative'], status: 'OFFERED_AS_RANK_2' }
    ],
    selectedAlternative: { id: 'LEAST_DELTA_PATH', description: leastDeltaCandidate.presalesValuePitch },
    downstreamImpact: leastDeltaCandidate.cascadingSkusEliminated,
    confidence: 0.98
  });
}

function _buildRank1Candidate({ rank1Name, rank1Reasoning, leastDeltaCandidate, fixes, v1, baseCost, fixCost, dna, v1SupplyMetrics, fastShipAlternative, getLiveRagGrounding, decisionLedger }) {
  return {
    rank: 1,
    strategyId: 'STRATEGY_CLOSEST_INTENT',
    strategyIdentity: 'STRATEGY_CLOSEST_INTENT',
    name: rank1Name,
    leastDeltaAlternative: leastDeltaCandidate ? { ...leastDeltaCandidate, strategyId: 'STRATEGY_LEAST_DELTA', strategyIdentity: 'STRATEGY_LEAST_DELTA', rank: '1L' } : null,
    score: parseFloat(Math.max(0.70, 1.0 - (fixes.length * 0.02)).toFixed(2)),
    estimatedCostUsd: v1.totalCost,
    budgetBreakdown: { baseBomCost: baseCost, fixCost, strategyAddonCost: 0, totalBudgetUsd: v1.totalCost },
    workloadDnaMatch: dna.workloadDescription || 'Balanced Enterprise',
    changesCount: fixes.length + v1.injectedFixes.length,
    skuPartsList: v1.parts,
    bomFingerprint: computeBomFingerprint(v1.parts),
    physicalMathClean: v1.physicalMathClean,
    isMathClean: v1.physicalMathClean,
    aspectErrors: v1.aspectErrors || [],
    injectedCascadingFixes: v1.injectedFixes,
    supplyMetrics: v1SupplyMetrics,
    fastShipAlternative: fastShipAlternative || null,
    availabilityTradeoffs: fastShipAlternative?.substitutedPacingItems || [],
    tradeoffMetrics: {
      intentAlignment: fixes.length === 0 ? '100% (Direct Match)' : `${Math.max(85, 100 - fixes.length * 3)}% (${fixes.length} Fixes)`,
      skuModifications: `${fixes.length + v1.injectedFixes.length} physical fixes injected`,
      costDeltaUsd: `+$${fixCost.toLocaleString()} (Mandatory Buildability)`,
      capacityExpansion: 'Optimal (Zero over/under-provisioning)',
      fastShipAlternativeAvailable: Boolean(fastShipAlternative),
      deliveryDaysSaved: fastShipAlternative?.deliveryDaysSaved ?? null
    },
    ragSecondOpinion: getLiveRagGrounding('Intent Preserved', fixes.map(f => f.sku).concat(['chassis', 'processor', 'memory']),
      v1.physicalMathClean === true
        ? '✅ Local Rule Engine Validated: Direct translation of customer requirements with mandatory buildability fixes.'
        : '⚠️ Candidate has unresolved physical constraint/math errors; inspect errors before portal validation.'),
    reasoning: rank1Reasoning,
    decisionTrace: decisionLedger.getDecisions()
  };
}

function _buildRankedAvailabilityCandidate({ fastShipAlternative, fixes, baseCost, fixCost, decisionLedger }) {
  return {
    rank: 2,
    strategyId: fastShipAlternative.availabilityPreference === 'CLOSEST_MATCH' ? 'STRATEGY_FAST_SHIP_RANK2' : 'STRATEGY_FASTEST_AVAILABILITY',
    isFastShipRank2: fastShipAlternative.availabilityPreference === 'CLOSEST_MATCH',
    availabilityPreference: fastShipAlternative.availabilityPreference,
    requiresRequirementReview: fastShipAlternative.requiresRequirementReview,
    name: fastShipAlternative.name,
    score: parseFloat(Math.max(0.65, 0.92 - (fixes.length * 0.02)).toFixed(2)),
    estimatedCostUsd: fastShipAlternative.estimatedCostUsd,
    budgetBreakdown: { baseBomCost: baseCost, fixCost, strategyAddonCost: Math.max(0, fastShipAlternative.estimatedCostUsd - baseCost), totalBudgetUsd: fastShipAlternative.estimatedCostUsd },
    workloadDnaMatch: 'Fast-Ship Delivery Optimized',
    changesCount: fastShipAlternative.substitutedPacingItems?.length || 1,
    skuPartsList: fastShipAlternative.skuPartsList,
    bomFingerprint: computeBomFingerprint(fastShipAlternative.skuPartsList),
    physicalMathClean: fastShipAlternative.physicalMathClean,
    isMathClean: fastShipAlternative.physicalMathClean,
    isPortalConditional: false,
    portalValidationStatus: fastShipAlternative.portalValidationStatus || 'PORTAL VALIDATION PENDING',
    liveClicValidation: fastShipAlternative.liveClicValidation || null,
    componentLeadTimeEstimate: fastShipAlternative.componentLeadTimeEstimate || null,
    deliveryDaysSaved: fastShipAlternative.deliveryDaysSaved,
    substitutedPacingItems: fastShipAlternative.substitutedPacingItems,
    liveSolutionEdt: fastShipAlternative.liveSolutionEdt || null,
    topologyTransitions: fastShipAlternative.topologyTransitions || [],
    portalConditionalSkus: [],
    aspectErrors: fastShipAlternative.aspectErrors || [],
    injectedCascadingFixes: fastShipAlternative.injectedCascadingFixes,
    leastDeltaAnalysis: null,
    tradeoffMetrics: fastShipAlternative.tradeoffMetrics,
    ragSecondOpinion: `✅ Fast-Ship Alternative: ${fastShipAlternative.reasoning}`,
    reasoning: fastShipAlternative.reasoning,
    decisionTrace: decisionLedger.getDecisions()
  };
}

function _buildRank2Candidate(ctx) {
  if (ctx.options?.prioritizeFastShipAsRank2 && ctx.fastShipAlternative) return _buildRankedAvailabilityCandidate(ctx);
  const { rank2LeastDelta, rank2Name, fixes, v2, baseCost, fixCost, rank2AddonCost, rank2Parts, rank1Parts, rank2IntentAlignment, rank2Reasoning, tierConfig, getLiveRagGrounding, decisionLedger } = ctx;
  let dnaMatch = 'Factory Standard (Cable Management Arm & Tool-less Rail Kits)';
  if (rank2LeastDelta) dnaMatch = rank2LeastDelta.strategyName === 'MODERNIZED_5TH_GEN_PLATFORM' ? 'Modernized 5th Gen Platform (Emerald Rapids + DDR5-5600)' : 'Least-Delta Optimization (Pruned Cascades)';

  return {
    rank: 2,
    strategyId: rank2LeastDelta ? 'STRATEGY_LEAST_DELTA' : 'STRATEGY_CTO_BASELINE',
    strategyIdentity: rank2LeastDelta ? 'STRATEGY_LEAST_DELTA' : 'STRATEGY_CTO_BASELINE',
    name: rank2Name,
    score: parseFloat(Math.max(0.65, 0.92 - (fixes.length * 0.02)).toFixed(2)),
    estimatedCostUsd: v2.totalCost,
    budgetBreakdown: { baseBomCost: baseCost, fixCost, strategyAddonCost: rank2AddonCost, totalBudgetUsd: v2.totalCost },
    workloadDnaMatch: dnaMatch,
    changesCount: rank2LeastDelta ? rank2LeastDelta.deltaMetrics.totalDeltaOperations : fixes.length + (rank2Parts.length - rank1Parts.length) + v2.injectedFixes.length,
    skuPartsList: v2.parts,
    bomFingerprint: computeBomFingerprint(v2.parts),
    physicalMathClean: v2.physicalMathClean,
    isMathClean: v2.physicalMathClean,
    isPortalConditional: Boolean(rank2LeastDelta?.isPortalConditional),
    portalValidationStatus: rank2LeastDelta?.portalValidationStatus || 'PENDING',
    portalConditionalSkus: rank2LeastDelta?.portalConditionalSkus || [],
    aspectErrors: v2.aspectErrors || [],
    injectedCascadingFixes: v2.injectedFixes,
    leastDeltaAnalysis: rank2LeastDelta || null,
    tradeoffMetrics: { intentAlignment: rank2IntentAlignment, skuModifications: rank2LeastDelta ? rank2LeastDelta.deltaSummary : `${fixes.length} modifications`, costDeltaUsd: `+$${rank2AddonCost.toLocaleString()}`, capacityExpansion: rank2LeastDelta ? 'Cascade-Free Architecture' : 'Standard Factory Margins', presalesPitch: rank2LeastDelta?.presalesValuePitch || 'Factory standard accessory kit inclusion' },
    ragSecondOpinion: getLiveRagGrounding(
      rank2LeastDelta ? 'Least-Delta Alternative' : 'Standardized CTO Baseline',
      (rank2LeastDelta?.cascadingSkusEliminated || []).concat(['cable', 'rail', 'chassis']),
      v2.physicalMathClean === true
        ? (rank2LeastDelta ? `✅ Local Rule Engine Validated: ${rank2LeastDelta.presalesValuePitch}` : `✅ Local Rule Engine Validated: CTO factory standardized baseline (${tierConfig.rank2?.[0]?.description || 'Factory Cable/Rail Kit'}) and routing verified.`)
        : '⚠️ Candidate has unresolved physical constraint/math errors; portal review required.'
    ),
    reasoning: rank2Reasoning,
    decisionTrace: decisionLedger.getDecisions()
  };
}

function _buildRank3Candidate({ rank3Name, rank3Reasoning, rank3AddonCost, rank3Addons, rank3IntentAlignment, rank3CascadingImpact, pcieStorageBranch, dna, fixes, v3, baseCost, fixCost, getLiveRagGrounding }) {
  return {
    rank: 3,
    strategyId: 'STRATEGY_PERFORMANCE',
    strategyIdentity: 'STRATEGY_PERFORMANCE',
    name: rank3Name,
    score: parseFloat(Math.max(0.60, 0.88 - (fixes.length * 0.02)).toFixed(2)),
    estimatedCostUsd: v3.totalCost,
    budgetBreakdown: { baseBomCost: baseCost, fixCost, strategyAddonCost: rank3AddonCost, totalBudgetUsd: v3.totalCost },
    workloadDnaMatch: pcieStorageBranch ? 'High-IOPS (PCIe x16 Controller, 8GB Cache & Dual OCP Retained)' : `Optimized for ${dna.storageWorkload || 'Database'} Performance`,
    changesCount: fixes.length + (pcieStorageBranch ? pcieStorageBranch.substitutions.length : rank3Addons.length) + v3.injectedFixes.length,
    skuPartsList: v3.parts,
    bomFingerprint: computeBomFingerprint(v3.parts),
    physicalMathClean: v3.physicalMathClean,
    isMathClean: v3.physicalMathClean,
    aspectErrors: v3.aspectErrors || [],
    injectedCascadingFixes: v3.injectedFixes,
    cascadingImpact: rank3CascadingImpact,
    tradeoffMetrics: { intentAlignment: rank3IntentAlignment, skuModifications: `${fixes.length + (pcieStorageBranch ? pcieStorageBranch.substitutions.length : rank3Addons.length) + v3.injectedFixes.length} modifications`, costDeltaUsd: `+$${(fixCost + rank3AddonCost).toLocaleString()}`, capacityExpansion: pcieStorageBranch ? '2x Write Cache (8GB) + OCP Retention' : 'High Drive Controller Throughput' },
    ragSecondOpinion: getLiveRagGrounding('High-IOPS Storage Performance', (pcieStorageBranch ? [pcieStorageBranch.substitutions?.[0]?.toSku || 'storage', ...(pcieStorageBranch.retainedOcpSkus || [])] : rank3Addons.map(a => a.sku)).concat(['battery', 'cache', 'storage']),
      v3.physicalMathClean === true
        ? (pcieStorageBranch ? '✅ Local Rule Engine Validated: PCIe standup controller (x16 bus, 8GB cache) frees OCP Slot 1 for customer OCP adapter.' : `✅ Local Rule Engine Validated: Write-back cache acceleration & ${dna.storageWorkload || 'high-throughput controller'} IOPS optimization verified.`)
        : '⚠️ Candidate has unresolved physical constraint/math errors; portal review required.'),
    reasoning: rank3Reasoning
  };
}

function _buildRank4Candidate({ rank4Name, rank4AddonCost, rank4Addons, fixes, v4, baseCost, fixCost, getLiveRagGrounding }) {
  return {
    rank: 4,
    strategyId: 'STRATEGY_EXPANSION',
    strategyIdentity: 'STRATEGY_EXPANSION',
    name: rank4Name,
    score: parseFloat(Math.max(0.55, 0.82 - (fixes.length * 0.02)).toFixed(2)),
    estimatedCostUsd: v4.totalCost,
    budgetBreakdown: { baseBomCost: baseCost, fixCost, strategyAddonCost: rank4AddonCost, totalBudgetUsd: v4.totalCost },
    workloadDnaMatch: 'Max Headroom (Full PCIe Riser & High-Perf Thermal Expansion)',
    changesCount: fixes.length + rank4Addons.length + v4.injectedFixes.length,
    skuPartsList: v4.parts,
    bomFingerprint: computeBomFingerprint(v4.parts),
    physicalMathClean: v4.physicalMathClean,
    isMathClean: v4.physicalMathClean,
    aspectErrors: v4.aspectErrors || [],
    injectedCascadingFixes: v4.injectedFixes,
    tradeoffMetrics: { intentAlignment: `${Math.max(70, 85 - fixes.length * 3)}% (Scalability Focused)`, skuModifications: `${fixes.length + rank4Addons.length + v4.injectedFixes.length} modifications`, costDeltaUsd: `+$${(fixCost + rank4AddonCost).toLocaleString()}`, capacityExpansion: '100% Slot & Thermal Headroom' },
    ragSecondOpinion: getLiveRagGrounding('Future Scalability Expansion', rank4Addons.map(a => a.sku).concat(['riser', 'fan', 'pcie']),
      v4.physicalMathClean === true
        ? '✅ Local Rule Engine Validated: Secondary & tertiary riser lane allocation and cooling envelope verified.'
        : '⚠️ Candidate has unresolved physical constraint/math errors; portal review required.'),
    reasoning: 'Populates full secondary PCIe riser slots and high-performance fan kits to support future GPU accelerator and 2nd CPU socket expansions.'
  };
}

function _buildRank5Candidate({ v5, fixes, baseCost, fixCost, getLiveRagGrounding }) {
  const isAvailable = Boolean(v5.isAlternativeAvailable);
  return {
    rank: 5,
    strategyId: 'STRATEGY_BUDGET',
    strategyIdentity: 'STRATEGY_BUDGET',
    isAlternativeAvailable: isAvailable,
    name: isAvailable ? 'Rank 5: Budget & CapEx Minimized Buildable Alternative' : 'Rank 5: Baseline Preserved (No Further Safe CapEx Reductions Available)',
    score: parseFloat(Math.max(0.50, 0.75 - (fixes.length * 0.02)).toFixed(2)),
    estimatedCostUsd: v5.totalCost,
    budgetBreakdown: { baseBomCost: baseCost, fixCost, strategyAddonCost: 0, totalBudgetUsd: v5.totalCost },
    workloadDnaMatch: isAvailable ? 'Budget Optimized (Certified Down-Tiering)' : 'Strict Minimum CapEx (100% Buildable Baseline)',
    changesCount: fixes.length + v5.injectedFixes.length,
    skuPartsList: v5.parts,
    bomFingerprint: computeBomFingerprint(v5.parts),
    physicalMathClean: v5.physicalMathClean,
    isMathClean: v5.physicalMathClean,
    aspectErrors: v5.aspectErrors || [],
    injectedCascadingFixes: v5.injectedFixes,
    tradeoffMetrics: {
      intentAlignment: `${Math.max(65, 80 - fixes.length * 3)}% (${isAvailable ? 'Budget Optimized' : 'Minimal Baseline'})`,
      skuModifications: `${fixes.length + v5.injectedFixes.length} fixes & modifications`,
      costDeltaUsd: isAvailable ? `-$${v5.deltaUsd.toLocaleString()} (CapEx Down-Tiering)` : '$0 (Baseline is already CapEx minimal)',
      capacityExpansion: 'Baseline Only'
    },
    ragSecondOpinion: getLiveRagGrounding(isAvailable ? 'Budget CapEx Down-Tiering' : 'Minimal CapEx Baseline', ['minimal', 'baseline', 'chassis'],
      v5.physicalMathClean === true
        ? (isAvailable ? `✅ Local Rule Engine Validated: Certified budget alternative down-tiering over-provisioned components (-$${v5.deltaUsd.toLocaleString()}).` : `✅ Local Rule Engine Validated: 100% buildable certified baseline without unrequested add-ons (${v5.parts.length} essential parts).`)
        : '⚠️ Candidate has unresolved physical constraint/math errors; portal review required.'),
    reasoning: isAvailable
      ? 'Certified budget alternative down-tiering over-provisioned components to deliver lower CapEx while remaining 100% physically buildable.'
      : 'Strict baseline buildable tier eliminating all optional add-ons to minimize total CapEx expenditure while remaining 100% buildable. Rank 1 already represents the minimal certified spend; no further component down-tiering is safely applicable without violating physical constraints.'
  };
}

module.exports = {
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
};
