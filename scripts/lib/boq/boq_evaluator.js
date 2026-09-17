'use strict';
/**
 * scripts/lib/boq_evaluator.js — Multi-Aspect Physical Validation & Rule Engine
 *
 * Implements 7 physical math pre-checks:
 * 1. Compute & Thermal: TDP watts vs High Performance Fan Kit
 * 2. Memory & Channels: Interleaving, 1DPC/2DPC symmetry
 * 3. Storage Tri-Mode: Drive cage, controller & Smart Storage Battery
 * 4. Networking & OCP: OCP 3.0 slot capacity & port counts
 * 5. PCIe Riser Capacity: PCIe expansion slots vs risers
 * 6. Power Environment: -48VDC telco power supplies & DC lug kits
 * 7. Support & Services: Mandatory service SLA validation
 */

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx-js-style');

const { cleanBaseSKU } = require('../catalog/sku.js');
const { getMandatorySkusForChassis, DEFAULT_MANDATORY_SKUS } = require('../catalog/catalog_rules.js');
const { detectChassisVariant, validateConflictGraph, getChassisMap } = require('../conflict/conflict_graph.js');
const { setPhysicalMathValidator } = require('../conflict/strategy_synthesizer.js');
const { parseSkuLines } = require('./boq_parser.js');
const { resolveRequirementIntent } = require('./requirement_intent_resolver.js');

let _cachedChassisMap = null;
function getCachedChassisMap() {
  if (!_cachedChassisMap) {
    try {
      const mapPath = path.join(__dirname, '..', '..', 'config', 'chassis_map.json');
      if (fs.existsSync(mapPath)) {
        _cachedChassisMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
      } else {
        _cachedChassisMap = {};
      }
    } catch (_) {
      _cachedChassisMap = {};
    }
  }
  return _cachedChassisMap;
}

// Modular aspect subcomponents
const { evalComputeThermal } = require('../aspects/compute_thermal.js');
const { evalMemoryChannel } = require('../aspects/memory_channel.js');
const { evalStorageTriMode } = require('../aspects/storage_tri_mode.js');
const { evalNetworkingOcp } = require('../aspects/networking_ocp.js');
const { evalPcieRiserSlots } = require('../aspects/pcie_riser.js');
const { evalPowerEnvironment } = require('../aspects/power_environment.js');
const { evalSupportManufacturing } = require('../aspects/support_manufacturing.js');
const { evalSupportServices } = require('../aspects/support_services.js');
const { generateLifecycleRecommendations } = require('../conflict/resolution_matrix.js');

const HIGH_TDP_THRESHOLD_WATTS = 240;

function buildCtoBaseSkus() {
  const set = new Set();
  try {
    const cmap = getChassisMap();
    if (cmap.chassis_base_skus_by_family_gen) {
      for (const fam of Object.values(cmap.chassis_base_skus_by_family_gen)) {
        if (fam && fam.skus) {
          for (const sku of Object.keys(fam.skus)) {
            set.add(cleanBaseSKU(sku));
          }
        }
      }
    }
    if (cmap.chassis_base_skus) {
      for (const sku of Object.keys(cmap.chassis_base_skus)) {
        set.add(cleanBaseSKU(sku));
      }
    }
  } catch (_) {}
  return set;
}

const CTO_BASE_SKUS = buildCtoBaseSkus();

function emitProgress(step, total, label, status = 'in_progress', detail = '') {
  if (process.send) {
    process.send({ type: 'PROGRESS', step, total, label, status, detail });
  }
}

function readBoqLines(rawInput, filePath = '', targetSheet = null) {
  let lines = [];
  const targetPath = (filePath && typeof filePath === 'string')
    ? filePath
    : (typeof rawInput === 'string' && fs.existsSync(rawInput))
    ? rawInput
    : '';

  if (targetPath && (targetPath.endsWith('.xlsx') || targetPath.endsWith('.xls'))) {
    const workbook = xlsx.readFile(targetPath);
    let sheetNames = [];
    if (targetSheet) {
      if (workbook.SheetNames.includes(targetSheet)) {
        sheetNames = [targetSheet];
      } else {
        throw new Error(`Requested sheet "${targetSheet}" not found in workbook.`);
      }
    } else {
      // Prioritize dedicated BOM/Quote sheets if present
      const bomKeywords = ['bom', 'quote', 'boq', 'tender', 'hardware', 'parts'];
      const preferredSheet = workbook.SheetNames.find(name => {
        const lower = name.toLowerCase();
        return bomKeywords.some(kw => lower === kw || lower.includes(kw));
      });

      if (preferredSheet) {
        sheetNames = [preferredSheet];
      } else {
        // Skip non-BOM documentation / diagnostic sheets (Audit, Messages, Errors, Architecture, Compliance)
        const nonBomKeywords = ['audit', 'architecture', 'terms', 'notes', 'readme', 'compliance', 'matrix', 'messages', 'message', 'advice', 'log', 'logs', 'error', 'errors', 'validation'];
        const candidateSheets = workbook.SheetNames.filter(name => {
          const lower = name.toLowerCase();
          return !nonBomKeywords.some(kw => lower.includes(kw));
        });
        sheetNames = candidateSheets.length > 0 ? [candidateSheets[0]] : [workbook.SheetNames[0]];
      }
    }
    sheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const csvText = xlsx.utils.sheet_to_csv(sheet);
      lines.push(...csvText.split(/\r?\n/));
    });
  } else if (Array.isArray(rawInput)) {
    lines = rawInput.map(item => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        const sku = item.sku || item.partNumber || item.pn || item['Product #'] || item['Part No'] || '';
        const qty = item.quantity ?? item.qty ?? 1;
        const desc = item.description ?? item.desc ?? '';
        return `${sku}\t${qty}\t${desc}`;
      }
      return String(item);
    });
  } else if (targetPath && fs.existsSync(targetPath)) {
    lines = fs.readFileSync(targetPath, 'utf8').split(/\r?\n/);
  } else {
    lines = String(rawInput || '').split(/\r?\n/);
  }

  return lines.filter(l => l.trim().length > 0);
}

function parseAndConsolidateBOQDetailed(rawInput, filePath = '', targetSheet = null) {
  const rawLines = readBoqLines(rawInput, filePath, targetSheet);
  return { ...parseSkuLines(rawLines), rawLines };
}

function parseAndConsolidateBOQ(rawInput, filePath = '', targetSheet = null) {
  return parseAndConsolidateBOQDetailed(rawInput, filePath, targetSheet).items;
}

/**
 * Run modular physical math evaluation across solution aspects dynamically ($N$-Aspect Engine).
 *
 * @param {Array<object>} items - Consolidated BOQ items
 * @param {object} [catalogData=null] - Optional catalog companion object
 * @param {string} [targetDir=''] - Output folder for catalog rules
 * @returns {object} Evaluation results
 */

function validateNetworkingRules(ctx) {
  const { network, serverCount, mandatorySkus, errors, mathDeductions, warnings, missingDependencies } = ctx;
  const ocpSlotsClusterMax = network.maxOcpSlots * serverCount;
  const isExceedingOcp = network.ocpAdapterCount > ocpSlotsClusterMax;

  if (isExceedingOcp) {
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

  if (network.isMissing32GbTransceivers) {
    const reason = `SAN Networking Math: 32Gb Fibre Channel HBAs (${network.fcHbaPortCount32Gb} ports) require 32Gb SFP28/SFP+ optical transceivers. Found ${network.transceiverCount32Gb}.`;
    warnings.push(reason);
    missingDependencies.push({
      key: 'FC_32GB_TRANSCEIVER',
      rule: 'Fibre Channel Optical Transceiver Requirement',
      sku: 'AJ718A',
      description: 'HPE 32Gb Short Wave B-Series SFP+ Transceiver',
      quantity: Math.max(0, network.fcHbaPortCount32Gb - network.transceiverCount32Gb),
      reasoning: reason
    });
  }
  if (network.isMissing64GbTransceivers) {
    const reason = `SAN Networking Math: 64Gb Fibre Channel HBAs (${network.fcHbaPortCount64Gb} ports) require 64Gb optical transceivers. Found ${network.transceiverCount64Gb}.`;
    warnings.push(reason);
    missingDependencies.push({
      key: 'FC_64GB_TRANSCEIVER',
      rule: '64Gb Fibre Channel Optical Transceiver Requirement',
      sku: 'R7W32A',
      description: 'HPE 64Gb Short Wave SFP56 Transceiver',
      quantity: Math.max(0, network.fcHbaPortCount64Gb - network.transceiverCount64Gb),
      reasoning: reason
    });
  }
  if (network.isMissingOpticalPatchCables) {
    const reason = `SAN Cabling Advisory: Active optical transceivers (${network.activeOpticalTransceiverCount}) require corresponding OM4 LC-LC fiber optic patch cables. Found ${network.opticalPatchCableCount}.`;
    warnings.push(reason);
  }
  if (network.hasSanSinglePointOfFailure) {
    const reason = `SAN High-Availability Advisory: Single SAN switch configured with Fibre Channel HBAs. Dual redundant SAN fabrics recommended to eliminate Single Point of Failure (SPOF).`;
    warnings.push(reason);
  }
  if (network.hasSynergyFabricMismatch) {
    network.synergyFabricErrors.forEach(err => {
      errors.push(err);
      mathDeductions.push(err);
    });
  }
}

function validatePCIeRules(ctx) {
  const { pcie, serverCount, compute, errors, mathDeductions, warnings, missingDependencies, mandatorySkus } = ctx;
  const pcieSlotsClusterMax = pcie.totalSlotsAvailable * serverCount;
  const activePcieSlotsClusterMax = pcie.activeSlotsAvailable * serverCount;
  const isExceedingPcie = pcie.requiredPcieCards > pcieSlotsClusterMax;
  const isExceedingActivePcie = pcie.requiredPcieCards > activePcieSlotsClusterMax;

  if (isExceedingActivePcie) {
    const reason = `PCIe Active Slot Math Failed (CLIC Rule 81016755 / 81354683): ${pcie.requiredPcieCards} cards exceeds ${activePcieSlotsClusterMax} electrically active slots across ${serverCount} server(s). Slot 1 and/or Slot 4 require Riser Cable Kits to be enabled.`;
    errors.push(reason);
    mathDeductions.push(reason);
  } else if (isExceedingPcie) {
    const reason = `PCIe Math Failed: ${pcie.requiredPcieCards} required cards exceeds ${pcieSlotsClusterMax} total mechanical slots across ${serverCount} server(s).`;
    warnings.push(reason);
    mathDeductions.push(reason);
  }

  if (pcie.needsPrimaryCableKit) {
    const primaryCableSku = mandatorySkus?.PRIMARY_CABLE_KIT?.sku || 'P56073-B21';
    const primaryCableName = mandatorySkus?.PRIMARY_CABLE_KIT?.name || 'HPE ProLiant DL380 Primary Cable Kit';
    const reason = `CLIC Rule 81356091: Enabling Slot 1 on Primary 3x16 Riser requires Primary Cable Kit (${primaryCableSku}).`;
    warnings.push(reason);
    missingDependencies.push({
      key: 'PRIMARY_RISER_CABLE_KIT',
      rule: 'CLIC Rule 81356091: Primary 3x16 Riser Cable Enablement',
      sku: primaryCableSku,
      description: primaryCableName,
      quantity: serverCount,
      reasoning: reason
    });
  }

  if (pcie.needsSecondaryCableKit) {
    const secCableSku = mandatorySkus?.SECONDARY_CABLE_KIT?.sku || 'P56074-B21';
    const secCableName = mandatorySkus?.SECONDARY_CABLE_KIT?.name || 'HPE ProLiant DL380 Secondary Cable Kit';
    const reason = `CLIC Rule 81170920 / 81356092: Enabling Slot 4 on Secondary 3x16 Riser requires Secondary Cable Kit (${secCableSku}).`;
    warnings.push(reason);
    missingDependencies.push({
      key: 'SECONDARY_RISER_CABLE_KIT',
      rule: 'CLIC Rule 81170920: Secondary 3x16 Riser Cable Enablement',
      sku: secCableSku,
      description: secCableName,
      quantity: serverCount,
      reasoning: reason
    });
  }

  const cpusPerServer = compute.cpuCount / serverCount;
  if ((pcie.secondaryRiserCount > 0 || pcie.tertiaryRiserCount > 0) && cpusPerServer < 2) {
    const reason = `Compute/PCIe Math Failed: Secondary/Tertiary Risers require 2nd CPU socket. Only ${cpusPerServer} CPU(s) per node found.`;
    errors.push(reason);
    mathDeductions.push(reason);
  }
}

function validateThermalRules(ctx) {
  const { items, compute, pcie, storage, serverCount, mandatorySkus, errors, warnings, mathDeductions, missingDependencies, HIGH_TDP_THRESHOLD_WATTS } = ctx;
  if (compute.hasMixedCpuModels) {
    const reason = `Processor Architecture Conflict: Multi-socket server configurations require identical processor models (same core count, stepping, and frequency). Detected distinct CPU SKUs: ${(compute.uniqueCpuSkus || []).join(', ')}.`;
    errors.push(reason);
    mathDeductions.push(reason);
  }

  const isTapeLibrary = ctx.chassisInfo?.family === 'StoreEver' || storage?.msl3040BaseModuleCount > 0 ||
    items?.some(it => (it.description || '').toLowerCase().includes('msl3040') || it.sku === 'Q6Q62C');
  if (isTapeLibrary) return;

  const hasTriModeCage = storage?.hasDriveCage || storage?.needsDriveCageForController || (mandatorySkus?.GENERIC_CAGE?.sku && items?.some(it => ctx.cleanBaseSKU(it.sku) === ctx.cleanBaseSKU(mandatorySkus.GENERIC_CAGE.sku)));
  const needsFansForStorage = hasTriModeCage && storage?.hasStorageController && !compute.hasHighPerfFans;
  if (needsFansForStorage && !missingDependencies.some(d => d.key === 'HIGH_PERF_FAN_KIT')) {
    const reason = `INV-87: Tri-Mode Drive Cage with Storage Controller alters chassis airflow impedance, mandating High-Performance Fan Kit (${mandatorySkus.HIGH_PERF_FAN_KIT.sku}).`;
    warnings.push(reason);
    missingDependencies.push({
      key: 'HIGH_PERF_FAN_KIT',
      rule: 'INV-87: Storage Thermal Escalation Rule',
      sku: mandatorySkus.HIGH_PERF_FAN_KIT.sku,
      description: mandatorySkus.HIGH_PERF_FAN_KIT.name,
      quantity: serverCount,
      reasoning: reason
    });
  }

  if ((compute.maxCpuTdpWatts >= HIGH_TDP_THRESHOLD_WATTS || (pcie.gpuCount > 0 && !compute.isDl380aAccelerator)) && !compute.hasHighPerfFans) {
    const reason = pcie.gpuCount > 0 
      ? `Thermal Math: GPU Accelerator (${pcie.gpuCount} GPU(s)) mandates High-Performance Fan Kit (${mandatorySkus.HIGH_PERF_FAN_KIT.sku}) for adequate cooling envelope.`
      : `High TDP Thermal Math Failed: ${compute.maxCpuTdpWatts}W processor exceeds ${HIGH_TDP_THRESHOLD_WATTS}W limit without High-Performance Fan Kit.`;
    if (compute.maxCpuTdpWatts >= HIGH_TDP_THRESHOLD_WATTS) errors.push(reason);
    else warnings.push(reason);
    mathDeductions.push(reason);
    missingDependencies.push({
      key: 'HIGH_PERF_FAN_KIT',
      rule: 'High TDP Thermal Cooling Rule',
      sku: mandatorySkus.HIGH_PERF_FAN_KIT.sku,
      description: mandatorySkus.HIGH_PERF_FAN_KIT.name,
      quantity: serverCount,
      reasoning: reason
    });
  }

  if (compute.fanKitExceedsMax) {
    const reason = `CLIC Rule 81354654 Failed: High Performance Fan Kit (${mandatorySkus.HIGH_PERF_FAN_KIT.sku}) contains all 6 chassis fans. Maximum 1 kit allowed per server (${compute.fanKitCount} kits ordered for ${serverCount} servers). Normalize to 1 kit per server.`;
    errors.push(reason);
    mathDeductions.push(reason);
  }

  const isHeatsinkMandated = (compute.isGen11 && compute.maxCpuTdpWatts >= 270) || (compute.maxCpuTdpWatts >= 300);
  if (isHeatsinkMandated && !compute.hasHeatsinks && compute.highPerfHeatsinkSku) {
    const reason = `High TDP Heatsink Math: ${compute.maxCpuTdpWatts}W processor requires Performance Heatsink (${compute.highPerfHeatsinkSku}).`;
    warnings.push(reason);
    missingDependencies.push({
      key: 'HIGH_PERF_HEATSINK',
      rule: 'High TDP Performance Heatsink Rule',
      sku: compute.highPerfHeatsinkSku,
      description: mandatorySkus.HIGH_PERF_HEATSINK?.name || 'HPE ProLiant Performance Heat Sink Kit',
      quantity: compute.cpuCount,
      reasoning: reason
    });
  }
}

function validateStorageRules(ctx) {
  const { items, storage, power, serverCount, mandatorySkus, errors, warnings, mathDeductions, missingDependencies } = ctx;
  if (storage.hasLffDrivesInSffChassis) {
    const reason = `Storage Form Factor Conflict: 3.5" LFF drives (${storage.lffDriveCount}) cannot be installed in a 2.5" SFF chassis backplane.`;
    errors.push(reason);
    mathDeductions.push(reason);
  }

  if (storage.driveCount === 0 && !storage.hasNoDriveKit && !storage.hasStorageController && !storage.hasDriveCage) {
    const reason = `Storage Math Failed: 0 drives detected. Requires HPE No Drive Configuration FIO Kit.`;
    warnings.push(reason);
    mathDeductions.push(reason);
    missingDependencies.push({
      key: 'NO_DRIVE_FIO_KIT',
      rule: 'Drive-less Chassis Configuration Rule',
      sku: mandatorySkus.NO_DRIVE_FIO_KIT.sku,
      description: mandatorySkus.NO_DRIVE_FIO_KIT.name,
      quantity: serverCount,
      reasoning: reason
    });
  }

  const isTapeLibrary = ctx.chassisInfo?.family === 'StoreEver' || storage?.msl3040BaseModuleCount > 0 ||
    items?.some(it => (it.description || '').toLowerCase().includes('msl3040') || it.sku === 'Q6Q62C');
  const is1UChassis = ctx.chassisInfo?.model?.includes('DL360') ||
    items?.some(it => (it.description || '').toLowerCase().includes('dl360') || it.sku === 'P52499-B21' || it.sku === 'P52498-B21' || it.sku === 'P52497-B21');
  const hasBackplaneKit = items?.some(it => (it.description || '').toLowerCase().includes('backplane') || it.sku === 'P48895-B21');
  if (!storage.isLffChassis && !isTapeLibrary && !is1UChassis && !hasBackplaneKit && (storage.needsDriveCageForController || storage.hasControllerNoDriveConflict)) {
    const isDl380a = power?.isDl380aGpuChassis || items.some(it => (it.description || '').toLowerCase().includes('dl380a'));
    const isGen12 = items.some(it => (it.description || '').toLowerCase().includes('gen12'));
    const cageSku = mandatorySkus.GENERIC_CAGE?.sku || (isDl380a ? 'P74710-B21' : (isGen12 ? 'P75741-B21' : 'P48813-B21'));
    const cageDesc = mandatorySkus.GENERIC_CAGE?.name || (isDl380a ? 'HPE ProLiant Compute DL380a Gen12 4SFF U.3 FIO Drive Cage Kit' : (isGen12 ? 'HPE ProLiant Compute DL3XX Gen12 8SFF x4 U.3 Tri-Mode Drive Cage Kit' : 'HPE ProLiant DL380 Gen11 8SFF Tri-Mode Drive Cage Kit'));
    const cableSku = mandatorySkus.CONTROLLER_CABLE_KIT?.sku || (isGen12 ? 'P76456-B21' : 'P48918-B21');
    const cableDesc = mandatorySkus.CONTROLLER_CABLE_KIT?.name || (isGen12 ? 'HPE ProLiant Compute DL380 Gen12 8SFF x2 PCIe Box 2 Controller Cable Kit' : 'HPE ProLiant Storage Controller Enablement Cable Kit');
    const cageLabel = isDl380a ? '4SFF Drive Cage' : '8SFF Drive Cage';
    const reason = `INV-87: Storage Controller requires physical drive cage and backplane cabling. Internal RAID controller cannot cable into chassis with No Drive Kit. Adding ${cageLabel} (${cageSku}) and Box 2 Cable Kit (${cableSku}).`;
    warnings.push(reason);
    missingDependencies.push({
      key: 'DRIVE_CAGE_KIT',
      rule: 'INV-87: Storage Controller Backplane Cabling Rule',
      sku: cageSku,
      description: cageDesc,
      quantity: serverCount,
      reasoning: reason
    });
    missingDependencies.push({
      key: 'CONTROLLER_DRIVE_CABLE_KIT',
      rule: 'INV-87: Storage Controller Box 2 Cabling Rule',
      sku: cableSku,
      description: cableDesc,
      quantity: serverCount,
      reasoning: reason
    });
  }

  const hasNs204BootDevice = items.some(it => {
    const d = (it.description || '').toLowerCase();
    return d.includes('ns204') || d.includes('boot device') || (it.sku && it.sku.toLowerCase().includes('ns204'));
  });
  const hasNs204Enablement = items.some(it => {
    const d = (it.description || '').toLowerCase();
    return (d.includes('ns204') && (d.includes('enablement') || d.includes('rear mount'))) || (mandatorySkus?.BOOT_DEVICE_ENABLEMENT?.sku && ctx.cleanBaseSKU(it.sku) === ctx.cleanBaseSKU(mandatorySkus.BOOT_DEVICE_ENABLEMENT.sku));
  });
  if (hasNs204BootDevice && !hasNs204Enablement) {
    const isGen12 = items.some(it => (it.description || '').toLowerCase().includes('gen12'));
    const enablementSku = mandatorySkus.BOOT_DEVICE_ENABLEMENT?.sku || (isGen12 ? 'P74755-B21' : 'P54442-B21');
    const enablementDesc = mandatorySkus.BOOT_DEVICE_ENABLEMENT?.name || 'HPE ProLiant NS204i-u Rear Mount Enablement Kit';
    const reason = `INV-87: NS204i-u Boot Storage Device requires physical Rear Mount Enablement Kit (${enablementSku}).`;
    warnings.push(reason);
    missingDependencies.push({
      key: 'NS204_ENABLEMENT_KIT',
      rule: 'INV-87: NS204 Rear Boot Enablement Rule',
      sku: enablementSku,
      description: enablementDesc,
      quantity: serverCount,
      reasoning: reason
    });
  }

  if (storage.hasIncompatibleYCable) {
    const splitterCableSku = mandatorySkus.TRI_MODE_SPLITTER_CABLE?.sku || 'TRI_MODE_SPLITTER';
    const enablementCableSku = mandatorySkus.CONTROLLER_CABLE_KIT?.sku || 'P48918-B21';
    const reason = `CLIC Rules 81354627 & 81354632 Failed: Tri-Mode Splitter Cable Kit (${splitterCableSku}) requires PCIe-type RAID controller and Premium Cage. Not compatible with OCP storage controllers or standard cages. Remove ${splitterCableSku} and use ${enablementCableSku}.`;
    errors.push(reason);
    mathDeductions.push(reason);
  }

  if (storage.hasStorageController && !storage.hasSmartBattery) {
    const reason = `Storage Math Failed: Storage controller requires Smart Storage Battery to protect write cache.`;
    warnings.push(reason);
    mathDeductions.push(reason);
    missingDependencies.push({
      key: 'SMART_STORAGE_BATTERY',
      rule: 'Controller Cache Protection Rule',
      sku: mandatorySkus.SMART_STORAGE_BATTERY.sku,
      description: mandatorySkus.SMART_STORAGE_BATTERY.name,
      quantity: serverCount,
      reasoning: reason
    });
  }

  const controllerCableSku = mandatorySkus.CONTROLLER_CABLE_KIT?.sku || 'P48918-B21';
  const controllerCableName = mandatorySkus.CONTROLLER_CABLE_KIT?.name || 'HPE ProLiant Storage Controller Enablement Cable Kit';
  const hasEnablementCable = storage.hasOcpCable || items.some(it => ctx.cleanBaseSKU(it.sku) === ctx.cleanBaseSKU(controllerCableSku));
  if ((storage.needsCapacitorCable || storage.hasStorageController) && !hasEnablementCable) {
    const reason = `CLIC Rule 81354652: Smart Storage Hybrid Capacitor / Battery and Controller require Storage Controller Enablement Cable Kit (${controllerCableSku}) to connect power and sideband telemetry.`;
    warnings.push(reason);
    missingDependencies.push({
      key: 'STORAGE_CONTROLLER_ENABLEMENT_CABLE',
      rule: 'CLIC Rule 81354652: Capacitor Power Link Requirement',
      sku: controllerCableSku,
      description: controllerCableName,
      quantity: serverCount,
      reasoning: reason
    });
  }

  if (storage.needsSasExpander) {
    const sasExpanderSku = mandatorySkus.SAS_EXPANDER?.sku || 'P48835-B21';
    const sasExpanderName = mandatorySkus.SAS_EXPANDER?.name || 'HPE ProLiant SAS Expander Card Kit';
    const triModeSwitchSku = mandatorySkus.TRI_MODE_SWITCH?.sku || 'P55806-B21';
    const reason = `Storage Expander Math: ${storage.driveCount} drives exceeds direct controller capacity (${storage.controllerDirectCapacity} drives). Requires SAS Expander Card (${sasExpanderSku}) or Tri-Mode Switch Card (${triModeSwitchSku}).`;
    warnings.push(reason);
    missingDependencies.push({
      key: 'SAS_EXPANDER_CARD',
      rule: 'Storage Expander & Multi-Drive Channel Rule',
      sku: sasExpanderSku,
      description: sasExpanderName,
      quantity: serverCount,
      reasoning: reason
    });
  }
}

function validatePowerRules(ctx) {
  const { power, pcie, serverCount, mandatorySkus, errors, warnings, mathDeductions, missingDependencies, items } = ctx;
  if (power.hasMixedAcDcPower) {
    const reason = `Power Architecture Conflict: Configuration mixes AC power supplies (${power.acPsuCount}) and -48VDC power supplies (${power.dcPsuCount}) in the same chassis enclosure. AC and DC power supplies cannot be mixed within the same backplane.`;
    errors.push(reason);
    mathDeductions.push(reason);
  }

  const isMultiClusterMatchedPsuTender = serverCount > 1 &&
    ((power.platinumPsuCount || 0) >= 2 && (power.titaniumPsuCount || 0) >= 2) &&
    ((power.platinumPsuCount || 0) % 2 === 0) && ((power.titaniumPsuCount || 0) % 2 === 0);

  if (power.hasMixedEfficiencyPsus && !isMultiClusterMatchedPsuTender) {
    const reason = `Power Architecture Conflict: Configuration mixes Platinum and Titanium power supply efficiencies in the same server. Redundant power supplies must have matching efficiency ratings.`;
    errors.push(reason);
    mathDeductions.push(reason);
  }

  if (power.hasDcPowerSupply && !power.hasDcLugKit) {
    const reason = `Power Math Failed: -48VDC Power Supply requires DC Power Cable Lug Kit.`;
    errors.push(reason);
    mathDeductions.push(reason);
    missingDependencies.push({
      key: 'DC_LUG_KIT',
      rule: 'DC Power Supply Cable Rule',
      sku: mandatorySkus.DC_LUG_KIT.sku,
      description: mandatorySkus.DC_LUG_KIT.name,
      quantity: serverCount,
      reasoning: reason
    });
  }

  const isTapeLibrary = ctx.chassisInfo?.family === 'StoreEver' ||
    items?.some(it => (it.description || '').toLowerCase().includes('msl3040') || it.sku === 'Q6Q62C');
  if (!isTapeLibrary) {
    const psuPerServer = power.psuCount / serverCount;
    if (psuPerServer === 1) {
      const reason = `Power Redundancy Warning: Single power supply configured per node. Dual-socket enterprise nodes recommend 2x redundant PSUs.`;
      warnings.push(reason);
      const existingPsu = items.find(it => {
        const d = (it.description || '').toLowerCase();
        return d.includes('power supply') || d.includes('flex slot') || d.includes('psu');
      });
      const psuSku = existingPsu ? ctx.cleanBaseSKU(existingPsu.sku) : (mandatorySkus?.POWER_SUPPLY?.sku || 'P38997-B21');
      const psuDesc = existingPsu?.description || 'HPE 1600W Flex Slot Platinum Hot Plug Power Supply';
      missingDependencies.push({
        key: 'POWER_SUPPLY_REDUNDANCY',
        rule: 'Power Supply N+1 Redundancy Rule',
        sku: psuSku,
        description: psuDesc,
        quantity: serverCount,
        reasoning: reason
      });
    }
  }

  if (pcie.needsGpuPowerCableKit) {
    const reason = power.isDl380aGpuChassis
      ? `GPU Power Math: ${pcie.gpuCount} front-bay GPU accelerator(s) detected on DL380a Gen12. Requires ${Math.ceil(pcie.gpuCount / 2)} GPU 16-pin FIO Cable Kits (P74700-B21, 1 kit per 2 GPUs). Found ${Math.floor(pcie.gpuPowerCableKitCount / 2)}.`
      : `GPU Power Math: ${pcie.gpuCount} PCIe GPU accelerator(s) detected. Requires ${pcie.gpuCount} GPU Auxiliary Power Cable Kit(s) (P48816-B21 / P76450-B21) to connect to power distribution board. Found ${pcie.gpuPowerCableKitCount}.`;
    warnings.push(reason);
    missingDependencies.push({
      key: 'GPU_AUX_POWER_CABLE_KIT',
      rule: 'GPU Accelerator Auxiliary Power Rule',
      sku: power.isDl380aGpuChassis ? 'P74700-B21' : 'P48816-B21',
      description: power.isDl380aGpuChassis ? 'HPE ProLiant Compute DL380a Gen12 GPU 16-pin FIO Cable Kit' : 'HPE ProLiant DL380 Gen11 GPU Power Cable Kit',
      quantity: power.isDl380aGpuChassis ? Math.ceil((pcie.gpuCount - pcie.gpuPowerCableKitCount) / 2) * serverCount : (pcie.gpuCount - pcie.gpuPowerCableKitCount) * serverCount,
      reasoning: reason
    });
  }

  let h100Count = 0;
  for (const it of items) {
    if (it.description && (it.description.toLowerCase().includes('h100') || it.sku === 'S0E21A')) {
      h100Count += (it.quantity || 1);
    }
  }

  if (!power.isDl380aGpuChassis && (pcie.gpuCount >= 4 || h100Count >= 2) && !power.hasTitaniumPsu) {
    const reason = `INV-27: Multi-GPU Thermal Envelope: 4x+ GPUs or dual high-end GPUs mandate dual 1800W/2200W Titanium PSUs (P44712-B21).`;
    warnings.push(reason);
    missingDependencies.push({
      key: 'TITANIUM_PSU_MULTI_GPU',
      rule: 'Multi-GPU Titanium PSU Mandate (INV-27)',
      sku: 'P44712-B21',
      description: '1800W-2200W Titanium Power Supply Kit',
      quantity: 2 * serverCount,
      reasoning: reason
    });
  }

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

  if (power.needsHighLine220v) {
    const reason = `Power Derating Advisory: Estimated node power draw (${power.estimatedNodeWattage}W) requires 200V-240V high-line utility circuits to prevent single-PSU derating on ${power.maxPsuWattage}W power supplies.`;
    warnings.push(reason);
  }

  if (power.needsCeRemovalKit) {
    const ceRemovalSku = mandatorySkus.CE_REMOVAL_KIT?.sku || 'P35876-B21';
    const ceRemovalName = mandatorySkus.CE_REMOVAL_KIT?.name || 'HPE CE Mark Removal FIO Enablement Kit';
    const reason = `EU Lot 9 Compliance Advisory: High-draw configuration with Platinum PSUs requires 96% Titanium PSUs or CE Mark Removal FIO Enablement Kit (${ceRemovalSku}) for non-EU deployment.`;
    warnings.push(reason);
    missingDependencies.push({
      key: 'CE_MARK_REMOVAL_KIT',
      rule: 'EU Lot 9 / CE Mark Regulatory Enablement Rule',
      sku: ceRemovalSku,
      description: ceRemovalName,
      quantity: serverCount,
      reasoning: reason
    });
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
    const reason = `SaaS vs Hardware Support Delineation: Configuration includes SaaS software subscriptions without physical Pointnext hardware support/warranty (Tech Care/Foundation Care). SaaS cloud management cannot substitute for physical server break-fix maintenance coverage.`;
    warnings.push(reason);
  }

  if (support.needsAdditionalWindowsCores) {
    const reason = `OS Licensing Math: Server has ${support.detectedCpuCores} physical cores (${support.requiredWindowsCores} required across ${serverCount} node(s)) but only ${support.totalWindowsLicensedCores || support.totalCoveredWindowsCores} Windows Server licensed cores. Requires ${support.missingCoreLicenses} additional core license packs.`;
    warnings.push(reason);
    missingDependencies.push({
      key: 'WINDOWS_CORE_LICENSES',
      rule: 'Microsoft Windows Server Core Licensing Minimums (INV-28)',
      sku: 'P46200-B21',
      description: 'Microsoft Windows Server Additional Core License Pack (16-core)',
      quantity: Math.ceil(support.missingCoreLicenses / 16),
      reasoning: reason
    });
  }

  if (support.needsAdditionalVmwareCores) {
    const reason = `VMware Licensing Math: Configuration requires ${support.requiredVmwareCores} licensed cores (16 cores/socket minimum) but only ${support.vmwareLicensedCores} cores are licensed. Requires ${support.missingVmwareCores} additional VMware core licenses.`;
    warnings.push(reason);
    missingDependencies.push({
      key: 'VMWARE_CORE_LICENSES',
      rule: 'VMware Core Licensing Minimums & Per-Core Multipliers',
      sku: 'VMW-VCF-CORE',
      description: 'VMware Cloud Foundation / vSphere Per-Core Subscription License',
      quantity: support.missingVmwareCores,
      reasoning: reason
    });
  }

  if (support.needsAdditionalLinuxSubscriptions) {
    const reason = `Linux OS Licensing Math: Server has ${support.detectedCpuSockets} socket(s) requiring ${support.requiredLinuxSubscriptions} 1-2 socket subscription(s). Found ${support.linuxSubscriptions}.`;
    warnings.push(reason);
    missingDependencies.push({
      key: 'LINUX_OS_SUBSCRIPTIONS',
      rule: 'Red Hat Enterprise Linux / SLES 1-2 Socket Subscription Sizing',
      sku: 'RHEL-2S-SUB',
      description: 'Red Hat Enterprise Linux Server 1-2 Socket Standard Subscription',
      quantity: support.missingLinuxSubscriptions,
      reasoning: reason
    });
  }

  if (support.unsolicitedOptionalItems && support.unsolicitedOptionalItems.length > 0) {
    support.unsolicitedOptionalItems.forEach(item => {
      const adv = `Unsolicited Optional Service / Software (INV-32): SKU ${item.sku} (${item.description}) detected (${item.extendedPriceUsd || 0}). Optional startup service or add-on software was not explicitly requested by customer.`;
      warnings.push(adv);
      missingDependencies.push({
        key: 'UNSOLICITED_OPTIONAL_SERVICE',
        rule: 'Unsolicited Service Exclusion Rule (INV-32)',
        sku: item.sku,
        description: item.description,
        quantity: item.quantity || 1,
        reasoning: adv
      });
    });
  }
}

function validateBaseChassisRules(ctx) {
  const { items, storage, support, serverCount, mandatorySkus, errors, warnings, mathDeductions, missingDependencies, CTO_BASE_SKUS, chassisInfo, cleanBaseSKU } = ctx;
  const hasBaseChassis = items.some(it => {
    const clean = cleanBaseSKU(it.sku);
    return clean === chassisInfo.baseSku || CTO_BASE_SKUS.has(clean);
  });
  const hasNoDriveFioKit = items.some(it => cleanBaseSKU(it.sku) === mandatorySkus.NO_DRIVE_FIO_KIT.sku);
  const hasDriveCageKit = storage.hasDriveCage || items.some(it => cleanBaseSKU(it.sku) === 'P75741-B21' || cleanBaseSKU(it.sku) === 'P76449-B21' || cleanBaseSKU(it.sku) === 'P75740-B21' || cleanBaseSKU(it.sku) === 'P48813-B21');

  if (hasBaseChassis && storage.driveCount === 0 && !hasNoDriveFioKit && !hasDriveCageKit) {
    const reason = `CLIC Rule 81392308: Chassis ${chassisInfo.baseSku || 'CTO'} without drives requires ${mandatorySkus.NO_DRIVE_FIO_KIT.sku} FIO Kit.`;
    mathDeductions.push(reason);
    missingDependencies.push({
      key: 'CLIC_NO_DRIVE_FIO',
      rule: 'CLIC Rule 81392308: Front Cage / No Drive FIO Requirement',
      sku: mandatorySkus.NO_DRIVE_FIO_KIT.sku,
      description: mandatorySkus.NO_DRIVE_FIO_KIT.name,
      quantity: serverCount,
      reason: `UNBUILDABLE CONFIGURATION (Rule 81392308): Base chassis ordered without drives requires FIO Kit or an explicit Front Drive Cage Kit.`,
      reasoning: reason
    });
  }

}

function validateAlletraRules(ctx) {
  const { storage, errors, warnings, mathDeductions, missingDependencies } = ctx;
  if (storage.hasMissingControllerNode) {
    const reason = `Alletra Architecture Error: Alletra storage array requires dual (2x) controller nodes for active-active high-availability. Found ${storage.controllerNodeCount}.`;
    errors.push(reason);
    mathDeductions.push(reason);
  }
  if (storage.hasAsymmetricHbas) {
    const reason = `Alletra HBA Symmetry Warning: Host Bus Adapters must be symmetrically configured across dual controller nodes (${storage.hbaCount} HBAs found, even count required).`;
    warnings.push(reason);
  }
  if (storage.missingDaisyChainCables > 0) {
    const reason = `Alletra Cabling Requirement: Expansion shelves require 2x SAS daisy-chain cables per shelf (${storage.expansionShelfCount * 2} cables needed, found ${storage.sasDaisyChainCableCount}).`;
    warnings.push(reason);
    missingDependencies.push({
      key: 'SAS_DAISY_CHAIN_CABLE',
      rule: 'Alletra Expansion Shelf Daisy-Chain Cabling',
      sku: 'P40243-B21',
      description: 'HPE SAS Mini-HD to Mini-HD Cable',
      quantity: storage.missingDaisyChainCables,
      reasoning: reason
    });
  }
  if (storage.insufficientRaid6Drives) {
    const reason = `Alletra RAID 6 Constraint: RAID 6 disk groups require a minimum of 6 SSDs. Found ${storage.ssdCount}.`;
    errors.push(reason);
    mathDeductions.push(reason);
  }
  if (storage.insufficientRaid10Drives) {
    const reason = `Alletra RAID 10 Constraint: RAID 10 disk groups require a minimum of 4 SSDs. Found ${storage.ssdCount}.`;
    errors.push(reason);
    mathDeductions.push(reason);
  }
}

function validateStoreEverRules(ctx) {
  const { storage, warnings, missingDependencies } = ctx;
  if (storage.needsMiniSasHdCable) {
    const reason = `StoreEver SAS Cabling Math: ${storage.ltoSasDriveCount} SAS LTO tape drive(s) require external Mini-SAS HD cables.`;
    warnings.push(reason);
    missingDependencies.push({
      key: 'MINI_SAS_HD_CABLE',
      rule: 'StoreEver LTO SAS Drive Host Cabling',
      sku: '716189-B21',
      description: 'HPE 2.0m External Mini-SAS High Density to Mini-SAS HD Cable',
      quantity: storage.ltoSasDriveCount,
      reasoning: reason
    });
  }
  if (storage.needsFcTransceiver) {
    const reason = `StoreEver FC Transceiver Math: ${storage.ltoFcDriveCount} Fibre Channel LTO tape drive(s) require 8Gb/16Gb optical transceivers.`;
    warnings.push(reason);
    missingDependencies.push({
      key: 'FC_OPTICAL_TRANSCEIVER_TAPE',
      rule: 'StoreEver LTO FC Drive Optical Transceiver',
      sku: 'AJ716B',
      description: 'HPE 8Gb Short Wave B-Series Fibre Channel 1 Pack SFP+ Transceiver',
      quantity: storage.ltoFcDriveCount,
      reasoning: reason
    });
  }
  if (storage.exceedsSlotCapacity) {
    const reason = `StoreEver Capacity Advisory: ${storage.dataCartridgeCount} data cartridges exceeds total library capacity (${storage.totalMsl3040Slots} slots).`;
    warnings.push(reason);
  }
}

function validateMemoryRules(ctx) {
  const { memory, compute, errors, warnings, mathDeductions, missingDependencies } = ctx;
  if (memory.hasMixedDdrGeneration) {
    const reason = `Memory Generation Conflict: Mixing DDR4 and DDR5 memory modules in the same server is physically incompatible.`;
    errors.push(reason);
    mathDeductions.push(reason);
  }
  if (memory.hasMixedMemoryTypes) {
    const reason = `Memory Architecture Conflict: Mixing RDIMM, LRDIMM, or MRDIMM memory modules in the same system is strictly unsupported.`;
    errors.push(reason);
    mathDeductions.push(reason);
  }

  if (memory.hasBtoMemoryInCto) {
    memory.btoMemoryViolations.forEach(v => {
      errors.push(v.reason);
      mathDeductions.push(v.reason);
      missingDependencies.push({
        key: `FIO_MEMORY_${v.fioSku}`,
        rule: 'CLIC Option Type Constraint: FIO Memory Required in CTO Base Model',
        sku: v.fioSku,
        description: `HPE Factory Integrated Option (FIO) Replacement for ${v.btoSku}`,
        quantity: v.quantity,
        reason: v.reason,
        reasoning: v.reason
      });
    });
  }

  if (memory.memoryCount > 0 && !memory.isSupportedPopulation) {
    const reason = `Memory Math Failed: ${memory.memoryCount} DIMMs across ${compute.cpuCount || 2} CPUs is an unsupported asymmetric count.`;
    warnings.push(reason);
    mathDeductions.push(reason);
  } else if (memory.memoryCount > 0 && !memory.isBalancedChannel) {
    const reason = `Memory Interleaving Advisory: ${memory.memoryCount} DIMMs across ${compute.cpuCount || 2} CPUs (${memory.dimmsPerCpu} DIMMs/socket) is a supported minimal population. Populating all ${memory.channelsPerCpu} channels per socket achieves maximum interleaving bandwidth.`;
    warnings.push(reason);
  }
}

function collectChassisDefaultAdvisories(items, chassisInfo, warnings, skipGraphValidation) {
  if (skipGraphValidation) return { chassisDefaults: [], redundantDefaults: [] };
  const redundantDefaults = [];
  let chassisDefaults = [];
  try {
    const fullMap = getCachedChassisMap();
    const includedMap = fullMap.chassis_included_components || {};
    const baseKey = chassisInfo.baseSku
      || Object.keys(includedMap).find(key => key === chassisInfo.sku || includedMap[key].model === chassisInfo.model);
    chassisDefaults = (baseKey && includedMap[baseKey]?.includedComponents) || [];

    for (const item of chassisDefaults.length > 0 ? items : []) {
      const description = (item.description || '').toLowerCase();
      const clean = cleanBaseSKU(item.sku);
      const isStdFan = description.includes('standard fan')
        || (description.includes('fan kit') && !description.includes('high perf') && !description.includes('performance') && !description.includes('p48820') && !description.includes('p40502'));
      const isStdHeatsink = description.includes('standard heatsink')
        || (description.includes('heat sink') && !description.includes('performance') && !description.includes('high perf') && !description.includes('p48818') && !description.includes('p74792'));
      const isLomNic = description.includes('1gb 4-port') && description.includes('bcm5719') && !description.includes('pcie');
      if (!isStdFan && !isStdHeatsink && !isLomNic) continue;

      const includedDefault = chassisDefaults.find(component =>
        (isStdFan && component.category === 'Cooling / Thermal' && component.description.includes('Fan'))
        || (isStdHeatsink && component.category === 'Cooling / Thermal' && component.description.includes('Heatsink'))
        || (isLomNic && component.category === 'Network Adapter')
      );
      if (!includedDefault) continue;
      const advisory = `Chassis Default Advisory: SKU ${clean} (${item.description}) is already factory-included with base chassis ${baseKey} (${includedDefault.description}). Redundant line item not required unless explicitly ordered as a spare.`;
      warnings.push(advisory);
      redundantDefaults.push({
        sku: clean,
        description: item.description,
        includedDefault: includedDefault.description,
        advisory
      });
    }
  } catch (_) {
    // Chassis defaults are advisory; deterministic aspect checks still run.
  }
  return { chassisDefaults, redundantDefaults };
}

function buildAspectChecks(ctx) {
  const {
    compute, memory, storage, network, pcie, power, support,
    mandatorySkus, serverCount, hasDriveCageKit,
    isExceedingActivePcie, isExceedingPcie, isExceedingOcp,
    cpusPerServer, psuPerServer,
    activePcieSlotsClusterMax, pcieSlotsClusterMax, ocpSlotsClusterMax,
    HIGH_TDP_THRESHOLD_WATTS
  } = ctx;

  return [
    {
      id: 1,
      name: 'Thermal & Compute Math',
      iconType: 'Cpu',
      defaultRule: 'CPU TDP thermal envelope vs cooling kit population rules (CLIC Rule 81354654)',
      status: ((compute.maxCpuTdpWatts >= HIGH_TDP_THRESHOLD_WATTS || (pcie.gpuCount > 0 && !compute.isDl380aAccelerator)) && !compute.hasHighPerfFans) || compute.fanKitExceedsMax ? 'FAIL' : 'PASS',
      detail: compute.fanKitExceedsMax
        ? `CLIC Rule 81354654 Failed: High Performance Fan Kit (${mandatorySkus.HIGH_PERF_FAN_KIT.sku}) contains all 6 chassis fans. Maximum 1 kit allowed per server (${compute.fanKitCount} kits ordered).`
        : ((compute.maxCpuTdpWatts >= HIGH_TDP_THRESHOLD_WATTS || (pcie.gpuCount > 0 && !compute.isDl380aAccelerator)) && !compute.hasHighPerfFans)
        ? `High TDP Thermal Math Failed: ${compute.maxCpuTdpWatts}W processor exceeds ${HIGH_TDP_THRESHOLD_WATTS}W limit without High-Performance Fan Kit.`
        : compute.isDl380aAccelerator
        ? `Verified ${compute.cpuCount} CPUs (${cpusPerServer}/node) within TDP envelope with DL380a factory-integrated high-performance accelerator cooling architecture.`
        : `Verified ${compute.cpuCount} CPUs (${cpusPerServer}/node) within TDP envelope with valid fan kit count.`
    },
    {
      id: 2,
      name: 'Memory & Channel Balance',
      iconType: 'Memory',
      defaultRule: 'Memory interleaving, channel balance & population rules (CLIC Rules 81354490 & 91001655)',
      status: (memory.memoryCount > 0 && !memory.isSupportedPopulation) || memory.hasBtoMemoryInCto ? 'FAIL' : 'PASS',
      detail: memory.hasBtoMemoryInCto
        ? `Memory Option Rule Failed (CLIC Rule 91001655): Standalone BTO Memory SKU (${memory.btoMemoryViolations.map(v => v.btoSku).join(', ')}) is restricted in CTO base server. Direct fix: Replace with FIO SKU (${memory.btoMemoryViolations.map(v => v.fioSku).join(', ')}).`
        : (memory.memoryCount > 0 && !memory.isSupportedPopulation)
        ? `Memory Math Failed: ${memory.memoryCount} DIMMs across ${compute.cpuCount || 2} CPUs is not balanced or is an unsupported asymmetric count.`
        : !memory.isBalancedChannel
        ? `Verified ${memory.memoryCount} DIMMs in supported entry population (${memory.memoryCount / serverCount} DIMMs/node, ${memory.totalMemoryGb / serverCount}GB RAM). Note: Maximum memory interleaving bandwidth is achieved with ${memory.channelsPerCpu} DIMMs per socket.`
        : `Verified ${memory.memoryCount} DIMMs in balanced configuration (${memory.memoryCount / serverCount} DIMMs/node).`
    },
    {
      id: 3,
      name: 'Storage & Controller Cabling',
      iconType: 'HardDrive',
      defaultRule: 'Storage controller, drive cage & cable kit compatibility checks (CLIC Rules 81354627 & 81354632)',
      status: storage.hasIncompatibleYCable || (storage.driveCount === 0 && !storage.hasNoDriveKit && !hasDriveCageKit) || (storage.hasStorageController && !storage.hasSmartBattery) ? 'FAIL' : 'PASS',
      detail: storage.hasIncompatibleYCable
        ? `CLIC Rules 81354627 & 81354632 Failed: Tri-Mode Splitter Cable Kit is incompatible with OCP storage controllers / standard cages. Controller Enablement Cable (${mandatorySkus?.CONTROLLER_CABLE_KIT?.sku || 'P48918-B21'}) is the correct cable.`
        : (storage.driveCount === 0 && !storage.hasNoDriveKit && !hasDriveCageKit)
        ? 'Storage Math Failed: 0 drives requires No Drive Configuration FIO Kit.'
        : storage.hasStorageController && !storage.hasSmartBattery
        ? 'Storage Math Failed: Storage controller requires Smart Storage Battery / Capacitor Kit.'
        : `Verified ${storage.driveCount} drives (${storage.driveCount / serverCount}/node) and controller configuration.`
    },
    {
      id: 4,
      name: 'PCIe Riser & Slot Expansion Math',
      iconType: 'Layers',
      defaultRule: 'PCIe slot capacity, active riser cabling & slot expansion rules (CLIC Rules 81016755 & 81354683)',
      status: isExceedingActivePcie || isExceedingPcie || ((pcie.secondaryRiserCount > 0 || pcie.tertiaryRiserCount > 0) && cpusPerServer < 2) ? 'FAIL' : 'PASS',
      detail: isExceedingActivePcie
        ? `PCIe Active Slot Math Failed (CLIC Rule 81016755): ${pcie.requiredPcieCards} required cards exceeds ${activePcieSlotsClusterMax} electrically cabled active slots. Slot 1 and/or Slot 4 require Riser Cable Kits (${mandatorySkus?.PRIMARY_CABLE_KIT?.sku || 'PRIMARY_CABLE_KIT'} / ${mandatorySkus?.SECONDARY_CABLE_KIT?.sku || 'SECONDARY_CABLE_KIT'}).`
        : isExceedingPcie
        ? `PCIe Math Failed: ${pcie.requiredPcieCards} required cards exceeds ${pcieSlotsClusterMax} slots.`
        : (pcie.secondaryRiserCount > 0 || pcie.tertiaryRiserCount > 0) && cpusPerServer < 2
        ? 'Compute/PCIe Math Failed: Secondary/Tertiary Risers require 2nd CPU socket.'
        : `Verified ${pcie.requiredPcieCards} PCIe cards fit within ${activePcieSlotsClusterMax} active cabled slots (${Math.ceil(pcie.requiredPcieCards / serverCount)} cards/node)${pcie.gpuCount > 0 && power.isDl380aGpuChassis ? ` plus ${pcie.gpuCount} front-bay accelerator(s) seated on high-speed switchboards` : ''}.`
    },
    {
      id: 5,
      name: 'Networking & OCP Interconnect',
      iconType: 'Zap',
      defaultRule: 'OCP 3.0 network adapter slots and port allocation rules (CLIC Rule 81355854)',
      status: isExceedingOcp || network.hasConflictingOcpCables ? 'FAIL' : 'PASS',
      detail: network.hasConflictingOcpCables
        ? `CLIC Rule 81355854 Failed: CPU1 to OCP2 (${mandatorySkus?.CPU1_OCP_CABLE?.sku || 'CPU1_OCP'}) and CPU2 to OCP2 (${mandatorySkus?.CPU2_OCP_CABLE?.sku || 'CPU2_OCP'}) enablement kits cannot be selected together.`
        : isExceedingOcp
        ? `Networking Math Failed: ${network.ocpAdapterCount} OCP adapters exceeds maximum ${ocpSlotsClusterMax} slots.`
        : `Verified ${network.networkPortsCount} active network ports (${network.hasOcpAdapter ? network.ocpAdapterCount + 'x OCP 3.0 NICs' : 'Standard PCIe/LOM NICs'}).`
    },
    {
      id: 6,
      name: 'Power & Redundancy Math',
      iconType: 'Power',
      defaultRule: 'Power supply redundancy rating & auxiliary kit requirements',
      status: (power.hasDcPowerSupply && !power.hasDcLugKit) || power.hasDl380aGpuPsuShortage ? 'FAIL' : 'PASS',
      detail: power.hasDcPowerSupply && !power.hasDcLugKit
        ? 'Power Math Failed: -48VDC Power Supply requires DC Power Cable Lug Kit.'
        : power.hasDl380aGpuPsuShortage
        ? `DL380a GPU Power Matrix Failed: ${power.dl380aGpuModeCapacity}DW mode requires ${power.requiredDl380aPsuCountPerServer} identical 2400W or 3200W PSUs per server (${power.requiredDl380aPsuCount} total); found ${power.psuCount}.`
        : `Verified power supply and infrastructure dependencies (${psuPerServer} PSUs/node).`
    },
    {
      id: 7,
      name: 'Vendor Support Taxonomy & Licensing',
      iconType: 'Award',
      defaultRule: 'Hardware SKU validation, requested support coverage, and OS core multipliers (INV-28, INV-32)',
      status: support.needsAdditionalWindowsCores || support.needsAdditionalVmwareCores || support.needsAdditionalLinuxSubscriptions
        ? 'WARN'
        : (!support.hasSupportService ? 'WARN' : 'PASS'),
      detail: support.needsAdditionalWindowsCores
        ? `Windows OS Licensing Deficit: Requires ${support.missingCoreLicenses} additional core licenses (${support.totalWindowsLicensedCores}/${support.requiredWindowsCores} cores covered).`
        : support.needsAdditionalVmwareCores
        ? `VMware Licensing Deficit: Requires ${support.missingVmwareCores} additional VMware core licenses (${support.vmwareLicensedCores}/${support.requiredVmwareCores} cores covered).`
        : support.needsAdditionalLinuxSubscriptions
        ? `Linux OS Licensing Deficit: Requires ${support.missingLinuxSubscriptions} additional 1-2 socket subscription(s).`
        : support.hasSupportService
        ? `Verified requested support services and OS core allocations${support.hasManagementLicense ? '; customer-selected management licensing is present' : ''}.`
        : 'Support Taxonomy Advisory: Missing Pointnext / Tech Care service line.'
    }
  ];
}

function buildArchitecturalRationale(ctx) {
  const { power, pcie, storage, memory, serverCount, compute } = ctx;
  const architecturalRationale = [];
  if (power.isDl380aGpuChassis) {
    if (pcie.gpuCount > 0) {
      architecturalRationale.push({
        topic: 'DL380a Gen12 GPU Density & NVLink Bridge Physical Clearance Rule',
        rationale: 'The DL380a Gen12 platform supports up to 8 double-wide (8DW) GPUs under P75008-B21 (with dual PCIe Gen5 switchboards P74714-B21) or 10DW under P75005-B21 (captive risers). For NVIDIA H200 NVL (S3U30C), physical NVLink bridges (S4A90C / S4A91C) are mandatory for 900 GB/s inter-GPU memory pooling. Per HPE QuickSpecs, the dense 10DW captive riser mode does NOT support NVLink bridges ("10DW configuration does not support GPU NVL bridges"). Therefore, 8DW Mode is the absolute maximum buildable configuration for H200 NVL on this chassis.'
      });
      architecturalRationale.push({
        topic: 'DL380a Front-Bay Accelerator Cabling & Cooling',
        rationale: 'Front-bay accelerators on DL380a Gen12 connect directly to the switchboards using P74700-B21 (GPU 16-pin FIO Cable Kits, 1 kit per 2 GPUs) and do not consume rear PCIe riser slots, keeping rear slots open for networking and HBAs. High-performance counter-rotating cooling fans are factory-integrated into the P76706-B21 chassis.'
      });
    }
  }
  if (storage.hasNoDriveKit) {
    architecturalRationale.push({
      topic: 'No Local Drive Configuration FIO Kit (873763-B21)',
      rationale: 'HPE ProLiant Compute DL380 No Drive Configuration FIO Kit (873763-B21, $14 list) satisfies CLIC Rule 81392308 for diskless compute nodes, clearing mandatory front drive cage and RAID controller requirements.'
    });
  }
  if (power.hasCeRemovalKit) {
    architecturalRationale.push({
      topic: 'EU Ecodesign ErP Lot 9 Regulatory Clearance (P35876-B21)',
      rationale: 'HPE CE Mark Removal FIO Enablement Kit (P35876-B21, $1 list) clears EU Lot 9 software prompt for 94% Platinum PSUs on dual-socket configurations without altering requested PSU hardware.'
    });
  }
  if (memory.memoryCount > 0 && !memory.isBalancedChannel && memory.isSupportedPopulation) {
    architecturalRationale.push({
      topic: 'Memory Population & Interleaving Bandwidth',
      rationale: `Configured with ${memory.dimmsPerCpu} DIMMs per socket (${memory.totalMemoryGb / serverCount}GB RAM), which is a valid, certified entry memory population in HPE QuickSpecs. For workloads requiring maximum memory bandwidth, populating all ${memory.channelsPerCpu} channels per socket (1DPC) provides 100% full-channel interleaving.`
    });
  }
  return architecturalRationale;
}

function evaluatePhysicalMath(items, catalogData = null, targetDir = '', options = {}) {
  if (!items || !Array.isArray(items) || items.length === 0) {
    const reason = 'Empty BOQ: No SKUs or line items detected.';
    return {
      isMathClean: false,
      isGraphClean: false,
      criticalViolationsCount: 1,
      confidence: {
        score: 0.0,
        isHitlTriggered: true,
        confidenceReasons: [`[CRITICAL_MATH] ${reason}`]
      },
      errors: [reason],
      warnings: [],
      missingDependencies: [],
      mathDeductions: [reason],
      evalSummary: {},
      aspectChecks: [],
      conflictGraph: {
        isWholeSolutionValid: false,
        conflicts: [{ level: 'BOQ', type: 'EMPTY_INPUT', message: reason }],
        resolvedFixes: [],
        unresolvedConflicts: [],
        rankedSolutions: []
      }
    };
  }

  const chassisInfo = detectChassisVariant(items);
  const mandatorySkus = getMandatorySkusForChassis(chassisInfo);

  // Detect server / chassis node count for multi-node orders
  let serverCount = 1;
  let railKitCount = 0;
  for (const it of items) {
    const desc = (it.description || '').toLowerCase();
    const clean = cleanBaseSKU(it.sku);
    if (
      desc.includes('configure-to-order') ||
      desc.includes('cto server') ||
      desc.includes('base server') ||
      clean === chassisInfo.baseSku ||
      CTO_BASE_SKUS.has(clean)
    ) {
      serverCount = Math.max(1, parseInt(it.quantity, 10) || 1);
    }
    if (desc.includes('rack rail') || desc.includes('rail kit') || clean === 'P52341-B21') {
      railKitCount += parseInt(it.quantity, 10) || 1;
    }
  }

  emitProgress(2, 10, 'Compute & Thermal Profiling', 'in_progress', `Analyzing ${items.length} SKUs for high-TDP processor constraints and heatsink counts.`);
  const compute = evalComputeThermal(items, catalogData, mandatorySkus, serverCount);

  emitProgress(3, 10, 'Memory Channel Math', 'in_progress', `Validating 1DPC / 2DPC symmetry and balanced memory population.`);
  const memory = evalMemoryChannel(items, compute.cpuCount, catalogData);

  emitProgress(4, 10, 'Storage Tri-Mode Validation', 'in_progress', `Verifying NVMe/SAS/SATA drive cages, controllers, and backplane capacities.`);
  const storage = evalStorageTriMode(items, catalogData, mandatorySkus);

  emitProgress(5, 10, 'Networking & PCIe Constraints', 'in_progress', `Analyzing OCP NICs and PCIe Riser slot math.`);
  const network = evalNetworkingOcp(items, catalogData);
  const pcie = evalPcieRiserSlots(items, catalogData);
  if (pcie.slotLayout) {
    const perNodeDemand = pcie.requiredPcieCards / serverCount;
    pcie.slotLayout.perNodeDemand = {
      pcieCards: perNodeDemand,
      gpuCards: pcie.gpuCount / serverCount,
      remainingMechanicalSlots: Math.max(0, pcie.totalSlotsAvailable - perNodeDemand),
      remainingActiveSlots: Math.max(0, pcie.activeSlotsAvailable - perNodeDemand)
    };
    pcie.slotLayout.clusterTotals = {
      serverCount,
      pcieCardDemand: pcie.requiredPcieCards,
      gpuCardDemand: pcie.gpuCount,
      mechanicalSlotCapacity: pcie.totalSlotsAvailable * serverCount,
      electricallyActiveSlotCapacity: pcie.activeSlotsAvailable * serverCount,
      x16SlotCapacity: pcie.x16LanesAvailable * serverCount
    };
  }

  emitProgress(6, 10, 'Power & Infrastructure Checking', 'in_progress', `Verifying DC power lug kits and redundancy.`);
  const power = evalPowerEnvironment(items, catalogData, mandatorySkus);
  const support = evalSupportManufacturing(items, catalogData, 0, serverCount);
  const lifecycle = (options.skipLifecycle || options.skipGraphValidation)
    ? { hasObsoleteRisk: false, hasEolWarning: false, obsoleteSkus: [], eolSkus: [], nearExpirySkus: [] }
    : evalSupportServices(items, catalogData, options.lifecycle || {});
  const lifecycleRecommendations = (options.skipLifecycle || options.skipGraphValidation)
    ? []
    : generateLifecycleRecommendations(items, catalogData, options.lifecycle || {});

  // Universal Zero-Hardcoding Generic Domain Template Evaluation (INV-56)
  let genericDomainAudit = null;
  if (!options.skipGraphValidation) {
    try {
      const genericTemplates = require('../catalog/generic_domain_templates.js');
      const detectedDomain = chassisInfo.family === 'Alletra' ? 'STORAGE' : (chassisInfo.family === 'Synergy' ? 'NETWORKING' : 'SERVER');
      genericDomainAudit = genericTemplates.evaluateGenericDomainRules(items, {
        domain: detectedDomain,
        catalog: catalogData,
        chassisProfile: (chassisInfo.model || '').toLowerCase().includes('dl145') ? 'EDGE' : 'ENTERPRISE'
      });
    } catch (genErr) {
      console.warn('[BOQ_EVALUATOR] Generic domain rules evaluation advisory:', genErr.message);
    }
  }

  const errors = [];
  const warnings = [];
  const missingDependencies = [];
  const mathDeductions = [];
  const { chassisDefaults, redundantDefaults } = collectChassisDefaultAdvisories(
    items,
    chassisInfo,
    warnings,
    options.skipGraphValidation
  );

  if (lifecycle.hasObsoleteRisk) {
    warnings.push('Lifecycle Risk: Obsolete (OB) component(s) detected in BOM. Upgrade recommendations generated.');
  }
  if (lifecycle.hasEolWarning) {
    warnings.push('Lifecycle Advisory: 90-Day EOL component(s) detected in BOM. Advance migration recommended.');
  }

  const ocpSlotsClusterMax = network.maxOcpSlots * serverCount;
  const pcieSlotsClusterMax = pcie.totalSlotsAvailable * serverCount;
  const activePcieSlotsClusterMax = pcie.activeSlotsAvailable * serverCount;
  const isExceedingOcp = network.ocpAdapterCount > ocpSlotsClusterMax;
  const isExceedingPcie = pcie.requiredPcieCards > pcieSlotsClusterMax;
  const isExceedingActivePcie = pcie.requiredPcieCards > activePcieSlotsClusterMax;
  const psuPerServer = power.psuCount / serverCount;
  const cpusPerServer = compute.cpuCount / serverCount;
  const hasDriveCageKit = storage.hasDriveCage || items.some(it => (it.description || '').toLowerCase().includes('drive cage') || (it.description || '').toLowerCase().includes('cage kit') || (mandatorySkus?.GENERIC_CAGE?.sku && cleanBaseSKU(it.sku) === cleanBaseSKU(mandatorySkus.GENERIC_CAGE.sku)));
  
  const ctx = {
    items, serverCount, compute, memory, storage, network, pcie, power, support, lifecycle,
    chassisInfo, mandatorySkus, CTO_BASE_SKUS, HIGH_TDP_THRESHOLD_WATTS,
    errors, warnings, mathDeductions, missingDependencies, cleanBaseSKU,
    hasDriveCageKit, ocpSlotsClusterMax, pcieSlotsClusterMax, activePcieSlotsClusterMax,
    isExceedingOcp, isExceedingPcie, isExceedingActivePcie,
    psuPerServer, cpusPerServer
  };

  validateNetworkingRules(ctx);
  validatePCIeRules(ctx);
  validateThermalRules(ctx);
  validateStorageRules(ctx);
  validatePowerRules(ctx);
  validateSupportRules(ctx);
  validateBaseChassisRules(ctx);
  validateAlletraRules(ctx);
  validateStoreEverRules(ctx);
  validateMemoryRules(ctx);

  const aspectChecks = buildAspectChecks(ctx);
  const formFactorRU = chassisInfo.formFactor === '1U' ? 1 : 
                       chassisInfo.formFactor === '4U' ? 4 : 2;
  const architecturalRationale = buildArchitecturalRationale(ctx);

  const evalSummary = {
    cpuCount: compute.cpuCount,
    maxCpuTdpWatts: compute.maxCpuTdpWatts,
    memoryCount: memory.memoryCount,
    totalMemoryGb: memory.totalMemoryGb,
    isBalancedChannel: memory.isBalancedChannel,
    isSupportedPopulation: memory.isSupportedPopulation,
    dimmsPerCpu: memory.dimmsPerCpu,
    driveCount: storage.driveCount,
    hasStorageController: storage.hasStorageController,
    hasSmartBattery: storage.hasSmartBattery,
    hasNoDriveKit: storage.hasNoDriveKit,
    hasHighPerfFans: compute.hasHighPerfFans,
    hasHeatsinks: compute.hasHeatsinks,
    hasDcPowerSupply: power.hasDcPowerSupply,
    hasDcLugKit: power.hasDcLugKit,
    hasOcpAdapter: network.hasOcpAdapter,
    networkPortsCount: network.networkPortsCount,
    requiredPcieCards: pcie.requiredPcieCards,
    totalPcieSlotsAvailable: pcie.totalSlotsAvailable,
    architecturalRationale,
    hasSupportService: support.hasSupportService,
    lifecycleRisks: lifecycle,
    lifecycleRecommendations,
    // Nested aspect sub-objects for detailed observability & testability
    compute,
    memory,
    storage,
    networking: network,
    pcie,
    power,
    support,
    // Flat action checklist for fast UI and API consumption (QW-1)
    needsActions: missingDependencies.map(d => d.key || d.sku),
    // Cluster Infrastructure Sizing Matrix
    clusterSizing: {
      serverCount,
      totalRackUnits: serverCount * formFactorRU,
      standard42uRacksRequired: Math.ceil((serverCount * formFactorRU) / 42),
      totalFacilityPowerKw: Number(((serverCount * (power.maxPsuWattage || 800)) / 1000).toFixed(1)),
      estimatedNodeWattage: power.estimatedNodeWattage,
      railKitCoverage: {
        required: serverCount,
        recommendedSku: 'P52341-B21',
        description: 'HPE ProLiant DL380 Gen11 Easy Install Rail Kit',
        providedCount: railKitCount || 0,
        isCompliant: (railKitCount || 0) >= serverCount
      },
      needsHighLine220v: power.needsHighLine220v
    },
    errors,
    warnings,
    mathDeductions,
    missingDependencies,
    chassisDefaults,
    redundantDefaults,
    aspectChecks,
    genericDomainAudit
  };

  let conflictGraphResults = { isWholeSolutionValid: true, conflicts: [], resolvedFixes: [], unresolvedConflicts: [], rankedSolutions: [] };
  if (!options.skipGraphValidation) {
    emitProgress(7, 10, 'Validating Conflict Graph', 'in_progress', 'Resolving dependencies and checking for architectural conflicts.');

    let resolvedDir = targetDir;
    if (!resolvedDir) {
      const { autoDetectChassisDir } = require('../catalog/catalog_discovery.js');
      resolvedDir = autoDetectChassisDir(items);
    }

    conflictGraphResults = validateConflictGraph(items, missingDependencies, resolvedDir, '', { skipSynthesis: options.skipSynthesis === true });
  }

  const isMathClean = errors.length === 0;
  const isGraphClean = conflictGraphResults.isWholeSolutionValid;
  const criticalViolationsCount = errors.length + (conflictGraphResults.conflicts ? conflictGraphResults.conflicts.length : 0);

  let confidenceScore = 1.0;
  if (!isMathClean) confidenceScore -= (errors.length * 0.15);
  if (!isGraphClean) confidenceScore -= (conflictGraphResults.conflicts.length * 0.10);
  if (warnings.length > 0) confidenceScore -= (warnings.length * 0.05);
  confidenceScore = Math.max(0.1, parseFloat(confidenceScore.toFixed(2)));

  const confidence = {
    score: confidenceScore,
    isHitlTriggered: confidenceScore < 0.75 || criticalViolationsCount > 0,
    confidenceReasons: [
      ...errors.map(e => `[CRITICAL_MATH] ${e}`),
      ...conflictGraphResults.conflicts.map(c => `[CONFLICT_GRAPH] ${c.message}`),
      ...warnings.map(w => `[WARNING] ${w}`)
    ]
  };

  if (confidence.confidenceReasons.length === 0) {
    confidence.confidenceReasons.push('All 7 physical aspects passed deterministic evaluation and graph rules.');
  }

  return {
    isMathClean,
    isGraphClean,
    criticalViolationsCount,
    confidence,
    errors,
    warnings,
    missingDependencies,
    mathDeductions,
    evalSummary,
    architecturalRationale: evalSummary.architecturalRationale,
    clusterSizing: evalSummary.clusterSizing,
    aspectChecks,
    genericDomainAudit,
    conflictGraph: conflictGraphResults
  };
}

function formatNotebookQueryPayload(items, evalResults, rankedSolutions = []) {
  const chassisInfo = evalResults.conflictGraph?.chassisInfo || detectChassisVariant(items);
  const issues = [
    ...(evalResults.errors || []),
    ...(evalResults.conflictGraph?.conflicts || []).map(c => c.message)
  ];

  const fixes = evalResults.missingDependencies || [];
  const skuManifest = (items || []).map(i => `${i.sku || 'SKU'} (x${i.quantity || 1})`).join(', ');

  let queryText = `Validate complete BOQ configuration compatibility for ${chassisInfo.model || chassisInfo.id || 'Server'}.\nBOM Manifest: ${skuManifest}.`;
  if (issues.length > 0) {
    queryText += `\nDetected Physical Checks / Conflicts (${issues.length}): ${issues.join('; ')}.`;
  }
  if (fixes.length > 0) {
    queryText += `\nProposed Auxiliary Fixes: ${fixes.map(f => f.sku).join(', ')}.`;
  }
  if (rankedSolutions && rankedSolutions.length > 0) {
    const rankSummary = rankedSolutions.slice(0, 3).map(r => `Rank ${r.rank} (${r.tierTitle}): $${r.estimatedCapex || 0}`).join(' | ');
    queryText += `\nRanked Solution Options: ${rankSummary}.`;
  }
  const requirementResolution = evalResults.requirementResolution || null;
  const pcieLayout = evalResults.evalSummary?.pcie?.slotLayout || null;
  if (requirementResolution && requirementResolution.resolutions?.length > 0) {
    const rolesSummary = requirementResolution.resolutions
      .map(r => `${r.expectedRole}: ${r.status} (${(r.candidates || []).map(c => c.sku).join(', ')})`)
      .join('; ');
    queryText += `\nRequirement-category resolution: ${rolesSummary}.`;
  }
  if (pcieLayout) {
    queryText += `\nPCIe topology context: ${pcieLayout.totalMechanicalSlots} mechanical slots, ${pcieLayout.electricallyActiveSlots} active slots, ${pcieLayout.inputDemandPcieCards} PCIe cards required, base primary slots: ${pcieLayout.platformBaseMechanicalSlots}.`;
  }

  return {
    chassis: chassisInfo.id || chassisInfo.model,
    query: queryText,
    context: {
      itemsCount: items.length,
      detectedTdp: evalResults.evalSummary?.maxCpuTdpWatts,
      memoryTotalGb: evalResults.evalSummary?.totalMemoryGb,
      issuesCount: issues.length,
      skuManifest,
      requestedRoles: requirementResolution?.intent?.requestedRoles || [],
      requirementClarificationRequired: requirementResolution?.requiresHumanClarification || false,
      pcieLayout
    }
  };
}

function evaluateBOQMultiAspect(filePathOrText, options = {}) {
  const parsed = parseAndConsolidateBOQDetailed(filePathOrText, options.filePath || '', options.targetSheet || null);
  const requirementResolution = options.catalogData
    ? resolveRequirementIntent({
      items: parsed.items,
      unresolvedRequirements: parsed.unresolvedRequirements,
      rawLines: parsed.rawLines,
      catalogData: options.catalogData,
      productConfirmed: Boolean(options.productConfirmed || options.targetDir)
    })
    : {
      status: 'NOT_RUN_NO_EXACT_CATALOG',
      resolvedItems: parsed.items,
      resolutions: [],
      requiresHumanClarification: false,
      learningEligible: false
    };
  const items = requirementResolution.resolvedItems;
  const result = evaluatePhysicalMath(items, options.catalogData, options.targetDir || '');
  if (requirementResolution.requiresHumanClarification) {
    result.confidence.isHitlTriggered = true;
    result.confidence.score = Math.min(result.confidence.score, 0.74);
    result.confidence.confidenceReasons.push('[REQUIREMENT_AMBIGUITY] One or more requested components require human category/part confirmation.');
  }
  const { analyzeDealValueEngineering } = require('./deal_optimizer.js');
  let valueEngineering = null;
  try {
    valueEngineering = analyzeDealValueEngineering(items, result, options.catalogData, options.targetDir || '');
  } catch (veErr) {
    // Non-blocking value engineering analysis
  }
  return { ...result, items, requirementResolution, valueEngineering };
}

setPhysicalMathValidator((items, catalogData, targetDir, options = {}) => {
  return evaluatePhysicalMath(items, catalogData, targetDir, {
    ...options,
    skipGraphValidation: true,
    skipLifecycle: true
  });
});

module.exports = {
  HIGH_TDP_THRESHOLD_WATTS,
  DEFAULT_MANDATORY_SKUS,
  CTO_BASE_SKUS,
  parseAndConsolidateBOQ,
  parseAndConsolidateBOQDetailed,
  evaluatePhysicalMath,
  evaluateBOQMultiAspect,
  formatNotebookQueryPayload,
  evalComputeThermal,
  evalMemoryChannel,
  evalStorageTriMode,
  evalNetworkingOcp,
  evalPcieRiserSlots,
  evalPowerEnvironment,
  evalSupportManufacturing,
  readBoqLines
};
