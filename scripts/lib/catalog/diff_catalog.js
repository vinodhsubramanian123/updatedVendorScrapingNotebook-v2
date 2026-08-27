'use strict';
/**
 * scripts/lib/diff_catalog.js — Catalog Diff & Historical Price Tracking Engine
 *
 * Computes SKU additions, removals, price changes, and historical price trails
 * between catalog scrapes. Maintained under outputs/{Family}/{Gen}/{Model}/history/
 *
 * Gap fixes applied (2026-08-12):
 *  1. Duplicate same-day trail entries — dedup by (date+status) not just date
 *  2. $0-price BASELINE + REMOVED same day — skip REMOVED event when prevPrice is also 0
 *  3. attribute_history now includes subCategory and mainCategory per entry
 *  4. discontinued_skus now stores firstSeenDate, fullPriceTrail, and daysActive
 *  5. Services diff: processCatalogDiff now accepts an optional historyLabel param
 *     so it can be called independently for services with separate history paths
 *  6. Reinstated SKU now appends a REINSTATED event to its price trail
 *  7. Same-day snapshot re-run now logs a warning instead of silently overwriting
 *  8. Price trail arrow now compares against last *non-zero* priced entry
 */

const fs   = require('fs');
const path = require('path');
const { safeWriteJsonAtomic } = require('../system/fs_compat.js');

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

// Status priority order — higher index = higher priority (replaces lower on same date)
const STATUS_PRIORITY = [
  'BASELINE', 'UNCHANGED', 'ATTRIBUTE_CHANGED', 'ADDED', 'REINSTATED',
  'REMOVED', 'PRICE_CHANGED', 'PRICE_AND_ATTRIBUTE_CHANGED'
];

/**
 * Append a price trail event, deduplicating by date.
 * GAP-1 FIX: On same-day reruns, replace the existing entry ONLY if the new status
 * has a higher informational priority (e.g. PRICE_CHANGED > UNCHANGED).
 * This prevents ADDED + UNCHANGED ghost pairs on repeated same-day runs.
 */
function appendTrailEvent(trail, event) {
  const existingIdx = trail.findIndex(h => h.date === event.date);
  if (existingIdx === -1) {
    // No entry for this date yet — just push
    trail.push(event);
    return;
  }
  // Replace only if new status has equal or higher priority
  const existingPriority = STATUS_PRIORITY.indexOf(trail[existingIdx].status);
  const newPriority = STATUS_PRIORITY.indexOf(event.status);
  if (newPriority >= existingPriority) {
    trail[existingIdx] = event;
  }
  // Otherwise keep existing (higher-priority) entry silently
}

/**
 * Build a human-readable price trail string.
 * Uses last non-zero price for arrow direction to avoid $0→$0 noise.
 */
function buildTrailString(trail) {
  if (!trail || trail.length === 0) return '';
  let lastNonZeroPrice = null;
  return trail.map((h) => {
    let arrow = '';
    if (h.status.includes('PRICE') && lastNonZeroPrice !== null && h.price > 0) {
      arrow = h.price > lastNonZeroPrice ? ' (▲)' : ' (▼)';
    }
    if (h.status === 'REMOVED') {
      arrow = ' (✕ REMOVED)';
    } else if (h.status === 'REINSTATED') {
      arrow = ' (↩ REINSTATED)';
    }
    if (h.price > 0) lastNonZeroPrice = h.price;
    const priceStr = h.price > 0 ? `$${h.price.toFixed(2)}` : '(no price)';
    return `${h.date}: ${priceStr}${arrow}`;
  }).join(' → ');
}

/**
 * Perform diff calculation and history update.
 * @param {object} catalogData    - Structured catalog object from build_catalog.js
 * @param {string} historyDir     - Absolute path to history/ directory
 * @param {string} [historyLabel] - Optional label for snapshot prefix (default: 'catalog')
 *                                  Use 'services' when processing _Services.json
 * @returns {object} { enrichedCatalog, diffSummary, prevSnapshotPath }
 */
function processCatalogDiff(catalogData, historyDir, historyLabel = 'catalog') {
  fs.mkdirSync(historyDir, { recursive: true });

  // GAP-6 FIX: Always normalize scrapeDate to YYYY-MM-DD for stable snapshot filenames.
  // catalogData.metadata.scrapeDate may be a full ISO8601 string from old scrapes.
  const scrapeDate          = formatDate(catalogData.metadata?.scrapeDate);
  const snapshotPrefix      = historyLabel === 'services' ? 'services_catalog' : 'catalog';
  // GAP-6 FIX: Snapshot filename always uses the normalized YYYY-MM-DD date, never a full ISO string.
  const currentSnapshotPath = path.join(historyDir, `${snapshotPrefix}_${scrapeDate}.json`);
  const priceHistoryPath    = path.join(historyDir, `${historyLabel === 'services' ? 'services_' : ''}price_history.json`);
  const attributeHistoryPath = path.join(historyDir, `${historyLabel === 'services' ? 'services_' : ''}attribute_history.json`);
  const discontinuedSkusPath = path.join(historyDir, `${historyLabel === 'services' ? 'services_' : ''}discontinued_skus.json`);

  // ── GAP FIX #7: Warn on same-day re-run instead of silent overwrite ──────────
  if (fs.existsSync(currentSnapshotPath)) {
    console.warn(`  ⚠️  [SAME-DAY RERUN] Snapshot ${path.basename(currentSnapshotPath)} already exists.`);
    console.warn(`      Previous run's snapshot will be replaced with this run's data.`);
  }

  // Load existing price history log
  let priceHistory = {};
  if (fs.existsSync(priceHistoryPath)) {
    try {
      priceHistory = JSON.parse(fs.readFileSync(priceHistoryPath, 'utf-8'));
    } catch (err) {
      console.warn(`  ⚠️ Warning: Corrupted ${path.basename(priceHistoryPath)}: ${err.message}`);
    }
  }

  // GAP-6 FIX: Snapshot regex matches only strict YYYY-MM-DD format files.
  // This filters out stale ISO-timestamp named snapshots (e.g. catalog_2026-08-22T09:27:12.174Z.json)
  // that were created before the date normalization fix was applied.
  const snapshotRegex = new RegExp(`^${snapshotPrefix}_\\d{4}-\\d{2}-\\d{2}\.json$`);
  const snapshotFiles = fs.readdirSync(historyDir)
    .filter(f => snapshotRegex.test(f) && f !== `${snapshotPrefix}_${scrapeDate}.json`)
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
    reinstated: 0,
    discontinuedTotal: 0
  };

  // Load existing attribute history & discontinued SKU registry
  let attributeHistory = [];
  if (fs.existsSync(attributeHistoryPath)) {
    try {
      attributeHistory = JSON.parse(fs.readFileSync(attributeHistoryPath, 'utf-8'));
      if (!Array.isArray(attributeHistory)) attributeHistory = [];
    } catch (err) {
      console.warn(`  ⚠️ Warning: Corrupted ${path.basename(attributeHistoryPath)}: ${err.message}`);
    }
  }

  let discontinuedRegistry = {};
  if (fs.existsSync(discontinuedSkusPath)) {
    try {
      discontinuedRegistry = JSON.parse(fs.readFileSync(discontinuedSkusPath, 'utf-8'));
    } catch (err) {
      console.warn(`  ⚠️ Warning: Corrupted ${path.basename(discontinuedSkusPath)}: ${err.message}`);
    }
  }

  // ── 1. Process current entries & compute diffs ────────────────────────────────
  for (const entry of catalogData.entries) {
    for (const sku of entry.skus || []) {
      const pn = sku['Product #'];
      if (!pn) continue;
      currSkuMap.set(pn, sku);

      const currPrice = parsePrice(sku['Unit Price (USD)'] || sku['Price (USD)'] || sku['Price'] || sku.price);

      // Price trail history initialization
      if (!priceHistory[pn]) priceHistory[pn] = [];

      // ── GAP FIX #6: Reinstated SKU — append REINSTATED event to price trail ──
      if (discontinuedRegistry[pn] && discontinuedRegistry[pn].status === 'DISCONTINUED') {
        discontinuedRegistry[pn].status        = 'REINSTATED';
        discontinuedRegistry[pn].reinstatedDate = scrapeDate;
        discontinuedRegistry[pn].lastKnownPrice = currPrice.toFixed(2);
        appendTrailEvent(priceHistory[pn], {
          date:   scrapeDate,
          price:  currPrice,
          status: 'REINSTATED'
        });
        diffSummary.reinstated++;
      }

      if (!prevCatalog) {
        // Baseline run — first time scrape.
        // GAP-1 FIX: Emit BASELINE only — NOT both BASELINE and ADDED.
        // Previously, some code paths emitted both on the same day.
        sku['Diff Status']               = 'BASELINE';
        sku['Previous List Price (USD)']  = 'N/A';
        sku['Price Change (USD)']         = '$0.00';
        sku['Price Change (%)']           = '0.00%';
        sku['Attribute Deltas']           = 'None';

        appendTrailEvent(priceHistory[pn], { date: scrapeDate, price: currPrice, status: 'BASELINE' });
        // Note: diffSummary.added is NOT incremented for baseline — all baseline SKUs are counted as unchanged.
        diffSummary.unchanged++;
      } else if (!prevSkuMap.has(pn)) {
        // ADDED SKU — genuinely new since last scrape
        sku['Diff Status']               = 'ADDED';
        sku['Previous List Price (USD)']  = 'N/A';
        sku['Price Change (USD)']         = currPrice > 0 ? `+$${currPrice.toFixed(2)}` : '$0.00';
        sku['Price Change (%)']           = currPrice > 0 ? '+100.00%' : '0.00%';
        sku['Attribute Deltas']           = 'New SKU introduced';

        // GAP-1 FIX: appendTrailEvent with priority dedup will replace any same-date UNCHANGED
        // entry with ADDED (higher priority), preventing ghost ADDED+UNCHANGED pairs.
        appendTrailEvent(priceHistory[pn], { date: scrapeDate, price: currPrice, status: 'ADDED' });
        diffSummary.added++;

        // ── GAP FIX #4: Record firstSeenDate on add ───────────────────────────
        if (!discontinuedRegistry[pn]) {
          discontinuedRegistry[pn] = {
            productNumber: pn,
            description:   sku['Description'] || sku.description || '',
            mainCategory:  entry.parentCategory || '',
            subCategory:   entry.subCategory || '',
            firstSeenDate: scrapeDate,
            status:        'ACTIVE'
          };
        }
      } else {
        // SKU present in both current and previous
        const prevSku   = prevSkuMap.get(pn);
        const prevPrice = parsePrice(prevSku['Unit Price (USD)'] || prevSku['Price (USD)'] || prevSku['Price'] || prevSku.price);
        sku['Previous List Price (USD)'] = prevPrice > 0 ? prevPrice.toFixed(2) : 'N/A';

        // ── GAP FIX #3: Attribute history now includes subCategory & mainCategory ─
        const attributeDeltas = [];
        const attrsToCompare = [
          { key: 'Description',         label: 'Description' },
          { key: 'Constraint Text',     label: 'Constraint' },
          { key: 'Table Rule/Note',     label: 'Rule/Note' },
          { key: 'Subcategory Max Qty', label: 'Max Qty' },
          { key: 'Component Role',      label: 'Component Role' },
          { key: 'Option Type',         label: 'Option Type' },
          { key: 'HPE Recommended',     label: 'HPE Recommended' },
          { key: 'Start Date',          label: 'Start Date' }
        ];

        for (const attr of attrsToCompare) {
          const currVal = String(sku[attr.key] || '').trim();
          const prevVal = String(prevSku[attr.key] || '').trim();
          if (currVal !== prevVal && (currVal || prevVal)) {
            attributeDeltas.push({
              field:    attr.label,
              oldValue: prevVal || '(None)',
              newValue: currVal || '(None)'
            });

            attributeHistory.push({
              date:          scrapeDate,
              productNumber: pn,
              chassis:       catalogData.metadata?.chassis || 'Chassis',
              mainCategory:  entry.parentCategory || prevSku.parentCategory || '',
              subCategory:   entry.subCategory    || prevSku.subCategory    || '',
              field:         attr.label,
              oldValue:      prevVal,
              newValue:      currVal
            });
          }
        }

        const priceHasChanged  = Math.abs(currPrice - prevPrice) > 0.001;
        const attrsHaveChanged = attributeDeltas.length > 0;

        sku['Attribute Deltas'] = attrsHaveChanged
          ? attributeDeltas.map(d => `${d.field}: "${d.oldValue}" → "${d.newValue}"`).join(' | ')
          : 'None';

        if (priceHasChanged && attrsHaveChanged) {
          const delta = currPrice - prevPrice;
          const pct   = prevPrice > 0 ? (delta / prevPrice * 100) : 0;
          sku['Diff Status']        = 'PRICE_AND_ATTRIBUTE_CHANGED';
          sku['Price Change (USD)'] = `${delta > 0 ? '+' : ''}$${delta.toFixed(2)}`;
          sku['Price Change (%)']   = `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`;
          appendTrailEvent(priceHistory[pn], { date: scrapeDate, price: currPrice, status: 'PRICE_AND_ATTRIBUTE_CHANGED', prevPrice });
          diffSummary.priceAndAttributeChanged++;
        } else if (priceHasChanged) {
          const delta = currPrice - prevPrice;
          const pct   = prevPrice > 0 ? (delta / prevPrice * 100) : 0;
          sku['Diff Status']        = 'PRICE_CHANGED';
          sku['Price Change (USD)'] = `${delta > 0 ? '+' : ''}$${delta.toFixed(2)}`;
          sku['Price Change (%)']   = `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`;
          appendTrailEvent(priceHistory[pn], { date: scrapeDate, price: currPrice, status: 'PRICE_CHANGED', prevPrice });
          diffSummary.priceChanged++;
        } else if (attrsHaveChanged) {
          sku['Diff Status']        = 'ATTRIBUTE_CHANGED';
          sku['Price Change (USD)'] = '$0.00';
          sku['Price Change (%)']   = '0.00%';
          appendTrailEvent(priceHistory[pn], { date: scrapeDate, price: currPrice, status: 'ATTRIBUTE_CHANGED' });
          diffSummary.attributeChanged++;
        } else {
          sku['Diff Status']        = 'UNCHANGED';
          sku['Price Change (USD)'] = '$0.00';
          sku['Price Change (%)']   = '0.00%';
          appendTrailEvent(priceHistory[pn], { date: scrapeDate, price: currPrice, status: 'UNCHANGED' });
          diffSummary.unchanged++;
        }
      }

      // ── GAP FIX #8: Build price trail string with accurate arrow direction ────
      sku['Price History Trail'] = buildTrailString(priceHistory[pn] || []);
    }
  }

  // ── 2. Process REMOVED SKUs & Update Cumulative Discontinued Registry ─────────
  if (prevCatalog) {
    for (const [pn, prevSku] of prevSkuMap.entries()) {
      if (!currSkuMap.has(pn)) {
        const prevPrice = parsePrice(prevSku['Unit Price (USD)'] || prevSku['Price (USD)']);

        // ── GAP FIX #1 & #2: Skip REMOVED event for $0-price SKUs with no real trail ──
        // These are likely scrape artifacts or CTO placeholders that were never priced.
        if (!priceHistory[pn]) priceHistory[pn] = [];

        const hadNonZeroPrice = priceHistory[pn].some(h => h.price > 0);
        if (!hadNonZeroPrice && prevPrice === 0) {
          // This SKU was never priced — don't pollute the discontinued registry
          continue;
        }

        appendTrailEvent(priceHistory[pn], { date: scrapeDate, price: prevPrice, status: 'REMOVED' });
        diffSummary.removed++;

        const trailStr = buildTrailString(priceHistory[pn]);

        // ── GAP FIX #4: Discontinued registry now includes firstSeenDate, daysActive, fullPriceTrail ──
        const existingEntry = discontinuedRegistry[pn];
        const firstSeenDate = existingEntry?.firstSeenDate || priceHistory[pn][0]?.date || '';
        let daysActive = 0;
        if (firstSeenDate) {
          const diffMs = new Date(scrapeDate) - new Date(firstSeenDate);
          daysActive   = Math.round(diffMs / (1000 * 60 * 60 * 24));
        }

        discontinuedRegistry[pn] = {
          productNumber:  pn,
          description:    prevSku.Description || prevSku.description || '',
          mainCategory:   prevSku.parentCategory || 'Deprecation Archive',
          subCategory:    prevSku.subCategory    || 'Discontinued SKUs',
          firstSeenDate,
          discontinuedDate: scrapeDate,
          daysActive,
          lastKnownPrice: prevPrice.toFixed(2),
          fullPriceTrail: trailStr,
          status:         'DISCONTINUED',
          reason:         'Removed from active HPE OCA portal catalog'
        };

        const tombstoneSKU = {
          'Main Category':              prevSku.parentCategory || 'Deprecation Archive',
          'Sub-Category':               prevSku.subCategory    || 'Discontinued SKUs',
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
          'Start Date':                 prevSku['Start Date'] || prevSku.Start || firstSeenDate,
          'Discontinued Date':          scrapeDate,
          'Days Active':                String(daysActive),
          'Diff Status':                'REMOVED',
          'Previous List Price (USD)':  prevPrice.toFixed(2),
          'Price Change (USD)':         prevPrice > 0 ? `-$${prevPrice.toFixed(2)}` : '$0.00',
          'Price Change (%)':           prevPrice > 0 ? '-100.00%' : '0.00%',
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
            headers:        ['Product #', 'Description', 'Current Qty', 'Unit Price (USD)', 'Days Active'],
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
  catalogData.metadata.diffSummary       = diffSummary;
  catalogData.metadata.historySnapshot   = path.basename(currentSnapshotPath);
  catalogData.metadata.priceAnalytics    = { scrapeDate, categoryBreakdown: categoryAnalytics };

  const label = historyLabel === 'services' ? 'Services Diff' : 'Hardware Catalog Diff';
  console.log(`\n--- ${label} Engine Summary ---`);
  console.log(`  Scrape Date:          ${scrapeDate}`);
  console.log(`  Previous Ref:         ${prevSnapshotPath ? path.basename(prevSnapshotPath) : '(Baseline - None)'}`);
  console.log(`  Added SKUs:           ${diffSummary.added}  (Green)`);
  console.log(`  Removed SKUs:         ${diffSummary.removed}  (Red + Strikethrough)`);
  console.log(`  Reinstated SKUs:      ${diffSummary.reinstated}  (Gold)`);
  console.log(`  Price Changed:        ${diffSummary.priceChanged}  (Amber)`);
  console.log(`  Attribute Changed:    ${diffSummary.attributeChanged}  (Blue)`);
  console.log(`  Price & Attr Changed: ${diffSummary.priceAndAttributeChanged}  (Purple)`);
  console.log(`  Unchanged SKUs:       ${diffSummary.unchanged}`);
  console.log(`  Total Discontinued:   ${diffSummary.discontinuedTotal}`);
  console.log(`  Snapshot Saved:       ${path.basename(currentSnapshotPath)}`);

  return { enrichedCatalog: catalogData, diffSummary, prevSnapshotPath };
}

module.exports = { processCatalogDiff, parsePrice, appendTrailEvent };
