'use strict';
/**
 * tests/test_dashboard_services.js
 *
 * Tests:
 * 1. Child process lifecycle (taskManager)
 * 2. Mutex locking with isTaskRunning() and 409 Conflict rejection
 * 3. SIGINT/SIGTERM process cleanup
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

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

function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.headers['content-type']?.includes('application/json')) {
            resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers });
          } else {
            resolve({ status: res.statusCode, data, headers: res.headers });
          }
        } catch (e) {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function main() {
  console.log('================================================================');
  console.log('🧪 RUNNING DASHBOARD SERVICES & LIFECYCLE SUITE');
  console.log('================================================================\n');

  await runAsyncTest('Dashboard Server - Mutex, 409 Conflict, and SIGTERM cleanup', async () => {
    const hasBuiltDist = fs.existsSync(path.join(__dirname, '../../dashboard/dist/index.html'));
    const serverProcess = spawn('node', [path.join(__dirname, '../../dashboard/server.cjs')], {
      env: { ...process.env, PORT: '3456', ...(hasBuiltDist ? { DASHBOARD_SERVE_DIST: '1' } : {}) }
    });

    let serverReady = false;
    serverProcess.stdout.on('data', (data) => {
      if (data.toString().includes('running on http://127.0.0.1:3456')) {
        serverReady = true;
      }
    });

    serverProcess.stderr.on('data', () => {});

    try {
      for (let i = 0; i < 300; i++) {
        if (serverReady) break;
        await new Promise(r => setTimeout(r, 100));
      }
      assert.ok(serverReady, 'Server failed to start in time');

      const res1 = await request('http://127.0.0.1:3456/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, { mode: 'solution' });

      assert.ok(res1.status === 200 || res1.status === 202, `First request failed with status ${res1.status}`);

      const res2 = await request('http://127.0.0.1:3456/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, { mode: 'solution' });

      assert.strictEqual(res2.status, 409, 'Second request should be rejected with 409 Conflict');
      assert.ok(res2.data.error.includes('Another task is currently running') || res2.data.message?.includes('Another task'), 'Error message should indicate task is running');

      let serverExited = false;
      serverProcess.on('exit', () => {
        serverExited = true;
      });

      serverProcess.kill('SIGTERM');

      for (let i = 0; i < 50; i++) {
        if (serverExited) break;
        await new Promise(r => setTimeout(r, 100));
      }
      assert.ok(serverExited, 'Server failed to exit after SIGTERM');
    } finally {
      if (serverProcess.exitCode === null) {
        try { serverProcess.kill('SIGKILL'); } catch (_) {}
      }
    }
  });

  console.log(`\n================================================================`);
  console.log(`Results: ${passedTests}/${totalTests} Services Tests Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log(`================================================================\n`);

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal Services Test Error:', err);
  process.exit(1);
});
