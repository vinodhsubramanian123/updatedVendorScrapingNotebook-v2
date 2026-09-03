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

// Canonical test tiers and their domain descriptions
const TIER_METADATA = {
  unit: {
    id: 'unit',
    name: 'Unit Tests',
    dir: 'tests/unit',
    icon: '📦',
    description: 'Deterministic physical aspect checks, schemas, parsers, rotator, and preprocessors'
  },
  chaos: {
    id: 'chaos',
    name: 'Chaos & Fault Injection',
    dir: 'tests/chaos',
    icon: '⚡',
    description: 'Adversarial fuzzing, race conditions, memory stress, mutexes, and crash recovery'
  },
  integration: {
    id: 'integration',
    name: 'Integration & Portfolio Certification',
    dir: 'tests/integration',
    icon: '🔗',
    description: 'BOM verification, conflict graphs, cross-gen diffs, Excel tallies, and portfolio audits'
  },
  e2e: {
    id: 'e2e',
    name: 'End-to-End & Browser Workflows',
    dir: 'tests/e2e',
    icon: '🌐',
    description: 'Headless browser UI workflows, download validations, and live CLIC pipelines'
  }
};

const ORDERED_TIER_KEYS = ['unit', 'chaos', 'integration', 'e2e'];

/**
 * Maps a test file path to its canonical tier key.
 */
function getTestTier(testFile) {
  const norm = testFile.replace(/\\/g, '/');
  if (norm.startsWith('tests/unit/')) return 'unit';
  if (norm.startsWith('tests/chaos/')) return 'chaos';
  if (norm.startsWith('tests/integration/') || norm.includes('verify_all.js')) return 'integration';
  if (norm.startsWith('tests/e2e/')) return 'e2e';
  return 'other';
}

/**
 * Parses CLI arguments into structured configuration.
 */
function parseArgs(args) {
  const config = {
    failedOnly: false,
    isolatedFile: null,
    pattern: null,
    tier: null,
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
    } else if (arg === '--tier' || arg === '-T') {
      config.tier = (args[++i] || '').toLowerCase();
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
 * Discovers test files grouped deterministically by tier.
 */
function discoverTests(rootDir, tierFilter = null) {
  const tierMap = {
    unit: [],
    chaos: [],
    integration: [],
    e2e: []
  };

  function scanDir(dir, tierKey) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath, tierKey);
      } else if (entry.isFile() && (entry.name.startsWith('test_') || entry.name.endsWith('.test.js') || entry.name.endsWith('.spec.js')) && entry.name.endsWith('.js')) {
        tierMap[tierKey].push(path.relative(rootDir, fullPath).replace(/\\/g, '/'));
      }
    }
  }

  for (const key of ORDERED_TIER_KEYS) {
    scanDir(path.join(rootDir, TIER_METADATA[key].dir), key);
  }

  // Also include verify_all.js in integration tier if exists
  const verifyAllPath = 'tests/integration/verify_all.js';
  if (fs.existsSync(path.join(rootDir, verifyAllPath)) && !tierMap.integration.includes(verifyAllPath)) {
    tierMap.integration.push(verifyAllPath);
  }

  // Sort within each tier alphabetically for deterministic ordering
  for (const key of ORDERED_TIER_KEYS) {
    tierMap[key].sort();
  }

  // Resolve tier filtering
  if (tierFilter) {
    const f = tierFilter.toLowerCase();
    if (f === 'fast' || f === 'quick') {
      return [...tierMap.unit, ...tierMap.chaos, ...tierMap.integration];
    }
    if (f === 'unit' || f === 'u') return tierMap.unit;
    if (f === 'chaos' || f === 'c') return tierMap.chaos;
    if (f === 'integration' || f === 'i') return tierMap.integration;
    if (f === 'e2e' || f === 'e') return tierMap.e2e;
  }

  return [
    ...tierMap.unit,
    ...tierMap.chaos,
    ...tierMap.integration,
    ...tierMap.e2e
  ];
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
  --tier, -T <name>       Filter by tier: unit, chaos, integration, e2e, fast (or quick)
  --failed-only, -f       Run only test suites that failed in the previous run
  --isolated, -i <file>   Run a single test file in isolation with full verbosity
  --pattern, -p <regex>   Filter tests by regular expression match
  --bail, -b              Stop at the first failure and isolate it immediately
  --verbose, -v           Stream full test output for all test suites
  --timeout, -t <ms>      Timeout per test in milliseconds (default: 60000)
  --list, -l              List all discovered test suites
  --help, -h              Show this help message

NPM Script Equivalents:
  npm test                Run fast deterministic test tiers (unit + chaos + integration)
  npm run test:fast       Run fast deterministic test tiers (unit + chaos + integration)
  npm run test:unit       Run ONLY pure unit tests (aspect math, schemas, parser)
  npm run test:chaos      Run ONLY chaos & fault injection tests
  npm run test:integration Run ONLY integration & portfolio certification tests
  npm run test:e2e        Run ONLY end-to-end browser & live CLIC tests
  npm run test:all        Run the entire 4-tier verified test matrix
  npm run test:failed     Re-test ONLY previously failing tests
  npm run test:isolated -- tests/unit/test_example.js
`);
    process.exit(0);
  }

  console.log(`\n================================================================`);
  console.log(`🧪 ISOLATED TEST MATRIX & TIERED TELEMETRY HARNESS`);
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
    targetTests = discoverTests(ROOT_DIR, config.tier);
    if (config.pattern) {
      const reg = new RegExp(config.pattern, 'i');
      targetTests = targetTests.filter(t => reg.test(t));
      console.log(`🔍 Filtered by pattern "${config.pattern}": ${targetTests.length} suite(s) found\n`);
    } else if (config.tier) {
      console.log(`🎯 Filtered by tier "${config.tier.toUpperCase()}": ${targetTests.length} suite(s) found\n`);
    } else {
      console.log(`📁 Discovered ${targetTests.length} test suite(s) across unit, chaos, integration, and e2e tiers\n`);
    }
  }

  if (config.listOnly) {
    console.log('📋 Discovered Test Suites:');
    targetTests.forEach((t, i) => console.log(`  [${(i + 1).toString().padStart(2)}] [${getTestTier(t).toUpperCase()}] ${t}`));
    process.exit(0);
  }

  if (targetTests.length === 0) {
    console.log('⚠️ No matching test suites found.');
    process.exit(0);
  }

  const results = [];
  const failures = [];
  const overallStart = Date.now();

  const tierStats = {
    unit: { total: 0, passed: 0, failed: 0, durationMs: 0 },
    chaos: { total: 0, passed: 0, failed: 0, durationMs: 0 },
    integration: { total: 0, passed: 0, failed: 0, durationMs: 0 },
    e2e: { total: 0, passed: 0, failed: 0, durationMs: 0 },
    other: { total: 0, passed: 0, failed: 0, durationMs: 0 }
  };

  let currentTier = null;

  for (let i = 0; i < targetTests.length; i++) {
    const testFile = targetTests[i];
    const tier = getTestTier(testFile);
    const meta = TIER_METADATA[tier];

    // Print tier divider banner when transitioning
    if (tier !== currentTier && meta) {
      currentTier = tier;
      const countInTier = targetTests.filter(t => getTestTier(t) === tier).length;
      console.log(`\n================================================================`);
      console.log(`${meta.icon} TIER: ${meta.name.toUpperCase()} (${meta.dir}) — [${countInTier} Suites]`);
      console.log(`   ${meta.description}`);
      console.log(`----------------------------------------------------------------`);
      console.log(`  #   STATUS   DURATION   TEST SUITE`);
      console.log(`----------------------------------------------------------------`);
    } else if (tier !== currentTier && !meta) {
      currentTier = tier;
      console.log(`\n----------------------------------------------------------------`);
      console.log(`  #   STATUS   DURATION   TEST SUITE`);
      console.log(`----------------------------------------------------------------`);
    }

    const indexStr = (i + 1).toString().padStart(3);
    process.stdout.write(`[${indexStr}]  RUNNING   ...        ${testFile}\r`);

    const result = await runSingleTest(testFile, ROOT_DIR, config.timeoutMs, config.verbose);
    results.push(result);

    tierStats[tier].total++;
    tierStats[tier].durationMs += result.durationMs;

    const durStr = `${(result.durationMs / 1000).toFixed(2)}s`.padStart(7);

    if (result.pass) {
      tierStats[tier].passed++;
      console.log(`[${indexStr}]  ✅ PASS   ${durStr}   ${testFile}`);
    } else {
      tierStats[tier].failed++;
      failures.push(result);
      console.log(`[${indexStr}]  ❌ FAIL   ${durStr}   ${testFile}`);

      // If not in verbose mode, print the failure snippet immediately for quick inspection
      if (!config.verbose) {
        console.log(`\n  ┌──────────────────────────────────────────────────────────┐`);
        console.log(`  │ ⚠️  FAILURE ISOLATION & DIAGNOSTIC TRACE                 │`);
        console.log(`  ├──────────────────────────────────────────────────────────┤`);
        console.log(`  │ Test File: ${testFile}`);
        console.log(`  │ Tier:      ${tier.toUpperCase()}`);
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
  console.log(`📊 TEST MATRIX TIERED EXECUTION SUMMARY`);
  console.log(`================================================================`);

  for (const key of ORDERED_TIER_KEYS) {
    const st = tierStats[key];
    if (st.total > 0) {
      const meta = TIER_METADATA[key];
      const rate = ((st.passed / st.total) * 100).toFixed(1);
      const timeStr = `${(st.durationMs / 1000).toFixed(2)}s`.padStart(7);
      const icon = st.failed === 0 ? '✅' : '❌';
      console.log(`  ${meta.icon} ${meta.name.padEnd(38)}: ${st.passed}/${st.total} PASSED (${rate}%) ${icon}  ⏱️ ${timeStr}`);
    }
  }

  console.log(`----------------------------------------------------------------`);
  console.log(`  Total Suites:   ${results.length}`);
  console.log(`  Passed:         ${passedCount} ✅`);
  console.log(`  Failed:         ${failedCount} ${failedCount > 0 ? '❌' : ''}`);
  console.log(`  Pass Rate:      ${((passedCount / results.length) * 100).toFixed(1)}%`);
  console.log(`  Total Time:     ${(totalDurationMs / 1000).toFixed(2)}s`);

  // Slowest test suites
  const sortedByTime = [...results].sort((a, b) => b.durationMs - a.durationMs).slice(0, 5);
  console.log(`\n⏱️  Slowest Test Suites:`);
  sortedByTime.forEach(s => {
    console.log(`  • ${(s.durationMs / 1000).toFixed(2)}s — [${getTestTier(s.testFile).toUpperCase()}] ${s.testFile}`);
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
