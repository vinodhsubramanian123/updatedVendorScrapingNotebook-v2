'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompetitorSpecification, transformCompetitorQuote } = require('../../scripts/lib/boq/cross_vendor_transformer');
const { classifyQueryIntent, executeRoutedQuery } = require('../../scripts/evaluators/route_query');

test('unknown source requirements do not become a fixed hardware configuration', () => {
  const result = transformCompetitorQuote('Storage array equivalent', 'OTHER', 'OTHER_ARRAY');
  assert.equal(result.competitorSpec.compute.cpuModel, null);
  assert.equal(result.competitorSpec.memory.totalMemoryGb, null);
  assert.deepEqual(result.recommendedBom, []);
  assert.deepEqual(result.strategyMatrix, {});
  assert.equal(result.auditReport.is100PercentCompliant, false);
  assert.ok(result.auditReport.auditItems.every(item => item.status === 'NOT_EVALUATED'));
});

test('explicit source values replace historical CPU and memory defaults', () => {
  const spec = parseCompetitorSpecification('2x Intel Xeon Platinum 8480+ 56C 350W; 16x 32GB DDR5-4800 RDIMM', 'CISCO');
  assert.equal(spec.compute.cpuCores, 56);
  assert.equal(spec.compute.cpuModel, '8480+');
  assert.equal(spec.memory.totalMemoryGb, 512);
  assert.equal(spec.memory.memorySpeedMt, 4800);
});

test('candidate and source objects are preserved without quantity double multiplication', () => {
  const source = { compute: { cpuCount: 1 }, localDrives: { count: 3 } };
  const bom = [{ sku: 'EXAMPLE', quantity: 2 }];
  const result = transformCompetitorQuote(source, 'OTHER', 'EXACT_TARGET', { targetBom: bom, nodeMultiplier: 4 });
  assert.equal(result.candidateBom[0].quantity, 2);
  assert.equal(result.nodeMultiplier, 4);
  result.candidateBom[0].quantity = 99;
  assert.equal(bom[0].quantity, 2);
  assert.equal(result.competitorSpec.localDrives.count, 3);
  assert.throws(() => transformCompetitorQuote('', null, null, { nodes: 0 }));
});

test('ordinary competitor questions are not transformation requests', () => {
  assert.equal(classifyQueryIntent('What is a Dell PowerEdge R760?').intent, 'FREEFORM_QA');
  assert.equal(classifyQueryIntent('Convert Dell PowerEdge to HPE').intent, 'CROSS_VENDOR_TRANSFORMATION');
  assert.equal(classifyQueryIntent('Convert Dell to HPE', { intent: 'RFP_SIZING_TO_BOM' }).intent, 'RFP_SIZING_TO_BOM');
});

test('routed transformation reports missing target and rejects binary text ingestion', async () => {
  const result = await executeRoutedQuery('Convert Dell to HPE');
  assert.equal(result.result.status, 'TARGET_PRODUCT_REQUIRED');
  const binary = await executeRoutedQuery('Convert Dell to HPE', { filePath: 'quote.xlsx' });
  assert.equal(binary.result.status, 'STRUCTURED_TENDER_REQUIRED');
});
