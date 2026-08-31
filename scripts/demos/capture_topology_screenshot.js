'use strict';
/**
 * scripts/capture_topology_screenshot.js
 * Headless script to open Dashboard, run evaluation on HP Opportunity Excel BOQ,
 * open the Visual BOQ Topology modal, and capture high-res screenshot artifacts.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');

const PORT = 3000;
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const SERVER_URL = `http://127.0.0.1:${PORT}`;
const BOQ_FILE = path.join(PROJECT_ROOT, 'HP Opportunity- DL380_5 Servers.xlsx');
const OUTPUT_IMG = path.join(PROJECT_ROOT, 'outputs', 'history', 'visual_boq_topology_screenshot.png');
const ARTIFACTS_DIR = '/home/vinodh/.gemini/antigravity-ide/brain/8064941a-87d2-4f88-9126-5f0e45bda912';

function isServerRunning(url) {
  return new Promise(resolve => {
    http.get(url, res => resolve(res.statusCode === 200)).on('error', () => resolve(false));
  });
}

async function capture() {
  console.log('📸 Capturing Visual BOQ Topology Canvas Screenshot...');

  let serverProc = null;
  const running = await isServerRunning(SERVER_URL);

  if (!running) {
    console.log('Starting dashboard server...');
    const serverScript = path.join(PROJECT_ROOT, 'dashboard', 'server.cjs');
    serverProc = spawn('node', [serverScript], {
      cwd: PROJECT_ROOT,
      env: { ...process.env, PORT: String(PORT) }
    });

    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 500));
      if (await isServerRunning(SERVER_URL)) break;
    }
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
  const page = await context.newPage();

  try {
    console.log('Navigating to dashboard...');
    await page.goto(SERVER_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);

    // Switch to Macro Lifecycle if needed
    const macroTabBtn = page.locator('button:has-text("Macro Lifecycle")').first();
    if (await macroTabBtn.count() > 0) {
      await macroTabBtn.click();
      await page.waitForTimeout(500);
    }

    // Open BOQ Uploader modal
    const uploadBtn = page.locator('button:has-text("Load BOQ & Evaluate"), button:has-text("Upload BOQ"), button:has-text("Load BOQ")').first();
    if (await uploadBtn.count() > 0) {
      await uploadBtn.click();
      await page.waitForTimeout(800);
    }

    // Upload file
    const fileInput = page.locator('#boq-file-input, input[type="file"]').first();
    await fileInput.waitFor({ state: 'attached', timeout: 15000 });
    await fileInput.setInputFiles(BOQ_FILE);
    await page.waitForTimeout(1000);

    // Pre-flight analysis
    const preflightBtn = page.locator('button:has-text("Pre-flight Variation Analysis"), button:has-text("Pre-process & Categorize")').first();
    await preflightBtn.click();
    await page.waitForSelector('text=Pre-flight Intake Audit', { timeout: 15000 });
    console.log('Pre-flight audit ready. Evaluating...');

    // Run Full Evaluation
    const evalBtn = page.locator('button:has-text("Proceed to Full 6-Aspect Evaluation")').first();
    await evalBtn.click();

    // Wait for evaluation banner
    const banner = page.locator('text=Certified Buildable Configuration').or(page.locator('text=Physical Constraint Violations Flagged')).first();
    await banner.waitFor({ state: 'visible', timeout: 120000 });
    console.log('Evaluation completed. Opening Visual Topology Modal...');

    // Click Visual BOQ Topology
    const topologyBtn = page.locator('button:has-text("Visual BOQ Topology")').first();
    await topologyBtn.click();
    await page.waitForTimeout(1500);

    // Ensure outputs/history directory exists
    const outDir = path.dirname(OUTPUT_IMG);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    // Capture screenshot
    await page.screenshot({ path: OUTPUT_IMG, fullPage: false });
    console.log(`✅ Saved screenshot to: ${OUTPUT_IMG}`);

    // Copy to brain artifacts directory
    if (fs.existsSync(ARTIFACTS_DIR)) {
      const artifactImg = path.join(ARTIFACTS_DIR, 'visual_boq_topology_screenshot.png');
      fs.copyFileSync(OUTPUT_IMG, artifactImg);
      console.log(`✅ Copied screenshot to artifacts: ${artifactImg}`);
    }

  } finally {
    await browser.close();
    if (serverProc) serverProc.kill();
  }
}

capture().catch(err => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
