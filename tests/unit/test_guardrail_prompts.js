'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { buildGuardrailSystemPrompt } = require('../../scripts/lib/prompts/guardrail_prompt.js');
const {
  classifyQueryScenario,
  stripAnsi,
  sanitizeNotebookQuery,
  getSanitizationBreakdown
} = require('../../scripts/lib/notebook/query_sanitizer.js');

test('Guardrail Prompt Factory & Query Sanitizer Unit Tests', async (t) => {
  await t.test('1. Prompt template construction', async (t2) => {
    await t2.test('buildGuardrailSystemPrompt builds v1 prompt with chassis', () => {
      const prompt = buildGuardrailSystemPrompt('DL380_Gen12_SFF');
      assert.ok(prompt.includes('You are the HPE BOQ Evaluation Orchestrator'));
      assert.ok(prompt.includes('chassis: DL380_Gen12_SFF'));
      assert.ok(prompt.includes("Call 'simulate_build'"));
    });

    await t2.test('buildGuardrailSystemPrompt with varied conflict types / workload DNA in chassisId', () => {
      const chassisStr = 'DL380_Gen12_SFF (Workload: AI/ML GPU Heavy, Conflict: Power Thermal)';
      const prompt = buildGuardrailSystemPrompt(chassisStr);
      assert.ok(prompt.includes(chassisStr));
    });

    await t2.test('buildGuardrailSystemPrompt throws on unknown version', () => {
      assert.throws(() => {
        buildGuardrailSystemPrompt('DL380_Gen12_SFF', 'v99');
      }, /Unknown guardrail prompt version: 'v99'/);
    });
  });

  await t.test('2. NLP query sanitization edge cases', async (t2) => {
    await t2.test('classifyQueryScenario mapping', () => {
      assert.strictEqual(classifyQueryScenario('fix the ambiguity'), 'AMBIGUITY_HITL');
      assert.strictEqual(classifyQueryScenario('64-core xeon'), 'PROCESSOR_SPECS');
      assert.strictEqual(classifyQueryScenario('telco -48v lug'), 'TELCO_DC');
      assert.strictEqual(classifyQueryScenario('smart storage battery cache'), 'STORAGE_CACHE');
      assert.strictEqual(classifyQueryScenario('memory channel interleaving dimm'), 'MEMORY_SYMMETRY');
      assert.strictEqual(classifyQueryScenario('gpu pcie riser slot'), 'PCIE_EXPANSION');
      assert.strictEqual(classifyQueryScenario('multiplier cto node'), 'MULTI_NODE_CTO');
      assert.strictEqual(classifyQueryScenario('fan heatsink thermal tdp'), 'THERMAL_TDP');
      assert.strictEqual(classifyQueryScenario('what are the general rules'), 'GENERAL_QUICKSPECS');
    });

    await t2.test('stripAnsi removes escape sequences', () => {
      assert.strictEqual(stripAnsi('\u001b[31mError\u001b[0m'), 'Error');
      assert.strictEqual(stripAnsi(null), '');
    });

    await t2.test('sanitizeNotebookQuery strips code and reconstructs natural language query', () => {
      const raw = 'const fs = require("fs"); console.log("hack"); part P11111-B21';
      const clean = sanitizeNotebookQuery(raw);
      assert.ok(clean.includes('What are the hardware configuration rules'));
      assert.ok(clean.includes('P11111-B21'));
      assert.ok(!clean.includes('const fs'));
    });

    await t2.test('sanitizeNotebookQuery cleans noisy characters, quotes and braces', () => {
      const raw = '```javascript\nquery\n``` { "part": "P12345-B21" } $ \\ `';
      const clean = sanitizeNotebookQuery(raw);
      assert.ok(!clean.includes('```'));
      assert.ok(!clean.includes('javascript'));
      assert.ok(!clean.includes('{'));
      assert.ok(!clean.includes('}'));
      assert.ok(!clean.includes('$'));
      assert.ok(!clean.includes('\\'));
    });

    await t2.test('sanitizeNotebookQuery prepends scope when chassis not mentioned', () => {
      const raw = 'tell me about the rules';
      const clean = sanitizeNotebookQuery(raw, { chassis: 'DL380 Gen12' });
      assert.ok(clean.includes('For ProLiant Gen12 DL380 Gen12 Server: tell me about the rules'));
    });

    await t2.test('getSanitizationBreakdown handles prompt injection analysis', () => {
      const raw = 'module.exports = function() { return "bad"; } P22222-B21';
      const breakdown = getSanitizationBreakdown(raw);
      assert.strictEqual(breakdown.containsCode, true);
      assert.ok(breakdown.extractedSkus.includes('P22222-B21'));
      assert.ok(breakdown.sanitizationSteps.some(s => s.includes('Detected Node.js code')));
    });
  });

  await t.test('3. Fallback prompt generation when metadata missing', async (t2) => {
    await t2.test('sanitizeNotebookQuery with empty query and empty context', () => {
      const clean = sanitizeNotebookQuery('');
      assert.strictEqual(
        clean,
        'What are the hardware configuration rules and QuickSpecs specifications for HPE ProLiant DL380 Gen12 SFF?'
      );
    });

    await t2.test('sanitizeNotebookQuery with empty query but provided SKUs', () => {
      const clean = sanitizeNotebookQuery('', { skus: ['P11111-B21', 'P22222-B21'] });
      assert.strictEqual(
        clean,
        'What are the hardware configuration rules, memory rules, and QuickSpecs specifications for HPE ProLiant DL380 Gen12 SFF regarding parts: P11111-B21, P22222-B21?'
      );
    });

    await t2.test('sanitizeNotebookQuery falls back to default chassis if missing', () => {
      const clean = sanitizeNotebookQuery('what is the meaning of life?');
      assert.ok(clean.includes('For ProLiant Gen12 HPE ProLiant DL380 Gen12 SFF Server'));
    });

    await t2.test('sanitizeNotebookQuery limits parts string on long descriptions', () => {
      const items = [{ sku: 'P12345-B21', description: 'Very long description '.repeat(20) }];
      const rawQuery = 'validate '.repeat(150);
      const clean = sanitizeNotebookQuery(rawQuery, { items });
      assert.ok(clean.includes('Validate physical hardware configuration rules'));
      assert.ok(clean.length < 2000); // Should be bounded by the string slice
    });
  });
});
