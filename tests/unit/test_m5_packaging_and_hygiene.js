'use strict';
/**
 * tests/unit/test_m5_packaging_and_hygiene.js
 *
 * Verification suite for Milestone M5 (Compatible packaging and learning hygiene):
 * 1. Semantic alias / direct-path shim acceptance_gate.js exports match bom_verifier.js.
 * 2. Semantic alias / direct-path shim vendor_quote_reconciler.js exports match vendor_bom_verifier.js.
 * 3. Master barrel scripts/lib/index.js exports semantic aliases alongside legacy names.
 * 4. feedback_persister.js quarantines corrupted history per INV-131 and Finding F13.
 * 5. deal_optimizer.js respects unknowns when no evidence exists and extracts workload DNA.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

test('M5: acceptance_gate.js exports match bom_verifier.js', () => {
  const bomVerifier = require('../../scripts/lib/boq/bom_verifier.js');
  const acceptanceGate = require('../../scripts/lib/boq/acceptance_gate.js');

  assert.strictEqual(typeof acceptanceGate.verifyPrePresentationAcceptance, 'function');
  assert.strictEqual(typeof acceptanceGate.validateUniversalCriteria, 'function');
  assert.strictEqual(typeof acceptanceGate.validateBoqEvaluationCriteria, 'function');
  assert.strictEqual(typeof acceptanceGate.validateRfpSizingCriteria, 'function');
  assert.strictEqual(typeof acceptanceGate.validateBomReconciliationCriteria, 'function');
  assert.strictEqual(typeof acceptanceGate.validateFreeformQaCriteria, 'function');

  assert.strictEqual(acceptanceGate.verifyPrePresentationAcceptance, bomVerifier.verifyPrePresentationAcceptance);
  assert.strictEqual(acceptanceGate.validateUniversalCriteria, bomVerifier.validateUniversalCriteria);
});

test('M5: vendor_quote_reconciler.js exports match vendor_bom_verifier.js and provides runCli', () => {
  const vendorBomVerifier = require('../../scripts/lib/boq/vendor_bom_verifier.js');
  const vendorQuoteReconciler = require('../../scripts/lib/boq/vendor_quote_reconciler.js');

  assert.strictEqual(typeof vendorQuoteReconciler.verifyVendorBOM, 'function');
  assert.strictEqual(typeof vendorQuoteReconciler.auditSingleVendorBOM, 'function');
  assert.strictEqual(typeof vendorQuoteReconciler.runCli, 'function');

  assert.strictEqual(vendorQuoteReconciler.verifyVendorBOM, vendorBomVerifier.verifyVendorBOM);
  assert.strictEqual(vendorQuoteReconciler.auditSingleVendorBOM, vendorBomVerifier.auditSingleVendorBOM);
  assert.strictEqual(vendorQuoteReconciler.runCli, vendorBomVerifier.runCli);
});

test('M5: scripts/lib/index.js exports semantic aliases alongside legacy names', () => {
  const lib = require('../../scripts/lib/index.js');

  assert.ok(lib.boq.bomVerifier, 'Must export legacy boq.bomVerifier');
  assert.ok(lib.boq.acceptanceGate, 'Must export semantic boq.acceptanceGate');
  assert.strictEqual(lib.boq.acceptanceGate.verifyPrePresentationAcceptance, lib.boq.bomVerifier.verifyPrePresentationAcceptance);

  assert.ok(lib.boq.vendorBomVerifier, 'Must export legacy boq.vendorBomVerifier');
  assert.ok(lib.boq.vendorQuoteReconciler, 'Must export semantic boq.vendorQuoteReconciler');
  assert.strictEqual(lib.boq.vendorQuoteReconciler.verifyVendorBOM, lib.boq.vendorBomVerifier.verifyVendorBOM);
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
