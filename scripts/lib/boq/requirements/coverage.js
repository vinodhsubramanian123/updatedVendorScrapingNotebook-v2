'use strict';

/**
 * scripts/lib/boq/requirements/coverage.js
 *
 * Candidate Requirement Coverage & Disposition Engine:
 * - Evaluates candidates against RequirementRecord[] -> SATISFIED | VIOLATED | UNRESOLVED | NOT_APPLICABLE | WAIVED
 * - Reuses buildUniversalQuantityConservationLedger (quantity_conservation.js)
 * - Keeps incomplete pricing (pricingComplete === false || totalCostUsd == null) UNRESOLVED
 * - Blocks positive recommendation on uninterpreted/ambiguous hard clauses
 * - Enforces customerAuthority & physicalImpossibility === true waiver guards
 */

const { cleanBaseSKU, isServiceSku } = require('../../catalog/sku.js');
const { classifyComponentRole } = require('../../catalog/product_meta.js');
const { buildUniversalQuantityConservationLedger } = require('../quantity_conservation.js');
const {
  HARDNESS_LEVELS,
  COMPARATORS,
  SCOPE_TYPES,
  computeUsableStorageTb,
  normalizeRaidLevel
} = require('./typed_values.js');

const DISPOSITIONS = Object.freeze({
  SATISFIED: 'SATISFIED',
  VIOLATED: 'VIOLATED',
  UNRESOLVED: 'UNRESOLVED',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  WAIVED: 'WAIVED'
});

const CHASSIS_HINT_RE = /\b(?:configure-to-order|cto\s+server|base\s+(?:chassis|server)|proliant\s+dl\d|synergy\s+\d+)\b/i;
const MEMORY_HINT_RE = /\b(?:ddr[345]|rdimm|lrdimm|mrdimm|smart\s+memory|memory|ram)\b/i;
const MEMORY_EXCLUDE_RE = /\b(?:blank|filler|heatsink|ssd|nvme|hdd|cache|gpu|controller|riser)\b/i;
const CPU_HINT_RE = /\b(?:xeon|epyc|processor|cpu)\b/i;
const CPU_EXCLUDE_RE = /\b(?:heatsink|heat\s+sink|fan|cable|enablement|license|kit\s+cable)\b/i;
const DRIVE_HINT_RE = /\b(?:ssd|hdd|nvme|sata|sas)\b/i;
const DRIVE_EXCLUDE_RE = /\b(?:drive\s+cage|cage\s+kit|backplane|controller|cable|blank|filler)\b/i;
const NETWORK_HINT_RE = /\b(?:nic|network\s+adapter|ocp|transceiver|sfp\w*|qsfp\w*|osfp\w*|ethernet|gbe|gbps)\b/i;
const OPTIC_HINT_RE = /\b(?:transceiver|optic|optics|sfp\w*|qsfp\w*|osfp\w*)\b/i;
const PSU_HINT_RE = /\b(?:power\s+supply|psu|flex\s+slot)\b/i;
const PSU_EXCLUDE_RE = /\b(?:cord|cable|lug|connector)\b/i;
const INSTALL_EXCLUDE_RE = /\b(?:install(?:ation)?\s*(?:service|svc)?|startup\s+service|deployment\s+service)\b/i;
const INSTALL_SKU_RE = /^(?:HA113A1|HA114A1|HA454A1|HA124A1)$/i;
const SUPPORT_HINT_RE = /\b(?:tech\s*care|pointnext|care\s*pack|support|foundation\s*care)\b/i;

function _firstNumber(values) {
  for (const v of values) {
    if (v !== undefined && v !== null && Number.isFinite(Number(v))) return Number(v);
  }
  return null;
}

function _safeQty(part) {
  const n = Number(part?.quantity ?? part?.qty ?? 0);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function _isChassisPart(part) {
  const role = classifyComponentRole(part.category || '', part.description || '');
  return role === 'Base Chassis' || CHASSIS_HINT_RE.test(part.description || '');
}

function _resolveCandidateNodeCount(candidate, parts, context) {
  const explicit = _firstNumber([candidate?.nodeCount, candidate?.serverCount, candidate?.multiplier, context?.nodeCount, context?.serverCount]);
  if (explicit !== null && explicit > 0) return explicit;
  const chassisQty = parts.filter(_isChassisPart).reduce((sum, p) => sum + _safeQty(p), 0);
  return chassisQty > 0 ? chassisQty : null;
}

function _hasIncompletePartPrice(part) {
  if (part.priceKnown === false) return true;
  if (part.isConfirmedZeroPrice) return false;
  return part.unitPriceUsd == null && part.priceUsd == null;
}

function _resolvePricingFacts(candidate, parts) {
  const hasExplicitNullTotal = Boolean(candidate && Object.prototype.hasOwnProperty.call(candidate, 'totalCostUsd') && candidate.totalCostUsd == null);
  const partIncomplete = parts.some(_hasIncompletePartPrice);
  const rawCost = hasExplicitNullTotal
    ? null
    : _firstNumber([candidate?.totalCostUsd, candidate?.totalOrderCostUsd, candidate?.estimatedCostUsd, candidate?.budgetBreakdown?.totalBudgetUsd]);
  const pricingComplete = candidate?.pricingComplete !== false && !hasExplicitNullTotal && !partIncomplete && rawCost !== null;
  return { pricingComplete, totalCostUsd: pricingComplete ? rawCost : null };
}

function _parseMemoryPart(desc, qty) {
  const kitMatch = desc.match(/\((\d+)\s*x\s*(\d+(?:\.\d+)?)\s*(GB|TB)\)/i);
  if (kitMatch) {
    const dimmsPerKit = Number(kitMatch[1]);
    const eachVal = Number(kitMatch[2]);
    const eachGb = kitMatch[3].toUpperCase() === 'TB' ? eachVal * 1024 : eachVal;
    return { dimms: qty * dimmsPerKit, gb: qty * dimmsPerKit * eachGb };
  }
  const capMatch = desc.match(/\b(\d+(?:\.\d+)?)\s*(GB|TB)\b/i);
  if (!capMatch) return { dimms: qty, gb: 0 };
  const val = Number(capMatch[1]);
  const gb = capMatch[2].toUpperCase() === 'TB' ? val * 1024 : val;
  return { dimms: qty, gb: qty * gb };
}

function _parseDrivePart(desc, qty) {
  const capMatch = desc.match(/\b(\d+(?:\.\d+)?)\s*(GB|TB)\b/i);
  if (!capMatch) return { count: 0, rawTb: 0 };
  const val = Number(capMatch[1]);
  const tbPerDrive = capMatch[2].toUpperCase() === 'GB' ? val / 1000 : val;
  return { count: qty, rawTb: qty * tbPerDrive };
}

function _parseNetworkPart(part, qty) {
  const desc = String(part.description || '');
  const speeds = [];
  const speedRe = /\b(\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)*)\s*(?:GbE|Gbps|Gb)\b/gi;
  let m;
  while ((m = speedRe.exec(desc)) !== null) speeds.push(...m[1].split('/').map(Number));
  const portMatch = desc.match(/\b(\d+)\s*-?\s*ports?\b/i);
  const defaultPorts = /dual/i.test(desc) ? 2 : (/quad/i.test(desc) ? 4 : 1);
  const portsEach = portMatch ? Number(portMatch[1]) : defaultPorts;
  // A NIC description can name its connector without describing an optic.
  const isPortAdapter = Boolean(portMatch && /\b(?:adapter|nic)\b/i.test(desc));
  const isOptic = !isPortAdapter && OPTIC_HINT_RE.test(desc);
  const scopeText = `${part.purpose || ''} ${part.allocation || ''} ${desc}`;
  const isSpareOrShared = Boolean(part.isSpare || part.isShared || part.quantityScope === 'global' || /\b(?:spare|shared|global)\b/i.test(scopeText));
  return { speeds, ports: isOptic ? 0 : qty * portsEach, isOptic, opticQty: isOptic ? qty : 0, isSpareOrShared };
}

function _parseSupportPart(part) {
  const sku = cleanBaseSKU(part.sku || '');
  const desc = String(part.description || '');
  const yearMatch = desc.match(/\b(\d+)\s*-?\s*(?:y|yr|yrs|year|years)\b/i);
  let durationYears = yearMatch ? Number(yearMatch[1]) : null;
  if (!durationYears && /^HU\d+[A-Z]\d+([13457])$/i.test(sku)) {
    durationYears = Number(sku.slice(-1));
  }
  const slaMatch = desc.match(/\b(Critical|Essential|Basic|4-?hour|4hr|6-?hour\s*CTR|NBD|Next\s+Business\s+Day|24x7)\b/i);
  const retMatch = desc.match(/\b(CDMR|GDMR|DMR)\b/i);
  return {
    sku,
    durationYears,
    slaLevel: slaMatch ? slaMatch[1].replace(/\s+/g, ' ').trim() : null,
    retention: retMatch ? retMatch[1].toUpperCase() : null,
    raw: desc
  };
}

function _determinePartScaler(parts, nodeCount) {
  if (!nodeCount || nodeCount <= 1) return () => 1;
  const chassisQty = parts.filter(_isChassisPart).reduce((sum, p) => sum + _safeQty(p), 0);
  const isClusterPreMultiplied = chassisQty === nodeCount && parts.some(p => p.quantityBasis !== 'base');
  return part => {
    if (part.quantityScope === 'global' || part.isSpare || part.isShared) return 0;
    if (part.perNodeQuantity !== undefined && part.perNodeQuantity !== null) return null;
    if (part.quantityBasis === 'base') return 1;
    return isClusterPreMultiplied ? (1 / nodeCount) : 1;
  };
}

function _createFactsAccumulator(parts, nodeCount, pricing) {
  return {
    parts,
    nodeCount,
    pricingComplete: pricing.pricingComplete,
    totalCostUsd: pricing.totalCostUsd,
    perNodeRamGb: 0,
    perNodeDimmCount: 0,
    socketsPerNode: 0,
    coresPerNode: 0,
    maxCoresPerSocket: 0,
    perNodeDriveCount: 0,
    perNodeRawStorageTb: 0,
    maxNetworkSpeedGbps: 0,
    portsPerNode: 0,
    spareOpticsCount: 0,
    sharedOpticsCount: 0,
    spareOpticsBySpeed: new Map(),
    psuCountPerNode: 0,
    totalPsuWattsPerNode: 0,
    networkSpeedSet: new Set(),
    installedNetworkPorts: [],
    supportEntries: [],
    skuSet: new Set(),
    excludedHits: []
  };
}

function _accumulateMemoryOrCpu(acc, desc, role, perNodeQty) {
  if ((role === 'Memory' || MEMORY_HINT_RE.test(desc)) && !MEMORY_EXCLUDE_RE.test(desc)) {
    const mem = _parseMemoryPart(desc, perNodeQty);
    acc.perNodeDimmCount += mem.dimms;
    acc.perNodeRamGb += mem.gb;
    return true;
  }
  if ((role === 'Processor' || CPU_HINT_RE.test(desc)) && !CPU_EXCLUDE_RE.test(desc)) {
    acc.socketsPerNode += perNodeQty;
    const coreMatch = desc.match(/\b(\d+)\s*-?\s*cores?\b/i);
    const coresEach = coreMatch ? Number(coreMatch[1]) : 0;
    acc.coresPerNode += perNodeQty * coresEach;
    if (coresEach > acc.maxCoresPerSocket) acc.maxCoresPerSocket = coresEach;
    return true;
  }
  return false;
}

function _accumulateDriveOrPsu(acc, desc, perNodeQty) {
  if (DRIVE_HINT_RE.test(desc) && !DRIVE_EXCLUDE_RE.test(desc)) {
    const drv = _parseDrivePart(desc, perNodeQty);
    acc.perNodeDriveCount += drv.count;
    acc.perNodeRawStorageTb += drv.rawTb;
    return;
  }
  if (PSU_HINT_RE.test(desc) && !PSU_EXCLUDE_RE.test(desc)) {
    acc.psuCountPerNode += perNodeQty;
    const wattMatch = desc.match(/\b(\d{3,4})\s*w\b/i);
    if (wattMatch) acc.totalPsuWattsPerNode += perNodeQty * Number(wattMatch[1]);
  }
}

function _accumulateNetworkAndSupport(acc, part, sku, desc, role, qty, scale, perNodeQty) {
  if (role === 'Network Adapter' || NETWORK_HINT_RE.test(desc)) {
    const net = _parseNetworkPart(part, qty);
    const factor = scale === null ? (perNodeQty / (qty || 1)) : scale;
    if (!net.isOptic && !net.isSpareOrShared && perNodeQty > 0) {
      for (const s of net.speeds) {
        acc.networkSpeedSet.add(s);
        if (s > acc.maxNetworkSpeedGbps) acc.maxNetworkSpeedGbps = s;
      }
      acc.portsPerNode += net.ports * factor;
      acc.installedNetworkPorts.push({ ports: net.ports * factor, speeds: net.speeds });
    }
    if (net.isOptic && net.isSpareOrShared) {
      acc.spareOpticsCount += qty;
      acc.sharedOpticsCount += qty;
      for (const s of net.speeds) acc.spareOpticsBySpeed.set(s, (acc.spareOpticsBySpeed.get(s) || 0) + qty);
    }
  }
  if (isServiceSku(sku) || SUPPORT_HINT_RE.test(desc)) {
    acc.supportEntries.push(_parseSupportPart(part));
  }
}

function _accumulateSharedItems(acc, sharedItems) {
  for (const sPart of sharedItems) {
    const sku = cleanBaseSKU(sPart.sku || '');
    if (sku) acc.skuSet.add(sku);
    const net = _parseNetworkPart(sPart, _safeQty(sPart));
    if (!net.isOptic) continue;
    acc.spareOpticsCount += net.opticQty;
    acc.sharedOpticsCount += net.opticQty;
    for (const s of net.speeds) {
      acc.spareOpticsBySpeed.set(s, (acc.spareOpticsBySpeed.get(s) || 0) + net.opticQty);
    }
  }
}

function _resolveActiveRaidLevel(candidate, context) {
  return normalizeRaidLevel(candidate?.raidLevel || context?.raidLevel);
}

function _processSingleCandidatePart(acc, part, scaleFor) {
  const sku = cleanBaseSKU(part.sku || part['Product #'] || '');
  if (sku) acc.skuSet.add(sku);
  const desc = String(part.description || '');
  const qty = _safeQty(part);
  const scale = scaleFor(part);
  const perNodeQty = scale === null ? Number(part.perNodeQuantity) : qty * scale;
  const role = classifyComponentRole(part.category || '', desc);

  if (INSTALL_SKU_RE.test(sku) || INSTALL_EXCLUDE_RE.test(desc)) {
    acc.excludedHits.push({ category: 'installation', sku, desc });
  }
  if (!_accumulateMemoryOrCpu(acc, desc, role, perNodeQty)) {
    _accumulateDriveOrPsu(acc, desc, perNodeQty);
  }
  _accumulateNetworkAndSupport(acc, part, sku, desc, role, qty, scale, perNodeQty);
}

function _finalizeCandidateFacts(acc, candidate, requirementAccounting, context) {
  const mult = acc.nodeCount || 1;
  return {
    ...acc,
    perNodeRamGb: Number(acc.perNodeRamGb.toFixed(4)),
    clusterRamGb: acc.nodeCount ? Number((acc.perNodeRamGb * acc.nodeCount).toFixed(4)) : null,
    clusterDriveCount: acc.perNodeDriveCount * mult,
    perNodeRawStorageTb: Number(acc.perNodeRawStorageTb.toFixed(4)),
    clusterRawStorageTb: Number((acc.perNodeRawStorageTb * mult).toFixed(4)),
    explicitUsableStorageTb: _firstNumber([candidate?.usableStorageTb]),
    activeRaidLevel: _resolveActiveRaidLevel(candidate, context),
    estimatedNodeWattage: _firstNumber([context?.evalSummary?.power?.estimatedNodeWattage, candidate?.estimatedNodeWattage]),
    rackUnits: _firstNumber([candidate?.rackUnits, context?.rackUnits]),
    maxLeadTimeDays: _firstNumber([candidate?.supplyMetrics?.hardwareMaxLeadTimeDays, candidate?.supplyMetrics?.maxLeadTimeDays, candidate?.supplyMetrics?.solutionEdtDays]),
    domain: candidate?.domain || context?.domain || 'server'
  };
}

function _extractCandidateFacts(candidate, requirementAccounting, context = {}) {
  const parts = candidate?.skuPartsList || candidate?.skuList || candidate?.items || candidate?.parts || [];
  const sharedItems = [...(candidate?.sharedInfrastructure || []), ...(context?.sharedInfrastructure || [])];
  const nodeCount = _resolveCandidateNodeCount(candidate, parts, context);
  const pricing = _resolvePricingFacts(candidate, parts);
  const scaleFor = _determinePartScaler(parts, nodeCount);
  const acc = _createFactsAccumulator(parts, nodeCount, pricing);

  for (const part of parts) _processSingleCandidatePart(acc, part, scaleFor);
  _accumulateSharedItems(acc, sharedItems);

  return _finalizeCandidateFacts(acc, candidate, requirementAccounting, context);
}

function _compareNumeric(actual, comparator, expected) {
  if (actual === null || actual === undefined || !Number.isFinite(Number(actual))) return null;
  const num = Number(actual);
  if (comparator === COMPARATORS.MIN) return num >= expected - 1e-6;
  if (comparator === COMPARATORS.MAX) return num <= expected + 1e-6;
  return Math.abs(num - expected) <= 1e-4;
}

function _evalBudgetMetric(metric, facts) {
  if (!facts.pricingComplete || facts.totalCostUsd == null) {
    return { status: DISPOSITIONS.UNRESOLVED, reason: 'PRICING_INCOMPLETE_OR_NULL_TOTAL', actual: facts.totalCostUsd };
  }
  if (metric.scope === SCOPE_TYPES.PER_NODE && !facts.nodeCount) {
    return { status: DISPOSITIONS.UNRESOLVED, reason: 'MISSING_NODE_COUNT_FOR_PER_NODE_BUDGET', actual: null };
  }
  const actual = metric.scope === SCOPE_TYPES.PER_NODE ? facts.totalCostUsd / facts.nodeCount : facts.totalCostUsd;
  const pass = _compareNumeric(actual, metric.comparator, metric.value);
  return {
    status: pass ? DISPOSITIONS.SATISFIED : DISPOSITIONS.VIOLATED,
    reason: pass ? 'BUDGET_WITHIN_LIMIT' : `COST_${actual}_EXCEEDS_BUDGET_${metric.value}`,
    actual
  };
}

function _evalExplicitUsableStorage(metric, facts) {
  const pass = _compareNumeric(facts.explicitUsableStorageTb, metric.comparator, metric.value);
  return {
    status: pass ? DISPOSITIONS.SATISFIED : DISPOSITIONS.VIOLATED,
    reason: pass ? 'USABLE_STORAGE_SATISFIED' : 'USABLE_STORAGE_DEFICIT',
    actual: facts.explicitUsableStorageTb
  };
}

function _evalUsableStorageMetric(metric, facts) {
  if (facts.explicitUsableStorageTb !== null) return _evalExplicitUsableStorage(metric, facts);
  const raidLevel = facts.activeRaidLevel;
  const isCluster = metric.scope === SCOPE_TYPES.PER_CLUSTER;
  const rawTb = isCluster ? facts.clusterRawStorageTb : facts.perNodeRawStorageTb;
  const driveCount = isCluster ? facts.clusterDriveCount : facts.perNodeDriveCount;

  if (!raidLevel) {
    if (driveCount > 0 && rawTb < metric.value - 1e-6) {
      return { status: DISPOSITIONS.VIOLATED, reason: `RAW_STORAGE_${rawTb}TB_BELOW_USABLE_TARGET_${metric.value}TB`, actual: rawTb };
    }
    return { status: DISPOSITIONS.UNRESOLVED, reason: 'RAID_LEVEL_UNSPECIFIED_FOR_USABLE_STORAGE', actual: null };
  }
  if (driveCount <= 0) {
    return { status: DISPOSITIONS.VIOLATED, reason: 'NO_DATA_DRIVES_FOR_STORAGE_REQUIREMENT', actual: 0 };
  }
  const calc = computeUsableStorageTb({ rawStorageTb: rawTb, driveCount, raidLevel });
  if (!calc.valid) {
    return { status: DISPOSITIONS.VIOLATED, reason: calc.reason || 'INVALID_RAID_TOPOLOGY', physicalImpossibility: calc.physicalImpossibility, actual: null };
  }
  const pass = _compareNumeric(calc.usableStorageTb, metric.comparator, metric.value);
  return {
    status: pass ? DISPOSITIONS.SATISFIED : DISPOSITIONS.VIOLATED,
    reason: pass ? `USABLE_${raidLevel}_SATISFIED` : `USABLE_${raidLevel}_${calc.usableStorageTb}TB_FAILS_${metric.value}TB`,
    actual: calc.usableStorageTb
  };
}

function _zeroSensitiveCount(n, metric, facts) {
  if (n > 0) return n;
  if (facts.parts.length > 0 && metric.comparator !== COMPARATORS.MAX && metric.value > 0) return 0;
  return null;
}

function _resolveMetricActualValue(metric, facts, recordMetrics) {
  const speedMetric = recordMetrics.find(m => m.metric === 'speedGbps');
  const speedInRecord = speedMetric?.value ?? null;
  const spareOpticsVal = (speedInRecord !== null && facts.spareOpticsBySpeed.size > 0)
    ? (facts.spareOpticsBySpeed.get(speedInRecord) || 0)
    : facts.spareOpticsCount;
  const isCluster = metric.scope === SCOPE_TYPES.PER_CLUSTER;

  const lookup = {
    nodeCount: facts.nodeCount,
    cores: _zeroSensitiveCount(facts.coresPerNode, metric, facts),
    sockets: _zeroSensitiveCount(facts.socketsPerNode, metric, facts),
    rackUnits: facts.rackUnits,
    ramCapacityGb: isCluster ? facts.clusterRamGb : _zeroSensitiveCount(facts.perNodeRamGb, metric, facts),
    dimmCount: _zeroSensitiveCount(facts.perNodeDimmCount, metric, facts),
    rawStorageTb: isCluster ? facts.clusterRawStorageTb : _zeroSensitiveCount(facts.perNodeRawStorageTb, metric, facts),
    speedGbps: _zeroSensitiveCount(metric.isSpare || metric.isShared
      ? Math.max(0, ...facts.spareOpticsBySpeed.keys()) : facts.maxNetworkSpeedGbps, metric, facts),
    portCount: _zeroSensitiveCount(_countPortsAtRequiredSpeed(facts, speedMetric), metric, facts),
    spareOpticsCount: spareOpticsVal,
    deliveryDeadlineDays: facts.maxLeadTimeDays
  };
  return (metric.metric in lookup) ? { known: true, actual: lookup[metric.metric] } : { known: false, actual: null };
}

function _countPortsAtRequiredSpeed(facts, speedMetric) {
  if (!speedMetric) return facts.portsPerNode;
  return facts.installedNetworkPorts.reduce((sum, adapter) => {
    const matches = adapter.speeds.some(speed => _compareNumeric(speed, speedMetric.comparator, speedMetric.value) === true);
    return sum + (matches ? adapter.ports : 0);
  }, 0);
}

function _evalNumericSimpleMetric(metric, facts, recordMetrics = []) {
  const resolved = _resolveMetricActualValue(metric, facts, recordMetrics);
  if (!resolved.known) return null;
  const pass = _compareNumeric(resolved.actual, metric.comparator, metric.value);
  if (pass === null) {
    return { status: DISPOSITIONS.UNRESOLVED, reason: `MISSING_CANDIDATE_TELEMETRY_${metric.metric.toUpperCase()}`, actual: null };
  }
  return {
    status: pass ? DISPOSITIONS.SATISFIED : DISPOSITIONS.VIOLATED,
    reason: pass ? `${metric.metric.toUpperCase()}_SATISFIED` : `${metric.metric.toUpperCase()}_${resolved.actual}_FAILS_${metric.comparator}_${metric.value}`,
    actual: resolved.actual
  };
}

function _evalRedundancyMetric(metric, facts) {
  if (facts.psuCountPerNode === 0) return { status: DISPOSITIONS.UNRESOLVED, reason: 'NO_PSU_TELEMETRY', actual: 0 };
  if (metric.value === '2N') {
    const ok = facts.psuCountPerNode >= 2 && facts.psuCountPerNode % 2 === 0;
    return { status: ok ? DISPOSITIONS.SATISFIED : DISPOSITIONS.VIOLATED, reason: ok ? 'REDUNDANCY_2N_SATISFIED' : 'INSUFFICIENT_OR_ODD_PSUS_FOR_2N', actual: facts.psuCountPerNode };
  }
  const ok = facts.psuCountPerNode >= 2;
  return { status: ok ? DISPOSITIONS.SATISFIED : DISPOSITIONS.VIOLATED, reason: ok ? 'REDUNDANCY_N_PLUS_1_SATISFIED' : 'SINGLE_PSU_CANNOT_PROVIDE_N_PLUS_1', actual: facts.psuCountPerNode };
}

function _evalSupportFieldMatch(metric, facts) {
  const needle = String(metric.value).toLowerCase();
  const field = metric.metric === 'slaLevel' ? 'slaLevel' : 'retention';
  const matched = facts.supportEntries.some(e => (e[field] && e[field].toLowerCase() === needle) || e.raw.toLowerCase().includes(needle));
  return {
    status: matched ? DISPOSITIONS.SATISFIED : DISPOSITIONS.VIOLATED,
    reason: matched ? `${metric.metric.toUpperCase()}_MATCHED` : `${metric.metric.toUpperCase()}_MISMATCH`,
    actual: facts.supportEntries.map(e => e[field])
  };
}

function _evalSupportOrRedundancyMetric(metric, facts) {
  if (metric.metric === 'redundancyMode') return _evalRedundancyMetric(metric, facts);
  const supportMetrics = ['durationYears', 'slaLevel', 'supportRetention'];
  if (!supportMetrics.includes(metric.metric)) return null;
  if (!facts.supportEntries.length) {
    return { status: DISPOSITIONS.VIOLATED, reason: 'NO_SUPPORT_SERVICE_PRESENT', actual: null };
  }
  if (metric.metric === 'durationYears') {
    const matched = facts.supportEntries.some(e => _compareNumeric(e.durationYears, metric.comparator, metric.value) === true);
    return { status: matched ? DISPOSITIONS.SATISFIED : DISPOSITIONS.VIOLATED, reason: matched ? 'SUPPORT_DURATION_MATCHED' : 'SUPPORT_DURATION_MISMATCH', actual: facts.supportEntries.map(e => e.durationYears) };
  }
  return _evalSupportFieldMatch(metric, facts);
}

function _matchesExcludedCategory(term, facts) {
  const stem = term.replace(/s$/, '');
  if (facts.excludedHits.some(h => term.includes(h.category))) return true;
  if (/^(?:services?|support)$/.test(term) && facts.supportEntries.length > 0) return true;
  if (/^servers?$/.test(term) && facts.parts.some(_isChassisPart)) return true;
  return facts.parts.some(p => {
    const desc = String(p.description || '').toLowerCase();
    return desc.includes(term) || (stem.length >= 4 && desc.includes(stem));
  });
}

function _evalLockOrExclusionMetric(metric, facts) {
  if (metric.metric === 'lockedSku') {
    const cleanLock = cleanBaseSKU(metric.value);
    const present = facts.skuSet.has(cleanLock);
    return {
      status: present ? DISPOSITIONS.SATISFIED : DISPOSITIONS.VIOLATED,
      reason: present ? 'LOCKED_SKU_PRESERVED' : `LOCKED_SKU_${cleanLock}_SUBSTITUTED_OR_MISSING`,
      actual: present ? cleanLock : null
    };
  }
  if (metric.metric === 'excludedSku') {
    const cleanExcl = cleanBaseSKU(metric.value);
    const present = facts.skuSet.has(cleanExcl);
    return {
      status: present ? DISPOSITIONS.VIOLATED : DISPOSITIONS.SATISFIED,
      reason: present ? `EXCLUDED_SKU_${cleanExcl}_PRESENT` : 'EXCLUDED_SKU_ABSENT',
      actual: present
    };
  }
  if (metric.metric === 'excludedCategory') {
    const term = String(metric.value || '').toLowerCase();
    const hit = _matchesExcludedCategory(term, facts);
    return {
      status: hit ? DISPOSITIONS.VIOLATED : DISPOSITIONS.SATISFIED,
      reason: hit ? `EXCLUDED_CATEGORY_${term.toUpperCase()}_PRESENT` : 'EXCLUDED_CATEGORY_ABSENT',
      actual: hit
    };
  }
  return null;
}

function _evaluateMetric(metric, facts, recordMetrics) {
  if (metric.metric === 'budgetUsd') return _evalBudgetMetric(metric, facts);
  if (metric.metric === 'usableStorageTb') return _evalUsableStorageMetric(metric, facts);
  if (metric.metric === 'raidLevel') {
    if (!facts.activeRaidLevel) return { status: DISPOSITIONS.UNRESOLVED, reason: 'RAID_LEVEL_UNSPECIFIED', actual: null };
    if (facts.perNodeDriveCount > 0) {
      const calc = computeUsableStorageTb({ rawStorageTb: facts.perNodeRawStorageTb, driveCount: facts.perNodeDriveCount, raidLevel: metric.value });
      if (!calc.valid) return { status: DISPOSITIONS.VIOLATED, reason: calc.reason, physicalImpossibility: calc.physicalImpossibility, actual: facts.perNodeDriveCount };
    }
    const ok = facts.activeRaidLevel === metric.value;
    return { status: ok ? DISPOSITIONS.SATISFIED : DISPOSITIONS.VIOLATED, reason: ok ? 'RAID_LEVEL_MATCHED' : 'RAID_LEVEL_MISMATCH', actual: facts.activeRaidLevel };
  }
  return _evalNumericSimpleMetric(metric, facts, recordMetrics)
    || _evalSupportOrRedundancyMetric(metric, facts)
    || _evalLockOrExclusionMetric(metric, facts)
    || { status: DISPOSITIONS.UNRESOLVED, reason: `UNSUPPORTED_METRIC_${metric.metric}`, actual: null };
}

function _buildDisposition(record, status, reason, opts = {}) {
  const isHard = record.hardness !== HARDNESS_LEVELS.PREFERENCE;
  const blocking = isHard && (status === DISPOSITIONS.VIOLATED || status === DISPOSITIONS.UNRESOLVED);
  return {
    requirementId: record.id,
    rawText: record.rawText,
    provenance: record.provenance,
    hardness: record.hardness,
    scope: record.scope,
    disposition: status,
    blocking,
    physicalImpossibility: Boolean(opts.physicalImpossibility || record.physicalImpossibility),
    reason,
    metricResults: opts.metricResults || [],
    waiver: opts.waiver || null
  };
}

function _evaluateSingleRecord(record, facts) {
  if (record.parseStatus === 'UNINTERPRETED') {
    const rsn = record.hardness === HARDNESS_LEVELS.PREFERENCE ? 'UNINTERPRETED_PREFERENCE' : 'UNINTERPRETED_HARD_CLAUSE';
    return _buildDisposition(record, DISPOSITIONS.UNRESOLVED, rsn);
  }
  if (record.isAmbiguous) {
    return _buildDisposition(record, DISPOSITIONS.UNRESOLVED, 'AMBIGUOUS_CONFLICTING_REQUIREMENT');
  }
  if (facts.domain === 'networking' && ['MEMORY', 'STORAGE'].includes(record.typedValue?.domain)) {
    return _buildDisposition(record, DISPOSITIONS.NOT_APPLICABLE, 'DOMAIN_NOT_APPLICABLE_TO_NETWORK_SWITCH');
  }
  if (record.physicalImpossibility) {
    return _buildDisposition(record, DISPOSITIONS.VIOLATED, 'PHYSICAL_IMPOSSIBILITY_IN_REQUIREMENT', { physicalImpossibility: true });
  }

  const metrics = record.extractedMetrics || [];
  const results = metrics.map(m => ({ metric: m.metric, ..._evaluateMetric(m, facts, metrics) }));
  if (results.length === 0) {
    return _buildDisposition(record, DISPOSITIONS.UNRESOLVED, 'NO_EVALUABLE_METRICS');
  }
  const violated = results.find(r => r.status === DISPOSITIONS.VIOLATED);
  if (violated) {
    return _buildDisposition(record, DISPOSITIONS.VIOLATED, violated.reason, {
      physicalImpossibility: results.some(r => r.physicalImpossibility === true),
      metricResults: results
    });
  }
  const unresolved = results.find(r => r.status === DISPOSITIONS.UNRESOLVED);
  if (unresolved) {
    return _buildDisposition(record, DISPOSITIONS.UNRESOLVED, unresolved.reason, { metricResults: results });
  }
  return _buildDisposition(record, DISPOSITIONS.SATISFIED, results[0].reason, { metricResults: results });
}

function _tallyDispositions(dispositions) {
  const counts = { SATISFIED: 0, VIOLATED: 0, UNRESOLVED: 0, NOT_APPLICABLE: 0, WAIVED: 0 };
  const hardness = { hardConstraintCount: 0, preferenceCount: 0, exclusionCount: 0 };
  const blockingDispositions = [];

  for (const d of dispositions) {
    if (d.disposition in counts) counts[d.disposition]++;
    if (d.hardness === HARDNESS_LEVELS.PREFERENCE) hardness.preferenceCount++;
    else if (d.hardness === HARDNESS_LEVELS.EXCLUSION) hardness.exclusionCount++;
    else hardness.hardConstraintCount++;
    if (d.blocking) blockingDispositions.push({ requirementId: d.requirementId, disposition: d.disposition, reason: d.reason });
  }
  return { counts, hardness, blockingDispositions };
}

function summarizeRequirementCoverage(dispositionsOrCoverage = []) {
  const dispositions = Array.isArray(dispositionsOrCoverage)
    ? dispositionsOrCoverage
    : (dispositionsOrCoverage?.dispositions || []);
  const { counts, hardness, blockingDispositions } = _tallyDispositions(dispositions);

  let coverageStatus = 'ALL_SATISFIED';
  if (dispositions.length === 0) coverageStatus = 'NO_REQUIREMENTS';
  else if (counts.VIOLATED > 0) coverageStatus = 'VIOLATED';
  else if (blockingDispositions.length > 0 || counts.UNRESOLVED > 0) coverageStatus = 'PARTIAL_UNRESOLVED';

  return {
    totalRequirements: dispositions.length,
    satisfiedCount: counts.SATISFIED,
    violatedCount: counts.VIOLATED,
    unresolvedCount: counts.UNRESOLVED,
    notApplicableCount: counts.NOT_APPLICABLE,
    waivedCount: counts.WAIVED,
    ...hardness,
    blockingDispositions,
    blocksPositiveRecommendation: blockingDispositions.length > 0,
    coverageStatus
  };
}

function _validateWaiverGuard(disposition, waiver) {
  const authority = waiver && typeof waiver.customerAuthority === 'string' ? waiver.customerAuthority.trim() : '';
  if (!authority) {
    const err = new Error('WAIVER_AUTHORITY_REQUIRED: Non-empty customerAuthority is strictly required.');
    err.code = 'WAIVER_AUTHORITY_REQUIRED';
    throw err;
  }
  if (disposition.physicalImpossibility === true) {
    const err = new Error(`WAIVER_PHYSICAL_IMPOSSIBILITY_FORBIDDEN: Requirement ${disposition.requirementId} involves physical impossibility and cannot be waived.`);
    err.code = 'WAIVER_PHYSICAL_IMPOSSIBILITY_FORBIDDEN';
    throw err;
  }
  return authority;
}

function _applyWaiverToDisposition(disposition, waiver) {
  const authority = _validateWaiverGuard(disposition, waiver);
  if (disposition.disposition === DISPOSITIONS.SATISFIED || disposition.disposition === DISPOSITIONS.NOT_APPLICABLE) {
    return disposition;
  }
  return {
    ...disposition,
    disposition: DISPOSITIONS.WAIVED,
    blocking: false,
    waived: true,
    waiver: {
      customerAuthority: authority,
      reason: waiver.reason ? String(waiver.reason).trim() : 'Customer-authorized waiver',
      waivedAt: waiver.waivedAt || null
    }
  };
}

function applyRequirementWaiver(target, waiver) {
  if (!target || typeof target !== 'object') {
    throw new Error('INVALID_WAIVER_TARGET: Expected RequirementDisposition or coverage report.');
  }
  if (!Array.isArray(target) && !Array.isArray(target.dispositions)) {
    return _applyWaiverToDisposition(target, waiver);
  }
  const list = Array.isArray(target) ? target : target.dispositions;
  const targetId = waiver?.requirementId;
  const idx = list.findIndex(d => d.requirementId === targetId);
  if (idx === -1) {
    throw new Error(`WAIVER_REQUIREMENT_NOT_FOUND: Requirement ${targetId} not present in dispositions.`);
  }
  const updatedList = list.map((d, i) => (i === idx ? _applyWaiverToDisposition(d, waiver) : d));
  if (Array.isArray(target)) return updatedList;
  const summary = summarizeRequirementCoverage(updatedList);
  return {
    ...target,
    dispositions: updatedList,
    summary,
    blocksPositiveRecommendation: summary.blocksPositiveRecommendation
  };
}

function _applyContextWaivers(dispositions, waivers = []) {
  if (!Array.isArray(waivers) || waivers.length === 0) return { dispositions, rejectedWaivers: [] };
  const rejectedWaivers = [];
  let current = dispositions;
  for (const w of waivers) {
    if (!w || !w.requirementId) continue;
    try {
      current = applyRequirementWaiver(current, w);
    } catch (err) {
      rejectedWaivers.push({ requirementId: w.requirementId, reason: err.message, code: err.code || 'WAIVER_REJECTED' });
    }
  }
  return { dispositions: current, rejectedWaivers };
}

function _normalizePartForConservation(p, preMultiplied, nodeCount) {
  if (p.totalQuantity !== undefined && p.totalQuantity !== null) return p;
  if (p.quantityScope === 'global') return { ...p, totalQuantity: _safeQty(p) };
  if (p.quantityBasis === 'base') return { ...p, totalQuantity: _safeQty(p) * (nodeCount || 1) };
  if (preMultiplied) return { ...p, totalQuantity: _safeQty(p) };
  return p;
}

function _buildConservationInput(candidate, facts, context) {
  if (candidate?.clusters) return candidate.clusters;
  const chassisQty = facts.parts.filter(_isChassisPart).reduce((sum, p) => sum + _safeQty(p), 0);
  const preMultiplied = facts.nodeCount > 1 && chassisQty === facts.nodeCount && facts.parts.some(p => p.quantityBasis !== 'base');
  const normalizedParts = facts.parts.map(p => _normalizePartForConservation(p, preMultiplied, facts.nodeCount));
  const sharedInfrastructure = [
    ...(candidate?.sharedInfrastructure || []),
    ...(context?.sharedInfrastructure || [])
  ];
  return {
    clusters: [{
      clusterId: 'Default_Cluster',
      multiplier: preMultiplied ? 1 : (facts.nodeCount || 1),
      items: normalizedParts
    }],
    sharedInfrastructure
  };
}

function evaluateCandidateRequirementCoverage(candidate, requirementAccounting, context = {}) {
  const records = requirementAccounting?.records || [];
  const facts = _extractCandidateFacts(candidate, requirementAccounting, context);
  const rawDispositions = records.map(rec => _evaluateSingleRecord(rec, facts));
  const { dispositions, rejectedWaivers } = _applyContextWaivers(rawDispositions, context.waivers);
  const summary = summarizeRequirementCoverage(dispositions);

  let quantityConservation = null;
  if (Array.isArray(context.baselineItems) && context.baselineItems.length > 0) {
    const alloc = _buildConservationInput(candidate, facts, context);
    quantityConservation = buildUniversalQuantityConservationLedger(context.baselineItems, alloc, { strict: false });
  }

  return {
    schemaVersion: requirementAccounting?.schemaVersion || '1.0',
    inputRevisionSha256: requirementAccounting?.inputRevisionSha256 || null,
    dispositions,
    summary,
    blocksPositiveRecommendation: summary.blocksPositiveRecommendation,
    rejectedWaivers,
    quantityConservation
  };
}

function attachCandidateDispositions(candidates = [], requirementAccounting, context = {}) {
  if (!Array.isArray(candidates)) return [];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue;
    candidate.requirementCoverage = evaluateCandidateRequirementCoverage(candidate, requirementAccounting, context);
  }
  return candidates;
}

module.exports = {
  DISPOSITIONS,
  evaluateCandidateRequirementCoverage,
  attachCandidateDispositions,
  summarizeRequirementCoverage,
  applyRequirementWaiver
};
