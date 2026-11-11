'use strict';
/**
 * tests/integration/test_dashboard_workflow_reliability.js
 *
 * Verifies the Codex audit remediation & Phase 1 reliability fixes:
 * 1. Local-only policy preservation: inputDescriptor contains offline: true
 * 2. Run state concurrency isolation: Run A results do not overwrite Run B
 * 3. Intake preservation: temporary input file is retained across process termination for clarification replay
 * 4. Run snapshot history structure
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');

let passedTests = 0;
let totalTests = 0;

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
        } catch (_) {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    const payload = body || options.body;
    if (payload) {
      req.write(typeof payload === 'string' ? payload : JSON.stringify(payload));
    }
    req.end();
  });
}

function verifyLateRunEvents() {
  const { captureEvent, getRunSnapshot } = require('../../dashboard/services/runState.cjs');
  const start = runId => captureEvent({ type: 'TASK_STARTED', task: 'EVAL_BOQ', runId });
  const finish = runId => captureEvent({ type: 'TASK_COMPLETED', task: 'EVAL_BOQ', runId, code: 0 });
  start('earlier');
  finish('earlier');
  start('latest');
  finish('latest');
  captureEvent({ type: 'EVAL_RESULT', runId: 'latest' });
  const update = captureEvent({ type: 'EVAL_RESULT_UPDATED', runId: 'earlier' });
  captureEvent({ type: 'LOG', runId: 'earlier', text: 'Late output' });
  const snapshot = getRunSnapshot();
  assert.equal(snapshot.activeTask, null);
  assert.equal(snapshot.latestTask.runId, 'latest');
  assert.equal(snapshot.latestTask.status, 'COMPLETED');
  assert.equal(snapshot.latestResult.runId, 'latest');
  assert.equal(update.historical, true);
  assert.equal(snapshot.logs.length, 0);
  assert.equal(snapshot.runsHistory.find(run => run.runId === 'earlier').logs.length, 1);
}

async function main() {
  process.env.NODE_ENV = 'test';
  console.log('================================================================');
  console.log('🧪 RUNNING DASHBOARD WORKFLOW RELIABILITY & RUN ISOLATION SUITE');
  console.log('================================================================\n');

  const TEST_PORT = '3499';
  const tmpRunsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-reliability-runs-'));
  const serverProcess = spawn('node', [path.join(__dirname, '../../dashboard/server.cjs')], {
    env: {
      ...process.env,
      PORT: TEST_PORT,
      NODE_ENV: 'test',
      DASHBOARD_SERVE_DIST: '1',
      DASHBOARD_RUNS_DIR: tmpRunsDir
    }
  });

  let serverReady = false;
  serverProcess.stdout.on('data', (data) => {
    if (data.toString().includes(`running on http://127.0.0.1:${TEST_PORT}`)) {
      serverReady = true;
    }
  });

  for (let i = 0; i < 150; i++) {
    if (serverReady) break;
    await new Promise(r => setTimeout(r, 100));
  }
  if (!serverReady) {
    console.error('Server failed to start in time');
    serverProcess.kill('SIGKILL');
    process.exit(1);
  }

  try {
    await runAsyncTest('Reliability - Late events preserve the latest completed run', verifyLateRunEvents);
    await runAsyncTest('Reliability - Run state snapshot initial schema', async () => {
      const res = await request(`http://127.0.0.1:${TEST_PORT}/api/run-snapshot`, { method: 'GET' });
      assert.strictEqual(res.status, 200);
      assert.ok('activeTask' in res.data, 'snapshot should contain activeTask');
      assert.ok('latestResult' in res.data, 'snapshot should contain latestResult');
      assert.ok('runsHistory' in res.data, 'snapshot should contain runsHistory');
      assert.ok(Array.isArray(res.data.runsHistory), 'runsHistory should be an array');
    });

    let completedEvalRunId = null;
    await runAsyncTest('Reliability - Offline evaluation reaches a result for the selected catalog', async () => {
      const sampleText = '1x P73282-B21 HPE ProLiant DL380 Gen12 8SFF Server\n2x P74845-B21 Intel Xeon Gold 6530';
      const registry = await request(`http://127.0.0.1:${TEST_PORT}/api/available-catalogs`);
      const product = registry.data.catalogs.find(catalog => catalog.id === 'DL380_Gen12');
      assert.ok(product?.chassisDir, 'DL380 Gen12 requires a registered catalog directory');
      const evalRes = await request(`http://127.0.0.1:${TEST_PORT}/api/eval-boq`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, { rawText: sampleText, chassisDir: product.chassisDir, offline: true });

      assert.strictEqual(evalRes.status, 202);
      assert.ok(evalRes.data.runId, 'Evaluation response should return runId');
      completedEvalRunId = evalRes.data.runId;
      assert.strictEqual(evalRes.data.status, 'ACCEPTED');

      // Wait a moment for runState to capture task
      await new Promise(r => setTimeout(r, 200));
      const snapRes = await request(`http://127.0.0.1:${TEST_PORT}/api/run-snapshot`, { method: 'GET' });
      assert.strictEqual(snapRes.status, 200);
      if (snapRes.data.activeTask) {
        assert.strictEqual(snapRes.data.activeTask.product, 'DL380_Gen12');
      }

      let result;
      const deadline = Date.now() + 90000;
      while (Date.now() < deadline) {
        const check = await request(`http://127.0.0.1:${TEST_PORT}/api/run-snapshot`, { method: 'GET' });
        result = check.data.latestResult;
        if (result?.runId === evalRes.data.runId) break;
        await new Promise(r => setTimeout(r, 200));
      }
      assert.equal(result?.runId, evalRes.data.runId, 'The requested run must publish a terminal result');
      assert.equal(result.inputDescriptor?.offline, true);
      assert.ok(['SUCCESS', 'ACTION_REQUIRED'].includes(result.data?.status), result.error?.error || 'Expected an evaluated outcome');
    });

    await runAsyncTest('Reliability - Query classification returns human-friendly rationale', async () => {
      const res = await request(`http://127.0.0.1:${TEST_PORT}/api/query/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, { query: 'We need 4 nodes of DL380 Gen12 with 64 cores each and 512GB RAM' });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.intent, 'RFP_SIZING_TO_BOM');
      assert.ok(res.data.rationale, 'Classification should include human rationale');
      assert.ok(res.data.confidence >= 0.8, 'Confidence should be high for clear sizing');
    });

    let queryRunId = null;
    await runAsyncTest('Reliability - Query route executes with runId scoping', async () => {
      // Clear any prior active task
      await request(`http://127.0.0.1:${TEST_PORT}/api/kill-task`, { method: 'POST' });
      await new Promise(r => setTimeout(r, 600));

      queryRunId = `query_scope_${Date.now()}`;
      const res = await request(`http://127.0.0.1:${TEST_PORT}/api/query/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, {
        runId: queryRunId,
        query: 'Is P73282-B21 active in DL380 Gen12?',
        context: { chassisName: 'DL380_Gen12', offlineMode: true }
      });

      assert.strictEqual(res.status, 200);
      assert.ok(res.data.classification, 'Response should contain classification');
      assert.ok(res.data.result, 'Response should contain result');
      assert.ok(res.data.traceId, 'Response should contain traceId');
    });

    await runAsyncTest('Reliability - Run-by-ID validation, full recovery & merged history', async () => {
      const invalidRes = await request(`http://127.0.0.1:${TEST_PORT}/api/run/..%2Fsecret`, { method: 'GET' });
      assert.strictEqual(invalidRes.status, 400);
      assert.strictEqual(invalidRes.data.code, 'INVALID_RUN_ID');

      const evalGet = await request(`http://127.0.0.1:${TEST_PORT}/api/run/${encodeURIComponent(completedEvalRunId)}`, { method: 'GET' });
      assert.strictEqual(evalGet.status, 200);
      assert.strictEqual(evalGet.data.run.runId, completedEvalRunId);
      assert.strictEqual(evalGet.data.run.status, 'COMPLETED');
      assert.ok(evalGet.data.run.result, 'Recovered evaluation run must contain full result');

      const queryGet = await request(`http://127.0.0.1:${TEST_PORT}/api/run/${encodeURIComponent(queryRunId)}`, { method: 'GET' });
      assert.strictEqual(queryGet.status, 200);
      assert.strictEqual(queryGet.data.run.task, 'PRESALES_QUERY');
      assert.ok(queryGet.data.run.queryResult, 'Recovered query run must contain queryResult');

      const histRes = await request(`http://127.0.0.1:${TEST_PORT}/api/history/runs`, { method: 'GET' });
      assert.strictEqual(histRes.status, 200);
      const runs = Array.isArray(histRes.data) ? histRes.data : (histRes.data?.runs || []);
      assert.ok(runs.some(r => r.runId === completedEvalRunId && r.hasRecoverableResult), 'History must include completed eval run');
      assert.ok(runs.some(r => r.runId === queryRunId && r.taskType === 'PRESALES_QUERY'), 'History must include presales query run');
    });

    await runAsyncTest('Reliability - Stale runId kill rejected (409) & duplicate cancel is idempotent', async () => {
      const registry = await request(`http://127.0.0.1:${TEST_PORT}/api/available-catalogs`);
      const product = registry.data.catalogs.find(catalog => catalog.id === 'DL380_Gen12');
      const cancelTargetRunId = `cancel_target_${Date.now()}`;
      const evalStart = await request(`http://127.0.0.1:${TEST_PORT}/api/eval-boq`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, {
        runId: cancelTargetRunId,
        rawText: '1x P73282-B21 HPE ProLiant DL380 Gen12 8SFF Server\n2x P74845-B21 Intel Xeon Gold 6530',
        chassisDir: product.chassisDir,
        offline: true
      });
      assert.strictEqual(evalStart.status, 202);

      const staleKill = await request(`http://127.0.0.1:${TEST_PORT}/api/kill-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, { runId: 'stale_other_tab_run_123' });
      assert.strictEqual(staleKill.status, 409);
      assert.strictEqual(staleKill.data.code, 'RUN_ID_MISMATCH');

      const snapWhileRunning = await request(`http://127.0.0.1:${TEST_PORT}/api/run-snapshot`, { method: 'GET' });
      assert.strictEqual(snapWhileRunning.data.activeTask?.runId, cancelTargetRunId, 'Stale kill must leave active task running');

      const firstKill = await request(`http://127.0.0.1:${TEST_PORT}/api/kill-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, { runId: cancelTargetRunId });
      assert.strictEqual(firstKill.status, 200);
      assert.strictEqual(firstKill.data.status, 'CANCELLED');

      const secondKill = await request(`http://127.0.0.1:${TEST_PORT}/api/kill-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, { runId: cancelTargetRunId });
      assert.strictEqual(secondKill.status, 200);
      assert.strictEqual(secondKill.data.status, 'CANCELLED');

      const snapAfterCancel = await request(`http://127.0.0.1:${TEST_PORT}/api/run-snapshot`, { method: 'GET' });
      assert.strictEqual(snapAfterCancel.data.isTaskRunning, false, 'Mutex must be released after kill returns CANCELLED');

      const cancelledRun = await request(`http://127.0.0.1:${TEST_PORT}/api/run/${encodeURIComponent(cancelTargetRunId)}`, { method: 'GET' });
      assert.strictEqual(cancelledRun.status, 200);
      assert.strictEqual(cancelledRun.data.run.status, 'CANCELLED');
    });

    await runAsyncTest('Reliability - Changed or expired intake rejects clarification replay with REUPLOAD_REQUIRED', async () => {
      const tempDir = path.join(__dirname, '../../outputs/temp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      const tempCsv = path.join(tempDir, `test_intake_reliability_${Date.now()}.csv`);
      fs.writeFileSync(tempCsv, '1x P73282-B21 HPE ProLiant DL380 Gen12\n');
      try {
        const origHash = crypto.createHash('sha256').update(fs.readFileSync(tempCsv)).digest('hex');
        fs.writeFileSync(tempCsv, '2x P73282-B21 HPE ProLiant DL380 Gen12\n');

        const changedRes = await request(`http://127.0.0.1:${TEST_PORT}/api/eval-boq`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }, { filepath: tempCsv, inputSha256: origHash, offline: true });
        assert.strictEqual(changedRes.status, 409);
        assert.strictEqual(changedRes.data.code, 'INTAKE_CHANGED');
        assert.strictEqual(changedRes.data.remediationAction, 'REUPLOAD_REQUIRED');

        const oldDate = new Date(Date.now() - 3 * 60 * 60 * 1000);
        fs.utimesSync(tempCsv, oldDate, oldDate);
        const expiredRes = await request(`http://127.0.0.1:${TEST_PORT}/api/eval-boq`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }, { filepath: tempCsv, inputSha256: origHash, offline: true });
        assert.strictEqual(expiredRes.status, 410);
        assert.strictEqual(expiredRes.data.code, 'INTAKE_EXPIRED');
        assert.strictEqual(expiredRes.data.remediationAction, 'REUPLOAD_REQUIRED');
      } finally {
        if (fs.existsSync(tempCsv)) fs.unlinkSync(tempCsv);
      }
    });

  } finally {
    serverProcess.kill('SIGTERM');
    await new Promise(r => setTimeout(r, 300));
    try { fs.rmSync(tmpRunsDir, { recursive: true, force: true, maxRetries: 5 }); } catch (_) {}
  }

  console.log('\n================================================================');
  console.log(`Results: ${passedTests}/${totalTests} Workflow Reliability Tests Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Test runner fatal error:', err);
    process.exit(1);
  });
}
