'use strict';
/**
 * scripts/lib/aspects/pcie_riser.js — PCIe Slot Capacity & Riser Aspect Pre-Check
 */

const { cleanBaseSKU, buildCatalogSkuIndex } = require('../catalog/sku.js');
const { classifyComponentRole } = require('../catalog/product_meta.js');

function isGpuComponent(role, desc) {
  if (desc.includes('fio configuration')) return false;
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

function tallyPcieCablesAndGpus(tally, desc, sku, qty, role, mandatorySkus = {}) {
  const isPrimaryCable = (desc.includes('primary') && (desc.includes('cable kit') || desc.includes('prim cbl') || desc.includes('riser cable'))) ||
                         desc.includes('riser 1/6') ||
                         (role === 'PCIe Riser Cable' && desc.includes('primary')) ||
                         (mandatorySkus?.PRIMARY_CABLE_KIT?.sku && sku === cleanBaseSKU(mandatorySkus.PRIMARY_CABLE_KIT.sku));
  if (isPrimaryCable) {
    tally.hasPrimaryCableKit = true;
  }

  const isSecondaryCable = (desc.includes('secondary') && (desc.includes('cable kit') || desc.includes('sec cbl') || desc.includes('riser cable'))) ||
                           desc.includes('riser 2/5') ||
                           (role === 'PCIe Riser Cable' && desc.includes('secondary')) ||
                           (mandatorySkus?.SECONDARY_CABLE_KIT?.sku && sku === cleanBaseSKU(mandatorySkus.SECONDARY_CABLE_KIT.sku));
  if (isSecondaryCable) {
    tally.hasSecondaryCableKit = true;
  }

  const isGpuPowerCable = desc.includes('gpu power') || desc.includes('gpu cable') || desc.includes('gpu aux') || 
                          desc.includes('12vhpwr') || desc.includes('gpu 16-pin') || 
                          (role === 'Power Cable' && desc.includes('gpu')) ||
                          (mandatorySkus?.GPU_POWER_CABLE_KIT?.sku && sku === cleanBaseSKU(mandatorySkus.GPU_POWER_CABLE_KIT.sku));
  if (isGpuPowerCable) {
    tally.hasGpuPowerCableKit = true;
    // Multiplier: 16-pin / dual-GPU cables provide 2 GPU connections per kit
    const multiplier = (desc.includes('gpu 16-pin') || desc.includes('dual gpu') || desc.includes('2-gpu')) ? 2 : 1;
    tally.gpuPowerCableKitCount += (qty * multiplier);
  }

  if (isGpuComponent(role, desc)) {
    tally.gpuCount += qty;
  }
}

function tallyPcieCardDemand(tally, desc, qty, role, isDl380a = false) {
  if (isExcludedPcieRole(role)) return;
  if (desc.includes('fio configuration')) return;
  // DL380a front-bay accelerators sit on front switchboards / captive risers, not rear PCIe risers
  if (isDl380a && isGpuComponent(role, desc)) return;

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
    const parsedSlots = parseRiserSlotCount(desc);
    const position = desc.includes('secondary') || desc.includes('sec riser')
      ? 'SECONDARY'
      : (desc.includes('tertiary') || desc.includes('tert riser') ? 'TERTIARY' : 'PRIMARY');
    tally.riserEvidence.push({ sku, description: desc, position, quantity: qty, slotsPerRiser: parsedSlots.slots, evidence: parsedSlots.evidence });
    if (position === 'PRIMARY') {
      tally.primaryRiserCount += qty;
    } else if (position === 'SECONDARY') {
      tally.secondaryRiserCount += qty;
    } else if (position === 'TERTIARY') {
      tally.tertiaryRiserCount += qty;
    }
  }
}

function parseRiserSlotCount(description) {
  const desc = String(description || '').toLowerCase();
  const repeatedLanes = desc.match(/\bx(?:4|8|16)(?:\s*\/\s*x(?:4|8|16))+/i);
  if (repeatedLanes) return { slots: repeatedLanes[0].split('/').length, evidence: 'CATALOG_LANE_LAYOUT' };
  const multiplier = desc.match(/\b(\d+)\s*x\s*(?:4|8|16)\b/i) || desc.match(/\b(\d+)x(?:4|8|16)\b/i);
  if (multiplier) return { slots: Number(multiplier[1]), evidence: 'CATALOG_LANE_MULTIPLIER' };
  return { slots: desc.includes('tertiary') ? 2 : 3, evidence: 'LEGACY_POSITION_FALLBACK' };
}

function tallyPcieItems(items, catalogData, mandatorySkus = {}) {
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
    hasGpuPowerCableKit: false,
    riserEvidence: []
  };

  const isDl380a = items.some(it => {
    const d = (it.description || '').toLowerCase();
    if (d.includes('dl380a')) return true;
    const catItem = skuIndex.get(cleanBaseSKU(it.sku));
    const catDesc = (catItem?.skuData?.Description || catItem?.skuData?.description || '').toLowerCase();
    return catDesc.includes('dl380a');
  });

  for (const it of items) {
    let desc = (it.description || '').toLowerCase();
    const sku = cleanBaseSKU(it.sku);
    const qty = it.quantity || 1;

    let role = classifyComponentRole('', desc);
    const catalogItem = skuIndex.get(sku);
    if (catalogItem) {
      const catalogDescription = catalogItem.skuData?.Description || catalogItem.skuData?.description || desc;
      desc = String(catalogDescription).toLowerCase();
      const descriptionRole = classifyComponentRole('', desc);
      role = descriptionRole !== 'Option Component'
        ? descriptionRole
        : (catalogItem.skuData?.['Component Role'] || classifyComponentRole(catalogItem.parentCategory, desc));
    }

    tallyPcieCablesAndGpus(tally, desc, sku, qty, role, mandatorySkus);
    tallyPcieCardDemand(tally, desc, qty, role, isDl380a);
    tallyRiserCards(tally, desc, sku, qty, role);
  }

  return tally;
}

function calculatePcieSlots(t) {
  // Standard enterprise chassis (e.g. DL380 Gen11 / Gen12) include a default primary riser providing 3 physical slots
  // (Slot 1 x8, Slot 2 x16, Slot 3 x8) electrically routed to CPU 1.
  // Optional primary riser card kits (e.g. P48803-B21 x16/x16/x16) require a Primary Cable Kit
  // to activate Slot 1 electrically; without the cable kit, only 2 active slots are available.
  // When relying on the default embedded chassis riser, 3 standard slots are available.
  const activePrimarySlots = t.primaryRiserCount > 0 ? (t.hasPrimaryCableKit ? 3 : 2) : 3;
  const activeSecondarySlots = t.secondaryRiserCount > 0 ? (t.hasSecondaryCableKit ? 3 : 2) : 0;
  const activeTertiarySlots = t.tertiaryRiserCount > 0 ? 2 : 0;

  const installedRiserSlots = t.riserEvidence.reduce((sum, riser) => sum + (riser.slotsPerRiser * riser.quantity), 0);
  const totalPhysicalSlots = 3 + installedRiserSlots;
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
    laneBifurcationConstraint,
    installedRiserSlots
  };
}

function evalPcieRiserSlots(items, catalogData = null, mandatorySkus = {}) {
  const t = tallyPcieItems(items, catalogData, mandatorySkus);
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
    needsSecondaryRiser: s.needsSecondaryRiser,
    slotLayout: {
      scope: 'PER_NODE',
      platformBaseMechanicalSlots: 3,
      installedRiserMechanicalSlots: s.installedRiserSlots,
      totalMechanicalSlots: s.totalPhysicalSlots,
      electricallyActiveSlots: s.activeSlotsAvailable,
      x16CapableSlots: s.x16LanesAvailable,
      inputDemandPcieCards: t.requiredPcieCards,
      inputDemandGpuCards: t.gpuCount,
      risers: t.riserEvidence,
      evidenceConfidence: t.riserEvidence.length === 0 ? 0.6 : (t.riserEvidence.some(r => r.evidence === 'LEGACY_POSITION_FALLBACK') ? 0.7 : 0.95),
      requiresNotebookVerification: t.riserEvidence.length === 0 || t.riserEvidence.some(r => r.evidence === 'LEGACY_POSITION_FALLBACK')
    }
  };
}

module.exports = {
  evalPcieRiserSlots,
  parseRiserSlotCount
};
