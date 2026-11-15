'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { safeWriteJsonAtomic } = require('../lib/system/fs_compat');
const { acquireWorkflowLease } = require('../lib/system/workflow_lease');
const nlmSyncClient = require('../lib/sync/nlm_sync_client');
const { assertPayloadProductIsolation, isGroundedCanary } = nlmSyncClient;
const { execNlmReadWithFallback, nlmEnvironment } = require('../lib/notebook/nlm_transport');
const execNlmRead = typeof nlmSyncClient.execNlmRead === 'function'
  ? nlmSyncClient.execNlmRead
  : execNlmReadWithFallback;
const seeds = require('../config/scraping_workflow_learnings');

// Deliberately scoped: these seeds are reviewed only for this product.
function syncScrapingWorkflowLearnings(options = {}) {
  const execFn = options.execFileSync || execFileSync;
  const root = options.root || path.resolve(__dirname, '../..');
  const configPath = path.join(root, 'scripts/config/notebooks.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const product = 'DL380_Gen12';
  const entry = config.notebooks?.[product];
  if (!entry?.notebookId || entry.queryEnabled === false || entry.vendor !== 'HPE' || entry.gen !== 'Gen12') throw new Error('EXACT_LEARNING_NOTEBOOK_UNAVAILABLE');
  if (Object.entries(config.notebooks).some(([key, value]) => key !== product && value.notebookId === entry.notebookId)) throw new Error('LEARNING_NOTEBOOK_NOT_DEDICATED');
  const dir = path.join(root, 'outputs/ProLiant/Gen12', product, 'evidence/scraping_review');
  fs.mkdirSync(dir, { recursive: true });
  const markdown = `# ${product} scoped workflow corrections and observed H200 states\n\nScope: HPE / SERVER / ProLiant / Gen12 / DL380_Gen12. Workflow review and dated vendor observations; not a complete catalog, customer BOM, general hardware rule or CLIC acceptance. These corrections supersede contradictory workflow inferences; use the exact vendor context.\n\n` +
    seeds.map(seed => `## ${seed.deltaId}\n\n${seed.rawMessage}\n`).join('\n');
  assertPayloadProductIsolation(markdown, product, config);
  const fingerprint = crypto.createHash('sha256').update(markdown).digest('hex');
  const payload = `${markdown}\nLearning revision: ${fingerprint}\n`;
  const file = path.join(dir, 'scoped_workflow_learning_note.md');
  fs.writeFileSync(file, payload);
  const baseExecOpts = { cwd: root, encoding: 'utf8', timeout: 180000, maxBuffer: 8 * 1024 * 1024 };
  const extendedPath = process.env.PATH || '';
  const runRead = args => JSON.parse(execNlmRead(execFn, args, baseExecOpts, extendedPath));
  const runWrite = args => JSON.parse(execFn('nlm', args, {
    ...baseExecOpts,
    env: { ...nlmEnvironment(extendedPath, false), PYTHONIOENCODING: 'utf-8' }
  }));
  const title = `${product} Scoped Workflow Corrections ${fingerprint.slice(0, 12)}`;
  const release = acquireWorkflowLease('notebook-catalog-sync');
  try {
    const sources = runRead(['source', 'list', entry.notebookId, '--json']);
    if (!Array.isArray(sources)) throw new Error('NOTEBOOK_INVENTORY_INVALID');
    const existing = sources.find(source => source.title === title);
    const added = existing || runWrite(['source', 'add', entry.notebookId, '--file', file, '--title', title, '--wait', '--wait-timeout', '120', '--json']);
    const sourceId = added.id || added.source_id || added.sourceId || added.source?.id;
    if (!sourceId) throw new Error('LEARNING_SOURCE_ID_MISSING');
    const content = runRead(['source', 'content', sourceId, '--json']);
    const indexed = JSON.stringify(content);
    if (!indexed.includes(fingerprint) || seeds.some(seed => !indexed.includes(seed.deltaId))) throw new Error('LEARNING_READBACK_FAILED');
    const canary = runRead(['notebook', 'query', entry.notebookId,
      `For ${product}, cite this source and distinguish S3U30C presence/unavailability at 30C versus 27C on P73282-B21. Explain why this is not full build acceptance and why OEM must not be the generic default.`,
      '--source-ids', sourceId, '--new-conversation', '--timeout', '120', '--json']);
    safeWriteJsonAtomic(path.join(dir, 'scoped_learning_cloud_canary.json'), canary);
    if (!isGroundedCanary(canary, sourceId, product)) throw new Error('LEARNING_CITATION_VERIFICATION_FAILED');
    const after = runRead(['source', 'list', entry.notebookId, '--json']);
    if (!after.some(source => source.id === sourceId)) throw new Error('LEARNING_SOURCE_NOT_IN_TARGET_NOTEBOOK');
    // Re-read immediately before writing so unrelated in-session config updates survive.
    const latest = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (latest.notebooks?.[product]?.notebookId !== entry.notebookId) throw new Error('NOTEBOOK_MAPPING_CHANGED');
    const target = latest.notebooks[product];
    target.verifiedLearningSourceIds = [...new Set([...(target.verifiedLearningSourceIds || []), sourceId])];
    target.trustedSourceIds = [...new Set([...(target.trustedSourceIds || []), sourceId])];
    target.workflowLearningRevision = fingerprint;
    target.workflowLearningVerifiedAt = new Date().toISOString();
    safeWriteJsonAtomic(configPath, latest);
    const receipt = { product, notebookId: entry.notebookId, sourceId, fingerprint,
      verifiedAt: target.workflowLearningVerifiedAt, status: 'SCOPED_LEARNINGS_CLOUD_VERIFIED',
      catalogRevalidated: false, deletedSourceIds: [], previousSourceIds: sources.map(source => source.id) };
    safeWriteJsonAtomic(path.join(dir, 'scoped_learning_cloud_receipt.json'), receipt);
    return receipt;
  } finally { release(); }
}
if (require.main === module) {
  try { console.log(JSON.stringify(syncScrapingWorkflowLearnings())); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { syncScrapingWorkflowLearnings };
