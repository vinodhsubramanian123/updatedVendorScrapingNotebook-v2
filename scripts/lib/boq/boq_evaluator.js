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
const { getMandatorySkusForChassis } = require('../catalog/catalog_rules.js');
const { detectChassisVariant, validateConflictGraph, getChassisMap } = require('../conflict/conflict_graph.js');
const { parseSkuLines } = require('./boq_parser.js');

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

const DEFAULT_MANDATORY_SKUS = {
  HIGH_PERF_FAN_KIT: { sku: 'P48820-B21', name: 'HPE ProLiant DL380 Gen12 High Performance Fan Kit' },
  HIGH_PERF_HEATSINK: { sku: 'P48818-B21', name: 'HPE ProLiant DL380 Gen12 High Performance Heatsink' },
  SMART_STORAGE_BATTERY: { sku: 'P01366-B21', name: 'HPE 96W Smart Storage Battery (up to 20 Devices)' },
  NO_DRIVE_FIO_KIT: { sku: '873763-B21', name: 'HPE DL380 Gen10/11/12 No Drive Configuration FIO Kit' },
  DC_LUG_KIT: { sku: 'P36877-B21', name: 'HPE ProLiant Gen11/12 DC Power Supply Cable Lug Option Kit' }
};

function buildCtoBaseSkus() {
  const defaults = [
    'P73282-B21', // DL380 Gen12 SFF CTO
    'P52534-B21', // DL360 Gen11 CTO
    'P76706-B21', // DL380 Gen12 8SFF CTO Variant
    'P56900-B21', // DL380 Gen11 8SFF CTO
    'P52533-B21', // DL380 Gen11 8LFF CTO
    'R0Q21A',     // Alletra / MSA Base
    '864273-B21', // Synergy Module Base
    'P57100-B21', // Cray GX5000 Base
    'Q6Q67A'      // StoreEver Tape Base
  ];
  const set = new Set(defaults);
  try {
    const map = getChassisMap();
    for (const info of Object.values(map)) {
      if (info && info.baseSku) set.add(info.baseSku);
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

function parseAndConsolidateBOQ(rawInput, filePath = '', targetSheet = null) {
  let lines = [];
  const targetPath = (filePath && typeof filePath === 'string')
    ? filePath
    : (typeof rawInput === 'string' && (rawInput.endsWith('.xlsx') || rawInput.endsWith('.xls') || rawInput.endsWith('.csv') || rawInput.endsWith('.tsv') || rawInput.endsWith('.txt')) && fs.existsSync(rawInput))
    ? rawInput
    : '';

  if (targetPath && (targetPath.endsWith('.xlsx') || targetPath.endsWith('.xls'))) {
    const workbook = xlsx.readFile(targetPath);
    let sheetNames = [];
    if (targetSheet && workbook.SheetNames.includes(targetSheet)) {
      sheetNames = [targetSheet];
    } else {
      // Default to primary BOM sheet (Sheet 1) and skip non-BOM documentation sheets (Audit, Architecture, Compliance)
      const nonBomKeywords = ['audit', 'architecture', 'terms', 'notes', 'readme', 'compliance', 'matrix'];
      const candidateSheets = workbook.SheetNames.filter(name => {
        const lower = name.toLowerCase();
        return !nonBomKeywords.some(kw => lower.includes(kw));
      });
      sheetNames = candidateSheets.length > 0 ? [candidateSheets[0]] : [workbook.SheetNames[0]];
    }
    sheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const csvText = xlsx.utils.sheet_to_csv(sheet);
      lines.push(...csvText.split(/\r?\n/));
    });
  } else if (targetPath) {
    const fileContent = fs.readFileSync(targetPath, 'utf-8');
    lines = fileContent.split(/\r?\n/);
  } else {
    lines = String(rawInput || '').split(/\r?\n/);
  }

  lines = lines.filter(l => l.trim().length > 0);
  return parseSkuLines(lines).items;
}

/**
 * Run modular physical math evaluation across solution aspects dynamically ($N$-Aspect Engine).
 *
 * @param {Array<object>} items - Consolidated BOQ items
 * @param {object} [catalogData=null] - Optional catalog companion object
 * @param {string} [targetDir=''] - Output folder for catalog rules
 * @returns {object} Evaluation results
 */
function evaluatePhysicalMath(items, catalogData = null, targetDir = '') {
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

  emitProgress(6, 10, 'Power & Infrastructure Checking', 'in_progress', `Verifying DC power lug kits and redundancy.`);
  const power = evalPowerEnvironment(items, catalogData, mandatorySkus);
  const support = evalSupportManufacturing(items, catalogData);
  const lifecycle = evalSupportServices(items, catalogData);
  const lifecycleRecommendations = generateLifecycleRecommendations(items, catalogData);

  const errors = [];
  const warnings = [];
  const missingDependencies = [];
  const mathDeductions = [];
  const redundantDefaults = [];
  let chassisDefaults = [];

  // Chassis Included Components & Default Hardware Analysis (GAP 2)
  try {
    const mapPath = path.join(__dirname, '..', '..', 'config', 'chassis_map.json');
    if (fs.existsSync(mapPath)) {
      const fullMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
      const incMap = fullMap.chassis_included_components || {};
      const baseKey = chassisInfo.baseSku || Object.keys(incMap).find(k => k === chassisInfo.sku || incMap[k].model === chassisInfo.model);
      chassisDefaults = (baseKey && incMap[baseKey]?.includedComponents) || [];

      if (chassisDefaults.length > 0) {
        items.forEach(it => {
          const desc = (it.description || '').toLowerCase();
          const clean = cleanBaseSKU(it.sku);
          // Flag redundant standard fans or heatsinks when not requiring high-TDP kits
          const isStdFan = (desc.includes('standard fan') || (desc.includes('fan kit') && !desc.includes('high perf') && !desc.includes('performance') && !desc.includes('p48820') && !desc.includes('p40502')));
          const isStdHeatsink = (desc.includes('standard heatsink') || (desc.includes('heat sink') && !desc.includes('performance') && !desc.includes('high perf') && !desc.includes('p48818') && !desc.includes('p74792')));
          const isLomNic = desc.includes('1gb 4-port') && desc.includes('bcm5719') && !desc.includes('pcie');

          if (isStdFan || isStdHeatsink || isLomNic) {
            const matchDefault = chassisDefaults.find(d => 
              (isStdFan && d.category === 'Cooling / Thermal' && d.description.includes('Fan')) ||
              (isStdHeatsink && d.category === 'Cooling / Thermal' && d.description.includes('Heatsink')) ||
              (isLomNic && d.category === 'Network Adapter')
            );
            if (matchDefault) {
              const adv = `Chassis Default Advisory: SKU ${clean} (${it.description}) is already factory-included with base chassis ${baseKey} (${matchDefault.description}). Redundant line item not required unless explicitly ordered as a spare.`;
              warnings.push(adv);
              redundantDefaults.push({
                sku: clean,
                description: it.description,
                includedDefault: matchDefault.description,
                advisory: adv
              });
            }
          }
        });
      }
    }
  } catch (_) {}

  if (lifecycle.hasObsoleteRisk) {
    warnings.push('Lifecycle Risk: Obsolete (OB) component(s) detected in BOM. Upgrade recommendations generated.');
  }
  if (lifecycle.hasEolWarning) {
    warnings.push('Lifecycle Advisory: 90-Day EOL component(s) detected in BOM. Advance migration recommended.');
  }

  const ocpSlotsClusterMax = network.maxOcpSlots * serverCount;
  const isExceedingOcp = network.ocpAdapterCount > ocpSlotsClusterMax;
  const pcieSlotsClusterMax = pcie.totalSlotsAvailable * serverCount;
  const activePcieSlotsClusterMax = pcie.activeSlotsAvailable * serverCount;
  const isExceedingPcie = pcie.requiredPcieCards > pcieSlotsClusterMax;
  const isExceedingActivePcie = pcie.requiredPcieCards > activePcieSlotsClusterMax;
  const psuPerServer = power.psuCount / serverCount;

  // Rule: OCP Slot Capacity Math
  if (isExceedingOcp) {
    const reason = `Networking Math Failed: ${network.ocpAdapterCount} OCP adapters exceeds maximum ${ocpSlotsClusterMax} OCP slot(s) across ${serverCount} server(s).`;
    errors.push(reason);
    mathDeductions.push(reason);
  }

  // CLIC Rule 81355854: Mutual Exclusivity between CPU1 to OCP2 and CPU2 to OCP2 enablement cables
  if (network.hasConflictingOcpCables) {
    const reason = `CLIC Rule 81355854 Failed: CPU1/OCP2 Enablement Kit (P51911-B21) and CPU2/OCP2 Enablement Kit (P48830-B21) cannot be selected together. Unselect P51911-B21 on dual-CPU DL380 servers.`;
    errors.push(reason);
    mathDeductions.push(reason);
  }

  // Rule: PCIe Slot Capacity vs Active Riser Math (CLIC Rules 81016755 & 81354683)
  if (isExceedingActivePcie) {
    const reason = `PCIe Active Slot Math Failed (CLIC Rule 81016755 / 81354683): ${pcie.requiredPcieCards} cards exceeds ${activePcieSlotsClusterMax} electrically active slots across ${serverCount} server(s). Slot 1 and/or Slot 4 require Riser Cable Kits to be enabled.`;
    errors.push(reason);
    mathDeductions.push(reason);
  } else if (isExceedingPcie) {
    const reason = `PCIe Math Failed: ${pcie.requiredPcieCards} required cards exceeds ${pcieSlotsClusterMax} total mechanical slots across ${serverCount} server(s).`;
    warnings.push(reason);
    mathDeductions.push(reason);
  }

  // Inject Primary Riser Cable Kit if needed
  if (pcie.needsPrimaryCableKit) {
    const reason = `CLIC Rule 81356091: Enabling Slot 1 on Primary 3x16 Riser (P48803-B21) requires Primary Cable Kit (P56073-B21).`;
    warnings.push(reason);
    missingDependencies.push({
      key: 'PRIMARY_RISER_CABLE_KIT',
      rule: 'CLIC Rule 81356091: Primary 3x16 Riser Cable Enablement',
      sku: 'P56073-B21',
      description: 'HPE ProLiant DL380 Gen11 x16/x16/x16 Primary Cable Kit',
      quantity: serverCount,
      reasoning: reason
    });
  }

  // Inject Secondary Riser Cable Kit if needed
  if (pcie.needsSecondaryCableKit) {
    const reason = `CLIC Rule 81170920 / 81356092: Enabling Slot 4 on Secondary 3x16 Riser (P51083-B21) requires Secondary Cable Kit (P56074-B21).`;
    warnings.push(reason);
    missingDependencies.push({
      key: 'SECONDARY_RISER_CABLE_KIT',
      rule: 'CLIC Rule 81170920: Secondary 3x16 Riser Cable Enablement',
      sku: 'P56074-B21',
      description: 'HPE ProLiant DL380 Gen11 x16/x16/x16 Secondary Cable Kit',
      quantity: serverCount,
      reasoning: reason
    });
  }

  // Rule: CPU 2 PCIe Lane Allocation requirement for Secondary/Tertiary Risers
  const cpusPerServer = compute.cpuCount / serverCount;
  if ((pcie.secondaryRiserCount > 0 || pcie.tertiaryRiserCount > 0) && cpusPerServer < 2) {
    const reason = `Compute/PCIe Math Failed: Secondary/Tertiary Risers require 2nd CPU socket. Only ${cpusPerServer} CPU(s) per node found.`;
    errors.push(reason);
    mathDeductions.push(reason);
  }

  // Rule 1: High TDP thermal requirement
  if (compute.maxCpuTdpWatts >= HIGH_TDP_THRESHOLD_WATTS && !compute.hasHighPerfFans) {
    const reason = `High TDP Thermal Math Failed: ${compute.maxCpuTdpWatts}W processor exceeds ${HIGH_TDP_THRESHOLD_WATTS}W limit without High-Performance Fan Kit.`;
    errors.push(reason);
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

  // CLIC Rule 81354654: Fan kit contains all 6 fans; max 1 fan kit allowed per base chassis
  if (compute.fanKitExceedsMax) {
    const reason = `CLIC Rule 81354654 Failed: High Performance Fan Kit (P48820-B21) contains all 6 chassis fans. Maximum 1 kit allowed per server (${compute.fanKitCount} kits ordered for ${serverCount} servers). Normalize to 1 kit per server.`;
    errors.push(reason);
    mathDeductions.push(reason);
  }

  // Rule 2: Drive-less server requirement
  if (storage.driveCount === 0 && !storage.hasNoDriveKit) {
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

  // CLIC Rules 81354627 & 81354632: Tri-Mode Y-Cable compatibility
  if (storage.hasIncompatibleYCable) {
    const reason = `CLIC Rules 81354627 & 81354632 Failed: Tri-Mode Splitter Cable Kit (P48832-B21) requires PCIe-type RAID controller (MR416i-p/SR932i-p) and Premium Cage (P48814-B21). Not compatible with OCP storage controllers or standard cages. Remove P48832-B21 and use P48918-B21.`;
    errors.push(reason);
    mathDeductions.push(reason);
  }

  // Rule 3: DC Power Supply Lug Kit requirement
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

  // Rule 3b: Power Supply Redundancy Warning
  if (psuPerServer === 1) {
    const reason = `Power Redundancy Warning: Single power supply configured per node. Dual-socket enterprise nodes recommend 2x redundant PSUs.`;
    warnings.push(reason);
    missingDependencies.push({
      key: 'POWER_SUPPLY_REDUNDANCY',
      rule: 'Power Supply N+1 Redundancy Rule',
      sku: 'P38997-B21',
      description: 'HPE 1600W Flex Slot Platinum Hot Plug Power Supply',
      quantity: serverCount,
      reasoning: reason
    });
  }

  // Rule 81392308: CLIC Unbuildable Error Check
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

  // CLIC Rule 81322276: Mandatory Cloud Ops Management (COM) or OneView License on Gen11/Gen12 CTO models
  if (hasBaseChassis && !support.hasManagementLicense) {
    const reason = `CLIC Rule 81322276: CTO Chassis (${chassisInfo.baseSku || 'CTO'}) requires at least 1 Cloud Ops Management (COM) or OneView license per server (Base: R7A11AAE / E5Y43A).`;
    warnings.push(reason);
    missingDependencies.push({
      key: 'MANAGEMENT_LICENSE_COM',
      rule: 'CLIC Rule 81322276: Mandatory CTO Management License',
      sku: 'R7A11AAE',
      description: 'HPE Compute Ops Management Enhanced 3-year SaaS',
      quantity: serverCount,
      reasoning: reason
    });
  }

  // Rule 4: Controller Smart Storage Battery requirement
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

  // CLIC Rule 81354652: Storage Controller Enablement Cable Kit required for Hybrid Capacitor / Battery Backup
  if (storage.needsCapacitorCable) {
    const reason = `CLIC Rule 81354652: Smart Storage Hybrid Capacitor / Battery requires Storage Controller Enablement Cable Kit (P48918-B21) to connect power to the controller.`;
    warnings.push(reason);
    missingDependencies.push({
      key: 'STORAGE_CONTROLLER_ENABLEMENT_CABLE',
      rule: 'CLIC Rule 81354652: Capacitor Power Link Requirement',
      sku: 'P48918-B21',
      description: 'HPE ProLiant Storage Controller Enablement Cable Kit',
      quantity: serverCount,
      reasoning: reason
    });
  }

  // Advanced Enterprise Rule: Storage Expander & Port Channel Math
  if (storage.needsSasExpander) {
    const reason = `Storage Expander Math: ${storage.driveCount} drives exceeds direct controller capacity (${storage.controllerDirectCapacity} drives). Requires SAS Expander Card (P48835-B21) or Tri-Mode Switch Card (P55806-B21).`;
    warnings.push(reason);
    missingDependencies.push({
      key: 'SAS_EXPANDER_CARD',
      rule: 'Storage Expander & Multi-Drive Channel Rule',
      sku: 'P48835-B21',
      description: 'HPE ProLiant DL380 Gen11 24SFF SAS Expander Card Kit',
      quantity: serverCount,
      reasoning: reason
    });
  }

  // Advanced Enterprise Rule: GPU Accelerator Auxiliary Power Cable Kit
  if (pcie.needsGpuPowerCableKit) {
    const reason = `GPU Power Math: ${pcie.gpuCount} PCIe GPU accelerator(s) detected. Requires GPU Auxiliary Power Cable Kit (P48816-B21 / P76450-B21) to connect to power distribution board.`;
    warnings.push(reason);
    missingDependencies.push({
      key: 'GPU_AUX_POWER_CABLE_KIT',
      rule: 'GPU Accelerator Auxiliary Power Rule',
      sku: 'P48816-B21',
      description: 'HPE ProLiant DL380 Gen11 GPU Power Cable Kit',
      quantity: serverCount,
      reasoning: reason
    });
  }

  // Advanced Enterprise Rule: Windows Server Core Licensing Multiplier
  if (support.needsAdditionalWindowsCores) {
    const reason = `OS Licensing Math: Server has ${support.detectedCpuCores} physical cores but only ${support.totalWindowsLicensedCores} Windows Server licensed cores. Requires ${support.missingCoreLicenses} additional core license packs.`;
    warnings.push(reason);
  }

  // Advanced Enterprise Rule: High-Line 220V Utility Power Advisory
  if (power.needsHighLine220v) {
    const reason = `Power Derating Advisory: Estimated node power draw (${power.estimatedNodeWattage}W) requires 200V-240V high-line utility circuits to prevent single-PSU derating on ${power.maxPsuWattage}W power supplies.`;
    warnings.push(reason);
  }

  // EU Ecodesign Regulation 2019/424 (ErP Lot 9) Rule:
  if (power.needsCeRemovalKit) {
    const reason = `EU Lot 9 Compliance Advisory: High-draw configuration with Platinum PSUs requires 96% Titanium PSUs (P44712-B21) or CE Mark Removal FIO Enablement Kit (P35876-B21) for non-EU deployment.`;
    warnings.push(reason);
    missingDependencies.push({
      key: 'CE_MARK_REMOVAL_KIT',
      rule: 'EU Lot 9 / CE Mark Regulatory Enablement Rule',
      sku: 'P35876-B21',
      description: 'HPE CE Mark Removal FIO Enablement Kit',
      quantity: serverCount,
      reasoning: reason
    });
  }

  // Rule 5: Memory Channel Balance & CTO FIO Memory requirement
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

  if (memory.memoryCount > 0 && !memory.isBalancedChannel) {
    const reason = `Memory Math Failed: ${memory.memoryCount} DIMMs across ${compute.cpuCount || 2} CPUs is not balanced.`;
    warnings.push(reason);
    mathDeductions.push(reason);
  }

  const aspectChecks = [
    {
      id: 1,
      name: 'Thermal & Compute Math',
      iconType: 'Cpu',
      defaultRule: 'CPU TDP thermal envelope vs cooling kit population rules (CLIC Rule 81354654)',
      status: (compute.maxCpuTdpWatts >= HIGH_TDP_THRESHOLD_WATTS && !compute.hasHighPerfFans) || compute.fanKitExceedsMax ? 'FAIL' : 'PASS',
      detail: compute.fanKitExceedsMax
        ? `CLIC Rule 81354654 Failed: High Performance Fan Kit (P48820-B21) contains all 6 chassis fans. Maximum 1 kit allowed per server (${compute.fanKitCount} kits ordered).`
        : (compute.maxCpuTdpWatts >= HIGH_TDP_THRESHOLD_WATTS && !compute.hasHighPerfFans)
        ? `High TDP Thermal Math Failed: ${compute.maxCpuTdpWatts}W processor exceeds ${HIGH_TDP_THRESHOLD_WATTS}W limit without High-Performance Fan Kit.`
        : `Verified ${compute.cpuCount} CPUs (${cpusPerServer}/node) within TDP envelope with valid fan kit count.`
    },
    {
      id: 2,
      name: 'Memory & Channel Balance',
      iconType: 'Memory',
      defaultRule: 'Memory interleaving, channel balance & population rules (CLIC Rules 81354490 & 91001655)',
      status: (memory.memoryCount > 0 && !memory.isBalancedChannel) || memory.hasBtoMemoryInCto ? 'FAIL' : 'PASS',
      detail: memory.hasBtoMemoryInCto
        ? `Memory Option Rule Failed (CLIC Rule 91001655): Standalone BTO Memory SKU (${memory.btoMemoryViolations.map(v => v.btoSku).join(', ')}) is restricted in CTO base server. Direct fix: Replace with FIO SKU (${memory.btoMemoryViolations.map(v => v.fioSku).join(', ')}).`
        : (memory.memoryCount > 0 && !memory.isBalancedChannel)
        ? `Memory Math Failed: ${memory.memoryCount} DIMMs across ${compute.cpuCount || 2} CPUs is not balanced.`
        : `Verified ${memory.memoryCount} DIMMs in balanced configuration (${memory.memoryCount / serverCount} DIMMs/node).`
    },
    {
      id: 3,
      name: 'Storage & Controller Cabling',
      iconType: 'HardDrive',
      defaultRule: 'Storage controller, drive cage & cable kit compatibility checks (CLIC Rules 81354627 & 81354632)',
      status: storage.hasIncompatibleYCable || (storage.driveCount === 0 && !storage.hasNoDriveKit && !hasDriveCageKit) || (storage.hasStorageController && !storage.hasSmartBattery) ? 'FAIL' : 'PASS',
      detail: storage.hasIncompatibleYCable
        ? `CLIC Rules 81354627 & 81354632 Failed: Tri-Mode Splitter Cable Kit (P48832-B21) is incompatible with OCP storage controllers / standard cages. Controller Enablement Cable (P48918-B21) is the correct cable.`
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
        ? `PCIe Active Slot Math Failed (CLIC Rule 81016755): ${pcie.requiredPcieCards} required cards exceeds ${activePcieSlotsClusterMax} electrically cabled active slots. Slot 1 and/or Slot 4 require Riser Cable Kits (P56073-B21 / P56074-B21).`
        : isExceedingPcie
        ? `PCIe Math Failed: ${pcie.requiredPcieCards} required cards exceeds ${pcieSlotsClusterMax} slots.`
        : (pcie.secondaryRiserCount > 0 || pcie.tertiaryRiserCount > 0) && cpusPerServer < 2
        ? 'Compute/PCIe Math Failed: Secondary/Tertiary Risers require 2nd CPU socket.'
        : `Verified ${pcie.requiredPcieCards} PCIe cards fit within ${activePcieSlotsClusterMax} active cabled slots (${Math.ceil(pcie.requiredPcieCards / serverCount)} cards/node).`
    },
    {
      id: 5,
      name: 'Networking & OCP Interconnect',
      iconType: 'Zap',
      defaultRule: 'OCP 3.0 network adapter slots and port allocation rules (CLIC Rule 81355854)',
      status: isExceedingOcp || network.hasConflictingOcpCables ? 'FAIL' : 'PASS',
      detail: network.hasConflictingOcpCables
        ? `CLIC Rule 81355854 Failed: CPU1 to OCP2 (P51911-B21) and CPU2 to OCP2 (P48830-B21) enablement kits cannot be selected together.`
        : isExceedingOcp
        ? `Networking Math Failed: ${network.ocpAdapterCount} OCP adapters exceeds maximum ${ocpSlotsClusterMax} slots.`
        : `Verified ${network.networkPortsCount} active network ports (${network.hasOcpAdapter ? network.ocpAdapterCount + 'x OCP 3.0 NICs' : 'Standard PCIe/LOM NICs'}).`
    },
    {
      id: 6,
      name: 'Power & Redundancy Math',
      iconType: 'Power',
      defaultRule: 'Power supply redundancy rating & auxiliary kit requirements',
      status: power.hasDcPowerSupply && !power.hasDcLugKit ? 'FAIL' : 'PASS',
      detail: power.hasDcPowerSupply && !power.hasDcLugKit ? 'Power Math Failed: -48VDC Power Supply requires DC Power Cable Lug Kit.' : `Verified power supply and infrastructure dependencies (${psuPerServer} PSUs/node).`
    },
    {
      id: 7,
      name: 'Vendor Support Taxonomy & Licensing',
      iconType: 'Award',
      defaultRule: 'Hardware SKU validation against mandatory support SLA tiers & COM licensing (CLIC Rule 81322276)',
      status: support.hasSupportService && support.hasManagementLicense ? 'PASS' : 'WARN',
      detail: !support.hasManagementLicense
        ? 'Management License Advisory (CLIC Rule 81322276): CTO models require at least 1 COM or OneView license (R7A11AAE / E5Y43A).'
        : support.hasSupportService
        ? 'Verified mandatory support services and management licensing included.'
        : 'Support Taxonomy Advisory: Missing Pointnext / Tech Care service line.'
    }
  ];

  const formFactorRU = chassisInfo.formFactor === '1U' ? 1 : 
                       chassisInfo.formFactor === '4U' ? 4 : 2;

  const evalSummary = {
    cpuCount: compute.cpuCount,
    maxCpuTdpWatts: compute.maxCpuTdpWatts,
    memoryCount: memory.memoryCount,
    totalMemoryGb: memory.totalMemoryGb,
    isBalancedChannel: memory.isBalancedChannel,
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
    aspectChecks
  };

  emitProgress(7, 10, 'Validating Conflict Graph', 'in_progress', 'Resolving dependencies and checking for architectural conflicts.');

  let resolvedDir = targetDir;
  if (!resolvedDir) {
    const { autoDetectChassisDir } = require('../catalog/catalog_discovery.js');
    resolvedDir = autoDetectChassisDir(items);
  }

  const conflictGraphResults = validateConflictGraph(items, missingDependencies, resolvedDir);

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
    clusterSizing: evalSummary.clusterSizing,
    aspectChecks,
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

  return {
    chassis: chassisInfo.id || chassisInfo.model,
    query: queryText,
    context: {
      itemsCount: items.length,
      detectedTdp: evalResults.evalSummary?.maxCpuTdpWatts,
      memoryTotalGb: evalResults.evalSummary?.totalMemoryGb,
      issuesCount: issues.length,
      skuManifest
    }
  };
}

function evaluateBOQMultiAspect(filePathOrText, options = {}) {
  const items = parseAndConsolidateBOQ(filePathOrText, options.filePath || '', options.targetSheet || null);
  const result = evaluatePhysicalMath(items, options.catalogData, options.targetDir || '');
  return { ...result, items };
}

module.exports = {
  HIGH_TDP_THRESHOLD_WATTS,
  DEFAULT_MANDATORY_SKUS,
  CTO_BASE_SKUS,
  parseAndConsolidateBOQ,
  evaluatePhysicalMath,
  evaluateBOQMultiAspect,
  formatNotebookQueryPayload,
  evalComputeThermal,
  evalMemoryChannel,
  evalStorageTriMode,
  evalNetworkingOcp,
  evalPcieRiserSlots,
  evalPowerEnvironment,
  evalSupportManufacturing
};
