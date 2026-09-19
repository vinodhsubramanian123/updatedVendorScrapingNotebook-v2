'use strict';
/**
 * scripts/lib/aspects/aspect_registry.js
 *
 * Domain-Aware Dynamic Aspect Registry
 *
 * Orchestrates physical rule and constraint validation pipelines dynamically
 * based on the solution domain (server, storage, networking, ai_cluster)
 * instead of hardcoding a static 7-aspect server check.
 */

const { evalComputeThermal } = require('./compute_thermal.js');
const { evalMemoryChannel } = require('./memory_channel.js');
const { evalStorageTriMode } = require('./storage_tri_mode.js');
const { evalNetworkingOcp } = require('./networking_ocp.js');
const { evalPcieRiserSlots } = require('./pcie_riser.js');
const { evalPowerEnvironment } = require('./power_environment.js');
const { evalSupportManufacturing } = require('./support_manufacturing.js');
const { evalSupportServices } = require('./support_services.js');

// Explicit named checker adapters ensuring exact parameter matching and context propagation
function adapterComputeThermal(items, catalogData, mandatorySkus, serverCount, ctx) {
  const res = evalComputeThermal(items, catalogData, mandatorySkus, serverCount);
  if (ctx && typeof ctx === 'object') {
    ctx.cpuCount = res.cpuCount;
  }
  return res;
}

function adapterMemoryChannel(items, catalogData, mandatorySkus, serverCount, ctx) {
  const cpuCount = (ctx && typeof ctx.cpuCount === 'number') ? ctx.cpuCount : null;
  const isCtoChassis = Boolean(ctx && ctx.isCtoChassis);
  const channelWidth = (ctx && ctx.channelWidth) || (ctx && ctx.chassisInfo?.channelWidth) || catalogData?.chassisMetadata?.memoryChannelsPerSocket;
  if (!Number.isInteger(channelWidth) || channelWidth < 1) return { status: 'NOT_EVALUATED', advisory: 'Memory channel width requires an explicit chassis profile.' };
  return evalMemoryChannel(items, cpuCount, catalogData, isCtoChassis, channelWidth);
}

function adapterStorageTriMode(items, catalogData, mandatorySkus, serverCount, _ctx) {
  return evalStorageTriMode(items, catalogData, mandatorySkus, serverCount);
}

function adapterPcieRiserSlots(items, catalogData, mandatorySkus, serverCount, _ctx) {
  return evalPcieRiserSlots(items, catalogData, mandatorySkus, serverCount);
}

function adapterNetworkingOcp(items, catalogData, mandatorySkus, serverCount, _ctx) {
  return evalNetworkingOcp(items, catalogData, mandatorySkus, serverCount);
}

function adapterPowerEnvironment(items, catalogData, mandatorySkus, _serverCount, _ctx) {
  return evalPowerEnvironment(items, catalogData, mandatorySkus);
}

function adapterSupportManufacturing(items, catalogData, _mandatorySkus, serverCount, _ctx) {
  return evalSupportManufacturing(items, catalogData, 0, serverCount);
}

function adapterSupportServices(items, catalogData, _mandatorySkus, _serverCount, ctx) {
  return evalSupportServices(items, catalogData, ctx?.options?.lifecycle || {});
}

const DOMAIN_CAPABILITY_MATRIX = Object.freeze({
  server: { status: 'PRODUCTION_SUPPORTED' },
  ai_cluster: { status: 'PARTIALLY_SUPPORTED' },
  storage: { status: 'PARTIALLY_SUPPORTED' },
  networking: { status: 'PARTIALLY_SUPPORTED' },
  archive: { status: 'NOT_EVALUATED' }
});

const DOMAIN_REGISTRY = {
  server: [
    { id: 'COMPUTE_THERMAL', name: 'Compute & Thermal Aspect', checker: adapterComputeThermal },
    { id: 'MEMORY_CHANNEL', name: 'Memory Channel & Interleaving Aspect', checker: adapterMemoryChannel },
    { id: 'STORAGE_TRI_MODE', name: 'Storage Controller & Tri-Mode Aspect', checker: adapterStorageTriMode },
    { id: 'PCIE_RISER', name: 'PCIe Slot & Riser Aspect', checker: adapterPcieRiserSlots },
    { id: 'NETWORKING_OCP', name: 'Networking & OCP Adapter Aspect', checker: adapterNetworkingOcp },
    { id: 'POWER_ENVIRONMENT', name: 'Power Supply & Environmental Aspect', checker: adapterPowerEnvironment },
    { id: 'SUPPORT_MANUFACTURING', name: 'Factory Integration & Manufacturing Aspect', checker: adapterSupportManufacturing },
    { id: 'SUPPORT_SERVICES', name: 'Support & Deployment Services Aspect', checker: adapterSupportServices }
  ],
  storage: [
    {
      id: 'STORAGE_CONTROLLER_PAIR',
      name: 'Storage Array Active-Active Controller Pair',
      checker: (items, _catalogData, _mandatorySkus, serverCount, _ctx) => {
        const controllerNodes = items.filter(it => {
          const desc = (it.description || '').toLowerCase();
          return desc.includes('controller node') || desc.includes('controller enclosure') || desc.includes('storage node');
        });
        const nodeCount = controllerNodes.reduce((sum, it) => sum + (it.quantity || 1), 0);
        const applianceCount = Math.max(1, Number(serverCount || 1));
        const requiredNodes = applianceCount * 2;

        if (nodeCount === 0) {
          return {
            controllerNodeCount: 0,
            requiredNodes,
            status: 'NOT_EVALUATED',
            advisory: 'Storage array controller nodes not identified in BOQ; domain check marked NOT_EVALUATED'
          };
        }

        const hasRedundantPair = (nodeCount % 2 === 0) && (nodeCount >= requiredNodes);
        return {
          controllerNodeCount: nodeCount,
          requiredNodes,
          hasRedundantPair,
          status: hasRedundantPair ? 'PASS' : 'WARN',
          advisory: !hasRedundantPair ? `Storage Best Practice: SAN storage requires redundant controller node pairs (${requiredNodes} nodes for ${applianceCount} appliance(s), found ${nodeCount})` : null
        };
      }
    },
    { id: 'STORAGE_TRI_MODE', name: 'Drive Cage & Storage Enclosure Aspect', checker: adapterStorageTriMode },
    { id: 'POWER_ENVIRONMENT', name: 'Storage Enclosure Power & Environmental Aspect', checker: adapterPowerEnvironment },
    { id: 'SUPPORT_SERVICES', name: 'Pointnext & Storage Support Services Aspect', checker: adapterSupportServices }
  ],
  networking: [
    {
      id: 'SWITCH_FABRIC_PORTS',
      name: 'Switch Fabric & Port Protocol Alignment',
      checker: (_items, _catalogData, _mandatorySkus, _serverCount, _ctx) => {
        // Switch fabric and port speed matching requires switch ASIC chassis profile
        return {
          status: 'NOT_EVALUATED',
          advisory: 'Switch port fabric, speed matching, protocol, and airflow alignment require switch ASIC profile; marked NOT_EVALUATED'
        };
      }
    },
    { id: 'POWER_ENVIRONMENT', name: 'Switch Redundant Power & Airflow Aspect', checker: adapterPowerEnvironment },
    { id: 'SUPPORT_SERVICES', name: 'Network Tech Care & Support Services Aspect', checker: adapterSupportServices }
  ],
  ai_cluster: [
    { id: 'COMPUTE_THERMAL', name: 'AI Server Thermal & Liquid Cooling Aspect', checker: adapterComputeThermal },
    { id: 'MEMORY_CHANNEL', name: 'High-Bandwidth Memory Interleaving Aspect', checker: adapterMemoryChannel },
    { id: 'PCIE_RISER', name: 'SXM / PCIe High-Power GPU Bus Aspect', checker: adapterPcieRiserSlots },
    { id: 'POWER_ENVIRONMENT', name: 'High-Wattage Power Envelope & Busbar Aspect', checker: adapterPowerEnvironment },
    { id: 'NETWORKING_OCP', name: 'InfiniBand / RoCE High-Speed Fabric Aspect', checker: adapterNetworkingOcp },
    { id: 'STORAGE_TRI_MODE', name: 'High-Speed NVMe Local Scratch Cache Aspect', checker: adapterStorageTriMode },
    { id: 'SUPPORT_SERVICES', name: 'Mission-Critical AI Cluster Support Services Aspect', checker: adapterSupportServices }
  ],
  archive: [
    {
      id: 'ARCHIVE_COLD_STORAGE',
      name: 'Tape Library & Archive Drive Validation',
      checker: (_items, _catalogData, _mandatorySkus, _serverCount, _ctx) => {
        return {
          status: 'NOT_EVALUATED',
          advisory: 'Archive domain physical constraints not evaluated; tape library chassis profile not loaded'
        };
      }
    }
  ]
};

/**
 * Get registered aspect checkers for a given domain
 * @param {string} [domain='server']
 * @returns {Array<object>} Registered aspect checkers
 */
function getRegisteredAspectsForDomain(domain = 'server') {
  const normDomain = String(domain || 'server').toLowerCase();
  return DOMAIN_REGISTRY[normDomain] || [{ id: 'UNSUPPORTED_DOMAIN', name: 'Unsupported domain', checker: () => ({ status: 'NOT_EVALUATED', advisory: `No checker profile for ${normDomain}` }) }];
}

/**
 * Register or override an aspect checker for a specific domain
 * @param {string} domain
 * @param {object} aspectDefinition - { id, name, checker }
 */
function registerCustomAspect(domain, aspectDefinition) {
  const normDomain = String(domain || 'server').toLowerCase();
  if (!aspectDefinition?.id || typeof aspectDefinition.checker !== 'function') throw new Error('Aspect registration requires an id and checker function');
  if (!DOMAIN_REGISTRY[normDomain]) {
    DOMAIN_REGISTRY[normDomain] = [];
  }
  const existingIdx = DOMAIN_REGISTRY[normDomain].findIndex(a => a.id === aspectDefinition.id);
  if (existingIdx >= 0) {
    DOMAIN_REGISTRY[normDomain][existingIdx] = aspectDefinition;
  } else {
    DOMAIN_REGISTRY[normDomain].push(aspectDefinition);
  }
}

/**
 * Normalize an aspect checker return value into standardized status, errors, and warnings
 * @param {string} id - Aspect ID
 * @param {object} result - Checker diagnostic output
 * @returns {object} { status: 'PASS' | 'WARN' | 'FAIL' | 'NOT_EVALUATED' | 'UNKNOWN', errors: string[], warnings: string[] }
 */
function normalizeAspectResult(id, result) {
  if (!result || typeof result !== 'object') {
    return {
      status: 'UNKNOWN',
      errors: [`Aspect check [${id}] returned invalid or non-object result`],
      warnings: []
    };
  }

  if (result.status === 'NOT_EVALUATED') {
    return {
      status: 'NOT_EVALUATED',
      errors: [],
      warnings: result.advisory ? [result.advisory] : []
    };
  }

  if (result.status && result.status !== 'PASS') {
    const warnings = Array.isArray(result.warnings) ? [...result.warnings] : [];
    if (result.advisory) warnings.push(result.advisory);
    return {
      status: result.errors?.length ? 'FAIL' : (['WARN', 'FAIL', 'UNKNOWN'].includes(result.status) ? result.status : 'UNKNOWN'),
      errors: Array.isArray(result.errors) ? result.errors : [],
      warnings
    };
  }

  const errors = Array.isArray(result.errors) ? [...result.errors] : [];
  const warnings = Array.isArray(result.warnings) ? [...result.warnings] : [];
  if (result.advisory) warnings.push(result.advisory);

  switch (id) {
    case 'COMPUTE_THERMAL':
      if (result.needsHeatsink) errors.push('Missing required processor heatsink');
      if (result.hasMixedCpuModels) errors.push('Dual processor models or stepping mismatch (mixed CPU models)');
      if (result.needsDirectLiquidCooling) errors.push('Direct Liquid Cooling required for high-TDP processor');
      if (result.needsHighPerfCooling) errors.push('High-TDP processor (>185W) requires High-Performance Fan Kit and Heatsink');
      if (result.fanKitExceedsMax) errors.push('Fan kit quantity exceeds maximum chassis capacity (CLIC Rule 81354654: max 1 fan kit per server)');
      break;

    case 'MEMORY_CHANNEL':
      if (result.hasBtoMemoryInCto) errors.push('Standalone BTO memory SKU is restricted in CTO base server');
      if (result.isInvalidChannelConfiguration) errors.push('Invalid memory channel population');
      if (result.memoryCount > 0 && result.isSupportedPopulation === false) errors.push('Unsupported asymmetric memory DIMM population');
      if (result.memoryCount > 0 && result.isBalancedChannel === false) warnings.push('Unbalanced memory channel interleaving bandwidth');
      break;

    case 'STORAGE_TRI_MODE':
      if (result.hasIncompatibleYCable) errors.push('Tri-Mode Splitter Cable Kit is incompatible with standard cages');
      if (result.needsSasExpander) errors.push('SAS Expander required for configuration exceeding 8 drives');
      if (result.needsCableKit) errors.push('Storage controller cable kit required');
      if (result.needsSmartStorageBattery) errors.push('Smart Storage Battery or Hybrid Capacitor required for storage controller cache backup');
      if (result.isBackplaneCapacityExceeded) errors.push('Drive count exceeds chassis backplane capacity');
      break;

    case 'PCIE_RISER':
      if (result.isExceedingTotalSlots) errors.push('PCIe card count exceeds physical mechanical slot capacity');
      if (result.isExceedingActiveSlots) errors.push('PCIe card count exceeds electrically cabled active slots');
      if (result.needsPrimaryCableKit) errors.push('Primary riser cable kit required to activate Slot 1');
      if (result.needsSecondaryCableKit) errors.push('Secondary riser cable kit required to activate secondary slots');
      if (result.needsSecondaryRiser) errors.push('Secondary PCIe riser card required');
      if (result.needsGpuPowerCableKit) errors.push('GPU auxiliary power cable kit required');
      break;

    case 'NETWORKING_OCP':
      if (result.isExceedingOcpSlots) errors.push('OCP adapter count exceeds chassis slot capacity');
      if (result.hasConflictingOcpCables) errors.push('Conflicting OCP enablement cables detected');
      if (result.hasSynergyFabricMismatch) errors.push('Synergy fabric mismatch detected');
      break;

    case 'POWER_ENVIRONMENT':
      if (result.hasMixedAcDcPower) errors.push('AC and -48VDC power supplies cannot be mixed');
      if (result.hasMixedWattagePsus) errors.push('Power supplies must have matching wattages in redundant pairs');
      if (result.hasMixedEfficiencyPsus) errors.push('Platinum and Titanium PSU efficiencies cannot be mixed');
      if (result.hasDl380aGpuPsuShortage) errors.push('GPU configuration lacks the profile-required redundant power supplies');
      if (result.hasSynergyRedundantPowerError) errors.push('Synergy frame requires 6 Titanium PSUs for N+N redundancy');
      if (result.hasDcPowerSupply && !result.hasDcLugKit) errors.push('-48VDC Power Supply requires DC Power Cable Lug Kit');
      if (result.needsCeRemovalKit) errors.push('EU ErP Lot 9 requires CE Mark Removal Kit for 94% Platinum PSUs');
      break;

    case 'SUPPORT_MANUFACTURING':
      if (result.hasContradictoryInstallServices) errors.push('Onsite and Remote installation services cannot both be selected');
      if (result.isWindowsLicenseUnderprovisioned) errors.push(`Windows Server core licensing underprovisioned by ${result.missingCoreLicenses || 0} cores`);
      if (result.isVmwareLicenseUnderprovisioned) errors.push(`VMware vSphere core licensing underprovisioned by ${result.missingVmwareCores || 0} cores`);
      if (result.isLinuxSubscriptionUnderprovisioned) errors.push('Linux subscriptions underprovisioned for socket count');
      break;

    case 'SUPPORT_SERVICES':
      if (result.hasObsoleteRisk) errors.push(`Obsolete component(s) detected: ${result.obsoleteSkus?.map(s => s.sku || s.cleanSku).join(', ')}`);
      if (result.hasEolWarning) warnings.push(`90-Day EOL component(s) detected: ${result.eolSkus?.map(s => s.sku || s.cleanSku).join(', ')}`);
      break;

    default:
      break;
  }

  const status = errors.length > 0 ? 'FAIL' : (warnings.length > 0 ? 'WARN' : 'PASS');
  return { status, errors, warnings };
}

/**
 * Evaluate all aspect checkers for a given domain
 * @param {string} domain - 'server' | 'storage' | 'networking' | 'ai_cluster' | 'archive'
 * @param {Array<object>} items - Consolidated BOQ items
 * @param {object} [catalogData=null] - Loaded catalog
 * @param {object} [mandatorySkus={}] - Mandatory SKU references
 * @param {number} [serverCount=1] - Node/server multiplier
 * @param {object} [context={}] - Execution context (chassisInfo, channelWidth, isCtoChassis, options)
 * @returns {object} { domain, checks: Array<object>, isAllPassed: boolean, errors: string[], warnings: string[] }
 */
function evaluateDomainAspects(domain = 'server', items = [], catalogData = null, mandatorySkus = {}, serverCount = 1, context = {}) {
  const normDomain = String(domain || 'server').toLowerCase();
  const checkers = getRegisteredAspectsForDomain(normDomain);
  const checks = [];
  const errors = [];
  const warnings = [];

  const execContext = { ...context, serverCount };

  for (const { id, name, checker } of checkers) {
    try {
      const result = checker(items, catalogData, mandatorySkus, serverCount, execContext);
      const normalized = normalizeAspectResult(id, result);

      checks.push({
        id,
        name,
        status: normalized.status,
        result,
        errors: normalized.errors,
        warnings: normalized.warnings
      });

      if (normalized.errors.length > 0) errors.push(...normalized.errors);
      if (normalized.warnings.length > 0) warnings.push(...normalized.warnings);
    } catch (err) {
      checks.push({
        id,
        name,
        status: 'FAIL',
        error: err.message
      });
      errors.push(`Aspect Check Failed (${name}): ${err.message}`);
    }
  }

  const hasFailures = errors.length > 0 || checks.some(c => c.status === 'FAIL' || c.status === 'UNKNOWN' || c.status === 'NOT_EVALUATED');
  const isAllPassed = checks.length > 0 && checks.every(check => check.status === 'PASS');

  return {
    domain: normDomain,
    capability: DOMAIN_CAPABILITY_MATRIX[normDomain] || { status: 'CUSTOM' },
    aspectCount: checks.length,
    checks,
    isAllPassed,
    hasFailures,
    hasWarnings: warnings.length > 0 || checks.some(c => c.status === 'WARN'),
    errors,
    warnings
  };
}

module.exports = {
  DOMAIN_REGISTRY,
  DOMAIN_CAPABILITY_MATRIX,
  getRegisteredAspectsForDomain,
  registerCustomAspect,
  normalizeAspectResult,
  evaluateDomainAspects
};
