'use strict';
/**
 * scripts/lib/feedback/continuous_learning_verifier.js — Closed-Loop Continuous Learning & Reachability Engine
 *
 * Implements the automated verification loop:
 * 1. Takes newly recorded or updated knowledge deltas / rules.
 * 2. Verifies that the rules are dynamically reachable by the ActiveKnowledgeRouter.
 * 3. Simulates conflict evaluation on target BOMs to certify that the rule is actively
 *    enforced in the strategy matrix, eliminating dormant or "write-only" knowledge.
 */

const fs = require('fs');
const path = require('path');
const { loadActiveKnowledgeRules } = require('../catalog/active_knowledge_router.js');
const { validateConflictGraph } = require('../conflict/conflict_graph.js');
const { safeWriteJsonAtomic, withFileLock } = require('../system/fs_compat.js');
const logger = require('../system/pipeline_logger.js');

/**
 * Verify that a specific knowledge rule is actively reachable for a given chassis
 * @param {object} rule - Rule or delta object
 * @param {string} chassisVariant - Target chassis variant (e.g. 'DL380_Gen11')
 * @param {Array<object>} [sampleBom] - Optional BOM items to test against
 * @returns {object} Verification result
 */
function verifyKnowledgeRuleReachability(rule, chassisVariant, sampleBom = [], chassisDir = '') {
  if (!rule || !chassisVariant) {
    throw new Error('verifyKnowledgeRuleReachability requires both rule and chassisVariant');
  }

  const activeRules = loadActiveKnowledgeRules(chassisVariant, chassisDir);
  const targetRuleId = rule.ruleId || rule.deltaId;
  const affectedSku = (rule.affectedSku || rule.sku || '').toUpperCase();

  // Step 1: Reachability in categorized registry
  const matchedInRegistry = activeRules.allRules.find(r => 
    targetRuleId
      ? (r.ruleId === targetRuleId || r.deltaId === targetRuleId)
      : (affectedSku && r.affectedSku === affectedSku && r.ruleType === (rule.ruleType || rule.errorType) &&
        (r.requiredDependencySku || r.targetSku || null) === (rule.requiredDependencySku || rule.targetSku || null))
  );

  if (!matchedInRegistry) {
    return {
      reachable: false,
      reason: `Rule ${targetRuleId || affectedSku} not reachable in ActiveKnowledgeRouter for ${chassisVariant}. May be blocked by Generation Firewall or missing on disk.`,
      activeRulesCount: activeRules.allRules.length
    };
  }

  // Step 2: Evaluation simulation if sample BOM provided
  let simulationResult = null;
  if (Array.isArray(sampleBom) && sampleBom.length > 0) {
    try {
      const graph = validateConflictGraph(sampleBom, [], chassisDir, chassisVariant, { skipSynthesis: true });
      const auditLog = graph.auditLog || [];
      const deltaAudits = auditLog.filter(a => a.category === 'LEARNED_DELTA');

      simulationResult = {
        evaluated: true,
        conflictsCount: graph.conflicts?.length || 0,
        ranksProduced: graph.rankedSolutions?.length || 0,
        deltaAuditRecorded: deltaAudits.length > 0,
        // Legacy audit entries lack stable rule identity. An unrelated learned
        // rule firing cannot certify consumption of the rule being inspected.
        targetRuleApplied: targetRuleId
          ? deltaAudits.some(a => a.ruleId === targetRuleId || a.deltaId === targetRuleId)
          : null
      };
    } catch (simErr) {
      simulationResult = {
        evaluated: false,
        error: simErr.message
      };
    }
  }

  return {
    reachable: true,
    ruleId: matchedInRegistry.ruleId,
    ruleType: matchedInRegistry.ruleType,
    affectedSku: matchedInRegistry.affectedSku,
    targetSku: matchedInRegistry.requiredDependencySku,
    scopeTaxonomy: matchedInRegistry.scopeTaxonomy,
    simulationResult,
    verifiedAt: new Date().toISOString()
  };
}

/**
 * Record a new rule into chassis catalog_deltas.json and immediately certify reachability
 * @param {object} delta 
 * @param {string} chassisDir 
 * @param {Array<object>} [testBom]
 * @returns {object} Certification result
 */
function recordAndCertifyLearnedRule(delta, chassisDir, testBom = [], options = {}) {
  if (!chassisDir || !fs.existsSync(chassisDir)) {
    throw new Error(`Invalid chassis directory for rule certification: ${chassisDir}`);
  }

  // Governance Status Guard (INV-105 / G05)
  const status = String(delta?.status || delta?.governanceStatus || 'ACTIVE').toUpperCase();
  if (status === 'REJECTED' || (options.strictGovernance && status !== 'ACTIVE' && status !== 'APPROVED')) {
    throw new Error(`LEARNED_RULE_GOVERNANCE_BLOCKED: Rule status "${status}" cannot be certified or added to active history.`);
  }

  const historyDir = path.join(chassisDir, 'history');
  if (!fs.existsSync(historyDir)) {
    fs.mkdirSync(historyDir, { recursive: true });
  }

  const deltaFile = path.join(historyDir, 'catalog_deltas.json');
  const deltaId = delta.deltaId || `DELTA_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const fullDelta = {
    ...delta,
    deltaId,
    timestamp: new Date().toISOString(),
    chassis: path.basename(chassisDir)
  };

  // Execute read-modify-write inside cross-process file lock (G05 / G11)
  withFileLock(deltaFile, () => {
    let existing = [];
    if (fs.existsSync(deltaFile)) {
      try {
        existing = JSON.parse(fs.readFileSync(deltaFile, 'utf-8'));
        if (!Array.isArray(existing)) throw new Error('Learning history must be an array');
      } catch (error) {
        throw new Error(`LEARNING_HISTORY_RECOVERY_REQUIRED: ${deltaFile}`, { cause: error });
      }
    }

    // Expand semantic deduplication to include selectors, conditions, and thresholds (INV-125 / G05)
    const fullDepSku = fullDelta.requiredDependencySku || fullDelta.targetSku || null;
    const fullCondKey = fullDelta.conditionKey || null;
    const fullCondOp = fullDelta.conditionOperator || null;
    const fullThreshold = fullDelta.thresholdValue ?? null;
    const fullSelector = fullDelta.selector || null;

    const existingIdx = existing.findIndex(e =>
      e.deltaId === deltaId ||
      (e.affectedSku === fullDelta.affectedSku &&
       e.ruleType === fullDelta.ruleType &&
       (e.requiredDependencySku || e.targetSku || null) === fullDepSku &&
       (e.conditionKey || null) === fullCondKey &&
       (e.conditionOperator || null) === fullCondOp &&
       (e.thresholdValue ?? null) === fullThreshold &&
       (e.selector || null) === fullSelector)
    );
    if (existingIdx >= 0) {
      existing[existingIdx] = fullDelta;
    } else {
      existing.push(fullDelta);
    }

    safeWriteJsonAtomic(deltaFile, existing);
    logger.info('CONTINUOUS_LEARNING', `Persisted delta ${deltaId} to ${deltaFile}`);
  });

  // Immediate reachability certification
  const chassisVariant = path.basename(chassisDir);
  const cert = verifyKnowledgeRuleReachability(fullDelta, chassisVariant, testBom, chassisDir);

  return {
    deltaId,
    persisted: true,
    certification: cert
  };
}

module.exports = {
  verifyKnowledgeRuleReachability,
  recordAndCertifyLearnedRule
};
