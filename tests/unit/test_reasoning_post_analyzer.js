'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const {
  determineEpistemicTier,
  performReasoningPostAnalysis
} = require('../../scripts/lib/system/reasoning_post_analyzer.js');

test('reasoning_post_analyzer: determines epistemic tiers accurately', () => {
  // Tier 0: Untrusted / raw intake
  const t0 = determineEpistemicTier({}, { intent: 'FREEFORM_QA' });
  assert.equal(t0.tier, 'TIER_0_UNTRUSTED_CLAIM');
  assert.equal(t0.vendorAcceptancePending, true);

  // Tier 1: Pre-flight physical sanity
  const t1 = determineEpistemicTier({ aspectChecksCompleted: true, errors: [] }, { intent: 'BOQ_EVALUATION' });
  assert.equal(t1.tier, 'TIER_1_PHYSICAL_SANITY');
  assert.equal(t1.vendorAcceptancePending, true);

  // Tier 2: Document / QuickSpecs grounding with citations
  const t2 = determineEpistemicTier({
    notebookLmStatus: { isCloudGrounded: true, citationsCount: 3 }
  }, { intent: 'BOQ_EVALUATION' });
  assert.equal(t2.tier, 'TIER_2_DOCUMENT_CITATION');
  assert.equal(t2.vendorAcceptancePending, true);

  // Tier 3: Live CLIC Acceptance Receipt
  const t3 = determineEpistemicTier({
    portalValidationStatus: 'ACCEPTED_BY_VENDOR'
  }, { intent: 'BOQ_EVALUATION' });
  assert.equal(t3.tier, 'TIER_3_OFFICIAL_VENDOR_ACCEPTANCE');
  assert.equal(t3.vendorAcceptancePending, false);
});

test('reasoning_post_analyzer: generates comprehensive analysis and attaches to responseData', () => {
  const responseData = {
    status: 'PASSED',
    chassis: 'DL380_Gen12',
    isMathClean: true,
    aspectChecksCompleted: true,
    diagnosticHints: [
      { deltaId: 'DELTA_DL380_FAN', referenceNotice: 'Mandatory fan kit required for 200W+ CPU' }
    ],
    acceptanceGate: {
      status: 'ACCEPTANCE_CERTIFIED',
      isValid: true,
      blockersCount: 0,
      warningsCount: 0
    }
  };

  const classification = {
    intent: 'FREEFORM_QA',
    confidence: 0.95,
    rationale: 'Customer hardware Q&A'
  };

  const analysis = performReasoningPostAnalysis({
    queryText: 'Does DL380 Gen12 support 350W CPUs?',
    context: { chassisName: 'DL380_Gen12', persistLedger: false },
    classification,
    responseData,
    traceId: 'TRC-TEST-REASONING-001',
    executionTimeMs: 120
  });

  assert.ok(analysis);
  assert.equal(analysis.traceId, 'TRC-TEST-REASONING-001');
  assert.equal(analysis.intent, 'FREEFORM_QA');
  assert.equal(analysis.confidence, 0.95);
  assert.equal(analysis.epistemicIntegrity.tier, 'TIER_1_PHYSICAL_SANITY');
  assert.equal(analysis.epistemicIntegrity.isMathClean, true);
  assert.equal(analysis.transparencyAudit.diagnosticHintsAttachedCount, 1);
  assert.equal(analysis.acceptanceGate.isValid, true);

  // Transparent attachment
  assert.strictEqual(responseData.reasoningAnalysis, analysis);
});

test('reasoning_post_analyzer: automatically persists evidence ledger by default', () => {
  const testTraceId = `TRC-AUTOPERSIST-${Date.now()}`;
  const responseData = {
    status: 'PASSED',
    chassis: 'DL380_Gen12',
    aspectChecksCompleted: true,
    errors: []
  };

  const classification = {
    intent: 'CATALOG_INTELLIGENCE',
    confidence: 1.0,
    rationale: 'SKU pricing and lifecycle query'
  };

  const analysis = performReasoningPostAnalysis({
    queryText: 'What is the price of P52410-B21?',
    context: { chassisName: 'DL380_Gen12' }, // persistLedger is undefined -> default true
    classification,
    responseData,
    traceId: testTraceId,
    executionTimeMs: 45
  });

  assert.ok(analysis);
  assert.ok(responseData.evidenceLogPath, 'evidenceLogPath must be automatically set');
  assert.equal(responseData.traceStatus, 'PERSISTED_EVIDENCE_LEDGER');
  assert.ok(fs.existsSync(responseData.evidenceLogPath), `Ledger file must exist on disk: ${responseData.evidenceLogPath}`);

  // Clean up test ledger file
  try {
    fs.unlinkSync(responseData.evidenceLogPath);
    const mdPath = responseData.evidenceLogPath.replace('.json', '.md').replace('evidence_log_', 'evidence_summary_');
    if (fs.existsSync(mdPath)) fs.unlinkSync(mdPath);
  } catch (_) {}
});

test('reasoning_post_analyzer: non-destructive invariant preserves raw input items without mutation', () => {
  const originalItems = [
    { sku: 'P52410-B21', quantity: 1, customNote: 'Do not mutate' }
  ];
  const itemsCopy = JSON.parse(JSON.stringify(originalItems));

  const responseData = {
    status: 'ACTION_REQUIRED',
    items: originalItems,
    errors: ['Physical conflict']
  };

  const classification = { intent: 'BOQ_EVALUATION', confidence: 0.9, rationale: 'Eval' };

  performReasoningPostAnalysis({
    queryText: 'Evaluate BOM',
    context: { items: originalItems, persistLedger: false },
    classification,
    responseData,
    traceId: 'TRC-TEST-NONDESTRUCTIVE',
    executionTimeMs: 50
  });

  assert.deepEqual(originalItems, itemsCopy, 'Input items must never be mutated');
  assert.deepEqual(responseData.items, itemsCopy, 'Response items must remain unmodified');
});
