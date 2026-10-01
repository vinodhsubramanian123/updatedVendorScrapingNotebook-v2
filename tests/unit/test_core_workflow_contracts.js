'use strict';
/**
 * tests/unit/test_core_workflow_contracts.js — Deterministic Core Workflow Contract Tests
 *
 * Validates the core contracts established in the 2026-09-30 and 2026-10-01 architecture remediations:
 * 1. StageResultSchema and EvidenceLedger mandatory non-default status & SKIPPED policy validation
 * 2. Cryptographic DeliveryAuthorization HMAC-SHA256 signature and exact 64-char fingerprint matching
 * 3. Pre-presentation acceptance delivery gating across all 4 public exporters
 * 4. Aspect registry integration for dynamic multi-domain validation
 * 5. Single-file audit vs two-baseline BOM reconciliation contracts (quantity deltas, fail-closed catalog)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

const {
  StageResultSchema,
  issueDeliveryAuthorization,
  verifyDeliveryAuthorization,
  assertDeliveryAuthorization
} = require('../../scripts/lib/contracts/workflow_contract.js');

const { createEvidenceLedger } = require('../../scripts/lib/system/evidence_ledger.js');
const {
  generateRankedPortalWorkbook,
  generateProfessionalBOQ,
  generateMultiRankSolutionWorkbook,
  generateMultiRankSolutionCsv,
  _buildSummaryData,
  generatePartnerPortalUploadBOM
} = require('../../scripts/lib/boq/generate_boq_xlsx.js');
const { evaluateDomainAspects, getRegisteredAspectsForDomain } = require('../../scripts/lib/aspects/aspect_registry.js');
const { verifyVendorBOM, auditSingleVendorBOM } = require('../../scripts/lib/boq/vendor_bom_verifier.js');
const { deliveryFingerprint } = require('../../scripts/lib/boq/solution_evidence.js');
const { safeWriteJsonAtomic } = require('../../scripts/lib/system/fs_compat');

// Helper to generate a valid 64-character SHA-256 hex string
function generateValidFingerprint(seed = 'test-candidate-manifest') {
  return crypto.createHash('sha256').update(seed).digest('hex');
}

test('Core Contracts — StageResult enforces both skipReason and policyCode on SKIPPED state (INV-105)', () => {
  const validCompleted = StageResultSchema.safeParse({
    stageId: 'STAGE_1_INTAKE',
    stageName: 'BOQ Intake',
    executionState: 'COMPLETED',
    outcome: 'PASSED',
    evidenceIds: ['EV-001'],
    data: { itemsCount: 5 }
  });
  assert.equal(validCompleted.success, true, 'Completed stage should parse successfully');

  // Missing both skipReason and policyCode
  const missingBoth = StageResultSchema.safeParse({
    stageId: 'STAGE_7_GROUNDING',
    stageName: 'Document Grounding',
    executionState: 'SKIPPED',
    outcome: 'NOT_EVALUATED'
  });
  assert.equal(missingBoth.success, false, 'SKIPPED stage without skipReason & policyCode must fail');

  // Has skipReason but missing policyCode
  const missingPolicy = StageResultSchema.safeParse({
    stageId: 'STAGE_7_GROUNDING',
    stageName: 'Document Grounding',
    executionState: 'SKIPPED',
    outcome: 'NOT_EVALUATED',
    skipReason: 'Offline evaluation requested by user'
  });
  assert.equal(missingPolicy.success, false, 'SKIPPED stage with skipReason but missing policyCode must fail');

  // Has policyCode but missing skipReason
  const missingReason = StageResultSchema.safeParse({
    stageId: 'STAGE_7_GROUNDING',
    stageName: 'Document Grounding',
    executionState: 'SKIPPED',
    outcome: 'NOT_EVALUATED',
    policyCode: 'POLICY_OFFLINE_SKIP'
  });
  assert.equal(missingReason.success, false, 'SKIPPED stage with policyCode but missing skipReason must fail');

  // Has both non-empty skipReason and policyCode
  const validSkipped = StageResultSchema.safeParse({
    stageId: 'STAGE_7_GROUNDING',
    stageName: 'Document Grounding',
    executionState: 'SKIPPED',
    outcome: 'NOT_EVALUATED',
    skipReason: 'Offline evaluation requested by user',
    policyCode: 'POLICY_OFFLINE_SKIP'
  });
  assert.equal(validSkipped.success, true, 'SKIPPED stage with both skipReason and policyCode must pass');
});

test('Core Contracts — DeliveryAuthorization cryptographic HMAC and 64-char fingerprint matching (INV-128 / R-01, R-02)', () => {
  const validFingerprint = generateValidFingerprint('manifest-v1');

  // Attempting to issue authorization with rejected acceptance MUST throw
  assert.throws(() => {
    issueDeliveryAuthorization({
      manifestFingerprint: validFingerprint,
      chassisKey: 'DL380_Gen12',
      acceptanceDecision: {
        isApproved: false,
        profile: 'BOQ_EVALUATION'
      }
    });
  }, /acceptance is not approved/i);

  // Attempting to issue authorization without fingerprint MUST throw
  assert.throws(() => {
    issueDeliveryAuthorization({
      manifestFingerprint: '',
      chassisKey: 'DL380_Gen12',
      acceptanceDecision: {
        isApproved: true,
        profile: 'BOQ_EVALUATION'
      }
    });
  }, /fingerprint is required/i);

  // Attempting to issue authorization with non-64-character hex fingerprint MUST throw
  assert.throws(() => {
    issueDeliveryAuthorization({
      manifestFingerprint: 'A1B2C3D4E5F67890', // 16 chars
      chassisKey: 'DL380_Gen12',
      acceptanceDecision: {
        isApproved: true,
        profile: 'BOQ_EVALUATION'
      }
    });
  }, /must be a full 64-character SHA-256 hex string/i);

  // Valid acceptance issues a verifiable token with full HMAC-SHA256
  const auth = issueDeliveryAuthorization({
    manifestFingerprint: validFingerprint,
    chassisKey: 'DL380_Gen12',
    acceptanceDecision: {
      isApproved: true,
      profile: 'BOQ_EVALUATION'
    }
  });

  assert.ok(auth.token.startsWith('DELIV-AUTH-'), 'Token prefix must be DELIV-AUTH-');
  assert.equal(auth.manifestFingerprint, validFingerprint);
  assert.equal(auth.signature.length, 64, 'Signature must be a 64-character hex HMAC');
  assert.equal(verifyDeliveryAuthorization(auth, validFingerprint), true, 'Valid token must verify');

  // Rejects mismatched fingerprints
  assert.equal(verifyDeliveryAuthorization(auth, generateValidFingerprint('altered-manifest')), false, 'Mismatched fingerprint must fail');
  assert.equal(verifyDeliveryAuthorization(null, validFingerprint), false, 'Null auth must fail');
  assert.equal(verifyDeliveryAuthorization(auth, ''), false, 'Empty fingerprint must fail');
  assert.equal(verifyDeliveryAuthorization(auth, null), false, 'Null fingerprint must fail');

  // Rejects prefix-only slices (Anti-Pattern / R-02 fix)
  assert.equal(verifyDeliveryAuthorization(auth, validFingerprint.substring(0, 8)), false, '8-char prefix match must fail');
  assert.equal(verifyDeliveryAuthorization(auth, validFingerprint.substring(0, 32)), false, '32-char prefix match must fail');

  // Rejects tampered signature
  const tamperedAuthSig = { ...auth, signature: auth.signature.substring(0, 63) + (auth.signature[63] === 'a' ? 'b' : 'a') };
  tamperedAuthSig.token = `DELIV-AUTH-${tamperedAuthSig.signature}`;
  assert.equal(verifyDeliveryAuthorization(tamperedAuthSig, validFingerprint), false, 'Tampered signature must fail verification');

  // Rejects tampered scope (e.g. chassisKey swapped)
  const tamperedChassis = { ...auth, chassisKey: 'DL385_Gen12' };
  assert.equal(verifyDeliveryAuthorization(tamperedChassis, validFingerprint), false, 'Altered chassis scope must fail verification');

  // Rejects expired authorization
  const expiredAuth = {
    ...auth,
    expiresAt: new Date(Date.now() - 60000).toISOString()
  };
  assert.equal(verifyDeliveryAuthorization(expiredAuth, validFingerprint), false, 'Expired auth must fail verification');

  // assertDeliveryAuthorization behavior
  assert.equal(assertDeliveryAuthorization(auth, validFingerprint), true);
  assert.equal(assertDeliveryAuthorization(null, null, { diagnostic: true }), true, 'Diagnostic bypass allowed');
  assert.throws(() => {
    assertDeliveryAuthorization(null, validFingerprint);
  }, /DeliveryAuthorization is missing/i);
  assert.throws(() => {
    assertDeliveryAuthorization(auth, generateValidFingerprint('tampered'));
  }, /failed cryptographic verification/i);
});

test('Core Contracts — EvidenceLedger state transitions & zero default success (INV-105, INV-131)', () => {
  const ledger = createEvidenceLedger({ traceId: 'TRC-TEST-001', chassis: 'DL380_Gen12' });

  // Calling completePhase without status MUST throw
  ledger.startPhase(1, 'Intake', {});
  assert.throws(() => {
    ledger.completePhase(1);
  }, /ZERO_DEFAULT_SUCCESS/);

  // Calling completePhase with invalid status MUST throw
  assert.throws(() => {
    ledger.completePhase(1, 'INVALID_STATUS_FOO');
  }, /Invalid phase status/);

  // Calling completePhase on an unstarted phase MUST throw ILLEGAL_TRANSITION (R-05)
  assert.throws(() => {
    ledger.completePhase(2, 'PASSED', {});
  }, /ILLEGAL_TRANSITION/);

  // Calling completePhase as SKIPPED without skipReason and policyCode MUST throw
  assert.throws(() => {
    ledger.completePhase(1, 'SKIPPED', {});
  }, /marked SKIPPED must provide both skipReason and policyCode/);

  // Explicit valid status succeeds
  assert.doesNotThrow(() => {
    ledger.completePhase(1, 'PASSED', { items: 10 });
  });
  assert.equal(ledger.phases.phase_1.status, 'PASSED');

  // Explicit valid SKIPPED phase succeeds with reason and policy
  ledger.startPhase(2, 'Second Phase', {});
  assert.doesNotThrow(() => {
    ledger.completePhase(2, 'SKIPPED', {
      skipReason: 'No secondary steps configured',
      policyCode: 'POLICY_OPTIONAL_SKIP'
    });
  });
  assert.equal(ledger.phases.phase_2.status, 'SKIPPED');
  assert.equal(ledger.phases.phase_2.skipReason, 'No secondary steps configured');
  assert.equal(ledger.phases.phase_2.policyCode, 'POLICY_OPTIONAL_SKIP');
});

test('Core Contracts — Pre-Presentation Acceptance blocks all 4 public presentation exporters (INV-128 / R-01)', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-auth-all-'));

  const candidateEvaluation = {
    chassis: 'DL380_Gen12',
    acceptanceGate: {
      isValid: true,
      status: 'PASSED',
      blockersCount: 0,
      blockers: []
    },
    items: [{ sku: 'P74573-B21', quantity: 2, unitPriceUsd: 1200 }],
    rankedSolutions: [
      {
        rank: 1,
        name: 'Rank 1: Preserved Intent',
        skuPartsList: [{ sku: 'P74573-B21', quantity: 2, unitPriceUsd: 1200 }]
      }
    ]
  };

  const p1 = path.join(tempDir, 'Test_Portal.xlsx');
  const p2 = path.join(tempDir, 'Test_Proposal.xlsx');
  const p3 = path.join(tempDir, 'Test_MultiRank.xlsx');
  const p4 = path.join(tempDir, 'Test_MultiRank.csv');
  const testFingerprint = deliveryFingerprint(candidateEvaluation);
  candidateEvaluation.manifestFingerprint = testFingerprint;

  try {
    // 1. Without deliveryAuthorization, all 4 exporters MUST throw
    assert.throws(() => {
      generateRankedPortalWorkbook(candidateEvaluation, p1);
    }, /DeliveryAuthorization is missing/i);

    assert.throws(() => {
      generateProfessionalBOQ(candidateEvaluation, p2, 'DL380_Gen12', 1);
    }, /DeliveryAuthorization is missing/i);

    assert.throws(() => {
      generateMultiRankSolutionWorkbook(candidateEvaluation, p3, 'DL380_Gen12');
    }, /DeliveryAuthorization is missing/i);

    assert.throws(() => {
      generateMultiRankSolutionCsv(candidateEvaluation, p4);
    }, /DeliveryAuthorization is missing/i);

    // 2. With invalid / tampered authorization, all 4 exporters MUST throw
    const invalidAuthEval = {
      ...candidateEvaluation,
      deliveryAuthorization: {
        token: 'DELIV-AUTH-fake',
        signature: '0'.repeat(64),
        manifestFingerprint: generateValidFingerprint('tampered-fingerprint'),
        chassisKey: 'DL380_Gen12',
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        profile: 'BOQ_EVALUATION'
      }
    };

    assert.throws(() => {
      generateRankedPortalWorkbook(invalidAuthEval, p1);
    }, /failed cryptographic verification/i);

    assert.throws(() => {
      generateProfessionalBOQ(invalidAuthEval, p2, 'DL380_Gen12', 1);
    }, /failed cryptographic verification/i);

    assert.throws(() => {
      generateMultiRankSolutionWorkbook(invalidAuthEval, p3, 'DL380_Gen12');
    }, /failed cryptographic verification/i);

    assert.throws(() => {
      generateMultiRankSolutionCsv(invalidAuthEval, p4);
    }, /failed cryptographic verification/i);

    // 3. With { diagnostic: true } option, exporters succeed without requiring authorization
    assert.doesNotThrow(() => {
      generateRankedPortalWorkbook(candidateEvaluation, p1, { diagnostic: true });
    }, 'Diagnostic mode must allow portal workbook generation');

    assert.doesNotThrow(() => {
      generateProfessionalBOQ(candidateEvaluation, p2, 'DL380_Gen12', 1, { diagnostic: true });
    }, 'Diagnostic mode must allow proposal workbook generation');

    assert.doesNotThrow(() => {
      generateMultiRankSolutionWorkbook(candidateEvaluation, p3, 'DL380_Gen12', { diagnostic: true });
    }, 'Diagnostic mode must allow multi-rank workbook generation');

    assert.doesNotThrow(() => {
      generateMultiRankSolutionCsv(candidateEvaluation, p4, { diagnostic: true });
    }, 'Diagnostic mode must allow multi-rank CSV generation');

    // 4. With valid cryptographic DeliveryAuthorization bound to candidate fingerprint, all exporters succeed
    const validAuth = issueDeliveryAuthorization({
      manifestFingerprint: testFingerprint,
      chassisKey: 'DL380_Gen12',
      acceptanceDecision: {
        isApproved: true,
        profile: 'BOQ_EVALUATION'
      }
    });

    const authorizedEvaluation = {
      ...candidateEvaluation,
      deliveryAuthorization: validAuth
    };

    assert.doesNotThrow(() => {
      generateRankedPortalWorkbook(authorizedEvaluation, p1);
    }, 'Authorized evaluation must allow portal workbook generation');

    assert.doesNotThrow(() => {
      generateProfessionalBOQ(authorizedEvaluation, p2, 'DL380_Gen12', 1);
    }, 'Authorized evaluation must allow proposal workbook generation');

    assert.doesNotThrow(() => {
      generateMultiRankSolutionWorkbook(authorizedEvaluation, p3, 'DL380_Gen12');
    }, 'Authorized evaluation must allow multi-rank workbook generation');

    assert.doesNotThrow(() => {
      generateMultiRankSolutionCsv(authorizedEvaluation, p4);
    }, 'Authorized evaluation must allow multi-rank CSV generation');

    // A cached fingerprint is not proof of the current export contents.
    const mutated = structuredClone(authorizedEvaluation);
    mutated.items[0].quantity = 3;
    for (const exporter of [
      () => generateRankedPortalWorkbook(mutated, p1),
      () => generateProfessionalBOQ(mutated, p2, 'DL380_Gen12', 1),
      () => generateMultiRankSolutionWorkbook(mutated, p3, 'DL380_Gen12'),
      () => generateMultiRankSolutionCsv(mutated, p4)
    ]) assert.throws(exporter, /failed cryptographic verification/i);

    const dataBypass = { ...candidateEvaluation, isDiagnostic: true };
    assert.throws(() => generateMultiRankSolutionCsv(dataBypass), /DeliveryAuthorization is missing/i);

  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('Delivery fingerprint binds every candidate representation, scope and price but not lifecycle bookkeeping', () => {
  const evaluation = {
    chassis: 'DL380_Gen12', acceptanceGate: { isValid: true },
    conflictGraph: {
      recommendedSolutions: [{ rank: 1, skuPartsList: [{ sku: 'A', quantity: 1, parentId: 'owner-1', unitPriceUsd: 5 }] }],
      rankedSolutions: [{ rank: 2, skuList: [{ sku: 'B', quantity: 2 }] }]
    },
    selectors: { ambientTempMaxC: 27 }, clusterSizing: { serverCount: 2 }
  };
  const fingerprint = deliveryFingerprint(evaluation);
  for (const mutate of [
    result => { result.conflictGraph.recommendedSolutions[0].skuPartsList[0].parentId = 'owner-2'; },
    result => { result.conflictGraph.recommendedSolutions[0].skuPartsList[0].unitPriceUsd = 99; },
    result => { result.conflictGraph.rankedSolutions[0].skuList[0].quantity = 3; },
    result => { result.selectors.ambientTempMaxC = 30; },
    result => { result.clusterSizing.serverCount = 3; },
    result => { result.acceptanceGate.isValid = false; }
  ]) {
    const altered = structuredClone(evaluation);
    mutate(altered);
    assert.notEqual(deliveryFingerprint(altered), fingerprint);
  }
  assert.equal(deliveryFingerprint({ ...evaluation, manifestFingerprint: 'cached', postFlowSync: { success: true }, runtimeDiscoveryPlanPath: 'report' }), fingerprint);
});

test('Workbook cannot claim vendor acceptance from a bare boolean or unscoped receipt', () => {
  const summary = _buildSummaryData({ isMathClean: true }, 'DL380_Gen12', 1, [{
    rank: 1, physicalMathClean: true, isClicValidated: true,
    buildabilityStatus: '100% Factory Buildable in CLIC', portalValidationStatus: 'CLIC_ACCEPTED',
    portalReceipt: { status: 'CLIC_ACCEPTED', capturedAt: new Date().toISOString() }
  }]);
  assert.doesNotMatch(JSON.stringify(summary), /100% Factory Buildable|CLIC ACCEPTED —/);
  assert.match(JSON.stringify(summary), /PORTAL VALIDATION PENDING/);
});

test('Public legacy secret cannot forge default offline authorization', () => {
  const configuredSecret = process.env.DELIVERY_AUTH_SECRET;
  try {
    delete process.env.DELIVERY_AUTH_SECRET;
    const fingerprint = generateValidFingerprint('legacy-secret-forgery');
    const forged = issueDeliveryAuthorization({
      manifestFingerprint: fingerprint, chassisKey: 'DL380_Gen12',
      acceptanceDecision: { isApproved: true }, secret: 'antigravity-delivery-auth-secret-key-v1'
    });
    assert.equal(verifyDeliveryAuthorization(forged, fingerprint), false);
    assert.equal(verifyDeliveryAuthorization(forged, fingerprint, { secret: 'antigravity-delivery-auth-secret-key-v1' }), true);
  } finally {
    if (configuredSecret === undefined) delete process.env.DELIVERY_AUTH_SECRET;
    else process.env.DELIVERY_AUTH_SECRET = configuredSecret;
  }
});

test('Inherited signing secret retains identical signing bytes when the environment entry is removed', () => {
  const configuredSecret = process.env.DELIVERY_AUTH_SECRET;
  const fingerprint = generateValidFingerprint('secret-snapshot');
  const auth = issueDeliveryAuthorization({ manifestFingerprint: fingerprint, chassisKey: 'DL380_Gen12', acceptanceDecision: { isApproved: true } });
  try {
    delete process.env.DELIVERY_AUTH_SECRET;
    assert.equal(verifyDeliveryAuthorization(auth, fingerprint), true);
  } finally {
    if (configuredSecret !== undefined) process.env.DELIVERY_AUTH_SECRET = configuredSecret;
  }
});

test('Direct portal file export cannot evade authorization by supplying raw clusters or a plain object', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raw-portal-gate-'));
  try {
    const target = path.join(tempDir, 'portal.xlsx');
    const clusters = [{ items: [{ sku: 'A', quantity: 1 }] }];
    assert.throws(() => generatePartnerPortalUploadBOM(clusters, target), /Raw clusters have no DeliveryAuthorization/);
    assert.throws(() => generatePartnerPortalUploadBOM({ items: clusters[0].items }, target), /Pre-presentation acceptance failed/);
    assert.equal(fs.existsSync(target), false);
    assert.doesNotThrow(() => generatePartnerPortalUploadBOM(clusters, target, { diagnostic: true }));
    const evaluation = { chassis: 'DL380_Gen12', acceptanceGate: { isValid: true }, clusters };
    evaluation.deliveryAuthorization = issueDeliveryAuthorization({ manifestFingerprint: deliveryFingerprint(evaluation), chassisKey: evaluation.chassis, acceptanceDecision: { isApproved: true } });
    assert.doesNotThrow(() => generatePartnerPortalUploadBOM(evaluation, target));
    evaluation.clusters[0].items[0].quantity = 2;
    assert.throws(() => generatePartnerPortalUploadBOM(evaluation, target), /failed cryptographic verification/);
  } finally { fs.rmSync(tempDir, { recursive: true, force: true }); }
});

test('Direct Drive upload rejects an unsigned or failed evaluation before touching the provider', async () => {
  const { handleGoogleDriveUpload } = require('../../scripts/lib/boq/eval_output_serializer');
  await assert.rejects(handleGoogleDriveUpload('stale.xlsx'), /Current acceptance/);
  await assert.rejects(handleGoogleDriveUpload('stale.xlsx', { acceptanceGate: { isValid: true }, deliveryError: 'Export failed' }), /Current acceptance/);
  await assert.rejects(handleGoogleDriveUpload('stale.xlsx', { acceptanceGate: { isValid: true } }), /DeliveryAuthorization is missing/);
});

test('Financial reconciliation distinguishes unknown prices, confirmed zero, comma formatting and partial duplicate pricing', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quote-price-evidence-'));
  const chassisDir = path.join(tempDir, 'DL380_Gen12');
  fs.mkdirSync(chassisDir);
  safeWriteJsonAtomic(path.join(chassisDir, 'DL380_Gen12_Catalog.json'), {
    metadata: { chassis: 'DL380_Gen12' }, entries: [{ skus: [{ 'Product #': 'P74573-B21', 'Unit Price (USD)': '9,999.00' }] }]
  });
  const row = { sku: 'P74573-B21', quantity: 1, description: 'CTO Server' };
  const compare = (vendor, proposed) => verifyVendorBOM(vendor, { skuPartsList: proposed }, chassisDir);
  try {
    for (const unitPriceUsd of [undefined, null, 0, 'n/a', -5, '12USDjunk']) {
      const result = compare([{ ...row, unitPriceUsd }], [{ ...row, unitPriceUsd: 10 }]);
      assert.equal(result.isStructuralMatch, true);
      assert.equal(result.is100PercentMatch, false);
      assert.equal(result.pricingComplete, false);
      assert.equal(result.discrepancies.pricingGaps.length, 1);
      assert.equal(result.discrepancies.exactMatches.length, 0);
    }
    assert.equal(compare([{ ...row, unitPriceUsd: '1,200.00' }], [{ ...row, unitPriceUsd: 1200 }]).is100PercentMatch, true);
    const zero = { ...row, unitPriceUsd: 0, isConfirmedZeroPrice: true };
    assert.equal(compare([zero], [zero]).is100PercentMatch, true);
    assert.equal(compare([zero], [{ ...row, unitPriceUsd: 10 }]).discrepancies.priceDeltas.length, 1);
    assert.equal(compare([{ ...row, unitPriceUsd: 10.5 }], [{ ...row, unitPriceUsd: 10 }]).is100PercentMatch, false);
    assert.equal(compare([{ ...row, unitPriceUsd: 10 }, row], [{ ...row, quantity: 2, unitPriceUsd: 5 }]).is100PercentMatch, false);
    assert.equal(compare([{ ...row, unitPriceUsd: 10 }, { ...row, unitPriceUsd: 20 }], [{ ...row, quantity: 2, unitPriceUsd: 15 }]).is100PercentMatch, true);
    assert.equal(compare([{ ...row, unitPriceUsd: 10, quantityBasis: 'total' }], [{ ...row, unitPriceUsd: 10, quantityBasis: 'base' }]).is100PercentMatch, false);
  } finally { fs.rmSync(tempDir, { recursive: true, force: true }); }
});

test('Reconciliation rejects malformed quantities and preserves owner and exact SKU suffix identity', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reconciliation-identity-'));
  const chassisDir = path.join(tempDir, 'DL380_Gen12');
  fs.mkdirSync(chassisDir);
  safeWriteJsonAtomic(path.join(chassisDir, 'DL380_Gen12_Catalog.json'), {
    metadata: { chassis: 'DL380_Gen12', scrapeDate: new Date().toISOString() },
    entries: [{ skus: [{ 'Product #': 'P74573-B21' }, { 'Product #': 'P74573-B21#ABA' }] }]
  });
  try {
    const original = { sku: 'P74573-B21', quantity: 1, configurationId: 'node-A', description: 'CTO Server', unitPriceUsd: 10 };
    const proposed = { skuPartsList: [original] };
    assert.equal(verifyVendorBOM([original], proposed, chassisDir).is100PercentMatch, true);
    const moved = verifyVendorBOM([{ ...original, configurationId: 'node-B' }], proposed, chassisDir);
    assert.equal(moved.is100PercentMatch, false);
    assert.equal(moved.discrepancies.addedByVendor.length, 1);
    assert.equal(moved.discrepancies.removedByVendor.length, 1);
    assert.ok(moved.discrepancies.addedByVendor[0].scopeIdentity.includes('node-B'));
    const suffixed = verifyVendorBOM([{ ...original, sku: 'P74573-B21#ABB' }], {
      skuPartsList: [{ ...original, sku: 'P74573-B21#ABA' }]
    }, chassisDir);
    assert.equal(suffixed.is100PercentMatch, false);
    assert.equal(suffixed.discrepancies.uncatalogedSkus.length, 1);
    const single = auditSingleVendorBOM([{ ...original, sku: 'P74573-B21#ABB' }], chassisDir);
    assert.equal(single.isCatalogClean, false);
    for (const quantity of [0, -1, 1.5, NaN, undefined, true, [1]]) {
      const malformed = [{ ...original, quantity }];
      assert.throws(() => verifyVendorBOM(malformed, proposed, chassisDir), /positive integer quantity/);
      assert.throws(() => auditSingleVendorBOM(malformed, chassisDir), /positive integer quantity/);
    }
  } finally { fs.rmSync(tempDir, { recursive: true, force: true }); }
});

test('Core Contracts — Aspect Registry evaluates domain checkers dynamically', () => {
  const serverCheckers = getRegisteredAspectsForDomain('server');
  assert.ok(serverCheckers.length >= 7, 'Server domain must have at least 7 aspect checkers');

  const testItems = [
    { sku: 'P74573-B21', description: 'Intel Xeon Gold 6530 Processor', quantity: 2 },
    { sku: 'P48820-B21', description: 'High Performance Fan Kit', quantity: 1 }
  ];

  const domainResult = evaluateDomainAspects('server', testItems, null, {}, 1, {});
  assert.equal(domainResult.domain, 'server');
  assert.ok(Array.isArray(domainResult.checks), 'Checks array must be returned');
  assert.ok(domainResult.checks.some(c => c.id === 'COMPUTE_THERMAL'), 'Thermal check must run');
});

test('Core Contracts — BOM Reconciliation detects quantity deltas and forces is100PercentMatch false (R-03)', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bom-recon-test-'));
  const chassisDir = path.join(tmpDir, 'DL380_Gen12');
  fs.mkdirSync(chassisDir, { recursive: true });
  fs.writeFileSync(path.join(chassisDir, 'DL380_Gen12_Catalog.json'), JSON.stringify({
    entries: [
      { skus: [{ 'Product #': 'P74573-B21' }, { 'Product #': 'P48820-B21' }] }
    ]
  }));

  try {
    const proposedRank1 = {
      rank: 1,
      skuList: [
        { sku: 'P74573-B21', quantity: 2, description: 'Intel Xeon Gold 6530 Processor', unitPriceUsd: 1200 },
        { sku: 'P48820-B21', quantity: 1, description: 'Fan Kit', unitPriceUsd: 150 }
      ]
    };

    // Vendor BOM has quantity discrepancy on CPU (1 instead of 2)
    const vendorBomWithQtyMismatch = [
      { sku: 'P74573-B21', quantity: 1, description: 'Intel Xeon Gold 6530 Processor', unitPriceUsd: 1200 },
      { sku: 'P48820-B21', quantity: 1, description: 'Fan Kit', unitPriceUsd: 150 }
    ];

    const report = verifyVendorBOM(vendorBomWithQtyMismatch, proposedRank1, chassisDir);
    assert.equal(report.is100PercentMatch, false, 'Quantity mismatch must force is100PercentMatch to false');
    assert.equal(report.hasDiscrepancies, true, 'hasDiscrepancies must be true on quantity delta');
    assert.ok(Array.isArray(report.discrepancies.quantityDeltas), 'discrepancies.quantityDeltas must be an array');
    assert.equal(report.discrepancies.quantityDeltas.length, 1, 'Exactly 1 quantity delta should be recorded');
    assert.equal(report.discrepancies.quantityDeltas[0].sku, 'P74573-B21');
    assert.equal(report.discrepancies.quantityDeltas[0].vendorQty, 1);
    assert.equal(report.discrepancies.quantityDeltas[0].proposedQty, 2);
    assert.equal(report.discrepancies.quantityDeltas[0].qtyDiff, -1);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Core Contracts — Single-file audit does not invent vendor additions or trigger feedback quarantine (R-04)', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'single-file-test-'));
  const chassisDir = path.join(tmpDir, 'DL380_Gen12');
  fs.mkdirSync(chassisDir, { recursive: true });
  fs.writeFileSync(path.join(chassisDir, 'DL380_Gen12_Catalog.json'), JSON.stringify({
    entries: [
      { skus: [{ 'Product #': 'P74573-B21' }, { 'Product #': 'P48820-B21' }] }
    ]
  }));

  try {
    const singleVendorBom = [
      { sku: 'P74573-B21', quantity: 2, description: 'Intel Xeon Gold 6530', unitPriceUsd: 1200 },
      { sku: 'P99999-B21', quantity: 1, description: 'Uncataloged Live Card', unitPriceUsd: 800 }
    ];

    const audit = auditSingleVendorBOM(singleVendorBom, chassisDir);
    assert.equal(audit.isSingleFileAudit, true, 'Must be marked as single file audit');
    assert.equal(audit.isTwoBaselineComparison, false, 'Must not be a two baseline comparison');
    assert.deepEqual(audit.discrepancies.addedByVendor, [], 'Single-file audit must never invent addedByVendor');
    assert.deepEqual(audit.discrepancies.removedByVendor, [], 'Single-file audit must never invent removedByVendor');
    assert.equal(audit.quarantinedObservationCount, 0, 'Single-file audit must not quarantine feedback observations');
    assert.equal(audit.requiresFreshScrape, true, 'Uncataloged SKU must trigger requiresFreshScrape');
    assert.equal(audit.uncatalogedSkus.length, 1);
    assert.equal(audit.uncatalogedSkus[0].sku, 'P99999-B21');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Cross-process configured non-hex secret issuance and verification across process boundaries', () => {
  const { execSync } = require('child_process');
  const customSecret = 'Custom-Enterprise-Secret-Key-Not-Hex-12345';
  const fingerprint = generateValidFingerprint('cross-process-manifest');
  const issueScript = `
    const { issueDeliveryAuthorization } = require('./scripts/lib/contracts/workflow_contract.js');
    const auth = issueDeliveryAuthorization({
      manifestFingerprint: '${fingerprint}',
      chassisKey: 'DL380_Gen12',
      acceptanceDecision: { isApproved: true }
    });
    console.log(JSON.stringify(auth));
  `;
  const output = execSync(`node -e "${issueScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, {
    env: { ...process.env, DELIVERY_AUTH_SECRET: customSecret },
    encoding: 'utf-8'
  }).trim();
  const auth = JSON.parse(output);

  const verifyScript = `
    const { verifyDeliveryAuthorization } = require('./scripts/lib/contracts/workflow_contract.js');
    const auth = ${JSON.stringify(auth)};
    const valid = verifyDeliveryAuthorization(auth, '${fingerprint}', { chassisKey: 'DL380_Gen12' });
    if (!valid) process.exit(1);
  `;
  assert.doesNotThrow(() => {
    execSync(`node -e "${verifyScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, {
      env: { ...process.env, DELIVERY_AUTH_SECRET: customSecret }
    });
  });
});

test('Direct Drive upload re-verifies delivery authorization and candidate review against live mutations', async () => {
  const { handleGoogleDriveUpload } = require('../../scripts/lib/boq/eval_output_serializer');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'upload-tamper-test-'));
  try {
    const portalFile = path.join(tempDir, 'sample_Partner_Portal.xlsx');
    fs.writeFileSync(portalFile, 'mock-portal-bytes');

    const evaluation = {
      chassis: 'DL380_Gen12',
      acceptanceGate: { isValid: true },
      portalWorkbookPath: portalFile,
      items: [{ sku: 'P74573-B21', quantity: 1 }],
      ephemeralSourceValidation: {
        isCloudGrounded: true,
        manifestSha256: generateValidFingerprint('initial-eval'),
        rankVerdicts: [{ rank: 1, verdict: 'PASS' }]
      }
    };
    const { solutionFingerprint } = require('../../scripts/lib/boq/solution_evidence');
    evaluation.ephemeralSourceValidation.manifestSha256 = solutionFingerprint(evaluation);
    evaluation.deliveryAuthorization = issueDeliveryAuthorization({
      manifestFingerprint: deliveryFingerprint(evaluation),
      chassisKey: evaluation.chassis,
      acceptanceDecision: { isApproved: true }
    });

    // Mutate item after delivery authorization was issued
    const mutatedEvaluation = {
      ...evaluation,
      items: [{ sku: 'P74573-B21', quantity: 5 }]
    };

    await assert.rejects(
      handleGoogleDriveUpload(portalFile, mutatedEvaluation),
      /failed cryptographic verification/
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
