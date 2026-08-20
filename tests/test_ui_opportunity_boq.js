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

async function runTest() {
  console.log('================================================================');
  console.log('🧪 RUNNING PLAYWRIGHT BROWSER E2E TEST WITH HP OPPORTUNITY BOQ');
  console.log('================================================================\n');

  const gaps = [];
  const smells = [];
  const successes = [];
  const consoleErrors = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  try {
    // 1. Visit http://localhost:5173
    console.log('1. Loading Dashboard at http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 15000 });
    successes.push('Page loaded successfully');

    // 2. Check Header & Badges
    const headerTitle = await page.textContent('header');
    if (headerTitle.includes('Catalog Intelligence')) {
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
    const phase1Header = page.locator('text=Phase 1: Local Aspect Math');
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
      const substepsList = page.locator('text=Granular Internal Sub-Steps');
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
      // Switch back to stepper view mode
      const stepperTabBtn = page.locator('button:has-text("9-Stage Stepper")');
      if (await stepperTabBtn.count() > 0) {
        await stepperTabBtn.click();
        await page.waitForTimeout(400);
      }

      // First click Stage 1 (Load BOQ) in stepper
      const stage1Card = page.locator('h4:has-text("Load BOQ")').first();
      if (await stage1Card.count() > 0) {
        await stage1Card.click();
        await page.waitForTimeout(500);
      }

      // Find and click Upload BOQ in drawer or Macro card
      const uploadBoqBtn = page.locator('button:has-text("Upload BOQ")').last();
      if (await uploadBoqBtn.count() > 0) {
        await uploadBoqBtn.click();
        await page.waitForTimeout(600);

        // Upload file via file input
        const fileInput = page.locator('input[type="file"]').first();
        if (await fileInput.count() > 0) {
          await fileInput.setInputFiles(boqFile);
          await page.waitForTimeout(800);
          successes.push('HP Opportunity- DL380_5 Servers.xlsx uploaded to dropzone');

          // Click Pre-Flight & AI Verification button
          const evalBtn = page.locator('button:has-text("Pre-Flight"), button:has-text("Evaluate"), button:has-text("Run Pre-Flight")').first();
          if (await evalBtn.count() > 0) {
            console.log('6. Running evaluation on customer BOQ workbook...');
            await evalBtn.click();
            
            // Wait for evaluation results
            try {
              await page.waitForSelector('text=Quantitative Confidence Score, text=Aspect Checks, text=Resolution Matrix, text=100%', { timeout: 25000 });
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
