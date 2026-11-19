'use strict';
/**
 * tests/unit/test_si03_claim_evidence_adjudication.js
 *
 * SI-03 Acceptance & Regression Suite:
 * 1. Wrong-generation & wrong-product citations rejected (INAPPLICABLE_GENERATION / INAPPLICABLE_PRODUCT)
 * 2. Candidate self-citation, UNTRUSTED_INPUT, mocks/simulations, and bare citation counts rejected
 * 3. Inaccessible source inventory / empty trust set stays UNKNOWN
 * 4. Changed contentSha256 with unchanged retrievedAt detected (STALE_CONTENT_MISMATCH) + maxAgeMs expiry
 * 5. Conflicting regional availability preserved without timestamp override (CONTRADICTED)
 * 6. Conditional note without required selector rejected (INAPPLICABLE_SELECTOR_UNMET)
 * 7. Valid Tier 2 document support without Tier 3 portal receipt stays PORTAL VALIDATION PENDING
 * 8. Stale / changed-manifest portal receipt rejection (portal_receipt.js), non-authoritative MODEL_PROPOSAL,
 *    local_rag_search.js normalized evidenceRecords, and nlm_solution_source_validator.js sidecar
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  EVIDENCE_SCHEMA_VERSION,
  SOURCE_TYPES,
  sha256Hex,
  createDeterministicCalculationEvidence,
  createCatalogObservationEvidence,
  createOfficialDocumentPassageEvidence,
  createPortalReceiptCaptureEvidence,
  createUntrustedInputEvidence,
  createModelProposalEvidence,
  createClaimRecord,
  buildIndependentEvidenceStates,
  buildEphemeralValidationEvidence
} = require('../../scripts/lib/boq/evidence/claim_records.js');

const {
  checkEvidenceApplicability,
  adjudicateMaterialClaim,
  adjudicateSolutionClaims,
  computeEvidenceDigest
} = require('../../scripts/lib/boq/evidence/source_adjudicator.js');

const { readPortalReceipt } = require('../../scripts/lib/boq/portal_receipt.js');
const { safeWriteJsonAtomic } = require('../../scripts/lib/system/fs_compat.js');
const { queryLocalKnowledgeBase } = require('../../scripts/lib/rag/local_rag_search.js');
const {
  resolveProductNotebookId,
  validateSolutionWithEphemeralSource
} = require('../../scripts/lib/sync/nlm_solution_source_validator.js');

function createPortalEvidenceFixture(tmpDir, overrides = {}) {
  const evidenceDir = path.join(tmpDir, 'evidence');
  fs.mkdirSync(evidenceDir, { recursive: true });
  const capturedAt = overrides.capturedAt || new Date().toISOString();
  const configName = overrides.configName || 'Config_SI03';
  const rows = overrides.rows || [
    ['Hierarchy', 'Qty', 'Product #', 'Product Description', 'Config Name', 'Unit Price (USD)', 'Ext. Price (USD)'],
    ['1', '1', 'P73282-B21', 'HPE ProLiant DL380 Gen12 8SFF CTO Server', configName, '1,500.00', '1,500.00'],
    ['1.1', '2', 'P74573-B21', 'Intel Xeon 6 Processor', configName, '1,200.00', '2,400.00']
  ];
  const totalUsd = overrides.totalUsd || '3,900.00';
  const capturedScope = overrides.capturedScope === undefined ? {
    chassis: 'DL380_Gen12',
    baseSku: 'P73282-B21',
    configurationName: configName,
    selectors: { ambientTempMaxC: 27, cpuCount: 2 }
  } : overrides.capturedScope;

  safeWriteJsonAtomic(path.join(evidenceDir, 'clic_corrected_bom.json'), {
    capturedAt,
    capturedScope,
    text: `Solution List Price USD ${totalUsd}\nConfiguration BOM`,
    tables: [{ rows }]
  });
  safeWriteJsonAtomic(path.join(evidenceDir, 'clic_corrected_configuration.json'), {
    capturedAt,
    capturedScope,
    text: overrides.checkText || 'Overall Status: OK Unbuildables 0 Errors: 0 Warnings: 0 Process control 0'
  });
  return tmpDir;
}

test('SI-03 [1/8]: Wrong-generation and wrong-product citations are rejected (INAPPLICABLE_GENERATION / INAPPLICABLE_PRODUCT)', () => {
  const gen11Passage = createOfficialDocumentPassageEvidence({
    sourceId: 'qs-dl380-gen11',
    passageId: 'p-thermal-1',
    passageText: 'DL380 Gen11 supports standard fan kit for 185W CPUs.',
    retrievedAt: '2026-11-18T10:00:00Z',
    scope: { product: 'DL380 Gen11', generation: 'Gen11' }
  });
  assert.equal(gen11Passage.schemaVersion, EVIDENCE_SCHEMA_VERSION);
  assert.equal(gen11Passage.contentIdentityOnly, true);

  const wrongGenCheck = checkEvidenceApplicability(gen11Passage, { product: 'DL380_Gen12', generation: 'Gen12' });
  assert.equal(wrongGenCheck.applicable, false);
  assert.equal(wrongGenCheck.reasonCode, 'INAPPLICABLE_GENERATION');

  const wrongProductPassage = createOfficialDocumentPassageEvidence({
    sourceId: 'qs-dl380a-gen12',
    passageId: 'p-gpu-1',
    passageText: 'DL380a Gen12 supports 4x DW GPUs.',
    retrievedAt: '2026-11-18T10:00:00Z',
    scope: { product: 'DL380a_Gen12' }
  });
  const wrongProductCheck = checkEvidenceApplicability(wrongProductPassage, { product: 'DL380_Gen12' });
  assert.equal(wrongProductCheck.applicable, false);
  assert.equal(wrongProductCheck.reasonCode, 'INAPPLICABLE_PRODUCT');

  const claim = createClaimRecord({ assertion: 'Standard fan kit sufficient for DL380 Gen12' });
  const adjudicated = adjudicateMaterialClaim(claim, [gen11Passage, wrongProductPassage], { product: 'DL380_Gen12' });
  assert.equal(adjudicated.status, 'UNKNOWN');
  assert.equal(adjudicated.isSupported, false);
  assert.deepEqual(adjudicated.supportingEvidenceIds, []);
  assert.equal(adjudicated.rejectedEvidence.length, 2);
  assert.equal(adjudicated.rejectedEvidence[0].reasonCode, 'INAPPLICABLE_GENERATION');

  const validGen12 = createOfficialDocumentPassageEvidence({
    sourceId: 'qs-dl380-gen12',
    passageId: 'p-thermal-gen12',
    passageText: 'DL380 Gen12 High Performance Fan Kit required above 185W.',
    retrievedAt: '2026-11-18T10:00:00Z',
    scope: { product: 'DL380_Gen12_8SFF' }
  });
  const validOutcome = adjudicateMaterialClaim(claim, [validGen12], { product: 'DL380 Gen12' });
  assert.equal(validOutcome.status, 'SUPPORTED');
  assert.equal(validOutcome.isSupported, true);
});

test('SI-03 [2/8]: Candidate self-citations, UNTRUSTED_INPUT, mocks, and bare citation counts are rejected', () => {
  const forcedUntrusted = createUntrustedInputEvidence({
    sourceId: 'customer-boq-csv',
    passageText: 'Customer BOM row claiming 300W CPU with standard fan',
    isAuthoritative: true,
    trustClass: 'OFFICIAL_DOCUMENT_PASSAGE',
    scope: { product: 'DL380_Gen12' }
  });
  assert.equal(forcedUntrusted.isAuthoritative, false);
  assert.equal(forcedUntrusted.trustClass, 'UNTRUSTED_INPUT');
  assert.equal(forcedUntrusted.authority.isAuthoritative, false);

  const selfCited = createOfficialDocumentPassageEvidence({
    sourceId: 'cand-ephem-99',
    passageId: '1',
    passageText: 'Candidate sheet claims buildability',
    scope: { product: 'DL380_Gen12' }
  });
  const selfCheck = checkEvidenceApplicability(selfCited, {
    product: 'DL380_Gen12',
    ephemeralSourceId: 'cand-ephem-99',
    authoritativeSourceIds: ['qs-official-1', 'cand-ephem-99']
  });
  assert.equal(selfCheck.applicable, false);
  assert.equal(selfCheck.reasonCode, 'REJECTED_SELF_CITATION');
  assert.equal(selfCheck.isSelfCitation, true);

  const mockEvidence = createOfficialDocumentPassageEvidence({
    sourceId: 'mock-src-123',
    passageText: 'Simulated validation',
    isMock: true,
    scope: { product: 'DL380_Gen12' }
  });
  const mockCheck = checkEvidenceApplicability(mockEvidence, { product: 'DL380_Gen12' });
  assert.equal(mockCheck.applicable, false);
  assert.equal(mockCheck.reasonCode, 'REJECTED_MOCK_OR_SIMULATION');

  const claimWithBareCount = createClaimRecord({
    assertion: 'Candidate is grounded',
    citationsCount: 5
  });
  const adjudicated = adjudicateMaterialClaim(
    claimWithBareCount,
    [forcedUntrusted, selfCited, mockEvidence],
    { product: 'DL380_Gen12', ephemeralSourceId: 'cand-ephem-99', authoritativeSourceIds: ['qs-official-1'] }
  );
  assert.equal(adjudicated.status, 'UNKNOWN');
  assert.equal(adjudicated.isSupported, false);
  assert.deepEqual(adjudicated.supportingEvidenceIds, []);
  assert.equal(adjudicated.rejectedEvidence.length, 3);
  assert.ok(adjudicated.adjudicationNotes.some(n => n.includes('Bare citationsCount')));
});

test('SI-03 [3/8]: Inaccessible source inventory and empty trust set stay UNKNOWN', () => {
  const docPassage = createOfficialDocumentPassageEvidence({
    sourceId: 'qs-official-1',
    passageId: 'sec-4',
    passageText: 'Requires 2x Titanium PSUs for redundancy.',
    scope: { product: 'DL380_Gen12' }
  });

  const claim = createClaimRecord({ assertion: 'Titanium PSUs required for redundancy' });
  const inaccessibleRes = adjudicateMaterialClaim(claim, [docPassage], {
    product: 'DL380_Gen12',
    inventoryStatus: 'INACCESSIBLE'
  });
  assert.equal(inaccessibleRes.status, 'UNKNOWN');
  assert.equal(inaccessibleRes.reasonCode, 'UNKNOWN_INVENTORY_INACCESSIBLE');
  assert.equal(inaccessibleRes.isSupported, false);

  const emptyTrustRes = adjudicateMaterialClaim(claim, [docPassage], {
    product: 'DL380_Gen12',
    authoritativeSourceIds: []
  });
  assert.equal(emptyTrustRes.status, 'UNKNOWN');
  assert.equal(emptyTrustRes.reasonCode, 'UNKNOWN_INVENTORY_INACCESSIBLE');
  assert.equal(emptyTrustRes.isSupported, false);

  const quarantinedRes = adjudicateMaterialClaim(claim, [docPassage], {
    product: 'DL380_Gen12',
    authoritativeSourceIds: ['qs-official-1'],
    quarantinedSourceIds: ['qs-official-1']
  });
  assert.equal(quarantinedRes.status, 'UNKNOWN');
  assert.equal(quarantinedRes.rejectedEvidence[0].reasonCode, 'REJECTED_QUARANTINED_SOURCE');
});

test('SI-03 [4/8]: Changed contentSha256 with unchanged retrievedAt is detected (STALE_CONTENT_MISMATCH) and maxAgeMs enforced', () => {
  const fixedTimestamp = '2026-11-19T10:00:00.000Z';
  const baseline = createOfficialDocumentPassageEvidence({
    sourceId: 'qs-dl380-gen12',
    passageId: 'memory-1',
    passageText: 'Supports up to 8TB DDR5 memory across 32 DIMM slots.',
    retrievedAt: fixedTimestamp,
    scope: { product: 'DL380_Gen12' }
  });

  const mutatedSameTs = createOfficialDocumentPassageEvidence({
    sourceId: 'qs-dl380-gen12',
    passageId: 'memory-1',
    passageText: 'Supports up to 4TB DDR5 memory across 16 DIMM slots.',
    retrievedAt: fixedTimestamp,
    scope: { product: 'DL380_Gen12' }
  });
  assert.notEqual(baseline.contentSha256, mutatedSameTs.contentSha256);

  const mismatchCheck = checkEvidenceApplicability(mutatedSameTs, {
    product: 'DL380_Gen12',
    baselineRecords: [baseline],
    nowMs: Date.parse('2026-11-19T10:05:00.000Z')
  });
  assert.equal(mismatchCheck.applicable, false);
  assert.equal(mismatchCheck.reasonCode, 'STALE_CONTENT_MISMATCH');
  assert.equal(mismatchCheck.isContentMismatch, true);
  assert.ok(mismatchCheck.details.some(d => d.includes('retrievedAt timestamp remained unchanged')));

  const expectedMapCheck = checkEvidenceApplicability(mutatedSameTs, {
    product: 'DL380_Gen12',
    expectedContentHashes: { 'qs-dl380-gen12': sha256Hex('Different expected text') }
  });
  assert.equal(expectedMapCheck.applicable, false);
  assert.equal(expectedMapCheck.reasonCode, 'STALE_CONTENT_MISMATCH');

  const expiringRecord = createCatalogObservationEvidence({
    sourceId: 'cat-dl380-gen12',
    passageText: 'PSU P38997-B21 list price $450',
    retrievedAt: '2026-11-19T08:00:00.000Z',
    scope: { product: 'DL380_Gen12' },
    freshnessPolicy: { maxAgeMs: 3600000 }
  });
  const expiredCheck = checkEvidenceApplicability(expiringRecord, {
    product: 'DL380_Gen12',
    nowMs: Date.parse('2026-11-19T10:00:00.000Z')
  });
  assert.equal(expiredCheck.applicable, false);
  assert.equal(expiredCheck.reasonCode, 'STALE_EVIDENCE_EXPIRED');
  assert.equal(expiredCheck.isStaleOrExpired, true);
});

test('SI-03 [5/8]: Conflicting regional availability is preserved without timestamp override (CONTRADICTED)', () => {
  const olderUsSupport = createOfficialDocumentPassageEvidence({
    sourceId: 'qs-us-guide',
    passageId: 'avail-us',
    passageText: 'SKU P75000-B21 is generally available in US.',
    retrievedAt: '2026-11-01T00:00:00.000Z',
    scope: { product: 'DL380_Gen12', region: 'US' },
    polarity: 'SUPPORTING'
  });
  const newerEmeaOpposition = createOfficialDocumentPassageEvidence({
    sourceId: 'qs-emea-erp-lot9',
    passageId: 'avail-eu',
    passageText: 'SKU P75000-B21 is blocked in EMEA under ErP Lot 9.',
    retrievedAt: '2026-11-18T12:00:00.000Z',
    scope: { product: 'DL380_Gen12', region: 'EMEA' },
    polarity: 'OPPOSING'
  });

  const claim = createClaimRecord({ assertion: 'SKU P75000-B21 regional orderability for DL380 Gen12' });
  const unregionalized = adjudicateMaterialClaim(claim, [olderUsSupport, newerEmeaOpposition], {
    product: 'DL380_Gen12'
  });
  assert.equal(unregionalized.status, 'CONTRADICTED');
  assert.equal(unregionalized.isSupported, false);
  assert.equal(unregionalized.supportingEvidence.length, 1);
  assert.equal(unregionalized.opposingEvidence.length, 1);
  assert.equal(unregionalized.supportingEvidence[0].evidenceId, olderUsSupport.evidenceId);
  assert.equal(unregionalized.opposingEvidence[0].evidenceId, newerEmeaOpposition.evidenceId);

  // Reverse timestamps: newer support vs older opposition must still stay CONTRADICTED
  const newerUsSupport = createOfficialDocumentPassageEvidence({
    ...olderUsSupport,
    evidenceId: 'EVD-US-NEWER',
    retrievedAt: '2026-11-18T18:00:00.000Z'
  });
  const olderEmeaOpposition = createOfficialDocumentPassageEvidence({
    ...newerEmeaOpposition,
    evidenceId: 'EVD-EMEA-OLDER',
    retrievedAt: '2026-10-01T00:00:00.000Z'
  });
  const reversed = adjudicateMaterialClaim(claim, [newerUsSupport, olderEmeaOpposition], {
    product: 'DL380_Gen12'
  });
  assert.equal(reversed.status, 'CONTRADICTED');
  assert.equal(reversed.supportingEvidence.length, 1);
  assert.equal(reversed.opposingEvidence.length, 1);

  // When scoped specifically to US, EMEA opposition is INAPPLICABLE_REGION
  const usOnly = adjudicateMaterialClaim(claim, [olderUsSupport, newerEmeaOpposition], {
    product: 'DL380_Gen12',
    region: 'US'
  });
  assert.equal(usOnly.status, 'SUPPORTED');
  assert.equal(usOnly.rejectedEvidence[0].reasonCode, 'INAPPLICABLE_REGION');
});

test('SI-03 [6/8]: Conditional note without required active selector is rejected (INAPPLICABLE_SELECTOR_UNMET)', () => {
  const conditionalNote = createOfficialDocumentPassageEvidence({
    sourceId: 'qs-dl380-gen12',
    passageId: 'thermal-note-27c',
    passageText: 'H200 NVL configuration supported only when ambientTempMaxC <= 27 and highPerfFans is true.',
    retrievedAt: '2026-11-18T10:00:00Z',
    scope: { product: 'DL380_Gen12' },
    applicabilityConditions: [
      { conditionKey: 'ambientTempMaxC', conditionOperator: '<=', thresholdValue: 27 },
      { selectorKey: 'highPerfFans', value: true }
    ]
  });

  const missingSelector = checkEvidenceApplicability(conditionalNote, {
    product: 'DL380_Gen12',
    selectors: {}
  });
  assert.equal(missingSelector.applicable, false);
  assert.equal(missingSelector.reasonCode, 'INAPPLICABLE_SELECTOR_UNMET');

  const mismatchedSelector = checkEvidenceApplicability(conditionalNote, {
    product: 'DL380_Gen12',
    selectors: { ambientTempMaxC: 35, highPerfFans: true }
  });
  assert.equal(mismatchedSelector.applicable, false);
  assert.equal(mismatchedSelector.reasonCode, 'INAPPLICABLE_SELECTOR_UNMET');

  const metSelector = checkEvidenceApplicability(conditionalNote, {
    product: 'DL380_Gen12',
    selectors: { ambientTempMaxC: 27, highPerfFans: true }
  });
  assert.equal(metSelector.applicable, true);
});

test('SI-03 [7/8]: Valid Tier 2 document support without Tier 3 receipt stays PORTAL VALIDATION PENDING across independent lanes', () => {
  const tier1Calc = createDeterministicCalculationEvidence({
    sourceId: 'aspect-engine-v2',
    passageId: 'power-thermal-ok',
    passageText: 'Node load 900W <= 1600W PSU envelope; thermal OK.',
    scope: { product: 'DL380_Gen12' }
  });
  const tier2Doc = createOfficialDocumentPassageEvidence({
    sourceId: 'qs-dl380-gen12',
    passageId: 'sec-2',
    passageText: 'P73282-B21 supports dual Xeon 6 CPUs with P48820-B21 High Performance Fan Kit.',
    retrievedAt: '2026-11-18T09:00:00Z',
    scope: { product: 'DL380_Gen12' }
  });

  const claim = createClaimRecord({
    claimId: 'CLM-TIER2-SUPPORT',
    assertion: 'Rank 1 thermal and QuickSpecs support verified',
    supportingEvidenceIds: [tier1Calc.evidenceId, tier2Doc.evidenceId]
  });
  const adjudication = adjudicateSolutionClaims([claim], [tier1Calc, tier2Doc], {
    product: 'DL380_Gen12',
    authoritativeSourceIds: ['qs-dl380-gen12']
  });
  assert.equal(adjudication.overallStatus, 'SUPPORTED');
  assert.match(adjudication.evidenceDigestSha256, /^[a-f0-9]{64}$/);
  assert.equal(adjudication.claims[0].highestTierSupported, 'TIER_2_DOCUMENT_CITATION');

  const lanes = buildIndependentEvidenceStates({
    evalResults: {
      aspectChecksCompleted: true,
      aspectChecks: [{ aspect: 'Power', status: 'PASS' }],
      isMathClean: true,
      portalValidationStatus: 'CLIC_ACCEPTED', // Unverified caller claim without receipt must NEVER promote Tier 3
      items: [{ sku: 'P73282-B21', quantity: 1 }]
    },
    claimAdjudication: adjudication,
    candidateReviewIsCurrent: true,
    trustEntry: {
      notebookId: 'nb-dl380-gen12',
      cloudSyncState: 'VERIFIED',
      officialSourceIds: ['qs-dl380-gen12']
    }
  });

  assert.equal(lanes.localPhysicalChecks.status, 'PASSED');
  assert.equal(lanes.documentGrounding.status, 'GROUNDED');
  assert.equal(lanes.documentGrounding.tier, 'TIER_2_DOCUMENT_CITATION');
  assert.equal(lanes.cloudSynchronization.status, 'VERIFIED');
  assert.equal(lanes.liveVendorAcceptance.status, 'PORTAL VALIDATION PENDING');
  assert.equal(lanes.liveVendorAcceptance.verified, false);
  assert.equal(lanes.liveVendorAcceptance.vendorAcceptancePending, true);
  assert.equal(lanes.liveVendorAcceptance.receiptState, 'REJECTED');
  assert.equal(lanes.portalValidationStatus, 'PORTAL VALIDATION PENDING');
  assert.equal(lanes.highestAchievedTier, 'TIER_2_DOCUMENT_CITATION');
  assert.equal(lanes.publicationState.tier3Accepted, false);
  assert.equal(lanes.publicationState.portalValidationPending, true);
});

test('SI-03 [8/8]: Portal receipt rejection, MODEL_PROPOSAL non-authority, local RAG evidenceRecords, and NLM validator sidecar', async (t) => {
  // 8a. Portal receipt valid vs changed-manifest vs stale (>24h)
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'si03-portal-'));
  t.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));
  createPortalEvidenceFixture(tmpDir);
  const receipt = readPortalReceipt(tmpDir);
  assert.equal(receipt.status, 'CLIC_ACCEPTED');

  const candidate = {
    chassis: 'DL380_Gen12',
    baseSku: 'P73282-B21',
    configurationName: 'Config_SI03',
    selectors: { ambientTempMaxC: 27, cpuCount: 2 },
    portalValidationStatus: 'CLIC_ACCEPTED',
    portalReceipt: receipt,
    items: [
      { sku: 'P73282-B21', quantity: 1 },
      { sku: 'P74573-B21', quantity: 2 }
    ]
  };
  const portalEvidence = createPortalReceiptCaptureEvidence({
    sourceId: receipt.bomPath,
    passageId: receipt.manifestSha256,
    passageText: 'CLIC Overall Status: OK',
    retrievedAt: receipt.capturedAt,
    scope: {
      product: receipt.chassis,
      baseSku: receipt.baseSku,
      owner: receipt.configurationName,
      selectors: receipt.selectors
    },
    receipt
  });
  assert.equal(checkEvidenceApplicability(portalEvidence, { ...candidate, product: 'DL380_Gen12' }).applicable, true);
  const verifiedLanes = buildIndependentEvidenceStates({ evalResults: candidate, candidateReviewIsCurrent: true });
  assert.equal(verifiedLanes.liveVendorAcceptance.status, 'CLIC_ACCEPTED');
  assert.equal(verifiedLanes.highestAchievedTier, 'TIER_3_OFFICIAL_VENDOR_ACCEPTANCE');

  // Changed manifest (quantity 2 -> 4) must reject both in adjudicator and independent lanes
  const mutatedCandidate = {
    ...candidate,
    items: [
      { sku: 'P73282-B21', quantity: 1 },
      { sku: 'P74573-B21', quantity: 4 }
    ]
  };
  const manifestMismatchCheck = checkEvidenceApplicability(portalEvidence, { ...mutatedCandidate, product: 'DL380_Gen12' });
  assert.equal(manifestMismatchCheck.applicable, false);
  assert.equal(manifestMismatchCheck.reasonCode, 'REJECTED_PORTAL_RECEIPT');
  const mutatedLanes = buildIndependentEvidenceStates({ evalResults: mutatedCandidate });
  assert.equal(mutatedLanes.liveVendorAcceptance.status, 'PORTAL VALIDATION PENDING');
  assert.equal(mutatedLanes.liveVendorAcceptance.receiptState, 'REJECTED');

  // Stale (>24h) receipt on disk must be rejected by both portal_receipt.js and adjudicator
  createPortalEvidenceFixture(tmpDir, { capturedAt: new Date(Date.now() - 25 * 3600000).toISOString() });
  assert.equal(readPortalReceipt(tmpDir), null);
  const staleCheck = checkEvidenceApplicability(
    createPortalReceiptCaptureEvidence({
      sourceId: tmpDir,
      receiptDir: tmpDir,
      retrievedAt: new Date(Date.now() - 25 * 3600000).toISOString(),
      scope: { product: 'DL380_Gen12' }
    }),
    { product: 'DL380_Gen12' }
  );
  assert.equal(staleCheck.applicable, false);
  assert.equal(staleCheck.isStaleOrExpired, true);
  assert.ok(staleCheck.reasons.includes('STALE_EVIDENCE_EXPIRED'));
  assert.ok(staleCheck.reasons.includes('REJECTED_PORTAL_RECEIPT'));

  // Missing receipt/receiptDir and context.manifestSha256 mismatch must both fail closed
  const barePortalCheck = checkEvidenceApplicability(
    createPortalReceiptCaptureEvidence({
      sourceId: 'portal-session-missing',
      retrievedAt: new Date().toISOString(),
      scope: { product: 'DL380_Gen12' }
    }),
    { product: 'DL380_Gen12' }
  );
  assert.equal(barePortalCheck.applicable, false);
  assert.equal(barePortalCheck.reasonCode, 'REJECTED_PORTAL_RECEIPT');

  const manifestHashMismatchCheck = checkEvidenceApplicability(portalEvidence, {
    ...candidate,
    product: 'DL380_Gen12',
    manifestSha256: 'f'.repeat(64)
  });
  assert.equal(manifestHashMismatchCheck.applicable, false);
  assert.equal(manifestHashMismatchCheck.reasonCode, 'REJECTED_PORTAL_RECEIPT');

  // 8b. MODEL_PROPOSAL stays non-authoritative even when multiple models agree
  const modelA = createModelProposalEvidence({ sourceId: 'gemini-3.6-flash', passageText: 'Proposal A: looks compatible', scope: { product: 'DL380_Gen12' } });
  const modelB = createModelProposalEvidence({ sourceId: 'codex-review', passageText: 'Proposal B: agrees with A', scope: { product: 'DL380_Gen12' } });
  const modelClaim = adjudicateMaterialClaim(
    createClaimRecord({ assertion: 'Model agrees configuration is valid' }),
    [modelA, modelB],
    { product: 'DL380_Gen12' }
  );
  assert.equal(modelClaim.status, 'UNKNOWN');
  assert.equal(modelClaim.pendingMechanicalOrAuthoritativeCheck, true);
  assert.equal(modelClaim.isSupported, false);
  assert.deepEqual(modelClaim.supportingEvidenceIds, []);

  // 8c. local_rag_search.js attaches normalized evidenceRecords while preserving legacy fields
  const outputsDir = path.resolve(__dirname, '..', '..', 'outputs');
  const mockChassis = `Mock_SI03_Gen12_${process.pid}`;
  const mockCatalogDir = path.join(outputsDir, mockChassis);
  fs.mkdirSync(mockCatalogDir, { recursive: true });
  t.after(() => fs.rmSync(mockCatalogDir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(mockCatalogDir, `${mockChassis}_Catalog.json`), JSON.stringify({
    metadata: { chassis: mockChassis },
    entries: [{
      parentCategory: 'Memory',
      subCategory: 'DDR5',
      skus: [{ sku: 'P64706-B21', description: 'HPE 64GB 2Rx4 PC5-5600B-R Smart Kit', listPrice: 900 }]
    }]
  }));
  const ragRes = queryLocalKnowledgeBase('DDR5 memory', mockChassis);
  assert.equal(ragRes.source, 'LOCAL_CATALOG_RAG');
  assert.ok(ragRes.answer.includes('P64706-B21'));
  assert.ok(Array.isArray(ragRes.citations) && ragRes.citations.length > 0);
  assert.ok(Array.isArray(ragRes.evidenceRecords) && ragRes.evidenceRecords.length > 0);
  assert.equal(ragRes.evidenceRecords[0].schemaVersion, '1.0');
  assert.equal(ragRes.evidenceRecords[0].sourceType, SOURCE_TYPES.CATALOG_OBSERVATION);
  assert.equal(ragRes.evidenceRecords[0].contentIdentityOnly, true);
  assert.equal(ragRes.evidenceRecords[0].scope.generation, 'Gen12');
  assert.match(ragRes.evidenceRecords[0].contentSha256, /^[a-f0-9]{64}$/);

  // 8d. nlm_solution_source_validator.js attaches claimAdjudication & evidenceStates sidecars cleanly
  const expectedNotebookId = resolveProductNotebookId('DL380_Gen12');
  const validatorRes = await validateSolutionWithEphemeralSource({
    chassis: 'DL380_Gen12',
    aspectChecksCompleted: true,
    aspectChecks: [{ aspect: 'Power', status: 'PASS' }],
    isMathClean: true,
    items: [{ sku: 'P73282-B21', quantity: 1, description: 'DL380 Gen12 Server', unitPriceUsd: 1500 }],
    conflictGraph: {
      rankedSolutions: [{
        rank: 1,
        name: 'Intent Preserved',
        skuPartsList: [{ sku: 'P73282-B21', quantity: 1, unitPriceUsd: 1500 }]
      }]
    }
  }, { isMock: true, bypassCache: true, notebookId: expectedNotebookId });

  assert.equal(validatorRes.sourceDetached, true);
  assert.equal(validatorRes.success, false);
  assert.ok(validatorRes.claimAdjudication && typeof validatorRes.claimAdjudication === 'object');
  assert.match(validatorRes.claimAdjudication.evidenceDigestSha256, /^[a-f0-9]{64}$/);
  assert.equal(computeEvidenceDigest({ a: 1, b: 2 }), computeEvidenceDigest({ b: 2, a: 1 }));
  assert.ok(validatorRes.evidenceStates && typeof validatorRes.evidenceStates === 'object');
  assert.equal(validatorRes.evidenceStates.localPhysicalChecks.status, 'PASSED');
  assert.equal(validatorRes.evidenceStates.documentGrounding.status, 'SIMULATION_ONLY');
  assert.equal(validatorRes.evidenceStates.liveVendorAcceptance.status, 'PORTAL VALIDATION PENDING');

  // 8e. Grounded non-mock ephemeral validation vs disqualified/incomplete/self-cited reviews
  const groundedEval = {
    chassis: 'DL380_Gen12',
    aspectChecksCompleted: true,
    aspectChecks: [{ aspect: 'Compute', status: 'PASS' }],
    isMathClean: true,
    items: [{ sku: 'P73282-B21', quantity: 1 }],
    conflictGraph: { rankedSolutions: [{ rank: 1, skuPartsList: [{ sku: 'P73282-B21', quantity: 1 }] }] }
  };
  const groundedReview = {
    chassis: 'DL380_Gen12',
    notebookId: expectedNotebookId,
    sourceId: 'ephem-cand-source',
    authoritativeSourceIds: ['qs-official-dl380-gen12'],
    reviewedAt: '2026-11-18T10:00:00Z',
    manifestSha256: 'a'.repeat(64),
    success: true,
    isCloudGrounded: true,
    sourceDetached: true,
    doubleCheckVerdict: 'DOUBLE_CHECK_PASSED',
    citations: [{ source_id: 'qs-official-dl380-gen12', index: 1, cited_text: 'Supports configuration' }],
    rankVerdicts: [{ rank: 1, verdict: 'PASS', intentPreserved: true, mandatoryChangesOnly: true, issues: [], citations: ['[1]'] }]
  };
  const builtGrounded = buildEphemeralValidationEvidence(groundedEval, groundedReview);
  const adjGrounded = adjudicateSolutionClaims(builtGrounded.claims, builtGrounded.evidenceRecords, builtGrounded.context);
  assert.equal(adjGrounded.overallStatus, 'SUPPORTED');
  const statesGrounded = buildIndependentEvidenceStates({
    evalResults: groundedEval,
    ephemeralReview: groundedReview,
    claimAdjudication: adjGrounded,
    candidateReviewIsCurrent: true
  });
  assert.equal(statesGrounded.documentGrounding.status, 'GROUNDED');
  assert.equal(statesGrounded.liveVendorAcceptance.status, 'PORTAL VALIDATION PENDING');

  // Disqualified candidate review (candidateReviewIsCurrent: false, sourceDetached: false, or DOUBLE_CHECK_UNVERIFIED) must stay UNVERIFIED
  const staleReviewStates = buildIndependentEvidenceStates({
    evalResults: groundedEval,
    ephemeralReview: { ...groundedReview, doubleCheckVerdict: 'DOUBLE_CHECK_UNVERIFIED', success: false },
    claimAdjudication: adjGrounded,
    candidateReviewIsCurrent: false
  });
  assert.equal(staleReviewStates.documentGrounding.status, 'UNVERIFIED');
  assert.equal(buildIndependentEvidenceStates({
    evalResults: groundedEval,
    ephemeralReview: { ...groundedReview, sourceDetached: false },
    claimAdjudication: adjGrounded,
    candidateReviewIsCurrent: true
  }).documentGrounding.status, 'UNVERIFIED');

  // Unmatched citation index, incomplete PASS flags, and unreviewed manifest ranks must stay UNKNOWN
  const unindexedCit = buildEphemeralValidationEvidence(groundedEval, {
    ...groundedReview,
    rankVerdicts: [{ rank: 1, verdict: 'PASS', intentPreserved: true, mandatoryChangesOnly: true, issues: [], citations: ['[99]'] }]
  });
  assert.equal(adjudicateSolutionClaims(unindexedCit.claims, unindexedCit.evidenceRecords, unindexedCit.context).overallStatus, 'UNKNOWN');

  for (const badRow of [
    { rank: 1, verdict: 'PASS', intentPreserved: false, mandatoryChangesOnly: true, issues: [], citations: ['[1]'] },
    { rank: 1, verdict: 'PASS', intentPreserved: true, mandatoryChangesOnly: false, issues: [], citations: ['[1]'] },
    { rank: 1, verdict: 'PASS', intentPreserved: true, mandatoryChangesOnly: true, issues: ['Missing cable'], citations: ['[1]'] }
  ]) {
    const builtBad = buildEphemeralValidationEvidence(groundedEval, { ...groundedReview, rankVerdicts: [badRow] });
    assert.equal(adjudicateSolutionClaims(builtBad.claims, builtBad.evidenceRecords, builtBad.context).overallStatus, 'UNKNOWN');
  }

  const twoRankEval = {
    ...groundedEval,
    conflictGraph: { rankedSolutions: [{ rank: 1 }, { rank: 2 }] }
  };
  const missingRankBuilt = buildEphemeralValidationEvidence(twoRankEval, groundedReview);
  const missingRankAdj = adjudicateSolutionClaims(missingRankBuilt.claims, missingRankBuilt.evidenceRecords, missingRankBuilt.context);
  assert.equal(missingRankAdj.claims.length, 2);
  assert.equal(missingRankAdj.claims[1].claimId, 'CLM-RANK-2');
  assert.equal(missingRankAdj.claims[1].status, 'UNKNOWN');
  assert.equal(missingRankAdj.overallStatus, 'UNKNOWN');

  const selfCitedReview = {
    ...groundedReview,
    citations: [{ source_id: 'ephem-cand-source', index: 1, cited_text: 'Self-citation claim' }]
  };
  const builtSelf = buildEphemeralValidationEvidence(groundedEval, selfCitedReview);
  const adjSelf = adjudicateSolutionClaims(builtSelf.claims, builtSelf.evidenceRecords, builtSelf.context);
  assert.equal(adjSelf.overallStatus, 'UNKNOWN');
  assert.equal(adjSelf.claims[0].rejectedEvidence.some(r => r.reasonCode === 'REJECTED_SELF_CITATION'), true);

  // 8e. Changing claimAdjudication.evidenceDigestSha256 invalidates both solutionFingerprint and deliveryFingerprint
  const { solutionFingerprint, deliveryFingerprint } = require('../../scripts/lib/boq/solution_evidence.js');
  const altAdj = { ...adjGrounded, evidenceDigestSha256: 'b'.repeat(64) };
  assert.notEqual(
    solutionFingerprint({ ...groundedEval, claimAdjudication: adjGrounded }),
    solutionFingerprint({ ...groundedEval, claimAdjudication: altAdj })
  );
  assert.notEqual(
    deliveryFingerprint({ ...groundedEval, claimAdjudication: adjGrounded }),
    deliveryFingerprint({ ...groundedEval, claimAdjudication: altAdj })
  );
});
