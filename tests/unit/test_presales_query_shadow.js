'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { executeWithQueryShadow, writeShadowObservation } = require('../../scripts/lib/boq/presales_query_shadow.js');
const { planPresalesQuery } = require('../../scripts/lib/boq/presales_query_planner.js');
const { LEGACY_EXPLICIT_INTENTS } = require('../../scripts/lib/boq/presales_query_plan_rules.js');
const cases = require('../fixtures/presales_query_plan_cases.js');
const root = path.resolve(__dirname, '../..');
const routerPath = path.join(root, 'scripts/evaluators/route_query.js');
const reportDir = path.join(root, 'outputs/history/skill_workflow_excellence/CP7b/shadow');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');

function restoreLegacySource(actual) {
  const wrapperStart = actual.indexOf('// CP7b report-only proposal.');
  const wrapperEnd = actual.indexOf('/**\n * Execute routed presales query', wrapperStart);
  assert.ok(wrapperStart > 0 && wrapperEnd > wrapperStart);
  const restored = (actual.slice(0, wrapperStart) + actual.slice(wrapperEnd))
    .replace('async function _executeLegacyRoutedQuery(', 'async function executeRoutedQuery(');
  assert.equal(sha(restored), '4cce2987e62aff51342b6defcb3c6889535ea7f975135c53b89d8ff48baafad0');
  return restored;
}

test('CP7b legacy router bytes change only by wrapper insertion and private declaration rename', () => {
  restoreLegacySource(fs.readFileSync(routerPath, 'utf8'));
});

test('CP7b helper returns exact legacy envelope and invokes callback once with original inputs', async () => {
  const context = Object.freeze({ intent: 'FREEFORM_QA', chassisName: 'Unknown_Model' });
  const expected = Object.freeze({ classification: Object.freeze({ intent: 'FREEFORM_QA' }), traceId: 'legacy-trace' });
  const reports = []; let calls = 0;
  const actual = await executeWithQueryShadow('Size a server and export Excel', context, (query, received) => {
    calls++; assert.equal(query, 'Size a server and export Excel'); assert.strictEqual(received, context); return expected;
  }, { sink: report => reports.push(report) });
  assert.strictEqual(actual, expected); assert.equal(calls, 1); assert.equal(reports.length, 1);
  assert.equal(reports[0].planner.proposal.objective, 'FREEFORM_QA');
  assert.equal(reports[0].legacy.traceId, 'legacy-trace');
});

for (const failure of ['planner', 'sink-sync', 'sink-async', 'options-getter', 'source-read']) {
  test(`CP7b ${failure} failure preserves legacy success and once-only callback`, async t => {
    const expected = {}; let calls = 0;
    const options = { sink: () => {} };
    if (failure === 'planner') options.planner = () => { throw new Error('planner failure'); };
    if (failure === 'sink-sync') options.sink = () => { throw new Error('sink failure'); };
    if (failure === 'sink-async') options.sink = async () => { throw new Error('sink failure'); };
    if (failure === 'options-getter') Object.defineProperty(options, 'planner', { get() { throw new Error('getter failure'); } });
    if (failure === 'source-read') t.mock.method(fs, 'readFileSync', () => { throw new Error('hash read failure'); });
    assert.strictEqual(await executeWithQueryShadow('Evaluate BOQ', {}, () => { calls++; return expected; }, options), expected);
    assert.equal(calls, 1);
  });
}

for (const asynchronous of [false, true]) {
  test(`CP7b legacy ${asynchronous ? 'rejection' : 'throw'} and report failure preserve exact primary error`, async () => {
    const primary = new Error('original legacy error'); let calls = 0;
    const legacy = () => { calls++; if (asynchronous) return Promise.reject(primary); throw primary; };
    await assert.rejects(executeWithQueryShadow('Evaluate BOQ', {}, legacy, {
      planner: () => { throw new Error('planner also failed'); },
      sink: async () => { throw new Error('report also failed'); }
    }), error => error === primary);
    assert.equal(calls, 1);
  });
}

test('CP7b rejected legacy observation does not fabricate classification, trace or child invocation', async () => {
  const reports = []; const primary = Object.assign(new Error('private customer contents'), { code: 'LEGACY_FAULT' });
  await assert.rejects(executeWithQueryShadow('Evaluate BOQ', {}, () => { throw primary; }, { sink: report => reports.push(report) }), error => error === primary);
  assert.equal(reports.length, 1); assert.equal(reports[0].legacy.outcome, 'REJECTED');
  assert.equal(reports[0].legacy.classifiedIntent, null); assert.equal(reports[0].legacy.traceId, null);
  assert.equal(reports[0].legacy.handlerInvocations, 'NOT_OBSERVABLE');
  assert.equal(reports[0].legacy.childExecution, 'NOT_OBSERVABLE');
  assert.deepEqual(reports[0].legacy.error, { name: 'Error', code: 'LEGACY_FAULT' });
  assert.ok(!JSON.stringify(reports[0]).includes('private customer contents'));
});

test('CP7b bounded projection omits cyclic/full customer input and snapshots proposal before legacy mutation', async () => {
  const context = { intent: 'FREEFORM_QA', chassisName: 'Q'.repeat(1000), secret: 'CUSTOMER_SECRET' }; context.circular = context;
  const reports = [];
  await executeWithQueryShadow('CUSTOMER_RAW_QUERY', context, () => {
    context.chassisName = 'changed'; return { classification: { intent: 'FREEFORM_QA' }, customerOutput: 'CUSTOMER_OUTPUT' };
  }, { sink: report => reports.push(report) });
  const serialized = JSON.stringify(reports[0]);
  for (const privateText of ['CUSTOMER_SECRET', 'CUSTOMER_RAW_QUERY', 'CUSTOMER_OUTPUT', 'circular']) assert.ok(!serialized.includes(privateText));
  assert.equal(reports[0].planner.proposal.scope.chassisHint, 'Q'.repeat(256));
  assert.deepEqual(reports[0].planner.proposal.execution, { state: 'NOT_EXECUTED', dispatchAllowed: false, deliveryAuthorized: false });
  assert.equal(reports[0].sourceFiles.length, 4);
  for (const source of reports[0].sourceFiles) assert.equal(source.sha256, sha(fs.readFileSync(path.join(root, source.file))));
});

test('CP7b malformed planner inputs do not impose new legacy validation', async () => {
  const reports = []; const expected = {};
  assert.strictEqual(await executeWithQueryShadow(42, null, () => expected, { sink: report => reports.push(report) }), expected);
  assert.equal(reports[0].planner.outcome, 'FAILED'); assert.equal(reports[0].legacy.outcome, 'RETURNED');
});

test('CP7b stalled asynchronous sink cannot hold the legacy result indefinitely', async () => {
  const expected = {}; let count = 0;
  assert.strictEqual(await executeWithQueryShadow('Evaluate BOQ', {}, () => { count++; return expected; }, {
    sink: () => new Promise(() => {})
  }), expected);
  assert.equal(count, 1);
});

test('CP7b default atomic writer failure preserves both success and primary rejection', async t => {
  t.mock.method(fs, 'writeFileSync', () => { throw Object.assign(new Error('injected filesystem fault'), { code: 'EACCES' }); });
  const expected = {}; let count = 0;
  assert.strictEqual(await executeWithQueryShadow('Evaluate BOQ', {}, () => { count++; return expected; }), expected);
  const primary = new Error('primary');
  await assert.rejects(executeWithQueryShadow('Evaluate BOQ', {}, () => { count++; throw primary; }), error => error === primary);
  assert.equal(count, 2);
});

test('CP7b compound difference is classification-only evidence, never actual missing execution', async () => {
  const reports = [];
  await executeWithQueryShadow('Reconcile BOMs and append commercial remarks and export Excel', { reconciliationMode: 'SINGLE_FILE_AUDIT' },
    () => ({ classification: { intent: 'BOM_RECONCILIATION' } }), { sink: report => reports.push(report) });
  const report = reports[0];
  assert.deepEqual(report.planner.proposal.transforms, ['REMARKS_RECONCILIATION', 'WORKBOOK_GENERATION']);
  assert.ok(report.differences.some(d => d.capability === 'WORKBOOK_GENERATION'));
  assert.ok(report.differences.every(d => d.executionObservation === 'NOT_OBSERVABLE'));
});

test('CP7b unsupported scope and question-style cases remain pure proposals', async () => {
  for (const fixture of cases) {
    let count = 0; const reports = []; const expected = { classification: { intent: 'FREEFORM_QA' } };
    const result = await executeWithQueryShadow(fixture.query, fixture.context || {}, () => { count++; return expected; }, { sink: report => reports.push(report) });
    assert.strictEqual(result, expected); assert.equal(count, 1);
    assert.equal(reports[0].planner.proposal.objective, planPresalesQuery(fixture.query, fixture.context || {}).objective);
    assert.equal(reports[0].planner.proposal.execution.state, 'NOT_EXECUTED');
  }
  const reports = [];
  await executeWithQueryShadow('Size a server', { explicitTrack: 'FREEFORM_QA', intent: 'UNSUPPORTED_TRACK' }, () => ({}), { sink: report => reports.push(report) });
  assert.equal(reports[0].planner.proposal.legacyExplicitOverride, false);
  assert.ok(reports[0].planner.proposal.ambiguityCodes.includes('UNSUPPORTED_EXPLICIT_INTENT'));
});

const handlerNames = ['CrossVendorTransformation', 'HeterogeneousTenderModernization', 'FreeformQa', 'BoqEvaluation',
  'OcrQuoteIngestion', 'CatalogIntelligence', 'RfpSizing', 'BomReconciliation', 'WorkloadDna', 'ValueEngineering',
  'LeastDeltaSynthesis', 'WorkbookGeneration', 'RemarksReconciliation', 'MultiClusterTender', 'AdversarialValidation',
  'ContinuousLearning', 'KnowledgeSync'];

function loadStubbedRouter(source, enabled, shadowLoader) {
  const calls = []; let helperLoads = 0;
  const module = { exports: {} };
  const requireStub = name => {
    if (name === 'fs' || name === 'path' || name === 'crypto') return require(name);
    if (name.endsWith('/catalog/sku.js')) return require('../../scripts/lib/catalog/sku.js');
    if (name.endsWith('presales_query_shadow.js')) { helperLoads++; return shadowLoader || { executeWithQueryShadow: (query, context, legacy) => executeWithQueryShadow(query, context, legacy, { sink: () => {} }) }; }
    if (name.endsWith('catalog_discovery.js')) return { getChassisMap: () => ({}), listAllCatalogs: () => [] };
    if (name.endsWith('bom_verifier.js')) return { verifyPrePresentationAcceptance: () => ({ status: 'FIXTURE', isValid: false, blockersCount: 0, warningsCount: 0, blockers: [], warnings: [] }) };
    if (name.endsWith('execution_trace_runtime.js')) return require('../../scripts/lib/system/execution_trace_runtime.js');
    return {};
  };
  requireStub.main = null;
  const globals = { module, exports: module.exports, require: requireStub, process: { env: { PRESALES_QUERY_SHADOW: enabled } },
    __dirname: path.dirname(routerPath), __filename: routerPath, console: { log() { throw new Error('unexpected CLI execution'); }, warn() {}, error() {} },
    fixtureHandler: name => (query, context) => { calls.push({ name, query, context }); return { status: 'FIXTURE', handler: name }; } };
  const replaceHandlers = handlerNames.map(name => `_handle${name} = fixtureHandler('${name}');`).join('\n');
  vm.runInNewContext(source + '\n' + replaceHandlers, globals, { filename: routerPath });
  return { router: module.exports, calls, helperLoads: () => helperLoads, globals };
}

test('CP7b default-disabled wrapper preserves three exports and does not load shadow', async () => {
  for (const enabled of [undefined, '', '0', 'true']) {
    const loaded = loadStubbedRouter(fs.readFileSync(routerPath, 'utf8'), enabled);
    assert.deepEqual(Object.keys(loaded.router), ['classifyQueryIntent', 'executeRoutedQuery', 'getChassisCatalog']);
    await loaded.router.executeRoutedQuery('What is the maximum memory?');
    assert.equal(loaded.calls.length, 1); assert.equal(loaded.calls[0].name, 'FreeformQa'); assert.equal(loaded.helperLoads(), 0);
  }
});

test('CP7b enabled wrapper returns exact internal legacy envelope; shadow import failure delegates once', async () => {
  const source = fs.readFileSync(routerPath, 'utf8');
  const expected = { unchanged: true }; let count = 0;
  const loaded = loadStubbedRouter(source, '1');
  loaded.globals.fixtureLegacy = () => { count++; return expected; };
  vm.runInNewContext('_executeLegacyRoutedQuery = fixtureLegacy;', loaded.globals);
  assert.strictEqual(await loaded.router.executeRoutedQuery('Evaluate BOQ'), expected); assert.equal(count, 1);
  const broken = loadStubbedRouter(source, '1', Object.defineProperty({}, 'executeWithQueryShadow', { get() { throw new Error('import fault'); } }));
  await broken.router.executeRoutedQuery('What is the maximum memory?'); assert.equal(broken.calls.length, 1);
  const missing = loadStubbedRouter(source, '1', {});
  await missing.router.executeRoutedQuery('What is the maximum memory?'); assert.equal(missing.calls.length, 1);
});

test('CP7b registry ownership remains an internal observation outside customer capabilities', () => {
  const registry = require('../../scripts/config/skill_workflow_registry.js');
  const observation = registry.internalEngineeringObservations.find(item => item.checkpoint === 'CP7b');
  assert.equal(observation.ownerCapabilityId, 'presales-query-router');
  assert.equal(observation.reportDirectory, 'outputs/history/skill_workflow_excellence/CP7b/shadow');
  assert.equal(observation.evidenceKind, 'ENGINEERING_OBSERVATION_NOT_SKILL_INVOCATION');
  assert.ok(Object.isFrozen(observation));
  assert.equal(registry.capabilities.filter(item => item.capabilityId === 'presales-query-router').length, 1);
  assert.ok(!registry.capabilities.some(item => item.entrypoints.some(entrypoint => entrypoint.path.endsWith('presales_query_shadow.js'))));
});

test('CP7b stubbed legacy selection/envelope parity covers all overrides, OCR, scopes and compound cases', async () => {
  const current = fs.readFileSync(routerPath, 'utf8'); const oldSource = restoreLegacySource(current);
  const scenarios = LEGACY_EXPLICIT_INTENTS.map(intent => ({ query: 'Size a server for VMware and export Excel', context: { intent } }))
    .concat(cases.map(f => ({ query: f.query, context: f.context || {} })))
    .concat([{ query: '', context: { intent: 'OCR_QUOTE_INGESTION', filePath: 'scan.pdf' } },
      { query: 'Size a server', context: { explicitTrack: 'FREEFORM_QA' } },
      { query: '', context: { filePath: 'quote.custom', intent: 'UNSUPPORTED_TRACK' } }]);
  const normalize = result => JSON.parse(JSON.stringify(result, (key, value) => ['traceId', 'timestamp', 'executionTimeMs'].includes(key) ? undefined : value));
  for (const scenario of scenarios) {
    const before = loadStubbedRouter(oldSource, undefined); const after = loadStubbedRouter(current, '1');
    let oldResult; let newResult; let oldError; let newError;
    try { oldResult = await before.router.executeRoutedQuery(scenario.query, scenario.context); } catch (error) { oldError = error; }
    try { newResult = await after.router.executeRoutedQuery(scenario.query, scenario.context); } catch (error) { newError = error; }
    if (oldError) {
      assert.ok(newError); assert.equal(newError.name, oldError.name); assert.equal(newError.code, oldError.code);
      assert.equal(newError.message, oldError.message); assert.equal(before.calls.length, 0); assert.equal(after.calls.length, 0);
      continue;
    }
    assert.equal(newError, undefined);
    assert.deepEqual(Object.keys(newResult), Object.keys(oldResult)); assert.deepEqual(normalize(newResult), normalize(oldResult));
    assert.equal(before.calls.length, 1); assert.equal(after.calls.length, 1);
    assert.equal(after.calls[0].name, before.calls[0].name); assert.strictEqual(after.calls[0].context, scenario.context);
  }
});

test('CP7b repeated observation write is stable and rejects input-controlled paths', async () => {
  const reports = [];
  await executeWithQueryShadow('Evaluate BOQ', {}, () => ({}), { sink: report => reports.push(report) });
  writeShadowObservation(reports[0]); const target = path.join(reportDir, `${reports[0].shadowId}.json`);
  const first = fs.readFileSync(target); writeShadowObservation(reports[0]);
  assert.deepEqual(fs.readFileSync(target), first); assert.ok(!fs.existsSync(target + '.bak'));
  assert.throws(() => writeShadowObservation({ shadowId: '../../escape' }), /Invalid shadow identity/);
});

test('CP7b concurrent processes leave one distinct atomic report per returned/rejected invocation', async () => {
  const prefix = `fixture-${crypto.randomUUID()}`;
  const helper = path.join(root, 'scripts/lib/boq/presales_query_shadow.js');
  const childScript = `const { executeWithQueryShadow } = require(${JSON.stringify(helper)});
    (async () => { for (let i = 0; i < 8; i++) { const id = process.argv[1] + '-' + i;
      const legacy = () => { if (i % 2) throw Object.assign(new Error('fixture'), { code: id });
        return { traceId: id, classification: { intent: 'FREEFORM_QA' } }; };
      try { await executeWithQueryShadow('What is memory?', {}, legacy); } catch (error) { if (error.code !== id) throw error; }
    } })().catch(error => { process.stderr.write(error.stack); process.exitCode = 1; });`;
  await Promise.all(Array.from({ length: 4 }, (_, index) => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['-e', childScript, `${prefix}-${index}`], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = ''; child.stdout.on('data', data => { output += data; }); child.stderr.on('data', data => { output += data; });
    child.on('error', reject); child.on('close', code => code === 0 && output === '' ? resolve() : reject(new Error(`Child ${code}: ${output}`)));
  })));
  const reports = fs.readdirSync(reportDir).filter(name => name.endsWith('.json')).map(name => JSON.parse(fs.readFileSync(path.join(reportDir, name))));
  const observed = reports.filter(report => (report.legacy.traceId || report.legacy.error?.code || '').startsWith(prefix));
  assert.equal(observed.length, 32); assert.equal(new Set(observed.map(report => report.shadowId)).size, 32);
  assert.equal(observed.filter(report => report.legacy.outcome === 'RETURNED').length, 16);
  assert.equal(observed.filter(report => report.legacy.outcome === 'REJECTED').length, 16);
  for (const report of observed) assert.equal(report.mode, 'REPORT_ONLY');
  assert.ok(!fs.readdirSync(reportDir).some(name => name.endsWith('.tmp') || name.endsWith('.bak')));
});
