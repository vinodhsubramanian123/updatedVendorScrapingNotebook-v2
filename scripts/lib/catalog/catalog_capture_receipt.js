'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { safeWriteJsonAtomic } = require('../system/fs_compat.js');

const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function currentRows(catalog) {
  return (catalog.entries || []).flatMap(entry => entry.skus || [])
    .filter(row => !['REMOVED', 'DISCONTINUED'].includes(String(row['Diff Status'] || '').toUpperCase()));
}
function skuSet(catalog) {
  return new Set(currentRows(catalog).map(row => String(row.sku || row['Product #'] || '').trim()).filter(Boolean));
}
function summarizeCatalog(dir, product) {
  const catalogPath = path.join(dir, `${product}_Catalog.json`);
  const catalog = readJson(catalogPath);
  const services = readJson(path.join(dir, `${product}_Services.json`));
  const rules = readJson(path.join(dir, `${product}_Catalog_Rules.json`));
  return { catalog, services, rules, counts: {
    hardware: skuSet(catalog).size, services: skuSet(services).size,
    rules: (rules.rules || []).length, categories: new Set((catalog.entries || []).map(e => e.parentCategory)).size
  }, hashes: Object.fromEntries(['Catalog.json', 'Services.json', 'Catalog_Rules.json', 'OCA_Catalog.xlsx']
    .map(suffix => [suffix, hash(fs.readFileSync(path.join(dir, `${product}_${suffix}`)))])) };
}
function compareSkus(before, after) {
  const previous = skuSet(before || {});
  const current = skuSet(after);
  return { added: [...current].filter(sku => !previous.has(sku)), removed: [...previous].filter(sku => !current.has(sku)) };
}

function _validateTestOnlySkipCoverage(options) {
  if (!options.skipCoverageValidation) return;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[INV-105] skipCoverageValidation is strictly prohibited in production.');
  }
  const safeReal = target => { try { return fs.realpathSync(target); } catch { return path.resolve(target); } };
  const testsRoot = safeReal(path.resolve(__dirname, '../../../tests'));
  const entry = safeReal(path.resolve(process.argv[1] || '.'));
  const relative = path.relative(testsRoot, entry);
  const isEnclosedTest = !relative.startsWith('..') && !path.isAbsolute(relative) && /^test_.*\.js$/i.test(path.basename(entry));
  const isTestEnv = Boolean(process.env.NODE_TEST_CONTEXT) || isEnclosedTest;
  if (!isTestEnv) {
    throw new Error('[INV-105] skipCoverageValidation is restricted to test harnesses only.');
  }
}

function _validateCaptureTimestampAndCounts(next, raw) {
  const capture = next.catalog.metadata?.scrapeTimestamp;
  if (!capture || !Number.isFinite(Date.parse(capture)) || Date.parse(capture) > Date.now() || Date.parse(capture) !== Date.parse(raw.timestamp)) {
    throw new Error('Capture timestamp does not match raw vendor evidence');
  }

  const retainedHardwareCount = new Set((next.catalog.entries || []).flatMap(entry => entry.skus || [])
    .map(row => String(row.sku || row['Product #'] || '').trim()).filter(Boolean)).size;

  if (!next.counts.hardware || retainedHardwareCount !== Number(next.catalog.metadata.totalUniqueSKUs)) {
    throw new Error('Hardware retained SKU count does not match catalog metadata');
  }

  next.counts.retainedHardware = retainedHardwareCount;
  next.counts.hardwareTombstones = retainedHardwareCount - next.counts.hardware;
  return capture;
}

function _validateWorkbookSheetsAndSkus(workbook, next) {
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) throw new Error(`Workbook sheet '${sheetName}' is unreadable.`);
    const rows = require('xlsx-js-style').utils.sheet_to_json(sheet, { header: 1 });
    if (!rows || rows.length < 2 || !rows.slice(1).some(row => row.some(cell => cell != null && String(cell).trim()))) {
      throw new Error(`Workbook sheet '${sheetName}' is empty.`);
    }
  }

  const workbookRows = workbook.SheetNames.flatMap(name => require('xlsx-js-style').utils.sheet_to_json(workbook.Sheets[name]));
  const actual = skuSet({ entries: [{ skus: workbookRows }] });
  const expected = new Set([...skuSet(next.catalog), ...skuSet(next.services)]);
  if ([...expected].some(sku => !actual.has(sku))) {
    throw new Error('Workbook is missing catalog SKUs');
  }
}

function _extractCaptureProvenance(raw, options) {
  const selectedBase = raw.selectedBaseSku || raw.baseSku || null;
  const ownerConfig = raw.ownerConfiguration || null;
  const solutionDomain = raw.solutionDomain || options.solutionDomain || null;
  const observedSelectors = raw.observedSelectors || raw.selectorHistory || [];
  const missingProvenance = [
    !selectedBase && 'BASE_NOT_OBSERVED',
    !ownerConfig && 'OWNER_NOT_OBSERVED',
    !solutionDomain && 'DOMAIN_NOT_SCOPED',
    (!Array.isArray(observedSelectors) || !observedSelectors.length) && 'SELECTORS_NOT_OBSERVED',
    raw.finalSelectorsRestored !== true && 'FINAL_SELECTORS_NOT_RESTORED'
  ].filter(Boolean);

  if (missingProvenance.length && !options.skipCoverageValidation) {
    throw new Error(`Capture provenance incomplete: ${missingProvenance.join(', ')}`);
  }

  return { selectedBase, ownerConfig, solutionDomain, observedSelectors, missingProvenance };
}

function verifyRegisteredCaptureScope(product, raw) {
  const { notebooks } = require('../../config/notebooks.json');
  const entry = notebooks[product];
  if ((entry?.requireExactOcaBase || entry?.captureViaParent) && raw.selectedBaseSku !== entry.baseSku) {
    throw new Error(`Capture base does not match registered SKU ${entry.baseSku}`);
  }
  if (entry?.captureViaParent) {
    const { resolveOwnedCatalogPath, matchesOwnedCatalogPath } = require('./catalog_hierarchy');
    const expected = resolveOwnedCatalogPath(product, notebooks);
    const parentSku = expected.at(-2).baseSku;
    const pathMatches = raw.scopePath ? matchesOwnedCatalogPath(expected, raw.scopePath) &&
      raw.scopePath.at(-1).ownerConfiguration === raw.ownerConfiguration && raw.scopePath.at(-2).ownerConfiguration === raw.parentConfiguration
      : expected.length === 2;
    if (!pathMatches || raw.parentBaseSku !== parentSku || !raw.parentConfiguration) {
      throw new Error(`Capture does not establish the exact parent of ${product}. Use its parent-scoped capture.`);
    }
  }
}

function _loadPreviousCatalogBaseline(liveDir, product) {
  const previousFile = path.join(liveDir, `${product}_Catalog.json`);
  const previousComplete = ['Catalog.json', 'Services.json', 'Catalog_Rules.json', 'OCA_Catalog.xlsx']
    .every(suffix => fs.existsSync(path.join(liveDir, `${product}_${suffix}`)));
  let previous = null;
  if (fs.existsSync(previousFile) && previousComplete) {
    previous = summarizeCatalog(liveDir, product);
  }
  return { previousFile, previousComplete, previous };
}

// Called after the existing workbook audit and before replacing the live folder.
// A receipt describes captured coverage; it never certifies every portal state.
function createCaptureReceipt(stagingDir, liveDir, product, options = {}) {
  _validateTestOnlySkipCoverage(options);

  const next = summarizeCatalog(stagingDir, product);
  const raw = readJson(path.join(stagingDir, 'raw_data', 'oca_raw_data_full.json'));
  if (!options.skipCoverageValidation) verifyRegisteredCaptureScope(product, raw);
  const capture = _validateCaptureTimestampAndCounts(next, raw);

  const workbook = require('xlsx-js-style').readFile(path.join(stagingDir, `${product}_OCA_Catalog.xlsx`));
  const coveragePolicy = options.skipCoverageValidation
    ? { valid: true, skipped: true, reason: 'Coverage validation skipped via options' }
    : require('./catalog_coverage.js').validateCatalogCoverage(product, next.catalog, next.services, workbook, options.profilesPath);
  if (!coveragePolicy.valid) throw new Error(`Capture coverage incomplete: ${coveragePolicy.reason}`);

  _validateWorkbookSheetsAndSkus(workbook, next);
  const { previousFile, previousComplete, previous } = _loadPreviousCatalogBaseline(liveDir, product);
  const { selectedBase, ownerConfig, solutionDomain, observedSelectors, missingProvenance } = _extractCaptureProvenance(raw, options);

  const receipt = {
    schemaVersion: 1,
    product,
    vendor: 'HPE',
    capturedAt: capture,
    auditedAt: new Date().toISOString(),
    incompleteLegacyBaselinePreserved: fs.existsSync(previousFile) && !previousComplete,
    mode: previous ? 'REFRESH' : 'FIRST_CAPTURE',
    status: options.skipCoverageValidation ? 'DIAGNOSTIC_CAPTURE' : 'STAGING_AUDITED',
    provenance: {
      baseSku: selectedBase,
      ownerConfiguration: ownerConfig,
      ...(raw.parentBaseSku ? { parentBaseSku: raw.parentBaseSku } : {}),
      ...(raw.parentConfiguration ? { parentConfiguration: raw.parentConfiguration } : {}),
      ...(raw.scopePath ? { scopePath: raw.scopePath } : {}),
      solutionDomain,
      observedUrl: raw.url || null
    },
    coverage: {
      textExtractionMode: raw.textExtractionMode || 'UNKNOWN',
      outsideTableNotesCaptured: raw.outsideTableNotesCaptured === true,
      conditionalDiscovery: raw.conditionalDiscovery || 'UNVERIFIED',
      ...(raw.componentServiceEvidence ? { componentServiceEvidence: raw.componentServiceEvidence } : {}),
      ...(raw.ownedMenuDiscovery ? { ownedMenuDiscovery: raw.ownedMenuDiscovery } : {}),
      baseSku: selectedBase,
      ownerConfiguration: ownerConfig,
      solutionDomain,
      observedSelectors,
      missingProvenance,
      completeness: 'CAPTURED_STATES_ONLY',
      policy: coveragePolicy
    },
    counts: next.counts,
    previousCounts: previous?.counts || null,
    hashes: next.hashes,
    rawSha256: hash(fs.readFileSync(path.join(stagingDir, 'raw_data', 'oca_raw_data_full.json'))),
    sheets: workbook.SheetNames.map(name => ({ name, rows: require('xlsx-js-style').utils.sheet_to_json(workbook.Sheets[name], { header: 1 }).length })),
    deltas: {
      hardware: compareSkus(previous?.catalog, next.catalog),
      services: compareSkus(previous?.services, next.services),
      rulesChanged: previous ? JSON.stringify(previous.rules.rules) !== JSON.stringify(next.rules.rules) : true,
      hardwareChanges: next.catalog.metadata.diffSummary || null,
      serviceChanges: next.services.metadata?.diffSummary || null
    },
    cloud: { status: 'PENDING' }
  };
  safeWriteJsonAtomic(path.join(stagingDir, 'capture_receipt.json'), receipt);
  return receipt;
}
function finalizeCaptureReceipt(dir, receipt, sync) {
  if (!['STAGING_AUDITED', 'DIAGNOSTIC_CAPTURE'].includes(receipt?.status)) throw new Error('Capture finalization requires a classified receipt.');
  const completed = { ...receipt, status: receipt.status === 'DIAGNOSTIC_CAPTURE' ? 'DIAGNOSTIC_LOCAL_PROMOTED' : 'LOCAL_PROMOTED', promotedAt: new Date().toISOString(),
    cloud: { status: sync?.syncStatus || 'CLOUD_FAILED', success: sync?.success === true,
      sourceId: sync?.uploadResult?.newSourceId || null, consolidationVerified: sync?.uploadResult?.consolidationVerified === true,
      error: sync?.error || sync?.uploadResult?.message || null } };
  safeWriteJsonAtomic(path.join(dir, 'capture_receipt.json'), completed);
  const history = path.join(dir, 'history', 'capture_receipts');
  fs.mkdirSync(history, { recursive: true });
  safeWriteJsonAtomic(path.join(history, `${receipt.auditedAt.replace(/[:.]/g, '-')}.json`), completed);
  const svPath = path.join(dir, 'scraping_verification_receipt.json');
  if (fs.existsSync(svPath) && sync?.syncStatus === 'CLOUD_VERIFIED') {
    try {
      const sv = JSON.parse(fs.readFileSync(svPath, 'utf8'));
      if (sv?.postflight) {
        sv.postflight.cloudSyncState = 'CLOUD_VERIFIED';
        sv.postflight.pass = sv.postflight.diffSummaryError == null && sv.postflight.diffSummaryPresent !== false;
        sv.postflight.status = sv.postflight.pass ? 'PASSED' : 'ACTION_REQUIRED';
        sv.verifiedAt = completed.promotedAt;
        safeWriteJsonAtomic(svPath, sv);
      }
    } catch (_) { /* preserve receipt if unreadable */ }
  }
  return completed;
}
module.exports = { createCaptureReceipt, finalizeCaptureReceipt, currentRows, skuSet };
