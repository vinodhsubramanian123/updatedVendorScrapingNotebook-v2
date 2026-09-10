'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

const {
  processCatalogDiff,
  sanitizePriceTrail,
  parsePrice,
  appendTrailEvent
} = require('../../scripts/lib/catalog/diff_catalog.js');

const {
  getHistoricalSkuPrice,
  getHistoricalBoqPricing,
  _clearCatalogPriceCache
} = require('../../scripts/lib/catalog/sku_versioning.js');

test('Phase 2: Price and Lifecycle Integrity Suite', async (t) => {
  t.beforeEach(() => {
    _clearCatalogPriceCache();
  });

  await t.test('1. Genuine price spike vs isolated anomaly retention (non-destructive)', () => {
    // Legitimate step-up price change: 100 -> 1200 -> 1200 (stays elevated)
    const legitStepUp = [
      { date: '2026-08-01', price: 100, status: 'BASELINE' },
      { date: '2026-08-15', price: 1200, status: 'PRICE_CHANGED' },
      { date: '2026-09-01', price: 1200, status: 'UNCHANGED' }
    ];
    const legitResult = sanitizePriceTrail(legitStepUp);
    assert.strictEqual(legitResult.length, 3);
    assert.strictEqual(legitResult[1].quarantined, undefined);
    assert.strictEqual(legitResult[1].validationState, 'VALIDATED');
    assert.strictEqual(legitResult[1].price, 1200);

    // Isolated anomaly: 100 -> 1500 -> 105 (neighbors agree, spike is isolated)
    const isolatedSpike = [
      { date: '2026-08-01', price: 100, status: 'BASELINE' },
      { date: '2026-08-15', price: 1500, status: 'PRICE_CHANGED' },
      { date: '2026-09-01', price: 105, status: 'PRICE_CHANGED' }
    ];
    const spikeResult = sanitizePriceTrail(isolatedSpike);
    // MUST NOT DELETE evidence
    assert.strictEqual(spikeResult.length, 3, 'All 3 events must be preserved in history');
    assert.strictEqual(spikeResult[1].date, '2026-08-15');
    assert.strictEqual(spikeResult[1].price, 1500, 'Original observed price must be preserved');
    assert.strictEqual(spikeResult[1].quarantined, true, 'Isolated spike must be quarantined');
    assert.strictEqual(spikeResult[1].validationState, 'ANOMALOUS_PRICE_SPIKE');
    assert.strictEqual(spikeResult[1].effectivePrice, 100, 'Effective price fallback must be recorded');
    assert.ok(spikeResult[1].anomalyProvenance, 'Provenance must describe why it was quarantined');
  });

  await t.test('2. Date parsed as price integer is quarantined with provenance', () => {
    // E.g. date 30/06/2023 parsed as 3062023 or 20260812
    const trailWithDatePrice = [
      { date: '2026-08-01', price: 250, status: 'BASELINE' },
      { date: '2026-08-15', price: 3062023, status: 'PRICE_CHANGED' },
      { date: '2026-09-01', price: 250, status: 'UNCHANGED' }
    ];
    const result = sanitizePriceTrail(trailWithDatePrice);
    assert.strictEqual(result.length, 3, 'Evidence must be preserved');
    assert.strictEqual(result[1].quarantined, true);
    assert.strictEqual(result[1].validationState, 'SUSPECTED_DATE_PARSE');
    assert.strictEqual(result[1].price, 3062023);
    assert.strictEqual(result[1].effectivePrice, 250);
    assert.ok(result[1].anomalyProvenance.suspectedReason.includes('Date parsed'));
  });

  await t.test('3. Zero-price physical hardware vs confirmed free trigger', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'price_confidence_test_'));
    try {
      const historyDir = path.join(tempDir, 'history');
      fs.mkdirSync(historyDir);

      // Hardware with $0 portal price (e.g. DL380a adapter unbundled zero)
      fs.writeFileSync(path.join(historyDir, 'price_history.json'), JSON.stringify({
        'P76706-B21': [{ date: '2026-09-01', price: 0, status: 'BASELINE' }],
        'P35876-B21': [{ date: '2026-09-01', price: 0, status: 'BASELINE' }]
      }));
      fs.writeFileSync(path.join(historyDir, 'discontinued_skus.json'), JSON.stringify({}));

      // Physical GPU / adapter with $0: UNRESOLVED
      const unpricedHw = getHistoricalSkuPrice('P76706-B21', '2026-09-01', tempDir);
      assert.strictEqual(unpricedHw.priceUsd, 0);
      assert.strictEqual(unpricedHw.pricingCategory, 'UNRESOLVED_ZERO_PRICE');
      assert.strictEqual(unpricedHw.quoteConfidence, 'UNRESOLVED');
      assert.strictEqual(unpricedHw.isResolved, false);
      assert.strictEqual(unpricedHw.currency, 'USD');

      // Confirmed free FIO enablement kit (P35876-B21 CE mark removal)
      const freeKit = getHistoricalSkuPrice('P35876-B21', '2026-09-01', tempDir);
      assert.strictEqual(freeKit.priceUsd, 0);
      assert.strictEqual(freeKit.pricingCategory, 'CONFIRMED_ZERO_PRICE_TRIGGER');
      assert.strictEqual(freeKit.quoteConfidence, 'HIGH');
      assert.strictEqual(freeKit.isResolved, true);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  await t.test('4. Hardware <-> Service companion reconciliation prevents false discontinuation', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'companion_recon_test_'));
    try {
      // Previous snapshot: P12345-B21 was in Hardware catalog
      fs.writeFileSync(path.join(tempDir, 'catalog_2026-08-01.json'), JSON.stringify({
        metadata: { scrapeDate: '2026-08-01' },
        entries: [
          {
            parentCategory: 'Accessories',
            subCategory: 'Enablement',
            skus: [{ 'Product #': 'P12345-B21', 'Unit Price (USD)': '150', Description: 'HPE Enablement Service/Kit' }]
          }
        ]
      }));

      fs.writeFileSync(path.join(tempDir, 'price_history.json'), JSON.stringify({
        'P12345-B21': [{ date: '2026-08-01', price: 150, status: 'BASELINE' }]
      }));
      fs.writeFileSync(path.join(tempDir, 'attribute_history.json'), JSON.stringify([]));
      fs.writeFileSync(path.join(tempDir, 'discontinued_skus.json'), JSON.stringify({}));

      // Current run: P12345-B21 is NOT in Hardware entries, but IS in companion Services catalog
      const currentHardware = {
        metadata: { scrapeDate: '2026-08-15', chassis: 'DL380 Gen12' },
        entries: [
          { parentCategory: 'Accessories', subCategory: 'General', skus: [] }
        ]
      };

      const companionServices = {
        metadata: { scrapeDate: '2026-08-15' },
        entries: [
          {
            parentCategory: 'Services & Support',
            subCategory: 'Installation',
            skus: [{ 'Product #': 'P12345-B21', 'Unit Price (USD)': '150', Description: 'HPE Enablement Service/Kit' }]
          }
        ]
      };

      const result = processCatalogDiff(currentHardware, tempDir, 'catalog', {
        companionCatalog: companionServices
      });

      // Verification:
      assert.strictEqual(result.diffSummary.removed, 0, 'SKU must NOT be marked as removed');
      assert.strictEqual(result.diffSummary.categoryMigrated, 1, 'SKU must be recorded as categoryMigrated');

      const discReg = JSON.parse(fs.readFileSync(path.join(tempDir, 'discontinued_skus.json'), 'utf8'));
      assert.ok(!discReg['P12345-B21'], 'Migrated SKU must NOT enter discontinued registry');

      const history = JSON.parse(fs.readFileSync(path.join(tempDir, 'price_history.json'), 'utf8'))['P12345-B21'];
      assert.strictEqual(history.at(-1).status, 'CATEGORY_MIGRATED');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  await t.test('5. Differentiated removal reasons: VENDOR_OBSOLETE, SCHEDULED_END_DATE, ABSENT_FROM_CATALOG', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'removal_reasons_test_'));
    try {
      fs.writeFileSync(path.join(tempDir, 'catalog_2026-08-01.json'), JSON.stringify({
        metadata: { scrapeDate: '2026-08-01' },
        entries: [
          {
            parentCategory: 'Processors',
            subCategory: 'Intel',
            skus: [
              { 'Product #': 'SKU-OBSOLETE', 'Unit Price (USD)': '2000', lifecycleStatus: 'Obsolete (OB)' },
              { 'Product #': 'SKU-SCHEDULED', 'Unit Price (USD)': '1500', 'Discontinued Date': '2026-08-10' },
              { 'Product #': 'SKU-DROPPED', 'Unit Price (USD)': '800' }
            ]
          }
        ]
      }));

      fs.writeFileSync(path.join(tempDir, 'price_history.json'), JSON.stringify({
        'SKU-OBSOLETE': [{ date: '2026-08-01', price: 2000, status: 'BASELINE' }],
        'SKU-SCHEDULED': [{ date: '2026-08-01', price: 1500, status: 'BASELINE' }],
        'SKU-DROPPED': [{ date: '2026-08-01', price: 800, status: 'BASELINE' }]
      }));
      fs.writeFileSync(path.join(tempDir, 'attribute_history.json'), JSON.stringify([]));
      fs.writeFileSync(path.join(tempDir, 'discontinued_skus.json'), JSON.stringify({}));

      // Current catalog: none of them are present
      const current = {
        metadata: { scrapeDate: '2026-08-15', chassis: 'DL380 Gen12' },
        entries: [{ parentCategory: 'Processors', subCategory: 'Intel', skus: [] }]
      };

      processCatalogDiff(current, tempDir, 'catalog');

      const discReg = JSON.parse(fs.readFileSync(path.join(tempDir, 'discontinued_skus.json'), 'utf8'));
      assert.strictEqual(discReg['SKU-OBSOLETE'].removalReason, 'VENDOR_OBSOLETE');
      assert.strictEqual(discReg['SKU-SCHEDULED'].removalReason, 'SCHEDULED_END_DATE');
      assert.strictEqual(discReg['SKU-DROPPED'].removalReason, 'ABSENT_FROM_CATALOG');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  await t.test('6. BOQ evaluation flags incomplete pricing when unresolved SKU is present', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'boq_pricing_flag_test_'));
    try {
      const historyDir = path.join(tempDir, 'history');
      fs.mkdirSync(historyDir);

      fs.writeFileSync(path.join(historyDir, 'price_history.json'), JSON.stringify({
        'SKU-PRICED': [{ date: '2026-09-01', price: 500, status: 'BASELINE' }],
        'SKU-UNRESOLVED': [{ date: '2026-09-01', price: 0, status: 'BASELINE' }]
      }));
      fs.writeFileSync(path.join(historyDir, 'discontinued_skus.json'), JSON.stringify({}));

      const boqItems = [
        { sku: 'SKU-PRICED', quantity: 2 },
        { sku: 'SKU-UNRESOLVED', quantity: 1 }
      ];

      const boqResult = getHistoricalBoqPricing(boqItems, '2026-09-01', tempDir);
      assert.strictEqual(boqResult.isPricingComplete, false, 'Pricing must NOT be marked complete');
      assert.strictEqual(boqResult.unresolvedCount, 1);
      assert.deepEqual(boqResult.unresolvedSkus, ['SKU-UNRESOLVED']);
      assert.ok(boqResult.totalCapExFormatted.includes('INCOMPLETE'), 'Formatted total must flag INCOMPLETE');
      assert.strictEqual(boqResult.totalCapExUsd, 1000);
      assert.strictEqual(boqResult.currency, 'USD');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  await t.test('7. Reinstated SKU recovers active status without duplicate removal events', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reinstated_test_'));
    try {
      // Step 1: Base scrape
      fs.writeFileSync(path.join(tempDir, 'catalog_2026-08-01.json'), JSON.stringify({
        metadata: { scrapeDate: '2026-08-01' },
        entries: [{ parentCategory: 'Storage', subCategory: 'Drives', skus: [{ 'Product #': 'SKU-REIN', 'Unit Price (USD)': '300' }] }]
      }));
      fs.writeFileSync(path.join(tempDir, 'price_history.json'), JSON.stringify({
        'SKU-REIN': [{ date: '2026-08-01', price: 300, status: 'BASELINE' }]
      }));
      fs.writeFileSync(path.join(tempDir, 'attribute_history.json'), JSON.stringify([]));
      fs.writeFileSync(path.join(tempDir, 'discontinued_skus.json'), JSON.stringify({}));

      // Step 2: Removed on 2026-08-05
      processCatalogDiff({
        metadata: { scrapeDate: '2026-08-05' },
        entries: [{ parentCategory: 'Storage', subCategory: 'Drives', skus: [] }]
      }, tempDir, 'catalog');

      let disc = JSON.parse(fs.readFileSync(path.join(tempDir, 'discontinued_skus.json'), 'utf8'));
      assert.strictEqual(disc['SKU-REIN'].status, 'DISCONTINUED');

      // Step 3: Reinstated on 2026-08-10
      processCatalogDiff({
        metadata: { scrapeDate: '2026-08-10' },
        entries: [{ parentCategory: 'Storage', subCategory: 'Drives', skus: [{ 'Product #': 'SKU-REIN', 'Unit Price (USD)': '320' }] }]
      }, tempDir, 'catalog');

      disc = JSON.parse(fs.readFileSync(path.join(tempDir, 'discontinued_skus.json'), 'utf8'));
      assert.strictEqual(disc['SKU-REIN'].status, 'REINSTATED');
      assert.strictEqual(disc['SKU-REIN'].reinstatedDate, '2026-08-10');

      const history = JSON.parse(fs.readFileSync(path.join(tempDir, 'price_history.json'), 'utf8'))['SKU-REIN'];
      const removedCount = history.filter(e => e.status === 'REMOVED').length;
      assert.strictEqual(removedCount, 1, 'Must have exactly one removal event');
      const reinstatedCount = history.filter(e => e.status === 'REINSTATED').length;
      assert.strictEqual(reinstatedCount, 1, 'Must have exactly one reinstated event');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
