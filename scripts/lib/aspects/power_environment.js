'use strict';
/**
 * scripts/lib/aspects/power_environment.js — Power & Environmental Aspect Pre-Check
 */

const { cleanBaseSKU } = require('../catalog/sku.js');
const { classifyComponentRole } = require('../catalog/product_meta.js');

function evalPowerEnvironment(items, catalogData = null, mandatorySkus = {}) {
  let hasDcPowerSupply = false;
  let hasDcLugKit = false;
  let psuCount = 0;

  const dcLugSku = cleanBaseSKU(mandatorySkus.DC_LUG_KIT?.sku || 'P36877-B21');

  for (const it of items) {
    const desc = (it.description || '').toLowerCase();
    const sku = cleanBaseSKU(it.sku);

    let role = classifyComponentRole('', desc);
    if (catalogData && catalogData.entries) {
      const match = catalogData.entries.find(e => e.skus && e.skus.find(s => cleanBaseSKU(s['Product #']) === cleanBaseSKU(it.sku)));
      if (match) role = classifyComponentRole(match.parentCategory, desc);
    }

    if (role === 'Power Supply' || desc.includes('power supply') || desc.includes('flex slot') || desc.includes('psu')) {
      psuCount += (it.quantity || 1);
      if (desc.includes('-48vdc') || desc.includes('dc power') || desc.includes('48v dc') || desc.includes('48vdc')) {
        hasDcPowerSupply = true;
      }
    }
    if (sku === dcLugSku || desc.includes('lug kit') || desc.includes('cable lug')) {
      hasDcLugKit = true;
    }
  }

  return { hasDcPowerSupply, hasDcLugKit, psuCount };
}

module.exports = {
  evalPowerEnvironment
};
