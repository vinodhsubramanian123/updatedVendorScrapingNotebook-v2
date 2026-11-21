'use strict';

const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');
const { cleanBaseSKU, isValidHpeSKU } = require('./sku.js');
const { isRemovalTombstone } = require('./diff_catalog.js');
const { parseStrictPrice } = require('./field_parsers.js');
const { classifyComponentRole } = require('./product_meta.js');
const { extractCanonicalAttributes } = require('./attribute_vectors.js');

const PRICE_DRIFT_RE = /\b(?:(?:list\s+)?pric(?:e|es|ing)[ -]+(?:drifts?|changes?|movements?|increases?|decreases?|history|trends?)|pric(?:e|es|ing)\s+(?:changed|increased|decreased|went\s+up|went\s+down)|changes?\s+in\s+(?:list\s+)?pric(?:e|es|ing))\b/i;
const CATEGORY_TERMS = {
  Memory: /\b(?:memory|ram|[lr]?dimms?|mrdimms?|ddr[345])\b/i,
  CPU: /\b(?:cpus?|processors?|xeon|epyc)\b/i,
  GPU: /\b(?:gpus?|graphics|accelerators?|h100|h200|l40s|b200)\b/i,
  Drive: /\b(?:drives?|ssds?|hdds?|nvme\s*drives?|storage\s*media|edsff)\b/i,
  'Storage Controller': /\b(?:storage\s*controllers?|raid\s*controllers?|smart\s*array|tri[\s-]*mode|mr\d{3}i|sr\d{3}i)\b/i,
  'Boot Device': /\b(?:boot\s*devices?|ns204i|boss(?:-n1)?|m\.2\s*boot)\b/i,
  'Network Adapter': /\b(?:nics?|network\s*adapters?|ethernet\s*adapters?|ocp3?|infiniband|connectx)\b/i,
  'Fibre Channel HBA': /\b(?:fibre\s*channel|fc\s*hbas?|san\s*hbas?)\b/i,
  'Transceiver & Cable': /\b(?:transceivers?|optics?|sfp28|qsfp\d*|cables?|dac|aoc)\b/i,
  'Power Supply': /\b(?:power\s*suppl(?:y|ies)|psus?|flex\s*slot|power\s*cords?)\b/i,
  'Cooling / Thermal': /\b(?:cooling|fan\s*kits?|heatsinks?|heat\s*sinks?)\b/i,
  'Riser & Cage': /\b(?:risers?|drive\s*cages?|backplanes?)\b/i,
  'Rack & Rail': /\b(?:rail\s*kits?|racks?|bezels?)\b/i,
  'Software & Licensing': /\b(?:software|licens(?:e|ing)|ilo\s*advanced|compute\s*ops|greenlake|oneview|saas|vmware|rhel|windows\s*server)\b/i,
  'Support & Services': /\b(?:support|tech\s*care|foundation\s*care|pointnext|services?|warrant(?:y|ies)|installation)\b/i,
  'Base Chassis': /\b(?:base\s*chassis|chassis|server\s*chassis|cto\s*systems?)\b/i
};
const BROAD_CATEGORY_ALIASES = [
  { pattern: /\bstorage\b/i, targets: ['Drive', 'Storage Controller', 'Boot Device'] },
  { pattern: /\bnetworking\b/i, targets: ['Network Adapter', 'Fibre Channel HBA', 'Transceiver & Cable'] }
];
const ROLE_TO_DRIFT_CATEGORY = {
  Processor: 'CPU',
  Memory: 'Memory',
  'GPU / Accelerator': 'GPU',
  'Drive Cage / Drive': 'Drive',
  'Storage Controller': 'Storage Controller',
  'Boot Device': 'Boot Device',
  'Network Adapter': 'Network Adapter',
  'Fibre Channel HBA': 'Fibre Channel HBA',
  Transceiver: 'Transceiver & Cable',
  'Power Supply': 'Power Supply',
  'Cooling / Thermal': 'Cooling / Thermal',
  'Service & Support': 'Support & Services',
  Software: 'Software & Licensing',
  'Base Chassis': 'Base Chassis'
};
const SKU_RE = /\b(?:[A-Z0-9]{3,8}-[A-Z0-9]{3,4}|[A-Z0-9]{6}|[A-Z0-9]{5,8}AAE|[HURS][A-Z0-9]{4,11})\b/gi;
const REFERENCE_RE = /\b(?:above|those|these|them|same\s+(?:skus?|categories|components))\b/i;
const SNAPSHOT_RE = /^(catalog|services(?:_catalog)?)_(\d{4}-\d{2}-\d{2})\.json$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ACCESSORY_RE = /\b(?:settings?|blanks?|heatsinks?|heat sinks?|cables?|brackets?|risers?|air\s*baffles?|licenses?|software|gpu sw|gpu mode|graphics accessories|enablement)\b/i;

function requestedDirection(query) {
  const up = /\b(?:increases?|increased|went\s+up)\b/i.test(query);
  const down = /\b(?:decreases?|decreased|went\s+down)\b/i.test(query);
  if (up === down) return null;
  return up ? 'UP' : 'DOWN';
}

function parseDateWindow(query) {
  const text = String(query || '');
  const between = text.match(/\b(?:between|from)\s+(\d{4}-\d{2}-\d{2})\s+(?:and|to|through)\s+(\d{4}-\d{2}-\d{2})\b/i);
  if (between) {
    return { fromDate: between[1], toDate: between[2] };
  }
  const since = text.match(/\b(?:since|after|from)\s+(\d{4}-\d{2}-\d{2})\b/i);
  const until = text.match(/\b(?:before|until|through|up\s+to)\s+(\d{4}-\d{2}-\d{2})\b/i);
  if (since || until) {
    return { fromDate: since ? since[1] : null, toDate: until ? until[1] : null };
  }
  return null;
}

function _expandQueryCategories(query) {
  const matched = new Set(Object.keys(CATEGORY_TERMS).filter((category) => CATEGORY_TERMS[category].test(query)));
  for (const alias of BROAD_CATEGORY_ALIASES) {
    if (alias.pattern.test(query) && !alias.targets.some((t) => matched.has(t))) {
      alias.targets.forEach((t) => matched.add(t));
    }
  }
  return [...matched];
}

function parsePriceDriftQuery(query, previousScope) {
  if (!PRICE_DRIFT_RE.test(query)) return null;
  const limitMatch = query.match(/\b(?:last|latest|most\s+recent|top)\s+(\d+|one|two|three|four|five|ten)\b/i);
  const limitText = limitMatch?.[1].toLowerCase();
  const limitWords = { one: 1, two: 2, three: 3, four: 4, five: 5, ten: 10 };
  const limit = Math.min(50, Math.max(1, Number(limitText || 3) || limitWords[limitText] || 3));
  const categories = _expandQueryCategories(query);
  const skus = (query.match(SKU_RE) || []).filter(isValidHpeSKU).map(cleanBaseSKU);
  const dateWindow = parseDateWindow(query);
  const referencesEarlier = REFERENCE_RE.test(query) && categories.length === 0 && skus.length === 0;
  if (/\b(?:history|trends?)\b/i.test(query) && !limitMatch && !categories.length && !referencesEarlier && !dateWindow) return null;
  const scope = referencesEarlier ? previousScope : { categories, skus };
  return {
    limit,
    sort: /\b(?:biggest|largest|top)\b/i.test(query) ? 'MAGNITUDE' : 'RECENT',
    categories: Object.keys(CATEGORY_TERMS).filter((category) => Array.isArray(scope?.categories) && scope.categories.includes(category)),
    skus: [...new Set(Array.isArray(scope?.skus) ? scope.skus.slice(0, 100).filter(isValidHpeSKU).map(cleanBaseSKU) : [])],
    fromDate: dateWindow?.fromDate || null,
    toDate: dateWindow?.toDate || null,
    referencesEarlier,
    needsScope: referencesEarlier && !previousScope,
    direction: requestedDirection(query)
  };
}

function componentCategory(entry, row) {
  const parentCat = entry.parentCategory || row.parentCategory || '';
  const sub = entry.subCategory || row.subCategory || '';
  const desc = row.Description || row.description || '';
  const labels = `${parentCat} ${sub}`.trim();
  const canonical = extractCanonicalAttributes({ sku: row['Product #'] || row.sku, description: desc, category: labels });

  if (canonical.category === 'Software / Support / Services' || /\b(?:support|tech\s*care|foundation\s*care|pointnext|startup\s*svc)\b/i.test(`${labels} ${desc}`)) {
    return /\b(?:ilo|compute\s*ops|greenlake|oneview|saas|vmware|rhel|windows\s*server|license|subscription|software)\b/i.test(`${labels} ${desc}`)
      ? 'Software & Licensing'
      : 'Support & Services';
  }
  if (ACCESSORY_RE.test(sub) || ACCESSORY_RE.test(desc)) {
    if (/\b(?:cable|transceiver|sfp|qsfp|dac|aoc|cord)\b/i.test(`${sub} ${desc}`)) return 'Transceiver & Cable';
    if (/\b(?:heatsink|heat\s*sink|fan|baffle|thermal)\b/i.test(`${sub} ${desc}`)) return 'Cooling / Thermal';
    if (/\b(?:riser|cage|backplane)\b/i.test(`${sub} ${desc}`)) return 'Riser & Cage';
    if (/\b(?:software|license|gpu sw)\b/i.test(`${sub} ${desc}`)) return 'Software & Licensing';
    return 'Other';
  }
  // Accelerator descriptions and labels routinely include onboard memory capacity.
  if (CATEGORY_TERMS.GPU.test(labels)) return 'GPU';
  if (CATEGORY_TERMS.CPU.test(labels)) return 'CPU';
  if (CATEGORY_TERMS.Memory.test(labels)) return 'Memory';
  const role = classifyComponentRole(labels, desc, null);
  return ROLE_TO_DRIFT_CATEGORY[role] || 'Other';
}

function snapshotPrice(row) {
  const raw = row['List Price (USD)'] ?? row['Unit Price (USD)'] ?? row['Price (USD)'] ?? row.listPrice;
  const parsed = parseStrictPrice(raw, { row });
  // Unit prices at or below $1 are sentinel values in legacy hardware captures.
  return parsed.priceState === 'PRICED' && parsed.priceUsd > 1 ? parsed.priceUsd : null;
}

function readJSON(file, issues) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    issues.push({ source: file, code: error.code || 'INVALID_JSON' });
    return null;
  }
}

function readSnapshot(file, issues) {
  try {
    const bytes = fs.readFileSync(file);
    const data = JSON.parse(bytes.toString('utf8'));
    if (!Array.isArray(data?.entries)) throw new Error('INVALID_SNAPSHOT');
    return { data, hash: createHash('sha256').update(bytes).digest('hex') };
  } catch (error) {
    issues.push({ source: file, code: error.code || 'INVALID_SNAPSHOT' });
    return null;
  }
}

function addArchivedSnapshots(byKey, dir, issues) {
  try {
    for (const file of fs.readdirSync(dir)) {
      const match = file.match(SNAPSHOT_RE);
      if (match) {
        const kind = match[1] === 'catalog' ? 'catalog' : 'services';
        byKey.set(`${kind}:${match[2]}`, path.join(dir, file));
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') issues.push({ source: dir, code: error.code });
  }
}

function snapshotSources(catalog, issues) {
  const byKey = new Map();
  if (DATE_RE.test(catalog.scrapeDate || '')) {
    if (catalog.catalogJsonPath) byKey.set(`catalog:${catalog.scrapeDate}`, catalog.catalogJsonPath);
    const servicesPath = catalog.servicesJsonPath || path.join(catalog.catalogDir, `${catalog.id}_Services.json`);
    if (fs.existsSync(servicesPath)) byKey.set(`services:${catalog.scrapeDate}`, servicesPath);
  }
  addArchivedSnapshots(byKey, path.join(catalog.catalogDir, 'history'), issues);
  addArchivedSnapshots(byKey, path.join(catalog.catalogDir, 'services_history'), issues);
  return [...byKey].map(([key, source]) => {
    const [kind, date] = key.split(':');
    return { kind, date, source };
  }).sort((left, right) => left.date.localeCompare(right.date));
}

function readPriceTrail(catalog, issues) {
  const dir = catalog.catalogDir;
  const legacyServicesTrail = path.join(dir, 'history', 'services_price_history.json');
  const servicesTrail = path.join(dir, 'services_history', 'services_price_history.json');
  const trails = [
    ['catalog', path.join(dir, 'history', 'price_history.json')],
    ['services', fs.existsSync(servicesTrail) ? servicesTrail : legacyServicesTrail]
  ];
  const excluded = new Set();
  const recordedChanges = new Map();
  for (const [kind, file] of trails) {
    const history = fs.existsSync(file) ? readJSON(file, issues) : null;
    for (const [sku, events] of Object.entries(history || {})) {
      for (const event of Array.isArray(events) ? events : []) {
        const key = JSON.stringify([kind, cleanBaseSKU(sku), event?.date]);
        if (event?.quarantined || /ANOMAL|SUSPECT|REJECT|CONFLICT|PARSE_FAIL/i.test(event?.validationState || event?.status || '')) {
          excluded.add(key);
        } else if (/^PRICE_(?:AND_ATTRIBUTE_)?CHANGED$/.test(event?.status || '') &&
            Number.isFinite(event.price) && event.price > 1 && Number.isFinite(event.prevPrice) && event.prevPrice > 1) {
          recordedChanges.set(key, { price: event.price, source: file });
        }
      }
    }
  }
  return { excluded, recordedChanges };
}

function readSnapshotRows(data, request) {
  const rows = new Map();
  for (const entry of data.entries) {
    for (const row of entry.skus || []) {
      const sku = cleanBaseSKU(row['Product #'] || row.sku);
      if (!sku || isRemovalTombstone(row)) continue;
      if (request.skus.length && !request.skus.includes(sku)) continue;
      const category = componentCategory(entry, row);
      if (request.categories.length && !request.categories.includes(category)) continue;
      const price = snapshotPrice(row);
      if (price === null) continue;
      const existing = rows.get(sku);
      const observation = { sku, category: category || 'Other', price, description: row.Description || row.description || '' };
      if (!rows.has(sku)) rows.set(sku, observation);
      else if (existing?.price !== price) rows.set(sku, null);
    }
  }
  return rows;
}

function checkRecordedPrice(coverage, recorded, catalog, point) {
  if (!recorded || recorded.price === point.price) return;
  coverage.trailConflictCount++;
  if (coverage.trailConflictExamples.length < 10) {
    coverage.trailConflictExamples.push({ sku: point.sku, category: point.category, catalog: catalog.id, date: point.date,
      recordedPriceUsd: recorded.price, snapshotPriceUsd: point.price, trail: recorded.source, snapshot: point.source,
      snapshotSha256: point.hash });
  }
}

function addTimelinePoint(timelines, coverage, catalog, point) {
  if (!timelines.has(point.sku)) timelines.set(point.sku, new Map());
  const timeline = timelines.get(point.sku);
  if (!timeline.has(point.date)) {
    timeline.set(point.date, point);
    return;
  }
  const previous = timeline.get(point.date);
  if (!previous || previous.price === point.price) return;
  timeline.set(point.date, null);
  coverage.excludedObservations += 2;
  coverage.issues.push({ code: 'CONFLICTING_SAME_DAY_PRICES', catalog: catalog.id, sku: point.sku,
    date: point.date, sources: [previous.source, point.source] });
}

function collectTimelines(catalog, request, issues, coverage) {
  const timelines = new Map();
  const { excluded, recordedChanges } = readPriceTrail(catalog, issues);
  for (const { kind, date, source } of snapshotSources(catalog, issues)) {
    const snapshot = readSnapshot(source, issues);
    if (!snapshot) continue;
    coverage.snapshotsRead++;
    for (const [sku, row] of readSnapshotRows(snapshot.data, request)) {
      const key = JSON.stringify([kind, sku, date]);
      if (!row || excluded.has(key)) {
        coverage.excludedObservations++;
        continue;
      }
      const point = { ...row, date, source, hash: snapshot.hash };
      checkRecordedPrice(coverage, recordedChanges.get(key), catalog, point);
      addTimelinePoint(timelines, coverage, catalog, point);
    }
  }
  return new Map([...timelines].map(([sku, points]) => [sku, [...points.values()].filter(Boolean)]));
}

function isIsolatedOutlier(previous, current, next) {
  if (!previous || !next) return false;
  const low = Math.min(previous.price, next.price);
  const high = Math.max(previous.price, next.price);
  return high / low <= 1.2 && (current.price / high >= 10 || low / current.price >= 10);
}

function collectChanges(catalog, timelines, request, coverage) {
  const changes = [];
  for (const timeline of timelines.values()) {
    const stable = timeline.filter((current, i) => !isIsolatedOutlier(timeline[i - 1], current, timeline[i + 1]));
    coverage.excludedObservations += timeline.length - stable.length;
    for (let i = 1; i < stable.length; i++) {
      const current = stable[i];
      const previous = stable[i - 1];
      if (request.fromDate && current.date < request.fromDate) continue;
      if (request.toDate && current.date > request.toDate) continue;
      const delta = Number((current.price - previous.price).toFixed(2));
      if (!delta || (request.direction && request.direction !== (delta > 0 ? 'UP' : 'DOWN'))) continue;
      changes.push({
        sku: current.sku,
        category: current.category,
        description: current.description,
        previousPriceUsd: previous.price,
        currentPriceUsd: current.price,
        changeUsd: delta,
        changePct: Number((delta / previous.price * 100).toFixed(2)),
        lastOldPriceDate: previous.date,
        firstNewPriceDate: current.date,
        sources: [{ catalog: catalog.id, previousDate: previous.date, previousSnapshot: previous.source,
          previousSnapshotSha256: previous.hash, currentDate: current.date, currentSnapshot: current.source,
          currentSnapshotSha256: current.hash }]
      });
    }
  }
  return changes;
}

function consolidateChanges(changes) {
  const byTransition = new Map();
  for (const change of changes.sort((a, b) => a.firstNewPriceDate.localeCompare(b.firstNewPriceDate))) {
    const key = JSON.stringify([change.sku, change.previousPriceUsd, change.currentPriceUsd]);
    const groups = byTransition.get(key) || [];
    const source = change.sources[0];
    // Intersect (last old price, first new price] windows across distinct product catalogs.
    const group = groups.find(candidate => change.lastOldPriceDate < candidate.firstNewPriceDate &&
      candidate.lastOldPriceDate < change.firstNewPriceDate && !candidate.sources.some(s => s.catalog === source.catalog));
    if (group) {
      if (change.lastOldPriceDate > group.lastOldPriceDate) group.lastOldPriceDate = change.lastOldPriceDate;
      if (group.category === 'Other') group.category = change.category;
      group.sources.push(source);
    } else {
      groups.push(change);
      byTransition.set(key, groups);
    }
  }
  return [...byTransition.values()].flat().sort((a, b) =>
    b.firstNewPriceDate.localeCompare(a.firstNewPriceDate) || Math.abs(b.changeUsd) - Math.abs(a.changeUsd) ||
    a.sku.localeCompare(b.sku));
}

function findCatalogPriceDrifts(catalogs, request) {
  const issues = [];
  const coverage = { catalogsScanned: [], snapshotsRead: 0, excludedObservations: 0,
    trailConflictCount: 0, trailConflictExamples: [], issues };
  const changes = [];
  for (const catalog of catalogs) {
    coverage.catalogsScanned.push(catalog.id);
    const timelines = collectTimelines(catalog, request, issues, coverage);
    changes.push(...collectChanges(catalog, timelines, request, coverage));
  }
  const consolidated = consolidateChanges(changes);
  if (request.sort === 'MAGNITUDE') consolidated.sort((a, b) => Math.abs(b.changeUsd) - Math.abs(a.changeUsd));
  const groups = (request.categories.length ? request.categories : ['All']).map(category => {
    const matches = category === 'All' ? consolidated : consolidated.filter(change => change.category === category);
    return { category, totalChanges: matches.length, changes: matches.slice(0, request.limit) };
  });
  return { currency: 'USD', limit: request.limit, sort: request.sort, direction: request.direction, groups, coverage };
}

/**
 * Compare one or more SKUs across dated snapshots and multiple product catalogs.
 * @param {Array<object>} catalogs
 * @param {{ skus: string[], categories?: string[], fromDate?: string|null, toDate?: string|null, limit?: number }} request
 * @returns {object}
 */
function compareSkuTimelines(catalogs, request = {}) {
  const normalizedSkus = [...new Set((request.skus || []).map(cleanBaseSKU).filter(Boolean))];
  const issues = [];
  const coverage = { catalogsScanned: [], snapshotsRead: 0, excludedObservations: 0, trailConflictCount: 0, trailConflictExamples: [], issues };
  const normalizedRequest = {
    limit: request.limit || 20,
    sort: request.sort || 'RECENT',
    categories: request.categories || [],
    skus: normalizedSkus,
    fromDate: request.fromDate || null,
    toDate: request.toDate || null,
    direction: request.direction || null
  };
  const perSkuMap = new Map();
  const allDrifts = [];

  for (const catalog of catalogs) {
    coverage.catalogsScanned.push(catalog.id);
    const timelines = collectTimelines(catalog, normalizedRequest, issues, coverage);
    allDrifts.push(...collectChanges(catalog, timelines, normalizedRequest, coverage));
    for (const [sku, points] of timelines.entries()) {
      const filteredPoints = points.filter((p) => (
        (!normalizedRequest.fromDate || p.date >= normalizedRequest.fromDate)
        && (!normalizedRequest.toDate || p.date <= normalizedRequest.toDate)
      ));
      if (!filteredPoints.length) continue;
      if (!perSkuMap.has(sku)) perSkuMap.set(sku, { sku, description: filteredPoints[0].description, category: filteredPoints[0].category, timelinesByProduct: {} });
      perSkuMap.get(sku).timelinesByProduct[catalog.id] = filteredPoints;
    }
  }

  const comparisons = [...perSkuMap.values()].map((entry) => {
    const latestPrices = Object.entries(entry.timelinesByProduct).map(([product, pts]) => ({
      product,
      latestDate: pts[pts.length - 1].date,
      latestPriceUsd: pts[pts.length - 1].price,
      earliestPriceUsd: pts[0].price,
      deltaUsd: Number((pts[pts.length - 1].price - pts[0].price).toFixed(2))
    }));
    const nums = latestPrices.map((p) => p.latestPriceUsd);
    return {
      ...entry,
      latestByProduct: latestPrices,
      latestMinPriceUsd: nums.length ? Math.min(...nums) : null,
      latestMaxPriceUsd: nums.length ? Math.max(...nums) : null,
      latestSpreadUsd: nums.length ? Number((Math.max(...nums) - Math.min(...nums)).toFixed(2)) : null
    };
  });

  return {
    currency: 'USD',
    skus: normalizedSkus,
    dateWindow: { fromDate: normalizedRequest.fromDate, toDate: normalizedRequest.toDate },
    comparisons,
    drifts: consolidateChanges(allDrifts),
    coverage
  };
}

module.exports = { parsePriceDriftQuery, parseDateWindow, componentCategory, findCatalogPriceDrifts, compareSkuTimelines };
