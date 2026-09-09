'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

process.env.NODE_ENV = 'test';
const notebookRouter = require('../../dashboard/routes/notebook.cjs');

async function withServer(run) {
  const app = express();
  app.use(express.json());
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

test('HITL ambiguity routes fail closed without evidence or exact product scope', async () => {
  await withServer(async baseUrl => {
    const missingEvidence = await fetch(`${baseUrl}/api/resolve-ambiguity`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chassis: 'DL380_Gen12',
        affectedSku: 'P73299-B21',
        ruleUpdate: 'This candidate rule needs evidence before it can become active.',
        humanReasoning: 'The reviewer has not attached evidence to this proposed decision.',
        reviewer: 'test-reviewer',
        scopeTaxonomy: 'CHASSIS_SPECIFIC'
      })
    });
    assert.equal(missingEvidence.status, 400);

    const ambiguousProduct = await fetch(`${baseUrl}/api/resolve-ambiguity`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chassis: 'unknown product generation',
        affectedSku: 'P73299-B21',
        ruleUpdate: 'This candidate rule must not cross product-generation boundaries.',
        humanReasoning: 'No exact product-generation catalog exists for this review target.',
        reviewer: 'test-reviewer',
        confirmedVerified: true,
        scopeTaxonomy: 'CHASSIS_SPECIFIC',
        evidence: [{ type: 'OFFICIAL_QUICKSPECS', id: 'QS-404' }]
      })
    });
    assert.equal(ambiguousProduct.status, 404);

    const simulatedWithoutScope = await fetch(`${baseUrl}/api/simulate-error`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ errorMessage: 'P73299-B21 requires P48820-B21' })
    });
    assert.equal(simulatedWithoutScope.status, 400);

    const crossProductLearning = await fetch(`${baseUrl}/api/notebook-query-async`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: 'Check a product-specific dependency.',
        chassis: 'DL380_Gen12',
        learningEligible: true,
        chassisDir: 'ProLiant/Gen12/DL380a_Gen12'
      })
    });
    assert.equal(crossProductLearning.status, 409, 'Notebook learning cannot persist into another product generation');
  });
});

test('Notebook advisory response exposes grounding state and cannot silently learn', async () => {
  await withServer(async baseUrl => {
    const response = await fetch(`${baseUrl}/api/ask-notebook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: 'Is SKU A compatible with SKU B?', chassis: 'UNCONFIGURED_TEST_CHASSIS' })
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.isCloudGrounded, false);
    assert.equal(body.groundingVerification, 'UNVERIFIED');
    assert.equal(body.learningEligible, false);
    assert.ok(Array.isArray(body.citations));
  });
});
