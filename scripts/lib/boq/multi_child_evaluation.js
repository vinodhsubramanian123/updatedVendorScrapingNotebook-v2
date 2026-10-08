'use strict';
const path = require('path');
const { spawn } = require('child_process');
const { requestChildTermination } = require('../system/child_termination.js');
const { spawnObservedChild } = require('../system/observed_child_process.js');

const MARKER = '__EVAL_RESULT_JSON__';
const DEFAULT_TIMEOUT_MS = 120000;
const DEFAULT_MAX_OUTPUT_BYTES = 32 * 1024 * 1024;

function parseChildPayload(stdout) {
  const parts = stdout.split(MARKER);
  if (parts.length !== 1) {
    if (parts.length !== 3) throw new Error('Missing or duplicated canonical result framing');
    return JSON.parse(parts[1]);
  }
  const first = stdout.indexOf('{'), last = stdout.lastIndexOf('}');
  if (first < 0 || last <= first) throw new Error('No JSON payload returned');
  return JSON.parse(stdout.slice(first, last + 1));
}

function resultEnvelope(group, status, fields) {
  return { sheetName: group.displayLabel || group.sheetName, status, ...fields };
}

function childOutcome(group, stdout, stderr, exitCode, signal) {
  let result;
  try { result = parseChildPayload(stdout); }
  catch (error) { return resultEnvelope(group, 'ERROR', { error: error.message, stderr, process: { exitCode, signal } }); }
  const process = { exitCode, signal };
  if (exitCode !== 0 || signal) return resultEnvelope(group, 'ERROR', { error: 'Canonical evaluator did not exit successfully', result, stderr, process });
  if (!result || typeof result !== 'object' || Array.isArray(result) || typeof result.status !== 'string') return resultEnvelope(group, 'ERROR', { error: 'Invalid canonical evaluation payload', result, stderr, process });
  if (result.status === 'ERROR') return resultEnvelope(group, 'ERROR', { error: result.error || result.message || 'Evaluation error', result, stderr, process });
  if (['ACTION_REQUIRED', 'CANCELLED', 'NOT_EVALUATED'].includes(result.status)) return resultEnvelope(group, result.status, { result, stderr, process });
  if (!['SUCCESS', 'LOCAL_COMPLETE', 'CLOUD_COMPLETE', 'COMPLETE', 'COMPLETED'].includes(result.status)) return resultEnvelope(group, 'ERROR', { error: 'Unknown canonical evaluation status: ' + result.status, result, stderr, process });
  return resultEnvelope(group, 'SUCCESS', { result, process });
}

function childArguments(group, options, evalScript) {
  const args = [evalScript, group.filePath, '--json', '--sheet', group.sheetName];
  if (options.chassisDir) args.push('--chassis', options.chassisDir);
  if (options.offline) args.push('--offline');
  return args;
}

function isChildAlreadyExited(child) {
  return Boolean(child && (
    (child.exitCode !== null && child.exitCode !== undefined) ||
    (child.signalCode !== null && child.signalCode !== undefined)
  ));
}

function validateSignal(signal) {
  if (signal === undefined) return;
  if (!signal || typeof signal !== 'object' || typeof signal.aborted !== 'boolean' ||
      (typeof signal.addEventListener !== 'function' && typeof signal.on !== 'function')) {
    throw new TypeError('signal must be an AbortSignal.');
  }
}

function validatePositiveSafeInteger(val, name) {
  if (val !== undefined && (!Number.isSafeInteger(val) || val <= 0)) {
    throw new TypeError(`${name} must be a positive safe integer`);
  }
}

function getAbortErrorMessage(signal) {
  if (signal?.reason instanceof Error && signal.reason.message) return signal.reason.message;
  if (typeof signal?.reason === 'string' && signal.reason) return signal.reason;
  return 'Canonical evaluator was cancelled';
}

function executeGroupChild(group, options = {}) {
  const evalScript = path.join(__dirname, '../../evaluators/eval_boq.js');
  return new Promise((resolve, reject) => {
    try {
      validateSignal(options.signal);
      validatePositiveSafeInteger(options.graceMs, 'graceMs');
      validatePositiveSafeInteger(options.confirmationMs, 'confirmationMs');
      validatePositiveSafeInteger(options.timeoutMs, 'timeoutMs');
      validatePositiveSafeInteger(options.maxOutputBytes, 'maxOutputBytes');
    } catch (err) {
      return reject(err);
    }

    if (options.signal && options.signal.aborted) {
      return resolve(resultEnvelope(group, 'CANCELLED', {
        error: getAbortErrorMessage(options.signal),
        code: 'MULTI_CHILD_CANCELLED',
        stderr: '',
        process: { exitCode: null, signal: null, terminationRequested: false }
      }));
    }

    let child = null;
    let timer = null;
    let settled = false;
    let terminating = false;
    let primaryReason = null;
    let stdout = '';
    let stderr = '';
    let bytes = 0;
    let actualClosed = false;
    let finalExitCode = null;
    let finalSignal = null;
    let pendingCloseResolve = null;
    const ownedCli = process.env.PRESALES_TERMINAL_OWNER === '1';
    let drainOutput = false;

    const cleanup = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      if (options.signal) {
        if (typeof options.signal.removeEventListener === 'function') {
          options.signal.removeEventListener('abort', onAbort);
        } else if (typeof options.signal.removeListener === 'function') {
          options.signal.removeListener('abort', onAbort);
        } else if (typeof options.signal.off === 'function') {
          options.signal.off('abort', onAbort);
        }
      }
    };

    const settle = result => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    const terminate = (status, error, code) => {
      if (terminating || settled) return;
      terminating = true;
      primaryReason = { status, error, code,
        reason: status === 'CANCELLED' ? options.signal.reason : code };
      drainOutput = Boolean(ownedCli && child?.connected && typeof child.send === 'function');
      cleanup();

      (async () => {
        let receipt = null;
        const secondaryFaults = [];

        try {
          receipt = await requestChildTermination(child, {
            reason: primaryReason.reason,
            cooperative: drainOutput,
            graceMs: options.graceMs ?? (drainOutput ? 5000 : undefined),
            confirmationMs: options.confirmationMs
          });
        } catch (terminationErr) {
          secondaryFaults.push(terminationErr);
          try {
            if (child && typeof child.kill === 'function') {
              child.kill('SIGKILL');
            }
          } catch (killErr) {
            secondaryFaults.push(killErr);
          }
        }

        if (!actualClosed) {
          await new Promise(res => { pendingCloseResolve = res; });
        }

        const exitCode = finalExitCode !== null ? finalExitCode : (receipt?.exitCode ?? child?.exitCode ?? null);
        const signal = finalSignal !== null ? finalSignal : (receipt?.signal ?? child?.signalCode ?? null);

        const factualReceipt = receipt || {
          exitConfirmed: Boolean(actualClosed || isChildAlreadyExited(child)),
          state: (actualClosed || isChildAlreadyExited(child)) ? 'EXIT_CONFIRMED' : 'EXIT_UNCONFIRMED',
          terminationRequested: true,
          exitCode,
          signal,
          reason: primaryReason.reason,
          secondaryFaults
        };

        if (receipt && secondaryFaults.length > 0 && Array.isArray(receipt.secondaryFaults)) {
          receipt.secondaryFaults.push(...secondaryFaults);
        }

        let canonicalCancellation;
        try {
          if (stdout.split(MARKER).length === 3) {
            const payload = parseChildPayload(stdout);
            if (payload?.status === 'CANCELLED') canonicalCancellation = payload;
          }
        } catch { /* A missing/malformed frame is not a final canonical ledger. */ }

        settle(resultEnvelope(group, primaryReason.status, {
          error: primaryReason.error,
          code: primaryReason.code,
          stderr,
          process: { exitCode, signal, terminationRequested: true },
          receipt: factualReceipt,
          ...(canonicalCancellation ? { result: canonicalCancellation } : {}),
          ...(secondaryFaults.length > 0 ? { secondaryFaults } : {})
        }));
      })();
    };

    const append = (data, stream) => {
      if (settled || (terminating && !drainOutput)) return;
      bytes += Buffer.byteLength(data);
      if (bytes > (options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES)) {
        terminate('ERROR', 'Canonical evaluator output limit exceeded', 'MULTI_CHILD_OUTPUT_LIMIT');
        return;
      }
      if (stream === 'stdout') stdout += data.toString();
      else stderr += data.toString();
    };

    const onAbort = () => {
      terminate('CANCELLED', getAbortErrorMessage(options.signal), 'MULTI_CHILD_CANCELLED');
    };

    const onError = error => {
      if (terminating || settled) return;
      if (!child || !child.pid) {
        settle(resultEnvelope(group, 'ERROR', {
          error: error.message,
          code: 'MULTI_CHILD_SPAWN_ERROR',
          stderr,
          process: { exitCode: null, signal: null }
        }));
        return;
      }
      terminate('ERROR', error.message, 'MULTI_CHILD_SPAWN_ERROR');
    };

    const onClose = (code, signal) => {
      actualClosed = true;
      finalExitCode = (code !== undefined && code !== null) ? code : (child?.exitCode ?? null);
      finalSignal = (signal !== undefined && signal !== null) ? signal : (child?.signalCode ?? null);

      if (pendingCloseResolve) {
        const cb = pendingCloseResolve;
        pendingCloseResolve = null;
        cb();
      }

      if (terminating) return;
      settle(childOutcome(group, stdout, stderr, finalExitCode, finalSignal));
    };

    try {
      child = spawnObservedChild('executeGroupChild', __filename, extraEnv => spawn(process.execPath,
        childArguments(group, options, evalScript), {
          env: { ...process.env, ...extraEnv, STRUCTURED_PROGRESS: '0' },
          ...(ownedCli ? { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] } : {})
        }));

      if (child.stdout && typeof child.stdout.on === 'function') child.stdout.on('data', d => append(d, 'stdout'));
      if (child.stderr && typeof child.stderr.on === 'function') child.stderr.on('data', d => append(d, 'stderr'));
      child.on('error', onError);
      child.on('close', onClose);

      if (options.signal) {
        if (typeof options.signal.addEventListener === 'function') {
          options.signal.addEventListener('abort', onAbort, { once: true });
        } else if (typeof options.signal.on === 'function') {
          options.signal.on('abort', onAbort);
        }
        if (options.signal.aborted) {
          onAbort();
          return;
        }
      }

      timer = setTimeout(() => terminate('ERROR', 'Canonical evaluator timed out', 'MULTI_CHILD_TIMEOUT'), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    } catch (error) {
      settle(resultEnvelope(group, 'ERROR', { error: error.message, code: 'MULTI_CHILD_SPAWN_ERROR', stderr, process: { exitCode: null, signal: null } }));
    }
  });
}

module.exports = { executeGroupChild, childOutcome, parseChildPayload, DEFAULT_TIMEOUT_MS, DEFAULT_MAX_OUTPUT_BYTES };
