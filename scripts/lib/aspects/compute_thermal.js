'use strict';
/**
 * scripts/lib/aspects/compute_thermal.js — Compute & Thermal Aspect Pre-Check
 */

const { cleanBaseSKU } = require('../catalog/sku.js');
const { classifyComponentRole } = require('../catalog/product_meta.js');

function evalComputeThermal(items, catalogData = null, mandatorySkus = {}) {
  let cpuCount = 0;
  let maxCpuTdpWatts = 0;

  for (const it of items) {
    const desc = (it.description || '').toLowerCase();

    let role = classifyComponentRole('', desc);
    if (catalogData && catalogData.entries) {
      const match = catalogData.entries.find(e => e.skus && e.skus.find(s => cleanBaseSKU(s['Product #']) === cleanBaseSKU(it.sku)));
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
  }

  const highPerfFanSku = mandatorySkus.HIGH_PERF_FAN_KIT?.sku || 'P48820-B21';
  const highPerfHeatsinkSku = mandatorySkus.HIGH_PERF_HEATSINK?.sku || '';

  const hasHighPerfFans = items.some(it => cleanBaseSKU(it.sku) === cleanBaseSKU(highPerfFanSku));
  const hasHeatsinks = highPerfHeatsinkSku ? items.some(it => cleanBaseSKU(it.sku) === cleanBaseSKU(highPerfHeatsinkSku)) : true;

  return { cpuCount, maxCpuTdpWatts, hasHighPerfFans, hasHeatsinks };
}

module.exports = {
  evalComputeThermal
};
