'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const cp = require('node:child_process');
const { getEventListeners } = require('node:events');
const root = path.resolve(__dirname, '../..');
const notebook = '12345678-1234-1234-1234-123456789abc';
const logger = { info() {}, warn() {}, error() {} };
function queryHarness(execute) {
  const stats = { attempts: 0, fallback: 0 };
  const module = { exports: {} };
  const filename = path.join(root, 'scripts/lib/notebook/notebook_query_utils.js');
  const mockRequire = dependency => {
    if (dependency === 'child_process') return { execFile(...args) { stats.attempts++; return execute(...args); } };
    if (dependency === 'fs') return { existsSync: () => false, readFileSync: () => JSON.stringify({ notebooks: { Demo: { notebookId: notebook, officialSourceIds: ['official'] } } }) };
    if (dependency.includes('query_sanitizer')) return { sanitizeNotebookQuery: query => query };
    if (dependency.includes('query_diagnostics')) return { postProcessNotebookResult: JSON.parse, diagnoseNotebookFailure: () => ({ rootCause: 'ordinary' }) };
    if (dependency.includes('job_manager') || dependency.includes('knowledge_extractor')) return {};
    if (dependency.includes('pipeline_logger')) return logger;
    if (dependency.includes('local_rag_search')) return { queryLocalKnowledgeBase() { stats.fallback++; return { answer: 'fallback' }; } };
    if (dependency.includes('fs_compat')) return { safeWriteJsonAtomic() {} };
    return require(dependency);
  };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { module, exports: module.exports, require: mockRequire, __dirname: path.dirname(filename), process: { env: {}, platform: process.platform }, Date, setTimeout, clearTimeout, setInterval, clearInterval });
  return { run: module.exports.executeNotebookQuery, stats };
}
test('active native AbortSignal preserves six exact reason identities and ignores late failure', async () => {
  for (const reason of [false, 0, '', NaN, null, Object.freeze({ code: 'PEER_ABORT' })]) {
    let callback;
    const controller = new AbortController();
    const harness = queryHarness((executable, args, options, cb) => { assert.equal(options.signal, controller.signal); callback = cb; });
    const pending = harness.run(notebook, 'whole manifest', { signal: controller.signal });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(typeof callback, 'function');
    controller.abort(reason);
    await assert.rejects(pending, error => Object.is(error, reason));
    callback(new Error('503 late failure'), '', 'late');
    assert.equal(harness.stats.attempts, 1);
    assert.equal(harness.stats.fallback, 0);
    assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
  }
});
test('actual local execFile deadline kills harmless child and rejects expiry without retry/fallback', async () => {
  let closed;
  let timeout;
  const controller = new AbortController();
  const harness = queryHarness((executable, args, options, callback) => {
    timeout = options.timeout;
    const child = cp.execFile(process.execPath, ['-e', 'setTimeout(() => {}, 5000)'], options, callback);
    closed = new Promise(resolve => child.once('close', (code, signal) => resolve({ code, signal })));
    return child;
  });
  const started = Date.now();
  await assert.rejects(harness.run(notebook, 'whole manifest', { signal: controller.signal, deadlineAt: started + 150, timeout: 120000 }), error => error.code === 'NOTEBOOK_QUERY_DEADLINE_EXCEEDED');
  const outcome = await closed;
  assert.ok(timeout > 0 && timeout <= 150);
  assert.ok(Date.now() - started < 2000);
  assert.ok(outcome.signal || outcome.code !== 0);
  assert.equal(harness.stats.attempts, 1);
  assert.equal(harness.stats.fallback, 0);
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
});
test('actual validator and extracted caller preserve NaN through ordinary owned-source cleanup failure', async () => {
  // Reuse only authored adapter constructors; execute the bound production sources independently.
  const authored = fs.readFileSync(path.join(root, 'tests/unit/test_whole_manifest_cancellation.js'), 'utf8');
  const validatorStart = authored.indexOf('function validator(');
  const validatorEnd = authored.indexOf("test('whole manifest", validatorStart);
  const callerStart = authored.indexOf('function caller(');
  const callerEnd = authored.indexOf("test('actual canonical", callerStart);
  const context = { fs, path, vm, root, nb: notebook, log: logger, require, a: assert, AbortController };
  const adapters = vm.runInNewContext(authored.slice(validatorStart, validatorEnd) + authored.slice(callerStart, callerEnd) + '\n({validator,caller,evaluation})', context);
  const controller = new AbortController();
  const validator = adapters.validator(async () => { controller.abort(NaN); throw NaN; }, () => {}, true);
  await assert.rejects(adapters.caller((evaluation, options) => validator.run(evaluation, options))({ SHEET_VALIDATION: true, signal: controller.signal }, {}, adapters.evaluation), error => Object.is(error, NaN));
  assert.equal(validator.stats.query, 1);
  assert.equal(validator.stats.detach, 1);
});
