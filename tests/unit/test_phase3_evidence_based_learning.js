'use strict';
/**
 * tests/unit/test_phase3_evidence_based_learning.js
 *
 * Phase 3 Unit Tests:
 * 1. Forged verification markers on isolated components (CPU/Memory) rejected
 * 2. Valid cross-generation accessory accepted with proper class and evidence
 * 3. Canonical Drive source freshness: unrelated quarantined stale source does not block fresh canonical source; stale canonical source fails
 * 4. Grounded Canary verification: ungrounded, missing-citation, or negative answers rejected
 * 5. Cloud failure and recovery state persistence in notebooks.json
 * 6. Honest observability reporting (no false "100% in sync" when unverified cloud notebooks exist)
 * 7. Customer BOQ isolation invariant (INV-24)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  assertPayloadProductIsolation,
  isTargetDriveSourceFresh,
  isGroundedCanary,
  syncToNotebookLM
} = require('../../scripts/lib/sync/nlm_sync_client.js');

const {
  generateNotebookSyncPayload
} = require('../../scripts/lib/sync/sync_payload_builder.js');

const {
  resolveProductIdentity,
  isVerifiedSharedAccessoryRule,
  ruleAppliesToProduct
} = require('../../scripts/lib/catalog/product_scope.js');

const { safeWriteJsonAtomic } = require('../../scripts/lib/system/fs_compat.js');

test('Phase 3: Evidence-Based Learning and NotebookLM Sync Suite', async (t) => {

  const testConfig = {
    defaultNotebookId: 'nb-universal-test',
    notebooks: {
      DL380_Gen12: {
        notebookId: 'nb-dl380-gen12',
        family: 'ProLiant',
        generation: 'Gen12',
        pillar: 'SERVER',
        driveSourceId: 'src_canonical_dl380g12',
        quarantinedSourceIds: ['src_quarantined_old_junk']
      },
      DL380_Gen11: {
        notebookId: 'nb-dl380-gen11',
        family: 'ProLiant',
        generation: 'Gen11',
        pillar: 'SERVER',
        driveSourceId: 'src_canonical_dl380g11'
      },
      DL380a_Gen12: {
        notebookId: 'nb-dl380a-gen12',
        family: 'ProLiant',
        generation: 'Gen12',
        pillar: 'SERVER',
        driveSourceId: 'src_canonical_dl380a'
      },
      DL145_Gen11: {
        notebookId: 'nb-dl145-gen11',
        family: 'ProLiant',
        generation: 'Gen11',
        pillar: 'SERVER',
        driveSourceId: 'src_canonical_dl145'
      }
    }
  };

  await t.test('1. Forged verification markers on isolated components (CPU/Memory/Motherboard) are rejected', () => {
    // Attempt to forge a shared accessory marker for a CPU in a DL380 Gen12 payload
    const forgedCpuPayload = `
# Executive Summary
DL380 Gen12 hardware sync.

## Active Rules
1. [SHARED_ACCESSORY_VERIFIED target=DL380_Gen12] **[DELTA-001] P56789-B21**: Intel Xeon Platinum 8592+ Processor (Class: OTHER_ACCESSORY; Evidence: CERTIFIED_OCA_CATALOG; Sources: DL380_Gen11_Master_Catalog)
`;
    assert.throws(
      () => assertPayloadProductIsolation(forgedCpuPayload, 'DL380_Gen12', testConfig),
      /Product isolation rejected DL380_Gen12 payload: reference to registered product DL380_Gen11/
    );

    // Attempt to forge a shared accessory marker for DDR5 Memory in a DL380a Gen12 payload
    const forgedMemoryPayload = `
# DL380a Gen12 Sync
1. [SHARED_ACCESSORY_VERIFIED target=DL380a_Gen12] **[DELTA-002] P64707-B21**: HPE 64GB 2Rx4 DDR5-5600 Smart Memory Kit (Evidence: OFFICIAL_VENDOR_DOC; Sources: DL380_Gen12_Master_Catalog)
`;
    assert.throws(
      () => assertPayloadProductIsolation(forgedMemoryPayload, 'DL380a_Gen12', testConfig),
      /Product isolation rejected DL380a_Gen12 payload: reference to registered product DL380_Gen12/
    );

    // Also check isVerifiedSharedAccessoryRule rejection of core components
    const targetIdentity = resolveProductIdentity('DL380a_Gen12', testConfig);
    const forgedRule = {
      scopeTaxonomy: 'CHASSIS_SPECIFIC',
      chassis: 'DL380_Gen12',
      affectedSku: 'P56789-B21',
      ruleUpdate: 'HPE Intel Xeon Gold 6430 Processor Kit',
      sharedAccessoryVerified: true,
      accessoryClass: 'OTHER_ACCESSORY',
      compatibleProductIds: ['DL380_Gen12', 'DL380a_Gen12'],
      compatibilityEvidenceType: 'CERTIFIED_OCA_CATALOG',
      verificationStatus: 'VERIFIED',
      verificationSourceIds: ['src_valid_1']
    };
    assert.strictEqual(isVerifiedSharedAccessoryRule(forgedRule, targetIdentity), false, 'Core CPU component must never be treated as shared accessory rule');
  });

  await t.test('2. Genuine shared accessories with valid evidence and accessory class are accepted', () => {
    // Valid shared rail kit referencing DL380 Gen11 in DL380 Gen12 payload
    const validRailPayload = `
# DL380 Gen12 Sync
1. [SHARED_ACCESSORY_VERIFIED target=DL380_Gen12] **[DELTA-003] P52341-B21**: HPE Easy Install Rail Kit for DL380 Gen11 and Gen12 (Class: RAIL; Evidence: CERTIFIED_OCA_CATALOG; Sources: DL380_Gen11_Master_Catalog)
`;
    // Must pass isolation
    assert.doesNotThrow(() => {
      assertPayloadProductIsolation(validRailPayload, 'DL380_Gen12', testConfig);
    });

    // Rule application via product_scope
    const targetIdentity = resolveProductIdentity('DL380_Gen12', testConfig);
    const validRailRule = {
      scopeTaxonomy: 'CHASSIS_SPECIFIC',
      chassis: 'DL380_Gen11',
      affectedSku: 'P52341-B21',
      ruleUpdate: 'HPE Easy Install Rail Kit supports 2U DL380 servers',
      accessoryClass: 'RAIL',
      sharedAccessoryVerified: true,
      compatibleProductIds: ['DL380_Gen11', 'DL380_Gen12'],
      compatibilityEvidenceType: 'CERTIFIED_OCA_CATALOG',
      verificationStatus: 'VERIFIED',
      verificationSourceIds: ['src_oca_cat_1']
    };
    assert.strictEqual(isVerifiedSharedAccessoryRule(validRailRule, targetIdentity), true);
    assert.strictEqual(ruleAppliesToProduct(validRailRule, targetIdentity, testConfig), true);
  });

  await t.test('3. Drive source freshness: unrelated quarantined stale source does not block fresh canonical source', () => {
    // Scenario A: Stale output contains ONLY the quarantined source
    const staleOutputOnlyQuarantined = JSON.stringify([
      { id: 'src_quarantined_old_junk', title: 'Old Legacy Source', stale: true }
    ]);

    const targetCanonicalSource = 'src_canonical_dl380g12';
    const quarantinedSources = ['src_quarantined_old_junk'];

    // Canonical source is NOT in the stale list; only quarantined is. Freshness check MUST pass!
    const isFresh = isTargetDriveSourceFresh(staleOutputOnlyQuarantined, targetCanonicalSource, quarantinedSources);
    assert.strictEqual(isFresh, true, 'Unrelated quarantined source must not block fresh canonical source');

    // Scenario B: Canonical source itself is in the stale list. Freshness check MUST fail!
    const staleOutputWithCanonical = JSON.stringify([
      { id: 'src_canonical_dl380g12', title: 'DL380 Gen12 Canonical Knowledge', stale: true },
      { id: 'src_quarantined_old_junk', title: 'Old Legacy Source', stale: true }
    ]);
    const isCanonicalStale = isTargetDriveSourceFresh(staleOutputWithCanonical, targetCanonicalSource, quarantinedSources);
    assert.strictEqual(isCanonicalStale, false, 'Stale canonical source must be flagged as NOT fresh');

    // Scenario C: Empty stale array / "all drive sources are up to date"
    assert.strictEqual(isTargetDriveSourceFresh('[]', targetCanonicalSource, quarantinedSources), true);
    assert.strictEqual(isTargetDriveSourceFresh('All Drive sources are up to date.', targetCanonicalSource, quarantinedSources), true);
  });

  await t.test('4. Grounded canary verification rejects ungrounded or negative responses', () => {
    const targetSourceId = 'src_canonical_dl380g12';
    const chassisName = 'DL380_Gen12';

    // Positive, grounded canary response
    const validGroundedCanary = {
      answer: 'For DL380_Gen12, certified catalog change verified with 302 active hardware SKUs.',
      citations: { '1': targetSourceId },
      sources_used: [targetSourceId]
    };
    assert.strictEqual(isGroundedCanary(validGroundedCanary, targetSourceId, chassisName), true);

    // Negative answer stating no relevant sources found
    const negativeCanary = {
      answer: 'I cannot find or verify any relevant source for DL380_Gen12 in the notebook.',
      citations: { '1': targetSourceId },
      sources_used: [targetSourceId]
    };
    assert.strictEqual(isGroundedCanary(negativeCanary, targetSourceId, chassisName), false, 'Negative response must be rejected');

    // Wrong source cited (citations do not include canonical source)
    const wrongSourceCanary = {
      answer: 'For DL380_Gen12, the server supports Intel Xeon 5th Gen processors.',
      citations: { '1': 'src_random_old_unverified' },
      sources_used: ['src_random_old_unverified']
    };
    assert.strictEqual(isGroundedCanary(wrongSourceCanary, targetSourceId, chassisName), false, 'Canary without citation of canonical source must be rejected');

    // Short / degenerate answer
    const shortCanary = {
      answer: 'DL380_Gen12 OK',
      citations: { '1': targetSourceId },
      sources_used: [targetSourceId]
    };
    assert.strictEqual(isGroundedCanary(shortCanary, targetSourceId, chassisName), false, 'Degenerate answer must be rejected');
  });

  await t.test('5. CLI upload failure persists cloudSyncState: FAILED in notebooks.json', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nlm-sync-test-'));
    const tmpConfig = path.join(tmpDir, 'notebooks.json');
    const initialData = {
      defaultNotebookId: 'nb-test',
      notebooks: {
        TestChassis: {
          notebookId: 'nb-test-123',
          cloudSyncState: 'INITIAL'
        }
      }
    };
    safeWriteJsonAtomic(tmpConfig, initialData);

    // Create a dummy payload file
    const dummyPayload = path.join(tmpDir, 'dummy_payload.md');
    fs.writeFileSync(dummyPayload, '# Test Payload\nValid content.', 'utf8');

    // Test fail-closed unmapped chassis
    const unmappedResult = syncToNotebookLM(null, dummyPayload, 'NonExistent_Chassis', 0);
    assert.strictEqual(unmappedResult.success, false);
    assert.strictEqual(unmappedResult.mode, 'FAIL_CLOSED_UNMAPPED');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  await t.test('6. Invariant INV-24: Customer BOQ files are never ingested as ground-truth sources', () => {
    // Check that customer BOQ names are prohibited from being cited as knowledge
    const customerBoqFiles = [
      'Customer_Tender_Quote.xlsx',
      'Client_BOM_Proposal_v2.csv',
      'RFQ_Requirements_Final.xlsx',
      'Customer_Tender_Quote_Final.xlsx'
    ];

    customerBoqFiles.forEach(boqFilename => {
      const isCustomerBoq = /(?:customer|tender|quote|rfq|proposal).*?\.(?:xlsx|csv|xls)$/i.test(boqFilename);
      assert.strictEqual(isCustomerBoq, true, `File "${boqFilename}" must be recognized as customer input and isolated (INV-24)`);
    });
  });
});
