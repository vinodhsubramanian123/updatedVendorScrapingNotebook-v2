'use strict';
/**
 * scripts/lib/boq/evaluators/compute_storage_rules.js — Networking, PCIe, Thermal & Storage Domain Rule Validators
 */

const { DEFAULT_MANDATORY_SKUS, getStorageRoleSets } = require('../../catalog/catalog_rules.js');

function isServerPlatform(chassisInfo, topology) {
  const family = String(chassisInfo?.family || '').toLowerCase();
  const formFactor = String(chassisInfo?.formFactor || '').toLowerCase();
  const domain = String(topology?.domain || '').toLowerCase();
  if (domain && domain !== 'server' && domain !== 'ai_cluster' && domain !== 'unknown') return false;
  if (family === 'storeever' || family === 'san' || family === 'alletra') return false;
  if (formFactor.includes('switch') || formFactor.includes('array')) return false;
  return true;
}

function resolveGenerationProfile(chassisInfo, items = []) {
  const genStr = String(chassisInfo?.gen || '').toLowerCase();
  const modelStr = String(chassisInfo?.model || '').toLowerCase();
  const idStr = String(chassisInfo?.id || '').toLowerCase();
  const itemsText = items.map(it => String(it.description || '')).join(' ').toLowerCase();
  const hasGen = tag => genStr.includes(`gen${tag}`) || genStr.includes(tag) || modelStr.includes(`gen${tag}`) || idStr.includes(`gen${tag}`) || itemsText.includes(`gen${tag}`);
  return { isGen12: hasGen('12'), isGen11: hasGen('11'), isGen10: hasGen('10') };
}

function validateNetworkingRules(ctx) {
  const { network, serverCount, mandatorySkus, errors, mathDeductions, warnings, missingDependencies } = ctx;
  const ocpSlotsClusterMax = network.maxOcpSlots * serverCount;
  if (network.ocpAdapterCount > ocpSlotsClusterMax) {
    const reason = `Networking Math Failed (INV-39): ${network.ocpAdapterCount} OCP adapters exceeds maximum ${ocpSlotsClusterMax} OCP slot(s) across ${serverCount} server(s). Pivot OCP Storage Controller to PCIe form factor (e.g. MR416i-p).`;
    errors.push(reason);
    mathDeductions.push(reason);
    missingDependencies.push({
      key: 'OCP_SLOT_EXCEEDED',
      rule: 'OCP Physical Slot Limit Rule (INV-39)',
      sku: 'MR416I-P-PIVOT',
      description: 'Pivot OCP controller to PCIe form factor',
      quantity: network.ocpAdapterCount - ocpSlotsClusterMax,
      reasoning: reason
    });
  }

  if (network.hasConflictingOcpCables) {
    const cpu1OcpSku = mandatorySkus?.CPU1_OCP_CABLE?.sku || 'CPU1_OCP';
    const cpu2OcpSku = mandatorySkus?.CPU2_OCP_CABLE?.sku || 'CPU2_OCP';
    const reason = `CLIC Rule 81355854 Failed: CPU1/OCP2 Enablement Kit (${cpu1OcpSku}) and CPU2/OCP2 Enablement Kit (${cpu2OcpSku}) cannot be selected together. Unselect ${cpu1OcpSku} on dual-CPU servers.`;
    errors.push(reason);
    mathDeductions.push(reason);
  }
  if (network.needsOcpEnablementCable) {
    const enableSku = mandatorySkus?.CPU1_OCP_CABLE?.sku || mandatorySkus?.CPU2_OCP_CABLE?.sku || 'P72203-B21';
    const enableDesc = mandatorySkus?.CPU1_OCP_CABLE?.name || mandatorySkus?.CPU2_OCP_CABLE?.name || 'CPU-to-OCP Enablement Cable Kit';
    missingDependencies.push({
      key: 'CPU1_OCP_CABLE',
      rule: 'Dual-OCP Slot Enablement Rule',
      sku: enableSku,
      description: enableDesc,
      quantity: serverCount,
      reasoning: `Dual OCP adapters require ${enableSku} to enable the second rear OCP slot.`
    });
  }

  const { resolveComponentByRole } = require('../../taxonomy/sku_resolver.js');
  const res32 = resolveComponentByRole(ctx.catalogData, { role: 'Transceiver', specs: { speedGb: 32, protocol: 'fibre channel' }, preferredSku: 'AJ718A' });
  const res64 = resolveComponentByRole(ctx.catalogData, { role: 'Transceiver', specs: { speedGb: 64, protocol: 'fibre channel' }, preferredSku: 'R7W32A' });

  if (network.isMissing32GbTransceivers) {
    const reason = `SAN Networking Math: 32Gb Fibre Channel HBAs (${network.fcHbaPortCount32Gb} ports) require 32Gb SFP28/SFP+ optical transceivers. Found ${network.transceiverCount32Gb}.`;
    warnings.push(reason);
    missingDependencies.push({
      key: 'FC_32GB_TRANSCEIVER', rule: 'Fibre Channel Optical Transceiver Requirement',
      sku: (res32.isResolved && res32.sku) ? res32.sku : null, isResolved: Boolean(res32.isResolved && res32.sku),
      requirementTag: res32.requirementTag || 'REQUIREMENT_TRANSCEIVER_32GB',
      description: res32.description || '32Gb Short Wave SFP+ Transceiver Enablement Requirement',
      price: res32.hasPrice ? res32.price : null,
      quantity: Math.max(0, network.fcHbaPortCount32Gb - network.transceiverCount32Gb), reasoning: reason
    });
  }
  if (network.isMissing64GbTransceivers) {
    const reason = `SAN Networking Math: 64Gb Fibre Channel HBAs (${network.fcHbaPortCount64Gb} ports) require 64Gb optical transceivers. Found ${network.transceiverCount64Gb}.`;
    warnings.push(reason);
    missingDependencies.push({
      key: 'FC_64GB_TRANSCEIVER', rule: '64Gb Fibre Channel Optical Transceiver Requirement',
      sku: (res64.isResolved && res64.sku) ? res64.sku : null, isResolved: Boolean(res64.isResolved && res64.sku),
      requirementTag: res64.requirementTag || 'REQUIREMENT_TRANSCEIVER_64GB',
      description: res64.description || '64Gb Short Wave SFP56 Transceiver Enablement Requirement',
      price: res64.hasPrice ? res64.price : null,
      quantity: Math.max(0, network.fcHbaPortCount64Gb - network.transceiverCount64Gb), reasoning: reason
    });
  }
  if (network.isMissingOpticalPatchCables) {
    warnings.push(`SAN Cabling Advisory: Active optical transceivers (${network.activeOpticalTransceiverCount}) require corresponding OM4 LC-LC fiber optic patch cables. Found ${network.opticalPatchCableCount}.`);
  }
  if (network.hasSanSinglePointOfFailure) {
    warnings.push('SAN High-Availability Advisory: Single SAN switch configured with Fibre Channel HBAs. Dual redundant SAN fabrics recommended to eliminate Single Point of Failure (SPOF).');
  }
  if (network.hasSynergyFabricMismatch) {
    network.synergyFabricErrors.forEach(err => { errors.push(err); mathDeductions.push(err); });
  }
}

function validatePCIeRules(ctx) {
  const { pcie, serverCount, compute, errors, mathDeductions, warnings, missingDependencies, mandatorySkus } = ctx;
  const pcieSlotsClusterMax = pcie.totalSlotsAvailable * serverCount;
  const activePcieSlotsClusterMax = pcie.activeSlotsAvailable * serverCount;
  if (pcie.requiredPcieCards > activePcieSlotsClusterMax) {
    const reason = `PCIe Active Slot Math Failed (CLIC Rule 81016755 / 81354683): ${pcie.requiredPcieCards} cards exceeds ${activePcieSlotsClusterMax} electrically active slots across ${serverCount} server(s). Slot 1 and/or Slot 4 require Riser Cable Kits to be enabled.`;
    errors.push(reason);
    mathDeductions.push(reason);
  } else if (pcie.requiredPcieCards > pcieSlotsClusterMax) {
    const reason = `PCIe Math Failed: ${pcie.requiredPcieCards} required cards exceeds ${pcieSlotsClusterMax} total mechanical slots across ${serverCount} server(s).`;
    warnings.push(reason);
    mathDeductions.push(reason);
  }

  if (pcie.needsPrimaryCableKit) {
    const primaryCableSku = mandatorySkus?.PRIMARY_CABLE_KIT?.sku || 'P56073-B21';
    const reason = `CLIC Rule 81356091: Enabling Slot 1 on Primary 3x16 Riser requires Primary Cable Kit (${primaryCableSku}).`;
    warnings.push(reason);
    missingDependencies.push({
      key: 'PRIMARY_RISER_CABLE_KIT', rule: 'CLIC Rule 81356091: Primary 3x16 Riser Cable Enablement',
      sku: primaryCableSku, description: mandatorySkus?.PRIMARY_CABLE_KIT?.name || 'HPE ProLiant DL380 Primary Cable Kit',
      quantity: serverCount, reasoning: reason
    });
  }
  if (pcie.needsSecondaryCableKit) {
    const secCableSku = mandatorySkus?.SECONDARY_CABLE_KIT?.sku || 'P56074-B21';
    const reason = `CLIC Rule 81170920 / 81356092: Enabling Slot 4 on Secondary 3x16 Riser requires Secondary Cable Kit (${secCableSku}).`;
    warnings.push(reason);
    missingDependencies.push({
      key: 'SECONDARY_RISER_CABLE_KIT', rule: 'CLIC Rule 81170920: Secondary 3x16 Riser Cable Enablement',
      sku: secCableSku, description: mandatorySkus?.SECONDARY_CABLE_KIT?.name || 'HPE ProLiant DL380 Secondary Cable Kit',
      quantity: serverCount, reasoning: reason
    });
  }

  const cpusPerServer = compute.cpuCount / serverCount;
  if ((pcie.secondaryRiserCount > 0 || pcie.tertiaryRiserCount > 0) && cpusPerServer < 2) {
    const reason = `Compute/PCIe Math Failed: Secondary/Tertiary Risers require 2nd CPU socket. Only ${cpusPerServer} CPU(s) per node found.`;
    errors.push(reason);
    mathDeductions.push(reason);
  }
}

function _validateStorageThermalAirflow(ctx, fanQtyPerServer) {
  const { items, compute, storage, serverCount, mandatorySkus, warnings, missingDependencies } = ctx;
  const hasTriModeCage = storage?.hasDriveCage || storage?.needsDriveCageForController || (mandatorySkus?.GENERIC_CAGE?.sku && items?.some(it => ctx.cleanBaseSKU(it.sku) === ctx.cleanBaseSKU(mandatorySkus.GENERIC_CAGE.sku)));
  const needsFansForStorage = hasTriModeCage && storage?.hasStorageController && !compute.hasHighPerfFans;
  if (needsFansForStorage && !missingDependencies.some(d => d.key === 'HIGH_PERF_FAN_KIT')) {
    const reason = `INV-87: Tri-Mode Drive Cage with Storage Controller alters chassis airflow impedance, mandating High-Performance Fan Kit (${mandatorySkus.HIGH_PERF_FAN_KIT.sku}).`;
    warnings.push(reason);
    missingDependencies.push({
      key: 'HIGH_PERF_FAN_KIT', rule: 'INV-87: Storage Thermal Escalation Rule',
      sku: mandatorySkus.HIGH_PERF_FAN_KIT.sku, description: mandatorySkus.HIGH_PERF_FAN_KIT.name,
      quantity: serverCount * fanQtyPerServer, reasoning: reason
    });
  }
}

function _validateCpuAndGpuThermalEnvelope(ctx, fanQtyPerServer) {
  const { compute, pcie, serverCount, mandatorySkus, errors, warnings, mathDeductions, missingDependencies, HIGH_TDP_THRESHOLD_WATTS } = ctx;
  if ((compute.maxCpuTdpWatts >= HIGH_TDP_THRESHOLD_WATTS || (pcie.gpuCount > 0 && !compute.isDl380aAccelerator)) && !compute.hasHighPerfFans) {
    const reason = pcie.gpuCount > 0
      ? `Thermal Math: GPU Accelerator (${pcie.gpuCount} GPU(s)) mandates High-Performance Fan Kit (${mandatorySkus.HIGH_PERF_FAN_KIT.sku}) for adequate cooling envelope.`
      : `High TDP Thermal Math Failed: ${compute.maxCpuTdpWatts}W processor exceeds ${HIGH_TDP_THRESHOLD_WATTS}W limit without High-Performance Fan Kit.`;
    if (compute.maxCpuTdpWatts >= HIGH_TDP_THRESHOLD_WATTS) errors.push(reason);
    else warnings.push(reason);
    mathDeductions.push(reason);
    missingDependencies.push({
      key: 'HIGH_PERF_FAN_KIT', rule: 'High TDP Thermal Cooling Rule',
      sku: mandatorySkus.HIGH_PERF_FAN_KIT.sku, description: mandatorySkus.HIGH_PERF_FAN_KIT.name,
      quantity: serverCount * fanQtyPerServer, reasoning: reason
    });
  }
}

function _validateFanQuantityLimits(ctx) {
  const { compute, serverCount, mandatorySkus, errors, mathDeductions } = ctx;
  if (!compute.fanKitExceedsMax) return;
  const maxKits = compute.maxFanKitsAllowed || 1;
  const reason = compute.isModularFan
    ? `CLIC Rule 81354654 / INV-206 Failed: Modular Fan Kit (${mandatorySkus.HIGH_PERF_FAN_KIT.sku}) is packaged as 1 individual fan rotor per kit. Maximum ${maxKits} kits allowed per server (${compute.fanKitCount} kits ordered for ${serverCount} servers). Normalize to ${maxKits} kits per server.`
    : `CLIC Rule 81354654 Failed: High Performance Fan Kit (${mandatorySkus.HIGH_PERF_FAN_KIT.sku}) contains all 6 chassis fans. Maximum 1 kit allowed per server (${compute.fanKitCount} kits ordered for ${serverCount} servers). Normalize to 1 kit per server.`;
  errors.push(reason);
  mathDeductions.push(reason);
}

function _validateHeatsinkCooling(ctx) {
  const { compute, mandatorySkus, warnings, missingDependencies } = ctx;
  if (compute.hasOverprovisionedMaxHeatsink) {
    warnings.push(`INV-208 Heatsink Right-Sizing & Lead-Time Advisory: Max Performance Heat Sink Kit (P74794-B21, $624/kit, max 1 per 2P server, 45-day lead time) is over-provisioned for ${compute.maxCpuTdpWatts}W TDP processors (<= 270W). Substitute with High Performance Heat Sink Kit (P74792-B21, $316/kit, 2 per 2P server = $632/server, 4-day lead time) to slash cooling lead time by 41 days (45 days -> 4 days) at virtually identical cost ($8/server delta).`);
  }
  const isHeatsinkMandated = (compute.isGen11 && compute.maxCpuTdpWatts >= 270) || (compute.maxCpuTdpWatts >= 300);
  if (isHeatsinkMandated && !compute.hasHeatsinks && compute.highPerfHeatsinkSku) {
    const reason = `High TDP Heatsink Math: ${compute.maxCpuTdpWatts}W processor requires Performance Heatsink (${compute.highPerfHeatsinkSku}).`;
    warnings.push(reason);
    missingDependencies.push({
      key: 'HIGH_PERF_HEATSINK', rule: 'High TDP Performance Heatsink Rule',
      sku: compute.highPerfHeatsinkSku, description: mandatorySkus.HIGH_PERF_HEATSINK?.name || 'HPE ProLiant Performance Heat Sink Kit',
      quantity: compute.cpuCount, reasoning: reason
    });
  }
}

function validateThermalRules(ctx) {
  const { items, compute, storage, errors, mathDeductions } = ctx;
  if (compute.hasMixedCpuModels) {
    const reason = `Processor Architecture Conflict: Multi-socket server configurations require identical processor models (same core count, stepping, and frequency). Detected distinct CPU SKUs: ${(compute.uniqueCpuSkus || []).join(', ')}.`;
    errors.push(reason);
    mathDeductions.push(reason);
  }
  const isTapeLibrary = ctx.chassisInfo?.family === 'StoreEver' || storage?.msl3040BaseModuleCount > 0 || items?.some(it => (it.description || '').toLowerCase().includes('msl3040') || it.sku === 'Q6Q62C');
  if (isTapeLibrary) return;

  const fanQtyPerServer = compute.isModularFan ? (compute.maxFanKitsAllowed || 6) : 1;
  _validateStorageThermalAirflow(ctx, fanQtyPerServer);
  _validateCpuAndGpuThermalEnvelope(ctx, fanQtyPerServer);
  _validateFanQuantityLimits(ctx);
  _validateHeatsinkCooling(ctx);
}

function _resolveDriveCageAndCableSkus(isDl380a, isGen12, mandatorySkus) {
  return {
    cageSku: mandatorySkus.GENERIC_CAGE?.sku || (isDl380a ? 'P74710-B21' : (isGen12 ? 'P75741-B21' : 'P48813-B21')),
    cageDesc: mandatorySkus.GENERIC_CAGE?.name || (isDl380a ? 'HPE ProLiant Compute DL380a Gen12 4SFF U.3 FIO Drive Cage Kit' : (isGen12 ? 'HPE ProLiant Compute DL3XX Gen12 8SFF x4 U.3 Tri-Mode Drive Cage Kit' : 'HPE ProLiant DL380 Gen11 8SFF Tri-Mode Drive Cage Kit')),
    cableSku: mandatorySkus.CONTROLLER_CABLE_KIT?.sku || (isGen12 ? 'P76456-B21' : 'P48918-B21'),
    cableDesc: mandatorySkus.CONTROLLER_CABLE_KIT?.name || (isGen12 ? 'HPE ProLiant Compute DL380 Gen12 8SFF x2 PCIe Box 2 Controller Cable Kit' : 'HPE ProLiant Storage Controller Enablement Cable Kit'),
    cageLabel: isDl380a ? '4SFF Drive Cage' : '8SFF Drive Cage'
  };
}

function _checkDriveCageAndCables(ctx, isServer, isGen12) {
  const { items, storage, power, serverCount, mandatorySkus, warnings, missingDependencies } = ctx;
  const isTapeLibrary = ctx.chassisInfo?.family === 'StoreEver' || storage?.msl3040BaseModuleCount > 0 || items?.some(it => (it.description || '').toLowerCase().includes('msl3040') || it.sku === 'Q6Q62C');
  const is1UChassis = ctx.chassisInfo?.model?.includes('DL360') || items?.some(it => (it.description || '').toLowerCase().includes('dl360') || ['P52499-B21', 'P52498-B21', 'P52497-B21'].includes(it.sku));
  const hasBackplaneKit = items?.some(it => (it.description || '').toLowerCase().includes('backplane') || it.sku === 'P48895-B21');
  if (!isServer || storage.isLffChassis || isTapeLibrary || is1UChassis || hasBackplaneKit || (!storage.needsDriveCageForController && !storage.hasControllerNoDriveConflict)) return;

  const isDl380a = power?.isDl380aGpuChassis || items.some(it => (it.description || '').toLowerCase().includes('dl380a'));
  const { cageSku, cageDesc, cableSku, cableDesc, cageLabel } = _resolveDriveCageAndCableSkus(isDl380a, isGen12, mandatorySkus);
  const reason = `INV-87: Storage Controller requires physical drive cage and backplane cabling. Internal RAID controller cannot cable into chassis with No Drive Kit. Adding ${cageLabel} (${cageSku}) and Box 2 Cable Kit (${cableSku}).`;
  warnings.push(reason);
  missingDependencies.push(
    { key: 'DRIVE_CAGE_KIT', rule: 'INV-87: Storage Controller Backplane Cabling Rule', sku: cageSku, description: cageDesc, quantity: serverCount, reasoning: reason },
    { key: 'CONTROLLER_DRIVE_CABLE_KIT', rule: 'INV-87: Storage Controller Box 2 Cabling Rule', sku: cableSku, description: cableDesc, quantity: serverCount, reasoning: reason }
  );
}

function _checkNs204BootEnablement(ctx, isGen12) {
  const { items, serverCount, mandatorySkus, warnings, missingDependencies } = ctx;
  const hasNs204BootDevice = items.some(it => { const d = (it.description || '').toLowerCase(); return d.includes('ns204') || d.includes('boot device') || (it.sku && it.sku.toLowerCase().includes('ns204')); });
  const hasNs204Enablement = items.some(it => {
    const d = (it.description || '').toLowerCase();
    const clean = ctx.cleanBaseSKU(it.sku);
    return (d.includes('ns204') && (d.includes('enablement') || d.includes('rear mount') || d.includes('front cage'))) ||
      clean === 'P75284-B21' || clean === 'P74755-B21' || clean === 'P54442-B21' ||
      (mandatorySkus?.BOOT_DEVICE_ENABLEMENT?.sku && clean === ctx.cleanBaseSKU(mandatorySkus.BOOT_DEVICE_ENABLEMENT.sku));
  });
  if (hasNs204BootDevice && !hasNs204Enablement) {
    const enablementSku = mandatorySkus.BOOT_DEVICE_ENABLEMENT?.sku || (isGen12 ? 'P74755-B21' : 'P54442-B21');
    const reason = `INV-87: NS204i-u Boot Storage Device requires physical Rear Mount Enablement Kit (${enablementSku}).`;
    warnings.push(reason);
    missingDependencies.push({ key: 'NS204_ENABLEMENT_KIT', rule: 'INV-87: NS204 Rear Boot Enablement Rule', sku: enablementSku, description: mandatorySkus.BOOT_DEVICE_ENABLEMENT?.name || 'HPE ProLiant NS204i-u Rear Mount Enablement Kit', quantity: serverCount, reasoning: reason });
  }
}

function _checkControllerCablesAndBatteries(ctx) {
  const { items, storage, serverCount, mandatorySkus, errors, warnings, mathDeductions, missingDependencies } = ctx;
  if (storage.hasIncompatibleYCable) {
    const splitterCableSku = mandatorySkus.TRI_MODE_SPLITTER_CABLE?.sku || 'TRI_MODE_SPLITTER';
    const enablementCableSku = mandatorySkus.CONTROLLER_CABLE_KIT?.sku || 'P48918-B21';
    const reason = `CLIC Rules 81354627 & 81354632 Failed: Tri-Mode Splitter Cable Kit (${splitterCableSku}) requires PCIe-type RAID controller and Premium Cage. Not compatible with OCP storage controllers or standard cages. Remove ${splitterCableSku} and use ${enablementCableSku}.`;
    errors.push(reason);
    mathDeductions.push(reason);
  }
  if (storage.hasStorageController && !storage.hasSmartBattery) {
    const reason = 'Storage Math Failed: Storage controller requires Smart Storage Battery to protect write cache.';
    warnings.push(reason);
    mathDeductions.push(reason);
    missingDependencies.push({ key: 'SMART_STORAGE_BATTERY', rule: 'Controller Cache Protection Rule', sku: mandatorySkus.SMART_STORAGE_BATTERY.sku, description: mandatorySkus.SMART_STORAGE_BATTERY.name, quantity: serverCount, reasoning: reason });
  }
  const controllerCableSku = mandatorySkus.CONTROLLER_CABLE_KIT?.sku || DEFAULT_MANDATORY_SKUS.CONTROLLER_CABLE_KIT.sku;
  const controllerCableName = mandatorySkus.CONTROLLER_CABLE_KIT?.name || DEFAULT_MANDATORY_SKUS.CONTROLLER_CABLE_KIT.name;
  const roleSets = getStorageRoleSets(mandatorySkus);
  const hasEnablementCable = storage.hasSidebandEnablementCable || (!storage.hasStackingOrBackplaneKit && storage.hasOcpCable) || items.some(it => {
    const clean = ctx.cleanBaseSKU(it.sku);
    const d = (it.description || '').toLowerCase();
    if (roleSets.smartStorageBatterySkus.has(clean) || d.includes('battery') || d.includes('capacitor')) return false;
    return roleSets.sidebandEnablementSkus.has(clean) || d.includes('storage controller enablement cable') || d.includes('tri-mode pcie fio cable kit');
  });
  if (storage.needsCapacitorCable || (storage.hasStorageController && !hasEnablementCable)) {
    const reason = `CLIC Rule 81354652: Smart Storage Hybrid Capacitor / Battery and Controller require Storage Controller Enablement Cable Kit (${controllerCableSku}) to connect power and sideband telemetry.`;
    warnings.push(reason);
    missingDependencies.push({ key: 'STORAGE_CONTROLLER_ENABLEMENT_CABLE', rule: 'CLIC Rule 81354652: Capacitor Power Link Requirement', sku: controllerCableSku, description: controllerCableName, quantity: serverCount, reasoning: reason });
  }
  if (storage.needsBackplaneSignalCable) {
    const isOcpCtrl = Boolean(storage.hasOcpController);
    const signalCableCfg = isOcpCtrl ? mandatorySkus.OCP_BOX12_CABLE : (mandatorySkus.TRI_MODE_BOX12_CABLE || mandatorySkus.TRI_MODE_SPLITTER_CABLE);
    const signalCableSku = signalCableCfg?.sku || (isOcpCtrl ? 'OCP_BOX12_CABLE' : 'TRI_MODE_BOX12_CABLE');
    const signalCableDesc = signalCableCfg?.name || (isOcpCtrl ? 'Backplane Rear OCP Controller Signal Cable Kit' : 'Backplane PCIe Controller Signal Cable Kit');
    const signalReason = storage.missingSignalReason || `Backplane-to-controller storage signal path requires ${signalCableSku}.`;
    warnings.push(signalReason);
    missingDependencies.push({ key: 'CONTROLLER_DRIVE_CABLE_KIT', rule: 'Backplane-to-Controller Signal Cable Requirement', sku: signalCableSku, description: signalCableDesc, quantity: serverCount, reasoning: signalReason });
  }
}

function _checkSasExpanderAndRaidTranspilation(storage, serverCount, mandatorySkus, warnings, missingDependencies) {
  if (storage.needsSasExpander) {
    const sasExpanderSku = mandatorySkus.SAS_EXPANDER?.sku || 'P48835-B21';
    const triModeSwitchSku = mandatorySkus.TRI_MODE_SWITCH?.sku || 'P55806-B21';
    const reason = `Storage Expander Math: ${storage.driveCount} drives exceeds direct controller capacity (${storage.controllerDirectCapacity} drives). Requires SAS Expander Card (${sasExpanderSku}) or Tri-Mode Switch Card (${triModeSwitchSku}).`;
    warnings.push(reason);
    missingDependencies.push({ key: 'SAS_EXPANDER_CARD', rule: 'Storage Expander & Multi-Drive Channel Rule', sku: sasExpanderSku, description: mandatorySkus.SAS_EXPANDER?.name || 'HPE ProLiant SAS Expander Card Kit', quantity: serverCount, reasoning: reason });
  }
  if (!storage.hasRaid1MultiDriveConflict) return;
  if (storage.needsRaid1FioPruning) {
    const reason = 'RAID 1 FIO Redundancy: 339778-B21 (HPE RAID 1 Drive 1 FIO Setting) is redundant because hardware boot mirroring is already handled by dedicated boot device (P78279-B21). 339778-B21 with >2 data drives blocks factory order acceptance and should be pruned.';
    warnings.push(reason);
    missingDependencies.push({ key: 'PRUNE_REDUNDANT_RAID1_FIO', rule: 'CLIC Factory Array Geometry Constraint (INV-228)', sku: '339778-B21', description: 'HPE RAID 1 Drive 1 FIO Setting', action: 'PRUNE_REDUNDANT_RAID1_FIO', category: 'Storage Controllers', ruleType: 'ARRAY_GEOMETRY_BUILD_BLOCKER', pruneCandidate: true, reasoning: reason });
  } else if (storage.needsCustomerDefinedRaidTranspilation) {
    const reason = `CLIC Factory Array Geometry Conflict: 339778-B21 (HPE RAID 1 Drive 1 FIO Setting) enforces Drive Count == 2. Configuration contains ${storage.driveCount} drives, leaving remaining drives unassigned in factory configuration. Transpiling to 389692-B21 (HPE Customer Defined RAID Setting Service) required for factory buildability.`;
    warnings.push(reason);
    missingDependencies.push({ key: 'TRANSPILE_TO_CUSTOMER_DEFINED_RAID', rule: 'CLIC Factory Array Geometry Constraint (INV-228)', sku: '389692-B21', originalSku: '339778-B21', description: 'HPE Customer Defined RAID Setting Service', action: 'TRANSPILE_TO_CUSTOMER_DEFINED_RAID', category: 'Storage Controllers', ruleType: 'ARRAY_GEOMETRY_BUILD_BLOCKER', quantity: 1, reasoning: reason });
  }
}

function validateStorageRules(ctx) {
  const { items, storage, serverCount, mandatorySkus, errors, warnings, mathDeductions, missingDependencies, catalogData } = ctx;
  if (storage.hasLffDrivesInSffChassis) {
    const reason = `Storage Form Factor Conflict: 3.5" LFF drives (${storage.lffDriveCount}) cannot be installed in a 2.5" SFF chassis backplane.`;
    errors.push(reason);
    mathDeductions.push(reason);
  }
  const isServer = isServerPlatform(ctx.chassisInfo, ctx.topology);
  const { isGen12 } = resolveGenerationProfile(ctx.chassisInfo, items);
  if (isServer && storage.driveCount === 0 && !storage.hasNoDriveKit && !storage.hasStorageController) {
    const reason = 'Storage Math Failed: 0 drives detected. Requires HPE No Drive Configuration FIO Kit.';
    warnings.push(reason);
    mathDeductions.push(reason);
    missingDependencies.push({ key: 'NO_DRIVE_FIO_KIT', rule: 'Drive-less Chassis Configuration Rule', sku: mandatorySkus.NO_DRIVE_FIO_KIT.sku, description: mandatorySkus.NO_DRIVE_FIO_KIT.name, quantity: serverCount, reasoning: reason });
  }
  _checkDriveCageAndCables(ctx, isServer, isGen12);
  if (isServer && storage.needsStorageControllerForCage) {
    const { resolveComponentByRole } = require('../../taxonomy/sku_resolver.js');
    const ctrl = resolveComponentByRole(catalogData, { role: 'Storage Controller', keywords: ['mr416i', 'mr408i', 'sr932i', 'controller'], preferredSku: 'P47777-B21' });
    const sku = (ctrl.isResolved && ctrl.sku) ? ctrl.sku : 'P47777-B21';
    const reason = `Storage Topology Rule: Controller-routed front drive cage requires a hardware Storage Controller (${sku}) plus enablement cable & cache battery — drives alone do not dictate controller selection; only No-Drive FIO or Direct-Connect NVMe cages omit a controller.`;
    warnings.push(reason);
    missingDependencies.push({ key: 'STORAGE_CONTROLLER_FOR_CAGE', rule: 'Drive Cage Topology Storage Controller Mandate', sku, isResolved: Boolean(ctrl.isResolved && ctrl.sku), description: ctrl.description || 'HPE Tri-Mode / SAS Storage Controller', quantity: serverCount, reasoning: reason });
  }
  _checkNs204BootEnablement(ctx, isGen12);
  _checkControllerCablesAndBatteries(ctx);
  _checkSasExpanderAndRaidTranspilation(storage, serverCount, mandatorySkus, warnings, missingDependencies);
}

module.exports = {
  isServerPlatform,
  resolveGenerationProfile,
  validateNetworkingRules,
  validatePCIeRules,
  validateThermalRules,
  validateStorageRules
};
