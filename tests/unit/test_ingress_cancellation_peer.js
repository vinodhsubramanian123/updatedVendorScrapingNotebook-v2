'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const original = fs.readFileSync(path.join(__dirname, 'test_ingress_cancellation.js'), 'utf8');
// Reuse only fixture loaders, registering no authored tests.
const loaderStart = original.indexOf('function loadMcp(');
const loaderEnd = original.indexOf("test('all seven", loaderStart);
const boqStart = original.indexOf('function loadBoqHandler(');
const boqEnd = original.indexOf('\nfor (const input', boqStart);
const base = path.resolve(__dirname, '../..');
const loaders = vm.runInNewContext(original.slice(loaderStart, loaderEnd) + original.slice(boqStart, boqEnd) + '\n({ loadMcp, loadBoqHandler });', { assert, fs, path, vm, base });

test('peer: MCP preserves unrelated NotebookLM rejection during abort race', async () => {
  const controller = new AbortController();
  const app = loaders.loadMcp({ query: async () => {
    controller.abort('user cancellation');
    throw new Error('independent backend integrity failure');
  } });
  const result = await app.invoke('query_notebooklm', { query: 'fixture', chassis_id: 'fixture' }, { signal: controller.signal });
  assert.equal(result.isError, true);
  assert.equal(result.content[0].text, 'Error executing tool: independent backend integrity failure');
});

test('peer: file ingress maps the exact primitive reason to CANCELLED', async () => {
  const controller = new AbortController(); controller.abort(0);
  const handler = loaders.loadBoqHandler(async () => { throw 0; });
  const result = await handler('evaluate', { filePath: 'fixture.xlsx', signal: controller.signal });
  assert.equal(result.status, 'CANCELLED');
});

test('peer: structurally equal but distinct reason preserves ERROR and evidence', async () => {
  const controller = new AbortController(); controller.abort({ message: 'cancel' });
  const failure = { message: 'cancel', traceId: 'independent-trace', evidenceLogPath: 'independent-ledger' };
  const handler = loaders.loadBoqHandler(async () => { throw failure; });
  const result = await handler('evaluate', { filePath: 'fixture.xlsx', signal: controller.signal });
  assert.equal(result.status, 'ERROR');
  assert.equal(result.error, 'cancel');
  assert.equal(result.traceId, 'independent-trace');
  assert.equal(result.evidenceLogPath, 'independent-ledger');
});

test('peer: null abort reason does not hide an unrelated NotebookLM failure', async () => {
  const controller = new AbortController();
  const app = loaders.loadMcp({ query: async () => {
    controller.abort(null);
    throw new Error('independent failure with null abort reason');
  } });
  const result = await app.invoke('query_notebooklm', { query: 'fixture', chassis_id: 'fixture' }, { signal: controller.signal });
  assert.equal(result.content[0].text, 'Error executing tool: independent failure with null abort reason');
});
