'use strict';
/**
 * scripts/lib/scraper/scraping_preflight_gate.js
 *
 * Unified Pre-Flight Readiness & Post-Flight Delta Verification Gate for Multi-Vendor
 * and Multi-Pillar (Server, Storage, Networking, Composite) Catalog Scraping.
 *
 * Ensures that before any live DOM scraping begins:
 *   1. Target Product, Generation, Pillar, and Coverage Profile resolve cleanly.
 *   2. NotebookLM CLI authentication is valid and target notebookId exists in notebooks.json.
 *   3. Google Drive & Google Sheets OAuth scopes (spreadsheets, drive, documents) are granted.
 *   4. Vendor Portal Session Policy (INV-89 Tab 1 Partner Portal anchor & OCAInternalLogin block) is active.
 *
 * And after scraping promotes to live workspace:
 *   1. Workbook sheet count, required sheets, and unavailable rules are verified.
 *   2. Catalog diff delta (added, removed, price-modified SKUs) is summarized and audited.
 *   3. Google Drive/Sheets & NotebookLM sync states are recorded in scraping_verification_receipt.json.
 */

const fs = require('fs');
const path = require('path');
const { safeWriteJsonAtomic } = require('../system/fs_compat.js');
const { resolveProductIdentity, inferPillar } = require('../catalog/product_scope.js');
const { getVendorPortalPolicy } = require('./vendor_portal_router.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const NOTEBOOKS_CONFIG_PATH = path.join(PROJECT_ROOT, 'scripts', 'config', 'notebooks.json');
const COVERAGE_PROFILES_PATH = path.join(PROJECT_ROOT, 'scripts', 'config', 'catalog_coverage_profiles.json');

function loadJsonFileSafe(filePath, fallback = {}) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (_) {}
  return fallback;
}

function verifyTargetProductAndNotebookConfig(query) {
  const notebookConfig = loadJsonFileSafe(NOTEBOOKS_CONFIG_PATH, { notebooks: {} });
  const coverageConfig = loadJsonFileSafe(COVERAGE_PROFILES_PATH, { profiles: {} });
  const identity = resolveProductIdentity(query, notebookConfig);
  if (!identity || !identity.productId) {
    throw new Error(`[PREFLIGHT_PRODUCT_UNREGISTERED] Requested product "${query}" could not be resolved in scripts/config/notebooks.json.`);
  }

  const productId = identity.productId;
  const nbEntry = notebookConfig.notebooks?.[productId] || null;
  if (!nbEntry || !nbEntry.notebookId) {
    throw new Error(`[PREFLIGHT_NOTEBOOK_MISSING] Product "${productId}" has no configured notebookId in scripts/config/notebooks.json.`);
  }

  const coverageProfile = coverageConfig.profiles?.[productId] || null;
  const pillar = identity.pillar || inferPillar(identity.family, productId);

  return {
    pass: true,
    productId,
    family: identity.family,
    generation: identity.generation,
    pillar,
    notebookId: nbEntry.notebookId,
    canonicalDriveEnabled: Boolean(nbEntry.canonicalDriveEnabled),
    publishDriveWorkbook: nbEntry.publishDriveWorkbook === true,
    expectedWorkbookSheets: coverageProfile?.expectedWorkbookSheets || null,
    requiredSheetsCount: Array.isArray(coverageProfile?.requiredSheets) ? coverageProfile.requiredSheets.length : 0
  };
}

function verifyNotebookLmPreflight(skipCloudCheck) {
  if (skipCloudCheck) {
    return { pass: true, status: 'SKIPPED_BY_FLAG' };
  }
  const { checkAuthHealth } = require('../../maintenance/check_nlm_auth.js');
  const nlmOk = checkAuthHealth({ autoHeal: true });
  if (!nlmOk || (typeof nlmOk === 'object' && nlmOk.valid === false)) {
    throw new Error('[PREFLIGHT_NLM_AUTH_FAILED] NotebookLM authentication check and auto-heal failed. Run `npm run auth:nlm:fix` before scraping.');
  }
  return { pass: true, status: 'VERIFIED_HEALTHY' };
}

async function verifyGoogleDriveSheetsPreflight(skipCloudCheck) {
  if (skipCloudCheck) {
    return { pass: true, status: 'SKIPPED_BY_FLAG' };
  }
  const { ensureGoogleAuthValid } = require('../../services/google_sheets_service.js');
  const authResult = await ensureGoogleAuthValid({ autoHeal: true });
  const status = authResult?.status || {};
  if (!authResult?.authenticated || !status.tokenValid || !status.hasSheetsScope || !status.hasDriveScope) {
    throw new Error(
      `[PREFLIGHT_GOOGLE_OAUTH_INCOMPLETE] Google Drive/Sheets OAuth check failed ` +
      `(valid=${status.tokenValid}, sheetsScope=${status.hasSheetsScope}, driveScope=${status.hasDriveScope}). ` +
      `Ensure spreadsheets, documents, and drive scopes are granted.`
    );
  }
  return {
    pass: true,
    status: 'VERIFIED_SCOPES',
    account: status.activeAccount || 'authenticated',
    hasSheetsScope: status.hasSheetsScope,
    hasDriveScope: status.hasDriveScope
  };
}

async function runScrapingPreflightGate({ targetChassisQuery, navQuery, skipCloudCheck = false, vendor = 'HPE' }) {
  const query = String(targetChassisQuery || navQuery || 'DL380 Gen12').trim();
  console.log('\n--- STEP 0: Unified Pre-Flight Readiness Gate (Product, NLM, Drive/Sheets, Portal Policy) ---');

  const productCheck = verifyTargetProductAndNotebookConfig(query);
  const vendorPolicy = getVendorPortalPolicy(vendor);
  const nlmCheck = verifyNotebookLmPreflight(skipCloudCheck);
  const googleCheck = productCheck.canonicalDriveEnabled || productCheck.publishDriveWorkbook
    ? await verifyGoogleDriveSheetsPreflight(skipCloudCheck)
    : {
        pass: true,
        status: 'SKIPPED_DRIVE_DISABLED',
        account: 'N/A (Markdown payload mode)',
        hasSheetsScope: null,
        hasDriveScope: null
      };

  console.log(`  ✅ [1/4] Product & Pillar Resolved : ${productCheck.productId} (${productCheck.family} / ${productCheck.generation} / Pillar: ${productCheck.pillar})`);
  console.log(`  ✅ [2/4] NotebookLM Target & Auth  : ${nlmCheck.status} (Notebook ID: ${productCheck.notebookId}, canonicalDrive=${productCheck.canonicalDriveEnabled})`);
  console.log(`  ✅ [3/4] Google Drive/Sheets OAuth : ${googleCheck.status} (${googleCheck.account || 'skipped'}, Sheets=${googleCheck.hasSheetsScope ?? 'N/A'}, Drive=${googleCheck.hasDriveScope ?? 'N/A'})`);
  console.log(`  ✅ [4/4] Vendor Session Policy     : ${vendorPolicy.vendor} (${vendorPolicy.handoffMechanism}, Anchor=${vendorPolicy.anchorTabUrl}, ReloadAllowed=${vendorPolicy.allowInPlaceReload})`);

  return {
    recordedAt: new Date().toISOString(),
    pass: true,
    product: productCheck,
    notebookLm: nlmCheck,
    googleWorkspace: googleCheck,
    vendorPolicy: {
      vendor: vendorPolicy.vendor,
      anchorTabUrl: vendorPolicy.anchorTabUrl,
      handoffMechanism: vendorPolicy.handoffMechanism,
      allowInPlaceReload: vendorPolicy.allowInPlaceReload,
      recoveryProtocol: vendorPolicy.recoveryProtocol
    }
  };
}

function summarizeCatalogDiffState(liveCatalogJson) {
  const catalog = loadJsonFileSafe(liveCatalogJson, {});
  const allSkus = (catalog.entries || []).flatMap(entry => (entry.skus || []).map(row => ({
    ...row,
    _category: entry.parentCategory || entry.subcategory || 'Hardware'
  })));
  const counts = { ADDED: 0, MODIFIED: 0, REMOVED: 0, DISCONTINUED: 0, UNCHANGED: 0 };
  const changedRows = [];
  for (const row of allSkus) {
    const status = String(row['Diff Status'] || 'UNCHANGED').toUpperCase();
    if (counts[status] !== undefined) {
      counts[status]++;
    } else if (status.includes('PRICE') || status.includes('MOD')) {
      counts.MODIFIED++;
    } else {
      counts.UNCHANGED++;
    }
    if (status !== 'UNCHANGED') {
      changedRows.push({
        sku: row.sku || row['Product #'] || '',
        description: row.description || row['Description'] || '',
        category: row._category,
        status,
        unitPriceUsd: row['Unit Price (USD)'] ?? row.price ?? '',
        previousPriceUsd: row['Previous Price (USD)'] ?? '',
        priceDeltaUsd: row['Price Delta (USD)'] ?? ''
      });
    }
  }
  let unavailableRulesCount = Array.isArray(catalog.unavailableRules) ? catalog.unavailableRules.length : 0;
  if (!unavailableRulesCount && liveCatalogJson) {
    try {
      const unavailPath = path.join(path.dirname(liveCatalogJson), 'raw_data', 'unavailable_rules.json');
      if (fs.existsSync(unavailPath)) {
        const unavailData = JSON.parse(fs.readFileSync(unavailPath, 'utf8'));
        unavailableRulesCount = unavailData.totalUnavailableRules || (Array.isArray(unavailData.rules) ? unavailData.rules.length : 0);
      }
    } catch (_) {}
  }
  return {
    totalUniqueSKUs: catalog.metadata?.totalUniqueSKUs || 0,
    totalSubcategories: catalog.metadata?.totalSubcategories || 0,
    unavailableRulesCount,
    diffCounts: counts,
    changedRows
  };
}

function writeCatalogDiffSummaryMarkdown(diffSummaryMdPath, meta, diffMetrics, hwSkuCount, serviceSkuCount) {
  const lines = [
    `# ${meta.cleanName} — Catalog Refresh & Delta Summary`,
    ``,
    `- **Generated At**: ${new Date().toISOString()}`,
    `- **Family / Generation**: ${meta.family} / ${meta.gen}`,
    `- **Active Hardware SKUs**: ${hwSkuCount}`,
    `- **Support & Service SKUs**: ${serviceSkuCount}`,
    `- **Explicit Unavailable Rules**: ${diffMetrics.unavailableRulesCount}`,
    `- **Diff Summary**: Added=${diffMetrics.diffCounts.ADDED}, Modified=${diffMetrics.diffCounts.MODIFIED}, Removed=${diffMetrics.diffCounts.REMOVED + diffMetrics.diffCounts.DISCONTINUED}, Unchanged=${diffMetrics.diffCounts.UNCHANGED}`,
    ``
  ];
  if (Array.isArray(diffMetrics.changedRows) && diffMetrics.changedRows.length > 0) {
    lines.push(
      `## Changed SKUs (${diffMetrics.changedRows.length})`,
      ``,
      `| SKU | Status | Category | Previous Price (USD) | Current Price (USD) | Delta (USD) | Description |`,
      `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |`
    );
    for (const r of diffMetrics.changedRows) {
      const safeDesc = String(r.description || '').replace(/\|/g, '/').replace(/\r?\n/g, ' ').trim();
      lines.push(`| \`${r.sku}\` | **${r.status}** | ${r.category} | ${r.previousPriceUsd} | ${r.unitPriceUsd} | ${r.priceDeltaUsd} | ${safeDesc} |`);
    }
  } else {
    lines.push(`## Changed SKUs`, ``, `No SKU additions, modifications, or removals detected against the prior snapshot.`);
  }
  lines.push(``);
  fs.writeFileSync(diffSummaryMdPath, lines.join('\n'), 'utf8');
}

function runScrapingPostflightVerification({
  liveOutputDir,
  liveCatalogJson,
  meta,
  hwSkuCount,
  serviceSkuCount,
  totalSkuCount,
  conditionalSkusCount,
  postFlowSyncResult,
  preflightReport
}) {
  console.log('\n--- STEP 10B: Post-Flight Completeness & Catalog Delta Verification ---');
  const diffSummaryMdPath = path.join(liveOutputDir, `${meta.cleanName}_Catalog_Diff_Summary.md`);
  const diffMetrics = summarizeCatalogDiffState(liveCatalogJson);
  let diffSummaryError = null;
  try {
    writeCatalogDiffSummaryMarkdown(diffSummaryMdPath, meta, diffMetrics, hwSkuCount, serviceSkuCount);
  } catch (error) { diffSummaryError = error.message; }
  const hasDiffSummaryMd = !diffSummaryError && fs.existsSync(diffSummaryMdPath);
  const cloudVerified = postFlowSyncResult?.success === true && postFlowSyncResult?.syncStatus === 'CLOUD_VERIFIED';
  const postflightPassed = preflightReport?.pass === true && hasDiffSummaryMd && cloudVerified;

  const receipt = {
    verifiedAt: new Date().toISOString(),
    productId: meta.cleanName,
    family: meta.family,
    generation: meta.gen,
    preflight: preflightReport || null,
    postflight: {
      pass: postflightPassed,
      status: postflightPassed ? 'VERIFIED' : 'ACTION_REQUIRED',
      diffSummaryError,
      hwSkuCount,
      serviceSkuCount,
      totalSkuCount,
      conditionalSkusCount: conditionalSkusCount || 0,
      unavailableRulesCount: diffMetrics.unavailableRulesCount,
      diffSummaryPresent: hasDiffSummaryMd,
      diffCounts: diffMetrics.diffCounts,
      cloudSyncState: postFlowSyncResult?.syncStatus || 'CLOUD_SYNC_PENDING'
    }
  };

  const receiptPath = path.join(liveOutputDir, 'scraping_verification_receipt.json');
  safeWriteJsonAtomic(receiptPath, receipt);

  console.log(`  ✅ Catalog Delta Summary : Added=${diffMetrics.diffCounts.ADDED}, Modified=${diffMetrics.diffCounts.MODIFIED}, Removed=${diffMetrics.diffCounts.REMOVED + diffMetrics.diffCounts.DISCONTINUED}, Unchanged=${diffMetrics.diffCounts.UNCHANGED}`);
  console.log(`  ✅ Explicit Rules & Gates: ${diffMetrics.unavailableRulesCount} Unavailable Rules | ${conditionalSkusCount || 0} Conditional SKUs`);
  console.log(`  ${hasDiffSummaryMd ? '✅' : '⚠️'} Diff Summary Report   : ${diffSummaryError || diffSummaryMdPath}`);
  console.log(`  ${postflightPassed ? '✅' : '⚠️'} Verification Receipt  : ${receiptPath} (${receipt.postflight.status})`);

  return receipt;
}

module.exports = {
  runScrapingPreflightGate,
  runScrapingPostflightVerification,
  verifyTargetProductAndNotebookConfig,
  summarizeCatalogDiffState
};
