'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { runCanonicalEvaluation } = require('../../scripts/lib/orchestrator/evaluation_orchestrator.js');

test('EvaluationOrchestrator — Executes canonical evaluation on hardware BOM', async () => {
  const sampleItems = [
    { sku: 'P73282-B21', description: 'HPE ProLiant Compute DL380 Gen12 8SFF CTO Server', quantity: 1, price: 5584 },
    { sku: 'P73299-B21', description: 'Intel Xeon Gold 6548Y 2.8GHz 32-core 280W Processor', quantity: 2, price: 3200 },
    { sku: 'P73300-B21', description: 'HPE 64GB 2Rx8 DDR5-5600 Smart Memory Kit', quantity: 16, price: 650 },
    { sku: 'P48820-B21', description: 'HPE ProLiant DL380 Gen11 High Performance Fan Kit', quantity: 1, price: 220 },
    { sku: 'P48809-B21', description: 'HPE ProLiant DL380 2U High Performance Heat Sink', quantity: 2, price: 180 }
  ];

  const result = await runCanonicalEvaluation({
    items: sampleItems,
    chassis: 'DL380_Gen12',
    serverCount: 1,
    vendor: 'HPE',
    domain: 'server'
  }, {
    offlineMode: true
  });

  const fs = require('fs');

  // F05 & F09: Offline ungrounded evaluation must NOT claim success:true or vendor acceptance
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.portalValidationStatus, 'PORTAL VALIDATION PENDING');
  assert.strictEqual(result.itemCount, 5);
  assert.ok(Array.isArray(result.strategyMatrix));
  assert.ok(result.totalDurationMs >= 0);

  // Evidence trace is structurally healthy with INCOMPLETE workflow status
  assert.strictEqual(result.lifecycleHealth.healthy, true);
  assert.strictEqual(result.lifecycleHealth.workflowStatus, 'INCOMPLETE');

  // Verify non-repudiation ledger artifact exists on disk
  assert.ok(result.evidenceLedger.jsonPath);
  assert.ok(fs.existsSync(result.evidenceLedger.jsonPath));
});
