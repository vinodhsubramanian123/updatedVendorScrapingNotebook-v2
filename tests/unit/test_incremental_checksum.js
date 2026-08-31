'use strict';
/**
 * tests/test_incremental_checksum.js — Test Suite for Incremental Checksum & SKU Versioning
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { computeSkuHash, computeIncrementalDifferential } = require('../../scripts/lib/catalog/checksum_diff.js');
const { getSkuAuditHistory, calculateChecksum } = require('../../scripts/lib/catalog/sku_versioning.js');

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
const dl380Dir = path.join(__dirname, '../..', 'outputs', 'ProLiant', 'Gen12', 'DL380_Gen12');
if (fs.existsSync(dl380Dir)) {
  const audit = getSkuAuditHistory('P73282-B21', dl380Dir);
  assert.strictEqual(audit.sku, 'P73282-B21');
  console.log(`✅ PASS: SKU Version Audit Query for ${audit.sku} (Status: ${audit.currentStatus})`);
}

// 4. Test Same-Day Re-run Idempotency in processCatalogDiff (INV-1 & INV-6)
const { processCatalogDiff } = require('../../scripts/lib/catalog/diff_catalog.js');
const tmpTestDir = path.join(__dirname, '../..', 'outputs', 'temp', `test_diff_idempotency_${Date.now()}`);
fs.mkdirSync(tmpTestDir, { recursive: true });

try {
  const testCatalog = {
    metadata: { scrapeDate: '2026-08-22', chassis: 'DL380 Gen12 SFF' },
    entries: [
      {
        parentCategory: 'Compute',
        subCategory: 'Processors',
        skus: [
          { 'Product #': 'P74573-B21', 'Unit Price (USD)': '3500.00', 'Description': 'Intel Xeon 6740E Processor', 'Current Qty': '1' },
          { 'Product #': 'P73282-B21', 'Unit Price (USD)': '2499.00', 'Description': 'DL380 Gen12 SFF CTO Server', 'Current Qty': '1' }
        ]
      }
    ]
  };

  // Run 1: Initial Baseline
  processCatalogDiff(testCatalog, tmpTestDir);
  // Run 2: Re-run on same day (simulating repeated scrape)
  processCatalogDiff(testCatalog, tmpTestDir);
  // Run 3: 3rd rerun on same day
  processCatalogDiff(testCatalog, tmpTestDir);

  const priceHistoryPath = path.join(tmpTestDir, 'price_history.json');
  const priceHistory = JSON.parse(fs.readFileSync(priceHistoryPath, 'utf-8'));

  // Ensure each SKU has exactly 1 entry for 2026-08-22 (no duplicate ADDED + UNCHANGED pairs)
  for (const [sku, trail] of Object.entries(priceHistory)) {
    const dateCount = trail.filter(t => t.date === '2026-08-22').length;
    assert.strictEqual(dateCount, 1, `SKU ${sku} must have exactly 1 history entry for same-day rerun, found ${dateCount}`);
  }

  // Ensure exactly 1 snapshot file was created
  const snapshots = fs.readdirSync(tmpTestDir).filter(f => /^catalog_\d{4}-\d{2}-\d{2}\.json$/.test(f));
  assert.strictEqual(snapshots.length, 1, `Must have exactly 1 snapshot file, found ${snapshots.length}`);
  assert.strictEqual(snapshots[0], 'catalog_2026-08-22.json', 'Snapshot name must be normalized YYYY-MM-DD');

  console.log('✅ PASS: Same-Day Re-run Idempotency (INV-1 & INV-6 Certified)');
} finally {
  try { fs.rmSync(tmpTestDir, { recursive: true, force: true }); } catch (_) {}
}

console.log('🎉 ALL INCREMENTAL CHECKSUM & VERSIONING TESTS PASSED!');
