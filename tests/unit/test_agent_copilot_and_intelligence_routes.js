'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const express = require('express');

const { parseAgyNdjsonLine, runAgyEscalation } = require('../../scripts/lib/rag/agy_escalation_bridge.js');
const { evaluateCopilotEscalation, runPresalesCopilot } = require('../../scripts/lib/rag/presales_copilot_agent.js');
const { executeRoutedQuery } = require('../../scripts/evaluators/route_query.js');
const intelligenceRouter = require('../../dashboard/routes/intelligence.cjs');
const agentRouter = require('../../dashboard/routes/agent.cjs');
const { getRunById } = require('../../dashboard/services/runState.cjs');

function createMockProc(stdoutLines = [], exitCode = 0) {
  const proc = new EventEmitter();
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.kill = () => { proc.emit('close', 1); };
  setImmediate(() => {
    for (const line of stdoutLines) proc.stdout.emit('data', Buffer.from(`${line}\n`, 'utf8'));
    proc.emit('close', exitCode);
  });
  return proc;
}

async function withTestServer(fn) {
  const app = express();
  app.use(express.json());
  app.use('/api', intelligenceRouter);
  app.use('/api', agentRouter);
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  try {
    return await fn(baseUrl);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('parseAgyNdjsonLine extracts conversationId, assistant text, and final result cleanly', () => {
  const evt1 = parseAgyNdjsonLine(JSON.stringify({
    type: 'assistant',
    conversation_id: 'conv-123',
    message: { content: [{ type: 'text', text: 'Checking riser topology...' }] }
  }));
  assert.equal(evt1.conversationId, 'conv-123');
  assert.equal(evt1.text, 'Checking riser topology...');
  assert.equal(evt1.isResult, false);

  const evt2 = parseAgyNdjsonLine(JSON.stringify({ type: 'result', conversation_id: 'conv-123', result: 'Use Riser 2 for DW GPU.' }));
  assert.equal(evt2.isResult, true);
  assert.equal(evt2.text, 'Use Riser 2 for DW GPU.');
  assert.equal(parseAgyNdjsonLine('not-json'), null);
});

test('runAgyEscalation blocks when offline and streams NDJSON response when mocked', async () => {
  const blocked = await runAgyEscalation({ query: 'Help', offline: true });
  assert.equal(blocked.status, 'BLOCKED_OFFLINE');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-bin-'));
  const fakeAgy = path.join(tmpDir, 'agy.exe');
  fs.writeFileSync(fakeAgy, 'stub');
  const origAgyBin = process.env.AGY_BIN;
  const origOffline = process.env.OFFLINE_MODE;
  delete process.env.OFFLINE_MODE;
  process.env.AGY_BIN = fakeAgy;

  try {
    const out = await runAgyEscalation({
      query: 'Validate 2x DW GPU topology on DL380 Gen12',
      offline: false,
      _spawnFn: () => createMockProc([
        JSON.stringify({ type: 'assistant', conversation_id: 'c-99', message: { content: [{ type: 'text', text: 'Partial' }] } }),
        JSON.stringify({ type: 'result', conversation_id: 'c-99', result: 'Requires Secondary Riser and Titanium 1600W PSUs.' })
      ], 0)
    });
    assert.equal(out.status, 'SUCCESS');
    assert.equal(out.conversationId, 'c-99');
    assert.match(out.answer, /Titanium 1600W/);
  } finally {
    if (origAgyBin === undefined) delete process.env.AGY_BIN; else process.env.AGY_BIN = origAgyBin;
    if (origOffline !== undefined) process.env.OFFLINE_MODE = origOffline;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('presales_copilot_agent enforces offline block and confidence escalation rubric', async () => {
  const offlineRes = await runPresalesCopilot({ query: 'Explain DL380 Gen12', context: { offline: true } });
  assert.equal(offlineRes.status, 'BLOCKED_OFFLINE');

  const highConf = evaluateCopilotEscalation({
    deterministicResult: { classification: { confidence: 0.9 }, result: { status: 'SUCCESS' } },
    answer: 'Detailed grounded answer with verified specs across all required constraints and components.',
    toolCallsUsed: [{ name: 'query_hardware_envelope' }]
  });
  assert.equal(highConf.needsDeepEscalation, false);

  const discrepancy = evaluateCopilotEscalation({
    deterministicResult: { classification: { confidence: 0.9 }, result: { status: 'SUCCESS' } },
    answer: 'Conflict detected [OPINION_DISCREPANCY_FLAG] between QuickSpecs and local catalog rules regarding OCP slot.',
    toolCallsUsed: []
  });
  assert.equal(discrepancy.needsDeepEscalation, true);

  const origOffline = process.env.OFFLINE_MODE;
  delete process.env.OFFLINE_MODE;
  try {
    const mocked = await runPresalesCopilot({
      query: 'Summarize DL380 Gen12 storage',
      context: { offline: false },
      deterministicResult: { classification: { confidence: 0.9 }, result: { status: 'SUCCESS' } },
      _chatRunner: async () => ({
        answer: 'Confirmed 24 SFF / 12 LFF / 36 EDSFF support with MR416i-p Tri-Mode controller.',
        toolCallsUsed: [{ name: 'query_hardware_envelope', args: { platform: 'DL380_Gen12' } }]
      })
    });
    assert.equal(mocked.status, 'SUCCESS');
    assert.equal(mocked.needsDeepEscalation, false);
  } finally {
    if (origOffline !== undefined) process.env.OFFLINE_MODE = origOffline;
  }
});

test('executeRoutedQuery emits sequential progress milestones', async () => {
  const events = [];
  const res = await executeRoutedQuery('What is the hardware envelope for DL380 Gen12?', {
    chassisName: 'DL380_Gen12',
    offline: true,
    onProgress: (evt) => events.push(evt)
  });
  assert.ok(res.classification?.intent);
  assert.ok(events.length >= 3, `Expected >=3 milestones, got ${events.length}`);
  assert.ok(events.some(e => e.stage === 'INTENT_CLASSIFIED'));
  assert.ok(events.some(e => e.stage === 'ACCEPTANCE_GATED'));
});

test('Intelligence & Agent routes expose Wave B-F metadata and force deterministic mode offline', async () => {
  await withTestServer(async (baseUrl) => {
    const envRes = await fetch(`${baseUrl}/api/platform-envelope?platform=DL380_Gen12`).then(r => r.json());
    assert.equal(envRes.status, 'SUCCESS');
    assert.ok(envRes.envelope?.memory?.maxDimmsChassis > 0);
    assert.ok(envRes.envelope?.pcie?.maxMechanicalSlots > 0);

    const manifestsRes = await fetch(`${baseUrl}/api/product-manifests`).then(r => r.json());
    assert.equal(manifestsRes.status, 'SUCCESS');
    assert.ok(manifestsRes.count >= 17);

    const adaptersRes = await fetch(`${baseUrl}/api/vendor-adapters`).then(r => r.json());
    assert.equal(adaptersRes.status, 'SUCCESS');
    assert.ok(adaptersRes.count >= 5);

    const searchRes = await fetch(`${baseUrl}/api/global-search?q=DL380`).then(r => r.json());
    assert.equal(searchRes.status, 'SUCCESS');
    assert.ok(searchRes.results.platforms.length > 0);

    const exact = await fetch(`${baseUrl}/api/global-search?q=P73282-B21&limit=1`).then(r => r.json());
    assert.equal(exact.results.skus[0]?.sku, 'P73282-B21');
    assert.equal(exact.results.skus[0]?.platformId, 'DL380_Gen12');
    assert.ok(exact.results.skus[0]?.listPriceUsd > 0);

    const routingRes = await fetch(`${baseUrl}/api/config/model-routing`).then(r => r.json());
    assert.equal(routingRes.status, 'SUCCESS');
    assert.equal(routingRes.activePromptVersion, 'v4');

    const multiRes = await fetch(`${baseUrl}/api/multi-notebook-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offline: true, domains: [{ productKey: 'DL380_Gen12', query: 'Thermal fan rules' }] })
    }).then(r => r.json());
    assert.equal(multiRes.status, 'SUCCESS');
    assert.equal(multiRes.totalDomains, 1);

    const statusRes = await fetch(`${baseUrl}/api/agent/runtime-status`).then(r => r.json());
    assert.equal(statusRes.status, 'READY');
    assert.ok(statusRes.supportedModes.includes('AGY_DEEP'));

    const agentRes = await fetch(`${baseUrl}/api/agent/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'What is the maximum PCIe, OCP and GPU capacity for DL380 Gen12?',
        mode: 'SMART_AUTO',
        context: {
          offline: true,
          chassisName: 'DL380_Gen12',
          chassisDir: 'outputs/ProLiant/Gen12/DL380_Gen12'
        }
      })
    }).then(r => r.json());
    assert.equal(agentRes.modeUsed, 'DETERMINISTIC');
    assert.equal(agentRes.effectivePolicy.offline, true);
    assert.ok(agentRes.runId);
    assert.ok(agentRes.result?.envelope);
    const record = getRunById(agentRes.runId);
    assert.equal(record?.progress?.tier, 'DETERMINISTIC');
    assert.equal(record?.progress?.percent, 100);
  });
});
