'use strict';
/**
 * scripts/maintenance/check_nlm_auth.js
 *
 * Proactive NotebookLM Authentication Health Check & Auto-Healing.
 *
 * Validates NotebookLM credentials headlessly via `nlm login --check`.
 * When authentication is valid, exits 0.
 * When stale or expired, and autoHeal is requested (--heal), it automatically:
 *   Re-authenticates through the dedicated interactive Chrome on port 18801.
 * Health probes never remove browser locks or terminate browser processes.
 *
 * Usage:
 *   node scripts/maintenance/check_nlm_auth.js [--json] [--heal]
 */

const { execFileSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

function cleanStaleNlmChromeAndLocks(customProfileDir) {
  const profileDir = customProfileDir || process.env.NLM_PROFILE_DIR || path.join(os.homedir(), '.notebooklm-mcp-cli', 'chrome-profiles', 'default');
  const locks = ['lockfile', 'SingletonLock', 'SingletonCookie', 'SingletonSocket'];
  for (const lock of locks) {
    const lockPath = path.join(profileDir, lock);
    try {
      if (fs.existsSync(lockPath)) {
        fs.unlinkSync(lockPath);
      }
    } catch { /* ignore */ }
  }

  if (process.platform === 'win32') {
    try {
      const psCmd = `
        $hasActiveOca = $false
        try {
          $tabs = Invoke-RestMethod -Uri "http://127.0.0.1:9222/json/list" -TimeoutSec 2 -ErrorAction Stop
          foreach ($t in $tabs) {
            if ($t.url -match "partner\\.hpe\\.com|oca\\.ext\\.hpe\\.com") { $hasActiveOca = $true }
          }
        } catch {}
        if (-not $hasActiveOca) {
          $conns = Get-NetTCPConnection -LocalPort 9222 -ErrorAction SilentlyContinue
          foreach ($c in $conns) {
            $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $($c.OwningProcess)" -ErrorAction SilentlyContinue
            if ($proc -and ($proc.CommandLine -like "*--headless*" -or $proc.CommandLine -like "*notebooklm-mcp-cli*") -and ($proc.CommandLine -notlike "*.chrome_sso_profile*")) {
              Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
            }
          }
        }
      `;
      execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psCmd], {
        windowsHide: true,
        timeout: 10000,
        encoding: 'utf-8'
      });
    } catch { /* ignore */ }
  }
}

function checkAuthHealth(options = {}) {
  const autoHeal = options.autoHeal === true;
  const profile = options.profile || 'default';
  const profileDir = path.join(os.homedir(), '.notebooklm-mcp-cli', 'profiles', profile);
  const metadataPath = path.join(profileDir, 'metadata.json');
  let metadata = null;
  if (fs.existsSync(metadataPath)) {
    try {
      metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    } catch { /* ignore */ }
  }

  const envPath = process.env.PATH || '';
  const homeBin = path.join(os.homedir(), '.local', 'bin');
  const extendedPath = [homeBin, envPath].filter(Boolean).join(path.delimiter);

  try {
    const stdout = execFileSync('nlm', ['login', '--profile', profile, '--check'], {
      encoding: 'utf-8',
      timeout: 45000,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PATH: extendedPath }
    });

    const isValid = stdout.includes('Authentication valid');
    if (!isValid && autoHeal) throw new Error('NotebookLM authentication check returned INVALID');
    const notebooksMatch = stdout.match(/Notebooks found:\s*(\d+)/);
    const accountMatch = stdout.match(/Account:\s*([^\r\n]+)/);

    return {
      status: isValid ? 'VALID' : 'INVALID',
      valid: isValid,
      account: accountMatch ? accountMatch[1].trim() : (metadata?.email || 'unknown'),
      notebooksFound: notebooksMatch ? parseInt(notebooksMatch[1], 10) : null,
      lastValidated: metadata?.last_validated || new Date().toISOString(),
      rawOutput: stdout.trim(),
      ...(isValid ? {} : { remediationCommand: 'npm run auth:nlm:heal' })
    };
  } catch (error) {
    if (autoHeal) {
      try {
        const interactiveScript = path.join(__dirname, 'nlm_interactive_auth.js');
        const healArgs = [interactiveScript, '--json'];
        if (profile !== 'default') {
          healArgs.push('--profile', profile);
        }
        const healStdout = execFileSync(process.execPath, healArgs, {
          encoding: 'utf-8',
          timeout: 120000,
          stdio: ['ignore', 'pipe', 'pipe'],
          env: { ...process.env, PATH: extendedPath }
        });

        const parsed = JSON.parse(healStdout);
        const isValid = Boolean(parsed.ok || parsed.valid);

        return {
          status: isValid ? 'HEALED' : 'EXPIRED',
          valid: isValid,
          healed: isValid,
          account: parsed.account || (metadata?.email || 'unknown'),
          notebooksFound: parsed.notebooksFound ?? null,
          lastValidated: new Date().toISOString(),
          rawOutput: (parsed.rawOutput || '').trim()
        };
      } catch {
        // Fall through to error response
      }
    }

    return {
      status: 'EXPIRED',
      valid: false,
      account: metadata?.email || 'unknown',
      error: error.message.trim(),
      remediationCommand: 'npm run auth:nlm:heal'
    };
  }
}

function main() {
  const asJson = process.argv.includes('--json');
  const shouldHeal = process.argv.includes('--heal') || process.argv.includes('--fix');
  const health = checkAuthHealth({ autoHeal: shouldHeal });

  if (asJson) {
    console.log(JSON.stringify(health, null, 2));
    process.exit(health.valid ? 0 : 1);
  }

  if (health.valid) {
    console.log('\x1b[32m✓ NotebookLM Authentication is VALID and HEALTHY\x1b[0m');
    console.log(`  Account:   ${health.account}`);
    console.log(`  Notebooks: ${health.notebooksFound !== null ? health.notebooksFound : 'available'}`);
    console.log(`  Validated: ${health.lastValidated}`);
    console.log(`  Status:    ${health.status}`);
    console.log('  Mode:      Non-blocking (Proactive pre-flight check passed)');
    process.exit(0);
  } else {
    console.error('\x1b[31m✗ NotebookLM Authentication is EXPIRED or STALE\x1b[0m');
    console.error(`  Account:   ${health.account}`);
    if (health.error) console.error(`  Error:     ${health.error}`);
    console.error('\n\x1b[33mTo re-authenticate friction-free without interactive terminal prompts, run:\x1b[0m');
    console.error(`  \x1b[1m\x1b[36m${health.remediationCommand}\x1b[0m\n`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkAuthHealth, cleanStaleNlmChromeAndLocks };
