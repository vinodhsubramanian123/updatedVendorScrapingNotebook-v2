'use strict';
/**
 * scripts/lib/vendor_bom_verifier.js
 *
 * Post-Build Vendor Partner Portal BOM Re-Ingestion & Bi-Directional Cross-Verification Engine:
 * 1. Parses official Vendor Partner Portal BOM (Excel/CSV/JSON/CLIC export).
 * 2. Cross-verifies Vendor BOM against proposed Rank solution (Rank 1 to 5).
 * 3. Identifies deltas:
 *    - ADDED_BY_VENDOR (New SKUs auto-inserted by HPE portal)
 *    - REMOVED_BY_VENDOR (SKUs dropped by HPE portal)
 *    - PRICE_DELTA (List price variance)
 *    - UNCATALOGED_SKU (SKUs not present in local scraped catalog JSON)
 * 4. Triggers closed-loop delta learning & flags fresh CDP scraping when uncataloged SKUs are found.
 */

const fs = require('fs');
const path = require('path');
const { parseAndConsolidateBOQ } = require('./boq_evaluator.js');
const { processPortalFeedback } = require('../feedback/feedback_loop.js');
const { isValidHpeSKU, cleanBaseSKU } = require('../catalog/sku.js');

function loadCatalogSkusAndPrices(chassisDir) {
  const chassisPrefix = path.basename(chassisDir || '');
  const catalogPath = path.join(chassisDir || '', `${chassisPrefix}_Catalog.json`);
  const catalogSkus = new Set();
  const catalogPriceMap = new Map();

  if (fs.existsSync(catalogPath)) {
    try {
      const cat = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
      if (cat.entries) {
        cat.entries.forEach(entry => {
          (entry.skus || []).forEach(s => {
            const sku = s['Product #'] || s.sku;
            if (sku) {
              const clean = cleanBaseSKU(sku);
              catalogSkus.add(sku);
              if (clean) catalogSkus.add(clean);
              const price = parseFloat(String(s['Unit Price (USD)'] || s['Price (USD)'] || '0').replace(/[^0-9.]/g, '')) || 0;
              catalogPriceMap.set(sku, price);
              if (clean) catalogPriceMap.set(clean, price);
            }
          });
        });
      }
    } catch (_) {
      const _logger = require('../system/pipeline_logger.js');
      _logger.warn('ERROR', 'vendor_bom_verifier.js', _);
    }
  }

  return { catalogSkus, catalogPriceMap };
}

function aggregateItemQuantities(items) {
  const map = new Map();
  for (const it of items) {
    const rawSku = String(it.sku || it['Product #'] || '').trim();
    const clean = cleanBaseSKU(rawSku);
    if (!clean) continue;
    const qty = Number(it.quantity ?? it.qty ?? 1);
    const unitPrice = parseFloat(String(it.unitPriceUsd || it.price || it['Unit Price (USD)'] || 0)) || 0;
    const existing = map.get(clean);
    if (existing) {
      existing.quantity += qty;
      existing.rawRows.push(it);
      if (!existing.description && it.description) existing.description = it.description;
      if (existing.unitPriceUsd === 0 && unitPrice > 0) existing.unitPriceUsd = unitPrice;
    } else {
      map.set(clean, {
        sku: clean,
        rawSku,
        quantity: qty,
        description: it.description || '',
        unitPriceUsd: unitPrice,
        rawRows: [it]
      });
    }
  }
  return map;
}

/**
 * Audit a single vendor quote file or item list against local scraped catalog JSON.
 * Truthful single-file audit that does NOT invent comparison discrepancies (addedByVendor/removedByVendor)
 * and does NOT send items to feedback quarantine.
 *
 * @param {string|Array<object>} vendorBomInput File path or raw array of vendor items
 * @param {string} chassisDir Target chassis catalog directory
 * @param {object} [options]
 * @returns {object} Audit report with catalog membership, valid format, and uncataloged analysis
 */
function auditSingleVendorBOM(vendorBomInput, chassisDir, options = {}) {
  let vendorItems = [];
  if (typeof vendorBomInput === 'string' && fs.existsSync(vendorBomInput)) {
    const rawContent = fs.readFileSync(vendorBomInput, 'utf-8');
    vendorItems = parseAndConsolidateBOQ(rawContent, vendorBomInput);
  } else if (Array.isArray(vendorBomInput)) {
    vendorItems = vendorBomInput;
  } else {
    throw new Error('Invalid Vendor BOM input. Must be a valid file path or item array.');
  }

  if (vendorItems.length === 0) {
    throw new Error('Vendor BOM input contains zero items.');
  }

  const chassisPrefix = path.basename(chassisDir || '');
  const { catalogSkus, catalogPriceMap } = loadCatalogSkusAndPrices(chassisDir);

  const uncatalogedSkus = [];
  const catalogMatchedSkus = [];
  const invalidFormatSkus = [];
  const vendorSkuSet = new Set();

  vendorItems.forEach(vItem => {
    const rawSku = String(vItem.sku || vItem['Product #'] || '').trim();
    const clean = cleanBaseSKU(rawSku);
    if (!clean) return;
    vendorSkuSet.add(clean);

    const inCatalog = catalogSkus.size > 0 && (catalogSkus.has(rawSku) || catalogSkus.has(clean));
    const validFormat = isValidHpeSKU(rawSku) || isValidHpeSKU(clean);

    if (!validFormat) {
      invalidFormatSkus.push({
        sku: rawSku,
        quantity: Number(vItem.quantity ?? vItem.qty ?? 1),
        description: vItem.description || '',
        reason: 'Unrecognized SKU format; potential typo or non-HPE part number.'
      });
    }

    if (!inCatalog) {
      uncatalogedSkus.push({
        sku: rawSku,
        cleanSku: clean,
        quantity: Number(vItem.quantity ?? vItem.qty ?? 1),
        description: vItem.description || '',
        reason: catalogSkus.size === 0
          ? 'Catalog data missing or empty; SKU cannot be certified.'
          : 'SKU present in Vendor quote but missing from local scraped catalog.'
      });
    } else {
      const catalogPrice = catalogPriceMap.get(clean) || catalogPriceMap.get(rawSku) || 0;
      catalogMatchedSkus.push({
        sku: rawSku,
        cleanSku: clean,
        quantity: Number(vItem.quantity ?? vItem.qty ?? 1),
        description: vItem.description || '',
        catalogPriceUsd: catalogPrice
      });
    }
  });

  const requiresFreshScrape = catalogSkus.size === 0 || uncatalogedSkus.length > 0;

  return {
    chassisModel: chassisPrefix || 'Unknown_Chassis',
    isSingleFileAudit: true,
    isTwoBaselineComparison: false,
    totalVendorSkus: vendorItems.length,
    totalUniqueSkus: vendorSkuSet.size,
    catalogSkuCount: catalogSkus.size,
    catalogMissing: catalogSkus.size === 0,
    isCatalogClean: catalogSkus.size > 0 && uncatalogedSkus.length === 0,
    requiresFreshScrape,
    is100PercentMatch: false,
    hasDiscrepancies: false,
    quarantinedObservationCount: 0,
    quarantinedObservationIds: [],
    uncatalogedSkus,
    catalogMatchedSkus,
    invalidFormatSkus,
    discrepancies: {
      addedByVendor: [],
      removedByVendor: [],
      priceDeltas: [],
      quantityDeltas: [],
      uncatalogedSkus,
      exactMatches: []
    },
    verificationTimestamp: new Date().toISOString()
  };
}

/**
 * Cross-verify uploaded Vendor Partner Portal BOM against proposed solution rank.
 * @param {string|Array<object>} vendorBomInput File path or raw array of vendor items
 * @param {object} proposedRankSolution Target rank object from evalResults (e.g. Rank 1)
 * @param {string} chassisDir Target chassis catalog directory
 * @param {object} [options]
 * @returns {object} Audit report & discrepancy analysis
 */
function verifyVendorBOM(vendorBomInput, proposedRankSolution, chassisDir, options = {}) {
  const proposedItems = proposedRankSolution?.skuList || proposedRankSolution?.skuPartsList || [];
  if (options.isSingleFileAudit === true || !proposedRankSolution || proposedItems.length === 0) {
    return auditSingleVendorBOM(vendorBomInput, chassisDir, options);
  }

  let vendorItems = [];
  if (typeof vendorBomInput === 'string' && fs.existsSync(vendorBomInput)) {
    const rawContent = fs.readFileSync(vendorBomInput, 'utf-8');
    vendorItems = parseAndConsolidateBOQ(rawContent, vendorBomInput);
  } else if (Array.isArray(vendorBomInput)) {
    vendorItems = vendorBomInput;
  } else {
    throw new Error('Invalid Vendor BOM input. Must be a valid file path or item array.');
  }

  if (vendorItems.length === 0) {
    throw new Error('Comparison mode requires non-empty vendor BOM items.');
  }

  const { catalogSkus, catalogPriceMap } = loadCatalogSkusAndPrices(chassisDir);

  const vendorAgg = aggregateItemQuantities(vendorItems);
  const proposedAgg = aggregateItemQuantities(proposedItems);

  const discrepancies = {
    addedByVendor: [],
    removedByVendor: [],
    priceDeltas: [],
    quantityDeltas: [],
    uncatalogedSkus: [],
    exactMatches: []
  };

  // 1. Audit Vendor SKUs against Proposed SKUs
  for (const [cleanSku, vItem] of vendorAgg) {
    const pItem = proposedAgg.get(cleanSku);
    const inCatalog = catalogSkus.size > 0 && (catalogSkus.has(cleanSku) || catalogSkus.has(vItem.rawSku));

    if (!inCatalog) {
      discrepancies.uncatalogedSkus.push({
        sku: vItem.rawSku,
        quantity: vItem.quantity,
        description: vItem.description,
        reason: catalogSkus.size === 0
          ? 'Catalog data missing or empty; SKU cannot be certified.'
          : 'SKU present in Vendor Portal BOM but missing from local scraped catalog JSON.'
      });
    }

    if (!pItem) {
      discrepancies.addedByVendor.push({
        sku: vItem.rawSku,
        quantity: vItem.quantity,
        description: vItem.description,
        reason: 'Vendor Partner Portal automatically inserted this SKU into the quote.'
      });
    } else {
      const qtyDiff = vItem.quantity - pItem.quantity;
      const vPrice = parseFloat(String(vItem.unitPriceUsd || 0)) || catalogPriceMap.get(cleanSku) || 0;
      const pPrice = parseFloat(String(pItem.unitPriceUsd || 0)) || catalogPriceMap.get(cleanSku) || 0;
      const priceDiff = Math.abs(vPrice - pPrice);
      const hasPriceDelta = vPrice > 0 && pPrice > 0 && priceDiff > 1.0;

      if (hasPriceDelta) {
        discrepancies.priceDeltas.push({
          sku: vItem.rawSku,
          proposedPriceUsd: pPrice,
          vendorPriceUsd: vPrice,
          priceDeltaUsd: vPrice - pPrice,
          percentChange: (((vPrice - pPrice) / pPrice) * 100).toFixed(2) + '%'
        });
      }

      if (qtyDiff !== 0) {
        discrepancies.quantityDeltas.push({
          sku: vItem.rawSku,
          proposedQty: pItem.quantity,
          vendorQty: vItem.quantity,
          qtyDelta: qtyDiff,
          qtyDiff,
          reason: `Quantity mismatch: Proposed has ${pItem.quantity}, but Vendor quote has ${vItem.quantity}.`
        });
      }

      if (qtyDiff === 0 && !hasPriceDelta) {
        discrepancies.exactMatches.push({
          sku: vItem.rawSku,
          proposedQty: pItem.quantity,
          vendorQty: vItem.quantity,
          qtyMatch: true
        });
      }
    }
  }

  // 2. Audit Proposed SKUs missing from Vendor BOM
  for (const [cleanSku, pItem] of proposedAgg) {
    if (!vendorAgg.has(cleanSku)) {
      discrepancies.removedByVendor.push({
        sku: pItem.rawSku,
        quantity: pItem.quantity,
        description: pItem.description,
        reason: 'SKU was included in proposed Rank solution but dropped by Vendor Partner Portal.'
      });
    }
  }

  const hasDiscrepancies = discrepancies.addedByVendor.length > 0 ||
    discrepancies.removedByVendor.length > 0 ||
    discrepancies.uncatalogedSkus.length > 0 ||
    discrepancies.priceDeltas.length > 0 ||
    discrepancies.quantityDeltas.length > 0;

  const requiresFreshScrape = discrepancies.uncatalogedSkus.length > 0;

  // 3. Record vendor observations in product-scoped quarantine only for real additions
  const quarantinedObservations = [];
  const observationErrors = [];
  if (discrepancies.addedByVendor.length > 0) {
    const { isBaseChassis } = require('../catalog/product_meta.js');
    discrepancies.addedByVendor.forEach(added => {
      try {
        if (isBaseChassis(added.description || '')) {
          return;
        }
        const feedbackMsg = `Vendor Partner Portal auto-inserted SKU ${added.sku} (Qty ${added.quantity}): ${added.description}`;
        const observation = processPortalFeedback(feedbackMsg, chassisDir);
        if (observation.governanceStatus === 'QUARANTINED') quarantinedObservations.push(observation.quarantineId);
        else observationErrors.push({ sku: added.sku, reasons: observation.rejectionReasons || ['Observation was not quarantined'] });
      } catch (error) {
        observationErrors.push({ sku: added.sku, reasons: [error.message] });
        const _logger = require('../system/pipeline_logger.js');
        _logger.warn('VENDOR_BOM', `Could not persist portal observation for ${added.sku}`, error);
      }
    });
  }

  const auditReport = {
    chassisModel: path.basename(chassisDir || ''),
    proposedRank: proposedRankSolution?.rank || 1,
    totalVendorSkus: vendorItems.length,
    totalProposedSkus: proposedItems.length,
    isTwoBaselineComparison: true,
    isSingleFileAudit: false,
    is100PercentMatch: !hasDiscrepancies,
    hasDiscrepancies,
    requiresFreshScrape,
    learnedDeltaCount: 0,
    quarantinedObservationCount: quarantinedObservations.length,
    quarantinedObservationIds: quarantinedObservations,
    observationErrors,
    discrepancies,
    verificationTimestamp: new Date().toISOString()
  };

  try {
    const { recordReconciliationTelemetry } = require('../system/telemetry.js');
    recordReconciliationTelemetry(auditReport);
  } catch (err) {
    const _logger = require('../system/pipeline_logger.js');
    _logger.warn('VENDOR_BOM', 'Telemetry recording advisory', err);
  }

  return auditReport;
}

// ── CLI Runner ─────────────────────────────────────────────────────────────
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node scripts/lib/boq/vendor_bom_verifier.js --vendor <vendor_quote.xlsx> [--customer <customer_boq.xlsx>] [--catalog <catalog_dir>] [--json]');
    console.log('       node scripts/lib/boq/vendor_bom_verifier.js <vendor_quote.xlsx> [customer_boq.xlsx] [catalog_dir] [--json]');
    process.exit(0);
  }

  let customerFile = null;
  let vendorFile = null;
  let catalogDir = null;
  let jsonOutput = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--customer' && args[i + 1]) {
      customerFile = args[++i];
    } else if (args[i] === '--vendor' && args[i + 1]) {
      vendorFile = args[++i];
    } else if (args[i] === '--catalog' && args[i + 1]) {
      catalogDir = args[++i];
    } else if (args[i] === '--json') {
      jsonOutput = true;
    } else if (!vendorFile && !args[i].startsWith('--')) {
      vendorFile = args[i];
    } else if (!customerFile && !args[i].startsWith('--')) {
      customerFile = args[i];
    } else if (!catalogDir && !args[i].startsWith('--')) {
      catalogDir = args[i];
    }
  }

  if (!vendorFile) {
    console.error('Usage: node scripts/lib/boq/vendor_bom_verifier.js --vendor <vendor_quote.xlsx> [--customer <customer_boq.xlsx>] [--catalog <catalog_dir>] [--json]');
    process.exit(1);
  }

  let resolvedCatalogDir = catalogDir ? path.resolve(catalogDir) : null;
  if (!resolvedCatalogDir) {
    // Attempt auto-resolution from vendor or customer filename
    const candidateName = path.basename(customerFile || vendorFile);
    const match = candidateName.match(/(DL\d{3}[a-z]?_Gen\d{2}|DL\d{3}[a-z]?|SY\d{3}|MSL\d{4}|GX\d{4}|Alletra)/i);
    if (match) {
      const chassisName = match[1];
      const outputsDir = path.resolve(__dirname, '..', '..', '..', 'outputs');
      for (const fam of ['ProLiant', 'Synergy', 'StoreEver', 'Cray', 'Alletra']) {
        const famDir = path.join(outputsDir, fam);
        if (!fs.existsSync(famDir)) continue;
        for (const gen of fs.readdirSync(famDir)) {
          const genDir = path.join(famDir, gen);
          if (!fs.existsSync(genDir) || !fs.statSync(genDir).isDirectory()) continue;
          for (const mod of fs.readdirSync(genDir)) {
            if (mod.toLowerCase().includes(chassisName.toLowerCase()) || chassisName.toLowerCase().includes(mod.toLowerCase())) {
              resolvedCatalogDir = path.join(genDir, mod);
              break;
            }
          }
          if (resolvedCatalogDir) break;
        }
        if (resolvedCatalogDir) break;
      }
    }
  }
  if (!resolvedCatalogDir) {
    console.error('Error: Please specify target catalog directory via --catalog <dir> (e.g. --catalog outputs/ProLiant/Gen11/DL360_Gen11). Zero-hardcoding guardrail forbids defaulting.');
    process.exit(1);
  }

  let proposedSolution = null;
  if (customerFile && fs.existsSync(customerFile)) {
    if (customerFile.endsWith('.json')) {
      try {
        const rawJson = JSON.parse(fs.readFileSync(customerFile, 'utf-8'));
        proposedSolution = rawJson.matrix?.rank1 || rawJson.rank1 || rawJson;
      } catch (err) {
        console.error(`Error parsing customer JSON: ${err.message}`);
        process.exit(1);
      }
    } else {
      const { evaluateBOQMultiAspect } = require('./boq_evaluator.js');
      const evalRes = evaluateBOQMultiAspect(customerFile);
      proposedSolution = evalRes.matrix?.rank1 || {
        rank: 1,
        name: 'Rank 1: Baseline Intent Preserved',
        skuList: evalRes.parsedItems || []
      };
    }
  } else {
    // If no customer file provided, perform single-file catalog audit without invented comparison metrics
    proposedSolution = null;
  }

  try {
    const report = proposedSolution
      ? verifyVendorBOM(path.resolve(vendorFile), proposedSolution, resolvedCatalogDir)
      : auditSingleVendorBOM(path.resolve(vendorFile), resolvedCatalogDir);

    if (jsonOutput) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log('\n===============================================================');
      console.log(`📊 VENDOR BOM RECONCILIATION REPORT: ${report.chassisModel}`);
      console.log('===============================================================');
      console.log(`- 100% Match: ${report.is100PercentMatch ? '✅ YES' : '❌ NO'}`);
      console.log(`- Total Vendor SKUs: ${report.totalVendorSkus}`);
      console.log(`- Total Proposed SKUs: ${report.totalProposedSkus || 0}`);
      console.log(`- Uncataloged SKUs: ${report.discrepancies.uncatalogedSkus.length}`);
      console.log(`- Added by Vendor: ${report.discrepancies.addedByVendor.length}`);
      console.log(`- Dropped by Vendor: ${report.discrepancies.removedByVendor.length}`);
      console.log(`- Quantity Deltas: ${report.discrepancies.quantityDeltas?.length || 0}`);
      console.log(`- Price Deltas: ${report.discrepancies.priceDeltas.length}`);

      if (report.discrepancies.uncatalogedSkus.length > 0) {
        console.log('\n⚠️ UNCATALOGED SKUs (Require CDP Scraping):');
        report.discrepancies.uncatalogedSkus.forEach(s => console.log(`  - [${s.sku}] (Qty ${s.quantity}): ${s.description}`));
      }

      if (report.discrepancies.addedByVendor.length > 0) {
        console.log('\n➕ ADDED BY VENDOR (Auto-inserted into quote):');
        report.discrepancies.addedByVendor.forEach(s => console.log(`  - [${s.sku}] (Qty ${s.quantity}): ${s.description}`));
      }

      if (report.discrepancies.removedByVendor.length > 0) {
        console.log('\n➖ REMOVED BY VENDOR (Dropped from customer request):');
        report.discrepancies.removedByVendor.forEach(s => console.log(`  - [${s.sku}] (Qty ${s.quantity}): ${s.description}`));
      }

      if (report.discrepancies.quantityDeltas?.length > 0) {
        console.log('\n⚖️ QUANTITY DELTAS:');
        report.discrepancies.quantityDeltas.forEach(q => console.log(`  - [${q.sku}]: Proposed Qty ${q.proposedQty} vs Vendor Qty ${q.vendorQty} (Delta: ${q.qtyDelta})`));
      }

      if (report.discrepancies.priceDeltas.length > 0) {
        console.log('\n💲 PRICE DELTAS:');
        report.discrepancies.priceDeltas.forEach(d => console.log(`  - [${d.sku}]: Proposed $${d.proposedPriceUsd} vs Vendor $${d.vendorPriceUsd} (${d.percentChange})`));
      }
      console.log('===============================================================\n');
    }
  } catch (err) {
    console.error(`Reconciliation failed: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  verifyVendorBOM,
  auditSingleVendorBOM
};
