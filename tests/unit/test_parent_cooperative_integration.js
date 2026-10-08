'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { EventEmitter } = require('node:events');
const root = path.resolve(__dirname, '../..');
function clock() {
  let now = 0, next = 0; const timers = new Map();
  return { setTimeout(fn, ms) { const id = ++next; timers.set(id, { fn, at: now + ms }); return id; },
    clearTimeout: id => timers.delete(id), size: () => timers.size,
    tick(ms) { const end = now + ms; while (true) { const due = [...timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break; timers.delete(due[0]); now = due[1].at; due[1].fn(); } now = end; } };
}
function child() { const c = new EventEmitter(); Object.assign(c, { connected: true, pid: 42, exitCode: null, signalCode: null,
  stdout: new EventEmitter(), stderr: new EventEmitter(), kills: [], sends: [],
  kill(signal) { this.kills.push(signal); return true; }, send(message, callback) { this.sends.push(message); callback?.(); } }); return c; }
function helper(c = clock(), preimage = false) {
  const file = path.join(root, preimage ? 'tests/receipts/parent-integration/preimages/child_termination.js' : 'scripts/lib/system/child_termination.js');
  const m = { exports: {} }; vm.runInNewContext(fs.readFileSync(file, 'utf8'), { module: m, exports: m.exports, ...c });
  return { ...m.exports, clock: c };
}
const frame = result => '__EVAL_RESULT_JSON__' + JSON.stringify(result) + '__EVAL_RESULT_JSON__';

test('default helper matches original TERM/grace/KILL/confirmation timing and receipt', async () => {
  const results = [];
  for (const preimage of [true, false]) {
    const h = helper(clock(), preimage), c = child(), reason = Object.freeze({ primary: true });
    const p = h.requestChildTermination(c, { reason });
    assert.deepEqual(c.kills, ['SIGTERM']); assert.equal(c.sends.length, 0);
    h.clock.tick(249); assert.deepEqual(c.kills, ['SIGTERM']); h.clock.tick(1); assert.deepEqual(c.kills, ['SIGTERM', 'SIGKILL']);
    h.clock.tick(1000); const result = await p; assert.strictEqual(result.reason, reason);
    assert.equal(result.exitConfirmed, false); assert.equal(h.clock.size(), 0); results.push(JSON.parse(JSON.stringify(result)));
  }
  assert.deepEqual(results[0], results[1]);
});

test('cooperative pre-ready request sends immediately and actual close avoids every kill', async () => {
  const h = helper(), c = child(), reason = Object.freeze({ code: 'exact' }); const foreign = () => {};
  c.on('close', foreign);
  const p = h.requestChildTermination(c, { cooperative: true, reason, graceMs: 50 });
  assert.equal(c.sends.length, 1); assert.strictEqual(c.sends[0].reason, reason); assert.equal(c.sends[0].type, 'PRESALES_CANCEL');
  assert.deepEqual(c.kills, []); c.emit('close', 1, null); const receipt = await p;
  assert.equal(receipt.exitConfirmed, true); assert.strictEqual(receipt.reason, reason);
  assert.equal(h.clock.size(), 0); assert.deepEqual(c.listeners('close'), [foreign]); assert.equal(c.listenerCount('error'), 0);
});

for (const mutate of [c => c.connected = false, c => delete c.send]) test('no usable IPC retains legacy escalation', async () => {
  const h = helper(), c = child(); mutate(c);
  const p = h.requestChildTermination(c, { cooperative: true, graceMs: 5, confirmationMs: 7 });
  assert.deepEqual(c.kills, ['SIGTERM']); h.clock.tick(5); assert.deepEqual(c.kills, ['SIGTERM', 'SIGKILL']);
  h.clock.tick(7); assert.equal((await p).state, 'EXIT_UNCONFIRMED'); assert.equal(h.clock.size(), 0);
});

for (const mode of ['throw', 'callback']) test('IPC send ' + mode + ' stays secondary and retains cooperative interval', async () => {
  const h = helper(), c = child(), fault = new Error('send failed'), reason = false;
  c.send = (message, callback) => { assert.strictEqual(message.reason, reason); if (mode === 'throw') throw fault; callback(fault); };
  const p = h.requestChildTermination(c, { cooperative: true, reason, graceMs: 5, confirmationMs: 7 });
  assert.deepEqual(c.kills, []); h.clock.tick(5); assert.deepEqual(c.kills, ['SIGTERM']);
  h.clock.tick(5); assert.deepEqual(c.kills, ['SIGTERM', 'SIGKILL']); h.clock.tick(7);
  const receipt = await p; assert.strictEqual(receipt.reason, reason); assert.strictEqual(receipt.secondaryFaults[0], fault); assert.equal(receipt.exitConfirmed, false);
});

test('cooperative escalation waits both intervals and only close confirms exit', async () => {
  const h = helper(), c = child(), p = h.requestChildTermination(c, { cooperative: true, graceMs: 5 });
  h.clock.tick(4); assert.deepEqual(c.kills, []); h.clock.tick(1); assert.deepEqual(c.kills, ['SIGTERM']);
  h.clock.tick(4); assert.deepEqual(c.kills, ['SIGTERM']); c.emit('close', null, 'SIGTERM');
  assert.equal((await p).exitConfirmed, true); h.clock.tick(10000); assert.deepEqual(c.kills, ['SIGTERM']); assert.equal(h.clock.size(), 0);
});

function groupRunner(owned, termination) {
  const c = child(), calls = [], wrappers = [], file = path.join(root, 'scripts/lib/boq/multi_child_evaluation.js'), m = { exports: {} };
  const fakeProcess = { execPath: process.execPath, env: { PRESALES_TERMINAL_OWNER: owned ? '1' : '0', FIXTURE_ENV: 'preserved' } };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), { module: m, exports: m.exports, __filename: file, __dirname: path.dirname(file),
    process: fakeProcess, Buffer, setTimeout, clearTimeout,
    require: name => {
      if (name === 'path') return path;
      if (name === 'child_process') return { spawn: (...args) => { calls.push(args); return c; } };
      if (name.endsWith('observed_child_process.js')) return { spawnObservedChild: (name, source, start) => { wrappers.push({ name, source }); return start(owned ? { PRESALES_EXECUTION_PARENT_ROOT_ID: 'fixture-parent' } : {}); } };
      if (name.endsWith('child_termination.js')) return { requestChildTermination: (child, options) => termination(child, options) };
      throw new Error('Unexpected dependency: ' + name);
    } }, { filename: file });
  return { ...m.exports, child: c, calls, wrappers };
}
const group = { filePath: 'fixture.csv', sheetName: 'Server Config' };

test('owner off keeps original spawn options, wrapper always invoked, default termination receives no cooperative request', async () => {
  let requested; const f = groupRunner(false, async (c, options) => { requested = options; return { exitConfirmed: false }; });
  const controller = new AbortController(), p = f.executeGroupChild(group, { signal: controller.signal });
  assert.equal(f.wrappers.length, 1); assert.equal(f.calls[0][2].stdio, undefined);
  assert.equal(f.calls[0][2].env.FIXTURE_ENV, 'preserved'); assert.equal(f.calls[0][2].env.STRUCTURED_PROGRESS, '0');
  controller.abort('exact'); await Promise.resolve(); assert.equal(requested.cooperative, false); assert.equal(requested.graceMs, undefined);
  f.child.emit('close', null, 'SIGTERM'); const result = await p; assert.equal(result.status, 'CANCELLED'); assert.equal(result.result, undefined);
});

test('owned group drains exact canonical cancellation frame and holds ownership through unconfirmed helper', async () => {
  let requested; const f = groupRunner(true, async (c, options) => { requested = options; return { state: 'EXIT_UNCONFIRMED', exitConfirmed: false }; });
  const controller = new AbortController(), reason = Object.freeze({ primary: true }); let settled = false;
  const p = f.executeGroupChild(group, { signal: controller.signal }).then(result => { settled = true; return result; });
  assert.deepEqual(Array.from(f.calls[0][2].stdio), ['pipe', 'pipe', 'pipe', 'ipc']); assert.equal(f.calls[0][2].env.PRESALES_EXECUTION_PARENT_ROOT_ID, 'fixture-parent');
  controller.abort(reason); await Promise.resolve(); assert.equal(settled, false); assert.equal(requested.cooperative, true); assert.equal(requested.graceMs, 5000); assert.strictEqual(requested.reason, reason);
  const payload = { status: 'CANCELLED', data: { traceId: 'literal-trace', evidenceLogPath: 'literal-final-ledger' } };
  const bytes = frame(payload); f.child.stdout.emit('data', bytes.slice(0, 17)); f.child.stdout.emit('data', bytes.slice(17)); f.child.stderr.emit('data', 'during-drain');
  f.child.emit('close', 1, null); const result = await p;
  assert.deepEqual(JSON.parse(JSON.stringify(result.result)), payload); assert.equal(result.stderr, 'during-drain'); assert.equal(result.status, 'CANCELLED');
});

test('owned group helper rejection retains task until actual close and never fabricates evidence', async () => {
  const f = groupRunner(true, async () => { throw new Error('helper fault'); }); const controller = new AbortController(); let settled = false;
  const p = f.executeGroupChild(group, { signal: controller.signal, graceMs: 7 }).then(result => { settled = true; return result; });
  controller.abort(null); await new Promise(resolve => setImmediate(resolve)); assert.equal(settled, false); assert.deepEqual(f.child.kills, ['SIGKILL']);
  f.child.emit('close', null, 'SIGKILL'); const result = await p; assert.equal(result.result, undefined); assert.equal(result.receipt.exitConfirmed, true);
});
