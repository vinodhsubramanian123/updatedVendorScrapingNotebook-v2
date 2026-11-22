'use strict';

/**
 * scripts/lib/conflict/sizing/scaling_interpolator.js
 *
 * Phase 3A Parametric Scaling, Capacity Interpolation & Bounded Analytics Engine:
 * 1. Memory 1DPC/2DPC balanced topology stepping & speed-stepdown disclosure.
 * 2. Storage usable capacity, RAID efficiency, hot spares & SAS-expander/controller crossover.
 * 3. Multi-node HA cluster scaling curves (NONE, N+1, 2N), 42U rack U & peak kW envelopes.
 * 4. Alletra MP B10000 switchless-to-switched crossover & X10000 TLC/QLC envelope lookup
 *    from captured HPE Ninja Online telemetry (with graceful fallback & mandatory CLIC handoff).
 * 5. Normalized efficiency metrics, cross-generation deltas & bounded price-trend analytics
 *    strictly tagged `classification: 'ESTIMATE'` without coercing null prices to $0.
 */

const fs = require('fs');
const path = require('path');
const { cleanBaseSKU, classifyLifecycleState } = require('../../catalog/sku.js');
const { parseStrictPrice, parseLeadTimeOrEta } = require('../../catalog/field_parsers.js');
const { classifyComponentRole } = require('../../catalog/product_meta.js');
const { extractCanonicalAttributes } = require('../../catalog/attribute_vectors.js');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const DEFAULT_B10000_NINJA_PATH = path.join(
  REPO_ROOT, 'outputs', 'Alletra', 'Storage', 'Alletra_MP_B10000', 'raw_data', 'ninja_online_sizing_catalog.json'
);
const DEFAULT_X10000_NINJA_PATH = path.join(
  REPO_ROOT, 'outputs', 'Alletra', 'Storage', 'Alletra_MP_X10000', 'raw_data', 'ninja_online_sizing_catalog.json'
);

const ALLETRA_MP_MANDATORY_DISCLOSURE =
  'Core sizing MUST be performed in HPE Ninja Online and exported as OCA JSON; post-import adaptations in HPE OCA cover optical transceivers (SFPs/QSFPs), cabling, Pointnext/Tech Care support services (Services -> Edit), and final CLIC validation.';

const CHANNEL_STEP_TABLES = Object.freeze({
  8: Object.freeze([1, 2, 4, 8]),
  12: Object.freeze([1, 2, 4, 6, 8, 12]),
  16: Object.freeze([1, 2, 4, 8, 12, 16])
});

const STEPDOWN_MAP_MT = Object.freeze({
  8800: 6400,
  6400: 5200,
  5600: 4400,
  4800: 4000,
  3200: 2933,
  2933: 2666
});

const RAID_PROFILES = Object.freeze({
  RAID0: Object.freeze({ code: 'RAID0', minDrives: 1, parityFn: () => 0, requireEven: false, usableFactor: null }),
  RAID1: Object.freeze({ code: 'RAID1', minDrives: 2, parityFn: (n) => Math.floor(n / 2), requireEven: true, usableFactor: null }),
  RAID5: Object.freeze({ code: 'RAID5', minDrives: 3, parityFn: () => 1, requireEven: false, usableFactor: null }),
  RAID6: Object.freeze({ code: 'RAID6', minDrives: 4, parityFn: () => 2, requireEven: false, usableFactor: null }),
  'RAID6-ADG': Object.freeze({ code: 'RAID6-ADG', minDrives: 4, parityFn: () => 2, requireEven: false, usableFactor: null }),
  RAID10: Object.freeze({ code: 'RAID10', minDrives: 4, parityFn: (n) => Math.floor(n / 2), requireEven: true, usableFactor: null }),
  VSAN: Object.freeze({ code: 'VSAN', minDrives: 2, parityFn: null, requireEven: false, usableFactor: 0.5 }),
  VSAN_RAID5: Object.freeze({ code: 'VSAN_RAID5', minDrives: 4, parityFn: null, requireEven: false, usableFactor: 0.75 }),
  VSAN_RAID6: Object.freeze({ code: 'VSAN_RAID6', minDrives: 6, parityFn: null, requireEven: false, usableFactor: 2 / 3 })
});

const FALLBACK_B10000_NODES = Object.freeze([
  { model: 'B10120', cpuCores: 8, cluster: false, maxDrives: 24, maxTotalSystemDrives: 24, minJBOF: 0, maxJBOF: 1, partNumber: 'S0S38A', powerTransactional_w: 356 },
  { model: 'B10130', cpuCores: 16, cluster: false, maxDrives: 24, maxTotalSystemDrives: 72, minJBOF: 0, maxJBOF: 3, partNumber: 'S0R21A', powerTransactional_w: 407 },
  { model: 'B10140', cpuCores: 32, cluster: false, maxDrives: 24, maxTotalSystemDrives: 72, minJBOF: 0, maxJBOF: 3, partNumber: 'S4V66A', powerTransactional_w: 454 },
  { model: 'B10230', cpuCores: 16, cluster: true, maxDrives: 0, maxTotalSystemDrives: 384, minJBOF: 1, maxJBOF: 8, partNumber: 'R7D02A', powerTransactional_w: 407 },
  { model: 'B10240', cpuCores: 32, cluster: true, maxDrives: 0, maxTotalSystemDrives: 384, minJBOF: 1, maxJBOF: 8, partNumber: 'R7D03A', powerTransactional_w: 454 }
]);

const FALLBACK_B10000_DRIVE_TB = Object.freeze([1.92, 3.84, 7.68, 15.36, 30.72]);

function _round(value, decimals = 2) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function _isPositiveFinite(val) {
  return typeof val === 'number' && Number.isFinite(val) && val > 0;
}

function _parseRowPriceStrict(skuRow, description) {
  const candidates = [
    skuRow['List Price (USD)'],
    skuRow['Unit Price (USD)'],
    skuRow['Price (USD)'],
    skuRow.listPrice,
    skuRow.unitPriceUsd
  ];
  for (const raw of candidates) {
    if (raw === undefined || raw === null || String(raw).trim() === '') continue;
    const parsed = parseStrictPrice(raw, { row: skuRow, description });
    if (parsed.priceState === 'PRICED' && Number.isFinite(parsed.priceUsd)) {
      return { unitPriceUsd: parsed.priceUsd, priceState: 'PRICED' };
    }
    return { unitPriceUsd: null, priceState: parsed.priceState || 'UNPRICED' };
  }
  return { unitPriceUsd: null, priceState: 'UNPRICED' };
}

function _isSelectableActiveSku(skuRow, sku, description) {
  if (/^\[REMOVED\s+SKU\]/i.test(String(description || '').trim())) return false;
  const lc = classifyLifecycleState(
    skuRow['Lifecycle Status'] || skuRow.lifecycleStatus || skuRow.Status,
    skuRow['Diff Status'] || skuRow.diffStatus,
    sku,
    description,
    skuRow.vendorSupplyStatus
  );
  return !lc.isBlockedForProduction && !lc.isConstrainedSupply;
}

function _extractDimmCapacityGb(description, attrs) {
  if (_isPositiveFinite(attrs?.capacityGb)) return attrs.capacityGb;
  const m = String(description || '').match(/\b(\d+)\s*GB\b/i);
  return m ? Number(m[1]) : null;
}

function _parseDimmRowCandidate(skuRow, entry) {
  const sku = cleanBaseSKU(skuRow['Product #'] || skuRow.sku || '');
  const desc = String(skuRow.Description || skuRow.description || '').trim();
  if (!sku || !desc) return null;
  if (/\b(?:blank|filler|kit\s+enablement|dummy|cable|riser|nvdimm\s+battery)\b/i.test(desc)) return null;
  const role = classifyComponentRole(`${entry.parentCategory || ''} ${entry.subCategory || ''}`, desc, null);
  if (role !== 'Memory' && !/\b(?:rdimm|lrdimm|mrdimm|smart\s*memory)\b/i.test(desc)) return null;
  if (!_isSelectableActiveSku(skuRow, sku, desc)) return null;

  const canonical = extractCanonicalAttributes({ sku, description: desc, category: entry.parentCategory || '' }, entry);
  const attrs = { ...canonical.attributes, ...skuRow.canonicalSpecs };
  const capacityGb = _extractDimmCapacityGb(desc, attrs);
  if (!_isPositiveFinite(capacityGb) || capacityGb < 8 || capacityGb > 1024) return null;

  const { unitPriceUsd, priceState } = _parseRowPriceStrict(skuRow, desc);
  const lead = parseLeadTimeOrEta(skuRow['Lead Time'] || skuRow.leadTime, skuRow.leadTimeDays, skuRow['Speed Tier']);
  const ddrMatch = desc.match(/\b(DDR\d+)\b/i);
  const speedMatch = desc.match(/\bDDR\d+-(\d{4,5})\b/i) || desc.match(/\b(\d{4,5})\s*MT\/s\b/i);
  const dimmTypeMatch = desc.match(/\b(MRDIMM|LRDIMM|RDIMM)\b/i);
  return {
    sku,
    description: desc,
    capacityGb,
    ddrGen: attrs.ddrGen || (ddrMatch ? ddrMatch[1].toUpperCase() : null),
    speedMt: attrs.speedMt || (speedMatch ? Number(speedMatch[1]) : null),
    dimmType: dimmTypeMatch ? dimmTypeMatch[1].toUpperCase() : 'RDIMM',
    isFio: /-F\d+$/i.test(sku) || /\bfio\b/i.test(desc),
    unitPriceUsd,
    priceState,
    leadTimeDays: lead.days
  };
}

function _extractDimmOptionsFromCatalog(catalogData) {
  if (!catalogData || !Array.isArray(catalogData.entries)) return [];
  const seen = new Map();
  for (const entry of catalogData.entries) {
    for (const skuRow of entry?.skus || []) {
      const candidate = _parseDimmRowCandidate(skuRow, entry);
      if (!candidate) continue;
      const existing = seen.get(candidate.sku);
      if (!existing || (existing.unitPriceUsd === null && candidate.unitPriceUsd !== null)) {
        seen.set(candidate.sku, candidate);
      }
    }
  }
  return [...seen.values()];
}

function _resolveMemoryChannelSteps(channelsPerSocket, maxDpc) {
  const ch = [8, 12, 16].includes(Number(channelsPerSocket)) ? Number(channelsPerSocket) : 8;
  const baseSteps = CHANNEL_STEP_TABLES[ch] || [1, 2, 4, ch];
  const steps = baseSteps.map(perSocket => ({
    dimmsPerSocket: perSocket,
    dpc: 1,
    balanceMode: perSocket === ch ? 'FULL_1DPC' : 'PARTIAL_BALANCED_1DPC'
  }));
  if (maxDpc >= 2) {
    steps.push({
      dimmsPerSocket: ch * 2,
      dpc: 2,
      balanceMode: 'FULL_2DPC'
    });
  }
  return { channelsPerSocket: ch, steps };
}

function _buildSpeedStepdownInfo(dimm, dpc) {
  const nominalSpeedMt = Number.isFinite(dimm.speedMt) ? dimm.speedMt : null;
  if (dpc < 2) {
    return {
      speedStepdownApplied: false,
      nominalSpeedMt,
      effectiveSpeedEstimateMt: nominalSpeedMt,
      speedStepdownDisclosure: null
    };
  }
  const steppedMt = nominalSpeedMt ? (STEPDOWN_MAP_MT[nominalSpeedMt] || Math.round(nominalSpeedMt * 0.8)) : null;
  const detail = nominalSpeedMt && steppedMt
    ? `${nominalSpeedMt} MT/s -> ~${steppedMt} MT/s estimated at 2DPC`
    : '2DPC population reduces maximum supported memory bus frequency';
  return {
    speedStepdownApplied: true,
    nominalSpeedMt,
    effectiveSpeedEstimateMt: steppedMt,
    speedStepdownDisclosure: `2DPC speed stepdown applies (${detail}; verify exact platform QuickSpecs DIMM population table).`
  };
}

function _scoreMemoryCandidateCompare(a, b, preferFio = false) {
  if (a.meetsTarget !== b.meetsTarget) return a.meetsTarget ? -1 : 1;
  if (a.totalCapacityGb !== b.totalCapacityGb) {
    return a.meetsTarget ? (a.totalCapacityGb - b.totalCapacityGb) : (b.totalCapacityGb - a.totalCapacityGb);
  }
  const rankBalance = (mode) => (mode === 'FULL_1DPC' ? 0 : mode === 'FULL_2DPC' ? 1 : 2);
  const balDiff = rankBalance(a.balanceMode) - rankBalance(b.balanceMode);
  if (balDiff !== 0) return balDiff;
  if (preferFio && Boolean(a.isFio) !== Boolean(b.isFio)) return a.isFio ? -1 : 1;
  const costA = a.totalMemoryCostUsd ?? Number.POSITIVE_INFINITY;
  const costB = b.totalMemoryCostUsd ?? Number.POSITIVE_INFINITY;
  if (costA !== costB) return costA - costB;
  return a.sku.localeCompare(b.sku);
}

/**
 * Compute nearest valid balanced 1DPC and 2DPC memory topologies from actual catalog DIMMs.
 * @param {object} options
 * @returns {object}
 */
function interpolateMemoryTopology(options = {}) {
  const targetRamGb = Number(options.targetRamGb);
  const socketCount = Number.isInteger(options.socketCount) && options.socketCount > 0 ? options.socketCount : 2;
  const maxDpc = Number.isInteger(options.maxDpc) && options.maxDpc > 0 ? options.maxDpc : 2;
  const { channelsPerSocket, steps } = _resolveMemoryChannelSteps(options.channelsPerSocket || 8, maxDpc);

  if (!_isPositiveFinite(targetRamGb)) {
    return {
      targetRamGb: null,
      socketCount,
      channelsPerSocket,
      coverageGap: 'INVALID_TARGET_RAM_GB',
      recommended1Dpc: null,
      recommended2Dpc: null,
      bestBalanced: null,
      candidates: []
    };
  }

  const dimmOptions = Array.isArray(options.dimmOptions)
    ? options.dimmOptions
    : _extractDimmOptionsFromCatalog(options.catalogData);

  if (!dimmOptions.length) {
    return {
      targetRamGb,
      socketCount,
      channelsPerSocket,
      catalogDimmCount: 0,
      coverageGap: 'CATALOG_COVERAGE_GAP',
      recommended1Dpc: null,
      recommended2Dpc: null,
      bestBalanced: null,
      candidates: []
    };
  }

  const candidates = [];
  for (const dimm of dimmOptions) {
    for (const step of steps) {
      const totalDimms = step.dimmsPerSocket * socketCount;
      const totalCapacityGb = totalDimms * dimm.capacityGb;
      const meetsTarget = totalCapacityGb >= targetRamGb;
      const headroomPct = _round(((totalCapacityGb - targetRamGb) / targetRamGb) * 100, 2);
      const unitPriceUsd = Number.isFinite(dimm.unitPriceUsd) ? dimm.unitPriceUsd : null;
      const totalMemoryCostUsd = unitPriceUsd !== null ? _round(unitPriceUsd * totalDimms, 2) : null;
      const stepdown = _buildSpeedStepdownInfo(dimm, step.dpc);

      candidates.push({
        sku: dimm.sku,
        description: dimm.description,
        dimmSizeGb: dimm.capacityGb,
        dimmType: dimm.dimmType || 'RDIMM',
        isFio: Boolean(dimm.isFio),
        ddrGen: dimm.ddrGen || null,
        dimmsPerSocket: step.dimmsPerSocket,
        totalDimms,
        dpc: step.dpc,
        balanceMode: step.balanceMode,
        totalCapacityGb,
        meetsTarget,
        headroomPct,
        unitPriceUsd,
        totalMemoryCostUsd,
        pricingComplete: unitPriceUsd !== null,
        leadTimeDays: dimm.leadTimeDays ?? null,
        ...stepdown,
        classification: 'ESTIMATE'
      });
    }
  }

  const preferFio = Boolean(options.preferFio);
  candidates.sort((a, b) => _scoreMemoryCandidateCompare(a, b, preferFio));
  const meeting = candidates.filter(c => c.meetsTarget);
  const recommended1Dpc = meeting.find(c => c.dpc === 1) || candidates.find(c => c.dpc === 1) || null;
  const recommended2Dpc = meeting.find(c => c.dpc === 2) || candidates.find(c => c.dpc === 2) || null;
  const bestBalanced = meeting[0] || candidates[0] || null;

  return {
    targetRamGb,
    socketCount,
    channelsPerSocket,
    catalogDimmCount: dimmOptions.length,
    coverageGap: null,
    recommended1Dpc,
    recommended2Dpc,
    bestBalanced,
    candidates: candidates.slice(0, options.limit || 12)
  };
}

function _normalizeRaidLevel(raw) {
  const token = String(raw || 'RAID5').trim().toUpperCase().replace(/\s+/g, '').replace(/_/g, '-');
  if (token === 'RAID6ADG' || token === 'RAID6-ADG' || token === 'ADG') return RAID_PROFILES['RAID6-ADG'];
  if (token === 'VSAN-RAID5' || token === 'VSANFTT1RAID5' || token === 'VSAN-FTT1-RAID5') return RAID_PROFILES.VSAN_RAID5;
  if (token === 'VSAN-RAID6' || token === 'VSANFTT2RAID6' || token === 'VSAN-FTT2-RAID6') return RAID_PROFILES.VSAN_RAID6;
  if (token === 'VSAN' || token === 'VSAN-RAID1' || token === 'VSANFTT1RAID1') return RAID_PROFILES.VSAN;
  return RAID_PROFILES[token] || RAID_PROFILES.RAID5;
}

function _extractDriveCapacityTb(description, attrs) {
  if (_isPositiveFinite(attrs?.capacityGb)) return _round(attrs.capacityGb / 1000, 4);
  const tbMatch = String(description || '').match(/\b(\d+(?:\.\d+)?)\s*TB\b/i);
  if (tbMatch) return Number(tbMatch[1]);
  const gbMatch = String(description || '').match(/\b(\d+(?:\.\d+)?)\s*GB\b/i);
  if (gbMatch) return _round(Number(gbMatch[1]) / 1000, 4);
  return null;
}

function _isPhysicalDriveDescription(desc) {
  if (/\b(?:cage|backplane|cable|carrier|blank|filler|stacking|riser|enablement|controller|expander|bundle\s+kit|nvme\s+u\.3\s+2p)\b/i.test(desc)) {
    return false;
  }
  return /\b(?:ssd|hdd|hard\s*drive|solid\s*state|nvme\s+.*(?:ri|mu|wi|ssd)|sas\s+.*(?:ssd|hdd|10k|15k|7\.2k)|sata\s+.*(?:ssd|hdd|ri|mu))\b/i.test(desc);
}

function _inferDriveEndurance(desc, attrs) {
  if (attrs?.endurance) return attrs.endurance;
  if (/\bRI\b|Read Intensive/i.test(desc)) return 'RI';
  if (/\bMU\b|Mixed Use/i.test(desc)) return 'MU';
  if (/\bWI\b|Write Intensive/i.test(desc)) return 'WI';
  return null;
}

function _parseDriveRowCandidate(skuRow, entry, filters) {
  const sku = cleanBaseSKU(skuRow['Product #'] || skuRow.sku || '');
  const desc = String(skuRow.Description || skuRow.description || '').trim();
  if (!sku || !desc || !_isPhysicalDriveDescription(desc) || !_isSelectableActiveSku(skuRow, sku, desc)) return null;

  const canonical = extractCanonicalAttributes({ sku, description: desc, category: entry.parentCategory || '' }, entry);
  const attrs = { ...canonical.attributes, ...skuRow.canonicalSpecs };
  const capacityTb = _extractDriveCapacityTb(desc, attrs);
  if (!_isPositiveFinite(capacityTb) || capacityTb < 0.2 || capacityTb > 128) return null;

  const protoMatch = desc.match(/\b(NVMe|SAS|SATA)\b/i);
  const protocol = attrs.interfaceProtocol || (protoMatch ? protoMatch[1].toUpperCase() : 'SAS');
  const ffMatch = desc.match(/\b(SFF|LFF|EDSFF|E3\.S)\b/i);
  const formFactor = attrs.formFactor || (ffMatch ? ffMatch[1].toUpperCase() : 'SFF');
  if (filters.driveProtocol && protocol !== String(filters.driveProtocol).toUpperCase()) return null;
  if (filters.formFactor && formFactor !== String(filters.formFactor).toUpperCase()) return null;

  const { unitPriceUsd, priceState } = _parseRowPriceStrict(skuRow, desc);
  const lead = parseLeadTimeOrEta(skuRow['Lead Time'] || skuRow.leadTime, skuRow.leadTimeDays, skuRow['Speed Tier']);
  return {
    sku,
    description: desc,
    capacityTb,
    protocol,
    formFactor,
    endurance: _inferDriveEndurance(desc, attrs),
    unitPriceUsd,
    priceState,
    leadTimeDays: lead.days
  };
}

function _extractDriveOptionsFromCatalog(catalogData, filters = {}) {
  if (!catalogData || !Array.isArray(catalogData.entries)) return [];
  const seen = new Map();
  for (const entry of catalogData.entries) {
    for (const skuRow of entry?.skus || []) {
      const candidate = _parseDriveRowCandidate(skuRow, entry, filters);
      if (!candidate) continue;
      const existing = seen.get(candidate.sku);
      if (!existing || (existing.unitPriceUsd === null && candidate.unitPriceUsd !== null)) {
        seen.set(candidate.sku, candidate);
      }
    }
  }
  return [...seen.values()];
}

function _computeRaidDataDrivesRequired(targetUsableTb, driveCapacityTb, raidProfile) {
  let n = raidProfile.minDrives;
  const maxLoop = 128;
  while (n <= maxLoop) {
    if (raidProfile.requireEven && n % 2 !== 0) {
      n += 1;
      continue;
    }
    const usable = raidProfile.usableFactor !== null
      ? n * driveCapacityTb * raidProfile.usableFactor
      : (n - raidProfile.parityFn(n)) * driveCapacityTb;
    if (usable + 1e-6 >= targetUsableTb) {
      const parityDrives = raidProfile.usableFactor !== null
        ? _round(n * (1 - raidProfile.usableFactor), 2)
        : raidProfile.parityFn(n);
      return { dataPlusParityDrives: n, usableTb: _round(usable, 2), parityDrives };
    }
    n += raidProfile.requireEven ? 2 : 1;
  }
  return null;
}

function _buildStorageCrossoverDetails(totalDrives, controllerPortLimit, protocol) {
  const triggered = totalDrives > controllerPortLimit;
  if (!triggered) {
    return {
      controllerCrossoverTriggered: false,
      crossoverThresholdDrives: controllerPortLimit,
      crossoverOptions: [],
      crossoverNote: null
    };
  }
  const isNvme = String(protocol || '').toUpperCase() === 'NVME';
  const crossoverOptions = isNvme
    ? ['ADD_NVME_SWITCH_OR_DIRECT_CONNECT_RISER', 'UPGRADE_TO_16PORT_TRIMODE_CONTROLLER_MR416i']
    : ['ADD_SAS_EXPANDER_CARD', 'ADD_SECOND_8PORT_CONTROLLER', 'UPGRADE_TO_16PORT_CONTROLLER_MR416i'];
  const crossoverNote = isNvme
    ? `${totalDrives} NVMe drives exceeds ${controllerPortLimit} direct/controller ports; requires secondary drive cage, PCIe lane allocation (2nd CPU/riser), or 16-port Tri-Mode controller.`
    : `${totalDrives} drives exceeds single ${controllerPortLimit}-port controller capacity; requires SAS Expander, 2nd controller, or 16-port controller (MR416i) + additional drive cage/cables.`;
  return {
    controllerCrossoverTriggered: true,
    crossoverThresholdDrives: controllerPortLimit,
    crossoverOptions,
    crossoverNote
  };
}

function _buildStorageCandidate(drv, targetUsableTb, raidProfile, hotSpares, maxBays, controllerPortLimit) {
  const solved = _computeRaidDataDrivesRequired(targetUsableTb, drv.capacityTb, raidProfile);
  if (!solved) return null;
  const totalDrives = solved.dataPlusParityDrives + hotSpares;
  if (totalDrives > maxBays) return null;

  const rawTb = _round(totalDrives * drv.capacityTb, 2);
  const hotSpareOverheadTb = _round(hotSpares * drv.capacityTb, 2);
  const parityOverheadTb = _round((solved.dataPlusParityDrives * drv.capacityTb) - solved.usableTb, 2);
  const efficiencyRatio = rawTb > 0 ? _round(solved.usableTb / rawTb, 4) : 0;
  const headroomPct = _round(((solved.usableTb - targetUsableTb) / targetUsableTb) * 100, 2);
  const unitPriceUsd = Number.isFinite(drv.unitPriceUsd) ? drv.unitPriceUsd : null;
  const totalDriveCostUsd = unitPriceUsd !== null ? _round(unitPriceUsd * totalDrives, 2) : null;
  const crossover = _buildStorageCrossoverDetails(totalDrives, controllerPortLimit, drv.protocol);

  return {
    sku: drv.sku,
    description: drv.description,
    driveCapacityTb: drv.capacityTb,
    protocol: drv.protocol || 'SAS',
    formFactor: drv.formFactor || 'SFF',
    endurance: drv.endurance || null,
    raidLevel: raidProfile.code,
    dataPlusParityDrives: solved.dataPlusParityDrives,
    hotSpares,
    totalDrives,
    rawTb,
    usableTb: solved.usableTb,
    usableTib: _round(solved.usableTb * 0.9094947, 2),
    parityOverheadTb,
    hotSpareOverheadTb,
    efficiencyRatio,
    headroomPct,
    unitPriceUsd,
    totalDriveCostUsd,
    pricingComplete: unitPriceUsd !== null,
    leadTimeDays: drv.leadTimeDays ?? null,
    ...crossover,
    classification: 'ESTIMATE'
  };
}

function _compareStorageCandidates(a, b) {
  if (a.controllerCrossoverTriggered !== b.controllerCrossoverTriggered) {
    return a.controllerCrossoverTriggered ? 1 : -1;
  }
  const costA = a.totalDriveCostUsd ?? Number.POSITIVE_INFINITY;
  const costB = b.totalDriveCostUsd ?? Number.POSITIVE_INFINITY;
  if (costA !== costB) return costA - costB;
  if (a.totalDrives !== b.totalDrives) return a.totalDrives - b.totalDrives;
  return a.sku.localeCompare(b.sku);
}

/**
 * Compute storage drive-count/drive-size options, RAID overhead, and SAS-expander/controller crossover.
 * @param {object} options
 * @returns {object}
 */
function interpolateStorageTopology(options = {}) {
  const targetUsableTb = Number(options.targetUsableTb);
  const raidProfile = _normalizeRaidLevel(options.raidLevel || 'RAID5');
  const hotSpares = Number.isInteger(options.hotSpares) && options.hotSpares >= 0 ? options.hotSpares : 0;
  const maxBays = Number.isInteger(options.maxBays) && options.maxBays > 0 ? options.maxBays : 24;
  const controllerPortLimit = Number.isInteger(options.controllerPortLimit) && options.controllerPortLimit > 0
    ? options.controllerPortLimit
    : 8;

  if (!_isPositiveFinite(targetUsableTb)) {
    return {
      targetUsableTb: null, raidLevel: raidProfile.code, hotSpares, controllerPortLimit,
      coverageGap: 'INVALID_TARGET_USABLE_TB', recommended: null, crossoverSummary: null, candidates: []
    };
  }

  const driveOptions = Array.isArray(options.driveOptions)
    ? options.driveOptions
    : _extractDriveOptionsFromCatalog(options.catalogData, {
        driveProtocol: options.driveProtocol,
        formFactor: options.formFactor
      });

  if (!driveOptions.length) {
    return {
      targetUsableTb, raidLevel: raidProfile.code, hotSpares, controllerPortLimit, catalogDriveCount: 0,
      coverageGap: 'CATALOG_COVERAGE_GAP', recommended: null, crossoverSummary: null, candidates: []
    };
  }

  const candidates = driveOptions
    .map(drv => _buildStorageCandidate(drv, targetUsableTb, raidProfile, hotSpares, maxBays, controllerPortLimit))
    .filter(Boolean)
    .sort(_compareStorageCandidates);

  const withoutCrossover = candidates.find(c => !c.controllerCrossoverTriggered) || null;
  const withCrossover = candidates.find(c => c.controllerCrossoverTriggered) || null;

  return {
    targetUsableTb,
    raidLevel: raidProfile.code,
    hotSpares,
    maxBays,
    controllerPortLimit,
    catalogDriveCount: driveOptions.length,
    coverageGap: candidates.length ? null : 'EXCEEDS_MAX_BAYS',
    recommended: candidates[0] || null,
    crossoverSummary: {
      controllerPortLimit,
      avoidingCrossoverOption: withoutCrossover ? { sku: withoutCrossover.sku, driveCapacityTb: withoutCrossover.driveCapacityTb, totalDrives: withoutCrossover.totalDrives } : null,
      triggeringCrossoverOption: withCrossover ? { sku: withCrossover.sku, driveCapacityTb: withCrossover.driveCapacityTb, totalDrives: withCrossover.totalDrives, crossoverOptions: withCrossover.crossoverOptions } : null
    },
    candidates: candidates.slice(0, options.limit || 12)
  };
}

function _computePolicyNodes(minActiveNodes, policy) {
  if (policy === 'N+1') {
    const total = Math.max(2, minActiveNodes + 1);
    return { policy, totalNodes: total, faultDomainNodes: 1, survivingNodes: total - 1 };
  }
  if (policy === '2N') {
    const total = Math.max(2, minActiveNodes * 2);
    return { policy, totalNodes: total, faultDomainNodes: minActiveNodes, survivingNodes: Math.floor(total / 2) };
  }
  return { policy: 'NONE', totalNodes: minActiveNodes, faultDomainNodes: 0, survivingNodes: minActiveNodes };
}

function _buildClusterPoint(totalNodes, policy, perNode, usableRackUnitsPerRack) {
  const survivingNodes = policy === 'N+1'
    ? Math.max(0, totalNodes - 1)
    : policy === '2N'
      ? Math.floor(totalNodes / 2)
      : totalNodes;
  const totalRackU = totalNodes * perNode.rackU;
  const peakPowerKw = _round((totalNodes * perNode.watts) / 1000, 3);
  const clusterCostUsd = perNode.costUsd !== null ? _round(totalNodes * perNode.costUsd, 2) : null;
  return {
    haPolicy: policy,
    totalNodes,
    survivingNodes,
    totalCores: totalNodes * perNode.cores,
    survivingCores: survivingNodes * perNode.cores,
    totalRamGb: totalNodes * perNode.ramGb,
    survivingRamGb: survivingNodes * perNode.ramGb,
    totalUsableTb: _round(totalNodes * perNode.usableTb, 2),
    survivingUsableTb: _round(survivingNodes * perNode.usableTb, 2),
    totalRackU,
    racks42U: Math.ceil(totalRackU / usableRackUnitsPerRack),
    peakPowerKw,
    recommendedCircuitKw: _round(peakPowerKw / 0.8, 3),
    clusterCostUsd,
    pricingComplete: perNode.costUsd !== null
  };
}

/**
 * Compute NONE, N+1, and 2N HA cluster node counts, surviving capacity, 42U rack footprint, and peak kW curves.
 * @param {object} options
 * @returns {object}
 */
function computeHaClusterScalingCurve(options = {}) {
  const perNode = {
    cores: _isPositiveFinite(options.perNodeCores) ? options.perNodeCores : 32,
    ramGb: _isPositiveFinite(options.perNodeRamGb) ? options.perNodeRamGb : 256,
    usableTb: Number.isFinite(options.perNodeUsableTb) && options.perNodeUsableTb >= 0 ? options.perNodeUsableTb : 0,
    watts: _isPositiveFinite(options.perNodeWatts) ? options.perNodeWatts : 650,
    rackU: _isPositiveFinite(options.perNodeRackU) ? options.perNodeRackU : 2,
    costUsd: Number.isFinite(options.perNodeCostUsd) && options.perNodeCostUsd >= 0 && options.pricingComplete !== false
      ? options.perNodeCostUsd
      : null
  };
  const usableRackUnitsPerRack = _isPositiveFinite(options.usableRackUnitsPerRack) ? options.usableRackUnitsPerRack : 42;
  const reqCores = _isPositiveFinite(options.requiredCores) ? options.requiredCores : perNode.cores;
  const reqRamGb = _isPositiveFinite(options.requiredRamGb) ? options.requiredRamGb : perNode.ramGb;
  const reqTb = _isPositiveFinite(options.requiredUsableTb) ? options.requiredUsableTb : 0;

  const minActiveNodes = Math.max(
    1,
    Math.ceil(reqCores / perNode.cores),
    Math.ceil(reqRamGb / perNode.ramGb),
    reqTb > 0 && perNode.usableTb > 0 ? Math.ceil(reqTb / perNode.usableTb) : 1
  );

  const policies = Array.isArray(options.haPolicies) && options.haPolicies.length
    ? options.haPolicies
    : ['NONE', 'N+1', '2N'];

  const policyRecommendations = {};
  for (const rawPolicy of policies) {
    const policy = String(rawPolicy).toUpperCase();
    const spec = _computePolicyNodes(minActiveNodes, policy);
    policyRecommendations[policy] = _buildClusterPoint(spec.totalNodes, policy, perNode, usableRackUnitsPerRack);
  }

  const discreteNodeCounts = Array.isArray(options.discreteNodeCounts) && options.discreteNodeCounts.length
    ? [...new Set(options.discreteNodeCounts.filter(n => Number.isInteger(n) && n >= 1))].sort((a, b) => a - b)
    : [...new Set([minActiveNodes, Math.max(2, minActiveNodes + 1), minActiveNodes * 2, minActiveNodes * 2 + 2, 4, 8, 16])]
        .filter(n => n >= 1)
        .sort((a, b) => a - b)
        .slice(0, 8);

  const scalingCurve = discreteNodeCounts.map(nodeCount => ({
    nodeCount,
    NONE: _buildClusterPoint(nodeCount, 'NONE', perNode, usableRackUnitsPerRack),
    'N+1': _buildClusterPoint(nodeCount, 'N+1', perNode, usableRackUnitsPerRack),
    '2N': _buildClusterPoint(nodeCount, '2N', perNode, usableRackUnitsPerRack)
  }));

  return {
    perNode,
    requirements: { requiredCores: reqCores, requiredRamGb: reqRamGb, requiredUsableTb: reqTb },
    minActiveNodes,
    usableRackUnitsPerRack,
    policyRecommendations,
    scalingCurve,
    classification: 'ESTIMATE'
  };
}

/**
 * Safely load captured HPE Ninja Online sizing telemetry JSON for Alletra MP B10000 or X10000.
 * @param {string} productId
 * @param {object} [options]
 * @returns {{ present: boolean, source: string, path: string, capturedAt: string|null, sha256: string|null, data: object|null }}
 */
function loadNinjaOnlineTelemetry(productId, options = {}) {
  const isX10k = /x10000|x10k/i.test(String(productId || ''));
  const targetPath = options.telemetryPath || (isX10k ? options.x10000Path : options.b10000Path) ||
    (isX10k ? DEFAULT_X10000_NINJA_PATH : DEFAULT_B10000_NINJA_PATH);

  try {
    if (targetPath && fs.existsSync(targetPath)) {
      const parsed = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
      return {
        present: true,
        source: parsed.source || 'HPE_NINJA_ONLINE_SIZER',
        evidenceTier: parsed.evidenceTier || 'VENDOR_SIZER_TELEMETRY',
        path: targetPath,
        capturedAt: parsed.capturedAt || null,
        sha256: parsed.sha256 || null,
        data: parsed
      };
    }
  } catch {
    // Graceful fallback when telemetry file is absent or unreadable
  }
  return {
    present: false,
    source: 'EMBEDDED_ENVELOPE_FALLBACK',
    evidenceTier: 'FALLBACK_REFERENCE_ENVELOPE',
    path: targetPath,
    capturedAt: null,
    sha256: null,
    data: null
  };
}

function _extractB10000NodeEnvelopes(telemetryData) {
  const rawNodes = Array.isArray(telemetryData?.catalog?.nodes)
    ? telemetryData.catalog.nodes.filter(n => !n.isTAA && !n.isDHCI && n.nodeType === 'Controller' && n.maxTotalSystemDrives > 0)
    : [];
  const source = rawNodes.length ? rawNodes : FALLBACK_B10000_NODES;
  return source.map(n => ({
    model: n.model,
    sku: n.partNumber,
    cpuCores: n.cpuCores,
    topology: n.cluster ? 'SWITCHED' : 'SWITCHLESS',
    baseSku: n.cluster ? 'S1R06A' : 'S0B84A',
    maxInternalDrives: n.maxDrives,
    maxTotalSystemDrives: n.maxTotalSystemDrives,
    minJbofs: n.minJBOF,
    maxJbofs: n.maxJBOF,
    requiresBackendSwitches: Boolean(n.cluster),
    powerTransactionalWatts: n.powerTransactional_w || null
  }));
}

function _extractB10000DriveTiersTb(telemetryData) {
  const drives = Array.isArray(telemetryData?.catalog?.drives) ? telemetryData.catalog.drives : [];
  const uniqueTb = [...new Set(drives.map(d => _round(Number(d.capacityGB) / 1000, 2)).filter(_isPositiveFinite))].sort((a, b) => a - b);
  return uniqueTb.length ? uniqueTb : [...FALLBACK_B10000_DRIVE_TB];
}

function _interpolateB10000Envelope(options, telemetry) {
  const nodeEnvelopes = _extractB10000NodeEnvelopes(telemetry.data);
  const driveTiersTb = _extractB10000DriveTiersTb(telemetry.data);
  const driveCapacityTb = _isPositiveFinite(options.driveCapacityTb) ? options.driveCapacityTb : 15.36;
  const dataReductionRatio = _isPositiveFinite(options.dataReductionRatio) ? options.dataReductionRatio : 1.0;

  let estimatedDriveCount = Number.isInteger(options.targetDriveCount) && options.targetDriveCount > 0
    ? options.targetDriveCount
    : null;
  if (estimatedDriveCount === null && _isPositiveFinite(options.targetUsableTb)) {
    const effectiveRawTb = options.targetUsableTb / (dataReductionRatio * 0.8);
    estimatedDriveCount = Math.max(8, Math.ceil(effectiveRawTb / driveCapacityTb));
  }
  const driveCount = estimatedDriveCount ?? 24;

  const isMultiArrayRequired = driveCount > 384;
  const requiresSwitched = driveCount > 72 || String(options.preferredTopology || '').toUpperCase() === 'SWITCHED';
  const recommendedTopology = isMultiArrayRequired
    ? 'MULTI_ARRAY_SWITCHED_B10200'
    : requiresSwitched ? 'SWITCHED_B10200' : 'SWITCHLESS_B10100';
  const baseSku = requiresSwitched ? 'S1R06A' : 'S0B84A';
  const jbofCount = requiresSwitched
    ? Math.max(1, Math.min(8, Math.ceil(driveCount / 24)))
    : Math.max(0, Math.min(3, Math.ceil(Math.max(0, driveCount - 24) / 24)));
  const internalDrives = requiresSwitched ? 0 : Math.min(24, driveCount);
  const eligibleNodes = nodeEnvelopes.filter(n =>
    (requiresSwitched ? n.topology === 'SWITCHED' : n.topology === 'SWITCHLESS') &&
    n.maxTotalSystemDrives >= Math.min(driveCount, 384)
  );
  const rackUnitsEstimate = (requiresSwitched ? 4 : 2) + (jbofCount * 2) + (requiresSwitched ? 2 : 0);

  return {
    product: 'Alletra_MP_B10000',
    telemetryPresent: telemetry.present,
    telemetrySource: telemetry.source,
    capturedAt: telemetry.capturedAt,
    estimatedDriveCount: driveCount,
    assumedDriveCapacityTb: driveCapacityTb,
    assumedDataReductionRatio: dataReductionRatio,
    recommendedTopology,
    recommendedBaseSku: baseSku,
    switchlessToSwitchedCrossover: {
      switchlessInternalLimitDrives: 24,
      switchlessMaxWithJbofsDrives: 72,
      switchlessJbofRange: [0, 3],
      switchedMaxDrives: 384,
      switchedJbofRange: [1, 8],
      crossoverTriggered: requiresSwitched,
      multiArrayRequired: isMultiArrayRequired,
      requiresBackendNvmeOfSwitches: requiresSwitched,
      mutuallyExclusiveNote: 'B10100 (S0B84A) switchless and B10200 (S1R06A) switched are mutually exclusive architectures and cannot be mixed in one array.'
    },
    internalChassisDrives: internalDrives,
    requiredJbofs: jbofCount,
    jbofSku: 'S1J10A',
    estimatedRackUnits: rackUnitsEstimate,
    eligibleControllerNodes: eligibleNodes,
    availableDriveCapacitiesTb: driveTiersTb,
    nodeEnvelopes,
    classification: 'ESTIMATE',
    requiresNinjaOnlineOcaJsonExport: true,
    portalValidationStatus: 'PORTAL_VALIDATION_PENDING',
    mandatoryWorkflowDisclosure: ALLETRA_MP_MANDATORY_DISCLOSURE
  };
}

function _lookupX10000MediaEnvelope(grid, mediaClass, options) {
  if (!grid || !grid.series) {
    return { mediaClass, available: false, matchedPoint: null, maxEnvelope: null };
  }
  const workloadKey = options.workloadProfile && grid.series[options.workloadProfile]
    ? options.workloadProfile
    : Object.keys(grid.series)[0];
  const points = Array.isArray(grid.series[workloadKey]) ? grid.series[workloadKey] : [];
  const targetNodes = Number.isInteger(options.targetNodes) ? options.targetNodes : null;
  const targetJbofs = Number.isInteger(options.targetJbofs) ? options.targetJbofs : null;
  const targetMbps = _isPositiveFinite(options.targetThroughputMbps) ? options.targetThroughputMbps : null;
  const targetIops = _isPositiveFinite(options.targetIops) ? options.targetIops : null;

  let matched = null;
  if (targetNodes !== null && targetJbofs !== null) {
    matched = points.find(p => p.nodes === targetNodes && p.jboFs === targetJbofs) || null;
  } else if (targetMbps !== null || targetIops !== null) {
    matched = points
      .filter(p => (targetMbps === null || p.mbps >= targetMbps) && (targetIops === null || p.iops >= targetIops))
      .sort((a, b) => (a.nodes + a.jboFs) - (b.nodes + b.jboFs) || a.nodes - b.nodes)[0] || null;
  } else {
    matched = points[0] || null;
  }

  const maxPoint = points.reduce((best, p) => (!best || p.mbps > best.mbps ? p : best), null);
  return {
    mediaClass,
    available: true,
    gridVersion: grid.version || null,
    workloadProfile: workloadKey,
    availableWorkloads: Object.keys(grid.series),
    nodeRange: grid.nodes || [],
    jbofRange: grid.jboFs || [],
    matchedPoint: matched,
    maxEnvelope: maxPoint
  };
}

function _extractX10000DriveCatalogSummary(telemetryData) {
  const allSkus = Array.isArray(telemetryData?.catalog?.skuCatalog) ? telemetryData.catalog.skuCatalog : [];
  const qlc = allSkus.filter(s => /\bQLC\b/i.test(s.description || ''));
  const tlc = (telemetryData?.catalog?.drives || []).filter(s => !/\bQLC\b/i.test(s.description || ''));
  return {
    tlcDriveSkus: tlc.map(d => ({ sku: d.partNumber, description: d.description })),
    qlcDriveSkus: qlc.map(d => ({ sku: d.partNumber, description: d.description }))
  };
}

function _interpolateX10000Envelope(options, telemetry) {
  const grids = telemetry.data?.catalog?.performanceGrids || {};
  const maxBounds = telemetry.data?.catalog?.maxBounds || { nodes: 8, jbofs: 12 };
  const tlc = _lookupX10000MediaEnvelope(grids.TLC, 'TLC', options);
  const qlc = _lookupX10000MediaEnvelope(grids.QLC, 'QLC', options);
  const drives = _extractX10000DriveCatalogSummary(telemetry.data);
  const preferredMedia = String(options.mediaClass || 'BOTH').toUpperCase();

  return {
    product: 'Alletra_MP_X10000',
    telemetryPresent: telemetry.present,
    telemetrySource: telemetry.source,
    capturedAt: telemetry.capturedAt,
    baseSku: 'S3L12A',
    maxBounds,
    preferredMedia,
    mediaEnvelopes: { TLC: tlc, QLC: qlc },
    drives,
    tlcVsQlcComparison: tlc.matchedPoint && qlc.matchedPoint ? {
      tlcMbps: tlc.matchedPoint.mbps,
      qlcMbps: qlc.matchedPoint.mbps,
      throughputRatioTlcOverQlc: qlc.matchedPoint.mbps > 0 ? _round(tlc.matchedPoint.mbps / qlc.matchedPoint.mbps, 2) : null,
      tlcRdmaMbps: tlc.matchedPoint.mbps_RDMA ?? null,
      qlcRdmaMbps: qlc.matchedPoint.mbps_RDMA ?? null,
      qlcHigherDensityNote: 'QLC supports up to 61.44TB NVMe SSDs (S4P40A) for capacity-optimized object storage; TLC delivers higher sustained PUT throughput.'
    } : null,
    classification: 'ESTIMATE',
    requiresNinjaOnlineOcaJsonExport: true,
    portalValidationStatus: 'PORTAL_VALIDATION_PENDING',
    mandatoryWorkflowDisclosure: ALLETRA_MP_MANDATORY_DISCLOSURE
  };
}

/**
 * Interpolate Alletra MP B10000 switchless-to-switched crossover or X10000 TLC/QLC envelope.
 * @param {object} options
 * @returns {object}
 */
function interpolateAlletraMpEnvelope(options = {}) {
  const product = /x10000|x10k/i.test(String(options.product || '')) ? 'Alletra_MP_X10000' : 'Alletra_MP_B10000';
  const telemetry = loadNinjaOnlineTelemetry(product, options);
  return product === 'Alletra_MP_X10000'
    ? _interpolateX10000Envelope(options, telemetry)
    : _interpolateB10000Envelope(options, telemetry);
}

/**
 * Compute normalized efficiency metrics while strictly preserving null pricing.
 * @param {object} metrics
 * @returns {object}
 */
function computeNormalizedEfficiencyMetrics(metrics = {}) {
  const pricingComplete = metrics.pricingComplete !== false && Number.isFinite(metrics.capexListUsd) && metrics.capexListUsd >= 0;
  const capex = pricingComplete ? metrics.capexListUsd : null;
  const cores = _isPositiveFinite(metrics.totalCores) ? metrics.totalCores : null;
  const ramGb = _isPositiveFinite(metrics.totalRamGb) ? metrics.totalRamGb : null;
  const usableTb = _isPositiveFinite(metrics.usableTb) ? metrics.usableTb : null;
  const peakWatts = _isPositiveFinite(metrics.peakWatts) ? metrics.peakWatts : null;
  const rackUnits = _isPositiveFinite(metrics.rackUnits) ? metrics.rackUnits : null;

  return {
    capexListUsd: capex,
    pricingComplete,
    costPerCoreUsd: capex !== null && cores !== null ? _round(capex / cores, 2) : null,
    costPerGbRamUsd: capex !== null && ramGb !== null ? _round(capex / ramGb, 2) : null,
    costPerUsableTbUsd: capex !== null && usableTb !== null ? _round(capex / usableTb, 2) : null,
    wattsPerCore: peakWatts !== null && cores !== null ? _round(peakWatts / cores, 2) : null,
    coresPerU: cores !== null && rackUnits !== null ? _round(cores / rackUnits, 2) : null,
    gbRamPerU: ramGb !== null && rackUnits !== null ? _round(ramGb / rackUnits, 2) : null,
    classification: 'ESTIMATE',
    substitutesForDatedCatalogPrice: false
  };
}

function _safeDelta(fromVal, toVal) {
  if (!Number.isFinite(fromVal) || !Number.isFinite(toVal)) return { delta: null, deltaPct: null };
  const delta = _round(toVal - fromVal, 2);
  const deltaPct = fromVal !== 0 ? _round(((toVal - fromVal) / fromVal) * 100, 2) : null;
  return { delta, deltaPct };
}

/**
 * Compute cross-generation or cross-platform normalized deltas (e.g. Gen11 -> Gen12).
 * @param {object} fromSolution
 * @param {object} toSolution
 * @returns {object}
 */
function computeCrossGenerationDeltas(fromSolution = {}, toSolution = {}) {
  const fromCapex = fromSolution.pricingComplete !== false && Number.isFinite(fromSolution.capexListUsd)
    ? fromSolution.capexListUsd : null;
  const toCapex = toSolution.pricingComplete !== false && Number.isFinite(toSolution.capexListUsd)
    ? toSolution.capexListUsd : null;

  return {
    fromPlatform: fromSolution.platform || fromSolution.chassis || 'BASELINE',
    toPlatform: toSolution.platform || toSolution.chassis || 'TARGET',
    fromGeneration: fromSolution.generation || null,
    toGeneration: toSolution.generation || null,
    capexListUsd: _safeDelta(fromCapex, toCapex),
    costPerCoreUsd: _safeDelta(fromSolution.costPerCoreUsd, toSolution.costPerCoreUsd),
    costPerGbRamUsd: _safeDelta(fromSolution.costPerGbRamUsd, toSolution.costPerGbRamUsd),
    costPerUsableTbUsd: _safeDelta(fromSolution.costPerUsableTbUsd, toSolution.costPerUsableTbUsd),
    wattsPerCore: _safeDelta(fromSolution.wattsPerCore, toSolution.wattsPerCore),
    coresPerU: _safeDelta(fromSolution.coresPerU, toSolution.coresPerU),
    peakWatts: _safeDelta(fromSolution.peakWatts, toSolution.peakWatts),
    rackUnits: _safeDelta(fromSolution.rackUnits, toSolution.rackUnits),
    bothPricesComplete: fromCapex !== null && toCapex !== null,
    classification: 'ESTIMATE',
    substitutesForDatedCatalogPrice: false
  };
}

function _normalizePriceHistorySeries(priceHistoryInput, options = {}) {
  let rawSeries = null;
  if (Array.isArray(priceHistoryInput)) {
    rawSeries = priceHistoryInput;
  } else if (priceHistoryInput && typeof priceHistoryInput === 'object' && options.sku) {
    rawSeries = priceHistoryInput[cleanBaseSKU(options.sku)] || priceHistoryInput[options.sku] || null;
  } else if (options.catalogDir && options.sku) {
    const filePath = path.join(options.catalogDir, 'history', 'price_history.json');
    if (fs.existsSync(filePath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        rawSeries = parsed[cleanBaseSKU(options.sku)] || parsed[options.sku] || null;
      } catch {
        rawSeries = null;
      }
    }
  }
  if (!Array.isArray(rawSeries)) return [];

  const byDate = new Map();
  for (const pt of rawSeries) {
    if (!pt || typeof pt !== 'object') continue;
    const ms = Date.parse(pt.date);
    const price = typeof pt.price === 'number' ? pt.price : Number(pt.price);
    if (!Number.isFinite(ms) || !Number.isFinite(price) || price <= 0) continue;
    byDate.set(String(pt.date).slice(0, 10), { date: String(pt.date).slice(0, 10), ms, price });
  }
  return [...byDate.values()].sort((a, b) => a.ms - b.ms);
}

/**
 * Compute bounded historical price-trend slope & volatility from multi-point price_history.json.
 * Strictly tagged `classification: 'ESTIMATE'` and never substitutes for DATED_CATALOG_PRICE.
 * @param {Array|object|null} priceHistoryInput
 * @param {object} [options]
 * @returns {object}
 */
function analyzePriceTrendAnalytics(priceHistoryInput, options = {}) {
  const maxAnnualizedAbsPct = _isPositiveFinite(options.maxAnnualizedAbsPct) ? options.maxAnnualizedAbsPct : 200;
  const series = _normalizePriceHistorySeries(priceHistoryInput, options);

  if (series.length < 2) {
    const single = series[0] || null;
    return {
      sku: options.sku ? cleanBaseSKU(options.sku) : null,
      sufficientData: false,
      observationCount: series.length,
      firstDatedCatalogPriceUsd: single ? single.price : null,
      latestDatedCatalogPriceUsd: single ? single.price : null,
      firstDate: single ? single.date : null,
      latestDate: single ? single.date : null,
      slopeUsdPerDay: null,
      slopeUsdPer30Days: null,
      annualizedTrendPct: null,
      isBounded: true,
      volatilityPct: null,
      direction: 'INSUFFICIENT_HISTORY',
      classification: 'ESTIMATE',
      evidenceSeparation: 'ESTIMATE_NOT_DATED_CATALOG_PRICE',
      substitutesForDatedCatalogPrice: false
    };
  }

  const t0 = series[0].ms;
  const xs = series.map(p => (p.ms - t0) / 86400000);
  const ys = series.map(p => p.price);
  const n = ys.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let cov = 0;
  let varX = 0;
  let varY = 0;
  for (let i = 0; i < n; i++) {
    cov += (xs[i] - meanX) * (ys[i] - meanY);
    varX += (xs[i] - meanX) ** 2;
    varY += (ys[i] - meanY) ** 2;
  }

  const slopeUsdPerDay = varX > 0 ? cov / varX : 0;
  const rawAnnualizedPct = meanY > 0 ? ((slopeUsdPerDay * 365) / meanY) * 100 : 0;
  const boundedAnnualizedPct = Math.max(-maxAnnualizedAbsPct, Math.min(maxAnnualizedAbsPct, rawAnnualizedPct));
  const stdDev = Math.sqrt(varY / (n - 1));
  const volatilityPct = meanY > 0 ? (stdDev / meanY) * 100 : 0;
  const first = series[0];
  const latest = series[n - 1];
  const totalDeltaUsd = _round(latest.price - first.price, 2);
  const totalDeltaPct = first.price > 0 ? _round((totalDeltaUsd / first.price) * 100, 2) : null;
  const direction = Math.abs(totalDeltaUsd) < 0.01 ? 'FLAT' : totalDeltaUsd > 0 ? 'UPWARD' : 'DOWNWARD';

  return {
    sku: options.sku ? cleanBaseSKU(options.sku) : null,
    sufficientData: true,
    observationCount: n,
    spanDays: _round(xs[n - 1], 1),
    firstDate: first.date,
    latestDate: latest.date,
    firstDatedCatalogPriceUsd: first.price,
    latestDatedCatalogPriceUsd: latest.price,
    minObservedPriceUsd: Math.min(...ys),
    maxObservedPriceUsd: Math.max(...ys),
    totalDeltaUsd,
    totalDeltaPct,
    slopeUsdPerDay: _round(slopeUsdPerDay, 4),
    slopeUsdPer30Days: _round(slopeUsdPerDay * 30, 2),
    annualizedTrendPct: _round(boundedAnnualizedPct, 2),
    wasClampedToBounds: Math.abs(rawAnnualizedPct) > maxAnnualizedAbsPct,
    isBounded: true,
    volatilityPct: _round(volatilityPct, 2),
    direction,
    classification: 'ESTIMATE',
    evidenceSeparation: 'ESTIMATE_NOT_DATED_CATALOG_PRICE',
    substitutesForDatedCatalogPrice: false
  };
}

module.exports = {
  ALLETRA_MP_MANDATORY_DISCLOSURE,
  interpolateMemoryTopology,
  interpolateStorageTopology,
  computeHaClusterScalingCurve,
  loadNinjaOnlineTelemetry,
  interpolateAlletraMpEnvelope,
  computeNormalizedEfficiencyMetrics,
  computeCrossGenerationDeltas,
  analyzePriceTrendAnalytics
};
