'use strict';

/**
 * scripts/lib/conflict/sizing/workload_demand.js
 *
 * SI-06: Explicit Workload Demand Modeling & VMware VCF Virtualization Sizing Pilot.
 */

const {
  computeUsableStorageTb,
  normalizeRaidLevel
} = require('../../boq/requirements/typed_values.js');
const {
  WORKLOAD_SIZING_PROFILES,
  getWorkloadReferenceProfile,
  deriveProfileDemandOverrides,
  evaluateWorkloadSpecificChecks
} = require('./workload_profiles.js');
const {
  rankClarificationsByValueOfInformation,
  collectScopedIntakeTrapAdvisories
} = require('./voi_clarification_ranker.js');

const WORKLOAD_DEMAND_SCHEMA_VERSION = '1.0';

const PROVENANCE_VALUES = Object.freeze({
  USER_FACT: 'USER_FACT',
  CITED_MEASUREMENT: 'CITED_MEASUREMENT',
  ASSUMPTION: 'ASSUMPTION',
  ESTIMATE: 'ESTIMATE',
  MISSING: 'MISSING'
});

const RESILIENCE_MODES = Object.freeze({
  NONE: 'NONE',
  N_PLUS_1: 'N+1',
  TWO_N: '2N'
});

const SUPPORTED_PILOT_WORKLOADS = new Set(['VMWARE_VCF']);

const WORKLOAD_FAMILY_PATTERNS = [
  { family: 'VMWARE_VCF', pattern: /\b(?:vmware|vsphere|vcf|esxi|vsan|virtual\s*datacenter|vmware\s*cloud\s*foundation)\b/i },
  { family: 'SAP_HANA', pattern: /\b(?:sap\s*hana|s\/?4\s*hana|bw\/?4\s*hana|hana\s*(?:db|database|in-memory))\b/i },
  { family: 'AI_INFERENCE_TRAINING', pattern: /\b(?:ai\s*(?:training|inference)|llm\s*(?:training|inference)|vllm|genai|generative\s*ai|deep\s*learning|rag\s*pipeline)\b/i },
  { family: 'MICROSOFT_SQL_OLTP', pattern: /\b(?:microsoft\s*sql|ms\s*sql|sql\s*server|oracle\s*(?:db|database|rac)|postgresql|oltp)\b/i },
  { family: 'VDI_ENTERPRISE', pattern: /\b(?:vdi|virtual\s*desktops?|horizon|citrix)\b/i },
  { family: 'BIG_DATA_KAFKA', pattern: /\b(?:kafka|spark|hadoop|cassandra|clickhouse|elasticsearch|opensearch)\b/i },
  { family: 'HPC_COMPUTE', pattern: /\b(?:hpc|supercomputing|fluid\s*dynamics|ansys|openfoam|molecular\s*dynamics)\b/i }
];

const SLA_TIER_RANKS = Object.freeze({
  CRITICAL: 4,
  '6HR_CTR': 4,
  ESSENTIAL: 3,
  '4HR': 3,
  '24X7': 3,
  BASIC: 2,
  NBD: 2,
  NONE: 0
});

const RESILIENCE_MAP = Object.freeze({
  'N+1': RESILIENCE_MODES.N_PLUS_1,
  N_PLUS_1: RESILIENCE_MODES.N_PLUS_1,
  HA_N_PLUS_1: RESILIENCE_MODES.N_PLUS_1,
  '2N': RESILIENCE_MODES.TWO_N,
  TWO_N: RESILIENCE_MODES.TWO_N,
  ACTIVE_ACTIVE_2N: RESILIENCE_MODES.TWO_N,
  NONE: RESILIENCE_MODES.NONE,
  SINGLE_NODE: RESILIENCE_MODES.NONE,
  NO_HA: RESILIENCE_MODES.NONE
});

function _pickDefined(values, fallback = null) {
  for (const val of values) {
    if (val !== undefined && val !== null && val !== '') return val;
  }
  return fallback;
}

function _isFinitePositive(val) {
  if (typeof val !== 'number') return false;
  return Number.isFinite(val) && val > 0;
}

function _toFiniteNumber(val) {
  if (val === null || val === undefined || val === '') return null;
  const cleaned = String(val).replace(/,/g, '').trim();
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function _firstFiniteNumber(values, fallback = null) {
  for (const val of values) {
    const parsed = _toFiniteNumber(val);
    if (parsed !== null) return parsed;
  }
  return fallback;
}

function _normalizeProvenanceToken(token, hasValue) {
  const upper = String(_pickDefined([token], '')).trim().toUpperCase();
  if (PROVENANCE_VALUES[upper]) return PROVENANCE_VALUES[upper];
  return hasValue ? PROVENANCE_VALUES.USER_FACT : PROVENANCE_VALUES.MISSING;
}

function _matchFamilyPattern(text) {
  const s = String(_pickDefined([text], ''));
  for (const entry of WORKLOAD_FAMILY_PATTERNS) {
    if (entry.pattern.test(s)) return entry.family;
  }
  return null;
}

function _normalizeWorkloadFamily(rawFamily, rawText = '') {
  const candidate = String(_pickDefined([rawFamily], '')).trim();
  const matched = _matchFamilyPattern(candidate);
  if (matched) return matched;
  if (candidate) {
    return candidate.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  }
  return _pickDefined([_matchFamilyPattern(rawText)], 'UNKNOWN');
}

function _normalizeResilienceMode(rawMode) {
  const text = String(_pickDefined([rawMode], '')).trim().toUpperCase().replace(/\s+/g, '');
  return _pickDefined([RESILIENCE_MAP[text]], null);
}

function _inferThroughputUnit(raw) {
  if (raw.unit) return String(raw.unit).trim();
  if (raw.vmCount !== undefined) return 'VMs';
  if (raw.iops !== undefined) return 'IOPS';
  return 'units';
}

function _normalizeThroughput(raw) {
  if (raw === null || raw === undefined) return null;
  if (_isFinitePositive(raw)) {
    return { value: raw, unit: 'units', metric: 'concurrency' };
  }
  if (typeof raw !== 'object') return null;
  const val = _firstFiniteNumber([raw.value, raw.count, raw.iops, raw.vmCount, raw.users, raw.qps]);
  if (!_isFinitePositive(val)) return null;
  const unit = _inferThroughputUnit(raw);
  const metric = String(_pickDefined([raw.metric, unit], 'units')).trim();
  return { value: val, unit, metric };
}

function _normalizeLatencySla(raw) {
  if (raw === null || raw === undefined) return null;
  if (_isFinitePositive(raw)) {
    return { maxLatencyMs: raw, percentile: 'p99', raw: `<= ${raw} ms` };
  }
  if (typeof raw !== 'object') return null;
  const ms = _firstFiniteNumber([raw.maxLatencyMs, raw.latencyMs, raw.value]);
  if (!_isFinitePositive(ms)) return null;
  return {
    maxLatencyMs: ms,
    percentile: String(_pickDefined([raw.percentile], 'p99')),
    raw: String(_pickDefined([raw.raw], `<= ${ms} ms`))
  };
}

function _normalizeGrowthFactor(rawGrowth, rawGrowthPct) {
  const direct = _toFiniteNumber(rawGrowth);
  if (direct !== null && direct >= 0) return direct;
  const pct = _toFiniteNumber(rawGrowthPct);
  if (pct !== null && pct >= 0) return Number((1 + (pct / 100)).toFixed(4));
  return null;
}

function _computeEffectiveGrowthMultiplier(growthFactor) {
  if (!_isFinitePositive(growthFactor)) return 1.0;
  if (growthFactor >= 1.0) return growthFactor;
  return Number((1 + growthFactor).toFixed(4));
}

function _emptySoftwareConstraints(constraints = []) {
  return {
    hypervisor: null,
    edition: null,
    clusteringRequired: false,
    maxCoresPerSocket: null,
    minSocketsPerNode: null,
    constraints
  };
}

function _normalizeSoftwareConstraints(raw) {
  if (!raw) return _emptySoftwareConstraints([]);
  if (Array.isArray(raw)) {
    return _emptySoftwareConstraints(raw.map(x => String(_pickDefined([x], '')).trim()).filter(Boolean));
  }
  const list = Array.isArray(raw.constraints) ? raw.constraints.map(String) : [];
  return {
    hypervisor: _pickDefined([raw.hypervisor], null),
    edition: _pickDefined([raw.edition], null),
    clusteringRequired: Boolean(raw.clusteringRequired),
    maxCoresPerSocket: _toFiniteNumber(raw.maxCoresPerSocket),
    minSocketsPerNode: _toFiniteNumber(raw.minSocketsPerNode),
    constraints: list
  };
}

function _hasSoftwareConstraintsContent(sc) {
  if (!sc) return false;
  const hasField = _pickDefined([sc.hypervisor, sc.edition, sc.maxCoresPerSocket, sc.minSocketsPerNode], null) !== null;
  return Boolean(hasField || sc.clusteringRequired || sc.constraints.length > 0);
}

function _computeParityCount(raidLevel) {
  if (raidLevel === 'RAID 5') return 1;
  if (raidLevel === 'RAID 6') return 2;
  return null;
}

function _computeRequiredRawFromUsable(usableTb, raidLevel, driveCount, hotSpares) {
  if (!_isFinitePositive(usableTb) || !raidLevel) return null;
  if (raidLevel === 'RAID 0') return usableTb;
  if (raidLevel === 'RAID 1' || raidLevel === 'RAID 10') {
    const active = _isFinitePositive(driveCount) ? (driveCount - hotSpares) : 0;
    if (active >= 2) return Number(((usableTb * 2 * driveCount) / active).toFixed(4));
    return Number((usableTb * 2).toFixed(4));
  }
  const parityCount = _computeParityCount(raidLevel);
  if (parityCount !== null && _isFinitePositive(driveCount)) {
    const dataDrives = driveCount - hotSpares - parityCount;
    if (dataDrives > 0) return Number(((usableTb * driveCount) / dataDrives).toFixed(4));
  }
  return null;
}

function _normalizeStorageSpec(rawSpec) {
  const src = (rawSpec && typeof rawSpec === 'object') ? rawSpec : {};
  const rawTb = _firstFiniteNumber([src.rawStorageTb, src.rawTb]);
  const usableTb = _firstFiniteNumber([src.usableStorageTb, src.usableTb]);
  const driveCount = _toFiniteNumber(src.driveCount);
  const driveSizeTb = _toFiniteNumber(src.driveSizeTb);
  const hotSpares = Math.max(0, _firstFiniteNumber([src.hotSpares], 0));
  const raidLevel = normalizeRaidLevel(src.raidLevel);

  const parityEvaluation = raidLevel
    ? computeUsableStorageTb({ rawStorageTb: rawTb, driveCount, driveSizeTb, raidLevel, hotSpares })
    : null;
  const derivedUsable = (parityEvaluation && parityEvaluation.valid) ? parityEvaluation.usableStorageTb : null;
  const requiredRaw = _pickDefined([rawTb, _computeRequiredRawFromUsable(usableTb, raidLevel, driveCount, hotSpares)], null);

  return {
    rawStorageTb: rawTb,
    usableStorageTb: usableTb,
    derivedUsableStorageTb: derivedUsable,
    requiredRawStorageTb: requiredRaw,
    raidLevel,
    driveCount,
    driveSizeTb,
    hotSpares,
    parityEvaluation
  };
}

function _hasStorageSpecContent(spec) {
  if (!spec) return false;
  return _pickDefined([spec.rawStorageTb, spec.usableStorageTb, spec.raidLevel, spec.driveCount], null) !== null;
}

function _normalizeFabricProtocol(rawProto) {
  const s = String(_pickDefined([rawProto], '')).trim();
  if (!s) return null;
  if (/infiniband|\bib\b|ndr|hdr/i.test(s)) return 'INFINIBAND';
  if (/roce\s*v?2|rdma/i.test(s)) return 'ROCEV2';
  if (/fibre\s*channel|\bfc\b/i.test(s)) return 'FIBRE_CHANNEL';
  if (/ethernet|gbe|tcp/i.test(s)) return 'ETHERNET';
  return s.toUpperCase();
}

function _extractFabricSpecObject(rawFabricParity, rawFabricSpec) {
  if (rawFabricParity && typeof rawFabricParity === 'object') return rawFabricParity;
  if (rawFabricSpec && typeof rawFabricSpec === 'object') return rawFabricSpec;
  return {};
}

function _normalizeFabricInput(rawFabricParity, rawFabricSpec) {
  const specObj = _extractFabricSpecObject(rawFabricParity, rawFabricSpec);
  const protocol = _normalizeFabricProtocol(specObj.protocol);
  const minSpeedGbps = _firstFiniteNumber([specObj.minSpeedGbps, specObj.speedGbps]);
  const minPortsPerNode = _firstFiniteNumber([specObj.minPortsPerNode, specObj.portsPerNode]);
  const defaultRedundant = minPortsPerNode !== null && minPortsPerNode >= 2;
  const redundancyRequired = Boolean(_pickDefined([specObj.redundancyRequired], defaultRedundant));
  const hasSpecFields = _pickDefined([protocol, minSpeedGbps, minPortsPerNode], null) !== null || redundancyRequired;
  const explicitBool = typeof rawFabricParity === 'boolean' ? rawFabricParity : specObj.required;
  const required = explicitBool !== undefined ? Boolean(explicitBool) : hasSpecFields;

  return {
    fabricParityRequired: required,
    fabricSpec: (required || hasSpecFields)
      ? { required, protocol, minSpeedGbps, minPortsPerNode, redundancyRequired }
      : null
  };
}

function _normalizeSlaTier(rawSla) {
  const s = String(_pickDefined([rawSla], '')).trim();
  if (!s) return null;
  if (/critical|6-?hour\s*ctr|6hr\s*ctr/i.test(s)) return 'CRITICAL';
  if (/essential|4-?hour|4hr|24x7/i.test(s)) return 'ESSENTIAL';
  if (/basic|nbd|next\s+business\s+day/i.test(s)) return 'BASIC';
  return s.toUpperCase();
}

function _parseServiceFromString(rawService) {
  const slaLevel = _normalizeSlaTier(rawService);
  const yrMatch = rawService.match(/\b(\d+)\s*-?\s*(?:y|yr|yrs|year|years)\b/i);
  const retMatch = rawService.match(/\b(CDMR|GDMR|DMR)\b/i);
  return {
    required: true,
    slaLevel,
    durationYears: yrMatch ? Number(yrMatch[1]) : null,
    retention: retMatch ? retMatch[1].toUpperCase() : null,
    raw: rawService
  };
}

function _normalizeExplicitService(rawService) {
  if (!rawService) return null;
  if (typeof rawService === 'string') return _parseServiceFromString(rawService);
  if (typeof rawService !== 'object' || rawService.required === false) return null;

  const slaLevel = _normalizeSlaTier(_pickDefined([rawService.slaLevel, rawService.tier, rawService.level]));
  const durationYears = _firstFiniteNumber([rawService.durationYears, rawService.years, rawService.termYears]);
  const retention = rawService.retention ? String(rawService.retention).toUpperCase() : null;
  const hasDetails = _pickDefined([slaLevel, durationYears, retention], null) !== null;
  if (!hasDetails && !rawService.required) return null;

  return {
    required: true,
    slaLevel,
    durationYears,
    retention,
    raw: _pickDefined([rawService.raw], null)
  };
}

function _normalizeAuthoritativeBasis(rawBasis) {
  if (!rawBasis || typeof rawBasis !== 'object') return null;
  const sourceId = _pickDefined([rawBasis.sourceId], null);
  const citation = _pickDefined([rawBasis.citation], null);
  const documentTitle = _pickDefined([rawBasis.documentTitle], null);
  const parameters = (rawBasis.parameters && typeof rawBasis.parameters === 'object') ? { ...rawBasis.parameters } : null;
  if (_pickDefined([sourceId, citation, documentTitle, parameters], null) === null) return null;
  return {
    basisType: String(_pickDefined([rawBasis.basisType], 'CITED_VENDOR_GUIDE')),
    sourceId,
    citation,
    documentTitle,
    observedAt: _pickDefined([rawBasis.observedAt], null),
    parameters
  };
}

function _buildDemandProvenance(fields, explicitProv = {}) {
  const p = (explicitProv && typeof explicitProv === 'object') ? explicitProv : {};
  const defaultBasisProv = fields.authoritativeSizingBasis ? 'CITED_MEASUREMENT' : null;
  return {
    workloadFamily: _normalizeProvenanceToken(p.workloadFamily, fields.workloadFamily !== 'UNKNOWN'),
    throughputOrConcurrency: _normalizeProvenanceToken(p.throughputOrConcurrency, fields.throughputOrConcurrency !== null),
    latencySla: _normalizeProvenanceToken(p.latencySla, fields.latencySla !== null),
    workingSetGb: _normalizeProvenanceToken(p.workingSetGb, fields.workingSetGb !== null),
    requiredCores: _normalizeProvenanceToken(p.requiredCores, fields.requiredCores !== null),
    growthFactor: _normalizeProvenanceToken(p.growthFactor, fields.growthFactor !== null),
    resilienceMode: _normalizeProvenanceToken(p.resilienceMode, fields.rawResilienceProvided),
    softwareConstraints: _normalizeProvenanceToken(p.softwareConstraints, _hasSoftwareConstraintsContent(fields.softwareConstraints)),
    storageSpec: _normalizeProvenanceToken(p.storageSpec, _hasStorageSpecContent(fields.storageSpec)),
    fabricParityRequired: _normalizeProvenanceToken(p.fabricParityRequired, fields.fabricSpec !== null),
    explicitServiceRequirement: _normalizeProvenanceToken(p.explicitServiceRequirement, fields.explicitServiceRequirement !== null),
    authoritativeSizingBasis: _normalizeProvenanceToken(
      _pickDefined([p.authoritativeSizingBasis, defaultBasisProv]),
      fields.authoritativeSizingBasis !== null
    )
  };
}

function _extractRawDemandFields(src, options) {
  const rawText = String(_pickDefined([src.rawText, options.rawText], ''));
  const workloadFamily = _normalizeWorkloadFamily(
    _pickDefined([src.workloadFamily, src.workloadType, src.workloadLabel]),
    rawText
  );
  const throughputOrConcurrency = _normalizeThroughput(
    _pickDefined([src.throughputOrConcurrency, src.concurrency, src.throughput])
  );
  const latencySla = _normalizeLatencySla(_pickDefined([src.latencySla, src.latencyMs]));
  const workingSetGb = _firstFiniteNumber([src.workingSetGb, src.memoryDemandGb, src.ramGb]);
  const requiredCores = _firstFiniteNumber([src.requiredCores, src.coresDemand, src.cores]);
  const growthFactor = _normalizeGrowthFactor(src.growthFactor, src.growthPct);
  const parsedResilience = _normalizeResilienceMode(_pickDefined([src.resilienceMode, src.haMode, src.redundancy]));
  const softwareConstraints = _normalizeSoftwareConstraints(src.softwareConstraints);
  const storageSpec = _normalizeStorageSpec(src.storageSpec);
  const { fabricParityRequired, fabricSpec } = _normalizeFabricInput(src.fabricParityRequired, src.fabricSpec);
  const explicitServiceRequirement = _normalizeExplicitService(
    _pickDefined([src.explicitServiceRequirement, src.serviceRequirement])
  );
  const authoritativeSizingBasis = _normalizeAuthoritativeBasis(
    _pickDefined([src.authoritativeSizingBasis, options.authoritativeSizingBasis])
  );

  return {
    workloadFamily,
    throughputOrConcurrency,
    latencySla,
    workingSetGb,
    requiredCores,
    growthFactor,
    rawResilienceProvided: parsedResilience !== null,
    resilienceMode: _pickDefined([parsedResilience], RESILIENCE_MODES.NONE),
    softwareConstraints,
    storageSpec,
    fabricParityRequired,
    fabricSpec,
    explicitServiceRequirement,
    authoritativeSizingBasis
  };
}

/**
 * Create an immutable versioned WorkloadDemandRecord (schemaVersion: '1.0').
 */
function createWorkloadDemandRecord(input = {}, options = {}) {
  const src = (input && typeof input === 'object') ? input : {};
  const safeOpts = (options && typeof options === 'object') ? options : {};
  const fields = _extractRawDemandFields(src, safeOpts);
  const provenance = _buildDemandProvenance(fields, _pickDefined([src.provenance, safeOpts.provenance], {}));

  return Object.freeze({
    schemaVersion: WORKLOAD_DEMAND_SCHEMA_VERSION,
    workloadFamily: fields.workloadFamily,
    throughputOrConcurrency: fields.throughputOrConcurrency,
    latencySla: fields.latencySla,
    workingSetGb: fields.workingSetGb,
    requiredCores: fields.requiredCores,
    growthFactor: fields.growthFactor,
    resilienceMode: fields.resilienceMode,
    softwareConstraints: Object.freeze(fields.softwareConstraints),
    storageSpec: Object.freeze(fields.storageSpec),
    fabricParityRequired: fields.fabricParityRequired,
    fabricSpec: fields.fabricSpec ? Object.freeze(fields.fabricSpec) : null,
    explicitServiceRequirement: fields.explicitServiceRequirement ? Object.freeze(fields.explicitServiceRequirement) : null,
    authoritativeSizingBasis: fields.authoritativeSizingBasis ? Object.freeze(fields.authoritativeSizingBasis) : null,
    provenance: Object.freeze(provenance)
  });
}

function _parseTextThroughputAndCores(text) {
  let throughputOrConcurrency = null;
  const vmMatch = text.match(/\b(\d[\d,]*)\s*(?:vms?|virtual\s+machines?|concurrent\s+users?|users?|iops|qps|tps|req\/s)\b/i);
  if (vmMatch) {
    const val = _toFiniteNumber(vmMatch[1]);
    const unitToken = vmMatch[0].replace(vmMatch[1], '').trim();
    throughputOrConcurrency = { value: val, unit: unitToken, metric: unitToken.toLowerCase() };
  }
  const coreMatch = text.match(/\b(\d[\d,]*)\s*(?:physical\s+)?cores?\b/i);
  const requiredCores = coreMatch ? _toFiniteNumber(coreMatch[1]) : null;
  return { throughputOrConcurrency, requiredCores };
}

function _parseTextMemoryAndGrowth(text) {
  let workingSetGb = null;
  const m1 = text.match(/\b(\d[\d,]*(?:\.\d+)?)\s*(gb|tb)\s*(?:working\s+set|active\s+memory|ram|memory)\b/i);
  const m2 = text.match(/\b(?:working\s+set|ram|memory)\s*(?:of|:)?\s*(\d[\d,]*(?:\.\d+)?)\s*(gb|tb)\b/i);
  const memMatch = _pickDefined([m1, m2]);
  if (memMatch) {
    const val = _toFiniteNumber(memMatch[1]);
    workingSetGb = memMatch[2].toUpperCase() === 'TB' ? Number((val * 1024).toFixed(2)) : val;
  }
  let growthFactor = null;
  const pctGrowth = text.match(/\b(\d+(?:\.\d+)?)\s*%\s*(?:annual\s+|3-?year\s+)?growth\b/i);
  const factorGrowth = text.match(/\bgrowth\s+factor\s*(?:of|:)?\s*(\d+(?:\.\d+)?)x?\b/i);
  if (pctGrowth) growthFactor = Number((1 + (Number(pctGrowth[1]) / 100)).toFixed(4));
  else if (factorGrowth) growthFactor = Number(factorGrowth[1]);
  return { workingSetGb, growthFactor };
}

function _toTbValue(valStr, unitStr) {
  const v = _toFiniteNumber(valStr);
  return String(unitStr).toUpperCase() === 'GB' ? v / 1000 : v;
}

function _parseTextStorageAndResilience(text) {
  let resilienceMode = null;
  if (/\b2n\b/i.test(text)) resilienceMode = '2N';
  else if (/\bn\s*\+\s*1\b/i.test(text)) resilienceMode = 'N+1';
  else if (/\b(?:no\s+ha|single[-\s]node|non[-\s]redundant)\b/i.test(text)) resilienceMode = 'NONE';

  const raidMatch = text.match(/\b(raid\s*(?:0|1|5|6|10|50|60))\b/i);
  const usableMatch = text.match(/\b(\d[\d,]*(?:\.\d+)?)\s*(tb|gb)\s*usable\b/i);
  const rawMatch = text.match(/\b(\d[\d,]*(?:\.\d+)?)\s*(tb|gb)\s*raw\b/i);
  const driveArrayMatch = text.match(/\b(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*(tb|gb)\s*(?:nvme|sas|sata|ssd|hdd)\b/i);

  const storageSpec = {};
  if (raidMatch) storageSpec.raidLevel = normalizeRaidLevel(raidMatch[1]);
  if (usableMatch) storageSpec.usableStorageTb = _toTbValue(usableMatch[1], usableMatch[2]);
  if (rawMatch) storageSpec.rawStorageTb = _toTbValue(rawMatch[1], rawMatch[2]);
  if (driveArrayMatch) {
    storageSpec.driveCount = Number(driveArrayMatch[1]);
    storageSpec.driveSizeTb = _toTbValue(driveArrayMatch[2], driveArrayMatch[3]);
  }
  return { resilienceMode, storageSpec: Object.keys(storageSpec).length > 0 ? storageSpec : null };
}

function _parsePortToken(token) {
  if (!token) return null;
  const lower = token.toLowerCase();
  if (lower === 'dual') return 2;
  if (lower === 'quad') return 4;
  return _toFiniteNumber(lower);
}

function _parseTextFabricSpec(text) {
  const speedMatch = text.match(/\b(10|25|40|50|100|200|400)\s*(?:gbe|gbps|gb\s*fc|g\s*ib)\b/i);
  const protoMatch = text.match(/\b(roce\s*v?2|infiniband|fibre\s*channel|\bfc\b)\b/i);
  const hasFabricKeyword = /\bfabric\s+parity\b/i.test(text);
  if (!speedMatch && !protoMatch && !hasFabricKeyword) return null;

  const portsMatch = text.match(/\b(dual|quad|\d+)[-\s]*ports?\b/i);
  const ports = portsMatch ? _parsePortToken(portsMatch[1]) : null;
  const defaultProto = (speedMatch && /fc/i.test(speedMatch[0])) ? 'FIBRE_CHANNEL' : 'ETHERNET';
  const protocol = protoMatch ? _normalizeFabricProtocol(protoMatch[1]) : defaultProto;

  return {
    required: true,
    protocol,
    minSpeedGbps: speedMatch ? Number(speedMatch[1]) : null,
    minPortsPerNode: ports,
    redundancyRequired: Boolean((ports && ports >= 2) || /\b(?:dual[-\s]*port|redundant\s+fabric)\b/i.test(text))
  };
}

function _parseTextFabricLatencyAndService(text) {
  const latMatch = text.match(/(?:<=|\u2264|under|sub-?|\bmax\s+)(\d+(?:\.\d+)?)\s*ms\b/i);
  const latencySla = latMatch ? { maxLatencyMs: Number(latMatch[1]), percentile: 'p99', raw: latMatch[0] } : null;
  const fabricSpec = _parseTextFabricSpec(text);
  const hasServiceContext = /\b(?:tech\s*care|pointnext|support|sla|cdmr|gdmr|4-?hour|24x7)\b/i.test(text);
  const hasServiceLevel = /\b(?:critical|essential|basic|\d+\s*-?\s*(?:yr|year|y)\b|4-?hour|24x7|cdmr)\b/i.test(text);
  const explicitServiceRequirement = (hasServiceContext && hasServiceLevel) ? _normalizeExplicitService(text) : null;
  return { latencySla, fabricSpec, explicitServiceRequirement };
}

function _extractDemandFromTextString(text, options = {}) {
  const parsedTp = _parseTextThroughputAndCores(text);
  const parsedMem = _parseTextMemoryAndGrowth(text);
  const parsedSto = _parseTextStorageAndResilience(text);
  const parsedFab = _parseTextFabricLatencyAndService(text);
  const fabricSpec = _pickDefined([options.fabricSpec, parsedFab.fabricSpec]);

  return createWorkloadDemandRecord({
    rawText: text,
    workloadFamily: _pickDefined([options.workloadFamily, _normalizeWorkloadFamily('', text)]),
    throughputOrConcurrency: _pickDefined([options.throughputOrConcurrency, parsedTp.throughputOrConcurrency]),
    requiredCores: _pickDefined([options.requiredCores, parsedTp.requiredCores]),
    workingSetGb: _pickDefined([options.workingSetGb, parsedMem.workingSetGb]),
    growthFactor: _pickDefined([options.growthFactor, parsedMem.growthFactor]),
    resilienceMode: _pickDefined([options.resilienceMode, parsedSto.resilienceMode]),
    storageSpec: _pickDefined([options.storageSpec, parsedSto.storageSpec]),
    latencySla: _pickDefined([options.latencySla, parsedFab.latencySla]),
    fabricParityRequired: _pickDefined([options.fabricParityRequired], Boolean(fabricSpec)),
    fabricSpec,
    explicitServiceRequirement: _pickDefined([options.explicitServiceRequirement, parsedFab.explicitServiceRequirement]),
    softwareConstraints: _pickDefined([options.softwareConstraints], null),
    authoritativeSizingBasis: _pickDefined([options.authoritativeSizingBasis], null)
  }, options);
}

/**
 * Extract a WorkloadDemandRecord from raw text, clauses, or structured input object.
 */
function extractWorkloadDemand(input = '', options = {}) {
  const safeOpts = (options && typeof options === 'object') ? options : {};
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    if (input.schemaVersion === WORKLOAD_DEMAND_SCHEMA_VERSION && input.provenance) {
      return input;
    }
    const rawText = String(_pickDefined([input.rawText, input.queryText, safeOpts.rawText], ''));
    const baseFromText = rawText ? _extractDemandFromTextString(rawText, {}) : {};
    return createWorkloadDemandRecord({ ...baseFromText, ...input, rawText }, safeOpts);
  }
  const text = Array.isArray(input) ? input.join('\n') : String(_pickDefined([input], ''));
  return _extractDemandFromTextString(text, safeOpts);
}

function _resolveEffectiveCoresDemand(demandRecord) {
  if (_isFinitePositive(demandRecord.requiredCores)) {
    return { cores: demandRecord.requiredCores, basis: demandRecord.provenance.requiredCores };
  }
  const tp = demandRecord.throughputOrConcurrency;
  if (tp && /^(?:cores?|pcpus?)$/i.test(tp.unit)) {
    return { cores: tp.value, basis: demandRecord.provenance.throughputOrConcurrency };
  }
  const coresPerUnit = _toFiniteNumber(demandRecord.authoritativeSizingBasis?.parameters?.coresPerUnit);
  if (tp && _isFinitePositive(coresPerUnit)) {
    return { cores: Math.ceil(tp.value * coresPerUnit), basis: PROVENANCE_VALUES.CITED_MEASUREMENT };
  }
  return { cores: null, basis: PROVENANCE_VALUES.MISSING };
}

function _findMissingCriticalInputs(demandRecord, effectiveCores, options = {}) {
  const missing = [];
  if (!_isFinitePositive(demandRecord.workingSetGb)) missing.push('workingSetGb');
  if (!_isFinitePositive(effectiveCores) && !demandRecord.throughputOrConcurrency) {
    missing.push('throughputOrConcurrency');
    missing.push('requiredCores');
  } else if (!_isFinitePositive(effectiveCores) && options.requireExplicitCores !== false) {
    missing.push('requiredCores');
  }
  if (options.requireResilienceMode === true && demandRecord.provenance.resilienceMode === PROVENANCE_VALUES.MISSING) {
    missing.push('resilienceMode');
  }
  if (options.requireStorageSpec === true && !_hasStorageSpecContent(demandRecord.storageSpec)) {
    missing.push('storageSpec');
  }
  return missing;
}

function _buildDraftScenarioRange(demandRecord, effectiveCores, missingCriticalInputs) {
  const growth = _computeEffectiveGrowthMultiplier(demandRecord.growthFactor);
  const bufferedGrowth = growth > 1.0 ? growth : 1.25;
  const minHaNodes = demandRecord.resilienceMode === 'NONE' ? 1 : 2;
  const baseMem = _isFinitePositive(demandRecord.workingSetGb) ? demandRecord.workingSetGb : null;
  const baseCores = _isFinitePositive(effectiveCores) ? effectiveCores : null;

  return {
    isDraftOnly: true,
    extrapolationRefused: true,
    basis: 'BOUNDED_SCENARIO_RANGE_PENDING_CRITICAL_INPUTS',
    unresolvedInputs: [...missingCriticalInputs],
    minimumNodesForResilience: minHaNodes,
    conservativeScenario: {
      growthMultiplier: 1.0,
      requiredWorkingSetGb: baseMem,
      requiredCores: baseCores,
      minTotalNodes: minHaNodes
    },
    growthBufferedScenario: {
      growthMultiplier: bufferedGrowth,
      growthBasis: demandRecord.growthFactor !== null ? demandRecord.provenance.growthFactor : 'SCENARIO_BOUND_ONLY',
      requiredWorkingSetGb: baseMem !== null ? Number((baseMem * bufferedGrowth).toFixed(2)) : null,
      requiredCores: baseCores !== null ? Math.ceil(baseCores * bufferedGrowth) : null,
      minTotalNodes: Math.max(minHaNodes, 3)
    }
  };
}

function _computeNodesForResilienceMode(mode, requiredSurvivingNodes, candidateTotalNodes) {
  let recommendedTotalNodes = requiredSurvivingNodes;
  if (mode === '2N') recommendedTotalNodes = requiredSurvivingNodes * 2;
  else if (mode === 'N+1') recommendedTotalNodes = requiredSurvivingNodes + 1;

  const totalNodes = _pickDefined([candidateTotalNodes], recommendedTotalNodes);
  let survivingNodes = totalNodes;
  if (mode === '2N') survivingNodes = Math.floor(totalNodes / 2);
  else if (mode === 'N+1') survivingNodes = Math.max(0, totalNodes - 1);

  return {
    recommendedTotalNodes,
    totalNodes,
    survivingNodes,
    failedNodes: Math.max(0, totalNodes - survivingNodes)
  };
}

function _findMissingNodeCapacityFields(perNodeMemoryGb, perNodeCores) {
  const missing = [];
  if (!_isFinitePositive(perNodeMemoryGb)) missing.push('perNodeMemoryGb');
  if (!_isFinitePositive(perNodeCores)) missing.push('perNodeCores');
  return missing;
}

function _buildUnknownResilienceCapacity(mode, perNodeMemoryGb, perNodeCores, candNodes, effectiveWorkingSetGb, effectiveRequiredCores, missingFields) {
  return {
    status: 'UNKNOWN',
    resilienceMode: mode,
    totalNodes: candNodes,
    failedNodesSimulated: null,
    survivingNodes: null,
    requiredSurvivingNodes: null,
    recommendedTotalNodes: null,
    perNodeMemoryGb: _isFinitePositive(perNodeMemoryGb) ? perNodeMemoryGb : null,
    perNodeCores: _isFinitePositive(perNodeCores) ? perNodeCores : null,
    totalMemoryGb: null,
    survivingMemoryGb: null,
    effectiveWorkingSetGb,
    memoryDeficitGb: null,
    totalCores: null,
    survivingCores: null,
    effectiveRequiredCores,
    coresDeficit: null,
    memoryPass: false,
    coresPass: false,
    missingNodeCapacityFields: missingFields,
    pass: false
  };
}

function _evaluateResilienceCapacityMath(demandRecord, effectiveWorkingSetGb, effectiveRequiredCores, candidate = {}) {
  const perNodeMemoryGb = _firstFiniteNumber([candidate.perNodeMemoryGb, candidate.nodeMemoryGb]);
  const perNodeCores = _firstFiniteNumber([candidate.perNodeCores, candidate.nodeCores]);
  const mode = _pickDefined([demandRecord.resilienceMode], RESILIENCE_MODES.NONE);
  const candNodes = _firstFiniteNumber([candidate.totalNodes, candidate.nodeCount]);
  const missingFields = _findMissingNodeCapacityFields(perNodeMemoryGb, perNodeCores);
  if (missingFields.length > 0) {
    return _buildUnknownResilienceCapacity(
      mode,
      perNodeMemoryGb,
      perNodeCores,
      candNodes,
      effectiveWorkingSetGb,
      effectiveRequiredCores,
      missingFields
    );
  }

  const minSurvivingForMem = Math.max(1, Math.ceil(effectiveWorkingSetGb / perNodeMemoryGb));
  const minSurvivingForCores = _isFinitePositive(effectiveRequiredCores)
    ? Math.max(1, Math.ceil(effectiveRequiredCores / perNodeCores))
    : 1;
  const requiredSurvivingNodes = Math.max(minSurvivingForMem, minSurvivingForCores);
  const nodeCounts = _computeNodesForResilienceMode(mode, requiredSurvivingNodes, candNodes);

  const totalMemoryGb = nodeCounts.totalNodes * perNodeMemoryGb;
  const survivingMemoryGb = nodeCounts.survivingNodes * perNodeMemoryGb;
  const totalCores = nodeCounts.totalNodes * perNodeCores;
  const survivingCores = nodeCounts.survivingNodes * perNodeCores;

  const memoryPass = survivingMemoryGb >= effectiveWorkingSetGb;
  const coresPass = !_isFinitePositive(effectiveRequiredCores) || survivingCores >= effectiveRequiredCores;
  const pass = nodeCounts.survivingNodes > 0 && memoryPass && coresPass;

  return {
    status: pass ? 'PASS' : 'FAIL',
    resilienceMode: mode,
    totalNodes: nodeCounts.totalNodes,
    failedNodesSimulated: nodeCounts.failedNodes,
    survivingNodes: nodeCounts.survivingNodes,
    requiredSurvivingNodes,
    recommendedTotalNodes: nodeCounts.recommendedTotalNodes,
    perNodeMemoryGb,
    perNodeCores,
    totalMemoryGb,
    survivingMemoryGb,
    effectiveWorkingSetGb,
    memoryDeficitGb: memoryPass ? 0 : Number((effectiveWorkingSetGb - survivingMemoryGb).toFixed(2)),
    totalCores,
    survivingCores,
    effectiveRequiredCores,
    coresDeficit: coresPass ? 0 : (effectiveRequiredCores - survivingCores),
    memoryPass,
    coresPass,
    missingNodeCapacityFields: [],
    pass
  };
}

function _classifyNumaMode(is1Dpc, is2Dpc, isSupported) {
  if (is1Dpc) {
    return {
      status: 'PASS_BALANCED',
      interleavingMode: '1DPC_BALANCED_OPTIMAL',
      tradeoffClassification: 'PEAK_BANDWIDTH_1DPC'
    };
  }
  if (is2Dpc) {
    return {
      status: 'PASS_BALANCED',
      interleavingMode: '2DPC_BALANCED_MAX_CAPACITY',
      tradeoffClassification: 'MAX_CAPACITY_2DPC_SPEED_STEPDOWN_TRADEOFF'
    };
  }
  if (isSupported) {
    return {
      status: 'WARN_PARTIAL_CHANNELS',
      interleavingMode: 'PARTIAL_INTERLEAVED',
      tradeoffClassification: 'SUBOPTIMAL_CHANNEL_BANDWIDTH'
    };
  }
  return {
    status: 'FAIL_UNBALANCED',
    interleavingMode: 'UNBALANCED',
    tradeoffClassification: 'UNBALANCED_NUMA_VIOLATION'
  };
}

function _evaluateCandidateNumaTradeoff(candidate = {}) {
  const cpuSockets = _firstFiniteNumber([candidate.cpuSocketsPerNode, candidate.cpuSockets, candidate.cpuCount], 2);
  const dimmCount = _firstFiniteNumber([candidate.perNodeDimms, candidate.dimmCount, candidate.memoryDimmCount]);
  const channelWidth = _firstFiniteNumber([candidate.channelWidth, candidate.detectedChannelWidth]);
  const perNodeMemoryGb = _firstFiniteNumber([candidate.perNodeMemoryGb, candidate.totalMemoryGb]);

  if (dimmCount === null) {
    return { status: 'NOT_PROVIDED', pass: true, interleavingMode: 'NOT_PROVIDED', tradeoffNote: null };
  }
  const dimmsPerSocket = cpuSockets > 0 ? dimmCount / cpuSockets : 0;
  const isSocketSymmetric = cpuSockets > 0 && dimmCount > 0 && (dimmCount % cpuSockets === 0);

  if (!_isFinitePositive(channelWidth)) {
    return {
      status: 'UNKNOWN_CHANNEL_WIDTH',
      pass: false,
      cpuSockets,
      dimmCount,
      dimmsPerSocket,
      channelWidth: null,
      isSocketSymmetric,
      interleavingMode: 'UNKNOWN_CHANNEL_WIDTH',
      tradeoffNote: 'CPU memory channel width is unknown; refusing to assume 8-channel interleaving.'
    };
  }

  const is1Dpc = isSocketSymmetric && dimmsPerSocket === channelWidth;
  const is2Dpc = isSocketSymmetric && dimmsPerSocket === channelWidth * 2;
  const isSupported = isSocketSymmetric && [1, 2, 4, channelWidth, channelWidth * 2].includes(dimmsPerSocket);
  const classified = _classifyNumaMode(is1Dpc, is2Dpc, isSupported);

  return {
    ...classified,
    pass: isSupported,
    isBalancedInterleaving: is1Dpc || is2Dpc,
    is1DpcBalanced: is1Dpc,
    is2DpcBalanced: is2Dpc,
    isSocketSymmetric,
    cpuSockets,
    dimmCount,
    dimmsPerSocket,
    channelWidth,
    perNodeMemoryGb
  };
}

function _resolveStorageCheckInputs(reqSpec, candidate = {}) {
  const candStorage = _pickDefined([candidate.storage, candidate.storageSpec], {});
  const raidLevel = normalizeRaidLevel(_pickDefined([candStorage.raidLevel, reqSpec?.raidLevel]));
  const driveCount = _firstFiniteNumber([candStorage.driveCount, reqSpec?.driveCount]);
  const driveSizeTb = _firstFiniteNumber([candStorage.driveSizeTb, reqSpec?.driveSizeTb]);
  const derivedRaw = (driveCount !== null && driveSizeTb !== null) ? Number((driveCount * driveSizeTb).toFixed(4)) : null;
  const rawStorageTb = _firstFiniteNumber([candStorage.rawStorageTb, derivedRaw, reqSpec?.rawStorageTb]);
  const hotSpares = Math.max(0, _firstFiniteNumber([candStorage.hotSpares, reqSpec?.hotSpares], 0));
  return { candStorage, raidLevel, driveCount, driveSizeTb, rawStorageTb, hotSpares };
}

function _resolveStorageFailureReason(raidValid, raidReason, usablePass, rawPass) {
  if (!raidValid) return _pickDefined([raidReason], 'INVALID_RAID_TOPOLOGY');
  if (!usablePass) return 'INSUFFICIENT_USABLE_STORAGE_AFTER_RAID_OVERHEAD';
  if (!rawPass) return 'INSUFFICIENT_RAW_STORAGE';
  return null;
}

function _computeRaidAssessment(sIn, reqSpec) {
  const raidEval = sIn.raidLevel
    ? computeUsableStorageTb({
      rawStorageTb: sIn.rawStorageTb,
      driveCount: sIn.driveCount,
      driveSizeTb: sIn.driveSizeTb,
      raidLevel: sIn.raidLevel,
      hotSpares: sIn.hotSpares
    })
    : null;
  const raidValid = !sIn.raidLevel || Boolean(raidEval && raidEval.valid);
  const evalUsable = (raidEval && raidEval.valid) ? raidEval.usableStorageTb : null;
  const candidateUsableTb = _firstFiniteNumber([sIn.candStorage.usableStorageTb, evalUsable]);
  const requiredUsableTb = _firstFiniteNumber([reqSpec?.usableStorageTb, reqSpec?.derivedUsableStorageTb]);
  const requiredRawTb = _toFiniteNumber(reqSpec?.rawStorageTb);
  return { raidEval, raidValid, candidateUsableTb, requiredUsableTb, requiredRawTb };
}

function _isThresholdMet(requiredVal, candidateVal) {
  if (requiredVal === null) return true;
  if (candidateVal === null) return false;
  return candidateVal >= requiredVal;
}

function _computeStorageDiffOrNull(a, b, shouldCompute) {
  if (!shouldCompute || a === null || b === null) return null;
  return Number((a - b).toFixed(4));
}

function _evaluateStorageRaidCheck(demandRecord, candidate = {}) {
  const reqSpec = demandRecord.storageSpec;
  const sIn = _resolveStorageCheckInputs(reqSpec, candidate);
  if (!_hasStorageSpecContent(reqSpec) && _pickDefined([sIn.rawStorageTb, sIn.driveCount], null) === null) {
    return { status: 'NOT_APPLICABLE', pass: true };
  }

  const r = _computeRaidAssessment(sIn, reqSpec);
  const usablePass = _isThresholdMet(r.requiredUsableTb, r.candidateUsableTb);
  const rawPass = _isThresholdMet(r.requiredRawTb, sIn.rawStorageTb);
  const pass = r.raidValid && usablePass && rawPass;

  return {
    status: pass ? 'PASS' : 'FAIL',
    pass,
    raidLevel: sIn.raidLevel,
    driveCount: sIn.driveCount,
    driveSizeTb: sIn.driveSizeTb,
    hotSpares: sIn.hotSpares,
    candidateRawStorageTb: sIn.rawStorageTb,
    candidateUsableStorageTb: r.candidateUsableTb,
    parityOverheadTb: _computeStorageDiffOrNull(sIn.rawStorageTb, r.candidateUsableTb, true),
    efficiencyRatio: _pickDefined([r.raidEval?.efficiencyRatio], null),
    requiredUsableStorageTb: r.requiredUsableTb,
    requiredRawStorageTb: r.requiredRawTb,
    usableDeficitTb: _computeStorageDiffOrNull(r.requiredUsableTb, r.candidateUsableTb, !usablePass),
    reason: _resolveStorageFailureReason(r.raidValid, r.raidEval?.reason, usablePass, rawPass)
  };
}

function _checkMinThresholdViolation(reqMin, candVal, label, unit) {
  if (!_isFinitePositive(reqMin)) return null;
  if (candVal !== null && candVal >= reqMin) return null;
  return `${label} deficit: required >= ${reqMin} ${unit}, candidate has ${_pickDefined([candVal], 'UNKNOWN')} ${unit}.`;
}

function _collectFabricViolations(req, candProtocol, candSpeed, candPorts, candRedundant) {
  if (_pickDefined([candProtocol, candSpeed, candPorts], null) === null) {
    return ['Candidate fabric specification is missing while fabricParityRequired is true.'];
  }
  const violations = [];
  if (req?.protocol && candProtocol !== req.protocol) {
    violations.push(`Fabric protocol mismatch: required ${req.protocol}, candidate has ${_pickDefined([candProtocol], 'UNKNOWN')}.`);
  }
  const speedMsg = _checkMinThresholdViolation(req?.minSpeedGbps, candSpeed, 'Fabric speed', 'Gbps');
  if (speedMsg) violations.push(speedMsg);
  const portMsg = _checkMinThresholdViolation(req?.minPortsPerNode, candPorts, 'Fabric port', 'ports/node');
  if (portMsg) violations.push(portMsg);
  if (req?.redundancyRequired && !candRedundant) {
    violations.push('Fabric redundancy violation: redundant dual-path fabric required.');
  }
  return violations;
}

function _evaluateFabricParityCheck(demandRecord, candidate = {}) {
  const req = demandRecord.fabricSpec;
  if (!demandRecord.fabricParityRequired && !req) {
    return { required: false, status: 'NOT_APPLICABLE', pass: true, violations: [] };
  }
  const candFabric = _pickDefined([candidate.fabric], {});
  const candProtocol = _normalizeFabricProtocol(candFabric.protocol);
  const candSpeed = _firstFiniteNumber([candFabric.speedGbps, candFabric.minSpeedGbps]);
  const candPorts = _firstFiniteNumber([candFabric.portsPerNode, candFabric.portCount]);
  const defaultRedundant = candPorts !== null && candPorts >= 2;
  const candRedundant = Boolean(_pickDefined([candFabric.redundant], defaultRedundant));
  const violations = _collectFabricViolations(req, candProtocol, candSpeed, candPorts, candRedundant);

  return {
    required: true,
    status: violations.length === 0 ? 'PASS' : 'FAIL',
    pass: violations.length === 0,
    requiredFabric: req,
    candidateFabric: { protocol: candProtocol, speedGbps: candSpeed, portsPerNode: candPorts, redundant: candRedundant },
    violations
  };
}

function _collectServiceViolations(req, candSvc) {
  if (!candSvc) return ['Explicit support service requirement is missing from candidate.'];
  const violations = [];
  const reqRank = _pickDefined([SLA_TIER_RANKS[req.slaLevel]], 0);
  const candRank = _pickDefined([SLA_TIER_RANKS[candSvc.slaLevel]], 0);
  if (req.slaLevel && candRank < reqRank) {
    violations.push(`Support SLA downgrade: required ${req.slaLevel}, candidate has ${_pickDefined([candSvc.slaLevel], 'NONE')}.`);
  }
  if (_isFinitePositive(req.durationYears) && (candSvc.durationYears === null || candSvc.durationYears < req.durationYears)) {
    violations.push(`Support duration deficit: required >= ${req.durationYears} years, candidate has ${_pickDefined([candSvc.durationYears], 'UNKNOWN')} years.`);
  }
  if (req.retention && candSvc.retention !== req.retention) {
    violations.push(`Media retention mismatch: required ${req.retention}, candidate has ${_pickDefined([candSvc.retention], 'NONE')}.`);
  }
  return violations;
}

function _evaluateExplicitServiceCheck(demandRecord, candidate = {}) {
  const req = demandRecord.explicitServiceRequirement;
  if (!req || !req.required) {
    return { required: false, status: 'NOT_APPLICABLE', pass: true, violations: [] };
  }
  const candSvc = _normalizeExplicitService(_pickDefined([candidate.service, candidate.explicitService, candidate.supportService]));
  const violations = _collectServiceViolations(req, candSvc);

  return {
    required: true,
    status: violations.length === 0 ? 'PASS' : 'FAIL',
    pass: violations.length === 0,
    requiredService: req,
    candidateService: candSvc,
    violations
  };
}

function _appendResilienceFailure(resilience, failures) {
  if (resilience.pass) return;
  if (resilience.status === 'UNKNOWN') {
    failures.push({
      code: 'MISSING_CANDIDATE_NODE_CAPACITY',
      domain: 'COMPUTE_MEMORY_HA',
      message: `Missing candidate node capacity input(s): ${resilience.missingNodeCapacityFields.join(', ')}. Refusing to fabricate default per-node memory or core counts.`
    });
    return;
  }
  failures.push({
    code: 'N_PLUS_1_FAILOVER_CAPACITY_DEFICIT',
    domain: 'COMPUTE_MEMORY_HA',
    message: `Surviving nodes (${resilience.survivingNodes}/${resilience.totalNodes}) under ${resilience.resilienceMode} provide ${resilience.survivingMemoryGb} GB RAM and ${resilience.survivingCores} cores against required ${resilience.effectiveWorkingSetGb} GB RAM and ${_pickDefined([resilience.effectiveRequiredCores], 0)} cores.`
  });
}

function _collectPilotHardFailures(resilience, numa, storage, fabric, service) {
  const failures = [];
  _appendResilienceFailure(resilience, failures);
  if (!numa.pass) {
    failures.push({
      code: numa.status === 'UNKNOWN_CHANNEL_WIDTH' ? 'NUMA_CHANNEL_WIDTH_UNKNOWN' : 'NUMA_SYMMETRY_OR_CHANNEL_VIOLATION',
      domain: 'MEMORY_NUMA',
      message: `NUMA memory topology check failed with mode ${numa.interleavingMode}.`
    });
  }
  if (!storage.pass) {
    failures.push({
      code: _pickDefined([storage.reason], 'STORAGE_USABLE_CAPACITY_DEFICIT'),
      domain: 'STORAGE_RAID',
      message: `Usable storage ${_pickDefined([storage.candidateUsableStorageTb], 'UNKNOWN')} TB fails required usable ${_pickDefined([storage.requiredUsableStorageTb, storage.requiredRawStorageTb])} TB.`
    });
  }
  if (!fabric.pass) {
    failures.push({ code: 'FABRIC_PARITY_VIOLATION', domain: 'NETWORK_FABRIC', message: fabric.violations.join(' ') });
  }
  if (!service.pass) {
    failures.push({ code: 'EXPLICIT_SERVICE_REQUIREMENT_VIOLATION', domain: 'SUPPORT_SERVICE', message: service.violations.join(' ') });
  }
  return failures;
}

function _buildUnprofiledPilotResponse(demandRecord, effectiveBaseCores, missingCriticalInputs, options = {}) {
  const unprofiledMissing = demandRecord.authoritativeSizingBasis
    ? missingCriticalInputs
    : ['authoritativeSizingBasis', ...missingCriticalInputs];
  const { prioritizedClarifications } = rankClarificationsByValueOfInformation(unprofiledMissing, { nodeCount: demandRecord.nodeCount });
  return {
    schemaVersion: WORKLOAD_DEMAND_SCHEMA_VERSION,
    workloadFamily: demandRecord.workloadFamily,
    pilotCoverage: 'UNPROFILED_REQUIRES_AUTHORITATIVE_SIZING_BASIS',
    sizingStatus: missingCriticalInputs.length > 0
      ? 'SIZING_DRAFT_SCENARIO_RANGE'
      : 'UNPROFILED_REQUIRES_AUTHORITATIVE_SIZING_BASIS',
    isQualified: false,
    extrapolationRefused: true,
    demandRecord,
    missingCriticalInputs: unprofiledMissing,
    prioritizedClarifications,
    scopedIntakeTraps: collectScopedIntakeTrapAdvisories(options.platform || demandRecord.platform, options),
    nextRequiredInput: _pickDefined([unprofiledMissing[0]], 'authoritativeSizingBasis'),
    scenarioRange: _buildDraftScenarioRange(demandRecord, effectiveBaseCores, unprofiledMissing),
    hardConstraintFailures: [{
      code: 'UNPROFILED_WORKLOAD_FAMILY',
      domain: 'WORKLOAD_PILOT_SCOPE',
      message: `Workload "${demandRecord.workloadFamily}" is unprofiled; refusing to extrapolate performance from workload label or hardware generation.`
    }]
  };
}

function _resolveFinalPilotStatus(resilience, hardConstraintFailures, demandRecord, effectiveBaseCores) {
  const missingNodeFields = resilience.missingNodeCapacityFields || [];
  if (missingNodeFields.length > 0) {
    return {
      sizingStatus: 'SIZING_DRAFT_SCENARIO_RANGE',
      extrapolationRefused: true,
      missingCriticalInputs: missingNodeFields,
      nextRequiredInput: missingNodeFields[0],
      scenarioRange: _buildDraftScenarioRange(demandRecord, effectiveBaseCores, missingNodeFields)
    };
  }
  return {
    sizingStatus: hardConstraintFailures.length === 0 ? 'SIZED_QUALIFIED' : 'SIZED_CONSTRAINT_VIOLATION',
    extrapolationRefused: false,
    missingCriticalInputs: [],
    nextRequiredInput: null,
    scenarioRange: null
  };
}

/**
 * Evaluate the VMware VCF virtualization sizing pilot (or guard unprofiled / incomplete demands).
 * Non-pilot families require explicit authoritativeSizingBasis or options.allowReferenceProfiles === true.
 */
function evaluateWorkloadSizingPilot(demandInput = {}, candidateInput = null, options = {}) {
  const safeOpts = (options && typeof options === 'object') ? options : {};
  const demandRecord = extractWorkloadDemand(demandInput, safeOpts);
  const isSupportedPilot = SUPPORTED_PILOT_WORKLOADS.has(demandRecord.workloadFamily);
  const { cores: effectiveBaseCores } = _resolveEffectiveCoresDemand(demandRecord);
  const missingCriticalInputs = _findMissingCriticalInputs(demandRecord, effectiveBaseCores, safeOpts);

  if (!isSupportedPilot) {
    const profile = getWorkloadReferenceProfile(demandRecord.workloadFamily);
    if (profile && (safeOpts.allowReferenceProfiles === true || demandRecord.authoritativeSizingBasis !== null)) {
      return evaluateWorkloadSizingWithProfiles(demandInput, candidateInput, safeOpts);
    }
    return _buildUnprofiledPilotResponse(demandRecord, effectiveBaseCores, missingCriticalInputs, safeOpts);
  }
  if (missingCriticalInputs.length > 0) {
    const { prioritizedClarifications } = rankClarificationsByValueOfInformation(missingCriticalInputs, { nodeCount: demandRecord.nodeCount });
    return {
      schemaVersion: WORKLOAD_DEMAND_SCHEMA_VERSION,
      workloadFamily: demandRecord.workloadFamily,
      pilotCoverage: 'PILOT_SUPPORTED',
      sizingStatus: 'SIZING_DRAFT_SCENARIO_RANGE',
      isQualified: false,
      extrapolationRefused: true,
      demandRecord,
      missingCriticalInputs,
      prioritizedClarifications,
      scopedIntakeTraps: collectScopedIntakeTrapAdvisories(safeOpts.platform || demandInput?.platform, safeOpts),
      nextRequiredInput: missingCriticalInputs[0],
      scenarioRange: _buildDraftScenarioRange(demandRecord, effectiveBaseCores, missingCriticalInputs),
      hardConstraintFailures: []
    };
  }

  const growthMultiplier = _computeEffectiveGrowthMultiplier(demandRecord.growthFactor);
  const effectiveWorkingSetGb = Number((demandRecord.workingSetGb * growthMultiplier).toFixed(2));
  const effectiveRequiredCores = _isFinitePositive(effectiveBaseCores) ? Math.ceil(effectiveBaseCores * growthMultiplier) : null;
  const candidate = (candidateInput && typeof candidateInput === 'object') ? candidateInput : {};

  const resilience = _evaluateResilienceCapacityMath(demandRecord, effectiveWorkingSetGb, effectiveRequiredCores, candidate);
  const numa = _evaluateCandidateNumaTradeoff(candidate);
  const storage = _evaluateStorageRaidCheck(demandRecord, candidate);
  const fabric = _evaluateFabricParityCheck(demandRecord, candidate);
  const explicitService = _evaluateExplicitServiceCheck(demandRecord, candidate);
  const hardConstraintFailures = _collectPilotHardFailures(resilience, numa, storage, fabric, explicitService);
  const statusInfo = _resolveFinalPilotStatus(resilience, hardConstraintFailures, demandRecord, effectiveBaseCores);

  return {
    schemaVersion: WORKLOAD_DEMAND_SCHEMA_VERSION,
    workloadFamily: demandRecord.workloadFamily,
    pilotCoverage: 'PILOT_SUPPORTED',
    sizingStatus: statusInfo.sizingStatus,
    isQualified: hardConstraintFailures.length === 0,
    extrapolationRefused: statusInfo.extrapolationRefused,
    demandRecord,
    missingCriticalInputs: statusInfo.missingCriticalInputs,
    nextRequiredInput: statusInfo.nextRequiredInput,
    scenarioRange: statusInfo.scenarioRange,
    growthMultiplier,
    effectiveDemand: {
      workingSetGb: effectiveWorkingSetGb,
      requiredCores: effectiveRequiredCores,
      resilienceMode: demandRecord.resilienceMode,
      usableStorageTb: storage.requiredUsableStorageTb
    },
    recommendedCluster: {
      recommendedTotalNodes: resilience.recommendedTotalNodes,
      requiredSurvivingNodes: resilience.requiredSurvivingNodes,
      perNodeMemoryGb: resilience.perNodeMemoryGb,
      perNodeCores: resilience.perNodeCores
    },
    checks: { resilience, numa, storage, fabricParity: fabric, explicitService },
    hardConstraintFailures
  };
}

function _buildEnrichedDemandForProfile(demandInput, demandRecord, profile, options) {
  const rawObj = (demandInput && typeof demandInput === 'object' && !Array.isArray(demandInput)) ? demandInput : {};
  const derived = deriveProfileDemandOverrides(rawObj, demandRecord, profile);
  const mergedBasis = demandRecord.authoritativeSizingBasis || profile.referenceArchitecture;
  const basisProvenance = demandRecord.authoritativeSizingBasis
    ? PROVENANCE_VALUES.CITED_MEASUREMENT
    : PROVENANCE_VALUES.CITED_MEASUREMENT;
  const workingSetGb = _pickDefined([demandRecord.workingSetGb, derived.workingSetGb]);
  const requiredCores = _pickDefined([demandRecord.requiredCores, derived.requiredCores]);

  const enrichedDemand = createWorkloadDemandRecord({
    ...demandRecord,
    workingSetGb,
    requiredCores,
    authoritativeSizingBasis: mergedBasis,
    provenance: {
      ...demandRecord.provenance,
      ...derived.derivedProvenance,
      authoritativeSizingBasis: basisProvenance
    }
  }, options);

  return { enrichedDemand, rawObj, derived };
}

/**
 * Evaluate workload sizing across all 7 profiled enterprise workload families
 * using HPE Reference Architecture profiles with explicit provenance tracking.
 * Truly unknown / unlisted families still refuse extrapolation (UNPROFILED_WORKLOAD_FAMILY).
 */
function evaluateWorkloadSizingWithProfiles(demandInput = {}, candidateInput = null, options = {}) {
  const safeOpts = (options && typeof options === 'object') ? options : {};
  const baseDemand = extractWorkloadDemand(demandInput, safeOpts);
  const profile = getWorkloadReferenceProfile(baseDemand.workloadFamily);

  if (!profile) {
    const { cores: baseCores } = _resolveEffectiveCoresDemand(baseDemand);
    const missing = _findMissingCriticalInputs(baseDemand, baseCores, safeOpts);
    return _buildUnprofiledPilotResponse(baseDemand, baseCores, missing, safeOpts);
  }

  const { enrichedDemand, rawObj, derived } = _buildEnrichedDemandForProfile(demandInput, baseDemand, profile, safeOpts);
  const { cores: effectiveBaseCores } = _resolveEffectiveCoresDemand(enrichedDemand);
  const missingCriticalInputs = _findMissingCriticalInputs(enrichedDemand, effectiveBaseCores, safeOpts);

  if (missingCriticalInputs.length > 0) {
    const { prioritizedClarifications } = rankClarificationsByValueOfInformation(missingCriticalInputs, { nodeCount: enrichedDemand.nodeCount });
    return {
      schemaVersion: WORKLOAD_DEMAND_SCHEMA_VERSION,
      workloadFamily: enrichedDemand.workloadFamily,
      pilotCoverage: 'PROFILE_SUPPORTED',
      profileBasis: {
        profileFamily: profile.family,
        displayName: profile.displayName,
        referenceArchitecture: profile.referenceArchitecture,
        derivedOverrides: derived.details,
        provenance: enrichedDemand.provenance
      },
      sizingStatus: 'SIZING_DRAFT_SCENARIO_RANGE',
      isQualified: false,
      extrapolationRefused: true,
      demandRecord: enrichedDemand,
      missingCriticalInputs,
      prioritizedClarifications,
      scopedIntakeTraps: collectScopedIntakeTrapAdvisories(safeOpts.platform || rawObj?.platform, safeOpts),
      nextRequiredInput: missingCriticalInputs[0],
      scenarioRange: _buildDraftScenarioRange(enrichedDemand, effectiveBaseCores, missingCriticalInputs),
      hardConstraintFailures: []
    };
  }

  const growthMultiplier = _computeEffectiveGrowthMultiplier(enrichedDemand.growthFactor);
  const effectiveWorkingSetGb = Number((enrichedDemand.workingSetGb * growthMultiplier).toFixed(2));
  const effectiveRequiredCores = _isFinitePositive(effectiveBaseCores) ? Math.ceil(effectiveBaseCores * growthMultiplier) : null;
  const candidate = (candidateInput && typeof candidateInput === 'object') ? candidateInput : {};

  const resilience = _evaluateResilienceCapacityMath(enrichedDemand, effectiveWorkingSetGb, effectiveRequiredCores, candidate);
  const numa = _evaluateCandidateNumaTradeoff(candidate);
  const storage = _evaluateStorageRaidCheck(enrichedDemand, candidate);
  const fabric = _evaluateFabricParityCheck(enrichedDemand, candidate);
  const explicitService = _evaluateExplicitServiceCheck(enrichedDemand, candidate);
  const workloadSpecific = evaluateWorkloadSpecificChecks(profile, {
    rawInput: rawObj,
    demandRecord: enrichedDemand,
    candidate,
    resilience,
    numa,
    storage,
    effectiveWorkingSetGb,
    effectiveRequiredCores
  });

  const hardConstraintFailures = [
    ..._collectPilotHardFailures(resilience, numa, storage, fabric, explicitService),
    ...(workloadSpecific.violations || [])
  ];
  const statusInfo = _resolveFinalPilotStatus(resilience, hardConstraintFailures, enrichedDemand, effectiveBaseCores);

  return {
    schemaVersion: WORKLOAD_DEMAND_SCHEMA_VERSION,
    workloadFamily: enrichedDemand.workloadFamily,
    pilotCoverage: 'PROFILE_SUPPORTED',
    profileBasis: {
      profileFamily: profile.family,
      displayName: profile.displayName,
      referenceArchitecture: profile.referenceArchitecture,
      derivedOverrides: derived.details,
      provenance: enrichedDemand.provenance
    },
    sizingStatus: statusInfo.sizingStatus,
    isQualified: hardConstraintFailures.length === 0,
    extrapolationRefused: statusInfo.extrapolationRefused,
    demandRecord: enrichedDemand,
    missingCriticalInputs: statusInfo.missingCriticalInputs,
    nextRequiredInput: statusInfo.nextRequiredInput,
    scenarioRange: statusInfo.scenarioRange,
    growthMultiplier,
    effectiveDemand: {
      workingSetGb: effectiveWorkingSetGb,
      requiredCores: effectiveRequiredCores,
      resilienceMode: enrichedDemand.resilienceMode,
      usableStorageTb: storage.requiredUsableStorageTb
    },
    recommendedCluster: {
      recommendedTotalNodes: resilience.recommendedTotalNodes,
      requiredSurvivingNodes: resilience.requiredSurvivingNodes,
      perNodeMemoryGb: resilience.perNodeMemoryGb,
      perNodeCores: resilience.perNodeCores
    },
    checks: { resilience, numa, storage, fabricParity: fabric, explicitService, workloadSpecific },
    advisories: workloadSpecific.advisories || [],
    hardConstraintFailures
  };
}

module.exports = {
  WORKLOAD_DEMAND_SCHEMA_VERSION,
  PROVENANCE_VALUES,
  RESILIENCE_MODES,
  SUPPORTED_PILOT_WORKLOADS,
  WORKLOAD_SIZING_PROFILES,
  getWorkloadReferenceProfile,
  createWorkloadDemandRecord,
  extractWorkloadDemand,
  evaluateWorkloadSizingPilot,
  evaluateWorkloadSizingWithProfiles
};
