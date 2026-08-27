'use strict';
/**
 * scripts/lib/aspects/networking_ocp.js — Networking & OCP 3.0 Interconnect Aspect Pre-Check
 */

const { cleanBaseSKU } = require('../catalog/sku.js');
const { classifyComponentRole } = require('../catalog/product_meta.js');

function evalNetworkingOcp(items, catalogData = null) {
  let networkPortsCount = 0;
  let ocpAdapterCount = 0;
  let hasOcpAdapter = false;
  let maxOcpSlots = 2;
  let hasCpu1Ocp2Cable = false;
  let hasCpu2Ocp2Cable = false;
  const ocpCableItems = [];

  if (catalogData && catalogData.entries) {
    const ocpEntry = catalogData.entries.find(e => (e.parentCategory || '').toLowerCase().includes('network') || (e.subCategory || '').toLowerCase().includes('ocp'));
    if (ocpEntry && typeof ocpEntry.maxQty === 'number' && ocpEntry.maxQty > 0) {
      maxOcpSlots = ocpEntry.maxQty;
    }
  }

  for (const it of items) {
    const desc = (it.description || '').toLowerCase();
    const sku = cleanBaseSKU(it.sku);

    let role = classifyComponentRole('', desc);
    if (catalogData && catalogData.entries) {
      const match = catalogData.entries.find(e => e.skus && e.skus.find(s => cleanBaseSKU(s['Product #']) === sku));
      if (match) role = classifyComponentRole(match.parentCategory, desc);
    }

    if (sku === 'P51911-B21' || (desc.includes('cpu1') && desc.includes('ocp2'))) {
      hasCpu1Ocp2Cable = true;
      ocpCableItems.push(it);
    }
    if (sku === 'P48830-B21' || (desc.includes('cpu2') && desc.includes('ocp2'))) {
      hasCpu2Ocp2Cable = true;
      ocpCableItems.push(it);
    }

    if (role === 'Transceiver' || role === 'Cable Kit' || role === 'Storage Controller' || role === 'Storage Battery' || desc.includes('transceiver') || desc.includes('cable') || desc.includes('controller') || desc.includes('battery')) continue;

    if (role === 'Network Adapter' || desc.includes('ethernet') || desc.includes('adapter') || desc.includes('bcm5719') || desc.includes('bcm57504') || desc.includes('e810') || desc.includes('cx6')) {
      const isOcp = desc.includes('ocp') || desc.includes('flr') || desc.includes('ocp3');
      if (isOcp) {
        hasOcpAdapter = true;
        ocpAdapterCount += (it.quantity || 1);
      }

      let portsPerCard = 2;
      const explicitPortMatch = desc.match(/(\d+)\s*-?\s*port/i) || desc.match(/\b(1|2|4|8)\s*p\b/i);
      const quadMatch = desc.match(/\b(quad|4x|4-port)\b/i);
      const dualMatch = desc.match(/\b(dual|2x|2-port)\b/i);
      const singleMatch = desc.match(/\b(single|1x|1-port)\b/i);

      if (explicitPortMatch) {
        portsPerCard = parseInt(explicitPortMatch[1], 10) || 2;
      } else if (quadMatch) {
        portsPerCard = 4;
      } else if (dualMatch) {
        portsPerCard = 2;
      } else if (singleMatch) {
        portsPerCard = 1;
      }

      networkPortsCount += (portsPerCard * (it.quantity || 1));
    }
  }

  const isExceedingOcpSlots = ocpAdapterCount > maxOcpSlots;
  // CLIC Rule 81355854: CPU1/OCP2 (P51911-B21) and CPU2/OCP2 (P48830-B21) cannot be selected together
  const hasConflictingOcpCables = hasCpu1Ocp2Cable && hasCpu2Ocp2Cable;

  return {
    networkPortsCount,
    hasOcpAdapter,
    ocpAdapterCount,
    maxOcpSlots,
    isExceedingOcpSlots,
    hasCpu1Ocp2Cable,
    hasCpu2Ocp2Cable,
    hasConflictingOcpCables,
    ocpCableItems
  };
}

module.exports = {
  evalNetworkingOcp
};
