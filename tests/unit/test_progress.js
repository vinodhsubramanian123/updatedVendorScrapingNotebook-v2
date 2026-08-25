'use strict';

const assert = require('assert');
const { emitProgress, emitLog, emitResult } = require('../../scripts/lib/system/progress.js');

async function runTests() {
  console.log('🧪 Starting Progress Event Emitter Tests...\n');

  const originalStdoutWrite = process.stdout.write;
  const originalConsoleLog = console.log;
  const originalIsTTY = process.stdout.isTTY;
  const originalEnv = process.env.STRUCTURED_PROGRESS;

  let stdoutData = '';
  let consoleData = '';

  process.stdout.write = (data) => {
    stdoutData += data;
  };

  console.log = (data) => {
    consoleData += data + '\n';
  };

  const resetMocks = () => {
    stdoutData = '';
    consoleData = '';
    delete process.env.STRUCTURED_PROGRESS;
    process.stdout.isTTY = originalIsTTY;
  };

  try {
    // 1. Test emitProgress - Non-structured, TTY
    originalConsoleLog('▶ Test 1: emitProgress (Non-structured, TTY)');
    resetMocks();
    process.stdout.isTTY = true;
    emitProgress(5, 10, 'Processing', 'in_progress', 'Details here');
    assert.ok(consoleData.includes('⏳ [█████░░░░░]  50% (Step 5/10) Processing — Details here'));
    assert.strictEqual(stdoutData, '');

    // 2. Test emitProgress - Non-structured, non-TTY
    originalConsoleLog('▶ Test 2: emitProgress (Non-structured, non-TTY)');
    resetMocks();
    process.stdout.isTTY = false;
    emitProgress(10, 10, 'Completed', 'completed', 'All done');
    assert.ok(consoleData.includes('✅ Step 10/10 (100%): Completed — All done'));
    assert.strictEqual(stdoutData, '');

    // 3. Test emitProgress - Structured
    originalConsoleLog('▶ Test 3: emitProgress (Structured)');
    resetMocks();
    process.env.STRUCTURED_PROGRESS = '1';
    emitProgress(1, 4, 'Init', 'started', '', { category: 'Test', sku: '123' });
    let parsed = JSON.parse(stdoutData.trim());
    assert.strictEqual(parsed.type, 'progress');
    assert.strictEqual(parsed.step, 1);
    assert.strictEqual(parsed.total, 4);
    assert.strictEqual(parsed.percent, 25);
    assert.strictEqual(parsed.status, 'started');
    assert.strictEqual(parsed.category, 'Test');
    assert.strictEqual(parsed.sku, '123');
    assert.strictEqual(consoleData, '');

    // 4. Test emitLog - Non-structured
    originalConsoleLog('▶ Test 4: emitLog (Non-structured)');
    resetMocks();
    emitLog('error', 'Something failed');
    assert.ok(consoleData.includes('❌ Something failed'));

    // 5. Test emitLog - Structured
    originalConsoleLog('▶ Test 5: emitLog (Structured)');
    resetMocks();
    process.env.STRUCTURED_PROGRESS = '1';
    emitLog('info', 'System ready', { foo: 'bar' });
    parsed = JSON.parse(stdoutData.trim());
    assert.strictEqual(parsed.type, 'log');
    assert.strictEqual(parsed.level, 'info');
    assert.strictEqual(parsed.message, 'System ready');
    assert.deepStrictEqual(parsed.data, { foo: 'bar' });

    // 6. Test emitResult - Structured
    originalConsoleLog('▶ Test 6: emitResult (Structured)');
    resetMocks();
    process.env.STRUCTURED_PROGRESS = '1';
    emitResult('SUCCESS', { result: 42 });
    parsed = JSON.parse(stdoutData.trim());
    assert.strictEqual(parsed.type, 'result');
    assert.strictEqual(parsed.status, 'SUCCESS');
    assert.deepStrictEqual(parsed.data, { result: 42 });

    // 7. Test emitResult - Non-structured
    originalConsoleLog('▶ Test 7: emitResult (Non-structured)');
    resetMocks();
    emitResult('SUCCESS', { result: 42 });
    assert.strictEqual(stdoutData, '');
    assert.strictEqual(consoleData, '');

  } catch (error) {
    process.stdout.write = originalStdoutWrite;
    console.log = originalConsoleLog;
    process.stdout.isTTY = originalIsTTY;
    if (originalEnv !== undefined) {
      process.env.STRUCTURED_PROGRESS = originalEnv;
    } else {
      delete process.env.STRUCTURED_PROGRESS;
    }
    throw error;
  }

  process.stdout.write = originalStdoutWrite;
  console.log = originalConsoleLog;
  process.stdout.isTTY = originalIsTTY;
  if (originalEnv !== undefined) {
    process.env.STRUCTURED_PROGRESS = originalEnv;
  } else {
    delete process.env.STRUCTURED_PROGRESS;
  }

  console.log('\n🎉 ALL PROGRESS EMITTER TESTS PASSED (100%)!');
}

runTests().catch(err => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
