'use strict';

/**
 * Maintain one canonical Google Sheet source per product.
 *
 * The workbook contains the certified catalog, consolidated verified learnings,
 * the scrape/change ledger, and content fingerprints. NotebookLM can therefore
 * refresh one stable Drive source instead of accumulating dated uploads.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx-js-style');
const { GoogleAuth } = require('google-auth-library');

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const DEFAULT_TABS = Object.freeze({
  catalog: 'Certified Catalog',
  learnings: 'Verified Learnings',
  changes: 'Change Log',
  metadata: 'Sync Metadata'
});

function loadCsvValues(csvPath) {
  if (!csvPath || !fs.existsSync(csvPath)) throw new Error(`Catalog CSV not found: ${csvPath || '(empty path)'}`);
  const workbook = xlsx.read(fs.readFileSync(csvPath, 'utf8'), { type: 'string', raw: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error(`Catalog CSV has no readable worksheet: ${csvPath}`);
  const values = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
  if (values.length === 0) throw new Error(`Catalog CSV is empty: ${csvPath}`);
  return values;
}

function normalizeLearningText(text) {
  return String(text || '')
    .replace(/^\*\*Sync Timestamp\*\*:.*$/gmi, '**Sync Timestamp**: [managed by synchronization ledger]')
    .replace(/[ \t]+$/gm, '')
    .trim();
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stableRowsFingerprint(rows) {
  return sha256(JSON.stringify(rows));
}

function readJsonIfPresent(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Invalid change-ledger JSON ${filePath}: ${error.message}`);
  }
}

function toChangeRows(targetDir, options = {}) {
  const historyDir = path.join(targetDir, 'history');
  const rows = [['Change Type', 'Timestamp', 'SKU', 'Attribute', 'Previous Value', 'Current Value', 'Status', 'Evidence']];
  const seen = new Set();
  const pushChange = row => {
    const key = JSON.stringify(row.slice(0, 7));
    if (seen.has(key)) return;
    seen.add(key);
    rows.push(row);
  };
  const attributeHistory = readJsonIfPresent(path.join(historyDir, 'attribute_history.json'), []);
  const priceHistory = readJsonIfPresent(path.join(historyDir, 'price_history.json'), {});
  const catalogDeltas = readJsonIfPresent(path.join(historyDir, 'catalog_deltas.json'), []);
  const discontinued = readJsonIfPresent(path.join(historyDir, 'discontinued_skus.json'), {});
  const allowedSkus = options.allowedSkus instanceof Set ? options.allowedSkus : null;
  const isAllowedCatalogSku = sku => !sku || !allowedSkus || allowedSkus.has(String(sku).toUpperCase());

  for (const item of Array.isArray(attributeHistory) ? attributeHistory : []) {
    const sku = item.sku || item.productNumber || item['Product #'] || '';
    if (!isAllowedCatalogSku(sku)) continue;
    pushChange([
      'ATTRIBUTE', item.timestamp || item.date || '', sku,
      item.field || item.attribute || '', item.oldValue ?? '', item.newValue ?? '', item.status || 'CHANGED',
      item.source || item.evidence || 'certified scrape diff'
    ]);
  }

  const priceEntries = Array.isArray(priceHistory)
    ? priceHistory
    : Object.entries(priceHistory || {}).flatMap(([sku, value]) =>
      (Array.isArray(value) ? value : [value]).filter(Boolean).map(item => ({ ...item, sku: item.sku || sku }))
    );
  for (const item of priceEntries.filter(Boolean)) {
    const sku = item.sku || item.productNumber || item['Product #'] || '';
    if (!isAllowedCatalogSku(sku)) continue;
    pushChange([
      'PRICE', item.timestamp || item.date || '', sku,
      'List Price', item.oldPrice ?? item.previousPrice ?? '', item.newPrice ?? item.price ?? '', item.status || 'CHANGED',
      item.source || 'certified price history'
    ]);
  }

  const deltaEntries = Array.isArray(catalogDeltas) ? catalogDeltas : (catalogDeltas.deltas || []);
  for (const item of deltaEntries) {
    if (!['ACTIVE', 'PROMOTED', 'VERIFIED', 'APPLIED_TO_PRECHECKS_AND_RAG'].includes(String(item.governanceStatus || item.status || '').toUpperCase())) continue;
    pushChange([
      'VERIFIED_LEARNING', item.promotedAt || item.timestamp || item.createdAt || '', item.affectedSku || item.sku || '',
      item.errorType || item.scopeTaxonomy || '', '', item.ruleUpdate || item.rawMessage || '', 'VERIFIED',
      item.deltaId || item.source || 'verified KnowledgeDelta'
    ]);
  }

  for (const item of Object.values(discontinued || {})) {
    const sku = item.productNumber || item.sku || item['Product #'] || '';
    if (!isAllowedCatalogSku(sku)) continue;
    pushChange([
      'LIFECYCLE', item.discontinuedDate || item.timestamp || '', sku,
      'Lifecycle Status', item.previousStatus || '', item.status || '', item.status || '', item.source || 'certified scrape diff'
    ]);
  }

  return rows;
}

function buildKnowledgeWorkbookDatasets(csvPath, learningPath, options = {}) {
  if (!learningPath || !fs.existsSync(learningPath)) throw new Error(`Verified learning document not found: ${learningPath || '(empty path)'}`);
  const catalogRows = loadCsvValues(csvPath);
  const skuColumn = catalogRows[0].findIndex(value => /^(?:product\s*#|part\s*no|sku)$/i.test(String(value).trim()));
  const allowedSkus = new Set(skuColumn >= 0 ? catalogRows.slice(1).map(row => String(row[skuColumn] || '').toUpperCase()).filter(Boolean) : []);
  const normalizedLearning = normalizeLearningText(fs.readFileSync(learningPath, 'utf8'));
  const learningRows = [['Canonical Verified Product Learnings'], ...normalizedLearning.split('\n').map(line => [line])];
  const targetDir = options.targetDir || path.dirname(csvPath);
  const changeRows = toChangeRows(targetDir, { allowedSkus });
  const fingerprints = {
    catalog: stableRowsFingerprint(catalogRows),
    learnings: sha256(normalizedLearning),
    changes: stableRowsFingerprint(changeRows)
  };
  fingerprints.combined = sha256(`${fingerprints.catalog}:${fingerprints.learnings}:${fingerprints.changes}`);
  const metadataRows = [
    ['Key', 'Value'],
    ['Product', options.chassisName || path.basename(targetDir)],
    ['Last Successful Sheet Write', new Date().toISOString()],
    ['Catalog SHA-256', fingerprints.catalog],
    ['Verified Learnings SHA-256', fingerprints.learnings],
    ['Change Log SHA-256', fingerprints.changes],
    ['Combined Content SHA-256', fingerprints.combined],
    ['Source Policy', 'Official vendor + certified scrape + verified KnowledgeDelta only']
  ];
  return { catalogRows, learningRows, changeRows, metadataRows, fingerprints };
}

function quoteSheetTitle(title) {
  return `'${String(title).replace(/'/g, "''")}'`;
}

async function ensureTabs(client, baseUrl, requestedTitles) {
  const metadata = await client.request({ url: `${baseUrl}?fields=sheets.properties(sheetId,title)`, method: 'GET' });
  const availableTitles = new Set((metadata.data?.sheets || []).map(sheet => sheet.properties?.title).filter(Boolean));
  const missing = requestedTitles.filter(title => !availableTitles.has(title));
  if (missing.length === 0) return;
  await client.request({
    url: `${baseUrl}:batchUpdate`,
    method: 'POST',
    data: { requests: missing.map(title => ({ addSheet: { properties: { title } } })) }
  });
}

async function replaceGoogleSheetWorkbook(spreadsheetId, datasets, options = {}) {
  if (!spreadsheetId) throw new Error('Google spreadsheet ID is required');
  const tabs = { ...DEFAULT_TABS, ...(options.tabs || {}) };
  const tabRows = [
    [tabs.catalog, datasets.catalogRows],
    [tabs.learnings, datasets.learningRows],
    [tabs.changes, datasets.changeRows],
    [tabs.metadata, datasets.metadataRows]
  ];
  const auth = options.auth || new GoogleAuth({ scopes: [SHEETS_SCOPE] });
  const client = options.client || await auth.getClient();
  const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}`;
  await ensureTabs(client, baseUrl, tabRows.map(([title]) => title));

  const ranges = tabRows.map(([title]) => `${quoteSheetTitle(title)}!A:ZZZ`);
  await client.request({ url: `${baseUrl}/values:batchClear`, method: 'POST', data: { ranges } });
  const update = await client.request({
    url: `${baseUrl}/values:batchUpdate`,
    method: 'POST',
    data: {
      valueInputOption: 'RAW',
      data: tabRows.map(([title, values]) => ({
        range: `${quoteSheetTitle(title)}!A1`,
        majorDimension: 'ROWS',
        values
      }))
    }
  });

  return {
    success: true,
    spreadsheetId,
    tabsWritten: tabRows.map(([title, rows]) => ({ title, rows: rows.length })),
    totalUpdatedCells: update.data?.totalUpdatedCells || null,
    fingerprints: datasets.fingerprints || null
  };
}

async function createGoogleSheetWorkbook(title, datasets, options = {}) {
  const tabs = { ...DEFAULT_TABS, ...(options.tabs || {}) };
  const auth = options.auth || new GoogleAuth({ scopes: [SHEETS_SCOPE] });
  const client = options.client || await auth.getClient();
  const created = await client.request({
    url: 'https://sheets.googleapis.com/v4/spreadsheets',
    method: 'POST',
    data: {
      properties: { title },
      sheets: Object.values(tabs).map(sheetTitle => ({ properties: { title: sheetTitle } }))
    }
  });
  const spreadsheetId = created.data?.spreadsheetId;
  if (!spreadsheetId) throw new Error('Google Sheets API did not return a spreadsheet ID');
  const writeResult = await replaceGoogleSheetWorkbook(spreadsheetId, datasets, { ...options, client, tabs });
  return {
    ...writeResult,
    created: true,
    spreadsheetUrl: created.data?.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
  };
}

async function replaceGoogleSheetFromCsv(spreadsheetId, csvPath, requestedSheetTitle = '') {
  const values = loadCsvValues(csvPath);
  const title = requestedSheetTitle || DEFAULT_TABS.catalog;
  return replaceGoogleSheetWorkbook(spreadsheetId, {
    catalogRows: values,
    learningRows: [['Canonical Verified Product Learnings'], ['No learning payload supplied.']],
    changeRows: [['Change Type', 'Timestamp', 'SKU', 'Attribute', 'Previous Value', 'Current Value', 'Status', 'Evidence']],
    metadataRows: [['Key', 'Value'], ['Catalog SHA-256', stableRowsFingerprint(values)]],
    fingerprints: { catalog: stableRowsFingerprint(values) }
  }, { tabs: { catalog: title } });
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const createMode = args[0] === '--create';
  const [spreadsheetIdOrTitle, csvPath, learningPath, chassisName = ''] = args.slice(createMode ? 1 : 0);
  Promise.resolve()
    .then(() => buildKnowledgeWorkbookDatasets(csvPath, learningPath, { chassisName }))
    .then(datasets => createMode
      ? createGoogleSheetWorkbook(spreadsheetIdOrTitle, datasets)
      : replaceGoogleSheetWorkbook(spreadsheetIdOrTitle, datasets))
    .then(result => process.stdout.write(`${JSON.stringify(result)}\n`))
    .catch(error => {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    });
}

module.exports = {
  DEFAULT_TABS,
  buildKnowledgeWorkbookDatasets,
  createGoogleSheetWorkbook,
  loadCsvValues,
  normalizeLearningText,
  replaceGoogleSheetFromCsv,
  replaceGoogleSheetWorkbook,
  stableRowsFingerprint,
  toChangeRows
};
