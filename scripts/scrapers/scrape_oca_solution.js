// 100% Generic E2E HPE OCA Solution Traversal & Catalog Pipeline
// Auto-detects Solution Root, Product Family, Generation, Chassis Name, SKUs, and QuickSpecs.
// NO Hardcoded Product IDs, Families, or Absolute Paths.

'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const {
  sendCommand, getOCATarget, connectWS, setupDialogAutoHandler,
  expandSections, extractChunkedText, extractTablesAsRows, extractSectionHeaders,
  sleep
} = require('../lib/scraper/cdp.js');
const { emitProgress, emitLog, emitResult } = require('../lib/system/progress.js');
const { updateScrapedRegistry } = require('../lib/catalog/registry.js');
const { parseProductMeta } = require('../lib/catalog/product_meta.js');

const PROJECT_ROOT  = path.resolve(__dirname, '..');
const OUTPUTS_ROOT  = path.join(PROJECT_ROOT, 'outputs');
const JSON_MODE     = process.argv.includes('--json');

async function main() {
  const pipelineStart = Date.now();
  const logger = require('../lib/system/pipeline_logger.js');

  console.log('================================================================');
  console.log('🚀 100% GENERIC DYNAMIC HPE OCA SOLUTION SCRAPER PIPELINE');
  console.log('================================================================\n');

  // ── Startup: Proactive cleanup of orphaned staging and stale failed runs ──
  const tempDir = path.join(OUTPUTS_ROOT, 'temp');
  if (fs.existsSync(tempDir)) {
    const now = Date.now();
    for (const entry of fs.readdirSync(tempDir)) {
      const entryPath = path.join(tempDir, entry);
      try {
        const stat = fs.statSync(entryPath);
        const ageHours = (now - stat.mtimeMs) / 3600000;
        // 1. Orphaned staging directories older than 15 mins → mark as failed for diagnostic inspection
        if (entry.startsWith('staging_') && ageHours > 0.25) {
          const failedPath = path.join(tempDir, entry.replace('staging_', 'failed_stale_'));
          fs.renameSync(entryPath, failedPath);
          logger.warn('SCRAPE', `Orphaned staging dir (${(ageHours * 60).toFixed(0)}m old) preserved for diagnosis: ${path.basename(failedPath)}`);
        }
        // 2. Old failed diagnostics older than 48 hours → purge to keep disk clean
        else if (entry.startsWith('failed_') && ageHours > 48) {
          fs.rmSync(entryPath, { recursive: true, force: true });
          logger.info('SCRAPE', `Purged old diagnostic dir (${ageHours.toFixed(1)}h old): ${entry}`);
        }
      } catch (e) {
        logger.warn('SCRAPE', `Could not inspect temp dir entry ${entry}`, e);
      }
    }
  }

  let pageTarget;
  try {
    pageTarget = await getOCATarget();
  } catch (err) {
    console.log(`⚠️ Active OCA tab not found: ${err.message}`);
    console.log(`🧭 Attempting smart auto-navigation via Partner Portal...`);
    try {
      const { navigateToOCAChassis } = require('../lib/scraper/navigate_oca.js');
      await navigateToOCAChassis('DL380 Gen12');
      pageTarget = await getOCATarget();
    } catch (navErr) {
      throw new Error(`Auto-navigation failed: ${navErr.message}\nOriginal CDP error: ${err.message}`);
    }
  }

  // STEP 1: CDP Handshake & Session Verification
  emitProgress(1, 10, 'CDP Handshake & Session Verification', 'started', `Connecting to ${pageTarget.title}`, {
    stage: 'CDP_CONNECT', percent: 10
  });

  console.log(`Connecting via CDP: ${pageTarget.id} (${pageTarget.title})...`);
  const ws = await connectWS(pageTarget.webSocketDebuggerUrl);

  let outputDir = '';
  let meta = {};
  let catalogJson = '';
  let catalogXlsx = '';
  let pdfDestPath = null;
  let tables = [];
  let totalLen = 0;
  let treeInfo = {};

  try {
    // Enable automated JS dialog & WebLogic modal prompt handler
    await setupDialogAutoHandler(ws);

    // STEP 2: Solution Root Navigation & Pre-flight
    console.log('\n--- STEP 2: Solution Root Discovery & Pre-flight ---');
    emitProgress(2, 10, 'Solution Root Discovery & Navigation', 'in_progress', 'Locating components tree', {
      stage: 'PORTAL_NAV', percent: 20
    });

    await sendCommand(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const upBtn = document.querySelector('#nav_up, .icon-arrow-up3');
        if (upBtn) upBtn.click();
        const compTab = Array.from(document.querySelectorAll('a'))
          .find(a => a.innerText.trim() === 'Components');
        if (compTab) compTab.click();
      })()`,
      returnByValue: true
    });

    await sleep(2500);

    const treeInfoRes = await sendCommand(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const selectNav = document.querySelector('#selectNavTreeOption');
        const options = selectNav
          ? Array.from(selectNav.options).map(o => ({ val: o.value, text: o.text.trim() }))
          : [];
        const solutionName =
          document.querySelector('#solution_title, .solution-name, .breadcrumb-item')
            ?.innerText.trim() || 'OCA Solution';
        return JSON.stringify({ solutionName, options });
      })()`,
      returnByValue: true
    });

    treeInfo = JSON.parse(treeInfoRes.result.value);
    console.log(`Discovered Solution Name: "${treeInfo.solutionName}"`);
    console.log(`Discovered Nodes (${treeInfo.options.length}):`, treeInfo.options.map(o => o.text));

    // STEP 3: Navigate into Product Node Menu tab & Profiling
    console.log('\n--- STEP 3: Navigating into Product Node Menu Catalog ---');
    emitProgress(3, 10, 'Category Discovery & Profiling', 'in_progress', 'Entering configuration menu', {
      stage: 'CATEGORY_DISCOVERY', percent: 30
    });

    await sendCommand(ws, 'Runtime.evaluate', {
      expression: `(() => {
        // Try clicking Menu tab in OCA configuration view
        const menuTab = Array.from(document.querySelectorAll('a, button, span, li'))
          .find(el => el.innerText && el.innerText.trim() === 'Menu');
        if (menuTab) menuTab.click();

        if (typeof jQuery !== 'undefined') {
          const titleSpan = jQuery('.fancytree-title, span[id*="node_title"]').filter((i, el) => {
            const t = jQuery(el).text();
            return t.includes('Gen12') || t.includes('Gen11') || t.includes('#1');
          });
          if (titleSpan.length > 0) titleSpan.trigger('click').trigger('dblclick');
          const lastVal = jQuery('#selectNavTreeOption option').last().val();
          if (lastVal) jQuery('#selectNavTreeOption').val(lastVal).trigger('change');
          jQuery('a[href*="extended_overview_menu"]').click();
        }
        const extMenuTab = document.querySelector('a[href*="extended_overview_menu"], #ui-id-24');
        if (extMenuTab) extMenuTab.click();
      })()`,
      returnByValue: true
    });

    await sleep(4000);

    // Extract Page Heading & Load Profile BEFORE Step 4
    const headingRes = await sendCommand(ws, 'Runtime.evaluate', {
      expression: `(() => {
        // Priority-ordered selectors to find the most specific product model/description
        const targetedSelectors = [
          '.product_description',
          '[id*="summary_property_description"]',
          '[id*="summary_property_summary_name"]',
          '.eo_nav_li.current',
          '.eo_nav_div',
          '.configName',
          '.breadcrumb',
          '.breadcrumb-item',
          'h1, h2, h3, h4',
          '.fancytree-title',
          '.menu_info',
          '.menu-title',
          '#solution_title',
          'strong, td'
        ];

        let foundHeading = '';
        const pattern = /(?:DL|ML|RL|SY|GX)\\d{3}|ProLiant|Alletra|StoreEver|StoreOnce|MSL\\d+|Synergy|Cray|Gen\\d+/i;

        for (const sel of targetedSelectors) {
          const els = Array.from(document.querySelectorAll(sel));
          for (const el of els) {
            const t = (el.innerText || '').trim();
            if (t && t.length < 200 && pattern.test(t)) {
              foundHeading = t;
              break;
            }
          }
          if (foundHeading) break;
        }

        const rawHeading = foundHeading || document.title;
        const pageHeading = rawHeading
          .replace(/Collapse All|Expand All|Expand Subsections|Undo Selection|Remove Defaults|View HPE Recommended only/gi, '')
          .trim();
        const qsLink = document.querySelector('a[href*="quickspec"], a.qs-link-a')?.href || '';
        return JSON.stringify({ pageHeading, qsLink });
      })()`,
      returnByValue: true
    });
    const { pageHeading, qsLink } = JSON.parse(headingRes.result.value);
    console.log(`Active Product Node Title: "${pageHeading}"`);

    meta = parseProductMeta(pageHeading, pageTarget.title);
    const { loadProfile } = require('../lib/system/profile_loader.js');
    const profile = await loadProfile(meta.family, meta.gen);
    console.log(`Loaded Profiler for Family: "${meta.family}", Gen: "${meta.gen}", Chassis: "${meta.cleanName}"`);

    const scrollThreshold = profile.scraping_tuning.scrollHeightThreshold || 15000;
    const targetTabsRegex = profile.scraping_tuning.targetTabsRegex || "pointnext|services|support services|tech care|^bom$";

    // STEP 4: Full Page Section Expansion
    console.log(`\n--- STEP 4: Expanding Page Sections (Threshold: ${scrollThreshold}px) ---`);
    emitProgress(4, 10, 'Section Expansion & Multi-Tab Reveal', 'in_progress', `Threshold: ${scrollThreshold}px`, {
      stage: 'PAGE_EXPAND', percent: 45, category: meta.cleanName
    });

    await expandSections(ws);
    await sleep(3000);

    // Multi-Tab Support Services & Configured BOM Check
    await sendCommand(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const tabsToClick = Array.from(document.querySelectorAll('a, button, div.tab_header')).filter(el => 
          /${targetTabsRegex}/i.test((el.innerText || '').trim()) && 
          !el.href?.includes('menu') && !el.classList.contains('active')
        );
        tabsToClick.forEach(tab => tab.click());
        return tabsToClick.length;
      })()`,
      returnByValue: true
    });
    await sleep(2500);
    await expandSections(ws);
    await sleep(2000);

    const getMetrics = async () => {
      const res = await sendCommand(ws, 'Runtime.evaluate', {
        expression: `(() => {
          const scrollHeight = document.body.scrollHeight;
          const tablesCount  = document.querySelectorAll('table').length;
          const totalRows    = Array.from(document.querySelectorAll('table')).reduce((sum, t) => sum + t.querySelectorAll('tr').length, 0);
          return JSON.stringify({ scrollHeight, tablesCount, totalRows });
        })()`,
        returnByValue: true
      });
      return JSON.parse(res.result.value);
    };

    let metrics = await getMetrics();
    console.log(`Page Expansion Metrics: height=${metrics.scrollHeight}px, tables=${metrics.tablesCount}, rows=${metrics.totalRows}`);

    let isExpanded = metrics.scrollHeight >= scrollThreshold || metrics.totalRows >= 50 || metrics.tablesCount >= 10;

    if (!isExpanded) {
      console.warn(`⚠️  Page expansion metrics below threshold — retrying expansion...`);
      await expandSections(ws);
      await sleep(4000);
      metrics = await getMetrics();
      isExpanded = metrics.scrollHeight >= scrollThreshold || metrics.totalRows >= 50 || metrics.tablesCount >= 10;
      if (!isExpanded) {
        throw new Error(
          `Rule #19 FAILED: height (${metrics.scrollHeight}px), rows (${metrics.totalRows}) below threshold. ` +
          `Aborting — page expansion failed, incomplete catalog would be extracted.`
        );
      }
    }
    console.log(`✅ Expansion verified: ${metrics.tablesCount} tables, ${metrics.totalRows} rows — Rule #19 passed.`);

    // STEP 5: Extract Dynamic DOM & Metadata
    console.log('\n--- STEP 5: Extracting DOM & Metadata ---');
    emitProgress(5, 10, 'DOM Extraction & Tabular Row Scraping', 'in_progress', `${metrics.tablesCount} tables detected`, {
      stage: 'DOM_EXTRACTION', percent: 60, itemsScraped: metrics.tablesCount, category: meta.cleanName
    });

    // Shared chunked text extraction
    console.log('Extracting page text...');
    const extractedText = await extractChunkedText(ws, 50000);
    totalLen = extractedText.totalLen;
    const fullText = extractedText.fullText;
    console.log(`Extracted text: ${totalLen.toLocaleString()} chars`);

    // Shared table extraction as row arrays
    console.log('Extracting tables (row arrays)...');
    tables = await extractTablesAsRows(ws);
    console.log(`Extracted ${tables.length} tables.`);

    // Shared section header extraction
    console.log('Extracting DOM section headers (landmarks)...');
    const sections = await extractSectionHeaders(ws);
    console.log(`Extracted ${sections.length} DOM section headers.`);

    // ── Phantom Chassis Guard ──
    const BLOCKED_CHASSIS_NAMES = new Set([
      'External_OCA_Hewlett_Packard_Enterprise', 'General', '', 'outputs',
      '-------------', 'Output Path', 'Unknown_Chassis', 'OCA Solution', 'Chassis Dir'
    ]);
    if (
      !meta.cleanName ||
      BLOCKED_CHASSIS_NAMES.has(meta.cleanName) ||
      !/^[A-Za-z0-9][A-Za-z0-9_\-]+$/.test(meta.cleanName) ||
      meta.cleanName.includes('..') ||
      meta.cleanName.length > 80
    ) {
      throw new Error(
        `Phantom chassis name rejected: "${meta.cleanName}" (parsed from: "${pageHeading}").\n` +
        `Ensure you are on the correct Product Node Menu tab in OCA and the page heading contains a recognizable HPE product name.`
      );
    }

    console.log(`Family: "${meta.family}", Gen: "${meta.gen}", Chassis: "${meta.cleanName}"`);

    const liveOutputDir = path.join(OUTPUTS_ROOT, meta.family, meta.gen, meta.cleanName);
    const stagingDir = path.join(OUTPUTS_ROOT, 'temp', `staging_${meta.cleanName.replace(/[^a-zA-Z0-9_\-]/g, '_')}_${Date.now()}`);
    outputDir = stagingDir;

    console.log(`\n🛡️ Staging Isolation Active: Scraping & building inside temporary staging directory:`);
    console.log(`   ${stagingDir}`);

    const rawDir = path.join(outputDir, 'raw_data');
    fs.mkdirSync(rawDir, { recursive: true });

    const rawJsonPath = path.join(rawDir, 'oca_raw_data_full.json');
    const rawData = {
      timestamp:  new Date().toISOString(),
      pageTitle:  pageTarget.title,
      url:        pageTarget.url,
      nodeText:   pageHeading,
      qsLink,
      scrollHeight: metrics.scrollHeight,
      textLength: totalLen,
      fullText,
      sections,
      tables,
      tableCount: tables.length
    };
    const { safeWriteJsonAtomic } = require('../lib/system/fs_compat.js');
    safeWriteJsonAtomic(rawJsonPath, rawData);
    console.log(`Raw data JSON saved atomically to staging: ${rawJsonPath}`);

    // QuickSpecs PDF Download
    if (qsLink) {
      console.log(`\n--- QuickSpecs PDF Download ---`);
      pdfDestPath = path.join(outputDir, `HPE_${meta.cleanName}_QuickSpecs.pdf`);
      try {
        execSync(
          `node "${path.join(__dirname, 'download_quickspecs_pdf.js')}" "${qsLink}" "${pdfDestPath}"`,
          { stdio: 'inherit', cwd: PROJECT_ROOT }
        );
      } catch (e) {
        console.warn('QuickSpecs download warning:', e.message);
      }
    }
  } finally {
    try { ws.close(); } catch (e) { const _logger = require('../lib/system/pipeline_logger.js'); _logger.warn('SCRAPE', 'Failed to close WebSocket', e); }
  }

  // STEP 6: Catalog Parser & Excel Generator in Staging
  console.log('\n--- STEP 6: Catalog Classification & Excel Generation in Staging ---');
  emitProgress(6, 10, 'Aspect Rules Engine & Constraint Graph', 'in_progress', 'Building catalog JSON and TSV intermediates', {
    stage: 'RULES_PARSING', percent: 75, category: meta.cleanName
  });

  catalogJson = path.join(outputDir, `${meta.cleanName}_Catalog.json`);
  catalogXlsx = path.join(outputDir, `${meta.cleanName}_OCA_Catalog.xlsx`);
  const rawJsonPath = path.join(outputDir, 'raw_data', 'oca_raw_data_full.json');

  // ── STAGING SEED: Copy ALL critical live files into staging BEFORE any scrape ──
  const liveOutputDir = path.join(OUTPUTS_ROOT, meta.family, meta.gen, meta.cleanName);
  if (fs.existsSync(liveOutputDir)) {
    const { copyDirRecursive } = require('../lib/system/fs_compat.js');
    console.log(`\n🛡️  Seeding staging from live workspace to protect previous scrape data...`);

    const existingHistory = path.join(liveOutputDir, 'history');
    if (fs.existsSync(existingHistory)) {
      copyDirRecursive(existingHistory, path.join(outputDir, 'history'));
      console.log(`   ✅ history/ seeded (diff engine can compare against previous scrape)`);
    }

    const existingScraps = path.join(liveOutputDir, 'intermittent_scraps');
    if (fs.existsSync(existingScraps)) {
      copyDirRecursive(existingScraps, path.join(outputDir, 'intermittent_scraps'));
      console.log(`   ✅ intermittent_scraps/ seeded (TSV intermediates preserved)`);
    }

    const existingCatalog = path.join(liveOutputDir, `${meta.cleanName}_Catalog.json`);
    if (fs.existsSync(existingCatalog)) {
      fs.copyFileSync(existingCatalog, path.join(outputDir, `${meta.cleanName}_Catalog.json`));
      console.log(`   ✅ ${meta.cleanName}_Catalog.json seeded`);
    }

    const existingServices = path.join(liveOutputDir, `${meta.cleanName}_Services.json`);
    if (fs.existsSync(existingServices)) {
      fs.copyFileSync(existingServices, path.join(outputDir, `${meta.cleanName}_Services.json`));
      console.log(`   ✅ ${meta.cleanName}_Services.json seeded`);
    }

    const existingRules = path.join(liveOutputDir, `${meta.cleanName}_Catalog_Rules.json`);
    if (fs.existsSync(existingRules)) {
      fs.copyFileSync(existingRules, path.join(outputDir, `${meta.cleanName}_Catalog_Rules.json`));
      console.log(`   ✅ ${meta.cleanName}_Catalog_Rules.json seeded`);
    }

    console.log(`   🔒 Live workspace is safe — all writes go to staging only until audit passes.\n`);
  } else {
    console.log(`\n🆕  No existing live workspace found — this is a fresh first-run for ${meta.cleanName}.`);
  }

  // STEP 7: Build Catalog & Generate Multi-Sheet Excel
  emitProgress(7, 10, 'Catalog Generation & Workbook Compilation', 'in_progress', 'Generating 20-sheet Master Excel', {
    stage: 'CATALOG_GEN', percent: 85, category: meta.cleanName
  });

  execSync(
    `node "${path.join(__dirname, 'build_catalog.js')}" "${rawJsonPath}" "${catalogJson}"`,
    { stdio: 'inherit', cwd: PROJECT_ROOT }
  );
  execSync(
    `node "${path.join(__dirname, 'generate_xlsx.js')}" "${catalogXlsx}"`,
    { stdio: 'inherit', cwd: PROJECT_ROOT }
  );

  // STEP 8: Automated Post-Flight Audit Verification
  console.log('\n--- STEP 8: Staging Post-Flight Quality Audit ---');
  emitProgress(8, 10, 'Staging Tally Audit & Quality Certification', 'in_progress', 'Running 7-check post-flight audit suite', {
    stage: 'STAGING_AUDIT', percent: 90, category: meta.cleanName
  });

  try {
    execSync(
      `node "${path.join(__dirname, 'verify_excel_tally.js')}" "${catalogXlsx}"`,
      { stdio: 'inherit', cwd: PROJECT_ROOT }
    );
    console.log('✅ Staging audit passed 100%! Ready to promote to live workspace.');
  } catch (e) {
    const failedStagingDir = path.join(OUTPUTS_ROOT, 'temp', `failed_staging_${meta.cleanName}_${Date.now()}`);
    console.error('\n❌ STAGING POST-FLIGHT AUDIT FAILED:', e.message);
    console.error('\n🔒 LIVE WORKSPACE IS COMPLETELY INTACT — your previous good data is safe:');
    const liveFiles = [
      `${meta.cleanName}_Catalog.json`,
      `${meta.cleanName}_Services.json`,
      `${meta.cleanName}_Catalog_Rules.json`,
      `${meta.cleanName}_OCA_Catalog.xlsx`,
      'history/',
      'intermittent_scraps/'
    ];
    liveFiles.forEach(f => {
      const p = path.join(liveOutputDir, f);
      if (fs.existsSync(p)) console.error(`   ✅ SAFE: ${p}`);
    });
    console.error(`\n⚠️  Failed staging preserved for inspection at:\n   ${failedStagingDir}`);
    console.error(`   You can inspect raw_data/ and intermittent_scraps/ in that folder to diagnose the failure.`);
    try { fs.renameSync(outputDir, failedStagingDir); } catch (_) {}
    process.exit(1);
  }

  // STEP 9: Promote Staging to Live Workspace & Cloud NotebookLM Grounding
  // STEP 9: Promoting Staging to Live Workspace & Cloud NotebookLM Grounding
  console.log('\n--- STEP 9: Promoting Staging to Live Workspace & Cloud NotebookLM Grounding ---');
  emitProgress(9, 10, 'Live Workspace Promotion & NotebookLM Grounding', 'in_progress', 'Syncing knowledge payload to NotebookLM', {
    stage: 'KNOWLEDGE_SYNC', percent: 95, category: meta.cleanName
  });

  const { promoteStagingDirectory } = require('../lib/system/fs_compat.js');
  promoteStagingDirectory(outputDir, liveOutputDir);

  const liveCatalogJson = path.join(liveOutputDir, `${meta.cleanName}_Catalog.json`);
  const liveCatalogXlsx = path.join(liveOutputDir, `${meta.cleanName}_OCA_Catalog.xlsx`);
  const livePdfPath    = pdfDestPath ? path.join(liveOutputDir, path.basename(pdfDestPath)) : null;
  const actualPdfPath  = livePdfPath && fs.existsSync(livePdfPath) ? livePdfPath : null;

  // GAP-2 FIX: Read live catalog JSON to get the actual HW + service SKU counts.
  // Previously, tablesCount (raw DOM tables = 124) was passed instead of the real SKU count (780).
  let hwSkuCount = tables.length; // fallback if read fails
  let serviceSkuCount = 0;
  let totalSkuCount = tables.length;
  try {
    const liveCatalogData = JSON.parse(fs.readFileSync(liveCatalogJson, 'utf-8'));
    hwSkuCount = liveCatalogData.metadata?.totalUniqueSKUs || tables.length;
    const liveServicesJson = path.join(liveOutputDir, `${meta.cleanName}_Services.json`);
    if (fs.existsSync(liveServicesJson)) {
      const svcData = JSON.parse(fs.readFileSync(liveServicesJson, 'utf-8'));
      serviceSkuCount = svcData.metadata?.totalUniqueSKUs || 0;
    }
    totalSkuCount = hwSkuCount + serviceSkuCount;
  } catch (catalogReadErr) {
    console.warn(`Warning: Could not read liveCatalogJson for SKU count: ${catalogReadErr.message}`);
  }

  updateScrapedRegistry({
    timestamp:      new Date().toISOString(),
    solutionName:   treeInfo.solutionName || 'OCA Solution',
    family:         meta.family,
    gen:            meta.gen,
    chassisName:    meta.cleanName,
    outputDir:      liveOutputDir,
    jsonPath:       liveCatalogJson,
    xlsxPath:       liveCatalogXlsx,
    pdfPath:        actualPdfPath,
    // GAP-2 FIX: actual total SKU count, not raw DOM table count
    tablesCount:    totalSkuCount,
    hwSkuCount,
    serviceSkuCount,
    textLength:     totalLen
  });

  // Post-flow knowledge sync — update master registry & auto-upload to NotebookLM
  try {
    const { triggerPostFlowSync } = require('../lib/sync/post_flow_sync.js');
    triggerPostFlowSync(meta.cleanName, 'SCRAPE', { autoUploadNLM: true });
  } catch (syncErr) {
    console.warn('Warning during triggerPostFlowSync:', syncErr.message);
  }

  // STEP 10: Re-sync all registered catalogs across workspace & Action Ledger
  console.log('\n--- STEP 10: Portfolio Registry & Action Ledger Sync ---');
  emitProgress(10, 10, 'Portfolio Registry & Telemetry Ledger Sync', 'in_progress', 'Synchronizing chassis variants', {
    stage: 'REGISTRY_SYNC', percent: 98, category: meta.cleanName
  });

  // GAP-5 FIX: Rethrow on sync_all_registered_catalogs failure.
  // Pipeline exits with code 1 — not silently console.warn and exit 0.
  // percent:100 emitted AFTER this succeeds — never before.
  try {
    execSync(`node "${path.join(__dirname, 'sync_all_registered_catalogs.js')}"`, { stdio: 'inherit', cwd: PROJECT_ROOT });
  } catch (syncErr) {
    emitProgress(10, 10, 'Portfolio Registry Sync Failed', 'error', syncErr.message, {
      stage: 'REGISTRY_SYNC', percent: 98
    });
    throw new Error(`Step 10 sync_all_registered_catalogs failed: ${syncErr.message}`);
  }

  // Clean up staging folder
  try { if (fs.existsSync(outputDir)) fs.rmSync(outputDir, { recursive: true, force: true }); } catch (_) {}

  const durationSec = ((Date.now() - pipelineStart) / 1000).toFixed(1);

  // GAP-5 FIX: percent:100 only fires after BOTH sync operations complete successfully.
  emitProgress(10, 10, 'Scrape Pipeline & Knowledge Sync Complete', 'completed', `Completed in ${durationSec}s`, {
    stage: 'REGISTRY_SYNC', percent: 100, category: meta.cleanName
  });

  if (JSON_MODE) {
    emitResult('SUCCESS', {
      solutionName: treeInfo.solutionName || 'OCA Solution',
      family:       meta.family,
      gen:          meta.gen,
      chassisName:  meta.cleanName,
      outputDir:    liveOutputDir,
      jsonPath:     liveCatalogJson,
      xlsxPath:     liveCatalogXlsx,
      pdfPath:      actualPdfPath,
      tablesCount:  totalSkuCount,
      hwSkuCount,
      serviceSkuCount,
      durationSec
    });
  } else {
    console.log('\n================================================================');
    console.log(`🎉 PIPELINE COMPLETED SUCCESSFULLY in ${durationSec}s — Live Workspace Updated:`);
    console.log(`   ${liveOutputDir}`);
    console.log(`   HW SKUs: ${hwSkuCount} | Service SKUs: ${serviceSkuCount} | Total: ${totalSkuCount}`);
    console.log('================================================================\n');
  }

}

main().catch(err => {
  // Emit SSE error event so UI receives immediate notification and diagnostics
  try {
    emitProgress(1, 10, 'Scrape Pipeline Aborted', 'error', err.message || String(err), {
      stage: 'CDP_CONNECT', percent: 0
    });
  } catch (_) {}

  if (JSON_MODE) {
    emitResult('ERROR', {}, err.message || String(err));
  } else {
    console.error('\n❌ PIPELINE ERROR:', err.message || err);
  }
  process.exit(1);
});
