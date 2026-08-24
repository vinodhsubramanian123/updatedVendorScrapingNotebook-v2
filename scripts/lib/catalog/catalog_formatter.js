'use strict';
/**
 * scripts/lib/catalog_formatter.js — Loosely Coupled Catalog TSV & Sheet Formatter
 *
 * Extracted from build_catalog.js to ensure high maintainability, clear separation of concerns,
 * and AI-agent-friendly code modularity.
 */

const { classifyComponentRole } = require('./product_meta.js');

/**
 * Generate Main SKUs TSV content.
 * @param {Array<object>} entries 
 * @param {string} chassisRoot 
 * @param {object} profile
 * @returns {string} TSV content string
 */
function generateMainSheet(entries, chassisRoot, profile = null) {
  const rows = [[
    'Main Category', 'Sub-Category', 'Hierarchy Path', 'Component Role', 'Constraint Text',
    'Subcategory Min Qty', 'Subcategory Max Qty', 'Table Rule/Note', 'Product #', 'Option Type', 'Description', 'Current Qty',
    'Unit Price (USD)', 'Price Delta (USD)', 'Extended Price (USD)', 'Price per GB (USD)',
    'HPE Recommended', 'Start Date', 'Discontinued Date',
    'Diff Status', 'Previous List Price (USD)', 'Price Change (USD)', 'Price Change (%)', 'Price History Trail'
  ].join('\t')];

  for (const entry of entries) {
    // GAP FIX #2 & #5: Format constraint string with both min and max, including optional sentinel
    const minQty = entry.minQty || 0;
    const constraintParts = [];
    if (minQty > 0) constraintParts.push(`min ${minQty}`);
    if (entry.maxQty === -1) constraintParts.push('Unlimited');
    else if (entry.maxQty === -2) constraintParts.push('Required');
    else if (entry.maxQty === -3) constraintParts.push('Optional');
    else if (entry.maxQty > 0) constraintParts.push(`max ${entry.maxQty}`);
    const constraintStr = constraintParts.length > 0 ? constraintParts.join(', ') : (entry.constraint || '');

    const minQtyVal = minQty > 0 ? String(minQty) : '0';
    const maxQtyVal = entry.maxQty === -1 ? 'Unlimited' :
                      entry.maxQty === -2 ? 'Required' :
                      entry.maxQty === -3 ? 'Optional' :
                      entry.maxQty > 0 ? String(entry.maxQty) :
                      (entry.constraint || '');

    for (const sku of entry.skus) {
      const rawQty   = String(sku['Current Qty'] || sku.qty || '0').replace(/\n/g, '').trim();
      const cleanQty = /^\d+$/.test(rawQty) ? rawQty : '0';
      const role     = sku['Component Role'] || classifyComponentRole(entry.parentCategory, sku['Description'] || sku.description, profile);
      const priceVal = sku['Unit Price (USD)'] || sku['Price (USD)'] || sku['List Price (USD)'] || sku['List Price'] || sku['Price'] || sku.listPriceFormatted || (sku.listPrice !== undefined && sku.listPrice !== null ? String(sku.listPrice) : '');
      // Rule #20: HPE OCA > Chassis [BaseSKU] > Category > Subcategory
      const hierarchyPath = `HPE OCA > ${chassisRoot} > ${entry.parentCategory} > ${entry.subCategory}`;

      const isRecommended = (entry.parentCategory === 'Chassis' || (sku['Option Type'] || sku.optionType) === 'CTO') ? 'Yes' : 'No';

      rows.push([
        entry.parentCategory, entry.subCategory, hierarchyPath, role, constraintStr, minQtyVal, maxQtyVal,
        (entry.rules || []).join(' | '), sku['Product #'] || sku.sku || '', sku['Option Type'] || sku.optionType || 'Standard', sku['Description'] || sku.description || '', cleanQty,
        priceVal, sku['Price Delta (USD)'] || '', sku['Extended Price (USD)'] || '',
        sku['Price per GB (USD)'] || '', sku['HPE Recommended'] || isRecommended, sku['Start Date'] || sku['Start'] || '', sku['Discontinued Date'] || sku['Discontinued'] || '',
        sku['Diff Status'] || 'UNCHANGED', sku['Previous List Price (USD)'] || 'N/A', sku['Price Change (USD)'] || '$0.00', sku['Price Change (%)'] || '0.00%', sku['Price History Trail'] || ''
      ].join('\t'));
    }
  }
  return rows.join('\n');
}

/**
 * Generate Rules & Constraints TSV content.
 * Supports combined entries, learned feedback rules, and deduplication of redundant messages.
 * @param {Array<object>} entries 
 * @param {Array<object>} subcatList 
 * @param {string} fullText 
 * @param {Array<object>} extraRules
 * @returns {string} TSV content string
 */
function generateRulesSheet(entries, subcatList = [], fullText = '', extraRules = []) {
  const rows = [['Main Category', 'Sub-Category', 'Constraint', 'Rule Type', 'Rule Text'].join('\t')];
  const seenRuleTriples = new Set();

  const addRuleRow = (parentCat, subCat, constraint, ruleType, ruleText) => {
    if (!ruleText || typeof ruleText !== 'string' || ruleText.trim().length < 5) return;
    const cleanText = ruleText.trim();
    const key = `${parentCat}|${subCat}|${cleanText}`;
    if (seenRuleTriples.has(key)) return;
    seenRuleTriples.add(key);
    rows.push([parentCat, subCat, constraint || '', ruleType, cleanText].join('\t'));
  };

  // 1. Subcategory constraints (both min and max)
  for (const sc of subcatList) {
    const parts = [];
    if (sc.minQty > 0) parts.push(`min ${sc.minQty}`);
    if (sc.maxQty === -1) parts.push('Unlimited');
    else if (sc.maxQty === -2) parts.push('Required');
    else if (sc.maxQty === -3) parts.push('Optional');
    else if (sc.maxQty > 0) parts.push(`max ${sc.maxQty}`);
    const constraintStr = parts.length > 0 ? parts.join(', ') : sc.constraint;
    if (constraintStr) {
      const ruleText = sc.minQty > 0 && sc.maxQty > 0
        ? `Quantity: min ${sc.minQty}, max ${sc.maxQty}`
        : `Quantity: ${constraintStr}`;
      addRuleRow(sc.parentCategory, sc.name, constraintStr, 'Quantity Constraint', ruleText);
    }
  }

  // 2. Embedded configuration rules from entries (Hardware + Services)
  for (const entry of entries) {
    for (const rule of (entry.rules || [])) {
      addRuleRow(entry.parentCategory, entry.subCategory, entry.constraint || '', 'Configuration Rule', rule);
    }
  }

  // 3. Extra / Learned Feedback Rules (from Catalog_Rules.json)
  for (const r of extraRules) {
    const parent = r.parentCategory || 'Learned Feedback Rules';
    const sub = r.subCategory || '(Feedback)';
    const text = r.rule || r.description || '';
    addRuleRow(parent, sub, r.constraint || '', 'Learned Feedback Rule', text);
  }

  // 4. Text-extracted rules from QuickSpecs / DOM
  // GAP FIX #7: Expanded pattern set to capture additional OCA constraint types
  const notePatterns = [
    { regex: /For [Mm]ore detail[s]? on .+?, please refer to: (.+)/g, type: 'Reference Link' },
    { regex: /Minimum \d+ of .+/g, type: 'Minimum Requirement' },
    { regex: /It is recommended to select .+/g, type: 'Recommendation' },
    { regex: /In order to select .+/g, type: 'Selection Guide' },
    { regex: /Mixing of .+ is not allowed/g, type: 'Mixing Rule' },
    { regex: /If .+ is selected.+/g, type: 'Conditional Rule' },
    // GAP FIX #7: New patterns for chassis-gated, incompatibility, dependency, and co-selection rules
    { regex: /Supported with .+ (?:CTO Server |Server |chassis )?only/gi, type: 'Chassis Gate Rule' },
    { regex: /Not compatible with .+/gi, type: 'Incompatibility Rule' },
    { regex: /Cannot be (?:used|selected|mixed) with .+/gi, type: 'Incompatibility Rule' },
    { regex: /Requires at least .+/gi, type: 'Minimum Dependency' },
    { regex: /Maximum of \d+ per .+/gi, type: 'Per-Slot Limit' },
    { regex: /Only available when .+/gi, type: 'Conditional Availability' },
    { regex: /When selecting .+ you must also select .+/gi, type: 'Co-Dependency Rule' },
  ];

  for (const pat of notePatterns) {
    pat.regex.lastIndex = 0;
    let m;
    while ((m = pat.regex.exec(fullText)) !== null) {
      let nearestSubcat = 'General', nearestParent = 'General';
      for (const sc of subcatList) {
        if (sc.textIndex < m.index) {
          nearestSubcat = sc.name;
          nearestParent = sc.parentCategory;
        }
      }
      const ruleText = m[0].substring(0, 300).trim();
      if (ruleText.length > 10) {
        addRuleRow(nearestParent, nearestSubcat, '', pat.type, ruleText);
      }
    }
  }

  return rows.join('\n');
}

/**
 * Generate Category Summary TSV content across combined entries.
 * @param {Array<object>} entries 
 * @param {Array<object>} subcatList 
 * @returns {string} TSV content string
 */
function generateSummarySheet(entries, subcatList = []) {
  const rows = [['Main Category', 'Sub-Category', 'Constraint', 'Min Qty', 'Max Qty', 'Total SKUs', 'Has Rules', 'Rule Count'].join('\t')];
  const seen = new Set();

  const allSubcats = [
    ...subcatList.map(sc => ({ parentCategory: sc.parentCategory, name: sc.name, constraint: sc.constraint, minQty: sc.minQty || 0, maxQty: sc.maxQty })),
    ...entries.map(e => ({ parentCategory: e.parentCategory, name: e.subCategory, constraint: e.constraint || '', minQty: e.minQty || 0, maxQty: e.maxQty || 0 }))
  ];

  for (const sc of allSubcats) {
    const key = sc.parentCategory + '|' + sc.name;
    if (seen.has(key)) continue;
    seen.add(key);

    let skuCount = 0, ruleCount = 0;
    for (const entry of entries) {
      if (entry.subCategory === sc.name && entry.parentCategory === sc.parentCategory) {
        skuCount += (entry.skuCount || (entry.skus ? entry.skus.length : 0));
        ruleCount += (entry.rules || []).length;
      }
    }
    const minQtyStr = sc.minQty > 0 ? String(sc.minQty) : '0';
    const maxQtyStr = sc.maxQty === -1 ? 'Unlimited' :
                      sc.maxQty === -2 ? 'Required' :
                      sc.maxQty === -3 ? 'Optional' :
                      sc.maxQty > 0 ? String(sc.maxQty) : (sc.constraint || 'N/A');
    rows.push([sc.parentCategory, sc.name, sc.constraint || '', minQtyStr, maxQtyStr, skuCount, ruleCount > 0 ? 'Yes' : 'No', ruleCount].join('\t'));
  }
  return rows.join('\n');
}

module.exports = {
  generateMainSheet,
  generateRulesSheet,
  generateSummarySheet
};
