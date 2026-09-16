#!/usr/bin/env node
'use strict';

/**
 * scripts/maintenance/restore_env.js — Autonomous Zero-Touch Cross-Platform Environment Restorer
 *
 * Fully automated migration restorer for new Antigravity setups on macOS 12.7+ (Monterey/Ventura/Sonoma)
 * and Windows 10/11 (PowerShell/CMD).
 *
 * Capabilities:
 * 1. Cross-Platform OS & User Detection (macOS Monterey, Windows, Linux).
 * 2. Automatic Bundle Discovery (CLI arg, ~/Downloads, ./, /tmp).
 * 3. Native Cross-Platform Zip Extraction (tar -xf, PowerShell, or unzip).
 * 4. Autonomous .env restoration.
 * 5. Google Cloud ADC & OAuth Client Secrets restoration (~/.config/gcloud and Windows %APPDATA%/gcloud).
 * 6. Google NotebookLM OAuth & Cookie restoration (~/.notebooklm-mcp-cli).
 * 7. Brain State & Master Knowledge Registry restoration (outputs/history).
 * 8. Dynamic ~/.gemini/config/mcp_config.json generation tailoring paths to the current machine.
 * 9. Playwright browser auto-installation (npx playwright install chromium).
 * 10. Automatic CLI tools detection (uv / pip: notebooklm-mcp-cli, graphifyy).
 * 11. Full 7-guardrail verification heartbeat execution.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawnSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

// Visual banners
function banner(title) {
  console.log('\n' + '='.repeat(68));
  console.log(`🚀  ${title}`);
  console.log('='.repeat(68));
}

function success(msg) {
  console.log(`✅  ${msg}`);
}

function info(msg) {
  console.log(`ℹ️   ${msg}`);
}

function warn(msg) {
  console.log(`⚠️   ${msg}`);
}

function errFail(msg) {
  console.error(`❌  ${msg}`);
  process.exit(1);
}

// 1. Cross-Platform System Detection
function detectSystem() {
  const platform = process.platform;
  const isMac = platform === 'darwin';
  const isWin = platform === 'win32';
  const isLinux = platform === 'linux';
  const home = os.homedir();
  const arch = os.arch();
  const release = os.release();

  let osName = 'Linux';
  if (isMac) osName = `macOS (Darwin ${release}, ${arch})`;
  if (isWin) osName = `Windows (NT ${release}, ${arch})`;

  info(`Detected Host Platform: ${osName}`);
  info(`Target User Home: ${home}`);
  return { isMac, isWin, isLinux, home, arch };
}

// 2. Discover Migration Bundle
function discoverBundle() {
  const home = os.homedir();
  const cliArg = process.argv[2];

  const candidatePaths = [
    cliArg,
    path.join(PROJECT_ROOT, 'antigravity_migration_bundle.zip'),
    path.join(home, 'Downloads', 'antigravity_migration_bundle.zip'),
    path.join(home, 'Desktop', 'antigravity_migration_bundle.zip'),
    '/tmp/antigravity_migration_bundle.zip',
    path.join(PROJECT_ROOT, 'antigravity-migration'),
    path.join(home, 'Downloads', 'antigravity-migration'),
    '/tmp/antigravity-migration'
  ].filter(Boolean);

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  errFail(
    `Migration bundle not found!\n` +
    `   Please download 'antigravity_migration_bundle.zip' from your Google Drive\n` +
    `   and place it in ~/Downloads or run:\n` +
    `   node scripts/maintenance/restore_env.js <path-to-zip>`
  );
}

// 3. Extract Bundle Cross-Platform
function extractBundle(bundlePath, sys) {
  const stat = fs.statSync(bundlePath);
  if (stat.isDirectory()) {
    info(`Using existing extracted bundle directory: ${bundlePath}`);
    return bundlePath;
  }

  const targetExtractDir = path.join(PROJECT_ROOT, 'outputs', 'temp', 'migration_extracted');
  if (!fs.existsSync(targetExtractDir)) {
    fs.mkdirSync(targetExtractDir, { recursive: true });
  }

  info(`Extracting migration bundle from ${bundlePath}...`);

  let extracted = false;

  // Method 1: bsdtar / tar (Available on macOS Monterey, Linux, and modern Windows 10/11)
  try {
    execSync(`tar -xf "${bundlePath}" -C "${targetExtractDir}"`, { stdio: 'ignore' });
    extracted = true;
  } catch (_) {}

  // Method 2: Windows PowerShell Expand-Archive
  if (!extracted && sys.isWin) {
    try {
      execSync(`powershell -Command "Expand-Archive -LiteralPath '${bundlePath}' -DestinationPath '${targetExtractDir}' -Force"`, { stdio: 'ignore' });
      extracted = true;
    } catch (_) {}
  }

  // Method 3: Standard unzip CLI on macOS / Linux
  if (!extracted && !sys.isWin) {
    try {
      execSync(`unzip -q -o "${bundlePath}" -d "${targetExtractDir}"`, { stdio: 'ignore' });
      extracted = true;
    } catch (_) {}
  }

  if (!extracted) {
    errFail(`Failed to extract ${bundlePath}. Please unzip it manually to: ${targetExtractDir}`);
  }

  // Handle nested directory wrapper if bundle extracted into antigravity-migration/
  const nested = path.join(targetExtractDir, 'antigravity-migration');
  if (fs.existsSync(nested)) {
    return nested;
  }
  return targetExtractDir;
}

// 4. Restore .env
function restoreEnv(extractedDir) {
  const envSrc = path.join(extractedDir, '.env');
  const envDst = path.join(PROJECT_ROOT, '.env');

  if (fs.existsSync(envSrc)) {
    let content = fs.readFileSync(envSrc, 'utf-8');
    // Sanitize: strip host-specific PATH exports to prevent cross-platform pollution (Linux vs macOS vs Windows)
    content = content
      .split('\n')
      .filter(line => !line.trim().startsWith('PATH='))
      .join('\n');
    fs.writeFileSync(envDst, content, 'utf-8');
    success(`Restored .env configuration to ${envDst}`);
  } else if (!fs.existsSync(envDst)) {
    const envExample = path.join(PROJECT_ROOT, '.env.example');
    if (fs.existsSync(envExample)) {
      fs.copyFileSync(envExample, envDst);
      warn(`No .env in bundle. Created from .env.example.`);
    }
  } else {
    info(`.env already exists at repository root.`);
  }
}

// 5. Restore Google ADC and OAuth Client Secret
function restoreGoogleAdc(extractedDir, sys) {
  const gcloudSrc = path.join(extractedDir, 'gcloud');
  if (!fs.existsSync(gcloudSrc)) {
    info(`No gcloud credentials directory in bundle. Skipping ADC copy.`);
    return;
  }

  const targets = [];
  // Standard Unix / macOS target
  targets.push(path.join(sys.home, '.config', 'gcloud'));

  // On Windows, Google Cloud SDK uses %APPDATA%\gcloud
  if (sys.isWin) {
    const appData = process.env.APPDATA || path.join(sys.home, 'AppData', 'Roaming');
    targets.push(path.join(appData, 'gcloud'));
  }

  for (const targetDir of targets) {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const files = fs.readdirSync(gcloudSrc);
    for (const f of files) {
      const srcFile = path.join(gcloudSrc, f);
      const dstFile = path.join(targetDir, f);
      fs.copyFileSync(srcFile, dstFile);
    }
    success(`Restored Google Cloud ADC credentials to: ${targetDir}`);
  }
}

// 6. Restore Google NotebookLM Session & Auth
function restoreNotebookLmAuth(extractedDir, sys) {
  const nlmSrc = path.join(extractedDir, 'notebooklm-mcp-cli');
  if (!fs.existsSync(nlmSrc)) {
    info(`No notebooklm-mcp-cli directory in bundle. Checking root of bundle...`);
    return;
  }

  const targetDir = path.join(sys.home, '.notebooklm-mcp-cli');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Recursive copy helper
  function copyRecursive(src, dst) {
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
      if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
      for (const child of fs.readdirSync(src)) {
        copyRecursive(path.join(src, child), path.join(dst, child));
      }
    } else {
      fs.copyFileSync(src, dst);
    }
  }

  copyRecursive(nlmSrc, targetDir);
  success(`Restored Google NotebookLM authenticated session to: ${targetDir}`);
}

// 7. Restore Brain History & Master Knowledge Registry
function restoreHistory(extractedDir) {
  const historySrc = path.join(extractedDir, 'history');
  const historyDst = path.join(PROJECT_ROOT, 'outputs', 'history');

  if (!fs.existsSync(historySrc)) return;
  if (!fs.existsSync(historyDst)) fs.mkdirSync(historyDst, { recursive: true });

  const files = fs.readdirSync(historySrc);
  for (const f of files) {
    const src = path.join(historySrc, f);
    const dst = path.join(historyDst, f);
    const stat = fs.statSync(src);
    if (stat.isFile()) {
      fs.copyFileSync(src, dst);
    } else if (stat.isDirectory() && f === 'evidence_logs') {
      if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
      for (const logFile of fs.readdirSync(src)) {
        fs.copyFileSync(path.join(src, logFile), path.join(dst, logFile));
      }
    }
  }
  success(`Restored brain history and master knowledge registry to outputs/history/`);
}

// 8. Configure Global ~/.gemini/config/mcp_config.json Dynamically
function configureMcpServers(extractedDir, sys) {
  const geminiConfigDir = path.join(sys.home, '.gemini', 'config');
  if (!fs.existsSync(geminiConfigDir)) {
    fs.mkdirSync(geminiConfigDir, { recursive: true });
  }

  const mcpConfigFile = path.join(geminiConfigDir, 'mcp_config.json');

  // Extract Jules API key dynamically from bundled config, existing config, or process.env (zero hardcoded secrets)
  let julesApiKey = process.env.JULES_API_KEY || '';
  const bundledMcpPath = path.join(extractedDir, 'gemini_config', 'mcp_config.json');
  if (!julesApiKey && fs.existsSync(bundledMcpPath)) {
    try {
      const bundled = JSON.parse(fs.readFileSync(bundledMcpPath, 'utf-8'));
      julesApiKey = bundled.mcpServers?.jules?.env?.JULES_API_KEY || '';
    } catch (_) {}
  }
  if (!julesApiKey && fs.existsSync(mcpConfigFile)) {
    try {
      const existing = JSON.parse(fs.readFileSync(mcpConfigFile, 'utf-8'));
      julesApiKey = existing.mcpServers?.jules?.env?.JULES_API_KEY || '';
    } catch (_) {}
  }

  // Search for Antigravity datacloud extension bundle
  function findMcpProxyBundle() {
    const searchRoots = [
      path.join(sys.home, '.antigravity-ide', 'extensions'),
      path.join(sys.home, 'Library', 'Application Support', 'Antigravity', 'extensions'),
      path.join(process.env.APPDATA || path.join(sys.home, 'AppData', 'Roaming'), 'Antigravity', 'extensions')
    ];
    for (const root of searchRoots) {
      if (fs.existsSync(root)) {
        const dirs = fs.readdirSync(root);
        for (const d of dirs) {
          if (d.startsWith('googlecloudtools.datacloud')) {
            const candidate = path.join(root, d, 'mcp_servers', 'cli', 'mcp_proxy_bundle.js');
            if (fs.existsSync(candidate)) return candidate;
          }
        }
      }
    }
    return null;
  }

  const proxyBundle = findMcpProxyBundle();

  // Find notebooklm-mcp command (checks ~/.local/bin, macOS Homebrew /opt/homebrew/bin, and /usr/local/bin)
  const binExt = sys.isWin ? '.exe' : '';
  function resolveMcpBinary(baseName) {
    const candidates = [
      path.join(sys.home, '.local', 'bin', `${baseName}${binExt}`),
      ...(sys.isMac ? [
        path.join('/opt/homebrew', 'bin', `${baseName}${binExt}`),
        path.join('/usr/local', 'bin', `${baseName}${binExt}`)
      ] : [])
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return `${baseName}${binExt}`;
  }

  const nlmCommand = resolveMcpBinary('notebooklm-mcp');

  const julesConfig = {
    command: "npx",
    args: [
      "-y",
      "@google/jules-mcp"
    ]
  };
  if (julesApiKey) {
    julesConfig.env = { JULES_API_KEY: julesApiKey };
  }

  const graphifyMcpCommand = resolveMcpBinary('graphify-mcp');

  const mcpConfig = {
    mcpServers: {
      "gemini-notebook-mcp": {
        command: nlmCommand,
        args: []
      },
      "jules": julesConfig,
      "graphify": {
        command: graphifyMcpCommand,
        args: []
      }
    }
  };

  if (proxyBundle) {
    mcpConfig.mcpServers["data-agent-kit"] = {
      command: "node",
      args: [proxyBundle, "dataAgentKit-antigravityide"]
    };
    mcpConfig.mcpServers["notebooks"] = {
      command: "node",
      args: [proxyBundle, "notebooks-antigravityide"]
    };
    mcpConfig.mcpServers["visualization"] = {
      command: "node",
      args: [proxyBundle, "visualization-antigravityide"]
    };
    info(`Configured Antigravity built-in extension MCP servers via: ${proxyBundle}`);
  }

  fs.writeFileSync(mcpConfigFile, JSON.stringify(mcpConfig, null, 2), 'utf-8');
  success(`Generated machine-accurate MCP configuration at: ${mcpConfigFile}`);
}

// 9. Install Playwright Headless Browser
function setupPlaywright() {
  info(`Ensuring Playwright Chromium binary is installed for E2E tests...`);
  try {
    execSync('npx playwright install chromium', { cwd: PROJECT_ROOT, stdio: 'inherit' });
    success(`Playwright Chromium browser installed.`);
  } catch (err) {
    warn(`Playwright install warning: ${err.message}. Tests may run with system Chrome.`);
  }
}

// 10. Check & Install Python CLI Tools (nlm & graphify)
function verifyPythonCliTools(sys) {
  info(`Verifying Python CLI tools (notebooklm-mcp-cli & graphifyy)...`);
  
  function hasCmd(cmd) {
    try {
      const res = spawnSync(cmd, ['--version'], { stdio: 'ignore' });
      return res.status === 0;
    } catch (_) {
      return false;
    }
  }

  const hasNlm = hasCmd('nlm');
  const hasGraphify = hasCmd('graphify');

  if (hasNlm && hasGraphify) {
    success(`CLI tools 'nlm' and 'graphify' are already installed and in PATH.`);
    return;
  }

  const hasUv = hasCmd('uv');
  if (hasUv) {
    info(`Found 'uv'. Auto-installing missing CLI tools via uv tool...`);
    if (!hasNlm) execSync('uv tool install notebooklm-mcp-cli', { stdio: 'inherit' });
    if (!hasGraphify) execSync('uv tool install graphifyy', { stdio: 'inherit' });
  } else {
    info(`Checking pip / python3...`);
    try {
      if (!hasNlm) execSync('python3 -m pip install notebooklm-mcp-cli --quiet', { stdio: 'inherit' });
      if (!hasGraphify) execSync('python3 -m pip install graphifyy --quiet', { stdio: 'inherit' });
    } catch (_) {
      warn(`Please ensure 'pip install notebooklm-mcp-cli graphifyy' or 'uv tool install ...' is run.`);
    }
  }
}

// 11. Run System Health Heartbeat
function runVerification() {
  banner('VERIFYING ENTERPRISE GUARDRAILS');
  try {
    execSync('node scripts/maintenance/guardrail_health_check.js', { cwd: PROJECT_ROOT, stdio: 'inherit' });
    banner('🎉 ENVIRONMENT RESTORATION 100% COMPLETE & VERIFIED');
    console.log('You can now start development or evaluate customer BOQs immediately:');
    console.log('  👉 npm run dashboard  (Launches Express + Vite + Listener)');
    console.log('  👉 npm test           (Runs complete test matrix)');
    console.log('  👉 npm run status     (Displays live portfolio observability)\n');
  } catch (_) {
    warn(`Guardrail check completed with warnings. Check output above.`);
  }
}

// Main Execution Flow
async function main() {
  banner('ANTIGRAVITY AUTONOMOUS ENVIRONMENT RESTORER');
  const sys = detectSystem();
  const bundlePath = discoverBundle();
  const extractedDir = extractBundle(bundlePath, sys);

  restoreEnv(extractedDir);
  restoreGoogleAdc(extractedDir, sys);
  restoreNotebookLmAuth(extractedDir, sys);
  restoreHistory(extractedDir);
  configureMcpServers(extractedDir, sys);
  setupPlaywright();
  verifyPythonCliTools(sys);
  runVerification();
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal restorer exception:', err);
    process.exit(1);
  });
}

module.exports = { main };
