'use strict';
/**
 * scripts/lib/notebook/knowledge_extractor.js — Generic RAG Response Knowledge Extractor
 *
 * Automatically parses grounded natural language answers from Gemini NotebookLM / Local RAG,
 * extracts structured hardware dependencies, option substitutions, and cross-generation carry-overs,
 * and persists them as KnowledgeDeltas into catalog_deltas.json and master_knowledge_registry.json.
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
const logger = require('../system/pipeline_logger.js');

const SKU_PATTERN = '([A-Z0-9]{3,8}-[A-Z0-9]{3,4}|[A-Z0-9]{6}|[HURS][A-Z0-9]{4,11})';

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

  // Helper to record unique delta
  function addDelta(deltaObj) {
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
    const validSkus = [...new Set(rawTokens.map(cleanBaseSKU).filter(s => isValidHpeSKU(s)))];
    const pLower = unit.toLowerCase();

    // 1. Extract BTO -> FIO Option Type Substitutions
    const hasBtoContext = pLower.includes('bto') || pLower.includes('retail') || pLower.includes('not allowed') || pLower.includes('blocked') || pLower.includes('prohibited');
    const hasFioContext = pLower.includes('fio') || pLower.includes('cto') || pLower.includes('factory') || pLower.includes('equivalent');

    if (hasBtoContext && hasFioContext && validSkus.length >= 2) {
      const btoSku = validSkus.find(s => s.endsWith('-B21'));
      if (btoSku) {
        const fioSku = validSkus.find(s => s !== btoSku && (s.endsWith('-F21') || s.endsWith('-0D1') || s.startsWith(btoSku.slice(0, 6))));
        if (fioSku) {
          addDelta({
            deltaId: `DELTA_RAG_FIO_${btoSku}_${fioSku}_${Date.now()}`,
            chassis: chassisName,
            errorType: 'PERMANENT_PHYSICAL_DEPENDENCY',
            ruleType: 'OPTION_TYPE_SUBSTITUTION',
            affectedSku: btoSku,
            requiredDependencySku: fioSku,
            reasoning: `Grounding Verification: Standalone BTO option ${btoSku} is restricted in CTO base builds. Required Factory Integrated Option (FIO) replacement is ${fioSku}.`,
            rawMessage: unit.slice(0, 300).trim(),
            scopeTaxonomy: 'FAMILY_GEN',
            source: 'NOTEBOOKLM_GROUNDING',
            timestamp: new Date().toISOString()
          });
          continue;
        }
      }
    }

    // 2. Extract Cross-Generation / Carry-Over Validations
    if (pLower.includes('officially validated') || pLower.includes('fully supported') || pLower.includes('listed under') || pLower.includes('carry-over') || pLower.includes('carry over') || (pLower.includes('supported') && pLower.includes('validated'))) {
      if (validSkus.length >= 1) {
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
        continue;
      }
    }

    // 3. Hardware Dependency Chains (Cables, Triggers, Accessories)
    if (pLower.includes('require') || pLower.includes('mandate') || pLower.includes('need') || pLower.includes('must configure') || pLower.includes('must be selected')) {
      if (validSkus.length >= 2) {
        const parentSku = validSkus[0];
        const childSku = validSkus[1];
        if (parentSku !== childSku) {
          addDelta({
            deltaId: `DELTA_RAG_DEP_${parentSku}_${childSku}_${Date.now()}`,
            chassis: chassisName,
            errorType: 'PERMANENT_PHYSICAL_DEPENDENCY',
            ruleType: 'DEPENDENCY_CHAIN',
            affectedSku: parentSku,
            requiredDependencySku: childSku,
            reasoning: `Grounding Verification: Selecting ${parentSku} requires auxiliary component ${childSku} to satisfy physical/telemetry routing.`,
            rawMessage: unit.slice(0, 300).trim(),
            scopeTaxonomy: classifyKnowledgeScope(unit),
            source: 'NOTEBOOKLM_GROUNDING',
            timestamp: new Date().toISOString()
          });
          continue;
        }
      }
    }

    // 4. Extract Discrepancy & Differing Opinion Flags (Presales Human Review Trigger)
    if (pLower.includes('discrepancy') || pLower.includes('contradiction') || pLower.includes('conflict') || pLower.includes('unverified') || pLower.includes('differs from') || pLower.includes('human review')) {
      if (validSkus.length >= 1) {
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
      }
    }
  }

  return deltas;
}

/**
 * Extract knowledge from RAG answer and persist into local catalog_deltas.json
 * @param {string} ragAnswer 
 * @param {string} chassisDir 
 * @param {object} context 
 * @returns {object} { count, deltas }
 */
function extractAndPersistLearnedDeltas(ragAnswer, chassisDir, context = {}) {
  const deltas = extractKnowledgeFromRagAnswer(ragAnswer, chassisDir, context);
  if (!deltas || deltas.length === 0) {
    return { count: 0, deltas: [] };
  }

  if (!chassisDir || !fs.existsSync(chassisDir)) {
    logger.warn('KNOWLEDGE_EXTRACTOR', 'Target chassis directory not provided or missing; skipping delta persistence.');
    return { count: deltas.length, deltas };
  }

  const historyDir = path.join(chassisDir, 'history');
  if (!fs.existsSync(historyDir)) {
    fs.mkdirSync(historyDir, { recursive: true });
  }

  const deltaFile = path.join(historyDir, 'catalog_deltas.json');
  let existingDeltas = [];
  if (fs.existsSync(deltaFile)) {
    try {
      existingDeltas = JSON.parse(fs.readFileSync(deltaFile, 'utf-8'));
      if (!Array.isArray(existingDeltas)) existingDeltas = [];
    } catch (_) {
      existingDeltas = [];
    }
  }

  let addedCount = 0;
  deltas.forEach(newDelta => {
    // Avoid duplicate rules
    const exists = existingDeltas.some(d =>
      d.affectedSku === newDelta.affectedSku &&
      d.requiredDependencySku === newDelta.requiredDependencySku &&
      d.ruleType === newDelta.ruleType
    );
    if (!exists) {
      existingDeltas.push(newDelta);
      addedCount++;
    }
  });

  if (addedCount > 0) {
    safeWriteJsonAtomic(deltaFile, existingDeltas);
    logger.info('KNOWLEDGE_EXTRACTOR', `Learned and persisted ${addedCount} new knowledge deltas from NotebookLM grounding to ${path.basename(deltaFile)}`);
  }

  return { count: addedCount, deltas: existingDeltas };
}

module.exports = {
  extractKnowledgeFromRagAnswer,
  extractAndPersistLearnedDeltas
};
