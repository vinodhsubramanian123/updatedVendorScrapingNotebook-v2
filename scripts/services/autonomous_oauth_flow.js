'use strict';

/**
 * scripts/services/autonomous_oauth_flow.js
 *
 * Hands-free autonomous OAuth2 flow for Antigravity AI.
 * Starts a local loopback server, handles Google OAuth2 callback,
 * exchanges authorization code for tokens, and atomically writes ADC.
 */

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { OAuth2Client } = require('google-auth-library');

const CLIENT_SECRET_PATH = path.join(os.homedir(), '.config', 'gcloud', 'client_secret.json');
const ADC_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(os.homedir(), '.config', 'gcloud', 'application_default_credentials.json');

const SCOPES = [
  'https://www.googleapis.com/auth/cloud-platform',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive'
];

async function startOAuthFlow(port = 8085, timeoutMs = 120000) {
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
    prompt: 'consent' // Forces Google to return a new refresh token
  });

  return new Promise((resolve, reject) => {
    let timer = null;

    const server = http.createServer(async (req, res) => {
      try {
        const reqUrl = url.parse(req.url, true);
        if (reqUrl.pathname === '/' || reqUrl.pathname === '/oauth2callback') {
          const code = reqUrl.query.code;
          const error = reqUrl.query.error;

          if (error) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(`<h3>Authentication Failed: ${error}</h3><p>You can close this window.</p>`);
            clearTimeout(timer);
            server.close();
            return reject(new Error(`OAuth returned error: ${error}`));
          }

          if (code) {
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

            // Exchange code for tokens
            const { tokens } = await oauth2Client.getToken(code);

            // Fetch user info for account email
            let userEmail = null;
            if (tokens.access_token) {
              try {
                const infoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${tokens.access_token}`);
                if (infoRes.ok) {
                  const info = await infoRes.json();
                  userEmail = info.email;
                }
              } catch {
                // Non-fatal if tokeninfo fails
              }
            }

            const adcPayload = {
              account: userEmail || 'vinodhsubramanian123@gmail.com',
              client_id: creds.client_id,
              client_secret: creds.client_secret,
              quota_project_id: creds.project_id || 'bom-assistant',
              refresh_token: tokens.refresh_token,
              type: 'authorized_user',
              universe_domain: 'googleapis.com'
            };

            // Ensure directory exists
            const adcDir = path.dirname(ADC_PATH);
            if (!fs.existsSync(adcDir)) {
              fs.mkdirSync(adcDir, { recursive: true });
            }

            // Atomically write ADC
            const tmpAdc = `${ADC_PATH}.tmp.${Date.now()}`;
            fs.writeFileSync(tmpAdc, JSON.stringify(adcPayload, null, 2), 'utf8');
            fs.renameSync(tmpAdc, ADC_PATH);

            clearTimeout(timer);
            server.close();
            return resolve({
              success: true,
              account: adcPayload.account,
              projectId: adcPayload.quota_project_id,
              adcPath: ADC_PATH,
              tokens
            });
          }
        }

        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      } catch (err) {
        clearTimeout(timer);
        server.close();
        reject(err);
      }
    });

    server.listen(port, () => {
      console.log(`[AUTONOMOUS_OAUTH] Local loopback server listening on port ${port}`);
      console.log(`[AUTONOMOUS_OAUTH] AUTH_URL_START`);
      console.log(authUrl);
      console.log(`[AUTONOMOUS_OAUTH] AUTH_URL_END`);
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
  CLIENT_SECRET_PATH,
  ADC_PATH,
  SCOPES
};
