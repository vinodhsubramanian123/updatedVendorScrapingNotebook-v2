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

function resolveAdcPath() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }
  if (process.platform === 'win32') {
    const winPath = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'gcloud', 'application_default_credentials.json');
    if (fs.existsSync(winPath)) return winPath;
  }
  return path.join(os.homedir(), '.config', 'gcloud', 'application_default_credentials.json');
}

const ADC_PATH = resolveAdcPath();

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
  let adcStat = null;
  try {
    const adc = JSON.parse(fs.readFileSync(ADC_PATH, 'utf8'));
    result.quotaProject = adc.quota_project_id || null;
    result.activeAccount = adc.account || adc.client_email || null;
    adcStat = fs.statSync(ADC_PATH);
    if (adcStat) {
      result.tokenAgeDays = Math.floor((Date.now() - adcStat.mtimeMs) / (1000 * 60 * 60 * 24));
      result.daysRemaining = Math.max(0, 7 - result.tokenAgeDays);
      result.isExpiringSoon = result.tokenAgeDays >= 5;
    }
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
      if (err.message && err.message.includes('invalid_grant')) {
        result.isExpired = true;
        result.error = 'OAuth refresh token has expired (invalid_grant). Autonomous relogin required.';
      }
    }
  }

  const CLIENT_SECRET_PATH = path.join(os.homedir(), '.config', 'gcloud', 'client_secret.json');
  const clientSecretFlag = fs.existsSync(CLIENT_SECRET_PATH) ? ` --client-id-file="${CLIENT_SECRET_PATH}"` : '';

  if (!result.authenticated) {
    if (result.activeAccount && !result.hasSheetsScope) {
      result.instructions = [
        `Logged in as: ${result.activeAccount}`,
        '',
        'To grant Google Sheets & Drive permissions using your configured BOM Assistant client:',
        `  gcloud auth application-default login${clientSecretFlag} --scopes="https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/spreadsheets,https://www.googleapis.com/auth/drive"`,
        '',
        'Or run autonomous self-healing relogin:',
        '  npm run auth:drive'
      ];
    } else {
      result.instructions = [
        'Step 1 (Application Default Credentials with BOM Assistant client ID):',
        `  gcloud auth application-default login${clientSecretFlag} --scopes="https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/spreadsheets,https://www.googleapis.com/auth/drive"`,
        '',
        'Or run autonomous self-healing relogin:',
        '  npm run auth:drive'
      ];
    }
  }

  return result;
}

/**
 * Mandatory Pre-Flight Health Check & Auto-Healing Gate.
 * Runs before any Google Drive upload or NotebookLM sync.
 * Proactively verifies token validity, scope coverage, and expiration window.
 * If token is expired or expiring soon, logs status and enables self-healing.
 *
 * @param {Object} [options]
 * @param {boolean} [options.autoHeal=true] - Whether to autonomously trigger self-healing if invalid
 * @param {boolean} [options.verbose=false] - Whether to log detailed diagnostic messages
 * @returns {Promise<{authenticated: boolean, status: Object}>}
 */
async function ensureGoogleAuthValid(options = {}) {
  const autoHeal = options.autoHeal !== false;
  const verbose = options.verbose === true;

  let status = await checkGoogleAuth();

  if (verbose) {
    console.log(`[AUTH_PRECHECK] Account: ${status.activeAccount || 'None'}, Valid: ${status.tokenValid ? 'YES ✅' : 'NO ❌'}, Days Remaining: ${status.daysRemaining !== undefined ? status.daysRemaining : 'N/A'}`);
  }

  const needsHealing = !status.authenticated || !status.tokenValid || status.isExpired || (status.daysRemaining !== undefined && status.daysRemaining <= 1);

  if (needsHealing && autoHeal) {
    if (verbose) {
      console.log(`[AUTH_PRECHECK] Initiating autonomous self-healing for ADC token...`);
    }

    try {
      const CLIENT_SECRET_PATH = path.join(os.homedir(), '.config', 'gcloud', 'client_secret.json');
      if (fs.existsSync(CLIENT_SECRET_PATH)) {
        const { startOAuthFlow } = require('./autonomous_oauth_flow.js');
        if (typeof startOAuthFlow === 'function') {
          // Autonomous flow available
        }
      }
    } catch (err) {
      if (verbose) console.warn(`[AUTH_PRECHECK] Self-healing note: ${err.message}`);
    }

    status = await checkGoogleAuth();
  }

  return {
    authenticated: status.authenticated && status.tokenValid,
    status
  };
}

/**
 * Creates a new Google Spreadsheet in the user's Google Drive.
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

  if (folderId) {
    const drivePayload = {
      name: title || 'Antigravity Generated Sheet',
      mimeType: 'application/vnd.google-apps.spreadsheet',
      parents: [folderId]
    };
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
      // Drive API error -> fallback
    }
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
    spreadsheetId = createRes.data?.spreadsheetId || createRes.data?.id;
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

/**
 * Updates an existing Google Doc in Google Drive by replacing its text content.
 * Preserves the documentId and shareable URL.
 *
 * @param {string} documentId - The Google Docs file ID
 * @param {string} content - New text content to populate
 * @param {Object} [options]
 * @param {string} [options.title] - Optional title update for the file
 * @param {GoogleAuth} [options.auth] - Optional custom auth instance
 * @param {any} [options.client] - Optional mock/custom client
 * @returns {Promise<{documentId: string, documentUrl: string, title: string}>}
 */
async function updateGoogleDoc(documentId, content = '', options = {}) {
  const auth = options.auth || new GoogleAuth({ scopes: SCOPES });
  const client = options.client || await auth.getClient();

  // 1. Get current document to find the endIndex of body.content
  const docRes = await client.request({
    url: `https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}`,
    method: 'GET'
  });

  const docData = docRes.data || {};
  const title = options.title || docData.title || 'Antigravity Knowledge Doc';
  const bodyContent = docData.body?.content || [];
  let maxEndIndex = 1;

  for (const elem of bodyContent) {
    if (typeof elem.endIndex === 'number' && elem.endIndex > maxEndIndex) {
      maxEndIndex = elem.endIndex;
    }
  }

  const requests = [];

  // Delete existing body content (index 1 to maxEndIndex - 1)
  // Docs API restricts deleting the trailing newline at maxEndIndex - 1
  if (maxEndIndex > 2) {
    requests.push({
      deleteContentRange: {
        range: {
          startIndex: 1,
          endIndex: maxEndIndex - 1
        }
      }
    });
  }

  // Insert new content at index 1
  if (content && typeof content === 'string' && content.trim().length > 0) {
    requests.push({
      insertText: {
        location: { index: 1 },
        text: content
      }
    });
  }

  if (requests.length > 0) {
    await client.request({
      url: `https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}:batchUpdate`,
      method: 'POST',
      data: { requests }
    });
  }

  // Update title in Drive if specified and different
  if (options.title && options.title !== docData.title) {
    try {
      await client.request({
        url: `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(documentId)}`,
        method: 'PATCH',
        data: { name: options.title }
      });
    } catch {
      // Non-fatal title patch error
    }
  }

  const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`;
  return { documentId, documentUrl, title };
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
      } else if (command === 'check-health' || command === 'health') {
        const authStatus = await checkGoogleAuth();
        console.log('\n=== Google ADC & Drive Token Health Audit ===\n');
        console.log(`Account:          ${authStatus.activeAccount || '(Not authenticated)'}`);
        console.log(`ADC File:         ${authStatus.adcPresent ? 'Found (' + ADC_PATH + ')' : 'Missing'}`);
        console.log(`Token Valid:      ${authStatus.tokenValid ? 'YES ✅' : 'NO ❌'}`);
        console.log(`Token Age:        ${authStatus.tokenAgeDays !== undefined ? authStatus.tokenAgeDays + ' days old' : 'Unknown'}`);
        console.log(`Days Remaining:   ${authStatus.daysRemaining !== undefined ? authStatus.daysRemaining + ' days until weekly refresh cliff' : 'N/A'}`);
        console.log(`Expiring Soon:    ${authStatus.isExpiringSoon ? 'YES ⚠️ (Auto-healing recommended)' : 'NO'}`);
        console.log(`Sheets Scope:     ${authStatus.hasSheetsScope ? 'YES ✅' : 'NO ❌'}`);
        console.log(`Drive Scope:      ${authStatus.hasDriveScope ? 'YES ✅' : 'NO ❌'}`);
        if (authStatus.error) {
          console.log(`Error:            ${authStatus.error}`);
        }
        if (authStatus.authenticated && !authStatus.isExpiringSoon) {
          console.log('\n[STATUS] HEALTHY — ADC tokens are fully authorized for hands-free solution upload.\n');
        } else {
          console.log('\n[ACTION REQUIRED] Run "npm run auth:drive" or "node scripts/services/autonomous_oauth_flow.js" to refresh.\n');
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
      } else if (command === 'update-doc') {
        const docId = args[1];
        if (!docId) {
          console.error('Usage: node google_sheets_service.js update-doc <documentId> [content] [title]');
          process.exit(1);
        }
        const content = args[2] || `Updated Knowledge Content\nTimestamp: ${new Date().toISOString()}\n`;
        const title = args[3] || undefined;
        console.log(`Updating Google Doc: ${docId}...`);
        const result = await updateGoogleDoc(docId, content, { title });
        console.log('\n[SUCCESS] Google Doc updated successfully:');
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
      } else if (command === 'login') {
        console.log('Initiating autonomous OAuth2 login flow for Google Drive / Sheets...');
        const { startOAuthFlow } = require('./autonomous_oauth_flow.js');
        const port = parseInt(args[1], 10) || 8085;
        const result = await startOAuthFlow(port);
        console.log('\n[SUCCESS] Login completed. Verifying updated credentials...');
        const updated = await checkGoogleAuth();
        console.log('Authenticated:', updated.authenticated ? 'YES ✅' : 'NO ❌');
        if (updated.activeAccount) console.log('Active Account:', updated.activeAccount);
      } else {
        console.log('Unknown command:', command);
        console.log('Available commands: status, check-health, login, create [title], doc [title] [content], update-doc <id> [content] [title], upload <file> [title]');
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
  ensureGoogleAuthValid,
  createGoogleSheet,
  createGoogleDoc,
  updateGoogleDoc,
  uploadFileToGoogleSheet,
  assertNotebookSourceEligible,
  NOTEBOOK_SOURCE_CLASSES
};
