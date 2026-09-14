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

function isSuspectedDateParsePrice(price) {
  if (!price || price <= 10000) return false;
  const s = String(Math.round(price));
  // Matches dates parsed as numbers: DDMMYYYY, DMMYYYY, or YYYYMMDD
  return /^(0?[1-9]|[12][0-9]|3[01])(0?[1-9]|1[012])(20\d\d)$/.test(s) ||
         /^(20\d\d)(0[1-9]|1[012])(0[1-9]|[12][0-9]|3[01])$/.test(s);
}

function sanitizePriceTrail(trail, options = {}) {
  const byDate = new Map();
  for (const rawEvent of Array.isArray(trail) ? trail : []) {
    const event = { ...rawEvent, price: parsePrice(rawEvent?.price) };
    const existing = byDate.get(event.date);
    if (!existing || STATUS_PRIORITY.indexOf(event.status) >= STATUS_PRIORITY.indexOf(existing.status)) {
      byDate.set(event.date, event);
    }
  }
  const events = [...byDate.values()].sort((left, right) => String(left.date).localeCompare(String(right.date)));

  for (let index = 0; index < events.length; index++) {
    const event = events[index];
    if (!(event.price > 0)) continue;

    const previous = [...events.slice(0, index)].reverse().find(item => item.price > 0 && !item.quarantined);
    const next = events.slice(index + 1).find(item => item.price > 0 && !item.quarantined);
    const suspectedDate = isSuspectedDateParsePrice(event.price);

    if (previous && next) {
      const neighborsAgree = Math.max(previous.price, next.price) / Math.min(previous.price, next.price) <= 1.2;
      const isolatedSpike = event.price / Math.max(previous.price, next.price) >= 10;
      const isolatedCollapse = Math.min(previous.price, next.price) / event.price >= 10;

      if (neighborsAgree && (isolatedSpike || isolatedCollapse || suspectedDate)) {
        event.quarantined = true;
        event.validationState = suspectedDate
          ? 'SUSPECTED_DATE_PARSE'
          : (isolatedSpike ? 'ANOMALOUS_PRICE_SPIKE' : 'ANOMALOUS_PRICE_COLLAPSE');
        event.effectivePrice = previous.price;
        event.anomalyProvenance = {
          observedPrice: event.price,
          suspectedReason: suspectedDate
            ? 'Date parsed as price integer'
            : (isolatedSpike ? 'Isolated 10x spike between similar neighbors' : 'Isolated 10x collapse between similar neighbors'),
          neighborBefore: { date: previous.date, price: previous.price },
          neighborAfter: { date: next.date, price: next.price },
          suggestedCorrection: previous.price,
          ratio: isolatedSpike
            ? parseFloat((event.price / Math.max(previous.price, next.price)).toFixed(2))
            : (isolatedCollapse ? parseFloat((Math.min(previous.price, next.price) / event.price).toFixed(2)) : null)
        };
      } else if (!event.validationState) {
        event.validationState = 'VALIDATED';
      }
    } else {
      if (suspectedDate && event.price > 100000) {
        event.quarantined = true;
        event.validationState = 'SUSPECTED_DATE_PARSE';
        event.anomalyProvenance = {
          observedPrice: event.price,
          suspectedReason: 'Date parsed as price integer'
        };
      } else if (!event.validationState) {
        event.validationState = 'VALIDATED';
      }
    }
  }

  // Non-destructive: preserve all events unless explicitly requested otherwise
  if (options.excludeQuarantined) {
    return events.filter(e => !e.quarantined);
  }
  return events;
}

/**
 * Build a human-readable price trail string.
 * Uses last non-zero, non-quarantined price for arrow direction to avoid noise.
 */
function buildTrailString(trail) {
  if (!trail || trail.length === 0) return '';
  let lastNonZeroPrice = null;
  return trail.map((h) => {
    let arrow = '';
    if (h.status.includes('PRICE') && lastNonZeroPrice !== null && h.price > 0 && !h.quarantined) {
      arrow = h.price > lastNonZeroPrice ? ' (▲)' : ' (▼)';
    }
    if (h.quarantined) {
      arrow = ' (⚠ ANOMALY)';
    } else if (h.status === 'REMOVED') {
      arrow = ' (✕ REMOVED)';
    } else if (h.status === 'REINSTATED') {
      arrow = ' (↩ REINSTATED)';
    } else if (h.status === 'CATEGORY_MIGRATED') {
      arrow = ' (⇋ MIGRATED)';
    }
    if (h.price > 0 && !h.quarantined) lastNonZeroPrice = h.price;
    const priceStr = h.price > 0 ? `$${h.price.toFixed(2)}` : '(no price)';
    return `${h.date}: ${priceStr}${arrow}`;
  }).join(' → ');
}

function attributeEventKey(event) {
  return [
    event.date || event.timestamp || '', event.productNumber || event.sku || '', event.chassis || '',
    event.mainCategory || '', event.subCategory || '', event.field || event.attribute || '',
    event.oldValue ?? '', event.newValue ?? ''
  ].map(value => String(value).trim()).join('\u001f');
}

function dedupeAttributeHistory(history) {
  const seen = new Set();
  return (Array.isArray(history) ? history : []).filter(event => {
    const key = attributeEventKey(event);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function firstAttributeValue(item, keys) {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      if (typeof value === 'object') {
        const sorted = Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));
        return JSON.stringify(sorted);
      }
      return String(value).trim();
    }
  }
  return '';
}

function isRemovalTombstone(sku) {
  return String(sku?.['Diff Status'] || '').toUpperCase() === 'REMOVED' ||
    /^\[REMOVED SKU\]/i.test(String(sku?.Description || sku?.description || ''));
}

const TRACKED_ATTRIBUTES = [
  { keys: ['Description', 'description'], label: 'Description' },
  { keys: ['Constraint Text'], label: 'Constraint' },
  { keys: ['Table Rule/Note'], label: 'Rule/Note' },
  { keys: ['Subcategory Max Qty'], label: 'Max Qty' },
  { keys: ['Component Role'], label: 'Component Role' },
  { keys: ['Option Type', 'optionType'], label: 'Option Type' },
  { keys: ['HPE Recommended'], label: 'HPE Recommended' },
  { keys: ['Start Date'], label: 'Start Date' },
  { keys: ['Discontinued Date'], label: 'Discontinued Date' },
  { keys: ['Lifecycle Status', 'CLIC Status', 'lifecycleStatus'], label: 'Lifecycle Status' },
  { keys: ['Lifecycle Badge', 'lifecycleBadge'], label: 'Lifecycle Badge' },
  { keys: ['Availability', 'Supply Status'], label: 'Availability' },
  { keys: ['Lead Time', 'estimatedDelivery'], label: 'Lead Time' },
  { keys: ['Lead Time Source'], label: 'Lead Time Source' },
  { keys: ['vendorAttributes', 'Vendor Attributes'], label: 'Vendor Attributes' }
];

function recordAttributeDeltas(sku, prevSku, context, attributeHistory) {
  const deltas = [];
  for (const attr of TRACKED_ATTRIBUTES) {
    const currVal = firstAttributeValue(sku, attr.keys);
    const prevVal = firstAttributeValue(prevSku, attr.keys);
    if (currVal === prevVal || (!currVal && !prevVal)) continue;
    deltas.push({ field: attr.label, oldValue: prevVal || '(None)', newValue: currVal || '(None)' });
    attributeHistory.push({
      date: context.scrapeDate,
      productNumber: context.productNumber,
      chassis: context.chassis,
      mainCategory: context.mainCategory,
      subCategory: context.subCategory,
      field: attr.label,
      oldValue: prevVal,
      newValue: currVal
    });
  }
  return deltas;
}

function isBusinessRelevantDiscontinuedSku(options, existingEntry, context) {
  const explicitlyRelevant = typeof options.retainDiscontinuedSku === 'function' &&
    options.retainDiscontinuedSku(context) === true;
  return explicitlyRelevant || existingEntry?.businessRelevant === true ||
    Number(existingEntry?.dealReferenceCount || 0) > 0 || Number(existingEntry?.ruleReferenceCount || 0) > 0;
}

function resolvePreviousCatalogAndSkus(historyDir, snapshotPrefix, scrapeDate, options) {
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

  const prevSkuMap = new Map();
  const disallowedPreviousSkus = new Set();
  if (prevCatalog && Array.isArray(prevCatalog.entries)) {
    for (const entry of prevCatalog.entries) {
      for (const sku of entry.skus || []) {
        const pn = sku['Product #'];
        if (pn) {
          if (isRemovalTombstone(sku)) continue;
          if (options.previousSkuFilter && !options.previousSkuFilter({ entry, sku, productNumber: pn })) {
            disallowedPreviousSkus.add(pn);
            continue;
          }
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

  return { prevSnapshotPath, prevCatalog, prevSkuMap, disallowedPreviousSkus };
}

function buildCompanionSkuMap(options, historyLabel) {
  const companionSkuMap = new Map();
  if (options.companionCatalog && Array.isArray(options.companionCatalog.entries)) {
    for (const entry of options.companionCatalog.entries) {
      for (const sku of entry.skus || []) {
        const pn = sku['Product #'];
        if (pn && !isRemovalTombstone(sku)) {
          companionSkuMap.set(pn, {
            ...sku,
            parentCategory: entry.parentCategory || (historyLabel === 'services' ? 'Hardware' : 'Services'),
            subCategory: entry.subCategory || ''
          });
        }
      }
    }
  }
  return companionSkuMap;
}

function diffCurrentCatalogEntries(catalogData, prevCatalog, prevSkuMap, priceHistory, discontinuedRegistry, attributeHistory, scrapeDate, diffSummary) {
  const currSkuMap = new Map();

  for (const entry of catalogData.entries) {
    for (const sku of entry.skus || []) {
      const pn = sku['Product #'];
      if (!pn) continue;
      currSkuMap.set(pn, sku);

      if (isRemovalTombstone(sku)) {
        sku['Diff Status'] = 'REMOVED';
        continue;
      }

      const currPrice = parsePrice(sku['Unit Price (USD)'] || sku['Price (USD)'] || sku['Price'] || sku.price);

      if (!priceHistory[pn]) priceHistory[pn] = [];

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
        sku['Diff Status']               = 'BASELINE';
        sku['Previous List Price (USD)']  = 'N/A';
        sku['Price Change (USD)']         = '$0.00';
        sku['Price Change (%)']           = '0.00%';
        sku['Attribute Deltas']           = 'None';

        appendTrailEvent(priceHistory[pn], { date: scrapeDate, price: currPrice, status: 'BASELINE' });
        diffSummary.unchanged++;
      } else if (!prevSkuMap.has(pn)) {
        sku['Diff Status']               = 'ADDED';
        sku['Previous List Price (USD)']  = 'N/A';
        sku['Price Change (USD)']         = currPrice > 0 ? `+$${currPrice.toFixed(2)}` : '$0.00';
        sku['Price Change (%)']           = currPrice > 0 ? '+100.00%' : '0.00%';
        sku['Attribute Deltas']           = 'New SKU introduced';

        appendTrailEvent(priceHistory[pn], { date: scrapeDate, price: currPrice, status: 'ADDED' });
        diffSummary.added++;

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
        const prevSku   = prevSkuMap.get(pn);
        const prevPrice = parsePrice(prevSku['Unit Price (USD)'] || prevSku['Price (USD)'] || prevSku['Price'] || prevSku.price);
        sku['Previous List Price (USD)'] = prevPrice > 0 ? prevPrice.toFixed(2) : 'N/A';

        const attributeDeltas = recordAttributeDeltas(sku, prevSku, {
          scrapeDate,
          productNumber: pn,
          chassis: catalogData.metadata?.chassis || 'Chassis',
          mainCategory: entry.parentCategory || prevSku.parentCategory || '',
          subCategory: entry.subCategory || prevSku.subCategory || ''
        }, attributeHistory);

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
          if (priceHistory[pn].length === 0) {
            appendTrailEvent(priceHistory[pn], { date: scrapeDate, price: currPrice, status: 'BASELINE' });
          }
          diffSummary.unchanged++;
        }
      }

      sku['Price History Trail'] = buildTrailString(priceHistory[pn] || []);
    }
  }

  return currSkuMap;
}

function diffRemovedCatalogEntries(catalogData, prevSkuMap, currSkuMap, companionSkuMap, priceHistory, discontinuedRegistry, attributeHistory, scrapeDate, diffSummary, options) {
  for (const [pn, prevSku] of prevSkuMap.entries()) {
    if (currSkuMap.has(pn)) continue;

    if (companionSkuMap.has(pn)) {
      const compSku = companionSkuMap.get(pn);
      const compPrice = parsePrice(compSku['Unit Price (USD)'] || compSku['Price (USD)'] || compSku['Price'] || compSku.price);
      if (!priceHistory[pn]) priceHistory[pn] = [];
      appendTrailEvent(priceHistory[pn], {
        date: scrapeDate,
        price: compPrice,
        status: 'CATEGORY_MIGRATED',
        targetCategory: compSku.parentCategory
      });
      diffSummary.categoryMigrated++;

      recordAttributeDeltas({
        'Product #': pn,
        'Main Category': compSku.parentCategory,
        'Sub-Category': compSku.subCategory
      }, prevSku, {
        scrapeDate,
        productNumber: pn,
        chassis: catalogData.metadata?.chassis || 'Chassis',
        mainCategory: prevSku.parentCategory || '',
        subCategory: prevSku.subCategory || ''
      }, attributeHistory);

      continue;
    }

    const prevPrice = parsePrice(prevSku['Unit Price (USD)'] || prevSku['Price (USD)']);
    if (!priceHistory[pn]) priceHistory[pn] = [];

    const hadNonZeroPrice = priceHistory[pn].some(h => h.price > 0);
    if (!hadNonZeroPrice && prevPrice === 0) {
      continue;
    }

    appendTrailEvent(priceHistory[pn], { date: scrapeDate, price: prevPrice, status: 'REMOVED' });
    diffSummary.removed++;

    const trailStr = buildTrailString(priceHistory[pn]);
    const prevLifecycle = firstAttributeValue(prevSku, ['Lifecycle Status', 'CLIC Status', 'lifecycleStatus']) || '';
    const vendorDiscontinuedDate = firstAttributeValue(prevSku, ['Discontinued Date']);
    let removalReason = 'ABSENT_FROM_CATALOG';
    if (/OB|Obsolete|EOL|Discontinued/i.test(prevLifecycle)) {
      removalReason = 'VENDOR_OBSOLETE';
    } else if (vendorDiscontinuedDate && new Date(vendorDiscontinuedDate) <= new Date(scrapeDate)) {
      removalReason = 'SCHEDULED_END_DATE';
    }

    const existingEntry = discontinuedRegistry[pn];
    const businessRelevant = isBusinessRelevantDiscontinuedSku(options, existingEntry, {
      productNumber: pn, sku: prevSku, catalogData
    });
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
      removalReason,
      previousLifecycleStatus: prevLifecycle || 'Active',
      vendorDiscontinuedDate,
      trackingState:  'STOPPED_AFTER_REMOVAL',
      retentionClass: businessRelevant ? 'BUSINESS_RELEVANT' : 'COMPACT_LIFECYCLE_TOMBSTONE',
      businessRelevant,
      reason:         removalReason === 'VENDOR_OBSOLETE'
        ? 'Vendor marked obsolete/EOL in portal'
        : (removalReason === 'SCHEDULED_END_DATE'
          ? `Vendor scheduled end of life reached (${vendorDiscontinuedDate})`
          : 'Removed from active HPE OCA portal catalog')
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
      'Lifecycle Status':           prevSku['Lifecycle Status'] || prevSku.lifecycleStatus || 'Discontinued',
      'Lifecycle Badge':            prevSku['Lifecycle Badge'] || (String(prevSku['Lifecycle Status'] || '').includes('OB') ? 'OB' : 'DS'),
      'Availability':               prevSku['Availability'] || 'Discontinued',
      'Lead Time':                  prevSku['Lead Time'] || 'Not available (Discontinued)',
      'Lead Time Source':           prevSku['Lead Time Source'] || 'Catalog deprecation',
      'Vendor Attributes (JSON)':   prevSku['Vendor Attributes (JSON)'] || '{}',
      'Previous List Price (USD)':  prevPrice.toFixed(2),
      'Price Change (USD)':         prevPrice > 0 ? `-$${prevPrice.toFixed(2)}` : '$0.00',
      'Price Change (%)':           prevPrice > 0 ? '-100.00%' : '0.00%',
      'Attribute Deltas':           'SKU Discontinued & Tombstoned',
      'Price History Trail':        trailStr
    };

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

function computeCategoryPriceAnalytics(catalogData, scrapeDate) {
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

  Object.keys(categoryAnalytics).forEach(cat => {
    const c = categoryAnalytics[cat];
    c.avgPrice = c.totalSKUs > 0 ? (c.totalPrice / c.totalSKUs) : 0;
    if (c.minPrice === Infinity) c.minPrice = 0;
    Object.keys(c.subcategories).forEach(sub => {
      const s = c.subcategories[sub];
      s.avgPrice = s.totalSKUs > 0 ? (s.totalPrice / s.totalSKUs) : 0;
    });
  });

  return { scrapeDate, categoryBreakdown: categoryAnalytics };
}

/**
 * Perform diff calculation and history update.
 * @param {object} catalogData    - Structured catalog object from build_catalog.js
 * @param {string} historyDir     - Absolute path to history/ directory
 * @param {string} [historyLabel] - Optional label for snapshot prefix (default: 'catalog')
 *                                  Use 'services' when processing _Services.json
 * @returns {object} { enrichedCatalog, diffSummary, prevSnapshotPath }
 */
function processCatalogDiff(catalogData, historyDir, historyLabel = 'catalog', options = {}) {
  fs.mkdirSync(historyDir, { recursive: true });

  const scrapeDate          = formatDate(catalogData.metadata?.scrapeDate);
  const snapshotPrefix      = historyLabel === 'services' ? 'services_catalog' : 'catalog';
  const currentSnapshotPath = path.join(historyDir, `${snapshotPrefix}_${scrapeDate}.json`);
  const priceHistoryPath    = path.join(historyDir, `${historyLabel === 'services' ? 'services_' : ''}price_history.json`);
  const attributeHistoryPath = path.join(historyDir, `${historyLabel === 'services' ? 'services_' : ''}attribute_history.json`);
  const discontinuedSkusPath = path.join(historyDir, `${historyLabel === 'services' ? 'services_' : ''}discontinued_skus.json`);

  if (fs.existsSync(currentSnapshotPath)) {
    console.warn(`  ⚠️  [SAME-DAY RERUN] Snapshot ${path.basename(currentSnapshotPath)} already exists.`);
    console.warn(`      Previous run's snapshot will be replaced with this run's data.`);
  }

  let priceHistory = {};
  if (fs.existsSync(priceHistoryPath)) {
    try {
      priceHistory = JSON.parse(fs.readFileSync(priceHistoryPath, 'utf-8'));
      for (const [productNumber, trail] of Object.entries(priceHistory)) {
        priceHistory[productNumber] = sanitizePriceTrail(trail);
      }
    } catch (err) {
      console.warn(`  ⚠️ Warning: Corrupted ${path.basename(priceHistoryPath)}: ${err.message}`);
    }
  }

  const { prevSnapshotPath, prevCatalog, prevSkuMap, disallowedPreviousSkus } =
    resolvePreviousCatalogAndSkus(historyDir, snapshotPrefix, scrapeDate, options);

  const diffSummary = {
    added: 0,
    removed: 0,
    categoryMigrated: 0,
    priceChanged: 0,
    attributeChanged: 0,
    priceAndAttributeChanged: 0,
    unchanged: 0,
    reinstated: 0,
    discontinuedTotal: 0
  };

  const companionSkuMap = buildCompanionSkuMap(options, historyLabel);

  let attributeHistory = [];
  if (fs.existsSync(attributeHistoryPath)) {
    try {
      attributeHistory = JSON.parse(fs.readFileSync(attributeHistoryPath, 'utf-8'));
      attributeHistory = dedupeAttributeHistory(attributeHistory);
      if (disallowedPreviousSkus.size > 0) {
        attributeHistory = attributeHistory.filter(item => !disallowedPreviousSkus.has(item.productNumber || item.sku));
      }
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
  for (const pn of disallowedPreviousSkus) {
    delete priceHistory[pn];
    delete discontinuedRegistry[pn];
  }

  // 1. Process current entries & compute diffs
  const currSkuMap = diffCurrentCatalogEntries(
    catalogData, prevCatalog, prevSkuMap, priceHistory, discontinuedRegistry, attributeHistory, scrapeDate, diffSummary
  );

  // 2. Process REMOVED SKUs & Update Cumulative Discontinued Registry
  if (prevCatalog) {
    diffRemovedCatalogEntries(
      catalogData, prevSkuMap, currSkuMap, companionSkuMap, priceHistory, discontinuedRegistry, attributeHistory, scrapeDate, diffSummary, options
    );
  }

  diffSummary.discontinuedTotal = Object.values(discontinuedRegistry).filter(d => d.status === 'DISCONTINUED').length;

  // Save historical snapshot, price history, attribute history, and discontinued SKU registry atomically
  safeWriteJsonAtomic(currentSnapshotPath, catalogData);
  safeWriteJsonAtomic(priceHistoryPath, priceHistory);
  attributeHistory = dedupeAttributeHistory(attributeHistory);
  safeWriteJsonAtomic(attributeHistoryPath, attributeHistory);
  safeWriteJsonAtomic(discontinuedSkusPath, discontinuedRegistry);

  // Compute Category & Subcategory Price Variance Analytics
  catalogData.metadata.diffSummary       = diffSummary;
  catalogData.metadata.historySnapshot   = path.basename(currentSnapshotPath);
  catalogData.metadata.priceAnalytics    = computeCategoryPriceAnalytics(catalogData, scrapeDate);

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

module.exports = { processCatalogDiff, parsePrice, appendTrailEvent, dedupeAttributeHistory, sanitizePriceTrail };
