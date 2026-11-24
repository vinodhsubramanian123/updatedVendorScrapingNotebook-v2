'use strict';
/**
 * scripts/lib/boq/evaluators/aspect_summary_builders.js — 7-Aspect Summary Builders, Architectural Rationale & Domain Dispatcher
 */

const { cleanBaseSKU } = require('../../catalog/sku.js');
const { isAlletraMpItems, evaluateAlletraMp } = require('../alletra_mp_evaluator.js');
const { isCompleteSynergyComposite, evaluateSynergyComposite } = require('../synergy_composite_evaluator.js');
const { evalArchiveColdStorage } = require('../../aspects/aspect_registry.js');
const { evalSupportServices } = require('../../aspects/support_services.js');
const { generateLifecycleRecommendations } = require('../../conflict/resolution_matrix.js');
const { isServerPlatform } = require('./compute_storage_rules.js');

function _buildAspect1Compute(ctx, _computePresent) {
  const { compute, mandatorySkus, hasBaseChassis, cpusPerServer, HIGH_TDP_THRESHOLD_WATTS, pcie, chassisInfo, topology } = ctx;
  const isServer = isServerPlatform(chassisInfo, topology);
  const status = (isServer && hasBaseChassis && compute.cpuCount === 0) ? 'FAIL'
    : !isServer ? 'PASS'
    : !_computePresent ? 'UNKNOWN'
    : ((compute.maxCpuTdpWatts >= HIGH_TDP_THRESHOLD_WATTS || (pcie.gpuCount > 0 && !compute.isDl380aAccelerator)) && !compute.hasHighPerfFans) || compute.fanKitExceedsMax ? 'FAIL' : 'PASS';
  const detail = !isServer
    ? `Domain profile verified (${chassisInfo?.family || 'Appliance'} ${chassisInfo?.model || ''}); server host processor rules not applicable.`
    : (hasBaseChassis && compute.cpuCount === 0)
    ? 'INV-105: No processor detected in configuration (at least 1 CPU required for server chassis).'
    : !_computePresent
    ? 'INV-105: Compute subsystem data absent — cannot evaluate thermal envelope.'
    : compute.fanKitExceedsMax
    ? (compute.isModularFan
        ? `CLIC Rule 81354654 / INV-206 Failed: Modular Fan Kit (${mandatorySkus.HIGH_PERF_FAN_KIT.sku}) is packaged as 1 individual fan rotor per kit. Maximum ${compute.maxFanKitsAllowed || 6} kits allowed per server (${compute.fanKitCount} kits ordered).`
        : `CLIC Rule 81354654 Failed: High Performance Fan Kit (${mandatorySkus.HIGH_PERF_FAN_KIT.sku}) contains all 6 chassis fans. Maximum 1 kit allowed per server (${compute.fanKitCount} kits ordered).`)
    : ((compute.maxCpuTdpWatts >= HIGH_TDP_THRESHOLD_WATTS || (pcie.gpuCount > 0 && !compute.isDl380aAccelerator)) && !compute.hasHighPerfFans)
    ? `High TDP Thermal Math Failed: ${compute.maxCpuTdpWatts}W processor exceeds ${HIGH_TDP_THRESHOLD_WATTS}W limit without High-Performance Fan Kit.`
    : compute.isDl380aAccelerator
    ? `Verified ${compute.cpuCount} CPUs (${cpusPerServer}/node) within TDP envelope with DL380a factory-integrated high-performance accelerator cooling architecture.`
    : `Verified ${compute.cpuCount} CPUs (${cpusPerServer}/node) within TDP envelope with valid fan kit count.`;
  return {
    id: 1, name: 'Thermal & Compute Math', iconType: 'Cpu',
    defaultRule: 'CPU TDP thermal envelope vs cooling kit population rules (CLIC Rule 81354654)', status,
    formula: compute.thermalEquationFormula || `maxCpuTdpWatts (${compute.maxCpuTdpWatts}W) <= ${HIGH_TDP_THRESHOLD_WATTS}W`,
    equation: compute.thermalEquationFormula || `maxCpuTdpWatts (${compute.maxCpuTdpWatts}W) <= ${HIGH_TDP_THRESHOLD_WATTS}W`,
    operands: { maxCpuTdpWatts: compute.maxCpuTdpWatts, thresholdWatts: HIGH_TDP_THRESHOLD_WATTS, hasHighPerfFans: compute.hasHighPerfFans, hasHeatsinks: compute.hasHeatsinks, fanKitCount: compute.fanKitCount },
    detail
  };
}

function _buildAspect2Memory(ctx, _memoryPresent) {
  const { compute, memory, serverCount, hasBaseChassis, chassisInfo, topology } = ctx;
  const isServer = isServerPlatform(chassisInfo, topology);
  const status = (isServer && hasBaseChassis && memory.memoryCount === 0) ? 'FAIL'
    : !isServer ? 'PASS'
    : !_memoryPresent ? 'UNKNOWN'
    : (memory.memoryCount > 0 && !memory.isSupportedPopulation) || memory.hasBtoMemoryInCto ? 'FAIL' : 'PASS';
  const detail = !isServer
    ? `Domain profile verified (${chassisInfo?.family || 'Appliance'} ${chassisInfo?.model || ''}); server host memory rules not applicable.`
    : (hasBaseChassis && memory.memoryCount === 0)
    ? 'INV-105: No memory modules detected in configuration (memory required for server chassis).'
    : !_memoryPresent
    ? 'INV-105: Memory subsystem data absent — cannot evaluate channel balance.'
    : memory.hasBtoMemoryInCto
    ? `Memory Option Rule Failed (CLIC Rule 91001655): Standalone BTO Memory SKU (${memory.btoMemoryViolations.map(v => v.btoSku).join(', ')}) is restricted in CTO base server. Direct fix: Replace with FIO SKU (${memory.btoMemoryViolations.map(v => v.fioSku).join(', ')}).`
    : (memory.memoryCount > 0 && !memory.isSupportedPopulation)
    ? `Memory Math Failed: ${memory.memoryCount} DIMMs across ${compute.cpuCount || 2} CPUs is not balanced or is an unsupported asymmetric count.`
    : !memory.isBalancedChannel
    ? `Verified ${memory.memoryCount} DIMMs in supported entry population (${memory.memoryCount / serverCount} DIMMs/node, ${memory.totalMemoryGb / serverCount}GB RAM). Note: Maximum memory interleaving bandwidth is achieved with ${memory.channelsPerCpu} DIMMs per socket.`
    : `Verified ${memory.memoryCount} DIMMs in balanced configuration (${memory.memoryCount / serverCount} DIMMs/node).`;
  return {
    id: 2, name: 'Memory & Channel Balance', iconType: 'Memory',
    defaultRule: 'Memory interleaving, channel balance & population rules (CLIC Rules 81354490 & 91001655)', status,
    formula: `${memory.memoryCount} DIMMs / ${compute.cpuCount || 2} CPUs = ${memory.dimmsPerCpu} DIMMs/socket (Channels: ${memory.channelsPerCpu})`,
    equation: `${memory.memoryCount} DIMMs / ${compute.cpuCount || 2} CPUs = ${memory.dimmsPerCpu} DIMMs/socket (Channels: ${memory.channelsPerCpu})`,
    operands: { memoryCount: memory.memoryCount, cpuCount: compute.cpuCount || 2, dimmsPerCpu: memory.dimmsPerCpu, channelsPerCpu: memory.channelsPerCpu, isSupported: memory.isSupportedPopulation, isBalanced: memory.isBalancedChannel },
    detail
  };
}

function _resolveStorageAspectStatus(isServer, hasBaseChassis, storage, _storagePresent) {
  if (isServer && hasBaseChassis && storage.driveCount === 0 && !storage.hasNoDriveKit) return 'FAIL';
  if (!isServer) return storage.hasIncompatibleYCable ? 'FAIL' : 'PASS';
  if (!_storagePresent) return 'UNKNOWN';
  if (storage.hasIncompatibleYCable || storage.needsBackplaneSignalCable || (storage.hasStackingOrBackplaneKit && storage.needsCapacitorCable) || (storage.driveCount === 0 && !storage.hasNoDriveKit) || (storage.hasStorageController && !storage.hasSmartBattery)) return 'FAIL';
  return 'PASS';
}

function _resolveStorageAspectDetail(isServer, hasBaseChassis, storage, hasDriveCageKit, _storagePresent, chassisInfo, mandatorySkus, serverCount) {
  if (isServer && hasBaseChassis && storage.driveCount === 0 && !storage.hasNoDriveKit) return 'Storage Math Failed: 0 drives requires No Drive Configuration FIO Kit.';
  if (!isServer) return `Domain profile verified (${chassisInfo?.family || 'Appliance'} ${chassisInfo?.model || ''}); storage/media evaluated.`;
  if (!_storagePresent) return 'INV-105: Storage subsystem data absent — cannot evaluate controller/drive configuration.';
  if (storage.hasIncompatibleYCable) return `CLIC Rules 81354627 & 81354632 Failed: Tri-Mode Splitter Cable Kit is incompatible with OCP storage controllers / standard cages. Controller Enablement Cable (${mandatorySkus?.CONTROLLER_CABLE_KIT?.sku || 'P48918-B21'}) is the correct cable.`;
  if (storage.needsBackplaneSignalCable) return storage.missingSignalReason || 'Storage Math Failed: Missing backplane-to-controller storage signal/enablement cable kit.';
  if (storage.needsCapacitorCable) return `CLIC Rule 81354652 Failed: Storage controller enablement cable (${mandatorySkus?.CONTROLLER_CABLE_KIT?.sku || 'P48918-B21'}) required for battery/controller link.`;
  if (storage.driveCount === 0 && !storage.hasNoDriveKit && !hasDriveCageKit) return 'Storage Math Failed: 0 drives requires No Drive Configuration FIO Kit.';
  if (storage.hasStorageController && !storage.hasSmartBattery) return 'Storage Math Failed: Storage controller requires Smart Storage Battery / Capacitor Kit.';
  return `Verified ${storage.driveCount} drives (${storage.driveCount / serverCount}/node) and controller configuration.`;
}

function _buildAspect3Storage(ctx, _storagePresent) {
  const { storage, mandatorySkus, serverCount, hasDriveCageKit, hasBaseChassis, chassisInfo, topology } = ctx;
  const isServer = isServerPlatform(chassisInfo, topology);
  return {
    id: 3, name: 'Storage & Controller Cabling', iconType: 'HardDrive',
    defaultRule: 'Storage controller, drive cage & cable kit compatibility checks (CLIC Rules 81354627 & 81354632)',
    status: _resolveStorageAspectStatus(isServer, hasBaseChassis, storage, _storagePresent),
    formula: `driveCount: ${storage.driveCount}, controllerCount: ${storage.hasStorageController ? 1 : 0}, smartBattery: ${storage.hasSmartBattery ? 1 : 0}`,
    equation: `driveCount: ${storage.driveCount}, controllerCount: ${storage.hasStorageController ? 1 : 0}, smartBattery: ${storage.hasSmartBattery ? 1 : 0}`,
    operands: { driveCount: storage.driveCount, hasStorageController: storage.hasStorageController, hasSmartBattery: storage.hasSmartBattery, hasNoDriveKit: storage.hasNoDriveKit },
    detail: _resolveStorageAspectDetail(isServer, hasBaseChassis, storage, hasDriveCageKit, _storagePresent, chassisInfo, mandatorySkus, serverCount)
  };
}

function _buildAspect4Pcie(ctx, _pciePresent) {
  const { pcie, power, mandatorySkus, serverCount, isExceedingActivePcie, isExceedingPcie, cpusPerServer, activePcieSlotsClusterMax, pcieSlotsClusterMax } = ctx;
  const status = !_pciePresent ? 'UNKNOWN' : isExceedingActivePcie || isExceedingPcie || ((pcie.secondaryRiserCount > 0 || pcie.tertiaryRiserCount > 0) && cpusPerServer < 2) ? 'FAIL' : 'PASS';
  const detail = !_pciePresent
    ? 'INV-105: PCIe subsystem data absent — cannot evaluate slot/riser configuration.'
    : isExceedingActivePcie
    ? `PCIe Active Slot Math Failed (CLIC Rule 81016755): ${pcie.requiredPcieCards} required cards exceeds ${activePcieSlotsClusterMax} electrically cabled active slots. Slot 1 and/or Slot 4 require Riser Cable Kits (${mandatorySkus?.PRIMARY_CABLE_KIT?.sku || 'PRIMARY_CABLE_KIT'} / ${mandatorySkus?.SECONDARY_CABLE_KIT?.sku || 'SECONDARY_CABLE_KIT'}).`
    : isExceedingPcie ? `PCIe Math Failed: ${pcie.requiredPcieCards} required cards exceeds ${pcieSlotsClusterMax} slots.`
    : (pcie.secondaryRiserCount > 0 || pcie.tertiaryRiserCount > 0) && cpusPerServer < 2 ? 'Compute/PCIe Math Failed: Secondary/Tertiary Risers require 2nd CPU socket.'
    : `Verified ${pcie.requiredPcieCards} PCIe cards fit within ${activePcieSlotsClusterMax} active cabled slots (${Math.ceil(pcie.requiredPcieCards / serverCount)} cards/node)${pcie.gpuCount > 0 && power.isDl380aGpuChassis ? ` plus ${pcie.gpuCount} front-bay accelerator(s) seated on high-speed switchboards` : ''}.`;
  return {
    id: 4, name: 'PCIe Riser & Slot Expansion Math', iconType: 'Layers',
    defaultRule: 'PCIe slot capacity, active riser cabling & slot expansion rules (CLIC Rules 81016755 & 81354683)', status,
    formula: `requiredCards: ${pcie.requiredPcieCards} <= activeSlots: ${activePcieSlotsClusterMax} (Total: ${pcieSlotsClusterMax})`,
    equation: `requiredCards: ${pcie.requiredPcieCards} <= activeSlots: ${activePcieSlotsClusterMax} (Total: ${pcieSlotsClusterMax})`,
    operands: { requiredCards: pcie.requiredPcieCards, activeSlots: activePcieSlotsClusterMax, totalSlots: pcieSlotsClusterMax, gpuCount: pcie.gpuCount },
    detail
  };
}

function _buildAspect5Networking(ctx, _networkPresent) {
  const { network, mandatorySkus, isExceedingOcp, ocpSlotsClusterMax } = ctx;
  const status = !_networkPresent ? 'UNKNOWN' : isExceedingOcp || network.hasConflictingOcpCables ? 'FAIL' : 'PASS';
  const detail = !_networkPresent
    ? 'INV-105: Network subsystem data absent — cannot evaluate OCP slot allocation.'
    : network.hasConflictingOcpCables
    ? `CLIC Rule 81355854 Failed: CPU1 to OCP2 (${mandatorySkus?.CPU1_OCP_CABLE?.sku || 'CPU1_OCP'}) and CPU2 to OCP2 (${mandatorySkus?.CPU2_OCP_CABLE?.sku || 'CPU2_OCP'}) enablement kits cannot be selected together.`
    : isExceedingOcp ? `Networking Math Failed: ${network.ocpAdapterCount} OCP adapters exceeds maximum ${ocpSlotsClusterMax} slots.`
    : network.networkPortsCount > 0 ? `Verified ${network.networkPortsCount} active network ports (${network.hasOcpAdapter ? network.ocpAdapterCount + 'x OCP 3.0 NICs' : 'Standard PCIe/LOM NICs'}).`
    : `Verified 0 OCP adapters fit within ${ocpSlotsClusterMax} available OCP 3.0 slot(s).`;
  return {
    id: 5, name: 'Networking & OCP Interconnect', iconType: 'Zap',
    defaultRule: 'OCP 3.0 network adapter slots and port allocation rules (CLIC Rule 81355854)', status,
    formula: `ocpAdapters: ${network.ocpAdapterCount} <= maxSlots: ${ocpSlotsClusterMax}`,
    equation: `ocpAdapters: ${network.ocpAdapterCount} <= maxSlots: ${ocpSlotsClusterMax}`,
    operands: { ocpAdapterCount: network.ocpAdapterCount, ocpSlotsClusterMax, networkPortsCount: network.networkPortsCount },
    detail
  };
}

function _buildAspect6Power(ctx, _powerPresent) {
  const { power, psuPerServer, hasBaseChassis } = ctx;
  const status = (hasBaseChassis && power.psuCount === 0) ? 'FAIL' : !_powerPresent ? 'UNKNOWN' : (power.hasDcPowerSupply && !power.hasDcLugKit) || power.hasDl380aGpuPsuShortage ? 'FAIL' : 'PASS';
  const detail = (hasBaseChassis && power.psuCount === 0) ? 'INV-105: No power supplies configured in server chassis.'
    : !_powerPresent ? 'INV-105: Power subsystem data absent — cannot evaluate PSU redundancy.'
    : power.hasDcPowerSupply && !power.hasDcLugKit ? 'Power Math Failed: -48VDC Power Supply requires DC Power Cable Lug Kit.'
    : power.hasDl380aGpuPsuShortage ? `DL380a GPU Power Matrix Failed: ${power.dl380aGpuModeCapacity}DW mode requires ${power.requiredDl380aPsuCountPerServer} identical 2400W or 3200W PSUs per server (${power.requiredDl380aPsuCount} total); found ${power.psuCount}.`
    : `Verified power supply and infrastructure dependencies (${psuPerServer} PSUs/node).`;
  return {
    id: 6, name: 'Power & Redundancy Math', iconType: 'Power',
    defaultRule: 'Power supply redundancy rating & auxiliary kit requirements', status,
    formula: `psuCount: ${power.psuCount}, maxWattage: ${power.maxPsuWattage || 800}W, estNodeWattage: ${power.estimatedNodeWattage || 0}W`,
    equation: `psuCount: ${power.psuCount}, maxWattage: ${power.maxPsuWattage || 800}W, estNodeWattage: ${power.estimatedNodeWattage || 0}W`,
    operands: { psuCount: power.psuCount, maxWattage: power.maxPsuWattage || 800, estNodeWattage: power.estimatedNodeWattage || 0, isDc: power.hasDcPowerSupply, hasDcLugKit: power.hasDcLugKit },
    detail
  };
}

function _buildAspect7Support(ctx, _supportPresent) {
  const { support } = ctx;
  const status = !_supportPresent ? 'UNKNOWN' : support.needsAdditionalWindowsCores || support.needsAdditionalVmwareCores || support.needsAdditionalLinuxSubscriptions ? 'WARN' : (!support.hasSupportService ? 'WARN' : 'PASS');
  const detail = !_supportPresent ? 'INV-105: Support subsystem data absent — cannot evaluate licensing/support.'
    : support.needsAdditionalWindowsCores ? `Windows OS Licensing Deficit: Requires ${support.missingCoreLicenses} additional core licenses (${support.totalWindowsLicensedCores}/${support.requiredWindowsCores} cores covered).`
    : support.needsAdditionalVmwareCores ? `VMware Licensing Deficit: Requires ${support.missingVmwareCores} additional VMware core licenses (${support.vmwareLicensedCores}/${support.requiredVmwareCores} cores covered).`
    : support.needsAdditionalLinuxSubscriptions ? `Linux OS Licensing Deficit: Requires ${support.missingLinuxSubscriptions} additional 1-2 socket subscription(s).`
    : support.hasSupportService ? `Verified requested support services and OS core allocations${support.hasManagementLicense ? '; customer-selected management licensing is present' : ''}.`
    : 'Support Taxonomy Advisory: Missing Pointnext / Tech Care service line.';
  return {
    id: 7, name: 'Vendor Support Taxonomy & Licensing', iconType: 'Award',
    defaultRule: 'Hardware SKU validation, requested support coverage, and OS core multipliers (INV-28, INV-32)', status,
    formula: `licensedCores: ${support.totalWindowsLicensedCores || 0}/${support.requiredWindowsCores || 0}, hasSupport: ${Boolean(support.hasSupportService)}`,
    equation: `licensedCores: ${support.totalWindowsLicensedCores || 0}/${support.requiredWindowsCores || 0}, hasSupport: ${Boolean(support.hasSupportService)}`,
    operands: { hasSupportService: Boolean(support.hasSupportService), windowsDeficit: support.missingCoreLicenses || 0, vmwareDeficit: support.missingVmwareCores || 0 },
    detail
  };
}

function buildAspectChecks(ctx) {
  const { compute, memory, storage, network, pcie, power, support } = ctx;
  return [
    _buildAspect1Compute(ctx, compute && (compute.cpuCount > 0 || compute.maxCpuTdpWatts > 0)),
    _buildAspect2Memory(ctx, memory && memory.memoryCount > 0),
    _buildAspect3Storage(ctx, storage && (storage.driveCount > 0 || storage.hasNoDriveKit || storage.hasStorageController)),
    _buildAspect4Pcie(ctx, pcie && Number.isFinite(pcie.requiredPcieCards) && pcie.requiredPcieCards >= 0),
    _buildAspect5Networking(ctx, network && Number.isFinite(network.ocpAdapterCount) && network.ocpAdapterCount >= 0),
    _buildAspect6Power(ctx, power && power.psuCount > 0),
    _buildAspect7Support(ctx, support != null)
  ];
}

function buildArchitecturalRationale(ctx) {
  const { power, pcie, storage, memory, serverCount } = ctx;
  const architecturalRationale = [];
  if (power.isDl380aGpuChassis && pcie.gpuCount > 0) {
    architecturalRationale.push(
      { topic: 'DL380a Gen12 GPU Density & NVLink Bridge Physical Clearance Rule', rationale: 'The DL380a Gen12 platform supports up to 8 double-wide (8DW) GPUs under P75008-B21 (with dual PCIe Gen5 switchboards P74714-B21) or 10DW under P75005-B21 (captive risers). For NVIDIA H200 NVL (S3U30C), physical NVLink bridges (S4A90C / S4A91C) are mandatory for 900 GB/s inter-GPU memory pooling. Per HPE QuickSpecs, the dense 10DW captive riser mode does NOT support NVLink bridges ("10DW configuration does not support GPU NVL bridges"). Therefore, 8DW Mode is the absolute maximum buildable configuration for H200 NVL on this chassis.' },
      { topic: 'DL380a Front-Bay Accelerator Cabling & Cooling', rationale: 'Front-bay accelerators on DL380a Gen12 connect directly to the switchboards using P74700-B21 (GPU 16-pin FIO Cable Kits, 1 kit per 2 GPUs) and do not consume rear PCIe riser slots, keeping rear slots open for networking and HBAs. High-performance counter-rotating cooling fans are factory-integrated into the P76706-B21 chassis.' }
    );
  }
  if (storage.hasNoDriveKit) {
    architecturalRationale.push({ topic: 'No Local Drive Configuration FIO Kit (873763-B21)', rationale: 'HPE ProLiant Compute DL380 No Drive Configuration FIO Kit (873763-B21, $14 list) satisfies CLIC Rule 81392308 for diskless compute nodes, clearing mandatory front drive cage and RAID controller requirements.' });
  }
  if (power.hasCeRemovalKit) {
    architecturalRationale.push({ topic: 'EU Ecodesign ErP Lot 9 Regulatory Clearance (P35876-B21)', rationale: 'HPE CE Mark Removal FIO Enablement Kit (P35876-B21, $1 list) clears EU Lot 9 software prompt for 94% Platinum PSUs on dual-socket configurations without altering requested PSU hardware.' });
  }
  if (memory.memoryCount > 0 && !memory.isBalancedChannel && memory.isSupportedPopulation) {
    architecturalRationale.push({ topic: 'Memory Population & Interleaving Bandwidth', rationale: `Configured with ${memory.dimmsPerCpu} DIMMs per socket (${memory.totalMemoryGb / serverCount}GB RAM), which is a valid, certified entry memory population in HPE QuickSpecs. For workloads requiring maximum memory bandwidth, populating all ${memory.channelsPerCpu} channels per socket (1DPC) provides 100% full-channel interleaving.` });
  }
  return architecturalRationale;
}

function _buildArchiveTapeEvalResult(items, archiveRes, catalogData, topology, detectedChassis, options) {
  const lifecycle = (options.skipLifecycle || options.skipGraphValidation) ? { hasObsoleteRisk: false, hasEolWarning: false, obsoleteSkus: [], eolSkus: [], nearExpirySkus: [] } : evalSupportServices(items, catalogData, options.lifecycle || {});
  const errors = [...(archiveRes.errors || [])];
  const warnings = [...(archiveRes.warnings || [])];
  if (lifecycle.hasObsoleteRisk) warnings.push('Lifecycle Risk: Obsolete (OB) tape/archive component(s) detected in BOM.');
  const hasSupport = (items || []).some(it => /\b(?:tech\s*care|pointnext|support|foundation\s*care)\b/i.test(String(it.description || '')) || /^H[A-Z0-9]{5,7}(?:#|$)/.test(cleanBaseSKU(it.sku)));
  if (!hasSupport) warnings.push('Support Advisory: Missing HPE Tech Care hardware support SKU for StoreEver tape library (default: 3-year Tech Care Basic).');
  const aspectChecks = [
    { id: 'ARCHIVE_COLD_STORAGE', name: 'Tape Library & Archive Drive Validation', status: archiveRes.status, detail: errors[0] || archiveRes.advisory || warnings[0] || 'Archive tape library checked.' },
    { id: 'SUPPORT_SERVICES', name: 'Support & Lifecycle Services Aspect', status: lifecycle.hasObsoleteRisk ? 'FAIL' : (hasSupport ? 'PASS' : 'WARN'), detail: hasSupport ? 'Hardware support service line present.' : 'Hardware Tech Care support service pending.' }
  ];
  const isMathClean = errors.length === 0 && archiveRes.status !== 'FAIL';
  return {
    items, productType: 'ARCHIVE_TAPE', solutionTopology: { ...topology, domain: 'archive_tape' },
    isMathClean, isGraphClean: false, portalValidationStatus: 'PENDING', criticalViolationsCount: errors.length,
    errors, warnings, missingDependencies: [], mathDeductions: [...errors], aspectChecks,
    evalSummary: { archive: archiveRes, lifecycleRisks: lifecycle, lifecycleRecommendations: (options.skipLifecycle || options.skipGraphValidation) ? [] : generateLifecycleRecommendations(items, catalogData, options.lifecycle || {}), errors, warnings, missingDependencies: [], aspectChecks },
    confidence: { score: isMathClean ? 0.74 : Math.max(0.1, Number((0.74 - errors.length * 0.15).toFixed(2))), isHitlTriggered: true, confidenceReasons: [...errors.map(e => `[CRITICAL_MATH] ${e}`), ...warnings.map(w => `[WARNING] ${w}`)] },
    conflictGraph: { chassisInfo: { ...detectedChassis, productId: detectedChassis?.productId || 'MSL3040_Tape', family: 'StoreEver' }, rulesSource: 'ARCHIVE_TAPE_DOMAIN_RULES', isFallbackSource: false, totalRulesEvaluated: aspectChecks.length, isWholeSolutionValid: false, conflicts: errors.map(message => ({ level: 'ARCHIVE_TAPE', type: 'ARCHIVE_TAPE_VIOLATION', message })), resolvedFixes: [], unresolvedConflicts: errors.map(message => ({ type: 'ARCHIVE_TAPE_VIOLATION', message })), rankedSolutions: [] }
  };
}

function _dispatchSpecializedDomainEvaluator(topologyItems, catalogData, targetDir, topology, detectedChassis, options) {
  if (isAlletraMpItems(topologyItems, detectedChassis, targetDir)) {
    return { ...evaluateAlletraMp(topologyItems, catalogData, targetDir, detectedChassis, options), solutionTopology: { ...topology, domain: 'alletra_mp' } };
  }
  if (isCompleteSynergyComposite(topologyItems, topology, detectedChassis)) {
    return { ...evaluateSynergyComposite(topologyItems, catalogData, targetDir, detectedChassis, options), solutionTopology: { ...topology, domain: 'synergy_composite' } };
  }
  const isPureArchiveTopology = topology.domain === 'archive' || (topology.domain === 'composite' && Array.isArray(topology.roles) && topology.roles.length === 1 && topology.roles[0] === 'archive');
  if (isPureArchiveTopology) {
    const archiveRes = evalArchiveColdStorage(topologyItems, catalogData, {}, 1, { chassisInfo: detectedChassis, targetDir, options });
    if (archiveRes && archiveRes.status !== 'NOT_EVALUATED') return _buildArchiveTapeEvalResult(topologyItems, archiveRes, catalogData, topology, detectedChassis, options);
  }
  return null;
}

module.exports = {
  buildAspectChecks,
  buildArchitecturalRationale,
  _dispatchSpecializedDomainEvaluator
};
