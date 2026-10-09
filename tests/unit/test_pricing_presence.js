'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const XLSX = require('xlsx-js-style');

const context = require('../../scripts/lib/boq/configuration_context');
const parser = require('../../scripts/lib/boq/boq_parser');
const planner = require('../../scripts/lib/boq/multi_group_plan');
const pricing = require('../../scripts/lib/boq/pricing_presence');
const { generateProfessionalBOQ } = require('../../scripts/lib/boq/generate_boq_xlsx');

function parsePrice(value, confirmed = '') {
  return parser.parseSkuLines([
    'Part Number\tQty\tDescription\tUnit Price\tConfirmed Zero Price',
    'P64706-B21\t2\tCPU\t' + value + '\t' + confirmed
  ]).items[0];
}

function runContextTotals(parts) {
  const c = context.normalizeConfiguration([
    { sku: 'P76706-B21', quantity: 9, description: 'CTO server', unitPriceUsd: 100 },
    ...parts
  ]);
  const candidate = { skuPartsList: c.items };
  context.applyConfigurationContext({ conflictGraph: { rankedSolutions: [candidate] } }, c);
  return candidate;
}

test('reproduced applyConfigurationContext: CTO qty 9 price 100 + CPU qty 18 missing price', () => {
  const s = runContextTotals([{ sku: 'P64706-B21', quantity: 18, description: 'CPU' }]);
  assert.equal(s.pricingComplete, false);
  assert.equal(s.totalOrderCostUsd, null);
  assert.equal(s.knownOrderSubtotalUsd, 900);
  assert.ok(s.priceUnavailableSkus.includes('P64706-B21'));
});

test('all known prices produce complete totalOrderCostUsd and pricingComplete true', () => {
  const s = runContextTotals([{ sku: 'P64706-B21', quantity: 18, description: 'CPU', unitPriceUsd: 50 }]);
  assert.equal(s.pricingComplete, true);
  assert.equal(s.totalOrderCostUsd, 1800);
  assert.equal(s.knownOrderSubtotalUsd, 1800);
});

test('global items are added once and do not scale with multiplier', () => {
  const s = runContextTotals([
    { sku: 'P64706-B21', quantity: 18, unitPriceUsd: 50 },
    { sku: 'P12345-B21', quantity: 1, quantityScope: 'global', unitPriceUsd: 20 }
  ]);
  assert.equal(s.pricingComplete, true);
  assert.equal(s.totalOrderCostUsd, 1820);
});

test('explicitly confirmed zero price is treated as known 0 with provenance', () => {
  const s = runContextTotals([{ sku: 'P64706-B21', quantity: 18, unitPriceUsd: 0, isConfirmedZeroPrice: true }]);
  assert.equal(s.pricingComplete, true);
  assert.equal(s.totalOrderCostUsd, 900);
});

for (const val of [0, -10, NaN, Infinity, '5', false]) {
  test(`invalid or unconfirmed price (${String(val)}) results in incomplete pricing`, () => {
    const s = runContextTotals([{ sku: 'P64706-B21', quantity: 18, unitPriceUsd: val }]);
    assert.equal(s.pricingComplete, false);
    assert.equal(s.totalOrderCostUsd, null);
  });
}

test('blank explicit Unit Price column does not infer from description or other cells', () => {
  const item = parsePrice('');
  assert.equal(item.unitPriceUsd, null);
});

test('negative unit price is not converted to positive', () => {
  const item = parsePrice('-50');
  assert.equal(item.unitPriceUsd, null);
});

test('known service parent contract zero is confirmed', () => {
  const s = runContextTotals([{ sku: 'HA113A1', quantity: 1, quantityScope: 'global', unitPriceUsd: 0 }]);
  assert.equal(s.pricingComplete, true);
  assert.equal(s.totalOrderCostUsd, 900);
});

test('normalizeConfiguration preserves null extended price when unitPriceUsd is unknown', () => {
  const c = context.normalizeConfiguration([{ sku: 'P76706-B21', quantity: 9, unitPriceUsd: null }]);
  assert.equal(c.items[0].extendedPriceUsd, null);
});

test('real grouped XLSX round-trip preserves null and confirmed zero prices', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pricing-focused-rt-'));
  try {
    const group = planner.ownedGroup([
      { sku: 'P76706-B21', quantity: 9, description: 'CTO server', unitPriceUsd: null },
      { sku: 'P64706-B21', quantity: 18, description: 'CPU', unitPriceUsd: 0, isConfirmedZeroPrice: true }
    ], { groupId: 'group-price-test' });

    const out = planner.writeGroupInput(group, dir, XLSX);
    assert.ok(fs.existsSync(out.filePath));

    const wb = XLSX.readFile(out.filePath);
    const text = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]], { FS: '\t' });
    const items = parser.parseSkuLines(text.split(/\r?\n/)).items;

    assert.equal(items[0].unitPriceUsd, null);
    assert.equal(items[1].unitPriceUsd, 0);
    assert.equal(items[1].isConfirmedZeroPrice, true);

    const ctx = context.normalizeConfiguration(items);
    assert.equal(ctx.multiplier, 9);
    assert.equal(context.outputQuantities(ctx.items[1]).totalQty, 18);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('duplicate SKU consolidation discloses mixed pricing and does not silently price missing occurrence', () => {
  const lines = [
    'Part Number\tQty\tDescription\tUnit Price',
    'P64706-B21\t1\tCPU\t100',
    'P64706-B21\t1\tCPU\t'
  ];
  const parsed = parser.parseSkuLines(lines);
  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.items[0].quantity, 2);
  assert.equal(parsed.items[0].unitPriceUsd, null);
  assert.equal(parsed.items[0].priceConflict, 'MIXED_PRICING_EVIDENCE');
});

test('duplicate SKU consolidation with conflicting prices sets unitPriceUsd to null', () => {
  const lines = [
    'Part Number\tQty\tDescription\tUnit Price',
    'P64706-B21\t1\tCPU\t100',
    'P64706-B21\t1\tCPU\t200'
  ];
  const parsed = parser.parseSkuLines(lines);
  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.items[0].quantity, 2);
  assert.equal(parsed.items[0].unitPriceUsd, null);
  assert.equal(parsed.items[0].priceConflict, 'CONFLICTING_OBSERVED_PRICES');
});

test('sum overflow nullifies subtotal and marks incomplete', () => {
  const summary = pricing.summarizeCandidatePricing([
    { sku: 'SKU1', quantity: 1, unitPriceUsd: 1e308 },
    { sku: 'SKU2', quantity: 1, unitPriceUsd: 1e308 }
  ]);
  assert.equal(summary.pricingComplete, false);
  assert.equal(summary.knownOrderSubtotalUsd, null);
  assert.equal(summary.totalOrderCostUsd, null);
});

test('parseObservedUnitPrice rejects non-number/non-string, hex, and malformed syntax', () => {
  assert.equal(pricing.parseObservedUnitPrice('0x10'), null);
  assert.equal(pricing.parseObservedUnitPrice('1,2'), null);
  assert.equal(pricing.parseObservedUnitPrice(['100']), null);
  assert.equal(pricing.parseObservedUnitPrice({ price: 100 }), null);
  assert.equal(pricing.parseObservedUnitPrice('$1,234.50'), 1234.5);
  assert.equal(pricing.parseObservedUnitPrice('1234'), 1234);
});
