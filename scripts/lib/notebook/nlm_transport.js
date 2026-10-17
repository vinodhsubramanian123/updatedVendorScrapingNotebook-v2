'use strict';

// Reads may use the installed CLI's CDP fallback. Mutations must not inherit
// that retry transport: an upload timeout does not prove the upload failed.
function nlmEnvironment(extendedPath = process.env.PATH, readOnly = false) {
  return {
    ...process.env,
    PATH: extendedPath,
    NOTEBOOKLM_RPC_TRANSPORT: readOnly ? (process.env.NLM_SYNC_READ_TRANSPORT || 'cdp') : 'httpx'
  };
}

function sourceOperationTimeout(options = {}) {
  const { assertCallerActive } = require('../system/execution_budget.js');
  assertCallerActive(options);
  const duration = options.sourceTimeoutMs ?? Number(process.env.NLM_SOURCE_TIMEOUT_MS || 600000);
  if (!Number.isSafeInteger(duration) || duration <= 0) throw new TypeError('sourceTimeoutMs must be a positive safe integer');
  return Math.max(1, Math.min(duration, options.deadlineAt === undefined ? Infinity : options.deadlineAt - Date.now()));
}

module.exports = { nlmEnvironment, sourceOperationTimeout };
