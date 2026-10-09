'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { safeWriteJsonAtomic } = require('../system/fs_compat.js');
const unknownFailures = new WeakMap();
const abortedSignals = new WeakMap();
const directory = path.resolve(__dirname, '../../../outputs/history/notebook_query_attempts');

function markRemoteUnknown(error, diagnostic, signal) {
  if (error && (typeof error === 'object' || typeof error === 'function')) unknownFailures.set(error, diagnostic);
  if (signal?.aborted && Object.is(error, signal.reason)) abortedSignals.set(signal, diagnostic);
}
function isRemoteUnknown(error) {
  return Boolean(error && (typeof error === 'object' || typeof error === 'function') && unknownFailures.has(error));
}
function getNotebookQueryRecovery(error, signal) {
  const objectDiagnostic = error && (typeof error === 'object' || typeof error === 'function') ? unknownFailures.get(error) : null;
  const diagnostic = objectDiagnostic || (signal?.aborted && Object.is(error, signal.reason) ? abortedSignals.get(signal) : null);
  return typeof diagnostic === 'function' ? diagnostic() : diagnostic || null;
}
function returnedConversationId(stdout) {
  try {
    const result = JSON.parse(stdout);
    const ids = [result.conversation_id, result.conversationId].filter(value => value !== undefined);
    if (ids.length === 0 || ids.some(id => typeof id !== 'string' || !id.trim() || /^JOB_NLM_/i.test(id))) return null;
    if (new Set(ids.map(id => id.trim())).size !== 1) return null;
    return ids[0].trim();
  } catch { return null; }
}
function createAttempt({ notebookId, query, sourceIds, startedAt, deadlineAt, timeoutMs }) {
  const attemptId = crypto.randomUUID();
  const file = path.join(directory, attemptId + '.json');
  const record = { schemaVersion: 1, attemptId, notebookId,
    querySha256: crypto.createHash('sha256').update(query).digest('hex'), sourceIds: [...sourceIds],
    startedAt, deadlineAt, timeoutMs, conversationId: null, status: 'DISPATCH_INTENT',
    verification: 'NOT_VERIFIED', remoteState: 'REMOTE_STATE_UNKNOWN',
    recovery: 'No supported remote polling/cancellation proof. If an explicit conversation ID is returned, transcript readback is a separate recovery action; never select the latest conversation or automatically resubmit.' };
  fs.mkdirSync(directory, { recursive: true });
  // Fail before dispatch if durable initial attempt provenance cannot be written.
  safeWriteJsonAtomic(file, record);
  return { file, diagnostic() { return { attemptId, attemptPath: file, notebookId, conversationId: record.conversationId,
    verification: 'NOT_VERIFIED', remoteState: 'REMOTE_STATE_UNKNOWN', recoveryRequired: true, recovery: record.recovery,
    persistence: { lastWriteSucceeded: record.lastWriteSucceeded !== false, error: record.persistenceError || null } }; }, update(fields) {
    Object.assign(record, fields);
    record.lastWriteSucceeded = true; record.persistenceError = null;
    try { safeWriteJsonAtomic(file, record); return true; }
    catch (error) {
      record.lastWriteSucceeded = false;
      record.persistenceError = { code: error?.code || null, message: error?.message || 'Attempt record update failed' };
      return false;
    } // Secondary persistence failure never masks query/abort identity.
  } };
}
module.exports = { createAttempt, markRemoteUnknown, isRemoteUnknown, returnedConversationId, getNotebookQueryRecovery };
