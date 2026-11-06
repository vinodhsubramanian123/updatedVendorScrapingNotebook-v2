'use strict';
const path = require('path');
const { spawn } = require('child_process');
const { requestChildTermination } = require('../system/child_termination.js');
const { spawnObservedChild } = require('../system/observed_child_process.js');
const { validateBudgetOptions, childTimeout } = require('../system/execution_budget.js');

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

function childOutcome(group, stdout, stderr, exitCode, signal, ipcPayload = null) {
  let result;
  if (ipcPayload) {
    result = ipcPayload;
  } else {
    try { result = parseChildPayload(stdout); }
    catch (error) { return resultEnvelope(group, 'ERROR', { error: error.message, stderr, process: { exitCode, signal } }); }
  }
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
  if (options.queryTimeoutMs !== undefined) args.push('--query-timeout-ms', String(options.queryTimeoutMs));
  if (options.deadlineAt !== undefined) args.push('--deadline-at', String(options.deadlineAt));
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

function _unwireSignal(signal, onAbort) {
  if (!signal) return;
  if (typeof signal.removeEventListener === 'function') {
    signal.removeEventListener('abort', onAbort);
  } else if (typeof signal.removeListener === 'function') {
    signal.removeListener('abort', onAbort);
  } else if (typeof signal.off === 'function') {
    signal.off('abort', onAbort);
  }
}

function _wireSignal(signal, onAbort) {
  if (!signal) return;
  if (typeof signal.addEventListener === 'function') {
    signal.addEventListener('abort', onAbort, { once: true });
  } else if (typeof signal.on === 'function') {
    signal.on('abort', onAbort);
  }
}

async function _executeChildTerminationAsync(child, group, options, state, settle) {
  let receipt = null;
  const secondaryFaults = [];

  try {
    receipt = await requestChildTermination(child, {
      reason: state.primaryReason.reason,
      cooperative: state.drainOutput,
      graceMs: options.graceMs ?? (state.drainOutput ? 5000 : undefined),
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

  if (!state.actualClosed) {
    await new Promise(res => { state.pendingCloseResolve = res; });
  }

  const exitCode = state.finalExitCode !== null ? state.finalExitCode : (receipt?.exitCode ?? child?.exitCode ?? null);
  const signal = state.finalSignal !== null ? state.finalSignal : (receipt?.signal ?? child?.signalCode ?? null);

  const factualReceipt = receipt || {
    exitConfirmed: Boolean(state.actualClosed || isChildAlreadyExited(child)),
    state: (state.actualClosed || isChildAlreadyExited(child)) ? 'EXIT_CONFIRMED' : 'EXIT_UNCONFIRMED',
    terminationRequested: true,
    exitCode,
    signal,
    reason: state.primaryReason.reason,
    secondaryFaults
  };

  if (receipt && secondaryFaults.length > 0 && Array.isArray(receipt.secondaryFaults)) {
    receipt.secondaryFaults.push(...secondaryFaults);
  }

  let canonicalCancellation;
  try {
    if (state.stdout.split(MARKER).length === 3) {
      const payload = parseChildPayload(state.stdout);
      if (payload?.status === 'CANCELLED') canonicalCancellation = payload;
    }
  } catch { /* A missing/malformed frame is not a final canonical ledger. */ }

  settle(resultEnvelope(group, state.primaryReason.status, {
    error: state.primaryReason.error,
    code: state.primaryReason.code,
    stderr: state.stderr,
    process: { exitCode, signal, terminationRequested: true },
    receipt: factualReceipt,
    ...(canonicalCancellation ? { result: canonicalCancellation } : {}),
    ...(secondaryFaults.length > 0 ? { secondaryFaults } : {})
  }));
}

function _setupChildStreamsAndEvents(child, group, options, state, terminate, settle) {
  const append = (data, stream) => {
    if (state.settled || (state.terminating && !state.drainOutput)) return;
    state.bytes += Buffer.byteLength(data);
    if (state.bytes > (options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES)) {
      terminate('ERROR', 'Canonical evaluator output limit exceeded', 'MULTI_CHILD_OUTPUT_LIMIT');
      return;
    }
    if (stream === 'stdout') state.stdout += data.toString();
    else state.stderr += data.toString();
  };

  const onError = error => {
    if (state.terminating || state.settled) return;
    if (!child || !child.pid) {
      settle(resultEnvelope(group, 'ERROR', {
        error: error.message,
        code: 'MULTI_CHILD_SPAWN_ERROR',
        stderr: state.stderr,
        process: { exitCode: null, signal: null }
      }));
      return;
    }
    terminate('ERROR', error.message, 'MULTI_CHILD_SPAWN_ERROR');
  };

  const onClose = (code, signal) => {
    state.actualClosed = true;
    state.finalExitCode = (code !== undefined && code !== null) ? code : (child?.exitCode ?? null);
    state.finalSignal = (signal !== undefined && signal !== null) ? signal : (child?.signalCode ?? null);

    if (state.pendingCloseResolve) {
      const cb = state.pendingCloseResolve;
      state.pendingCloseResolve = null;
      cb();
    }

    if (state.terminating) return;
    settle(childOutcome(group, state.stdout, state.stderr, state.finalExitCode, state.finalSignal, state.ipcChildPayload));
  };

  if (child.on && typeof child.on === 'function') {
    child.on('message', (msg) => {
      if (msg?.type === 'EVAL_RESULT_PAYLOAD') {
        state.ipcChildPayload = msg;
      }
    });
  }

  if (child.stdout && typeof child.stdout.on === 'function') child.stdout.on('data', d => append(d, 'stdout'));
  if (child.stderr && typeof child.stderr.on === 'function') child.stderr.on('data', d => append(d, 'stderr'));
  child.on('error', onError);
  child.on('close', onClose);
}

function executeGroupChild(group, options = {}) {
  const evalScript = path.join(__dirname, '../../evaluators/eval_boq.js');
  return new Promise((resolve, reject) => {
    try {
      validateSignal(options.signal);
      validateBudgetOptions(options);
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

    let lifetimeMs;
    try { lifetimeMs = childTimeout(options, Date.now()); } catch (error) { return reject(error); }

    const state = {
      child: null,
      timer: null,
      settled: false,
      terminating: false,
      primaryReason: null,
      stdout: '',
      stderr: '',
      ipcChildPayload: null,
      bytes: 0,
      actualClosed: false,
      finalExitCode: null,
      finalSignal: null,
      pendingCloseResolve: null,
      drainOutput: false
    };

    const ownedCli = process.env.PRESALES_TERMINAL_OWNER === '1';

    const cleanup = () => {
      if (state.timer !== null) {
        clearTimeout(state.timer);
        state.timer = null;
      }
      _unwireSignal(options.signal, onAbort);
    };

    const settle = result => {
      if (state.settled) return;
      state.settled = true;
      cleanup();
      resolve(result);
    };

    const terminate = (status, error, code) => {
      if (state.terminating || state.settled) return;
      state.terminating = true;
      state.primaryReason = {
        status, error, code,
        reason: status === 'CANCELLED' ? options.signal.reason : code
      };
      state.drainOutput = Boolean(ownedCli && state.child?.connected && typeof state.child.send === 'function');
      cleanup();
      _executeChildTerminationAsync(state.child, group, options, state, settle);
    };

    const onAbort = () => {
      terminate('CANCELLED', getAbortErrorMessage(options.signal), 'MULTI_CHILD_CANCELLED');
    };

    try {
      state.child = spawnObservedChild('executeGroupChild', __filename, extraEnv => spawn(process.execPath,
        childArguments(group, options, evalScript), {
          env: { ...process.env, ...extraEnv, STRUCTURED_PROGRESS: '0' },
          ...(ownedCli ? { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] } : {})
        }));

      _setupChildStreamsAndEvents(state.child, group, options, state, terminate, settle);

      if (options.signal) {
        _wireSignal(options.signal, onAbort);
        if (options.signal.aborted) {
          onAbort();
          return;
        }
      }

      const remainingMs = options.deadlineAt === undefined ? lifetimeMs : Math.max(1, Math.min(lifetimeMs, options.deadlineAt - Date.now()));
      state.timer = setTimeout(() => terminate('ERROR', 'Canonical evaluator timed out', 'MULTI_CHILD_TIMEOUT'), remainingMs);
    } catch (error) {
      settle(resultEnvelope(group, 'ERROR', { error: error.message, code: 'MULTI_CHILD_SPAWN_ERROR', stderr: state.stderr, process: { exitCode: null, signal: null } }));
    }
  });
}

module.exports = { executeGroupChild, childOutcome, parseChildPayload, DEFAULT_TIMEOUT_MS, DEFAULT_MAX_OUTPUT_BYTES };
