'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const xlsx = require('xlsx-js-style');

const {
  SCOPES,
  checkGoogleAuth,
  createGoogleSheet,
  uploadFileToGoogleSheet,
  assertNotebookSourceEligible
} = require('../../scripts/services/google_sheets_service.js');

test('SCOPES includes spreadsheets and drive permissions', () => {
  assert.ok(SCOPES.includes('https://www.googleapis.com/auth/spreadsheets'));
  assert.ok(SCOPES.includes('https://www.googleapis.com/auth/drive') || SCOPES.includes('https://www.googleapis.com/auth/drive.file'));
});

test('checkGoogleAuth returns actionable instructions when unauthenticated', async () => {
  const status = await checkGoogleAuth();
  assert.equal(typeof status.authenticated, 'boolean');
  assert.equal(typeof status.adcPresent, 'boolean');
  assert.ok(Array.isArray(status.instructions));
  if (!status.authenticated) {
    assert.ok(status.instructions.some(line => line.includes('gcloud auth application-default login')));
  }
});

test('createGoogleSheet sends properly structured POST to Google Sheets API and populates data', async () => {
  const requests = [];
  const mockClient = {
    async request(req) {
      requests.push(req);
      if (req.method === 'POST' && (req.url === 'https://www.googleapis.com/drive/v3/files' || req.url === 'https://sheets.googleapis.com/v4/spreadsheets')) {
        return {
          data: {
            id: 'mock-sheet-12345',
            spreadsheetId: 'mock-sheet-12345',
            spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/mock-sheet-12345/edit'
          }
        };
      }
      if (req.method === 'POST' && req.url.includes('/values:batchUpdate')) {
        return { data: { totalUpdatedCells: 4 } };
      }
      return { data: {} };
    }
  };

  const res = await createGoogleSheet('Test BOQ Summary', {
    data: [
      ['SKU', 'Qty', 'Price'],
      ['P52534-B21', 1, 5070]
    ],
    client: mockClient
  });

  assert.equal(res.spreadsheetId, 'mock-sheet-12345');
  assert.equal(res.title, 'Test BOQ Summary');
  assert.equal(requests.length, 2);
  assert.equal(requests[0].method, 'POST');
  assert.equal(requests[0].data.name || requests[0].data.properties?.title, 'Test BOQ Summary');
  assert.equal(requests[1].method, 'POST');
  assert.equal(requests[1].data.data[0].values[1][0], 'P52534-B21');
});

test('createGoogleSheet creates file inside folderId using Drive API when folderId is specified', async () => {
  const requests = [];
  const mockClient = {
    async request(req) {
      requests.push(req);
      if (req.method === 'POST' && req.url === 'https://www.googleapis.com/drive/v3/files') {
        return { data: { id: 'drive-file-in-folder', name: 'Folder Sheet' } };
      }
      return { data: {} };
    }
  };

  const res = await createGoogleSheet('Folder Sheet', {
    folderId: 'folder-abc-123',
    client: mockClient
  });

  assert.equal(res.spreadsheetId, 'drive-file-in-folder');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'https://www.googleapis.com/drive/v3/files');
  assert.deepEqual(requests[0].data.parents, ['folder-abc-123']);
  assert.equal(requests[0].data.mimeType, 'application/vnd.google-apps.spreadsheet');
});

test('uploadFileToGoogleSheet reads XLSX and converts sheets into Google Sheets format', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-sheets-upload-'));
  const testXlsx = path.join(tempDir, 'sample_quote.xlsx');

  try {
    const wb = xlsx.utils.book_new();
    const ws1 = xlsx.utils.aoa_to_sheet([['Col A', 'Col B'], ['Val 1', 'Val 2']]);
    const ws2 = xlsx.utils.aoa_to_sheet([['Category', 'Count'], ['Compute', 10]]);
    xlsx.utils.book_append_sheet(wb, ws1, 'Summary');
    xlsx.utils.book_append_sheet(wb, ws2, 'Breakdown');
    xlsx.writeFile(wb, testXlsx);

    const requests = [];
    const mockClient = {
      async request(req) {
        requests.push(req);
        if (req.method === 'POST' && (req.url === 'https://www.googleapis.com/drive/v3/files' || req.url === 'https://sheets.googleapis.com/v4/spreadsheets')) {
          return {
            data: {
              id: 'mock-upload-98765',
              spreadsheetId: 'mock-upload-98765',
              spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/mock-upload-98765/edit'
            }
          };
        }
        return { data: {} };
      }
    };

    const res = await uploadFileToGoogleSheet(testXlsx, 'Sample Quote Sheet', { client: mockClient });
    assert.equal(res.spreadsheetId, 'mock-upload-98765');
    assert.deepEqual(res.sheets, ['Summary', 'Breakdown']);
    assert.equal(res.sourceClass, 'DRIVE_ONLY_UNCLASSIFIED');
    assert.equal(res.notebookLmEligible, false);
    assert.equal(requests.length, 2);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('NotebookLM source policy rejects customer and unclassified Drive artifacts', () => {
  assert.throws(() => assertNotebookSourceEligible('CUSTOMER_BOQ'), /not verified ground truth/);
  assert.throws(() => assertNotebookSourceEligible('DRIVE_ONLY_UNCLASSIFIED'), /not verified ground truth/);
  assert.equal(assertNotebookSourceEligible('CERTIFIED_PRODUCT_CATALOG'), true);
});

test('createGoogleDoc sends properly structured POST to Drive API and populates text', async () => {
  const { createGoogleDoc } = require('../../scripts/services/google_sheets_service.js');
  const requests = [];
  const mockClient = {
    async request(req) {
      requests.push(req);
      if (req.method === 'POST' && req.url === 'https://www.googleapis.com/drive/v3/files') {
        return { data: { id: 'mock-doc-12345' } };
      }
      if (req.method === 'POST' && req.url.includes(':batchUpdate')) {
        return { data: {} };
      }
      return { data: {} };
    }
  };

  const res = await createGoogleDoc('Sample Doc', 'Hello Google Docs', { client: mockClient });
  assert.equal(res.documentId, 'mock-doc-12345');
  assert.equal(res.documentUrl, 'https://docs.google.com/document/d/mock-doc-12345/edit');
  assert.equal(requests.length, 2);
  assert.equal(requests[0].data.mimeType, 'application/vnd.google-apps.document');
  assert.equal(requests[1].data.requests[0].insertText.text, 'Hello Google Docs');
});
