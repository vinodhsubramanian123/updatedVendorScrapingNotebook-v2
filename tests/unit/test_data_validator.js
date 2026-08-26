'use strict';
/**
 * tests/unit/test_data_validator.js
 *
 * Tests for scripts/lib/system/data_validator.js:
 * - parseUsdPrice helper
 * - validateCatalogData schema, bounds, formatting, and pricing rules
 */

const test = require('node:test');
const assert = require('node:assert');
const { validateCatalogData, parseUsdPrice } = require('../../scripts/lib/system/data_validator.js');

test('parseUsdPrice handles valid and edge-case currency inputs', () => {
  assert.strictEqual(parseUsdPrice(null).amount, 0);
  assert.strictEqual(parseUsdPrice(undefined).amount, 0);
  assert.strictEqual(parseUsdPrice('').amount, 0);
  assert.strictEqual(parseUsdPrice('N/A').amount, 0);
  assert.strictEqual(parseUsdPrice('NA').amount, 0);
  assert.strictEqual(parseUsdPrice('-').amount, 0);

  // Numeric inputs
  assert.strictEqual(parseUsdPrice(1250.5).amount, 1250.5);
  assert.strictEqual(parseUsdPrice(0).amount, 0);

  // Formatted string prices
  assert.strictEqual(parseUsdPrice('$1,250.00').amount, 1250.00);
  assert.strictEqual(parseUsdPrice('  $ 4,500.99 ').amount, 4500.99);
  assert.strictEqual(parseUsdPrice('399').amount, 399);

  // Invalid strings
  const invalid = parseUsdPrice('abc');
  assert.strictEqual(invalid.isNaN, true);
  assert.strictEqual(invalid.amount, 0);
});

test('validateCatalogData validates null or malformed catalog objects', () => {
  const nullResult = validateCatalogData(null);
  assert.strictEqual(nullResult.isValid, false);
  assert.ok(nullResult.errors.some(e => e.includes('null or not an object')));

  const missingMeta = validateCatalogData({ entries: [] });
  assert.strictEqual(missingMeta.isValid, false);
  assert.ok(missingMeta.errors.some(e => e.includes('Missing top-level "metadata"')));

  const emptyEntries = validateCatalogData({
    metadata: { chassis: 'DL380_Gen12_SFF', scrapeDate: '2026-08-22' },
    entries: []
  });
  assert.strictEqual(emptyEntries.isValid, false);
  assert.ok(emptyEntries.errors.some(e => e.includes('empty')));
});

test('validateCatalogData successfully certifies valid catalog JSON', () => {
  const validCatalog = {
    metadata: {
      chassis: 'DL380_Gen12_SFF',
      scrapeDate: '2026-08-22'
    },
    entries: [
      {
        parentCategory: 'Processors',
        subCategory: 'Intel Xeon Scalable Processors',
        maxQty: 2,
        rules: ['Requires matching heatsinks'],
        skus: [
          {
            sku: 'P49610-B21',
            description: 'Intel Xeon-Gold 6430 2.1GHz 32-core 270W Processor',
            'Option Type': 'Standard',
            'Unit Price (USD)': '$2,450.00'
          }
        ]
      },
      {
        parentCategory: 'Base Chassis',
        subCategory: 'Variants',
        maxQty: 1,
        skus: [
          {
            sku: 'P52559-B21',
            description: 'HPE ProLiant DL380 Gen12 8SFF NC CTO Server',
            'Option Type': 'CTO',
            'Unit Price (USD)': '$1,800.00'
          }
        ]
      }
    ]
  };

  const result = validateCatalogData(validCatalog);
  assert.strictEqual(result.isValid, true);
  assert.strictEqual(result.errors.length, 0);
  assert.strictEqual(result.stats.totalSKUs, 2);
  assert.strictEqual(result.stats.validSKUs, 2);
  assert.strictEqual(result.stats.categoryCount, 2);
  assert.strictEqual(result.stats.ruleCount, 1);
});

test('validateCatalogData detects bounds, pricing errors, and zero-price base variants', () => {
  const invalidCatalog = {
    metadata: {
      chassis: 'DL380_Gen12_SFF',
      scrapeDate: '2026-08-22'
    },
    entries: [
      {
        parentCategory: 'Memory',
        subCategory: 'DDR5 Registered DIMMs',
        maxQty: -5, // Invalid bound (< -3)
        skus: [
          {
            sku: 'P43322-B21',
            description: 'HPE 32GB 2Rx8 DDR5-4800 Memory',
            'Option Type': 'InvalidType',
            'Unit Price (USD)': '$100.00'
          },
          {
            sku: 'P43322-B21', // Duplicate SKU with price mismatch ($100 vs $200)
            description: 'HPE 32GB 2Rx8 DDR5-4800 Memory',
            'Option Type': 'Standard',
            'Unit Price (USD)': '$200.00'
          },
          {
            sku: 'P88888-B21',
            description: 'Negative price SKU',
            'Option Type': 'Standard',
            'Unit Price (USD)': '-$50.00' // Negative price
          },
          {
            sku: 'P49610-B21',
            description: 'Processor with unparseable price',
            'Unit Price (USD)': 'INVALID_PRICE'
          }
        ]
      },
      {
        parentCategory: 'Base Chassis',
        subCategory: 'Variants',
        maxQty: 1,
        skus: [
          {
            sku: 'P52559-B21',
            description: 'HPE ProLiant DL380 Gen12 8SFF NC CTO Server',
            'Option Type': 'CTO',
            'Unit Price (USD)': '$0.00' // Base chassis with $0 price
          }
        ]
      }
    ]
  };

  const result = validateCatalogData(invalidCatalog);
  assert.strictEqual(result.isValid, false);
  assert.ok(result.errors.some(e => e.includes('Invalid maxQty bound')));
  assert.ok(result.errors.some(e => e.includes('Negative pricing')));
  assert.ok(result.errors.some(e => e.includes('Unparseable price value')));
  assert.ok(result.warnings.some(w => w.includes('Base Chassis Variant SKU [P52559-B21] has $0 list price')));
  assert.ok(result.warnings.some(w => w.includes('inconsistent list prices')));
  assert.ok(result.warnings.some(w => w.includes("Unknown optionType 'InvalidType'")));
});
