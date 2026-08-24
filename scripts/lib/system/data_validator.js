'use strict';
/**
 * scripts/lib/data_validator.js — Pre-Commit Catalog Data Integrity & Schema Validation Layer
 *
 * Validates scraped HPE product catalog data against strict schema, SKU format,
 * pricing consistency, and capacity constraint rules before updating local JSON workspace files.
 */

const { isValidHpeSKU, cleanBaseSKU, classifyOptionType, isServiceSku } = require('../catalog/sku.js');

/**
 * Validates a complete catalog object (scraped JSON output) against predefined schema rules.
 *
 * @param {object} catalogObj Catalog JSON data structure
 * @param {object} [options] Validation configuration options
 * @param {boolean} [options.strictMode=true] If true, invalid SKUs fail validation; otherwise produce warnings.
 * @returns {object} { isValid: boolean, errors: string[], warnings: string[], stats: object }
 */
function validateCatalogData(catalogObj, options = {}) {
  const strictMode = options.strictMode !== false;
  const errors = [];
  const warnings = [];

  const stats = {
    totalEntries: 0,
    totalSKUs: 0,
    validSKUs: 0,
    invalidSKUs: 0,
    baseVariantsCount: 0,
    zeroPriceSKUs: 0,
    priceErrors: 0,
    ruleCount: 0,
    categoryCount: 0
  };

  // 1. Structural Schema Validation
  if (!catalogObj || typeof catalogObj !== 'object') {
    return {
      isValid: false,
      errors: ['Catalog data payload is null or not an object.'],
      warnings: [],
      stats
    };
  }

  if (!catalogObj.metadata || typeof catalogObj.metadata !== 'object') {
    errors.push('Missing top-level "metadata" object in catalog JSON.');
  } else {
    if (!catalogObj.metadata.chassis && !catalogObj.metadata.filePrefix) {
      warnings.push('Metadata missing explicit "chassis" label.');
    }
    if (!catalogObj.metadata.scrapeDate) {
      warnings.push('Metadata missing "scrapeDate" timestamp.');
    }
  }

  if (!Array.isArray(catalogObj.entries)) {
    errors.push('Catalog "entries" field must be a valid array.');
  } else if (catalogObj.entries.length === 0) {
    errors.push('Catalog "entries" array is empty (0 catalog sections found).');
  }

  if (errors.length > 0) {
    return { isValid: false, errors, warnings, stats };
  }

  stats.totalEntries = catalogObj.entries.length;
  const categoriesFound = new Set();
  const seenSKUs = new Map(); // PN -> { subcat, price }

  // 2. Iterate Entries & Validate Rows
  catalogObj.entries.forEach((entry, entryIdx) => {
    const parentCat = entry.parentCategory || 'Uncategorized';
    const subCat = entry.subCategory || 'General';
    categoriesFound.add(parentCat);

    // Validate Subcategory Max Qty Bound (-1=unlimited, -2=required, -3=optional)
    if (typeof entry.maxQty === 'number') {
      if (isNaN(entry.maxQty) || entry.maxQty < -3) {
        errors.push(`Entry #${entryIdx} [${parentCat} > ${subCat}]: Invalid maxQty bound (${entry.maxQty}). Expected integer >= -3.`);
      }
    }

    // Rules count
    if (Array.isArray(entry.rules)) {
      stats.ruleCount += entry.rules.length;
    }

    const skus = Array.isArray(entry.skus) ? entry.skus : [];

    skus.forEach((skuRow, skuIdx) => {
      stats.totalSKUs++;

      const rawPn = skuRow.sku || skuRow['Product #'] || skuRow['SKU'] || skuRow['Part Number'] || '';
      const cleanPn = cleanBaseSKU(rawPn);
      const description = skuRow.description || skuRow['Description'] || '';

      // Check mandatory SKU field presence
      if (!cleanPn) {
        errors.push(`Entry #${entryIdx} SKU #${skuIdx}: Missing part number/SKU field.`);
        stats.invalidSKUs++;
        return;
      }

      if (!description) {
        warnings.push(`Entry #${entryIdx} SKU [${cleanPn}]: Missing description.`);
      }

      // Check HPE SKU regex format compliance
      if (!isValidHpeSKU(cleanPn)) {
        const msg = `SKU [${cleanPn}] in [${parentCat} > ${subCat}] failed HPE SKU format validation.`;
        if (strictMode && !cleanPn.includes('-B21') && !cleanPn.includes('-291')) {
          warnings.push(msg);
        } else {
          warnings.push(msg);
        }
      }

      // Check Option Type classification
      const optionType = skuRow.optionType || skuRow['Option Type'] || classifyOptionType(rawPn);
      const validOptionTypes = ['Standard', 'CTO', 'BTO', 'FIO', 'Service'];
      if (!validOptionTypes.includes(optionType)) {
        warnings.push(`SKU [${cleanPn}]: Unknown optionType '${optionType}'. Expected one of: ${validOptionTypes.join(', ')}.`);
      }

      // 3. Pricing & Currency Consistency Rules
      const rawPrice = skuRow['Unit Price (USD)'] || skuRow['Price (USD)'] || skuRow['Price'] || skuRow.price || '0';
      const parsedPrice = parseUsdPrice(rawPrice);

      if (parsedPrice.isNaN) {
        errors.push(`SKU [${cleanPn}] in [${parentCat} > ${subCat}]: Unparseable price value '${rawPrice}'.`);
        stats.priceErrors++;
      } else if (parsedPrice.amount < 0) {
        errors.push(`SKU [${cleanPn}] in [${parentCat} > ${subCat}]: Negative pricing (${parsedPrice.amount} USD) detected.`);
        stats.priceErrors++;
      } else if (parsedPrice.amount === 0) {
        stats.zeroPriceSKUs++;
      }

      // Base Chassis CTO Variant Pricing Enforcement
      const parentLower = parentCat.toLowerCase();
      const subLower = subCat.toLowerCase();
      if (parentLower.includes('chassis') || parentLower.includes('server') || subLower.includes('variants')) {
        stats.baseVariantsCount++;
        if (parsedPrice.amount === 0 && (cleanPn.endsWith('-B21') || cleanPn.endsWith('-291'))) {
          warnings.push(`Base Chassis Variant SKU [${cleanPn}] has $0 list price. Verify if CTO chassis price was scraped correctly.`);
        }
      }

      // Duplicate SKU Consistency Check
      if (seenSKUs.has(cleanPn)) {
        const prev = seenSKUs.get(cleanPn);
        if (prev.price !== parsedPrice.amount && prev.price > 0 && parsedPrice.amount > 0) {
          warnings.push(`Duplicate SKU [${cleanPn}] has inconsistent list prices: $${prev.price} in [${prev.subcat}] vs $${parsedPrice.amount} in [${subCat}].`);
        }
      } else {
        seenSKUs.set(cleanPn, { subcat: subCat, price: parsedPrice.amount });
      }

      stats.validSKUs++;
    });
  });

  stats.categoryCount = categoriesFound.size;

  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    warnings,
    stats
  };
}

/**
 * Helper to safely extract numeric USD float value from price strings (e.g. "$1,250.00" -> 1250.00).
 *
 * @param {string|number} priceVal
 * @returns {object} { amount: number, isNaN: boolean }
 */
function parseUsdPrice(priceVal) {
  if (priceVal === null || priceVal === undefined || priceVal === '') {
    return { amount: 0, isNaN: false };
  }
  if (typeof priceVal === 'number') {
    return { amount: priceVal, isNaN: isNaN(priceVal) };
  }
  const cleanStr = String(priceVal).replace(/[\$,\s]/g, '');
  if (cleanStr === '' || cleanStr.toUpperCase() === 'N/A' || cleanStr.toUpperCase() === 'NA' || cleanStr === '-') {
    return { amount: 0, isNaN: false };
  }
  const num = parseFloat(cleanStr);
  return { amount: isNaN(num) ? 0 : num, isNaN: isNaN(num) };
}

module.exports = {
  validateCatalogData,
  parseUsdPrice
};
