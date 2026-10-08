'use strict';
/**
 * scripts/maintenance/check_nlm_auth.js
 *
 * Proactive NotebookLM Authentication Health Check.
 *
 * Validates NotebookLM credentials headlessly via `nlm login --check`.
 * When authentication is valid, exits 0.
 * When stale or expired, exits 1 and emits the non-interactive recovery command:
 *   nlm login --force --storage file
 *
 * Usage:
 *   node scripts/maintenance/check_nlm_auth.js [--json]
 */

const { execFileSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

function checkAuthHealth() {
  const profileDir = path.join(os.homedir(), '.notebooklm-mcp-cli', 'profiles', 'default');
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
    const stdout = execFileSync('nlm', ['login', '--check'], {
      encoding: 'utf-8',
      timeout: 15000,
      env: { ...process.env, PATH: extendedPath }
    });

    const isValid = stdout.includes('Authentication valid');
    const notebooksMatch = stdout.match(/Notebooks found:\s*(\d+)/);
    const accountMatch = stdout.match(/Account:\s*([^\r\n]+)/);

    return {
      status: isValid ? 'VALID' : 'INVALID',
      valid: isValid,
      account: accountMatch ? accountMatch[1].trim() : (metadata?.email || 'unknown'),
      notebooksFound: notebooksMatch ? parseInt(notebooksMatch[1], 10) : null,
      lastValidated: metadata?.last_validated || new Date().toISOString(),
      rawOutput: stdout.trim()
    };
  } catch (error) {
    return {
      status: 'EXPIRED',
      valid: false,
      account: metadata?.email || 'unknown',
      error: error.message.trim(),
      remediationCommand: 'nlm login --force --storage file'
    };
  }
}

function main() {
  const asJson = process.argv.includes('--json');
  const health = checkAuthHealth();

  if (asJson) {
    console.log(JSON.stringify(health, null, 2));
    process.exit(health.valid ? 0 : 1);
  }

  if (health.valid) {
    console.log('\x1b[32m✓ NotebookLM Authentication is VALID and HEALTHY\x1b[0m');
    console.log(`  Account:   ${health.account}`);
    console.log(`  Notebooks: ${health.notebooksFound !== null ? health.notebooksFound : 'available'}`);
    console.log(`  Validated: ${health.lastValidated}`);
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

module.exports = { checkAuthHealth };
