'use strict';
/**
 * scripts/lib/notebook/knowledge_extractor.js — Generic RAG Response Knowledge Extractor
 *
 * Automatically parses grounded natural language answers from Gemini NotebookLM / Local RAG,
 * extracts structured hardware dependencies, option substitutions, and cross-generation carry-overs,
 * and submits them to evidence, confidence, ambiguity, and scope governance.
 * Non-promotable candidates remain in the product-specific quarantine ledger.
 *
 * This closes the autonomous learning loop:
 * 1. Pre-flight detects potential ambiguity or checks catalog rules.
 * 2. NotebookLM verifies against official QuickSpecs.
 * 3. Knowledge Extractor structures the verified facts into generic rules.
 * 4. Local rule engine and preprocessor cache and reuse these learned rules for future evaluations.
 */

const fs = require('fs');
const path = require('path');
const { cleanBaseSKU, isValidHpeSKU } = require('../catalog/sku.js');
const { safeWriteJsonAtomic } = require('../system/fs_compat.js');
const { classifyKnowledgeScope } = require('../sync/knowledge_sync.js');
const { validateKnowledgeDelta, saveQuarantinedDelta, SKU_BLACKLIST, buildKnowledgeFingerprint } = require('../feedback/quarantined_deltas.js');
const logger = require('../system/pipeline_logger.js');

/**
 * Extract structured knowledge deltas from a natural language RAG answer.
 * @param {string} ragAnswer - The grounded markdown text from NotebookLM
 * @param {string} chassisDir - Target chassis output directory (e.g. outputs/ProLiant/Gen12/DL380_Gen12_SFF)
 * @param {object} context - Additional metadata { chassis, family, gen, model }
 * @returns {Array<object>} Array of structured KnowledgeDelta objects
 */
function extractKnowledgeFromRagAnswer(ragAnswer, chassisDir, context = {}) {
  if (!ragAnswer || typeof ragAnswer !== 'string') return [];

  const text = ragAnswer.trim();
  const deltas = [];
  const seenKeys = new Set();
  const chassisName = context.chassis || (chassisDir ? path.basename(chassisDir) : 'Generic_Chassis');
  const baseConfidence = typeof context.confidenceScore === 'number' ? context.confidenceScore : 0.70;

  // Helper to record unique delta
  function addDelta(deltaObj) {
    if (typeof deltaObj.confidenceScore !== 'number') {
      deltaObj.confidenceScore = baseConfidence;
    }
    const key = `${deltaObj.chassis}:${deltaObj.affectedSku}:${deltaObj.requiredDependencySku || ''}:${deltaObj.ruleType}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      deltas.push(deltaObj);
    }
  }

  // Split response into discrete semantic units (paragraphs, list items, or lines)
  const units = text.split(/(?:\r?\n){2,}|\r?\n(?=(?:[0-9]+\.|\*|-|###)\s+)|\r?\n/).map(u => u.trim()).filter(u => u.length > 5);

  for (const unit of units) {
    const rawTokens = unit.match(/[A-Z0-9]{2,8}-[A-Z0-9]{3,4}|[A-Z0-9]{6}|[HURS][A-Z0-9]{4,11}/gi) || [];
    const validSkus = [...new Set(
      rawTokens
        .map(cleanBaseSKU)
        .filter(s => isValidHpeSKU(s) && !SKU_BLACKLIST.has(s.toUpperCase()))
    )];
    const pLower = unit.toLowerCase();

    if (_extractFioSubstitution(unit, pLower, validSkus, chassisName, context, addDelta)) continue;
    if (_extractCarryOverValidation(unit, pLower, validSkus, chassisName, addDelta)) continue;
    if (_extractSkuSubstitution(unit, pLower, validSkus, chassisName, addDelta)) continue;
    if (_extractDependencyChain(unit, pLower, validSkus, chassisName, addDelta)) continue;
    _extractDiscrepancyFlag(unit, pLower, validSkus, chassisName, addDelta);
  }

  return deltas;
}

function _inferCapabilityTag(pLower) {
  if (pLower.includes('fan') || pLower.includes('cooling')) return 'HIGH_PERFORMANCE_COOLING';
  if (pLower.includes('expander') || pLower.includes('switch')) return 'STORAGE_EXPANDER_OR_SWITCH';
  if (pLower.includes('auxiliary') || pLower.includes('gpu power')) return 'GPU_AUXILIARY_POWER_AND_TITANIUM_PSU';
  if (pLower.includes('drive blank') || pLower.includes('no drive')) return 'NO_DRIVE_BLANK_OR_FIO_BYPASS';
  return null;
}

function _extractFioSubstitution(unit, pLower, validSkus, chassisName, context, addDelta) {
  const hasBtoContext = pLower.includes('bto') || pLower.includes('retail') || pLower.includes('not allowed') || pLower.includes('blocked') || pLower.includes('prohibited');
  const hasFioContext = pLower.includes('fio') || pLower.includes('cto') || pLower.includes('factory') || pLower.includes('equivalent');

  if (!hasBtoContext || !hasFioContext || validSkus.length < 2) return false;
  const btoSku = validSkus.find(s => s.endsWith('-B21'));
  if (!btoSku) return false;
  const fioSku = validSkus.find(s => s !== btoSku && (s.endsWith('-F21') || s.endsWith('-0D1') || s.startsWith(btoSku.slice(0, 6))));
  if (!fioSku) return false;

  addDelta({
    deltaId: `DELTA_RAG_FIO_${btoSku}_${fioSku}_${Date.now()}`,
    chassis: chassisName,
    errorType: 'PERMANENT_PHYSICAL_DEPENDENCY',
    ruleType: 'OPTION_TYPE_SUBSTITUTION',
    affectedSku: btoSku,
    requiredDependencySku: fioSku,
    reasoning: `Grounding Verification: Standalone BTO option ${btoSku} is restricted in CTO base builds. Required Factory Integrated Option (FIO) replacement is ${fioSku}.`,
    rawMessage: unit.slice(0, 300).trim(),
    scopeTaxonomy: context.scopeTaxonomy || 'CHASSIS_SPECIFIC',
    source: 'NOTEBOOKLM_GROUNDING',
    timestamp: new Date().toISOString()
  });
  return true;
}

function _extractCarryOverValidation(unit, pLower, validSkus, chassisName, addDelta) {
  const isCarryOverMatch = pLower.includes('officially validated') || pLower.includes('fully supported') || pLower.includes('listed under') || pLower.includes('carry-over') || pLower.includes('carry over') || (pLower.includes('supported') && pLower.includes('validated'));
  if (!isCarryOverMatch || validSkus.length < 1) return false;

  const primarySku = validSkus[0];
  addDelta({
    deltaId: `DELTA_RAG_CARRYOVER_${primarySku}_${Date.now()}`,
    chassis: chassisName,
    errorType: 'PERMANENT_PHYSICAL_DEPENDENCY',
    ruleType: 'CARRY_OVER_VALIDATED',
    affectedSku: primarySku,
    requiredDependencySku: null,
    reasoning: `Grounding Verification: Part ${primarySku} is officially validated as a supported carry-over component in ${chassisName} QuickSpecs.`,
    rawMessage: unit.slice(0, 300).trim(),
    scopeTaxonomy: 'CHASSIS_SPECIFIC',
    source: 'NOTEBOOKLM_GROUNDING',
    timestamp: new Date().toISOString()
  });
  return true;
}

const SUBSTITUTION_RE = /\b(instead\s+of|replaced\s+by|superseded\s+by|invalid\s+sku[\s\S]*?\bvalid\b[\s\S]*?\bsku\s+is)\b/i;
const NEGATIVE_DEPENDENCY_RE = /\b(instead\s+of|replaced\s+by|superseded\s+by|capped\s+at|capped|cannot\s+be\s+used|not\s+supported|incompatible|while\s+acceptable|optional|prohibited|barred|forbidden|not\s+allowed|disallowed|invalid\s+sku)\b/i;
const REQUIREMENT_VERB_RE = /\b(requires?|mandates?|must\s+configure|must\s+be\s+selected)\b/i;

function _hasValidDependencySpan(unit, parentSku, childSku) {
  const upper = unit.toUpperCase();
  const parentIdx = upper.indexOf(parentSku.toUpperCase());
  if (parentIdx < 0) return false;
  const childIdx = upper.indexOf(childSku.toUpperCase(), parentIdx + parentSku.length);
  if (childIdx < 0) return false;
  const between = unit.slice(parentIdx + parentSku.length, childIdx);
  if (/\bor\b/i.test(between) && !REQUIREMENT_VERB_RE.test(between)) return false;
  return REQUIREMENT_VERB_RE.test(between);
}

function _extractSkuSubstitution(unit, pLower, validSkus, chassisName, addDelta) {
  if (!SUBSTITUTION_RE.test(pLower) || validSkus.length < 2) return false;

  const isForwardOrder = pLower.includes('replaced by') || pLower.includes('superseded by') || pLower.includes('invalid sku');
  const obsoleteSku = isForwardOrder ? validSkus[0] : validSkus[1];
  const targetSku = isForwardOrder ? validSkus[1] : validSkus[0];

  addDelta({
    deltaId: `DELTA_RAG_SUBST_${obsoleteSku}_${targetSku}_${Date.now()}`,
    chassis: chassisName,
    errorType: 'SKU_SUBSTITUTION',
    ruleType: 'SKU_SUBSTITUTION',
    affectedSku: obsoleteSku,
    requiredDependencySku: targetSku,
    reasoning: `Grounding Verification: Component ${obsoleteSku} is superseded by ${targetSku} in ${chassisName}.`,
    rawMessage: unit.slice(0, 300).trim(),
    scopeTaxonomy: classifyKnowledgeScope(unit),
    source: 'NOTEBOOKLM_GROUNDING',
    timestamp: new Date().toISOString()
  });
  return true;
}

function _extractDependencyChain(unit, pLower, validSkus, chassisName, addDelta) {
  if (NEGATIVE_DEPENDENCY_RE.test(pLower) || !REQUIREMENT_VERB_RE.test(pLower) || validSkus.length < 2) {
    return false;
  }

  const parentSku = validSkus[0];
  const childSku = validSkus[1];
  if (parentSku === childSku || !_hasValidDependencySpan(unit, parentSku, childSku)) return false;

  const capabilityTag = _inferCapabilityTag(pLower);
  addDelta({
    deltaId: `DELTA_RAG_DEP_${parentSku}_${childSku}_${Date.now()}`,
    chassis: chassisName,
    errorType: 'PERMANENT_PHYSICAL_DEPENDENCY',
    ruleType: 'DEPENDENCY_CHAIN',
    affectedSku: parentSku,
    requiredDependencySku: childSku,
    requiredCapability: capabilityTag,
    reasoning: `Grounding Verification: Selecting ${parentSku} requires auxiliary component ${childSku} to satisfy physical/telemetry routing.`,
    rawMessage: unit.slice(0, 300).trim(),
    scopeTaxonomy: classifyKnowledgeScope(unit),
    source: 'NOTEBOOKLM_GROUNDING',
    timestamp: new Date().toISOString()
  });
  return true;
}

function _extractDiscrepancyFlag(unit, pLower, validSkus, chassisName, addDelta) {
  const isBaselineOmission = /(?:unverified|untrusted)\s+(?:baseline|input|proposal|quote|request|customer)|(?:correctly|properly)\s+omitted|omitted\s+(?:the\s+)?unverified/i.test(unit);
  const hasUnverifiedConstraint = (/(?:remains?|is|are)\s+unverified\b/i.test(unit) || /\bunverified\s+(?:constraint|specification|compatibility|support|rule|option|part)\b/i.test(unit)) && !isBaselineOmission;
  const hasExplicitDiscrepancy = (pLower.includes('discrepancy') || pLower.includes('contradiction') || pLower.includes('conflict') || pLower.includes('differs from') || pLower.includes('human review')) && !isBaselineOmission;

  if ((!hasExplicitDiscrepancy && !hasUnverifiedConstraint) || validSkus.length < 1) return false;

  const flaggedSku = validSkus[0];
  addDelta({
    deltaId: `DELTA_RAG_DISCREPANCY_${flaggedSku}_${Date.now()}`,
    chassis: chassisName,
    errorType: 'OPINION_DISCREPANCY_FLAG',
    ruleType: 'HUMAN_REVIEW_REQUIRED',
    affectedSku: flaggedSku,
    requiredDependencySku: null,
    reasoning: `Presales Discrepancy Alert: Grounding identified a potential divergence or unverified constraint regarding SKU ${flaggedSku}. Human presales review recommended.`,
    rawMessage: unit.slice(0, 300).trim(),
    scopeTaxonomy: 'CHASSIS_SPECIFIC',
    source: 'NOTEBOOKLM_GROUNDING',
    timestamp: new Date().toISOString()
  });
  return true;
}

/**
 * Extract governed knowledge candidates from a grounded RAG answer.
 * @param {string} ragAnswer 
 * @param {string} chassisDir 
 * @param {object} context 
 * @returns {object} { count, deltas }
 */
function extractAndPersistLearnedDeltas(ragAnswer, chassisDir, context = {}) {
  // Disallow delta extraction from local fallbacks or forbidden source citations (INV-24)
  const citations = Array.isArray(context.citations) ? context.citations : [];
  if (
    context.source !== 'NOTEBOOK_LM_CLOUD' ||
    context.groundingVerification !== 'VERIFIED_GROUNDED' ||
    citations.length === 0
  ) {
    logger.info('KNOWLEDGE_EXTRACTOR', 'Skipping delta extraction from fallback or forbidden source response.');
    return { count: 0, quarantinedCount: 0, deltas: [] };
  }

  const deltas = extractKnowledgeFromRagAnswer(ragAnswer, chassisDir, context);
  deltas.forEach(delta => { delta.citations = citations; });
  if (!deltas || deltas.length === 0) {
    return { count: 0, quarantinedCount: 0, deltas: [] };
  }

  if (!chassisDir || !fs.existsSync(chassisDir)) {
    logger.warn('KNOWLEDGE_EXTRACTOR', 'Target chassis directory not provided or missing; skipping delta persistence.');
    return { count: deltas.length, quarantinedCount: 0, deltas };
  }

  // Load catalog data if available for Gate 1b SKU existence checks
  let catalogData = context.catalogData || null;
  if (!catalogData) {
    const catalogEntry = fs.readdirSync(chassisDir, { withFileTypes: true })
      .find(entry => entry.isFile() && entry.name.endsWith('_Catalog.json'));
    if (catalogEntry) catalogData = JSON.parse(fs.readFileSync(path.join(chassisDir, catalogEntry.name), 'utf-8'));
  }

  const historyDir = path.join(chassisDir, 'history');
  if (!fs.existsSync(historyDir)) {
    fs.mkdirSync(historyDir, { recursive: true });
  }

  const deltaFile = path.join(historyDir, 'catalog_deltas.json');
  let existingDeltas = [];
  if (fs.existsSync(deltaFile)) {
    existingDeltas = JSON.parse(fs.readFileSync(deltaFile, 'utf-8'));
    if (!Array.isArray(existingDeltas)) {
      throw new Error('catalog_deltas.json must contain a JSON array; refusing to overwrite active knowledge');
    }
  }

  let addedCount = 0;
  let quarantinedCount = 0;

  deltas.forEach(newDelta => {
    const validation = validateKnowledgeDelta(newDelta, {
      humanReview: context.humanReview,
      catalogData
    });
    if (!validation.valid || validation.status === 'REJECTED') {
      logger.warn('KNOWLEDGE_EXTRACTOR', `Rejected invalid delta ${newDelta.affectedSku}: ${validation.reasons.join('; ')}`);
      return;
    }

    if (validation.status === 'QUARANTINED') {
      saveQuarantinedDelta(validation.sanitizedDelta, validation.reasons, {
        filePath: path.join(historyDir, 'quarantined_deltas.json')
      });
      quarantinedCount++;
      return;
    }

    const deltaToSave = validation.sanitizedDelta;
    const fingerprintToSave = deltaToSave.knowledgeFingerprint || buildKnowledgeFingerprint(deltaToSave);
    const existingIdx = existingDeltas.findIndex(d => 
      (d.knowledgeFingerprint || buildKnowledgeFingerprint(d)) === fingerprintToSave
    );
    
    if (existingIdx >= 0) {
      existingDeltas[existingIdx].timestamp = deltaToSave.timestamp || new Date().toISOString();
      const newScore = deltaToSave.confidenceScore || 0.70;
      existingDeltas[existingIdx].confidenceScore = Math.min(0.99, Math.max(existingDeltas[existingIdx].confidenceScore || 0.70, newScore));
    } else {
      existingDeltas.push(deltaToSave);
      addedCount++;
    }
  });

  if (addedCount > 0) {
    safeWriteJsonAtomic(deltaFile, existingDeltas);
    logger.info('KNOWLEDGE_EXTRACTOR', `Learned and persisted ${addedCount} new knowledge deltas from NotebookLM grounding to ${path.basename(deltaFile)} (quarantined: ${quarantinedCount})`);
  }

  return { count: addedCount, quarantinedCount, deltas: existingDeltas };
}

module.exports = {
  extractKnowledgeFromRagAnswer,
  extractAndPersistLearnedDeltas
};
