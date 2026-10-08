'use strict';

/**
 * scripts/lib/system/child_termination.js
 *
 * Additive, isolated child-process termination helper with cooperative escalation
 * and factual receipt accounting.
 *
 * Cooperative IPC is explicitly opt-in; default signal escalation is unchanged.
 *
 * CRITICAL CALLER OWNERSHIP NOTICE:
 * When this function returns a receipt with state 'EXIT_UNCONFIRMED' (exitConfirmed === false),
 * the child process has NOT been confirmed to have exited.
 * The caller MUST retain task ownership, mutual exclusion locks, lease reservations,
 * and associated resource allocations on EXIT_UNCONFIRMED until an actual independent
 * 'close' event is received. Promise completion alone is NOT authorization to release mutexes,
 * recycle directories, or reassign task ownership.
 */

const DEFAULT_GRACE_MS = 250;
const DEFAULT_CONFIRMATION_MS = 1000;

const TERMINATION_STATES = Object.freeze({
  EXIT_CONFIRMED: 'EXIT_CONFIRMED',
  EXIT_UNCONFIRMED: 'EXIT_UNCONFIRMED'
});

/**
 * Validate delay values as positive safe integers.
 * @param {unknown} value
 * @param {number} defaultValue
 * @param {string} name
 * @returns {number}
 */
function validateDelay(value, defaultValue, name) {
  if (value === undefined) {
    return defaultValue;
  }
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive safe integer`);
  }
  return value;
}

/**
 * Check if the child process has already exited based on actual populated exitCode/signalCode.
 * child.kill() returning true or child.killed === true never proves exit.
 * @param {object} child
 * @returns {boolean}
 */
function isChildAlreadyExited(child) {
  return (child.exitCode !== null && child.exitCode !== undefined) ||
         (child.signalCode !== null && child.signalCode !== undefined);
}

/**
 * Request child process termination with SIGTERM and escalation to SIGKILL.
 *
 * Contract:
 * - Attach close/error listeners BEFORE sending SIGTERM.
 * - Only child.close or already populated actual exitCode/signalCode establishes exitConfirmed=true.
 * - child.kill returning true or child.killed never proves exit.
 * - If still open at graceMs, request SIGKILL once.
 * - If still no close by final deadline (confirmationMs after escalation), return
 *   exitConfirmed=false, state EXIT_UNCONFIRMED, terminationRequested=true, exitCode=null, signal=null.
 * - Keep original reason exactly (identity and value preserved, including false/null/undefined).
 * - Record kill errors and error events as secondary faults; never replace primary reason.
 * - Clear timers and own listeners on completion, preserving all other external listeners.
 * - Synchronous kill throw, false return, and error events cannot fabricate success.
 * - Already-exited child is not signaled.
 * - Completion is guarded once against error/close/timer races.
 * - No arbitrary PID handling, shell, recursive operations, or global state.
 *
 * @param {import('child_process').ChildProcess | object} child - Target child process.
 * @param {object} [options={}] - Options object.
 * @param {*} [options.reason] - Exact reason identity/value.
 * @param {boolean} [options.cooperative=false] - Send a cancellation IPC request and wait graceMs before SIGTERM when connected.
 * @param {number} [options.graceMs=250] - Milliseconds before escalating to SIGKILL.
 * @param {number} [options.confirmationMs=1000] - Milliseconds after escalation before timeout.
 * @returns {Promise<object>} Factual receipt of termination outcome.
 */
function requestChildTermination(child, options = {}) {
  if (!child || typeof child !== 'object' || typeof child.on !== 'function') {
    return Promise.reject(new TypeError('child must be an object with an EventEmitter interface'));
  }

  const opts = options || {};
  let graceMs;
  let confirmationMs;

  try {
    graceMs = validateDelay(opts.graceMs, DEFAULT_GRACE_MS, 'graceMs');
    confirmationMs = validateDelay(opts.confirmationMs, DEFAULT_CONFIRMATION_MS, 'confirmationMs');
  } catch (err) {
    return Promise.reject(err);
  }

  const reason = opts.reason;

  // Already-exited child is not signaled.
  if (isChildAlreadyExited(child)) {
    return Promise.resolve({
      exitConfirmed: true,
      state: TERMINATION_STATES.EXIT_CONFIRMED,
      terminationRequested: false,
      exitCode: child.exitCode !== undefined ? child.exitCode : null,
      signal: child.signalCode !== undefined ? child.signalCode : null,
      reason,
      secondaryFaults: []
    });
  }

  return new Promise((resolve) => {
    let completed = false;
    let cooperativeTimer = null;
    let graceTimer = null;
    let confirmationTimer = null;
    const secondaryFaults = [];

    function cleanup() {
      if (cooperativeTimer !== null) {
        clearTimeout(cooperativeTimer);
        cooperativeTimer = null;
      }
      if (graceTimer !== null) {
        clearTimeout(graceTimer);
        graceTimer = null;
      }
      if (confirmationTimer !== null) {
        clearTimeout(confirmationTimer);
        confirmationTimer = null;
      }
      if (typeof child.removeListener === 'function') {
        child.removeListener('close', onClose);
        child.removeListener('error', onError);
      } else if (typeof child.off === 'function') {
        child.off('close', onClose);
        child.off('error', onError);
      }
    }

    function complete(receipt) {
      if (completed) {
        return;
      }
      completed = true;
      cleanup();
      resolve(receipt);
    }

    function onClose(code, signal) {
      const exitCode = (code !== undefined && code !== null) ? code : (child.exitCode ?? null);
      const exitSignal = (signal !== undefined && signal !== null) ? signal : (child.signalCode ?? null);
      complete({
        exitConfirmed: true,
        state: TERMINATION_STATES.EXIT_CONFIRMED,
        terminationRequested: true,
        exitCode,
        signal: exitSignal,
        reason,
        secondaryFaults
      });
    }

    function onError(err) {
      secondaryFaults.push(err);
    }

    // Contract: attach close/error listeners BEFORE sending SIGTERM.
    child.on('close', onClose);
    child.on('error', onError);

    function beginSignalTermination() {
      // Send SIGTERM after any explicitly requested cooperative interval.
      try {
        if (typeof child.kill === 'function') {
          child.kill('SIGTERM');
        } else {
          secondaryFaults.push(new TypeError('child.kill is not a function'));
        }
      } catch (err) {
        secondaryFaults.push(err);
      }

      // If close fired synchronously during kill(), completion guard already handled it.
      if (completed) {
        return;
      }

      // Grace timer: if still open after graceMs, request SIGKILL once.
      graceTimer = setTimeout(() => {
        graceTimer = null;
        if (completed) {
          return;
        }

        try {
          if (typeof child.kill === 'function') {
            child.kill('SIGKILL');
          } else {
            secondaryFaults.push(new TypeError('child.kill is not a function'));
          }
        } catch (err) {
          secondaryFaults.push(err);
        }

        if (completed) {
          return;
        }

        // Confirmation timer: confirmationMs after escalation.
        confirmationTimer = setTimeout(() => {
          confirmationTimer = null;
          complete({
            exitConfirmed: false,
            state: TERMINATION_STATES.EXIT_UNCONFIRMED,
            terminationRequested: true,
            exitCode: null,
            signal: null,
            reason,
            secondaryFaults
          });
        }, confirmationMs);
      }, graceMs);
    }

    if (opts.cooperative === true && child.connected && typeof child.send === 'function') {
      try {
        child.send({ type: 'PRESALES_CANCEL', reason }, error => {
          if (error) secondaryFaults.push(error);
        });
      } catch (error) {
        secondaryFaults.push(error);
      }
      if (!completed) cooperativeTimer = setTimeout(() => {
        cooperativeTimer = null;
        if (!completed) beginSignalTermination();
      }, graceMs);
    } else {
      beginSignalTermination();
    }
  });
}

module.exports = {
  requestChildTermination,
  DEFAULT_GRACE_MS,
  DEFAULT_CONFIRMATION_MS,
  TERMINATION_STATES
};
