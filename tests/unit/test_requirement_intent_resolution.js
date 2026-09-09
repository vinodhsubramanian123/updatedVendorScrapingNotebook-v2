'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseSkuLines } = require('../../scripts/lib/boq/boq_parser.js');
const { resolveRequirementIntent } = require('../../scripts/lib/boq/requirement_intent_resolver.js');
const { parseRiserSlotCount, evalPcieRiserSlots } = require('../../scripts/lib/aspects/pcie_riser.js');
const { autoDetectChassisDetailed } = require('../../scripts/lib/catalog/catalog_discovery.js');

function catalog(entries) {
  return { entries: entries.map(entry => ({
    parentCategory: entry.parentCategory,
    subCategory: entry.parentCategory,
    skus: entry.skus
  })) };
}

const TEST_CATALOG = catalog([
  { parentCategory: 'Processor', skus: [
    { 'Product #': 'P11111-B21', Description: 'Intel Xeon 6780E 2.2GHz 144-core 330W Processor for HPE', 'Component Role': 'Processor' },
    { 'Product #': 'P11112-B21', Description: 'Intel Xeon 6766E 1.9GHz 144-core 250W Processor for HPE', 'Component Role': 'Processor' }
  ] },
  { parentCategory: 'Memory', skus: [
    { 'Product #': 'P22222-B21', Description: 'HPE 128GB DDR5-6400 Registered Memory', 'Component Role': 'Memory' }
  ] },
  // Deliberately wrong parent category: description/explicit role must win.
  { parentCategory: 'PCIe Risers', skus: [
    { 'Product #': 'P33333-B21', Description: 'HPE 8SFF NVMe Drive Cage', 'Component Role': 'Drive Cage / Drive' }
  ] }
]);

test('parser retains attribute requirements and malformed part tokens', () => {
  const parsed = parseSkuLines(['Need 2 processors, Intel Xeon 6780E 144-core; requested part P11111-ZZZ']);
  assert.equal(parsed.items.length, 0);
  assert.equal(parsed.unresolvedRequirements.length, 1);
  assert.deepEqual(parsed.unresolvedRequirements[0].suspectedPartTokens, ['P11111-ZZZ']);
});

test('whole requirement category gates correction before SKU similarity', () => {
  const result = resolveRequirementIntent({
    items: [{ sku: 'P33334-B21', description: 'Intel Xeon 6780E 2.2GHz 144-core processor', quantity: 2 }],
    rawLines: ['Base server P99999-B21', '2x Intel Xeon 6780E 2.2GHz 144-core processors', '512GB memory'],
    catalogData: TEST_CATALOG,
    productConfirmed: true
  });
  const correction = result.resolutions[0];
  assert.equal(correction.expectedRole, 'Processor');
  assert.equal(correction.candidates[0].sku, 'P11111-B21');
  assert.ok(correction.candidates.every(candidate => candidate.role === 'Processor'));
  assert.notEqual(correction.candidates[0].sku, 'P33333-B21');
});

test('low-confidence or unconfirmed product candidates require HITL and are not applied', () => {
  const result = resolveRequirementIntent({
    items: [{ sku: 'P11119-B21', description: '144-core processor', quantity: 2 }],
    rawLines: ['Need a 144-core processor'],
    catalogData: TEST_CATALOG,
    productConfirmed: false
  });
  assert.equal(result.requiresHumanClarification, true);
  assert.equal(result.resolutions[0].status, 'NEEDS_HUMAN_CLARIFICATION');
  assert.equal(result.resolutions[0].appliedSku, null);
  assert.equal(result.resolvedItems[0].sku, 'P11119-B21');
});

test('attribute-only requirements expose construction mode and missing categories', () => {
  const parsed = parseSkuLines(['Need 512GB memory and 2 processors within budget $25000']);
  const result = resolveRequirementIntent({
    items: parsed.items,
    unresolvedRequirements: parsed.unresolvedRequirements,
    rawLines: ['Need 512GB memory and 2 processors within budget $25000'],
    catalogData: TEST_CATALOG,
    productConfirmed: true
  });
  assert.equal(result.constructionMode, true);
  assert.equal(result.intent.budgetUsd, 25000);
  assert.ok(result.categoryCoverage.missingRoles.includes('Memory'));
  assert.ok(result.categoryCoverage.missingRoles.includes('Processor'));
  assert.equal(result.requiresHumanClarification, true);
});

test('PCIe riser topology uses catalog lane layout and exposes verification evidence', () => {
  assert.deepEqual(parseRiserSlotCount('x16/x16/x16 Primary Riser Kit'), { slots: 3, evidence: 'CATALOG_LANE_LAYOUT' });
  assert.deepEqual(parseRiserSlotCount('2x16 Tertiary Riser Kit'), { slots: 2, evidence: 'CATALOG_LANE_MULTIPLIER' });
  const pcieCatalog = catalog([{ parentCategory: 'Incorrect', skus: [
    { 'Product #': 'P48803-B21', Description: 'HPE x16/x16/x16 Primary Riser Kit', 'Component Role': 'PCIe Riser' }
  ] }]);
  const result = evalPcieRiserSlots([{ sku: 'P48803-B21', description: 'P48803-B21', quantity: 1 }], pcieCatalog);
  assert.equal(result.slotLayout.installedRiserMechanicalSlots, 3);
  assert.equal(result.slotLayout.totalMechanicalSlots, 6);
  assert.equal(result.slotLayout.risers[0].evidence, 'CATALOG_LANE_LAYOUT');
  assert.equal(result.slotLayout.requiresNotebookVerification, false);
});

test('base chassis SKU routes to the exact product catalog boundary', () => {
  const detection = autoDetectChassisDetailed([{ sku: 'P76706-B21', description: 'HPE DL380a Gen12 CTO Server', quantity: 1 }]);
  assert.equal(detection.matchType, 'EXACT_BASE_SKU');
  assert.equal(detection.confidenceScore, 1);
  assert.equal(detection.requiresUserConfirmation, false);
  assert.match(detection.chassisDir, /DL380a_Gen12$/);
});
