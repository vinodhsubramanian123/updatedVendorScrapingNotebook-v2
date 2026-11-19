'use strict';
/**
 * scripts/lib/boq/evidence/source_adjudicator.js — Mechanical Source Adjudicator (SI-03)
 *
 * Mechanically adjudicates EvidenceRecords against ClaimRecords and target scope:
 * - Rejects UNTRUSTED_INPUT, ephemeral self-citations, mocks/simulations, bare counts
 * - Enforces product, generation, baseSku, owner, region, and selector applicability
 * - Enforces contentSha256 identity and freshnessPolicy.maxAgeMs
 * - Preserves UNKNOWN when source inventory is inaccessible or only MODEL_PROPOSAL exists
 * - Preserves contradictions without allowing newer timestamps to override scope conflicts
 */

const { readPortalReceipt, receiptMatches, normalizeSku } = require('../portal_receipt.js');
const {
  EVIDENCE_SCHEMA_VERSION,
  SOURCE_TYPES,
  canonicalJson,
  sha256Hex,
  createClaimRecord
} = require('./claim_records.js');

const DEFAULT_MODEL_PREFIX_STRIP = /\b(?:hpe|proliant|compute|server|configure-to-order|cto|storage|system|switch|san|module|frame|enclosure)\b/gi;
const FORM_FACTOR_STRIP = /\b(?:8sff|24sff|8lff|12lff|edsff|sff|lff|nhp|rack|8dw|16sw)\b/gi;

const RESERVED_COND_KEYS = new Set([
  'product', 'generation', 'region', 'regions', 'note', 'description',
  'ruleId', 'conditions', 'requiredSelectors', 'selectors',
  'conditionKey', 'selectorKey', 'key', 'selector',
  'conditionOperator', 'operator', 'op', 'thresholdValue', 'value', 'expected', 'equals'
]);

const SELECTOR_COMPARATORS = {
  '===': (a, b) => _valuesEqual(a, b),
  '==': (a, b) => _valuesEqual(a, b),
  '=': (a, b) => _valuesEqual(a, b),
  eq: (a, b) => _valuesEqual(a, b),
  equals: (a, b) => _valuesEqual(a, b),
  '!==': (a, b) => !_valuesEqual(a, b),
  '!=': (a, b) => !_valuesEqual(a, b),
  ne: (a, b) => !_valuesEqual(a, b),
  '<=': (a, b) => _bothFinite(a, b) && Number(a) <= Number(b),
  lte: (a, b) => _bothFinite(a, b) && Number(a) <= Number(b),
  '<': (a, b) => _bothFinite(a, b) && Number(a) < Number(b),
  lt: (a, b) => _bothFinite(a, b) && Number(a) < Number(b),
  '>=': (a, b) => _bothFinite(a, b) && Number(a) >= Number(b),
  gte: (a, b) => _bothFinite(a, b) && Number(a) >= Number(b),
  '>': (a, b) => _bothFinite(a, b) && Number(a) > Number(b),
  gt: (a, b) => _bothFinite(a, b) && Number(a) > Number(b),
  in: (a, b) => Array.isArray(b) && b.some(item => _valuesEqual(a, item)),
  not_in: (a, b) => Array.isArray(b) && !b.some(item => _valuesEqual(a, item))
};

function _bothFinite(a, b) {
  return Number.isFinite(Number(a)) && Number.isFinite(Number(b));
}

function _valuesEqual(a, b) {
  if (typeof a === 'string' && typeof b === 'string') return a.trim().toLowerCase() === b.trim().toLowerCase();
  return a === b;
}

function _firstText(values) {
  for (const val of values) {
    if (val !== undefined && val !== null && String(val).trim() !== '') return String(val).trim();
  }
  return null;
}

function _normalizeGen(raw) {
  if (!raw) return null;
  const m = String(raw).match(/gen\s*(\d+)/i);
  return m ? `gen${m[1]}` : null;
}

function _extractModelAndGen(raw) {
  if (!raw) return { model: null, gen: null };
  const text = String(raw).replace(/_/g, ' ');
  const gen = _normalizeGen(text);
  const cleaned = text
    .replace(/\bgen\s*\d+\b/gi, ' ')
    .replace(DEFAULT_MODEL_PREFIX_STRIP, ' ')
    .replace(FORM_FACTOR_STRIP, ' ')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
  return { model: cleaned || null, gen };
}

function _toStringSet(list, extra) {
  const out = new Set();
  if (Array.isArray(list)) {
    for (const item of list) {
      const text = _firstText([item]);
      if (text) out.add(text);
    }
  }
  const extraText = _firstText([extra]);
  if (extraText) out.add(extraText);
  return out;
}

function _checkNotebookAllowlist(evidence, context, reasons, details) {
  if (evidence.sourceType !== SOURCE_TYPES.OFFICIAL_DOCUMENT_PASSAGE) return;
  if (context.inventoryStatus === 'INACCESSIBLE') {
    reasons.push('UNKNOWN_INVENTORY_INACCESSIBLE');
    details.push('Source inventory is inaccessible; document passage cannot be verified.');
    return;
  }
  if (!Array.isArray(context.authoritativeSourceIds)) return;
  if (context.authoritativeSourceIds.length === 0) {
    reasons.push('UNKNOWN_INVENTORY_INACCESSIBLE');
    details.push('Authoritative source trust set is empty; source cannot be verified.');
    return;
  }
  const allowed = _toStringSet(context.authoritativeSourceIds);
  if (!evidence.sourceId || !allowed.has(evidence.sourceId)) {
    reasons.push('REJECTED_NON_AUTHORITATIVE_SOURCE');
    details.push(`Source "${evidence.sourceId || 'missing'}" is not in the authoritative trust set.`);
  }
}

function _isSelfCitation(evidence, context) {
  const auth = evidence.authority || {};
  const ephemeralIds = _toStringSet(context.ephemeralSourceIds, context.ephemeralSourceId);
  if (auth.isEphemeral === true || evidence.isEphemeral === true) return true;
  return Boolean(evidence.sourceId && ephemeralIds.has(evidence.sourceId));
}

function _isMockEvidence(evidence) {
  const auth = evidence.authority || {};
  if (auth.isMock === true || auth.isSimulation === true) return true;
  return /^(?:mock|sim)-/i.test(evidence.sourceId || '');
}

function _isModelProposal(evidence) {
  return evidence.sourceType === SOURCE_TYPES.MODEL_PROPOSAL || evidence.trustClass === 'MODEL_PROPOSAL';
}

function _isUntrustedEvidence(evidence) {
  return evidence.sourceType === SOURCE_TYPES.UNTRUSTED_INPUT ||
    evidence.trustClass === 'UNTRUSTED_INPUT' ||
    evidence.isAuthoritative === false;
}

function _checkTrustAndOrigin(evidence, context) {
  const reasons = [];
  const details = [];
  const quarantinedIds = _toStringSet(context.quarantinedSourceIds);

  if (_isSelfCitation(evidence, context)) {
    reasons.push('REJECTED_SELF_CITATION');
    details.push(`Ephemeral candidate source "${evidence.sourceId || 'unknown'}" cannot self-certify.`);
  }
  if (_isMockEvidence(evidence)) {
    reasons.push('REJECTED_MOCK_OR_SIMULATION');
    details.push('Mock or simulation evidence is excluded from authoritative support.');
  }
  if (_isModelProposal(evidence)) {
    reasons.push('NON_AUTHORITATIVE_MODEL_PROPOSAL');
    details.push('Model proposal is non-authoritative pending mechanical or authoritative verification.');
  } else if (_isUntrustedEvidence(evidence)) {
    reasons.push('REJECTED_UNTRUSTED_INPUT');
    details.push('Untrusted customer/candidate input is strictly excluded from authoritative support.');
  }
  if (evidence.sourceId && quarantinedIds.has(evidence.sourceId)) {
    reasons.push('REJECTED_QUARANTINED_SOURCE');
    details.push(`Source "${evidence.sourceId}" is quarantined.`);
  }
  if (context.inventoryStatus === 'INACCESSIBLE' && evidence.sourceType === SOURCE_TYPES.CATALOG_OBSERVATION) {
    reasons.push('UNKNOWN_INVENTORY_INACCESSIBLE');
    details.push('Source inventory is inaccessible; catalog observation cannot be verified.');
  }
  _checkNotebookAllowlist(evidence, context, reasons, details);
  return { reasons, details };
}

function _checkIdentityStrings(scope, context, reasons, details) {
  if (scope.baseSku && context.baseSku && normalizeSku(scope.baseSku) !== normalizeSku(context.baseSku)) {
    reasons.push('INAPPLICABLE_BASE_SKU');
    details.push(`Evidence baseSku "${scope.baseSku}" does not match target "${context.baseSku}".`);
  }
  if (scope.owner && context.owner && String(scope.owner).trim() !== String(context.owner).trim()) {
    reasons.push('INAPPLICABLE_OWNER');
    details.push(`Evidence owner "${scope.owner}" does not match target "${context.owner}".`);
  }
}

function _checkProductAndGeneration(scope, context, reasons, details) {
  const isUniversal = scope.isUniversal === true || /^(?:UNIVERSAL|GLOBAL|ALL)$/i.test(scope.product || '');
  const evParsed = _extractModelAndGen(scope.product);
  const ctxProduct = _firstText([context.product, context.chassis, context.targetProduct]);
  const ctxParsed = _extractModelAndGen(ctxProduct);
  const evGen = _normalizeGen(scope.generation) || evParsed.gen;
  const ctxGen = _normalizeGen(context.generation) || ctxParsed.gen;

  if (evGen && ctxGen && evGen !== ctxGen) {
    reasons.push('INAPPLICABLE_GENERATION');
    details.push(`Evidence generation "${scope.generation || evGen}" does not match target "${context.generation || ctxGen}".`);
  }
  if (!isUniversal && evParsed.model && ctxParsed.model && evParsed.model !== ctxParsed.model) {
    reasons.push('INAPPLICABLE_PRODUCT');
    details.push(`Evidence product "${scope.product}" does not match target "${ctxProduct}".`);
  }
  _checkIdentityStrings(scope, context, reasons, details);
}

function _collectEvidenceRegions(scope, cond) {
  const list = [];
  if (scope.region) list.push(scope.region);
  if (cond && typeof cond === 'object' && !Array.isArray(cond)) {
    if (cond.region) list.push(cond.region);
    if (Array.isArray(cond.regions)) list.push(...cond.regions);
  }
  return list.map(r => String(r).trim()).filter(Boolean);
}

function _checkRegion(scope, cond, context, reasons, details) {
  const evRegions = _collectEvidenceRegions(scope, cond);
  if (evRegions.length === 0 || !context.region) return;
  if (evRegions.some(r => /^(?:GLOBAL|ALL|\*)$/i.test(r))) return;
  const targetRegion = String(context.region).trim().toUpperCase();
  if (!evRegions.some(r => r.toUpperCase() === targetRegion)) {
    reasons.push('INAPPLICABLE_REGION');
    details.push(`Evidence region [${evRegions.join(', ')}] does not match target region "${context.region}".`);
  }
}

function _coerceScalarToken(rawVal) {
  if (rawVal === 'true') return true;
  if (rawVal === 'false') return false;
  const numVal = Number(rawVal);
  return rawVal !== '' && Number.isFinite(numVal) ? numVal : rawVal;
}

function _parseConditionString(raw) {
  const match = String(raw).trim().match(/^([a-zA-Z0-9_.-]+)\s*(<=|>=|!==|!=|===|==|=|<|>)\s*(.+)$/);
  if (!match) return { key: String(raw).trim(), op: '===', value: true };
  return { key: match[1], op: match[2], value: _coerceScalarToken(match[3].trim()) };
}

function _normalizeConditionEntry(entry) {
  if (typeof entry === 'string') return _parseConditionString(entry);
  if (!entry || typeof entry !== 'object') return null;
  const key = _firstText([entry.conditionKey, entry.selectorKey, entry.key, entry.selector]);
  if (!key) return null;
  const op = _firstText([entry.conditionOperator, entry.operator, entry.op]) || '===';
  const valCandidates = [entry.thresholdValue, entry.value, entry.expected, entry.equals];
  const value = valCandidates.find(v => v !== undefined);
  return { key, op, value };
}

function _pushSelectorMapConditions(mapObj, out) {
  if (!mapObj || typeof mapObj !== 'object' || Array.isArray(mapObj)) return;
  for (const [k, v] of Object.entries(mapObj)) {
    const isSpecObj = v && typeof v === 'object' && !Array.isArray(v);
    const op = isSpecObj ? _firstText([v.op, v.operator, v.conditionOperator]) : null;
    if (op) {
      const value = [v.value, v.thresholdValue, v.expected].find(x => x !== undefined);
      out.push({ key: k, op, value });
    } else {
      out.push({ key: k, op: '===', value: v });
    }
  }
}

function _pushArrayConditions(list, out) {
  if (!Array.isArray(list)) return;
  for (const item of list) {
    const norm = _normalizeConditionEntry(item);
    if (norm) out.push(norm);
  }
}

function _extractRequiredConditions(applicabilityConditions, scopeSelectors) {
  const out = [];
  _pushSelectorMapConditions(scopeSelectors, out);
  if (!applicabilityConditions) return out;
  if (Array.isArray(applicabilityConditions)) {
    _pushArrayConditions(applicabilityConditions, out);
    return out;
  }
  if (typeof applicabilityConditions !== 'object') return out;
  const direct = _normalizeConditionEntry(applicabilityConditions);
  if (direct) out.push(direct);
  _pushArrayConditions(applicabilityConditions.conditions, out);
  _pushSelectorMapConditions(applicabilityConditions.requiredSelectors || applicabilityConditions.selectors, out);
  for (const [k, v] of Object.entries(applicabilityConditions)) {
    if (!RESERVED_COND_KEYS.has(k)) _pushSelectorMapConditions({ [k]: v }, out);
  }
  return out;
}

function _hasReceiptSelectorParity(evidence, scopeSelectors, context) {
  if (evidence.sourceType !== SOURCE_TYPES.PORTAL_RECEIPT_CAPTURE) return true;
  const recKeys = Object.keys(scopeSelectors).sort();
  if (recKeys.length === 0) return true;
  const ctxKeys = Object.keys(context.selectors || {}).sort();
  return canonicalJson(ctxKeys) === canonicalJson(recKeys);
}

function _checkSelectorConditions(evidence, context, reasons, details) {
  const baseSelectors = context.selectors && typeof context.selectors === 'object' ? context.selectors : {};
  const active = context.region ? { ...baseSelectors, region: context.region } : baseSelectors;
  const scopeSelectors = evidence.scope?.selectors || {};

  if (!_hasReceiptSelectorParity(evidence, scopeSelectors, context)) {
    reasons.push('INAPPLICABLE_SELECTOR_UNMET');
    details.push('Portal receipt selector keys do not exactly match active configuration selectors.');
    return;
  }

  for (const cond of _extractRequiredConditions(evidence.applicabilityConditions, scopeSelectors)) {
    const actual = active[cond.key];
    const comparator = SELECTOR_COMPARATORS[String(cond.op || '===').toLowerCase()];
    const missing = actual === undefined || actual === null || actual === '';
    if (missing || !comparator || !comparator(actual, cond.value)) {
      reasons.push('INAPPLICABLE_SELECTOR_UNMET');
      details.push(`Selector condition "${cond.key} ${cond.op} ${cond.value}" unmet (active: ${actual === undefined ? 'MISSING' : actual}).`);
      return;
    }
  }
}

function _lookupHashFromMap(hashMap, evidence) {
  if (hashMap instanceof Map) {
    return hashMap.get(evidence.evidenceId) || hashMap.get(evidence.sourceId) || null;
  }
  if (hashMap && typeof hashMap === 'object') {
    return hashMap[evidence.evidenceId] || hashMap[evidence.sourceId] || null;
  }
  return null;
}

function _findBaselineRecord(baselineRecords, evidence) {
  if (!Array.isArray(baselineRecords)) return null;
  return baselineRecords.find(r => {
    if (!r || r.sourceId !== evidence.sourceId) return false;
    if (!evidence.passageId || !r.passageId) return true;
    return r.passageId === evidence.passageId;
  }) || null;
}

function _resolveExpectedHashes(evidence, context) {
  const mapped = _lookupHashFromMap(context.expectedContentHashes, evidence);
  const baseline = _findBaselineRecord(context.baselineRecords, evidence);
  const expectedContent = _firstText([
    evidence.expectedContentSha256, mapped, context.expectedContentSha256, baseline?.contentSha256
  ]);
  const expectedRevision = _firstText([evidence.expectedRevisionSha256, baseline?.revisionSha256]);
  return { expectedContent, expectedRevision, baseline };
}

function _checkTimestampFreshness(evidence, context, reasons, details) {
  const nowMs = Number.isFinite(context.nowMs) ? context.nowMs : Date.now();
  const maxAgeMs = evidence.freshnessPolicy?.maxAgeMs ?? context.maxAgeMs ?? null;
  const allowHistorical = evidence.freshnessPolicy?.allowHistorical === true || context.allowHistorical === true;
  const requiresFreshness = Number.isFinite(maxAgeMs) && maxAgeMs > 0 && !allowHistorical;

  if (!evidence.retrievedAt) {
    if (requiresFreshness) {
      reasons.push('STALE_EVIDENCE_MISSING_TIMESTAMP');
      details.push('Freshness policy requires retrievedAt timestamp.');
    }
    return;
  }

  const ts = Date.parse(evidence.retrievedAt);
  if (!Number.isFinite(ts) || ts > nowMs + 60000) {
    reasons.push('INVALID_TIMESTAMP');
    details.push(`Invalid or future retrievedAt timestamp "${evidence.retrievedAt}".`);
  } else if (requiresFreshness && (nowMs - ts) > maxAgeMs) {
    reasons.push('STALE_EVIDENCE_EXPIRED');
    details.push(`Evidence age (${nowMs - ts}ms) exceeds maxAgeMs (${maxAgeMs}ms).`);
  }
}

function _checkContentAndFreshness(evidence, context, reasons, details) {
  const { expectedContent, expectedRevision, baseline } = _resolveExpectedHashes(evidence, context);
  const contentMismatch = Boolean(expectedContent && evidence.contentSha256 !== expectedContent);
  const revisionMismatch = Boolean(expectedRevision && evidence.revisionSha256 !== expectedRevision);
  if (contentMismatch || revisionMismatch) {
    const unchangedTs = Boolean(baseline?.retrievedAt && evidence.retrievedAt && baseline.retrievedAt === evidence.retrievedAt);
    reasons.push('STALE_CONTENT_MISMATCH');
    details.push(unchangedTs
      ? 'Content SHA-256 changed while retrievedAt timestamp remained unchanged.'
      : 'Evidence contentSha256/revisionSha256 does not match expected canonical digest.');
  }
  _checkTimestampFreshness(evidence, context, reasons, details);
}

function _resolvePortalReceiptObj(evidence, context) {
  if (evidence.receiptDir) return readPortalReceipt(evidence.receiptDir);
  if (evidence.receipt) return evidence.receipt;
  return context.portalReceipt || null;
}

function _rejectPortalReceipt(reasons, details, msg) {
  reasons.push('REJECTED_PORTAL_RECEIPT');
  details.push(msg);
}

function _checkPortalReceiptEvidence(evidence, context, reasons, details) {
  if (evidence.sourceType !== SOURCE_TYPES.PORTAL_RECEIPT_CAPTURE) return;
  const receipt = _resolvePortalReceiptObj(evidence, context);
  if (!receipt) {
    _rejectPortalReceipt(reasons, details, 'Portal receipt capture lacks a verifiable CLIC portal receipt or valid receipt directory.');
    return;
  }
  if (receipt.status !== 'CLIC_ACCEPTED') {
    _rejectPortalReceipt(reasons, details, `Portal receipt status "${receipt.status}" is not CLIC_ACCEPTED.`);
    return;
  }
  if (!receipt.manifestSha256 || !Array.isArray(receipt.rows) || receipt.rows.length === 0) {
    _rejectPortalReceipt(reasons, details, 'Portal receipt is missing required manifestSha256 or BOM rows.');
    return;
  }
  const expectedManifest = _firstText([evidence.manifestSha256, context.manifestSha256]);
  if (expectedManifest && receipt.manifestSha256 !== expectedManifest) {
    _rejectPortalReceipt(reasons, details, 'Portal receipt manifestSha256 does not match candidate manifest.');
    return;
  }
  const candidate = context.candidate || (Array.isArray(context.items) ? { ...context, items: context.items } : null);
  if (candidate && !receiptMatches(receipt, candidate, context)) {
    _rejectPortalReceipt(reasons, details, 'Portal receipt does not match candidate manifest, chassis, baseSku, owner, or selectors.');
  }
}

function _buildApplicabilityReport(reasons, details) {
  const uniqueReasons = [...new Set(reasons)];
  return {
    applicable: uniqueReasons.length === 0,
    reasonCode: uniqueReasons[0] || 'APPLICABLE',
    reasons: uniqueReasons,
    details,
    isSelfCitation: uniqueReasons.includes('REJECTED_SELF_CITATION'),
    isUntrusted: uniqueReasons.includes('REJECTED_UNTRUSTED_INPUT') || uniqueReasons.includes('REJECTED_NON_AUTHORITATIVE_SOURCE'),
    isMockOrSimulation: uniqueReasons.includes('REJECTED_MOCK_OR_SIMULATION'),
    isModelProposal: uniqueReasons.includes('NON_AUTHORITATIVE_MODEL_PROPOSAL'),
    isStaleOrExpired: uniqueReasons.includes('STALE_EVIDENCE_EXPIRED') || uniqueReasons.includes('STALE_EVIDENCE_MISSING_TIMESTAMP'),
    isContentMismatch: uniqueReasons.includes('STALE_CONTENT_MISMATCH')
  };
}

/**
 * Check whether an EvidenceRecord is authoritative, authentic, in-scope, and fresh.
 */
function checkEvidenceApplicability(evidence, context = {}) {
  if (!evidence || typeof evidence !== 'object' || !evidence.sourceType) {
    return _buildApplicabilityReport(['INVALID_EVIDENCE_RECORD'], ['Missing or malformed EvidenceRecord.']);
  }
  const { reasons, details } = _checkTrustAndOrigin(evidence, context);
  const scope = evidence.scope || {};
  _checkProductAndGeneration(scope, context, reasons, details);
  _checkRegion(scope, evidence.applicabilityConditions, context, reasons, details);
  _checkSelectorConditions(evidence, context, reasons, details);
  _checkContentAndFreshness(evidence, context, reasons, details);
  _checkPortalReceiptEvidence(evidence, context, reasons, details);
  return _buildApplicabilityReport(reasons, details);
}

function _resolveEvidencePolarity(claimRecord, record) {
  if (claimRecord.opposingEvidenceIds.includes(record.evidenceId)) return 'OPPOSING';
  if (claimRecord.supportingEvidenceIds.includes(record.evidenceId)) return 'SUPPORTING';
  const raw = String(_firstText([record.polarity, record.stance]) || '').toUpperCase();
  return ['OPPOSING', 'REFUTING', 'CONTRADICTING', 'FAIL'].includes(raw) ? 'OPPOSING' : 'SUPPORTING';
}

function _tierFromRecords(records) {
  const tiers = new Set(records.map(r => r.authority?.tier).filter(Boolean));
  if (tiers.has('TIER_3_OFFICIAL_VENDOR_ACCEPTANCE')) return 'TIER_3_OFFICIAL_VENDOR_ACCEPTANCE';
  if (tiers.has('TIER_2_DOCUMENT_CITATION')) return 'TIER_2_DOCUMENT_CITATION';
  if (tiers.has('TIER_1_PHYSICAL_SANITY')) return 'TIER_1_PHYSICAL_SANITY';
  return null;
}

function _evaluateClaimOutcome(claimRecord, partitions, context) {
  const { validSupporting, validOpposing, rejectedEvidence, modelProposals } = partitions;
  const emptyInventory = Array.isArray(context.authoritativeSourceIds) && context.authoritativeSourceIds.length === 0;
  const noValidRecords = validSupporting.length === 0 && validOpposing.length === 0;
  const hasInaccessibleInventory = context.inventoryStatus === 'INACCESSIBLE' || (emptyInventory && noValidRecords);

  if (validSupporting.length > 0 && validOpposing.length > 0) {
    return {
      status: 'CONTRADICTED',
      reasonCode: 'CONTRADICTING_AUTHORITATIVE_EVIDENCE',
      pendingMechanicalOrAuthoritativeCheck: false,
      note: 'Conflicting authoritative evidence preserved; newer capture timestamp never overrides differently scoped rules.'
    };
  }
  if (validOpposing.length > 0) {
    return {
      status: 'REJECTED',
      reasonCode: 'OPPOSED_BY_AUTHORITATIVE_EVIDENCE',
      pendingMechanicalOrAuthoritativeCheck: false,
      note: 'Claim refuted by applicable authoritative evidence.'
    };
  }
  if (validSupporting.length > 0) {
    return {
      status: 'SUPPORTED',
      reasonCode: 'SUPPORTED_BY_AUTHORITATIVE_EVIDENCE',
      pendingMechanicalOrAuthoritativeCheck: false,
      note: 'Claim backed by applicable authoritative evidence.'
    };
  }
  if (hasInaccessibleInventory) {
    return {
      status: 'UNKNOWN',
      reasonCode: 'UNKNOWN_INVENTORY_INACCESSIBLE',
      pendingMechanicalOrAuthoritativeCheck: false,
      note: 'Source inventory inaccessible or authoritative trust set empty; claim remains UNKNOWN.'
    };
  }
  if (modelProposals.length > 0 || claimRecord.claimType === 'MODEL_PROPOSAL') {
    return {
      status: 'UNKNOWN',
      reasonCode: 'PENDING_MECHANICAL_OR_AUTHORITATIVE_CHECK',
      pendingMechanicalOrAuthoritativeCheck: true,
      note: 'Model proposal is non-authoritative; model agreement does not constitute independent authority.'
    };
  }
  const primaryReject = rejectedEvidence[0]?.reasonCode || 'NO_AUTHORITATIVE_EVIDENCE';
  return {
    status: 'UNKNOWN',
    reasonCode: primaryReject,
    pendingMechanicalOrAuthoritativeCheck: false,
    note: rejectedEvidence.length > 0
      ? `Submitted evidence rejected (${primaryReject}); claim remains unverified.`
      : 'No authoritative EvidenceRecords supplied; bare citation counts carry zero authority.'
  };
}

function _partitionClaimEvidence(claimRecord, evidenceRecords, claimContext) {
  const validSupporting = [];
  const validOpposing = [];
  const rejectedEvidence = [];
  const modelProposals = [];

  for (const record of (Array.isArray(evidenceRecords) ? evidenceRecords : [])) {
    if (!record || typeof record !== 'object') continue;
    const verdict = checkEvidenceApplicability(record, claimContext);
    if (verdict.isModelProposal) modelProposals.push(record);
    if (!verdict.applicable) {
      rejectedEvidence.push({
        evidenceId: record.evidenceId || null,
        sourceId: record.sourceId || null,
        sourceType: record.sourceType || null,
        reasonCode: verdict.reasonCode,
        reasons: verdict.reasons,
        details: verdict.details
      });
    } else if (_resolveEvidencePolarity(claimRecord, record) === 'OPPOSING') {
      validOpposing.push(record);
    } else {
      validSupporting.push(record);
    }
  }
  return { validSupporting, validOpposing, rejectedEvidence, modelProposals };
}

function _mergeClaimContext(context, claimScope) {
  if (!claimScope || typeof claimScope !== 'object') return context;
  const ctxSel = context.selectors && typeof context.selectors === 'object' ? context.selectors : {};
  const clmSel = claimScope.selectors && typeof claimScope.selectors === 'object' ? claimScope.selectors : {};
  return {
    ...context,
    product: claimScope.product || context.product,
    generation: claimScope.generation || context.generation,
    baseSku: claimScope.baseSku || context.baseSku,
    owner: claimScope.owner || context.owner,
    region: claimScope.region || context.region,
    selectors: { ...ctxSel, ...clmSel }
  };
}

/**
 * Adjudicate a single ClaimRecord using only applicable authoritative EvidenceRecords.
 */
function adjudicateMaterialClaim(claim, evidenceRecords = [], context = {}) {
  const claimRecord = createClaimRecord(claim);
  const claimContext = _mergeClaimContext(context, claimRecord.scope);
  const partitions = _partitionClaimEvidence(claimRecord, evidenceRecords, claimContext);
  const outcome = _evaluateClaimOutcome(claimRecord, partitions, claimContext);
  const notes = [...claimRecord.adjudicationNotes, outcome.note];

  if (Number.isFinite(claimRecord.citationsCount) && claimRecord.citationsCount > 0 && partitions.validSupporting.length === 0) {
    notes.push('Bare citationsCount without typed EvidenceRecords rejected.');
  }

  return {
    ...claimRecord,
    status: outcome.status,
    reasonCode: outcome.reasonCode,
    isSupported: outcome.status === 'SUPPORTED',
    pendingMechanicalOrAuthoritativeCheck: outcome.pendingMechanicalOrAuthoritativeCheck,
    supportingEvidenceIds: partitions.validSupporting.map(r => r.evidenceId),
    opposingEvidenceIds: partitions.validOpposing.map(r => r.evidenceId),
    rejectedEvidenceIds: partitions.rejectedEvidence.map(r => r.evidenceId).filter(Boolean),
    supportingEvidence: partitions.validSupporting,
    opposingEvidence: partitions.validOpposing,
    rejectedEvidence: partitions.rejectedEvidence,
    highestTierSupported: outcome.status === 'SUPPORTED' ? _tierFromRecords(partitions.validSupporting) : null,
    adjudicationNotes: notes
  };
}

function _selectEvidenceForClaim(claim, allRecords) {
  const ids = new Set([
    ...(Array.isArray(claim.supportingEvidenceIds) ? claim.supportingEvidenceIds : []),
    ...(Array.isArray(claim.opposingEvidenceIds) ? claim.opposingEvidenceIds : [])
  ]);
  const embedded = [
    ...(Array.isArray(claim.supportingEvidence) ? claim.supportingEvidence : []),
    ...(Array.isArray(claim.opposingEvidence) ? claim.opposingEvidence : []),
    ...(Array.isArray(claim.evidence) ? claim.evidence : [])
  ];
  if (ids.size > 0) return [...allRecords.filter(r => r && ids.has(r.evidenceId)), ...embedded];
  if (claim.explicitEvidenceScope === true) return [...embedded];
  if (claim.claimId) {
    const claimScoped = allRecords.filter(r => r && r.claimId === claim.claimId);
    if (claimScoped.length > 0) return [...claimScoped, ...embedded];
  }
  return [...allRecords, ...embedded];
}

function _deriveOverallStatus(adjudicatedClaims) {
  if (adjudicatedClaims.length === 0) return 'UNKNOWN';
  const material = adjudicatedClaims.filter(c => c.materiality !== 'INFORMATIONAL');
  const active = material.length > 0 ? material : adjudicatedClaims;
  if (active.some(c => c.status === 'CONTRADICTED')) return 'CONTRADICTED';
  if (active.some(c => c.status === 'REJECTED')) return 'REJECTED';
  if (active.every(c => c.status === 'SUPPORTED')) return 'SUPPORTED';
  return 'UNKNOWN';
}

/**
 * Compute deterministic SHA-256 digest over adjudicated claims and evidence.
 */
function computeEvidenceDigest(payload = {}) {
  return sha256Hex(payload);
}

/**
 * Adjudicate all claims for a solution and bind them with a SHA-256 evidence digest.
 */
function adjudicateSolutionClaims(claims = [], evidenceRecords = [], context = {}) {
  const normalizedRecords = Array.isArray(evidenceRecords) ? evidenceRecords : [];
  const claimList = Array.isArray(claims) ? claims : [];
  const adjudicatedClaims = claimList.map(claim =>
    adjudicateMaterialClaim(claim, _selectEvidenceForClaim(claim, normalizedRecords), context)
  );

  const counts = {
    total: adjudicatedClaims.length,
    supported: adjudicatedClaims.filter(c => c.status === 'SUPPORTED').length,
    contradicted: adjudicatedClaims.filter(c => c.status === 'CONTRADICTED').length,
    rejected: adjudicatedClaims.filter(c => c.status === 'REJECTED').length,
    unknown: adjudicatedClaims.filter(c => c.status === 'UNKNOWN').length,
    rejectedEvidence: adjudicatedClaims.reduce((sum, c) => sum + c.rejectedEvidence.length, 0)
  };

  const overallStatus = _deriveOverallStatus(adjudicatedClaims);
  const evidenceDigestSha256 = computeEvidenceDigest({
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    overallStatus,
    claims: adjudicatedClaims.map(c => ({
      claimId: c.claimId,
      status: c.status,
      reasonCode: c.reasonCode,
      supportingEvidenceIds: c.supportingEvidenceIds,
      opposingEvidenceIds: c.opposingEvidenceIds,
      rejectedEvidenceIds: c.rejectedEvidenceIds
    })),
    evidenceHashes: normalizedRecords.map(r => ({
      evidenceId: r.evidenceId,
      sourceId: r.sourceId,
      sourceType: r.sourceType,
      contentSha256: r.contentSha256,
      revisionSha256: r.revisionSha256
    }))
  });

  return {
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    overallStatus,
    counts,
    hasContradictions: counts.contradicted > 0,
    hasRejections: counts.rejected > 0,
    hasPendingChecks: adjudicatedClaims.some(c => c.pendingMechanicalOrAuthoritativeCheck),
    claims: adjudicatedClaims,
    evidenceDigestSha256,
    adjudicatedAt: Number.isFinite(context.nowMs) ? new Date(context.nowMs).toISOString() : new Date().toISOString()
  };
}

module.exports = {
  checkEvidenceApplicability,
  adjudicateMaterialClaim,
  adjudicateSolutionClaims,
  computeEvidenceDigest
};
