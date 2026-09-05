'use strict';
/**
 * scripts/lib/aspects/pcie_riser.js — PCIe Slot Capacity & Riser Aspect Pre-Check
 */

const { cleanBaseSKU, buildCatalogSkuIndex } = require('../catalog/sku.js');
const { classifyComponentRole } = require('../catalog/product_meta.js');

function isGpuComponent(role, desc) {
  if (role === 'GPU / Accelerator') return true;
  return desc.includes('nvidia') || desc.includes('a100') || desc.includes('l40s') || 
         desc.includes('h100') || desc.includes('l4') || desc.includes('a16') || 
         desc.includes('a30') || desc.includes('a40') || desc.includes('gpu accelerator');
}

function isExcludedPcieRole(role) {
  return role === 'Transceiver' || role === 'Cable Kit' || role === 'Storage Battery' || 
         role === 'Boot Device' || role === 'Chassis Infrastructure' || 
         role === 'Service & Support' || role === 'Operating System / License';
}

const PRIMARY_CABLE_KIT_SKUS = new Set(['P56073-B21']);
const SECONDARY_CABLE_KIT_SKUS = new Set(['P56074-B21']);
const GPU_POWER_CABLE_KIT_SKUS = new Set(['P48816-B21', 'P76450-B21']);
const PRIMARY_RISER_SKUS = new Set(['P48803-B21']);
const SECONDARY_RISER_SKUS = new Set(['P51083-B21', 'P48802-B21']);
const TERTIARY_RISER_SKUS = new Set(['P48804-B21']);

function tallyPcieCablesAndGpus(tally, desc, sku, qty, role) {
  if ((desc.includes('primary') && (desc.includes('cable kit') || desc.includes('prim cbl') || desc.includes('riser cable'))) || PRIMARY_CABLE_KIT_SKUS.has(sku)) {
    tally.hasPrimaryCableKit = true;
  }
  if ((desc.includes('secondary') && (desc.includes('cable kit') || desc.includes('sec cbl') || desc.includes('riser cable'))) || SECONDARY_CABLE_KIT_SKUS.has(sku)) {
    tally.hasSecondaryCableKit = true;
  }
  if (desc.includes('gpu power') || desc.includes('gpu cable') || desc.includes('gpu aux') || desc.includes('12vhpwr') || GPU_POWER_CABLE_KIT_SKUS.has(sku)) {
    tally.hasGpuPowerCableKit = true;
    tally.gpuPowerCableKitCount += qty;
  }
  if (isGpuComponent(role, desc)) {
    tally.gpuCount += qty;
  }
}

function tallyPcieCardDemand(tally, desc, qty, role) {
  if (isExcludedPcieRole(role)) return;

  const isPcieCandidate = role === 'GPU / Accelerator' || role === 'Network Adapter' || 
                          role === 'Storage Controller' || role === 'Fibre Channel HBA' || 
                          desc.includes('adapter') || desc.includes('controller') || 
                          desc.includes('hba') || desc.includes('nvidia') || 
                          desc.includes('pcie') || desc.includes('gpu');

  if (isPcieCandidate) {
    const isInternalOrOcp = desc.includes('ocp') || desc.includes('embedded') || 
                            desc.includes('lom') || desc.includes('cable') || 
                            desc.includes('cage') || desc.includes('battery');
    if (!isInternalOrOcp) {
      tally.requiredPcieCards += qty;
      const isX16 = role === 'GPU / Accelerator' || desc.includes('gpu') || 
                    desc.includes('200gb') || desc.includes('400gb') || 
                    desc.includes('infiniband') || desc.includes('mellanox') || 
                    desc.includes('nvidia');
      if (isX16) {
        tally.x16RequiredCount += qty;
      }
    }
  }
}

function tallyRiserCards(tally, desc, sku, qty, role) {
  if (role === 'PCIe Riser' || desc.includes('riser')) {
    if (desc.includes('primary riser') || desc.includes('main riser') || desc.includes('primary x16') || PRIMARY_RISER_SKUS.has(sku)) {
      tally.primaryRiserCount += qty;
    }
    if (desc.includes('secondary riser') || desc.includes('secondary x16') || SECONDARY_RISER_SKUS.has(sku)) {
      tally.secondaryRiserCount += qty;
    }
    if (desc.includes('tertiary riser') || desc.includes('tertiary x16') || TERTIARY_RISER_SKUS.has(sku)) {
      tally.tertiaryRiserCount += qty;
    }
  }
}

function tallyPcieItems(items, catalogData) {
  const skuIndex = buildCatalogSkuIndex(catalogData);
  const tally = {
    requiredPcieCards: 0,
    x16RequiredCount: 0,
    gpuCount: 0,
    primaryRiserCount: 0,
    secondaryRiserCount: 0,
    tertiaryRiserCount: 0,
    hasPrimaryCableKit: false,
    hasSecondaryCableKit: false,
    gpuPowerCableKitCount: 0,
    hasGpuPowerCableKit: false
  };

  for (const it of items) {
    const desc = (it.description || '').toLowerCase();
    const sku = cleanBaseSKU(it.sku);
    const qty = it.quantity || 1;

    let role = classifyComponentRole('', desc);
    const catalogItem = skuIndex.get(sku);
    if (catalogItem) {
      role = classifyComponentRole(catalogItem.parentCategory, desc);
    }

    tallyPcieCablesAndGpus(tally, desc, sku, qty, role);
    tallyPcieCardDemand(tally, desc, qty, role);
    tallyRiserCards(tally, desc, sku, qty, role);
  }

  return tally;
}

function calculatePcieSlots(t) {
  const activePrimarySlots = t.hasPrimaryCableKit ? 3 : 2;
  const activeSecondarySlots = t.secondaryRiserCount > 0 ? (t.hasSecondaryCableKit ? 3 : 2) : 0;
  const activeTertiarySlots = t.tertiaryRiserCount > 0 ? 2 : 0;

  const totalPhysicalSlots = 3 + (t.primaryRiserCount * 3) + (t.secondaryRiserCount * 3) + (t.tertiaryRiserCount * 2);
  const activeSlotsAvailable = activePrimarySlots + activeSecondarySlots + activeTertiarySlots;

  const isExceedingTotalSlots = t.requiredPcieCards > totalPhysicalSlots && totalPhysicalSlots > 0;
  const isExceedingActiveSlots = (t.primaryRiserCount > 0 && t.secondaryRiserCount > 0)
    ? (t.requiredPcieCards > (activePrimarySlots + activeSecondarySlots))
    : (t.requiredPcieCards > activeSlotsAvailable && activeSlotsAvailable > 0);

  // INV-31: 5 or more PCIe cards require cable kits for Slot 1 & secondary power
  const needsPrimaryCableKit = t.primaryRiserCount > 0 && !t.hasPrimaryCableKit && 
    (t.requiredPcieCards >= 5 || t.requiredPcieCards > (2 + activeSecondarySlots + activeTertiarySlots));
  
  const needsSecondaryCableKit = t.secondaryRiserCount > 0 && !t.hasSecondaryCableKit && 
    (t.requiredPcieCards >= 5 || t.requiredPcieCards > (activePrimarySlots + 2 + activeTertiarySlots) || t.requiredPcieCards > 4);

  const needsSecondaryRiser = t.requiredPcieCards > (3 + (t.primaryRiserCount * 3)) && t.secondaryRiserCount === 0;
  const needsGpuPowerCableKit = t.gpuCount > t.gpuPowerCableKitCount;

  // x16 Lanes
  const x16LanesAvailable = (t.primaryRiserCount > 0 ? (t.hasPrimaryCableKit ? 2 : 1) : 1) + 
                            (t.secondaryRiserCount > 0 ? (t.hasSecondaryCableKit ? 2 : 1) : 0) + 
                            (t.tertiaryRiserCount > 0 ? 1 : 0);
  const laneBifurcationConstraint = t.x16RequiredCount > x16LanesAvailable;

  return {
    totalPhysicalSlots,
    activeSlotsAvailable,
    isExceedingTotalSlots,
    isExceedingActiveSlots,
    needsPrimaryCableKit,
    needsSecondaryCableKit,
    needsSecondaryRiser,
    needsGpuPowerCableKit,
    x16LanesAvailable,
    laneBifurcationConstraint
  };
}

function evalPcieRiserSlots(items, catalogData = null) {
  const t = tallyPcieItems(items, catalogData);
  const s = calculatePcieSlots(t);

  return {
    requiredPcieCards: t.requiredPcieCards,
    x16RequiredCount: t.x16RequiredCount,
    x16LanesAvailable: s.x16LanesAvailable,
    laneBifurcationConstraint: s.laneBifurcationConstraint,
    gpuCount: t.gpuCount,
    primaryRiserCount: t.primaryRiserCount,
    secondaryRiserCount: t.secondaryRiserCount,
    tertiaryRiserCount: t.tertiaryRiserCount,
    totalPhysicalSlots: s.totalPhysicalSlots,
    totalSlotsAvailable: s.totalPhysicalSlots,
    activeSlotsAvailable: s.activeSlotsAvailable,
    hasPrimaryCableKit: t.hasPrimaryCableKit,
    hasSecondaryCableKit: t.hasSecondaryCableKit,
    gpuPowerCableKitCount: t.gpuPowerCableKitCount,
    hasGpuPowerCableKit: t.hasGpuPowerCableKit,
    needsGpuPowerCableKit: s.needsGpuPowerCableKit,
    needsPrimaryCableKit: s.needsPrimaryCableKit,
    needsSecondaryCableKit: s.needsSecondaryCableKit,
    isExceedingActiveSlots: s.isExceedingActiveSlots,
    isExceedingTotalSlots: s.isExceedingTotalSlots,
    needsSecondaryRiser: s.needsSecondaryRiser
  };
}

module.exports = {
  evalPcieRiserSlots
};

