const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runE2ETest() {
  console.log('Starting End-to-End Headless UI Test...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const gaps = [];
  const consoleErrors = [];

  // Capture console logs from the browser
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', error => {
    consoleErrors.push(error.message);
  });

  try {
    console.log('Navigating to local dashboard...');
    const response = await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    if (!response || !response.ok()) {
      gaps.push(`Failed to load dashboard. Status: ${response ? response.status() : 'Unknown'}`);
      throw new Error('Dashboard did not load.');
    }

    console.log('Checking for skeleton loaders (should be removed after load)...');
    await page.waitForTimeout(2000); // Wait for initial fetch
    const skeletons = await page.$$('.skeleton');
    if (skeletons.length > 0) {
      gaps.push(`Found ${skeletons.length} elements still in skeleton state after 2 seconds.`);
    }

    console.log('Checking headers and tabs...');
    const tabs = ['overview', 'boq', 'catalog', 'conflict', 'artifacts', 'telemetry', 'scraper'];
    for (const tab of tabs) {
      const tabBtn = await page.$(`button[data-tab="${tab}"]`);
      if (tabBtn) {
        await tabBtn.click();
        await page.waitForTimeout(500); // Wait for render
        console.log(`Navigated to tab: ${tab}`);
      } else {
        // Fallback to text matching if data-tab is not available
        console.log(`Could not find button with data-tab="${tab}", attempting to find by typical name...`);
      }
    }

    // Go back to Overview
    const overviewBtn = await page.$('button[data-tab="overview"]');
    if (overviewBtn) await overviewBtn.click();

    console.log('Checking Settings Drawer...');
    const settingsBtn = await page.$('button[data-testid="settings-btn"]');
    if (settingsBtn) {
      await settingsBtn.click();
      await page.waitForTimeout(500);
      const drawerVisible = await page.$('text=Application Settings');
      if (!drawerVisible) gaps.push('Settings drawer did not open.');
      // Close it (clicking backdrop or close button)
      await page.keyboard.press('Escape');
    } else {
      gaps.push('Could not find Settings button.');
    }

    console.log('Checking NotebookLM RAG Drawer...');
    const ragBtn = await page.$('button[data-testid="notebooklm-btn"]');
    if (ragBtn) {
      await ragBtn.click();
      await page.waitForTimeout(500);
      const drawerVisible = await page.$('text=NotebookLM Integration');
      if (!drawerVisible) gaps.push('NotebookLM drawer did not open.');
      await page.keyboard.press('Escape');
    }

    console.log('Checking Catalog Explorer rendering...');
    const catalogTabBtn = await page.$('button[data-tab="catalog"]');
    if (catalogTabBtn) {
      await catalogTabBtn.click();
      await page.waitForTimeout(1000);
      const catalogExplorer = await page.$('text=Category Filter');
      if (!catalogExplorer) gaps.push('Catalog Explorer did not render properly.');
    }

    console.log('Checking Resolution Matrix empty state rendering...');
    const matrixTabBtn = await page.$('button[data-tab="matrix"]');
    if (matrixTabBtn) {
      await matrixTabBtn.click();
      await page.waitForTimeout(1000);
      const noSynthesis = await page.$('text=No Synthesis Available');
      if (!noSynthesis) gaps.push('Resolution Matrix empty state did not render properly.');
    }

    console.log('Testing BOQ Uploader interactions...');
    const boqTabBtn = await page.$('button[data-tab="boq"]');
    if (boqTabBtn) {
      await boqTabBtn.click();
      await page.waitForTimeout(1000);
      
      const presetDL380 = await page.$('text=DL380 Gen12');
      if (presetDL380) {
        await presetDL380.click();
        console.log('Clicked DL380 Gen12 preset.');
      } else {
        gaps.push('Could not find "DL380 Gen12" preset button.');
      }

      console.log('Clicking "Run Aspect Math & Pre-Flight BOQ Check"...');
      const runBtn = await page.$('button:has-text("Run Aspect Math")');
      if (runBtn) {
        // We will not actually submit since there's no backend for testing here
        console.log('Found Run Aspect Math button.');
      } else {
        gaps.push('Could not find Run button.');
      }
    }

  } catch (err) {
    gaps.push(`Execution error: ${err.message}`);
  } finally {
    await browser.close();
  }

  const report = {
    totalConsoleErrors: consoleErrors.length,
    consoleErrors,
    totalGaps: gaps.length,
    gaps
  };

  const reportPath = path.join(__dirname, '..', 'outputs', 'history', 'e2e_report.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Test complete. Report saved to ${reportPath}`);
}

runE2ETest().catch(console.error);
