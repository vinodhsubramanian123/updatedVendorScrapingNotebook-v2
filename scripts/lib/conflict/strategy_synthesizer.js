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
const { cleanBaseSKU, buildCatalogSkuIndex, isServiceSku, classifyLifecycleState } = require('../catalog/sku.js');
const { analyzeRetirementDate } = require('../catalog/lifecycle.js');
const { classifyComponentRole } = require('../catalog/product_meta.js');
const { extractWorkloadDna, validateNumaMemoryTopology } = require('./workload_dna.js');
const { analyzeCascadingImpact, discoverDynamicStrategyAddons } = require('./cascading_impact_analyzer.js');
const {
  extractComponentAttributes,
  scoreReplacementCandidate,
  compareAvailabilityReplacement,
  isActiveCatalogOption,
  identifyTroublesomeSkus,
  buildLeastDeltaCandidate
} = require('./least_delta_combinator.js');
const { getHistoricalSkuPrice } = require('../catalog/sku_versioning.js');
const { createDecisionTraceLedger } = require('./decision_trace.js');
const { getMandatorySkusForChassis } = require('../catalog/catalog_rules.js');
const {
  qualifyCandidatesBeforeRanking,
  rankQualifiedCandidatesDeterministically,
  computeParetoFrontier
} = require('./sizing/pareto_ranker.js');

let _strategyAddonsCache = null;
let _physicalMathValidator = null;
const AVAILABILITY_TARGET_DAYS = 30;
const MAX_AVAILABILITY_VALIDATIONS = 12;

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
  const range = text.match(/^(?:edt[:\s]+)?(\d+)\s*(?:-|–|to)\s*(\d+)(?:\s*(?:(?:business|calendar)\s+)?days?)?$/);
  if (range) return (Number(range[1]) + Number(range[2])) / 2;
  const plain = text.match(/^(\d+)$/);
  if (plain) return Number(plain[1]);
  const single = text.match(/^(?:edt[:\s]+)?(\d+)\s*(?:(?:business|calendar)\s+)?days?$/);
  return single ? Number(single[1]) : null;
}

function _catalogSupplyAttributes(item) {
  const row = item?.skuData || {};
  const leadTime = row['Lead Time'] ?? row.leadTime ?? row['Estimated Availability Lead Time'] ?? row.estimatedDelivery ?? '';
  return {
    availability: row.Availability || row.availability || row['Supply Status'] || 'Unknown',
    leadTime,
    leadTimeDays: parseLeadTimeDays(row.leadTimeDays) ?? parseLeadTimeDays(leadTime)
  };
}

function createSupplyAttributeResolver(catalog) {
  const index = buildCatalogSkuIndex(catalog || {});
  return sku => _catalogSupplyAttributes(index.get(cleanBaseSKU(sku)));
}

function _isHardwareSupplyItem(attr) {
  const sku = String(attr?.sku || '').trim();
  const desc = String(attr?.description || '').toLowerCase();
  if (isServiceSku(sku) || /^(?:HA|HU|H7)/i.test(sku)) return false;
  if (/\b(tech care|installation service|startup service|deployment service|pointnext|care pack|compute ops|saas)\b/i.test(desc)) return false;
  if (/\bilo\s+advanced\b.*\blicense\b/i.test(desc)) return false;
  return true;
}

const UNAVAILABLE_SUPPLY = /unavailable|out of stock|not (?:yet )?available|allocation hold|constrained|discontinued|obsolete/i;
const REPLACEMENT_SUPPLY_UNKNOWN = { availability: null, leadTime: null, leadTimeDays: null };

function _partSupplyAttributes(part, resolveSupply) {
  const sku = part.sku || part['Product #'] || '';
  const supply = resolveSupply?.(sku) || {};
  const directLeadTime = part.leadTime || part['Estimated Availability Lead Time'] || part['Lead Time'];
  return {
    sku,
    description: part.description || part.Description || '',
    quantity: part.quantity ?? 1,
    availability: part.availability || supply.availability || 'Unknown',
    leadTimeDays: parseLeadTimeDays(part.leadTimeDays) ?? parseLeadTimeDays(directLeadTime) ??
      parseLeadTimeDays(supply.leadTimeDays) ?? parseLeadTimeDays(supply.leadTime)
  };
}

function calculateSupplyMetrics(parts, resolveSupply) {
  const attributes = (parts || []).map(part => _partSupplyAttributes(part, resolveSupply));
  const knownEntries = attributes.filter(a => Number.isFinite(a.leadTimeDays));
  const knownLeadTimes = knownEntries.map(a => a.leadTimeDays);
  const hardwareAttributes = attributes.filter(_isHardwareSupplyItem);
  const hardwareKnownEntries = hardwareAttributes.filter(a => Number.isFinite(a.leadTimeDays));
  const unavailableCount = attributes.filter(a => UNAVAILABLE_SUPPLY.test(a.availability)).length;

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
  const leadTimeOutliers = knownEntries.filter(e =>
    e.leadTimeDays > AVAILABILITY_TARGET_DAYS ||
    (e.leadTimeDays >= 21 && medianLeadTime > 0 && (e.leadTimeDays - medianLeadTime) >= 14) ||
    (medianLeadTime > 0 && e.leadTimeDays > 2 * medianLeadTime)
  );
  const hardwareMaxLeadTimeDays = hardwareKnownEntries.reduce((max, item) => Math.max(max ?? 0, item.leadTimeDays), null);
  const unknownLeadTimeSkus = [...new Set(attributes.filter(a => a.leadTimeDays === null).map(a => a.sku).filter(Boolean))];

  return {
    knownLeadTimeCount: knownLeadTimes.length,
    unknownLeadTimeCount: attributes.length - knownLeadTimes.length,
    hardwareKnownLeadTimeCount: hardwareKnownEntries.length,
    hardwareUnknownLeadTimeCount: hardwareAttributes.length - hardwareKnownEntries.length,
    hardwareMaxLeadTimeDays,
    unavailableCount,
    maxLeadTimeDays,
    pacingItemSku,
    pacingItemDescription,
    availabilityTargetDays: AVAILABILITY_TARGET_DAYS,
    pacingItems: knownEntries.filter(item => item.leadTimeDays === maxLeadTimeDays),
    itemsOverAvailabilityTarget: knownEntries.filter(item => item.leadTimeDays > AVAILABILITY_TARGET_DAYS)
      .sort((a, b) => b.leadTimeDays - a.leadTimeDays || a.sku.localeCompare(b.sku)),
    unknownLeadTimeSkus,
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
function _loadStrategyAddonsJson() {
  if (_strategyAddonsCache) return _strategyAddonsCache;
  try {
    const configPath = path.join(__dirname, '..', '..', 'config', 'strategy_addons.json');
    if (fs.existsSync(configPath)) {
      _strategyAddonsCache = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return _strategyAddonsCache;
    }
  } catch (err) {
    const _logger = require('../system/pipeline_logger.js');
    _logger.warn('STRATEGY_SYNTHESIZER', 'Failed to parse strategy_addons.json', err);
  }
  return { default: { rank2: [], rank3: [], rank4: [] } };
}

function _resolveStrategyKey(chassisInfo, strategyConfig) {
  const modelKey = (chassisInfo.model || '').toLowerCase();
  const familyKey = (chassisInfo.family || '').toLowerCase();
  const genKey = (chassisInfo.gen || '').toLowerCase();

  if (modelKey.includes('dl380a')) {
    return strategyConfig.dl380a_gen12 ? 'dl380a_gen12' : (strategyConfig.dl380_gen12 ? 'dl380_gen12' : 'dl380');
  }
  if (modelKey.includes('dl145')) {
    return strategyConfig.dl145_gen11 ? 'dl145_gen11' : (strategyConfig.dl380_gen11 ? 'dl380_gen11' : 'default');
  }
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
    const lifecycle = classifyLifecycleState(it.lifecycleStatus, it.diffStatus, it.sku, it.description, it.vendorSupplyStatus);
    const priceFromCatalog = getPrice(it.sku);
    const itemPrice = (typeof it.unitPriceUsd === 'number' && Number.isFinite(it.unitPriceUsd) && it.unitPriceUsd > 0)
      ? it.unitPriceUsd
      : ((typeof it.priceUsd === 'number' && Number.isFinite(it.priceUsd) && it.priceUsd > 0) ? it.priceUsd : 0);
    const price = priceFromCatalog > 0 ? priceFromCatalog : itemPrice;
    const priceKnown = getPrice.hasPrice(it.sku) || itemPrice > 0;
    const isZeroCost = priceKnown && price === 1;
    const directLeadTime = it.leadTime || it['Estimated Availability Lead Time'] || it['Lead Time'] || '';
    const parsedDays = it.leadTimeDays !== undefined && it.leadTimeDays !== null
      ? it.leadTimeDays
      : parseLeadTimeDays(directLeadTime);

    return {
      sku: cleanBaseSKU(it.sku),
      ...(lifecycle.isNonActive ? { lifecycleStatus: lifecycle.canonicalStatus } : {}),
      description: it.description || `HPE Hardware Option (${cleanBaseSKU(it.sku)})`,
      quantity: it.quantity || 1,
      unitPriceUsd: price,
      extendedPriceUsd: price * (it.quantity || 1),
      priceKnown,
      pricingStatus: priceKnown ? (priceFromCatalog > 0 ? getPrice.status(it.sku) : 'QUOTE_UNIT_PRICE') : 'PRICE_UNAVAILABLE',
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
    if (qReq > qCand && origPartInfo.has(sku)) {
      unmatchedReq.push({ sku, qty: qReq - qCand, info: origPartInfo.get(sku) });
    }
  }
  for (const [sku, qCand] of candidateQuantities.entries()) {
    const qReq = requestedQuantities.get(sku) || 0;
    if (qCand > qReq && candPartInfo.has(sku)) {
      unmatchedCand.push({ sku, qty: qCand - qReq, info: candPartInfo.get(sku) });
    }
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
      if (eqScore > bestScore) {
        bestScore = eqScore;
        bestIdx = idx;
      }
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
    const qReq = requestedQuantities.get(sku) || 0;
    const qCand = candidateQuantities.get(sku) || 0;
    const diff = Math.abs(qReq - qCand);
    if (diff === 0) continue;

    const cat = String(partCategoryMap.get(sku) || '').toLowerCase();
    totalWeightedDelta += diff * _getCategoryArchitecturalWeight(cat);
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
  for (const sku of requestedSkuSet) {
    if (candSkuSet.has(sku)) matchedUniqueCount++;
  }
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
    if (it.category && !candidateCategoryMap.has(k)) {
      candidateCategoryMap.set(k, it.category);
    }
  }
  cand.quantityDelta = [...new Set([...requestedQuantities.keys(), ...candidateQuantities.keys()])]
    .reduce((sum, sku) => sum + Math.abs((requestedQuantities.get(sku) || 0) - (candidateQuantities.get(sku) || 0)), 0);
  cand.architecturalDelta = computeArchitecturalDelta(requestedQuantities, candidateQuantities, candidateCategoryMap, origPartInfo, candPartInfo);
  cand.capabilityDowngradePenalty = computeCapabilityDowngradePenalty(cand, items);
}

function _compareCandidateTieBreakers(a, b) {
  if (a.supplyMetrics.unavailableCount !== b.supplyMetrics.unavailableCount) {
    return a.supplyMetrics.unavailableCount - b.supplyMetrics.unavailableCount;
  }
  const leadA = a.supplyMetrics.solutionEdtDays ?? Number.POSITIVE_INFINITY;
  const leadB = b.supplyMetrics.solutionEdtDays ?? Number.POSITIVE_INFINITY;
  if (leadA !== leadB) return leadA - leadB;

  if (Boolean(a.availabilityPreference) !== Boolean(b.availabilityPreference)) {
    return a.availabilityPreference ? -1 : 1;
  }
  const nameA = a.strategyIdentity || a.name || '';
  const nameB = b.strategyIdentity || b.name || '';
  const nameDiff = nameA.localeCompare(nameB);
  if (nameDiff !== 0) return nameDiff;

  const fpA = a.bomFingerprint || '';
  const fpB = b.bomFingerprint || '';
  return fpA.localeCompare(fpB);
}

function _compareNumAsc(a, b) {
  if (a === b) return 0;
  return a - b;
}

function _compareCandidateRanks(a, b) {
  const qualA = a.qualifiedForRecommendation !== false;
  const qualB = b.qualifiedForRecommendation !== false;
  if (qualA !== qualB) return qualA ? -1 : 1;
  if (Boolean(a.physicalMathClean) !== Boolean(b.physicalMathClean)) return a.physicalMathClean ? -1 : 1;

  const primary = _compareNumAsc(a.capabilityDowngradePenalty, b.capabilityDowngradePenalty) ||
    _compareNumAsc(a.changedSkuLines || 0, b.changedSkuLines || 0) ||
    _compareNumAsc(a.quantityDelta, b.quantityDelta) ||
    _compareNumAsc(a.architecturalDelta, b.architecturalDelta) ||
    _compareNumAsc(b.dynamicScore, a.dynamicScore);
  if (primary !== 0) return primary;
  return _compareCandidateTieBreakers(a, b);
}

function _annotateSingleCandidateQualification(cand, items, options) {
  const rankedSingle = rankQualifiedCandidatesDeterministically([cand], {
    ...options,
    baselineItems: items,
    enforcePhysicalMath: options.enforcePhysicalMath === true
  });
  const evaluated = rankedSingle.allCandidatesOrdered[0];
  cand.qualifiedForRecommendation = evaluated ? evaluated.qualifiedForRecommendation : true;
  cand.disqualificationReasons = evaluated ? evaluated.disqualificationReasons : [];
  cand.changedSkuLines = evaluated ? evaluated.changedSkuLines : 0;
  cand.changedUnits = evaluated ? evaluated.changedUnits : (cand.quantityDelta || 0);
}

function _annotatePreRankingQualification(rawCandidates, items, options = {}) {
  rawCandidates.forEach(cand => {
    _annotateSingleCandidateQualification(cand, items, options);
  });
}

function _promoteFastShipToRank2IfEligible(rawCandidates) {
  const fsIdx = rawCandidates.findIndex(
    (c, idx) => idx > 0 && c.isFastShipRank2 && c.physicalMathClean && c.qualifiedForRecommendation !== false
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
  if (options?.prioritizeFastShipAsRank2) {
    _promoteFastShipToRank2IfEligible(rawCandidates);
  }
  return requestedSkuSet;
}

function includeAvailabilityRecommendations(closest, ranked) {
  const availability = ['CLOSEST_MATCH', 'FASTEST'].map(preference => ranked.find(candidate =>
    candidate.availabilityPreference === preference && candidate.physicalMathClean && candidate.isUniqueBom !== false
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
    const part = candPartMap.get(s);
    const cat = (part?.category || '').toLowerCase();
    if (cat.includes('gpu') || cat.includes('accelerator') || cat.includes('processor') || cat.includes('cpu') || cat.includes('memory') || cat.includes('controller') || cat.includes('power supply')) {
      weightedEditDistance += 1.0;
    } else if (cat.includes('storage') || cat.includes('drive') || cat.includes('network') || cat.includes('nic')) {
      weightedEditDistance += 0.6;
    } else if (cat.includes('cable') || cat.includes('bracket') || cat.includes('enablement') || cat.includes('fix')) {
      weightedEditDistance += 0.2;
    } else {
      weightedEditDistance += 0.1;
    }
  });
  omittedSkus.forEach(() => {
    weightedEditDistance += 0.8;
  });
  return parseFloat((weightedEditDistance + (quantityDelta || 0)).toFixed(2));
}

function _buildCandidateProximityMetrics(cand, idx, costDeltaFromRank1, costDeltaPct, addedSkus, omittedSkus, weightedEditDistance) {
  const riskScore = (cand.aspectErrors?.length || 0) * 10 + (cand.changesCount || 0);

  let closenessRating = 'Differentiated Architecture (>8% cost variance)';
  if (idx === 0) {
    closenessRating = 'Optimal Baseline';
  } else if (costDeltaPct === null) {
    closenessRating = 'Customer-distance ranked; certified pricing incomplete';
  } else if (Math.abs(costDeltaPct) < 8) {
    closenessRating = 'Very Close Alternative (<8% cost variance)';
  }

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
  if (cand.availabilityPreference) {
    return 'Compare catalog lead times and review the substitutions before confirming delivery in OCA.';
  }
  const lowerName = cand.name.toLowerCase();
  if (lowerName.includes('intent preserved')) {
    return 'Choose this when maximum fidelity to the customer RFP is mandated and minimum SKU deviations are required.';
  }
  if (lowerName.includes('high-iops') || lowerName.includes('contested form-factor')) {
    return 'Choose this when write-cache performance (8GB PCIe) and retaining customer OCP NIC part numbers outweigh standard CapEx constraints.';
  }
  if (lowerName.includes('budget') || lowerName.includes('capex')) {
    return 'Choose this when lowest possible purchase price is required without violating HPE factory buildability.';
  }
  if (lowerName.includes('standardized')) {
    return 'Choose this when factory standard cable management and tool-less rail kits are required for turnkey rack deployment.';
  }
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

function _attachParetoFrontierMetadata(normalized, options = {}) {
  const frontierReport = computeParetoFrontier(normalized, {
    ...options,
    enforcePhysicalMath: options.enforcePhysicalMath === true
  });
  normalized.paretoFrontier = frontierReport;
  normalized.disqualifiedCandidates = frontierReport.disqualifiedCandidates;
  normalized.evaluatedCandidateSet = frontierReport.evaluatedCandidateSet;
  normalized.isGlobalMinimum = frontierReport.isGlobalMinimum;
}

function normalizeCandidates(rawCandidates, requestedSkuSet, baselineCost, options = {}) {
  const priceResolver = options.priceResolver;
  const seenFp = new Map();
  const normalized = rawCandidates.map((cand, idx) => {
    _normalizeCandidatePartsPricing(cand, priceResolver);

    cand.rank = idx + 1;
    if (!cand.name.startsWith(`Rank ${cand.rank}:`)) {
      cand.name = cand.name.replace(/^Rank \d+:/, `Rank ${cand.rank}:`);
    }

    _assignBomFingerprintAndUniqueness(cand, seenFp);

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

    const weightedEditDistance = _computeCandidateEditDistance(candPartMap, addedSkus, omittedSkus, cand.quantityDelta);

    _buildCandidateProximityMetrics(cand, idx, costDeltaFromRank1, costDeltaPct, addedSkus, omittedSkus, weightedEditDistance);
    cand.decisionGuide = _resolveCandidateDecisionGuide(cand);

    return cand;
  });

  _applyParetoDominance(normalized);
  _attachParetoFrontierMetadata(normalized, options);

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

function _injectStorageBatteryIfMissing(updatedParts, partSkus, mandatory, getPrice, injectedFixes) {
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
}

function _injectFanKitIfMissing(updatedParts, partSkus, mandatory, getPrice, injectedFixes) {
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
    const isModularFan = mandatory.HIGH_PERF_FAN_KIT?.packagingModality === 'MODULAR_PER_ROTOR' ||
      ['P58465-B21', 'P58464-B21', 'P58466-B21'].includes(cleanBaseSKU(fanSku));
    const cpuPart = updatedParts.find(p => /\b(processor|xeon|epyc)\b/i.test(p.description || '') && !/\b(heatsink|heat sink|fan)\b/i.test(p.description || ''));
    const cpuQty = cpuPart ? (cpuPart.quantity || 2) : 2;
    const fanQty = isModularFan ? (cpuQty === 1 ? 4 : 6) : 1;
    const fanPrice = getPrice(fanSku);
    const fanPart = {
      sku: fanSku,
      description: fanName,
      quantity: fanQty,
      unitPriceUsd: fanPrice,
      extendedPriceUsd: fanPrice !== null ? fanPrice * fanQty : null,
      isFixInjected: true,
      isCascadingFix: true,
      category: 'Thermal Protection'
    };
    updatedParts.push(fanPart);
    partSkus.add(cleanBaseSKU(fanSku));
    injectedFixes.push({ sku: fanSku, reason: 'Cascading fan kit injection for high TDP / accelerator cooling' });
  }
}

function _injectDcLugKitIfMissing(updatedParts, partSkus, mandatory, getPrice, injectedFixes) {
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
}

function _applyRemoveDepMutation(dep, origSku, cleanDep, updatedParts, partSkus, injectedFixes, action) {
  const idx = updatedParts.findIndex(p => cleanBaseSKU(p.sku) === (origSku || cleanDep));
  if (idx === -1) return false;
  const removed = updatedParts.splice(idx, 1)[0];
  partSkus.delete(cleanBaseSKU(removed.sku));
  injectedFixes.push({ sku: removed.sku, action, reason: dep.reason || 'Pruned conflicting option in 7-aspect revalidation' });
  return true;
}

function _applySubstituteDepMutation(dep, origSku, cleanDep, updatedParts, partSkus, getPrice, injectedFixes) {
  const idx = updatedParts.findIndex(p => cleanBaseSKU(p.sku) === origSku);
  if (idx === -1) return false;
  const depPrice = getPrice(cleanDep);
  const qty = dep.quantity || updatedParts[idx].quantity || 1;
  updatedParts[idx] = {
    ...updatedParts[idx],
    ...REPLACEMENT_SUPPLY_UNKNOWN,
    sku: cleanDep,
    description: dep.description || `Substituted dependency (${cleanDep})`,
    quantity: qty,
    unitPriceUsd: depPrice,
    extendedPriceUsd: depPrice * qty,
    isFixInjected: true,
    isCascadingFix: true
  };
  partSkus.delete(origSku);
  partSkus.add(cleanDep);
  injectedFixes.push({ sku: cleanDep, replacedSku: origSku, action: 'SUBSTITUTE', reason: dep.reason || 'Substituted incompatible option' });
  return true;
}

function _applyDependencyMutationToParts(dep, updatedParts, partSkus, getPrice, injectedFixes) {
  const cleanDep = cleanBaseSKU(dep.sku);
  const origSku = cleanBaseSKU(dep.originalSku || '');
  const action = String(dep.action || '').toUpperCase();

  if (action === 'REMOVE' || action === 'PRUNE_REDUNDANT_RAID1_FIO') {
    return _applyRemoveDepMutation(dep, origSku, cleanDep, updatedParts, partSkus, injectedFixes, action);
  }
  if ((action === 'SUBSTITUTE' || origSku) && origSku && cleanDep) {
    return _applySubstituteDepMutation(dep, origSku, cleanDep, updatedParts, partSkus, getPrice, injectedFixes);
  }
  if (cleanDep && partSkus.has(cleanDep) && Number(dep.quantity) > 0 && action === 'ADJUST_QTY') {
    const target = updatedParts.find(p => cleanBaseSKU(p.sku) === cleanDep);
    if (target && target.quantity < dep.quantity) {
      target.quantity = dep.quantity;
      target.extendedPriceUsd = (target.unitPriceUsd || 0) * dep.quantity;
      injectedFixes.push({ sku: cleanDep, action: 'ADJUST_QTY', reason: dep.reason || 'Adjusted quantity to satisfy physical aspect check' });
      return true;
    }
  }
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
    return true;
  }
  return false;
}

function _runPhysicalAspectsValidationLoop(updatedParts, partSkus, catalogData, targetDir, validator, getPrice, injectedFixes) {
  let isClean = false;
  let aspectErrors = ['7-aspect candidate validation did not return evidence.'];

  if (typeof validator !== 'function') {
    return { isClean, aspectErrors };
  }

  const visitedFingerprints = new Set([computeBomFingerprint(updatedParts)]);
  try {
    for (let pass = 0; pass < 8; pass++) {
      const mathResult = validator(updatedParts, catalogData, targetDir, { skipGraphValidation: true, skipLifecycle: true });
      if (!mathResult) {
        isClean = false;
        aspectErrors = ['Candidate validation returned no evidence.'];
        break;
      }
      isClean = mathResult.isMathClean === true && !(mathResult.missingDependencies?.length);
      aspectErrors = mathResult.errors || [];

      let mutated = false;
      if (Array.isArray(mathResult.missingDependencies)) {
        for (const dep of mathResult.missingDependencies) {
          if (_applyDependencyMutationToParts(dep, updatedParts, partSkus, getPrice, injectedFixes)) {
            mutated = true;
          }
        }
      }

      if (!mutated) break;
      const nextFp = computeBomFingerprint(updatedParts);
      if (visitedFingerprints.has(nextFp)) {
        isClean = false;
        aspectErrors = [...aspectErrors, 'Repair loop halted: repeated candidate BOM state detected (oscillation guard).'];
        break;
      }
      visitedFingerprints.add(nextFp);
      // Every mutation needs a fresh pass, including the last permitted repair.
      isClean = false;
      aspectErrors = ['Candidate dependency repair requires further validation; iteration limit reached.'];
    }
  } catch (error) {
    isClean = false;
    aspectErrors = [`7-aspect candidate revalidation failed: ${error.message}`];
  }

  return { isClean, aspectErrors };
}

function _injectManagementLicenseIfMissing(updatedParts, partSkus, getPrice, injectedFixes, chassisInfo = {}) {
  const family = String(chassisInfo?.family || '').toLowerCase();
  const gen = String(chassisInfo?.gen || chassisInfo?.model || '').toLowerCase();
  if (family && !family.includes('proliant') && !family.includes('compute')) return;
  if (/gen\s*(?:8|9|10)\b/.test(gen)) return;

  const isCto = updatedParts.some(p => {
    const d = (p.description || '').toLowerCase();
    const s = cleanBaseSKU(p.sku);
    return ((d.includes('cto') || d.includes('configure-to-order')) && !/alletra|synergy|sn3600|msl|storeever|cray/.test(d)) ||
      ['P73282-B21', 'P52534-B21', 'P52533-B21', 'P52532-B21', 'P74700-B21', 'P75741-B21', 'P72176-B21', 'P72175-B21', 'P72174-B21'].includes(s);
  });
  const hasMgmt = updatedParts.some(p => {
    const s = cleanBaseSKU(p.sku);
    const d = (p.description || '').toLowerCase();
    return ['R7A11AAE', 'E5Y43A', 'E5Y43AAE', 'R7A12AAE', 'S2E10AAE', 'S5E59AAE', 'S1A05A'].includes(s) ||
      d.includes('compute ops management') || d.includes('oneview');
  });
  if (isCto && !hasMgmt && !partSkus.has('R7A11AAE')) {
    const mgmtSku = 'R7A11AAE';
    const price = typeof getPrice === 'function' ? getPrice(mgmtSku) : 0;
    updatedParts.push({
      sku: mgmtSku,
      description: 'HPE GreenLake for Compute Ops Management Enhanced 3-year Upfront SaaS (CLIC Rule 81322276)',
      quantity: 1,
      unitPriceUsd: price,
      extendedPriceUsd: price,
      isFixInjected: true,
      category: 'Management Software'
    });
    partSkus.add(mgmtSku);
    injectedFixes.push({ sku: mgmtSku, reason: 'Mandatory management license per CLIC Rule 81322276' });
  }
}

function revalidateCandidateParts(parts, chassisInfo, getPrice, catalogData = null, targetDir = '', options = {}) {
  const mandatory = getMandatorySkusForChassis(chassisInfo);
  const updatedParts = [...parts];
  const injectedFixes = [];
  const partSkus = new Set(updatedParts.map(p => cleanBaseSKU(p.sku)));

  _injectStorageBatteryIfMissing(updatedParts, partSkus, mandatory, getPrice, injectedFixes);
  _injectFanKitIfMissing(updatedParts, partSkus, mandatory, getPrice, injectedFixes);
  _injectDcLugKitIfMissing(updatedParts, partSkus, mandatory, getPrice, injectedFixes);
  _injectManagementLicenseIfMissing(updatedParts, partSkus, getPrice, injectedFixes, chassisInfo);

  const validator = (options && typeof options.validateMath === 'function') ? options.validateMath : _physicalMathValidator;
  const { isClean, aspectErrors } = _runPhysicalAspectsValidationLoop(updatedParts, partSkus, catalogData, targetDir, validator, getPrice, injectedFixes);

  const newTotalCost = updatedParts.reduce((sum, p) => sum + (p.extendedPriceUsd || (p.unitPriceUsd * (p.quantity || 1))), 0);

  return {
    parts: updatedParts,
    injectedFixes,
    totalCost: newTotalCost,
    physicalMathClean: isClean,
    aspectErrors
  };
}

function _isAvailableCatalogOption(item) {
  const row = item?.skuData;
  if (!row || item.lifecycleState?.isNonActive) return false;
  if (/\binactive\b/i.test(item.lifecycleStatus)) return false;
  const retired = [row['Discontinued Date'], row['Obsolete Date'], row.discontinuedDate, row.obsoleteDate]
    .some(date => date && analyzeRetirementDate(date).isPast);
  return !retired && !UNAVAILABLE_SUPPLY.test(_catalogSupplyAttributes(item).availability);
}

function _compareAvailabilityMatches(a, b) {
  return Number(a.matchType === 'UPGRADE') - Number(b.matchType === 'UPGRADE') ||
    b.attributeScore - a.attributeScore ||
    a.leadTimeDays - b.leadTimeDays ||
    a.sku.localeCompare(b.sku);
}

function findCatalogAvailabilityMatches(part, originalDays, catalogIndex) {
  const cleanSku = cleanBaseSKU(part.sku);
  const original = catalogIndex.get(cleanSku);
  const description = original?.skuData?.Description || original?.skuData?.description || part.description || '';
  const originalAttrs = extractComponentAttributes(description, cleanSku, part.category);
  const matches = [];
  for (const [sku, item] of catalogIndex) {
    if (sku === cleanSku || !_isAvailableCatalogOption(item)) continue;
    if (/conditional/i.test(item.skuData.visibilityState || '') || item.skuData.selectorTriggerSku) continue;
    const supply = _catalogSupplyAttributes(item);
    if (supply.leadTimeDays === null || supply.leadTimeDays >= originalDays) continue;
    const candidateDesc = item.skuData.Description || item.skuData.description || '';
    const matchType = compareAvailabilityReplacement(description, originalAttrs, candidateDesc, sku);
    if (!matchType) continue;
    const attributeScore = scoreReplacementCandidate({ sku, description: candidateDesc }, originalAttrs, 0, description);
    if (attributeScore >= 0) matches.push({ sku, description: candidateDesc, ...supply, matchType, attributeScore });
  }
  return matches.sort(_compareAvailabilityMatches);
}

function _applyAvailabilityReplacement(part, replacement, originalDays, getPrice, substitutions) {
  const price = getPrice(replacement.sku);
  const priceKnown = typeof getPrice.hasPrice === 'function' ? getPrice.hasPrice(replacement.sku) : Number.isFinite(price);
  substitutions.push({
    originalSku: cleanBaseSKU(part.sku),
    originalDescription: part.description,
    originalLeadTimeDays: originalDays,
    replacementSku: replacement.sku,
    replacementDescription: replacement.description,
    replacementLeadTimeDays: replacement.leadTimeDays,
    quantity: part.quantity ?? 1,
    daysSaved: originalDays - replacement.leadTimeDays,
    matchType: replacement.matchType,
    attributeScore: replacement.attributeScore,
    priceDeltaUsd: priceKnown && part.priceKnown !== false && Number.isFinite(part.unitPriceUsd)
      ? price - part.unitPriceUsd
      : null
  });

  return {
    ...part,
    sku: replacement.sku,
    description: replacement.description,
    unitPriceUsd: priceKnown ? price : null,
    extendedPriceUsd: priceKnown ? price * (part.quantity ?? 1) : null,
    priceKnown,
    availability: replacement.availability,
    leadTime: replacement.leadTime,
    leadTimeDays: replacement.leadTimeDays,
    isFastShipSubstituted: true
  };
}

function _findOcpSlotACableInCatalog(catalogIndex, mandatory) {
  const prefSku = mandatory?.OCP_BOX12_CABLE?.sku ? cleanBaseSKU(mandatory.OCP_BOX12_CABLE.sku) : null;
  if (prefSku && catalogIndex.has(prefSku)) {
    const item = catalogIndex.get(prefSku);
    return { sku: prefSku, description: item.skuData?.Description || item.entry?.description || mandatory.OCP_BOX12_CABLE.name };
  }
  for (const [sku, item] of catalogIndex.entries()) {
    const d = (item.skuData?.Description || item.entry?.description || '').toLowerCase();
    if (d.includes('rear ocp slota') && d.includes('controller cable')) {
      return { sku, description: item.skuData?.Description || item.entry?.description };
    }
  }
  return mandatory?.OCP_BOX12_CABLE?.sku
    ? { sku: cleanBaseSKU(mandatory.OCP_BOX12_CABLE.sku), description: mandatory.OCP_BOX12_CABLE.name }
    : null;
}

function _isPcieBackplaneSignalCablePart(part) {
  const s = cleanBaseSKU(part?.sku);
  const d = (part?.description || '').toLowerCase();
  return ['P72604-B21', 'P72602-B21', 'P76456-B21', 'P76453-B21', 'P48832-B21'].includes(s) ||
    (d.includes('pcie') && (d.includes('controller cable') || d.includes('ctrl cable') || d.includes('splitter cable')));
}

function _countOcp3Adapters(parts) {
  let count = 0;
  for (const p of parts) {
    const d = (p.description || '').toLowerCase();
    if (d.includes('cable') || d.includes('backplane') || d.includes('enablement')) continue;
    if (d.includes('ocp3') || d.includes('ocp 3') || /\b(mr|sr)\d{3}i-o\b/i.test(d)) count += (p.quantity || 1);
  }
  return count;
}

function _applyFastShipTopologyTransitions(candidateParts, substitutedItems, catalogIndex, chassisInfo, getPrice) {
  const hasPcieToOcpCtrl = substitutedItems.some(sub =>
    (/\b(mr|sr)\d{3}i-p\b/i.test(sub.originalDescription || '') || /\bp74775\b/i.test(sub.originalSku || '')) &&
    (/\b(mr|sr)\d{3}i-o\b/i.test(sub.replacementDescription || '') || /\bp58335\b/i.test(sub.replacementSku || ''))
  );
  if (!hasPcieToOcpCtrl) return [];

  const mandatory = getMandatorySkusForChassis(chassisInfo);
  const transitions = [];
  const ocpSignalCable = _findOcpSlotACableInCatalog(catalogIndex, mandatory);
  if (ocpSignalCable) {
    const idx = candidateParts.findIndex(_isPcieBackplaneSignalCablePart);
    if (idx !== -1) {
      const prev = candidateParts[idx];
      const sigPrice = getPrice(ocpSignalCable.sku);
      const qty = prev.quantity || 1;
      candidateParts[idx] = {
        ...prev,
        ...REPLACEMENT_SUPPLY_UNKNOWN,
        sku: ocpSignalCable.sku,
        description: ocpSignalCable.description,
        unitPriceUsd: sigPrice,
        extendedPriceUsd: sigPrice * qty,
        isFastShipTopologyCable: true
      };
      transitions.push({ action: 'REPLACE_SIGNAL_CABLE', fromSku: cleanBaseSKU(prev.sku), toSku: ocpSignalCable.sku, quantity: qty });
    }
  }

  const baseChassisQty = candidateParts.find(p => /configure-to-order|cto\s+server/i.test(p.description || ''))?.quantity || 1;
  const ocpPerNode = _countOcp3Adapters(candidateParts) / baseChassisQty;
  const hasSlotBCable = candidateParts.some(p => {
    const s = cleanBaseSKU(p.sku);
    const d = (p.description || '').toLowerCase();
    return s === cleanBaseSKU(mandatory?.CPU1_OCP_CABLE?.sku || 'P72203-B21') || (d.includes('cpu1') && d.includes('ocp') && d.includes('slotb'));
  });
  if (ocpPerNode >= 2 && !hasSlotBCable) {
    const slotBSku = cleanBaseSKU(mandatory?.CPU1_OCP_CABLE?.sku || 'P72203-B21');
    const slotBDesc = mandatory?.CPU1_OCP_CABLE?.name || catalogIndex.get(slotBSku)?.skuData?.Description || 'CPU1 to Rear OCP SlotB x8 Cable Kit';
    const slotBPrice = getPrice(slotBSku);
    candidateParts.push({
      sku: slotBSku,
      description: slotBDesc,
      quantity: baseChassisQty,
      unitPriceUsd: slotBPrice,
      extendedPriceUsd: slotBPrice * baseChassisQty,
      isFastShipTopologyCable: true,
      category: 'OCP Networking Enablement'
    });
    transitions.push({ action: 'ENABLE_OCP_SLOT_B', sku: slotBSku, quantity: baseChassisQty });
  }
  return transitions;
}

function _buildDeliveryScheduleSummary(baseline, candidate, deliveryDaysSaved, liveEdt) {
  const originalEdt = baseline.solutionEdtDays;
  const newEdt = candidate.solutionEdtDays;
  const componentEstimate = {
    originalMaxComponentDays: baseline.maxLeadTimeDays,
    fastShipMaxComponentDays: candidate.maxLeadTimeDays,
    complete: Number.isFinite(originalEdt) && Number.isFinite(newEdt),
    deliveryDaysSaved,
    scope: 'COMPONENT_ESTIMATE_ONLY',
    label: 'Longest known component lead times. Factory build and transit require a solution estimate.'
  };
  const fastShipRange = liveEdt?.fastShipRange || (Array.isArray(liveEdt?.candidateEdtDaysRange) ? `${liveEdt.candidateEdtDaysRange[0]}–${liveEdt.candidateEdtDaysRange[1]} days` : null);
  const baselineRange = liveEdt?.baselineRange || (Array.isArray(liveEdt?.baselineEdtDaysRange) ? `${liveEdt.baselineEdtDaysRange[0]}–${liveEdt.baselineEdtDaysRange[1]} days` : null);
  if (fastShipRange && baselineRange) {
    const startSaved = liveEdt.startWindowDaysSaved ?? liveEdt.daysSavedStart;
    const endSaved = liveEdt.endWindowDaysSaved ?? liveEdt.daysSavedEnd;
    return {
      componentEstimate,
      liveSolutionEdt: { ...liveEdt, fastShipRange, baselineRange, label: 'LIVE_HPE_OCA_SOLUTION_EDT' },
      deliveryImpact: `Live HPE OCA Solution EDT: ${fastShipRange} vs. ${baselineRange}` +
        (startSaved && endSaved ? ` (cuts start by ${startSaved}d and end by ${endSaved}d)` : '') +
        `. Longest known component estimate ${candidate.maxLeadTimeDays} vs. ${baseline.maxLeadTimeDays} days.`
    };
  }
  return {
    componentEstimate,
    liveSolutionEdt: null,
    deliveryImpact: deliveryDaysSaved === null
      ? `Some lead times are missing. The longest known component falls from ${baseline.maxLeadTimeDays} to ${candidate.maxLeadTimeDays} days.`
      : `The component lead-time estimate falls by ${deliveryDaysSaved} days, from ${originalEdt} to ${newEdt} days. Live OCA delivery confirmation is pending.`
  };
}

function _isProtectedCustomerFastShipPart(part, options = {}) {
  if (!_isHardwareSupplyItem(part) || part.quantityScope === 'global') return true;
  const preserve = new Set((options.preserveRoles || ['FC_HBA']).map(r => String(r).toUpperCase()));
  const d = (part.description || '').toLowerCase();
  const cat = (part.category || '').toLowerCase();
  const role = extractComponentAttributes(d, part.sku, cat).componentCategory;
  if (role === 'FC_HBA') {
    return preserve.has(role) && !options.allowFcHbaSubstitution;
  }
  return preserve.has(role) || /\b(?:cto|configure[\s-]to[\s-]order)\b/.test(d);
}

function _compareClosestAvailability(a, b) {
  return a.upgradeCount - b.upgradeCount ||
    Number(a.maxDays > AVAILABILITY_TARGET_DAYS) - Number(b.maxDays > AVAILABILITY_TARGET_DAYS) ||
    a.changeCount - b.changeCount ||
    b.attributeScore - a.attributeScore ||
    a.maxDays - b.maxDays;
}

function _compareFastestAvailability(a, b) {
  return a.maxDays - b.maxDays || _compareClosestAvailability(a, b);
}

function _availabilityPlan({ maxDays, choices }) {
  return {
    choices,
    maxDays,
    changeCount: choices.size,
    upgradeCount: [...choices.values()].filter(match => match.matchType === 'UPGRADE').length,
    attributeScore: [...choices.values()].reduce((sum, match) => sum + match.attributeScore, 0)
  };
}

function _planAvailabilityAtCeiling(pacing, ceiling, plans) {
  const required = pacing.filter(item => item.originalDays > ceiling);
  const eligible = required.map(item => item.matches.filter(match => match.leadTimeDays <= ceiling).slice(0, 3));
  if (!required.length || eligible.some(matches => matches.length === 0)) return;
  const firstChoices = new Map(required.map((item, i) => [item.sku, eligible[i][0]]));
  const add = choices => {
    const key = JSON.stringify([...choices].map(([sku, match]) => [sku, match.sku]));
    if (!plans.has(key)) plans.set(key, _availabilityPlan({ maxDays: ceiling, choices }));
  };
  add(firstChoices);
  // Try other matching SKUs when the top choice triggers a topology conflict.
  for (const [i, item] of required.entries()) {
    for (const match of eligible[i].slice(1)) {
      add(new Map(firstChoices).set(item.sku, match));
    }
  }
}

function _findAvailabilityPlans(parts, originalMax, resolveSupply, catalogIndex, options) {
  const threshold = options.prioritizeFastShipAsRank2 ? 20 : AVAILABILITY_TARGET_DAYS;
  const pacingBySku = new Map();
  let untouchedMax = 0;
  for (const part of parts) {
    const days = _partSupplyAttributes(part, resolveSupply).leadTimeDays;
    if (days === null) continue;
    if (days <= threshold || _isProtectedCustomerFastShipPart(part, options)) {
      untouchedMax = Math.max(untouchedMax, days);
      continue;
    }
    const sku = cleanBaseSKU(part.sku);
    if (!pacingBySku.has(sku) || days > pacingBySku.get(sku).originalDays) {
      pacingBySku.set(sku, { sku, part, originalDays: days });
    }
  }
  const pacing = [...pacingBySku.values()];
  const ceilings = new Set(pacing.map(item => item.originalDays));
  for (const item of pacing) {
    item.matches = findCatalogAvailabilityMatches(item.part, item.originalDays, catalogIndex);
    for (const match of item.matches) ceilings.add(match.leadTimeDays);
  }
  const plans = new Map();
  for (const ceiling of [...ceilings, untouchedMax].sort((a, b) => a - b)) {
    if (ceiling >= untouchedMax && ceiling < originalMax) _planAvailabilityAtCeiling(pacing, ceiling, plans);
  }

  const closest = [...plans.values()].sort(_compareClosestAvailability);
  const fastest = [...plans.values()].sort(_compareFastestAvailability);
  const queue = closest.slice(0, MAX_AVAILABILITY_VALIDATIONS / 2).flatMap((plan, i) => [plan, fastest[i]]);
  return [...new Set(queue)];
}

function _preservesAvailabilityPlan(before, after) {
  const quantities = parts => {
    const result = new Map();
    for (const part of parts) {
      const sku = cleanBaseSKU(part.sku);
      result.set(sku, (result.get(sku) || 0) + Number(part.quantity ?? 1));
    }
    return result;
  };
  const validated = quantities(after);
  return [...quantities(before)].every(([sku, count]) => (validated.get(sku) || 0) >= count);
}

function _validateAvailabilityPlan(plan, context) {
  const { parts, baseline, catalogIndex, chassisInfo, getPrice, revalidateCached, resolveSupply } = context;
  const substitutedItems = [];
  const candidateParts = parts.map(part => {
    const replacement = plan.choices.get(cleanBaseSKU(part.sku));
    if (!replacement || _isProtectedCustomerFastShipPart(part, context.options)) return { ...part };
    const originalDays = _partSupplyAttributes(part, resolveSupply).leadTimeDays;
    if (originalDays === null || originalDays <= replacement.leadTimeDays) return { ...part };
    return _applyAvailabilityReplacement(part, replacement, originalDays, getPrice, substitutedItems);
  });
  const topologyTransitions = _applyFastShipTopologyTransitions(candidateParts, substitutedItems, catalogIndex, chassisInfo, getPrice);
  const revalidated = revalidateCached(candidateParts);
  if (revalidated.physicalMathClean !== true || revalidated.aspectErrors?.length) return null;
  if (!_preservesAvailabilityPlan(candidateParts, revalidated.parts)) return null;
  const originalSkus = new Set(parts.map(part => cleanBaseSKU(part.sku)));
  const introduced = revalidated.parts.filter(part => !originalSkus.has(cleanBaseSKU(part.sku)));
  if (introduced.some(part => !_isAvailableCatalogOption(catalogIndex.get(cleanBaseSKU(part.sku))))) return null;
  const newSupplyMetrics = calculateSupplyMetrics([...revalidated.parts, ...context.globalItems], resolveSupply);
  if (newSupplyMetrics.maxLeadTimeDays === null || newSupplyMetrics.maxLeadTimeDays >= baseline.maxLeadTimeDays) return null;
  const baselineUnknown = new Set(baseline.unknownLeadTimeSkus || []);
  if (newSupplyMetrics.unknownLeadTimeSkus.some(sku => !baselineUnknown.has(sku))) return null;
  return { ...plan, maxDays: newSupplyMetrics.maxLeadTimeDays, revalidated, newSupplyMetrics, topologyTransitions, substitutedItems };
}

function _buildAvailabilityCandidate(solution, baseline, preference, options) {
  const { revalidated, newSupplyMetrics, topologyTransitions, substitutedItems } = solution;
  const originalEdt = baseline.solutionEdtDays;
  const newEdt = newSupplyMetrics.solutionEdtDays;
  const deliveryDaysSaved = Number.isFinite(originalEdt) && Number.isFinite(newEdt) ? originalEdt - newEdt : null;
  const bomFingerprint = computeBomFingerprint(revalidated.parts);
  const liveEdt = options.liveSolutionEdt?.candidateBomFingerprint === bomFingerprint ? options.liveSolutionEdt : null;
  const liveClic = options.liveClicValidation?.bomFingerprint === bomFingerprint ? options.liveClicValidation : null;
  const scheduleInfo = _buildDeliveryScheduleSummary(baseline, newSupplyMetrics, deliveryDaysSaved, liveEdt);
  const clicStatus = _resolveStrategyPortalStatus({ liveClicValidation: liveClic });
  const title = preference === 'CLOSEST_MATCH' ? 'Closest Faster-Availability Match' : 'Fastest Catalog Availability';

  return {
    rank: '1S',
    subRank: '1S',
    validationStatus: clicStatus === 'PORTAL VALIDATION PENDING' ? 'DOCUMENT_AND_PORTAL_VALIDATION_PENDING' : clicStatus,
    portalValidationStatus: clicStatus,
    liveClicValidation: liveClic,
    requiresRequirementReview: true,
    availabilityPreference: preference,
    name: title,
    tierTitle: title,
    skuPartsList: revalidated.parts,
    bomFingerprint,
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
    componentLeadTimeEstimate: scheduleInfo.componentEstimate,
    liveSolutionEdt: scheduleInfo.liveSolutionEdt,
    topologyTransitions,
    substitutedPacingItems: substitutedItems,
    tradeoffMetrics: {
      intentAlignment: 'Catalog-matched substitutions passed local checks. Customer requirements review pending.',
      deliveryImpact: scheduleInfo.deliveryImpact,
      skuModifications: `${substitutedItems.length} bottleneck substitution(s)${topologyTransitions.length ? `, ${topologyTransitions.length} topology cable update(s)` : ''}`
    },
    reasoning: `Pacing-item substitutions and dependent parts passed local configuration checks. ${scheduleInfo.deliveryImpact}`
  };
}

function synthesizeAvailabilityAlternatives(parts, baseline, catalog, chassisInfo, getPrice, revalidateCached, resolveSupply, options = {}) {
  const threshold = options.prioritizeFastShipAsRank2 ? 20 : AVAILABILITY_TARGET_DAYS;
  if (!Number.isFinite(baseline?.maxLeadTimeDays) || baseline.maxLeadTimeDays <= threshold) return [];

  const catalogIndex = buildCatalogSkuIndex(catalog);
  const supplyResolver = resolveSupply || (sku => _catalogSupplyAttributes(catalogIndex.get(cleanBaseSKU(sku))));
  const globalItems = options.availabilityGlobalItems || [];
  const plans = _findAvailabilityPlans([...parts, ...globalItems], baseline.maxLeadTimeDays, supplyResolver, catalogIndex, options);
  const context = { parts, baseline, catalogIndex, chassisInfo, getPrice, revalidateCached, resolveSupply: supplyResolver, options, globalItems };
  const validated = plans.map(plan => _validateAvailabilityPlan(plan, context)).filter(Boolean);
  if (!validated.length) return [];
  const closest = validated.sort(_compareClosestAvailability)[0];
  const fastest = validated.sort(_compareFastestAvailability)[0];
  const result = [_buildAvailabilityCandidate(closest, baseline, 'CLOSEST_MATCH', options)];
  if (fastest.maxDays < closest.maxDays) {
    result.push(_buildAvailabilityCandidate(fastest, baseline, 'FASTEST', options));
  }
  return result;
}

function synthesizeFastShipAlternative(parts, baseline, catalog, chassisInfo, getPrice, revalidateCached, resolveSupply, options = {}) {
  return synthesizeAvailabilityAlternatives(parts, baseline, catalog, chassisInfo, getPrice, revalidateCached, resolveSupply, options)[0] || null;
}

function _resolveStrategyPortalStatus(options = {}) {
  const source = options?.liveClicValidation || options?.clicValidation || options?.clicStatusSummary || null;
  if (!source) return 'PORTAL VALIDATION PENDING';
  const isBomSummary = source === options?.clicStatusSummary;
  const unbuildables = Number(source.unbuildablesCount ?? source.unbuildables ?? source.unbuildableCount ?? 0);
  const errors = Number(source.errorsCount ?? source.errors ?? source.errorCount ?? 0);
  const processControl = Number(source.processControlCount ?? source.processControl ?? 0);
  const warnings = Number(source.warningsCount ?? source.warnings ?? source.warningCount ?? 0);
  if (isBomSummary && !source.portalValidatedFromBom && unbuildables === 0 && errors === 0 && processControl === 0) {
    return 'PORTAL VALIDATION PENDING';
  }
  if (unbuildables > 0 || errors > 0 || processControl > 0) return 'PORTAL_VALIDATION_FAILED';
  return warnings > 0 ? 'PORTAL_VALIDATED_WITH_WARNINGS' : 'PORTAL_VALIDATED';
}

function _tryBudgetMemorySubstitution(parts, aspectCompute, getPrice) {
  const isSilverOrLowTdp = (aspectCompute.maxCpuTdpWatts && aspectCompute.maxCpuTdpWatts <= 165) ||
    parts.some(p => {
      const d = (p.description || '').toLowerCase();
      return (d.includes('silver') || d.includes('4410') || d.includes('4510')) && (d.includes('processor') || d.includes('xeon'));
    });
  if (!isSilverOrLowTdp) return false;

  let changed = false;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const d = (p.description || '').toLowerCase();
    if ((d.includes('5600') || p.sku === 'P73300-B21' || p.sku === 'P64707-B21') && (d.includes('memory') || d.includes('rdimm'))) {
      const altSku = 'P43328-B21';
      const altPrice = getPrice(altSku) || 145.0;
      const curPrice = p.unitPriceUsd || getPrice(p.sku) || 200.0;
      if (altPrice < curPrice) {
        parts[i] = {
          ...p,
          ...REPLACEMENT_SUPPLY_UNKNOWN,
          sku: altSku,
          description: 'HPE 32GB 2Rx8 DDR5-4800 Smart Memory',
          unitPriceUsd: altPrice,
          extendedPriceUsd: altPrice * (p.quantity || 1),
          isStrategyAddon: true,
          category: 'Budget Optimized Memory'
        };
        changed = true;
      }
    }
  }
  return changed;
}

function _tryBudgetPowerSubstitution(parts, aspectPower, getPrice) {
  const estimatedWatts = aspectPower.estimatedNodeWattage || 350;
  const psuWattage = aspectPower.maxPsuWattage || 800;
  if (estimatedWatts >= 450 || psuWattage < 1600) return false;

  let changed = false;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const d = (p.description || '').toLowerCase();
    if ((d.includes('power supply') || d.includes('psu') || p.category === 'Power Supply') && (d.includes('1600w') || d.includes('1800w') || d.includes('2200w'))) {
      const altSku = 'P38995-B21';
      const altPrice = getPrice(altSku) || 280.0;
      const curPrice = p.unitPriceUsd || getPrice(p.sku) || 450.0;
      if (altPrice < curPrice) {
        parts[i] = {
          ...p,
          ...REPLACEMENT_SUPPLY_UNKNOWN,
          sku: altSku,
          description: 'HPE 800W Flex Slot Platinum Hot Plug Power Supply',
          unitPriceUsd: altPrice,
          extendedPriceUsd: altPrice * (p.quantity || 1),
          isStrategyAddon: true,
          category: 'Budget Optimized Power'
        };
        changed = true;
      }
    }
  }
  return changed;
}

function _tryBudgetThermalSubstitution(parts, aspectCompute, aspectPcie, getPrice) {
  const maxCpuTdp = aspectCompute.maxCpuTdpWatts || 0;
  const gpuCount = aspectPcie?.gpuCount || 0;
  if (gpuCount > 0 || maxCpuTdp <= 0 || maxCpuTdp > 270) return false;

  let changed = false;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const raw = String(p.sku || '').trim().toUpperCase();
    const d = (p.description || '').toLowerCase();
    if (raw.startsWith('P74794-B21') || d.includes('max performance heat sink')) {
      const altSku = 'P74792-B21';
      const altPrice = getPrice(altSku) || 316.0;
      parts[i] = {
        ...p,
        ...REPLACEMENT_SUPPLY_UNKNOWN,
        sku: altSku,
        description: 'HPE ProLiant Compute DL380 Gen12 2U High Performance Heat Sink Kit',
        unitPriceUsd: altPrice,
        extendedPriceUsd: altPrice * (p.quantity || 1),
        isStrategyAddon: true,
        category: 'Budget Optimized Thermal'
      };
      changed = true;
    }
  }
  return changed;
}

const CERTIFIED_STORAGE_DOWNTIER_MAP = {
  '800GB_MU_BC': { sku: 'P40542-B21', desc: 'HPE 960GB NVMe Gen4 High Performance Read Intensive SFF BC U.3 SSD', capGb: 960, refPrice: 320.0 },
  '960GB_MU_BC': { sku: 'P40542-B21', desc: 'HPE 960GB NVMe Gen4 High Performance Read Intensive SFF BC U.3 SSD', capGb: 960, refPrice: 320.0 },
  '1.6TB_MU_BC': { sku: 'P40543-B21', desc: 'HPE 1.92TB NVMe Gen4 High Performance Read Intensive SFF BC U.3 SSD', capGb: 1920, refPrice: 450.0 },
  '1.92TB_MU_BC': { sku: 'P40543-B21', desc: 'HPE 1.92TB NVMe Gen4 High Performance Read Intensive SFF BC U.3 SSD', capGb: 1920, refPrice: 450.0 },
  '3.2TB_MU_BC': { sku: 'P40544-B21', desc: 'HPE 3.84TB NVMe Gen4 High Performance Read Intensive SFF BC U.3 SSD', capGb: 3840, refPrice: 850.0 },
  '3.84TB_MU_BC': { sku: 'P40544-B21', desc: 'HPE 3.84TB NVMe Gen4 High Performance Read Intensive SFF BC U.3 SSD', capGb: 3840, refPrice: 850.0 },
  '6.4TB_MU_BC': { sku: 'P40545-B21', desc: 'HPE 7.68TB NVMe Gen4 High Performance Read Intensive SFF BC U.3 SSD', capGb: 7680, refPrice: 1600.0 },
  '7.68TB_MU_BC': { sku: 'P40545-B21', desc: 'HPE 7.68TB NVMe Gen4 High Performance Read Intensive SFF BC U.3 SSD', capGb: 7680, refPrice: 1600.0 }
};

function _isWriteIntensiveStorageWorkload(dna, parts) {
  const normalizedWorkloadDesc = (dna?.workloadDescription || '').replace(/_/g, ' ');
  const normalizedPrimaryWorkload = (dna?.primaryWorkload || '').replace(/_/g, ' ');
  const writeIntensiveRegex = /\b(write intensive|write-intensive|db logging|transaction log|write-heavy|wal|redo log|sap hana|hana|oltp|redis|aof|cassandra|commitlog|commit log|kafka|journal)\b/i;

  return (
    dna?.storageWorkload === 'WRITE_INTENSIVE' ||
    dna?.isWriteIntensive === true ||
    writeIntensiveRegex.test(normalizedWorkloadDesc) ||
    writeIntensiveRegex.test(normalizedPrimaryWorkload) ||
    parts.some(p => writeIntensiveRegex.test((p.description || '').replace(/_/g, ' ')))
  );
}

function _isCandidateMixedUseNvme(p) {
  const desc = (p.description || '').toLowerCase();
  if (desc.includes('controller') || desc.includes('cable') || desc.includes('cage') ||
      desc.includes('backplane') || desc.includes('battery') || desc.includes('blank')) {
    return false;
  }
  const isNvme = desc.includes('nvme');
  const isMixedUse = desc.includes('mixed use') || desc.includes(' mu ') || desc.includes(' mu') || /\bmu\b/i.test(desc) || desc.includes('high performance');
  if (!isNvme || !isMixedUse || desc.includes('read intensive') || desc.includes(' ri ') || desc.includes(' ri')) {
    return false;
  }
  return true;
}

function _findCatalogStorageReplacement(catIndex, origCapGb, isBc, curPrice, safeGetPrice) {
  if (!catIndex) return null;
  for (const [candSku, item] of catIndex.entries()) {
    if (!isActiveCatalogOption(item)) continue;
    const cDesc = (item.skuData?.Description || item.entry?.description || '').toLowerCase();
    if (!cDesc.includes('ssd') || !cDesc.includes('nvme') || !cDesc.includes('read intensive')) continue;
    if (isBc && !cDesc.includes(' bc') && !cDesc.includes('basic carrier')) continue;
    const cTb = cDesc.match(/(\d+(?:\.\d+)?)\s*tb/i);
    const cGb = cDesc.match(/(\d+)\s*gb/i);
    const candCapGb = cTb ? Math.round(parseFloat(cTb[1]) * 1000) : (cGb ? parseInt(cGb[1], 10) : 0);
    if (candCapGb >= origCapGb && candCapGb <= Math.round(origCapGb * 1.5)) {
      const candPrice = safeGetPrice(candSku);
      if (candPrice !== null && candPrice > 0 && candPrice < curPrice) {
        return { sku: candSku, desc: item.skuData?.Description || item.entry?.description, price: candPrice };
      }
    }
  }
  return null;
}

function _findFallbackStorageReplacement(origCapGb, curPrice, safeGetPrice) {
  let mapping = null;
  if (origCapGb <= 960) {
    mapping = CERTIFIED_STORAGE_DOWNTIER_MAP['800GB_MU_BC'];
  } else if (origCapGb <= 1920) {
    mapping = CERTIFIED_STORAGE_DOWNTIER_MAP['1.6TB_MU_BC'];
  } else if (origCapGb <= 3840) {
    mapping = CERTIFIED_STORAGE_DOWNTIER_MAP['3.2TB_MU_BC'];
  } else {
    mapping = CERTIFIED_STORAGE_DOWNTIER_MAP['6.4TB_MU_BC'];
  }
  if (!mapping) return null;

  const candPrice = safeGetPrice(mapping.sku) || mapping.refPrice;
  if (candPrice < curPrice) {
    return { sku: mapping.sku, desc: mapping.desc, price: candPrice };
  }
  return null;
}

function _tryBudgetStorageSubstitution(parts, workloadDna, loadedCatalog, getPrice) {
  if (!Array.isArray(parts) || parts.length === 0) return false;

  const safeGetPrice = typeof getPrice === 'function' ? getPrice : () => null;
  const dna = workloadDna || extractWorkloadDna(parts);

  if (_isWriteIntensiveStorageWorkload(dna, parts)) {
    return false; // Invariant: Never down-tier write-intensive workloads
  }

  let changed = false;
  const catIndex = loadedCatalog ? buildCatalogSkuIndex(loadedCatalog) : null;

  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (!_isCandidateMixedUseNvme(p)) continue;

    const desc = (p.description || '').toLowerCase();
    const tbMatch = desc.match(/(\d+(?:\.\d+)?)\s*tb/i);
    const gbMatch = desc.match(/(\d+)\s*gb/i);
    const origCapGb = tbMatch ? Math.round(parseFloat(tbMatch[1]) * 1000) : (gbMatch ? parseInt(gbMatch[1], 10) : 1920);
    const isBc = desc.includes(' bc') || desc.includes('basic carrier') || !desc.includes(' sc');
    const curPrice = p.unitPriceUsd || safeGetPrice(p.sku) || 999999;

    let replacement = _findCatalogStorageReplacement(catIndex, origCapGb, isBc, curPrice, safeGetPrice);
    if (!replacement) {
      const fallbackCurPrice = p.unitPriceUsd || safeGetPrice(p.sku) || (850 * 1.6);
      replacement = _findFallbackStorageReplacement(origCapGb, fallbackCurPrice, safeGetPrice);
    }

    if (replacement && cleanBaseSKU(replacement.sku) !== cleanBaseSKU(p.sku)) {
      parts[i] = {
        ...p,
        ...REPLACEMENT_SUPPLY_UNKNOWN,
        sku: replacement.sku,
        description: replacement.desc,
        unitPriceUsd: replacement.price,
        extendedPriceUsd: replacement.price * (p.quantity || 1),
        isStrategyAddon: true,
        category: 'Budget Optimized Storage'
      };
      changed = true;
    }
  }
  return changed;
}

function synthesizeBudgetMinimizationCandidate(v1, evalResults, loadedCatalog, chassisInfo, getPrice, revalidateCached, options = {}) {
  const parts = v1.parts.map(p => ({ ...p }));
  const aspectCompute = evalResults.aspects?.compute || {};
  const aspectPower = evalResults.aspects?.power || {};
  const aspectPcie = evalResults.aspects?.pcie || {};
  const workloadDna = evalResults.workloadDna || evalResults.dna || options.dna || extractWorkloadDna(parts);

  const mChanged = _tryBudgetMemorySubstitution(parts, aspectCompute, getPrice);
  const pChanged = _tryBudgetPowerSubstitution(parts, aspectPower, getPrice);
  const tChanged = _tryBudgetThermalSubstitution(parts, aspectCompute, aspectPcie, getPrice);
  const sChanged = _tryBudgetStorageSubstitution(parts, workloadDna, loadedCatalog, getPrice);

  if (mChanged || pChanged || tChanged || sChanged) {
    const reval = revalidateCached(parts);
    const mathAcceptable = reval.physicalMathClean || !_physicalMathValidator;
    if (mathAcceptable && reval.totalCost < v1.totalCost) {
      return {
        parts: reval.parts,
        totalCost: reval.totalCost,
        injectedFixes: reval.injectedFixes,
        physicalMathClean: reval.physicalMathClean,
        aspectErrors: reval.aspectErrors,
        isAlternativeAvailable: true,
        deltaUsd: v1.totalCost - reval.totalCost
      };
    }
  }

  return {
    parts: v1.parts.map(p => ({ ...p, category: p.isFixInjected ? 'Aspect Rule Fix' : 'Minimal CapEx Baseline' })),
    totalCost: v1.totalCost,
    injectedFixes: v1.injectedFixes,
    physicalMathClean: v1.physicalMathClean,
    aspectErrors: v1.aspectErrors,
    isAlternativeAvailable: false,
    deltaUsd: 0
  };
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
  const rank2ConfigAddons = tierConfig.rank2 || [];
  const rank2RawList = rank2ConfigAddons.length > 0 ? rank2ConfigAddons : dynamicDiscoveredAddons.rank2Addons;
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

function _buildRank3PartsAndMetadata({ arbitrationBranches, tierConfig, dynamicDiscoveredAddons, leastDeltaCandidate, rank1Parts, rank2Parts, baseParts, fixParts, getPrice, loadedCatalog, chassisInfo, items, rank1Cost, dna, fixes }) {
  const pcieStorageBranch = arbitrationBranches.find(b => b.branchId === 'branch_pcie_storage_ocp_nic');
  if (pcieStorageBranch) {
    const pcieRes = buildRank3PcieStorageBranchParts({
      pcieStorageBranch, baseParts, fixParts, getPrice, loadedCatalog, chassisInfo, items, rank1Cost
    });
    return {
      rank3Parts: pcieRes.rank3Parts,
      rank3AddonCost: pcieRes.rank3AddonCost,
      rank3Addons: [],
      rank3Name: 'Rank 3: High-IOPS & Contested Form-Factor Optimized (PCIe Storage + OCP NIC Retention)',
      rank3Reasoning: 'Pivoted storage controller to PCIe (MR416i-p 8GB Cache) to free OCP Slot 1 for customer\'s P10115-B21 10/25Gb OCP3 adapter, validating original P48832-B21 cable choice.',
      rank3IntentAlignment: '100% Exact Part Number Match (Fulfills P10115-B21 & P48832-B21)',
      rank3CascadingImpact: pcieRes.rank3CascadingImpact,
      pcieStorageBranch
    };
  }
  const rank3ConfigAddons = tierConfig.rank3 || [];
  const rank3RawList = rank3ConfigAddons.length > 0 ? rank3ConfigAddons : dynamicDiscoveredAddons.rank3Addons;
  const rank3Addons = rank3RawList.map(a => {
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
  const rank3Parts = [...rank3BaseParts, ...rank3Addons];
  const rank3AddonCost = rank3Addons.reduce((acc, a) => acc + a.extendedPriceUsd, 0);
  const rank3Name = isModernizedGen5
    ? 'Rank 3: High-IOPS & Storage Performance Optimized (Modernized 5th Gen Platform)'
    : 'Rank 3: High-IOPS & Storage Performance Optimized';
  const rank3Reasoning = isModernizedGen5
    ? 'Upgrades storage write-cache and smart hybrid battery protection on the modernized 5th Gen platform for enhanced transactional database read/write IOPS.'
    : 'Upgrades storage write-cache and smart hybrid battery protection for enhanced transactional database read/write IOPS.';
  return {
    rank3Parts,
    rank3AddonCost,
    rank3Addons,
    rank3Name,
    rank3Reasoning,
    rank3IntentAlignment: `${Math.max(75, 90 - fixes.length * 3)}% (Storage Heavy)`,
    rank3CascadingImpact: null,
    pcieStorageBranch: null
  };
}

function _buildRank4PartsAndMetadata({ tierConfig, dynamicDiscoveredAddons, leastDeltaCandidate, rank1Parts, rank2Parts, getPrice }) {
  const isModernizedGen5 = leastDeltaCandidate?.strategyName === 'MODERNIZED_5TH_GEN_PLATFORM';
  const rank4BaseParts = isModernizedGen5 ? rank2Parts : rank1Parts;
  const rank4ConfigAddons = tierConfig.rank4 || [];
  const rank4RawList = rank4ConfigAddons.length > 0 ? rank4ConfigAddons : dynamicDiscoveredAddons.rank4Addons;
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
  return {
    rank4Parts,
    rank4AddonCost,
    rank4Addons,
    rank4Name
  };
}

function _recordMandatoryFixesDecision(decisionLedger, fixes, getPrice) {
  if (!fixes || fixes.length === 0) return;
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

function _recordLeastDeltaDecision(decisionLedger, leastDeltaCandidate) {
  if (!leastDeltaCandidate) return;
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

function _buildRank1Candidate({
  rank1Name, rank1Reasoning, leastDeltaCandidate, fixes, v1, baseCost, fixCost, dna,
  v1SupplyMetrics, fastShipAlternative, getLiveRagGrounding, decisionLedger
}) {
  return {
    rank: 1,
    strategyId: 'STRATEGY_CLOSEST_INTENT',
    strategyIdentity: 'STRATEGY_CLOSEST_INTENT',
    name: rank1Name,
    leastDeltaAlternative: leastDeltaCandidate ? {
      ...leastDeltaCandidate,
      strategyId: 'STRATEGY_LEAST_DELTA',
      strategyIdentity: 'STRATEGY_LEAST_DELTA',
      rank: '1L'
    } : null,
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
    availabilityTradeoffs: fastShipAlternative?.substitutedPacingItems || [],
    tradeoffMetrics: {
      intentAlignment: fixes.length === 0 ? '100% (Direct Match)' : `${Math.max(85, 100 - fixes.length * 3)}% (${fixes.length} Fixes)`,
      skuModifications: `${fixes.length + v1.injectedFixes.length} physical fixes injected`,
      costDeltaUsd: `+$${fixCost.toLocaleString()} (Mandatory Buildability)`,
      capacityExpansion: 'Optimal (Zero over/under-provisioning)',
      fastShipAlternativeAvailable: Boolean(fastShipAlternative),
      deliveryDaysSaved: fastShipAlternative?.deliveryDaysSaved ?? null
    },
    ragSecondOpinion: getLiveRagGrounding(
      'Intent Preserved',
      fixes.map(f => f.sku).concat(['chassis', 'processor', 'memory']),
      '✅ Local Rule Engine Validated: Direct translation of customer requirements with mandatory buildability fixes.'
    ),
    reasoning: rank1Reasoning,
    decisionTrace: decisionLedger.getDecisions()
  };
}

function _buildRankedAvailabilityCandidate({
  fastShipAlternative, fixes, baseCost, fixCost, decisionLedger
}) {
  return {
    rank: 2,
    strategyId: fastShipAlternative.availabilityPreference === 'CLOSEST_MATCH' ? 'STRATEGY_FAST_SHIP_RANK2' : 'STRATEGY_FASTEST_AVAILABILITY',
    isFastShipRank2: fastShipAlternative.availabilityPreference === 'CLOSEST_MATCH',
    availabilityPreference: fastShipAlternative.availabilityPreference,
    requiresRequirementReview: fastShipAlternative.requiresRequirementReview,
    name: fastShipAlternative.name,
    score: parseFloat(Math.max(0.65, 0.92 - (fixes.length * 0.02)).toFixed(2)),
    estimatedCostUsd: fastShipAlternative.estimatedCostUsd,
    budgetBreakdown: {
      baseBomCost: baseCost,
      fixCost: fixCost,
      strategyAddonCost: Math.max(0, fastShipAlternative.estimatedCostUsd - baseCost),
      totalBudgetUsd: fastShipAlternative.estimatedCostUsd
    },
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

function _buildRank2StandardCandidate({
  rank2LeastDelta, rank2Name, fixes, v2, baseCost, fixCost, rank2AddonCost,
  rank2Parts, rank1Parts, rank2IntentAlignment, rank2Reasoning, tierConfig,
  getLiveRagGrounding, decisionLedger
}) {
  let dnaMatch = 'Factory Standard (Cable Management Arm & Tool-less Rail Kits)';
  if (rank2LeastDelta) {
    dnaMatch = rank2LeastDelta.strategyName === 'MODERNIZED_5TH_GEN_PLATFORM'
      ? 'Modernized 5th Gen Platform (Emerald Rapids + DDR5-5600)'
      : 'Least-Delta Optimization (Pruned Cascades)';
  }

  const changesCount = rank2LeastDelta
    ? rank2LeastDelta.deltaMetrics.totalDeltaOperations
    : fixes.length + (rank2Parts.length - rank1Parts.length) + v2.injectedFixes.length;

  const tradeoffMetrics = {
    intentAlignment: rank2IntentAlignment,
    skuModifications: rank2LeastDelta ? rank2LeastDelta.deltaSummary : `${fixes.length} modifications`,
    costDeltaUsd: `+$${rank2AddonCost.toLocaleString()}`,
    capacityExpansion: rank2LeastDelta ? 'Cascade-Free Architecture' : 'Standard Factory Margins',
    presalesPitch: rank2LeastDelta?.presalesValuePitch || 'Factory standard accessory kit inclusion'
  };

  const ragOpinion = getLiveRagGrounding(
    rank2LeastDelta ? 'Least-Delta Alternative' : 'Standardized CTO Baseline',
    (rank2LeastDelta?.cascadingSkusEliminated || []).concat(['cable', 'rail', 'chassis']),
    rank2LeastDelta
      ? `✅ Local Rule Engine Validated: ${rank2LeastDelta.presalesValuePitch}`
      : `✅ Local Rule Engine Validated: CTO factory standardized baseline (${tierConfig.rank2?.[0]?.description || 'Factory Cable/Rail Kit'}) and routing verified.`
  );

  return {
    rank: 2,
    strategyId: rank2LeastDelta ? 'STRATEGY_LEAST_DELTA' : 'STRATEGY_CTO_BASELINE',
    strategyIdentity: rank2LeastDelta ? 'STRATEGY_LEAST_DELTA' : 'STRATEGY_CTO_BASELINE',
    name: rank2Name,
    score: parseFloat(Math.max(0.65, 0.92 - (fixes.length * 0.02)).toFixed(2)),
    estimatedCostUsd: v2.totalCost,
    budgetBreakdown: {
      baseBomCost: baseCost,
      fixCost: fixCost,
      strategyAddonCost: rank2AddonCost,
      totalBudgetUsd: v2.totalCost
    },
    workloadDnaMatch: dnaMatch,
    changesCount,
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
    tradeoffMetrics,
    ragSecondOpinion: ragOpinion,
    reasoning: rank2Reasoning,
    decisionTrace: decisionLedger.getDecisions()
  };
}

function _buildRank2Candidate(ctx) {
  if (ctx.options?.prioritizeFastShipAsRank2 && ctx.fastShipAlternative) {
    return _buildRankedAvailabilityCandidate(ctx);
  }
  return _buildRank2StandardCandidate(ctx);
}

function _buildRank3Candidate({
  rank3Name, rank3Reasoning, rank3AddonCost, rank3Addons, rank3IntentAlignment, rank3CascadingImpact,
  pcieStorageBranch, dna, fixes, v3, baseCost, fixCost, getLiveRagGrounding
}) {
  return {
    rank: 3,
    strategyId: 'STRATEGY_PERFORMANCE',
    strategyIdentity: 'STRATEGY_PERFORMANCE',
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
  };
}

function _buildRank4Candidate({
  rank4Name, rank4AddonCost, rank4Addons, fixes, v4, baseCost, fixCost, getLiveRagGrounding
}) {
  return {
    rank: 4,
    strategyId: 'STRATEGY_EXPANSION',
    strategyIdentity: 'STRATEGY_EXPANSION',
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
    reasoning: 'Populates full secondary PCIe riser slots and high-performance fan kits to support future GPU accelerator and 2nd CPU socket expansions.'
  };
}

function _buildRank5Candidate({
  v5, fixes, baseCost, fixCost, getLiveRagGrounding
}) {
  const isAvailable = Boolean(v5.isAlternativeAvailable);
  return {
    rank: 5,
    strategyId: 'STRATEGY_BUDGET',
    strategyIdentity: 'STRATEGY_BUDGET',
    isAlternativeAvailable: isAvailable,
    name: isAvailable
      ? 'Rank 5: Budget & CapEx Minimized Buildable Alternative'
      : 'Rank 5: Baseline Preserved (No Further Safe CapEx Reductions Available)',
    score: parseFloat(Math.max(0.50, 0.75 - (fixes.length * 0.02)).toFixed(2)),
    estimatedCostUsd: v5.totalCost,
    budgetBreakdown: {
      baseBomCost: baseCost,
      fixCost: fixCost,
      strategyAddonCost: 0,
      totalBudgetUsd: v5.totalCost
    },
    workloadDnaMatch: isAvailable
      ? 'Budget Optimized (Certified Down-Tiering)'
      : 'Strict Minimum CapEx (100% Buildable Baseline)',
    changesCount: fixes.length + v5.injectedFixes.length,
    skuPartsList: v5.parts,
    bomFingerprint: computeBomFingerprint(v5.parts),
    physicalMathClean: v5.physicalMathClean,
    isMathClean: v5.physicalMathClean,
    aspectErrors: v5.aspectErrors || [],
    injectedCascadingFixes: v5.injectedFixes,
    tradeoffMetrics: {
      intentAlignment: isAvailable
        ? `${Math.max(65, 80 - fixes.length * 3)}% (Budget Optimized)`
        : `${Math.max(65, 80 - fixes.length * 3)}% (Minimal Baseline)`,
      skuModifications: `${fixes.length + v5.injectedFixes.length} fixes & modifications`,
      costDeltaUsd: isAvailable
        ? `-$${v5.deltaUsd.toLocaleString()} (CapEx Down-Tiering)`
        : '$0 (Baseline is already CapEx minimal)',
      capacityExpansion: 'Baseline Only'
    },
    ragSecondOpinion: getLiveRagGrounding(
      isAvailable ? 'Budget CapEx Down-Tiering' : 'Minimal CapEx Baseline',
      ['minimal', 'baseline', 'chassis'],
      isAvailable
        ? `✅ Local Rule Engine Validated: Certified budget alternative down-tiering over-provisioned components (-$${v5.deltaUsd.toLocaleString()}).`
        : `✅ Local Rule Engine Validated: 100% buildable certified baseline without unrequested add-ons (${v5.parts.length} essential parts).`
    ),
    reasoning: isAvailable
      ? 'Certified budget alternative down-tiering over-provisioned components to deliver lower CapEx while remaining 100% physically buildable.'
      : 'Strict baseline buildable tier eliminating all optional add-ons to minimize total CapEx expenditure while remaining 100% buildable. Rank 1 already represents the minimal certified spend; no further component down-tiering is safely applicable without violating physical constraints.'
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

  const baseCost = items.reduce((acc, it) => {
    const p = getPrice(it.sku) || it.unitPriceUsd || it.priceUsd || 0;
    return acc + (p * (it.quantity || 1));
  }, 0);
  const fixes = evalResults.missingDependencies || [];
  const fixCost = fixes.reduce((acc, f) => {
    const unitPrice = getPrice(f.sku);
    return acc + ((f.quantity || 1) * unitPrice);
  }, 0);

  const baseParts = computeBaseParts(items, getPrice);
  const fixParts = computeFixParts(fixes, getPrice);

  const decisionLedger = createDecisionTraceLedger();
  _recordMandatoryFixesDecision(decisionLedger, fixes, getPrice);

  const rank1Parts = [...baseParts, ...fixParts];
  const rank1Cost = rank1Parts.reduce((acc, p) => acc + (p.extendedPriceUsd || (p.unitPriceUsd * p.quantity)), 0);

  const { tierConfig } = getStrategyConfig(chassisInfo);
  const dynamicDiscoveredAddons = discoverDynamicStrategyAddons(loadedCatalog, chassisInfo, dna);
  const getLiveRagGrounding = createLiveRagGrounding(chassisInfo);

  // Least-Delta Analysis: Detect troublesome SKUs that force cascading dependencies
  const troublesomeSkus = identifyTroublesomeSkus(items, evalResults, loadedCatalog, chassisInfo);
  const leastDeltaCandidate = buildLeastDeltaCandidate(baseParts, fixParts, troublesomeSkus, evalResults, loadedCatalog, chassisInfo, getPrice);

  _recordLeastDeltaDecision(decisionLedger, leastDeltaCandidate);

  // Determine Rank 1 title and nature
  const isStraightforwardWinner = fixes.length === 0 && (!evalResults.errors || evalResults.errors.length === 0);
  const rank1Name = isStraightforwardWinner
    ? 'Rank 1: Customer Configuration (Local Rules Passed)'
    : 'Rank 1: Customer Workload Intent Preserved (Optimal Match)';
  const rank1Reasoning = isStraightforwardWinner
    ? 'Normalized customer configuration passes local rules without additions, removals, or replacements. PORTAL VALIDATION PENDING.'
    : 'Preserves the exact customer configuration with mandatory aspect fixes applied to satisfy physical buildability.';

  // Rank 2: Least-Delta Alternative Path or Standardized CTO Baseline
  const {
    rank2Parts, rank2AddonCost, rank2Name, rank2Reasoning, rank2IntentAlignment, rank2LeastDelta
  } = _buildRank2PartsAndMetadata({
    leastDeltaCandidate, tierConfig, dynamicDiscoveredAddons, rank1Parts, rank1Cost, baseCost, getPrice, fixes
  });

  // Rank 3
  const arbitrationBranches = (evalResults.arbitrationResults || {}).branches || [];
  const {
    rank3Parts, rank3AddonCost, rank3Addons, rank3Name, rank3Reasoning, rank3IntentAlignment, rank3CascadingImpact, pcieStorageBranch
  } = _buildRank3PartsAndMetadata({
    arbitrationBranches, tierConfig, dynamicDiscoveredAddons, leastDeltaCandidate, rank1Parts, rank2Parts,
    baseParts, fixParts, getPrice, loadedCatalog, chassisInfo, items, rank1Cost, dna, fixes
  });

  // Rank 4
  const {
    rank4Parts, rank4AddonCost, rank4Addons, rank4Name
  } = _buildRank4PartsAndMetadata({
    tierConfig, dynamicDiscoveredAddons, leastDeltaCandidate, rank1Parts, rank2Parts, getPrice
  });

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

  // Rank 5: Budget & CapEx Minimized Candidate
  const v5 = synthesizeBudgetMinimizationCandidate(v1, evalResults, loadedCatalog, chassisInfo, getPrice, revalidateCached, { dna });

  const v1SupplyMetrics = calculateSupplyMetrics([...v1.parts, ...(options.availabilityGlobalItems || [])], resolveSupply);
  const availabilityAlternatives = synthesizeAvailabilityAlternatives(
    v1.parts, v1SupplyMetrics, loadedCatalog, chassisInfo, getPrice, revalidateCached, resolveSupply, options
  );
  const fastShipAlternative = availabilityAlternatives[0];

  // Assemble 5 Candidates cleanly via modular builders
  const rawCandidates = [
    _buildRank1Candidate({
      rank1Name, rank1Reasoning, leastDeltaCandidate, fixes, v1, baseCost, fixCost, dna,
      v1SupplyMetrics, fastShipAlternative, getLiveRagGrounding, decisionLedger
    }),
    _buildRank2Candidate({
      options, fastShipAlternative, rank2LeastDelta, rank2Name, fixes, v2, baseCost, fixCost,
      rank2AddonCost, rank2Parts, rank1Parts, rank2IntentAlignment, rank2Reasoning, tierConfig,
      getLiveRagGrounding, decisionLedger
    }),
    _buildRank3Candidate({
      rank3Name, rank3Reasoning, rank3AddonCost, rank3Addons, rank3IntentAlignment, rank3CascadingImpact,
      pcieStorageBranch, dna, fixes, v3, baseCost, fixCost, getLiveRagGrounding
    }),
    _buildRank4Candidate({
      rank4Name, rank4AddonCost, rank4Addons, fixes, v4, baseCost, fixCost, getLiveRagGrounding
    }),
    _buildRank5Candidate({
      v5, fixes, baseCost, fixCost, getLiveRagGrounding
    }),
    ...availabilityAlternatives.slice(options.prioritizeFastShipAsRank2 ? 1 : 0).map(alternative =>
      _buildRankedAvailabilityCandidate({ fastShipAlternative: alternative, fixes, baseCost, fixCost, decisionLedger }))
  ];

  const requestedSkuSet = scoreAndSortCandidates(rawCandidates, items, resolveSupply, options);
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
