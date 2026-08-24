'use strict';
/**
 * scripts/lib/aspects/pcie_riser.js — PCIe Slot Capacity & Riser Aspect Pre-Check
 */

const { cleanBaseSKU } = require('../catalog/sku.js');
const { classifyComponentRole } = require('../catalog/product_meta.js');

function evalPcieRiserSlots(items, catalogData = null) {
  let requiredPcieCards = 0;
  let primaryRiserCount = 0;
  let secondaryRiserCount = 0;
  let tertiaryRiserCount = 0;

  for (const it of items) {
    const desc = (it.description || '').toLowerCase();
    let role = classifyComponentRole('', desc);
    if (catalogData && catalogData.entries) {
      const match = catalogData.entries.find(e => e.skus && e.skus.find(s => cleanBaseSKU(s['Product #']) === cleanBaseSKU(it.sku)));
      if (match) role = classifyComponentRole(match.parentCategory, desc);
    }

    if (role === 'Transceiver' || role === 'Cable Kit' || role === 'Storage Battery' || role === 'Boot Device' || role === 'Chassis Infrastructure' || role === 'Service & Support' || role === 'Operating System / License') continue;

    if (role === 'GPU / Accelerator' || role === 'Network Adapter' || role === 'Storage Controller' || role === 'Fibre Channel HBA' || desc.includes('adapter') || desc.includes('controller') || desc.includes('hba') || desc.includes('nvidia') || desc.includes('pcie') || desc.includes('gpu')) {
      if (!desc.includes('ocp') && !desc.includes('embedded') && !desc.includes('lom') && !desc.includes('cable') && !desc.includes('cage') && !desc.includes('battery')) {
        requiredPcieCards += (it.quantity || 1);
      }
    }

    if (role === 'PCIe Riser' || desc.includes('riser')) {
      if (desc.includes('primary riser') || desc.includes('main riser')) primaryRiserCount += (it.quantity || 1);
      if (desc.includes('secondary riser')) secondaryRiserCount += (it.quantity || 1);
      if (desc.includes('tertiary riser')) tertiaryRiserCount += (it.quantity || 1);
    }
  }

  const totalSlotsAvailable = 3 + (primaryRiserCount * 3) + (secondaryRiserCount * 3) + (tertiaryRiserCount * 2);
  const needsSecondaryRiser = requiredPcieCards > (3 + primaryRiserCount * 3);

  return { requiredPcieCards, primaryRiserCount, secondaryRiserCount, tertiaryRiserCount, totalSlotsAvailable, needsSecondaryRiser };
}

module.exports = {
  evalPcieRiserSlots
};
