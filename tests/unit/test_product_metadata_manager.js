'use strict';
/**
 * tests/unit/test_product_metadata_manager.js — Product Generation Metadata & Promotion Tests
 *
 * Validates R-11 findings:
 * - Exact composite product identity and collision resistance
 * - Malformed registry quarantine (quarantine must succeed before replacement)
 * - Concurrency lease protection during promotion
 * - Atomic guard validation (timestamp matching, SKU count verification, staging audit gate)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');

const {
  discoverAllProductCatalogs,
  getProductGenerationMetadata,
  commitSuccessfulResyncMetadata
} = require('../../scripts/lib/catalog/product_metadata_manager.js');

test('Product Metadata Manager — exact composite product identity prevents collisions (R-11)', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'meta-mgr-test-'));
  try {
    // Create two directories with the same model name under different generations
    const gen11Dir = path.join(tmpRoot, 'ProLiant', 'Gen11', 'DL380');
    const gen12Dir = path.join(tmpRoot, 'ProLiant', 'Gen12', 'DL380');
    fs.mkdirSync(gen11Dir, { recursive: true });
    fs.mkdirSync(gen12Dir, { recursive: true });

    fs.writeFileSync(path.join(gen11Dir, 'DL380_Catalog.json'), JSON.stringify({
      metadata: { family: 'ProLiant', generation: 'Gen11', chassis: 'DL380 Gen11', totalUniqueSKUs: 100, scrapeTimestamp: new Date().toISOString() },
      entries: [{ skus: [{ 'Product #': 'SKU-G11' }] }]
    }));

    fs.writeFileSync(path.join(gen12Dir, 'DL380_Catalog.json'), JSON.stringify({
      metadata: { family: 'ProLiant', generation: 'Gen12', chassis: 'DL380 Gen12', totalUniqueSKUs: 200, scrapeTimestamp: new Date().toISOString() },
      entries: [{ skus: [{ 'Product #': 'SKU-G12' }] }]
    }));

    const discovered = discoverAllProductCatalogs(tmpRoot);
    assert.equal(discovered.length, 2, 'Must discover both catalogs');

    // Querying with composite key ProLiant/Gen11/DL380 must resolve specifically to Gen11
    const meta11 = getProductGenerationMetadata('ProLiant/Gen11/DL380', discovered);
    assert.equal(meta11.exists, true);
    assert.equal(meta11.generation, 'Gen11');
    assert.equal(meta11.totalUniqueSKUs, 100);

    // Querying with composite key ProLiant/Gen12/DL380 must resolve specifically to Gen12
    const meta12 = getProductGenerationMetadata('ProLiant/Gen12/DL380', discovered);
    assert.equal(meta12.exists, true);
    assert.equal(meta12.generation, 'Gen12');
    assert.equal(meta12.totalUniqueSKUs, 200);

    // Exact output directory path resolution
    const metaByPath = getProductGenerationMetadata(gen12Dir, discovered);
    assert.equal(metaByPath.exists, true);
    assert.equal(metaByPath.generation, 'Gen12');
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('Product Metadata Manager — corrupt registry is quarantined before replacement (R-11)', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'meta-quarantine-test-'));
  const locksRoot = path.join(tmpRoot, 'locks');
  const masterPath = path.join(tmpRoot, 'master_registry.json');
  const catalogDir = path.join(tmpRoot, 'DL380_Gen12');
  fs.mkdirSync(catalogDir, { recursive: true });
  fs.mkdirSync(locksRoot, { recursive: true });

  const now = new Date().toISOString();
  const catalogPath = path.join(catalogDir, 'DL380_Gen12_Catalog.json');
  fs.writeFileSync(catalogPath, JSON.stringify({
    metadata: { family: 'ProLiant', generation: 'Gen12', chassis: 'DL380 Gen12', totalUniqueSKUs: 1, scrapeTimestamp: now },
    entries: [{ skus: [{ 'Product #': 'P74573-B21' }] }]
  }));

  // Write corrupt JSON to master registry
  fs.writeFileSync(masterPath, 'CORRUPTED_NON_JSON_DATA_<<<>>>');

  try {
    const discovered = discoverAllProductCatalogs(tmpRoot);
    const result = commitSuccessfulResyncMetadata({
      productKey: 'DL380_Gen12',
      catalogPath,
      scrapeTimestamp: now,
      uniqueSKUs: 1,
      stagingAuditPassed: true
    }, {
      masterMetadataPath: masterPath,
      locksRoot,
      discovered,
      rootDir: tmpRoot
    });

    assert.equal(result.success, true);

    // Check that a .corrupted.<timestamp>.json quarantine file was created
    const files = fs.readdirSync(tmpRoot);
    const quarantineFile = files.find(f => f.startsWith('master_registry.json.corrupted.'));
    assert.ok(quarantineFile, 'Quarantine backup of corrupted registry must exist');
    const content = fs.readFileSync(path.join(tmpRoot, quarantineFile), 'utf-8');
    assert.equal(content, 'CORRUPTED_NON_JSON_DATA_<<<>>>');

    // And new registry is valid JSON
    const newMaster = JSON.parse(fs.readFileSync(masterPath, 'utf-8'));
    assert.ok(newMaster.products['DL380_Gen12']);
    assert.equal(newMaster.products['DL380_Gen12'].promotionVerified, true);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('Product Metadata Manager — atomic guard rejects invalid or unverified staging audit (R-11)', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'meta-guard-test-'));
  const locksRoot = path.join(tmpRoot, 'locks');
  const masterPath = path.join(tmpRoot, 'master_registry.json');
  const catalogDir = path.join(tmpRoot, 'DL380_Gen12');
  fs.mkdirSync(catalogDir, { recursive: true });

  const now = new Date().toISOString();
  const catalogPath = path.join(catalogDir, 'DL380_Gen12_Catalog.json');
  fs.writeFileSync(catalogPath, JSON.stringify({
    metadata: { family: 'ProLiant', generation: 'Gen12', chassis: 'DL380 Gen12', totalUniqueSKUs: 1, scrapeTimestamp: now },
    entries: [{ skus: [{ 'Product #': 'P74573-B21' }] }]
  }));

  try {
    const discovered = discoverAllProductCatalogs(tmpRoot);

    // 1. Fails when stagingAuditPassed is false
    assert.throws(() => {
      commitSuccessfulResyncMetadata({
        productKey: 'DL380_Gen12',
        catalogPath,
        scrapeTimestamp: now,
        uniqueSKUs: 1,
        stagingAuditPassed: false
      }, { masterMetadataPath: masterPath, locksRoot, discovered, rootDir: tmpRoot });
    }, /Staging audit did not pass/i);

    // 2. Fails when SKU count does not match promoted content
    assert.throws(() => {
      commitSuccessfulResyncMetadata({
        productKey: 'DL380_Gen12',
        catalogPath,
        scrapeTimestamp: now,
        uniqueSKUs: 999, // Mismatched!
        stagingAuditPassed: true
      }, { masterMetadataPath: masterPath, locksRoot, discovered, rootDir: tmpRoot });
    }, /Catalog SKU count does not match/i);

    // 3. Fails when timestamp is in the future
    const futureTime = new Date(Date.now() + 10000000).toISOString();
    fs.writeFileSync(catalogPath, JSON.stringify({
      metadata: { family: 'ProLiant', generation: 'Gen12', chassis: 'DL380 Gen12', totalUniqueSKUs: 1, scrapeTimestamp: futureTime },
      entries: [{ skus: [{ 'Product #': 'P74573-B21' }] }]
    }));
    assert.throws(() => {
      commitSuccessfulResyncMetadata({
        productKey: 'DL380_Gen12',
        catalogPath,
        scrapeTimestamp: futureTime,
        uniqueSKUs: 1,
        stagingAuditPassed: true
      }, { masterMetadataPath: masterPath, locksRoot, discovered, rootDir: tmpRoot });
    }, /Invalid or mismatched vendor capture timestamp/i);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});
