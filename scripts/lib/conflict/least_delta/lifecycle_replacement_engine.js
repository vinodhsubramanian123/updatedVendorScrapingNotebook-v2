'use strict';
/**
 * scripts/lib/conflict/least_delta/lifecycle_replacement_engine.js
 *
 * Extracted from least_delta_combinator.js:
 * Multi-category attribute parity scoring, availability/obsolete lifecycle replacement
 * engine, historical budget anchoring, and active SKU map builders.
 */

const { cleanBaseSKU, classifyLifecycleState } = require('../../catalog/sku.js');
const { extractCatalogItemLeadTime, extractCatalogItemPrice } = require('../../taxonomy/sku_resolver.js');
const { analyzeRetirementDate } = require('../../catalog/lifecycle.js');
const logger = require('../../system/pipeline_logger.js');

const REPLACEMENT_CATEGORY_RULES = [
  ['GPU', /\b(?:nvidia|gpu|h100|h200|l40s?|l4|a100|a40|b100|b200|rtx\s*\d+|accelerator)\b/i, /\b(?:enablement|cable|trigger)\b/i],
  ['FC_HBA', /\b(?:fibre\s*channel|fc\s+hba|sn1[67]\d{2}|qlogic|emulex|host\s*bus\s*adapter)\b/i, /\b(?:transceiver|cable)\b/i],
  ['CONTROLLER', /\b(?:storage\s*controller|raid|tri-mode|mr\d{3}i|sr\d{3}i|smart\s*array)\b/i, /\b(?:cable|battery|capacitor|enablement)\b/i],
  ['CPU', /\b(?:xeon|epyc|processor|cpu)\b/i, /\b(?:heatsink|cable|license)\b/i],
  ['MEMORY', /\b(?:dimm|rdimm|lrdimm|mrdimm|smart memory|memory|ddr[45])\b/i, /\b(?:blank|filler|license|operating\s*system)\b/i],
  ['PSU', /\b(?:power supply|flex slot|-48vdc|psu|power)\b/i, /\b(?:cable|cord|lug)\b/i],
  ['NETWORK', /\b(?:ethernet|nic|connectx|infiniband|transceiver|sfp|network|\d{2,3}gbe?)\b/i, /\b(?:cable\s*kit|fibre\s*channel|enablement|operating\s*configuration)\b/i],
  ['THERMAL', /\b(?:heatsink|fan|cooling|thermal)\b/i, /\b(?:ambient|tracking|cable)\b/i],
  ['STORAGE_DRIVE', /\b(?:ssd|hdd|nvme|hard drive|storage|drive)\b/i, /\b(?:cable|cage|backplane|boot\s*dev|ns204i)\b/i]
];

function _detectReplacementCategory(d, categoryHint = '') {
  if (/\b(?:windows\s*server|microsoft|red\s*hat|rhel|suse|vmware|esxi|energy\s*star|trigger|enablement\s*kit|operating\s*system)\b/i.test(d)) {
    return 'UNKNOWN';
  }
  const combined = `${d} ${String(categoryHint || '').toLowerCase()}`;
  for (const [cat, includeRx, excludeRx] of REPLACEMENT_CATEGORY_RULES) {
    if (includeRx.test(combined) && (!excludeRx || !excludeRx.test(d))) return cat;
  }
  return 'UNKNOWN';
}

function _extractComputeAndMemoryAttrs(d) {
  const memGbMatch = d.match(/\b(\d+)\s*gb\b/i);
  const mtsMatch = d.match(/(?:ddr[45][-\s]?|mt\/s\s*|@)(\d{4,5})/i);
  const rankMatch = d.match(/\b([124]rx[48])\b/i);
  const coreMatch = d.match(/\b(\d{1,3})[\s-]*(?:c|core|cores)\b/i);
  const ghzMatch = d.match(/\b(\d+(?:\.\d+)?)\s*ghz\b/i);
  const tdpMatch = d.match(/\b(\d{2,3})\s*w\b/i);
  const vramMatch = d.match(/\b(\d{2,3})\s*gb\b/i);
  const gpuModelMatch = d.match(/\b(h100|h200|l40s?|l4|a100|a40|b100|b200|rtx\s*\d+)\b/i);
  const speedGbpsMatch = d.match(/\b(8|10|16|25|32|40|50|64|100|128|200|400|800)\s*(?:gb|gbe|gb\/s|g)\b/i);
  const portMatch = d.match(/\b([1248])[-\s]?(?:p|port)\b/i);
  const psuWattsMatch = d.match(/\b(\d{3,4})\s*w\b/i);

  return {
    memGb: memGbMatch ? parseInt(memGbMatch[1], 10) : 0,
    ddrGen: d.includes('ddr5') ? 'ddr5' : (d.includes('ddr4') ? 'ddr4' : ''),
    mts: mtsMatch ? parseInt(mtsMatch[1], 10) : 0,
    dimmType: d.includes('mrdimm') ? 'mrdimm' : (d.includes('lrdimm') ? 'lrdimm' : (d.includes('rdimm') || d.includes('registered') ? 'rdimm' : '')),
    rankWidth: rankMatch ? rankMatch[1].toLowerCase() : '',
    cores: coreMatch ? parseInt(coreMatch[1], 10) : 0,
    freqGhz: ghzMatch ? parseFloat(ghzMatch[1]) : 0,
    tdpWatts: tdpMatch ? parseInt(tdpMatch[1], 10) : 0,
    isXeon6: d.includes('xeon 6') || /\b6[579]\d{2}[pe]\b/i.test(d),
    vramGb: vramMatch ? parseInt(vramMatch[1], 10) : 0,
    gpuSeries: gpuModelMatch ? gpuModelMatch[1].replace(/\s+/g, '').toLowerCase() : '',
    isNvlink: d.includes('nvlink') || d.includes('nvl') || d.includes('sxm'),
    speedGbps: speedGbpsMatch ? parseInt(speedGbpsMatch[1], 10) : 0,
    portCount: portMatch ? parseInt(portMatch[1], 10) : 0,
    isOcp: d.includes('ocp'),
    psuWatts: psuWattsMatch ? parseInt(psuWattsMatch[1], 10) : 0,
    isDcPsu: /-48\s*vdc/i.test(d),
    efficiency: d.includes('titanium') ? 'titanium' : (d.includes('platinum') ? 'platinum' : '')
  };
}

function _extractDriveCapacityAndWorkload(d, componentCategory) {
  let capacityTb = 0;
  const tbMatch = d.match(/(\d+(?:\.\d+)?)\s*tb/i);
  if (tbMatch) capacityTb = parseFloat(tbMatch[1]);
  else if (componentCategory === 'STORAGE_DRIVE' || componentCategory === 'UNKNOWN') {
    const gbMatch = d.match(/(\d+)\s*gb/i);
    if (gbMatch) capacityTb = parseFloat(gbMatch[1]) / 1000;
  }

  let workload = 'UNKNOWN';
  if (/\bread intensive\b|\bri\b|-ri/i.test(d)) workload = 'RI';
  else if (/\bmixed use\b|\bmu\b|-mu/i.test(d)) workload = 'MU';
  else if (/\bwrite intensive\b|\bwi\b|-wi/i.test(d)) workload = 'WI';
  return { capacityTb, workload };
}

function extractDriveOrComponentAttrs(desc = '', sku = '', categoryHint = '') {
  const d = String(desc || '').toLowerCase();
  const componentCategory = _detectReplacementCategory(d, categoryHint);
  const { capacityTb, workload } = _extractDriveCapacityAndWorkload(d, componentCategory);

  return {
    componentCategory,
    capacityTb,
    isNvme: d.includes('nvme'),
    isSas: d.includes('sas'),
    isSata: d.includes('sata'),
    isGen4: /gen4|pcie\s*4/i.test(d),
    isGen5: /gen5|pcie\s*5/i.test(d),
    workload,
    isHighPerf: /high performance|pm1733|ps1010|cm[79]/i.test(d),
    isMainstream: /mainstream|spdm 7500|cd9/i.test(d),
    isSff: d.includes('sff'),
    isLff: d.includes('lff'),
    isBc: /\bbc\b|basic carrier/i.test(d),
    isU3: d.includes('u.3'),
    isU2: d.includes('u.2'),
    ..._extractComputeAndMemoryAttrs(d)
  };
}

function _scoreInterfaceAndGenParity(origAttrs, cAttrs) {
  let score = 0;
  if (origAttrs.isNvme && cAttrs.isNvme) score += 50;
  if (origAttrs.isSas && cAttrs.isSas) score += 50;
  if (origAttrs.isSata && cAttrs.isSata) score += 50;
  if (origAttrs.isGen4 && cAttrs.isGen4) score += 20;
  if (origAttrs.isGen5 && cAttrs.isGen5) score += 20;
  return score;
}

function _scorePhysicalAndWorkloadParity(origAttrs, cAttrs) {
  let score = 0;
  if (origAttrs.workload !== 'UNKNOWN' && origAttrs.workload === cAttrs.workload) score += 50;
  if (origAttrs.isSff && cAttrs.isSff) score += 25;
  if (origAttrs.isBc && cAttrs.isBc) score += 20;
  if (origAttrs.isU3 && cAttrs.isU3) score += 20;
  if (origAttrs.isHighPerf && cAttrs.isHighPerf) score += 50;
  if (origAttrs.isMainstream && cAttrs.isMainstream) score += 30;
  return score;
}

function _scoreBudgetProximity(histPrice, candidatePrice) {
  if (histPrice <= 0 || candidatePrice <= 0) return 0;
  const deltaRatio = Math.abs(candidatePrice - histPrice) / histPrice;
  if (deltaRatio <= 0.05) return 100;
  if (deltaRatio <= 0.15) return 60;
  if (deltaRatio <= 0.30) return 30;
  return 0;
}

function _scoreCpuAndMemoryParity(origAttrs, cAttrs) {
  let score = 0;
  if (origAttrs.componentCategory === 'CPU') {
    if (origAttrs.cores > 0 && cAttrs.cores > 0) {
      if (cAttrs.cores < origAttrs.cores) return -1;
      score += origAttrs.cores === cAttrs.cores ? 120 : Math.max(40, 100 - Math.abs(cAttrs.cores - origAttrs.cores) * 3);
    }
    if (origAttrs.freqGhz > 0 && cAttrs.freqGhz > 0) {
      score += cAttrs.freqGhz >= origAttrs.freqGhz ? 40 : Math.max(0, 25 - (origAttrs.freqGhz - cAttrs.freqGhz) * 30);
    }
    if (origAttrs.isXeon6 === cAttrs.isXeon6) score += 40;
    if (origAttrs.tdpWatts > 0 && cAttrs.tdpWatts > 0 && cAttrs.tdpWatts <= origAttrs.tdpWatts + 25) score += 20;
    return score;
  }
  if (origAttrs.componentCategory === 'MEMORY') {
    if (origAttrs.ddrGen && cAttrs.ddrGen && origAttrs.ddrGen !== cAttrs.ddrGen) return -1;
    if (origAttrs.memGb > 0 && cAttrs.memGb > 0) {
      if (origAttrs.memGb !== cAttrs.memGb) return -1;
      score += 120;
    }
    if (origAttrs.dimmType && cAttrs.dimmType && origAttrs.dimmType === cAttrs.dimmType) score += 50;
    if (origAttrs.mts > 0 && cAttrs.mts > 0) {
      score += cAttrs.mts >= origAttrs.mts ? (cAttrs.mts === origAttrs.mts ? 50 : 35) : 0;
    }
    if (origAttrs.rankWidth && cAttrs.rankWidth && origAttrs.rankWidth === cAttrs.rankWidth) score += 25;
  }
  return score;
}

function _scoreGpuNetworkPsuParity(origAttrs, cAttrs) {
  let score = 0;
  if (origAttrs.componentCategory === 'GPU') {
    if (origAttrs.gpuSeries && cAttrs.gpuSeries && origAttrs.gpuSeries === cAttrs.gpuSeries) score += 120;
    if (origAttrs.vramGb > 0 && cAttrs.vramGb > 0) {
      if (cAttrs.vramGb < origAttrs.vramGb) return -1;
      score += origAttrs.vramGb === cAttrs.vramGb ? 80 : 40;
    }
    if (origAttrs.isNvlink === cAttrs.isNvlink) score += 30;
    return score;
  }
  if (origAttrs.componentCategory === 'NETWORK') {
    if (origAttrs.speedGbps > 0 && cAttrs.speedGbps > 0) {
      if (cAttrs.speedGbps < origAttrs.speedGbps) return -1;
      score += origAttrs.speedGbps === cAttrs.speedGbps ? 90 : 45;
    }
    if (origAttrs.portCount > 0 && cAttrs.portCount > 0 && cAttrs.portCount >= origAttrs.portCount) {
      score += origAttrs.portCount === cAttrs.portCount ? 45 : 20;
    }
    if (origAttrs.isOcp === cAttrs.isOcp) score += 35;
    return score;
  }
  if (origAttrs.componentCategory === 'PSU') {
    if (Boolean(origAttrs.isDcPsu) !== Boolean(cAttrs.isDcPsu)) return -1;
    if (origAttrs.psuWatts > 0 && cAttrs.psuWatts > 0) {
      if (cAttrs.psuWatts < origAttrs.psuWatts) return -1;
      score += origAttrs.psuWatts === cAttrs.psuWatts ? 100 : 50;
    }
    if (origAttrs.efficiency && cAttrs.efficiency && origAttrs.efficiency === cAttrs.efficiency) score += 40;
  }
  return score;
}

function _scoreFcHbaParity(origDesc, candDesc, origAttrs, cAttrs) {
  const oLow = String(origDesc || '').toLowerCase();
  const cLow = String(candDesc || '').toLowerCase();
  const oVendor = (oLow.includes('qlogic') || /sn1[67]\d{2}q/i.test(oLow)) ? 'QLOGIC'
    : ((oLow.includes('emulex') || oLow.includes('broadcom') || /sn1[67]\d{2}e/i.test(oLow)) ? 'EMULEX' : '');
  const cVendor = (cLow.includes('qlogic') || /sn1[67]\d{2}q/i.test(cLow)) ? 'QLOGIC'
    : ((cLow.includes('emulex') || cLow.includes('broadcom') || /sn1[67]\d{2}e/i.test(cLow)) ? 'EMULEX' : '');
  if (oVendor && cVendor && oVendor !== cVendor) return -1;
  if (origAttrs.speedGbps > 0 && cAttrs.speedGbps > 0 && cAttrs.speedGbps < origAttrs.speedGbps) return -1;
  if (origAttrs.portCount > 0 && cAttrs.portCount > 0 && cAttrs.portCount < origAttrs.portCount) return -1;
  let score = 80;
  if (oVendor && oVendor === cVendor) score += 60;
  if (origAttrs.speedGbps > 0 && origAttrs.speedGbps === cAttrs.speedGbps) score += 40;
  return score;
}

function _parseStorageControllerSpecs(desc) {
  const low = String(desc || '').toLowerCase();
  const series = low.match(/\b((?:mr|sr)\d{3}i)/i)?.[1]?.toLowerCase() || '';
  const cacheGb = parseInt(low.match(/\b(\d+)\s*gb(?:\s*cache)?/i)?.[1] || '0', 10);
  let ports = 0;
  if (series.includes('416') || series.includes('932')) ports = 16;
  else if (series.includes('408') || series.includes('216')) ports = 8;
  const lanes = low.match(/\bx(8|16)\s*lanes?/i)?.[1] || '';
  return { series, cacheGb, ports, lanes };
}

function _scoreStorageControllerParity(origDesc, candDesc) {
  const orig = _parseStorageControllerSpecs(origDesc);
  const cand = _parseStorageControllerSpecs(candDesc);
  if (orig.ports > 0 && cand.ports > 0 && cand.ports < orig.ports) return -1;
  if (orig.cacheGb > 0 && cand.cacheGb > 0 && cand.cacheGb < orig.cacheGb) return -1;
  let score = 60;
  if (orig.series && cand.series && orig.series === cand.series) score += 160;
  if (orig.cacheGb > 0 && orig.cacheGb === cand.cacheGb) score += 40;
  if (orig.lanes && cand.lanes && orig.lanes === cand.lanes) score += 20;
  return score;
}

function scoreActiveReplacementCandidate(candidate, origAttrs, histPrice = 0, origDesc = '') {
  const cAttrs = extractDriveOrComponentAttrs(candidate.description, candidate.sku);
  if (origAttrs.componentCategory !== 'UNKNOWN' && cAttrs.componentCategory !== origAttrs.componentCategory) return -1;

  let score = 0;
  if (origAttrs.componentCategory === 'STORAGE_DRIVE' || origAttrs.componentCategory === 'UNKNOWN') {
    if (origAttrs.capacityTb > 0 && cAttrs.capacityTb > 0 && Math.abs(origAttrs.capacityTb - cAttrs.capacityTb) >= 0.01) return -1;
    score += (origAttrs.capacityTb > 0 && cAttrs.capacityTb > 0) ? 120 : 0;
    score += _scoreInterfaceAndGenParity(origAttrs, cAttrs);
    score += _scorePhysicalAndWorkloadParity(origAttrs, cAttrs);
  } else if (origAttrs.componentCategory === 'FC_HBA') {
    const hbaScore = _scoreFcHbaParity(origDesc, candidate.description, origAttrs, cAttrs);
    if (hbaScore < 0) return -1;
    score += hbaScore;
  } else if (origAttrs.componentCategory === 'CONTROLLER') {
    const ctrlScore = _scoreStorageControllerParity(origDesc, candidate.description);
    if (ctrlScore < 0) return -1;
    score += ctrlScore;
  } else {
    const specialtyScore = origAttrs.componentCategory === 'CPU' || origAttrs.componentCategory === 'MEMORY'
      ? _scoreCpuAndMemoryParity(origAttrs, cAttrs)
      : _scoreGpuNetworkPsuParity(origAttrs, cAttrs);
    if (specialtyScore < 0) return -1;
    score += specialtyScore;
  }

  if ((candidate.description || '').toLowerCase().includes('multi vendor')) score += 30;
  score += _scoreBudgetProximity(histPrice, candidate.price);
  if (typeof candidate.leadTimeDays === 'number' && Number.isFinite(candidate.leadTimeDays)) {
    if (candidate.leadTimeDays <= 14) score += 15;
    else if (candidate.leadTimeDays >= 45) score -= 15;
  }
  return score;
}

const AVAILABILITY_SPEC_FIELDS = {
  CPU: { minimum: ['cores', 'freqGhz'], same: ['isXeon6'] },
  MEMORY: { minimum: ['mts'], same: ['memGb', 'ddrGen', 'dimmType', 'rankWidth'] },
  GPU: { minimum: ['vramGb'], same: ['gpuSeries', 'isNvlink'] },
  NETWORK: { minimum: ['speedGbps', 'portCount'], same: ['isOcp'] },
  FC_HBA: { minimum: ['speedGbps', 'portCount'], same: ['isOcp'] },
  PSU: { minimum: ['psuWatts'], same: ['isDcPsu', 'efficiency'] }
};

function _availabilitySpecFit(original, candidate, { minimum, same }) {
  if (same.some(key => original[key] !== candidate[key] || original[key] === '' || original[key] === 0)) return null;
  if (minimum.some(key => !original[key] || !candidate[key] || candidate[key] < original[key])) return null;
  return minimum.some(key => candidate[key] > original[key]) ? 'UPGRADE' : 'EQUIVALENT';
}

function _driveAvailabilityFit(original, candidate, originalDesc, candidateDesc) {
  const media = desc => desc.match(/\b(?:ssd|hdd|solid state drive|hard disk drive|hard drive)\b/i)?.[0].toLowerCase()
    .replace(/solid state drive/, 'ssd').replace(/hard (?:disk )?drive/, 'hdd');
  const originalMedia = media(originalDesc);
  if (!originalMedia || originalMedia !== media(candidateDesc)) return null;
  if (!original.capacityTb || !(original.isNvme || original.isSas || original.isSata)) return null;
  const fields = ['capacityTb', 'isNvme', 'isSas', 'isSata', 'isGen4', 'isGen5', 'isSff', 'isLff', 'isBc', 'isU2', 'isU3'];
  if (fields.some(key => original[key] !== candidate[key])) return null;
  const rate = desc => Number(desc.match(/\b(6|12|24)\s*(?:gb\/s|gbps|g)\b/i)?.[1] || 0);
  if (rate(candidateDesc) < rate(originalDesc)) return null;
  const endurance = { UNKNOWN: 0, RI: 1, MU: 2, WI: 3 };
  if (originalMedia === 'ssd' && !endurance[original.workload]) return null;
  if (endurance[candidate.workload] < endurance[original.workload]) return null;
  const rpm = desc => desc.match(/\b\d+(?:\.\d+)?\s*k(?:\s*rpm)?\b/i)?.[0].replace(/\s|rpm/gi, '').toLowerCase();
  if (originalMedia === 'hdd' && (!rpm(originalDesc) || rpm(originalDesc) !== rpm(candidateDesc))) return null;
  return endurance[candidate.workload] > endurance[original.workload] || rate(candidateDesc) > rate(originalDesc) ? 'UPGRADE' : 'EQUIVALENT';
}

function _availabilityFamilyFit(category, originalDesc, candidateDesc) {
  const familyPattern = {
    CPU: /\b(?:xeon|epyc)\b/i,
    NETWORK: /\b(?:infiniband|ethernet|roce)\b/i,
    FC_HBA: /\b(?:qlogic|emulex|sn1[67]\d{2}[eq])\b/i
  }[category];
  if (!familyPattern) return true;
  const family = desc => desc.match(familyPattern)?.[0].toLowerCase().replace(/sn1[67]\d{2}q/, 'qlogic').replace(/sn1[67]\d{2}e/, 'emulex');
  return Boolean(family(originalDesc)) && family(originalDesc) === family(candidateDesc);
}

function compareAvailabilityReplacement(originalDesc, originalAttrs, candidateDesc, candidateSku) {
  const candidateAttrs = extractDriveOrComponentAttrs(candidateDesc, candidateSku);
  const category = originalAttrs.componentCategory;
  if (category !== candidateAttrs.componentCategory) return null;
  const specs = AVAILABILITY_SPEC_FIELDS[category];
  if (specs) {
    if (!_availabilityFamilyFit(category, originalDesc, candidateDesc)) return null;
    return _availabilitySpecFit(originalAttrs, candidateAttrs, specs);
  }
  if (category === 'STORAGE_DRIVE') return _driveAvailabilityFit(originalAttrs, candidateAttrs, originalDesc, candidateDesc);
  if (category === 'CONTROLLER') {
    return _availabilitySpecFit(_parseStorageControllerSpecs(originalDesc), _parseStorageControllerSpecs(candidateDesc), { minimum: ['ports', 'cacheGb'], same: ['series', 'lanes'] });
  }
  return category === 'THERMAL' && originalDesc.trim().toLowerCase() === candidateDesc.trim().toLowerCase() ? 'EQUIVALENT' : null;
}

function isActiveLifecycleCandidate(item, options = {}) {
  const row = item?.skuData;
  if (!row || item.lifecycleState?.isNonActive) return false;
  if (row.selectability === false || row.selectable === false || row.isSelectable === false || row.isVisible === false) return false;
  if (row.selectorTriggerSku || row.portalConditional) return false;
  if (/hidden|conditional|unselectable/i.test(row.visibility || row.visibilityState || '')) return false;
  const status = item.lifecycleStatus || row['Lifecycle Status'] || row.lifecycleStatus || row.Status || '';
  if (/\binactive\b|^unknown$/i.test(status)) return false;
  const supply = row.Availability || row.availability || row.orderabilityEvidence?.availability || row.vendorSupplyStatus || '';
  if (/unavailable|out[\s_-]+of[\s_-]+stock|not[\s_-]+(?:yet[\s_-]+)?(?:available|orderable|selectable)|allocation[\s_-]+hold|constrained|discontinued|obsolete/i.test(supply)) return false;
  return ![row['Discontinued Date'], row['Obsolete Date'], row.discontinuedDate, row.obsoleteDate].some(date => {
    const retirement = analyzeRetirementDate(date, options);
    return retirement.isPast || retirement.isNear;
  });
}

function findActiveLifecycleReplacement(part, skuIndex, options = {}) {
  const original = skuIndex.get(part.sku);
  const originalAttrs = extractDriveOrComponentAttrs(part.description, part.sku, part.category);
  const vendorAlternative = cleanBaseSKU(original?.skuData['Alternative SKU']);
  const candidates = [];
  for (const [sku, item] of skuIndex) {
    if (sku === part.sku || !isActiveLifecycleCandidate(item, options)) continue;
    if (original?.parentCategory && original.parentCategory !== item.parentCategory) continue;
    const row = item.skuData;
    const originalScope = original?.skuData?.scopeProvenance;
    const candidateScope = row.scopeProvenance;
    if (['ownerProduct', 'baseSku'].some(key => originalScope?.[key] && candidateScope?.[key] && originalScope[key] !== candidateScope[key])) continue;
    const description = row.Description || row.description || '';
    const matchType = compareAvailabilityReplacement(part.description, originalAttrs, description, sku);
    if (!matchType && (sku !== vendorAlternative || original?.subCategory !== item.subCategory)) continue;
    const { price } = extractCatalogItemPrice(row);
    const leadTimeDays = extractCatalogItemLeadTime(row)?.days ?? null;
    const score = scoreActiveReplacementCandidate({ sku, description, price }, originalAttrs, 0, part.description);
    if (score < 0 && matchType) continue;
    candidates.push({ sku, description, price, leadTimeDays, matchType: matchType || 'VENDOR_LISTED', score });
  }
  const matchOrder = { EQUIVALENT: 0, UPGRADE: 1, VENDOR_LISTED: 2 };
  candidates.sort((a, b) => matchOrder[a.matchType] - matchOrder[b.matchType] || b.score - a.score || a.sku.localeCompare(b.sku));
  return candidates[0] || null;
}

function _resolveHistoricalSkuPrice(cleanSku, chassisInfo) {
  const chassisDir = chassisInfo?.chassisDir || chassisInfo?.catalogDir || '';
  if (!chassisDir) return 0;
  try {
    const { getHistoricalSkuPrice } = require('../../catalog/sku_versioning.js');
    const hist = getHistoricalSkuPrice(cleanSku, chassisDir);
    return Number(hist?.priceUsd) || 0;
  } catch (err) {
    logger.warn('LEAST_DELTA', `Historical price lookup skipped for ${cleanSku}: ${err.message}`);
    return 0;
  }
}

function _findDirectSuccessorSku(successorSku, activeSkuMap, catalogData, histPrice, audit) {
  if (!successorSku) return null;
  if (activeSkuMap && activeSkuMap.has(successorSku)) {
    const sObj = activeSkuMap.get(successorSku);
    return { sku: sObj.sku, description: sObj.description, price: sObj.price, historicalPriceUsd: histPrice, isDirectSuccessor: true };
  }
  if (catalogData && Array.isArray(catalogData.entries)) {
    for (const e of catalogData.entries) {
      const found = (e.skus || []).find(s => cleanBaseSKU(s['Product #'] || s.sku || s['SKU']) === successorSku);
      if (found) {
        const lc = classifyLifecycleState(
          found['Lifecycle Status'] || found.lifecycleStatus || found.Status || '',
          found['Diff Status'] || found.diffStatus || '',
          found['Product #'] || found.sku || found.SKU,
          found.Description || found.description,
          found.vendorSupplyStatus
        );
        if (!isActiveLifecycleCandidate({ skuData: found, lifecycleState: lc })) return null;
        const price = parseFloat(String(found['Unit Price (USD)'] || found['Price (USD)'] || found.priceUsd || '0').replace(/[^0-9.]/g, '')) || 0;
        return {
          sku: successorSku,
          description: found.Description || found.description || audit?.discontinuedInfo?.successorDescription || 'Active Successor SKU',
          price,
          historicalPriceUsd: histPrice,
          isDirectSuccessor: true
        };
      }
    }
  }
  return null;
}

function _collectActiveReplacementCandidates(catalogData, cleanSku, origAttrs, histPrice) {
  const candidates = [];
  if (!catalogData || !Array.isArray(catalogData.entries)) return candidates;

  catalogData.entries.forEach(e => {
    (e.skus || []).forEach(s => {
      const sSku = cleanBaseSKU(s['Product #'] || s.sku || s['SKU']);
      if (!sSku || sSku === cleanSku) return;
      const lc = classifyLifecycleState(
        s['Lifecycle Status'] || s.lifecycleStatus || s.Status || '',
        s['Diff Status'] || s.diffStatus || '',
        s['Product #'] || s.sku || s.SKU,
        s.Description || s.description,
        s.vendorSupplyStatus
      );
      if (!isActiveLifecycleCandidate({ skuData: s, lifecycleState: lc })) return;
      const sDesc = s.Description || s.description || '';
      const sPrice = parseFloat(String(s['Unit Price (USD)'] || s['Price (USD)'] || s.priceUsd || '0').replace(/[^0-9.]/g, '')) || 0;
      const leadMeta = extractCatalogItemLeadTime(s);
      const score = scoreActiveReplacementCandidate(
        { sku: sSku, description: sDesc, price: sPrice, leadTimeDays: leadMeta?.days ?? null },
        origAttrs,
        histPrice
      );
      if (score > 0) candidates.push({ sku: sSku, description: sDesc, price: sPrice, leadTimeDays: leadMeta?.days ?? null, score });
    });
  });
  return candidates;
}

function _findValueEngineeringAlternative(candidates, origAttrs, histPrice) {
  if (!origAttrs.isHighPerf || histPrice <= 0) return null;
  const ve = candidates.find(c => {
    const cDesc = c.description.toLowerCase();
    return (cDesc.includes('mainstream') || c.price < histPrice * 0.80) && c.price > 0;
  });
  return ve ? { sku: ve.sku, description: ve.description, price: ve.price } : null;
}

function findBestAlternativeForDiscontinuedSku(cleanSku, origDesc, catalogData, chassisInfo, audit = null, activeSkuMap = null) {
  const histPrice = _resolveHistoricalSkuPrice(cleanSku, chassisInfo);
  const successorSku = cleanBaseSKU(audit?.discontinuedInfo?.successorSku || '');
  const directSuccessor = _findDirectSuccessorSku(successorSku, activeSkuMap, catalogData, histPrice, audit);
  if (directSuccessor) return directSuccessor;

  const effectiveDesc = origDesc || audit?.discontinuedInfo?.description || audit?.latestDetails?.description || '';
  const origAttrs = extractDriveOrComponentAttrs(effectiveDesc, cleanSku);
  const candidates = _collectActiveReplacementCandidates(catalogData, cleanSku, origAttrs, histPrice);
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  const valueEngineeringCandidate = _findValueEngineeringAlternative(candidates, origAttrs, histPrice);
  return { sku: best.sku, description: best.description, price: best.price, historicalPriceUsd: histPrice, isDirectSuccessor: false, valueEngineeringCandidate };
}

function buildActiveSkuMap(catalogData) {
  const activeSkuMap = new Map();
  if (!catalogData || !Array.isArray(catalogData.entries)) return activeSkuMap;

  catalogData.entries.forEach(e => {
    (e.skus || []).forEach(s => {
      const rawSku = s['Product #'] || s.sku || s['SKU'];
      const k = cleanBaseSKU(rawSku);
      const lc = classifyLifecycleState(
        s['Lifecycle Status'] || s.lifecycleStatus || s.Status || '',
        s['Diff Status'] || s.diffStatus || '',
        rawSku,
        s.Description || s.description,
        s.vendorSupplyStatus
      );
      if (k && isActiveLifecycleCandidate({ skuData: s, lifecycleState: lc })) {
        activeSkuMap.set(k, {
          sku: k,
          rawSku,
          description: s.Description || s.description || '',
          price: parseFloat(String(s['Unit Price (USD)'] || s['Price (USD)'] || s.priceUsd || '0').replace(/[^0-9.]/g, '')) || 0
        });
      }
    });
  });
  return activeSkuMap;
}

function resolveDiscontinuedStatus(cleanSku, chassisDir, skuIndex) {
  const { getSkuAuditHistory } = require('../../catalog/sku_versioning.js');
  let audit = null;
  if (chassisDir) {
    try {
      audit = getSkuAuditHistory(cleanSku, chassisDir);
    } catch (err) {
      logger.warn('LEAST_DELTA', `Audit history lookup skipped for ${cleanSku}: ${err.message}`);
    }
  }
  const isMarkedDiscontinued = audit?.currentStatus === 'DISCONTINUED' ||
    (audit?.discontinuedInfo && String(audit.discontinuedInfo.status || '').toUpperCase() === 'DISCONTINUED');
  const isNotInCatalog = skuIndex.size > 0 && !skuIndex.has(cleanSku);
  return { audit, isDiscontinuedOrMissing: isMarkedDiscontinued || isNotInCatalog };
}

function buildDiscontinuedReplacementResult(cleanSku, it, audit, replacement) {
  const histPrice = replacement.historicalPriceUsd || 0;
  const repPrice = replacement.price || 0;
  const priceDelta = repPrice - histPrice;
  let priceDeltaStr = 'exact budget parity ($0 delta)';
  if (priceDelta > 0) priceDeltaStr = `+$${priceDelta.toLocaleString()} delta`;
  else if (priceDelta < 0) priceDeltaStr = `-$${Math.abs(priceDelta).toLocaleString()} savings`;

  return {
    type: 'DISCONTINUED_SKU_SUPERSEDED',
    originalSku: cleanSku,
    originalDesc: it.description || audit?.discontinuedInfo?.description || 'Discontinued Component',
    troublesomeReason: `HPE delisted/discontinued ${cleanSku} in live ordering portals. Historical list price was $${histPrice.toLocaleString()} USD.`,
    alternativeSku: replacement.sku,
    alternativeDesc: replacement.description,
    action: 'SUBSTITUTE_DISCONTINUED_SKU',
    functionalEquivalence: `Active replacement ${replacement.sku} (${replacement.description}) provides 100% functional equivalence at $${repPrice.toLocaleString()} USD (${priceDeltaStr}), preserving customer performance tier and budget baseline.`,
    cascadingSkusEliminated: [],
    historicalBudgetAnchor: {
      originalListPriceUsd: histPrice,
      replacementPriceUsd: repPrice,
      deltaUsd: priceDelta,
      priceParityPercent: histPrice > 0 ? parseFloat(((repPrice / histPrice) * 100).toFixed(2)) : 100,
      budgetHintNote: `Customer budgeted $${histPrice.toLocaleString()} USD for ${cleanSku}. Replacement ${replacement.sku} at $${repPrice.toLocaleString()} USD closely matches the budgeted CapEx.`
    },
    valueEngineeringAlternative: replacement.valueEngineeringCandidate ? {
      sku: replacement.valueEngineeringCandidate.sku,
      description: replacement.valueEngineeringCandidate.description,
      priceUsd: replacement.valueEngineeringCandidate.price,
      savingsUsd: histPrice > 0 ? histPrice - replacement.valueEngineeringCandidate.price : 0,
      savingsPercent: histPrice > 0 ? parseFloat((((histPrice - replacement.valueEngineeringCandidate.price) / histPrice) * 100).toFixed(1)) : 0,
      rationale: `If the workload does not require peak High Performance IOPS, migrating to Mainstream tier (${replacement.valueEngineeringCandidate.sku}) yields significant CapEx savings.`
    } : null,
    presalesValuePitch: `Substituting deprecated ${cleanSku} with live active ${replacement.sku} guarantees 100% portal buildability while preserving the customer's budgeted performance tier at virtually identical CapEx ($${repPrice.toLocaleString()} vs $${histPrice.toLocaleString()}).`
  };
}

function buildLifecycleReplacementAction(lifecycle) {
  const { sku, originalDesc, replacement, commercialRemarks } = lifecycle;
  return {
    type: 'LIFECYCLE_SKU_SUBSTITUTION',
    action: 'SUBSTITUTE_ACTIVE_SKU',
    originalSku: sku,
    originalDesc,
    alternativeSku: replacement.sku,
    alternativeDesc: replacement.description,
    troublesomeReason: commercialRemarks.original,
    functionalEquivalence: `Catalog match for ${sku}: ${replacement.sku} (${replacement.description}).`,
    presalesValuePitch: commercialRemarks.production,
    commercialRemarks,
    cascadingSkusEliminated: []
  };
}

module.exports = {
  extractDriveOrComponentAttrs,
  scoreActiveReplacementCandidate,
  compareAvailabilityReplacement,
  isActiveLifecycleCandidate,
  findActiveLifecycleReplacement,
  findBestAlternativeForDiscontinuedSku,
  buildActiveSkuMap,
  resolveDiscontinuedStatus,
  buildDiscontinuedReplacementResult,
  buildLifecycleReplacementAction
};
