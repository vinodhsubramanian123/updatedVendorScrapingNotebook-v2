'use strict';
/**
 * scripts/lib/conflict/ranks/supply_and_pricing.js — Supply Lead-Time, Catalog Price & Base/Fix Part Builders
 */

const fs = require('fs');
const path = require('path');
const { cleanBaseSKU, buildCatalogSkuIndex, isServiceSku, classifyLifecycleState } = require('../../catalog/sku.js');
const { classifyComponentRole } = require('../../catalog/product_meta.js');
const { getHistoricalSkuPrice } = require('../../catalog/sku_versioning.js');

const AVAILABILITY_TARGET_DAYS = 30;
const MAX_AVAILABILITY_VALIDATIONS = 12;
const UNAVAILABLE_SUPPLY = /unavailable|out of stock|not (?:yet )?available|allocation hold|constrained|discontinued|obsolete/i;
const REPLACEMENT_SUPPLY_UNKNOWN = { availability: null, leadTime: null, leadTimeDays: null };

function loadCatalogAndPrices(targetDir) {
  let loadedCatalog = null;
  if (targetDir && fs.existsSync(targetDir)) {
    try {
      const files = fs.readdirSync(targetDir);
      const catFile = files.find(f => f.endsWith('_Catalog.json') && !f.endsWith('_Rules.json'));
      if (catFile) loadedCatalog = JSON.parse(fs.readFileSync(path.join(targetDir, catFile), 'utf8'));
    } catch (err) {
      require('../../system/pipeline_logger.js').warn('STRATEGY_SYNTHESIZER', 'Failed to parse target directory catalog/price history', err);
    }
  }
  return { loadedCatalog };
}

function parseLeadTimeDays(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
  const text = String(value || '').trim().toLowerCase();
  if (!text || text === 'n/a' || text === 'na' || text === 'unknown' || text === 'standard' || text === 'null') return null;
  const range = text.match(/^(?:edt[:\s]+)?(\d+)\s*(?:-|–|to)\s*(\d+)(?:\s*(?:(?:business|calendar)\s+)?days?)?$/);
  if (range) return (Number(range[1]) + Number(range[2])) / 2;
  const plain = text.match(/^(\d+)$/);
  if (plain) return Number(plain[1]);
  const single = text.match(/^(?:edt[:\s]+)?(\d+)\s*(?:(?:business|calendar)\s+)?days?$/);
  return single ? Number(single[1]) : null;
}

function _catalogSupplyAttributes(item) {
  const row = item?.skuData || {};
  const leadTime = row['Lead Time'] ?? row.leadTime ?? row['Estimated Availability Lead Time'] ?? row.estimatedDelivery ?? '';
  return {
    availability: row.Availability || row.availability || row['Supply Status'] || 'Unknown',
    leadTime,
    leadTimeDays: parseLeadTimeDays(row.leadTimeDays) ?? parseLeadTimeDays(leadTime)
  };
}

function createSupplyAttributeResolver(catalog) {
  const index = buildCatalogSkuIndex(catalog || {});
  return sku => _catalogSupplyAttributes(index.get(cleanBaseSKU(sku)));
}

function _isHardwareSupplyItem(attr) {
  const sku = String(attr?.sku || '').trim();
  const desc = String(attr?.description || '').toLowerCase();
  if (isServiceSku(sku) || /^(?:HA|HU|H7)/i.test(sku)) return false;
  if (/\b(tech care|installation service|startup service|deployment service|pointnext|care pack|compute ops|saas)\b/i.test(desc)) return false;
  if (/\bilo\s+advanced\b.*\blicense\b/i.test(desc)) return false;
  return true;
}

function _partSupplyAttributes(part, resolveSupply) {
  const sku = part.sku || part['Product #'] || '';
  const supply = resolveSupply?.(sku) || {};
  const directLeadTime = part.leadTime || part['Estimated Availability Lead Time'] || part['Lead Time'];
  return {
    sku,
    description: part.description || part.Description || '',
    quantity: part.quantity ?? 1,
    availability: part.availability || supply.availability || 'Unknown',
    leadTimeDays: parseLeadTimeDays(part.leadTimeDays) ?? parseLeadTimeDays(directLeadTime) ??
      parseLeadTimeDays(supply.leadTimeDays) ?? parseLeadTimeDays(supply.leadTime)
  };
}

function calculateSupplyMetrics(parts, resolveSupply) {
  const attributes = (parts || []).map(part => _partSupplyAttributes(part, resolveSupply));
  const knownEntries = attributes.filter(a => Number.isFinite(a.leadTimeDays));
  const knownLeadTimes = knownEntries.map(a => a.leadTimeDays);
  const hardwareAttributes = attributes.filter(_isHardwareSupplyItem);
  const hardwareKnownEntries = hardwareAttributes.filter(a => Number.isFinite(a.leadTimeDays));
  const unavailableCount = attributes.filter(a => UNAVAILABLE_SUPPLY.test(a.availability)).length;

  let maxLeadTimeDays = null;
  let pacingItemSku = null;
  let pacingItemDescription = null;
  if (knownEntries.length > 0) {
    const sorted = [...knownEntries].sort((a, b) => b.leadTimeDays - a.leadTimeDays);
    maxLeadTimeDays = sorted[0].leadTimeDays;
    pacingItemSku = sorted[0].sku;
    pacingItemDescription = sorted[0].description;
  }

  const sortedTimes = [...knownLeadTimes].sort((a, b) => a - b);
  const medianLeadTime = sortedTimes.length > 0 ? sortedTimes[Math.floor(sortedTimes.length / 2)] : null;
  const leadTimeOutliers = knownEntries.filter(e =>
    e.leadTimeDays > AVAILABILITY_TARGET_DAYS ||
    (e.leadTimeDays >= 21 && medianLeadTime > 0 && (e.leadTimeDays - medianLeadTime) >= 14) ||
    (medianLeadTime > 0 && e.leadTimeDays > 2 * medianLeadTime)
  );
  const hardwareMaxLeadTimeDays = hardwareKnownEntries.reduce((max, item) => Math.max(max ?? 0, item.leadTimeDays), null);
  const unknownLeadTimeSkus = [...new Set(attributes.filter(a => a.leadTimeDays === null).map(a => a.sku).filter(Boolean))];

  return {
    knownLeadTimeCount: knownLeadTimes.length,
    unknownLeadTimeCount: attributes.length - knownLeadTimes.length,
    hardwareKnownLeadTimeCount: hardwareKnownEntries.length,
    hardwareUnknownLeadTimeCount: hardwareAttributes.length - hardwareKnownEntries.length,
    hardwareMaxLeadTimeDays,
    unavailableCount,
    maxLeadTimeDays,
    pacingItemSku,
    pacingItemDescription,
    availabilityTargetDays: AVAILABILITY_TARGET_DAYS,
    pacingItems: knownEntries.filter(item => item.leadTimeDays === maxLeadTimeDays),
    itemsOverAvailabilityTarget: knownEntries.filter(item => item.leadTimeDays > AVAILABILITY_TARGET_DAYS)
      .sort((a, b) => b.leadTimeDays - a.leadTimeDays || a.sku.localeCompare(b.sku)),
    unknownLeadTimeSkus,
    medianLeadTimeDays: medianLeadTime,
    leadTimeOutliers: leadTimeOutliers.map(o => ({ sku: o.sku, description: o.description, leadTimeDays: o.leadTimeDays })),
    estimatedAverageLeadTimeDays: knownLeadTimes.length
      ? Number((knownLeadTimes.reduce((sum, days) => sum + days, 0) / knownLeadTimes.length).toFixed(1))
      : null,
    solutionEdtDays: knownLeadTimes.length === attributes.length ? maxLeadTimeDays : null,
    rankingPolicy: 'Technical validity and BOQ closeness first; lead time breaks otherwise-equal alternatives'
  };
}

function createPriceResolver(targetDir) {
  const resolved = new Map();
  const getPrice = (sku) => {
    const clean = cleanBaseSKU(sku);
    if (!clean) return 0;
    if (!resolved.has(clean)) {
      const historical = getHistoricalSkuPrice(clean, targetDir);
      const price = Number(historical?.priceUsd);
      resolved.set(clean, {
        price: Number.isFinite(price) && price > 0 ? price : 0,
        status: historical?.status || 'NO_PRICE_RECORDED',
        isResolved: historical?.isResolved === true
      });
    }
    return resolved.get(clean).price;
  };
  getPrice.hasPrice = sku => {
    const clean = cleanBaseSKU(sku);
    if (!clean) return false;
    getPrice(sku);
    const entry = resolved.get(clean);
    return entry ? (entry.price > 0 || entry.isResolved === true) : false;
  };
  getPrice.status = sku => {
    getPrice(sku);
    return resolved.get(cleanBaseSKU(sku))?.status || 'NO_PRICE_RECORDED';
  };
  return getPrice;
}

function computeBaseParts(items, getPrice) {
  return items.map(it => {
    const role = classifyComponentRole(it.category || '', it.description || '');
    const lifecycle = classifyLifecycleState(it.lifecycleStatus, it.diffStatus, it.sku, it.description, it.vendorSupplyStatus);
    const priceFromCatalog = getPrice(it.sku);
    const itemPrice = (typeof it.unitPriceUsd === 'number' && Number.isFinite(it.unitPriceUsd) && it.unitPriceUsd > 0)
      ? it.unitPriceUsd
      : ((typeof it.priceUsd === 'number' && Number.isFinite(it.priceUsd) && it.priceUsd > 0) ? it.priceUsd : 0);
    const price = priceFromCatalog > 0 ? priceFromCatalog : itemPrice;
    const priceKnown = getPrice.hasPrice(it.sku) || itemPrice > 0;
    const isZeroCost = priceKnown && price === 1;
    const directLeadTime = it.leadTime || it['Estimated Availability Lead Time'] || it['Lead Time'] || '';
    const parsedDays = it.leadTimeDays !== undefined && it.leadTimeDays !== null
      ? it.leadTimeDays
      : parseLeadTimeDays(directLeadTime);

    return {
      sku: cleanBaseSKU(it.sku),
      ...(lifecycle.isNonActive ? { lifecycleStatus: lifecycle.canonicalStatus } : {}),
      description: it.description || `HPE Hardware Option (${cleanBaseSKU(it.sku)})`,
      quantity: it.quantity || 1,
      unitPriceUsd: price,
      extendedPriceUsd: price * (it.quantity || 1),
      priceKnown,
      pricingStatus: priceKnown ? (priceFromCatalog > 0 ? getPrice.status(it.sku) : 'QUOTE_UNIT_PRICE') : 'PRICE_UNAVAILABLE',
      isFixInjected: false,
      isZeroCost,
      costTier: !priceKnown ? 'Price unavailable from certified catalog/history' : (price === 1 ? 'Nominal Factory Enablement ($1.00)' : 'Standard Option'),
      category: role !== 'Option Component' ? role : (it.category || 'Base Hardware'),
      leadTime: directLeadTime,
      leadTimeDays: parsedDays
    };
  });
}

function computeFixParts(fixes, getPrice) {
  return fixes.map(f => {
    const role = classifyComponentRole(f.category || '', f.description || '');
    const price = getPrice(f.sku);
    const priceKnown = getPrice.hasPrice(f.sku);
    const isZeroCost = priceKnown && price === 1;
    const directLeadTime = f.leadTime || f['Estimated Availability Lead Time'] || f['Lead Time'] || '';
    const parsedDays = f.leadTimeDays !== undefined && f.leadTimeDays !== null
      ? f.leadTimeDays
      : parseLeadTimeDays(directLeadTime);

    return {
      sku: cleanBaseSKU(f.sku),
      description: f.description || `Injected Aspect Rule Fix (${cleanBaseSKU(f.sku)})`,
      quantity: f.quantity || 1,
      unitPriceUsd: price,
      extendedPriceUsd: price * (f.quantity || 1),
      priceKnown,
      pricingStatus: priceKnown ? getPrice.status(f.sku) : 'PRICE_UNAVAILABLE',
      isFixInjected: true,
      isZeroCost,
      costTier: !priceKnown ? 'Price unavailable from certified catalog/history' : (price === 1 ? 'Nominal Factory Enablement ($1.00)' : 'Aspect Rule Fix'),
      category: role !== 'Option Component' ? role : 'Aspect Rule Fix',
      leadTime: directLeadTime,
      leadTimeDays: parsedDays
    };
  });
}

module.exports = {
  AVAILABILITY_TARGET_DAYS,
  MAX_AVAILABILITY_VALIDATIONS,
  UNAVAILABLE_SUPPLY,
  REPLACEMENT_SUPPLY_UNKNOWN,
  loadCatalogAndPrices,
  parseLeadTimeDays,
  _catalogSupplyAttributes,
  createSupplyAttributeResolver,
  _isHardwareSupplyItem,
  _partSupplyAttributes,
  calculateSupplyMetrics,
  createPriceResolver,
  computeBaseParts,
  computeFixParts
};
