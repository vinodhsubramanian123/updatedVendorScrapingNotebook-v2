'use strict';
// CP11a internal opt-in observer. It cannot authorize delivery or attest skill use.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { applicableSkillMetadata } = require('./execution_skill_declaration.js');

function enabled() { return process.env.PRESALES_EXECUTION_TRACE === '1'; }

function inheritedProcessTrace() {
  const parentRootId = process.env.PRESALES_EXECUTION_PARENT_ROOT_ID;
  if (typeof parentRootId !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(parentRootId)) return {};
  const traceId = process.env.PRESALES_EXECUTION_PARENT_TRACE_ID;
  return { parentRootId, traceId };
}

function ownedMetadata(name, sourceFile, input) {
  const metadata = { name: path.relative(path.resolve(__dirname, '../../..'), sourceFile).replace(/\\/g, '/') + '#' + name };
  try {
    metadata.sourceRevision = 'sha256:' + crypto.createHash('sha256').update(fs.readFileSync(sourceFile)).digest('hex');
    if (typeof input === 'string') metadata.inputFingerprint = crypto.createHash('sha256').update(input).digest('hex');
  } catch { /* Missing source evidence never replaces the primary call. */ }
  return Object.assign(metadata, applicableSkillMetadata(name, sourceFile));
}

function observe(name, sourceFile, callback, input, root) {
  if (!enabled()) return callback();
  let entered = false;
  try {
    const scope = require('./execution_scope.js');
    const metadata = ownedMetadata(name, sourceFile, input);
    const primary = () => { entered = true; return callback(); };
    if (!root && scope.getExecutionHandle()) return scope.observeInvocation(metadata, primary);
    const sink = scope.createJsonSidecarSink(path.resolve(__dirname, '../../../outputs/history/evidence_logs'));
    return scope.withExecutionRoot(metadata, root ? primary : () => scope.observeInvocation(metadata, primary),
      { sink, ...inheritedProcessTrace() });
  } catch (error) {
    // Only observer setup can fall back; a primary failure is never invoked twice.
    if (entered) throw error;
    return callback();
  }
}

function observeRouterEntry(sourceFile, input, callback) {
  return observe('executeRoutedQuery', sourceFile, callback, input, true);
}

function observeActualInvocation(name, sourceFile, callback) {
  return observe(name, sourceFile, callback, undefined, false);
}

function associateCanonicalTrace() {
  if (!enabled()) return;
  try { require('./execution_scope.js').recordTraceAssociation(); } catch { /* Observation only. */ }
}

function observedEntryTraceId() {
  if (!enabled()) return null;
  try {
    if (!require('./execution_scope.js').getExecutionHandle()) return null;
    const id = require('./trace_context.js').getTraceId();
    return id === 'NO_TRACE_CONTEXT' ? null : id;
  } catch { return null; }
}

function resolveEntryTraceId(legacyId) {
  return observedEntryTraceId() || legacyId();
}

module.exports = { observeRouterEntry, observeActualInvocation, associateCanonicalTrace, observedEntryTraceId, resolveEntryTraceId };
