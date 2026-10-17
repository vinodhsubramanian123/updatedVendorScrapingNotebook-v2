'use strict';

/**
 * scripts/services/autonomous_oauth_flow.js
 *
 * Hands-free autonomous OAuth2 flow for Antigravity AI.
 * Starts a local loopback server, handles Google OAuth2 callback,
 * exchanges authorization code for tokens, and atomically writes ADC.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { OAuth2Client } = require('google-auth-library');
const { safeWriteJsonAtomic } = require('../lib/system/fs_compat.js');

function resolveGooglePath(fileName) {
  if (fileName === 'application_default_credentials.json' && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }
  if (process.platform === 'win32') {
    const winPath = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'gcloud', fileName);
    if (fs.existsSync(winPath)) return winPath;
  }
  return path.join(os.homedir(), '.config', 'gcloud', fileName);
}

const CLIENT_SECRET_PATH = resolveGooglePath('client_secret.json');
const ADC_PATH = resolveGooglePath('application_default_credentials.json');

const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive'
];

async function tryAutomateConsentViaCdp(targetUrl, port = 8085) {
  try {
    const { connectWS, sendCommand, CDP_PORT } = require('../lib/scraper/cdp.js');
    const cdpPort = CDP_PORT || 9222;
    const newTabRes = await fetch(`http://localhost:${cdpPort}/json/new`, { method: 'PUT' });
    if (!newTabRes.ok) return false;
    const newTab = await newTabRes.json();
    const ws = await connectWS(newTab.webSocketDebuggerUrl);
    await sendCommand(ws, 'Page.navigate', { url: targetUrl });

    for (let step = 1; step <= 8; step++) {
      await new Promise(r => setTimeout(r, 3200));
      const stepRes = await sendCommand(ws, 'Runtime.evaluate', {
        expression: `(() => {
          const currentUrl = location.href || '';
          if (currentUrl.includes('localhost:${port}')) return JSON.stringify({ done: true });
          const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
          for (const cb of checkboxes) {
            if (!cb.checked) cb.click();
          }
          const spans = Array.from(document.querySelectorAll('span, button, a'));
          const continueEl = spans.find(el => {
            const t = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.nodeValue.trim()).join(' ');
            return /^(continue|allow|next)$/i.test(t);
          });
          if (continueEl) {
            const btn = continueEl.closest('button, [role="button"], a') || continueEl;
            btn.click();
          }
          return JSON.stringify({ done: false });
        })()`,
        returnByValue: true,
        userGesture: true
      });
      const parsed = JSON.parse(stepRes?.result?.value || '{}');
      if (parsed.done) break;
    }

    try { ws.close(); } catch { /* ignore */ }
    try { await fetch(`http://localhost:${cdpPort}/json/close/${newTab.id}`); } catch { /* ignore */ }
    return true;
  } catch {
    return false;
  }
}

function openUrlInBrowser(targetUrl, port = 8085) {
  tryAutomateConsentViaCdp(targetUrl, port).then(handledByCdp => {
    if (handledByCdp) return;
    try {
      if (process.platform === 'win32') {
        const { spawn } = require('child_process');
        const ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `Start-Process '${targetUrl.replace(/'/g, "''")}'`], {
          windowsHide: true,
          stdio: 'ignore',
          detached: true
        });
        ps.unref();
      } else if (process.platform === 'darwin') {
        const { spawn } = require('child_process');
        spawn('open', [targetUrl], { stdio: 'ignore', detached: true }).unref();
      } else {
        const { spawn } = require('child_process');
        spawn('xdg-open', [targetUrl], { stdio: 'ignore', detached: true }).unref();
      }
      console.log('[AUTONOMOUS_OAUTH] Auto-launched browser with Google authorization URL.');
    } catch (err) {
      console.warn('[AUTONOMOUS_OAUTH] Note: Could not auto-launch browser:', err.message);
    }
  });
}

async function verifyOAuthIdentity(tokens, expectedAccount, request = fetch) {
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('OAuth did not return complete offline credentials; previous credentials retained.');
  }
  const infoRes = await request('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` }
  });
  if (!infoRes.ok) throw new Error('OAuth account identity verification failed; previous credentials retained.');
  const info = await infoRes.json();
  const userEmail = info.verified_email === true && typeof info.email === 'string' ? info.email.trim() : '';
  if (!userEmail) throw new Error('OAuth returned no verified email; previous credentials retained.');
  if (expectedAccount && userEmail.toLowerCase() !== expectedAccount.toLowerCase()) {
    throw new Error('OAuth account does not match the requested account; previous credentials retained.');
  }
  return userEmail;
}

function assertOAuthScopes(grantedScopes) {
  const granted = new Set(Array.isArray(grantedScopes) ? grantedScopes : String(grantedScopes || '').split(/\s+/));
  const missing = SCOPES.filter(scope => !granted.has(scope));
  if (missing.length) throw new Error(`OAuth consent is incomplete; missing scopes: ${missing.join(', ')}. Previous credentials retained.`);
}

async function startOAuthFlow(port = 8085, timeoutMs = 300000, options = {}) {
  if (!fs.existsSync(CLIENT_SECRET_PATH)) {
    throw new Error(`Client secret file not found at ${CLIENT_SECRET_PATH}`);
  }

  const secretRaw = fs.readFileSync(CLIENT_SECRET_PATH, 'utf8');
  const secretJson = JSON.parse(secretRaw);
  const creds = secretJson.installed || secretJson.web;
  if (!creds || !creds.client_id || !creds.client_secret) {
    throw new Error('Invalid client_secret.json format: missing installed/web client_id or client_secret');
  }

  const redirectUri = `http://localhost:${port}`;
  const oauth2Client = new OAuth2Client(creds.client_id, creds.client_secret, redirectUri);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    login_hint: options.expectedAccount || process.env.GOOGLE_ACCOUNT_EMAIL,
    prompt: 'consent' // Forces Google to return a new refresh token
  });

  return new Promise((resolve, reject) => {
    let timer = null;

    const server = http.createServer(async (req, res) => {
      try {
        const reqUrl = new URL(req.url, `http://localhost:${port}`);
        if (reqUrl.pathname === '/' || reqUrl.pathname === '/oauth2callback') {
          const code = reqUrl.searchParams.get('code');
          const error = reqUrl.searchParams.get('error');

          if (error) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(`<h3>Authentication Failed: ${error}</h3><p>You can close this window.</p>`);
            clearTimeout(timer);
            server.close();
            return reject(new Error(`OAuth returned error: ${error}`));
          }

          if (code) {
            // Verify identity and persist credentials before reporting success.
            const { tokens } = await oauth2Client.getToken(code);
            const expectedAccount = options.expectedAccount || process.env.GOOGLE_ACCOUNT_EMAIL;
            const userEmail = await verifyOAuthIdentity(tokens, expectedAccount);
            const tokenInfo = await oauth2Client.getTokenInfo(tokens.access_token);
            assertOAuthScopes(tokenInfo.scopes);
            const adcPayload = {
              account: userEmail,
              client_id: creds.client_id,
              client_secret: creds.client_secret,
              quota_project_id: creds.project_id || 'bom-assistant',
              refresh_token: tokens.refresh_token,
              type: 'authorized_user',
              universe_domain: 'googleapis.com'
            };
            const targetPaths = new Set([ADC_PATH]);
            targetPaths.add(process.platform === 'win32'
              ? path.join(os.homedir(), '.config', 'gcloud', 'application_default_credentials.json')
              : path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'gcloud', 'application_default_credentials.json'));
            for (const p of targetPaths) safeWriteJsonAtomic(p, adcPayload);
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <!DOCTYPE html>
              <html>
              <head><title>Authentication Successful</title></head>
              <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #0f172a; color: #f8fafc;">
                <div style="text-align: center; padding: 2rem; background: #1e293b; border-radius: 12px; border: 1px solid #10b981; max-width: 480px;">
                  <h2 style="color: #10b981; margin-top: 0;">Authentication Successful!</h2>
                  <p>Antigravity AI has acquired fresh Application Default Credentials with full Google Drive & Sheets access.</p>
                  <p style="color: #94a3b8; font-size: 0.9rem;">You may now safely close this window and return to your workspace.</p>
                </div>
              </body>
              </html>
            `);

            clearTimeout(timer);
            server.close();
            return resolve({
              success: true,
              account: adcPayload.account,
              projectId: adcPayload.quota_project_id,
              adcPath: ADC_PATH
            });
          }
        }

        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      } catch (err) {
        if (!res.headersSent) res.writeHead(400, { 'Content-Type': 'text/plain' });
        if (!res.writableEnded) res.end('Authentication failed. Previous credentials retained; see local diagnostics.');
        clearTimeout(timer);
        server.close();
        reject(err);
      }
    });

    server.listen(port, () => {
      console.log(`[AUTONOMOUS_OAUTH] Local loopback server listening on port ${port}`);
      console.log(`\n================================================================================`);
      console.log(`🔗 GOOGLE DRIVE / SHEETS AUTHENTICATION`);
      console.log(`Please sign in and approve access in your browser:`);
      console.log(`${authUrl}`);
      console.log(`================================================================================\n`);
      openUrlInBrowser(authUrl);
    });

    timer = setTimeout(() => {
      server.close();
      reject(new Error(`OAuth flow timed out after ${timeoutMs / 1000}s waiting for callback`));
    }, timeoutMs);
  });
}

// CLI execution
if (require.main === module) {
  const port = parseInt(process.argv[2], 10) || 8085;
  startOAuthFlow(port)
    .then(result => {
      console.log('\n[AUTONOMOUS_OAUTH] SUCCESS:', JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(err => {
      console.error('\n[AUTONOMOUS_OAUTH] ERROR:', err.message);
      process.exit(1);
    });
}

module.exports = {
  startOAuthFlow,
  verifyOAuthIdentity,
  assertOAuthScopes,
  CLIENT_SECRET_PATH,
  ADC_PATH,
  SCOPES
};
