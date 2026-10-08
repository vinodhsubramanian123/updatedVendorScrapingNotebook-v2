'use strict';

/**
 * scripts/lib/system/observed_child_process.js
 *
 * Observed Child Process Execution Foundation.
 * Synchronously starts child processes under trace observation when enabled.
 * Private unused helper.
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Spawns an observed child process or directly starts child if execution trace is disabled.
 *
 * @param {string} name Invocation name
 * @param {string} sourceFile Source file path
 * @param {Function} startChild Synchronous child starter callback receiving extraEnv
 * @returns {object} Exact ChildProcess identity synchronously
 */
function spawnObservedChild(name, sourceFile, startChild) {
  if (process.env.PRESALES_EXECUTION_TRACE !== '1') {
    return startChild({});
  }

  const { observeActualInvocation } = require('./execution_trace_runtime.js');
  const { getExecutionHandle } = require('./execution_scope.js');
  const { getTraceId } = require('./trace_context.js');

  let child;
  let started = false;

  const observationPromise = observeActualInvocation(name, sourceFile, () => {
    if (started) {
      throw new Error('startChild must only be called once');
    }
    started = true;

    const extraEnv = {};
    const handle = typeof getExecutionHandle === 'function' ? getExecutionHandle() : null;
    const rootId = handle?.rootId;
    if (typeof rootId === 'string' && UUID_REGEX.test(rootId)) {
      extraEnv.PRESALES_EXECUTION_PARENT_ROOT_ID = rootId;
    }

    const traceId = typeof getTraceId === 'function' ? getTraceId() : null;
    if (
      typeof traceId === 'string' &&
      traceId !== 'NO_TRACE_CONTEXT' &&
      /^TRC-[A-Za-z0-9-]+$/.test(traceId) &&
      traceId.length <= 128
    ) {
      extraEnv.PRESALES_EXECUTION_PARENT_TRACE_ID = traceId;
    }

    child = startChild(extraEnv);

    return new Promise((resolve) => {
      let settled = false;

      function cleanup() {
        if (child && typeof child.removeListener === 'function') {
          child.removeListener('close', onClose);
          child.removeListener('error', onError);
        }
      }

      function onClose(code, signal) {
        if (settled) return;
        settled = true;
        cleanup();
        const exitCode = typeof code === 'number' ? code : null;
        const exitSignal = typeof signal === 'string' ? signal : null;
        const status = exitCode !== 0 || exitSignal !== null ? 'ERROR' : 'NOT_EVALUATED';
        resolve({
          processExit: {
            code: exitCode,
            signal: exitSignal
          },
          status
        });
      }

      function onError() {
        const hasPositivePid = typeof child?.pid === 'number' && child.pid > 0;
        if (!hasPositivePid) {
          if (settled) return;
          settled = true;
          cleanup();
          resolve({
            processExit: {
              code: null,
              signal: null
            },
            status: 'ERROR'
          });
        }
      }

      if (child && typeof child.on === 'function') {
        child.on('close', onClose);
        child.on('error', onError);
      } else {
        settled = true;
        resolve({
          processExit: {
            code: null,
            signal: null
          },
          status: 'ERROR'
        });
      }
    });
  });

  if (observationPromise && typeof observationPromise.catch === 'function') {
    Promise.prototype.catch.call(observationPromise, () => {});
  }

  return child;
}

module.exports = {
  spawnObservedChild
};
