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
const net = require('net');
const http = require('http');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const PROFILE_DIR = path.join(PROJECT_ROOT, '.chrome_sso_profile');
const ACTIVE_CDP_STATE_PATH = path.join(PROJECT_ROOT, 'outputs', 'history', 'oca_sessions', 'active_cdp_port.json');
const DEFAULT_CDP_PORT = 9222;
const FALLBACK_CDP_PORT_START = 9223;
const FALLBACK_CDP_PORT_END = 9245;

function getConfiguredCdpPort(fallback = DEFAULT_CDP_PORT) {
  const raw = process.env.OCA_CDP_PORT || process.env.CDP_PORT;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65535 ? parsed : fallback;
}

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

function findPlaywrightChromiumExecutable() {
  const home = os.homedir();
  const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
  const roots = [
    path.join(localAppData, 'ms-playwright'),
    path.join(home, '.cache', 'ms-playwright'),
    path.join(home, 'Library', 'Caches', 'ms-playwright')
  ];
  for (const rootDir of roots) {
    if (!fs.existsSync(rootDir)) continue;
    let dirs = [];
    try {
      dirs = fs.readdirSync(rootDir).filter(d => /^chromium-\d+/i.test(d)).sort().reverse();
    } catch (_) {
      dirs = [];
    }
    for (const dir of dirs) {
      const candidates = process.platform === 'win32'
        ? [path.join(rootDir, dir, 'chrome-win64', 'chrome.exe'), path.join(rootDir, dir, 'chrome-win', 'chrome.exe')]
        : process.platform === 'darwin'
          ? [path.join(rootDir, dir, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium')]
          : [path.join(rootDir, dir, 'chrome-linux', 'chrome')];
      for (const bin of candidates) {
        if (fs.existsSync(bin)) return bin;
      }
    }
  }
  return null;
}

/**
 * Find available Chrome executable on the current OS.
 * Supports Linux, macOS Monterey/Ventura/Sonoma/Sequoia, and Windows 10/11.
 * @returns {string} Executable name or path
 */
function findChromeExecutable() {
  if (process.env.OCA_BROWSER_BIN && fs.existsSync(process.env.OCA_BROWSER_BIN)) {
    return process.env.OCA_BROWSER_BIN;
  }
  if (process.env.OCA_USE_PLAYWRIGHT_CHROMIUM === '1') {
    const pwBin = findPlaywrightChromiumExecutable();
    if (pwBin) return pwBin;
  }
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
  const pwFallback = findPlaywrightChromiumExecutable();
  if (pwFallback) return pwFallback;
  return process.platform === 'win32' ? 'chrome.exe' : 'google-chrome'; // Default fallback
}


function _buildPortConflictError(port, statusCode) {
  return `CDP port ${port} is occupied by a non-CDP listener responder (HTTP ${statusCode}). Close conflicting processes (e.g. background msedge.exe) bound to port ${port} and retry.`;
}

function isTcpPortBindable(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port, host);
  });
}

function readRecordedCdpPort() {
  try {
    if (!fs.existsSync(ACTIVE_CDP_STATE_PATH)) return null;
    const raw = JSON.parse(fs.readFileSync(ACTIVE_CDP_STATE_PATH, 'utf8'));
    const p = Number(raw?.port);
    return Number.isInteger(p) && p > 0 && p <= 65535 ? raw : null;
  } catch (_) {
    return null;
  }
}

function writeRecordedCdpPort(port, originalPort = DEFAULT_CDP_PORT) {
  try {
    const dir = path.dirname(ACTIVE_CDP_STATE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const payload = {
      port,
      originalPort,
      profileDir: PROFILE_DIR,
      updatedAt: new Date().toISOString()
    };
    const fsCompat = require('../system/fs_compat.js');
    fsCompat.safeWriteJsonAtomic(ACTIVE_CDP_STATE_PATH, payload);
  } catch (_) {}
}

async function resolveAvailableFallbackCdpPort(preferredPort = DEFAULT_CDP_PORT) {
  const recorded = readRecordedCdpPort();
  if (recorded && recorded.port !== preferredPort) {
    const recordedProbe = await probeCdpPort(recorded.port);
    if (recordedProbe.alive) {
      return { port: recorded.port, reusedExisting: true };
    }
  }
  const startPort = (preferredPort >= FALLBACK_CDP_PORT_START && preferredPort < FALLBACK_CDP_PORT_END)
    ? preferredPort + 1
    : FALLBACK_CDP_PORT_START;
  for (let p = startPort; p <= FALLBACK_CDP_PORT_END; p++) {
    if (p === preferredPort) continue;
    const probe = await probeCdpPort(p);
    if (!probe.alive && !probe.occupiedByNonCdp && await isTcpPortBindable(p)) {
      return { port: p, reusedExisting: false };
    }
  }
  return null;
}

function _spawnDetachedChromeProcess(chromeBin, chromeArgs, useHeadless) {
  if (process.platform === 'win32' && !useHeadless) {
    try {
      // Under Windows agent harnesses, processes spawned via cmd.exe inherit the caller's
      // Windows Job Object (KILL_ON_JOB_CLOSE), causing Chrome to terminate when an ephemeral
      // terminal turn finishes. Using WMI Win32_Process.Create delegates process creation to WmiPrvSE.exe,
      // ensuring Chrome completely breaks away from the Job Object and persists across turns (INV-253).
      const fullCmd = `"${chromeBin}" ${chromeArgs.map(a => a.includes(' ') ? `"${a}"` : a).join(' ')}`;
      const wmiScript = `Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = '${fullCmd.replace(/'/g, "''")}' }`;
      const encodedScript = Buffer.from(wmiScript, 'utf16le').toString('base64');
      const wmiProc = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encodedScript], {
        stdio: 'ignore',
        windowsHide: true
      });
      if (wmiProc && typeof wmiProc.unref === 'function') wmiProc.unref();
      return;
    } catch (_) {
      // Fall through to cmd start if WMI invocation fails
    }
  }

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

async function _resolveLaunchPortAndReuse(requestedPort, options) {
  const initialProbe = await probeCdpPort(requestedPort);
  if (initialProbe.alive) {
    return { ready: true, result: { ok: true, wasLaunched: false, port: requestedPort, occupiedByNonCdp: false, statusCode: initialProbe.statusCode } };
  }
  if (!initialProbe.occupiedByNonCdp || options.attemptLaunchOnOccupiedPort) {
    return { ready: false, launchPort: requestedPort, resolvedFromConflictPort: null, initialProbe };
  }
  if (!options.autoSelectFreePort) {
    const error = _buildPortConflictError(requestedPort, initialProbe.statusCode);
    console.warn(`⚠️ ${error}`);
    return {
      ready: true,
      result: { ok: false, wasLaunched: false, port: requestedPort, occupiedByNonCdp: true, statusCode: initialProbe.statusCode, error }
    };
  }
  const fallback = await resolveAvailableFallbackCdpPort(requestedPort);
  if (!fallback) {
    const error = `${_buildPortConflictError(requestedPort, initialProbe.statusCode)} No free fallback CDP port found in ${FALLBACK_CDP_PORT_START}-${FALLBACK_CDP_PORT_END}.`;
    console.warn(`⚠️ ${error}`);
    return {
      ready: true,
      result: { ok: false, wasLaunched: false, port: requestedPort, occupiedByNonCdp: true, statusCode: initialProbe.statusCode, error }
    };
  }
  if (fallback.reusedExisting) {
    process.env.OCA_CDP_PORT = String(fallback.port);
    console.log(`♻️ Reusing existing isolated CDP browser on port ${fallback.port} (resolved conflict on port ${requestedPort}).`);
    return {
      ready: true,
      result: { ok: true, wasLaunched: false, port: fallback.port, resolvedFromConflictPort: requestedPort, reusedFallback: true, occupiedByNonCdp: false, statusCode: 200 }
    };
  }
  console.warn(`⚠️ Port ${requestedPort} occupied by non-CDP listener (HTTP ${initialProbe.statusCode}). Auto-selecting free CDP port ${fallback.port} with isolated profile.`);
  return { ready: false, launchPort: fallback.port, resolvedFromConflictPort: requestedPort, initialProbe: { alive: false, occupiedByNonCdp: false, statusCode: null } };
}

/**
 * Ensure Chrome is running with remote debugging on specified port.
 * @param {number} port - Remote debugging port (default 9222)
 * @param {string} initialUrl - Initial URL to load (default Partner Portal)
 * @returns {Promise<{ ok: boolean, wasLaunched: boolean, port: number, occupiedByNonCdp?: boolean, statusCode?: number|null, error?: string, resolvedFromConflictPort?: number }>}
 */
async function ensureChromeBrowserRunning(port = DEFAULT_CDP_PORT, initialUrl = 'https://partner.hpe.com/web/prp', options = {}) {
  const resolution = await _resolveLaunchPortAndReuse(port, options);
  if (resolution.ready) return resolution.result;

  const { launchPort, resolvedFromConflictPort, initialProbe } = resolution;
  const useHeadless = Boolean(options.headless || process.env.OCA_HEADLESS_MODE === '1' || process.argv.includes('--headless'));
  console.log(`🌐 Chrome CDP port ${launchPort} is not active. Auto-launching Chrome (${useHeadless ? 'headless' : 'visible'} persistent profile)...`);

  if (!fs.existsSync(PROFILE_DIR)) {
    fs.mkdirSync(PROFILE_DIR, { recursive: true });
  }

  const chromeBin = findChromeExecutable();
  const chromeArgs = [
    `--remote-debugging-port=${launchPort}`,
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
    const finalProbe = await _pollForCdpReadiness(launchPort, timeoutMs, pollIntervalMs);
    if (finalProbe.alive) {
      if (resolvedFromConflictPort) {
        process.env.OCA_CDP_PORT = String(launchPort);
      }
      writeRecordedCdpPort(launchPort, resolvedFromConflictPort || launchPort);
      console.log(`✅ Chrome successfully launched and listening on CDP port ${launchPort}.`);
      return {
        ok: true,
        wasLaunched: true,
        port: launchPort,
        ...(resolvedFromConflictPort ? { resolvedFromConflictPort } : {}),
        occupiedByNonCdp: false,
        statusCode: finalProbe.statusCode
      };
    }

    const occupiedByNonCdp = Boolean(finalProbe.occupiedByNonCdp || initialProbe.occupiedByNonCdp);
    const statusCode = finalProbe.statusCode ?? initialProbe.statusCode ?? null;
    const error = occupiedByNonCdp
      ? _buildPortConflictError(launchPort, statusCode)
      : `Chrome launched but CDP port ${launchPort} did not respond within ${Math.round(timeoutMs / 1000)}s.`;
    console.warn(`⚠️ ${error}`);
    return { ok: false, wasLaunched: true, port: launchPort, occupiedByNonCdp, statusCode, error };
  } catch (err) {
    console.error(`❌ Failed to launch Chrome: ${err.message}`);
    return {
      ok: false,
      wasLaunched: false,
      port: launchPort,
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
  DEFAULT_CDP_PORT,
  getConfiguredCdpPort,
  probeCdpPort,
  isCdpAlive,
  isTcpPortBindable,
  readRecordedCdpPort,
  writeRecordedCdpPort,
  resolveAvailableFallbackCdpPort,
  findPlaywrightChromiumExecutable,
  findChromeExecutable,
  ensureChromeBrowserRunning,
  launchPlaywrightChromium,
  PROFILE_DIR
};

