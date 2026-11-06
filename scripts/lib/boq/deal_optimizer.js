'use strict';
/**
 * scripts/lib/boq/deal_optimizer.js — Deal-Winning Value Engineering & CapEx Optimization Engine
 *
 * Analyzes customer workload DNA, identifies over-provisioned components and bus-speed bottlenecks,
 * and synthesizes CapEx reduction opportunities to give HPE presales teams a competitive edge
 * while guaranteeing 100% buildable and reliable server architectures.
 */

const { getSkuListPrice } = require('./budget_optimizer.js');
const { extractWorkloadDna } = require('../conflict/workload_dna.js');

function _hasAspectEvidence(aspects, compute, memory, storage, pcie) {
  if (!aspects) return false;
  return compute.cpuCount != null ||
    memory.totalMemoryGb != null ||
    storage.driveCount != null ||
    pcie.gpuCount != null ||
    compute.maxCpuTdpWatts != null;
}

function _hasItemEvidence(dna) {
  if (!dna) return false;
  return dna.totalCores > 0 || dna.totalMemoryGb > 0 || dna.driveCount > 0 || dna.hasGpu;
}

function _resolveWorkloadDimensions(compute, memory, storage, pcie, dna) {
  const cpuCount = compute.cpuCount != null ? compute.cpuCount : (dna?.totalCores ? Math.ceil(dna.totalCores / 16) : 2);
  const memoryGb = memory.totalMemoryGb != null ? memory.totalMemoryGb : (dna?.totalMemoryGb || 256);
  const driveCount = storage.driveCount != null ? storage.driveCount : (dna?.driveCount || 0);
  const gpuCount = pcie.gpuCount != null ? pcie.gpuCount : (dna?.totalGpuCount || 0);
  const coresPerCpu = compute.coresPerCpu || ((dna?.totalCores && cpuCount > 0) ? (dna.totalCores / cpuCount) : 16);
  const totalCores = dna?.totalCores || (cpuCount * coresPerCpu);
  const ramPerCore = (totalCores > 0 && memoryGb != null) ? (memoryGb / totalCores) : 8;

  return { cpuCount, memoryGb, driveCount, gpuCount, ramPerCore };
}

function _matchWorkloadProfile(gpuCount, driveCount, ramPerCore, maxCpuTdpWatts) {
  if (gpuCount >= 2) {
    return {
      profile: 'AI_ML_ACCELERATED',
      traits: [`High GPU density (${gpuCount} accelerators) requiring auxiliary power and high-perf cooling.`]
    };
  }
  if (driveCount >= 16) {
    return {
      profile: 'HIGH_DENSITY_STORAGE',
      traits: [`High drive capacity (${driveCount} drives) requiring multi-channel controller expansion.`]
    };
  }
  if (ramPerCore >= 16) {
    return {
      profile: 'MEMORY_INTENSIVE_VIRTUALIZATION',
      traits: [`High memory-to-core ratio (${ramPerCore.toFixed(1)} GB/core) optimized for virtualization / in-memory DB.`]
    };
  }
  if (maxCpuTdpWatts >= 270) {
    return {
      profile: 'COMPUTE_INTENSIVE_HPC',
      traits: [`High-frequency compute (${maxCpuTdpWatts}W TDP) requiring performance heatsinks and high-airflow fans.`]
    };
  }
  if (driveCount >= 8 && maxCpuTdpWatts <= 165) {
    return {
      profile: 'COLD_STORAGE_ARCHIVE',
      traits: ['Capacity storage with energy-efficient compute profile.']
    };
  }
  return {
    profile: 'BALANCED_ENTERPRISE',
    traits: []
  };
}

/**
 * Determine primary workload profile from items and aspect telemetry
 * @param {Array<object>} items 
 * @param {object} evalResults 
 * @returns {object} Workload profile
 */
function classifyWorkloadProfile(items, evalResults = {}) {
  const compute = evalResults.aspects?.compute || {};
  const memory = evalResults.aspects?.memory || {};
  const storage = evalResults.aspects?.storage || {};
  const pcie = evalResults.aspects?.pcie || {};

  const hasItems = Array.isArray(items) && items.length > 0;
  const dna = hasItems ? extractWorkloadDna(items) : null;

  const hasAspect = _hasAspectEvidence(evalResults.aspects, compute, memory, storage, pcie);
  const hasItem = _hasItemEvidence(dna);

  if (!hasAspect && !hasItem && !hasItems) {
    return {
      profile: 'UNKNOWN',
      traits: ['No telemetry or hardware items provided for workload classification.'],
      ramPerCore: null,
      cpuCount: 0,
      memoryGb: 0,
      driveCount: 0,
      gpuCount: 0,
      workloadDna: null,
      isUnknown: true
    };
  }

  const dims = _resolveWorkloadDimensions(compute, memory, storage, pcie, dna);
  const matched = _matchWorkloadProfile(dims.gpuCount, dims.driveCount, dims.ramPerCore, compute.maxCpuTdpWatts);

  return {
    profile: matched.profile,
    traits: matched.traits,
    ramPerCore: dims.ramPerCore,
    cpuCount: dims.cpuCount,
    memoryGb: dims.memoryGb,
    driveCount: dims.driveCount,
    gpuCount: dims.gpuCount,
    workloadDna: dna
  };
}

function _checkMemoryBusAlignment(items, compute, catalogData, chassisDir) {
  const isSilverOrLowTdpCpu = (compute.maxCpuTdpWatts > 0 && compute.maxCpuTdpWatts <= 165) ||
    items.some(it => {
      const d = (it.description || '').toLowerCase();
      return d.includes('silver') || d.includes('4410y') || d.includes('4416+');
    });

  const ddr5600Items = items.filter(it => {
    const d = (it.description || '').toLowerCase();
    return (d.includes('5600') || it.sku === 'P73300-B21' || it.sku === 'P64707-B21') && (d.includes('memory') || d.includes('rdimm'));
  });

  if (!isSilverOrLowTdpCpu || ddr5600Items.length === 0) return null;

  let totalDdr5600Qty = 0;
  let ddr5600Cost = 0;
  for (const m of ddr5600Items) {
    const q = m.quantity || 1;
    totalDdr5600Qty += q;
    ddr5600Cost += (getSkuListPrice(m.sku, catalogData, chassisDir) * q);
  }

  const estimated4800Cost = totalDdr5600Qty * 145.0;
  const savings = Math.max(0, ddr5600Cost - estimated4800Cost);
  const recSavings = savings > 0 ? savings : (totalDdr5600Qty * 35.0);

  return {
    savings: recSavings,
    opportunity: {
      id: 'VE-OPT-MEMORY-BUS-ALIGNMENT',
      component: 'Memory Architecture',
      type: 'Memory Architecture',
      title: 'Align DIMM Speed to CPU Memory Controller Limit',
      headline: 'Align DIMM Speed to CPU Memory Controller Limit',
      severity: 'OPPORTUNITY',
      currentSelection: `DDR5-5600 DIMMs (${totalDdr5600Qty} units)`,
      recommendedAlternative: 'HPE 32GB 2Rx8 DDR5-4800 Smart Memory (P43328-B21)',
      estimatedSavingsUsd: recSavings,
      potentialSavingsUsd: recSavings,
      rationale: 'Intel Xeon Silver CPUs cap memory bus frequency at 4000-4400 MT/s. Deploying DDR5-5600 yields identical effective bandwidth as DDR5-4800 at a higher acquisition cost.',
      presalesPitch: 'Switching to DDR5-4800 preserves 100% of memory bandwidth and performance while reducing server BOM cost.'
    }
  };
}

function _checkPowerSupplyRightSizing(power) {
  const estimatedWatts = power.estimatedNodeWattage || 350;
  const psuWattage = power.maxPsuWattage || 800;
  const psuCount = power.psuCount || 2;

  if (estimatedWatts >= 450 || psuWattage < 1600 || psuCount < 2) return null;

  const psuSavings = psuCount * 180.0;
  return {
    savings: psuSavings,
    opportunity: {
      id: 'VE-OPT-PSU-RIGHT-SIZING',
      component: 'Power Distribution',
      type: 'Power Distribution',
      title: 'Right-Size Power Supply Capacity for Node Draw',
      headline: 'Right-Size Power Supply Capacity for Node Draw',
      severity: 'OPPORTUNITY',
      currentSelection: `${psuWattage}W Power Supplies (${psuCount} units)`,
      recommendedAlternative: 'HPE 800W Flex Slot Platinum Hot Plug Power Supply (P38995-B21)',
      estimatedSavingsUsd: psuSavings,
      potentialSavingsUsd: psuSavings,
      rationale: `Total estimated node draw is ${estimatedWatts}W. 800W power supplies provide full N+1 redundancy while operating closer to the optimal 50% efficiency sweet-spot.`,
      presalesPitch: 'Right-sizing to 800W Platinum PSUs reduces upfront CapEx and optimizes data center electrical efficiency.'
    }
  };
}

function _checkUnsolicitedServices(support, catalogData, chassisDir) {
  if (!support.unsolicitedOptionalItems || support.unsolicitedOptionalItems.length === 0) return null;

  let serviceCost = 0;
  const itemNames = [];
  for (const it of support.unsolicitedOptionalItems) {
    const q = it.quantity || 1;
    const p = it.unitListPrice || getSkuListPrice(it.sku, catalogData, chassisDir) || 850.0;
    serviceCost += (p * q);
    itemNames.push(`${it.sku} (${it.description || 'Optional Service'})`);
  }

  return {
    savings: serviceCost,
    opportunity: {
      id: 'VE-OPT-UNSOLICITED-SERVICES',
      component: 'Commercial Services & Add-Ons',
      type: 'Commercial Services & Add-Ons',
      title: 'Unbundle Unrequested Startup Services & Add-On Software',
      headline: 'Unbundle Unrequested Startup Services & Add-On Software',
      severity: 'RECOMMENDATION',
      currentSelection: itemNames.join(', '),
      recommendedAlternative: 'Offer as optional a-la-carte lines rather than embedded mandatory BOM items',
      estimatedSavingsUsd: serviceCost,
      potentialSavingsUsd: serviceCost,
      rationale: 'Unsolicited services inflate headline quotation figures and weaken bid competitiveness in price-sensitive customer tenders.',
      presalesPitch: 'Presenting core hardware independently and offering implementation as optional a-la-carte ensures a more competitive bid price.'
    }
  };
}

function _checkProcessorTierAlignment(items, isHighComputeWorkload, catalogData, chassisDir) {
  if (isHighComputeWorkload) return null;

  const highTierCpuItems = items.filter(it => {
    const d = (it.description || '').toLowerCase();
    const isCpu = d.includes('processor') || d.includes('xeon') || d.includes('cpu');
    const isPlatinum = d.includes('platinum') || d.includes('8480') || d.includes('8580') || d.includes('8562');
    const isHighTdpGold = (d.includes('gold') && (d.includes('6548') || d.includes('6544') || d.includes('6542')));
    return isCpu && (isPlatinum || isHighTdpGold);
  });

  if (highTierCpuItems.length === 0) return null;

  let totalCpuQty = 0;
  let totalCpuCost = 0;
  const cpuNames = [];
  for (const it of highTierCpuItems) {
    const q = it.quantity || 1;
    totalCpuQty += q;
    const p = it.unitListPrice || getSkuListPrice(it.sku, catalogData, chassisDir) || 4500.0;
    totalCpuCost += (p * q);
    cpuNames.push(it.sku);
  }

  const estimatedAltCost = totalCpuQty * 2500.0;
  const cpuSavings = Math.max(totalCpuQty * 1200.0, totalCpuCost - estimatedAltCost);

  return {
    savings: cpuSavings,
    opportunity: {
      id: 'VE-OPT-CPU-TIER-ALIGNMENT',
      component: 'Compute Architecture',
      type: 'Compute Architecture',
      title: 'Right-Size Processor Tier to Real Workload Bottleneck',
      headline: 'Right-Size Processor Tier to Real Workload Bottleneck',
      severity: 'OPPORTUNITY',
      currentSelection: `${cpuNames.join(', ')} (${totalCpuQty} units)`,
      recommendedAlternative: 'Intel Xeon Gold 6530 2.1GHz 32-core 185W Processor (P67096-B21)',
      estimatedSavingsUsd: cpuSavings,
      potentialSavingsUsd: cpuSavings,
      rationale: 'Workload DNA is storage/balanced rather than compute-bound. High-frequency Platinum/high-TDP processors operate under-utilized while driving up initial CapEx and power consumption.',
      presalesPitch: 'Switching to Intel Xeon Gold reduces server cost by up to $1,800 per socket while preserving 100% of storage throughput and application response.'
    }
  };
}

function _checkNicTierAlignment(items, isHighComputeWorkload, catalogData, chassisDir) {
  if (isHighComputeWorkload) return null;

  const highSpeedNicItems = items.filter(it => {
    const d = (it.description || '').toLowerCase();
    const isHighSpeed = d.includes('100gb') || d.includes('200gb') || d.includes('infiniband') || it.sku === 'P25960-B21' || it.sku === 'P21112-B21';
    const isNic = d.includes('adapter') || d.includes('ethernet') || d.includes('ocp3') || d.includes('qsfp');
    return isHighSpeed && isNic;
  });

  if (highSpeedNicItems.length === 0) return null;

  let totalNicQty = 0;
  let totalNicCost = 0;
  const nicNames = [];
  for (const it of highSpeedNicItems) {
    const q = it.quantity || 1;
    totalNicQty += q;
    const p = it.unitListPrice || getSkuListPrice(it.sku, catalogData, chassisDir) || 1200.0;
    totalNicCost += (p * q);
    nicNames.push(it.sku);
  }

  const estimatedAltCost = totalNicQty * 450.0;
  const nicSavings = Math.max(totalNicQty * 650.0, totalNicCost - estimatedAltCost);

  return {
    savings: nicSavings,
    opportunity: {
      id: 'VE-OPT-NIC-TIER-ALIGNMENT',
      component: 'Network Fabric',
      type: 'Network Fabric',
      title: 'Optimize Network Interface Tier for Core Infrastructure Fabric',
      headline: 'Optimize Network Interface Tier for Core Infrastructure Fabric',
      severity: 'OPPORTUNITY',
      currentSelection: `${nicNames.join(', ')} (${totalNicQty} units)`,
      recommendedAlternative: 'Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 Adapter (P26262-B21)',
      estimatedSavingsUsd: nicSavings,
      potentialSavingsUsd: nicSavings,
      rationale: '100GbE/200GbE interfaces require expensive 100G leaf switching and specialized optics. Dual 25GbE provides ample bandwidth for storage and enterprise virtualization at 60% lower CapEx.',
      presalesPitch: 'Aligning NICs to dual 25GbE provides high throughput and redundancy while saving significant budget on adapters and transceivers.'
    }
  };
}

function _checkHeatsinkLeadTimeRightSizing(items, compute, workload, catalogData, chassisDir) {
  const maxPerfHeatsinkItems = items.filter(it => {
    const raw = String(it.sku || '').trim().toUpperCase();
    const d = (it.description || '').toLowerCase();
    if (/(?:\s+|#)(?:0D1|OD1|B19)\b/i.test(raw) || d === 'factory integrated') return false;
    return raw.startsWith('P74794-B21') || d.includes('max performance heat sink');
  });

  if (maxPerfHeatsinkItems.length === 0 || (workload.gpuCount || 0) > 0) return null;

  let detectedMaxTdp = compute.maxCpuTdpWatts || 0;
  if (!detectedMaxTdp) {
    for (const it of items) {
      const d = (it.description || '').toLowerCase();
      if (d.includes('processor') || d.includes('xeon') || d.includes('epyc')) {
        const m = d.match(/(\d{2,3})\s*w/i);
        if (m) detectedMaxTdp = Math.max(detectedMaxTdp, parseInt(m[1], 10));
      }
    }
  }

  if (detectedMaxTdp <= 0 || detectedMaxTdp > 270) return null;

  let totalMaxHsQty = 0;
  let totalMaxHsCost = 0;
  const altUnitPrice = getSkuListPrice('P74792-B21', catalogData, chassisDir);
  for (const it of maxPerfHeatsinkItems) {
    const q = it.quantity || 1;
    totalMaxHsQty += q;
    const p = it.unitListPrice || getSkuListPrice(it.sku, catalogData, chassisDir);
    if (p) totalMaxHsCost += (p * q);
  }

  const totalCpuQty = compute.cpuCount || (totalMaxHsQty * 2);
  const targetHighPerfQty = Math.max(totalCpuQty, totalMaxHsQty);
  const altTotalCost = altUnitPrice ? targetHighPerfQty * altUnitPrice : null;
  const hsSavings = (totalMaxHsCost > 0 && altTotalCost !== null) ? Math.max(0, totalMaxHsCost - altTotalCost) : 0;

  return {
    savings: hsSavings,
    opportunity: {
      id: 'VE-OPT-HEATSINK-TIER-RIGHT-SIZING',
      component: 'Cooling & Thermal Envelope',
      type: 'Cooling & Thermal Envelope',
      title: 'Right-Size Max Performance Heatsink (45d Lead Time) to High Performance Heatsink (4d Lead Time) (INV-208)',
      headline: 'Right-Size Max Performance Heatsink (45d Lead Time) to High Performance Heatsink (4d Lead Time) (INV-208)',
      severity: 'OPPORTUNITY',
      currentSelection: `P74794-B21 Max Performance Heat Sink Kit (${totalMaxHsQty} kit(s) @ $624/kit, max 1/server, 45-day lead time)`,
      recommendedAlternative: `HPE ProLiant Compute DL380 Gen12 2U High Performance Heat Sink Kit (P74792-B21, ${targetHighPerfQty} kit(s) @ $316/kit, 1/socket, 4-day lead time)`,
      estimatedSavingsUsd: hsSavings,
      potentialSavingsUsd: hsSavings,
      leadTimeSavedDays: 41,
      rationale: `Processors <= 270W TDP (${detectedMaxTdp}W detected) are thermally certified with the High Performance Heat Sink (P74792-B21, rated 185W-270W, 1 kit per socket = $632 per 2P server). Max Performance (P74794-B21, 1 kit per 2P server = $624/server) is only required for 275W-350W+ extreme TDP CPUs and imposes a 45-day lead-time bottleneck.`,
      presalesPitch: 'Switching from 1x P74794-B21/server ($624) to 2x P74792-B21/server ($632) slashes cooling lead time by 41 days (from 45 days down to 4 days) at virtually identical per-server cost ($8/server delta).'
    }
  };
}

/**
 * Evaluate over-provisioning and synthesize deal-winning recommendations
 * @param {Array<object>} items 
 * @param {object} evalResults 
 * @param {object} catalogData 
 * @param {string} chassisDir 
 * @returns {object} Value engineering report
 */
function analyzeDealValueEngineering(items, evalResults = {}, catalogData = null, chassisDir = null) {
  const workload = classifyWorkloadProfile(items, evalResults);
  const compute = evalResults.aspects?.compute || {};
  const power = evalResults.aspects?.power || {};
  const support = evalResults.aspects?.support || {};

  const opportunities = [];
  let baselineTotalUsd = 0;
  let potentialSavingsUsd = 0;

  // Calculate baseline BOM cost
  for (const it of items) {
    const qty = it.quantity || 1;
    const unitPrice = it.unitListPrice || getSkuListPrice(it.sku, catalogData, chassisDir);
    baselineTotalUsd += (unitPrice * qty);
  }

  const isHighComputeWorkload = workload.profile === 'COMPUTE_INTENSIVE_HPC' || workload.profile === 'AI_ML_ACCELERATED';

  // Run modular VE opportunity checkers
  const checkers = [
    () => _checkMemoryBusAlignment(items, compute, catalogData, chassisDir),
    () => _checkPowerSupplyRightSizing(power),
    () => _checkUnsolicitedServices(support, catalogData, chassisDir),
    () => _checkProcessorTierAlignment(items, isHighComputeWorkload, catalogData, chassisDir),
    () => _checkNicTierAlignment(items, isHighComputeWorkload, catalogData, chassisDir),
    () => _checkHeatsinkLeadTimeRightSizing(items, compute, workload, catalogData, chassisDir)
  ];

  for (const checker of checkers) {
    const res = checker();
    if (res && res.opportunity) {
      potentialSavingsUsd += (res.savings || 0);
      opportunities.push(res.opportunity);
    }
  }

  // Compute metrics
  const optimizedTotalUsd = Math.max(0, baselineTotalUsd - potentialSavingsUsd);
  const capexSavingsPercent = baselineTotalUsd > 0 ? ((potentialSavingsUsd / baselineTotalUsd) * 100) : 0;

  const profileName = workload.profile;
  const rationale = (workload.traits && workload.traits.length > 0)
    ? workload.traits.join('; ')
    : (workload.isUnknown ? 'No workload telemetry available' : 'Standard enterprise profile');

  return {
    profile: profileName,
    workloadProfile: {
      profileName,
      rationale,
      toString() { return profileName; }
    },
    workloadTraits: workload.traits,
    workloadDna: workload.workloadDna || null,
    hasQuotedPricing: items.some(it => typeof it.unitListPrice === 'number'),
    baselineCapExUsd: baselineTotalUsd,
    optimizedCapExUsd: optimizedTotalUsd,
    potentialSavingsUsd,
    totalEstimatedSavingsUsd: potentialSavingsUsd,
    capexSavingsPercent,
    opportunitiesCount: opportunities.length,
    opportunities,
    generatedAt: new Date().toISOString()
  };
}

module.exports = {
  classifyWorkloadProfile,
  analyzeDealValueEngineering,
  evaluateDealOptimizations: analyzeDealValueEngineering
};
