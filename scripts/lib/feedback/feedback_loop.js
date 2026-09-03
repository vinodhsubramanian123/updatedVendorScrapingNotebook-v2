'use strict';
/**
 * scripts/lib/feedback_loop.js — Closed-Loop Portal Feedback & Knowledge Delta Engine
 *
 * Ingests unbuildable error messages and portal rejection warnings from HPE OCA (or vendor portals),
 * classifies error types, generates structured KnowledgeDeltas, logs history to catalog_deltas.json,
 * and automatically updates local pre-checks and NotebookLM rules.
 */

const fs = require('fs');
const path = require('path');

const { safeWriteJsonAtomic } = require('../system/fs_compat.js');
const { getTraceId } = require('../system/trace_context.js');

/**
 * Classify a portal error message into TEMPORARY_SUPPLY or PERMANENT_PHYSICAL_DEPENDENCY.
 * @param {string} errorMessage 
 * @returns {object} Classification details
 */
function classifyPortalError(errorMessage) {
  const msg = String(errorMessage || '').trim();
  const lower = msg.toLowerCase();

  let errorType = 'PERMANENT_PHYSICAL_DEPENDENCY';
  if (lower.includes('out of stock') || lower.includes('lead time') || lower.includes('supply constraint') || lower.includes('restricted availability')) {
    errorType = 'TEMPORARY_SUPPLY_CONSTRAINT';
  }

  // Chain of Responsibility Extractors
  const extractors = [
    // 1. Strict Regex Extractor
    (text) => {
      const matches = text.match(/\b([A-Z0-9]{3,8}-[A-Z0-9]{3,4}|[A-Z0-9]{6})\b/g) || [];
      return { affectedSku: matches[0] || null, requiredSku: matches[1] || null };
    },
    // 2. Semantic NLP Fallback (using Notebook Extractor logic for inline text)
    (text) => {
      let aff = null; let req = null;
      if (text.toLowerCase().includes('requires') || text.toLowerCase().includes('mandatory')) {
         const parts = text.split(/(?:requires|mandatory)/i);
         const affMatch = parts[0].match(/\b([A-Z0-9]{5,8}-[A-Z0-9]{3,4})\b/);
         const reqMatch = parts[1] ? parts[1].match(/\b([A-Z0-9]{5,8}-[A-Z0-9]{3,4})\b/) : null;
         aff = affMatch ? affMatch[1] : null;
         req = reqMatch ? reqMatch[1] : null;
      }
      return { affectedSku: aff, requiredSku: req };
    }
  ];

  let affectedSku = 'UNKNOWN_SKU';
  let requiredSku = null;

  for (const ext of extractors) {
    const res = ext(msg);
    if (res.affectedSku && res.affectedSku !== 'UNKNOWN_SKU') {
      affectedSku = res.affectedSku;
      requiredSku = res.requiredSku || requiredSku;
      break; // Match found, stop chain
    }
  }

  return {
    errorType,
    rawMessage: msg,
    affectedSku,
    requiredSku,
    timestamp: new Date().toISOString()
  };
}

/**
 * Process a portal unbuildable error and persist KnowledgeDelta.
 * @param {string} portalError 
 * @param {string} outputDir E.g. "outputs/ProLiant/Gen12/DL380_Gen12_SFF"
 * @param {object} options Optional parameters { humanReasoning, scopeTaxonomy, ruleUpdate, solutionType }
 * @returns {object} Generated KnowledgeDelta
 */
function processPortalFeedback(portalError, outputDir, options = {}) {
  if (!outputDir || typeof outputDir !== 'string') {
    throw new Error('processPortalFeedback requires an explicit string outputDir parameter (no hardcoded default).');
  }
  const errorText = typeof portalError === 'string' 
    ? portalError 
    : ((portalError && (portalError.reason || portalError.rawMessage || portalError.errorType)) || JSON.stringify(portalError || ''));
  const classification = classifyPortalError(errorText);

  const historyDir = path.join(outputDir, 'history');
  if (!fs.existsSync(historyDir)) {
    fs.mkdirSync(historyDir, { recursive: true });
  }

  const deltaFile = path.join(historyDir, 'catalog_deltas.json');
  let deltas = [];
  if (fs.existsSync(deltaFile)) {
    try {
      deltas = JSON.parse(fs.readFileSync(deltaFile, 'utf-8'));
      if (!Array.isArray(deltas)) deltas = [];
    } catch (parseErr) {
      // Corruption detected — back up the corrupt file before resetting to prevent data loss
      const corruptBackup = `${deltaFile}.corrupt_${Date.now()}.bak`;
      try { fs.copyFileSync(deltaFile, corruptBackup); } catch (_) { /* backup best-effort */ }
      const logger = require('../system/pipeline_logger.js');
      logger.warn('FEEDBACK_LOOP', `catalog_deltas.json was corrupt (${parseErr.message}). Backed up to ${path.basename(corruptBackup)} and reset to []. Check backup for recovery.`);
      deltas = [];
    }
  }

  const delta = {
    deltaId: `DELTA-${Date.now()}`,
    traceId: getTraceId() !== 'NO_TRACE_CONTEXT' ? getTraceId() : null,
    timestamp: classification.timestamp,
    chassis: path.basename(outputDir),
    rawMessage: classification.rawMessage,
    errorType: classification.errorType,
    affectedSku: options.affectedSku || classification.affectedSku,
    requiredDependencySku: options.requiredDependencySku || classification.requiredSku,
    ruleUpdate: options.ruleUpdate || (classification.requiredSku 
      ? `If ${classification.affectedSku} is present, ${classification.requiredSku} is mandatory.`
      : `Portal validation flagged restriction on ${classification.affectedSku}.`),
    humanReasoning: options.humanReasoning || null,
    sourceAgent: options.sourceAgent || 'HUMAN_HITL',
    guardrailTurn: options.guardrailTurn || null,
    preConfidenceScore: options.preConfidenceScore || null,
    scopeTaxonomy: options.scopeTaxonomy || (() => {
      try {
        const { classifyKnowledgeScope } = require('../sync/knowledge_sync.js');
        return classifyKnowledgeScope({ chassis: path.basename(outputDir), rawMessage: classification.rawMessage, errorType: classification.errorType });
      } catch (_) {
        return 'CHASSIS_SPECIFIC';
      }
    })(),
    solutionType: options.solutionType || 'General Server',
    status: 'APPLIED_TO_PRECHECKS_AND_RAG'
  };

  // Mirror scopeTaxonomy → scope so both fields are always populated and canonical
  delta.scope = delta.scopeTaxonomy;

  // Deduplicate before appending: if identical rule exists, update timestamp & metadata instead of adding duplicate
  const existingIdx = deltas.findIndex(d => 
    d.chassis === delta.chassis &&
    d.affectedSku === delta.affectedSku &&
    (d.requiredDependencySku === delta.requiredDependencySku || (!d.requiredDependencySku && !delta.requiredDependencySku)) &&
    (d.rawMessage === delta.rawMessage || d.ruleUpdate === delta.ruleUpdate)
  );

  // Negative delta reconciliation: if recording an exclusion/restriction, remove obsolete conflicting positive dependency
  const isExclusion = (delta.rawMessage && (delta.rawMessage.toLowerCase().includes('not compatible') || delta.rawMessage.toLowerCase().includes('do not inject') || delta.rawMessage.toLowerCase().includes('restrict'))) ||
                      delta.errorType === 'MUTUAL_EXCLUSION';

  if (isExclusion && delta.affectedSku && delta.requiredDependencySku) {
    deltas = deltas.filter(d => !(
      d.chassis === delta.chassis &&
      d.affectedSku === delta.affectedSku &&
      d.requiredDependencySku === delta.requiredDependencySku &&
      d.errorType === 'PERMANENT_PHYSICAL_DEPENDENCY'
    ));
  }

  if (existingIdx >= 0) {
    deltas[existingIdx] = {
      ...deltas[existingIdx],
      timestamp: delta.timestamp,
      humanReasoning: delta.humanReasoning || deltas[existingIdx].humanReasoning,
      preConfidenceScore: delta.preConfidenceScore ?? deltas[existingIdx].preConfidenceScore,
      guardrailTurn: delta.guardrailTurn ?? deltas[existingIdx].guardrailTurn
    };
  } else {
    deltas.push(delta);
  }

  safeWriteJsonAtomic(deltaFile, deltas);

  // Auto-update Catalog Rules TSV / CSV if present
  updateCatalogRulesFile(outputDir, delta);

  // Record Telemetry
  try {
    const { recordFeedbackTelemetry } = require('../system/telemetry.js');
    recordFeedbackTelemetry(delta);
  } catch (err) {
    console.warn('⚠️ Telemetry logging advisory:', err.message);
  }

  // S1: Auto-trigger Master Knowledge Sync & NotebookLM payload generation
  try {
    const { buildMasterKnowledgeRegistry, generateNotebookSyncPayload } = require('../sync/knowledge_sync.js');
    buildMasterKnowledgeRegistry();
    generateNotebookSyncPayload(delta.chassis);
  } catch (err) {
    console.warn('⚠️ Master Knowledge Sync advisory:', err.message);
  }

  return existingIdx >= 0 ? deltas[existingIdx] : delta;
}

/**
 * Helper to update catalog rules TSV/CSV and _Catalog_Rules.json with new feedback rule.
 */
function updateCatalogRulesFile(outputDir, delta) {
  const prefix = path.basename(outputDir);
  const rulesCsv = path.join(outputDir, 'intermittent_scraps', `${prefix}_Catalog_Rules.csv`);
  if (fs.existsSync(rulesCsv)) {
    const newRow = `\n"Feedback Learned Rule","${delta.affectedSku}","${delta.ruleUpdate.replace(/"/g, '""')}","${delta.timestamp}"`;
    fs.appendFileSync(rulesCsv, newRow, 'utf-8');
  }

  const rulesJson = path.join(outputDir, `${prefix}_Catalog_Rules.json`);
  if (fs.existsSync(rulesJson)) {
    try {
      const data = JSON.parse(fs.readFileSync(rulesJson, 'utf-8'));
      data.rules = data.rules || [];
      
      // Deduplicate existing rules and check if new rule already exists
      const seen = new Set();
      const dedupedRules = [];
      for (const r of data.rules) {
        const key = `${r.parentCategory}|${r.subCategory}|${r.rule}`;
        if (!seen.has(key)) {
          seen.add(key);
          dedupedRules.push(r);
        }
      }

      const newKey = `Learned Feedback Rules|${delta.affectedSku}|${delta.ruleUpdate}`;
      if (!seen.has(newKey)) {
        dedupedRules.push({
          parentCategory: 'Learned Feedback Rules',
          subCategory: delta.affectedSku,
          constraint: 'learned',
          maxQty: 1,
          rule: delta.ruleUpdate
        });
      }

      data.rules = dedupedRules;
      safeWriteJsonAtomic(rulesJson, data, { minEntriesKey: 'rules', minCount: 1 });
    } catch (_) { const _logger = require('../system/pipeline_logger.js'); _logger.warn('ERROR', 'feedback_loop.js', _); }
  }
}

/**
 * Calculate quantitative confidence score for a BOQ solution payload.
 * Base score 1.0; deducts for physical mismatches, missing dependencies, or unverified SKUs.
 * @param {Array} boqItems 
 * @param {object} evalResults 
 * @returns {object} Confidence details { score, isHitlTriggered, deductions, warnings }
 */
function calculateConfidenceScore(boqItems, evalResults) {
  let score = 1.0;
  const deductions = [];
  const boosts = [];

  if (!boqItems || boqItems.length === 0) {
    score -= 0.50;
    deductions.push('Empty or invalid BOQ items payload (-0.50)');
  }

  // Deduct for pre-flight errors (e.g. missing high perf fans, missing DC lug kit)
  if (evalResults && evalResults.errors && evalResults.errors.length > 0) {
    evalResults.errors.forEach(err => {
      score -= 0.25;
      deductions.push(`Critical Physical Violation: ${err} (-0.25)`);
    });
  }

  // Deduct for pre-flight warnings (e.g. unbalanced memory, missing battery)
  if (evalResults && evalResults.warnings && evalResults.warnings.length > 0) {
    evalResults.warnings.forEach(warn => {
      score -= 0.10;
      deductions.push(`Physical Warning: ${warn} (-0.10)`);
    });
  }

  // Response Check Guardrail: Boost for cascading fixes completely resolving all errors
  const missingDeps = evalResults?.missingDependencies || [];
  if (missingDeps.length > 0 && (evalResults?.errors || []).length === 0) {
    score += 0.10;
    boosts.push(`Cascading Physical Fixes Injected (+0.10)`);
  }

  // Response Check Guardrail: RAG consultation verification
  if (evalResults?.ragVerified === true) {
    score += 0.05;
    boosts.push('NotebookLM RAG Double-Proofed Verification (+0.05)');
  } else if (evalResults?.ragViolationDetected) {
    score -= 0.15;
    deductions.push(`NotebookLM RAG Flagged Conflict: ${evalResults.ragViolationDetected} (-0.15)`);
  }

  // Clamp score between 0.0 and 1.0
  score = Math.max(0.0, Math.min(1.0, parseFloat(score.toFixed(2))));

  // HITL trigger condition: score < 0.75 or critical physical violations
  const isHitlTriggered = score < 0.75;

  return {
    score,
    isHitlTriggered,
    deductions,
    boosts,
    summary: isHitlTriggered
      ? `🚨 HITL TRIGGERED (Score: ${score} < 0.75). Human review required.`
      : `✅ CERTIFIED BUILDABLE (Score: ${score} >= 0.75).`
  };
}

module.exports = {
  classifyPortalError,
  processPortalFeedback,
  calculateConfidenceScore
};
