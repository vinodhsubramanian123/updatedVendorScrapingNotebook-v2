'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { classifyQueryIntent, executeRoutedQuery } = require('../../scripts/evaluators/route_query.js');

test('Single-SKU Routing — Standalone SKU inquiries route to CATALOG_INTELLIGENCE, never monolithic BOQ', () => {
  const standaloneCases = [
    'Check P74700-B21',
    'What is the price of P83526-B21?',
    'Price of P74700-B21',
    'Cost of P69727-F21',
    'P74700-B21',
    'Is P83526-B21 obsolete?',
    'Show lifecycle status for P74700-B21',
    'Check availability of P83526-B21'
  ];

  for (const query of standaloneCases) {
    const c = classifyQueryIntent(query);
    assert.strictEqual(
      c.intent,
      'CATALOG_INTELLIGENCE',
      `Query "${query}" should classify as CATALOG_INTELLIGENCE, got ${c.intent}`
    );
    assert.strictEqual(c.skillTarget, 'catalog-intelligence-skill');
    assert.ok(c.confidence >= 0.95, `Expected confidence >= 0.95 for "${query}", got ${c.confidence}`);
  }
});

test('Single-SKU Routing — Architectural compatibility questions route to FREEFORM_QA RAG', () => {
  const compatibilityCases = [
    'Can I install P74700-B21 in a DL380 Gen12?',
    'Does P83526-B21 work with dual GPU configurations?',
    'Why is P74700-B21 required for L40S accelerators?'
  ];

  for (const query of compatibilityCases) {
    const c = classifyQueryIntent(query);
    assert.strictEqual(
      c.intent,
      'FREEFORM_QA',
      `Query "${query}" should classify as FREEFORM_QA, got ${c.intent}`
    );
    assert.strictEqual(c.skillTarget, 'presales-query-router');
  }
});

test('Multi-SKU Routing — Two or more SKUs without file preserve BOQ_EVALUATION', () => {
  const multiSkuQuery = 'Evaluate these parts: P74700-B21 and P83526-B21 for server build';
  const c = classifyQueryIntent(multiSkuQuery);
  assert.strictEqual(c.intent, 'BOQ_EVALUATION');
  assert.strictEqual(c.skillTarget, 'boq-eval-skill');
});

test('HITL Ambiguity Triage — Ambiguous product platforms flag hitlRequired and supply ambiguityDetails', async () => {
  const ambiguousRes = await executeRoutedQuery('Size a DL380 server with 128GB RAM');

  assert.strictEqual(ambiguousRes.hitlRequired, true, 'hitlRequired must be true for ambiguous platform queries');
  assert.ok(ambiguousRes.classificationConfidence < 0.95, 'confidence must be below 0.95');
  assert.ok(ambiguousRes.ambiguityDetails, 'ambiguityDetails must be populated');
  assert.strictEqual(ambiguousRes.ambiguityDetails.chassisKey, 'AMBIGUOUS_PRODUCT');
  assert.ok(Array.isArray(ambiguousRes.ambiguityDetails.candidates));
  assert.ok(ambiguousRes.ambiguityDetails.candidates.some(c => c.includes('Gen11')));
  assert.ok(ambiguousRes.ambiguityDetails.candidates.some(c => c.includes('Gen12')));
});

test('HITL Ambiguity Triage — Explicit chassis resolves with high confidence and hitlRequired false', async () => {
  const resolvedRes = await executeRoutedQuery('What is the price of P73282-B21?', { chassisName: 'DL380_Gen12' });

  assert.strictEqual(resolvedRes.classification.intent, 'CATALOG_INTELLIGENCE');
  assert.strictEqual(resolvedRes.hitlRequired, false, 'Explicit chassis inquiry must not require HITL triage');
  assert.strictEqual(resolvedRes.classificationConfidence, 1.0);
  assert.strictEqual(resolvedRes.ambiguityDetails, null);
  assert.strictEqual(resolvedRes.result.targetSku, 'P73282-B21');
});
