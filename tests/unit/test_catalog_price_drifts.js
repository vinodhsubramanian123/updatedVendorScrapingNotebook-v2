'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { classifyQueryIntent, executeRoutedQuery } = require('../../scripts/evaluators/route_query.js');
const { processCatalogDiff } = require('../../scripts/lib/catalog/diff_catalog.js');

function createCatalog(root, id, captures) {
  const catalogDir = path.join(root, id);
  const history = path.join(catalogDir, 'history');
  fs.mkdirSync(history, { recursive: true });
  const catalogJsonPath = path.join(catalogDir, `${id}_Catalog.json`);
  let scrapeDate;
  for (const [date, prices] of Object.entries(captures)) {
    scrapeDate = date;
    const data = JSON.stringify({ metadata: { scrapeDate }, entries: [
      { parentCategory: 'Memory', subCategory: 'Memory', skus: [
        { 'Product #': 'P69727-B21', 'Unit Price (USD)': prices[0], Description: '32 GB DDR5 DIMM' },
        { 'Product #': 'P69727-F21', 'Unit Price (USD)': prices[1], Description: '32 GB DDR5 FIO DIMM' }
      ] },
      { parentCategory: 'Processor', subCategory: 'Processor', skus: [
        { 'Product #': 'P71117-B21', 'Unit Price (USD)': prices[2], Description: 'Xeon processor' },
        { 'Product #': 'P71118-B21', 'Unit Price (USD)': prices[3], Description: 'Xeon processor' }
      ] },
      { parentCategory: 'Graphics & GPU', subCategory: 'GPU Accelerators', skus: [
        { 'Product #': 'S3U30C', 'Unit Price (USD)': prices[4], Description: 'GPU with 141GB onboard memory' }
      ] },
      { parentCategory: 'Graphics & GPU', subCategory: 'Graphics Accessories', skus: [
        { 'Product #': 'P74700-B21', 'Unit Price (USD)': prices[5], Description: 'GPU Cable kit' }
      ] }
    ] });
    fs.writeFileSync(path.join(history, `catalog_${date}.json`), data);
    fs.writeFileSync(catalogJsonPath, data);
  }
  return { id, catalogDir, catalogJsonPath, scrapeDate };
}

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-price-drifts-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const a = createCatalog(root, 'DL380_Gen12', {
    '2026-09-01': [100, 100, 2600, 2100, 15000, 150],
    '2026-09-05': [100, 100, 2600, 2100, 15000, 150],
    '2026-09-08': ['120.00', 100, null, 9, 15500, 200],
    '2026-09-10': [120, 120, 2600, 2100, 15500, 200],
    '2026-09-12': [100, 120, 2500, 2100, 15500, 200],
    '2026-09-14': [120, 120, 2500, 2100, 15500, 200]
  });
  const b = createCatalog(root, 'DL360_Gen12', {
    '2026-09-06': [100, 100, 2800, 2100, 15000, 150],
    '2026-09-09': [120, 100, 2700, 2100, 15500, 200]
  });
  return { a, b, context: { availableCatalogs: [a, b], chassisName: a.id, offline: true } };
}

test('portfolio price queries deduplicate overlapping exact-SKU transitions and keep independent moves', async t => {
  const { context } = fixture(t);
  const report = await executeRoutedQuery('List the last 3 price drifts of memory, CPU and GPU across catalogs', context);
  assert.equal(report.classification.intent, 'CATALOG_INTELLIGENCE');
  assert.equal(report.hitlRequired, false);
  assert.equal(report.result.status, 'SUCCESS');
  assert.equal(report.result.acceptanceGate.isValid, true);
  const [memory, cpu, gpu] = report.result.priceDrifts.groups;
  assert.equal(report.result.priceDrifts.coverage.snapshotsRead, 8);
  assert.equal(memory.totalChanges, 4);
  assert.deepEqual(memory.changes.map(row => [row.sku, row.changeUsd]), [
    ['P69727-B21', 20], ['P69727-B21', -20], ['P69727-F21', 20]
  ]);
  assert.deepEqual(cpu.changes.map(row => [row.previousPriceUsd, row.currentPriceUsd]), [[2600, 2500], [2800, 2700]]);
  assert.deepEqual(gpu.changes.map(row => [row.sku, row.sources.length, row.lastOldPriceDate]), [['S3U30C', 2, '2026-09-06']]);
  assert.match(gpu.changes[0].sources[0].currentSnapshotSha256, /^[a-f0-9]{64}$/);
  assert.equal(report.result.priceDrifts.coverage.excludedObservations, 1);
});

test('follow-up inherits product and component scope and asks when context is absent', async t => {
  const { context } = fixture(t);
  const first = await executeRoutedQuery('Any important GPU price changes on DL360 Gen12?', context);
  assert.deepEqual(first.result.priceDriftScope.catalogIds, ['DL360_Gen12']);
  const followup = 'last 3 price drifts of above';
  const result = await executeRoutedQuery(followup, { ...context, previousPriceDriftScope: first.result.priceDriftScope });
  assert.equal(result.result.priceDrifts.groups[0].category, 'GPU');
  assert.equal(result.result.priceDrifts.groups[0].totalChanges, 1);
  assert.equal(result.result.priceDrifts.coverage.catalogsScanned.length, 1);
  const noScope = await executeRoutedQuery(followup, context);
  assert.equal(noScope.result.code, 'PRICE_DRIFT_SCOPE_REQUIRED');
  assert.equal(noScope.hitlRequired, true);
  assert.equal(classifyQueryIntent('List price of P71117-B21').intent, 'CATALOG_INTELLIGENCE');
});

test('a contradictory history trail is disclosed and cannot manufacture a catalog price change', async t => {
  const { a, context } = fixture(t);
  const file = path.join(a.catalogDir, 'history', 'price_history.json');
  fs.writeFileSync(file, JSON.stringify({
    'P71117-B21': [{ date: '2026-09-10', price: 400, prevPrice: 2600, status: 'PRICE_CHANGED' }]
  }));
  const result = await executeRoutedQuery('Last three CPU price changes on DL380 Gen12', context);
  const { priceDrifts } = result.result;
  assert.equal(result.result.status, 'PARTIAL');
  assert.equal(priceDrifts.coverage.trailConflictCount, 1);
  assert.equal(priceDrifts.coverage.trailConflictExamples[0].snapshotPriceUsd, 2600);
  assert.deepEqual(priceDrifts.groups[0].changes.map(row => row.currentPriceUsd), [2500]);
});

test('a same-day capture correcting a false change also corrects the derived trail', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-price-rerun-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const { catalogDir, catalogJsonPath } = createCatalog(root, 'DL380_Gen12', {
    '2026-09-01': [100, 100, 2600, 2100, 15000, 150]
  });
  const payload = JSON.parse(fs.readFileSync(catalogJsonPath));
  const history = path.join(catalogDir, 'history');
  payload.metadata.scrapeDate = '2026-09-05';
  const dimm = payload.entries[0].skus[0];
  dimm['Unit Price (USD)'] = 220;
  dimm.Description = 'Provisional DIMM description';
  processCatalogDiff(structuredClone(payload), history);
  dimm['Unit Price (USD)'] = 150;
  dimm.Description = '32 GB DDR5 DIMM';
  processCatalogDiff(structuredClone(payload), history);
  const priceFile = path.join(history, 'price_history.json');
  assert.deepEqual(JSON.parse(fs.readFileSync(priceFile))['P69727-B21'].find(row => row.date === '2026-09-05'),
    { date: '2026-09-05', price: 150, status: 'PRICE_CHANGED', prevPrice: 100 });
  dimm['Unit Price (USD)'] = 100;
  processCatalogDiff(payload, history);
  const trail = JSON.parse(fs.readFileSync(priceFile));
  assert.deepEqual(trail['P69727-B21'].filter(row => row.date === '2026-09-05'), [
    { date: '2026-09-05', price: 100, status: 'UNCHANGED' }
  ]);
});

test('companion archives contribute dated service changes and are checked against their own trail', async t => {
  const { a, context } = fixture(t);
  const dir = path.join(a.catalogDir, 'services_history');
  fs.mkdirSync(dir);
  for (const [date, price] of [['2026-09-01', 900], ['2026-09-10', 1050]]) {
    fs.writeFileSync(path.join(dir, `services_catalog_${date}.json`), JSON.stringify({ entries: [{
      parentCategory: 'Support Services', subCategory: 'Tech Care',
      skus: [{ 'Product #': 'H7J34A3', 'List Price (USD)': price, Description: '3 year Tech Care' }]
    }] }));
  }
  const query = 'Last 3 support service price changes on DL380 Gen12';
  const first = await executeRoutedQuery(query, context);
  const details = first.result.priceDrifts.groups.find(group => group.category === 'Support & Services');
  assert.deepEqual(details.changes.map(change => [change.sku, change.changeUsd]), [['H7J34A3', 150]]);
  assert.match(details.changes[0].sources[0].previousSnapshot, /services_history/);

  fs.writeFileSync(path.join(dir, 'services_price_history.json'), JSON.stringify({
    H7J34A3: [{ date: '2026-09-10', price: 1400, prevPrice: 900, status: 'PRICE_CHANGED' }]
  }));
  const report = await executeRoutedQuery(query, context);
  assert.equal(report.result.status, 'PARTIAL');
  assert.equal(report.result.priceDrifts.coverage.trailConflictCount, 1);
});

test('same-day conflicting companion and hardware prices never create a drift event', async t => {
  const { a, context } = fixture(t);
  const dir = path.join(a.catalogDir, 'services_history');
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'services_catalog_2026-09-14.json'), JSON.stringify({ entries: [{
    parentCategory: 'Memory', subCategory: 'Memory',
    skus: [{ 'Product #': 'P69727-B21', 'List Price (USD)': 125, Description: '32 GB DDR5 DIMM' }]
  }] }));
  const report = await executeRoutedQuery('Last 3 memory price changes on DL380 Gen12', context);
  assert.equal(report.result.status, 'PARTIAL');
  assert.ok(report.result.priceDrifts.coverage.issues.some(issue => issue.code === 'CONFLICTING_SAME_DAY_PRICES'));
  const changes = report.result.priceDrifts.groups[0].changes;
  assert.ok(changes.every(change => change.firstNewPriceDate > change.lastOldPriceDate));
  assert.ok(changes.every(change => change.firstNewPriceDate !== '2026-09-14'));
});
