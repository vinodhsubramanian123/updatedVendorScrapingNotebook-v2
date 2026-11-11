'use strict';
const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Spy setup BEFORE importing route modules that destructure helper imports
const spyCounts = {
  rotatorGetKey: 0,
  rotatorExecute: 0,
  ocrCalls: 0,
  notebookQueryCalls: 0,
  notebookAsyncCalls: 0
};

function resetSpies() {
  spyCounts.rotatorGetKey = 0;
  spyCounts.rotatorExecute = 0;
  spyCounts.ocrCalls = 0;
  spyCounts.notebookQueryCalls = 0;
  spyCounts.notebookAsyncCalls = 0;
}

const geminiRotator = require('../../scripts/lib/system/gemini_rotator.js');
const origGetActiveKey = geminiRotator.getActiveKey.bind(geminiRotator);
const origExecuteWithSmartRotation = geminiRotator.executeWithSmartRotation.bind(geminiRotator);
geminiRotator.getActiveKey = () => {
  spyCounts.rotatorGetKey++;
  return { apiKey: 'test-spy-key', index: 0 };
};
geminiRotator.executeWithSmartRotation = async (fn, opts) => {
  spyCounts.rotatorExecute++;
  if (global.__allowOcrMockCall) {
    return {
      text: '1x P73282-B21 HPE DL380 Gen12 8SFF CTO Server\n2x P52560-B21 Intel Xeon Gold 6526Y'
    };
  }
  return origExecuteWithSmartRotation(fn, opts);
};

const ocrService = require('../../scripts/lib/ocr/ocr_service.js');
const origPerformGeminiOcr = ocrService.performGeminiOcr;
ocrService.performGeminiOcr = async (filePath, options = {}) => {
  spyCounts.ocrCalls++;
  return origPerformGeminiOcr(filePath, options);
};

const notebookQueryUtils = require('../../scripts/lib/notebook/notebook_query_utils.js');
const origExecuteNotebookQuery = notebookQueryUtils.executeNotebookQuery;
const origStartAsyncNotebookQueryJob = notebookQueryUtils.startAsyncNotebookQueryJob;
notebookQueryUtils.executeNotebookQuery = async (...args) => {
  spyCounts.notebookQueryCalls++;
  return { answer: 'Cloud mocked response', source: 'NOTEBOOKLM_CLOUD', citations: ['QS-1'] };
};
notebookQueryUtils.startAsyncNotebookQueryJob = (...args) => {
  spyCounts.notebookAsyncCalls++;
  return { jobId: 'spy-job-1', status: 'PENDING' };
};

process.env.NODE_ENV = 'test';
const isolatedRunsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'offline-policy-runs-'));
process.env.DASHBOARD_RUNS_DIR = isolatedRunsDir;

const runState = require('../../dashboard/services/runState.cjs');
const taskManager = require('../../dashboard/services/taskManager.cjs');
const { queryLocalKnowledgeBaseAsync } = require('../../scripts/lib/rag/local_rag_search.js');
const evaluationRouter = require('../../dashboard/routes/evaluation.cjs');
const notebookRouter = require('../../dashboard/routes/notebook.cjs');
const { executeRoutedQuery, _isOfflineContext } = require('../../scripts/evaluators/route_query.js');
const { resolveEffectivePolicy } = require('../../scripts/lib/system/policy_resolver.js');
const { runEvaluationPipeline } = require('../../scripts/evaluators/eval_boq.js');

async function withServer(run) {
  const app = express();
  app.use(express.json());
  app.use('/api', evaluationRouter);
  app.use('/api', notebookRouter);
  const server = await new Promise(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  try {
    const address = server.address();
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

describe('P0 · Enforce Local-Only Policy Before OCR and Grounding', () => {
  const origEnv = { ...process.env };
  const fixturesDir = path.join(__dirname, '..', 'fixtures', 'offline_policy');
  const routeFixturesDir = path.join(__dirname, '..', '..', 'outputs', 'temp', `offline_policy_route_${Date.now()}`);

  before(() => {
    if (!fs.existsSync(fixturesDir)) fs.mkdirSync(fixturesDir, { recursive: true });
    if (!fs.existsSync(routeFixturesDir)) fs.mkdirSync(routeFixturesDir, { recursive: true });

    const files = {
      'test_quote.png': 'fake-png-binary-content-header',
      'test_quote.pdf': '%PDF-1.4 fake pdf content',
      'test_quote.csv': 'SKU,Quantity,Description\nP73282-B21,1,HPE DL380 Gen12 CTO Server\nP52560-B21,2,Intel Xeon Gold 6526Y',
      'test_quote.txt': '1x P73282-B21 HPE DL380 Gen12 CTO Server\n2x P52560-B21 Intel Xeon Gold 6526Y'
    };
    for (const [name, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(fixturesDir, name), content);
      fs.writeFileSync(path.join(routeFixturesDir, name), content);
    }
  });

  beforeEach(() => {
    resetSpies();
    global.__allowOcrMockCall = false;
    delete process.env.OFFLINE_MODE;
    delete process.env.LOCAL_EVAL_ONLY;
    delete process.env.USE_LOCAL_RAG_ONLY;
  });

  afterEach(() => {
    global.__allowOcrMockCall = false;
    delete process.env.OFFLINE_MODE;
    delete process.env.LOCAL_EVAL_ONLY;
    delete process.env.USE_LOCAL_RAG_ONLY;
  });

  after(() => {
    geminiRotator.getActiveKey = origGetActiveKey;
    geminiRotator.executeWithSmartRotation = origExecuteWithSmartRotation;
    ocrService.performGeminiOcr = origPerformGeminiOcr;
    notebookQueryUtils.executeNotebookQuery = origExecuteNotebookQuery;
    notebookQueryUtils.startAsyncNotebookQueryJob = origStartAsyncNotebookQueryJob;
    process.env = { ...origEnv };
    for (const dir of [fixturesDir, routeFixturesDir, isolatedRunsDir]) {
      try {
        if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
      } catch (_) {}
    }
  });

  it('1. performGeminiOcr blocks cloud call and records zero rotator calls when server OFFLINE_MODE=true', async () => {
    process.env.OFFLINE_MODE = 'true';
    const result = await ocrService.performGeminiOcr(path.join(fixturesDir, 'test_quote.png'), { offlineMode: false });
    assert.strictEqual(result.ocrStatus, 'OFFLINE_BLOCKED');
    assert.strictEqual(result.isOcrProcessed, false);
    assert.ok(result.remediationAction.includes('Provide pasted text'));
    assert.strictEqual(spyCounts.rotatorGetKey, 0);
    assert.strictEqual(spyCounts.rotatorExecute, 0);
  });

  it('2. _isOfflineContext & resolveEffectivePolicy enforce server offline flags over conflicting client offlineMode: false', () => {
    process.env.OFFLINE_MODE = '1';
    assert.strictEqual(_isOfflineContext({ offlineMode: false, offline: false, enableCloudValidation: true }), true);
    const serverPolicy = resolveEffectivePolicy({ clientOffline: false, clientOfflineMode: false, enableCloudValidation: true });
    assert.strictEqual(serverPolicy.offline, true);
    assert.strictEqual(serverPolicy.serverEnforced, true);
    assert.strictEqual(serverPolicy.ocrAllowed, false);
    assert.strictEqual(serverPolicy.cloudGroundingAllowed, false);

    delete process.env.OFFLINE_MODE;
    process.env.LOCAL_EVAL_ONLY = 'true';
    assert.strictEqual(_isOfflineContext({ offlineMode: false }), true);

    delete process.env.LOCAL_EVAL_ONLY;
    process.env.USE_LOCAL_RAG_ONLY = '1';
    const ragPolicy = resolveEffectivePolicy({ clientOffline: false, includeRagOnly: true });
    assert.strictEqual(ragPolicy.offline, true);
    assert.strictEqual(ragPolicy.serverEnforced, true);
  });

  it('3. Competitor image & PDF quotes via route_query return OFFLINE_INPUT_REQUIRED with zero cloud OCR calls', async () => {
    process.env.OFFLINE_MODE = 'true';
    for (const filename of ['test_quote.png', 'test_quote.pdf']) {
      resetSpies();
      const result = await executeRoutedQuery('Translate this Cisco quote to HPE ProLiant', {
        filePath: path.join(fixturesDir, filename),
        offlineMode: false,
        offline: false,
        enableCloudValidation: true
      });
      assert.strictEqual(result.result?.status, 'OFFLINE_INPUT_REQUIRED');
      assert.ok(result.result.error.includes('Local-only execution is active'));
      assert.ok(result.result.remediationAction);
      assert.strictEqual(spyCounts.ocrCalls, 0);
      assert.strictEqual(spyCounts.rotatorExecute, 0);
    }

    delete process.env.OFFLINE_MODE;
    process.env.LOCAL_EVAL_ONLY = '1';
    resetSpies();
    const pdfRes = await executeRoutedQuery('Convert this Dell tender PDF to HPE', {
      filePath: path.join(fixturesDir, 'test_quote.pdf'),
      offlineMode: false
    });
    assert.strictEqual(pdfRes.result?.status, 'OFFLINE_INPUT_REQUIRED');
    assert.strictEqual(spyCounts.ocrCalls, 0);
    assert.strictEqual(spyCounts.rotatorExecute, 0);
  });

  it('4. Local CSV and TXT quotes complete under offline mode with zero cloud calls', async () => {
    process.env.OFFLINE_MODE = 'true';
    for (const filename of ['test_quote.csv', 'test_quote.txt']) {
      resetSpies();
      const res = await executeRoutedQuery('Evaluate this tender', {
        filePath: path.join(fixturesDir, filename),
        chassisName: 'DL380_Gen12'
      });
      assert.ok(res);
      assert.notStrictEqual(res.result?.status, 'OFFLINE_INPUT_REQUIRED');
      assert.strictEqual(spyCounts.ocrCalls, 0);
      assert.strictEqual(spyCounts.rotatorExecute, 0);
      assert.strictEqual(spyCounts.notebookQueryCalls, 0);
    }
  });

  it('5. Direct evaluation (eval_boq) of PDF & PNG under OFFLINE_MODE rejects with zero cloud calls', async () => {
    process.env.OFFLINE_MODE = 'true';
    for (const filename of ['test_quote.png', 'test_quote.pdf']) {
      resetSpies();
      await assert.rejects(
        async () => {
          await runEvaluationPipeline({
            inputFile: path.join(fixturesDir, filename),
            OFFLINE_MODE: false,
            offline: false,
            JSON_MODE: true
          });
        },
        (err) => err.message.includes('OFFLINE_MODE') || err.message.includes('Local-only')
      );
      assert.strictEqual(spyCounts.ocrCalls, 0);
      assert.strictEqual(spyCounts.rotatorExecute, 0);
    }
  });

  it('6. Express /api/preprocess-boq, /api/eval-boq, and /api/query/route block PDF & image offline with 422 and zero OCR calls', async () => {
    process.env.LOCAL_EVAL_ONLY = '1';
    await withServer(async baseUrl => {
      for (const filename of ['test_quote.png', 'test_quote.pdf']) {
        resetSpies();
        const fp = path.join(routeFixturesDir, filename);

        const preRes = await fetch(`${baseUrl}/api/preprocess-boq`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ filepath: fp, offline: false, offlineMode: false, enableCloudValidation: true })
        });
        assert.strictEqual(preRes.status, 422);
        const preBody = await preRes.json();
        assert.strictEqual(preBody.status, 'OFFLINE_INPUT_REQUIRED');
        assert.strictEqual(preBody.isOcrProcessed, false);
        assert.strictEqual(preBody.effectivePolicy?.offline, true);
        assert.ok(preBody.remediationAction);

        const evalRes = await fetch(`${baseUrl}/api/eval-boq`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ filepath: fp, chassisDir: 'ProLiant/Gen12/DL380_Gen12', offline: false, offlineMode: false })
        });
        assert.strictEqual(evalRes.status, 422);
        const evalBody = await evalRes.json();
        assert.strictEqual(evalBody.status, 'OFFLINE_INPUT_REQUIRED');
        assert.strictEqual(evalBody.effectivePolicy?.offline, true);

        const routeRes = await fetch(`${baseUrl}/api/query/route`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            query: 'Translate this Cisco quote to HPE ProLiant',
            context: { filePath: fp, offline: false, offlineMode: false, enableCloudValidation: true }
          })
        });
        assert.strictEqual(routeRes.status, 422);
        const routeBody = await routeRes.json();
        assert.strictEqual(routeBody.status, 'OFFLINE_INPUT_REQUIRED');

        assert.strictEqual(spyCounts.ocrCalls, 0);
        assert.strictEqual(spyCounts.rotatorExecute, 0);
      }

      // CSV succeeds on preflight under offline policy
      const csvPre = await fetch(`${baseUrl}/api/preprocess-boq`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ filepath: path.join(routeFixturesDir, 'test_quote.csv'), offline: true })
      });
      assert.strictEqual(csvPre.status, 200);
      const csvBody = await csvPre.json();
      assert.strictEqual(csvBody.status, 'SUCCESS');
      assert.strictEqual(csvBody.effectivePolicy?.offline, true);
    });
  });

  it('7. Explicitly cloud-enabled preflight reaches OCR adapter exactly once when server offline flags are unset', async () => {
    global.__allowOcrMockCall = true;
    await withServer(async baseUrl => {
      resetSpies();
      const fp = path.join(routeFixturesDir, 'test_quote.png');
      const res = await fetch(`${baseUrl}/api/preprocess-boq`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ filepath: fp, offline: false, offlineMode: false, enableCloudValidation: true })
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.status, 'SUCCESS');
      assert.strictEqual(body.isOcrProcessed, true);
      assert.strictEqual(body.effectivePolicy?.offline, false);
      assert.strictEqual(spyCounts.ocrCalls, 1);
      assert.strictEqual(spyCounts.rotatorExecute, 1);
    });
  });

  it('8. Deferred notebook query for a local run is rejected (409) before dispatch, and standalone notebook queries degrade cleanly offline', async () => {
    const localRunId = `run_local_${Date.now()}`;
    runState.captureEvent({
      type: 'TASK_STARTED',
      task: 'EVAL_BOQ',
      runId: localRunId,
      product: 'DL380_Gen12',
      effectivePolicy: { offline: true, offlineMode: true, source: 'DEFAULT_LOCAL_SAFE' },
      inputDescriptor: { offline: true }
    });
    runState.captureEvent({
      type: 'EVAL_RESULT',
      runId: localRunId,
      effectivePolicy: { offline: true, offlineMode: true, source: 'DEFAULT_LOCAL_SAFE' },
      inputDescriptor: { offline: true },
      data: {
        status: 'SUCCESS',
        chassisPrefix: 'DL380_Gen12',
        chassisDir: 'ProLiant/Gen12/DL380_Gen12',
        notebookPayload: 'Verify this local BOM against cloud NotebookLM',
        evalResults: { offlineMode: true, items: [{ sku: 'P73282-B21', quantity: 1 }] }
      }
    });
    runState.captureEvent({ type: 'TASK_COMPLETED', task: 'EVAL_BOQ', runId: localRunId, code: 0 });

    await withServer(async baseUrl => {
      // Even when server env OFFLINE_MODE is unset, local runId cannot dispatch deferred cloud query
      const deferredRes = await fetch(`${baseUrl}/api/notebook-query-async`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          runId: localRunId,
          query: 'Verify this local BOM against cloud NotebookLM',
          chassis: 'DL380_Gen12',
          chassisDir: 'ProLiant/Gen12/DL380_Gen12',
          offline: false
        })
      });
      assert.strictEqual(deferredRes.status, 409);
      const deferredBody = await deferredRes.json();
      assert.ok(String(deferredBody.error || '').includes('Local-only') || String(deferredBody.message || '').includes('Local-only'));
      assert.strictEqual(spyCounts.notebookAsyncCalls, 0);

      // Standalone notebook endpoints under USE_LOCAL_RAG_ONLY return honest fallback state with zero cloud dispatches
      process.env.USE_LOCAL_RAG_ONLY = '1';
      for (const endpoint of [
        { path: '/api/notebook-query', expectedStatus: 200, body: { query: 'DL380 Gen12 memory rules', chassis: 'DL380_Gen12', offline: false } },
        { path: '/api/ask-notebook', expectedStatus: 200, body: { prompt: 'DL380 Gen12 thermal rules', chassis: 'DL380_Gen12', offline: false } },
        { path: '/api/notebook-query-async', expectedStatus: 202, body: { query: 'DL380 Gen12 PCIe rules', chassis: 'DL380_Gen12', offline: false } }
      ]) {
        const res = await fetch(`${baseUrl}${endpoint.path}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(endpoint.body)
        });
        assert.strictEqual(res.status, endpoint.expectedStatus);
        const body = await res.json();
        const resultView = body.result || body;
        assert.strictEqual(resultView.isCloudGrounded, false);
        assert.strictEqual(resultView.groundingVerification, 'UNVERIFIED');
        assert.strictEqual(resultView.learningEligible, false);
        assert.ok(resultView.cloudUnavailableReason);
        assert.strictEqual(body.effectivePolicy?.offline, true);
      }
      assert.strictEqual(spyCounts.notebookQueryCalls, 0);
      assert.strictEqual(spyCounts.notebookAsyncCalls, 0);

      // Deferred matrix recompute for a local run is also rejected before touching cloud deltas
      const recompRes = await fetch(`${baseUrl}/api/recompute-matrix`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          runId: localRunId,
          chassisDir: 'ProLiant/Gen12/DL380_Gen12',
          ragResult: { answer: 'Cloud RAG', isCloudGrounded: true, citations: ['QS-1'] }
        })
      });
      assert.strictEqual(recompRes.status, 409);
      const recompBody = await recompRes.json();
      assert.ok(String(recompBody.error || '').includes('Local-only'));
    });
  });

  it('9. queryLocalKnowledgeBaseAsync skips geminiRotator under USE_LOCAL_RAG_ONLY=1 and BOQ_EVALUATION rejects image/PDF offline via route_query', async () => {
    process.env.USE_LOCAL_RAG_ONLY = '1';
    resetSpies();
    const localAnswer = await queryLocalKnowledgeBaseAsync('DL380 Gen12 fan requirements', 'DL380_Gen12');
    assert.ok(localAnswer && typeof localAnswer.answer === 'string');
    assert.strictEqual(spyCounts.rotatorGetKey, 0);
    assert.strictEqual(spyCounts.rotatorExecute, 0);

    delete process.env.USE_LOCAL_RAG_ONLY;
    process.env.OFFLINE_MODE = 'true';
    for (const filename of ['test_quote.png', 'test_quote.pdf']) {
      resetSpies();
      const routed = await executeRoutedQuery('Evaluate this BOQ file', {
        intent: 'BOQ_EVALUATION',
        filePath: path.join(fixturesDir, filename),
        offlineMode: false,
        enableCloudValidation: true
      });
      assert.strictEqual(routed.result?.status, 'OFFLINE_INPUT_REQUIRED');
      assert.strictEqual(routed.effectivePolicy?.offline, true);
      assert.strictEqual(spyCounts.ocrCalls, 0);
      assert.strictEqual(spyCounts.rotatorExecute, 0);
    }
    assert.ok(taskManager);
  });
});
