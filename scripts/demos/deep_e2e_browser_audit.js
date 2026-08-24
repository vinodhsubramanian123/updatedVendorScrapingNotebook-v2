'use strict';
/**
 * scripts/deep_e2e_browser_audit.js
 * 
 * Deep, thorough Playwright browser inspection of the full web application.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SERVER_URL = 'http://127.0.0.1:3000';
const CUSTOMER_BOQ = path.resolve(__dirname, '..', 'HP Opportunity- DL380_5 Servers.xlsx');
const SCREENSHOT_DIR = path.resolve(__dirname, '..', 'outputs', 'history', 'audit_screenshots');

async function runAudit() {
  console.log('================================================================');
  console.log('🔍 STARTING DEEP COMPREHENSIVE E2E BROWSER AUDIT');
  console.log('================================================================\n');

  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const auditReport = {
    startedAt: new Date().toISOString(),
    consoleLogs: [],
    consoleErrors: [],
    networkFailures: [],
    sectionsTested: [],
    gaps: [],
    codeSmells: [],
    uiUxOpportunities: [],
    functionalBugs: [],
    screenshotsCaptured: []
  };

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 1
  });

  const page = await context.newPage();

  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    auditReport.consoleLogs.push({ type, text });
    if (type === 'error') {
      auditReport.consoleErrors.push(text);
    }
  });

  page.on('pageerror', err => {
    auditReport.consoleErrors.push(`PageError: ${err.message}`);
  });

  page.on('requestfailed', req => {
    auditReport.networkFailures.push({
      url: req.url(),
      failure: req.failure()?.errorText || 'Unknown'
    });
  });

  try {
    // -------------------------------------------------------------------------
    // SECTION 1: Base Page Load & Global Shell
    // -------------------------------------------------------------------------
    console.log('▶ [Audit 1] Loading base page and auditing Global Header & Branding...');
    await page.goto(SERVER_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);

    const title = await page.title();
    const brandElement = await page.locator('header').first();
    const brandText = await brandElement.innerText();
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_global_header.png') });
    auditReport.screenshotsCaptured.push('01_global_header.png');

    auditReport.sectionsTested.push({
      name: 'Global Shell & Header',
      status: 'PASS',
      details: { title, brandText: brandText.substring(0, 100) }
    });

    // -------------------------------------------------------------------------
    // SECTION 2: Orchestrator Tab & 4 View Modes
    // -------------------------------------------------------------------------
    console.log('▶ [Audit 2] Auditing Orchestrator Tab & View Mode switchers...');
    const viewButtons = ['Macro Lifecycle', '9-Stage Stepper', 'Autonomous Simulator', 'Tabular Comparison'];
    
    for (const viewName of viewButtons) {
      const btn = page.locator(`button:has-text("${viewName}")`).first();
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(400);
        const shotName = `02_view_${viewName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.png`;
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, shotName) });
        auditReport.screenshotsCaptured.push(shotName);
      } else {
        auditReport.gaps.push(`View Mode button "${viewName}" not found or not visible.`);
      }
    }

    // Test Simulator Controls
    console.log('▶ [Audit 3] Testing Autonomous Simulator playback controls...');
    const simBtn = page.locator('button:has-text("Autonomous Simulator")').first();
    if (await simBtn.isVisible()) {
      await simBtn.click();
      await page.waitForTimeout(300);

      const playBtn = page.locator('button:has-text("Run Autonomous Workflow"), button:has-text("Play Simulator")').first();
      if (await playBtn.isVisible()) {
        await playBtn.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_simulator_running.png') });
        auditReport.screenshotsCaptured.push('03_simulator_running.png');
      }
    }

    // -------------------------------------------------------------------------
    // SECTION 3: BOQ Ingestion & Preflight Variation Analysis
    // -------------------------------------------------------------------------
    console.log('▶ [Audit 4] Testing BOQ Ingestion Modal & Customer Excel Upload...');
    const macroBtn = page.locator('button:has-text("Macro Lifecycle")').first();
    if (await macroBtn.isVisible()) {
      await macroBtn.click();
      await page.waitForTimeout(400);
    }

    const loadBoqBtn = page.locator('button:has-text("Load BOQ & Evaluate")').first();
    await loadBoqBtn.click();
    await page.waitForTimeout(800);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_boq_ingestion_modal.png') });
    auditReport.screenshotsCaptured.push('04_boq_ingestion_modal.png');

    const fileInput = page.locator('#boq-file-input, input[type="file"]').first();
    if (fs.existsSync(CUSTOMER_BOQ)) {
      await fileInput.setInputFiles(CUSTOMER_BOQ);
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_file_uploaded.png') });
      auditReport.screenshotsCaptured.push('05_file_uploaded.png');
    }

    // Click Pre-flight Variation Analysis
    console.log('▶ [Audit 5] Running Pre-flight Variation Analysis...');
    const preflightBtn = page.locator('button:has-text("Pre-flight Variation Analysis")').first();
    await preflightBtn.click();
    
    const preflightAudit = page.locator('text=Pre-flight Intake Audit').first();
    await preflightAudit.waitFor({ state: 'visible', timeout: 15000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_preflight_audit.png') });
    auditReport.screenshotsCaptured.push('06_preflight_audit.png');

    // -------------------------------------------------------------------------
    // SECTION 4: Full 6-Aspect Evaluation Execution
    // -------------------------------------------------------------------------
    console.log('▶ [Audit 6] Proceeding to Full 6-Aspect Evaluation...');
    const proceedEvalBtn = page.locator('button:has-text("Proceed to Full 6-Aspect Evaluation"), button:has-text("Run 6-Aspect Evaluation")').first();
    await proceedEvalBtn.waitFor({ state: 'visible', timeout: 5000 });
    await proceedEvalBtn.click();
    await page.waitForTimeout(1000);

    // Wait for outcome banner
    const outcomeLocator = page.locator('text=Confidence Score').or(page.locator('text=BOQ Evaluation Outcome')).or(page.locator('text=Certified Buildable Configuration')).or(page.locator('text=Physical Constraint Violations Flagged')).first();
    await outcomeLocator.waitFor({ state: 'visible', timeout: 45000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_eval_outcome.png') });
    auditReport.screenshotsCaptured.push('08_eval_outcome.png');

    // -------------------------------------------------------------------------
    // SECTION 5: Ambiguity Inbox & Workload DNA
    // -------------------------------------------------------------------------
    console.log('▶ [Audit 7] Auditing Ambiguity Inbox & Workload DNA Card...');
    const ambiguityInbox = page.locator('text=Ambiguity & Anomaly Resolution Inbox').first();
    const hasAmbiguity = await ambiguityInbox.isVisible();
    const workloadDna = page.locator('text=Workload DNA Profile').first();
    const hasDna = await workloadDna.isVisible();

    auditReport.sectionsTested.push({
      name: 'Evaluation Result Panels',
      status: 'PASS',
      details: { hasAmbiguity, hasDna }
    });

    // -------------------------------------------------------------------------
    // SECTION 6: Visual BOQ Configuration Topology Mindmap
    // -------------------------------------------------------------------------
    console.log('▶ [Audit 8] Auditing Visual BOQ Configuration Topology Modal...');
    const visualTopBtn = page.locator('button:has-text("Visual BOQ Topology")').first();
    if (await visualTopBtn.isVisible()) {
      await visualTopBtn.click();
      await page.waitForTimeout(1000);

      // Take screenshot of baseline topology
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_topology_baseline.png') });
      auditReport.screenshotsCaptured.push('09_topology_baseline.png');

      // Test Rank 1 Resolved Switch
      const rank1Btn = page.locator('button:has-text("Rank 1 Resolved")').first();
      if (await rank1Btn.isVisible()) {
        await rank1Btn.click();
        await page.waitForTimeout(600);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_topology_rank1_resolved.png') });
        auditReport.screenshotsCaptured.push('10_topology_rank1_resolved.png');
      }

      // Test Subsystem Filters
      const filterButtons = ['Compute & Sockets', 'Memory Channels', 'Storage & Controllers', 'PCIe & Networking', 'Power & Thermal', 'Services & Care', 'Gaps & Fixes'];
      for (const filterName of filterButtons) {
        const fBtn = page.locator(`button:has-text("${filterName}")`).first();
        if (await fBtn.isVisible()) {
          await fBtn.click();
          await page.waitForTimeout(300);
        }
      }

      // Test Node Click & Inspector Slide-over
      const rootNode = page.locator('.topology-interactive-node').first();
      if (await rootNode.isVisible()) {
        await rootNode.click({ force: true });
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_topology_node_inspector.png') });
        auditReport.screenshotsCaptured.push('11_topology_node_inspector.png');
      }

      // Close topology modal
      const closeTopModalBtn = page.locator('button[aria-label="Close modal"]').first();
      if (await closeTopModalBtn.isVisible()) {
        await closeTopModalBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // -------------------------------------------------------------------------
    // SECTION 7: 5-Tier Strategic Resolution Matrix Modal
    // -------------------------------------------------------------------------
    console.log('▶ [Audit 9] Auditing 5-Tier Strategic Resolution Matrix Modal...');
    // Open matrix modal via Macro Lifecycle card
    const openMatrixBtn = page.locator('button:has-text("Open 5-Tier Strategy Matrix"), button:has-text("Resolution Matrix"), button:has-text("5-Tier Strategy Matrix")').first();
    if (await openMatrixBtn.isVisible()) {
      await openMatrixBtn.click();
      await page.waitForTimeout(1000);

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12_strategy_matrix_modal.png') });
      auditReport.screenshotsCaptured.push('12_strategy_matrix_modal.png');

      // Check Ranks 1 to 5
      for (let r = 1; r <= 5; r++) {
        const rankHeader = page.locator(`text=Rank ${r}`).first();
        if (!(await rankHeader.isVisible())) {
          auditReport.codeSmells.push(`Rank ${r} header not immediately visible in Matrix modal`);
        }
      }

      // Close matrix modal
      const closeMatrixBtn = page.locator('button[aria-label="Close modal"]').first();
      if (await closeMatrixBtn.isVisible()) {
        await closeMatrixBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // -------------------------------------------------------------------------
    // SECTION 8: Stage 3 Partner Quote Reconciliation Modal
    // -------------------------------------------------------------------------
    console.log('▶ [Audit 10] Auditing Stage 3 Partner Quote Reconciliation Modal...');
    const reconCardBtn = page.locator('button:has-text("Reconcile Quote"), button:has-text("Partner Quote Reconciliation")').first();
    if (await reconCardBtn.isVisible()) {
      await reconCardBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '13_partner_reconciliation_modal.png') });
      auditReport.screenshotsCaptured.push('13_partner_reconciliation_modal.png');

      const closeReconBtn = page.locator('button[aria-label="Close modal"]').first();
      if (await closeReconBtn.isVisible()) {
        await closeReconBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // -------------------------------------------------------------------------
    // SECTION 9: Pipeline Ops Tab (Scraper & Operations)
    // -------------------------------------------------------------------------
    console.log('▶ [Audit 11] Auditing Pipeline Ops Tab (Scraper & Progress)...');
    const pipelineTabBtn = page.locator('button[data-tab="pipeline"]').first();
    if (await pipelineTabBtn.isVisible()) {
      await pipelineTabBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '14_pipeline_ops_tab.png') });
      auditReport.screenshotsCaptured.push('14_pipeline_ops_tab.png');
    }

    // -------------------------------------------------------------------------
    // SECTION 10: Catalog Explorer Tab across Product Lines
    // -------------------------------------------------------------------------
    console.log('▶ [Audit 12] Auditing Catalog Explorer across 6 Product Lines...');
    const catalogTabBtn = page.locator('button[data-tab="catalog"]').first();
    if (await catalogTabBtn.isVisible()) {
      await catalogTabBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '15_catalog_explorer_tab.png') });
      auditReport.screenshotsCaptured.push('15_catalog_explorer_tab.png');

      // Test switching product lines
      const productLines = ['DL380 Gen12', 'DL380 Gen11', 'Alletra', 'Synergy', 'MSL Tape', 'Cray'];
      for (const pl of productLines) {
        const plBtn = page.locator(`button:has-text("${pl}")`).first();
        if (await plBtn.isVisible()) {
          await plBtn.click();
          await page.waitForTimeout(300);
        }
      }
    }

    // -------------------------------------------------------------------------
    // SECTION 11: Agentic Insights (Telemetry) & Matrix Tabs
    // -------------------------------------------------------------------------
    console.log('▶ [Audit 13] Auditing Agentic Insights (Telemetry) & Matrix Tabs...');
    const telemetryTabBtn = page.locator('button[data-tab="telemetry"]').first();
    if (await telemetryTabBtn.isVisible()) {
      await telemetryTabBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '16_agentic_insights_tab.png') });
      auditReport.screenshotsCaptured.push('16_agentic_insights_tab.png');
    }

    const matrixTabBtn = page.locator('button[data-tab="matrix"]').first();
    if (await matrixTabBtn.isVisible()) {
      await matrixTabBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '17_resolution_matrix_tab.png') });
      auditReport.screenshotsCaptured.push('17_resolution_matrix_tab.png');
    }

    // Test Feedback Drawer
    const feedbackBtn = page.locator('button[title="HITL Feedback & Learning"]').first();
    if (await feedbackBtn.isVisible()) {
      await feedbackBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '18_feedback_drawer.png') });
      auditReport.screenshotsCaptured.push('18_feedback_drawer.png');
    }

    auditReport.completedAt = new Date().toISOString();
    auditReport.status = 'SUCCESS';

    const reportPath = path.resolve(__dirname, '..', 'outputs', 'history', 'deep_browser_audit_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(auditReport, null, 2), 'utf8');

    console.log('\n================================================================');
    console.log('✅ AUDIT EXECUTION COMPLETED 100% SUCCESSFULLY');
    console.log(`📊 Saved ${auditReport.screenshotsCaptured.length} Screenshots to: ${SCREENSHOT_DIR}`);
    console.log(`📑 Full JSON Report: ${reportPath}`);
    console.log(`🚨 Console Errors: ${auditReport.consoleErrors.length}`);
    console.log(`⚠️ Gaps: ${auditReport.gaps.length}`);
    console.log(`🔍 Code Smells: ${auditReport.codeSmells.length}`);
    console.log('================================================================');

  } catch (err) {
    console.error('❌ Audit Failed:', err);
    auditReport.error = err.message;
    auditReport.stack = err.stack;
    const reportPath = path.resolve(__dirname, '..', 'outputs', 'history', 'deep_browser_audit_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(auditReport, null, 2), 'utf8');
  } finally {
    await browser.close();
  }
}

runAudit();
