'use strict';
/**
 * scripts/lib/aspects/storage_tri_mode.js — Storage & Tri-Mode Controller Aspect Pre-Check
 */

const { cleanBaseSKU, buildCatalogSkuIndex } = require('../catalog/sku.js');
const { classifyComponentRole } = require('../catalog/product_meta.js');

function buildSkuCategoryMap(catalogData) {
  const index = buildCatalogSkuIndex(catalogData);
  const map = new Map();
  for (const [sku, item] of index.entries()) {
    map.set(sku, item.parentCategory || item.subCategory || '');
  }
  return map;
}

function isDriveComponent(role, desc) {
  const isExcluded = desc.includes('no drive') || desc.includes('cage') || 
                     desc.includes('controller') || desc.includes('cable') || 
                     desc.includes('tape drive');
  if (isExcluded) return false;
  return role === 'Drive Cage / Drive' || desc.includes('hdd') || 
         desc.includes('ssd') || desc.includes('drive') || desc.includes('nvme');
}

const GENERIC_CAGE_SKUS = new Set(['P48813-B21', 'P75741-B21']);
const PREMIUM_CAGE_SKUS = new Set(['P48814-B21']);
const DL380A_4SFF_CAGE_SKUS = new Set(['P74710-B21']);
const DL380A_4EDSFF_CAGE_SKUS = new Set(['P74712-B21']);
const MR216I_O_SKUS = new Set(['P26279-B21']);
const TRI_MODE_Y_CABLE_SKUS = new Set(['P48832-B21']);
const CONTROLLER_ENABLEMENT_CABLE_SKUS = new Set(['P48918-B21']);
const SAS_EXPANDER_SKUS = new Set(['P48835-B21']);
const TRI_MODE_SWITCH_SKUS = new Set(['P55806-B21']);
const SMART_BATTERY_COMPATIBLE_SKUS = new Set(['P02377-B21']);
const ALLETRA_SAS_DAISY_SKUS = new Set(['P40243-B21']);

function tallyCagesAndDrives(tally, desc, sku, qty, role) {
  if (isDriveComponent(role, desc)) {
    tally.driveCount += qty;
  }

  // Drive Cage
  const isGenericCage = desc.includes('drive cage') || desc.includes('sff cage') || desc.includes('lff cage') || 
      desc.includes('box 1') || desc.includes('box 2') || GENERIC_CAGE_SKUS.has(sku);
  if (isGenericCage && !desc.includes('premium') && !desc.includes('u.3 prem')) {
    tally.hasDriveCage = true;
  }
  if (desc.includes('u.3 prem') || desc.includes('premium kit') || desc.includes('premium cage') || PREMIUM_CAGE_SKUS.has(sku)) {
    tally.hasDriveCage = true;
    tally.hasPremiumCage = true;
  }
  // DL380a drive cage tracking (Rule 81016788)
  if (DL380A_4SFF_CAGE_SKUS.has(sku) || (desc.includes('4sff') && desc.includes('dl380a'))) {
    tally.has4SffCage = true;
  }
  if (DL380A_4EDSFF_CAGE_SKUS.has(sku) || (desc.includes('4edsff') && desc.includes('dl380a'))) {
    tally.has4EdsffCage = true;
  }
}

function tallyRaidControllers(tally, desc, sku) {
  if (desc.includes('controller') || desc.includes('mr416i') || desc.includes('sr932i') || 
      desc.includes('mr408i') || desc.includes('mr216i') || desc.includes('raid') || /\b(mr|sr)\d{3}i/i.test(desc)) {
    tally.hasStorageController = true;
    if (desc.includes('416i') || desc.includes('216i') || desc.includes('932i') || 
        desc.includes('16-port') || desc.includes('16 port') || desc.includes('32-port')) {
      tally.has16PortController = true;
    }
    if (desc.includes('-o') || desc.includes('ocp') || /\b(mr|sr)\d{3}i-o\b/i.test(desc)) {
      tally.hasOcpController = true;
    }
    if (desc.includes('-p') || /\b(mr|sr)\d{3}i-p\b/i.test(desc)) {
      tally.hasPcieController = true;
    }
    if (/\bmr216i-o\b/i.test(desc) || MR216I_O_SKUS.has(sku)) {
      tally.hasMr216iO = true;
    }
  }
}

function tallyStorageCablingAndBatteries(tally, it, desc, sku, batterySku, noDriveSku) {
  if (desc.includes('splitter cable') || desc.includes('tm y-cbl') || desc.includes('tri-mode splitter') || desc.includes('y-cable') || TRI_MODE_Y_CABLE_SKUS.has(sku)) {
    tally.hasYCable = true;
    tally.conflictingCableItems.push(it);
  }
  if (desc.includes('storage controller enablement cable') || desc.includes('controller enablement cable') || desc.includes('controller enablement kit') || CONTROLLER_ENABLEMENT_CABLE_SKUS.has(sku)) {
    tally.hasOcpCable = true;
  }
  if (desc.includes('sas expander') || SAS_EXPANDER_SKUS.has(sku) || desc.includes('expander card')) {
    tally.hasSasExpander = true;
  }
  if (desc.includes('tri-mode switch') || TRI_MODE_SWITCH_SKUS.has(sku) || desc.includes('switch card')) {
    tally.hasTriModeSwitch = true;
  }
  if (sku === batterySku || SMART_BATTERY_COMPATIBLE_SKUS.has(sku) || desc.includes('smart storage battery') || desc.includes('hybrid capacitor')) {
    tally.hasSmartBattery = true;
  }
  if (sku === noDriveSku || desc.includes('no drive')) {
    tally.hasNoDriveKit = true;
  }
}

function tallyAlletraStorage(tally, desc, sku, qty) {
  if (desc.includes('alletra')) tally.isAlletraArray = true;
  if (desc.includes('controller node') || desc.includes('node controller')) tally.controllerNodeCount += qty;
  if (desc.includes('host bus adapter') || desc.includes('hba') || desc.includes('pcie fc') || desc.includes('iscsi adapter')) tally.hbaCount += qty;
  if (desc.includes('expansion shelf') || desc.includes('j2000') || (desc.includes('d3940') && !desc.includes('synergy'))) tally.expansionShelfCount += qty;
  if (ALLETRA_SAS_DAISY_SKUS.has(sku) || desc.includes('sas mini-hd to mini-hd')) tally.sasDaisyChainCableCount += qty;
  if (desc.includes('ssd')) tally.ssdCount += qty;
  if (desc.includes('raid 6') || desc.includes('raid-6')) tally.hasRaid6 = true;
  if (desc.includes('raid 10') || desc.includes('raid-10')) tally.hasRaid10 = true;
}

function tallySynergyStorage(tally, desc) {
  if (desc.includes('d3940') || desc.includes('synergy d3940')) tally.hasD3940 = true;
  if (desc.includes('sy480') || desc.includes('sy660') || (desc.includes('synergy') && desc.includes('compute module'))) tally.hasSynergyCompute = true;
  if (desc.includes('synergy') && desc.includes('sas') && desc.includes('mezzanine')) tally.hasSasMezzanine = true;
  if (desc.includes('synergy') && desc.includes('sas') && desc.includes('connection module')) tally.hasSasConnectionModule = true;
}

function tallyStoreEverTapeStorage(tally, desc, sku, qty) {
  if (desc.includes('tape drive') || desc.includes('ultrium 30750') || desc.includes('lto-8') || desc.includes('lto-9')) {
    if (desc.includes('sas') && !desc.includes('mini sas') && !desc.includes('cable') && !desc.includes('cartridge')) tally.ltoSasDriveCount += qty;
    if ((desc.includes('fc') || desc.includes('fibre channel')) && !desc.includes('transceiver') && !desc.includes('cartridge')) tally.ltoFcDriveCount += qty;
  }
  if (sku === '716189-B21' || desc.includes('mini sas high density to mini sas')) tally.miniSasHdCableCount += qty;
  if (sku === 'AJ716B' || (desc.includes('8gb short wave') && desc.includes('transceiver')) || (desc.includes('fibre channel') && desc.includes('transceiver'))) tally.fcTransceiverCount += qty;
  if (sku === 'Q6Q62B' || (desc.includes('msl3040') && desc.includes('base module'))) tally.msl3040BaseModuleCount += qty;
  if (sku === 'Q6Q63A' || (desc.includes('msl3040') && desc.includes('expansion module'))) tally.msl3040ExpansionModuleCount += qty;
  if ((desc.includes('lto-') || desc.includes('ultrium')) && (desc.includes('data cartridge') || desc.includes('rw data'))) tally.dataCartridgeCount += qty;
}

function tallyControllersAndCables(tally, it, desc, sku, batterySku, noDriveSku) {
  tallyRaidControllers(tally, desc, sku);
  tallyStorageCablingAndBatteries(tally, it, desc, sku, batterySku, noDriveSku);
}

function tallyModularAndTapeStorage(tally, desc, sku, qty) {
  tallyAlletraStorage(tally, desc, sku, qty);
  tallySynergyStorage(tally, desc);
  tallyStoreEverTapeStorage(tally, desc, sku, qty);
}

function tallyStorageItems(items, skuCategoryMap, batterySku, noDriveSku) {
  const tally = {
    driveCount: 0,
    hasStorageController: false,
    has16PortController: false,
    hasOcpController: false,
    hasPcieController: false,
    hasSmartBattery: false,
    hasNoDriveKit: false,
    hasDriveCage: false,
    hasPremiumCage: false,
    hasYCable: false,
    hasOcpCable: false,
    hasSasExpander: false,
    hasTriModeSwitch: false,
    isAlletraArray: false,
    controllerNodeCount: 0,
    hbaCount: 0,
    expansionShelfCount: 0,
    sasDaisyChainCableCount: 0,
    ssdCount: 0,
    hasRaid6: false,
    hasRaid10: false,
    conflictingCableItems: [],
    hasD3940: false,
    hasSynergyCompute: false,
    hasSasMezzanine: false,
    hasSasConnectionModule: false,
    ltoSasDriveCount: 0,
    ltoFcDriveCount: 0,
    miniSasHdCableCount: 0,
    fcTransceiverCount: 0,
    msl3040BaseModuleCount: 0,
    msl3040ExpansionModuleCount: 0,
    dataCartridgeCount: 0,
    has4SffCage: false,
    has4EdsffCage: false,
    hasMr216iO: false
  };

  for (const it of items) {
    const desc = (it.description || '').toLowerCase();
    const sku = cleanBaseSKU(it.sku);
    const qty = it.quantity || 1;
    const mappedCategory = skuCategoryMap.get(sku) || '';
    const role = classifyComponentRole(mappedCategory, desc);

    tallyCagesAndDrives(tally, desc, sku, qty, role);
    tallyControllersAndCables(tally, it, desc, sku, batterySku, noDriveSku);
    tallyModularAndTapeStorage(tally, desc, sku, qty);
  }

  return tally;
}

function validateAlletraStorage(t) {
  return {
    hasMissingControllerNode: t.isAlletraArray && t.controllerNodeCount !== 2,
    hasAsymmetricHbas: t.isAlletraArray && t.hbaCount > 0 && t.hbaCount % 2 !== 0,
    missingDaisyChainCables: t.isAlletraArray && t.expansionShelfCount > 0 && t.sasDaisyChainCableCount < (t.expansionShelfCount * 2),
    insufficientRaid6Drives: t.isAlletraArray && t.hasRaid6 && t.ssdCount < 6,
    insufficientRaid10Drives: t.isAlletraArray && t.hasRaid10 && t.ssdCount < 4
  };
}

function validateStoreEverStorage(t) {
  const effectiveExpansionModules = Math.min(t.msl3040ExpansionModuleCount, 6);
  const totalMsl3040Slots = (t.msl3040BaseModuleCount > 0 ? 40 : 0) + (effectiveExpansionModules * 40);

  return {
    needsMiniSasHdCable: t.ltoSasDriveCount > t.miniSasHdCableCount,
    needsFcTransceiver: t.ltoFcDriveCount > t.fcTransceiverCount,
    exceedsMaxMsl3040Slots: t.msl3040ExpansionModuleCount > 6,
    totalMsl3040Slots,
    exceedsSlotCapacity: t.dataCartridgeCount > totalMsl3040Slots
  };
}

function evalStorageTriMode(items, catalogData = null, mandatorySkus = {}) {
  const batterySku = cleanBaseSKU(mandatorySkus.SMART_STORAGE_BATTERY?.sku || 'P01366-B21');
  const noDriveSku = cleanBaseSKU(mandatorySkus.NO_DRIVE_FIO_KIT?.sku || '873763-B21');
  const skuCategoryMap = buildSkuCategoryMap(catalogData);

  const t = tallyStorageItems(items, skuCategoryMap, batterySku, noDriveSku);

  // Synergy Validation
  const hasD3940ConnectivityError = (t.hasD3940 && t.hasSynergyCompute) && (!t.hasSasMezzanine || !t.hasSasConnectionModule);

  // Alletra & StoreEver sub-aspect validations
  const alletra = validateAlletraStorage(t);
  const storeEver = validateStoreEverStorage(t);

  // Storage Expander & Cable rules
  const controllerDirectCapacity = t.hasStorageController ? (t.has16PortController ? 16 : 8) : 0;
  const needsSasExpander = t.hasStorageController && t.driveCount > controllerDirectCapacity && !t.hasSasExpander && !t.hasTriModeSwitch;
  const hasIncompatibleYCable = t.hasYCable && (!t.hasPcieController || !t.hasPremiumCage);
  const needsCapacitorCable = t.hasSmartBattery && !t.hasOcpCable;

  return {
    driveCount: t.driveCount,
    hasStorageController: t.hasStorageController,
    hasOcpController: t.hasOcpController,
    hasPcieController: t.hasPcieController,
    hasSmartBattery: t.hasSmartBattery,
    hasNoDriveKit: t.hasNoDriveKit,
    hasDriveCage: t.hasDriveCage,
    hasPremiumCage: t.hasPremiumCage,
    hasYCable: t.hasYCable,
    hasIncompatibleYCable,
    hasOcpCable: t.hasOcpCable,
    hasSasExpander: t.hasSasExpander,
    hasTriModeSwitch: t.hasTriModeSwitch,
    needsSasExpander,
    needsSmartStorageBattery: t.hasStorageController && !t.hasSmartBattery,
    needsCapacitorCable,
    controllerDirectCapacity,
    conflictingCableItems: t.conflictingCableItems,
    isAlletraArray: t.isAlletraArray,
    controllerNodeCount: t.controllerNodeCount,
    hbaCount: t.hbaCount,
    expansionShelfCount: t.expansionShelfCount,
    sasDaisyChainCableCount: t.sasDaisyChainCableCount,
    ssdCount: t.ssdCount,
    hasRaid6: t.hasRaid6,
    hasRaid10: t.hasRaid10,
    hasMissingControllerNode: alletra.hasMissingControllerNode,
    hasAsymmetricHbas: alletra.hasAsymmetricHbas,
    missingDaisyChainCables: alletra.missingDaisyChainCables,
    insufficientRaid6Drives: alletra.insufficientRaid6Drives,
    insufficientRaid10Drives: alletra.insufficientRaid10Drives,
    hasD3940ConnectivityError,
    ltoSasDriveCount: t.ltoSasDriveCount,
    ltoFcDriveCount: t.ltoFcDriveCount,
    needsMiniSasHdCable: storeEver.needsMiniSasHdCable,
    needsFcTransceiver: storeEver.needsFcTransceiver,
    totalMsl3040Slots: storeEver.totalMsl3040Slots,
    exceedsMaxMsl3040Slots: storeEver.exceedsMaxMsl3040Slots,
    exceedsSlotCapacity: storeEver.exceedsSlotCapacity,
    // DL380a drive cage mutual exclusion (Rule 81016788)
    hasDriveCageMixingConflict: t.has4SffCage && t.has4EdsffCage,
    // MR216i-o RAID 5/6 no-cache warning
    hasMr216iORaid56Risk: t.hasMr216iO && (t.hasRaid6 || (t.driveCount > 2 && !t.hasSmartBattery))
  };
}

module.exports = {
  evalStorageTriMode
};
