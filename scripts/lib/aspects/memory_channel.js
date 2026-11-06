'use strict';
/**
 * scripts/lib/aspects/memory_channel.js — Memory & Channel Symmetry Aspect Pre-Check
 */

const { cleanBaseSKU, buildCatalogSkuIndex, isOcaModifierTrackingRow } = require('../catalog/sku.js');
const { classifyComponentRole } = require('../catalog/product_meta.js');

function isDriveOrStorageItem(desc, role = '', catRole = '') {
  return (
    role.includes('Drive') ||
    role.includes('Storage') ||
    role === 'Boot Device' ||
    catRole.includes('Drive') ||
    catRole.includes('Storage') ||
    desc.includes('storage memory') ||
    desc.includes('flash memory') ||
    desc.includes('nvme') ||
    desc.includes('ssd') ||
    desc.includes('hdd') ||
    desc.includes('hard drive') ||
    desc.includes('solid state') ||
    desc.includes('storage drive') ||
    desc.includes('battery') ||
    desc.includes('capacitor') ||
    desc.includes('controller') ||
    desc.includes('dimm blank') ||
    desc.includes('memory blank')
  );
}

function isDdr4Token(desc) {
  return desc.includes('ddr4') || /\bpc4\b/i.test(desc) || desc.includes('pc4-') || desc.includes('pc4_');
}

function isDdr5Token(desc) {
  return desc.includes('ddr5') || /\bpc5\b/i.test(desc) || desc.includes('pc5-') || desc.includes('pc5_');
}

function _isCtoChassis(items, isCtoChassis) {
  if (isCtoChassis) return true;
  return items.some(it => {
    const desc = (it.description || '').toLowerCase();
    const opt = (it.optionType || '').toUpperCase();
    return desc.includes('configure-to-order') || desc.includes('cto') || opt === 'CTO';
  });
}

function _processMemoryLine(it, desc, rawSku, isDdr4, isDdr5, isCto, ctx) {
  const qty = it.quantity || 1;
  ctx.memoryCount += qty;
  ctx.memoryItems.push(it);

  if (isDdr4) ctx.hasDdr4Memory = true;
  if (isDdr5) ctx.hasDdr5Memory = true;

  const isLrdimm = desc.includes('lrdimm') || desc.includes('load-reduced') || desc.includes('load reduced');
  const isMrdimm = desc.includes('mrdimm') || desc.includes('multiplexed');
  const isRdimm = (desc.includes('rdimm') || desc.includes('registered')) && !isLrdimm && !isMrdimm;

  if (isRdimm) ctx.hasRdimm = true;
  if (isLrdimm) ctx.hasLrdimm = true;
  if (isMrdimm) ctx.hasMrdimm = true;

  const gbMatch = desc.match(/(\d+)\s*gb/i);
  if (gbMatch) {
    ctx.totalMemoryGb += (parseInt(gbMatch[1], 10) * qty);
  }

  // Check BTO (-B21) vs FIO (-F21) within CTO base models
  if (isCto && rawSku.endsWith('-B21') && !desc.includes('fio') && !desc.includes('factory integrated')) {
    const fioSku = rawSku.replace(/-B21$/i, '-F21');
    ctx.btoMemoryViolations.push({
      btoSku: rawSku,
      fioSku,
      description: it.description || 'HPE Smart Memory Kit',
      quantity: qty,
      reason: `CLIC Violation: Standalone BTO Memory SKU ${rawSku} is not allowed in a CTO Base Model. Must use Factory Integrated Option (FIO) SKU ${fioSku}.`
    });
  }
}

function _inspectMemoryOrCpuItem(it, skuIndex, isCto, hasExplicitCpuCount, ctx) {
  const desc = (it.description || '').toLowerCase();
  const rawSku = (it.sku || '').toUpperCase().trim();
  const cleanSku = cleanBaseSKU(it.sku);
  let role = classifyComponentRole('', desc);
  const catalogItem = skuIndex.get(cleanSku);
  if (catalogItem) {
    role = classifyComponentRole(catalogItem.parentCategory, desc);
  }
  const catRole = catalogItem?.skuData?.['Component Role'] || '';

  const isDriveOrStorage = isDriveOrStorageItem(desc, role, catRole);
  const isDdr4 = !isDriveOrStorage && isDdr4Token(desc);
  const isDdr5 = !isDriveOrStorage && isDdr5Token(desc);

  const isMemoryItem = !isDriveOrStorage && (
    role === 'Memory' ||
    desc.includes('memory') ||
    desc.includes('rdimm') ||
    desc.includes('lrdimm') ||
    desc.includes('mrdimm') ||
    desc.includes('smart kit') ||
    isDdr4 ||
    isDdr5
  );

  if (isMemoryItem) {
    _processMemoryLine(it, desc, rawSku, isDdr4, isDdr5, isCto, ctx);
    return 0;
  }

  const CPU_EXCLUSIONS = /heatsink|heat sink|fan|cable|baffle/i;
  const CPU_KEYWORDS = /processor|xeon|epyc|cpu/i;
  if (!hasExplicitCpuCount && CPU_KEYWORDS.test(desc) && !CPU_EXCLUSIONS.test(desc)) {
    return (it.quantity || 1);
  }
  return 0;
}

function _buildMemoryMetrics(ctx, cpuCount, chWidth) {
  const { memoryCount, totalMemoryGb, hasDdr4Memory, hasDdr5Memory, hasRdimm, hasLrdimm, hasMrdimm, btoMemoryViolations, memoryItems } = ctx;

  const dimmsPerCpu = cpuCount > 0 ? (memoryCount / cpuCount) : 0;
  const isSupportedPopulation = cpuCount > 0 && memoryCount > 0 && (memoryCount % cpuCount === 0) && [1, 2, 4, 6, 8, 12, 16].includes(dimmsPerCpu);
  const isBalancedChannel = cpuCount > 0 && memoryCount > 0 && (memoryCount % cpuCount === 0) && ((memoryCount / cpuCount) % chWidth === 0);
  const hasMixedDdrGeneration = hasDdr4Memory && hasDdr5Memory;
  const hasMixedMemoryTypes = (hasRdimm && (hasLrdimm || hasMrdimm)) || (hasLrdimm && hasMrdimm);
  const isInvalidChannelConfiguration = (memoryCount > 0 && cpuCount > 0 && !isSupportedPopulation) || (memoryCount > 0 && cpuCount === 0);
  const needsMemory = cpuCount > 0 && memoryCount === 0;

  return {
    cpuCount,
    memoryCount,
    totalMemoryGb,
    channelWidth: chWidth,
    channelsPerCpu: chWidth,
    dimmsPerCpu,
    isSupportedPopulation,
    isBalancedChannel,
    isInvalidChannelConfiguration,
    needsMemory,
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

function evalMemoryChannel(items, passedCpuCount = 0, catalogData = null, isCtoChassis = false, channelWidth = 8) {
  const chWidth = Math.max(1, parseInt(channelWidth, 10) || 8);
  const hasExplicitCpuCount = (typeof passedCpuCount === 'number' && passedCpuCount > 0);
  let cpuCount = hasExplicitCpuCount ? passedCpuCount : 0;
  const activeCatalog = (typeof passedCpuCount === 'object' && passedCpuCount !== null) ? passedCpuCount : catalogData;
  const skuIndex = buildCatalogSkuIndex(activeCatalog);
  const isCto = _isCtoChassis(items, isCtoChassis);

  const ctx = {
    memoryCount: 0,
    totalMemoryGb: 0,
    hasDdr4Memory: false,
    hasDdr5Memory: false,
    hasRdimm: false,
    hasLrdimm: false,
    hasMrdimm: false,
    btoMemoryViolations: [],
    memoryItems: []
  };

  for (const it of items) {
    if (isOcaModifierTrackingRow(it.sku, it.description)) continue;
    cpuCount += _inspectMemoryOrCpuItem(it, skuIndex, isCto, hasExplicitCpuCount, ctx);
  }

  return _buildMemoryMetrics(ctx, cpuCount, chWidth);
}

module.exports = {
  evalMemoryChannel
};

