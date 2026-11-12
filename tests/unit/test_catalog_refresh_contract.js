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
test('Synergy BOM plans the frame and children and reports unmapped owned configurations', t => {
  const filePath = path.join(temp(t), 'synergy.xlsx');
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
    ['Qty', 'Product #', 'Product Description', 'Config Name'],
    [2, 'P51174-B21', 'HPE Synergy 12000 Configure-to-order Frame', 'Synergy 12000 Frame #2'],
    [24, 'P68217-B21', 'HPE Synergy 480 Gen12 Configure-to-order Compute Module', 'Synergy 480 Gen12 #2'],
    [4, '867796-B21', 'HPE Virtual Connect SE 100Gb F32 Module for Synergy', '100Gb Virtual #2'],
    [4, 'P77653-B21', 'Brocade 64Gb Fibre Channel Module for HPE Synergy', 'Brocade 64Gb Fibre Channel Module for HPE Synergy #2'],
    [4, '876852-B21', 'HPE Synergy 4-port Frame Link Module', '4-port Frame Link Module #2'],
    [4, 'P77654-B21', 'Brocade 64Gb Fibre Channel Module for HPE Synergy', 'Brocade 64Gb Fibre Channel Module for HPE Synergy #3'],
    [24, 'AF573A', 'HPE C13–C14 Jumper Cord', 'Synergy 12000 Frame #2']
  ]), 'BOM');
  xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
    ['Category', 'Quantity', 'Category List Price (USD)', 'Total List Price (USD)'], ['Power', 24, 912, 912]
  ]), 'Product View');
  xlsx.writeFile(workbook, filePath);
  const metadata = () => ({ exists: false, needsResync: true });
  const plan = buildRefreshPlan({ filePath, metadata });
  assert.deepEqual(plan.tasks.map(task => task.product), ['Synergy_12000_Frame', 'SY480_Gen12', 'SY100Gb_F32_Module',
    'Synergy_Brocade_64Gb_FC_Module', 'Synergy_4Port_Frame_Link_Module']);
  assert.equal(plan.sheets[1].status, 'NON_BOM_SHEET');
  assert.deepEqual(plan.unresolved.map(item => [item.row, item.sku, item.reason]), [[7, 'P77654-B21', 'UNRESOLVED_BASE_PRODUCT']]);
  assert.equal(plan.ready, false);
  assert.equal(buildRefreshPlan({ products: ['P51174-B21'], metadata }).tasks[0].action, 'FIRST_CAPTURE');
});

test('portfolio keeps a missing parent visible when only its nested child is captured', t => {
  const root = temp(t);
  const child = path.join(root, 'Frame', 'Module');
  fs.mkdirSync(child, { recursive: true });
  const capturedAt = '2026-10-30T11:57:13.837Z';
  const publishedAt = '2026-11-06T08:44:42.687Z';
  const childCatalog = path.join(child, 'Module_Catalog.json');
  json(childCatalog, { metadata: { scrapeTimestamp: capturedAt } });
  const { getCatalogPortfolioCoverage } = require('../../scripts/lib/catalog/catalog_portfolio.js');
  const { discoverAllProductCatalogs } = require('../../scripts/lib/catalog/product_metadata_manager.js');
  const options = {
    notebooks: { Module: { parentProductId: 'Frame', lastSyncedAt: publishedAt, cloudSyncState: 'VERIFIED' } },
    profiles: {}, chassisGroups: {}
  };
  const coverage = getCatalogPortfolioCoverage({ ...options, artifacts: discoverAllProductCatalogs(root) });
  const frame = coverage.find(product => product.product === 'Frame');
  const module = coverage.find(product => product.product === 'Module');
  assert.deepEqual(frame.coverageIssues, ['PRODUCT_UNREGISTERED', 'CATALOG_MISSING']);
  assert.equal(module.capturedAt, capturedAt);
  assert.equal(module.publishedAt, publishedAt);
  assert.ok(module.coverageIssues.includes('RECEIPT_MISSING'));

  json(path.join(root, 'Frame', 'Frame_Catalog.json'), { metadata: { scrapeTimestamp: capturedAt } });
  assert.equal(discoverAllProductCatalogs(root).length, 2);

  const { calculateFileSha256 } = require('../../scripts/lib/catalog/product_metadata_manager.js');
  const companions = ['Services.json', 'Catalog_Rules.json', 'OCA_Catalog.xlsx'];
  for (const suffix of companions) fs.writeFileSync(path.join(child, `Module_${suffix}`), 'fixture');
  const rawDir = path.join(child, 'raw_data');
  fs.mkdirSync(rawDir);
  const raw = path.join(rawDir, 'oca_raw_data_full.json');
  json(raw, { timestamp: capturedAt });
  const hashes = Object.fromEntries(['Catalog.json', ...companions]
    .map(suffix => [suffix, calculateFileSha256(path.join(child, `Module_${suffix}`))]));
  json(path.join(child, 'capture_receipt.json'), {
    product: 'Module', status: 'LOCAL_PROMOTED', capturedAt, hashes,
    rawSha256: calculateFileSha256(raw), provenance: { ownerConfiguration: 'Module #1' },
    coverage: { policy: { valid: true } }
  });
  const getModule = () => getCatalogPortfolioCoverage({ ...options, artifacts: discoverAllProductCatalogs(root) })
    .find(product => product.product === 'Module');
  assert.equal(getModule().captureStatus, 'VERIFIED');
  fs.appendFileSync(path.join(child, 'Module_OCA_Catalog.xlsx'), 'changed');
  assert.equal(getModule().captureStatus, 'RECEIPT_MISMATCH');
});

test('OCA abbreviated lead-time columns survive parsing and hidden TAA rows cannot overwrite commercial rows', () => {
  const { parseSingleTableRow } = require('../../scripts/catalogs/build_catalog.js');
  const headers = ['Product #', 'Description', 'Quantity', 'Price (USD)', 'Est. Lead Time'];
  const { obj } = parseSingleTableRow(['AF573A', 'HPE Jumper Cord', '0', '38', '8'], headers, 0, {});
  assert.equal(obj.leadTimeDays, 8);
  assert.equal(obj['Lead Time Source'], 'OCA row attribute');
  const { applyUnavailableDomRulesAndSkus } = require('../../scripts/lib/catalog/conditional_discovery.js');
  const existing = { sku: 'P68217-B21' };
  const hardware = [{ parentCategory: 'Frame Options', skus: [existing] }];
  applyUnavailableDomRulesAndSkus(hardware, [], [], [
    { sku: 'P68217-B21', rawSku: 'P68217-B21#GTA', description: 'Compute Module', ineligibilityReason: 'Non-TAA model' },
    { sku: 'P51174-B22', description: 'HPE TAA-compliant Frame', section: 'Frame Options' }
  ]);
  assert.deepEqual(hardware[0].skus, [{ sku: 'P68217-B21' }]);
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
  const receipt = createCaptureReceipt(staging, live, 'Example', { skipCoverageValidation: true });
  assert.equal(receipt.mode, 'FIRST_CAPTURE'); assert.equal(receipt.counts.hardware, 1);
  assert.deepEqual(receipt.deltas.hardware.added, ['P12345-B21']);
  json(path.join(staging, 'raw_data/oca_raw_data_full.json'), { timestamp: new Date().toISOString() });
  assert.throws(() => createCaptureReceipt(staging, live, 'Example', { skipCoverageValidation: true }), /timestamp/);
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
      if (args[0] === 'source' && args[1] === 'add') {
        const titleIdx = args.indexOf('--title');
        const title = titleIdx !== -1 ? args[titleIdx + 1] : 'Example_OCA_Catalog_today';
        sources.push({ id: 'new', title });
        return JSON.stringify({ id: 'new' });
      }
      if (args[0] === 'notebook') return JSON.stringify({ answer: 'Example contains the current catalog information.', sources_used: mode === 'uncited' ? [] : ['new'] });
      if (args[1] === 'content') return fs.readFileSync(payload, 'utf8');
      if (args[1] === 'list') return JSON.stringify(sources);
      if (args[1] === 'delete') { deletions.push(args[2]); if (mode === 'failed-delete') throw new Error('Deletion failed'); sources = sources.filter(source => source.id !== args[2]); return ''; }
      throw new Error(`Unexpected command ${args.join(' ')}`);
    };
    const result = syncToNotebookLM('book', payload, 'Example', 0, {
      notebookConfigPath: configPath, locksRoot: path.join(dir, 'locks'), execFileSync: run,
      confirmSourceRetirement: true, skipCatalogQualityCheck: true
    });
    assert.equal(result.success, mode === 'success', result.message);
    assert.deepEqual(deletions, mode === 'uncited' ? ['new'] : ['old']);
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
