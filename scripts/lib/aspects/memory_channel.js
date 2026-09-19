'use strict';
/**
 * scripts/lib/aspects/memory_channel.js — Memory & Channel Symmetry Aspect Pre-Check
 */

const { cleanBaseSKU, buildCatalogSkuIndex } = require('../catalog/sku.js');
const { classifyComponentRole } = require('../catalog/product_meta.js');

function evalMemoryChannel(items, passedCpuCount = 0, catalogData = null, isCtoChassis = false, channelWidth = 8) {
  const chWidth = Math.max(1, parseInt(channelWidth, 10) || 8);
  let memoryCount = 0;
  let totalMemoryGb = 0;
  const hasExplicitCpuCount = (typeof passedCpuCount === 'number' && passedCpuCount > 0);
  let cpuCount = hasExplicitCpuCount ? passedCpuCount : 0;
  const activeCatalog = (typeof passedCpuCount === 'object' && passedCpuCount !== null) ? passedCpuCount : catalogData;
  let hasDdr4Memory = false;
  let hasDdr5Memory = false;
  let hasRdimm = false;
  let hasLrdimm = false;
  let hasMrdimm = false;
  const btoMemoryViolations = [];
  const memoryItems = [];
  const skuIndex = buildCatalogSkuIndex(activeCatalog);

  // Check if chassis in items is CTO if not explicitly passed
  const isCto = isCtoChassis || items.some(it => {
    const desc = (it.description || '').toLowerCase();
    const opt = (it.optionType || '').toUpperCase();
    return desc.includes('configure-to-order') || desc.includes('cto') || opt === 'CTO';
  });

  for (const it of items) {
    const desc = (it.description || '').toLowerCase();
    const rawSku = (it.sku || '').toUpperCase().trim();
    const cleanSku = cleanBaseSKU(it.sku);
    let role = classifyComponentRole('', desc);
    const catalogItem = skuIndex.get(cleanSku);
    if (catalogItem) {
      role = classifyComponentRole(catalogItem.parentCategory, desc);
    }

    if (role === 'Memory' || desc.includes('memory') || desc.includes('rdimm') || desc.includes('ddr5')) {
      const qty = (it.quantity || 1);
      memoryCount += qty;
      memoryItems.push(it);

      if (desc.includes('ddr4')) hasDdr4Memory = true;
      if (desc.includes('ddr5')) hasDdr5Memory = true;

      const isLrdimm = desc.includes('lrdimm') || desc.includes('load-reduced') || desc.includes('load reduced');
      const isMrdimm = desc.includes('mrdimm') || desc.includes('multiplexed');
      const isRdimm = (desc.includes('rdimm') || desc.includes('registered')) && !isLrdimm && !isMrdimm;
      if (isRdimm) hasRdimm = true;
      if (isLrdimm) hasLrdimm = true;
      if (isMrdimm) hasMrdimm = true;

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
    if (!hasExplicitCpuCount && (desc.includes('processor') || desc.includes('xeon') || desc.includes('epyc') || desc.includes('cpu'))) {
      if (!desc.includes('heatsink') && !desc.includes('heat sink') && !desc.includes('fan') && !desc.includes('cable')) {
        cpuCount += (it.quantity || 1);
      }
    }
  }

  if (cpuCount === 0) cpuCount = 2;

  const dimmsPerCpu = cpuCount > 0 ? (memoryCount / cpuCount) : 0;
  // Supported per-socket DIMM populations per Intel Xeon / AMD EPYC QuickSpecs: 1, 2, 4, 6, 8, 12, 16
  const isSupportedPopulation = memoryCount > 0 && (memoryCount % cpuCount === 0) && [1, 2, 4, 6, 8, 12, 16].includes(dimmsPerCpu);
  const isBalancedChannel = memoryCount > 0 && (memoryCount % cpuCount === 0) && ((memoryCount / cpuCount) % chWidth === 0);
  const hasMixedDdrGeneration = hasDdr4Memory && hasDdr5Memory;
  const hasMixedMemoryTypes = (hasRdimm && (hasLrdimm || hasMrdimm)) || (hasLrdimm && hasMrdimm);

  return {
    memoryCount,
    totalMemoryGb,
    channelsPerCpu: chWidth,
    dimmsPerCpu,
    isSupportedPopulation,
    isBalancedChannel,
    btoMemoryViolations,
    hasBtoMemoryInCto: btoMemoryViolations.length > 0,
    hasDdr4Memory,
    hasDdr5Memory,
    hasMixedDdrGeneration,
    hasRdimm,
    hasLrdimm,
    hasMrdimm,
    hasMixedMemoryTypes,
    memoryItems
  };
}

module.exports = {
  evalMemoryChannel
};

