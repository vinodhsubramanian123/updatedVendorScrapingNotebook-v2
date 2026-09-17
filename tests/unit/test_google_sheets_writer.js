'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  buildKnowledgeWorkbookDatasets,
  createGoogleSheetWorkbook,
  normalizeLearningText,
  replaceGoogleSheetWorkbook
} = require('../../scripts/lib/sync/google_sheets_writer.js');

function createFixture() {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'knowledge-workbook-'));
  const historyDir = path.join(targetDir, 'history');
  fs.mkdirSync(historyDir, { recursive: true });
  const csvPath = path.join(targetDir, 'Example_Master_Catalog.csv');
  const learningPath = path.join(targetDir, 'notebook_sync_payload_Example.md');
  fs.writeFileSync(csvPath, 'Product #,Description,List Price\nP12345-B21,Example option,100\n');
  fs.writeFileSync(learningPath, '# Verified Learnings\n\n**Sync Timestamp**: 2026-09-06T01:00:00.000Z  \n\nRule A');
  fs.writeFileSync(path.join(historyDir, 'attribute_history.json'), JSON.stringify([
    { timestamp: '2026-09-06', sku: 'P12345-B21', field: 'Status', oldValue: '90', newValue: 'Active' },
    { timestamp: '2026-09-06', sku: 'P12345-B21', field: 'Status', oldValue: '90', newValue: 'Active' }
  ]));
  fs.writeFileSync(path.join(historyDir, 'catalog_deltas.json'), JSON.stringify([
    { deltaId: 'D-1', status: 'QUARANTINED', affectedSku: 'P12345-B21', ruleUpdate: 'Do not publish' },
    { deltaId: 'D-2', governanceStatus: 'ACTIVE', affectedSku: 'P12345-B21', ruleUpdate: 'Requires verified cable' }
  ]));
  fs.writeFileSync(path.join(historyDir, 'price_history.json'), JSON.stringify({
    'P12345-B21': [{ date: '2026-09-06', price: 100, status: 'ACTIVE' }],
    'P77777-B21': [{ date: '2026-08-01', price: 75, status: 'BASELINE' }, { date: '2026-09-05', price: 75, status: 'REMOVED' }],
    'P99999-B21': [{ date: '2026-09-06', price: 999, status: 'CONTAMINATED_OTHER_PRODUCT' }]
  }));
  fs.writeFileSync(path.join(historyDir, 'discontinued_skus.json'), JSON.stringify({
    'P77777-B21': {
      productNumber: 'P77777-B21', status: 'DISCONTINUED',
      discontinuedDate: '2026-09-05', trackingState: 'STOPPED_AFTER_REMOVAL'
    }
  }));
  return { targetDir, csvPath, learningPath };
}

test('canonical knowledge workbook consolidates catalog, verified learnings, diffs, and stable fingerprints', () => {
  const fixture = createFixture();
  try {
    const first = buildKnowledgeWorkbookDatasets(fixture.csvPath, fixture.learningPath, {
      chassisName: 'Example',
      targetDir: fixture.targetDir
    });
    fs.writeFileSync(fixture.learningPath, '# Verified Learnings\n\n**Sync Timestamp**: 2026-09-07T09:30:00.000Z\n\nRule A');
    const second = buildKnowledgeWorkbookDatasets(fixture.csvPath, fixture.learningPath, {
      chassisName: 'Example',
      targetDir: fixture.targetDir
    });

    assert.equal(first.fingerprints.combined, second.fingerprints.combined, 'timestamp-only changes must not create drift');
    assert.match(normalizeLearningText(fs.readFileSync(fixture.learningPath, 'utf8')), /managed by synchronization ledger/);
    assert.ok(first.changeRows.some(row => row[0] === 'ATTRIBUTE'));
    assert.equal(first.changeRows.filter(row => row[0] === 'ATTRIBUTE').length, 1, 'duplicate history rows must not enter the Sheet');
    assert.ok(first.changeRows.some(row => row[0] === 'VERIFIED_LEARNING' && row[7] === 'D-2'));
    assert.ok(!first.changeRows.some(row => row[7] === 'D-1'), 'quarantined learnings must not enter the canonical source');
    assert.ok(first.changeRows.some(row => row[0] === 'PRICE' && row[2] === 'P12345-B21'));
    assert.ok(first.changeRows.some(row => row[0] === 'PRICE' && row[2] === 'P77777-B21' && row[6] === 'REMOVED'),
      'discontinued SKU price trail must remain in the canonical change ledger after leaving the active catalog');
    assert.ok(first.changeRows.some(row => row[0] === 'LIFECYCLE' && row[2] === 'P77777-B21'),
      'compact discontinued tombstone must remain visible to NotebookLM/Sheets');
    assert.ok(!first.changeRows.some(row => row[2] === 'P99999-B21'), 'non-catalog history must not enter the product Sheet');
  } finally {
    fs.rmSync(fixture.targetDir, { recursive: true, force: true });
  }
});

test('Google Sheet writer creates missing canonical tabs and updates them in batches', async () => {
  const requests = [];
  const client = {
    async request(request) {
      requests.push(request);
      if (request.url.includes('/values:batchGet')) return { data: { valueRanges: [datasets.catalogRows, datasets.learningRows, datasets.changeRows, datasets.metadataRows].map(values => ({ values })) } };
      if (request.method === 'GET') {
        return { data: { sheets: [{ properties: { sheetId: 1, title: 'Certified Catalog' } }] } };
      }
      if (request.url.endsWith('/values:batchUpdate')) return { data: { totalUpdatedCells: 12 } };
      return { data: {} };
    }
  };
  const datasets = {
    catalogRows: [['SKU'], ['P12345-B21']],
    learningRows: [['Learning'], ['Rule A']],
    changeRows: [['Change'], ['Added']],
    metadataRows: [['Key', 'Value'], ['Hash', 'abc']],
    fingerprints: { combined: 'abc' }
  };

  const result = await replaceGoogleSheetWorkbook('sheet-id', datasets, { client });
  assert.equal(result.success, true);
  assert.equal(result.tabsWritten.length, 4);
  const addTabs = requests.find(request => request.url.endsWith(':batchUpdate'));
  assert.equal(addTabs.data.requests.filter(r => r.addSheet).length, 3);
  assert.equal(addTabs.data.requests.filter(r => r.updateCells).length, 4);
  assert.equal(requests.some(request => request.url.includes('batchClear')), false);
  assert.equal(result.readbackVerified, true);
  assert.equal(result.fingerprints.combined, 'abc');
});

test('canonical workbook bootstrap creates one four-tab spreadsheet before writing values', async () => {
  const requests = [];
  const client = {
    async request(request) {
      requests.push(request);
      if (request.url.includes('/values:batchGet')) return { data: { valueRanges: [datasets.catalogRows, datasets.learningRows, datasets.changeRows, datasets.metadataRows].map(values => ({ values })) } };
      if (request.url === 'https://sheets.googleapis.com/v4/spreadsheets' && request.method === 'POST') {
        return { data: { spreadsheetId: 'created-sheet', spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/created-sheet/edit' } };
      }
      if (request.method === 'GET') {
        return { data: { sheets: ['Certified Catalog', 'Verified Learnings', 'Change Log', 'Sync Metadata'].map((title, index) => ({ properties: { sheetId: index + 1, title } })) } };
      }
      return { data: {} };
    }
  };
  const datasets = {
    catalogRows: [['SKU']], learningRows: [['Learning']], changeRows: [['Change']], metadataRows: [['Key', 'Value']],
    fingerprints: { combined: 'fingerprint' }
  };

  const result = await createGoogleSheetWorkbook('Example Canonical Knowledge', datasets, { client });
  assert.equal(result.created, true);
  assert.equal(result.spreadsheetId, 'created-sheet');
  assert.equal(requests[0].data.sheets.length, 4);
});

test('failed batch never clears live sheets and incorrect readback cannot claim sync', async () => {
  const datasets = { catalogRows: [['SKU']], learningRows: [['Rule']], changeRows: [['Change']], metadataRows: [['Key']] };
  const calls = [];
  const client = { async request(request) {
    calls.push(request);
    if (request.method === 'GET') return { data: { sheets: [], valueRanges: [{ values: [['WRONG']] }] } };
    throw new Error('Atomic batch rejected');
  } };
  await assert.rejects(replaceGoogleSheetWorkbook('sheet-id', datasets, { client }), /Atomic batch rejected/);
  assert.equal(calls.some(call => call.url.includes('batchClear')), false);
  const readbackClient = { async request(request) {
    if (request.url.includes('values:batchGet')) return { data: { valueRanges: [{ values: [['WRONG']] }] } };
    return { data: { sheets: [] } };
  } };
  await assert.rejects(replaceGoogleSheetWorkbook('sheet-id', datasets, { client: readbackClient }), /readback mismatch/);
});
