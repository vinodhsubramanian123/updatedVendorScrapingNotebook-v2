'use strict';
/**
 * scripts/lib/preprocessor/variation_clusterer.js — Hardware Profiling & Variation Clustering
 *
 * Provides:
 * 1. Hardware profile extraction (CPUs, TDP, Memory, Storage, PCIe, Power).
 * 2. Improbability index & anomaly calculation.
 * 3. Comparative side-by-side configuration diff matrix.
 * 4. Split reason taxonomy constants.
 */

const { cleanBaseSKU } = require('../catalog/sku.js');

/**
 * Split reason taxonomy constants
 */
const SPLIT_REASONS = Object.freeze({
  COMPUTE_VARIATION: {
    code: 'COMPUTE_VARIATION',
    label: 'Compute / Processor Performance Tier',
    description: 'Configurations are split due to different CPU socket counts, core counts, or TDP thermal envelopes (e.g., High-TDP 280W vs Standard 180W).'
  },
  STORAGE_VARIATION: {
    code: 'STORAGE_VARIATION',
    label: 'Storage Media & Controller Architecture',
    description: 'Configurations are split due to storage media types (NVMe SSD vs SAS/SATA HDD), drive counts, or dedicated RAID controllers.'
  },
  MEMORY_DENSITY_VARIATION: {
    code: 'MEMORY_DENSITY_VARIATION',
    label: 'Memory Footprint & Channel Density',
    description: 'Configurations are split due to memory density per node (e.g., 512GB In-Memory DB vs 128GB Standard App Server).'
  },
  EXPANSION_PCIE_VARIATION: {
    code: 'EXPANSION_PCIE_VARIATION',
    label: 'PCIe Expansion & Accelerator / GPU Load',
    description: 'Configurations are split due to GPU cards, high-speed NICs, or secondary/tertiary PCIe riser requirements.'
  },
  POWER_ELECTRICAL_VARIATION: {
    code: 'POWER_ELECTRICAL_VARIATION',
    label: 'Power Feed & Electrical Redundancy',
    description: 'Configurations are split due to AC vs -48VDC telco power feeds, DC lug kits, or PSU wattage ratings.'
  },
  WORKLOAD_NODE_PURPOSE: {
    code: 'WORKLOAD_NODE_PURPOSE',
    label: 'Dedicated Workload Node Purpose',
    description: 'Customer explicitly separated server roles (e.g., Database Node, Compute Node, Storage Gateway, Management Node).'
  }
});

function _inspectCpuItem(it, desc, q, acc) {
  if ((desc.includes('processor') || desc.includes('xeon') || desc.includes('epyc')) &&
      !desc.includes('cable') && !desc.includes('heatsink') && !desc.includes('fan')) {
    acc.cpuCount += q;
    const tdpMatch = desc.match(/(\d{2,3})\s*w/i);
    const tdp = tdpMatch ? parseInt(tdpMatch[1], 10) : 0;
    if (tdp > acc.maxTdp) acc.maxTdp = tdp;
    acc.cpus.push(`${q}x ${it.description}`);
  }
}

function _inspectRamItem(it, desc, q, acc) {
  if (desc.includes('memory') || desc.includes('rdimm') || desc.includes('ddr5') || desc.includes('ram')) {
    acc.dimmCount += q;
    const gbMatch = desc.match(/(\d+)\s*gb/i);
    if (gbMatch) {
      acc.totalRamGb += parseInt(gbMatch[1], 10) * q;
    }
  }
}

function _inspectDriveItem(it, desc, q, acc) {
  if (desc.includes('ssd') || desc.includes('hdd') || desc.includes('nvme') || desc.includes('drive')) {
    if (!desc.includes('no drive') && !desc.includes('cage') && !desc.includes('controller') &&
        !desc.includes('boot optimized') && !desc.includes('boot device') && !desc.includes('ns204i')) {
      acc.driveCount += q;
      if (desc.includes('nvme')) acc.driveTypes.add('NVMe SSD');
      else if (desc.includes('sas')) acc.driveTypes.add('SAS');
      else if (desc.includes('sata')) acc.driveTypes.add('SATA');
      else acc.driveTypes.add('Storage Drive');
    }
  }
}

function _inspectPsuAndFanItem(it, desc, sku, q, acc) {
  if (desc.includes('power supply') || desc.includes('psu') || desc.includes('power supply kit')) {
    acc.psuCount += q;
  }
  if (desc.includes('high perf') || desc.includes('performance fan') || sku === 'P48820-B21') {
    acc.hasHighPerfFans = true;
  }
  if (desc.includes('-48vdc') || desc.includes('dc power')) {
    acc.psuType = '-48VDC Telco Power';
  }
  if (desc.includes('lug kit') || sku === 'P36877-B21') {
    acc.hasDcLug = true;
  }
}

function _inspectControllerAndPcieItem(it, desc, q, acc) {
  if (desc.includes('controller') || desc.includes('mr416i') || desc.includes('sr932i')) {
    acc.hasController = true;
  }
  if (desc.includes('adapter') || desc.includes('nvidia') || desc.includes('pcie') ||
      desc.includes('gpu') || desc.includes('hba') || desc.includes('fibre channel')) {
    if (!desc.includes('ocp') && !desc.includes('embedded') && !desc.includes('cable') &&
        !desc.includes('transceiver') && !desc.includes('sfp28 sr')) {
      acc.pcieCards += q;
    }
  }
}

/**
 * Extracts hardware profile attributes from a list of consolidated items.
 *
 * @param {Array<object>} items
 * @returns {object} Hardware profile summary
 */
function extractHardwareProfile(items) {
  const acc = {
    cpus: [],
    cpuCount: 0,
    maxTdp: 0,
    totalRamGb: 0,
    dimmCount: 0,
    driveCount: 0,
    driveTypes: new Set(),
    hasController: false,
    pcieCards: 0,
    psuCount: 0,
    psuType: 'AC Power',
    hasDcLug: false,
    hasHighPerfFans: false
  };

  items.forEach(it => {
    const desc = (it.description || '').toLowerCase();
    const sku = cleanBaseSKU(it.sku);
    const q = parseInt(it.atomicQuantity || it.quantity, 10) || 1;

    _inspectCpuItem(it, desc, q, acc);
    _inspectRamItem(it, desc, q, acc);
    _inspectDriveItem(it, desc, q, acc);
    _inspectPsuAndFanItem(it, desc, sku, q, acc);
    _inspectControllerAndPcieItem(it, desc, q, acc);
  });

  return {
    cpus: acc.cpus.length > 0 ? acc.cpus.join(', ') : 'Standard Processors',
    cpuCount: acc.cpuCount,
    maxTdpWatts: acc.maxTdp,
    totalRamGb: acc.totalRamGb || 0,
    dimmCount: acc.dimmCount || 0,
    driveCount: acc.driveCount || 0,
    driveMedia: Array.from(acc.driveTypes).join(' / ') || 'None / External',
    hasStorageController: acc.hasController,
    pcieCardsCount: acc.pcieCards,
    psuCount: acc.psuCount,
    psuType: acc.psuType,
    hasDcLugKit: acc.hasDcLug,
    hasHighPerfFans: acc.hasHighPerfFans
  };
}

function _extractDynamicSubcategoryLimits(subcategoryConstraints) {
  let maxCpus = 2;
  let maxDimms = 32;
  let maxPsus = 2;
  const tdpThreshold = 240;

  if (Array.isArray(subcategoryConstraints)) {
    subcategoryConstraints.forEach(sc => {
      const parent = (sc.parentCategory || '').toLowerCase();
      const sub = (sc.subCategory || '').toLowerCase();
      const maxQ = sc.maxQty || parseInt(sc.constraint, 10);
      if (maxQ && !isNaN(maxQ)) {
        if (parent.includes('processor') || sub.includes('processor') || sub.includes('cpu')) maxCpus = Math.max(maxCpus, maxQ);
        if (parent.includes('memory') || sub.includes('memory') || sub.includes('dimm')) maxDimms = Math.max(maxDimms, maxQ);
        if (parent.includes('power') || sub.includes('power') || sub.includes('psu')) maxPsus = Math.max(maxPsus, maxQ);
      }
    });
  }
  return { maxCpus, maxDimms, maxPsus, tdpThreshold };
}

function _checkHardwareBoundsAnomalies(profile, maxCpus, maxDimms, maxPsus) {
  let indexDelta = 0.0;
  const anomalies = [];

  if (profile.cpuCount > maxCpus) {
    indexDelta += 0.30;
    anomalies.push({
      type: 'SUBCATEGORY_CPU_LIMIT_EXCEEDED',
      message: `Processor count (${profile.cpuCount}) exceeds dual-socket chassis capacity (Max ${maxCpus} processors per unit).`
    });
  }
  if (profile.dimmCount > maxDimms) {
    indexDelta += 0.30;
    anomalies.push({
      type: 'SUBCATEGORY_DIMM_LIMIT_EXCEEDED',
      message: `RAM DIMM count (${profile.dimmCount}) exceeds motherboard ${maxDimms}-slot DIMM capacity.`
    });
  }
  if (profile.psuCount > maxPsus) {
    indexDelta += 0.25;
    anomalies.push({
      type: 'SUBCATEGORY_PSU_LIMIT_EXCEEDED',
      message: `Power Supply count (${profile.psuCount}) exceeds ${maxPsus}-bay redundant power supply bay limit.`
    });
  }
  return { indexDelta, anomalies };
}

function _checkArchitectureAndThermalAnomalies(profile, tdpThreshold) {
  let indexDelta = 0.0;
  const anomalies = [];

  const isDualCpu = profile.cpus && (profile.cpus.includes('2x') || profile.cpuCount === 2);
  if (profile.dimmCount > 0 && profile.dimmCount < 2 && isDualCpu) {
    indexDelta += 0.25;
    anomalies.push({
      type: 'UNBALANCED_CPU_RAM_RATIO',
      message: 'Dual-processor configuration ordered with only 1 RAM DIMM, creating memory channel imbalance.'
    });
  }

  if (profile.maxTdpWatts >= tdpThreshold && !profile.hasHighPerfFans) {
    indexDelta += 0.30;
    anomalies.push({
      type: 'HIGH_TDP_THERMAL_IMPROBABILITY',
      message: `Processor TDP (${profile.maxTdpWatts}W) meets/exceeds ${tdpThreshold}W threshold without High-Performance Fan Kit.`
    });
  }

  if (profile.psuType && profile.psuType.includes('-48VDC') && !profile.hasDcLugKit) {
    indexDelta += 0.25;
    anomalies.push({
      type: 'POWER_LUG_KIT_IMPROBABILITY',
      message: '-48VDC Telco Power Supply ordered without required DC Power Cable Lug Kit (P36877-B21).'
    });
  }
  return { indexDelta, anomalies };
}

function _checkUnmappedSkusAnomaly(items) {
  const unmappedCount = items.filter(i => !i.description || i.description === i.sku).length;
  if (unmappedCount > 0) {
    return {
      indexDelta: Math.min(0.20, unmappedCount * 0.05),
      anomalies: [{
        type: 'RAW_UNMAPPED_SKU_ANOMALY',
        message: `${unmappedCount} item(s) have unparsed descriptions or missing metadata.`
      }]
    };
  }
  return { indexDelta: 0.0, anomalies: [] };
}

/**
 * Calculates Improbability / Anomaly Index across a configuration profile
 *
 * @param {object} v - Variation object
 * @param {Array<object>} [subcategoryConstraints=[]]
 * @returns {{ improbabilityIndex: number, improbabilityScorePercent: number, isHighlyAnomalous: boolean, anomalies: Array<object> }}
 */
function calculateImprobabilityMetrics(v, subcategoryConstraints = []) {
  const profile = v.profile || extractHardwareProfile(v.items);
  const items = v.items || [];
  const anomalies = [...(v.ctoAnomalies || [])];
  let improbabilityIndex = 0.0;

  const { maxCpus, maxDimms, maxPsus, tdpThreshold } = _extractDynamicSubcategoryLimits(subcategoryConstraints);

  if (v.hasNonIntegerDivisor) {
    improbabilityIndex += 0.35;
  }

  const bounds = _checkHardwareBoundsAnomalies(profile, maxCpus, maxDimms, maxPsus);
  improbabilityIndex += bounds.indexDelta;
  anomalies.push(...bounds.anomalies);

  const archThermal = _checkArchitectureAndThermalAnomalies(profile, tdpThreshold);
  improbabilityIndex += archThermal.indexDelta;
  anomalies.push(...archThermal.anomalies);

  const unmapped = _checkUnmappedSkusAnomaly(items);
  improbabilityIndex += unmapped.indexDelta;
  anomalies.push(...unmapped.anomalies);

  improbabilityIndex = Math.min(1.0, parseFloat(improbabilityIndex.toFixed(2)));
  const improbabilityScorePercent = Math.round(improbabilityIndex * 100);

  return {
    improbabilityIndex,
    improbabilityScorePercent,
    isHighlyAnomalous: improbabilityIndex >= 0.35,
    anomalies
  };
}

/**
 * Builds a structured side-by-side comparative diff matrix between configuration variations
 *
 * @param {Array<object>} variations
 * @returns {{ comparedConfigs: Array<string>, differences: Array<object> }}
 */
function buildConfigDiffMatrix(variations) {
  if (!variations || variations.length <= 1) {
    return {
      comparedConfigs: variations ? variations.map(v => v.configId || v.name) : [],
      differences: []
    };
  }

  const comparedConfigs = variations.map(v => v.name || v.configId);
  const diffs = [];

  // 1. Processor & TDP Aspect
  const cpuValues = variations.map(v => `${v.profile?.cpus || 'Unknown'} (${v.profile?.maxTdpWatts || 0}W TDP)`);
  const hasCpuDiff = new Set(cpuValues).size > 1;
  if (hasCpuDiff) {
    const hasHighTdp = variations.some(v => (v.profile?.maxTdpWatts || 0) >= 240);
    diffs.push({
      aspect: 'Processor & TDP Envelope',
      config1: cpuValues[0],
      config2: cpuValues[1],
      allConfigs: cpuValues,
      impact: hasHighTdp
        ? 'High TDP (>=240W) mandates High-Performance Fan Kit (P48820-B21).'
        : 'Standard thermal cooling fans suffice.'
    });
  }

  // 2. Memory Capacity & Interleaving Aspect
  const ramValues = variations.map(v => `${v.profile?.totalRamGb || 0}GB RAM (${v.profile?.dimmCount || 0} DIMMs)`);
  const hasRamDiff = new Set(ramValues).size > 1;
  if (hasRamDiff) {
    diffs.push({
      aspect: 'Memory Capacity & Interleaving',
      config1: ramValues[0],
      config2: ramValues[1],
      allConfigs: ramValues,
      impact: 'Different memory population affects channel balance and memory bandwidth.'
    });
  }

  // 3. Storage Media & Controller Aspect
  const storageValues = variations.map(v => `${v.profile?.driveCount || 0}x ${v.profile?.driveMedia || 'None'}`);
  const hasStorageDiff = new Set(storageValues).size > 1;
  if (hasStorageDiff) {
    const hasDriveLess = variations.some(v => (v.profile?.driveCount || 0) === 0);
    diffs.push({
      aspect: 'Storage Media & Controller',
      config1: storageValues[0],
      config2: storageValues[1],
      allConfigs: storageValues,
      impact: hasDriveLess
        ? 'Drive-less chassis requires No Drive Configuration FIO Kit (873763-B21).'
        : 'Storage controller and cache battery protection required.'
    });
  }

  // 4. Power Feed Aspect
  const psuValues = variations.map(v => v.profile?.psuType || 'AC Power');
  const hasPsuDiff = new Set(psuValues).size > 1;
  if (hasPsuDiff) {
    const hasDc = variations.some(v => (v.profile?.psuType || '').includes('-48VDC'));
    diffs.push({
      aspect: 'Power Feed & Cable Lug Requirements',
      config1: psuValues[0],
      config2: psuValues[1],
      allConfigs: psuValues,
      impact: hasDc
        ? '-48VDC Power Supply requires DC Power Cable Lug Kit (P36877-B21).'
        : 'Standard AC power cabling.'
    });
  }

  return {
    comparedConfigs,
    differences: diffs
  };
}

module.exports = {
  SPLIT_REASONS,
  extractHardwareProfile,
  calculateImprobabilityMetrics,
  buildConfigDiffMatrix
};
