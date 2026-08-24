'use strict';
/**
 * scripts/lib/boq_evaluator.js — Multi-Aspect Physical Validation & Rule Engine
 *
 * Implements 6 physical math pre-checks:
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

function parseAndConsolidateBOQ(rawInput, filePath = '') {
  let lines = [];
  const targetPath = (filePath && typeof filePath === 'string')
    ? filePath
    : (typeof rawInput === 'string' && (rawInput.endsWith('.xlsx') || rawInput.endsWith('.xls') || rawInput.endsWith('.csv') || rawInput.endsWith('.tsv') || rawInput.endsWith('.txt')) && fs.existsSync(rawInput))
    ? rawInput
    : '';

  if (targetPath && (targetPath.endsWith('.xlsx') || targetPath.endsWith('.xls'))) {
    const workbook = xlsx.readFile(targetPath);
    workbook.SheetNames.forEach(sheetName => {
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
  const pcie = evalPcieRiserSlots(items, catalogData);

  emitProgress(6, 10, 'Power & Infrastructure Checking', 'in_progress', `Verifying DC power lug kits and redundancy.`);
  const power = evalPowerEnvironment(items, catalogData, mandatorySkus);
  const support = evalSupportManufacturing(items, catalogData);

  const errors = [];
  const warnings = [];
  const missingDependencies = [];
  const mathDeductions = [];

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

  // Rule 81392308: CLIC Unbuildable Error Check
  const hasBaseChassis = items.some(it => {
    const clean = cleanBaseSKU(it.sku);
    return clean === chassisInfo.baseSku || CTO_BASE_SKUS.has(clean);
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
      defaultRule: 'CPU TDP thermal envelope vs cooling kit population rules',
      status: compute.maxCpuTdpWatts >= HIGH_TDP_THRESHOLD_WATTS && !compute.hasHighPerfFans ? 'FAIL' : 'PASS',
      detail: compute.maxCpuTdpWatts >= HIGH_TDP_THRESHOLD_WATTS && !compute.hasHighPerfFans ? `High TDP Thermal Math Failed: ${compute.maxCpuTdpWatts}W processor exceeds ${HIGH_TDP_THRESHOLD_WATTS}W limit without High-Performance Fan Kit.` : `Verified ${compute.cpuCount} CPUs (${cpusPerServer}/node) within TDP envelope.`
    },
    {
      id: 2,
      name: 'Memory & Channel Balance',
      iconType: 'Memory',
      defaultRule: 'Memory interleaving, channel balance & population rules',
      status: (memory.memoryCount > 0 && !memory.isBalancedChannel) || memory.hasBtoMemoryInCto ? 'FAIL' : 'PASS',
      detail: memory.hasBtoMemoryInCto ? `Memory Option Rule Failed: Standalone BTO Memory SKU (${memory.btoMemoryViolations.map(v => v.btoSku).join(', ')}) is not allowed in CTO base server. Direct fix: Replace with FIO SKU (${memory.btoMemoryViolations.map(v => v.fioSku).join(', ')}).` : (memory.memoryCount > 0 && !memory.isBalancedChannel) ? `Memory Math Failed: ${memory.memoryCount} DIMMs across ${compute.cpuCount || 2} CPUs is not balanced.` : `Verified ${memory.memoryCount} DIMMs in balanced configuration (${memory.memoryCount / serverCount} DIMMs/node).`
    },
    {
      id: 3,
      name: 'Storage & Controller Cabling',
      iconType: 'HardDrive',
      defaultRule: 'Storage controller, drive cage & cable kit compatibility checks',
      status: (storage.driveCount === 0 && !storage.hasNoDriveKit && !hasDriveCageKit) || (storage.hasStorageController && !storage.hasSmartBattery) ? 'FAIL' : 'PASS',
      detail: (storage.driveCount === 0 && !storage.hasNoDriveKit && !hasDriveCageKit) ? 'Storage Math Failed: 0 drives requires No Drive Configuration FIO Kit.' : storage.hasStorageController && !storage.hasSmartBattery ? 'Storage Math Failed: Storage controller requires Smart Storage Battery.' : `Verified ${storage.driveCount} drives (${storage.driveCount / serverCount}/node) and controller configuration.`
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
    confidence.confidenceReasons.push('All 6 physical aspects passed deterministic evaluation and graph rules.');
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
  const items = parseAndConsolidateBOQ(filePathOrText, options.filePath || '');
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
