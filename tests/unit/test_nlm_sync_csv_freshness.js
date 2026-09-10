'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const xlsx = require('xlsx-js-style');
const { assertPayloadProductIsolation, isDriveFreshnessReportClean, isGroundedCanary, refreshMasterCatalogCsv } = require('../../scripts/lib/sync/nlm_sync_client.js');

test('canonical CSV is refreshed from the current audited workbook before cloud sync', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nlm-csv-freshness-'));
  try {
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
      ['Product #', 'Description'],
      ['P50219-B21', 'Current certified SSD']
    ]), 'All SKUs');
    xlsx.writeFile(workbook, path.join(dir, 'Example_OCA_Catalog.xlsx'));
    fs.writeFileSync(path.join(dir, 'Example_Master_Catalog.csv'), 'stale,data\n');
    const payloadPath = path.join(dir, 'notebook_sync_payload_Example.md');
    fs.writeFileSync(payloadPath, '# Example');

    const csvPath = refreshMasterCatalogCsv(payloadPath, 'Example');
    const csv = fs.readFileSync(csvPath, 'utf8');
    assert.match(csv, /P50219-B21/);
    assert.doesNotMatch(csv, /stale,data/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Notebook payload and canary must remain exact-product and exact-source grounded', () => {
  const cfg = { notebooks: { DL380_Gen12: {}, DL380a_Gen12: {} } };
  assert.equal(assertPayloadProductIsolation('# DL380a_Gen12\nP76706-B21', 'DL380a_Gen12', cfg), true);
  assert.throws(
    () => assertPayloadProductIsolation('# DL380a_Gen12\nDL380_Gen12 leaked rule', 'DL380a_Gen12', cfg),
    /Product isolation rejected/
  );
  assert.equal(assertPayloadProductIsolation(
    '# DL380a_Gen12\n1. [SHARED_ACCESSORY_VERIFIED target=DL380_Gen12,DL380a_Gen12] P52341-B21 verified rail compatibility (Class: RAIL; Evidence: CERTIFIED_OCA_CATALOG; Sources: oca-dl380,oca-dl380a)',
    'DL380a_Gen12',
    cfg
  ), true);
  assert.equal(assertPayloadProductIsolation(
    '# DL380_Gen12\n| `P60283-B21` | [SHARED_ACCESSORY_VERIFIED target=DL380_Gen12] HPE DL380 Gen11 Over Pack FIO Shipping Kit (Evidence: CERTIFIED_OCA_CATALOG; Sources: DL380_Gen12_Master_Catalog) | REINSTATED |',
    'DL380_Gen12',
    { notebooks: { DL380_Gen12: {}, DL380_Gen11: {} } }
  ), true);
  assert.throws(
    () => assertPayloadProductIsolation(
      '# DL380a_Gen12\n1. [SHARED_ACCESSORY_VERIFIED target=DL380_Gen12,DL380a_Gen12] P52341-B21 claimed rail compatibility (Class: RAIL; Evidence: CERTIFIED_OCA_CATALOG)',
      'DL380a_Gen12',
      cfg
    ),
    /Product isolation rejected/
  );
  assert.equal(isGroundedCanary({ answer: 'DL380a_Gen12 is verified', sources_used: ['source-a'] }, 'source-a', 'DL380a_Gen12'), true);
  assert.equal(isGroundedCanary({ answer: 'DL380a_Gen12 is verified', sources_used: ['wrong-source'] }, 'source-a', 'DL380a_Gen12'), false);
});

test('Drive freshness certification fails closed on a non-empty stale report', () => {
  assert.equal(isDriveFreshnessReportClean('✓ All Drive sources are up to date.'), true);
  assert.equal(isDriveFreshnessReportClean('[]'), true);
  assert.equal(isDriveFreshnessReportClean('[{"id":"stale-source"}]'), false);
});
