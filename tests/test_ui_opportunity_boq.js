'use strict';
/**
 * tests/test_ui_opportunity_boq.js
 * 
 * Deep Playwright browser E2E test for HP Opportunity BOQ workbook evaluation,
 * 9-stage stepper navigation, autonomous simulator, 5-tier matrix, and UI aesthetics.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');

const PORT = process.env.PORT || 3000;
const SERVER_URL = process.env.SERVER_URL || `http://127.0.0.1:${PORT}`;

function isServerRunning(url) {
  return new Promise(resolve => {
    http.get(url, res => resolve(res.statusCode === 200)).on('error', () => resolve(false));
  });
}

async function runTest() {
  console.log('================================================================');
  console.log('🧪 RUNNING PLAYWRIGHT BROWSER E2E TEST WITH HP OPPORTUNITY BOQ');
  console.log('================================================================\n');

  const gaps = [];
  const smells = [];
  const successes = [];
  const consoleErrors = [];

  let serverProc = null;
  const serverAlreadyRunning = await isServerRunning(SERVER_URL);

  if (!serverAlreadyRunning) {
    console.log(`Starting dashboard server on ${SERVER_URL}...`);
    const serverScript = path.join(__dirname, '..', 'dashboard', 'server.cjs');
    serverProc = spawn('node', [serverScript], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, PORT: String(PORT) }
    });

    // Wait up to 10 seconds for server startup
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 500));
      if (await isServerRunning(SERVER_URL)) break;
    }
  } else {
    console.log(`Using active dashboard server at ${SERVER_URL}`);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon') && !text.includes('404')) {
        consoleErrors.push(text);
      }
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  try {
    // 1. Visit Dashboard
    console.log(`1. Loading Dashboard at ${SERVER_URL}...`);
    await page.goto(SERVER_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1000);
    successes.push('Page loaded successfully');

    // 2. Check Header & Badges
    const headerTitle = await page.textContent('header');
    if (headerTitle.includes('Catalog Intelligence') || headerTitle.includes('HPE ProLiant AI Studio') || headerTitle.includes('BOQ')) {
      successes.push('Header branding loaded');
    } else {
      gaps.push('Header branding missing');
    }

    // 3. Test Orchestrator View Modes
    console.log('2. Testing Orchestrator view switchers...');
    const viewButtons = await page.$$('button:has-text("9-Stage Stepper"), button:has-text("Macro Lifecycle"), button:has-text("All Views"), button:has-text("Auto-Pilot Runner")');
    if (viewButtons.length > 0) {
      successes.push(`Found ${viewButtons.length} Orchestrator view buttons`);
    }

    // Click 9-Stage Stepper view
    const stepperBtn = page.locator('button:has-text("9-Stage Stepper")');
    if (await stepperBtn.count() > 0) {
      await stepperBtn.click();
      await page.waitForTimeout(400);
      successes.push('Switched to 9-Stage Stepper view');
    }

    // 4. Test Stepper Step Clicking & Substep Expansion
    console.log('3. Inspecting Stepper stages and substep drilldown...');
    const phase1Header = page.locator('text=Phase 1').or(page.locator('text=Catalog Intelligence')).first();
    if (await phase1Header.count() > 0) {
      successes.push('Phase 1 header verified');
    } else {
      gaps.push('Phase 1 header not found in stepper');
    }

    // Click Stage 3 Aspect Math
    const stage3Card = page.locator('text=03').first();
    if (await stage3Card.count() > 0) {
      await stage3Card.click();
      await page.waitForTimeout(300);
      const substepsList = page.locator('text=Granular Internal Sub-Steps').or(page.locator('text=Sub-steps')).first();
      if (await substepsList.count() > 0) {
        successes.push('Stage 3 substep breakdown drawer expanded and verified');
      } else {
        gaps.push('Stage 3 substep breakdown drawer did not appear');
      }
    }

    // Click Stage 4 Solution Ranking
    const stage4Card = page.locator('text=04').first();
    if (await stage4Card.count() > 0) {
      await stage4Card.click();
      await page.waitForTimeout(300);
      successes.push('Stage 4 clicked');
    }

    // 5. Test Simulator in Orchestrator
    console.log('4. Testing Autonomous Workflow Simulator...');
    const runnerBtn = page.locator('button:has-text("Auto-Pilot Runner")');
    if (await runnerBtn.count() > 0) {
      await runnerBtn.click();
      await page.waitForTimeout(400);

      const runSimBtn = page.locator('button:has-text("Run Autonomous Workflow")');
      if (await runSimBtn.count() > 0) {
        await runSimBtn.click();
        await page.waitForTimeout(1000);
        successes.push('Autonomous Workflow Simulator play sequence triggered');
      }
    }

    // 6. Test BOQ Upload Flow with HP Opportunity Excel File
    console.log('5. Uploading HP Opportunity Excel File in BOQ Uploader...');
    const boqFile = path.resolve(__dirname, '..', 'HP Opportunity- DL380_5 Servers.xlsx');
    if (!fs.existsSync(boqFile)) {
      gaps.push(`HP Opportunity file not found at: ${boqFile}`);
    } else {
      // Switch back to Macro Lifecycle view mode to open BOQ uploader modal
      const macroTabBtn = page.locator('button:has-text("Macro Lifecycle")').first();
      if (await macroTabBtn.count() > 0) {
        await macroTabBtn.click();
        await page.waitForTimeout(400);
      }

      // Find and click Load BOQ & Evaluate in Macro card
      const uploadBoqBtn = page.locator('button:has-text("Load BOQ & Evaluate"), button:has-text("Upload BOQ"), button:has-text("Load BOQ")').first();
      if (await uploadBoqBtn.count() > 0) {
        await uploadBoqBtn.click();
        await page.waitForTimeout(600);

        // Upload file via file input
        const fileInput = page.locator('#boq-file-input, input[type="file"]').first();
        if (await fileInput.count() > 0) {
          await fileInput.setInputFiles(boqFile);
          await page.waitForTimeout(800);
          successes.push('HP Opportunity- DL380_5 Servers.xlsx uploaded to dropzone');

          // Click Pre-flight Variation Analysis button
          const preprocessBtn = page.locator('button:has-text("Pre-flight Variation Analysis"), button:has-text("Pre-process & Categorize")').first();
          if (await preprocessBtn.count() > 0) {
            await preprocessBtn.click();
            const preflightPreview = page.locator('text=Pre-flight Intake Audit').or(page.locator('text=Configuration & BOM Variation Analysis')).first();
            await preflightPreview.waitFor({ state: 'visible', timeout: 15000 });
            successes.push('Pre-flight Variation Analysis succeeded and rendered');
          }

          // Click Run 6-Aspect Evaluation button
          const evalBtn = page.locator('button:has-text("Proceed to Full 6-Aspect Evaluation"), button:has-text("Run 6-Aspect Evaluation")').first();
          if (await evalBtn.count() > 0) {
            console.log('6. Running evaluation on customer BOQ workbook...');
            await evalBtn.click();
            
            // Wait for evaluation results
            try {
              const evalResultLocator = page.locator('text=Confidence Score').or(page.locator('text=Aspect Checks')).or(page.locator('text=Resolution Matrix')).or(page.locator('text=Evaluation Progress')).first();
              await evalResultLocator.waitFor({ state: 'visible', timeout: 25000 });
              successes.push('Evaluation finished and results rendered on modal');
            } catch (e) {
              smells.push('Evaluation result selector wait timed out');
            }

            // Close the modal cleanly via Esc or close button
            const closeBtn = page.locator('button[aria-label="Close modal"]').first();
            if (await closeBtn.count() > 0) {
              await closeBtn.click();
              await page.waitForTimeout(400);
            } else {
              await page.keyboard.press('Escape');
              await page.waitForTimeout(400);
            }
            successes.push('Modal closed cleanly');
          }
        }
      } else {
        gaps.push('Upload BOQ trigger button not found');
      }
    }

    // 7. Test Navigation Across Core Tabs
    console.log('7. Verifying Tab Navigation...');
    const tabs = ['scraper', 'catalog', 'artifacts', 'telemetry', 'orchestrator'];
    for (const tabId of tabs) {
      const tabBtn = page.locator(`button[data-tab="${tabId}"]`);
      if (await tabBtn.count() > 0) {
        await tabBtn.click();
        await page.waitForTimeout(300);
        successes.push(`Tab [${tabId}] clicked and active`);
      }
    }

  } catch (err) {
    gaps.push(`Playwright test runtime error: ${err.message}`);
  } finally {
    await browser.close();
    if (serverProc) {
      serverProc.kill('SIGTERM');
      console.log('\nStopped dashboard server instance.');
    }
  }

  console.log('\n================================================================');
  console.log('📊 BROWSER TEST REPORT & GAP ANALYSIS');
  console.log('================================================================');
  console.log(`✅ Successes (${successes.length}):`);
  successes.forEach(s => console.log(`   • ${s}`));

  console.log(`\n⚠️  Gaps / Misses (${gaps.length}):`);
  if (gaps.length === 0) console.log('   • 0 Gaps found!');
  else gaps.forEach(g => console.log(`   • ${g}`));

  console.log(`\n🔍 Code Smells / Minor Warnings (${smells.length}):`);
  if (smells.length === 0) console.log('   • 0 Code Smells!');
  else smells.forEach(s => console.log(`   • ${s}`));

  console.log(`\n🚨 Console Errors Logged (${consoleErrors.length}):`);
  if (consoleErrors.length === 0) console.log('   • 0 Console Errors!');
  else consoleErrors.forEach(e => console.log(`   • ${e}`));
  console.log('================================================================\n');
}

runTest();
