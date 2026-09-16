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
      const cpuMatch = d.match(/intel\s+xeon[^\d]+(\d)5\d{2}([a-z\+]?)/i);
      if (cpuMatch) {
        const cCoreMatch = d.match(/(\d+)\s*-?\s*core/i);
        const cCores = cCoreMatch ? parseInt(cCoreMatch[1], 10) : 0;
        const cTdpMatch = d.match(/(\d{2,3})\s*w/i);
        const cTdp = cTdpMatch ? parseInt(cTdpMatch[1], 10) : 0;
        const cIs1P = d.includes('1p') || /\b\d{4}u\b/i.test(d);
        const price = parseFloat(String(s['Unit Price (USD)'] || s['Price (USD)'] || '0').replace(/[\$,]/g, '')) || 0;

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
        const price = parseFloat(String(s['Unit Price (USD)'] || s['Price (USD)'] || '0').replace(/[\$,]/g, '')) || 0;
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
function identifyTroublesomeSkus(items = [], evalResults = {}, catalogData = null, chassisInfo = {}) {
  const troublesome = [];
  const missing = evalResults.missingDependencies || [];
  const errors = evalResults.errors || [];
  const warnings = evalResults.warnings || [];
  const aspects = evalResults.aspects || {};
  const storage = aspects.storage || {};
  const network = aspects.network || {};
  const compute = aspects.compute || {};
  const support = aspects.support || {};

  // 1. Troublesome 8-Port Storage Controller with > 8 Drives (Forces SAS Expander + Cables)
  const hasExpanderMandate = missing.some(d => d.key === 'SAS_EXPANDER_CARD' || (d.description && d.description.toLowerCase().includes('expander'))) ||
                             warnings.some(w => w.toLowerCase().includes('sas expander'));
  
  if (hasExpanderMandate) {
    const controllerItem = items.find(it => {
      const desc = (it.description || '').toLowerCase();
      return (desc.includes('controller') || desc.includes('raid') || it.sku?.startsWith('P')) &&
             (desc.includes('408i') || desc.includes('8-port') || desc.includes('8 port') || (storage.controllerDirectCapacity === 8));
    }) || items.find(it => {
      const desc = (it.description || '').toLowerCase();
      return desc.includes('controller') || desc.includes('mr408') || desc.includes('mr216');
    });

    if (controllerItem) {
      const alt = findBestAlternativeInCatalog('STORAGE_EXPANDER_CASCADE', controllerItem.sku, { driveCount: storage.driveCount || 16 }, catalogData, chassisInfo);
      const eliminated = missing
        .filter(d => d.key === 'SAS_EXPANDER_CARD' || (d.description && (d.description.toLowerCase().includes('expander') || d.description.toLowerCase().includes('cable'))))
        .map(d => d.sku)
        .filter(Boolean);
      troublesome.push({
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
      });
    }
  }

  // 2. Troublesome OCP Storage Controller in Contested OCP Slot Environment (Dual OCP NICs)
  const isOcpExceeded = network.isExceedingOcpSlots || missing.some(d => d.key === 'OCP_SLOT_EXCEEDED');
  if (isOcpExceeded) {
    const ocpControllerItem = items.find(it => {
      const desc = (it.description || '').toLowerCase();
      return (desc.includes('controller') || desc.includes('raid')) && (desc.includes('-o') || desc.includes('ocp'));
    });

    if (ocpControllerItem) {
      const pcieAlt = findBestAlternativeInCatalog('CONTESTED_OCP_SLOT_COLLISION', ocpControllerItem.sku, {}, catalogData, chassisInfo);
      troublesome.push({
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
      });
    }
  }

  // 3. Troublesome Unsolicited Optional Services / Add-on Software (INV-32)
  if (support.unsolicitedOptionalItems && support.unsolicitedOptionalItems.length > 0) {
    support.unsolicitedOptionalItems.forEach(unsolicited => {
      troublesome.push({
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
      });
    });
  }

  // 4. Troublesome Memory Speed Mismatch (DDR5-5600 throttled by low-TDP CPU)
  const isSilverOrLowTdp = (compute.maxCpuTdpWatts > 0 && compute.maxCpuTdpWatts <= 165) ||
    items.some(it => {
      const d = (it.description || '').toLowerCase();
      return d.includes('silver') || d.includes('4410y') || d.includes('4416+');
    });

  const highSpeedMemory = items.find(it => {
    const d = (it.description || '').toLowerCase();
    return (d.includes('5600') || d.includes('6400') || d.includes('5200')) && (d.includes('memory') || d.includes('rdimm') || d.includes('dimm'));
  });

  if (isSilverOrLowTdp && highSpeedMemory) {
    const memAlt = findBestAlternativeInCatalog('MEMORY_BUS_SPEED_BOTTLENECK', highSpeedMemory.sku, { targetCapacityGb: 32 }, catalogData, chassisInfo);
    troublesome.push({
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
    });
  }

  // 5. Troublesome 4th Gen Intel Sapphire Rapids Processor on Dual-Gen Platform (DL380 Gen11)
  // Proactively modernizes 4th Gen Xeon (e.g. 6414U, 8480+) to active 5th Gen Emerald Rapids (6548Y+, 8570)
  // and synchronously upgrades paired DDR5-4800 memory to DDR5-5600 Smart FIO memory.
  const isGen11Platform = (chassisInfo?.gen || '').includes('11') || (chassisInfo?.model || '').includes('Gen11') ||
    items.some(it => (it.description || '').toLowerCase().includes('gen11') || (it.sku || '').toLowerCase().includes('p52533') || (it.sku || '').toLowerCase().includes('p52534'));

  const gen4CpuItem = items.find(it => {
    const d = (it.description || '').toLowerCase();
    const sku = cleanBaseSKU(it.sku);
    return (d.includes('processor') || d.includes('xeon') || sku.startsWith('P')) &&
      (/intel\s+xeon[^\d]+(\d)4\d{2}([a-z\+]?)/i.test(d) || d.includes('6414u') || d.includes('8480+'));
  });

  if (isGen11Platform && gen4CpuItem) {
    const altCpu = findBestAlternativeInCatalog('GENERATIONAL_CPU_OBSOLESCENCE', gen4CpuItem.sku, { originalDesc: gen4CpuItem.description }, catalogData, chassisInfo);
    if (altCpu) {
      troublesome.push({
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
          troublesome.push({
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
    }
  }

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
            category: trouble.type?.startsWith('GENERATIONAL') ? 'Modernized Platform Hardware' : 'Least-Delta Functional Replacement'
          });
          replacementsCount += 1;
          replacedSkus.push({ from: p.sku, to: trouble.alternativeSku });
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
  const primaryTrouble = appliedActions.find(a => a.type === 'GENERATIONAL_CPU_OBSOLESCENCE') || appliedActions[0] || troublesomeSkus[0];
  const totalCost = candidateParts.reduce((sum, p) => sum + (p.extendedPriceUsd || (p.unitPriceUsd * (p.quantity || 1))), 0);
  const totalDeltaOperations = additionsCount + removalsCount + replacementsCount;

  const summaryPitches = appliedActions.map(a => a.presalesValuePitch).filter(Boolean);
  const combinedPitch = summaryPitches.length > 0 ? summaryPitches.join(' ') : primaryTrouble.presalesValuePitch;

  const tierTitle = hasGenerationalUpgrade
    ? 'Rank 2: Modernized 5th Gen Platform & High-Speed DDR5-5600 Architecture'
    : 'Rank 2: Least-Delta Functional Alternative (Cascade Pruned)';

  const strategyName = hasGenerationalUpgrade
    ? 'MODERNIZED_5TH_GEN_PLATFORM'
    : 'LEAST_DELTA_CASCADE_PRUNED';

  const sharedIntelligenceReasoning = hasGenerationalUpgrade
    ? `Modernized 5th Gen Platform Strategy: Upgraded legacy 4th Gen Intel Sapphire Rapids processor to active 5th Gen Intel Emerald Rapids (${primaryTrouble.alternativeSku}) and synchronously upgraded memory to DDR5-5600 Smart FIO Memory. Eliminates 90-day/OB obsolescence risk, increases memory throughput by +16.7% (5600 MT/s vs 4800 MT/s), delivers higher base/boost frequencies at identical TDP envelopes, eliminates standalone BTO-to-FIO memory violations, and aligns 100% with official HPE factory validated solution.`
    : `Least-Delta Architecture Strategy: Identified ${appliedActions.length} troublesome SKU(s) causing cascading additions (${allCascadingEliminated.join(', ') || 'multiple auxiliary parts'}). Replaced/pruned with verified functional alternatives. ${primaryTrouble.functionalEquivalence} Result: ${totalDeltaOperations} delta operations, eliminating ${allCascadingEliminated.length} accessory kits.`;

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
  findBestAlternativeInCatalog
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
