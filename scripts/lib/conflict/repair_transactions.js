'use strict';

/**
 * scripts/lib/conflict/repair_transactions.js
 *
 * Verified Repair Transactions, Bounded Repair Sessions, and Multi-Class Blocker Reconciliation:
 * - Isolated candidate cloning & canonical SHA-256 manifest hashing (reusing canonicalJson)
 * - Scoped deltas (ADD, REMOVE, SUBSTITUTE, SET_QUANTITY) without mutating baseline
 * - Changed-candidate receipt invalidation (ephemeralSourceValidation, portalReceipt, deliveryAuthorization)
 * - Regression detection & automatic rollback leaving baseline untouched
 * - Visited-manifest cycle detection, maxIterations / maxElapsedMs bounds, and AbortSignal cancellation
 * - Simultaneous hardware, evidence, and operational blocker classification without dropping any class
 */

const crypto = require('crypto');
const { canonicalJson } = require('../boq/solution_evidence.js');

const SCHEMA_VERSION = '1.0';

const TRANSACTION_OUTCOMES = Object.freeze({
  ACCEPTED: 'ACCEPTED',
  ROLLED_BACK: 'ROLLED_BACK',
  CYCLE_DETECTED_REJECTED: 'CYCLE_DETECTED_REJECTED',
  SEARCH_EXHAUSTED: 'SEARCH_EXHAUSTED',
  CANCELLED: 'CANCELLED'
});

const BLOCKER_OUTCOMES = Object.freeze({
  RESOLVED: 'RESOLVED',
  UNRESOLVED_HARDWARE: 'UNRESOLVED_HARDWARE',
  UNRESOLVED_EVIDENCE: 'UNRESOLVED_EVIDENCE',
  UNRESOLVED_OPERATIONAL: 'UNRESOLVED_OPERATIONAL',
  ROLLED_BACK: 'ROLLED_BACK'
});

const EVIDENCE_BLOCKER_RE = /evidence|grounding|notebooklm|citation|receipt|portal|clic|freshness|stale|unverified|ephemeral|authority|double_check/i;
const OPERATIONAL_BLOCKER_RE = /operational|sync|knowledge_sync|oauth|auth|offline|air_gap|timeout|cancel|exhausted|quota|network_error|workflow|delivery|export|lease|lock|budget|customer_requirement|lead_time/i;
const HARDWARE_BLOCKER_RE = /hardware|psu|power|watt|thermal|heatsink|fan|dlc|memory|dimm|channel|storage|drive|raid|cable|battery|pcie|riser|gpu|ocp|slot|nic|optic|transceiver|cpu|chassis|physical|compatibility/i;

function _cloneState(value) {
  if (value === null || value === undefined || typeof value !== 'object') return value;
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value));
  }
}

function _normalizeSku(value) {
  return String(value || '').trim().toUpperCase();
}

function _extractItems(state) {
  if (Array.isArray(state)) return state;
  if (!state || typeof state !== 'object') return [];
  return state.items || state.skuPartsList || state.skuList || state.parsedItems || [];
}

function _firstDefined(values, fallback = null) {
  for (const v of values) {
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return fallback;
}

function _normalizeManifestPart(part) {
  const p = part && typeof part === 'object' ? part : {};
  return {
    sku: _normalizeSku(_firstDefined([p.sku, p['Product #'], p.pn, p.partNumber], '')),
    quantity: Number(_firstDefined([p.quantity, p.qty], 0)),
    quantityScope: p.quantityScope || 'configuration',
    owner: _firstDefined([p.owner, p.ownerId], null),
    parentId: _firstDefined([p.parentId], null),
    subParentId: _firstDefined([p.subParentId], null),
    baseSku: _firstDefined([p.baseSku], null)
  };
}

function computeManifestSha256(state) {
  const parts = _extractItems(state).map(_normalizeManifestPart);
  parts.sort((a, b) => a.sku.localeCompare(b.sku) || a.quantity - b.quantity || canonicalJson(a).localeCompare(canonicalJson(b)));
  const isObj = state && typeof state === 'object' && !Array.isArray(state);
  const manifest = {
    chassis: isObj ? (state.chassis || state.chassisKey || state.model || null) : null,
    serverCount: isObj ? (state.serverCount ?? state.nodeCount ?? null) : null,
    selectors: isObj ? (state.selectors || null) : null,
    parts
  };
  return crypto.createHash('sha256').update(canonicalJson(manifest)).digest('hex');
}

function _findMatchingIndex(items, sku, owner = null) {
  const targetSku = _normalizeSku(sku);
  if (!targetSku) return -1;
  return items.findIndex(item => {
    const itemSku = _normalizeSku(item?.sku || item?.['Product #'] || item?.pn);
    if (itemSku !== targetSku) return false;
    if (owner !== null && owner !== undefined) {
      return (item.owner ?? item.ownerId ?? null) === owner;
    }
    return true;
  });
}

function _copyDeltaOptionalFields(target, delta) {
  for (const key of ['description', 'role', 'owner', 'quantityScope']) {
    if (delta[key] !== undefined && delta[key] !== null) target[key] = delta[key];
  }
  return target;
}

function _applyAddDelta(items, delta) {
  const sku = _normalizeSku(_firstDefined([delta.sku, delta.toSku, delta.newSku], ''));
  const qty = Number(delta.quantity ?? 1);
  if (!sku || !Number.isFinite(qty) || qty <= 0) return false;
  const idx = _findMatchingIndex(items, sku, delta.owner);
  if (idx >= 0) {
    items[idx] = { ...items[idx], quantity: Number(_firstDefined([items[idx].quantity, items[idx].qty], 0)) + qty };
    return true;
  }
  items.push(_copyDeltaOptionalFields({ sku, quantity: qty }, delta));
  return true;
}

function _applyRemoveDelta(items, delta) {
  const sku = _normalizeSku(_firstDefined([delta.sku, delta.fromSku, delta.targetSku], ''));
  const idx = _findMatchingIndex(items, sku, delta.owner);
  if (idx < 0) return false;
  if (delta.quantity === undefined || delta.quantity === null) {
    items.splice(idx, 1);
    return true;
  }
  const removeQty = Number(delta.quantity);
  if (!Number.isFinite(removeQty) || removeQty <= 0) return false;
  const currentQty = Number(_firstDefined([items[idx].quantity, items[idx].qty], 0));
  if (removeQty >= currentQty) items.splice(idx, 1);
  else items[idx] = { ...items[idx], quantity: currentQty - removeQty };
  return true;
}

function _applySubstituteDelta(items, delta) {
  const fromSku = _normalizeSku(_firstDefined([delta.fromSku, delta.targetSku, delta.oldSku, delta.sku], ''));
  const toSku = _normalizeSku(_firstDefined([delta.toSku, delta.newSku, delta.replacementSku], ''));
  if (!fromSku || !toSku) return false;
  const idx = _findMatchingIndex(items, fromSku, delta.owner);
  if (idx < 0) return false;
  const currentQty = _firstDefined([items[idx].quantity, items[idx].qty], 1);
  const nextQty = Number(_firstDefined([delta.quantity], currentQty));
  if (!Number.isFinite(nextQty) || nextQty <= 0) return false;
  const updated = { ...items[idx], sku: toSku, quantity: nextQty };
  const desc = _firstDefined([delta.toDescription, delta.description], null);
  if (desc) updated.description = desc;
  items[idx] = updated;
  return true;
}

function _applySetQuantityDelta(items, delta) {
  const sku = _normalizeSku(delta.sku || delta.targetSku);
  const qty = Number(delta.quantity);
  if (!sku || !Number.isFinite(qty) || qty < 0) return false;
  const idx = _findMatchingIndex(items, sku, delta.owner);
  if (qty === 0) {
    if (idx < 0) return false;
    items.splice(idx, 1);
    return true;
  }
  if (idx >= 0) {
    items[idx] = { ...items[idx], quantity: qty };
    return true;
  }
  items.push(_copyDeltaOptionalFields({ sku, quantity: qty }, delta));
  return true;
}

function _applySingleDelta(items, delta) {
  if (!delta || typeof delta !== 'object') return false;
  const action = String(delta.action || delta.type || '').trim().toUpperCase();
  if (action === 'ADD') return _applyAddDelta(items, delta);
  if (action === 'REMOVE') return _applyRemoveDelta(items, delta);
  if (action === 'SUBSTITUTE') return _applySubstituteDelta(items, delta);
  if (action === 'SET_QUANTITY') return _applySetQuantityDelta(items, delta);
  return false;
}

function _syncStateItems(state, updatedItems) {
  if (Array.isArray(state)) return updatedItems;
  if (!state || typeof state !== 'object') return { items: updatedItems };
  state.items = updatedItems;
  if (Array.isArray(state.skuList)) state.skuList = _cloneState(updatedItems);
  if (Array.isArray(state.skuPartsList)) state.skuPartsList = _cloneState(updatedItems);
  if (Array.isArray(state.parsedItems)) state.parsedItems = _cloneState(updatedItems);
  return state;
}

function applyManifestDelta(state, deltaOrDeltas) {
  const candidate = _cloneState(state);
  const items = _cloneState(_extractItems(candidate));
  const deltaList = Array.isArray(deltaOrDeltas) ? deltaOrDeltas : (deltaOrDeltas ? [deltaOrDeltas] : []);
  const applied = [];
  for (const delta of deltaList) {
    if (_applySingleDelta(items, delta)) applied.push(_cloneState(delta));
  }
  return { candidate: _syncStateItems(candidate, items), appliedDeltas: applied };
}

function invalidateCandidateReceipts(candidate, parentManifestSha256, resultingManifestSha256) {
  const manifestChanged = parentManifestSha256 !== resultingManifestSha256;
  if (!manifestChanged || !candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return { receiptInvalidated: false, invalidatedReceipts: [] };
  }
  const trackedFields = [
    'ephemeralSourceValidation',
    'solutionDoubleCheck',
    'portalReceipt',
    'clicReceipt',
    'sessionReceipt',
    'clicValidation',
    'deliveryAuthorization',
    'evidenceStates',
    'acceptanceGate'
  ];
  const invalidatedReceipts = [];
  for (const field of trackedFields) {
    if (candidate[field] != null) invalidatedReceipts.push(field);
    if (field in candidate) candidate[field] = null;
  }
  if ('portalValidationStatus' in candidate && candidate.portalValidationStatus) {
    invalidatedReceipts.push('portalValidationStatus');
    candidate.portalValidationStatus = 'PORTAL VALIDATION PENDING';
  }
  if ('deliveryAuthorized' in candidate && candidate.deliveryAuthorized === true) {
    invalidatedReceipts.push('deliveryAuthorized');
    candidate.deliveryAuthorized = false;
  }
  candidate.receiptInvalidation = {
    receiptInvalidated: true,
    reason: 'MANIFEST_CHANGED',
    parentManifestSha256,
    resultingManifestSha256,
    invalidatedReceipts
  };
  return { receiptInvalidated: true, invalidatedReceipts };
}

function _countCriticalErrors(obj) {
  if (!obj || typeof obj !== 'object') return 0;
  if (Number.isFinite(obj.criticalErrorCount)) return Number(obj.criticalErrorCount);
  if (Array.isArray(obj.criticalErrors)) return obj.criticalErrors.length;
  if (Array.isArray(obj.errors)) {
    return obj.errors.filter(e => !e || typeof e !== 'object' || !/^(?:WARN|WARNING|INFO)$/i.test(String(e.severity || ''))).length;
  }
  return 0;
}

function _collectFromDispositions(dispositions, violated) {
  for (const disp of dispositions) {
    if (disp && disp.hardness !== 'PREFERENCE' && disp.disposition === 'VIOLATED') {
      violated.add(String(disp.requirementId || disp.rawText));
    }
  }
}

function _collectFromConstraintResults(results, violated) {
  for (const cr of results) {
    if (cr && cr.hardness === 'HARD' && cr.status === 'FAIL' && cr.constraintId) {
      violated.add(String(cr.constraintId));
    }
  }
}

function _collectViolatedHardRequirements(obj) {
  const violated = new Set();
  if (!obj || typeof obj !== 'object') return violated;
  const rawIds = _firstDefined([obj.violatedHardRequirements, obj.violatedHardRequirementIds, obj.hardConstraintFailures], []);
  for (const id of rawIds) {
    if (id) violated.add(String(id));
  }
  _collectFromDispositions(obj.requirementCoverage?.dispositions || [], violated);
  _collectFromConstraintResults(obj.constraintResults || [], violated);
  return violated;
}

function _resolveValidityFlag(source, criticalErrorCount, violatedHardRequirements) {
  if (source.isValid === false || source.isMathClean === false) return false;
  return _hasEmbeddedValidation(source) && criticalErrorCount === 0 && violatedHardRequirements.size === 0;
}

function _extractValidationMetrics(validationObj, fallbackState) {
  const source = validationObj && typeof validationObj === 'object' ? validationObj : (fallbackState || {});
  const criticalErrorCount = _countCriticalErrors(source);
  const violatedHardRequirements = _collectViolatedHardRequirements(source);
  const isValid = _resolveValidityFlag(source, criticalErrorCount, violatedHardRequirements);
  const blockers = Array.isArray(source.blockers) ? source.blockers : (Array.isArray(source.acceptanceGate?.blockers) ? source.acceptanceGate.blockers : []);
  return { criticalErrorCount, violatedHardRequirements, isValid, blockers };
}

function _detectRegression(baselineMetrics, candidateMetrics, validationError) {
  const reasons = [];
  if (validationError) reasons.push(`VALIDATION_THREW:${validationError.message}`);
  if (candidateMetrics.criticalErrorCount > baselineMetrics.criticalErrorCount) {
    reasons.push(`CRITICAL_ERROR_COUNT_INCREASED:${baselineMetrics.criticalErrorCount}->${candidateMetrics.criticalErrorCount}`);
  }
  const newlyViolated = [];
  for (const id of candidateMetrics.violatedHardRequirements) {
    if (!baselineMetrics.violatedHardRequirements.has(id)) newlyViolated.push(id);
  }
  if (newlyViolated.length > 0) {
    reasons.push(`NEW_HARD_REQUIREMENT_VIOLATION:${newlyViolated.join(',')}`);
  }
  if (baselineMetrics.isValid && !candidateMetrics.isValid) {
    reasons.push('CANDIDATE_VALIDITY_REGRESSED');
  }
  return { regressionDetected: reasons.length > 0, newlyViolated, reasons };
}

function _unpackTransactionArgs(baselineOrConfig, deltaArg, optionsArg, argumentCount) {
  const isPacked = argumentCount === 1 && baselineOrConfig && typeof baselineOrConfig === 'object' && !Array.isArray(baselineOrConfig)
    && ('baseline' in baselineOrConfig || 'baselineState' in baselineOrConfig);
  if (isPacked) {
    return {
      baseline: baselineOrConfig.baseline ?? baselineOrConfig.baselineState,
      delta: baselineOrConfig.delta ?? baselineOrConfig.deltas,
      options: baselineOrConfig
    };
  }
  return { baseline: baselineOrConfig, delta: deltaArg, options: optionsArg || {} };
}

function _buildTransactionResult(fields) {
  return {
    schemaVersion: SCHEMA_VERSION,
    outcome: fields.outcome,
    parentManifestSha256: fields.parentManifestSha256,
    resultingManifestSha256: fields.resultingManifestSha256,
    manifestChanged: fields.manifestChanged,
    deltas: fields.deltas,
    state: fields.state,
    candidate: fields.candidate,
    baselineSnapshot: fields.baselineSnapshot,
    validation: fields.validation,
    affectedRequirements: fields.affectedRequirements,
    affectedConstraints: fields.affectedConstraints,
    unresolvedBlockers: fields.unresolvedBlockers,
    receiptInvalidated: fields.receiptInvalidated,
    invalidatedReceipts: fields.invalidatedReceipts,
    regressionDetected: fields.regressionDetected,
    rollbackReason: fields.rollbackReason,
    elapsedMs: fields.elapsedMs
  };
}

function _cancelledTransaction(baselineSnapshot, parentSha, deltaList, elapsedMs) {
  return _buildTransactionResult({
    outcome: TRANSACTION_OUTCOMES.CANCELLED,
    parentManifestSha256: parentSha,
    resultingManifestSha256: parentSha,
    manifestChanged: false,
    deltas: deltaList,
    state: baselineSnapshot,
    candidate: baselineSnapshot,
    baselineSnapshot,
    validation: null,
    affectedRequirements: [],
    affectedConstraints: [],
    unresolvedBlockers: [],
    receiptInvalidated: false,
    invalidatedReceipts: [],
    regressionDetected: false,
    rollbackReason: 'ABORT_SIGNAL',
    elapsedMs
  });
}

async function _runCandidateValidation(validateFn, candidate, context) {
  try {
    if (typeof validateFn !== 'function') throw new Error('VALIDATION_REQUIRED: A repair requires a candidate validator.');
    const validation = await validateFn(candidate, context);
    if (!_hasEmbeddedValidation(validation)) {
      throw new Error('VALIDATION_RESULT_REQUIRED: The candidate validator returned no validation checks.');
    }
    return { validation, error: null };
  } catch (err) {
    return { validation: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

const elapsedMsSince = startNs => Number((Number(process.hrtime.bigint() - startNs) / 1e6).toFixed(3));

async function executeVerifiedRepairTransaction(baselineOrConfig, deltaArg, optionsArg = {}) {
  const startNs = process.hrtime.bigint();
  const { baseline, delta, options } = _unpackTransactionArgs(baselineOrConfig, deltaArg, optionsArg, arguments.length);
  const deltaList = Array.isArray(delta) ? delta : (delta ? [delta] : []);
  const baselineSnapshot = _cloneState(baseline);
  const parentManifestSha256 = computeManifestSha256(baselineSnapshot);
  if (options.signal?.aborted) return _cancelledTransaction(baselineSnapshot, parentManifestSha256, deltaList, elapsedMsSince(startNs));

  const { candidate, appliedDeltas } = applyManifestDelta(baselineSnapshot, deltaList);
  const resultingManifestSha256 = computeManifestSha256(candidate);
  const receiptInfo = invalidateCandidateReceipts(candidate, parentManifestSha256, resultingManifestSha256);
  const { validation, error } = await _runCandidateValidation(options.validateFn, candidate, {
    parentManifestSha256, resultingManifestSha256, deltas: appliedDeltas, signal: options.signal || null
  });
  if (options.signal?.aborted) return _cancelledTransaction(baselineSnapshot, parentManifestSha256, appliedDeltas, elapsedMsSince(startNs));

  const baselineMetrics = _extractValidationMetrics(options.baselineValidation, baselineSnapshot);
  const candidateMetrics = _extractValidationMetrics(validation, candidate);
  const regression = _detectRegression(baselineMetrics, candidateMetrics, error);
  const elapsedMs = elapsedMsSince(startNs);
  const affectedRequirements = [...new Set([...baselineMetrics.violatedHardRequirements, ...candidateMetrics.violatedHardRequirements])];
  const affectedConstraints = Array.isArray(validation?.constraintResults)
    ? validation.constraintResults.filter(c => c.status === 'FAIL').map(c => c.constraintId) : [];

  if (regression.regressionDetected) {
    return _buildTransactionResult({
      outcome: TRANSACTION_OUTCOMES.ROLLED_BACK, parentManifestSha256, resultingManifestSha256,
      manifestChanged: parentManifestSha256 !== resultingManifestSha256, deltas: appliedDeltas,
      state: baselineSnapshot, candidate: baselineSnapshot, baselineSnapshot, validation,
      affectedRequirements, affectedConstraints, unresolvedBlockers: candidateMetrics.blockers,
      receiptInvalidated: receiptInfo.receiptInvalidated, invalidatedReceipts: receiptInfo.invalidatedReceipts,
      regressionDetected: true, rollbackReason: regression.reasons.join('; '), elapsedMs
    });
  }
  return _buildTransactionResult({
    outcome: TRANSACTION_OUTCOMES.ACCEPTED, parentManifestSha256, resultingManifestSha256,
    manifestChanged: parentManifestSha256 !== resultingManifestSha256, deltas: appliedDeltas,
    state: candidate, candidate, baselineSnapshot, validation,
    affectedRequirements, affectedConstraints, unresolvedBlockers: candidateMetrics.blockers,
    receiptInvalidated: receiptInfo.receiptInvalidated, invalidatedReceipts: receiptInfo.invalidatedReceipts,
    regressionDetected: false, rollbackReason: null, elapsedMs
  });
}

function _isBetterMetrics(candidateMetrics, bestMetrics) {
  if (candidateMetrics.violatedHardRequirements.size < bestMetrics.violatedHardRequirements.size) return true;
  if (candidateMetrics.violatedHardRequirements.size > bestMetrics.violatedHardRequirements.size) return false;
  if (candidateMetrics.criticalErrorCount < bestMetrics.criticalErrorCount) return true;
  if (candidateMetrics.criticalErrorCount > bestMetrics.criticalErrorCount) return false;
  return candidateMetrics.isValid && !bestMetrics.isValid;
}

function _buildCycleAttempt(index, parentSha, candidateSha, proposalList, budget) {
  return {
    schemaVersion: SCHEMA_VERSION,
    attemptIndex: index,
    parentManifestSha256: parentSha,
    resultingManifestSha256: candidateSha,
    deltas: proposalList,
    affectedRequirements: [],
    affectedConstraints: [],
    validationResult: null,
    unresolvedBlockers: [],
    receiptInvalidated: false,
    elapsedMs: 0,
    budget,
    outcome: TRANSACTION_OUTCOMES.CYCLE_DETECTED_REJECTED
  };
}

function _buildAttemptRecord(index, tx, budget) {
  return {
    schemaVersion: SCHEMA_VERSION,
    attemptIndex: index,
    parentManifestSha256: tx.parentManifestSha256,
    resultingManifestSha256: tx.resultingManifestSha256,
    deltas: tx.deltas,
    affectedRequirements: tx.affectedRequirements,
    affectedConstraints: tx.affectedConstraints,
    validationResult: tx.validation,
    unresolvedBlockers: tx.unresolvedBlockers,
    receiptInvalidated: tx.receiptInvalidated,
    rollbackReason: tx.rollbackReason,
    elapsedMs: tx.elapsedMs,
    budget,
    outcome: tx.outcome
  };
}

function _isCleanState(metrics) {
  return metrics.criticalErrorCount === 0 && metrics.violatedHardRequirements.size === 0 && metrics.isValid !== false;
}

function _finalizeSessionOutcome(flags, bestMetrics, attemptsCount) {
  if (flags.cancelled) return { outcome: TRANSACTION_OUTCOMES.CANCELLED, exhaustedReason: 'ABORT_SIGNAL' };
  if (flags.solved) return { outcome: TRANSACTION_OUTCOMES.ACCEPTED, exhaustedReason: null };
  if (flags.exhaustedReason) return { outcome: TRANSACTION_OUTCOMES.SEARCH_EXHAUSTED, exhaustedReason: flags.exhaustedReason };
  if (flags.cycleDetected) return { outcome: TRANSACTION_OUTCOMES.CYCLE_DETECTED_REJECTED, exhaustedReason: null };
  if (attemptsCount === 0 && _isCleanState(bestMetrics)) return { outcome: TRANSACTION_OUTCOMES.ACCEPTED, exhaustedReason: null };
  return { outcome: TRANSACTION_OUTCOMES.SEARCH_EXHAUSTED, exhaustedReason: 'PROPOSALS_EXHAUSTED' };
}

function _resolveNextProposal(proposals, proposalGenerator, idx, currentState, attempts) {
  if (Array.isArray(proposals)) {
    return idx < proposals.length ? proposals[idx] : null;
  }
  if (typeof proposalGenerator === 'function') {
    return proposalGenerator(currentState, { iteration: idx + 1, attempts }) || null;
  }
  return null;
}

async function _executeSessionIteration(state, proposal, context) {
  const { visited, attempts, best, flags, options, idx, startNs, maxIterations, maxElapsedMs } = state;
  const proposalList = Array.isArray(proposal) ? proposal : [proposal];
  const parentSha = computeManifestSha256(state.currentState);
  const { candidate } = applyManifestDelta(state.currentState, proposalList);
  const previewSha = computeManifestSha256(candidate);
  const budget = { iteration: idx + 1, maxIterations, elapsedMs: elapsedMsSince(startNs), maxElapsedMs };

  if (visited.has(previewSha)) {
    flags.cycleDetected = true;
    attempts.push(_buildCycleAttempt(attempts.length + 1, parentSha, previewSha, proposalList, budget));
    return options.stopOnCycle === true ? 'STOP' : 'CONTINUE';
  }
  visited.add(previewSha);

  const tx = await executeVerifiedRepairTransaction(state.currentState, proposalList, {
    validateFn: options.validateFn,
    baselineValidation: best.currentValidation,
    signal: context.signal
  });
  attempts.push(_buildAttemptRecord(attempts.length + 1, tx, { ...budget, elapsedMs: elapsedMsSince(startNs) }));

  if (tx.outcome === TRANSACTION_OUTCOMES.CANCELLED) {
    flags.cancelled = true;
    return 'STOP';
  }
  if (tx.outcome === TRANSACTION_OUTCOMES.ACCEPTED) {
    state.currentState = tx.state;
    best.currentValidation = tx.validation;
    const candMetrics = _extractValidationMetrics(tx.validation, tx.state);
    if (_isBetterMetrics(candMetrics, best.metrics)) {
      best.state = _cloneState(tx.state);
      best.metrics = candMetrics;
      best.manifestSha256 = tx.resultingManifestSha256;
    }
    if (typeof options.validateFn === 'function' && _isCleanState(candMetrics)) {
      flags.solved = true;
      return 'STOP';
    }
  }
  return 'CONTINUE';
}

function _hasEmbeddedValidation(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  return Boolean(Array.isArray(obj.errors) || Array.isArray(obj.criticalErrors) || Number.isFinite(obj.criticalErrorCount) ||
    obj.requirementCoverage?.dispositions?.length || obj.constraintResults?.length ||
    typeof obj.isValid === 'boolean' || typeof obj.isMathClean === 'boolean');
}

async function _resolveSessionBaselineValidation(config, baselineSnapshot) {
  if (config.baselineValidation) return config.baselineValidation;
  if (_hasEmbeddedValidation(baselineSnapshot) || config.validateBaseline === false) return null;
  if (typeof config.validateFn !== 'function') return null;
  const res = await _runCandidateValidation(config.validateFn, _cloneState(baselineSnapshot), {
    phase: 'BASELINE',
    signal: config.signal || null
  });
  return res.validation || null;
}

function _createRepairSessionState(config, baselineSnapshot, baseValidation, parentManifestSha256, startNs) {
  const maxIterations = Number.isSafeInteger(config.maxIterations) && config.maxIterations > 0 ? config.maxIterations : 20;
  const maxElapsedMs = Number.isFinite(config.maxElapsedMs) && config.maxElapsedMs > 0 ? config.maxElapsedMs : 30000;
  return {
    currentState: _cloneState(baselineSnapshot),
    visited: new Set([parentManifestSha256]),
    attempts: [],
    best: {
      state: _cloneState(baselineSnapshot),
      metrics: _extractValidationMetrics(baseValidation, baselineSnapshot),
      manifestSha256: parentManifestSha256,
      currentValidation: baseValidation
    },
    flags: { cancelled: Boolean(config.signal?.aborted), solved: false, cycleDetected: false, exhaustedReason: null },
    options: config,
    idx: 0,
    startNs,
    maxIterations,
    maxElapsedMs
  };
}

function _checkSessionPreStepStop(state, config) {
  if (config.signal?.aborted) { state.flags.cancelled = true; return true; }
  if (elapsedMsSince(state.startNs) >= state.maxElapsedMs) { state.flags.exhaustedReason = 'MAX_ELAPSED_MS'; return true; }
  return false;
}

async function executeRepairSession(config = {}) {
  const startNs = process.hrtime.bigint();
  const baselineSnapshot = _cloneState(_firstDefined([config.baseline, config.baselineState], {}));
  const parentManifestSha256 = computeManifestSha256(baselineSnapshot);
  const baseValidation = config.signal?.aborted ? null : await _resolveSessionBaselineValidation(config, baselineSnapshot);
  const state = _createRepairSessionState(config, baselineSnapshot, baseValidation, parentManifestSha256, startNs);

  for (let idx = 0; idx < state.maxIterations; idx++) {
    state.idx = idx;
    if (_checkSessionPreStepStop(state, config)) break;
    const proposal = _resolveNextProposal(config.proposals, config.proposalGenerator, idx, state.currentState, state.attempts);
    if (!proposal) break;
    const action = await _executeSessionIteration(state, proposal, { signal: config.signal });
    if (action === 'STOP') break;
    if (idx + 1 >= state.maxIterations && !state.flags.solved) state.flags.exhaustedReason = 'MAX_ITERATIONS';
  }
  if (!state.flags.cancelled && !state.flags.solved && !state.flags.exhaustedReason
    && Array.isArray(config.proposals) && config.proposals.length > state.maxIterations) {
    state.flags.exhaustedReason = 'MAX_ITERATIONS';
  }

  const final = _finalizeSessionOutcome(state.flags, state.best.metrics, state.attempts.length);
  return {
    schemaVersion: SCHEMA_VERSION,
    outcome: final.outcome,
    exhaustedReason: final.exhaustedReason,
    parentManifestSha256,
    bestManifestSha256: state.best.manifestSha256,
    bestValidatedState: state.best.state,
    baselineUnmutated: true,
    attempts: state.attempts,
    iterationsRun: state.attempts.length,
    elapsedMs: elapsedMsSince(startNs),
    cycleDetected: state.flags.cycleDetected,
    cancelled: state.flags.cancelled
  };
}

function _blockerProbeText(blocker) {
  return [
    blocker.id, blocker.blockerId, blocker.type, blocker.issueType,
    blocker.category, blocker.domain, blocker.detail, blocker.message
  ].filter(Boolean).join(' ');
}

function _classifyBlockerClass(blocker, defaultClass) {
  const explicit = String(_firstDefined([blocker.blockerClass, blocker.class], '')).trim().toUpperCase();
  if (['HARDWARE', 'EVIDENCE', 'OPERATIONAL'].includes(explicit)) return explicit;
  const probe = _blockerProbeText(blocker);
  if (EVIDENCE_BLOCKER_RE.test(probe)) return 'EVIDENCE';
  if (OPERATIONAL_BLOCKER_RE.test(probe)) return 'OPERATIONAL';
  if (HARDWARE_BLOCKER_RE.test(probe)) return 'HARDWARE';
  return defaultClass || 'OPERATIONAL';
}

function _resolveBlockerOutcome(blocker, blockerClass, blockerId, context) {
  const resolvedIds = new Set(context.resolvedIds || []);
  const rolledBackIds = new Set(context.rolledBackIds || []);
  const status = String(blocker.status || '').toUpperCase();
  if (blocker.rolledBack === true || status === 'ROLLED_BACK' || rolledBackIds.has(blockerId)) {
    return BLOCKER_OUTCOMES.ROLLED_BACK;
  }
  if (blocker.resolved === true || status === 'RESOLVED' || resolvedIds.has(blockerId)) {
    return BLOCKER_OUTCOMES.RESOLVED;
  }
  if (blockerClass === 'HARDWARE') return BLOCKER_OUTCOMES.UNRESOLVED_HARDWARE;
  if (blockerClass === 'EVIDENCE') return BLOCKER_OUTCOMES.UNRESOLVED_EVIDENCE;
  return BLOCKER_OUTCOMES.UNRESOLVED_OPERATIONAL;
}

function _overallReconcileOutcome(counts, records) {
  if (records.length === 0 || counts.resolved === records.length) return BLOCKER_OUTCOMES.RESOLVED;
  const active = [];
  if (counts.unresolvedHardware > 0) active.push(BLOCKER_OUTCOMES.UNRESOLVED_HARDWARE);
  if (counts.unresolvedEvidence > 0) active.push(BLOCKER_OUTCOMES.UNRESOLVED_EVIDENCE);
  if (counts.unresolvedOperational > 0) active.push(BLOCKER_OUTCOMES.UNRESOLVED_OPERATIONAL);
  if (counts.rolledBack > 0) active.push(BLOCKER_OUTCOMES.ROLLED_BACK);
  return active.length === 1 ? active[0] : 'MULTI_CLASS_UNRESOLVED';
}

function reconcileBlockers(blockers = [], context = {}) {
  const list = Array.isArray(blockers) ? blockers : [];
  const byClass = { HARDWARE: [], EVIDENCE: [], OPERATIONAL: [] };
  const byOutcome = {
    RESOLVED: [], UNRESOLVED_HARDWARE: [], UNRESOLVED_EVIDENCE: [], UNRESOLVED_OPERATIONAL: [], ROLLED_BACK: []
  };
  const records = list.map((raw, index) => {
    const obj = typeof raw === 'string' ? { detail: raw } : (raw || {});
    const blockerId = String(obj.id || obj.blockerId || obj.type || obj.issueType || `BLOCKER_${index + 1}`);
    const blockerClass = _classifyBlockerClass(obj, context.defaultClass);
    const outcome = _resolveBlockerOutcome(obj, blockerClass, blockerId, context);
    const record = {
      index,
      blockerId,
      blockerClass,
      outcome,
      resolved: outcome === BLOCKER_OUTCOMES.RESOLVED,
      detail: String(obj.detail || obj.message || obj.name || blockerId),
      original: raw
    };
    byClass[blockerClass].push(record);
    byOutcome[outcome].push(record);
    return record;
  });

  const counts = {
    total: records.length,
    resolved: byOutcome.RESOLVED.length,
    unresolvedHardware: byOutcome.UNRESOLVED_HARDWARE.length,
    unresolvedEvidence: byOutcome.UNRESOLVED_EVIDENCE.length,
    unresolvedOperational: byOutcome.UNRESOLVED_OPERATIONAL.length,
    rolledBack: byOutcome.ROLLED_BACK.length
  };
  const outcomesPresent = Object.keys(byOutcome).filter(k => byOutcome[k].length > 0);
  return {
    schemaVersion: SCHEMA_VERSION,
    records,
    byClass,
    byOutcome,
    counts,
    outcomesPresent,
    hasUnresolvedHardware: counts.unresolvedHardware > 0,
    hasUnresolvedEvidence: counts.unresolvedEvidence > 0,
    hasUnresolvedOperational: counts.unresolvedOperational > 0,
    hasRolledBack: counts.rolledBack > 0,
    allResolved: counts.resolved === records.length,
    overallOutcome: _overallReconcileOutcome(counts, records)
  };
}

module.exports = {
  SCHEMA_VERSION,
  TRANSACTION_OUTCOMES,
  BLOCKER_OUTCOMES,
  computeManifestSha256,
  applyManifestDelta,
  invalidateCandidateReceipts,
  executeVerifiedRepairTransaction,
  executeRepairSession,
  reconcileBlockers
};
