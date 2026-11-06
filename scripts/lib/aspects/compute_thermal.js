'use strict';
/**
 * scripts/lib/aspects/compute_thermal.js — Compute & Thermal Aspect Pre-Check
 */

const { cleanBaseSKU, buildCatalogSkuIndex, isOcaModifierTrackingRow } = require('../catalog/sku.js');
const { classifyComponentRole } = require('../catalog/product_meta.js');

const KNOWN_HEATSINK_SKUS = new Set([
  'P74792-B21', 'P74794-B21', 'P49145-B21', 'P48818-B21', 'P58459-B21',
  'P48809-B21', 'P74787-B21', 'P48817-B21', 'P48905-B21', 'P58458-B21', 'P58460-B21'
]);
const HEATSINK_EXCLUSION_PATTERN = /baffle|guide|blank|bracket|duct|cable|cbl|power supply|flex slot|platinum/i;

function isHeatsinkItem(it, skuIndex = null, highPerfHeatsinkSku = '') {
  if (isOcaModifierTrackingRow(it.sku, it.description)) return false;
  const sku = cleanBaseSKU(it.sku);
  const d = (it.description || '').toLowerCase();
  if (HEATSINK_EXCLUSION_PATTERN.test(d)) return false;

  if (highPerfHeatsinkSku && sku === cleanBaseSKU(highPerfHeatsinkSku)) return true;
  if (KNOWN_HEATSINK_SKUS.has(sku)) return true;
  if (d.includes('heat sink') || d.includes('heatsink') || classifyComponentRole('', d) === 'Heatsink') return true;

  const catItem = skuIndex ? skuIndex.get(sku) : null;
  if (catItem) {
    const catDesc = (catItem.skuData?.Description || '').toLowerCase();
    if (HEATSINK_EXCLUSION_PATTERN.test(catDesc)) return false;
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

function _extractComputeMetrics(items, skuIndex, mandatorySkus) {
  let cpuCount = 0;
  let maxCpuTdpWatts = 0;
  let fanKitCount = 0;
  const uniqueCpuSkus = new Set();
  const fanKitSku = cleanBaseSKU(mandatorySkus.HIGH_PERF_FAN_KIT?.sku || '');

  for (const it of items) {
    if (isOcaModifierTrackingRow(it.sku, it.description)) continue;
    const desc = (it.description || '').toLowerCase();
    const sku = cleanBaseSKU(it.sku);

    let role = classifyComponentRole('', desc);
    const catalogItem = skuIndex.get(sku);
    if (catalogItem) {
      role = classifyComponentRole(catalogItem.parentCategory, desc);
    }

    const isCpuToken = desc.includes('processor') || desc.includes('xeon') || desc.includes('epyc');
    const isCpuCandidate = role === 'Processor' || isCpuToken || /^p\d{5}-b21$/i.test(it.sku);

    if (isCpuCandidate && (role === 'Processor' || isCpuToken)) {
      cpuCount += (it.quantity || 1);
      if (sku) uniqueCpuSkus.add(sku);
      const tdpMatch = desc.match(/(\d{2,3})\s*w/i);
      if (tdpMatch) {
        const tdp = parseInt(tdpMatch[1], 10);
        if (tdp > maxCpuTdpWatts) maxCpuTdpWatts = tdp;
      }
    }

    const isFanDesc = desc.includes('fan kit') || desc.includes('fan module') || desc.includes('high performance fan');
    if (role === 'Fan Kit / Fan' || isFanDesc || (fanKitSku && sku === fanKitSku)) {
      fanKitCount += (it.quantity || 1);
    }
  }

  return { cpuCount, maxCpuTdpWatts, fanKitCount, uniqueCpuSkus };
}

function _detectGen11Platform(items, skuIndex, options = {}) {
  const cInfo = options?.chassisInfo;
  const genCandidate = String(cInfo?.gen || options?.gen || '').toLowerCase();
  const modelCandidate = String(cInfo?.model || options?.model || '').toLowerCase();
  if (genCandidate.includes('gen11') || genCandidate.includes('11') || modelCandidate.includes('gen11')) {
    return true;
  }
  return items.some(it => {
    const d = (it.description || '').toLowerCase();
    if (d.includes('gen11')) return true;
    const catItem = skuIndex.get(cleanBaseSKU(it.sku));
    return (catItem?.skuData?.Description || '').toLowerCase().includes('gen11');
  });
}

function _detectModularFanPackaging(items, options = {}, mandatorySkus = {}) {
  if (mandatorySkus.HIGH_PERF_FAN_KIT?.packagingModality === 'MODULAR_PER_ROTOR') {
    return true;
  }
  const isAmdChassisModel = Boolean(options?.model && /dl3[268]5/i.test(options.model));
  if (isAmdChassisModel) return true;

  const MODULAR_SKUS = new Set(['P58465-B21', 'P58464-B21', 'P58466-B21']);
  return items.some(it => {
    if (isOcaModifierTrackingRow(it.sku, it.description)) return false;
    const sku = cleanBaseSKU(it.sku);
    if (MODULAR_SKUS.has(sku)) return true;
    const d = (it.description || '').toLowerCase();
    return d.includes('dl3x5') || d.includes('dl385') || d.includes('dl365') || d.includes('dl325');
  });
}

function _evaluateHeatsinkTiering(items, maxCpuTdpWatts) {
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
  return {
    hasMaxPerfHeatsink,
    hasOverprovisionedMaxHeatsink,
    recommendedHeatsinkSku: hasOverprovisionedMaxHeatsink ? 'P74792-B21' : null
  };
}

function _evaluateThermalCoolingEnvelope(options = {}, maxCpuTdpWatts = 0, hasHighPerfFans = false) {
  const ambientTemp = Number(options?.ambientTemp ?? options?.ambientTemperature ?? 25);
  const isElevatedAmbient = ambientTemp > 30 || Boolean(options?.ambientGate);
  const needsHighPerfCooling = (maxCpuTdpWatts > 185 || isElevatedAmbient) && !hasHighPerfFans;

  const thermalEquationFormula = isElevatedAmbient
    ? `ambientTemp (${ambientTemp}°C) > 30°C => needsHighPerfCooling = ${needsHighPerfCooling}`
    : `maxCpuTdpWatts (${maxCpuTdpWatts}W) > 185W => needsHighPerfCooling = ${maxCpuTdpWatts > 185 && !hasHighPerfFans}`;

  return { ambientTemp, isElevatedAmbient, needsHighPerfCooling, thermalEquationFormula };
}

function evalComputeThermal(items, catalogData = null, mandatorySkus = {}, serverCount = 1, options = {}) {
  const skuIndex = buildCatalogSkuIndex(catalogData);
  const { cpuCount, maxCpuTdpWatts, fanKitCount, uniqueCpuSkus } = _extractComputeMetrics(items, skuIndex, mandatorySkus);

  const isGen11 = _detectGen11Platform(items, skuIndex, options);
  const highPerfFanSku = mandatorySkus.HIGH_PERF_FAN_KIT?.sku || '';
  const highPerfHeatsinkSku = mandatorySkus.HIGH_PERF_HEATSINK?.sku || '';

  const hasHighPerfFans = fanKitCount > 0 || (highPerfFanSku ? items.some(it => !isOcaModifierTrackingRow(it.sku, it.description) && cleanBaseSKU(it.sku) === cleanBaseSKU(highPerfFanSku)) : false);
  const hasDirectLiquidCooling = items.some(isDirectLiquidCoolingItem) || Boolean(options?.hasDirectLiquidCooling);
  const hasHeatsinks = items.some(it => isHeatsinkItem(it, skuIndex, highPerfHeatsinkSku));
  const needsHeatsink = cpuCount > 0 && !hasHeatsinks && !hasDirectLiquidCooling;

  const isDlcMandated = maxCpuTdpWatts > 350 || Boolean(options?.requiresDlc);
  const needsDirectLiquidCooling = isDlcMandated && !hasDirectLiquidCooling;

  const { hasMaxPerfHeatsink, hasOverprovisionedMaxHeatsink, recommendedHeatsinkSku } = _evaluateHeatsinkTiering(items, maxCpuTdpWatts);

  const isModularFan = _detectModularFanPackaging(items, options, mandatorySkus);
  const cpusPerServer = (serverCount > 0 && cpuCount > 0) ? Math.max(1, Math.round(cpuCount / serverCount)) : (cpuCount || 2);
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

  const { ambientTemp, isElevatedAmbient, needsHighPerfCooling, thermalEquationFormula } = _evaluateThermalCoolingEnvelope(options, maxCpuTdpWatts, hasHighPerfFans);

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
    recommendedHeatsinkSku,
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
    isAmdEpyc8004: items.some(it => (it.description || '').toLowerCase().includes('epyc 8')),
    isDl380aAccelerator,
    uniqueCpuSkus: Array.from(uniqueCpuSkus),
    hasMixedCpuModels: (serverCount === 1 || !serverCount) && uniqueCpuSkus.size > 1,
    isElevatedAmbient,
    ambientTemp,
    needsHighPerfCooling,
    thermalEquationFormula
  };
}

module.exports = {
  evalComputeThermal
};
