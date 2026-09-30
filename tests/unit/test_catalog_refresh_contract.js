'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const xlsx = require('xlsx-js-style');
const { safeWriteJsonAtomic } = require('../../scripts/lib/system/fs_compat.js');
const { isCatalogFresh, auditCatalogFreshness } = require('../../scripts/lib/catalog/catalog_freshness_guard.js');
const { computeSkuHash, computeIncrementalDifferential } = require('../../scripts/lib/catalog/checksum_diff.js');
const { buildRefreshPlan } = require('../../scripts/lib/catalog/catalog_refresh_plan.js');
const { buildKnowledgeWorkbookDatasets, replaceGoogleSheetWorkbook } = require('../../scripts/lib/sync/google_sheets_writer.js');
const { acquireWorkflowLease } = require('../../scripts/lib/system/workflow_lease.js');
const { createCaptureReceipt } = require('../../scripts/lib/catalog/catalog_capture_receipt.js');
function temp(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-refresh-contract-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}
function json(file, value) { safeWriteJsonAtomic(file, value, { rejectInvalid: false }); }
test('freshness derives from capture evidence, not recent file mtime', t => {
  const dir = temp(t);
  const file = path.join(dir, `${path.basename(dir)}_Catalog.json`);
  json(file, { metadata: { scrapeTimestamp: new Date(Date.now() - 100 * 3600000).toISOString() } });
  assert.equal(isCatalogFresh(dir), false);
  json(file, { metadata: { scrapeTimestamp: new Date(Date.now() - 1000).toISOString() } });
  assert.equal(isCatalogFresh(dir), true);
  json(file, { metadata: { scrapeTimestamp: new Date(Date.now() + 1000).toISOString() } });
  assert.equal(isCatalogFresh(dir), false);
  json(file, { metadata: {} });
  assert.equal(isCatalogFresh(dir), false);
  assert.equal(isCatalogFresh(path.join(dir, 'missing')), false);
});
test('72h boundary is exact and future capture dates are invalid', () => {
  const ref = '2026-09-30T12:00:01Z';
  assert.equal(auditCatalogFreshness({ metadata: { scrapeTimestamp: '2026-09-27T12:00:00Z' } },
    { referenceDate: ref, staleWarningDays: 3 }).freshnessStatus, 'STALE_WARNING');
  assert.equal(auditCatalogFreshness({ metadata: { scrapeTimestamp: '2026-09-30T12:00:02Z' } },
    { referenceDate: ref }).freshnessStatus, 'INVALID_FUTURE_DATE');
});
test('first capture counts new SKUs and hashes zero prices and gate changes', () => {
  const original = { sku: 'P12345-B21', price: 0, thresholdValue: 27, 'Lifecycle Status': 'Active' };
  for (const changed of [{ price: 1 }, { thresholdValue: 25 }, { 'Lifecycle Status': 'Obsolete' }]) {
    assert.notEqual(computeSkuHash(original), computeSkuHash({ ...original, ...changed }));
  }
  const diff = computeIncrementalDifferential([{ skus: [original, original] }], null);
  assert.equal(diff.isIncremental, false);
  assert.equal(diff.stats.addedSkusCount, 1);
  assert.equal(diff.stats.totalScrapedSkus, 1);
  assert.equal(diff.stats.estimatedTokensSaved, 0);
});
test('all workbook sheets and multiple product rows deduplicate into one refresh per product', t => {
  const dir = temp(t);
  const wb = xlsx.utils.book_new();
  for (const [name, rows] of [['Servers', [['HPE DL380 Gen12'], ['HPE DL380a Gen12']]], ['More Servers', [['HPE DL380 Gen12']]]]) {
    xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(rows), name);
  }
  const filePath = path.join(dir, 'boq.xlsx'); xlsx.writeFile(wb, filePath);
  const definitions = [{ product: 'DL380_Gen12', vendor: 'HPE' }, { product: 'DL380a_Gen12', vendor: 'HPE' }];
  const metadata = () => ({ exists: true, needsResync: true });
  const plan = buildRefreshPlan({ filePath, definitions, metadata });
  assert.equal(plan.ready, true);
  assert.equal(plan.sheets.length, 2);
  assert.equal(plan.tasks.length, 2);
  assert.equal(plan.tasks[0].origins.length, 2);
  assert.equal(buildRefreshPlan({ products: ['DL380_Gen13'], definitions, metadata }).ready, false);
  assert.equal(buildRefreshPlan({ products: ['DL380_Gen12'], vendor: 'Dell', definitions, metadata }).ready, false);
});
test('fresh local data retries cloud only; exact matching verified artifacts are reused', () => {
  const definitions = [{ product: 'DL380_Gen12', vendor: 'HPE' }];
  for (const [catalogMatches, expected] of [[false, 'SYNC_ONLY'], [true, 'REUSE']]) {
    const plan = buildRefreshPlan({ products: ['DL380_Gen12'], definitions,
      metadata: () => ({ exists: true, needsResync: false, notebook: { syncState: 'VERIFIED', catalogMatches } }) });
    assert.equal(plan.tasks[0].action, expected);
  }
});
test('portal lease excludes another agent and releases for the next run', t => {
  const dir = temp(t);
  const release = acquireWorkflowLease('hpe', dir);
  try { assert.throws(() => acquireWorkflowLease('hpe', dir), /WORKFLOW_BUSY/); } finally { release(); }
  acquireWorkflowLease('hpe', dir)();
});
test('hidden DOM functions are actually available through the scraper CDP facade', () => {
  const cdp = require('../../scripts/lib/scraper/cdp.js');
  assert.equal(typeof cdp.extractHiddenElements, 'function');
  assert.equal(typeof cdp.probeConditionalSkuVisibility, 'function');
});
test('cloud datasets retain every workbook sheet and bind changes outside All SKUs', t => {
  const dir = temp(t); const product = 'Example';
  fs.writeFileSync(path.join(dir, 'catalog.csv'), 'Product #,Description\nP12345-B21,Server\n');
  const payload = path.join(dir, 'payload.md'); fs.writeFileSync(payload, '# Example\nVerified rules');
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet([['Product #'], ['P12345-B21']]), 'All SKUs');
  xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet([['Rule'], ['Ambient <=27']]), 'Rules & Constraints');
  const file = path.join(dir, `${product}_OCA_Catalog.xlsx`); xlsx.writeFile(wb, file);
  const build = () => buildKnowledgeWorkbookDatasets(path.join(dir, 'catalog.csv'), payload, { chassisName: product });
  const before = build();
  assert.deepEqual(before.workbookTabs.map(tab => tab.title), ['All SKUs', 'Rules & Constraints']);
  wb.Sheets['Rules & Constraints'].A2.v = 'Ambient <=25'; xlsx.writeFile(wb, file);
  assert.notEqual(build().fingerprints.combined, before.fingerprints.combined);
});
test('cloud replacement verifies added master tabs instead of silently writing four summary tabs', async () => {
  let requests; const datasets = { catalogRows: [['SKU']], learningRows: [['Rules']], changeRows: [['Change']], metadataRows: [['Hash']], workbookTabs: [{ title: 'Support Services', rows: [['SKU'], ['HU123A']] }] };
  const client = { request: async request => {
    if (request.method === 'POST') { requests = request.data.requests; return {}; }
    if (request.url.includes('values:batchGet')) return { data: { valueRanges: [datasets.catalogRows, datasets.learningRows, datasets.changeRows, datasets.metadataRows, datasets.workbookTabs[0].rows].map(values => ({ values })) } };
    return { data: { sheets: [] } };
  } };
  const result = await replaceGoogleSheetWorkbook('test', datasets, { client });
  assert.equal(result.readbackVerified, true);
  assert.equal(result.tabsWritten.length, 5);
  assert.ok(requests.some(request => request.addSheet?.properties.title === 'Support Services'));
});
test('capture receipt binds raw timestamp, first-run counts, workbook and later deltas', t => {
  const dir = temp(t); const live = path.join(dir, 'live'); const staging = path.join(dir, 'staging');
  fs.mkdirSync(path.join(staging, 'raw_data'), { recursive: true });
  const capturedAt = new Date(Date.now() - 1000).toISOString();
  const catalog = { metadata: { scrapeTimestamp: capturedAt, totalUniqueSKUs: 1 }, entries: [{ skus: [{ 'Product #': 'P12345-B21' }] }] };
  json(path.join(staging, 'Example_Catalog.json'), catalog);
  json(path.join(staging, 'Example_Services.json'), { entries: [] });
  json(path.join(staging, 'Example_Catalog_Rules.json'), { rules: [] });
  json(path.join(staging, 'raw_data/oca_raw_data_full.json'), { timestamp: capturedAt });
  const wb = xlsx.utils.book_new(); xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet([['Product #'], ['P12345-B21']]), 'All SKUs');
  xlsx.writeFile(wb, path.join(staging, 'Example_OCA_Catalog.xlsx'));
  const receipt = createCaptureReceipt(staging, live, 'Example');
  assert.equal(receipt.mode, 'FIRST_CAPTURE'); assert.equal(receipt.counts.hardware, 1);
  assert.deepEqual(receipt.deltas.hardware.added, ['P12345-B21']);
  json(path.join(staging, 'raw_data/oca_raw_data_full.json'), { timestamp: new Date().toISOString() });
  assert.throws(() => createCaptureReceipt(staging, live, 'Example'), /timestamp/);
});
test('conditional observations reach both catalog rows and machine-readable rules', () => {
  const { applyConditionalDiscovery } = require('../../scripts/lib/catalog/conditional_discovery.js');
  const entries = [{ parentCategory: 'Graphics', subCategory: 'GPU', skus: [{ sku: 'P12345-B21' }] }];
  const rules = applyConditionalDiscovery(entries, [{ sku: 'P12345-B21', conditionType: 'AMBIENT_GATE', operator: 'lte', thresholdDegC: 27 }]);
  assert.equal(entries[0].skus[0].visibilityState, 'PORTAL_CONDITIONAL');
  assert.equal(rules[0].thresholdValue, 27);
  assert.equal(rules[0].conditionOperator, 'lte');
  assert.deepEqual(rules[0].affectedSkus, ['P12345-B21']);
});
test('source retirement requires grounded replacement and verifies absence after deletion', t => {
  const dir = temp(t);
  const configPath = path.join(dir, 'notebooks.json');
  const payload = path.join(dir, 'payload.md');
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet([['Product #'], ['P12345-B21']]), 'All SKUs');
  xlsx.writeFile(wb, path.join(dir, 'Example_OCA_Catalog.xlsx'));
  json(path.join(dir, 'Example_Catalog.json'), { metadata: {}, entries: [] });
  json(path.join(dir, 'Example_Services.json'), { entries: [] });
  json(path.join(dir, 'Example_Catalog_Rules.json'), { rules: [] });
  const old = { id: 'old', title: 'Example_OCA_Catalog_2026-09-01' };
  const other = { id: 'other', title: 'Example_Gen2_OCA_Catalog_2026-09-01' };
  const official = { id: 'official', title: 'Example Canonical Knowledge' };
  const { syncToNotebookLM } = require('../../scripts/lib/sync/nlm_sync_client.js');
  const previousCi = process.env.CI; const previousGithub = process.env.GITHUB_ACTIONS;
  delete process.env.CI; delete process.env.GITHUB_ACTIONS;
  t.after(() => { if (previousCi === undefined) delete process.env.CI; else process.env.CI = previousCi;
    if (previousGithub === undefined) delete process.env.GITHUB_ACTIONS; else process.env.GITHUB_ACTIONS = previousGithub; });
  for (const mode of ['uncited', 'failed-delete', 'success']) {
    fs.writeFileSync(payload, '# Example\nProduct knowledge');
    json(configPath, { notebooks: { Example: { notebookId: 'book', officialSourceIds: ['official'], lastSyncedSourceId: 'old', lastSyncedSourceName: old.title } } });
    let sources = [old, other, official]; const deletions = [];
    const run = (_exe, args) => {
      if (args[0] === 'source' && args[1] === 'add') { sources.push({ id: 'new', title: 'Example_OCA_Catalog_today' }); return JSON.stringify({ id: 'new' }); }
      if (args[0] === 'notebook') return JSON.stringify({ answer: 'Example contains the current catalog information.', sources_used: mode === 'uncited' ? [] : ['new'] });
      if (args[1] === 'content') return fs.readFileSync(payload, 'utf8');
      if (args[1] === 'list') return JSON.stringify(sources);
      if (args[1] === 'delete') { deletions.push(args[2]); if (mode === 'failed-delete') throw new Error('Deletion failed'); sources = sources.filter(source => source.id !== args[2]); return ''; }
      throw new Error(`Unexpected command ${args.join(' ')}`);
    };
    const result = syncToNotebookLM('book', payload, 'Example', 0, { notebookConfigPath: configPath, execFileSync: run, confirmSourceRetirement: true });
    assert.equal(result.success, mode === 'success', result.message);
    assert.deepEqual(deletions, mode === 'uncited' ? [] : ['old']);
    assert.ok(sources.some(source => source.id === 'official'));
    assert.ok(sources.some(source => source.id === 'other'));
    if (mode === 'success') {
      assert.equal(result.consolidationVerified, true);
      const cfg = JSON.parse(fs.readFileSync(configPath));
      assert.equal(Object.keys(cfg.notebooks.Example.lastArtifactHashes).length, 4);
      assert.ok(!cfg.notebooks.Example.trustedSourceIds.includes('old'));
    }
  }
});
