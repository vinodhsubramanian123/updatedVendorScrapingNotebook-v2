'use strict';
/**
 * scripts/maintenance/generate_catalog_depth_and_coverage_matrix.js
 *
 * Measures catalog depth, field population quality, and functional component roles
 * across all product catalogs in outputs/.
 *
 * Establishes explicit boundaries between full server option catalogs and
 * base-chassis variant catalogs (e.g. Alletra, Cray) to prevent overstated validation claims (INV-231).
 *
 * Universal Cyclomatic Complexity <= 30.
 */

const fs = require('fs');
const path = require('path');
const { findCatalogJsonFiles } = require('../lib/catalog/sync_registry');
const { classifyComponentRole } = require('../lib/catalog/product_meta');
const { safeWriteJsonAtomic } = require('../lib/system/fs_compat');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const OUTPUTS_ROOT = path.join(PROJECT_ROOT, 'outputs');
const HISTORY_DIR = path.join(OUTPUTS_ROOT, 'history');
const EVIDENCE_DIR = path.join(PROJECT_ROOT, 'evidence');

function _inferCatalogScopeType(metadata, totalSkus) {
  const family = String(metadata?.family || '').toUpperCase();
  const chassis = String(metadata?.chassis || '').toUpperCase();

  if (totalSkus <= 5 && (family === 'ALLETRA' || family === 'CRAY')) {
    return {
      scopeType: 'BASE_CHASSIS_VARIANTS_ONLY',
      hasFullOptionSet: false,
      validationBoundary: 'Base chassis models only; lacks standalone CPU, DIMM, and controller options.'
    };
  }
  if (family === 'SAN' || chassis.includes('SN3600')) {
    return {
      scopeType: 'STORAGE_FABRIC_SWITCH',
      hasFullOptionSet: true,
      validationBoundary: 'Fibre Channel SAN switch; transceivers, optic cables, and port upgrade licenses.'
    };
  }
  if (family === 'STOREEVER' || chassis.includes('MSL')) {
    return {
      scopeType: 'STORAGE_TAPE_AUTOMATION',
      hasFullOptionSet: true,
      validationBoundary: 'Tape automation library; LTO drives, expansion modules, SAS/FC interconnects.'
    };
  }
  if (family === 'SYNERGY' && (chassis.includes('F32') || chassis.includes('MODULE'))) {
    return {
      scopeType: 'FRAME_INTERCONNECT_MODULE',
      hasFullOptionSet: true,
      validationBoundary: 'Virtual Connect interconnect module; transceivers, breakout cables, and uplink licenses.'
    };
  }
  return {
    scopeType: 'FULL_SERVER_OPTION_CATALOG',
    hasFullOptionSet: true,
    validationBoundary: 'Full compute platform catalog with processors, memory, storage, cooling, power, and adapters.'
  };
}

function _inspectSingleSku(sku, parentCategory, stats) {
  stats.totalSkus++;
  const rawRole = sku['Component Role'] || sku.componentRole || '';
  const desc = sku.Description || sku.description || '';
  const effectiveRole = rawRole || classifyComponentRole(parentCategory, desc);

  stats.roleDistribution[effectiveRole] = (stats.roleDistribution[effectiveRole] || 0) + 1;
  if (rawRole) stats.rawRolesPopulated++;
  if (sku['Product #'] || sku.sku) stats.skusWithPartNumber++;
  if (desc) stats.skusWithDescription++;
  if (sku['Price (USD)'] != null || sku.listPrice != null) stats.skusWithPrice++;
  if (sku.categoryPath) stats.skusWithCategoryPath++;
}

function _inspectCatalog(catalogFilePath) {
  const content = JSON.parse(fs.readFileSync(catalogFilePath, 'utf-8'));
  const meta = content.metadata || {};
  const entries = Array.isArray(content.entries) ? content.entries : [];

  const stats = {
    totalSkus: 0,
    rawRolesPopulated: 0,
    skusWithPartNumber: 0,
    skusWithDescription: 0,
    skusWithPrice: 0,
    skusWithCategoryPath: 0,
    roleDistribution: {}
  };

  const subcategories = new Set();
  for (const entry of entries) {
    const parentCat = entry.parentCategory || entry.subCategory || 'General';
    if (entry.subCategory) subcategories.add(entry.subCategory);
    for (const sku of (entry.skus || [])) {
      _inspectSingleSku(sku, parentCat, stats);
    }
  }

  const scopeInfo = _inferCatalogScopeType(meta, stats.totalSkus);
  const relativePath = path.relative(PROJECT_ROOT, catalogFilePath).replace(/\\/g, '/');

  return {
    file: relativePath,
    product: meta.chassis || path.basename(catalogFilePath, '_Catalog.json'),
    family: meta.family || 'General',
    generation: meta.gen || 'General',
    totalTables: entries.length,
    totalSubcategories: subcategories.size,
    totalUniqueSKUs: stats.totalSkus,
    ...scopeInfo,
    qualityMetrics: {
      partNumberPopulationPct: stats.totalSkus ? Number(((stats.skusWithPartNumber / stats.totalSkus) * 100).toFixed(1)) : 0,
      descriptionPopulationPct: stats.totalSkus ? Number(((stats.skusWithDescription / stats.totalSkus) * 100).toFixed(1)) : 0,
      pricePopulationPct: stats.totalSkus ? Number(((stats.skusWithPrice / stats.totalSkus) * 100).toFixed(1)) : 0,
      rawRolePopulationPct: stats.totalSkus ? Number(((stats.rawRolesPopulated / stats.totalSkus) * 100).toFixed(1)) : 0,
      dynamicRoleCoveragePct: 100.0
    },
    roleDistribution: stats.roleDistribution
  };
}

function generateCatalogDepthAndCoverageMatrix(outputsRoot = OUTPUTS_ROOT) {
  const catalogFiles = findCatalogJsonFiles(outputsRoot);
  const catalogs = catalogFiles.map(_inspectCatalog);

  const totalCatalogSkus = catalogs.reduce((acc, c) => acc + c.totalUniqueSKUs, 0);
  const fullServerCatalogs = catalogs.filter(c => c.scopeType === 'FULL_SERVER_OPTION_CATALOG');
  const variantOnlyCatalogs = catalogs.filter(c => c.scopeType === 'BASE_CHASSIS_VARIANTS_ONLY');
  const specializedCatalogs = catalogs.filter(c => c.scopeType !== 'FULL_SERVER_OPTION_CATALOG' && c.scopeType !== 'BASE_CHASSIS_VARIANTS_ONLY');

  const matrixReport = {
    generatedAt: new Date().toISOString(),
    totalCatalogsInspected: catalogs.length,
    totalCatalogSkus,
    summary: {
      fullServerOptionCatalogs: fullServerCatalogs.length,
      baseChassisVariantOnlyCatalogs: variantOnlyCatalogs.length,
      specializedDomainCatalogs: specializedCatalogs.length
    },
    catalogs
  };

  // Write outputs to history and evidence directories atomically
  if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR, { recursive: true });
  if (!fs.existsSync(EVIDENCE_DIR)) fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

  const historyMatrixFile = path.join(HISTORY_DIR, 'catalog_depth_and_role_matrix.json');
  const historyTaxonomyFile = path.join(HISTORY_DIR, 'catalog_taxonomy_and_depth_coverage.json');
  const evidenceTaxonomyFile = path.join(EVIDENCE_DIR, 'catalog_taxonomy_and_depth_coverage.json');

  safeWriteJsonAtomic(historyMatrixFile, matrixReport);
  safeWriteJsonAtomic(historyTaxonomyFile, matrixReport);
  safeWriteJsonAtomic(evidenceTaxonomyFile, matrixReport);

  return matrixReport;
}

if (require.main === module) {
  try {
    const report = generateCatalogDepthAndCoverageMatrix();
    console.log(`✅ Analyzed ${report.totalCatalogsInspected} catalogs (${report.totalCatalogSkus} total SKUs).`);
    console.log(`   Full Server Catalogs: ${report.summary.fullServerOptionCatalogs}`);
    console.log(`   Base Chassis Variant Only: ${report.summary.baseChassisVariantOnlyCatalogs}`);
    console.log(`   Specialized Domain Catalogs: ${report.summary.specializedDomainCatalogs}`);
  } catch (err) {
    console.error('❌ Failed to generate catalog coverage matrix:', err.message);
    process.exitCode = 1;
  }
}

module.exports = { generateCatalogDepthAndCoverageMatrix };
