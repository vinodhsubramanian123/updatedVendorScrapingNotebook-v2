'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const base = path.resolve(__dirname, '../..');

function loadMcp(overrides = {}) {
  const handlers = new Map();
  const observations = [];
  const calls = [];
  const aspectNames = ['evalComputeThermal', 'evalMemoryChannel', 'evalStorageTriMode',
    'evalNetworkingOcp', 'evalPcieRiserSlots', 'evalPowerEnvironment', 'evalSupportManufacturing'];
  const evaluator = Object.fromEntries(aspectNames.map(name => [name, (...args) => {
    calls.push({ name, args }); return { result: name };
  }]));
  evaluator.evaluateBOQMultiAspect = items => ({ items });
  const deps = {
    '@modelcontextprotocol/sdk/server/index.js': { Server: class {
      setRequestHandler(type, handler) { handlers.set(type, handler); }
      async connect() {}
    } },
    '@modelcontextprotocol/sdk/server/stdio.js': { StdioServerTransport: class {} },
    '@modelcontextprotocol/sdk/types.js': { CallToolRequestSchema: 'call', ListToolsRequestSchema: 'list' },
    '../lib/boq/boq_evaluator.js': evaluator,
    '../lib/notebook/notebook_query_utils.js': { executeNotebookQuery: overrides.query || (async () => ({ result: 'grounded' })) },
    '../lib/rag/local_rag_search.js': { queryLocalKnowledgeBase: () => ({ source: 'local' }) },
    '../lib/sync/knowledge_sync.js': { loadNotebookConfig: () => ({}), getNotebookIdForChassis: () => 'notebook', getNotebookDegradedMode: () => ({}) },
    '../lib/feedback/feedback_loop.js': { processPortalFeedback: () => { calls.push({ name: 'write' }); return { persisted: true }; } },
    '../lib/catalog/catalog_discovery.js': { listAllCatalogs: () => [{ id: 'fixture', catalogDir: '/fixture' }] },
    '../lib/system/execution_trace_runtime.js': { observeActualInvocation: (name, source, callback) => {
      observations.push({ name, source }); return callback();
    } },
    fs: { existsSync: () => true }, path
  };
  vm.runInNewContext(fs.readFileSync(path.join(base, 'scripts/services/mcp_server.js'), 'utf8'), {
    require: name => { assert.ok(Object.hasOwn(deps, name), name); return deps[name]; },
    __filename: path.join(base, 'scripts/services/mcp_server.js'), __dirname: path.join(base, 'scripts/services'),
    console: { error() {} }
  });
  return { invoke: (name, args = {}, extra = {}) => handlers.get('call')({ params: { name, arguments: args } }, extra),
    list: handlers.get('list'), calls, observations };
}

test('all seven MCP aspect tools keep legacy result envelopes and are observed once', async () => {
  const app = loadMcp();
  for (const suffix of ['thermal', 'memory', 'storage', 'networking', 'pcie', 'power', 'support']) {
    const name = 'evaluate_aspect_' + suffix;
    const result = await app.invoke(name, { items_json: '[{"sku":"fixture"}]' });
    assert.equal(result.isError, undefined);
    assert.equal(result.content.length, 1);
    assert.ok(JSON.parse(result.content[0].text).result.startsWith('eval'));
    assert.equal(app.observations.filter(o => o.name === 'MCP:' + name).length, 1);
  }
  assert.equal(app.calls.length, 7);
});

test('pre-aborted MCP mutation is never invoked, including primitive null reason', async () => {
  const controller = new AbortController(); controller.abort(null);
  const app = loadMcp();
  const result = await app.invoke('record_knowledge_delta', { chassis_id: 'fixture' }, { signal: controller.signal });
  assert.equal(result.isError, true);
  assert.equal(result.content[0].text, 'Tool request cancelled');
  assert.equal(app.calls.length, 0);
  assert.equal(app.observations.length, 1);
});

test('MCP NotebookLM receives exact SDK signal and detects cancellation after awaited work', async () => {
  const controller = new AbortController();
  let seen;
  const app = loadMcp({ query: async (_id, _query, options) => {
    seen = options.signal; controller.abort(false); return { result: 'late' };
  } });
  const result = await app.invoke('query_notebooklm', { query: 'fixture', chassis_id: 'fixture' }, { signal: controller.signal });
  assert.equal(seen, controller.signal);
  assert.equal(result.isError, true);
  assert.equal(result.content[0].text, 'Tool request cancelled');
});

test('MCP no-signal NotebookLM and simulation retain result meaning', async () => {
  const app = loadMcp();
  const result = await app.invoke('query_notebooklm', { query: 'fixture', chassis_id: 'fixture' });
  assert.deepEqual(JSON.parse(result.content[0].text), { result: 'grounded' });
  const simulation = await app.invoke('simulate_build', { items_json: '[]' });
  assert.equal(JSON.parse(simulation.content[0].text).portalValidationStatus, 'PORTAL VALIDATION PENDING');
  const listed = await app.list();
  assert.equal(listed.tools.length, 11);
});

test('MCP ordinary failure keeps existing error envelope', async () => {
  const result = await loadMcp().invoke('unsupported');
  assert.equal(result.isError, true);
  assert.equal(result.content[0].text, 'Error executing tool: Unknown tool: unsupported');
});

function loadBoqHandler(pipeline) {
  const source = fs.readFileSync(path.join(base, 'scripts/evaluators/route_query.js'), 'utf8');
  const start = source.indexOf('function _boqPipelineFailure(');
  const end = source.indexOf('function _handleOcrQuoteIngestion', start);
  assert.ok(start > 0 && end > start);
  return vm.runInNewContext(source.slice(start, end) + '\n_handleBoqEvaluation;', {
    getChassisCatalog: () => ({ catalogDir: 'fixture' }),
    fs: { existsSync: () => true }, process: { env: {} },
    require: name => { assert.equal(name, './eval_boq.js'); return { runEvaluationPipeline: pipeline }; }
  });
}

for (const input of [{ filePath: 'fixture.xlsx' }, { items: [{ sku: 'fixture' }] }]) {
  test('BOQ forwards exact signal for ' + (input.filePath ? 'file' : 'items') + ' ingress', async () => {
    const controller = new AbortController();
    const expected = { status: 'ACTION_REQUIRED', sentinel: true };
    let seen;
    const handler = loadBoqHandler(async options => { seen = options.signal; return expected; });
    assert.equal(await handler('evaluate', { ...input, signal: controller.signal }), expected);
    assert.equal(seen, controller.signal);
  });
}

for (const reason of [null, false, Object.freeze({ code: 'ABORTED' })]) {
  test('BOQ maps exact cancellation reason without a secondary primitive crash: ' + String(reason), async () => {
    const controller = new AbortController(); controller.abort(reason);
    const handler = loadBoqHandler(async () => { throw reason; });
    const result = await handler('evaluate', { items: [], signal: controller.signal });
    assert.equal(result.status, 'CANCELLED');
    assert.equal(result.error, 'BOQ evaluation cancelled');
  });
}

test('BOQ unrelated failure during cancellation remains ERROR with evidence pointers', async () => {
  const controller = new AbortController(); controller.abort('cancel');
  const error = Object.assign(new Error('physical engine failure'), { traceId: 'trace', evidenceLogPath: 'ledger' });
  const handler = loadBoqHandler(async () => { throw error; });
  const result = await handler('evaluate', { items: [], signal: controller.signal });
  assert.equal(result.status, 'ERROR');
  assert.equal(result.error, error.message);
  assert.equal(result.traceId, 'trace');
  assert.equal(result.evidenceLogPath, 'ledger');
});
