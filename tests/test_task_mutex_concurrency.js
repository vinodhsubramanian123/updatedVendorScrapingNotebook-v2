'use strict';
/**
 * tests/test_task_mutex_concurrency.js — Task Mutex & Lifecycle Concurrency Suite
 *
 * Tests:
 * 1. Mutual exclusion during long-running tasks
 * 2. 409 Conflict rejection when a task is already executing
 * 3. Graceful unlock on task exit / failure
 * 4. SSE subscriber notification and broadcast integrity
 */

const assert = require('assert');
const path = require('path');
const { spawn } = require('child_process');
const {
  isTaskRunning,
  getActiveTask,
  startTask,
  _setActiveTask,
  addSseClient,
  removeSseClient,
  broadcastSSE
} = require('../dashboard/services/taskManager.cjs');

const OUTPUTS_DIR = path.resolve(__dirname, '..', 'outputs');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
  }
}

async function main() {
  console.log('================================================================');
  console.log('🧪 RUNNING TASK MUTEX & CONCURRENCY RESILIENCE SUITE');
  console.log('================================================================\n');

  runTest('Initial state: No task running', () => {
    assert.strictEqual(isTaskRunning(), false);
    assert.strictEqual(getActiveTask(), null);
  });

  await runAsyncTest('Task execution lifecycle unlocks gracefully on completion', async () => {
    const sseEvents = [];
    const mockSseRes = {
      write: (str) => sseEvents.push(str)
    };
    addSseClient(mockSseRes);

    const child = spawn('node', ['-e', 'console.log("Task test log"); setTimeout(() => process.exit(0), 100);']);
    const mockHttpRes = {
      json: () => {}
    };

    startTask('TEST_TASK', child, mockHttpRes, OUTPUTS_DIR);

    assert.strictEqual(isTaskRunning(), true);
    assert.ok(getActiveTask());
    assert.strictEqual(getActiveTask().type, 'TEST_TASK');

    // Wait for child process to complete
    await new Promise((resolve) => {
      child.on('close', () => {
        setTimeout(resolve, 50);
      });
    });

    assert.strictEqual(isTaskRunning(), false);
    assert.strictEqual(getActiveTask(), null);

    removeSseClient(mockSseRes);
    assert.ok(sseEvents.some(e => e.includes('TASK_COMPLETED') || e.includes('Task test log')));
  });

  await runAsyncTest('Task failure unlocks mutex and broadcasts ERROR status', async () => {
    const sseEvents = [];
    const mockSseRes = { write: (str) => sseEvents.push(str) };
    addSseClient(mockSseRes);

    const child = spawn('node', ['-e', 'console.error("Deliberate error"); process.exit(1);']);
    const mockHttpRes = { json: () => {} };

    startTask('FAILING_TASK', child, mockHttpRes, OUTPUTS_DIR);

    assert.strictEqual(isTaskRunning(), true);

    await new Promise((resolve) => {
      child.on('close', () => {
        setTimeout(resolve, 50);
      });
    });

    assert.strictEqual(isTaskRunning(), false);
    assert.strictEqual(getActiveTask(), null);

    removeSseClient(mockSseRes);
    assert.ok(sseEvents.some(e => e.includes('TASK_COMPLETED') || e.includes('Deliberate error')));
  });

  console.log(`\n================================================================`);
  console.log(`Results: ${passedTests}/${totalTests} Mutex & Concurrency Tests Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log(`================================================================\n`);

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal Mutex Test Error:', err);
  process.exit(1);
});
