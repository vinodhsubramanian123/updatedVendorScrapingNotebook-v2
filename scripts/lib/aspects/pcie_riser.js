'use strict';
/**
 * scripts/lib/aspects/pcie_riser.js — PCIe Slot Capacity & Riser Aspect Pre-Check
 */

const { cleanBaseSKU } = require('../catalog/sku.js');
const { classifyComponentRole } = require('../catalog/product_meta.js');

function evalPcieRiserSlots(items, catalogData = null) {
  let requiredPcieCards = 0;
  let x16RequiredCount = 0;
  let gpuCount = 0;
  let primaryRiserCount = 0;
  let secondaryRiserCount = 0;
  let tertiaryRiserCount = 0;
  let hasPrimaryCableKit = false;
  let hasSecondaryCableKit = false;
  let gpuPowerCableKitCount = 0;
  let hasGpuPowerCableKit = false;


  for (const it of items) {
    const desc = (it.description || '').toLowerCase();
    const sku = cleanBaseSKU(it.sku);

    let role = classifyComponentRole('', desc);
    if (catalogData && catalogData.entries) {
      const match = catalogData.entries.find(e => e.skus && e.skus.find(s => cleanBaseSKU(s['Product #']) === sku));
      if (match) role = classifyComponentRole(match.parentCategory, desc);
    }

    // Description-primary cable kit detection: 'primary cable kit', 'prim cbl' patterns
    // SKUs are secondary reinforcement for known Gen11/Gen12 cable kits
    if (desc.includes('primary') && (desc.includes('cable kit') || desc.includes('prim cbl') || desc.includes('riser cable')) || sku === 'P56073-B21') {
      hasPrimaryCableKit = true;
    }
    if (desc.includes('secondary') && (desc.includes('cable kit') || desc.includes('sec cbl') || desc.includes('riser cable')) || sku === 'P56074-B21') {
      hasSecondaryCableKit = true;
    }
    if (desc.includes('gpu power') || desc.includes('gpu cable') || desc.includes('gpu aux') || desc.includes('12vhpwr') || sku === 'P48816-B21' || sku === 'P76450-B21') {
      hasGpuPowerCableKit = true;
      gpuPowerCableKitCount += (it.quantity || 1);
    }

    if (role === 'GPU / Accelerator' || desc.includes('nvidia') || desc.includes('a100') || desc.includes('l40s') || desc.includes('h100') || desc.includes('l4') || desc.includes('a16') || desc.includes('a30') || desc.includes('a40') || desc.includes('gpu accelerator')) {
      gpuCount += (it.quantity || 1);
    }

    if (role === 'Transceiver' || role === 'Cable Kit' || role === 'Storage Battery' || role === 'Boot Device' || role === 'Chassis Infrastructure' || role === 'Service & Support' || role === 'Operating System / License') continue;

    if (role === 'GPU / Accelerator' || role === 'Network Adapter' || role === 'Storage Controller' || role === 'Fibre Channel HBA' || desc.includes('adapter') || desc.includes('controller') || desc.includes('hba') || desc.includes('nvidia') || desc.includes('pcie') || desc.includes('gpu')) {
      if (!desc.includes('ocp') && !desc.includes('embedded') && !desc.includes('lom') && !desc.includes('cable') && !desc.includes('cage') && !desc.includes('battery')) {
        requiredPcieCards += (it.quantity || 1);
        if (role === 'GPU / Accelerator' || desc.includes('gpu') || desc.includes('200gb') || desc.includes('400gb') || desc.includes('infiniband') || desc.includes('mellanox') || desc.includes('nvidia')) {
          x16RequiredCount += (it.quantity || 1);
        }
      }
    }

    // Description-primary riser detection: 'primary riser', 'secondary riser', 'tertiary riser' patterns
    // SKUs are secondary reinforcement for known Gen11/Gen12 risers
    if (role === 'PCIe Riser' || desc.includes('riser')) {
      if (desc.includes('primary riser') || desc.includes('main riser') || desc.includes('primary x16') || sku === 'P48803-B21') primaryRiserCount += (it.quantity || 1);
      if (desc.includes('secondary riser') || desc.includes('secondary x16') || sku === 'P51083-B21' || sku === 'P48802-B21') secondaryRiserCount += (it.quantity || 1);
      if (desc.includes('tertiary riser') || desc.includes('tertiary x16') || sku === 'P48804-B21') tertiaryRiserCount += (it.quantity || 1);
    }
  }

  // Base motherboard provides 3 default physical slots (Slots 1, 2, 3).
  // Primary Riser P48803-B21 adds/enhances 3 physical slots (Slots 1, 2, 3).
  // Without Primary Cable Kit P56073-B21, Slot 1 does not receive power/lanes from motherboard (only Slots 2 & 3 are active).
  // With Primary Cable Kit, all 3 slots are active.
  const activePrimarySlots = primaryRiserCount > 0 ? (hasPrimaryCableKit ? 3 : 2) : (hasPrimaryCableKit ? 3 : 2);
  
  // Secondary Riser P51083-B21 / P48802-B21 provides 3 physical slots (Slots 4, 5, 6).
  // Without Secondary Cable Kit P56074-B21, only 2 slots are active.
  // With Secondary Cable Kit, all 3 slots are active.
  const activeSecondarySlots = secondaryRiserCount > 0 ? (hasSecondaryCableKit ? 3 : 2) : 0;

  // Tertiary Riser provides 2 physical slots (Slots 7, 8).
  const activeTertiarySlots = tertiaryRiserCount > 0 ? 2 : 0;

  const totalPhysicalSlots = (primaryRiserCount > 0 ? 3 + (primaryRiserCount * 3) : 3) + (secondaryRiserCount * 3) + (tertiaryRiserCount * 2);
  const activeSlotsAvailable = (primaryRiserCount > 0 && secondaryRiserCount > 0)
    ? (activePrimarySlots + activeSecondarySlots + activeTertiarySlots)
    : (activePrimarySlots + activeSecondarySlots + activeTertiarySlots);

  const isExceedingTotalSlots = requiredPcieCards > totalPhysicalSlots && totalPhysicalSlots > 0;
  const isExceedingActiveSlots = (primaryRiserCount > 0 && secondaryRiserCount > 0)
    ? (requiredPcieCards > (activePrimarySlots + activeSecondarySlots))
    : (requiredPcieCards > activeSlotsAvailable && activeSlotsAvailable > 0);

  // INV-31: populating 5 or more physical PCIe cards across risers mandates Primary Cable Kit P56073-B21 for Slot 1 power delivery (Rules 81016755 & 81354683)
  const needsPrimaryCableKit = primaryRiserCount > 0 && !hasPrimaryCableKit && (requiredPcieCards >= 5 || requiredPcieCards > (2 + activeSecondarySlots + activeTertiarySlots));
  const needsSecondaryCableKit = secondaryRiserCount > 0 && !hasSecondaryCableKit && (requiredPcieCards >= 5 || requiredPcieCards > (activePrimarySlots + 2 + activeTertiarySlots) || requiredPcieCards > 4);
  const needsSecondaryRiser = requiredPcieCards > (3 + (primaryRiserCount * 3)) && secondaryRiserCount === 0;
  const needsGpuPowerCableKit = gpuCount > gpuPowerCableKitCount;

  // x16 Lane calculation: Primary Riser has 2 x16 slots (1 without cable kit), Secondary has 2 x16 slots (1 without cable kit), Base has 1 x16
  const x16LanesAvailable = (primaryRiserCount > 0 ? (hasPrimaryCableKit ? 2 : 1) : 1) + 
                            (secondaryRiserCount > 0 ? (hasSecondaryCableKit ? 2 : 1) : 0) + 
                            (tertiaryRiserCount > 0 ? 1 : 0);
  const laneBifurcationConstraint = x16RequiredCount > x16LanesAvailable;


  return {
    requiredPcieCards,
    x16RequiredCount,
    x16LanesAvailable,
    laneBifurcationConstraint,
    gpuCount,
    primaryRiserCount,
    secondaryRiserCount,
    tertiaryRiserCount,
    totalPhysicalSlots,
    totalSlotsAvailable: totalPhysicalSlots,
    activeSlotsAvailable,
    hasPrimaryCableKit,
    hasSecondaryCableKit,
    gpuPowerCableKitCount,
    hasGpuPowerCableKit,
    needsGpuPowerCableKit,
    needsPrimaryCableKit,
    needsSecondaryCableKit,
    isExceedingActiveSlots,
    isExceedingTotalSlots,
    needsSecondaryRiser
  };
}

module.exports = {
  evalPcieRiserSlots
};

