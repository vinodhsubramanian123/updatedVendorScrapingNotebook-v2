'use strict';

/**
 * scripts/services/google_sheets_service.js
 *
 * Hands-free Google Sheets & Google Drive service and CLI for Antigravity AI.
 * Allows autonomous, zero-human-in-the-loop creation, population, and updating
 * of Google Spreadsheets using Application Default Credentials (ADC).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { GoogleAuth } = require('google-auth-library');
const xlsx = require('xlsx-js-style');

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive.file'
];

const NOTEBOOK_SOURCE_CLASSES = new Set([
  'OFFICIAL_VENDOR_SOURCE',
  'CERTIFIED_PRODUCT_CATALOG',
  'VERIFIED_KNOWLEDGE_DELTA'
]);

const ADC_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(os.homedir(), '.config', 'gcloud', 'application_default_credentials.json');

/**
 * Checks gcloud CLI & ADC authentication status.
 * @returns {Promise<{authenticated: boolean, activeAccount: string|null, adcPresent: boolean, tokenValid: boolean, quotaProject: string|null, error: string|null, instructions: string[]}>}
 */
async function checkGoogleAuth() {
  const result = {
    authenticated: false,
    activeAccount: null,
    adcPresent: fs.existsSync(ADC_PATH),
    tokenValid: false,
    quotaProject: null,
    error: null,
    instructions: []
  };

  // Read non-secret ADC metadata without invoking a platform-specific shell.
  try {
    const adc = JSON.parse(fs.readFileSync(ADC_PATH, 'utf8'));
    result.quotaProject = adc.quota_project_id || null;
    result.activeAccount = adc.client_email || null;
  } catch {
    // ADC absence/corruption is reported by token acquisition below.
  }

  // 3. Test ADC token acquisition via google-auth-library
  if (result.adcPresent) {
    try {
      const auth = new GoogleAuth({ scopes: SCOPES });
      const client = await auth.getClient();
      const tokenResponse = await client.getAccessToken();
      const accessToken = tokenResponse?.token || tokenResponse?.res?.data?.access_token;
      if (accessToken) {
        result.tokenValid = true;
        try {
          const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`);
          if (tokenInfoRes.ok) {
            const info = await tokenInfoRes.json();
            result.activeAccount = result.activeAccount || info.email;
            result.grantedScopes = (info.scope || '').split(' ');
            result.hasSheetsScope = result.grantedScopes.some(s => s.includes('spreadsheets'));
            result.hasDriveScope = result.grantedScopes.some(s => s.includes('drive'));
            if (result.hasSheetsScope) {
              result.authenticated = true;
            } else {
              result.authenticated = false;
              result.error = 'Active credentials are missing the Google Sheets scope (https://www.googleapis.com/auth/spreadsheets).';
            }
          } else {
            result.authenticated = true;
          }
        } catch {
          result.authenticated = true;
        }
      }
    } catch (err) {
      result.error = err.message;
    }
  }

  if (!result.authenticated) {
    if (result.activeAccount && !result.hasSheetsScope) {
      result.instructions = [
        `Logged in as: ${result.activeAccount}`,
        '',
        'To grant Google Sheets & Drive permissions, run this in your terminal:',
        '  gcloud auth application-default login --scopes="https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/spreadsheets,https://www.googleapis.com/auth/drive"',
        '',
        'Note: If localhost redirect shows "site cannot be reached", use the terminal code prompt mode:',
        '  gcloud auth application-default login --no-launch-browser --scopes="https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/spreadsheets,https://www.googleapis.com/auth/drive"'
      ];
    } else {
      result.instructions = [
        'Step 1 (gcloud CLI login):',
        '  gcloud auth login',
        '',
        'Step 2 (Application Default Credentials with Drive/Sheets scopes):',
        '  gcloud auth application-default login --scopes="https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/spreadsheets,https://www.googleapis.com/auth/drive"',
        '',
        'Step 3 (Optional - Set active GCP project if you have one):',
        '  gcloud config set project <YOUR_PROJECT_ID>'
      ];
    }
  }

  return result;
}

/**
 * Creates a new Google Spreadsheet in the user\'s Google Drive.
 *
 * @param {string} title - Document title
 * @param {Object} [options]
 * @param {Array<Array<any>>|Object.<string, Array<Array<any>>>} [options.data] - 2D array or map of sheetTitle -> 2D array
 * @param {GoogleAuth} [options.auth] - Optional custom auth instance
 * @param {any} [options.client] - Optional mock/custom client for testing
 * @returns {Promise<{spreadsheetId: string, spreadsheetUrl: string, title: string, sheets: string[]}>}
 */
async function createGoogleSheet(title, options = {}) {
  const auth = options.auth || new GoogleAuth({ scopes: SCOPES });
  const client = options.client || await auth.getClient();

  let sheetsConfig = [{ properties: { title: 'Sheet1' } }];
  let initialDataMap = null;

  if (options.data) {
    if (Array.isArray(options.data)) {
      // Single sheet data
      initialDataMap = { Sheet1: options.data };
    } else if (typeof options.data === 'object') {
      // Multi-sheet data map
      const sheetTitles = Object.keys(options.data);
      if (sheetTitles.length > 0) {
        sheetsConfig = sheetTitles.map((sheetTitle, idx) => ({
          properties: { title: sheetTitle, index: idx }
        }));
        initialDataMap = options.data;
      }
    }
  }

  let spreadsheetId;
  let spreadsheetUrl;
  const folderId = options.folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;

  const drivePayload = {
    name: title || 'Antigravity Generated Sheet',
    mimeType: 'application/vnd.google-apps.spreadsheet'
  };
  if (folderId) {
    drivePayload.parents = [folderId];
  }

  try {
    const driveRes = await client.request({
      url: 'https://www.googleapis.com/drive/v3/files',
      method: 'POST',
      data: drivePayload
    });
    if (driveRes?.data?.id) {
      spreadsheetId = driveRes.data.id;
      spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    }
  } catch {
    // Drive API error -> fallback to Sheets API
  }

  if (!spreadsheetId) {
    const createRes = await client.request({
      url: 'https://sheets.googleapis.com/v4/spreadsheets',
      method: 'POST',
      data: {
        properties: { title: title || 'Antigravity Generated Sheet' },
        sheets: sheetsConfig
      }
    });
    spreadsheetId = createRes.data?.spreadsheetId;
    spreadsheetUrl = createRes.data?.spreadsheetUrl ||
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  }

  if (!spreadsheetId) {
    throw new Error('Could not create Google Spreadsheet');
  }

  // Populate data if provided
  if (initialDataMap) {
    const dataPayload = [];
    for (const [sheetTitle, rows] of Object.entries(initialDataMap)) {
      if (Array.isArray(rows) && rows.length > 0) {
        dataPayload.push({
          range: `'${sheetTitle.replace(/'/g, "''")}'!A1`,
          majorDimension: 'ROWS',
          values: rows
        });
      }
    }

    if (dataPayload.length > 0) {
      await client.request({
        url: `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchUpdate`,
        method: 'POST',
        data: {
          valueInputOption: 'USER_ENTERED',
          data: dataPayload
        }
      });
    }
  }

  return {
    spreadsheetId,
    spreadsheetUrl,
    title: title || 'Antigravity Generated Sheet',
    sheets: sheetsConfig.map(s => s.properties.title)
  };
}

/**
 * Uploads a local XLSX or CSV file directly to a newly created Google Sheet.
 *
 * @param {string} filePath - Absolute or relative path to CSV or XLSX file
 * @param {string} [customTitle] - Optional custom title for the Google Sheet
 * @param {Object} [options]
 * @returns {Promise<{spreadsheetId: string, spreadsheetUrl: string, title: string, sheets: string[]}>}
 */
async function uploadFileToGoogleSheet(filePath, customTitle = '', options = {}) {
  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File not found: ${resolvedPath}`);
  }

  const title = customTitle || path.basename(resolvedPath, path.extname(resolvedPath));
  const fileBuffer = fs.readFileSync(resolvedPath);
  const workbook = xlsx.read(fileBuffer, { type: 'buffer', raw: false });

  const sheetDataMap = {};
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (worksheet) {
      const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' });
      sheetDataMap[sheetName] = rows;
    }
  }

  const sourceClass = options.sourceClass || 'DRIVE_ONLY_UNCLASSIFIED';
  const sheet = await createGoogleSheet(title, {
    data: sheetDataMap,
    auth: options.auth,
    client: options.client
  });
  return {
    ...sheet,
    sourceClass,
    notebookLmEligible: NOTEBOOK_SOURCE_CLASSES.has(sourceClass)
  };
}

function assertNotebookSourceEligible(sourceClass) {
  if (!NOTEBOOK_SOURCE_CLASSES.has(sourceClass)) {
    throw new Error(`NotebookLM source rejected: ${sourceClass || 'UNCLASSIFIED'} is not verified ground truth.`);
  }
  return true;
}

/**
 * Creates a new Google Doc in the user's Google Drive and populates text.
 *
 * @param {string} title - Document title
 * @param {string} [content] - Initial text or markdown content
 * @param {Object} [options]
 * @returns {Promise<{documentId: string, documentUrl: string, title: string}>}
 */
async function createGoogleDoc(title, content = '', options = {}) {
  const auth = options.auth || new GoogleAuth({ scopes: SCOPES });
  const client = options.client || await auth.getClient();
  const folderId = options.folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;

  const drivePayload = {
    name: title || 'Antigravity Generated Doc',
    mimeType: 'application/vnd.google-apps.document'
  };
  if (folderId) {
    drivePayload.parents = [folderId];
  }

  const driveRes = await client.request({
    url: 'https://www.googleapis.com/drive/v3/files',
    method: 'POST',
    data: drivePayload
  });

  const documentId = driveRes.data?.id;
  const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`;

  if (content && typeof content === 'string' && content.trim().length > 0) {
    await client.request({
      url: `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
      method: 'POST',
      data: {
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: content
            }
          }
        ]
      }
    });
  }

  return { documentId, documentUrl, title: title || 'Antigravity Generated Doc' };
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';

  (async () => {
    try {
      if (command === 'status' || command === 'check') {
        const authStatus = await checkGoogleAuth();
        console.log('\n=== Google Cloud & Google Sheets Auth Status ===\n');
        console.log(`Active gcloud Account: ${authStatus.activeAccount || '(None - not logged in)'}`);
        console.log(`ADC File Exists:       ${authStatus.adcPresent ? 'YES (' + ADC_PATH + ')' : 'NO'}`);
        console.log(`Token Valid:           ${authStatus.tokenValid ? 'YES (Ready for hands-free API calls)' : 'NO'}`);
        if (authStatus.quotaProject) {
          console.log(`Quota Project:         ${authStatus.quotaProject}`);
        }

        if (authStatus.authenticated) {
          console.log('\n[SUCCESS] Authentication is active and ready for zero-human-in-the-loop Google Sheets creation!\n');
        } else {
          console.log('\n[ACTION REQUIRED] Please authenticate to enable hands-free Google Sheets creation:\n');
          authStatus.instructions.forEach(line => console.log(line));
          console.log('');
        }
      } else if (command === 'create') {
        const title = args[1] || 'Antigravity Generated Sheet';
        console.log(`Creating Google Sheet: "${title}"...`);
        const result = await createGoogleSheet(title, {
          data: [
            ['Generated By', 'Antigravity AI Agent'],
            ['Created At', new Date().toISOString()],
            ['Status', 'Active']
          ]
        });
        console.log('\n[SUCCESS] Google Sheet created successfully:');
        console.log(`URL: ${result.spreadsheetUrl}`);
        console.log(`ID:  ${result.spreadsheetId}\n`);
      } else if (command === 'doc') {
        const title = args[1] || 'Antigravity Generated Doc';
        const content = args[2] || `HPE ProLiant BOQ Evaluation Report\n\nGenerated autonomously by Antigravity AI.\nVerified at: ${new Date().toISOString()}\n`;
        console.log(`Creating Google Doc: "${title}"...`);
        const result = await createGoogleDoc(title, content);
        console.log('\n[SUCCESS] Google Doc created successfully:');
        console.log(`URL: ${result.documentUrl}`);
        console.log(`ID:  ${result.documentId}\n`);
      } else if (command === 'upload') {
        const file = args[1];
        if (!file) {
          console.error('Usage: node google_sheets_service.js upload <path-to-file.xlsx|csv> [title]');
          process.exit(1);
        }
        const customTitle = args[2] || '';
        console.log(`Uploading ${file} to Google Sheets...`);
        const result = await uploadFileToGoogleSheet(file, customTitle);
        console.log('\n[SUCCESS] File uploaded to Google Sheets successfully:');
        console.log(`URL:    ${result.spreadsheetUrl}`);
        console.log(`ID:     ${result.spreadsheetId}`);
        console.log(`Sheets: ${result.sheets.join(', ')}\n`);
      } else {
        console.log('Unknown command:', command);
        console.log('Available commands: status, create [title], doc [title] [content], upload <file> [title]');
        process.exit(1);
      }
    } catch (err) {
      console.error('\n[ERROR]', err.message);
      process.exit(1);
    }
  })();
}

module.exports = {
  SCOPES,
  ADC_PATH,
  checkGoogleAuth,
  createGoogleSheet,
  createGoogleDoc,
  uploadFileToGoogleSheet,
  assertNotebookSourceEligible,
  NOTEBOOK_SOURCE_CLASSES
};
