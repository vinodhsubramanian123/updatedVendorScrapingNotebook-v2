'use strict';
/**
 * tests/integration/test_cross_solution_and_vendor_comparison.js
 * Integration tests for Wave D: multi-platform buildable comparison, GPUs,
 * day2Runway, nullable TCO integrity, and cross-vendor equivalence with closure.
 */

const assert = require('assert');
const { extractComparisonSpec, compareSolutionsAcrossPlatforms } = require('../../scripts/lib/boq/solution_comparator.js');
const { mapSourceBomToTargetCatalog } = require('../../scripts/lib/boq/attribute_equivalence_mapper.js');
const { transformCompetitorQuote } = require('../../scripts/lib/boq/cross_vendor_transformer.js');

let passed = 0;
function test(name, fn) {
  fn();
  console.log(`  PASS: ${name}`);
  passed++;
}

function makeMockCatalog(model, chSku, cpuSku, memSku, drvSku, psuSku, gpuSku = null) {
  const entries = [
    { parentCategory: 'Base Chassis', subCategory: 'CTO Server', skus: [{ 'Product #': chSku, Description: `HPE ProLiant ${model} 8SFF CTO Server`, 'GPL ($)': 2000, 'Unit Price (USD)': 2000, Availability: 'Available' }] },
    { parentCategory: 'Processor', subCategory: 'Processor', skus: [{ 'Product #': cpuSku, Description: 'Intel Xeon Gold 6430 2.1GHz 32-core 270W Processor', 'GPL ($)': 2200, 'Unit Price (USD)': 2200, Availability: 'Available' }] },
    { parentCategory: 'Memory', subCategory: 'DDR5 RDIMM', skus: [{ 'Product #': memSku, Description: 'HPE 64GB 2Rx4 DDR5-4800 Smart Memory FIO Kit', 'GPL ($)': 500, 'Unit Price (USD)': 500, Availability: 'Available' }] },
    { parentCategory: 'Hard Drives', subCategory: 'NVMe SSD', skus: [{ 'Product #': drvSku, Description: 'HPE 3.84TB NVMe Read Intensive SFF SSD', 'GPL ($)': 1100, 'Unit Price (USD)': 1100, Availability: 'Available' }] },
    { parentCategory: 'Power Supplies', subCategory: 'Flex Slot', skus: [{ 'Product #': psuSku, Description: 'HPE 1600W Flex Slot Platinum Hot Plug Power Supply', 'GPL ($)': 420, 'Unit Price (USD)': 420, Availability: 'Available' }] }
  ];
  if (gpuSku) {
    entries.push({ parentCategory: 'GPU / Accelerator', subCategory: 'Accelerator', skus: [{ 'Product #': gpuSku, Description: 'NVIDIA L40S 48GB PCIe GPU Accelerator', 'GPL ($)': 8500, 'Unit Price (USD)': 8500, Availability: 'Available' }] });
  }
  return { metadata: { productId: model }, entries };
}

console.log('=== WAVE D CROSS-SOLUTION & CROSS-VENDOR COMPARATOR SUITE ===');

test('extractComparisonSpec parses GPUs, FC ports, ambient temp, and workload tier', () => {
  const spec = extractComparisonSpec('Compare DL380 Gen12 vs DL380a Gen12 with 64 cores, 512GB RAM, 4x L40S GPUs, 2 FC ports at 35C ambient for AI inference');
  assert.strictEqual(spec.cores, 64);
  assert.strictEqual(spec.ramGb, 512);
  assert.strictEqual(spec.gpuCount, 4);
  assert.strictEqual(spec.gpuModel, 'L40S');
  assert.strictEqual(spec.fcPorts, 2);
  assert.strictEqual(spec.ambientTempC, 35);
  assert.strictEqual(spec.workloadTier, 'AI');
});

test('compareSolutionsAcrossPlatforms includes buildability, day2Runway, rightSizedNodesMin, and nullable TCO', () => {
  const cat380 = makeMockCatalog('DL380_Gen12', 'P73282-B21', 'P67082-B21', 'P64707-F21', 'P40544-B21', 'P38997-B21', 'S0K89A');
  const cat380a = makeMockCatalog('DL380a_Gen12', 'P76706-B21', 'P67082-B21', 'P64707-F21', 'P40544-B21', 'P44712-B21', 'S0K89A');
  const catalogs = [
    { id: 'DL380_Gen12', name: 'DL380 Gen12' },
    { id: 'DL380a_Gen12', name: 'DL380a Gen12' }
  ];
  const baseOpts = {
    catalogs,
    catalogDataById: { DL380_Gen12: cat380, DL380a_Gen12: cat380a }
  };

  // Without powerRateUsdPerKwh, TCO strictly stays null (INV-33)
  const noRate = compareSolutionsAcrossPlatforms({ platforms: ['DL380_Gen12', 'DL380a_Gen12'], cores: 32, ramGb: 256, usableTb: 10, gpuCount: 4, gpuModel: 'L40S' }, baseOpts);
  assert.strictEqual(noRate.comparisonMatrix.length, 2);
  const row380 = noRate.comparisonMatrix.find(r => r.platform === 'DL380_Gen12');
  const row380a = noRate.comparisonMatrix.find(r => r.platform === 'DL380a_Gen12');
  assert.strictEqual(row380.tco3YearUsd, null);
  assert.ok(row380.rightSizedNodesMin >= 2, '4 DW GPUs requires >= 2 DL380 nodes');
  assert.strictEqual(row380a.rightSizedNodesMin, 1, '4 DW GPUs fits in 1 DL380a node');
  assert.ok(row380a.day2Runway.maxDoubleWideGpus >= 8);

  // With explicit powerRateUsdPerKwh, TCO computes numerically
  const withRate = compareSolutionsAcrossPlatforms({ platforms: ['DL380a_Gen12'], cores: 32, ramGb: 256, powerRateUsdPerKwh: 0.12 }, baseOpts);
  assert.ok(withRate.comparisonMatrix[0].tco3YearUsd > 0);
  assert.ok(withRate.comparisonMatrix[0].tco5YearUsd > withRate.comparisonMatrix[0].tco3YearUsd);
});

test('mapSourceBomToTargetCatalog maps competitor BOM with GPU + Storage Controller and runs buildability closure', () => {
  const targetCat = makeMockCatalog('DL380_Gen12', 'P73282-B21', 'P67082-B21', 'P64707-F21', 'P40544-B21', 'P38997-B21', 'S0K89A');
  const sourceItems = [
    { sku: 'DELL-CPU-1', description: 'Intel Xeon Gold 6430 2.1GHz 32C Processor', quantity: 2 },
    { sku: 'DELL-GPU-1', description: 'NVIDIA L40S 48GB PCIe GPU', quantity: 2 }
  ];
  const res = mapSourceBomToTargetCatalog(sourceItems, targetCat, { sourceVendor: 'Dell', targetVendor: 'HPE' });
  assert.strictEqual(res.matchedLinesCount, 2);
  assert.ok(res.buildabilityClosure);
  assert.strictEqual(res.buildabilityClosure.status, 'BUILDABLE');
});

test('transformCompetitorQuote attaches equivalenceMapping with buildabilityClosure for Dell R760 -> HPE', () => {
  const targetCat = makeMockCatalog('DL380_Gen12', 'P73282-B21', 'P67082-B21', 'P64707-F21', 'P40544-B21', 'P38997-B21');
  const transformed = transformCompetitorQuote(
    'Dell PowerEdge R760, 2x Xeon 6430 32-core, 512GB DDR5, 2x 1600W PSU',
    'Dell',
    'DL380_Gen12',
    {
      sourceItems: [{ sku: 'R760-CPU', description: 'Intel Xeon Gold 6430 32-core Processor', quantity: 2 }],
      targetCatalogData: targetCat
    }
  );
  assert.ok(transformed.equivalenceMapping?.buildabilityClosure);
});

console.log(`\nSUMMARY: ${passed} passed, 0 failed`);
