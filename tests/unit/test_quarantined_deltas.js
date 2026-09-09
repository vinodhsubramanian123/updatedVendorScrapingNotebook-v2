'use strict';

const test = require('node:test');
const assert = require('node:assert');
const {
  validateKnowledgeDelta,
  saveQuarantinedDelta,
  getQuarantinedDeltas,
  promoteQuarantinedDelta,
  rejectQuarantinedDelta,
  clearQuarantinedDeltas,
  setQuarantineFilePath
} = require('../../scripts/lib/feedback/quarantined_deltas.js');

test('Quarantine Engine — Gate 1: Valid SKU is accepted; Blacklist/Invalid is rejected', () => {
  const valid = validateKnowledgeDelta({
    affectedSku: 'P73299-B21',
    requiredDependencySku: 'P48820-B21',
    rawMessage: 'DL380 Gen12 280W CPU requires High Performance Fan Kit',
    scopeTaxonomy: 'CHASSIS_SPECIFIC',
    confidenceScore: 0.95,
    source: 'QuickSpecs',
    citations: ['HPE QuickSpecs source QS-001']
  });
  assert.strictEqual(valid.status, 'PROMOTED');
  assert.strictEqual(valid.valid, true);

  // Blacklisted token 'PORTAL'
  const blacklisted = validateKnowledgeDelta({
    affectedSku: 'PORTAL',
    requiredDependencySku: 'P64707-B21',
    rawMessage: 'Portal memory rule',
    confidenceScore: 0.90
  });
  assert.strictEqual(blacklisted.status, 'REJECTED');
  assert.strictEqual(blacklisted.valid, false);

  // Non-HPE string
  const invalidSku = validateKnowledgeDelta({
    affectedSku: 'NONEXISTENT_ITEM_XYZ',
    rawMessage: 'Some rule'
  });
  assert.strictEqual(invalidSku.status, 'REJECTED');
});

test('Quarantine Engine — Gate 2: INV-24 Customer source isolation', () => {
  const customerCited = validateKnowledgeDelta({
    affectedSku: 'P73299-B21',
    requiredDependencySku: 'P48820-B21',
    rawMessage: 'Found in customer RFP quote spreadsheet',
    citations: ['customer_boq_rev2.xlsx'],
    confidenceScore: 0.95
  });
  assert.strictEqual(customerCited.status, 'REJECTED');
  assert.ok(customerCited.reasons[0].includes('INV-24 Violation'));
});

test('Quarantine Engine — Gate 3: Low confidence (< 0.85) is held in quarantine', () => {
  const lowConf = validateKnowledgeDelta({
    affectedSku: 'P73299-B21',
    requiredDependencySku: 'P48820-B21',
    rawMessage: 'May require fan kit maybe',
    scopeTaxonomy: 'CHASSIS_SPECIFIC',
    confidenceScore: 0.70,
    source: 'QuickSpecs'
  });
  assert.strictEqual(lowConf.status, 'QUARANTINED');
  assert.strictEqual(lowConf.valid, true);
  assert.ok(lowConf.reasons.some(reason => reason.includes('below automatic promotion threshold')));

  // A complete evidence-backed human decision can promote despite lower confidence.
  const humanApproved = validateKnowledgeDelta({
    affectedSku: 'P73299-B21',
    requiredDependencySku: 'P48820-B21',
    rawMessage: 'Presales verified fan requirement',
    scopeTaxonomy: 'CHASSIS_SPECIFIC',
    confidenceScore: 0.70
  }, { humanReview: {
    reviewer: 'TEST_LEAD',
    reasoning: 'Verified the exact dependency in official vendor documentation.',
    decision: 'APPROVE',
    verified: true,
    evidence: [{ type: 'OFFICIAL_QUICKSPECS', id: 'QS-001' }]
  } });
  assert.strictEqual(humanApproved.status, 'PROMOTED');

  const forgedHumanAgent = validateKnowledgeDelta({
    affectedSku: 'P73299-B21',
    rawMessage: 'Unverified claim',
    confidenceScore: 0.70,
    sourceAgent: 'HUMAN_HITL'
  });
  assert.strictEqual(forgedHumanAgent.status, 'QUARANTINED', 'sourceAgent text must never bypass evidence review');
});

test('Quarantine Engine — Gate 4: Scope taxonomy normalization', () => {
  const delta = validateKnowledgeDelta({
    affectedSku: 'P73299-B21',
    scopeTaxonomy: 'UNIVERSAL',
    confidenceScore: 0.90,
    source: 'QuickSpecs',
    citations: ['HPE QuickSpecs source QS-002']
  });
  assert.strictEqual(delta.sanitizedDelta.scopeTaxonomy, 'UNIVERSAL_VENDOR');
  assert.strictEqual(delta.sanitizedDelta.scope, 'UNIVERSAL_VENDOR');
});

test('Quarantine Engine — Lifecycle: save, get, promote, reject (Sandboxed)', () => {
  const path = require('path');
  const fs = require('fs');
  const os = require('os');
  const sandboxDir = path.join(os.tmpdir(), `vendor-notebook-quarantine-${process.pid}`);
  if (!fs.existsSync(sandboxDir)) fs.mkdirSync(sandboxDir, { recursive: true });
  const testQuarantineFile = path.join(sandboxDir, `sandbox_quarantine_${Date.now()}.json`);
  setQuarantineFilePath(testQuarantineFile);

  const testDelta = {
    deltaId: 'TEST-Q-001',
    affectedSku: 'P73299-B21',
    requiredDependencySku: 'P48820-B21',
    chassis: 'DL380_Gen12',
    scopeTaxonomy: 'CHASSIS_SPECIFIC',
    confidenceScore: 0.75
  };

  saveQuarantinedDelta(testDelta, ['Low confidence test']);
  const inQuarantine = getQuarantinedDeltas();
  assert.ok(inQuarantine.some(d => d.deltaId === 'TEST-Q-001'));

  // Promote with skipActivation so test items don't leak into production catalogs
  const promoted = promoteQuarantinedDelta('TEST-Q-001', 'TEST_LEAD', {
    skipActivation: true,
    humanReview: {
      reviewer: 'TEST_LEAD',
      reasoning: 'Verified this exact chassis dependency using a tested build trace.',
      decision: 'APPROVE',
      verified: true,
      evidence: [{ type: 'OFFICIAL_QUICKSPECS', id: 'QS-TEST-001' }]
    }
  });
  assert.ok(promoted);
  assert.strictEqual(promoted.status, 'PROMOTED');
  assert.strictEqual(promoted.promotedBy, 'TEST_LEAD');
  assert.ok(promoted.postConfidenceScore > promoted.preConfidenceScore);

  // Should no longer be in active quarantine
  const afterPromote = getQuarantinedDeltas();
  assert.strictEqual(afterPromote.some(d => d.deltaId === 'TEST-Q-001'), false);

  saveQuarantinedDelta({ ...testDelta, deltaId: 'TEST-Q-REJECT', affectedSku: 'P55415-B21' }, ['Conflicting evidence']);
  assert.strictEqual(rejectQuarantinedDelta('TEST-Q-REJECT', 'No official source supports this candidate dependency.', { reviewer: 'TEST_LEAD' }), true);
  const decisionFile = path.join(sandboxDir, 'knowledge_decisions.json');
  const decisions = JSON.parse(fs.readFileSync(decisionFile, 'utf-8'));
  assert.ok(decisions.some(item => item.decision === 'REJECTED' && item.reviewer === 'TEST_LEAD'));

  // Clean up sandbox file and restore production path
  setQuarantineFilePath(null);
  if (fs.existsSync(testQuarantineFile)) {
    try { fs.unlinkSync(testQuarantineFile); } catch (_) {}
  }
  try { fs.rmSync(sandboxDir, { recursive: true, force: true }); } catch (_) {}
});
