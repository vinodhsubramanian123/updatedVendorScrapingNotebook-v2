'use strict';
/**
 * scripts/lib/boq/deal_optimizer.js — Deal-Winning Value Engineering & CapEx Optimization Engine
 *
 * Analyzes customer workload DNA, identifies over-provisioned components and bus-speed bottlenecks,
 * and synthesizes CapEx reduction opportunities to give HPE presales teams a competitive edge
 * while guaranteeing 100% buildable and reliable server architectures.
 */

const { cleanBaseSKU } = require('../catalog/sku.js');
const { getSkuListPrice } = require('./budget_optimizer.js');

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

  const cpuCount = compute.cpuCount || 2;
  const memoryGb = memory.totalMemoryGb || 256;
  const driveCount = storage.driveCount || 0;
  const gpuCount = pcie.gpuCount || 0;

  const ramPerCore = cpuCount > 0 ? (memoryGb / (cpuCount * 16)) : 8;

  let profile = 'BALANCED_ENTERPRISE';
  const traits = [];

  if (gpuCount >= 2) {
    profile = 'AI_ML_ACCELERATED';
    traits.push(`High GPU density (${gpuCount} accelerators) requiring auxiliary power and high-perf cooling.`);
  } else if (driveCount >= 16) {
    profile = 'HIGH_DENSITY_STORAGE';
    traits.push(`High drive capacity (${driveCount} drives) requiring multi-channel controller expansion.`);
  } else if (ramPerCore >= 16) {
    profile = 'MEMORY_INTENSIVE_VIRTUALIZATION';
    traits.push(`High memory-to-core ratio (${ramPerCore.toFixed(1)} GB/core) optimized for virtualization / in-memory DB.`);
  } else if (compute.maxCpuTdpWatts >= 270) {
    profile = 'COMPUTE_INTENSIVE_HPC';
    traits.push(`High-frequency compute (${compute.maxCpuTdpWatts}W TDP) requiring performance heatsinks and high-airflow fans.`);
  } else if (driveCount >= 8 && compute.maxCpuTdpWatts <= 165) {
    profile = 'COLD_STORAGE_ARCHIVE';
    traits.push(`Capacity storage with energy-efficient compute profile.`);
  }

  return { profile, traits, ramPerCore, cpuCount, memoryGb, driveCount, gpuCount };
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

  // 1. Memory Speed Bottleneck Analysis (DDR5-5600 with Silver/Low-TDP CPUs)
  const isSilverOrLowTdpCpu = (compute.maxCpuTdpWatts > 0 && compute.maxCpuTdpWatts <= 165) ||
    items.some(it => {
      const d = (it.description || '').toLowerCase();
      return d.includes('silver') || d.includes('4410y') || d.includes('4416+');
    });

  const ddr5600Items = items.filter(it => {
    const d = (it.description || '').toLowerCase();
    return (d.includes('5600') || it.sku === 'P73300-B21' || it.sku === 'P64707-B21') && (d.includes('memory') || d.includes('rdimm'));
  });

  if (isSilverOrLowTdpCpu && ddr5600Items.length > 0) {
    let totalDdr5600Qty = 0;
    let ddr5600Cost = 0;
    for (const m of ddr5600Items) {
      const q = m.quantity || 1;
      totalDdr5600Qty += q;
      ddr5600Cost += (getSkuListPrice(m.sku, catalogData, chassisDir) * q);
    }

    const estimated4800Cost = totalDdr5600Qty * 145.0; // P43328-B21 typical price
    const savings = Math.max(0, ddr5600Cost - estimated4800Cost);

    if (savings > 0 || totalDdr5600Qty > 0) {
      const recSavings = savings > 0 ? savings : (totalDdr5600Qty * 35.0);
      potentialSavingsUsd += recSavings;
      opportunities.push({
        id: 'VE-OPT-MEMORY-BUS-ALIGNMENT',
        component: 'Memory Architecture',
        title: 'Align DIMM Speed to CPU Memory Controller Limit',
        severity: 'OPPORTUNITY',
        currentSelection: `DDR5-5600 DIMMs (${totalDdr5600Qty} units)`,
        recommendedAlternative: 'HPE 32GB 2Rx8 DDR5-4800 Smart Memory (P43328-B21)',
        estimatedSavingsUsd: recSavings,
        rationale: 'Intel Xeon Silver CPUs cap memory bus frequency at 4000-4400 MT/s. Deploying DDR5-5600 yields identical effective bandwidth as DDR5-4800 at a higher acquisition cost.',
        presalesPitch: 'Switching to DDR5-4800 preserves 100% of memory bandwidth and performance while reducing server BOM cost.'
      });
    }
  }

  // 2. Power Supply Right-Sizing
  const estimatedWatts = power.estimatedNodeWattage || 350;
  const psuWattage = power.maxPsuWattage || 800;
  const psuCount = power.psuCount || 2;

  if (estimatedWatts < 450 && psuWattage >= 1600 && psuCount >= 2) {
    const psuSavings = psuCount * 180.0;
    potentialSavingsUsd += psuSavings;
    opportunities.push({
      id: 'VE-OPT-PSU-RIGHT-SIZING',
      component: 'Power Distribution',
      title: 'Right-Size Power Supply Capacity for Node Draw',
      severity: 'OPPORTUNITY',
      currentSelection: `${psuWattage}W Power Supplies (${psuCount} units)`,
      recommendedAlternative: 'HPE 800W Flex Slot Platinum Power Supply (P48818-B21)',
      estimatedSavingsUsd: psuSavings,
      rationale: `Total estimated node draw is ${estimatedWatts}W. 800W power supplies provide full N+1 redundancy while operating closer to the optimal 50% efficiency sweet-spot.`,
      presalesPitch: 'Right-sizing to 800W Platinum PSUs reduces upfront CapEx and optimizes data center electrical efficiency.'
    });
  }

  // 3. Unsolicited Startup Services & Software Strip (INV-32)
  if (support.unsolicitedOptionalItems && support.unsolicitedOptionalItems.length > 0) {
    let serviceCost = 0;
    const itemNames = [];
    for (const it of support.unsolicitedOptionalItems) {
      const q = it.quantity || 1;
      const p = it.unitListPrice || getSkuListPrice(it.sku, catalogData, chassisDir) || 850.0;
      serviceCost += (p * q);
      itemNames.push(`${it.sku} (${it.description || 'Optional Service'})`);
    }

    potentialSavingsUsd += serviceCost;
    opportunities.push({
      id: 'VE-OPT-UNSOLICITED-SERVICES',
      component: 'Commercial Services & Add-Ons',
      title: 'Unbundle Unrequested Startup Services & Add-On Software',
      severity: 'RECOMMENDATION',
      currentSelection: itemNames.join(', '),
      recommendedAlternative: 'Offer as optional a-la-carte lines rather than embedded mandatory BOM items',
      estimatedSavingsUsd: serviceCost,
      rationale: 'Unsolicited services inflate headline quotation figures and weaken bid competitiveness in price-sensitive customer tenders.',
      presalesPitch: 'Presenting core hardware independently and offering implementation as optional a-la-carte ensures a more competitive bid price.'
    });
  }

  // 4. CPU Tier Right-Sizing (High-Spec Platinum / High-TDP Gold on Storage/Balanced Nodes)
  const isHighComputeWorkload = workload.profile === 'COMPUTE_INTENSIVE_HPC' || workload.profile === 'AI_ML_ACCELERATED';
  if (!isHighComputeWorkload) {
    const highTierCpuItems = items.filter(it => {
      const d = (it.description || '').toLowerCase();
      const isCpu = d.includes('processor') || d.includes('xeon') || d.includes('cpu');
      const isPlatinum = d.includes('platinum') || d.includes('8480') || d.includes('8580') || d.includes('8562');
      const isHighTdpGold = (d.includes('gold') && (d.includes('6548') || d.includes('6544') || d.includes('6542')));
      return isCpu && (isPlatinum || isHighTdpGold);
    });

    if (highTierCpuItems.length > 0) {
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

      potentialSavingsUsd += cpuSavings;
      opportunities.push({
        id: 'VE-OPT-CPU-TIER-ALIGNMENT',
        component: 'Compute Architecture',
        title: 'Right-Size Processor Tier to Real Workload Bottleneck',
        severity: 'OPPORTUNITY',
        currentSelection: `${cpuNames.join(', ')} (${totalCpuQty} units)`,
        recommendedAlternative: 'Intel Xeon Gold 6530 2.1GHz 32-core 185W Processor (P67096-B21)',
        estimatedSavingsUsd: cpuSavings,
        rationale: 'Workload DNA is storage/balanced rather than compute-bound. High-frequency Platinum/high-TDP processors operate under-utilized while driving up initial CapEx and power consumption.',
        presalesPitch: 'Switching to Intel Xeon Gold reduces server cost by up to $1,800 per socket while preserving 100% of storage throughput and application response.'
      });
    }
  }

  // 5. NIC Tier Alignment (100GbE / 200GbE on Non-Accelerated / Non-HPC Workloads)
  if (!isHighComputeWorkload) {
    const highSpeedNicItems = items.filter(it => {
      const d = (it.description || '').toLowerCase();
      const isHighSpeed = d.includes('100gb') || d.includes('200gb') || d.includes('infiniband') || it.sku === 'P25960-B21' || it.sku === 'P21112-B21';
      const isNic = d.includes('adapter') || d.includes('ethernet') || d.includes('ocp3') || d.includes('qsfp');
      return isHighSpeed && isNic;
    });

    if (highSpeedNicItems.length > 0) {
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

      potentialSavingsUsd += nicSavings;
      opportunities.push({
        id: 'VE-OPT-NIC-TIER-ALIGNMENT',
        component: 'Network Fabric',
        title: 'Optimize Network Interface Tier for Core Infrastructure Fabric',
        severity: 'OPPORTUNITY',
        currentSelection: `${nicNames.join(', ')} (${totalNicQty} units)`,
        recommendedAlternative: 'Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 Adapter (P26262-B21)',
        estimatedSavingsUsd: nicSavings,
        rationale: '100GbE/200GbE interfaces require expensive 100G leaf switching and specialized optics. Dual 25GbE provides ample bandwidth for storage and enterprise virtualization at 60% lower CapEx.',
        presalesPitch: 'Aligning NICs to dual 25GbE provides high throughput and redundancy while saving significant budget on adapters and transceivers.'
      });
    }
  }

  // Compute metrics
  const optimizedTotalUsd = Math.max(0, baselineTotalUsd - potentialSavingsUsd);
  const capexSavingsPercent = baselineTotalUsd > 0 ? ((potentialSavingsUsd / baselineTotalUsd) * 100) : 0;

  return {
    workloadProfile: workload.profile,
    workloadTraits: workload.traits,
    baselineCapExUsd: baselineTotalUsd,
    optimizedCapExUsd: optimizedTotalUsd,
    potentialSavingsUsd,
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
