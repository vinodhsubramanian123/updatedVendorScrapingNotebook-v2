'use strict';
/**
 * scripts/lib/aspects/storage_tri_mode.js — Storage & Tri-Mode Controller Aspect Pre-Check
 */

const { cleanBaseSKU } = require('../catalog/sku.js');
const { classifyComponentRole } = require('../catalog/product_meta.js');

function evalStorageTriMode(items, catalogData = null, mandatorySkus = {}) {
  let driveCount = 0;
  let hasStorageController = false;
  let hasOcpController = false;
  let hasPcieController = false;
  let hasSmartBattery = false;
  let hasNoDriveKit = false;
  let hasDriveCage = false;
  let hasPremiumCage = false;
  let hasYCable = false;
  let hasOcpCable = false;
  let hasSasExpander = false;
  let hasTriModeSwitch = false;
  const conflictingCableItems = [];

  // Synergy Composable Storage
  let hasD3940 = false;
  let hasSynergyCompute = false;
  let hasSasMezzanine = false;
  let hasSasConnectionModule = false;
  let hasD3940ConnectivityError = false;

  const batterySku = cleanBaseSKU(mandatorySkus.SMART_STORAGE_BATTERY?.sku || 'P01366-B21');
  const noDriveSku = cleanBaseSKU(mandatorySkus.NO_DRIVE_FIO_KIT?.sku || '873763-B21');

  for (const it of items) {
    const desc = (it.description || '').toLowerCase();
    const sku = cleanBaseSKU(it.sku);

    let role = classifyComponentRole('', desc);
    if (catalogData && catalogData.entries) {
      const match = catalogData.entries.find(e => e.skus && e.skus.find(s => cleanBaseSKU(s['Product #']) === sku));
      if (match) role = classifyComponentRole(match.parentCategory, desc);
    }

    if (role === 'Drive Cage / Drive' || desc.includes('hdd') || desc.includes('ssd') || desc.includes('drive') || desc.includes('nvme')) {
      if (!desc.includes('no drive') && !desc.includes('cage') && !desc.includes('controller') && !desc.includes('cable')) {
        driveCount += (it.quantity || 1);
      }
    }
    // Description-primary cage detection: 'drive cage', 'sff cage', 'lff cage' patterns
    // SKUs are secondary reinforcement for known Gen11/Gen12 cages
    if (desc.includes('drive cage') || desc.includes('sff cage') || desc.includes('lff cage') || desc.includes('box 1') || desc.includes('box 2') || sku === 'P48813-B21' || sku === 'P75741-B21') {
      if (!desc.includes('premium') && !desc.includes('u.3 prem')) {
        hasDriveCage = true;
      }
    }
    if (desc.includes('u.3 prem') || desc.includes('premium kit') || desc.includes('premium cage') || sku === 'P48814-B21') {
      hasDriveCage = true;
      hasPremiumCage = true;
    }
    // Description-primary controller detection: RAID controller model names (mr*, sr*)
    // Form-factor suffixes (-o = OCP, -p = PCIe) are parsed dynamically
    if (desc.includes('controller') || desc.includes('mr416i') || desc.includes('sr932i') || desc.includes('mr408i') || desc.includes('mr216i') || desc.includes('raid') || /\b(mr|sr)\d{3}i/i.test(desc)) {
      hasStorageController = true;
      if (desc.includes('-o') || desc.includes('ocp') || /\b(mr|sr)\d{3}i-o\b/i.test(desc)) {
        hasOcpController = true;
      }
      if (desc.includes('-p') || /\b(mr|sr)\d{3}i-p\b/i.test(desc)) {
        hasPcieController = true;
      }
    }
    // Description-primary cable detection: Y-cable vs enablement cable patterns
    if (desc.includes('splitter cable') || desc.includes('tm y-cbl') || desc.includes('tri-mode splitter') || desc.includes('y-cable') || sku === 'P48832-B21') {
      hasYCable = true;
      conflictingCableItems.push(it);
    }
    if (desc.includes('storage controller enablement cable') || desc.includes('controller enablement cable') || desc.includes('controller enablement kit') || sku === 'P48918-B21') {
      hasOcpCable = true;
    }
    if (desc.includes('sas expander') || sku === 'P48835-B21' || desc.includes('expander card')) {
      hasSasExpander = true;
    }
    if (desc.includes('tri-mode switch') || sku === 'P55806-B21' || desc.includes('switch card')) {
      hasTriModeSwitch = true;
    }
    if (sku === batterySku || sku === 'P02377-B21' || desc.includes('smart storage battery') || desc.includes('hybrid capacitor')) {
      hasSmartBattery = true;
    }
    if (sku === noDriveSku || desc.includes('no drive')) {
      hasNoDriveKit = true;
    }

    // Detect Synergy Components
    if (desc.includes('d3940')) {
      hasD3940 = true;
    }
    if (desc.includes('sy480') || desc.includes('sy660') || (desc.includes('synergy') && desc.includes('compute module'))) {
      hasSynergyCompute = true;
    }
    if (desc.includes('synergy') && desc.includes('sas') && desc.includes('mezzanine')) {
      hasSasMezzanine = true;
    }
    if (desc.includes('synergy') && desc.includes('sas') && desc.includes('connection module')) {
      hasSasConnectionModule = true;
    }
  }

  // Synergy Composable Storage Validation
  if (hasD3940 && hasSynergyCompute) {
    if (!hasSasMezzanine || !hasSasConnectionModule) {
      hasD3940ConnectivityError = true;
    }
  }

  // Storage Expander Math: An 8-port controller directly connects up to 8 drives.
  // 16 or 24 drives on a single controller requires a SAS Expander Card (P48835-B21) or Tri-Mode Switch Card (P55806-B21).
  const controllerDirectCapacity = hasStorageController ? (hasPcieController && !hasOcpController ? 16 : 8) : 0;
  const needsSasExpander = hasStorageController && driveCount > controllerDirectCapacity && !hasSasExpander && !hasTriModeSwitch;

  // CLIC Rules 81354627 & 81354632: P48832-B21 (Y-Cable) requires a PCIe-type controller (-p) and Premium Cage (P48814-B21)
  const hasIncompatibleYCable = hasYCable && (!hasPcieController || !hasPremiumCage);

  // CLIC Rule 81354652: P02377-B21 / P01366-B21 (Hybrid Capacitor / Smart Battery) requires P48918-B21 Storage Enablement Cable Kit
  const needsCapacitorCable = hasSmartBattery && !hasOcpCable;

  return {
    driveCount,
    hasStorageController,
    hasOcpController,
    hasPcieController,
    hasSmartBattery,
    hasNoDriveKit,
    hasDriveCage,
    hasPremiumCage,
    hasYCable,
    hasIncompatibleYCable,
    hasOcpCable,
    hasSasExpander,
    hasTriModeSwitch,
    needsSasExpander,
    needsCapacitorCable,
    controllerDirectCapacity,
    conflictingCableItems,
    hasD3940ConnectivityError
  };
}

module.exports = {
  evalStorageTriMode
};
