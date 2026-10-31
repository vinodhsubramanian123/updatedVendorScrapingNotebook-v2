'use strict';
const path = require('path');
const { getProductGenerationMetadata } = require('../lib/catalog/product_metadata_manager');
const { recordAndCertifyLearnedRule } = require('../lib/feedback/continuous_learning_verifier');
const { safeWriteJsonAtomic } = require('../lib/system/fs_compat');

const advisories = [
  ['WORKFLOW_DUAL_PUBLICATION_ADVISORY', 'Publish and read back the human Drive workbook separately from the complete semantic Markdown source in NotebookLM. Google Sheets is not a supported NotebookLM Drive source. A recent upload timestamp does not refresh old vendor observations.'],
  ['WORKFLOW_SOURCE_RETIREMENT_ADVISORY', 'Verify exact-product replacement content, indexing and source-restricted grounded canary, then commit trust metadata before removing only managed stale catalog snapshots. Preserve QuickSpecs, separate learnings, shared enclosure/fabric sources and unrelated documents. Inventory absence is not authority to remove another product source.'],
  ['WORKFLOW_CLOUD_LEARNING_REVIEW_ADVISORY', 'Preserve retrieved cloud learning documents locally with their source IDs. Treat prose claims as candidates pending dated vendor evidence; resolve contradictions before promoting hardware dependencies. Conflicting quantity claims require dated evidence for this exact product and selector state.']
];

function recordRefreshLearnings(products) {
  return products.map(product => {
    const meta = getProductGenerationMetadata(product);
    if (!meta.exists || !meta.outputDir) throw new Error(`CATALOG_NOT_FOUND: ${product}`);
    const results = advisories.map(([ruleType, rawMessage]) => recordAndCertifyLearnedRule({
      deltaId: `LEARN_${product.toUpperCase()}_${ruleType}_20261029`, ruleType, rawMessage,
      productId: product, vendor: 'HPE', family: product.startsWith('SY') ? 'Synergy' : 'ProLiant',
      generation: meta.generation, pillar: product === 'SY100Gb_F32_Module' ? 'NETWORKING' : 'SERVER',
      scopeTaxonomy: 'CHASSIS_SPECIFIC', governanceStatus: 'ACTIVE', evidenceType: 'WORKFLOW_REVIEW',
      source: 'docs/audits/2026-10-29-catalog-refresh-and-knowledge-sync.md',
      hardwareCompatibilityCertified: false
    }, meta.outputDir));
    const report = { product, recordedAt: new Date().toISOString(), results,
      allReachable: results.every(result => result.certification?.reachable === true),
      hardwareCompatibilityCertified: false };
    safeWriteJsonAtomic(path.join(meta.outputDir, 'evidence', '2026-10-29-refresh-learning-reachability.json'), report);
    if (!report.allReachable) throw new Error(`WORKFLOW_LEARNING_UNREACHABLE: ${product}`);
    return report;
  });
}
if (require.main === module) {
  const products = process.argv.slice(2);
  if (!products.length) throw new Error('Supply exact product IDs');
  console.log(JSON.stringify(recordRefreshLearnings(products)));
}
module.exports = { recordRefreshLearnings };
