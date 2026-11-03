'use strict';
/**
 * scripts/maintenance/nlm_interactive_auth.js
 *
 * Automated NotebookLM Interactive Chrome & OpenClaw CDP Authentication Engine (INV-227).
 *
 * Solves:
 * 1. Windows Chrome child-process handoff bug in builtin `nlm login` launcher.
 * 2. Stale `SingletonLock` / `lockfile` traps in profile directories.
 * 3. Google "Browser or app may not be secure" bot detection during OAuth login.
 * 4. Zero-prompt credential refresh via `--provider openclaw --cdp-url http://127.0.0.1:18801`.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const { spawn, execFileSync } = require('child_process');

const NLM_CDP_PORT = 18801;
const NLM_URL = 'https://notebooklm.google.com/';
const LOCK_NAMES = ['lockfile', 'SingletonLock', 'SingletonCookie', 'SingletonSocket'];

function getNlmProfileDir() {
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    return path.join(localAppData, 'NlmInteractiveChrome');
  }
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'NlmInteractiveChrome');
  }
  return path.join(os.homedir(), '.config', 'NlmInteractiveChrome');
}

function getExtendedPath() {
  const envPath = process.env.PATH || '';
  const homeBin = path.join(os.homedir(), '.local', 'bin');
  return [homeBin, envPath].filter(Boolean).join(path.delimiter);
}

function isCdpAlive(port = NLM_CDP_PORT) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (val) => {
      if (!settled) {
        settled = true;
        resolve(val);
      }
    };
    try {
      const req = http.get(`http://127.0.0.1:${port}/json/version`, (res) => {
        res.resume();
        done(res.statusCode === 200);
      });
      req.on('error', () => done(false));
      req.setTimeout(1200, () => {
        req.destroy();
        done(false);
      });
    } catch (_) {
      done(false);
    }
  });
}

function findChromeExecutable() {
  const home = os.homedir();
  const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
  const progFiles = process.env.PROGRAMFILES || 'C:\\Program Files';
  const progFilesX86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';

  const candidates = [
    path.join(progFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(progFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    path.join(home, 'Applications', 'Google Chrome.app', 'Contents', 'MacOS', 'Google Chrome'),
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    'google-chrome-stable',
    'google-chrome',
    'chromium',
    'chromium-browser',
    path.join(progFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(progFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe')
  ];

  for (const bin of candidates) {
    if (bin.includes('/') || bin.includes('\\')) {
      if (fs.existsSync(bin)) return bin;
    }
  }
  return process.platform === 'win32' ? 'chrome.exe' : 'google-chrome';
}

function removeLocksInDir(targetDir) {
  if (!fs.existsSync(targetDir)) return;
  for (const lock of LOCK_NAMES) {
    try {
      const p = path.join(targetDir, lock);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch (_) {}
  }
}

function cleanStaleProfileLocks(profileDir = getNlmProfileDir()) {
  removeLocksInDir(profileDir);
  const defaultCliDir = path.join(os.homedir(), '.notebooklm-mcp-cli', 'chrome-profiles', 'default');
  removeLocksInDir(defaultCliDir);
}

function spawnChromeDetached(chromeBin, chromeArgs) {
  if (process.platform === 'win32') {
    return spawn('cmd.exe', ['/c', 'start', '""', chromeBin, ...chromeArgs], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false
    });
  }
  return spawn(chromeBin, chromeArgs, {
    detached: true,
    stdio: 'ignore',
    windowsHide: false
  });
}

async function ensureNlmChromeRunning(options = {}) {
  const port = options.port || NLM_CDP_PORT;
  if (await isCdpAlive(port)) {
    return { ok: true, alreadyRunning: true, port };
  }

  const profileDir = options.profileDir || getNlmProfileDir();
  cleanStaleProfileLocks(profileDir);
  if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true });
  }

  const chromeBin = findChromeExecutable();
  const chromeArgs = [
    `--user-data-dir=${profileDir}`,
    `--remote-debugging-port=${port}`,
    '--remote-allow-origins=*',
    '--no-first-run',
    '--no-default-browser-check',
    '--new-window',
    NLM_URL
  ];

  try {
    const proc = spawnChromeDetached(chromeBin, chromeArgs);
    proc.unref();

    const start = Date.now();
    const timeoutMs = options.timeoutMs || 20000;
    while (Date.now() - start < timeoutMs) {
      await new Promise(r => setTimeout(r, 600));
      if (await isCdpAlive(port)) {
        return { ok: true, launched: true, port };
      }
    }
    return { ok: false, error: `Timed out waiting for Chrome CDP on port ${port} after ${timeoutMs}ms`, port };
  } catch (err) {
    return { ok: false, error: err.message, port };
  }
}

function parseCheckOutput(stdout) {
  const isValid = stdout.includes('Authentication valid');
  const notebooksMatch = stdout.match(/Notebooks found:\s*(\d+)/);
  const accountMatch = stdout.match(/Account:\s*([^\r\n]+)/);

  return {
    valid: isValid,
    status: isValid ? 'VALID' : 'INVALID',
    account: accountMatch ? accountMatch[1].trim() : 'unknown',
    notebooksFound: notebooksMatch ? parseInt(notebooksMatch[1], 10) : null,
    rawOutput: stdout.trim()
  };
}

function verifyNlmCheck(extendedPath) {
  try {
    const checkStdout = execFileSync('nlm', ['login', '--profile', 'default', '--check'], {
      encoding: 'utf-8',
      timeout: 25000,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PATH: extendedPath }
    });
    return parseCheckOutput(checkStdout);
  } catch (err) {
    return { valid: false, status: 'CHECK_FAILED', error: err.message.trim() };
  }
}

async function loginViaOpenClaw(options = {}) {
  const port = options.port || NLM_CDP_PORT;
  const extendedPath = getExtendedPath();

  const chromeRes = await ensureNlmChromeRunning({ port });
  if (!chromeRes.ok) {
    return {
      ok: false,
      status: 'CHROME_LAUNCH_FAILED',
      error: chromeRes.error || `Failed to start interactive Chrome browser on port ${port}`
    };
  }

  try {
    const loginArgs = [
      'login',
      '--profile', 'default',
      '--provider', 'openclaw',
      '--cdp-url', `http://127.0.0.1:${port}`,
      '--storage', 'file',
      '--force'
    ];

    execFileSync('nlm', loginArgs, {
      encoding: 'utf-8',
      timeout: 45000,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PATH: extendedPath }
    });
  } catch (err) {
    return {
      ok: false,
      status: 'LOGIN_EXTRACTION_FAILED',
      error: err.message.trim(),
      hint: 'Ensure you are signed into Google NotebookLM in the Chrome window.'
    };
  }

  const checkRes = verifyNlmCheck(extendedPath);
  return {
    ok: checkRes.valid,
    ...checkRes
  };
}

async function healNlmAuth(options = {}) {
  const force = options.force === true;
  const extendedPath = getExtendedPath();

  if (!force) {
    const checkRes = verifyNlmCheck(extendedPath);
    if (checkRes.valid) {
      return {
        ok: true,
        ...checkRes,
        status: 'ALREADY_VALID'
      };
    }
  }

  return await loginViaOpenClaw(options);
}

async function main() {
  const asJson = process.argv.includes('--json');
  const openOnly = process.argv.includes('--open-only');
  const force = process.argv.includes('--force');

  if (openOnly) {
    const res = await ensureNlmChromeRunning();
    if (asJson) {
      console.log(JSON.stringify(res, null, 2));
    } else {
      console.log(res.ok ? `✓ Chrome running on port ${res.port}` : `✗ Failed: ${res.error}`);
    }
    process.exit(res.ok ? 0 : 1);
  }

  const result = await healNlmAuth({ force });

  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  }

  if (result.ok) {
    console.log('\x1b[32m✓ NotebookLM Authentication is VALID and HEALTHY\x1b[0m');
    console.log(`  Account:   ${result.account}`);
    console.log(`  Notebooks: ${result.notebooksFound !== null ? result.notebooksFound : 'available'}`);
    console.log(`  Status:    ${result.status}`);
    console.log('  Mode:      OpenClaw External CDP (Port 18801)');
    process.exit(0);
  } else {
    console.error('\x1b[31m✗ NotebookLM Authentication could not be completed\x1b[0m');
    if (result.error) console.error(`  Error: ${result.error}`);
    if (result.hint) console.error(`  Hint:  ${result.hint}`);
    console.error('\nTo sign in manually:');
    console.error('  1. Look at the Google Chrome window opened to https://notebooklm.google.com/');
    console.error('  2. Complete your Google Sign-In with your credentials');
    console.error('  3. Run: npm run auth:nlm:heal\n');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal error in nlm_interactive_auth:', err);
    process.exit(1);
  });
}

module.exports = {
  NLM_CDP_PORT,
  getNlmProfileDir,
  isCdpAlive,
  findChromeExecutable,
  cleanStaleProfileLocks,
  ensureNlmChromeRunning,
  loginViaOpenClaw,
  healNlmAuth
};
