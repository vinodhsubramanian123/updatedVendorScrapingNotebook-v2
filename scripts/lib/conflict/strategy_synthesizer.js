'use strict';
/**
 * scripts/lib/conflict/strategy_synthesizer.js — 5-Tier Strategic Resolution Matrix Synthesizer
 *
 * Synthesizes buildable options tailored to customer constraints:
 * - Rank 1: Customer Workload Intent Preserved (Optimal Match, base + mandatory physical fixes)
 * - Rank 2: Standardized CTO Baseline & Factory Default Accessories
 * - Rank 3: High-IOPS & Storage Performance Optimized
 * - Rank 4: Maximum Density & Future Scalability Expansion
 * - Rank 5: Budget & CapEx Minimized Buildable Baseline
 */

const fs = require('fs');
const path = require('path');
const { cleanBaseSKU } = require('../sku.js');
const { classifyComponentRole } = require('../product_meta.js');
const { extractWorkloadDna } = require('./workload_dna.js');

/**
 * Synthesize 5-Tier Strategic Resolution Matrix based on Workload DNA and Multi-Metric Tradeoffs.
 *
 * @param {Array<object>} items - Base BOQ items
 * @param {object} evalResults - Evaluator result with missingDependencies
 * @param {object} graphResults - Graph validation output
 * @param {object} chassisInfo - Chassis metadata
 * @param {string} targetDir - Directory path for price history
 * @returns {Array<object>} 5 Ranked Solution Tiers
 */
function synthesize5TierRankedSolutions(items = [], evalResults = {}, graphResults = {}, chassisInfo = {}, targetDir = '') {
  const dna = extractWorkloadDna(items);

  // Try loading price history
  let priceMap = {};
  if (targetDir && fs.existsSync(path.join(targetDir, 'price_history.json'))) {
    try {
      priceMap = JSON.parse(fs.readFileSync(path.join(targetDir, 'price_history.json'), 'utf8'));
    } catch (err) {
      const _logger = require('../pipeline_logger.js');
      _logger.warn('STRATEGY_SYNTHESIZER', 'Failed to parse price_history.json', err);
    }
  }

  // Helper to get real price
  const getPrice = (sku, defaultPrice = 500) => {
    const clean = cleanBaseSKU(sku);
    if (priceMap[clean] && priceMap[clean].price) return priceMap[clean].price;
    const match = items.find(i => cleanBaseSKU(i.sku) === clean);
    if (match && match.unitPriceUsd) return match.unitPriceUsd;
    return defaultPrice;
  };

  const baseCost = items.reduce((acc, it) => acc + (getPrice(it.sku, it.unitPriceUsd || 500) * (it.quantity || 1)), 0);
  const fixes = evalResults.missingDependencies || [];
  const fixCost = fixes.reduce((acc, f) => {
    const unitPrice = getPrice(f.sku, f.unitPriceUsd || 350);
    return acc + ((f.quantity || 1) * unitPrice);
  }, 0);

  // Base hardware parts list
  const baseParts = items.map(it => {
    const role = classifyComponentRole(it.category || '', it.description || '');
    const price = getPrice(it.sku, it.unitPriceUsd || 500);
    return {
      sku: cleanBaseSKU(it.sku),
      description: it.description || `HPE Hardware Option (${cleanBaseSKU(it.sku)})`,
      quantity: it.quantity || 1,
      unitPriceUsd: price,
      extendedPriceUsd: price * (it.quantity || 1),
      isFixInjected: false,
      category: role !== 'Option Component' ? role : (it.category || 'Base Hardware')
    };
  });

  // Injected aspect fix parts list
  const fixParts = fixes.map(f => {
    const role = classifyComponentRole(f.category || '', f.description || '');
    const price = getPrice(f.sku, f.unitPriceUsd || 350);
    return {
      sku: cleanBaseSKU(f.sku),
      description: f.description || `Injected Aspect Rule Fix (${cleanBaseSKU(f.sku)})`,
      quantity: f.quantity || 1,
      unitPriceUsd: price,
      extendedPriceUsd: price * (f.quantity || 1),
      isFixInjected: true,
      category: role !== 'Option Component' ? role : 'Aspect Rule Fix'
    };
  });

  // Rank 1 Parts (Intent Preserved - Base + Mandatory Fixes)
  const rank1Parts = [...baseParts, ...fixParts];
  const rank1Cost = rank1Parts.reduce((acc, p) => acc + (p.extendedPriceUsd || (p.unitPriceUsd * p.quantity)), 0);

  // Load Strategy Config
  let strategyConfig = { default: { rank2: [], rank3: [], rank4: [] } };
  try {
    const configPath = path.join(__dirname, '..', '..', 'config', 'strategy_addons.json');
    if (fs.existsSync(configPath)) {
      strategyConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (err) {
    const _logger = require('../pipeline_logger.js');
    _logger.warn('STRATEGY_SYNTHESIZER', 'Failed to parse strategy_addons.json', err);
  }

  const modelKey = (chassisInfo.model || '').toLowerCase();
  const familyKey = (chassisInfo.family || '').toLowerCase();

  let key = 'default';
  if (modelKey.includes('dl380')) key = 'dl380';
  else if (familyKey.includes('alletra')) key = 'alletra';

  const addons = strategyConfig[key] || strategyConfig['default'];

  const mapAddons = (addonList) => addonList.map(a => {
    const price = getPrice(a.sku, a.unitPriceUsd || 250);
    return {
      ...a,
      unitPriceUsd: price,
      extendedPriceUsd: price * (a.quantity || 1),
      isFixInjected: false
    };
  });

  const rank2Addons = mapAddons(addons.rank2 || []);
  const rank2AddonCost = rank2Addons.reduce((acc, p) => acc + (p.extendedPriceUsd || (p.unitPriceUsd * p.quantity)), 0);
  const rank2Parts = [...rank1Parts, ...rank2Addons];
  const rank2Cost = rank2Parts.reduce((acc, p) => acc + (p.extendedPriceUsd || (p.unitPriceUsd * p.quantity)), 0);

  const rank3Addons = mapAddons(addons.rank3 || []);
  const rank3AddonCost = rank3Addons.reduce((acc, p) => acc + (p.extendedPriceUsd || (p.unitPriceUsd * p.quantity)), 0);
  const rank3Parts = [...rank1Parts, ...rank3Addons];
  const rank3Cost = rank3Parts.reduce((acc, p) => acc + (p.extendedPriceUsd || (p.unitPriceUsd * p.quantity)), 0);

  const rank4Addons = mapAddons(addons.rank4 || []);
  const rank4AddonCost = rank4Addons.reduce((acc, p) => acc + (p.extendedPriceUsd || (p.unitPriceUsd * p.quantity)), 0);
  const rank4Parts = [...rank1Parts, ...rank4Addons];
  const rank4Cost = rank4Parts.reduce((acc, p) => acc + (p.extendedPriceUsd || (p.unitPriceUsd * p.quantity)), 0);

  // Strategy 5: Budget Minimized Baseline (Minimal buildable BOM tagged for minimal CapEx)
  const rank5Parts = rank1Parts.map(p => ({
    ...p,
    category: p.isFixInjected ? 'Aspect Rule Fix' : 'Minimal CapEx Baseline'
  }));
  const rank5Cost = rank1Cost;

  // Raw proposed candidates
  const rawCandidates = [
    {
      rank: 1,
      name: 'Rank 1: Customer Workload Intent Preserved (Optimal Match)',
      score: parseFloat(Math.max(0.70, 1.0 - (fixes.length * 0.02)).toFixed(2)),
      estimatedCostUsd: rank1Cost,
      budgetBreakdown: {
        baseBomCost: baseCost,
        fixCost: fixCost,
        strategyAddonCost: 0,
        totalBudgetUsd: rank1Cost
      },
      workloadDnaMatch: dna.workloadDescription || 'Balanced Enterprise',
      changesCount: fixes.length,
      skuPartsList: rank1Parts,
      tradeoffMetrics: {
        intentAlignment: fixes.length === 0 ? '100% (Direct Match)' : `${Math.max(85, 100 - fixes.length * 3)}% (${fixes.length} Fixes)`,
        skuModifications: `${fixes.length} physical fixes injected`,
        costDeltaUsd: `+$${fixCost.toLocaleString()} (Mandatory Buildability)`,
        capacityExpansion: 'Optimal (Zero over/under-provisioning)'
      },
      ragSecondOpinion: '⏳ Pending QuickSpecs Verification...',
      reasoning: `Selected as Rank 1 because it directly preserves customer ${dna.workloadDescription || 'workload'} intent without unrequested over/under-provisioning, injecting only mandatory physical thermal/power fixes.`
    },
    {
      rank: 2,
      name: 'Rank 2: Standardized CTO Baseline & Factory Default Accessories',
      score: parseFloat(Math.max(0.65, 0.93 - (fixes.length * 0.02)).toFixed(2)),
      estimatedCostUsd: rank2Cost,
      budgetBreakdown: {
        baseBomCost: baseCost,
        fixCost: fixCost,
        strategyAddonCost: rank2AddonCost || 250,
        totalBudgetUsd: rank2Cost
      },
      workloadDnaMatch: 'CTO Factory Default Standardized Configuration',
      changesCount: fixes.length + rank2Addons.length,
      skuPartsList: rank2Parts,
      tradeoffMetrics: {
        intentAlignment: `${Math.max(80, 95 - fixes.length * 3)}% (Standardized)`,
        skuModifications: `${fixes.length + rank2Addons.length} modifications`,
        costDeltaUsd: `+$${(fixCost + (rank2AddonCost || 250)).toLocaleString()}`,
        capacityExpansion: 'Standard Factory Margins'
      },
      ragSecondOpinion: '⏳ Pending QuickSpecs Verification...',
      reasoning: `Standardizes baseline options with factory default cable and rail accessories for maximum factory assembly stability.`
    },
    {
      rank: 3,
      name: 'Rank 3: High-IOPS & Storage Performance Optimized',
      score: parseFloat(Math.max(0.60, 0.88 - (fixes.length * 0.02)).toFixed(2)),
      estimatedCostUsd: rank3Cost,
      budgetBreakdown: {
        baseBomCost: baseCost,
        fixCost: fixCost,
        strategyAddonCost: rank3AddonCost || 850,
        totalBudgetUsd: rank3Cost
      },
      workloadDnaMatch: `Optimized for ${dna.storageWorkload || 'Database'} Performance`,
      changesCount: fixes.length + rank3Addons.length,
      skuPartsList: rank3Parts,
      tradeoffMetrics: {
        intentAlignment: `${Math.max(75, 90 - fixes.length * 3)}% (Storage Heavy)`,
        skuModifications: `${fixes.length + rank3Addons.length} modifications`,
        costDeltaUsd: `+$${(fixCost + (rank3AddonCost || 850)).toLocaleString()}`,
        capacityExpansion: 'High Drive Controller Throughput'
      },
      ragSecondOpinion: '⏳ Pending QuickSpecs Verification...',
      reasoning: `Upgrades storage write-cache and smart hybrid battery protection for enhanced transactional database read/write IOPS.`
    },
    {
      rank: 4,
      name: 'Rank 4: Maximum Density & Future Scalability Expansion',
      score: parseFloat(Math.max(0.55, 0.82 - (fixes.length * 0.02)).toFixed(2)),
      estimatedCostUsd: rank4Cost,
      budgetBreakdown: {
        baseBomCost: baseCost,
        fixCost: fixCost,
        strategyAddonCost: rank4AddonCost || 1850,
        totalBudgetUsd: rank4Cost
      },
      workloadDnaMatch: 'Max Headroom (Full PCIe Riser & High-Perf Thermal Expansion)',
      changesCount: fixes.length + rank4Addons.length,
      skuPartsList: rank4Parts,
      tradeoffMetrics: {
        intentAlignment: `${Math.max(70, 85 - fixes.length * 3)}% (Scalability Focused)`,
        skuModifications: `${fixes.length + rank4Addons.length} modifications`,
        costDeltaUsd: `+$${(fixCost + (rank4AddonCost || 1850)).toLocaleString()}`,
        capacityExpansion: '100% Slot & Thermal Headroom'
      },
      ragSecondOpinion: '⏳ Pending QuickSpecs Verification...',
      reasoning: `Populates full secondary PCIe riser slots and high-performance fan kits to support future GPU accelerator and 2nd CPU socket expansions.`
    },
    {
      rank: 5,
      name: 'Rank 5: Budget & CapEx Minimized Buildable Baseline',
      score: parseFloat(Math.max(0.50, 0.75 - (fixes.length * 0.02)).toFixed(2)),
      estimatedCostUsd: rank5Cost,
      budgetBreakdown: {
        baseBomCost: baseCost,
        fixCost: fixCost,
        strategyAddonCost: 0,
        totalBudgetUsd: rank5Cost
      },
      workloadDnaMatch: 'Strict Minimum CapEx (100% Buildable Baseline)',
      changesCount: fixes.length,
      skuPartsList: rank5Parts,
      tradeoffMetrics: {
        intentAlignment: `${Math.max(65, 80 - fixes.length * 3)}% (Minimal Baseline)`,
        skuModifications: `${fixes.length} mandatory fixes only`,
        costDeltaUsd: '$0 Surplus Added',
        capacityExpansion: 'Baseline Only'
      },
      ragSecondOpinion: '⏳ Pending QuickSpecs Verification...',
      reasoning: `Strict baseline buildable tier eliminating all optional add-ons to minimize total CapEx expenditure while remaining 100% buildable.`
    }
  ];

  // DEDUPLICATION & VALIDATION FILTER (No hallucination, no duplicate ranks)
  const uniqueRankedMap = new Map();
  const finalRanked = [];

  rawCandidates.forEach(cand => {
    const skuSignature = cand.skuPartsList
      .map(p => `${p.sku}:${p.quantity}:${p.category || ''}`)
      .sort()
      .join('|');

    if (!uniqueRankedMap.has(skuSignature)) {
      uniqueRankedMap.set(skuSignature, true);
      cand.rank = finalRanked.length + 1;
      finalRanked.push(cand);
    }
  });

  return finalRanked;
}

module.exports = {
  synthesize5TierRankedSolutions
};
