'use strict';
/**
 * tests/unit/test_catalog_rule_evaluator.js
 * Unit tests for Wave C Executable 5-Level Catalog Rule IR Evaluator.
 */

const assert = require('assert');
const { evaluateAllCatalogRules, evaluateSubcategoryQuantityBounds } = require('../../scripts/lib/conflict/catalog_rule_evaluator.js');

let passed = 0;
function test(name, fn) {
  fn();
  console.log(`  PASS: ${name}`);
  passed++;
}

console.log('=== WAVE C CATALOG RULE IR EVALUATOR TEST SUITE ===');

test('Enforces AMBIENT_GATE and TDP_GATE rules deterministically', () => {
  const catalogData = {
    rules: [
      { level: 'CHASSIS', ruleType: 'CONDITIONAL_VISIBILITY', conditionType: 'AMBIENT_GATE', conditionOperator: 'lte', thresholdValue: 30, affectedSkus: ['P74506-B21'], rule: 'Max 30C ambient' },
      { level: 'CHASSIS', ruleType: 'CONDITIONAL_VISIBILITY', conditionType: 'TDP_GATE', conditionOperator: 'lte', thresholdValue: 270, affectedSkus: ['P74792-B21'], rule: 'Max 270W TDP heatsink' }
    ]
  };
  const items = [
    { sku: 'P74506-B21', quantity: 2 },
    { sku: 'P74792-B21', quantity: 2 }
  ];
  const passRes = evaluateAllCatalogRules(items, catalogData, {}, { ambientTempC: 25, maxCpuTdpWatts: 250 });
  assert.strictEqual(passRes.violations.length, 0);

  const failRes = evaluateAllCatalogRules(items, catalogData, {}, { ambientTempC: 35, maxCpuTdpWatts: 350 });
  assert.strictEqual(failRes.violations.length, 2);
  assert.ok(failRes.violations.some(v => v.ruleType === 'AMBIENT_GATE'));
  assert.ok(failRes.violations.some(v => v.ruleType === 'TDP_GATE'));
});

test('Flags PORTAL_CONDITIONAL_VIEW SKUs without dropping or faking pass', () => {
  const catalogData = {
    rules: [
      { level: 'CHASSIS', ruleType: 'CONDITIONAL_VISIBILITY', conditionType: 'PORTAL_CONDITIONAL_VIEW', affectedSkus: ['P68503-B21'], rule: 'Show more selector required', portalVerificationRequired: true }
    ]
  };
  const res = evaluateAllCatalogRules([{ sku: 'P68503-B21', quantity: 1 }], catalogData);
  assert.strictEqual(res.conditionalGates.length, 1);
  assert.strictEqual(res.conditionalGates[0].skus[0], 'P68503-B21');
});

test('Enforces REQUIRES, MUTUAL_EXCLUSION, FORM_FACTOR_GATE, and rule maxQty', () => {
  const catalogData = {
    rules: [
      { level: 'SKU', ruleType: 'REQUIRES', affectedSkus: ['P10001-B21'], requiresSkus: ['P20002-B21'] },
      { level: 'SKU', ruleType: 'MUTUAL_EXCLUSION', affectedSkus: ['P30003-B21'], excludesSkus: ['P40004-B21'] },
      { level: 'SKU', ruleType: 'QUANTITY_CONSTRAINT', affectedSkus: ['P50005-B21'], maxQty: 2 },
      { level: 'CHASSIS', ruleText: 'EDSFF drive cage requires EDSFF chassis' }
    ]
  };
  const items = [
    { sku: 'P10001-B21', description: 'Controller A', quantity: 1 },
    { sku: 'P30003-B21', description: 'Cable A', quantity: 1 },
    { sku: 'P40004-B21', description: 'Cable B', quantity: 1 },
    { sku: 'P50005-B21', description: 'EDSFF Cage', quantity: 4 }
  ];
  const res = evaluateAllCatalogRules(items, catalogData, { formFactor: '8SFF' }, { serverCount: 1 });
  assert.ok(res.missingRequirements.some(r => r.requiredSku === 'P20002-B21'));
  assert.ok(res.violations.some(v => v.ruleType === 'MUTUAL_EXCLUSION'));
  assert.ok(res.violations.some(v => v.ruleType === 'QUANTITY_CONSTRAINT'));
  assert.ok(res.violations.some(v => v.ruleType === 'FORM_FACTOR_GATE'));
});

test('Enforces Catalog.json subcategories minQty/maxQty scaled by serverCount', () => {
  const catalogData = {
    subcategories: [
      { parentCategory: 'Power Supplies', subCategory: 'Flex Slot', minQty: 1, maxQty: 2 }
    ],
    entries: [
      {
        parentCategory: 'Power Supplies',
        subCategory: 'Flex Slot',
        skus: [{ 'Product #': 'P38997-B21', Description: 'HPE 1600W Flex Slot PSU' }]
      }
    ]
  };
  const ok = evaluateSubcategoryQuantityBounds([{ sku: 'P38997-B21', quantity: 4 }], catalogData, 2);
  assert.strictEqual(ok.length, 0);

  const bad = evaluateSubcategoryQuantityBounds([{ sku: 'P38997-B21', quantity: 5 }], catalogData, 2);
  assert.strictEqual(bad.length, 1);
  assert.strictEqual(bad[0].maxAllowed, 4);
});

console.log(`\nSUMMARY: ${passed} passed, 0 failed`);
