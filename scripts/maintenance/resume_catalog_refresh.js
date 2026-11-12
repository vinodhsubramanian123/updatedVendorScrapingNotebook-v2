'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { promoteStagingDirectory, safeWriteJsonAtomic } = require('../lib/system/fs_compat');
const { getProductGenerationMetadata, commitSuccessfulResyncMetadata, refreshMasterProductMetadata } = require('../lib/catalog/product_metadata_manager');
const { createCaptureReceipt, finalizeCaptureReceipt } = require('../lib/catalog/catalog_capture_receipt');
const ROOT = process.cwd();

async function resumeCatalogRefresh(product, stagingDir, options = {}) {
  const release = require('../lib/system/workflow_lease.js').acquireWorkflowLease('hpe-oca-scrape');
  try { return await resumeWithinLease(product, stagingDir, options); }
  finally { release(); }
}

async function resumeWithinLease(product, stagingDir, { skipCloudCheck = false } = {}) {
  const stage = path.resolve(stagingDir);
  const resolved = fs.realpathSync(stage);
  const enclosed = ['outputs/.catalog-staging', 'outputs/temp'].some(dir => {
    const relative = path.relative(path.join(ROOT, dir), resolved);
    return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
  });
  if (!enclosed || fs.lstatSync(stage).isSymbolicLink()) {
    throw new Error('RESUME_REQUIRES_ENCLOSED_STAGING');
  }
  const preflight = await require('../lib/scraper/scraping_preflight_gate')
    .runScrapingPreflightGate({ targetChassisQuery: product, skipCloudCheck });
  if (preflight.product.productId !== product) throw new Error('RESUME_REQUIRES_EXACT_PRODUCT_ID');
  const current = getProductGenerationMetadata(product);
  const liveDir = current.outputDir || path.join(ROOT, 'outputs', preflight.product.family, preflight.product.generation, product);
  const catalog = path.join(stage, `${product}_Catalog.json`);
  const observedAt = JSON.parse(fs.readFileSync(catalog, 'utf8')).metadata?.scrapeTimestamp;
  const age = Date.now() - Date.parse(observedAt);
  if (!Number.isFinite(age) || age < 0 || age > 72 * 3600000) throw new Error('RESUME_CAPTURE_STALE');
  const registration = require('../config/notebooks.json').notebooks[product];
  if (registration?.requireExactOcaBase) {
    const raw = JSON.parse(fs.readFileSync(path.join(stage, 'raw_data', 'oca_raw_data_full.json'), 'utf8'));
    if (raw.selectedBaseSku !== registration.baseSku) throw new Error('RESUME_CAPTURE_BASE_MISMATCH');
  }
  execFileSync(process.execPath, [path.join(ROOT, 'tests/integration/verify_excel_tally.js'),
    path.join(stage, `${product}_OCA_Catalog.xlsx`)], { stdio: 'inherit', windowsHide: true });
  const receipt = createCaptureReceipt(stage, liveDir, product);
  const promoted = promoteStagingDirectory(stage, liveDir);
  commitSuccessfulResyncMetadata({ productKey: product,
    catalogPath: path.join(liveDir, `${product}_Catalog.json`), stagingAuditPassed: true });
  const pdfPath = path.join(liveDir, `HPE_${product}_QuickSpecs.pdf`);
  require('../lib/catalog/registry.js').updateScrapedRegistry({
    timestamp: receipt.capturedAt, solutionName: product.replaceAll('_', ' '),
    family: preflight.product.family, gen: preflight.product.generation, chassisName: product, outputDir: liveDir,
    jsonPath: path.join(liveDir, `${product}_Catalog.json`),
    xlsxPath: path.join(liveDir, `${product}_OCA_Catalog.xlsx`), pdfPath: fs.existsSync(pdfPath) ? pdfPath : null,
    skuCount: receipt.counts.retainedHardware
  });
  const sync = await require('../lib/sync/post_flow_sync').triggerPostFlowSyncAsync(product, 'SCRAPE', {
    autoUploadNLM: !skipCloudCheck, confirmSourceRetirement: !skipCloudCheck
  });
  finalizeCaptureReceipt(liveDir, receipt, sync);
  refreshMasterProductMetadata();
  const report = { product, observedAt, resumedAt: new Date().toISOString(), promoted, sync, skipCloudCheck,
    success: skipCloudCheck ? Boolean(sync.payloadGenerated) : (sync.success === true && sync.syncStatus === 'CLOUD_VERIFIED') };
  safeWriteJsonAtomic(path.join(liveDir, 'evidence', 'resumed_catalog_refresh.json'), report);
  if (!skipCloudCheck && !report.success) throw new Error(`RESUME_CLOUD_INCOMPLETE: ${sync.error || sync.uploadResult?.message || sync.syncStatus}`);
  return report;
}
if (require.main === module) {
  resumeCatalogRefresh(process.argv[2], process.argv[3], { skipCloudCheck: process.argv.includes('--skip-cloud-check') })
    .then(result => console.log(JSON.stringify(result)))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { resumeCatalogRefresh };
