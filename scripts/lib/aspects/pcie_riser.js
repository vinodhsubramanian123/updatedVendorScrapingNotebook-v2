'use strict';
/**
 * scripts/lib/aspects/pcie_riser.js — PCIe Slot Capacity & Riser Aspect Pre-Check
 */

const { cleanBaseSKU } = require('../catalog/sku.js');
const { classifyComponentRole } = require('../catalog/product_meta.js');

function evalPcieRiserSlots(items, catalogData = null) {
  let requiredPcieCards = 0;
  let gpuCount = 0;
  let primaryRiserCount = 0;
  let secondaryRiserCount = 0;
  let tertiaryRiserCount = 0;
  let hasPrimaryCableKit = false;
  let hasSecondaryCableKit = false;
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
    }

    if (role === 'GPU / Accelerator' || desc.includes('nvidia') || desc.includes('a100') || desc.includes('l40s') || desc.includes('h100') || desc.includes('l4') || desc.includes('a16') || desc.includes('a30') || desc.includes('a40') || desc.includes('gpu accelerator')) {
      gpuCount += (it.quantity || 1);
    }

    if (role === 'Transceiver' || role === 'Cable Kit' || role === 'Storage Battery' || role === 'Boot Device' || role === 'Chassis Infrastructure' || role === 'Service & Support' || role === 'Operating System / License') continue;

    if (role === 'GPU / Accelerator' || role === 'Network Adapter' || role === 'Storage Controller' || role === 'Fibre Channel HBA' || desc.includes('adapter') || desc.includes('controller') || desc.includes('hba') || desc.includes('nvidia') || desc.includes('pcie') || desc.includes('gpu')) {
      if (!desc.includes('ocp') && !desc.includes('embedded') && !desc.includes('lom') && !desc.includes('cable') && !desc.includes('cage') && !desc.includes('battery')) {
        requiredPcieCards += (it.quantity || 1);
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

  // Total mechanical slot capacity (3 base default + additional risers)
  const totalSlotsAvailable = 3 + (primaryRiserCount * 3) + (secondaryRiserCount * 3) + (tertiaryRiserCount * 2);

  // CLIC Rules 81016755 & 81354683: Electrically active slot capacity
  // Primary Riser: 2 active slots (Slots 2 & 3) without P56073-B21. Slot 1 requires P56073-B21.
  // Secondary Riser: 2 active slots (Slots 5 & 6) without P56074-B21. Slot 4 requires P56074-B21.
  const activePrimarySlots = primaryRiserCount > 0 ? (hasPrimaryCableKit ? 3 * primaryRiserCount : 2 * primaryRiserCount) : 0;
  const activeSecondarySlots = secondaryRiserCount > 0 ? (hasSecondaryCableKit ? 3 * secondaryRiserCount : 2 * secondaryRiserCount) : 0;
  const activeTertiarySlots = tertiaryRiserCount * 2;
  const activeSlotsAvailable = (primaryRiserCount > 0 ? activePrimarySlots : 3) + activeSecondarySlots + activeTertiarySlots;

  const isExceedingActiveSlots = requiredPcieCards > activeSlotsAvailable;
  const needsPrimaryCableKit = primaryRiserCount > 0 && !hasPrimaryCableKit && (requiredPcieCards > (2 + activeSecondarySlots + activeTertiarySlots));
  const needsSecondaryCableKit = secondaryRiserCount > 0 && !hasSecondaryCableKit && (requiredPcieCards > (activePrimarySlots + 2 + activeTertiarySlots) || requiredPcieCards > 4);
  const needsSecondaryRiser = requiredPcieCards > (3 + (primaryRiserCount * 3)) && secondaryRiserCount === 0;
  const needsGpuPowerCableKit = gpuCount > 0 && !hasGpuPowerCableKit;

  return {
    requiredPcieCards,
    gpuCount,
    primaryRiserCount,
    secondaryRiserCount,
    tertiaryRiserCount,
    totalSlotsAvailable,
    activeSlotsAvailable,
    hasPrimaryCableKit,
    hasSecondaryCableKit,
    hasGpuPowerCableKit,
    needsGpuPowerCableKit,
    needsPrimaryCableKit,
    needsSecondaryCableKit,
    isExceedingActiveSlots,
    needsSecondaryRiser
  };
}

module.exports = {
  evalPcieRiserSlots
};
