'use strict';
const assert = require('assert');
const { detectAndNormalizeAtomicCto } = require('../scripts/lib/preprocessor/cto_normalizer.js');

function runTests() {
  console.log('🧪 Starting CTO Normalizer Test Suite...');

  console.log('▶ Test: detectAndNormalizeAtomicCto with Fractional Quantities');
  const itemsWithFractional = [
    { sku: 'P76706-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 2 },
    { sku: 'P49033-B21', description: 'HPE DL38X Gen12 Intel Xeon-G 6430 CPU', quantity: 5 }, // 5 / 2 = 2.5
    { sku: 'P43331-B21', description: 'HPE 64GB 2Rx4 PC5-4800B-R Smart Kit', quantity: 16 } // 16 / 2 = 8
  ];

  const resultFractional = detectAndNormalizeAtomicCto(itemsWithFractional);
  assert.strictEqual(resultFractional.baseChassisQty, 2, 'Should detect 2 chassis');
  assert.strictEqual(resultFractional.isMultipliedOrder, true, 'Should mark as multiplied order');
  assert.strictEqual(resultFractional.hasNonIntegerDivisor, true, 'Should detect non-integer divisor');

  const cpuItemFractional = resultFractional.items.find(i => i.sku === 'P49033-B21');
  assert.strictEqual(cpuItemFractional.atomicQuantity, 2.5, 'Should calculate fractional atomic quantity');
  assert.strictEqual(cpuItemFractional.isIntegerDivisor, false, 'Should flag non-integer divisor for CPU');

  const ramItemFractional = resultFractional.items.find(i => i.sku === 'P43331-B21');
  assert.strictEqual(ramItemFractional.atomicQuantity, 8, 'Should calculate integer atomic quantity');
  assert.strictEqual(ramItemFractional.isIntegerDivisor, true, 'Should not flag non-integer divisor for RAM');


  console.log('▶ Test: detectAndNormalizeAtomicCto with Explicit Multiplier Header');
  // Simulating where chassis is listed with Qty 1, but header had "5x Nodes"
  const itemsExplicitMultiplier = [
    { sku: 'P76706-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 1 },
    { sku: 'P49033-B21', description: 'HPE DL38X Gen12 Intel Xeon-G 6430 CPU', quantity: 2 },
    { sku: 'P43331-B21', description: 'HPE 64GB 2Rx4 PC5-4800B-R Smart Kit', quantity: 16 }
  ];

  const resultExplicit = detectAndNormalizeAtomicCto(itemsExplicitMultiplier, { explicitMultiplier: 5 });
  assert.strictEqual(resultExplicit.baseChassisQty, 5, 'Should inherit explicit multiplier');
  assert.strictEqual(resultExplicit.isMultipliedOrder, true, 'Should mark as multiplied order');
  assert.strictEqual(resultExplicit.hasNonIntegerDivisor, false, 'Should be clean because child items are Qty per node');

  const cpuItemExplicit = resultExplicit.items.find(i => i.sku === 'P49033-B21');
  assert.strictEqual(cpuItemExplicit.atomicQuantity, 2, 'Should maintain atomic quantity');
  assert.strictEqual(cpuItemExplicit.totalQuantity, 10, 'Should calculate total quantity based on multiplier');

  console.log('✅ All CTO Normalizer tests passed!\n');
}

runTests();
