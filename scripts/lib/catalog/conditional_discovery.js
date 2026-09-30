'use strict';
const { cleanBaseSKU } = require('./sku.js');

function applyConditionalDiscovery(entries, observations = []) {
  const rules = [];
  for (const observation of observations) {
    const sku = cleanBaseSKU(observation.sku);
    if (!sku) continue;
    const ambient = observation.conditionType === 'AMBIENT_GATE' && Number.isFinite(observation.thresholdDegC);
    const rule = {
      level: 'CHASSIS',
      ruleType: 'CONDITIONAL_VISIBILITY',
      affectedSkus: [sku],
      conditionType: ambient ? 'AMBIENT_GATE' : 'UNKNOWN_PORTAL_CONDITION',
      conditionKey: ambient ? 'ambientTempC' : 'portalSelection',
      conditionOperator: ambient ? observation.operator : 'unknown',
      thresholdValue: ambient ? observation.thresholdDegC : null,
      portalVerificationRequired: true,
      rule: ambient
        ? `${sku} conditional visibility: ambient temperature ${{ lte: '<=', gte: '>=', eq: '==' }[observation.operator] || 'unknown'} ${observation.thresholdDegC} C; PORTAL_CONDITIONAL`
        : `${sku} conditional visibility: unresolved portal selector; PORTAL_CONDITIONAL`
    };
    for (const entry of entries) {
      const matched = (entry.skus || []).filter(row => cleanBaseSKU(row.sku || row['Product #']) === sku);
      if (!matched.length) continue;
      rule.parentCategory = entry.parentCategory;
      rule.subCategory = entry.subCategory;
      entry.rules = [...new Set([...(entry.rules || []), rule.rule])];
      for (const row of matched) {
        Object.assign(row, {
          visibilityState: 'PORTAL_CONDITIONAL',
          conditionType: rule.conditionType,
          thresholdValue: rule.thresholdValue,
          conditionOperator: rule.conditionOperator,
          conditionKey: rule.conditionKey
        });
      }
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
function applyUnavailableDomRulesAndSkus(hardwareEntries, cleanServicesEntries, unavailableRules = [], unavailableSkus = []) {
  const rules = [];

  // 1. Process explicit rules from unavailable tables
  for (const r of unavailableRules) {
    const isAmbient = r.ruleType === 'AMBIENT_GATE';
    const tempMatch = (r.reason || '').match(/(\d+)C/i);
    const thresholdDegC = isAmbient && tempMatch ? parseFloat(tempMatch[1]) : null;

    const ruleObj = {
      level: 'CHASSIS',
      ruleType: r.ruleType || 'MUTUAL_EXCLUSION',
      parentCategory: r.section || 'General Options',
      subCategory: 'Configuration Rules',
      constraint: r.reason || '',
      maxQty: '',
      rule: `[${r.ruleType || 'MUTUAL_EXCLUSION'}] ${r.reason}`,
      conditionKey: isAmbient ? 'ambientTempC' :
                    r.ruleType === 'CHASSIS_GATE' ? 'chassisModel' :
                    r.ruleType === 'MEMORY_MIXING' ? 'memoryType' :
                    r.ruleType === 'SLOT_COLLISION' ? 'slotConfiguration' : 'portalSelection',
      conditionOperator: isAmbient ? '<=' : 'restricted_with',
      thresholdValue: thresholdDegC,
      affectedSkus: (r.affectedSkus || []).map(cleanBaseSKU).filter(Boolean),
      ineligibilityReason: r.reason,
      source: 'HPE_OCA_DOM_UNAVAILABLE_TABLE',
      portalVerificationRequired: true
    };
    rules.push(ruleObj);
  }

  // 2. Process unavailable / conditional SKUs
  const allEntries = [...(hardwareEntries || []), ...(cleanServicesEntries || [])];
  const existingSkuMap = new Map();

  for (const entry of allEntries) {
    for (const row of (entry.skus || [])) {
      const pn = cleanBaseSKU(row['Product #'] || row.sku);
      if (pn && !existingSkuMap.has(pn)) {
        existingSkuMap.set(pn, { entry, row });
      }
    }
  }

  for (const u of unavailableSkus) {
    const cleanSku = cleanBaseSKU(u.sku);
    if (!cleanSku) continue;

    if (existingSkuMap.has(cleanSku)) {
      // Enrich existing row
      const { row } = existingSkuMap.get(cleanSku);
      row.visibilityState = 'PORTAL_CONDITIONAL';
      row.isSelectable = false;
      row.status = 'PORTAL_CONDITIONAL';
      row.ineligibilityReason = u.ineligibilityReason || row.ineligibilityReason;
      row.ruleType = u.ruleType || row.ruleType;
      if (u.supplyBadge) row.supplyBadge = u.supplyBadge;
      if (u.supplyTitle) row.supplyTitle = u.supplyTitle;
    } else {
      // Create new conditional row
      const isDisc = u.discontinuedDate && u.discontinuedDate !== 'Active';
      const newRow = {
        'Product #': u.sku,
        sku: u.sku,
        'Option Type': 'BTO/CTO',
        'Component Role': u.section || 'General Options',
        Description: u.description || 'HPE Hardware Option',
        'Current Qty': '0',
        'Unit Price (USD)': u.listPrice > 0 ? u.listPrice.toFixed(2) : '0.00',
        listPrice: u.listPrice || 0,
        'CLIC Status': 'Conditional',
        'Lifecycle Status': isDisc ? 'Discontinued' : 'Active',
        lifecycleStatus: isDisc ? 'Discontinued' : 'Active',
        'HPE Recommended': 'No',
        Availability: 'Conditionally available in OCA based on configuration gates',
        'Start Date': u.startDate || '',
        'Discontinued Date': u.discontinuedDate || '',
        visibilityState: 'PORTAL_CONDITIONAL',
        isSelectable: false,
        status: 'PORTAL_CONDITIONAL',
        ineligibilityReason: u.ineligibilityReason,
        ruleType: u.ruleType,
        supplyBadge: u.supplyBadge || '',
        supplyTitle: u.supplyTitle || '',
        provenance: 'HPE OCA Unavailable Table DOM Extraction'
      };

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
  }

  return rules;
}

module.exports = {
  applyConditionalDiscovery,
  applyUnavailableDomRulesAndSkus
};
