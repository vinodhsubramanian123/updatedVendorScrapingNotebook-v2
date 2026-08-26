'use strict';
/**
 * tests/unit/test_query_sanitizer.js
 *
 * Tests for scripts/lib/notebook/query_sanitizer.js:
 * - SCRIPTING_PATTERNS removal and prompt injection resistance
 * - classifyQueryScenario for all 9 scenarios
 * - stripAnsi ANSI color code removal
 * - sanitizeNotebookQuery with various server/storage product families
 * - getSanitizationBreakdown step-by-step reporting
 */

const test = require('node:test');
const assert = require('node:assert');
const {
  SCRIPTING_PATTERNS,
  classifyQueryScenario,
  stripAnsi,
  sanitizeNotebookQuery,
  getSanitizationBreakdown
} = require('../../scripts/lib/notebook/query_sanitizer.js');

test('classifyQueryScenario correctly classifies all 9 domain scenarios', () => {
  assert.strictEqual(classifyQueryScenario('Need human reasoning delta ambiguity resolution'), 'AMBIGUITY_HITL');
  assert.strictEqual(classifyQueryScenario('Intel Xeon 64-core processor TDP details'), 'PROCESSOR_SPECS');
  assert.strictEqual(classifyQueryScenario('-48VDC power supply with DC terminal lug cable'), 'TELCO_DC');
  assert.strictEqual(classifyQueryScenario('Smart Storage Battery backup for MR416i controller cache'), 'STORAGE_CACHE');
  assert.strictEqual(classifyQueryScenario('DDR5 DIMM memory channel interleaving and balance rules'), 'MEMORY_SYMMETRY');
  assert.strictEqual(classifyQueryScenario('PCIe tertiary riser slot and GPU lane allocation'), 'PCIE_EXPANSION');
  assert.strictEqual(classifyQueryScenario('Multi-node CTO multiplier and chassis qty breakdown'), 'MULTI_NODE_CTO');
  assert.strictEqual(classifyQueryScenario('High performance fan kit and heatsink cooling for high TDP'), 'THERMAL_TDP');
  assert.strictEqual(classifyQueryScenario('What are the standard dimensions and mounting rail kits?'), 'GENERAL_QUICKSPECS');
});

test('stripAnsi removes ANSI escape sequences', () => {
  assert.strictEqual(stripAnsi('\u001b[32mPASS\u001b[0m'), 'PASS');
  assert.strictEqual(stripAnsi('\u001b[1;31mERROR\u001b[0m: Test failed'), 'ERROR: Test failed');
  assert.strictEqual(stripAnsi(null), '');
});

test('sanitizeNotebookQuery cleans code snippets and reconstructs natural language query', () => {
  const dirtyQuery = `
    const fs = require('fs');
    function evaluate() {
      process.exit(1);
    }
    Can I use P49610-B21 with P52559-B21?
  `;

  const cleaned = sanitizeNotebookQuery(dirtyQuery, { chassis: 'DL380_Gen12_SFF' });
  assert.ok(!cleaned.includes('const fs'));
  assert.ok(!cleaned.includes('require('));
  assert.ok(!cleaned.includes('process.exit'));
  assert.ok(cleaned.includes('P49610-B21'));
  assert.ok(cleaned.includes('P52559-B21'));
  assert.ok(cleaned.includes('DL380_Gen12_SFF') || cleaned.includes('DL380'));
});

test('sanitizeNotebookQuery generates default queries for empty inputs with context', () => {
  const defaultQuery = sanitizeNotebookQuery('', {
    chassis: 'DL380_Gen12_SFF',
    skus: ['P49610-B21', 'P43322-B21']
  });

  assert.ok(defaultQuery.includes('DL380_Gen12_SFF'));
  assert.ok(defaultQuery.includes('P49610-B21'));
  assert.ok(defaultQuery.includes('P43322-B21'));
});

test('sanitizeNotebookQuery prepends appropriate family product scopes', () => {
  const alletra = sanitizeNotebookQuery('What are the drive cage requirements?', { chassis: 'Alletra_Storage_System' });
  assert.ok(alletra.includes('Storage System'));

  const synergy = sanitizeNotebookQuery('Interconnect uplink bandwidth', { chassis: 'HPE Synergy VC 100Gb F32 Module' });
  assert.ok(synergy.includes('Interconnect & Frame Module') || synergy.includes('Synergy'));

  const tape = sanitizeNotebookQuery('LTO-9 drive compatibility', { chassis: 'MSL3040_Tape' });
  assert.ok(tape.includes('Tape Library System') || tape.includes('StoreEver'));

  const cray = sanitizeNotebookQuery('Direct liquid cooling manifold', { chassis: 'GX5000_General_RACK' });
  assert.ok(cray.includes('Supercomputing System') || cray.includes('Cray'));
});

test('getSanitizationBreakdown outputs full diagnostic step report', () => {
  const report = getSanitizationBreakdown(
    'const exec = require("child_process"); Check P49610-B21 processor compatibility',
    { chassis: 'DL380_Gen12_SFF' }
  );

  assert.strictEqual(report.containsCode, true);
  assert.ok(report.extractedSkus.includes('P49610-B21'));
  assert.strictEqual(report.productScope.family, 'ProLiant');
  assert.ok(report.sanitizationSteps.length >= 3);
  assert.ok(report.cliCommandPreview.startsWith('nlm notebook query'));
});
