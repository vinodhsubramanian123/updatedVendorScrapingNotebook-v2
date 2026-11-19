'use strict';
/**
 * tests/unit/test_si08_invalidation_and_consumed_learning.js
 *
 * SI-08 Acceptance & Regression Suite (100% os.tmpdir()-isolated; zero tracked outputs mutations):
 * 1. Fresh-process (spawnSync) consumption triggers on matching scope, ignores non-triggers & wrong generation,
 *    and stops affecting candidates immediately after retractPromotedDelta with zero prompt hints.
 * 2. Requirement change, source change, and retracted rule transitively invalidate downstream
 *    CLAIM/CANDIDATE/REVIEW/ARTIFACT/AUTHORIZATION nodes + local_rag_search.js, queue reevaluation,
 *    preserve immutable receipts untouched on disk, and leave unrelated products VALID.
 * 3. Fresh process restart reloads persisted dependency index accurately.
 * 4. Cyclic evidence (A -> B -> C -> A and self-loop A -> A) is rejected with cyclicEvidenceRejected: true.
 * 5. Operational incidents, workflow incidents, user preferences, and agent self-explanations are segregated
 *    strictly into segregatedEntries and never enter physical rules (while WORKFLOW_REVIEW stays out of physicalRules).
 * 6. recordRuleConsumption distinguishes retrievedRuleIds vs appliedRuleIds + appliedEffects, validates
 *    zero-new-lesson runs, and keeps cloudSyncStatus separate.
 * 7. Simulated atomic-write failure leaves prior dependency index file byte-for-byte intact on disk.
 * 8. preservePrimaryErrorOnReflectionFailure preserves primaryError even when sync/async reflection throws.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const {
  SCHEMA_VERSION,
  NODE_KINDS,
  DEFAULT_DEPENDENCY_INDEX_PATH,
  createDependencyIndex,
  loadDependencyIndex,
  saveDependencyIndexAtomic,
  registerDependencyNode,
  addDependencyEdge,
  detectDependencyCycle,
  invalidateBySourceChange,
  invalidateByRequirementChange,
  invalidateByRetractedRule,
  evaluateInvalidationBoundary,
  recordReevaluationOutcome
} = require('../../scripts/lib/boq/evidence/dependency_index.js');

const {
  loadActiveKnowledgeRules,
  recordRuleConsumption
} = require('../../scripts/lib/catalog/active_knowledge_router.js');

const {
  saveQuarantinedDelta,
  promoteQuarantinedDelta,
  retractPromotedDelta,
  supersedeKnowledgeDelta,
  preservePrimaryErrorOnReflectionFailure
} = require('../../scripts/lib/feedback/quarantined_deltas.js');

const {
  queryLocalKnowledgeBase,
  queryLocalKnowledgeBaseAsync
} = require('../../scripts/lib/rag/local_rag_search.js');

const { safeWriteJsonAtomic } = require('../../scripts/lib/system/fs_compat.js');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

function makeTempSandbox(t, prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('SI-08 [1/8]: Fresh-process trigger, non-trigger, wrong-scope isolation, and post-retraction stop (zero prompt hints)', (t) => {
  const tmpDir = makeTempSandbox(t, 'si08-fresh-');
  const chassisDir = path.join(tmpDir, 'ProLiant', 'Gen12', 'DL380_Gen12');
  const historyDir = path.join(chassisDir, 'history');
  fs.mkdirSync(historyDir, { recursive: true });

  const masterPath = path.join(tmpDir, 'master_knowledge_registry.json');
  const globalPath = path.join(tmpDir, 'global_catalog_deltas.json');
  const quarantinePath = path.join(historyDir, 'quarantined_deltas.json');
  const decisionsPath = path.join(historyDir, 'knowledge_decisions.json');
  const chassisDeltasPath = path.join(historyDir, 'catalog_deltas.json');
  const depIndexPath = path.join(tmpDir, 'evidence_dependency_index.json');

  const ruleId = 'DELTA-SI08-FAN-001';
  const rawDelta = {
    deltaId: ruleId,
    chassis: 'DL380_Gen12',
    productId: 'DL380_Gen12',
    affectedSku: 'P73282-B21',
    requiredDependencySku: 'P48820-B21',
    ruleType: 'PERMANENT_PHYSICAL_DEPENDENCY',
    scopeTaxonomy: 'CHASSIS_SPECIFIC',
    source: 'OFFICIAL_QUICKSPECS',
    citations: ['QS-DL380-GEN12#System Fans'],
    confidenceScore: 0.75,
    rawMessage: 'DL380 Gen12 CTO Server P73282-B21 requires mandatory High Performance Fan Kit P48820-B21'
  };

  saveQuarantinedDelta(rawDelta, ['Awaiting review'], { filePath: quarantinePath });
  const promoted = promoteQuarantinedDelta(ruleId, 'LEAD_REVIEWER', {
    filePath: quarantinePath,
    skipActivation: true,
    humanReview: {
      reviewer: 'LEAD_REVIEWER',
      reasoning: 'Verified fan kit requirement directly in HPE DL380 Gen12 QuickSpecs.',
      decision: 'APPROVE',
      verified: true,
      evidence: [{ type: 'OFFICIAL_QUICKSPECS', id: 'QS-DL380-GEN12#System Fans' }]
    }
  });
  assert.ok(promoted && promoted.status === 'PROMOTED');

  const activeDelta = { ...promoted, active: true, status: 'ACTIVE', governanceStatus: 'ACTIVE' };
  safeWriteJsonAtomic(masterPath, { universalRules: [], familyGenRules: [], chassisSpecificRules: [activeDelta] });
  safeWriteJsonAtomic(chassisDeltasPath, [activeDelta]);

  const idx = createDependencyIndex();
  registerDependencyNode(idx, { id: ruleId, kind: 'RULE', product: 'DL380_Gen12', revision: 'v1' });
  registerDependencyNode(idx, { id: 'CLAIM-FAN-1', kind: 'CLAIM', product: 'DL380_Gen12', revision: 'v1' });
  registerDependencyNode(idx, { id: 'ART-FAN-1', kind: 'ARTIFACT', product: 'DL380_Gen12', revision: 'v1' });
  addDependencyEdge(idx, ruleId, 'CLAIM-FAN-1', 'SUPPORTS');
  addDependencyEdge(idx, 'CLAIM-FAN-1', 'ART-FAN-1', 'SUPPORTS');
  saveDependencyIndexAtomic(depIndexPath, idx);

  // Fresh child process #1: verify trigger on matching SKU/product, non-trigger on unrelated SKU, wrong-gen blocked
  const childScript1 = `
    const assert = require('node:assert/strict');
    const { loadActiveKnowledgeRules, recordRuleConsumption } = require('./scripts/lib/catalog/active_knowledge_router.js');
    const [chassisDir, masterPath, decisionsPath, quarantinePath, depIndexPath, ruleId] = process.argv.slice(1);
    const opts = {
      registryPaths: [masterPath],
      decisionPaths: [decisionsPath],
      quarantinePaths: [quarantinePath],
      dependencyIndexPath: depIndexPath
    };
    const gen12 = loadActiveKnowledgeRules('DL380_Gen12', chassisDir, opts);
    assert.equal(gen12.allRules.some(r => r.ruleId === ruleId), true);
    assert.equal(gen12.physicalRules.some(r => r.ruleId === ruleId), true);
    assert.equal(gen12.mandatoryDependencies.some(r => r.ruleId === ruleId), true);

    // Trigger on matching BOM SKU
    const matchingBom = [{ sku: 'P73282-B21', quantity: 1 }];
    const matched = matchingBom.flatMap(item => gen12.skuLookupMap.get(item.sku) || []);
    assert.equal(matched.length, 1);
    const consumption = recordRuleConsumption(gen12, matched.map(r => ({
      ruleId: r.ruleId, sku: r.affectedSku, action: 'INJECT_DEPENDENCY', effect: r.requiredDependencySku, reason: r.reasoning
    })));
    assert.deepEqual(consumption.appliedRuleIds, [ruleId]);

    // Non-trigger on unrelated SKU
    const unrelatedBom = [{ sku: 'P99999-B21', quantity: 2 }];
    const unmatched = unrelatedBom.flatMap(item => gen12.skuLookupMap.get(item.sku) || []);
    assert.equal(unmatched.length, 0);

    // Wrong generation blocked (Gen11 must not receive DL380_Gen12 rule)
    const gen11 = loadActiveKnowledgeRules('DL380_Gen11', '', {
      registryPaths: [masterPath],
      decisionPaths: [decisionsPath],
      quarantinePaths: [quarantinePath],
      includeChassisDirDeltas: false
    });
    assert.equal(gen11.allRules.some(r => r.ruleId === ruleId), false);
    assert.ok(gen11.excludedScopeRuleIds.includes(ruleId));
  `;
  const run1 = spawnSync(
    process.execPath,
    ['-e', childScript1, chassisDir, masterPath, decisionsPath, quarantinePath, depIndexPath, ruleId],
    { cwd: REPO_ROOT, encoding: 'utf8' }
  );
  assert.equal(run1.status, 0, `Fresh child #1 failed: ${run1.stderr}`);

  // Retract rule cleanly with append-only decisions + dependency index invalidation
  const retractRes = retractPromotedDelta(ruleId, 'Vendor errata reversed dependency', {
    masterRegistryPath: masterPath,
    globalDeltasPath: globalPath,
    chassisDir,
    filePath: quarantinePath,
    dependencyIndexPath: depIndexPath
  });
  assert.equal(retractRes.retracted, true);
  assert.equal(retractRes.deactivated, true);
  assert.deepEqual(retractRes.dependencyInvalidation.affectedNodeIds, ['CLAIM-FAN-1', 'ART-FAN-1']);

  const decisions = JSON.parse(fs.readFileSync(decisionsPath, 'utf8'));
  assert.ok(decisions.some(d => d.decision === 'PROMOTED' && d.deltaId === ruleId));
  assert.ok(decisions.some(d => d.decision === 'RETRACTED' && d.deltaId === ruleId));

  // Fresh child process #2: retracted rule stops affecting new candidates with ZERO prompt hints
  const childScript2 = `
    const assert = require('node:assert/strict');
    const { loadActiveKnowledgeRules } = require('./scripts/lib/catalog/active_knowledge_router.js');
    const { queryLocalKnowledgeBase } = require('./scripts/lib/rag/local_rag_search.js');
    const [chassisDir, masterPath, decisionsPath, quarantinePath, depIndexPath, ruleId] = process.argv.slice(1);
    const reloaded = loadActiveKnowledgeRules('DL380_Gen12', chassisDir, {
      registryPaths: [masterPath],
      decisionPaths: [decisionsPath],
      quarantinePaths: [quarantinePath],
      dependencyIndexPath: depIndexPath
    });
    assert.equal(reloaded.allRules.some(r => r.ruleId === ruleId), false);
    assert.equal(reloaded.physicalRules.some(r => r.ruleId === ruleId), false);
    assert.equal(reloaded.skuLookupMap.has('P73282-B21'), false);
    assert.ok(reloaded.excludedRevokedRuleIds.includes(ruleId));

    const ragRes = queryLocalKnowledgeBase('P73282-B21 fan kit', 'DL380_Gen12', {
      registryPath: masterPath,
      outputsDir: chassisDir,
      dependencyIndexPath: depIndexPath,
      targetDependencyNodeId: 'ART-FAN-1'
    });
    assert.equal(ragRes.answer.includes('P48820-B21'), false);
    assert.equal(ragRes.dependencyStatus.status, 'STALE_INVALIDATED');
    assert.equal(ragRes.dependencyStatus.canGrantAcceptance, false);
    assert.equal(ragRes.isStale, true);
  `;
  const run2 = spawnSync(
    process.execPath,
    ['-e', childScript2, chassisDir, masterPath, decisionsPath, quarantinePath, depIndexPath, ruleId],
    { cwd: REPO_ROOT, encoding: 'utf8' }
  );
  assert.equal(run2.status, 0, `Fresh child #2 failed: ${run2.stderr}`);

  // Also verify supersedeKnowledgeDelta works with dependencyIndexPath
  const supRes = supersedeKnowledgeDelta(ruleId, 'DELTA-SI08-FAN-002', 'Replaced by v2 rule', {
    masterRegistryPath: masterPath,
    globalDeltasPath: globalPath,
    chassisDir,
    filePath: quarantinePath,
    dependencyIndexPath: depIndexPath
  });
  assert.equal(supRes.superseded, true);
  assert.equal(supRes.retracted, true);
});

test('SI-08 [2/8]: Requirement, source, and rule invalidation mark downstream stale, preserve receipts, and isolate unrelated products', async (t) => {
  const tmpDir = makeTempSandbox(t, 'si08-inval-');
  const receiptPathA = path.join(tmpDir, 'receipt_dl380_v1.json');
  const receiptPathB = path.join(tmpDir, 'auth_dl380_v1.json');
  const receiptOther = path.join(tmpDir, 'auth_dl360_v1.json');
  const originalReceiptA = JSON.stringify({ receiptId: 'REC-A', totalUsd: 12000, capturedAt: '2026-11-18T00:00:00Z' });
  const originalReceiptB = JSON.stringify({ authId: 'AUTH-B', fingerprint: 'abc123' });
  fs.writeFileSync(receiptPathA, originalReceiptA, 'utf8');
  fs.writeFileSync(receiptPathB, originalReceiptB, 'utf8');
  fs.writeFileSync(receiptOther, JSON.stringify({ authId: 'AUTH-360' }), 'utf8');

  assert.equal(SCHEMA_VERSION, '1.0');
  assert.ok(NODE_KINDS.includes('AUTHORIZATION') && NODE_KINDS.includes('REQUIREMENT'));
  assert.ok(DEFAULT_DEPENDENCY_INDEX_PATH.endsWith(path.join('outputs', 'history', 'evidence_dependency_index.json')));

  const index = createDependencyIndex();
  registerDependencyNode(index, { id: 'REQ-1', kind: 'REQUIREMENT', product: 'DL380_Gen12', revision: 'r1' });
  registerDependencyNode(index, { id: 'SRC-1', kind: 'SOURCE', product: 'DL380_Gen12', revision: 's1' });
  registerDependencyNode(index, { id: 'FACT-1', kind: 'FACT', product: 'DL380_Gen12', revision: 'f1' });
  registerDependencyNode(index, { id: 'CLAIM-1', kind: 'CLAIM', product: 'DL380_Gen12', revision: 'c1' });
  registerDependencyNode(index, { id: 'CAND-1', kind: 'CANDIDATE', product: 'DL380_Gen12', revision: 'cand1' });
  registerDependencyNode(index, { id: 'REV-1', kind: 'REVIEW', product: 'DL380_Gen12', revision: 'rev1' });
  registerDependencyNode(index, { id: 'ART-1', kind: 'ARTIFACT', product: 'DL380_Gen12', revision: 'a1', immutableReceiptPath: receiptPathA });
  registerDependencyNode(index, { id: 'AUTH-1', kind: 'AUTHORIZATION', product: 'DL380_Gen12', revision: 'au1', immutableReceiptPath: receiptPathB });

  addDependencyEdge(index, 'REQ-1', 'CLAIM-1', 'GOVERNS');
  addDependencyEdge(index, 'SRC-1', 'FACT-1', 'DERIVES');
  addDependencyEdge(index, 'FACT-1', 'CLAIM-1', 'SUPPORTS');
  addDependencyEdge(index, 'CLAIM-1', 'CAND-1', 'SUPPORTS');
  addDependencyEdge(index, 'CAND-1', 'REV-1', 'VALIDATES');
  addDependencyEdge(index, 'REV-1', 'ART-1', 'PROJECTS');
  addDependencyEdge(index, 'ART-1', 'AUTH-1', 'AUTHORIZES');

  // Unrelated product chain must remain untouched & VALID
  registerDependencyNode(index, { id: 'REQ-360', kind: 'REQUIREMENT', product: 'DL360_Gen12', revision: 'r1' });
  registerDependencyNode(index, { id: 'CLAIM-360', kind: 'CLAIM', product: 'DL360_Gen12', revision: 'c1' });
  registerDependencyNode(index, { id: 'AUTH-360', kind: 'AUTHORIZATION', product: 'DL360_Gen12', revision: 'au1', immutableReceiptPath: receiptOther });
  addDependencyEdge(index, 'REQ-360', 'CLAIM-360', 'GOVERNS');
  addDependencyEdge(index, 'CLAIM-360', 'AUTH-360', 'AUTHORIZES');

  assert.equal(evaluateInvalidationBoundary(index, 'AUTH-1').canGrantAcceptance, true);
  assert.equal(evaluateInvalidationBoundary(index, 'AUTH-360').canGrantAcceptance, true);

  // Unknown node / missing index boundary fails closed
  assert.equal(evaluateInvalidationBoundary(null, 'AUTH-1').status, 'UNKNOWN');
  assert.equal(evaluateInvalidationBoundary(index, 'MISSING-NODE').canGrantAcceptance, false);

  // External revision drift check detects mismatch immediately
  const driftBoundary = evaluateInvalidationBoundary(index, 'AUTH-1', { 'REQ-1': 'r2' });
  assert.equal(driftBoundary.status, 'STALE_INVALIDATED');
  assert.equal(driftBoundary.canGrantAcceptance, false);
  assert.equal(driftBoundary.reason, 'REVISION_DRIFT_DETECTED');

  // Mutate via requirement change
  const reqInv = invalidateByRequirementChange(index, 'REQ-1', 'r2', 'Customer increased RAM to 512GB');
  assert.deepEqual(reqInv.affectedNodeIds.sort(), ['ART-1', 'AUTH-1', 'CAND-1', 'CLAIM-1', 'REV-1']);
  for (const id of ['CLAIM-1', 'CAND-1', 'REV-1', 'ART-1', 'AUTH-1']) {
    assert.equal(index.nodes[id].status, 'STALE_INVALIDATED');
  }
  assert.equal(index.reevaluationQueue.length, 5);
  assert.ok(index.reevaluationQueue.every(q => q.status === 'PENDING_REEVALUATION' && q.triggerType === 'REQUIREMENT_CHANGE'));
  assert.ok(index.preservedReceipts.some(r => r.immutableReceiptPath === receiptPathA));
  assert.ok(index.preservedReceipts.some(r => r.immutableReceiptPath === receiptPathB));

  // Immutable receipt files on disk were NOT overwritten or deleted
  assert.equal(fs.readFileSync(receiptPathA, 'utf8'), originalReceiptA);
  assert.equal(fs.readFileSync(receiptPathB, 'utf8'), originalReceiptB);

  // Unrelated product remains VALID
  const otherBoundary = evaluateInvalidationBoundary(index, 'AUTH-360');
  assert.equal(otherBoundary.status, 'VALID');
  assert.equal(otherBoundary.canGrantAcceptance, true);

  // Source revision change on a separate chain + local_rag_search.js async/sync stale surfacing
  registerDependencyNode(index, { id: 'SRC-QS', kind: 'SOURCE', product: 'DL380_Gen12', revision: 'qs-v1' });
  registerDependencyNode(index, { id: 'CLAIM-QS', kind: 'CLAIM', product: 'DL380_Gen12', revision: '1' });
  addDependencyEdge(index, 'SRC-QS', 'CLAIM-QS', 'SUPPORTS');
  invalidateBySourceChange(index, 'SRC-QS', 'qs-v2', 'QuickSpecs updated PSU matrix');
  assert.equal(index.nodes['CLAIM-QS'].status, 'STALE_INVALIDATED');

  const asyncRag = await queryLocalKnowledgeBaseAsync('PSU matrix', 'DL380_Gen12', '', {
    offline: true,
    outputsDir: tmpDir,
    dependencyIndex: index,
    targetDependencyNodeId: 'CLAIM-QS'
  });
  assert.equal(asyncRag.dependencyStatus.status, 'STALE_INVALIDATED');
  assert.equal(asyncRag.isStale, true);

  // Re-evaluate CLAIM-QS after SOURCE_CHANGE -> VALID
  const reeval = recordReevaluationOutcome(index, { affectedNodeId: 'CLAIM-QS', status: 'VALID', reason: 'Recomputed against qs-v2' });
  assert.equal(reeval.updated, true);
  assert.equal(evaluateInvalidationBoundary(index, 'CLAIM-QS').canGrantAcceptance, true);

  // Retracted rule cannot be restored by child reevaluation
  registerDependencyNode(index, { id: 'RULE-BAD', kind: 'RULE', product: 'DL380_Gen12', revision: '1' });
  registerDependencyNode(index, { id: 'CLAIM-BAD', kind: 'CLAIM', product: 'DL380_Gen12', revision: '1' });
  addDependencyEdge(index, 'RULE-BAD', 'CLAIM-BAD', 'SUPPORTS');
  invalidateByRetractedRule(index, 'RULE-BAD', 'Rule retracted');
  recordReevaluationOutcome(index, { affectedNodeId: 'CLAIM-BAD', status: 'VALID' });
  assert.equal(index.nodes['RULE-BAD'].status, 'RETRACTED');
  assert.equal(evaluateInvalidationBoundary(index, 'CLAIM-BAD').canGrantAcceptance, false);
});

test('SI-08: failed or unknown reevaluations stay blocked after successful sibling reevaluation', () => {
  for (const failedStatus of ['FAILED', 'UNKNOWN']) {
    const index = createDependencyIndex();
    for (const [id, kind] of [['SOURCE', 'SOURCE'], ['FAILED', 'AUTHORIZATION'], ['SIBLING', 'AUTHORIZATION']]) {
      registerDependencyNode(index, { id, kind, revision: 'v1' });
    }
    addDependencyEdge(index, 'SOURCE', 'FAILED');
    addDependencyEdge(index, 'SOURCE', 'SIBLING');
    invalidateBySourceChange(index, 'SOURCE', 'v2');
    recordReevaluationOutcome(index, { nodeId: 'FAILED', status: failedStatus });
    recordReevaluationOutcome(index, { nodeId: 'SIBLING', status: 'VALID' });
    assert.equal(index.nodes.SOURCE.status, 'VALID');
    assert.equal(evaluateInvalidationBoundary(index, 'SIBLING').canGrantAcceptance, true);
    assert.equal(index.nodes.FAILED.status, failedStatus);
    assert.equal(evaluateInvalidationBoundary(index, 'FAILED').canGrantAcceptance, false);
    registerDependencyNode(index, { id: 'DOWNSTREAM', kind: 'ARTIFACT' });
    addDependencyEdge(index, 'FAILED', 'DOWNSTREAM');
    assert.equal(evaluateInvalidationBoundary(index, 'DOWNSTREAM').canGrantAcceptance, false);
    recordReevaluationOutcome(index, { nodeId: 'FAILED', status: 'VALID' });
    assert.equal(evaluateInvalidationBoundary(index, 'DOWNSTREAM').canGrantAcceptance, true);
  }
  const dangling = createDependencyIndex();
  registerDependencyNode(dangling, { id: 'AUTH', kind: 'AUTHORIZATION' });
  addDependencyEdge(dangling, 'MISSING-SOURCE', 'AUTH');
  assert.equal(evaluateInvalidationBoundary(dangling, 'AUTH').canGrantAcceptance, false);
  recordReevaluationOutcome(dangling, { nodeId: 'AUTH' });
  assert.equal(dangling.nodes.AUTH.status, 'UNKNOWN');
  assert.equal(evaluateInvalidationBoundary(dangling, 'AUTH').canGrantAcceptance, false);
});

test('late or repeated reevaluation results cannot replace a newer dependency revision', () => {
  const index = createDependencyIndex();
  registerDependencyNode(index, { id: 'source', kind: 'SOURCE', revision: 'v1' });
  registerDependencyNode(index, { id: 'artifact', kind: 'ARTIFACT' });
  addDependencyEdge(index, 'source', 'artifact');
  const [old] = invalidateBySourceChange(index, 'source', 'v2').queuedItems;
  const [current] = invalidateBySourceChange(index, 'source', 'v3').queuedItems;
  assert.equal(recordReevaluationOutcome(index, { queueId: old.queueId, status: 'VALID' }).updated, false);
  assert.equal(evaluateInvalidationBoundary(index, 'artifact').canGrantAcceptance, false);
  assert.equal(recordReevaluationOutcome(index, { queueId: current.queueId, status: 'VALID' }).updated, true);
  assert.equal(recordReevaluationOutcome(index, { queueId: current.queueId, status: 'FAILED' }).updated, false);
  assert.equal(evaluateInvalidationBoundary(index, 'artifact').canGrantAcceptance, true);
});

test('queued reevaluation keeps an artifact blocked until each current trigger is resolved', () => {
  const index = createDependencyIndex();
  registerDependencyNode(index, { id: 'artifact', kind: 'ARTIFACT' });
  for (const id of ['a', 'b']) {
    registerDependencyNode(index, { id, kind: 'SOURCE', revision: 'v1' });
    addDependencyEdge(index, id, 'artifact');
  }
  const [first] = invalidateBySourceChange(index, 'a', 'v2').queuedItems;
  const [second] = invalidateBySourceChange(index, 'b', 'v2').queuedItems;
  assert.equal(recordReevaluationOutcome(index, { queueId: first.queueId, status: 'VALID' }).status, 'STALE_INVALIDATED');
  assert.equal(evaluateInvalidationBoundary(index, 'artifact').canGrantAcceptance, false);
  assert.equal(recordReevaluationOutcome(index, { queueId: second.queueId, status: 'VALID' }).status, 'VALID');
  assert.equal(evaluateInvalidationBoundary(index, 'artifact').canGrantAcceptance, true);
});

test('SI-08 [3/8]: Fresh process restart reloads persisted dependency index accurately', (t) => {
  const tmpDir = makeTempSandbox(t, 'si08-restart-');
  const depPath = path.join(tmpDir, 'evidence_dependency_index.json');

  const index = createDependencyIndex();
  registerDependencyNode(index, { id: 'SRC-1', kind: 'SOURCE', product: 'DL380_Gen12', revision: 'v1' });
  registerDependencyNode(index, { id: 'AUTH-1', kind: 'AUTHORIZATION', product: 'DL380_Gen12', revision: 'a1' });
  addDependencyEdge(index, 'SRC-1', 'AUTH-1', 'SUPPORTS');
  registerDependencyNode(index, { id: 'SRC-2', kind: 'SOURCE', product: 'Alletra_Storage_System', revision: 'v1' });
  registerDependencyNode(index, { id: 'AUTH-2', kind: 'AUTHORIZATION', product: 'Alletra_Storage_System', revision: 'a1' });
  addDependencyEdge(index, 'SRC-2', 'AUTH-2', 'SUPPORTS');

  invalidateBySourceChange(index, 'SRC-1', 'v2', 'Catalog refresh updated revision');
  const saved = saveDependencyIndexAtomic(depPath, index);
  const expectedSha = saved.index.indexRevisionSha256;

  const restartScript = `
    const assert = require('node:assert/strict');
    const { loadDependencyIndex, evaluateInvalidationBoundary } = require('./scripts/lib/boq/evidence/dependency_index.js');
    const [depPath, expectedSha] = process.argv.slice(1);
    const loaded = loadDependencyIndex(depPath);
    assert.equal(loaded.indexRevisionSha256, expectedSha);
    assert.equal(loaded.nodes['AUTH-1'].status, 'STALE_INVALIDATED');
    assert.equal(loaded.nodes['AUTH-2'].status, 'VALID');
    assert.equal(loaded.reevaluationQueue.length, 1);
    assert.equal(evaluateInvalidationBoundary(loaded, 'AUTH-1').canGrantAcceptance, false);
    assert.equal(evaluateInvalidationBoundary(loaded, 'AUTH-2').canGrantAcceptance, true);
  `;
  const run = spawnSync(process.execPath, ['-e', restartScript, depPath, expectedSha], {
    cwd: REPO_ROOT,
    encoding: 'utf8'
  });
  assert.equal(run.status, 0, `Restart child failed: ${run.stderr}`);
});

test('SI-08 [4/8]: Cyclic evidence (A -> B -> C -> A and self-loop) is rejected and cannot grant authority', () => {
  const index = createDependencyIndex();
  registerDependencyNode(index, { id: 'A', kind: 'CLAIM', product: 'DL380_Gen12', revision: '1' });
  registerDependencyNode(index, { id: 'B', kind: 'REVIEW', product: 'DL380_Gen12', revision: '1' });
  registerDependencyNode(index, { id: 'C', kind: 'AUTHORIZATION', product: 'DL380_Gen12', revision: '1' });

  assert.equal(addDependencyEdge(index, 'A', 'B', 'SUPPORTS').accepted, true);
  assert.equal(addDependencyEdge(index, 'B', 'C', 'SUPPORTS').accepted, true);

  const cycleCheck = detectDependencyCycle(index, 'C', 'A');
  assert.equal(cycleCheck.hasCycle, true);
  assert.ok(cycleCheck.cyclePath.includes('A') && cycleCheck.cyclePath.includes('B') && cycleCheck.cyclePath.includes('C'));

  const edgeRes = addDependencyEdge(index, 'C', 'A', 'SUPPORTS');
  assert.equal(edgeRes.accepted, false);
  assert.equal(edgeRes.cyclicEvidenceRejected, true);
  assert.equal(index.edges.some(e => e.fromId === 'C' && e.toId === 'A'), false);

  const selfRes = addDependencyEdge(index, 'A', 'A', 'SUPPORTS');
  assert.equal(selfRes.accepted, false);
  assert.equal(selfRes.cyclicEvidenceRejected, true);

  // Even if cyclic edges were injected directly into raw JSON, boundary evaluation rejects authority
  const corrupted = createDependencyIndex({
    nodes: index.nodes,
    edges: [
      { fromId: 'A', toId: 'B', relation: 'SUPPORTS' },
      { fromId: 'B', toId: 'C', relation: 'SUPPORTS' },
      { fromId: 'C', toId: 'A', relation: 'SUPPORTS' }
    ]
  });
  const boundary = evaluateInvalidationBoundary(corrupted, 'C');
  assert.equal(boundary.canGrantAcceptance, false);
  assert.equal(boundary.cyclicEvidenceRejected, true);
  assert.equal(boundary.status, 'STALE_INVALIDATED');
});

test('SI-08 [5/8]: Operational incidents, user preferences, workflow incidents, and agent explanations are segregated', (t) => {
  const tmpDir = makeTempSandbox(t, 'si08-segregate-');
  const regPath = path.join(tmpDir, 'master.json');

  const rawDeltas = [
    { deltaId: 'OP-1', ruleType: 'OPERATIONAL_INCIDENT', chassis: 'DL380_Gen12', affectedSku: 'NONE', rawMessage: 'ETIMEDOUT port 9222', status: 'ACTIVE' },
    { deltaId: 'WF-INC-1', errorType: 'WORKFLOW_INCIDENT', chassis: 'DL380_Gen12', rawMessage: 'DOM button moved', status: 'ACTIVE' },
    { deltaId: 'PREF-1', ruleType: 'USER_PREFERENCE', chassis: 'DL380_Gen12', rawMessage: 'User prefers 8SFF', status: 'ACTIVE' },
    { deltaId: 'PREF-2', governanceStatus: 'LOCAL_USER_PREFERENCE', chassis: 'DL380_Gen12', rawMessage: 'Query bound platform choice', status: 'ACTIVE' },
    { deltaId: 'AGENT-1', sourceType: 'AGENT_SELF_EXPLANATION', chassis: 'DL380_Gen12', affectedSku: 'P73282-B21', rawMessage: 'Agent claims configuration valid', status: 'ACTIVE' },
    { deltaId: 'AGENT-2', evidenceType: 'AGENT_EXPLANATION', chassis: 'DL380_Gen12', affectedSku: 'P73282-B21', rawMessage: 'Self explanation prose', status: 'ACTIVE' },
    { deltaId: 'AGENT-3', origin: 'AGENT_GENERATED_EXPLANATION', chassis: 'DL380_Gen12', affectedSku: 'P73282-B21', rawMessage: 'Model rationale', status: 'ACTIVE' },
    { deltaId: 'WF-REV-1', ruleType: 'WORKFLOW_NLM_SYNC_RESILIENCE_ADVISORY', evidenceType: 'WORKFLOW_REVIEW', chassis: 'DL380_Gen12', rawMessage: 'Workflow sync advisory', status: 'ACTIVE' },
    { deltaId: 'PHYS-1', ruleType: 'PERMANENT_PHYSICAL_DEPENDENCY', chassis: 'DL380_Gen12', affectedSku: 'P73282-B21', requiredDependencySku: 'P48820-B21', rawMessage: 'Requires mandatory fan kit P48820-B21', status: 'ACTIVE' }
  ];

  const loaded = loadActiveKnowledgeRules('DL380_Gen12', '', { rawDeltas });
  assert.equal(loaded.segregatedEntries.length, 7);
  const segIds = loaded.segregatedEntries.map(e => e.ruleId);
  for (const id of ['OP-1', 'WF-INC-1', 'PREF-1', 'PREF-2', 'AGENT-1', 'AGENT-2', 'AGENT-3']) {
    assert.ok(segIds.includes(id), `Expected ${id} in segregatedEntries`);
    assert.equal(loaded.allRules.some(r => r.ruleId === id), false);
    assert.equal(loaded.physicalRules.some(r => r.ruleId === id), false);
    assert.equal(loaded.mandatoryDependencies.some(r => r.ruleId === id), false);
    assert.equal(loaded.substitutions.some(r => r.ruleId === id), false);
    assert.equal(loaded.generationalModernizations.some(r => r.ruleId === id), false);
  }
  // WORKFLOW_REVIEW stays out of physicalRules / mandatoryDependencies while preserving workflowAdvisories
  assert.equal(loaded.physicalRules.map(r => r.ruleId).join(','), 'PHYS-1');
  assert.equal(loaded.mandatoryDependencies.map(r => r.ruleId).join(','), 'PHYS-1');
  assert.equal(loaded.workflowAdvisories.map(r => r.ruleId).join(','), 'WF-REV-1');

  // local_rag_search also excludes operational/preference/agent-explanation/workflow/revoked records
  safeWriteJsonAtomic(regPath, { universalRules: [], familyGenRules: [], chassisSpecificRules: rawDeltas });
  const ragRes = queryLocalKnowledgeBase('fan kit P73282-B21 configuration', 'DL380_Gen12', {
    registryPath: regPath,
    outputsDir: tmpDir
  });
  assert.ok(ragRes.answer.includes('P48820-B21'));
  assert.equal(ragRes.answer.includes('ETIMEDOUT'), false);
  assert.equal(ragRes.answer.includes('Agent claims'), false);
  assert.equal(ragRes.answer.includes('User prefers'), false);
  assert.equal(ragRes.answer.includes('Workflow sync advisory'), false);
});

test('SI-08 [6/8]: recordRuleConsumption distinguishes retrieved vs applied, handles zero-new-lessons, and keeps cloudSyncStatus separate', () => {
  const loaded = loadActiveKnowledgeRules('DL380_Gen12', '', {
    rawDeltas: [
      { deltaId: 'RULE-A', chassis: 'DL380_Gen12', affectedSku: 'P73282-B21', requiredDependencySku: 'P48820-B21', ruleType: 'PERMANENT_PHYSICAL_DEPENDENCY', rawMessage: 'Requires mandatory fan kit', status: 'ACTIVE' },
      { deltaId: 'RULE-B', chassis: 'DL380_Gen12', affectedSku: 'P73299-B21', requiredDependencySku: 'P74794-B21', ruleType: 'PERMANENT_PHYSICAL_DEPENDENCY', rawMessage: 'Requires high perf heatsink', status: 'ACTIVE' }
    ]
  });
  const consumption = recordRuleConsumption(
    loaded,
    [{ ruleId: 'RULE-A', sku: 'P73282-B21', action: 'INJECT_KIT', effect: 'ADDED_P48820-B21', reason: '280W CPU fan kit mandate' }],
    {
      repeatedIncidentStats: { incidentType: 'THERMAL_FAN_DEFICIT', repeatCount: 2, recovered: true },
      cloudSyncStatus: 'DEGRADED_OFFLINE'
    }
  );
  assert.equal(consumption.valid, true);
  assert.deepEqual(consumption.retrievedRuleIds, ['RULE-A', 'RULE-B']);
  assert.deepEqual(consumption.appliedRuleIds, ['RULE-A']);
  assert.deepEqual(consumption.unappliedRuleIds, ['RULE-B']);
  assert.equal(consumption.appliedEffects[0].effect, 'ADDED_P48820-B21');
  assert.equal(consumption.isZeroNewLessonsRun, false);
  assert.equal(consumption.repeatedIncidentStats.recovered, true);
  assert.equal(consumption.cloudSyncStatus, 'DEGRADED_OFFLINE');

  const emptyLoaded = loadActiveKnowledgeRules('DL380_Gen12', '', { rawDeltas: [] });
  const zeroRun = recordRuleConsumption(emptyLoaded, []);
  assert.equal(zeroRun.valid, true);
  assert.equal(zeroRun.isZeroNewLessonsRun, true);
  assert.deepEqual(zeroRun.retrievedRuleIds, []);
  assert.deepEqual(zeroRun.appliedRuleIds, []);
  assert.equal(zeroRun.cloudSyncStatus, 'SEPARATE_FROM_LOCAL_CONSUMPTION');
});

test('SI-08 [7/8]: Simulated atomic-write failure leaves prior dependency index file untouched on disk', (t) => {
  const tmpDir = makeTempSandbox(t, 'si08-atomic-fail-');
  const depPath = path.join(tmpDir, 'evidence_dependency_index.json');

  const initial = createDependencyIndex();
  registerDependencyNode(initial, { id: 'REQ-INIT', kind: 'REQUIREMENT', product: 'DL380_Gen12', revision: 'v1' });
  registerDependencyNode(initial, { id: 'AUTH-INIT', kind: 'AUTHORIZATION', product: 'DL380_Gen12', revision: 'a1' });
  addDependencyEdge(initial, 'REQ-INIT', 'AUTH-INIT', 'GOVERNS');
  saveDependencyIndexAtomic(depPath, initial);
  const bytesBefore = fs.readFileSync(depPath, 'utf8');

  const mutated = loadDependencyIndex(depPath);
  invalidateByRequirementChange(mutated, 'REQ-INIT', 'v2', 'Simulated pending mutation');

  assert.throws(() => {
    saveDependencyIndexAtomic(depPath, mutated, () => {
      throw Object.assign(new Error('EPERM: simulated atomic rename lock failure'), { code: 'EPERM' });
    });
  }, /EPERM/);

  assert.equal(fs.readFileSync(depPath, 'utf8'), bytesBefore);
  const reloaded = loadDependencyIndex(depPath);
  assert.equal(reloaded.nodes['AUTH-INIT'].status, 'VALID');
  assert.equal(reloaded.reevaluationQueue.length, 0);
});

test('SI-08 [8/8]: preservePrimaryErrorOnReflectionFailure preserves original error even when sync or async reflection throws', async () => {
  const primaryErr = new Error('EVAL_CRITICAL_POWER_DEFICIT: 2200W load exceeds 1600W PSU capacity');

  const syncOutcome = preservePrimaryErrorOnReflectionFailure(primaryErr, () => {
    throw new Error('Reflection ledger write EIO');
  });
  assert.equal(syncOutcome.primaryError, primaryErr);
  assert.equal(syncOutcome.primaryError.message, 'EVAL_CRITICAL_POWER_DEFICIT: 2200W load exceeds 1600W PSU capacity');
  assert.equal(syncOutcome.reflectionFailed, true);
  assert.match(syncOutcome.reflectionError.message, /Reflection ledger write EIO/);

  const asyncOutcome = await preservePrimaryErrorOnReflectionFailure(primaryErr, async () => {
    throw new Error('Async NLM reflection unavailable');
  });
  assert.equal(asyncOutcome.primaryError, primaryErr);
  assert.equal(asyncOutcome.reflectionFailed, true);
  assert.match(asyncOutcome.reflectionError.message, /Async NLM reflection unavailable/);

  const okOutcome = preservePrimaryErrorOnReflectionFailure(primaryErr, () => ({ learnedCount: 0 }));
  assert.equal(okOutcome.primaryError, primaryErr);
  assert.equal(okOutcome.reflectionFailed, false);
  assert.equal(okOutcome.reflectionError, null);
  assert.deepEqual(okOutcome.reflectionResult, { learnedCount: 0 });
});
