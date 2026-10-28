'use strict';
/**
 * scripts/maintenance/check_all_auth.js
 *
 * Consolidated Universal Authentication Health & Diagnostics CLI.
 * Audits all 5 core authentication surfaces in one single, high-density command:
 *   1. Google Workspace (Drive & Sheets) ADC OAuth token health
 *   2. Google NotebookLM CLI & MCP Server profile
 *   3. Gemini Multimodal LLM Key Rotator Pool
 *   4. Chrome Remote Debugging (CDP 9222) & HPE Partner Portal SSO Anchor
 *   5. Google Jules CI/CD Task Manager API Token
 *
 * Usage:
 *   node scripts/maintenance/check_all_auth.js [--json]
 *   npm run auth:status
 */



async function auditGoogleWorkspace() {
  try {
    const { checkGoogleAuth } = require('../services/google_sheets_service.js');
    const auth = await checkGoogleAuth();
    return {
      name: 'Google Drive & Sheets ADC',
      status: auth.authenticated ? 'HEALTHY' : (auth.isExpired ? 'EXPIRED' : 'ACTION_REQUIRED'),
      valid: auth.authenticated,
      account: auth.activeAccount || 'None',
      tokenAgeDays: auth.tokenAgeDays ?? null,
      daysRemaining: auth.daysRemaining ?? null,
      isExpiringSoon: auth.isExpiringSoon ?? false,
      hasSheetsScope: auth.hasSheetsScope ?? false,
      hasDriveScope: auth.hasDriveScope ?? false,
      error: auth.error || null,
      remediation: auth.authenticated
        ? (auth.isExpiringSoon ? 'Token file is 5+ days old (informational only — no expiry for In Production GCP apps). Run "npm run auth:drive" if a scope refresh is needed.' : 'None required')
        : 'Run "npm run auth:drive" once to refresh the ADC token'
    };
  } catch (err) {
    return {
      name: 'Google Drive & Sheets ADC',
      status: 'ERROR',
      valid: false,
      account: null,
      error: err.message,
      remediation: 'Run "npm run auth:drive"'
    };
  }
}

function auditNotebookLm() {
  try {
    const { checkAuthHealth } = require('./check_nlm_auth.js');
    const result = checkAuthHealth({ autoHeal: false });
    return {
      name: 'Google NotebookLM CLI / MCP',
      status: result.valid ? 'HEALTHY' : 'INVALID',
      valid: result.valid,
      account: result.account || 'Unknown',
      notebooksFound: result.notebooksFound,
      lastValidated: result.lastValidated,
      remediation: result.valid ? 'None required' : 'Run "npm run auth:nlm:heal"'
    };
  } catch (err) {
    return {
      name: 'Google NotebookLM CLI / MCP',
      status: 'ERROR',
      valid: false,
      account: null,
      error: err.message,
      remediation: 'Run "npm run auth:nlm:heal"'
    };
  }
}

function auditGeminiRotator() {
  try {
    const { getPoolStatus } = require('../lib/system/gemini_rotator.js');
    const pool = getPoolStatus();
    const healthy = pool.activeKeys > 0;
    return {
      name: 'Gemini LLM Key Rotator',
      status: healthy ? 'HEALTHY' : 'EXHAUSTED',
      valid: healthy,
      totalKeys: pool.totalKeys,
      activeKeys: pool.activeKeys,
      exhaustedKeys: pool.exhaustedKeys,
      remediation: healthy ? 'None required' : 'Check GEMINI_API_KEY entries in .env'
    };
  } catch (err) {
    return {
      name: 'Gemini LLM Key Rotator',
      status: 'ERROR',
      valid: false,
      error: err.message,
      remediation: 'Configure GEMINI_API_KEY in .env'
    };
  }
}

async function auditCdpPortal() {
  const cdpPort = 9222;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`http://localhost:${cdpPort}/json/list`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const tabs = await res.json();
    const partnerTab = Array.isArray(tabs) ? tabs.find(t => (t.url || '').includes('partner.hpe.com')) : null;
    const ocaTab = Array.isArray(tabs) ? tabs.find(t => (t.url || '').includes('oca')) : null;
    return {
      name: 'Chrome CDP & Partner Portal SSO',
      status: 'ONLINE',
      valid: true,
      openTabsCount: Array.isArray(tabs) ? tabs.length : 0,
      partnerPortalActive: Boolean(partnerTab),
      ocaSessionActive: Boolean(ocaTab),
      remediation: 'None required (Auto-launched on demand during scraping)'
    };
  } catch (_) {
    return {
      name: 'Chrome CDP & Partner Portal SSO',
      status: 'STANDBY',
      valid: true,
      openTabsCount: 0,
      partnerPortalActive: false,
      ocaSessionActive: false,
      remediation: 'Standby mode. Automatically spawned on port 9222 during live scrape.'
    };
  }
}

function auditJules() {
  const key = process.env.JULES_API_KEY;
  const configured = Boolean(key && key.trim().length > 10);
  return {
    name: 'Google Jules CI/CD Protocol',
    status: configured ? 'CONFIGURED' : 'NOT_CONFIGURED',
    valid: configured,
    remediation: configured ? 'None required' : 'Optional. Set JULES_API_KEY in .env if using Jules CI/CD tasks.'
  };
}

async function main() {
  const isJson = process.argv.includes('--json');

  const [google, nlm, gemini, cdp, jules] = await Promise.all([
    auditGoogleWorkspace(),
    Promise.resolve(auditNotebookLm()),
    Promise.resolve(auditGeminiRotator()),
    auditCdpPortal(),
    Promise.resolve(auditJules())
  ]);

  const report = {
    timestamp: new Date().toISOString(),
    surfaces: { googleWorkspace: google, notebookLm: nlm, geminiRotator: gemini, cdpPortal: cdp, jules }
  };

  if (isJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log('\n================================================================');
  console.log('🛡️  UNIVERSAL AUTHENTICATION & TOKEN HEALTH DASHBOARD');
  console.log('================================================================');
  console.log(`Audited At: ${report.timestamp}\n`);

  const printRow = (title, status, detail, remediation) => {
    const icon = status === 'HEALTHY' || status === 'ONLINE' || status === 'CONFIGURED' ? '✅' :
                 status === 'STANDBY' ? '💤' :
                 status === 'EXPIRED' || status === 'EXHAUSTED' || status === 'INVALID' ? '❌' : '⚠️';
    console.log(`${icon} [${status.padEnd(14)}] ${title}`);
    console.log(`   Detail     : ${detail}`);
    if (remediation && remediation !== 'None required') {
      console.log(`   Remedy     : ⚡ ${remediation}`);
    }
    console.log('');
  };

  printRow(
    google.name,
    google.status,
    `Account: ${google.account} | Age: ${google.tokenAgeDays ?? 'N/A'}d | Mode: Production (Permanent ADC) | Sheets=${google.hasSheetsScope ? 'YES' : 'NO'}, Drive=${google.hasDriveScope ? 'YES' : 'NO'}`,
    google.remediation
  );

  printRow(
    nlm.name,
    nlm.status,
    `Account: ${nlm.account} | Notebooks: ${nlm.notebooksFound ?? 'N/A'} | Validated: ${nlm.lastValidated || 'recent'}`,
    nlm.remediation
  );

  printRow(
    gemini.name,
    gemini.status,
    `Active Keys: ${gemini.activeKeys}/${gemini.totalKeys} | Exhausted: ${gemini.exhaustedKeys}`,
    gemini.remediation
  );

  printRow(
    cdp.name,
    cdp.status,
    `Port: 9222 | Tabs: ${cdp.openTabsCount} | Partner Portal SSO: ${cdp.partnerPortalActive ? 'Active' : 'Inactive'} | OCA: ${cdp.ocaSessionActive ? 'Active' : 'Inactive'}`,
    cdp.remediation
  );

  printRow(
    jules.name,
    jules.status,
    `Key Configured: ${jules.valid ? 'YES' : 'NO'} (INV-72: strictly CI/CD protocol)`,
    jules.remediation
  );

  console.log('================================================================\n');
}

if (require.main === module) {
  main().catch(err => {
    console.error('[AUTH_STATUS_ERROR]', err);
    process.exit(1);
  });
}

module.exports = { main };
