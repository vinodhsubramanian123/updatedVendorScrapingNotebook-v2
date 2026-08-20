'use strict';
/**
 * scripts/lib/preprocessor/cto_normalizer.js — CTO Atomic Multiplier & Quantity Normalizer
 *
 * Normalizes child SKU quantities per 1-Unit CTO Server Chassis.
 * e.g., If 5x DL380 Gen12 CTO Server is ordered, child items with total Qty 10
 * get normalized to 2 per unit. Flags non-integer fractional anomalies.
 */

const { cleanBaseSKU, isServiceSku } = require('../sku.js');

// Standard CTO Chassis Base SKU prefixes / identifiers
const KNOWN_CTO_SKU_PREFIXES = new Set([
  'P76706', // DL380 Gen12 8SFF CTO
  'P56900', // DL380 Gen11 8SFF CTO
  'P52533', // DL380 Gen11 8LFF CTO
  'P73282', // DL380 Gen12 CTO Base
  'R0Q21',  // MSA Storage Array Base
  'P52534', // DL360 Gen11 CTO
  'P76449'  // Alletra Storage Base
]);

/**
 * Helper to identify if an item is a CTO Base Chassis / Enclosure
 *
 * @param {object} it - SKU item { sku, description, quantity }
 * @returns {boolean}
 */
function isCtoBaseChassis(it) {
  const desc = (it.description || '').toLowerCase();
  const sku = cleanBaseSKU(it.sku);

  if (
    desc.includes('configure-to-order') ||
    desc.includes('cto server') ||
    desc.includes('cto chassis') ||
    desc.includes('base server') ||
    desc.includes('base enclosure') ||
    desc.includes('8 double wide') ||
    desc.includes('8 sff')
  ) {
    return true;
  }

  for (const prefix of KNOWN_CTO_SKU_PREFIXES) {
    if (sku.startsWith(prefix)) return true;
  }

  return false;
}

/**
 * Normalizes child SKU quantities per 1-Unit CTO Server Chassis
 *
 * @param {Array<object>} items - Parsed BOQ items
 * @returns {{
 *   items: Array<object>,
 *   baseChassisSku: string|null,
 *   baseChassisQty: number,
 *   isMultipliedOrder: boolean,
 *   hasNonIntegerDivisor: boolean,
 *   ctoAnomalies: Array<object>
 * }}
 */
function detectAndNormalizeAtomicCto(items) {
  let baseChassisItem = null;
  let baseChassisQty = 1;

  for (const it of items) {
    if (isCtoBaseChassis(it)) {
      baseChassisItem = it;
      baseChassisQty = Math.max(1, parseInt(it.quantity, 10) || 1);
      break;
    }
  }

  const ctoAnomalies = [];
  let hasNonIntegerDivisor = false;

  const normalizedItems = items.map(it => {
    if (baseChassisItem && it.sku === baseChassisItem.sku) {
      return {
        ...it,
        atomicQuantity: 1,
        totalQuantity: it.quantity,
        isBaseChassis: true,
        isIntegerDivisor: true
      };
    }

    if (baseChassisQty > 1) {
      const totalQ = parseInt(it.quantity, 10) || 1;
      const atomicQtyRaw = totalQ / baseChassisQty;
      const isInteger = Number.isInteger(atomicQtyRaw);
      const isService = isServiceSku(it.sku) || (it.description || '').toLowerCase().includes('service');

      if (!isInteger && !isService) {
        hasNonIntegerDivisor = true;
        ctoAnomalies.push({
          type: 'NON_INTEGER_CTO_DIVISOR_ANOMALY',
          sku: it.sku,
          description: it.description,
          totalQty: totalQ,
          baseChassisQty,
          perUnitQty: parseFloat(atomicQtyRaw.toFixed(2)),
          message: `SKU ${it.sku} total quantity (${totalQ}) is not an even multiple of base chassis quantity (${baseChassisQty}). Calculated per-unit quantity: ${atomicQtyRaw.toFixed(2)}.`
        });
      }

      return {
        ...it,
        atomicQuantity: isInteger ? atomicQtyRaw : (isService ? totalQ : parseFloat(atomicQtyRaw.toFixed(2))),
        totalQuantity: totalQ,
        isMultipliedByCto: true,
        isIntegerDivisor: isInteger || isService
      };
    } else {
      const q = parseInt(it.quantity, 10) || 1;
      return {
        ...it,
        atomicQuantity: q,
        totalQuantity: q,
        isMultipliedByCto: false,
        isIntegerDivisor: true
      };
    }
  });

  return {
    items: normalizedItems,
    baseChassisSku: baseChassisItem ? baseChassisItem.sku : null,
    baseChassisQty,
    isMultipliedOrder: baseChassisQty > 1,
    hasNonIntegerDivisor,
    ctoAnomalies
  };
}

module.exports = {
  isCtoBaseChassis,
  detectAndNormalizeAtomicCto,
  KNOWN_CTO_SKU_PREFIXES
};
