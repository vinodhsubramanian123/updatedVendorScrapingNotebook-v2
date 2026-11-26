'use strict';
/**
 * scripts/lib/conflict/resource_arbitrator.js — Cross-Subsystem Contested Resource Arbitrator
 *
 * Resolves shared physical resource contention across disparate component categories:
 * 1. OCP 3.0 Slot Contention: Storage Controller (-o) vs. OCP Network Adapters
 * 2. PCIe Riser Slot Contention: Standup PCIe Storage / NICs vs. Available Riser Lanes
 * 3. Storage Cable Cascading: Auto-pivot storage cable from OCP direct (P48918) to PCIe splitter (P48832/P76453)
 * 4. Boot Device Contention: Rear-bay NS204i-u vs. Standup PCIe NS204i-p
 * 5. Power Envelope & Utility Derating: Titanium vs. Platinum PSU efficiency pivots
 */

const { cleanBaseSKU } = require('../catalog/sku.js');
const {
  DEFAULT_FORM_FACTOR_DUALS,
  resolveFormFactorDuals,
  arbitrateOcpSlotContention: _arbitrateOcpSlotContention,
  arbitrateRearBootDeviceContention: _arbitrateRearBootDeviceContention,
  buildArbitrationSelfCorrectionTrail: _buildArbitrationSelfCorrectionTrail
} = require('./resource_arbitrator_remediation.js');

function _detectThermalNeeds(items, evalResults) {
  const aspectChecks = evalResults.aspectChecks || {};
  const thermal = aspectChecks.computeThermal || {};
  const missingDeps = evalResults.missingDependencies || [];

  const cpuItems = items.filter(it => {
    const d = (it.description || '').toLowerCase();
    const isCpu = d.includes('processor') || d.includes('xeon') || d.includes('epyc');
    return isCpu && !d.includes('heatsink');
  });

  const maxTdpMatch = cpuItems.map(it => {
    const match = (it.description || '').match(/(\d{2,3})\s*w\b/i);
    return match ? parseInt(match[1], 10) : 0;
  });
  const peakTdp = Math.max(0, ...maxTdpMatch);
  const needsDlc = Boolean(thermal.needsDirectLiquidCooling || peakTdp >= 350);
  const hasHeatsinkItem = items.some(it => (it.description || '').toLowerCase().includes('heatsink'));
  const isCtoServer = Boolean(evalResults.aspectChecks?.supportManufacturing?.hasCtoServer || items.some(it => (it.description || '').toLowerCase().includes('cto')));
  const hasExplicitThermalDeficit = Boolean(thermal.needsHeatsink || missingDeps.some(d => d.key === 'HIGH_PERF_HEATSINK'));
  const needsHeatsink = Boolean(hasExplicitThermalDeficit || (isCtoServer && peakTdp >= 270 && !hasHeatsinkItem));
  const needsFans = Boolean(thermal.needsHighPerfCooling || missingDeps.some(d => d.key === 'HIGH_PERF_FAN_KIT'));

  return { peakTdp, cpuItems, needsDlc, needsHeatsink, needsFans };
}

function _pushDlcThermalContention(contentions, branches, peakTdp, cpuDesc, isGen12, chassisInfo = {}) {
  const { getMandatorySkusForChassis } = require('../catalog/catalog_rules.js');
  const mandatory = getMandatorySkusForChassis(chassisInfo || {});
  const dlcSku = mandatory.DLC_KIT?.sku || mandatory.HIGH_PERF_HEATSINK?.sku || (isGen12 ? 'P74794-B21' : 'P48818-B21');
  const dlcDesc = mandatory.DLC_KIT?.name || mandatory.HIGH_PERF_HEATSINK?.name || (isGen12 ? 'HPE Direct Liquid Cooling / Max Performance Heat Sink Kit' : 'HPE ProLiant High Performance Heat Sink Kit');
  const tdpVal = peakTdp || 385;
  contentions.push({
    resourceType: 'THERMAL_COOLING_ENVELOPE',
    maxCapacity: 350,
    requestedDemands: tdpVal,
    tradeoffSummary: `Processor TDP (${tdpVal}W) exceeds air cooling limits (>350W), mandating Direct Liquid Cooling (DLC).`,
    hypothesis: `Initial configuration assumed standard chassis cooling was adequate for ${cpuDesc || 'installed processor'} (${tdpVal}W TDP).`,
    detectedFailure: `Processor TDP (${tdpVal}W) exceeds air cooling limits (>350W), mandating Direct Liquid Cooling (DLC).`,
    backtrackedFrom: 'Standard passive air cooling / heatsink baseline',
    selfCorrectionAction: 'Branch DLC: Injected Direct Liquid Cooling Module (DLC) and High-Performance Fan Kit',
    resolutionDetails: 'Allocated closed-loop liquid cooling manifold and normalized fan rotors to ensure junction temperature Tj < 85°C.',
    branchId: 'branch_thermal_dlc'
  });
  branches.push({
    branchId: 'branch_thermal_dlc',
    title: 'Branch DLC: Direct Liquid Cooling & High-Performance Thermal Envelope',
    targetRank: 1,
    tradeoffType: 'THERMAL_OPTIMIZED',
    substitutions: [
      {
        action: 'INJECT_DIRECT_LIQUID_COOLING',
        injectedSku: dlcSku,
        injectedDesc: dlcDesc,
        reasoning: 'Direct liquid cooling required for high-TDP processor exceeding air cooling threshold.'
      }
    ]
  });
}

function _pushHeatsinkThermalContention(contentions, branches, peakTdp, isGen12, chassisInfo = {}) {
  const { getMandatorySkusForChassis } = require('../catalog/catalog_rules.js');
  const mandatory = getMandatorySkusForChassis(chassisInfo || {});
  const heatsinkSku = mandatory.HIGH_PERF_HEATSINK?.sku || (isGen12 ? 'P74792-B21' : 'P48818-B21');
  const heatsinkDesc = mandatory.HIGH_PERF_HEATSINK?.name || (isGen12 ? 'HPE ProLiant High Performance Heat Sink Kit' : 'HPE ProLiant High Performance Heat Sink Kit');
  const fanSku = mandatory.HIGH_PERF_FAN_KIT?.sku || (isGen12 ? 'P74795-B21' : 'P48820-B21');
  const tdpVal = peakTdp || 270;

  contentions.push({
    resourceType: 'THERMAL_COOLING_ENVELOPE',
    maxCapacity: 205,
    requestedDemands: tdpVal,
    tradeoffSummary: `High-TDP processor (${tdpVal}W) requires High-Performance Heatsink (${heatsinkSku}) and Fan Kit (${fanSku}).`,
    hypothesis: `Initial configuration assumed standard cooling was adequate for ${tdpVal}W processor without dedicated thermal kits.`,
    detectedFailure: `Missing required processor heatsink or fan kit for high-TDP processor (${tdpVal}W).`,
    backtrackedFrom: 'Uncooled processor socket / standard fan baseline',
    selfCorrectionAction: `Branch Thermal: Injected Performance Heatsink (${heatsinkSku}) and High-Performance Fan Kit (${fanSku})`,
    resolutionDetails: `Injected Performance Heatsink (${heatsinkSku}) and High-Performance Fan Kit (${fanSku}) to fulfill chassis thermal envelope.`,
    branchId: 'branch_thermal_heatsink'
  });
  branches.push({
    branchId: 'branch_thermal_heatsink',
    title: 'Branch Thermal: Performance Heatsink & High-Performance Fan Kit',
    targetRank: 1,
    tradeoffType: 'THERMAL_OPTIMIZED',
    substitutions: [
      {
        action: 'INJECT_PERFORMANCE_HEATSINK',
        injectedSku: heatsinkSku,
        injectedDesc: heatsinkDesc,
        reasoning: `High performance heatsink required for ${tdpVal}W processor.`
      }
    ]
  });
}

/**
 * 1. Thermal Envelope Contention Arbitrator
 */
function _arbitrateThermalAspect(items, evalResults, chassisInfo, contentions, branches) {
  const gen = chassisInfo?.gen || 'Gen11';
  const isGen12 = gen.includes('12');
  const { peakTdp, cpuItems, needsDlc, needsHeatsink, needsFans } = _detectThermalNeeds(items, evalResults);

  if (needsDlc) {
    _pushDlcThermalContention(contentions, branches, peakTdp, cpuItems[0]?.description, isGen12, chassisInfo);
  } else if (needsHeatsink || needsFans) {
    _pushHeatsinkThermalContention(contentions, branches, peakTdp, isGen12, chassisInfo);
  }
}

/**
 * 2. Memory Bus & Interleaving Contention Arbitrator
 */
function _arbitrateMemoryAspect(items, evalResults, _chassisInfo, contentions, branches) {
  const aspectChecks = evalResults.aspectChecks || {};
  const memory = aspectChecks.memoryChannel || {};
  const conflicts = evalResults.conflicts || [];
  const memItems = items.filter(it => {
    const d = (it.description || '').toLowerCase();
    return d.includes('dimm') || d.includes('memory') || d.includes('ddr4') || d.includes('ddr5') || d.includes('pc4') || d.includes('pc5');
  });
  const hasDdr4 = memItems.some(it => {
    const d = (it.description || '').toLowerCase();
    return d.includes('ddr4') || d.includes('pc4');
  });
  const hasDdr5 = memItems.some(it => {
    const d = (it.description || '').toLowerCase();
    return d.includes('ddr5') || d.includes('pc5');
  });
  const hasMixedDdr = memory.hasMixedDdrGeneration || (hasDdr4 && hasDdr5) || conflicts.some(c => (c.message || '').includes('DDR4 and DDR5'));
  const isInvalidChannel = memory.isInvalidChannelConfiguration || memory.isSupportedPopulation === false;
  const isUnbalanced = memory.isBalancedChannel === false;

  if (hasMixedDdr) {
    contentions.push({
      resourceType: 'MEMORY_BUS_ARCHITECTURE',
      maxCapacity: 1,
      requestedDemands: 2,
      tradeoffSummary: 'DDR4 and DDR5 memory generations cannot be mixed in the same server backplane.',
      hypothesis: 'Initial configuration assumed mixed DDR4 and DDR5 memory modules could operate simultaneously.',
      detectedFailure: 'Mixing of DDR4 and DDR5 memory modules is physically and electrically incompatible.',
      backtrackedFrom: 'Mixed DDR4/DDR5 memory manifest',
      selfCorrectionAction: 'Branch Memory: Standardized all memory modules to uniform DDR5 Registered Smart Memory',
      resolutionDetails: 'Replaced DDR4 DIMMs with matched DDR5 Registered Smart Memory (P64707-F21) to ensure bus signal integrity.',
      branchId: 'branch_memory_uniform_ddr5'
    });
    branches.push({
      branchId: 'branch_memory_uniform_ddr5',
      title: 'Branch Memory: Standardize to Uniform DDR5 Memory Technology',
      targetRank: 1,
      tradeoffType: 'MEMORY_HOMOGENIZED',
      substitutions: [
        {
          action: 'HOMOGENIZE_MEMORY_GENERATION',
          originalSku: 'DDR4_MIXED_MODULE',
          injectedSku: 'P64707-F21',
          injectedDesc: 'HPE 64GB DDR5-5600 Registered Smart Memory',
          reasoning: 'Replaced DDR4 memory with uniform DDR5 Registered Smart Memory.'
        }
      ]
    });
  } else if (isInvalidChannel || isUnbalanced) {
    contentions.push({
      resourceType: 'MEMORY_BUS_ARCHITECTURE',
      maxCapacity: 1,
      requestedDemands: 1,
      tradeoffSummary: 'Unsupported asymmetric or unbalanced memory channel population violates memory controller interleaving.',
      hypothesis: 'Initial configuration assumed asymmetric DIMM distribution satisfied memory channel architecture.',
      detectedFailure: 'Unsupported asymmetric memory DIMM population violates memory controller channel pairing and interleaving.',
      backtrackedFrom: 'Asymmetric DIMM population',
      selfCorrectionAction: 'Branch Memory: Rebalanced DIMM population across uniform channels per socket',
      resolutionDetails: 'Realigned DIMMs to balanced canonical population across active memory channels, restoring 100% memory bus bandwidth.',
      branchId: 'branch_memory_balanced_channels'
    });
    branches.push({
      branchId: 'branch_memory_balanced_channels',
      title: 'Branch Memory: Rebalance DIMM Interleaving Channels',
      targetRank: 1,
      tradeoffType: 'MEMORY_BALANCED',
      substitutions: [
        {
          action: 'REBALANCE_DIMM_CHANNELS',
          reasoning: 'Realigned DIMMs evenly across memory channels per CPU socket.'
        }
      ]
    });
  }
}

/**
 * 3. PCIe Expansion & Riser Lanes Contention Arbitrator
 */
function _arbitratePcieAspect(items, evalResults, chassisInfo, contentions, branches) {
  const aspectChecks = evalResults.aspectChecks || {};
  const pcie = aspectChecks.pcieRiser || {};
  const missingDeps = evalResults.missingDependencies || [];
  const isExceedingActive = pcie.isExceedingActiveSlots || pcie.isExceedingTotalSlots;
  const needsPrimaryCable = pcie.needsPrimaryCableKit || missingDeps.some(d => d.key === 'PRIMARY_RISER_CABLE_KIT');
  const needsSecondaryRiser = pcie.needsSecondaryRiser;
  const needsSecondaryCable = pcie.needsSecondaryCableKit || missingDeps.some(d => d.key === 'SECONDARY_RISER_CABLE_KIT');

  if (isExceedingActive || needsSecondaryRiser) {
    contentions.push({
      resourceType: 'PCIE_EXPANSION_LANES',
      maxCapacity: pcie.activeSlotsAvailable || 2,
      requestedDemands: pcie.requiredPcieCards || 3,
      tradeoffSummary: 'PCIe card count exceeds electrically active slots without secondary riser and enablement cabling (CLIC Rule 81016755).',
      hypothesis: 'Initial configuration assumed base chassis riser provided sufficient active PCIe slots for installed adapters.',
      detectedFailure: 'Required PCIe cards exceed electrically active slots without secondary riser and enablement cabling (CLIC Rule 81016755).',
      backtrackedFrom: 'Base chassis riser with uncabled secondary slots',
      selfCorrectionAction: 'Branch PCIe: Injected Secondary Riser Kit and Secondary Cable Kit',
      resolutionDetails: 'Added Secondary Riser Kit and Cable Kit to activate additional physical slots and fulfill PCIe demand.',
      branchId: 'branch_pcie_secondary_riser'
    });
    branches.push({
      branchId: 'branch_pcie_secondary_riser',
      title: 'Branch PCIe: Injected Secondary Riser & Enablement Cable Kit',
      targetRank: 1,
      tradeoffType: 'SLOT_EXPANSION',
      substitutions: [
        {
          action: 'INJECT_SECONDARY_RISER_AND_CABLE',
          injectedSku: 'P56074-B21',
          injectedDesc: 'HPE ProLiant DL380 Secondary Riser Cable Kit',
          reasoning: 'Activated secondary PCIe slots to accommodate all installed cards.'
        }
      ]
    });
  } else if (needsSecondaryCable) {
    contentions.push({
      resourceType: 'PCIE_EXPANSION_LANES',
      maxCapacity: pcie.activeSlotsAvailable || 2,
      requestedDemands: pcie.requiredPcieCards || 3,
      tradeoffSummary: 'Secondary 3x16 Riser requires Secondary Cable Kit (P56074-B21) to enable Slot 4 (CLIC Rule 81170920).',
      hypothesis: 'Initial configuration assumed secondary riser Slot 4 was electrically cabled by default.',
      detectedFailure: 'Enabling Slot 4 on Secondary 3x16 Riser requires Secondary Cable Kit (CLIC Rule 81170920).',
      backtrackedFrom: 'Uncabled Secondary Riser Slot 4',
      selfCorrectionAction: 'Branch PCIe: Injected Secondary Riser Cable Kit (P56074-B21)',
      resolutionDetails: 'Injected Secondary Cable Kit (P56074-B21) to route motherboard PCIe lanes to Slot 4 without bundling an unnecessary physical riser board.',
      branchId: 'branch_pcie_secondary_cable'
    });
    branches.push({
      branchId: 'branch_pcie_secondary_cable',
      title: 'Branch PCIe: Secondary Riser Slot 4 Enablement Cable Kit',
      targetRank: 1,
      tradeoffType: 'SLOT_EXPANSION',
      substitutions: [
        {
          action: 'INJECT_SECONDARY_RISER_CABLE',
          injectedSku: 'P56074-B21',
          injectedDesc: 'HPE ProLiant DL380 Secondary Riser Cable Kit',
          reasoning: 'Cabled Slot 4 on Secondary 3x16 Riser without adding duplicate physical riser board.'
        }
      ]
    });
  } else if (needsPrimaryCable) {
    contentions.push({
      resourceType: 'PCIE_EXPANSION_LANES',
      maxCapacity: 1,
      requestedDemands: 1,
      tradeoffSummary: 'Primary 3x16 Riser requires Primary Cable Kit (P56073-B21) to enable Slot 1 (CLIC Rule 81356091).',
      hypothesis: 'Initial configuration assumed primary riser Slot 1 was electrically cabled by default.',
      detectedFailure: 'Enabling Slot 1 on Primary 3x16 Riser requires Primary Cable Kit (CLIC Rule 81356091).',
      backtrackedFrom: 'Uncabled Primary Riser Slot 1',
      selfCorrectionAction: 'Branch PCIe: Injected Primary Riser Cable Kit (P56073-B21)',
      resolutionDetails: 'Injected Primary Cable Kit (P56073-B21) to route motherboard PCIe lanes to Slot 1.',
      branchId: 'branch_pcie_primary_cable'
    });
    branches.push({
      branchId: 'branch_pcie_primary_cable',
      title: 'Branch PCIe: Primary Riser Slot 1 Enablement Cable Kit',
      targetRank: 1,
      tradeoffType: 'SLOT_ENABLEMENT',
      substitutions: [
        {
          action: 'INJECT_PRIMARY_RISER_CABLE',
          injectedSku: 'P56073-B21',
          injectedDesc: 'HPE ProLiant DL380 Primary Cable Kit',
          reasoning: 'Cabled Slot 1 on Primary 3x16 Riser.'
        }
      ]
    });
  }
}

/**
 * 4. Power Envelope & Headroom Contention Arbitrator
 */
function _arbitratePowerAspect(items, evalResults, _chassisInfo, contentions, branches) {
  const aspectChecks = evalResults.aspectChecks || {};
  const power = aspectChecks.powerEnvironment || {};
  const hasWattageDeficit = power.hasPsuWattageDeficit;
  const hasHeadroomDeficit = power.hasPsuHeadroomDeficit;
  const hasMixedEff = power.hasMixedEfficiencyPsus;
  const hasMixedAcDc = power.hasMixedAcDcPower;

  if (hasWattageDeficit || hasHeadroomDeficit) {
    const peakWatts = power.estimatedPeakWatts || power.estimatedNodeWattage || 1800;
    contentions.push({
      resourceType: 'POWER_ENVELOPE_CAPACITY',
      maxCapacity: power.activePsuWattage || 1000,
      requestedDemands: peakWatts,
      tradeoffSummary: `Estimated peak node load (${peakWatts}W) violates electrical safety headroom on active power supply.`,
      hypothesis: 'Initial configuration assumed selected PSU capacity provided adequate headroom for peak electrical consumption.',
      detectedFailure: `Estimated peak node load (${peakWatts}W) violates safe 80% electrical headroom.`,
      backtrackedFrom: 'Under-provisioned power supply selection',
      selfCorrectionAction: 'Branch Power: Upgraded power supplies to high-wattage Flex Slot PSUs (1600W/2200W)',
      resolutionDetails: `Upgraded to high-wattage Titanium/Platinum PSUs (P44712-B21 / P38997-B21) to safely cover peak electrical load (${peakWatts}W).`,
      branchId: 'branch_power_upgrade_psu'
    });
    branches.push({
      branchId: 'branch_power_upgrade_psu',
      title: 'Branch Power: Upgrade to High-Wattage Flex Slot Power Supplies',
      targetRank: 1,
      tradeoffType: 'POWER_UPGRADE',
      substitutions: [
        {
          action: 'UPGRADE_POWER_SUPPLY_CAPACITY',
          injectedSku: 'P38997-B21',
          injectedDesc: 'HPE 1600W Flex Slot Platinum Hot Plug Power Supply',
          reasoning: 'Replaced under-sized PSU with 1600W unit to satisfy 80% electrical safety headroom.'
        }
      ]
    });
  } else if (hasMixedEff || hasMixedAcDc) {
    contentions.push({
      resourceType: 'POWER_ENVELOPE_CAPACITY',
      maxCapacity: 1,
      requestedDemands: 2,
      tradeoffSummary: 'Mixing Platinum and Titanium power supply efficiencies or AC/DC inputs in the same server is strictly prohibited.',
      hypothesis: 'Initial configuration assumed disparate power supply models or efficiencies could form a redundant pair.',
      detectedFailure: 'Mixing Platinum and Titanium power supply efficiencies or AC and DC voltages violates electrical uniformity.',
      backtrackedFrom: 'Disparate power supply pair',
      selfCorrectionAction: 'Branch Power: Homogenized redundant power supplies to uniform efficiency/voltage rating',
      resolutionDetails: 'Standardized redundant power supplies to matching Platinum/Titanium efficiency pair.',
      branchId: 'branch_power_homogenize_psu'
    });
    branches.push({
      branchId: 'branch_power_homogenize_psu',
      title: 'Branch Power: Standardize to Uniform PSU Efficiency Pair',
      targetRank: 1,
      tradeoffType: 'POWER_HOMOGENIZED',
      substitutions: [
        {
          action: 'HOMOGENIZE_PSU_EFFICIENCY',
          injectedSku: 'P38997-B21',
          injectedDesc: 'HPE 1600W Flex Slot Platinum Hot Plug Power Supply',
          reasoning: 'Standardized both power supplies to matching Platinum efficiency rating.'
        }
      ]
    });
  }
}

/**
 * 5. Storage Cabling & Backplane Contention Arbitrator
 */
function _arbitrateStorageAspect(items, evalResults, chassisInfo, contentions, branches) {
  const aspectChecks = evalResults.aspectChecks || {};
  const storage = aspectChecks.storageTriMode || {};
  const missingDeps = evalResults.missingDependencies || [];
  const gen = chassisInfo?.gen || 'Gen11';
  const isGen12 = gen.includes('12');

  const needsExpander = storage.needsSasExpander || storage.isBackplaneCapacityExceeded || missingDeps.some(d => d.key === 'SAS_EXPANDER_CARD');
  const needsCapCable = storage.needsCapacitorCable || missingDeps.some(d => d.key === 'STORAGE_CONTROLLER_ENABLEMENT_CABLE');
  const needsBackplaneCable = storage.needsCableKit || storage.needsDriveCageForController || missingDeps.some(d => d.key === 'CONTROLLER_DRIVE_CABLE_KIT');

  if (needsExpander) {
    const expanderSku = isGen12 ? 'P55806-B21' : 'P48835-B21';
    contentions.push({
      resourceType: 'STORAGE_CABLING_AND_EXPANSION',
      maxCapacity: 8,
      requestedDemands: storage.driveCount || 16,
      tradeoffSummary: `Installed drive count exceeds direct controller port capacity, requiring SAS Expander Card (${expanderSku}).`,
      hypothesis: `Initial BOM assumed direct controller attachment could support ${storage.driveCount || 16} drives without expander hardware.`,
      detectedFailure: 'Installed drive count exceeds direct controller port capacity, requiring SAS Expander.',
      backtrackedFrom: `Direct-attach 8-port controller topology with ${storage.driveCount || 16} drives`,
      selfCorrectionAction: 'Branch Storage: Injected SAS Expander Card Kit to multiply controller backplane channels',
      resolutionDetails: `Allocated SAS Expander Card (${expanderSku}) to expand drive capacity across all cages.`,
      branchId: 'branch_storage_sas_expander'
    });
    branches.push({
      branchId: 'branch_storage_sas_expander',
      title: 'Branch Storage: SAS Expander Multi-Drive Channel Enablement',
      targetRank: 1,
      tradeoffType: 'STORAGE_EXPANSION',
      substitutions: [
        {
          action: 'INJECT_SAS_EXPANDER_CARD',
          injectedSku: expanderSku,
          injectedDesc: isGen12 ? 'HPE ProLiant Compute DL380 Gen12 Tri-Mode Switch Card Kit' : 'HPE ProLiant DL380 Gen11 SAS Expander Card Kit',
          reasoning: 'Expanded controller channels to address full drive cage capacity.'
        }
      ]
    });
  } else if (needsCapCable || needsBackplaneCable) {
    const cableSku = isGen12 ? 'P76456-B21' : 'P48918-B21';
    contentions.push({
      resourceType: 'STORAGE_CABLING_AND_EXPANSION',
      maxCapacity: 1,
      requestedDemands: 1,
      tradeoffSummary: `Storage controller requires physical Box 2 drive cage and backplane cabling kit (${cableSku}).`,
      hypothesis: 'Initial BOM assumed internal storage controller and cache battery could operate without dedicated chassis backplane cables.',
      detectedFailure: 'Storage controller or Smart Storage Battery requires dedicated controller enablement cable kit (CLIC Rule 81354652).',
      backtrackedFrom: 'Uncabled storage controller / battery installation',
      selfCorrectionAction: 'Branch Storage: Injected Storage Controller Enablement & Capacitor Telemetry Cable Kit',
      resolutionDetails: `Injected Controller Cable Kit (${cableSku}) to complete electrical and data routing.`,
      branchId: 'branch_storage_cable_kit'
    });
    branches.push({
      branchId: 'branch_storage_cable_kit',
      title: 'Branch Storage: Injected Controller Backplane Enablement Cable Kit',
      targetRank: 1,
      tradeoffType: 'STORAGE_CABLING',
      substitutions: [
        {
          action: 'INJECT_CONTROLLER_CABLE_KIT',
          injectedSku: cableSku,
          injectedDesc: isGen12 ? 'HPE ProLiant Compute DL380 Gen12 8SFF x2 PCIe Box 2 Controller Cable Kit' : 'HPE ProLiant Storage Controller Enablement Cable Kit',
          reasoning: 'Connected storage controller to drive cage backplane.'
        }
      ]
    });
  }
}

/**
 * 6. Mandatory CTO Management License Arbitrator (CLIC Rule 81322276)
 */
function _arbitrateSupportLicensingAspect(items, evalResults, _chassisInfo, contentions, branches) {
  const safeItems = Array.isArray(items) ? items : [];
  const aspectChecks = evalResults.aspectChecks || {};
  const support = aspectChecks.supportManufacturing || {};
  const missingDeps = evalResults.missingDependencies || [];

  const isExplicitLicenseDeficit = support.hasManagementLicense === false ||
    missingDeps.some(d => d.key === 'MANDATORY_CTO_MANAGEMENT_LICENSE' || d.key === 'MANAGEMENT_LICENSE');

  const isCtoServer = Boolean(support.hasCtoServer);
  const hasMgmtLicense = support.hasManagementLicense === true || safeItems.some(it => {
    const s = cleanBaseSKU(it.sku);
    const d = (it.description || '').toLowerCase();
    return ['R7A11AAE', 'E5Y43A', 'E5Y43AAE', 'R7A12AAE', 'S2E10AAE', 'S5E59AAE', 'S1A05A'].includes(s) ||
      d.includes('compute ops management') || d.includes('oneview');
  });

  if (isExplicitLicenseDeficit || (isCtoServer && !hasMgmtLicense)) {
    contentions.push({
      resourceType: 'MANDATORY_CTO_MANAGEMENT_LICENSE',
      maxCapacity: 1,
      requestedDemands: 0,
      tradeoffSummary: 'ProLiant CTO server lacks mandatory management license per CLIC Rule 81322276 (requires COM R7A11AAE or OneView E5Y43A).',
      hypothesis: 'Initial CTO bill of materials assumed chassis could be ordered without factory management entitlement.',
      detectedFailure: 'ProLiant CTO server lacks mandatory management license per CLIC Rule 81322276 (requires COM R7A11AAE or OneView E5Y43A).',
      backtrackedFrom: 'Bare CTO chassis without management entitlement',
      selfCorrectionAction: 'Branch Licensing: Injected mandatory HPE Compute Ops Management 3-year SaaS License (R7A11AAE)',
      resolutionDetails: 'Injected HPE Compute Ops Management 3-year SaaS Subscription (R7A11AAE) per CLIC Rule 81322276 to satisfy factory order validation.',
      branchId: 'branch_licensing_com_3yr'
    });
    branches.push({
      branchId: 'branch_licensing_com_3yr',
      title: 'Branch Licensing: HPE Compute Ops Management Mandatory 3-Year SaaS License',
      targetRank: 1,
      tradeoffType: 'LICENSING_MANDATE',
      substitutions: [
        {
          action: 'INJECT_MANDATORY_CTO_MANAGEMENT_LICENSE',
          injectedSku: 'R7A11AAE',
          injectedDesc: 'HPE Compute Ops Management Standard 3-year SaaS Subscription with Support',
          reasoning: 'Injected mandatory management license per CLIC Rule 81322276.'
        }
      ]
    });
  }
}

/**
 * Arbitrate contested shared physical resources between conflicting subsystems.
 *
 * @param {Array<object>} items - Raw or consolidated BOQ items
 * @param {object} evalResults - Evaluator aspect checks and missing dependencies
 * @param {object} chassisInfo - Detected base chassis metadata
 * @param {object} catalogData - Catalog rules and SKU directory
 * @returns {object} Arbitration result containing detected contentions and multi-branch solutions
 */
function arbitrateContestedResources(items = [], evalResults = {}, chassisInfo = {}, catalogData = null) {
  const safeItems = Array.isArray(items) ? items : [];
  const contentions = [];
  const branches = [];

  const effectiveChassisInfo = typeof evalResults === 'string'
    ? { chassis: evalResults, gen: (evalResults.match(/Gen(\d+)/i)?.[0] || 'Gen11') }
    : (chassisInfo || {});
  const effectiveEvalResults = (evalResults && typeof evalResults === 'object') ? evalResults : {};
  const aspectChecks = effectiveEvalResults.aspectChecks || {};
  const ocpAspect = aspectChecks.networkingOcp || {};
  const duals = resolveFormFactorDuals(effectiveChassisInfo?.gen || effectiveChassisInfo?.chassis || 'Gen11');

  _arbitrateOcpSlotContention(safeItems, ocpAspect, effectiveChassisInfo, duals, contentions, branches);
  _arbitrateRearBootDeviceContention(safeItems, duals, contentions, branches);
  _arbitrateThermalAspect(safeItems, effectiveEvalResults, effectiveChassisInfo, contentions, branches);
  _arbitrateMemoryAspect(safeItems, effectiveEvalResults, effectiveChassisInfo, contentions, branches);
  _arbitratePcieAspect(safeItems, effectiveEvalResults, effectiveChassisInfo, contentions, branches);
  _arbitratePowerAspect(safeItems, effectiveEvalResults, effectiveChassisInfo, contentions, branches);
  _arbitrateStorageAspect(safeItems, effectiveEvalResults, effectiveChassisInfo, contentions, branches);
  _arbitrateSupportLicensingAspect(safeItems, effectiveEvalResults, effectiveChassisInfo, contentions, branches);

  const selfCorrectionTrail = _buildArbitrationSelfCorrectionTrail(contentions, branches, effectiveEvalResults);

  return {
    hasContentions: contentions.length > 0,
    contentionsCount: contentions.length,
    contentions,
    branchesCount: branches.length,
    branches,
    selfCorrectionTrail,
    formFactorDualsEvaluated: duals.length
  };
}

module.exports = {
  arbitrateContestedResources,
  resolveFormFactorDuals,
  _arbitrateThermalAspect,
  _arbitrateMemoryAspect,
  _arbitratePcieAspect,
  _arbitratePowerAspect,
  _arbitrateStorageAspect,
  _arbitrateSupportLicensingAspect,
  FORM_FACTOR_DUALS: DEFAULT_FORM_FACTOR_DUALS
};
