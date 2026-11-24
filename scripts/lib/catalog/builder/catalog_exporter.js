'use strict';
/**
 * scripts/lib/catalog/builder/catalog_exporter.js — Diff Reconciliation, Rules Dedupe & Atomic Artifact Export
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { processCatalogDiff } = require('../diff_catalog.js');
const { safeWriteJsonAtomic } = require('../../system/fs_compat.js');
const { computeIncrementalDifferential, assertDiffAnomalyBounds } = require('../checksum_diff.js');
const { recordVersionSnapshot } = require('../sku_versioning.js');
const { cleanBaseSKU } = require('../sku.js');
const { generateMainSheet, generateRulesSheet, generateSummarySheet } = require('../catalog_formatter.js');
const { validateCatalogData } = require('../../system/data_validator.js');
const PipelineLogger = require('../../system/pipeline_logger.js');
const { parseProductMeta } = require('../product_meta.js');
const { reconcileRebuiltCaptureReceipt } = require('../catalog_capture_receipt.js');
const { getUniqueSkuCount } = require('./taxonomy_and_intake.js');
const {
  injectChassisVariantsFromHistory,
  buildCatalogObject,
  buildChassisVariantMatrix
} = require('./variant_reconciler.js');

async function reconcilePriceAndLifecycleHistory(hardwareEntries, cleanServicesEntries, subcatList, targetDir, filePrefix, meta, chassisLabel, pipelineLogger, baseSKU = '', tables = [], chassisDiscovery = null) {
  console.log('\n--- Step 5: Catalog Diff Engine & Historical Price Tracking ---');

  await injectChassisVariantsFromHistory(hardwareEntries, targetDir, chassisLabel, baseSKU, tables, chassisDiscovery, meta);

  const catalogObj = buildCatalogObject(hardwareEntries, filePrefix, meta, chassisLabel, subcatList);
  const servicesCatalogObj = buildCatalogObject(cleanServicesEntries, filePrefix, meta, chassisLabel, subcatList);

  const historyDir = path.join(targetDir, 'history');
  const targetProduct = parseProductMeta(chassisLabel).cleanName;
  const previousSkuFilter = ({ entry, sku }) => {
    const isChassis = String(entry.parentCategory || '').toLowerCase() === 'chassis' ||
      String(entry.subCategory || '').toLowerCase() === 'variants';
    if (!isChassis) return true;
    const description = sku.Description || sku.description || '';
    return parseProductMeta(description).cleanName === targetProduct;
  };
  const { enrichedCatalog } = processCatalogDiff(
    catalogObj,
    historyDir,
    'catalog',
    { previousSkuFilter, companionCatalog: servicesCatalogObj }
  );

  const servicesHistoryDir = path.join(targetDir, 'services_history');
  const { enrichedCatalog: enrichedServicesCatalog } = processCatalogDiff(
    servicesCatalogObj,
    servicesHistoryDir,
    'services',
    { companionCatalog: catalogObj }
  );

  if (enrichedCatalog?.metadata) {
    enrichedCatalog.metadata.totalUniqueSKUs = getUniqueSkuCount(enrichedCatalog.entries);
    enrichedCatalog.metadata.totalSubcategories = new Set(enrichedCatalog.entries.map(e => e.subCategory)).size;
  }
  if (enrichedServicesCatalog?.metadata) {
    enrichedServicesCatalog.metadata.totalUniqueSKUs = getUniqueSkuCount(enrichedServicesCatalog.entries);
    enrichedServicesCatalog.metadata.totalSubcategories = new Set(enrichedServicesCatalog.entries.map(e => e.subCategory)).size;
  }

  let existingCatalogForDiff = null;
  const currentCatalogJsonFile = path.join(targetDir, `${filePrefix}_Catalog.json`);
  if (fs.existsSync(currentCatalogJsonFile)) {
    try { existingCatalogForDiff = JSON.parse(fs.readFileSync(currentCatalogJsonFile, 'utf-8')); } catch (err) {
      PipelineLogger.warn('BUILD_CATALOG', `Failed reading existing catalog for diff at ${currentCatalogJsonFile}: ${err.message}`);
    }
  }
  const incrementalDiff = computeIncrementalDifferential(catalogObj.entries, existingCatalogForDiff);
  if (incrementalDiff.isIncremental) {
    console.log(`  ⚡ [INCREMENTAL_DIFF] Checksum Analysis: ${incrementalDiff.stats.unchangedSkusCount} Unchanged, ${incrementalDiff.stats.modifiedSkusCount} Modified, ${incrementalDiff.stats.addedSkusCount} Added, ${incrementalDiff.stats.removedSkusCount} Removed.`);
    console.log(`  [INCREMENTAL_DIFF] ${incrementalDiff.stats.unchangedSkusCount} unchanged SKUs; classification already ran locally. No measured API-token savings claimed.`);
    enrichedCatalog.metadata.incrementalStats = incrementalDiff.stats;

    const anomalyCheck = assertDiffAnomalyBounds(incrementalDiff, existingCatalogForDiff, {
      allowLargeDiff: process.argv.includes('--force-large-diff') || process.env.FORCE_LARGE_CATALOG_DIFF === '1'
    });
    if (!anomalyCheck.isSafe) {
      pipelineLogger.logError(anomalyCheck.message);
      console.error(`\n❌ [ANOMALY_GUARD] ${anomalyCheck.message}`);
      throw new Error(anomalyCheck.message);
    }
    console.log(`  🛡️ [ANOMALY_GUARD] Diff Anomaly Check: ${anomalyCheck.status} (${anomalyCheck.message})`);
  }

  recordVersionSnapshot(enrichedCatalog, historyDir);

  pipelineLogger.logStep('Step 5: Catalog Diff Engine', 'SUCCESS', {
    totalSubcategories: enrichedCatalog.metadata?.totalSubcategories,
    totalUniqueSKUs: enrichedCatalog.metadata?.totalUniqueSKUs,
    incrementalStats: incrementalDiff.stats
  });

  enrichedCatalog.entries?.forEach(e => {
    e.skus?.forEach(s => {
      const rawPn = s.sku || s['Product #'] || s['SKU'] || '';
      pipelineLogger.logSKUClassification(cleanBaseSKU(rawPn), e.parentCategory, e.subCategory, 'CLASSIFIED', {
        description: s.description || s['Description'] || '',
        optionType: s.optionType || s['Option Type'] || ''
      });
    });
  });

  console.log('\n--- Step 6: Pre-Commit Validation & Atomic File Commit ---');
  const validationResult = validateCatalogData(enrichedCatalog);
  if (validationResult.warnings.length > 0) {
    validationResult.warnings.forEach(w => pipelineLogger.logWarning(w));
  }
  if (validationResult.errors.length > 0) {
    validationResult.errors.forEach(e => pipelineLogger.logError(e));
  }

  pipelineLogger.logStep('Pre-Commit Data Integrity Validation', validationResult.isValid ? 'SUCCESS' : 'FAILED', {
    isValid: validationResult.isValid,
    errorCount: validationResult.errors.length,
    warningCount: validationResult.warnings.length,
    stats: validationResult.stats
  });

  return { enrichedCatalog, enrichedServicesCatalog, validationResult, incrementalDiff };
}

function loadExistingLearnedRules(rulesJsonPath) {
  if (!fs.existsSync(rulesJsonPath)) return [];
  try {
    const existingRulesObj = JSON.parse(fs.readFileSync(rulesJsonPath, 'utf-8'));
    if (Array.isArray(existingRulesObj.rules)) {
      return existingRulesObj.rules.filter(r => {
        const pc = (r.parentCategory || '').toLowerCase();
        return pc.includes('feedback') || pc.includes('learned');
      });
    }
  } catch (err) {
    PipelineLogger.warn('BUILD_CATALOG', `Failed reading existing learned rules from ${rulesJsonPath}: ${err.message}`);
  }
  return [];
}

function writeCatalogTsvIntermediates(scrapsDir, filePrefix, mainTSV, rulesTSV, summaryTSV, servicesTSV, unavailableRules) {
  fs.mkdirSync(scrapsDir, { recursive: true });
  fs.writeFileSync(path.join(scrapsDir, `${filePrefix}_Catalog_SKUs.tsv`),    mainTSV);
  fs.writeFileSync(path.join(scrapsDir, `${filePrefix}_Catalog_Rules.tsv`),   rulesTSV);
  fs.writeFileSync(path.join(scrapsDir, `${filePrefix}_Catalog_Summary.tsv`), summaryTSV);
  if (unavailableRules && unavailableRules.length > 0) {
    const unavailHeaders = ['Rule ID', 'Rule Type', 'Section', 'Constraint / Reason', 'Affected SKU Count', 'Affected SKUs'];
    const unavailRows = [unavailHeaders.join('\t')];
    unavailableRules.forEach((r, idx) => {
      const id = r.ruleId || `RULE_${idx + 1}`;
      const skus = (r.affectedSkus || []).join(', ');
      unavailRows.push([id, r.ruleType || 'MUTUAL_EXCLUSION', r.parentCategory || 'General', r.ineligibilityReason || r.rule || '', (r.affectedSkus || []).length, skus].join('\t'));
    });
    fs.writeFileSync(path.join(scrapsDir, `${filePrefix}_Unavailable_Rules.tsv`), unavailRows.join('\n'));
  }
  if (servicesTSV && servicesTSV.trim()) {
    fs.writeFileSync(path.join(scrapsDir, `${filePrefix}_Services_SKUs.tsv`), servicesTSV);
  }
}

function deduplicateCatalogRules(ctx, allCombinedEntries, existingLearnedRules) {
  const combinedRules = allCombinedEntries.flatMap(e => (e.rules || []).map(r => ({
    parentCategory: e.parentCategory,
    subCategory: e.subCategory,
    constraint: e.constraint || '',
    maxQty: e.maxQty || '',
    rule: r
  })));

  const dedupeMap = new Map();
  [...(ctx.networkRules || []), ...(ctx.conditionalRules || []), ...(ctx.unavailableRules || []), ...combinedRules, ...existingLearnedRules].forEach(r => {
    const ruleText = r.rule || r.description || '';
    if (!ruleText || ruleText.length < 5) return;
    const key = `${r.parentCategory}|${r.subCategory}|${ruleText.trim()}`;
    if (!dedupeMap.has(key)) {
      dedupeMap.set(key, {
        ...r,
        parentCategory: r.parentCategory,
        subCategory: r.subCategory,
        constraint: r.constraint || '',
        maxQty: r.maxQty || '',
        rule: ruleText.trim()
      });
    }
  });
  return Array.from(dedupeMap.values());
}

async function exportCatalogArtifacts(ctx) {
  const {
    enrichedCatalog, enrichedServicesCatalog, validationResult,
    subcatList, fullText, targetDir, scrapsDir, filePrefix, chassisRoot,
    profile, jsonOutputPath, diagnostics, pipelineLogger,
    JSON_MODE, chassisLabel, catalogBaseName
  } = ctx;

  const rulesJsonPath = path.join(targetDir, `${filePrefix}_Catalog_Rules.json`);
  const existingLearnedRules = loadExistingLearnedRules(rulesJsonPath);

  const allCombinedEntries = [...(enrichedCatalog.entries || []), ...(enrichedServicesCatalog.entries || [])];
  const mainTSV    = generateMainSheet(enrichedCatalog.entries, chassisRoot, profile);
  const rulesTSV   = generateRulesSheet(allCombinedEntries, subcatList, fullText, [...existingLearnedRules, ...(ctx.unavailableRules || [])]);
  const summaryTSV = generateSummarySheet(allCombinedEntries, subcatList);
  const servicesTSV = generateMainSheet(enrichedServicesCatalog.entries, chassisRoot, profile);

  writeCatalogTsvIntermediates(scrapsDir, filePrefix, mainTSV, rulesTSV, summaryTSV, servicesTSV, ctx.unavailableRules);

  const chassisVariantMatrix = await buildChassisVariantMatrix(scrapsDir, filePrefix, targetDir, enrichedCatalog);
  const deduplicatedRules = deduplicateCatalogRules(ctx, allCombinedEntries, existingLearnedRules);
  if (diagnostics?.trace?.rejectedRows?.length > 0) {
    safeWriteJsonAtomic(path.join(targetDir, 'raw_data', 'rejected_rows.json'), {
      schemaVersion: '1.0.0',
      product: filePrefix,
      generatedAt: new Date().toISOString(),
      rejectedCount: diagnostics.trace.summary.rejectedRowsCount || diagnostics.trace.rejectedRows.length,
      rows: diagnostics.trace.rejectedRows
    }, { validateSchema: false });
  }

  if (ctx.smartChassisCombinations && ctx.smartChassisCombinations.length > 0) {
    enrichedCatalog.smartChassisCombinations = ctx.smartChassisCombinations;
  }
  if (ctx.solutionManifest) {
    enrichedCatalog.solutionManifest = ctx.solutionManifest;
  }

  const snapshotFingerprint = crypto.createHash('sha256')
    .update(JSON.stringify(enrichedCatalog.entries || []))
    .digest('hex');
  enrichedCatalog.metadata.snapshotFingerprint = snapshotFingerprint;

  const rulesJsonData = {
    metadata: {
      ...enrichedCatalog.metadata,
      snapshotFingerprint,
      chassisVariantCount: Object.keys(chassisVariantMatrix).length,
      rulesGeneratedAt: new Date().toISOString()
    },
    chassisVariants: Object.values(chassisVariantMatrix),
    chassisVariantMatrix,
    smartChassisCombinations: ctx.smartChassisCombinations || [],
    solutionManifest: ctx.solutionManifest || null,
    subcategories: enrichedCatalog.subcategories,
    rules: deduplicatedRules
  };

  safeWriteJsonAtomic(jsonOutputPath, enrichedCatalog, { validateSchema: true, rejectInvalid: true });
  safeWriteJsonAtomic(rulesJsonPath, rulesJsonData);

  const servicesJsonOutputPath = jsonOutputPath.replace('_Catalog.json', '_Services.json');
  safeWriteJsonAtomic(servicesJsonOutputPath, enrichedServicesCatalog, { validateSchema: false, rejectInvalid: false });
  console.log(`  📄 ${filePrefix}_Services.json  (${enrichedServicesCatalog.metadata.totalUniqueSKUs} observed service/software SKUs)`);

  try {
    reconcileRebuiltCaptureReceipt(targetDir, filePrefix);
  } catch { /* ignore if receipt not present */ }

  pipelineLogger.logStep('Step 6: Atomic Save Output JSON', 'SUCCESS', { path: jsonOutputPath });
  pipelineLogger.finalizeRun(validationResult.isValid ? 'COMPLETED' : 'PARTIAL_SUCCESS', {
    totalUniqueSKUs: enrichedCatalog.metadata?.totalUniqueSKUs,
    validationStats: validationResult.stats
  });

  const catCounts = {};
  for (const e of enrichedCatalog.entries) {
    catCounts[e.parentCategory] = (catCounts[e.parentCategory] || 0) + e.skuCount;
  }

  if (JSON_MODE) {
    const jsonResult = {
      status: 'SUCCESS',
      data: {
        jsonOutputPath,
        chassisLabel,
        metadata: enrichedCatalog.metadata,
        totalEntries: enrichedCatalog.entries.length,
        totalUniqueSKUs: enrichedCatalog.metadata.totalUniqueSKUs,
        rulesCount: rulesJsonData.rules.length,
        categoryBreakdown: catCounts,
        validation: validationResult
      }
    };
    process.stdout.write(JSON.stringify(jsonResult));
  } else {
    console.log('=== FILES SAVED ATOMICALLY ===');
    console.log(`  📄 ${filePrefix}_Catalog_SKUs.tsv    (${mainTSV.split('\n').length} rows)`);
    console.log(`  📄 ${filePrefix}_Catalog_Rules.tsv   (${rulesTSV.split('\n').length} rows)`);
    console.log(`  📄 ${filePrefix}_Catalog_Summary.tsv (${summaryTSV.split('\n').length} rows)`);
    console.log(`  📄 ${filePrefix}_Catalog_Rules.json  (${rulesJsonData.rules.length} rules, dual safety net)`);
    console.log(`  📄 ${catalogBaseName}.json        (structured companion JSON, verified atomic)`);

    diagnostics.finalize(enrichedCatalog, rulesJsonData);

    console.log('\n=== CATEGORY BREAKDOWN ===');
    Object.entries(catCounts).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
      console.log(`  • ${cat.padEnd(35)}: ${count} SKUs`);
    });
    console.log(`  📄 classification_diagnostics.json (observability trace logged)`);
    console.log('\n✅ CLASSIFICATION COMPLETE.');
  }
}

function resolveConditionalRawData(rawData, rawInputPath) {
  const obs = [...(rawData?.conditionalSkus || [])];
  const seen = new Set(obs.map(s => `${cleanBaseSKU(s.sku || '')}|${s.conditionType || ''}|${s.selectorTriggerSku || ''}|${s.ruleContext || ''}`));
  if (rawInputPath) {
    try {
      const condPath = path.join(path.dirname(rawInputPath), 'conditional_skus.json');
      if (fs.existsSync(condPath)) {
        const parsed = JSON.parse(fs.readFileSync(condPath, 'utf8'));
        const extra = Array.isArray(parsed) ? parsed : (parsed.skus || parsed.conditionalSkus || []);
        for (const item of extra) {
          const key = `${cleanBaseSKU(item?.sku || '')}|${item?.conditionType || ''}|${item?.selectorTriggerSku || ''}|${item?.ruleContext || ''}`;
          if (item && !seen.has(key)) {
            seen.add(key);
            obs.push(item);
          }
        }
      }
    } catch (err) {
      PipelineLogger.warn('BUILD_CATALOG', `Failed reading conditional_skus.json from ${rawInputPath}: ${err.message}`);
    }
  }
  return obs;
}

function resolveUnavailableRawData(rawData, rawInputPath) {
  const rules = [...(rawData?.unavailableRules || [])];
  const skus = [...(rawData?.unavailableSkus || [])];
  if (rules.length === 0 && rawInputPath) {
    try {
      const rawDir = path.dirname(rawInputPath);
      const unavailPath = path.join(rawDir, 'unavailable_rules.json');
      if (fs.existsSync(unavailPath)) {
        const parsed = JSON.parse(fs.readFileSync(unavailPath, 'utf8'));
        rules.push(...(parsed.rules || []));
        skus.push(...(parsed.skus || []));
      }
    } catch (err) {
      PipelineLogger.warn('BUILD_CATALOG', `Failed reading unavailable_rules.json from ${rawInputPath}: ${err.message}`);
    }
  }
  return { rules, skus };
}

function resolveNetworkSniffedRawData(rawData, rawInputPath) {
  const rules = [...(rawData?.networkSniffedRules || [])];
  if (rules.length === 0 && rawInputPath) {
    try {
      const rawDir = path.dirname(rawInputPath);
      const sniffedPath = path.join(rawDir, 'network_sniffed_rules.json');
      if (fs.existsSync(sniffedPath)) {
        const parsed = JSON.parse(fs.readFileSync(sniffedPath, 'utf8'));
        const loaded = Array.isArray(parsed) ? parsed : (parsed.rules || parsed.capturedRules || []);
        rules.push(...loaded);
      }
    } catch (err) {
      PipelineLogger.warn('BUILD_CATALOG', `Failed reading network_sniffed_rules.json from ${rawInputPath}: ${err.message}`);
    }
  }
  return rules;
}

function _formatNetworkSniffedRules(rawData, rawInputPath = null) {
  const rules = resolveNetworkSniffedRawData(rawData, rawInputPath);
  return rules
    .filter(r => ['REQUIRED_DEPENDENCY', 'MUTUAL_EXCLUSION', 'CAPACITY_CONSTRAINT', 'THERMAL_CONSTRAINT', 'DYNAMIC_RULE'].includes(r.ruleType))
    .map(r => ({
      parentCategory: r.parentCategory || 'System Options',
      subCategory: r.subCategory || 'Configuration Rules',
      constraint: r.constraint || r.rule,
      maxQty: r.maxQty || '',
      rule: r.rule,
      ruleType: r.ruleType || 'DYNAMIC_RULE',
      affectedSkus: r.affectedSkus || [],
      source: 'BACKEND_NETWORK_SNIFFER'
    }));
}

module.exports = {
  reconcilePriceAndLifecycleHistory,
  exportCatalogArtifacts,
  resolveConditionalRawData,
  resolveUnavailableRawData,
  _formatNetworkSniffedRules
};
