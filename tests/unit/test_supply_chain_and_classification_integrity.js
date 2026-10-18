'use strict';
/**
 * tests/unit/test_supply_chain_and_classification_integrity.js
 *
 * Validates:
 * 1. CLIC Status vs Lifecycle Status decoupling (no blind mirroring).
 * 2. Cost vs List Price field separation (no collision or overwrite).
 * 3. Supply chain lead time honesty: unpublished lead times are NEVER defaulted to 'Standard Delivery (14-30d)'.
 * 4. 33-column lossless schema coverage in generateMainSheet.
 * 5. Extract functions in sku_resolver.js for cost and lead time.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const { generateMainSheet } = require('../../scripts/lib/catalog/catalog_formatter.js');
const { extractCatalogItemPrice, extractCatalogItemCost, extractCatalogItemLeadTime } = require('../../scripts/lib/taxonomy/sku_resolver.js');

describe('Supply Chain & Classification Integrity Suite', () => {
  it('1. generateMainSheet produces exact 33-column schema with dedicated Cost, CLIC Status, and Lead Time metrics', () => {
    const mockEntries = [
      {
        parentCategory: 'Processor',
        subCategory: 'Intel Xeon 6',
        minQty: 1,
        maxQty: 2,
        constraint: 'min 1, max 2',
        rules: ['Requires matching processor stepping in dual-socket configurations'],
        skus: [
          {
            'Product #': 'P71117-B21',
            Description: 'Intel Xeon 6710E 2.4GHz 64-core 205W Processor for HPE',
            'Current Qty': '1',
            'Option Type': 'Option',
            'Unit Price (USD)': '6096.00',
            'List Price (USD)': '6096.00',
            'Cost (USD)': '4250.00',
            'Price Delta (USD)': '+1854.00',
            'Extended Price (USD)': '12192.00',
            'Price per GB (USD)': '',
            'HPE Recommended': 'Yes',
            Availability: 'Available in OCA product catalog',
            'Lead Time': '10-14 days',
            'Lead Time Days': '12',
            'Speed Tier': 'Standard Delivery (8-30d)',
            'Lead Time Source': 'OCA row attribute',
            'CLIC Status': 'Valid',
            'Lifecycle Status': 'Active',
            'Start Date': '11/04/2024',
            'Discontinued Date': '06/30/2029',
            'Vendor Attributes (JSON)': '{}',
            'Diff Status': 'UNCHANGED',
            'Previous List Price (USD)': 'N/A',
            'Price Change (USD)': '$0.00',
            'Price Change (%)': '0.00%',
            'Price History Trail': ''
          }
        ]
      }
    ];

    const tsv = generateMainSheet(mockEntries, 'DL380 Gen12');
    const lines = tsv.split(/\r?\n/).filter(line => line.length > 0);
    assert.equal(lines.length, 2, 'Should have header row + 1 data row');

    const headers = lines[0].split('\t');
    assert.equal(headers.length, 33, 'TSV header must contain exactly 33 columns');

    // Verify key separated headers exist
    assert.ok(headers.includes('Unit Price (USD)'), 'Must include Unit Price (USD)');
    assert.ok(headers.includes('Cost (USD)'), 'Must include Cost (USD)');
    assert.ok(headers.includes('CLIC Status'), 'Must include CLIC Status');
    assert.ok(headers.includes('Lifecycle Status'), 'Must include Lifecycle Status');
    assert.ok(headers.includes('Lead Time'), 'Must include Lead Time');
    assert.ok(headers.includes('Lead Time Days'), 'Must include Lead Time Days');
    assert.ok(headers.includes('Speed Tier'), 'Must include Speed Tier');

    const rowCells = lines[1].split('\t');
    assert.equal(rowCells.length, 33, 'Data row must contain exactly 33 values');

    const priceIdx = headers.indexOf('Unit Price (USD)');
    const costIdx = headers.indexOf('Cost (USD)');
    const clicIdx = headers.indexOf('CLIC Status');
    const lifeIdx = headers.indexOf('Lifecycle Status');
    const ltIdx = headers.indexOf('Lead Time');
    const speedIdx = headers.indexOf('Speed Tier');

    assert.equal(rowCells[priceIdx], '6096.00', 'List Price should be 6096.00');
    assert.equal(rowCells[costIdx], '4250.00', 'Cost should be 4250.00 (not overwritten by price)');
    assert.equal(rowCells[clicIdx], 'Valid', 'CLIC Status should be Valid');
    assert.equal(rowCells[lifeIdx], 'Active', 'Lifecycle Status should be Active');
    assert.equal(rowCells[ltIdx], '10-14 days', 'Lead time preserved');
    assert.equal(rowCells[speedIdx], 'Standard Delivery (8-30d)', 'Speed tier preserved');
  });

  it('2. Missing lead times evaluate strictly to "Unpublished" and never default to "Standard Delivery (14-30d)"', () => {
    const mockEntriesWithoutLt = [
      {
        parentCategory: 'Memory',
        subCategory: 'DDR5 Registered DIMMs',
        minQty: 0,
        maxQty: 32,
        constraint: 'max 32',
        rules: [],
        skus: [
          {
            'Product #': 'P69726-B21',
            Description: 'HPE 16GB (1x16GB) Single Rank x8 DDR5-6400 CAS-52-52-52 EC8 Registered Smart Memory Kit',
            'Current Qty': '0',
            'Option Type': 'Option',
            'Unit Price (USD)': '7439.00',
            'Cost (USD)': '',
            'CLIC Status': 'Unpublished',
            'Lifecycle Status': 'Active',
            'Lead Time': '', // Empty lead time!
            'Vendor Attributes (JSON)': '{"Price per GB (USD)": "464.94"}'
          }
        ]
      }
    ];

    const tsv = generateMainSheet(mockEntriesWithoutLt, 'DL380 Gen12');
    const lines = tsv.split(/\r?\n/).filter(line => line.length > 0);
    const headers = lines[0].split('\t');
    const rowCells = lines[1].split('\t');

    const ltIdx = headers.indexOf('Lead Time');
    const speedIdx = headers.indexOf('Speed Tier');
    const clicIdx = headers.indexOf('CLIC Status');

    assert.equal(rowCells[ltIdx], 'Unpublished', 'Missing lead time must output "Unpublished"');
    assert.equal(rowCells[speedIdx], 'Unpublished', 'Missing lead time speed tier must output "Unpublished"');
    assert.equal(rowCells[clicIdx], 'Unpublished', 'Missing CLIC status must output "Unpublished"');
    assert.notEqual(rowCells[speedIdx], 'Standard Delivery (14-30d)', 'Must NEVER default to Standard Delivery (14-30d)');
  });

  it('3. extractCatalogItemCost cleanly parses numeric cost and handles null/empty', () => {
    assert.deepEqual(extractCatalogItemCost({ 'Cost (USD)': '1250.50' }), { cost: 1250.50, hasCost: true });
    assert.deepEqual(extractCatalogItemCost({ costPrice: 990 }), { cost: 990, hasCost: true });
    assert.deepEqual(extractCatalogItemCost({ 'Cost (USD)': '$2,450.00' }), { cost: 2450.00, hasCost: true });
    assert.deepEqual(extractCatalogItemCost({ 'Cost (USD)': '' }), { cost: null, hasCost: false });
    assert.deepEqual(extractCatalogItemCost({}), { cost: null, hasCost: false });
    assert.deepEqual(extractCatalogItemCost(null), { cost: null, hasCost: false });
  });

  it('4. extractCatalogItemLeadTime preserves day calculations without ungrounded defaults', () => {
    // Explicit range
    const rangeRes = extractCatalogItemLeadTime({ 'Lead Time': '18 - 23 days' });
    assert.equal(rangeRes.raw, '18 - 23 days');
    assert.equal(rangeRes.days, 21);
    assert.equal(rangeRes.speedTier, 'Standard Delivery (8-30d)');
    assert.equal(rangeRes.isPublished, true);

    // Fast-ship
    const fastRes = extractCatalogItemLeadTime({ 'Lead Time': '3-5 days' });
    assert.equal(fastRes.days, 4);
    assert.equal(fastRes.speedTier, 'Fast-Ship Certified (<=7d)');
    assert.equal(fastRes.isPublished, true);

    // Long lead time
    const longRes = extractCatalogItemLeadTime({ 'Lead Time': '60 days' });
    assert.equal(longRes.days, 60);
    assert.equal(longRes.speedTier, 'Constrained / Long Lead Time (>45d)');
    assert.equal(longRes.isPublished, true);

    // Empty / Unpublished
    const unpubRes = extractCatalogItemLeadTime({ 'Lead Time': '' });
    assert.equal(unpubRes.raw, 'Unpublished');
    assert.equal(unpubRes.days, null);
    assert.equal(unpubRes.speedTier, 'Unpublished');
    assert.equal(unpubRes.isPublished, false);

    const standardPlaceholderRes = extractCatalogItemLeadTime({ 'Lead Time': 'Standard' });
    assert.equal(standardPlaceholderRes.days, null);
    assert.equal(standardPlaceholderRes.speedTier, 'Unpublished');
    assert.equal(standardPlaceholderRes.isPublished, false);
  });
});
