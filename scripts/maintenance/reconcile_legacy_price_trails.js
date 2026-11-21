'use strict';

/**
 * Non-destructively reconcile and quarantine corrupted price_history.json and
 * services_price_history.json records (date parses, price-delta tokens, isolated
 * 10x spikes/collapses, and confirmed snapshot-vs-trail price conflicts) while
 * preserving raw observed values and audit provenance.
 */

const fs = require('fs');
const path = require('path');
const { safeWriteJsonAtomic } = require('../lib/system/fs_compat.js');
const { listAllCatalogs } = require('../lib/catalog/catalog_discovery.js');
const { sanitizePriceTrail } = require('../lib/catalog/diff_catalog.js');
const { parseStrictPrice } = require('../lib/catalog/field_parsers.js');
const { cleanBaseSKU } = require('../lib/catalog/sku.js');

const ROOT = path.resolve(__dirname, '../..');
const RECEIPT_PATH = path.join(ROOT, 'outputs', 'history', 'legacy_price_trail_reconciliation_receipt.json');

function _buildSnapshotPriceIndex(catalog) {
  const priceBySkuDate = new Map();
  const historyDir = path.join(catalog.catalogDir, 'history');
  const files = [];
  if (catalog.catalogJsonPath && fs.existsSync(catalog.catalogJsonPath)) {
    files.push({ date: catalog.scrapeDate, file: catalog.catalogJsonPath });
  }
  if (fs.existsSync(historyDir)) {
    for (const name of fs.readdirSync(historyDir)) {
      const m = name.match(/^(?:catalog|services)_(\d{4}-\d{2}-\d{2})\.json$/);
      if (m) files.push({ date: m[1], file: path.join(historyDir, name) });
    }
  }
  for (const { date, file } of files) {
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      const snapDate = date || parsed?.metadata?.scrapeDate;
      if (!snapDate) continue;
      for (const entry of parsed.entries || []) {
        for (const row of entry.skus || []) {
          const sku = cleanBaseSKU(row['Product #'] || row.sku);
          if (!sku) continue;
          const p = parseStrictPrice(row['List Price (USD)'] ?? row['Unit Price (USD)'] ?? row['Price (USD)'] ?? row.listPrice, { row });
          if (p.priceState === 'PRICED' && p.priceUsd > 1) {
            priceBySkuDate.set(JSON.stringify([sku, snapDate]), p.priceUsd);
          }
        }
      }
    } catch {
      // Unreadable historical file skipped cleanly
    }
  }
  return priceBySkuDate;
}

function _reconcileHistoryFile(historyPath, snapshotIndex, dryRun) {
  if (!fs.existsSync(historyPath)) return null;
  const original = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
  const updated = {};
  let quarantinedCount = 0;
  const examples = [];

  for (const [sku, rawEvents] of Object.entries(original)) {
    const cleanSku = cleanBaseSKU(sku) || sku;
    const sanitized = sanitizePriceTrail(Array.isArray(rawEvents) ? rawEvents : [], { excludeQuarantined: false });
    for (const event of sanitized) {
      if (event.quarantined) {
        quarantinedCount++;
        if (examples.length < 20) {
          examples.push({ sku: cleanSku, date: event.date, validationState: event.validationState, observedPrice: event.price });
        }
        continue;
      }
      const snapKey = JSON.stringify([cleanSku, event.date]);
      const snapPrice = snapshotIndex.get(snapKey);
      if (snapPrice !== undefined && /^PRICE_(?:AND_ATTRIBUTE_)?CHANGED$/.test(event.status || '')
        && Number.isFinite(event.price) && event.price > 1
        && Number.isFinite(event.prevPrice) && event.prevPrice > 1
        && Math.abs(event.price - snapPrice) > 0.01) {
        event.quarantined = true;
        event.validationState = 'TRAIL_SNAPSHOT_CONFLICT';
        event.effectivePrice = snapPrice;
        event.anomalyProvenance = {
          observedPrice: event.price,
          snapshotPrice: snapPrice,
          suspectedReason: 'Legacy price_history entry disagrees with dated catalog snapshot'
        };
        quarantinedCount++;
        if (examples.length < 20) {
          examples.push({ sku: cleanSku, date: event.date, validationState: event.validationState, observedPrice: event.price, snapshotPrice: snapPrice });
        }
      }
    }
    updated[sku] = sanitized;
  }

  if (!dryRun && quarantinedCount > 0) {
    safeWriteJsonAtomic(historyPath, updated);
  }
  return { historyPath, totalSkus: Object.keys(original).length, quarantinedEvents: quarantinedCount, examples };
}

function reconcilePortfolioPriceTrails(options = {}) {
  const dryRun = Boolean(options.dryRun);
  const catalogs = Array.isArray(options.catalogs) ? options.catalogs : listAllCatalogs();
  const reports = [];
  let totalQuarantined = 0;

  for (const catalog of catalogs) {
    const snapshotIndex = _buildSnapshotPriceIndex(catalog);
    for (const fileName of ['price_history.json', 'services_price_history.json']) {
      const hp = path.join(catalog.catalogDir, 'history', fileName);
      const res = _reconcileHistoryFile(hp, snapshotIndex, dryRun);
      if (res) {
        reports.push({ product: catalog.id, ...res });
        totalQuarantined += res.quarantinedEvents;
      }
    }
  }

  const receipt = {
    schemaVersion: '1.0.0',
    executedAt: new Date().toISOString(),
    dryRun,
    catalogsScanned: catalogs.length,
    totalQuarantinedEvents: totalQuarantined,
    reports
  };
  if (!dryRun && !options.skipReceipt) {
    safeWriteJsonAtomic(RECEIPT_PATH, receipt);
  }
  return receipt;
}

if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  const asJson = process.argv.includes('--json');
  const receipt = reconcilePortfolioPriceTrails({ dryRun });
  if (asJson) {
    console.log(JSON.stringify(receipt, null, 2));
  } else {
    console.log(`Reconciled ${receipt.catalogsScanned} catalogs (dryRun=${dryRun}); quarantined events: ${receipt.totalQuarantinedEvents}`);
  }
}

module.exports = { reconcilePortfolioPriceTrails };
