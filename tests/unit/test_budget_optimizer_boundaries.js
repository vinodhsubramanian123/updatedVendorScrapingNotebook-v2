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
    assert.strictEqual(getSkuListPrice('BASE', { entries: [{ skus: [{ 'Product #': 'BASE', Price: value }] }] }), null);
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
  assert.strictEqual(pUnknown, null);
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

test('Budget Optimizer — F16: Complete Financial Propagation & Nullable Totals', () => {
  const mockCatalog = {
    entries: [
      {
        skus: [
          { 'Product #': 'P73282-B21', 'Unit Price (USD)': '$5,584' }
        ]
      }
    ]
  };

  // Case 1: BOM with an unpriced/unavailable SKU makes complete totals null while known subtotal is preserved
  const itemsWithUnpriced = [
    { sku: 'P73282-B21', quantity: 1, category: 'Base Server' },
    { sku: 'UNPRICED-OPTION', quantity: 2, category: 'Controller' }
  ];
  const resIncomplete = optimizeForBudget(itemsWithUnpriced, {}, 10000, mockCatalog);
  assert.strictEqual(resIncomplete.currentBomCostUsd, null, 'currentBomCostUsd must be null when any item is unpriced');
  assert.strictEqual(resIncomplete.mandatoryBomCostUsd, null, 'mandatoryBomCostUsd must be null when any item is unpriced');
  assert.strictEqual(resIncomplete.totalOrderCostUsd, null, 'totalOrderCostUsd must be null when any item is unpriced');
  assert.strictEqual(resIncomplete.knownCurrentBomCostUsd, 5584, 'knownCurrentBomCostUsd must reflect priced items');
  assert.strictEqual(resIncomplete.knownMandatorySubtotalUsd, 5584, 'knownMandatorySubtotalUsd must reflect priced items');
  assert.strictEqual(resIncomplete.budgetAssessmentComplete, false, 'budgetAssessmentComplete must be false');
  assert.deepStrictEqual(resIncomplete.unavailableSkus, ['UNPRICED-OPTION']);

  // Case 2: Fully priced BOM has numeric complete totals
  const fullyPricedItems = [
    { sku: 'P73282-B21', quantity: 1, category: 'Base Server' }
  ];
  const resComplete = optimizeForBudget(fullyPricedItems, {}, 10000, mockCatalog);
  assert.strictEqual(resComplete.currentBomCostUsd, 5584);
  assert.strictEqual(resComplete.mandatoryBomCostUsd, 5584);
  assert.strictEqual(resComplete.totalOrderCostUsd, 5584);
  assert.strictEqual(resComplete.budgetAssessmentComplete, true);
  assert.deepStrictEqual(resComplete.unavailableSkus, []);
});

test('Budget Optimizer — F17: Receipt Scope Binding Verification', () => {
  const os = require('os');
  const fs = require('fs');
  const path = require('path');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'budget-opt-f17-'));
  const evDir = path.join(tmpDir, 'evidence');
  fs.mkdirSync(evDir, { recursive: true });

  try {
    const nowIso = new Date().toISOString();
    const mockScope = {
      chassis: 'DL380_Gen12',
      baseSku: 'P73282-B21',
      configurationName: 'Config_1',
      selectors: { ambientTempMaxC: 27 }
    };
    const mockBom = {
      capturedAt: nowIso,
      capturedScope: mockScope,
      text: 'Solution List Price USD 5,584.00',
      tables: [{
        rows: [
          ['Hierarchy', 'Qty', 'Product #', 'Product Description', 'Config Name', 'Unit Price (USD)', 'Ext. Price (USD)'],
          ['1', '1', 'P73282-B21', 'Base Server', 'Config_1', '5584.00', '5584.00']
        ]
      }]
    };
    const mockCheck = {
      capturedAt: nowIso,
      capturedScope: mockScope,
      text: 'Overall Status: OK Unbuildables 0 Errors: 0 Warnings: 0 Process control 0'
    };
    fs.writeFileSync(path.join(evDir, 'clic_corrected_bom.json'), JSON.stringify(mockBom));
    fs.writeFileSync(path.join(evDir, 'clic_corrected_configuration.json'), JSON.stringify(mockCheck));

    // When candidate matches scope and manifest exactly, receipt is bound
    const matchingCandidate = {
      chassis: 'DL380_Gen12',
      baseSku: 'P73282-B21',
      configurationName: 'Config_1',
      selectors: { ambientTempMaxC: 27 },
      items: [{ sku: 'P73282-B21', quantity: 1 }]
    };
    const matchingItems = [{ sku: 'P73282-B21', quantity: 1 }];
    const resMatching = optimizeForBudget(matchingItems, matchingCandidate, 10000, null, tmpDir);
    assert.strictEqual(matchingItems[0].receiptPriceSource, `Live OCA BOM ${nowIso}`);
    assert.strictEqual(resMatching.mandatoryBomCostUsd, 5584);

    // When candidate does NOT match scope (e.g. chassis mismatch), receipt is NOT bound
    const mismatchedCandidate = {
      chassis: 'DL360_Gen12',
      baseSku: 'P73282-B21',
      configurationName: 'Config_1',
      selectors: { ambientTempMaxC: 27 },
      items: [{ sku: 'P73282-B21', quantity: 1 }]
    };
    const mismatchedItems = [{ sku: 'P73282-B21', quantity: 1 }];
    const resMismatched = optimizeForBudget(mismatchedItems, mismatchedCandidate, 10000, null, tmpDir);
    assert.strictEqual(mismatchedItems[0].receiptPriceSource, undefined, 'Receipt price source must not be assigned when scope mismatches');
    assert.strictEqual(resMismatched.mandatoryBomCostUsd, null, 'Mandatory cost must be null when catalog estimate is unavailable and receipt does not match');

    // Customer quote price must never be overwritten with Live OCA BOM price source
    const quotedMatchingItems = [{ sku: 'P73282-B21', quantity: 1, unitPriceUsd: 4500 }];
    optimizeForBudget(quotedMatchingItems, matchingCandidate, 10000, null, tmpDir);
    assert.strictEqual(quotedMatchingItems[0].priceSource, 'CUSTOMER_QUOTE', 'Customer quote must retain CUSTOMER_QUOTE priceSource');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

