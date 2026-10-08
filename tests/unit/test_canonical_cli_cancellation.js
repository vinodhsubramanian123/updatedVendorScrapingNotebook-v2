'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { runCliPipeline } = require('../../scripts/lib/lifecycle/canonical_cli_cancellation');
const owner = require('../../scripts/lib/lifecycle/canonical_terminal_owner');

function channel(enabled = true) {
  const result = new EventEmitter();
  Object.assign(result, { env: { PRESALES_TERMINAL_OWNER: enabled ? '1' : '0' }, connected: true, sends: [], disconnects: 0,
    send(message, callback) { this.sends.push(message); callback(); },
    disconnect() { this.disconnects++; this.connected = false; } });
  return result;
}

test('flag off preserves exact options/result and installs zero IPC listeners', async () => {
  const ipc = channel(false), options = Object.freeze({ JSON_MODE: true }), result = {};
  const foreign = () => {}; ipc.on('message', foreign);
  assert.strictEqual(await runCliPipeline(options, received => {
    assert.strictEqual(received, options); assert.deepEqual(ipc.listeners('message'), [foreign]); return result;
  }, ipc), result);
  assert.equal(ipc.disconnects, 0); assert.deepEqual(ipc.sends, []);
});

for (const reason of [Object.freeze({ code: 'frozen' }), 'primitive', 0, false, null]) {
  test('cancel preserves received reason identity and cleans only its listener: ' + String(reason), async () => {
    const ipc = channel(), foreign = () => {}; ipc.on('message', foreign);
    let removes = 0; const remove = ipc.removeListener;
    ipc.removeListener = function (...args) { removes++; return remove.apply(this, args); };
    const primary = {};
    try {
      await runCliPipeline({}, async options => {
        assert.deepEqual(ipc.sends, [{ type: 'PRESALES_CANCELLATION_READY' }]);
        assert.equal(ipc.listenerCount('message'), 2);
        ipc.emit('message', { type: 'PRESALES_CANCEL', reason });
        ipc.emit('message', { type: 'PRESALES_CANCEL', reason: 'duplicate' });
        assert.strictEqual(options.signal.reason, reason); throw primary;
      }, ipc);
      assert.fail('expected failure');
    } catch (error) { assert.strictEqual(error, primary); }
    assert.equal(removes, 1); assert.equal(ipc.disconnects, 1); assert.deepEqual(ipc.listeners('message'), [foreign]);
  });
}

test('successful owned pipeline cleans IPC once; disconnected channel sends no readiness', async () => {
  const ipc = channel(); assert.equal(await runCliPipeline({}, () => 7, ipc), 7);
  assert.equal(ipc.disconnects, 1); assert.equal(ipc.listenerCount('message'), 0);
  const disconnected = channel(); disconnected.connected = false;
  await runCliPipeline({}, () => 1, disconnected);
  assert.deepEqual(disconnected.sends, []); assert.equal(disconnected.disconnects, 0);
});

for (const cancelled of [true, false]) {
  test('owner reports exact abort as CANCELLED and concurrent unrelated error as ERROR: ' + cancelled, async () => {
    const controller = new AbortController(), reason = Object.freeze({ reason: 'received' });
    const error = cancelled ? reason : new Error('unrelated');
    const ledger = { traceId: 'fixture', phases: {},
      startPhase(n) { this.phases['phase_' + n] = { status: 'RUNNING' }; },
      completePhase(n, status) { this.phases['phase_' + n].status = status; },
      getHealth() { return { gaps: [], workflowStatus: 'FAILED' }; }, recordWorkflowFailure() {},
      finalizeAndExport() { return { jsonPath: 'fixture-evidence.json' }; } };
    const engine = { completePhase() {}, getHealth() { return { healthy: false, failures: [error] }; },
      async executePipelineDAG(context, handlers) { return handlers.INGESTION(context); } };
    await assert.rejects(owner.executeOwnedPipeline({ options: { signal: controller.signal },
      createLedger: () => ledger, createEngine: () => engine, createContext: () => ({}),
      createHandlers: () => ({ INGESTION() { ledger.startPhase(1); controller.abort(reason); throw error; } })
    }), thrown => thrown === error);
    assert.equal(owner.failureMetadata(error).status, cancelled ? 'CANCELLED' : 'ERROR');
    assert.equal(ledger.phases.phase_1.status, 'FAILED');
    assert.equal(ledger.phases.phase_9.status, 'NOT_REACHED');
    const frames = [], write = process.stdout.write;
    try { process.stdout.write = value => { frames.push(value); return true; }; owner.reportCliFailure(error, true, () => assert.fail('legacy')); }
    finally { process.stdout.write = write; }
    assert.equal(frames.length, 1);
    const payload = JSON.parse(frames[0].split('__EVAL_RESULT_JSON__')[1]);
    assert.equal(payload.status, cancelled ? 'CANCELLED' : 'ERROR');
    assert.equal(payload.data.evidenceLogPath, 'fixture-evidence.json');
  });
}
