'use strict';
/**
 * scripts/lib/taxonomy/sku_resolver.js
 *
 * Dynamic Capability-Based SKU Resolver & Parameterized Domain Equations
 *
 * Eliminates static SKU hardcoding by resolving hardware enablement accessories
 * and physical constraints dynamically through Component Roles, Physical Specs,
 * and Parameterized Engineering Equations.
 */

const { cleanBaseSKU, buildCatalogSkuIndex } = require('../catalog/sku.js');
const { classifyComponentRole } = require('../catalog/product_meta.js');

/**
 * Standard Chassis Physical Parameters Vector (\theta_{chassis})
 * Defaults represent standard enterprise 2U servers, dynamically overridden by catalog data.
 */
// Unknown physical limits must be supplied by a cited chassis profile.
const DEFAULT_CHASSIS_PARAMETERS = Object.freeze({});

function getChassisEquationParameters(catalogData = null, chassisKey = '') {
  return { ...(catalogData?.chassisMetadata || {}), chassisKey,
    provenance: catalogData?.chassisMetadata?.provenance || null };
}

/**
 * Extract numerical price from catalog SKU row while preserving explicit zero prices
 * @param {object} skuData - Catalog SKU data object
 * @returns {{ price: number|null, hasPrice: boolean }}
 */
function extractCatalogItemPrice(skuData) {
  if (!skuData) return { price: null, hasPrice: false };
  const rawPrice = skuData.listPrice ?? skuData['Unit Price (USD)'] ?? skuData['List Price (USD)'];
  if (rawPrice === undefined || rawPrice === null || rawPrice === '') {
    return { price: null, hasPrice: false };
  }
  const cleaned = String(rawPrice).trim().replace(/^\$\s*/, '').replace(/,/g, '');
  const num = /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(cleaned) ? Number(cleaned) : NaN;
  if (!Number.isFinite(num) || num < 0) {
    return { price: null, hasPrice: false };
  }
  return { price: num, hasPrice: true };
}

/**
 * Validate a candidate catalog SKU against role, specification, and keyword requirements
 * @param {object} skuData
 * @param {string} parentCat
 * @param {string} skuId
 * @param {object} criteria
 * @returns {{ eligible: boolean, score: number }}
 */
function validateCandidateAgainstCriteria(skuData, parentCat, skuId, criteria = {}) {
  const { role, keywords = [], specs = {}, allowObsolete = false } = criteria;
  const targetRole = String(role || '').toLowerCase();
  const kwList = Array.isArray(keywords) ? keywords.map(k => String(k).toLowerCase()) : [];
  const desc = String(skuData.Description || skuData.description || '').toLowerCase();
  const cat = String(parentCat || skuData['Parent Category'] || skuData.parentCategory || '').toLowerCase();
  const subcat = String(skuData.subCategory || skuData['Subcategory'] || '').toLowerCase();
  const itemRole = (skuData['Component Role'] || classifyComponentRole(parentCat, desc)).toLowerCase();

  // 1. Lifecycle filter: reject obsolete/discontinued unless explicitly allowed
  const lifecycle = String(skuData['Lifecycle Status'] || skuData.lifecycleStatus || '').toLowerCase();
  if (!allowObsolete && (lifecycle.includes('obsolete') || lifecycle.includes('discontinued') || skuData['Diff Status'] === 'REMOVED')) {
    return { eligible: false, score: 0 };
  }

  // 2. Role and Category compatibility filter
  let roleMatch = false;
  if (!targetRole) {
    roleMatch = true;
  } else if (itemRole && (itemRole === targetRole)) {
    roleMatch = true;
  } else if ((targetRole.includes('fan') || targetRole.includes('cooling')) && (itemRole.includes('cooling') || desc.includes('fan') || cat.includes('fan'))) {
    roleMatch = true;
  } else if ((targetRole.includes('battery') || targetRole.includes('capacitor')) && (itemRole.includes('battery') || desc.includes('battery') || cat.includes('battery') || desc.includes('bbu'))) {
    roleMatch = true;
  } else if ((targetRole.includes('transceiver') || targetRole.includes('optic')) && (itemRole.includes('transceiver') || desc.includes('transceiver') || desc.includes('sfp') || desc.includes('qsfp') || cat.includes('transceiver'))) {
    roleMatch = true;
  } else if ((targetRole.includes('cable') || targetRole.includes('lug')) && (itemRole.includes('cable') || desc.includes('cable') || desc.includes('lug kit') || cat.includes('cable'))) {
    roleMatch = true;
  } else if (targetRole.includes('drive') && (itemRole.includes('drive') || desc.includes('drive') || cat.includes('drive'))) {
    roleMatch = true;
  }

  if (!roleMatch) {
    return { eligible: false, score: 0 };
  }

  // 3. Keyword filtering (crucial for distinguishing e.g. "no drive" from ordinary drives)
  let matchedKwCount = 0;
  for (const kw of kwList) {
    if (desc.includes(kw) || cat.includes(kw) || subcat.includes(kw)) {
      matchedKwCount++;
    }
  }

  // If looking for "no drive", candidate MUST explicitly have "no drive" or "diskless"
  if (kwList.some(k => k.includes('no drive') || k.includes('diskless'))) {
    const hasNoDrive = desc.includes('no drive') || desc.includes('diskless') || cat.includes('no drive');
    if (!hasNoDrive) return { eligible: false, score: 0 };
  }

  // If requireKeywordMatch is set or keywords provided for generic roles, require at least one keyword match
  if (kwList.length > 0) {
    if (matchedKwCount === 0) return { eligible: false, score: 0 };
  }

  // 4. Specification filtering
  if (specs.speedGb) {
    const targetSpeed = Number(specs.speedGb);
    const speedPattern = new RegExp(`\\b${targetSpeed}\\s*(?:gb|g|gbe)\\b`, 'i');
    if (!speedPattern.test(desc) && !speedPattern.test(cat)) {
      return { eligible: false, score: 0 };
    }
    // Reject conflicting optical speeds (e.g. 10Gb/25Gb/16Gb when 32Gb requested)
    if (targetSpeed === 32 && /\b(?:10|25|16|64|100)\s*(?:gb|g)\b/i.test(desc) && !desc.includes('32gb')) {
      return { eligible: false, score: 0 };
    }
    if (targetSpeed === 64 && /\b(?:10|25|16|32|100)\s*(?:gb|g)\b/i.test(desc) && !desc.includes('64gb')) {
      return { eligible: false, score: 0 };
    }
  }

  if (specs.wattage) {
    const targetWattage = Number(specs.wattage);
    const wattPattern = new RegExp(`\\b${targetWattage}\\s*w\\b`, 'i');
    if (!wattPattern.test(desc)) {
      return { eligible: false, score: 0 };
    }
  }

  if (specs.protocol) {
    const protocolText = `${desc} ${cat}`;
    const matches = specs.protocol === 'fibre channel'
      ? /\bfibre\s*channel\b|\bfiber\s*channel\b|\bfc\b/i.test(protocolText)
      : protocolText.includes(String(specs.protocol).toLowerCase());
    if (!matches) return { eligible: false, score: 0 };
  }

  // 5. Score computation
  let score = 10;
  if (targetRole && itemRole.includes(targetRole)) score += 20;
  score += matchedKwCount * 10;
  if (specs.speedGb) score += 15;
  if (specs.wattage) score += 15;
  if (lifecycle === 'active') score += 5;

  return { eligible: true, score };
}

/**
 * Dynamically resolve a hardware component SKU from catalog by Component Role & Specifications
 * @param {object} catalogData - Loaded catalog object
 * @param {object} criteria - Search criteria { role, keywords, specs, preferredSku, allowObsolete, requireKeywordMatch }
 * @returns {object} { found: boolean, sku: string|null, description: string, price: number|null, hasPrice: boolean, isResolved: boolean, requirementTag: string|null, provenance: string }
 */
function resolveComponentByRole(catalogData, criteria = {}) {
  const { role, preferredSku = '' } = criteria;
  const requirementTag = `REQUIREMENT_${(role || 'ACCESSORY').toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;

  if (!catalogData) {
    return {
      found: false,
      sku: null,
      description: criteria.genericDescription || `${role || 'Component'} Enablement Requirement`,
      price: null,
      hasPrice: false,
      isResolved: false,
      requirementTag,
      provenance: 'UNRESOLVED_NO_CATALOG'
    };
  }

  const skuIndex = buildCatalogSkuIndex(catalogData);

  // 1. If preferred SKU is supplied and exists in catalog, verify role and specifications
  if (preferredSku) {
    const cleanPref = cleanBaseSKU(preferredSku);
    const item = skuIndex.get(cleanPref);
    if (item) {
      const validation = validateCandidateAgainstCriteria(item.skuData, item.parentCategory, cleanPref, criteria);
      if (validation.eligible) {
        const priceInfo = extractCatalogItemPrice(item.skuData);
        return {
          found: true,
          sku: cleanPref,
          description: item.skuData?.Description || item.description || '',
          price: priceInfo.price,
          hasPrice: priceInfo.hasPrice,
          isResolved: true,
          requirementTag: null,
          provenance: item.skuData?.provenance || 'Catalog Index (Preferred SKU Verified)'
        };
      }
    }
  }

  // 2. Scan canonical catalog items matching role, keywords, and specifications
  const candidateList = [];

  // Support both canonical skuIndex and fallback entries array
  for (const [skuId, item] of skuIndex.entries()) {
    const skuData = item.skuData || {};
    const parentCat = item.parentCategory || '';
    const validation = validateCandidateAgainstCriteria(skuData, parentCat, skuId, criteria);

    if (validation.eligible) {
      const priceInfo = extractCatalogItemPrice(skuData);
      candidateList.push({
        sku: cleanBaseSKU(skuId),
        description: skuData.Description || skuData.description || '',
        price: priceInfo.price,
        hasPrice: priceInfo.hasPrice,
        score: validation.score,
        provenance: skuData.provenance || 'Catalog Index (Capability Match)'
      });
    }
  }

  if (candidateList.length > 0) {
    // Return highest scoring candidate
    candidateList.sort((a, b) => b.score - a.score);
    const best = candidateList[0];
    return {
      found: true,
      sku: best.sku,
      description: best.description,
      price: best.price,
      hasPrice: best.hasPrice,
      isResolved: true,
      requirementTag: null,
      provenance: best.provenance
    };
  }

  // 3. Not found in catalog: emit clean requirement tag without fabricating false SKU
  return {
    found: false,
    sku: null,
    description: criteria.genericDescription || `${role || 'Component'} Enablement Requirement`,
    price: null,
    hasPrice: false,
    isResolved: false,
    requirementTag,
    provenance: 'UNRESOLVED_REQUIREMENT'
  };
}

/**
 * Parameterized Invariant Equation: Thermal & Cooling Balance
 * Evaluates CPU and total envelope (CPU + GPU) against chassis thermal threshold
 * Formula: (cpuTdpWatts > \theta.maxTdpThreshold || totalTdpWatts > \theta.maxEnvelopeThreshold) => Requires High-Perf Cooling
 */
function evaluateThermalCoolingEquation(cpuTdpWatts, gpuTdpWatts = 0, hasHighPerfFans = false, hasHeatsinks = false, theta = DEFAULT_CHASSIS_PARAMETERS) {
  const threshold = theta.maxTdpThreshold;
  const maxEnvelope = theta.maxEnvelopeThreshold;
  if (![threshold, maxEnvelope, cpuTdpWatts, gpuTdpWatts].every(value => Number.isFinite(value) && value >= 0)) return { status: 'NOT_EVALUATED', needsHighPerfCooling: null, reason: 'Explicit CPU and total-envelope limits and finite power operands are required' };
  const totalTdpWatts = Number(cpuTdpWatts || 0) + Number(gpuTdpWatts || 0);
  const isHighTdp = cpuTdpWatts > threshold || totalTdpWatts > maxEnvelope;
  const needsCooling = isHighTdp && (!hasHighPerfFans || !hasHeatsinks);

  return {
    status: needsCooling ? 'FAIL' : 'PASS',
    isHighTdp,
    threshold,
    cpuTdpWatts,
    gpuTdpWatts,
    totalTdpWatts,
    needsHighPerfCooling: needsCooling,
    missingFanKit: isHighTdp && !hasHighPerfFans,
    missingHeatsink: isHighTdp && !hasHeatsinks,
    formula: `cpuTdp (${cpuTdpWatts}W) > ${threshold}W || totalTdp (${totalTdpWatts}W) > ${maxEnvelope}W => requiresHighPerfCooling = ${needsCooling}`
  };
}

/**
 * Parameterized Invariant Equation: DC Power Terminal Lug Protection
 * Evaluates discrete counts: each DC power supply requires a DC terminal lug kit
 * Formula: dcPsuCount > dcLugKitCount => requiresDcLugKit
 */
function evaluateDcPowerEquation(dcPsuCount, dcLugKitCount = 0, theta = DEFAULT_CHASSIS_PARAMETERS) {
  const psuCount = typeof dcPsuCount === 'boolean' ? (dcPsuCount ? 1 : 0) : Number(dcPsuCount || 0);
  const lugCount = typeof dcLugKitCount === 'boolean' ? (dcLugKitCount ? 1 : 0) : Number(dcLugKitCount || 0);
  const lugsPerPsu = theta.lugsPerPsu;
  const lugsPerKit = theta.lugsPerKit;
  if (![psuCount, lugCount].every(value => Number.isInteger(value) && value >= 0) || typeof theta.requiresDcLugKit !== 'boolean' || !Number.isFinite(lugsPerPsu) || lugsPerPsu <= 0 || !Number.isFinite(lugsPerKit) || lugsPerKit <= 0) return { status: 'NOT_EVALUATED', isMissing: null };
  const requiredKits = Math.ceil(psuCount * lugsPerPsu / lugsPerKit);
  const isRequired = theta.requiresDcLugKit && psuCount > 0;
  const isMissing = isRequired && lugCount < requiredKits;

  return {
    isRequired,
    isMissing,
    dcPsuCount: psuCount,
    dcLugKitCount: lugCount,
    missingLugCount: isMissing ? requiredKits - lugCount : 0,
    formula: `requiredKits ceil(${psuCount} * ${lugsPerPsu} / ${lugsPerKit}) > dcLugKitCount (${lugCount}) => requiresDcLugKit = ${isMissing}`
  };
}

/**
 * Parameterized Invariant Equation: RAID Controller Cache Battery
 * Evaluates discrete counts: each RAID controller with write-back cache requires a storage battery
 * Formula: raidWithCacheCount > batteryCount => requiresBattery
 */
function evaluateBatteryEquation(raidWithCacheCount, batteryCount = 0, theta = DEFAULT_CHASSIS_PARAMETERS) {
  const raidCount = typeof raidWithCacheCount === 'boolean' ? (raidWithCacheCount ? 1 : 0) : Number(raidWithCacheCount || 0);
  const battCount = typeof batteryCount === 'boolean' ? (batteryCount ? 1 : 0) : Number(batteryCount || 0);
  const controllersPerBattery = theta.controllersPerBattery;
  if (![raidCount, battCount].every(value => Number.isInteger(value) && value >= 0) || typeof theta.requiresRaidBattery !== 'boolean' || !Number.isFinite(controllersPerBattery) || controllersPerBattery <= 0) return { status: 'NOT_EVALUATED', isMissing: null };
  const requiredBatteries = Math.ceil(raidCount / controllersPerBattery);
  const isRequired = theta.requiresRaidBattery && raidCount > 0;
  const isMissing = isRequired && battCount < requiredBatteries;

  return {
    isRequired,
    isMissing,
    raidWithCacheCount: raidCount,
    batteryCount: battCount,
    missingBatteryCount: isMissing ? requiredBatteries - battCount : 0,
    formula: `requiredBatteries ceil(${raidCount} / ${controllersPerBattery}) > batteryCount (${battCount}) => requiresBattery = ${isMissing}`
  };
}

module.exports = {
  DEFAULT_CHASSIS_PARAMETERS,
  getChassisEquationParameters,
  extractCatalogItemPrice,
  resolveComponentByRole,
  evaluateThermalCoolingEquation,
  evaluateDcPowerEquation,
  evaluateBatteryEquation
};
