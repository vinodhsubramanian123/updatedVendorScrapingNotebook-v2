'use strict';
/**
 * scripts/lib/aspects/power_environment.js — Power & Environmental Aspect Pre-Check
 */

const { cleanBaseSKU } = require('../catalog/sku.js');
const { classifyComponentRole } = require('../catalog/product_meta.js');

function evalPowerEnvironment(items, catalogData = null, mandatorySkus = {}) {
  let hasDcPowerSupply = false;
  let hasDcLugKit = false;
  let hasPlatinumPsu = false;
  let hasTitaniumPsu = false;
  let hasCeRemovalKit = false;
  let psuCount = 0;
  let maxPsuWattage = 800;
  let estimatedCpuWatts = 0;
  let estimatedGpuWatts = 0;
  let estimatedMemoryWatts = 0;
  let estimatedStorageWatts = 0;

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
      estimatedGpuWatts += (300 * (it.quantity || 1));
    }

    if (role === 'Memory' || desc.includes('rdimm') || desc.includes('ddr5')) {
      estimatedMemoryWatts += (8 * (it.quantity || 1));
    }

    if (role === 'Drive Cage / Drive' || desc.includes('ssd') || desc.includes('hdd') || desc.includes('nvme')) {
      if (!desc.includes('cage') && !desc.includes('controller')) {
        estimatedStorageWatts += (15 * (it.quantity || 1));
      }
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
    needsHighLine220v
  };
}

module.exports = {
  evalPowerEnvironment
};
