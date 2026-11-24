'use strict';
/**
 * scripts/lib/boq/evaluators/power_memory_support_rules.js — Power, Support, Memory, Chassis, Alletra, StoreEver & Defaults Rules
 */

const fs = require('fs');
const path = require('path');
const { cleanBaseSKU } = require('../../catalog/sku.js');
const { resolveGpuCableCapacity } = require('../../aspects/pcie_riser.js');
const { isServerPlatform, resolveGenerationProfile } = require('./compute_storage_rules.js');

let _cachedChassisMap = null;
function getCachedChassisMap() {
  if (!_cachedChassisMap) {
    try {
      const mapPath = path.join(__dirname, '..', '..', '..', 'config', 'chassis_map.json');
      _cachedChassisMap = fs.existsSync(mapPath) ? JSON.parse(fs.readFileSync(mapPath, 'utf8')) : {};
    } catch (_) {
      _cachedChassisMap = {};
    }
  }
  return _cachedChassisMap;
}

function _checkMixedPowerTypes(power, serverCount, errors, mathDeductions) {
  if (power.hasMixedAcDcPower) {
    const reason = `Power Architecture Conflict: Configuration mixes AC power supplies (${power.acPsuCount}) and -48VDC power supplies (${power.dcPsuCount}) in the same chassis enclosure. AC and DC power supplies cannot be mixed within the same backplane.`;
    errors.push(reason);
    mathDeductions.push(reason);
  }
  const isMultiClusterMatchedPsuTender = serverCount > 1 &&
    ((power.platinumPsuCount || 0) >= 2 && (power.titaniumPsuCount || 0) >= 2) &&
    ((power.platinumPsuCount || 0) % 2 === 0) && ((power.titaniumPsuCount || 0) % 2 === 0);
  if (power.hasMixedEfficiencyPsus && !isMultiClusterMatchedPsuTender) {
    const reason = 'Power Architecture Conflict: Configuration mixes Platinum and Titanium power supply efficiencies in the same server. Redundant power supplies must have matching efficiency ratings.';
    errors.push(reason);
    mathDeductions.push(reason);
  }
}

function _checkDcLugKit(power, serverCount, mandatorySkus, errors, mathDeductions, missingDependencies) {
  if (!power.hasDcPowerSupply || power.hasDcLugKit) return;
  const reason = 'Power Math Failed: -48VDC Power Supply requires DC Power Cable Lug Kit.';
  errors.push(reason);
  mathDeductions.push(reason);
  missingDependencies.push({
    key: 'DC_LUG_KIT', rule: 'DC Power Supply Cable Rule',
    sku: mandatorySkus.DC_LUG_KIT.sku, description: mandatorySkus.DC_LUG_KIT.name,
    quantity: serverCount, reasoning: reason
  });
}

function _checkPsuRedundancy(power, serverCount, mandatorySkus, warnings, missingDependencies, items, chassisInfo, cleanBaseFn) {
  const isTapeLibrary = chassisInfo?.family === 'StoreEver' || items?.some(it => (it.description || '').toLowerCase().includes('msl3040') || it.sku === 'Q6Q62C');
  if (isTapeLibrary) return;
  if (power.psuCount / serverCount !== 1) return;

  const reason = 'Power Redundancy Warning: Single power supply configured per node. Dual-socket enterprise nodes recommend 2x redundant PSUs.';
  warnings.push(reason);
  const existingPsu = items.find(it => { const d = (it.description || '').toLowerCase(); return d.includes('power supply') || d.includes('flex slot') || d.includes('psu'); });
  missingDependencies.push({
    key: 'POWER_SUPPLY_REDUNDANCY', rule: 'Power Supply N+1 Redundancy Rule',
    sku: existingPsu ? cleanBaseFn(existingPsu.sku) : (mandatorySkus?.POWER_SUPPLY?.sku || 'P38997-B21'),
    description: existingPsu?.description || 'HPE 1600W Flex Slot Platinum Hot Plug Power Supply',
    quantity: serverCount, reasoning: reason
  });
}

function _checkGpuPowerCables(pcie, power, serverCount, mandatorySkus, warnings, missingDependencies, items, chassisInfo) {
  if (!pcie.needsGpuPowerCableKit) return;
  const isGen12 = resolveGenerationProfile(chassisInfo, items).isGen12;
  const gpuCableSku = mandatorySkus?.GPU_POWER_CABLE_KIT?.sku || (power.isDl380aGpuChassis ? 'P74700-B21' : (isGen12 ? 'P76450-B21' : 'P48816-B21'));
  const gpuCableDesc = mandatorySkus?.GPU_POWER_CABLE_KIT?.name || (power.isDl380aGpuChassis ? 'HPE ProLiant Compute DL380a Gen12 GPU 16-pin FIO Cable Kit' : (isGen12 ? 'HPE ProLiant DL380 Gen12 GPU Auxiliary Power Cable Kit' : 'HPE ProLiant DL380 Gen11 GPU Power Cable Kit'));
  const cableCapacity = resolveGpuCableCapacity(gpuCableSku, gpuCableDesc, mandatorySkus);
  const requiredKitsPerNode = Math.ceil((pcie.gpuCount - pcie.gpuPowerCableKitCount) / cableCapacity);
  const requiredTotalKits = Math.ceil(pcie.gpuCount / cableCapacity);
  const ratioNote = cableCapacity > 1 ? `, 1 kit per ${cableCapacity} GPUs` : '';

  const reason = power.isDl380aGpuChassis
    ? `GPU Power Math: ${pcie.gpuCount} front-bay GPU accelerator(s) detected on DL380a Gen12. Requires ${requiredTotalKits} GPU 16-pin FIO Cable Kits (${gpuCableSku}${ratioNote}). Existing cable capacity covers ${pcie.gpuPowerCableKitCount} GPU(s).`
    : (cableCapacity > 1
      ? `GPU Power Math: ${pcie.gpuCount} PCIe GPU accelerator(s) detected. Requires ${requiredTotalKits} GPU Auxiliary Power Cable Kit(s) (${gpuCableSku}${ratioNote}) to connect to power distribution board. Existing cable capacity covers ${pcie.gpuPowerCableKitCount} GPU(s).`
      : `GPU Power Math: ${pcie.gpuCount} PCIe GPU accelerator(s) detected. Requires ${pcie.gpuCount} GPU Auxiliary Power Cable Kit(s) (${gpuCableSku}) to connect to power distribution board. Found ${pcie.gpuPowerCableKitCount}.`);
  warnings.push(reason);
  missingDependencies.push({ key: 'GPU_AUX_POWER_CABLE_KIT', rule: 'GPU Accelerator Auxiliary Power Rule', sku: gpuCableSku, description: gpuCableDesc, quantity: requiredKitsPerNode * serverCount, reasoning: reason });
}

function _checkMultiGpuTitanium(power, pcie, serverCount, items, warnings, missingDependencies) {
  let h100Count = 0;
  for (const it of items) {
    if (it.description && (it.description.toLowerCase().includes('h100') || it.sku === 'S0E21A')) h100Count += (it.quantity || 1);
  }
  if (!power.isDl380aGpuChassis && (pcie.gpuCount >= 4 || h100Count >= 2) && !power.hasTitaniumPsu) {
    const reason = 'INV-27: Multi-GPU Thermal Envelope: 4x+ GPUs or dual high-end GPUs mandate dual 1800W/2200W Titanium PSUs (P44712-B21).';
    warnings.push(reason);
    missingDependencies.push({ key: 'TITANIUM_PSU_MULTI_GPU', rule: 'Multi-GPU Titanium PSU Mandate (INV-27)', sku: 'P44712-B21', description: '1800W-2200W Titanium Power Supply Kit', quantity: 2 * serverCount, reasoning: reason });
  }
}

function _checkSpecialtyChassisPower(power, errors, mathDeductions) {
  if (power.hasDl380aGpuPsuShortage) {
    const reason = `DL380a GPU Power Matrix Failed: ${power.dl380aGpuModeCapacity}DW mode requires ${power.requiredDl380aPsuCountPerServer} identical 2400W or 3200W power supplies per server (${power.requiredDl380aPsuCount} total); found ${power.psuCount} PSU(s)${power.hasMixedPsuWattages ? ' with mixed wattages' : ` at ${power.maxPsuWattage}W maximum`}.`;
    errors.push(reason);
    mathDeductions.push(reason);
  }
  if (power.hasSynergyRedundantPowerError) {
    const reason = `Synergy 12000 Frame Power Error: Synergy frame requires exactly 6x 2650W Titanium Power Supplies for redundant power envelope. Found ${power.synergyTitanium2650wCount}.`;
    errors.push(reason);
    mathDeductions.push(reason);
  }
}

function _checkHighLineAndLot9(power, serverCount, mandatorySkus, warnings, missingDependencies) {
  if (power.needsHighLine220v) {
    warnings.push(`Power Derating Advisory: Estimated node power draw (${power.estimatedNodeWattage}W) requires 200V-240V high-line utility circuits to prevent single-PSU derating on ${power.maxPsuWattage}W power supplies.`);
  }
  if (power.needsCeRemovalKit) {
    const ceRemovalSku = mandatorySkus.CE_REMOVAL_KIT?.sku || 'P35876-B21';
    const reason = `EU Lot 9 Compliance Advisory: High-draw configuration with Platinum PSUs requires 96% Titanium PSUs or CE Mark Removal FIO Enablement Kit (${ceRemovalSku}) for non-EU deployment.`;
    warnings.push(reason);
    missingDependencies.push({ key: 'CE_MARK_REMOVAL_KIT', rule: 'EU Lot 9 / CE Mark Regulatory Enablement Rule', sku: ceRemovalSku, description: mandatorySkus.CE_REMOVAL_KIT?.name || 'HPE CE Mark Removal FIO Enablement Kit', quantity: serverCount, reasoning: reason });
  }
}

function validateSupportRules(ctx) {
  const { support, serverCount, warnings, errors, mathDeductions, missingDependencies } = ctx;
  if (support.hasContradictoryInstallServices) {
    const onsiteSkus = (support.onsiteInstallItems || []).map(i => i.sku).join(', ');
    const remoteSkus = (support.remoteInstallItems || []).map(i => i.sku).join(', ');
    const reason = `Contradictory Support Services: Configuration contains both Onsite Installation/Startup Service (${onsiteSkus || 'Onsite'}) and Remote Deployment Service (${remoteSkus || 'Remote'}). Onsite and remote deployment models are mutually exclusive within the same solution.`;
    errors.push(reason);
    mathDeductions.push(reason);
  }
  if (support.hasSaasWithoutHardwareSupport) {
    warnings.push('SaaS vs Hardware Support Delineation: Configuration includes SaaS software subscriptions without physical Pointnext hardware support/warranty (Tech Care/Foundation Care). SaaS cloud management cannot substitute for physical server break-fix maintenance coverage.');
  }
  if (support.hasManagementSupportTermMismatch) {
    warnings.push(`Management vs Hardware Support Term Alignment: COM Ops / management SaaS term (${support.managementTermYears}-year) does not match physical Tech Care hardware support term (${support.hardwareSupportTermYears}-year). Align subscription and support durations unless staged renewal is intentional.`);
  }
  if (support.hasDiscontinuedIloLicense) {
    warnings.push('Discontinued Standalone iLO License: Legacy iLO Advanced SKU (512485-B21) is barred on modern Gen11/Gen12 platforms; use active iLO Advanced (BD505A) or qualifying Compute Ops Management SaaS (R7A11AAE / R7A12AAE).');
  }
  if (support.isManagementLicenseUnderprovisioned) warnings.push(`Management License Quantity Deficit (CLIC Rule 81322276 / INV-179): Configured ${support.managementLicenseCount} management license(s) for ${serverCount} server node(s); requires ${support.missingManagementLicenses} additional license(s).`);
  if (support.isIloLicenseUnderprovisioned) warnings.push(`iLO License Quantity Deficit (INV-179): Configured ${support.iloLicenseCount} iLO license(s) for ${serverCount} server node(s); requires ${support.missingIloLicenses} additional license(s).`);
  if (support.isChildSupportUnderprovisioned) warnings.push(`Hardware Support Child SKU Quantity Deficit (INV-32): Configured ${support.childSupportCount} child support unit(s) for ${serverCount} server node(s).`);

  if (support.needsAdditionalWindowsCores) {
    const reason = `OS Licensing Math: Server has ${support.detectedCpuCores} physical cores (${support.requiredWindowsCores} required across ${serverCount} node(s)) but only ${support.totalWindowsLicensedCores || support.totalCoveredWindowsCores} Windows Server licensed cores. Requires ${support.missingCoreLicenses} additional core license packs.`;
    warnings.push(reason);
    missingDependencies.push({ key: 'WINDOWS_CORE_LICENSES', rule: 'Microsoft Windows Server Core Licensing Minimums (INV-28)', sku: 'P46200-B21', description: 'Microsoft Windows Server Additional Core License Pack (16-core)', quantity: Math.ceil(support.missingCoreLicenses / 16), reasoning: reason });
  }
  if (support.needsAdditionalVmwareCores) {
    const reason = `VMware Licensing Math: Configuration requires ${support.requiredVmwareCores} licensed cores (16 cores/socket minimum) but only ${support.vmwareLicensedCores} cores are licensed. Requires ${support.missingVmwareCores} additional VMware core licenses.`;
    warnings.push(reason);
    missingDependencies.push({ key: 'VMWARE_CORE_LICENSES', rule: 'VMware Core Licensing Minimums & Per-Core Multipliers', sku: 'VMW-VCF-CORE', description: 'VMware Cloud Foundation / vSphere Per-Core Subscription License', quantity: support.missingVmwareCores, reasoning: reason });
  }
  if (support.needsAdditionalLinuxSubscriptions) {
    const reason = `Linux OS Licensing Math: Server has ${support.detectedCpuSockets} socket(s) requiring ${support.requiredLinuxSubscriptions} 1-2 socket subscription(s). Found ${support.linuxSubscriptions}.`;
    warnings.push(reason);
    missingDependencies.push({ key: 'LINUX_OS_SUBSCRIPTIONS', rule: 'Red Hat Enterprise Linux / SLES 1-2 Socket Subscription Sizing', sku: 'RHEL-2S-SUB', description: 'Red Hat Enterprise Linux Server 1-2 Socket Standard Subscription', quantity: support.missingLinuxSubscriptions, reasoning: reason });
  }
  if (Array.isArray(support.unsolicitedOptionalItems)) {
    support.unsolicitedOptionalItems.forEach(item => warnings.push(`Unsolicited Optional Service / Software (INV-32): SKU ${item.sku} (${item.description}) detected (${item.extendedPriceUsd || 0}). Optional startup service or add-on software was not explicitly requested by customer.`));
  }
}

function validateBaseChassisRules(ctx) {
  const { items, serverCount, compute, memory, storage, power, mandatorySkus, errors, mathDeductions, missingDependencies, CTO_BASE_SKUS, chassisInfo, cleanBaseSKU: cleanFn } = ctx;
  if (!isServerPlatform(chassisInfo, ctx.topology)) return;
  const hasBaseChassis = items.some(it => { const clean = cleanFn(it.sku); return clean === chassisInfo.baseSku || CTO_BASE_SKUS.has(clean); });
  const hasNoDriveFioKit = items.some(it => cleanFn(it.sku) === mandatorySkus.NO_DRIVE_FIO_KIT.sku);
  const hasDriveCageKit = storage.hasDriveCage || items.some(it => ['P75741-B21', 'P76449-B21', 'P75740-B21', 'P48813-B21'].includes(cleanFn(it.sku)));

  if (hasBaseChassis && compute && compute.cpuCount === 0) { const r = `Unbuildable Server Configuration: Server base chassis (${chassisInfo.baseSku || 'CTO'}) requires at least 1 processor (0 CPUs configured).`; errors.push(r); mathDeductions.push(r); }
  if (hasBaseChassis && memory && memory.memoryCount === 0) { const r = `Unbuildable Server Configuration: Server base chassis (${chassisInfo.baseSku || 'CTO'}) requires memory DIMMs (0 RAM configured).`; errors.push(r); mathDeductions.push(r); }
  if (hasBaseChassis && power && power.psuCount === 0) { const r = `Unbuildable Server Configuration: Server base chassis (${chassisInfo.baseSku || 'CTO'}) requires power supplies (0 PSUs configured).`; errors.push(r); mathDeductions.push(r); }
  if (hasBaseChassis && storage.driveCount === 0 && !hasNoDriveFioKit && !hasDriveCageKit) {
    const reason = `CLIC Rule 81392308: Chassis ${chassisInfo.baseSku || 'CTO'} without drives requires ${mandatorySkus.NO_DRIVE_FIO_KIT.sku} FIO Kit.`;
    mathDeductions.push(reason);
    missingDependencies.push({ key: 'CLIC_NO_DRIVE_FIO', rule: 'CLIC Rule 81392308: Front Cage / No Drive FIO Requirement', sku: mandatorySkus.NO_DRIVE_FIO_KIT.sku, description: mandatorySkus.NO_DRIVE_FIO_KIT.name, quantity: serverCount, reason: 'UNBUILDABLE CONFIGURATION (Rule 81392308): Base chassis ordered without drives requires FIO Kit or an explicit Front Drive Cage Kit.', reasoning: reason });
  }
}

function validateAlletraRules(ctx) {
  const { storage, errors, warnings, mathDeductions, missingDependencies } = ctx;
  if (storage.hasMissingControllerNode) { const r = `Alletra Architecture Error: Alletra storage array requires dual (2x) controller nodes for active-active high-availability. Found ${storage.controllerNodeCount}.`; errors.push(r); mathDeductions.push(r); }
  if (storage.hasAsymmetricHbas) warnings.push(`Alletra HBA Symmetry Warning: Host Bus Adapters must be symmetrically configured across dual controller nodes (${storage.hbaCount} HBAs found, even count required).`);
  if (storage.missingDaisyChainCables > 0) {
    const reason = `Alletra Cabling Requirement: Expansion shelves require 2x SAS daisy-chain cables per shelf (${storage.expansionShelfCount * 2} cables needed, found ${storage.sasDaisyChainCableCount}).`;
    warnings.push(reason);
    missingDependencies.push({ key: 'SAS_DAISY_CHAIN_CABLE', rule: 'Alletra Expansion Shelf Daisy-Chain Cabling', sku: 'P40243-B21', description: 'HPE SAS Mini-HD to Mini-HD Cable', quantity: storage.missingDaisyChainCables, reasoning: reason });
  }
  if (storage.insufficientRaid6Drives) { const r = `Alletra RAID 6 Constraint: RAID 6 disk groups require a minimum of 6 SSDs. Found ${storage.ssdCount}.`; errors.push(r); mathDeductions.push(r); }
  if (storage.insufficientRaid10Drives) { const r = `Alletra RAID 10 Constraint: RAID 10 disk groups require a minimum of 4 SSDs. Found ${storage.ssdCount}.`; errors.push(r); mathDeductions.push(r); }
}

function validateStoreEverRules(ctx) {
  const { storage, warnings, missingDependencies } = ctx;
  if (storage.needsMiniSasHdCable) {
    const reason = `StoreEver SAS Cabling Math: ${storage.ltoSasDriveCount} SAS LTO tape drive(s) require external Mini-SAS HD cables.`;
    warnings.push(reason);
    missingDependencies.push({ key: 'MINI_SAS_HD_CABLE', rule: 'StoreEver LTO SAS Drive Host Cabling', sku: '716189-B21', description: 'HPE 2.0m External Mini-SAS High Density to Mini-SAS HD Cable', quantity: storage.ltoSasDriveCount, reasoning: reason });
  }
  if (storage.needsFcTransceiver) {
    const reason = `StoreEver FC Transceiver Math: ${storage.ltoFcDriveCount} Fibre Channel LTO tape drive(s) require 8Gb/16Gb optical transceivers.`;
    warnings.push(reason);
    missingDependencies.push({ key: 'FC_OPTICAL_TRANSCEIVER_TAPE', rule: 'StoreEver LTO FC Drive Optical Transceiver', sku: 'AJ716B', description: 'HPE 8Gb Short Wave B-Series Fibre Channel 1 Pack SFP+ Transceiver', quantity: storage.ltoFcDriveCount, reasoning: reason });
  }
  if (storage.exceedsSlotCapacity) warnings.push(`StoreEver Capacity Advisory: ${storage.dataCartridgeCount} data cartridges exceeds total library capacity (${storage.totalMsl3040Slots} slots).`);
}

function validateMemoryRules(ctx) {
  const { memory, compute, errors, warnings, mathDeductions, missingDependencies } = ctx;
  if (memory.hasMixedDdrGeneration) { const r = 'Memory Generation Conflict: Mixing DDR4 and DDR5 memory modules in the same server is physically incompatible.'; errors.push(r); mathDeductions.push(r); }
  if (memory.hasMixedMemoryTypes) { const r = 'Memory Architecture Conflict: Mixing RDIMM, LRDIMM, or MRDIMM memory modules in the same system is strictly unsupported.'; errors.push(r); mathDeductions.push(r); }
  if (memory.hasBtoMemoryInCto) {
    memory.btoMemoryViolations.forEach(v => {
      errors.push(v.reason);
      mathDeductions.push(v.reason);
      missingDependencies.push({ key: `FIO_MEMORY_${v.fioSku}`, rule: 'CLIC Option Type Constraint: FIO Memory Required in CTO Base Model', sku: v.fioSku, description: `HPE Factory Integrated Option (FIO) Replacement for ${v.btoSku}`, quantity: v.quantity, reason: v.reason, reasoning: v.reason });
    });
  }
  if (memory.memoryCount > 0 && !memory.isSupportedPopulation) {
    const reason = `Memory Math Failed: ${memory.memoryCount} DIMMs across ${compute.cpuCount || 2} CPUs is an unsupported asymmetric count.`;
    warnings.push(reason);
    mathDeductions.push(reason);
  } else if (memory.memoryCount > 0 && !memory.isBalancedChannel) {
    warnings.push(`Memory Interleaving Advisory: ${memory.memoryCount} DIMMs across ${compute.cpuCount || 2} CPUs (${memory.dimmsPerCpu} DIMMs/socket) is a supported minimal population. Populating all ${memory.channelsPerCpu} channels per socket achieves maximum interleaving bandwidth.`);
  }
}

function _isVerifiedChassisComponent(c, baseKey) {
  return c.isVerified === true && c.sourceCitation && /^[a-f0-9]{64}$/i.test(c.evidence?.artifactSha256 || '') && c.evidence?.page && c.evidence?.baseSku === baseKey;
}

function _evaluateItemAgainstChassisDefaults(item, chassisDefaults, baseKey, warnings, redundantDefaults) {
  const description = (item.description || '').toLowerCase();
  const clean = cleanBaseSKU(item.sku);
  const isStdFan = description.includes('standard fan') || (description.includes('fan kit') && !description.includes('high perf') && !description.includes('performance') && !description.includes('p48820') && !description.includes('p40502'));
  const isStdHeatsink = description.includes('standard heatsink') || (description.includes('heat sink') && !description.includes('performance') && !description.includes('high perf') && !description.includes('p48818') && !description.includes('p74792'));
  const isLomNic = description.includes('1gb 4-port') && description.includes('bcm5719') && !description.includes('pcie');
  if (!isStdFan && !isStdHeatsink && !isLomNic) return;

  const includedDefault = chassisDefaults.find(c => (isStdFan && c.category === 'Cooling / Thermal' && c.description.includes('Fan')) || (isStdHeatsink && c.category === 'Cooling / Thermal' && c.description.includes('Heatsink')) || (isLomNic && c.category === 'Network Adapter'));
  if (!includedDefault || !_isVerifiedChassisComponent(includedDefault, baseKey)) return;

  if (includedDefault.isManagementOnly) {
    warnings.push(`Chassis Default Advisory: Base chassis ${baseKey} includes factory-embedded management port (${includedDefault.description}${includedDefault.sourceCitation ? ' per ' + includedDefault.sourceCitation : ''}). Production host networking adapters remain required.`);
    return;
  }
  const citation = includedDefault.sourceCitation ? ` per ${includedDefault.sourceCitation}` : '';
  const advisory = `Chassis Default Advisory: SKU ${clean} (${item.description}) is already factory-included with base chassis ${baseKey} (${includedDefault.description}${citation}). Redundant line item not required unless explicitly ordered as a spare.`;
  warnings.push(advisory);
  redundantDefaults.push({ sku: clean, description: item.description, includedDefault: includedDefault.description, sourceCitation: includedDefault.sourceCitation || null, advisory });
}

function collectChassisDefaultAdvisories(items, chassisInfo, warnings, skipGraphValidation) {
  if (skipGraphValidation) return { chassisDefaults: [], redundantDefaults: [] };
  const redundantDefaults = [];
  let chassisDefaults = [];
  try {
    const fullMap = getCachedChassisMap();
    const includedMap = fullMap.chassis_included_components || {};
    const baseKey = chassisInfo.baseSku || Object.keys(includedMap).find(key => key === chassisInfo.sku || includedMap[key].model === chassisInfo.model);
    chassisDefaults = ((baseKey && includedMap[baseKey]?.includedComponents) || []).filter(c => _isVerifiedChassisComponent(c, baseKey));
    if (chassisDefaults.length > 0) {
      for (const item of items) _evaluateItemAgainstChassisDefaults(item, chassisDefaults, baseKey, warnings, redundantDefaults);
    }
  } catch (_) {}
  return { chassisDefaults, redundantDefaults };
}

module.exports = {
  getCachedChassisMap,
  _checkMixedPowerTypes,
  _checkDcLugKit,
  _checkPsuRedundancy,
  _checkGpuPowerCables,
  _checkMultiGpuTitanium,
  _checkSpecialtyChassisPower,
  _checkHighLineAndLot9,
  validateSupportRules,
  validateBaseChassisRules,
  validateAlletraRules,
  validateStoreEverRules,
  validateMemoryRules,
  collectChassisDefaultAdvisories
};
