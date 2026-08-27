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
const { spawn, execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const PROFILE_DIR = path.join(PROJECT_ROOT, '.chrome_sso_profile');

/**
 * Check if CDP port is responsive.
 * @param {number} port 
 * @returns {Promise<boolean>}
 */
function isCdpAlive(port = 9222) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/json/version`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Find available Chrome executable on the current OS.
 * @returns {string} Executable name or path
 */
function findChromeExecutable() {
  const candidates = [
    'google-chrome',
    'google-chrome-stable',
    'chromium',
    'chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ];

  for (const bin of candidates) {
    if (bin.includes('/') || bin.includes('\\')) {
      if (fs.existsSync(bin)) return bin;
    } else {
      try {
        const isWindows = process.platform === 'win32';
        const checkCmd = isWindows ? `where ${bin}` : `which ${bin}`;
        execSync(checkCmd, { stdio: 'ignore' });
        return bin;
      } catch (_) {}
    }
  }
  return 'google-chrome'; // Default fallback
}

/**
 * Ensure Chrome is running with remote debugging on specified port.
 * @param {number} port - Remote debugging port (default 9222)
 * @param {string} initialUrl - Initial URL to load (default Partner Portal)
 * @returns {Promise<{ ok: boolean, wasLaunched: boolean, port: number }>}
 */
async function ensureChromeBrowserRunning(port = 9222, initialUrl = 'https://partner.hpe.com') {
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
