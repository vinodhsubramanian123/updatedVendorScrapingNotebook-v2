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

const { listAllCatalogs, getChassisMap, matchAlletraMpProducts } = require('../catalog/catalog_discovery.js');
const { resolveCatalogQueryScope } = require('../catalog/catalog_query_engine.js');
const { evaluateBOQMultiAspect } = require('./boq_evaluator.js');
const {
  computeHaClusterScalingCurve,
  interpolateAlletraMpEnvelope,
  computeNormalizedEfficiencyMetrics,
  computeCrossGenerationDeltas,
  analyzePriceTrendAnalytics
} = require('../conflict/sizing/scaling_interpolator.js');
const { computeParetoFrontier } = require('../conflict/sizing/pareto_ranker.js');
const { computeCandidateRunwayAndTradeOffs } = require('../conflict/tradeoff_explainer.js');
const {
  roundMetric: _round,
  loadPlatformCatalogData: _loadPlatformCatalogData,
  aggregateBomPricingAndLeadTime: _aggregateBomPricingAndLeadTime,
  assembleServerBom: _assembleServerBom
} = require('./comparator_bom_assembler.js');

const ALLETRA_MP_IDS = new Set(['Alletra_MP_B10000', 'Alletra_MP_X10000']);
const FLAGSHIP_SERVER_ORDER = Object.freeze([
  'DL380_Gen12', 'DL385_Gen11', 'DL360_Gen12', 'DL380_Gen11', 'DL360_Gen11', 'DL380a_Gen12', 'DL580_Gen12', 'DL145_Gen11'
]);

const EXPLICIT_MODEL_TOKEN_RE = /\b((?:dl|ml|bl|rl|sy|sn|gx|msl)\s*\d{2,5}[a-z]?|synergy\s*\d{3,5}|alletra(?:\s+storage)?(?:\s+mp)?\s*(?:[bx]\d{4,5}[a-z]?|10k|\d{4})|[bx]10\d{3}|[a-z][a-z0-9-]{2,}\s+gen\s*\d{1,2})\b(?:\s*(?:gen\s*|g)(\d{1,2}))?/gi;

function _normalizeKey(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
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
  const defaultU = idLower.includes('dl380a') ? 4 : (idLower.includes('dl360') || idLower.includes('dl325') || idLower.includes('dl145') ? 1 : (idLower.includes('dl580') || idLower.includes('dl560') ? 4 : (idLower.includes('synergy') ? 10 : 2)));
  const defaultSockets = /dl145|dl325|dl345/i.test(cat.id) ? 1 : (/dl580/i.test(cat.id) ? 4 : 2);
  const defaultBays = /dl360/i.test(cat.id) ? 10 : (/dl145/i.test(cat.id) ? 6 : 24);
  return {
    platform: cat.id,
    model: entry.model || cat.chassis || cat.id.replace(/_/g, ' '),
    family: entry.family || cat.family || (pillar === 'Storage' ? 'Alletra' : 'ProLiant'),
    generation,
    pillar,
    uHeight: Number.isFinite(entry.uHeight) ? entry.uHeight : defaultU,
    baseSku: entry.baseSku || cat.baseSku || null,
    channelsPerSocket: /dl145/i.test(cat.id) ? 6 : (/dl385|dl325|dl345/i.test(cat.id) ? 12 : 8),
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
  const gpuMatch = text.match(/\b(\d+)\s*x?\s*(?:nvidia|gpu|h100|h200|l40s?|l4|a100|b200)\b/i);
  const gpuModelMatch = text.match(/\b(H100\s*NVL|H100|H200|L40S|L40|L4|A100|B200|RTX\s*Pro\s*6000)\b/i);
  const ambientMatch = text.match(/\b(\d{2})\s*°?\s*C\b/i);
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
    fcPorts: matchNum(/\b(\d+)\s*(?:fc|fibre\s*channel)\s*ports?\b/i),
    gpuCount: gpuMatch ? Number(gpuMatch[1]) : 0,
    gpuModel: gpuModelMatch ? gpuModelMatch[1] : null,
    ambientTempC: ambientMatch ? Number(ambientMatch[1]) : null,
    workloadTier: /\b(?:sap\s*hana|ai|llm|inference|hft|oltp|vdi|vmware)\b/i.test(text) ? text.match(/\b(?:sap\s*hana|ai|llm|inference|hft|oltp|vdi|vmware)\b/i)[0].toUpperCase() : null,
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
    fcPorts: _mergeSpecField(specOrQuery.fcPorts, null, base.fcPorts, null),
    gpuCount: _mergeSpecField(specOrQuery.gpuCount, null, base.gpuCount, 0),
    gpuModel: _mergeSpecField(specOrQuery.gpuModel, null, base.gpuModel, null),
    ambientTempC: _mergeSpecField(specOrQuery.ambientTempC, null, base.ambientTempC, null),
    workloadTier: _mergeSpecField(specOrQuery.workloadTier, null, base.workloadTier, null),
    powerRateUsdPerKwh: _mergeSpecField(specOrQuery.powerRateUsdPerKwh, null, null, null),
    targetVendor: _mergeSpecField(specOrQuery.targetVendor, null, null, 'HPE'),
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

function _computePlatformAnalyticsExtension(cat, meta, catalogData, bomItems, evalRes, pricing, peakWatts, spec, options) {
  const { computeFullPlatformEnvelope } = require('../rules/hardware_envelope_solver.js');
  const { solveBuildableConfiguration } = require('../conflict/buildable_graph_solver.js');
  const envelope = computeFullPlatformEnvelope(meta.platform, catalogData, { gpuModel: spec.gpuModel });
  const buildClosure = solveBuildableConfiguration(bomItems, {
    catalogData,
    chassisInfo: { model: meta.model, formFactor: meta.formFactor },
    initialAspectResult: evalRes,
    validateFn: (parts, catData) => _runSafeServerEvaluation(parts, cat, catData, spec.nodeCount),
    ruleOptions: { serverCount: spec.nodeCount, ambientTempC: spec.ambientTempC ?? 25 },
    skipRepairs: false
  });
  const gpuLimit = /single/i.test(String(spec.gpuModel || '')) ? envelope.gpu.maxSingleWideGpus : envelope.gpu.maxDoubleWideGpus;
  const requiredNodesForGpu = (spec.gpuCount > 0 && gpuLimit > 0) ? Math.ceil(spec.gpuCount / gpuLimit) : 1;
  const rate = Number(spec.powerRateUsdPerKwh ?? options.powerRateUsdPerKwh);
  const canComputeTco = pricing.pricingComplete === true && Number.isFinite(pricing.capexListUsd) && Number.isFinite(rate) && rate > 0 && Number.isFinite(peakWatts);
  const annualPowerUsd = canComputeTco ? Number(((peakWatts / 1000) * 8760 * rate).toFixed(2)) : null;
  const tco3YearUsd = annualPowerUsd !== null ? Number((pricing.capexListUsd + (annualPowerUsd * 3)).toFixed(2)) : null;
  const tco5YearUsd = annualPowerUsd !== null ? Number((pricing.capexListUsd + (annualPowerUsd * 5)).toFixed(2)) : null;

  return {
    envelopeSummary: { maxSockets: envelope.cpu.maxSockets, maxOcpSlots: envelope.ocp.maxSlots, maxActivePcieSlots: envelope.pcie.maxElectricallyActiveSlots, maxDoubleWideGpus: envelope.gpu.maxDoubleWideGpus },
    rightSizedNodesMin: Math.max(spec.nodeCount, requiredNodesForGpu),
    isBuildable: Boolean(buildClosure.isBuildable),
    buildabilityStatus: buildClosure.status,
    buildabilityRepairsCount: buildClosure.repairsApplied.length,
    buildabilityErrors: buildClosure.remainingErrors,
    buildabilityRemainingMissingCount: buildClosure.remainingMissingDependencies?.length || 0,
    day2Runway: { maxDimmsChassis: envelope.memory.maxDimmsChassis, maxActivePcieSlots: envelope.pcie.maxElectricallyActiveSlots, maxDoubleWideGpus: envelope.gpu.maxDoubleWideGpus, maxSffDrives: envelope.storage.maxSffDrives },
    annualPowerUsd,
    tco3YearUsd,
    tco5YearUsd
  };
}

function _evaluateSingleServerPlatform(cat, meta, catalogData, spec, options) {
  const assembled = _assembleServerBom(cat, meta, catalogData, spec);
  const { bomItems, coverageGaps, cpuRes, memInterp, storageInterp, targetRamGb, estimatedBaseWatts } = assembled;
  const evalRes = _runSafeServerEvaluation(bomItems, cat, catalogData, spec.nodeCount);
  const pricing = _aggregateBomPricingAndLeadTime(bomItems, spec.nodeCount);
  const { achievedCores, achievedRamGb, achievedUsableTb, headroom, achievedSpecs } =
    _computeServerHeadroomAndSpecs(cpuRes, memInterp, storageInterp, spec);

  const evalWatts = evalRes?.evalSummary?.power?.estimatedNodeWattage ?? evalRes?.aspects?.power?.estimatedNodeWattage;
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

  const extAnalytics = _computePlatformAnalyticsExtension(cat, meta, catalogData, bomItems, evalRes, pricing, peakWatts, spec, options);
  const effectiveEval = extAnalytics.isBuildable ? { isMathClean: true, errors: [], missingDependencies: [] } : evalRes;
  const disqualifiedReasons = _collectPlatformDisqualifications(cpuRes, memInterp, storageInterp, spec, coverageGaps, effectiveEval);
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
    isBuildable: extAnalytics.isBuildable,
    buildabilityStatus: extAnalytics.buildabilityStatus,
    rightSizedNodesMin: extAnalytics.rightSizedNodesMin,
    envelopeSummary: extAnalytics.envelopeSummary,
    day2Runway: extAnalytics.day2Runway,
    annualPowerUsd: extAnalytics.annualPowerUsd,
    tco3YearUsd: extAnalytics.tco3YearUsd,
    tco5YearUsd: extAnalytics.tco5YearUsd,
    qualified: disqualifiedReasons.length === 0,
    disqualifiedReasons,
    catalogCoverageGaps: coverageGaps,
    candidateBom: bomItems,
    evaluationSummary: {
      isMathClean: Boolean(extAnalytics.isBuildable || evalRes?.isMathClean),
      aspectErrorsCount: extAnalytics.buildabilityErrors.length,
      missingDependenciesCount: extAnalytics.buildabilityRemainingMissingCount,
      buildabilityRepairsCount: extAnalytics.buildabilityRepairsCount
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

  const rawMatrix = rows.map(row => ({
    ...row,
    paretoOptimal: frontierIds.has(row.platform),
    dominatedByPlatform: dominatedByMap.get(row.platform) || null
  }));
  const comparisonMatrix = computeCandidateRunwayAndTradeOffs(rawMatrix, {
    baselineId: rawMatrix[0]?.platform
  });
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
