'use strict';
/**
 * build_catalog.js — Classification Engine for HPE OCA Catalog Scrapes
 * Usage: node scripts/catalogs/build_catalog.js <raw_input.json> <catalog_output.json> [--verbose]
 *
 * Thin modular orchestrator delegating intake, table/SKU classification,
 * chassis variant reconciliation, and atomic artifact export to
 * scripts/lib/catalog/builder/*.
 */

const {
  lookupChassisMapBaseSku,
  detectChassisFormFactor,
  createCatalogMetadata,
  partitionCatalogEntries,
  initCatalogBuild,
  parseConstraintMinMax,
  extractSubcategoriesAndParents
} = require('../lib/catalog/builder/taxonomy_and_intake.js');
const {
  expandTableSections,
  parseSingleTableRow,
  matchSubcategoryForTable,
  resolveTableTaxonomyAndRole,
  synthesizeCatalogEntries,
  extractSolutionManifest,
  classifySampleCellHeader,
  synthesizeHeaderFromSampleRow,
  _isInvalidHeaderCandidateRow,
  _isStructuralWrapperTable
} = require('../lib/catalog/builder/table_sku_parser.js');
const {
  extractBaseChassisEvidence,
  isCanonicalCtoChassisCandidate,
  extractDiscoveredChassisVariants,
  injectChassisVariantsFromHistory,
  buildCatalogObject,
  buildChassisVariantMatrix,
  _reconcileVariantMatrixFromCatalog
} = require('../lib/catalog/builder/variant_reconciler.js');
const {
  reconcilePriceAndLifecycleHistory,
  exportCatalogArtifacts,
  resolveConditionalRawData,
  resolveUnavailableRawData,
  _formatNetworkSniffedRules
} = require('../lib/catalog/builder/catalog_exporter.js');
const { applyConditionalDiscovery, applyUnavailableDomRulesAndSkus } = require('../lib/catalog/conditional_discovery.js');

function _applySynergyFrameOptionNormalization(ctx, hardwareEntries) {
  if (ctx.meta.cleanName !== 'Synergy_12000_Frame') return;
  for (const entry of hardwareEntries) {
    if (entry.parentCategory === 'Chassis') entry.parentCategory = 'Frame Options';
    if (entry.subCategory === 'Variants') entry.subCategory = 'Frame Options';
  }
}

async function main(rawInputPath = process.argv[2], jsonOutputPath = process.argv[3]) {
  const ctx = await initCatalogBuild(rawInputPath, jsonOutputPath, process.argv);

  const { subcatList } = extractSubcategoriesAndParents(ctx.fullText, ctx.rawData, ctx.IS_VERBOSE);
  ctx.subcatList = subcatList;

  const { hardwareEntries, cleanServicesEntries, smartChassisCombinations } = synthesizeCatalogEntries(
    ctx.tables, ctx.fullText, subcatList, ctx.historyPriceMap, ctx.diagnostics, ctx.profile, ctx.IS_VERBOSE
  );
  ctx.smartChassisCombinations = smartChassisCombinations || [];
  ctx.solutionManifest = extractSolutionManifest(ctx.rawData?.tables || ctx.tables || []);

  const conditionalObs = resolveConditionalRawData(ctx.rawData, rawInputPath);
  ctx.conditionalRules = applyConditionalDiscovery(
    [...hardwareEntries, ...cleanServicesEntries], conditionalObs, hardwareEntries
  );
  const unavail = resolveUnavailableRawData(ctx.rawData, rawInputPath);
  ctx.unavailableRules = applyUnavailableDomRulesAndSkus(
    hardwareEntries, cleanServicesEntries, unavail.rules, unavail.skus
  );
  _applySynergyFrameOptionNormalization(ctx, hardwareEntries);
  ctx.networkRules = _formatNetworkSniffedRules(ctx.rawData, rawInputPath);

  const { enrichedCatalog, enrichedServicesCatalog, validationResult } = await reconcilePriceAndLifecycleHistory(
    hardwareEntries, cleanServicesEntries, subcatList, ctx.targetDir, ctx.filePrefix, ctx.meta, ctx.chassisLabel, ctx.pipelineLogger, ctx.baseSKU, ctx.tables, ctx.chassisDiscovery
  );

  await exportCatalogArtifacts({
    ...ctx,
    enrichedCatalog,
    enrichedServicesCatalog,
    validationResult
  });
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error during classification:', err);
    process.exit(1);
  });
}

module.exports = {
  main,
  lookupChassisMapBaseSku,
  createCatalogMetadata,
  initCatalogBuild,
  extractSubcategoriesAndParents,
  expandTableSections,
  parseSingleTableRow,
  matchSubcategoryForTable,
  resolveTableTaxonomyAndRole,
  synthesizeCatalogEntries,
  partitionCatalogEntries,
  injectChassisVariantsFromHistory,
  extractBaseChassisEvidence,
  isCanonicalCtoChassisCandidate,
  extractDiscoveredChassisVariants,
  buildCatalogObject,
  reconcilePriceAndLifecycleHistory,
  buildChassisVariantMatrix,
  detectChassisFormFactor,
  exportCatalogArtifacts,
  parseConstraintMinMax,
  classifySampleCellHeader,
  synthesizeHeaderFromSampleRow,
  _isInvalidHeaderCandidateRow,
  _isStructuralWrapperTable,
  _reconcileVariantMatrixFromCatalog
};
