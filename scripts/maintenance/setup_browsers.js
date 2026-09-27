'use strict';
/**
 * scripts/maintenance/setup_browsers.js — Cross-Platform Browser Auto-Installer & Probe
 *
 * Ensures Playwright headless browser execution is 100% operational on:
 * - 🐧 Linux Mint / Ubuntu / Debian (npx playwright install chromium)
 * - 🪟 Windows 10 / 11 (npx playwright install chromium OR native Edge / Chrome)
 * - 🍎 macOS Monterey 12.7+ (Darwin <= 21 -> Native Google Chrome via channel: 'chrome')
 * - 🍎 macOS Ventura / Sonoma / Sequoia (Darwin >= 22 -> Playwright Chromium / System Chrome)
 */

const os = require('os');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { chromium } = require('playwright');
const { launchPlaywrightChromium, findChromeExecutable } = require('../lib/scraper/browser_launcher.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

async function setupAndVerifyBrowsers() {
  console.log('================================================================');
  console.log('🌐 CROSS-PLATFORM BROWSER SETUP & VERIFICATION HARNESS');
  console.log('================================================================\n');

  const platform = process.platform;
  const isMac = platform === 'darwin';
  const isWin = platform === 'win32';
  const isLinux = platform === 'linux';
  const releaseMajor = parseInt(os.release().split('.')[0], 10);

  console.log(`🖥️  Host OS: ${platform} (${os.type()} ${os.release()})`);

  let installedPlaywright = false;

  if (isMac && releaseMajor <= 21) {
    console.log('🍎 macOS Monterey 12.7 detected (Darwin <= 21).');
    console.log('ℹ️  Microsoft Playwright does not build chromium binaries for mac12.');
    console.log('ℹ️  Verifying system Google Chrome (/Applications/Google Chrome.app)...');

    const chromePath = '/Applications/Google Chrome.app';
    if (!fs.existsSync(chromePath)) {
      console.error('\n❌ CRITICAL: Google Chrome is not installed at /Applications/Google Chrome.app');
      console.error('   Please install Google Chrome on macOS Monterey to enable browser scraping and UI tests:');
      console.error('   https://www.google.com/chrome/\n');
      process.exit(1);
    }
    console.log(`✅ System Google Chrome verified at ${chromePath}.`);
  } else {
    // Linux, Windows, or Modern macOS (Darwin >= 22)
    console.log('📦 Ensuring Playwright Chromium binaries are installed...');
    try {
      execSync('npx -y playwright install chromium', {
        cwd: PROJECT_ROOT,
        stdio: 'inherit'
      });
      installedPlaywright = true;
      console.log('✅ Playwright Chromium installation verified.');
    } catch (err) {
      console.warn(`⚠️  Playwright install command returned non-zero (${err.message}).`);
      console.warn('   Testing fallback to system Chrome / Edge...');
    }
  }

  // Probe launch
  console.log('\n🔍 Probing headless browser launch via launchPlaywrightChromium...');
  try {
    const startTime = Date.now();
    const browser = await launchPlaywrightChromium(chromium, { headless: true });
    const version = browser.version ? browser.version() : 'unknown';
    await browser.close();
    const duration = Date.now() - startTime;

    console.log(`✅ SUCCESS: Headless browser launched and closed in ${duration}ms!`);
    console.log(`   Engine Version: ${version}`);
    console.log('================================================================\n');
    return true;
  } catch (err) {
    console.error('\n❌ BROWSER PROBE FAILED:');
    console.error(`   ${err.message}\n`);
    console.error('Troubleshooting instructions:');
    if (isMac) {
      console.error('  - Ensure /Applications/Google Chrome.app exists and is readable.');
    } else if (isLinux) {
      console.error('  - Run: npx playwright install-deps chromium && npx playwright install chromium');
    } else if (isWin) {
      console.error('  - Run: npx playwright install chromium');
    }
    process.exit(1);
  }
}

if (require.main === module) {
  setupAndVerifyBrowsers().catch(err => {
    console.error('Fatal error during browser setup:', err);
    process.exit(1);
  });
}

module.exports = { setupAndVerifyBrowsers };
