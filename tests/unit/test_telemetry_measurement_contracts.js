'use strict';
// CP6 independent-verifier fixtures. Every persistence test uses a disposable root.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, spawnSync } = require('child_process');
const { normalizeTelemetryMeasurement: normalize, validateTelemetryMeasurement: validate, RUN_KINDS } = require('../../scripts/lib/system/telemetry_measurement.js');
const { summarizeTelemetryPopulation: summarize } = require('../../scripts/lib/system/telemetry_populations.js');
const { migrateLegacyTelemetry: migrate, LEGACY_STREAMS } = require('../../scripts/lib/system/telemetry_legacy_migration.js');
const { createTelemetryMeasurementStore: createStore } = require('../../scripts/lib/system/telemetry_measurement_store.js');
const { safeWriteJsonAtomic } = require('../../scripts/lib/system/fs_compat.js');
const { isWithin } = require('../../scripts/maintenance/skill_workflow/io.js');
const root = path.resolve(__dirname, '../..');
const observed = value => ({ status: 'OBSERVED', value, evidenceRefs: ['fixture-observation'] });
const raw = (eventId, overrides = {}) => ({ eventId, runKind: 'PRODUCTION', eventType: 'EVALUATION', observerId: 'fixture-author', ...overrides });
const production = { runKind: 'PRODUCTION', eventType: 'EVALUATION' };

function disposable(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cp6-measurements-'));
  t.after(() => {
    assert.ok(isWithin(path.resolve(os.tmpdir()), path.resolve(directory)) && path.resolve(directory) !== path.resolve(os.tmpdir()));
    fs.rmSync(directory, { recursive: true, force: true });
  });
  return directory;
}

test('missing observations stay null/UNKNOWN without timing, confidence, model or rule defaults', () => {
  const entry = normalize(raw('missing'));
  for (const metric of Object.values(entry.metrics)) assert.deepEqual(metric, { status: 'UNKNOWN', value: null, evidenceRefs: [] });
  assert.equal(entry.chassisModel, null);
  assert.deepEqual(entry.stageDurations, {});
  assert.equal(entry.terminal.state, 'UNKNOWN');
  assert.deepEqual(validate(entry), []);
});

test('measured zero is distinct from missing data, with explicit references', () => {
  const entry = normalize(raw('zeros', { metrics: { durationMs: observed(0), confidenceScore: observed(0), rulesEvaluated: observed(0), newDeltasThisRun: observed(0) } }));
  assert.deepEqual(validate(entry), []);
  for (const metric of Object.values(entry.metrics)) assert.equal(metric.status, 'OBSERVED');
  const result = summarize([entry], production);
  assert.equal(result.metrics.durationMs.mean, 0);
  assert.equal(result.metrics.newDeltasThisRun.sum, 0);
});

test('numeric strings, booleans, arrays, NaN, infinities and negative observations are not measurements', () => {
  for (const value of ['12', false, [], NaN, Infinity, -1]) {
    const entry = normalize(raw('invalid-number', { metrics: { durationMs: observed(value) } }));
    assert.equal(entry.metrics.durationMs.value, null);
    assert.ok(validate(entry).length);
  }
  for (const value of [1.1, -0.1]) assert.ok(validate(normalize(raw('invalid-confidence', { metrics: { confidenceScore: observed(value) } }))).length);
  assert.ok(validate(normalize(raw('fractional-rules', { metrics: { rulesEvaluated: observed(1.5) } }))).length);
});

test('unreferenced and untagged values do not count as observed', () => {
  for (const claim of [5, { value: 5 }, { status: 'OBSERVED', value: 5, evidenceRefs: [] }]) {
    const entry = normalize(raw('unreferenced', { metrics: { durationMs: claim } }));
    assert.equal(entry.metrics.durationMs.status, 'UNKNOWN');
    assert.ok(entry.issues.length);
  }
});

test('run kind never comes from file names, environment hints or a production fallback', () => {
  const entry = normalize({ eventId: 'unclassified', eventType: 'EVALUATION', file: 'customer.xlsx', NODE_ENV: 'production', production: true });
  assert.equal(entry.runKind, 'UNCLASSIFIED');
  assert.ok(validate(normalize(raw('bad-kind', { runKind: 'CUSTOMER' }))).length);
  assert.throws(() => { RUN_KINDS.push('CUSTOMER'); }, TypeError);
});

test('terminal success/failure/cancellation is separate and requires terminal references', () => {
  for (const terminalState of ['COMPLETED', 'FAILED', 'CANCELLED', 'ACTION_REQUIRED']) {
    const missing = normalize(raw('terminal', { terminalState }));
    assert.equal(missing.terminal.state, 'UNKNOWN');
    assert.ok(validate(missing).length);
    const entry = normalize(raw('terminal', { terminalState, terminalEvidenceRefs: ['terminal-receipt'] }));
    assert.equal(entry.terminal.state, terminalState);
    assert.deepEqual(validate(entry), []);
  }
});

test('partial stage observations do not manufacture percentages of total duration', () => {
  const entry = normalize(raw('stage', { metrics: { durationMs: observed(100) }, stageDurations: { parsing: observed(2), rag: { status: 'UNKNOWN' } } }));
  assert.equal(entry.stageDurations.parsing.value, 2);
  assert.equal(entry.stageDurations.rag.value, null);
  assert.equal(Object.keys(entry.stageDurations).length, 2);
  assert.deepEqual(validate(entry), []);
});

test('high confidence is coverage/model score, never adjudicated accuracy', () => {
  const entries = [normalize(raw('confident', { metrics: { confidenceScore: observed(0.99) }, evalAccuracyScore: 100 }))];
  const summary = summarize(entries, production);
  assert.equal(summary.metrics.confidenceScore.mean, 0.99);
  assert.equal(summary.metrics.confidenceScore.coveragePercent, 100);
  assert.equal(summary.adjudicatedAccuracy.ratePercent, null);
  assert.equal(summary.adjudicatedAccuracy.unknownEligibility, 1);
});

test('absence of fallback, old badges and cloud modes are not affirmative grounding', () => {
  const entry = normalize(raw('non-fallback', { ragFallbackUsed: false, cloudGroundingRatio: 100, notebookLmMode: 'CLOUD', isCloudGrounded: true }));
  assert.equal(entry.affirmativeGrounding.status, 'UNKNOWN');
  assert.equal(summarize([entry], production).affirmativeGrounding.ratePercent, null);
});

test('affirmative grounding requires observation references and native citation references', () => {
  const claim = { eligible: true, ...observed(true) };
  const missing = normalize(raw('missing-citations', { affirmativeGrounding: claim }));
  assert.equal(missing.affirmativeGrounding.status, 'UNKNOWN');
  assert.ok(validate(missing).length);
  const grounded = normalize(raw('grounded', { affirmativeGrounding: { ...claim, nativeCitationRefs: ['native-quote'] } }));
  assert.deepEqual(validate(grounded), []);
  assert.equal(summarize([grounded], production).affirmativeGrounding.numerator, 1);
  assert.equal(grounded.evidenceBasis, 'SOURCE_DECLARED_NOT_INDEPENDENTLY_VERIFIED');
});

test('correctness requires distinct declared reviewer and observer with references', () => {
  for (const reviewerId of [null, '', 'fixture-author']) {
    const entry = normalize(raw('unreviewed', { adjudicatedAccuracy: { eligible: true, ...observed(true), reviewerId } }));
    assert.equal(entry.adjudicatedAccuracy.status, 'UNKNOWN');
    assert.ok(validate(entry).length);
  }
  const reviewed = normalize(raw('reviewed', { adjudicatedAccuracy: { eligible: true, ...observed(false), reviewerId: 'fixture-reviewer' } }));
  assert.deepEqual(validate(reviewed), []);
  assert.equal(summarize([reviewed], production).adjudicatedAccuracy.ratePercent, 0);
});

test('outcome rates disclose eligible, observed, unknown, unknown eligibility and excluded denominators', () => {
  const make = (id, outcome) => normalize(raw(id, { adjudicatedAccuracy: outcome }));
  const entries = [make('yes', { eligible: true, ...observed(true), reviewerId: 'reviewer' }), make('no', { eligible: true, ...observed(false), reviewerId: 'reviewer' }), make('pending', { eligible: true, status: 'UNKNOWN' }), make('scope-unknown', null), make('out-of-scope', { eligible: false })];
  const result = summarize(entries, production).adjudicatedAccuracy;
  assert.equal(result.numerator, 1);
  assert.equal(result.denominator, 2);
  assert.equal(result.eligible, 3);
  assert.equal(result.unknown, 1);
  assert.equal(result.unknownEligibility, 1);
  assert.equal(result.ineligible, 1);
  assert.equal(result.ratePercent, 50);
});

for (const runKind of RUN_KINDS) {
  test(`${runKind} stays separate from every other run kind and event stream`, () => {
    const entries = RUN_KINDS.map((kind, index) => normalize(raw(kind, { runKind: kind, metrics: { durationMs: observed(index) } })));
    entries.push(normalize(raw('other-event', { runKind, eventType: 'EXPORT', metrics: { durationMs: observed(500) } })));
    const result = summarize(entries, { runKind, eventType: 'EVALUATION' });
    assert.equal(result.population.selected, 1);
    assert.equal(result.population.excluded, 5);
    assert.equal(result.metrics.durationMs.mean, RUN_KINDS.indexOf(runKind));
  });
}

test('explicit population selector required; empty observed populations have null rates/means', () => {
  assert.equal(summarize([], {}).valid, false);
  assert.equal(summarize(null, production).valid, false);
  const result = summarize([], production);
  assert.equal(result.valid, true);
  assert.equal(result.metrics.durationMs.mean, null);
  assert.equal(result.metrics.confidenceScore.coveragePercent, null);
  assert.equal(result.adjudicatedAccuracy.ratePercent, null);
});

test('duplicate IDs and forged metric schemas cannot be double-counted', () => {
  const entry = normalize(raw('duplicate'));
  assert.equal(summarize([entry, entry], production).valid, false);
  entry.metrics.confidenceScore = { status: 'OBSERVED', value: 1, evidenceRefs: [] };
  assert.equal(summarize([entry], production).valid, false);
});

test('legacy projection preserves all eight streams, raw history and unknown top-level fields', () => {
  const legacy = Object.freeze({ ...Object.fromEntries(Object.keys(LEGACY_STREAMS).map(name => [name, Object.freeze([{ id: 'reused-id', confidenceScore: 1, durationMs: 0, cloudGroundingRatio: 100, runKind: 'PRODUCTION' }])])), customFutureData: Object.freeze({ opaque: 42 }) });
  const result = migrate(legacy, { sourceRef: 'fixture-source-sha256' });
  assert.equal(result.valid, true);
  assert.strictEqual(result.legacySnapshot, legacy);
  assert.equal(result.entries.length, 8);
  assert.equal(new Set(result.entries.map(e => e.eventId)).size, 8);
  for (const entry of result.entries) {
    assert.equal(entry.runKind, 'UNCLASSIFIED');
    assert.equal(entry.origin, 'LEGACY_UNVERIFIED');
    assert.strictEqual(entry.legacy, legacy[entry.legacySource.stream][0]);
    assert.equal(entry.metrics.durationMs.value, null);
    assert.deepEqual(validate(entry), []);
  }
  assert.equal(summarize(result.entries, production).population.selected, 0);
  assert.equal(result.legacySnapshot.customFutureData.opaque, 42);
});

test('invalid legacy streams/source identity are disclosed and original bytes/data are not replaced', () => {
  const legacy = { history: 'not-an-array', custom: ['retain'] };
  const missing = migrate(legacy);
  assert.equal(missing.valid, false);
  assert.strictEqual(missing.legacySnapshot, legacy);
  const invalid = migrate(legacy, { sourceRef: 'fixture-source' });
  assert.equal(invalid.valid, false);
  assert.equal(invalid.issues[0].code, 'LEGACY_STREAM_NOT_ARRAY');
});

test('unverified historical entries cannot be manually promoted into production observations', () => {
  const entry = migrate({ history: [{ confidenceScore: 1 }] }, { sourceRef: 'fixture-source' }).entries[0];
  assert.ok(validate(normalize(entry)).length);
  entry.runKind = 'PRODUCTION';
  assert.equal(summarize([entry], production).valid, false);
  entry.runKind = 'UNCLASSIFIED';
  entry.metrics.confidenceScore = observed(1);
  assert.ok(validate(entry).some(issue => issue.code === 'LEGACY_OBSERVATION_PROMOTION_PROHIBITED'));
});

test('new deltas this run never use total registry size; numeric overflow is not serialized as success', () => {
  const entries = [normalize(raw('delta-zero', { metrics: { newDeltasThisRun: observed(0) }, totalDeltasLearned: 9000 })), normalize(raw('delta-missing', { totalDeltasLearned: 9000 }))];
  const result = summarize(entries, production).metrics.newDeltasThisRun;
  assert.equal(result.sum, 0);
  assert.equal(result.observed, 1);
  assert.equal(result.unknown, 1);
  const overflow = summarize([normalize(raw('large-a', { metrics: { durationMs: observed(1e308) } })), normalize(raw('large-b', { metrics: { durationMs: observed(1e308) } }))], production).metrics.durationMs;
  assert.equal(overflow.aggregationStatus, 'OVERFLOW');
  assert.equal(overflow.sum, null);
  assert.equal(overflow.mean, null);
});

test('opt-in store requires explicit existing absolute root and persists separate population files', t => {
  const directory = disposable(t);
  assert.throws(() => createStore('outputs/history'), /EXPLICIT_ABSOLUTE/);
  assert.throws(() => createStore(path.join(directory, 'missing')), /MUST_EXIST/);
  const store = createStore(directory);
  for (const runKind of RUN_KINDS) store.append(raw(runKind, { runKind }));
  for (const runKind of RUN_KINDS) {
    assert.equal(store.read(runKind).entries.length, 1);
    assert.ok(fs.existsSync(path.join(directory, `${runKind}.json`)));
  }
  assert.throws(() => store.read('ALL'), /EXPLICIT_RUN_KIND/);
});

test('identical retries are idempotent; conflicting event retries preserve committed history', t => {
  const store = createStore(disposable(t));
  const input = raw('idempotent', { metrics: { durationMs: observed(0) } });
  assert.equal(store.append(input).appended, true);
  assert.equal(store.append(input).appended, false);
  assert.throws(() => store.append(raw('idempotent', { metrics: { durationMs: observed(1) } })), /EVENT_ID_CONFLICT/);
  assert.equal(store.read('PRODUCTION').entries.length, 1);
  assert.equal(store.read('PRODUCTION').entries[0].metrics.durationMs.value, 0);
});

test('corrupt JSON/schema and invalid observations fail closed without replacing history', t => {
  const directory = disposable(t), store = createStore(directory);
  assert.throws(() => store.append(normalize(raw('already-versioned'))), /OBSERVATION_INVALID/);
  assert.throws(() => store.append(raw('bad', { metrics: { durationMs: observed(-1) } })), /OBSERVATION_INVALID/);
  assert.equal(fs.existsSync(path.join(directory, 'PRODUCTION.json')), false);
  store.append(raw('valid'));
  const file = path.join(directory, 'PRODUCTION.json');
  safeWriteJsonAtomic(file, { schemaVersion: 999, runKind: 'PRODUCTION', entries: [] });
  const corrupt = fs.readFileSync(file);
  assert.throws(() => store.append(raw('later')), /STORE_CORRUPT/);
  assert.deepEqual(fs.readFileSync(file), corrupt);
  // Explicit crash/truncation fault injection in disposable fixture only.
  fs.truncateSync(file, 1);
  const truncated = fs.readFileSync(file);
  assert.throws(() => store.append(raw('after-truncation')), SyntaxError);
  assert.deepEqual(fs.readFileSync(file), truncated);
});

test('concurrent writers retain every acknowledged event, not merely syntactically valid JSON', { timeout: 20000 }, async t => {
  const children = [];
  t.after(async () => {
    await Promise.all(children.filter(child => child.exitCode === null).map(child => new Promise(resolve => {
      child.once('close', resolve);
      child.kill();
    })));
  });
  const directory = disposable(t);
  const workerCode = `
    const {createTelemetryMeasurementStore}=require(${JSON.stringify(path.join(root, 'scripts/lib/system/telemetry_measurement_store.js'))});
    const store=createTelemetryMeasurementStore(process.argv[1]),worker=process.argv[2];
    (async()=>{for(let index=0;index<12;index++){let committed=false;for(let retry=0;retry<500;retry++){try{store.append({eventId:worker+'-'+index,runKind:'TEST',eventType:'EVALUATION',metrics:{newDeltasThisRun:{status:'OBSERVED',value:1,evidenceRefs:['fixture-worker']}}});committed=true;break;}catch(error){if(!error.message.startsWith('WORKFLOW_BUSY:'))throw error;await new Promise(resolve=>setTimeout(resolve,2));}}if(!committed)throw Error('Writer lease retry budget exhausted');}process.stdout.write('CP6_WORKER_COMPLETE');})().catch(error=>{process.stderr.write(error.stack);process.exitCode=1;});
  `;
  const completed = await Promise.all(Array.from({ length: 4 }, (_, index) => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['-e', workerCode, directory, String(index)], { cwd: directory });
    children.push(child);
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.once('error', reject);
    child.once('close', code => { if (code === 0 && stdout === 'CP6_WORKER_COMPLETE') resolve(index); else reject(Error(stderr || `Worker ${index} exit ${code}`)); });
  })));
  assert.equal(completed.length, 4);
  const entries = createStore(directory).read('TEST').entries;
  assert.equal(entries.length, 48);
  assert.equal(new Set(entries.map(e => e.eventId)).size, 48);
  for (let worker = 0; worker < 4; worker++) for (let index = 0; index < 12; index++) assert.ok(entries.some(e => e.eventId === `${worker}-${index}`));
  const summary = summarize(entries, { runKind: 'TEST', eventType: 'EVALUATION' });
  assert.equal(summary.metrics.newDeltasThisRun.sum, 48);
  assert.equal(summary.metrics.newDeltasThisRun.unknown, 0);
});

test('pure imports/normalization/migration/summary and store import have no IO/network/process side effects', t => {
  const directory = disposable(t);
  const isolationCode = `
    const assert=require('node:assert/strict'),fs=require('fs'),Module=require('module');const deny=()=>{throw Error('Unexpected CP6 import side effect');};
    for(const name of ['writeFileSync','writeFile','appendFileSync','mkdirSync','renameSync','unlinkSync','rmSync','copyFileSync','createWriteStream'])fs[name]=deny;
    for(const name of ['writeFile','appendFile','mkdir','rename','unlink','rm','copyFile'])fs.promises[name]=deny;
    const cp=require('child_process');for(const name of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'])cp[name]=deny;
    require('net').connect=deny;require('http').request=deny;require('https').request=deny;global.fetch=deny;global.setTimeout=deny;global.setInterval=deny;process.exit=deny;
    const load=Module._load;Module._load=function(id,parent,...args){const resolved=Module._resolveFilename(id,parent);const normalized=typeof resolved==='string'?resolved.split(String.fromCharCode(92)).join('/'):'';if(['/scripts/evaluators/','/scripts/services/','/scripts/scrapers/','/scripts/lib/system/telemetry.js'].some(part=>normalized.includes(part)))deny();return load.call(this,id,parent,...args);};
    const a=require(${JSON.stringify(path.join(root, 'scripts/lib/system/telemetry_measurement.js'))});
    const p=require(${JSON.stringify(path.join(root, 'scripts/lib/system/telemetry_populations.js'))});
    const m=require(${JSON.stringify(path.join(root, 'scripts/lib/system/telemetry_legacy_migration.js'))});
    require(${JSON.stringify(path.join(root, 'scripts/lib/system/telemetry_measurement_store.js'))});
    const entry=a.normalizeTelemetryMeasurement({eventId:'pure',runKind:'TEST',eventType:'EVALUATION'});assert.equal(p.summarizeTelemetryPopulation([entry],{runKind:'TEST',eventType:'EVALUATION'}).metrics.durationMs.mean,null);assert.equal(m.migrateLegacyTelemetry({history:[{confidenceScore:1}]},{sourceRef:'fixture'}).entries[0].runKind,'UNCLASSIFIED');process.stdout.write('CP6_IMPORT_COMPLETE');
  `;
  const child = spawnSync(process.execPath, ['-e', isolationCode], { cwd: directory, encoding: 'utf8', timeout: 10000 });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stdout, 'CP6_IMPORT_COMPLETE');
  assert.deepEqual(fs.readdirSync(directory), []);
});

test('legacy telemetry facade retains all eleven exports without activating new metric paths', () => {
  const telemetry = require('../../scripts/lib/system/telemetry.js');
  for (const name of ['loadTelemetry', 'pruneTelemetry', 'MAX_TELEMETRY_ENTRIES', 'recordEvaluationTelemetry', 'recordFeedbackTelemetry', 'recordNotebookConsultationTelemetry', 'recordCleansingPreflightTelemetry', 'recordOcrTelemetry', 'recordExportTelemetry', 'recordReconciliationTelemetry', 'recordGuardrailTelemetry']) assert.ok(telemetry[name]);
  const entry = telemetry.normalizeTelemetryMeasurement(raw('facade'));
  assert.equal(telemetry.summarizeTelemetryPopulation([entry], production).metrics.durationMs.mean, null);
  assert.equal(telemetry.migrateLegacyTelemetry({ history: [{ confidenceScore: 1 }] }, { sourceRef: 'fixture' }).entries[0].runKind, 'UNCLASSIFIED');
});
