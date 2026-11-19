'use strict';
/**
 * scripts/maintenance/record_solution_intelligence_learnings.js
 *
 * Records continuous workflow learnings and verified reachability evidence
 * for the Solution Intelligence (SI-00 through SI-10) remediation initiative.
 *
 * All entries are tagged WORKFLOW_REVIEW with hardwareCompatibilityCertified: false
 * and remain strictly separated from physical hardware compatibility rules (INV-250).
 */

const path = require('path');
const { getProductGenerationMetadata } = require('../lib/catalog/product_metadata_manager');
const { recordAndCertifyLearnedRule } = require('../lib/feedback/continuous_learning_verifier');
const { safeWriteJsonAtomic } = require('../lib/system/fs_compat');

const AUDIT_SOURCE = 'docs/audits/2026-11-19-solution-intelligence-certification-report.md';

const ADVISORIES = [
  [
    'WORKFLOW_SI_NO_SILENT_DEFAULT_CONVERSION',
    'Evaluators, sizing calculators, and serializers MUST preserve null or UNKNOWN for missing node capacity, unpriced items, stale lead times, and unassessed metrics rather than substituting default server capacities, zero prices, or PASS fallbacks (INV-244, INV-248, INV-252).'
  ],
  [
    'WORKFLOW_SI_STRICT_DOCUMENT_REVIEW_GATE',
    'Bare { success: true } on ephemeralSourceValidation MUST NOT be promoted to VERIFIED or DOUBLE_CHECK_PASSED. Customer presentation and DeliveryAuthorization require grounded, detached, double-checked, cited, non-mock review plus unsatisfied/unomitted hard requirement and claim gates B22-B24 (INV-245, INV-249).'
  ],
  [
    'WORKFLOW_SI_INDEPENDENT_WAVE_VERIFICATION',
    'Parallel implementation waves with disjoint file ownership MUST pass independent counterexample verification before seam integration, confirming cross-package interoperability, cycle rejection, and zero regression leakage (INV-246, INV-247).'
  ],
  [
    'WORKFLOW_SI_NON_PHYSICAL_SEGREGATION',
    'Active knowledge routing MUST segregate operational incidents, user preferences, and agent self-explanations into segregatedEntries[] outside physical hardware rules, while preserving WORKFLOW_REVIEW advisories in advisories/workflowAdvisories for audit reachability (INV-250).'
  ],
  [
    'WORKFLOW_SI_PORTAL_SEVEN_COLUMN_PRESERVATION',
    'Analytical SolutionIntelligenceEnvelope views (Decision & Evidence sheet, Markdown sections, dashboard banners, and MCP tools) MUST leave the 7-column Partner Portal upload sheet strictly unmodified (INV-249).'
  ],
  [
    'WORKFLOW_SI_CHECKPOINT_AND_ISOLATION',
    'Long multi-milestone engineering plans run with disjoint worker file ownership on inherit workspaces, persist disk checkpoints and SI-00/SI-10 receipts cleanly without mutating protected benchmarks or notebooks config, and keep offline certification separate from unrun live portal acceptance (INV-251, INV-252).'
  ]
];

function _buildWorkflowDelta(product, meta, ruleType, rawMessage) {
  return {
    deltaId: `LEARN_${product.toUpperCase()}_${ruleType}_20261119`,
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
  };
}

function recordSolutionIntelligenceLearnings(products) {
  const targetProducts = Array.isArray(products) && products.length > 0 ? products : ['DL380_Gen12', 'DL380a_Gen12'];
  return targetProducts.map(product => {
    const meta = getProductGenerationMetadata(product);
    if (!meta.exists || !meta.outputDir) {
      throw new Error(`CATALOG_NOT_FOUND: ${product}`);
    }

    const results = ADVISORIES.map(([ruleType, rawMessage]) =>
      recordAndCertifyLearnedRule(_buildWorkflowDelta(product, meta, ruleType, rawMessage), meta.outputDir)
    );

    const allReachable = results.every(res => res.certification && res.certification.reachable === true);
    const report = {
      product,
      recordedAt: new Date().toISOString(),
      source: AUDIT_SOURCE,
      results,
      allReachable,
      hardwareCompatibilityCertified: false
    };

    const evidenceFile = path.join(meta.outputDir, 'evidence', '2026-11-19-solution-intelligence-reachability.json');
    safeWriteJsonAtomic(evidenceFile, report);

    if (!allReachable) {
      throw new Error(`WORKFLOW_LEARNING_UNREACHABLE: ${product}`);
    }
    return report;
  });
}

if (require.main === module) {
  const products = process.argv.slice(2);
  const reports = recordSolutionIntelligenceLearnings(products);
  console.log('Recorded and certified SI workflow learnings for:', reports.map(r => r.product).join(', '));
}

module.exports = { recordSolutionIntelligenceLearnings, ADVISORIES };
