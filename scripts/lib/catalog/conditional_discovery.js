'use strict';
const { cleanBaseSKU, isValidHpeSKU, classifyOptionType, isTaaGtaCatalogOption } = require('./sku.js');
const { classifyComponentRole } = require('./product_meta.js');
const {
  parseStrictPrice,
  parseLeadTimeOrEta,
  normalizeLifecycleCanonical,
  buildAvailabilityContract,
  classifyRowType
} = require('./field_parsers.js');

const LIFECYCLE_DISPLAY_LABELS = Object.freeze({
  Obsolete: 'Obsolete (OB)',
  '90-Day Warning': 'EOL Warning (90-Day)',
  'Direct Ship': 'Direct Ship (DS)',
  'Constrained Supply': 'Constrained Supply (CS)',
  Active: 'Active',
  Unknown: 'Unknown'
});

function _formatLifecycleDisplayLabel(lifecycleNorm, fallback = 'Active') {
  const canonical = lifecycleNorm?.lifecycleCanonical || fallback;
  if (canonical === 'Hidden / Conditional') return fallback;
  return LIFECYCLE_DISPLAY_LABELS[canonical] || canonical;
}

function _buildConditionalRule(observation, sku) {
  const ambient = observation.conditionType === 'AMBIENT_GATE' && Number.isFinite(observation.thresholdDegC);
  const selectorScoped = observation.conditionType === 'SELECTOR_STATE_CONDITIONAL';
  const condType = ambient ? 'AMBIENT_GATE' : (observation.conditionType && observation.conditionType !== 'UNKNOWN_PORTAL_CONDITION' ? observation.conditionType : 'PORTAL_CONDITIONAL_VIEW');
  const condKey = ambient ? 'ambientTempC' : (selectorScoped ? (observation.conditionKey || 'backplaneSelector') : 'portalSelector');
  const condOp = ambient ? observation.operator : (observation.operator || 'requires_selection');
  const ruleContextDesc = observation.ruleContext ? ` (${observation.ruleContext})` : '';
  return {
    level: 'CHASSIS',
    ruleType: 'CONDITIONAL_VISIBILITY',
    affectedSkus: [sku],
    conditionType: condType,
    conditionKey: condKey,
    conditionOperator: condOp,
    thresholdValue: ambient ? observation.thresholdDegC : null,
    ...(observation.selectorTriggerSku ? { selectorTriggerSku: observation.selectorTriggerSku } : {}),
    portalVerificationRequired: true,
    rule: ambient
      ? `${sku} conditional visibility: ambient temperature ${{ lte: '<=', gte: '>=', eq: '==' }[observation.operator] || 'unknown'} ${observation.thresholdDegC} C; PORTAL_CONDITIONAL`
      : `${sku} conditional visibility: portal selector activation required${ruleContextDesc}; PORTAL_CONDITIONAL`
  };
}

function _extractScopeProvenance(source = {}) {
  return {
    baseSku: source.baseSku || source.chassisSku || null,
    ownerProduct: source.ownerProduct || source.product || null,
    ownerConfiguration: source.ownerConfiguration || source.configuration || null,
    region: source.region || 'US',
    selectorState: source.selectorState || source.selectorTriggerSku || source.ruleContext || null
  };
}

function _buildSelectorLeadTimeAndLifecycle(observation) {
  const badge = String(observation.badge || observation.lifecycleBadge || '').trim().toUpperCase();
  const leadTimeParsed = parseLeadTimeOrEta(
    observation['Lead Time'] || observation.leadTime,
    observation.leadTimeDays,
    observation['Speed Tier']
  );
  const lifecycleNorm = normalizeLifecycleCanonical(
    badge || observation.supplyBadge || observation.lifecycleStatus || 'Active',
    true
  );
  return { badge, leadTimeParsed, lifecycleNorm };
}

function _createSelectorDiscoveredRow(observation, sku, rule) {
  const cleanDesc = String(observation.description || 'HPE Hardware Option').replace(/[\r\n\t]+/g, ' ').trim();
  const priceParsed = parseStrictPrice(
    observation.numericListPrice ?? observation.listPrice ?? observation.unitPriceUsd ?? observation['Unit Price (USD)'],
    { sku, description: cleanDesc, row: observation }
  );
  const hasPrice = priceParsed.priceUsd !== null && priceParsed.priceUsd > 0;
  const { badge, leadTimeParsed, lifecycleNorm } = _buildSelectorLeadTimeAndLifecycle(observation);
  const scopeProvenance = _extractScopeProvenance(observation);
  const priceStr = hasPrice ? priceParsed.priceUsd.toFixed(2) : '';
  const parentCategory = observation.parentCategory || 'Drive Enclosures / Drives';
  const rawSubCategory = observation.rawSubCategory || observation.subCategory || 'Hot Plug SFF Drives (Selector Conditional)';
  const componentRole = observation['Component Role'] || observation.componentRole || classifyComponentRole(parentCategory, cleanDesc);
  const rowType = observation.rowType || classifyRowType({
    sku,
    'Product #': sku,
    Description: cleanDesc,
    description: cleanDesc,
    category: parentCategory,
    subCategory: rawSubCategory,
    'Component Role': componentRole
  });
  return {
    'Product #': sku,
    sku,
    Description: cleanDesc,
    'Option Type': observation.optionType || classifyOptionType(sku),
    'Component Role': componentRole,
    subCategory: rawSubCategory,
    rawSubCategory,
    rowType,
    'Current Qty': '0',
    'Unit Price (USD)': priceStr,
    'Extended Price (USD)': 'NA',
    'List Price (USD)': priceStr,
    listPrice: hasPrice ? priceParsed.priceUsd : null,
    priceState: priceParsed.priceState,
    priceStatus: priceParsed.priceStatus,
    'HPE Recommended': observation.preferred ? 'Yes' : (observation['HPE Recommended'] || 'No'),
    vendorRecommended: Boolean(observation.preferred),
    'Lead Time': leadTimeParsed.raw,
    leadTimeDays: leadTimeParsed.days,
    leadTimeUnit: leadTimeParsed.unit,
    etaDate: leadTimeParsed.etaDate,
    speedTier: leadTimeParsed.speedTier,
    'Lead Time Days': leadTimeParsed.days === null ? '' : String(leadTimeParsed.days),
    'Lead Time Source': leadTimeParsed.isPublished ? 'OCA selector probe row attribute' : 'Unknown',
    'Start Date': observation.startDate || '',
    'Discontinued Date': observation.discontinuedDate || '',
    'Obsolete Date': observation.obsoleteDate || '',
    'CLIC Status': observation.inUnavail ? 'Conditional' : 'Selectable under selector gate',
    'Lifecycle Status': _formatLifecycleDisplayLabel(lifecycleNorm, 'Active'),
    lifecycleStatus: lifecycleNorm.lifecycleCanonical,
    lifecycleCanonical: lifecycleNorm.lifecycleCanonical,
    lifecycleBadge: badge || lifecycleNorm.lifecycleBadge || '',
    Availability: observation.inUnavail ? 'Unavailable under default config' : 'Conditionally selectable via portal selector',
    visibility: observation.inUnavail ? 'SELECTOR_HIDDEN' : 'DOM_HIDDEN',
    visibilityState: 'PORTAL_CONDITIONAL',
    conditionType: rule.conditionType,
    thresholdValue: rule.thresholdValue,
    conditionOperator: rule.conditionOperator,
    conditionKey: rule.conditionKey,
    selectorTriggerSku: observation.selectorTriggerSku || null,
    observedInPortal: true,
    scopeProvenance,
    ownerProduct: scopeProvenance.ownerProduct,
    provenance: observation.ruleContext || rule.rule
  };
}

function _attachSelectorDiscoveredRow(targetEntries, observation, newRow, rule) {
  const parentCategory = observation.parentCategory || 'Drive Enclosures / Drives';
  const subCategory = observation.subCategory || 'Hot Plug SFF Drives (Selector Conditional)';
  let entry = targetEntries.find(e =>
    (e.parentCategory || '').toLowerCase() === parentCategory.toLowerCase() &&
    (e.subCategory || '').toLowerCase() === subCategory.toLowerCase()
  );
  if (!entry) {
    entry = {
      parentCategory,
      subCategory,
      constraint: observation.selectorTriggerSku ? `Requires selector ${observation.selectorTriggerSku}` : 'Selector conditional',
      minQty: 0,
      maxQty: null,
      maxQtySemantics: 'UNBOUNDED',
      rules: [],
      skus: []
    };
    targetEntries.push(entry);
  }
  if (!entry.skus.some(row => cleanBaseSKU(row.sku || row['Product #']) === newRow.sku)) {
    entry.skus.push(newRow);
  }
  entry.skuCount = entry.skus.length;
  entry.rules = [...new Set([...(entry.rules || []), rule.rule])];
  rule.parentCategory = entry.parentCategory;
  rule.subCategory = entry.subCategory;
}

function applyConditionalDiscovery(entries, observations = [], targetEntries = entries) {
  const rules = [];
  for (const observation of observations) {
    if (isTaaGtaCatalogOption(observation.rawSku || observation.sku, observation.description)) continue;
    if (observation.visibilityReason === 'HIDDEN_IN_DEFAULT_DOM_STATE' &&
      /^(?:OB|DS|CS|90|PVT)$/i.test(String(observation.ruleContext || '').trim())) continue;
    const sku = cleanBaseSKU(observation.sku);
    if (!sku || !isValidHpeSKU(sku)) continue;
    const rule = _buildConditionalRule(observation, sku);
    let matchedCount = 0;
    for (const entry of entries) {
      const matched = (entry.skus || []).filter(row => cleanBaseSKU(row.sku || row['Product #']) === sku);
      if (!matched.length) continue;
      matchedCount += matched.length;
      rule.parentCategory = entry.parentCategory;
      rule.subCategory = entry.subCategory;
      entry.rules = [...new Set([...(entry.rules || []), rule.rule])];
      for (const row of matched) {
        if (!row['Component Role']) {
          row['Component Role'] = classifyComponentRole(entry.parentCategory || '', row.Description || row.description || '');
        }
        Object.assign(row, {
          visibilityState: 'PORTAL_CONDITIONAL',
          conditionType: rule.conditionType,
          thresholdValue: rule.thresholdValue,
          conditionOperator: rule.conditionOperator,
          conditionKey: rule.conditionKey,
          ...(observation.selectorTriggerSku ? { selectorTriggerSku: observation.selectorTriggerSku } : {}),
          ...(observation.observedInPortal ? { observedInPortal: true } : {})
        });
      }
    }
    if (matchedCount === 0 && observation.observedInPortal === true && observation.description && Array.isArray(targetEntries)) {
      const newRow = _createSelectorDiscoveredRow(observation, sku, rule);
      _attachSelectorDiscoveredRow(targetEntries, observation, newRow, rule);
    }
    rules.push(rule);
  }
  return rules;
}

/**
 * Ingest explicit unavailable rules and conditional SKUs extracted from DOM unavailable tables.
 * Enriches existing catalog entries or adds new conditional SKU records under their matching parent categories,
 * and compiles auditable, structured catalog rules.
 *
 * @param {Array<object>} hardwareEntries
 * @param {Array<object>} cleanServicesEntries
 * @param {Array<object>} unavailableRules
 * @param {Array<object>} unavailableSkus
 * @returns {Array<object>} Compiled catalog rules
 */
function _compileUnavailableDomRule(r) {
  const isAmbient = r.ruleType === 'AMBIENT_GATE';
  const tempMatch = (r.reason || '').match(/(\d+)C/i);
  const thresholdDegC = isAmbient && tempMatch ? parseFloat(tempMatch[1]) : null;

  let conditionKey = 'portalSelection';
  if (isAmbient) conditionKey = 'ambientTempC';
  else if (r.ruleType === 'CHASSIS_GATE') conditionKey = 'chassisModel';
  else if (r.ruleType === 'MEMORY_MIXING') conditionKey = 'memoryType';
  else if (r.ruleType === 'SLOT_COLLISION') conditionKey = 'slotConfiguration';

  return {
    level: 'CHASSIS',
    ruleType: 'CONDITIONAL_VISIBILITY',
    vendorRuleClassification: r.ruleType || 'UNCLASSIFIED_OBSERVATION',
    parentCategory: r.section || 'General Options',
    subCategory: 'Configuration Rules',
    constraint: r.reason || '',
    maxQty: '',
    rule: `[${r.ruleType || 'UNCLASSIFIED_OBSERVATION'}] ${r.reason}`,
    conditionKey,
    // A prohibition at 30C does not establish an allowed maximum of 30C.
    conditionOperator: 'unknown',
    thresholdValue: null,
    observedTemperatureC: thresholdDegC,
    affectedSkus: (r.affectedSkus || []).map(cleanBaseSKU).filter(Boolean),
    ineligibilityReason: r.reason,
    source: 'HPE_OCA_DOM_UNAVAILABLE_TABLE',
    portalVerificationRequired: true
  };
}

function _buildExistingSkuMap(allEntries) {
  const existingSkuMap = new Map();
  for (const entry of allEntries) {
    for (const row of (entry.skus || [])) {
      const pn = cleanBaseSKU(row['Product #'] || row.sku);
      if (pn && !existingSkuMap.has(pn)) {
        existingSkuMap.set(pn, { entry, row });
      }
    }
  }
  return existingSkuMap;
}

function _enrichExistingRow(row, u) {
  row.visibilityState = 'PORTAL_CONDITIONAL';
  row.visibility = row.visibility || 'SELECTOR_HIDDEN';
  row.isSelectable = false;
  row.status = 'PORTAL_CONDITIONAL';
  row.ineligibilityReason = u.ineligibilityReason || row.ineligibilityReason;
  row.ruleType = u.ruleType || row.ruleType;
  row.scopeProvenance = _extractScopeProvenance({ ...u, ...row.scopeProvenance });
  if (u.supplyBadge) row.supplyBadge = u.supplyBadge;
  if (u.supplyTitle) row.supplyTitle = u.supplyTitle;
  if (u.isPrivateSku) row.isPrivateSku = true;
}

function _createConditionalRow(u, cleanSku) {
  const cleanDesc = String(u.description || 'HPE Hardware Option').replace(/[\r\n\t]+/g, ' ').trim();
  const detectedOptionType = u.optionType || classifyOptionType(cleanSku);
  const priceParsed = parseStrictPrice(u.numericListPrice ?? u.listPrice, { sku: cleanSku, description: cleanDesc, row: u });
  const hasPrice = priceParsed.priceUsd !== null && priceParsed.priceUsd > 0;
  const lifecycleNorm = normalizeLifecycleCanonical(u.lifecycleStatus || 'Unknown', true);
  const availabilityContract = buildAvailabilityContract({
    skuRow: { sku: cleanSku, lifecycleStatus: lifecycleNorm.lifecycleCanonical, visibility: 'SELECTOR_HIDDEN', portalConditional: true }
  });
  const scopeProvenance = _extractScopeProvenance(u);
  const componentRole = u['Component Role'] || u.componentRole
    || (u.section && u.section !== 'General Options' ? u.section : classifyComponentRole('', cleanDesc));
  const rowType = u.rowType || classifyRowType({
    sku: cleanSku,
    'Product #': cleanSku,
    Description: cleanDesc,
    description: cleanDesc,
    category: u.section || '',
    'Component Role': componentRole
  });

  return {
    'Product #': cleanSku,
    sku: cleanSku,
    'Option Type': detectedOptionType,
    'Component Role': componentRole,
    rowType,
    Description: cleanDesc,
    'Current Qty': '0',
    'Unit Price (USD)': hasPrice ? priceParsed.priceUsd.toFixed(2) : '',
    listPrice: hasPrice ? priceParsed.priceUsd : null,
    priceState: priceParsed.priceState,
    priceStatus: priceParsed.priceStatus,
    'CLIC Status': 'Conditional',
    'Lifecycle Status': _formatLifecycleDisplayLabel(lifecycleNorm, 'Unknown'),
    lifecycleStatus: lifecycleNorm.lifecycleCanonical,
    lifecycleCanonical: lifecycleNorm.lifecycleCanonical,
    'HPE Recommended': u['HPE Recommended'] || 'Unknown',
    Availability: 'Conditionally available in OCA based on configuration gates',
    visibility: availabilityContract.visibility,
    availability: availabilityContract.availability,
    compatibility: availabilityContract.compatibility,
    'Start Date': u.startDate || '',
    'Discontinued Date': u.discontinuedDate || '',
    isPrivateSku: Boolean(u.isPrivateSku || /\bPVT\b/i.test(String(u.rawSku || u.sku))),
    visibilityState: 'PORTAL_CONDITIONAL',
    isSelectable: false,
    status: 'PORTAL_CONDITIONAL',
    ineligibilityReason: u.ineligibilityReason,
    ruleType: u.ruleType,
    supplyBadge: u.supplyBadge || '',
    supplyTitle: u.supplyTitle || '',
    scopeProvenance,
    ownerProduct: scopeProvenance.ownerProduct,
    provenance: 'HPE OCA Unavailable Table DOM Extraction'
  };
}

function _attachConditionalRowToSection(hardwareEntries, u, newRow, cleanSku, existingSkuMap) {
  const targetSection = u.section || 'General Options';
  let targetEntry = hardwareEntries.find(e =>
    (e.parentCategory && e.parentCategory.toLowerCase() === targetSection.toLowerCase()) ||
    (e.subCategory && e.subCategory.toLowerCase() === targetSection.toLowerCase())
  );

  if (!targetEntry) {
    targetEntry = {
      parentCategory: targetSection,
      subCategory: 'Conditional Options',
      constraint: '',
      rules: [`[${u.ruleType}] ${u.ineligibilityReason}`],
      skus: []
    };
    hardwareEntries.push(targetEntry);
  }

  targetEntry.skus.push(newRow);
  if (u.ineligibilityReason) {
    targetEntry.rules = [...new Set([...(targetEntry.rules || []), `[${u.ruleType}] ${u.ineligibilityReason}`])];
  }
  existingSkuMap.set(cleanSku, { entry: targetEntry, row: newRow });
}

function applyUnavailableDomRulesAndSkus(hardwareEntries, cleanServicesEntries, unavailableRules = [], unavailableSkus = []) {
  const rules = (unavailableRules || []).map(_compileUnavailableDomRule);
  const allEntries = [...(hardwareEntries || []), ...(cleanServicesEntries || [])];
  const existingSkuMap = _buildExistingSkuMap(allEntries);

  for (const u of unavailableSkus) {
    if (isTaaGtaCatalogOption(u.rawSku || u.sku, u.description)) continue;
    const cleanSku = cleanBaseSKU(u.sku);
    if (!cleanSku || !isValidHpeSKU(cleanSku)) continue;

    if (existingSkuMap.has(cleanSku)) {
      _enrichExistingRow(existingSkuMap.get(cleanSku).row, u);
    } else {
      const newRow = _createConditionalRow(u, cleanSku);
      _attachConditionalRowToSection(hardwareEntries, u, newRow, cleanSku, existingSkuMap);
    }
  }

  return rules;
}

module.exports = {
  applyConditionalDiscovery,
  applyUnavailableDomRulesAndSkus
};
