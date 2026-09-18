'use strict';

// Preprocessing boundary: ownership is established before quantity arithmetic.
// A mixed/frame BOM must be split into explicitly owned configurations first.
// NOTE: isCtoBaseChassis inlined here to avoid circular dependency with cto_normalizer.js

const KNOWN_CTO_SKU_PREFIXES = new Set([
  'P76706', 'P56900', 'P52533', 'P73282', 'R0Q21', 'P52534', 'P76449'
]);

// Confirmed $0 service parent contract containers — never mark these as price-unavailable.
// They are order-level placeholders; child options carry the real priced SKUs.
const CONFIRMED_ZERO_PARENT_CONTRACTS = new Set(['HA113A1', 'HU4B2A3']);

function isCtoBaseChassis(it) {
  const desc = (it.description || '').toLowerCase();
  const clean = (it.sku || '').replace(/[^a-zA-Z0-9-]/g, '').trim();
  const prefix = clean.replace(/-.*/, '');
  if (KNOWN_CTO_SKU_PREFIXES.has(prefix)) return true;
  if (desc.includes('configure-to-order') || desc.includes('cto server') || desc.includes('cto chassis')) return true;
  return false;
}

function ambiguity(message) {
  const error = new Error(`CONFIGURATION_OWNERSHIP_AMBIGUOUS: ${message}`);
  error.code = 'CONFIGURATION_OWNERSHIP_AMBIGUOUS';
  return error;
}

function isGlobalItem(it, multiplier = 1) {
  if (it.quantityScope) return it.quantityScope === 'global';
  if (/\b(?:spare|order.level|bulk accessory|lift handle)\b/i.test(it.description || '') ||
    /^(?:HPE )?(?:Installation Service|3Y Tech Care Basic Service)$/i.test(it.description || '')) {
    return true;
  }
  // Transceivers or cables that cannot divide evenly into the configuration multiplier are order-level infrastructure
  if (multiplier > 1 && /\btransceiver\b/i.test(it.description || '')) {
    const raw = Number(it.quantity ?? it.qty ?? 1);
    if (!Number.isInteger(raw / multiplier)) {
      return true;
    }
  }
  return false;
}

function normalizeConfiguration(items) {
  const anchors = items.filter(isCtoBaseChassis);
  const anchor = anchors[0];
  const multiplier = Number(anchor?.configurationMultiplier ?? anchor?.quantity ?? 1);
  const local = items.filter(it => !isGlobalItem(it, multiplier));
  const owners = new Set(local.map(it => it.configurationId).filter(Boolean));
  const nested = local.some(it => it.parentId || it.subParentId || /synergy.*(?:frame|enclosure)|(?:frame|enclosure).*synergy/i.test(it.description || ''));
  if (owners.size > 1 || anchors.length > 1 || nested) {
    throw ambiguity('Multiple configurations or parent/sub-parent hierarchy require separate owned base BOMs; no multiplier was applied.');
  }
  if (!Number.isInteger(multiplier) || multiplier < 1) throw ambiguity('Invalid configuration count.');
  const configurationId = anchor?.configurationId || [...owners][0] || 'configuration-1';
  const normalized = items.map(it => {
    const raw = Number(it.quantity ?? it.qty ?? 1);
    if (!Number.isInteger(raw) || raw < 1) throw ambiguity(`Invalid quantity for ${it.sku}.`);
    const global = isGlobalItem(it, multiplier);
    if (global) return { ...it, quantityScope: 'global', quantityBasis: 'total', configurationMultiplier: 1, atomicQuantity: raw, totalQuantity: raw, isIntegerDivisor: true };
    if (it.configurationId && it.configurationId !== configurationId) throw ambiguity(`Foreign owner for ${it.sku}.`);
    const base = it.quantityBasis === 'base' ? raw : raw / multiplier;
    if (!Number.isInteger(base) || base < 1) throw ambiguity(`${it.sku}: ${raw} cannot be assigned evenly to ${multiplier} configurations; mark global/spare or clarify ownership.`);
    return { ...it, quantity: base, atomicQuantity: base, perNodeQuantity: base, isIntegerDivisor: true,
      quantityBasis: 'base', quantityScope: 'configuration', configurationId,
      configurationMultiplier: multiplier, totalQuantity: base * multiplier,
      extendedPriceUsd: base * (it.unitPriceUsd || 0) };
  });
  return { items: normalized, configurationId, multiplier, baseChassisQuantity: anchor ? 1 : null,
    ownershipEvidence: anchor ? 'SINGLE_CTO_CONFIGURATION' : 'SINGLE_UNIT_INPUT' };
}

function outputQuantities(item, multiplier = 1) {
  const raw = Number(item.quantity ?? item.qty ?? 1);
  if (item.quantityScope === 'global') return { perNodeQty: raw, nodeMult: 1, totalQty: raw };
  const nodeMult = Number(item.configurationMultiplier ?? multiplier);
  // Untagged candidate parts are base quantities by contract, never guessed by divisibility.
  const perNodeQty = item.quantityBasis === 'total' || item.isClusterPreMultiplied
    ? raw / nodeMult : raw;
  if (!Number.isInteger(perNodeQty) || perNodeQty < 1 || !Number.isInteger(nodeMult) || nodeMult < 1) {
    throw ambiguity(`Invalid export quantity for ${item.sku}.`);
  }
  return { perNodeQty, nodeMult, totalQty: perNodeQty * nodeMult };
}

function applyConfigurationContext(result, context) {
  result.configurationContext = context;
  result.items = context.items;
  const globals = context.items.filter(it => it.quantityScope === 'global');
  const graph = result.conflictGraph || {};
  const candidates = new Set([...(graph.rankedSolutions || []), ...(graph.recommendedSolutions || [])]);
  for (const candidate of candidates) {
    candidate.skuPartsList = (candidate.skuPartsList || []).filter(it => it.quantityScope !== 'global').map(it => ({
      ...it, quantityBasis: 'base', quantityScope: 'configuration',
      configurationId: context.configurationId, configurationMultiplier: context.multiplier,
      perNodeQuantity: it.quantity, totalQuantity: it.quantity * context.multiplier
    })).concat(globals);
    candidate.skuList = candidate.skuPartsList;
    candidate.priceUnavailableSkus = [...new Set([
      ...(candidate.priceUnavailableSkus || []),
      ...globals.filter(it =>
        !(it.unitPriceUsd > 0) &&
        !it.isConfirmedZeroPrice &&
        !CONFIRMED_ZERO_PARENT_CONTRACTS.has((it.sku || '').split(' ')[0].replace(/[^a-zA-Z0-9]/g, ''))
      ).map(it => it.sku)
    ])];
    candidate.pricingComplete = candidate.priceUnavailableSkus.length === 0;
    candidate.totalOrderCostUsd = candidate.skuPartsList.reduce((sum, it) => sum + outputQuantities(it, context.multiplier).totalQty * (it.unitPriceUsd || 0), 0);
  }
  if (result.clusterSizing) {
    result.baseConfigurationSizing = { ...result.clusterSizing };
    result.clusterSizing = { ...result.clusterSizing, serverCount: context.multiplier, totalNodes: context.multiplier };
    for (const key of ['totalRackUnits', 'totalFacilityPowerKw']) {
      if (Number.isFinite(result.clusterSizing[key])) result.clusterSizing[key] *= context.multiplier;
    }
    result.clusterSizing.standard42uRacksRequired = Math.ceil(result.clusterSizing.totalRackUnits / 42);
    if (result.clusterSizing.railKitCoverage) {
      result.clusterSizing.railKitCoverage = { ...result.clusterSizing.railKitCoverage };
      for (const key of ['required', 'providedCount']) {
        if (Number.isFinite(result.clusterSizing.railKitCoverage[key])) result.clusterSizing.railKitCoverage[key] *= context.multiplier;
      }
    }
  }
  return result;
}

module.exports = { normalizeConfiguration, outputQuantities, applyConfigurationContext, isGlobalItem };
