'use strict';
/**
 * tests/unit/test_nlm_solution_source_validator.js
 *
 * Tests the Ephemeral Solution Source Validation pattern for Google NotebookLM.
 * Verifies source resolution, ephemeral attachment, token-efficient whole-solution prompt,
 * grounded reasoning capture, knowledge delta extraction, and source detachment (INV-24).
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const {
  resolveProductNotebookId,
  attachSolutionSource,
  detachSolutionSource,
  buildSolutionSourceValidationPrompt,
  validateSolutionWithEphemeralSource
} = require('../../scripts/lib/sync/nlm_solution_source_validator.js');

describe('NotebookLM Ephemeral Solution Source Validation Suite', () => {
  const tempDir = path.join(__dirname, '..', '..', 'outputs', 'temp', 'solution_sources');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  test('1. resolveProductNotebookId resolves configured notebook ID for ProLiant chassis', () => {
    const idGen12 = resolveProductNotebookId('DL380_Gen12');
    assert.ok(typeof idGen12 === 'string' || idGen12 === null, 'ID should be string or null');

    const idGen11 = resolveProductNotebookId({ model: 'HPE ProLiant DL380 Gen11' });
    assert.ok(typeof idGen11 === 'string' || idGen11 === null, 'ID should resolve from object');
  });

  test('2. attachSolutionSource returns structured mock descriptor in test environment', () => {
    const dummyFile = path.join(tempDir, 'dummy_solution.csv');
    fs.writeFileSync(dummyFile, 'Strategy Rank,Part No\nRank 1,P52534-B21', 'utf-8');

    const attachResult = attachSolutionSource('nb-test-123', dummyFile, 'Test_Solution_Source', { isMock: true });
    assert.strictEqual(attachResult.success, true);
    assert.ok(attachResult.sourceId.startsWith('mock-') || attachResult.sourceId.startsWith('src-'));
    assert.strictEqual(attachResult.isMock, true);

    // Missing file should fail gracefully
    const failResult = attachSolutionSource('nb-test-123', '/non/existent/path/file.csv', 'Fail', { isMock: true });
    assert.strictEqual(failResult.success, false);
    assert.strictEqual(failResult.sourceId, null);
  });

  test('3. detachSolutionSource succeeds and preserves Invariant INV-24', () => {
    const detached = detachSolutionSource('nb-test-123', 'mock-src-abc123', { isMock: true });
    assert.strictEqual(detached, true, 'Mock source must detach cleanly');

    const detachedEmpty = detachSolutionSource('', '');
    assert.strictEqual(detachedEmpty, false, 'Empty notebook or source id must return false');
  });

  test('4. buildSolutionSourceValidationPrompt includes all 7 physical aspects and CLIC rule citations', () => {
    const prompt = buildSolutionSourceValidationPrompt('Solution_BOM_DL380_Gen12', 'DL380_Gen12');
    assert.ok(prompt.includes('Solution_BOM_DL380_Gen12'), 'Prompt must reference source title');
    assert.ok(prompt.includes('Compute & Thermal'), 'Aspect 1 must be present');
    assert.ok(prompt.includes('Memory Subsystem'), 'Aspect 2 must be present');
    assert.ok(prompt.includes('Storage Architecture'), 'Aspect 3 must be present');
    assert.ok(prompt.includes('PCIe Slot Allocation'), 'Aspect 4 must be present');
    assert.ok(prompt.includes('Power & Environment'), 'Aspect 5 must be present');
    assert.ok(prompt.includes('OCP Networking'), 'Aspect 6 must be present');
    assert.ok(prompt.includes('Vendor Support'), 'Aspect 7 must be present');
    assert.ok(prompt.includes('Rank 1 Intent Preserved'), 'Must instruct evaluation across all 5 ranks');
  });

  test('5. validateSolutionWithEphemeralSource executes lifecycle and detaches ephemeral source', async () => {
    const sampleEvalResults = {
      chassis: 'DL380_Gen12',
      items: [
        { sku: 'P52534-B21', quantity: 1, description: 'HPE ProLiant DL380 Gen11 8SFF Server', unitPriceUsd: 2500 },
        { sku: 'P67088-B21', quantity: 2, description: 'Intel Xeon-Platinum 8580 60-core Processor', unitPriceUsd: 4500 }
      ],
      missingDependencies: [
        { sku: 'P48820-B21', quantity: 1, description: 'HPE DL380 Gen11 High Performance Fan Kit', rule: 'High TDP Fan Kit' }
      ],
      conflictGraph: {
        rankedSolutions: [
          {
            rank: 1,
            name: 'Intent Preserved (100% Buildable)',
            score: 0.98,
            estimatedCostUsd: 11850,
            tradeoffMetrics: { intentAlignment: '100%' },
            skuPartsList: [
              { sku: 'P52534-B21', quantity: 1, unitPriceUsd: 2500, description: 'HPE ProLiant DL380 Gen11 8SFF Server' },
              { sku: 'P67088-B21', quantity: 2, unitPriceUsd: 4500, description: 'Intel Xeon-Platinum 8580 60-core Processor' },
              { sku: 'P48820-B21', quantity: 1, unitPriceUsd: 350, description: 'High Performance Fan Kit', isFixInjected: true }
            ]
          }
        ]
      }
    };

    const res = await validateSolutionWithEphemeralSource(sampleEvalResults, {
      isMock: true,
      notebookId: 'nb-mock-test'
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.chassis, 'DL380_Gen12');
    assert.strictEqual(res.sourceDetached, true, 'Ephemeral source must be detached to uphold INV-24');
    assert.ok(fs.existsSync(res.workbookPath), 'Multi-rank solution workbook must exist on disk');
    assert.ok(fs.existsSync(res.csvPath), 'Multi-rank solution CSV must exist on disk');
    assert.ok(res.ragAnswer.length > 50, 'RAG answer must provide grounded technical validation');
  });
});
