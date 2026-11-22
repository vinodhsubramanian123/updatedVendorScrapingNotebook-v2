'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { safeWriteJsonAtomic, sanitizeOperationalEvidence } = require('../system/fs_compat.js');
const { EXPECTED_TABLE_COLUMN_GROUPS } = require('../scraper/catalog_tab_capture.js');

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
function _parseNumericPrice(value) {
  if (value === null || value === undefined || value === '' || String(value).trim().toUpperCase() === 'N/A') return null;
  const cleaned = Number(String(value).replace(/[$,\s]/g, ''));
  return Number.isFinite(cleaned) ? cleaned : null;
}

function _isChangedSkuRow(row) {
  if (!row || typeof row !== 'object') return false;
  const status = String(row['Diff Status'] || row.diffStatus || '').trim().toUpperCase();
  const attrDeltas = String(row['Attribute Deltas'] || row.attributeDeltas || '').trim();
  const hasChangedStatus = Boolean(status && !['UNCHANGED', 'BASELINE'].includes(status));
  const hasAttrDelta = Boolean(attrDeltas && attrDeltas !== 'None');
  return hasChangedStatus || hasAttrDelta;
}

function _toSkuRowMap(source) {
  const map = new Map();
  if (!source) return map;
  if (source instanceof Map) {
    for (const [k, v] of source.entries()) {
      const sku = String(k || v?.sku || v?.['Product #'] || '').trim();
      if (sku) map.set(sku, v || {});
    }
    return map;
  }
  for (const row of currentRows(source)) {
    const sku = String(row.sku || row['Product #'] || '').trim();
    if (!sku) continue;
    if (!map.has(sku) || (!_isChangedSkuRow(map.get(sku)) && _isChangedSkuRow(row))) {
      map.set(sku, row);
    }
  }
  return map;
}

function _formatComputedPriceDelta(prevNumeric, currNumeric) {
  const delta = currNumeric - prevNumeric;
  const sign = delta >= 0 ? '+' : '-';
  return `${sign}$${Math.abs(delta).toFixed(2)}`;
}

function _pickFirstDefined(...values) {
  for (const val of values) {
    if (val !== undefined && val !== null) return val;
  }
  return null;
}

function _resolveModifiedEntry(sku, prevRow, nextRow) {
  const rawStatus = String(nextRow['Diff Status'] || nextRow.diffStatus || '').trim().toUpperCase();
  const rawAttrDeltas = _pickFirstDefined(nextRow['Attribute Deltas'], nextRow.attributeDeltas, 'None');
  const attributeDeltas = String(rawAttrDeltas).trim() || 'None';
  const currentPrice = _pickFirstDefined(nextRow['List Price (USD)'], nextRow.currentPrice, nextRow.listPrice);
  const previousPrice = _pickFirstDefined(
    nextRow['Previous List Price (USD)'],
    nextRow['Previous Price (USD)'],
    nextRow.previousPrice,
    prevRow['List Price (USD)'],
    prevRow.currentPrice,
    prevRow.listPrice
  );

  const prevNumeric = _parseNumericPrice(_pickFirstDefined(prevRow['List Price (USD)'], prevRow.currentPrice, prevRow.listPrice, previousPrice));
  const currNumeric = _parseNumericPrice(currentPrice);
  const isPriceDiff = prevNumeric !== null && currNumeric !== null && Math.abs(currNumeric - prevNumeric) > 0.001;
  const isStatusModified = Boolean(rawStatus && !['UNCHANGED', 'BASELINE', 'ADDED', 'REMOVED', 'DISCONTINUED'].includes(rawStatus));
  const hasAttrDelta = attributeDeltas !== 'None';

  if (!isPriceDiff && !isStatusModified && !hasAttrDelta) return null;

  let diffStatus = 'MODIFIED';
  if (isStatusModified) diffStatus = rawStatus;
  else if (hasAttrDelta && isPriceDiff) diffStatus = 'PRICE_AND_ATTRIBUTE_CHANGED';
  else if (isPriceDiff) diffStatus = 'PRICE_CHANGED';
  else if (hasAttrDelta) diffStatus = 'ATTRIBUTE_CHANGED';

  const explicitPriceChange = _pickFirstDefined(
    nextRow['Price Change (USD)'],
    nextRow['Price Delta (USD)'],
    nextRow.priceChange,
    nextRow.priceDelta
  );
  const priceChange = explicitPriceChange !== null
    ? explicitPriceChange
    : (isPriceDiff ? _formatComputedPriceDelta(prevNumeric, currNumeric) : null);

  return { sku, diffStatus, previousPrice, currentPrice, priceChange, attributeDeltas };
}

function compareSkus(before, after) {
  const prevMap = _toSkuRowMap(before);
  const nextMap = _toSkuRowMap(after);
  const added = [...nextMap.keys()].filter(sku => !prevMap.has(sku));
  const removed = [...prevMap.keys()].filter(sku => !nextMap.has(sku));
  const modified = [];
  for (const [sku, nextRow] of nextMap.entries()) {
    const prevRow = prevMap.get(sku);
    if (!prevRow) continue;
    const mod = _resolveModifiedEntry(sku, prevRow, nextRow);
    if (mod) modified.push(mod);
  }
  return { added, removed, modified };
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
function _replayReceiptFields(dir, hashes, qualityGate) {
  const conditional = path.join(dir, 'raw_data', 'conditional_skus.json');
  return {
    passed: qualityGate.skipped ? null : qualityGate.passed,
    skipped: qualityGate.skipped === true,
    warningsCount: (qualityGate.warnings || []).length,
    replayResults: qualityGate.replay?.results || [],
    replayExecutedCount: qualityGate.replay?.executedCount || 0,
    replaySuiteVersion: qualityGate.replay?.suiteVersion || null,
    replaySuiteSha256: qualityGate.replay?.suiteSha256 || null,
    replayInputHashes: { ...hashes, 'conditional_skus.json': fs.existsSync(conditional) ? hash(fs.readFileSync(conditional)) : null }
  };
}

function createCaptureReceipt(stagingDir, liveDir, product, options = {}) {
  _validateTestOnlySkipCoverage(options);

  const next = summarizeCatalog(stagingDir, product);
  const raw = readJson(path.join(stagingDir, 'raw_data', 'oca_raw_data_full.json'));
  if (!options.skipCoverageValidation) verifyRegisteredCaptureScope(product, raw);
  const capture = _validateCaptureTimestampAndCounts(next, raw);

  const workbook = require('xlsx-js-style').readFile(path.join(stagingDir, `${product}_OCA_Catalog.xlsx`));
  const coveragePolicy = options.skipCoverageValidation
    ? { valid: true, skipped: true, reason: 'Coverage validation skipped via options' }
    : require('./catalog_coverage.js').validateCatalogCoverage(
      product,
      next.catalog,
      next.services,
      workbook,
      options.profilesPath,
      {
        enforceStagingFloors: options.enforceStagingFloors !== false,
        allowArchivedStub: options.allowArchivedStub === true,
        referenceDate: options.referenceDate
      }
    );
  if (!coveragePolicy.valid) throw new Error(`Capture coverage incomplete: ${coveragePolicy.reason}`);

  _validateWorkbookSheetsAndSkus(workbook, next);
  const qualityGate = options.skipCoverageValidation
    ? { passed: true, skipped: true, blockers: [], warnings: [], replay: { results: [] } }
    : require('./capture_query_replay.js').evaluateCaptureAndReplayGate(stagingDir, product, options);
  if (!qualityGate.passed) {
    throw new Error(`Capture quality and query replay gate failed: ${qualityGate.blockers.join('; ')}`);
  }
  const { previousFile, previousComplete, previous } = _loadPreviousCatalogBaseline(liveDir, product);
  const { selectedBase, ownerConfig, solutionDomain, observedSelectors, missingProvenance } = _extractCaptureProvenance(raw, options);
  const hwSkuDelta = compareSkus(previous?.catalog, next.catalog);
  const svcSkuDelta = compareSkus(previous?.services, next.services);
  const modifiedSkus = [...hwSkuDelta.modified, ...svcSkuDelta.modified];

  const receipt = {
    schemaVersion: 1,
    product,
    vendor: raw.vendor || next.catalog?.metadata?.vendor || 'HPE',
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
      policy: coveragePolicy,
      qualityGate: _replayReceiptFields(stagingDir, next.hashes, qualityGate)
    },
    counts: next.counts,
    previousCounts: previous?.counts || null,
    hashes: next.hashes,
    rawSha256: hash(fs.readFileSync(path.join(stagingDir, 'raw_data', 'oca_raw_data_full.json'))),
    sheets: workbook.SheetNames.map(name => ({ name, rows: require('xlsx-js-style').utils.sheet_to_json(workbook.Sheets[name], { header: 1 }).length })),
    deltas: {
      hardware: hwSkuDelta,
      services: svcSkuDelta,
      modifiedCount: modifiedSkus.length,
      modifiedSkus,
      rulesChanged: previous ? JSON.stringify(previous.rules.rules) !== JSON.stringify(next.rules.rules) : true,
      hardwareChanges: next.catalog.metadata.diffSummary || null,
      serviceChanges: next.services.metadata?.diffSummary || null
    },
    cloud: { status: 'PENDING' }
  };
  safeWriteJsonAtomic(path.join(stagingDir, 'capture_receipt.json'), receipt);
  return receipt;
}
function _applyCloudVerificationToPostflight(sv, sync, promotedAt) {
  if (!sv?.postflight) return false;
  sv.postflight.cloudSyncState = 'CLOUD_VERIFIED';
  if (sync?.notebookId) sv.postflight.notebookId = sync.notebookId;
  const sourceId = sync?.verifiedSourceId || sync?.uploadResult?.newSourceId;
  if (sourceId) sv.postflight.verifiedSourceId = sourceId;
  const sourceName = sync?.verifiedSourceName || sync?.uploadResult?.newSourceName;
  if (sourceName) sv.postflight.verifiedSourceName = sourceName;
  if (sync?.payloadSha256) sv.postflight.payloadSha256 = sync.payloadSha256;
  if (sync?.readbackVerified !== undefined) sv.postflight.readbackVerified = Boolean(sync.readbackVerified);
  if (sync?.canaryVerified !== undefined) sv.postflight.canaryVerified = sync.canaryVerified;
  sv.postflight.cloudVerifiedAt = promotedAt;
  sv.postflight.pass = sv.postflight.diffSummaryError == null && sv.postflight.diffSummaryPresent !== false;
  sv.postflight.status = sv.postflight.pass ? 'PASSED' : 'ACTION_REQUIRED';
  sv.verifiedAt = promotedAt;
  return true;
}

function finalizeCaptureReceipt(dir, receipt, sync) {
  if (!['STAGING_AUDITED', 'DIAGNOSTIC_CAPTURE'].includes(receipt?.status)) throw new Error('Capture finalization requires a classified receipt.');
  const completed = sanitizeOperationalEvidence({ ...receipt, status: receipt.status === 'DIAGNOSTIC_CAPTURE' ? 'DIAGNOSTIC_LOCAL_PROMOTED' : 'LOCAL_PROMOTED', promotedAt: new Date().toISOString(),
    cloud: { status: sync?.syncStatus || 'CLOUD_FAILED', success: sync?.success === true,
      sourceId: sync?.uploadResult?.newSourceId || sync?.verifiedSourceId || null, consolidationVerified: sync?.uploadResult?.consolidationVerified === true,
      error: sync?.error || sync?.uploadResult?.message || null } });
  safeWriteJsonAtomic(path.join(dir, 'capture_receipt.json'), completed);
  const history = path.join(dir, 'history', 'capture_receipts');
  fs.mkdirSync(history, { recursive: true });
  safeWriteJsonAtomic(path.join(history, `${receipt.auditedAt.replace(/[:.]/g, '-')}.json`), completed);
  const svPath = path.join(dir, 'scraping_verification_receipt.json');
  if (fs.existsSync(svPath) && sync?.syncStatus === 'CLOUD_VERIFIED') {
    try {
      const sv = JSON.parse(fs.readFileSync(svPath, 'utf8'));
      if (_applyCloudVerificationToPostflight(sv, sync, completed.promotedAt)) {
        safeWriteJsonAtomic(svPath, sanitizeOperationalEvidence(sv));
      }
    } catch (_) { /* preserve receipt if unreadable */ }
  }
  require('./capture_query_replay.js').replayPromotedCatalogProbes(dir, completed);
  return completed;
}
function _deriveColumnCoverageFromRaw(raw, existingCoverage) {
  if (existingCoverage?.verified === true) return existingCoverage;
  const headerTexts = [];
  for (const table of (raw?.tables || [])) {
    for (const row of (table?.rows || []).slice(0, 4)) {
      if (!Array.isArray(row)) continue;
      for (const cell of row) {
        const text = String(cell || '').trim();
        if (text && text.length < 80) headerTexts.push(text);
      }
    }
  }
  if (!headerTexts.length) return existingCoverage || null;
  const present = {};
  const missing = [];
  for (const [key, regex] of Object.entries(EXPECTED_TABLE_COLUMN_GROUPS)) {
    const ok = headerTexts.some(h => regex.test(h));
    present[key] = ok;
    if (!ok) missing.push(key);
  }
  return {
    verified: Boolean(present.sku && present.description),
    present,
    missing,
    derivedFromRaw: true
  };
}

function reconcileRebuiltCaptureReceipt(dir, product) {
  if (!dir || !product) return null;
  const receiptPath = path.join(dir, 'capture_receipt.json');
  const rawPath = path.join(dir, 'raw_data', 'oca_raw_data_full.json');
  if (!fs.existsSync(receiptPath) || !fs.existsSync(rawPath)) return null;
  const requiredArtifacts = ['Catalog.json', 'Services.json', 'Catalog_Rules.json', 'OCA_Catalog.xlsx'];
  if (!requiredArtifacts.every(suffix => fs.existsSync(path.join(dir, `${product}_${suffix}`)))) {
    return null;
  }

  try {
    const receipt = readJson(receiptPath);
    const rawBytes = fs.readFileSync(rawPath);
    const currentRawSha256 = hash(rawBytes);
    if (!receipt || receipt.product !== product || receipt.rawSha256 !== currentRawSha256) {
      return null;
    }
    const raw = JSON.parse(rawBytes.toString('utf8'));
    const next = summarizeCatalog(dir, product);
    _validateCaptureTimestampAndCounts(next, raw);
    const workbook = require('xlsx-js-style').readFile(path.join(dir, `${product}_OCA_Catalog.xlsx`));
    _validateWorkbookSheetsAndSkus(workbook, next);

    const qualityGate = require('./capture_query_replay.js').evaluateCaptureAndReplayGate(dir, product);
    if (!qualityGate.passed) return null;

    const nextReplay = _replayReceiptFields(dir, next.hashes, qualityGate);
    const prevQg = receipt.coverage?.qualityGate || {};
    const nextColumnCoverage = _deriveColumnCoverageFromRaw(raw, receipt.coverage?.columnCoverage);
    const hashesChanged = Object.entries(next.hashes).some(([k, v]) => receipt.hashes?.[k] !== v);
    const replayChanged = prevQg.replaySuiteSha256 !== nextReplay.replaySuiteSha256
      || prevQg.replaySuiteVersion !== nextReplay.replaySuiteVersion
      || prevQg.replayExecutedCount !== nextReplay.replayExecutedCount;
    const colCovChanged = Boolean(nextColumnCoverage?.verified) !== Boolean(receipt.coverage?.columnCoverage?.verified);
    if (!hashesChanged && !replayChanged && !colCovChanged) return receipt;

    const updated = {
      ...receipt,
      counts: next.counts,
      hashes: next.hashes,
      coverage: {
        ...receipt.coverage,
        ...(nextColumnCoverage ? { columnCoverage: nextColumnCoverage } : {}),
        qualityGate: nextReplay
      },
      rebuiltAt: new Date().toISOString()
    };
    safeWriteJsonAtomic(receiptPath, updated);
    return updated;
  } catch {
    return null;
  }
}

module.exports = { createCaptureReceipt, finalizeCaptureReceipt, reconcileRebuiltCaptureReceipt, compareSkus, currentRows, skuSet };
