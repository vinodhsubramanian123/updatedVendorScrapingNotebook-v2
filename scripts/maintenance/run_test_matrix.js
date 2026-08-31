#!/usr/bin/env node

/**
 * run_test_matrix.js — Isolated Test Matrix & Failure Telemetry Runner
 *
 * Provides isolated subprocess execution per test suite, real-time status reporting,
 * automated failure isolation, failure telemetry ledgering (test_failure_ledger.json),
 * and instant re-testing of failed test cases without re-running the entire suite.
 *
 * Usage:
 *   node scripts/maintenance/run_test_matrix.js [options]
 *
 * Options:
 *   --failed-only, -f     Run only the tests that failed in the previous run
 *   --isolated, -i <file> Run a single isolated test file with verbose output
 *   --pattern, -p <regex> Filter tests by regular expression on relative path
 *   --bail, -b            Halt on the first test failure and isolate it immediately
 *   --verbose, -v         Stream full stdout/stderr for all tests (not just failures)
 *   --timeout, -t <ms>    Per-test execution timeout in ms (default: 60000)
 *   --list, -l            List all discovered test suites without running them
 *   --help, -h            Show this help message
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { safeWriteJsonAtomic } = require('../lib/system/fs_compat');

const ROOT_DIR = path.resolve(__dirname, '../../');
const OUTPUTS_DIR = path.join(ROOT_DIR, 'outputs/history');
const FAILURE_LEDGER_PATH = path.join(OUTPUTS_DIR, 'test_failure_ledger.json');

// Canonical ordered test suites for deterministic execution
const ORDERED_TEST_DIRECTORIES = ['tests/unit', 'tests/chaos', 'tests/integration', 'tests/e2e'];

/**
 * Parses CLI arguments into structured configuration.
 */
function parseArgs(args) {
  const config = {
    failedOnly: false,
    isolatedFile: null,
    pattern: null,
    bail: false,
    verbose: false,
    timeoutMs: 60000,
    listOnly: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--failed-only' || arg === '-f') {
      config.failedOnly = true;
    } else if (arg === '--isolated' || arg === '-i') {
      config.isolatedFile = args[++i];
    } else if (arg === '--pattern' || arg === '-p') {
      config.pattern = args[++i];
    } else if (arg === '--bail' || arg === '-b') {
      config.bail = true;
    } else if (arg === '--verbose' || arg === '-v') {
      config.verbose = true;
    } else if (arg === '--list' || arg === '-l') {
      config.listOnly = true;
    } else if (arg === '--timeout' || arg === '-t') {
      config.timeoutMs = parseInt(args[++i], 10) || 60000;
    } else if (arg === '--help' || arg === '-h') {
      config.help = true;
    } else if (!arg.startsWith('-') && !config.isolatedFile) {
      config.isolatedFile = arg;
    }
  }

  return config;
}

/**
 * Discovers all test files across standard directories recursively.
 */
function discoverTests(rootDir) {
  const testFiles = [];

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile() && (entry.name.startsWith('test_') || entry.name.endsWith('.test.js') || entry.name.endsWith('.spec.js')) && entry.name.endsWith('.js')) {
        testFiles.push(path.relative(rootDir, fullPath));
      }
    }
  }

  for (const subDir of ORDERED_TEST_DIRECTORIES) {
    scanDir(path.join(rootDir, subDir));
  }

  // Also include verify_all.js if exists
  const verifyAllPath = 'tests/integration/verify_all.js';
  if (fs.existsSync(path.join(rootDir, verifyAllPath)) && !testFiles.includes(verifyAllPath)) {
    testFiles.push(verifyAllPath);
  }

  return testFiles.sort();
}

/**
 * Reads the previous failure ledger.
 */
function loadFailureLedger() {
  if (fs.existsSync(FAILURE_LEDGER_PATH)) {
    try {
      const raw = fs.readFileSync(FAILURE_LEDGER_PATH, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return { lastRun: null, failures: [] };
    }
  }
  return { lastRun: null, failures: [] };
}

/**
 * Saves failures into the failure ledger.
 */
function saveFailureLedger(failures, totalRun, totalPassed, totalDurationMs) {
  const payload = {
    lastRun: new Date().toISOString(),
    totalRun,
    totalPassed,
    totalFailed: failures.length,
    totalDurationMs,
    failures: failures.map(f => ({
      testFile: f.testFile,
      durationMs: f.durationMs,
      exitCode: f.exitCode,
      errorSummary: f.errorSummary,
      rerunCommand: `node ${f.testFile}`,
      isolatedTestCommand: `npm run test:isolated -- ${f.testFile}`,
      timestamp: f.timestamp
    }))
  };

  safeWriteJsonAtomic(FAILURE_LEDGER_PATH, payload);
}

/**
 * Determines whether a test file uses the built-in Node test runner (--test).
 */
function shouldUseNodeTestRunner(filePath, rootDir) {
  const fullPath = path.join(rootDir, filePath);
  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    return content.includes("from 'node:test'") ||
           content.includes("from \"node:test\"") ||
           content.includes("require('node:test')") ||
           content.includes("require(\"node:test\")") ||
           content.includes("require('test')");
  } catch {
    return false;
  }
}

/**
 * Executes a single test in an isolated child process.
 */
function runSingleTest(testFile, rootDir, timeoutMs, verbose) {
  return new Promise((resolve) => {
    const isNodeTest = shouldUseNodeTestRunner(testFile, rootDir);
    const args = isNodeTest ? ['--test', testFile] : [testFile];
    const startTime = Date.now();

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const effectiveTimeoutMs = (testFile.includes('tests/e2e/') || testFile.includes('verify_all'))
      ? Math.max(timeoutMs, 180000)
      : timeoutMs;

    const child = spawn(process.execPath, args, {
      cwd: rootDir,
      env: { ...process.env, FORCE_COLOR: '1' }
    });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, effectiveTimeoutMs);

    child.stdout.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;
      if (verbose) process.stdout.write(chunk);
    });

    child.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;
      if (verbose) process.stderr.write(chunk);
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      const durationMs = Date.now() - startTime;
      const pass = code === 0 && !timedOut;

      let errorSummary = '';
      if (!pass) {
        if (timedOut) {
          errorSummary = `Execution timed out after ${timeoutMs}ms`;
        } else {
          // Extract relevant failure lines
          const allOutput = stderr + '\n' + stdout;
          const lines = allOutput.split('\n');
          const errorLines = lines.filter(l =>
            l.includes('AssertionError') ||
            l.includes('Error:') ||
            l.includes('❌') ||
            l.includes('FAIL') ||
            l.includes('stack') ||
            l.includes('at ')
          );
          errorSummary = (errorLines.length > 0 ? errorLines.slice(0, 15).join('\n') : lines.slice(-20).join('\n')).trim();
        }
      }

      resolve({
        testFile,
        pass,
        exitCode: timedOut ? 124 : code,
        durationMs,
        stdout,
        stderr,
        errorSummary,
        timestamp: new Date().toISOString()
      });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      const durationMs = Date.now() - startTime;
      resolve({
        testFile,
        pass: false,
        exitCode: 1,
        durationMs,
        stdout,
        stderr: err.message,
        errorSummary: err.message,
        timestamp: new Date().toISOString()
      });
    });
  });
}

/**
 * Main execution coordinator.
 */
async function main() {
  const args = process.argv.slice(2);
  const config = parseArgs(args);

  if (config.help) {
    console.log(`
================================================================
🧪 ISOLATED TEST MATRIX & FAILURE TELEMETRY RUNNER
================================================================

Usage:
  node scripts/maintenance/run_test_matrix.js [options]

Options:
  --failed-only, -f       Run only test suites that failed in the previous run
  --isolated, -i <file>   Run a single test file in isolation with full verbosity
  --pattern, -p <regex>   Filter tests by regular expression match
  --bail, -b              Stop at the first failure and isolate it immediately
  --verbose, -v           Stream full test output for all test suites
  --timeout, -t <ms>      Timeout per test in milliseconds (default: 60000)
  --list, -l              List all discovered test suites
  --help, -h              Show this help message

NPM Script Equivalents:
  npm run test:all        Run the entire verified test matrix
  npm run test:failed     Re-test ONLY previously failing tests
  npm run test:isolated -- tests/unit/test_example.js
`);
    process.exit(0);
  }

  console.log(`\n================================================================`);
  console.log(`🧪 ISOLATED TEST MATRIX & FAILURE TELEMETRY HARNESS`);
  console.log(`================================================================\n`);

  let targetTests = [];

  if (config.isolatedFile) {
    let relPath = path.isAbsolute(config.isolatedFile)
      ? path.relative(ROOT_DIR, config.isolatedFile)
      : config.isolatedFile;
    if (!fs.existsSync(path.join(ROOT_DIR, relPath))) {
      console.error(`❌ Specified test file does not exist: ${relPath}`);
      process.exit(1);
    }
    targetTests = [relPath];
    config.verbose = true; // Always verbose in isolated mode
    console.log(`🎯 Running in ISOLATED TEST MODE: ${relPath}\n`);
  } else if (config.failedOnly) {
    const ledger = loadFailureLedger();
    const failedFiles = (ledger.failures || []).map(f => f.testFile);
    if (failedFiles.length === 0) {
      console.log(`✨ No previous failures found in ledger (${FAILURE_LEDGER_PATH}). Everything is clean!`);
      process.exit(0);
    }
    targetTests = failedFiles.filter(f => fs.existsSync(path.join(ROOT_DIR, f)));
    console.log(`🔄 Running in FAILED-ONLY ISOLATION MODE: ${targetTests.length} suite(s) to re-test\n`);
  } else {
    targetTests = discoverTests(ROOT_DIR);
    if (config.pattern) {
      const reg = new RegExp(config.pattern, 'i');
      targetTests = targetTests.filter(t => reg.test(t));
      console.log(`🔍 Filtered by pattern "${config.pattern}": ${targetTests.length} suite(s) found\n`);
    } else {
      console.log(`📁 Discovered ${targetTests.length} test suite(s) across unit, chaos, integration, and e2e tiers\n`);
    }
  }

  if (config.listOnly) {
    console.log('📋 Discovered Test Suites:');
    targetTests.forEach((t, i) => console.log(`  [${(i + 1).toString().padStart(2)}] ${t}`));
    process.exit(0);
  }

  if (targetTests.length === 0) {
    console.log('⚠️ No matching test suites found.');
    process.exit(0);
  }

  const results = [];
  const failures = [];
  const overallStart = Date.now();

  console.log(`----------------------------------------------------------------`);
  console.log(`  #   STATUS   DURATION   TEST SUITE`);
  console.log(`----------------------------------------------------------------`);

  for (let i = 0; i < targetTests.length; i++) {
    const testFile = targetTests[i];
    const indexStr = (i + 1).toString().padStart(3);

    process.stdout.write(`[${indexStr}]  RUNNING   ...        ${testFile}\r`);

    const result = await runSingleTest(testFile, ROOT_DIR, config.timeoutMs, config.verbose);
    results.push(result);

    const durStr = `${(result.durationMs / 1000).toFixed(2)}s`.padStart(7);

    if (result.pass) {
      console.log(`[${indexStr}]  ✅ PASS   ${durStr}   ${testFile}`);
    } else {
      failures.push(result);
      console.log(`[${indexStr}]  ❌ FAIL   ${durStr}   ${testFile}`);

      // If not in verbose mode, print the failure snippet immediately for quick inspection
      if (!config.verbose) {
        console.log(`\n  ┌──────────────────────────────────────────────────────────┐`);
        console.log(`  │ ⚠️  FAILURE ISOLATION & DIAGNOSTIC TRACE                 │`);
        console.log(`  ├──────────────────────────────────────────────────────────┤`);
        console.log(`  │ Test File: ${testFile}`);
        console.log(`  │ Exit Code: ${result.exitCode}`);
        console.log(`  │ Duration:  ${result.durationMs}ms`);
        console.log(`  │ Re-run:    node ${testFile}`);
        console.log(`  │ Isolated:  npm run test:isolated -- ${testFile}`);
        console.log(`  └──────────────────────────────────────────────────────────┘`);
        if (result.errorSummary) {
          console.log(`\n  📋 Error Diagnostics:\n`);
          const indented = result.errorSummary.split('\n').map(l => `    ${l}`).join('\n');
          console.log(indented);
          console.log(`\n----------------------------------------------------------------\n`);
        }
      }

      if (config.bail) {
        console.log(`\n🛑 --bail specified: Aborting matrix execution on first failure.`);
        break;
      }
    }
  }

  const totalDurationMs = Date.now() - overallStart;
  const passedCount = results.filter(r => r.pass).length;
  const failedCount = failures.length;

  console.log(`\n================================================================`);
  console.log(`📊 TEST MATRIX EXECUTION SUMMARY`);
  console.log(`================================================================`);
  console.log(`  Total Suites:   ${results.length}`);
  console.log(`  Passed:         ${passedCount} ✅`);
  console.log(`  Failed:         ${failedCount} ${failedCount > 0 ? '❌' : ''}`);
  console.log(`  Pass Rate:      ${((passedCount / results.length) * 100).toFixed(1)}%`);
  console.log(`  Total Time:     ${(totalDurationMs / 1000).toFixed(2)}s`);

  // Slowest test suites
  const sortedByTime = [...results].sort((a, b) => b.durationMs - a.durationMs).slice(0, 5);
  console.log(`\n⏱️  Slowest Test Suites:`);
  sortedByTime.forEach(s => {
    console.log(`  • ${(s.durationMs / 1000).toFixed(2)}s — ${s.testFile}`);
  });

  // Update failure ledger
  saveFailureLedger(failures, results.length, passedCount, totalDurationMs);

  if (failedCount > 0) {
    console.log(`\n💾 Saved ${failedCount} failure record(s) to:`);
    console.log(`   ${FAILURE_LEDGER_PATH}`);
    console.log(`\n💡 To re-test ONLY the failing suite(s) after fixing:`);
    console.log(`   npm run test:failed`);
    console.log(`================================================================\n`);
    process.exit(1);
  } else {
    console.log(`\n✨ All test suites passed! Failure ledger is clear.`);
    console.log(`================================================================\n`);
    process.exit(0);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal Test Matrix Error:', err);
    process.exit(1);
  });
}

module.exports = {
  discoverTests,
  parseArgs,
  runSingleTest,
  loadFailureLedger,
  saveFailureLedger
};
