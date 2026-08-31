const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const {
  discoverTests,
  parseArgs,
  runSingleTest,
  loadFailureLedger,
  saveFailureLedger
} = require('../../scripts/maintenance/run_test_matrix');

const ROOT_DIR = path.resolve(__dirname, '../../');

test('Isolated Test Runner — Dynamic Discovery', () => {
  const tests = discoverTests(ROOT_DIR);
  assert.ok(Array.isArray(tests), 'Tests should be returned as an array');
  assert.ok(tests.length >= 40, `Should discover >= 40 test suites across repository (found ${tests.length})`);
  assert.ok(tests.some(t => t.includes('test_incremental_checksum.js')), 'Should discover unit tests');
  assert.ok(tests.some(t => t.includes('test_failure_modes_and_chaos.js')), 'Should discover chaos tests');
  assert.ok(tests.some(t => t.includes('test_end_to_end_scenarios.js')), 'Should discover integration tests');
});

test('Isolated Test Runner — CLI Argument Parsing', () => {
  const cfg1 = parseArgs(['--failed-only']);
  assert.strictEqual(cfg1.failedOnly, true);

  const cfg2 = parseArgs(['-i', 'tests/unit/test_gemini_rotator.js']);
  assert.strictEqual(cfg2.isolatedFile, 'tests/unit/test_gemini_rotator.js');

  const cfg3 = parseArgs(['--pattern', 'aspect.*cross', '--bail', '--timeout', '15000']);
  assert.strictEqual(cfg3.pattern, 'aspect.*cross');
  assert.strictEqual(cfg3.bail, true);
  assert.strictEqual(cfg3.timeoutMs, 15000);
});

test('Isolated Test Runner — Single Test Subprocess Execution & Telemetry', async () => {
  const result = await runSingleTest('tests/unit/test_incremental_checksum.js', ROOT_DIR, 30000, false);
  assert.strictEqual(result.pass, true, 'Checksum test should pass in isolated execution');
  assert.strictEqual(result.exitCode, 0, 'Exit code should be 0');
  assert.ok(typeof result.durationMs === 'number' && result.durationMs > 0, 'Duration should be a positive number');
  assert.ok(result.stdout.length > 0, 'Stdout should be captured');
  assert.strictEqual(result.testFile, 'tests/unit/test_incremental_checksum.js');
});

test('Isolated Test Runner — Failure Ledger Persistence & Rerun Commands', () => {
  const mockFailures = [
    {
      testFile: 'tests/unit/test_synthetic_fail.js',
      durationMs: 1240,
      exitCode: 1,
      errorSummary: 'AssertionError: Expected 1 to equal 2',
      timestamp: new Date().toISOString()
    }
  ];

  saveFailureLedger(mockFailures, 10, 9, 5000);

  const ledger = loadFailureLedger();
  assert.strictEqual(ledger.totalFailed, 1);
  assert.strictEqual(ledger.failures[0].testFile, 'tests/unit/test_synthetic_fail.js');
  assert.strictEqual(ledger.failures[0].rerunCommand, 'node tests/unit/test_synthetic_fail.js');
  assert.strictEqual(ledger.failures[0].isolatedTestCommand, 'npm run test:isolated -- tests/unit/test_synthetic_fail.js');

  // Clean up mock ledger
  saveFailureLedger([], 10, 10, 5000);
  const cleanLedger = loadFailureLedger();
  assert.strictEqual(cleanLedger.totalFailed, 0);
  assert.strictEqual(cleanLedger.failures.length, 0);
});
