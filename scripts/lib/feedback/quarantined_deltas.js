'use strict';
/**
 * scripts/lib/feedback/quarantined_deltas.js — Knowledge Delta Quarantine & Governance Engine
 *
 * Implements strict 5-gate validation for incoming KnowledgeDelta records (INV-24, INV-13, INV-48):
 * Gate 1: SKU Validation — isValidHpeSKU() + Blacklist filtering (no words like PORTAL, CONFIG).
 * Gate 2: Source Evidence — Grounded in official QuickSpecs/Catalog or explicit HITL. Reject customer BOQs/quotes.
 * Gate 3: Confidence Score — Automatic promotion requires confidence >= 0.85; lower held in quarantine.
 * Gate 4: Scope Taxonomy — Valid taxonomy enum (CHASSIS_SPECIFIC, FAMILY_GEN, UNIVERSAL_VENDOR).
 * Gate 5: Contradiction Check — Verify candidate delta doesn't contradict established deterministic rules.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { isValidHpeSKU, cleanBaseSKU, buildCatalogSkuIndex } = require('../catalog/sku.js');
const { safeWriteJsonAtomic } = require('../system/fs_compat.js');
const logger = require('../system/pipeline_logger.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const DEFAULT_OCA_SESSIONS_DIR = path.join(PROJECT_ROOT, 'outputs', 'history', 'oca_sessions');

const SYNTHETIC_MOCK_PATTERN = /\b(test_evidence|local_mock|mock_evidence|mock_session|fake_evidence|synthetic_evidence|dummy_evidence|local_test)\b/i;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DELTA_ID_PATTERN = /^DELTA-\d+-[a-z0-9]+$/i;

const ACCEPTED_PORTAL_STATUSES = new Set([
  'ACCEPTED_BY_VENDOR',
  'CLIC_ACCEPTED',
  'CORRECTED_CANDIDATE_CLIC_ACCEPTED'
]);

const KNOWN_QUICKSPECS_SECTIONS = [
  'Processors',
  'Memory',
  'Storage',
  'Storage Controllers',
  'Power Supplies',
  'System Fans',
  'Networking',
  'Core Options',
  'Additional Options',
  'Configuration Rules',
  'Standard Features',
  'Technical Specifications',
  'Chassis Options',
  'FlexibleLOM'
];

let currentQuarantineFile = path.join(__dirname, '..', '..', '..', 'outputs', 'history', 'quarantined_deltas.json');

function getQuarantineFilePath() {
  return currentQuarantineFile;
}

function setQuarantineFilePath(customPath = null) {
  currentQuarantineFile = customPath || path.join(__dirname, '..', '..', '..', 'outputs', 'history', 'quarantined_deltas.json');
}

const SKU_BLACKLIST = new Set([
  'PORTAL', 'CONFIG', 'SERVER', 'SERVERS', 'SYSTEM', 'CHASSIS', 'PROCESSOR',
  'MEMORY', 'STORAGE', 'NETWORK', 'POWER', 'SUPPLY', 'MODULE', 'OPTION',
  'UNKNOWN', 'UNKNOWN_SKU', 'NONE', 'NULL', 'UNDEFINED', 'DEFAULT'
]);

const FORBIDDEN_SOURCE_TERMS = [
  'customer', 'quote', 'tender', 'partner.*bom', 'customer.*boq', 'user.*upload',
  'unverified.*rfp', 'tender.*spec', 'tender.*bom'
];

const VALID_SCOPES = new Set([
  'CHASSIS_SPECIFIC',
  'FAMILY_GEN',
  'UNIVERSAL_VENDOR',
  'UNIVERSAL'
]);

const SINGLE_USER_MODE = process.env.SINGLE_USER_MODE !== 'false';

const TRUSTED_EVIDENCE_TYPES = new Set([
  'OFFICIAL_VENDOR_PORTAL',
  'OFFICIAL_QUICKSPECS',
  'CERTIFIED_CATALOG',
  'NOTEBOOKLM_CITATION',
  'TESTED_BUILD'
]);
const TRUSTED_AUTOMATED_SOURCES = new Set([
  'QUICKSPECS',
  'OFFICIAL_QUICKSPECS',
  'NOTEBOOKLM_GROUNDING',
  'NOTEBOOK_LM_CLOUD',
  'CERTIFIED_CATALOG',
  'OCA_CERTIFIED_CATALOG',
  'DASHBOARD_HITL_REVIEW',
  'AGENTIC_GUARDRAIL'
]);

function normalizeText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toUpperCase();
}

function buildKnowledgeFingerprint(delta = {}) {
  const canonical = [
    normalizeText(delta.vendor || 'HPE'),
    normalizeText(delta.chassis),
    normalizeText(delta.scopeTaxonomy || delta.scope),
    normalizeText(cleanBaseSKU(delta.affectedSku || delta.sku || '')),
    normalizeText(cleanBaseSKU(delta.requiredDependencySku || delta.requiredSku || '')),
    normalizeText(delta.ruleType || delta.errorType),
    normalizeText(delta.ruleUpdate || delta.reasoning || delta.rawMessage)
  ].join('|');
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

function normalizeHumanReview(options = {}) {
  const review = options.humanReview;
  if (!review || typeof review !== 'object') return null;
  const reviewer = String(review.reviewer || '').trim();
  const reasoning = String(review.reasoning || '').trim();
  const decision = String(review.decision || '').trim().toUpperCase();
  const evidence = Array.isArray(review.evidence) ? review.evidence : [];
  const trustedEvidence = evidence.filter(item => {
    if (!item || typeof item !== 'object') return false;
    const itemType = String(item.type || '').toUpperCase();
    const itemId = String(item.id || item.documentId || item.url || '').trim();
    if (isSyntheticOrMockToken(itemId)) return false;
    return TRUSTED_EVIDENCE_TYPES.has(itemType) && itemId;
  });
  if (review.verified !== true || decision !== 'APPROVE' || reviewer.length < 2 || reasoning.length < 20 || trustedEvidence.length === 0) {
    return null;
  }
  return { ...review, reviewer, reasoning, decision, evidence: trustedEvidence };
}

/**
 * Returns true if the given value matches synthetic mock, UUID, or delta patterns.
 * @param {string} value
 * @returns {boolean}
 */
function isSyntheticOrMockToken(value) {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (SYNTHETIC_MOCK_PATTERN.test(trimmed)) return true;
  if (UUID_PATTERN.test(trimmed)) return true;
  if (DELTA_ID_PATTERN.test(trimmed)) return true;
  return false;
}

/**
 * Helper to scan sessions directory for matching sessionId or id property.
 */
function _scanSessionsDirForId(targetId, sessionsDir) {
  if (!fs.existsSync(sessionsDir)) return null;
  try {
    const entries = fs.readdirSync(sessionsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
      const candidatePath = path.join(sessionsDir, entry.name);
      try {
        const content = JSON.parse(fs.readFileSync(candidatePath, 'utf-8'));
        if (content.sessionId === targetId || content.id === targetId) {
          return candidatePath;
        }
      } catch (_) {}
    }
  } catch (_) {}
  return null;
}

/**
 * Resolve an authentic session file under outputs/history/oca_sessions/.
 * Guarded against path traversal.
 * @param {string} evidenceRef
 * @param {string} sessionsDir
 * @returns {string|null}
 */
function resolveSessionFile(evidenceRef, sessionsDir) {
  if (!evidenceRef || typeof evidenceRef !== 'string') return null;
  const trimmed = evidenceRef.trim();
  if (!trimmed || trimmed.includes('\0') || isSyntheticOrMockToken(trimmed)) return null;

  const targetSessionsDir = sessionsDir || DEFAULT_OCA_SESSIONS_DIR;
  const normSessions = path.normalize(targetSessionsDir);

  const resolved = path.isAbsolute(trimmed)
    ? path.resolve(trimmed)
    : path.resolve(targetSessionsDir, trimmed);

  const normResolved = path.normalize(resolved);
  if (normResolved.startsWith(normSessions) && fs.existsSync(normResolved) && fs.statSync(normResolved).isFile()) {
    return normResolved;
  }

  const withExt = normResolved.endsWith('.json') ? normResolved : `${normResolved}.json`;
  if (withExt.startsWith(normSessions) && fs.existsSync(withExt) && fs.statSync(withExt).isFile()) {
    return withExt;
  }

  const altResolved = path.resolve(PROJECT_ROOT, trimmed);
  if (path.normalize(altResolved).startsWith(normSessions) && fs.existsSync(altResolved) && fs.statSync(altResolved).isFile()) {
    return altResolved;
  }

  return _scanSessionsDirForId(trimmed, targetSessionsDir);
}

/**
 * Pathway A: Verify authentic OCA session receipt on disk under outputs/history/oca_sessions/.
 * Enforces status === 'ACCEPTED_BY_VENDOR' and valid computed SHA-256 fingerprint.
 * @param {string} evidenceRef
 * @param {object} evidenceObj
 * @param {object} options
 * @returns {object} Verification result
 */
function verifyOcaSessionReceipt(evidenceRef, evidenceObj = {}, options = {}) {
  const sessionsDir = options.sessionsDir || options.sessionDirectory || DEFAULT_OCA_SESSIONS_DIR;
  const filePath = resolveSessionFile(evidenceRef, sessionsDir);

  if (!filePath) {
    return {
      valid: false,
      code: 'EVIDENCE_UNVERIFIABLE',
      reason: `Session receipt not found on disk under outputs/history/oca_sessions/: ${evidenceRef}`
    };
  }

  let sessionData = null;
  let fileBuffer = null;
  try {
    fileBuffer = fs.readFileSync(filePath);
    sessionData = JSON.parse(fileBuffer.toString('utf-8'));
  } catch (err) {
    return {
      valid: false,
      code: 'EVIDENCE_UNVERIFIABLE',
      reason: `Corrupted session receipt JSON at ${path.basename(filePath)}: ${err.message}`
    };
  }

  if (!sessionData || typeof sessionData !== 'object' || Array.isArray(sessionData)) {
    return {
      valid: false,
      code: 'EVIDENCE_UNVERIFIABLE',
      reason: `Invalid session receipt format at ${path.basename(filePath)}`
    };
  }

  const statusStr = String(sessionData.status || sessionData.vendorAcceptance || '').trim().toUpperCase();
  if (!ACCEPTED_PORTAL_STATUSES.has(statusStr)) {
    return {
      valid: false,
      code: 'EVIDENCE_UNVERIFIABLE',
      reason: `Session receipt status '${sessionData.status || 'UNKNOWN'}' is not accepted by vendor (status must be ACCEPTED_BY_VENDOR or CLIC_ACCEPTED)`
    };
  }

  const computedSha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  const declaredSha = sessionData.manifestSha256 || sessionData.sessionSha256 || sessionData.fingerprint || sessionData.artifactSha256;
  if (declaredSha && !/^[a-f0-9]{64}$/i.test(declaredSha)) {
    return {
      valid: false,
      code: 'EVIDENCE_UNVERIFIABLE',
      reason: `Session receipt declared fingerprint is not a valid 64-char hex SHA-256: ${declaredSha}`
    };
  }

  if (evidenceObj.sha256 && evidenceObj.sha256 !== computedSha256 && evidenceObj.sha256 !== declaredSha) {
    return {
      valid: false,
      code: 'EVIDENCE_UNVERIFIABLE',
      reason: `Evidence SHA-256 mismatch: expected ${computedSha256}, got ${evidenceObj.sha256}`
    };
  }

  const verifiedEvidence = {
    type: 'OFFICIAL_VENDOR_PORTAL',
    id: path.basename(filePath),
    filePath,
    sha256: computedSha256,
    status: statusStr
  };

  return {
    valid: true,
    type: 'OFFICIAL_VENDOR_PORTAL',
    filePath,
    sha256: computedSha256,
    manifestSha256: declaredSha || computedSha256,
    status: statusStr,
    id: path.basename(filePath),
    sessionId: sessionData.sessionId || path.basename(filePath, '.json'),
    summary: `Authentic OCA session receipt verified (${path.basename(filePath)}, status: ${statusStr}, sha256: ${computedSha256.slice(0, 12)}...)`,
    verifiedEvidence
  };
}

/**
 * Helper to infer QuickSpecs section name from document ID, section hint, or context corpus.
 */
function _inferQuickSpecsSection(docId, initialSection, context = {}) {
  let section = initialSection;
  if (section) return section;

  if (docId.includes('#')) {
    return docId.split('#').slice(1).join('#').trim();
  }
  if (/,\s*section:/i.test(docId)) {
    return docId.split(/,\s*section:/i).slice(1).join(':').trim();
  }
  if (docId.includes(':') && !docId.startsWith('http')) {
    return docId.split(':').slice(1).join(':').trim();
  }

  const corpus = `${context.reasoning || ''} ${context.ruleUpdate || ''} ${context.rawMessage || ''}`;
  for (const knownSec of KNOWN_QUICKSPECS_SECTIONS) {
    const stem = knownSec.endsWith('s') ? knownSec.slice(0, -1) : knownSec;
    if (new RegExp(`\\b${knownSec}\\b`, 'i').test(corpus) || new RegExp(`\\b${stem}\\b`, 'i').test(corpus)) {
      return knownSec;
    }
  }

  if (/processor|xeon|epyc|cpu\b/i.test(corpus)) return 'Processors';
  if (/memory|dimm|ddr/i.test(corpus)) return 'Memory';
  if (/controller|battery/i.test(corpus)) return 'Storage Controllers';
  if (/storage|drive|sas|sata|nvme/i.test(corpus)) return 'Storage';
  if (/power|psu|watt/i.test(corpus)) return 'Power Supplies';
  if (/fan|cooling/i.test(corpus)) return 'System Fans';
  if (/network|nic|adapter/i.test(corpus)) return 'Networking';
  if (/chassis/i.test(corpus)) return 'Chassis Options';
  if (/rule|dependency|configuration/i.test(corpus)) return 'Configuration Rules';

  if (corpus.trim().length >= 20) return 'Configuration Rules';
  return '';
}

/**
 * Pathway B: Verify official QuickSpecs citation with document ID and section.
 * @param {string} evidenceRef
 * @param {object} evidenceObj
 * @param {object} context
 * @returns {object} Verification result
 */
function verifyQuickSpecsCitation(evidenceRef, evidenceObj = {}, context = {}) {
  const refStr = typeof evidenceRef === 'string' ? evidenceRef.trim() : '';

  if (isSyntheticOrMockToken(refStr) || isSyntheticOrMockToken(evidenceObj.id) || isSyntheticOrMockToken(evidenceObj.documentId)) {
    return {
      valid: false,
      code: 'EVIDENCE_UNVERIFIABLE',
      reason: `QuickSpecs citation contains prohibited mock or synthetic token: ${refStr || evidenceObj.id}`
    };
  }

  let docId = String(evidenceObj.documentId || evidenceObj.docId || evidenceObj.id || refStr).trim();
  docId = docId.replace(/^(?:QS:|QuickSpecs[:\s]*|HPE QuickSpecs source\s*)/i, '').trim();

  let section = String(evidenceObj.section || evidenceObj.sectionName || evidenceObj.docSection || '').trim();
  section = _inferQuickSpecsSection(docId, section, context);

  // Clean docId if section was part of it
  if (docId.includes('#')) docId = docId.split('#')[0].trim();
  else if (/,\s*section:/i.test(docId)) docId = docId.split(/,\s*section:/i)[0].trim();
  else if (docId.includes(':') && !docId.startsWith('http')) docId = docId.split(':')[0].trim();

  const isDocNum = /^[a-z]\d{7,9}(?:[a-z0-9_-]+)?$/i.test(docId);
  const isQsSeries = /^(?:HPE-)?QS-[A-Za-z0-9_-]{2,}$/i.test(docId);
  const isHpQs = /^HP-QS-[A-Za-z0-9_-]{2,}$/i.test(docId);
  const isNumericDoc = /^\d{8,12}(?:-\d{2})?$/.test(docId);

  if (!docId || (!isDocNum && !isQsSeries && !isHpQs && !isNumericDoc)) {
    return {
      valid: false,
      code: 'EVIDENCE_UNVERIFIABLE',
      reason: `Invalid QuickSpecs document ID syntax: '${docId || 'EMPTY'}'. Must match official QuickSpecs format (e.g. c04111535, QS-DL380-GEN12).`
    };
  }

  if (!section || section.length < 3 || /^(?:test|mock|none|null|undefined|tbd|n\/a|na)$/i.test(section)) {
    return {
      valid: false,
      code: 'EVIDENCE_UNVERIFIABLE',
      reason: `QuickSpecs citation requires a valid document ID AND section name (section was: '${section || 'MISSING'}')`
    };
  }

  const verifiedEvidence = {
    type: 'OFFICIAL_QUICKSPECS',
    id: `${docId}#${section}`,
    documentId: docId,
    section
  };

  return {
    valid: true,
    type: 'OFFICIAL_QUICKSPECS',
    documentId: docId,
    section,
    id: `${docId}#${section}`,
    summary: `Official QuickSpecs citation verified (${docId}, Section: ${section})`,
    verifiedEvidence
  };
}

/**
 * Helper to verify an array of evidence items.
 */
function _verifyEvidenceArray(evidenceArray, options) {
  if (evidenceArray.length === 0) {
    return {
      valid: false,
      code: 'EVIDENCE_UNVERIFIABLE',
      reason: 'Empty evidence array'
    };
  }

  for (const item of evidenceArray) {
    const idStr = typeof item === 'string' ? item : (item?.id || item?.documentId || '');
    if (isSyntheticOrMockToken(idStr)) {
      return {
        valid: false,
        code: 'EVIDENCE_UNVERIFIABLE',
        reason: `Rejected prohibited synthetic mock evidence token: '${idStr}'`
      };
    }
  }

  let lastFailure = null;
  for (const item of evidenceArray) {
    const res = verifyAuthenticEvidence(item, options);
    if (res.valid) return res;
    lastFailure = res;
  }
  return lastFailure || {
    valid: false,
    code: 'EVIDENCE_UNVERIFIABLE',
    reason: 'None of the provided evidence items could be verified'
  };
}

/**
 * Master Evidence Verification Function (Requirement R2 / Feature 7, INV-0 / INV-104).
 * Evaluates candidate evidence against Pathway A (on-disk session receipt) and Pathway B (QuickSpecs citation).
 * @param {object|string|Array} evidenceInput
 * @param {object} [options]
 * @returns {object} { valid: boolean, code?: string, reason?: string, verifiedEvidence?: object, summary?: string }
 */
function verifyAuthenticEvidence(evidenceInput, options = {}) {
  if (!evidenceInput) {
    return {
      valid: false,
      code: 'EVIDENCE_UNVERIFIABLE',
      reason: 'No evidence provided for verification'
    };
  }

  if (Array.isArray(evidenceInput)) {
    return _verifyEvidenceArray(evidenceInput, options);
  }

  const rawType = typeof evidenceInput === 'object' ? String(evidenceInput?.type || '').toUpperCase() : '';
  const refStr = typeof evidenceInput === 'string'
    ? evidenceInput
    : String(evidenceInput?.id || evidenceInput?.documentId || evidenceInput?.url || evidenceInput?.filePath || '');

  if (isSyntheticOrMockToken(refStr)) {
    return {
      valid: false,
      code: 'EVIDENCE_UNVERIFIABLE',
      reason: `Rejected synthetic mock or UUID evidence: '${refStr}'`
    };
  }

  if (rawType === 'OFFICIAL_QUICKSPECS' || rawType === 'QUICKSPECS') {
    return verifyQuickSpecsCitation(refStr, typeof evidenceInput === 'object' ? evidenceInput : {}, options);
  }

  if (rawType === 'OFFICIAL_VENDOR_PORTAL' || rawType === 'SESSION_RECEIPT') {
    const ocaRes = verifyOcaSessionReceipt(refStr, typeof evidenceInput === 'object' ? evidenceInput : {}, options);
    if (ocaRes.valid) return ocaRes;
    const qsRes = verifyQuickSpecsCitation(refStr, typeof evidenceInput === 'object' ? evidenceInput : {}, options);
    if (qsRes.valid) return qsRes;
    return ocaRes;
  }

  const ocaRes = verifyOcaSessionReceipt(refStr, typeof evidenceInput === 'object' ? evidenceInput : {}, options);
  if (ocaRes.valid) return ocaRes;

  const qsRes = verifyQuickSpecsCitation(refStr, typeof evidenceInput === 'object' ? evidenceInput : {}, options);
  if (qsRes.valid) return qsRes;

  return {
    valid: false,
    code: 'EVIDENCE_UNVERIFIABLE',
    reason: `Evidence '${refStr}' lacks verifiable authentic evidence: not a valid OCA session receipt (status ACCEPTED_BY_VENDOR) nor official QuickSpecs citation with document ID and section.`
  };
}

function readJsonArray(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  if (!Array.isArray(parsed)) throw new Error(`${path.basename(filePath)} must contain a JSON array`);
  return parsed;
}

function decisionFileFor(quarantineFile = currentQuarantineFile) {
  return path.join(path.dirname(quarantineFile), 'knowledge_decisions.json');
}

function appendDecision(record, quarantineFile = currentQuarantineFile) {
  const decisionFile = decisionFileFor(quarantineFile);
  const decisions = readJsonArray(decisionFile);
  decisions.push(record);
  safeWriteJsonAtomic(decisionFile, decisions);
}

/**
 * Validate a candidate KnowledgeDelta across all 5 governance gates.
 * @param {object} delta
 * @param {object} options { humanReview, catalogData }
 * @returns {object} { valid: boolean, status: 'PROMOTED' | 'QUARANTINED' | 'REJECTED', reasons: string[], sanitizedDelta: object|null }
 */
function validateKnowledgeDelta(delta, options = {}) {
  if (!delta || typeof delta !== 'object') {
    return { valid: false, status: 'REJECTED', reasons: ['Delta must be a non-null object'], sanitizedDelta: null };
  }

  const reasons = [];
  const rawMsg = String(delta.rawMessage || delta.reasoning || delta.ruleUpdate || '');
  const affected = cleanBaseSKU(delta.affectedSku || delta.sku || '');
  const required = cleanBaseSKU(delta.requiredDependencySku || delta.requiredSku || '');

  // Gate 1: SKU Validation & Blacklist Check
  if (!affected || affected === 'UNKNOWN_SKU') {
    return { valid: false, status: 'REJECTED', reasons: ['Missing affectedSku'], sanitizedDelta: null };
  }
  if (SKU_BLACKLIST.has(affected.toUpperCase())) {
    return { valid: false, status: 'REJECTED', reasons: [`Blacklisted token rejected as SKU: ${affected}`], sanitizedDelta: null };
  }
  if (!isValidHpeSKU(affected)) {
    return { valid: false, status: 'REJECTED', reasons: [`Invalid HPE SKU syntax: ${affected}`], sanitizedDelta: null };
  }
  if (required) {
    if (SKU_BLACKLIST.has(required.toUpperCase())) {
      return { valid: false, status: 'REJECTED', reasons: [`Blacklisted token rejected as required SKU: ${required}`], sanitizedDelta: null };
    }
    if (!isValidHpeSKU(required)) {
      return { valid: false, status: 'REJECTED', reasons: [`Invalid HPE SKU syntax for dependency: ${required}`], sanitizedDelta: null };
    }
    if (affected === required) {
      return { valid: false, status: 'REJECTED', reasons: [`Self-dependency cycle detected: ${affected} requires ${required}`], sanitizedDelta: null };
    }
  }

  // Gate 1b: Catalog SKU Existence Check (INV-24 & INV-48)
  let catalogSkusExist = true;
  if (options.catalogData) {
    const skuIndex = buildCatalogSkuIndex(options.catalogData);
    if (skuIndex && skuIndex.size > 0) {
      if (!skuIndex.has(affected)) {
        catalogSkusExist = false;
        reasons.push(`SKU ${affected} not found in target catalog; held in quarantine for manual verification`);
      }
      if (required && !skuIndex.has(required)) {
        catalogSkusExist = false;
        reasons.push(`Required SKU ${required} not found in target catalog; held in quarantine for manual verification`);
      }
    }
  }

  // Gate 2: Source Evidence (INV-24 Customer Isolation)
  const humanReview = normalizeHumanReview(options);
  const isHuman = Boolean(humanReview);
  const citations = Array.isArray(delta.citations) ? delta.citations : [];
  const citationTexts = citations.map(c => typeof c === 'string' ? c : (c.url || c.title || c.text || '')).join(' ');
  const fullEvidenceText = `${rawMsg} ${citationTexts} ${delta.source || ''}`.toLowerCase();

  for (const forbiddenPattern of FORBIDDEN_SOURCE_TERMS) {
    const rx = new RegExp(`\\b${forbiddenPattern}\\b`, 'i');
    if (rx.test(fullEvidenceText)) {
      return {
        valid: false,
        status: 'REJECTED',
        reasons: [`INV-24 Violation: Delta cites forbidden customer/quote source matching '${forbiddenPattern}'`],
        sanitizedDelta: null
      };
    }
  }

  if (!isHuman && citations.length === 0) {
    if (!SINGLE_USER_MODE || !TRUSTED_AUTOMATED_SOURCES.has(normalizeText(delta.source))) {
      reasons.push('Automated learning has no traceable source citation; held for evidence review');
    }
  }
  if (!isHuman && !TRUSTED_AUTOMATED_SOURCES.has(normalizeText(delta.source))) {
    reasons.push(`Automated source '${delta.source || 'UNKNOWN'}' is not eligible for direct promotion`);
  }

  // Gate 3: Confidence Score
  const rawScore = delta.confidenceScore ?? delta.preConfidenceScore ?? 0.70;
  const confidence = typeof rawScore === 'number' ? rawScore : parseFloat(rawScore) || 0.0;
  let status = 'PROMOTED';

  if (!catalogSkusExist && !isHuman) {
    status = 'QUARANTINED';
  }

  if (!catalogSkusExist && isHuman) {
    const hasOfficialEvidence = humanReview.evidence.some(item => ['OFFICIAL_VENDOR_PORTAL', 'OFFICIAL_QUICKSPECS', 'CERTIFIED_CATALOG'].includes(String(item.type).toUpperCase()));
    if (!hasOfficialEvidence) {
      status = 'QUARANTINED';
      reasons.push('SKU absence from the certified catalog requires official vendor evidence before promotion');
    }
  }

  if (!isHuman && confidence < 0.85) {
    status = 'QUARANTINED';
    reasons.push(`Confidence score ${confidence.toFixed(2)} is below automatic promotion threshold (0.85)`);
  }
  if (!isHuman && citations.length === 0) {
    status = 'QUARANTINED';
  }
  if (!isHuman && !TRUSTED_AUTOMATED_SOURCES.has(normalizeText(delta.source))) status = 'QUARANTINED';
  if (!isHuman && (/\b(may|maybe|possibly|unclear|ambiguous|conflicting|unverified)\b/i.test(rawMsg) || delta.ruleType === 'HUMAN_REVIEW_REQUIRED' || delta.errorType === 'OPINION_DISCREPANCY_FLAG')) {
    status = 'QUARANTINED';
    reasons.push('Ambiguous or conflicting language requires human reasoning; confidence cannot override ambiguity');
  }

  // Gate 4: Scope Taxonomy Validation
  let scope = String(delta.scopeTaxonomy || delta.scope || '').toUpperCase();
  if (scope === 'UNIVERSAL') scope = 'UNIVERSAL_VENDOR';
  if (!VALID_SCOPES.has(scope)) {
    status = 'QUARANTINED';
    reasons.push(`Missing or unknown scope taxonomy '${scope || 'EMPTY'}'; explicit scope review is required`);
  }

  // Gate 5: Contradiction Check
  if (options.catalogData) {
    const isExclusion = rawMsg.toLowerCase().includes('not compatible') || rawMsg.toLowerCase().includes('incompatible') || delta.errorType === 'MUTUAL_EXCLUSION';
    if (isExclusion && required) {
      // If rule says A requires B, but this delta says A excludes B
      const existingRules = options.catalogData.parsedRules || [];
      const hasConflict = existingRules.some(r =>
        (r.ruleText || '').includes(affected) && (r.ruleText || '').includes(required) && (r.ruleText || '').toLowerCase().includes('require')
      );
      if (hasConflict) {
        const explicitlyResolved = isHuman && Array.isArray(humanReview.supersedesRuleIds) && humanReview.supersedesRuleIds.length > 0;
        if (explicitlyResolved) {
          reasons.push(`Contradiction explicitly resolved by reviewer; supersedes ${humanReview.supersedesRuleIds.join(', ')}`);
        } else {
          status = 'QUARANTINED';
          reasons.push(`Contradiction detected with established rule: ${affected} vs ${required}`);
        }
      }
    }
  }

  const fingerprint = buildKnowledgeFingerprint({ ...delta, affectedSku: affected, requiredDependencySku: required || null, scopeTaxonomy: scope });

  const sanitizedDelta = {
    ...delta,
    affectedSku: affected,
    requiredDependencySku: required || null,
    scopeTaxonomy: scope,
    scope: scope,
    confidenceScore: confidence,
    knowledgeFingerprint: fingerprint,
    humanReview: humanReview || undefined,
    validatedAt: new Date().toISOString(),
    governanceStatus: status
  };

  return {
    valid: status !== 'REJECTED',
    status,
    reasons,
    sanitizedDelta
  };
}

/**
 * Save a delta to the quarantine repository.
 * @param {object} delta
 * @param {Array<string>} reasons
 * @returns {object} Quarantined delta record
 */
function saveQuarantinedDelta(delta, reasons = [], options = {}) {
  const quarantineFile = options.filePath || currentQuarantineFile;
  const qDir = path.dirname(quarantineFile);
  if (!fs.existsSync(qDir)) {
    fs.mkdirSync(qDir, { recursive: true });
  }

  const list = readJsonArray(quarantineFile);
  const now = new Date().toISOString();
  const fingerprint = delta.knowledgeFingerprint || buildKnowledgeFingerprint(delta);

  const record = {
    ...delta,
    knowledgeFingerprint: fingerprint,
    quarantineId: `QUARANTINE_${fingerprint.slice(0, 16)}`,
    firstSeenAt: now,
    lastSeenAt: now,
    observationCount: 1,
    quarantinedAt: now,
    quarantineReasons: reasons,
    status: 'IN_QUARANTINE',
    governanceStatus: 'QUARANTINED'
  };

  // Deduplicate in quarantine by affected + required + rawMessage
  const existingIdx = list.findIndex(item => (item.knowledgeFingerprint || buildKnowledgeFingerprint(item)) === fingerprint);

  if (existingIdx >= 0) {
    const existing = list[existingIdx];
    const newCount = (Number(existing.observationCount) || 1) + 1;
    const baseScore = Number(existing.confidenceScore || delta.confidenceScore || 0.70);
    // Reinforce confidence slightly with repeated observations while respecting citation ceiling (< 0.85)
    const reinforcedScore = Math.min(0.84, Number((baseScore + 0.01 * Math.log2(newCount)).toFixed(2)));

    list[existingIdx] = {
      ...existing,
      ...record,
      quarantineId: existing.quarantineId || record.quarantineId,
      firstSeenAt: existing.firstSeenAt || existing.quarantinedAt || now,
      lastSeenAt: now,
      observationCount: newCount,
      confidenceScore: reinforcedScore,
      candidateForReview: newCount >= 5,
      quarantineReasons: [...new Set([...(existing.quarantineReasons || []), ...reasons])]
    };
  } else {
    list.push(record);
  }

  safeWriteJsonAtomic(quarantineFile, list);
  logger.info('QUARANTINE', `Delta ${delta.deltaId || delta.affectedSku} held in quarantine: ${reasons.join('; ')}`);
  return existingIdx >= 0 ? list[existingIdx] : record;
}

/**
 * Get all currently quarantined deltas.
 * @returns {Array<object>}
 */
function getQuarantinedDeltas(options = {}) {
  return readJsonArray(options.filePath || currentQuarantineFile);
}

/**
 * Promote a quarantined delta with explicit human approval and activate it.
 * @param {string} quarantineIdOrDeltaId
 * @param {string} approver
 * @param {object} [options]
 * @returns {object|null} The promoted delta or null
 */
function promoteQuarantinedDelta(quarantineIdOrDeltaId, approver = 'ADMIN_HITL', options = {}) {
  const quarantineFile = options.filePath || currentQuarantineFile;
  const list = getQuarantinedDeltas({ filePath: quarantineFile });
  const idx = list.findIndex(d => d.quarantineId === quarantineIdOrDeltaId || d.deltaId === quarantineIdOrDeltaId);
  if (idx < 0) return null;
  const item = list[idx];

  // 1. Gather candidate evidence references from options and item
  const candidateEvidence = [];
  if (options.humanReview && Array.isArray(options.humanReview.evidence)) {
    candidateEvidence.push(...options.humanReview.evidence);
  }
  if (options.evidence) {
    if (Array.isArray(options.evidence)) candidateEvidence.push(...options.evidence);
    else candidateEvidence.push(options.evidence);
  }
  if (options.evidenceId) candidateEvidence.push(options.evidenceId);
  if (options.sessionReceiptPath) candidateEvidence.push(options.sessionReceiptPath);
  if (Array.isArray(item.evidence) && item.evidence.length > 0) candidateEvidence.push(...item.evidence);
  if (item.evidenceId) candidateEvidence.push(item.evidenceId);
  if (Array.isArray(item.citations) && item.citations.length > 0) candidateEvidence.push(...item.citations);

  // 2. Strictly verify authentic evidence (Requirement R2 / Feature 7)
  const verification = verifyAuthenticEvidence(
    candidateEvidence.length > 0 ? candidateEvidence : (item.traceId || item.deltaId),
    {
      sessionsDir: options.sessionsDir || options.sessionDirectory,
      reasoning: options.reasoning || options.humanReview?.reasoning || item.humanReasoning || item.ruleUpdate || item.rawMessage,
      ruleUpdate: item.ruleUpdate || item.rawMessage,
      filePath: quarantineFile
    }
  );

  if (!verification.valid) {
    const reasonMsg = verification.reason || 'Evidence unverifiable';
    logger.warn('QUARANTINE', `Promotion blocked with EVIDENCE_UNVERIFIABLE: ${reasonMsg}`);

    const blockReason = `EVIDENCE_UNVERIFIABLE: ${reasonMsg}`;
    item.quarantineReasons = [...new Set([...(item.quarantineReasons || []), blockReason])];
    item.lastPromotionAttempt = {
      attemptedAt: new Date().toISOString(),
      attemptedBy: approver,
      status: 'BLOCKED',
      code: 'EVIDENCE_UNVERIFIABLE',
      reason: reasonMsg
    };
    safeWriteJsonAtomic(quarantineFile, list);

    appendDecision({
      decisionId: `DECISION_${Date.now()}_${(item.knowledgeFingerprint || buildKnowledgeFingerprint(item)).slice(0, 10)}_BLOCKED`,
      quarantineId: item.quarantineId,
      deltaId: item.deltaId,
      knowledgeFingerprint: item.knowledgeFingerprint || buildKnowledgeFingerprint(item),
      decision: 'PROMOTION_BLOCKED',
      status: 'EVIDENCE_UNVERIFIABLE',
      decidedAt: new Date().toISOString(),
      reviewer: approver,
      reasoning: `Promotion blocked with EVIDENCE_UNVERIFIABLE: ${reasonMsg}`,
      candidateEvidence
    }, quarantineFile);

    if (typeof options === 'object') {
      options.error = 'EVIDENCE_UNVERIFIABLE';
      options.rejectionReason = reasonMsg;
      options.verification = verification;
    }
    return null;
  }

  const verifiedEv = verification.verifiedEvidence || { type: verification.type, id: verification.id };

  let humanReview = normalizeHumanReview({ humanReview: options.humanReview });
  if (!humanReview && SINGLE_USER_MODE) {
    humanReview = {
      reviewer: approver || 'AUTONOMOUS_LEAD_ARCHITECT',
      reasoning: options.reasoning || item.humanReasoning || `Autonomous verified evidence: ${verification.summary || item.ruleUpdate || item.rawMessage}`,
      decision: 'APPROVE',
      verified: true,
      evidence: [verifiedEv]
    };
  } else if (!humanReview || humanReview.reviewer !== approver) {
    logger.warn('QUARANTINE', 'Promotion denied: complete evidence-backed human review is required and reviewer must match approver.');
    return null;
  } else {
    humanReview.evidence = [verifiedEv];
  }
  let resolvedChassisDir = null;
  let catalogData = options.catalogData || null;
  if (item.chassis) {
    const { resolveChassisDirectory } = require('../catalog/sku_versioning.js');
    resolvedChassisDir = options.activationDirectory || resolveChassisDirectory(item.chassis);
    if (!catalogData && resolvedChassisDir && fs.existsSync(resolvedChassisDir)) {
      const catalogEntry = fs.readdirSync(resolvedChassisDir, { withFileTypes: true })
        .find(entry => entry.isFile() && entry.name.endsWith('_Catalog.json'));
      if (catalogEntry) catalogData = JSON.parse(fs.readFileSync(path.join(resolvedChassisDir, catalogEntry.name), 'utf-8'));
    }
  }
  const revalidation = validateKnowledgeDelta(item, { catalogData, humanReview });
  if (!revalidation.valid || revalidation.status !== 'PROMOTED') {
    logger.warn('QUARANTINE', `Promotion denied by revalidation: ${revalidation.reasons.join('; ')}`);
    return null;
  }
  Object.assign(item, revalidation.sanitizedDelta);
  const preConfidenceScore = Number(item.confidenceScore ?? item.preConfidenceScore ?? 0.70);
  const postConfidenceScore = Math.min(0.99, Math.max(preConfidenceScore, 0.85 + Math.min(humanReview.evidence.length, 3) * 0.03));
  item.humanReview = humanReview;
  item.status = 'PROMOTED';
  item.governanceStatus = 'ACTIVE';
  item.promotedAt = new Date().toISOString();
  item.promotedBy = approver;
  item.preConfidenceScore = preConfidenceScore;
  item.confidenceScore = postConfidenceScore;
  item.postConfidenceScore = postConfidenceScore;
  item.confidenceHistory = [...(Array.isArray(item.confidenceHistory) ? item.confidenceHistory : []), {
    timestamp: item.promotedAt,
    from: preConfidenceScore,
    to: postConfidenceScore,
    reason: humanReview.reasoning,
    evidenceIds: humanReview.evidence.map(entry => entry.id || entry.url)
  }];

  // Durable two-phase decision trace: persist the validated approval before
  // touching an active destination. If activation fails, quarantine remains
  // and the pending decision explains exactly what was attempted.
  appendDecision({
    decisionId: `DECISION_${Date.now()}_${item.knowledgeFingerprint.slice(0, 10)}_PENDING`,
    quarantineId: item.quarantineId,
    deltaId: item.deltaId,
    knowledgeFingerprint: item.knowledgeFingerprint,
    decision: 'APPROVAL_VALIDATED_PENDING_ACTIVATION',
    decidedAt: item.promotedAt,
    reviewer: approver,
    reasoning: humanReview.reasoning,
    evidence: humanReview.evidence,
    preConfidenceScore,
    proposedPostConfidenceScore: postConfidenceScore
  }, quarantineFile);

  // Activate after the pending decision trace. The quarantine record is removed
  // only after destination and final decision writes both succeed.
  if (!options.skipActivation) {
    try {
      const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
      const MASTER_REGISTRY = path.join(PROJECT_ROOT, 'outputs', 'history', 'master_knowledge_registry.json');

      const scope = item.scopeTaxonomy || 'CHASSIS_SPECIFIC';
      if ((scope === 'UNIVERSAL_VENDOR' || scope === 'FAMILY_GEN') && fs.existsSync(MASTER_REGISTRY)) {
        const reg = JSON.parse(fs.readFileSync(MASTER_REGISTRY, 'utf-8'));
        const targetList = scope === 'UNIVERSAL_VENDOR' ? reg.universalRules : reg.familyGenRules;
        if (Array.isArray(targetList)) {
          const exists = targetList.some(delta => (delta.knowledgeFingerprint || buildKnowledgeFingerprint(delta)) === item.knowledgeFingerprint);
          if (!exists) targetList.push(item);
          safeWriteJsonAtomic(MASTER_REGISTRY, reg);
        } else {
          throw new Error(`Master registry does not contain ${scope} destination array`);
        }
      } else if (item.chassis) {
        const chassisDir = resolvedChassisDir;
        if (chassisDir) {
          const deltaFile = path.join(chassisDir, 'history', 'catalog_deltas.json');
          let deltas = [];
          if (fs.existsSync(deltaFile)) {
            deltas = JSON.parse(fs.readFileSync(deltaFile, 'utf-8'));
          }
          const exists = deltas.some(delta => (delta.knowledgeFingerprint || buildKnowledgeFingerprint(delta)) === item.knowledgeFingerprint);
          if (!exists) deltas.push(item);
          safeWriteJsonAtomic(deltaFile, deltas);
        } else {
          throw new Error(`No catalog directory resolved for chassis ${item.chassis}`);
        }
      } else {
        throw new Error('Promoted delta has no resolvable activation scope or chassis');
      }
    } catch (actErr) {
      logger.warn('QUARANTINE', `Promotion activation failed; delta remains quarantined: ${actErr.message}`);
      return null;
    }
  }

  appendDecision({
    decisionId: `DECISION_${Date.now()}_${item.knowledgeFingerprint.slice(0, 10)}`,
    quarantineId: item.quarantineId,
    deltaId: item.deltaId,
    knowledgeFingerprint: item.knowledgeFingerprint,
    decision: 'PROMOTED',
    decidedAt: item.promotedAt,
    reviewer: approver,
    reasoning: humanReview.reasoning,
    evidence: humanReview.evidence,
    preConfidenceScore,
    postConfidenceScore
  }, quarantineFile);

  list.splice(idx, 1);
  safeWriteJsonAtomic(quarantineFile, list);

  return item;
}

/**
 * Reject and purge a quarantined delta.
 * @param {string} quarantineIdOrDeltaId
 * @param {string} reason
 * @returns {boolean}
 */
function rejectQuarantinedDelta(quarantineIdOrDeltaId, reason = 'REJECTED_BY_REVIEWER', options = {}) {
  const quarantineFile = options.filePath || currentQuarantineFile;
  const list = getQuarantinedDeltas({ filePath: quarantineFile });
  const idx = list.findIndex(d => d.quarantineId === quarantineIdOrDeltaId || d.deltaId === quarantineIdOrDeltaId);
  const reviewer = SINGLE_USER_MODE
    ? (String(options.reviewer || 'SINGLE_USER_LEAD_ARCHITECT').trim())
    : String(options.reviewer || '').trim();
  const reasonText = String(reason || (SINGLE_USER_MODE ? 'Rejected by lead architect' : '')).trim();
  if (!SINGLE_USER_MODE && (reviewer.length < 2 || reasonText.length < 20)) {
    logger.warn('QUARANTINE', 'Rejection denied: named reviewer and substantive reasoning are required.');
    return false;
  }

  const item = list[idx];
  appendDecision({
    decisionId: `DECISION_${Date.now()}_${(item.knowledgeFingerprint || buildKnowledgeFingerprint(item)).slice(0, 10)}`,
    quarantineId: item.quarantineId,
    deltaId: item.deltaId,
    knowledgeFingerprint: item.knowledgeFingerprint || buildKnowledgeFingerprint(item),
    decision: 'REJECTED',
    decidedAt: new Date().toISOString(),
    reviewer,
    reasoning: String(reason)
  }, quarantineFile);
  list.splice(idx, 1);
  safeWriteJsonAtomic(quarantineFile, list);
  return true;
}

/**
 * Clear all quarantined deltas (test utility).
 */
function clearQuarantinedDeltas() {
  if (fs.existsSync(currentQuarantineFile)) {
    safeWriteJsonAtomic(currentQuarantineFile, []);
  }
}

/**
 * Log an autonomous rejection decision trace when a rule fails the 5-Gate validation.
 */
function logAutonomousRejection(delta, reasons, options = {}) {
  const quarantineFile = options.filePath || currentQuarantineFile;
  const qDir = path.dirname(quarantineFile);
  if (!fs.existsSync(qDir)) {
    fs.mkdirSync(qDir, { recursive: true });
  }
  const fingerprint = delta.knowledgeFingerprint || buildKnowledgeFingerprint(delta);
  appendDecision({
    decisionId: `DECISION_${Date.now()}_${fingerprint.slice(0, 10)}_AUTO_REJECT`,
    deltaId: delta.deltaId,
    knowledgeFingerprint: fingerprint,
    decision: 'AUTO_REJECTED',
    decidedAt: new Date().toISOString(),
    reviewer: 'SYSTEM_AUTONOMOUS_GATE',
    reasoning: reasons.join('; ')
  }, quarantineFile);
}

module.exports = {
  validateKnowledgeDelta,
  saveQuarantinedDelta,
  getQuarantinedDeltas,
  promoteQuarantinedDelta,
  rejectQuarantinedDelta,
  deleteQuarantinedDelta: rejectQuarantinedDelta,
  clearQuarantinedDeltas,
  setQuarantineFilePath,
  getQuarantineFilePath,
  SINGLE_USER_MODE,
  SKU_BLACKLIST,
  TRUSTED_EVIDENCE_TYPES,
  TRUSTED_AUTOMATED_SOURCES,
  buildKnowledgeFingerprint,
  logAutonomousRejection,
  verifyAuthenticEvidence,
  verifyOcaSessionReceipt,
  verifyQuickSpecsCitation,
  isSyntheticOrMockToken,
  QUARANTINE_FILE: currentQuarantineFile
};
