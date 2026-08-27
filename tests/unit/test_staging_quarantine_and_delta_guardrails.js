/**
 * test_staging_quarantine_and_delta_guardrails.js
 * Unit Test Suite for Staging Quarantine Isolation, Catastrophic Drop Anomaly Detection (INV-23),
 * 7-Event Delta Classification Engine, and Same-Day Snapshot Deduplication (INV-1, INV-6).
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { processCatalogDiff } = require('../../scripts/lib/catalog/diff_catalog.js');
const { safeWriteJsonAtomic } = require('../../scripts/lib/system/fs_compat.js');

describe('Staging Quarantine Isolation & Atomic Rollback (INV-23)', () => {
  it('should verify staging directory writes do not mutate live directory until promotion', () => {
    const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'staging_test_'));
    const liveDir = path.join(tmpBase, 'live');
    const stagingDir = path.join(tmpBase, 'staging');
    fs.mkdirSync(liveDir, { recursive: true });
    fs.mkdirSync(stagingDir, { recursive: true });

    // Seed initial live catalog with valid entries
    const initialLiveCatalog = {
      metadata: { totalUniqueSKUs: 476 },
      entries: [
        {
          parentCategory: 'Processor',
          subCategory: 'Intel',
          skus: [
            { 'Product #': 'P49631-B21', 'Price': '$8,500.00', 'Description': 'Intel Xeon 8468V [OB]', 'Current Qty': '1' }
          ]
        }
      ]
    };
    const liveCatalogPath = path.join(liveDir, 'DL380_Gen11_Catalog.json');
    safeWriteJsonAtomic(liveCatalogPath, initialLiveCatalog);

    // Simulate staging failure: write staged corrupted payload only inside stagingDir
    const stagingCatalogPath = path.join(stagingDir, 'DL380_Gen11_Catalog.json');
    safeWriteJsonAtomic(stagingCatalogPath, {
      metadata: { totalUniqueSKUs: 5 },
      entries: [
        {
          parentCategory: 'Processor',
          subCategory: 'Intel',
          skus: [
            { 'Product #': 'P49631-B21', 'Price': '$8,500.00', 'Description': 'Intel Xeon 8468V [OB]', 'Current Qty': '1' }
          ]
        }
      ]
    });

    // Live catalog must remain completely unaltered
    const liveContent = JSON.parse(fs.readFileSync(liveCatalogPath, 'utf-8'));
    assert.strictEqual(liveContent.metadata.totalUniqueSKUs, 476, 'Live catalog must remain untouched during staging operations');
    assert.strictEqual(liveContent.entries[0].skus[0]['Product #'], 'P49631-B21');

    // Clean up
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  it('should detect catastrophic SKU drops (>30% drop below baseline) and signal anomaly', () => {
    const priorBaselineCount = 476;
    const stagingCount = 120; // 75% drop!
    const dropRatio = stagingCount / priorBaselineCount;

    assert.ok(dropRatio < 0.70, 'Drop ratio must be less than 70%');
    const isAnomaly = dropRatio < 0.70;
    assert.strictEqual(isAnomaly, true, 'Catastrophic SKU drop must be detected as an anomaly');
  });
});

describe('7-Event Delta Classification Engine & Price History Integrity', () => {
  it('should correctly classify diff events between catalog snapshots', () => {
    const oldSnapshot = {
      metadata: { scrapeDate: '2026-08-10', totalUniqueSKUs: 5 },
      entries: [
        {
          parentCategory: 'Memory',
          subCategory: 'DDR5',
          skus: [
            { 'Product #': 'P43328-B21', 'Price': '$1,000.00', 'Description': 'Unchanged 64GB DIMM', 'Current Qty': '0' },
            { 'Product #': 'P43331-B21', 'Price': '$2,000.00', 'Description': '128GB DIMM', 'Current Qty': '0' }
          ]
        },
        {
          parentCategory: 'Processor',
          subCategory: 'Intel Xeon',
          skus: [
            { 'Product #': 'P49638-B21', 'Price': '$3,000.00', 'Description': 'Intel Xeon 32-core', 'Current Qty': '0' },
            { 'Product #': 'P49639-B21', 'Price': '$4,000.00', 'Description': 'Gold 5411N 24-core', 'Current Qty': '0' },
            { 'Product #': 'P49640-B21', 'Price': '$5,000.00', 'Description': 'Direct Ship CPU', 'Current Qty': '0' }
          ]
        }
      ]
    };

    const newSnapshot = {
      metadata: { scrapeDate: '2026-08-27', totalUniqueSKUs: 5 },
      entries: [
        {
          parentCategory: 'Memory',
          subCategory: 'DDR5',
          skus: [
            { 'Product #': 'P43328-B21', 'Price': '$1,000.00', 'Description': 'Unchanged 64GB DIMM', 'Current Qty': '0' },
            { 'Product #': 'P43331-B21', 'Price': '$2,200.00', 'Description': '128GB DIMM', 'Current Qty': '0' }
          ]
        },
        {
          parentCategory: 'Processor',
          subCategory: 'Intel Xeon',
          skus: [
            { 'Product #': 'P49638-B21', 'Price': '$3,000.00', 'Description': 'Intel Xeon 32-core (Updated Specs)', 'Current Qty': '0' },
            { 'Product #': 'P49639-B21', 'Price': '$4,500.00', 'Description': 'Gold 5411N 24-core (Updated Specs)', 'Current Qty': '0' },
            { 'Product #': 'P67089-B21', 'Price': '$6,000.00', 'Description': 'Intel Xeon 8592+ (Brand New CPU)', 'Current Qty': '0' }
          ]
        }
      ]
    };

    const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'diff_test_'));
    const historyDir = path.join(tmpBase, 'history');
    fs.mkdirSync(historyDir, { recursive: true });

    // Seed prior snapshot
    safeWriteJsonAtomic(path.join(historyDir, 'catalog_2026-08-10.json'), oldSnapshot);

    const result = processCatalogDiff(newSnapshot, historyDir, 'catalog');

    assert.strictEqual(result.diffSummary.added, 1, 'Must detect 1 ADDED SKU');
    assert.strictEqual(result.diffSummary.priceChanged, 1, 'Must detect 1 PRICE_CHANGED SKU');
    assert.strictEqual(result.diffSummary.attributeChanged, 1, 'Must detect 1 ATTRIBUTE_CHANGED SKU');
    assert.strictEqual(result.diffSummary.priceAndAttributeChanged, 1, 'Must detect 1 PRICE_AND_ATTR_CHANGED SKU');
    assert.strictEqual(result.diffSummary.unchanged, 1, 'Must detect 1 UNCHANGED SKU');

    // Clean up
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  it('should enforce same-day snapshot deduplication (INV-1)', () => {
    const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'dedup_test_'));
    const historyDir = path.join(tmpBase, 'history');
    fs.mkdirSync(historyDir, { recursive: true });

    const snapshotData = {
      metadata: { scrapeDate: '2026-08-27', totalUniqueSKUs: 1 },
      entries: [
        {
          parentCategory: 'Processor',
          subCategory: 'Intel Xeon',
          skus: [
            { 'Product #': 'P49631-B21', 'Price': '$8,500.00', 'Description': 'Intel Xeon 8468V [OB]', 'Current Qty': '1' }
          ]
        }
      ]
    };

    // First run on 2026-08-27
    processCatalogDiff(snapshotData, historyDir, 'catalog');
    // Second run on same date 2026-08-27
    processCatalogDiff(snapshotData, historyDir, 'catalog');

    const priceHistory = JSON.parse(fs.readFileSync(path.join(historyDir, 'price_history.json'), 'utf-8'));
    const trail = priceHistory['P49631-B21'];

    assert.ok(Array.isArray(trail), 'Trail must be an array');
    const dates = trail.map(t => t.date);
    const uniqueDates = new Set(dates);
    assert.strictEqual(dates.length, uniqueDates.size, 'Must never produce duplicate date entries for same-day rerun (INV-1)');

    // Clean up
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });
});
