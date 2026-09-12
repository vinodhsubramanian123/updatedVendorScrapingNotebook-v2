'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  reconcileProductCatalog,
  extractSkusFromCatalog,
  extractSkusFromDocument
} = require('../../scripts/catalogs/reconcile_quickspecs_oca.js');

// ── Test Fixtures ────────────────────────────────────────────────────────────
const TEMP_DIR = path.join(os.tmpdir(), `test_recon_${Date.now()}`);

function createTestCatalog(dir, skus) {
  const catalog = {
    metadata: { totalUniqueSKUs: skus.length },
    entries: [{
      parentCategory: 'Test Category',
      subCategory: 'Test Sub',
      skus: skus.map(sku => ({
        'Product #': sku.id,
        Description: sku.desc || `Description for ${sku.id}`,
        'Price (USD)': sku.price || 100
      }))
    }]
  };
  fs.writeFileSync(path.join(dir, 'Test_Catalog.json'), JSON.stringify(catalog, null, 2));
  return catalog;
}

function createTestQuickSpecs(dir, skuStrings) {
  // Simulate a text file containing SKU references
  const content = skuStrings.map(s => `Option: ${s} - Some Description`).join('\n');
  fs.writeFileSync(path.join(dir, 'Test_QuickSpecs.pdf'), content, 'latin1');
}

// ═══════════════════════════════════════════════════════════════════════════════
// extractSkusFromCatalog
// ═══════════════════════════════════════════════════════════════════════════════

test('QuickSpecsRecon — extractSkusFromCatalog extracts valid HPE SKUs', () => {
  const dir = path.join(TEMP_DIR, 'extract_cat');
  fs.mkdirSync(dir, { recursive: true });

  createTestCatalog(dir, [
    { id: 'P73299-B21', desc: 'CTO Chassis' },
    { id: 'P64707-B21', desc: 'Memory Kit' },
    { id: 'INVALID_TOKEN', desc: 'Should be skipped' }
  ]);

  const result = extractSkusFromCatalog(path.join(dir, 'Test_Catalog.json'));
  assert.ok(result instanceof Map, 'Should return a Map');
  assert.ok(result.has('P73299-B21'), 'Must include valid SKU P73299-B21');
  assert.ok(result.has('P64707-B21'), 'Must include valid SKU P64707-B21');
  assert.ok(!result.has('INVALID_TOKEN'), 'Must exclude invalid tokens');
});

test('QuickSpecsRecon — extractSkusFromCatalog returns empty Map for missing file', () => {
  const result = extractSkusFromCatalog('/nonexistent/path/catalog.json');
  assert.ok(result instanceof Map);
  assert.strictEqual(result.size, 0);
});

// ═══════════════════════════════════════════════════════════════════════════════
// extractSkusFromDocument
// ═══════════════════════════════════════════════════════════════════════════════

test('QuickSpecsRecon — extractSkusFromDocument extracts SKU patterns from text', () => {
  const dir = path.join(TEMP_DIR, 'extract_doc');
  fs.mkdirSync(dir, { recursive: true });

  createTestQuickSpecs(dir, ['P73299-B21', 'P64707-B21', 'P48835-B21']);

  const result = extractSkusFromDocument(path.join(dir, 'Test_QuickSpecs.pdf'));
  assert.ok(result instanceof Set, 'Should return a Set');
  assert.ok(result.has('P73299-B21'));
  assert.ok(result.has('P64707-B21'));
  assert.ok(result.has('P48835-B21'));
});

test('QuickSpecsRecon — extractSkusFromDocument returns empty Set for missing file', () => {
  const result = extractSkusFromDocument('/nonexistent/quickspecs.pdf');
  assert.ok(result instanceof Set);
  assert.strictEqual(result.size, 0);
});

// ═══════════════════════════════════════════════════════════════════════════════
// reconcileProductCatalog
// ═══════════════════════════════════════════════════════════════════════════════

test('QuickSpecsRecon — Full reconciliation identifies shared, OCA-exclusive, and QS-exclusive SKUs', () => {
  const dir = path.join(TEMP_DIR, 'full_recon');
  fs.mkdirSync(dir, { recursive: true });

  // Catalog has: A, B, C
  createTestCatalog(dir, [
    { id: 'P73299-B21', desc: 'CTO Chassis' },
    { id: 'P64707-B21', desc: 'Memory Kit' },
    { id: 'P48835-B21', desc: 'SAS Expander' }
  ]);

  // QuickSpecs has: A, B, D (D is exclusive to QuickSpecs)
  createTestQuickSpecs(dir, ['P73299-B21', 'P64707-B21', 'P48820-B21']);

  // Redirect atomic write to temp so we don't pollute real outputs
  const origOutputs = path.join(dir, 'history');
  fs.mkdirSync(origOutputs, { recursive: true });

  const report = reconcileProductCatalog(dir);

  assert.ok(report, 'Must return a report object');
  assert.strictEqual(report.metrics.totalCatalogSkus, 3);
  assert.strictEqual(report.metrics.sharedCount, 2, 'P73299-B21 and P64707-B21 are shared');
  assert.strictEqual(report.metrics.ocaExclusiveCount, 1, 'P48835-B21 is OCA-exclusive');
  assert.strictEqual(report.metrics.quickspecsExclusiveCount, 1, 'P48820-B21 is QS-exclusive');
  assert.ok(report.metrics.catalogQuickspecsParityPercent > 0);
});

test('QuickSpecsRecon — Reconciliation without QuickSpecs file produces zero QS-exclusive', () => {
  const dir = path.join(TEMP_DIR, 'no_qs');
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(dir, 'history'), { recursive: true });

  createTestCatalog(dir, [
    { id: 'P73299-B21', desc: 'CTO Chassis' },
    { id: 'P64707-B21', desc: 'Memory Kit' }
  ]);

  const report = reconcileProductCatalog(dir);
  assert.strictEqual(report.metrics.quickspecsExclusiveCount, 0);
  assert.strictEqual(report.metrics.totalQuickspecsSkus, 0);
});

test('QuickSpecsRecon — Throws when no catalog JSON found', () => {
  const dir = path.join(TEMP_DIR, 'no_cat');
  fs.mkdirSync(dir, { recursive: true });

  assert.throws(() => reconcileProductCatalog(dir), /No catalog JSON found/);
});

// ── Cleanup ──────────────────────────────────────────────────────────────────
test('QuickSpecsRecon — Cleanup temp directory', () => {
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  assert.ok(true, 'Temp directory cleaned');
});
