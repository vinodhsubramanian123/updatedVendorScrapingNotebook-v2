'use strict';

/**
 * scripts/lib/boq/requirements/typed_values.js
 *
 * Pure typed requirement extraction for customer BOQ / RFP clauses:
 * - Unicode & decimal comparators / units (>=, >= Unicode, <=, <= Unicode, 2.5 TB, 1,200 W, 100 GbE)
 * - Currency-qualified budgets only (strictly rejects non-currency max phrases)
 * - Compute, Memory (GB vs DIMM count strictly separated), Storage (raw vs usable + RAID),
 *   Network, Redundancy (N+1, 2N), Support SLA/Duration, Delivery deadlines,
 *   Negation/Exclusions/SKU locks, Spares/Shared/Node/Cluster scopes, and Hardness.
 */

const HARDNESS_LEVELS = Object.freeze({
  HARD_CONSTRAINT: 'HARD_CONSTRAINT',
  PREFERENCE: 'PREFERENCE',
  EXCLUSION: 'EXCLUSION'
});

const COMPARATORS = Object.freeze({
  MIN: 'MIN',
  MAX: 'MAX',
  EXACT: 'EXACT'
});

const SCOPE_TYPES = Object.freeze({
  PER_NODE: 'PER_NODE',
  PER_CLUSTER: 'PER_CLUSTER',
  SHARED: 'SHARED',
  GLOBAL: 'GLOBAL',
  SPARE: 'SPARE',
  UNSPECIFIED: 'UNSPECIFIED'
});

const NON_CURRENCY_UNIT_AFTER_RE = /^\s*(?:cores?|vcpus?|sockets?|dimms?|rdimms?|lrdimms?|mrdimms?|gb|tb|mb|pb|gbe|gbps|mbps|w|watts?|kw|u|ru|days?|weeks?|months?|years?|yrs?|hrs?|hours?|nodes?|servers?|hosts?|blades?|drives?|disks?|ports?|slots?|fans?|psus?|units?|packs?|kits?)\b/i;
const SKU_TOKEN_IN_LINE_RE = /\b[PQRS0-9][A-Z0-9]{4,7}-[A-Z0-9]{3}\b/;
const DELIMITED_ROW_RE = /[\t|,;]/;

const MIN_COMPARATOR_RE = /(?:>=|\u2265|\bat\s+least\b|\bminimum(?:\s+of)?\b|\bmin\b|\bno\s+less\s+than\b|\bgreater\s+than\s+or\s+equal\b)/i;
const MAX_COMPARATOR_RE = /(?:<=|\u2264|\bat\s+most\b|\bmaximum(?:\s+of)?\b|\bmax\b|\bno\s+more\s+than\b|\bunder\b|\bbelow\b|\bwithin\b|\bup\s*to\b|\bupto\b|\bless\s+than\b|\bnot\s+exceed(?:ing)?\b)/i;
const TRAILING_MIN_RE = /^\s*(?:\+|\bor\s+(?:more|higher|greater|above)\b)/i;

const NO_SUBSTITUTE_RE = /\b(?:do\s+not\s+substitute|no\s+substitutions?|must\s+keep|keep\s+exact|exact\s+(?:part|sku)|cannot\s+substitute|never\s+substitute)\b/i;
const EXCLUSION_ACTION_RE = /\b(?:exclude|excluding|without|do\s+not\s+include|must\s+not\s+include|omit|prohibit(?:ed)?|forbidden|never\s+include)\b/i;
const NO_SERVICE_OR_PART_RE = /\bno\s+(?:installation|install(?:\s+service)?|deployment(?:\s+service)?|rail\s*kits?|optics?|transceivers?|support|services?|cables?|drives?|gpus?|substitutions?)\b/i;
const PREFERENCE_RE = /\b(?:prefer(?:red|ence)?|ideally|nice\s+to\s+have|optional(?:ly)?|if\s+possible|would\s+like|desirable|best\s+effort)\b/i;

const SPARE_RE = /\b(?:spares?|hot\s+spares?|cold\s+spares?|on-?hand\s+spares?)\b/i;
const SHARED_RE = /\b(?:shared|shared\s+infra(?:structure)?|top-?of-?rack|tor\s+switch)\b/i;
const GLOBAL_RE = /\b(?:global(?:ly)?|site-?wide|cluster-?wide|once\s+per\s+order)\b/i;
const PER_NODE_RE = /\b(?:per\s+(?:node|server|host|blade)|each\s+(?:node|server|host)|\/\s*(?:node|server))\b/i;
const PER_CLUSTER_RE = /\b(?:per\s+cluster|across\s+(?:all\s+|\d+\s+)?(?:nodes?|servers?|hosts?|cluster)|cluster\s+total|in\s+total)\b/i;

const STORAGE_CONTEXT_RE = /\b(?:ssd|hdd|nvme|sata|sas|drive|drives|disk|disks|storage|raid\s*\d+|usable|raw|boot)\b/i;
const MEMORY_CONTEXT_RE = /\b(?:ram|memory|ddr[345]|rdimm|lrdimm|mrdimm|ecc|smart\s+memory)\b/i;
const SUPPORT_CONTEXT_RE = /\b(?:tech\s*care|pointnext|care\s*pack|support|sla|warranty|service|foundation\s*care|nbd|4-?hour|4hr|24x7|cdmr|gdmr|dmr)\b/i;

const RAID_RULES = {
  'RAID 0': { minDrives: 1, requireEven: false, parity: () => 0 },
  'RAID 1': { minDrives: 2, requireEven: false, parity: n => n - Math.floor(n / 2) },
  'RAID 10': { minDrives: 4, requireEven: true, parity: n => n / 2 },
  'RAID 5': { minDrives: 3, requireEven: false, parity: () => 1 },
  'RAID 6': { minDrives: 4, requireEven: false, parity: () => 2 },
  'RAID 50': { minDrives: 6, requireEven: false, parity: (_n, spans) => spans },
  'RAID 60': { minDrives: 8, requireEven: false, parity: (_n, spans) => 2 * spans }
};

function parseScaledNumber(rawDigits, scaleSuffix = '') {
  if (rawDigits === null || rawDigits === undefined) return null;
  const cleaned = String(rawDigits).replace(/,/g, '').trim();
  if (!cleaned) return null;
  const base = Number(cleaned);
  if (!Number.isFinite(base)) return null;
  const suffix = String(scaleSuffix || '').toLowerCase();
  if (suffix === 'k') return base * 1000;
  if (suffix === 'm') return base * 1000000;
  return base;
}

function normalizeTextUnicode(input) {
  return String(input || '')
    .replace(/\u2265/g, '>=')
    .replace(/\u2264/g, '<=')
    .replace(/\u00d7/g, 'x')
    .replace(/[\u2013\u2014]/g, '-')
    .trim();
}

function detectLocalComparator(text, matchIndex, matchLength, defaultComparator = COMPARATORS.EXACT) {
  const prefixStart = Math.max(0, matchIndex - 36);
  const prefix = text.slice(prefixStart, matchIndex);
  const suffix = text.slice(matchIndex + matchLength, matchIndex + matchLength + 20);
  if (MIN_COMPARATOR_RE.test(prefix) || TRAILING_MIN_RE.test(suffix)) return COMPARATORS.MIN;
  if (MAX_COMPARATOR_RE.test(prefix)) return COMPARATORS.MAX;
  return defaultComparator;
}

function _isLikelySkuLinePrice(line) {
  const hasTabularSku = DELIMITED_ROW_RE.test(line) && SKU_TOKEN_IN_LINE_RE.test(line);
  if (!hasTabularSku) return false;
  return !/\b(?:budget|capex|spend|target\s+spend|price\s+cap|cost\s+limit)\b/i.test(line);
}

function _matchBudgetCandidateOnLine(line) {
  if (!line || _isLikelySkuLinePrice(line)) return null;
  const patterns = [
    {
      re: /(?:US\s*\$|\$)\s*(\d[\d,]*(?:\.\d+)?)\s*([km])?\b(?:\s*USD)?/i,
      qualifiedBy: 'CURRENCY',
      currency: 'USD'
    },
    {
      re: /\bUSD\s*(\d[\d,]*(?:\.\d+)?)\s*([km])?\b/i,
      qualifiedBy: 'CURRENCY',
      currency: 'USD'
    },
    {
      re: /\b(\d[\d,]*(?:\.\d+)?)\s*([km])?\s*USD\b/i,
      qualifiedBy: 'CURRENCY',
      currency: 'USD'
    },
    {
      re: /\b(?:budget|capex|spend\s+limit|cost\s+limit|price\s+cap)\b\s*(?:of|is|:|<=|>=|<|=|under|below|within|up\s*to|upto|max(?:imum)?)?\s*\$?\s*(\d[\d,]*(?:\.\d+)?)\s*([km])?\b/i,
      qualifiedBy: 'BUDGET_KEYWORD',
      currency: 'USD'
    }
  ];

  for (const pat of patterns) {
    const m = pat.re.exec(line);
    if (!m) continue;
    const afterMatch = line.slice(m.index + m[0].length);
    if (NON_CURRENCY_UNIT_AFTER_RE.test(afterMatch)) continue;
    const val = parseScaledNumber(m[1], m[2]);
    if (val === null || val <= 0) continue;
    const scopeInfo = detectHardnessAndScope(line);
    return {
      budgetUsd: val,
      amount: val,
      currency: pat.currency,
      comparator: COMPARATORS.MAX,
      qualifiedBy: pat.qualifiedBy,
      scope: scopeInfo.scope,
      rawText: m[0].trim()
    };
  }
  return null;
}

function extractBudgetConstraint(text) {
  const normalized = normalizeTextUnicode(text);
  if (!normalized) return null;
  const lines = normalized.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const candidate = _matchBudgetCandidateOnLine(line);
    if (candidate) return candidate;
  }
  return null;
}

function _computeScopeFlags(text) {
  const isSpare = SPARE_RE.test(text);
  const isShared = SHARED_RE.test(text);
  const isGlobal = GLOBAL_RE.test(text);
  const isPerNode = PER_NODE_RE.test(text);
  const isPerCluster = PER_CLUSTER_RE.test(text);

  const scopes = [];
  if (isSpare) scopes.push(SCOPE_TYPES.SPARE);
  if (isShared) scopes.push(SCOPE_TYPES.SHARED);
  if (isGlobal) scopes.push(SCOPE_TYPES.GLOBAL);
  if (isPerNode) scopes.push(SCOPE_TYPES.PER_NODE);
  if (isPerCluster) scopes.push(SCOPE_TYPES.PER_CLUSTER);

  const primary = scopes[0] || SCOPE_TYPES.UNSPECIFIED;
  return { scope: primary, scopes, isSpare, isShared, isGlobal, isPerNode, isPerCluster };
}

function detectHardnessAndScope(rawText) {
  const text = normalizeTextUnicode(rawText);
  const noSubstitute = NO_SUBSTITUTE_RE.test(text);
  const hasExclusionWord = EXCLUSION_ACTION_RE.test(text) || (NO_SERVICE_OR_PART_RE.test(text) && !noSubstitute);
  const isPreference = PREFERENCE_RE.test(text);

  let hardness = HARDNESS_LEVELS.HARD_CONSTRAINT;
  if (hasExclusionWord && !isPreference) {
    hardness = HARDNESS_LEVELS.EXCLUSION;
  } else if (isPreference) {
    hardness = HARDNESS_LEVELS.PREFERENCE;
  }

  const scopeFlags = _computeScopeFlags(text);
  return {
    hardness,
    promoteToPhysicalRule: hardness === HARDNESS_LEVELS.HARD_CONSTRAINT,
    isHardBlocking: hardness !== HARDNESS_LEVELS.PREFERENCE,
    noSubstitute,
    ...scopeFlags
  };
}

function normalizeRaidLevel(rawRaid) {
  const compact = String(rawRaid || '').toUpperCase().replace(/[\s-]+/g, '');
  const map = {
    RAID0: 'RAID 0',
    RAID1: 'RAID 1',
    'RAID1+0': 'RAID 10',
    RAID10: 'RAID 10',
    RAID5: 'RAID 5',
    RAID6: 'RAID 6',
    RAID50: 'RAID 50',
    RAID60: 'RAID 60'
  };
  return map[compact] || null;
}

function _firstDefined(values, fallback = null) {
  for (const v of values) {
    if (v !== undefined && v !== null) return v;
  }
  return fallback;
}

function _parseUsableStorageArgs(inputOrRawTb, raidLevelArg, driveCountArg, hotSparesArg) {
  if (inputOrRawTb && typeof inputOrRawTb === 'object') {
    return {
      rawStorageTb: _firstDefined([inputOrRawTb.rawStorageTb, inputOrRawTb.rawTb]),
      driveCount: _firstDefined([inputOrRawTb.driveCount]),
      driveSizeTb: _firstDefined([inputOrRawTb.driveSizeTb]),
      raidLevel: normalizeRaidLevel(inputOrRawTb.raidLevel),
      hotSpares: Number(inputOrRawTb.hotSpares || 0),
      spans: Math.max(2, Number(inputOrRawTb.spans || 2))
    };
  }
  return {
    rawStorageTb: _firstDefined([inputOrRawTb]),
    driveCount: _firstDefined([driveCountArg]),
    driveSizeTb: null,
    raidLevel: normalizeRaidLevel(raidLevelArg),
    hotSpares: Number(hotSparesArg || 0),
    spans: 2
  };
}

function _invalidRaidResult(raidLevel, rawStorageTb, driveCount, hotSpares, reason, physicalImpossibility = true) {
  return {
    valid: false,
    physicalImpossibility,
    raidLevel,
    rawStorageTb,
    usableStorageTb: null,
    driveCount,
    effectiveDrives: driveCount !== null ? Math.max(0, driveCount - hotSpares) : null,
    parityDrives: null,
    hotSpares,
    efficiencyRatio: null,
    reason
  };
}

function _resolveDriveTopology(args) {
  let rawTb = args.rawStorageTb !== null ? Number(args.rawStorageTb) : null;
  const driveCount = args.driveCount !== null ? Number(args.driveCount) : null;
  let driveSizeTb = args.driveSizeTb !== null ? Number(args.driveSizeTb) : null;
  if (driveCount && driveSizeTb && rawTb === null) rawTb = driveCount * driveSizeTb;
  if (driveCount && rawTb !== null && driveSizeTb === null) driveSizeTb = rawTb / driveCount;
  return { rawTb, driveCount, driveSizeTb };
}

function _computeRaidWithDriveCount(raidLevel, rule, rawTb, driveCount, driveSizeTb, hotSpares, spans) {
  const effectiveDrives = driveCount - hotSpares;
  if (effectiveDrives < rule.minDrives) {
    return _invalidRaidResult(raidLevel, rawTb, driveCount, hotSpares, `${raidLevel} requires at least ${rule.minDrives} active drives (got ${effectiveDrives}).`);
  }
  if (rule.requireEven && effectiveDrives % 2 !== 0) {
    return _invalidRaidResult(raidLevel, rawTb, driveCount, hotSpares, `${raidLevel} requires an even number of active drives (got ${effectiveDrives}).`);
  }
  const parityDrives = rule.parity(effectiveDrives, spans);
  const usableDrives = Math.max(0, effectiveDrives - parityDrives);
  const usableTb = Number((usableDrives * driveSizeTb).toFixed(4));
  const rawTotal = rawTb ?? Number((driveCount * driveSizeTb).toFixed(4));
  return {
    valid: true,
    physicalImpossibility: false,
    raidLevel,
    rawStorageTb: rawTotal,
    usableStorageTb: usableTb,
    driveCount,
    effectiveDrives,
    parityDrives,
    hotSpares,
    efficiencyRatio: rawTotal > 0 ? Number((usableTb / rawTotal).toFixed(4)) : null,
    reason: null
  };
}

function computeUsableStorageTb(inputOrRawTb, raidLevelArg = null, driveCountArg = null, hotSparesArg = 0) {
  const args = _parseUsableStorageArgs(inputOrRawTb, raidLevelArg, driveCountArg, hotSparesArg);
  const rule = args.raidLevel ? RAID_RULES[args.raidLevel] : null;
  if (!rule) {
    return _invalidRaidResult(args.raidLevel, args.rawStorageTb, args.driveCount, args.hotSpares, 'UNSUPPORTED_OR_MISSING_RAID_LEVEL', false);
  }
  const { rawTb, driveCount, driveSizeTb } = _resolveDriveTopology(args);
  if (driveCount === 0) {
    return _invalidRaidResult(args.raidLevel, rawTb, 0, args.hotSpares, `${args.raidLevel} requires at least ${rule.minDrives} active drives (got 0).`);
  }
  if (driveCount !== null && Number.isFinite(driveCount) && driveSizeTb !== null) {
    return _computeRaidWithDriveCount(args.raidLevel, rule, rawTb, driveCount, driveSizeTb, args.hotSpares, args.spans);
  }
  if (rawTb !== null && (args.raidLevel === 'RAID 0' || args.raidLevel === 'RAID 1' || args.raidLevel === 'RAID 10')) {
    const ratio = args.raidLevel === 'RAID 0' ? 1 : 0.5;
    const usableTb = Number((rawTb * ratio).toFixed(4));
    return {
      valid: true,
      physicalImpossibility: false,
      raidLevel: args.raidLevel,
      rawStorageTb: rawTb,
      usableStorageTb: usableTb,
      driveCount: null,
      effectiveDrives: null,
      parityDrives: null,
      hotSpares: args.hotSpares,
      efficiencyRatio: ratio,
      reason: null
    };
  }
  return _invalidRaidResult(args.raidLevel, rawTb, driveCount, args.hotSpares, 'DRIVE_COUNT_REQUIRED_FOR_RAID_PARITY', false);
}

function _extractComputeMetrics(text, hardnessInfo) {
  const out = [];
  const coreRe = /\b(\d[\d,]*)\s*-?\s*cores?\b/gi;
  let m;
  while ((m = coreRe.exec(text)) !== null) {
    out.push({
      _pos: m.index,
      domain: 'COMPUTE',
      metric: 'cores',
      comparator: detectLocalComparator(text, m.index, m[0].length),
      value: parseScaledNumber(m[1]),
      unit: 'cores',
      scope: hardnessInfo.scope
    });
  }

  const socketMatch = text.match(/\b(single|dual|quad|\d+)\s*-?\s*(?:sockets?|cpus?|processors?)\b/i);
  if (socketMatch) {
    const wordMap = { single: 1, dual: 2, quad: 4 };
    const rawVal = socketMatch[1].toLowerCase();
    const val = wordMap[rawVal] || parseScaledNumber(rawVal);
    if (val) {
      out.push({
        _pos: socketMatch.index,
        domain: 'COMPUTE',
        metric: 'sockets',
        comparator: detectLocalComparator(text, socketMatch.index, socketMatch[0].length),
        value: val,
        unit: 'sockets',
        scope: SCOPE_TYPES.PER_NODE
      });
    }
  }

  const nodeRe = /\b(\d[\d,]*)\s*(?:x\s*)?(?:compute\s+|worker\s+|gpu\s+)?(nodes?|servers?|hosts?|blades?)\b/gi;
  while ((m = nodeRe.exec(text)) !== null) {
    const before = text.slice(Math.max(0, m.index - 12), m.index);
    if (/\b(?:per|each)\s*$/i.test(before)) continue;
    out.push({
      _pos: m.index,
      domain: 'COMPUTE',
      metric: 'nodeCount',
      comparator: detectLocalComparator(text, m.index, m[0].length),
      value: parseScaledNumber(m[1]),
      unit: 'nodes',
      scope: SCOPE_TYPES.PER_CLUSTER
    });
  }

  const uRe = /\b(\d+(?:\.\d+)?)\s*(?:U|RU)\b/g;
  while ((m = uRe.exec(text)) !== null) {
    out.push({
      _pos: m.index,
      domain: 'PHYSICAL',
      metric: 'rackUnits',
      comparator: detectLocalComparator(text, m.index, m[0].length),
      value: Number(m[1]),
      unit: 'U',
      scope: SCOPE_TYPES.PER_NODE
    });
  }
  return out;
}

function _localCapacitySubphrase(text, matchIndex, matchEnd) {
  const before = text.slice(Math.max(0, matchIndex - 24), matchIndex);
  const after = text.slice(matchEnd, Math.min(text.length, matchEnd + 28));
  const sep = /(?:,|;|\band\b|\bwith\b|\bplus\b)/i;
  const beforeParts = before.split(sep);
  const afterParts = after.split(sep);
  const localBefore = (beforeParts[beforeParts.length - 1] || '').replace(/^.*\b\d+(?:\.\d+)?\s*(?:gb|tb|mb|gbe|w|cores?|dimms?)\b/i, '');
  const localAfter = (afterParts[0] || '').replace(/\b\d+(?:\.\d+)?\s*(?:gb|tb|mb|gbe|w|cores?|dimms?).*$/i, '');
  return { localBefore, localAfter, combined: `${localBefore} ${localAfter}` };
}

function _classifyCapacityDomain(text, matchIndex, matchEnd, unit) {
  const { localAfter, combined } = _localCapacitySubphrase(text, matchIndex, matchEnd);
  const afterMem = MEMORY_CONTEXT_RE.test(localAfter);
  const afterStor = STORAGE_CONTEXT_RE.test(localAfter);
  if (afterMem && !afterStor) return 'MEMORY';
  if (afterStor && !afterMem) return 'STORAGE';
  const mem = MEMORY_CONTEXT_RE.test(combined);
  const stor = STORAGE_CONTEXT_RE.test(combined);
  if (mem && !stor) return 'MEMORY';
  if (stor && !mem) return 'STORAGE';
  return String(unit).toUpperCase() === 'TB' ? 'STORAGE' : 'MEMORY';
}

function _extractMemoryArrayMetrics(text, hardnessInfo) {
  const out = [];
  const coveredRanges = [];
  const memArrayRe = /\b(\d+)\s*x\s*(\d[\d,]*(?:\.\d+)?)\s*(GB|TB)\b/gi;
  let m;
  while ((m = memArrayRe.exec(text)) !== null) {
    if (_classifyCapacityDomain(text, m.index, m.index + m[0].length, m[3]) !== 'MEMORY') continue;
    const count = parseScaledNumber(m[1]);
    const eachVal = parseScaledNumber(m[2]);
    if (!count || eachVal === null) continue;
    const eachGb = m[3].toUpperCase() === 'TB' ? eachVal * 1024 : eachVal;
    coveredRanges.push([m.index, m.index + m[0].length]);
    out.push(
      { _pos: m.index, domain: 'MEMORY', metric: 'dimmCount', comparator: detectLocalComparator(text, m.index, m[0].length), value: count, unit: 'DIMMs', scope: hardnessInfo.scope },
      { _pos: m.index + 1, domain: 'MEMORY', metric: 'ramCapacityGb', comparator: detectLocalComparator(text, m.index, m[0].length), value: count * eachGb, unit: 'GB', scope: hardnessInfo.isPerNode ? SCOPE_TYPES.PER_NODE : hardnessInfo.scope }
    );
  }
  return { out, coveredRanges };
}

function _extractMemoryMetrics(text, hardnessInfo) {
  const { out, coveredRanges } = _extractMemoryArrayMetrics(text, hardnessInfo);
  const dimmRe = /\b(\d[\d,]*)\s*(?:x\s*)?(?:DIMMs?|RDIMMs?|LRDIMMs?|MRDIMMs?|memory\s+modules?)\b/gi;
  let m;
  while ((m = dimmRe.exec(text)) !== null) {
    out.push({
      _pos: m.index,
      domain: 'MEMORY',
      metric: 'dimmCount',
      comparator: detectLocalComparator(text, m.index, m[0].length),
      value: parseScaledNumber(m[1]),
      unit: 'DIMMs',
      scope: hardnessInfo.scope
    });
  }

  const capRe = /\b(\d[\d,]*(?:\.\d+)?)\s*(GB|TB)\b/gi;
  while ((m = capRe.exec(text)) !== null) {
    if (coveredRanges.some(([s, e]) => m.index >= s && m.index < e)) continue;
    if (_classifyCapacityDomain(text, m.index, m.index + m[0].length, m[2]) !== 'MEMORY') continue;
    const rawNum = parseScaledNumber(m[1]);
    if (rawNum === null) continue;
    const gb = m[2].toUpperCase() === 'TB' ? rawNum * 1024 : rawNum;
    out.push({
      _pos: m.index,
      domain: 'MEMORY',
      metric: 'ramCapacityGb',
      comparator: detectLocalComparator(text, m.index, m[0].length),
      value: gb,
      unit: 'GB',
      scope: hardnessInfo.isPerNode ? SCOPE_TYPES.PER_NODE : hardnessInfo.scope
    });
  }
  return out;
}

function _extractStorageArraySpec(text, hardnessInfo, raidLevel) {
  const arrayMatch = text.match(/\b(\d+)\s*x\s*(\d[\d,]*(?:\.\d+)?)\s*(GB|TB)\b/i);
  if (!arrayMatch) return null;
  if (_classifyCapacityDomain(text, arrayMatch.index, arrayMatch.index + arrayMatch[0].length, arrayMatch[3]) !== 'STORAGE') {
    return null;
  }
  const count = parseScaledNumber(arrayMatch[1]);
  const singleNum = parseScaledNumber(arrayMatch[2]);
  if (!count || !singleNum) return null;
  const driveSizeTb = arrayMatch[3].toUpperCase() === 'GB' ? Number((singleNum / 1000).toFixed(4)) : singleNum;
  const rawStorageTb = Number((count * driveSizeTb).toFixed(4));
  const raidCalc = raidLevel ? computeUsableStorageTb({ driveCount: count, driveSizeTb, raidLevel }) : null;
  return {
    _pos: arrayMatch.index,
    domain: 'STORAGE',
    metric: 'rawStorageTb',
    comparator: detectLocalComparator(text, arrayMatch.index, arrayMatch[0].length),
    value: rawStorageTb,
    unit: 'TB',
    driveCount: count,
    driveSizeTb,
    raidLevel,
    computedUsableTb: raidCalc?.valid ? raidCalc.usableStorageTb : null,
    physicalImpossibility: raidCalc ? raidCalc.physicalImpossibility : false,
    impossibilityReason: raidCalc?.reason || null,
    scope: hardnessInfo.scope
  };
}

function _extractStorageMetrics(text, hardnessInfo) {
  const out = [];
  const raidMatch = text.match(/\bRAID\s*-?\s*(1\+0|10|50|60|0|1|5|6)\b/i);
  const raidLevel = raidMatch ? normalizeRaidLevel(raidMatch[0]) : null;
  if (raidLevel) {
    out.push({ _pos: raidMatch.index, domain: 'STORAGE', metric: 'raidLevel', comparator: COMPARATORS.EXACT, value: raidLevel, unit: 'RAID', scope: hardnessInfo.scope });
  }

  const arraySpec = _extractStorageArraySpec(text, hardnessInfo, raidLevel);
  if (arraySpec) {
    out.push(arraySpec);
    return out;
  }

  const capRe = /\b(\d[\d,]*(?:\.\d+)?)\s*(GB|TB)\b/gi;
  let m;
  while ((m = capRe.exec(text)) !== null) {
    if (_classifyCapacityDomain(text, m.index, m.index + m[0].length, m[2]) !== 'STORAGE') continue;
    const rawNum = parseScaledNumber(m[1]);
    if (rawNum === null) continue;
    const tb = m[2].toUpperCase() === 'GB' ? Number((rawNum / 1000).toFixed(4)) : rawNum;
    const localSub = _localCapacitySubphrase(text, m.index, m.index + m[0].length).combined;
    const isUsable = /\b(?:usable|net|effective|formatted|after\s+raid|after\s+parity)\b/i.test(localSub);
    out.push({
      _pos: m.index,
      domain: 'STORAGE',
      metric: isUsable ? 'usableStorageTb' : 'rawStorageTb',
      comparator: detectLocalComparator(text, m.index, m[0].length),
      value: tb,
      unit: 'TB',
      raidLevel,
      scope: hardnessInfo.scope
    });
  }
  return out;
}

function _matchNetworkPortCount(text) {
  const direct = text.match(/\b(dual|quad|\d+)\s*-?\s*ports?\b/i)
    || text.match(/\b(\d+)\s*x\s*\d+(?:\.\d+)?\s*(?:GbE|Gbps)\b/i);
  if (direct) return direct;
  if (!/\b(?:optics?|transceivers?|sfp\w*|qsfp\w*|osfp\w*)\b/i.test(text)) return null;
  return text.match(/\b(\d+)\s*(?:x\s*)?(?:spare|shared)\b/i)
    || text.match(/\b(\d+)\s+(?:spare|shared)\s+.*\b(?:optics?|transceivers?|sfp\w*|qsfp\w*|ports?)\b/i);
}

function _extractNetworkMetrics(text, hardnessInfo) {
  const out = [];
  const speedRe = /\b(\d+(?:\.\d+)?)\s*(?:GbE|Gbps)\b/gi;
  let m;
  while ((m = speedRe.exec(text)) !== null) {
    out.push({
      domain: 'NETWORK',
      metric: 'speedGbps',
      comparator: detectLocalComparator(text, m.index, m[0].length),
      value: Number(m[1]),
      unit: 'Gbps',
      rawUnit: m[0].replace(/^[\d.\s]+/, ''),
      scope: hardnessInfo.scope,
      isSpare: hardnessInfo.isSpare,
      isShared: hardnessInfo.isShared
    });
  }

  const portMatch = _matchNetworkPortCount(text);
  if (portMatch) {
    const wordMap = { dual: 2, quad: 4 };
    const val = wordMap[portMatch[1].toLowerCase()] || parseScaledNumber(portMatch[1]);
    if (val) {
      out.push({
        domain: 'NETWORK',
        metric: hardnessInfo.isSpare ? 'spareOpticsCount' : 'portCount',
        comparator: detectLocalComparator(text, portMatch.index, portMatch[0].length),
        value: val,
        unit: hardnessInfo.isSpare ? 'optics' : 'ports',
        scope: hardnessInfo.scope,
        isSpare: hardnessInfo.isSpare,
        isShared: hardnessInfo.isShared
      });
    }
  }
  return out;
}

function _extractPowerAndRedundancyMetrics(text, hardnessInfo) {
  const out = [];
  const wattRe = /\b(\d[\d,]*)\s*(?:W|watts?)\b/gi;
  let m;
  while ((m = wattRe.exec(text)) !== null) {
    out.push({
      domain: 'POWER',
      metric: 'powerWatts',
      comparator: detectLocalComparator(text, m.index, m[0].length),
      value: parseScaledNumber(m[1]),
      unit: 'W',
      scope: hardnessInfo.scope
    });
  }

  const redMatch = text.match(/\b(2N|N\+1|N\+N|1\+1|2\+2)\b/i);
  if (redMatch) {
    out.push({
      domain: 'POWER',
      metric: 'redundancyMode',
      comparator: COMPARATORS.EXACT,
      value: redMatch[1].toUpperCase(),
      unit: 'REDUNDANCY',
      scope: hardnessInfo.scope
    });
  }
  return out;
}

function _extractSupportMetrics(text, hardnessInfo) {
  const out = [];
  const yearMatch = text.match(/\b(\d+)\s*-?\s*(?:years?|yrs?|y)\b/i);
  if (yearMatch && SUPPORT_CONTEXT_RE.test(text)) {
    out.push({
      domain: 'SUPPORT',
      metric: 'durationYears',
      comparator: detectLocalComparator(text, yearMatch.index, yearMatch[0].length),
      value: parseScaledNumber(yearMatch[1]),
      unit: 'years',
      scope: hardnessInfo.scope
    });
  }

  const slaMatch = text.match(/\b(Critical|Essential|Basic|4-?hour|4hr|6-?hour\s*CTR|NBD|Next\s+Business\s+Day|24x7)\b/i);
  if (slaMatch && SUPPORT_CONTEXT_RE.test(text)) {
    out.push({
      domain: 'SUPPORT',
      metric: 'slaLevel',
      comparator: COMPARATORS.EXACT,
      value: slaMatch[1].replace(/\s+/g, ' ').trim(),
      unit: 'SLA',
      scope: hardnessInfo.scope
    });
  }

  const retentionMatch = text.match(/\b(CDMR|GDMR|DMR)\b/i);
  if (retentionMatch && SUPPORT_CONTEXT_RE.test(text)) {
    out.push({
      domain: 'SUPPORT',
      metric: 'supportRetention',
      comparator: COMPARATORS.EXACT,
      value: retentionMatch[1].toUpperCase(),
      unit: 'RETENTION',
      scope: hardnessInfo.scope
    });
  }
  return out;
}

function _extractDeadlineMetrics(text, hardnessInfo) {
  const out = [];
  if (/\b(?:eol|end\s+of\s+life|clearance|warning)\b/i.test(text)) return out;
  const daysRe = /\b(\d[\d,]*)\s*(?:business\s+|calendar\s+)?days?\b/gi;
  let m;
  while ((m = daysRe.exec(text)) !== null) {
    out.push({
      domain: 'DELIVERY',
      metric: 'deliveryDeadlineDays',
      comparator: detectLocalComparator(text, m.index, m[0].length, COMPARATORS.MAX),
      value: parseScaledNumber(m[1]),
      unit: 'days',
      scope: hardnessInfo.scope
    });
  }
  return out;
}

function _extractLockAndExclusionMetrics(text, hardnessInfo) {
  const out = [];
  const skuRe = /\b(?=[A-Z0-9-]*\d)(?:[A-Z0-9]{5,8}-[A-Z0-9]{3}|[HURS][A-Z0-9]{5,7})\b/gi;
  const specRejectRe = /^(?:DDR[345]|SFP\d+|QSFP\d+|OSFP\d+|RAID\d+|GEN\d+)$/i;
  const skuHits = [];
  let sm;
  while ((sm = skuRe.exec(text)) !== null) {
    if (!specRejectRe.test(sm[0])) {
      skuHits.push({ sku: sm[0].toUpperCase(), index: sm.index });
    }
  }

  for (const hit of skuHits) {
    const localPrefix = text.slice(Math.max(0, hit.index - 32), hit.index);
    const localNoSub = NO_SUBSTITUTE_RE.test(localPrefix) || (hardnessInfo.noSubstitute && !EXCLUSION_ACTION_RE.test(localPrefix));
    const localExcl = EXCLUSION_ACTION_RE.test(localPrefix) || (hardnessInfo.hardness === HARDNESS_LEVELS.EXCLUSION && !localNoSub);
    if (localNoSub) {
      out.push({ domain: 'SKU_LOCK', metric: 'lockedSku', comparator: COMPARATORS.EXACT, value: hit.sku, unit: 'SKU', noSubstitute: true, scope: hardnessInfo.scope });
    } else if (localExcl) {
      out.push({ domain: 'EXCLUSION', metric: 'excludedSku', comparator: COMPARATORS.EXACT, value: hit.sku, unit: 'SKU', scope: hardnessInfo.scope });
    }
  }

  if (hardnessInfo.hardness === HARDNESS_LEVELS.EXCLUSION && skuHits.length === 0) {
    const termMatch = text.match(/\b(?:no|exclude|excluding|without|omit|do\s+not\s+include)\s+([a-z0-9\s-]{3,40})$/i);
    out.push({
      domain: 'EXCLUSION',
      metric: 'excludedCategory',
      comparator: COMPARATORS.EXACT,
      value: (termMatch ? termMatch[1] : text).trim().toLowerCase(),
      unit: 'CATEGORY',
      scope: hardnessInfo.scope
    });
  }
  return out;
}

function _detectCrossMetricImpossibility(metrics) {
  const rawM = metrics.find(m => m.metric === 'rawStorageTb');
  const usableM = metrics.find(m => m.metric === 'usableStorageTb');
  if (rawM && usableM && usableM.value > rawM.value) {
    usableM.physicalImpossibility = true;
    usableM.impossibilityReason = `Requested usable storage (${usableM.value} TB) exceeds raw storage (${rawM.value} TB).`;
  }
  return metrics.some(m => m.physicalImpossibility === true);
}

function parseTypedClauseValue(rawClause) {
  const text = normalizeTextUnicode(rawClause);
  const hardnessInfo = detectHardnessAndScope(text);
  const metrics = [];

  const budget = _matchBudgetCandidateOnLine(text);
  if (budget) {
    metrics.push({
      _pos: text.indexOf(budget.rawText),
      domain: 'BUDGET',
      metric: 'budgetUsd',
      comparator: budget.comparator,
      value: budget.budgetUsd,
      unit: 'USD',
      scope: budget.scope
    });
  }

  metrics.push(
    ..._extractLockAndExclusionMetrics(text, hardnessInfo),
    ..._extractComputeMetrics(text, hardnessInfo),
    ..._extractMemoryMetrics(text, hardnessInfo),
    ..._extractStorageMetrics(text, hardnessInfo),
    ..._extractNetworkMetrics(text, hardnessInfo),
    ..._extractPowerAndRedundancyMetrics(text, hardnessInfo),
    ..._extractSupportMetrics(text, hardnessInfo),
    ..._extractDeadlineMetrics(text, hardnessInfo)
  );

  metrics.sort((a, b) => (a._pos ?? 100000) - (b._pos ?? 100000));
  const cleanMetrics = metrics.map(({ _pos, ...rest }) => rest);

  const physicalImpossibility = _detectCrossMetricImpossibility(cleanMetrics);
  const primary = cleanMetrics[0] || null;
  const interpreted = cleanMetrics.length > 0;

  return {
    rawText: String(rawClause || '').trim(),
    interpreted,
    parseStatus: interpreted ? 'PARSED' : 'UNINTERPRETED',
    hardness: hardnessInfo.hardness,
    promoteToPhysicalRule: hardnessInfo.promoteToPhysicalRule,
    isHardBlocking: hardnessInfo.isHardBlocking,
    scope: primary ? (primary.scope || hardnessInfo.scope) : hardnessInfo.scope,
    scopes: hardnessInfo.scopes,
    isSpare: hardnessInfo.isSpare,
    isShared: hardnessInfo.isShared,
    isGlobal: hardnessInfo.isGlobal,
    noSubstitute: hardnessInfo.noSubstitute,
    domain: primary ? primary.domain : 'UNINTERPRETED',
    metric: primary ? primary.metric : null,
    comparator: primary ? primary.comparator : null,
    value: primary ? primary.value : null,
    unit: primary ? primary.unit : null,
    physicalImpossibility,
    extractedMetrics: cleanMetrics
  };
}

module.exports = {
  HARDNESS_LEVELS,
  COMPARATORS,
  SCOPE_TYPES,
  extractBudgetConstraint,
  parseTypedClauseValue,
  detectHardnessAndScope,
  computeUsableStorageTb,
  normalizeRaidLevel
};
