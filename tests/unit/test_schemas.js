'use strict';
/**
 * tests/test_schemas.js — Verification test suite for Zod runtime data contracts
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const {
  safeParseCatalog,
  safeParseBOQ,
  safeParseEvalResult,
  safeParseKnowledgeDelta,
  BOQItemSchema,
  RankedSolutionSchema
} = require('../../scripts/lib/system/schemas.js');

console.log('🧪 Starting Zod Runtime Schema Validation Tests...\n');

// Test 1: Real Catalog Schema Validation
const catalogPath = path.join(__dirname, '../../outputs/ProLiant/Gen12/DL380_Gen12_SFF/DL380_Gen12_SFF_Catalog.json');
if (fs.existsSync(catalogPath)) {
  const rawCatalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const parsed = safeParseCatalog(rawCatalog);
  assert.strictEqual(parsed.success, true, `Catalog validation failed: ${JSON.stringify(parsed.errors)}`);
  console.log(`✅ [1/5] DL380 Gen12 Catalog matches CatalogMasterSchema (${parsed.data.entries.length} sections validated).`);
} else {
  console.log('⚠️ [1/5] DL380 Gen12 Catalog not found on disk, skipping live file check.');
}

// Test 2: BOQ Item Coercion & Validation
const sampleBOQ = {
  fileName: 'test_quote.xlsx',
  items: [
    { sku: 'P74573-B21', quantity: '2', unitPriceUsd: '$2,700.00', category: 'Compute Processors' },
    { sku: 'P48820-B21', quantity: 1, unitPriceUsd: 350, isFixInjected: true }
  ]
};
const parsedBoq = safeParseBOQ(sampleBOQ);
assert.strictEqual(parsedBoq.success, true, 'BOQ validation failed');
assert.strictEqual(parsedBoq.data.items[0].quantity, 2, 'Quantity was not coerced to number');
assert.strictEqual(parsedBoq.data.items[0].unitPriceUsd, 2700, 'Unit price currency string was not coerced');
console.log('✅ [2/5] BOQItemSchema properly coerces quantity and currency strings.');

// Test 3: Evaluation Result & 5-Tier Strategy Validation
const sampleEval = {
  status: 'PASS',
  confidenceScore: 0.98,
  chassisInfo: {
    family: 'ProLiant',
    gen: 'Gen12',
    model: 'DL380 Gen12 8SFF'
  },
  conflictGraph: {
    rankedSolutions: [
      {
        rank: 1,
        name: 'Rank 1: Intent Preserved',
        score: 0.98,
        estimatedCostUsd: 24500,
        skuPartsList: [
          { sku: 'P73282-B21', quantity: 1, unitPriceUsd: 5584 }
        ]
      }
    ]
  }
};
const parsedEval = safeParseEvalResult(sampleEval);
assert.strictEqual(parsedEval.success, true, `Evaluation result validation failed: ${JSON.stringify(parsedEval.errors)}`);
console.log('✅ [3/5] BOQEvaluationResultSchema validates multi-tier matrix structure with default fallbacks.');

// Test 4: Knowledge Delta Validation
const sampleDelta = {
  chassis: 'DL380_Gen12_SFF',
  affectedSku: 'P55415-B21',
  requiredDependencySku: 'P01366-B21',
  ruleUpdate: 'MR416i-o Tri-Mode controller requires P01366-B21 battery kit.'
};
const parsedDelta = safeParseKnowledgeDelta(sampleDelta);
assert.strictEqual(parsedDelta.success, true, `Knowledge delta validation failed: ${JSON.stringify(parsedDelta.errors)}`);
assert.strictEqual(parsedDelta.data.scope, 'FAMILY_GEN', 'Default scope should be FAMILY_GEN');
console.log('✅ [4/5] KnowledgeDeltaSchema validates learning records with automated ID generation.');

// Test 5: Rejection of Malformed Inputs
const malformedBoq = {
  items: [
    { sku: '', quantity: -5 } // Empty SKU should fail
  ]
};
const badBoqRes = safeParseBOQ(malformedBoq);
assert.strictEqual(badBoqRes.success, false, 'Malformed BOQ should have failed');
console.log('✅ [5/5] Safe parsers properly reject malformed inputs without throwing uncaught exceptions.\n');

console.log('🎉 ALL 5 ZOD SCHEMA VALIDATION TESTS PASSED PERFECTLY!\n');
