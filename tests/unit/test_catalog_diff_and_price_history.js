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
    assert.strictEqual(finalAttrHistory.filter(e => e.productNumber === 'SKU3' && e.field === 'Description').length, 1,
      'same semantic attribute change must be recorded once across reruns');
    assert.strictEqual(finalPriceHistory['SKU3'].find(e => e.date === '2026-08-02').status, 'ATTRIBUTE_CHANGED');

    // Clean up temp dir
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  await t.test('cross-product historical chassis are ignored and purged from history', (t2) => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'diff_catalog_firewall_'));
    try {
      fs.writeFileSync(path.join(tempDir, 'catalog_2026-09-05.json'), JSON.stringify({
        metadata: { scrapeDate: '2026-09-05' },
        entries: [
          { parentCategory: 'Chassis', subCategory: 'Variants', skus: [
            { 'Product #': 'P73282-B21', Description: 'HPE DL380 Gen12 CTO Server', 'Unit Price (USD)': '5584' }
          ] },
          { parentCategory: 'Accessories', subCategory: 'Rails', skus: [
            { 'Product #': 'P52341-B21', Description: 'HPE Easy Install Rail Kit', 'Unit Price (USD)': '164' }
          ] }
        ]
      }));
      fs.writeFileSync(path.join(tempDir, 'price_history.json'), JSON.stringify({
        'P73282-B21': [{ date: '2026-09-05', price: 5584, status: 'BASELINE' }],
        'P52341-B21': [{ date: '2026-09-05', price: 164, status: 'BASELINE' }]
      }));
      fs.writeFileSync(path.join(tempDir, 'attribute_history.json'), JSON.stringify([
        { date: '2026-09-05', productNumber: 'P73282-B21', field: 'Description' }
      ]));
      fs.writeFileSync(path.join(tempDir, 'discontinued_skus.json'), JSON.stringify({
        'P73282-B21': { productNumber: 'P73282-B21', status: 'ACTIVE' }
      }));
      t2.mock.method(console, 'log', () => {});
      t2.mock.method(console, 'warn', () => {});
      const current = {
        metadata: { scrapeDate: '2026-09-06', chassis: 'DL380a Gen12' },
        entries: [
          { parentCategory: 'Chassis', subCategory: 'Variants', skus: [
            { 'Product #': 'P76706-B21', Description: 'HPE DL380a Gen12 CTO Server', 'Unit Price (USD)': '0' }
          ] },
          { parentCategory: 'Accessories', subCategory: 'Rails', skus: [
            { 'Product #': 'P52341-B21', Description: 'HPE Easy Install Rail Kit', 'Unit Price (USD)': '164' }
          ] }
        ]
      };
      const result = processCatalogDiff(current, tempDir, 'catalog', {
        previousSkuFilter: ({ entry, sku }) => {
          const isChassis = String(entry.parentCategory || '').toLowerCase() === 'chassis' ||
            String(entry.subCategory || '').toLowerCase() === 'variants';
          return !isChassis || /DL380a Gen12/i.test(sku.Description || '');
        }
      });
      assert.equal(result.diffSummary.removed, 0);
      assert.ok(!result.enrichedCatalog.entries.some(entry => entry.skus.some(sku => sku['Product #'] === 'P73282-B21')));
      assert.ok(!JSON.parse(fs.readFileSync(path.join(tempDir, 'price_history.json'), 'utf8'))['P73282-B21']);
      const sharedAccessoryHistory = JSON.parse(fs.readFileSync(path.join(tempDir, 'price_history.json'), 'utf8'))['P52341-B21'];
      assert.ok(sharedAccessoryHistory,
        'shared accessory history must not be purged merely because its snapshot also contained another chassis');
      assert.equal(sharedAccessoryHistory.at(-1).status, 'UNCHANGED');
      assert.ok(!JSON.parse(fs.readFileSync(path.join(tempDir, 'discontinued_skus.json'), 'utf8'))['P73282-B21']);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
