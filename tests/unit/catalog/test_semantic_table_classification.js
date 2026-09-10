'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadProfile } = require('../../../scripts/lib/system/profile_loader.js');
const {
  extractBaseChassisEvidence,
  extractSubcategoriesAndParents,
  extractDiscoveredChassisVariants,
  isCanonicalCtoChassisCandidate,
  parseSingleTableRow,
  partitionCatalogEntries,
  resolveTableTaxonomyAndRole
} = require('../../../scripts/catalogs/build_catalog.js');

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

test('configuration EDT is assigned only to the selected chassis variant', async () => {
  const variants = await extractDiscoveredChassisVariants('/tmp/nonexistent-product-history', 'DL380 Gen12', {
    selectedSku: 'P73282-B21',
    deliveryEstimate: 'EDT 12 - 18 days',
    candidates: [
      { sku: 'P73282-B21', text: 'HPE ProLiant Compute DL380 Gen12 SFF NC Configure-to-order Server', isCto: true },
      { sku: 'P73283-B21', text: 'HPE ProLiant Compute DL380 Gen12 24SFF NC Configure-to-order Server', isCto: true }
    ]
  });
  assert.equal(variants.find(v => v.sku === 'P73282-B21')['Lead Time'], 'EDT 12 - 18 days');
  assert.equal(variants.find(v => v.sku === 'P73283-B21')['Lead Time'], '');
});

test('canonical chassis selection rejects special-solution and neighboring product candidates', () => {
  assert.equal(isCanonicalCtoChassisCandidate({
    sku: 'P52534-B21', text: 'P52534-B21 - HPE ProLiant DL380 Gen11 8SFF NC Configure-to-order Server', isCto: true
  }, 'DL380_Gen11'), true);
  assert.equal(isCanonicalCtoChassisCandidate({
    sku: 'S4R63A', text: 'HPE ProLiant DL380 Gen11 48TB Configure-to-order Server for Cohesity', isCto: true
  }, 'DL380_Gen11'), false);
  assert.equal(isCanonicalCtoChassisCandidate({
    sku: 'P76706-B21', text: 'HPE ProLiant DL380a Gen12 Configure-to-order Server', isCto: true
  }, 'DL380_Gen12'), false);
});

test('row parser retains lifecycle, availability, delivery, and unmodeled vendor attributes', () => {
  const { obj: row } = parseSingleTableRow(
    ['P00000-B21 [90]', 'Test HPE option', '0', '99.00', 'Available', '12-18 days', '09/01/2026', '09/01/2028', 'Vendor label'],
    ['Product #', 'Description', 'Quantity', 'Price (USD)', 'Availability', 'Lead Time', 'Start', 'Discontinued', 'Custom Attribute'],
    0,
    new Map()
  );
  assert.equal(row['Lifecycle Status'], 'EOL Warning (90-Day)');
  assert.equal(row.Availability, 'Available');
  assert.equal(row['Lead Time'], '12-18 days');
  assert.equal(row['Lead Time Source'], 'OCA row attribute');
  assert.equal(row.vendorAttributes['Custom Attribute'], 'Vendor label');
});

test('nested OCA table constraints survive flattened body text', () => {
  const rawData = {
    sections: [],
    tables: [{ rows: [
      ['Processor\n Processor\n 0\n 2'],
      ['Processor\n (max 2)'],
      ['Product #', 'Description'],
      ['P00000-B21', 'Test processor']
    ] }]
  };
  const { subcatList } = extractSubcategoriesAndParents(
    'Menu\nProcessor\n0\n2\nP00000-B21\nTest processor', rawData, false
  );
  const processor = subcatList.find(item => item.name === 'Processor');
  assert.ok(processor);
  assert.equal(processor.maxQty, 2);
  assert.equal(processor.parentCategory, 'Processor');
  assert.equal(processor.source, 'OCA table constraint');
});

test('mixed OCA tables retain physical accessories when a service SKU is present', () => {
  const entry = {
    parentCategory: 'Accessories & Infrastructure',
    subCategory: 'Rack Options',
    skus: [
      { 'Product #': 'P60283-B21', 'Option Type': 'Standard', Description: 'HPE Over Pack FIO Shipping Kit' },
      { 'Product #': 'HU4B2A3', 'Option Type': 'Service', Description: 'HPE Tech Care Service' }
    ]
  };
  const { hardwareEntries, servicesEntries } = partitionCatalogEntries([entry]);
  assert.deepEqual(hardwareEntries[0].skus.map(item => item['Product #']), ['P60283-B21']);
  assert.deepEqual(servicesEntries[0].skus.map(item => item['Product #']), ['HU4B2A3']);
});

test('physical kits embedded under manufacturing services are retaxonomized as hardware', () => {
  const entry = {
    parentCategory: 'Support Services',
    subCategory: 'Manufacturing Services',
    skus: [
      { 'Product #': 'P73325-B21', 'Option Type': 'Standard', Description: 'HPE ProLiant Compute Localization FIO Kit' }
    ]
  };
  const { hardwareEntries, servicesEntries } = partitionCatalogEntries([entry]);
  assert.equal(servicesEntries.length, 0);
  assert.equal(hardwareEntries[0].parentCategory, 'Accessories & Infrastructure');
  assert.equal(hardwareEntries[0].skus[0]['Component Role'], 'Chassis Infrastructure');
});
