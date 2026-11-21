// Generic HPE Storage Solution Wizard Scraper (Alletra 5000, Nimble, MSA, StoreOnce, Alletra 9000)
// Usage: node scripts/scrape_oca_storage_solution.js [output_json_path]
// Auto-detects active Storage Solution tab, iterates wizard sub-tabs, extracts both <select> dropdown SKUs & <table> rows.

'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { sendCommand, getOCATarget, connectWS, setupDialogAutoHandler, extractTablesAsRows, extractChunkedText, waitForDOMPredicate, sleep } = require('../lib/scraper/cdp.js');
const { emitResult } = require('../lib/system/progress.js');
const { updateScrapedRegistry } = require('../lib/catalog/registry.js');
const { parseProductMeta } = require('../lib/catalog/product_meta.js');

const PROJECT_ROOT  = path.resolve(__dirname, '..', '..');
const OUTPUTS_ROOT  = path.join(PROJECT_ROOT, 'outputs');
const JSON_MODE     = process.argv.includes('--json');

function _readCliFlagValue(argv, flagName) {
  const args = Array.isArray(argv) ? argv : [];
  const prefix = `${flagName}=`;
  for (let i = 0; i < args.length; i += 1) {
    const token = String(args[i] || '');
    if (token.startsWith(prefix)) {
      return token.slice(prefix.length).trim() || null;
    }
    if (token === flagName && i + 1 < args.length) {
      const nextToken = String(args[i + 1] || '').trim();
      return nextToken && !nextToken.startsWith('--') ? nextToken : null;
    }
  }
  return null;
}

function _parseCliArgs(argv = process.argv) {
  const args = Array.isArray(argv) ? argv : [];
  const rawChassis = _readCliFlagValue(args, '--chassis');
  const rawQuery = _readCliFlagValue(args, '--query');
  const targetChassisQuery = rawChassis ? rawChassis.replace(/_/g, ' ') : (rawQuery || '');
  const isRecoverMode = args.includes('--recover') || args.includes('--fresh');
  const navQuery = targetChassisQuery || 'Alletra';
  const vendor = _readCliFlagValue(args, '--vendor') || 'HPE';
  const portalUrl = _readCliFlagValue(args, '--portal-url') || null;
  return { targetChassisQuery, isRecoverMode, navQuery, vendor, portalUrl };
}

async function extractWizardSubTab(ws, step, index, total, allTables, dropdownSKUs) {
  console.log(`\n  • Sub-tab ${index + 1}/${total}: "${step.text}"...`);

  await sendCommand(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const el = document.querySelector('a[href="' + ${JSON.stringify(step.href)} + '"]') || document.getElementById(${JSON.stringify(step.id)});
      if (el) el.click();
    })()`,
    returnByValue: true
  });

  await waitForDOMPredicate(ws, `(() => {
    const busy = Array.from(document.querySelectorAll('.loading_div, .maui-loading-div, .toolbar_loading, .dqe-loading'))
      .some(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none');
    return !busy;
  })()`, 30000, 300);
  await sleep(1000);

  const stepDataRes = await sendCommand(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const panel = document.querySelector(${JSON.stringify(step.href)});
      const text = panel ? panel.innerText : '';

      const tables = panel ? Array.from(panel.querySelectorAll('table')).map((t, idx) => {
        const rows = [];
        t.querySelectorAll('tr').forEach(tr => {
          const cells = [];
          tr.querySelectorAll('td, th').forEach(cell => cells.push(cell.innerText.trim()));
          if (cells.length > 0) rows.push(cells);
        });
        return { tableIndex: idx, subTab: ${JSON.stringify(step.text)}, rowCount: rows.length, rows };
      }) : [];

      const selects = panel ? Array.from(panel.querySelectorAll('select')).map(s => {
        const label = s.closest('div, tr, td')?.innerText.substring(0, 120).replace(/\\n/g, ' ').trim() || ${JSON.stringify(step.text)};
        const options = Array.from(s.options).map(o => ({
          text: o.text.trim(),
          value: o.value
        })).filter(o => o.text && o.text !== 'None.' && !o.text.startsWith('Please make a selection'));

        return { id: s.id, label, options };
      }) : [];

      return JSON.stringify({ text, tables, selects });
    })()`,
    returnByValue: true
  });

  const stepData = JSON.parse(stepDataRes.result.value);
  stepData.tables.forEach(t => allTables.push(t));

  stepData.selects.forEach(sel => {
    if (sel.options.length > 0) {
      const rows = [['Product #', 'Description', 'Quantity', 'Price (USD)']];
      sel.options.forEach(opt => {
        const pnMatch = opt.text.match(/\(([A-Z0-9-]{5,15})\)/) || opt.text.match(/\b([A-Z0-9]{3}[A-Z0-9-]{2,20}[A-Z0-9])\b/);
        const pn = pnMatch ? pnMatch[1] : '';
        const desc = opt.text.replace(/\([A-Z0-9-]{5,15}\)\s*/, '').trim();

        if (pn) {
          rows.push([pn, desc || opt.text, '0', '0.00']);
          dropdownSKUs.push({ subTab: step.text, label: sel.label, pn, desc });
        }
      });

      if (rows.length > 1) {
        allTables.push({
          tableIndex: allTables.length,
          subTab: step.text,
          label: sel.label,
          rowCount: rows.length,
          rows
        });
      }
    }
  });

  console.log(`    Extracted ${stepData.tables.length} tables, ${stepData.selects.length} option dropdowns.`);
  return `\n\n=== ${step.text} ===\n\n` + stepData.text;
}

function _auditStorageStagingArtifacts(outputDir, liveOutputDir, meta, catalogJson, catalogXlsx, options = {}) {
  console.log('\n--- STEP 6: Staging Post-Flight Quality Audit ---');
  try {
    if (!options.skipExcelTallyVerify) {
      execSync(
        `node "${path.join(PROJECT_ROOT, 'tests', 'integration', 'verify_excel_tally.js')}" "${catalogXlsx}"`,
        { stdio: 'inherit', cwd: PROJECT_ROOT }
      );
    }
    const stagingCatalogContent = JSON.parse(fs.readFileSync(catalogJson, 'utf-8'));
    const skuCount = stagingCatalogContent.metadata?.totalUniqueSKUs || 0;
    const entriesCount = Array.isArray(stagingCatalogContent.entries) ? stagingCatalogContent.entries.length : 0;
    if (!stagingCatalogContent.metadata || skuCount <= 0) {
      throw new Error(`Pre-Promotion Schema Guard Failed: totalUniqueSKUs is ${skuCount} (must be > 0).`);
    }
    if (entriesCount === 0) {
      throw new Error(`Pre-Promotion Schema Guard Failed: entries[] is empty or not an array.`);
    }
    const captureReceipt = require('../lib/catalog/catalog_capture_receipt.js').createCaptureReceipt(
      outputDir,
      liveOutputDir,
      meta.cleanName,
      { solutionDomain: 'STORAGE', skipCoverageValidation: options.skipCoverageValidation === true }
    );
    if (captureReceipt) {
      if (options.vendor) captureReceipt.vendor = options.vendor;
      if (options.portalUrl) captureReceipt.portalUrl = options.portalUrl;
    }
    console.log('✅ Staging audit passed 100%! Ready to promote to live workspace.');
    return captureReceipt;
  } catch (e) {
    if (options.throwOnAuditFailure) throw e;
    const failedStagingDir = path.join(OUTPUTS_ROOT, 'temp', `failed_staging_${meta.cleanName}_${Date.now()}`);
    console.error('❌ STAGING POST-FLIGHT AUDIT FAILED:', e.message);
    console.error(`🛡️ Live workspace intact! Preserving failed staging for audit inspection at: ${failedStagingDir}`);
    try { fs.renameSync(outputDir, failedStagingDir); } catch (_) {}
    process.exit(1);
  }
}

async function _runStoragePostPromotionSyncAndVerify(liveOutputDir, meta, captureReceipt, options = {}) {
  const liveCatalogJson = path.join(liveOutputDir, `${meta.cleanName}_Catalog.json`);
  const liveServicesJson = path.join(liveOutputDir, `${meta.cleanName}_Services.json`);
  const diffSummaryMdPath = path.join(liveOutputDir, `${meta.cleanName}_Catalog_Diff_Summary.md`);
  const {
    summarizeCatalogDiffState,
    writeCatalogDiffSummaryMarkdown,
    runScrapingPostflightVerification
  } = require('../lib/scraper/scraping_preflight_gate.js');

  const diffSummary = summarizeCatalogDiffState(
    liveCatalogJson,
    fs.existsSync(liveServicesJson) ? liveServicesJson : null
  );
  writeCatalogDiffSummaryMarkdown(
    diffSummaryMdPath,
    meta,
    diffSummary,
    diffSummary.hwSkuCount,
    diffSummary.serviceSkuCount
  );

  let postFlowSyncResult = null;
  try {
    const { triggerPostFlowSyncAsync } = require('../lib/sync/post_flow_sync.js');
    const cloudConfigured = Boolean(options.preflightReport?.product?.notebookId);
    postFlowSyncResult = await triggerPostFlowSyncAsync(meta.cleanName, 'SCRAPE', {
      autoUploadNLM: cloudConfigured,
      syncRunningKnowledge: cloudConfigured,
      confirmSourceRetirement: !process.argv.includes('--keep-stale-sources'),
      ...options.syncOptions
    });
  } catch (syncErr) {
    console.warn('Warning during storage triggerPostFlowSyncAsync:', syncErr.message);
    postFlowSyncResult = { success: false, error: syncErr.message };
  }

  if (captureReceipt) {
    require('../lib/catalog/catalog_capture_receipt.js').finalizeCaptureReceipt(
      liveOutputDir,
      captureReceipt,
      postFlowSyncResult
    );
  }

  const hwSkuCount = diffSummary.hwSkuCount || 0;
  const serviceSkuCount = diffSummary.serviceSkuCount || 0;
  runScrapingPostflightVerification({
    liveOutputDir,
    liveCatalogJson,
    meta,
    hwSkuCount,
    serviceSkuCount,
    totalSkuCount: hwSkuCount + serviceSkuCount,
    conditionalSkusCount: 0,
    postFlowSyncResult,
    preflightReport: options.preflightReport || null,
    qualityPassed: true,
    vendor: options.vendor || 'HPE',
    portalUrl: options.portalUrl || null
  });
}

async function auditAndPromoteStorageStaging(outputDir, meta, catalogJson, catalogXlsx, options = {}) {
  const liveOutputDir = options.liveOutputDir || path.join(OUTPUTS_ROOT, meta.family, meta.gen, meta.cleanName);
  const captureReceipt = _auditStorageStagingArtifacts(outputDir, liveOutputDir, meta, catalogJson, catalogXlsx, options);

  console.log('\n--- STEP 7: Promoting Staging to Live Workspace & Master Knowledge Sync ---');
  const { promoteStagingDirectory } = require('../lib/system/fs_compat.js');
  promoteStagingDirectory(outputDir, liveOutputDir);
  await _runStoragePostPromotionSyncAndVerify(liveOutputDir, meta, captureReceipt, options);
  return liveOutputDir;
}

async function _connectStorageOcaTarget(navQuery) {
  try {
    return await getOCATarget();
  } catch (err) {
    console.log(`⚠️ Active Storage OCA tab not found: ${err.message}`);
    console.log(`🧭 Attempting smart auto-navigation via Partner Portal...`);
    try {
      const { navigateToOCAChassis } = require('../lib/scraper/navigate_oca.js');
      await navigateToOCAChassis(navQuery || 'Alletra');
      return await getOCATarget();
    } catch (navErr) {
      throw new Error(`Auto-navigation failed: ${navErr.message}\nOriginal CDP error: ${err.message}`);
    }
  }
}

async function main() {
  console.log('================================================================');
  console.log('📦 HPE STORAGE SOLUTION WIZARD SCRAPER (Alletra / Nimble / MSA)');
  console.log('================================================================\n');

  const { targetChassisQuery, navQuery, vendor, portalUrl } = _parseCliArgs();
  const resolvedVendor = vendor || 'HPE';
  const resolvedPortalUrl = portalUrl || null;
  const skipCloudCheck = process.argv.includes('--skip-cloud-check') || process.argv.includes('--offline');
  const { runScrapingPreflightGate } = require('../lib/scraper/scraping_preflight_gate.js');
  const preflightReport = await runScrapingPreflightGate({
    targetChassisQuery,
    navQuery,
    skipCloudCheck,
    vendor: resolvedVendor,
    portalUrl: resolvedPortalUrl
  });

  const pageTarget = await _connectStorageOcaTarget(navQuery);
  console.log(`Connecting via CDP to target: ${pageTarget.id} (${pageTarget.title})...`);
  const ws = await connectWS(pageTarget.webSocketDebuggerUrl);

  let outputDir = '';
  let meta = {};
  let heading = '';
  let pdfDestPath = null;
  let allTables = [];
  let combinedFullText = '';

  try {
    // Enable automated JS dialog & WebLogic modal prompt handler
    await setupDialogAutoHandler(ws);

    // STEP 1: Navigate to Storage Node & Solution Wizard tab if not active
    console.log('\n--- STEP 1: Locating Storage Solution Wizard Tab ---');
    await sendCommand(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const node = Array.from(document.querySelectorAll('.fancytree-title')).find(
          n => n.innerText && (n.innerText.includes('Alletra') || n.innerText.includes('Storage') || n.innerText.includes('Nimble') || n.innerText.includes('MSA') || n.innerText.includes('StoreOnce'))
        );
        if (node) {
          node.click();
          node.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
        }
      })()`,
      returnByValue: true
    });

    await sleep(3500);

    await sendCommand(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const wizardLink = document.querySelector('a[href*="solutionWizard"], #ui-id-113') ||
                           Array.from(document.querySelectorAll('a')).find(a => a.innerText.trim() === 'Solution Wizard');
        if (wizardLink) wizardLink.click();
      })()`,
      returnByValue: true
    });

    await sleep(3500);

    const subTabsRes = await sendCommand(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const tabs = Array.from(document.querySelectorAll(
          '#tabs_alletra_5000_wizard .wizard_tabs li a, .wizardTabRoot .wizard_tabs li a, ul.wizard_tabs li a, [class*="wizard_tabs"] a'
        ));
        return tabs.map(t => ({ id: t.id, text: t.innerText.trim(), href: t.getAttribute('href') }));
      })()`,
      returnByValue: true
    });

    const subTabs = subTabsRes.result.value || [];
    console.log(`Discovered ${subTabs.length} Storage Wizard Sub-Tabs:`, subTabs.map(t => t.text));

    const dropdownSKUs = [];

    // STEP 2: Iterate through each Storage Wizard sub-tab
    if (subTabs.length > 0) {
      console.log('\n--- STEP 2: Iterating Wizard Sub-Tabs & Extracting SKUs ---');
      for (let i = 0; i < subTabs.length; i++) {
        combinedFullText += await extractWizardSubTab(ws, subTabs[i], i, subTabs.length, allTables, dropdownSKUs);
      }
    } else {
      console.log('No wizard sub-tabs found — performing standard page extraction...');
      const extractedText = await extractChunkedText(ws, 50000);
      combinedFullText = extractedText.fullText;
      const extractedTables = await extractTablesAsRows(ws);
      extractedTables.forEach(t => allTables.push({ ...t, subTab: 'Storage' }));
    }

    // STEP 3: Detect Metadata & Save Output
    console.log('\n--- STEP 3: Saving Raw Storage Scrape Data ---');
    const headingRes = await sendCommand(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const heading = document.querySelector('#solution_title, .solution-name, h1, h2')?.innerText.trim() || document.title;
        const qsLink  = document.querySelector('a[href*="quickspec"], a.qs-link-a')?.href || '';
        return JSON.stringify({ heading, qsLink });
      })()`,
      returnByValue: true
    });

    const parsedHeading = JSON.parse(headingRes.result.value);
    heading = parsedHeading.heading;
    const qsLink = parsedHeading.qsLink;

    meta = parseProductMeta(heading, pageTarget.title);

    console.log(`Family: "${meta.family}", Gen: "${meta.gen}", Chassis: "${meta.cleanName}"`);

    const stagingDir = path.join(OUTPUTS_ROOT, 'temp', `staging_${meta.cleanName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}`);
    outputDir = stagingDir;

    console.log(`\n🛡️ Staging Isolation Active: Scraping & building inside temporary staging directory:`);
    console.log(`   ${stagingDir}`);

    const rawDir = path.join(outputDir, 'raw_data');
    fs.mkdirSync(rawDir, { recursive: true });

    await _persistStorageRawCapture({
      rawDir,
      ws,
      sendCommand,
      meta,
      heading,
      resolvedVendor,
      resolvedPortalUrl,
      pageTarget,
      qsLink,
      combinedFullText,
      allTables,
      subTabs,
      dropdownSKUs
    });
    console.log(`Raw storage data saved atomically to staging: ${path.join(rawDir, 'oca_raw_data_full.json')}`);

    // STEP 4: QuickSpecs Download
    if (qsLink) {
      console.log(`\n--- STEP 4: QuickSpecs PDF Download ---`);
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
    try { ws.close(); } catch (e) { console.warn('Caught suppressed error in scrape_oca_storage_solution.js:', e); }
  }

  // STEP 5: Build Catalog & Generate Excel
  console.log('\n--- STEP 5: Classification Engine & Excel Generation in Staging ---');
  const catalogJson = path.join(outputDir, `${meta.cleanName}_Catalog.json`);
  const catalogXlsx = path.join(outputDir, `${meta.cleanName}_OCA_Catalog.xlsx`);
  const rawJsonPath = path.join(outputDir, 'raw_data', 'oca_raw_data_full.json');

  execSync(
    `node "${path.join(PROJECT_ROOT, 'scripts', 'catalogs', 'build_catalog.js')}" "${rawJsonPath}" "${catalogJson}" --verbose`,
    { stdio: 'inherit', cwd: PROJECT_ROOT }
  );
  execSync(
    `node "${path.join(PROJECT_ROOT, 'scripts', 'catalogs', 'generate_xlsx.js')}" "${catalogXlsx}"`,
    { stdio: 'inherit', cwd: PROJECT_ROOT }
  );

  // STEP 6 & 7: Audit, Promote, Sync and Emit
  await _finalizeStorageWorkspaceAndEmit({
    outputDir,
    meta,
    catalogJson,
    catalogXlsx,
    preflightReport,
    resolvedVendor,
    resolvedPortalUrl,
    heading,
    pdfDestPath,
    allTables,
    combinedFullText
  });
}

async function _persistStorageRawCapture({
  rawDir,
  ws,
  sendCommand,
  meta,
  heading,
  resolvedVendor,
  resolvedPortalUrl,
  pageTarget,
  qsLink,
  combinedFullText,
  allTables,
  subTabs,
  dropdownSKUs
}) {
  const { verifyExpectedCatalogColumns } = require('../lib/scraper/catalog_tab_capture.js');
  const columnCoverage = await verifyExpectedCatalogColumns(ws, sendCommand);
  const baseSkuMatch = `${heading || ''} ${combinedFullText.slice(0, 4000)}`.match(/\b([A-Z0-9]{5,8}(?:-[A-Z0-9]{2,4})?)\b/);
  const { getChassisMap } = require('../lib/catalog/catalog_discovery.js');
  const mapEntry = getChassisMap()[meta.cleanName];
  const selectedBaseSku = mapEntry?.baseSku || (baseSkuMatch ? baseSkuMatch[1] : null) || meta.cleanName;

  const rawJsonPath = path.join(rawDir, 'oca_raw_data_full.json');
  const rawData = {
    timestamp:   new Date().toISOString(),
    vendor:      resolvedVendor,
    ...(resolvedPortalUrl ? { portalUrl: resolvedPortalUrl } : {}),
    pageTitle:   pageTarget.title,
    url:         pageTarget.url,
    nodeText:    heading,
    qsLink,
    selectedBaseSku,
    baseSku: selectedBaseSku,
    ownerProduct: meta.cleanName,
    ownerConfiguration: heading || meta.cleanName,
    solutionDomain: 'STORAGE',
    observedSelectors: subTabs.map((t) => ({ selector: t.href || t.id, label: t.text, value: 'VISITED' })),
    finalSelectorsRestored: true,
    columnCoverage,
    textLength:  combinedFullText.length,
    fullText:    combinedFullText,
    tables:      allTables,
    tableCount:  allTables.length,
    dropdownSKUs
  };

  const { safeWriteJsonAtomic } = require('../lib/system/fs_compat.js');
  safeWriteJsonAtomic(rawJsonPath, rawData);
}

async function _finalizeStorageWorkspaceAndEmit({
  outputDir,
  meta,
  catalogJson,
  catalogXlsx,
  preflightReport,
  resolvedVendor,
  resolvedPortalUrl,
  heading,
  pdfDestPath,
  allTables,
  combinedFullText
}) {
  const liveOutputDir = await auditAndPromoteStorageStaging(outputDir, meta, catalogJson, catalogXlsx, {
    preflightReport,
    vendor: resolvedVendor,
    portalUrl: resolvedPortalUrl
  });

  const liveCatalogJson = path.join(liveOutputDir, `${meta.cleanName}_Catalog.json`);
  const liveCatalogXlsx = path.join(liveOutputDir, `${meta.cleanName}_OCA_Catalog.xlsx`);
  const livePdfPath    = pdfDestPath ? path.join(liveOutputDir, path.basename(pdfDestPath)) : null;
  const actualPdfPath  = livePdfPath && fs.existsSync(livePdfPath) ? livePdfPath : null;

  updateScrapedRegistry({
    timestamp:    new Date().toISOString(),
    solutionName: heading,
    family:       meta.family,
    gen:          meta.gen,
    chassisName:  meta.cleanName,
    outputDir:    liveOutputDir,
    jsonPath:     liveCatalogJson,
    xlsxPath:     liveCatalogXlsx,
    pdfPath:      actualPdfPath,
    tablesCount:  allTables.length,
    textLength:   combinedFullText.length
  });

  try {
    execSync(`node "${path.join(PROJECT_ROOT, 'scripts', 'catalogs', 'sync_all_registered_catalogs.js')}"`, { stdio: 'inherit', cwd: PROJECT_ROOT });
  } catch (syncErr) {
    console.warn('Warning during sync_all_registered_catalogs execution:', syncErr.message);
  }

  try { if (fs.existsSync(outputDir)) fs.rmSync(outputDir, { recursive: true, force: true }); } catch { /* ignore cleanup error */ }

  if (JSON_MODE) {
    emitResult('SUCCESS', {
      vendor: resolvedVendor,
      portalUrl: resolvedPortalUrl,
      solutionName: heading,
      family: meta.family,
      gen: meta.gen,
      chassisName: meta.cleanName,
      outputDir: liveOutputDir,
      jsonPath: liveCatalogJson,
      xlsxPath: liveCatalogXlsx,
      pdfPath: actualPdfPath,
      tablesCount: allTables.length
    });
    return;
  }

  console.log('\n================================================================');
  console.log('🎉 STORAGE SCRAPER COMPLETED — Live Workspace Updated:');
  console.log(`   ${liveOutputDir}`);
  console.log('================================================================\n');
}

if (require.main === module) {
  main().catch(err => {
    if (JSON_MODE) {
      emitResult('ERROR', {}, err.message || String(err));
    } else {
      console.error('\n❌ STORAGE SCRAPER ERROR:', err.message || err);
    }
    process.exit(1);
  });
}

module.exports = {
  _parseCliArgs,
  auditAndPromoteStorageStaging,
  main
};
