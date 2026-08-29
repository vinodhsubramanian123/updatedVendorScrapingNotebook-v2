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

  // SAN & Transceiver Tracking Counters
  let fcHbaCount = 0;
  let fcHbaPortCount32Gb = 0;
  let fcHbaPortCount64Gb = 0;
  let transceiverCount32Gb = 0;
  let transceiverCount64Gb = 0;
  let sanSwitchCount = 0;
  let opticalPatchCableCount = 0;
  let activeOpticalTransceiverCount = 0;
  let qsfp28BreakoutCableCount = 0;

  // Synergy Composable Infrastructure & Fabric Mapping
  let hasSynergyFabricMismatch = false;
  const synergyFabricErrors = [];
  const synergyMezzCards = [];
  const synergyInterconnects = [];

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

    // Explicit SKU & description patterns for CPU/OCP Enablement Cables
    const isCpu1OcpCable = sku === 'P51911-B21' || (desc.includes('ocp') && desc.includes('enablement') && (desc.includes('pri') || desc.includes('primary') || desc.includes('cpu1')));
    const isCpu2OcpCable = sku === 'P48830-B21' || (desc.includes('ocp') && desc.includes('enablement') && (desc.includes('sec') || desc.includes('secondary') || desc.includes('cpu2')));

    if (isCpu1OcpCable) {
      hasCpu1Ocp2Cable = true;
      ocpCableItems.push(it);
    }
    if (isCpu2OcpCable) {
      hasCpu2Ocp2Cable = true;
      ocpCableItems.push(it);
    }

    // Detect Synergy Interconnect Modules
    if (desc.includes('synergy') && (desc.includes('interconnect') || desc.includes('virtual connect') || desc.includes('switch module'))) {
      synergyInterconnects.push({ it, desc, sku });
    }

    // Parsing SAN & Transceiver Components
    const qty = it.quantity || 1;
    if (role === 'Fibre Channel HBA' || role === 'Host Bus Adapter' || desc.includes('fc hba') || desc.includes('fibre channel host bus adapter') || desc.includes('fibre channel')) {
      if (desc.includes('host bus adapter') || desc.includes('hba')) {
        fcHbaCount += qty;
        let ports = 2; // Default to dual-port
        if (desc.includes('1-port') || desc.includes('1p') || desc.match(/1\s*-?port/i)) ports = 1;
        if (desc.includes('4-port') || desc.includes('4p') || desc.match(/4\s*-?port/i)) ports = 4;

        if (desc.includes('32gb')) {
          fcHbaPortCount32Gb += (ports * qty);
        } else if (desc.includes('64gb')) {
          fcHbaPortCount64Gb += (ports * qty);
        }
      }
    }

    if (role === 'Transceiver' || desc.includes('transceiver') || desc.includes('sfp') || desc.includes('qsfp')) {
      // 32Gb transceivers (e.g., AJ718A is technically 8Gb but might be labeled 32Gb, so we match both or description)
      if (desc.includes('32gb') || sku === 'AJ718A' || sku === 'aj718a') {
        transceiverCount32Gb += qty;
        activeOpticalTransceiverCount += qty;
      }
      if (desc.includes('64gb')) {
        transceiverCount64Gb += qty;
        activeOpticalTransceiverCount += qty;
      }
    }

    if (desc.includes('san switch') || desc.includes('fibre channel switch')) {
      sanSwitchCount += qty;
    }

    if (desc.includes('om4') && desc.includes('lc-lc') && desc.includes('cable')) {
      opticalPatchCableCount += qty;
    }

    if (desc.includes('100gb qsfp28 to 4x 25gb sfp28') || (desc.includes('100gb') && desc.includes('breakout'))) {
      qsfp28BreakoutCableCount += qty;
    }

    // Account for OCP-form-factor storage controllers (e.g. MR408i-o, SR-series) which occupy an OCP slot
    const isOcpStorage = (role === 'Storage Controller' || desc.includes('controller') || desc.includes('raid')) && 
                         (desc.includes('ocp') || /\b(mr|sr)\d{3}i-o\b/i.test(desc) || desc.includes('-o'));
    if (isOcpStorage) {
      ocpAdapterCount += (it.quantity || 1);
    }

    if (role === 'Transceiver' || role === 'Cable Kit' || role === 'Storage Controller' || role === 'Storage Battery' || desc.includes('transceiver') || desc.includes('cable') || desc.includes('controller') || desc.includes('battery')) continue;

    // Detect all Network Adapters generically (Ethernet, OCP, InfiniBand, Slingshot, SFP/BASE-T, Mezzanine)
    if (role === 'Network Adapter' || desc.includes('ethernet') || desc.includes('adapter') || desc.includes('nic') || desc.includes('sfp') || desc.includes('infiniband') || desc.includes('slingshot') || desc.includes('mezzanine')) {
      // Synergy Mezzanine Cards
      if (desc.includes('synergy') && desc.includes('mezz')) {
        let mezzSlot = 0;
        if (desc.includes('mezzanine 1') || desc.includes('mezz 1')) mezzSlot = 1;
        else if (desc.includes('mezzanine 2') || desc.includes('mezz 2')) mezzSlot = 2;
        else if (desc.includes('mezzanine 3') || desc.includes('mezz 3')) mezzSlot = 3;

        let type = 'ethernet';
        if (desc.includes('fc ') || desc.includes('fibre channel')) type = 'fc';
        else if (desc.includes('sas')) type = 'sas';

        synergyMezzCards.push({ it, desc, sku, mezzSlot, type });
      }

      const isOcp = desc.includes('ocp') || desc.includes('flr') || desc.includes('flexlom') || desc.includes('ocp3');
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

  // SAN validations
  const isMissing32GbTransceivers = fcHbaPortCount32Gb > transceiverCount32Gb;
  const isMissing64GbTransceivers = fcHbaPortCount64Gb > transceiverCount64Gb;
  const isMissingOpticalPatchCables = activeOpticalTransceiverCount > opticalPatchCableCount;
  const hasSanSinglePointOfFailure = fcHbaCount > 0 && sanSwitchCount === 1;

  // Synergy Fabric Consistency Validation
  // Mezz 1 routes to Bay 1/4, Mezz 2 to Bay 2/5, Mezz 3 to Bay 3/6
  for (const ic of synergyInterconnects) {
    let bays = [];
    if (ic.desc.match(/bay\s*1\/?4/i)) bays.push(1, 4);
    else if (ic.desc.match(/bay\s*2\/?5/i)) bays.push(2, 5);
    else if (ic.desc.match(/bay\s*3\/?6/i)) bays.push(3, 6);

    let icType = 'ethernet';
    if (ic.desc.includes('fc ') || ic.desc.includes('fibre channel')) icType = 'fc';
    if (ic.desc.includes('sas')) icType = 'sas';
    ic.bays = bays;
    ic.type = icType;
  }

  for (const mezz of synergyMezzCards) {
    const expectedBays = mezz.mezzSlot === 1 ? [1, 4] : (mezz.mezzSlot === 2 ? [2, 5] : (mezz.mezzSlot === 3 ? [3, 6] : []));
    if (expectedBays.length > 0) {
      for (const ic of synergyInterconnects) {
        if (ic.bays.some(b => expectedBays.includes(b))) {
          if (mezz.type === 'ethernet' && ic.type === 'fc') {
            hasSynergyFabricMismatch = true;
            synergyFabricErrors.push(`Fabric mismatch: Ethernet Mezzanine in Mezz ${mezz.mezzSlot} routes to FC Interconnect in Bay(s) ${expectedBays.join('/')}.`);
          }
        }
      }
    }
  }

  return {
    fcHbaCount,
    fcHbaPortCount32Gb,
    fcHbaPortCount64Gb,
    transceiverCount32Gb,
    transceiverCount64Gb,
    sanSwitchCount,
    opticalPatchCableCount,
    activeOpticalTransceiverCount,
    qsfp28BreakoutCableCount,
    isMissing32GbTransceivers,
    isMissing64GbTransceivers,
    isMissingOpticalPatchCables,
    hasSanSinglePointOfFailure,
    networkPortsCount,
    hasOcpAdapter,
    ocpAdapterCount,
    maxOcpSlots,
    isExceedingOcpSlots,
    hasCpu1Ocp2Cable,
    hasCpu2Ocp2Cable,
    hasConflictingOcpCables,
    ocpCableItems,
    hasSynergyFabricMismatch,
    synergyFabricErrors
  };
}

module.exports = {
  evalNetworkingOcp
};
