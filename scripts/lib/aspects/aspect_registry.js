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
const { cleanBaseSKU, buildCatalogSkuIndex, isOcaModifierTrackingRow } = require('../catalog/sku.js');

// Explicit named checker adapters ensuring exact parameter matching and context propagation
function adapterComputeThermal(items, catalogData, mandatorySkus, serverCount, ctx) {
  const res = evalComputeThermal(items, catalogData, mandatorySkus, serverCount, ctx?.options || {});
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

function adapterPowerEnvironment(items, catalogData, mandatorySkus, serverCount, ctx) {
  return evalPowerEnvironment(items, catalogData, mandatorySkus, serverCount, ctx?.options || {});
}

function adapterSupportManufacturing(items, catalogData, _mandatorySkus, serverCount, ctx) {
  let cores = (ctx && typeof ctx.totalSocketCores === 'number' && ctx.totalSocketCores > 0) ? ctx.totalSocketCores : 0;
  if (!cores && ctx && typeof ctx.cpuCores === 'number' && ctx.cpuCores > 0) cores = ctx.cpuCores;
  if (!cores) {
    const skuIndex = catalogData ? buildCatalogSkuIndex(catalogData) : null;
    for (const it of (items || [])) {
      if (isOcaModifierTrackingRow(it.sku, it.description)) continue;
      const desc = String(it.description || '').toLowerCase();
      const catItem = skuIndex ? skuIndex.get(cleanBaseSKU(it.sku)) : null;
      const fullDesc = (catItem?.skuData?.Description || desc).toLowerCase();
      if (fullDesc.includes('processor') || fullDesc.includes('xeon') || fullDesc.includes('epyc')) {
        const match = fullDesc.match(/(\d+)\s*-?\s*core/i) || fullDesc.match(/\b(\d+)\s*c(?:ores?)?\b/i);
        if (match) {
          cores += (parseInt(match[1], 10) * (it.quantity || 1));
        }
      }
    }
  }
  return evalSupportManufacturing(items, catalogData, cores, serverCount, ctx || {});
}

function adapterSupportServices(items, catalogData, _mandatorySkus, _serverCount, ctx) {
  return evalSupportServices(items, catalogData, ctx?.options?.lifecycle || {});
}

function adapterSanSwitchAspect(aspectId) {
  return function(items, catalogData, mandatorySkus, serverCount, ctx) {
    if (!ctx || !ctx.chassisDir) {
      return { status: 'NOT_EVALUATED', advisory: 'SAN switch aspect validation requires explicit chassis directory context.' };
    }
    try {
      const { evaluateSanSwitch } = require('../boq/san_switch_evaluator.js');
      const rules = ctx.rules || ctx.catalogRules || [];
      const chassisInfo = ctx.chassisInfo || { productId: require('path').basename(ctx.chassisDir) };
      const sanRes = evaluateSanSwitch(items, catalogData, ctx.chassisDir, chassisInfo, rules, ctx.options || {});
      const check = (sanRes.aspectChecks || []).find(c => c.id === aspectId);
      if (check) {
        return {
          status: check.status === 'UNVERIFIED' ? 'UNKNOWN' : check.status,
          errors: check.status === 'FAIL' ? [check.detail] : [],
          warnings: check.status === 'WARN' ? [check.detail] : [],
          advisory: check.detail
        };
      }
      return { status: 'NOT_EVALUATED', advisory: `SAN aspect ${aspectId} was not resolved.` };
    } catch (err) {
      return { status: 'NOT_EVALUATED', advisory: `SAN switch evaluation advisory: ${err.message}` };
    }
  };
}

function parseSwitchPortSpec(desc, qty) {
  let access = 48;
  let uplinks = 4;
  let maxSpeed = 10;
  const portMatch = desc.match(/\b(\d+)\s*(?:-?\s*port|g|gt|p)\b/i);
  if (portMatch) access = parseInt(portMatch[1], 10) || 48;

  if (desc.includes('48y') || desc.includes('32y') || desc.includes('8325') || desc.includes('8360') || desc.includes('100g')) {
    uplinks = 6;
    maxSpeed = 100;
  } else if (desc.includes('sfp56') || desc.includes('50g')) {
    maxSpeed = 50;
  } else if (desc.includes('sfp28') || desc.includes('25g')) {
    maxSpeed = 25;
  }
  return { access: access * qty, uplinks: uplinks * qty, maxSpeed };
}

function tallySwitchPortsAndOptics(items) {
  let switchCount = 0;
  let totalAccessPorts = 0;
  let totalUplinkPorts = 0;
  let maxUplinkSpeedGb = 10;
  let transceiverCount = 0;
  let opticalTransceiverCount = 0;
  let opticalPatchCableCount = 0;
  let dacCableCount = 0;
  let has100GTransceivers = false;
  let has400GTransceivers = false;

  for (const it of items) {
    if (isOcaModifierTrackingRow(it.sku, it.description)) continue;
    const desc = String(it.description || '').toLowerCase();
    const qty = it.quantity || 1;

    const isSwitch = (desc.includes('switch') || desc.includes('cx ') || desc.includes('flexfabric')) &&
                     !desc.includes('switch card') && !desc.includes('power switch') &&
                     !desc.includes('interconnect') && !desc.includes('mezzanine') &&
                     !desc.includes('transceiver') && !desc.includes('cable');

    if (isSwitch) {
      switchCount += qty;
      const parsed = parseSwitchPortSpec(desc, qty);
      totalAccessPorts += parsed.access;
      totalUplinkPorts += parsed.uplinks;
      maxUplinkSpeedGb = Math.max(maxUplinkSpeedGb, parsed.maxSpeed);
    }

    const isTransceiver = (desc.includes('transceiver') || desc.includes('sfp') || desc.includes('qsfp')) &&
                          !desc.includes('switch') && !desc.includes('adapter');
    if (isTransceiver) {
      const packMatch = desc.match(/\b(\d+)\s*-?\s*pack\b/i);
      const packSize = packMatch ? parseInt(packMatch[1], 10) : 1;
      const count = qty * packSize;
      transceiverCount += count;
      if (desc.includes('sr') || desc.includes('lr') || desc.includes('optical') || desc.includes('sw') || desc.includes('lw')) {
        opticalTransceiverCount += count;
      }
      if (desc.includes('100g') || desc.includes('qsfp28')) has100GTransceivers = true;
      if (desc.includes('400g') || desc.includes('qsfp-dd') || desc.includes('osfp')) has400GTransceivers = true;
    }

    if (desc.includes('dac') || desc.includes('direct attach') || desc.includes('copper cable')) {
      dacCableCount += qty;
    }
    if ((desc.includes('lc') && desc.includes('patch') && desc.includes('cable')) || (desc.includes('om4') && desc.includes('cable'))) {
      opticalPatchCableCount += qty;
    }
  }

  return {
    switchCount, totalAccessPorts, totalUplinkPorts, maxUplinkSpeedGb,
    transceiverCount, opticalTransceiverCount, opticalPatchCableCount, dacCableCount,
    has100GTransceivers, has400GTransceivers
  };
}

function evalSwitchFabricPorts(items, _catalogData, _mandatorySkus, _serverCount, _ctx) {
  if (!items || items.length === 0) {
    return { status: 'NOT_EVALUATED', advisory: 'No networking switch or fabric components in BOQ' };
  }

  const t = tallySwitchPortsAndOptics(items);
  if (t.switchCount === 0) {
    if (t.transceiverCount > 0 || t.dacCableCount > 0) {
      return { status: 'FAIL', errors: ['Networking transceivers or DAC cables configured without a host switch chassis'], warnings: [] };
    }
    return { status: 'NOT_EVALUATED', advisory: 'No networking switch chassis identified in BOQ' };
  }

  const errors = [];
  const warnings = [];
  const totalOpticDemand = t.transceiverCount + t.dacCableCount;
  if (t.totalUplinkPorts > 0 && totalOpticDemand > t.totalUplinkPorts) {
    errors.push(`Optical transceivers and DAC cables (${totalOpticDemand}) exceed available switch uplink port capacity (${t.totalUplinkPorts})`);
  }
  if (t.has100GTransceivers && t.maxUplinkSpeedGb < 100) {
    errors.push(`Incompatible transceiver speed: 100G QSFP28 optics configured on switch supporting maximum ${t.maxUplinkSpeedGb}G uplinks`);
  }
  if (t.has400GTransceivers && t.maxUplinkSpeedGb < 400) {
    errors.push(`Incompatible transceiver speed: 400G optics configured on switch supporting maximum ${t.maxUplinkSpeedGb}G uplinks`);
  }
  if (t.opticalTransceiverCount > 0 && t.opticalPatchCableCount === 0) {
    warnings.push('Optical transceivers present without LC/LC optical patch cables');
  }

  return {
    status: errors.length > 0 ? 'FAIL' : (warnings.length > 0 ? 'WARN' : 'PASS'),
    switchCount: t.switchCount,
    totalAccessPorts: t.totalAccessPorts,
    totalUplinkPorts: t.totalUplinkPorts,
    maxUplinkSpeedGb: t.maxUplinkSpeedGb,
    errors,
    warnings,
    advisory: errors.length === 0 ? `Switch fabric verified: ${t.switchCount} switch(es), ${t.totalAccessPorts} access ports, ${t.totalUplinkPorts} uplink ports (${t.maxUplinkSpeedGb}G max)` : null
  };
}

function tallyTapeArchiveItems(items) {
  let msl3040BaseCount = 0;
  let msl3040ExpCount = 0;
  let mslAutoloaderCount = 0;
  let msl6480BaseCount = 0;
  let msl6480ExpCount = 0;
  let standaloneDriveCount = 0;
  let ltoSasDriveCount = 0;
  let ltoFcDriveCount = 0;
  let miniSasHdCableCount = 0;
  let fcTransceiverCount = 0;
  let dataCartridgeCount = 0;
  let cleaningCartridgeCount = 0;
  let barcodeLabelCount = 0;

  for (const it of items) {
    if (isOcaModifierTrackingRow(it.sku, it.description)) continue;
    const desc = String(it.description || '').toLowerCase();
    const sku = cleanBaseSKU(it.sku);
    const qty = it.quantity || 1;

    if (desc.includes('msl3040') || (desc.includes('msl') && desc.includes('3040'))) {
      if (desc.includes('expansion')) msl3040ExpCount += qty;
      else msl3040BaseCount += qty;
    } else if (desc.includes('msl6480') || (desc.includes('msl') && desc.includes('6480'))) {
      if (desc.includes('expansion')) msl6480ExpCount += qty;
      else msl6480BaseCount += qty;
    } else if (desc.includes('msl 1/8') || desc.includes('1/8 g2') || desc.includes('autoloader')) {
      mslAutoloaderCount += qty;
    }

    if (!desc.includes('label') && (desc.includes('tape drive') || desc.includes('ultrium 30750') || desc.includes('lto-7') || desc.includes('lto-8') || desc.includes('lto-9'))) {
      if (!desc.includes('cartridge') && !desc.includes('cable') && !desc.includes('transceiver') && !desc.includes('cleaning')) {
        if (desc.includes('sas')) ltoSasDriveCount += qty;
        else if (desc.includes('fc') || desc.includes('fibre channel')) ltoFcDriveCount += qty;
        else standaloneDriveCount += qty;
      }
    }

    if (desc.includes('mini sas high density') || desc.includes('mini-sas hd') || desc.includes('mini sas hd') || sku === '716195-B21' || sku === '716197-B21') {
      miniSasHdCableCount += qty;
    }
    if ((desc.includes('transceiver') && (desc.includes('fc') || desc.includes('short wave') || desc.includes('fibre channel'))) || sku === 'AJ716B' || sku === 'AJ717A') {
      fcTransceiverCount += qty;
    }

    if (!desc.includes('label') && (desc.includes('lto-') || desc.includes('ultrium')) && (desc.includes('data cartridge') || desc.includes('rw data') || desc.includes('custom labeled') || desc.includes('non-custom'))) {
      dataCartridgeCount += qty;
    }
    if (sku === 'C7978A' || desc.includes('universal cleaning') || desc.includes('cleaning cartridge')) {
      cleaningCartridgeCount += qty;
    }
    if (desc.includes('bar code label') || desc.includes('barcode label') || desc.includes('label pack') || sku === 'Q2014A' || sku === 'Q2015A') {
      barcodeLabelCount += qty;
    }
  }

  return {
    msl3040BaseCount, msl3040ExpCount, mslAutoloaderCount, msl6480BaseCount, msl6480ExpCount,
    standaloneDriveCount, ltoSasDriveCount, ltoFcDriveCount, miniSasHdCableCount,
    fcTransceiverCount, dataCartridgeCount, cleaningCartridgeCount, barcodeLabelCount
  };
}

function calculateTapeCapacities(t, errors) {
  let totalSlotsAvailable = 0;
  let maxDrivesSupported = 0;

  if (t.msl3040BaseCount > 0) {
    if (t.msl3040ExpCount > 6) errors.push('MSL3040 Tape Library exceeds maximum expansion module limit (maximum 6 expansion modules)');
    const effectiveExp = Math.min(t.msl3040ExpCount, 6);
    totalSlotsAvailable += (t.msl3040BaseCount * 40) + (effectiveExp * 40);
    maxDrivesSupported += (t.msl3040BaseCount * 3) + (effectiveExp * 3);
  }
  if (t.msl6480BaseCount > 0) {
    if (t.msl6480ExpCount > 6) errors.push('MSL6480 Tape Library exceeds maximum expansion module limit (maximum 6 expansion modules)');
    const effectiveExp = Math.min(t.msl6480ExpCount, 6);
    totalSlotsAvailable += (t.msl6480BaseCount * 80) + (effectiveExp * 80);
    maxDrivesSupported += (t.msl6480BaseCount * 6) + (effectiveExp * 6);
  }
  if (t.mslAutoloaderCount > 0) {
    totalSlotsAvailable += (t.mslAutoloaderCount * 8);
    maxDrivesSupported += (t.mslAutoloaderCount * 1);
  }
  return { totalSlotsAvailable, maxDrivesSupported };
}

function evalArchiveColdStorage(items, _catalogData, _mandatorySkus, _serverCount, _ctx) {
  if (!items || items.length === 0) {
    return { status: 'NOT_EVALUATED', advisory: 'Archive domain physical constraints not evaluated; tape library chassis profile not loaded' };
  }

  const t = tallyTapeArchiveItems(items);
  const libraryCount = t.msl3040BaseCount + t.msl6480BaseCount + t.mslAutoloaderCount;
  const totalDrives = t.ltoSasDriveCount + t.ltoFcDriveCount + t.standaloneDriveCount;

  if (libraryCount === 0 && totalDrives === 0 && t.dataCartridgeCount === 0) {
    return { status: 'NOT_EVALUATED', advisory: 'Archive domain physical constraints not evaluated; tape library chassis profile not loaded' };
  }

  const errors = [];
  const warnings = [];
  const { totalSlotsAvailable, maxDrivesSupported } = calculateTapeCapacities(t, errors);

  if (libraryCount > 0 && totalDrives === 0) errors.push('Tape library requires at least one LTO tape drive installed');
  if (libraryCount > 0 && maxDrivesSupported > 0 && totalDrives > maxDrivesSupported) {
    errors.push(`Total tape drives (${totalDrives}) exceed library drive bay capacity (${maxDrivesSupported})`);
  }
  const totalCartridges = t.dataCartridgeCount + t.cleaningCartridgeCount;
  if (totalSlotsAvailable > 0 && totalCartridges > totalSlotsAvailable) {
    errors.push(`Cartridge count (${totalCartridges}) exceeds library slot capacity (${totalSlotsAvailable})`);
  }
  if (t.ltoSasDriveCount > t.miniSasHdCableCount) {
    errors.push(`LTO SAS tape drive(s) (${t.ltoSasDriveCount}) require Mini-SAS HD external cable(s) (found ${t.miniSasHdCableCount})`);
  }
  if (t.ltoFcDriveCount > t.fcTransceiverCount) {
    errors.push(`LTO Fibre Channel tape drive(s) (${t.ltoFcDriveCount}) require optical transceiver(s) (found ${t.fcTransceiverCount})`);
  }

  const expectedCleaning = t.dataCartridgeCount > 0 ? Math.ceil(t.dataCartridgeCount / 20) : 0;
  if (t.cleaningCartridgeCount < expectedCleaning) {
    warnings.push(`Recommended universal cleaning cartridges underprovisioned (found ${t.cleaningCartridgeCount}, expected ${expectedCleaning} for ${t.dataCartridgeCount} tapes)`);
  }
  const expectedLabels = t.dataCartridgeCount > 0 ? Math.ceil(t.dataCartridgeCount / 100) : 0;
  if (t.barcodeLabelCount < expectedLabels) {
    warnings.push(`Recommended barcode label packs underprovisioned for library automation (found ${t.barcodeLabelCount}, expected ${expectedLabels})`);
  }

  return {
    status: errors.length > 0 ? 'FAIL' : (warnings.length > 0 ? 'WARN' : 'PASS'),
    libraryCount, totalSlotsAvailable, maxDrivesSupported,
    errors, warnings,
    advisory: errors.length === 0 ? `Tape archive storage verified: ${libraryCount} library/autoloader(s), ${totalDrives} drive(s), ${totalSlotsAvailable} slots, ${t.dataCartridgeCount} cartridges` : null
  };
}

const DOMAIN_CAPABILITY_MATRIX = Object.freeze({
  server: { status: 'PRODUCTION_SUPPORTED' },
  ai_cluster: { status: 'PARTIALLY_SUPPORTED' },
  storage: { status: 'PARTIALLY_SUPPORTED' },
  networking: { status: 'PARTIALLY_SUPPORTED' },
  san_switch: { status: 'PRODUCTION_SUPPORTED' },
  synergy_compute: { status: 'PARTIALLY_SUPPORTED' },
  archive: { status: 'NOT_EVALUATED' },
  archive_tape: { status: 'NOT_EVALUATED' }
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
      checker: evalSwitchFabricPorts
    },
    { id: 'POWER_ENVIRONMENT', name: 'Switch Redundant Power & Airflow Aspect', checker: adapterPowerEnvironment },
    { id: 'SUPPORT_SERVICES', name: 'Network Tech Care & Support Services Aspect', checker: adapterSupportServices }
  ],
  san_switch: [
    { id: 'SAN_LICENSED_PORTS', name: 'SAN Licensed Port Capacity', checker: adapterSanSwitchAspect('SAN_LICENSED_PORTS') },
    { id: 'BUNDLED_OPTICS_BILLING', name: 'Bundled Optics Billing', checker: adapterSanSwitchAspect('BUNDLED_OPTICS_BILLING') },
    { id: 'CATALOG_SERVICE_COVERAGE', name: 'Catalog and Service Coverage', checker: adapterSanSwitchAspect('CATALOG_SERVICE_COVERAGE') },
    { id: 'SERVER_RULES_NOT_APPLICABLE', name: 'Server Component Rules', checker: () => ({ status: 'NOT_APPLICABLE', advisory: 'Fixed SAN switch: no server CPU, DIMM, diskless kit, PCIe riser or redundant server PSU additions.' }) }
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
      checker: evalArchiveColdStorage
    }
  ],
  archive_tape: [
    {
      id: 'ARCHIVE_COLD_STORAGE',
      name: 'Tape Library & Archive Drive Validation',
      checker: evalArchiveColdStorage
    }
  ],
  synergy_compute: [
    { id: 'COMPUTE_THERMAL', name: 'Synergy Compute & Thermal Aspect', checker: adapterComputeThermal },
    { id: 'MEMORY_CHANNEL', name: 'Synergy Memory Channel & Interleaving Aspect', checker: adapterMemoryChannel },
    { id: 'STORAGE_TRI_MODE', name: 'Synergy Drive & Storage Controller Aspect', checker: adapterStorageTriMode },
    { id: 'FRAME_FABRIC_MEZZANINE', name: 'Synergy Mezzanine & Interconnect Fabric Aspect', checker: adapterNetworkingOcp },
    { id: 'FRAME_SHARED_POWER', name: 'Synergy Frame Shared Power & Cooling Aspect', checker: adapterPowerEnvironment },
    { id: 'SUPPORT_SERVICES', name: 'Synergy Support & Deployment Services Aspect', checker: adapterSupportServices }
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

function normalizeComputeThermalResult(result, errors) {
  if (result.needsHeatsink) errors.push('Missing required processor heatsink');
  if (result.hasMixedCpuModels) errors.push('Dual processor models or stepping mismatch (mixed CPU models)');
  if (result.needsDirectLiquidCooling) errors.push('Direct Liquid Cooling required for high-TDP processor');
  if (result.needsHighPerfCooling) errors.push('High-TDP processor (>185W) requires High-Performance Fan Kit');
  if (result.fanKitExceedsMax) errors.push('Fan kit quantity exceeds maximum chassis capacity (CLIC Rule 81354654: max 1 fan kit per server)');
  if (result.fanKitUnderPopulated) errors.push('Insufficient modular fan kits for installed processor count');
}

function normalizeMemoryChannelResult(result, errors, warnings) {
  if (result.hasBtoMemoryInCto) errors.push('Standalone BTO memory SKU is restricted in CTO base server');
  if (result.needsMemory || (result.cpuCount > 0 && result.memoryCount === 0)) errors.push('Missing required system memory (0 RAM modules installed for server CPU)');
  if (result.hasMixedDdrGeneration) errors.push('DDR4 and DDR5 memory generations cannot be mixed in the same server');
  if (result.hasMixedMemoryTypes) errors.push('RDIMM, LRDIMM, and MRDIMM memory types cannot be mixed across channels or sockets');
  if (result.isInvalidChannelConfiguration) errors.push('Invalid memory channel population');
  else if (result.memoryCount > 0 && result.isSupportedPopulation === false) errors.push('Unsupported asymmetric memory DIMM population');
  if (result.memoryCount > 0 && result.isBalancedChannel === false) warnings.push('Unbalanced memory channel interleaving bandwidth');
}

function normalizeStorageArrayDiagnostics(result, errors, warnings) {
  if (result.hasMissingControllerNode) errors.push('Alletra storage array requires exactly two active controller nodes');
  if (result.hasAsymmetricHbas) errors.push('Alletra host bus adapters must be symmetric across controller nodes');
  if (result.missingDaisyChainCables) errors.push('Alletra expansion shelf requires redundant SAS daisy chain cables');
  if (result.insufficientRaid6Drives) errors.push('RAID 6 configuration requires at least 6 SSDs');
  if (result.insufficientRaid10Drives) errors.push('RAID 10 configuration requires at least 4 SSDs');
  if (result.hasD3940ConnectivityError) errors.push('Synergy D3940 storage module requires SAS Mezzanine card and SAS Connection Module');
  if (result.hasMr216iORaid56Risk) warnings.push('MR216i-o controller lacks write cache; RAID 5/6 or write-intensive workloads require Smart Storage Battery');
  if (result.hasLffDrivesInSffChassis) errors.push('LFF 3.5-inch drives cannot be installed in SFF chassis');
}

function normalizeStorageTapeAndCageDiagnostics(result, errors) {
  if (result.needsMiniSasHdCable) errors.push('StoreEver LTO SAS tape drive requires Mini-SAS HD cable');
  if (result.needsFcTransceiver) errors.push('StoreEver LTO Fibre Channel tape drive requires optical transceiver');
  if (result.exceedsMaxMsl3040Slots) errors.push('StoreEver MSL3040 tape library exceeds maximum limit of 6 expansion modules');
  if (result.exceedsSlotCapacity) errors.push('Data cartridge count exceeds available tape library slot capacity');
  if (result.hasDriveCageMixingConflict) errors.push('Cannot mix 4SFF and 4EDSFF drive cages in DL380a chassis (CLIC Rule 81016788)');
  if (result.needsDriveCageForController) errors.push('Hardware storage controller requires physical drive cage and backplane cabling');
  if (result.hasControllerNoDriveConflict) errors.push('Hardware storage controller cannot be installed with No Drive FIO Kit');
  if (result.needsCapacitorCable) errors.push('Smart Storage Battery requires controller enablement cable kit (CLIC Rule 81354652)');
}

function normalizeStorageEnterpriseDiagnostics(result, errors, warnings) {
  normalizeStorageArrayDiagnostics(result, errors, warnings);
  normalizeStorageTapeAndCageDiagnostics(result, errors);
}

function normalizeStorageTriModeResult(result, errors, warnings) {
  if (result.hasIncompatibleYCable) errors.push('Tri-Mode Splitter Cable Kit is incompatible with standard cages');
  if (result.needsSasExpander) errors.push('SAS Expander required for configuration exceeding 8 drives');
  if (result.needsCableKit) errors.push('Storage cable kit required for controller backplane connection');
  if (result.needsSmartStorageBattery) errors.push('Smart Storage Battery or Hybrid Capacitor required for storage controller cache backup');
  if (result.isBackplaneCapacityExceeded) errors.push(`Installed drives (${result.driveCount || 0}) exceed backplane drive capacity (${result.backplaneCapacity || 0})`);
  normalizeStorageEnterpriseDiagnostics(result, errors, warnings);
}

function normalizePcieRiserResult(result, errors, warnings) {
  if (result.isExceedingTotalSlots) errors.push('PCIe card count exceeds physical mechanical slot capacity');
  if (result.isExceedingActiveSlots) errors.push('PCIe card count exceeds electrically cabled active slots');
  if (result.needsPrimaryRiser) errors.push('Primary Riser Kit required for PCIe expansion');
  if (result.needsPrimaryCableKit) errors.push('Primary riser cable kit required to activate Slot 1');
  if (result.needsSecondaryCableKit) warnings.push('Secondary riser cable kit required to activate secondary slots');
  if (result.needsSecondaryRiser) errors.push('Secondary PCIe riser card required');
  if (result.needsGpuPowerCableKit) errors.push('GPU auxiliary power cable kit required');
  if (result.laneBifurcationConstraint) errors.push('PCIe x16 lane demand exceeds available x16 physical slots');
}

function normalizeNetworkingOcpResult(result, errors, warnings) {
  if (result.isExceedingOcpSlots) errors.push('OCP adapter count exceeds chassis slot capacity');
  if (result.hasConflictingOcpCables) errors.push('Conflicting OCP enablement cables detected');
  if (result.needsOcpEnablementCable) errors.push('Secondary OCP slot requires CPU2 OCP enablement cable kit');
  if (result.hasSynergyFabricMismatch) errors.push('Synergy fabric mismatch detected');
  if (result.isMissing32GbTransceivers) errors.push('32Gb Fibre Channel HBAs require optical transceivers');
  if (result.isMissing64GbTransceivers) errors.push('64Gb Fibre Channel HBAs require optical transceivers');
  if (result.isMissingOpticalPatchCables) warnings.push('Optical transceivers require LC/LC optical patch cables');
  if (result.hasSanSinglePointOfFailure) warnings.push('SAN storage connectivity has single switch single point of failure (HA requires redundant dual SAN switches)');
}

function normalizePowerBasicCapacity(result, errors, warnings) {
  if (result.hasZeroPsus || (result.psuCount === 0 && !result.hasIntegratedPower)) {
    errors.push('Power supply required: 0 power supplies configured in BOQ');
  }
  if (result.minPsusRequired && result.psuCount > 0 && result.psuCount < result.minPsusRequired) {
    errors.push(`Insufficient power supplies: found ${result.psuCount}, required at least ${result.minPsusRequired}`);
  }
  if (result.hasPsuWattageDeficit) {
    errors.push(`Power supply wattage deficit: estimated peak consumption (${result.estimatedPeakWatts || result.estimatedNodeWattage || 0}W) exceeds total active PSU supply (${result.activePsuWattage || result.maxPsuWattage || 0}W)`);
  }
  if (result.hasPsuHeadroomDeficit) {
    warnings.push(`Power supply headroom deficit: estimated load (${result.estimatedPeakWatts || result.estimatedNodeWattage || 0}W) violates safe 80% electrical headroom limit (${result.psuHeadroomLimit || result.requiredWattageWithHeadroom || 0}W)`);
  }
}

function normalizePowerCompliance(result, errors, warnings) {
  if (result.hasMixedAcDcPower) errors.push('AC and -48VDC power supplies cannot be mixed');
  if (result.hasMixedWattagePsus) errors.push('Power supplies must have matching wattages in redundant pairs');
  if (result.hasMixedEfficiencyPsus) errors.push('Platinum and Titanium PSU efficiencies cannot be mixed');
  if (result.hasDl380aGpuPsuShortage) errors.push('GPU configuration lacks the profile-required redundant power supplies');
  if (result.hasSynergyRedundantPowerError) errors.push('Synergy frame requires 6 Titanium PSUs for N+N redundancy');
  if (result.hasDcPowerSupply && !result.hasDcLugKit) errors.push('-48VDC Power Supply requires DC Power Cable Lug Kit');
  if (result.needsCeRemovalKit) warnings.push('EU ErP Lot 9 requires CE Mark Removal Kit for 94% Platinum PSUs');
}

function normalizePowerEnvironmentResult(result, errors, warnings) {
  normalizePowerBasicCapacity(result, errors, warnings);
  normalizePowerCompliance(result, errors, warnings);
}

function normalizeSupportManufacturingResult(result, errors) {
  if (result.hasCtoServer && result.hasManagementLicense === false) errors.push('ProLiant CTO server lacks mandatory management license per CLIC Rule 81322276 (requires COM R7A11AAE or OneView E5Y43A)');
  if (result.hasContradictoryInstallServices) errors.push('Onsite and Remote installation services cannot both be selected');
  if (result.isWindowsLicenseUnderprovisioned) errors.push(`Windows Server core licensing underprovisioned by ${result.missingCoreLicenses || 0} cores`);
  if (result.isVmwareLicenseUnderprovisioned) errors.push(`VMware vSphere core licensing underprovisioned by ${result.missingVmwareCores || 0} cores`);
  if (result.isLinuxSubscriptionUnderprovisioned) errors.push('Linux subscriptions underprovisioned for socket count');
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
    return {
      status: result.errors?.length ? 'FAIL' : (['WARN', 'FAIL', 'UNKNOWN'].includes(result.status) ? result.status : 'UNKNOWN'),
      errors: Array.isArray(result.errors) ? result.errors : [],
      warnings,
      advisory: result.advisory
    };
  }

  const errors = Array.isArray(result.errors) ? [...result.errors] : [];
  const warnings = Array.isArray(result.warnings) ? [...result.warnings] : [];

  switch (id) {
    case 'COMPUTE_THERMAL':
      normalizeComputeThermalResult(result, errors);
      break;

    case 'MEMORY_CHANNEL':
      normalizeMemoryChannelResult(result, errors, warnings);
      break;

    case 'STORAGE_TRI_MODE':
      normalizeStorageTriModeResult(result, errors, warnings);
      break;

    case 'PCIE_RISER':
      normalizePcieRiserResult(result, errors, warnings);
      break;

    case 'NETWORKING_OCP':
      normalizeNetworkingOcpResult(result, errors, warnings);
      break;

    case 'POWER_ENVIRONMENT':
      normalizePowerEnvironmentResult(result, errors, warnings);
      break;

    case 'SUPPORT_MANUFACTURING':
      normalizeSupportManufacturingResult(result, errors);
      break;

    case 'SUPPORT_SERVICES':
      if (result.hasObsoleteRisk) errors.push(`Obsolete component(s) detected: ${result.obsoleteSkus?.map(s => s.sku || s.cleanSku).join(', ')}`);
      if (result.hasEolWarning) warnings.push(`90-Day EOL component(s) detected: ${result.eolSkus?.map(s => s.sku || s.cleanSku).join(', ')}`);
      break;

    default:
      break;
  }

  const status = errors.length > 0 ? 'FAIL' : (warnings.length > 0 ? 'WARN' : 'PASS');
  return { status, errors, warnings, advisory: result.advisory };
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
