'use strict';
/**
 * scripts/lib/aspects/power_environment.js — Power & Environmental Aspect Pre-Check
 */

const { cleanBaseSKU } = require('../catalog/sku.js');
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

function evalPowerEnvironment(items, catalogData = null, mandatorySkus = {}) {
  let hasDcPowerSupply = false;
  let hasDcLugKit = false;
  let hasPlatinumPsu = false;
  let hasTitaniumPsu = false;
  let hasCeRemovalKit = false;
  let psuCount = 0;
  let maxPsuWattage = 800;

  // Synergy Frame Power
  let isSynergy12000Frame = false;
  let synergyTitanium2650wCount = 0;
  let hasSynergyRedundantPowerError = false;
  let estimatedCpuWatts = 0;
  let estimatedGpuWatts = 0;
  let estimatedMemoryWatts = 0;
  let estimatedStorageWatts = 0;
  let isDl380aGpuChassis = false;
  let hasDl380aDoubleWideGpu = false;
  let isDl145EdgeChassis = false;

  const dcLugSku = cleanBaseSKU(mandatorySkus.DC_LUG_KIT?.sku || 'P36877-B21');

  for (const it of items) {
    const desc = (it.description || '').toLowerCase();
    const sku = cleanBaseSKU(it.sku);

    let role = classifyComponentRole('', desc);
    if (catalogData && catalogData.entries) {
      const match = catalogData.entries.find(e => e.skus && e.skus.find(s => cleanBaseSKU(s['Product #']) === cleanBaseSKU(it.sku)));
      if (match) role = classifyComponentRole(match.parentCategory, desc);
    }

    if (role === 'Processor' || desc.includes('processor') || desc.includes('xeon') || desc.includes('epyc')) {
      const tdpMatch = desc.match(/(\d{2,3})\s*w/i);
      const tdp = tdpMatch ? parseInt(tdpMatch[1], 10) : 205;
      estimatedCpuWatts += (tdp * (it.quantity || 1));
    }

    if (role === 'GPU / Accelerator' || desc.includes('nvidia') || desc.includes('a100') || desc.includes('l40s') || desc.includes('h100') || desc.includes('gpu')) {
      const gpuTdp = _estimateGpuTdpW(desc);
      estimatedGpuWatts += (gpuTdp * (it.quantity || 1));
    }

    if (role === 'Memory' || desc.includes('rdimm') || desc.includes('ddr5')) {
      estimatedMemoryWatts += (8 * (it.quantity || 1));
    }

    if (role === 'Drive Cage / Drive' || desc.includes('ssd') || desc.includes('hdd') || desc.includes('nvme')) {
      if (!desc.includes('cage') && !desc.includes('controller')) {
        estimatedStorageWatts += (15 * (it.quantity || 1));
      }
    }

    if (desc.includes('synergy') && desc.includes('12000') && (desc.includes('frame') || desc.includes('configure-to-order'))) {
      isSynergy12000Frame = true;
    }

    // DL380a GPU chassis detection
    if (sku === 'P76706-B21' || desc.includes('dl380a')) {
      isDl380aGpuChassis = true;
    }
    if (sku === 'P75008-B21' || sku === 'P75002-B21' || (desc.includes('double-wide') && desc.includes('gpu'))) {
      hasDl380aDoubleWideGpu = true;
    }
    // DL145 edge chassis detection
    if (sku === 'P71964-B21' || desc.includes('dl145')) {
      isDl145EdgeChassis = true;
    }

    if (role === 'Power Supply' || desc.includes('power supply') || desc.includes('flex slot') || desc.includes('psu')) {
      psuCount += (it.quantity || 1);
      const psuWMatch = desc.match(/(\d{3,4})\s*w/i);
      if (psuWMatch) {
        const w = parseInt(psuWMatch[1], 10);
        if (w > maxPsuWattage) maxPsuWattage = w;
      }
      if (desc.includes('-48vdc') || desc.includes('dc power') || desc.includes('48v dc') || desc.includes('48vdc')) {
        hasDcPowerSupply = true;
      }
      if (desc.includes('platinum') || sku === 'P38997-B21') {
        hasPlatinumPsu = true;
      }
      if (desc.includes('titanium') || sku === 'P44712-B21' || sku === 'P03178-B21') {
        hasTitaniumPsu = true;
      }
      if (desc.includes('2650w') && desc.includes('titanium')) {
        synergyTitanium2650wCount += (it.quantity || 1);
      }
    }
    if (sku === dcLugSku || desc.includes('lug kit') || desc.includes('cable lug')) {
      hasDcLugKit = true;
    }
    if (sku === 'P35876-B21' || desc.includes('ce mark removal') || desc.includes('ce mark')) {
      hasCeRemovalKit = true;
    }
  }

  // Estimated node power draw (including 150W baseboard + fans)
  const estimatedNodeWattage = estimatedCpuWatts + estimatedGpuWatts + estimatedMemoryWatts + estimatedStorageWatts + 150;
  // High-line 220V Advisory: High-capacity PSUs (>=1600W) derate to 800W on 110V low-line power.
  // If estimated draw exceeds 800W, 200V-240V utility circuits are strongly advised.
  const needsHighLine220v = estimatedNodeWattage > 800 && maxPsuWattage >= 1600;

  // EU Ecodesign Regulation 2019/424 (ErP Lot 9) Rule:
  // High-draw dual-socket configurations with Platinum PSUs require Titanium PSUs (96% efficiency) or P35876-B21 CE Mark Removal Kit for non-EU deployment.
  const needsCeRemovalKit = hasPlatinumPsu && !hasTitaniumPsu && estimatedNodeWattage >= 500 && !hasCeRemovalKit;

  // Synergy Frame Redundant Power Supply Rule
  if (isSynergy12000Frame) {
    if (synergyTitanium2650wCount !== 6) {
      hasSynergyRedundantPowerError = true;
    }
  }

  return {
    hasDcPowerSupply,
    hasDcLugKit,
    hasPlatinumPsu,
    hasTitaniumPsu,
    hasCeRemovalKit,
    needsCeRemovalKit,
    psuCount,
    maxPsuWattage,
    estimatedNodeWattage,
    needsHighLine220v,
    isSynergy12000Frame,
    synergyTitanium2650wCount,
    hasSynergyRedundantPowerError,
    // DL380a GPU Power Mandate (Rule 81017083): Min 5x 2400W Titanium when double-wide GPUs present
    isDl380aGpuChassis,
    hasDl380aGpuPsuShortage: isDl380aGpuChassis && hasDl380aDoubleWideGpu && (psuCount < 5 || maxPsuWattage < 2400 || !hasTitaniumPsu),
    // DL145 Edge PSU Profile: Max 1000W, 1600W+ PSUs are physically incompatible
    isDl145EdgeChassis,
    hasDl145PsuOversizing: isDl145EdgeChassis && maxPsuWattage > 1000
  };
}

module.exports = {
  evalPowerEnvironment
};
