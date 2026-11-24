'use strict';

/**
 * scripts/lib/boq/synergy_composite_evaluator.js
 *
 * End-to-End Composite Evaluator for HPE Synergy 12000 Frame Solutions
 * (Synergy_12000_Frame P51174-B21 / 797740-B21 + SY480_Gen12 + SY100Gb_F32_Module
 *  + Synergy_Brocade_64Gb_FC_Module + Synergy_4Port_Frame_Link_Module).
 *
 * Enforces:
 * - Compute bay containment (<= 12 half-height bays/frame; full-height SY660/SY680 = 2 bays)
 * - Interconnect module bay pairing & redundancy (ICM bays 1+4 / 2+5 / 3+6, max 6/frame)
 * - Mezzanine-to-fabric speed & protocol matching (25/50/100Gb CNA <-> F32; 32/64Gb FC HBA <-> Brocade FC)
 * - Frame Link Module redundancy (2x 4-port FLM 876852-B21 per frame for HA management ring)
 * - Shared frame power (6x matching Titanium PSUs per frame for N+N under compute/fabric load)
 * - Per-icon support ownership (never conflating Frame SLA with Blade or ICM SLA)
 */

const { cleanBaseSKU } = require('../catalog/sku.js');

const FRAME_SKUS = new Set(['P51174-B21', '797740-B21']);
const HALF_HEIGHT_BLADE_SKUS = new Set(['P68217-B21', '871940-B21', '871941-B21', 'P83805-B21', 'R1R47A']);
const FULL_HEIGHT_BLADE_SKUS = new Set(['871929-B21', '871930-B21', '871931-B21', 'Q9Q89A', 'R1R49A']);
const ETH_F32_ICM_SKUS = new Set(['867796-B21', '867793-B21']);
const ETH_LEGACY_ICM_SKUS = new Set(['779224-B23', '779215-B21', '779218-B21']);
const FC_64G_ICM_SKUS = new Set(['P77653-B21']);
const FC_32G_ICM_SKUS = new Set(['Q2E55A', 'Q2E56A', 'Q2E57A']);
const FC_16G_ICM_SKUS = new Set(['K2Q83A', 'K2Q83B', 'K2Q84A', 'K2Q84B', 'K2Q86A', 'K2Q86B']);
const FLM_4PORT_SKUS = new Set(['876852-B21']);
const FLM_2PORT_SKUS = new Set(['804942-B21']);
const PSU_6PACK_SKUS = new Set(['798096-B21', 'P27750-B21', '798100-B21']);
const PSU_SINGLE_SKUS = new Set(['798095-B21', 'P27749-B21', '876929-B21', '798099-B21', 'P44712-B21']);
const DUAL_SLOT_PSU_ADAPTER_SKUS = new Set(['P44074-B21']);
const FC_64G_MEZZ_SKUS = new Set(['P68131-B21']);
const FC_32G_MEZZ_SKUS = new Set(['P76653-B21']);
const ETH_MEZZ_SKUS = new Set(['P64724-B21']);

function _hasNonSynergyBaseAppliance(items = []) {
  for (const it of items) {
    const desc = String(it.description || '');
    if (/\b(?:proliant|dl\d{3}[a-z]?|ml\d{3}|alletra|nimble|storeonce|msl\s*\d+|storeever|sn3600b|sn6700b|sn6750b)\b/i.test(desc)) {
      return true;
    }
  }
  return false;
}

function _isSynergyFrameItem(sku, desc) {
  return FRAME_SKUS.has(sku)
    || (/\bsynergy\s*12000\b/i.test(desc) && /\bframe\b/i.test(desc) && !/frame\s*link|power|rail|bezel|cable|service|support|tech\s*care/i.test(desc));
}

/**
 * True ONLY when a Synergy 12000 Frame is present and all base hardware belongs
 * to the Synergy composite ecosystem. Standalone SY480 blades without a frame
 * return false so they preserve incomplete-enclosure diagnostics; mixed tenders
 * (e.g. DL380 + Synergy) return false so they preserve VALIDATION_PROFILE_REQUIRED.
 */
function isCompleteSynergyComposite(items = [], _topology = {}, _chassisInfo = {}) {
  if (!Array.isArray(items) || items.length === 0) return false;
  if (_hasNonSynergyBaseAppliance(items)) return false;
  return items.some(it => _isSynergyFrameItem(cleanBaseSKU(it.sku), String(it.description || '')));
}

function _extractMaxSpeed(desc, fallback) {
  const matches = String(desc || '').match(/\b(100|64|50|40|32|25|20|16|10)\s*gb/gi) || [];
  let max = 0;
  for (const m of matches) {
    const v = parseInt(m, 10);
    if (Number.isFinite(v) && v > max) max = v;
  }
  return max || fallback;
}

function _tallyFrameAndBlades(sku, desc, qty, tally) {
  if (_isSynergyFrameItem(sku, desc)) {
    tally.frameCount += qty;
    return true;
  }
  if (FULL_HEIGHT_BLADE_SKUS.has(sku) || (/\b(?:synergy\s*6[68]0|sy6[68]0|full[-\s]*height)\b/i.test(desc) && /\b(?:compute|blade|node|block)\b/i.test(desc))) {
    tally.fullHeightBladeCount += qty;
    tally.usedComputeBays += qty * 2;
    return true;
  }
  if (HALF_HEIGHT_BLADE_SKUS.has(sku) || (/\b(?:synergy\s*480|sy480)\b/i.test(desc) && /\b(?:compute|blade|module|node|block)\b/i.test(desc) && !/boot|processor|memory|adapter|hba|cable|service|support/i.test(desc))) {
    tally.halfHeightBladeCount += qty;
    tally.usedComputeBays += qty;
    return true;
  }
  return false;
}

function _isSupportServiceRow(sku, desc) {
  return /\b(?:tech\s*care|pointnext|complete\s*care|foundation\s*care|support\s+svc|hardware\s+support|service)\b/i.test(desc)
    || /^H[A-Z0-9]{5,7}(?:#|$)/.test(sku);
}

function _tallyFlmModules(sku, desc, qty, tally) {
  if (FLM_4PORT_SKUS.has(sku) || /\b4-?port\s+frame\s+link\s+module\b/i.test(desc)) {
    tally.flm4PortCount += qty;
    return true;
  }
  if (FLM_2PORT_SKUS.has(sku) || (/\bframe\s+link\s+module\b/i.test(desc) && !/usb\s+adapter|cable/i.test(desc))) {
    tally.flm2PortCount += qty;
    return true;
  }
  return false;
}

function _tallyEthernetIcms(sku, desc, qty, tally) {
  if (ETH_F32_ICM_SKUS.has(sku) || (/\b(?:virtual\s*connect|interconnect)\b/i.test(desc) && /\b(?:100gb|f32|50gb)\b/i.test(desc))) {
    tally.ethIcmCount += qty;
    tally.ethIcmMaxSpeedGb = Math.max(tally.ethIcmMaxSpeedGb, /100gb|f32/i.test(desc) || sku === '867796-B21' ? 100 : 50);
    return true;
  }
  if (ETH_LEGACY_ICM_SKUS.has(sku) || (/\bsynergy\b/i.test(desc) && /\b(?:40gb\s*f8|10gb\s*interconnect|20gb\s*interconnect)\b/i.test(desc))) {
    tally.ethIcmCount += qty;
    tally.ethIcmMaxSpeedGb = Math.max(tally.ethIcmMaxSpeedGb, _extractMaxSpeed(desc, 40));
    return true;
  }
  return false;
}

function _tallyFcIcms(sku, desc, qty, tally) {
  const isBrocadeFcMod = /\bbrocade\b/i.test(desc) && /\b(?:fc|fibre\s*channel)\b/i.test(desc) && /\bmodule\b/i.test(desc);
  if (FC_64G_ICM_SKUS.has(sku) || (isBrocadeFcMod && /\b64gb\b/i.test(desc))) {
    tally.fcIcmCount += qty;
    tally.fcIcmMaxSpeedGb = Math.max(tally.fcIcmMaxSpeedGb, 64);
    return true;
  }
  if (FC_32G_ICM_SKUS.has(sku) || (isBrocadeFcMod && /\b32gb\b/i.test(desc))) {
    tally.fcIcmCount += qty;
    tally.fcIcmMaxSpeedGb = Math.max(tally.fcIcmMaxSpeedGb, 32);
    return true;
  }
  if (FC_16G_ICM_SKUS.has(sku) || (isBrocadeFcMod && /\b16gb\b/i.test(desc))) {
    tally.fcIcmCount += qty;
    tally.fcIcmMaxSpeedGb = Math.max(tally.fcIcmMaxSpeedGb, 16);
    return true;
  }
  return false;
}

function _tallyInterconnectsAndFlm(sku, desc, qty, tally) {
  if (_isSupportServiceRow(sku, desc)) return false;
  if (_tallyFlmModules(sku, desc, qty, tally)) return true;
  if (_tallyEthernetIcms(sku, desc, qty, tally)) return true;
  return _tallyFcIcms(sku, desc, qty, tally);
}

function _tallyMezzanineAdapters(sku, desc, qty, tally) {
  if (FC_64G_MEZZ_SKUS.has(sku) || FC_32G_MEZZ_SKUS.has(sku) || (/\b(?:mezz|mezzanine|host\s+bus\s+adapter|\bhba\b|7330c|5331c|5330c|3830c)\b/i.test(desc) && /\b(?:fc|fibre\s*channel)\b/i.test(desc))) {
    tally.fcMezzCount += qty;
    const spd = FC_64G_MEZZ_SKUS.has(sku) ? 64 : (FC_32G_MEZZ_SKUS.has(sku) ? 32 : _extractMaxSpeed(desc, 32));
    tally.fcMezzMaxSpeedGb = Math.max(tally.fcMezzMaxSpeedGb, spd);
    return true;
  }
  if (ETH_MEZZ_SKUS.has(sku) || (/\b(?:mezz|mezzanine|ethernet\s+adapter|converged\s+network|cna|6310c|6820c|4820c|3820c)\b/i.test(desc) && !/\b(?:fc|fibre\s*channel)\b/i.test(desc))) {
    tally.ethMezzCount += qty;
    const spd = ETH_MEZZ_SKUS.has(sku) ? 50 : _extractMaxSpeed(desc, 25);
    tally.ethMezzMaxSpeedGb = Math.max(tally.ethMezzMaxSpeedGb, spd);
    return true;
  }
  return false;
}

function _tallyFramePsus(sku, desc, qty, tally) {
  if (DUAL_SLOT_PSU_ADAPTER_SKUS.has(sku) || /\b(?:dual\s+slot\s+)?power\s+supply\s+adapter\b/i.test(desc)) {
    tally.dualSlotPsuAdapterCount += qty;
    return true;
  }
  if (!PSU_6PACK_SKUS.has(sku) && !PSU_SINGLE_SKUS.has(sku) && !(/\bpower\s+supply\b/i.test(desc) && !/cord|cable/i.test(desc))) {
    return false;
  }
  const is6Pack = PSU_6PACK_SKUS.has(sku) || /\b6x\b/i.test(desc);
  const units = is6Pack ? qty * 6 : qty;
  tally.psuCount += units;
  const isDc = /-?48v?dc/i.test(desc) || sku === '798099-B21' || sku === '798100-B21';
  if (isDc) tally.dcPsuCount += units;
  else tally.acPsuCount += units;
  if (/platinum/i.test(desc)) tally.platinumPsuCount += units;
  else if (/titanium/i.test(desc) || PSU_6PACK_SKUS.has(sku) || PSU_SINGLE_SKUS.has(sku)) tally.titaniumPsuCount += units;
  const wattMatch = desc.match(/\b(2650|3000|3400|2200|1800|1600)\s*w\b/i);
  if (wattMatch) tally.psuWattages.add(Number(wattMatch[1]));
  return true;
}

function _tallyMezzaninesPsusAndSupport(item, sku, desc, qty, tally) {
  if (_tallyMezzanineAdapters(sku, desc, qty, tally)) return;
  if (_tallyFramePsus(sku, desc, qty, tally)) return;
  if (/\b(?:transceiver|xcvr|qsfp28|qsfp\+|sfp28|sfp56|sfp\+|active\s+optical|direct\s+attach|\baoc\b|\bdac\b|om3|om4)\b/i.test(desc)) {
    tally.opticCount += qty;
    return;
  }
  if (/\b(?:tech\s*care|pointnext|complete\s*care|foundation\s*care|support\s+svc|hardware\s+support)\b/i.test(desc) || /^H[A-Z0-9]{5,7}(?:#|$)/.test(sku)) {
    tally.supportLines.push({
      sku,
      qty,
      description: desc,
      ownerIcon: String(item.ownerIcon || item.parentId || '').toLowerCase()
    });
  }
}

function _tallySynergyItems(items) {
  const tally = {
    frameCount: 0,
    halfHeightBladeCount: 0,
    fullHeightBladeCount: 0,
    usedComputeBays: 0,
    ethIcmCount: 0,
    ethIcmMaxSpeedGb: 0,
    fcIcmCount: 0,
    fcIcmMaxSpeedGb: 0,
    flm4PortCount: 0,
    flm2PortCount: 0,
    ethMezzCount: 0,
    ethMezzMaxSpeedGb: 0,
    fcMezzCount: 0,
    fcMezzMaxSpeedGb: 0,
    psuCount: 0,
    dualSlotPsuAdapterCount: 0,
    acPsuCount: 0,
    dcPsuCount: 0,
    titaniumPsuCount: 0,
    platinumPsuCount: 0,
    psuWattages: new Set(),
    opticCount: 0,
    supportLines: []
  };

  for (const item of (items || [])) {
    const sku = cleanBaseSKU(item.sku);
    const desc = String(item.description || '');
    const qty = Math.max(0, Number(item.quantity ?? 1) || 0);
    if (qty === 0) continue;

    if (_tallyFrameAndBlades(sku, desc, qty, tally)) continue;
    if (_tallyInterconnectsAndFlm(sku, desc, qty, tally)) continue;
    _tallyMezzaninesPsusAndSupport(item, sku, desc, qty, tally);
  }
  return tally;
}

function _checkComputeBayContainment(tally) {
  const maxBays = tally.frameCount * 12;
  const errors = [];
  const warnings = [];
  if (tally.usedComputeBays > maxBays) {
    errors.push(`Synergy Compute Bay Overflow: ${tally.usedComputeBays} bay(s) required (${tally.halfHeightBladeCount} half-height + ${tally.fullHeightBladeCount} full-height x2) exceed capacity of ${tally.frameCount} Synergy 12000 Frame(s) (${maxBays} bays).`);
  } else if (tally.usedComputeBays === 0) {
    warnings.push(`Synergy 12000 Frame (${tally.frameCount} frame(s)) configured with 0 compute modules (SY480/SY660).`);
  }
  return {
    id: 'SYNERGY_COMPUTE_BAY_CONTAINMENT',
    name: 'Synergy 12000 Compute Bay Containment',
    status: errors.length ? 'FAIL' : (warnings.length ? 'WARN' : 'PASS'),
    errors,
    warnings,
    detail: errors[0] || warnings[0] || `Verified ${tally.usedComputeBays}/${maxBays} compute bay(s) across ${tally.frameCount} Synergy 12000 Frame(s).`
  };
}

function _checkIcmBayPairing(tally) {
  const errors = [];
  const warnings = [];
  const totalIcms = tally.ethIcmCount + tally.fcIcmCount;
  const maxIcmBays = tally.frameCount * 6;

  if (totalIcms > maxIcmBays) {
    errors.push(`Synergy Interconnect Bay Overflow: ${totalIcms} interconnect module(s) exceed ${maxIcmBays} ICM bay(s) across ${tally.frameCount} frame(s).`);
  }
  if (tally.usedComputeBays > 0 && totalIcms === 0) {
    errors.push('Synergy Fabric Missing: Compute modules installed in Synergy 12000 Frame without any interconnect modules (ICM bays 1+4 / 2+5 / 3+6 empty).');
  }
  if (tally.ethIcmCount > 0 && tally.ethIcmCount % 2 !== 0) {
    errors.push(`Synergy Ethernet ICM Bay Pairing Violation: Ethernet Virtual Connect ICMs (${tally.ethIcmCount}) must be deployed in redundant bay pairs (1+4 / 2+5 / 3+6).`);
  }
  if (tally.fcIcmCount > 0 && tally.fcIcmCount % 2 !== 0) {
    errors.push(`Synergy FC ICM Bay Pairing Violation: Fibre Channel ICMs (${tally.fcIcmCount}) must be deployed in redundant bay pairs (1+4 / 2+5 / 3+6).`);
  }

  return {
    id: 'SYNERGY_ICM_BAY_PAIRING',
    name: 'Synergy Interconnect Module Bay Pairing (1+4 / 2+5 / 3+6)',
    status: errors.length ? 'FAIL' : (warnings.length ? 'WARN' : 'PASS'),
    errors,
    warnings,
    detail: errors[0] || warnings[0] || `Verified ${totalIcms}/${maxIcmBays} redundant ICM(s) (${tally.ethIcmCount} Ethernet, ${tally.fcIcmCount} FC) in valid bay pairs.`
  };
}

function _checkMezzanineFabricAlignment(tally) {
  const errors = [];
  const warnings = [];

  if (tally.ethMezzCount > 0) {
    if (tally.ethIcmCount === 0) {
      errors.push(`Synergy Mezzanine-to-Fabric Protocol Mismatch: ${tally.ethMezzCount} Ethernet/CNA mezzanine adapter(s) configured without any Synergy Ethernet Virtual Connect ICM (e.g., SY100Gb F32 867796-B21).`);
    } else if (tally.ethMezzMaxSpeedGb > tally.ethIcmMaxSpeedGb) {
      errors.push(`Synergy Ethernet Speed Mismatch: ${tally.ethMezzMaxSpeedGb}Gb Ethernet mezzanine adapter exceeds Synergy Ethernet ICM speed (${tally.ethIcmMaxSpeedGb}Gb).`);
    }
  }
  if (tally.fcMezzCount > 0) {
    if (tally.fcIcmCount === 0) {
      errors.push(`Synergy FC Mezzanine-to-Fabric Mismatch: ${tally.fcMezzCount} Fibre Channel HBA mezzanine(s) (${tally.fcMezzMaxSpeedGb}Gb) configured without a Synergy Brocade FC Interconnect Module (e.g., P77653-B21 64Gb FC Module).`);
    } else if (tally.fcMezzMaxSpeedGb > tally.fcIcmMaxSpeedGb) {
      if (tally.fcMezzMaxSpeedGb === 64 && tally.fcIcmMaxSpeedGb === 32) {
        warnings.push('Synergy FC Speed Negotiation Advisory: 64Gb FC HBA mezzanine (P68131-B21) negotiates backward to 32Gb FC ICM (verified in OCA UCID 5158590124-02).');
      } else {
        errors.push(`Synergy FC Speed Mismatch: ${tally.fcMezzMaxSpeedGb}Gb FC HBA mezzanine exceeds installed Synergy FC ICM speed (${tally.fcIcmMaxSpeedGb}Gb).`);
      }
    }
  }
  if ((tally.ethIcmCount + tally.fcIcmCount) > 0 && tally.opticCount === 0) {
    warnings.push('Synergy Interconnect Modules configured without uplink optical transceivers (QSFP28/SFP28/SFP56) or DAC/AOC cables.');
  }

  return {
    id: 'SYNERGY_MEZZ_FABRIC_ALIGNMENT',
    name: 'Synergy Mezzanine-to-Fabric Speed & Protocol Alignment',
    status: errors.length ? 'FAIL' : (warnings.length ? 'WARN' : 'PASS'),
    errors,
    warnings,
    detail: errors[0] || warnings[0] || `Verified mezzanine-to-fabric alignment (Eth ${tally.ethMezzMaxSpeedGb || 0}Gb->${tally.ethIcmMaxSpeedGb || 0}Gb, FC ${tally.fcMezzMaxSpeedGb || 0}Gb->${tally.fcIcmMaxSpeedGb || 0}Gb).`
  };
}

function _checkFlmHaRing(tally) {
  const errors = [];
  const warnings = [];
  const totalFlm = tally.flm4PortCount + tally.flm2PortCount;
  const requiredFlm = tally.frameCount * 2;

  if (tally.flm4PortCount > 0 && tally.flm2PortCount > 0) {
    errors.push('Synergy FLM Mixing Violation: Cannot mix 4-port Frame Link Modules (876852-B21) with legacy 2-port FLMs (804942-B21) in the same management ring.');
  }
  if (totalFlm < requiredFlm) {
    errors.push(`Synergy Frame Link Module HA Violation: Requires 2x 4-port Frame Link Modules (876852-B21) per frame for HA management ring (${requiredFlm} required for ${tally.frameCount} frame(s), found ${totalFlm}).`);
  }

  return {
    id: 'SYNERGY_FLM_HA_RING',
    name: 'Synergy Frame Link Module (FLM) HA Management Ring',
    status: errors.length ? 'FAIL' : (warnings.length ? 'WARN' : 'PASS'),
    errors,
    warnings,
    detail: errors[0] || `Verified ${totalFlm}/${requiredFlm} redundant Frame Link Module(s) for HA management ring.`
  };
}

function _checkSharedFramePower(tally) {
  const errors = [];
  const warnings = [];
  const baseBays = tally.frameCount * 6;
  const requiredPsus = baseBays;
  const maxPsus = baseBays + Math.min(tally.dualSlotPsuAdapterCount, baseBays);

  if (tally.acPsuCount > 0 && tally.dcPsuCount > 0) {
    errors.push(`Synergy Frame Power Conflict: Cannot mix AC PSUs (${tally.acPsuCount}) and -48VDC PSUs (${tally.dcPsuCount}) in the same Synergy 12000 Frame.`);
  }
  if (tally.titaniumPsuCount > 0 && tally.platinumPsuCount > 0) {
    errors.push('Synergy Frame Power Efficiency Conflict: Cannot mix Titanium and Platinum power supplies in the same Synergy 12000 Frame.');
  }
  if (tally.psuWattages.size > 1) {
    errors.push(`Synergy Frame PSU Wattage Mismatch: Mixed PSU wattages detected (${[...tally.psuWattages].join('W, ')}W); all frame PSUs must match.`);
  }
  if (tally.dualSlotPsuAdapterCount > baseBays) {
    errors.push(`Synergy Dual-Slot PSU Adapter Overflow: ${tally.dualSlotPsuAdapterCount} adapter(s) exceed ${baseBays} physical PSU bay(s) across ${tally.frameCount} frame(s).`);
  }
  if (tally.psuCount < requiredPsus) {
    errors.push(`Synergy Shared Frame Power Deficit: Synergy 12000 Frame requires minimum 6x matching Titanium PSUs per frame for N+N redundancy (${requiredPsus} required for ${tally.frameCount} frame(s), found ${tally.psuCount}).`);
  } else if (tally.psuCount > maxPsus) {
    errors.push(`Synergy Frame PSU Bay Overflow: ${tally.psuCount} PSUs exceed physical ${maxPsus}-slot PSU capacity across ${tally.frameCount} frame(s).`);
  }

  const denom = tally.dualSlotPsuAdapterCount > 0 ? maxPsus : requiredPsus;
  return {
    id: 'SYNERGY_SHARED_FRAME_POWER',
    name: 'Synergy 12000 Shared Frame N+N Power Envelope',
    status: errors.length ? 'FAIL' : (warnings.length ? 'WARN' : 'PASS'),
    errors,
    warnings,
    detail: errors[0] || `Verified ${tally.psuCount}/${denom} matching frame PSU(s) for N+N shared power redundancy.`
  };
}

function _classifySupportLineIcon(line) {
  const text = `${line.ownerIcon} ${line.description}`.toLowerCase();
  if (/12000|frame/.test(text)) return 'FRAME';
  if (/sy480|sy660|compute|blade/.test(text)) return 'COMPUTE';
  if (/f32|virtual\s*connect|interconnect|brocade|64gb\s*fc|32gb\s*fc/.test(text)) return 'ICM';
  return 'UNSCOPED';
}

function _checkPerIconSupport(tally) {
  const warnings = [];
  const requiredIcons = ['FRAME'];
  if (tally.usedComputeBays > 0) requiredIcons.push('COMPUTE');
  if ((tally.ethIcmCount + tally.fcIcmCount) > 0) requiredIcons.push('ICM');

  if (tally.supportLines.length === 0) {
    warnings.push(`Per-Icon Support Missing: Synergy composite solution contains ${requiredIcons.length} independent OCA icon class(es) (${requiredIcons.join(', ')}) requiring separate product-qualified 3-year Tech Care Basic lines via OCA Services -> Edit.`);
  } else {
    const covered = new Set(tally.supportLines.map(_classifySupportLineIcon));
    const missingIcons = requiredIcons.filter(icon => !covered.has(icon));
    if (missingIcons.length > 0 && tally.supportLines.length < requiredIcons.length) {
      warnings.push(`Per-Icon Support Conflation Risk: Distinct Synergy OCA icon(s) [${missingIcons.join(', ')}] lack independent Tech Care support lines. Never conflate Frame SLA with Compute Blade or Interconnect Module SLA.`);
    }
  }

  return {
    id: 'SYNERGY_PER_ICON_SUPPORT',
    name: 'Synergy Per-Icon Independent Support Ownership',
    status: warnings.length ? 'WARN' : 'PASS',
    errors: [],
    warnings,
    requiredIconClasses: requiredIcons,
    detail: warnings[0] || `Verified independent per-icon support coverage across ${requiredIcons.join(', ')}.`
  };
}

function _buildSynergyPartsWithNullablePrices(items, catalogData) {
  const index = new Map();
  for (const entry of (catalogData?.entries || [])) {
    for (const s of (entry.skus || [])) {
      const k = cleanBaseSKU(s.sku || s['Product #']);
      if (k && !index.has(k)) index.set(k, s);
    }
  }
  return (items || []).map(item => {
    const clean = cleanBaseSKU(item.sku);
    const rec = index.get(clean);
    const rawCatalogPrice = Number(rec?.listPrice ?? rec?.priceUsd ?? rec?.['Unit Price (USD)'] ?? rec?.['List Price (USD)']);
    const hasCatalogPrice = Number.isFinite(rawCatalogPrice) && rawCatalogPrice > 0;
    const inputPrice = Number(item.unitPriceUsd);
    const hasInputPrice = Number.isFinite(inputPrice) && inputPrice > 0;
    const unitPriceUsd = hasCatalogPrice ? rawCatalogPrice : (hasInputPrice ? inputPrice : null);
    const qty = Number(item.quantity ?? 1) || 1;
    return {
      ...item,
      unitPriceUsd,
      extendedPriceUsd: unitPriceUsd !== null ? Number((unitPriceUsd * qty).toFixed(2)) : null,
      priceStatus: unitPriceUsd !== null ? (hasCatalogPrice ? 'OCA_CAPTURED' : 'INPUT_QUOTED') : 'UNRESOLVED',
      portalStatus: 'PORTAL VALIDATION PENDING'
    };
  });
}

/**
 * Evaluate a complete Synergy 12000 Composite Solution end-to-end.
 */
function evaluateSynergyComposite(items = [], catalogData = null, _targetDir = '', chassisInfo = {}, options = {}) {
  const tally = _tallySynergyItems(items);
  const aspectChecks = [
    _checkComputeBayContainment(tally),
    _checkIcmBayPairing(tally),
    _checkMezzanineFabricAlignment(tally),
    _checkFlmHaRing(tally),
    _checkSharedFramePower(tally),
    _checkPerIconSupport(tally)
  ];

  const errors = aspectChecks.flatMap(c => c.errors || []);
  const warnings = aspectChecks.flatMap(c => c.warnings || []);
  const isMathClean = errors.length === 0;
  const parts = _buildSynergyPartsWithNullablePrices(items, catalogData);
  const unresolvedPriceSkus = parts.filter(p => p.unitPriceUsd === null).map(p => p.sku);
  const knownSubtotal = parts.reduce((sum, p) => sum + (p.extendedPriceUsd || 0), 0);

  const candidate = {
    chassis: 'Synergy_12000_Frame',
    rank: 1,
    name: 'Synergy 12000 Composite Solution',
    tierTitle: 'Synergy 12000 Composite Domain-Verified Baseline',
    skuPartsList: parts,
    estimatedCostUsd: unresolvedPriceSkus.length ? null : Number(knownSubtotal.toFixed(2)),
    pricingComplete: unresolvedPriceSkus.length === 0,
    unresolvedPriceSkus,
    knownPriceSubtotalUsd: Number(knownSubtotal.toFixed(2)),
    physicalMathClean: isMathClean,
    isMathClean,
    validationScope: isMathClean ? 'COMPOSITE_SOLUTION_VERIFIED' : 'COMPOSITE_SOLUTION_FAILED',
    relationshipValidationStatus: isMathClean ? 'EVALUATED_PASS' : 'EVALUATED_FAIL',
    portalValidationStatus: 'PENDING',
    advisoryStatus: 'PORTAL_VALIDATION_PENDING',
    aspectErrors: errors,
    score: isMathClean ? 0.74 : 0.35
  };

  return {
    items,
    productType: 'SYNERGY_COMPOSITE',
    isMathClean,
    isGraphClean: false,
    portalValidationStatus: 'PENDING',
    criticalViolationsCount: errors.length,
    errors,
    warnings,
    missingDependencies: [],
    mathDeductions: [...errors],
    aspectChecks,
    evalSummary: {
      frameCount: tally.frameCount,
      usedComputeBays: tally.usedComputeBays,
      totalIcms: tally.ethIcmCount + tally.fcIcmCount,
      flmCount: tally.flm4PortCount + tally.flm2PortCount,
      psuCount: tally.psuCount,
      errors,
      warnings,
      missingDependencies: [],
      aspectChecks
    },
    confidence: {
      score: isMathClean ? 0.74 : Math.max(0.1, Number((0.74 - errors.length * 0.15).toFixed(2))),
      isHitlTriggered: true,
      confidenceReasons: [
        ...errors.map(e => `[CRITICAL_MATH] ${e}`),
        ...warnings.map(w => `[WARNING] ${w}`)
      ]
    },
    conflictGraph: {
      chassisInfo: { ...chassisInfo, productId: 'Synergy_12000_Frame', family: 'Synergy' },
      rulesSource: 'SYNERGY_COMPOSITE_DOMAIN_RULES',
      isFallbackSource: false,
      totalRulesEvaluated: aspectChecks.length,
      isWholeSolutionValid: false,
      conflicts: errors.map(message => ({ level: 'SYNERGY_COMPOSITE', type: 'SYNERGY_COMPOSITE_VIOLATION', message })),
      resolvedFixes: [],
      unresolvedConflicts: errors.map(message => ({ type: 'SYNERGY_COMPOSITE_VIOLATION', message })),
      rankedSolutions: options.skipSynthesis ? [] : [candidate]
    }
  };
}

function _isModifierOrServiceRow(sku, desc) {
  return /\s+(?:0D1|B19|OD1)$/i.test(String(sku || ''))
    || _isSupportServiceRow(cleanBaseSKU(sku), String(desc || ''));
}

function _groupRowsByOcaConfigName(rows = []) {
  const groups = new Map();
  for (const row of rows) {
    const cfg = String(row.configName ?? row.cfg ?? row['Config Name'] ?? '').trim();
    if (!cfg || /^ad[-\s]*hoc/i.test(cfg)) continue;
    if (!groups.has(cfg)) groups.set(cfg, []);
    groups.get(cfg).push(row);
  }
  return groups;
}

function _collectAdHocNamingWarnings(rows = []) {
  const seen = new Set();
  const warnings = [];
  for (const row of rows) {
    const cfg = String(row.configName ?? row.cfg ?? row['Config Name'] ?? '').trim();
    if (!cfg || seen.has(cfg) || !/^ad[-\s]*hoc/i.test(cfg)) continue;
    seen.add(cfg);
    if (!/^Ad-Hoc #\d+$/.test(cfg)) {
      warnings.push({
        configName: cfg,
        reason: `Ad-Hoc upload Config Name "${cfg}" does not match exact HPE OCA syntax "Ad-Hoc #1". Custom post-import labels cause OCA Excel import to absorb compatible cables/SFPs into switch modules (e.g. 32Gb/20 4SFP+ FC #2) and scatter loose parts.`
      });
    }
  }
  return warnings;
}

/**
 * Validate parent-child integer divisibility within every non-AdHoc OCA Config Name container.
 * HPE OCA imports build one template per Config Name multiplied by parentQty, so fractional
 * child ratios (e.g. 1x 453154-B21 under 2x 876852-B21 = 0.5) eject rows into extra Ad-Hoc buckets.
 */
function validateOcaContainerDivisibility(rows = []) {
  const inputRows = Array.isArray(rows) ? rows : [];
  const groups = _groupRowsByOcaConfigName(inputRows);
  const violations = [];
  for (const [configName, list] of groups.entries()) {
    const parent = list.find(r => !_isModifierOrServiceRow(r.sku, r.description));
    if (!parent) continue;
    const parentQty = Number(parent.qty ?? parent.quantity ?? 0);
    if (!Number.isFinite(parentQty) || parentQty <= 0) continue;
    const parentSku = String(parent.sku || '').trim();
    for (const child of list) {
      if (child === parent || _isModifierOrServiceRow(child.sku, child.description)) continue;
      const childQty = Number(child.qty ?? child.quantity ?? 0);
      if (!Number.isFinite(childQty) || childQty <= 0 || childQty % parentQty === 0) continue;
      const perParent = Number((childQty / parentQty).toFixed(4));
      violations.push({
        configName,
        parentSku,
        parentQty,
        childSku: String(child.sku || '').trim(),
        childQty,
        perParent,
        reason: `Child ${String(child.sku || '').trim()} qty ${childQty} is not divisible by parent ${parentSku} qty ${parentQty} (${perParent}/unit); move loose items to Ad-Hoc #1 or consolidate.`
      });
    }
  }
  const adHocNamingWarnings = _collectAdHocNamingWarnings(inputRows);
  return { valid: violations.length === 0, violations, checkedContainers: groups.size, adHocNamingWarnings };
}

module.exports = {
  isCompleteSynergyComposite,
  evaluateSynergyComposite,
  validateOcaContainerDivisibility
};
