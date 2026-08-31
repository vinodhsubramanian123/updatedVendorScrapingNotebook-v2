'use strict';
/**
 * tests/chaos/test_dashboard_sse_and_mutex_lifecycle.js
 *
 * Stresses Dashboard taskManager mutex lifecycle, child process error handling,
 * stale mutex self-healing, and SSE event broadcast contracts.
 */

const { EventEmitter } = require('events');
const {
  broadcastSSE,
  addSseClient,
  removeSseClient,
  isTaskRunning,
  getActiveTask,
  startTask,
  _setActiveTask
} = require('../../dashboard/services/taskManager.cjs');

let totalPasses = 0;
let totalFails = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    totalPasses++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    totalFails++;
  }
}

class MockChildProcess extends EventEmitter {
  constructor(pid = 12345) {
    super();
    this.pid = pid;
    this.exitCode = null;
    this.killed = false;
    this.stdout = new EventEmitter();
    this.stderr = new EventEmitter();
  }
}

class MockResponse {
  constructor() {
    this.sentData = null;
    this.writtenSse = [];
  }
  json(data) {
    this.sentData = data;
  }
  write(str) {
    this.writtenSse.push(str);
  }
}

async function runTests() {
  console.log(`================================================================`);
  console.log(`🧪 DASHBOARD SSE & MUTEX LIFECYCLE TEST SUITE`);
  console.log(`================================================================\n`);

  // Ensure clean slate
  _setActiveTask(null);

  // -------------------------------------------------------------
  // Test Group 1: Task Mutex Initial State & Acquisition
  // -------------------------------------------------------------
  console.log(`🔹 Test Group 1: Task Mutex Initial State & Acquisition`);
  assert(isTaskRunning() === false, 'isTaskRunning() reports false when no active task');
  assert(getActiveTask() === null, 'getActiveTask() returns null initially');

  const mockProc = new MockChildProcess(9999);
  const mockRes = new MockResponse();
  const mockSseClient = new MockResponse();
  addSseClient(mockSseClient);

  startTask('CHAOS_TEST_TASK', mockProc, mockRes, 'outputs');

  assert(isTaskRunning() === true, 'isTaskRunning() transitions to true upon startTask()');
  assert(getActiveTask()?.type === 'CHAOS_TEST_TASK', 'Active task metadata populated correctly');
  assert(mockRes.sentData?.pid === 9999, 'startTask() sent immediate 200/202 JSON response to client');

  // Verify SSE event broadcasted for TASK_STARTED
  const startedEvent = mockSseClient.writtenSse.find(s => s.includes('TASK_STARTED'));
  assert(startedEvent !== undefined, 'Broadcasted TASK_STARTED SSE event to connected clients');

  // -------------------------------------------------------------
  // Test Group 2: Process Error & Mutex Release
  // -------------------------------------------------------------
  console.log(`\n🔹 Test Group 2: Process Error & Mutex Immediate Release`);
  
  // Simulate child process error event
  mockProc.emit('error', new Error('Simulated spawn failure'));

  assert(isTaskRunning() === false, 'isTaskRunning() immediately resets to false on process error');
  assert(getActiveTask() === null, 'Active task cleared on process error');

  const completedErrorEvent = mockSseClient.writtenSse.find(s => s.includes('TASK_COMPLETED') && s.includes('"code":1'));
  assert(completedErrorEvent !== undefined, 'Broadcasted TASK_COMPLETED with error exit code 1');

  // -------------------------------------------------------------
  // Test Group 3: Stale Mutex Self-Healing
  // -------------------------------------------------------------
  console.log(`\n🔹 Test Group 3: Stale Mutex Self-Healing`);
  
  // Simulate an orphaned active task where the process has already exited
  const orphanedProc = new MockChildProcess(8888);
  orphanedProc.exitCode = 0; // Exited

  _setActiveTask({
    type: 'ORPHANED_TASK',
    runId: 'run_orphan_1',
    pid: 8888,
    process: orphanedProc,
    startTime: Date.now() - 5000
  });

  // isTaskRunning() should self-heal and clear the activeTask
  const runningStatus = isTaskRunning();
  assert(runningStatus === false, 'Self-heals stale mutex when underlying process has already exited');
  assert(getActiveTask() === null, 'Active task cleared automatically after detecting dead process');

  // Clean up
  removeSseClient(mockSseClient);
  _setActiveTask(null);

  console.log(`\n================================================================`);
  console.log(`📊 DASHBOARD MUTEX TEST SUMMARY: ${totalPasses} PASSED | ${totalFails} FAILED`);
  console.log(`================================================================\n`);

  if (totalFails > 0) {
    process.exit(1);
  }
}

runTests();
