'use strict';
/**
 * scripts/lib/aspects/power_environment.js — Power & Environmental Aspect Pre-Check
 */

const { cleanBaseSKU, buildCatalogSkuIndex } = require('../catalog/sku.js');
const { classifyComponentRole } = require('../catalog/product_meta.js');

// GPU TDP lookup by description keyword (watts). Ordered by most-specific first.
// Source: NVIDIA product spec sheets (TDP at max boost).
const GPU_TDP_TABLE = [
  { keywords: ['h200'],  tdpW: 700 },
  { keywords: ['h100'],  tdpW: 700 },
  { keywords: ['a100'],  tdpW: 400 },
  { keywords: ['a800'],  tdpW: 400 },
  { keywords: ['l40s'],  tdpW: 350 },
  { keywords: ['a40'],   tdpW: 300 },
  { keywords: ['a30'],   tdpW: 165 },
  { keywords: ['l40 '],  tdpW: 300 }, // L40 (not L40S)
  { keywords: ['l4'],    tdpW: 72  },
  { keywords: ['a16'],   tdpW: 250 },
  { keywords: ['a2'],    tdpW: 60  },
  { keywords: ['rtx 6000'], tdpW: 300 },
  { keywords: ['rtx 4500'], tdpW: 210 },
];

/**
 * Estimate GPU TDP based on description keywords.
 * Returns watts; defaults to 300W if model not recognized.
 * @param {string} desc - Lowercase item description
 * @returns {number}
 */
function _estimateGpuTdpW(desc) {
  for (const entry of GPU_TDP_TABLE) {
    if (entry.keywords.some(kw => desc.includes(kw))) return entry.tdpW;
  }
  return 300; // Conservative default for unknown GPU models
}

function estimateSystemPowerWatts(it, desc, role) {
  let cpuWatts = 0;
  let gpuWatts = 0;
  let memWatts = 0;
  let storageWatts = 0;
  const qty = it.quantity || 1;

  if (role === 'Processor' || desc.includes('processor') || desc.includes('xeon') || desc.includes('epyc')) {
    const tdpMatch = desc.match(/(\d{2,3})\s*w/i);
    cpuWatts = (tdpMatch ? parseInt(tdpMatch[1], 10) : 205) * qty;
  }
  if (role === 'GPU / Accelerator' || desc.includes('nvidia') || desc.includes('a100') || desc.includes('l40s') || desc.includes('h100') || desc.includes('gpu')) {
    gpuWatts = _estimateGpuTdpW(desc) * qty;
  }
  if (role === 'Memory' || desc.includes('rdimm') || desc.includes('ddr5')) {
    memWatts = 8 * qty;
  }
  if ((role === 'Drive Cage / Drive' || desc.includes('ssd') || desc.includes('hdd') || desc.includes('nvme')) &&
      !desc.includes('cage') && !desc.includes('controller')) {
    storageWatts = 15 * qty;
  }
  return cpuWatts + gpuWatts + memWatts + storageWatts;
}

const DL380A_CHASSIS_SKUS = new Set(['P76706-B21']);
const DL145_CHASSIS_SKUS = new Set(['P71964-B21']);
const PLATINUM_PSU_SKUS = new Set(['P38997-B21']);
const TITANIUM_PSU_SKUS = new Set(['P44712-B21', 'P03178-B21']);
const CE_REMOVAL_SKUS = new Set(['P35876-B21']);

function parseDl380aGpuModeCapacity(desc) {
  if (!desc.includes('dl380a') || !desc.includes('fio configuration')) return 0;
  const match = desc.match(/(\d+)\s*(?:double[\s-]*wide|dw)\b/i);
  return match ? parseInt(match[1], 10) : 0;
}

function isGpuModeConfiguration(desc) {
  return parseDl380aGpuModeCapacity(desc) > 0;
}

function tallyChassisFormFactor(tally, it, desc, sku, role) {
  if (desc.includes('synergy') && desc.includes('12000') && (desc.includes('frame') || desc.includes('configure-to-order'))) {
    tally.isSynergy12000Frame = true;
  }
  if (DL380A_CHASSIS_SKUS.has(sku) || desc.includes('dl380a')) {
    tally.isDl380aGpuChassis = true;
    if (!desc.includes('fio configuration') && (DL380A_CHASSIS_SKUS.has(sku) || desc.includes('configure-to-order') || desc.includes('cto server'))) {
      tally.dl380aServerCount += (it.quantity || it.qty || 1);
    }
  }
  const gpuModeCapacity = parseDl380aGpuModeCapacity(desc);
  if (gpuModeCapacity > 0) {
    tally.hasDl380aDoubleWideGpu = true;
    tally.dl380aGpuModeCapacity = Math.max(tally.dl380aGpuModeCapacity, gpuModeCapacity);
  } else if (role === 'GPU / Accelerator' || desc.includes('gpu accelerator')) {
    tally.actualGpuCount += (it.quantity || it.qty || 1);
  }
  if (DL145_CHASSIS_SKUS.has(sku) || desc.includes('dl145')) {
    tally.isDl145EdgeChassis = true;
  }
}

function tallyPsuAndCabling(tally, it, desc, sku, role, dcLugSku) {
  if (role === 'Power Supply' || desc.includes('power supply') || desc.includes('flex slot') || desc.includes('psu')) {
    tally.psuCount += (it.quantity || it.qty || 1);
    const psuWMatch = desc.match(/(\d{3,4})\s*w/i);
    if (psuWMatch) {
      const w = parseInt(psuWMatch[1], 10);
      if (w > tally.maxPsuWattage) tally.maxPsuWattage = w;
      tally.psuWattages.add(w);
    }
    if (desc.includes('-48vdc') || desc.includes('dc power') || desc.includes('48v dc') || desc.includes('48vdc')) {
      tally.hasDcPowerSupply = true;
    }
    if (desc.includes('platinum') || PLATINUM_PSU_SKUS.has(sku)) {
      tally.hasPlatinumPsu = true;
    }
    if (desc.includes('titanium') || TITANIUM_PSU_SKUS.has(sku)) {
      tally.hasTitaniumPsu = true;
    }
    if (desc.includes('2650w') && desc.includes('titanium')) {
      tally.synergyTitanium2650wCount += (it.quantity || it.qty || 1);
    }
  }
  if (sku === dcLugSku || desc.includes('lug kit') || desc.includes('cable lug')) {
    tally.hasDcLugKit = true;
  }
  if (CE_REMOVAL_SKUS.has(sku) || desc.includes('ce mark removal') || desc.includes('ce mark')) {
    tally.hasCeRemovalKit = true;
  }
}

function tallyPowerHardware(tally, it, desc, sku, role, dcLugSku) {
  tallyChassisFormFactor(tally, it, desc, sku, role);
  tallyPsuAndCabling(tally, it, desc, sku, role, dcLugSku);
}

function getDl380aPsuRequirement(tally) {
  if (!tally.isDl380aGpuChassis) return { modeCapacity: 0, requiredCountPerServer: 0, requiredCount: 0 };
  const serverCount = Math.max(1, tally.dl380aServerCount);
  const modeCapacity = tally.dl380aGpuModeCapacity || Math.ceil(tally.actualGpuCount / serverCount);
  if (modeCapacity <= 0) return { modeCapacity: 0, requiredCountPerServer: 0, requiredCount: 0 };
  const requiredCountPerServer = modeCapacity > 4 ? 8 : 5;
  return { modeCapacity, requiredCountPerServer, requiredCount: requiredCountPerServer * serverCount };
}

function checkDl380aPsuCompliance(tally) {
  const requirement = getDl380aPsuRequirement(tally);
  const wattages = [...tally.psuWattages];
  const hasMixedWattages = wattages.length > 1;
  const hasSupportedWattage = wattages.length === 1 && (wattages[0] === 2400 || wattages[0] === 3200);
  return {
    ...requirement,
    hasMixedWattages,
    hasSupportedWattage,
    hasShortage: requirement.requiredCount > 0 && (
      tally.psuCount < requirement.requiredCount || !hasSupportedWattage || hasMixedWattages
    )
  };
}

function checkLot9CeRemovalNeeds(tally, estimatedNodeWattage) {
  return tally.hasPlatinumPsu && !tally.hasTitaniumPsu && estimatedNodeWattage >= 500 && !tally.hasCeRemovalKit;
}

function evalPowerEnvironment(items, catalogData = null, mandatorySkus = {}) {
  const tally = {
    hasDcPowerSupply: false,
    hasDcLugKit: false,
    hasPlatinumPsu: false,
    hasTitaniumPsu: false,
    hasCeRemovalKit: false,
    psuCount: 0,
    maxPsuWattage: 800,
    psuWattages: new Set(),
    isSynergy12000Frame: false,
    synergyTitanium2650wCount: 0,
    isDl380aGpuChassis: false,
    hasDl380aDoubleWideGpu: false,
    dl380aGpuModeCapacity: 0,
    dl380aServerCount: 0,
    actualGpuCount: 0,
    isDl145EdgeChassis: false
  };

  let totalHardwareWatts = 0;
  const dcLugSku = cleanBaseSKU(mandatorySkus.DC_LUG_KIT?.sku || 'P36877-B21');
  const skuIndex = buildCatalogSkuIndex(catalogData);

  for (const it of items) {
    const desc = (it.description || '').toLowerCase();
    const sku = cleanBaseSKU(it.sku);

    let role = classifyComponentRole('', desc);
    const catalogItem = skuIndex.get(sku);
    if (catalogItem) {
      role = classifyComponentRole(catalogItem.parentCategory, desc);
    }

    if (!isGpuModeConfiguration(desc)) {
      totalHardwareWatts += estimateSystemPowerWatts(it, desc, role);
    }
    tallyPowerHardware(tally, it, desc, sku, role, dcLugSku);
  }

  const estimatedNodeWattage = totalHardwareWatts + 150;
  const needsHighLine220v = estimatedNodeWattage > 800 && tally.maxPsuWattage >= 1600;
  const needsCeRemovalKit = checkLot9CeRemovalNeeds(tally, estimatedNodeWattage);
  const hasSynergyRedundantPowerError = tally.isSynergy12000Frame && tally.synergyTitanium2650wCount !== 6;
  const dl380aPsu = checkDl380aPsuCompliance(tally);

  return {
    hasDcPowerSupply: tally.hasDcPowerSupply,
    hasDcLugKit: tally.hasDcLugKit,
    hasPlatinumPsu: tally.hasPlatinumPsu,
    hasTitaniumPsu: tally.hasTitaniumPsu,
    hasCeRemovalKit: tally.hasCeRemovalKit,
    needsCeRemovalKit,
    psuCount: tally.psuCount,
    maxPsuWattage: tally.maxPsuWattage,
    estimatedNodeWattage,
    needsHighLine220v,
    isSynergy12000Frame: tally.isSynergy12000Frame,
    synergyTitanium2650wCount: tally.synergyTitanium2650wCount,
    hasSynergyRedundantPowerError,
    isDl380aGpuChassis: tally.isDl380aGpuChassis,
    dl380aGpuModeCapacity: dl380aPsu.modeCapacity,
    requiredDl380aPsuCountPerServer: dl380aPsu.requiredCountPerServer,
    requiredDl380aPsuCount: dl380aPsu.requiredCount,
    hasMixedPsuWattages: dl380aPsu.hasMixedWattages,
    hasSupportedDl380aPsuWattage: dl380aPsu.hasSupportedWattage,
    hasDl380aGpuPsuShortage: dl380aPsu.hasShortage,
    isDl145EdgeChassis: tally.isDl145EdgeChassis,
    hasDl145PsuOversizing: tally.isDl145EdgeChassis && tally.maxPsuWattage > 1000
  };
}

module.exports = {
  evalPowerEnvironment
};
