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

function tallyCagesAndDrives(tally, desc, sku, qty, role, mandatorySkus = {}) {
  if (isDriveComponent(role, desc)) {
    tally.driveCount += qty;
    const isLff = (desc.includes('lff') || desc.includes('3.5in') || desc.includes('3.5"') || desc.includes('3.5 in')) && !desc.includes('cage');
    const isSff = (desc.includes('sff') || desc.includes('2.5in') || desc.includes('2.5"') || desc.includes('2.5 in')) && !desc.includes('cage');
    if (isLff) tally.lffDriveCount = (tally.lffDriveCount || 0) + qty;
    if (isSff) tally.sffDriveCount = (tally.sffDriveCount || 0) + qty;
  }

  // Drive Cage & Backplane Kits
  const isGenericCage = desc.includes('drive cage') || desc.includes('sff cage') || desc.includes('lff cage') || 
      desc.includes('cage kit') || desc.includes('box 1') || desc.includes('box 2') || 
      desc.includes('backplane') || desc.includes('backplane kit') ||
      (mandatorySkus?.GENERIC_CAGE?.sku && sku === cleanBaseSKU(mandatorySkus.GENERIC_CAGE.sku));
  if (isGenericCage && !desc.includes('premium') && !desc.includes('u.3 prem')) {
    tally.hasDriveCage = true;
  }
  if (desc.includes('u.3 prem') || desc.includes('premium kit') || desc.includes('premium cage') || 
      (mandatorySkus?.PREMIUM_CAGE?.sku && sku === cleanBaseSKU(mandatorySkus.PREMIUM_CAGE.sku))) {
    tally.hasDriveCage = true;
    tally.hasPremiumCage = true;
  }
  // DL380a drive cage tracking (Rule 81016788)
  if ((desc.includes('4sff') && desc.includes('dl380a')) || (mandatorySkus?.GENERIC_CAGE?.sku && sku === cleanBaseSKU(mandatorySkus.GENERIC_CAGE.sku) && desc.includes('4sff'))) {
    tally.has4SffCage = true;
    tally.hasDriveCage = true;
  }
  if ((desc.includes('4edsff') && desc.includes('dl380a')) || (mandatorySkus?.PREMIUM_CAGE?.sku && sku === cleanBaseSKU(mandatorySkus.PREMIUM_CAGE.sku) && desc.includes('4edsff'))) {
    tally.has4EdsffCage = true;
    tally.hasDriveCage = true;
  }
  if (desc.includes('12lff') || desc.includes('4lff') || desc.includes('8lff') || (role === 'Chassis' && desc.includes('lff'))) {
    tally.isLffChassis = true;
    tally.hasDriveCage = true;
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
    if (/\bmr216i-o\b/i.test(desc)) {
      tally.hasMr216iO = true;
    }
  }
}

function tallyStorageCablingAndBatteries(tally, it, desc, sku, batterySku, noDriveSku, mandatorySkus = {}) {
  if (desc.includes('splitter cable') || desc.includes('tm y-cbl') || desc.includes('tri-mode splitter') || desc.includes('y-cable') ||
      (mandatorySkus?.TRI_MODE_SPLITTER_CABLE?.sku && sku === cleanBaseSKU(mandatorySkus.TRI_MODE_SPLITTER_CABLE.sku))) {
    tally.hasYCable = true;
    tally.conflictingCableItems.push(it);
  }
  if (desc.includes('storage controller enablement cable') || desc.includes('controller enablement cable') || desc.includes('controller enablement kit') ||
      desc.includes('tri-mode pcie fio cable kit') || desc.includes('nvme to tri-mode') || sku === 'P76700-B21' || sku === 'P01367-B21' || desc.includes('with 260mm cable') ||
      (mandatorySkus?.CONTROLLER_CABLE_KIT?.sku && sku === cleanBaseSKU(mandatorySkus.CONTROLLER_CABLE_KIT.sku))) {
    tally.hasOcpCable = true;
  }
  if (desc.includes('sas expander') || desc.includes('expander card') ||
      (mandatorySkus?.SAS_EXPANDER?.sku && sku === cleanBaseSKU(mandatorySkus.SAS_EXPANDER.sku))) {
    tally.hasSasExpander = true;
  }
  if (desc.includes('tri-mode switch') || desc.includes('switch card') ||
      (mandatorySkus?.TRI_MODE_SWITCH?.sku && sku === cleanBaseSKU(mandatorySkus.TRI_MODE_SWITCH.sku))) {
    tally.hasTriModeSwitch = true;
  }
  if (sku === batterySku || sku === 'P01367-B21' || sku === 'P01366-B21' || (desc.includes('smart storage') && desc.includes('battery')) || desc.includes('lithium-ion battery') || desc.includes('hybrid capacitor') ||
      (mandatorySkus?.SMART_STORAGE_BATTERY?.sku && sku === cleanBaseSKU(mandatorySkus.SMART_STORAGE_BATTERY.sku))) {
    tally.hasSmartBattery = true;
  }
  if (sku === noDriveSku || desc.includes('no drive') ||
      (mandatorySkus?.NO_DRIVE_FIO_KIT?.sku && sku === cleanBaseSKU(mandatorySkus.NO_DRIVE_FIO_KIT.sku))) {
    tally.hasNoDriveKit = true;
  }
}

function tallyAlletraStorage(tally, desc, sku, qty) {
  if (desc.includes('alletra')) tally.isAlletraArray = true;
  if (desc.includes('controller node') || desc.includes('node controller')) tally.controllerNodeCount += qty;
  if (desc.includes('host bus adapter') || desc.includes('hba') || desc.includes('pcie fc') || desc.includes('iscsi adapter')) tally.hbaCount += qty;
  if (desc.includes('expansion shelf') || desc.includes('j2000') || (desc.includes('d3940') && !desc.includes('synergy'))) tally.expansionShelfCount += qty;
  if (desc.includes('sas mini-hd to mini-hd') || desc.includes('sas daisy') || (desc.includes('daisy chain') && desc.includes('sas'))) tally.sasDaisyChainCableCount += qty;
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
  if (desc.includes('mini sas high density') || desc.includes('mini-sas hd') || desc.includes('mini sas hd')) tally.miniSasHdCableCount += qty;
  if ((desc.includes('short wave') && desc.includes('transceiver')) || (desc.includes('fibre channel') && desc.includes('transceiver'))) tally.fcTransceiverCount += qty;
  if ((desc.includes('msl3040') || desc.includes('tape library')) && desc.includes('base module')) tally.msl3040BaseModuleCount += qty;
  if ((desc.includes('msl3040') || desc.includes('tape library')) && desc.includes('expansion module')) tally.msl3040ExpansionModuleCount += qty;
  if ((desc.includes('lto-') || desc.includes('ultrium')) && (desc.includes('data cartridge') || desc.includes('rw data'))) tally.dataCartridgeCount += qty;
}

function tallyControllersAndCables(tally, it, desc, sku, batterySku, noDriveSku, mandatorySkus = {}) {
  tallyRaidControllers(tally, desc, sku);
  tallyStorageCablingAndBatteries(tally, it, desc, sku, batterySku, noDriveSku, mandatorySkus);
}

function tallyModularAndTapeStorage(tally, desc, sku, qty) {
  tallyAlletraStorage(tally, desc, sku, qty);
  tallySynergyStorage(tally, desc);
  tallyStoreEverTapeStorage(tally, desc, sku, qty);
}

function tallyStorageItems(items, skuCategoryMap, batterySku, noDriveSku, mandatorySkus = {}) {
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
    lffDriveCount: 0,
    sffDriveCount: 0,
    has4SffCage: false,
    has4EdsffCage: false,
    hasMr216iO: false,
    isLffChassis: false
  };

  for (const it of items) {
    const desc = (it.description || '').toLowerCase();
    const sku = cleanBaseSKU(it.sku);
    const qty = it.quantity || 1;
    const mappedCategory = skuCategoryMap.get(sku) || '';
    const role = classifyComponentRole(mappedCategory, desc);

    tallyCagesAndDrives(tally, desc, sku, qty, role, mandatorySkus);
    tallyControllersAndCables(tally, it, desc, sku, batterySku, noDriveSku, mandatorySkus);
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

function validateStorageCablingAndBackplane(t, serverCount = 1) {
  const nodes = Math.max(1, serverCount || 1);
  const perNodeDrives = t.driveCount / nodes;
  const controllerDirectCapacity = t.hasStorageController ? (t.has16PortController ? 16 : 8) : 0;
  const isServerChassis = !t.isAlletraArray && !t.ltoSasDriveCount && !t.ltoFcDriveCount && !t.msl3040BaseModuleCount;
  return {
    controllerDirectCapacity,
    needsSasExpander: t.hasStorageController && perNodeDrives > controllerDirectCapacity && !t.hasSasExpander && !t.hasTriModeSwitch,
    hasIncompatibleYCable: t.hasYCable && (!t.hasPcieController || !t.hasPremiumCage),
    needsCapacitorCable: t.hasSmartBattery && !t.hasOcpCable,
    needsDriveCageForController: isServerChassis && !t.isLffChassis && t.hasStorageController && !t.hasDriveCage && !t.has4SffCage && !t.has4EdsffCage,
    hasControllerNoDriveConflict: isServerChassis && t.hasStorageController && t.hasNoDriveKit
  };
}

function evalStorageTriMode(items, catalogData = null, mandatorySkus = {}, serverCount = 1) {
  const batterySku = cleanBaseSKU(mandatorySkus.SMART_STORAGE_BATTERY?.sku || 'P01366-B21');
  const noDriveSku = cleanBaseSKU(mandatorySkus.NO_DRIVE_FIO_KIT?.sku || '873763-B21');
  const skuCategoryMap = buildSkuCategoryMap(catalogData);

  const t = tallyStorageItems(items, skuCategoryMap, batterySku, noDriveSku, mandatorySkus);

  // Synergy Validation
  const hasD3940ConnectivityError = (t.hasD3940 && t.hasSynergyCompute) && (!t.hasSasMezzanine || !t.hasSasConnectionModule);

  // Alletra & StoreEver sub-aspect validations
  const alletra = validateAlletraStorage(t);
  const storeEver = validateStoreEverStorage(t);
  const cabling = validateStorageCablingAndBackplane(t, serverCount);

  return {
    driveCount: t.driveCount,
    hasStorageController: t.hasStorageController,
    hasOcpController: t.hasOcpController,
    hasPcieController: t.hasPcieController,
    hasSmartBattery: t.hasSmartBattery,
    hasNoDriveKit: t.hasNoDriveKit,
    hasDriveCage: t.hasDriveCage,
    hasPremiumCage: t.hasPremiumCage,
    isLffChassis: t.isLffChassis,
    hasYCable: t.hasYCable,
    hasIncompatibleYCable: cabling.hasIncompatibleYCable,
    hasOcpCable: t.hasOcpCable,
    hasSasExpander: t.hasSasExpander,
    hasTriModeSwitch: t.hasTriModeSwitch,
    needsSasExpander: cabling.needsSasExpander,
    needsDriveCageForController: cabling.needsDriveCageForController,
    hasControllerNoDriveConflict: cabling.hasControllerNoDriveConflict,
    needsSmartStorageBattery: t.hasStorageController && !t.hasSmartBattery,
    needsCapacitorCable: cabling.needsCapacitorCable,
    controllerDirectCapacity: cabling.controllerDirectCapacity,
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
    lffDriveCount: t.lffDriveCount,
    sffDriveCount: t.sffDriveCount,
    hasLffDrivesInSffChassis: !t.isLffChassis && !t.isAlletraArray && !t.ltoSasDriveCount && !t.ltoFcDriveCount && t.lffDriveCount > 0,
    // DL380a drive cage mutual exclusion (Rule 81016788)
    hasDriveCageMixingConflict: t.has4SffCage && t.has4EdsffCage,
    // MR216i-o RAID 5/6 no-cache warning
    hasMr216iORaid56Risk: t.hasMr216iO && (t.hasRaid6 || (t.driveCount > 2 && !t.hasSmartBattery))
  };
}

module.exports = {
  evalStorageTriMode
};
