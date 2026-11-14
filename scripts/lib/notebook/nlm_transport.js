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

function isCdpTransportError(err) {
  const combined = `${err?.message || ''}\n${err?.stderr || ''}\n${err?.stdout || ''}`;
  return /CdpTransportError|Headless browser did not expose CDP|Failed to connect to CDP/i.test(combined);
}

function sanitizeNlmCliError(err) {
  const raw = [err?.stderr, err?.message, typeof err === 'string' ? err : '']
    .filter(Boolean)
    .map(v => String(v))
    .join('\n')
    .trim();
  if (!raw) return 'Unknown NotebookLM CLI error';
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const cdpLine = lines.find(l => /CdpTransportError:/i.test(l));
  if (cdpLine) return cdpLine;
  const nonTraceLines = lines.filter(l =>
    !l.startsWith('Traceback (most recent call last):') &&
    !l.startsWith('File "') &&
    !/^[~^]+$/.test(l)
  );
  const summary = nonTraceLines.length > 0 ? nonTraceLines[nonTraceLines.length - 1] : lines[lines.length - 1];
  return summary.length > 400 ? `${summary.slice(0, 397)}...` : summary;
}

function execNlmReadWithFallback(execFileSync, args, options = {}, extendedPath = process.env.PATH) {
  const primaryEnv = nlmEnvironment(extendedPath, true);
  try {
    return execFileSync('nlm', args, { ...options, env: primaryEnv });
  } catch (err) {
    if (primaryEnv.NOTEBOOKLM_RPC_TRANSPORT === 'cdp' && isCdpTransportError(err)) {
      const fallbackEnv = { ...nlmEnvironment(extendedPath, false), NOTEBOOKLM_RPC_TRANSPORT: 'httpx' };
      return execFileSync('nlm', args, { ...options, env: fallbackEnv });
    }
    throw err;
  }
}

function sourceOperationTimeout(options = {}) {
  const { assertCallerActive } = require('../system/execution_budget.js');
  assertCallerActive(options);
  const duration = options.sourceTimeoutMs ?? Number(process.env.NLM_SOURCE_TIMEOUT_MS || 600000);
  if (!Number.isSafeInteger(duration) || duration <= 0) throw new TypeError('sourceTimeoutMs must be a positive safe integer');
  return Math.max(1, Math.min(duration, options.deadlineAt === undefined ? Infinity : options.deadlineAt - Date.now()));
}

module.exports = {
  nlmEnvironment,
  isCdpTransportError,
  sanitizeNlmCliError,
  execNlmReadWithFallback,
  sourceOperationTimeout
};
