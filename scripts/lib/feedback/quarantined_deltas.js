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
  'OCA_CERTIFIED_CATALOG'
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
    return TRUSTED_EVIDENCE_TYPES.has(String(item.type || '').toUpperCase()) && String(item.id || item.url || '').trim();
  });
  if (review.verified !== true || decision !== 'APPROVE' || reviewer.length < 2 || reasoning.length < 20 || trustedEvidence.length === 0) {
    return null;
  }
  return { ...review, reviewer, reasoning, decision, evidence: trustedEvidence };
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
    reasons.push('Automated learning has no traceable source citation; held for evidence review');
  }
  if (!isHuman && !TRUSTED_AUTOMATED_SOURCES.has(normalizeText(delta.source))) {
    reasons.push(`Automated source '${delta.source || 'UNKNOWN'}' is not eligible for direct promotion`);
  }

  // Gate 3: Confidence Score
  const rawScore = delta.preConfidenceScore ?? delta.confidenceScore ?? 0.70;
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
  if (!isHuman && citations.length === 0) status = 'QUARANTINED';
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
    status: 'IN_QUARANTINE'
  };

  // Deduplicate in quarantine by affected + required + rawMessage
  const existingIdx = list.findIndex(item => (item.knowledgeFingerprint || buildKnowledgeFingerprint(item)) === fingerprint);

  if (existingIdx >= 0) {
    const existing = list[existingIdx];
    list[existingIdx] = {
      ...existing,
      ...record,
      quarantineId: existing.quarantineId || record.quarantineId,
      firstSeenAt: existing.firstSeenAt || existing.quarantinedAt || now,
      lastSeenAt: now,
      observationCount: (Number(existing.observationCount) || 1) + 1,
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
  const humanReview = normalizeHumanReview({ humanReview: options.humanReview });
  if (!humanReview || humanReview.reviewer !== approver) {
    logger.warn('QUARANTINE', 'Promotion denied: complete evidence-backed human review is required and reviewer must match approver.');
    return null;
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
  if (idx < 0) return false;
  const reviewer = String(options.reviewer || '').trim();
  if (reviewer.length < 2 || String(reason).trim().length < 20) {
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
  clearQuarantinedDeltas,
  setQuarantineFilePath,
  getQuarantineFilePath,
  SKU_BLACKLIST,
  TRUSTED_EVIDENCE_TYPES,
  TRUSTED_AUTOMATED_SOURCES,
  buildKnowledgeFingerprint,
  logAutonomousRejection,
  QUARANTINE_FILE: currentQuarantineFile
};
