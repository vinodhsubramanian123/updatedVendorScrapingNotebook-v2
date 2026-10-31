'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateComponentObservation } = require('../../scripts/lib/scraper/active_component_capture');
test('module identity and owned service suffix survive catalog normalization', () => {
  const { parseProductMeta } = require('../../scripts/lib/catalog/product_meta');
  const { isCanonicalCtoChassisCandidate } = require('../../scripts/catalogs/build_catalog');
  const { isValidHpeSKU, isServiceSku, cleanBaseSKU } = require('../../scripts/lib/catalog/sku');
  assert.equal(parseProductMeta('SY100Gb_F32_Module').family, 'Synergy');
  assert.equal(isCanonicalCtoChassisCandidate({ sku: '867796-B21', text: 'HPE Virtual Connect SE 100Gb F32 Module for Synergy' }, 'SY100Gb_F32_Module'), true);
  assert.equal(isValidHpeSKU('HU4D5A5#Z1R'), true);
  assert.equal(isServiceSku('HU4D5A5#Z1R'), true);
  assert.equal(cleanBaseSKU('HU4D5A5#Z1R'), 'HU4D5A5#Z1R');
  assert.equal(isValidHpeSKU('HU4D5A5#UNKNOWN'), false);
});
test('unpublished selected support price cannot borrow a quantity, total or historical price', () => {
  const { parseSingleTableRow } = require('../../scripts/catalogs/build_catalog');
  const headers = ['Product #', 'Description', 'Price (USD)', 'Quantity', 'Extended Price (USD)'];
  const historical = new Map([['HU4D5A5#Z1R', '999.00']]);
  const row = ['HU4D5A5#Z1R', 'HPE 5Y Complete Care Service', '', '2', '123.00'];
  const result = parseSingleTableRow(row, headers, 0, historical);
  assert.equal(result.obj['Unit Price (USD)'], '');
  assert.equal(result.obj.listPrice, null);
  row[2] = '0.00';
  assert.equal(parseSingleTableRow(row, headers, 0, historical).obj.listPrice, 0);
});
test('optical reach and QSFP adapters do not become hard disks or PCIe cards', () => {
  const { synthesizeSubcategoryName } = require('../../scripts/lib/catalog/product_meta');
  assert.equal(synthesizeSubcategoryName('Networking', ['10Gb SFP+ 10km Transceiver', 'QSFP to SFP Adapter']), 'Optical Transceivers & DAC Cables');
  assert.equal(synthesizeSubcategoryName('Storage', ['SAS 10k Hard Drive']), 'Hard Disk Drives (SAS/SATA)');
});
test('owned F32 capture binds exact module, owner and parent without relabeling frame', () => {
  const observed = { heading: 'HPE Virtual Connect SE 100Gb F32 Module for Synergy [867796-B21]',
    owner: '100Gb Virtual #1', parent: 'Synergy 12000 Frame #1' };
  const result = validateComponentObservation(observed, 'SY100Gb_F32_Module', '867796-B21');
  assert.equal(result.selectedSku, '867796-B21');
  assert.equal(result.parentConfiguration, observed.parent);
  for (const change of [{ parent: '' }, { owner: '' }, { heading: 'Synergy 12000 Frame [P51174-B21]' },
    { heading: 'HPE Virtual Connect SE 40Gb F8 Module [867796-B21]' }]) {
    assert.throws(() => validateComponentObservation({ ...observed, ...change }, 'SY100Gb_F32_Module', '867796-B21'), /IDENTITY_UNVERIFIED/);
  }
  assert.throws(() => validateComponentObservation(observed, 'SY100Gb_F32_Module', 'P06584-B21'), /IDENTITY_UNVERIFIED/);
});
