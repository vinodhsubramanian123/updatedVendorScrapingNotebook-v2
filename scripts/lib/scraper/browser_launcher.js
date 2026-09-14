'use strict';
/**
 * scripts/lib/scraper/browser_launcher.js — Automated Cross-Platform Chrome CDP Launcher
 *
 * Automatically checks if Chrome is running with remote debugging on port 9222.
 * If not, seamlessly launches Chrome with the persistent SSO user data profile,
 * eliminating the need for the user to remember CLI flags or open ports manually.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const PROFILE_DIR = path.join(PROJECT_ROOT, '.chrome_sso_profile');

/**
 * Check if CDP port is responsive.
 * @param {number} port 
 * @returns {Promise<boolean>}
 */
function isCdpAlive(port = 9222) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (val) => {
      if (!settled) {
        settled = true;
        resolve(val);
      }
    };
    try {
      const req = http.get(`http://localhost:${port}/json/version`, (res) => {
        done(res.statusCode === 200);
      });
      if (req && typeof req.on === 'function') {
        req.on('error', () => done(false));
      }
      if (req && typeof req.setTimeout === 'function') {
        req.setTimeout(1000, () => {
          if (typeof req.destroy === 'function') req.destroy();
          done(false);
        });
      }
    } catch (_) {
      done(false);
    }
  });
}

/**
 * Pure in-memory cross-platform executable resolution in PATH without shell binaries (INV-16).
 * @param {string} bin 
 * @returns {boolean}
 */
function isBinaryInPath(bin) {
  const pathEnv = process.env.PATH || '';
  const pathDirs = pathEnv.split(path.delimiter);
  const extensions = process.platform === 'win32' ? ['.exe', '.cmd', '.bat', ''] : [''];
  for (const dir of pathDirs) {
    if (!dir) continue;
    for (const ext of extensions) {
      const fullPath = path.join(dir, `${bin}${ext}`);
      try {
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
          return true;
        }
      } catch (_) {}
    }
  }
  return false;
}

const os = require('os');

/**
 * Find available Chrome executable on the current OS.
 * Supports Linux, macOS Monterey/Ventura/Sonoma/Sequoia, and Windows 10/11.
 * @returns {string} Executable name or path
 */
function findChromeExecutable() {
  const home = os.homedir();
  const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
  const progFiles = process.env.PROGRAMFILES || 'C:\\Program Files';
  const progFilesX86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';

  const candidates = [
    // Linux
    'google-chrome',
    'google-chrome-stable',
    'chromium',
    'chromium-browser',
    // macOS (System & User applications)
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    path.join(home, 'Applications', 'Google Chrome.app', 'Contents', 'MacOS', 'Google Chrome'),
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    // Windows (System 64-bit, 32-bit, Per-User AppData, and Edge)
    path.join(progFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(progFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(progFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(progFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe')
  ];

  for (const bin of candidates) {
    if (bin.includes('/') || bin.includes('\\')) {
      if (fs.existsSync(bin)) return bin;
    } else if (isBinaryInPath(bin)) {
      return bin;
    }
  }
  return process.platform === 'win32' ? 'chrome.exe' : 'google-chrome'; // Default fallback
}


/**
 * Ensure Chrome is running with remote debugging on specified port.
 * @param {number} port - Remote debugging port (default 9222)
 * @param {string} initialUrl - Initial URL to load (default Partner Portal)
 * @returns {Promise<{ ok: boolean, wasLaunched: boolean, port: number }>}
 */
async function ensureChromeBrowserRunning(port = 9222, initialUrl = 'https://partner.hpe.com/web/prp') {
  const alreadyRunning = await isCdpAlive(port);
  if (alreadyRunning) {
    return { ok: true, wasLaunched: false, port };
  }

  console.log(`🌐 Chrome CDP port ${port} is not active. Auto-launching Chrome with persistent profile...`);

  if (!fs.existsSync(PROFILE_DIR)) {
    fs.mkdirSync(PROFILE_DIR, { recursive: true });
  }

  const chromeBin = findChromeExecutable();
  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${PROFILE_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    initialUrl
  ];

  try {
    const proc = spawn(chromeBin, args, {
      detached: true,
      stdio: 'ignore'
    });
    proc.unref();

    // Poll until port becomes active (up to 8 seconds)
    const startTime = Date.now();
    while (Date.now() - startTime < 8000) {
      await new Promise(r => setTimeout(r, 500));
      if (await isCdpAlive(port)) {
        console.log(`✅ Chrome successfully launched and listening on CDP port ${port}.`);
        return { ok: true, wasLaunched: true, port };
      }
    }

    console.warn(`⚠️ Chrome launched but CDP port ${port} did not respond within 8s.`);
    return { ok: false, wasLaunched: true, port };
  } catch (err) {
    console.error(`❌ Failed to launch Chrome: ${err.message}`);
    return { ok: false, wasLaunched: false, port, error: err.message };
  }
}

module.exports = {
  isCdpAlive,
  findChromeExecutable,
  ensureChromeBrowserRunning,
  PROFILE_DIR
};
