'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('vm');
const { readAmbientRows, probeAmbientRows } = require('../../scripts/lib/scraper/ambient_row_probe');
const { applyUnavailableDomRulesAndSkus } = require('../../scripts/lib/catalog/conditional_discovery');
const { projectWorkbookToMarkdown, verifySemanticProjectionReadback } = require('../../scripts/lib/sync/semantic_workbook_projection');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { safeWriteJsonAtomic } = require('../../scripts/lib/system/fs_compat');
const { createCaptureReceipt } = require('../../scripts/lib/catalog/catalog_capture_receipt');
const { acquireWorkflowLease } = require('../../scripts/lib/system/workflow_lease');

test('browser ambient expression preserves regex escapes and parses 30C', async () => {
  const row = { id: 'ambient30', dataset: { elementid: 'temperatureSection_ambientTemperature' },
    classList: { contains: name => name === 'selected_item' }, closest: () => null, getClientRects: () => [1],
    querySelector: selector => ({ textContent: selector === '.item_desc' ? 'HPE 30C Maximum Recommended Ambient Temperature' : 'P79552-B21' }) };
  const send = async (_ws, _method, params) => ({ result: { value: vm.runInNewContext(params.expression, {
    document: { querySelectorAll: selector => selector === 'tr.item_tr' ? [row] : [] }
  }) } });
  assert.equal((await readAmbientRows(null, send)).ambient[0].temperature, 30);
});

test('failed ambient restoration cannot become a successful capture', async () => {
  const baseline = { ambient: [{ id: 'a30', sku: 'ambient30', temperature: 30, selected: true }], options: [], loading: false };
  const send = async (_ws, _method, params) => ({ result: { value: params.expression.includes('const el =')
    ? { success: false, reason: 'AMBIENT_ROW_UNAVAILABLE' } : baseline } });
  await assert.rejects(probeAmbientRows(null, send, []), /AMBIENT_RESTORE_FAILED/);
});

test('unavailable ambient prohibition does not invent an allowed threshold or commercial facts', () => {
  const entries = [];
  const rules = applyUnavailableDomRulesAndSkus(entries, [], [{ ruleType: 'AMBIENT_GATE', reason: 'H200 NVL GPU and 30C Ambient Temperature cannot be selected together.', affectedSkus: ['S3U30C'] }],
    [{ sku: 'S3U30C', description: 'NVIDIA H200 NVL', discontinuedDate: '12/31/2027' }]);
  assert.equal(rules[0].conditionOperator, 'unknown');
  assert.equal(rules[0].thresholdValue, null);
  assert.equal(rules[0].observedTemperatureC, 30);
  const row = entries[0].skus[0];
  assert.equal(row.listPrice, null);
  assert.equal(row['HPE Recommended'], 'Unknown');
  assert.equal(row.lifecycleStatus, 'Unknown');
  assert.notEqual(row['Option Type'], 'CTO');
});

test('semantic projection retains data and deduplicates long text without substituting counts', () => {
  const long = 'Vendor rule: ' + 'conditional prerequisite '.repeat(12);
  const projection = projectWorkbookToMarkdown([{ title: 'Options', rows: [['SKU', 'Rule'], ['S3U30C', long], ['OTHER', long]] },
    { title: 'Rules', rows: [['Name', 'Text'], ['Special', 'x | y\nnext']] }]);
  assert.ok(projection.markdown.includes('S3U30C'));
  assert.ok(projection.markdown.includes(long));
  assert.ok(projection.markdown.includes('x &#124; y<br>next'));
  assert.ok(projection.markdown.includes('[TEXT_1]'));
  assert.equal(projection.sheetCount, 2);
  assert.equal(verifySemanticProjectionReadback(projection.markdown, JSON.stringify({ content: projection.markdown })), true);
  assert.throws(() => verifySemanticProjectionReadback(projection.markdown, JSON.stringify({ content: 'fingerprint only' })), /READBACK_INCOMPLETE/);
  assert.throws(() => projectWorkbookToMarkdown([{ title: 'T', rows: [['Header'], [long]] }], { maxWords: 5 }), /SEMANTIC_SOURCE_TOO_LARGE/);
});

test('readback tolerates indexed word wrapping but rejects small omissions in long cells', () => {
  const value = 'conditional visibility '.repeat(180) + 'S2J15AAE requires cable KIT99 at 27°C';
  const { markdown } = projectWorkbookToMarkdown([{ title: 'Rules', rows: [['Rule'], [value]] }]);
  const wrapped = markdown.replace('S2J15AAE', 'S2J15AA E').replace('requires', 'requi\nres');
  assert.equal(verifySemanticProjectionReadback(markdown, JSON.stringify({ content: wrapped })), true);
  for (const changed of [wrapped.replace('KIT99', ''), wrapped.replace('27°C', '30°C')]) {
    assert.throws(() => verifySemanticProjectionReadback(markdown, JSON.stringify({ content: changed })), /READBACK_INCOMPLETE/);
  }
});

test('readback preserves rule operators, decimal prices, SKU suffixes and indexed-body provenance', () => {
  const { markdown } = projectWorkbookToMarkdown([{ title: 'Rules', rows: [
    ['SKU', 'Rule', 'Price'], ['ABC-B21', 'ambient ≤27°C and power <300W', '12.50']
  ] }]);
  for (const [before, after] of [['≤', '≥'], ['&lt;', '&gt;'], ['12.50', '1250'], ['ABC-B21', 'ABCB21']]) {
    assert.throws(() => verifySemanticProjectionReadback(markdown,
      JSON.stringify({ content: markdown.replace(before, after), title: markdown })), /READBACK_INCOMPLETE/);
  }
  assert.throws(() => verifySemanticProjectionReadback(markdown, JSON.stringify({ title: markdown })), /READBACK_EMPTY/);
});

test('readback cannot reuse an earlier occurrence to hide a missing sheet row', () => {
  const { markdown } = projectWorkbookToMarkdown([
    { title: 'First', rows: [['SKU'], ['ABC']] },
    { title: 'Second', rows: [['SKU'], ['XYZ']] }
  ]);
  assert.throws(() => verifySemanticProjectionReadback(markdown,
    JSON.stringify({ content: markdown.replace('| 1 | SKU |\n| 2 | XYZ |', '| 2 | XYZ |') })), /READBACK_INCOMPLETE/);
});

test('capture receipt distinguishes active inventory from retained tombstones', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'capture-tombstones-'));
  const product = 'FIXTURE';
  const timestamp = new Date(Date.now() - 1000).toISOString();
  const rows = [{ sku: 'ACTIVE', 'Product #': 'ACTIVE' }, { sku: 'OLD', 'Product #': 'OLD', 'Diff Status': 'REMOVED' }];
  try {
    fs.mkdirSync(path.join(root, 'raw_data'));
    safeWriteJsonAtomic(path.join(root, 'raw_data/oca_raw_data_full.json'), { timestamp });
    safeWriteJsonAtomic(path.join(root, `${product}_Catalog.json`), { metadata: { totalUniqueSKUs: 2, scrapeTimestamp: timestamp }, entries: [{ skus: rows }] });
    safeWriteJsonAtomic(path.join(root, `${product}_Services.json`), { entries: [] });
    safeWriteJsonAtomic(path.join(root, `${product}_Catalog_Rules.json`), { rules: [] });
    const xlsx = require('xlsx-js-style');
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(rows), 'All SKUs');
    xlsx.writeFile(workbook, path.join(root, `${product}_OCA_Catalog.xlsx`));
    const receipt = createCaptureReceipt(root, path.join(root, 'absent'), product, { skipCoverageValidation: true });
    assert.equal(receipt.counts.hardware, 1);
    assert.equal(receipt.counts.retainedHardware, 2);
    assert.equal(receipt.counts.hardwareTombstones, 1);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('lease blocks overlapping reclaim transactions and preserves replaced ownership', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lease-ownership-'));
  try {
    fs.writeFileSync(path.join(root, 'test.lock.claim'), 'another transaction');
    assert.throws(() => acquireWorkflowLease('test', root), /WORKFLOW_BUSY/);
    fs.unlinkSync(path.join(root, 'test.lock.claim'));
    const release = acquireWorkflowLease('test', root);
    fs.writeFileSync(path.join(root, 'test.lock'), 'replacement owner');
    release();
    assert.equal(fs.readFileSync(path.join(root, 'test.lock'), 'utf8'), 'replacement owner');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
