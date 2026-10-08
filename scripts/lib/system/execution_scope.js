'use strict';
/** Internal, unused CP11 foundation. Invocation observations are not BOQ receipts. */
const { AsyncLocalStorage } = require('async_hooks');
const { isPromise } = require('util').types;
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { runWithTrace, getTraceId } = require('./trace_context.js');
const { safeWriteJsonAtomic } = require('./fs_compat.js');

const storage = new AsyncLocalStorage();
const receipts = new WeakMap();
const MAX_EVENTS = 256;
const MAX_FAULTS = 32;
const MAX_ASSOCIATIONS = 32;
const MAX_STRING = 512;

function immutable(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(immutable);
    Object.freeze(value);
  }
  return value;
}

function fault(state, stage, code) {
  if (state.faults.length < MAX_FAULTS) state.faults.push(immutable({ stage, code }));
  else state.droppedFaultCount++;
}

function dataProperty(value, key, state, stage) {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return undefined;
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && !Object.hasOwn(descriptor, 'value')) {
      fault(state, stage, 'ACCESSOR_OMITTED');
      return undefined;
    }
    return descriptor?.value;
  } catch {
    fault(state, stage, 'DESCRIPTOR_FAILED');
    return undefined;
  }
}

function metadataSnapshot(metadata, state) {
  const projection = {};
  // Applicable-skill fields cite declarations, never actual skill execution.
  for (const key of ['name', 'inputRef', 'sourceRevision', 'inputFingerprint',
    'applicableSkillPath', 'applicableSkillFingerprint', 'applicableSkillAssociation']) {
    const value = dataProperty(metadata, key, state, 'METADATA');
    if (typeof value === 'string') {
      if (key.endsWith('Fingerprint') && !/^[a-f0-9]{64}$/i.test(value)) {
        fault(state, 'METADATA', { inputFingerprint: 'INVALID_INPUT_FINGERPRINT',
          applicableSkillFingerprint: 'INVALID_SKILL_FINGERPRINT' }[key]);
      } else {
        projection[key] = value.slice(0, MAX_STRING);
        if (value.length > MAX_STRING) fault(state, 'METADATA', 'STRING_TRUNCATED');
      }
    } else if (value !== undefined) fault(state, 'METADATA', 'NON_STRING_OMITTED');
  }
  const metadataFingerprint = crypto.createHash('sha256').update(JSON.stringify(projection)).digest('hex');
  return immutable({ ...projection, metadataFingerprint, fingerprintScope: 'BOUNDED_METADATA_PROJECTION' });
}

function domainOutcome(value, state) {
  const status = dataProperty(value, 'status', state, 'RESULT_STATUS');
  if (status === 'ERROR') return 'RETURNED_ERROR';
  if (status === 'ACTION_REQUIRED') return 'ACTION_REQUIRED';
  if (status === 'CANCELLED') return 'CANCELLED';
  if (dataProperty(value, 'isError', state, 'RESULT_IS_ERROR') === true) return 'RETURNED_ERROR';
  return 'UNCLASSIFIED';
}

function outcome(value, rejected, state) {
  return immutable({ callbackOutcome: rejected ? 'REJECTED' : 'RETURNED',
    domainOutcome: rejected ? 'NOT_APPLICABLE' : domainOutcome(value, state),
    valueType: value === null ? 'null' : typeof value });
}

function boundedTask(state, stage, callback, onReturned) {
  let returned;
  try { returned = callback(); } catch {
    fault(state, stage, 'THREW');
    onReturned?.('THREW');
    return Promise.resolve();
  }
  return new Promise(resolve => {
    let done = false;
    const timer = setTimeout(() => complete('TIMEOUT'), state.timeoutMs);
    function complete(code, value) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (code) fault(state, stage, code);
      try { onReturned?.(code, value); } catch { fault(state, stage, 'RECEIPT_FAILED'); }
      resolve();
    }
    Promise.resolve(returned).then(value => complete(null, value), () => complete('REJECTED'));
  });
}

function append(state, fields) {
  const event = immutable({ sequence: ++state.eventCount, timestamp: new Date().toISOString(), ...fields });
  if (state.events.length < MAX_EVENTS) state.events.push(event);
  else state.droppedEventCount++;
  if (state.observer && state.events.length <= MAX_EVENTS && state.droppedEventCount === 0) {
    boundedTask(state, 'OBSERVER', () => state.observer(event));
  }
}

function snapshot(state) {
  return immutable({ schemaVersion: 1, observationKind: 'ACTUAL_CALLBACK_SCOPE', rootId: state.id,
    parentRootId: state.parentRootId, parentInvocationId: state.parentInvocationId,
    metadata: state.metadata, events: [...state.events], eventCount: state.eventCount,
    droppedEventCount: state.droppedEventCount, traceAssociations: [...state.associations],
    droppedAssociationCount: state.droppedAssociationCount, faults: [...state.faults],
    droppedFaultCount: state.droppedFaultCount, terminal: state.terminal,
    persistence: { ...state.persistence } });
}

function currentState() { return storage.getStore()?.state; }

function getExecutionObservation() {
  const state = currentState();
  return state ? snapshot(state) : null;
}

function getExecutionHandle() {
  const state = currentState();
  if (!state) return null;
  return Object.freeze({ rootId: state.id, snapshot: () => snapshot(state),
    finish: () => storage.run({ state, invocationId: null }, finishExecutionObservation),
    waitForPersistence: () => state.persistenceTask || Promise.resolve() });
}

function recordTraceAssociation() {
  const context = storage.getStore();
  if (!context) return false;
  const traceId = getTraceId();
  if (traceId === 'NO_TRACE_CONTEXT') return false;
  const state = context.state;
  if (typeof traceId !== 'string') { fault(state, 'TRACE_ASSOCIATION', 'NON_STRING_TRACE_OMITTED'); return false; }
  const traceIdSha256 = crypto.createHash('sha256').update(traceId).digest('hex');
  const association = immutable({ traceId: traceId.slice(0, MAX_STRING), traceIdSha256,
    traceIdTruncated: traceId.length > MAX_STRING, invocationId: context.invocationId });
  if (state.associations.some(item => item.traceIdSha256 === traceIdSha256 && item.invocationId === context.invocationId)) return false;
  if (association.traceIdTruncated) fault(state, 'TRACE_ASSOCIATION', 'TRACE_STRING_TRUNCATED');
  if (state.associations.length < MAX_ASSOCIATIONS) state.associations.push(association);
  else state.droppedAssociationCount++;
  return true;
}

function finishExecutionObservation() {
  const state = currentState();
  if (!state || !state.settled || state.terminal) return false;
  state.terminal = immutable({ ...state.settled, timestamp: new Date().toISOString() });
  append(state, { event: 'TERMINAL_OBSERVED', rootId: state.id, ...state.settled });
  if (!state.sink) return true;
  state.persistence = { status: 'WRITE_REQUESTED' };
  const payload = snapshot(state);
  state.persistenceTask = boundedTask(state, 'SINK', () => state.sink(payload), (code, receipt) => {
    if (code) state.persistence = { status: code === 'TIMEOUT' ? 'TIMED_OUT_UNCONFIRMED' : 'FAILED' };
    else if (receipts.has(receipt)) {
      const binding = receipts.get(receipt);
      if (binding.rootId !== state.id || binding.serializedPayload !== JSON.stringify(payload)) {
        fault(state, 'SINK', 'RECEIPT_PAYLOAD_MISMATCH');
        state.persistence = { status: 'FAILED' };
      } else if (!verifyJsonSidecarReceipt(receipt)) {
        fault(state, 'SINK', 'RECEIPT_READBACK_FAILED');
        state.persistence = { status: 'FAILED' };
      } else state.persistence = { status: 'PERSISTED', path: receipt.path, sha256: receipt.sha256 };
    }
    else state.persistence = { status: 'SINK_RETURNED_UNVERIFIED' };
  });
  return true;
}

function settle(state, invocationId, value, rejected, root) {
  try {
    const observed = outcome(value, rejected, state);
    if (root) { state.settled = observed; finishExecutionObservation(); }
    else append(state, { event: observed.callbackOutcome, rootId: state.id, invocationId, ...observed });
  } catch { fault(state, 'SETTLEMENT', 'FAILED'); }
}

function invoke(state, invocationId, callback, root) {
  let returned;
  try { returned = callback(); } catch (error) {
    settle(state, invocationId, error, true, root);
    throw error;
  }
  // Native promise inspection does not invoke a hostile customer `then` getter.
  if (isPromise(returned)) {
    try {
      Promise.prototype.then.call(returned,
        value => settle(state, invocationId, value, false, root),
        error => settle(state, invocationId, error, true, root));
    } catch { fault(state, 'PROMISE_OBSERVATION', 'ATTACHMENT_FAILED'); }
  } else settle(state, invocationId, returned, false, root);
  return returned;
}

function withExecutionRoot(metadata, callback, options = {}) {
  const parent = storage.getStore();
  const state = { id: crypto.randomUUID(), parentRootId: parent?.state.id || null,
    parentInvocationId: parent?.invocationId || null, events: [], eventCount: 0, droppedEventCount: 0,
    associations: [], droppedAssociationCount: 0, faults: [], droppedFaultCount: 0,
    terminal: null, settled: null, persistence: { status: 'NOT_REQUESTED' }, timeoutMs: 100 };
  state.metadata = metadataSnapshot(metadata, state);
  const observer = dataProperty(options, 'observer', state, 'OPTIONS');
  const sink = dataProperty(options, 'sink', state, 'OPTIONS');
  const timeout = dataProperty(options, 'sinkTimeoutMs', state, 'OPTIONS');
  const parentRootId = dataProperty(options, 'parentRootId', state, 'OPTIONS');
  const traceId = dataProperty(options, 'traceId', state, 'OPTIONS');
  if (!parent && typeof parentRootId === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(parentRootId)) {
    state.parentRootId = parentRootId;
  }
  state.observer = typeof observer === 'function' ? observer : null;
  state.sink = typeof sink === 'function' ? sink : null;
  if (Number.isFinite(timeout)) state.timeoutMs = Math.max(1, Math.min(timeout, 1000));
  const enter = () => storage.run({ state, invocationId: null }, () => {
    recordTraceAssociation();
    append(state, { event: 'INTAKE_OBSERVED', rootId: state.id, metadata: state.metadata });
    return invoke(state, null, callback, true);
  });
  const inheritedTrace = typeof traceId === 'string' && /^TRC-[A-Za-z0-9-]+$/.test(traceId) && traceId.length <= 128 ? traceId : undefined;
  return getTraceId() === 'NO_TRACE_CONTEXT' ? runWithTrace(inheritedTrace, enter) : enter();
}

function observeInvocation(metadata, callback) {
  const parent = storage.getStore();
  if (!parent) return withExecutionRoot({ name: 'UNOWNED_INVOCATION' }, () => observeInvocation(metadata, callback));
  const state = parent.state;
  const invocationId = crypto.randomUUID();
  const observedMetadata = metadataSnapshot(metadata, state);
  return storage.run({ state, invocationId }, () => {
    recordTraceAssociation();
    append(state, { event: 'STARTED', rootId: state.id, invocationId,
      parentInvocationId: parent.invocationId, metadata: observedMetadata });
    return invoke(state, invocationId, callback, false);
  });
}

function createJsonSidecarSink(directory) {
  const ownedDirectory = path.resolve(directory);
  return payload => {
    const dest = path.join(ownedDirectory, `execution_trace_${crypto.randomUUID()}.json`);
    const expected = JSON.stringify(payload);
    safeWriteJsonAtomic(dest, payload);
    if (JSON.stringify(JSON.parse(fs.readFileSync(dest, 'utf8'))) !== expected) throw new Error('Sidecar readback mismatch');
    const receipt = Object.freeze({ path: dest, sha256: crypto.createHash('sha256').update(fs.readFileSync(dest)).digest('hex') });
    receipts.set(receipt, { serializedPayload: expected, rootId: JSON.parse(expected).rootId });
    return receipt;
  };
}

function verifyJsonSidecarReceipt(receipt) {
  if (!receipts.has(receipt)) return false;
  try {
    const stats = fs.lstatSync(receipt.path);
    if (!stats.isFile() || stats.isSymbolicLink()) return false;
    const bytes = fs.readFileSync(receipt.path);
    return crypto.createHash('sha256').update(bytes).digest('hex') === receipt.sha256 &&
      JSON.stringify(JSON.parse(bytes.toString('utf8'))) === receipts.get(receipt).serializedPayload;
  } catch { return false; }
}

module.exports = { withExecutionRoot, observeInvocation, recordTraceAssociation,
  finishExecutionObservation, getExecutionObservation, getExecutionHandle,
  createJsonSidecarSink, verifyJsonSidecarReceipt };
