'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { runCircularAnalysis } = require('../../scripts/maintenance/analyze_circular_deps.js');
const { analyzeFile } = require('../../scripts/maintenance/analyze_complexity.js');

test('Circular Dependencies & Cyclomatic Complexity Guardrails', async (t) => {
  const rootDir = path.resolve(__dirname, '../..');

  await t.test('Circular Dependency Audit: zero module cycles across entire project DAG', () => {
    const { allFiles, cycles } = runCircularAnalysis();
    assert.ok(allFiles.length > 50, `Expected > 50 scanned files, found ${allFiles.length}`);

    if (cycles.length > 0) {
      console.error('Circular dependency cycles detected:', JSON.stringify(cycles, null, 2));
    }
    assert.strictEqual(cycles.length, 0, `Expected 0 circular dependencies, found ${cycles.length}`);
  });

  await t.test('Complexity Audit: product_meta.js synthesizeSubcategoryName CC <= 15', () => {
    const filePath = path.resolve(rootDir, 'scripts/lib/catalog/product_meta.js');
    const result = analyzeFile(filePath);
    assert.ok(result, 'Expected complexity result for product_meta.js');

    const fn = result.functions.find(f => f.name === 'synthesizeSubcategoryName');
    assert.ok(fn, 'Expected synthesizeSubcategoryName function to exist');
    assert.ok(fn.complexity <= 15, `Expected CC <= 15, got CC ${fn.complexity}`);
  });

  await t.test('Complexity Audit: support_manufacturing.js evalSupportManufacturing CC <= 15', () => {
    const filePath = path.resolve(rootDir, 'scripts/lib/aspects/support_manufacturing.js');
    const result = analyzeFile(filePath);
    assert.ok(result, 'Expected complexity result for support_manufacturing.js');

    const fn = result.functions.find(f => f.name === 'evalSupportManufacturing');
    assert.ok(fn, 'Expected evalSupportManufacturing function to exist');
    assert.ok(fn.complexity <= 15, `Expected CC <= 15, got CC ${fn.complexity}`);
  });

  await t.test('Complexity Audit: pcie_riser.js evalPcieRiserSlots CC <= 15', () => {
    const filePath = path.resolve(rootDir, 'scripts/lib/aspects/pcie_riser.js');
    const result = analyzeFile(filePath);
    assert.ok(result, 'Expected complexity result for pcie_riser.js');

    const fn = result.functions.find(f => f.name === 'evalPcieRiserSlots');
    assert.ok(fn, 'Expected evalPcieRiserSlots function to exist');
    assert.ok(fn.complexity <= 15, `Expected CC <= 15, got CC ${fn.complexity}`);
  });

  await t.test('Complexity Audit: storage_tri_mode.js evalStorageTriMode CC <= 20', () => {
    const filePath = path.resolve(rootDir, 'scripts/lib/aspects/storage_tri_mode.js');
    const result = analyzeFile(filePath);
    assert.ok(result, 'Expected complexity result for storage_tri_mode.js');

    const fn = result.functions.find(f => f.name === 'evalStorageTriMode');
    assert.ok(fn, 'Expected evalStorageTriMode function to exist');
    assert.ok(fn.complexity <= 20, `Expected CC <= 20, got CC ${fn.complexity}`);
  });

  await t.test('Complexity Audit: networking_ocp.js evalNetworkingOcp CC <= 15', () => {
    const filePath = path.resolve(rootDir, 'scripts/lib/aspects/networking_ocp.js');
    const result = analyzeFile(filePath);
    assert.ok(result, 'Expected complexity result for networking_ocp.js');

    const fn = result.functions.find(f => f.name === 'evalNetworkingOcp');
    assert.ok(fn, 'Expected evalNetworkingOcp function to exist');
    assert.ok(fn.complexity <= 15, `Expected CC <= 15, got CC ${fn.complexity}`);
  });
});
