'use strict';
/**
 * scripts/lib/aspects/networking_ocp.js — Networking & OCP 3.0 Interconnect Aspect Pre-Check
 */

const { cleanBaseSKU } = require('../catalog/sku.js');
const { classifyComponentRole } = require('../catalog/product_meta.js');

function buildSkuCategoryMap(catalogData) {
  const map = new Map();
  if (catalogData && Array.isArray(catalogData.entries)) {
    for (const e of catalogData.entries) {
      if (Array.isArray(e.skus)) {
        for (const s of e.skus) {
          const sClean = cleanBaseSKU(s['Product #'] || s.sku);
          if (sClean) map.set(sClean, e.parentCategory || e.subCategory || '');
        }
      }
    }
  }
  return map;
}

function parseAdapterPortCount(desc) {
  const explicitPortMatch = desc.match(/(\d+)\s*-?\s*port/i) || desc.match(/\b(1|2|4|8)\s*p\b/i);
  if (explicitPortMatch) {
    return parseInt(explicitPortMatch[1], 10) || 2;
  }
  if (desc.match(/\b(quad|4x|4-port)\b/i)) return 4;
  if (desc.match(/\b(dual|2x|2-port)\b/i)) return 2;
  if (desc.match(/\b(single|1x|1-port)\b/i)) return 1;
  return 2;
}

function parseSynergyMezzanine(it, desc, sku) {
  let mezzSlot = 0;
  if (desc.includes('mezzanine 1') || desc.includes('mezz 1')) mezzSlot = 1;
  else if (desc.includes('mezzanine 2') || desc.includes('mezz 2')) mezzSlot = 2;
  else if (desc.includes('mezzanine 3') || desc.includes('mezz 3')) mezzSlot = 3;

  let type = 'ethernet';
  if (desc.includes('fc ') || desc.includes('fibre channel')) type = 'fc';
  else if (desc.includes('sas')) type = 'sas';

  return { it, desc, sku, mezzSlot, type };
}

function tallyNetworkingItems(items, skuCategoryMap) {
  const tally = {
    networkPortsCount: 0,
    ocpAdapterCount: 0,
    hasOcpAdapter: false,
    hasCpu1Ocp2Cable: false,
    hasCpu2Ocp2Cable: false,
    ocpCableItems: [],
    fcHbaCount: 0,
    fcHbaPortCount32Gb: 0,
    fcHbaPortCount64Gb: 0,
    transceiverCount32Gb: 0,
    transceiverCount64Gb: 0,
    sanSwitchCount: 0,
    opticalPatchCableCount: 0,
    activeOpticalTransceiverCount: 0,
    qsfp28BreakoutCableCount: 0,
    synergyMezzCards: [],
    synergyInterconnects: []
  };

  for (const it of items) {
    const desc = (it.description || '').toLowerCase();
    const sku = cleanBaseSKU(it.sku);
    const qty = it.quantity || 1;
    const mappedCategory = skuCategoryMap.get(sku) || '';
    const role = classifyComponentRole(mappedCategory, desc);

    // CPU/OCP Enablement Cables
    if (sku === 'P51911-B21' || (desc.includes('ocp') && desc.includes('enablement') && (desc.includes('pri') || desc.includes('primary') || desc.includes('cpu1')))) {
      tally.hasCpu1Ocp2Cable = true;
      tally.ocpCableItems.push(it);
    }
    if (sku === 'P48830-B21' || (desc.includes('ocp') && desc.includes('enablement') && (desc.includes('sec') || desc.includes('secondary') || desc.includes('cpu2')))) {
      tally.hasCpu2Ocp2Cable = true;
      tally.ocpCableItems.push(it);
    }

    // Synergy Interconnects
    if (desc.includes('synergy') && (desc.includes('interconnect') || desc.includes('virtual connect') || desc.includes('switch module'))) {
      tally.synergyInterconnects.push({ it, desc, sku });
    }

    // Fibre Channel HBAs
    if (role === 'Fibre Channel HBA' || role === 'Host Bus Adapter' || desc.includes('fc hba') || desc.includes('fibre channel host bus adapter') || desc.includes('fibre channel')) {
      if (desc.includes('host bus adapter') || desc.includes('hba')) {
        tally.fcHbaCount += qty;
        let ports = 2;
        if (desc.includes('1-port') || desc.includes('1p') || desc.match(/1\s*-?port/i)) ports = 1;
        if (desc.includes('4-port') || desc.includes('4p') || desc.match(/4\s*-?port/i)) ports = 4;

        if (desc.includes('32gb')) tally.fcHbaPortCount32Gb += (ports * qty);
        else if (desc.includes('64gb')) tally.fcHbaPortCount64Gb += (ports * qty);
      }
    }

    // Transceivers & SAN switches
    if (role === 'Transceiver' || desc.includes('transceiver') || desc.includes('sfp') || desc.includes('qsfp')) {
      if (desc.includes('32gb') || sku === 'AJ718A' || sku === 'aj718a') {
        tally.transceiverCount32Gb += qty;
        tally.activeOpticalTransceiverCount += qty;
      }
      if (desc.includes('64gb')) {
        tally.transceiverCount64Gb += qty;
        tally.activeOpticalTransceiverCount += qty;
      }
    }
    if (desc.includes('san switch') || desc.includes('fibre channel switch')) tally.sanSwitchCount += qty;
    if (desc.includes('om4') && desc.includes('lc-lc') && desc.includes('cable')) tally.opticalPatchCableCount += qty;
    if (desc.includes('100gb qsfp28 to 4x 25gb sfp28') || (desc.includes('100gb') && desc.includes('breakout'))) tally.qsfp28BreakoutCableCount += qty;

    // OCP Storage Controllers
    const isOcpStorage = (role === 'Storage Controller' || desc.includes('controller') || desc.includes('raid')) && 
                         (desc.includes('ocp') || /\b(mr|sr)\d{3}i-o\b/i.test(desc) || desc.includes('-o'));
    if (isOcpStorage) {
      tally.ocpAdapterCount += qty;
    }

    if (role === 'Transceiver' || role === 'Cable Kit' || role === 'Storage Controller' || role === 'Storage Battery' || 
        desc.includes('transceiver') || desc.includes('cable') || desc.includes('controller') || desc.includes('battery')) {
      continue;
    }

    // Network Adapters
    if (role === 'Network Adapter' || desc.includes('ethernet') || desc.includes('adapter') || 
        desc.includes('nic') || desc.includes('sfp') || desc.includes('infiniband') || 
        desc.includes('slingshot') || desc.includes('mezzanine')) {
      if (desc.includes('synergy') && desc.includes('mezz')) {
        tally.synergyMezzCards.push(parseSynergyMezzanine(it, desc, sku));
      }

      if (desc.includes('ocp') || desc.includes('flr') || desc.includes('flexlom') || desc.includes('ocp3')) {
        tally.hasOcpAdapter = true;
        tally.ocpAdapterCount += qty;
      }

      const portsPerCard = parseAdapterPortCount(desc);
      tally.networkPortsCount += (portsPerCard * qty);
    }
  }

  return tally;
}

function validateSanTransceivers(t) {
  return {
    isMissing32GbTransceivers: t.fcHbaPortCount32Gb > t.transceiverCount32Gb,
    isMissing64GbTransceivers: t.fcHbaPortCount64Gb > t.transceiverCount64Gb,
    isMissingOpticalPatchCables: t.activeOpticalTransceiverCount > t.opticalPatchCableCount,
    hasSanSinglePointOfFailure: t.fcHbaCount > 0 && t.sanSwitchCount === 1
  };
}

function validateSynergyFabrics(synergyInterconnects, synergyMezzCards) {
  let hasSynergyFabricMismatch = false;
  const synergyFabricErrors = [];

  for (const ic of synergyInterconnects) {
    const bays = [];
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

  return { hasSynergyFabricMismatch, synergyFabricErrors };
}

function evalNetworkingOcp(items, catalogData = null) {
  let maxOcpSlots = 2;
  if (catalogData && catalogData.entries) {
    const ocpEntry = catalogData.entries.find(e => (e.parentCategory || '').toLowerCase().includes('network') || (e.subCategory || '').toLowerCase().includes('ocp'));
    if (ocpEntry && typeof ocpEntry.maxQty === 'number' && ocpEntry.maxQty > 0) {
      maxOcpSlots = ocpEntry.maxQty;
    }
  }

  const skuCategoryMap = buildSkuCategoryMap(catalogData);
  const t = tallyNetworkingItems(items, skuCategoryMap);

  const san = validateSanTransceivers(t);
  const synergy = validateSynergyFabrics(t.synergyInterconnects, t.synergyMezzCards);

  return {
    fcHbaCount: t.fcHbaCount,
    fcHbaPortCount32Gb: t.fcHbaPortCount32Gb,
    fcHbaPortCount64Gb: t.fcHbaPortCount64Gb,
    transceiverCount32Gb: t.transceiverCount32Gb,
    transceiverCount64Gb: t.transceiverCount64Gb,
    sanSwitchCount: t.sanSwitchCount,
    opticalPatchCableCount: t.opticalPatchCableCount,
    activeOpticalTransceiverCount: t.activeOpticalTransceiverCount,
    qsfp28BreakoutCableCount: t.qsfp28BreakoutCableCount,
    isMissing32GbTransceivers: san.isMissing32GbTransceivers,
    isMissing64GbTransceivers: san.isMissing64GbTransceivers,
    isMissingOpticalPatchCables: san.isMissingOpticalPatchCables,
    hasSanSinglePointOfFailure: san.hasSanSinglePointOfFailure,
    networkPortsCount: t.networkPortsCount,
    hasOcpAdapter: t.hasOcpAdapter,
    ocpAdapterCount: t.ocpAdapterCount,
    maxOcpSlots,
    isExceedingOcpSlots: t.ocpAdapterCount > maxOcpSlots,
    hasCpu1Ocp2Cable: t.hasCpu1Ocp2Cable,
    hasCpu2Ocp2Cable: t.hasCpu2Ocp2Cable,
    hasConflictingOcpCables: t.hasCpu1Ocp2Cable && t.hasCpu2Ocp2Cable,
    ocpCableItems: t.ocpCableItems,
    hasSynergyFabricMismatch: synergy.hasSynergyFabricMismatch,
    synergyFabricErrors: synergy.synergyFabricErrors
  };
}

module.exports = {
  evalNetworkingOcp
};
