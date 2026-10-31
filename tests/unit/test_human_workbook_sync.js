'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { publishHumanWorkbook } = require('../../scripts/lib/sync/human_workbook_sync');
const { parseProductMeta } = require('../../scripts/lib/catalog/product_meta');
test('disabled Drive publishing causes no cloud operation', () => {
  assert.equal(publishHumanWorkbook({ cfgEntry: {}, run: () => assert.fail('unexpected cloud write') }), null);
});
test('Drive publishing verifies exact destination and full readback', () => {
  const cfgEntry = { publishDriveWorkbook: true, driveSheetId: 'sheet-1' };
  assert.throws(() => publishHumanWorkbook({ cfgEntry: { publishDriveWorkbook: true } }), /TARGET_REQUIRED/);
  const valid = { success: true, readbackVerified: true, spreadsheetId: 'sheet-1', fingerprints: { combined: 'hash' } };
  for (const changed of [{ success: false }, { readbackVerified: false }, { spreadsheetId: 'other' }, { fingerprints: {} }]) {
    assert.throws(() => publishHumanWorkbook({ cfgEntry, run: () => JSON.stringify({ ...valid, ...changed }) }), /READBACK_UNVERIFIED/);
  }
  assert.equal(publishHumanWorkbook({ cfgEntry, csvPath: 'catalog.csv', payloadPath: 'payload.md', chassisName: 'DL380a_Gen12',
    run: (exe, args) => { assert.deepEqual(args.slice(1), ['sheet-1', 'catalog.csv', 'payload.md', 'DL380a_Gen12']); return JSON.stringify(valid); } }).readbackVerified, true);
  assert.throws(() => publishHumanWorkbook({ cfgEntry, run: () => { throw new Error('cloud offline'); } }), /cloud offline/);
  const created = publishHumanWorkbook({ cfgEntry: { publishDriveWorkbook: true }, chassisName: 'SY100Gb_F32_Module',
    csvPath: 'catalog.csv', payloadPath: 'payload.md', run: (exe, args) => {
      assert.deepEqual(args.slice(1, 3), ['--create', 'SY100Gb_F32_Module Canonical Knowledge']);
      return JSON.stringify({ ...valid, spreadsheetId: 'new-sheet' });
    } });
  assert.equal(created.spreadsheetId, 'new-sheet');
});
test('DL380a shorthand retains ProLiant family and separate product identity', () => {
  assert.equal(parseProductMeta('DL380a_Gen12').family, 'ProLiant');
  assert.equal(parseProductMeta('DL380a_Gen12').cleanName, 'DL380a_Gen12');
  assert.equal(parseProductMeta('DL380_Gen12').cleanName, 'DL380_Gen12');
});
test('internal Synergy IDs map to product names accepted by the portal search', () => {
  const { resolveProductIdentity } = require('../../scripts/lib/catalog/product_scope');
  const config = require('../../scripts/config/notebooks.json');
  assert.equal(resolveProductIdentity('SY100Gb_F32_Module', config).productId, 'SY100Gb_F32_Module');
  assert.equal(resolveProductIdentity('SY100Gb_F32', config).productId, 'SY100Gb_F32_Module');
  const { normalizePortalSearchQuery } = require('../../scripts/lib/scraper/navigate_oca');
  const { isExactProductCandidate } = require('../../scripts/lib/scraper/navigate_oca');
  const query = 'Synergy Virtual Connect SE 100Gb F32';
  assert.equal(isExactProductCandidate(query, { text: 'HPE Synergy Virtual Connect SE 100Gb F32 Module' }), true);
  for (const text of ['HPE Synergy 480 Gen12 Compute Module', 'HPE Synergy Virtual Connect SE 100Gb F32 Module Support', 'HPE Synergy Virtual Connect SE 40Gb F8 Module']) {
    assert.equal(isExactProductCandidate(query, { text }), false);
  }
  assert.equal(normalizePortalSearchQuery('SY480_Gen12'), 'Synergy 480 Gen12');
  assert.equal(normalizePortalSearchQuery('SY100Gb_F32_Module'), 'Synergy Virtual Connect SE 100Gb F32');
  assert.equal(normalizePortalSearchQuery('DL380a_Gen12'), 'DL380a Gen12');
});
