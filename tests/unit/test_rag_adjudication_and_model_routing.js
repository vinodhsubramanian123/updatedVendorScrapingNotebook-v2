'use strict';

const assert = require('node:assert');
const { resolveModelForTask } = require('../../scripts/lib/system/gemini_rotator.js');
const {
  extractRagClaimsWithNegationGuard,
  _detectOpinionDiscrepancy,
  _evaluateRagGroundingAndViolations
} = require('../../scripts/lib/boq/pipeline/eval_boq_rag_stage.js');
const { buildGuardrailSystemPrompt, ACTIVE_VERSION } = require('../../scripts/lib/prompts/guardrail_prompt.js');
const { coordinateMultiNotebookQueries } = require('../../scripts/lib/notebook/multi_notebook_coordinator.js');

async function runTests() {
  console.log('=== WAVE E MODEL ROUTING & RAG ADJUDICATION TEST SUITE ===');
  let passed = 0;
  let failed = 0;

  async function runCase(name, fn) {
    try {
      await fn();
      passed++;
      console.log(`  PASS: ${name}`);
    } catch (err) {
      failed++;
      console.error(`  FAIL: ${name} -> ${err.message}`);
    }
  }

  await runCase('resolveModelForTask routes tier defaults from model_routing.json and honors overrides', () => {
    const prevGlobal = process.env.GEMINI_MODEL_NAME;
    delete process.env.GEMINI_MODEL_NAME;
    try {
      const ocr = resolveModelForTask('ocr_vision');
      const deep = resolveModelForTask('reasoning_deep');
      const audit = resolveModelForTask('adversarial_audit');
      const custom = resolveModelForTask('guardrail_fast', { model: 'gemini-3.8-flash' });

      assert.strictEqual(ocr.model, 'gemini-3.6-flash');
      assert.strictEqual(deep.model, 'gemini-3.7-flash');
      assert.strictEqual(audit.model, 'gemini-3.7-flash');
      assert.strictEqual(custom.model, 'gemini-3.8-flash');
      assert.ok(Array.isArray(deep.fallbackModels) && deep.fallbackModels.length >= 2);
    } finally {
      if (prevGlobal !== undefined) process.env.GEMINI_MODEL_NAME = prevGlobal;
    }
  });

  await runCase('extractRagClaimsWithNegationGuard avoids false positives on negated incompatibility', () => {
    const benignNeg = extractRagClaimsWithNegationGuard('Audit complete. There are NO incompatible drives and zero conflicts detected in this BOM.');
    assert.strictEqual(benignNeg.flagsViolation, false, 'Negated incompatibility/conflicts must not flag violation');

    const badCompliance = extractRagClaimsWithNegationGuard('This chassis configuration is NOT compatible with 350W CPUs without high-performance fans.');
    assert.strictEqual(badCompliance.claimsFullyCompliant, false, 'Negated compatibility must never count as compliant');
    assert.strictEqual(badCompliance.flagsViolation, true);

    const evalRes = {
      errors: ['Critical thermal deficit'],
      warnings: [],
      notebookLmStatus: { isCloudGrounded: true, citationsCount: 2 },
      conflictGraph: { rankedSolutions: [{}] }
    };
    _detectOpinionDiscrepancy(evalRes, { answer: 'Everything is 100% buildable and fully compatible.' });
    _evaluateRagGroundingAndViolations(evalRes, { answer: 'Everything is 100% buildable and fully compatible.', citations: [{ title: 'QS' }] });
    assert.strictEqual(evalRes.opinionDiscrepancies.length, 1);
    assert.strictEqual(evalRes.ragVerified, false);
    assert.ok(evalRes.ragViolationDetected && evalRes.ragViolationDetected.includes('Manual review required'));
  });

  await runCase('Guardrail prompt v4 is active while preserving Synergy v3 headings and adding envelope guidance', () => {
    assert.strictEqual(ACTIVE_VERSION, 'v4');
    const prompt = buildGuardrailSystemPrompt('Synergy_12000_Frame');
    assert.ok(prompt.includes('Composite Cabling & Port-Budget Completeness'));
    assert.ok(prompt.includes('six physical planes'));
    assert.ok(prompt.includes('query_hardware_envelope'));
    assert.ok(prompt.includes('Negated-Claim & Contradiction Discipline'));
  });

  await runCase('coordinateMultiNotebookQueries bounds concurrency and separates mapped vs unmapped outcomes', async () => {
    const res = await coordinateMultiNotebookQueries(
      [
        { productKey: 'DL380_Gen12', notebookId: 'nb-dl380', query: 'Check PCIe limits' },
        { productKey: 'Alletra_MP_B10000', notebookId: 'nb-alletra', query: 'Check JBOF optics' },
        { productKey: 'Unmapped_Box', query: 'Unknown query' },
        { productKey: 'Failing_Box', notebookId: 'nb-fail', query: 'Failing query' }
      ],
      {
        concurrency: 2,
        notebookConfig: { notebooks: {} },
        queryFn: async (nbId) => {
          if (nbId === 'nb-fail') throw new Error('Simulated timeout');
          return { isCloudGrounded: true, citations: [{ source: nbId }], answer: `Verified ${nbId}`, source: 'CLOUD_NLM' };
        }
      }
    );
    assert.strictEqual(res.totalDomains, 4);
    assert.strictEqual(res.verifiedCount, 2);
    assert.strictEqual(res.unavailableCount, 2);
    assert.strictEqual(res.allGrounded, false);
  });

  await runCase('coordinateMultiNotebookQueries resolves notebook IDs from default notebooks.json by productKey', async () => {
    const seen = [];
    const res = await coordinateMultiNotebookQueries(
      [{ productKey: 'DL380_Gen12', query: 'Check PCIe risers' }],
      {
        queryFn: async (nbId, query) => {
          seen.push({ nbId, query });
          return { isCloudGrounded: true, citations: [{ source: nbId }], answer: 'OK', source: 'CLOUD_NLM' };
        }
      }
    );
    assert.strictEqual(res.verifiedCount, 1);
    assert.strictEqual(res.unavailableCount, 0);
    assert.strictEqual(res.results[0].status, 'VERIFIED_GROUNDED');
    assert.ok(seen[0].nbId && seen[0].nbId.length > 10);
  });

  console.log(`\nSUMMARY: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runTests();
