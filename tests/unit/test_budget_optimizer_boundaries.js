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
  assert.strictEqual(emptyRes.isBudgetExceeded, null);
  assert.strictEqual(emptyRes.budgetAssessmentComplete, false);

  const singleItem = [{ sku: 'P73282-B21', quantity: 1, category: 'Base Server' }];
  const singleRes = optimizeForBudget(singleItem, {}, 5000, mockCatalog);
  assert.ok(singleRes, 'Single item input should succeed');
  assert.strictEqual(singleRes.isBudgetExceeded, true, 'Budget of 5000 should be exceeded by 5584 BOM');
  assert.strictEqual(singleRes.budgetOverrunUsd, 584);
});

test('Budget optimizer blocks upgrades before validation and with incomplete prices', () => {
  const priced = [{ sku: 'BASE', quantity: 1, unitPriceUsd: 100 }];
  const unvalidated = optimizeForBudget(priced, {}, 100000);
  assert.deepStrictEqual(unvalidated.recommendedUpgrades, []);
  assert.ok(!unvalidated.goldenRuleSummary.includes('GOLDEN RULE COMPLIANT'));
  const incomplete = optimizeForBudget([{ sku: 'UNKNOWN', quantity: 1 }],
    { isMathClean: true, isGraphClean: true }, 100000);
  assert.strictEqual(incomplete.budgetAssessmentComplete, false);
  assert.strictEqual(incomplete.isBudgetExceeded, null);
  assert.strictEqual(incomplete.remainingBudgetUsd, null);
  assert.deepStrictEqual(incomplete.recommendedUpgrades, []);
});

test('Budget optimizer prices order upgrades against actual surplus', () => {
  const result = optimizeForBudget([{ sku: 'BASE', quantity: 1, unitPriceUsd: 100 }],
    { isMathClean: true, isGraphClean: true, configurationContext: { multiplier: 3 } }, 2000);
  // Networking template threshold is $1500, but its actual order cost exceeds $1700 surplus.
  assert.deepStrictEqual(result.recommendedUpgrades, []);
});

test('Budget optimizer rejects negative and malformed catalog prices', () => {
  for (const value of ['-$100', '1,2', 'USD -25', '100 dollars extra']) {
    assert.strictEqual(getSkuListPrice('BASE', { entries: [{ skus: [{ 'Product #': 'BASE', Price: value }] }] }), 0);
  }
  const items = [{ sku: 'BASE', quantity: 1, unitPriceUsd: 0 }];
  const result = optimizeForBudget(items, {}, 1000);
  assert.strictEqual(items[0].quotedUnitPriceUsd, null);
  assert.strictEqual(result.pricingComplete, false);
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

test('Budget Optimizer — Quoted vs Catalog List Provenance (INV-158)', () => {
  const mockCatalog = {
    entries: [
      {
        skus: [
          { 'Product #': 'P73282-B21', 'Unit Price (USD)': '$5,584' },
          { 'Product #': 'P64707-B21', 'Unit Price (USD)': '$500' }
        ]
      }
    ]
  };

  // Case 1: Customer quoted price must NOT be overwritten by catalog list price
  const quotedItem = [{ sku: 'P73282-B21', quantity: 1, unitPriceUsd: 4500, category: 'Base Server' }];
  const resQuoted = optimizeForBudget(quotedItem, {}, 10000, mockCatalog);
  assert.strictEqual(quotedItem[0].unitPriceUsd, 4500, 'Customer quoted price must be preserved as unitPriceUsd');
  assert.strictEqual(quotedItem[0].quotedUnitPriceUsd, 4500, 'quotedUnitPriceUsd must match customer input');
  assert.strictEqual(quotedItem[0].catalogListPriceUsd, 5584, 'catalogListPriceUsd must reflect catalog list price');
  assert.strictEqual(quotedItem[0].priceSource, 'CUSTOMER_QUOTE');
  assert.strictEqual(resQuoted.pricingBasis, 'CUSTOMER_QUOTE');
  assert.strictEqual(resQuoted.pricingComplete, true);
  assert.strictEqual(resQuoted.quotedBomCostUsd, 4500);

  // Case 2: Unquoted item must preserve unitPriceUsd as null
  const unquotedItem = [{ sku: 'P73282-B21', quantity: 1, category: 'Base Server' }];
  const resUnquoted = optimizeForBudget(unquotedItem, {}, 10000, mockCatalog);
  assert.strictEqual(unquotedItem[0].unitPriceUsd, null, 'Unquoted item unitPriceUsd must remain null');
  assert.strictEqual(unquotedItem[0].quotedUnitPriceUsd, null, 'quotedUnitPriceUsd must be null for unquoted item');
  assert.strictEqual(unquotedItem[0].catalogListPriceUsd, 5584, 'catalogListPriceUsd must reflect catalog estimate');
  assert.strictEqual(unquotedItem[0].priceSource, 'CATALOG_ESTIMATE');
  assert.strictEqual(resUnquoted.pricingBasis, 'CATALOG_ESTIMATE');
  assert.strictEqual(resUnquoted.pricingComplete, false);
  assert.strictEqual(resUnquoted.quotedBomCostUsd, null, 'quotedBomCostUsd must be null when unquoted items exist');
  assert.strictEqual(resUnquoted.hasUnquotedCustomerItems, true);

  // Case 3: Hybrid mix of quoted and unquoted
  const hybridItems = [
    { sku: 'P73282-B21', quantity: 1, unitPriceUsd: 4500, category: 'Base Server' },
    { sku: 'P64707-B21', quantity: 2, category: 'Processor' }
  ];
  const resHybrid = optimizeForBudget(hybridItems, {}, 10000, mockCatalog);
  assert.strictEqual(hybridItems[0].unitPriceUsd, 4500);
  assert.strictEqual(hybridItems[1].unitPriceUsd, null);
  assert.strictEqual(resHybrid.pricingBasis, 'HYBRID_QUOTE_ESTIMATE');
  assert.strictEqual(resHybrid.pricingComplete, false);
  assert.strictEqual(resHybrid.quotedBomCostUsd, null);
  assert.strictEqual(resHybrid.knownQuotedSubtotalUsd, 4500);
  assert.strictEqual(resHybrid.currentBomCostUsd, 4500 + 500 * 2);
});

