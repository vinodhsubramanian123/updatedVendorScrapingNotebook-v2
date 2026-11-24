'use strict';
/**
 * scripts/lib/boq/composite_solution_validator.js — Multi-Domain Composite Fabric,
 * Transceiver Optical Reach & 42U Rack/Power Containment Validator (INV-280)
 */

const { cleanBaseSKU } = require('../catalog/sku.js');

const DEFAULT_MAX_RACK_U = 42;
const LOW_LINE_DERATING_FACTOR = 0.8;
const DEFAULT_MAX_RACK_KW_HIGH_LINE = 17.2;
const DEFAULT_MAX_RACK_KW_LOW_LINE = 5.76;

function _flattenSolutionItems(solutionInput = {}) {
  const items = [];
  const pushList = (list, domainHint = null) => {
    if (!Array.isArray(list)) return;
    for (const raw of list) {
      if (!raw || typeof raw !== 'object') continue;
      items.push({ ...raw, domainHint: raw.domain || raw.domainHint || domainHint });
    }
  };
  pushList(solutionInput.items);
  pushList(solutionInput.skuList);
  pushList(solutionInput.skuPartsList);
  pushList(solutionInput.sharedInfrastructure, 'INFRASTRUCTURE');
  for (const cl of (solutionInput.clusters || [])) pushList(cl?.items, 'COMPUTE');
  const cat = solutionInput.categorizedData || solutionInput.internalProductionManifest || {};
  pushList(cat.servers, 'COMPUTE');
  pushList(cat.storage, 'STORAGE');
  pushList(cat.sanFabric, 'SAN_FABRIC');
  pushList(cat.tapeBackup, 'ARCHIVE_TAPE');
  return items;
}

function _classifyDomain(item) {
  const text = `${item.description || ''} ${item.desc || ''} ${item.category || ''} ${item.role || ''} ${item.domainHint || ''}`.toLowerCase();
  const sku = cleanBaseSKU(item.sku || item.pn || item['Product #'] || '');
  if (item.domainHint === 'SAN_FABRIC' || /\b(?:sn3600b|brocade|san\s*switch|fibre\s*channel\s*switch|fc\s*switch|mds)\b/i.test(text)) return 'SAN_FABRIC';
  if (item.domainHint === 'ARCHIVE_TAPE' || /\b(?:storeever|msl\d+|lto-\d|tape\s*library)\b/i.test(text)) return 'ARCHIVE_TAPE';
  if (item.domainHint === 'STORAGE' || /\b(?:alletra|nimble|storeonce|jbof|storage\s*array)\b/i.test(text) || /^S[01][A-Z]\d+/i.test(sku)) return 'STORAGE';
  if (/\b(?:transceiver|optic|sfp28|sfp\+|qsfp|fc\s*transceiver|dac\b|aoc\b|om4|om3|single[- ]mode|multimode|patch\s*cord)\b/i.test(text)) return 'OPTICS_CABLING';
  if (/\b(?:proliant|dl\d{3}|sy\d{3}|cto\s*server|hba|host\s*bus|ethernet\s*adapter|nic\b|xeon|epyc)\b/i.test(text)) return 'COMPUTE';
  return item.domainHint || 'GENERAL';
}

function _extractQuantity(item) {
  const q = Number(item.quantity ?? item.qty ?? 1);
  return Number.isFinite(q) && q > 0 ? q : 1;
}

function _extractPortsPerSwitch(item) {
  if (typeof item.licensedPorts === 'number' && Number.isFinite(item.licensedPorts) && item.licensedPorts > 0) return item.licensedPorts;
  if (typeof item.ports === 'number' && Number.isFinite(item.ports) && item.ports > 0) return item.ports;
  const text = `${item.description || ''} ${item.desc || ''}`;
  const m = text.match(/\b(\d{1,3})\s*(?:-?\s*port|p\s*active|ports?)\b/i);
  return m ? parseInt(m[1], 10) : null;
}

function _computeSanSupplyPorts(sanSwitches, options) {
  let supplyPorts = 0;
  for (const sw of sanSwitches) {
    const perUnit = _extractPortsPerSwitch(sw) ?? options.sanSwitchPortsPerUnit ?? null;
    if (perUnit === null) {
      return {
        supplyPorts: null,
        error: `Licensed port count unavailable for SAN switch ${sw.sku || sw.description || ''}.`
      };
    }
    supplyPorts += perUnit * sw._qty;
  }
  return { supplyPorts, error: null };
}

function _computeSanDemandPorts(fcEndpoints, options) {
  if (typeof options.fcDemandPorts === 'number' && Number.isFinite(options.fcDemandPorts)) {
    return { demandPorts: options.fcDemandPorts, error: null };
  }
  if (fcEndpoints.length === 0) {
    return { demandPorts: null, error: 'SAN switches present without explicit FC host/storage target port demand denominator.' };
  }
  let computed = 0;
  for (const ep of fcEndpoints) {
    const desc = ep.description || '';
    const perUnit = typeof ep.ports === 'number' && ep.ports > 0 ? ep.ports : (/dual[- ]?port|2p\b/i.test(desc) ? 2 : null);
    if (perUnit === null) {
      return { demandPorts: null, error: `FC port count unavailable for endpoint ${ep.sku || desc}.` };
    }
    computed += perUnit * ep._qty;
  }
  return { demandPorts: computed, error: null };
}

function _checkSanFabricPortBudget(items, domainsPresent, options = {}) {
  const requireDualFabric = options.requireDualFabric !== false;
  const sanSwitches = items.filter(it => it._domain === 'SAN_FABRIC');
  const fcEndpoints = items.filter(it => /\b(?:fc\s*hba|fibre\s*channel|sn1[126]00e|lpe3\d+|qle\d+|fc\s*target|lto-\d.*fc|alletra.*fc)\b/i.test(`${it.description || ''} ${it.category || ''} ${it.role || ''}`));

  if (sanSwitches.length === 0 && fcEndpoints.length === 0 && !options.requireSanContainment) {
    return { id: 'SAN_FABRIC_PORT_BUDGET', status: 'NOT_APPLICABLE', detail: 'No SAN switch or Fibre Channel endpoints in solution.', supplyPorts: 0, demandPorts: 0 };
  }
  const switchCount = sanSwitches.reduce((sum, it) => sum + it._qty, 0);
  if (requireDualFabric && switchCount > 0 && switchCount < 2) {
    return { id: 'SAN_FABRIC_PORT_BUDGET', status: 'FAIL', detail: `Single SAN switch (${switchCount}) violates 2N dual-fabric redundancy requirement.`, supplyPorts: null, demandPorts: null };
  }
  if (switchCount === 0 && (options.requireSanContainment || fcEndpoints.length > 0)) {
    return { id: 'SAN_FABRIC_PORT_BUDGET', status: 'FAIL', detail: 'FC storage/host endpoints present without SAN fabric switches.', supplyPorts: 0, demandPorts: null };
  }

  const supply = _computeSanSupplyPorts(sanSwitches, options);
  if (supply.error) {
    return { id: 'SAN_FABRIC_PORT_BUDGET', status: 'UNKNOWN', detail: supply.error, supplyPorts: null, demandPorts: null };
  }
  const demand = _computeSanDemandPorts(fcEndpoints, options);
  if (demand.error) {
    return { id: 'SAN_FABRIC_PORT_BUDGET', status: 'UNKNOWN', detail: demand.error, supplyPorts: supply.supplyPorts, demandPorts: null };
  }
  if (demand.demandPorts > supply.supplyPorts) {
    return { id: 'SAN_FABRIC_PORT_BUDGET', status: 'FAIL', detail: `SAN fabric port deficit: ${demand.demandPorts} required ports exceed ${supply.supplyPorts} licensed switch ports.`, supplyPorts: supply.supplyPorts, demandPorts: demand.demandPorts };
  }
  return { id: 'SAN_FABRIC_PORT_BUDGET', status: 'PASS', detail: `2N SAN fabric port budget satisfied (${demand.demandPorts}/${supply.supplyPorts} ports allocated, ${domainsPresent.length} domains).`, supplyPorts: supply.supplyPorts, demandPorts: demand.demandPorts };
}

function _parseOpticalTraits(text = '') {
  const lower = String(text || '').toLowerCase();
  const protocol = /\b(?:fc|fibre\s*channel|swl?|lwl?|16gfc|32gfc|64gfc)\b/i.test(lower)
    ? 'FC'
    : (/\b(?:eth|ethernet|sfp28|qsfp28|qsfp-dd|10gbe|25gbe|100gbe|400gbe|sr\d*|lr\d*)\b/i.test(lower) ? 'ETH' : null);
  const speedMatch = lower.match(/\b(400|200|100|64|50|40|32|25|16|10)\s*g(?:b|be|fc)?\b/i);
  const speedGb = speedMatch ? parseInt(speedMatch[1], 10) : null;
  const media = /\b(?:om3|om4|om5|mmf|multimode|swl?|sr\d*)\b/i.test(lower)
    ? 'MM'
    : (/\b(?:smf|single[- ]?mode|os2|lwl?|lr\d*|er\d*)\b/i.test(lower) ? 'SM' : null);
  return { protocol, speedGb, media };
}

function _checkTransceiverOpticalCompatibility(items) {
  const opticalDrivers = items.filter(it => it._domain === 'SAN_FABRIC' || /\b(?:10g|25g|100g|400g|32g|64g|sfp|qsfp|fc\s*hba|switch)\b/i.test(it.description || ''));
  const optics = items.filter(it => it._domain === 'OPTICS_CABLING');
  if (opticalDrivers.length === 0 && optics.length === 0) {
    return { id: 'TRANSCEIVER_OPTICAL_COMPATIBILITY', status: 'NOT_APPLICABLE', detail: 'No high-speed optical fabric or transceivers detected.' };
  }

  const hasBundledOptics = opticalDrivers.some(d => /\b(?:with\s*optics|bundled\s*sfp|transceivers?\s*included)\b/i.test(d.description || ''));
  if (optics.length === 0 && !hasBundledOptics) {
    return { id: 'TRANSCEIVER_OPTICAL_COMPATIBILITY', status: 'UNKNOWN', detail: 'Optical switch/adapter hardware present without specified transceivers or optical media.' };
  }

  const opticTraits = optics.map(o => ({ item: o, traits: _parseOpticalTraits(`${o.description || ''} ${o.desc || ''}`) }));
  const mediaSet = new Set(opticTraits.map(x => x.traits.media).filter(Boolean));
  if (mediaSet.has('MM') && mediaSet.has('SM')) {
    return { id: 'TRANSCEIVER_OPTICAL_COMPATIBILITY', status: 'FAIL', detail: 'Optical media mismatch: multimode (MM/OM4/SR/SW) and single-mode (SM/LR/LW) optics/cables mixed on same fabric.' };
  }

  for (const drv of opticalDrivers) {
    const dt = _parseOpticalTraits(drv.description || '');
    for (const op of opticTraits) {
      if (dt.protocol && op.traits.protocol && dt.protocol !== op.traits.protocol) {
        return { id: 'TRANSCEIVER_OPTICAL_COMPATIBILITY', status: 'FAIL', detail: `Protocol mismatch: ${dt.protocol} device paired with ${op.traits.protocol} transceiver (${op.item.sku || op.item.description || ''}).` };
      }
      if (dt.speedGb && op.traits.speedGb && dt.speedGb !== op.traits.speedGb) {
        const compatibleFcStep = dt.protocol === 'FC' && op.traits.speedGb * 2 === dt.speedGb;
        if (!compatibleFcStep) {
          return { id: 'TRANSCEIVER_OPTICAL_COMPATIBILITY', status: 'FAIL', detail: `Optical speed mismatch: ${dt.speedGb}G host/switch port paired with ${op.traits.speedGb}G optic (${op.item.sku || ''}).` };
        }
      }
    }
  }

  return { id: 'TRANSCEIVER_OPTICAL_COMPATIBILITY', status: 'PASS', detail: `Verified ${optics.length} optical/transceiver item(s) compatible with target fabric speeds and media.` };
}

function _estimateItemRackUnits(item) {
  if (typeof item.rackUnits === 'number' && Number.isFinite(item.rackUnits)) return item.rackUnits;
  if (item._domain === 'OPTICS_CABLING') return 0;
  const text = String(item.description || item.desc || '').toLowerCase();
  const uMatch = text.match(/\b([1-8])u\b/);
  if (uMatch) return parseInt(uMatch[1], 10);
  if (item._domain === 'SAN_FABRIC') return 1;
  if (item._domain === 'ARCHIVE_TAPE') return 3;
  if (item._domain === 'STORAGE') return /\b4u\b/.test(text) ? 4 : 2;
  if (item._domain === 'COMPUTE' && /\b(?:dl\d{3}|cto\s*server|server\s*chassis)\b/i.test(text)) {
    return /\bdl360\b|\bdl325\b|\bdl145\b/.test(text) ? 1 : (/\bdl580\b/.test(text) ? 4 : 2);
  }
  return 0;
}

function _estimateItemWatts(item) {
  if (typeof item.watts === 'number' && Number.isFinite(item.watts)) return item.watts;
  if (typeof item.peakWatts === 'number' && Number.isFinite(item.peakWatts)) return item.peakWatts;
  const text = String(item.description || '').toLowerCase();
  const wMatch = text.match(/\b(\d{3,4})\s*w\b/);
  if (wMatch && /\b(?:psu|power\s*supply|watt|switch|array|jbof)\b/i.test(text)) {
    return Math.round(parseInt(wMatch[1], 10) * 0.75);
  }
  return null;
}

function _checkRackPowerEnvelope(items, options = {}) {
  const maxRackU = options.maxRackU || DEFAULT_MAX_RACK_U;
  let totalRackUnits = 0;
  let totalWatts = 0;
  let wattageObserved = false;

  for (const it of items) {
    totalRackUnits += _estimateItemRackUnits(it) * it._qty;
    const w = _estimateItemWatts(it);
    if (w !== null) {
      totalWatts += w * it._qty;
      wattageObserved = true;
    }
  }
  if (typeof options.totalWattsOverride === 'number' && Number.isFinite(options.totalWattsOverride)) {
    totalWatts = options.totalWattsOverride;
    wattageObserved = true;
  }

  const rackCount42U = totalRackUnits > 0 ? Math.ceil(totalRackUnits / maxRackU) : null;
  const highLineKw = wattageObserved ? Number((totalWatts / 1000).toFixed(2)) : null;
  const lowLineKw = wattageObserved ? Number(((totalWatts / 1000) / LOW_LINE_DERATING_FACTOR).toFixed(2)) : null;
  const isLowLine = String(options.utilityLineVoltage || '').toUpperCase().includes('LOW') || Number(options.voltage) <= 120;
  const rackLimitKw = options.maxRackKw || (isLowLine ? DEFAULT_MAX_RACK_KW_LOW_LINE : DEFAULT_MAX_RACK_KW_HIGH_LINE);

  let status = 'PASS';
  let detail = `Rack footprint: ${totalRackUnits}U (${rackCount42U ?? 0} x ${maxRackU}U rack); power ${highLineKw ?? 'UNKNOWN'} kW high-line / ${lowLineKw ?? 'UNKNOWN'} kW low-line.`;
  if (options.singleRackRequired && totalRackUnits > maxRackU) {
    status = 'FAIL';
    detail = `Rack U-height overflow: ${totalRackUnits}U exceeds single ${maxRackU}U rack ceiling.`;
  } else if (wattageObserved) {
    const effectiveKw = isLowLine ? lowLineKw : highLineKw;
    const perRackKw = rackCount42U ? effectiveKw / rackCount42U : effectiveKw;
    if (perRackKw > rackLimitKw) {
      status = 'FAIL';
      detail = `Power density overflow (${isLowLine ? 'low-line derated' : 'high-line'}): ${perRackKw.toFixed(2)} kW/rack exceeds ${rackLimitKw} kW ceiling.`;
    }
  } else {
    status = 'UNKNOWN';
    detail = `Rack footprint ${totalRackUnits}U calculated, but component wattage denominators unavailable (power envelope UNKNOWN).`;
  }

  return {
    id: 'RACK_POWER_THERMAL_ENVELOPE',
    status,
    detail,
    totalRackUnits,
    rackCount42U,
    highLineKw,
    lowLineKw,
    rackLimitKw
  };
}

function validateCompositeSolutionContainment(solutionInput = {}, options = {}) {
  const flatItems = _flattenSolutionItems(solutionInput).map(it => ({
    ...it,
    _domain: _classifyDomain(it),
    _qty: _extractQuantity(it)
  }));
  const domainsPresent = [...new Set(flatItems.map(it => it._domain).filter(d => d !== 'GENERAL' && d !== 'OPTICS_CABLING'))];

  const sanCheck = _checkSanFabricPortBudget(flatItems, domainsPresent, options);
  const opticsCheck = _checkTransceiverOpticalCompatibility(flatItems);
  const rackCheck = _checkRackPowerEnvelope(flatItems, options);
  const checks = [sanCheck, opticsCheck, rackCheck];

  const blockers = checks.filter(c => c.status === 'FAIL').map(c => ({ id: c.id, detail: c.detail }));
  const unknowns = checks.filter(c => c.status === 'UNKNOWN').map(c => ({ id: c.id, detail: c.detail }));
  const status = blockers.length > 0 ? 'FAIL' : (unknowns.length > 0 ? 'UNKNOWN' : 'PASS');

  return {
    schemaVersion: '1.0',
    status,
    isCompositeMultiDomain: domainsPresent.length >= 2,
    domainsPresent,
    totalItemsChecked: flatItems.length,
    totalRackUnits: rackCheck.totalRackUnits,
    rackCount42U: rackCheck.rackCount42U,
    highLineKw: rackCheck.highLineKw,
    lowLineKw: rackCheck.lowLineKw,
    blockers,
    unknowns,
    checks
  };
}

module.exports = {
  validateCompositeSolutionContainment,
  _checkSanFabricPortBudget,
  _checkTransceiverOpticalCompatibility,
  _checkRackPowerEnvelope
};
