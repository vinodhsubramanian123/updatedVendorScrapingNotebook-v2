'use strict';
/**
 * scripts/lib/rules/hardware_envelope_solver.js
 *
 * Unified Hardware Capability Envelope & Category Min/Max Math Solver.
 * Computes exact, provable min/max bounds and valid hardware combinations across:
 * - CPUs (socket counts, air vs DLC TDP limits, heatsink/fan requirements)
 * - OCP & PCIe Risers (base vs electrically active slots with cable kits, x16/x8 lanes)
 * - GPUs (single-wide vs double-wide, aux power cables, PSUs, ambient/thermal gates)
 * - Memory (6/8/12-channel width, 1DPC/2DPC balanced counts, max GB/TB, speed derating)
 * - Storage (front/mid/rear bays, controller direct 8/16/32-port vs expander, Alletra B10100/B10200)
 * - Power & Chassis (N+1/N+N redundant capacity, high-line utility derating, Synergy 6/12 PSU)
 */

const fs = require('fs');
const path = require('path');
const { getPlatformProfile, PLATFORM_PROFILES } = require('./platform_profiles.js');
const { GPU_SPEC_TABLE, lookupGpuQuickSpecs } = require('../catalog/gpu_specs_lookup.js');

const DEFAULT_CHANNEL_VALID_COUNTS = Object.freeze({
  6: [1, 2, 4, 6, 12],
  8: [1, 2, 4, 6, 8, 12, 16],
  12: [1, 2, 4, 6, 8, 10, 12, 24]
});

function _loadPlatformCatalogAndRules(platformId, catalogData = null, rulesData = null) {
  let resolvedCatalog = catalogData;
  let resolvedRules = rulesData;
  if (resolvedCatalog && resolvedRules) return { catalogData: resolvedCatalog, rulesData: resolvedRules };

  const cleanTarget = String(platformId || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const outputsDir = path.resolve(__dirname, '../../../outputs');
  if (!cleanTarget || !fs.existsSync(outputsDir)) {
    return { catalogData: resolvedCatalog || null, rulesData: resolvedRules || null };
  }
  const dirs = fs.readdirSync(outputsDir, { withFileTypes: true }).filter(d => d.isDirectory());
  const match = dirs.find(d => d.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').includes(cleanTarget));
  if (!match) return { catalogData: resolvedCatalog || null, rulesData: resolvedRules || null };

  const dirPath = path.join(outputsDir, match.name);
  const files = fs.readdirSync(dirPath);
  if (!resolvedCatalog) {
    const catFile = files.find(f => f.endsWith('_Catalog.json') && !f.endsWith('_Rules.json'));
    if (catFile) resolvedCatalog = JSON.parse(fs.readFileSync(path.join(dirPath, catFile), 'utf8'));
  }
  if (!resolvedRules) {
    const rulesFile = files.find(f => f.endsWith('_Catalog_Rules.json'));
    if (rulesFile) resolvedRules = JSON.parse(fs.readFileSync(path.join(dirPath, rulesFile), 'utf8'));
  }
  return { catalogData: resolvedCatalog || null, rulesData: resolvedRules || null };
}

function _inferProfileFromId(platformId, catalogData) {
  const exact = getPlatformProfile(platformId) || getPlatformProfile(catalogData?.metadata?.productId);
  if (exact) return exact;

  const key = String(platformId || catalogData?.metadata?.productId || '').toUpperCase();
  for (const [k, v] of Object.entries(PLATFORM_PROFILES)) {
    const tail = k.replace(/^HPE_(PROLIANT_|COMPUTE_|STOREFABRIC_|STOREEVER_|ALLETRA_MP_)?/, '');
    if (key.includes(tail)) return v;
  }
  return {
    domain: 'server',
    formFactor: /dl360|dl325/i.test(key) ? '1U Rack' : (/dl580|dl380a/i.test(key) ? '4U Rack' : '2U Rack'),
    maxSockets: /dl145|dl325|dl345/i.test(key) ? 1 : (/dl580/i.test(key) ? 4 : 2)
  };
}

function _safePositiveInt(val) {
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

function computeCategoryBounds(catalogData, categoryKey) {
  const entries = Array.isArray(catalogData?.entries) ? catalogData.entries : [];
  const subcats = Array.isArray(catalogData?.subcategories) ? catalogData.subcategories : [];
  const needle = String(categoryKey || '').trim().toLowerCase();

  const matchingSubcats = subcats.filter(s => {
    const blob = `${s.parentCategory || ''} ${s.subCategory || ''} ${s.name || ''}`.toLowerCase();
    return !needle || blob.includes(needle);
  });
  const matchingEntries = entries.filter(e => {
    const blob = `${e.parentCategory || ''} ${e.subCategory || ''} ${e.skuData?.Description || ''}`.toLowerCase();
    return !needle || blob.includes(needle);
  });

  const minVals = [];
  const maxVals = [];
  for (const s of [...matchingSubcats, ...matchingEntries]) {
    const mn = Number(s.minQty ?? s.skuData?.minQty);
    const mx = Number(s.maxQty ?? s.skuData?.maxQty);
    if (Number.isFinite(mn) && mn >= 0) minVals.push(mn);
    if (Number.isFinite(mx) && mx > 0) maxVals.push(mx);
  }

  return {
    categoryKey: categoryKey || 'ALL',
    matchedSubcategories: matchingSubcats.length,
    matchedSkus: matchingEntries.length,
    minQty: minVals.length > 0 ? Math.min(...minVals) : 0,
    maxQty: maxVals.length > 0 ? Math.max(...maxVals) : null,
    subcategories: matchingSubcats.slice(0, 25).map(s => ({
      parentCategory: s.parentCategory || null,
      subCategory: s.subCategory || s.name || null,
      minQty: Number.isFinite(Number(s.minQty)) ? Number(s.minQty) : 0,
      maxQty: _safePositiveInt(s.maxQty)
    }))
  };
}

function _resolveCpuDefaults(profile, platformId, catalogData) {
  const key = String(platformId || catalogData?.metadata?.productId || '').toUpperCase();
  const maxSockets = _safePositiveInt(catalogData?.metadata?.maxSockets) ??
    profile.maxSockets ??
    (/DL145|DL325|DL345/.test(key) ? 1 : (/DL580/.test(key) ? 4 : 2));
  const validSocketCounts = maxSockets === 4 ? [2, 4] : (maxSockets === 1 ? [1] : [1, 2]);

  const cpuEntries = (catalogData?.entries || []).filter(e => /processor/i.test(e.parentCategory || e.subCategory || ''));
  const tdps = cpuEntries
    .map(e => String(e.skuData?.Description || '').match(/(\d{2,3})\s*W\b/i))
    .filter(Boolean)
    .map(m => parseInt(m[1], 10))
    .filter(w => w >= 50 && w <= 700);
  const catalogMaxTdp = tdps.length > 0 ? Math.max(...tdps) : null;

  return {
    minSockets: validSocketCounts[0],
    maxSockets,
    validSocketCounts,
    maxAirCooledTdpWatts: 350,
    dlcRequiredAboveWatts: 350,
    maxObservedCatalogTdpWatts: catalogMaxTdp
  };
}

function _buildPcieSlotScenarios(key, maxSockets, cpuCount) {
  const isDl145 = /DL145/.test(key);
  const isDl325 = /DL325/.test(key);
  const isDl360 = /DL360/.test(key);
  const isDl380a = /DL380A/.test(key);
  const isDl580 = /DL580/.test(key);
  const isSynergy = /SYNERGY/.test(key);

  if (isSynergy) {
    return {
      minOcpSlots: 0, maxOcpSlots: 0,
      ocpNotes: 'Synergy blades use Rear Mezzanine slots (up to 3 per SY480), not OCP 3.0.',
      baseMechanicalPcieSlots: 0,
      maxMechanicalPcieSlots: 3,
      maxActivePcieSlots: 3,
      maxX16Slots: 3,
      riserMatrix: [{ cpus: cpuCount, risers: '3 Mezzanine Cards', mechanicalSlots: 3, activeSlots: 3, x16Slots: 3, cableKitsRequired: false }]
    };
  }
  if (isDl145 || isDl325) {
    const slots = isDl145 ? 3 : 2;
    return {
      minOcpSlots: 0, maxOcpSlots: 1,
      ocpNotes: 'Single-socket edge/1U chassis provides 1 OCP 3.0 slot (CPU1 routed).',
      baseMechanicalPcieSlots: isDl145 ? 1 : 2,
      maxMechanicalPcieSlots: slots,
      maxActivePcieSlots: slots,
      maxX16Slots: slots,
      riserMatrix: [{ cpus: 1, risers: 'Primary Riser', mechanicalSlots: slots, activeSlots: slots, x16Slots: slots, cableKitsRequired: false }]
    };
  }
  if (isDl360) {
    const active = cpuCount >= 2 ? 3 : 2;
    const ocpMax = cpuCount >= 2 ? 2 : 1;
    return {
      minOcpSlots: 0, maxOcpSlots: ocpMax,
      ocpNotes: ocpMax === 2 ? '2nd OCP 3.0 slot requires CPU2 + CPU2-to-OCP2 enablement kit (no dual CPU1+CPU2 OCP cables).' : '1st OCP 3.0 slot active with 1 CPU; 2nd requires 2nd CPU.',
      baseMechanicalPcieSlots: 2,
      maxMechanicalPcieSlots: 3,
      maxActivePcieSlots: active,
      maxX16Slots: active,
      riserMatrix: [
        { cpus: 1, risers: 'Primary x16/x16', mechanicalSlots: 2, activeSlots: 2, x16Slots: 2, cableKitsRequired: false },
        ...(maxSockets >= 2 ? [{ cpus: 2, risers: 'Primary + Secondary 1U Riser', mechanicalSlots: 3, activeSlots: 3, x16Slots: 3, cableKitsRequired: false }] : [])
      ]
    };
  }
  if (isDl380a) {
    const active = cpuCount >= 2 ? 6 : 3;
    return {
      minOcpSlots: 0, maxOcpSlots: cpuCount >= 2 ? 2 : 1,
      ocpNotes: 'Up to 2 OCP 3.0 slots on 2P; front-bay GPUs use SXM/EDSFF/FHFL risers separately.',
      baseMechanicalPcieSlots: 3,
      maxMechanicalPcieSlots: 6,
      maxActivePcieSlots: active,
      maxX16Slots: cpuCount >= 2 ? 4 : 2,
      riserMatrix: [
        { cpus: 1, risers: 'Base 3x Rear Slots', mechanicalSlots: 3, activeSlots: 3, x16Slots: 2, cableKitsRequired: false },
        { cpus: 2, risers: 'Base + Rear Secondary', mechanicalSlots: 6, activeSlots: 6, x16Slots: 4, cableKitsRequired: true }
      ]
    };
  }
  if (isDl580) {
    const maxSlots = cpuCount >= 4 ? 16 : 8;
    return {
      minOcpSlots: 0, maxOcpSlots: 2,
      ocpNotes: 'Supports up to 2 OCP 3.0 slots across processor I/O complex.',
      baseMechanicalPcieSlots: 8,
      maxMechanicalPcieSlots: maxSlots,
      maxActivePcieSlots: maxSlots,
      maxX16Slots: Math.floor(maxSlots / 2),
      riserMatrix: [
        { cpus: 2, risers: '2P Riser Banks', mechanicalSlots: 8, activeSlots: 8, x16Slots: 4, cableKitsRequired: false },
        { cpus: 4, risers: '4P Full Riser Expansion', mechanicalSlots: 16, activeSlots: 16, x16Slots: 8, cableKitsRequired: true }
      ]
    };
  }
  // Standard 2U 2P ProLiant (DL380 / DL385 Gen11 / Gen12)
  const effectiveCpus = Math.min(maxSockets, cpuCount || maxSockets);
  const maxActive = effectiveCpus >= 2 ? 8 : 3;
  return {
    minOcpSlots: 0,
    maxOcpSlots: effectiveCpus >= 2 ? 2 : 1,
    ocpNotes: 'Slot 1 tied to CPU1; Slot 2 requires CPU2 + enablement kit (CPU1-OCP2 and CPU2-OCP2 kits are mutually exclusive).',
    baseMechanicalPcieSlots: 3,
    maxMechanicalPcieSlots: 8,
    maxActivePcieSlots: maxActive,
    maxX16Slots: effectiveCpus >= 2 ? 5 : 2,
    riserMatrix: [
      { cpus: 1, risers: 'Primary Riser (2 active without cable kit, 3 active with Primary Cable Kit)', mechanicalSlots: 3, activeSlots: 3, x16Slots: 2, cableKitsRequired: true },
      { cpus: 2, risers: 'Primary (3, +cable) + Secondary (3, +cable) + Tertiary (2)', mechanicalSlots: 8, activeSlots: 8, x16Slots: 5, cableKitsRequired: true }
    ]
  };
}

function solveMaxPcieAndOcpTopology(platformId, catalogData = null, options = {}) {
  const { catalogData: loadedCat } = _loadPlatformCatalogAndRules(platformId, catalogData, options.rulesData);
  const profile = _inferProfileFromId(platformId, loadedCat);
  const key = String(platformId || loadedCat?.metadata?.productId || '').toUpperCase();
  const cpuInfo = _resolveCpuDefaults(profile, platformId, loadedCat);
  const requestedCpus = _safePositiveInt(options.cpuCount) ?? cpuInfo.maxSockets;
  const pcie = _buildPcieSlotScenarios(key, cpuInfo.maxSockets, requestedCpus);

  const ocpBounds = computeCategoryBounds(loadedCat, 'ocp');
  const maxOcpFromCatalog = ocpBounds.maxQty !== null && /ocp/i.test(JSON.stringify(ocpBounds.subcategories))
    ? Math.min(pcie.maxOcpSlots, ocpBounds.maxQty)
    : pcie.maxOcpSlots;

  return {
    platformId: platformId || loadedCat?.metadata?.productId || 'UNKNOWN',
    cpuCountConsidered: requestedCpus,
    maxSockets: cpuInfo.maxSockets,
    ocp: {
      minSlots: pcie.minOcpSlots,
      maxSlots: Math.max(pcie.minOcpSlots, maxOcpFromCatalog),
      rules: pcie.ocpNotes
    },
    pcie: {
      baseMechanicalSlots: pcie.baseMechanicalPcieSlots,
      maxMechanicalSlots: pcie.maxMechanicalPcieSlots,
      maxElectricallyActiveSlots: pcie.maxActivePcieSlots,
      maxX16Slots: pcie.maxX16Slots,
      riserCombinations: pcie.riserMatrix
    }
  };
}

function solveMaxGpuTopology(platformId, catalogData = null, options = {}) {
  const { catalogData: loadedCat, rulesData } = _loadPlatformCatalogAndRules(platformId, catalogData, options.rulesData);
  const key = String(platformId || loadedCat?.metadata?.productId || '').toUpperCase();
  const gpuSpec = options.gpuModel ? lookupGpuQuickSpecs(options.gpuModel) : null;
  const gpuWidth = options.gpuWidth || (gpuSpec?.formFactor?.toLowerCase().includes('single') ? 'SW' : 'DW');

  let maxSingleWide = 3;
  let maxDoubleWide = 1;
  let requiresAuxiliaryPowerCables = true;
  let minPsuCountForMaxGpu = 2;

  if (/DL380A/.test(key)) {
    maxSingleWide = 16;
    maxDoubleWide = 8;
    minPsuCountForMaxGpu = 4;
  } else if (/DL380|DL385/.test(key)) {
    maxSingleWide = 8;
    maxDoubleWide = 3;
    minPsuCountForMaxGpu = 2;
  } else if (/DL360/.test(key)) {
    maxSingleWide = 3;
    maxDoubleWide = 0;
  } else if (/DL145|DL325|DL345/.test(key)) {
    maxSingleWide = /DL345/.test(key) ? 4 : 2;
    maxDoubleWide = /DL345/.test(key) ? 2 : 0;
  } else if (/DL580/.test(key)) {
    maxSingleWide = 8;
    maxDoubleWide = 4;
    minPsuCountForMaxGpu = 4;
  } else if (/SYNERGY/.test(key)) {
    maxSingleWide = 2;
    maxDoubleWide = 1;
    requiresAuxiliaryPowerCables = false;
  }

  const gpuBounds = computeCategoryBounds(loadedCat, 'gpu');
  const ambientGates = (rulesData?.rules || []).filter(r => r.conditionType === 'AMBIENT_GATE' || r.conditionType === 'TDP_GATE');

  return {
    platformId: platformId || loadedCat?.metadata?.productId || 'UNKNOWN',
    targetGpuWidth: gpuWidth,
    targetGpuSpec: gpuSpec,
    minGpus: 0,
    maxSingleWideGpus: maxSingleWide,
    maxDoubleWideGpus: maxDoubleWide,
    maxRecommendedForTarget: gpuWidth === 'SW' ? maxSingleWide : maxDoubleWide,
    catalogReportedMaxQty: gpuBounds.maxQty,
    requiresAuxiliaryPowerCables,
    minPsuCountForMaxGpu,
    requiresHighLine220vAboveTdpWatts: 800,
    thermalAmbientGatesCount: ambientGates.length,
    knownGpuSpecsCatalogSize: Object.keys(GPU_SPEC_TABLE).length
  };
}

function solveMemoryEnvelope(platformId, catalogData = null, options = {}) {
  const { catalogData: loadedCat } = _loadPlatformCatalogAndRules(platformId, catalogData, options.rulesData);
  const profile = _inferProfileFromId(platformId, loadedCat);
  const key = String(platformId || loadedCat?.metadata?.productId || '').toUpperCase();
  const cpuInfo = _resolveCpuDefaults(profile, platformId, loadedCat);
  const cpuCount = Math.min(cpuInfo.maxSockets, _safePositiveInt(options.cpuCount) ?? cpuInfo.maxSockets);

  const memArch = profile.memoryArchitecture || {};
  const channelsPerSocket = _safePositiveInt(loadedCat?.metadata?.channelsPerSocket) ??
    memArch.channelsPerSocket ??
    (/DL145/.test(key) ? 6 : (/DL385|DL325|DL345/.test(key) ? 12 : 8));
  const maxDpc = memArch.dimmsPerChannel ?? (channelsPerSocket === 12 || channelsPerSocket === 6 ? 1 : 2);
  const maxDimmsPerSocket = memArch.maxDimmsPerSocket ?? (channelsPerSocket * maxDpc);
  const maxDimmsChassis = maxDimmsPerSocket * cpuInfo.maxSockets;
  const maxDimmsForCurrentCpus = maxDimmsPerSocket * cpuCount;
  const perSocketValid = memArch.validBalancedCountsPerSocket || DEFAULT_CHANNEL_VALID_COUNTS[channelsPerSocket] || [1, 2, 4, 6, 8, 12, 16];

  const validTotalDimmCounts = perSocketValid.filter(n => n <= maxDimmsPerSocket).map(n => n * cpuCount);
  const memEntries = (loadedCat?.entries || []).filter(e => /memory|dimm/i.test(`${e.parentCategory || ''} ${e.subCategory || ''} ${e.skuData?.Description || ''}`));
  const capacitiesGb = memEntries
    .map(e => String(e.skuData?.Description || '').match(/(\d+)\s*GB/i))
    .filter(Boolean)
    .map(m => parseInt(m[1], 10))
    .filter(g => g >= 8 && g <= 1024);
  const maxDimmSizeGb = capacitiesGb.length > 0 ? Math.max(...capacitiesGb) : 256;

  return {
    platformId: platformId || loadedCat?.metadata?.productId || 'UNKNOWN',
    generation: memArch.generation || 'DDR5',
    cpuCountConsidered: cpuCount,
    maxSockets: cpuInfo.maxSockets,
    channelsPerSocket,
    maxDimmsPerChannel: maxDpc,
    minDimmsPerSocket: 1,
    maxDimmsPerSocket,
    maxDimmsChassis,
    maxDimmsForCurrentCpus,
    validBalancedTotalDimms: validTotalDimmCounts,
    maxDimmCapacityGb: maxDimmSizeGb,
    maxMemoryCapacityTb: Number(((maxDimmsForCurrentCpus * maxDimmSizeGb) / 1024).toFixed(2)),
    speedDeratingNotice: maxDpc >= 2 ? '2DPC population may derate memory bus frequency compared to 1DPC.' : null
  };
}

function solveStorageAndPowerEnvelope(platformId, catalogData = null, options = {}) {
  const { catalogData: loadedCat } = _loadPlatformCatalogAndRules(platformId, catalogData, options.rulesData);
  const profile = _inferProfileFromId(platformId, loadedCat);
  const key = String(platformId || loadedCat?.metadata?.productId || '').toUpperCase();

  let minDrives = 0;
  let maxSffDrives = 24;
  let maxLffDrives = 12;
  let maxEdsffDrives = 36;
  if (/DL360|DL325/.test(key)) {
    maxSffDrives = 10; maxLffDrives = 4; maxEdsffDrives = 20;
  } else if (/DL380A/.test(key)) {
    maxSffDrives = 8; maxLffDrives = 0; maxEdsffDrives = 16;
  } else if (/DL145/.test(key)) {
    maxSffDrives = 6; maxLffDrives = 2; maxEdsffDrives = 6;
  } else if (/ALLETRA/.test(key)) {
    maxSffDrives = 24; maxLffDrives = 0; maxEdsffDrives = 24;
  }

  const isSynergy = /SYNERGY/.test(key);
  return {
    storage: {
      minDrives,
      maxSffDrives,
      maxLffDrives,
      maxEdsffDrives,
      controllerDirectPortOptions: [8, 16, 32],
      requiresExpanderAboveDirectPorts: true,
      alletraVariants: profile.variants || null
    },
    power: {
      minPsusPerNode: isSynergy ? 6 : 1,
      recommendedRedundantPsus: isSynergy ? 6 : 2,
      maxPsusPerNode: isSynergy ? 12 : (/DL380A|DL580/.test(key) ? 6 : 2),
      validPsuCounts: isSynergy ? [6, 12] : (/DL380A|DL580/.test(key) ? [1, 2, 4, 6] : [1, 2]),
      supportsDc48V: !isSynergy && !/DL380A/.test(key),
      highLineRequiredAboveWatts: 800
    }
  };
}

function computeFullPlatformEnvelope(platformId, catalogData = null, options = {}) {
  const { catalogData: loadedCat, rulesData } = _loadPlatformCatalogAndRules(platformId, catalogData, options.rulesData);
  const profile = _inferProfileFromId(platformId, loadedCat);
  const resolvedOptions = { ...options, rulesData };
  const cpu = _resolveCpuDefaults(profile, platformId, loadedCat);
  const pcieAndOcp = solveMaxPcieAndOcpTopology(platformId, loadedCat, resolvedOptions);
  const gpu = solveMaxGpuTopology(platformId, loadedCat, resolvedOptions);
  const memory = solveMemoryEnvelope(platformId, loadedCat, resolvedOptions);
  const storageAndPower = solveStorageAndPowerEnvelope(platformId, loadedCat, resolvedOptions);
  const gatedRules = (rulesData?.rules || []).filter(r =>
    r.ruleType === 'CONDITIONAL_VISIBILITY' || r.conditionType === 'AMBIENT_GATE' || r.conditionType === 'TDP_GATE'
  );

  return {
    platformId: platformId || loadedCat?.metadata?.productId || 'UNKNOWN',
    domain: profile.domain || 'server',
    formFactor: profile.formFactor || 'Rack',
    cpu,
    ocp: pcieAndOcp.ocp,
    pcie: pcieAndOcp.pcie,
    gpu,
    memory,
    storage: storageAndPower.storage,
    power: storageAndPower.power,
    catalogRuleMetrics: {
      totalRules: (rulesData?.rules || []).length,
      conditionalAndThermalGates: gatedRules.length
    },
    catalogSubcategoryBounds: computeCategoryBounds(loadedCat, options.categoryKey || '')
  };
}

module.exports = {
  computeCategoryBounds,
  solveMaxPcieAndOcpTopology,
  solveMaxGpuTopology,
  solveMemoryEnvelope,
  solveStorageAndPowerEnvelope,
  computeFullPlatformEnvelope
};
