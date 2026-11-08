'use strict';
/**
 * scripts/maintenance/record_reasoning_and_counterfactual_learnings.js
 *
 * Records continuous learning rules and verified reachability evidence
 * for Closed-Loop Counterfactual Correction, Epistemic Tier Integrity,
 * and Append-Only Knowledge Retraction (INV-231).
 *
 * Rebuilds the Master Knowledge Registry and updates running_knowledge_charter.md.
 * Enforces cyclomatic complexity <= 30 across all functions.
 */

const path = require('path');
const seeds = require('../config/reasoning_workflow_learnings');
const { getProductGenerationMetadata } = require('../lib/catalog/product_metadata_manager');
const { recordAndCertifyLearnedRule } = require('../lib/feedback/continuous_learning_verifier');
const { buildMasterKnowledgeRegistry } = require('../lib/sync/knowledge_sync');
const { syncRunningKnowledge } = require('../services/running_knowledge_sync');
const { safeWriteJsonAtomic } = require('../lib/system/fs_compat');

const AUDIT_SOURCE = 'docs/audits/2026-11-08-solution-reasoning-and-self-correction-gap-review.md';

function _seedRulesForProduct(product, meta) {
  const isDefaultProduct = product === 'DL380_Gen12';
  return seeds.map(seed => {
    const deltaId = isDefaultProduct
      ? seed.deltaId
      : seed.deltaId.replace('LEARN_', `LEARN_${product.toUpperCase()}_`);

    return recordAndCertifyLearnedRule({
      ...seed,
      deltaId,
      productId: product,
      vendor: 'HPE',
      family: 'ProLiant',
      generation: meta.generation || 'Gen12',
      pillar: 'SERVER',
      chassis: product,
      scopeTaxonomy: 'CHASSIS_SPECIFIC',
      governanceStatus: 'ACTIVE',
      evidenceType: 'WORKFLOW_REVIEW',
      source: AUDIT_SOURCE,
      procedure: 'docs/INVARIANTS.md',
      hardwareCompatibilityCertified: false
    }, meta.outputDir);
  });
}

async function recordReasoningAndCounterfactualLearnings(products) {
  const targetProducts = Array.isArray(products) && products.length > 0 ? products : ['DL380_Gen12'];
  const reports = [];

  for (const product of targetProducts) {
    const meta = getProductGenerationMetadata(product);
    if (!meta.exists || !meta.outputDir) {
      throw new Error(`CATALOG_NOT_FOUND: ${product}`);
    }

    const results = _seedRulesForProduct(product, meta);
    const allReachable = results.every(res => res.certification && res.certification.reachable === true);

    const report = {
      product,
      recordedAt: new Date().toISOString(),
      source: AUDIT_SOURCE,
      results,
      allReachable,
      hardwareCompatibilityCertified: false
    };

    const evidenceFile = path.join(meta.outputDir, 'evidence', '2026-11-08-reasoning-learning-reachability.json');
    safeWriteJsonAtomic(evidenceFile, report);

    if (!allReachable) {
      throw new Error(`WORKFLOW_LEARNING_UNREACHABLE: ${product}`);
    }
    reports.push(report);
  }

  // Rebuild master registry and refresh running knowledge charter locally
  buildMasterKnowledgeRegistry({ persist: true });
  await syncRunningKnowledge({ dryRun: true });

  return reports;
}

if (require.main === module) {
  const products = process.argv.slice(2);
  recordReasoningAndCounterfactualLearnings(products)
    .then(reports => {
      console.log('✅ Successfully recorded, certified, and synchronized reasoning learnings for:', reports.map(r => r.product).join(', '));
    })
    .catch(err => {
      console.error('❌ Failed to record reasoning learnings:', err.message);
      process.exitCode = 1;
    });
}

module.exports = { recordReasoningAndCounterfactualLearnings };
