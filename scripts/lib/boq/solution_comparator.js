'use strict';

/**
 * scripts/lib/boq/solution_comparator.js
 *
 * Phase 3A Multi-Product Solution Comparison Engine:
 * - Resolves 2–5 candidate platforms (explicitly named or auto-selected by pillar/requirements).
 * - Preserves unknown platforms in `unresolvedPlatforms` (never widened/substituted).
 * - Synthesizes a buildable candidate BOM per platform from that platform's own catalog,
 *   evaluates via canonical `evaluateBOQMultiAspect`, runs `scaling_interpolator.js`,
 *   and computes a null-preserving Pareto frontier via `computeParetoFrontier`.
 * - Enforces strict pricing integrity (`capexListUsd: null` & `pricingComplete: false` on any
 *   unpriced base/option SKU) and explicit `CATALOG_COVERAGE_GAP` surfacing.
 */

const fs = require('fs');
const { listAllCatalogs, getChassisMap, matchAlletraMpProducts } = require('../catalog/catalog_discovery.js');
const { resolveCatalogQueryScope } = require('../catalog/catalog_query_engine.js');
const { cleanBaseSKU, attachCompanionServices, classifyLifecycleState } = require('../catalog/sku.js');
const { parseStrictPrice, parseLeadTimeOrEta } = require('../catalog/field_parsers.js');
const { extractCanonicalAttributes } = require('../catalog/attribute_vectors.js');
const { evaluateBOQMultiAspect } = require('./boq_evaluator.js');
const {
  interpolateMemoryTopology,
  interpolateStorageTopology,
  computeHaClusterScalingCurve,
  interpolateAlletraMpEnvelope,
  computeNormalizedEfficiencyMetrics,
  computeCrossGenerationDeltas,
  analyzePriceTrendAnalytics
} = require('../conflict/sizing/scaling_interpolator.js');
const { computeParetoFrontier } = require('../conflict/sizing/pareto_ranker.js');

const ALLETRA_MP_IDS = new Set(['Alletra_MP_B10000', 'Alletra_MP_X10000']);
const FLAGSHIP_SERVER_ORDER = Object.freeze([
  'DL380_Gen12', 'DL385_Gen11', 'DL360_Gen12', 'DL380_Gen11', 'DL360_Gen11', 'DL380a_Gen12', 'DL580_Gen12', 'DL145_Gen11'
]);

const EXPLICIT_MODEL_TOKEN_RE = /\b((?:dl|ml|bl|rl|sy|sn|gx|msl)\s*\d{2,5}[a-z]?|synergy\s*\d{3,5}|alletra(?:\s+storage)?(?:\s+mp)?\s*(?:[bx]\d{4,5}[a-z]?|10k|\d{4})|[bx]10\d{3}|[a-z][a-z0-9-]{2,}\s+gen\s*\d{1,2})\b(?:\s*(?:gen\s*|g)(\d{1,2}))?/gi;

function _round(value, decimals = 2) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function _normalizeKey(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function _parseRowPrice(skuRow, desc) {
  const fields = [
    skuRow?.['List Price (USD)'],
    skuRow?.['Unit Price (USD)'],
    skuRow?.['Price (USD)'],
    skuRow?.listPrice,
    skuRow?.unitPriceUsd
  ];
  for (const raw of fields) {
    if (raw === undefined || raw === null || String(raw).trim() === '') continue;
    const parsed = parseStrictPrice(raw, { row: skuRow, description: desc });
    if (parsed.priceState === 'PRICED' && Number.isFinite(parsed.priceUsd)) {
      return { priceUsd: parsed.priceUsd, priceState: 'PRICED' };
    }
    return { priceUsd: null, priceState: parsed.priceState || 'UNPRICED' };
  }
  return { priceUsd: null, priceState: 'UNPRICED' };
}

function _isActiveRow(skuRow, sku, desc) {
  if (/^\[REMOVED\s+SKU\]/i.test(String(desc || '').trim())) return false;
  const lc = classifyLifecycleState(
    skuRow?.['Lifecycle Status'] || skuRow?.lifecycleStatus || skuRow?.Status,
    skuRow?.['Diff Status'] || skuRow?.diffStatus,
    sku,
    desc,
    skuRow?.vendorSupplyStatus
  );
  return !lc.isBlockedForProduction && !lc.isConstrainedSupply;
}

function _inferPillarFromId(catId, idLower) {
  if (ALLETRA_MP_IDS.has(catId) || idLower.startsWith('alletra')) return 'Storage';
  if (idLower.startsWith('sn3600') || idLower.includes('_fc')) return 'Networking';
  if (idLower.startsWith('msl')) return 'Archive';
  if (idLower.startsWith('sy')) return 'Composable';
  return 'Server';
}

function _inferPlatformMeta(cat, chassisMap) {
  const entry = chassisMap[cat.id] || {};
  const idLower = String(cat.id || '').toLowerCase();
  const pillar = _inferPillarFromId(cat.id, idLower);
  const genMatch = String(entry.gen || cat.gen || cat.id || '').match(/Gen\s*(\d+)/i);
  const generation = genMatch ? `Gen${genMatch[1]}` : (entry.gen || cat.gen || null);
  const defaultU = idLower.includes('dl360') ? 1 : (idLower.includes('dl580') ? 4 : 2);
  const defaultSockets = /dl145|dl325/i.test(cat.id) ? 1 : (/dl580/i.test(cat.id) ? 4 : 2);
  const defaultBays = /dl360/i.test(cat.id) ? 10 : (/dl145/i.test(cat.id) ? 6 : 24);
  return {
    platform: cat.id,
    model: entry.model || cat.chassis || cat.id.replace(/_/g, ' '),
    family: entry.family || cat.family || (pillar === 'Storage' ? 'Alletra' : 'ProLiant'),
    generation,
    pillar,
    uHeight: Number.isFinite(entry.uHeight) ? entry.uHeight : defaultU,
    baseSku: entry.baseSku || cat.baseSku || null,
    channelsPerSocket: /dl385|dl325|dl345|dl145/i.test(cat.id) ? 12 : 8,
    maxSockets: defaultSockets,
    maxBays: defaultBays
  };
}

function _extractRamAndStorageFromText(text) {
  const ramTbMatch = text.match(/\b(\d+(?:\.\d+)?)\s*TB\s*(?:of\s+)?(?:ram|memory)\b/i);
  const ramGbMatch = text.match(/\b(\d+(?:\.\d+)?)\s*GB\s*(?:of\s+)?(?:ram|memory)\b/i);
  const ramGb = ramTbMatch ? Math.round(Number(ramTbMatch[1]) * 1024)
    : (ramGbMatch ? Math.round(Number(ramGbMatch[1])) : null);

  const storageTbMatch = text.match(/\b(\d+(?:\.\d+)?)\s*TB\s*(?:usable\s*)?(?:nvme|sas|sata|ssd|hdd|flash|storage|raw|raid|drives?)?\b/i);
  let usableTb = null;
  if (storageTbMatch && !/ram|memory/i.test(storageTbMatch[0])) {
    usableTb = Number(storageTbMatch[1]);
  }
  return { ramGb, usableTb };
}

function _extractSpecFromQueryText(rawText) {
  const text = String(rawText || '').trim();
  const { ramGb, usableTb } = _extractRamAndStorageFromText(text);
  const matchNum = (re) => {
    const m = text.match(re);
    return m ? Number(m[1]) : null;
  };
  const raidMatch = text.match(/\b(RAID\s*6[\s-]*ADG|RAID\s*(?:10|0|1|5|6)|vSAN(?:[\s_-]*RAID[56])?)\b/i);
  const protoMatch = text.match(/\b(NVMe|SAS|SATA)\b/i);
  const haMatch = text.match(/\b(2N|N\+1)\b/i);
  return {
    queryText: text,
    platforms: [],
    cores: matchNum(/\b(\d{1,3})\s*(?:cpu\s*)?cores?\b/i),
    ramGb,
    usableTb,
    raidLevel: raidMatch ? raidMatch[1].replace(/\s+/g, '').toUpperCase() : 'RAID5',
    hotSpares: matchNum(/\b(\d+)\s*hot\s*spares?\b/i) ?? 0,
    driveProtocol: protoMatch ? protoMatch[1].toUpperCase() : null,
    nicSpeedGbps: matchNum(/\b(\d{1,3})\s*GbE\b/i),
    nodeCount: Math.max(1, matchNum(/\b(\d+)\s*(?:nodes?|servers?)\b/i) ?? 1),
    haPolicy: haMatch ? haMatch[1].toUpperCase() : 'N+1',
    pillar: /\balletra|storage\s+array|san\b/i.test(text) ? 'Storage' : 'Server',
    preferredUHeight: matchNum(/\b([124])U\b/i),
    targetDriveCount: matchNum(/\b(\d+)\s*(?:nvme|sas|sata)?\s*drives?\b/i)
  };
}

function _mergeSpecField(primary, alt, fallback, defaultVal) {
  if (primary !== undefined && primary !== null) return primary;
  if (alt !== undefined && alt !== null) return alt;
  if (fallback !== undefined && fallback !== null) return fallback;
  return defaultVal;
}

/**
 * Extract structured sizing & comparison requirements from either a natural language query or spec object.
 * @param {string|object} specOrQuery
 * @returns {object}
 */
function extractComparisonSpec(specOrQuery) {
  if (!specOrQuery || typeof specOrQuery !== 'object') {
    return _extractSpecFromQueryText(specOrQuery);
  }
  const queryText = typeof specOrQuery.query === 'string' ? specOrQuery.query : '';
  const base = queryText ? _extractSpecFromQueryText(queryText) : _extractSpecFromQueryText('');
  return {
    queryText,
    platforms: Array.isArray(specOrQuery.platforms) ? specOrQuery.platforms : base.platforms,
    cores: _mergeSpecField(specOrQuery.cores, specOrQuery.targetCores, base.cores, null),
    ramGb: _mergeSpecField(specOrQuery.ramGb, specOrQuery.targetRamGb, base.ramGb, null),
    usableTb: _mergeSpecField(specOrQuery.usableTb, specOrQuery.targetUsableTb, base.usableTb, null),
    raidLevel: _mergeSpecField(specOrQuery.raidLevel, null, base.raidLevel, 'RAID5'),
    hotSpares: _mergeSpecField(specOrQuery.hotSpares, null, base.hotSpares, 0),
    driveProtocol: _mergeSpecField(specOrQuery.driveProtocol, null, base.driveProtocol, null),
    nicSpeedGbps: _mergeSpecField(specOrQuery.nicSpeedGbps, null, base.nicSpeedGbps, null),
    nodeCount: _mergeSpecField(specOrQuery.nodeCount, specOrQuery.nodes, base.nodeCount, 1),
    haPolicy: _mergeSpecField(specOrQuery.haPolicy, null, base.haPolicy, 'N+1'),
    pillar: _mergeSpecField(specOrQuery.pillar, null, base.pillar, 'Server'),
    preferredUHeight: _mergeSpecField(specOrQuery.preferredUHeight, null, base.preferredUHeight, null),
    targetDriveCount: _mergeSpecField(specOrQuery.targetDriveCount, null, base.targetDriveCount, null)
  };
}

function _matchSinglePlatformName(rawName, catalogs, chassisMap) {
  const trimmed = String(rawName || '').trim();
  if (!trimmed) return null;
  const norm = _normalizeKey(trimmed);
  const direct = catalogs.find(c =>
    _normalizeKey(c.id) === norm ||
    _normalizeKey(c.chassis) === norm ||
    _normalizeKey(chassisMap[c.id]?.model) === norm
  );
  if (direct) return direct;

  const alletra = matchAlletraMpProducts(trimmed);
  if (alletra.length === 1) {
    return catalogs.find(c => c.id === alletra[0]) || null;
  }
  const scope = resolveCatalogQueryScope(trimmed, catalogs);
  if (scope.unresolvedProducts.length === 0 && scope.products.length === 1) {
    return catalogs.find(c => c.id === scope.products[0]) || null;
  }
  return null;
}

function _extractUnresolvedExplicitMentions(queryText, catalogs, alreadyResolvedIds) {
  const chassisMap = getChassisMap();
  const unresolved = [...(resolveCatalogQueryScope(queryText, catalogs).unresolvedProducts || [])];
  const pushUnique = (label) => {
    const cleaned = String(label || '').replace(/^(?:hpe\s+|proliant\s+|and\s+)/i, '').trim();
    if (cleaned && !unresolved.some(u => _normalizeKey(u) === _normalizeKey(cleaned))) {
      unresolved.push(cleaned);
    }
  };

  const vsSegments = queryText.match(/\bcompare\s+(.+?)(?:\s+for\b|\s+with\b|\s+under\b|$)/i);
  if (vsSegments) {
    const parts = vsSegments[1].split(/\s+(?:vs\.?|versus|,)\s+/i).map(p => p.trim()).filter(Boolean);
    for (const part of parts) {
      if (/\b(?:servers?|platforms?|solutions?|models?|proliant|2u|1u|gen\d+\s+servers?)\b/i.test(part) && !/\d{3}/.test(part)) continue;
      if (!_matchSinglePlatformName(part, catalogs, chassisMap) && !alreadyResolvedIds.has(part)) pushUnique(part);
    }
  }
  for (const m of queryText.matchAll(EXPLICIT_MODEL_TOKEN_RE)) {
    if (!_matchSinglePlatformName(m[0].trim(), catalogs, chassisMap)) pushUnique(m[0].trim());
  }
  return unresolved;
}

function _autoSelectPlatformsForSpec(spec, catalogs, chassisMap, maxPlatforms) {
  const pillar = spec.pillar || 'Server';
  const scored = catalogs
    .map(cat => ({ cat, meta: _inferPlatformMeta(cat, chassisMap) }))
    .filter(({ meta }) => (pillar === 'Storage' ? meta.pillar === 'Storage' : meta.pillar === 'Server'))
    .filter(({ meta }) => !spec.preferredUHeight || meta.uHeight === spec.preferredUHeight);

  scored.sort((a, b) => {
    const idxA = FLAGSHIP_SERVER_ORDER.indexOf(a.cat.id);
    const idxB = FLAGSHIP_SERVER_ORDER.indexOf(b.cat.id);
    return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB) || a.cat.id.localeCompare(b.cat.id);
  });
  return scored.slice(0, maxPlatforms).map(s => s.cat);
}

/**
 * Resolve 2–5 candidate platforms while preserving unknown platforms in `unresolvedPlatforms`.
 * @param {object} spec
 * @param {Array} catalogs
 * @param {object} [options]
 * @returns {{ resolvedCatalogs: Array, unresolvedPlatforms: string[], omittedPlatforms: string[], selectionMode: string }}
 */
function resolveComparisonPlatforms(spec, catalogs, options = {}) {
  const chassisMap = getChassisMap();
  const maxPlatforms = Math.min(5, Math.max(2, Number(options.maxPlatforms) || 5));
  const resolved = [];
  const seenIds = new Set();
  const unresolvedPlatforms = [];
  const addCatalog = (cat) => {
    if (cat && !seenIds.has(cat.id)) {
      seenIds.add(cat.id);
      resolved.push(cat);
    }
  };

  if (Array.isArray(spec.platforms) && spec.platforms.length > 0) {
    for (const rawName of spec.platforms) {
      const cat = _matchSinglePlatformName(rawName, catalogs, chassisMap);
      if (cat) addCatalog(cat);
      else unresolvedPlatforms.push(String(rawName).trim());
    }
    return {
      resolvedCatalogs: resolved.slice(0, maxPlatforms),
      unresolvedPlatforms: [...new Set(unresolvedPlatforms)],
      omittedPlatforms: resolved.slice(maxPlatforms).map(c => c.id),
      selectionMode: 'EXPLICIT_LIST'
    };
  }

  if (spec.queryText) {
    const scope = resolveCatalogQueryScope(spec.queryText, catalogs);
    for (const id of [...(scope.products || []), ...matchAlletraMpProducts(spec.queryText)]) {
      addCatalog(catalogs.find(c => c.id === id));
    }
    unresolvedPlatforms.push(..._extractUnresolvedExplicitMentions(spec.queryText, catalogs, seenIds));
    if (resolved.length > 0 || unresolvedPlatforms.length > 0) {
      return {
        resolvedCatalogs: resolved.slice(0, maxPlatforms),
        unresolvedPlatforms: [...new Set(unresolvedPlatforms)],
        omittedPlatforms: resolved.slice(maxPlatforms).map(c => c.id),
        selectionMode: 'EXPLICIT_QUERY'
      };
    }
  }

  return {
    resolvedCatalogs: _autoSelectPlatformsForSpec(spec, catalogs, chassisMap, Math.min(maxPlatforms, 3)),
    unresolvedPlatforms: [],
    omittedPlatforms: [],
    selectionMode: 'AUTO_PILLAR_SELECTION'
  };
}

function _loadPlatformCatalogData(cat, options = {}) {
  if (options.catalogDataById && Object.hasOwn(options.catalogDataById, cat.id)) {
    return options.catalogDataById[cat.id];
  }
  if (!cat?.catalogJsonPath || !fs.existsSync(cat.catalogJsonPath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(cat.catalogJsonPath, 'utf8'));
    return attachCompanionServices(parsed, cat.catalogJsonPath);
  } catch {
    return null;
  }
}

function _findCatalogRowBySku(catalogData, targetSku) {
  const clean = cleanBaseSKU(targetSku);
  if (!clean || !Array.isArray(catalogData?.entries)) return null;
  for (const entry of catalogData.entries) {
    for (const skuRow of entry?.skus || []) {
      if (cleanBaseSKU(skuRow['Product #'] || skuRow.sku) === clean) {
        return { skuRow, entry };
      }
    }
  }
  return null;
}

function _buildBomItemFromRow(skuRow, role, quantity) {
  const sku = cleanBaseSKU(skuRow['Product #'] || skuRow.sku);
  const desc = String(skuRow.Description || skuRow.description || '').trim();
  const { priceUsd, priceState } = _parseRowPrice(skuRow, desc);
  const lead = parseLeadTimeOrEta(skuRow['Lead Time'] || skuRow.leadTime, skuRow.leadTimeDays);
  return { sku, description: desc, quantity, role, unitPriceUsd: priceUsd, priceState, leadTimeDays: lead.days };
}

function _selectBaseChassisItem(catalogData, meta) {
  if (meta.baseSku) {
    const found = _findCatalogRowBySku(catalogData, meta.baseSku);
    if (found) return _buildBomItemFromRow(found.skuRow, 'Base Chassis', 1);
  }
  for (const entry of catalogData?.entries || []) {
    if (!/chassis/i.test(entry.parentCategory || '')) continue;
    for (const skuRow of entry?.skus || []) {
      const sku = cleanBaseSKU(skuRow['Product #'] || skuRow.sku);
      const desc = String(skuRow.Description || skuRow.description || '').trim();
      if (sku && /\bcto\b/i.test(desc) && _isActiveRow(skuRow, sku, desc)) {
        return _buildBomItemFromRow(skuRow, 'Base Chassis', 1);
      }
    }
  }
  return null;
}

function _extractActiveCpus(catalogData) {
  const cpus = [];
  const seen = new Set();
  for (const entry of catalogData?.entries || []) {
    for (const skuRow of entry?.skus || []) {
      const sku = cleanBaseSKU(skuRow['Product #'] || skuRow.sku);
      const desc = String(skuRow.Description || skuRow.description || '').trim();
      if (!sku || seen.has(sku) || !/\b(?:xeon|epyc|processor)\b/i.test(desc)) continue;
      if (/\b(?:heat\s*sink|heatsink|blank|kit\s+enablement|fan|cable|cage)\b/i.test(desc)) continue;
      if (!_isActiveRow(skuRow, sku, desc)) continue;
      const canonical = extractCanonicalAttributes({ sku, description: desc, category: entry.parentCategory || '' }, entry);
      const cores = canonical.attributes?.cores || Number((desc.match(/\b(\d{1,3})[\s-]*core\b/i) || [])[1] || 0);
      if (!Number.isFinite(cores) || cores < 4) continue;
      const tdpWatts = canonical.attributes?.tdpWatts || Number((desc.match(/\b(\d{2,3})\s*W\b/i) || [])[1] || 185);
      const { priceUsd, priceState } = _parseRowPrice(skuRow, desc);
      const lead = parseLeadTimeOrEta(skuRow['Lead Time'] || skuRow.leadTime, skuRow.leadTimeDays);
      seen.add(sku);
      cpus.push({ sku, description: desc, cores, tdpWatts, unitPriceUsd: priceUsd, priceState, leadTimeDays: lead.days });
    }
  }
  return cpus;
}

function _selectCpuConfiguration(catalogData, targetCores, meta) {
  const cpus = _extractActiveCpus(catalogData);
  if (!cpus.length) return { item: null, socketCount: 0, totalCores: 0, maxTdpWatts: 0, coverageGap: true };

  const desiredCores = Number.isFinite(targetCores) && targetCores > 0 ? targetCores : 32;
  const socketOptions = meta.maxSockets >= 2 ? [2, 1] : [1];
  const candidates = [];
  for (const cpu of cpus) {
    for (const sockets of socketOptions) {
      candidates.push({
        cpu,
        sockets,
        totalCores: cpu.cores * sockets,
        meetsTarget: cpu.cores * sockets >= desiredCores,
        totalCost: cpu.unitPriceUsd !== null ? cpu.unitPriceUsd * sockets : null
      });
    }
  }
  candidates.sort((a, b) => {
    if (a.meetsTarget !== b.meetsTarget) return a.meetsTarget ? -1 : 1;
    if (a.totalCores !== b.totalCores) return a.meetsTarget ? (a.totalCores - b.totalCores) : (b.totalCores - a.totalCores);
    if (a.sockets !== b.sockets) return b.sockets - a.sockets;
    return (a.totalCost ?? Number.POSITIVE_INFINITY) - (b.totalCost ?? Number.POSITIVE_INFINITY) || a.cpu.sku.localeCompare(b.cpu.sku);
  });

  const best = candidates[0];
  return {
    item: {
      sku: best.cpu.sku,
      description: best.cpu.description,
      quantity: best.sockets,
      role: 'Processor',
      unitPriceUsd: best.cpu.unitPriceUsd,
      priceState: best.cpu.priceState,
      leadTimeDays: best.cpu.leadTimeDays
    },
    socketCount: best.sockets,
    totalCores: best.totalCores,
    maxTdpWatts: best.cpu.tdpWatts,
    meetsTarget: best.meetsTarget,
    coverageGap: false
  };
}

function _selectFirstMatchingCatalogOption(catalogData, role, quantity, matchFn, preferPriced = true) {
  const hits = [];
  for (const entry of catalogData?.entries || []) {
    for (const skuRow of entry?.skus || []) {
      const sku = cleanBaseSKU(skuRow['Product #'] || skuRow.sku);
      const desc = String(skuRow.Description || skuRow.description || '').trim();
      if (!sku || !desc || !_isActiveRow(skuRow, sku, desc)) continue;
      if (!matchFn(sku, desc, entry)) continue;
      hits.push(_buildBomItemFromRow(skuRow, role, quantity));
    }
  }
  if (!hits.length) return null;
  hits.sort((a, b) => {
    if (preferPriced && (a.unitPriceUsd !== null) !== (b.unitPriceUsd !== null)) {
      return a.unitPriceUsd !== null ? -1 : 1;
    }
    return (a.unitPriceUsd ?? Number.POSITIVE_INFINITY) - (b.unitPriceUsd ?? Number.POSITIVE_INFINITY) || a.sku.localeCompare(b.sku);
  });
  return hits[0];
}

function _selectPsuItem(catalogData, estimatedWatts) {
  const psus = [];
  for (const entry of catalogData?.entries || []) {
    for (const skuRow of entry?.skus || []) {
      const sku = cleanBaseSKU(skuRow['Product #'] || skuRow.sku);
      const desc = String(skuRow.Description || skuRow.description || '').trim();
      if (!sku || !/\b(?:power\s*supply|flex\s*slot)\b/i.test(desc) || /\b(?:cord|cable|enablement|blank|-48\s*vdc|dc\s+power)\b/i.test(desc)) continue;
      if (!_isActiveRow(skuRow, sku, desc)) continue;
      const watts = Number((desc.match(/\b(\d{3,4})\s*W\b/i) || [])[1] || 800);
      psus.push({ ..._buildBomItemFromRow(skuRow, 'Power Supply', 2), watts });
    }
  }
  if (!psus.length) return null;
  const minWatts = Math.max(800, Math.ceil(estimatedWatts * 1.25));
  psus.sort((a, b) => {
    const fitDiff = (a.watts >= minWatts ? 0 : 1) - (b.watts >= minWatts ? 0 : 1);
    return fitDiff || (a.watts - b.watts) || ((a.unitPriceUsd ?? Number.POSITIVE_INFINITY) - (b.unitPriceUsd ?? Number.POSITIVE_INFINITY)) || a.sku.localeCompare(b.sku);
  });
  const { watts: _w, ...chosen } = psus[0];
  return chosen;
}

function _appendThermalAndMgmtEnablement(bomItems, catalogData, cpuRes) {
  const sockets = cpuRes.socketCount || 2;
  const highPerfHeatSink = cpuRes.maxTdpWatts > 205
    ? _selectFirstMatchingCatalogOption(catalogData, 'Cooling / Thermal', sockets, (_s, d) => /high\s*performance.*heat\s*sink/i.test(d) && !/liquid|dlc|direct/i.test(d))
    : null;
  const heatSink = highPerfHeatSink || _selectFirstMatchingCatalogOption(
    catalogData, 'Cooling / Thermal', sockets, (_s, d) => /heat\s*sink/i.test(d) && !/liquid|dlc|blank|enablement/i.test(d)
  );
  if (heatSink) bomItems.push(heatSink);

  if (cpuRes.maxTdpWatts > 185) {
    const fanKit = _selectFirstMatchingCatalogOption(
      catalogData, 'Cooling / Thermal', 1, (_s, d) => /high\s*performance\s*fan/i.test(d) && !/blank/i.test(d)
    );
    if (fanKit) bomItems.push(fanKit);
  }

  const mgmt = _selectFirstMatchingCatalogOption(
    catalogData, 'Software', 1, (s, d) => s === 'R7A11AAE' || s === 'E5Y43A' || /compute\s+ops\s+management.*3-?y/i.test(d)
  );
  if (mgmt) bomItems.push(mgmt);
}

function _aggregateBomPricingAndLeadTime(bomItems, nodeCount) {
  const unpricedSkus = [];
  let perNodeCostUsd = 0;
  let maxLeadTimeDays = null;
  let unknownLeadTimeCount = 0;

  for (const item of bomItems) {
    if (item.unitPriceUsd === null || !Number.isFinite(item.unitPriceUsd) || item.priceState !== 'PRICED') {
      unpricedSkus.push(item.sku);
    } else {
      perNodeCostUsd += item.unitPriceUsd * item.quantity;
    }
    if (Number.isFinite(item.leadTimeDays)) {
      maxLeadTimeDays = maxLeadTimeDays === null ? item.leadTimeDays : Math.max(maxLeadTimeDays, item.leadTimeDays);
    } else {
      unknownLeadTimeCount += 1;
    }
  }

  const pricingComplete = bomItems.length > 0 && unpricedSkus.length === 0;
  return {
    perNodeCostUsd: pricingComplete ? _round(perNodeCostUsd, 2) : null,
    capexListUsd: pricingComplete ? _round(perNodeCostUsd * nodeCount, 2) : null,
    pricingComplete,
    unpricedSkus,
    maxLeadTimeDays: unknownLeadTimeCount === 0 ? maxLeadTimeDays : null,
    observedMaxLeadTimeDays: maxLeadTimeDays,
    unknownLeadTimeCount
  };
}

function _buildAlletraPlatformComparisonRow(cat, meta, spec, options) {
  const envelope = interpolateAlletraMpEnvelope({
    product: cat.id,
    targetUsableTb: spec.usableTb,
    targetDriveCount: spec.targetDriveCount,
    b10000Path: options.b10000Path,
    x10000Path: options.x10000Path
  });
  return {
    platform: meta.platform,
    model: meta.model,
    generation: meta.generation,
    family: meta.family,
    pillar: meta.pillar,
    capexListUsd: null,
    perNodeCostUsd: null,
    pricingComplete: false,
    unpricedSkus: [envelope.recommendedBaseSku || envelope.baseSku || meta.baseSku].filter(Boolean),
    costPerCoreUsd: null,
    costPerGbRamUsd: null,
    costPerUsableTbUsd: null,
    rackUnits: envelope.estimatedRackUnits || meta.uHeight,
    peakWatts: null,
    wattsPerCore: null,
    coresPerU: null,
    maxLeadTimeDays: null,
    unknownLeadTimeCount: 1,
    headroom: { coresPct: null, ramPct: null, storagePct: null },
    achievedSpecs: { cores: null, ramGb: null, usableTb: spec.usableTb || null, recommendedTopology: envelope.recommendedTopology || envelope.preferredMedia || null },
    qualified: false,
    disqualifiedReasons: [{ code: 'NINJA_ONLINE_SIZING_REQUIRED', message: envelope.mandatoryWorkflowDisclosure }],
    catalogCoverageGaps: [],
    candidateBom: [],
    evaluationSummary: { isMathClean: null, aspectErrorsCount: 0, missingDependenciesCount: 0 },
    alletraMpEnvelope: envelope,
    portalValidationStatus: 'PORTAL_VALIDATION_PENDING'
  };
}

function _collectPlatformDisqualifications(cpuRes, memInterp, storageInterp, spec, coverageGaps, evalRes) {
  const reasons = coverageGaps.map(gap => ({ code: 'CATALOG_COVERAGE_GAP', category: gap.category, message: gap.detail }));
  if (spec.cores && cpuRes.totalCores > 0 && cpuRes.totalCores < spec.cores) {
    reasons.push({ code: 'INSUFFICIENT_CORES', message: `Synthesized ${cpuRes.totalCores} cores is below requested ${spec.cores} cores.` });
  }
  if (spec.ramGb && memInterp?.bestBalanced && !memInterp.bestBalanced.meetsTarget) {
    reasons.push({ code: 'INSUFFICIENT_RAM', message: `Max balanced memory ${memInterp.bestBalanced.totalCapacityGb}GB is below requested ${spec.ramGb}GB.` });
  }
  if (spec.usableTb && storageInterp?.coverageGap && storageInterp.coverageGap !== 'CATALOG_COVERAGE_GAP') {
    reasons.push({ code: storageInterp.coverageGap, message: `Unable to meet ${spec.usableTb}TB usable (${spec.raidLevel}) within ${storageInterp.maxBays} drive bays.` });
  }
  if (evalRes?.isMathClean === false && Array.isArray(evalRes.errors) && evalRes.errors.length > 0) {
    reasons.push({ code: 'PHYSICAL_MATH_VIOLATION', message: String(evalRes.errors[0]) });
  }
  return reasons;
}

function _assembleServerBom(cat, meta, catalogData, spec) {
  const bomItems = [];
  const coverageGaps = [];

  const baseItem = _selectBaseChassisItem(catalogData, meta);
  if (baseItem) bomItems.push(baseItem);
  else coverageGaps.push({ code: 'CATALOG_COVERAGE_GAP', category: 'Base Chassis', detail: `No active CTO base chassis SKU found in ${cat.id} catalog.` });

  const cpuRes = _selectCpuConfiguration(catalogData, spec.cores, meta);
  if (cpuRes.coverageGap || !cpuRes.item) {
    coverageGaps.push({ code: 'CATALOG_COVERAGE_GAP', category: 'Processor', detail: `No active Processor SKUs found in ${cat.id} catalog.` });
  } else {
    bomItems.push(cpuRes.item);
    _appendThermalAndMgmtEnablement(bomItems, catalogData, cpuRes);
  }

  const targetRamGb = spec.ramGb || 256;
  const memInterp = interpolateMemoryTopology({
    targetRamGb,
    socketCount: cpuRes.socketCount || Math.min(2, meta.maxSockets),
    channelsPerSocket: meta.channelsPerSocket,
    preferFio: true,
    catalogData
  });
  if (memInterp.coverageGap === 'CATALOG_COVERAGE_GAP' || !memInterp.bestBalanced) {
    coverageGaps.push({ code: 'CATALOG_COVERAGE_GAP', category: 'Memory', detail: `No active Memory DIMM SKUs found in ${cat.id} catalog.` });
  } else {
    const dimm = memInterp.bestBalanced;
    bomItems.push({ sku: dimm.sku, description: dimm.description, quantity: dimm.totalDimms, role: 'Memory', unitPriceUsd: dimm.unitPriceUsd, priceState: dimm.pricingComplete ? 'PRICED' : 'UNPRICED', leadTimeDays: dimm.leadTimeDays });
  }

  let storageInterp = null;
  if (Number.isFinite(spec.usableTb) && spec.usableTb > 0) {
    storageInterp = interpolateStorageTopology({
      targetUsableTb: spec.usableTb, raidLevel: spec.raidLevel, hotSpares: spec.hotSpares,
      driveProtocol: spec.driveProtocol, maxBays: meta.maxBays, catalogData
    });
    if (storageInterp.coverageGap === 'CATALOG_COVERAGE_GAP') {
      coverageGaps.push({ code: 'CATALOG_COVERAGE_GAP', category: 'Drive Cage / Drive', detail: `No active physical Drive SKUs found in ${cat.id} catalog to satisfy ${spec.usableTb}TB usable.` });
    } else if (storageInterp.recommended) {
      const drv = storageInterp.recommended;
      bomItems.push({ sku: drv.sku, description: drv.description, quantity: drv.totalDrives, role: 'Drive Cage / Drive', unitPriceUsd: drv.unitPriceUsd, priceState: drv.pricingComplete ? 'PRICED' : 'UNPRICED', leadTimeDays: drv.leadTimeDays });
    }
  }

  if (Number.isFinite(spec.nicSpeedGbps) && spec.nicSpeedGbps > 0) {
    const nicItem = _selectFirstMatchingCatalogOption(
      catalogData, 'Network Adapter', 1,
      (_s, d) => /\b(?:adapter|ethernet|nic|ocp)\b/i.test(d) && !/\b(?:transceiver|cable|sfp|qsfp|dac|aoc)\b/i.test(d) && new RegExp(`\\b${spec.nicSpeedGbps}\\s*Gb`, 'i').test(d)
    );
    if (nicItem) bomItems.push(nicItem);
  }

  const estimatedBaseWatts = (cpuRes.maxTdpWatts * (cpuRes.socketCount || 2)) + ((memInterp.bestBalanced?.totalDimms || 8) * 10) + ((storageInterp?.recommended?.totalDrives || 0) * 14) + 120;
  const psuItem = _selectPsuItem(catalogData, estimatedBaseWatts);
  if (psuItem) bomItems.push(psuItem);

  return { bomItems, coverageGaps, cpuRes, memInterp, storageInterp, targetRamGb, estimatedBaseWatts };
}

function _computeServerHeadroomAndSpecs(cpuRes, memInterp, storageInterp, spec) {
  const ramPerNode = memInterp.bestBalanced?.totalCapacityGb || 0;
  const usablePerNode = storageInterp?.recommended?.usableTb || null;
  const achievedCores = cpuRes.totalCores * spec.nodeCount;
  const achievedRamGb = ramPerNode * spec.nodeCount;
  const achievedUsableTb = usablePerNode !== null ? _round(usablePerNode * spec.nodeCount, 2) : 0;
  return {
    achievedCores,
    achievedRamGb,
    achievedUsableTb,
    headroom: {
      coresPct: spec.cores && cpuRes.totalCores ? _round(((cpuRes.totalCores - spec.cores) / spec.cores) * 100, 2) : null,
      ramPct: spec.ramGb && memInterp.bestBalanced ? memInterp.bestBalanced.headroomPct : null,
      storagePct: spec.usableTb && storageInterp?.recommended ? storageInterp.recommended.headroomPct : null
    },
    achievedSpecs: {
      coresPerNode: cpuRes.totalCores,
      totalCores: achievedCores,
      ramGbPerNode: ramPerNode,
      totalRamGb: achievedRamGb,
      usableTbPerNode: usablePerNode,
      totalUsableTb: usablePerNode !== null ? achievedUsableTb : null,
      nodeCount: spec.nodeCount
    }
  };
}

function _runSafeServerEvaluation(bomItems, cat, catalogData, nodeCount) {
  try {
    return evaluateBOQMultiAspect(bomItems, {
      chassis: cat.id,
      targetDir: cat.catalogDir || '',
      catalogData,
      serverCount: nodeCount,
      skipSynthesis: true
    });
  } catch (err) {
    return { isMathClean: false, errors: [err.message], missingDependencies: [] };
  }
}

function _evaluateSingleServerPlatform(cat, meta, catalogData, spec, options) {
  const assembled = _assembleServerBom(cat, meta, catalogData, spec);
  const { bomItems, coverageGaps, cpuRes, memInterp, storageInterp, targetRamGb, estimatedBaseWatts } = assembled;
  const evalRes = _runSafeServerEvaluation(bomItems, cat, catalogData, spec.nodeCount);
  const pricing = _aggregateBomPricingAndLeadTime(bomItems, spec.nodeCount);
  const { achievedCores, achievedRamGb, achievedUsableTb, headroom, achievedSpecs } =
    _computeServerHeadroomAndSpecs(cpuRes, memInterp, storageInterp, spec);

  const evalWatts = evalRes?.aspects?.power?.estimatedNodeWattage;
  const perNodeWatts = Number.isFinite(evalWatts) && evalWatts > 0 ? evalWatts : Math.round(estimatedBaseWatts);
  const peakWatts = perNodeWatts * spec.nodeCount;
  const rackUnits = meta.uHeight * spec.nodeCount;

  const efficiency = computeNormalizedEfficiencyMetrics({
    capexListUsd: pricing.capexListUsd, pricingComplete: pricing.pricingComplete,
    totalCores: achievedCores, totalRamGb: achievedRamGb, usableTb: achievedUsableTb, peakWatts, rackUnits
  });
  const haClusterScaling = computeHaClusterScalingCurve({
    perNodeCores: cpuRes.totalCores || 1, perNodeRamGb: achievedSpecs.ramGbPerNode || 1,
    perNodeUsableTb: achievedSpecs.usableTbPerNode || 0, perNodeWatts, perNodeRackU: meta.uHeight,
    perNodeCostUsd: pricing.perNodeCostUsd, pricingComplete: pricing.pricingComplete,
    requiredCores: (spec.cores || cpuRes.totalCores || 32) * spec.nodeCount,
    requiredRamGb: targetRamGb * spec.nodeCount, requiredUsableTb: (spec.usableTb || 0) * spec.nodeCount
  });

  const disqualifiedReasons = _collectPlatformDisqualifications(cpuRes, memInterp, storageInterp, spec, coverageGaps, evalRes);
  const priceTrends = (options.includePriceTrends && cat.catalogDir && cpuRes.item)
    ? { cpu: analyzePriceTrendAnalytics(null, { catalogDir: cat.catalogDir, sku: cpuRes.item.sku }) }
    : null;

  return {
    platform: meta.platform, model: meta.model, generation: meta.generation, family: meta.family, pillar: meta.pillar,
    capexListUsd: pricing.capexListUsd, perNodeCostUsd: pricing.perNodeCostUsd, pricingComplete: pricing.pricingComplete, unpricedSkus: pricing.unpricedSkus,
    costPerCoreUsd: efficiency.costPerCoreUsd, costPerGbRamUsd: efficiency.costPerGbRamUsd, costPerUsableTbUsd: efficiency.costPerUsableTbUsd,
    rackUnits, peakWatts, wattsPerCore: efficiency.wattsPerCore, coresPerU: efficiency.coresPerU,
    maxLeadTimeDays: pricing.maxLeadTimeDays, observedMaxLeadTimeDays: pricing.observedMaxLeadTimeDays, unknownLeadTimeCount: pricing.unknownLeadTimeCount,
    headroom,
    achievedSpecs,
    qualified: disqualifiedReasons.length === 0,
    disqualifiedReasons,
    catalogCoverageGaps: coverageGaps,
    candidateBom: bomItems,
    evaluationSummary: {
      isMathClean: Boolean(evalRes?.isMathClean),
      aspectErrorsCount: Array.isArray(evalRes?.errors) ? evalRes.errors.length : 0,
      missingDependenciesCount: Array.isArray(evalRes?.missingDependencies) ? evalRes.missingDependencies.length : 0
    },
    memoryInterpolation: memInterp,
    storageInterpolation: storageInterp,
    haClusterScaling,
    ...(priceTrends ? { priceTrends } : {}),
    portalValidationStatus: 'PORTAL_VALIDATION_PENDING'
  };
}

function _buildParetoCandidates(rows) {
  return rows.map(row => ({
    candidateId: row.platform,
    name: row.model,
    skuPartsList: row.candidateBom,
    totalCostUsd: row.pricingComplete ? row.capexListUsd : null,
    pricingComplete: row.pricingComplete,
    priceBasis: 'LIST',
    currency: 'USD',
    priceUnavailableSkus: row.unpricedSkus,
    leadTimeDays: row.maxLeadTimeDays,
    performanceScore: Number(
      (((row.achievedSpecs?.totalCores || 0) * 8) +
        (row.achievedSpecs?.totalRamGb || 0) +
        ((row.achievedSpecs?.totalUsableTb || 0) * 50)).toFixed(2)
    ),
    physicalMathClean: row.qualified,
    hardConstraintFailures: row.disqualifiedReasons
  }));
}

function _computePairwiseCrossGenDeltas(rows) {
  const deltas = [];
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i];
      const b = rows[j];
      const aGenNum = Number(String(a.generation || '').match(/\d+/)?.[0] || 0);
      const bGenNum = Number(String(b.generation || '').match(/\d+/)?.[0] || 0);
      const [fromRow, toRow] = aGenNum > bGenNum ? [b, a] : [a, b];
      deltas.push(computeCrossGenerationDeltas(fromRow, toRow));
    }
  }
  return deltas;
}

function _buildMissingCatalogRow(meta, spec, catalogId) {
  const detail = `Catalog JSON unreadable or missing for ${catalogId}.`;
  return {
    platform: meta.platform, model: meta.model, generation: meta.generation, family: meta.family, pillar: meta.pillar,
    capexListUsd: null, pricingComplete: false, unpricedSkus: [],
    costPerCoreUsd: null, costPerGbRamUsd: null, costPerUsableTbUsd: null,
    rackUnits: meta.uHeight * spec.nodeCount, peakWatts: null, wattsPerCore: null, coresPerU: null, maxLeadTimeDays: null,
    headroom: { coresPct: null, ramPct: null, storagePct: null },
    qualified: false,
    disqualifiedReasons: [{ code: 'CATALOG_COVERAGE_GAP', message: detail }],
    catalogCoverageGaps: [{ code: 'CATALOG_COVERAGE_GAP', category: 'Catalog', detail }],
    candidateBom: [],
    portalValidationStatus: 'PORTAL_VALIDATION_PENDING'
  };
}

/**
 * Compare 2–5 candidate HPE platforms side-by-side against sizing requirements.
 * @param {string|object} specOrQuery
 * @param {object} [options]
 * @returns {object}
 */
function compareSolutionsAcrossPlatforms(specOrQuery, options = {}) {
  const spec = extractComparisonSpec(specOrQuery);
  const catalogs = Array.isArray(options.catalogs) ? options.catalogs : listAllCatalogs();
  const chassisMap = getChassisMap();
  const { resolvedCatalogs, unresolvedPlatforms, omittedPlatforms, selectionMode } =
    resolveComparisonPlatforms(spec, catalogs, options);

  const rows = resolvedCatalogs.map(cat => {
    const meta = _inferPlatformMeta(cat, chassisMap);
    if (ALLETRA_MP_IDS.has(cat.id)) return _buildAlletraPlatformComparisonRow(cat, meta, spec, options);
    const catalogData = _loadPlatformCatalogData(cat, options);
    if (!catalogData || !Array.isArray(catalogData.entries)) return _buildMissingCatalogRow(meta, spec, cat.id);
    return _evaluateSingleServerPlatform(cat, meta, catalogData, spec, options);
  });

  const paretoFrontier = computeParetoFrontier(_buildParetoCandidates(rows), {
    scopeId: 'MULTI_PLATFORM_SOLUTION_COMPARISON',
    enforcePhysicalMath: true
  });
  const frontierIds = new Set((paretoFrontier.frontierCandidates || []).map(c => c.candidateId));
  const dominatedByMap = new Map(
    (paretoFrontier.dominatedCandidates || []).map(c => [c.candidateId, c.dominatedByCandidateId || null])
  );

  const comparisonMatrix = rows.map(row => ({
    ...row,
    paretoOptimal: frontierIds.has(row.platform),
    dominatedByPlatform: dominatedByMap.get(row.platform) || null
  }));
  const crossGenerationDeltas = _computePairwiseCrossGenDeltas(comparisonMatrix);
  const hasAnyGaps = unresolvedPlatforms.length > 0 || comparisonMatrix.some(r => (r.catalogCoverageGaps?.length || 0) > 0);
  const status = comparisonMatrix.length === 0
    ? 'ACTION_REQUIRED'
    : (hasAnyGaps || comparisonMatrix.length < 2) ? 'PARTIAL_COMPARISON' : 'COMPARISON_COMPLETE';

  return {
    intent: 'SOLUTION_COMPARISON',
    status,
    selectionMode,
    requirements: spec,
    comparedPlatforms: comparisonMatrix.map(r => r.platform),
    comparisonMatrix,
    paretoFrontier,
    crossGenerationDeltas,
    unresolvedPlatforms,
    omittedPlatforms,
    portalValidationStatus: 'PORTAL_VALIDATION_PENDING',
    timestamp: new Date().toISOString(),
    message: comparisonMatrix.length > 0
      ? `Compared ${comparisonMatrix.length} platform(s) (${comparisonMatrix.map(r => r.platform).join(', ')})${unresolvedPlatforms.length ? `; unresolved platform(s): ${unresolvedPlatforms.join(', ')}` : ''}. Live HPE OCA CLIC acceptance remains pending.`
      : `Unable to resolve requested platform(s): ${unresolvedPlatforms.join(', ') || 'none specified'}.`
  };
}

module.exports = {
  extractComparisonSpec,
  resolveComparisonPlatforms,
  compareSolutionsAcrossPlatforms
};
