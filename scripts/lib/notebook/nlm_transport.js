'use strict';

let _cdpUnavailableInProcess = false;
let _loggedCdpFailoverNotice = false;

function markCdpTransportUnavailable() {
  _cdpUnavailableInProcess = true;
}

function isCdpTransportUnavailable() {
  return _cdpUnavailableInProcess;
}

function resetCdpTransportState() {
  _cdpUnavailableInProcess = false;
  _loggedCdpFailoverNotice = false;
}

// Reads may use the installed CLI's CDP fallback. Mutations must not inherit
// that retry transport: an upload timeout does not prove the upload failed.
function nlmEnvironment(extendedPath = process.env.PATH, readOnly = false) {
  const configuredReadTransport = process.env.NLM_SYNC_READ_TRANSPORT;
  const readTransport = configuredReadTransport || (_cdpUnavailableInProcess ? 'httpx' : 'cdp');
  return {
    ...process.env,
    PATH: extendedPath,
    NOTEBOOKLM_RPC_TRANSPORT: readOnly ? readTransport : 'httpx'
  };
}

function isCdpTransportError(err) {
  const combined = `${err?.message || ''}\n${err?.stderr || ''}\n${err?.stdout || ''}`;
  return /CdpTransportError|Headless browser did not expose CDP|Failed to connect to CDP|RPC Error 16:\s*Authentication expired|Authentication Error/i.test(combined);
}

/**
 * INV-254: NLM CLI read-transport timeout fallback.
 * When Chrome CDP is active on port 9222 (during OCA scraping), it can cause
 * the nlm CLI's CDP transport to hang/timeout on 'source list' and 'source content'
 * read operations — even though the actual NLM API is reachable via httpx.
 * This is NOT a CdpTransportError (no Python traceback pattern), it's a plain
 * process timeout (ETIMEDOUT / spawned process exits non-zero after deadline).
 * Detect and retry with explicit NOTEBOOKLM_RPC_TRANSPORT=httpx.
 */
function isCliReadTimeout(err) {
  const msg = `${err?.message || ''}\n${err?.stderr || ''}\n${err?.status || ''}`;
  return /ETIMEDOUT|timed out|spawnSync .* ETIMEDOUT|Command failed.*timeout/i.test(msg) ||
    (err?.signal === 'SIGTERM' && !err?.stdout);
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
  const { bin = 'nlm', stdio = ['ignore', 'pipe', 'pipe'], ...forwardOptions } = options || {};
  const primaryEnv = nlmEnvironment(extendedPath, true);
  try {
    return execFileSync(bin, args, { stdio, ...forwardOptions, env: primaryEnv });
  } catch (err) {
    const shouldFallbackToCdpError = primaryEnv.NOTEBOOKLM_RPC_TRANSPORT === 'cdp' && isCdpTransportError(err);
    // INV-254: also fall back when CDP transport times out (Chrome port 9222 occupied by OCA scraping)
    const shouldFallbackToTimeout = isCliReadTimeout(err);

    if (shouldFallbackToCdpError) {
      markCdpTransportUnavailable();
      if (!_loggedCdpFailoverNotice) {
        _loggedCdpFailoverNotice = true;
        console.warn('[NLM_TRANSPORT] Headless CDP unavailable; failing over cleanly to httpx for read RPCs in this process.');
      }
    } else if (shouldFallbackToTimeout) {
      if (!_loggedCdpFailoverNotice) {
        _loggedCdpFailoverNotice = true;
        console.warn('[NLM_TRANSPORT] INV-254: NLM read timed out (Chrome CDP may be holding port 9222); retrying with httpx transport...');
      }
    }

    if (shouldFallbackToCdpError || shouldFallbackToTimeout) {
      const fallbackEnv = { ...nlmEnvironment(extendedPath, false), NOTEBOOKLM_RPC_TRANSPORT: 'httpx' };
      return execFileSync(bin, args, { stdio, ...forwardOptions, env: fallbackEnv });
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
  isCliReadTimeout,
  markCdpTransportUnavailable,
  isCdpTransportUnavailable,
  resetCdpTransportState,
  sanitizeNlmCliError,
  execNlmReadWithFallback,
  sourceOperationTimeout
};
