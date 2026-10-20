'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

test('non-persistent post-flow sync invokes no registry, payload, drift, cleanup or cloud operation', t => {
  const knowledge = require('../../scripts/lib/sync/knowledge_sync');
  const running = require('../../scripts/services/running_knowledge_sync');
  const calls = [];
  t.mock.method(knowledge, 'buildMasterKnowledgeRegistry', () => { calls.push('registry'); return {}; });
  t.mock.method(knowledge, 'generateNotebookSyncPayload', () => { calls.push('payload'); return {}; });
  t.mock.method(knowledge, 'inspectKnowledgeDrift', () => { calls.push('drift'); return {}; });
  t.mock.method(running, 'syncRunningKnowledge', async () => { calls.push('cloud'); return { success: true }; });
  // Prevent the old cleanup path from touching retained operational artifacts.
  const readDirectory = fs.readdirSync;
  t.mock.method(fs, 'readdirSync', (directory, options) => /[\\/]outputs$/.test(String(directory)) ? [] : readDirectory(directory, options));
  const modulePath = require.resolve('../../scripts/lib/sync/post_flow_sync');
  const previousModule = require.cache[modulePath];
  delete require.cache[modulePath];
  t.after(() => { if (previousModule) require.cache[modulePath] = previousModule; else delete require.cache[modulePath]; });
  const result = require(modulePath).triggerPostFlowSync('DL380_Gen12', 'TEST', {
    persist: false, autoUploadNLM: true, syncRunningKnowledge: true
  });
  assert.deepEqual(calls, []);
  assert.equal(result.syncStatus, 'SKIPPED');
  assert.equal(result.payloadPath, null);
  assert.equal(result.cloudUploaded, false);
});

test('isolated runner enforces test mode even when parent is production', async t => {
  const { runSingleTest } = require('../../scripts/maintenance/run_test_matrix');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runner-env-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  t.after(() => { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; });
  fs.mkdirSync(path.join(root, 'tests/unit'), { recursive: true });
  fs.writeFileSync(path.join(root, 'tests/unit/test_environment.js'),
    "require('node:assert/strict').equal(process.env.NODE_ENV, 'test'); console.log('isolated environment verified');\n");
  const result = await runSingleTest('tests/unit/test_environment.js', root, 10000, false);
  assert.equal(result.pass, true, result.stderr || result.stdout);
});

test('payload preview cannot write files or upload a pre-existing payload', t => {
  const builder = require('../../scripts/lib/sync/sync_payload_builder');
  const mutations = [];
  for (const method of ['writeFileSync', 'mkdirSync', 'renameSync', 'copyFileSync', 'unlinkSync']) {
    t.mock.method(fs, method, () => { mutations.push(method); throw new Error('Mutation forbidden in preview'); });
  }
  const result = builder.generateNotebookSyncPayload('test_readonly_preview', true, { persist: false });
  assert.deepEqual(mutations, []);
  assert.equal(result.payloadPath, null);
  assert.equal(result.payloadPersisted, false);
  assert.equal(result.uploadResult.success, false);
  assert.equal(result.uploadResult.error, 'PERSISTENCE_DISABLED');
  assert.equal(typeof result.markdownText, 'string');
});

test('drift inspection is read-only through registry and payload projection', t => {
  const knowledge = require('../../scripts/lib/sync/knowledge_sync');
  const mutations = [];
  for (const method of ['writeFileSync', 'mkdirSync', 'renameSync', 'copyFileSync', 'unlinkSync']) {
    t.mock.method(fs, method, () => { mutations.push(method); throw new Error('Drift inspection must not mutate'); });
  }
  const result = knowledge.inspectKnowledgeDrift('test_readonly_preview');
  assert.deepEqual(mutations, []);
  assert.equal(result.payloadPath, null);
  assert.equal(typeof result.payloadChecksum, 'string');
});

test('catalog schema preserves unknown price and capture time', () => {
  const { CatalogMasterSchema } = require('../../scripts/lib/system/schemas');
  const catalog = CatalogMasterSchema.parse({ metadata: {}, entries: [{ skus: [{ sku: 'UNKNOWN' }] }] });
  assert.equal(catalog.metadata.scrapedAt, undefined);
  assert.equal(catalog.entries[0].skus[0]['Unit Price (USD)'], null);
  assert.equal(catalog.entries[0].skus[0]['Price (USD)'], null);
});

test('export rejects a contract-invalid envelope before selecting its nested evaluation', () => {
  const router = require('../../dashboard/routes/evaluation.cjs');
  const route = router.stack.find(layer => Array.isArray(layer.route?.path) && layer.route.path.includes('/export-boq'));
  const res = { status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  route.route.stack[0].handle({ body: { evalResults: { data: { isContractInvalid: true, evalResults: { status: 'SUCCESS' } } } } }, res);
  assert.equal(res.statusCode, 422);
});

test('evaluation schema does not fabricate PASS when result status is absent', () => {
  const { BOQEvaluationResultSchema } = require('../../scripts/lib/system/schemas');
  assert.equal(BOQEvaluationResultSchema.parse({}).status, 'WARN');
  assert.equal(BOQEvaluationResultSchema.parse({ status: 'ACTION_REQUIRED' }).status, 'ACTION_REQUIRED');
  assert.equal(BOQEvaluationResultSchema.parse({ status: 'CANCELLED' }).status, 'CANCELLED');
});
