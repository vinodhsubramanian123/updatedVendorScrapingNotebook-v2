'use strict';
/**
 * scripts/lib/catalog/portfolio_blindspots.js
 *
 * Audits collected, skipped, and classified catalog artifacts across the portfolio
 * (classification_diagnostics.json, *_Catalog.json, *_Services.json, *_Catalog_Rules.json)
 * to surface hidden data gaps, unnormalized lifecycle labels, $0 base variants,
 * sentinel quantities, and attribute fidelity deficits.
 */

const fs = require('fs');
const path = require('path');
const { listAllCatalogs } = require('./catalog_discovery.js');
const { safeWriteJsonAtomic } = require('../system/fs_compat.js');
const { parseStrictPrice, isConfirmedZeroByPolicy } = require('./field_parsers.js');

const LIFECYCLE_NORMALIZATION_RULES = [
  { canonical: 'EOL_90_DAY_WARNING', pattern: /90[\s-]*day|\beol\s*warning\b/i },
  { canonical: 'OBSOLETE', pattern: /\bobsolete\b|\(\s*ob\s*\)|\bdiscontinued\b/i },
  { canonical: 'DIRECT_SHIP', pattern: /\bdirect\s*ship\b/i },
  { canonical: 'ACTIVE', pattern: /^active$/i }
];

function normalizeLifecycleLabel(rawLabel = '') {
  const raw = String(rawLabel || '').trim();
  if (!raw) return 'UNKNOWN';
  for (const rule of LIFECYCLE_NORMALIZATION_RULES) {
    if (rule.pattern.test(raw)) return rule.canonical;
  }
  return raw.toUpperCase().replace(/\s+/g, '_');
}

function _readJsonSafe(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function _auditSkippedAndTableDecisions(diag, findings) {
  const skipped = Array.isArray(diag?.skippedTables) ? diag.skippedTables : [];
  const nonEmptySkipped = skipped.filter(t => !/rows\s*<\s*2|empty/i.test(String(t?.reason || '')));
  if (nonEmptySkipped.length > 0) {
    findings.push({
      code: 'SKIPPED_NON_EMPTY_TABLES',
      severity: 'MEDIUM',
      count: nonEmptySkipped.length,
      message: `${nonEmptySkipped.length} non-empty raw table(s) skipped during extraction (${nonEmptySkipped.slice(0, 3).map(t => t.reason).join('; ')}).`
    });
  }

  const tableDecisions = Array.isArray(diag?.tableDecisions) ? diag.tableDecisions : [];
  const sentinelMaxRows = tableDecisions.filter(td => Number.isFinite(td?.maxQty) && td.maxQty !== null && td.maxQty < 0 && !td?.maxQtySemantics);
  if (sentinelMaxRows.length > 0) {
    findings.push({
      code: 'SENTINEL_MAX_QTY',
      severity: 'LOW',
      count: sentinelMaxRows.length,
      sampleSubcategories: [...new Set(sentinelMaxRows.map(r => r.subCategory))].slice(0, 5),
      message: `${sentinelMaxRows.length} table decision(s) carry negative maxQty sentinels (e.g. -1/-2) instead of null/unbounded.`
    });
  }
}

function _auditLifecycleAndChassisVariants(diag, findings) {
  const lifeDist = diag?.attributeFidelity?.lifecycleStatusDistribution || {};
  const byCanonical = new Map();
  for (const [rawLabel, count] of Object.entries(lifeDist)) {
    const canonical = normalizeLifecycleLabel(rawLabel);
    if (!byCanonical.has(canonical)) byCanonical.set(canonical, []);
    byCanonical.get(canonical).push({ rawLabel, count });
  }
  const splitGroups = [];
  for (const [canonical, variants] of byCanonical.entries()) {
    if (variants.length > 1) splitGroups.push({ canonical, variants });
  }
  if (splitGroups.length > 0) {
    findings.push({
      code: 'UNNORMALIZED_LIFECYCLE_LABELS',
      severity: 'MEDIUM',
      count: splitGroups.length,
      splitGroups,
      message: `Fragmented lifecycle status labels map to the same canonical state: ${splitGroups.map(g => `${g.canonical} <= [${g.variants.map(v => v.rawLabel).join(', ')}]`).join('; ')}.`
    });
  }

  const variantsMatrix = diag?.chassisVariantsMatrix || {};
  const zeroBaseVariants = Object.entries(variantsMatrix)
    .filter(([, meta]) => !(Number(meta?.listPrice) > 0) && !/removed/i.test(String(meta?.description || '')))
    .map(([sku]) => sku);
  if (zeroBaseVariants.length > 0) {
    findings.push({
      code: 'ZERO_PRICE_BASE_VARIANTS',
      severity: 'HIGH',
      count: zeroBaseVariants.length,
      skus: zeroBaseVariants,
      message: `${zeroBaseVariants.length} active base chassis variant(s) have $0/missing listPrice in chassisVariantsMatrix: [${zeroBaseVariants.join(', ')}].`
    });
  }
}

function _rawHasCostColumn(catalogEntry) {
  if (!catalogEntry?.catalogDir) return null;
  const raw = _readJsonSafe(path.join(catalogEntry.catalogDir, 'raw_data', 'oca_raw_data_full.json'));
  if (!raw || !Array.isArray(raw.tables)) return null;
  return raw.tables.some(t => (t.rows || []).slice(0, 4).some(r =>
    Array.isArray(r) && r.some(cell => /\bcost\b/i.test(String(cell || '')))
  ));
}

function _auditAttributeAndCategoryFidelity(diag, catalogEntry, findings) {
  const totalSkus = Number(diag?.summary?.totalExtractedSKUs || 0);
  const fid = diag?.attributeFidelity || {};
  if (totalSkus > 0) {
    const leadTimeCov = Number(fid.skusWithLeadTime || 0) / totalSkus;
    if (leadTimeCov < 0.5) {
      findings.push({
        code: 'LOW_LEADTIME_COVERAGE',
        severity: 'MEDIUM',
        coveragePct: Math.round(leadTimeCov * 100),
        message: `Lead time populated on ${fid.skusWithLeadTime || 0}/${totalSkus} extracted SKUs (${Math.round(leadTimeCov * 100)}%).`
      });
    }
    if (Number(fid.skusWithCost || 0) === 0) {
      const rawHasCost = _rawHasCostColumn(catalogEntry);
      findings.push({
        code: 'ZERO_COST_COLUMN_COVERAGE',
        severity: 'LOW',
        ...(rawHasCost === false ? { portalEntitlementNote: 'PORTAL_COST_COLUMN_UNENTITLED' } : {}),
        message: `Partner Cost (USD) column is absent/empty across all ${totalSkus} extracted SKUs (list price only).`
      });
    }
    const unpub = Number(fid.clicStatusDistribution?.Unpublished || 0);
    if (unpub / totalSkus > 0.8) {
      findings.push({
        code: 'HIGH_UNPUBLISHED_CLIC_SHARE',
        severity: 'LOW',
        unpublishedPct: Math.round((unpub / totalSkus) * 100),
        message: `${unpub}/${totalSkus} (${Math.round((unpub / totalSkus) * 100)}%) SKUs lack per-row CLIC Status in catalog capture.`
      });
    }
  }

  const catDist = diag?.categoryDistribution || {};
  const swCount = Number(catDist['Software & Licenses'] || 0);
  const svcCount = Number(catDist['Support Services'] || 0);
  const servicesPath = catalogEntry?.servicesJsonPath || path.join(catalogEntry.catalogDir, `${catalogEntry.id}_Services.json`);
  const hasServicesFile = Boolean(catalogEntry?.hasServices || fs.existsSync(servicesPath));
  if (swCount > 100 && svcCount <= 1 && !hasServicesFile) {
    findings.push({
      code: 'SERVICES_CATEGORY_IMBALANCE',
      severity: 'MEDIUM',
      softwareCount: swCount,
      supportCount: svcCount,
      message: `Catalog records ${swCount} Software & Licenses SKUs vs ${svcCount} Support Services SKU(s) and no companion *_Services.json.`
    });
  } else if (swCount > 100 && svcCount <= 1 && hasServicesFile) {
    findings.push({
      code: 'SERVICES_SPLIT_COMPANION_FILE',
      severity: 'LOW',
      softwareCount: swCount,
      supportCount: svcCount,
      message: `Support Services live in companion ${path.basename(servicesPath)} rather than main catalog categoryDistribution (${svcCount} in main JSON vs ${swCount} Software & Licenses).`
    });
  }
}

function _auditActiveZeroPriceSkus(catalogJson, findings) {
  if (!catalogJson || !Array.isArray(catalogJson.entries)) return;
  const zeroPricedActive = [];
  const unpricedPrivateOrRegional = [];
  for (const entry of catalogJson.entries) {
    for (const skuRow of (entry.skus || [])) {
      const pn = String(skuRow['Product #'] || skuRow.sku || '').trim();
      const desc = String(skuRow.Description || skuRow.description || '');
      const life = normalizeLifecycleLabel(skuRow['Lifecycle Status'] || skuRow.lifecycleStatus || 'Active');
      const rawPrice = skuRow['Unit Price (USD)'] ?? skuRow['Price (USD)'] ?? skuRow.listPrice;
      const parsed = parseStrictPrice(rawPrice, { row: skuRow, sku: pn, description: desc });
      const isFioIncluded = isConfirmedZeroByPolicy(pn, desc, skuRow);
      if (!pn || life !== 'ACTIVE' || isFioIncluded || parsed.priceState === 'PARSE_FAILED') continue;
      if (parsed.priceUsd !== null && parsed.priceUsd > 0) continue;
      if (skuRow.isPrivateSku === true || skuRow.priceState === 'PRIVATE_UNPRICED' || skuRow.priceState === 'REGIONAL_NA_UNPRICED') {
        unpricedPrivateOrRegional.push(pn);
      } else {
        zeroPricedActive.push(pn);
      }
    }
  }
  const uniqueZero = [...new Set(zeroPricedActive)];
  if (uniqueZero.length > 0) {
    findings.push({
      code: 'ZERO_PRICE_ACTIVE_NON_FIO_SKUS',
      severity: 'MEDIUM',
      count: uniqueZero.length,
      sampleSkus: uniqueZero.slice(0, 10),
      message: `${uniqueZero.length} active non-FIO SKU(s) have $0/unparsed list price (sample: ${uniqueZero.slice(0, 5).join(', ')}).`
    });
  }
  const uniquePrivateRegional = [...new Set(unpricedPrivateOrRegional)];
  if (uniquePrivateRegional.length > 0) {
    findings.push({
      code: 'UNPRICED_PRIVATE_OR_REGIONAL_SKUS',
      severity: 'LOW',
      count: uniquePrivateRegional.length,
      sampleSkus: uniquePrivateRegional.slice(0, 10),
      message: `${uniquePrivateRegional.length} private or regional-NA SKU(s) have intentionally unpriced portal status (sample: ${uniquePrivateRegional.slice(0, 5).join(', ')}).`
    });
  }
}

const SHIFTED_PRICE_TOKEN_RE = /[A-Z0-9]{4,8}-[A-Z0-9]{2,4}|\[(?:90|OB|DS|EOL)\]/i;

function _collectShiftedRows(jsonObj, sourceName, out, malformedOut = []) {
  if (!jsonObj || !Array.isArray(jsonObj.entries)) return;
  for (const entry of jsonObj.entries) {
    for (const skuRow of (entry.skus || [])) {
      const pn = String(skuRow['Product #'] || skuRow.sku || '').trim();
      const rawPrice = String(skuRow['Unit Price (USD)'] ?? skuRow['Price (USD)'] ?? '').trim();
      if (rawPrice && SHIFTED_PRICE_TOKEN_RE.test(rawPrice)) {
        out.push({ sku: pn, rawPrice, sourceName });
        continue;
      }
      if (rawPrice) {
        const parsed = parseStrictPrice(rawPrice, { row: skuRow, sku: pn });
        if (parsed.priceState === 'PARSE_FAILED' || parsed.priceState === 'CONFLICTING_EVIDENCE') {
          malformedOut.push({ sku: pn, rawPrice, priceState: parsed.priceState, reason: parsed.reason, sourceName });
        }
      } else if (skuRow.priceState === 'PARSE_FAILED' || skuRow.priceState === 'CONFLICTING_EVIDENCE') {
        malformedOut.push({ sku: pn, rawPrice: '', priceState: skuRow.priceState, sourceName });
      }
    }
  }
}

function _auditShiftedColumnRows(catalogEntry, catalogJson, servicesPath, findings) {
  const shifted = [];
  const malformed = [];
  _collectShiftedRows(catalogJson, path.basename(catalogEntry.catalogJsonPath || ''), shifted, malformed);
  const servicesJson = _readJsonSafe(servicesPath);
  _collectShiftedRows(servicesJson, path.basename(servicesPath || ''), shifted, malformed);
  if (shifted.length > 0) {
    findings.push({
      code: 'SHIFTED_COLUMN_CORRUPTION',
      severity: 'HIGH',
      count: shifted.length,
      sampleRows: shifted.slice(0, 5),
      message: `${shifted.length} catalog row(s) contain shifted SKU/badge tokens inside Unit Price (USD) (e.g. ${shifted[0].sku}: "${shifted[0].rawPrice}").`
    });
  }
  if (malformed.length > 0) {
    findings.push({
      code: 'MALFORMED_OR_CONFLICTING_PRICE',
      severity: 'HIGH',
      count: malformed.length,
      sampleRows: malformed.slice(0, 5),
      message: `${malformed.length} catalog row(s) have date-corrupted, delta-corrupted, or conflicting prices (e.g. ${malformed[0].sku}: "${malformed[0].rawPrice}").`
    });
  }
}

function auditProductBlindspots(catalogEntry) {
  const catalogDir = catalogEntry.catalogDir;
  const diagPath = path.join(catalogDir, 'history', 'classification_diagnostics.json');
  const diag = _readJsonSafe(diagPath);
  const catalogJson = _readJsonSafe(catalogEntry.catalogJsonPath);
  const rulesPath = catalogEntry.rulesJsonPath || path.join(catalogDir, `${catalogEntry.id}_Catalog_Rules.json`);
  const servicesPath = catalogEntry.servicesJsonPath || path.join(catalogDir, `${catalogEntry.id}_Services.json`);
  const hasRules = Boolean(fs.existsSync(rulesPath));
  const hasServices = Boolean(catalogEntry.hasServices || fs.existsSync(servicesPath));
  const findings = [];

  if (!diag) {
    findings.push({
      code: 'MISSING_CLASSIFICATION_DIAGNOSTICS',
      severity: 'MEDIUM',
      message: 'No history/classification_diagnostics.json recorded for this product.'
    });
  } else {
    _auditSkippedAndTableDecisions(diag, findings);
    _auditLifecycleAndChassisVariants(diag, findings);
    _auditAttributeAndCategoryFidelity(diag, catalogEntry, findings);
  }

  if (!hasRules) {
    findings.push({
      code: 'MISSING_CATALOG_RULES',
      severity: 'HIGH',
      message: 'Catalog_Rules.json missing; deterministic dependency coverage is incomplete.'
    });
  }

  _auditActiveZeroPriceSkus(catalogJson, findings);
  _auditShiftedColumnRows(catalogEntry, catalogJson, servicesPath, findings);

  return {
    product: catalogEntry.id,
    family: catalogEntry.family,
    gen: catalogEntry.gen,
    catalogDir,
    hasDiagnostics: Boolean(diag),
    hasRules,
    hasServices,
    totalUniqueSKUs: Number(catalogEntry.skuCount || diag?.summary?.totalUniqueSKUs || 0),
    findingsCount: findings.length,
    highSeverityCount: findings.filter(f => f.severity === 'HIGH').length,
    mediumSeverityCount: findings.filter(f => f.severity === 'MEDIUM').length,
    lowSeverityCount: findings.filter(f => f.severity === 'LOW').length,
    findings
  };
}

function auditPortfolioBlindspots(options = {}) {
  const allCatalogs = Array.isArray(options.catalogs) ? options.catalogs : listAllCatalogs();
  const filterProduct = options.product ? String(options.product).trim().toLowerCase() : null;
  const scoped = filterProduct
    ? allCatalogs.filter(c => String(c.id || '').toLowerCase().includes(filterProduct))
    : allCatalogs;

  const byProduct = scoped.map(auditProductBlindspots);
  const codeCounts = {};
  let totalFindings = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  for (const prod of byProduct) {
    totalFindings += prod.findingsCount;
    highCount += prod.highSeverityCount;
    mediumCount += prod.mediumSeverityCount;
    lowCount += prod.lowSeverityCount;
    for (const f of prod.findings) {
      codeCounts[f.code] = (codeCounts[f.code] || 0) + 1;
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    productsScanned: byProduct.length,
    summary: {
      totalFindings,
      highSeverity: highCount,
      mediumSeverity: mediumCount,
      lowSeverity: lowCount,
      byCode: codeCounts
    },
    byProduct
  };

  if (options.savePath) {
    safeWriteJsonAtomic(options.savePath, report);
  }
  return report;
}

module.exports = {
  normalizeLifecycleLabel,
  auditProductBlindspots,
  auditPortfolioBlindspots
};
