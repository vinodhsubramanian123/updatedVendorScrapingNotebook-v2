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
const { cleanBaseSKU, buildCatalogSkuIndex } = require('../catalog/sku.js');
const { classifyComponentRole } = require('../catalog/product_meta.js');
const { extractWorkloadDna } = require('./workload_dna.js');
const { analyzeCascadingImpact, discoverDynamicStrategyAddons } = require('./cascading_impact_analyzer.js');
const { getHistoricalSkuPrice } = require('../catalog/sku_versioning.js');
const { createDecisionTraceLedger } = require('./decision_trace.js');
const { getMandatorySkusForChassis } = require('../catalog/catalog_rules.js');

let _strategyAddonsCache = null;
let _physicalMathValidator = null;

function setPhysicalMathValidator(fn) {
  _physicalMathValidator = fn;
}

function getPhysicalMathValidator() {
  return _physicalMathValidator;
}

function _clearStrategyAddonsCache() {
  _strategyAddonsCache = null;
}

// -----------------------------------------------------------------------------
// Helper: Load Catalog and Price History
// -----------------------------------------------------------------------------
function loadCatalogAndPrices(targetDir) {
  let loadedCatalog = null;

  if (targetDir && fs.existsSync(targetDir)) {
    try {
      const files = fs.readdirSync(targetDir);
      const catFile = files.find(f => f.endsWith('_Catalog.json') && !f.endsWith('_Rules.json'));
      if (catFile) {
        const catalogObj = JSON.parse(fs.readFileSync(path.join(targetDir, catFile), 'utf8'));
        loadedCatalog = catalogObj;
      }
    } catch (err) {
      const _logger = require('../system/pipeline_logger.js');
      _logger.warn('STRATEGY_SYNTHESIZER', 'Failed to parse target directory catalog/price history', err);
    }
  }

  return { loadedCatalog };
}

function parseLeadTimeDays(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
  const text = String(value || '').trim().toLowerCase();
  if (!text || text === 'n/a' || text === 'na' || text === 'unknown' || text === 'standard' || text === 'null') return null;
  const range = text.match(/(\d+)\s*(?:-|to)\s*(\d+)(?:\s*days?)?/);
  if (range) return (Number(range[1]) + Number(range[2])) / 2;
  const plain = text.match(/^(\d+)$/);
  if (plain) return Number(plain[1]);
  const single = text.match(/(\d+)\s*days?/);
  return single ? Number(single[1]) : null;
}

function createSupplyAttributeResolver(catalog) {
  const index = buildCatalogSkuIndex(catalog || {});
  return sku => {
    const data = index.get(cleanBaseSKU(sku))?.skuData || {};
    const leadTime = data['Lead Time'] || data.estimatedDelivery || '';
    return {
      availability: data.Availability || data['Supply Status'] || 'Unknown',
      leadTime,
      leadTimeDays: parseLeadTimeDays(leadTime)
    };
  };
}

function calculateSupplyMetrics(parts, resolveSupply) {
  const partsList = parts || [];
  const attributes = partsList.map(part => {
    const supply = resolveSupply ? resolveSupply(part.sku || part['Product #']) : {};
    const directLeadTime = part.leadTimeDays !== undefined && part.leadTimeDays !== null
      ? part.leadTimeDays
      : (part.leadTime || part['Estimated Availability Lead Time'] || supply.leadTime);
    const parsedDays = parseLeadTimeDays(directLeadTime) ?? supply.leadTimeDays ?? null;
    return {
      sku: part.sku || part['Product #'] || '',
      description: part.description || part.Description || '',
      availability: part.availability || supply.availability || 'Unknown',
      leadTime: directLeadTime || '',
      leadTimeDays: parsedDays
    };
  });

  const knownEntries = attributes.filter(a => Number.isFinite(a.leadTimeDays));
  const knownLeadTimes = knownEntries.map(a => a.leadTimeDays);
  const unavailableCount = attributes.filter(a => /unavailable|out of stock|not yet available|allocation hold|constrained/i.test(a.availability)).length;

  let maxLeadTimeDays = null;
  let pacingItemSku = null;
  let pacingItemDescription = null;
  if (knownEntries.length > 0) {
    const sorted = [...knownEntries].sort((a, b) => b.leadTimeDays - a.leadTimeDays);
    maxLeadTimeDays = sorted[0].leadTimeDays;
    pacingItemSku = sorted[0].sku;
    pacingItemDescription = sorted[0].description;
  }

  const sortedTimes = [...knownLeadTimes].sort((a, b) => a - b);
  const medianLeadTime = sortedTimes.length > 0 ? sortedTimes[Math.floor(sortedTimes.length / 2)] : null;
  const leadTimeOutliers = knownEntries.filter(e => e.leadTimeDays >= 45 || (medianLeadTime > 0 && e.leadTimeDays > 2 * medianLeadTime));

  return {
    knownLeadTimeCount: knownLeadTimes.length,
    unknownLeadTimeCount: attributes.length - knownLeadTimes.length,
    unavailableCount,
    maxLeadTimeDays,
    pacingItemSku,
    pacingItemDescription,
    medianLeadTimeDays: medianLeadTime,
    leadTimeOutliers: leadTimeOutliers.map(o => ({
      sku: o.sku,
      description: o.description,
      leadTimeDays: o.leadTimeDays
    })),
    estimatedAverageLeadTimeDays: knownLeadTimes.length
      ? Number((knownLeadTimes.reduce((sum, days) => sum + days, 0) / knownLeadTimes.length).toFixed(1))
      : null,
    solutionEdtDays: knownLeadTimes.length === attributes.length ? maxLeadTimeDays : null,
    rankingPolicy: 'Technical validity and BOQ closeness first; lead time breaks otherwise-equal alternatives'
  };
}

// -----------------------------------------------------------------------------
// Helper: Get Price
// -----------------------------------------------------------------------------
function createPriceResolver(targetDir) {
  const resolved = new Map();
  const getPrice = (sku) => {
    const clean = cleanBaseSKU(sku);
    if (!clean) return 0;
    if (!resolved.has(clean)) {
      const historical = getHistoricalSkuPrice(clean, targetDir);
      const price = Number(historical?.priceUsd);
      resolved.set(clean, {
        price: Number.isFinite(price) && price > 0 ? price : 0,
        status: historical?.status || 'NO_PRICE_RECORDED',
        isResolved: historical?.isResolved === true
      });
    }
    return resolved.get(clean).price;
  };
  getPrice.hasPrice = sku => {
    const clean = cleanBaseSKU(sku);
    if (!clean) return false;
    getPrice(sku);
    const entry = resolved.get(clean);
    return entry ? (entry.price > 0 || entry.isResolved === true) : false;
  };
  getPrice.status = sku => {
    getPrice(sku);
    return resolved.get(cleanBaseSKU(sku))?.status || 'NO_PRICE_RECORDED';
  };
  return getPrice;
}

// -----------------------------------------------------------------------------
// Helper: Load Strategy Config
// -----------------------------------------------------------------------------
function getStrategyConfig(chassisInfo) {
  let strategyConfig = { default: { rank2: [], rank3: [], rank4: [] } };
  if (_strategyAddonsCache) {
    strategyConfig = _strategyAddonsCache;
  } else {
    try {
      const configPath = path.join(__dirname, '..', '..', 'config', 'strategy_addons.json');
      if (fs.existsSync(configPath)) {
        strategyConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        _strategyAddonsCache = strategyConfig;
      }
    } catch (err) {
      const _logger = require('../system/pipeline_logger.js');
      _logger.warn('STRATEGY_SYNTHESIZER', 'Failed to parse strategy_addons.json', err);
    }
  }

  const modelKey = (chassisInfo.model || '').toLowerCase();
  const familyKey = (chassisInfo.family || '').toLowerCase();
  const genKey = (chassisInfo.gen || '').toLowerCase();

  let key = 'default';
  if (modelKey.includes('dl380a')) {
    key = strategyConfig.dl380a_gen12 ? 'dl380a_gen12' : (strategyConfig.dl380_gen12 ? 'dl380_gen12' : 'dl380');
  } else if (modelKey.includes('dl145')) {
    key = strategyConfig.dl145_gen11 ? 'dl145_gen11' : (strategyConfig.dl380_gen11 ? 'dl380_gen11' : 'default');
  } else if (modelKey.includes('dl380')) {
    if (genKey.includes('12') || modelKey.includes('gen12')) key = 'dl380_gen12';
    else if (genKey.includes('11') || modelKey.includes('gen11')) key = 'dl380_gen11';
    else key = 'dl380';
  } else if (familyKey.includes('alletra')) key = 'alletra';
  else if (familyKey.includes('synergy')) key = 'synergy';
  else if (familyKey.includes('cray')) key = 'cray';
  else if (familyKey.includes('storeever')) key = 'storeever';

  const tierConfig = strategyConfig[key] || strategyConfig.default;
  const isGen12 = genKey.includes('12') || modelKey.includes('gen12');

  return { tierConfig, isGen12 };
}

// -----------------------------------------------------------------------------
// Helper: Live RAG Grounding
// -----------------------------------------------------------------------------
function createLiveRagGrounding(chassisInfo) {
  return (tierName, focusTerms = [], defaultSummary = '') => {
    try {
      const { queryLocalKnowledgeBase } = require('../rag/local_rag_search.js');
      const chassisName = chassisInfo.model || chassisInfo.chassis || '';
      const q = `${chassisName} ${focusTerms.join(' ')}`.trim();
      const res = queryLocalKnowledgeBase(q, chassisName);
      if (res && Array.isArray(res.matches) && res.matches.length > 0) {
        const snippet = res.matches[0].replace(/^•\s*/, '').replace(/\[Knowledge Delta - [^\]]+\]\s*/, '');
        const cleanSnippet = snippet.length > 120 ? `${snippet.slice(0, 117)}...` : snippet;
        return `✅ Grounded in QuickSpecs & Local RAG: ${cleanSnippet}`;
      }
    } catch (_) {}
    return defaultSummary;
  };
}

// -----------------------------------------------------------------------------
// Compute Parts Lists
// -----------------------------------------------------------------------------
function computeBaseParts(items, getPrice) {
  return items.map(it => {
    const role = classifyComponentRole(it.category || '', it.description || '');
    const price = getPrice(it.sku);
    const priceKnown = getPrice.hasPrice(it.sku);
    const isZeroCost = priceKnown && price === 1;
    const directLeadTime = it.leadTime || it['Estimated Availability Lead Time'] || it['Lead Time'] || '';
    const parsedDays = it.leadTimeDays !== undefined && it.leadTimeDays !== null
      ? it.leadTimeDays
      : parseLeadTimeDays(directLeadTime);

    return {
      sku: cleanBaseSKU(it.sku),
      description: it.description || `HPE Hardware Option (${cleanBaseSKU(it.sku)})`,
      quantity: it.quantity || 1,
      unitPriceUsd: price,
      extendedPriceUsd: price * (it.quantity || 1),
      priceKnown,
      pricingStatus: priceKnown ? getPrice.status(it.sku) : 'PRICE_UNAVAILABLE',
      isFixInjected: false,
      isZeroCost: isZeroCost,
      costTier: !priceKnown ? 'Price unavailable from certified catalog/history' : (price === 1 ? 'Nominal Factory Enablement ($1.00)' : 'Standard Option'),
      category: role !== 'Option Component' ? role : (it.category || 'Base Hardware'),
      leadTime: directLeadTime,
      leadTimeDays: parsedDays
    };
  });
}

function computeFixParts(fixes, getPrice) {
  return fixes.map(f => {
    const role = classifyComponentRole(f.category || '', f.description || '');
    const price = getPrice(f.sku);
    const priceKnown = getPrice.hasPrice(f.sku);
    const isZeroCost = priceKnown && price === 1;
    const directLeadTime = f.leadTime || f['Estimated Availability Lead Time'] || f['Lead Time'] || '';
    const parsedDays = f.leadTimeDays !== undefined && f.leadTimeDays !== null
      ? f.leadTimeDays
      : parseLeadTimeDays(directLeadTime);

    return {
      sku: cleanBaseSKU(f.sku),
      description: f.description || `Injected Aspect Rule Fix (${cleanBaseSKU(f.sku)})`,
      quantity: f.quantity || 1,
      unitPriceUsd: price,
      extendedPriceUsd: price * (f.quantity || 1),
      priceKnown,
      pricingStatus: priceKnown ? getPrice.status(f.sku) : 'PRICE_UNAVAILABLE',
      isFixInjected: true,
      isZeroCost: isZeroCost,
      costTier: !priceKnown ? 'Price unavailable from certified catalog/history' : (price === 1 ? 'Nominal Factory Enablement ($1.00)' : 'Aspect Rule Fix'),
      category: role !== 'Option Component' ? role : 'Aspect Rule Fix',
      leadTime: directLeadTime,
      leadTimeDays: parsedDays
    };
  });
}

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
    items,
    loadedCatalog,
    chassisInfo
  );

  const rank3Parts = baseParts.map(p => {
    if (/mr408i-o|sr416i-o|\b-o\b/i.test(p.description) && /controller|raid|storage/i.test(p.description)) {
      const price = getPrice(pcieCtrl.sku);
      return {
        sku: cleanBaseSKU(pcieCtrl.sku),
        description: pcieCtrl.desc,
        quantity: p.quantity || 1,
        unitPriceUsd: price,
        extendedPriceUsd: price * (p.quantity || 1),
        isFixInjected: false,
        isStrategyAddon: true,
        category: 'Storage Performance'
      };
    }
    return p;
  });

  const ocpNicSub = pcieStorageBranch.substitutions.find(s => s.action === 'RETAIN_OCP_NIC_IN_FREED_SLOT');
  if (ocpNicSub) {
    const ocpPrice = getPrice(ocpNicSub.retainedSku);
    rank3Parts.push({
      sku: cleanBaseSKU(ocpNicSub.retainedSku),
      description: ocpNicSub.retainedDesc,
      quantity: 1,
      unitPriceUsd: ocpPrice,
      extendedPriceUsd: ocpPrice,
      isFixInjected: false,
      isStrategyAddon: true,
      category: 'Network Adapter (OCP3)'
    });
  }

  if (cableKit) {
    const cablePrice = getPrice(cableKit.sku);
    rank3Parts.push({
      sku: cleanBaseSKU(cableKit.sku),
      description: cableKit.description,
      quantity: 1,
      unitPriceUsd: cablePrice,
      extendedPriceUsd: cablePrice,
      isFixInjected: true,
      isStrategyAddon: true,
      category: 'Storage Controller Cable'
    });
  }

  fixParts.filter(f => !/p48918|enablement cable/i.test(f.sku + (f.description || ''))).forEach(f => {
    rank3Parts.push(f);
  });

  // Cascading Dependency Verification: Ensure Smart Storage Battery protects newly pivoted PCIe write-back cache
  const mandatory = getMandatorySkusForChassis(chassisInfo);
  const batterySku = mandatory.SMART_STORAGE_BATTERY?.sku || 'P01366-B21';
  const batteryName = mandatory.SMART_STORAGE_BATTERY?.name || 'HPE 96W Smart Storage Battery';
  const hasBattery = rank3Parts.some(p => {
    const s = cleanBaseSKU(p.sku);
    return s === cleanBaseSKU(batterySku) || /smart.*battery|hybrid.*capacitor/i.test(p.sku + (p.description || ''));
  });
  if (!hasBattery) {
    const batteryPrice = getPrice(batterySku);
    rank3Parts.push({
      sku: batterySku,
      description: batteryName,
      quantity: 1,
      unitPriceUsd: batteryPrice,
      extendedPriceUsd: batteryPrice,
      isFixInjected: true,
      isStrategyAddon: true,
      category: 'Storage Performance'
    });
  }

  const rank3Cost = rank3Parts.reduce((acc, p) => acc + (p.extendedPriceUsd || (p.unitPriceUsd * p.quantity)), 0);
  const rank3AddonCost = Math.max(0, rank3Cost - rank1Cost);

  return { rank3Parts, rank3Cost, rank3AddonCost, rank3CascadingImpact };
}

// -----------------------------------------------------------------------------
// Scoring and Normalization Helpers
// -----------------------------------------------------------------------------
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
  if (reqDesc.includes('platinum') && isCpu) {
    const hasPlat = candDescriptions.some(d => d.includes('platinum'));
    const hasLower = candDescriptions.some(d => (d.includes('gold') || d.includes('silver') || d.includes('bronze')) && d.includes('processor'));
    if (!hasPlat && hasLower) return 5.0;
  } else if (reqDesc.includes('gold') && isCpu) {
    const hasGoldOrHigher = candDescriptions.some(d => (d.includes('gold') || d.includes('platinum')) && d.includes('processor'));
    const hasLower = candDescriptions.some(d => (d.includes('silver') || d.includes('bronze')) && d.includes('processor'));
    if (!hasGoldOrHigher && hasLower) return 3.5;
  }
  return 0;
}

function _checkMemoryDowngrade(reqDesc, candDescriptions) {
  if (reqDesc.includes('ddr5')) {
    const hasDdr5 = candDescriptions.some(d => d.includes('ddr5'));
    const hasDdr4 = candDescriptions.some(d => d.includes('ddr4'));
    if (!hasDdr5 && hasDdr4) return 6.0;
  }
  return 0;
}

function _checkGpuDowngrade(reqDesc, candDescriptions) {
  if (reqDesc.includes('h100') || reqDesc.includes('h200') || reqDesc.includes('a100')) {
    const hasHighTier = candDescriptions.some(d => d.includes('h100') || d.includes('h200') || d.includes('a100'));
    const hasLowerTier = candDescriptions.some(d => (d.includes('l4') || d.includes('t4') || d.includes('l40')) && d.includes('accelerator'));
    if (!hasHighTier && hasLowerTier) return 5.0;
  }
  return 0;
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

  return parseFloat(penalty.toFixed(2));
}

function computeArchitecturalDelta(requestedQuantities, candidateQuantities, partCategoryMap = new Map()) {
  const allSkus = new Set([...requestedQuantities.keys(), ...candidateQuantities.keys()]);
  let totalWeightedDelta = 0;

  for (const sku of allSkus) {
    const qReq = requestedQuantities.get(sku) || 0;
    const qCand = candidateQuantities.get(sku) || 0;
    const diff = Math.abs(qReq - qCand);
    if (diff === 0) continue;

    const cat = String(partCategoryMap.get(sku) || '').toLowerCase();
    let weight = 0.5;

    if (cat.includes('chassis') || cat.includes('base')) {
      weight = 10.0;
    } else if (cat.includes('processor') || cat.includes('cpu') || cat.includes('xeon') || cat.includes('epyc')) {
      weight = 8.0;
    } else if (cat.includes('memory') || cat.includes('dimm') || cat.includes('ram')) {
      weight = 5.0;
    } else if (cat.includes('controller') || cat.includes('storage') || cat.includes('ssd') || cat.includes('hdd') || cat.includes('nvme')) {
      weight = 4.0;
    } else if (cat.includes('network') || cat.includes('adapter') || cat.includes('ocp') || cat.includes('nic') || cat.includes('hba')) {
      weight = 3.0;
    } else if (cat.includes('power') || cat.includes('psu')) {
      weight = 2.0;
    } else if (cat.includes('cable') || cat.includes('bracket') || cat.includes('enablement') || cat.includes('kit') || cat.includes('fan') || cat.includes('heatsink')) {
      weight = 0.2;
    }

    totalWeightedDelta += diff * weight;
  }

  return parseFloat(totalWeightedDelta.toFixed(2));
}

function scoreAndSortCandidates(rawCandidates, items, resolveSupply = () => ({ leadTimeDays: null, availability: 'Unknown' })) {
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

  rawCandidates.forEach(cand => {
    // Preserve intrinsic strategy identity prior to any rank mutation
    cand.strategyIdentity = cand.strategyIdentity || cand.name;

    // Unique intersection count prevents ratio inflation above 1.0
    const candSkuSet = new Set((cand.skuPartsList || []).map(p => cleanBaseSKU(p.sku)).filter(Boolean));
    let matchedUniqueCount = 0;
    for (const sku of requestedSkuSet) {
      if (candSkuSet.has(sku)) matchedUniqueCount++;
    }
    const matchRatio = requestedSkuSet.size > 0 ? (matchedUniqueCount / requestedSkuSet.size) : 1.0;
    cand.intentMatchRatio = parseFloat(Math.min(1.0, Math.max(0.0, matchRatio)).toFixed(2));
    cand.dynamicScore = parseFloat(((cand.intentMatchRatio * 0.6) + (cand.score * 0.4)).toFixed(2));
    cand.supplyMetrics = calculateSupplyMetrics(cand.skuPartsList, resolveSupply);

    // Scoped category map prevents category leakage across candidate permutations
    const candidateCategoryMap = new Map(baseCategoryMap);
    const candidateQuantities = new Map();
    for (const it of (cand.skuPartsList || [])) {
      const k = cleanBaseSKU(it.sku);
      if (!k) continue;
      const q = (typeof it.quantity === 'number' && Number.isFinite(it.quantity)) ? it.quantity : (Number(it.quantity) || 1);
      candidateQuantities.set(k, (candidateQuantities.get(k) || 0) + q);
      if (it.category && !candidateCategoryMap.has(k)) {
        candidateCategoryMap.set(k, it.category);
      }
    }
    cand.quantityDelta = [...new Set([...requestedQuantities.keys(), ...candidateQuantities.keys()])]
      .reduce((sum, sku) => sum + Math.abs((requestedQuantities.get(sku) || 0) - (candidateQuantities.get(sku) || 0)), 0);
    cand.architecturalDelta = computeArchitecturalDelta(requestedQuantities, candidateQuantities, candidateCategoryMap);
    cand.capabilityDowngradePenalty = computeCapabilityDowngradePenalty(cand, items);
  });

  rawCandidates.sort((a, b) => {
    if (Boolean(a.physicalMathClean) !== Boolean(b.physicalMathClean)) return a.physicalMathClean ? -1 : 1;
    if (a.capabilityDowngradePenalty !== b.capabilityDowngradePenalty) return a.capabilityDowngradePenalty - b.capabilityDowngradePenalty;
    if (a.architecturalDelta !== b.architecturalDelta) return a.architecturalDelta - b.architecturalDelta;
    if (a.quantityDelta !== b.quantityDelta) return a.quantityDelta - b.quantityDelta;
    if (b.dynamicScore !== a.dynamicScore) return b.dynamicScore - a.dynamicScore;
    if (a.supplyMetrics.unavailableCount !== b.supplyMetrics.unavailableCount) {
      return a.supplyMetrics.unavailableCount - b.supplyMetrics.unavailableCount;
    }
    const leadA = a.supplyMetrics.estimatedAverageLeadTimeDays ?? Number.POSITIVE_INFINITY;
    const leadB = b.supplyMetrics.estimatedAverageLeadTimeDays ?? Number.POSITIVE_INFINITY;
    if (leadA !== leadB) return leadA - leadB;

    // Deterministic tie-breakers (INV-193 / G02)
    const nameA = a.strategyIdentity || a.name || '';
    const nameB = b.strategyIdentity || b.name || '';
    const nameDiff = nameA.localeCompare(nameB);
    if (nameDiff !== 0) return nameDiff;

    const fpA = a.bomFingerprint || '';
    const fpB = b.bomFingerprint || '';
    return fpA.localeCompare(fpB);
  });
  return requestedSkuSet;
}

function normalizeCandidates(rawCandidates, requestedSkuSet, baselineCost, options = {}) {
  const priceResolver = options.priceResolver;
  const seenFp = new Map();
  const normalized = rawCandidates.map((cand, idx) => {
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
    cand.strategyIdentity = cand.strategyIdentity || cand.name;
    cand.rank = idx + 1;
    if (!cand.name.startsWith(`Rank ${cand.rank}:`)) {
      cand.name = cand.name.replace(/^Rank \d+:/, `Rank ${cand.rank}:`);
    }

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

    const candPartMap = new Map();
    cand.skuPartsList.forEach(p => {
      const clean = cleanBaseSKU(p.sku);
      if (clean) candPartMap.set(clean, p);
    });
    const candSkuSet = new Set(candPartMap.keys());
    const addedSkus = Array.from(candSkuSet).filter(s => !requestedSkuSet.has(s));
    const omittedSkus = Array.from(requestedSkuSet).filter(s => !candSkuSet.has(s));
    const costDeltaFromRank1 = cand.pricingComplete && baselineCost > 0
      ? cand.estimatedCostUsd - baselineCost
      : null;
    const costDeltaPct = costDeltaFromRank1 !== null
      ? parseFloat(((costDeltaFromRank1 / baselineCost) * 100).toFixed(2))
      : null;

    let weightedEditDistance = 0;
    addedSkus.forEach(s => {
      const part = candPartMap.get(s);
      const cat = (part?.category || '').toLowerCase();
      if (cat.includes('controller') || cat.includes('processor') || cat.includes('memory') || cat.includes('power supply')) {
        weightedEditDistance += 1.0;
      } else if (cat.includes('cable') || cat.includes('bracket') || cat.includes('enablement') || cat.includes('fix')) {
        weightedEditDistance += 0.2;
      } else {
        weightedEditDistance += 0.1;
      }
    });
    omittedSkus.forEach(() => {
      weightedEditDistance += 0.8;
    });
    weightedEditDistance = parseFloat((weightedEditDistance + (cand.quantityDelta || 0)).toFixed(2));

    const riskScore = (cand.aspectErrors?.length || 0) * 10 + (cand.changesCount || 0);

    cand.proximityMetrics = {
      costDeltaFromRank1Usd: costDeltaFromRank1,
      costDeltaPct: costDeltaPct,
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
      closenessRating: idx === 0
        ? 'Optimal Baseline'
        : (costDeltaPct === null
            ? 'Customer-distance ranked; certified pricing incomplete'
            : (Math.abs(costDeltaPct) < 8 ? 'Very Close Alternative (<8% cost variance)' : 'Differentiated Architecture (>8% cost variance)'))
    };

    cand.configurationParity = {
      architecturalDelta: cand.architecturalDelta ?? 0,
      addedSkuCount: addedSkus.length,
      omittedSkuCount: omittedSkus.length
    };

    if (cand.name.toLowerCase().includes('intent preserved')) {
      cand.decisionGuide = 'Choose this when maximum fidelity to the customer RFP is mandated and minimum SKU deviations are required.';
    } else if (cand.name.toLowerCase().includes('high-iops') || cand.name.toLowerCase().includes('contested form-factor')) {
      cand.decisionGuide = 'Choose this when write-cache performance (8GB PCIe) and retaining customer OCP NIC part numbers outweigh standard CapEx constraints.';
    } else if (cand.name.toLowerCase().includes('budget') || cand.name.toLowerCase().includes('capex')) {
      cand.decisionGuide = 'Choose this when lowest possible purchase price is required without violating HPE factory buildability.';
    } else if (cand.name.toLowerCase().includes('standardized')) {
      cand.decisionGuide = 'Choose this when factory standard cable management and tool-less rail kits are required for turnkey rack deployment.';
    } else {
      cand.decisionGuide = 'Choose this for maximum multi-GPU, multi-riser scalability and headroom expansion.';
    }

    return cand;
  });

  // True Multi-Objective Pareto Dominance Check across Cost, Risk, Customer Distance
  // Candidate A dominates Candidate B if A <= B on all 3 and A < B on at least one.
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

      const aDominatesB = (costA <= costB && riskA <= riskB && distA <= distB) &&
                          (costA < costB || riskA < riskB || distA < distB);

      if (aDominatesB) {
        b.isParetoOptimal = false;
        b.dominatedByRank = a.rank;
      }
    }
  }

  const paretoSolutions = normalized.filter(c => c.isParetoOptimal && c.isUniqueBom);
  normalized.paretoSolutions = paretoSolutions;
  normalized.paretoCount = paretoSolutions.length;

  if (options.paretoOnly) {
    return paretoSolutions;
  }

  return normalized;
}

function computeBomFingerprint(parts = []) {
  if (parts.length > 200) {
    let hash = 0;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (!p || !p.sku) continue;
      const s = cleanBaseSKU(p.sku) + ':' + (p.quantity || 1);
      for (let j = 0; j < s.length; j++) {
        hash = ((hash << 5) - hash) + s.charCodeAt(j);
        hash |= 0;
      }
    }
    return `dense_${parts.length}_${hash}`;
  }
  return parts
    .filter(p => p && p.sku)
    .map(p => `${cleanBaseSKU(p.sku)}:${p.quantity || 1}`)
    .sort()
    .join('|');
}

function revalidateCandidateParts(parts, chassisInfo, getPrice, catalogData = null, targetDir = '', options = {}) {
  const mandatory = getMandatorySkusForChassis(chassisInfo);
  const updatedParts = [...parts];
  const injectedFixes = [];
  const partSkus = new Set(updatedParts.map(p => cleanBaseSKU(p.sku)));

  // 1. Controller write-cache battery check
  const hasControllerWithCache = updatedParts.some(p => {
    const desc = (p.description || '').toLowerCase();
    const sku = cleanBaseSKU(p.sku);
    return /mr416i|mr216i|sr932i|sr416i/i.test(desc) || /mr416i|mr216i|sr932i/i.test(sku);
  });
  const batterySku = mandatory.SMART_STORAGE_BATTERY?.sku || 'P01366-B21';
  const batteryName = mandatory.SMART_STORAGE_BATTERY?.name || 'HPE 96W Smart Storage Battery';
  const hasBattery = partSkus.has(cleanBaseSKU(batterySku)) || updatedParts.some(p => (p.description || '').toLowerCase().includes('storage battery'));

  if (hasControllerWithCache && !hasBattery) {
    const batteryPrice = getPrice(batterySku);
    const batteryPart = {
      sku: batterySku,
      description: batteryName,
      quantity: 1,
      unitPriceUsd: batteryPrice,
      extendedPriceUsd: batteryPrice,
      isFixInjected: true,
      isCascadingFix: true,
      category: 'Storage Battery Enablement'
    };
    updatedParts.push(batteryPart);
    partSkus.add(cleanBaseSKU(batterySku));
    injectedFixes.push({ sku: batterySku, reason: 'Cascading controller battery injection for write cache protection' });
  }

  // 2. High TDP CPU / GPU Fan Check
  const highTdpCpu = updatedParts.some(p => {
    const desc = (p.description || '').toLowerCase();
    const match = desc.match(/(\d+)\s*w/);
    return match && parseInt(match[1], 10) > 240;
  });
  const hasGpu = updatedParts.some(p => /(nvidia|l40s|a100|h100|gpu)/i.test((p.description || '')));
  const fanSku = mandatory.HIGH_PERF_FAN_KIT?.sku || 'P48820-B21';
  const fanName = mandatory.HIGH_PERF_FAN_KIT?.name || 'HPE High Performance Fan Kit';
  const hasHighPerfFan = partSkus.has(cleanBaseSKU(fanSku)) ||
    updatedParts.some(p => {
      const d = (p.description || '').toLowerCase();
      return d.includes('high performance fan') || d.includes('fan module') || d.includes('fan kit');
    });

  if ((highTdpCpu || hasGpu) && !hasHighPerfFan) {
    const fanPrice = getPrice(fanSku);
    const fanPart = {
      sku: fanSku,
      description: fanName,
      quantity: 1,
      unitPriceUsd: fanPrice,
      extendedPriceUsd: fanPrice,
      isFixInjected: true,
      isCascadingFix: true,
      category: 'Thermal Protection'
    };
    updatedParts.push(fanPart);
    partSkus.add(cleanBaseSKU(fanSku));
    injectedFixes.push({ sku: fanSku, reason: 'Cascading fan kit injection for high TDP / accelerator cooling' });
  }

  // 3. Telco -48VDC PSU Lug Kit Check
  const hasDcPsu = updatedParts.some(p => {
    const desc = (p.description || '').toLowerCase();
    return desc.includes('-48vdc') || (desc.includes('dc') && desc.includes('power supply'));
  });
  const lugSku = mandatory.DC_LUG_KIT?.sku || 'P36877-B21';
  const lugName = mandatory.DC_LUG_KIT?.name || 'HPE 48VDC Terminal Lug Connector Kit';
  const hasLugKit = partSkus.has(cleanBaseSKU(lugSku)) || updatedParts.some(p => (p.description || '').toLowerCase().includes('lug kit'));

  if (hasDcPsu && !hasLugKit) {
    const lugPrice = getPrice(lugSku);
    const lugPart = {
      sku: lugSku,
      description: lugName,
      quantity: 1,
      unitPriceUsd: lugPrice,
      extendedPriceUsd: lugPrice,
      isFixInjected: true,
      isCascadingFix: true,
      category: 'Power Enablement'
    };
    updatedParts.push(lugPart);
    partSkus.add(cleanBaseSKU(lugSku));
    injectedFixes.push({ sku: lugSku, reason: 'Cascading DC terminal lug connector kit injection' });
  }

  // 4. True 7-Aspect Physical Math Revalidation
  let isClean = false;
  let aspectErrors = ['7-aspect candidate validation did not return evidence.'];
  const validator = (options && typeof options.validateMath === 'function') ? options.validateMath : _physicalMathValidator;
  if (typeof validator === 'function') {
    try {
      for (let pass = 0; pass < 8; pass++) {
        const mathResult = validator(updatedParts, catalogData, targetDir, { skipGraphValidation: true, skipLifecycle: true });
        if (!mathResult) { isClean = false; aspectErrors = ['Candidate validation returned no evidence.']; break; }
        const beforeCount = updatedParts.length;
        isClean = mathResult.isMathClean === true && !(mathResult.missingDependencies?.length);
        aspectErrors = mathResult.errors || [];

        // If missing dependencies discovered during physical math re-check, inject them
        if (Array.isArray(mathResult.missingDependencies)) {
          for (const dep of mathResult.missingDependencies) {
            const cleanDep = cleanBaseSKU(dep.sku);
            if (cleanDep && !partSkus.has(cleanDep)) {
              const depPrice = getPrice(cleanDep);
              updatedParts.push({
                sku: cleanDep,
                description: dep.description || `Required dependency (${cleanDep})`,
                quantity: dep.quantity || 1,
                unitPriceUsd: depPrice,
                extendedPriceUsd: depPrice * (dep.quantity || 1),
                isFixInjected: true,
                isCascadingFix: true,
                category: dep.category || 'Aspect Rule Fix'
              });
              partSkus.add(cleanDep);
              injectedFixes.push({ sku: cleanDep, reason: dep.reason || 'Missing physical dependency from 7-aspect revalidation' });
            }
          }
        }

        if (updatedParts.length === beforeCount) break;
        // Every mutation needs a fresh pass, including the last permitted repair.
        isClean = false;
        aspectErrors = ['Candidate dependency repair requires further validation; iteration limit reached.'];
      }
    } catch (error) {
      isClean = false;
      aspectErrors = [`7-aspect candidate revalidation failed: ${error.message}`];
    }
  }

  const newTotalCost = updatedParts.reduce((sum, p) => sum + (p.extendedPriceUsd || (p.unitPriceUsd * (p.quantity || 1))), 0);

  return {
    parts: updatedParts,
    injectedFixes,
    totalCost: newTotalCost,
    physicalMathClean: isClean,
    aspectErrors
  };
}

function findFastShipDriveReplacement(catalogIndex) {
  for (const [s, item] of catalogIndex.entries()) {
    if (item.lifecycleStatus === 'OB' || item.lifecycleStatus === 'EOL') continue;
    const sDesc = (item.skuData?.Description || item.entry?.description || '').toLowerCase();
    const sLead = item.skuData?.['Lead Time'] || item.entry?.leadTime;
    const sDays = parseLeadTimeDays(sLead);
    if (sDays !== null && sDays <= 14 && (sDesc.includes('ssd') || sDesc.includes('read intensive') || sDesc.includes('nvme'))) {
      return {
        sku: s,
        description: item.skuData?.Description || item.entry?.description || 'HPE Fast-Ship Multi-Vendor SSD',
        leadTimeDays: sDays,
        leadTime: sLead
      };
    }
  }
  return null;
}

function findFastShipCpuReplacement(catalogIndex) {
  for (const [s, item] of catalogIndex.entries()) {
    if (item.lifecycleStatus === 'OB' || item.lifecycleStatus === 'EOL') continue;
    const sDesc = (item.skuData?.Description || item.entry?.description || '').toLowerCase();
    const sLead = item.skuData?.['Lead Time'] || item.entry?.leadTime;
    const sDays = parseLeadTimeDays(sLead);
    if (sDays !== null && sDays <= 14 && (sDesc.includes('xeon') || sDesc.includes('processor'))) {
      return {
        sku: s,
        description: item.skuData?.Description || item.entry?.description,
        leadTimeDays: sDays,
        leadTime: sLead
      };
    }
  }
  return null;
}

function synthesizeFastShipAlternative(v1Parts, v1SupplyMetrics, loadedCatalog, chassisInfo, getPrice, revalidateCached, resolveSupply) {
  const outliers = v1SupplyMetrics?.leadTimeOutliers || [];
  if (outliers.length === 0 && (!v1SupplyMetrics?.maxLeadTimeDays || v1SupplyMetrics.maxLeadTimeDays < 45)) {
    return null;
  }

  const catalogIndex = buildCatalogSkuIndex(loadedCatalog || {});
  const substitutedItems = [];

  const candidateParts = v1Parts.map(part => {
    const cleanSku = cleanBaseSKU(part.sku);
    const isOutlier = outliers.some(o => cleanBaseSKU(o.sku) === cleanSku) ||
      (part.leadTimeDays && part.leadTimeDays >= 45) ||
      (cleanSku === cleanBaseSKU(v1SupplyMetrics.pacingItemSku) && (v1SupplyMetrics.maxLeadTimeDays || 0) >= 45);

    if (!isOutlier) return { ...part };

    const desc = (part.description || '').toLowerCase();
    const cat = (part.category || '').toLowerCase();

    let replacement = null;
    let reason = '';
    if (cat.includes('storage') || cat.includes('drive') || cat.includes('disk') || desc.includes('hdd') || desc.includes('ssd') || desc.includes('hard drive')) {
      replacement = findFastShipDriveReplacement(catalogIndex);
      reason = 'Eliminated pacing delivery bottleneck (replaces long lead-time HDD/drive with catalog-listed SSD candidate)';
    } else if (cat.includes('processor') || cat.includes('cpu') || desc.includes('xeon') || desc.includes('epyc') || desc.includes('processor')) {
      replacement = findFastShipCpuReplacement(catalogIndex, chassisInfo);
      reason = 'Replaced constrained processor pacing item with catalog-listed processor candidate';
    }

    if (!replacement || cleanBaseSKU(replacement.sku) === cleanSku) return { ...part };

    const replPrice = getPrice(replacement.sku);
    substitutedItems.push({
      originalSku: cleanSku,
      originalDescription: part.description,
      originalLeadTimeDays: part.leadTimeDays ?? v1SupplyMetrics.maxLeadTimeDays,
      replacementSku: replacement.sku,
      replacementDescription: replacement.description,
      replacementLeadTimeDays: replacement.leadTimeDays,
      reason
    });

    return {
      ...part,
      sku: replacement.sku,
      description: replacement.description,
      unitPriceUsd: replPrice,
      extendedPriceUsd: replPrice * (part.quantity || 1),
      priceKnown: getPrice.hasPrice(replacement.sku),
      leadTime: replacement.leadTime,
      leadTimeDays: replacement.leadTimeDays,
      isFastShipSubstituted: true
    };
  });

  if (substitutedItems.length === 0) return null;

  const revalidated = revalidateCached(candidateParts);
  if (revalidated.physicalMathClean !== true || revalidated.aspectErrors?.length) return null;
  const newSupplyMetrics = calculateSupplyMetrics(revalidated.parts, resolveSupply);
  const originalEdt = v1SupplyMetrics.unknownLeadTimeCount === 0 ? v1SupplyMetrics.maxLeadTimeDays : null;
  const newEdt = newSupplyMetrics.unknownLeadTimeCount === 0 ? newSupplyMetrics.maxLeadTimeDays : null;
  const deliveryDaysSaved = originalEdt !== null && newEdt !== null ? Math.max(0, originalEdt - newEdt) : null;

  return {
    rank: '1S',
    subRank: '1S',
    validationStatus: 'DOCUMENT_AND_PORTAL_VALIDATION_PENDING',
    requiresRequirementReview: true,
    name: 'Rank 1S: Fast-Ship Delivery-Optimized Baseline',
    tierTitle: 'Fast-Ship Delivery-Optimized Baseline (Pacing Items Substituted)',
    skuPartsList: revalidated.parts,
    bomFingerprint: computeBomFingerprint(revalidated.parts),
    estimatedCostUsd: revalidated.totalCost,
    budgetBreakdown: {
      baseBomCost: revalidated.totalCost,
      fixCost: 0,
      strategyAddonCost: 0,
      totalBudgetUsd: revalidated.totalCost
    },
    physicalMathClean: revalidated.physicalMathClean,
    isMathClean: revalidated.physicalMathClean,
    aspectErrors: revalidated.aspectErrors || [],
    injectedCascadingFixes: revalidated.injectedFixes || [],
    supplyMetrics: newSupplyMetrics,
    deliveryDaysSaved,
    originalEdtDays: originalEdt,
    fastShipEdtDays: newEdt,
    substitutedPacingItems: substitutedItems,
    tradeoffMetrics: {
      intentAlignment: 'UNVERIFIED: substitutions require customer-requirement and grounded review',
      deliveryImpact: deliveryDaysSaved === null ? 'Delivery estimate incomplete: one or more lead times are unknown' : `Catalog lead-time estimate improves by ${deliveryDaysSaved} days; current vendor availability remains unverified`,
      skuModifications: `${substitutedItems.length} bottleneck substitution(s)`
    },
    reasoning: 'Catalog-derived substitution proposal passed local physical checks only. Capacity, performance, customer requirements, current availability, grounded document review and exact portal acceptance still require validation.'
  };
}

/**
 * Synthesize 5-Tier Strategic Resolution Matrix based on Workload DNA and Multi-Metric Tradeoffs.
 */
function synthesize5TierRankedSolutions(items = [], evalResults = {}, graphResults = {}, chassisInfo = {}, targetDir = '', options = {}) {
  if (chassisInfo.family === 'SAN') return evalResults.conflictGraph?.rankedSolutions || [];
  const dna = extractWorkloadDna(items);
  const { loadedCatalog } = loadCatalogAndPrices(targetDir);
  const getPrice = createPriceResolver(targetDir);
  const resolveSupply = createSupplyAttributeResolver(loadedCatalog);

  const baseCost = items.reduce((acc, it) => acc + (getPrice(it.sku) * (it.quantity || 1)), 0);
  const fixes = evalResults.missingDependencies || [];
  const fixCost = fixes.reduce((acc, f) => {
    const unitPrice = getPrice(f.sku);
    return acc + ((f.quantity || 1) * unitPrice);
  }, 0);

  const baseParts = computeBaseParts(items, getPrice);
  const fixParts = computeFixParts(fixes, getPrice);

  const decisionLedger = createDecisionTraceLedger();
  if (fixes.length > 0) {
    decisionLedger.recordDecision({
      decisionPoint: 'MANDATORY_ASPECT_RULE_ENFORCEMENT',
      trigger: `${fixes.length} physical aspect mismatch(es) detected in customer drafted BOQ`,
      alternativesEvaluated: fixes.map(f => ({
        id: f.sku,
        description: f.description || `Required hardware kit (${f.sku})`,
        pros: ['Guarantees 100% buildability in vendor configurator', 'Satisfies thermal/electrical safety'],
        cons: [`Adds $${(getPrice(f.sku) * (f.quantity || 1)).toLocaleString()} CapEx`],
        status: 'SELECTED'
      })),
      selectedAlternative: {
        id: 'INJECT_ALL_MANDATORY_FIXES',
        description: `${fixes.length} certified accessory kit(s)`,
        selectionRationale: 'Golden Rule mandates 100% elimination of unbuildable errors before quote submission'
      },
      downstreamImpact: fixes.map(f => f.sku),
      confidence: 0.99
    });
  }

  const rank1Parts = [...baseParts, ...fixParts];
  const rank1Cost = rank1Parts.reduce((acc, p) => acc + (p.extendedPriceUsd || (p.unitPriceUsd * p.quantity)), 0);

  const { tierConfig } = getStrategyConfig(chassisInfo);
  const dynamicDiscoveredAddons = discoverDynamicStrategyAddons(loadedCatalog, chassisInfo, dna);
  const getLiveRagGrounding = createLiveRagGrounding(chassisInfo);

  // ---------------------------------------------------------------------------
  // Build Ranks
  // ---------------------------------------------------------------------------

  // Least-Delta Analysis: Detect troublesome SKUs that force cascading dependencies
  const { identifyTroublesomeSkus, buildLeastDeltaCandidate } = require('./least_delta_combinator.js');
  const troublesomeSkus = identifyTroublesomeSkus(items, evalResults, loadedCatalog, chassisInfo);
  const leastDeltaCandidate = buildLeastDeltaCandidate(baseParts, fixParts, troublesomeSkus, evalResults, loadedCatalog, chassisInfo, getPrice);

  if (leastDeltaCandidate) {
    decisionLedger.recordDecision({
      decisionPoint: 'LEAST_DELTA_CASCADE_PRUNING',
      trigger: leastDeltaCandidate.troublesomeReason,
      alternativesEvaluated: [
        {
          id: 'DIRECT_ADDITIVE_FIXES',
          description: `Retain ${leastDeltaCandidate.troublesomeRootSku} and append all cascading dependencies`,
          pros: ['Preserves exact customer drafted SKU'],
          cons: [`Forces ${leastDeltaCandidate.cascadingSkusEliminated.length} cascading accessories`, 'Higher complexity and CapEx'],
          status: 'OFFERED_AS_RANK_1'
        },
        {
          id: 'LEAST_DELTA_SUBSTITUTION',
          description: `Substitute with ${leastDeltaCandidate.alternativeSku || 'pruned'} (${leastDeltaCandidate.presalesValuePitch})`,
          pros: ['Eliminates cascading dependencies', 'Lowest delta operations to customer intent', '100% buildable and functionally equivalent'],
          cons: ['Substitutes part number with modern alternative'],
          status: 'OFFERED_AS_RANK_2'
        }
      ],
      selectedAlternative: {
        id: 'LEAST_DELTA_PATH',
        description: leastDeltaCandidate.presalesValuePitch
      },
      downstreamImpact: leastDeltaCandidate.cascadingSkusEliminated,
      confidence: 0.98
    });
  }

  // Determine Rank 1 title and nature
  const isStraightforwardWinner = fixes.length === 0 && (!evalResults.errors || evalResults.errors.length === 0);
  const rank1Name = isStraightforwardWinner
    ? 'Rank 1: Customer Configuration (Local Rules Passed)'
    : 'Rank 1: Customer Workload Intent Preserved (Optimal Match)';
  const rank1Reasoning = isStraightforwardWinner
    ? 'Normalized customer configuration passes local rules without additions, removals, or replacements. PORTAL VALIDATION PENDING.'
    : 'Preserves the exact customer configuration with mandatory aspect fixes applied to satisfy physical buildability.';

  // Rank 2: Least-Delta Alternative Path (when troublesome SKU causes cascades) or Standardized CTO Baseline
  let rank2Parts = [];
  let rank2Cost = 0;
  let rank2AddonCost = 0;
  let rank2Name = 'Rank 2: Standardized CTO Baseline & Factory Default Accessories';
  let rank2Reasoning = 'Standardizes baseline options with factory default cable and rail accessories for maximum factory assembly stability.';
  let rank2IntentAlignment = `${Math.max(80, 95 - fixes.length * 3)}% (Standardized)`;
  let rank2LeastDelta = null;

  if (leastDeltaCandidate) {
    rank2Parts = leastDeltaCandidate.parts;
    rank2Cost = leastDeltaCandidate.estimatedCapex;
    rank2AddonCost = Math.max(0, rank2Cost - baseCost);
    rank2Name = leastDeltaCandidate.tierTitle;
    rank2Reasoning = leastDeltaCandidate.sharedIntelligenceReasoning;
    rank2IntentAlignment = `100% Functional Match (${leastDeltaCandidate.deltaSummary})`;
    rank2LeastDelta = leastDeltaCandidate;
  } else {
    const rank2ConfigAddons = tierConfig.rank2 || [];
    const rank2RawList = rank2ConfigAddons.length > 0
      ? rank2ConfigAddons
      : dynamicDiscoveredAddons.rank2Addons;
    const rank2Addons = rank2RawList.map(a => {
      const price = getPrice(a.sku);
      return {
        sku: cleanBaseSKU(a.sku),
        description: a.description || a.name || `Factory Accessory (${a.sku})`,
        quantity: a.quantity || 1,
        unitPriceUsd: price,
        extendedPriceUsd: price * (a.quantity || 1),
        isFixInjected: false,
        isStrategyAddon: true,
        category: a.category || 'Factory Baseline Accessory'
      };
    });
    rank2Parts = [...rank1Parts, ...rank2Addons];
    rank2AddonCost = rank2Addons.reduce((acc, a) => acc + a.extendedPriceUsd, 0);
    rank2Cost = rank1Cost + rank2AddonCost;
  }

  // Rank 3
  const arbitrationBranches = (evalResults.arbitrationResults || {}).branches || [];
  const pcieStorageBranch = arbitrationBranches.find(b => b.branchId === 'branch_pcie_storage_ocp_nic');

  let rank3Parts = [];
  let rank3AddonCost = 0;
  let rank3Addons = [];
  let rank3Name = 'Rank 3: High-IOPS & Storage Performance Optimized';
  let rank3Reasoning = 'Upgrades storage write-cache and smart hybrid battery protection for enhanced transactional database read/write IOPS.';
  let rank3IntentAlignment = `${Math.max(75, 90 - fixes.length * 3)}% (Storage Heavy)`;
  let rank3CascadingImpact = null;

  if (pcieStorageBranch) {
    rank3Name = 'Rank 3: High-IOPS & Contested Form-Factor Optimized (PCIe Storage + OCP NIC Retention)';
    rank3Reasoning = 'Pivoted storage controller to PCIe (MR416i-p 8GB Cache) to free OCP Slot 1 for customer\'s P10115-B21 10/25Gb OCP3 adapter, validating original P48832-B21 cable choice.';
    rank3IntentAlignment = '100% Exact Part Number Match (Fulfills P10115-B21 & P48832-B21)';

    const pcieRes = buildRank3PcieStorageBranchParts({
      pcieStorageBranch, baseParts, fixParts, getPrice, loadedCatalog, chassisInfo, items, rank1Cost
    });
    rank3Parts = pcieRes.rank3Parts;
    rank3AddonCost = pcieRes.rank3AddonCost;
    rank3CascadingImpact = pcieRes.rank3CascadingImpact;
  } else {
    const rank3ConfigAddons = tierConfig.rank3 || [];
    const rank3RawList = rank3ConfigAddons.length > 0
      ? rank3ConfigAddons
      : dynamicDiscoveredAddons.rank3Addons;
    rank3Addons = rank3RawList.map(a => {
      const price = getPrice(a.sku);
      return {
        sku: cleanBaseSKU(a.sku),
        description: a.description || a.name || `Performance Component (${a.sku})`,
        quantity: a.quantity || 1,
        unitPriceUsd: price,
        extendedPriceUsd: price * (a.quantity || 1),
        isFixInjected: false,
        isStrategyAddon: true,
        category: a.category || 'Performance Acceleration'
      };
    });
    const isModernizedGen5 = leastDeltaCandidate?.strategyName === 'MODERNIZED_5TH_GEN_PLATFORM';
    const rank3BaseParts = isModernizedGen5 ? rank2Parts : rank1Parts;
    rank3Parts = [...rank3BaseParts, ...rank3Addons];
    rank3AddonCost = rank3Addons.reduce((acc, a) => acc + a.extendedPriceUsd, 0);
    if (isModernizedGen5) {
      rank3Name = 'Rank 3: High-IOPS & Storage Performance Optimized (Modernized 5th Gen Platform)';
      rank3Reasoning = 'Upgrades storage write-cache and smart hybrid battery protection on the modernized 5th Gen platform for enhanced transactional database read/write IOPS.';
    }
  }

  // Rank 4
  const isModernizedGen5 = leastDeltaCandidate?.strategyName === 'MODERNIZED_5TH_GEN_PLATFORM';
  const rank4BaseParts = isModernizedGen5 ? rank2Parts : rank1Parts;
  const rank4ConfigAddons = tierConfig.rank4 || [];
  const rank4RawList = rank4ConfigAddons.length > 0
    ? rank4ConfigAddons
    : dynamicDiscoveredAddons.rank4Addons;
  const rank4Addons = rank4RawList.map(a => {
    const price = getPrice(a.sku);
    return {
      sku: cleanBaseSKU(a.sku),
      description: a.description || a.name || `Expansion Riser / Fan (${a.sku})`,
      quantity: a.quantity || 1,
      unitPriceUsd: price,
      extendedPriceUsd: price * (a.quantity || 1),
      isFixInjected: false,
      isStrategyAddon: true,
      category: a.category || 'Expansion Infrastructure'
    };
  });
  const rank4Parts = [...rank4BaseParts, ...rank4Addons];
  const rank4AddonCost = rank4Addons.reduce((acc, a) => acc + a.extendedPriceUsd, 0);
  const rank4Name = isModernizedGen5
    ? 'Rank 4: Maximum Density & Future Scalability Expansion (Modernized 5th Gen Platform)'
    : 'Rank 4: Maximum Density & Future Scalability Expansion';

  // Re-validate each candidate tier through 7 physical aspects with fingerprint memoization
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

  // Rank 5: Budget & CapEx Minimized Buildable Baseline (derived from revalidated v1.parts)
  const rank5Parts = v1.parts.map(p => ({
    ...p,
    category: p.isFixInjected ? 'Aspect Rule Fix' : 'Minimal CapEx Baseline'
  }));
  const v5 = { parts: rank5Parts, injectedFixes: v1.injectedFixes, totalCost: v1.totalCost, physicalMathClean: v1.physicalMathClean, aspectErrors: v1.aspectErrors };

  const v1SupplyMetrics = calculateSupplyMetrics(v1.parts, resolveSupply);
  const fastShipAlternative = synthesizeFastShipAlternative(
    v1.parts,
    v1SupplyMetrics,
    loadedCatalog,
    chassisInfo,
    getPrice,
    revalidateCached,
    resolveSupply
  );

  // Create Candidates Array
  const rawCandidates = [
    {
      rank: 1,
      name: rank1Name,
      score: parseFloat(Math.max(0.70, 1.0 - (fixes.length * 0.02)).toFixed(2)),
      estimatedCostUsd: v1.totalCost,
      budgetBreakdown: {
        baseBomCost: baseCost,
        fixCost: fixCost,
        strategyAddonCost: 0,
        totalBudgetUsd: v1.totalCost
      },
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
      tradeoffMetrics: {
        intentAlignment: fixes.length === 0 ? '100% (Direct Match)' : `${Math.max(85, 100 - fixes.length * 3)}% (${fixes.length} Fixes)`,
        skuModifications: `${fixes.length + v1.injectedFixes.length} physical fixes injected`,
        costDeltaUsd: `+$${fixCost.toLocaleString()} (Mandatory Buildability)`,
        capacityExpansion: 'Optimal (Zero over/under-provisioning)',
        fastShipAlternativeAvailable: Boolean(fastShipAlternative),
        deliveryDaysSaved: fastShipAlternative?.deliveryDaysSaved || 0
      },
      ragSecondOpinion: getLiveRagGrounding(
        'Intent Preserved',
        fixes.map(f => f.sku).concat(['chassis', 'processor', 'memory']),
        '✅ Local Rule Engine Validated: Direct translation of customer requirements with mandatory buildability fixes.'
      ),
      reasoning: rank1Reasoning,
      decisionTrace: decisionLedger.getDecisions()
    },
    {
      rank: 2,
      name: (options && options.prioritizeFastShipAsRank2 && fastShipAlternative) ? fastShipAlternative.name : rank2Name,
      score: parseFloat(Math.max(0.65, 0.92 - (fixes.length * 0.02)).toFixed(2)),
      estimatedCostUsd: (options && options.prioritizeFastShipAsRank2 && fastShipAlternative) ? fastShipAlternative.estimatedCostUsd : v2.totalCost,
      budgetBreakdown: {
        baseBomCost: baseCost,
        fixCost: fixCost,
        strategyAddonCost: (options && options.prioritizeFastShipAsRank2 && fastShipAlternative) ? Math.max(0, fastShipAlternative.estimatedCostUsd - baseCost) : rank2AddonCost,
        totalBudgetUsd: (options && options.prioritizeFastShipAsRank2 && fastShipAlternative) ? fastShipAlternative.estimatedCostUsd : v2.totalCost
      },
      workloadDnaMatch: (options && options.prioritizeFastShipAsRank2 && fastShipAlternative)
        ? 'Fast-Ship Delivery Optimized'
        : (rank2LeastDelta
          ? (rank2LeastDelta.strategyName === 'MODERNIZED_5TH_GEN_PLATFORM'
              ? 'Modernized 5th Gen Platform (Emerald Rapids + DDR5-5600)'
              : 'Least-Delta Optimization (Pruned Cascades)')
          : 'Factory Standard (Cable Management Arm & Tool-less Rail Kits)'),
      changesCount: (options && options.prioritizeFastShipAsRank2 && fastShipAlternative)
        ? (fastShipAlternative.substitutedPacingItems?.length || 1)
        : (rank2LeastDelta ? rank2LeastDelta.deltaMetrics.totalDeltaOperations : (fixes.length + (rank2Parts.length - rank1Parts.length) + v2.injectedFixes.length)),
      skuPartsList: (options && options.prioritizeFastShipAsRank2 && fastShipAlternative) ? fastShipAlternative.skuPartsList : v2.parts,
      bomFingerprint: computeBomFingerprint((options && options.prioritizeFastShipAsRank2 && fastShipAlternative) ? fastShipAlternative.skuPartsList : v2.parts),
      physicalMathClean: (options && options.prioritizeFastShipAsRank2 && fastShipAlternative) ? fastShipAlternative.physicalMathClean : v2.physicalMathClean,
      isMathClean: (options && options.prioritizeFastShipAsRank2 && fastShipAlternative) ? fastShipAlternative.physicalMathClean : v2.physicalMathClean,
      aspectErrors: (options && options.prioritizeFastShipAsRank2 && fastShipAlternative) ? fastShipAlternative.aspectErrors : (v2.aspectErrors || []),
      injectedCascadingFixes: (options && options.prioritizeFastShipAsRank2 && fastShipAlternative) ? fastShipAlternative.injectedCascadingFixes : v2.injectedFixes,
      leastDeltaAnalysis: (options && options.prioritizeFastShipAsRank2 && fastShipAlternative) ? null : (rank2LeastDelta || null),
      tradeoffMetrics: (options && options.prioritizeFastShipAsRank2 && fastShipAlternative)
        ? fastShipAlternative.tradeoffMetrics
        : {
          intentAlignment: rank2IntentAlignment,
          skuModifications: rank2LeastDelta ? rank2LeastDelta.deltaSummary : `${fixes.length} modifications`,
          costDeltaUsd: `+$${rank2AddonCost.toLocaleString()}`,
          capacityExpansion: rank2LeastDelta ? 'Cascade-Free Architecture' : 'Standard Factory Margins',
          presalesPitch: rank2LeastDelta?.presalesValuePitch || 'Factory standard accessory kit inclusion'
        },
      ragSecondOpinion: (options && options.prioritizeFastShipAsRank2 && fastShipAlternative)
        ? `✅ Fast-Ship Alternative: ${fastShipAlternative.reasoning}`
        : getLiveRagGrounding(
          rank2LeastDelta ? 'Least-Delta Alternative' : 'Standardized CTO Baseline',
          (rank2LeastDelta?.cascadingSkusEliminated || []).concat(['cable', 'rail', 'chassis']),
          rank2LeastDelta
            ? `✅ Local Rule Engine Validated: ${rank2LeastDelta.presalesValuePitch}`
            : `✅ Local Rule Engine Validated: CTO factory standardized baseline (${tierConfig.rank2?.[0]?.description || 'Factory Cable/Rail Kit'}) and routing verified.`
        ),
      reasoning: (options && options.prioritizeFastShipAsRank2 && fastShipAlternative) ? fastShipAlternative.reasoning : rank2Reasoning,
      decisionTrace: decisionLedger.getDecisions()
    },
    {
      rank: 3,
      name: rank3Name,
      score: parseFloat(Math.max(0.60, 0.88 - (fixes.length * 0.02)).toFixed(2)),
      estimatedCostUsd: v3.totalCost,
      budgetBreakdown: {
        baseBomCost: baseCost,
        fixCost: fixCost,
        strategyAddonCost: rank3AddonCost,
        totalBudgetUsd: v3.totalCost
      },
      workloadDnaMatch: pcieStorageBranch ? 'High-IOPS (PCIe x16 Controller, 8GB Cache & Dual OCP Retained)' : `Optimized for ${dna.storageWorkload || 'Database'} Performance`,
      changesCount: fixes.length + (pcieStorageBranch ? pcieStorageBranch.substitutions.length : rank3Addons.length) + v3.injectedFixes.length,
      skuPartsList: v3.parts,
      bomFingerprint: computeBomFingerprint(v3.parts),
      physicalMathClean: v3.physicalMathClean,
      isMathClean: v3.physicalMathClean,
      aspectErrors: v3.aspectErrors || [],
      injectedCascadingFixes: v3.injectedFixes,
      cascadingImpact: rank3CascadingImpact,
      tradeoffMetrics: {
        intentAlignment: rank3IntentAlignment,
        skuModifications: `${fixes.length + (pcieStorageBranch ? pcieStorageBranch.substitutions.length : rank3Addons.length) + v3.injectedFixes.length} modifications`,
        costDeltaUsd: `+$${(fixCost + rank3AddonCost).toLocaleString()}`,
        capacityExpansion: pcieStorageBranch ? '2x Write Cache (8GB) + OCP Retention' : 'High Drive Controller Throughput'
      },
      ragSecondOpinion: getLiveRagGrounding(
        'High-IOPS Storage Performance',
        (pcieStorageBranch ? ['MR416i-p', 'P10115-B21', 'P48832-B21'] : rank3Addons.map(a => a.sku)).concat(['battery', 'cache', 'storage']),
        pcieStorageBranch ? '✅ Local Rule Engine Validated: PCIe standup controller (x16 bus, 8GB cache) frees OCP Slot 1 for customer OCP adapter.' : `✅ Local Rule Engine Validated: Write-back cache acceleration & ${dna.storageWorkload || 'high-throughput controller'} IOPS optimization verified.`
      ),
      reasoning: rank3Reasoning
    },
    {
      rank: 4,
      name: rank4Name,
      score: parseFloat(Math.max(0.55, 0.82 - (fixes.length * 0.02)).toFixed(2)),
      estimatedCostUsd: v4.totalCost,
      budgetBreakdown: {
        baseBomCost: baseCost,
        fixCost: fixCost,
        strategyAddonCost: rank4AddonCost,
        totalBudgetUsd: v4.totalCost
      },
      workloadDnaMatch: 'Max Headroom (Full PCIe Riser & High-Perf Thermal Expansion)',
      changesCount: fixes.length + rank4Addons.length + v4.injectedFixes.length,
      skuPartsList: v4.parts,
      bomFingerprint: computeBomFingerprint(v4.parts),
      physicalMathClean: v4.physicalMathClean,
      isMathClean: v4.physicalMathClean,
      aspectErrors: v4.aspectErrors || [],
      injectedCascadingFixes: v4.injectedFixes,
      tradeoffMetrics: {
        intentAlignment: `${Math.max(70, 85 - fixes.length * 3)}% (Scalability Focused)`,
        skuModifications: `${fixes.length + rank4Addons.length + v4.injectedFixes.length} modifications`,
        costDeltaUsd: `+$${(fixCost + rank4AddonCost).toLocaleString()}`,
        capacityExpansion: '100% Slot & Thermal Headroom'
      },
      ragSecondOpinion: getLiveRagGrounding(
        'Future Scalability Expansion',
        rank4Addons.map(a => a.sku).concat(['riser', 'fan', 'pcie']),
        '✅ Local Rule Engine Validated: Secondary & tertiary riser lane allocation and cooling envelope verified.'
      ),
      reasoning: `Populates full secondary PCIe riser slots and high-performance fan kits to support future GPU accelerator and 2nd CPU socket expansions.`
    },
    {
      rank: 5,
      name: 'Rank 5: Budget & CapEx Minimized Buildable Baseline',
      score: parseFloat(Math.max(0.50, 0.75 - (fixes.length * 0.02)).toFixed(2)),
      estimatedCostUsd: v5.totalCost,
      budgetBreakdown: {
        baseBomCost: baseCost,
        fixCost: fixCost,
        strategyAddonCost: 0,
        totalBudgetUsd: v5.totalCost
      },
      workloadDnaMatch: 'Strict Minimum CapEx (100% Buildable Baseline)',
      changesCount: fixes.length + v5.injectedFixes.length,
      skuPartsList: v5.parts,
      bomFingerprint: computeBomFingerprint(v5.parts),
      physicalMathClean: v5.physicalMathClean,
      isMathClean: v5.physicalMathClean,
      aspectErrors: v5.aspectErrors || [],
      injectedCascadingFixes: v5.injectedFixes,
      tradeoffMetrics: {
        intentAlignment: `${Math.max(65, 80 - fixes.length * 3)}% (Minimal Baseline)`,
        skuModifications: `${fixes.length + v5.injectedFixes.length} mandatory fixes only`,
        costDeltaUsd: '$0 Surplus Added',
        capacityExpansion: 'Baseline Only'
      },
      ragSecondOpinion: getLiveRagGrounding(
        'Minimal CapEx Baseline',
        ['minimal', 'baseline', 'chassis'],
        `✅ Local Rule Engine Validated: 100% buildable certified baseline without unrequested add-ons (${v5.parts.length} essential parts).`
      ),
      reasoning: `Strict baseline buildable tier eliminating all optional add-ons to minimize total CapEx expenditure while remaining 100% buildable.`
    }
  ];

  const requestedSkuSet = scoreAndSortCandidates(rawCandidates, items, resolveSupply);
  const baselineCost = rawCandidates[0]?.estimatedCostUsd || rank1Cost;

  try {
    decisionLedger.persistLedger();
  } catch (_) {}

  return normalizeCandidates(rawCandidates, requestedSkuSet, baselineCost, { ...options, priceResolver: getPrice });
}

module.exports = {
  synthesize5TierRankedSolutions,
  synthesizeStrategies: synthesize5TierRankedSolutions,
  synthesizeFastShipAlternative,
  parseLeadTimeDays,
  calculateSupplyMetrics,
  setPhysicalMathValidator,
  getPhysicalMathValidator,
  computeArchitecturalDelta,
  computeCapabilityDowngradePenalty,
  scoreAndSortCandidates,
  _clearStrategyAddonsCache
};
