'use strict';

const test = require('node:test');
const assert = require('node:assert');
const {
  normalizeCatalogMetadata,
  auditCatalogFreshness,
  verifyTabularIntegrity
} = require('../../scripts/lib/catalog/catalog_freshness_guard.js');

test('CatalogFreshnessGuard — Normalizes heterogeneous metadata schemas cleanly', () => {
  const metaA = {
    family: 'ProLiant',
    gen: 'Gen12',
    chassis: 'DL380 Gen12',
    scrapeDate: '2026-09-13',
    totalUniqueSKUs: '605'
  };

  const normA = normalizeCatalogMetadata(metaA);
  assert.strictEqual(normA.generation, 'Gen12');
  assert.strictEqual(normA.gen, 'Gen12');
  assert.strictEqual(normA.family, 'ProLiant');
  assert.strictEqual(normA.scrapeDate, '2026-09-13');
  assert.strictEqual(normA.totalUniqueSKUs, 605);

  const metaB = {
    family: 'Alletra',
    generation: 'Storage',
    model: 'Alletra 9000',
    scrapeTimestamp: '2026-09-10T14:30:00.000Z'
  };

  const normB = normalizeCatalogMetadata(metaB);
  assert.strictEqual(normB.generation, 'Storage');
  assert.strictEqual(normB.scrapeDate, '2026-09-10');
});

test('CatalogFreshnessGuard — Evaluates catalog staleness against reference date', () => {
  const refDate = new Date('2026-09-19T12:00:00Z');

  // Fresh scrape (6 days old)
  const freshCatalog = {
    metadata: { chassis: 'DL380_Gen12', scrapeDate: '2026-09-13' }
  };
  const freshRes = auditCatalogFreshness(freshCatalog, { referenceDate: refDate });
  assert.strictEqual(freshRes.freshnessStatus, 'FRESH');
  assert.strictEqual(freshRes.isFresh, true);
  assert.strictEqual(freshRes.isStale, false);

  // Stale scrape (40 days old)
  const staleCatalog = {
    metadata: { chassis: 'GX5000', scrapeDate: '2026-08-10' }
  };
  const staleRes = auditCatalogFreshness(staleCatalog, { referenceDate: refDate });
  assert.strictEqual(staleRes.freshnessStatus, 'STALE_WARNING');
  assert.strictEqual(staleRes.isStale, true);
  assert.ok(staleRes.advisories.length > 0);

  // Outdated scrape (110 days old)
  const outdatedCatalog = {
    metadata: { chassis: 'Legacy_Frame', scrapeDate: '2026-06-01' }
  };
  const outdatedRes = auditCatalogFreshness(outdatedCatalog, { referenceDate: refDate });
  assert.strictEqual(outdatedRes.freshnessStatus, 'CRITICAL_OUTDATED');
  assert.strictEqual(outdatedRes.isCriticalOutdated, true);
});

test('CatalogFreshnessGuard — Verifies tabular integrity and catches corruptions', () => {
  const cleanCatalog = {
    entries: [
      {
        parentCategory: 'Processor',
        subCategory: 'Intel Xeon Scalable',
        headers: ['Product #', 'Description', 'listPrice'],
        skus: [
          { sku: 'P73299-B21', Description: 'Intel Xeon Gold 6548Y Processor', listPrice: 3850 }
        ]
      }
    ]
  };

  const cleanCheck = verifyTabularIntegrity(cleanCatalog);
  assert.strictEqual(cleanCheck.isValid, true);
  assert.strictEqual(cleanCheck.totalSkus, 1);
  assert.strictEqual(cleanCheck.priceAnomaliesCount, 0);

  const corruptedCatalog = {
    entries: [
      {
        parentCategory: 'Processor',
        subCategory: 'Intel Xeon Scalable',
        headers: ['Product #', 'Description', 'listPrice'],
        skus: [
          { sku: 'CORRUPT-1', Description: 'Intel Xeon Platinum Processor', listPrice: -50 },
          { sku: 'CORRUPT-2', Description: 'HPE ProLiant DL380 Gen12 CTO Server', listPrice: 1.00 }
        ]
      },
      {
        parentCategory: 'EmptyCategory',
        subCategory: 'No SKUs',
        headers: ['Product #'],
        skus: []
      }
    ]
  };

  const corruptCheck = verifyTabularIntegrity(corruptedCatalog);
  assert.strictEqual(corruptCheck.isValid, false);
  assert.strictEqual(corruptCheck.emptyTablesCount, 1);
  assert.ok(corruptCheck.errors.some(e => e.includes('Invalid price')));
  assert.ok(corruptCheck.warnings.some(w => w.includes('Suspicious price anomaly')));
});

test('CatalogFreshnessGuard — F14: Correctly handles numeric epoch timestamp and rejects future dates', () => {
  // Numeric epoch ms
  const epochMs = 1726185600000; // 2024-09-13
  const meta = { scrapeTimestamp: epochMs };
  const norm = normalizeCatalogMetadata(meta);
  assert.ok(norm.scrapeDate);
  assert.strictEqual(norm.scrapeDate.startsWith('2024-09-'), true);

  // Future date
  const futureCatalog = {
    metadata: { chassis: 'DL380_Gen12', scrapeDate: '2099-01-01' }
  };
  const futureAudit = auditCatalogFreshness(futureCatalog, { referenceDate: new Date('2026-09-19T00:00:00Z') });
  assert.strictEqual(futureAudit.freshnessStatus, 'INVALID_FUTURE_DATE');
  assert.strictEqual(futureAudit.isFresh, false);
  assert.ok(futureAudit.advisories.some(a => a.includes('in the future')));
});

test('CatalogFreshnessGuard — F14: Tabular integrity rejects all-empty tables and corrupted SKU format', () => {
  // All empty tables
  const allEmptyCatalog = {
    entries: [
      { parentCategory: 'Processor', headers: ['Product #'], skus: [] },
      { parentCategory: 'Memory', headers: ['Product #'], skus: [] }
    ]
  };
  const emptyCheck = verifyTabularIntegrity(allEmptyCatalog);
  assert.strictEqual(emptyCheck.isValid, false);
  assert.ok(emptyCheck.errors.some(e => e.includes('0 total SKUs')));

  // Corrupted SKU format (HTML injection or unprintable)
  const badSkuCatalog = {
    entries: [
      {
        parentCategory: 'Processor',
        headers: ['Product #', 'listPrice'],
        skus: [
          { sku: '<script>alert(1)</script>', listPrice: 1000 }
        ]
      }
    ]
  };
  const badSkuCheck = verifyTabularIntegrity(badSkuCatalog);
  assert.strictEqual(badSkuCheck.isValid, false);
  assert.ok(badSkuCheck.errors.some(e => e.includes('Corrupted SKU identifier')));
});
