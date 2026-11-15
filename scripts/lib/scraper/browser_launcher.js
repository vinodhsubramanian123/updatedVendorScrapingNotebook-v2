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
 * Probe CDP port to distinguish an active CDP endpoint (HTTP 200),
 * a non-CDP listener responder (e.g. HTTP 404 from background msedge.exe),
 * or an unbound/closed port.
 * @param {number} [port=9222]
 * @returns {Promise<{ alive: boolean, occupiedByNonCdp: boolean, statusCode: number | null }>}
 */
function probeCdpPort(port = 9222) {
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
        const statusCode = typeof res?.statusCode === 'number' ? res.statusCode : null;
        if (typeof res?.resume === 'function') res.resume();
        const alive = statusCode === 200;
        const occupiedByNonCdp = statusCode !== null && statusCode !== 200;
        done({ alive, occupiedByNonCdp, statusCode });
      });
      if (req && typeof req.on === 'function') {
        req.on('error', () => done({ alive: false, occupiedByNonCdp: false, statusCode: null }));
      }
      if (req && typeof req.setTimeout === 'function') {
        req.setTimeout(1000, () => {
          if (typeof req.destroy === 'function') req.destroy();
          done({ alive: false, occupiedByNonCdp: false, statusCode: null });
        });
      }
    } catch (_) {
      done({ alive: false, occupiedByNonCdp: false, statusCode: null });
    }
  });
}

/**
 * Check if CDP port is responsive.
 * @param {number} port 
 * @returns {Promise<boolean>}
 */
async function isCdpAlive(port = 9222) {
  const probe = await probeCdpPort(port);
  return Boolean(probe.alive);
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


function _buildPortConflictError(port, statusCode) {
  return `CDP port ${port} is occupied by a non-CDP listener responder (HTTP ${statusCode}). Close conflicting processes (e.g. background msedge.exe) bound to port ${port} and retry.`;
}

function _spawnDetachedChromeProcess(chromeBin, chromeArgs, useHeadless) {
  const proc = (process.platform === 'win32' && !useHeadless)
    ? spawn('cmd.exe', ['/c', 'start', '""', chromeBin, ...chromeArgs], {
        detached: true,
        stdio: 'ignore',
        windowsHide: false
      })
    : spawn(chromeBin, chromeArgs, {
        detached: true,
        stdio: 'ignore',
        windowsHide: useHeadless
      });
  if (proc && typeof proc.unref === 'function') proc.unref();
}

async function _pollForCdpReadiness(port, timeoutMs = 25000, pollIntervalMs = 500) {
  const startTime = Date.now();
  let lastProbe = { alive: false, occupiedByNonCdp: false, statusCode: null };
  while (Date.now() - startTime < timeoutMs) {
    await new Promise(r => setTimeout(r, pollIntervalMs));
    lastProbe = await probeCdpPort(port);
    if (lastProbe.alive) return lastProbe;
  }
  return lastProbe;
}

/**
 * Ensure Chrome is running with remote debugging on specified port.
 * @param {number} port - Remote debugging port (default 9222)
 * @param {string} initialUrl - Initial URL to load (default Partner Portal)
 * @returns {Promise<{ ok: boolean, wasLaunched: boolean, port: number, occupiedByNonCdp?: boolean, statusCode?: number|null, error?: string }>}
 */
async function ensureChromeBrowserRunning(port = 9222, initialUrl = 'https://partner.hpe.com/web/prp', options = {}) {
  const initialProbe = await probeCdpPort(port);
  if (initialProbe.alive) {
    return { ok: true, wasLaunched: false, port, occupiedByNonCdp: false, statusCode: initialProbe.statusCode };
  }
  if (initialProbe.occupiedByNonCdp && !options.attemptLaunchOnOccupiedPort) {
    const error = _buildPortConflictError(port, initialProbe.statusCode);
    console.warn(`⚠️ ${error}`);
    return {
      ok: false,
      wasLaunched: false,
      port,
      occupiedByNonCdp: true,
      statusCode: initialProbe.statusCode,
      error
    };
  }

  const useHeadless = Boolean(options.headless || process.env.OCA_HEADLESS_MODE === '1' || process.argv.includes('--headless'));
  console.log(`🌐 Chrome CDP port ${port} is not active. Auto-launching Chrome (${useHeadless ? 'headless' : 'visible'} persistent profile)...`);

  if (!fs.existsSync(PROFILE_DIR)) {
    fs.mkdirSync(PROFILE_DIR, { recursive: true });
  }

  const chromeBin = findChromeExecutable();
  const chromeArgs = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${PROFILE_DIR}`,
    '--remote-allow-origins=*',
    '--no-first-run',
    '--no-default-browser-check',
    ...(useHeadless ? ['--headless=new', '--window-size=1920,1080'] : []),
    initialUrl
  ];

  try {
    _spawnDetachedChromeProcess(chromeBin, chromeArgs, useHeadless);
    const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 25000;
    const pollIntervalMs = Number.isFinite(options.pollIntervalMs) ? options.pollIntervalMs : 500;
    const finalProbe = await _pollForCdpReadiness(port, timeoutMs, pollIntervalMs);
    if (finalProbe.alive) {
      console.log(`✅ Chrome successfully launched and listening on CDP port ${port}.`);
      return { ok: true, wasLaunched: true, port, occupiedByNonCdp: false, statusCode: finalProbe.statusCode };
    }

    const occupiedByNonCdp = Boolean(finalProbe.occupiedByNonCdp || initialProbe.occupiedByNonCdp);
    const statusCode = finalProbe.statusCode ?? initialProbe.statusCode ?? null;
    const error = occupiedByNonCdp
      ? _buildPortConflictError(port, statusCode)
      : `Chrome launched but CDP port ${port} did not respond within ${Math.round(timeoutMs / 1000)}s.`;
    console.warn(`⚠️ ${error}`);
    return { ok: false, wasLaunched: true, port, occupiedByNonCdp, statusCode, error };
  } catch (err) {
    console.error(`❌ Failed to launch Chrome: ${err.message}`);
    return {
      ok: false,
      wasLaunched: false,
      port,
      occupiedByNonCdp: Boolean(initialProbe.occupiedByNonCdp),
      statusCode: initialProbe.statusCode,
      error: err.message
    };
  }
}

/**
 * Launch Playwright Chromium or system Chrome with cross-platform fallback.
 * Works seamlessly on macOS Monterey (Darwin <= 21), Linux, and Windows.
 * @param {any} chromium - Playwright chromium module
 * @param {object} [options={}] - Browser launch options
 * @returns {Promise<any>}
 */
async function launchPlaywrightChromium(chromium, options = {}) {
  try {
    return await chromium.launch(options);
  } catch (err) {
    // Tier 1: Try built-in 'chrome' channel (official Google Chrome on macOS, Linux, and Windows)
    try {
      return await chromium.launch({ ...options, channel: 'chrome' });
    } catch (_) {}

    // Tier 2: Try built-in 'msedge' channel (pre-installed on Windows 10/11)
    if (process.platform === 'win32') {
      try {
        return await chromium.launch({ ...options, channel: 'msedge' });
      } catch (_) {}
    }

    // Tier 3: Try resolving specific system binary path
    const chromeBin = findChromeExecutable();
    if (chromeBin && (chromeBin.includes('/') || chromeBin.includes('\\')) && fs.existsSync(chromeBin)) {
      try {
        return await chromium.launch({ ...options, executablePath: chromeBin });
      } catch (_) {}
    }

    throw new Error(
      `Failed to launch browser across all methods (Playwright Chromium, system Chrome, Edge).\n` +
      `Original error: ${err.message}\n` +
      `Remediation:\n` +
      `  - Linux / Windows / Modern macOS: Run 'npx playwright install chromium'\n` +
      `  - macOS Monterey: Ensure Google Chrome is installed in /Applications/Google Chrome.app\n`
    );
  }
}

module.exports = {
  probeCdpPort,
  isCdpAlive,
  findChromeExecutable,
  ensureChromeBrowserRunning,
  launchPlaywrightChromium,
  PROFILE_DIR
};

