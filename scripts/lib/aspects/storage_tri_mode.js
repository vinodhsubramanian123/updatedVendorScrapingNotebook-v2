'use strict';
/**
 * scripts/lib/aspects/storage_tri_mode.js — Storage & Tri-Mode Controller Aspect Pre-Check
 */

const { cleanBaseSKU } = require('../catalog/sku.js');
const { classifyComponentRole } = require('../catalog/product_meta.js');

function evalStorageTriMode(items, catalogData = null, mandatorySkus = {}) {
  let driveCount = 0;
  let hasStorageController = false;
  let has16PortController = false;
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
  let isAlletraArray = false;
  let controllerNodeCount = 0;
  let hbaCount = 0;
  let expansionShelfCount = 0;
  let sasDaisyChainCableCount = 0;
  let ssdCount = 0;
  let hasRaid6 = false;
  let hasRaid10 = false;
  const conflictingCableItems = [];

  const batterySku = cleanBaseSKU(mandatorySkus.SMART_STORAGE_BATTERY?.sku || 'P01366-B21');
  const noDriveSku = cleanBaseSKU(mandatorySkus.NO_DRIVE_FIO_KIT?.sku || '873763-B21');

  // Synergy Composable Storage
  let hasD3940 = false;
  let hasSynergyCompute = false;
  let hasSasMezzanine = false;
  let hasSasConnectionModule = false;
  let hasD3940ConnectivityError = false;

  // StoreEver Tape Automation
  let ltoSasDriveCount = 0;
  let ltoFcDriveCount = 0;
  let miniSasHdCableCount = 0;
  let fcTransceiverCount = 0;
  let msl3040BaseModuleCount = 0;
  let msl3040ExpansionModuleCount = 0;
  let dataCartridgeCount = 0;

  for (const it of items) {
    const desc = (it.description || '').toLowerCase();
    const sku = cleanBaseSKU(it.sku);

    let role = classifyComponentRole('', desc);
    if (catalogData && catalogData.entries) {
      const match = catalogData.entries.find(e => e.skus && e.skus.find(s => cleanBaseSKU(s['Product #']) === sku));
      if (match) role = classifyComponentRole(match.parentCategory, desc);
    }

    if (role === 'Drive Cage / Drive' || desc.includes('hdd') || desc.includes('ssd') || desc.includes('drive') || desc.includes('nvme')) {
      if (!desc.includes('no drive') && !desc.includes('cage') && !desc.includes('controller') && !desc.includes('cable') && !desc.includes('tape drive')) {
        driveCount += (it.quantity || 1);
      }
    }
    // Description-primary cage detection: 'drive cage', 'sff cage', 'lff cage' patterns
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
    if (desc.includes('controller') || desc.includes('mr416i') || desc.includes('sr932i') || desc.includes('mr408i') || desc.includes('mr216i') || desc.includes('raid') || /\b(mr|sr)\d{3}i/i.test(desc)) {
      hasStorageController = true;
      if (desc.includes('416i') || desc.includes('216i') || desc.includes('932i') || desc.includes('16-port') || desc.includes('16 port') || desc.includes('32-port')) {
        has16PortController = true;
      }
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
    if (desc.includes('alletra')) {
      isAlletraArray = true;
    }
    if (desc.includes('controller node') || desc.includes('node controller')) {
      controllerNodeCount += (it.quantity || 1);
    }
    if (desc.includes('host bus adapter') || desc.includes('hba') || desc.includes('pcie fc') || desc.includes('iscsi adapter')) {
      hbaCount += (it.quantity || 1);
    }
    if (desc.includes('expansion shelf') || desc.includes('j2000') || (desc.includes('d3940') && !desc.includes('synergy'))) {
      expansionShelfCount += (it.quantity || 1);
    }
    if (sku === 'P40243-B21' || desc.includes('sas mini-hd to mini-hd')) {
      sasDaisyChainCableCount += (it.quantity || 1);
    }
    if (desc.includes('ssd')) {
      ssdCount += (it.quantity || 1);
    }
    if (desc.includes('raid 6') || desc.includes('raid-6')) {
      hasRaid6 = true;
    }
    if (desc.includes('raid 10') || desc.includes('raid-10')) {
      hasRaid10 = true;
    }

    // Detect Synergy Components
    if (desc.includes('d3940') || desc.includes('synergy d3940')) {
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

    // Detect StoreEver Tape Automation Components
    if (desc.includes('tape drive') || desc.includes('ultrium 30750') || desc.includes('lto-8') || desc.includes('lto-9')) {
      if (desc.includes('sas') && !desc.includes('mini sas') && !desc.includes('cable') && !desc.includes('cartridge')) {
        ltoSasDriveCount += (it.quantity || 1);
      }
      if ((desc.includes('fc') || desc.includes('fibre channel')) && !desc.includes('transceiver') && !desc.includes('cartridge')) {
        ltoFcDriveCount += (it.quantity || 1);
      }
    }
    if (sku === '716189-B21' || desc.includes('mini sas high density to mini sas')) {
      miniSasHdCableCount += (it.quantity || 1);
    }
    if (sku === 'AJ716B' || (desc.includes('8gb short wave') && desc.includes('transceiver')) || (desc.includes('fibre channel') && desc.includes('transceiver'))) {
      fcTransceiverCount += (it.quantity || 1);
    }
    if (sku === 'Q6Q62B' || (desc.includes('msl3040') && desc.includes('base module'))) {
      msl3040BaseModuleCount += (it.quantity || 1);
    }
    if (sku === 'Q6Q63A' || (desc.includes('msl3040') && desc.includes('expansion module'))) {
      msl3040ExpansionModuleCount += (it.quantity || 1);
    }
    if ((desc.includes('lto-') || desc.includes('ultrium')) && (desc.includes('data cartridge') || desc.includes('rw data'))) {
      dataCartridgeCount += (it.quantity || 1);
    }
  }

  // Synergy Composable Storage Validation
  if (hasD3940 && hasSynergyCompute) {
    if (!hasSasMezzanine || !hasSasConnectionModule) {
      hasD3940ConnectivityError = true;
    }
  }

  // StoreEver Tape Automation Math
  const needsMiniSasHdCable = ltoSasDriveCount > miniSasHdCableCount;
  const needsFcTransceiver = ltoFcDriveCount > fcTransceiverCount;
  const exceedsMaxMsl3040Slots = msl3040ExpansionModuleCount > 6;
  const effectiveExpansionModules = Math.min(msl3040ExpansionModuleCount, 6);
  const totalMsl3040Slots = (msl3040BaseModuleCount > 0 ? 40 : 0) + (effectiveExpansionModules * 40);
  const exceedsSlotCapacity = dataCartridgeCount > totalMsl3040Slots;

  const hasMissingControllerNode = isAlletraArray && controllerNodeCount !== 2;
  const hasAsymmetricHbas = isAlletraArray && hbaCount > 0 && hbaCount % 2 !== 0;
  const missingDaisyChainCables = isAlletraArray && expansionShelfCount > 0 && sasDaisyChainCableCount < (expansionShelfCount * 2);
  const insufficientRaid6Drives = isAlletraArray && hasRaid6 && ssdCount < 6;
  const insufficientRaid10Drives = isAlletraArray && hasRaid10 && ssdCount < 4;

  // Storage Expander Math: An 8-port controller (MR408i-o, MR408i-p) directly connects up to 8 drives.
  // A 16-port controller (MR416i-p, MR216i-o) directly connects up to 16 drives.
  // Configurations with drives exceeding controller direct capacity require a SAS Expander Card (P48835-B21) or Tri-Mode Switch Card (P55806-B21).
  const controllerDirectCapacity = hasStorageController ? (has16PortController ? 16 : 8) : 0;
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
    isAlletraArray,
    controllerNodeCount,
    hbaCount,
    expansionShelfCount,
    sasDaisyChainCableCount,
    ssdCount,
    hasRaid6,
    hasRaid10,
    hasMissingControllerNode,
    hasAsymmetricHbas,
    missingDaisyChainCables,
    insufficientRaid6Drives,
    insufficientRaid10Drives,
    hasD3940ConnectivityError,
    ltoSasDriveCount,
    ltoFcDriveCount,
    needsMiniSasHdCable,
    needsFcTransceiver,
    totalMsl3040Slots,
    exceedsMaxMsl3040Slots,
    exceedsSlotCapacity
  };
}

module.exports = {
  evalStorageTriMode
};
