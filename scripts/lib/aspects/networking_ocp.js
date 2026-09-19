'use strict';
/**
 * scripts/lib/aspects/networking_ocp.js — Networking & OCP 3.0 Interconnect Aspect Pre-Check
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

function tallyOcpAndCables(tally, it, desc, sku, qty, role, mandatorySkus = {}) {
  // CPU/OCP Enablement Cables
  const isCpu1Ocp = (mandatorySkus?.CPU1_OCP_CABLE?.sku && sku === cleanBaseSKU(mandatorySkus.CPU1_OCP_CABLE.sku)) ||
                    (desc.includes('ocp') && desc.includes('enablement') && (desc.includes('pri') || desc.includes('primary') || desc.includes('cpu1')));
  if (isCpu1Ocp) {
    tally.hasCpu1Ocp2Cable = true;
    tally.ocpCableItems.push(it);
  }

  const isCpu2Ocp = (mandatorySkus?.CPU2_OCP_CABLE?.sku && sku === cleanBaseSKU(mandatorySkus.CPU2_OCP_CABLE.sku)) ||
                    (desc.includes('ocp') && desc.includes('enablement') && (desc.includes('sec') || desc.includes('secondary') || desc.includes('cpu2')));
  if (isCpu2Ocp) {
    tally.hasCpu2Ocp2Cable = true;
    tally.ocpCableItems.push(it);
  }

  // OCP Storage Controllers
  const isOcpStorage = (role === 'Storage Controller' || desc.includes('controller') || desc.includes('raid')) && 
                       (desc.includes('ocp') || /\b(mr|sr)\d{3}i-o\b/i.test(desc) || desc.includes('-o'));
  if (isOcpStorage) {
    tally.ocpAdapterCount += qty;
  }
}

function tallyFcHbas(tally, desc, sku, qty, role) {
  const isFcRole = role === 'Fibre Channel HBA' || role === 'Host Bus Adapter' || desc.includes('fc hba') || desc.includes('fibre channel host bus adapter') || desc.includes('fibre channel');
  if (!isFcRole) return;

  if (desc.includes('host bus adapter') || desc.includes('hba')) {
    tally.fcHbaCount += qty;
    let ports = 2;
    if (desc.includes('1-port') || desc.includes('1p') || desc.match(/1\s*-?port/i)) ports = 1;
    if (desc.includes('4-port') || desc.includes('4p') || desc.match(/4\s*-?port/i)) ports = 4;

    const totalPorts = ports * qty;
    const cleanSku = cleanBaseSKU(sku);
    // HPE SN1610Q / SN1610E include optical transceivers pre-installed in the box per HPE QuickSpecs
    const includesTransceivers = cleanSku === 'R2E09A' || cleanSku === 'R2E08A' || cleanSku === 'R2J62A' || cleanSku === 'R2J63A';

    if (desc.includes('32gb')) {
      tally.fcHbaPortCount32Gb += totalPorts;
      if (includesTransceivers) {
        tally.includedTransceiverCount32Gb += totalPorts;
      }
    } else if (desc.includes('64gb')) {
      tally.fcHbaPortCount64Gb += totalPorts;
      if (includesTransceivers) {
        tally.includedTransceiverCount64Gb += totalPorts;
      }
    }
  }
}

function tallyTransceiversAndSanSwitches(tally, desc, sku, qty, role) {
  const isTransceiverRole = role === 'Transceiver' || desc.includes('transceiver') || desc.includes('sfp') || desc.includes('qsfp');
  if (isTransceiverRole) {
    if (desc.includes('32gb') || desc.includes('32g fc') || desc.includes('32gbs') || desc.includes('32g')) {
      tally.transceiverCount32Gb += qty;
      tally.activeOpticalTransceiverCount += qty;
    }
    if (desc.includes('64gb') || desc.includes('64g fc') || desc.includes('64gbs') || desc.includes('64g')) {
      tally.transceiverCount64Gb += qty;
      tally.activeOpticalTransceiverCount += qty;
    }
  }
  if (desc.includes('san switch') || desc.includes('fibre channel switch')) tally.sanSwitchCount += qty;
  if (desc.includes('om4') && desc.includes('lc-lc') && desc.includes('cable')) tally.opticalPatchCableCount += qty;
  if (desc.includes('100gb qsfp28 to 4x 25gb sfp28') || (desc.includes('100gb') && desc.includes('breakout'))) tally.qsfp28BreakoutCableCount += qty;
}

function tallyFcHbasAndSan(tally, desc, sku, qty, role) {
  tallyFcHbas(tally, desc, sku, qty, role);
  tallyTransceiversAndSanSwitches(tally, desc, sku, qty, role);
}

function tallyNetworkAdaptersAndInterconnects(tally, it, desc, sku, qty, role) {
  // Synergy Interconnects
  if (desc.includes('synergy') && (desc.includes('interconnect') || desc.includes('virtual connect') || desc.includes('switch module'))) {
    tally.synergyInterconnects.push({ it, desc, sku });
  }

  // Synergy Mezzanines
  if (desc.includes('synergy') && desc.includes('mezzanine')) {
    tally.synergyMezzCards.push(parseSynergyMezzanine(it, desc, sku));
  }

  // Standard Network Adapters
  const isAdapter = role === 'Network Adapter' || desc.includes('adapter') || desc.includes('ethernet') || desc.includes('nic') || desc.includes('sfp28') || desc.includes('baset') || desc.includes('flr');
  if (isAdapter && !desc.includes('interconnect') && !desc.includes('switch') && !desc.includes('transceiver') && !desc.includes('cable') && !desc.includes('mezzanine') && !desc.includes('enablement')) {
    if (desc.includes('ocp') || desc.includes('flr') || desc.includes('standup')) {
      tally.hasOcpAdapter = true;
      tally.ocpAdapterCount += qty;
    }

    const portsPerCard = parseAdapterPortCount(desc);
    tally.networkPortsCount += (portsPerCard * qty);
  }
}

function tallyNetworkingItems(items, skuCategoryMap, mandatorySkus = {}) {
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
    includedTransceiverCount32Gb: 0,
    includedTransceiverCount64Gb: 0,
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

    tallyOcpAndCables(tally, it, desc, sku, qty, role, mandatorySkus);
    tallyFcHbasAndSan(tally, desc, sku, qty, role);
    tallyNetworkAdaptersAndInterconnects(tally, it, desc, sku, qty, role);
  }

  return tally;
}

function validateSanTransceivers(t) {
  const effective32Gb = t.transceiverCount32Gb + (t.includedTransceiverCount32Gb || 0);
  const effective64Gb = t.transceiverCount64Gb + (t.includedTransceiverCount64Gb || 0);
  return {
    isMissing32GbTransceivers: t.fcHbaPortCount32Gb > effective32Gb,
    isMissing64GbTransceivers: t.fcHbaPortCount64Gb > effective64Gb,
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

function evalNetworkingOcp(items, catalogData = null, mandatorySkus = {}, serverCount = 1) {
  let maxOcpSlots = 2;
  if (catalogData && catalogData.entries) {
    const ocpEntry = catalogData.entries.find(e => (e.parentCategory || '').toLowerCase().includes('network') || (e.subCategory || '').toLowerCase().includes('ocp'));
    if (ocpEntry && typeof ocpEntry.maxQty === 'number' && ocpEntry.maxQty > 0) {
      maxOcpSlots = ocpEntry.maxQty;
    }
  }

  const skuCategoryMap = buildSkuCategoryMap(catalogData);
  const t = tallyNetworkingItems(items, skuCategoryMap, mandatorySkus);

  const san = validateSanTransceivers(t);
  const synergy = validateSynergyFabrics(t.synergyInterconnects, t.synergyMezzCards);
  const nodes = Math.max(1, serverCount || 1);

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
    isExceedingOcpSlots: t.ocpAdapterCount > (maxOcpSlots * nodes),
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
