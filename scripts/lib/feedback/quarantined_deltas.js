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

/**
 * Validate a candidate KnowledgeDelta across all 5 governance gates.
 * @param {object} delta
 * @param {object} options { isHumanApproved, catalogData }
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
  const isHuman = options.isHumanApproved === true || delta.sourceAgent === 'HUMAN_HITL';
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

  // Gate 3: Confidence Score
  const rawScore = delta.preConfidenceScore ?? delta.confidenceScore ?? (isHuman ? 1.0 : 0.80);
  const confidence = typeof rawScore === 'number' ? rawScore : parseFloat(rawScore) || 0.0;
  let status = 'PROMOTED';

  if (!catalogSkusExist && !isHuman) {
    status = 'QUARANTINED';
  }

  if (!isHuman && confidence < 0.85) {
    status = 'QUARANTINED';
    reasons.push(`Confidence score ${confidence.toFixed(2)} is below automatic promotion threshold (0.85)`);
  }

  // Gate 4: Scope Taxonomy Validation
  let scope = (delta.scopeTaxonomy || delta.scope || 'CHASSIS_SPECIFIC').toUpperCase();
  if (scope === 'UNIVERSAL') scope = 'UNIVERSAL_VENDOR';
  if (!VALID_SCOPES.has(scope)) {
    reasons.push(`Unknown scope taxonomy '${scope}', normalizing to CHASSIS_SPECIFIC`);
    scope = 'CHASSIS_SPECIFIC';
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
      if (hasConflict && !isHuman) {
        status = 'QUARANTINED';
        reasons.push(`Contradiction detected with established rule: ${affected} vs ${required}`);
      }
    }
  }

  const sanitizedDelta = {
    ...delta,
    affectedSku: affected,
    requiredDependencySku: required || null,
    scopeTaxonomy: scope,
    scope: scope,
    confidenceScore: confidence,
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
function saveQuarantinedDelta(delta, reasons = []) {
  const qDir = path.dirname(currentQuarantineFile);
  if (!fs.existsSync(qDir)) {
    fs.mkdirSync(qDir, { recursive: true });
  }

  let list = [];
  if (fs.existsSync(currentQuarantineFile)) {
    try {
      list = JSON.parse(fs.readFileSync(currentQuarantineFile, 'utf-8'));
      if (!Array.isArray(list)) list = [];
    } catch (_) {
      list = [];
    }
  }

  const record = {
    ...delta,
    quarantineId: `QUARANTINE_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    quarantinedAt: new Date().toISOString(),
    quarantineReasons: reasons,
    status: 'IN_QUARANTINE'
  };

  // Deduplicate in quarantine by affected + required + rawMessage
  const existingIdx = list.findIndex(item =>
    item.affectedSku === record.affectedSku &&
    item.requiredDependencySku === record.requiredDependencySku &&
    item.chassis === record.chassis
  );

  if (existingIdx >= 0) {
    list[existingIdx] = { ...list[existingIdx], ...record, quarantinedAt: new Date().toISOString() };
  } else {
    list.push(record);
  }

  safeWriteJsonAtomic(currentQuarantineFile, list);
  logger.info('QUARANTINE', `Delta ${delta.deltaId || delta.affectedSku} held in quarantine: ${reasons.join('; ')}`);
  return record;
}

/**
 * Get all currently quarantined deltas.
 * @returns {Array<object>}
 */
function getQuarantinedDeltas() {
  if (!fs.existsSync(currentQuarantineFile)) return [];
  try {
    const list = JSON.parse(fs.readFileSync(currentQuarantineFile, 'utf-8'));
    return Array.isArray(list) ? list : [];
  } catch (_) {
    return [];
  }
}

/**
 * Promote a quarantined delta with explicit human approval and activate it.
 * @param {string} quarantineIdOrDeltaId
 * @param {string} approver
 * @param {object} [options]
 * @returns {object|null} The promoted delta or null
 */
function promoteQuarantinedDelta(quarantineIdOrDeltaId, approver = 'ADMIN_HITL', options = {}) {
  const list = getQuarantinedDeltas();
  const idx = list.findIndex(d => d.quarantineId === quarantineIdOrDeltaId || d.deltaId === quarantineIdOrDeltaId);
  if (idx < 0) return null;

  const item = list[idx];
  item.status = 'PROMOTED';
  item.governanceStatus = 'ACTIVE';
  item.promotedAt = new Date().toISOString();
  item.promotedBy = approver;

  // Activate first. The quarantine record is removed only after the durable
  // destination write succeeds, so an activation failure cannot lose the rule.
  if (!options.skipActivation) {
    try {
      const { resolveChassisDirectory } = require('../catalog/sku_versioning.js');
      const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
      const MASTER_REGISTRY = path.join(PROJECT_ROOT, 'outputs', 'history', 'master_knowledge_registry.json');

      const scope = item.scopeTaxonomy || 'CHASSIS_SPECIFIC';
      if ((scope === 'UNIVERSAL_VENDOR' || scope === 'FAMILY_GEN') && fs.existsSync(MASTER_REGISTRY)) {
        const reg = JSON.parse(fs.readFileSync(MASTER_REGISTRY, 'utf-8'));
        const targetList = scope === 'UNIVERSAL_VENDOR' ? reg.universalRules : reg.familyGenRules;
        if (Array.isArray(targetList)) {
          const exists = targetList.some(delta => delta.deltaId === item.deltaId || (
            delta.affectedSku === item.affectedSku &&
            delta.requiredDependencySku === item.requiredDependencySku &&
            delta.ruleType === item.ruleType
          ));
          if (!exists) targetList.push(item);
          safeWriteJsonAtomic(MASTER_REGISTRY, reg);
        } else {
          throw new Error(`Master registry does not contain ${scope} destination array`);
        }
      } else if (item.chassis) {
        const chassisDir = resolveChassisDirectory(item.chassis);
        if (chassisDir) {
          const deltaFile = path.join(chassisDir, 'history', 'catalog_deltas.json');
          let deltas = [];
          if (fs.existsSync(deltaFile)) {
            deltas = JSON.parse(fs.readFileSync(deltaFile, 'utf-8'));
          }
          const exists = deltas.some(delta => delta.deltaId === item.deltaId || (
            delta.affectedSku === item.affectedSku &&
            delta.requiredDependencySku === item.requiredDependencySku &&
            delta.ruleType === item.ruleType
          ));
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

  list.splice(idx, 1);
  safeWriteJsonAtomic(currentQuarantineFile, list);

  return item;
}

/**
 * Reject and purge a quarantined delta.
 * @param {string} quarantineIdOrDeltaId
 * @param {string} reason
 * @returns {boolean}
 */
function rejectQuarantinedDelta(quarantineIdOrDeltaId, reason = 'REJECTED_BY_REVIEWER') {
  const list = getQuarantinedDeltas();
  const idx = list.findIndex(d => d.quarantineId === quarantineIdOrDeltaId || d.deltaId === quarantineIdOrDeltaId);
  if (idx < 0) return false;

  list.splice(idx, 1);
  safeWriteJsonAtomic(currentQuarantineFile, list);
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
  QUARANTINE_FILE: currentQuarantineFile
};
