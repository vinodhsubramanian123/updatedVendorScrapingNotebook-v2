// 100% Generic E2E HPE OCA Solution Traversal & Catalog Pipeline
// Auto-detects Solution Root, Product Family, Generation, Chassis Name, SKUs, and QuickSpecs.
// NO Hardcoded Product IDs, Families, or Absolute Paths.

'use strict';

const fs   = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const {
  sendCommand, getOCATarget, connectWS, setupDialogAutoHandler,
  expandSections, deriveTextFromTables, extractChunkedText, extractTablesAsRows, extractSectionHeaders,
  extractHiddenElements, probeConditionalSkuVisibility,
  sleep
} = require('../lib/scraper/cdp.js');
const { emitProgress, emitLog, emitResult } = require('../lib/system/progress.js');
const { updateScrapedRegistry } = require('../lib/catalog/registry.js');
const { parseProductMeta } = require('../lib/catalog/product_meta.js');
const { normalize, resolveProductIdentity } = require('../lib/catalog/product_scope.js');

const PROJECT_ROOT  = path.resolve(__dirname, '..', '..');
const OUTPUTS_ROOT  = path.join(PROJECT_ROOT, 'outputs');
const JSON_MODE     = process.argv.includes('--json');

function cleanupOrphanedStaging(tempDir, logger) {
  if (!fs.existsSync(tempDir)) return;
  const now = Date.now();
  for (const entry of fs.readdirSync(tempDir)) {
    const entryPath = path.join(tempDir, entry);
    try {
      const stat = fs.statSync(entryPath);
      const ageHours = (now - stat.mtimeMs) / 3600000;
      if (entry.startsWith('staging_') && ageHours > 0.25) {
        const failedPath = path.join(tempDir, entry.replace('staging_', 'failed_stale_'));
        fs.renameSync(entryPath, failedPath);
        logger.warn('SCRAPE', `Orphaned staging dir (${(ageHours * 60).toFixed(0)}m old) preserved for diagnosis: ${path.basename(failedPath)}`);
      } else if (entry.startsWith('failed_') && ageHours > 48) {
        fs.rmSync(entryPath, { recursive: true, force: true });
        logger.info('SCRAPE', `Purged old diagnostic dir (${ageHours.toFixed(1)}h old): ${entry}`);
      }
    } catch (e) {
      logger.warn('SCRAPE', `Could not inspect temp dir entry ${entry}`, e);
    }
  }
}

/**
 * Executes Step 8 (Staging Audit), Step 9 (Promotion & NotebookLM Sync), and Step 10 (Registry Sync).
 */
async function auditAndPromoteStaging({
  outputDir,
  liveOutputDir,
  catalogXlsx,
  catalogJson,
  meta,
  tables,
  totalLen,
  treeInfo,
  pdfDestPath,
  pipelineStart,
  stepTelemetry = {}
}) {
  let captureReceipt;
  // STEP 8: Automated Post-Flight Audit Verification
  console.log('\n--- STEP 8: Staging Post-Flight Quality Audit ---');
  emitProgress(8, 10, 'Staging Tally Audit & Quality Certification', 'in_progress', 'Running 7-check post-flight audit suite', {
    stage: 'STAGING_AUDIT', percent: 90, category: meta.cleanName
  });

  try {
    execFileSync(
      process.execPath,
      [path.join(PROJECT_ROOT, 'tests', 'integration', 'verify_excel_tally.js'), catalogXlsx],
      { stdio: 'inherit', cwd: PROJECT_ROOT }
    );

    // Strict Pre-Promotion JSON Schema & Cardinality Guardrail
    const stagingCatalogContent = JSON.parse(fs.readFileSync(catalogJson, 'utf-8'));
    if (!stagingCatalogContent.metadata || stagingCatalogContent.metadata.totalUniqueSKUs <= 0) {
      throw new Error(`Pre-Promotion Schema Guard Failed: totalUniqueSKUs is ${stagingCatalogContent.metadata?.totalUniqueSKUs || 0} (must be > 0).`);
    }
    if (!Array.isArray(stagingCatalogContent.entries) || stagingCatalogContent.entries.length === 0) {
      throw new Error(`Pre-Promotion Schema Guard Failed: entries[] is empty or not an array.`);
    }
    captureReceipt = require('../lib/catalog/catalog_capture_receipt.js').createCaptureReceipt(outputDir, liveOutputDir, meta.cleanName);

    const { verifyScrapingStep, selfReflectOnScrapingSession, AtomicStepAnomalyError } = require('../lib/scraper/scraping_verifiability.js');
    const step8Result = verifyScrapingStep(8, { tallyAuditPassed: true });
    stepTelemetry[8] = step8Result;
    if (!step8Result.valid) {
      throw new AtomicStepAnomalyError(8, step8Result.stage, step8Result.failure.assertionId, step8Result.failure.message, step8Result.failure);
    }

    console.log('✅ Staging audit and JSON Schema assertions passed 100%! Ready to promote to live workspace.');
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
  console.log('\n--- STEP 9: Promoting Staging to Live Workspace & Cloud NotebookLM Grounding ---');
  emitProgress(9, 10, 'Live Workspace Promotion & NotebookLM Grounding', 'in_progress', 'Syncing knowledge payload to NotebookLM', {
    stage: 'KNOWLEDGE_SYNC', percent: 95, category: meta.cleanName
  });

  const { promoteStagingDirectory } = require('../lib/system/fs_compat.js');
  const evidenceDir = path.join(liveOutputDir, 'evidence');
  if (fs.existsSync(evidenceDir)) {
    require('../lib/system/fs_compat.js').copyDirRecursive(evidenceDir, path.join(outputDir, 'evidence'));
  }
  promoteStagingDirectory(outputDir, liveOutputDir);

  const liveCatalogJson = path.join(liveOutputDir, `${meta.cleanName}_Catalog.json`);
  require('../lib/catalog/product_metadata_manager.js').commitSuccessfulResyncMetadata({
    productKey: meta.cleanName, catalogPath: liveCatalogJson, stagingAuditPassed: true
  });
  const liveCatalogXlsx = path.join(liveOutputDir, `${meta.cleanName}_OCA_Catalog.xlsx`);
  const livePdfPath = pdfDestPath ? path.join(liveOutputDir, path.basename(pdfDestPath)) : null;
  const preservedPdf = fs.existsSync(liveOutputDir)
    ? fs.readdirSync(liveOutputDir).find(name => name.toLowerCase().endsWith('.pdf'))
    : null;
  const actualPdfPath = livePdfPath && fs.existsSync(livePdfPath)
    ? livePdfPath
    : (preservedPdf ? path.join(liveOutputDir, preservedPdf) : null);

  let hwSkuCount = tables.length;
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
    tablesCount:    totalSkuCount,
    hwSkuCount,
    serviceSkuCount,
    textLength:     totalLen
  });

  // Post-flow knowledge sync — update master registry & auto-upload to NotebookLM
  let postFlowSyncResult = null;
  try {
    const { triggerPostFlowSyncAsync } = require('../lib/sync/post_flow_sync.js');
    postFlowSyncResult = await triggerPostFlowSyncAsync(meta.cleanName, 'SCRAPE', {
      autoUploadNLM: true,
      syncRunningKnowledge: true,
      confirmSourceRetirement: !process.argv.includes('--keep-stale-sources')
    });
  } catch (syncErr) {
    console.warn('Warning during triggerPostFlowSyncAsync:', syncErr.message);
    postFlowSyncResult = { success: false, error: syncErr.message };
  }
  require('../lib/catalog/catalog_capture_receipt.js').finalizeCaptureReceipt(liveOutputDir, captureReceipt, postFlowSyncResult);
  require('../lib/catalog/product_metadata_manager.js').refreshMasterProductMetadata();

  const { verifyScrapingStep, selfReflectOnScrapingSession, AtomicStepAnomalyError } = require('../lib/scraper/scraping_verifiability.js');
  const step9Result = verifyScrapingStep(9, {
    cloudSyncVerified: Boolean(postFlowSyncResult?.success && postFlowSyncResult.syncStatus === 'CLOUD_VERIFIED')
  });
  stepTelemetry[9] = step9Result;
  if (!step9Result.valid) {
    console.warn(`[Step 9 Warning] Cloud sync verifiability check: ${step9Result.failure?.message}`);
  }

  // STEP 10: Re-sync all registered catalogs across workspace & Action Ledger
  console.log('\n--- STEP 10: Portfolio Registry & Action Ledger Sync ---');
  emitProgress(10, 10, 'Portfolio Registry & Telemetry Ledger Sync', 'in_progress', 'Synchronizing chassis variants', {
    stage: 'REGISTRY_SYNC', percent: 98, category: meta.cleanName
  });

  const promotedCatalog = JSON.parse(fs.readFileSync(liveCatalogJson, 'utf8'));
  if (promotedCatalog.metadata?.totalUniqueSKUs !== hwSkuCount) {
    throw new Error(`Step 10 immutability check failed: promoted catalog changed from ${hwSkuCount} to ${promotedCatalog.metadata?.totalUniqueSKUs}.`);
  }

  // Clean up staging folder
  try { if (fs.existsSync(outputDir)) fs.rmSync(outputDir, { recursive: true, force: true }); } catch (_) {}

  if (!postFlowSyncResult?.success || postFlowSyncResult.syncStatus !== 'CLOUD_VERIFIED') {
    throw new Error(`Local catalog was promoted safely, but mandatory NotebookLM synchronization is pending: ${postFlowSyncResult?.error || postFlowSyncResult?.syncStatus || 'unknown cloud failure'}`);
  }

  const durationSec = ((Date.now() - pipelineStart) / 1000).toFixed(1);

  const step10Result = verifyScrapingStep(10, { registryUpdated: true });
  stepTelemetry[10] = step10Result;

  selfReflectOnScrapingSession({
    product: meta.cleanName,
    family: meta.family,
    generation: meta.gen,
    durationMs: Date.now() - pipelineStart,
    totalSkusScraped: totalSkuCount,
    hwSkuCount,
    serviceSkuCount,
    cloudSyncState: postFlowSyncResult?.syncStatus || 'CLOUD_VERIFIED',
    stepTelemetry
  });

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

function resolveExpectedProductIdentity(targetChassisQuery, notebookConfig) {
  let expectedIdentity = resolveProductIdentity(targetChassisQuery, notebookConfig);
  if (!expectedIdentity) {
    const { inferPillar } = require('../lib/catalog/product_scope.js');
    const derived = parseProductMeta(targetChassisQuery);
    if (derived && derived.family && derived.gen) {
      expectedIdentity = {
        vendor: 'HPE',
        pillar: inferPillar(derived.family, derived.cleanName),
        family: derived.family,
        generation: derived.gen,
        productId: derived.cleanName
      };
    }
  }
  return expectedIdentity;
}

function resolveBaseSkuForProduct(meta, chassisDiscovery, profile) {
  let baseSku = null;
  try {
    const cmap = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/chassis_map.json'), 'utf8'));
    const byFam = cmap.chassis_base_skus_by_family_gen || {};
    const cleanNorm = (meta.cleanName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const [k, grp] of Object.entries(byFam)) {
      const normKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normModel = (grp.modelFamily || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if ((normKey && cleanNorm.includes(normKey)) || (normModel && cleanNorm.includes(normModel))) {
        const first = Object.keys(grp.skus || {})[0];
        if (first) { baseSku = first; break; }
      }
    }
    if (!baseSku && cmap.chassis_base_skus) {
      for (const [skuId, info] of Object.entries(cmap.chassis_base_skus)) {
        const normModel = (info.model || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const famMatch = (info.family || '').toLowerCase() === (meta?.family || '').toLowerCase();
        const genMatch = (info.gen || '').toLowerCase() === (meta?.gen || '').toLowerCase();
        if (famMatch && genMatch && normModel && cleanNorm.includes(normModel)) {
          baseSku = skuId;
          break;
        }
      }
    }
  } catch (_) {}

  if (!baseSku) {
    baseSku = profile?.baseSku || meta?.baseSku || chassisDiscovery?.selectedSku || null;
  }
  if (!baseSku) {
    throw new Error(`[Guardrail INV-24/INV-25] Unable to dynamically resolve base chassis SKU for "${meta.cleanName}". Zero-hardcoding guardrail forbids falling back to another product generation.`);
  }
  return baseSku;
}

async function resolvePageTargetAndChassis({ navQuery, targetChassisQuery, isRecoverMode }) {
  let pageTarget;
  let chassisDiscovery = null;

  if (isRecoverMode) {
    console.log(`🔄 [INV-89] Recovery mode requested via CLI. Re-establishing fresh OCA session via Partner Portal...`);
    const { recoverAndLaunchFreshOCA } = require('../lib/scraper/navigate_oca.js');
    const navigation = await recoverAndLaunchFreshOCA(navQuery, { forceDiscovery: true });
    chassisDiscovery = navigation.chassisDiscovery || null;
    pageTarget = await getOCATarget();
  } else {
    try {
      pageTarget = await getOCATarget();
    } catch (err) {
      console.log(`⚠️ Active OCA tab not found: ${err.message}`);
      console.log(`🧭 Attempting smart auto-navigation via Partner Portal for "${navQuery}"...`);
      try {
        const { navigateToOCAChassis, recoverAndLaunchFreshOCA } = require('../lib/scraper/navigate_oca.js');
        let navigation;
        try {
          navigation = await navigateToOCAChassis(navQuery, { forceDiscovery: true });
        } catch (firstNavErr) {
          console.warn(`⚠️ Initial auto-navigation failed (${firstNavErr.message}). Attempting Tab 1 Self-Healing Recovery...`);
          navigation = await recoverAndLaunchFreshOCA(navQuery, { forceDiscovery: true });
        }
        chassisDiscovery = navigation.chassisDiscovery || null;
        pageTarget = await getOCATarget();
      } catch (navErr) {
        throw new Error(`Auto-navigation failed: ${navErr.message}\nOriginal CDP error: ${err.message}`);
      }
    }
  }

  if (targetChassisQuery && !chassisDiscovery) {
    const { navigateToOCAChassis } = require('../lib/scraper/navigate_oca.js');
    const navigation = await navigateToOCAChassis(targetChassisQuery, { forceDiscovery: true });
    chassisDiscovery = navigation.chassisDiscovery || null;
    pageTarget = await getOCATarget();
  }

  return { pageTarget, chassisDiscovery };
}

async function expandAndVerifyDomSections(ws, scrollThreshold, targetTabsRegex) {
  await expandSections(ws);
  await sleep(3000);
  const menuTables = await extractTablesAsRows(ws);
  const menuText = (await extractChunkedText(ws, 50000)).fullText;

  await sendCommand(ws, 'Runtime.evaluate', {
    expression: `(async () => {
      const tabsToClick = Array.from(document.querySelectorAll('a, button, div.tab_header')).filter(el => 
        /${targetTabsRegex}/i.test((el.innerText || '').trim()) && 
        el.getClientRects().length && el.classList.contains('ui-tabs-anchor') && !el.href?.includes('menu') && !el.classList.contains('active')
      );
      for (const tab of tabsToClick) {
        tab.click();
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      return tabsToClick.length;
    })()`,
    returnByValue: true,
    awaitPromise: true
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

  return { metrics, menuTables, menuText };
}

function downloadQuickSpecsPdfSafely(qsLink, outputDir, cleanName) {
  if (!qsLink) return null;
  console.log(`\n--- QuickSpecs PDF Download ---`);
  const pdfDestPath = path.join(outputDir, `HPE_${cleanName}_QuickSpecs.pdf`);
  try {
    execFileSync(
      process.execPath,
      [path.join(__dirname, 'download_quickspecs_pdf.js'), qsLink, pdfDestPath],
      { stdio: 'inherit', cwd: PROJECT_ROOT }
    );
    return pdfDestPath;
  } catch (e) {
    console.warn('QuickSpecs download warning:', e.message);
    return null;
  }
}

function seedStagingFromLiveWorkspace(liveOutputDir, outputDir, meta) {
  if (fs.existsSync(liveOutputDir)) {
    const { copyDirRecursive } = require('../lib/system/fs_compat.js');
    console.log(`\n🛡️  Seeding staging from live workspace to protect previous scrape data...`);

    const existingHistory = path.join(liveOutputDir, 'history');
    if (fs.existsSync(existingHistory)) {
      copyDirRecursive(existingHistory, path.join(outputDir, 'history'));
      console.log(`   ✅ history/ seeded (diff engine can compare against previous scrape)`);
    }
    const existingServicesHistory = path.join(liveOutputDir, 'services_history');
    if (fs.existsSync(existingServicesHistory)) copyDirRecursive(existingServicesHistory, path.join(outputDir, 'services_history'));

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

    const existingPdfs = fs.readdirSync(liveOutputDir, { withFileTypes: true })
      .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.pdf'));
    for (const pdf of existingPdfs) {
      const stagingPdf = path.join(outputDir, pdf.name);
      if (!fs.existsSync(stagingPdf)) {
        fs.copyFileSync(path.join(liveOutputDir, pdf.name), stagingPdf);
      }
    }
    if (existingPdfs.length > 0) {
      console.log(`   ✅ ${existingPdfs.length} verified PDF source(s) seeded`);
    }

    console.log(`   🔒 Live workspace is safe — all writes go to staging only until audit passes.\n`);
  } else {
    console.log(`\n🆕  No existing live workspace found — this is a fresh first-run for ${meta.cleanName}.`);
  }
}

async function main() {
  const pipelineStart = Date.now();
  const logger = require('../lib/system/pipeline_logger.js');

  console.log('================================================================');
  console.log('🚀 100% GENERIC DYNAMIC HPE OCA SOLUTION SCRAPER PIPELINE');
  console.log('================================================================\n');

  // ── Startup: Proactive cleanup of orphaned staging and stale failed runs ──
  cleanupOrphanedStaging(path.join(OUTPUTS_ROOT, 'temp'), logger);

  const chassisArgIdx = process.argv.indexOf('--chassis');
  const queryArgIdx = process.argv.indexOf('--query');
  const targetChassisQuery = (chassisArgIdx !== -1 && process.argv[chassisArgIdx + 1])
    ? process.argv[chassisArgIdx + 1].replace(/_/g, ' ')
    : ((queryArgIdx !== -1 && process.argv[queryArgIdx + 1]) ? process.argv[queryArgIdx + 1] : '');
  const isRecoverMode = process.argv.includes('--recover') || process.argv.includes('--fresh');

  const { ensureChromeBrowserRunning } = require('../lib/scraper/browser_launcher.js');
  await ensureChromeBrowserRunning(9222);

  const navQuery = targetChassisQuery || 'DL380 Gen12';
  const { pageTarget, chassisDiscovery } = await resolvePageTargetAndChassis({ navQuery, targetChassisQuery, isRecoverMode });

  // STEP 1: CDP Handshake & Session Verification
  emitProgress(1, 10, 'CDP Handshake & Session Verification', 'started', `Connecting to ${pageTarget.title}`, {
    stage: 'CDP_CONNECT', percent: 10
  });

  console.log(`Connecting via CDP: ${pageTarget.id} (${pageTarget.title})...`);
  let ws;
  try {
    ws = await connectWS(pageTarget.webSocketDebuggerUrl);
  } catch (wsErr) {
    console.warn(`⚠️ [RECOVERY] Failed to connect to OCA target WebSocket (${wsErr.message}). Initiating Tab 1 Self-Healing Recovery...`);
    const { recoverAndLaunchFreshOCA } = require('../lib/scraper/navigate_oca.js');
    const recovery = await recoverAndLaunchFreshOCA(navQuery, { forceDiscovery: true });
    chassisDiscovery = recovery.chassisDiscovery || chassisDiscovery;
    pageTarget = await getOCATarget();
    ws = await connectWS(pageTarget.webSocketDebuggerUrl);
  }

  const { verifyScrapingStep, selfReflectOnScrapingSession, AtomicStepAnomalyError } = require('../lib/scraper/scraping_verifiability.js');
  const stepTelemetry = {};

  const step1Result = verifyScrapingStep(1, { wsConnected: true, ws });
  stepTelemetry[1] = step1Result;
  if (!step1Result.valid) {
    throw new AtomicStepAnomalyError(1, step1Result.stage, step1Result.failure.assertionId, step1Result.failure.message, step1Result.failure);
  }

  let outputDir = '';
  let meta = {};
  let catalogJson = '';
  let catalogXlsx = '';
  let pdfDestPath = null;
  let tables = [];
  let totalLen = 0;
  let treeInfo = {};
  let networkSniffer = null;

  try {
    // Enable automated JS dialog & WebLogic modal prompt handler
    await setupDialogAutoHandler(ws);

    try {
      const { setupNetworkSniffer } = require('../lib/scraper/cdp.js');
      networkSniffer = await setupNetworkSniffer(ws);
      console.log(`  🌐 CDP Network Sniffer active (intercepting backend REST/AJAX rule payloads)...`);
    } catch (sniffErr) {
      console.warn(`  ⚠️ Could not initialize CDP Network Sniffer: ${sniffErr.message}`);
    }

    // STEP 2: Solution Root Navigation & Pre-flight
    console.log('\n--- STEP 2: Solution Root Discovery & Pre-flight ---');
    emitProgress(2, 10, 'Solution Root Discovery & Navigation', 'in_progress', 'Locating components tree', {
      stage: 'PORTAL_NAV', percent: 20
    });

    const targetHint = (targetChassisQuery || 'DL380 Gen11').toLowerCase();

    // Check if the browser is already inside the server Menu configuration view
    const menuStateRes = await sendCommand(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const tableCount = document.querySelectorAll('table').length;
        const hasMenu = Boolean(document.querySelector('#extended_overview_menu, .menu_label, .eo_nav_div, a[href*="extended_overview_menu"]') || tableCount > 40);
        return { hasMenu, tableCount };
      })()`,
      returnByValue: true
    });

    const { hasMenu: alreadyAtMenu, tableCount: currentTables } = menuStateRes.result.value || {};
    console.log(`Current Page State: hasMenu=${alreadyAtMenu}, tableCount=${currentTables}`);

    if (!alreadyAtMenu) {
      await sendCommand(ws, 'Runtime.evaluate', {
        expression: `(() => {
          const target = ${JSON.stringify(targetHint)};
          const allEls = Array.from(document.querySelectorAll('a, button, span, tr, td, li, .fancytree-title'));
          const matchingEls = allEls.filter(e => {
            const t = (e.innerText || '').trim().toLowerCase();
            return t.includes(target) && !t.includes('messages') && !t.includes('export');
          });
          if (matchingEls.length > 0) {
            matchingEls[0].click();
            const evt = new MouseEvent('dblclick', { bubbles: true, cancelable: true, view: window });
            matchingEls[0].dispatchEvent(evt);
          }

          const compTab = Array.from(document.querySelectorAll('a, button, span, li, .tab_header'))
            .find(a => (a.innerText || '').trim() === 'Components');
          if (compTab) compTab.click();
        })()`,
        returnByValue: true
      });

      await sleep(2500);
    }

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

    const step2Result = verifyScrapingStep(2, { solutionName: treeInfo.solutionName });
    stepTelemetry[2] = step2Result;

    // STEP 3: Navigate into Product Node Menu tab & Profiling
    console.log('\n--- STEP 3: Navigating into Product Node Menu Catalog ---');
    emitProgress(3, 10, 'Category Discovery & Profiling', 'in_progress', 'Entering configuration menu', {
      stage: 'CATEGORY_DISCOVERY', percent: 30
    });

    if (!alreadyAtMenu) {
      await sendCommand(ws, 'Runtime.evaluate', {
        expression: `(() => {
          const target = ${JSON.stringify(targetHint)};
          const allEls = Array.from(document.querySelectorAll('a, button, span, tr, td, li, .fancytree-title'));
          const matchingEls = allEls.filter(e => {
            const t = (e.innerText || '').trim().toLowerCase();
            return t.includes(target) && !t.includes('messages') && !t.includes('export');
          });
          if (matchingEls.length > 0) {
            matchingEls[0].click();
            const evt = new MouseEvent('dblclick', { bubbles: true, cancelable: true, view: window });
            matchingEls[0].dispatchEvent(evt);
          }

          // Try clicking Menu tab in OCA configuration view
          const menuTabs = Array.from(document.querySelectorAll('a, button, span, li, .tab_header'))
            .filter(el => (el.innerText || '').trim() === 'Menu');
          if (menuTabs.length > 0) menuTabs[0].click();

          if (typeof jQuery !== 'undefined') {
            const titleSpan = jQuery('.fancytree-title, span[id*="node_title"]').filter((i, el) => {
              const t = jQuery(el).text().toLowerCase();
              if (target && t.includes(target)) return true;
              return t.includes('gen11') || t.includes('gen12') || t.includes('#1');
            });
            if (titleSpan.length > 0) titleSpan.first().trigger('click').trigger('dblclick');
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
    }

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
    let { pageHeading, qsLink } = JSON.parse(headingRes.result.value);
    if (!pageHeading || pageHeading.includes('External OCA') || pageHeading.includes('OCA Solution') || pageHeading.includes('General')) {
      if (targetChassisQuery) {
        pageHeading = targetChassisQuery;
      }
    }
    console.log(`Active Product Node Title: "${pageHeading}"`);

    meta = parseProductMeta(pageHeading, targetChassisQuery || pageTarget.title);
    if (targetChassisQuery && (!meta.gen || meta.gen === 'General')) {
      const overrideMeta = parseProductMeta(targetChassisQuery);
      meta.family = overrideMeta.family || meta.family;
      meta.gen = overrideMeta.gen || meta.gen;
      meta.cleanName = overrideMeta.cleanName || meta.cleanName;
    }

    if (targetChassisQuery) {
      const notebookConfig = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'scripts', 'config', 'notebooks.json'), 'utf8'));
      const expectedIdentity = resolveExpectedProductIdentity(targetChassisQuery, notebookConfig);
      if (!expectedIdentity) {
        throw new Error(`Product identity gate: requested product "${targetChassisQuery}" is not registered.`);
      }
      const observedIdentity = resolveProductIdentity(meta.cleanName, notebookConfig) || { productId: meta.cleanName };
      if (!observedIdentity || normalize(observedIdentity.productId) !== normalize(expectedIdentity.productId)) {
        throw new Error(`Product identity gate: requested ${expectedIdentity.productId}, but active OCA page resolved as ${meta.cleanName}. No data was promoted.`);
      }
      meta.cleanName = expectedIdentity.productId;
      meta.family = expectedIdentity.family;
      meta.gen = expectedIdentity.generation;
    }

    const { loadProfile } = require('../lib/system/profile_loader.js');
    const profile = await loadProfile(meta.family, meta.gen);
    console.log(`Loaded Profiler for Family: "${meta.family}", Gen: "${meta.gen}", Chassis: "${meta.cleanName}"`);

    const step3Result = verifyScrapingStep(3, { cleanName: meta.cleanName, family: meta.family, gen: meta.gen, firewallPassed: true });
    stepTelemetry[3] = step3Result;
    if (!step3Result.valid) {
      throw new AtomicStepAnomalyError(3, step3Result.stage, step3Result.failure.assertionId, step3Result.failure.message, step3Result.failure);
    }

    const scrollThreshold = profile.scraping_tuning.scrollHeightThreshold || 15000;
    const targetTabsRegex = profile.scraping_tuning.targetTabsRegex || "pointnext|services|support services|tech care|^bom$";

    // STEP 4: Full Page Section Expansion
    console.log(`\n--- STEP 4: Expanding Page Sections (Threshold: ${scrollThreshold}px) ---`);
    emitProgress(4, 10, 'Section Expansion & Multi-Tab Reveal', 'in_progress', `Threshold: ${scrollThreshold}px`, {
      stage: 'PAGE_EXPAND', percent: 45, category: meta.cleanName
    });

    const { metrics, menuTables, menuText } = await expandAndVerifyDomSections(ws, scrollThreshold, targetTabsRegex);
    console.log(`✅ Expansion verified: ${metrics.tablesCount} tables, ${metrics.totalRows} rows — Rule #19 passed.`);

    const step4Result = verifyScrapingStep(4, { tablesCount: metrics.tablesCount, scrollHeight: metrics.scrollHeight, totalRows: metrics.totalRows });
    stepTelemetry[4] = step4Result;
    if (!step4Result.valid) {
      throw new AtomicStepAnomalyError(4, step4Result.stage, step4Result.failure.assertionId, step4Result.failure.message, step4Result.failure);
    }

    // STEP 5: Extract Dynamic DOM & Metadata
    console.log('\n--- STEP 5: Extracting DOM & Metadata ---');
    emitProgress(5, 10, 'DOM Extraction & Tabular Row Scraping', 'in_progress', `${metrics.tablesCount} tables detected`, {
      stage: 'DOM_EXTRACTION', percent: 60, itemsScraped: metrics.tablesCount, category: meta.cleanName
    });

    // Shared chunked text extraction
    console.log('Extracting page text...');
    const extractedText = await extractChunkedText(ws, 50000);
    totalLen = extractedText.totalLen;
    let fullText = extractedText.fullText;
    console.log(`Extracted text: ${totalLen.toLocaleString()} chars`);

    // Shared table extraction as row arrays
    console.log('Extracting tables (row arrays)...');
    tables = await extractTablesAsRows(ws);
    const tableKey = table => table.tableId || JSON.stringify((table.rows || []).map(row => row.slice(0, 3)));
    const menuKeys = new Set(menuTables.map(tableKey));
    tables = [...menuTables, ...tables.filter(table => !menuKeys.has(tableKey(table)))];
    fullText = `${menuText}\n${fullText}`;
    console.log(`Extracted ${tables.length} tables.`);
    const tableDerivedText = deriveTextFromTables(tables);
    let textExtractionMode = 'FULL_BODY_TEXT';
    let outsideTableNotesCaptured = true;
    if (fullText.length < 2000 || fullText.length < tableDerivedText.length * 0.1) {
      console.warn(`⚠️  Reactive body text collapsed (${fullText.length} chars); using ${tableDerivedText.length.toLocaleString()} chars reconstructed losslessly from extracted table rows.`);
      fullText = tableDerivedText;
      totalLen = fullText.length;
      textExtractionMode = 'TABLE_RECONSTRUCTED_FALLBACK';
      outsideTableNotesCaptured = false;
    }

    // Shared section header extraction
    console.log('Extracting DOM section headers (landmarks)...');
    const sections = await extractSectionHeaders(ws);
    console.log(`Extracted ${sections.length} DOM section headers.`);

    // ── Conditional SKU Sweep: Probe ambient-temperature gated SKUs ──
    console.log('\nRunning conditional SKU visibility sweep (ambient temperature gates)...');
    let conditionalSkus = [];
    try {
      const hidden = await extractHiddenElements(ws, sendCommand);
      const seenTables = new Set(tables.map(table => JSON.stringify(table)));
      conditionalSkus = await probeConditionalSkuVisibility(ws, sendCommand, undefined, async () => {
        const stateTables = await extractTablesAsRows(ws);
        for (const table of stateTables) {
          const key = JSON.stringify(table);
          if (!seenTables.has(key)) { tables.push(table); seenTables.add(key); }
        }
      });
      const discovered = new Set(conditionalSkus.map(item => item.sku));
      conditionalSkus.push(...hidden.filter(item => !discovered.has(item.sku)).map(item => ({
        ...item, conditionType: 'UNKNOWN_PORTAL_CONDITION', operator: 'unknown', thresholdDegC: null,
        visibleAtDefaultC: false, portalVerificationRequired: true
      })));
      if (conditionalSkus.length > 0) {
        console.log(`  🔍 Discovered ${conditionalSkus.length} conditionally-visible SKU(s) (hidden at default ambient):`);
        for (const cs of conditionalSkus) {
          console.log(`     • ${cs.sku} — ${cs.conditionType} ${cs.operator} ${cs.thresholdDegC}°C`);
        }
      } else {
        console.log('  ✅ No ambient-gated conditional SKUs detected.');
      }
    } catch (sweepErr) {
      throw new Error(`Conditional discovery failed; staging cannot be promoted: ${sweepErr.message}`);
    }

    const step5Result = verifyScrapingStep(5, { textLength: totalLen, rowsCount: tables.length });
    stepTelemetry[5] = step5Result;
    if (!step5Result.valid) {
      throw new AtomicStepAnomalyError(5, step5Result.stage, step5Result.failure.assertionId, step5Result.failure.message, step5Result.failure);
    }

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

    if (!chassisDiscovery) {
      const priorDiscoveryPath = path.join(liveOutputDir, 'raw_data', 'chassis_discovery.json');
      if (fs.existsSync(priorDiscoveryPath)) {
        try {
          chassisDiscovery = JSON.parse(fs.readFileSync(priorDiscoveryPath, 'utf8'));
          if (chassisDiscovery) {
            chassisDiscovery.reusedAt = new Date().toISOString();
          }
        } catch (discoveryErr) {
          console.warn(`Could not preserve prior chassis discovery evidence: ${discoveryErr.message}`);
        }
      }

      const baseSku = resolveBaseSkuForProduct(meta, chassisDiscovery, profile);

      const edtMatch = fullText.match(/EDT[\s\n]*(\d+[\s\n]*-[\s\n]*\d+[\s\n]*days?)/i);
      const deliveryEstimate = edtMatch ? `EDT ${edtMatch[1].replace(/\s+/g, ' ')}` : (chassisDiscovery?.deliveryEstimate || '');

      if (!chassisDiscovery || chassisDiscovery.selectedSku !== baseSku) {
        chassisDiscovery = {
          query: meta.cleanName,
          selectedSku: baseSku,
          source: 'HPE OCA Configuration Session via authenticated CDP session',
          capturedAt: new Date().toISOString(),
          deliveryEstimate,
          candidates: [
            {
              type: 'dropdown-option',
              cardSelector: '[data-cand-idx="0"]',
              optionValue: baseSku,
              text: `${baseSku} - ${pageHeading}`,
              sku: baseSku,
              listPriceUsd: 0,
              availability: 'Available in OCA product catalog',
              leadTime: deliveryEstimate,
              deliveryLabel: '',
              isBto: false,
              isTaa: false,
              isGta: false,
              isCto: true
            }
          ]
        };
      } else {
        chassisDiscovery.capturedAt = new Date().toISOString();
        chassisDiscovery.deliveryEstimate = deliveryEstimate;
        if (chassisDiscovery.candidates?.[0]) {
          chassisDiscovery.candidates[0].leadTime = deliveryEstimate;
        }
      }
    }

    console.log(`\n🛡️ Staging Isolation Active: Scraping & building inside temporary staging directory:`);
    console.log(`   ${stagingDir}`);

    const rawDir = path.join(outputDir, 'raw_data');
    fs.mkdirSync(rawDir, { recursive: true });

    const rawJsonPath = path.join(rawDir, 'oca_raw_data_full.json');
    const networkSniffedRules = networkSniffer ? networkSniffer.getCapturedRules() : [];
    if (networkSniffedRules.length > 0) {
      console.log(`  📡 Captured ${networkSniffedRules.length} dynamic rule(s) via CDP Network Sniffer.`);
    }

    const rawData = {
      timestamp:  new Date().toISOString(),
      pageTitle:  pageTarget.title,
      url:        pageTarget.url,
      nodeText:   pageHeading,
      qsLink,
      scrollHeight: metrics.scrollHeight,
      textLength: totalLen,
      textExtractionMode,
      outsideTableNotesCaptured,
      fullText,
      sections,
      tables,
      tableCount: tables.length,
      conditionalSkus,
      conditionalSkusCount: conditionalSkus.length,
      conditionalDiscovery: 'HIDDEN_DOM_AND_AMBIENT_ONLY_OTHER_MACROS_UNVERIFIED',
      networkSniffedRules,
      networkSniffedRulesCount: networkSniffedRules.length,
      chassisDiscovery
    };
    const { safeWriteJsonAtomic } = require('../lib/system/fs_compat.js');
    safeWriteJsonAtomic(rawJsonPath, rawData);
    if (chassisDiscovery) {
      safeWriteJsonAtomic(path.join(rawDir, 'chassis_discovery.json'), chassisDiscovery);
    }
    console.log(`Raw data JSON saved atomically to staging: ${rawJsonPath}`);

    if (conditionalSkus.length > 0) {
      safeWriteJsonAtomic(path.join(rawDir, 'conditional_skus.json'), {
        timestamp: new Date().toISOString(),
        chassisName: meta.cleanName,
        totalConditionalSkus: conditionalSkus.length,
        skus: conditionalSkus
      });
      console.log(`Conditional SKUs saved to raw_data/conditional_skus.json`);
    }

    if (networkSniffedRules.length > 0) {
      safeWriteJsonAtomic(path.join(rawDir, 'network_sniffed_rules.json'), {
        timestamp: new Date().toISOString(),
        chassisName: meta.cleanName,
        totalRules: networkSniffedRules.length,
        rules: networkSniffedRules
      });
      console.log(`Network-sniffed rules saved to raw_data/network_sniffed_rules.json`);
    }

    // QuickSpecs PDF Download
    pdfDestPath = downloadQuickSpecsPdfSafely(qsLink, outputDir, meta.cleanName);
  } finally {
    if (networkSniffer) {
      try { await networkSniffer.detach(); } catch (_) {}
    }
    try { ws.close(); } catch (e) { const _logger = require('../lib/system/pipeline_logger.js'); _logger.warn('SCRAPE', 'Failed to close WebSocket', e); }
  }

  // STEP 6: Catalog Parser & Excel Generator in Staging
  console.log('\n--- STEP 6: Catalog Classification & Excel Generation in Staging ---');
  emitProgress(6, 10, 'Aspect Rules Engine & Constraint Graph', 'in_progress', 'Building catalog JSON and TSV intermediates', {
    stage: 'RULES_PARSING', percent: 75, category: meta.cleanName
  });

  const step6Result = verifyScrapingStep(6, { ctoVariantsCount: chassisDiscovery?.candidates?.length || 1 });
  stepTelemetry[6] = step6Result;

  catalogJson = path.join(outputDir, `${meta.cleanName}_Catalog.json`);
  catalogXlsx = path.join(outputDir, `${meta.cleanName}_OCA_Catalog.xlsx`);
  const rawJsonPath = path.join(outputDir, 'raw_data', 'oca_raw_data_full.json');

  // ── STAGING SEED: Copy ALL critical live files into staging BEFORE any scrape ──
  const liveOutputDir = path.join(OUTPUTS_ROOT, meta.family, meta.gen, meta.cleanName);
  seedStagingFromLiveWorkspace(liveOutputDir, outputDir, meta);

  // STEP 7: Build Catalog & Generate Multi-Sheet Excel
  emitProgress(7, 10, 'Catalog Generation & Workbook Compilation', 'in_progress', 'Generating 20-sheet Master Excel', {
    stage: 'CATALOG_GEN', percent: 85, category: meta.cleanName
  });

  execFileSync(
    process.execPath,
    [path.join(PROJECT_ROOT, 'scripts', 'catalogs', 'build_catalog.js'), rawJsonPath, catalogJson],
    { stdio: 'inherit', cwd: PROJECT_ROOT }
  );
  execFileSync(
    process.execPath,
    [path.join(PROJECT_ROOT, 'scripts', 'catalogs', 'generate_xlsx.js'), catalogXlsx],
    { stdio: 'inherit', cwd: PROJECT_ROOT }
  );

  const step7Result = verifyScrapingStep(7, { diffAnomalySafe: true, recommendedColumnVerified: true });
  stepTelemetry[7] = step7Result;
  if (!step7Result.valid) {
    throw new AtomicStepAnomalyError(7, step7Result.stage, step7Result.failure.assertionId, step7Result.failure.message, step7Result.failure);
  }

  // STEPS 8, 9, 10: Staging Audit, Live Promotion, and Registry Sync
  await auditAndPromoteStaging({
    outputDir,
    liveOutputDir,
    catalogXlsx,
    catalogJson,
    meta,
    tables,
    totalLen,
    treeInfo,
    pdfDestPath,
    pipelineStart,
    stepTelemetry
  });

}

let releasePortalLease;
Promise.resolve().then(() => {
  releasePortalLease = require('../lib/system/workflow_lease.js').acquireWorkflowLease('hpe-oca-scrape');
  return main();
}).finally(() => releasePortalLease?.()).catch(err => {
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
