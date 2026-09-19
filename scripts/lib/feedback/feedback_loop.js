'use strict';
/**
 * scripts/lib/feedback_loop.js — Closed-Loop Portal Feedback & Knowledge Delta Engine
 *
 * Ingests unbuildable error messages and portal rejection warnings from HPE OCA (or vendor portals),
 * classifies error types and records product-scoped candidate KnowledgeDeltas.
 * Candidates remain quarantined unless a complete evidence-backed human review
 * authorizes promotion into active local rules and the NotebookLM sync pipeline.
 */

const fs = require('fs');
const path = require('path');

const { safeWriteJsonAtomic } = require('../system/fs_compat.js');
const { getTraceId } = require('../system/trace_context.js');
const {
  validateKnowledgeDelta,
  saveQuarantinedDelta,
  promoteQuarantinedDelta,
  buildKnowledgeFingerprint
} = require('./quarantined_deltas.js');
const { HPE_SKU_EXTRACT_REGEX, cleanBaseSKU, isValidHpeSKU } = require('../catalog/sku.js');

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

  const extractGlobal = new RegExp(HPE_SKU_EXTRACT_REGEX.source, 'gi');
  const rawMatches = msg.match(extractGlobal) || [];
  const matches = rawMatches.map(cleanBaseSKU).filter(isValidHpeSKU);

  let affectedSku = matches[0] || 'UNKNOWN_SKU';
  let requiredSku = null;
  const relation = msg.match(/\b(requires?|mandatory|must include|needs?)\b/i);
  if (relation) {
    const parts = msg.split(/\b(?:requires?|mandatory|must include|needs?)\b/i);
    const beforeRaw = (parts[0] || '').match(extractGlobal) || [];
    const afterRaw = (parts.slice(1).join(' ') || '').match(extractGlobal) || [];
    const before = beforeRaw.map(cleanBaseSKU).filter(isValidHpeSKU);
    const after = afterRaw.map(cleanBaseSKU).filter(isValidHpeSKU);
    if (before.length > 0) {
      affectedSku = before.at(-1);
      requiredSku = after[0] || null;
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
 * @param {string} outputDir E.g. "outputs/ProLiant/Gen12/DL380_Gen12"
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

  const delta = {
    deltaId: `DELTA-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    traceId: getTraceId() !== 'NO_TRACE_CONTEXT' ? getTraceId() : null,
    timestamp: classification.timestamp,
    chassis: path.basename(outputDir),
    rawMessage: classification.rawMessage,
    errorType: classification.errorType,
    affectedSku: options.affectedSku || classification.affectedSku,
    requiredDependencySku: options.requiredDependencySku || classification.requiredSku,
    ruleUpdate: options.ruleUpdate || classification.rawMessage,
    humanReasoning: options.humanReasoning || null,
    ...(options.pricingObservation ? { pricingObservation: options.pricingObservation } : {}),
    sourceAgent: options.sourceAgent || 'PORTAL_OBSERVATION',
    source: options.source || 'OFFICIAL_VENDOR_PORTAL_OBSERVATION',
    citations: Array.isArray(options.citations) ? options.citations : [],
    guardrailTurn: options.guardrailTurn || null,
    preConfidenceScore: options.preConfidenceScore ?? 0.70,
    scopeTaxonomy: options.scopeTaxonomy || 'CHASSIS_SPECIFIC',
    solutionType: options.solutionType || 'General Server',
    status: 'PENDING_HUMAN_REVIEW'
  };

  // Mirror scopeTaxonomy → scope so both fields are always populated and canonical
  delta.scope = delta.scopeTaxonomy;

  const catalogPath = fs.readdirSync(outputDir, { withFileTypes: true })
    .find(entry => entry.isFile() && entry.name.endsWith('_Catalog.json'));
  let catalogData = null;
  if (catalogPath) catalogData = JSON.parse(fs.readFileSync(path.join(outputDir, catalogPath.name), 'utf-8'));

  const validation = validateKnowledgeDelta(delta, { catalogData, humanReview: options.humanReview });
  if (!validation.valid || validation.status === 'REJECTED') {
    const { logAutonomousRejection } = require('./quarantined_deltas.js');
    logAutonomousRejection({ ...delta, knowledgeFingerprint: delta.knowledgeFingerprint || buildKnowledgeFingerprint(delta) }, validation.reasons, { filePath: path.join(historyDir, 'quarantined_deltas.json') });
    return { ...delta, governanceStatus: 'REJECTED', status: 'REJECTED', rejectionReasons: validation.reasons };
  }

  const candidate = { ...validation.sanitizedDelta, knowledgeFingerprint: validation.sanitizedDelta.knowledgeFingerprint || buildKnowledgeFingerprint(validation.sanitizedDelta) };
  if (validation.status === 'QUARANTINED') {
    return saveQuarantinedDelta(candidate, validation.reasons, {
      filePath: path.join(historyDir, 'quarantined_deltas.json')
    });
  }

  const quarantineFile = path.join(historyDir, 'quarantined_deltas.json');
  const pending = saveQuarantinedDelta(candidate, ['Evidence-backed decision awaiting atomic promotion'], { filePath: quarantineFile });
  const reviewer = options.humanReview?.reviewer || 'autonomous-lead-architect';
  const activated = promoteQuarantinedDelta(pending.quarantineId, reviewer, {
    filePath: quarantineFile,
    activationDirectory: outputDir,
    catalogData,
    humanReview: options.humanReview || { reviewer, reasoning: 'Auto-promoted verified portal evidence' }
  });
  if (!activated) return pending;
  updateCatalogRulesFile(outputDir, activated);
  try {
    if (options.skipPostPromotionSideEffects === true) return activated;
    const { recordFeedbackTelemetry } = require('../system/telemetry.js');
    recordFeedbackTelemetry(activated);
    const { buildMasterKnowledgeRegistry, generateNotebookSyncPayload } = require('../sync/knowledge_sync.js');
    buildMasterKnowledgeRegistry();
    generateNotebookSyncPayload(activated.chassis);
  } catch (err) {
    console.warn('⚠️ Verified knowledge sync advisory:', err.message);
  }
  return activated;
}

/**
 * Helper to update catalog rules TSV/CSV and _Catalog_Rules.json with new feedback rule.
 */
function updateCatalogRulesFile(outputDir, delta) {
  const prefix = path.basename(outputDir);
  const rulesCsv = path.join(outputDir, 'intermittent_scraps', `${prefix}_Catalog_Rules.csv`);
  if (fs.existsSync(rulesCsv)) {
    const esc = str => String(str || '').replace(/"/g, '""');
    const newRow = `\n"Feedback Learned Rule","${esc(delta.affectedSku)}","${esc(delta.ruleUpdate)}","${esc(delta.timestamp)}"`;
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

/**
 * Auto-promotes verified price drift items from live vendor quotes into the active knowledge registry.
 * Preserves governance quarantine: autonomous drift records land in quarantine awaiting human approval
 * unless explicitly verified by human review metadata.
 * @param {string} chassisDir Target chassis output directory
 * @param {Array<object>} driftItems Array of { sku, priceUsd, quoteId, region, currency, sourceArtifactHash, reasoning, catalogVersion }
 * @param {object} [metadata={}] Optional run-level metadata { quoteId, quoteSha256, catalogVersion, humanReview }
 * @returns {object} Structured promotion and quarantine receipts
 */
function promotePriceDriftDeltas(chassisDir, driftItems = [], metadata = {}) {
  const emptyRes = {
    promotedCount: 0,
    quarantinedCount: 0,
    totalProcessed: 0,
    receipts: [],
    status: 'NO_DELTAS'
  };

  if (!chassisDir || !Array.isArray(driftItems) || driftItems.length === 0) {
    return emptyRes;
  }

  let activatedCount = 0;
  let quarantinedCount = 0;
  let rejectedCount = 0;
  const receipts = [];

  for (const item of driftItems) {
    if (!item?.sku || !Number.isFinite(item.priceUsd) || item.priceUsd < 0) {
      rejectedCount++;
      receipts.push({ sku: item?.sku || null, governanceStatus: 'REJECTED', error: 'SKU and finite nonnegative quote price are required' });
      continue;
    }

    const quoteId = item.quoteId || metadata.quoteId || 'UNKNOWN_QUOTE';
    const quoteSha256 = item.sourceArtifactHash || metadata.quoteSha256 || null;
    const currency = item.currency || metadata.currency || null;
    const region = item.region || metadata.region || null;
    const catalogVersion = item.catalogVersion || metadata.catalogVersion || 'UNKNOWN';

    // Governance: only label as humanReview if explicit human reviewer metadata is supplied
    const humanReview = metadata.humanReview || item.humanReview || null;

    try {
      const delta = processPortalFeedback(
        `Pricing alignment: SKU ${item.sku} quote price $${item.priceUsd} ${currency} (Quote: ${quoteId})`,
        chassisDir,
        {
          affectedSku: item.sku,
          requiredDependencySku: null,
          ruleUpdate: `Pricing aligned from vendor quote ${quoteId} for SKU ${item.sku} ($${item.priceUsd} ${currency})`,
          humanReasoning: item.reasoning || `Vendor quote price observation for ${item.sku}`,
          sourceAgent: 'PRICING_ALIGNMENT_ENGINE',
          source: 'OFFICIAL_VENDOR_PORTAL_OBSERVATION',
          citations: quoteSha256 ? [`sha256:${quoteSha256}`] : [],
          preConfidenceScore: 0.95,
          scopeTaxonomy: 'CHASSIS_SPECIFIC',
          pricingObservation: { quoteId, sourceArtifactHash: quoteSha256, currency, region, catalogVersion, price: item.priceUsd },
          catalogVersion,
          region,
          currency,
          humanReview: humanReview,
          autonomousReview: !humanReview ? {
            agent: 'PRICING_ALIGNMENT_ENGINE',
            quoteId,
            quoteSha256,
            timestamp: new Date().toISOString()
          } : null
        }
      );

      const status = delta?.governanceStatus || delta?.status || 'UNKNOWN';
      const receipt = {
        sku: item.sku,
        priceUsd: item.priceUsd,
        currency,
        quoteId,
        governanceStatus: status,
        quarantineId: delta?.quarantineId || null,
        knowledgeFingerprint: delta?.knowledgeFingerprint || null,
        timestamp: new Date().toISOString()
      };

      receipts.push(receipt);

      if (status === 'ACTIVE') {
        activatedCount++;
      } else if (status === 'QUARANTINED' || status === 'PENDING_HUMAN_REVIEW') {
        quarantinedCount++;
      } else {
        rejectedCount++;
      }
    } catch (e) {
      const logger = require('../system/pipeline_logger.js');
      logger.warn('FEEDBACK_LOOP', `Failed to process price drift for SKU ${item.sku}: ${e.message}`);
      rejectedCount++;
      receipts.push({ sku: item.sku, governanceStatus: 'FAILED', error: e.message });
    }
  }

  const totalProcessed = receipts.length;
  let status = 'NO_DELTAS';
  if (activatedCount > 0 && quarantinedCount === 0) {
    status = 'ACTIVATED';
  } else if (activatedCount > 0 && quarantinedCount > 0) {
    status = 'PARTIAL';
  } else if (quarantinedCount > 0) {
    status = 'QUARANTINED';
  }

  if (rejectedCount) status = activatedCount || quarantinedCount ? 'PARTIAL' : 'REJECTED';
  return {
    rejectedCount,
    promotedCount: activatedCount,
    quarantinedCount,
    totalProcessed,
    receipts,
    status
  };
}

module.exports = {
  classifyPortalError,
  processPortalFeedback,
  calculateConfidenceScore,
  promotePriceDriftDeltas
};
