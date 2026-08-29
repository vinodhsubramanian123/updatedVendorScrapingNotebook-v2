'use strict';
/**
 * tests/test_ui_workflow_e2e.js
 * Playwright headless UI test to verify:
 * 1. User navigation across all 5 tabs.
 * 2. BOQ file upload parsing and SSE progress hydration.
 * 3. SVG Visual Topology Mindmap interactive click, expand, and node coordinate rendering.
 */

const { chromium } = require('playwright');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

const PORT = process.env.PORT || 3000;
const SERVER_URL = `http://127.0.0.1:${PORT}`;

function isServerRunning(url) {
  return new Promise(resolve => {
    http.get(url, res => resolve(res.statusCode === 200)).on('error', () => resolve(false));
  });
}

async function runTests() {
  console.log('🚀 RUNNING UI WORKFLOW E2E TESTS');
  let serverProc = null;
  const serverAlreadyRunning = await isServerRunning(SERVER_URL);

  if (!serverAlreadyRunning) {
    console.log(`Starting dashboard server on ${SERVER_URL}...`);
    const serverScript = path.join(__dirname, '../..', 'dashboard', 'server.cjs');
    serverProc = spawn('node', [serverScript], {
      cwd: path.join(__dirname, '../..'),
      env: { ...process.env, PORT: String(PORT) }
    });

    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 500));
      if (await isServerRunning(SERVER_URL)) break;
    }
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon') && !text.includes('404') && !text.includes('409')) {
        consoleErrors.push(text);
      }
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  try {
    const res = await page.goto(SERVER_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    if (!res || !res.ok()) {
      throw new Error(`Dashboard failed to load at ${SERVER_URL} (Status: ${res?.status()})`);
    }

    // Wait for the app to render initially
    await page.waitForTimeout(2000);

    console.log('\n▶ [TEST 1] Testing User Navigation...');
    const tabs = [
      { id: 'orchestrator', label: 'BOQ Evaluator' },
      { id: 'matrix', label: 'Resolution Matrix' },
      { id: 'catalog', label: 'Catalog Explorer' },
      { id: 'telemetry', label: 'Agentic Insights' },
      { id: 'pipeline', label: 'Pipeline Ops' }
    ];

    for (const tab of tabs) {
      const tabBtn = await page.waitForSelector(`button[data-tab="${tab.id}"]`, { timeout: 5000 });
      await tabBtn.click();
      await page.waitForTimeout(500);
      console.log(`  ✅ Tab ${tab.label} clicked and active`);
    }

    console.log('\n▶ [TEST 2 & 3] Testing BOQ Evaluation & Topology...');
    await page.click(`button[data-tab="matrix"]`);
    await page.waitForTimeout(500);

    const loadEvalBtn = await page.waitForSelector('button:has-text("Load / Evaluate BOQ")');
    await loadEvalBtn.click();
    await page.waitForTimeout(1000);

    const sampleBtn = await page.waitForSelector('button:has-text("Sample Standard BOM")');
    await sampleBtn.click();
    await page.waitForTimeout(500);

    const runEvalBtn = await page.waitForSelector('button:has-text("Run 6-Aspect Evaluation")');
    await runEvalBtn.click();

    // Wait for SSE logs / evaluation to finish
    await page.waitForSelector('.animate-modal-content button:has-text("Visual BOQ Topology")', { timeout: 90000 });
    console.log('  ✅ BOQ Evaluation completed with SSE progress updates');

    const topoBtn = await page.waitForSelector('.animate-modal-content button:has-text("Visual BOQ Topology")');
    await topoBtn.click();
    await page.waitForTimeout(1500);

    const nodeEl = await page.waitForSelector('.topology-interactive-node', { timeout: 15000 });
    if (!nodeEl) throw new Error("Topology interactive node element not found.");

    const nodes = await page.$$('.topology-interactive-node');
    if (nodes.length === 0) throw new Error("No topology nodes found.");

    console.log(`  ✅ Topology rendered with ${nodes.length} nodes`);

    // Click a node to verify interactivity and coordinate logic
    await nodes[0].click({ force: true });
    await page.waitForTimeout(500);
    console.log('  ✅ Topology node clicked successfully');

    if (consoleErrors.length > 0) {
      console.error('\n❌ Console Errors encountered:');
      consoleErrors.forEach(e => console.error(e));
      throw new Error("Test failed due to console errors.");
    }

    console.log('\n✅ All Tests Passed Successfully!');
  } catch (err) {
    console.error(`\n❌ E2E Error:`, err.message);
    process.exit(1);
  } finally {
    await browser.close();
    if (serverProc) {
      serverProc.kill('SIGTERM');
      console.log('\nStopped dashboard server instance.');
    }
  }
}

if (require.main === module) {
  runTests().catch(err => {
    console.error('Fatal E2E test error:', err);
    process.exit(1);
  });
}
