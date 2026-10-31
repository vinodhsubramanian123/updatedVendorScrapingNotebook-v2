'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { promoteStagingDirectory, safeWriteJsonAtomic } = require('../lib/system/fs_compat');
const { getProductGenerationMetadata, commitSuccessfulResyncMetadata, refreshMasterProductMetadata } = require('../lib/catalog/product_metadata_manager');
const { createCaptureReceipt, finalizeCaptureReceipt } = require('../lib/catalog/catalog_capture_receipt');
const ROOT = process.cwd();

async function resumeCatalogRefresh(product, stagingDir) {
  const stage = path.resolve(stagingDir);
  const relative = path.relative(path.join(ROOT, 'outputs/temp'), stage);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || fs.lstatSync(stage).isSymbolicLink()) {
    throw new Error('RESUME_REQUIRES_ENCLOSED_STAGING');
  }
  const current = getProductGenerationMetadata(product);
  if (!current.exists) throw new Error('RESUME_REQUIRES_EXISTING_PRODUCT');
  const catalog = path.join(stage, `${product}_Catalog.json`);
  const observedAt = JSON.parse(fs.readFileSync(catalog, 'utf8')).metadata?.scrapeTimestamp;
  const age = Date.now() - Date.parse(observedAt);
  if (!Number.isFinite(age) || age < 0 || age > 72 * 3600000) throw new Error('RESUME_CAPTURE_STALE');
  await require('../lib/scraper/scraping_preflight_gate').runScrapingPreflightGate({ targetChassisQuery: product });
  execFileSync(process.execPath, [path.join(ROOT, 'tests/integration/verify_excel_tally.js'),
    path.join(stage, `${product}_OCA_Catalog.xlsx`)], { stdio: 'inherit', windowsHide: true });
  const receipt = createCaptureReceipt(stage, current.outputDir, product);
  const promoted = promoteStagingDirectory(stage, current.outputDir);
  commitSuccessfulResyncMetadata({ productKey: product,
    catalogPath: path.join(current.outputDir, `${product}_Catalog.json`), stagingAuditPassed: true });
  const sync = await require('../lib/sync/post_flow_sync').triggerPostFlowSyncAsync(product, 'SCRAPE', {
    autoUploadNLM: true, confirmSourceRetirement: true
  });
  finalizeCaptureReceipt(current.outputDir, receipt, sync);
  refreshMasterProductMetadata();
  const report = { product, observedAt, resumedAt: new Date().toISOString(), promoted, sync,
    success: sync.success === true && sync.syncStatus === 'CLOUD_VERIFIED' };
  safeWriteJsonAtomic(path.join(current.outputDir, 'evidence', 'resumed_catalog_refresh.json'), report);
  if (!report.success) throw new Error(`RESUME_CLOUD_INCOMPLETE: ${sync.error || sync.uploadResult?.message || sync.syncStatus}`);
  return report;
}
if (require.main === module) {
  resumeCatalogRefresh(process.argv[2], process.argv[3]).then(result => console.log(JSON.stringify(result)))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { resumeCatalogRefresh };
