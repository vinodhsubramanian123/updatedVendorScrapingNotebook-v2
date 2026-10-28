'use strict';
/**
 * scripts/lib/aspects/compute_thermal.js — Compute & Thermal Aspect Pre-Check
 */

const { cleanBaseSKU, buildCatalogSkuIndex, isOcaModifierTrackingRow } = require('../catalog/sku.js');
const { classifyComponentRole } = require('../catalog/product_meta.js');

function isHeatsinkItem(it, skuIndex = null, highPerfHeatsinkSku = '') {
  if (isOcaModifierTrackingRow(it.sku, it.description)) return false;
  const sku = cleanBaseSKU(it.sku);
  const d = (it.description || '').toLowerCase();
  if (d.includes('power supply') || d.includes('flex slot') || d.includes('platinum')) return false;
  // Exclude plastic air baffles, cable guides, blanks, brackets, ducting, and cable kits
  if (d.includes('baffle') || d.includes('guide') || d.includes('blank') || d.includes('bracket') || d.includes('duct') || d.includes('cable') || d.includes('cbl')) return false;
  if (highPerfHeatsinkSku && sku === cleanBaseSKU(highPerfHeatsinkSku)) return true;
  if (['P74792-B21', 'P74794-B21', 'P49145-B21', 'P48818-B21', 'P58459-B21', 'P48809-B21', 'P74787-B21', 'P48817-B21', 'P48905-B21', 'P58458-B21', 'P58460-B21'].includes(sku)) return true;
  if (d.includes('heat sink') || d.includes('heatsink') || classifyComponentRole('', d) === 'Heatsink') return true;
  const catItem = skuIndex ? skuIndex.get(sku) : null;
  if (catItem) {
    const catDesc = (catItem.skuData?.Description || '').toLowerCase();
    if (catDesc.includes('baffle') || catDesc.includes('guide') || catDesc.includes('blank') || catDesc.includes('bracket') || catDesc.includes('duct') || catDesc.includes('cable') || catDesc.includes('cbl')) return false;
    if (catItem.skuData?.['Component Role'] === 'Heatsink' || catDesc.includes('heatsink') || catDesc.includes('heat sink')) return true;
  }
  return false;
}

function isDirectLiquidCoolingItem(it) {
  if (isOcaModifierTrackingRow(it.sku, it.description)) return false;
  const d = (it.description || '').toLowerCase();
  const sku = cleanBaseSKU(it.sku);
  return d.includes('liquid cooling') || d.includes('direct liquid') || d.includes('dlc') ||
    d.includes('cold plate') || d.includes('coolant') || ['P74796-B21', 'P60000-B21'].includes(sku);
}

function evalComputeThermal(items, catalogData = null, mandatorySkus = {}, serverCount = 1, options = {}) {
  let cpuCount = 0;
  let maxCpuTdpWatts = 0;
  let fanKitCount = 0;
  const uniqueCpuSkus = new Set();
  const skuIndex = buildCatalogSkuIndex(catalogData);

  for (const it of items) {
    if (isOcaModifierTrackingRow(it.sku, it.description)) continue;
    const desc = (it.description || '').toLowerCase();
    const sku = cleanBaseSKU(it.sku);

    let role = classifyComponentRole('', desc);
    const catalogItem = skuIndex.get(sku);
    if (catalogItem) {
      role = classifyComponentRole(catalogItem.parentCategory, desc);
    }

    if (role === 'Processor' || desc.includes('processor') || desc.includes('xeon') || desc.includes('epyc') || /^p\d{5}-b21$/i.test(it.sku)) {
      if (desc.includes('processor') || desc.includes('xeon') || desc.includes('epyc') || role === 'Processor') {
        cpuCount += (it.quantity || 1);
        if (sku) uniqueCpuSkus.add(sku);
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

  const isGen11 = Boolean(
    options?.chassisInfo?.gen?.toLowerCase().includes('gen11') ||
    options?.chassisInfo?.gen?.includes('11') ||
    options?.chassisInfo?.model?.toLowerCase().includes('gen11') ||
    options?.gen?.toLowerCase().includes('gen11') ||
    options?.model?.toLowerCase().includes('gen11') ||
    items.some(it => {
      const d = (it.description || '').toLowerCase();
      if (d.includes('gen11')) return true;
      const catItem = skuIndex.get(cleanBaseSKU(it.sku));
      return (catItem?.skuData?.Description || '').toLowerCase().includes('gen11');
    })
  );

  const highPerfFanSku = mandatorySkus.HIGH_PERF_FAN_KIT?.sku || '';
  const highPerfHeatsinkSku = mandatorySkus.HIGH_PERF_HEATSINK?.sku || '';
  const hasHighPerfFans = fanKitCount > 0 || (highPerfFanSku ? items.some(it => !isOcaModifierTrackingRow(it.sku, it.description) && cleanBaseSKU(it.sku) === cleanBaseSKU(highPerfFanSku)) : false);
  const hasDirectLiquidCooling = items.some(isDirectLiquidCoolingItem) || Boolean(options?.hasDirectLiquidCooling);
  const hasHeatsinks = items.some(it => isHeatsinkItem(it, skuIndex, highPerfHeatsinkSku));
  const needsHeatsink = cpuCount > 0 && !hasHeatsinks && !hasDirectLiquidCooling;

  // Processors > 350W TDP exceed air-cooling thermal envelope in standard enterprise servers and require Direct Liquid Cooling (DLC)
  const isDlcMandated = maxCpuTdpWatts > 350 || Boolean(options?.requiresDlc);
  const needsDirectLiquidCooling = isDlcMandated && !hasDirectLiquidCooling;

  // INV-208: Heatsink Tier Right-Sizing & Lead-Time Bottleneck Prevention
  // On DL380 Gen12, P74794-B21 (Max Performance Heat Sink Kit, $624, 45-day lead time) is only required for > 270W TDP CPUs
  // or dense GPU workloads. For 185W-270W CPUs (e.g., Xeon 6530P 225W), P74792-B21 (High Performance Heat Sink Kit, $316, 4-day lead time)
  // is thermally certified and avoids the 45-day lead-time bottleneck.
  const hasMaxPerfHeatsink = items.some(it => {
    if (isOcaModifierTrackingRow(it.sku, it.description)) return false;
    const sku = cleanBaseSKU(it.sku);
    const d = (it.description || '').toLowerCase();
    return sku === 'P74794-B21' || d.includes('max performance heat sink');
  });
  const hasGpuInItems = items.some(it => {
    if (isOcaModifierTrackingRow(it.sku, it.description)) return false;
    const d = (it.description || '').toLowerCase();
    return /\b(nvidia|h100|h200|l40s|a100|gpu accelerator)\b/i.test(d);
  });
  const hasOverprovisionedMaxHeatsink = hasMaxPerfHeatsink && maxCpuTdpWatts > 0 && maxCpuTdpWatts <= 270 && !hasGpuInItems;

  // CLIC Rule 81354654 & INV-206 Fan Packaging Modality:
  // 1. Modular Fan Kits (1 individual fan rotor per kit, e.g. AMD DL3X5 P58465-B21 / P58464-B21):
  //    Requires 4 kits for 1-socket, 6 kits for 2-socket (max 6 fans per 2U server).
  // 2. Bundled Fan Kits (6 fans per kit, e.g. Intel DL380 P48820-B21):
  //    Requires exactly 1 kit per server.
  const isModularFan = items.some(it => {
    if (isOcaModifierTrackingRow(it.sku, it.description)) return false;
    const d = (it.description || '').toLowerCase();
    const sku = cleanBaseSKU(it.sku);
    return d.includes('dl3x5') || d.includes('dl385') || d.includes('dl365') || d.includes('dl325') ||
      ['P58465-B21', 'P58464-B21', 'P58466-B21'].includes(sku) ||
      (options?.model && /dl3[268]5/i.test(options.model));
  }) || Boolean(mandatorySkus.HIGH_PERF_FAN_KIT?.packagingModality === 'MODULAR_PER_ROTOR');

  const cpusPerServer = (serverCount > 0 && cpuCount > 0) ? Math.max(1, Math.round(cpuCount / serverCount)) : (cpuCount || 2);
  // Use Math.floor to avoid fractional ratios (e.g. 3 kits for 2 servers = 1.5) giving a false pass
  const fanKitsPerServer = serverCount > 0 ? Math.floor(fanKitCount / serverCount) : fanKitCount;
  const maxFanKitsAllowed = isModularFan ? (cpusPerServer === 1 ? 4 : 6) : 1;
  const minFanKitsRequired = isModularFan ? (cpusPerServer === 1 ? 4 : 6) : 1;
  const fanKitExceedsMax = fanKitsPerServer > maxFanKitsAllowed;
  const fanKitUnderPopulated = isModularFan && fanKitCount > 0 && fanKitsPerServer < minFanKitsRequired;

  const isDl380aAccelerator = items.some(it => {
    if (isOcaModifierTrackingRow(it.sku, it.description)) return false;
    const d = (it.description || '').toLowerCase();
    if (d.includes('dl380a')) return true;
    const catItem = skuIndex.get(cleanBaseSKU(it.sku));
    return (catItem?.skuData?.Description || '').toLowerCase().includes('dl380a');
  });

  return {
    cpuCount,
    cpusPerServer,
    maxCpuTdpWatts,
    hasHighPerfFans,
    hasHeatsinks,
    needsHeatsink,
    hasDirectLiquidCooling,
    needsDirectLiquidCooling,
    hasMaxPerfHeatsink,
    hasOverprovisionedMaxHeatsink,
    recommendedHeatsinkSku: hasOverprovisionedMaxHeatsink ? 'P74792-B21' : null,
    fanKitCount,
    fanKitsPerServer,
    maxFanKitsAllowed,
    minFanKitsRequired,
    isModularFan,
    fanKitExceedsMax,
    fanKitUnderPopulated,
    highPerfFanSku,
    highPerfHeatsinkSku,
    isGen11,
    // AMD EPYC 8004 single-socket edge detection (DL145 Gen11)
    isAmdEpyc8004: items.some(it => (it.description || '').toLowerCase().includes('epyc 8')),
    // DL380a 8DW GPU thermal envelope: high-TDP GPUs mandate high-perf cooling
    isDl380aAccelerator,
    uniqueCpuSkus: Array.from(uniqueCpuSkus),
    hasMixedCpuModels: (serverCount === 1 || !serverCount) && uniqueCpuSkus.size > 1,
    isElevatedAmbient: (Number(options?.ambientTemp ?? options?.ambientTemperature ?? 25) > 30) || Boolean(options?.ambientGate),
    ambientTemp: Number(options?.ambientTemp ?? options?.ambientTemperature ?? 25),
    // High TDP (> 185W or theta threshold) or elevated ambient temperature (> 30°C) mandates High-Performance Fan Kit
    needsHighPerfCooling: (maxCpuTdpWatts > 185 || (Number(options?.ambientTemp ?? options?.ambientTemperature ?? 25) > 30) || Boolean(options?.ambientGate)) && !hasHighPerfFans,
    thermalEquationFormula: (Number(options?.ambientTemp ?? options?.ambientTemperature ?? 25) > 30) || Boolean(options?.ambientGate)
      ? `ambientTemp (${Number(options?.ambientTemp ?? options?.ambientTemperature ?? 25)}°C) > 30°C => needsHighPerfCooling = ${(maxCpuTdpWatts > 185 || (Number(options?.ambientTemp ?? options?.ambientTemperature ?? 25) > 30) || Boolean(options?.ambientGate)) && !hasHighPerfFans}`
      : `maxCpuTdpWatts (${maxCpuTdpWatts}W) > 185W => needsHighPerfCooling = ${maxCpuTdpWatts > 185 && !hasHighPerfFans}`
  };
}

module.exports = {
  evalComputeThermal
};
