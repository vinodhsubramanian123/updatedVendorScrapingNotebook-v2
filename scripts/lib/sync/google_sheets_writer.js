'use strict';

/**
 * Replace a Google Sheet tab with the certified local master catalog CSV.
 * Authentication uses Google Application Default Credentials and never stores
 * tokens in the repository.
 */

const fs = require('fs');
const xlsx = require('xlsx-js-style');
const { GoogleAuth } = require('google-auth-library');

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

function loadCsvValues(csvPath) {
  if (!csvPath || !fs.existsSync(csvPath)) throw new Error(`Catalog CSV not found: ${csvPath || '(empty path)'}`);
  const workbook = xlsx.read(fs.readFileSync(csvPath, 'utf8'), { type: 'string', raw: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error(`Catalog CSV has no readable worksheet: ${csvPath}`);
  const values = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
  if (values.length === 0) throw new Error(`Catalog CSV is empty: ${csvPath}`);
  return values;
}

function quoteSheetTitle(title) {
  return `'${String(title).replace(/'/g, "''")}'`;
}

async function replaceGoogleSheetFromCsv(spreadsheetId, csvPath, requestedSheetTitle = '') {
  if (!spreadsheetId) throw new Error('Google spreadsheet ID is required');
  const values = loadCsvValues(csvPath);
  const auth = new GoogleAuth({ scopes: [SHEETS_SCOPE] });
  const client = await auth.getClient();
  const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}`;
  const metadata = await client.request({ url: `${baseUrl}?fields=sheets.properties.title`, method: 'GET' });
  const availableTitles = (metadata.data?.sheets || []).map(s => s.properties?.title).filter(Boolean);
  const sheetTitle = requestedSheetTitle || availableTitles[0];
  if (!sheetTitle || !availableTitles.includes(sheetTitle)) {
    throw new Error(`Google Sheet tab not found: ${requestedSheetTitle || '(no tabs returned)'}`);
  }

  const range = `${quoteSheetTitle(sheetTitle)}!A:ZZZ`;
  const encodedRange = encodeURIComponent(range);
  await client.request({ url: `${baseUrl}/values/${encodedRange}:clear`, method: 'POST', data: {} });
  const update = await client.request({
    url: `${baseUrl}/values/${encodedRange}?valueInputOption=RAW`,
    method: 'PUT',
    data: { majorDimension: 'ROWS', values }
  });

  return {
    success: true,
    spreadsheetId,
    sheetTitle,
    rowsWritten: values.length,
    columnsWritten: Math.max(...values.map(row => row.length)),
    updatedRange: update.data?.updatedRange || range
  };
}

if (require.main === module) {
  replaceGoogleSheetFromCsv(process.argv[2], process.argv[3], process.argv[4] || '')
    .then(result => process.stdout.write(`${JSON.stringify(result)}\n`))
    .catch(error => {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    });
}

module.exports = { replaceGoogleSheetFromCsv, loadCsvValues };
