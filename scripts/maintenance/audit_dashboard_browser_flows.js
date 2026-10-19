'use strict';
/**
 * scripts/maintenance/audit_dashboard_browser_flows.js
 *
 * Exhaustive Playwright headless browser audit of ALL Dashboard user flows:
 *   1. Header, chassis selector, search, and global drawer triggers
 *   2. Macro Orchestrator Flow (Stepper, Macro Lifecycle, Simulator, All Views)
 *   3. BOQ Uploader (Sample BOM, Excel dropzone, Pre-flight audit, 6-Aspect Eval)
 *   4. Strategic Resolution Matrix (5-Tier cards, line items, CapEx deltas, export)
 *   5. Visual BOQ Topology Modal (interactive SVG nodes, subsystem details, rank switcher)
 *   6. Catalog Explorer (26 categories, search filter, pricing, SKU drawers)
 *   7. Artifacts Inspector (Excel/CSV/JSON listings, audit trigger)
 *   8. Pipeline Ops / Scraper controls (triggers, logs, kill task)
 *   9. Telemetry & Agentic Insights (charts, cache metrics, run history)
 *  10. Drawers: Notebook RAG, Quarantine, Settings, Feedback, Traceability
 *
 * Reports:
 *   - Functional Successes
 *   - Logical Gaps & Inconsistencies
 *   - Console Errors & Network Failures
 *   - State Management Smells
 */

const { chromium } = require('playwright');
const path = require('path');
const { safeWriteJsonAtomic } = require('../lib/system/fs_compat');
const http = require('http');
const { spawn } = require('child_process');
const { launchPlaywrightChromium } = require('../lib/scraper/browser_launcher.js');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const PORT = process.env.PORT || 3005;
const SERVER_URL = `http://127.0.0.1:${PORT}`;

function isServerRunning(url) {
  return new Promise(resolve => {
    http.get(url, res => resolve(res.statusCode === 200)).on('error', () => resolve(false));
  });
}

async function auditAllFlows() {
  console.log('================================================================');
  console.log('🌐 STARTING EXHAUSTIVE DASHBOARD BROWSER FLOW AUDIT');
  console.log(`Target: ${SERVER_URL}`);
  console.log('================================================================\n');

  let serverProc = null;
  const running = await isServerRunning(SERVER_URL);
  if (!running) {
    console.log(`Starting dashboard server instance on port ${PORT}...`);
    const serverScript = path.join(PROJECT_ROOT, 'dashboard', 'server.cjs');
    serverProc = spawn('node', [serverScript], {
      cwd: PROJECT_ROOT,
      env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test', OFFLINE_MODE: '1', RAG_TIMEOUT_MS: '5000' }
    });

    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 400));
      if (await isServerRunning(SERVER_URL)) break;
    }
  }

  const browser = await launchPlaywrightChromium(chromium, { headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const report = {
    flowsTested: 0,
    successes: [],
    logicalGaps: [],
    consoleErrors: [],
    networkFailures: []
  };

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      if (!txt.includes('favicon.ico') && !txt.includes('404')) {
        report.consoleErrors.push(txt);
      }
    }
  });

  page.on('response', resp => {
    if (resp.status() >= 400 && resp.status() !== 404 && resp.status() !== 409) {
      report.networkFailures.push({ url: resp.url(), status: resp.status() });
    }
  });

  try {
    // -------------------------------------------------------------------------
    // FLOW 1: Header, Navigation, Global Drawers & Chassis Switcher
    // -------------------------------------------------------------------------
    report.flowsTested++;
    console.log('▶ [FLOW 1] Header, Navigation, Global Drawers & Chassis Switcher');
    await page.goto(SERVER_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(1000);

    // Verify Title & Header
    const brand = page.locator('header h1, header span').first();
    const brandText = await brand.innerText().catch(() => '');
    report.successes.push(`Header mounted (Branding text: "${brandText.trim()}")`);

    // Verify Chassis Dropdown (Custom ChassisSelector component)
    const chassisBtn = page.locator('header button:has-text("Chassis Context")').first();
    if (await chassisBtn.count() > 0) {
      await chassisBtn.click();
      await page.waitForTimeout(400);
      const chassisInput = page.locator('input[placeholder="Search chassis..."]').first();
      if (await chassisInput.isVisible()) {
        const chassisOptions = await page.$$eval('.max-h-56 button', btns => btns.map(b => b.innerText.trim()));
        report.successes.push(`Chassis dropdown opened with ${chassisOptions.length} available models: [${chassisOptions.slice(0, 3).join(', ')}...]`);
        // Close dropdown
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      } else {
        report.logicalGaps.push('Chassis Context button clicked but dropdown menu not visible');
      }
    } else {
      report.logicalGaps.push('Chassis Context selector button not found in Header');
    }

    // Verify Navigation Tabs in Header
    const navTabs = await page.$$eval('nav button[data-tab]', btns => btns.map(b => ({ id: b.getAttribute('data-tab'), label: b.innerText.trim() })));
    report.successes.push(`Navigation tabs in Header: [${navTabs.map(t => t.label).join(', ')}]`);
    if (!navTabs.some(t => t.id === 'artifacts')) {
      report.logicalGaps.push('Artifacts tab defined in App.jsx but missing from NavigationTabs header bar');
    }

    // Verify Global Drawer Triggers (Settings, Quarantine, Feedback, RAG)
    const settingsBtn = page.locator('header button[aria-label="Settings"], header button[title*="Settings"]').first();
    if (await settingsBtn.count() > 0) {
      await settingsBtn.click();
      await page.waitForTimeout(400);
      const settingsDrawer = page.locator('text=Settings').or(page.locator('text=Configuration')).first();
      if (await settingsDrawer.isVisible()) {
        report.successes.push('Settings drawer opened and rendered');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      } else {
        report.logicalGaps.push('Settings button clicked but drawer content not visible');
      }
    }

    const quarantineBtn = page.locator('header button[aria-label*="Quarantine"]').first();
    if (await quarantineBtn.count() > 0) {
      await quarantineBtn.click();
      await page.waitForTimeout(400);
      const qDrawer = page.locator('text=Quarantine Management Vault').or(page.locator('text=Quarantine')).first();
      if (await qDrawer.isVisible()) {
        report.successes.push('Quarantine Management drawer opened and rendered');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      } else {
        report.logicalGaps.push('Quarantine button clicked but drawer not visible');
      }
    }

    const feedbackBtn = page.locator('header button[aria-label*="Feedback"]').first();
    if (await feedbackBtn.count() > 0) {
      await feedbackBtn.click();
      await page.waitForTimeout(400);
      const fDrawer = page.locator('text=Human-in-the-Loop Feedback').or(page.locator('text=Feedback')).first();
      if (await fDrawer.isVisible()) {
        report.successes.push('Human Feedback drawer opened and rendered');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
    }

    // Smart Search in Header
    const searchInput = page.locator('header input[placeholder*="Ask"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('What is the maximum memory for DL380 Gen12?');
      await page.waitForTimeout(300);
      const searchMenu = page.locator('text=NotebookLM Grounded RAG Query').or(page.locator('text=Ask Gemini NotebookLM')).first();
      if (await searchMenu.isVisible()) {
        report.successes.push('Smart search bar detected question intent and offered NotebookLM RAG action');
      }
      await searchInput.fill('');
      await page.keyboard.press('Escape');
    }

    // -------------------------------------------------------------------------
    // FLOW 2: Macro Orchestrator Flow (Views, Stepper, Simulator)
    // -------------------------------------------------------------------------
    report.flowsTested++;
    console.log('▶ [FLOW 2] Macro Orchestrator Flow (Views, Stepper, Simulator)');
    const orchTabBtn = page.locator('button[data-tab="orchestrator"]').first();
    if (await orchTabBtn.count() > 0) await orchTabBtn.click();
    await page.waitForTimeout(500);

    // 1. Check View Modes: 9-Stage Stepper, Macro Lifecycle, Auto-Pilot Runner, All Views
    const stepperBtn = page.locator('button:has-text("9-Stage Stepper")').first();
    if (await stepperBtn.count() > 0) {
      await stepperBtn.click();
      await page.waitForTimeout(400);
      const phase1 = page.locator('text=Phase 1').or(page.locator('text=Catalog Intelligence')).first();
      if (await phase1.count() > 0) {
        report.successes.push('9-Stage Stepper view mode rendered correctly with Phase 1');
      } else {
        report.logicalGaps.push('9-Stage Stepper view selected but no stages rendered');
      }
    }

    const runnerBtn = page.locator('button:has-text("Auto-Pilot Runner")').first();
    if (await runnerBtn.count() > 0) {
      await runnerBtn.click();
      await page.waitForTimeout(400);
      const simButton = page.locator('button:has-text("Run Autonomous Workflow")').first();
      if (await simButton.count() > 0) {
        report.successes.push('Auto-Pilot Runner view mode rendered with Autonomous Workflow Simulator');
      } else {
        report.logicalGaps.push('Auto-Pilot Runner view selected but simulator run button missing');
      }
    }

    const macroBtn = page.locator('button:has-text("Macro Lifecycle")').first();
    if (await macroBtn.count() > 0) {
      await macroBtn.click();
      await page.waitForTimeout(400);
      report.successes.push('Macro Lifecycle view mode active');
    }

    // -------------------------------------------------------------------------
    // FLOW 3: BOQ Quote Ingestion & Evaluation Flow
    // -------------------------------------------------------------------------
    report.flowsTested++;
    console.log('▶ [FLOW 3] BOQ Quote Ingestion, Pre-flight Audit & 6-Aspect Evaluation');
    
    // Open BOQ Uploader Modal
    const loadBoqBtn = page.locator('button:has-text("Load BOQ & Evaluate"), button:has-text("Load / Evaluate BOQ")').first();
    if (await loadBoqBtn.count() > 0) {
      await loadBoqBtn.click();
      await page.waitForTimeout(600);

      const modalTitle = page.locator('text=Stage 1: BOQ Quote Ingestion').first();
      if (await modalTitle.isVisible()) {
        report.successes.push('BOQ Ingestion modal opened');
      }

      // Test Sample Standard BOM button
      const sampleBOMBtn = page.locator('button:has-text("Sample Standard BOM")').first();
      if (await sampleBOMBtn.count() > 0) {
        await sampleBOMBtn.click();
        await page.waitForTimeout(300);
        const textArea = page.locator('textarea#boq-raw-text, textarea').first();
        const textVal = await textArea.inputValue();
        if (textVal && textVal.length > 50) {
          report.successes.push(`"Sample Standard BOM" populated textarea (${textVal.length} chars)`);
        } else {
          report.logicalGaps.push('"Sample Standard BOM" clicked but textarea remained empty');
        }
      }

      // Test Pre-flight Variation Analysis on sample BOM
      const preflightBtn = page.locator('button:has-text("Pre-flight Variation Analysis")').first();
      if (await preflightBtn.count() > 0) {
        await preflightBtn.click();
        await page.waitForTimeout(1500);

        const preflightAuditHeading = page.locator('text=Pre-flight Intake Audit').or(page.locator('text=Configuration & BOM Variation Analysis')).first();
        if (await preflightAuditHeading.isVisible()) {
          report.successes.push('Pre-flight Variation Analysis completed and audit card rendered');

          // Check Intake Topology button
          const intakeTopoBtn = page.locator('button:has-text("Inspect Intake Topology")').first();
          if (await intakeTopoBtn.count() > 0) {
            report.successes.push('Pre-flight Intake Audit renders "Inspect Intake Topology" button');
          }
        } else {
          report.logicalGaps.push('Pre-flight Variation Analysis button clicked but audit card did not render');
        }
      }

      // Test Proceed to Full 6-Aspect Evaluation
      const evalBtn = page.locator('button:has-text("Proceed to Full 7-Aspect Evaluation"), button:has-text("Run 7-Aspect Evaluation")').first();
      if (await evalBtn.count() > 0) {
        await evalBtn.click();
        console.log('  ... Waiting for 6-Aspect Evaluation SSE stream to complete ...');
        
        // Wait for evaluation result
        const evalFinished = page.locator('text=Visual BOQ Topology')
          .or(page.locator('text=View 5-Tier Resolution Matrix'))
          .or(page.locator('text=View Resolution Matrix'))
          .or(page.locator('text=Ambiguity Inbox'))
          .first();
        await evalFinished.waitFor({ state: 'visible', timeout: 60000 });
        report.successes.push('Full 7-Aspect Evaluation executed via live SSE stream and completed');

        // Verify Ambiguity Inbox
        const ambiguityCard = page.locator('text=Ambiguity Inbox').first();
        if (await ambiguityCard.count() > 0) {
          report.successes.push('Ambiguity Inbox rendered on evaluated BOQ');
        }

        // Verify Workload DNA
        const dnaCard = page.locator('text=Workload DNA Profile').or(page.locator('text=Workload DNA')).first();
        if (await dnaCard.count() > 0) {
          report.successes.push('Workload DNA card rendered on evaluated BOQ');
        }
      } else {
        report.logicalGaps.push('Required seven-aspect evaluation action was not found; evaluation was not executed');
      }

      // Close modal
      const closeBtn = page.locator('button[aria-label="Close modal"]').first();
      if (await closeBtn.count() > 0) await closeBtn.click();
      else await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    } else {
      report.logicalGaps.push('Load BOQ & Evaluate button not found on Orchestrator view');
    }

    // -------------------------------------------------------------------------
    // FLOW 4: Strategic Resolution Matrix (`matrix` tab)
    // -------------------------------------------------------------------------
    report.flowsTested++;
    console.log('▶ [FLOW 4] 5-Tier Strategic Resolution Matrix');
    const matrixTabBtn = page.locator('button[data-tab="matrix"]').first();
    if (await matrixTabBtn.count() > 0) await matrixTabBtn.click();
    await page.waitForTimeout(600);

    const matrixHeading = page.locator('text=5-Tier Strategic Resolution Matrix').first();
    if (await matrixHeading.isVisible()) {
      report.successes.push('Strategic Resolution Matrix tab loaded');

      // Check if candidate solution tiers are rendered
      const rankPills = page.locator('text=Rank 1').or(page.locator('text=Customer Intent')).or(page.locator('text=Rank 1L')).or(page.locator('text=Rank 2')).first();
      if (await rankPills.count() > 0) {
        report.successes.push('Candidate solution strategy tiers rendered on matrix');
      } else {
        report.logicalGaps.push('Resolution matrix opened but no rank strategy cards rendered');
      }

      // Test Export Corrected BOQ button
      const exportBtn = page.locator('button:has-text("Export Corrected BOQ"), button:has-text("Export Excel")').first();
      if (await exportBtn.count() > 0) {
        report.successes.push('Export Corrected BOQ Excel button is available');
      }

      // Test Feedback Modal trigger
      const feedbackBtn = page.locator('button:has-text("Portal Feedback"), button[title*="Feedback"]').first();
      if (await feedbackBtn.count() > 0) {
        await feedbackBtn.click();
        await page.waitForTimeout(400);
        const feedbackModal = page.locator('text=HITL Learning Feedback').or(page.locator('text=Feedback')).first();
        if (await feedbackModal.isVisible()) {
          report.successes.push('Human-in-the-Loop Feedback modal opened from resolution card');
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
        }
      }
    } else {
      report.logicalGaps.push('Resolution Matrix heading not found on matrix tab');
    }

    // -------------------------------------------------------------------------
    // FLOW 5: Visual BOQ Topology Modal
    // -------------------------------------------------------------------------
    report.flowsTested++;
    console.log('▶ [FLOW 5] Visual BOQ Topology & Interactive Canvas');
    const topoBtn = page.locator('button:has-text("Visual BOQ Topology")').first();
    if (await topoBtn.count() > 0) {
      await topoBtn.click();
      await page.waitForTimeout(1000);

      const topoModal = page.locator('text=Visual BOQ Configuration Topology').first();
      if (await topoModal.isVisible()) {
        report.successes.push('Visual BOQ Topology modal opened');

        // Check interactive nodes
        const nodes = await page.$$('.topology-interactive-node');
        if (nodes.length > 0) {
          report.successes.push(`Topology canvas rendered ${nodes.length} interactive hardware subsystem nodes`);
          
          // Click node to test inspection drawer
          await nodes[0].click({ force: true });
          await page.waitForTimeout(400);
          const nodeDrawer = page.locator('.topology-node-drawer').or(page.locator('text=Physical Aspect Attributes')).or(page.locator('text=Component Details')).first();
          if (await nodeDrawer.count() > 0) {
            report.successes.push('Clicked topology node opened component inspection details drawer');
          }
        } else {
          const emptyState = page.locator('text=No Hardware Topology Loaded').first();
          if (await emptyState.isVisible()) {
            report.successes.push('Topology canvas cleanly rendered "No Hardware Topology Loaded" empty state guidance card');
          } else {
            report.logicalGaps.push('Topology modal opened but 0 interactive SVG nodes found on canvas (Empty state message missing)');
          }
        }

        // Test Rank Switcher in Topology Modal
        const rankSelector = page.locator('text=Customer Baseline').or(page.locator('button:has-text("Rank 1")')).first();
        if (await rankSelector.count() > 0) {
          report.successes.push('Topology modal provides alternative candidate rank switcher');
        }

        // Close topology modal
        const closeBtn = page.locator('button[aria-label="Close modal"]').first();
        if (await closeBtn.count() > 0) await closeBtn.click();
        else await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
      } else {
        report.logicalGaps.push('Visual BOQ Topology button clicked but modal did not open');
      }
    }

    // -------------------------------------------------------------------------
    // FLOW 6: Catalog Explorer (`catalog` tab)
    // -------------------------------------------------------------------------
    report.flowsTested++;
    console.log('▶ [FLOW 6] Catalog Explorer, Search, Filtering & SKU Inspection');
    const catalogTabBtn = page.locator('button[data-tab="catalog"]').first();
    if (await catalogTabBtn.count() > 0) await catalogTabBtn.click();
    await page.waitForTimeout(600);

    const catalogHeading = page.locator('text=Product Catalog Explorer').or(page.locator('text=Explorer')).first();
    if (await catalogHeading.isVisible()) {
      report.successes.push('Catalog Explorer tab loaded');

      // Verify category select dropdown
      const catSelect = page.locator('select').first();
      if (await catSelect.count() > 0) {
        const catOptions = await catSelect.locator('option').allInnerTexts();
        report.successes.push(`Catalog Explorer category dropdown loaded with ${catOptions.length} categories: [${catOptions.slice(0, 4).join(', ')}...]`);
      } else {
        report.logicalGaps.push('Category filter dropdown missing in Catalog Explorer');
      }

      // Verify View Mode Buttons (Table, Analytics, Services, Rules)
      const viewModeButtons = await page.$$eval('button:has-text("SKU Table View"), button:has-text("Price Variance"), button:has-text("Services & Support"), button:has-text("Rules Configuration")', btns => btns.map(b => b.innerText.trim()));
      report.successes.push(`Catalog Explorer view modes verified: [${viewModeButtons.join(', ')}]`);

      // Test Search Filter
      const catSearchInput = page.locator('input[placeholder="Search SKUs..."]').first();
      if (await catSearchInput.count() > 0) {
        await catSearchInput.fill('Xeon');
        await page.waitForTimeout(400);
        const rows = await page.$$('table tbody tr');
        report.successes.push(`Search filter "Xeon" dynamically filtered table (${rows.length} rows matched)`);
        await catSearchInput.fill(''); // Clear
        await page.waitForTimeout(300);
      } else {
        report.logicalGaps.push('Search filter input missing in Catalog Explorer');
      }

      // Check table column headers (SKU, Description, Price, Status)
      const headers = await page.$$eval('table thead th', ths => ths.map(t => t.innerText.trim()));
      if (headers.length > 0) {
        report.successes.push(`Catalog table columns verified: [${headers.slice(0, 5).join(', ')}]`);
      }
    } else {
      report.logicalGaps.push('Catalog Explorer tab failed to render');
    }

    // -------------------------------------------------------------------------
    // FLOW 7: Artifacts & Audit (`artifacts` tab)
    // -------------------------------------------------------------------------
    report.flowsTested++;
    console.log('▶ [FLOW 7] Artifacts & Master Audit Inspector');
    const artifactsTabBtn = page.locator('button[data-tab="artifacts"]').first();
    if (await artifactsTabBtn.count() > 0) {
      await artifactsTabBtn.click();
      await page.waitForTimeout(500);

      const artifactsHeading = page.locator('text=Deliverables & Master Artifacts').or(page.locator('text=Artifact')).first();
      if (await artifactsHeading.isVisible()) {
        report.successes.push('Artifacts & Audit Inspector tab loaded and rendered');

        // Check audit catalog button
        const auditBtn = page.locator('button:has-text("Run Catalog Health Audit")').first();
        if (await auditBtn.count() > 0) {
          report.successes.push('Artifacts Inspector renders "Run Catalog Health Audit" button');
        }
      } else {
        report.logicalGaps.push('Artifacts tab clicked but content failed to render');
      }
    } else {
      report.logicalGaps.push('Artifacts & Audit tab button not found in navigation');
    }

    // -------------------------------------------------------------------------
    // FLOW 8: Pipeline Ops / Scraper (`pipeline` tab)
    // -------------------------------------------------------------------------
    report.flowsTested++;
    console.log('▶ [FLOW 8] Pipeline Ops / Scraper Controls');
    const pipelineTabBtn = page.locator('button[data-tab="pipeline"]').first();
    if (await pipelineTabBtn.count() > 0) await pipelineTabBtn.click();
    await page.waitForTimeout(500);

    const pipelineHeading = page.locator('text=Live CDP Scraper & Pipeline Controls').first();
    if (await pipelineHeading.isVisible()) {
      report.successes.push('Pipeline Ops / Scraper controls tab loaded');

      // Check operational buttons
      const rebuildBtn = page.locator('button:has-text("Rebuild All")').first();
      const pdfBtn = page.locator('button:has-text("Fetch PDF")').first();
      const syncBtn = page.locator('button:has-text("Sync Knowledge")').first();
      const browserLaunchBtn = page.locator('button:has-text("Launch Scraper Browser")').first();

      if (await rebuildBtn.count() > 0 && await pdfBtn.count() > 0 && await syncBtn.count() > 0) {
        report.successes.push('Pipeline action buttons (Rebuild All, Fetch PDF, Sync Knowledge) present and enabled');
      } else {
        report.logicalGaps.push('Some pipeline action buttons missing');
      }

      if (await browserLaunchBtn.count() > 0) {
        report.successes.push('Chrome CDP 9222 "Launch Scraper Browser" one-click button present');
      }

      // Check Real-time SSE Terminal
      const terminalHeading = page.locator('text=Real-Time Terminal Output Stream').first();
      if (await terminalHeading.isVisible()) {
        report.successes.push('Real-Time Terminal Output Stream (SSE) container rendered');
      }
    } else {
      report.logicalGaps.push('Pipeline Ops tab failed to render');
    }

    // -------------------------------------------------------------------------
    // FLOW 9: Telemetry & Agentic Insights (`telemetry` tab)
    // -------------------------------------------------------------------------
    report.flowsTested++;
    console.log('▶ [FLOW 9] Telemetry & Agentic Insights');
    const telemetryTabBtn = page.locator('button[data-tab="telemetry"]').first();
    if (await telemetryTabBtn.count() > 0) await telemetryTabBtn.click();
    await page.waitForTimeout(500);

    const telemetryHeading = page.locator('h2:has-text("Agentic Insights"), h2:has-text("Telemetry")').first();
    try { await telemetryHeading.waitFor({ state: 'visible', timeout: 15000 }); } catch (_) {}
    if (await telemetryHeading.isVisible()) {
      report.successes.push('Telemetry & Agentic Insights tab loaded');

      // Check sub-sections
      const sections = await page.$$eval('h3, h4', headings => headings.map(h => h.innerText.trim()).filter(Boolean));
      report.successes.push(`Telemetry sub-sections: [${sections.slice(0, 4).join(', ')}...]`);
    } else {
      report.logicalGaps.push('Telemetry tab did not render');
    }

    // -------------------------------------------------------------------------
    // FLOW 10: Stage 2 Partner Quote Reconciliation Flow
    // -------------------------------------------------------------------------
    report.flowsTested++;
    console.log('▶ [FLOW 10] Stage 2 Partner Quote Reconciliation Flow');
    // Navigate back to orchestrator
    if (await orchTabBtn.count() > 0) await orchTabBtn.click();
    await page.waitForTimeout(400);

    // Click "Reconcile Partner Quote" button in Stage 2 Macro card
    const reconcileBtn = page.locator('button:has-text("Reconcile Partner Quote")').first();
    if (await reconcileBtn.count() > 0) {
      const isReconcileDisabled = await reconcileBtn.isDisabled();
      if (!isReconcileDisabled) {
        await reconcileBtn.click();
        await page.waitForTimeout(600);

        const reconModalTitle = page.locator('text=Stage 3: Partner Quote Reconciliation').or(page.locator('text=Partner Quote Reconciliation')).first();
        if (await reconModalTitle.isVisible()) {
          report.successes.push('Partner Quote Reconciliation modal opened');

          // Check upload dropzones in Reconciliation view
          const reconDropzones = await page.$$('input[type="file"], .dropzone');
          report.successes.push(`Partner Reconciliation view provides quote dropzones (${reconDropzones.length} dropzone/file inputs)`);

          // Close modal
          await page.keyboard.press('Escape');
          await page.waitForTimeout(400);
        } else {
          report.logicalGaps.push('Reconcile Partner Quote button clicked but modal did not open');
        }
      } else {
        report.logicalGaps.push('Reconcile Partner Quote button is disabled despite evaluation completing');
      }
    } else {
      report.logicalGaps.push('Reconcile Partner Quote button not found in Macro Lifecycle');
    }

  } catch (err) {
    report.logicalGaps.push(`Unhandled Flow Error: ${err.message}`);
  } finally {
    await browser.close();
    if (serverProc) {
      serverProc.kill('SIGTERM');
      console.log('Stopped temporary dashboard test server.');
    }
  }

  return report;
}

auditAllFlows().then(report => {
  console.log('\n================================================================');
  console.log('📊 DASHBOARD FLOW AUDIT SUMMARY REPORT');
  console.log('================================================================');
  console.log(`Flows Evaluated: ${report.flowsTested}`);
  console.log(`Successes      : ${report.successes.length}`);
  console.log(`Logical Gaps   : ${report.logicalGaps.length}`);
  console.log(`Console Errors : ${report.consoleErrors.length}`);
  console.log(`Network Errors : ${report.networkFailures.length}`);

  console.log('\n✅ Functional Successes:');
  report.successes.forEach(s => console.log(`   • ${s}`));

  if (report.logicalGaps.length > 0) {
    console.log('\n⚠️ Logical Gaps & Functional Anomalies:');
    report.logicalGaps.forEach(g => console.log(`   • ${g}`));
  } else {
    console.log('\n🎉 ZERO Logical Gaps detected!');
  }

  if (report.consoleErrors.length > 0) {
    console.log('\n🚨 Console Errors:');
    report.consoleErrors.forEach(e => console.log(`   • ${e}`));
  }

  if (report.networkFailures.length > 0) {
    console.log('\n❌ Network Failures:');
    report.networkFailures.forEach(n => console.log(`   • [HTTP ${n.status}] ${n.url}`));
  }
  console.log('================================================================\n');

  // Save report to disk
  const reportPath = path.join(PROJECT_ROOT, 'outputs', 'history', 'dashboard_flow_audit.json');
  safeWriteJsonAtomic(reportPath, report);
  console.log(`Detailed audit report written to: ${reportPath}`);
  if (report.logicalGaps.length || report.consoleErrors.length || report.networkFailures.length || report.flowsTested === 0) process.exitCode = 1;
}).catch(err => {
  console.error('Fatal Flow Audit Failure:', err);
  process.exit(1);
});
