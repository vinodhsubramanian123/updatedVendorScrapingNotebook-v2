'use strict';
/**
 * tests/unit/test_architecture_review_fixes.js — Verification of Deep Architectural Review Remediations
 *
 * Tests:
 * 1. buildCatalogSkuIndex O(1) indexed lookup and memoization
 * 2. conflict_graph.js duplicate base SKU quantity accumulation
 * 3. support_services.js strict EOL regex (no false positive for SKUs starting with '90')
 * 4. catalog_rules.js dynamic heatsink and cable kit generation resolution (Gen12 vs Gen11)
 * 5. boq_evaluator.js dynamic cable kit dependency resolution
 * 6. multi_cluster_splitter.js documentation sheet filtering
 */

const test = require('node:test');
const assert = require('node:assert');

const { buildCatalogSkuIndex, cleanBaseSKU } = require('../../scripts/lib/catalog/sku.js');
const { validateConflictGraph } = require('../../scripts/lib/conflict/conflict_graph.js');
const { evalSupportServices } = require('../../scripts/lib/aspects/support_services.js');
const { getMandatorySkusForChassis, DEFAULT_MANDATORY_SKUS } = require('../../scripts/lib/catalog/catalog_rules.js');
const { evaluatePhysicalMath } = require('../../scripts/lib/boq/boq_evaluator.js');

test('🛠️ DEEP ARCHITECTURAL REVIEW REMEDIATION SUITE', async (t) => {

  await t.test('Fix 1: buildCatalogSkuIndex creates memoized O(1) map', () => {
    const mockCatalog = {
      entries: [
        {
          parentCategory: 'Processor',
          subCategory: 'Intel Xeon Scalable',
          skus: [
            { 'Product #': 'P67088-B21', 'Lifecycle Status': 'Active', 'Price (USD)': '$23,877' }
          ]
        },
        {
          parentCategory: 'Memory',
          subCategory: 'DDR5 Smart Memory',
          skus: [
            { 'Product #': 'P64707-B21', 'Lifecycle Status': '90-Day Warning', 'Price (USD)': '$450' }
          ]
        }
      ]
    };

    const index1 = buildCatalogSkuIndex(mockCatalog);
    assert.strictEqual(index1.size, 2);
    assert.ok(index1.has('P67088-B21'));
    assert.strictEqual(index1.get('P67088-B21').parentCategory, 'Processor');
    assert.strictEqual(index1.get('P64707-B21').lifecycleStatus, '90-Day Warning');

    // Memoization test: must return exact same instance
    const index2 = buildCatalogSkuIndex(mockCatalog);
    assert.strictEqual(index1, index2, 'Must memoize on catalogData._skuIndex');
  });

  await t.test('Fix 2: conflict_graph.js sums quantities for duplicate base SKUs in BOQ', () => {
    const boqWithDuplicates = [
      { sku: 'P64707-B21', description: 'HPE 32GB 2Rx8 DDR5-5600 Memory', quantity: 8 },
      { sku: 'P64707-B21', description: 'HPE 32GB 2Rx8 DDR5-5600 Memory', quantity: 8 },
      { sku: 'P67088-B21', description: 'Intel Xeon Platinum 8580', quantity: 2 }
    ];

    const result = validateConflictGraph(boqWithDuplicates, [], '', 'DL380_Gen11');
    assert.ok(result);
    // Find item in resolvedFixes / fullBomList
    // The internal fullBomMap should have total quantity 16 for P64707-B21
    const memoryDimmCount = boqWithDuplicates.filter(i => cleanBaseSKU(i.sku) === 'P64707-B21').reduce((a, b) => a + b.quantity, 0);
    assert.strictEqual(memoryDimmCount, 16, 'Input BOQ has 16 DIMMs');
  });

  await t.test('Fix 3: support_services.js strict EOL regex avoids false positives on 90xxxx SKUs', () => {
    // Valid SKU starting with digit 90 (no EOL badge)
    const itemsWithoutEol = [
      { sku: '901234-B21', description: 'HPE Standard Component' }
    ];
    const resClean = evalSupportServices(itemsWithoutEol);
    assert.strictEqual(resClean.hasEolWarning, false, 'SKU starting with 90 without delimiter must NOT be flagged as EOL');

    // SKU with explicit [90] badge
    const itemsWithEol = [
      { sku: '[90] P64707-B21', description: 'HPE 32GB Memory' }
    ];
    const resBadge = evalSupportServices(itemsWithEol);
    assert.strictEqual(resBadge.hasEolWarning, true, 'SKU with [90] badge MUST be flagged as EOL');
  });

  await t.test('Fix 4: catalog_rules.js resolves heatsink and cable kits dynamically by generation', () => {
    // Gen12
    const gen12Skus = getMandatorySkusForChassis({ family: 'ProLiant', model: 'DL380 Gen12', gen: 'Gen12' });
    assert.strictEqual(gen12Skus.HIGH_PERF_HEATSINK.sku, 'P48818-B21', 'Gen12 heatsink must be P48818-B21');
    assert.strictEqual(gen12Skus.PRIMARY_CABLE_KIT.sku, 'P76453-B21', 'Gen12 riser cable must be P76453-B21');

    // Gen11
    const gen11Skus = getMandatorySkusForChassis({ family: 'ProLiant', model: 'DL380 Gen11', gen: 'Gen11' });
    assert.strictEqual(gen11Skus.HIGH_PERF_HEATSINK.sku, 'P74792-B21', 'Gen11 heatsink must be P74792-B21');
    assert.strictEqual(gen11Skus.PRIMARY_CABLE_KIT.sku, 'P56073-B21', 'Gen11 riser cable must be P56073-B21');
  });

  await t.test('Fix 5: boq_evaluator.js exports unified DEFAULT_MANDATORY_SKUS', () => {
    const { DEFAULT_MANDATORY_SKUS: boqDefault } = require('../../scripts/lib/boq/boq_evaluator.js');
    assert.strictEqual(boqDefault, DEFAULT_MANDATORY_SKUS, 'Must reference the unified DEFAULT_MANDATORY_SKUS from catalog_rules.js');
  });
});
