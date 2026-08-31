'use strict';
const test = require('node:test');
const assert = require('node:assert');

const { isValidHpeSKU, cleanBaseSKU, extractHpePartNumbers } = require('../../scripts/lib/catalog/sku');

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
