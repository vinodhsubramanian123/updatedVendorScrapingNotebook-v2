'use strict';
/**
 * tests/chaos/test_presales_skills_chaos.js
 *
 * Adversarial chaos, boundary stress, and invariant validation for:
 * - cross-vendor-transformation-skill (cross_vendor_transformer.js)
 * - heterogeneous-tender-modernizer (heterogeneous_tender_modernizer.js)
 * - boq-remarks-reconciliation-skill (commercial_remarks.js)
 * - platform_profiles.js generic detection patterns
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { HeterogeneousTenderModernizer } = require('../../scripts/lib/boq/heterogeneous_tender_modernizer');
const { getPlatformProfile, GENERIC_DETECTION_PATTERNS } = require('../../scripts/lib/rules/platform_profiles');
const { appendCommercialRemarks, resolveTenderColumns, formatCommercialRemark } = require('../../scripts/lib/boq/commercial_remarks');
const { parseCompetitorSpecification, transformCompetitorQuote } = require('../../scripts/lib/boq/cross_vendor_transformer');

test('CHAOS: platform_profiles detection patterns withstand catalog nomenclature and reject accessories', () => {
  // Official HPE CPUs sold as kits must be classified as CPUs
  const validCpus = [
    'Intel Xeon-Gold 6430 2.1GHz 32-core 270W Processor Kit for HPE',
    'Intel Xeon-Silver 4410Y 2.0GHz 12-core 150W Processor Kit for HPE',
    'Intel Xeon-Platinum 8480+ 2.0GHz 56-core 350W Processor Kit for HPE',
    'AMD EPYC 9354 3.25GHz 32-core 280W Processor Kit for HPE',
    'HPE ProLiant DL380 Gen11 Intel Xeon 6430 Processor Kit'
  ];
  for (const desc of validCpus) {
    assert.equal(GENERIC_DETECTION_PATTERNS.isCpu(desc), true, `Failed for CPU: ${desc}`);
  }

  // Non-CPU accessories (heatsinks, cables, enablement, brackets) must be rejected
  const nonCpuAccessories = [
    'HPE ProLiant DL380 Gen11 High Performance Heat Sink Kit',
    'HPE ProLiant DL380 Gen11 CPU1 to OCP2 x8 Enablement Kit',
    'HPE ProLiant DL380 Gen11 CPU Power Cable Kit',
    'HPE ProLiant DL380 Gen11 2nd Processor Heatsink Kit',
    'HPE ProLiant DL380 Gen11 Processor Retainer Bracket'
  ];
  for (const desc of nonCpuAccessories) {
    assert.equal(GENERIC_DETECTION_PATTERNS.isCpu(desc), false, `Should NOT be CPU: ${desc}`);
  }

  // Official HPE Memory kits must be classified as memory
  const validMem = [
    'HPE 64GB (1x64GB) Dual Rank x4 DDR5-5600 Registered Smart Kit',
    'HPE 32GB 2Rx8 DDR5-5600 Smart Memory',
    'HPE 16GB 1Rx8 DDR5-5600 Smart FIO Memory Kit',
    '64GB 2Rx4 DDR5-4800 RDIMM',
    '128GB DDR4-3200 LRDIMM',
    '32GB DDR5-5600 MRDIMM'
  ];
  for (const desc of validMem) {
    assert.equal(GENERIC_DETECTION_PATTERNS.isMemory(desc), true, `Failed for Memory: ${desc}`);
  }
});

test('CHAOS: commercial_remarks header resolution rejects malformed, missing, and ambiguous inputs', () => {
  // Non-array input
  assert.throws(() => resolveTenderColumns(null), /must be an array/);
  assert.throws(() => resolveTenderColumns('SKU, Qty'), /must be an array/);

  // Missing required headers
  assert.throws(() => resolveTenderColumns(['Product', 'Price']), /Part number and quantity headers are required/);
  assert.throws(() => resolveTenderColumns(['Qty', 'Price']), /Part number and quantity headers are required/);

  // Ambiguous duplicate headers
  assert.throws(() => resolveTenderColumns(['SKU', 'Part No', 'Qty']), /Ambiguous pn columns/);
  assert.throws(() => resolveTenderColumns(['Part Number', 'Quantity', 'Qty']), /Ambiguous qty columns/);

  // Valid reordered headers with whitespace
  const valid = resolveTenderColumns(['  Unit Price  ', '  Item Details  ', '  Part Number  ', '  Quantity  ']);
  assert.equal(valid.price, 0);
  assert.equal(valid.desc, 1);
  assert.equal(valid.pn, 2);
  assert.equal(valid.qty, 3);
  assert.equal(valid.remarks, 4);
});

test('CHAOS: commercial_remarks formatting rejects invalid actions, jargon, and missing predicates', () => {
  // Unsupported action
  assert.throws(() => formatCommercialRemark('INVALID_ACTION', {}), /Unsupported commercial action/);

  // MATCHED requires exactMatch: true
  assert.throws(() => formatCommercialRemark('MATCHED', { configuredQty: 2, proposedSku: 'X' }), /MATCHED requires verified row parity/);
  assert.throws(() => formatCommercialRemark('MATCHED', { exactMatch: false, configuredQty: 2, proposedSku: 'X' }), /MATCHED requires verified row parity/);

  // Non-matched requires reason
  assert.throws(() => formatCommercialRemark('MODERNIZED', { configuredQty: 2, proposedSku: 'X', reason: '' }), /requires a reason/);
  assert.throws(() => formatCommercialRemark('REDUCED', { configuredQty: 2, proposedSku: 'X', reason: '   ' }), /requires a reason/);

  // ABSORPTION requires full bridge
  assert.throws(() => formatCommercialRemark('ABSORBED', { configuredQty: 2, proposedSku: 'X', reason: 'Absorbed' }), /Absorption requires source, destination and quantity bridge/);
  assert.throws(() => formatCommercialRemark('ABSORBED', { configuredQty: 2, proposedSku: 'X', sourceRef: 'Table 1', reason: 'Absorbed' }), /Absorption requires source, destination and quantity bridge/);

  // Negative quantities or non-integers
  assert.throws(() => formatCommercialRemark('MATCHED', { exactMatch: true, configuredQty: -1 }), /nonnegative integer/);
  assert.throws(() => formatCommercialRemark('MATCHED', { exactMatch: true, configuredQty: 2.5 }), /nonnegative integer/);

  // Strict zero internal jargon
  assert.throws(() => formatCommercialRemark('MODERNIZED', { configuredQty: 2, proposedSku: 'X', reason: 'Allocated to dummy server' }), /Internal portal jargon/);
  assert.throws(() => formatCommercialRemark('MODERNIZED', { configuredQty: 2, proposedSku: 'X', reason: 'Internal ucid mapping' }), /Internal portal jargon/);
  assert.throws(() => formatCommercialRemark('MODERNIZED', { configuredQty: 2, proposedSku: 'X', reason: 'Quick hack for portal' }), /Internal portal jargon/);

  // Valid remarks
  const matched = formatCommercialRemark('MATCHED', { exactMatch: true, configuredQty: 4, proposedSku: 'P64707-B21' });
  assert.ok(matched.includes('MATCHED (1:1)'));
  assert.ok(matched.includes('P64707-B21'));
  assert.ok(matched.includes('4'));

  const notEvaluated = formatCommercialRemark('NOT_EVALUATED', { proposedSku: 'Unresolved', reason: 'Catalog pending' });
  assert.ok(notEvaluated.includes('[NOT EVALUATED]'));
  assert.ok(notEvaluated.includes('Unresolved'));
});

test('CHAOS: appendCommercialRemarks preserves ragged rows, customer comments, and formulas', () => {
  const customerRows = [
    ['Line', 'Part Number', 'Quantity', 'Customer Notes'],
    [1, 'P64707-B21', 4, 'Strict requirement for production cluster', 'FormulaCell=SUM(A2:B2)'],
    [2, 'P49614-B21', 2, 'Spare processor for shelf storage']
  ];

  const remarks = {
    1: { action: 'MATCHED', exactMatch: true, configuredQty: 4, proposedSku: 'P64707-B21' },
    2: { action: 'NOT_EVALUATED', reason: 'Customer requested shelf spare' }
  };

  const result = appendCommercialRemarks(customerRows, remarks);
  assert.equal(result.columns.remarks, 5);
  // Ensure original customer rows were not mutated
  assert.equal(customerRows[0].length, 4);
  assert.equal(customerRows[1].length, 5);
  // Output preserves existing content
  assert.equal(result.rows[1][3], 'Strict requirement for production cluster');
  assert.equal(result.rows[1][4], 'FormulaCell=SUM(A2:B2)');
  assert.ok(result.rows[1][5].includes('MATCHED (1:1)'));
  assert.ok(result.rows[2][5].includes('[NOT EVALUATED]'));
});

test('CHAOS: HeterogeneousTenderModernizer fuzzing with large multi-group tender and invalid values', () => {
  const modernizer = new HeterogeneousTenderModernizer({ defaultServerPlatform: 'DL380 Gen11' });

  // Negative and zero multiplier rejection
  assert.throws(() => modernizer.categorizeTenderItems([{ multiplier: 0, items: [{ sku: 'X', qty: 1 }] }]), /must be a positive integer/);
  assert.throws(() => modernizer.categorizeTenderItems([{ multiplier: -2, items: [{ sku: 'X', qty: 1 }] }]), /must be a positive integer/);
  assert.throws(() => modernizer.categorizeTenderItems([{ items: [{ sku: 'X', qty: 0 }] }]), /must be a positive integer/);
  assert.throws(() => modernizer.categorizeTenderItems([{ items: [{ sku: 'X', qty: -5 }] }]), /must be a positive integer/);

  // Large multi-group tender: 50 server groups + 50 ad-hoc loose groups
  const groups = [];
  for (let i = 0; i < 50; i++) {
    groups.push({
      id: `Server_Group_${i}`,
      multiplier: 2,
      items: [
        { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF Server', qty: 1 },
        { sku: 'P49614-B21', description: 'Intel Xeon-Gold 6430 Processor Kit', qty: 2 },
        { sku: 'P64707-B21', description: 'HPE 64GB 2Rx4 DDR5-5600 Smart Kit', qty: 16 }
      ]
    });
  }
  for (let i = 0; i < 50; i++) {
    groups.push({
      id: `AdHoc_Group_${i}`,
      isAdHocGroup: true,
      multiplier: 3,
      items: [
        { sku: 'P64707-B21', description: 'HPE 64GB DDR5 Smart Kit', qty: 8 },
        { sku: 'P26262-B21', description: 'Broadcom 10/25Gb 2-port SFP28 Adapter', qty: 4 }
      ]
    });
  }

  const categorized = modernizer.categorizeTenderItems(groups);
  assert.equal(categorized.servers.length, 50);
  assert.equal(categorized.unbuildableAdHoc.length, 50);

  const fleet = modernizer.synthesizeCarrierFleet(categorized.unbuildableAdHoc);
  assert.equal(fleet.status, 'DRAFT_ALLOCATION_REVIEW_REQUIRED');
  assert.ok(fleet.carrierPools.length > 0);
  // Total loose memory: 50 groups * 3 multiplier * 8 DIMMs = 1200 DIMMs
  assert.equal(fleet.carrierPools[0].absorbedRequirement, 1200);
  // Unallocated NICs: each item has quantity 12 (4 * 3), 50 items total = 600 NICs
  assert.equal(fleet.unresolvedItems[0].quantity, 12);
  const totalUnresolvedNics = fleet.unresolvedItems.reduce((sum, item) => sum + item.quantity, 0);
  assert.equal(totalUnresolvedNics, 600);
});

test('CHAOS: CrossVendorTransformer handles irregular formatting and preserves candidate bounds', () => {
  // Complex irregular formatting
  const specText = `
    System Architecture: Dell PowerEdge R760 Rack Server;
    Compute: 2x Intel Xeon Platinum 8480+ 56C 350W;
    Memory Configuration: 32x 64GB DDR5-4800 RDIMM ECC;
    Storage: 8x 3.84TB NVMe SSD;
    Networking: 2x Broadcom 25GbE Dual-Port SFP28;
    Power: Dual 1600W Titanium Redundant PSUs
  `;

  const spec = parseCompetitorSpecification(specText, 'DELL');
  assert.equal(spec.sourceVendor, 'DELL');
  assert.equal(spec.compute.cpuCount, 2);
  assert.equal(spec.compute.cpuCores, 56);
  assert.equal(spec.compute.cpuModel, '8480+');
  assert.equal(spec.compute.totalCores, 112);
  assert.equal(spec.memory.dimmCount, 32);
  assert.equal(spec.memory.dimmCapacityGb, 64);
  assert.equal(spec.memory.totalMemoryGb, 2048);

  // Missing target chassis requires target product
  const noTarget = transformCompetitorQuote(specText);
  assert.equal(noTarget.status, 'TARGET_PRODUCT_REQUIRED');

  // Target provided but no candidate items requires scoped sizing
  const withTarget = transformCompetitorQuote(specText, 'DELL', 'DL380_Gen12');
  assert.equal(withTarget.status, 'SCOPED_SIZING_REQUIRED');
  assert.equal(withTarget.auditReport.status, 'NOT_EVALUATED');
  assert.equal(withTarget.auditReport.unresolvedSubsystems, 12);
  assert.equal(withTarget.auditReport.is100PercentCompliant, false);
});
