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
    confidenceScore: 0.95,
    source: 'QuickSpecs'
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
    confidenceScore: 0.70,
    source: 'QuickSpecs'
  });
  assert.strictEqual(lowConf.status, 'QUARANTINED');
  assert.strictEqual(lowConf.valid, true);
  assert.ok(lowConf.reasons[0].includes('below automatic promotion threshold'));

  // If human approved, it is promoted despite lower confidence
  const humanApproved = validateKnowledgeDelta({
    affectedSku: 'P73299-B21',
    requiredDependencySku: 'P48820-B21',
    rawMessage: 'Presales verified fan requirement',
    confidenceScore: 0.70
  }, { isHumanApproved: true });
  assert.strictEqual(humanApproved.status, 'PROMOTED');
});

test('Quarantine Engine — Gate 4: Scope taxonomy normalization', () => {
  const delta = validateKnowledgeDelta({
    affectedSku: 'P73299-B21',
    scopeTaxonomy: 'UNIVERSAL',
    confidenceScore: 0.90,
    source: 'QuickSpecs'
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
    confidenceScore: 0.75
  };

  saveQuarantinedDelta(testDelta, ['Low confidence test']);
  const inQuarantine = getQuarantinedDeltas();
  assert.ok(inQuarantine.some(d => d.deltaId === 'TEST-Q-001'));

  // Promote with skipActivation so test items don't leak into production catalogs
  const promoted = promoteQuarantinedDelta('TEST-Q-001', 'TEST_LEAD', { skipActivation: true });
  assert.ok(promoted);
  assert.strictEqual(promoted.status, 'PROMOTED');
  assert.strictEqual(promoted.promotedBy, 'TEST_LEAD');

  // Should no longer be in active quarantine
  const afterPromote = getQuarantinedDeltas();
  assert.strictEqual(afterPromote.some(d => d.deltaId === 'TEST-Q-001'), false);

  // Clean up sandbox file and restore production path
  setQuarantineFilePath(null);
  if (fs.existsSync(testQuarantineFile)) {
    try { fs.unlinkSync(testQuarantineFile); } catch (_) {}
  }
  try { fs.rmdirSync(sandboxDir); } catch (_) {}
});
