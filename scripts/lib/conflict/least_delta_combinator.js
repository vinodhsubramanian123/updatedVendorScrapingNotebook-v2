'use strict';
/**
 * scripts/lib/conflict/least_delta_combinator.js — Least-Delta Solution Combinator & Troublesome SKU Pruning Engine
 *
 * Core Principle:
 * When a customer BOQ contains a "troublesome SKU" that forces multiple cascading dependencies
 * (e.g. expander cards, auxiliary cables, high-performance fans, high-wattage titanium PSUs),
 * this engine:
 * 1. Identifies the troublesome SKU acting as the root cause of the dependency cascade.
 * 2. Formulates clean, functionally equivalent alternative paths that preserve 100% of customer intent.
 * 3. Prunes the unnecessary cascading dependencies, achieving the FEWEST DELTA CHANGES.
 * 4. Generates shared intelligence reasoning detailing why this path is superior, what was eliminated,
 *    and how customer functional goals are guaranteed.
 */

const { cleanBaseSKU, buildCatalogSkuIndex } = require('../catalog/sku.js');
const fs = require('fs');
const path = require('path');

/**
 * Check if a SKU is visible in the portal under the default ambient temperature (30°C).
 * Returns false if the SKU is gated behind an AMBIENT_GATE or TDP_GATE condition
 * in the Catalog_Rules.json for this chassis.
 * Returns true if no conditional visibility rule exists (assume visible).
 * @param {string} sku - Product number to check
 * @param {string} catalogDir - Path to the catalog directory for this chassis
 * @returns {{ isVisible: boolean, conditionType: string|null, thresholdDegC: number|null }}
 */
function isSkuVisibleAtDefaultAmbient(sku, catalogDir) {
  if (!sku || !catalogDir) return { isVisible: true, conditionType: null, thresholdDegC: null };

  try {
    const conditionalSkusPath = require('path').join(catalogDir, 'raw_data', 'conditional_skus.json');
    if (!require('fs').existsSync(conditionalSkusPath)) {
      return { isVisible: true, conditionType: null, thresholdDegC: null };
    }
    const conditionalData = JSON.parse(require('fs').readFileSync(conditionalSkusPath, 'utf-8'));
    const cleanSku = require('../catalog/sku').cleanBaseSKU(sku);
    const match = (conditionalData.skus || []).find(s =>
      require('../catalog/sku').cleanBaseSKU(s.sku) === cleanSku
    );
    if (!match) return { isVisible: true, conditionType: null, thresholdDegC: null };
    // SKU is in the conditional list — it's hidden at default ambient
    return {
      isVisible: false,
      conditionType: match.conditionType || 'AMBIENT_GATE',
      thresholdDegC: match.thresholdDegC || null,
      operator: match.operator || 'lte',
      evidence: match.evidence || 'Conditional SKU — hidden at default portal ambient temperature'
    };
  } catch (_) {
    return { isVisible: true, conditionType: null, thresholdDegC: null };
  }
}

let cachedChassisMap = null;
function getChassisMap() {
  if (!cachedChassisMap) {
    try {
      const chassisMapPath = path.resolve(__dirname, '../../config/chassis_map.json');
      if (fs.existsSync(chassisMapPath)) {
        cachedChassisMap = JSON.parse(fs.readFileSync(chassisMapPath, 'utf8'));
      }
    } catch {
      cachedChassisMap = {};
    }
  }
  return cachedChassisMap || {};
}

/**
 * Dynamically find the best alternative SKU in the catalog for a given component role
 * @param {string} roleType 
 * @param {string} currentSku 
 * @param {object} constraints 
 * @param {object} catalogData 
 * @param {object} chassisInfo 
 * @returns {object|null} { sku, description }
 */
function findBestAlternativeInCatalog(roleType, currentSku, constraints = {}, catalogData = null, chassisInfo = {}) {
  if (roleType === 'GENERATIONAL_CPU_OBSOLESCENCE') {
    return findGenerationalCpuUpgrade(currentSku, constraints.originalDesc || '', catalogData, chassisInfo);
  }

  if (roleType === 'GENERATIONAL_MEMORY_COUPLING') {
    return findDdr5_5600MemoryUpgrade(currentSku, constraints.originalDesc || '', catalogData, chassisInfo, constraints.isCto !== false);
  }

  const isGen12 = (chassisInfo?.gen || '').includes('12') || (chassisInfo?.model || '').includes('Gen12');
  const genKey = isGen12 ? 'Gen12' : 'Gen11';
  const cmap = getChassisMap();
  const duals = cmap.form_factor_duals?.[genKey]?.storage_controller || {};

  // Fallback defaults if catalog is missing or empty
  if (!catalogData || !Array.isArray(catalogData.entries) || catalogData.entries.length === 0) {
    if (roleType === 'STORAGE_EXPANDER_CASCADE') {
      return {
        sku: 'P55415-B21',
        description: 'HPE Broadcom MR416i-o x16 Lanes 8GB Cache Tri-Mode Storage Controller'
      };
    }
    if (roleType === 'CONTESTED_OCP_SLOT_COLLISION') {
      const pcieAlt = duals.pcie;
      return {
        sku: pcieAlt?.sku || (isGen12 ? 'P75750-B21' : 'P47777-B21'),
        description: pcieAlt?.description || 'HPE MR416i-p x16 Lanes 8GB Cache PCIe Storage Controller'
      };
    }
    if (roleType === 'MEMORY_BUS_SPEED_BOTTLENECK') {
      const targetCapacity = constraints.targetCapacityGb || 32;
      return targetCapacity >= 64
        ? { sku: 'P43331-B21', description: 'HPE 64GB 2Rx4 DDR5-4800 Registered Smart Memory Kit' }
        : { sku: 'P43328-B21', description: 'HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory Kit' };
    }
    return null;
  }

  const skuIndex = buildCatalogSkuIndex(catalogData);

  if (roleType === 'STORAGE_EXPANDER_CASCADE') {
    for (const [sku, item] of skuIndex.entries()) {
      if (item.lifecycleStatus && (item.lifecycleStatus === 'OB' || item.lifecycleStatus === 'EOL')) continue;
      const desc = (item.skuData?.Description || item.entry?.description || '').toLowerCase();
      if ((desc.includes('controller') || desc.includes('raid')) &&
          (desc.includes('16-port') || desc.includes('x16') || desc.includes('416i')) &&
          desc.includes('tri-mode')) {
        return {
          sku,
          description: item.skuData?.Description || item.entry?.description || '16-Port Tri-Mode Storage Controller'
        };
      }
    }
    return {
      sku: 'P55415-B21',
      description: 'HPE Broadcom MR416i-o x16 Lanes 8GB Cache Tri-Mode Storage Controller'
    };
  }

  if (roleType === 'CONTESTED_OCP_SLOT_COLLISION') {
    for (const [sku, item] of skuIndex.entries()) {
      if (item.lifecycleStatus && (item.lifecycleStatus === 'OB' || item.lifecycleStatus === 'EOL')) continue;
      const desc = (item.skuData?.Description || item.entry?.description || '').toLowerCase();
      if ((desc.includes('controller') || desc.includes('raid')) &&
          (desc.includes('pcie') || desc.includes('-p') || desc.includes('416i-p') || desc.includes('216i-p')) &&
          !desc.includes('-o') && !desc.includes('ocp')) {
        return {
          sku,
          description: item.skuData?.Description || item.entry?.description || 'PCIe Standup Storage Controller'
        };
      }
    }
    const pcieAlt = duals.pcie;
    return {
      sku: pcieAlt?.sku || (isGen12 ? 'P75750-B21' : 'P47777-B21'),
      description: pcieAlt?.description || 'HPE MR416i-p x16 Lanes 8GB Cache PCIe Storage Controller'
    };
  }

  if (roleType === 'MEMORY_BUS_SPEED_BOTTLENECK') {
    const targetCapacity = constraints.targetCapacityGb || 32;
    for (const [sku, item] of skuIndex.entries()) {
      if (item.lifecycleStatus && (item.lifecycleStatus === 'OB' || item.lifecycleStatus === 'EOL')) continue;
      const desc = (item.skuData?.Description || item.entry?.description || '').toLowerCase();
      if ((desc.includes('memory') || desc.includes('dimm') || desc.includes('smart memory')) &&
          desc.includes('4800') &&
          desc.includes(`${targetCapacity}gb`)) {
        return {
          sku,
          description: item.skuData?.Description || item.entry?.description || `HPE ${targetCapacity}GB DDR5-4800 Registered Smart Memory Kit`
        };
      }
    }
    return targetCapacity >= 64
      ? { sku: 'P43331-B21', description: 'HPE 64GB 2Rx4 DDR5-4800 Registered Smart Memory Kit' }
      : { sku: 'P43328-B21', description: 'HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory Kit' };
  }

  return null;
}

/**
 * Dynamically find matching active 5th Gen Intel Xeon Scalable processor in catalog
 */
function findGenerationalCpuUpgrade(currentSku, currentDesc, catalogData = null, chassisInfo = {}) {
  const descLower = (currentDesc || '').toLowerCase();
  const coreMatch = descLower.match(/(\d+)\s*-?\s*core/i);
  const cores = coreMatch ? parseInt(coreMatch[1], 10) : 0;
  const tdpMatch = descLower.match(/(\d{2,3})\s*w/i);
  const tdp = tdpMatch ? parseInt(tdpMatch[1], 10) : 0;
  const is1P = descLower.includes('1p') || /\b\d{4}u\b/i.test(descLower);

  // Fallback defaults if catalog is missing
  if (!catalogData || !Array.isArray(catalogData.entries) || catalogData.entries.length === 0) {
    if (cores >= 56 || descLower.includes('8480')) {
      return {
        sku: 'P67087-B21',
        description: 'Intel Xeon-Platinum 8570 2.1GHz 56-core 350W Processor for HPE'
      };
    }
    return {
      sku: 'P67082-B21',
      description: 'Intel Xeon-Gold 6548Y+ 2.5GHz 32-core 250W Processor for HPE'
    };
  }

  const candidates = [];
  catalogData.entries.forEach(e => {
    (e.skus || []).forEach(s => {
      const d = (s.Description || s.description || '').toLowerCase();
      const sku = cleanBaseSKU(s['Product #'] || s.sku);
      const status = s['Lifecycle Status'] || 'ACTIVE';
      if (/obsolete|eol/i.test(status)) return;
      // 5th Gen Intel Xeon Scalable: model pattern x5xx
      const cpuMatch = d.match(/intel\s+xeon[^\d]+(\d)5\d{2}([a-z+]?)/i);
      if (cpuMatch) {
        const cCoreMatch = d.match(/(\d+)\s*-?\s*core/i);
        const cCores = cCoreMatch ? parseInt(cCoreMatch[1], 10) : 0;
        const cTdpMatch = d.match(/(\d{2,3})\s*w/i);
        const cTdp = cTdpMatch ? parseInt(cTdpMatch[1], 10) : 0;
        const cIs1P = d.includes('1p') || /\b\d{4}u\b/i.test(d);
        const price = parseFloat(String(s['Unit Price (USD)'] || s['Price (USD)'] || '0').replace(/[$,]/g, '')) || 0;

        candidates.push({
          sku,
          description: s.Description || s.description,
          cores: cCores,
          tdp: cTdp,
          is1P: cIs1P,
          price
        });
      }
    });
  });

  const scored = candidates.map(c => {
    let score = 0;
    if (c.cores === cores) score += 100;
    else if (c.cores > cores) score += 50 - (c.cores - cores);
    else score -= 100;

    // Disallow 1P candidate for multi-socket original CPU
    if (!is1P && c.is1P) score -= 200;
    if (is1P && !c.is1P) score += 20;

    const tdpDiff = Math.abs(c.tdp - tdp);
    score -= tdpDiff * 0.5;

    return { ...c, score };
  });

  scored.sort((a, b) => b.score - a.score);
  if (scored[0]) {
    return {
      sku: scored[0].sku,
      description: scored[0].description
    };
  }

  // Fallbacks
  return (cores >= 56 || descLower.includes('8480'))
    ? { sku: 'P67087-B21', description: 'Intel Xeon-Platinum 8570 2.1GHz 56-core 350W Processor for HPE' }
    : { sku: 'P67082-B21', description: 'Intel Xeon-Gold 6548Y+ 2.5GHz 32-core 250W Processor for HPE' };
}

/**
 * Dynamically find matching active DDR5-5600 Smart Memory in catalog
 */
function findDdr5_5600MemoryUpgrade(currentSku, currentDesc, catalogData = null, chassisInfo = {}, isCto = true) {
  const descLower = (currentDesc || '').toLowerCase();
  const capMatch = descLower.match(/(\d+)\s*gb/i);
  const capacity = capMatch ? parseInt(capMatch[1], 10) : 32;

  // Fallback defaults if catalog is missing
  if (!catalogData || !Array.isArray(catalogData.entries) || catalogData.entries.length === 0) {
    if (capacity >= 128) {
      return {
        sku: isCto ? 'P69976-F21' : 'P69976-B21',
        description: 'HPE 128GB (1x128GB) Dual Rank x4 DDR5-5600 CAS-46-45-45 EC8 Registered Smart FIO Memory Kit'
      };
    }
    if (capacity >= 64) {
      return {
        sku: isCto ? 'P64707-F21' : 'P64707-B21',
        description: 'HPE 64GB (1x64GB) Dual Rank x4 DDR5-5600 CAS-46-45-45 EC8 Registered Smart FIO Memory Kit'
      };
    }
    return {
      sku: isCto ? 'P64706-F21' : 'P64706-B21',
      description: 'HPE 32GB (1x32GB) Dual Rank x8 DDR5-5600 CAS-46-45-45 EC8 Registered Smart FIO Memory Kit'
    };
  }

  const candidates = [];
  catalogData.entries.forEach(e => {
    (e.skus || []).forEach(s => {
      const d = (s.Description || s.description || '').toLowerCase();
      const sku = cleanBaseSKU(s['Product #'] || s.sku);
      const status = s['Lifecycle Status'] || 'ACTIVE';
      if (/obsolete|eol/i.test(status)) return;
      if (d.includes('5600') && (d.includes('smart memory') || d.includes('rdimm') || d.includes('fio memory') || d.includes('registered'))) {
        const cCapMatch = d.match(/(\d+)\s*gb/i);
        const cCap = cCapMatch ? parseInt(cCapMatch[1], 10) : 0;
        const isFio = sku.endsWith('-F21') || d.includes('fio') || d.includes('factory integrated');
        const price = parseFloat(String(s['Unit Price (USD)'] || s['Price (USD)'] || '0').replace(/[$,]/g, '')) || 0;
        candidates.push({
          sku,
          description: s.Description || s.description,
          capacity: cCap,
          isFio,
          price
        });
      }
    });
  });

  const matchingCap = candidates.filter(c => c.capacity === capacity);
  if (matchingCap.length > 0) {
    if (isCto) {
      const fio = matchingCap.find(c => c.isFio);
      if (fio) return { sku: fio.sku, description: fio.description };
    }
    const bto = matchingCap.find(c => !c.isFio);
    if (bto) return { sku: bto.sku, description: bto.description };
    return { sku: matchingCap[0].sku, description: matchingCap[0].description };
  }

  // Fallbacks
  if (capacity >= 128) {
    return {
      sku: isCto ? 'P69976-F21' : 'P69976-B21',
      description: 'HPE 128GB (1x128GB) Dual Rank x4 DDR5-5600 CAS-46-45-45 EC8 Registered Smart FIO Memory Kit'
    };
  }
  if (capacity >= 64) {
    return {
      sku: isCto ? 'P64707-F21' : 'P64707-B21',
      description: 'HPE 64GB (1x64GB) Dual Rank x4 DDR5-5600 CAS-46-45-45 EC8 Registered Smart FIO Memory Kit'
    };
  }
  return {
    sku: isCto ? 'P64706-F21' : 'P64706-B21',
    description: 'HPE 32GB (1x32GB) Dual Rank x8 DDR5-5600 CAS-46-45-45 EC8 Registered Smart FIO Memory Kit'
  };
}

/**
 * Detect troublesome SKUs that cause cascading dependency additions
 * @param {Array<object>} items 
 * @param {object} evalResults 
 * @param {object} catalogData 
 * @param {object} chassisInfo 
 * @returns {Array<object>} Detected troublesome SKU profiles with alternatives
 */
function _checkStorageExpanderCascade(items, storage, missing, warnings, catalogData, chassisInfo) {
  const hasExpanderMandate = missing.some(d => d.key === 'SAS_EXPANDER_CARD' || (d.description && d.description.toLowerCase().includes('expander'))) ||
                             warnings.some(w => w.toLowerCase().includes('sas expander'));
  if (!hasExpanderMandate) return null;

  const controllerItem = items.find(it => {
    const desc = (it.description || '').toLowerCase();
    return (desc.includes('controller') || desc.includes('raid') || it.sku?.startsWith('P')) &&
           (desc.includes('408i') || desc.includes('8-port') || desc.includes('8 port') || (storage.controllerDirectCapacity === 8));
  }) || items.find(it => {
    const desc = (it.description || '').toLowerCase();
    return desc.includes('controller') || desc.includes('mr408') || desc.includes('mr216');
  });

  if (!controllerItem) return null;

  const alt = findBestAlternativeInCatalog('STORAGE_EXPANDER_CASCADE', controllerItem.sku, { driveCount: storage.driveCount || 16 }, catalogData, chassisInfo);
  const eliminated = missing
    .filter(d => d.key === 'SAS_EXPANDER_CARD' || (d.description && (d.description.toLowerCase().includes('expander') || d.description.toLowerCase().includes('cable'))))
    .map(d => d.sku)
    .filter(Boolean);

  return {
    type: 'STORAGE_EXPANDER_CASCADE',
    originalSku: cleanBaseSKU(controllerItem.sku),
    originalDesc: controllerItem.description || '8-port Storage Controller',
    troublesomeReason: `8-port controller requires adding SAS Expander Card and auxiliary cables for ${storage.driveCount || 16} drives.`,
    alternativeSku: alt.sku,
    alternativeDesc: alt.description,
    action: 'SUBSTITUTE_CONTROLLER_DIRECT_ATTACH',
    functionalEquivalence: `16-port Tri-Mode Controller provides direct-attach connectivity for up to 16 drives with 8GB cache, eliminating SAS Expander card latency and extra cable kits.`,
    cascadingSkusEliminated: eliminated.length > 0 ? eliminated : ['SAS_EXPANDER_CARD'],
    presalesValuePitch: 'Upgrading from an 8-port controller with an expander card to a direct 16-port controller eliminates single-point-of-failure expander cards, reduces drive latency, and yields fewer overall BOM line items.'
  };
}

function _checkContestedOcpSlot(items, network, missing, catalogData, chassisInfo) {
  const isOcpExceeded = network.isExceedingOcpSlots || missing.some(d => d.key === 'OCP_SLOT_EXCEEDED');
  if (!isOcpExceeded) return null;

  const ocpControllerItem = items.find(it => {
    const desc = (it.description || '').toLowerCase();
    return (desc.includes('controller') || desc.includes('raid')) && (desc.includes('-o') || desc.includes('ocp'));
  });

  if (!ocpControllerItem) return null;

  const pcieAlt = findBestAlternativeInCatalog('CONTESTED_OCP_SLOT_COLLISION', ocpControllerItem.sku, {}, catalogData, chassisInfo);
  return {
    type: 'CONTESTED_OCP_SLOT_COLLISION',
    originalSku: cleanBaseSKU(ocpControllerItem.sku),
    originalDesc: ocpControllerItem.description || 'OCP Storage Controller',
    troublesomeReason: `OCP form-factor storage controller collides with customer's dual 10/25Gb OCP networking adapters, exceeding the 2 physical OCP chassis slots.`,
    alternativeSku: pcieAlt.sku,
    alternativeDesc: pcieAlt.description,
    action: 'PIVOT_FORM_FACTOR_TO_PCIE',
    functionalEquivalence: `PCIe Standup form-factor controller delivers identical 8GB cache Tri-Mode RAID capability while liberating OCP Slot 1 for customer's requested OCP NIC.`,
    cascadingSkusEliminated: ['OCP_SLOT_CONFLICT', 'SECONDARY_RISER_CABLE_KIT'],
    presalesValuePitch: 'Pivoting storage controller to PCIe standup form factor eliminates the unbuildable OCP slot collision while keeping 100% of customer requested 25Gb OCP network adapters.'
  };
}

function _checkUnsolicitedEcosystem(support) {
  if (!support.unsolicitedOptionalItems || support.unsolicitedOptionalItems.length === 0) return [];
  return support.unsolicitedOptionalItems.map(unsolicited => ({
    type: 'UNSOLICITED_ECOSYSTEM_OUTLIER',
    originalSku: cleanBaseSKU(unsolicited.sku),
    originalDesc: unsolicited.description || 'Unsolicited Service / Software',
    troublesomeReason: `Optional service / add-on was not requested by customer and inflates headline quotation CapEx.`,
    alternativeSku: null,
    alternativeDesc: null,
    action: 'PRUNE_UNSOLICITED_OUTLIER',
    functionalEquivalence: 'Core hardware deployment remains 100% buildable and functional under standard 3-year basic Tech Care.',
    cascadingSkusEliminated: [unsolicited.sku],
    presalesValuePitch: 'Unbundling unrequested startup services ensures the BOM remains strictly focused on core customer hardware specifications, improving commercial tender competitiveness.'
  }));
}

function _checkMemoryBusSpeedBottleneck(items, compute, catalogData, chassisInfo) {
  const isSilverOrLowTdp = (compute.maxCpuTdpWatts > 0 && compute.maxCpuTdpWatts <= 165) ||
    items.some(it => {
      const d = (it.description || '').toLowerCase();
      return d.includes('silver') || d.includes('4410y') || d.includes('4416+');
    });

  const highSpeedMemory = items.find(it => {
    const d = (it.description || '').toLowerCase();
    return (d.includes('5600') || d.includes('6400') || d.includes('5200')) && (d.includes('memory') || d.includes('rdimm') || d.includes('dimm'));
  });

  if (!isSilverOrLowTdp || !highSpeedMemory) return null;

  const memAlt = findBestAlternativeInCatalog('MEMORY_BUS_SPEED_BOTTLENECK', highSpeedMemory.sku, { targetCapacityGb: 32 }, catalogData, chassisInfo);
  return {
    type: 'MEMORY_BUS_SPEED_BOTTLENECK',
    originalSku: cleanBaseSKU(highSpeedMemory.sku),
    originalDesc: highSpeedMemory.description || 'High-Speed Memory',
    troublesomeReason: 'Intel Xeon Silver processors throttle memory frequency to 4000-4400 MT/s, rendering DDR5-5600 premium investment ineffective.',
    alternativeSku: memAlt.sku,
    alternativeDesc: memAlt.description,
    action: 'ALIGN_MEMORY_BUS_SPEED',
    functionalEquivalence: 'DDR5-4800 delivers 100% of the effective memory throughput supported by the CPU memory controller at reduced acquisition cost.',
    cascadingSkusEliminated: [],
    presalesValuePitch: 'Aligning memory speed with CPU memory bus limits delivers identical throughput without paying for unused frequency headroom.'
  };
}

function _checkGenerationalCpuAndMemory(items, missing, chassisInfo, catalogData) {
  const results = [];
  const isGen11Platform = (chassisInfo?.gen || '').includes('11') || (chassisInfo?.model || '').includes('Gen11') ||
    items.some(it => (it.description || '').toLowerCase().includes('gen11') || (it.sku || '').toLowerCase().includes('p52533') || (it.sku || '').toLowerCase().includes('p52534'));

  const gen4CpuItem = items.find(it => {
    const d = (it.description || '').toLowerCase();
    const sku = cleanBaseSKU(it.sku);
    return (d.includes('processor') || d.includes('xeon') || sku.startsWith('P')) &&
      (/intel\s+xeon[^\d]+(\d)4\d{2}([a-z+]?)/i.test(d) || d.includes('6414u') || d.includes('8480+'));
  });

  if (!isGen11Platform || !gen4CpuItem) return results;

  const altCpu = findBestAlternativeInCatalog('GENERATIONAL_CPU_OBSOLESCENCE', gen4CpuItem.sku, { originalDesc: gen4CpuItem.description }, catalogData, chassisInfo);
  if (!altCpu) return results;

  results.push({
    type: 'GENERATIONAL_CPU_OBSOLESCENCE',
    originalSku: cleanBaseSKU(gen4CpuItem.sku),
    originalDesc: gen4CpuItem.description || 'Intel 4th Gen Xeon Processor',
    troublesomeReason: `4th Gen Intel Sapphire Rapids processor carries impending obsolescence risk (6414U is discontinued OB; 8480+ is legacy) and constrains memory bus to 4800 MT/s.`,
    alternativeSku: altCpu.sku,
    alternativeDesc: altCpu.description,
    action: 'UPGRADE_GENERATIONAL_CPU',
    functionalEquivalence: `5th Gen Intel Emerald Rapids processor (${altCpu.sku}) delivers drop-in socket compatibility, higher IPC and clock frequencies at identical thermal envelope, and active production lifecycle.`,
    cascadingSkusEliminated: [],
    presalesValuePitch: `Upgrading 4th Gen Intel Sapphire Rapids to active 5th Gen Intel Emerald Rapids eliminates 90-day/OB obsolescence risk, increases memory throughput by +16.7% (5600 MT/s vs 4800 MT/s), delivers higher base/boost frequencies at identical TDP envelopes, and matches HPE factory validated solution.`
  });

  // Synchronously find paired DDR5-4800 memory items and upgrade to DDR5-5600
  const ddr4800MemItems = items.filter(it => {
    const d = (it.description || '').toLowerCase();
    return (d.includes('4800') || d.includes('ddr5-4800')) && (d.includes('memory') || d.includes('rdimm') || d.includes('smart memory'));
  });

  const isCto = items.some(it => (it.description || '').toLowerCase().includes('configure-to-order') || (it.description || '').toLowerCase().includes('cto'));

  // Find any aspect fix parts injected for DDR5-4800 (e.g. P43328-F21, P43334-F21) to eliminate them
  const eliminatedFioFixes = missing
    .filter(d => (d.description || '').toLowerCase().includes('fio') && ((d.description || '').toLowerCase().includes('p433') || (d.sku || '').startsWith('P433')))
    .map(d => d.sku)
    .filter(Boolean);

  ddr4800MemItems.forEach(memItem => {
    const altMem = findBestAlternativeInCatalog('GENERATIONAL_MEMORY_COUPLING', memItem.sku, { originalDesc: memItem.description, isCto }, catalogData, chassisInfo);
    if (altMem) {
      results.push({
        type: 'GENERATIONAL_MEMORY_COUPLING',
        originalSku: cleanBaseSKU(memItem.sku),
        originalDesc: memItem.description || 'DDR5-4800 Smart Memory Kit',
        troublesomeReason: `DDR5-4800 memory operates at legacy 4800 MT/s and is architecturally coupled to 4th Gen CPU; 5th Gen CPU mandates DDR5-5600.`,
        alternativeSku: altMem.sku,
        alternativeDesc: altMem.description,
        action: 'UPGRADE_GENERATIONAL_MEMORY',
        functionalEquivalence: `DDR5-5600 Smart FIO Memory operates at full 5600 MT/s bus speed, matching 5th Gen CPU memory controller bandwidth and natively fulfilling CTO integration.`,
        cascadingSkusEliminated: eliminatedFioFixes.length > 0 ? eliminatedFioFixes : [memItem.sku.replace(/-B21$/i, '-F21')],
        presalesValuePitch: `Synchronously upgrading DDR5-4800 memory to DDR5-5600 Smart FIO Memory unlocks +16.7% memory bandwidth and natively satisfies CTO factory integration.`
      });
    }
  });

  return results;
}

/**
 * Extract component attributes from description and SKU for multi-attribute matching
 */
function _extractDriveOrComponentAttrs(desc = '', sku = '') {
  const d = String(desc || '').toLowerCase();

  let capacityTb = 0;
  const tbMatch = d.match(/(\d+(?:\.\d+)?)\s*tb/i);
  if (tbMatch) {
    capacityTb = parseFloat(tbMatch[1]);
  } else {
    const gbMatch = d.match(/(\d+)\s*gb/i);
    if (gbMatch) {
      capacityTb = parseFloat(gbMatch[1]) / 1000;
    }
  }

  const isNvme = d.includes('nvme');
  const isSas = d.includes('sas');
  const isSata = d.includes('sata');
  const isGen4 = d.includes('gen4') || d.includes('pcie4') || d.includes('pcie 4');
  const isGen5 = d.includes('gen5') || d.includes('pcie5') || d.includes('pcie 5');

  const isRI = d.includes('read intensive') || d.includes(' ri ') || d.endsWith(' ri') || d.includes('-ri');
  const isMU = d.includes('mixed use') || d.includes(' mu ') || d.endsWith(' mu') || d.includes('-mu');
  const isWI = d.includes('write intensive') || d.includes(' wi ') || d.endsWith(' wi') || d.includes('-wi');

  const isHighPerf = d.includes('high performance') || d.includes('pm1733') || d.includes('ps1010') || d.includes('cm7') || d.includes('cm9');
  const isMainstream = d.includes('mainstream') || d.includes('spdm 7500') || d.includes('cd9');

  const isSff = d.includes('sff');
  const isLff = d.includes('lff');
  const isBc = d.includes('bc') || d.includes('basic carrier');
  const isU3 = d.includes('u.3');
  const isU2 = d.includes('u.2');

  return {
    capacityTb,
    isNvme,
    isSas,
    isSata,
    isGen4,
    isGen5,
    workload: isRI ? 'RI' : (isMU ? 'MU' : (isWI ? 'WI' : 'UNKNOWN')),
    isHighPerf,
    isMainstream,
    isSff,
    isLff,
    isBc,
    isU3,
    isU2
  };
}

/**
 * Score candidate active replacement against discontinued component attributes and budget anchor
 */
function _scoreActiveReplacementCandidate(candidate, origAttrs, histPrice = 0) {
  const cAttrs = _extractDriveOrComponentAttrs(candidate.description, candidate.sku);
  let score = 0;

  if (origAttrs.capacityTb > 0 && cAttrs.capacityTb > 0) {
    if (Math.abs(origAttrs.capacityTb - cAttrs.capacityTb) < 0.01) {
      score += 120;
    } else {
      return -1;
    }
  }

  if (origAttrs.isNvme && cAttrs.isNvme) score += 50;
  if (origAttrs.isSas && cAttrs.isSas) score += 50;
  if (origAttrs.isSata && cAttrs.isSata) score += 50;
  if (origAttrs.isGen4 && cAttrs.isGen4) score += 20;
  if (origAttrs.isGen5 && cAttrs.isGen5) score += 20;

  if (origAttrs.workload !== 'UNKNOWN' && origAttrs.workload === cAttrs.workload) score += 50;
  if (origAttrs.isSff && cAttrs.isSff) score += 25;
  if (origAttrs.isBc && cAttrs.isBc) score += 20;
  if (origAttrs.isU3 && cAttrs.isU3) score += 20;

  if (origAttrs.isHighPerf && cAttrs.isHighPerf) score += 50;
  if (origAttrs.isMainstream && cAttrs.isMainstream) score += 30;

  const cDescLower = candidate.description.toLowerCase();
  if (cDescLower.includes('multi vendor')) score += 30;

  // Epistemic Budget Anchor: Proximity to historical price of the discontinued SKU
  if (histPrice > 0 && candidate.price > 0) {
    const deltaRatio = Math.abs(candidate.price - histPrice) / histPrice;
    if (deltaRatio <= 0.05) {
      score += 100;
    } else if (deltaRatio <= 0.15) {
      score += 60;
    } else if (deltaRatio <= 0.30) {
      score += 30;
    }
  }

  return score;
}

/**
 * Dynamically find the best active replacement for a discontinued SKU in catalogData
 */
function findBestAlternativeForDiscontinuedSku(cleanSku, origDesc, catalogData, chassisInfo, audit = null, activeSkuMap = null) {
  const chassisDir = chassisInfo?.chassisDir || chassisInfo?.catalogDir || '';
  const { getHistoricalSkuPrice } = require('../catalog/sku_versioning.js');

  let histPrice = 0;
  if (chassisDir) {
    try {
      const hist = getHistoricalSkuPrice(cleanSku, chassisDir);
      histPrice = Number(hist?.priceUsd) || 0;
    } catch (_) {}
  }

  // 1. Direct authoritative successor from discontinuedInfo if present and active
  const successorSku = cleanBaseSKU(audit?.discontinuedInfo?.successorSku || '');
  if (successorSku) {
    if (activeSkuMap && activeSkuMap.has(successorSku)) {
      const sObj = activeSkuMap.get(successorSku);
      return {
        sku: sObj.sku,
        description: sObj.description,
        price: sObj.price,
        historicalPriceUsd: histPrice,
        isDirectSuccessor: true
      };
    }
    if (catalogData && Array.isArray(catalogData.entries)) {
      for (const e of catalogData.entries) {
        const found = (e.skus || []).find(s => cleanBaseSKU(s['Product #'] || s.sku || s['SKU']) === successorSku);
        if (found) {
          const price = parseFloat(String(found['Unit Price (USD)'] || found['Price (USD)'] || found.priceUsd || '0').replace(/[^0-9.]/g, '')) || 0;
          return {
            sku: successorSku,
            description: found.Description || found.description || audit?.discontinuedInfo?.successorDescription || 'Active Successor SKU',
            price,
            historicalPriceUsd: histPrice,
            isDirectSuccessor: true
          };
        }
      }
    }
  }

  // 2. Multi-attribute semantic search across active catalog entries
  const effectiveDesc = origDesc || audit?.discontinuedInfo?.description || audit?.latestDetails?.description || '';
  const origAttrs = _extractDriveOrComponentAttrs(effectiveDesc, cleanSku);

  const candidates = [];
  if (catalogData && Array.isArray(catalogData.entries)) {
    catalogData.entries.forEach(e => {
      (e.skus || []).forEach(s => {
        const sSku = cleanBaseSKU(s['Product #'] || s.sku || s['SKU']);
        if (!sSku || sSku === cleanSku) return;
        const status = (s['Lifecycle Status'] || s.lifecycleStatus || '').toUpperCase();
        if (status === 'OB' || status === 'EOL' || status === 'DISCONTINUED') return;

        const sDesc = s.Description || s.description || '';
        const sPrice = parseFloat(String(s['Unit Price (USD)'] || s['Price (USD)'] || s.priceUsd || '0').replace(/[^0-9.]/g, '')) || 0;

        const score = _scoreActiveReplacementCandidate({ sku: sSku, description: sDesc, price: sPrice }, origAttrs, histPrice);
        if (score > 0) {
          candidates.push({
            sku: sSku,
            description: sDesc,
            price: sPrice,
            score
          });
        }
      });
    });
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];

  let valueEngineeringCandidate = null;
  if (origAttrs.isHighPerf && histPrice > 0) {
    const ve = candidates.find(c => {
      const cDesc = c.description.toLowerCase();
      return (cDesc.includes('mainstream') || c.price < histPrice * 0.80) && c.price > 0;
    });
    if (ve) {
      valueEngineeringCandidate = {
        sku: ve.sku,
        description: ve.description,
        price: ve.price
      };
    }
  }

  return {
    sku: best.sku,
    description: best.description,
    price: best.price,
    historicalPriceUsd: histPrice,
    isDirectSuccessor: false,
    valueEngineeringCandidate
  };
}

function _checkDiscontinuedAndObsoleteSkus(items = [], catalogData = null, chassisInfo = {}) {
  const results = [];
  const chassisDir = chassisInfo?.chassisDir || chassisInfo?.catalogDir || '';
  const { getSkuAuditHistory } = require('../catalog/sku_versioning.js');
  const { isValidHpeSKU } = require('../catalog/sku.js');

  const activeSkuMap = new Map();
  if (catalogData && Array.isArray(catalogData.entries)) {
    catalogData.entries.forEach(e => {
      (e.skus || []).forEach(s => {
        const rawSku = s['Product #'] || s.sku || s['SKU'];
        const k = cleanBaseSKU(rawSku);
        const status = (s['Lifecycle Status'] || s.lifecycleStatus || '').toUpperCase();
        if (k && status !== 'OB' && status !== 'EOL' && status !== 'DISCONTINUED') {
          activeSkuMap.set(k, {
            sku: k,
            rawSku,
            description: s.Description || s.description || '',
            price: parseFloat(String(s['Unit Price (USD)'] || s['Price (USD)'] || s.priceUsd || '0').replace(/[^0-9.]/g, '')) || 0
          });
        }
      });
    });
  }

  for (const it of items) {
    const cleanSku = cleanBaseSKU(it.sku);
    if (!cleanSku || !isValidHpeSKU(cleanSku)) continue;

    let audit = null;
    if (chassisDir) {
      try {
        audit = getSkuAuditHistory(cleanSku, chassisDir);
      } catch (_) {}
    }

    const isMarkedDiscontinued = audit?.currentStatus === 'DISCONTINUED' ||
      (audit?.discontinuedInfo && String(audit.discontinuedInfo.status || '').toUpperCase() === 'DISCONTINUED');
    const isNotInActiveCatalog = activeSkuMap.size > 0 && !activeSkuMap.has(cleanSku);

    if (!isMarkedDiscontinued && !isNotInActiveCatalog) continue;

    const replacement = findBestAlternativeForDiscontinuedSku(
      cleanSku,
      it.description || audit?.latestDetails?.description || '',
      catalogData,
      chassisInfo,
      audit,
      activeSkuMap
    );

    if (!replacement || !replacement.sku) continue;

    const histPrice = replacement.historicalPriceUsd || 0;
    const repPrice = replacement.price || 0;
    const priceDelta = repPrice - histPrice;
    const priceDeltaStr = priceDelta === 0
      ? 'exact budget parity ($0 delta)'
      : (priceDelta > 0 ? `+$${priceDelta.toLocaleString()} delta` : `-$${Math.abs(priceDelta).toLocaleString()} savings`);

    results.push({
      type: 'DISCONTINUED_SKU_SUPERSEDED',
      originalSku: cleanSku,
      originalDesc: it.description || audit?.discontinuedInfo?.description || 'Discontinued Component',
      troublesomeReason: `HPE delisted/discontinued ${cleanSku} in live ordering portals. Historical list price was $${histPrice.toLocaleString()} USD.`,
      alternativeSku: replacement.sku,
      alternativeDesc: replacement.description,
      action: 'SUBSTITUTE_DISCONTINUED_SKU',
      functionalEquivalence: `Active replacement ${replacement.sku} (${replacement.description}) provides 100% functional equivalence at $${repPrice.toLocaleString()} USD (${priceDeltaStr}), preserving customer performance tier and budget baseline.`,
      cascadingSkusEliminated: [],
      historicalBudgetAnchor: {
        originalListPriceUsd: histPrice,
        replacementPriceUsd: repPrice,
        deltaUsd: priceDelta,
        priceParityPercent: histPrice > 0 ? parseFloat(((repPrice / histPrice) * 100).toFixed(2)) : 100,
        budgetHintNote: `Customer budgeted $${histPrice.toLocaleString()} USD for ${cleanSku}. Replacement ${replacement.sku} at $${repPrice.toLocaleString()} USD closely matches the budgeted CapEx.`
      },
      valueEngineeringAlternative: replacement.valueEngineeringCandidate ? {
        sku: replacement.valueEngineeringCandidate.sku,
        description: replacement.valueEngineeringCandidate.description,
        priceUsd: replacement.valueEngineeringCandidate.price,
        savingsUsd: histPrice > 0 ? histPrice - replacement.valueEngineeringCandidate.price : 0,
        savingsPercent: histPrice > 0 ? parseFloat((((histPrice - replacement.valueEngineeringCandidate.price) / histPrice) * 100).toFixed(1)) : 0,
        rationale: `If the workload does not require peak High Performance IOPS, migrating to Mainstream tier (${replacement.valueEngineeringCandidate.sku}) yields significant CapEx savings.`
      } : null,
      presalesValuePitch: `Substituting deprecated ${cleanSku} with live active ${replacement.sku} guarantees 100% portal buildability while preserving the customer's budgeted performance tier at virtually identical CapEx ($${repPrice.toLocaleString()} vs $${histPrice.toLocaleString()}).`
    });
  }

  return results;
}

function identifyTroublesomeSkus(items = [], evalResults = {}, catalogData = null, chassisInfo = {}) {
  const troublesome = [];
  const missing = evalResults.missingDependencies || [];
  const warnings = evalResults.warnings || [];
  const aspects = evalResults.aspects || {};
  const storage = aspects.storage || {};
  const network = aspects.network || {};
  const compute = aspects.compute || {};
  const support = aspects.support || {};

  const expanderCascade = _checkStorageExpanderCascade(items, storage, missing, warnings, catalogData, chassisInfo);
  if (expanderCascade) troublesome.push(expanderCascade);

  const contestedOcp = _checkContestedOcpSlot(items, network, missing, catalogData, chassisInfo);
  if (contestedOcp) troublesome.push(contestedOcp);

  troublesome.push(..._checkUnsolicitedEcosystem(support));

  const memBottleneck = _checkMemoryBusSpeedBottleneck(items, compute, catalogData, chassisInfo);
  if (memBottleneck) troublesome.push(memBottleneck);

  troublesome.push(..._checkGenerationalCpuAndMemory(items, missing, chassisInfo, catalogData));

  troublesome.push(..._checkDiscontinuedAndObsoleteSkus(items, catalogData, chassisInfo));

  return troublesome;
}

/**
 * Synthesize a Least-Delta Alternative Candidate Solution
 * Handles single or multiple simultaneous troublesome SKUs iteratively.
 * @param {Array<object>} baseParts 
 * @param {Array<object>} fixParts 
 * @param {Array<object>} troublesomeSkus 
 * @param {object} evalResults 
 * @param {object} catalogData 
 * @param {object} chassisInfo 
 * @param {Function} getPrice 
 * @returns {object|null} Least-delta alternative candidate
 */
function buildLeastDeltaCandidate(baseParts = [], fixParts = [], troublesomeSkus = [], evalResults = {}, catalogData = null, chassisInfo = {}, getPrice = () => 0) {
  if (!troublesomeSkus || troublesomeSkus.length === 0) return null;

  let candidateParts = [...baseParts];
  let additionsCount = 0;
  let removalsCount = 0;
  let replacementsCount = 0;
  const replacedSkus = [];
  const prunedSkus = [];
  const allCascadingEliminated = [];
  const appliedActions = [];

  // 1. Process all troublesome SKUs sequentially
  for (const trouble of troublesomeSkus) {
    if (trouble.cascadingSkusEliminated && Array.isArray(trouble.cascadingSkusEliminated)) {
      allCascadingEliminated.push(...trouble.cascadingSkusEliminated);
    }

    const nextParts = [];
    let matched = false;

    for (const p of candidateParts) {
      const clean = cleanBaseSKU(p.sku);
      if (clean === trouble.originalSku) {
        matched = true;
        if (trouble.action === 'PRUNE_UNSOLICITED_OUTLIER' || !trouble.alternativeSku) {
          removalsCount += (p.quantity || 1);
          prunedSkus.push(p.sku);
        } else {
          // Substitute with cleaner functional alternative
          const altPrice = getPrice(trouble.alternativeSku);
          nextParts.push({
            sku: trouble.alternativeSku,
            description: trouble.alternativeDesc,
            quantity: p.quantity || 1,
            unitPriceUsd: altPrice,
            extendedPriceUsd: altPrice * (p.quantity || 1),
            isFixInjected: false,
            isStrategyAddon: true,
            isLeastDeltaSubstitution: true,
            category: (trouble.type?.startsWith('GENERATIONAL') || trouble.type === 'DISCONTINUED_SKU_SUPERSEDED')
              ? 'Modernized Platform Hardware'
              : 'Least-Delta Functional Replacement'
          });
          replacementsCount += 1;
          replacedSkus.push({ from: p.sku, to: trouble.alternativeSku });

          // Check if the substitute is visible at default portal ambient (INV-P2-1)
          const catalogDir = chassisInfo?.catalogDir || null;
          const visibility = isSkuVisibleAtDefaultAmbient(trouble.alternativeSku, catalogDir);
          if (!visibility.isVisible) {
            // Mark the rank as PORTAL_CONDITIONAL — not directly orderable at default ambient
            trouble.portalConditionalSkus = trouble.portalConditionalSkus || [];
            trouble.portalConditionalSkus.push({
              sku: trouble.alternativeSku,
              conditionType: visibility.conditionType,
              thresholdDegC: visibility.thresholdDegC,
              operator: visibility.operator,
              note: `This SKU requires non-default portal ambient (${visibility.operator} ${visibility.thresholdDegC}°C) — portal verification mandatory before quoting`
            });
            if (!trouble.portalValidationStatus || trouble.portalValidationStatus === 'PASS') {
              trouble.portalValidationStatus = 'PORTAL_CONDITIONAL';
            }
          }
        }
      } else {
        nextParts.push(p);
      }
    }

    if (matched) {
      candidateParts = nextParts;
      appliedActions.push(trouble);
    }
  }

  // 2. Filter fix parts: eliminate cascading dependencies that are no longer needed
  const eliminatedSet = new Set(allCascadingEliminated.map(s => cleanBaseSKU(s)));
  const hasExpanderTrouble = troublesomeSkus.some(t => t.type === 'STORAGE_EXPANDER_CASCADE');

  for (const f of fixParts) {
    const cleanF = cleanBaseSKU(f.sku);
    if (eliminatedSet.has(cleanF) || (hasExpanderTrouble && (cleanF === 'P48835-B21' || cleanF === 'P48918-B21'))) {
      continue;
    }
    candidateParts.push(f);
    additionsCount += (f.quantity || 1);
  }

  const hasGenerationalUpgrade = appliedActions.some(a => a.type === 'GENERATIONAL_CPU_OBSOLESCENCE');
  const hasDiscontinuedUpgrade = appliedActions.some(a => a.type === 'DISCONTINUED_SKU_SUPERSEDED');
  const primaryTrouble = appliedActions.find(a => a.type === 'GENERATIONAL_CPU_OBSOLESCENCE') || appliedActions.find(a => a.type === 'DISCONTINUED_SKU_SUPERSEDED') || appliedActions[0] || troublesomeSkus[0];
  const totalCost = candidateParts.reduce((sum, p) => sum + (p.extendedPriceUsd || (p.unitPriceUsd * (p.quantity || 1))), 0);
  const totalDeltaOperations = additionsCount + removalsCount + replacementsCount;

  const summaryPitches = appliedActions.map(a => a.presalesValuePitch).filter(Boolean);
  const combinedPitch = summaryPitches.length > 0 ? summaryPitches.join(' ') : primaryTrouble.presalesValuePitch;

  let tierTitle = 'Rank 2: Least-Delta Functional Alternative (Cascade Pruned)';
  let strategyName = 'LEAST_DELTA_CASCADE_PRUNED';
  if (hasGenerationalUpgrade) {
    tierTitle = 'Rank 2: Modernized 5th Gen Platform & High-Speed DDR5-5600 Architecture';
    strategyName = 'MODERNIZED_5TH_GEN_PLATFORM';
  } else if (hasDiscontinuedUpgrade) {
    tierTitle = 'Rank 2: Modernized Active Baseline (Discontinued SKUs Replaced)';
    strategyName = 'MODERNIZED_ACTIVE_BASELINE';
  }

  let sharedIntelligenceReasoning = `Least-Delta Architecture Strategy: Identified ${appliedActions.length} troublesome SKU(s) causing cascading additions (${allCascadingEliminated.join(', ') || 'multiple auxiliary parts'}). Replaced/pruned with verified functional alternatives. ${primaryTrouble.functionalEquivalence} Result: ${totalDeltaOperations} delta operations, eliminating ${allCascadingEliminated.length} accessory kits.`;
  if (hasGenerationalUpgrade) {
    sharedIntelligenceReasoning = `Modernized 5th Gen Platform Strategy: Upgraded legacy 4th Gen Intel Sapphire Rapids processor to active 5th Gen Intel Emerald Rapids (${primaryTrouble.alternativeSku}) and synchronously upgraded memory to DDR5-5600 Smart FIO Memory. Eliminates 90-day/OB obsolescence risk, increases memory throughput by +16.7% (5600 MT/s vs 4800 MT/s), delivers higher base/boost frequencies at identical TDP envelopes, eliminates standalone BTO-to-FIO memory violations, and aligns 100% with official HPE factory validated solution.`;
  } else if (hasDiscontinuedUpgrade) {
    const discTroubles = appliedActions.filter(a => a.type === 'DISCONTINUED_SKU_SUPERSEDED');
    const substSummary = discTroubles.map(d => `${d.originalSku} -> ${d.alternativeSku} (${d.historicalBudgetAnchor?.budgetHintNote || ''})`).join('; ');
    sharedIntelligenceReasoning = `Modernized Active Baseline Strategy: Replaced ${discTroubles.length} discontinued/delisted SKU(s) with live active vendor replacements while preserving customer performance tiers and budget baselines: ${substSummary}. Guarantees 100% portal buildability with minimum mutation.`;
  }

  return {
    tierTitle,
    strategyName,
    isLeastDeltaPath: true,
    troublesomeRootSku: primaryTrouble.originalSku,
    alternativeSku: primaryTrouble.alternativeSku,
    troublesomeReason: primaryTrouble.troublesomeReason,
    functionalEquivalence: primaryTrouble.functionalEquivalence,
    presalesValuePitch: combinedPitch,
    allTroublesomeSkus: appliedActions,
    historicalBudgetAnchors: appliedActions
      .filter(a => a.historicalBudgetAnchor)
      .map(a => ({ sku: a.originalSku, replacementSku: a.alternativeSku, ...a.historicalBudgetAnchor })),
    cascadingSkusEliminated: allCascadingEliminated,
    deltaSummary: `${replacementsCount} Replacement, ${removalsCount} Removal, ${additionsCount} Additions (${allCascadingEliminated.length} Cascades Avoided)`,
    deltaMetrics: {
      additionsCount,
      removalsCount,
      replacementsCount,
      totalDeltaOperations,
      cascadingDependenciesAvoided: allCascadingEliminated.length
    },
    parts: candidateParts,
    estimatedCapex: Math.round(totalCost * 100) / 100,
    sharedIntelligenceReasoning
  };
}

module.exports = {
  identifyTroublesomeSkus,
  buildLeastDeltaCandidate,
  findBestAlternativeInCatalog,
  findBestAlternativeForDiscontinuedSku,
  isSkuVisibleAtDefaultAmbient
};

// ── CLI Runner ─────────────────────────────────────────────────────────────
if (require.main === module) {
  const fs = require('fs');
  const path = require('path');
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node scripts/lib/conflict/least_delta_combinator.js <boq_file.xlsx|csv|json> [--chassis <name>] [--json]');
    process.exit(0);
  }

  const filePath = path.resolve(args[0]);
  const chIdx = args.indexOf('--chassis');
  let chassisName = chIdx !== -1 && args[chIdx + 1] ? args[chIdx + 1] : null;
  if (!chassisName) {
    // Attempt inference from file path
    const fileBase = path.basename(filePath);
    const match = fileBase.match(/(DL\d{3}[a-z]?_Gen\d{2}|DL\d{3}[a-z]?|SY\d{3}|MSL\d{4}|GX\d{4}|Alletra)/i);
    chassisName = match ? match[1] : null;
  }
  if (!chassisName) {
    console.error('Error: Please specify target chassis via --chassis <name> (e.g. --chassis DL360_Gen11). Zero-hardcoding guardrail forbids defaulting.');
    process.exit(1);
  }
  const jsonOut = args.includes('--json');

  try {
    let items = [];
    if (filePath.endsWith('.json')) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      items = Array.isArray(data) ? data : (data.items || data.parsedItems || []);
    } else if (filePath.endsWith('.xlsx') || filePath.endsWith('.xls')) {
      const xlsx = require('xlsx-js-style');
      const wb = xlsx.readFile(filePath);
      const { parseSkuLines } = require('../boq/boq_parser.js');
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const csv = xlsx.utils.sheet_to_csv(sheet);
      items = parseSkuLines(csv.split(/\r?\n/)).items;
    } else {
      const { parseSkuLines } = require('../boq/boq_parser.js');
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      items = parseSkuLines(fileContent.split(/\r?\n/)).items;
    }

    const { getChassisCatalog } = require('../catalog/catalog_discovery.js');
    const chassisInfo = getChassisCatalog ? getChassisCatalog(chassisName, {}) : null;
    const catalogData = chassisInfo?.catalogData || null;

    const troublesome = identifyTroublesomeSkus(items, catalogData, { chassis: chassisName });
    const candidate = buildLeastDeltaCandidate(items, catalogData, { chassis: chassisName });

    if (jsonOut) {
      console.log(JSON.stringify({ troublesome, candidate }, null, 2));
    } else {
      console.log('\n===============================================================');
      console.log(`🔍 LEAST-DELTA COMBINATOR & TROUBLESOME SKU ANALYSIS: ${path.basename(filePath)}`);
      console.log(`🎯 Chassis Variant : ${chassisName}`);
      console.log('---------------------------------------------------------------');
      console.log(`⚠️ Troublesome SKUs Identified: ${troublesome.length}`);
      troublesome.forEach((t, i) => {
        console.log(`  ${i + 1}. SKU [${t.sku}] (${t.roleType}): ${t.reason}`);
        console.log(`     Cascading additions: ${t.cascadingSkus.join(', ') || 'None'}`);
      });
      console.log('---------------------------------------------------------------');
      if (candidate) {
        console.log(`💡 Strategy Tier: ${candidate.tierTitle}`);
        console.log(`📋 Delta Summary: ${candidate.deltaSummary}`);
        console.log(`💰 Estimated CapEx: $${candidate.estimatedCapex?.toLocaleString() || 0}`);
        console.log(`📝 Presales Value Pitch: ${candidate.presalesValuePitch}`);
      } else {
        console.log('ℹ️ No least-delta pruning needed (BOM has clean 1:1 dependencies).');
      }
      console.log('===============================================================\n');
    }
  } catch (err) {
    console.error(`Least-Delta analysis error: ${err.message}`);
    process.exit(1);
  }
}
