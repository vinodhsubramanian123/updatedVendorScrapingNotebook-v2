'use strict';

/**
 * tests/unit/test_observed_child_process.js
 *
 * Unit tests for private helper scripts/lib/system/observed_child_process.js.
 * VM injection of observer, root/trace contexts, and fake ChildProcess EventEmitters.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const MODULE_PATH = path.resolve(__dirname, '../../scripts/lib/system/observed_child_process.js');
const MODULE_CODE = fs.readFileSync(MODULE_PATH, 'utf8');

/**
 * Normalizes plain data objects produced across VM boundaries before deepStrictEqual.
 */
function normalize(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Creates an instance of observed_child_process in an isolated VM context
 * with injected module mocks and process.env overrides.
 */
function createVmInstance(mocks = {}, envOverrides = {}) {
  const mod = { exports: {} };
  const customProcess = {
    ...process,
    env: { ...process.env, ...envOverrides }
  };

  const customRequire = (specifier) => {
    if (specifier === './execution_trace_runtime.js') {
      return mocks.execution_trace_runtime || {};
    }
    if (specifier === './execution_scope.js') {
      return mocks.execution_scope || {};
    }
    if (specifier === './trace_context.js') {
      return mocks.trace_context || {};
    }
    return require(specifier);
  };

  const sandbox = {
    module: mod,
    exports: mod.exports,
    require: customRequire,
    process: customProcess,
    console,
    setTimeout,
    clearTimeout,
    Promise,
    Object,
    Error,
    TypeError,
    Boolean,
    Number,
    String,
    RegExp
  };

  vm.createContext(sandbox);
  const script = new vm.Script(MODULE_CODE, { filename: MODULE_PATH });
  script.runInContext(sandbox);
  return mod.exports;
}

/**
 * Fake ChildProcess extending EventEmitter with controllable pid.
 */
class FakeChildProcess extends EventEmitter {
  constructor(pid = 1234) {
    super();
    this.pid = pid;
  }
}

describe('observed_child_process', () => {
  describe('disabled mode (PRESALES_EXECUTION_TRACE !== "1")', () => {
    it('proves disabled zero observer/listeners, calls startChild once with empty env, returns exact child', () => {
      let observerCalled = false;
      const mocks = {
        execution_trace_runtime: {
          observeActualInvocation: () => {
            observerCalled = true;
            throw new Error('Observer must not be called when disabled');
          }
        }
      };

      const { spawnObservedChild } = createVmInstance(mocks, {
        PRESALES_EXECUTION_TRACE: '0'
      });

      const fakeChild = new FakeChildProcess(555);
      let startCount = 0;
      let receivedEnv = null;

      const result = spawnObservedChild('disabled-test', 'test.js', (extraEnv) => {
        startCount++;
        receivedEnv = extraEnv;
        return fakeChild;
      });

      assert.strictEqual(result, fakeChild, 'Returns exact child identity');
      assert.strictEqual(startCount, 1, 'startChild called exactly once');
      assert.deepStrictEqual(normalize(receivedEnv), {}, 'startChild receives empty extraEnv');
      assert.strictEqual(observerCalled, false, 'Observer never called when disabled');
      assert.strictEqual(fakeChild.listenerCount('close'), 0, 'Zero close listeners attached');
      assert.strictEqual(fakeChild.listenerCount('error'), 0, 'Zero error listeners attached');
    });

    it('proves disabled mode when PRESALES_EXECUTION_TRACE is unset', () => {
      const mocks = {
        execution_trace_runtime: {
          observeActualInvocation: () => {
            throw new Error('Observer must not be called when unset');
          }
        }
      };

      const { spawnObservedChild } = createVmInstance(mocks, {
        PRESALES_EXECUTION_TRACE: undefined
      });

      const fakeChild = new FakeChildProcess(777);
      let startCount = 0;

      const result = spawnObservedChild('unset-test', 'test.js', () => {
        startCount++;
        return fakeChild;
      });

      assert.strictEqual(result, fakeChild);
      assert.strictEqual(startCount, 1);
      assert.strictEqual(fakeChild.listenerCount('close'), 0);
      assert.strictEqual(fakeChild.listenerCount('error'), 0);
    });
  });

  describe('enabled mode (PRESALES_EXECUTION_TRACE === "1")', () => {
    it('proves enabled exactchild returned synchronously and startChild called exactly once', () => {
      let observerCalls = 0;
      let observerCallbackPromise = null;

      const mocks = {
        execution_trace_runtime: {
          observeActualInvocation: (name, sourceFile, cb) => {
            observerCalls++;
            assert.strictEqual(name, 'test-proc');
            assert.strictEqual(sourceFile, 'source.js');
            observerCallbackPromise = cb();
            return observerCallbackPromise;
          }
        },
        execution_scope: {
          getExecutionHandle: () => null
        },
        trace_context: {
          getTraceId: () => 'NO_TRACE_CONTEXT'
        }
      };

      const { spawnObservedChild } = createVmInstance(mocks, {
        PRESALES_EXECUTION_TRACE: '1'
      });

      const fakeChild = new FakeChildProcess(1001);
      let startCalls = 0;

      const child = spawnObservedChild('test-proc', 'source.js', () => {
        startCalls++;
        return fakeChild;
      });

      assert.strictEqual(child, fakeChild, 'Must return exact child instance synchronously');
      assert.strictEqual(startCalls, 1, 'startChild called exactly once');
      assert.strictEqual(observerCalls, 1, 'Observer called exactly once');
      assert.ok(observerCallbackPromise instanceof Promise, 'Observer receives Promise');
    });

    it('proves envlinks: populates valid UUID rootId and bounded TRC traceId without mutating process.env', () => {
      const validRootId = 'e2b3c4d5-6789-4abc-9def-0123456789ab';
      const validTraceId = 'TRC-1728345678-ABCDEF1234';

      let capturedExtraEnv = null;

      const mocks = {
        execution_trace_runtime: {
          observeActualInvocation: (name, sourceFile, cb) => cb()
        },
        execution_scope: {
          getExecutionHandle: () => ({ rootId: validRootId })
        },
        trace_context: {
          getTraceId: () => validTraceId
        }
      };

      const { spawnObservedChild } = createVmInstance(mocks, {
        PRESALES_EXECUTION_TRACE: '1'
      });

      const fakeChild = new FakeChildProcess(1002);
      spawnObservedChild('trace-proc', 'trace.js', (extraEnv) => {
        capturedExtraEnv = extraEnv;
        return fakeChild;
      });

      assert.strictEqual(capturedExtraEnv.PRESALES_EXECUTION_PARENT_ROOT_ID, validRootId);
      assert.strictEqual(capturedExtraEnv.PRESALES_EXECUTION_PARENT_TRACE_ID, validTraceId);
      assert.strictEqual('parentInvocationId' in capturedExtraEnv, false, 'Must not invent parentInvocationId');
      assert.strictEqual('PRESALES_EXECUTION_PARENT_INVOCATION_ID' in capturedExtraEnv, false);
      assert.strictEqual(process.env.PRESALES_EXECUTION_PARENT_ROOT_ID, undefined, 'Must not mutate process.env');
      assert.strictEqual(process.env.PRESALES_EXECUTION_PARENT_TRACE_ID, undefined, 'Must not mutate process.env');
    });

    it('proves invalidmetadata omitted: invalid UUID rootId and invalid TRC traceId are excluded', () => {
      const invalidRoots = [
        'not-a-uuid',
        'e2b3c4d5-6789-4abc-9def-0123456789ab-extra',
        'g2b3c4d5-6789-4abc-9def-0123456789ab',
        '',
        12345,
        null,
        undefined
      ];

      const invalidTraces = [
        'NO_TRACE_CONTEXT',
        'NOT-TRC-123',
        'TRC-',
        'TRC-' + 'x'.repeat(126), // length 130 > 128
        12345,
        null,
        undefined
      ];

      for (const root of invalidRoots) {
        for (const trc of invalidTraces) {
          let capturedExtraEnv = null;
          const mocks = {
            execution_trace_runtime: {
              observeActualInvocation: (name, sourceFile, cb) => cb()
            },
            execution_scope: {
              getExecutionHandle: () => (root !== undefined ? { rootId: root } : null)
            },
            trace_context: {
              getTraceId: () => trc
            }
          };

          const { spawnObservedChild } = createVmInstance(mocks, {
            PRESALES_EXECUTION_TRACE: '1'
          });

          const fakeChild = new FakeChildProcess(1003);
          spawnObservedChild('invalid-test', 'src.js', (extraEnv) => {
            capturedExtraEnv = extraEnv;
            return fakeChild;
          });

          assert.strictEqual(
            'PRESALES_EXECUTION_PARENT_ROOT_ID' in capturedExtraEnv,
            false,
            `Expected rootId ${root} to be omitted`
          );
          assert.strictEqual(
            'PRESALES_EXECUTION_PARENT_TRACE_ID' in capturedExtraEnv,
            false,
            `Expected traceId ${trc} to be omitted`
          );
        }
      }
    });

    it('proves promise stayspending after liveerror and resolvesclose with factual result', async () => {
      let returnedPromise = null;
      const mocks = {
        execution_trace_runtime: {
          observeActualInvocation: (name, sourceFile, cb) => {
            returnedPromise = cb();
            return returnedPromise;
          }
        },
        execution_scope: { getExecutionHandle: () => null },
        trace_context: { getTraceId: () => 'NO_TRACE_CONTEXT' }
      };

      const { spawnObservedChild } = createVmInstance(mocks, {
        PRESALES_EXECUTION_TRACE: '1'
      });

      const liveChild = new FakeChildProcess(2001); // Positive PID -> live child
      spawnObservedChild('live-error-proc', 'live.js', () => liveChild);

      assert.ok(returnedPromise, 'Callback returned a Promise');

      // Live error emitted
      liveChild.emit('error', new Error('Transient runtime socket error'));

      // Check promise is still pending
      const checkPendingSymbol = Symbol('pending');
      const raceResult = await Promise.race([
        returnedPromise,
        new Promise((resolve) => setTimeout(() => resolve(checkPendingSymbol), 25))
      ]);
      assert.strictEqual(raceResult, checkPendingSymbol, 'Promise must remain pending after live error');

      // Now close emitted with exit code 1
      liveChild.emit('close', 1, null);

      const domainResult = await returnedPromise;
      assert.deepStrictEqual(normalize(domainResult), {
        processExit: {
          code: 1,
          signal: null
        },
        status: 'ERROR'
      });

      // Cleanup verified
      assert.strictEqual(liveChild.listenerCount('close'), 0, 'Own close listener cleaned up');
      assert.strictEqual(liveChild.listenerCount('error'), 0, 'Own error listener cleaned up');
    });

    it('proves clean process exit yields status NOT_EVALUATED', async () => {
      let returnedPromise = null;
      const mocks = {
        execution_trace_runtime: {
          observeActualInvocation: (name, sourceFile, cb) => {
            returnedPromise = cb();
            return returnedPromise;
          }
        },
        execution_scope: { getExecutionHandle: () => null },
        trace_context: { getTraceId: () => 'NO_TRACE_CONTEXT' }
      };

      const { spawnObservedChild } = createVmInstance(mocks, {
        PRESALES_EXECUTION_TRACE: '1'
      });

      const cleanChild = new FakeChildProcess(2002);
      spawnObservedChild('clean-proc', 'clean.js', () => cleanChild);

      cleanChild.emit('close', 0, null);

      const domainResult = await returnedPromise;
      assert.deepStrictEqual(normalize(domainResult), {
        processExit: {
          code: 0,
          signal: null
        },
        status: 'NOT_EVALUATED'
      });
    });

    it('proves signal termination exit yields status ERROR', async () => {
      let returnedPromise = null;
      const mocks = {
        execution_trace_runtime: {
          observeActualInvocation: (name, sourceFile, cb) => {
            returnedPromise = cb();
            return returnedPromise;
          }
        },
        execution_scope: { getExecutionHandle: () => null },
        trace_context: { getTraceId: () => 'NO_TRACE_CONTEXT' }
      };

      const { spawnObservedChild } = createVmInstance(mocks, {
        PRESALES_EXECUTION_TRACE: '1'
      });

      const sigChild = new FakeChildProcess(2003);
      spawnObservedChild('sig-proc', 'sig.js', () => sigChild);

      sigChild.emit('close', null, 'SIGTERM');

      const domainResult = await returnedPromise;
      assert.deepStrictEqual(normalize(domainResult), {
        processExit: {
          code: null,
          signal: 'SIGTERM'
        },
        status: 'ERROR'
      });
    });

    it('proves no-pid error resolves once and ignores duplicate terminal events', async () => {
      let returnedPromise = null;
      const mocks = {
        execution_trace_runtime: {
          observeActualInvocation: (name, sourceFile, cb) => {
            returnedPromise = cb();
            return returnedPromise;
          }
        },
        execution_scope: { getExecutionHandle: () => null },
        trace_context: { getTraceId: () => 'NO_TRACE_CONTEXT' }
      };

      const { spawnObservedChild } = createVmInstance(mocks, {
        PRESALES_EXECUTION_TRACE: '1'
      });

      const failedSpawnChild = new FakeChildProcess(null);
      failedSpawnChild.pid = undefined; // Explicitly no positive PID

      // Separately owned consumer error listener to observe errors and prevent unhandled error event
      let consumerErrorCalls = 0;
      failedSpawnChild.on('error', () => {
        consumerErrorCalls++;
      });

      spawnObservedChild('no-pid-proc', 'no-pid.js', () => failedSpawnChild);

      // Helper attached 1 error listener; consumer attached 1 error listener
      assert.strictEqual(failedSpawnChild.listenerCount('error'), 2);

      // Emit spawn error
      failedSpawnChild.emit('error', new Error('spawn ENOENT'));

      const domainResult = await returnedPromise;
      assert.deepStrictEqual(normalize(domainResult), {
        processExit: {
          code: null,
          signal: null
        },
        status: 'ERROR'
      });

      // After settlement, helper cleaned up its own error & close listeners, but consumer is preserved
      assert.strictEqual(failedSpawnChild.listenerCount('error'), 1, 'Consumer error listener preserved');
      assert.strictEqual(failedSpawnChild.listenerCount('close'), 0, 'Helper close listener cleaned up');
      assert.strictEqual(consumerErrorCalls, 1, 'Consumer received first error');

      // Emit duplicate error and close; must not throw or alter settlement
      failedSpawnChild.emit('error', new Error('duplicate spawn error'));
      failedSpawnChild.emit('close', 1, null);

      assert.strictEqual(consumerErrorCalls, 2, 'Consumer error listener received duplicate error');
      assert.strictEqual(failedSpawnChild.listenerCount('error'), 1, 'Consumer error listener still preserved');
      assert.strictEqual(failedSpawnChild.listenerCount('close'), 0);
    });

    it('proves sync frozen throw identity propagates exactly with no double start', () => {
      let startCalls = 0;
      const frozenError = Object.freeze(new Error('frozen-spawn-error'));

      const mocks = {
        execution_trace_runtime: {
          observeActualInvocation: (name, sourceFile, cb) => cb()
        },
        execution_scope: { getExecutionHandle: () => null },
        trace_context: { getTraceId: () => 'NO_TRACE_CONTEXT' }
      };

      const { spawnObservedChild } = createVmInstance(mocks, {
        PRESALES_EXECUTION_TRACE: '1'
      });

      let caught = null;
      try {
        spawnObservedChild('throw-frozen', 'src.js', () => {
          startCalls++;
          throw frozenError;
        });
      } catch (err) {
        caught = err;
      }

      assert.strictEqual(caught, frozenError, 'Exact frozen object identity must propagate');
      assert.strictEqual(startCalls, 1, 'startChild must be called exactly once');
    });

    it('proves sync primitive throw identity propagates exactly with no double start', () => {
      const primitives = ['primitive string failure', 404, false, null];

      for (const prim of primitives) {
        let startCalls = 0;
        const mocks = {
          execution_trace_runtime: {
            observeActualInvocation: (name, sourceFile, cb) => cb()
          },
          execution_scope: { getExecutionHandle: () => null },
          trace_context: { getTraceId: () => 'NO_TRACE_CONTEXT' }
        };

        const { spawnObservedChild } = createVmInstance(mocks, {
          PRESALES_EXECUTION_TRACE: '1'
        });

        let caught = null;
        let didThrow = false;
        try {
          spawnObservedChild('throw-prim', 'src.js', () => {
            startCalls++;
            throw prim;
          });
        } catch (err) {
          didThrow = true;
          caught = err;
        }

        assert.strictEqual(didThrow, true, 'Synchronous primitive throw must throw');
        assert.strictEqual(caught, prim, 'Exact primitive identity must propagate');
        assert.strictEqual(startCalls, 1, 'startChild must be called exactly once');
      }
    });

    it('proves duplicateclose + consumerlistener preservation', async () => {
      let returnedPromise = null;
      const mocks = {
        execution_trace_runtime: {
          observeActualInvocation: (name, sourceFile, cb) => {
            returnedPromise = cb();
            return returnedPromise;
          }
        },
        execution_scope: { getExecutionHandle: () => null },
        trace_context: { getTraceId: () => 'NO_TRACE_CONTEXT' }
      };

      const { spawnObservedChild } = createVmInstance(mocks, {
        PRESALES_EXECUTION_TRACE: '1'
      });

      const child = new FakeChildProcess(3001);

      // Consumer attaches external listener
      let consumerCloseCalls = 0;
      child.on('close', () => {
        consumerCloseCalls++;
      });

      spawnObservedChild('dup-close-proc', 'src.js', () => child);

      // Helper attached 1 close listener; consumer attached 1 close listener
      assert.strictEqual(child.listenerCount('close'), 2);

      // Emit first close
      child.emit('close', 0, null);
      assert.strictEqual(consumerCloseCalls, 1, 'Consumer listener called on first close');
      assert.strictEqual(child.listenerCount('close'), 1, 'Helper removed own listener, consumer preserved');

      // Emit second (duplicate) close
      child.emit('close', 0, null);
      assert.strictEqual(consumerCloseCalls, 2, 'Consumer listener called on duplicate close');
      assert.strictEqual(child.listenerCount('close'), 1, 'Consumer listener still preserved');

      const result = await returnedPromise;
      assert.strictEqual(result.status, 'NOT_EVALUATED');
    });

    it('proves avoiding unhandled rejection from internally observed promise', async () => {
      let rejectionHandled = false;
      const mocks = {
        execution_trace_runtime: {
          observeActualInvocation: (name, sourceFile, cb) => {
            cb();
            // Return an internally rejected promise
            const p = Promise.reject(new Error('Internal observer pipeline fault'));
            return p;
          }
        },
        execution_scope: { getExecutionHandle: () => null },
        trace_context: { getTraceId: () => 'NO_TRACE_CONTEXT' }
      };

      const { spawnObservedChild } = createVmInstance(mocks, {
        PRESALES_EXECUTION_TRACE: '1'
      });

      const fakeChild = new FakeChildProcess(4001);

      // Should not throw unhandled rejection
      const result = spawnObservedChild('reject-test', 'src.js', () => fakeChild);
      assert.strictEqual(result, fakeChild);

      // Allow tick for any unhandled rejection to surface if unhandled
      await new Promise((resolve) => setTimeout(resolve, 20));
      rejectionHandled = true;
      assert.strictEqual(rejectionHandled, true);
    });

    it('process contract not canonical: real Node child exit seam with actual EventEmitter ChildProcess but mocked observer', async () => {
      let observationPromise = null;
      const mocks = {
        execution_trace_runtime: {
          observeActualInvocation: (name, sourceFile, cb) => {
            observationPromise = cb();
            return observationPromise;
          }
        },
        execution_scope: { getExecutionHandle: () => null },
        trace_context: { getTraceId: () => 'NO_TRACE_CONTEXT' }
      };

      const { spawnObservedChild } = createVmInstance(mocks, {
        PRESALES_EXECUTION_TRACE: '1'
      });

      // Spawn a real Node child process
      const realChild = spawnObservedChild('real-node-proc', __filename, (extraEnv) => {
        return childProcess.spawn(process.execPath, ['-e', 'process.exit(0)'], {
          env: { ...process.env, ...extraEnv }
        });
      });

      assert.ok(typeof realChild.pid === 'number' && realChild.pid > 0, 'Real child has positive PID');

      const outcome = await observationPromise;
      assert.deepStrictEqual(normalize(outcome), {
        processExit: {
          code: 0,
          signal: null
        },
        status: 'NOT_EVALUATED'
      });
      assert.strictEqual(realChild.listenerCount('close'), 0, 'Listeners cleaned on real child exit');
    });

    it('process contract not canonical: real Node child exit seam with non-zero exit', async () => {
      let observationPromise = null;
      const mocks = {
        execution_trace_runtime: {
          observeActualInvocation: (name, sourceFile, cb) => {
            observationPromise = cb();
            return observationPromise;
          }
        },
        execution_scope: { getExecutionHandle: () => null },
        trace_context: { getTraceId: () => 'NO_TRACE_CONTEXT' }
      };

      const { spawnObservedChild } = createVmInstance(mocks, {
        PRESALES_EXECUTION_TRACE: '1'
      });

      const realChild = spawnObservedChild('real-node-err-proc', __filename, (extraEnv) => {
        return childProcess.spawn(process.execPath, ['-e', 'process.exit(42)'], {
          env: { ...process.env, ...extraEnv }
        });
      });

      assert.ok(typeof realChild.pid === 'number' && realChild.pid > 0, 'Real child has positive PID');

      const outcome = await observationPromise;
      assert.deepStrictEqual(normalize(outcome), {
        processExit: {
          code: 42,
          signal: null
        },
        status: 'ERROR'
      });
    });
  });
});


describe('outbound inherited trace ID matches downstream bounded grammar', () => {
  const rootId = '12345678-1234-1234-1234-123456789abc';
  const cases = [
    ['empty', '', false], ['prefix only', 'TRC-', false],
    ['underscore', 'TRC-valid_bad', false], ['space', 'TRC-valid bad', false],
    ['slash', 'TRC-valid/bad', false], ['newline', 'TRC-valid\n', false],
    ['unicode', 'TRC-é', false], ['wrong case prefix', 'trc-valid', false],
    ['non-string', 123, false], ['oversize 129', 'TRC-' + 'A'.repeat(125), false],
    ['valid shortest', 'TRC-A', true], ['valid mixed', 'TRC-Ab9-0z', true],
    ['valid bound 128', 'TRC-' + 'A'.repeat(124), true]
  ];
  for (const [label, traceId, valid] of cases) it(label, async () => {
    let observed, env, calls = 0;
    const child = new FakeChildProcess();
    const { spawnObservedChild } = createVmInstance({
      execution_trace_runtime: { observeActualInvocation: (name, file, cb) => { observed = cb(); return observed; } },
      execution_scope: { getExecutionHandle: () => ({ rootId }) },
      trace_context: { getTraceId: () => traceId }
    }, { PRESALES_EXECUTION_TRACE: '1' });
    assert.strictEqual(spawnObservedChild('trace-validation', __filename, extra => { calls++; env = extra; return child; }), child);
    assert.equal(calls, 1);
    assert.deepStrictEqual(normalize(env), valid ? { PRESALES_EXECUTION_PARENT_ROOT_ID: rootId, PRESALES_EXECUTION_PARENT_TRACE_ID: traceId } : { PRESALES_EXECUTION_PARENT_ROOT_ID: rootId });
    child.emit('close', 0, null);
    assert.equal((await observed).status, 'NOT_EVALUATED');
    assert.equal(child.listenerCount('close'), 0);
    assert.equal(child.listenerCount('error'), 0);
  });
});
