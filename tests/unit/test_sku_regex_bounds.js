'use strict';
const test = require('node:test');
const assert = require('node:assert');

const { isValidHpeSKU, cleanBaseSKU, classifySkuValidation } = require('../../scripts/lib/catalog/sku');

test('SKU Bounds — Valid HPE SKU Formats', () => {
  const validSkus = [
    'P73282-B21',
    'P52534-B21',
    'P64707-B21',
    'P48803-B21',
    'P38997-B21',
    'P48820-B21',
    '872479-B21',
    'P52341-B21'
  ];

  for (const sku of validSkus) {
    assert.strictEqual(isValidHpeSKU(sku), true, `SKU ${sku} should be valid`);
  }
});

test('SKU Bounds — Option Suffix Parsing (#0D1, -B21, -F21)', () => {
  assert.strictEqual(isValidHpeSKU('P73282-B21#0D1'), true, 'Factory integrated option should pass');
  assert.strictEqual(isValidHpeSKU('P73282-F21'), true, 'F21 suffix should pass');
  assert.strictEqual(isValidHpeSKU('P73282-K21'), true, 'K21 suffix should pass');
});

test('SKU Bounds — Obsolete & Direct Ship Badge Sanitization (INV-21)', () => {
  // Test raw DOM strings containing status badges attached to SKU
  const dirtyInputs = [
    { input: 'OB P73282-B21', expected: 'P73282-B21' },
    { input: 'DS P52534-B21', expected: 'P52534-B21' },
    { input: '90 P64707-B21', expected: 'P64707-B21' },
    { input: 'EOL P48803-B21', expected: 'P48803-B21' },
    { input: '  P38997-B21  ', expected: 'P38997-B21' }
  ];

  for (const item of dirtyInputs) {
    const clean = cleanBaseSKU(item.input);
    assert.strictEqual(clean, item.expected, `Sanitized ${item.input} should match ${item.expected}`);
    assert.strictEqual(isValidHpeSKU(clean), true, `Clean SKU ${clean} must pass validation`);
  }
});

test('SKU Bounds — Invalid Non-SKU Rejection', () => {
  const invalid = [
    'NOT_A_SKU',
    '12345',
    '<div>P73282-B21</div>',
    'HPE ProLiant DL380',
    '',
    null,
    undefined
  ];

  for (const bad of invalid) {
    assert.strictEqual(isValidHpeSKU(bad), false, `Invalid token ${bad} must be rejected`);
  }
});

test('SKU Bounds — 3-Tier Classification (classifySkuValidation)', () => {
  // Tier 0: Syntax only, no catalog supplied (INV-0 / INV-105)
  const noCat = classifySkuValidation('P73282-B21');
  assert.strictEqual(noCat.isSyntacticallyValid, true);
  assert.strictEqual(noCat.isCatalogVerified, false);
  assert.strictEqual(noCat.lifecycleStatus, 'CATALOG_NOT_SUPPLIED');

  // Invalid syntax
  const invalidSyntax = classifySkuValidation('INVALID-SKU-999');
  assert.strictEqual(invalidSyntax.isSyntacticallyValid, false);
  assert.strictEqual(invalidSyntax.isCatalogVerified, false);
  assert.strictEqual(invalidSyntax.lifecycleStatus, 'INVALID_SYNTAX');

  // Tier 2: Scoped Catalog Presence & Lifecycle
  const mockCatalog = {
    entries: [
      {
        parentCategory: 'Processors',
        subCategory: 'Intel Xeon 6th Gen',
        skus: [
          { 'Product #': 'P73282-B21', Description: 'Intel Xeon 6740E Processor', 'Lifecycle Status': 'Active' },
          { 'Product #': 'P52534-B21', Description: 'Legacy Processor Option', 'Lifecycle Status': 'OB' }
        ]
      }
    ]
  };

  const presentActive = classifySkuValidation('P73282-B21', mockCatalog);
  assert.strictEqual(presentActive.isSyntacticallyValid, true);
  assert.strictEqual(presentActive.isCatalogVerified, true);
  assert.strictEqual(presentActive.lifecycleStatus, 'Active');
  assert.strictEqual(presentActive.category, 'Processors');

  const presentOb = classifySkuValidation('P52534-B21', mockCatalog);
  assert.strictEqual(presentOb.isSyntacticallyValid, true);
  assert.strictEqual(presentOb.isCatalogVerified, true);
  assert.strictEqual(presentOb.lifecycleStatus, 'OB');

  const absentFromCatalog = classifySkuValidation('P99999-B21', mockCatalog);
  assert.strictEqual(absentFromCatalog.isSyntacticallyValid, true);
  assert.strictEqual(absentFromCatalog.isCatalogVerified, false);
  assert.strictEqual(absentFromCatalog.lifecycleStatus, 'NOT_IN_CATALOG');

  // Service SKU classification
  const service = classifySkuValidation('HU4B2A3');
  assert.strictEqual(service.isSyntacticallyValid, true);
  assert.strictEqual(service.isService, true);

  // Software E-LTU classification
  const software = classifySkuValidation('R7A11AAE');
  assert.strictEqual(software.isSyntacticallyValid, true);
  assert.strictEqual(software.optionType, 'Service');
});

