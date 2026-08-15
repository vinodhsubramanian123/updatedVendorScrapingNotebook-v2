'use strict';
/**
 * scripts/lib/boq_evaluator.js — Pre-Flight BOQ Evaluator & Multi-Aspect Solution Pre-Check Engine
 *
 * Provides comprehensive multi-sheet Excel parsing, chassis multiplier evaluation, separator normalization,
 * modular multi-aspect physical pre-checks, quantitative confidence scoring, and Gemini Notebook payload formatting.
 */

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx-js-style');
const { cleanBaseSKU, isValidHpeSKU, HPE_SKU_EXTRACT_REGEX } = require('./sku');
const { calculateConfidenceScore } = require('./feedback_loop');
const { classifyComponentRole } = require('./product_meta');
const { emitProgress } = require('./progress');

const { preprocessAndGroupBOQ, savePreprocessingRuleFeedback } = require('./boq_preprocessor');

const { DEFAULT_MANDATORY_SKUS, getMandatorySkusForChassis } = require('./catalog_rules');

/**
 * High TDP threshold requiring High-Performance Fan Kits
 */
const HIGH_TDP_THRESHOLD_WATTS = 240;

/**
 * Parse raw BOQ input (CSV, TSV, Multi-sheet Excel workbook, or text) and extract consolidated items.
 * Handles multipliers (e.g., 2x Server Node x 6x DIMMs = 12 total DIMMs) and line separators.
 * @param {string|Buffer} rawInput 
 * @param {string} filePath Optional filepath if parsing .xlsx file directly
 * @returns {Array<object>} Consolidated items array
 */
function parseAndConsolidateBOQ(rawInput, filePath = '') {
  const { parseSkuLines } = require('./boq_parser');
  let lines = [];

  if (filePath && (filePath.endsWith('.xlsx') || filePath.endsWith('.xls'))) {
    const workbook = xlsx.readFile(filePath);
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const csvText = xlsx.utils.sheet_to_csv(sheet);
      lines.push(...csvText.split(/\r?\n/));
    });
  } else {
    const text = String(rawInput);
    lines = text.split(/\r?\n/);
  }

  lines = lines.filter(l => l.trim().length > 0);
  return parseSkuLines(lines).items;
}

/**
 * Aspect 1: Compute & Thermal Pre-Check
 */
function evalComputeThermal(items, catalogData = null, mandatorySkus = DEFAULT_MANDATORY_SKUS) {
  let cpuCount = 0;
  let maxCpuTdpWatts = 0;

  for (const it of items) {
    const desc = it.description.toLowerCase();
    
    // Attempt to lookup role from catalog if available, fallback to product_meta classifier
    let role = classifyComponentRole('', desc);
    if (catalogData && catalogData.entries) {
      const match = catalogData.entries.find(e => e.skus && e.skus.find(s => cleanBaseSKU(s['Product #']) === cleanBaseSKU(it.sku)));
      if (match) role = classifyComponentRole(match.parentCategory, desc);
    }

    if (role === 'Processor' || /^p\d{5}-b21$/i.test(it.sku)) {
      if (desc.includes('processor') || desc.includes('xeon') || desc.includes('epyc')) {
        cpuCount += it.quantity;
        const tdpMatch = desc.match(/(\d{2,3})\s*w/i);
        if (tdpMatch) {
          const tdp = parseInt(tdpMatch[1], 10);
          if (tdp > maxCpuTdpWatts) maxCpuTdpWatts = tdp;
        }
      }
    }
  }

  const hasHighPerfFans = items.some(it => cleanBaseSKU(it.sku) === mandatorySkus.HIGH_PERF_FAN_KIT.sku);
  const hasHeatsinks = items.some(it => cleanBaseSKU(it.sku) === mandatorySkus.HIGH_PERF_HEATSINK.sku);

  return { cpuCount, maxCpuTdpWatts, hasHighPerfFans, hasHeatsinks };
}

/**
 * Aspect 2: Memory & Channel Pre-Check
 */
function evalMemoryChannel(items, passedCpuCount = 0, catalogData = null) {
  let memoryCount = 0;
  let totalMemoryGb = 0;
  let cpuCount = passedCpuCount;

  for (const it of items) {
    const desc = it.description.toLowerCase();
    let role = classifyComponentRole('', desc);
    if (catalogData && catalogData.entries) {
      const match = catalogData.entries.find(e => e.skus && e.skus.find(s => cleanBaseSKU(s['Product #']) === cleanBaseSKU(it.sku)));
      if (match) role = classifyComponentRole(match.parentCategory, desc);
    }

    if (role === 'Memory' || desc.includes('memory') || desc.includes('rdimm') || desc.includes('ddr5')) {
      memoryCount += it.quantity;
      const gbMatch = desc.match(/(\d+)\s*gb/i);
      if (gbMatch) {
        totalMemoryGb += (parseInt(gbMatch[1], 10) * it.quantity);
      }
    }
    if (!passedCpuCount && (desc.includes('processor') || desc.includes('xeon') || desc.includes('epyc'))) {
      cpuCount += it.quantity;
    }
  }

  if (cpuCount === 0) cpuCount = 2; // Default if no CPUs found

  const isBalancedChannel = memoryCount > 0 && (memoryCount % cpuCount === 0) && ((memoryCount / cpuCount) % 8 === 0);
  return { memoryCount, totalMemoryGb, isBalancedChannel };
}

/**
 * Aspect 3: Storage & Tri-Mode Controller Pre-Check
 */
function evalStorageTriMode(items, catalogData = null, mandatorySkus = DEFAULT_MANDATORY_SKUS) {
  let driveCount = 0;
  let hasStorageController = false;
  let hasSmartBattery = false;
  let hasNoDriveKit = false;

  for (const it of items) {
    const desc = it.description.toLowerCase();
    const sku = cleanBaseSKU(it.sku);

    let role = classifyComponentRole('', desc);
    if (catalogData && catalogData.entries) {
      const match = catalogData.entries.find(e => e.skus && e.skus.find(s => cleanBaseSKU(s['Product #']) === cleanBaseSKU(it.sku)));
      if (match) role = classifyComponentRole(match.parentCategory, desc);
    }

    if (role === 'Drive Cage / Drive' || desc.includes('hdd') || desc.includes('ssd') || desc.includes('drive') || desc.includes('nvme')) {
      if (!desc.includes('no drive') && !desc.includes('cage') && !desc.includes('controller')) {
        driveCount += it.quantity;
      }
    }
    if (desc.includes('controller') || desc.includes('mr416i') || desc.includes('sr932i')) {
      hasStorageController = true;
    }
    if (sku === mandatorySkus.SMART_STORAGE_BATTERY.sku || desc.includes('smart storage battery')) {
      hasSmartBattery = true;
    }
    if (sku === mandatorySkus.NO_DRIVE_FIO_KIT.sku || desc.includes('no drive')) {
      hasNoDriveKit = true;
    }
  }

  return { driveCount, hasStorageController, hasSmartBattery, hasNoDriveKit };
}

/**
 * Aspect 4: Networking & OCP 3.0 Interconnect Pre-Check
 */
function evalNetworkingOcp(items, catalogData = null) {
  let networkPortsCount = 0;
  let ocpAdapterCount = 0;
  let hasOcpAdapter = false;
  let maxOcpSlots = 2; // Standard Gen11/Gen12 supports up to 2 OCP 3.0 slots (Slot 1 + Slot 2)

  if (catalogData && catalogData.entries) {
    const ocpEntry = catalogData.entries.find(e => (e.parentCategory || '').toLowerCase().includes('network') || (e.subCategory || '').toLowerCase().includes('ocp'));
    if (ocpEntry && typeof ocpEntry.maxQty === 'number' && ocpEntry.maxQty > 0) {
      maxOcpSlots = ocpEntry.maxQty;
    }
  }

  for (const it of items) {
    const desc = it.description.toLowerCase();
    const sku = cleanBaseSKU(it.sku);
    
    let role = classifyComponentRole('', desc);
    if (catalogData && catalogData.entries) {
      const match = catalogData.entries.find(e => e.skus && e.skus.find(s => cleanBaseSKU(s['Product #']) === sku));
      if (match) role = classifyComponentRole(match.parentCategory, desc);
    }

    if (role === 'Transceiver' || role === 'Cable Kit' || role === 'Storage Controller' || role === 'Storage Battery' || desc.includes('transceiver') || desc.includes('cable') || desc.includes('controller') || desc.includes('battery')) continue;

    if (role === 'Network Adapter' || desc.includes('ethernet') || desc.includes('adapter') || desc.includes('bcm5719') || desc.includes('bcm57504') || desc.includes('e810') || desc.includes('cx6')) {
      const isOcp = desc.includes('ocp') || desc.includes('flr') || desc.includes('ocp3');
      if (isOcp) {
        hasOcpAdapter = true;
        ocpAdapterCount += it.quantity;
      }

      // Parse realistic port multiplier from description
      let portsPerCard = 2;
      const explicitPortMatch = desc.match(/(\d+)\s*-?\s*port/i) || desc.match(/\b(1|2|4|8)\s*p\b/i);
      const quadMatch = desc.match(/\b(quad|4x|4-port)\b/i);
      const dualMatch = desc.match(/\b(dual|2x|2-port)\b/i);
      const singleMatch = desc.match(/\b(single|1x|1-port)\b/i);

      if (explicitPortMatch) {
        portsPerCard = parseInt(explicitPortMatch[1], 10) || 2;
      } else if (quadMatch) {
        portsPerCard = 4;
      } else if (dualMatch) {
        portsPerCard = 2;
      } else if (singleMatch) {
        portsPerCard = 1;
      }

      networkPortsCount += (portsPerCard * it.quantity);
    }
  }

  const isExceedingOcpSlots = ocpAdapterCount > maxOcpSlots;

  return { networkPortsCount, hasOcpAdapter, ocpAdapterCount, maxOcpSlots, isExceedingOcpSlots };
}

/**
 * Aspect 5: PCIe Slot Capacity & Riser Expansion Card Math Pre-Check
 */
function evalPcieRiserSlots(items, catalogData = null) {
  let requiredPcieCards = 0;
  let primaryRiserCount = 0;
  let secondaryRiserCount = 0;
  let tertiaryRiserCount = 0;

  for (const it of items) {
    const desc = it.description.toLowerCase();
    let role = classifyComponentRole('', desc);
    if (catalogData && catalogData.entries) {
      const match = catalogData.entries.find(e => e.skus && e.skus.find(s => cleanBaseSKU(s['Product #']) === cleanBaseSKU(it.sku)));
      if (match) role = classifyComponentRole(match.parentCategory, desc);
    }

    if (role === 'Transceiver' || role === 'Cable Kit' || role === 'Storage Battery' || role === 'Boot Device' || role === 'Chassis Infrastructure' || role === 'Service & Support' || role === 'Operating System / License') continue;

    // Count PCIe Expansion Cards (GPUs, NICs, HBAs, Controllers, Accelerator Cards)
    if (role === 'GPU / Accelerator' || role === 'Network Adapter' || role === 'Storage Controller' || role === 'Fibre Channel HBA' || desc.includes('adapter') || desc.includes('controller') || desc.includes('hba') || desc.includes('nvidia') || desc.includes('pcie') || desc.includes('gpu')) {
      if (!desc.includes('ocp') && !desc.includes('embedded') && !desc.includes('lom') && !desc.includes('cable') && !desc.includes('cage') && !desc.includes('battery')) {
        requiredPcieCards += it.quantity;
      }
    }

    // Count Risers
    if (role === 'PCIe Riser' || desc.includes('riser')) {
      if (desc.includes('primary riser') || desc.includes('main riser')) primaryRiserCount += it.quantity;
      if (desc.includes('secondary riser')) secondaryRiserCount += it.quantity;
      if (desc.includes('tertiary riser')) tertiaryRiserCount += it.quantity;
    }
  }

  // 2U Base Chassis provides 3 standard slots (Primary Riser); Secondary adds 3; Tertiary adds 2.
  const totalSlotsAvailable = 3 + (primaryRiserCount * 3) + (secondaryRiserCount * 3) + (tertiaryRiserCount * 2);
  const needsSecondaryRiser = requiredPcieCards > (3 + primaryRiserCount * 3);

  return { requiredPcieCards, primaryRiserCount, secondaryRiserCount, tertiaryRiserCount, totalSlotsAvailable, needsSecondaryRiser };
}

/**
 * Aspect 6: Power & Environmental Pre-Check
 */
function evalPowerEnvironment(items, catalogData = null, mandatorySkus = DEFAULT_MANDATORY_SKUS) {
  let hasDcPowerSupply = false;
  let hasDcLugKit = false;
  let psuCount = 0;

  for (const it of items) {
    const desc = it.description.toLowerCase();
    const sku = cleanBaseSKU(it.sku);

    let role = classifyComponentRole('', desc);
    if (catalogData && catalogData.entries) {
      const match = catalogData.entries.find(e => e.skus && e.skus.find(s => cleanBaseSKU(s['Product #']) === cleanBaseSKU(it.sku)));
      if (match) role = classifyComponentRole(match.parentCategory, desc);
    }

    if (role === 'Power Supply' || desc.includes('power supply') || desc.includes('flex slot') || desc.includes('psu') || sku.includes('P4881') || sku.includes('P3687')) {
      psuCount += it.quantity;
      if (desc.includes('-48vdc') || desc.includes('dc power') || desc.includes('48v') || sku.includes('P36877') || desc.includes('1600w')) {
        hasDcPowerSupply = true;
      }
    }
    if (sku === mandatorySkus.DC_LUG_KIT.sku || desc.includes('lug kit') || desc.includes('cable lug')) {
      hasDcLugKit = true;
    }
  }

  return { hasDcPowerSupply, hasDcLugKit, psuCount };
}

/**
 * Aspect 7: Support & Manufacturing Pre-Check
 */
function evalSupportManufacturing(items, catalogData = null) {
  let hasSupportService = false;
  for (const it of items) {
    const desc = it.description.toLowerCase();
    let role = classifyComponentRole('', desc);
    if (catalogData && catalogData.entries) {
      const match = catalogData.entries.find(e => e.skus && e.skus.find(s => cleanBaseSKU(s['Product #']) === cleanBaseSKU(it.sku)));
      if (match) role = classifyComponentRole(match.parentCategory, desc);
    }
    if (role === 'Service & Support' || desc.includes('tech care') || desc.includes('support') || desc.includes('warranty') || /^h[a-z0-9]{6}/i.test(it.sku)) {
      hasSupportService = true;
    }
  }
  return { hasSupportService };
}

/**
 * Run modular physical math evaluation across solution aspects dynamically ($N$-Aspect Engine).
 * @param {Array<object>} items Consolidated BOQ items
 * @param {object} catalogData Optional catalog companion object
 * @param {string} targetDir Output folder for catalog rules
 * @returns {object} Evaluation results
 */
function evaluatePhysicalMath(items, catalogData = null, targetDir = '') {
  const { detectChassisVariant } = require('./conflict_graph');
  const chassisInfo = detectChassisVariant(items);
  const mandatorySkus = getMandatorySkusForChassis(chassisInfo);

  // Detect server / chassis node count for multi-node orders
  let serverCount = 1;
  for (const it of items) {
    const desc = (it.description || '').toLowerCase();
    const clean = cleanBaseSKU(it.sku);
    if (
      desc.includes('configure-to-order') ||
      desc.includes('cto server') ||
      desc.includes('base server') ||
      clean === chassisInfo.baseSku ||
      clean === 'P73282-B21' ||
      clean === 'P52534-B21' ||
      clean === 'P76706-B21' ||
      clean === 'P56900-B21'
    ) {
      serverCount = Math.max(1, parseInt(it.quantity, 10) || 1);
      break;
    }
  }

  emitProgress(2, 10, 'Compute & Thermal Profiling', 'in_progress', `Analyzing ${items.length} SKUs for high-TDP processor constraints and heatsink counts.`);
  const compute = evalComputeThermal(items, catalogData, mandatorySkus);
  
  emitProgress(3, 10, 'Memory Channel Math', 'in_progress', `Validating 1DPC / 2DPC symmetry and balanced memory population.`);
  const memory = evalMemoryChannel(items, compute.cpuCount, catalogData);
  
  emitProgress(4, 10, 'Storage Tri-Mode Validation', 'in_progress', `Verifying NVMe/SAS/SATA drive cages, controllers, and backplane capacities.`);
  const storage = evalStorageTriMode(items, catalogData, mandatorySkus);
  
  emitProgress(5, 10, 'Networking & PCIe Constraints', 'in_progress', `Analyzing OCP NICs and PCIe Riser slot math.`);
  const network = evalNetworkingOcp(items, catalogData);
  const pcie    = evalPcieRiserSlots(items, catalogData);
  
  emitProgress(6, 10, 'Power & Infrastructure Checking', 'in_progress', `Verifying DC power lug kits and redundancy.`);
  const power = evalPowerEnvironment(items, catalogData, mandatorySkus);
  const support = evalSupportManufacturing(items, catalogData);

  const errors = [];
  const warnings = [];
  const missingDependencies = [];
  const mathDeductions = [];

  // Per-server normalized values
  const ocpSlotsClusterMax = network.maxOcpSlots * serverCount;
  const isExceedingOcp = network.ocpAdapterCount > ocpSlotsClusterMax;
  const pcieSlotsClusterMax = pcie.totalSlotsAvailable * serverCount;
  const isExceedingPcie = pcie.requiredPcieCards > pcieSlotsClusterMax;
  const psuPerServer = power.psuCount / serverCount;

  // Rule: OCP Slot Capacity Math
  if (isExceedingOcp) {
    const reason = `Networking Math Failed: ${network.ocpAdapterCount} OCP adapters exceeds maximum ${ocpSlotsClusterMax} OCP slot(s) across ${serverCount} server(s).`;
    errors.push(reason);
    mathDeductions.push(reason);
  }

  // Rule: PCIe Slot Capacity vs Riser Math
  if (isExceedingPcie) {
    const reason = `PCIe Math Failed: ${pcie.requiredPcieCards} required cards exceeds ${pcieSlotsClusterMax} available slots across ${serverCount} server(s).`;
    warnings.push(reason);
    mathDeductions.push(reason);
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
      sku: 'P48818-B21',
      description: 'HPE 800W Flex Slot Platinum Hot Plug Power Supply',
      quantity: serverCount,
      reasoning: reason
    });
  }

  // Rule 81392308: CLIC Unbuildable Error Check (Base Chassis / Drive Cage / No-Drive FIO Kit)
  const hasBaseChassis = items.some(it => {
    const clean = cleanBaseSKU(it.sku);
    return clean === chassisInfo.baseSku || clean === 'P73282-B21';
  });
  const hasNoDriveFioKit = items.some(it => cleanBaseSKU(it.sku) === mandatorySkus.NO_DRIVE_FIO_KIT.sku);
  const hasDriveCageKit = items.some(it => cleanBaseSKU(it.sku) === 'P75741-B21' || cleanBaseSKU(it.sku) === 'P76449-B21' || cleanBaseSKU(it.sku) === 'P75740-B21');

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

  // Rule 5: Memory Channel Balance requirement
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
      defaultRule: 'CPU TDP thermal envelope vs cooling kit population rules',
      status: compute.maxCpuTdpWatts >= HIGH_TDP_THRESHOLD_WATTS && !compute.hasHighPerfFans ? 'FAIL' : 'PASS',
      detail: compute.maxCpuTdpWatts >= HIGH_TDP_THRESHOLD_WATTS && !compute.hasHighPerfFans ? `High TDP Thermal Math Failed: ${compute.maxCpuTdpWatts}W processor exceeds ${HIGH_TDP_THRESHOLD_WATTS}W limit without High-Performance Fan Kit.` : `Verified ${compute.cpuCount} CPUs (${cpusPerServer}/node) within TDP envelope.`
    },
    {
      id: 2,
      name: 'Memory & Channel Balance',
      iconType: 'Memory',
      defaultRule: 'Memory interleaving, channel balance & population rules',
      status: (memory.memoryCount > 0 && !memory.isBalancedChannel) ? 'FAIL' : 'PASS',
      detail: (memory.memoryCount > 0 && !memory.isBalancedChannel) ? `Memory Math Failed: ${memory.memoryCount} DIMMs across ${compute.cpuCount || 2} CPUs is not balanced.` : `Verified ${memory.memoryCount} DIMMs in balanced configuration (${memory.memoryCount / serverCount} DIMMs/node).`
    },
    {
      id: 3,
      name: 'Storage & Controller Cabling',
      iconType: 'HardDrive',
      defaultRule: 'Storage controller, drive cage & cable kit compatibility checks',
      status: (storage.driveCount === 0 && !storage.hasNoDriveKit && !hasDriveCageKit) || (storage.hasStorageController && !storage.hasSmartBattery) ? 'FAIL' : 'PASS',
      detail: storage.driveCount === 0 && !storage.hasNoDriveKit && !hasDriveCageKit ? 'Storage Math Failed: 0 drives requires No Drive Configuration FIO Kit.' : storage.hasStorageController && !storage.hasSmartBattery ? 'Storage Math Failed: Storage controller requires Smart Storage Battery.' : `Verified ${storage.driveCount} drives (${storage.driveCount / serverCount}/node) and controller configuration.`
    },
    {
      id: 4,
      name: 'PCIe Riser & Slot Expansion Math',
      iconType: 'Layers',
      defaultRule: 'PCIe slot capacity, riser lane allocation & GPU expansion rules',
      status: isExceedingPcie || ((pcie.secondaryRiserCount > 0 || pcie.tertiaryRiserCount > 0) && cpusPerServer < 2) ? 'FAIL' : 'PASS',
      detail: isExceedingPcie ? `PCIe Math Failed: ${pcie.requiredPcieCards} required cards exceeds ${pcieSlotsClusterMax} slots.` : (pcie.secondaryRiserCount > 0 || pcie.tertiaryRiserCount > 0) && cpusPerServer < 2 ? 'Compute/PCIe Math Failed: Secondary/Tertiary Risers require 2nd CPU socket.' : `Verified ${pcie.requiredPcieCards} PCIe cards fit within available slots (${Math.ceil(pcie.requiredPcieCards / serverCount)} cards/node).`
    },
    {
      id: 5,
      name: 'Networking & OCP Interconnect',
      iconType: 'Zap',
      defaultRule: 'OCP 3.0 network adapter slots and port allocation rules',
      status: isExceedingOcp ? 'FAIL' : 'PASS',
      detail: isExceedingOcp
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
      name: 'Vendor Support Taxonomy',
      iconType: 'Award',
      defaultRule: 'Hardware SKU validation against mandatory support SLA tiers',
      status: support.hasSupportService ? 'PASS' : 'FAIL',
      detail: support.hasSupportService ? 'Verified mandatory support services included.' : 'Support Taxonomy Failed: Missing required support service SLA.'
    }
  ];

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
    errors,
    warnings,
    mathDeductions,
    missingDependencies,
    aspectChecks
  };

  // Step 7: Run 5-Level Dependency Conflict Graph Validation
  const { validateConflictGraph } = require('./conflict_graph');
  emitProgress(7, 10, 'Validating Conflict Graph', 'in_progress', 'Resolving dependencies and checking for architectural conflicts.');
  
  // Auto-detect chassis directory if not provided
  let resolvedDir = targetDir;
  if (!resolvedDir) {
    if (chassisInfo.model.includes('DL380') || chassisInfo.model.includes('ProLiant')) {
      resolvedDir = `outputs/${chassisInfo.family || 'ProLiant'}/${chassisInfo.generation || 'Gen12'}/${chassisInfo.model.replace(/\s+/g, '_')}`;
    } else {
      const familyDir = chassisInfo.family !== 'Unknown' ? chassisInfo.family : 'ProLiant';
      resolvedDir = `outputs/${familyDir}/Gen12/${chassisInfo.model.replace(/\s+/g, '_')}`;
    }
  }

  const graphResults = validateConflictGraph(items, missingDependencies, resolvedDir);
  evalSummary.conflictGraph = graphResults;

  // Deduct score if whole solution has graph conflicts
  if (!graphResults.isWholeSolutionValid) {
    evalSummary.errors.push(`Whole-solution conflict graph validation failed: ${graphResults.conflicts.length} unresolved conflict(s).`);
  }

  // Calculate quantitative confidence score & HITL trigger details
  const confidence = calculateConfidenceScore(items, evalSummary);
  evalSummary.confidence = confidence;

  // Run preprocessing analysis for audit trail & variation classification
  try {
    const rawSummaryText = items.map(it => `${it.quantity}x ${it.sku} ${it.description}`).join('\n');
    evalSummary.preprocessing = preprocessAndGroupBOQ(rawSummaryText, '');
  } catch (err) {
    evalSummary.preprocessing = null;
  }

  return evalSummary;
}

/**
 * Format prompt payload for Gemini Notebook RAG query.
 * Prompts NotebookLM for whole-solution buildability validation across all 5 hierarchy levels.
 * @param {Array<object>} items 
 * @param {object} evalResults 
 * @returns {string} Formatted prompt string
 */
function formatNotebookQueryPayload(items, evalResults) {
  const graph = evalResults.conflictGraph || {};
  const chassis = graph.chassisInfo || { model: 'HPE ProLiant Solution', formFactor: 'SFF' };

  let prompt = `Validate the following physical dependencies and constraints against the QuickSpecs for ${chassis.model}.\n\n`;

  const hasMissingDeps = evalResults.missingDependencies && evalResults.missingDependencies.length > 0;
  const hasErrors = evalResults.errors && evalResults.errors.length > 0;
  const rankedSolutions = graph.rankedSolutions || [];

  if (hasMissingDeps || hasErrors) {
    prompt += `The Local Rule Engine detected the following potential conflicts/missing items in the baseline configuration:\n`;
    if (hasMissingDeps) {
      const deps = evalResults.missingDependencies.map(d => `${d.quantity || 1}x ${d.sku} — ${d.description || 'required cable/accessory'}`).join('; ');
      prompt += `- Missing Dependencies: ${deps}\n`;
    }
    if (hasErrors) {
      prompt += `- Violations: ${evalResults.errors.join('; ')}\n`;
    }
    if (evalResults.totalMemoryGb && evalResults.totalMemoryGb > 0) {
      prompt += `- Memory Configuration: ${evalResults.totalMemoryGb}GB total RAM across ${evalResults.memoryCount} DIMMs (Memory capacity > 32GB)\n`;
    }
    
    prompt += `\nTo resolve these, the engine generated the following Tier 1 solution: \n`;
    if (rankedSolutions.length > 0) {
      const r1 = rankedSolutions[0];
      prompt += `Proposed Fixes: ${r1.tradeoffMetrics?.skuModifications || 'Standard'}. Reason: ${r1.reasoning}\n`;
    }
    
    prompt += `\nPlease act as a hardware engineering expert. Consult the QuickSpecs to verify if these conflicts are accurate AND if the proposed Tier 1 solution fully resolves the thermal, power, and physical constraints without introducing new violations. Return your answer as a concise technical rationale.`;
  } else {
    // If no conflicts detected locally, do a lightweight sanity check of the primary components
    const primaryItems = items.filter(it => it.quantity > 0 && ['Processor', 'Memory', 'Storage Devices'].includes(it.category)).slice(0, 10);
    const itemSummaries = primaryItems.map(it => `${it.quantity > 1 ? it.quantity + 'x ' : '1x '}${it.sku}`).join('; ');
    prompt += `Core configuration: ${itemSummaries || 'standard base chassis'}.\n`;
    prompt += `The Local Rule Engine detected NO physical conflicts. Please do a quick sanity check to ensure no hidden thermal, power, or mixing rules are violated by this core configuration. Return a concise technical rationale confirming buildability.`;
  }

  return prompt;
}

function evaluateBOQMultiAspect(filePathOrText, options = {}) {
  let content = filePathOrText;
  let fileToPass = '';
  if (typeof filePathOrText === 'string' && fs.existsSync(filePathOrText)) {
    fileToPass = filePathOrText;
    content = fs.readFileSync(filePathOrText, 'utf-8');
  }
  const items = parseAndConsolidateBOQ(content, fileToPass);
  let catalogData = null;
  let targetDir = '';
  if (typeof options === 'object' && options !== null) {
    catalogData = options.catalogData || null;
    targetDir = options.targetDir || options.chassis || '';
  } else if (typeof options === 'string') {
    targetDir = options;
  }
  return evaluatePhysicalMath(items, catalogData, targetDir);
}

module.exports = {
  evalComputeThermal,
  evalMemoryChannel,
  evalStorageTriMode,
  evalNetworkingOcp,
  evalPcieRiserSlots,
  evalPowerEnvironment,
  evalSupportManufacturing,
  evaluateBOQMultiAspect,
  parseAndConsolidateBOQ,
  evaluatePhysicalMath,
  formatNotebookQueryPayload,
  getMandatorySkusForChassis
};

