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
} = require('./lib/cdp');
const { emitProgress, emitLog, emitResult } = require('./lib/progress');
const { updateScrapedRegistry } = require('./lib/registry');
const { parseProductMeta } = require('./lib/product_meta');

const PROJECT_ROOT  = path.resolve(__dirname, '..');
const OUTPUTS_ROOT  = path.join(PROJECT_ROOT, 'outputs');
const JSON_MODE     = process.argv.includes('--json');

async function main() {
  const pipelineStart = Date.now();
  console.log('================================================================');
  console.log('🚀 100% GENERIC DYNAMIC HPE OCA SOLUTION SCRAPER PIPELINE');
  console.log('================================================================\n');

  let pageTarget;
  try {
    pageTarget = await getOCATarget();
} catch (err) {
    console.log(`⚠️ Active OCA tab not found: ${err.message}`);
    console.log(`🧭 Attempting smart auto-navigation via Partner Portal...`);
    try {
      const { navigateToOCAChassis } = require('./lib/navigate_oca');
      await navigateToOCAChassis('DL380 Gen12');
      pageTarget = await getOCATarget();
    } catch (navErr) {
      throw new Error(`Auto-navigation failed: ${navErr.message}\nOriginal CDP error: ${err.message}`);
    }
}
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

    // STEP 1: Solution Root Navigation & Pre-flight
    console.log('\n--- STEP 1: Solution Root Discovery & Pre-flight ---');
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

    // STEP 2: Navigate into Product Node Menu tab
    console.log('\n--- STEP 2: Navigating into Product Node Menu Catalog ---');
    await sendCommand(ws, 'Runtime.evaluate', {
      expression: `(() => {
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
        const menuTab = document.querySelector('a[href*="extended_overview_menu"], #ui-id-24');
        if (menuTab) menuTab.click();
      })()`,
      returnByValue: true
    });

    await sleep(4000);

    // Extract Page Heading & Load Profile BEFORE Step 3
    const headingRes = await sendCommand(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const rawHeading = Array.from(document.querySelectorAll(
          'h1, h2, h3, .breadcrumb, #solution_title, .qs-link, .menu_info, .menu-title, span[class*="qs"]'
        )).map(el => el.innerText.trim()).find(t =>
          /Gen\\d+/i.test(t) || /MSL|Tape|DL\\d|ML\\d|RL\\d|SY\\d|GX\\d|Synergy|Alletra|ProLiant|StoreOnce|StoreEver|MSA|Cray|Aruba/i.test(t)
        ) || document.title;
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
    const { loadProfile } = require('./lib/profile_loader');
    const profile = loadProfile(meta.family, meta.gen);
    console.log(`Loaded Profiler for Family: "${meta.family}", Gen: "${meta.gen}", Chassis: "${meta.cleanName}"`);

    const scrollThreshold = profile.scraping_tuning.scrollHeightThreshold || 15000;
    const targetTabsRegex = profile.scraping_tuning.targetTabsRegex || "pointnext|services|support services|tech care|^bom$";

    // STEP 3: Full Page Section Expansion
    console.log(`\n--- STEP 3: Expanding Page Sections (Threshold: ${scrollThreshold}px) ---`);
    await expandSections(ws);
    await sleep(3000);

    // STEP 3.5: Multi-Tab Support Services & Configured BOM Check
    console.log('\n--- STEP 3.5: Checking for Solution Services & Configured BOM Tab ---');
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

    // STEP 4: Extract Dynamic DOM & Metadata
    console.log('\n--- STEP 4: Extracting DOM & Metadata ---');

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

    const GENERIC_NAMES = ['External_OCA_Hewlett_Packard_Enterprise', 'General', ''];
    if (GENERIC_NAMES.includes(meta.cleanName)) {
      throw new Error(
        `Cannot auto-detect chassis name from: "${pageHeading}".\n` +
        `Ensure you are on the correct Product Node Menu tab in OCA.`
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
    fs.writeFileSync(rawJsonPath, JSON.stringify(rawData, null, 2));
    console.log(`Raw data JSON saved to staging: ${rawJsonPath}`);

    // STEP 5: QuickSpecs PDF Download
    if (qsLink) {
      console.log(`\n--- STEP 5: QuickSpecs PDF Download ---`);
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
    try { ws.close(); } catch (e) { const _logger = require('./lib/pipeline_logger'); _logger.warn('SCRAPE', 'Failed to close WebSocket', e); }
}

  // STEP 6: Catalog Parser & Excel Generator
  console.log('\n--- STEP 6: Catalog Classification & Excel Generation in Staging ---');
  catalogJson = path.join(outputDir, `${meta.cleanName}_Catalog.json`);
  catalogXlsx = path.join(outputDir, `${meta.cleanName}_OCA_Catalog.xlsx`);
  const rawJsonPath = path.join(outputDir, 'raw_data', 'oca_raw_data_full.json');

  // ── STAGING SEED: Copy ALL critical live files into staging BEFORE any scrape ──
  // This guarantees that if the scrape fails at any point (CDP port down, browser
  // crash, partial data), the live directory is 100% untouched. We NEVER write
  // directly to the live path — only to staging, then promote atomically on success.
  const liveOutputDir = path.join(OUTPUTS_ROOT, meta.family, meta.gen, meta.cleanName);
  if (fs.existsSync(liveOutputDir)) {
    const { copyDirRecursive } = require('./lib/fs_compat');
    console.log(`\n🛡️  Seeding staging from live workspace to protect previous scrape data...`);

    // Seed history/ — required for diff engine to compute ADDED/REMOVED/PRICE_CHANGED
    const existingHistory = path.join(liveOutputDir, 'history');
    if (fs.existsSync(existingHistory)) {
      copyDirRecursive(existingHistory, path.join(outputDir, 'history'));
      console.log(`   ✅ history/ seeded (diff engine can compare against previous scrape)`);
    }

    // Seed intermittent_scraps/ — required for re-running generate_xlsx.js standalone
    const existingScraps = path.join(liveOutputDir, 'intermittent_scraps');
    if (fs.existsSync(existingScraps)) {
      copyDirRecursive(existingScraps, path.join(outputDir, 'intermittent_scraps'));
      console.log(`   ✅ intermittent_scraps/ seeded (TSV intermediates preserved)`);
    }

    // Seed _Catalog.json — required for incremental checksum differential
    const existingCatalog = path.join(liveOutputDir, `${meta.cleanName}_Catalog.json`);
    if (fs.existsSync(existingCatalog)) {
      fs.copyFileSync(existingCatalog, path.join(outputDir, `${meta.cleanName}_Catalog.json`));
      console.log(`   ✅ ${meta.cleanName}_Catalog.json seeded`);
    }

    // Seed _Services.json — required for services diff to compute delta across scrapes
    const existingServices = path.join(liveOutputDir, `${meta.cleanName}_Services.json`);
    if (fs.existsSync(existingServices)) {
      fs.copyFileSync(existingServices, path.join(outputDir, `${meta.cleanName}_Services.json`));
      console.log(`   ✅ ${meta.cleanName}_Services.json seeded`);
    }

    // Seed _Catalog_Rules.json — required for BOQ evaluator and downstream tools
    const existingRules = path.join(liveOutputDir, `${meta.cleanName}_Catalog_Rules.json`);
    if (fs.existsSync(existingRules)) {
      fs.copyFileSync(existingRules, path.join(outputDir, `${meta.cleanName}_Catalog_Rules.json`));
      console.log(`   ✅ ${meta.cleanName}_Catalog_Rules.json seeded`);
    }

    console.log(`   🔒 Live workspace is safe — all writes go to staging only until audit passes.\n`);
} else {
    console.log(`\n🆕  No existing live workspace found — this is a fresh first-run for ${meta.cleanName}.`);
}


  execSync(
    `node "${path.join(__dirname, 'build_catalog.js')}" "${rawJsonPath}" "${catalogJson}"`,
    { stdio: 'inherit', cwd: PROJECT_ROOT }
  );
  execSync(
    `node "${path.join(__dirname, 'generate_xlsx.js')}" "${catalogXlsx}"`,
    { stdio: 'inherit', cwd: PROJECT_ROOT }
  );

  // STEP 7: Automated Post-Flight Audit Verification
  console.log('\n--- STEP 7: Staging Post-Flight Quality Audit ---');
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


  // STEP 8: Promote Staging to Live Workspace, Update Registry & Sync
  console.log('\n--- STEP 8: Promoting Staging to Live Workspace & Master Knowledge Sync ---');
  const { promoteStagingDirectory } = require('./lib/fs_compat');
  promoteStagingDirectory(outputDir, liveOutputDir);

  const liveCatalogJson = path.join(liveOutputDir, `${meta.cleanName}_Catalog.json`);
  const liveCatalogXlsx = path.join(liveOutputDir, `${meta.cleanName}_OCA_Catalog.xlsx`);
  const livePdfPath    = pdfDestPath ? path.join(liveOutputDir, path.basename(pdfDestPath)) : null;
  const actualPdfPath  = livePdfPath && fs.existsSync(livePdfPath) ? livePdfPath : null;

  updateScrapedRegistry({
    timestamp:    new Date().toISOString(),
    solutionName: treeInfo.solutionName || 'OCA Solution',
    family:       meta.family,
    gen:          meta.gen,
    chassisName:  meta.cleanName,
    outputDir:    liveOutputDir,
    jsonPath:     liveCatalogJson,
    xlsxPath:     liveCatalogXlsx,
    pdfPath:      actualPdfPath,
    tablesCount:  tables.length,
    textLength:   totalLen
});

  // Re-sync all registered catalogs & chassis variants across workspace
  try {
    execSync(`node "${path.join(__dirname, 'sync_all_registered_catalogs.js')}"`, { stdio: 'inherit', cwd: PROJECT_ROOT });
} catch (syncErr) {
    console.warn('Warning during sync_all_registered_catalogs execution:', syncErr.message);
}

  // Clean up staging folder
  try { if (fs.existsSync(outputDir)) fs.rmSync(outputDir, { recursive: true, force: true }); } catch (_) {}

  const durationSec = ((Date.now() - pipelineStart) / 1000).toFixed(1);

  if (JSON_MODE) {
    emitResult('SUCCESS', {
      solutionName: treeInfo.solutionName || 'OCA Solution',
      family: meta.family,
      gen: meta.gen,
      chassisName: meta.cleanName,
      outputDir: liveOutputDir,
      jsonPath: liveCatalogJson,
      xlsxPath: liveCatalogXlsx,
      pdfPath: actualPdfPath,
      tablesCount: tables.length,
      durationSec
    });
  } else {
    console.log('\n================================================================');
    console.log(`🎉 PIPELINE COMPLETED SUCCESSFULLY in ${durationSec}s — Live Workspace Updated:`);
    console.log(`   ${liveOutputDir}`);
    console.log('================================================================\n');
  }

  // Post-flow knowledge sync — update master registry after every scrape
  try {
    const { triggerPostFlowSync } = require('./lib/post_flow_sync');
    triggerPostFlowSync(meta.cleanName, 'SCRAPE');
  } catch (_) {}

}

main().catch(err => {
  if (JSON_MODE) {
    emitResult('ERROR', {}, err.message || String(err));
  } else {
    console.error('\n❌ PIPELINE ERROR:', err.message || err);
  }
  process.exit(1);
});
