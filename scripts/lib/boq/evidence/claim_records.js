'use strict';
/**
 * scripts/lib/boq/evidence/claim_records.js — Typed Evidence & Claim Records (SI-03)
 *
 * Implements typed EvidenceRecord (schemaVersion '1.0'), ClaimRecord,
 * independent evidence lanes (never flattening Tier 2 into Tier 3), and
 * adapters for local RAG search and ephemeral NotebookLM solution validation.
 */

const crypto = require('crypto');
const { verifyCurrentPortalReceipt } = require('../portal_receipt.js');

const EVIDENCE_SCHEMA_VERSION = '1.0';

const SOURCE_TYPES = Object.freeze({
  DETERMINISTIC_CALCULATION: 'DETERMINISTIC_CALCULATION',
  CATALOG_OBSERVATION: 'CATALOG_OBSERVATION',
  OFFICIAL_DOCUMENT_PASSAGE: 'OFFICIAL_DOCUMENT_PASSAGE',
  PORTAL_RECEIPT_CAPTURE: 'PORTAL_RECEIPT_CAPTURE',
  UNTRUSTED_INPUT: 'UNTRUSTED_INPUT',
  MODEL_PROPOSAL: 'MODEL_PROPOSAL'
});

const AUTHORITY_PROFILES = Object.freeze({
  [SOURCE_TYPES.DETERMINISTIC_CALCULATION]: {
    trustClass: 'DETERMINISTIC_CALCULATION',
    tier: 'TIER_1_PHYSICAL_SANITY',
    isAuthoritative: true,
    defaultRole: 'PHYSICAL_MATH_ENGINE'
  },
  [SOURCE_TYPES.CATALOG_OBSERVATION]: {
    trustClass: 'CATALOG_OBSERVATION',
    tier: 'TIER_2_DOCUMENT_CITATION',
    isAuthoritative: true,
    defaultRole: 'SCOPED_CATALOG'
  },
  [SOURCE_TYPES.OFFICIAL_DOCUMENT_PASSAGE]: {
    trustClass: 'OFFICIAL_DOCUMENT_PASSAGE',
    tier: 'TIER_2_DOCUMENT_CITATION',
    isAuthoritative: true,
    defaultRole: 'OFFICIAL_VENDOR_DOCUMENT'
  },
  [SOURCE_TYPES.PORTAL_RECEIPT_CAPTURE]: {
    trustClass: 'PORTAL_RECEIPT_CAPTURE',
    tier: 'TIER_3_OFFICIAL_VENDOR_ACCEPTANCE',
    isAuthoritative: true,
    defaultRole: 'LIVE_PORTAL_RECEIPT'
  },
  [SOURCE_TYPES.UNTRUSTED_INPUT]: {
    trustClass: 'UNTRUSTED_INPUT',
    tier: 'TIER_0_UNTRUSTED_CLAIM',
    isAuthoritative: false,
    defaultRole: 'CUSTOMER_OR_CANDIDATE_INPUT'
  },
  [SOURCE_TYPES.MODEL_PROPOSAL]: {
    trustClass: 'MODEL_PROPOSAL',
    tier: 'TIER_0_UNTRUSTED_CLAIM',
    isAuthoritative: false,
    defaultRole: 'LLM_PROPOSAL'
  }
});

const PORTAL_CLAIM_STATUSES = new Set([
  'ACCEPTED_BY_VENDOR',
  'CLIC_ACCEPTED',
  'CORRECTED_CANDIDATE_CLIC_ACCEPTED'
]);

function _isPlainObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function _firstPresent(candidates) {
  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null && String(candidate).trim() !== '') {
      return candidate;
    }
  }
  return null;
}

function _normalizeOptionalString(value) {
  const present = _firstPresent([value]);
  return present !== null ? String(present).trim() : null;
}

function canonicalJson(value) {
  return JSON.stringify(value, (key, entry) => {
    if (key.startsWith('_')) return undefined;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return entry;
    const keys = Object.keys(entry).filter(k => !k.startsWith('_')).sort();
    return Object.fromEntries(keys.map(k => [k, entry[k]]));
  });
}

function sha256Hex(value) {
  const payload = typeof value === 'string' ? value : canonicalJson(_firstPresent([value]) ?? null);
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function inferGenerationFromText(text) {
  if (!text) return null;
  const match = String(text).match(/\bgen\s*(\d+)\b/i);
  if (match) return `Gen${match[1]}`;
  const underscoreMatch = String(text).match(/_gen(\d+)(?:_|$)/i);
  return underscoreMatch ? `Gen${underscoreMatch[1]}` : null;
}

function _normalizeSelectors(rawSelectors) {
  if (!_isPlainObject(rawSelectors)) return {};
  const sorted = {};
  for (const key of Object.keys(rawSelectors).sort()) {
    if (rawSelectors[key] !== undefined) sorted[key] = rawSelectors[key];
  }
  return sorted;
}

function normalizeScope(rawScope = {}, input = {}) {
  const src = _isPlainObject(rawScope) ? rawScope : {};
  const product = _normalizeOptionalString(_firstPresent([src.product, src.chassis, input.product, input.chassis]));
  const rawGen = _firstPresent([src.generation, src.gen, input.generation, input.gen]);
  const generation = _normalizeOptionalString(rawGen) || inferGenerationFromText(product);
  const baseSku = _normalizeOptionalString(_firstPresent([src.baseSku, input.baseSku]));
  const owner = _normalizeOptionalString(_firstPresent([src.owner, src.configurationName, input.owner, input.configurationName]));
  const region = _normalizeOptionalString(_firstPresent([src.region, input.region]));
  const rawSelectors = _isPlainObject(src.selectors) ? src.selectors : input.selectors;
  return {
    product,
    generation,
    baseSku,
    owner,
    region,
    selectors: _normalizeSelectors(rawSelectors)
  };
}

function _normalizeFreshnessPolicy(rawPolicy, sourceType) {
  const policy = _isPlainObject(rawPolicy) ? rawPolicy : {};
  const hasExplicitMax = Object.prototype.hasOwnProperty.call(policy, 'maxAgeMs');
  let maxAgeMs = null;
  if (hasExplicitMax) {
    maxAgeMs = Number.isFinite(policy.maxAgeMs) ? policy.maxAgeMs : null;
  } else if (sourceType === SOURCE_TYPES.PORTAL_RECEIPT_CAPTURE) {
    maxAgeMs = 24 * 3600000;
  }
  return {
    maxAgeMs,
    allowHistorical: policy.allowHistorical === true
  };
}

function _resolveAuthorityProfile(sourceType, input) {
  const base = AUTHORITY_PROFILES[sourceType] || AUTHORITY_PROFILES[SOURCE_TYPES.UNTRUSTED_INPUT];
  const rawAuth = _isPlainObject(input.authority) ? input.authority : {};
  const isMock = Boolean(input.isMock || rawAuth.isMock);
  const isSimulation = Boolean(input.isSimulation || rawAuth.isSimulation);
  const isEphemeral = Boolean(input.isEphemeral || rawAuth.isEphemeral);
  const isAuthoritative = base.isAuthoritative && !isMock && !isSimulation && !isEphemeral;
  return {
    trustClass: base.trustClass,
    isAuthoritative,
    tier: isAuthoritative ? base.tier : 'TIER_0_UNTRUSTED_CLAIM',
    sourceRole: _normalizeOptionalString(_firstPresent([rawAuth.sourceRole, input.sourceRole])) || base.defaultRole,
    isMock,
    isSimulation,
    isEphemeral,
    verifiedBy: _normalizeOptionalString(_firstPresent([rawAuth.verifiedBy, input.verifiedBy]))
  };
}

function _buildContentHashes(input, passageText) {
  const explicitContentHash = _normalizeOptionalString(input.contentSha256);
  const rawContent = _firstPresent([input.rawContent, input.content, passageText]);
  const contentSha256 = explicitContentHash || (rawContent !== null ? sha256Hex(rawContent) : null);
  const explicitRevisionHash = _normalizeOptionalString(input.revisionSha256);
  return {
    contentSha256,
    revisionSha256: explicitRevisionHash || contentSha256 || null
  };
}

function _resolveEvidenceId(input, sourceType, sourceId, passageId, contentSha256, scope) {
  const explicit = _normalizeOptionalString(input.evidenceId);
  if (explicit) return explicit;
  const seed = { sourceType, sourceId, passageId, contentSha256, scope };
  return `EVD-${sha256Hex(seed).slice(0, 12).toUpperCase()}`;
}

function _normalizeSourceType(rawType) {
  return Object.prototype.hasOwnProperty.call(AUTHORITY_PROFILES, rawType)
    ? rawType
    : SOURCE_TYPES.UNTRUSTED_INPUT;
}

function _attachOptionalRecordFields(record, input) {
  if (input.expectedContentSha256) record.expectedContentSha256 = String(input.expectedContentSha256).trim();
  if (input.expectedRevisionSha256) record.expectedRevisionSha256 = String(input.expectedRevisionSha256).trim();
  const polarity = _firstPresent([input.polarity, input.stance]);
  if (polarity) record.polarity = String(polarity).toUpperCase();
  if (input.claimId) record.claimId = String(input.claimId);
  if (input.receipt) record.receipt = input.receipt;
  if (input.receiptDir) record.receiptDir = String(input.receiptDir);
  if (input.manifestSha256) record.manifestSha256 = String(input.manifestSha256).trim();
  return record;
}

/**
 * Create a typed EvidenceRecord (schemaVersion '1.0').
 */
function createEvidenceRecord(input = {}) {
  const sourceType = _normalizeSourceType(input.sourceType);
  const sourceId = _normalizeOptionalString(input.sourceId);
  const passageId = _normalizeOptionalString(input.passageId);
  const rawPassage = _firstPresent([input.passageText, input.text, input.snippet]);
  const passageText = rawPassage !== null ? String(rawPassage) : '';
  const retrievedAt = _normalizeOptionalString(_firstPresent([input.retrievedAt, input.capturedAt]));
  const scope = normalizeScope(input.scope, input);
  const authority = _resolveAuthorityProfile(sourceType, input);
  const { contentSha256, revisionSha256 } = _buildContentHashes(input, passageText);
  const freshnessPolicy = _normalizeFreshnessPolicy(input.freshnessPolicy, sourceType);
  const evidenceId = _resolveEvidenceId(input, sourceType, sourceId, passageId, contentSha256, scope);
  const applicabilityConditions = input.applicabilityConditions !== undefined ? input.applicabilityConditions : null;

  return _attachOptionalRecordFields({
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    evidenceId,
    sourceId,
    sourceType,
    revisionSha256,
    contentSha256,
    contentIdentityOnly: true,
    passageId,
    passageText,
    retrievedAt,
    scope,
    applicabilityConditions,
    authority,
    isAuthoritative: authority.isAuthoritative,
    trustClass: authority.trustClass,
    freshnessPolicy
  }, input);
}

function createDeterministicCalculationEvidence(input = {}) {
  return createEvidenceRecord({ ...input, sourceType: SOURCE_TYPES.DETERMINISTIC_CALCULATION });
}

function createCatalogObservationEvidence(input = {}) {
  return createEvidenceRecord({ ...input, sourceType: SOURCE_TYPES.CATALOG_OBSERVATION });
}

function createOfficialDocumentPassageEvidence(input = {}) {
  return createEvidenceRecord({ ...input, sourceType: SOURCE_TYPES.OFFICIAL_DOCUMENT_PASSAGE });
}

function createPortalReceiptCaptureEvidence(input = {}) {
  return createEvidenceRecord({ ...input, sourceType: SOURCE_TYPES.PORTAL_RECEIPT_CAPTURE });
}

function createUntrustedInputEvidence(input = {}) {
  const { authority: _ignoredAuth, isAuthoritative: _ignoredFlag, trustClass: _ignoredClass, ...rest } = input || {};
  return createEvidenceRecord({
    ...rest,
    sourceType: SOURCE_TYPES.UNTRUSTED_INPUT,
    isAuthoritative: false,
    trustClass: 'UNTRUSTED_INPUT'
  });
}

function createModelProposalEvidence(input = {}) {
  const { authority: _ignoredAuth, isAuthoritative: _ignoredFlag, trustClass: _ignoredClass, ...rest } = input || {};
  return createEvidenceRecord({
    ...rest,
    sourceType: SOURCE_TYPES.MODEL_PROPOSAL,
    isAuthoritative: false,
    trustClass: 'MODEL_PROPOSAL'
  });
}

function _uniqueStrings(list) {
  if (!Array.isArray(list)) return [];
  const cleaned = [];
  const seen = new Set();
  for (const item of list) {
    const val = _normalizeOptionalString(item);
    if (val && !seen.has(val)) {
      seen.add(val);
      cleaned.push(val);
    }
  }
  return cleaned;
}

/**
 * Create a typed ClaimRecord for mechanical adjudication.
 */
function createClaimRecord(input = {}) {
  const assertion = String(input.assertion || '').trim();
  const candidateRef = input.candidateRef !== undefined ? input.candidateRef : null;
  const requirementIds = _uniqueStrings(input.requirementIds);
  const claimId = _normalizeOptionalString(input.claimId) ||
    `CLM-${sha256Hex({ assertion, candidateRef, requirementIds }).slice(0, 12).toUpperCase()}`;

  const claim = {
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    claimId,
    assertion,
    candidateRef,
    requirementIds,
    materiality: String(input.materiality || 'MATERIAL').toUpperCase(),
    supportingEvidenceIds: _uniqueStrings(input.supportingEvidenceIds),
    opposingEvidenceIds: _uniqueStrings(input.opposingEvidenceIds),
    status: String(input.status || 'UNKNOWN').toUpperCase(),
    adjudicationNotes: Array.isArray(input.adjudicationNotes) ? [...input.adjudicationNotes] : []
  };

  if (_isPlainObject(input.scope)) claim.scope = normalizeScope(input.scope, input);
  if (input.claimType) claim.claimType = String(input.claimType).toUpperCase();
  if (Number.isFinite(input.citationsCount)) claim.citationsCount = input.citationsCount;
  if (input.pendingMechanicalOrAuthoritativeCheck === true) claim.pendingMechanicalOrAuthoritativeCheck = true;
  if (input.explicitEvidenceScope === true) claim.explicitEvidenceScope = true;
  return claim;
}

function _isCheckFailed(check) {
  return ['FAIL', 'FAILED', 'BLOCKED'].includes(String(check?.status || '').toUpperCase());
}

function _isCheckPassed(check) {
  return ['PASS', 'PASSED'].includes(String(check?.status || '').toUpperCase());
}

function _buildLocalPhysicalLane(input, evalResults) {
  if (_isPlainObject(input.localPhysicalChecks) && input.localPhysicalChecks.status) {
    return input.localPhysicalChecks;
  }
  const checks = Array.isArray(evalResults.aspectChecks) ? evalResults.aspectChecks : [];
  const errors = Array.isArray(evalResults.errors) ? evalResults.errors : [];
  const ran = evalResults.aspectChecksCompleted === true || checks.length > 0;
  const failed = evalResults.isMathClean === false || errors.length > 0 || checks.some(_isCheckFailed);
  const passedCount = checks.filter(_isCheckPassed).length;

  let status = 'NOT_RUN';
  if (failed) status = 'FAILED';
  else if (ran) status = 'PASSED';

  return {
    status,
    tier: 'TIER_1_PHYSICAL_SANITY',
    verified: status === 'PASSED',
    checksTotal: checks.length,
    checksPassed: passedCount,
    checksFailed: failed ? Math.max(1, checks.length - passedCount) : 0
  };
}

function _hasDisqualifiedEphemeralReview(input, ephemeralReview) {
  if (input.candidateReviewIsCurrent === false) return true;
  if (!ephemeralReview) return false;
  if (ephemeralReview.sourceDetached === false || ephemeralReview.isCloudGrounded === false || ephemeralReview.success === false) {
    return true;
  }
  return ephemeralReview.doubleCheckVerdict === 'DOUBLE_CHECK_UNVERIFIED';
}

function _resolveDocumentGroundingStatus(input, ephemeralReview, adjudication) {
  if (adjudication?.hasContradictions || adjudication?.overallStatus === 'CONTRADICTED') return 'CONTRADICTED';
  if (adjudication?.hasRejections || adjudication?.overallStatus === 'REJECTED' ||
    ephemeralReview?.doubleCheckVerdict === 'DOUBLE_CHECK_REJECTED') return 'REJECTED';
  if (input.isOffline) return 'OFFLINE_UNVERIFIED';
  if (input.isMock || ephemeralReview?.attachment?.isMock === true || ephemeralReview?.simulationPassed === true) {
    return 'SIMULATION_ONLY';
  }
  if (_hasDisqualifiedEphemeralReview(input, ephemeralReview)) return 'UNVERIFIED';
  if (input.candidateReviewIsCurrent === true || adjudication?.overallStatus === 'SUPPORTED') return 'GROUNDED';
  return 'UNVERIFIED';
}

function _buildDocumentGroundingLane(input, evalResults) {
  if (_isPlainObject(input.documentGrounding) && input.documentGrounding.status) {
    return input.documentGrounding;
  }
  const ephemeralReview = _firstPresent([input.ephemeralReview, evalResults.ephemeralSourceValidation]);
  const adjudication = _firstPresent([input.claimAdjudication, input.adjudication]);
  const status = _resolveDocumentGroundingStatus(input, ephemeralReview, adjudication);
  const verified = status === 'GROUNDED';
  const citations = Array.isArray(ephemeralReview?.citations) ? ephemeralReview.citations : [];
  const authoritativeSourceIds = Array.isArray(ephemeralReview?.authoritativeSourceIds) ? ephemeralReview.authoritativeSourceIds : [];
  const isMock = Boolean(input.isMock || ephemeralReview?.attachment?.isMock || ephemeralReview?.simulationPassed);

  return {
    status,
    tier: verified ? 'TIER_2_DOCUMENT_CITATION' : null,
    verified,
    vendorAcceptancePending: true,
    isMock,
    citationsCount: citations.length,
    authoritativeSourceCount: authoritativeSourceIds.length,
    evidenceDigestSha256: adjudication?.evidenceDigestSha256 || null
  };
}

function _hasPortalReceiptClaim(evalResults, input) {
  const raw = _firstPresent([
    input.portalReceipt, input.sessionReceipt, input.portalReceiptCheck, input.portalReceiptRejectionReason,
    evalResults.sessionReceipt, evalResults.portalReceipt, evalResults.clicReceipt
  ]);
  return Boolean(raw) || PORTAL_CLAIM_STATUSES.has(evalResults.portalValidationStatus);
}

function _buildLiveVendorAcceptanceLane(input, evalResults, context) {
  if (_isPlainObject(input.liveVendorAcceptance) && input.liveVendorAcceptance.status) {
    return input.liveVendorAcceptance;
  }
  const effectiveCtx = input.portalReceipt && !context.portalReceipt ? { ...context, portalReceipt: input.portalReceipt } : context;
  const receipt = input.portalReceiptCheck !== undefined ? input.portalReceiptCheck : verifyCurrentPortalReceipt(evalResults, effectiveCtx);

  if (receipt && receipt.status === 'CLIC_ACCEPTED') {
    return {
      status: 'CLIC_ACCEPTED',
      tier: 'TIER_3_OFFICIAL_VENDOR_ACCEPTANCE',
      verified: true,
      vendorAcceptancePending: false,
      receiptState: 'VERIFIED',
      manifestSha256: receipt.manifestSha256 || null,
      capturedAt: receipt.capturedAt || null,
      rejectionReasons: []
    };
  }

  const hadAttempt = _hasPortalReceiptClaim(evalResults, input);
  const rejectionReasons = input.portalReceiptRejectionReason
    ? [String(input.portalReceiptRejectionReason)]
    : (hadAttempt ? ['Portal receipt missing, stale, scope-mismatched, or failed manifest verification'] : []);

  return {
    status: 'PORTAL VALIDATION PENDING',
    tier: null,
    verified: false,
    vendorAcceptancePending: true,
    receiptState: hadAttempt ? 'REJECTED' : 'MISSING',
    manifestSha256: null,
    capturedAt: null,
    rejectionReasons
  };
}

function _resolveCloudSyncStatus(input, trustEntry, health) {
  const rawState = String(_firstPresent([input.cloudSyncState, trustEntry.cloudSyncState]) || '').toUpperCase();
  if (input.isOffline) return 'OFFLINE';
  if (health.isHealthy === false || rawState === 'FAILED' || rawState === 'DEGRADED') return 'DEGRADED';
  if (rawState === 'VERIFIED') return 'VERIFIED';
  return 'UNKNOWN';
}

function _buildCloudSynchronizationLane(input, evalResults) {
  if (_isPlainObject(input.cloudSynchronization) && input.cloudSynchronization.status) {
    return input.cloudSynchronization;
  }
  const trustEntry = _isPlainObject(input.trustEntry) ? input.trustEntry : {};
  const health = _isPlainObject(input.notebookHealth) ? input.notebookHealth : (_isPlainObject(evalResults.notebookHealth) ? evalResults.notebookHealth : {});
  const status = _resolveCloudSyncStatus(input, trustEntry, health);
  const notebookId = _normalizeOptionalString(_firstPresent([trustEntry.notebookId, input.notebookId, evalResults.ephemeralSourceValidation?.notebookId]));
  const officialIds = Array.isArray(trustEntry.officialSourceIds) ? trustEntry.officialSourceIds : [];

  return {
    status,
    notebookId,
    lastSyncedAt: trustEntry.lastSyncedAt || null,
    authoritativeSourceCount: officialIds.length
  };
}

function _isPublicationBlocked(evalResults, lanes) {
  if (evalResults.customerDisposition === 'DELIVERY_BLOCKED_UNBUILDABLE') return true;
  if (lanes.localPhysicalChecks.status === 'FAILED') return true;
  return lanes.documentGrounding.status === 'CONTRADICTED' || lanes.documentGrounding.status === 'REJECTED';
}

function _buildPublicationStateLane(input, evalResults, lanes) {
  if (_isPlainObject(input.publicationState) && input.publicationState.status) {
    return input.publicationState;
  }
  const auth = _firstPresent([input.deliveryAuthorization, evalResults.deliveryAuthorization]);
  const gate = _firstPresent([input.acceptanceGate, evalResults.acceptanceGate]);
  const deliveryAuthorized = Boolean(auth?.token && auth?.signature && gate?.isValid === true);
  const blocked = _isPublicationBlocked(evalResults, lanes);

  let status = 'PORTAL VALIDATION PENDING';
  if (blocked) status = 'DELIVERY_BLOCKED';
  else if (lanes.liveVendorAcceptance.verified && deliveryAuthorized) status = 'PORTAL_CERTIFIED_READY';
  else if (deliveryAuthorized) status = 'AUTHORIZED_PENDING_PORTAL';

  return {
    status,
    deliveryAuthorized,
    tier3Accepted: lanes.liveVendorAcceptance.verified === true,
    portalValidationPending: lanes.liveVendorAcceptance.vendorAcceptancePending !== false,
    watermarkRequired: lanes.liveVendorAcceptance.verified !== true
  };
}

function _resolveHighestTier(lanes) {
  if (lanes.liveVendorAcceptance.verified) return 'TIER_3_OFFICIAL_VENDOR_ACCEPTANCE';
  if (lanes.documentGrounding.verified) return 'TIER_2_DOCUMENT_CITATION';
  if (lanes.localPhysicalChecks.status === 'PASSED') return 'TIER_1_PHYSICAL_SANITY';
  return 'TIER_0_UNTRUSTED_CLAIM';
}

/**
 * Construct independent evidence lanes keeping Tier 1 math, Tier 2 document review,
 * Tier 3 live portal acceptance, cloud sync, and publication state strictly separated.
 */
function buildIndependentEvidenceStates(input = {}) {
  const evalResults = _isPlainObject(input.evalResults) ? input.evalResults : {};
  const context = _isPlainObject(input.context) ? input.context : {};
  const localPhysicalChecks = _buildLocalPhysicalLane(input, evalResults);
  const documentGrounding = _buildDocumentGroundingLane(input, evalResults);
  const liveVendorAcceptance = _buildLiveVendorAcceptanceLane(input, evalResults, context);
  const cloudSynchronization = _buildCloudSynchronizationLane(input, evalResults);
  const lanes = { localPhysicalChecks, documentGrounding, liveVendorAcceptance, cloudSynchronization };
  const publicationState = _buildPublicationStateLane(input, evalResults, lanes);

  return {
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    localPhysicalChecks,
    documentGrounding,
    liveVendorAcceptance,
    cloudSynchronization,
    publicationState,
    highestAchievedTier: _resolveHighestTier(lanes),
    portalValidationStatus: liveVendorAcceptance.status
  };
}

function _buildLocalEvidenceFields(meta, citation, idx, context) {
  const passageText = String(_firstPresent([citation.snippet, citation.title, meta.text]) || '');
  const sourceId = _normalizeOptionalString(_firstPresent([meta.catalogPath, citation.url, context.sourceId])) || 'local-catalog';
  const product = _normalizeOptionalString(_firstPresent([meta.product, context.chassisName]));
  const generation = _normalizeOptionalString(meta.generation) || inferGenerationFromText(product);
  return {
    sourceId,
    passageId: _normalizeOptionalString(_firstPresent([meta.ruleId, citation.title])) || `local-match-${idx + 1}`,
    passageText,
    retrievedAt: context.retrievedAt || new Date().toISOString(),
    scope: {
      product,
      generation,
      baseSku: meta.baseSku || null,
      region: meta.region || null,
      selectors: meta.selectors || {}
    },
    applicabilityConditions: meta.applicabilityConditions || null,
    sourceRole: meta.sourceRole || 'LOCAL_CATALOG_RAG'
  };
}

function _mapLocalMatchToRecord(rm, idx, context) {
  const meta = _isPlainObject(rm?.evidenceMeta) ? rm.evidenceMeta : {};
  const citation = _isPlainObject(rm?.citation) ? rm.citation : {};
  const fields = _buildLocalEvidenceFields({ ...meta, text: rm?.text }, citation, idx, context);

  if (meta.verificationStatus === 'QUARANTINED' || meta.sourceType === SOURCE_TYPES.UNTRUSTED_INPUT) {
    return createUntrustedInputEvidence(fields);
  }
  if (meta.sourceType === SOURCE_TYPES.OFFICIAL_DOCUMENT_PASSAGE) {
    return createOfficialDocumentPassageEvidence(fields);
  }
  return createCatalogObservationEvidence(fields);
}

function _mapCitationToRecord(citation, idx, context) {
  const product = _normalizeOptionalString(context.chassisName);
  const passageText = String(_firstPresent([citation.snippet, citation.title]) || '');
  return createCatalogObservationEvidence({
    sourceId: _normalizeOptionalString(_firstPresent([citation.url, context.sourceId])) || 'local-catalog',
    passageId: _normalizeOptionalString(citation.title) || `local-citation-${idx + 1}`,
    passageText,
    retrievedAt: context.retrievedAt || new Date().toISOString(),
    scope: { product, generation: inferGenerationFromText(product) },
    sourceRole: 'LOCAL_CATALOG_CITATION'
  });
}

function _citationIdentityKey(citation) {
  if (!citation) return '';
  return `${citation.url || ''}::${citation.title || ''}::${citation.snippet || ''}`;
}

function _collectLocalMatchRecord(rm, idx, context, pushUnique, seenCitations) {
  if (!rm) return;
  if (!rm.citation && !rm.text) return;
  pushUnique(_mapLocalMatchToRecord(rm, idx, context));
  if (rm.citation) seenCitations.add(_citationIdentityKey(rm.citation));
}

function _collectCitationRecord(c, idx, context, pushUnique, seenCitations) {
  if (!c) return;
  if (!c.snippet && !c.title && !c.url) return;
  if (!seenCitations.has(_citationIdentityKey(c))) pushUnique(_mapCitationToRecord(c, idx, context));
}

/**
 * Normalize local RAG search matches and citations into typed EvidenceRecords.
 */
function normalizeLocalEvidenceRecords(rawMatches = [], citations = [], context = {}) {
  const records = [];
  const seenKeys = new Set();
  const seenCitations = new Set();
  const pushUnique = record => {
    const key = `${record.sourceId || ''}::${record.passageId || ''}::${record.contentSha256 || ''}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      records.push(record);
    }
  };

  if (Array.isArray(rawMatches)) rawMatches.forEach((rm, idx) => _collectLocalMatchRecord(rm, idx, context, pushUnique, seenCitations));
  if (Array.isArray(citations)) citations.forEach((c, idx) => _collectCitationRecord(c, idx, context, pushUnique, seenCitations));
  return records;
}

function _extractCitationPassageText(citation) {
  return String(_firstPresent([
    citation.cited_text, citation.snippet, citation.excerpt, citation.quote, citation.passage, citation.title
  ]) || '');
}

function _extractCitationScope(citation, chassis) {
  const product = _normalizeOptionalString(_firstPresent([citation.product, citation.chassis, chassis]));
  const generation = _normalizeOptionalString(citation.generation) || inferGenerationFromText(product);
  return {
    product,
    generation,
    region: citation.region || null,
    selectors: _isPlainObject(citation.selectors) ? citation.selectors : {}
  };
}

function _mapEphemeralCitation(citation, idx, validationResult, options) {
  const isMock = Boolean(validationResult.attachment?.isMock || validationResult.simulationPassed || options.isMock);
  const chassis = _firstPresent([validationResult.chassis, options.chassis]);
  const retrievedAt = _isPlainObject(citation)
    ? _firstPresent([citation.retrievedAt, validationResult.reviewedAt])
    : validationResult.reviewedAt;

  if (!_isPlainObject(citation)) {
    return createUntrustedInputEvidence({
      sourceId: null,
      passageId: `citation-${idx + 1}`,
      passageText: String(citation || ''),
      retrievedAt,
      scope: { product: chassis },
      isMock
    });
  }

  const srcId = _normalizeOptionalString(_firstPresent([citation.sourceId, citation.source_id, citation.id]));
  const passageId = _normalizeOptionalString(_firstPresent([citation.index, citation.citation_number, citation.citationNumber])) || `citation-${idx + 1}`;
  const passageText = _extractCitationPassageText(citation);
  const scope = _extractCitationScope(citation, chassis);
  if (!srcId) {
    return createUntrustedInputEvidence({ sourceId: null, passageId, passageText, retrievedAt, scope, isMock });
  }

  const isSelf = citation.isEphemeral === true || (Boolean(validationResult.sourceId) && srcId === String(validationResult.sourceId).trim());
  return createOfficialDocumentPassageEvidence({
    sourceId: srcId,
    passageId,
    passageText,
    retrievedAt,
    scope,
    applicabilityConditions: citation.applicabilityConditions || null,
    contentSha256: citation.contentSha256 || null,
    expectedContentSha256: citation.expectedContentSha256 || null,
    isEphemeral: isSelf,
    isMock
  });
}

function _selectRankDocIds(row, docRecords) {
  const rowCits = Array.isArray(row?.citations) ? row.citations.map(String) : [];
  if (rowCits.length === 0) return [];
  return docRecords
    .filter(r => r.passageId && rowCits.some(c => c.includes(`[${r.passageId}]`)))
    .map(r => r.evidenceId);
}

function _isRankVerdictCleanPass(row) {
  return Boolean(
    row &&
    row.verdict === 'PASS' &&
    row.intentPreserved === true &&
    row.mandatoryChangesOnly === true &&
    Array.isArray(row.issues) &&
    row.issues.length === 0
  );
}

function _collectExpectedRankKeys(evalResults, validationResult) {
  const manifest = Array.isArray(validationResult.manifest) ? validationResult.manifest : [];
  const graph = _isPlainObject(evalResults?.conflictGraph) ? evalResults.conflictGraph : {};
  const ranked = Array.isArray(graph.recommendedSolutions)
    ? graph.recommendedSolutions
    : (Array.isArray(graph.rankedSolutions) ? graph.rankedSolutions : []);
  const sourceRanks = manifest.length > 0 ? manifest : ranked;
  const keys = sourceRanks.map(entry => entry?.rank).filter(r => r !== undefined && r !== null);
  if (keys.length > 0) return [...new Set(keys.map(String))];
  const verdicts = Array.isArray(validationResult.rankVerdicts) ? validationResult.rankVerdicts : [];
  return [...new Set(verdicts.map(r => r?.rank).filter(r => r !== undefined && r !== null).map(String))];
}

function _buildSingleRankClaim(rankKey, rankVerdicts, docRecords, validationResult, chassis) {
  const matches = rankVerdicts.filter(r => r && String(r.rank) === rankKey);
  const baseProps = {
    claimId: `CLM-RANK-${rankKey}`,
    assertion: `Candidate Rank ${rankKey} complies with scoped vendor rules for ${chassis || 'target chassis'}`,
    candidateRef: { rank: rankKey, manifestSha256: validationResult.manifestSha256 || null },
    explicitEvidenceScope: true
  };
  if (matches.length !== 1) {
    const note = matches.length === 0
      ? `Unreviewed manifest rank "${rankKey}" missing from rankVerdicts.`
      : `Ambiguous duplicate rankVerdicts entries for rank "${rankKey}".`;
    return createClaimRecord({ ...baseProps, adjudicationNotes: [note] });
  }
  const row = matches[0];
  const docIds = _selectRankDocIds(row, docRecords);
  if (row.verdict === 'FAIL') {
    return createClaimRecord({ ...baseProps, opposingEvidenceIds: docIds, adjudicationNotes: ['Rank verdict reported FAIL.'] });
  }
  if (_isRankVerdictCleanPass(row)) {
    return createClaimRecord({ ...baseProps, supportingEvidenceIds: docIds });
  }
  return createClaimRecord({
    ...baseProps,
    adjudicationNotes: ['Rank verdict lacks clean PASS prerequisites (intentPreserved, mandatoryChangesOnly, and zero issues).']
  });
}

function _buildEphemeralRankClaims(evalResults, validationResult, docRecords, chassis) {
  const rankVerdicts = Array.isArray(validationResult.rankVerdicts) ? validationResult.rankVerdicts : [];
  const rankKeys = _collectExpectedRankKeys(evalResults, validationResult);
  if (rankKeys.length === 0) {
    return [createClaimRecord({
      claimId: 'CLM-SOLUTION-GROUNDING',
      assertion: `Whole-solution grounding check for ${chassis || 'target chassis'}`,
      candidateRef: { manifestSha256: validationResult.manifestSha256 || null },
      supportingEvidenceIds: docRecords.map(record => record.evidenceId)
    })];
  }
  return rankKeys.map(rankKey => _buildSingleRankClaim(rankKey, rankVerdicts, docRecords, validationResult, chassis));
}

function _buildEphemeralContext(evalResults, validationResult, options, chassis, authoritativeSourceIds) {
  const hasInventory = Boolean(validationResult.notebookId) && authoritativeSourceIds.length > 0;
  return {
    product: chassis,
    generation: _normalizeOptionalString(evalResults.generation) || inferGenerationFromText(chassis),
    baseSku: _normalizeOptionalString(_firstPresent([evalResults.baseSku, evalResults.base])),
    owner: _normalizeOptionalString(_firstPresent([evalResults.configurationName, evalResults.owner])),
    region: _normalizeOptionalString(_firstPresent([evalResults.region, options.region])),
    selectors: _isPlainObject(evalResults.selectors) ? evalResults.selectors : (_isPlainObject(options.selectors) ? options.selectors : {}),
    ephemeralSourceId: validationResult.sourceId || null,
    authoritativeSourceIds,
    quarantinedSourceIds: Array.isArray(options.quarantinedSourceIds) ? options.quarantinedSourceIds : [],
    inventoryStatus: hasInventory ? 'ACCESSIBLE' : 'INACCESSIBLE',
    expectedContentHashes: options.expectedContentHashes || {}
  };
}

/**
 * Build typed EvidenceRecords, ClaimRecords, and adjudication context for
 * validateSolutionWithEphemeralSource().
 */
function buildEphemeralValidationEvidence(evalResults = {}, validationResult = {}, options = {}) {
  const chassis = _normalizeOptionalString(_firstPresent([validationResult.chassis, evalResults.chassis, options.chassis]));
  const authoritativeSourceIds = Array.isArray(validationResult.authoritativeSourceIds) ? validationResult.authoritativeSourceIds : [];
  const evidenceRecords = [createUntrustedInputEvidence({
    sourceId: 'customer-baseline-input',
    passageId: 'baseline-items',
    passageText: canonicalJson(evalResults.items || []),
    retrievedAt: validationResult.reviewedAt,
    scope: { product: chassis }
  })];

  if (validationResult.sourceId) {
    evidenceRecords.push(createUntrustedInputEvidence({
      sourceId: validationResult.sourceId,
      passageId: 'ephemeral-candidate-sheet',
      passageText: validationResult.sourceTitle || 'Ephemeral candidate CSV',
      retrievedAt: validationResult.reviewedAt,
      scope: { product: chassis },
      isEphemeral: true
    }));
  }

  const rawCitations = Array.isArray(validationResult.citations) ? validationResult.citations : [];
  const citationRecords = rawCitations.map((citation, idx) => _mapEphemeralCitation(citation, idx, validationResult, options));
  evidenceRecords.push(...citationRecords);

  return {
    claims: _buildEphemeralRankClaims(evalResults, validationResult, citationRecords, chassis),
    evidenceRecords,
    context: _buildEphemeralContext(evalResults, validationResult, options, chassis, authoritativeSourceIds)
  };
}

module.exports = {
  EVIDENCE_SCHEMA_VERSION,
  SOURCE_TYPES,
  canonicalJson,
  sha256Hex,
  inferGenerationFromText,
  normalizeScope,
  createEvidenceRecord,
  createDeterministicCalculationEvidence,
  createCatalogObservationEvidence,
  createOfficialDocumentPassageEvidence,
  createPortalReceiptCaptureEvidence,
  createUntrustedInputEvidence,
  createModelProposalEvidence,
  createClaimRecord,
  buildIndependentEvidenceStates,
  normalizeLocalEvidenceRecords,
  buildEphemeralValidationEvidence
};
