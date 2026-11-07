'use strict';
/**
 * scripts/maintenance/record_skills_and_reasoning_learnings.js
 *
 * Records continuous learning rules and verified reachability evidence
 * for the Agent Skills Hardening, Modularization & Epistemic Elevation initiative.
 *
 * Enforces cyclomatic complexity <= 30 across all functions.
 */

const path = require('path');
const { getProductGenerationMetadata } = require('../lib/catalog/product_metadata_manager');
const { recordAndCertifyLearnedRule } = require('../lib/feedback/continuous_learning_verifier');
const { safeWriteJsonAtomic } = require('../lib/system/fs_compat');

const AUDIT_SOURCE = 'docs/audits/2026-11-07-agent-skills-audit-and-reasoning-clarity.md';

const ADVISORIES = [
  [
    'WORKFLOW_NORMATIVE_LANGUAGE_PRECISION',
    'All agent skill directives, checklists, and execution handoffs must adhere to strict RFC-2119 normative vocabulary (MUST, MUST NOT, SHALL, SHOULD, MAY). Ambiguous hedge words (appropriate, as needed, etc., consider, typically, usually, generally, if possible, try to) are strictly prohibited in operational procedures to eliminate agent hesitation and non-deterministic loops.'
  ],
  [
    'WORKFLOW_MODULAR_SKILL_TOKEN_OPTIMIZATION',
    'Monolithic skills exceeding 25KB must be modularized into a concise core execution SKILL.md (<=250 lines) plus dedicated references/ documentation files. This preserves agent prompt token budgets, accelerates model reasoning, and prevents guardrail context window exhaustion.'
  ],
  [
    'WORKFLOW_UNIVERSAL_CC30_AND_QUALITY_CEILING',
    'Every function across all repository scripts and test fixtures must strictly comply with the universal cyclomatic complexity ceiling <= 30 (INV-229, INV-230). All modified code must pass oxlint with zero warnings, maintain a clean DAG with zero circular dependencies, and preserve non-empty test discovery.'
  ],
  [
    'WORKFLOW_SPECIALIZED_ARCHITECTURAL_DISPATCH',
    'Incoming presales inquiries must be classified and dispatched by presales-query-router across 34 specialized skill tracks, including code-quality-gate, self-correction-counterfactual, presales-clearance-strategy, and turnkey-racking-cabling, with zero ad-hoc script generation.'
  ]
];

function recordSkillsLearnings(products) {
  const targetProducts = Array.isArray(products) && products.length > 0 ? products : ['DL380_Gen12', 'DL380a_Gen12'];
  return targetProducts.map(product => {
    const meta = getProductGenerationMetadata(product);
    if (!meta.exists || !meta.outputDir) {
      throw new Error(`CATALOG_NOT_FOUND: ${product}`);
    }

    const results = ADVISORIES.map(([ruleType, rawMessage]) => {
      const deltaId = `LEARN_${product.toUpperCase()}_${ruleType}_20261107`;
      return recordAndCertifyLearnedRule({
        deltaId,
        ruleType,
        rawMessage,
        productId: product,
        vendor: 'HPE',
        family: 'ProLiant',
        generation: meta.generation || 'Gen12',
        pillar: 'SERVER',
        scopeTaxonomy: 'CHASSIS_SPECIFIC',
        governanceStatus: 'ACTIVE',
        evidenceType: 'WORKFLOW_REVIEW',
        source: AUDIT_SOURCE,
        hardwareCompatibilityCertified: false
      }, meta.outputDir);
    });

    const allReachable = results.every(res => res.certification && res.certification.reachable === true);
    const report = {
      product,
      recordedAt: new Date().toISOString(),
      source: AUDIT_SOURCE,
      results,
      allReachable,
      hardwareCompatibilityCertified: false
    };

    const evidenceFile = path.join(meta.outputDir, 'evidence', '2026-11-07-skills-hardening-reachability.json');
    safeWriteJsonAtomic(evidenceFile, report);

    if (!allReachable) {
      throw new Error(`WORKFLOW_LEARNING_UNREACHABLE: ${product}`);
    }
    return report;
  });
}

if (require.main === module) {
  const products = process.argv.slice(2);
  const reports = recordSkillsLearnings(products);
  console.log('✅ Successfully recorded and certified skills learnings for:', reports.map(r => r.product).join(', '));
}

module.exports = { recordSkillsLearnings };
