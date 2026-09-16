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
const { isValidHpeSKU } = require('../catalog/sku.js');

/**
 * Cross-verify uploaded Vendor Partner Portal BOM against proposed solution rank.
 * @param {string|Array<object>} vendorBomInput File path or raw array of vendor items
 * @param {object} proposedRankSolution Target rank object from evalResults (e.g. Rank 1)
 * @param {string} chassisDir Target chassis catalog directory
 * @returns {object} Audit report & discrepancy analysis
 */
function verifyVendorBOM(vendorBomInput, proposedRankSolution, chassisDir) {
  let vendorItems = [];

  if (typeof vendorBomInput === 'string' && fs.existsSync(vendorBomInput)) {
    const rawContent = fs.readFileSync(vendorBomInput, 'utf-8');
    vendorItems = parseAndConsolidateBOQ(rawContent, vendorBomInput);
  } else if (Array.isArray(vendorBomInput)) {
    vendorItems = vendorBomInput;
  } else {
    throw new Error('Invalid Vendor BOM input. Must be a valid file path or item array.');
  }

  // Load target chassis catalog JSON
  const chassisPrefix = path.basename(chassisDir);
  const catalogPath = path.join(chassisDir, `${chassisPrefix}_Catalog.json`);
  let catalogSkus = new Set();
  let catalogPriceMap = new Map();

  if (fs.existsSync(catalogPath)) {
    try {
      const cat = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
      if (cat.entries) {
        cat.entries.forEach(entry => {
          (entry.skus || []).forEach(s => {
            const sku = s['Product #'] || s.sku;
            if (sku) {
              catalogSkus.add(sku);
              const price = parseFloat(String(s['Unit Price (USD)'] || s['Price (USD)'] || '0').replace(/[^0-9.]/g, '')) || 0;
              catalogPriceMap.set(sku, price);
            }
          });
        });
      }
    } catch (_) { const _logger = require('../system/pipeline_logger.js'); _logger.warn('ERROR', 'vendor_bom_verifier.js', _); }
  }

  const proposedSkus = (proposedRankSolution?.skuList || proposedRankSolution?.skuPartsList || []).reduce((map, item) => {
    map.set(item.sku, item);
    return map;
  }, new Map());

  const vendorSkuMap = new Map();
  vendorItems.forEach(it => vendorSkuMap.set(it.sku, it));

  const discrepancies = {
    addedByVendor: [],
    removedByVendor: [],
    priceDeltas: [],
    uncatalogedSkus: [],
    exactMatches: []
  };

  // 1. Audit Vendor SKUs against Proposed SKUs
  vendorItems.forEach(vItem => {
    const pItem = proposedSkus.get(vItem.sku);
    const inCatalog = catalogSkus.size === 0 ? isValidHpeSKU(vItem.sku) : (catalogSkus.has(vItem.sku) || !!pItem);

    if (!inCatalog) {
      discrepancies.uncatalogedSkus.push({
        sku: vItem.sku,
        quantity: vItem.quantity,
        description: vItem.description,
        reason: 'SKU present in Vendor Portal BOM but missing from local scraped catalog JSON.'
      });
    }

    if (!pItem) {
      discrepancies.addedByVendor.push({
        sku: vItem.sku,
        quantity: vItem.quantity,
        description: vItem.description,
        reason: 'Vendor Partner Portal automatically inserted this SKU into the quote.'
      });
    } else {
      // Compare quantities & price
      const qtyDiff = vItem.quantity - pItem.quantity;
      const vPrice = parseFloat(String(vItem.unitPriceUsd || 0)) || catalogPriceMap.get(vItem.sku) || 0;
      const pPrice = parseFloat(String(pItem.unitPriceUsd || 0)) || catalogPriceMap.get(vItem.sku) || 0;

      if (vPrice > 0 && pPrice > 0 && Math.abs(vPrice - pPrice) > 1.0) {
        discrepancies.priceDeltas.push({
          sku: vItem.sku,
          proposedPriceUsd: pPrice,
          vendorPriceUsd: vPrice,
          priceDeltaUsd: vPrice - pPrice,
          percentChange: (((vPrice - pPrice) / pPrice) * 100).toFixed(2) + '%'
        });
      }

      discrepancies.exactMatches.push({
        sku: vItem.sku,
        proposedQty: pItem.quantity,
        vendorQty: vItem.quantity,
        qtyMatch: qtyDiff === 0
      });
    }
  });

  // 2. Audit Proposed SKUs missing from Vendor BOM
  proposedSkus.forEach((pItem, sku) => {
    if (!vendorSkuMap.has(sku)) {
      discrepancies.removedByVendor.push({
        sku,
        quantity: pItem.quantity,
        description: pItem.description,
        reason: 'SKU was included in proposed Rank solution but dropped by Vendor Partner Portal.'
      });
    }
  });

  const hasDiscrepancies = discrepancies.addedByVendor.length > 0 ||
    discrepancies.removedByVendor.length > 0 ||
    discrepancies.uncatalogedSkus.length > 0 ||
    discrepancies.priceDeltas.length > 0;

  const requiresFreshScrape = discrepancies.uncatalogedSkus.length > 0;

  // 3. Record vendor observations in product-scoped quarantine. A portal-added
  // line is useful evidence, but it is not sufficient proof of a general rule.
  const quarantinedObservations = [];
  const observationErrors = [];
  if (hasDiscrepancies) {
    discrepancies.addedByVendor.forEach(added => {
      try {
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
    chassisModel: path.basename(chassisDir),
    proposedRank: proposedRankSolution?.rank || 1,
    totalVendorSkus: vendorItems.length,
    totalProposedSkus: proposedSkus.size,
    is100PercentMatch: !hasDiscrepancies,
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
    // If no customer file provided, create an empty proposed solution baseline
    proposedSolution = { rank: 1, name: 'Baseline Evaluation', skuList: [] };
  }

  try {
    const report = verifyVendorBOM(path.resolve(vendorFile), proposedSolution, resolvedCatalogDir);

    if (jsonOutput) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log('\n===============================================================');
      console.log(`📊 VENDOR BOM RECONCILIATION REPORT: ${report.chassisModel}`);
      console.log('===============================================================');
      console.log(`- 100% Match: ${report.is100PercentMatch ? '✅ YES' : '❌ NO'}`);
      console.log(`- Total Vendor SKUs: ${report.totalVendorSkus}`);
      console.log(`- Total Proposed SKUs: ${report.totalProposedSkus}`);
      console.log(`- Uncataloged SKUs: ${report.discrepancies.uncatalogedSkus.length}`);
      console.log(`- Added by Vendor: ${report.discrepancies.addedByVendor.length}`);
      console.log(`- Dropped by Vendor: ${report.discrepancies.removedByVendor.length}`);
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
  verifyVendorBOM
};
