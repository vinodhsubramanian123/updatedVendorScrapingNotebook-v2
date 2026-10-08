'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const owner = require('../../scripts/lib/lifecycle/canonical_terminal_owner.js');

const root = path.resolve(__dirname, '../..');
const before = path.join(root, 'tests/fixtures/cp11_owner_legacy');
const FixedDate = class extends Date { constructor(...args) { super(...(args.length ? args : [1700000000000])); } static now() { return 1700000000000; } };
const lifecycleFile = path.resolve(__dirname, '../../scripts/lib/lifecycle/lifecycle_engine.js');
const lifecycleModule = { exports: {} };
vm.runInNewContext(fs.readFileSync(lifecycleFile, 'utf8'), { module: lifecycleModule, exports: lifecycleModule.exports, require: require('node:module').createRequire(lifecycleFile), Date: FixedDate, console, process, setTimeout, clearTimeout });
const { LifecycleEngine } = lifecycleModule.exports;
const phases = ['Ingestion', 'Fingerprinting', 'DomainAspects', 'ConflictGraph', 'Modernization', 'StrategySynthesis', 'RagGrounding'];

function flag(t, value = '1') {
  const prior = process.env.PRESALES_TERMINAL_OWNER;
  process.env.PRESALES_TERMINAL_OWNER = value;
  t.after(() => { if (prior === undefined) delete process.env.PRESALES_TERMINAL_OWNER; else process.env.PRESALES_TERMINAL_OWNER = prior; });
}

function fixture(configuration = {}, legacy = false) {
  const events = [], stdout = [], files = new Map();
  const result = { items: [{ sku: 'P123-B21', quantity: 2, price: 17 }], isMathClean: true, missingDependencies: [],
    aspectChecks: [], conflictGraph: { recommendedSolutions: [] } };
  const product = path.join(root, 'outputs/Fixture/Gen1/Model');
  const options = { inputFile: path.join(product, 'BOQ.csv'), outputPath: path.join(product, 'report.md'), chassisDir: product,
    JSON_MODE: true, OFFLINE_MODE: true, ...configuration.options };
  const filesystem = { ...fs, existsSync: file => configuration.missingTarget && path.resolve(file) === product ? false : true,
    mkdirSync() {}, writeFileSync(file, content) { if (configuration.reportError && file === options.outputPath) throw configuration.reportError;
      files.set(file, String(content)); events.push('WRITE:' + path.basename(file)); },
    statSync: () => ({ isFile: () => true, size: 10 }), readFileSync: () => Buffer.from('fixture') };
  const ledger = {
    traceId: 'FIXTURE_TRACE', phases: {}, artifacts: [], skuAuditLedger: [{ sku: 'P123-B21', action: 'RETAINED_BASELINE' }],
    workflowFailures: [],
    startPhase(number, name, inputSummary = {}) { assert.equal(this.phases['phase_' + number], undefined);
      events.push('START:' + number); this.phases['phase_' + number] = { phaseNumber: number, phaseName: name, status: 'RUNNING', inputSummary }; },
    completePhase(number, status, summary = {}, checks = [], warnings = [], errors = []) {
      if (configuration.completionError && number === configuration.completionError.phase) throw configuration.completionError.error;
      const phase = this.phases['phase_' + number]; assert.ok(phase); assert.equal(phase.status, 'RUNNING');
      events.push('COMPLETE:' + number + ':' + status); Object.assign(phase, { status, outputSummary: summary, checks, warnings, errors });
    },
    recordArtifact(role, file) { this.artifacts.push({ role, path: file, exists: true, sha256: 'a'.repeat(64) }); events.push('ARTIFACT:' + role); },
    recordInlineArtifact(role, value) { this.recordArtifact(role, value); },
    recordWorkflowFailure(error) { events.push('WORKFLOW_FAILURE'); this.workflowFailures.push(error); if (configuration.failureRecordingError) throw configuration.failureRecordingError; },
    getHealth() { const statuses = Object.values(this.phases).map(phase => phase.status);
      return { healthy: statuses.length === 9, gaps: statuses.length === 9 ? [] : ['PHASES_MISSING'],
        workflowStatus: this.workflowFailures.length || statuses.includes('FAILED') ? 'FAILED' : statuses.length === 9 && statuses.every(status => ['PASSED', 'SKIPPED', 'RESOLVED'].includes(status)) ? 'COMPLETE' : 'INCOMPLETE' }; },
    finalizeAndExport(directory) { events.push('SEAL'); if (configuration.sealError) throw configuration.sealError;
      return { jsonPath: path.join(directory || product, 'ledger.json'), mdPath: path.join(directory || product, 'ledger.md'), payload: { health: this.getHealth(), phases: structuredClone(this.phases) } }; }
  };
  const out = value => { events.push('EMIT'); stdout.push(value); if (configuration.outputError) throw configuration.outputError; };
  const consoleFixture = { log(...args) { stdout.push(args.join(' ')); }, warn() {}, error() {} };
  const serializerModule = { exports: {} };
  const serializerRequire = name => {
    if (name === 'fs') return filesystem;
    if (name === 'path') return path;
    if (name === 'crypto') return require('crypto');
    if (name.endsWith('canonical_terminal_owner.js')) return owner;
    if (name.includes('post_flow_sync')) return { triggerPostFlowSyncAsync: async () => { events.push('SYNC'); if (configuration.syncError) throw configuration.syncError;
      return configuration.sync || { success: true, syncStatus: 'LOCAL_PAYLOAD_ONLY' }; } };
    if (name.includes('telemetry')) return { recordEvaluationTelemetry() { events.push('TELEMETRY'); } };
    if (name.includes('progress')) return { emitProgress() {} };
    if (name.includes('pipeline_logger')) return { warn() {}, error() {} };
    if (name.includes('solution_evidence')) return { deliveryFingerprint: () => 'manifest', candidateReviewCurrent: () => true };
    if (name.includes('workflow_contract')) return { verifyDeliveryAuthorization: () => true };
    if (name.includes('runtime_discovery_plan')) return { buildRuntimeDiscoveryPlan: () => ({ status: 'PENDING' }), formatRuntimeDiscoveryPlan: () => 'fixture plan' };
    if (name.includes('fs_compat')) return { safeWriteJsonAtomic(file) { events.push('RUNTIME_PLAN'); files.set(file, '{}'); } };
    if (name.includes('uri_helper')) return { toClickableFileUri: file => file };
    return {};
  };
  const exportFixture = ({ evalResults }) => {
    events.push('EXPORT');
    if (configuration.exportError) {
      owner.recordExporterFailure(evalResults, configuration.exportError);
      evalResults.deliveryError = String(configuration.exportError?.message || configuration.exportError);
      return false;
    }
    for (const field of ['multiRankWorkbookPath', 'multiRankCsvPath', 'proposalWorkbookPath', 'portalWorkbookPath']) evalResults[field] = path.join(product, field);
    if (configuration.afterExport) configuration.afterExport();
    return true;
  };
  const serializerSource = fs.readFileSync(legacy ? path.join(before, 'eval_output_serializer.js') : path.join(root, 'scripts/lib/boq/eval_output_serializer.js'), 'utf8');
  vm.runInNewContext(serializerSource + '\n' +
    'generateMarkdownReport = () => "fixture report"; _exportStagedDeliverables = fixtureExport; _buildWorkflowSteps = () => [{phase:8},{phase:9}]; _buildProvenanceTrace = () => []; _buildTracePayloads = () => [];',
    { module: serializerModule, exports: serializerModule.exports, require: serializerRequire, process: { stdout: { write: out } },
      Date: FixedDate, __dirname: path.join(root, 'scripts/lib/boq'), console: consoleFixture, fixtureExport: exportFixture });
  const canonicalModule = { exports: {} };
  const canonicalRequire = name => {
    if (name === 'fs') return filesystem;
    if (name === 'path') return path;
    if (name === 'crypto') return require('crypto');
    if (name === 'dotenv') return { config() {} };
    if (name.endsWith('canonical_terminal_owner.js')) return owner;
    if (name.endsWith('execution_trace_runtime.js')) return { observeActualInvocation: (n, p, callback) => callback(), associateCanonicalTrace() {} };
    if (name.endsWith('trace_context')) return { runWithTrace: (id, callback) => callback(), getTraceId: () => 'FIXTURE_TRACE' };
    if (name.endsWith('lifecycle_engine.js')) return { LifecycleEngine };
    if (name.endsWith('evidence_ledger.js')) return { createEvidenceLedger: () => ledger };
    if (name.endsWith('eval_output_serializer.js')) return serializerModule.exports;
    if (name.endsWith('bom_verifier.js')) return { verifyPrePresentationAcceptance: () => ({ isValid: !configuration.plannedBlock, totalChecks: 1,
      blockersCount: configuration.plannedBlock ? 1 : 0, checks: [{ id: 'fixture', passed: !configuration.plannedBlock }], blockers: configuration.plannedBlock ? [{ name: 'Fixture', id: 'fixture' }] : [], warnings: [] }) };
    if (name.endsWith('workflow_contract.js')) return { issueDeliveryAuthorization: () => ({ fixture: true }) };
    if (name.endsWith('solution_evidence.js')) return { deliveryFingerprint: () => 'manifest' };
    if (name.endsWith('feedback_loop.js')) return { promotePriceDriftDeltas() { events.push('PRICE_REFLECTION'); if (configuration.priceError) throw configuration.priceError; return { count: 1 }; } };
    if (name.includes('pipeline_logger')) return { warn() {} };
    return {};
  };
  canonicalRequire.main = null;
  const handler = number => ctx => {
    events.push('HANDLER:' + number); ledger.startPhase(number, 'Fixture phase ' + number);
    if (number === 1) ctx.ingestCtx = { ...options, items: result.items, chassisPrefix: 'Fixture_Model', stage1ParsingMs: 1 };
    ctx.evalResults = result; ctx.graph = { chassisInfo: {}, conflicts: [], rankedSolutions: [], recommendedSolutions: [], auditLog: [] };
    if (configuration.phaseError?.phase === number) throw configuration.phaseError.error;
    const status = configuration.phaseStatus?.[number] || 'PASSED';
    const checks = configuration.phaseChecks?.[number] || [];
    ledger.completePhase(number, status, { fixture: number }, checks);
    return { status, summary: { fixture: number }, checks };
  };
  const reflect = () => { events.push('REFLECT'); if (configuration.reflectionError) throw configuration.reflectionError;
    if (configuration.reflectionFault) owner.recordReflectionFailure(ledger); return 2; };
  const canonicalSource = fs.readFileSync(legacy ? path.join(before, 'eval_boq.js') : path.join(root, 'scripts/evaluators/eval_boq.js'), 'utf8');
  vm.runInNewContext(canonicalSource + '\n' + phases.map((phase, index) => `_handleBoq${phase}Phase = fixtureHandler(${index + 1});`).join('\n') +
    '\nexecuteContinuousLearningReflection = fixtureReflection;', { module: canonicalModule, exports: canonicalModule.exports,
    require: canonicalRequire, process: { env: {}, argv: [], stdout: { write: out } }, Date: FixedDate,
    __filename: path.join(root, 'scripts/evaluators/eval_boq.js'), __dirname: path.join(root, 'scripts/evaluators'), console: consoleFixture,
    fixtureHandler: handler, fixtureReflection: reflect });
  return { run: () => canonicalModule.exports.runEvaluationPipeline(options), events, stdout, ledger, result, options, files,
    serializer: serializerModule.exports.serializeAndExportResults };
}

test('default-disabled actual canonical and serializer preserve complete old returned fields and output bytes', async t => {
  flag(t, '0'); const old = fixture({}, true); const current = fixture();
  const oldResult = await old.run(), result = await current.run();
  assert.deepEqual(JSON.parse(JSON.stringify(result)), JSON.parse(JSON.stringify(oldResult)));
  assert.deepEqual(current.stdout, old.stdout); assert.deepEqual(current.events, old.events);
  assert.strictEqual(result, current.result);
});

test('opt-in actual canonical orders artifacts phase8 reflection phase9 health seal one emission same result', async t => {
  flag(t); const current = fixture({ options: { priceDriftItems: [{ sku: 'P123-B21', price: 18 }] } });
  assert.strictEqual(await current.run(), current.result);
  const events = current.events;
  const at = prefix => events.findIndex(event => event.startsWith(prefix));
  assert.ok(at('EXPORT') < at('WRITE:report.md')); assert.ok(at('ARTIFACT:ANALYSIS_REPORT') < at('COMPLETE:8'));
  assert.ok(at('COMPLETE:8') < at('REFLECT')); assert.ok(at('REFLECT') < at('PRICE_REFLECTION'));
  assert.ok(at('PRICE_REFLECTION') < at('SYNC')); assert.ok(at('SYNC') < at('COMPLETE:9')); assert.ok(at('COMPLETE:9') < at('SEAL'));
  assert.ok(at('SEAL') < at('EMIT')); assert.equal(events.filter(event => event === 'SEAL').length, 1); assert.equal(events.filter(event => event === 'EMIT').length, 1);
  for (let number = 1; number <= 9; number++) { assert.equal(events.filter(event => event === 'START:' + number).length, 1); assert.equal(events.filter(event => event.startsWith('COMPLETE:' + number + ':')).length, 1); }
  const envelope = JSON.parse(current.stdout[0].split('__EVAL_RESULT_JSON__')[1]);
  assert.equal(envelope.status, 'SUCCESS'); assert.equal(envelope.data.evalResults.lifecycleHealth.healthy, true);
  assert.equal(envelope.data.evalResults.evidenceHealth.healthy, true); assert.equal(envelope.data.evalResults.newLearningsCount, 2);
});

test('planned delivery block remains ACTION_REQUIRED and still performs actual phase9 reflection', async t => {
  flag(t); const current = fixture({ plannedBlock: true }); await current.run();
  assert.equal(current.events.includes('EXPORT'), false); assert.ok(current.events.includes('REFLECT'));
  assert.equal(current.ledger.phases.phase_8.status, 'ACTION_REQUIRED'); assert.equal(current.ledger.phases.phase_9.status, 'PASSED');
  const envelope = JSON.parse(current.stdout[0].split('__EVAL_RESULT_JSON__')[1]);
  assert.equal(envelope.status, 'ACTION_REQUIRED'); assert.equal(current.result.evidenceHealth.healthy, false);
  assert.equal(envelope.data.evalResults.customerDisposition, 'ACTION_REQUIRED');
});

for (const error of [Object.freeze(new Error('frozen exporter')), 'primitive exporter']) {
  test('exporter primary identity survives failed export and secondary seal: ' + typeof error, async t => {
    flag(t); const current = fixture({ exportError: error, sealError: new Error('secondary seal') });
    await assert.rejects(current.run(), caught => caught === error);
    assert.equal(current.events.includes('REFLECT'), false); assert.equal(current.ledger.phases.phase_9.status, 'NOT_REACHED');
    assert.equal(current.stdout.length, 0); assert.equal(current.events.filter(event => event === 'SEAL').length, 1);
  });
}

for (const stage of ['reportError', 'reflectionError', 'priceError']) {
  test(stage + ' is a fatal primary preserved through failure-recording and seal faults', async t => {
    flag(t); const primary = Object.freeze(new Error(stage));
    const current = fixture({ [stage]: primary, sealError: new Error('secondary seal'), failureRecordingError: new Error('secondary metadata'),
      options: { priceDriftItems: [{ sku: 'P123-B21', price: 18 }] } });
    await assert.rejects(current.run(), error => error === primary); assert.equal(current.stdout.length, 0);
    assert.equal(current.events.filter(event => event === 'SEAL').length, 1);
    if (stage === 'reportError') assert.equal(current.events.includes('REFLECT'), false);
  });
}

test('actual swallowed proposal fault is diagnostic and never fabricated phase9 PASS', async t => {
  flag(t); const current = fixture({ reflectionFault: true }); await current.run();
  assert.equal(current.ledger.phases.phase_9.status, 'ACTION_REQUIRED');
  assert.deepEqual(current.ledger.phases.phase_9.outputSummary.localReflection.faults, ['LEARNING_PROPOSAL_FAILED']);
  assert.equal(JSON.parse(current.stdout[0].split('__EVAL_RESULT_JSON__')[1]).status, 'ACTION_REQUIRED');
});

test('cloud failure remains visible after local reflection without destroying valid local results', async t => {
  flag(t); const current = fixture({ options: { OFFLINE_MODE: false, SYNC_RAG: true }, syncError: new Error('cloud unavailable') }); await current.run();
  assert.equal(current.result.postFlowSync.success, false); assert.equal(current.result.items[0].quantity, 2);
  assert.equal(current.ledger.phases.phase_9.status, 'ACTION_REQUIRED'); assert.equal(current.result.evidenceHealth.healthy, false);
});

test('successful artifacts followed by evidence seal failure emit no premature marker and attempt seal once', async t => {
  flag(t); const primary = Object.freeze(new Error('seal failure')); const current = fixture({ sealError: primary });
  await assert.rejects(current.run(), error => error === primary); assert.ok(current.events.includes('EXPORT')); assert.ok(current.events.includes('REFLECT'));
  assert.equal(current.stdout.length, 0); assert.equal(current.events.filter(event => event === 'SEAL').length, 1);
});

test('output failure cannot cause a second terminal marker or a second ledger seal', async t => {
  flag(t); const primary = Object.freeze(new Error('stream failure')); const current = fixture({ outputError: primary });
  await assert.rejects(current.run(), error => error === primary);
  assert.equal(current.events.filter(event => event === 'EMIT').length, 1); assert.equal(current.events.filter(event => event === 'SEAL').length, 1);
  let called = false; owner.reportCliFailure(primary, true, () => { called = true; }); assert.equal(called, false);
});

test('cooperative cancellation after committed artifacts preserves exact reason and does not run reflection', async t => {
  flag(t); const controller = new AbortController(); const primary = Object.freeze(new Error('cancel reason'));
  const current = fixture({ options: { signal: controller.signal }, afterExport: () => controller.abort(primary) });
  await assert.rejects(current.run(), error => error === primary); assert.ok(current.events.includes('EXPORT'));
  assert.equal(current.events.includes('REFLECT'), false); assert.equal(current.stdout.length, 0); assert.equal(current.result.items[0].quantity, 2);
});

test('effective contradictory checks agree in lifecycle and evidence and cannot yield COMPLETE', async t => {
  flag(t); const current = fixture({ phaseChecks: { 3: [{ status: 'UNKNOWN', label: 'unmeasured' }] } }); await current.run();
  assert.equal(current.ledger.phases.phase_3.status, 'ACTION_REQUIRED'); assert.equal(current.result.lifecycleHealth.healthy, false);
  assert.equal(current.result.evidenceHealth.healthy, false); assert.equal(current.result.evidenceHealth.workflowStatus, 'INCOMPLETE');
  assert.equal(current.ledger.phases.phase_3.checks.length, 1);
});

module.exports = { fixture, flag };
