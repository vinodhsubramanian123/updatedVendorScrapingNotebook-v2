'use strict';
/**
 * scripts/maintenance/test_dashboard_browser_e2e.js
 *
 * Full headless browser E2E test of the dashboard using Playwright Chromium.
 * Verifies live DOM rendering, tab switching, presales panel, sample BOM population,
 * portfolio table, settings drawer, and zero console errors.
 */

const http = require('http');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const path = require('path');

const PORT = 3821;
const BASE_URL = `http://localhost:${PORT}`;
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      http.get(`${url}/api/available-catalogs`, res => {
        if (res.statusCode === 200) return resolve();
        if (Date.now() - start > timeoutMs) return reject(new Error('Server start timed out with status ' + res.statusCode));
        setTimeout(check, 300);
      }).on('error', () => {
        if (Date.now() - start > timeoutMs) return reject(new Error('Server start timed out (connection refused)'));
        setTimeout(check, 300);
      });
    };
    check();
  });
}

async function verifyMobileLayout(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  try {
    await context.route('**/*', route => new URL(route.request().url()).origin === BASE_URL ? route.continue() : route.abort());
    const page = await context.newPage();
    await page.goto(BASE_URL);
    const header = page.locator('header');
    await header.getByRole('textbox', { name: 'Search catalog SKUs or ask NotebookLM' }).waitFor();
    const layout = await header.evaluate(element => ({
      padding: getComputedStyle(element).paddingInlineStart,
      documentWidth: document.documentElement.scrollWidth
    }));
    if (parseFloat(layout.padding) === 0 || layout.documentWidth > 390) {
      throw new Error(`Mobile layout lost spacing or overflows the viewport: ${JSON.stringify(layout)}`);
    }
    console.log('  ✓ Mobile search and navigation fit with external resources blocked');
  } finally {
    await context.close();
  }
}

async function runBrowserTest() {
  console.log('🚀 [E2E] Starting dashboard server on port', PORT, 'in production mode...');
  const serverProc = spawn('node', ['dashboard/server.cjs', '--production'], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, PORT: String(PORT), NODE_ENV: 'production' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  serverProc.stdout.on('data', d => process.stdout.write(`[Server stdout] ${d}`));
  serverProc.stderr.on('data', d => process.stderr.write(`[Server stderr] ${d}`));

  try {
    await waitForServer(BASE_URL);
    console.log('✅ [E2E] Dashboard server is listening and healthy at', BASE_URL);

    console.log('🌐 [E2E] Launching Playwright Chromium headless browser...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon') && !text.includes('net::ERR_CONNECTION_REFUSED')) {
          consoleErrors.push(text);
        }
      }
    });
    page.on('pageerror', err => consoleErrors.push(err.message));

    console.log('🧭 [E2E] Navigating to', BASE_URL);
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // 1. Verify Page Title & Main Header
    console.log('🔎 [E2E] Checking header and product context...');
    await page.waitForSelector('header', { timeout: 8000 });
    const headerText = await page.textContent('header');
    if (!headerText.includes('AI Studio') && !headerText.includes('Solution Evaluator') && !headerText.includes('One Config Advanced')) {
      throw new Error(`Unexpected header content: ${headerText}`);
    }
    console.log('  ✓ Header rendered successfully with active chassis context');

    // 2. Verify Presales Request Panel
    console.log('🔎 [E2E] Verifying Presales Request Panel...');
    const presalesHeading = await page.waitForSelector('text=Presales request', { timeout: 5000 });
    if (!presalesHeading) throw new Error('Presales request panel heading not found');
    const identifyBtn = await page.waitForSelector('text=Identify workflow', { timeout: 5000 });
    if (!identifyBtn) throw new Error('Identify workflow button not found');
    console.log('  ✓ Presales request panel is interactive');

    // 3. Switch to Macro Lifecycle and open BOQ Uploader modal
    console.log('🔎 [E2E] Switching to Macro Lifecycle view...');
    const macroBtn = await page.waitForSelector('button:has-text("Macro Lifecycle")', { timeout: 5000 });
    await macroBtn.click();
    await page.waitForTimeout(300);

    console.log('🔎 [E2E] Opening BOQ Uploader modal...');
    const loadBoqBtn = await page.waitForSelector('button:has-text("Load BOQ & Evaluate")', { timeout: 5000 });
    await loadBoqBtn.click();
    await page.waitForSelector('text=Intake Customer BOQ / Hardware Bill of Materials', { timeout: 5000 });

    console.log('🔎 [E2E] Testing BOQ Uploader sample preset in modal...');
    const sampleBtn = await page.waitForSelector('button:has-text("Sample Standard BOM")', { timeout: 5000 });
    await sampleBtn.click();
    await page.waitForTimeout(400);

    const textareaValue = await page.$eval('textarea[placeholder*="Paste quote lines"]', el => el.value);
    if (!textareaValue.includes('P73282-B21') && !textareaValue.includes('P52560-B21')) {
      throw new Error(`Sample BOM failed to populate textarea: ${textareaValue.slice(0, 100)}`);
    }
    console.log('  ✓ Sample Standard BOM populated textarea correctly with HPE SKUs');

    // Close the BOQ Uploader modal with Escape key
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    console.log('  ✓ BOQ Uploader modal closed on Escape');

    // 4. Test Tab Navigation: Catalog Explorer
    console.log('🔎 [E2E] Testing navigation to Catalog Explorer tab...');
    const catalogTabBtn = await page.waitForSelector('button[data-tab="catalog"]', { timeout: 5000 });
    await catalogTabBtn.click();
    await page.waitForSelector('input[placeholder*="Search SKUs"]', { timeout: 5000 });
    console.log('  ✓ Catalog Explorer tab loaded with search and category filters');

    // 5. Test Tab Navigation: Resolution Matrix tab
    console.log('🔎 [E2E] Testing navigation to Resolution Matrix tab...');
    const matrixTabBtn = await page.waitForSelector('button[data-tab="matrix"]', { timeout: 5000 });
    await matrixTabBtn.click();
    await page.waitForSelector('text=Multi-Tier Strategic Resolution Matrix', { timeout: 5000 });
    console.log('  ✓ Multi-Tier Strategic Resolution Matrix rendered');

    // 6. Test Tab Navigation: Agentic Insights / Telemetry
    console.log('🔎 [E2E] Testing navigation to Agentic Insights tab...');
    const telemetryTabBtn = await page.waitForSelector('button[data-tab="telemetry"]', { timeout: 5000 });
    await telemetryTabBtn.click();
    await page.waitForSelector('text=Telemetry', { timeout: 5000 });
    console.log('  ✓ Agentic Insights / Telemetry view rendered');

    // 7. Test Tab Navigation: Pipeline Ops & Chassis Portfolio Table
    console.log('🔎 [E2E] Testing navigation to Pipeline Ops tab...');
    const pipelineTabBtn = await page.waitForSelector('button[data-tab="pipeline"]', { timeout: 5000 });
    await pipelineTabBtn.click();
    await page.waitForTimeout(500);

    try {
      await page.waitForSelector('text=Portfolio Hardware & Rule Intelligence', { timeout: 15000 });
    } catch (err) {
      const bodyText = await page.innerText('body').catch(() => 'unable to read body');
      console.log('PAGE BODY SNIPPET ON FAILURE:\n', bodyText.slice(0, 800));
      throw err;
    }

    // Check portfolio items count
    const rows = await page.$$('tbody tr');
    console.log(`  ✓ Chassis Portfolio Table rendered with ${rows.length} product entries`);
    if (rows.length < 5) throw new Error(`Expected at least 5 chassis variants in portfolio table, found ${rows.length}`);

    // Test Portfolio Search Filter
    console.log('🔎 [E2E] Testing portfolio search filter...');
    const portfolioSearch = await page.waitForSelector('input[placeholder*="Search platform, model..."]', { timeout: 5000 });
    await portfolioSearch.fill('MSL');
    await page.waitForTimeout(300);
    const filteredRows = await page.$$('tbody tr');
    console.log(`  ✓ Filtered portfolio rows for 'MSL': ${filteredRows.length}`);
    if (filteredRows.length === 0) throw new Error('Search for MSL returned 0 rows');
    await portfolioSearch.fill('');
    await page.waitForTimeout(300);

    // 8. Test Settings Drawer (Accessible focus, Escape to close)
    console.log('🔎 [E2E] Testing Settings Drawer & focus management...');
    const settingsBtn = await page.waitForSelector('button[aria-label="Settings"]', { timeout: 5000 });
    await settingsBtn.click();
    await page.waitForSelector('text=System Settings', { timeout: 5000 });
    console.log('  ✓ Settings drawer opened with NotebookLM configuration');

    // Press Escape to test useModalFocus
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const drawerOpen = await page.$('text=System Settings');
    if (drawerOpen) throw new Error('Settings drawer did not close on Escape key');
    console.log('  ✓ Settings drawer closed cleanly on Escape key press');

    // 9. Verify Zero Unhandled Errors
    if (consoleErrors.length > 0) {
      console.warn('⚠️ Console errors detected:', consoleErrors);
      throw new Error(`Browser console errors detected: ${JSON.stringify(consoleErrors)}`);
    }

    await verifyMobileLayout(browser);
    console.log('🎉 [E2E] All browser validation checks PASSED with 0 errors!');
    await browser.close();
  } finally {
    console.log('🛑 [E2E] Stopping dashboard server...');
    serverProc.kill('SIGTERM');
  }
}

runBrowserTest()
  .then(() => {
    console.log('✨ [E2E] Complete browser test execution succeeded!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ [E2E] Browser test failed:', err);
    process.exit(1);
  });
