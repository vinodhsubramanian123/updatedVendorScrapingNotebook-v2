'use strict';
/**
 * scripts/lib/conflict/constraints/constraint_results.js
 *
 * Typed ConstraintResult (v1.0) factory, aspect adapter, and lexicographic
 * hard-before-preference evaluator.
 *
 * Guarantees:
 * - Distinct resultCategory ('CONSTRAINT_PREDICATE') separate from workflow phases.
 * - Missing domain profiles remain 'NOT_EVALUATED'; missing electrical/thermal inputs
 *   remain 'UNKNOWN' — never coerced to 'PASS'.
 * - Hard constraints are strictly evaluated before preference scoring.
 */

const CONSTRAINT_SCHEMA_VERSION = '1.0';
const RESULT_CATEGORY = 'CONSTRAINT_PREDICATE';
const CONSTRAINT_STATUSES = Object.freeze(['PASS', 'FAIL', 'UNKNOWN', 'NOT_APPLICABLE', 'NOT_EVALUATED']);
const CONSTRAINT_HARDNESS = Object.freeze(['HARD', 'PREFERENCE']);

const REQUIRED_WHEN_PRESENT_KEYS = new Set([
  'inputVoltage',
  'ambientTemp',
  'ambientTempC',
  'psuWattage',
  'cpuTdpWatts',
  'channelWidth',
  'domainProfile'
]);

const ASPECT_CONSTRAINT_SPECS = Object.freeze({
  1: 'COMPUTE_THERMAL',
  2: 'MEMORY_CHANNEL',
  3: 'STORAGE_TRI_MODE',
  4: 'PCIE_RISER',
  5: 'NETWORKING_OCP',
  6: 'POWER_ENVIRONMENT',
  7: 'SUPPORT_MANUFACTURING',
  COMPUTE_THERMAL: {
    constraintId: 'CONSTR-COMPUTE-THERMAL',
    domain: 'compute_thermal',
    owner: 'node:compute',
    defaultPredicate: { subject: 'maxCpuTdpWatts', operator: 'LTE', target: 185, unit: 'W' },
    unitMap: { maxCpuTdpWatts: 'W', thresholdWatts: 'W', fanKitCount: 'count', ambientTemp: 'C', ambientTempC: 'C' },
    evidenceRefs: ['CLIC-81354654']
  },
  MEMORY_CHANNEL: {
    constraintId: 'CONSTR-MEMORY-CHANNEL',
    domain: 'memory',
    owner: 'node:memory',
    defaultPredicate: { subject: 'memoryChannelPopulation', operator: 'MATCHES_PROFILE', target: 'SUPPORTED', unit: 'DIMMs/socket' },
    unitMap: { memoryCount: 'DIMMs', cpuCount: 'sockets', dimmsPerCpu: 'DIMMs/socket', channelsPerCpu: 'channels/socket', channelWidth: 'channels/socket' },
    evidenceRefs: ['CLIC-81354490', 'CLIC-91001655']
  },
  STORAGE_TRI_MODE: {
    constraintId: 'CONSTR-STORAGE-TOPOLOGY',
    domain: 'storage',
    owner: 'subsystem:storage',
    defaultPredicate: { subject: 'storageBackplaneAndController', operator: 'SATISFIES', target: true, unit: 'boolean' },
    unitMap: { driveCount: 'drives', backplaneCapacity: 'drives', controllerDirectCapacity: 'ports' },
    evidenceRefs: ['CLIC-81354627', 'CLIC-81354632', 'CLIC-81354652']
  },
  PCIE_RISER: {
    constraintId: 'CONSTR-PCIE-SLOTS',
    domain: 'pcie',
    owner: 'chassis:pcie',
    defaultPredicate: { subject: 'requiredPcieCards', operator: 'LTE', target: 'activeSlots', unit: 'slots' },
    unitMap: { requiredCards: 'cards', activeSlots: 'slots', totalSlots: 'slots', gpuCount: 'GPUs' },
    evidenceRefs: ['CLIC-81016755', 'CLIC-81354683']
  },
  NETWORKING_OCP: {
    constraintId: 'CONSTR-NETWORKING-OCP',
    domain: 'networking',
    owner: 'slot:ocp',
    defaultPredicate: { subject: 'ocpAdapterCount', operator: 'LTE', target: 'ocpSlotsClusterMax', unit: 'slots' },
    unitMap: { ocpAdapterCount: 'adapters', ocpSlotsClusterMax: 'slots', maxOcpSlots: 'slots', networkPortsCount: 'ports' },
    evidenceRefs: ['CLIC-81355854']
  },
  POWER_ENVIRONMENT: {
    constraintId: 'CONSTR-POWER-ENVIRONMENT',
    domain: 'power',
    owner: 'subsystem:power',
    defaultPredicate: { subject: 'psuCapacityAndCompatibility', operator: 'GTE', target: 'estimatedNodeWattage', unit: 'W' },
    unitMap: { psuCount: 'PSUs', maxWattage: 'W', maxPsuWattage: 'W', estNodeWattage: 'W', estimatedNodeWattage: 'W', inputVoltage: 'V' },
    evidenceRefs: ['POWER_ENVELOPE_AND_DERATING']
  },
  SUPPORT_MANUFACTURING: {
    constraintId: 'CONSTR-SUPPORT-LICENSING',
    domain: 'support',
    owner: 'solution:support',
    defaultPredicate: { subject: 'supportAndManagementEntitlement', operator: 'SATISFIES', target: true, unit: 'boolean' },
    unitMap: { windowsDeficit: 'cores', vmwareDeficit: 'cores' },
    evidenceRefs: ['CLIC-81322276']
  },
  SUPPORT_SERVICES: {
    constraintId: 'CONSTR-SUPPORT-LIFECYCLE',
    domain: 'support',
    owner: 'solution:lifecycle',
    defaultPredicate: { subject: 'componentLifecycleState', operator: 'NOT_IN', target: ['OBSOLETE'], unit: 'lifecycle_state' },
    unitMap: {},
    evidenceRefs: ['INV-179']
  },
  SWITCH_FABRIC_PORTS: {
    constraintId: 'CONSTR-SWITCH-FABRIC',
    domain: 'networking',
    owner: 'switch:fabric',
    defaultPredicate: { subject: 'opticDemandAndSpeed', operator: 'WITHIN_PORT_CAPABILITY', target: true, unit: 'ports' },
    unitMap: { switchCount: 'switches', totalAccessPorts: 'ports', totalUplinkPorts: 'ports', maxUplinkSpeedGb: 'Gbps' },
    evidenceRefs: ['SWITCH_FABRIC_PORT_AUDIT']
  },
  STORAGE_CONTROLLER_PAIR: {
    constraintId: 'CONSTR-STORAGE-HA-PAIR',
    domain: 'storage',
    owner: 'array:controllers',
    defaultPredicate: { subject: 'controllerNodeCount', operator: 'GTE', target: 2, unit: 'nodes' },
    unitMap: { controllerNodeCount: 'nodes', requiredNodes: 'nodes' },
    evidenceRefs: ['STORAGE_ACTIVE_ACTIVE_PAIR']
  },
  ARCHIVE_COLD_STORAGE: {
    constraintId: 'CONSTR-ARCHIVE-COLD-STORAGE',
    domain: 'archive',
    owner: 'library:tape',
    defaultPredicate: { subject: 'tapeLibraryCapacity', operator: 'SATISFIES', target: true, unit: 'slots' },
    unitMap: { libraryCount: 'libraries', totalSlotsAvailable: 'slots', maxDrivesSupported: 'drives' },
    evidenceRefs: ['ARCHIVE_TAPE_VALIDATION']
  },
  CROSS_COMPONENT_DEPENDENCIES: {
    constraintId: 'CONSTR-COMPOSITE-DEPENDENCIES',
    domain: 'composite',
    owner: 'solution:topology',
    defaultPredicate: { subject: 'compositeEnclosureAndFabricLinks', operator: 'SATISFIES', target: true, unit: 'boolean' },
    unitMap: {},
    evidenceRefs: ['COMPOSITE_TOPOLOGY_VALIDATION']
  },
  UNSUPPORTED_DOMAIN: {
    constraintId: 'CONSTR-DOMAIN-PROFILE',
    domain: 'domain_profile',
    owner: 'solution:domain',
    defaultPredicate: { subject: 'domainProfile', operator: 'EXISTS', target: true, unit: 'profile' },
    unitMap: {},
    evidenceRefs: ['DOMAIN_PROFILE_REGISTRY']
  }
});

const OBJECT_ASPECT_KEY_MAP = Object.freeze({
  computeThermal: 'COMPUTE_THERMAL',
  memoryChannel: 'MEMORY_CHANNEL',
  storageTriMode: 'STORAGE_TRI_MODE',
  pcieRiser: 'PCIE_RISER',
  networkingOcp: 'NETWORKING_OCP',
  powerEnvironment: 'POWER_ENVIRONMENT',
  supportManufacturing: 'SUPPORT_MANUFACTURING',
  supportServices: 'SUPPORT_SERVICES'
});

function _dedupeStrings(values) {
  if (!Array.isArray(values)) return [];
  const out = [];
  const seen = new Set();
  for (const val of values) {
    const str = typeof val === 'string' ? val.trim() : '';
    if (str && !seen.has(str)) {
      seen.add(str);
      out.push(str);
    }
  }
  return out;
}

function _normalizePredicate(predicate, fallbackSubject) {
  if (predicate && typeof predicate === 'object' && !Array.isArray(predicate)) {
    return {
      subject: String(predicate.subject || fallbackSubject || 'constraint'),
      operator: String(predicate.operator || 'EQ'),
      target: predicate.target !== undefined ? predicate.target : null,
      unit: predicate.unit !== undefined ? predicate.unit : null
    };
  }
  if (typeof predicate === 'string' && predicate.trim()) {
    return { subject: predicate.trim(), operator: 'SATISFIES', target: true, unit: null };
  }
  return { subject: String(fallbackSubject || 'constraint'), operator: 'SATISFIES', target: true, unit: null };
}

function _normalizeSingleInput(rawVal, fallbackUnit) {
  if (rawVal && typeof rawVal === 'object' && !Array.isArray(rawVal) && ('value' in rawVal || 'unit' in rawVal)) {
    return {
      value: rawVal.value !== undefined ? rawVal.value : null,
      unit: rawVal.unit !== undefined ? rawVal.unit : (fallbackUnit || null)
    };
  }
  return {
    value: rawVal !== undefined ? rawVal : null,
    unit: fallbackUnit || null
  };
}

function _isUnavailableValue(val) {
  return val === null || val === undefined || val === 'UNKNOWN' || (typeof val === 'number' && Number.isNaN(val));
}

function _normalizeInputs(rawInputs, unitMap = {}, explicitMissing = []) {
  const inputs = {};
  const autoMissing = [];
  if (rawInputs && typeof rawInputs === 'object' && !Array.isArray(rawInputs)) {
    for (const [key, rawVal] of Object.entries(rawInputs)) {
      const normalized = _normalizeSingleInput(rawVal, unitMap[key]);
      inputs[key] = normalized;
      const isMarkedRequired = Boolean(rawVal && typeof rawVal === 'object' && rawVal.required === true);
      if ((isMarkedRequired || REQUIRED_WHEN_PRESENT_KEYS.has(key)) && _isUnavailableValue(normalized.value)) {
        autoMissing.push(key);
      }
    }
  }
  const missingInputs = _dedupeStrings([...(Array.isArray(explicitMissing) ? explicitMissing : []), ...autoMissing]);
  return { inputs, missingInputs };
}

function _normalizeHardness(hardness) {
  const upper = String(hardness || 'HARD').toUpperCase();
  return upper === 'PREFERENCE' ? 'PREFERENCE' : 'HARD';
}

function _resolveConstraintStatus(spec, missingInputs, hardness) {
  const raw = String(spec.status || '').toUpperCase();
  if (spec.domainProfileAvailable === false || raw === 'NOT_EVALUATED' || raw === 'UNEVALUATED') {
    return 'NOT_EVALUATED';
  }
  if (raw === 'NOT_APPLICABLE') return 'NOT_APPLICABLE';
  if (raw === 'FAIL') return 'FAIL';
  if (missingInputs.length > 0 || raw === 'UNKNOWN' || raw === 'UNVERIFIED') {
    return 'UNKNOWN';
  }
  if (raw === 'WARN') {
    return hardness === 'PREFERENCE' ? 'FAIL' : 'UNKNOWN';
  }
  if (raw === 'PASS') return 'PASS';
  return 'UNKNOWN';
}

function _normalizeProof(spec, predicate, status) {
  if (spec.proof && typeof spec.proof === 'object' && !Array.isArray(spec.proof)) {
    return { ...spec.proof };
  }
  if (typeof spec.proof === 'string' && spec.proof.trim()) {
    return { summary: spec.proof.trim(), predicate, status };
  }
  const summary = spec.detail || spec.advisory || `${predicate.subject} ${predicate.operator} ${String(predicate.target)}`;
  return { summary: String(summary), predicate, status };
}

/**
 * Create a typed ConstraintResult (schemaVersion 1.0).
 *
 * @param {object} [spec={}]
 * @returns {object} Typed ConstraintResult
 */
function createConstraintResult(spec = {}) {
  const constraintId = String(spec.constraintId || spec.id || 'CONSTR-UNSPECIFIED');
  const hardness = _normalizeHardness(spec.hardness);
  const predicate = _normalizePredicate(spec.predicate, constraintId);
  const { inputs, missingInputs } = _normalizeInputs(spec.inputs, spec.unitMap, spec.missingInputs);
  const status = _resolveConstraintStatus(spec, missingInputs, hardness);

  return {
    schemaVersion: CONSTRAINT_SCHEMA_VERSION,
    resultCategory: RESULT_CATEGORY,
    constraintId,
    ruleVersion: String(spec.ruleVersion || '1.0'),
    domain: String(spec.domain || 'general').toLowerCase(),
    owner: String(spec.owner || 'solution'),
    predicate,
    inputs,
    missingInputs,
    status,
    hardness,
    requirementIds: _dedupeStrings(spec.requirementIds),
    evidenceRefs: Array.isArray(spec.evidenceRefs) ? [...spec.evidenceRefs] : [],
    proof: _normalizeProof(spec, predicate, status),
    detail: spec.detail ? String(spec.detail) : (spec.advisory ? String(spec.advisory) : null)
  };
}

function _resolveAspectSpec(checkId) {
  const mapped = ASPECT_CONSTRAINT_SPECS[checkId];
  if (typeof mapped === 'string') return ASPECT_CONSTRAINT_SPECS[mapped];
  if (mapped && typeof mapped === 'object') return mapped;
  return {
    constraintId: `CONSTR-${String(checkId || 'ASPECT').toUpperCase()}`,
    domain: 'general',
    owner: 'solution',
    defaultPredicate: { subject: String(checkId || 'aspect'), operator: 'SATISFIES', target: true, unit: 'boolean' },
    unitMap: {},
    evidenceRefs: []
  };
}

function _collectScalarResultInputs(check) {
  const raw = { ...check.inputs, ...check.operands };
  if (check.result && typeof check.result === 'object') {
    for (const [k, v] of Object.entries(check.result)) {
      if (!(k in raw) && (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string')) {
        raw[k] = v;
      }
    }
  }
  return raw;
}

function _detectMissingForCheck(check, inputs, context) {
  const missing = [...(Array.isArray(check.missingInputs) ? check.missingInputs : [])];
  const checkKey = String(check.id || '');
  const isPower = checkKey === '6' || checkKey === 'POWER_ENVIRONMENT';
  const isThermal = checkKey === '1' || checkKey === 'COMPUTE_THERMAL';

  if (isPower && check.result?.derating?.isInputVoltageUnspecified === true &&
      (check.result?.needsHighLine220v === true || context.requireInputVoltage === true)) {
    missing.push('inputVoltage');
  }
  if (isThermal && (context.ambientTemp === null || check.result?.ambientTemp === null || inputs.ambientTemp?.value === null)) {
    missing.push('ambientTempC');
  }
  if (checkKey === 'UNSUPPORTED_DOMAIN' || context.domainProfileAvailable === false) {
    missing.push('domainProfile');
  }
  return _dedupeStrings(missing);
}

function _isProfileGapCheck(check, raw, context) {
  if (check.id === 'UNSUPPORTED_DOMAIN' || context.domainProfileAvailable === false) return true;
  if (raw === 'NOT_EVALUATED' || raw === 'UNEVALUATED') return true;
  const detailText = `${check.detail || ''} ${check.advisory || ''}`;
  return /profile not loaded|no checker profile|requires an explicit chassis profile/i.test(detailText);
}

function _resolveAdaptedStatusAndHardness(check, missingInputs, context) {
  const raw = String(check.status || '').toUpperCase();
  const baseHardness = check.hardness || 'HARD';
  if (_isProfileGapCheck(check, raw, context)) return { status: 'NOT_EVALUATED', hardness: baseHardness };
  if (raw === 'NOT_APPLICABLE') return { status: 'NOT_APPLICABLE', hardness: baseHardness };
  if (raw === 'FAIL' || (Array.isArray(check.errors) && check.errors.length > 0)) {
    return { status: 'FAIL', hardness: baseHardness };
  }
  if (missingInputs.length > 0 || raw === 'UNKNOWN' || raw === 'UNVERIFIED') {
    return { status: 'UNKNOWN', hardness: baseHardness };
  }
  if (raw === 'WARN') {
    return { status: 'FAIL', hardness: check.hardness || 'PREFERENCE' };
  }
  return { status: raw === 'PASS' ? 'PASS' : 'UNKNOWN', hardness: baseHardness };
}

function _buildAdaptedProofSummary(check, status, spec) {
  if (Array.isArray(check.errors) && check.errors.length > 0) return check.errors.join('; ');
  if (check.detail) return check.detail;
  if (check.advisory) return check.advisory;
  if (check.formula) return check.formula;
  return check.equation || `${spec.constraintId}: ${status}`;
}

function _buildAdaptedConstraintProof(check, proofSummary) {
  return {
    summary: proofSummary,
    formula: check.formula || check.equation || null,
    errors: Array.isArray(check.errors) ? [...check.errors] : [],
    warnings: Array.isArray(check.warnings) ? [...check.warnings] : []
  };
}

function _adaptSingleAspectCheck(check, context = {}) {
  const spec = _resolveAspectSpec(check.id);
  const rawInputs = _collectScalarResultInputs(check);
  const missingInputs = _detectMissingForCheck(check, rawInputs, context);
  const { status, hardness } = _resolveAdaptedStatusAndHardness(check, missingInputs, context);
  const proofSummary = _buildAdaptedProofSummary(check, status, spec);

  return createConstraintResult({
    constraintId: check.constraintId || spec.constraintId,
    ruleVersion: check.ruleVersion || context.ruleVersion || '1.0',
    domain: check.domain || context.domain || spec.domain,
    owner: check.owner || context.owner || spec.owner,
    predicate: check.predicate || spec.defaultPredicate,
    inputs: rawInputs,
    unitMap: spec.unitMap,
    missingInputs,
    status,
    hardness,
    requirementIds: [...(context.requirementIds || []), ...(check.requirementIds || [])],
    evidenceRefs: [...spec.evidenceRefs, ...(check.evidenceRefs || [])],
    proof: _buildAdaptedConstraintProof(check, proofSummary),
    detail: proofSummary
  });
}

function _normalizeChecksInput(aspectChecks) {
  if (Array.isArray(aspectChecks)) {
    return { checks: aspectChecks, domain: null, capability: null };
  }
  if (!aspectChecks || typeof aspectChecks !== 'object') {
    return { checks: [], domain: null, capability: null };
  }
  if (Array.isArray(aspectChecks.checks)) {
    return {
      checks: aspectChecks.checks,
      domain: aspectChecks.domain || null,
      capability: aspectChecks.capability || null
    };
  }
  const converted = [];
  for (const [key, val] of Object.entries(aspectChecks)) {
    if (val && typeof val === 'object') {
      const mappedId = OBJECT_ASPECT_KEY_MAP[key] || key.toUpperCase();
      converted.push({ id: mappedId, ...val, result: val });
    }
  }
  return { checks: converted, domain: null, capability: null };
}

function _buildOpticalAuditInputs(opticalAudit) {
  return {
    demands: { value: opticalAudit.demands || {}, unit: 'ports' },
    supplies: { value: opticalAudit.supplies || {}, unit: 'transceivers' },
    nicPortCount: { value: (opticalAudit.opticalNics || []).length, unit: 'adapters' },
    transceiverSkuCount: { value: (opticalAudit.transceivers || []).length, unit: 'skus' }
  };
}

function _buildOpticalEndpointConstraint(opticalAudit, context = {}) {
  const mismatches = opticalAudit.mismatches || [];
  const missing = opticalAudit.missing || [];
  const deficits = opticalAudit.deficits || [];
  const issues = [...mismatches, ...missing, ...deficits];
  const isPass = opticalAudit.isCompatible === true && issues.length === 0;
  const summary = isPass ? 'Optical NIC speed tiers and transceiver form factors match endpoint demand.' : issues.join('; ');
  return createConstraintResult({
    constraintId: 'CONSTR-OPTICAL-ENDPOINT-PARITY',
    ruleVersion: context.ruleVersion || '1.0',
    domain: 'optical',
    owner: 'port:optical_endpoint',
    predicate: { subject: 'opticalEndpointSpeedAndFormFactor', operator: 'MATCHES_DEMAND', target: opticalAudit.demands || {}, unit: 'ports' },
    inputs: _buildOpticalAuditInputs(opticalAudit),
    status: isPass ? 'PASS' : 'FAIL',
    hardness: 'HARD',
    requirementIds: context.requirementIds || [],
    evidenceRefs: ['OPTICAL_LINK_ENDPOINT_AUDIT'],
    proof: { summary, mismatches, missing, deficits },
    detail: isPass ? 'Optical endpoints verified.' : issues.join('; ')
  });
}

/**
 * Adapt aspect checker outputs (array, evaluateDomainAspects object, or aspect map)
 * into typed ConstraintResult records.
 *
 * @param {Array<object>|object} aspectChecks
 * @param {object} [context={}]
 * @returns {Array<object>} Typed ConstraintResult records
 */
function adaptAspectChecksToConstraints(aspectChecks, context = {}) {
  const normalized = _normalizeChecksInput(aspectChecks);
  const effectiveContext = {
    ...context,
    domain: context.domain || normalized.domain || undefined,
    domainProfileAvailable: context.domainProfileAvailable !== undefined
      ? context.domainProfileAvailable
      : (normalized.capability?.status === 'NOT_EVALUATED' ? false : undefined)
  };

  const results = normalized.checks
    .filter(c => c && typeof c === 'object')
    .map(c => _adaptSingleAspectCheck(c, effectiveContext));

  if (effectiveContext.opticalAudit && typeof effectiveContext.opticalAudit === 'object') {
    results.push(_buildOpticalEndpointConstraint(effectiveContext.opticalAudit, effectiveContext));
  }

  const hasDomainProfileNotEval = results.some(r => r.status === 'NOT_EVALUATED');
  if (effectiveContext.domainProfileAvailable === false && !hasDomainProfileNotEval) {
    results.push(createConstraintResult({
      constraintId: 'CONSTR-DOMAIN-PROFILE',
      domain: effectiveContext.domain || 'domain_profile',
      owner: 'solution:domain',
      predicate: { subject: 'domainProfile', operator: 'EXISTS', target: true, unit: 'profile' },
      inputs: { domainProfile: { value: null, unit: 'profile' } },
      missingInputs: ['domainProfile'],
      status: 'NOT_EVALUATED',
      hardness: 'HARD',
      domainProfileAvailable: false,
      requirementIds: effectiveContext.requirementIds || [],
      evidenceRefs: ['DOMAIN_PROFILE_REGISTRY'],
      detail: `Domain profile unavailable for ${effectiveContext.domain || 'requested domain'}.`
    }));
  }

  return results;
}

function _ensureNormalizedConstraint(item) {
  if (item && typeof item === 'object' && item.resultCategory === RESULT_CATEGORY && item.schemaVersion === CONSTRAINT_SCHEMA_VERSION) {
    return item;
  }
  return createConstraintResult(item);
}

function _collectHardBlockReasons(hardFailed, hardUnknown, hardNotEvaluated) {
  const reasons = [];
  for (const c of hardFailed) {
    reasons.push(`HARD_FAIL[${c.constraintId}]: ${c.detail || c.proof?.summary || 'Failed hard constraint'}`);
  }
  for (const c of hardUnknown) {
    const missing = c.missingInputs?.length ? ` (missing: ${c.missingInputs.join(', ')})` : '';
    reasons.push(`HARD_UNKNOWN[${c.constraintId}]: ${c.detail || 'Unavailable input'}${missing}`);
  }
  for (const c of hardNotEvaluated) {
    reasons.push(`HARD_NOT_EVALUATED[${c.constraintId}]: ${c.detail || 'Missing evaluation profile'}`);
  }
  return reasons;
}

function _computeRawPreferenceScore(preferenceConstraints, optionsOrFn) {
  const scoreFn = typeof optionsOrFn === 'function'
    ? optionsOrFn
    : (typeof optionsOrFn?.preferenceScoreFn === 'function' ? optionsOrFn.preferenceScoreFn : null);
  if (scoreFn) return scoreFn(preferenceConstraints);
  if (preferenceConstraints.length === 0) return null;
  const passed = preferenceConstraints.filter(c => c.status === 'PASS').length;
  return Number((passed / preferenceConstraints.length).toFixed(4));
}

/**
 * Evaluate all HARD constraints strictly before preference scoring.
 * Any HARD failure, UNKNOWN, or NOT_EVALUATED blocks positive ranking.
 *
 * @param {Array<object>} [constraints=[]]
 * @param {object|Function} [optionsOrScoreFn={}]
 * @returns {object} Hard-before-preference evaluation ledger
 */
function evaluateHardBeforePreferences(constraints = [], optionsOrScoreFn = {}) {
  const normalized = (Array.isArray(constraints) ? constraints : []).map(_ensureNormalizedConstraint);
  const hardConstraints = normalized.filter(c => c.hardness === 'HARD');
  const preferenceConstraints = normalized.filter(c => c.hardness === 'PREFERENCE');

  const hardPassed = hardConstraints.filter(c => c.status === 'PASS');
  const hardFailed = hardConstraints.filter(c => c.status === 'FAIL');
  const hardUnknown = hardConstraints.filter(c => c.status === 'UNKNOWN');
  const hardNotEvaluated = hardConstraints.filter(c => c.status === 'NOT_EVALUATED');
  const hardNotApplicable = hardConstraints.filter(c => c.status === 'NOT_APPLICABLE');

  const blocksPositiveRanking = hardFailed.length > 0 || hardUnknown.length > 0 || hardNotEvaluated.length > 0;
  const blockReasons = _collectHardBlockReasons(hardFailed, hardUnknown, hardNotEvaluated);

  const prefPassed = preferenceConstraints.filter(c => c.status === 'PASS');
  const prefFailed = preferenceConstraints.filter(c => c.status === 'FAIL');
  const prefUnknown = preferenceConstraints.filter(c => c.status === 'UNKNOWN');
  const rawPreferenceScore = _computeRawPreferenceScore(preferenceConstraints, optionsOrScoreFn);

  return {
    schemaVersion: CONSTRAINT_SCHEMA_VERSION,
    resultCategory: RESULT_CATEGORY,
    evaluationOrder: ['HARD', 'PREFERENCE'],
    hardEvaluationCompletedBeforePreferences: true,
    blocksPositiveRanking,
    allowPositiveRanking: !blocksPositiveRanking,
    blockReasons,
    hardSummary: {
      total: hardConstraints.length,
      passCount: hardPassed.length,
      failCount: hardFailed.length,
      unknownCount: hardUnknown.length,
      notEvaluatedCount: hardNotEvaluated.length,
      notApplicableCount: hardNotApplicable.length,
      failingIds: hardFailed.map(c => c.constraintId),
      unknownIds: hardUnknown.map(c => c.constraintId),
      notEvaluatedIds: hardNotEvaluated.map(c => c.constraintId)
    },
    preferenceSummary: {
      total: preferenceConstraints.length,
      passCount: prefPassed.length,
      failCount: prefFailed.length,
      unknownCount: prefUnknown.length,
      preferenceRankEligible: !blocksPositiveRanking,
      rawPreferenceScore,
      effectivePreferenceScore: blocksPositiveRanking ? null : rawPreferenceScore
    }
  };
}

function _emptyStatusBucket() {
  return { total: 0, PASS: 0, FAIL: 0, UNKNOWN: 0, NOT_APPLICABLE: 0, NOT_EVALUATED: 0 };
}

function _resolveOverallConstraintStatus(hardCounts, counts, total) {
  if (hardCounts.FAIL > 0) return 'FAIL';
  if (hardCounts.UNKNOWN > 0) return 'UNKNOWN';
  if (hardCounts.NOT_EVALUATED > 0) return 'NOT_EVALUATED';
  if (total === 0) return 'NOT_EVALUATED';
  if (counts.NOT_APPLICABLE === total) return 'NOT_APPLICABLE';
  if (counts.PASS > 0 || hardCounts.PASS > 0) return 'PASS';
  if (counts.NOT_EVALUATED > 0) return 'NOT_EVALUATED';
  return 'UNKNOWN';
}

function _incrementBucket(bucket, status) {
  bucket.total += 1;
  bucket[status] = (bucket[status] || 0) + 1;
}

function _recordHardConstraintIds(c, failingHardConstraintIds, unknownHardConstraintIds, notEvaluatedConstraintIds) {
  if (c.hardness === 'HARD' && c.status === 'FAIL') failingHardConstraintIds.push(c.constraintId);
  if (c.hardness === 'HARD' && c.status === 'UNKNOWN') unknownHardConstraintIds.push(c.constraintId);
  if (c.status === 'NOT_EVALUATED') notEvaluatedConstraintIds.push(c.constraintId);
}

/**
 * Summarize a collection of typed ConstraintResult objects across domains and hardness.
 *
 * @param {Array<object>} [constraints=[]]
 * @returns {object} Constraint summary
 */
function summarizeConstraintResults(constraints = []) {
  const normalized = (Array.isArray(constraints) ? constraints : []).map(_ensureNormalizedConstraint);
  const counts = _emptyStatusBucket();
  const hardCounts = _emptyStatusBucket();
  const preferenceCounts = _emptyStatusBucket();
  const byDomain = {};
  const missingInputs = [];
  const failingHardConstraintIds = [];
  const unknownHardConstraintIds = [];
  const notEvaluatedConstraintIds = [];

  for (const c of normalized) {
    _incrementBucket(counts, c.status);
    _incrementBucket(c.hardness === 'PREFERENCE' ? preferenceCounts : hardCounts, c.status);
    if (!byDomain[c.domain]) byDomain[c.domain] = _emptyStatusBucket();
    _incrementBucket(byDomain[c.domain], c.status);
    if (Array.isArray(c.missingInputs)) missingInputs.push(...c.missingInputs);
    _recordHardConstraintIds(c, failingHardConstraintIds, unknownHardConstraintIds, notEvaluatedConstraintIds);
  }

  return {
    schemaVersion: CONSTRAINT_SCHEMA_VERSION,
    resultCategory: RESULT_CATEGORY,
    total: normalized.length,
    counts,
    hardCounts,
    preferenceCounts,
    byDomain,
    failingHardConstraintIds,
    unknownHardConstraintIds,
    notEvaluatedConstraintIds,
    missingInputs: _dedupeStrings(missingInputs),
    blocksPositiveRanking: hardCounts.FAIL > 0 || hardCounts.UNKNOWN > 0 || hardCounts.NOT_EVALUATED > 0,
    overallConstraintStatus: _resolveOverallConstraintStatus(hardCounts, counts, normalized.length)
  };
}

module.exports = {
  CONSTRAINT_SCHEMA_VERSION,
  RESULT_CATEGORY,
  CONSTRAINT_STATUSES,
  CONSTRAINT_HARDNESS,
  createConstraintResult,
  adaptAspectChecksToConstraints,
  evaluateHardBeforePreferences,
  summarizeConstraintResults
};
