'use strict';
const test = require('node:test');
const assert = require('node:assert');

const { optimizeForBudget, getSkuListPrice } = require('../../scripts/lib/boq/budget_optimizer');

test('Budget Optimizer — Empty & Single Item Edge Cases', () => {
  const mockCatalog = {
    entries: [
      {
        skus: [
          { 'Product #': 'P73282-B21', 'Unit Price (USD)': '$5,584' }
        ]
      }
    ]
  };

  const emptyRes = optimizeForBudget([], {}, 10000, mockCatalog);
  assert.ok(emptyRes, 'Empty input should return structured object');
  assert.strictEqual(emptyRes.mandatoryBomCostUsd, 0);
  assert.strictEqual(emptyRes.isBudgetExceeded, false);

  const singleItem = [{ sku: 'P73282-B21', quantity: 1, category: 'Base Server' }];
  const singleRes = optimizeForBudget(singleItem, {}, 5000, mockCatalog);
  assert.ok(singleRes, 'Single item input should succeed');
  assert.strictEqual(singleRes.isBudgetExceeded, true, 'Budget of 5000 should be exceeded by 5584 BOM');
  assert.strictEqual(singleRes.budgetOverrunUsd, 584);
});

test('Budget Optimizer — List Price Resolution', () => {
  const mockCatalog = {
    entries: [
      {
        skus: [
          { 'Product #': 'P73282-B21', 'Unit Price (USD)': '$5,584' },
          { 'Product #': 'P64707-B21', 'Price': '245.00' }
        ]
      }
    ]
  };

  const p1 = getSkuListPrice('P73282-B21', mockCatalog);
  assert.strictEqual(p1, 5584);

  const p2 = getSkuListPrice('P64707-B21', mockCatalog);
  assert.strictEqual(p2, 245);

  const pUnknown = getSkuListPrice('UNKNOWN-SKU-999', mockCatalog);
  assert.strictEqual(pUnknown, 0.00);
});
