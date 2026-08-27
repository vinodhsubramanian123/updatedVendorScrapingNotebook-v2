'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { normalizeTargetDate } = require('../../scripts/lib/catalog/sku_versioning.js');
const { processCatalogDiff } = require('../../scripts/lib/catalog/diff_catalog.js');
const fs = require('fs');
const os = require('os');

test('Catalog Diff and Price History suite', async (t) => {

  await t.test('INV-6: normalizeTargetDate formats to strictly YYYY-MM-DD', () => {
    assert.strictEqual(normalizeTargetDate('2026-08'), '2026-08-31');
    assert.strictEqual(normalizeTargetDate('aug 2026'), '2026-08-31');
    assert.strictEqual(normalizeTargetDate('2026-08-15'), '2026-08-15');
    assert.strictEqual(normalizeTargetDate('Sep 2026'), '2026-09-30');
    assert.strictEqual(normalizeTargetDate('Feb 2026'), '2026-02-28');
  });

  await t.test('INV-1, Discontinued SKUs, Attribute History', (t2) => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'diff_catalog_test_'));
    
    const prevCatalogPath = path.join(tempDir, 'catalog_2026-08-01.json');
    fs.writeFileSync(prevCatalogPath, JSON.stringify({
      metadata: { scrapeDate: '2026-08-01' },
      entries: [
        {
          parentCategory: 'Servers',
          subCategory: 'Base',
          skus: [
            { 'Product #': 'SKU1', 'Unit Price (USD)': '100', 'Description': 'Old desc 1' }, // Normal SKU
            { 'Product #': 'SKU2', 'Unit Price (USD)': '0' },   // $0 CTO SKU
            { 'Product #': 'SKU3', 'Unit Price (USD)': '500', 'Description': 'Old desc 3' } // SKU to change attributes
          ]
        }
      ]
    }));
    
    fs.writeFileSync(path.join(tempDir, 'price_history.json'), JSON.stringify({
      'SKU1': [{ date: '2026-08-01', price: 100, status: 'BASELINE' }],
      'SKU2': [{ date: '2026-08-01', price: 0, status: 'BASELINE' }],
      'SKU3': [{ date: '2026-08-01', price: 500, status: 'BASELINE' }]
    }));
    
    fs.writeFileSync(path.join(tempDir, 'attribute_history.json'), JSON.stringify([]));
    fs.writeFileSync(path.join(tempDir, 'discontinued_skus.json'), JSON.stringify({}));

    t2.mock.method(console, 'log', () => {});
    t2.mock.method(console, 'warn', () => {});

    // First run (2026-08-02)
    const catalogData02 = {
      metadata: { scrapeDate: '2026-08-02', chassis: 'DL380 Gen12' },
      entries: [
        {
          parentCategory: 'Servers',
          subCategory: 'Base',
          skus: [
             { 'Product #': 'SKU3', 'Unit Price (USD)': '500', 'Description': 'New desc 3' }, // Attribute mutation
             { 'Product #': 'SKU4', 'Unit Price (USD)': '200' }, // Added new
          ]
        }
      ]
    };
    processCatalogDiff(catalogData02, tempDir, 'catalog');

    const catalogData02Rerun = {
      metadata: { scrapeDate: '2026-08-02', chassis: 'DL380 Gen12' },
      entries: [
        {
          parentCategory: 'Servers',
          subCategory: 'Base',
          skus: [
             { 'Product #': 'SKU3', 'Unit Price (USD)': '500', 'Description': 'New desc 3' },
             { 'Product #': 'SKU4', 'Unit Price (USD)': '200' },
          ]
        }
      ]
    };

    const tempPrev = JSON.parse(fs.readFileSync(prevCatalogPath, 'utf8'));
    tempPrev.entries[0].skus.push({ 'Product #': 'SKU4', 'Unit Price (USD)': '200' });
    fs.writeFileSync(prevCatalogPath, JSON.stringify(tempPrev));
    
    processCatalogDiff(catalogData02Rerun, tempDir, 'catalog');
    
    const finalPriceHistory = JSON.parse(fs.readFileSync(path.join(tempDir, 'price_history.json'), 'utf8'));
    const finalDiscontinued = JSON.parse(fs.readFileSync(path.join(tempDir, 'discontinued_skus.json'), 'utf8'));
    const finalAttrHistory = JSON.parse(fs.readFileSync(path.join(tempDir, 'attribute_history.json'), 'utf8'));

    // Check SKU4 trail: should NOT have overwritten ADDED with UNCHANGED
    const sku4Trail = finalPriceHistory['SKU4'];
    assert.strictEqual(sku4Trail.length, 1, 'SKU4 should only have one entry for the date due to deduplication');
    assert.strictEqual(sku4Trail[0].status, 'ADDED', 'SKU4 status should be ADDED (higher priority), not overwritten by UNCHANGED');
    
    // Check discontinued SKUs ($0 unpriced CTO excluded)
    assert.ok(finalDiscontinued['SKU1'], 'SKU1 should be in discontinued registry');
    assert.strictEqual(finalDiscontinued['SKU1'].status, 'DISCONTINUED');
    assert.ok(!finalDiscontinued['SKU2'], 'SKU2 ($0 base placeholder) must be excluded from discontinued registry');
    
    // Check attribute mutations
    const sku3AttrMutation = finalAttrHistory.find(e => e.productNumber === 'SKU3');
    assert.ok(sku3AttrMutation, 'SKU3 should have attribute history entry in array');
    assert.strictEqual(sku3AttrMutation.field, 'Description');
    assert.strictEqual(sku3AttrMutation.oldValue, 'Old desc 3');
    assert.strictEqual(sku3AttrMutation.newValue, 'New desc 3');
    assert.strictEqual(finalPriceHistory['SKU3'].find(e => e.date === '2026-08-02').status, 'ATTRIBUTE_CHANGED');

    // Clean up temp dir
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
