'use strict';
/**
 * tests/e2e/test_dashboard_full_portfolio_e2e.js
 *
 * Isolated offline Playwright portfolio E2E:
 * - Self-spawns dashboard/server.cjs --production when DASHBOARD_E2E_URL is not provided.
 * - Blocks all external network traffic so CI verifies strict offline behavior.
 * - Exercises portfolio catalog switching, verifies visible SKU updates across products,
 *   runs a non-DL380 (DL360_Gen11) evaluation, and asserts topology shows the actual SKU/product.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');
const crypto = require('crypto');
const assert = require('assert');
const { spawn, execFileSync } = require('child_process');
const { chromium } = require('playwright');

const PROJECT_ROOT = path.resolve(__dirname, '../..');

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function waitForHealth(baseUrl, timeoutMs = 25000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.ok) return;
    } catch { /* retrying */ }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error(`Dashboard server did not become healthy at ${baseUrl}`);
}

async function stopServer(proc) {
  if (!proc || proc.exitCode !== null) return;
  if (process.platform === 'win32' && proc.pid) {
    try {
      execFileSync('taskkill', ['/PID', String(proc.pid), '/T', '/F'], { stdio: 'ignore' });
      return;
    } catch { /* fall through */ }
  }
  proc.kill('SIGTERM');
  await new Promise(r => setTimeout(r, 1000));
}

function isAllowedLocalUrl(rawUrl) {
  if (/^(?:data:|blob:|about:)/i.test(rawUrl)) return true;
  try {
    return ['127.0.0.1', 'localhost'].includes(new URL(rawUrl).hostname);
  } catch {
    return false;
  }
}

async function selectHeaderProduct(page, productName) {
  await page.locator('button', { hasText: /Chassis Context/i }).first().click();
  await page.locator('input[aria-label="Search products"]').fill(productName);
  await page.locator('div.max-h-56 button', { hasText: new RegExp(productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }).first().click();
}

async function waitForCatalogSkuChange(page, previousSku, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const firstSku = await page.locator('[data-tab="catalog"]').evaluate(async () => {
      const cell = document.querySelector('table tbody tr td.font-mono, table tbody tr td');
      return cell ? cell.textContent.trim() : '';
    });
    if (firstSku && firstSku !== previousSku) return firstSku;
    await new Promise(r => setTimeout(r, 200));
  }
  return '';
}

async function runPortfolioE2E() {
  const externalAttempts = [];
  const consoleErrors = [];
  const pageErrors = [];
  const ownRunsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-e2e-runs-'));
  const port = await getFreePort();
  const baseUrl = process.env.DASHBOARD_E2E_URL || `http://127.0.0.1:${port}`;
  let serverProc = null;
  let browser = null;

  try {
    if (!process.env.DASHBOARD_E2E_URL) {
      serverProc = spawn(process.execPath, ['dashboard/server.cjs', '--production'], {
        cwd: PROJECT_ROOT,
        env: {
          ...process.env,
          NODE_ENV: 'production',
          PORT: String(port),
          DASHBOARD_RUNS_DIR: ownRunsDir,
          OFFLINE_MODE: '1',
          LOCAL_EVAL_ONLY: '1',
          DELIVERY_AUTH_SECRET: crypto.randomBytes(32).toString('hex')
        },
        stdio: ['ignore', 'pipe', 'pipe']
      });
      await waitForHealth(baseUrl);
    }

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.route('**/*', route => {
      const url = route.request().url();
      if (isAllowedLocalUrl(url)) return route.continue();
      externalAttempts.push(url);
      return route.abort('blockedbyclient');
    });

    const page = await context.newPage();
    page.on('pageerror', err => pageErrors.push(err.message));
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-tab="catalog"]').click();

    const expectedProducts = [
      { label: 'DL380 Gen12', expectedSkuToken: 'P73282-B21' },
      { label: 'DL360 Gen11', expectedSkuToken: 'P52499-B21' },
      { label: 'SN3600B', expectedSkuToken: 'R7R97A' }
    ];

    const observedTableText = [];
    for (const prod of expectedProducts) {
      await selectHeaderProduct(page, prod.label);
      await waitForCatalogSkuChange(page, observedTableText[observedTableText.length - 1] || '');
      const catalogText = await page.locator('main, table').first().textContent();
      assert(catalogText.includes(prod.expectedSkuToken), `Catalog Explorer for ${prod.label} must show SKU ${prod.expectedSkuToken}`);
      observedTableText.push(prod.expectedSkuToken);
    }
    assert.strictEqual(new Set(observedTableText).size, expectedProducts.length, 'Portfolio product switches must render distinct product SKUs');

    // Run a real non-DL380 offline evaluation (DL385 Gen11 certified) and verify visual topology fidelity
    await page.locator('[data-tab="orchestrator"]').click();
    await selectHeaderProduct(page, 'DL385 Gen11');
    await page.getByRole('button', { name: /Load \/ Evaluate BOQ|Load BOQ & Evaluate/i }).first().click();
    const uploaderModal = page.getByRole('dialog');
    await uploaderModal.waitFor({ timeout: 5000 });
    await page.getByPlaceholder(/Paste quote lines/i).fill('1x P53921-B21 HPE ProLiant DL385 Gen11 8SFF Configure-to-order Server\n1x P58540-B21 AMD EPYC 9224 2.5GHz 24-core 200W Processor for HPE');

    const evalRespPromise = page.waitForResponse(r => r.url().includes('/api/eval-boq') && r.request().method() === 'POST');
    await page.getByRole('button', { name: /Run 7-Aspect Evaluation/i }).click();
    const evalAccepted = await (await evalRespPromise).json();
    assert.ok(evalAccepted.runId);

    const deadline = Date.now() + 90000;
    while (Date.now() < deadline) {
      const runState = await fetch(`${baseUrl}/api/run/${encodeURIComponent(evalAccepted.runId)}`).then(r => r.json());
      const run = runState.run || runState;
      if (['COMPLETED', 'ACTION_REQUIRED', 'FAILED'].includes(run?.status)) {
        if (run.result || run.status !== 'COMPLETED') break;
      }
      await new Promise(r => setTimeout(r, 350));
    }

    await page.keyboard.press('Escape');
    await uploaderModal.waitFor({ state: 'detached', timeout: 5000 });
    await page.locator('[data-tab="matrix"]').click();
    await page.getByRole('button', { name: /Visual BOQ Topology/i }).click();
    const topoModal = page.getByRole('dialog', { name: /Topology/i });
    await topoModal.waitFor({ timeout: 5000 });
    const modalText = await topoModal.textContent();
    assert(modalText.includes('P53921-B21'), `Expected non-DL380 SKU P53921-B21 in topology, got: ${modalText}`);
    assert(!modalText.includes('P73282-B21'), 'Topology must not fall back to DL380 SKU P73282-B21');
    assert(!/DL380 Gen12/i.test(modalText), 'Topology must not leak DL380 Gen12 label');

    assert.strictEqual(externalAttempts.length, 0, `External requests blocked: ${externalAttempts.join(', ')}`);
    assert.strictEqual(pageErrors.length, 0, `Page errors: ${pageErrors.join(' | ')}`);
    assert.strictEqual(consoleErrors.length, 0, `Console errors: ${consoleErrors.join(' | ')}`);
    console.log('✅ Full Portfolio Offline E2E PASSED cleanly.');
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (serverProc) await stopServer(serverProc);
    fs.rmSync(ownRunsDir, { recursive: true, force: true });
  }
}

runPortfolioE2E().catch(err => {
  console.error('❌ Full Portfolio E2E FAILED:', err);
  process.exit(1);
});
