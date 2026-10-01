'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { classifyQueryIntent, executeRoutedQuery } = require('../../scripts/evaluators/route_query.js');

test('QueryRouter — workbook handoff uses canonical pipeline and rejects unsigned or mutated delivery', async t => {
  const pipeline = require('../../scripts/evaluators/eval_boq.js');
  const { deliveryFingerprint } = require('../../scripts/lib/boq/solution_evidence');
  const { issueDeliveryAuthorization } = require('../../scripts/lib/contracts/workflow_contract');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workbook-route-'));
  try {
    const exportPath = path.join(tempDir, 'fixture.xlsx');
    fs.writeFileSync(exportPath, 'fixture: exporter content verified separately');
    const evaluation = { chassis: 'DL380_Gen12', items: [{ sku: 'P74573-B21', quantity: 2 }],
      acceptanceGate: { isValid: true }, portalWorkbookPath: exportPath };
    const mocked = t.mock.method(pipeline, 'runEvaluationPipeline', async () => evaluation);
    const context = { intent: 'WORKBOOK_GENERATION', chassisName: 'DL380_Gen12', items: evaluation.items, offlineMode: true };
    const request = () => executeRoutedQuery('Generate Partner Portal upload Excel sheet for DL380 Gen12', context);
    const unsigned = await request();
    assert.strictEqual(unsigned.result.status, 'VALIDATION_REQUIRED');
    assert.deepStrictEqual(mocked.mock.calls[0].arguments[0].inputItems, context.items);
    assert.strictEqual(mocked.mock.calls[0].arguments[0].OFFLINE_MODE, true);
    assert.strictEqual(mocked.mock.calls[0].arguments[0].JSON_MODE, true);

    evaluation.deliveryAuthorization = issueDeliveryAuthorization({
      manifestFingerprint: deliveryFingerprint(evaluation), chassisKey: 'DL380_Gen12',
      acceptanceDecision: { isApproved: true }
    });
    const authorized = await request();
    assert.strictEqual(authorized.result.status, 'GENERATED_DRAFT');
    assert.strictEqual(authorized.result.exportPath, exportPath);
    evaluation.items[0].quantity = 3;
    assert.strictEqual((await request()).result.status, 'VALIDATION_REQUIRED');
  } finally { fs.rmSync(tempDir, { recursive: true, force: true }); }
});

test('QueryRouter — Correctly classifies FREEFORM_QA questions', () => {
  const q = 'Can I install 4x L40S GPUs in a DL380 Gen12? What power cables are required?';
  const c = classifyQueryIntent(q);

  assert.strictEqual(c.intent, 'FREEFORM_QA');
  assert.strictEqual(c.skillTarget, 'presales-query-router');
  assert.ok(c.confidence >= 0.85);
});

test('QueryRouter — Correctly classifies RFP_SIZING_TO_BOM wishlists', () => {
  const q = 'I need to size a server with 64 cores, 512GB RAM, and 50TB storage for virtualization.';
  const c = classifyQueryIntent(q);

  assert.strictEqual(c.intent, 'RFP_SIZING_TO_BOM');
  assert.strictEqual(c.skillTarget, 'rfp-sizing-synthesizer');
  assert.ok(c.confidence >= 0.90);
});

test('QueryRouter — Correctly classifies BOQ_EVALUATION from file path', () => {
  const c = classifyQueryIntent('Evaluate this file', { filePath: '/tmp/customer_quote.xlsx' });

  assert.strictEqual(c.intent, 'BOQ_EVALUATION');
  assert.strictEqual(c.skillTarget, 'boq-eval-skill');
});

test('QueryRouter — Correctly classifies BOM_RECONCILIATION requests', () => {
  const q = 'Please reconcile customer tender BOM with our partner portal quote to check for ghost SKUs.';
  const c = classifyQueryIntent(q);

  assert.strictEqual(c.intent, 'BOM_RECONCILIATION');
  assert.strictEqual(c.skillTarget, 'bom-reconciliation-skill');
});

test('QueryRouter — Correctly classifies CATALOG_INTELLIGENCE price inquiries', () => {
  const q = 'What is the pricing history and price trend for SKU P73282-B21 over the past year?';
  const c = classifyQueryIntent(q);

  assert.strictEqual(c.intent, 'CATALOG_INTELLIGENCE');
  assert.strictEqual(c.skillTarget, 'catalog-intelligence-skill');
});

test('QueryRouter — Executes FREEFORM_QA query and returns local RAG answer', async () => {
  const res = await executeRoutedQuery('What is the maximum memory capacity on DL380 Gen12?');

  assert.strictEqual(res.classification.intent, 'FREEFORM_QA');
  assert.ok(res.result.answer);
  assert.ok(Array.isArray(res.result.citations));
  assert.ok(res.executionTimeMs >= 0);
});

test('QueryRouter — Executes CATALOG_INTELLIGENCE query for specific SKU', async () => {
  const res = await executeRoutedQuery('Show me price trend for P73282-B21');

  assert.strictEqual(res.classification.intent, 'CATALOG_INTELLIGENCE');
  assert.strictEqual(res.result.targetSku, 'P73282-B21');
  assert.ok(res.result.message.includes('P73282-B21'));
});

test('QueryRouter — Executes RFP_SIZING_TO_BOM and constructs candidate BOM', async () => {
  const query = 'Need a DL380 Gen12 server with 32 cores, 256GB RAM, 10TB storage';
  const res = await executeRoutedQuery(query, { chassisName: 'DL380_Gen12' });

  assert.strictEqual(res.classification.intent, 'RFP_SIZING_TO_BOM');
  assert.ok(res.result.candidateBOM);
  assert.ok(Array.isArray(res.result.candidateBOM));
  assert.ok(res.result.status);
});

test('QueryRouter — Executes BOM_RECONCILIATION with single audit file', async () => {
  const filePath = path.resolve(__dirname, '..', 'fixtures', 'test_boq_dl380_gen12.csv');
  const res = await executeRoutedQuery('Reconcile this quote', { filePath, chassisName: 'DL380_Gen12' });

  assert.strictEqual(res.classification.intent, 'BOM_RECONCILIATION');
  assert.strictEqual(res.result.status, 'SINGLE_FILE_AUDIT');
  assert.strictEqual(res.result.isTwoBaselineComparison, false);
  assert.ok(res.result.auditReport);
  assert.strictEqual(typeof res.result.auditReport.is100PercentMatch, 'boolean');
});

test('QueryRouter — Executes FREEFORM_QA for DL 380a and isolates from DL380', async () => {
  const res = await executeRoutedQuery('What are the processor options for DL 380a?');
  assert.strictEqual(res.classification.intent, 'FREEFORM_QA');
  assert.strictEqual(res.result.chassis, 'DL380a_Gen12');
  assert.ok(res.result.answer.includes('DL380a_Gen12'));
  assert.ok(!res.result.answer.includes('(DL380_Gen12)'));
});

test('QueryRouter — Correctly classifies all specialized and operational presales skill tracks', () => {
  const tracks = [
    { query: 'Translate this Cisco UCS server quote to HPE ProLiant equivalent', expected: 'CROSS_VENDOR_TRANSFORMATION', target: 'cross-vendor-transformation-skill' },
    { query: 'Modernize this mixed-domain tender with carrier nodes and storage', expected: 'HETEROGENEOUS_TENDER_MODERNIZATION', target: 'heterogeneous-tender-modernizer' },
    { query: 'Ingest and extract quote image', context: { filePath: 'quote.png' }, expected: 'OCR_QUOTE_INGESTION', target: 'ocr-quote-ingestion-skill' },
    { query: 'Analyze workload DNA for SAP HANA in-memory database', expected: 'WORKLOAD_DNA', target: 'workload-dna-skill' },
    { query: 'Optimize this bill of materials for a $20,000 budget', expected: 'VALUE_ENGINEERING', target: 'value-engineering-skill' },
    { query: 'Synthesize least-delta minimal mutation alternative for this BOQ', expected: 'LEAST_DELTA_SYNTHESIS', target: 'least-delta-combinator-skill' },
    { query: 'Add commercial remarks column to tender reconciliation', expected: 'REMARKS_RECONCILIATION', target: 'boq-remarks-reconciliation-skill' },
    { query: 'Generate Partner Portal upload Excel sheet', expected: 'WORKBOOK_GENERATION', target: 'workbook-generator-skill' },
    { query: 'Decompose 100-node cluster into 42U rack layout and power envelope', expected: 'MULTI_CLUSTER_TENDER', target: 'multi-cluster-tender-skill' },
    { query: 'Run adversarial red-team stress test on this BOQ configuration', expected: 'ADVERSARIAL_VALIDATION', target: 'adversarial-validation-skill' },
    { query: 'Reflect portal feedback error and register learned rule delta', expected: 'CONTINUOUS_LEARNING', target: 'continuous-learning-skill' },
    { query: 'Synchronize knowledge delta to NotebookLM grounding notebook', expected: 'KNOWLEDGE_SYNC', target: 'knowledge-sync-skill' }
  ];

  for (const { query, context, expected, target } of tracks) {
    const c = classifyQueryIntent(query, context);
    assert.strictEqual(c.intent, expected, `Query "${query}" should classify as ${expected}`);
    assert.strictEqual(c.skillTarget, target, `Query "${query}" should target skill ${target}`);
  }
});
