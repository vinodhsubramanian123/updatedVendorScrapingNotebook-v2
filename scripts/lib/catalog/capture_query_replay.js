'use strict';

const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');
const { cleanBaseSKU, isValidHpeSKU } = require('./sku.js');
const { parseStrictPrice, parseLeadTimeOrEta, isSuspectedDateParseInteger } = require('./field_parsers.js');
const { parseCatalogSearchQuery, executeCatalogSearch, verifyCatalogSearchResponse, lookupCatalogSku } = require('./catalog_query_engine.js');
const { parsePriceDriftQuery, findCatalogPriceDrifts } = require('./catalog_price_drifts.js');
const { resolveCatalogProbes } = require('./catalog_probe_queue.js');

const DEFAULT_REPLAY_SUITE_PATH = path.resolve(__dirname, '../../config/catalog_query_replay_suite.json');

function _readJsonSafe(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function _inspectHeadersQuality(entries, blockers) {
  for (const entry of entries || []) {
    const headers = Array.isArray(entry.headers) ? entry.headers : [];
    if (headers.length > 20) {
      blockers.push(`Entry [${entry.parentCategory} > ${entry.subCategory}] has mega-row header width (${headers.length} columns > 20).`);
      continue;
    }
    const badHeader = headers.find((h) => {
      const s = String(h || '').trim();
      return /^\$[\d,]+(?:\.\d{2})?$/.test(s) || /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s) || isValidHpeSKU(cleanBaseSKU(s));
    });
    if (badHeader) {
      blockers.push(`Entry [${entry.parentCategory} > ${entry.subCategory}] has non-header value "${badHeader}" in headers.`);
    }
  }
}

function _inspectRowPricingAndLeadTime(entries, sourceLabel, blockers) {
  let inspectedRows = 0;
  for (const entry of entries || []) {
    for (const row of entry.skus || []) {
      inspectedRows++;
      const sku = cleanBaseSKU(row['Product #'] || row.sku) || String(row.sku || row['Product #'] || 'UNKNOWN');
      if (row.priceState === 'PARSE_FAILED' || row.priceState === 'CONFLICTING_EVIDENCE' || row.priceStatus === 'SHIFTED_COLUMN_REJECTED') {
        blockers.push(`${sourceLabel} SKU ${sku} has invalid priceState=${row.priceState || row.priceStatus}.`);
        continue;
      }
      const rawPrice = row['List Price (USD)'] ?? row['Unit Price (USD)'] ?? row['Price (USD)'] ?? row.listPrice;
      const parsed = parseStrictPrice(rawPrice, { row, sku });
      if (parsed.priceState === 'PARSE_FAILED') {
        blockers.push(`${sourceLabel} SKU ${sku} contains malformed/shifted/date price "${String(rawPrice)}".`);
      } else if (parsed.priceUsd !== null && isSuspectedDateParseInteger(Math.round(parsed.priceUsd))) {
        blockers.push(`${sourceLabel} SKU ${sku} price ${parsed.priceUsd} matches suspected date-parse corruption.`);
      }

      const rawLt = String(row['Lead Time'] || row.leadTime || '').trim();
      if (rawLt && !/^(?:unpublished|not published|standard|n\/?a|)$/i.test(rawLt) && row.leadTimeDays != null) {
        const reparsed = parseLeadTimeOrEta(rawLt, null, null);
        if (reparsed.unit === 'WEEKS' && Number(row.leadTimeDays) < reparsed.minDays) {
          blockers.push(`${sourceLabel} SKU ${sku} leadTimeDays=${row.leadTimeDays} dropped weeks multiplier for "${rawLt}".`);
        }
        if (reparsed.rawType === 'ETA_DATE' && row.leadTimeDays !== null) {
          blockers.push(`${sourceLabel} SKU ${sku} converted ETA date "${rawLt}" into leadTimeDays=${row.leadTimeDays}.`);
        }
      }
    }
  }
  return inspectedRows;
}

function _inspectDiagnosticsAndMatrixParity(catalogJson, rulesJson, diagJson, blockers, warnings) {
  if (diagJson?.summary?.totalUniqueSKUs !== undefined && catalogJson?.metadata?.totalUniqueSKUs !== undefined) {
    if (Number(diagJson.summary.totalUniqueSKUs) !== Number(catalogJson.metadata.totalUniqueSKUs)) {
      blockers.push(`Diagnostics totalUniqueSKUs (${diagJson.summary.totalUniqueSKUs}) disagrees with Catalog metadata (${catalogJson.metadata.totalUniqueSKUs}).`);
    }
  }
  const matrix = rulesJson?.chassisVariantMatrix || {};
  for (const entry of catalogJson?.entries || []) {
    const isChassis = (entry.parentCategory || '').toLowerCase() === 'chassis' || (entry.subCategory || '').toLowerCase() === 'variants';
    if (!isChassis) continue;
    for (const s of entry.skus || []) {
      const pn = cleanBaseSKU(s['Product #'] || s.sku);
      if (!pn || !isValidHpeSKU(pn)) continue;
      const p = parseStrictPrice(s.listPrice ?? s['List Price (USD)'] ?? s['Unit Price (USD)'], { row: s, sku: pn });
      if (p.priceUsd && p.priceUsd > 0 && Object.keys(matrix).length > 0 && !matrix[pn]) {
        warnings.push(`Base SKU ${pn} present in Catalog.json (${p.priceUsd} USD) is missing from chassisVariantMatrix.`);
      }
    }
  }
}

/**
 * Validate structural integrity, strict field quality, and diagnostics parity on a built catalog.
 * @param {string} catalogDir
 * @param {string} product
 * @returns {{ passed: boolean, blockers: string[], warnings: string[], metrics: object }}
 */
function evaluateCaptureQualityGate(catalogDir, product) {
  const blockers = [];
  const warnings = [];
  const catalogJson = _readJsonSafe(path.join(catalogDir, `${product}_Catalog.json`));
  const servicesJson = _readJsonSafe(path.join(catalogDir, `${product}_Services.json`));
  const rulesJson = _readJsonSafe(path.join(catalogDir, `${product}_Catalog_Rules.json`));
  const diagJson = _readJsonSafe(path.join(catalogDir, 'history', 'classification_diagnostics.json'));

  if (!catalogJson || !Array.isArray(catalogJson.entries)) {
    blockers.push(`Missing or invalid ${product}_Catalog.json at ${catalogDir}.`);
    return { passed: false, blockers, warnings, metrics: { hwRows: 0, svcRows: 0 } };
  }

  _inspectHeadersQuality(catalogJson.entries, blockers);
  if (servicesJson?.entries) _inspectHeadersQuality(servicesJson.entries, blockers);
  const hwRows = _inspectRowPricingAndLeadTime(catalogJson.entries, 'Catalog', blockers);
  const svcRows = servicesJson?.entries ? _inspectRowPricingAndLeadTime(servicesJson.entries, 'Services', blockers) : 0;
  _inspectDiagnosticsAndMatrixParity(catalogJson, rulesJson, diagJson, blockers, warnings);

  return {
    passed: blockers.length === 0,
    blockers,
    warnings,
    metrics: { hwRows, svcRows }
  };
}

const CASE_FIELDS = {
  skuLookup: ['id', 'kind', 'sku', 'minPriceUsd', 'rejectDatePrices'],
  catalogSearch: ['id', 'kind', 'query', 'allowZeroMatches', 'verifyLeadTimeMeasured', 'allowPartial'],
  priceDrift: ['id', 'kind', 'query', 'assertNoTrailConflicts']
};

function _readReplaySuite(suitePath) {
  try {
    const bytes = fs.readFileSync(suitePath);
    const suite = JSON.parse(bytes.toString('utf8'));
    if (!/^1\.\d+\.\d+$/.test(suite?.schemaVersion || '') || !suite.productQueries ||
        typeof suite.productQueries !== 'object' || Array.isArray(suite.productQueries)) return null;
    return { suite, sha256: createHash('sha256').update(bytes).digest('hex') };
  } catch { return null; }
}

function _validateReplayCase(spec, kinds) {
  if (!spec || typeof spec.id !== 'string' || !spec.id.trim() || !kinds.includes(spec.kind)) return false;
  if (Object.keys(spec).some(key => !CASE_FIELDS[spec.kind].includes(key))) return false;
  if (spec.kind === 'skuLookup') return typeof spec.sku === 'string' && isValidHpeSKU(spec.sku) &&
    (!Object.hasOwn(spec, 'minPriceUsd') || (Number.isFinite(spec.minPriceUsd) && spec.minPriceUsd >= 0)) &&
    (!Object.hasOwn(spec, 'rejectDatePrices') || typeof spec.rejectDatePrices === 'boolean');
  const flags = CASE_FIELDS[spec.kind].slice(3);
  return typeof spec.query === 'string' && spec.query.trim().length > 0 &&
    flags.every(key => !Object.hasOwn(spec, key) || typeof spec[key] === 'boolean');
}

function _runSingleSkuLookupReplay(spec, catalog) {
  const match = lookupCatalogSku(catalog, spec.sku);
  if (!match?.source) return ['Expected SKU was not found in the staged catalog.'];
  const { priceUsd, priceState } = match.price;
  if (['PARSE_FAILED', 'CONFLICTING_EVIDENCE'].includes(priceState)) return ['SKU pricing evidence is ' + priceState + '.'];
  if (spec.minPriceUsd != null && (!Number.isFinite(priceUsd) || priceUsd < spec.minPriceUsd)) return ['SKU price is below the expected floor or unavailable.'];
  if (spec.rejectDatePrices && isSuspectedDateParseInteger(priceUsd)) return ['SKU price resembles a date.'];
  return [];
}

function _runSearchReplay(spec, catalog) {
  const parsed = parseCatalogSearchQuery(spec.query, { catalogs: [catalog], selectedProduct: catalog.id });
  if (!parsed) return { skipped: true, issues: ['Required query could not be parsed.'] };
  const payload = executeCatalogSearch(parsed, { catalogs: [catalog], recordMiss: false });
  const check = verifyCatalogSearchResponse(payload, parsed);
  const issues = [];
  if (check.status !== 'PASSED' &&
      !(spec.allowPartial && check.status === 'PARTIAL' && !payload.summary.excludedConflictCount)) issues.push(...check.issues);
  if (!payload.summary.totalRowsScanned || payload.sources.some(source => ['INVALID', 'UNREADABLE'].includes(source.status))) {
    issues.push('Replay requires readable staged source rows.');
  }
  if (spec.allowZeroMatches === false && !payload.results.length) issues.push('Expected at least one matching row.');
  if (spec.verifyLeadTimeMeasured && (!payload.results.length || payload.results.some(row => !row.leadTime?.isPublished || !Number.isFinite(row.leadTimeDays)))) {
    issues.push('Expected measured lead-time evidence on returned rows.');
  }
  return { issues, returnedCount: payload.results.length, evidenceStatus: check.status };
}

function _executeReplayCases(bundle, cases, kinds, runCase) {
  if (!bundle || !Array.isArray(cases) || !cases.length) {
    return { passed: false, executedCount: 0, blockers: ['No readable, applicable replay cases.'], results: [] };
  }
  const seen = new Set();
  let executedCount = 0;
  const results = cases.map(spec => {
    const id = spec?.id || '(missing ID)';
    if (!_validateReplayCase(spec, kinds) || seen.has(id)) {
      return { id, passed: false, status: 'INVALID_CASE', issues: ['Invalid case, assertion, or duplicate ID.'] };
    }
    seen.add(id);
    const outcome = runCase(spec);
    if (!outcome.skipped) executedCount++;
    const passed = !outcome.issues.length && !outcome.skipped;
    return { id, ...outcome, passed, status: outcome.skipped ? 'SKIPPED' : (passed ? 'PASSED' : 'FAILED') };
  });
  const blockers = results.filter(result => !result.passed).map(result => 'Replay ' + result.id + ': ' + result.issues.join(' '));
  if (!executedCount) blockers.push('No replay cases executed.');
  return { passed: blockers.length === 0, executedCount, suiteVersion: bundle.suite.schemaVersion, suiteSha256: bundle.sha256, blockers, results };
}

function runCaptureQueryReplay(catalogDir, product, options = {}) {
  const bundle = _readReplaySuite(options.suitePath || DEFAULT_REPLAY_SUITE_PATH);
  const catalogJsonPath = path.join(catalogDir, product + '_Catalog.json');
  const data = _readJsonSafe(catalogJsonPath);
  if (!data || !bundle) return _executeReplayCases(null, null);
  const catalog = { id: product, chassis: data.metadata?.chassis, gen: data.metadata?.generation, catalogDir, catalogJsonPath };
  let cases = bundle.suite.productQueries[product];
  if (cases === undefined) {
    const template = bundle.suite.defaultProductQueryTemplate;
    if (typeof template?.query === 'string') cases = [{ ...template, query: template.query.replace(/\{PRODUCT\}/g, product) }];
  }
  return _executeReplayCases(bundle, cases, ['skuLookup', 'catalogSearch'], spec => spec.kind === 'skuLookup'
    ? { issues: _runSingleSkuLookupReplay(spec, catalog) } : _runSearchReplay(spec, catalog));
}

function runPortfolioQueryReplay(catalogs, options = {}) {
  const bundle = _readReplaySuite(options.suitePath || DEFAULT_REPLAY_SUITE_PATH);
  return _executeReplayCases(bundle, bundle?.suite.portfolioQueries, ['priceDrift'], spec => {
    const request = parsePriceDriftQuery(spec.query);
    if (!request) return { skipped: true, issues: ['Required portfolio query could not be parsed.'] };
    const { coverage } = findCatalogPriceDrifts(catalogs, request);
    const issues = [];
    if (!coverage.snapshotsRead || coverage.issues.length) issues.push('Portfolio snapshot evidence was unavailable or unreadable.');
    if (spec.assertNoTrailConflicts && coverage.trailConflictCount) issues.push('Dated snapshots disagree with the price trail.');
    return { issues, snapshotsRead: coverage.snapshotsRead, trailConflictCount: coverage.trailConflictCount };
  });
}

function replayPromotedCatalogProbes(catalogDir, receipt, options = {}) {
  const product = receipt.product;
  const catalog = { id: product, catalogDir, catalogJsonPath: path.join(catalogDir, product + '_Catalog.json') };
  return resolveCatalogProbes(receipt, request => {
    const payload = executeCatalogSearch(request, { catalogs: [catalog], recordMiss: false });
    const verified = verifyCatalogSearchResponse(payload, request);
    const expected = receipt.coverage.qualityGate.replayInputHashes || {};
    const byKind = new Map(payload.sources.map(source => [source.kind, source]));
    const matches = byKind.get('CATALOG')?.sha256 === expected['Catalog.json'] &&
      byKind.get('SERVICES')?.sha256 === expected['Services.json'] &&
      (byKind.get('CONDITIONAL')?.sha256 || null) === expected['conditional_skus.json'];
    if (!matches) return { passed: false, invalid: true, disposition: 'STAGED_SOURCE_HASH_MISMATCH' };
    return { passed: verified.passed && payload.summary.totalRowsScanned > 0,
      invalid: verified.status === 'FAILED', disposition: verified.status, returnedCount: payload.summary.returnedCount };
  }, options);
}

/**
 * Combined pre-promotion gate running capture quality + product replay suite.
 * @param {string} catalogDir
 * @param {string} product
 * @param {object} [options]
 * @returns {{ passed: boolean, quality: object, replay: object, blockers: string[], warnings: string[] }}
 */
function evaluateCaptureAndReplayGate(catalogDir, product, options = {}) {
  const quality = evaluateCaptureQualityGate(catalogDir, product);
  const replay = runCaptureQueryReplay(catalogDir, product, options);
  const blockers = [...quality.blockers, ...replay.blockers];
  return {
    passed: blockers.length === 0,
    quality,
    replay,
    blockers,
    warnings: quality.warnings
  };
}

module.exports = {
  evaluateCaptureQualityGate,
  runCaptureQueryReplay,
  runPortfolioQueryReplay,
  replayPromotedCatalogProbes,
  evaluateCaptureAndReplayGate
};
