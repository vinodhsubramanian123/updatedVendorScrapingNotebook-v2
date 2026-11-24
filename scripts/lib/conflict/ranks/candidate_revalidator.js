'use strict';
/**
 * scripts/lib/conflict/ranks/candidate_revalidator.js — Candidate BOM Revalidation & Cascading Repair Loop
 */

const { cleanBaseSKU } = require('../../catalog/sku.js');
const { getMandatorySkusForChassis } = require('../../catalog/catalog_rules.js');
const { REPLACEMENT_SUPPLY_UNKNOWN } = require('./supply_and_pricing.js');

let _physicalMathValidator = null;

function setPhysicalMathValidator(fn) {
  _physicalMathValidator = fn;
}

function getPhysicalMathValidator() {
  return _physicalMathValidator;
}

function computeBomFingerprint(parts = []) {
  if (parts.length > 200) {
    let hash = 0;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (!p || !p.sku) continue;
      const s = cleanBaseSKU(p.sku) + ':' + (p.quantity || 1);
      for (let j = 0; j < s.length; j++) {
        hash = ((hash << 5) - hash) + s.charCodeAt(j);
        hash |= 0;
      }
    }
    return `dense_${parts.length}_${hash}`;
  }
  return parts
    .filter(p => p && p.sku)
    .map(p => `${cleanBaseSKU(p.sku)}:${p.quantity || 1}`)
    .sort()
    .join('|');
}

function _injectStorageBatteryIfMissing(updatedParts, partSkus, mandatory, getPrice, injectedFixes) {
  const hasControllerWithCache = updatedParts.some(p => {
    const desc = (p.description || '').toLowerCase();
    const sku = cleanBaseSKU(p.sku);
    return /mr416i|mr216i|sr932i|sr416i/i.test(desc) || /mr416i|mr216i|sr932i/i.test(sku);
  });
  const batterySku = mandatory.SMART_STORAGE_BATTERY?.sku || 'P01366-B21';
  const batteryName = mandatory.SMART_STORAGE_BATTERY?.name || 'HPE 96W Smart Storage Battery';
  const hasBattery = partSkus.has(cleanBaseSKU(batterySku)) || updatedParts.some(p => (p.description || '').toLowerCase().includes('storage battery'));

  if (hasControllerWithCache && !hasBattery) {
    const batteryPrice = getPrice(batterySku);
    updatedParts.push({
      sku: batterySku,
      description: batteryName,
      quantity: 1,
      unitPriceUsd: batteryPrice,
      extendedPriceUsd: batteryPrice,
      isFixInjected: true,
      isCascadingFix: true,
      category: 'Storage Battery Enablement'
    });
    partSkus.add(cleanBaseSKU(batterySku));
    injectedFixes.push({ sku: batterySku, reason: 'Cascading controller battery injection for write cache protection' });
  }
}

function _injectFanKitIfMissing(updatedParts, partSkus, mandatory, getPrice, injectedFixes) {
  const highTdpCpu = updatedParts.some(p => {
    const match = (p.description || '').toLowerCase().match(/(\d+)\s*w/);
    return match && parseInt(match[1], 10) > 240;
  });
  const hasGpu = updatedParts.some(p => /(nvidia|l40s|a100|h100|gpu)/i.test((p.description || '')));
  const fanSku = mandatory.HIGH_PERF_FAN_KIT?.sku || 'P48820-B21';
  const fanName = mandatory.HIGH_PERF_FAN_KIT?.name || 'HPE High Performance Fan Kit';
  const hasHighPerfFan = partSkus.has(cleanBaseSKU(fanSku)) ||
    updatedParts.some(p => {
      const d = (p.description || '').toLowerCase();
      return d.includes('high performance fan') || d.includes('fan module') || d.includes('fan kit');
    });

  if ((highTdpCpu || hasGpu) && !hasHighPerfFan) {
    const isModularFan = mandatory.HIGH_PERF_FAN_KIT?.packagingModality === 'MODULAR_PER_ROTOR' ||
      ['P58465-B21', 'P58464-B21', 'P58466-B21'].includes(cleanBaseSKU(fanSku));
    const cpuPart = updatedParts.find(p => /\b(processor|xeon|epyc)\b/i.test(p.description || '') && !/\b(heatsink|heat sink|fan)\b/i.test(p.description || ''));
    const cpuQty = cpuPart ? (cpuPart.quantity || 2) : 2;
    const fanQty = isModularFan ? (cpuQty === 1 ? 4 : 6) : 1;
    const fanPrice = getPrice(fanSku);
    updatedParts.push({
      sku: fanSku,
      description: fanName,
      quantity: fanQty,
      unitPriceUsd: fanPrice,
      extendedPriceUsd: fanPrice !== null ? fanPrice * fanQty : null,
      isFixInjected: true,
      isCascadingFix: true,
      category: 'Thermal Protection'
    });
    partSkus.add(cleanBaseSKU(fanSku));
    injectedFixes.push({ sku: fanSku, reason: 'Cascading fan kit injection for high TDP / accelerator cooling' });
  }
}

function _injectDcLugKitIfMissing(updatedParts, partSkus, mandatory, getPrice, injectedFixes) {
  const hasDcPsu = updatedParts.some(p => {
    const desc = (p.description || '').toLowerCase();
    return desc.includes('-48vdc') || (desc.includes('dc') && desc.includes('power supply'));
  });
  const lugSku = mandatory.DC_LUG_KIT?.sku || 'P36877-B21';
  const lugName = mandatory.DC_LUG_KIT?.name || 'HPE 48VDC Terminal Lug Connector Kit';
  const hasLugKit = partSkus.has(cleanBaseSKU(lugSku)) || updatedParts.some(p => (p.description || '').toLowerCase().includes('lug kit'));

  if (hasDcPsu && !hasLugKit) {
    const lugPrice = getPrice(lugSku);
    updatedParts.push({
      sku: lugSku,
      description: lugName,
      quantity: 1,
      unitPriceUsd: lugPrice,
      extendedPriceUsd: lugPrice,
      isFixInjected: true,
      isCascadingFix: true,
      category: 'Power Enablement'
    });
    partSkus.add(cleanBaseSKU(lugSku));
    injectedFixes.push({ sku: lugSku, reason: 'Cascading DC terminal lug connector kit injection' });
  }
}

function _applyRemoveDepMutation(dep, origSku, cleanDep, updatedParts, partSkus, injectedFixes, action) {
  const idx = updatedParts.findIndex(p => cleanBaseSKU(p.sku) === (origSku || cleanDep));
  if (idx === -1) return false;
  const removed = updatedParts.splice(idx, 1)[0];
  partSkus.delete(cleanBaseSKU(removed.sku));
  injectedFixes.push({ sku: removed.sku, action, reason: dep.reason || 'Pruned conflicting option in 7-aspect revalidation' });
  return true;
}

function _applySubstituteDepMutation(dep, origSku, cleanDep, updatedParts, partSkus, getPrice, injectedFixes) {
  const idx = updatedParts.findIndex(p => cleanBaseSKU(p.sku) === origSku);
  if (idx === -1) return false;
  const depPrice = getPrice(cleanDep);
  const qty = dep.quantity || updatedParts[idx].quantity || 1;
  updatedParts[idx] = {
    ...updatedParts[idx],
    ...REPLACEMENT_SUPPLY_UNKNOWN,
    sku: cleanDep,
    description: dep.description || `Substituted dependency (${cleanDep})`,
    quantity: qty,
    unitPriceUsd: depPrice,
    extendedPriceUsd: depPrice * qty,
    isFixInjected: true,
    isCascadingFix: true
  };
  partSkus.delete(origSku);
  partSkus.add(cleanDep);
  injectedFixes.push({ sku: cleanDep, replacedSku: origSku, action: 'SUBSTITUTE', reason: dep.reason || 'Substituted incompatible option' });
  return true;
}

function _applyDependencyMutationToParts(dep, updatedParts, partSkus, getPrice, injectedFixes) {
  const cleanDep = cleanBaseSKU(dep.sku);
  const origSku = cleanBaseSKU(dep.originalSku || '');
  const action = String(dep.action || '').toUpperCase();

  if (action === 'REMOVE' || action === 'PRUNE_REDUNDANT_RAID1_FIO') {
    return _applyRemoveDepMutation(dep, origSku, cleanDep, updatedParts, partSkus, injectedFixes, action);
  }
  if ((action === 'SUBSTITUTE' || origSku) && origSku && cleanDep) {
    return _applySubstituteDepMutation(dep, origSku, cleanDep, updatedParts, partSkus, getPrice, injectedFixes);
  }
  if (cleanDep && partSkus.has(cleanDep) && Number(dep.quantity) > 0 && action === 'ADJUST_QTY') {
    const target = updatedParts.find(p => cleanBaseSKU(p.sku) === cleanDep);
    if (target && target.quantity < dep.quantity) {
      target.quantity = dep.quantity;
      target.extendedPriceUsd = (target.unitPriceUsd || 0) * dep.quantity;
      injectedFixes.push({ sku: cleanDep, action: 'ADJUST_QTY', reason: dep.reason || 'Adjusted quantity to satisfy physical aspect check' });
      return true;
    }
  }
  if (cleanDep && !partSkus.has(cleanDep)) {
    const depPrice = getPrice(cleanDep);
    updatedParts.push({
      sku: cleanDep,
      description: dep.description || `Required dependency (${cleanDep})`,
      quantity: dep.quantity || 1,
      unitPriceUsd: depPrice,
      extendedPriceUsd: depPrice * (dep.quantity || 1),
      isFixInjected: true,
      isCascadingFix: true,
      category: dep.category || 'Aspect Rule Fix'
    });
    partSkus.add(cleanDep);
    injectedFixes.push({ sku: cleanDep, reason: dep.reason || 'Missing physical dependency from 7-aspect revalidation' });
    return true;
  }
  return false;
}

function _runPhysicalAspectsValidationLoop(updatedParts, partSkus, catalogData, targetDir, validator, getPrice, injectedFixes) {
  let isClean = false;
  let aspectErrors = ['7-aspect candidate validation did not return evidence.'];
  if (typeof validator !== 'function') return { isClean, aspectErrors };

  const visitedFingerprints = new Set([computeBomFingerprint(updatedParts)]);
  try {
    for (let pass = 0; pass < 8; pass++) {
      const mathResult = validator(updatedParts, catalogData, targetDir, { skipGraphValidation: true, skipLifecycle: true });
      if (!mathResult) {
        isClean = false;
        aspectErrors = ['Candidate validation returned no evidence.'];
        break;
      }
      isClean = mathResult.isMathClean === true && !(mathResult.missingDependencies?.length);
      aspectErrors = mathResult.errors || [];

      let mutated = false;
      if (Array.isArray(mathResult.missingDependencies)) {
        for (const dep of mathResult.missingDependencies) {
          if (_applyDependencyMutationToParts(dep, updatedParts, partSkus, getPrice, injectedFixes)) mutated = true;
        }
      }

      if (!mutated) break;
      const nextFp = computeBomFingerprint(updatedParts);
      if (visitedFingerprints.has(nextFp)) {
        isClean = false;
        aspectErrors = [...aspectErrors, 'Repair loop halted: repeated candidate BOM state detected (oscillation guard).'];
        break;
      }
      visitedFingerprints.add(nextFp);
      isClean = false;
      aspectErrors = ['Candidate dependency repair requires further validation; iteration limit reached.'];
    }
  } catch (error) {
    isClean = false;
    aspectErrors = [`7-aspect candidate revalidation failed: ${error.message}`];
  }

  return { isClean, aspectErrors };
}

function _injectManagementLicenseIfMissing(updatedParts, partSkus, getPrice, injectedFixes, chassisInfo = {}) {
  const family = String(chassisInfo?.family || '').toLowerCase();
  const gen = String(chassisInfo?.gen || chassisInfo?.model || '').toLowerCase();
  if (family && !family.includes('proliant') && !family.includes('compute')) return;
  if (/gen\s*(?:8|9|10)\b/.test(gen)) return;

  const isCto = updatedParts.some(p => {
    const d = (p.description || '').toLowerCase();
    const s = cleanBaseSKU(p.sku);
    return ((d.includes('cto') || d.includes('configure-to-order')) && !/alletra|synergy|sn3600|msl|storeever|cray/.test(d)) ||
      ['P73282-B21', 'P52534-B21', 'P52533-B21', 'P52532-B21', 'P74700-B21', 'P75741-B21', 'P72176-B21', 'P72175-B21', 'P72174-B21'].includes(s);
  });
  const hasMgmt = updatedParts.some(p => {
    const s = cleanBaseSKU(p.sku);
    const d = (p.description || '').toLowerCase();
    return ['R7A11AAE', 'E5Y43A', 'E5Y43AAE', 'R7A12AAE', 'S2E10AAE', 'S5E59AAE', 'S1A05A'].includes(s) ||
      d.includes('compute ops management') || d.includes('oneview');
  });
  if (isCto && !hasMgmt && !partSkus.has('R7A11AAE')) {
    const mgmtSku = 'R7A11AAE';
    const price = typeof getPrice === 'function' ? getPrice(mgmtSku) : 0;
    updatedParts.push({
      sku: mgmtSku,
      description: 'HPE GreenLake for Compute Ops Management Enhanced 3-year Upfront SaaS (CLIC Rule 81322276)',
      quantity: 1,
      unitPriceUsd: price,
      extendedPriceUsd: price,
      isFixInjected: true,
      category: 'Management Software'
    });
    partSkus.add(mgmtSku);
    injectedFixes.push({ sku: mgmtSku, reason: 'Mandatory management license per CLIC Rule 81322276' });
  }
}

function revalidateCandidateParts(parts, chassisInfo, getPrice, catalogData = null, targetDir = '', options = {}) {
  const mandatory = getMandatorySkusForChassis(chassisInfo);
  const updatedParts = [...parts];
  const injectedFixes = [];
  const partSkus = new Set(updatedParts.map(p => cleanBaseSKU(p.sku)));

  _injectStorageBatteryIfMissing(updatedParts, partSkus, mandatory, getPrice, injectedFixes);
  _injectFanKitIfMissing(updatedParts, partSkus, mandatory, getPrice, injectedFixes);
  _injectDcLugKitIfMissing(updatedParts, partSkus, mandatory, getPrice, injectedFixes);
  _injectManagementLicenseIfMissing(updatedParts, partSkus, getPrice, injectedFixes, chassisInfo);

  const validator = (options && typeof options.validateMath === 'function') ? options.validateMath : _physicalMathValidator;
  const { isClean, aspectErrors } = _runPhysicalAspectsValidationLoop(updatedParts, partSkus, catalogData, targetDir, validator, getPrice, injectedFixes);
  const newTotalCost = updatedParts.reduce((sum, p) => sum + (p.extendedPriceUsd || (p.unitPriceUsd * (p.quantity || 1))), 0);

  return {
    parts: updatedParts,
    injectedFixes,
    totalCost: newTotalCost,
    physicalMathClean: isClean,
    aspectErrors
  };
}

module.exports = {
  setPhysicalMathValidator,
  getPhysicalMathValidator,
  computeBomFingerprint,
  _runPhysicalAspectsValidationLoop,
  revalidateCandidateParts
};
