'use strict';
/**
 * scripts/lib/aspects/memory_channel.js — Memory & Channel Symmetry Aspect Pre-Check
 */

const { cleanBaseSKU } = require('../sku.js');
const { classifyComponentRole } = require('../product_meta.js');

function evalMemoryChannel(items, passedCpuCount = 0, catalogData = null) {
  let memoryCount = 0;
  let totalMemoryGb = 0;
  let cpuCount = passedCpuCount;

  for (const it of items) {
    const desc = (it.description || '').toLowerCase();
    let role = classifyComponentRole('', desc);
    if (catalogData && catalogData.entries) {
      const match = catalogData.entries.find(e => e.skus && e.skus.find(s => cleanBaseSKU(s['Product #']) === cleanBaseSKU(it.sku)));
      if (match) role = classifyComponentRole(match.parentCategory, desc);
    }

    if (role === 'Memory' || desc.includes('memory') || desc.includes('rdimm') || desc.includes('ddr5')) {
      memoryCount += (it.quantity || 1);
      const gbMatch = desc.match(/(\d+)\s*gb/i);
      if (gbMatch) {
        totalMemoryGb += (parseInt(gbMatch[1], 10) * (it.quantity || 1));
      }
    }
    if (!passedCpuCount && (desc.includes('processor') || desc.includes('xeon') || desc.includes('epyc'))) {
      cpuCount += (it.quantity || 1);
    }
  }

  if (cpuCount === 0) cpuCount = 2;

  const isBalancedChannel = memoryCount > 0 && (memoryCount % cpuCount === 0) && ((memoryCount / cpuCount) % 8 === 0);
  return { memoryCount, totalMemoryGb, isBalancedChannel };
}

module.exports = {
  evalMemoryChannel
};
