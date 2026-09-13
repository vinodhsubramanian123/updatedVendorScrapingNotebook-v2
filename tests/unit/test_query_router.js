'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { classifyQueryIntent, executeRoutedQuery } = require('../../scripts/evaluators/route_query.js');

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

