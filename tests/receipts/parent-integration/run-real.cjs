'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process'), assert = require('assert/strict');
const root = path.resolve(__dirname, '../../..');
const { safeWriteJsonAtomic } = require(path.join(root, 'scripts/lib/system/fs_compat'));
Object.assign(process.env, { PRESALES_TERMINAL_OWNER: '1', PRESALES_EXECUTION_TRACE: '1', PRESALES_QUERY_SHADOW: '0', LOCAL_EVAL_ONLY: '1', AUTO_UPLOAD_DRIVE: 'false', SYNC_RAG: '0' });
const scope = require(path.join(root, 'scripts/lib/system/execution_scope'));
const fixture = require(path.join(root, 'tests/fixtures/skill_workflow_characterization')).localFixture(root);
const input = path.join(__dirname, 'canonical-input.csv'); fs.writeFileSync(input, fixture.csv);
const spawn = cp.spawn; let current;
cp.spawn = function (...args) {
  const child = spawn(...args); current.child = child; current.spawn = { executable: args[0], args: args[1], stdio: args[2].stdio,
    parentRootId: args[2].env.PRESALES_EXECUTION_PARENT_ROOT_ID, traceId: args[2].env.PRESALES_EXECUTION_PARENT_TRACE_ID };
  child.stdout.on('data', data => current.stdout += data); child.stderr.on('data', data => current.stderr += data);
  const kill = child.kill; child.kill = function (signal) { current.kills.push(signal); return kill.call(this, signal); };
  const send = child.send; child.send = function (...sendArgs) { current.sends.push(sendArgs[0]); return send.apply(this, sendArgs); };
  child.on('message', message => { if (message.type === 'PRESALES_CANCELLATION_READY') {
    current.ready++; if (current.mode === 'cancel') current.controller.abort({ code: 'REAL_PARENT_GROUP_CANCEL' });
  } });
  if (current.mode === 'force') setImmediate(() => current.controller.abort('FORCE_TEST_WITHOUT_FINAL_LEDGER'));
  return child;
};
const { executeGroupChild } = require(path.join(root, 'scripts/lib/boq/multi_child_evaluation'));
const outcomes = [];
async function run(mode) {
  current = { mode, stdout: '', stderr: '', sends: [], kills: [], ready: 0, controller: new AbortController() };
  const state = current, start = Date.now(); let handle;
  const watchdog = setTimeout(() => { state.watchdog = true; state.child?.kill('SIGKILL'); }, 20000);
  const result = await scope.withExecutionRoot({ name: 'PARENT_GROUP_INTEGRATION_' + mode }, () => {
    handle = scope.getExecutionHandle();
    return executeGroupChild({ filePath: input, sheetName: 'Server Config', displayLabel: mode }, {
      offline: true, chassisDir: path.join(root, 'outputs/ProLiant/Gen12/DL380_Gen12'),
      signal: state.controller.signal, timeoutMs: 15000, ...(mode === 'force' ? { graceMs: 1 } : {}) });
  }, { sink: scope.createJsonSidecarSink(path.join(root, 'outputs/history/parent_integration_traces')) });
  clearTimeout(watchdog); await new Promise(resolve => setImmediate(resolve)); await handle.waitForPersistence();
  fs.writeFileSync(path.join(__dirname, mode + '.stdout.log'), state.stdout); fs.writeFileSync(path.join(__dirname, mode + '.stderr.log'), state.stderr);
  const snapshot = handle.snapshot(); safeWriteJsonAtomic(path.join(__dirname, mode + '.parent-observation.json'), snapshot);
  const frames = [...state.stdout.matchAll(/__EVAL_RESULT_JSON__([\s\S]*?)__EVAL_RESULT_JSON__/g)];
  const traceDir = path.join(root, 'outputs/history/evidence_logs');
  const childSidecars = fs.existsSync(traceDir) ? fs.readdirSync(traceDir).filter(file => file.startsWith('execution_trace_') && file.endsWith('.json'))
    .map(file => ({ path: path.join(traceDir, file), data: JSON.parse(fs.readFileSync(path.join(traceDir, file))) }))
    .filter(item => item.data.parentRootId === handle.rootId) : [];
  const record = { mode, elapsedMs: Date.now() - start, result, spawn: state.spawn, sends: state.sends, kills: state.kills,
    readiness: state.ready, frameCount: frames.length, markerCount: state.stdout.split('__EVAL_RESULT_JSON__').length - 1,
    watchdog: Boolean(state.watchdog), parentObservationPath: snapshot.persistence.path || null, childSidecars: childSidecars.map(item => item.path) };
  outcomes.push(record); safeWriteJsonAtomic(path.join(__dirname, 'real-outcomes.json'), { fixture, outcomes });
  assert.equal(state.watchdog, undefined); assert.equal(snapshot.persistence.status, 'PERSISTED');
  assert.equal(state.spawn.parentRootId, handle.rootId); assert.match(state.spawn.traceId, /^TRC-/);
  assert.ok(snapshot.events.some(event => event.event === 'STARTED' && event.metadata.name.endsWith('#executeGroupChild')));
  if (mode === 'force') {
    assert.equal(result.status, 'CANCELLED'); assert.equal(result.result, undefined); assert.equal(frames.length, 0); assert.ok(state.kills.includes('SIGTERM'));
    assert.equal(result.receipt.exitConfirmed, true);
  } else {
    assert.equal(frames.length, 1); assert.equal(record.markerCount, 2); assert.equal(state.ready, 1); assert.deepEqual(state.kills, []);
    assert.equal(result.status, mode === 'cancel' ? 'CANCELLED' : 'ACTION_REQUIRED');
    assert.equal(result.result.status, mode === 'cancel' ? 'CANCELLED' : 'ACTION_REQUIRED');
    const pathEvidence = result.result.data.evidenceLogPath; assert.ok(fs.existsSync(pathEvidence));
    const ledger = JSON.parse(fs.readFileSync(pathEvidence));
    assert.equal(childSidecars.length, 1);
    assert.ok(childSidecars[0].data.traceAssociations.some(association => association.traceId === state.spawn.traceId));
    assert.ok(childSidecars[0].data.traceAssociations.some(association => association.traceId === ledger.traceId));
    assert.ok(childSidecars[0].data.terminal);
    if (mode === 'cancel') {
      assert.equal(result.receipt.exitConfirmed, true); assert.equal(result.process.exitCode, 1); assert.equal(result.process.signal, null);
      assert.equal(state.sends.length, 1); assert.equal(state.sends[0].type, 'PRESALES_CANCEL');
      assert.ok(Object.values(ledger.phases).some(phase => phase.status === 'FAILED'));
      assert.ok(Object.values(ledger.phases).some(phase => phase.status === 'NOT_REACHED'));
    }
  }
  console.log(mode + ' PASS ' + record.elapsedMs + 'ms; frames=' + frames.length + '; kills=' + state.kills.join(','));
}
(async () => { await run('normal'); await run('cancel'); await run('force'); })().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { cp.spawn = spawn; });
