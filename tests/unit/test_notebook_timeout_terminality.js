'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const filename = path.resolve(__dirname, '../../scripts/lib/notebook/job_manager.js');
const source = fs.readFileSync(filename, 'utf8');
const clone = value => structuredClone(value);
const drain = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
function fixture() {
  let clock = 1000, writes = 0, learning = 0, telemetry = 0, aborts = 0, clears = 0;
  const store = new Map(), queue = [], diagnostics = [];
  class ClockDate extends Date { static now() { return clock; } }
  class Controller extends AbortController { abort(reason) { aborts++; super.abort(reason); } }
  const exportsModule = { exports: {} };
  const requireMock = name => {
    if (name === './query_sanitizer.js') return { sanitizeNotebookQuery: q => q, classifyQueryScenario: () => 'TEST' };
    if (name === './query_diagnostics.js') return { diagnoseNotebookFailure: (id, error) => { diagnostics.push(error); return { message: error.message }; } };
    if (name === './persistent_job_store.js') return {
      computeIdempotencyKey: () => 'fixture-idempotency-key', saveJob: job => store.set(job.jobId, clone(job)),
      getJob: id => store.has(id) ? clone(store.get(id)) : null,
      updateJob: (id, updates) => { writes++; store.set(id, { ...store.get(id), ...clone(updates) }); },
      findJobByIdempotencyKey: () => null, listActiveJobs: () => []
    };
    if (name === './knowledge_extractor.js') return { extractAndPersistLearnedDeltas: () => { learning++; return { count: 2 }; } };
    if (name === '../system/telemetry.js') return { recordNotebookConsultationTelemetry: () => telemetry++ };
    throw new Error('Unexpected dependency ' + name);
  };
  vm.runInNewContext(source, { module: exportsModule, exports: exportsModule.exports, require: requireMock,
    Date: ClockDate, Math, process: { env: {} }, AbortController: Controller,
    setImmediate: callback => queue.push(callback), setInterval: () => ({ unref() {} }), clearInterval: () => clears++ }, { filename });
  const api = exportsModule.exports;
  return { api, store, diagnostics, clock: value => clock = value,
    launch: async () => { queue.shift()(); await drain(); }, stats: () => ({ writes, learning, telemetry, aborts, clears }),
    start: execute => api.startAsyncNotebookQueryJob('fixture-notebook', 'fixture-query', { timeout: 100, context: { chassis: 'Fixture', chassisDir: 'fixture-dir', learningEligible: true } }, execute) };
}
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
const grounded = () => ({ answer: 'grounded answer', source: 'NOTEBOOK_LM_CLOUD', citations: [{ title: 'QuickSpecs' }], isCloudGrounded: true, groundingVerification: 'VERIFIED_GROUNDED' });

for (const outcome of ['success', 'rejection']) {
  test('timeout aborts locally; late ' + outcome + ' cannot overwrite FAILED or learn/telemetry', async () => {
    const f = fixture(), pending = deferred(); let signal;
    const { jobId } = f.start((id, query, options) => { signal = options.signal; return pending.promise; });
    await f.launch(); f.clock(1200);
    assert.equal(f.api.getAsyncNotebookQueryJobStatus(jobId).status, 'FAILED');
    assert.equal(signal.aborted, true); assert.strictEqual(signal.reason, f.diagnostics[0]);
    assert.match(signal.reason.message, /deadline exceeded/);
    const persisted = clone(f.store.get(jobId)), before = f.stats();
    if (outcome === 'success') pending.resolve(grounded()); else pending.reject(new Error('late rejection'));
    await drain();
    assert.deepEqual(f.store.get(jobId), persisted); assert.equal(f.stats().writes, before.writes);
    assert.equal(f.stats().learning, 0); assert.equal(f.stats().telemetry, 0); assert.equal(f.stats().aborts, 1);
    assert.equal(f.api.activeAbortControllers.size, 0); assert.equal(f.stats().clears, 1);
    assert.equal(f.api.getAsyncNotebookQueryJobStatus(jobId).status, 'FAILED');
    assert.equal(f.api.cancelNotebookQueryJob(jobId), false); assert.equal(f.stats().aborts, 1);
  });
}

for (const outcome of ['success', 'rejection']) {
  test('cancel remains terminal after late ' + outcome + ' and aborts once', async () => {
    const f = fixture(), pending = deferred(); let signal;
    const { jobId } = f.start((id, query, options) => { signal = options.signal; return pending.promise; });
    await f.launch(); assert.equal(f.api.cancelNotebookQueryJob(jobId, 'CLIENT_REQUEST'), true);
    assert.equal(f.api.cancelNotebookQueryJob(jobId, 'DUPLICATE'), false);
    assert.equal(signal.aborted, true); assert.match(signal.reason.message, /CLIENT_REQUEST/);
    const persisted = clone(f.store.get(jobId)), before = f.stats();
    if (outcome === 'success') pending.resolve(grounded()); else pending.reject(new Error('late reject'));
    await drain(); assert.deepEqual(f.store.get(jobId), persisted); assert.equal(f.stats().writes, before.writes);
    assert.equal(f.stats().learning, 0); assert.equal(f.stats().telemetry, 0); assert.equal(f.stats().aborts, 1);
    assert.equal(f.api.activeAbortControllers.size, 0); assert.equal(f.stats().clears, 1);
  });
}

test('deadline before scheduled execution aborts without invoking query', async () => {
  const f = fixture(); let calls = 0;
  const { jobId } = f.start(() => { calls++; return grounded(); });
  f.clock(1200); assert.equal(f.api.getAsyncNotebookQueryJobStatus(jobId).status, 'FAILED');
  await f.launch(); assert.equal(calls, 0); assert.equal(f.stats().aborts, 1);
  assert.equal(f.api.activeAbortControllers.size, 0); assert.equal(f.stats().clears, 1);
});

for (const [name, response, status, learns] of [
  ['grounded success', grounded(), 'COMPLETED', 1],
  ['local fallback', { answer: 'local', source: 'LOCAL_RAG_FALLBACK' }, 'LOCAL_FALLBACK', 0],
  ['fallback error', { source: 'FALLBACK_ERROR', error: 'cloud unavailable' }, 'FAILED', 0]
]) {
  test('normal ' + name + ' preserves existing completion behavior', async () => {
    const f = fixture(), { jobId } = f.start(() => response); await f.launch();
    const job = f.api.getAsyncNotebookQueryJobStatus(jobId);
    assert.equal(job.status, status); assert.equal(job.answer, response.answer || '');
    assert.equal(f.stats().learning, learns); assert.equal(f.stats().telemetry, 1);
    assert.equal(f.stats().aborts, 0); assert.equal(f.api.activeAbortControllers.size, 0);
    if (learns) assert.equal(job.result.learnedDeltasCount, 2);
  });
}

test('synchronous query throw enters persisted FAILED catch and cleanup', async () => {
  const f = fixture(), error = new Error('synchronous query failure');
  const { jobId } = f.start(() => { throw error; }); await f.launch();
  const job = f.api.getAsyncNotebookQueryJobStatus(jobId);
  assert.equal(job.status, 'FAILED'); assert.equal(job.error, error.message); assert.strictEqual(f.diagnostics[0], error);
  assert.equal(f.stats().learning, 0); assert.equal(f.stats().telemetry, 0);
  assert.equal(f.api.activeAbortControllers.size, 0); assert.equal(f.stats().clears, 1);
});

test('all existing terminal statuses suppress late success and rejection promotion', async () => {
  for (const status of ['COMPLETED', 'CLOUD_VERIFIED', 'LOCAL_FALLBACK', 'FAILED', 'CANCELLED']) {
    for (const reject of [false, true]) {
      const f = fixture(), pending = deferred(), { jobId } = f.start(() => pending.promise); await f.launch();
      f.store.get(jobId).status = status;
      if (reject) pending.reject(new Error('late')); else pending.resolve(grounded());
      await drain(); assert.equal(f.store.get(jobId).status, status); assert.equal(f.stats().writes, 0);
      assert.equal(f.stats().learning, 0); assert.equal(f.stats().telemetry, 0);
    }
  }
});
