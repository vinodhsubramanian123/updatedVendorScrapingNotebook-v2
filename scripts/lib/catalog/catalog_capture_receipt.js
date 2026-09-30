'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { safeWriteJsonAtomic } = require('../system/fs_compat.js');

const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function currentRows(catalog) {
  return (catalog.entries || []).flatMap(entry => entry.skus || [])
    .filter(row => !['REMOVED', 'DISCONTINUED'].includes(String(row['Diff Status'] || '').toUpperCase()));
}
function skuSet(catalog) {
  return new Set(currentRows(catalog).map(row => row.sku || row['Product #']).filter(Boolean));
}
function summarizeCatalog(dir, product) {
  const catalogPath = path.join(dir, `${product}_Catalog.json`);
  const catalog = readJson(catalogPath);
  const services = readJson(path.join(dir, `${product}_Services.json`));
  const rules = readJson(path.join(dir, `${product}_Catalog_Rules.json`));
  return { catalog, services, rules, counts: {
    hardware: skuSet(catalog).size, services: skuSet(services).size,
    rules: (rules.rules || []).length, categories: new Set((catalog.entries || []).map(e => e.parentCategory)).size
  }, hashes: Object.fromEntries(['Catalog.json', 'Services.json', 'Catalog_Rules.json', 'OCA_Catalog.xlsx']
    .map(suffix => [suffix, hash(fs.readFileSync(path.join(dir, `${product}_${suffix}`)))])) };
}
function compareSkus(before, after) {
  const previous = skuSet(before || {});
  const current = skuSet(after);
  return { added: [...current].filter(sku => !previous.has(sku)), removed: [...previous].filter(sku => !current.has(sku)) };
}

// Called after the existing workbook audit and before replacing the live folder.
// A receipt describes captured coverage; it never certifies every portal state.
function createCaptureReceipt(stagingDir, liveDir, product) {
  const next = summarizeCatalog(stagingDir, product);
  const raw = readJson(path.join(stagingDir, 'raw_data', 'oca_raw_data_full.json'));
  const capture = next.catalog.metadata?.scrapeTimestamp;
  if (!capture || !Number.isFinite(Date.parse(capture)) || Date.parse(capture) > Date.now()
      || Date.parse(capture) !== Date.parse(raw.timestamp)) throw new Error('Capture timestamp does not match raw vendor evidence');
  if (!next.counts.hardware || next.counts.hardware !== Number(next.catalog.metadata.totalUniqueSKUs)) {
    throw new Error('Hardware SKU count does not match current catalog rows');
  }
  const workbook = require('xlsx-js-style').readFile(path.join(stagingDir, `${product}_OCA_Catalog.xlsx`));
  const workbookRows = require('xlsx-js-style').utils.sheet_to_json(workbook.Sheets['All SKUs']);
  const actual = skuSet({ entries: [{ skus: workbookRows }] });
  const expected = skuSet(next.catalog);
  if ([...expected].some(sku => !actual.has(sku))) throw new Error('Workbook is missing catalog SKUs');
  const previousFile = path.join(liveDir, `${product}_Catalog.json`);
  let previous = null;
  if (fs.existsSync(previousFile)) previous = summarizeCatalog(liveDir, product);
  const receipt = {
    schemaVersion: 1, product, vendor: 'HPE', capturedAt: capture, auditedAt: new Date().toISOString(),
    mode: previous ? 'REFRESH' : 'FIRST_CAPTURE', status: 'STAGING_AUDITED',
    coverage: { textExtractionMode: raw.textExtractionMode || 'UNKNOWN',
      outsideTableNotesCaptured: raw.outsideTableNotesCaptured === true,
      conditionalDiscovery: raw.conditionalDiscovery || 'UNVERIFIED',
      completeness: 'CAPTURED_STATES_ONLY' },
    counts: next.counts, previousCounts: previous?.counts || null, hashes: next.hashes,
    rawSha256: hash(fs.readFileSync(path.join(stagingDir, 'raw_data', 'oca_raw_data_full.json'))),
    sheets: workbook.SheetNames.map(name => ({ name, rows: require('xlsx-js-style').utils.sheet_to_json(workbook.Sheets[name], { header: 1 }).length })),
    deltas: { hardware: compareSkus(previous?.catalog, next.catalog), services: compareSkus(previous?.services, next.services),
      rulesChanged: previous ? JSON.stringify(previous.rules.rules) !== JSON.stringify(next.rules.rules) : true,
      hardwareChanges: next.catalog.metadata.diffSummary || null, serviceChanges: next.services.metadata?.diffSummary || null },
    cloud: { status: 'PENDING' }
  };
  safeWriteJsonAtomic(path.join(stagingDir, 'capture_receipt.json'), receipt);
  return receipt;
}
function finalizeCaptureReceipt(dir, receipt, sync) {
  const completed = { ...receipt, status: 'LOCAL_PROMOTED', promotedAt: new Date().toISOString(),
    cloud: { status: sync?.syncStatus || 'CLOUD_FAILED', success: sync?.success === true,
      sourceId: sync?.uploadResult?.newSourceId || null, consolidationVerified: sync?.uploadResult?.consolidationVerified === true,
      error: sync?.error || sync?.uploadResult?.message || null } };
  safeWriteJsonAtomic(path.join(dir, 'capture_receipt.json'), completed);
  const history = path.join(dir, 'history', 'capture_receipts');
  fs.mkdirSync(history, { recursive: true });
  safeWriteJsonAtomic(path.join(history, `${receipt.auditedAt.replace(/[:.]/g, '-')}.json`), completed);
  return completed;
}
module.exports = { createCaptureReceipt, finalizeCaptureReceipt, currentRows, skuSet };
