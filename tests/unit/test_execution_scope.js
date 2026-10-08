'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { runWithTrace, getTraceId } = require('../../scripts/lib/system/trace_context.js');
const { withExecutionRoot, observeInvocation, recordTraceAssociation, finishExecutionObservation,
  getExecutionObservation, getExecutionHandle, createJsonSidecarSink,
  verifyJsonSidecarReceipt } = require('../../scripts/lib/system/execution_scope.js');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function execute(callback, options, metadata = { name: 'fixture' }) {
  let handle;
  const result = withExecutionRoot(metadata, () => { handle = getExecutionHandle(); return callback(handle); }, options);
  return { result, handle };
}

for (const value of [Object.freeze({ status: 'SUCCESS' }), 42, undefined, null, 'result', false]) {
  test(`sync identity ${String(value)}`, () => {
    let calls = 0;
    const { result, handle } = execute(() => observeInvocation({ name: 'actualCallback' }, () => { calls++; return value; }));
    assert.equal(result, value);
    assert.equal(calls, 1);
    const observed = handle.snapshot();
    assert.deepEqual(observed.events.map(item => item.event), ['INTAKE_OBSERVED', 'STARTED', 'RETURNED', 'TERMINAL_OBSERVED']);
    assert.equal(observed.terminal.callbackOutcome, 'RETURNED');
    assert.equal(observed.terminal.domainOutcome, 'UNCLASSIFIED');
    assert.equal(getExecutionObservation(), null);
    assert.equal(getTraceId(), 'NO_TRACE_CONTEXT');
  });
}

for (const error of [Object.freeze(new Error('frozen')), 'primitive', null, undefined]) {
  test(`sync rejection identity ${String(error)}`, () => {
    let handle;
    let calls = 0;
    let caught = false;
    try {
      withExecutionRoot({}, () => {
        handle = getExecutionHandle();
        return observeInvocation({}, () => { calls++; throw error; });
      }, { observer: () => { throw new Error('secondary'); }, sink: () => { throw 23; } });
    } catch (actual) { caught = true; assert.equal(actual, error); }
    assert.equal(caught, true);
    assert.equal(calls, 1);
    assert.equal(handle.snapshot().terminal.callbackOutcome, 'REJECTED');
    assert.equal(handle.snapshot().events[2].event, 'REJECTED');
    assert.equal(handle.snapshot().persistence.status, 'FAILED');
    assert.equal(Object.hasOwn(Object(error), 'executionScope'), false);
  });
}

test('native async promise and fulfillment object retain identity', async () => {
  const value = Object.freeze({ status: 'ERROR' });
  const promise = Promise.resolve(value);
  const { result, handle } = execute(() => observeInvocation({}, () => promise));
  assert.equal(result, promise);
  assert.equal(await result, value);
  assert.equal(handle.snapshot().terminal.callbackOutcome, 'RETURNED');
  assert.equal(handle.snapshot().terminal.domainOutcome, 'RETURNED_ERROR');
});

test('async primitive rejection retains identity despite rejecting sink', async () => {
  const error = Object.freeze({ reason: 'primary' });
  let calls = 0;
  const { result, handle } = execute(async () => observeInvocation({}, async () => { calls++; await delay(1); throw error; }),
    { sink: () => Promise.reject(new Error('secondary')) });
  let caught = false;
  try { await result; } catch (actual) { caught = true; assert.equal(actual, error); }
  await handle.waitForPersistence();
  assert.equal(caught, true);
  assert.equal(calls, 1);
  assert.equal(handle.snapshot().terminal.domainOutcome, 'NOT_APPLICABLE');
  assert.equal(handle.snapshot().persistence.status, 'FAILED');
});

for (const [status, expected] of [['ERROR', 'RETURNED_ERROR'], ['ACTION_REQUIRED', 'ACTION_REQUIRED'], ['PASS', 'UNCLASSIFIED'], ['UNKNOWN', 'UNCLASSIFIED']]) {
  test(`domain ${status} is separate from callback fulfillment`, () => {
    const value = Object.freeze({ status });
    const { handle } = execute(() => observeInvocation({}, () => value));
    const returned = handle.snapshot().events[2];
    assert.equal(returned.event, 'RETURNED');
    assert.equal(returned.domainOutcome, expected);
    assert.equal(handle.snapshot().terminal.domainOutcome, expected);
  });
}

test('intake precedes callback and terminal can only finish once after actual return', () => {
  let sinks = 0;
  const { handle } = execute(current => {
    assert.equal(current.snapshot().events[0].event, 'INTAKE_OBSERVED');
    assert.match(current.rootId, /^[a-f0-9-]{36}$/);
    assert.equal(current.finish(), false);
    assert.equal(finishExecutionObservation(), false);
    return 'primary';
  }, { sink: () => { sinks++; } });
  assert.equal(handle.finish(), false);
  assert.equal(handle.finish(), false);
  assert.equal(handle.snapshot().events.filter(item => item.event === 'TERMINAL_OBSERVED').length, 1);
  assert.equal(sinks, 1);
});

test('concurrent siblings and nested roots preserve actual parents and restore scope', async () => {
  const handles = [];
  const branches = [];
  const outer = execute(async outerHandle => {
    const callback = async name => observeInvocation({ name }, async () => {
      const invocation = getExecutionObservation().events.findLast(item => item.event === 'STARTED').invocationId;
      // Each branch retains its own context despite the shared chronological event list.
      await delay(name === 'left' ? 10 : 1);
      const nested = execute(async nestedHandle => {
        handles.push(nestedHandle);
        await delay(1);
        return observeInvocation({ name: `${name}Canonical` }, () => getTraceId());
      });
      branches.push({ name, invocation, nested: nested.handle });
      await nested.result;
      assert.equal(getExecutionHandle().rootId, outerHandle.rootId);
    });
    await Promise.all([callback('left'), callback('right')]);
  });
  await outer.result;
  const starts = outer.handle.snapshot().events.filter(item => item.event === 'STARTED');
  assert.equal(starts.length, 2);
  assert.notEqual(starts[0].invocationId, starts[1].invocationId);
  for (const branch of branches) {
    assert.equal(branch.nested.snapshot().parentRootId, outer.handle.rootId);
    assert.equal(branch.nested.snapshot().parentInvocationId, branch.invocation);
  }
  assert.equal(new Set(handles.map(handle => handle.rootId)).size, 2);
  assert.equal(getExecutionObservation(), null);
});

test('independent concurrent roots never inherit another root', async () => {
  const roots = ['one', 'two', 'three'].map(name => execute(async handle => {
    await delay(3);
    assert.equal(getExecutionHandle().rootId, handle.rootId);
    return observeInvocation({ name }, () => name);
  }));
  assert.deepEqual(await Promise.all(roots.map(root => root.result)), ['one', 'two', 'three']);
  assert.equal(new Set(roots.map(root => root.handle.rootId)).size, 3);
  for (const root of roots) assert.equal(root.handle.snapshot().parentRootId, null);
});

test('legacy trace remains a string and canonical association records actual child trace', () => {
  let handle;
  runWithTrace('router-legacy', () => {
    const execution = execute(() => observeInvocation({ name: 'canonical' }, () => runWithTrace('canonical-legacy', () => {
      assert.equal(getTraceId(), 'canonical-legacy');
      assert.equal(recordTraceAssociation(), true);
      assert.equal(recordTraceAssociation(), false);
      return 9;
    })));
    handle = execution.handle;
    assert.equal(getTraceId(), 'router-legacy');
  });
  const associations = handle.snapshot().traceAssociations;
  assert.deepEqual(associations.map(item => item.traceId), ['router-legacy', 'router-legacy', 'canonical-legacy']);
  assert.equal(associations[0].invocationId, null);
  assert.equal(associations[1].invocationId, associations[2].invocationId);
  assert.equal(getTraceId(), 'NO_TRACE_CONTEXT');
});

test('hostile cyclic metadata, result getters and customer then getters are not executed', () => {
  let reads = 0;
  const metadata = { name: 'a'.repeat(900), inputFingerprint: 'not-a-hash' };
  metadata.inputRef = metadata;
  Object.defineProperty(metadata, 'sourceRevision', { get() { reads++; throw 42; } });
  const value = Object.freeze(Object.defineProperties({}, {
    status: { get() { reads++; throw 43; } },
    // eslint-disable-next-line unicorn/no-thenable -- Intentional hostile customer accessor fixture.
    then: { get() { reads++; throw 44; } }
  }));
  const { result, handle } = execute(() => observeInvocation(metadata, () => value), undefined, metadata);
  metadata.name = 'changed';
  assert.equal(result, value);
  assert.equal(reads, 0);
  const observed = handle.snapshot();
  assert.equal(observed.metadata.name.length, 512);
  assert.equal(observed.metadata.fingerprintScope, 'BOUNDED_METADATA_PROJECTION');
  assert.match(observed.metadata.metadataFingerprint, /^[a-f0-9]{64}$/);
  assert.equal(observed.terminal.domainOutcome, 'UNCLASSIFIED');
  assert.ok(observed.faults.some(item => item.code === 'ACCESSOR_OMITTED'));
  assert.ok(observed.faults.some(item => item.code === 'NON_STRING_OMITTED'));
  assert.ok(Object.isFrozen(observed.events));
  assert.throws(() => { observed.metadata.name = 'mutated'; }, TypeError);
  assert.doesNotThrow(() => JSON.stringify(observed));
});

test('proxy descriptor failure cannot replace callback result', () => {
  const hostile = new Proxy({}, { getOwnPropertyDescriptor() { throw 'observer trap'; } });
  const { result, handle } = execute(() => observeInvocation(hostile, () => 19), hostile, hostile);
  assert.equal(result, 19);
  assert.equal(handle.snapshot().terminal.callbackOutcome, 'RETURNED');
  assert.ok(handle.snapshot().faults.some(item => item.code === 'DESCRIPTOR_FAILED'));
});

test('events, faults and association storage remain bounded without claiming complete coverage', () => {
  const metadata = { inputRef: {} };
  const { handle } = execute(() => {
    for (let index = 0; index < 350; index++) {
      observeInvocation(metadata, () => runWithTrace(`trace-${index}`, recordTraceAssociation));
    }
  });
  const observed = handle.snapshot();
  assert.equal(observed.eventCount, 702);
  assert.equal(observed.events.length, 256);
  assert.equal(observed.droppedEventCount, 446);
  assert.equal(observed.faults.length, 32);
  assert.ok(observed.droppedFaultCount > 0);
  assert.equal(observed.traceAssociations.length, 32);
  assert.ok(observed.droppedAssociationCount > 0);
  assert.equal(observed.terminal.callbackOutcome, 'RETURNED');
});

test('never-settling sink and observer are bounded and preserve original async result', async () => {
  const value = Object.freeze({ status: 'ACTION_REQUIRED' });
  const { result, handle } = execute(async () => { await delay(1); return value; }, {
    sinkTimeoutMs: 10, sink: () => new Promise(() => {}), observer: () => new Promise(() => {})
  });
  assert.equal(await result, value);
  await handle.waitForPersistence();
  const observed = handle.snapshot();
  assert.equal(observed.persistence.status, 'TIMED_OUT_UNCONFIRMED');
  assert.ok(observed.faults.some(item => item.stage === 'SINK' && item.code === 'TIMEOUT'));
  assert.ok(observed.faults.some(item => item.stage === 'OBSERVER' && item.code === 'TIMEOUT'));
  assert.equal(observed.terminal.domainOutcome, 'ACTION_REQUIRED');
});

test('unverified fulfilled sink is never a persistence success receipt', async () => {
  const { handle } = execute(() => 'done', { sink: () => ({ status: 'PASS' }) });
  await handle.waitForPersistence();
  assert.equal(handle.snapshot().persistence.status, 'SINK_RETURNED_UNVERIFIED');
});

test('real atomic sidecar uses generated UUID, immutable bounded input and verified write receipt', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cp11-sidecar-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const sink = createJsonSidecarSink(directory);
  let receipt;
  const cyclic = { name: 'fixture' }; cyclic.inputRef = cyclic;
  const { result, handle } = runWithTrace('../../caller-trace', () => execute(() => 73,
    { sink: payload => { receipt = sink(payload); return receipt; } }, cyclic));
  assert.equal(result, 73);
  await handle.waitForPersistence();
  assert.equal(handle.snapshot().persistence.status, 'PERSISTED');
  assert.match(path.basename(receipt.path), /^execution_trace_[a-f0-9-]{36}\.json$/);
  assert.equal(path.dirname(receipt.path), directory);
  assert.equal(verifyJsonSidecarReceipt(receipt), true);
  assert.equal(verifyJsonSidecarReceipt({ ...receipt }), false);
  const sidecar = JSON.parse(fs.readFileSync(receipt.path, 'utf8'));
  assert.equal(sidecar.persistence.status, 'WRITE_REQUESTED');
  assert.equal(sidecar.traceAssociations[0].traceId, '../../caller-trace');
  assert.equal(sidecar.terminal.callbackOutcome, 'RETURNED');
  assert.equal(sidecar.metadata.inputRef, undefined);
  fs.appendFileSync(receipt.path, '\n ');
  assert.equal(verifyJsonSidecarReceipt(receipt), false);
});

test('real filesystem write failure is explicit without replacing returned result', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cp11-failed-write-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const occupied = path.join(directory, 'file');
  fs.writeFileSync(occupied, 'prior-generation');
  const { result, handle } = execute(() => Object.freeze({ status: 'ERROR' }), { sink: createJsonSidecarSink(occupied) });
  await handle.waitForPersistence();
  assert.equal(result.status, 'ERROR');
  assert.equal(handle.snapshot().persistence.status, 'FAILED');
  assert.equal(fs.readFileSync(occupied, 'utf8'), 'prior-generation');
});

test('out-of-scope invocation has honest fallback root and one actual callback', () => {
  let handle;
  let calls = 0;
  const result = observeInvocation({ name: 'actualStandalone' }, () => { handle = getExecutionHandle(); calls++; return 22; });
  assert.equal(result, 22);
  assert.equal(calls, 1);
  assert.equal(handle.snapshot().metadata.name, 'UNOWNED_INVOCATION');
  assert.equal(handle.snapshot().events[1].metadata.name, 'actualStandalone');
  assert.equal(recordTraceAssociation(), false);
  assert.equal(finishExecutionObservation(), false);
});

test('hostile thrown proxy remains the exact primary rejection', async () => {
  const primary = new Proxy({}, { get() { throw 'do not inspect'; }, ownKeys() { throw 'do not enumerate'; } });
  const { result, handle } = execute(() => observeInvocation({}, async () => { throw primary; }), {
    observer: () => Promise.reject('observer'), sink: () => Promise.reject('sink')
  });
  let caught = false;
  try { await result; } catch (actual) { caught = true; assert.equal(actual, primary); }
  await handle.waitForPersistence();
  assert.equal(caught, true);
  assert.equal(handle.snapshot().terminal.callbackOutcome, 'REJECTED');
});

test('sink timeout does not lose async primitive rejection or later upgrade persistence', async () => {
  let resolveSink;
  const { result, handle } = execute(async () => { await delay(1); throw 17; }, {
    sinkTimeoutMs: 5, sink: () => new Promise(resolve => { resolveSink = resolve; })
  });
  let caught = false;
  try { await result; } catch (actual) { caught = true; assert.equal(actual, 17); }
  await handle.waitForPersistence();
  resolveSink({ status: 'PASS' });
  await delay(1);
  assert.equal(caught, true);
  assert.equal(handle.snapshot().persistence.status, 'TIMED_OUT_UNCONFIRMED');
  assert.equal(handle.snapshot().terminal.callbackOutcome, 'REJECTED');
});

test('malformed legacy trace is omitted without freezing caller data', () => {
  const callerObject = { nested: { customer: true } };
  const { result, handle } = runWithTrace(callerObject, () => execute(() => 31));
  assert.equal(result, 31);
  assert.equal(Object.isFrozen(callerObject), false);
  assert.equal(handle.snapshot().traceAssociations.length, 0);
  assert.ok(handle.snapshot().faults.some(item => item.code === 'NON_STRING_TRACE_OMITTED'));
});

test('promise observer attachment failure stays explicit and preserves original promise', () => {
  class HostilePromise extends Promise {
    static get [Symbol.species]() { throw 'observer species'; }
  }
  const promise = new HostilePromise(resolve => resolve(39));
  const { result, handle } = execute(() => promise);
  assert.equal(result, promise);
  assert.equal(handle.snapshot().terminal, null);
  assert.ok(handle.snapshot().faults.some(item => item.code === 'ATTACHMENT_FAILED'));
});

test('prior root receipt cannot certify current payload while preserving its callback result', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cp11-reused-receipt-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const writer = createJsonSidecarSink(directory);
  let receipt;
  const first = execute(() => 7, { sink: payload => { receipt = writer(payload); return receipt; } });
  await first.handle.waitForPersistence();
  assert.equal(first.handle.snapshot().persistence.status, 'PERSISTED');
  const value = Object.freeze({ status: 'ACTION_REQUIRED' });
  const second = execute(() => value, { sink: () => receipt });
  await second.handle.waitForPersistence();
  assert.equal(second.result, value);
  assert.equal(second.handle.snapshot().persistence.status, 'FAILED');
  assert.ok(second.handle.snapshot().faults.some(item => item.code === 'RECEIPT_PAYLOAD_MISMATCH'));
  assert.equal(verifyJsonSidecarReceipt(receipt), true);
});

test('receipt binds complete serialized payload even when the root ID matches', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cp11-wrong-payload-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const writer = createJsonSidecarSink(directory);
  const { result, handle } = execute(() => 83, { sink: payload => writer({ ...payload, terminal: null }) });
  await handle.waitForPersistence();
  assert.equal(result, 83);
  assert.equal(handle.snapshot().persistence.status, 'FAILED');
  assert.ok(handle.snapshot().faults.some(item => item.code === 'RECEIPT_PAYLOAD_MISMATCH'));
});

test('tampering before asynchronous sink receipt return is detected by fresh raw SHA/readback', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cp11-return-tamper-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const writer = createJsonSidecarSink(directory);
  const primary = Object.freeze(new Error('primary'));
  let handle;
  let caught = false;
  try {
    withExecutionRoot({}, () => { handle = getExecutionHandle(); throw primary; }, {
      sink: async payload => {
        const receipt = writer(payload);
        await delay(1);
        fs.appendFileSync(receipt.path, '\n ');
        return receipt;
      }
    });
  } catch (actual) { caught = true; assert.equal(actual, primary); }
  await handle.waitForPersistence();
  assert.equal(caught, true);
  assert.equal(handle.snapshot().terminal.callbackOutcome, 'REJECTED');
  assert.equal(handle.snapshot().persistence.status, 'FAILED');
  assert.ok(handle.snapshot().faults.some(item => item.code === 'RECEIPT_READBACK_FAILED'));
});

test('deleted receipt file cannot claim current payload persistence', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cp11-return-deleted-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const writer = createJsonSidecarSink(directory);
  const { result, handle } = execute(() => 89, { sink: payload => {
    const receipt = writer(payload);
    fs.unlinkSync(receipt.path);
    return receipt;
  } });
  await handle.waitForPersistence();
  assert.equal(result, 89);
  assert.equal(handle.snapshot().persistence.status, 'FAILED');
});

test('million-character legacy traces remain unchanged while projection is bounded and distinguishable', () => {
  const firstTrace = 'TRC-' + 'x'.repeat(1000000);
  const secondTrace = firstTrace + '-other';
  const { result, handle } = runWithTrace(firstTrace, () => execute(() => {
    assert.equal(getTraceId(), firstTrace);
    assert.equal(recordTraceAssociation(), false);
    runWithTrace(secondTrace, () => {
      assert.equal(getTraceId(), secondTrace);
      assert.equal(recordTraceAssociation(), true);
      assert.equal(recordTraceAssociation(), false);
    });
    assert.equal(getTraceId(), firstTrace);
    return 97;
  }));
  assert.equal(result, 97);
  const observed = handle.snapshot();
  assert.equal(observed.traceAssociations.length, 2);
  assert.equal(observed.traceAssociations[0].traceId, firstTrace.slice(0, 512));
  assert.equal(observed.traceAssociations[0].traceIdTruncated, true);
  assert.equal(observed.traceAssociations[0].traceIdSha256, crypto.createHash('sha256').update(firstTrace).digest('hex'));
  assert.notEqual(observed.traceAssociations[0].traceIdSha256, observed.traceAssociations[1].traceIdSha256);
  assert.ok(observed.faults.some(item => item.code === 'TRACE_STRING_TRUNCATED'));
  assert.ok(JSON.stringify(observed).length < 20000);
});
