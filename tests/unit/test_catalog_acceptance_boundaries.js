'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { parseCatalogSearchQuery, executeCatalogSearch, verifyCatalogSearchResponse, lookupCatalogSku } =
  require('../../scripts/lib/catalog/catalog_query_engine.js');
const { getHistoricalSkuPrice, getHistoricalBoqPricing, compareBoqPricingAcrossTimeline } =
  require('../../scripts/lib/catalog/sku_versioning.js');
const { backfillMissingPricesAndLeadTimes, compareSkuAcrossSolutions } = require('../../scripts/lib/catalog/cross_solution_pricing.js');
const { runCaptureQueryReplay, runPortfolioQueryReplay, replayPromotedCatalogProbes } =
  require('../../scripts/lib/catalog/capture_query_replay.js');
const { enqueueCatalogProbe, summarizeCatalogProbes } = require('../../scripts/lib/catalog/catalog_probe_queue.js');
const { executeRoutedQuery } = require('../../scripts/evaluators/route_query.js');

function sandbox(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-acceptance-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function gpu(sku, capacity, price, lead, extras = {}) {
  return { 'Product #': sku, Description: 'NVIDIA H200 ' + capacity + 'GB GPU Accelerator', 'List Price (USD)': price,
    'Lead Time': lead, 'Lifecycle Status': 'Active', ...extras };
}

function catalog(root, id, rows, date = '2026-11-20') {
  const catalogDir = path.join(root, id);
  fs.mkdirSync(catalogDir, { recursive: true });
  const catalogJsonPath = path.join(catalogDir, id + '_Catalog.json');
  const servicesJsonPath = path.join(catalogDir, id + '_Services.json');
  fs.writeFileSync(catalogJsonPath, JSON.stringify({ metadata: { scrapeDate: date }, entries: [
    { parentCategory: 'Graphics & GPU', subCategory: 'GPU Accelerators', skus: rows }
  ] }));
  fs.writeFileSync(servicesJsonPath, '{"entries":[]}');
  return { id, catalogDir, catalogJsonPath, servicesJsonPath, scrapeDate: date };
}

function search(query, catalogs, selectedProduct) {
  const request = parseCatalogSearchQuery(query, { catalogs, selectedProduct });
  return { request, result: executeCatalogSearch(request, { catalogs, recordMiss: false }) };
}

test('scope, capacity, USD, and delivery bounds are checked independently through the router', async t => {
  const root = sandbox(t);
  const a = catalog(root, 'DL380a_Gen12', [
    gpu('S3U30C', 141, 25000, '20–30 days'),
    gpu('S3U31C', 141, 40000, '20 days'),
    gpu('S3U32C', 150, 25000, '20 days'),
    gpu('S3U33C', 141, 25000, '21–35 days')
  ]);
  const b = catalog(root, 'DL380_Gen11', [gpu('S3U35C', 141, 25000, '20 days')]);
  const catalogs = [a, b];
  const query = 'List GPUs under 150 GB and under $40,000 within 30 days on DL380a Gen12 sorted by price';
  const routed = await executeRoutedQuery(query, { availableCatalogs: catalogs, offline: true, chassisName: b.id, recordCatalogMiss: false });
  assert.equal(routed.result.status, 'SUCCESS');
  assert.equal(routed.result.acceptanceGate.status, 'PASSED');
  assert.equal(routed.result.catalogSearch.filters.price.maxPriceUsd, 40000);
  assert.deepEqual(routed.result.catalogSearch.results.map(row => row.sku), ['S3U30C']);
  const unsupported = await executeRoutedQuery('List GPUs on DL999 Gen12 sorted by price', {
    availableCatalogs: catalogs, offline: true, chassisName: a.id, recordCatalogMiss: false
  });
  assert.equal(unsupported.result.status, 'ACTION_REQUIRED');
  const deadline = search('List GPUs for delivery by 2026-12-01', catalogs, a.id);
  assert.equal(verifyCatalogSearchResponse(deadline.result, deadline.request).status, 'ACTION_REQUIRED');
  assert.deepEqual(unsupported.result.catalogSearch.summary.productsSearched, []);
  assert.deepEqual(search('List GPUs', catalogs, b.id).result.summary.productsSearched, [b.id]);
  assert.deepEqual(search('List GPUs on DL380a Gen12 and DL380 Gen11', catalogs).result.summary.productsSearched, [a.id, b.id]);
});

test('plain listings allow missing commercial fields while material exclusions produce partial or unknown outcomes', t => {
  const root = sandbox(t);
  const a = catalog(root, 'DL380a_Gen12', [gpu('S3U30C', 141, null, null), gpu('S3U31C', 141, 200, null)]);
  const plain = search('List GPUs', [a]);
  assert.equal(verifyCatalogSearchResponse(plain.result).status, 'PASSED');
  const priced = search('List GPUs sorted by price', [a]);
  assert.equal(verifyCatalogSearchResponse(priced.result, priced.request).status, 'PARTIAL');
  assert.equal(priced.result.summary.excludedUnpricedCount, 1);
  const unpriced = catalog(root, 'DL360_Gen12', [gpu('S3U35C', 141, null, null)]);
  assert.equal(verifyCatalogSearchResponse(search('List GPUs sorted by price', [unpriced]).result).status, 'ACTION_REQUIRED');
  fs.writeFileSync(a.catalogJsonPath, '{broken');
  const unreadable = search('List GPUs', [a]).result;
  assert.equal(unreadable.sources[0].status, 'UNREADABLE');
  assert.equal(verifyCatalogSearchResponse(unreadable).status, 'ACTION_REQUIRED');
});

test('acceptance rejects response mutation even if the payload rewrites its filters', t => {
  const a = catalog(sandbox(t), 'DL380a_Gen12', [gpu('S3U30C', 141, 100, '5 days'), gpu('S3U31C', 141, 120, '6 days')]);
  const { request, result } = search('List GPUs under $200 within 10 days sorted by price', [a], a.id);
  assert.equal(verifyCatalogSearchResponse(result, request).status, 'PASSED');
  const changes = [
    report => { report.results[0].product = 'DL380_Gen11'; },
    report => { report.results[0].listPriceUsd = 999; report.filters.price.maxPriceUsd = 1000; },
    report => { report.results[0].leadTime.maxDays = 999; },
    report => { report.results.reverse(); },
    report => { report.summary.returnedCount++; }
  ];
  for (const mutate of changes) {
    const forged = structuredClone(result);
    mutate(forged);
    assert.equal(verifyCatalogSearchResponse(forged, request).status, 'FAILED');
  }
});

test('conditional evidence stays scoped and catalog visibility does not establish orderability', t => {
  const a = catalog(sandbox(t), 'DL380a_Gen12', [
    gpu('S3U30C', 141, 25000, '20 days', { visibilityState: 'PORTAL_CONDITIONAL', isSelectable: false,
      'Lifecycle Status': 'EOL Warning (90-Day)' }),
    gpu('S3U31C', 141, 24000, '20 days')
  ]);
  const raw = path.join(a.catalogDir, 'raw_data');
  fs.mkdirSync(raw);
  fs.writeFileSync(path.join(raw, 'conditional_skus.json'), JSON.stringify([
    { sku: 'S3U30C', selectorTriggerSku: 'P74700-B21', scopeProvenance: { ownerProduct: a.id, baseSku: 'P70000-B21' } },
    { sku: 'S3U30C', selectorTriggerSku: 'P74701-B21', scopeProvenance: { ownerProduct: a.id, baseSku: 'P71000-B21' } },
    { sku: 'S3U30C', selectorTriggerSku: 'P74702-B21', scopeProvenance: { ownerProduct: 'DL360_Gen12' } }
  ]));
  const row = search('List GPUs', [a]).result.results.find(row => row.sku === 'S3U30C');
  assert.equal(row.selectability, false);
  assert.equal(row.lifecycleCanonical, '90-Day Warning');
  assert.equal(row.conditionalObservations.length, 2);
  const orderable = search('List orderable GPUs', [a]).result;
  assert.equal(orderable.results.length, 0);
  assert.equal(orderable.excludedUnmeasured[0].reason, 'ORDERABILITY_UNVERIFIED');
});

test('prices are exact-SKU and dated; unresolved BOQ dates do not create a comparison delta', async t => {
  const a = catalog(sandbox(t), 'DL380a_Gen12', [gpu('P69727-F21', 141, 120, '3 days')]);
  assert.equal(getHistoricalSkuPrice('P69727-F21', '2026-01-01', a.catalogDir).nullablePriceUsd, null);
  assert.equal(getHistoricalSkuPrice('P69727-F21', '2026-11-23', a.catalogDir).effectiveDate, '2026-11-20');
  for (const invalidDate of ['2026-00', '2026-02-30', 'next quarter']) {
    const invalid = getHistoricalSkuPrice('P69727-F21', invalidDate, a.catalogDir);
    assert.equal(invalid.status, 'INVALID_AS_OF_DATE');
    assert.equal(invalid.nullablePriceUsd, null);
  }
  assert.equal(compareSkuAcrossSolutions('P69727-B21', { catalogs: [a] }).matches.length, 0);
  assert.equal(compareSkuAcrossSolutions('P69727-B21', { catalogs: [a], includeRelatedVariants: true }).matches[0].exactMatch, false);
  const [item] = backfillMissingPricesAndLeadTimes([{ sku: 'P69727-B21', unitPriceUsd: null, leadTimeDays: null }], 'Gen12', { catalogs: [a] });
  assert.equal(item.unitPriceUsd, null);
  assert.equal(item.leadTimeDays, null);
  const boq = [{ sku: 'P69727-F21', quantity: 4 }];
  const incompleteBoq = getHistoricalBoqPricing(boq, '2026-01-01', a.catalogDir);
  assert.equal(incompleteBoq.items[0].extendedPriceUsd, null);
  assert.equal(incompleteBoq.totalCapExUsd, null);
  const timeline = compareBoqPricingAcrossTimeline(boq, ['2026-01-01', '2026-11-23'], a.catalogDir).timeline;
  assert.equal(timeline[0].totalCapExUsd, null);
  assert.equal(timeline[1].totalCapExUsd, 480);
  assert.equal(timeline[1].deltaFromPrevMonthUsd, null);
  const routed = await executeRoutedQuery('List price of P69727-F21 as of 2026-01-01 on DL380a Gen12', {
    availableCatalogs: [a], offline: true
  });
  assert.equal(routed.result.status, 'ACTION_REQUIRED');
  assert.equal(routed.result.historicalPricing.nullablePriceUsd, null);

  const history = path.join(a.catalogDir, 'history');
  fs.mkdirSync(history);
  const snapshot = JSON.parse(fs.readFileSync(a.catalogJsonPath));
  snapshot.metadata.scrapeDate = '2026-05-01';
  snapshot.entries[0].skus[0]['List Price (USD)'] = 90;
  fs.writeFileSync(path.join(history, 'catalog_2026-05-01.json'), JSON.stringify(snapshot));
  const archived = getHistoricalSkuPrice('P69727-F21', '2026-06-01', a.catalogDir);
  assert.equal(archived.nullablePriceUsd, 90);
  assert.equal(archived.effectiveDate, '2026-05-01');
});

test('replay rejects missing, skipped and unknown cases and executes a portfolio drift assertion', t => {
  const a = catalog(sandbox(t), 'DL380a_Gen12', [gpu('S3U30C', 141, 25000, '3 days')]);
  const suitePath = path.join(a.catalogDir, 'replay.json');
  const replay = () => runCaptureQueryReplay(a.catalogDir, a.id, { suitePath });
  const write = (productQueries, portfolioQueries = []) => fs.writeFileSync(suitePath,
    JSON.stringify({ schemaVersion: '1.0.0', productQueries: { [a.id]: productQueries }, portfolioQueries }));
  assert.equal(replay().passed, false);
  write([{ id: 'skip', kind: 'catalogSearch', query: 'Explain everything' }]);
  assert.equal(replay().results[0].status, 'SKIPPED');
  assert.equal(replay().passed, false);
  write([{ id: 'bad', kind: 'catalogSearch', query: 'List GPUs', inventedAssertion: true }]);
  assert.equal(replay().results[0].status, 'INVALID_CASE');
  write([{ id: 'good', kind: 'skuLookup', sku: 'S3U30C', minPriceUsd: 20000 }], [
    { id: 'portfolio', kind: 'priceDrift', query: 'Last 3 GPU price drifts across catalogs', assertNoTrailConflicts: true }
  ]);
  assert.equal(replay().executedCount, 1);
  assert.equal(replay().passed, true);
  assert.equal(runPortfolioQueryReplay([a], { suitePath }).executedCount, 1);
  assert.ok(lookupCatalogSku(a, 'S3U30C').source.sha256);
});

test('concurrent misses deduplicate and only a verified promoted capture closes an exact product issue', async t => {
  const root = sandbox(t);
  const a = catalog(root, 'DL380a_Gen12', [gpu('S3U30C', 141, 120, null)]);
  const report = search('List GPUs on DL380a Gen12 within 10 days', [a]).result;
  const queuePath = path.join(root, 'queue.json');
  const body = JSON.stringify(report);
  const moduleFile = require.resolve('../../scripts/lib/catalog/catalog_probe_queue.js');
  const script = 'const [mod, file, body, id] = process.argv.slice(1); if (!require(mod).enqueueCatalogProbe(JSON.parse(body), {queuePath:file,traceId:id})) process.exitCode=1;';
  await Promise.all(['x', 'y', 'z'].map(id => promisify(execFile)(process.execPath, ['-e', script, moduleFile, queuePath, body, id])));
  const queued = JSON.parse(fs.readFileSync(queuePath)).items;
  assert.equal(queued.length, 1);
  assert.equal(queued[0].count, 3);
  assert.equal(Object.hasOwn(queued[0], 'query'), false);
  const latest = catalog(root, a.id, [gpu('S3U30C', 141, 120, '8 days')]);
  const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  const hashes = { 'Catalog.json': sha(latest.catalogJsonPath), 'Services.json': sha(latest.servicesJsonPath) };
  const receipt = { product: a.id, status: 'STAGING_AUDITED', capturedAt: '2099-12-01T00:00:00.000Z', hashes,
    rawSha256: 'receipt-digest', coverage: { qualityGate: { passed: true, replaySuiteSha256: 'test-suite',
      replayInputHashes: { ...hashes, 'conditional_skus.json': null } } } };
  assert.equal(replayPromotedCatalogProbes(latest.catalogDir, receipt, { queuePath }).resolved, 0);
  receipt.status = 'LOCAL_PROMOTED';
  assert.equal(replayPromotedCatalogProbes(latest.catalogDir, { ...receipt, product: 'DL360_Gen12' }, { queuePath }).resolved, 0);
  const invalid = structuredClone(receipt);
  invalid.coverage.qualityGate.replayInputHashes['Catalog.json'] = 'different capture';
  assert.equal(replayPromotedCatalogProbes(latest.catalogDir, invalid, { queuePath }).resolved, 0);
  assert.equal(JSON.parse(fs.readFileSync(queuePath)).items[0].status, 'REPLAY_FAILED');
  assert.equal(enqueueCatalogProbe({ ...report, summary: { incompleteCatalogCoverage: false } }, { queuePath }), false);
  assert.equal(replayPromotedCatalogProbes(latest.catalogDir, receipt, { queuePath }).resolved, 1);
  assert.equal(summarizeCatalogProbes(queuePath).resolved, 1);
});

test('vendor constrained supply reaches search, SKU audit, and the production gate', async t => {
  const { getSkuAuditHistory, generatePresalesLifecycleAdvisories } = require('../../scripts/lib/catalog/sku_versioning.js');
  const { verifyPrePresentationAcceptance } = require('../../scripts/lib/boq/bom_verifier.js');
  const a = catalog(sandbox(t), 'DL380a_Gen12', [
    gpu('S3U30C', 141, 25000, '2 days', { vendorSupplyStatus: 'CONSTRAINED_SUPPLY' }),
    gpu('S3U31C', 141, 26000, '4 days', { 'Lifecycle Status': 'Active' })
  ]);
  const rows = search('List constrained supply GPUs', [a]).result.results;
  assert.deepEqual(rows.map(row => [row.sku, row.availability]), [['S3U30C', 'CONSTRAINED_SUPPLY']]);
  assert.equal(getSkuAuditHistory('S3U30C', a.catalogDir).currentStatus, 'CONSTRAINED_SUPPLY');
  assert.equal(generatePresalesLifecycleAdvisories([{ sku: 'S3U30C' }], a.catalogDir)[0].type, 'SUPPLY_CONSTRAINT_RISK');
  const catalogData = JSON.parse(fs.readFileSync(a.catalogJsonPath, 'utf8'));
  const { resolveComponentByRole } = require('../../scripts/lib/taxonomy/sku_resolver.js');
  assert.equal(resolveComponentByRole(catalogData, { preferredSku: 'S3U30C', allowObsolete: true }).sku, 'S3U31C');
  const output = { rankedSolutions: [{ skuPartsList: [{ sku: 'S3U30C', quantity: 1 }] }] };
  const gate = verifyPrePresentationAcceptance(output, 'BOQ_EVALUATION', { catalogData, allowClearanceOrObsolete: true });
  assert.equal(gate.checks.find(check => check.id === 'B21').status, 'ACTION_REQUIRED');
});

test('workflow lessons survive the whole replay and fresh BOMs prove only the applied rule', t => {
  const { spawnSync } = require('node:child_process');
  const { recordScrapingWorkflowLearnings } = require('../../scripts/maintenance/record_scraping_workflow_learnings.js');
  const { recordAndCertifyLearnedRule } = require('../../scripts/lib/feedback/continuous_learning_verifier.js');
  const root = sandbox(t);
  const report = recordScrapingWorkflowLearnings(root);
  assert.deepEqual(report.unreachableIds, []);
  assert.equal(report.results.length, require('../../scripts/config/scraping_workflow_learnings.js').length);
  const dir = path.join(root, 'outputs', 'ProLiant', 'Gen12', 'DL380_Gen12');
  const delta = { deltaId: 'TEST_LEARNED_CABLE', ruleType: 'DEPENDENCY_CHAIN', affectedSku: 'P11111-B21',
    requiredDependencySku: 'P22222-B21', rawMessage: 'Requires the scoped cable' };
  const bom = [{ sku: 'P11111-B21', quantity: 1, description: 'Adapter' }];
  assert.equal(recordAndCertifyLearnedRule(delta, dir, bom).certification.simulationResult.targetRuleApplied, true);
  const reload = spawnSync(process.execPath, ['-e', `
    const assert = require('node:assert/strict');
    const { validateConflictGraph } = require('./scripts/lib/conflict/conflict_graph.js');
    const { verifyKnowledgeRuleReachability } = require('./scripts/lib/feedback/continuous_learning_verifier.js');
    const dir = process.argv[1];
    const bom = [{ sku: 'P11111-B21', quantity: 1, description: 'Adapter references P22222-B21' }];
    const validate = (items, missing) => validateConflictGraph(items, missing, dir, 'DL380_Gen12', { skipSynthesis: true })
      .auditLog.find(entry => entry.ruleId === 'TEST_LEARNED_CABLE');
    assert.equal(validate(bom, [{ sku: 'P22222-B21', quantity: 1 }]).status, 'FAIL');
    assert.equal(validate([...bom, { sku: 'P22222-B21', quantity: 1 }], []).status, 'PASS');
    const unrelated = verifyKnowledgeRuleReachability({ deltaId: 'LEARN_BLOCKUI_OPACITY_ZERO_FALSE_POSITIVE_20261120' }, 'DL380_Gen12', bom, dir);
    assert.equal(unrelated.reachable, true);
    assert.equal(unrelated.simulationResult.targetRuleApplied, false);
  `, dir], { encoding: 'utf8' });
  assert.equal(reload.status, 0, reload.stderr);
});
