'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseBomLifecycleBadge,
  parseBomGridRows,
  applyBomPricesToChassisDiscovery
} = require('../../scripts/lib/scraper/bom_base_price.js');
const { _rankBackplaneCandidates } = require('../../scripts/lib/scraper/drive_cage_selector_probe.js');

test('parseBomLifecycleBadge extracts 90/OB/CS/DS prefixes without corrupting SKU', () => {
  assert.deepEqual(parseBomLifecycleBadge('90R4G55B'), {
    sku: 'R4G55B',
    lifecycleStatus: 'EOL Warning (90-Day)',
    badge: '90'
  });
  assert.deepEqual(parseBomLifecycleBadge('OB Q1H70A#AC3'), {
    sku: 'Q1H70A#AC3',
    lifecycleStatus: 'Obsolete (OB)',
    badge: 'OB'
  });
  assert.deepEqual(parseBomLifecycleBadge('P72174-B21'), {
    sku: 'P72174-B21',
    lifecycleStatus: 'Active',
    badge: ''
  });
});

test('parseBomGridRows extracts exact positive, verified zero, and unpriced rows', () => {
  const rows = [
    ['Hierarchy', 'Qty', '', 'Product #', 'Product Description', 'HPE Recommended', 'Icon Name', 'Config Name', 'Est. Lead Time', 'Start', 'Disc', 'Obs', 'Unit Price (USD)', 'Ext. Price (USD)'],
    ['(1)', '1', '', '90R4G55B', 'HPE SN3600B 16Gb Switch', '', 'Icon #1', 'Switch #1', '4', '09/07/2021', '01/31/2027', '02/28/2027', '13,899.00', '13,899.00'],
    ['(1)', '1', '', 'S3L12A', 'HPE Alletra Storage MP X10000 Base Configuration', '', 'Icon #1', 'X10k', '', '01/01/2025', '', '', '0.00', '0.00'],
    ['(1)', '1', '', 'P80432-B21', 'Unpriced Kit', '', 'Icon #1', 'DL580', '', '', '', '', 'NA', 'NA']
  ];
  const parsed = parseBomGridRows(rows);
  assert.equal(parsed.length, 3);
  assert.equal(parsed[0].sku, 'R4G55B');
  assert.equal(parsed[0].unitPriceUsd, 13899);
  assert.equal(parsed[0].priceVerified, true);
  assert.equal(parsed[0].leadTimeDays, 4);
  assert.equal(parsed[0].lifecycleStatus, 'EOL Warning (90-Day)');

  assert.equal(parsed[1].sku, 'S3L12A');
  assert.equal(parsed[1].unitPriceUsd, 0);
  assert.equal(parsed[1].priceVerified, true);

  assert.equal(parsed[2].sku, 'P80432-B21');
  assert.equal(parsed[2].unitPriceUsd, null);
  assert.equal(parsed[2].priceVerified, false);
});

test('applyBomPricesToChassisDiscovery updates only priceVerified matching candidates', () => {
  const discovery = {
    selectedSku: 'R4G55B',
    candidates: [
      { sku: 'R4G55B', listPriceUsd: 0, leadTime: '', status: 'Active' },
      { sku: 'R7R97A', listPriceUsd: 0, leadTime: '', status: 'Active' }
    ]
  };
  const updated = applyBomPricesToChassisDiscovery(discovery, [
    {
      sku: 'R4G55B',
      isTopLevel: true,
      unitPriceUsd: 13899,
      priceVerified: true,
      leadTime: '4 days',
      leadTimeDays: 4,
      startDate: '09/07/2021',
      discontinuedDate: '01/31/2027',
      lifecycleStatus: 'EOL Warning (90-Day)'
    }
  ]);
  assert.equal(updated, 1);
  assert.equal(discovery.candidates[0].listPriceUsd, 13899);
  assert.equal(discovery.candidates[0].priceVerified, true);
  assert.equal(discovery.candidates[0].priceSource, 'OCA_BOM_TAB');
  assert.equal(discovery.candidates[0].status, 'EOL Warning (90-Day)');
  assert.equal(discovery.candidates[1].listPriceUsd, 0);
});

test('_rankBackplaneCandidates prioritizes U.3 Tri-Mode SFF cages cleanly', () => {
  const ranked = _rankBackplaneCandidates([
    { sku: 'P55085-B21', description: 'HPE ProLiant DL385 Gen11 4LFF SAS/SATA Mid Tray Backplane Kit' },
    { sku: 'P48895-B21', description: 'HPE ProLiant DL360 Gen11 8SFF x1 U.3 Tri-Mode Backplane Kit' }
  ]);
  assert.equal(ranked[0].sku, 'P48895-B21');
});
