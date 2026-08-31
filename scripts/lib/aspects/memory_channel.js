'use strict';
/**
 * scripts/lib/aspects/memory_channel.js — Memory & Channel Symmetry Aspect Pre-Check
 */

const { cleanBaseSKU } = require('../catalog/sku.js');
const { classifyComponentRole } = require('../catalog/product_meta.js');

function evalMemoryChannel(items, passedCpuCount = 0, catalogData = null, isCtoChassis = false, channelWidth = 8) {
  const chWidth = Math.max(1, parseInt(channelWidth, 10) || 8);
  let memoryCount = 0;
  let totalMemoryGb = 0;
  let cpuCount = passedCpuCount;
  const btoMemoryViolations = [];
  const memoryItems = [];

  // Check if chassis in items is CTO if not explicitly passed
  const isCto = isCtoChassis || items.some(it => {
    const desc = (it.description || '').toLowerCase();
    const opt = (it.optionType || '').toUpperCase();
    return desc.includes('configure-to-order') || desc.includes('cto') || opt === 'CTO';
  });

  for (const it of items) {
    const desc = (it.description || '').toLowerCase();
    const rawSku = (it.sku || '').toUpperCase().trim();
    let role = classifyComponentRole('', desc);
    if (catalogData && catalogData.entries) {
      const match = catalogData.entries.find(e => e.skus && e.skus.find(s => cleanBaseSKU(s['Product #']) === cleanBaseSKU(it.sku)));
      if (match) role = classifyComponentRole(match.parentCategory, desc);
    }

    if (role === 'Memory' || desc.includes('memory') || desc.includes('rdimm') || desc.includes('ddr5')) {
      const qty = (it.quantity || 1);
      memoryCount += qty;
      memoryItems.push(it);

      const gbMatch = desc.match(/(\d+)\s*gb/i);
      if (gbMatch) {
        totalMemoryGb += (parseInt(gbMatch[1], 10) * qty);
      }

      // Check BTO (-B21) vs FIO (-F21) within CTO base models
      if (isCto && rawSku.endsWith('-B21') && !desc.includes('fio') && !desc.includes('factory integrated')) {
        const fioSku = rawSku.replace(/-B21$/i, '-F21');
        btoMemoryViolations.push({
          btoSku: rawSku,
          fioSku,
          description: it.description || 'HPE Smart Memory Kit',
          quantity: qty,
          reason: `CLIC Violation: Standalone BTO Memory SKU ${rawSku} is not allowed in a CTO Base Model. Must use Factory Integrated Option (FIO) SKU ${fioSku}.`
        });
      }
    }
    if (!passedCpuCount && (desc.includes('processor') || desc.includes('xeon') || desc.includes('epyc'))) {
      cpuCount += (it.quantity || 1);
    }
  }

  if (cpuCount === 0) cpuCount = 2;

  const isBalancedChannel = memoryCount > 0 && (memoryCount % cpuCount === 0) && ((memoryCount / cpuCount) % chWidth === 0);
  return {
    memoryCount,
    totalMemoryGb,
    channelsPerCpu: chWidth,
    isBalancedChannel,
    btoMemoryViolations,
    hasBtoMemoryInCto: btoMemoryViolations.length > 0,
    memoryItems
  };
}

module.exports = {
  evalMemoryChannel
};

