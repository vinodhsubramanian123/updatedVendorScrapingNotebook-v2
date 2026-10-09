'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const { assertScrapedCatalogQuality } = require('../../scripts/lib/catalog/catalog_freshness_guard.js');
const { isApprovedUniversalPolicySku, APPROVED_UNIVERSAL_POLICY_SKUS, ruleAppliesToProduct, resolveProductIdentity } = require('../../scripts/lib/catalog/product_scope.js');
const { classifyKnowledgeScope, buildMasterKnowledgeRegistry } = require('../../scripts/lib/sync/knowledge_sync.js');
const { validateConflictGraph } = require('../../scripts/lib/conflict/conflict_graph.js');
const notebookConfig = require('../../scripts/config/notebooks.json');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const DL380_GEN12_DIR = path.join(PROJECT_ROOT, 'outputs', 'ProLiant', 'Gen12', 'DL380_Gen12');

// =========================================================================
// Test Suite 1: Scraped Data Quality & Pre-Sync Integrity Gate
// =========================================================================

test('assertScrapedCatalogQuality: certifies genuine promoted catalog without errors', () => {
  if (!fs.existsSync(DL380_GEN12_DIR)) return;
  const result = assertScrapedCatalogQuality(DL380_GEN12_DIR, {
    chassisName: 'DL380_Gen12',
    throwOnError: false
  });

  assert.equal(result.isValid, true);
  assert.equal(result.chassis, 'DL380_Gen12');
  assert.ok(result.totalHardwareSkus > 500, `Expected >500 HW SKUs, got ${result.totalHardwareSkus}`);
  assert.ok(result.totalServiceSkus > 400, `Expected >400 Service SKUs, got ${result.totalServiceSkus}`);
  assert.ok(result.categoriesCount >= 10, `Expected >= 10 categories, got ${result.categoriesCount}`);
  assert.deepEqual(result.errors, []);
});

test('assertScrapedCatalogQuality: catches non-existent directory', () => {
  const fakeDir = path.join(PROJECT_ROOT, 'outputs', 'Non_Existent_Product_123');
  const result = assertScrapedCatalogQuality(fakeDir, { throwOnError: false });
  assert.equal(result.isValid, false);
  assert.ok(result.errors.some(e => e.includes('does not exist')));
});

test('assertScrapedCatalogQuality: catches totalUniqueSKUs mismatch with entries count (INV-139)', () => {
  const mockCatalog = {
    metadata: {
      chassis: 'Mock_Server',
      totalUniqueSKUs: 999 // Intentionally bogus tally
    },
    entries: [
      {
        parentCategory: 'Processor',
        subCategory: 'Intel',
        skus: [
          { sku: 'P11111-B21', listPrice: 500.00, Description: 'Mock CPU 1' },
          { sku: 'P22222-B21', listPrice: 700.00, Description: 'Mock CPU 2' }
        ]
      },
      {
        parentCategory: 'Memory',
        subCategory: 'DDR5',
        skus: [
          { sku: 'P33333-B21', listPrice: 300.00, Description: 'Mock Memory' }
        ]
      },
      {
        parentCategory: 'Power Supply',
        subCategory: 'Platinum',
        skus: [
          { sku: 'P44444-B21', listPrice: 200.00, Description: 'Mock PSU' }
        ]
      }
    ]
  };

  const result = assertScrapedCatalogQuality(mockCatalog, { throwOnError: false });
  assert.equal(result.isValid, false);
  assert.ok(result.errors.some(e => e.includes('Tally Invariant Violation (INV-139)')));
});

test('assertScrapedCatalogQuality: catches NaN and negative price anomalies (INV-158)', () => {
  const mockCatalogWithNan = {
    metadata: {
      chassis: 'Mock_Server',
      totalUniqueSKUs: 4
    },
    entries: [
      {
        parentCategory: 'Processor',
        subCategory: 'Intel',
        skus: [
          { sku: 'P11111-B21', listPrice: 'NaN', Description: 'Corrupt Price CPU' }
        ]
      },
      {
        parentCategory: 'Memory',
        subCategory: 'DDR5',
        skus: [
          { sku: 'P22222-B21', listPrice: -50.00, Description: 'Negative Price RAM' }
        ]
      },
      {
        parentCategory: 'Power Supply',
        subCategory: 'Platinum',
        skus: [
          { sku: 'P33333-B21', listPrice: 200.00, Description: 'Valid PSU' }
        ]
      },
      {
        parentCategory: 'Storage',
        subCategory: 'Cages',
        skus: [
          { sku: 'P44444-B21', listPrice: 150.00, Description: 'Valid Cage' }
        ]
      }
    ]
  };

  const result = assertScrapedCatalogQuality(mockCatalogWithNan, { throwOnError: false });
  assert.equal(result.isValid, false);
  assert.ok(result.errors.some(e => e.includes('Invalid price')));
});

test('assertScrapedCatalogQuality: enforces human/governance confirmation when required', () => {
  const tempDir = path.join(PROJECT_ROOT, 'outputs', 'temp', `test_gate_${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    const mockCatalog = {
      metadata: { chassis: 'TestChassis', totalUniqueSKUs: 3 },
      entries: [
        { parentCategory: 'Processor', skus: [{ sku: 'P11111-B21', listPrice: 100 }] },
        { parentCategory: 'Memory', skus: [{ sku: 'P22222-B21', listPrice: 100 }] },
        { parentCategory: 'Power Supply', skus: [{ sku: 'P33333-B21', listPrice: 100 }] }
      ]
    };
    fs.writeFileSync(path.join(tempDir, 'TestChassis_Catalog.json'), JSON.stringify(mockCatalog, null, 2));

    // Without receipt or confirmation -> fails
    const blocked = assertScrapedCatalogQuality(tempDir, {
      chassisName: 'TestChassis',
      requireHumanConfirmation: true,
      throwOnError: false
    });
    assert.equal(blocked.isValid, false);
    assert.ok(blocked.errors.some(e => e.includes('Governance Confirmation Required')));

    // With explicit human confirmation -> passes
    const approved = assertScrapedCatalogQuality(tempDir, {
      chassisName: 'TestChassis',
      requireHumanConfirmation: true,
      humanConfirmed: true,
      throwOnError: false
    });
    assert.equal(approved.isValid, true);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

// =========================================================================
// Test Suite 2: Strict Universal Scope SKU-Leakage Guard (INV-48 / INV-110)
// =========================================================================

test('isApprovedUniversalPolicySku: permits universal policy tokens and rejects hardware SKUs', () => {
  assert.equal(isApprovedUniversalPolicySku('HU4B2A3'), true);
  assert.equal(isApprovedUniversalPolicySku('SOLUTION_TREE_ITEM_0100_01'), true);
  assert.equal(isApprovedUniversalPolicySku('S1A05A'), true);
  assert.equal(isApprovedUniversalPolicySku('R7A11AAE'), true);
  assert.equal(isApprovedUniversalPolicySku('P35876-B21'), true);

  // Chassis hardware SKUs MUST be rejected from universal policy
  assert.equal(isApprovedUniversalPolicySku('P73282-B21'), false); // DL380 Gen12 CTO Server
  assert.equal(isApprovedUniversalPolicySku('P74710-B21'), false); // DL380a 4SFF drive cage
  assert.equal(isApprovedUniversalPolicySku('P76706-B21'), false); // DL380a CPU
  assert.equal(isApprovedUniversalPolicySku('P48820-B21'), false); // DL380 Fan Kit
  assert.equal(isApprovedUniversalPolicySku('P71964-B21'), false); // DL145 CPU
});

test('classifyKnowledgeScope: forces CHASSIS_SPECIFIC when chassis hardware SKU is present', () => {
  const deltaWithHwSku = {
    deltaId: 'DELTA_TEST_LEAK',
    rawMessage: 'Vendor-wide across all servers P73282-B21 requires mandatory cable kit',
    affectedSku: 'P73282-B21',
    requiredDependencySku: 'P73325-B21',
    ruleType: 'PERMANENT_PHYSICAL_DEPENDENCY'
  };

  const scope = classifyKnowledgeScope(deltaWithHwSku);
  assert.equal(scope, 'CHASSIS_SPECIFIC', 'Expected CHASSIS_SPECIFIC due to hardware SKU presence');
});

test('ruleAppliesToProduct: rejects UNIVERSAL_VENDOR rules that contain chassis hardware SKUs', () => {
  const targetDL380a = resolveProductIdentity('DL380a_Gen12', notebookConfig);
  const rogueUniversalRule = {
    deltaId: 'ROGUE_UNIVERSAL',
    scopeTaxonomy: 'UNIVERSAL_VENDOR',
    affectedSku: 'P73282-B21', // DL380 Gen12 specific SKU
    ruleUpdate: 'CTO server requires base kit',
    vendor: 'HPE'
  };

  const applies = ruleAppliesToProduct(rogueUniversalRule, targetDL380a, notebookConfig);
  assert.equal(applies, false, 'Rogue universal rule with DL380 hardware SKU must not apply to DL380a');
});

test('buildMasterKnowledgeRegistry: universalRules contains ZERO chassis hardware SKUs', () => {
  const registry = buildMasterKnowledgeRegistry({ persist: false });
  assert.ok(registry.universalRules.length > 0, 'Expected universal rules in registry');

  for (const r of registry.universalRules) {
    if (r.affectedSku) {
      assert.ok(
        isApprovedUniversalPolicySku(r.affectedSku),
        `Universal rule ${r.deltaId} leaked chassis hardware SKU: ${r.affectedSku}`
      );
    }
    if (r.requiredDependencySku) {
      assert.ok(
        isApprovedUniversalPolicySku(r.requiredDependencySku),
        `Universal rule ${r.deltaId} leaked dependency hardware SKU: ${r.requiredDependencySku}`
      );
    }
  }
});

// =========================================================================
// Test Suite 3: Past Learnings as Diagnostic References/Hints
// =========================================================================

test('conflict_graph: attaches diagnosticHint when learned mandatory dependency is violated', () => {
  // Test DL380 Gen12 with high-TDP CPU (P74507-B21) omitting high performance fan kit (P48820-B21)
  const boqItems = [
    { sku: 'P73282-B21', quantity: 1, description: 'HPE ProLiant DL380 Gen12 SFF CTO Server' },
    { sku: 'P74507-B21', quantity: 2, description: 'Intel Xeon Platinum 8592+ 1.9GHz 64-core 350W Processor' },
    { sku: 'P69728-B21', quantity: 16, description: 'HPE 64GB DDR5 Smart Memory' }
    // Intentionally omitting P48820-B21 fan kit
  ];

  const graph = validateConflictGraph(boqItems, [], DL380_GEN12_DIR, 'DL380_Gen12');

  const learnedConflicts = graph.conflicts.filter(c => c.level === 'LEARNED_DELTA');
  assert.ok(learnedConflicts.length > 0, 'Expected learned delta conflicts');

  const fanConflict = learnedConflicts.find(c => c.message.includes('P48820-B21') || c.message.includes('P74507-B21'));
  if (fanConflict) {
    assert.ok(fanConflict.diagnosticHint, 'Expected diagnosticHint attached to conflict');
    assert.ok(fanConflict.diagnosticHint.deltaId, 'Expected deltaId in diagnostic hint');
    assert.ok(fanConflict.diagnosticHint.referenceNotice, 'Expected referenceNotice in diagnostic hint');
  }
});

test('conflict_graph: detects learned mutual exclusions and attaches diagnostic hint', () => {
  // Test DL380a Gen12 with mutually exclusive drive cages P74710-B21 (4SFF) and P74712-B21 (4EDSFF)
  const dl380aDir = path.join(PROJECT_ROOT, 'outputs', 'ProLiant', 'Gen12', 'DL380a_Gen12');
  if (!fs.existsSync(dl380aDir)) return;

  const boqItems = [
    { sku: 'P76706-B21', quantity: 2, description: 'Intel Xeon 6740P Processor' },
    { sku: 'P74710-B21', quantity: 1, description: 'HPE ProLiant DL380a Gen12 4SFF Drive Cage Kit' },
    { sku: 'P74712-B21', quantity: 1, description: 'HPE ProLiant DL380a Gen12 4EDSFF Drive Cage Kit' }
  ];

  const graph = validateConflictGraph(boqItems, [], dl380aDir, 'DL380a_Gen12');

  const collisionConflict = graph.conflicts.find(c =>
    c.type === 'MUTUAL_EXCLUSION' && (c.message.includes('P74710-B21') || c.message.includes('P74712-B21'))
  );

  assert.ok(collisionConflict, 'Expected mutual exclusion conflict for 4SFF and 4EDSFF cage mixing');
  assert.ok(collisionConflict.diagnosticHint, 'Expected diagnosticHint attached to mutual exclusion conflict');
  assert.equal(collisionConflict.diagnosticHint.deltaId, 'DELTA_DL380A_GEN12_DRIVE_CAGE_EXCLUSIVITY');
  assert.ok(collisionConflict.diagnosticHint.referenceNotice.includes('DELTA_DL380A_GEN12_DRIVE_CAGE_EXCLUSIVITY'));
});
