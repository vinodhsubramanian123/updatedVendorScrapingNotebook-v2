'use strict';

/**
 * scripts/lib/boq/synergy_cabling_auditor.js
 *
 * 6-Plane HPE Synergy 12000 Cabling, Transceiver & Port-Budget Completeness Auditor.
 * Catches physical connectivity, cord, ring, ICL, stacking, BiDi, and FC fiber gaps
 * that HPE OCA does not validate automatically across 1-frame, 2-frame, and 3-frame builds.
 */

const { cleanBaseSKU, isOcaModifierTrackingRow } = require('../catalog/sku.js');

const F32_MASTER_SKUS = new Set(['867796-B21']);
const ILM_50G_SATELLITE_SKUS = new Set(['867793-B21', '867793-B22']);
const ICL_300G_LSZH_SKUS = new Set(['876680-B21', '876689-B21', '876692-B21', '876698-B21']);
const ICL_300G_PLENUM_SKUS = new Set(['P64635-B21', 'P64638-B21', 'P64641-B21']);
const F32_QSFP28_100G_CABLE_SKUS = new Set(['845406-B21', '845408-B21', '845410-B21', '845414-B21']);
const F32_QSFP28_BREAKOUT_CABLE_SKUS = new Set(['845416-B21', '845420-B21', '845424-B21']);
const F32_QSFP28_NON_BIDI_OPTIC_SKUS = new Set(['882251-B21', '845966-B21', '845970-B21']);
const F32_QSFP28_BIDI_OPTIC_SKUS = new Set(['845972-B21', 'P90358-B21', '841716-B21']);
const FLM_10G_DAC_SKUS = new Set(['487655-B21', '537963-B21', 'JD095C', 'JD096C', 'JD097C', 'JG081C', 'JC784C']);
const FLM_10G_OPTIC_SKUS = new Set(['455883-B21', '455886-B21', '813874-B21']);
const FLM_10G_BASET_SKUS = new Set(['813874-B21']);
const FLM_1G_MGMT_OPTIC_SKUS = new Set(['453154-B21', '453151-B21']);
const FLM_LEGACY_CAT6A_SKUS = new Set(['861412-B21', '861413-B21']);
const FC_OPTIC_1PK_SKUS = new Set(['R6B12A', 'R7M15A', 'QK724A']);
const FC_OPTIC_8PK_SKUS = new Set(['R6W26A', 'R7M16A', 'R6W28A']);
const OM4_LCLC_FIBER_SKUS = new Set([
  'QK732A', 'QK733A', 'QK734A', 'QK735A', 'QK736A', 'QK737A',
  'AJ833A', 'AJ834A', 'AJ835A', 'AJ836A', 'AJ837A', 'AJ838A', 'AJ839A'
]);
const MPO_BREAKOUT_FIBER_SKUS = new Set(['K2Q46A', 'K2Q47A']);
const MPO_TRUNK_FIBER_SKUS = new Set(['QK729A', 'QK731A', 'H6Z30A']);
const C20_C13_JUMPER_SKUS = new Set(['AF590A']);
const FLEX_SLOT_PSU_SKUS = new Set(['P44712-B21']);

const SYNERGY_CABLING_SKUS = Object.freeze({
  F32_MASTER_SKUS,
  ILM_50G_SATELLITE_SKUS,
  ICL_300G_LSZH_SKUS,
  ICL_300G_PLENUM_SKUS,
  F32_QSFP28_100G_CABLE_SKUS,
  F32_QSFP28_BREAKOUT_CABLE_SKUS,
  F32_QSFP28_NON_BIDI_OPTIC_SKUS,
  F32_QSFP28_BIDI_OPTIC_SKUS,
  FLM_10G_DAC_SKUS,
  FLM_10G_OPTIC_SKUS,
  FLM_10G_BASET_SKUS,
  FLM_1G_MGMT_OPTIC_SKUS,
  FLM_LEGACY_CAT6A_SKUS,
  FC_OPTIC_1PK_SKUS,
  FC_OPTIC_8PK_SKUS,
  OM4_LCLC_FIBER_SKUS,
  MPO_BREAKOUT_FIBER_SKUS,
  MPO_TRUNK_FIBER_SKUS,
  C20_C13_JUMPER_SKUS,
  FLEX_SLOT_PSU_SKUS
});

const SKU_COUNTER_RULES = [
  [FLEX_SLOT_PSU_SKUS, 'flexSlotPsuCount', 1],
  [C20_C13_JUMPER_SKUS, 'c20C13JumperCount', 1],
  [FLM_10G_DAC_SKUS, 'flm10gDacCount', 1],
  [FLM_10G_OPTIC_SKUS, 'flm10gOpticCount', 1],
  [FLM_10G_BASET_SKUS, 'flm10gBaseTCount', 1],
  [FLM_1G_MGMT_OPTIC_SKUS, 'flm1gMgmtOpticCount', 1],
  [FLM_LEGACY_CAT6A_SKUS, 'flmLegacyCat6aCount', 1],
  [ICL_300G_LSZH_SKUS, 'icl300gLszhCount', 1],
  [ICL_300G_PLENUM_SKUS, 'icl300gPlenumCount', 1],
  [F32_QSFP28_100G_CABLE_SKUS, 'f32Qsfp28_100gCableCount', 1],
  [F32_QSFP28_BREAKOUT_CABLE_SKUS, 'f32Qsfp28BreakoutCableCount', 1],
  [F32_QSFP28_NON_BIDI_OPTIC_SKUS, 'f32NonBidiOpticCount', 1],
  [F32_QSFP28_BIDI_OPTIC_SKUS, 'f32BidiOpticCount', 1],
  [FC_OPTIC_1PK_SKUS, 'fcExtraOpticCount', 1],
  [FC_OPTIC_8PK_SKUS, 'fcExtraOpticCount', 8],
  [OM4_LCLC_FIBER_SKUS, 'om4LcLcFiberCount', 1],
  [MPO_BREAKOUT_FIBER_SKUS, 'mpoBreakoutFiberCount', 1],
  [MPO_TRUNK_FIBER_SKUS, 'mpoTrunkFiberCount', 1]
];

function _isSupportRow(sku, desc) {
  return /\b(?:tech\s*care|pointnext|complete\s*care|foundation\s*care|support\s+svc|hardware\s+support|service)\b/i.test(desc)
    || /^H[A-Z0-9]{5,7}(?:#|$)/.test(sku);
}

function _tallyCablingAssets(items = []) {
  const assets = {
    flexSlotPsuCount: 0,
    c20C13JumperCount: 0,
    flm10gDacCount: 0,
    flm10gOpticCount: 0,
    flm10gBaseTCount: 0,
    flm1gMgmtOpticCount: 0,
    flmLegacyCat6aCount: 0,
    icl300gLszhCount: 0,
    icl300gPlenumCount: 0,
    f32Qsfp28_100gCableCount: 0,
    f32Qsfp28BreakoutCableCount: 0,
    f32NonBidiOpticCount: 0,
    f32BidiOpticCount: 0,
    fcExtraOpticCount: 0,
    om4LcLcFiberCount: 0,
    mpoBreakoutFiberCount: 0,
    mpoTrunkFiberCount: 0
  };

  for (const item of (items || [])) {
    const rawSku = String(item.sku || '').trim();
    const desc = String(item.description || '');
    if (isOcaModifierTrackingRow(rawSku, desc)) continue;
    const sku = cleanBaseSKU(rawSku);
    if (!sku || _isSupportRow(sku, desc)) continue;
    const qty = Math.max(0, Number(item.quantity ?? item.qty ?? 1) || 0);
    if (qty === 0) continue;

    for (const [skuSet, field, multiplier] of SKU_COUNTER_RULES) {
      if (skuSet.has(sku)) assets[field] += qty * multiplier;
    }
  }
  return assets;
}

function _auditPlane2PowerCords(assets, ctx) {
  let status = 'PASS';
  if (assets.flexSlotPsuCount > 0 && assets.c20C13JumperCount === 0) {
    status = 'WARN';
    ctx.warnings.push(
      `Plane 2 Power Cord Check: ${assets.flexSlotPsuCount}x P44712-B21 Flex Slot PSU(s) ship with C13-C14 10A cords; add ${assets.flexSlotPsuCount}x AF590A (C20-C13 15A jumper) if connecting to C20 rack PDUs or running full 2200W @ 208VAC.`
    );
  } else if (assets.c20C13JumperCount > 0 && assets.c20C13JumperCount < assets.flexSlotPsuCount) {
    status = 'FAIL';
    ctx.errors.push(
      `Plane 2 Power Cord Deficit: Partial C20-C13 power jumper coverage (${assets.c20C13JumperCount}x AF590A ordered for ${assets.flexSlotPsuCount}x P44712-B21 PSUs).`
    );
  }
  return { status, flexSlotPsuCount: assets.flexSlotPsuCount, c20C13JumperCount: assets.c20C13JumperCount };
}

function _auditPlane3FlmRingAndMgmt(assets, tally, ctx) {
  let status = 'PASS';
  const requiredRing = tally.frameCount >= 2 ? tally.frameCount : 0;
  const availableLink = assets.flm10gDacCount + Math.floor(assets.flm10gOpticCount / 2);

  if (tally.flm4PortCount > 0 && assets.flmLegacyCat6aCount > 0 && assets.flm10gBaseTCount < assets.flmLegacyCat6aCount * 2) {
    status = 'FAIL';
    ctx.errors.push(
      `Plane 3A FLM Media Violation: 4-port FLM (876852-B21) uses SFP+ LINK cages; legacy CAT6A cable(s) (${assets.flmLegacyCat6aCount}) require ${assets.flmLegacyCat6aCount * 2}x 813874-B21 (10GBase-T SFP+) transceivers (found ${assets.flm10gBaseTCount}).`
    );
  }
  if (tally.frameCount >= 2 && tally.flm4PortCount >= 2 && availableLink < requiredRing) {
    status = 'FAIL';
    const deficit = requiredRing - availableLink;
    ctx.errors.push(
      `SYNERGY_FLM_RING_CABLE_DEFICIT: ${tally.frameCount}-frame FLM management ring requires ${requiredRing}x 10GbE SFP+ LINK cables (found ${availableLink}).`
    );
    ctx.missingDependencies.push({
      sku: '487655-B21',
      quantity: deficit,
      plane: 'FLM_LINK_RING',
      reason: `Close ${tally.frameCount}-frame FLM HA management ring (${requiredRing}x 10GbE LINK cables required)`
    });
  } else if (tally.frameCount >= 2 && assets.flm10gDacCount > requiredRing + 2) {
    if (status === 'PASS') status = 'WARN';
    ctx.warnings.push(
      `Plane 3A FLM Over-Provisioned: ${assets.flm10gDacCount}x 10GbE SFP+ DACs ordered vs ${requiredRing}x required to close the ${tally.frameCount}-frame FLM LINK ring (confirm spares or 10G uplinks).`
    );
  }

  const spare10gForMgmt = Math.max(0, assets.flm10gDacCount - requiredRing) + Math.max(0, assets.flm10gOpticCount - requiredRing * 2);
  const mgmtCount = assets.flm1gMgmtOpticCount + spare10gForMgmt;
  if (tally.flm4PortCount >= 2 && mgmtCount < 2) {
    if (status === 'PASS') status = 'WARN';
    const deficit = 2 - mgmtCount;
    ctx.warnings.push(
      `SYNERGY_FLM_MGMT_UPLINK_MISSING: 4-port FLM (876852-B21) ships with 0 optics; whole management ring requires 2x MGMT uplinks (e.g. 2x 453154-B21 1G RJ45 SFP, found ${mgmtCount}).`
    );
    ctx.missingDependencies.push({
      sku: '453154-B21',
      quantity: deficit,
      plane: 'FLM_MGMT_UPLINK',
      reason: 'External redundant MGMT LAN uplinks for FLM ring (always 2 per ring)'
    });
  }

  return { status, requiredRing, availableLink, mgmtCount };
}

function _auditPlane4EthernetIcl(assets, tally, ctx) {
  let status = 'PASS';
  const totalIcl = assets.icl300gLszhCount + assets.icl300gPlenumCount;

  if (assets.icl300gLszhCount > 0 && assets.icl300gPlenumCount > 0) {
    status = 'FAIL';
    ctx.errors.push(
      `SYNERGY_ICL_LSZH_PLENUM_MIX: Cannot mix LSZH (${assets.icl300gLszhCount}) and Plenum-rated (${assets.icl300gPlenumCount}) 300Gb ICL cables in the same Logical Enclosure.`
    );
  }

  if (tally.ilm50gCount > 0) {
    const minIcl25g = tally.ilm50gCount;
    const requiredIcl50g = tally.ilm50gCount * 2;
    if (totalIcl < minIcl25g) {
      status = 'FAIL';
      ctx.errors.push(
        `SYNERGY_ICL_CABLE_DEFICIT: ${tally.ilm50gCount}x 50Gb Satellite ILM(s) (867793-B21) require ${requiredIcl50g}x 300Gb ICL cables for full 50Gb operation (minimum ${minIcl25g} for 25Gb mode; found ${totalIcl}).`
      );
      ctx.missingDependencies.push({
        sku: '876689-B21',
        quantity: requiredIcl50g - totalIcl,
        plane: 'ETHERNET_ICL_300G',
        reason: `300Gb CXP28 ICL links (2 per 50Gb ILM on L1/L2 for full 50Gb speed)`
      });
    } else if (tally.frameCount <= 3 && (tally.ethMezzMaxSpeedGb >= 50 || tally.ethMezzMaxSpeedGb === 0) && totalIcl < requiredIcl50g) {
      if (status === 'PASS') status = 'WARN';
      ctx.warnings.push(
        `Plane 4A 25Gb-Degraded ICL Cabling: ${totalIcl}x 300Gb ICL cable(s) cover L1 only for ${tally.ilm50gCount}x 50Gb ILM(s); add ${requiredIcl50g - totalIcl}x more on L2 for full 50Gb speed.`
      );
    } else if (totalIcl > requiredIcl50g) {
      if (status === 'PASS') status = 'WARN';
      ctx.warnings.push(
        `Plane 4A Over-Provisioned ICL Cables: ${totalIcl}x 300Gb ICL cables ordered vs ${requiredIcl50g}x needed for ${tally.ilm50gCount}x 50Gb ILM(s) at full 50Gb.`
      );
    }
  }

  return { status, ilm50gCount: tally.ilm50gCount, totalIcl };
}

function _auditPlane4b5F32StackAndUplinks(assets, tally, ctx) {
  let status = 'PASS';
  if (tally.f32MasterCount < 2) {
    return { status, f32MasterCount: tally.f32MasterCount, requiredStackCables: 0, totalQsfp28Ends: 0, maxCages: tally.f32MasterCount * 8 };
  }

  const requiredStackCables = Math.floor(tally.f32MasterCount / 2) * 2;
  const opticalStackPairs = Math.min(Math.floor(assets.f32NonBidiOpticCount / 2), assets.mpoTrunkFiberCount);
  const eligibleStackCables = assets.f32Qsfp28_100gCableCount + opticalStackPairs;

  if (eligibleStackCables < requiredStackCables) {
    status = 'FAIL';
    if (assets.f32BidiOpticCount > 0) {
      ctx.errors.push(
        `SYNERGY_BIDI_STACKING_VIOLATION: BiDi QSFP transceivers (845972-B21 / P90358-B21 / 841716-B21) cannot be used for F32 Q7/Q8 ICM clustering; use 100Gb DAC/AOC or SR4 optics.`
      );
    } else {
      const deficit = requiredStackCables - eligibleStackCables;
      ctx.errors.push(
        `SYNERGY_F32_STACKING_MISSING: ${tally.f32MasterCount}x VC SE 100Gb F32 modules require ${requiredStackCables}x external 100Gb QSFP28 horizontal stacking cables across Q7-Q7 and Q8-Q8 (found ${eligibleStackCables}).`
      );
      ctx.missingDependencies.push({
        sku: '845406-B21',
        quantity: deficit,
        plane: 'F32_Q7_Q8_STACKING',
        reason: 'External 100Gb QSFP28 horizontal stacking/MLAG links across F32 Q7 and Q8 ports'
      });
    }
  }

  const usedStack100gCables = Math.min(assets.f32Qsfp28_100gCableCount, requiredStackCables);
  const extra100gUplinkCables = Math.max(0, assets.f32Qsfp28_100gCableCount - usedStack100gCables);
  const totalOptics = assets.f32NonBidiOpticCount + assets.f32BidiOpticCount;
  const totalQsfp28Ends = (usedStack100gCables * 2) + extra100gUplinkCables + assets.f32Qsfp28BreakoutCableCount + totalOptics;
  const maxCages = tally.f32MasterCount * 8;

  if (totalQsfp28Ends > maxCages) {
    status = 'FAIL';
    ctx.errors.push(
      `SYNERGY_F32_QSFP28_CAGE_OVERFLOW: ${totalQsfp28Ends} QSFP28 endpoints ordered exceed ${maxCages} physical Q1-Q8 cages across ${tally.f32MasterCount}x F32 module(s).`
    );
  }

  const opticalStackEnds = Math.max(0, requiredStackCables - usedStack100gCables) * 2;
  const uplinkEndpoints = extra100gUplinkCables + assets.f32Qsfp28BreakoutCableCount + Math.max(0, totalOptics - opticalStackEnds);
  if (uplinkEndpoints === 0) {
    if (status === 'PASS') status = 'WARN';
    ctx.warnings.push('Plane 5 Ethernet Uplink Check: No northbound Ethernet uplinks (QSFP28 optics/DAC/AOC) configured on F32 Q1-Q6 ports.');
  }
  if (totalOptics > 0 && (assets.mpoTrunkFiberCount + assets.mpoBreakoutFiberCount) === 0) {
    if (status === 'PASS') status = 'WARN';
    ctx.warnings.push('Plane 5 Optical Fiber Check: F32 QSFP28 optical transceivers ordered with 0 MPO OM4 fiber cables (QK729A/QK731A or K2Q46A/K2Q47A).');
  }

  return { status, f32MasterCount: tally.f32MasterCount, requiredStackCables, totalQsfp28Ends, maxCages, uplinkEndpoints };
}

function _auditPlane6BrocadeFcSan(assets, tally, ctx) {
  let status = 'PASS';
  if (tally.fcIcmCount <= 0) {
    return { status, fcIcmCount: 0, totalFcOptics: 0, fcFiberPaths: 0 };
  }

  const includedFcOptics = tally.fcIcmCount * 4;
  const totalFcOptics = includedFcOptics + assets.fcExtraOpticCount;
  const fc64Count = Number(tally.fc64gIcmCount || 0);
  const fcOtherCount = Math.max(0, tally.fcIcmCount - fc64Count);
  const maxSfpCages = (fc64Count * 12) + (fcOtherCount * 8);

  if (totalFcOptics > maxSfpCages) {
    status = 'FAIL';
    ctx.errors.push(
      `SYNERGY_FC_SFP_CAGE_OVERFLOW: ${totalFcOptics} total FC SFP transceivers (${includedFcOptics} included + ${assets.fcExtraOpticCount} extra) exceed ${maxSfpCages} external SFP cages across ${tally.fcIcmCount}x Brocade FC switch(es).`
    );
  }

  const ethMpoBreakoutUsed = (assets.om4LcLcFiberCount === 0 && assets.mpoTrunkFiberCount === 0)
    ? Math.min(assets.mpoBreakoutFiberCount, assets.f32NonBidiOpticCount)
    : 0;
  const fcMpoBreakoutCount = Math.max(0, assets.mpoBreakoutFiberCount - ethMpoBreakoutUsed);
  const fcFiberPaths = assets.om4LcLcFiberCount + (fcMpoBreakoutCount * 4);

  if (fcFiberPaths === 0) {
    status = 'FAIL';
    ctx.errors.push(
      `SYNERGY_FC_FIBER_MISSING: ${tally.fcIcmCount}x Brocade FC switch module(s) include ${includedFcOptics}x SW optics in-box but ship with 0 fiber cables; add at least ${includedFcOptics}x OM4 LC/LC cables (e.g. QK734A).`
    );
    ctx.missingDependencies.push({
      sku: 'QK734A',
      quantity: totalFcOptics,
      plane: 'BROCADE_FC_SAN_FIBER',
      reason: `OM4 LC/LC SAN fiber patch cables matching ${totalFcOptics}x FC SFP optics (0 cables ship in-box)`
    });
  } else if (fcFiberPaths < totalFcOptics) {
    if (status === 'PASS') status = 'WARN';
    ctx.warnings.push(
      `SYNERGY_FC_FIBER_UNDERPROVISIONED: ${totalFcOptics} total FC SFP optics (${includedFcOptics} included + ${assets.fcExtraOpticCount} extra) exceed ${fcFiberPaths} LC SAN fiber paths.`
    );
  }

  return { status, fcIcmCount: tally.fcIcmCount, totalFcOptics, maxSfpCages, fcFiberPaths };
}

/**
 * Audit all 6 Synergy physical cabling, transceiver, power jumper, and port-budget planes.
 */
function auditSynergyCabling(items = [], tally = {}) {
  const assets = _tallyCablingAssets(items);
  const ctx = { errors: [], warnings: [], missingDependencies: [] };

  const planes = {
    powerCords: _auditPlane2PowerCords(assets, ctx),
    flmRingAndMgmt: _auditPlane3FlmRingAndMgmt(assets, tally, ctx),
    ethernetIcl: _auditPlane4EthernetIcl(assets, tally, ctx),
    f32StackAndUplinks: _auditPlane4b5F32StackAndUplinks(assets, tally, ctx),
    brocadeFcSan: _auditPlane6BrocadeFcSan(assets, tally, ctx)
  };

  const detail = ctx.errors[0] || ctx.warnings[0]
    || `Verified all 6 Synergy cabling planes across ${tally.frameCount || 0} frame(s) (FLM ring/MGMT, 300Gb ICL, F32 Q7/Q8 stacking & Q1-Q6 budget, Brocade FC fiber).`;

  return {
    aspectCheck: {
      id: 'SYNERGY_CABLING_AND_PORT_BUDGET',
      name: 'Synergy 6-Plane Cabling, Transceiver & Port Budget Audit',
      status: ctx.errors.length ? 'FAIL' : (ctx.warnings.length ? 'WARN' : 'PASS'),
      errors: ctx.errors,
      warnings: ctx.warnings,
      planes,
      detail
    },
    missingDependencies: ctx.missingDependencies,
    summary: { assets, planes }
  };
}

module.exports = {
  auditSynergyCabling,
  SYNERGY_CABLING_SKUS
};
