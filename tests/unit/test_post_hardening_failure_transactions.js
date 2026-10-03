'use strict';
// Gemini owns execution of these regression cases; Codex performs static checks.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { safeWriteJsonAtomic, recoverUnfinishedPromotion, promoteStagingDirectory } = require('../../scripts/lib/system/fs_compat');
const { acquireWorkflowLease } = require('../../scripts/lib/system/workflow_lease');

function temporary(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'transaction-review-'));
  t.after(() => {
    const resolved = path.resolve(dir);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('transaction-review-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  return dir;
}

test('four-artifact publication is one directory commit and preserves a prior generation on failure', t => {
  const { _executeStagedFileAtomicity: publish } = require('../../scripts/lib/boq/eval_output_serializer');
  const dir = temporary(t), stage = path.join(dir, '.stage'), generation = path.join(dir, 'generation');
  fs.mkdirSync(stage);
  const previous = path.join(dir, 'previous');
  fs.mkdirSync(previous);
  const artifacts = ['a.xlsx', 'b.csv', 'c.md', 'd.xlsx'].map(name => {
    fs.writeFileSync(path.join(stage, name), 'new-' + name);
    fs.writeFileSync(path.join(previous, name), 'old-' + name);
    return { staging: path.join(stage, name), target: path.join(generation, name) };
  });
  const rename = fs.renameSync;
  try {
    fs.renameSync = () => { throw new Error('injected commit failure'); };
    assert.throws(() => publish(artifacts, stage), /injected commit failure/);
  } finally { fs.renameSync = rename; }
  assert.equal(fs.existsSync(generation), false);
  for (const item of artifacts) assert.equal(fs.readFileSync(path.join(previous, path.basename(item.target)), 'utf8'), 'old-' + path.basename(item.target));
  publish(artifacts, stage);
  assert.equal(fs.existsSync(stage), false);
  assert.equal(fs.readdirSync(generation).length, 4);
});

test('promotion recovery rejects escaped journal paths and preserves an active owner lease', t => {
  const dir = temporary(t), target = path.join(dir, 'live');
  const identity = path.join(dir, '.live.promotion.test-id');
  const outside = path.join(dir, 'unrelated');
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, 'keep'), 'preserve');
  const journal = { transactionId: 'test-id', target, backup: outside, prepared: identity + '.next', status: 'PREPARED' };
  safeWriteJsonAtomic(identity + '.json', journal);
  assert.throws(() => recoverUnfinishedPromotion(target), /Invalid promotion journal paths/);
  assert.equal(fs.readFileSync(path.join(outside, 'keep'), 'utf8'), 'preserve');
  const name = 'promotion-' + crypto.createHash('sha256').update(target.toLowerCase()).digest('hex').slice(0, 24);
  const release = acquireWorkflowLease(name, path.join(dir, '.promotion-locks'));
  try { assert.throws(() => recoverUnfinishedPromotion(target), /lease|active|running|owned/i); }
  finally { release(); }
});

test('promotion recovery restores baseline when a crash precedes BASELINE_MOVED journal persistence', t => {
  const dir = temporary(t), target = path.join(dir, 'live'), identity = path.join(dir, '.live.promotion.test-id');
  fs.mkdirSync(identity + '.previous');
  fs.mkdirSync(identity + '.next');
  fs.writeFileSync(path.join(identity + '.previous', 'baseline'), 'old');
  safeWriteJsonAtomic(identity + '.json', { transactionId: 'test-id', target, backup: identity + '.previous', prepared: identity + '.next', status: 'PREPARED' });
  assert.equal(recoverUnfinishedPromotion(target).recovered, true);
  assert.equal(fs.readFileSync(path.join(target, 'baseline'), 'utf8'), 'old');
  assert.equal(fs.existsSync(identity + '.next'), true);
});

test('canonical warning phases continue diagnostics while strict warning prerequisites block', () => {
  const { LifecycleEngine } = require('../../scripts/lib/lifecycle/lifecycle_engine');
  const engine = new LifecycleEngine();
  for (const id of ['INGESTION', 'FINGERPRINTING']) {
    engine.startPhase(id); engine.completePhase(id, 'PASSED');
  }
  engine.startPhase('DOMAIN_ASPECTS');
  engine.completePhase('DOMAIN_ASPECTS', 'PASSED', {}, [], ['catalog advisory']);
  assert.equal(engine.executedPhases.get('DOMAIN_ASPECTS').status, 'WARNED');
  assert.doesNotThrow(() => engine.startPhase('CONFLICT_GRAPH'));
  const strict = new LifecycleEngine('strict', [
    { id: 'A', phaseNum: 1, mandatory: true }, { id: 'B', phaseNum: 2, dependsOn: ['A'] }
  ]);
  strict.startPhase('A'); strict.completePhase('A', 'PASSED', {}, [], ['warning']);
  assert.throws(() => strict.startPhase('B'), /blocked/);
});

test('capture rejects absent provenance, header-only sheets and service omissions with a valid control', t => {
  const { createCaptureReceipt } = require('../../scripts/lib/catalog/catalog_capture_receipt');
  const xlsx = require('xlsx-js-style');
  const dir = temporary(t), stage = path.join(dir, 'stage'), live = path.join(dir, 'live');
  fs.mkdirSync(path.join(stage, 'raw_data'), { recursive: true });
  const product = 'REVIEW_PRODUCT', timestamp = new Date().toISOString();
  safeWriteJsonAtomic(path.join(stage, product + '_Catalog.json'), { metadata: { scrapeTimestamp: timestamp, totalUniqueSKUs: 1 }, entries: [{ subCategory: 'CPU', skus: [{ sku: 'CPU-1' }] }] });
  safeWriteJsonAtomic(path.join(stage, product + '_Services.json'), { entries: [{ subCategory: 'Support', skus: [{ sku: 'SERVICE-1' }] }] });
  safeWriteJsonAtomic(path.join(stage, product + '_Catalog_Rules.json'), { rules: [] });
  const profilesPath = path.join(dir, 'profiles.json');
  safeWriteJsonAtomic(profilesPath, { profiles: { [product]: { mandatoryCategories: ['CPU'], mandatoryServicesCategories: ['Support'] } } });
  const rawPath = path.join(stage, 'raw_data/oca_raw_data_full.json');
  const raw = { timestamp, selectedBaseSku: 'BASE-1', ownerConfiguration: 'OWNER-1', solutionDomain: 'SERVER', observedSelectors: [{ selector: 'ambient', value: 27 }], finalSelectorsRestored: true };
  const writeWorkbook = rows => {
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(rows), 'All SKUs');
    xlsx.writeFile(workbook, path.join(stage, product + '_OCA_Catalog.xlsx'));
  };
  const completeRows = [['Product #'], ['CPU-1'], ['SERVICE-1']];
  writeWorkbook(completeRows); safeWriteJsonAtomic(rawPath, raw);
  assert.equal(createCaptureReceipt(stage, live, product, { profilesPath }).status, 'STAGING_AUDITED');
  safeWriteJsonAtomic(rawPath, { ...raw, ownerConfiguration: null });
  assert.throws(() => createCaptureReceipt(stage, live, product, { profilesPath }), /OWNER_NOT_OBSERVED/);
  safeWriteJsonAtomic(rawPath, raw); writeWorkbook([['Product #']]);
  assert.throws(() => createCaptureReceipt(stage, live, product, { profilesPath }), /empty/);
  writeWorkbook([['Product #'], ['CPU-1']]);
  assert.throws(() => createCaptureReceipt(stage, live, product, { profilesPath }), /missing catalog SKUs/);
});

test('source cleanup protects active sources and discovers uniquely owned timeout candidates', t => {
  const { recordSourceRecoveryAction, processSourceRecoveryQueue, RECOVERY_QUEUE_PATH } = require('../../scripts/lib/sync/nlm_sync_client');
  const dir = temporary(t), configPath = path.join(dir, 'config.json');
  const prior = fs.existsSync(RECOVERY_QUEUE_PATH) ? fs.readFileSync(RECOVERY_QUEUE_PATH, 'utf8') : null;
  t.after(() => {
    if (prior !== null) safeWriteJsonAtomic(RECOVERY_QUEUE_PATH, JSON.parse(prior));
    else if (fs.existsSync(RECOVERY_QUEUE_PATH)) fs.unlinkSync(RECOVERY_QUEUE_PATH);
  });
  safeWriteJsonAtomic(RECOVERY_QUEUE_PATH, []);
  safeWriteJsonAtomic(configPath, { notebooks: { PRODUCT: { notebookId: 'review-notebook', lastSyncedSourceId: 'active' } } });
  const common = { notebookId: 'review-notebook', chassisName: 'PRODUCT', previousSourceIds: [], createdThisRun: true, status: 'PURGE_REQUIRED' };
  recordSourceRecoveryAction({ ...common, sourceId: 'active', ownedTitle: 'active-title' });
  recordSourceRecoveryAction({ ...common, sourceId: 'TIMEOUT_UNKNOWN_ID', ownedTitle: 'unique-attempt' });
  let sources = [{ id: 'active', title: 'active-title' }, { id: 'new', title: 'unique-attempt' }];
  const deleted = [];
  const exec = (command, args) => {
    assert.equal(command, 'nlm');
    if (args[1] === 'list') return JSON.stringify(sources);
    if (args[1] === 'delete') { deleted.push(args[2]); sources = sources.filter(source => source.id !== args[2]); return ''; }
    throw new Error('Unexpected command');
  };
  const result = processSourceRecoveryQueue('review-notebook', process.env.PATH, exec, { configPath });
  assert.deepEqual(deleted, ['new']);
  assert.equal(result.purged, 1); assert.equal(result.pending, 1);
});

test('Sheet backup failure prevents writes and readback failure restores formulas', async t => {
  const { replaceGoogleSheetWorkbook } = require('../../scripts/lib/sync/google_sheets_writer');
  const dir = temporary(t), datasets = { catalogRows: [['SKU']], learningRows: [['Learning']], changeRows: [['Change']], metadataRows: [['Key']] };
  const original = [{ properties: { sheetId: 1, title: 'Certified Catalog', gridProperties: { rowCount: 1000, columnCount: 26 } }, data: [{ rowData: [{ values: [{ userEnteredValue: { formulaValue: '=1+1' } }] }] }] }];
  let posts = 0;
  const unavailable = { request: async request => {
    if (request.method === 'POST') posts++;
    if (request.url.includes('includeGridData')) throw new Error('backup unavailable');
    return { data: { sheets: original } };
  } };
  await assert.rejects(replaceGoogleSheetWorkbook('backup-failure', datasets, { client: unavailable, backupDir: dir }), /backup unavailable/);
  assert.equal(posts, 0);
  const batches = [];
  const client = { request: async request => {
    if (request.method === 'POST') { batches.push(request.data.requests); return { data: {} }; }
    if (request.url.includes('values:batchGet')) return { data: { valueRanges: [] } };
    return { data: { sheets: original } };
  } };
  await assert.rejects(replaceGoogleSheetWorkbook('rollback-formula', datasets, { client, backupDir: dir }), error => {
    assert.equal(error.rollbackVerified, true);
    assert.equal(JSON.parse(fs.readFileSync(error.backupFile, 'utf8')).rollbackStatus, 'RESTORED');
    return /readback mismatch/.test(error.message);
  });
  assert.equal(batches.length, 2);
  assert.ok(batches[1].some(request => request.updateCells?.rows?.[0]?.values?.[0]?.userEnteredValue?.formulaValue === '=1+1'));
  const successful = { request: async request => {
    if (request.url.includes('values:batchGet')) return { data: { valueRanges: Object.values(datasets).map(values => ({ values })) } };
    if (request.method === 'POST') return { data: {} };
    return { data: { sheets: original } };
  } };
  const result = await replaceGoogleSheetWorkbook('valid-control', datasets, { client: successful, backupDir: dir });
  assert.equal(result.readbackVerified, true);
  assert.equal(result.success, true);
  let failedPosts = 0;
  const rollbackFailure = { request: async request => {
    if (request.method === 'POST') {
      failedPosts++;
      if (failedPosts === 2) throw new Error('provider rollback failure');
      return { data: {} };
    }
    if (request.url.includes('values:batchGet')) return { data: { valueRanges: [] } };
    return { data: { sheets: original } };
  } };
  await assert.rejects(replaceGoogleSheetWorkbook('pending-recovery', datasets, { client: rollbackFailure, backupDir: dir }), error => {
    assert.equal(error.rollbackVerified, false);
    assert.equal(JSON.parse(fs.readFileSync(error.backupFile, 'utf8')).rollbackStatus, 'RECOVERY_REQUIRED');
    return /provider rollback failure/.test(error.message);
  });
});

test('promoteStagingDirectory executes production promotion recovery and handles crash during COMMITTED journal persistence', t => {
  const dir = temporary(t), live = path.join(dir, 'live'), stage = path.join(dir, 'stage');
  fs.mkdirSync(live); fs.writeFileSync(path.join(live, 'old-file'), 'v1');
  fs.mkdirSync(stage); fs.writeFileSync(path.join(stage, 'new-file'), 'v2');

  const identity = path.join(dir, '.live.promotion.prior-crash');
  fs.mkdirSync(identity + '.previous');
  fs.writeFileSync(path.join(identity + '.previous', 'old-file'), 'v1');
  fs.mkdirSync(identity + '.next');
  fs.writeFileSync(path.join(identity + '.next', 'partial-file'), 'v_partial');
  safeWriteJsonAtomic(identity + '.json', {
    transactionId: 'prior-crash',
    target: live,
    backup: identity + '.previous',
    prepared: identity + '.next',
    status: 'BASELINE_MOVED'
  });
  if (fs.existsSync(live)) fs.rmSync(live, { recursive: true, force: true });

  const result = promoteStagingDirectory(stage, live);
  assert.equal(result.success, true);
  assert.equal(fs.readFileSync(path.join(live, 'new-file'), 'utf8'), 'v2');

  const crashId = path.join(dir, '.live.promotion.committed-crash');
  fs.mkdirSync(crashId + '.previous');
  fs.writeFileSync(path.join(crashId + '.previous', 'old-file'), 'v1-baseline');
  safeWriteJsonAtomic(crashId + '.json', {
    transactionId: 'committed-crash',
    target: live,
    backup: crashId + '.previous',
    prepared: crashId + '.next',
    status: 'BASELINE_MOVED'
  });
  const rec = recoverUnfinishedPromotion(live);
  assert.equal(rec.recovered, true);
  assert.equal(fs.readFileSync(path.join(live, 'old-file'), 'utf8'), 'v1-baseline');
  assert.equal(fs.existsSync(crashId + '.next'), true);
});

test('promotion recovery handles first-capture rollback when no baseline existed', t => {
  const dir = temporary(t), live = path.join(dir, 'live');
  const identity = path.join(dir, '.live.promotion.first-capture');
  fs.mkdirSync(live);
  fs.writeFileSync(path.join(live, 'first-item'), 'first');
  safeWriteJsonAtomic(identity + '.json', {
    transactionId: 'first-capture',
    target: live,
    backup: identity + '.previous',
    prepared: identity + '.next',
    baselineExisted: false,
    status: 'PREPARED'
  });
  const rec = recoverUnfinishedPromotion(live);
  assert.equal(rec.recovered, true);
  assert.equal(fs.existsSync(live), false);
  assert.equal(fs.existsSync(identity + '.next'), true);
  assert.equal(fs.readFileSync(path.join(identity + '.next', 'first-item'), 'utf8'), 'first');
});

test('source recovery queue handles protected sources, ambiguous candidate timeout discoveries, and queue quarantine on corruption', t => {
  const { recordSourceRecoveryAction, processSourceRecoveryQueue, readRecoveryQueue, RECOVERY_QUEUE_PATH } = require('../../scripts/lib/sync/nlm_sync_client');
  const dir = temporary(t), configPath = path.join(dir, 'config.json');
  const prior = fs.existsSync(RECOVERY_QUEUE_PATH) ? fs.readFileSync(RECOVERY_QUEUE_PATH, 'utf8') : null;
  t.after(() => {
    if (prior !== null) safeWriteJsonAtomic(RECOVERY_QUEUE_PATH, JSON.parse(prior));
    else if (fs.existsSync(RECOVERY_QUEUE_PATH)) fs.unlinkSync(RECOVERY_QUEUE_PATH);
  });

  safeWriteJsonAtomic(RECOVERY_QUEUE_PATH, []);
  fs.writeFileSync(RECOVERY_QUEUE_PATH, '{ not an array or valid json', 'utf8');
  assert.throws(() => readRecoveryQueue(), /Recovery queue quarantined/);
  const files = fs.readdirSync(path.dirname(RECOVERY_QUEUE_PATH));
  assert.ok(files.some(f => f.startsWith('source_recovery_queue.json.corrupt-')));
  for (const f of files.filter(f => f.startsWith('source_recovery_queue.json.corrupt-'))) {
    fs.unlinkSync(path.join(path.dirname(RECOVERY_QUEUE_PATH), f));
  }

  safeWriteJsonAtomic(RECOVERY_QUEUE_PATH, []);
  safeWriteJsonAtomic(configPath, { notebooks: { PRODUCT: { notebookId: 'review-notebook', lastSyncedSourceId: 'active-source' } } });
  const common = { notebookId: 'review-notebook', chassisName: 'PRODUCT', previousSourceIds: [], createdThisRun: true, status: 'PURGE_REQUIRED' };
  recordSourceRecoveryAction({ ...common, sourceId: 'TIMEOUT_UNKNOWN_ID', ownedTitle: 'ambiguous-title' });
  const ambiguousSources = [
    { id: 'source-1', title: 'ambiguous-title' },
    { id: 'source-2', title: 'ambiguous-title' }
  ];
  let deleted = [];
  const exec = (command, args) => {
    if (args[1] === 'list') return JSON.stringify(ambiguousSources);
    if (args[1] === 'delete') { deleted.push(args[2]); return ''; }
    throw new Error('Unexpected');
  };
  const ambiguousResult = processSourceRecoveryQueue('review-notebook', process.env.PATH, exec, { configPath });
  assert.equal(deleted.length, 0);
  assert.equal(ambiguousResult.pending, 1);
  const queueAfterAmbiguous = JSON.parse(fs.readFileSync(RECOVERY_QUEUE_PATH, 'utf8'));
  assert.ok(/ambiguous/i.test(queueAfterAmbiguous[0].lastPurgeError));

  safeWriteJsonAtomic(RECOVERY_QUEUE_PATH, []);
  recordSourceRecoveryAction({ ...common, sourceId: 'active-source', ownedTitle: 'active-source-title' });
  const protectedSources = [{ id: 'active-source', title: 'active-source-title' }];
  const protectedResult = processSourceRecoveryQueue('review-notebook', process.env.PATH, (cmd, args) => {
    if (args[1] === 'list') return JSON.stringify(protectedSources);
    if (args[1] === 'delete') throw new Error('Should not delete protected source');
    return '';
  }, { configPath });
  assert.equal(protectedResult.purged, 0);
  const queueAfterProtected = JSON.parse(fs.readFileSync(RECOVERY_QUEUE_PATH, 'utf8'));
  assert.ok(/protected|active/i.test(queueAfterProtected[0].lastPurgeError));

  safeWriteJsonAtomic(RECOVERY_QUEUE_PATH, []);
  recordSourceRecoveryAction({ ...common, sourceId: 'old-source-id', previousSourceIds: ['old-source-id'], ownedTitle: 'old-title' });
  const preexistingSources = [{ id: 'old-source-id', title: 'old-title' }];
  const preResult = processSourceRecoveryQueue('review-notebook', process.env.PATH, (cmd, args) => {
    if (args[1] === 'list') return JSON.stringify(preexistingSources);
    return '';
  }, { configPath });
  assert.equal(preResult.purged, 0);
  const queueAfterPre = JSON.parse(fs.readFileSync(RECOVERY_QUEUE_PATH, 'utf8'));
  assert.ok(/Pre-existing/i.test(queueAfterPre[0].lastPurgeError));
});
