'use strict';
/**
 * scripts/lib/catalog/classification_diagnostics.js
 * 
 * Structured Catalog Ingestion & Classification Diagnostics Observability Engine.
 * Captures granular table-level decisions, taxonomy matching rationale, SKU extraction anomalies,
 * and rule provenance to provide immediate root-cause visibility during audits and test runs.
 */

const path = require('path');
const { safeWriteJsonAtomic } = require('../system/fs_compat.js');

class ClassificationDiagnostics {
  /**
   * @param {string} chassisName 
   * @param {string} targetDir 
   */
  constructor(chassisName, targetDir) {
    this.chassisName = chassisName;
    this.targetDir = targetDir;
    this.startTime = Date.now();
    this.trace = {
      version: '1.0.0',
      chassis: chassisName,
      generatedAt: new Date().toISOString(),
      executionDurationMs: 0,
      summary: {
        totalRawTables: 0,
        validProductTables: 0,
        skippedTablesCount: 0,
        totalExtractedSKUs: 0,
        totalUniqueSKUs: 0,
        totalRulesExtracted: 0,
        chassisVariantsCount: 0,
      },
      skippedTables: [],
      tableDecisions: [],
      categoryDistribution: {},
      chassisVariantsMatrix: {},
      dataAnomalies: {
        priceInconsistencies: [],
        unparseablePrices: [],
        filteredPhantomSKUs: [],
        duplicateSKUs: []
      }
    };
  }

  setRawTableCount(count) {
    this.trace.summary.totalRawTables = count;
  }

  recordSkippedTable(tableIndex, reason, sampleRow = null) {
    this.trace.skippedTables.push({
      tableIndex,
      reason,
      sampleSnippet: sampleRow ? String(sampleRow).substring(0, 100) : null
    });
    this.trace.summary.skippedTablesCount++;
  }

  recordTableDecision(decision) {
    this.trace.tableDecisions.push({
      tableIndex: decision.tableIndex,
      subCategory: decision.subCategory,
      parentCategory: decision.parentCategory,
      matchedVia: decision.matchedVia || 'taxonomy_keyword',
      detectedRole: decision.detectedRole || 'Unknown',
      constraint: decision.constraint || 'N/A',
      minQty: decision.minQty || 0,
      maxQty: decision.maxQty !== undefined ? decision.maxQty : -1,
      skuCount: decision.skuCount || 0,
      rulesCount: (decision.rules || []).length
    });
  }

  recordAnomaly(type, detail) {
    if (this.trace.dataAnomalies[type]) {
      this.trace.dataAnomalies[type].push(detail);
    }
  }

  finalize(finalCatalog, rulesObj) {
    this.trace.executionDurationMs = Date.now() - this.startTime;
    this.trace.summary.validProductTables = this.trace.tableDecisions.length;
    this.trace.summary.totalUniqueSKUs = finalCatalog.metadata?.totalUniqueSKUs || 0;
    this.trace.summary.totalExtractedSKUs = (finalCatalog.entries || []).reduce((acc, e) => acc + (e.skuCount || (e.skus || []).length), 0);
    this.trace.summary.totalRulesExtracted = (rulesObj.rules || []).length;
    this.trace.summary.chassisVariantsCount = (rulesObj.chassisVariants || []).length;

    // Calculate category distribution and attribute fidelity
    const dist = {};
    const clicDist = {};
    const lifeDist = {};
    let skusWithLeadTime = 0;
    let skusWithCost = 0;
    let skusWithPriceDelta = 0;
    let skusWithPricePerGb = 0;

    (finalCatalog.entries || []).forEach(e => {
      dist[e.parentCategory] = (dist[e.parentCategory] || 0) + (e.skuCount || (e.skus || []).length);
      (e.skus || []).forEach(s => {
        const cs = s['CLIC Status'] || 'Unpublished';
        const ls = s['Lifecycle Status'] || 'Active';
        clicDist[cs] = (clicDist[cs] || 0) + 1;
        lifeDist[ls] = (lifeDist[ls] || 0) + 1;
        if (s['Lead Time'] && s['Lead Time'] !== 'Unpublished') skusWithLeadTime++;
        if (s['Cost (USD)'] && s['Cost (USD)'] !== '') skusWithCost++;
        if (s['Price Delta (USD)'] && s['Price Delta (USD)'] !== '') skusWithPriceDelta++;
        if (s['Price per GB (USD)'] && s['Price per GB (USD)'] !== '') skusWithPricePerGb++;
      });
    });
    this.trace.categoryDistribution = dist;
    this.trace.attributeFidelity = {
      skusWithLeadTime,
      skusWithCost,
      skusWithPriceDelta,
      skusWithPricePerGb,
      clicStatusDistribution: clicDist,
      lifecycleStatusDistribution: lifeDist
    };

    // Record variants matrix summary
    this.trace.chassisVariantsMatrix = Object.keys(rulesObj.chassisVariantMatrix || {}).reduce((acc, sku) => {
      const v = rulesObj.chassisVariantMatrix[sku];
      acc[sku] = {
        description: v.description,
        formFactor: v.formFactor,
        listPrice: v.listPrice,
        diffStatus: v.diffStatus || 'BASELINE'
      };
      return acc;
    }, {});

    const historyDir = path.join(this.targetDir, 'history');
    const diagPath = path.join(historyDir, 'classification_diagnostics.json');
    safeWriteJsonAtomic(diagPath, this.trace, { validateSchema: false });
    return diagPath;
  }
}

module.exports = {
  ClassificationDiagnostics
};
