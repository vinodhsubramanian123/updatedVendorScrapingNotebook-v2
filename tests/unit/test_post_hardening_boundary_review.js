'use strict';
// Executable boundary regressions for Gemini's validation handoff. No live I/O.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const notebook = require('../../scripts/lib/notebook/notebook_query_utils.js');
const evidence = require('../../scripts/lib/boq/solution_evidence.js');
const contracts = require('../../scripts/lib/contracts/workflow_contract.js');
const { validateBoqEvaluationCriteria } = require('../../scripts/lib/boq/bom_verifier.js');
const { LifecycleEngine } = require('../../scripts/lib/lifecycle/lifecycle_engine.js');
const { createEvidenceLedger } = require('../../scripts/lib/system/evidence_ledger.js');
const { safeWriteJsonAtomic, promoteStagingDirectory } = require('../../scripts/lib/system/fs_compat.js');
const { validateCatalogCoverage } = require('../../scripts/lib/catalog/catalog_coverage.js');
const serializer = require('../../scripts/lib/boq/eval_output_serializer.js');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function temporary(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'peer-review-boundary-'));
  t.after(() => {
    const resolved = path.resolve(dir);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('peer-review-boundary-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  return dir;
}
function groundedFixture(t) {
  const entry = { notebookId: 'product-notebook', queryEnabled: true, cloudSyncState: 'VERIFIED', officialSourceIds: ['vendor-source'] };
  t.mock.method(notebook, 'getNotebookConfigEntry', () => ({ key: 'TEST_PRODUCT', entry }));
  const evaluation = { chassis: 'TEST_PRODUCT', items: [{ sku: 'BASE', quantity: 1 }],
    catalogData: { entries: [{ skus: [{ sku: 'BASE', Description: 'Original' }] }] },
    conflictGraph: { recommendedSolutions: [{ rank: '1L', skuPartsList: [{ sku: 'BASE', quantity: 1 }] }] },
    acceptanceGate: { isValid: true } };
  evaluation.ephemeralSourceValidation = { success: true, isCloudGrounded: true, sourceDetached: true,
    reviewedAt: new Date().toISOString(),
    doubleCheckVerdict: 'DOUBLE_CHECK_PASSED', notebookId: entry.notebookId, sourceId: 'candidate-source',
    authoritativeSourceIds: ['vendor-source'], authoritativeScopeSha256: hash(evidence.canonicalJson(entry)),
    citations: [{ source_id: 'vendor-source', index: 1 }],
    rankVerdicts: [{ rank: '1L', verdict: 'PASS', intentPreserved: true, mandatoryChangesOnly: true, issues: [], citations: ['[1]'] }],
    manifestSha256: evidence.solutionFingerprint(evaluation) };
  return { evaluation, entry };
}
function artifacts(t, evaluation) {
  const dir = temporary(t);
  const keys = ['multiRankWorkbookPath', 'multiRankCsvPath', 'proposalWorkbookPath', 'portalWorkbookPath'];
  const files = keys.map((key, index) => {
    const file = path.join(dir, `${index}.xlsx`);
    const bytes = Buffer.from(`artifact-${index}`);
    fs.writeFileSync(file, bytes);
    evaluation[key] = file;
    return { path: file, sizeBytes: bytes.length, sha256: hash(bytes) };
  });
  const fingerprint = evidence.deliveryFingerprint(evaluation);
  evaluation.deliveryAuthorization = contracts.issueDeliveryAuthorization({ manifestFingerprint: fingerprint,
    chassisKey: evaluation.chassis, acceptanceDecision: { isApproved: true, profile: 'BOQ_EVALUATION' } });
  evaluation.artifactIntegrityManifest = contracts.signArtifactIntegrityManifest({ manifestFingerprint: fingerprint,
    chassisKey: evaluation.chassis, artifacts: files }, evaluation.deliveryAuthorization);
}

test('candidate retrieval never grants compatibility authority; arbitrary requested sources fail closed', () => {
  const entry = { officialSourceIds: ['official'], certifiedCatalogSourceIds: ['catalog'], quarantinedSourceIds: ['quarantined'] };
  const scope = notebook.resolveQuerySourceScope('N', entry, { ephemeralSource: { notebookId: 'N', sourceId: 'candidate', createdThisRun: true } });
  assert.equal(scope.valid, true);
  assert.deepEqual(scope.authoritativeSourceIds, ['catalog', 'official']);
  assert.deepEqual(scope.querySourceIds, ['candidate', 'catalog', 'official']);
  assert.equal(notebook.resolveQuerySourceScope('N', entry, { sourceIds: ['candidate'] }).valid, false);
  assert.equal(notebook.resolveQuerySourceScope('N', entry, { sourceIds: ['foreign'], allowUnrestrictedSources: true }).valid, false);
  assert.equal(notebook.resolveQuerySourceScope('N', entry, { ephemeralSource: { notebookId: 'OTHER', sourceId: 'candidate', createdThisRun: true } }).valid, false);
  assert.equal(notebook.resolveQuerySourceScope('N', {}, {}).valid, false);
});

test('B13 accepts only current native vendor citations and invalidates catalog or governance changes', t => {
  const { evaluation, entry } = groundedFixture(t);
  const b13 = context => validateBoqEvaluationCriteria(evaluation, context || {}).find(check => check.id === 'B13');
  assert.equal(evidence.candidateReviewCurrent(evaluation), true);
  assert.equal(b13().status, 'PASSED');
  assert.equal(b13({ OFFLINE_MODE: true }).status, 'ACTION_REQUIRED');
  const review = evaluation.ephemeralSourceValidation;
  const reviewedAt = review.reviewedAt;
  review.reviewedAt = '2000-01-01T00:00:00Z';
  assert.equal(evidence.candidateReviewCurrent(evaluation), false);
  review.reviewedAt = reviewedAt;
  review.sourceDetached = false;
  assert.equal(b13().status, 'ACTION_REQUIRED');
  review.sourceDetached = true;
  review.citations[0].source_id = review.sourceId;
  assert.equal(evidence.candidateReviewCurrent(evaluation), false);
  review.citations[0].source_id = 'vendor-source';
  evaluation.catalogData.entries[0].skus[0].Description = 'Changed without changing count or timestamp';
  assert.equal(evidence.candidateReviewCurrent(evaluation), false);
  evaluation.catalogData.entries[0].skus[0].Description = 'Original';
  assert.equal(evidence.candidateReviewCurrent(evaluation), true);
  entry.quarantinedSourceIds = ['vendor-source'];
  assert.equal(evidence.candidateReviewCurrent(evaluation), false);
});

test('terminal evidence keeps deep snapshots and persists separate candidate resolutions', t => {
  const ledger = createEvidenceLedger({ traceId: 'peer-boundary' });
  const baseline = { nested: { missing: true } };
  ledger.startPhase(3, 'Baseline');
  ledger.completePhase(3, 'ACTION_REQUIRED', baseline);
  baseline.nested.missing = false;
  assert.equal(ledger.phases.phase_3.outputSummary.nested.missing, true);
  assert.throws(() => ledger.completePhase(3, 'RESOLVED', {}), /immutable/i);
  const attempt = { nested: { cost: 10 } };
  ledger.recordCandidateAttempt(attempt);
  attempt.nested.cost = 20;
  ledger.recordPhaseResolution(3, { manifestSha256: 'a'.repeat(64), candidateGatePassed: true, documentReviewVerified: true });
  const exported = ledger.finalizeAndExport(temporary(t));
  const saved = JSON.parse(fs.readFileSync(exported.jsonPath, 'utf8'));
  assert.equal(saved.phases.phase_3.status, 'ACTION_REQUIRED');
  assert.equal(saved.candidateAttempts[0].nested.cost, 10);
  assert.equal(saved.phaseResolutions[0].status, 'RESOLVED');
});

test('DAG schedules reversed registrations and rejects cycles and implicit success', async () => {
  const order = [];
  const engine = new LifecycleEngine('reverse', [
    { id: 'B', phaseNum: 2, mandatory: true, dependsOn: ['A'] },
    { id: 'A', phaseNum: 1, mandatory: true, dependsOn: [] }
  ]);
  const health = await engine.executePipelineDAG({}, {
    A: async () => { order.push('A'); return { status: 'PASSED' }; },
    B: async () => { order.push('B'); return { status: 'PASSED' }; }
  });
  assert.deepEqual(order, ['A', 'B']);
  assert.equal(health.healthy, true);
  assert.throws(() => new LifecycleEngine('cycle', [
    { id: 'A', phaseNum: 1, dependsOn: ['B'] }, { id: 'B', phaseNum: 2, dependsOn: ['A'] }
  ]), /cyclic/i);
  const implicit = new LifecycleEngine('implicit', [{ id: 'A', phaseNum: 1, mandatory: true, dependsOn: [] }]);
  await assert.rejects(implicit.executePipelineDAG({}, { A: async () => ({ summary: {} }) }), /explicit status/i);
  assert.equal(implicit.executedPhases.get('A').status, 'FAILED');
});

test('missing RAG handler is rejected before any canonical phase executes', async () => {
  const engine = new LifecycleEngine();
  let calls = 0;
  const handlers = Object.fromEntries(engine.phases.filter(phase => phase.id !== 'RAG_GROUNDING')
    .map(phase => [phase.id, async () => { calls++; return { status: 'PASSED' }; }]));
  await assert.rejects(engine.executePipelineDAG({}, handlers), /RAG_GROUNDING/);
  assert.equal(calls, 0);
});

test('quantity boundaries reject boolean, array and unsafe counts; adapters require boolean approval', () => {
  const { outputQuantities, normalizeConfiguration } = require('../../scripts/lib/boq/configuration_context.js');
  for (const quantity of [true, [1], '', 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => outputQuantities({ sku: 'P', quantity }));
    assert.throws(() => normalizeConfiguration([{ sku: 'P', quantity }]));
  }
  assert.deepEqual(outputQuantities({ sku: 'P', quantity: '2' }, 3), { perNodeQty: 2, nodeMult: 3, totalQty: 6 });
  assert.equal(contracts.adaptAcceptanceDecision({ isValid: 'false' }).isApproved, false);
  assert.equal(contracts.adaptAcceptanceDecision({ isValid: true, blockersCount: 1 }).isApproved, false);
  assert.equal(contracts.toStageResult(1, { status: 'SKIPPED', skipReason: 'optional', policyCode: 'OPTIONAL' }).outcome, 'NOT_EVALUATED');
});

test('direct upload checks signed bytes both before and after authentication', async t => {
  const { evaluation } = groundedFixture(t);
  artifacts(t, evaluation);
  const service = require('../../scripts/services/google_sheets_service.js');
  let uploads = 0;
  t.mock.method(service, 'ensureGoogleAuthValid', async () => ({ authenticated: true }));
  t.mock.method(service, 'uploadFileToGoogleSheet', async (_file, _title, options) => {
    options.beforeWrite();
    uploads++;
    return { spreadsheetId: 'controlled', spreadsheetUrl: 'https://example.invalid/controlled' };
  });
  assert.equal((await serializer.handleGoogleDriveUpload(evaluation.portalWorkbookPath, evaluation)).spreadsheetId, 'controlled');
  assert.equal(uploads, 1);
  t.mock.method(service, 'ensureGoogleAuthValid', async () => {
    fs.appendFileSync(evaluation.multiRankCsvPath, 'tampered during await');
    return { authenticated: true };
  });
  assert.equal(await serializer.handleGoogleDriveUpload(evaluation.portalWorkbookPath, evaluation), null);
  assert.equal(uploads, 1);
  // Updating a caller-editable hash cannot repair the signed receipt.
  const file = evaluation.multiRankCsvPath;
  const row = evaluation.artifactIntegrityManifest.artifacts.find(record => record.path === file);
  row.sizeBytes = fs.statSync(file).size;
  row.sha256 = hash(fs.readFileSync(file));
  assert.throws(() => serializer.assertArtifactIntegrity(evaluation), /signed artifact integrity/i);
});

test('catalog policy rejects absent profiles, missing services and tombstone-only mandatory categories', t => {
  const dir = temporary(t);
  const config = path.join(dir, 'profiles.json');
  safeWriteJsonAtomic(config, { profiles: { P: { mandatoryCategories: ['CPU'], mandatoryServicesCategories: ['Care'], minHardwareSKUs: 1, minServicesSKUs: 1, expectedWorkbookSheets: 2 } } });
  const catalog = { entries: [{ subCategory: 'CPU', skus: [{ sku: 'CPU1' }] }] };
  const services = { entries: [{ subCategory: 'Care', skus: [{ sku: 'SVC1' }] }] };
  const workbook = { SheetNames: ['Hardware', 'Services'] };
  assert.equal(validateCatalogCoverage('P', catalog, services, workbook, config).valid, true);
  assert.equal(validateCatalogCoverage('Unknown', catalog, services, workbook, config).valid, false);
  assert.equal(validateCatalogCoverage('P', catalog, {}, workbook, config).valid, false);
  catalog.entries[0].skus[0]['Diff Status'] = 'REMOVED';
  assert.equal(validateCatalogCoverage('P', catalog, services, workbook, config).valid, false);
  fs.writeFileSync(config, '{');
  assert.equal(validateCatalogCoverage('P', catalog, services, workbook, config).valid, false);
});

test('promotion replaces stale current files while retaining prior recovery snapshot and history', t => {
  const dir = temporary(t);
  const stage = path.join(dir, 'stage');
  const live = path.join(dir, 'live');
  fs.mkdirSync(path.join(stage, 'history'), { recursive: true });
  fs.mkdirSync(path.join(live, 'history'), { recursive: true });
  fs.writeFileSync(path.join(live, 'obsolete.tsv'), 'old capture');
  fs.writeFileSync(path.join(live, 'history', 'receipt.txt'), 'historical');
  fs.writeFileSync(path.join(stage, 'history', 'new_receipt.txt'), 'new history record');
  fs.writeFileSync(path.join(stage, 'current.tsv'), 'new capture');
  const result = promoteStagingDirectory(stage, live);
  assert.equal(fs.existsSync(path.join(live, 'obsolete.tsv')), false);
  // Older historical records survive even when staging already has partial history
  assert.equal(fs.readFileSync(path.join(live, 'history', 'receipt.txt'), 'utf8'), 'historical');
  assert.equal(fs.readFileSync(path.join(live, 'history', 'new_receipt.txt'), 'utf8'), 'new history record');
  assert.equal(fs.readFileSync(path.join(result.backupDir, 'obsolete.tsv'), 'utf8'), 'old capture');
  assert.equal(JSON.parse(fs.readFileSync(result.journalPath, 'utf8')).status, 'COMMITTED');
});

test('recoverUnfinishedPromotion restores baseline when promotion was interrupted after moving baseline', t => {
  const { recoverUnfinishedPromotion } = require('../../scripts/lib/system/fs_compat.js');
  const dir = temporary(t);
  const live = path.join(dir, 'live');
  const parent = dir;
  const prefix = path.join(parent, `.${path.basename(live)}.promotion`);
  const transactionId = 'test-recovery-id';
  const backup = `${prefix}.${transactionId}.previous`;
  const prepared = `${prefix}.${transactionId}.next`;
  const journalPath = `${prefix}.${transactionId}.json`;

  fs.mkdirSync(backup, { recursive: true });
  fs.writeFileSync(path.join(backup, 'data.json'), '{"baseline":true}');
  fs.writeFileSync(journalPath, JSON.stringify({
    transactionId,
    target: live,
    backup,
    prepared,
    status: 'BASELINE_MOVED'
  }));

  const recovery = recoverUnfinishedPromotion(live);
  assert.equal(recovery.recovered, true);
  assert.equal(fs.existsSync(live), true);
  assert.equal(fs.readFileSync(path.join(live, 'data.json'), 'utf8'), '{"baseline":true}');
  assert.equal(JSON.parse(fs.readFileSync(journalPath, 'utf8')).status, 'ROLLED_BACK');
});

test('skipCoverageValidation is strictly restricted to test harnesses', () => {
  const { createCaptureReceipt } = require('../../scripts/lib/catalog/catalog_capture_receipt.js');
  const origNodeEnv = process.env.NODE_ENV;
  const originalTestContext = process.env.NODE_TEST_CONTEXT;
  const origArgv = [...process.argv];
  try {
    process.env.NODE_ENV = 'production';
    delete process.env.NODE_TEST_CONTEXT;
    process.argv = ['node', 'scripts/scrapers/scrape_oca_solution.js'];
    assert.throws(
      () => createCaptureReceipt('/dummy/staging', '/dummy/live', 'TEST_PROD', { skipCoverageValidation: true }),
      /\[INV-105\] skipCoverageValidation is restricted to test harnesses only/
    );
  } finally {
    if (origNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = origNodeEnv;
    if (originalTestContext === undefined) delete process.env.NODE_TEST_CONTEXT; else process.env.NODE_TEST_CONTEXT = originalTestContext;
    process.argv = origArgv;
  }
});

test('capture receipt records exact base/selector/owner provenance and validates sheet contents', t => {
  const { createCaptureReceipt } = require('../../scripts/lib/catalog/catalog_capture_receipt.js');
  const dir = temporary(t);
  const staging = path.join(dir, 'staging');
  const live = path.join(dir, 'live');
  const rawDir = path.join(staging, 'raw_data');
  fs.mkdirSync(rawDir, { recursive: true });
  fs.mkdirSync(live, { recursive: true });

  const timestamp = new Date().toISOString();
  const rawData = {
    timestamp,
    selectedBaseSku: 'P73282-B21',
    ownerConfiguration: 'PRIMARY_COMPUTE',
    solutionDomain: 'SERVER',
    textExtractionMode: 'DYNAMIC_CDP',
    outsideTableNotesCaptured: true,
    conditionalDiscovery: 'PROBED_SELECTOR_OBSERVED',
    observedSelectors: [{ selector: 'ambient', value: '27C' }],
    url: 'https://partner.hpe.com/oca/test'
  };
  fs.writeFileSync(path.join(rawDir, 'oca_raw_data_full.json'), JSON.stringify(rawData));

  const catalog = {
    metadata: { scrapeTimestamp: timestamp, totalUniqueSKUs: 1, baseSku: 'P73282-B21', solutionDomain: 'SERVER' },
    entries: [{ subCategory: 'Processors', skus: [{ sku: 'P11111-B21', Description: 'Test CPU' }] }]
  };
  const services = {
    metadata: { scrapeTimestamp: timestamp, totalUniqueSKUs: 1 },
    entries: [{ subCategory: 'Pointnext', skus: [{ sku: 'H1111A1', Description: '3Y Tech Care' }] }]
  };
  const rules = { rules: [] };

  fs.writeFileSync(path.join(staging, 'PROD_TEST_Catalog.json'), JSON.stringify(catalog));
  fs.writeFileSync(path.join(staging, 'PROD_TEST_Services.json'), JSON.stringify(services));
  fs.writeFileSync(path.join(staging, 'PROD_TEST_Catalog_Rules.json'), JSON.stringify(rules));

  const xlsx = require('xlsx-js-style');
  const wb = xlsx.utils.book_new();
  const allSkusSheet = xlsx.utils.json_to_sheet([
    { 'Product #': 'P11111-B21', Description: 'Test CPU' },
    { 'Product #': 'H1111A1', Description: '3Y Tech Care' }
  ]);
  xlsx.utils.book_append_sheet(wb, allSkusSheet, 'All SKUs');
  const cpuSheet = xlsx.utils.json_to_sheet([{ 'Product #': 'P11111-B21', Description: 'Test CPU' }]);
  xlsx.utils.book_append_sheet(wb, cpuSheet, 'Processors');
  xlsx.writeFile(wb, path.join(staging, 'PROD_TEST_OCA_Catalog.xlsx'));

  const receipt = createCaptureReceipt(staging, live, 'PROD_TEST', { skipCoverageValidation: true });
  assert.equal(receipt.provenance.baseSku, 'P73282-B21');
  assert.equal(receipt.provenance.ownerConfiguration, 'PRIMARY_COMPUTE');
  assert.equal(receipt.provenance.solutionDomain, 'SERVER');
  assert.equal(receipt.coverage.outsideTableNotesCaptured, true);
  assert.equal(receipt.coverage.conditionalDiscovery, 'PROBED_SELECTOR_OBSERVED');
  assert.equal(receipt.sheets.length, 2);
  assert.equal(fs.existsSync(path.join(staging, 'capture_receipt.json')), true);
});

test('source recovery queue records failed purges and timeout candidates with recovery execution', t => {
  const { recordSourceRecoveryAction, processSourceRecoveryQueue, RECOVERY_QUEUE_PATH } = require('../../scripts/lib/sync/nlm_sync_client.js');
  const dir = temporary(t);
  const queueBackup = fs.existsSync(RECOVERY_QUEUE_PATH) ? fs.readFileSync(RECOVERY_QUEUE_PATH, 'utf8') : null;
  t.after(() => {
    if (queueBackup !== null) {
      safeWriteJsonAtomic(RECOVERY_QUEUE_PATH, JSON.parse(queueBackup));
    } else if (fs.existsSync(RECOVERY_QUEUE_PATH)) {
      fs.unlinkSync(RECOVERY_QUEUE_PATH);
    }
  });

  // Record a timeout candidate
  recordSourceRecoveryAction({
    sourceId: 'TIMEOUT_UNKNOWN_ID',
    notebookId: 'nb-test-1',
    canonicalSourceName: 'Test Product',
    chassisName: 'DL380_Gen12',
    status: 'AUDIT_TIMEOUT_REQUIRED',
    reason: 'Connection timed out after 600000ms'
  });

  // Record a failed purge candidate
  recordSourceRecoveryAction({
    sourceId: 'stray-source-123',
    createdThisRun: true, ownedTitle: 'owned-review-attempt', previousSourceIds: [],
    notebookId: 'nb-test-1',
    canonicalSourceName: 'Test Product',
    chassisName: 'DL380_Gen12',
    status: 'PURGE_REQUIRED',
    reason: 'Canary verification failed',
    purgeError: 'Network 503 Service Unavailable'
  });

  const queue = JSON.parse(fs.readFileSync(RECOVERY_QUEUE_PATH, 'utf8'));
  assert.ok(queue.some(item => item.sourceId === 'TIMEOUT_UNKNOWN_ID' && item.status === 'AUDIT_TIMEOUT_REQUIRED'));
  assert.ok(queue.some(item => item.sourceId === 'stray-source-123' && item.status === 'PURGE_REQUIRED'));

  // Test processing the queue with mock exec
  const configPath = path.join(dir, 'notebooks.json');
  safeWriteJsonAtomic(configPath, { notebooks: { DL380_Gen12: { notebookId: 'nb-test-1' } } });
  const deletedSources = [];
  let inventory = [{ id: 'stray-source-123', title: 'owned-review-attempt' }];
  const mockExec = (cmd, args) => {
    if (cmd === 'nlm' && args[1] === 'list') return JSON.stringify(inventory);
    if (cmd === 'nlm' && args[0] === 'source' && args[1] === 'delete') {
      deletedSources.push(args[2]);
      inventory = inventory.filter(source => source.id !== args[2]);
      return '';
    }
    throw new Error(`Unexpected mock command: ${cmd} ${args.join(' ')}`);
  };

  const processResult = processSourceRecoveryQueue('nb-test-1', process.env.PATH, mockExec, { configPath });
  assert.ok(deletedSources.includes('stray-source-123'));
  assert.ok(processResult.purged >= 1);

  const updatedQueue = JSON.parse(fs.readFileSync(RECOVERY_QUEUE_PATH, 'utf8'));
  const purgedItem = updatedQueue.find(item => item.sourceId === 'stray-source-123');
  assert.equal(purgedItem.status, 'PURGED');
  assert.ok(purgedItem.purgedAt);
});

test('serializer transactional export updates customerDisposition to PRESENTATION_READY only upon verified success', async t => {
  const dir = temporary(t);
  const reportDir = path.join(dir, 'reports');
  fs.mkdirSync(reportDir, { recursive: true });
  const outputPath = path.join(reportDir, 'test_report.md');

  const { evaluation } = groundedFixture(t);
  evaluation.customerDisposition = 'VALIDATION_REQUIRED';
  artifacts(t, evaluation);

  // Successful export
  await serializer.serializeAndExportResults({
    inputFile: 'test.csv',
    reportDir,
    outputPath,
    evalResults: evaluation,
    graph: { recommendedSolutions: [{ rank: 1, skuPartsList: [] }] },
    items: [{ sku: 'BASE', quantity: 1 }],
    JSON_MODE: true
  });

  assert.equal(evaluation.customerDisposition, 'PRESENTATION_READY');
  assert.ok(fs.existsSync(evaluation.multiRankWorkbookPath));
  assert.ok(fs.existsSync(evaluation.portalWorkbookPath));
});
