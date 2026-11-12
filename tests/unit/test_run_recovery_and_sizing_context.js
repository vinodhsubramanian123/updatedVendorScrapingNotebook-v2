'use strict';
const { describe, it } = require('node:test');
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
const { EventEmitter } = require('events');

describe('P1 · Run Recovery and Sizing Context Preservation', () => {
  const { getRunById, persistRunRecord, isValidRunId, registerRagJob } = require('../../dashboard/services/runState.cjs');
  const { executeRoutedQuery } = require('../../scripts/evaluators/route_query.js');

  it('1. Persists run record atomically and retrieves it by run ID', () => {
    const tmpRunsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runstate-persist-'));
    const prevRunsDir = process.env.DASHBOARD_RUNS_DIR;
    process.env.DASHBOARD_RUNS_DIR = tmpRunsDir;
    try {
      const testRunId = `test_run_${Date.now()}`;
      const testRecord = {
        runId: testRunId,
        task: 'PRESALES_QUERY',
        product: 'DL380_Gen12',
        startTime: Date.now(),
        status: 'COMPLETED',
        exitCode: 0,
        durationMs: 120,
        logs: [{ text: 'Step 1 complete' }],
        effectivePolicy: { offline: true }
      };
      persistRunRecord(testRecord);

      const retrieved = getRunById(testRunId);
      assert.ok(retrieved, 'Should retrieve persisted run record');
      assert.strictEqual(retrieved.runId, testRunId);
      assert.strictEqual(retrieved.status, 'COMPLETED');
      assert.strictEqual(retrieved.effectivePolicy?.offline, true);
    } finally {
      if (prevRunsDir === undefined) delete process.env.DASHBOARD_RUNS_DIR;
      else process.env.DASHBOARD_RUNS_DIR = prevRunsDir;
      fs.rmSync(tmpRunsDir, { recursive: true, force: true });
    }
  });

  it('2. Sizing result includes structured candidateReference with product, nodeCount, and candidate digest', async () => {
    const result = await executeRoutedQuery('Size 4 nodes of DL380 Gen12 with 64 cores, 512GB RAM', {
      chassisName: 'DL380_Gen12',
      offlineMode: true
    });

    const envelopeResult = result.result || result;
    assert.strictEqual(envelopeResult.intent, 'RFP_SIZING_TO_BOM');
    assert.strictEqual(envelopeResult.serverCount, 4);
    assert.ok(envelopeResult.candidateReference, 'candidateReference must be present');
    assert.strictEqual(envelopeResult.candidateReference.nodeCount, 4);
    assert.strictEqual(envelopeResult.candidateReference.quantityBasis, 'CLUSTER_MULTIPLIED');
    assert.ok(envelopeResult.candidateReference.digest, 'candidate digest must be present');
    assert.ok(Array.isArray(envelopeResult.items), 'items array must be present');
    assert.ok(Array.isArray(envelopeResult.candidateBOM), 'candidateBOM array must be present');
  });

  it('3. Cancellation rejects mismatched run ID and holds mutex during cleanup grace until explicit release', async () => {
    const {
      _setActiveTask,
      getActiveTask,
      isTaskRunning,
      beginTaskCancellation,
      awaitTaskCleanup,
      releaseTaskMutex,
      cancelAbortTask
    } = require('../../dashboard/services/taskManager.cjs');
    const runA = 'run_A_' + Date.now();
    const runB = 'run_B_' + Date.now();
    const fakeProc = new EventEmitter();
    fakeProc.pid = process.pid;
    fakeProc.exitCode = null;
    fakeProc._terminationPromise = null;

    _setActiveTask({
      type: 'EVAL_BOQ',
      runId: runB,
      process: fakeProc,
      startTime: Date.now()
    });

    const active = getActiveTask();
    assert.strictEqual(active.runId, runB);
    assert.notStrictEqual(active.runId, runA);

    assert.ok(beginTaskCancellation(runB), 'Matching runId should begin cancellation');
    assert.strictEqual(beginTaskCancellation(runA), null, 'Mismatched runId must be rejected');
    fakeProc.exitCode = 1;
    fakeProc.emit('exit', 1, 'SIGTERM');
    assert.strictEqual(isTaskRunning(), true, 'Mutex must stay held during post-exit cleanup grace');

    let cleanupResolved = false;
    const waitPromise = awaitTaskCleanup(runB, 2000).then(ok => { cleanupResolved = ok; return ok; });
    await new Promise(r => setTimeout(r, 30));
    assert.strictEqual(cleanupResolved, false, 'Cleanup confirmation must wait until mutex release');

    releaseTaskMutex(runB);
    assert.strictEqual(await waitPromise, true);
    assert.strictEqual(isTaskRunning(), false);

    // Abort task deduplicated cancel check
    let abortCalls = 0;
    const abortCtrl = { abort: () => { abortCalls++; } };
    _setActiveTask({
      type: 'PRESALES_QUERY',
      runId: runA,
      abortController: abortCtrl,
      startTime: Date.now()
    });
    const p1 = cancelAbortTask(runA, 1000);
    const p2 = cancelAbortTask(runA, 1000);
    assert.strictEqual(abortCalls, 1, 'Duplicate cancel must invoke abort() once');
    assert.strictEqual(p1, p2, 'Duplicate cancel must await the same deduplicated promise');
    releaseTaskMutex(runA);
    const [r1, r2] = await Promise.all([p1, p2]);
    assert.strictEqual(r1.exitConfirmed, true);
    assert.strictEqual(r2.exitConfirmed, true);
    _setActiveTask(null);
  });

  it('4. Validates runId format and recovers completed, clarification, and interrupted runs after restart', () => {
    assert.strictEqual(isValidRunId('../etc/passwd'), false);
    assert.strictEqual(isValidRunId('run/nested'), false);
    assert.strictEqual(isValidRunId('x'), false);
    assert.strictEqual(getRunById('../secret'), null);
    assert.strictEqual(registerRagJob('../secret', 'job_1'), false);

    const tmpRunsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runstate-restart-'));
    try {
      const t0 = Date.now() - 20000;
      fs.writeFileSync(path.join(tmpRunsDir, 'run_old_done.json'), JSON.stringify({
        runId: 'run_old_done',
        task: 'EVAL_BOQ',
        product: 'DL380_Gen12',
        startTime: t0,
        updatedAt: t0 + 1000,
        status: 'COMPLETED',
        exitCode: 0,
        result: { type: 'EVAL_RESULT', runId: 'run_old_done', data: { status: 'SUCCESS', items: [{ sku: 'P73282-B21', quantity: 1 }] } }
      }));
      fs.writeFileSync(path.join(tmpRunsDir, 'run_clarify.json'), JSON.stringify({
        runId: 'run_clarify',
        task: 'EVAL_BOQ',
        product: 'DL380_Gen12',
        startTime: t0 + 5000,
        updatedAt: t0 + 6000,
        status: 'ACTION_REQUIRED',
        stage: 'CLARIFICATION_REQUIRED',
        inputSha256: 'abc123',
        inputRef: '/tmp/sample.csv',
        inputDescriptor: { filepath: '/tmp/sample.csv', sha256: 'abc123', offline: true },
        result: { type: 'EVAL_RESULT', runId: 'run_clarify', data: { status: 'ACTION_REQUIRED', evalResults: { clarificationRequired: true } } }
      }));
      fs.writeFileSync(path.join(tmpRunsDir, 'run_inflight.json'), JSON.stringify({
        runId: 'run_inflight',
        task: 'EVAL_BOQ',
        product: 'DL380_Gen12',
        startTime: t0 + 10000,
        updatedAt: t0 + 10500,
        status: 'RUNNING',
        logs: [{ text: 'Step 1 executing' }]
      }));

      const probeScript = `
        const rs = require('./dashboard/services/runState.cjs');
        const snap = rs.getRunSnapshot();
        console.log(JSON.stringify({
          inflight: rs.getRunById('run_inflight'),
          clarify: rs.getRunById('run_clarify'),
          done: rs.getRunById('run_old_done'),
          latestResultRunId: snap.latestResult && snap.latestResult.runId,
          latestTaskRunId: snap.latestTask && snap.latestTask.runId,
          latestTaskStatus: snap.latestTask && snap.latestTask.status
        }));
      `;
      const out = execFileSync(process.execPath, ['-e', probeScript], {
        cwd: path.resolve(__dirname, '../..'),
        env: { ...process.env, NODE_ENV: 'production', DASHBOARD_RUNS_DIR: tmpRunsDir },
        encoding: 'utf8'
      });
      const parsed = JSON.parse(out.trim());
      assert.strictEqual(parsed.inflight.status, 'INTERRUPTED');
      assert.strictEqual(parsed.inflight.stage, 'INTERRUPTED');
      assert.strictEqual(parsed.inflight.error?.code, 'INTERRUPTED_BY_RESTART');
      assert.strictEqual(parsed.clarify.status, 'ACTION_REQUIRED');
      assert.strictEqual(parsed.clarify.inputSha256, 'abc123');
      assert.strictEqual(parsed.done.status, 'COMPLETED');
      assert.strictEqual(parsed.latestTaskRunId, 'run_inflight');
      assert.strictEqual(parsed.latestTaskStatus, 'INTERRUPTED');
      assert.strictEqual(parsed.latestResultRunId, 'run_clarify', 'Must fall back to newest run with result when latest.json is absent');
    } finally {
      fs.rmSync(tmpRunsDir, { recursive: true, force: true });
    }
  });

  it('5. Order 4 sizing resolves 25GbE networking, flags missing target catalog, and round-trips multi-node scope through eval_boq and recomputeStrategyMatrixWithRag', async () => {
    const { resolveRequirementIntent } = require('../../scripts/lib/boq/requirement_intent_resolver.js');
    const { normalizeConfiguration, applyConfigurationContext } = require('../../scripts/lib/boq/configuration_context.js');
    const { parseAndConsolidateBOQDetailed } = require('../../scripts/lib/boq/boq_evaluator.js');
    const { runEvaluationPipeline, recomputeStrategyMatrixWithRag } = require('../../scripts/evaluators/eval_boq.js');

    const dl380Dir = path.resolve(__dirname, '../../outputs/ProLiant/Gen12/DL380_Gen12');
    const catalogData = JSON.parse(fs.readFileSync(path.join(dl380Dir, 'DL380_Gen12_Catalog.json'), 'utf8'));
    const intentRes = resolveRequirementIntent({
      rawLines: ['25GbE networking'],
      unresolvedRequirements: [{ line: '25GbE networking' }],
      catalogData,
      productConfirmed: true
    });
    assert.ok(intentRes.resolutions.some(r => r.expectedRole === 'Network Adapter'), '25GbE networking must map to Network Adapter role');

    const presetQuery = 'Size 4 nodes of DL380 Gen12 with 64 cores, 512GB RAM, 4x 3.84TB NVMe SSDs, 25GbE networking, and 3yr Tech Care Basic';
    const sizingResp = await executeRoutedQuery(presetQuery, {
      chassisName: 'DL380_Gen12',
      chassisDir: dl380Dir,
      offline: true,
      offlineMode: true
    });
    const sizingData = sizingResp.result || sizingResp;
    assert.strictEqual(sizingData.serverCount, 4);
    assert.strictEqual(sizingData.candidateReference.product, 'DL380_Gen12');
    assert.strictEqual(sizingData.candidateReference.nodeCount, 4);
    assert.strictEqual(sizingData.candidateReference.quantityBasis, 'CLUSTER_MULTIPLIED');
    assert.strictEqual(sizingData.candidateReference.effectivePolicy.offline, true);

    const unknownResp = await executeRoutedQuery('Size 2 nodes of UnknownAlienBox9000 with 64GB RAM', {
      offline: true,
      offlineMode: true
    });
    const unknownData = unknownResp.result || unknownResp;
    assert.ok(
      unknownResp.hitlRequired === true || unknownData.code === 'PLATFORM_CLARIFICATION_REQUIRED' || unknownData.requiresHumanClarification === true,
      'Unresolved platform must require human clarification'
    );

    const incompleteSizingResp = await executeRoutedQuery('Size 2 nodes of DL380 Gen12 with 64 cores', {
      chassisName: 'DL380_Gen12',
      chassisDir: dl380Dir,
      offline: true,
      offlineMode: true
    });
    const incompleteData = incompleteSizingResp.result || incompleteSizingResp;
    assert.strictEqual(incompleteData.requiresHumanClarification, true);
    assert.ok((incompleteData.missingRequirements || []).includes('Memory'));
    assert.ok((incompleteData.missingRequirements || []).includes('Drive Cage / Drive'));

    // Cross-vendor candidateReference carries product/scope/policy & missing catalog clarification
    const xvMissing = await executeRoutedQuery('Convert this Dell PowerEdge R760 quote to HPE: 2x Xeon 6530', {
      sourceVendor: 'Dell',
      offline: true
    });
    const xvData = xvMissing.result || xvMissing;
    assert.strictEqual(xvData.requiresHumanClarification, true);
    assert.ok(xvData.candidateReference.missingRequirements.includes('Target Product Catalog'));
    assert.strictEqual(xvData.candidateReference.effectivePolicy.offline, true);

    // Non-CTO fallback multi-node normalization
    const nonCtoNorm = normalizeConfiguration([
      { sku: 'P74845-B21', description: 'Intel Xeon Gold 6530 Processor', quantity: 8 },
      { sku: 'R0R41A', description: 'HPE Transceiver Spare Cable', quantity: 1, quantityScope: 'global' }
    ], { serverCount: 4 });
    assert.strictEqual(nonCtoNorm.multiplier, 4);
    assert.strictEqual(nonCtoNorm.items.find(i => i.sku === 'P74845-B21').perNodeQuantity, 2);
    assert.strictEqual(nonCtoNorm.items.find(i => i.sku === 'R0R41A').quantityScope, 'global');

    // Full eval_boq + recompute round-trip with structured candidateReference & global item
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'order4-eval-'));
    try {
      const candidateJsonPath = path.join(tmpDir, 'candidate.json');
      const candItems = [
        { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 4, quantityBasis: 'total', configurationMultiplier: 4, quantityScope: 'configuration', unitPriceUsd: 2500 },
        { sku: 'P74845-B21', description: 'Intel Xeon Gold 6530 Processor', quantity: 8, quantityBasis: 'total', configurationMultiplier: 4, quantityScope: 'configuration', unitPriceUsd: 3000 },
        { sku: 'R0R41A', description: 'Spare Optical Cable Kit', quantity: 1, quantityScope: 'global', unitPriceUsd: 200 }
      ];
      const candRef = {
        parentRunId: 'query_parent_order4',
        product: 'DL380 Gen12',
        chassisDir: dl380Dir,
        serverCount: 4,
        nodeCount: 4,
        quantityBasis: 'CLUSTER_MULTIPLIED',
        digest: 'order4digest123',
        items: candItems,
        effectivePolicy: { offline: true, mode: 'OFFLINE_LOCKED' }
      };
      fs.writeFileSync(candidateJsonPath, JSON.stringify({ items: candItems, candidateReference: candRef }));

      const parsedJson = parseAndConsolidateBOQDetailed(fs.readFileSync(candidateJsonPath, 'utf8'), candidateJsonPath);
      assert.strictEqual(parsedJson.multiplier, 4);
      assert.strictEqual(parsedJson.parentRunId, 'query_parent_order4');
      assert.strictEqual(parsedJson.candidateDigest, 'order4digest123');

      const evalOut = await runEvaluationPipeline({
        inputFile: candidateJsonPath,
        chassisDir: dl380Dir,
        OFFLINE_MODE: true,
        DEFER_RAG: true,
        JSON_MODE: true,
        serverCount: 4,
        parentRunId: 'query_parent_order4',
        candidateDigest: 'order4digest123',
        candidateReference: candRef
      });
      assert.strictEqual(evalOut.serverCount, 4);
      assert.strictEqual(evalOut.nodeCount, 4);
      assert.strictEqual(evalOut.quantityBasis, 'CLUSTER_MULTIPLIED');
      assert.strictEqual(evalOut.parentRunId, 'query_parent_order4');
      assert.strictEqual(evalOut.candidateDigest, 'order4digest123');
      assert.strictEqual(evalOut.chassis, 'DL380_Gen12');
      assert.strictEqual(evalOut.clusterSizing.serverCount, 4);
      assert.strictEqual(evalOut.items.find(i => i.sku === 'R0R41A')?.quantityScope, 'global');

      // Recompute must preserve configurationContext, serverCount, global items, parentRunId, candidateDigest, effectivePolicy
      const baseData = applyConfigurationContext({
        chassis: 'DL380_Gen12',
        chassisDir: dl380Dir,
        serverCount: 4,
        nodeCount: 4,
        quantityBasis: 'CLUSTER_MULTIPLIED',
        parentRunId: 'query_parent_order4',
        candidateDigest: 'order4digest123',
        candidateReference: candRef,
        effectivePolicy: { offline: true, mode: 'OFFLINE_LOCKED' },
        items: evalOut.items,
        evalResults: evalOut,
        conflictGraph: evalOut.conflictGraph
      }, evalOut.configurationContext);
      const recomputed = recomputeStrategyMatrixWithRag(baseData, { isCloudGrounded: false, answer: 'local fallback', citations: [] }, dl380Dir);
      assert.strictEqual(recomputed.serverCount, 4);
      assert.strictEqual(recomputed.nodeCount, 4);
      assert.strictEqual(recomputed.quantityBasis, 'CLUSTER_MULTIPLIED');
      assert.strictEqual(recomputed.parentRunId, 'query_parent_order4');
      assert.strictEqual(recomputed.candidateDigest, 'order4digest123');
      assert.strictEqual(recomputed.evalResults.clusterSizing.serverCount, 4);
      assert.strictEqual(recomputed.evalResults.items.find(i => i.sku === 'R0R41A')?.quantityScope, 'global');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
