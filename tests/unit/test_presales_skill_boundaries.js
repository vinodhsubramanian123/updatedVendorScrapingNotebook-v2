'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { HeterogeneousTenderModernizer } = require('../../scripts/lib/boq/heterogeneous_tender_modernizer');
const { getPlatformProfile } = require('../../scripts/lib/rules/platform_profiles');
const { appendCommercialRemarks, resolveTenderColumns } = require('../../scripts/lib/boq/commercial_remarks');

test('ambiguous and unsupported products never pick the first profile', () => {
  for (const key of ['HPE', 'DL380', 'DL380 Gen99', 'OTHER']) assert.equal(getPlatformProfile(key), null);
  assert.ok(getPlatformProfile('DL380 Gen11'));
});

test('loose multipliers are retained; unsupported allocations remain visible', () => {
  const modernizer = new HeterogeneousTenderModernizer({ defaultServerPlatform: 'DL380 Gen11' });
  const source = [{ id: 'source', multiplier: 3, isAdHocGroup: true, items: [
    { sku: 'MEM', description: '64GB RDIMM', qty: 5 },
    { sku: 'NIC', description: 'PCIe Ethernet adapter', qty: 40 }
  ] }];
  const categorized = modernizer.categorizeTenderItems(source);
  const fleet = modernizer.synthesizeCarrierFleet(categorized.unbuildableAdHoc);
  assert.equal(fleet.carrierPools[0].absorbedRequirement, 15);
  assert.equal(fleet.unresolvedItems[0].quantity, 120);
  assert.equal(source[0].items[0].qty, 5);
  assert.deepEqual(fleet.carrierPools[0].items, []);
});

test('mixed or unidentified components are never certified as servers', () => {
  const modernizer = new HeterogeneousTenderModernizer();
  const result = modernizer.categorizeTenderItems([
    { description: 'Compute server', qty: 1 }, { description: 'SAN switch', qty: 1 }
  ]);
  assert.equal(result.servers.length, 0);
  assert.equal(result.unresolved.length, 1);
  assert.throws(() => modernizer.categorizeTenderItems([{ description: 'server', qty: 0 }]));
});

test('upload rows reject missing SKUs, zero quantities and implicit omissions', () => {
  const modernizer = new HeterogeneousTenderModernizer();
  for (const item of [{ sku: 'X', qty: 0 }, { sku: '', qty: 1 }, { sku: 'X', qty: 1, omitFromPortalUpload: true }]) {
    assert.throws(() => modernizer.generateOcaUploadRows([{ name: 'Owner', items: [item] }]));
  }
  const rows = modernizer.generateOcaUploadRows([
    { name: 'A', items: [{ sku: 'X', qty: 1 }] }, { name: 'B', items: [{ sku: 'Y', qty: 2 }] }
  ]);
  assert.deepEqual(rows.slice(2, 4), [[], []]);
  assert.equal(rows[4][3], 'B');
});

test('remarks preserve reordered source cells and customer notes', () => {
  const rows = [['Notes', 'Quantity', 'SKU'], ['Keep as spare', 2, 'X', 'extra customer cell']];
  const result = appendCommercialRemarks(rows, { 1: { action: 'MATCHED', exactMatch: true, configuredQty: 2, proposedSku: 'X' } });
  assert.equal(result.columns.remarks, 4);
  assert.deepEqual(result.rows[1].slice(0, 4), rows[1]);
  assert.equal(rows[0].length, 3);
  assert.throws(() => resolveTenderColumns(['SKU', 'Qty', 'Quantity']));
  assert.throws(() => appendCommercialRemarks(rows, { 1: { action: 'MATCHED', configuredQty: 2 } }));
});

test('prose cloud output and historical replacement data cannot certify hardware', async () => {
  const modernizer = new HeterogeneousTenderModernizer({ defaultServerPlatform: 'DL380 Gen11' });
  const result = await modernizer.resolveHardwareWithFallback({}, { callTool: () => ({ answer: 'PASS' }) });
  assert.equal(result.tier, 'NOT_EVALUATED');
  assert.equal(modernizer.resolveActiveHardware('P28028-B21', 'Original').wasReplaced, false);
});
