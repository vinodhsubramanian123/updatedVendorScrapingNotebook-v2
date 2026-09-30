'use strict';
const fs = require('fs');
const path = require('path');
const seeds = require('../config/scraping_workflow_learnings');
const { recordAndCertifyLearnedRule } = require('../lib/feedback/continuous_learning_verifier');
const { safeWriteJsonAtomic } = require('../lib/system/fs_compat');

function recordScrapingWorkflowLearnings(root = path.resolve(__dirname, '../..')) {
  const dir = path.join(root, 'outputs/ProLiant/Gen12/DL380_Gen12');
  const evidenceDir = path.join(dir, 'evidence/scraping_review');
  fs.mkdirSync(evidenceDir, { recursive: true });
  const results = seeds.map(seed => recordAndCertifyLearnedRule({ ...seed,
    vendor: 'HPE', pillar: 'SERVER', family: 'ProLiant', generation: 'Gen12',
    productId: 'DL380_Gen12', chassis: 'DL380_Gen12', scopeTaxonomy: 'CHASSIS_SPECIFIC',
    governanceStatus: 'ACTIVE', evidenceType: 'WORKFLOW_REVIEW',
    source: 'docs/audits/2026-09-30-scraping-independent-review.md',
    procedure: 'docs/RUNTIME_CONDITIONAL_DISCOVERY.md',
    hardwareCompatibilityCertified: false
  }, dir));
  const report = { recordedAt: new Date().toISOString(), results,
    allReachable: results.every(result => result.certification?.reachable === true),
    cloudSyncStatus: 'NOT_PERFORMED', hardwareAcceptanceStatus: 'NOT_CERTIFIED' };
  safeWriteJsonAtomic(path.join(evidenceDir, 'workflow_learning_reachability.json'), report);
  if (!report.allReachable) throw new Error('WORKFLOW_LEARNING_UNREACHABLE');
  return report;
}
if (require.main === module) {
  try {
    const report = recordScrapingWorkflowLearnings();
    console.log(`Workflow advisories reachable: ${report.results.length}/${report.results.length}; cloud sync not performed.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { recordScrapingWorkflowLearnings };
