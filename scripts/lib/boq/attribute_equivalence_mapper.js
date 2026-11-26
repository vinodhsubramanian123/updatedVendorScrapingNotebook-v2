'use strict';
/**
 * scripts/lib/boq/attribute_equivalence_mapper.js
 *
 * Attribute-based BOM-to-BOM equivalence mapping across HPE, Dell, Huawei, Cisco,
 * and Lenovo using canonical category attribute vectors.
 */

const { extractCanonicalAttributes } = require('../catalog/attribute_vectors.js');
const { normalizeLifecycleLabel } = require('../catalog/portfolio_blindspots.js');
const { getVendorAdapter } = require('../adapters/adapter_registry.js');

function getVendorAdapterInstance(vendor = 'HPE') {
  return getVendorAdapter(vendor);
}

function _parseCatalogPrice(skuRow) {
  const raw = skuRow['Unit Price (USD)'] ?? skuRow['Price (USD)'] ?? skuRow.listPrice;
  if (raw === null || raw === undefined || raw === '') return null;
  const num = parseFloat(String(raw).replace(/[$,]/g, ''));
  return Number.isFinite(num) && num >= 0 ? num : null;
}

function _indexTargetCatalog(catalogData) {
  const indexed = [];
  const allEntries = [...(catalogData?.entries || []), ...(catalogData?._servicesEntries || [])];
  for (const entry of allEntries) {
    for (const skuRow of (entry.skus || [])) {
      const sku = String(skuRow['Product #'] || skuRow.sku || '').trim();
      const desc = String(skuRow.Description || skuRow.description || '').trim();
      if (!sku) continue;
      const lifecycle = normalizeLifecycleLabel(skuRow['Lifecycle Status'] || skuRow.lifecycleStatus || 'Active');
      if (lifecycle === 'OBSOLETE') continue;
      const canonical = extractCanonicalAttributes({
        sku,
        description: desc,
        parentCategory: entry.parentCategory,
        vendor: 'HPE'
      }, entry);
      indexed.push({
        sku,
        description: desc,
        parentCategory: entry.parentCategory || '',
        lifecycle,
        unitPriceUsd: _parseCatalogPrice(skuRow),
        canonical
      });
    }
  }
  return indexed;
}

function _scoreProcessorMatch(srcA, tgtA, gaps) {
  let score = 10;
  if (srcA.cpuVendor && tgtA.cpuVendor && srcA.cpuVendor !== tgtA.cpuVendor) return { score: -1, gaps };
  if (srcA.cores && tgtA.cores) {
    if (tgtA.cores === srcA.cores) score += 40;
    else if (tgtA.cores > srcA.cores) { score += 25; gaps.push(`Core upgrade: ${srcA.cores}c -> ${tgtA.cores}c`); }
    else { score -= 30; gaps.push(`Core deficit: requested ${srcA.cores}c vs ${tgtA.cores}c`); }
  }
  if (srcA.model && tgtA.model && srcA.model === tgtA.model) score += 50;
  if (srcA.baseClockGhz && tgtA.baseClockGhz && tgtA.baseClockGhz < srcA.baseClockGhz) {
    gaps.push(`Base clock delta: ${srcA.baseClockGhz}GHz -> ${tgtA.baseClockGhz}GHz`);
  }
  return { score, gaps };
}

function _scoreMemoryMatch(srcA, tgtA, gaps) {
  let score = 10;
  if (srcA.ddrGen && tgtA.ddrGen && srcA.ddrGen !== tgtA.ddrGen) return { score: -1, gaps };
  if (srcA.capacityGb && tgtA.capacityGb) {
    if (tgtA.capacityGb === srcA.capacityGb) score += 50;
    else if (tgtA.capacityGb > srcA.capacityGb) { score += 20; gaps.push(`DIMM size upgrade: ${srcA.capacityGb}GB -> ${tgtA.capacityGb}GB`); }
    else return { score: -1, gaps };
  }
  if (srcA.speedMt && tgtA.speedMt && tgtA.speedMt >= srcA.speedMt) score += 15;
  if (srcA.moduleType && tgtA.moduleType && srcA.moduleType === tgtA.moduleType) score += 10;
  return { score, gaps };
}

function _scoreDriveMatch(srcA, tgtA, gaps) {
  let score = 10;
  if (srcA.formFactor && tgtA.formFactor && srcA.formFactor !== tgtA.formFactor) return { score: -1, gaps };
  if (srcA.interfaceProtocol && tgtA.interfaceProtocol && srcA.interfaceProtocol !== tgtA.interfaceProtocol) {
    score -= 20;
    gaps.push(`Drive protocol shift: ${srcA.interfaceProtocol} -> ${tgtA.interfaceProtocol}`);
  }
  if (srcA.capacityGb && tgtA.capacityGb) {
    if (tgtA.capacityGb === srcA.capacityGb) score += 45;
    else if (tgtA.capacityGb > srcA.capacityGb) { score += 25; gaps.push(`Drive capacity upgrade: ${srcA.capacityGb}GB -> ${tgtA.capacityGb}GB`); }
    else return { score: -1, gaps };
  }
  if (srcA.endurance === 'WI' && tgtA.endurance === 'RI') {
    score -= 50;
    gaps.push('Endurance downgrade blocked: Write-Intensive cannot silently map to Read-Intensive');
  } else if (srcA.endurance && tgtA.endurance && srcA.endurance === tgtA.endurance) {
    score += 20;
  }
  return { score, gaps };
}

function _scoreNetworkingMatch(srcA, tgtA, gaps) {
  let score = 10;
  if (srcA.fabricProtocol && tgtA.fabricProtocol && srcA.fabricProtocol !== tgtA.fabricProtocol) {
    if (srcA.fabricProtocol.startsWith('INFINIBAND') && !tgtA.fabricProtocol.startsWith('INFINIBAND')) {
      return { score: -1, gaps: ['Fabric mismatch: InfiniBand cannot map to Ethernet/RoCEv2'] };
    }
    gaps.push(`Fabric difference: ${srcA.fabricProtocol} -> ${tgtA.fabricProtocol}`);
  }
  if (srcA.speedGbps && tgtA.speedGbps) {
    if (tgtA.speedGbps === srcA.speedGbps) score += 40;
    else if (tgtA.speedGbps > srcA.speedGbps) { score += 20; gaps.push(`Speed upgrade: ${srcA.speedGbps}G -> ${tgtA.speedGbps}G`); }
    else return { score: -1, gaps };
  }
  if (srcA.portCount && tgtA.portCount && tgtA.portCount === srcA.portCount) score += 20;
  if (srcA.formFactor && tgtA.formFactor && srcA.formFactor === tgtA.formFactor) score += 15;
  return { score, gaps };
}

function _scorePowerOrServiceMatch(category, srcA, tgtA, gaps) {
  let score = 10;
  if (category === 'Power Supply') {
    if (srcA.inputType && tgtA.inputType && srcA.inputType !== tgtA.inputType) return { score: -1, gaps };
    if (srcA.wattage && tgtA.wattage) {
      if (tgtA.wattage === srcA.wattage) score += 40;
      else if (tgtA.wattage > srcA.wattage) { score += 25; gaps.push(`PSU wattage upgrade: ${srcA.wattage}W -> ${tgtA.wattage}W`); }
      else return { score: -1, gaps };
    }
    if (srcA.efficiency && tgtA.efficiency && srcA.efficiency === tgtA.efficiency) score += 20;
    return { score, gaps };
  }
  if (srcA.layer && tgtA.layer && srcA.layer !== tgtA.layer) return { score: -1, gaps };
  score += 30;
  if (srcA.termYears && tgtA.termYears) {
    if (srcA.termYears === tgtA.termYears) score += 30;
    else { score -= 10; gaps.push(`Term parity mismatch: ${srcA.termYears}yr -> ${tgtA.termYears}yr`); }
  }
  if (srcA.retention && tgtA.retention && srcA.retention !== 'NONE' && srcA.retention !== tgtA.retention) {
    gaps.push(`Retention difference: ${srcA.retention} -> ${tgtA.retention}`);
  }
  return { score, gaps };
}

function _scoreSpecialtyHardwareMatch(category, srcA, tgtA, gaps) {
  let score = 20;
  if (category === 'GPU / Accelerator') {
    if (srcA.model && tgtA.model && srcA.model === tgtA.model) score += 60;
    else if (srcA.vramGb && tgtA.vramGb && tgtA.vramGb >= srcA.vramGb) score += 35;
    else if (srcA.vramGb && tgtA.vramGb && tgtA.vramGb < srcA.vramGb) return { score: -1, gaps: [`VRAM deficit: ${srcA.vramGb}GB -> ${tgtA.vramGb}GB`] };
    return { score, gaps };
  }
  if (category === 'Storage Controller') {
    if (srcA.formFactor && tgtA.formFactor && srcA.formFactor === tgtA.formFactor) score += 25;
    if (srcA.cacheGb && tgtA.cacheGb && tgtA.cacheGb >= srcA.cacheGb) score += 25;
    if (srcA.portCount && tgtA.portCount && tgtA.portCount >= srcA.portCount) score += 25;
    return { score, gaps };
  }
  if (category === 'Chassis') {
    if (srcA.uHeight && tgtA.uHeight && srcA.uHeight !== tgtA.uHeight) return { score: -1, gaps: [] };
    if (srcA.bayFormFactor && tgtA.bayFormFactor && srcA.bayFormFactor === tgtA.bayFormFactor) score += 30;
    return { score, gaps };
  }
  return { score, gaps };
}

function _scoreCandidateEquivalence(src, tgt) {
  if (!src || !tgt || !tgt.canonical) return { score: -1, gaps: [] };
  const tgtCat = tgt.canonical.category;
  if (src.category && tgtCat && src.category !== tgtCat) return { score: -1, gaps: [] };
  const gaps = [];
  const srcA = src.attributes || {};
  const tgtA = tgt.canonical.attributes || {};
  switch (src.category) {
    case 'Processor': return _scoreProcessorMatch(srcA, tgtA, gaps);
    case 'Memory': return _scoreMemoryMatch(srcA, tgtA, gaps);
    case 'Drive': return _scoreDriveMatch(srcA, tgtA, gaps);
    case 'Networking / FC / Optics': return _scoreNetworkingMatch(srcA, tgtA, gaps);
    case 'Power Supply':
    case 'Software / Support / Services':
      return _scorePowerOrServiceMatch(src.category, srcA, tgtA, gaps);
    default:
      return _scoreSpecialtyHardwareMatch(src.category, srcA, tgtA, gaps);
  }
}

function _classifyMatchTier(bestScore, gaps) {
  if (bestScore < 0) return 'UNRESOLVED';
  const hasDeficit = gaps.some(g => /deficit|downgrade|mismatch/i.test(g));
  if (hasDeficit) return 'PARITY_GAP_DISCLOSED';
  const hasUpgrade = gaps.some(g => /upgrade/i.test(g));
  if (hasUpgrade) return 'CAPABILITY_UPGRADE';
  if (bestScore >= 60 && gaps.length === 0) return 'EXACT_EQUIVALENT';
  return 'FUNCTIONAL_EQUIVALENT';
}

function _mapSingleSourceItem(rawItem, sourceVendor, sourceAdapter, indexedTarget) {
  const qty = Number(rawItem.quantity ?? rawItem.qty ?? 1) || 1;
  const srcAttrs = extractCanonicalAttributes({ ...rawItem, vendor: rawItem.vendor || sourceVendor });
  const adapterClass = sourceAdapter ? sourceAdapter.classifyComponent(rawItem) : null;

  let bestTarget = null;
  let bestScore = -1;
  let bestGaps = [];
  for (const candidate of indexedTarget) {
    const scored = _scoreCandidateEquivalence(srcAttrs, candidate);
    if (scored.score > bestScore) {
      bestScore = scored.score;
      bestTarget = candidate;
      bestGaps = scored.gaps;
    }
  }

  const matchStatus = bestTarget ? _classifyMatchTier(bestScore, bestGaps) : 'UNRESOLVED';
  const mapping = {
    sourceSku: srcAttrs.rawSku || null,
    sourceDescription: srcAttrs.description,
    sourceVendor: srcAttrs.vendor,
    canonicalCategory: srcAttrs.category,
    sourceAttributes: srcAttrs.attributes,
    adapterDomain: adapterClass?.domain || null,
    targetSku: bestTarget ? bestTarget.sku : null,
    targetDescription: bestTarget ? bestTarget.description : null,
    targetAttributes: bestTarget ? bestTarget.canonical.attributes : null,
    quantity: qty,
    unitPriceUsd: bestTarget ? bestTarget.unitPriceUsd : null,
    matchStatus,
    score: bestScore,
    attributeDeltas: bestGaps
  };
  const bomLine = bestTarget ? {
    sku: bestTarget.sku,
    description: bestTarget.description,
    quantity: qty,
    unitPriceUsd: bestTarget.unitPriceUsd,
    category: bestTarget.parentCategory || srcAttrs.category,
    equivalenceStatus: matchStatus,
    mappedFromSku: srcAttrs.rawSku || null
  } : null;
  const gap = (matchStatus === 'UNRESOLVED' || bestGaps.length > 0) ? {
    sourceSku: srcAttrs.rawSku || srcAttrs.description,
    canonicalCategory: srcAttrs.category,
    status: matchStatus,
    details: bestGaps.length ? bestGaps : [`No active equivalent SKU found in target catalog for ${srcAttrs.category}.`]
  } : null;
  return { mapping, bomLine, gap };
}

function mapSourceBomToTargetCatalog(sourceItems = [], targetCatalogData = null, options = {}) {
  const sourceVendor = options.sourceVendor || 'Generic';
  const sourceAdapter = getVendorAdapterInstance(sourceVendor);
  const targetAdapter = getVendorAdapterInstance(options.targetVendor || 'HPE');
  const indexedTarget = _indexTargetCatalog(targetCatalogData);

  const mappings = [];
  const recommendedBom = [];
  const parityGaps = [];

  for (const rawItem of (sourceItems || [])) {
    const { mapping, bomLine, gap } = _mapSingleSourceItem(rawItem, sourceVendor, sourceAdapter, indexedTarget);
    mappings.push(mapping);
    if (bomLine) recommendedBom.push(bomLine);
    if (gap) parityGaps.push(gap);
  }

  let buildabilityClosure = null;
  if (options.runBuildabilityClosure !== false && recommendedBom.length > 0) {
    const { solveBuildableConfiguration } = require('../conflict/buildable_graph_solver.js');
    buildabilityClosure = solveBuildableConfiguration(recommendedBom, {
      catalogData: targetCatalogData,
      chassisInfo: options.chassisInfo || {},
      skipRepairs: Boolean(options.skipRepairs)
    });
  }

  return {
    sourceVendor,
    targetVendor: targetAdapter?.descriptor?.vendorId || options.targetVendor || 'HPE',
    totalSourceLines: mappings.length,
    matchedLinesCount: mappings.filter(m => m.targetSku !== null).length,
    unresolvedLinesCount: mappings.filter(m => m.targetSku === null).length,
    mappings,
    recommendedBom,
    parityGaps,
    buildabilityClosure
  };
}

module.exports = {
  getVendorAdapterInstance,
  mapSourceBomToTargetCatalog
};
