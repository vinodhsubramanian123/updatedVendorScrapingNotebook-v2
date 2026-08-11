'use strict';
/**
 * scripts/lib/diff_catalog.js — Catalog Diff & Historical Price Tracking Engine
 *
 * Computes SKU additions, removals, price changes, and historical price trails
 * between catalog scrapes. Maintained under outputs/{Family}/{Gen}/{Model}/history/
 */

const fs   = require('fs');
const path = require('path');
const { safeWriteJsonAtomic } = require('./fs_compat');

function parsePrice(val) {
  if (val === null || val === undefined) return 0;
  const cleaned = String(val).replace(/[^0-9.\-]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function formatDate(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const matched = String(dateStr).match(/^\d{4}-\d{2}-\d{2}/);
  return matched ? matched[0] : new Date().toISOString().split('T')[0];
}

/**
 * Perform diff calculation and history update.
 * @param {object} catalogData - Structured catalog object from build_catalog.js
 * @param {string} historyDir - Absolute path to history/ directory
 * @returns {object} { enrichedCatalog, diffSummary, prevSnapshotPath }
 */
function processCatalogDiff(catalogData, historyDir) {
  fs.mkdirSync(historyDir, { recursive: true });

  const scrapeDate = formatDate(catalogData.metadata?.scrapeDate);
  const currentSnapshotPath = path.join(historyDir, `catalog_${scrapeDate}.json`);
  const priceHistoryPath    = path.join(historyDir, 'price_history.json');

  // Load existing price history log
  let priceHistory = {};
  if (fs.existsSync(priceHistoryPath)) {
    try {
      priceHistory = JSON.parse(fs.readFileSync(priceHistoryPath, 'utf-8'));
    } catch (err) {
      console.warn(`  ⚠️ Warning: Corrupted price_history.json at ${priceHistoryPath}: ${err.message}`);
    }
  }

  // Find previous catalog snapshots (excluding today's file if re-running same day)
  const snapshotFiles = fs.readdirSync(historyDir)
    .filter(f => f.startsWith('catalog_') && f.endsWith('.json') && f !== `catalog_${scrapeDate}.json`)
    .sort();

  const prevSnapshotPath = snapshotFiles.length > 0
    ? path.join(historyDir, snapshotFiles[snapshotFiles.length - 1])
    : null;

  let prevCatalog = null;
  if (prevSnapshotPath && fs.existsSync(prevSnapshotPath)) {
    try {
      prevCatalog = JSON.parse(fs.readFileSync(prevSnapshotPath, 'utf-8'));
    } catch (err) {
      console.warn(`  ⚠️ Warning: Corrupted previous snapshot at ${prevSnapshotPath}: ${err.message}`);
    }
  }

  // Build previous SKU lookup map
  const prevSkuMap = new Map();
  if (prevCatalog && Array.isArray(prevCatalog.entries)) {
    for (const entry of prevCatalog.entries) {
      for (const sku of entry.skus || []) {
        const pn = sku['Product #'];
        if (pn) {
          prevSkuMap.set(pn, {
            ...sku,
            parentCategory: entry.parentCategory,
            subCategory:    entry.subCategory,
            constraint:     entry.constraint,
            rules:          (entry.rules || []).join(' | ')
          });
        }
      }
    }
  }

  const currSkuMap = new Map();
  const diffSummary = {
    added: 0,
    removed: 0,
    priceChanged: 0,
    attributeChanged: 0,
    priceAndAttributeChanged: 0,
    unchanged: 0,
    discontinuedTotal: 0
  };

  const attributeHistoryPath = path.join(historyDir, 'attribute_history.json');
  const discontinuedSkusPath  = path.join(historyDir, 'discontinued_skus.json');

  // Load existing attribute history & discontinued SKU registry
  let attributeHistory = [];
  if (fs.existsSync(attributeHistoryPath)) {
    try {
      attributeHistory = JSON.parse(fs.readFileSync(attributeHistoryPath, 'utf-8'));
      if (!Array.isArray(attributeHistory)) attributeHistory = [];
    } catch (err) {
      console.warn(`  ⚠️ Warning: Corrupted attribute_history.json at ${attributeHistoryPath}: ${err.message}`);
    }
  }

  let discontinuedRegistry = {};
  if (fs.existsSync(discontinuedSkusPath)) {
    try {
      discontinuedRegistry = JSON.parse(fs.readFileSync(discontinuedSkusPath, 'utf-8'));
    } catch (err) {
      console.warn(`  ⚠️ Warning: Corrupted discontinued_skus.json at ${discontinuedSkusPath}: ${err.message}`);
    }
  }

  // 1. Process current entries & compute diffs
  for (const entry of catalogData.entries) {
    for (const sku of entry.skus || []) {
      const pn = sku['Product #'];
      if (!pn) continue;
      currSkuMap.set(pn, sku);

      const currPrice = parsePrice(sku['Unit Price (USD)'] || sku['Price (USD)']);

      // Price trail history initialization
      if (!priceHistory[pn]) priceHistory[pn] = [];

      // Check if SKU was previously marked discontinued, but now reinstated
      if (discontinuedRegistry[pn] && discontinuedRegistry[pn].status === 'DISCONTINUED') {
        discontinuedRegistry[pn].status = 'REINSTATED';
        discontinuedRegistry[pn].reinstatedDate = scrapeDate;
        discontinuedRegistry[pn].lastKnownPrice = currPrice.toFixed(2);
      }

      if (!prevCatalog) {
        // Baseline run — first time scrape
        sku['Diff Status']               = 'UNCHANGED';
        sku['Previous List Price (USD)']  = 'N/A';
        sku['Price Change (USD)']         = '$0.00';
        sku['Price Change (%)']           = '0.00%';
        sku['Attribute Deltas']           = 'None';

        if (!priceHistory[pn].some(h => h.date === scrapeDate)) {
          priceHistory[pn].push({ date: scrapeDate, price: currPrice, status: 'BASELINE' });
        }
        diffSummary.unchanged++;
      } else if (!prevSkuMap.has(pn)) {
        // ADDED SKU
        sku['Diff Status']               = 'ADDED';
        sku['Previous List Price (USD)']  = 'N/A';
        sku['Price Change (USD)']         = `+$${currPrice.toFixed(2)}`;
        sku['Price Change (%)']           = '+100.00%';
        sku['Attribute Deltas']           = 'New SKU introduced';

        if (!priceHistory[pn].some(h => h.date === scrapeDate)) {
          priceHistory[pn].push({ date: scrapeDate, price: currPrice, status: 'ADDED' });
        }
        diffSummary.added++;
      } else {
        // SKU present in both current and previous
        const prevSku   = prevSkuMap.get(pn);
        const prevPrice = parsePrice(prevSku['Unit Price (USD)'] || prevSku['Price (USD)']);
        sku['Previous List Price (USD)'] = prevPrice.toFixed(2);

        // Perform Deep Attribute Diffing across non-price metadata
        const attributeDeltas = [];
        const attrsToCompare = [
          { key: 'Description', label: 'Description' },
          { key: 'Constraint Text', label: 'Constraint' },
          { key: 'Table Rule/Note', label: 'Rule/Note' },
          { key: 'Subcategory Max Qty', label: 'Max Qty' },
          { key: 'Component Role', label: 'Component Role' },
          { key: 'Option Type', label: 'Option Type' },
          { key: 'HPE Recommended', label: 'HPE Recommended' },
          { key: 'Start Date', label: 'Start Date' }
        ];

        for (const attr of attrsToCompare) {
          const currVal = String(sku[attr.key] || '').trim();
          const prevVal = String(prevSku[attr.key] || '').trim();
          if (currVal !== prevVal && (currVal || prevVal)) {
            attributeDeltas.push({
              field: attr.label,
              oldValue: prevVal || '(None)',
              newValue: currVal || '(None)'
            });

            // Log to attribute history
            attributeHistory.push({
              date: scrapeDate,
              productNumber: pn,
              chassis: catalogData.metadata?.chassis || 'Chassis',
              field: attr.label,
              oldValue: prevVal,
              newValue: currVal
            });
          }
        }

        const priceHasChanged = Math.abs(currPrice - prevPrice) > 0.001;
        const attrsHaveChanged = attributeDeltas.length > 0;

        sku['Attribute Deltas'] = attrsHaveChanged
          ? attributeDeltas.map(d => `${d.field}: "${d.oldValue}" → "${d.newValue}"`).join(' | ')
          : 'None';

        if (priceHasChanged && attrsHaveChanged) {
          // PRICE AND ATTRIBUTE CHANGED
          const delta = currPrice - prevPrice;
          const pct   = prevPrice > 0 ? (delta / prevPrice * 100) : 0;

          sku['Diff Status']        = 'PRICE_AND_ATTRIBUTE_CHANGED';
          sku['Price Change (USD)'] = `${delta > 0 ? '+' : ''}$${delta.toFixed(2)}`;
          sku['Price Change (%)']   = `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`;

          if (!priceHistory[pn].some(h => h.date === scrapeDate)) {
            priceHistory[pn].push({ date: scrapeDate, price: currPrice, status: 'PRICE_AND_ATTRIBUTE_CHANGED', prevPrice });
          }
          diffSummary.priceAndAttributeChanged++;
        } else if (priceHasChanged) {
          // ONLY PRICE CHANGED
          const delta = currPrice - prevPrice;
          const pct   = prevPrice > 0 ? (delta / prevPrice * 100) : 0;

          sku['Diff Status']        = 'PRICE_CHANGED';
          sku['Price Change (USD)'] = `${delta > 0 ? '+' : ''}$${delta.toFixed(2)}`;
          sku['Price Change (%)']   = `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`;

          if (!priceHistory[pn].some(h => h.date === scrapeDate)) {
            priceHistory[pn].push({ date: scrapeDate, price: currPrice, status: 'PRICE_CHANGED', prevPrice });
          }
          diffSummary.priceChanged++;
        } else if (attrsHaveChanged) {
          // ONLY ATTRIBUTE CHANGED
          sku['Diff Status']        = 'ATTRIBUTE_CHANGED';
          sku['Price Change (USD)'] = '$0.00';
          sku['Price Change (%)']   = '0.00%';

          if (!priceHistory[pn].some(h => h.date === scrapeDate)) {
            priceHistory[pn].push({ date: scrapeDate, price: currPrice, status: 'ATTRIBUTE_CHANGED' });
          }
          diffSummary.attributeChanged++;
        } else {
          // UNCHANGED
          sku['Diff Status']        = 'UNCHANGED';
          sku['Price Change (USD)'] = '$0.00';
          sku['Price Change (%)']   = '0.00%';

          if (!priceHistory[pn].some(h => h.date === scrapeDate)) {
            priceHistory[pn].push({ date: scrapeDate, price: currPrice, status: 'UNCHANGED' });
          }
          diffSummary.unchanged++;
        }
      }

      // Build text price history trail
      const trailEntries = priceHistory[pn] || [];
      sku['Price History Trail'] = trailEntries
        .map((h, i) => {
          let arrow = '';
          if (h.status.includes('PRICE') && i > 0) {
            arrow = h.price > trailEntries[i - 1].price ? ' (▲)' : ' (▼)';
          }
          return `${h.date}: ${h.price.toFixed(2)}${arrow}`;
        })
        .join(' → ');
    }
  }

  // 2. Process REMOVED SKUs & Update Cumulative Discontinued Registry
  if (prevCatalog) {
    for (const [pn, prevSku] of prevSkuMap.entries()) {
      if (!currSkuMap.has(pn)) {
        diffSummary.removed++;
        const prevPrice = parsePrice(prevSku['Unit Price (USD)'] || prevSku['Price (USD)']);

        if (!priceHistory[pn]) priceHistory[pn] = [];
        if (!priceHistory[pn].some(h => h.date === scrapeDate && h.status === 'REMOVED')) {
          priceHistory[pn].push({ date: scrapeDate, price: prevPrice, status: 'REMOVED' });
        }

        // Cumulative Discontinued Registry Entry
        discontinuedRegistry[pn] = {
          productNumber: pn,
          description: prevSku.Description || prevSku.description || '',
          mainCategory: prevSku.parentCategory || 'Deprecation Archive',
          subCategory: prevSku.subCategory || 'Discontinued SKUs',
          lastKnownPrice: prevPrice.toFixed(2),
          discontinuedDate: scrapeDate,
          status: 'DISCONTINUED',
          reason: 'Removed from active HPE OCA portal catalog'
        };

        const trailEntries = priceHistory[pn] || [];
        const trailStr     = trailEntries.map(h => `${h.date}: $${h.price.toFixed(2)}`).join(' → ') + ' → [REMOVED]';

        const tombstoneSKU = {
          'Main Category':              prevSku.parentCategory || 'Deprecation Archive',
          'Sub-Category':               prevSku.subCategory || 'Discontinued SKUs',
          'Hierarchy Path':             prevSku['Hierarchy Path'] || `HPE OCA > ${catalogData.metadata?.chassis || 'Chassis'} > Deprecation Archive > Discontinued SKUs`,
          'Component Role':             prevSku['Component Role'] || 'Discontinued Hardware',
          'Constraint Text':            prevSku['Constraint Text'] || 'Discontinued',
          'Subcategory Max Qty':        '0',
          'Table Rule/Note':            '[DISCONTINUED] SKU removed from latest HPE OCA portal catalog',
          'Option Type':                prevSku['Option Type'] || prevSku.optionType || ((prevSku.parentCategory || '').toLowerCase().includes('chassis') ? 'CTO' : 'Standard'),
          'Product #':                  pn,
          'Description':                `[REMOVED SKU] ${prevSku.Description || prevSku.description || ''}`,
          'Current Qty':                '0',
          'Unit Price (USD)':           prevPrice.toFixed(2),
          'Price Delta (USD)':          '-',
          'Extended Price (USD)':       '0.00',
          'Price per GB (USD)':         '-',
          'HPE Recommended':            'No',
          'Start Date':                 prevSku['Start Date'] || prevSku.Start || '',
          'Discontinued Date':          scrapeDate,
          'Diff Status':                'REMOVED',
          'Previous List Price (USD)':  prevPrice.toFixed(2),
          'Price Change (USD)':         `-$${prevPrice.toFixed(2)}`,
          'Price Change (%)':           '-100.00%',
          'Attribute Deltas':           'SKU Discontinued & Tombstoned',
          'Price History Trail':        trailStr
        };

        // Find or create target entry in catalogData
        let targetEntry = catalogData.entries.find(e => e.subCategory === tombstoneSKU['Sub-Category']);
        if (!targetEntry) {
          targetEntry = {
            parentCategory: tombstoneSKU['Main Category'],
            subCategory:    tombstoneSKU['Sub-Category'],
            constraint:     'Discontinued',
            maxQty:         0,
            rules:          ['[DISCONTINUED] SKU present in previous scrape but removed from active catalog'],
            headers:        ['Product #', 'Description', 'Current Qty', 'Price (USD)'],
            skuCount:       0,
            skus:           []
          };
          catalogData.entries.push(targetEntry);
        }
        targetEntry.skus.push(tombstoneSKU);
        targetEntry.skuCount = targetEntry.skus.length;
      }
    }
  }

  diffSummary.discontinuedTotal = Object.values(discontinuedRegistry).filter(d => d.status === 'DISCONTINUED').length;

  // Save historical snapshot, price history, attribute history, and discontinued SKU registry atomically
  safeWriteJsonAtomic(currentSnapshotPath, catalogData);
  safeWriteJsonAtomic(priceHistoryPath, priceHistory);
  safeWriteJsonAtomic(attributeHistoryPath, attributeHistory);
  safeWriteJsonAtomic(discontinuedSkusPath, discontinuedRegistry);

  // Compute Category & Subcategory Price Variance Analytics
  const categoryAnalytics = {};
  for (const entry of catalogData.entries) {
    const cat = entry.parentCategory || 'Other';
    if (!categoryAnalytics[cat]) {
      categoryAnalytics[cat] = { totalSKUs: 0, totalPrice: 0, minPrice: Infinity, maxPrice: 0, subcategories: {} };
    }
    const subcat = entry.subCategory || 'General';
    if (!categoryAnalytics[cat].subcategories[subcat]) {
      categoryAnalytics[cat].subcategories[subcat] = { totalSKUs: 0, totalPrice: 0 };
    }
    for (const sku of entry.skus || []) {
      const price = parsePrice(sku['Unit Price (USD)'] || sku['Price (USD)']);
      if (price > 0) {
        categoryAnalytics[cat].totalSKUs++;
        categoryAnalytics[cat].totalPrice += price;
        if (price < categoryAnalytics[cat].minPrice) categoryAnalytics[cat].minPrice = price;
        if (price > categoryAnalytics[cat].maxPrice) categoryAnalytics[cat].maxPrice = price;

        categoryAnalytics[cat].subcategories[subcat].totalSKUs++;
        categoryAnalytics[cat].subcategories[subcat].totalPrice += price;
      }
    }
  }

  // Format averages and handle Infinity
  Object.keys(categoryAnalytics).forEach(cat => {
    const c = categoryAnalytics[cat];
    c.avgPrice = c.totalSKUs > 0 ? (c.totalPrice / c.totalSKUs) : 0;
    if (c.minPrice === Infinity) c.minPrice = 0;
    Object.keys(c.subcategories).forEach(sub => {
      const s = c.subcategories[sub];
      s.avgPrice = s.totalSKUs > 0 ? (s.totalPrice / s.totalSKUs) : 0;
    });
  });

  // Update metadata with diff summary & price analytics
  catalogData.metadata.diffSummary = diffSummary;
  catalogData.metadata.historySnapshot = path.basename(currentSnapshotPath);
  catalogData.metadata.priceAnalytics = {
    scrapeDate,
    categoryBreakdown: categoryAnalytics
  };

  console.log(`\n--- Stage 7: Catalog Diff Engine Summary ---`);
  console.log(`  Scrape Date:          ${scrapeDate}`);
  console.log(`  Previous Ref:         ${prevSnapshotPath ? path.basename(prevSnapshotPath) : '(Baseline - None)'}`);
  console.log(`  Added SKUs:           ${diffSummary.added}  (Green)`);
  console.log(`  Removed SKUs:         ${diffSummary.removed}  (Red + Strikethrough)`);
  console.log(`  Price Changed:        ${diffSummary.priceChanged}  (Amber)`);
  console.log(`  Attribute Changed:    ${diffSummary.attributeChanged}  (Blue)`);
  console.log(`  Price & Attr Changed: ${diffSummary.priceAndAttributeChanged}  (Purple)`);
  console.log(`  Unchanged SKUs:       ${diffSummary.unchanged}`);
  console.log(`  Total Discontinued:   ${diffSummary.discontinuedTotal}`);
  console.log(`  Snapshot Saved:       ${path.basename(currentSnapshotPath)}`);

  return { enrichedCatalog: catalogData, diffSummary, prevSnapshotPath };
}

module.exports = { processCatalogDiff, parsePrice };
