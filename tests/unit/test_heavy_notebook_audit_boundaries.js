'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { nlmEnvironment, sourceOperationTimeout } = require('../../scripts/lib/notebook/nlm_transport');

test('explicit HTTP transport overrides inherited CDP; mutations never use read transport', t => {
  const previous = process.env.NLM_SYNC_READ_TRANSPORT;
  const inherited = process.env.NOTEBOOKLM_RPC_TRANSPORT;
  t.after(() => {
    for (const [key, value] of [['NLM_SYNC_READ_TRANSPORT', previous], ['NOTEBOOKLM_RPC_TRANSPORT', inherited]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
  process.env.NOTEBOOKLM_RPC_TRANSPORT = 'cdp';
  process.env.NLM_SYNC_READ_TRANSPORT = 'httpx';
  assert.equal(nlmEnvironment('fixture', true).NOTEBOOKLM_RPC_TRANSPORT, 'httpx');
  process.env.NLM_SYNC_READ_TRANSPORT = 'cdp';
  assert.equal(nlmEnvironment('fixture', true).NOTEBOOKLM_RPC_TRANSPORT, 'cdp');
  assert.equal(nlmEnvironment('fixture').NOTEBOOKLM_RPC_TRANSPORT, 'httpx');
});

test('source timeout supports heavy notebooks but respects deadline and cancellation', () => {
  assert.equal(sourceOperationTimeout({ sourceTimeoutMs: 600000 }), 600000);
  assert.ok(sourceOperationTimeout({ sourceTimeoutMs: 600000, deadlineAt: Date.now() + 2000 }) <= 2000);
  assert.throws(() => sourceOperationTimeout({ deadlineAt: Date.now() - 1 }), /deadline/);
  assert.throws(() => sourceOperationTimeout({ sourceTimeoutMs: NaN }), /positive/);
  const controller = new AbortController(); controller.abort(new Error('cancelled'));
  assert.throws(() => sourceOperationTimeout({ signal: controller.signal }), /cancelled/);
});

function loadWithInternal(relative, internal, mocks = {}) {
  const filename = path.resolve(__dirname, '../../', relative);
  const localRequire = createRequire(filename);
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8') + `\nmodule.exports.auditInternal = ${internal};`, {
    module, exports: module.exports, require: name => mocks[name] || localRequire(name),
    __dirname: path.dirname(filename), process, console, Buffer, Date
  }, { filename });
  return module.exports;
}

test('missing and empty physical validators cannot certify candidates', () => {
  const api = loadWithInternal('scripts/lib/conflict/strategy_synthesizer.js', 'revalidateCandidateParts');
  for (const validateMath of [undefined, () => null, () => undefined]) {
    const result = api.auditInternal([], {}, () => 0, null, '', { validateMath });
    assert.equal(result.physicalMathClean, false);
    assert.ok(result.aspectErrors.length);
  }
});

test('cascading dependencies are rechecked to convergence and capped without false PASS', () => {
  const api = loadWithInternal('scripts/lib/conflict/strategy_synthesizer.js', 'revalidateCandidateParts');
  let calls = 0;
  const result = api.auditInternal([], {}, () => 1, null, '', { validateMath: parts => {
    calls++;
    return parts.length < 3 ? { isMathClean: false, errors: [], missingDependencies: [{ sku: `P1000${parts.length}-B21`, quantity: 1 }] } : { isMathClean: true, errors: [] };
  } });
  assert.equal(calls, 4);
  assert.equal(result.physicalMathClean, true);
  const endless = api.auditInternal([], {}, () => 1, null, '', { validateMath: parts => ({ isMathClean: true, missingDependencies: [{ sku: `P2000${parts.length}-B21`, quantity: 1 }] }) });
  assert.equal(endless.physicalMathClean, false);
  assert.equal(endless.parts.length, 8);
  assert.match(endless.aspectErrors[0], /iteration limit/);
});

test('empty inventory after uncertain upload stays pending, never purged', () => {
  let queue = [{ notebookId: 'nb', chassisName: 'PRODUCT', status: 'AUDIT_TIMEOUT_REQUIRED', sourceId: 'TIMEOUT_UNKNOWN_ID', ownedTitle: 'unique', previousSourceIds: [] }];
  const api = loadWithInternal('scripts/lib/sync/nlm_sync_client.js', 'processSourceRecoveryQueue', {
    fs: { existsSync: () => true, readFileSync: p => String(p).endsWith('config.json') ? JSON.stringify({ notebooks: { PRODUCT: { notebookId: 'nb' } } }) : JSON.stringify(queue) },
    '../system/fs_compat.js': { safeWriteJsonAtomic: (p, value) => { queue = value; } },
    '../system/workflow_lease.js': { acquireWorkflowLease: () => () => {} }
  });
  const result = api.auditInternal('nb', 'fixture', () => '[]', { configPath: 'config.json' });
  assert.equal(result.purged, 0);
  assert.equal(result.pending, 1);
  assert.equal(queue[0].status, 'AUDIT_TIMEOUT_REQUIRED');
});

test('ephemeral upload timeout is recorded before dispatch and remains recoverable', () => {
  const actions = [], calls = [];
  const api = loadWithInternal('scripts/lib/sync/nlm_solution_source_validator.js', 'attachSolutionSource', {
    fs: { existsSync: () => true, readFileSync: () => JSON.stringify({ notebooks: { PRODUCT: { notebookId: 'nb' } } }) },
    child_process: { execFileSync: (exe, args, options) => {
      calls.push({ args, options });
      if (args[1] === 'list') return '[]';
      assert.equal(actions[0].status, 'UPLOAD_IN_FLIGHT');
      throw new Error('ETIMEDOUT');
    } },
    './nlm_sync_client.js': {
      processSourceRecoveryQueue: () => {},
      recordSourceRecoveryAction: entry => { actions.push(entry); return 'attempt'; },
      updateSourceRecoveryAction: (id, changes) => actions.push(changes)
    }
  });
  const result = api.auditInternal('nb', 'fixture.csv', 'unique-title', { sourceTimeoutMs: 500000 });
  assert.equal(result.success, false);
  assert.equal(result.recoveryAttemptId, 'attempt');
  assert.equal(actions[1].status, 'AUDIT_TIMEOUT_REQUIRED');
  assert.equal(actions[1].ownerPid, null);
  assert.equal(calls[1].options.timeout, 500000);
  assert.equal(calls[1].options.env.NOTEBOOKLM_RPC_TRANSPORT, 'httpx');
});

test('recovery never removes an ephemeral source owned by a live query process', () => {
  let queue = [{ notebookId: 'nb', status: 'EPHEMERAL_IN_USE', ownerPid: process.pid }];
  const api = loadWithInternal('scripts/lib/sync/nlm_sync_client.js', 'processSourceRecoveryQueue', {
    fs: { existsSync: () => true, readFileSync: p => String(p).endsWith('config.json') ? '{}' : JSON.stringify(queue) },
    '../system/fs_compat.js': { safeWriteJsonAtomic: (p, value) => { queue = value; } },
    '../system/workflow_lease.js': { acquireWorkflowLease: () => () => {} }
  });
  const result = api.auditInternal('nb', 'fixture', () => { throw new Error('Must not contact remote source'); }, { configPath: 'config.json' });
  assert.equal(result.pending, 1);
  assert.equal(result.purged, 0);
  assert.equal(queue[0].lastPurgeError, undefined);
});

test('postflight never converts local sync success or stale summary into verified receipt', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'postflight-audit-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const catalog = path.join(dir, 'catalog.json');
  require('../../scripts/lib/system/fs_compat').safeWriteJsonAtomic(catalog, { entries: [], metadata: {} });
  const { runScrapingPostflightVerification } = require('../../scripts/lib/scraper/scraping_preflight_gate');
  const args = { liveOutputDir: dir, liveCatalogJson: catalog, meta: { cleanName: 'Fixture' }, preflightReport: { pass: true } };
  for (const sync of [{ success: true }, { success: true, syncStatus: 'LOCAL_PAYLOAD_ONLY' }, { success: false }]) {
    const receipt = runScrapingPostflightVerification({ ...args, postFlowSyncResult: sync });
    assert.equal(receipt.postflight.pass, false);
    assert.notEqual(receipt.postflight.cloudSyncState, 'CLOUD_VERIFIED');
  }
  const summary = path.join(dir, 'Fixture_Catalog_Diff_Summary.md');
  fs.unlinkSync(summary); fs.mkdirSync(summary);
  const receipt = runScrapingPostflightVerification({ ...args, postFlowSyncResult: { success: true, syncStatus: 'CLOUD_VERIFIED' } });
  assert.equal(receipt.postflight.pass, false);
  assert.equal(receipt.postflight.diffSummaryPresent, false);
  assert.ok(receipt.postflight.diffSummaryError);
});
