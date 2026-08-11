'use strict';
/**
 * tests/test_incremental_checksum.js — Test Suite for Incremental Checksum & SKU Versioning
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { computeSkuHash, computeIncrementalDifferential } = require('../scripts/lib/checksum_diff');
const { getSkuAuditHistory, calculateChecksum } = require('../scripts/lib/sku_versioning');

console.log('--- STARTING INCREMENTAL CHECKSUM & VERSIONING TESTS ---');

// 1. Test SKU Hash Determinism
const skuA = { sku: 'P73282-B21', description: 'DL380 Gen12 SFF CTO Server', priceUsd: '2499.00', optionType: 'CTO' };
const skuB = { sku: 'P73282-B21', description: 'DL380 Gen12 SFF CTO Server', priceUsd: '2499.00', optionType: 'CTO' };
const skuC = { sku: 'P73282-B21', description: 'DL380 Gen12 SFF CTO Server', priceUsd: '2699.00', optionType: 'CTO' };

const hashA = computeSkuHash(skuA);
const hashB = computeSkuHash(skuB);
const hashC = computeSkuHash(skuC);

assert.strictEqual(hashA, hashB, 'Identical SKUs must yield identical hashes');
assert.notStrictEqual(hashA, hashC, 'Price modification must alter SKU hash');
console.log('✅ PASS: Deterministic SKU Checksum Hash Calculation');

// 2. Test Differential Comparison
const existingCatalog = {
  metadata: { scrapeDate: '2026-08-10' },
  entries: [
    {
      parentCategory: 'Chassis',
      subCategory: 'Variants',
      skus: [
        { sku: 'P73282-B21', description: 'DL380 Gen12 SFF CTO Server', priceUsd: '2499.00', optionType: 'CTO' },
        { sku: 'P02498-B21', description: 'HPE 32GB 2Rx8 DDR5-5600 DIMM', priceUsd: '450.00', optionType: 'Standard' }
      ]
    }
  ]
};

const newScrape = [
  {
    parentCategory: 'Chassis',
    subCategory: 'Variants',
    skus: [
      { sku: 'P73282-B21', description: 'DL380 Gen12 SFF CTO Server', priceUsd: '2499.00', optionType: 'CTO' }, // UNCHANGED
      { sku: 'P02498-B21', description: 'HPE 32GB 2Rx8 DDR5-5600 DIMM', priceUsd: '480.00', optionType: 'Standard' }, // MODIFIED PRICE
      { sku: 'P73283-B21', description: 'DL380 Gen12 LFF CTO Server', priceUsd: '2899.00', optionType: 'CTO' }  // ADDED
    ]
  }
];

const diffResult = computeIncrementalDifferential(newScrape, existingCatalog);

assert.strictEqual(diffResult.stats.unchangedSkusCount, 1, 'Should find 1 unchanged SKU');
assert.strictEqual(diffResult.stats.modifiedSkusCount, 1, 'Should find 1 modified SKU');
assert.strictEqual(diffResult.stats.addedSkusCount, 1, 'Should find 1 added SKU');
assert(diffResult.stats.estimatedTokensSaved > 0, 'Should estimate token savings');

console.log(`✅ PASS: Incremental Hash Diff (Saved ~${diffResult.stats.estimatedTokensSaved} tokens)`);

// 3. Test SKU Version Audit Query on actual chassis directory
const dl380Dir = path.join(__dirname, '..', 'outputs', 'ProLiant', 'Gen12', 'DL380_Gen12_SFF');
if (fs.existsSync(dl380Dir)) {
  const audit = getSkuAuditHistory('P73282-B21', dl380Dir);
  assert.strictEqual(audit.sku, 'P73282-B21');
  console.log(`✅ PASS: SKU Version Audit Query for ${audit.sku} (Status: ${audit.currentStatus})`);
}

console.log('🎉 ALL INCREMENTAL CHECKSUM & VERSIONING TESTS PASSED!');
