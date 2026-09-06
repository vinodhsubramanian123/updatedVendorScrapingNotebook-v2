'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadProfile } = require('../../../scripts/lib/system/profile_loader.js');
const { extractBaseChassisEvidence, resolveTableTaxonomyAndRole } = require('../../../scripts/catalogs/build_catalog.js');

function sku(description) {
  return { 'Product #': 'P00000-B21', Description: description };
}

async function classify(subCategory, description) {
  const profile = await loadProfile('ProLiant', 'Gen12');
  return resolveTableTaxonomyAndRole(
    { name: subCategory, parentCategory: 'Accessories & Infrastructure', constraint: 'max 4', minQty: 0, maxQty: 4 },
    1,
    {},
    [],
    profile,
    [sku(description)]
  );
}

test('profile loader resolves the real scripts/config profile directory', async () => {
  const profile = await loadProfile('ProLiant', 'Gen12');
  assert.ok(profile.component_mapping.Processor.includes('processor'));
  assert.ok(profile.component_mapping['Storage Controller'].includes('mr408i'));
});

test('weak portal subcategory is overridden by SSD semantics', async () => {
  const result = await classify('Hot Plug SFF', 'HPE 3.84TB NVMe Gen4 Read Intensive SFF U.3 SSD');
  assert.equal(result.parentCat, 'Drive Enclosures / Drives');
  assert.equal(result.detectedRole, 'Drive Cage / Drive');
  assert.equal(result.matchedVia, 'role_classifier');
});

test('the same weak portal label can classify power supplies independently', async () => {
  const result = await classify('Hot Plug SFF', 'HPE 3200W Titanium Hot Plug Power Supply Kit');
  assert.equal(result.parentCat, 'Power Supplies');
  assert.equal(result.detectedRole, 'Power Supply');
});

test('power cords remain cable enablement rather than power supplies', async () => {
  const result = await classify('Power Cords', 'HPE C13-C14 2m Jumper Power Cord');
  assert.equal(result.parentCat, 'Cables & Enablement Kits');
  assert.equal(result.detectedRole, 'Cable Kit');
});

test('boot devices and management licenses use their semantic parents', async () => {
  const boot = await classify('OS Boot Device', 'HPE NS204i-u NVMe Boot Optimized Storage Device');
  const software = await classify('Compute Ops Management SKUs (required)', 'HPE Compute Ops Management 3-year SaaS E-LTU License');
  assert.equal(boot.parentCat, 'OS Boot Device');
  assert.equal(software.parentCat, 'Software & Licenses');
});

test('Windows CAL tables stay software even when some descriptions say Remote Desktop Service', async () => {
  const result = await classify(
    'Microsoft Windows CAL Packs',
    'Microsoft Windows Server 2025 Remote Desktop Service 5 Users CAL WW LTU'
  );
  assert.equal(result.parentCat, 'Software & Licenses');
  assert.equal(result.matchedVia, 'direct_taxonomy_keyword');
});

test('active OCA summary provides the exact DL380a base chassis without borrowing DL380 history', () => {
  const evidence = extractBaseChassisEvidence([{
    rows: [['1', 'P76706-B21', 'HPE ProLiant Compute DL380a Gen12 8 Double Wide/16 Single Wide Configure-to-order Server']]
  }], 'P76706-B21', 'DL380a Gen12');
  assert.equal(evidence.sku, 'P76706-B21');
  assert.match(evidence.Description, /DL380a Gen12/);
  assert.equal(evidence['Option Type'], 'CTO');
});

test('product-search discovery preserves the certified base price and lifecycle', () => {
  const evidence = extractBaseChassisEvidence([], 'P76706-B21', 'DL380a Gen12', {
    source: 'HPE OCA Product Search via CDP',
    candidates: [{ sku: 'P76706-B21', description: 'HPE DL380a Gen12 CTO Server', listPriceUsd: 21407, startDate: '03/03/2025', discontinuedDate: '02/29/2028', eligible: true }]
  });
  assert.equal(evidence.listPrice, 21407);
  assert.equal(evidence['Start Date'], '03/03/2025');
  assert.equal(evidence.provenance, 'HPE OCA Product Search via CDP');
});
