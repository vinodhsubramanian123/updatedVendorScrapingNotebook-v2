'use strict';
/**
 * scripts/lib/boq/gates/turnkey_racking_gates.js — Turnkey Racking, Cabling & Optical Gate (B20 / INV-228)
 */

const { cleanBaseSKU } = require('../../catalog/sku.js');
const { auditOpticalLinkEndpoints } = require('../../aspects/networking_ocp.js');
const { makeCheck } = require('./gate_check_builder.js');

const RAIL_KIT_SKUS = new Set(['P69770-B21', 'P52341-B21', 'P26485-B21', 'P26487-B21', 'P52343-B21']);
const RAIL_1U_SKUS = new Set(['P52343-B21']);
const RAIL_2U_SKUS = new Set(['P69770-B21', 'P52341-B21', 'P26485-B21']);

function _detectChassisUHeight(parts) {
  for (const p of parts) {
    const d = String(p.desc || '').toLowerCase();
    if (d.includes('dl360') || d.includes('1u cto') || d.includes('1u server')) return 1;
    if (d.includes('dl380') || d.includes('dl385') || d.includes('2u cto') || d.includes('2u server')) return 2;
    if (d.includes('dl580') || d.includes('4u cto') || d.includes('4u server')) return 4;
    if (d.includes('synergy') || d.includes('sy480') || d.includes('compute module')) return 0;
  }
  return 2;
}

function _hasTurnkeyRailKit(parts) {
  return parts.some(p => p.qty > 0 && (
    RAIL_KIT_SKUS.has(p.sku) ||
    p.desc.includes('rail kit') ||
    p.desc.includes('ball bearing rail') ||
    p.desc.includes('easy install rail') ||
    p.category.includes('rail kit') ||
    p.category.includes('chassis infrastructure & rail') ||
    p.role.includes('rail')
  ));
}

function _getTurnkeyRailKitQuantity(parts) {
  return parts.filter(p => p.qty > 0 && (
    RAIL_KIT_SKUS.has(p.sku) ||
    p.desc.includes('rail kit') ||
    p.desc.includes('ball bearing rail') ||
    p.desc.includes('easy install rail') ||
    p.category.includes('rail kit') ||
    p.category.includes('chassis infrastructure & rail') ||
    p.role.includes('rail')
  )).reduce((sum, p) => sum + p.qty, 0);
}

function _detectServerNodeCount(parts) {
  const chassisParts = parts.filter(p => {
    return p.qty > 0 && (
      p.role === 'base chassis' ||
      p.desc.includes('cto server') ||
      p.desc.includes('cto chassis') ||
      p.desc.includes('rack server') ||
      p.category === 'chassis'
    );
  });
  if (chassisParts.length > 0) {
    return chassisParts.reduce((sum, p) => sum + p.qty, 0);
  }
  return 1;
}

function _isTurnkeyRequested(context, output) {
  const tenderText = String(context.tenderText || context.userPrompt || output?.userPrompt || output?.query || '').toLowerCase();
  return /\b(?:installation|racking|cabling|turnkey|rack and cable|mount in rack|deploy at site)\b/i.test(tenderText);
}

function _normalizeBomParts(output) {
  const items = output?.items || output?.candidateBOM || output?.skuPartsList || [];
  return items.map(it => {
    const rawQty = it.quantity ?? it.qty;
    const isValidQty = (typeof rawQty === 'number' || typeof rawQty === 'string') &&
      Number.isSafeInteger(Number(rawQty)) && Number(rawQty) > 0;
    return {
      sku: cleanBaseSKU(it.sku || it['Product #'] || ''),
      desc: String(it.description || it.Description || '').toLowerCase(),
      category: String(it.category || it.parentCategory || it.subCategory || '').toLowerCase(),
      role: String(it['Component Role'] || it.componentRole || '').toLowerCase(),
      qty: isValidQty ? Number(rawQty) : 0,
      hasInvalidQty: !isValidQty
    };
  });
}

function _auditTurnkeyRailKits(parts, requiredNodes, missingTurnkeyItems) {
  const uHeight = _detectChassisUHeight(parts);
  if (uHeight === 0) {
    return { hasRailKit: true, railKitQty: requiredNodes };
  }

  const hasRailKit = _hasTurnkeyRailKit(parts);
  const railKitQty = _getTurnkeyRailKitQuantity(parts);
  if (!hasRailKit || railKitQty === 0) {
    missingTurnkeyItems.push('Rack Rail Kit (e.g. P69770-B21 Ball Bearing Rails)');
    return { hasRailKit: false, railKitQty: 0 };
  }
  if (railKitQty < requiredNodes) {
    missingTurnkeyItems.push(`Rail kit quantity (${railKitQty}) insufficient for ${requiredNodes} nodes`);
  }

  const has1uRails = parts.some(p => p.qty > 0 && (RAIL_1U_SKUS.has(p.sku) || p.desc.includes('1u easy install')));
  const has2uRails = parts.some(p => p.qty > 0 && (RAIL_2U_SKUS.has(p.sku) || p.desc.includes('2u easy install') || p.desc.includes('2u ball bearing')));

  if (uHeight === 1 && has2uRails && !has1uRails) {
    missingTurnkeyItems.push('1U-qualified Rack Rail Kit (e.g. P52343-B21; found incompatible 2U rail kit)');
  } else if (uHeight === 2 && has1uRails && !has2uRails) {
    missingTurnkeyItems.push('2U-qualified Rack Rail Kit (e.g. P52341-B21/P69770-B21; found incompatible 1U rail kit)');
  }

  return { hasRailKit, railKitQty };
}

function _auditTurnkeyTransceivers(parts, missingTurnkeyItems) {
  const linkResult = auditOpticalLinkEndpoints(parts);
  const opticalNics = linkResult.opticalNics;
  const totalTransceiversQty = linkResult.transceivers.reduce((sum, p) => sum + p.qty, 0);
  const totalOpticalPorts = Object.values(linkResult.demands).reduce((sum, n) => sum + n, 0);

  if (linkResult.mismatches.length > 0) {
    missingTurnkeyItems.push(...linkResult.mismatches);
  }
  if (linkResult.missing.length > 0) {
    missingTurnkeyItems.push(...linkResult.missing);
  }
  if (linkResult.deficits.length > 0) {
    missingTurnkeyItems.push(...linkResult.deficits);
  }

  return { opticalNics, totalTransceiversQty, totalOpticalPorts, linkResult };
}

function _checkTurnkeyDeploymentCompleteness(output, context = {}) {
  if (!_isTurnkeyRequested(context, output)) {
    return makeCheck(
      'B20',
      'Turnkey Racking, Cabling & Optical Transceiver Completeness (INV-228)',
      'BLOCK',
      'NOT_APPLICABLE',
      'Turnkey deployment/racking/cabling not explicitly requested in customer tender.'
    );
  }

  const parts = _normalizeBomParts(output);
  const requiredNodes = context.serverCount ?? output?.serverCount ?? _detectServerNodeCount(parts);
  const missingTurnkeyItems = [];
  if (!Number.isSafeInteger(requiredNodes) || requiredNodes <= 0) {
    missingTurnkeyItems.push('Valid positive integer server count');
  }
  if (parts.some(p => p.hasInvalidQty)) {
    missingTurnkeyItems.push('Explicit positive integer quantities for every BOM item');
  }

  const { hasRailKit } = _auditTurnkeyRailKits(parts, requiredNodes, missingTurnkeyItems);
  const { opticalNics, totalTransceiversQty, linkResult } = _auditTurnkeyTransceivers(parts, missingTurnkeyItems);

  if (missingTurnkeyItems.length > 0) {
    return makeCheck(
      'B20',
      'Turnkey Racking, Cabling & Optical Transceiver Completeness (INV-228)',
      'BLOCK',
      'ACTION_REQUIRED',
      `Customer tender mandates turnkey deployment/installation, but physical infrastructure is incomplete: missing ${missingTurnkeyItems.join('; ')}. Site turn-up will fail without these physical components.`,
      { missingTurnkeyItems }
    );
  }

  return makeCheck(
    'B20',
    'Turnkey Racking, Cabling & Optical Transceiver Completeness (INV-228)',
    'BLOCK',
    'PASSED',
    'Turnkey infrastructure verified: rack rails and network transceivers/cabling are present and speed-matched in candidate BOM.',
    { hasRailKit, opticalNicsCount: opticalNics.length, transceiversCount: totalTransceiversQty, speedDemands: linkResult?.demands }
  );
}

module.exports = {
  _checkTurnkeyDeploymentCompleteness
};
