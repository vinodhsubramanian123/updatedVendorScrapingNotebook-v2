'use strict';
// Opt-in CP6 store. No default path and no IO until an explicit append/read call.
const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');
const { safeWriteJsonAtomic } = require('./fs_compat.js');
const { acquireWorkflowLease } = require('./workflow_lease.js');
const { RUN_KINDS, normalizeTelemetryMeasurement, validateTelemetryMeasurement } = require('./telemetry_measurement.js');

function validateStore(data, runKind) {
  if (!data || data.schemaVersion !== 1 || data.runKind !== runKind || !Array.isArray(data.entries)) throw new Error('TELEMETRY_STORE_CORRUPT: original file preserved');
  const ids = new Set();
  for (const entry of data.entries) {
    if (entry.runKind !== runKind || validateTelemetryMeasurement(entry).length || ids.has(entry.eventId)) throw new Error('TELEMETRY_STORE_CORRUPT: invalid population/history; original file preserved');
    ids.add(entry.eventId);
  }
  return data;
}

function resolveStoreRoot(directory) {
  if (typeof directory !== 'string' || !path.isAbsolute(directory)) throw new Error('EXPLICIT_ABSOLUTE_TELEMETRY_ROOT_REQUIRED');
  const resolved = path.resolve(directory);
  if (!fs.existsSync(resolved) || !fs.lstatSync(resolved).isDirectory()) throw new Error('TELEMETRY_ROOT_MUST_EXIST');
  return fs.realpathSync(resolved);
}

function createTelemetryMeasurementStore(directory) {
  // Store creation is explicit; require/import of this module performs no IO.
  const root = resolveStoreRoot(directory);
  function transaction(runKind, action) {
    if (!RUN_KINDS.includes(runKind)) throw new Error('EXPLICIT_RUN_KIND_REQUIRED');
    const file = path.join(root, `${runKind}.json`);
    const name = `telemetry-${createHash('sha256').update(file.toLowerCase()).digest('hex').slice(0, 24)}`;
    const release = acquireWorkflowLease(name, path.join(root, '.locks'));
    try { return action(); } finally { release(); }
  }
  function readUnlocked(runKind) {
    const file = path.join(root, `${runKind}.json`);
    if (!fs.existsSync(file)) return { schemaVersion: 1, runKind, entries: [] };
    if (!fs.lstatSync(file).isFile() || fs.lstatSync(file).isSymbolicLink()) throw new Error('TELEMETRY_STORE_NOT_REGULAR_FILE');
    // Malformed/corrupt history is never replaced with empty successful history.
    return validateStore(JSON.parse(fs.readFileSync(file, 'utf8')), runKind);
  }
  function append(observation) {
    const entry = normalizeTelemetryMeasurement(observation);
    const issues = validateTelemetryMeasurement(entry);
    if (issues.length) throw new Error(`TELEMETRY_OBSERVATION_INVALID: ${JSON.stringify(issues)}`);
    const file = path.join(root, `${entry.runKind}.json`);
    return transaction(entry.runKind, () => {
      const data = readUnlocked(entry.runKind);
      const prior = data.entries.find(e => e.eventId === entry.eventId);
      if (prior) {
        if (JSON.stringify(prior) !== JSON.stringify(entry)) throw new Error('TELEMETRY_EVENT_ID_CONFLICT');
        return { appended: false, entry, count: data.entries.length };
      }
      data.entries.push(entry);
      safeWriteJsonAtomic(file, data);
      return { appended: true, entry, count: data.entries.length };
    });
  }
  return Object.freeze({ read: runKind => transaction(runKind, () => readUnlocked(runKind)), append });
}

module.exports = { createTelemetryMeasurementStore };
