'use strict';
/**
 * scripts/lib/aspects/compute_thermal.js — Compute & Thermal Aspect Pre-Check
 */

const { cleanBaseSKU } = require('../catalog/sku.js');
const { classifyComponentRole } = require('../catalog/product_meta.js');

function evalComputeThermal(items, catalogData = null, mandatorySkus = {}, serverCount = 1) {
  let cpuCount = 0;
  let maxCpuTdpWatts = 0;
  let fanKitCount = 0;

  for (const it of items) {
    const desc = (it.description || '').toLowerCase();
    const sku = cleanBaseSKU(it.sku);

    let role = classifyComponentRole('', desc);
    if (catalogData && catalogData.entries) {
      const match = catalogData.entries.find(e => e.skus && e.skus.find(s => cleanBaseSKU(s['Product #']) === sku));
      if (match) role = classifyComponentRole(match.parentCategory, desc);
    }

    if (role === 'Processor' || /^p\d{5}-b21$/i.test(it.sku)) {
      if (desc.includes('processor') || desc.includes('xeon') || desc.includes('epyc')) {
        cpuCount += (it.quantity || 1);
        const tdpMatch = desc.match(/(\d{2,3})\s*w/i);
        if (tdpMatch) {
          const tdp = parseInt(tdpMatch[1], 10);
          if (tdp > maxCpuTdpWatts) maxCpuTdpWatts = tdp;
        }
      }
    }

    // Description-primary fan kit detection: future Gen13+ fan kits with new SKUs
    // will still be detected as long as descriptions contain 'fan kit' or 'fan module'.
    // mandatorySkus.HIGH_PERF_FAN_KIT.sku is secondary reinforcement.
    const fanKitSku = cleanBaseSKU(mandatorySkus.HIGH_PERF_FAN_KIT?.sku || '');
    if (role === 'Fan Kit / Fan' || desc.includes('fan kit') || desc.includes('fan module') || desc.includes('high performance fan') || (fanKitSku && sku === fanKitSku)) {
      fanKitCount += (it.quantity || 1);
    }
  }

  const highPerfFanSku = mandatorySkus.HIGH_PERF_FAN_KIT?.sku || 'P48820-B21';
  const highPerfHeatsinkSku = mandatorySkus.HIGH_PERF_HEATSINK?.sku || '';

  const hasHighPerfFans = items.some(it => cleanBaseSKU(it.sku) === cleanBaseSKU(highPerfFanSku));
  const hasHeatsinks = highPerfHeatsinkSku ? items.some(it => cleanBaseSKU(it.sku) === cleanBaseSKU(highPerfHeatsinkSku)) : true;

  // CLIC Rule 81354654: Fan kit contains all 6 fans; maximum 1 fan kit allowed per base chassis
  const fanKitsPerServer = serverCount > 0 ? (fanKitCount / serverCount) : fanKitCount;
  const fanKitExceedsMax = fanKitsPerServer > 1;

  return {
    cpuCount,
    maxCpuTdpWatts,
    hasHighPerfFans,
    hasHeatsinks,
    fanKitCount,
    fanKitsPerServer,
    fanKitExceedsMax,
    highPerfFanSku,
    highPerfHeatsinkSku
  };
}

module.exports = {
  evalComputeThermal
};
