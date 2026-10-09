'use strict';

/**
 * scripts/lib/boq/pricing_presence.js — Bounded pricing presence and completeness helpers.
 */

const CONFIRMED_ZERO_PARENT_CONTRACTS = new Set(['HA113A1', 'HU4B2A3']);

function isConfirmedZeroSku(sku, item = {}) {
  if (item.isConfirmedZeroPrice === true) return true;
  const clean = (sku || item.sku || '').split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
  return CONFIRMED_ZERO_PARENT_CONTRACTS.has(clean);
}

function parseObservedUnitPrice(rawValue) {
  if (rawValue === null || rawValue === undefined) return null;
  if (typeof rawValue !== 'number' && typeof rawValue !== 'string') return null;

  if (typeof rawValue === 'number') {
    if (Number.isNaN(rawValue) || !Number.isFinite(rawValue) || rawValue < 0) return null;
    return rawValue;
  }

  const str = rawValue.trim();
  if (str === '') return null;
  // Negative inputs are not observed prices
  if (/^[\s\-(]*-|\(\$?\d/.test(str) || /-\s*\$?\d/.test(str)) return null;

  // Accepted decimal/currency syntax: optional $, digits with optional standard commas (every 3 digits), optional .cents
  // Rejects hex (0x10), malformed commas (1,2), strings, NaN, Infinity
  const match = str.match(/^\$?\s*(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?$/);
  if (!match) return null;

  const intPart = match[1].replace(/,/g, '');
  const fracPart = match[2] ? '.' + match[2] : '';
  const num = parseFloat(intPart + fracPart);
  if (!Number.isFinite(num) || num < 0) return null;
  return num;
}

function evaluateItemPricing(item) {
  const price = item.unitPriceUsd;
  const isNumber = typeof price === 'number' && Number.isFinite(price);
  const isPositive = isNumber && price > 0;
  const isZero = isNumber && price === 0 && (item.isConfirmedZeroPrice === true || isConfirmedZeroSku(item.sku, item));
  return {
    isPriced: isPositive || isZero,
    unitPriceUsd: (isPositive || isZero) ? price : null,
    isConfirmedZero: isZero
  };
}

function summarizeCandidatePricing(skuPartsList, multiplier = 1, initialUnavailable = [], outputQuantitiesFn = null) {
  const unavailableSkus = new Set(initialUnavailable);
  let knownSubtotal = 0;
  let hasNonFinite = false;

  for (const it of (skuPartsList || [])) {
    let qty = 1;
    if (typeof outputQuantitiesFn === 'function') {
      const qObj = outputQuantitiesFn(it, multiplier);
      qty = qObj.totalQty;
    } else {
      qty = it.totalQuantity ?? (it.quantityScope === 'global' ? it.quantity : (it.quantity || 1) * multiplier);
    }

    const { isPriced, unitPriceUsd } = evaluateItemPricing(it);

    if (isPriced) {
      if (typeof unitPriceUsd === 'number' && unitPriceUsd > 0) {
        const lineTotal = qty * unitPriceUsd;
        if (!Number.isFinite(lineTotal)) {
          hasNonFinite = true;
          if (it.sku) unavailableSkus.add(it.sku);
        } else {
          knownSubtotal += lineTotal;
          if (!Number.isFinite(knownSubtotal)) {
            hasNonFinite = true;
            if (it.sku) unavailableSkus.add(it.sku);
          }
        }
      }
    } else {
      if (it.sku) unavailableSkus.add(it.sku);
    }
  }

  if (!Number.isFinite(knownSubtotal) || hasNonFinite) {
    hasNonFinite = true;
    knownSubtotal = null;
  }

  const priceUnavailableSkus = Array.from(unavailableSkus);
  const pricingComplete = priceUnavailableSkus.length === 0 && !hasNonFinite;

  return {
    pricingComplete,
    priceUnavailableSkus,
    knownOrderSubtotalUsd: knownSubtotal,
    totalOrderCostUsd: pricingComplete ? knownSubtotal : null
  };
}

module.exports = {
  CONFIRMED_ZERO_PARENT_CONTRACTS,
  isConfirmedZeroSku,
  parseObservedUnitPrice,
  evaluateItemPricing,
  summarizeCandidatePricing
};
