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

  // 1. Extract BTO -> FIO Option Type Substitutions
  // Matches e.g. "P69728-B21 ... not allowed in CTO ... use FIO SKU P69728-F21"
  const btoFioRegex = new RegExp(`${SKU_PATTERN}.{0,150}?(?:BTO|retail).{0,100}?(?:not allowed|cannot be added|blocked|error|prohibited).{0,120}?(?:CTO|factory).{0,100}?(?:FIO|equivalent|substitute|use).{0,50}?${SKU_PATTERN}`, 'gi');
  let match;
  while ((match = btoFioRegex.exec(text)) !== null) {
    const btoSku = cleanBaseSKU(match[1]);
    const fioSku = cleanBaseSKU(match[2]);
    if (btoSku && fioSku && btoSku !== fioSku && isValidHpeSKU(btoSku) && isValidHpeSKU(fioSku)) {
      addDelta({
        deltaId: `DELTA_RAG_FIO_${btoSku}_${fioSku}_${Date.now()}`,
        chassis: chassisName,
        errorType: 'PERMANENT_PHYSICAL_DEPENDENCY',
        ruleType: 'OPTION_TYPE_SUBSTITUTION',
        affectedSku: btoSku,
        requiredDependencySku: fioSku,
        reasoning: `Grounding Verification: Standalone BTO option ${btoSku} is restricted in CTO base builds. Required Factory Integrated Option (FIO) replacement is ${fioSku}.`,
        rawMessage: match[0].slice(0, 300),
        scopeTaxonomy: 'FAMILY_GEN',
        source: 'NOTEBOOKLM_GROUNDING',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 2. Extract Cross-Generation / Carry-Over Validations
  // Matches e.g. "P48918-B21 ... fully supported and validated ... inside DL380 Gen12"
  const carryOverRegex = new RegExp(`${SKU_PATTERN}.{0,120}?(?:fully supported|officially validated|listed under.*QuickSpecs|formally listed|carry[- ]?over).{0,150}?(${SKU_PATTERN})?`, 'gi');
  while ((match = carryOverRegex.exec(text)) !== null) {
    const primarySku = cleanBaseSKU(match[1]);
    const pairedSku = match[2] ? cleanBaseSKU(match[2]) : null;
    if (primarySku && isValidHpeSKU(primarySku)) {
      addDelta({
        deltaId: `DELTA_RAG_CARRYOVER_${primarySku}_${Date.now()}`,
        chassis: chassisName,
        errorType: 'PERMANENT_PHYSICAL_DEPENDENCY',
        ruleType: 'CARRY_OVER_VALIDATED',
        affectedSku: primarySku,
        requiredDependencySku: pairedSku && isValidHpeSKU(pairedSku) ? pairedSku : null,
        reasoning: `Grounding Verification: Part ${primarySku} is officially validated as a supported carry-over component in ${chassisName} QuickSpecs.`,
        rawMessage: match[0].slice(0, 300),
        scopeTaxonomy: 'CHASSIS_SPECIFIC',
        source: 'NOTEBOOKLM_GROUNDING',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 3. Extract Hardware Dependency Chains (Cables, Triggers, Accessories)
  // Matches e.g. "P47777-B21 ... requires P76453-B21" or "P48803-B21 ... requires P76471-B21"
  const depRegex = new RegExp(`${SKU_PATTERN}.{0,80}?(?:requires|mandates|strictly requires|must configure|needs|must be selected).{0,80}?${SKU_PATTERN}`, 'gi');
  while ((match = depRegex.exec(text)) !== null) {
    const parentSku = cleanBaseSKU(match[1]);
    const childSku = cleanBaseSKU(match[2]);
    if (parentSku && childSku && parentSku !== childSku && isValidHpeSKU(parentSku) && isValidHpeSKU(childSku)) {
      addDelta({
        deltaId: `DELTA_RAG_DEP_${parentSku}_${childSku}_${Date.now()}`,
        chassis: chassisName,
        errorType: 'PERMANENT_PHYSICAL_DEPENDENCY',
        ruleType: 'DEPENDENCY_CHAIN',
        affectedSku: parentSku,
        requiredDependencySku: childSku,
        reasoning: `Grounding Verification: Selecting ${parentSku} requires auxiliary component ${childSku} to satisfy physical/telemetry routing.`,
        rawMessage: match[0].slice(0, 300),
        scopeTaxonomy: classifyKnowledgeScope(match[0]),
        source: 'NOTEBOOKLM_GROUNDING',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 4. Extract Discrepancy & Differing Opinion Flags (Presales Human Review Trigger)
  // Matches explicit flags where Local Rule Engine and NotebookLM find divergent constraints
  const discrepancyRegex = new RegExp(`(?:discrepancy|contradiction|conflict|unverified|differs from|human review).{0,100}?${SKU_PATTERN}`, 'gi');
  while ((match = discrepancyRegex.exec(text)) !== null) {
    const flaggedSku = cleanBaseSKU(match[1]);
    if (flaggedSku && isValidHpeSKU(flaggedSku)) {
      addDelta({
        deltaId: `DELTA_RAG_DISCREPANCY_${flaggedSku}_${Date.now()}`,
        chassis: chassisName,
        errorType: 'OPINION_DISCREPANCY_FLAG',
        ruleType: 'HUMAN_REVIEW_REQUIRED',
        affectedSku: flaggedSku,
        requiredDependencySku: null,
        reasoning: `Presales Discrepancy Alert: Grounding identified a potential divergence or unverified constraint regarding SKU ${flaggedSku}. Human presales review recommended.`,
        rawMessage: match[0].slice(0, 300),
        scopeTaxonomy: 'CHASSIS_SPECIFIC',
        source: 'NOTEBOOKLM_GROUNDING',
        timestamp: new Date().toISOString()
      });
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
