'use strict';
/**
 * tests/unit/test_m5_packaging_and_hygiene.js
 *
 * Verification suite for Milestone M5 (Compatible packaging and learning hygiene):
 * 1. Master barrel scripts/lib/index.js exports canonical verifiers; retired duplicate aliases stay removed.
 * 2. feedback_persister.js quarantines corrupted history per INV-131 and Finding F13.
 * 3. deal_optimizer.js respects unknowns when no evidence exists and extracts workload DNA.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

test('M5: master barrel exports canonical verifier modules without duplicate aliases', () => {
  const lib = require('../../scripts/lib/index.js');

  assert.ok(lib.boq.bomVerifier, 'Must export boq.bomVerifier');
  assert.ok(lib.boq.vendorBomVerifier, 'Must export boq.vendorBomVerifier');
  assert.strictEqual(lib.boq.acceptanceGate, undefined, 'Retired alias acceptance_gate must not reappear');
  assert.strictEqual(lib.boq.vendorQuoteReconciler, undefined, 'Retired alias vendor_quote_reconciler must not reappear');
});

test('M5: feedback_persister.js quarantines corrupted history on parse failure', () => {
  const { savePreprocessingRuleFeedback } = require('../../scripts/lib/preprocessor/feedback_persister.js');
  const tmpDir = path.join(os.tmpdir(), `test_m5_quarantine_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
  const historyDir = path.join(tmpDir, 'history');
  fs.mkdirSync(historyDir, { recursive: true });

  const historyFile = path.join(historyDir, 'preprocessing_rules_history.json');
  const corruptPayload = 'CORRUPTED_JSON_CONTENT_{not_json';
  fs.writeFileSync(historyFile, corruptPayload, 'utf-8');

  try {
    const record = savePreprocessingRuleFeedback({
      configId: 'CFG-TEST-QUARANTINE',
      splitReason: 'Testing quarantine of corrupt history',
      notes: 'Should create quarantine file and start clean history'
    }, tmpDir);

    assert.ok(record, 'Record should be created');
    assert.strictEqual(record.configId, 'CFG-TEST-QUARANTINE');

    // Verify a quarantine file exists in history directory
    const files = fs.readdirSync(historyDir);
    const quarantineFiles = files.filter(f => f.startsWith('preprocessing_rules_history.corrupt.') && f.endsWith('.json'));
    assert.ok(quarantineFiles.length >= 1, 'Corrupted history file must be quarantined with corrupt prefix');

    const quarantinedContent = fs.readFileSync(path.join(historyDir, quarantineFiles[0]), 'utf-8');
    assert.strictEqual(quarantinedContent, corruptPayload, 'Quarantined file must retain exact corrupted payload');

    // Verify clean history was created with the new record
    const newHistory = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
    assert.strictEqual(newHistory.length, 1);
    assert.strictEqual(newHistory[0].configId, 'CFG-TEST-QUARANTINE');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('M5: deal_optimizer.js classifies profile as UNKNOWN when no evidence exists and extracts DNA when items are present', () => {
  const { classifyWorkloadProfile, analyzeDealValueEngineering } = require('../../scripts/lib/boq/deal_optimizer.js');

  // No telemetry or items -> UNKNOWN
  const emptyProfile = classifyWorkloadProfile([], {});
  assert.strictEqual(emptyProfile.profile, 'UNKNOWN');
  assert.strictEqual(emptyProfile.isUnknown, true);
  assert.strictEqual(emptyProfile.cpuCount, 0);

  // Items with CPU description -> DNA extracted and used
  const items = [
    { sku: 'P67096-B21', description: 'Intel Xeon Gold 6530 2.1GHz 32-core 185W Processor', quantity: 2, unitListPrice: 2200 },
    { sku: 'P73300-B21', description: 'HPE 64GB 2Rx4 DDR5-5600 RDIMM', quantity: 16, unitListPrice: 350 }
  ];

  const profiledFromItems = classifyWorkloadProfile(items, {});
  assert.ok(profiledFromItems.workloadDna, 'Must contain extracted workload DNA');
  assert.strictEqual(profiledFromItems.workloadDna.totalCores, 64, 'Must compute total cores from 2x 32-core CPUs');
  assert.strictEqual(profiledFromItems.workloadDna.totalMemoryGb, 1024, 'Must compute total memory from 16x 64GB');

  const report = analyzeDealValueEngineering(items, {}, null, null);
  assert.strictEqual(report.hasQuotedPricing, true, 'Must identify quoted pricing present');
  assert.ok(report.workloadDna, 'Report must include workload DNA');
});
