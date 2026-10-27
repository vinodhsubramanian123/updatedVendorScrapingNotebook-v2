'use strict';
/**
 * tests/unit/test_portal_receipt.js — Unit Tests for Scoped Tier 3 Portal Receipt Binding
 *
 * Validates R-13 requirements:
 * - Immutable scoped receipt tied to restored candidate state
 * - Invalidation on chassis, base SKU, owning configuration, selector, or quantity changes
 * - Rejection of stale (>24h), unbuildable, or price-mismatched portal captures
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { safeWriteJsonAtomic } = require('../../scripts/lib/system/fs_compat');

const {
  readPortalReceipt,
  receiptMatches
} = require('../../scripts/lib/boq/portal_receipt.js');
const { validateBoqEvaluationCriteria } = require('../../scripts/lib/boq/bom_verifier.js');

function createMockPortalEvidenceDir(tmpDir, overrides = {}) {
  const evidenceDir = path.join(tmpDir, 'evidence');
  fs.mkdirSync(evidenceDir, { recursive: true });

  const capturedAt = overrides.capturedAt || new Date().toISOString();
  const configName = overrides.configName || 'Config_1';
  const rows = overrides.rows || [
    ['Hierarchy', 'Qty', 'Product #', 'Product Description', 'Config Name', 'Unit Price (USD)', 'Ext. Price (USD)'],
    ['1', '1', 'P73282-B21', 'HPE ProLiant DL380 Gen12 8SFF CTO Server', configName, '1,500.00', '1,500.00'],
    ['1.1', '2', 'P74573-B21', 'Intel Xeon Gold 6530 Processor', configName, '1,200.00', '2,400.00'],
    ['1.2', '1', 'P48820-B21', 'High Performance Fan Kit', configName, '150.00', '150.00']
  ];

  const totalUsd = overrides.totalUsd !== undefined ? overrides.totalUsd : '4,050.00';
  const bomText = overrides.bomText || `Solution List Price USD ${totalUsd}\nDetailed configuration list.`;
  const checkText = overrides.checkText || 'Overall Status: OK Unbuildables 0 Errors: 0 Warnings: 0 Process control 0';
  const capturedScope = overrides.capturedScope === undefined ? {
    chassis: 'DL380_Gen12', baseSku: 'P73282-B21', configurationName: configName,
    selectors: { ambientTempMaxC: 27, cpuCount: 2 }
  } : overrides.capturedScope;

  safeWriteJsonAtomic(path.join(evidenceDir, 'clic_corrected_bom.json'), {
    capturedAt,
    capturedScope,
    text: bomText,
    tables: [{ rows }]
  });

  safeWriteJsonAtomic(path.join(evidenceDir, 'clic_corrected_configuration.json'), {
    capturedAt,
    capturedScope: overrides.checkScope === undefined ? capturedScope : overrides.checkScope,
    text: checkText
  });

  return tmpDir;
}

test('Portal Receipt — reads and verifies valid portal evidence', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-rcpt-test-'));
  try {
    createMockPortalEvidenceDir(tmpDir);
    const receipt = readPortalReceipt(tmpDir, { chassis: 'DL380_Gen12' });

    assert.ok(receipt, 'Valid evidence must produce a receipt');
    assert.equal(receipt.status, 'CLIC_ACCEPTED');
    assert.equal(receipt.chassis, 'DL380_Gen12');
    assert.equal(receipt.baseSku, 'P73282-B21');
    assert.equal(receipt.configurationName, 'Config_1');
    assert.equal(receipt.rows.length, 3);
    assert.equal(receipt.totalUsd, 4050);
    assert.ok(receipt.manifestSha256, 'Manifest SHA-256 must be computed');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Portal Receipt — receiptMatches binds candidate scope strictly (R-13)', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-rcpt-scope-'));
  try {
    createMockPortalEvidenceDir(tmpDir);
    const receipt = readPortalReceipt(tmpDir, {
      chassis: 'DL380_Gen12',
      selectors: { ambientTempMaxC: 27, cpuCount: 2 }
    });

    const matchingCandidate = {
      chassis: 'DL380_Gen12',
      baseSku: 'P73282-B21',
      configurationName: 'Config_1',
      selectors: { ambientTempMaxC: 27, cpuCount: 2 },
      items: [
        { sku: 'P73282-B21', quantity: 1 },
        { sku: 'P74573-B21', quantity: 2 },
        { sku: 'P48820-B21', quantity: 1 }
      ]
    };

    // 1. Matches when scope and manifest are identical
    assert.equal(receiptMatches(receipt, matchingCandidate), true);

    // 2. Fails when chassis differs
    const mismatchedChassis = { ...matchingCandidate, chassis: 'DL360_Gen12' };
    assert.equal(receiptMatches(receipt, mismatchedChassis), false, 'Chassis mismatch must invalidate receipt');

    // 3. Fails when base SKU differs
    const mismatchedBase = { ...matchingCandidate, baseSku: 'P73283-B21' };
    assert.equal(receiptMatches(receipt, mismatchedBase), false, 'Base SKU mismatch must invalidate receipt');

    // 4. Fails when owning configuration differs
    const mismatchedConfig = { ...matchingCandidate, configurationName: 'Config_99' };
    assert.equal(receiptMatches(receipt, mismatchedConfig), false, 'Configuration owner mismatch must invalidate receipt');

    // 5. Fails when selector state differs
    const mismatchedSelectors = { ...matchingCandidate, selectors: { ambientTempMaxC: 35, cpuCount: 2 } };
    assert.equal(receiptMatches(receipt, mismatchedSelectors), false, 'Selector mismatch must invalidate receipt');

    // 6. Fails when SKU quantity differs
    const mismatchedQuantity = {
      ...matchingCandidate,
      items: [
        { sku: 'P73282-B21', quantity: 1 },
        { sku: 'P74573-B21', quantity: 1 }, // Changed from 2 to 1
        { sku: 'P48820-B21', quantity: 1 }
      ]
    };
    assert.equal(receiptMatches(receipt, mismatchedQuantity), false, 'Quantity mismatch must invalidate receipt');

    // 7. Fails when extra SKU is added
    const extraSkuCandidate = {
      ...matchingCandidate,
      items: [
        ...matchingCandidate.items,
        { sku: 'P99999-B21', quantity: 1 }
      ]
    };
    assert.equal(receiptMatches(receipt, extraSkuCandidate), false, 'Extra SKU must invalidate receipt');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Portal Receipt — rejects stale (>24h) or unbuildable portal captures', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-rcpt-stale-'));
  try {
    // 1. Stale capture (> 24 hours ago)
    const staleTime = new Date(Date.now() - 25 * 3600000).toISOString();
    createMockPortalEvidenceDir(tmpDir, { capturedAt: staleTime });
    assert.equal(readPortalReceipt(tmpDir), null, 'Receipt older than 24 hours must be rejected');

    // 2. Unbuildable status in CLIC inspection text
    fs.rmSync(path.join(tmpDir, 'evidence'), { recursive: true, force: true });
    createMockPortalEvidenceDir(tmpDir, {
      checkText: 'Overall Status: ERROR Unbuildables 1 Errors: 1 Warnings: 0 Process control 0'
    });
    assert.equal(readPortalReceipt(tmpDir), null, 'Unbuildable CLIC status must be rejected');

    // 3. Mismatched solution total price
    fs.rmSync(path.join(tmpDir, 'evidence'), { recursive: true, force: true });
    createMockPortalEvidenceDir(tmpDir, {
      totalUsd: '99,999.00' // Table is 4,050.00, mismatch!
    });
    assert.equal(readPortalReceipt(tmpDir), null, 'Mismatched total USD must be rejected');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Portal Receipt — missing scope is an observation, never supplied by reader expectations', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-unscoped-'));
  try {
    createMockPortalEvidenceDir(tmpDir, { capturedScope: null });
    const receipt = readPortalReceipt(tmpDir, { chassis: 'DL380_Gen12', baseSku: 'P73282-B21', selectors: {} });
    assert.equal(receipt.status, 'CLIC_OBSERVED_UNSCOPED');
    assert.equal(receipt.chassis, null);
    assert.equal(receipt.selectors, null);
    assert.equal(receiptMatches(receipt, receipt.rows), false);
    createMockPortalEvidenceDir(tmpDir, { checkScope: { chassis: 'another-product' } });
    assert.equal(readPortalReceipt(tmpDir).status, 'CLIC_OBSERVED_UNSCOPED');
  } finally { fs.rmSync(tmpDir, { recursive: true, force: true }); }
});

test('Portal Receipt — rejects incomplete selectors, invalid quantities, altered hash, owner gaps and cached expiry', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-negative-'));
  try {
    createMockPortalEvidenceDir(tmpDir);
    const receipt = readPortalReceipt(tmpDir);
    const candidate = {
      chassis: 'DL380_Gen12', baseSku: 'P73282-B21', configurationName: 'Config_1',
      selectors: { ambientTempMaxC: 27, cpuCount: 2 },
      items: receipt.rows.map(row => ({ sku: row.sku, quantity: row.quantity }))
    };
    assert.equal(receiptMatches(receipt, candidate), true);
    assert.equal(receiptMatches(receipt, { ...candidate, serverCount: 2 }), false, 'Per-node manifest cannot certify a multiplied order');
    assert.equal(receiptMatches(receipt, { ...candidate, selectors: { ambientTempMaxC: 27 } }), false);
    assert.equal(receiptMatches({ ...receipt, selectors: { ambientTempMaxC: 27 } }, candidate), false);
    assert.equal(receiptMatches(receipt, { ...candidate, configurationName: undefined }), false);
    assert.equal(receiptMatches(receipt, { ...candidate, chassis: undefined }), false);
    assert.equal(receiptMatches(receipt, { ...candidate, baseSku: undefined }), false);
    assert.equal(receiptMatches({ ...receipt, manifestSha256: '0'.repeat(64) }, candidate), false);
    assert.equal(receiptMatches({ ...receipt, capturedAt: new Date(Date.now() - 25 * 3600000).toISOString() }, candidate), false);
    for (const quantity of [0, -1, 1.5, NaN, undefined, true, [1]]) {
      const invalid = structuredClone(candidate);
      invalid.items[0].quantity = quantity;
      assert.equal(receiptMatches(receipt, invalid), false);
    }
    const moved = structuredClone(candidate);
    moved.items[0].configurationId = 'unproved-configuration';
    assert.equal(receiptMatches(receipt, moved), false);
    delete moved.items[0].configurationId;
    moved.items[0].parentId = 'unproved-owner';
    assert.equal(receiptMatches(receipt, moved), false);
  } finally { fs.rmSync(tmpDir, { recursive: true, force: true }); }
});

test('Gate B19 Hardened Verification — rejects readiness, truthy scalars, timestamp-only and stale receipts', () => {
  // 1. Truthy scalar rejected
  const resScalar = validateBoqEvaluationCriteria({
    portalValidationStatus: 'ACCEPTED_BY_VENDOR',
    sessionReceipt: true,
    items: [{ sku: 'P73282-B21', quantity: 1 }]
  });
  const b19Scalar = resScalar.find(c => c.id === 'B19');
  assert.equal(b19Scalar.status, 'FAILED');
  assert.ok(b19Scalar.detail.includes('lacks official session receipt'));

  // 2. Readiness receipt rejected
  const resReady = validateBoqEvaluationCriteria({
    portalValidationStatus: 'CLIC_ACCEPTED',
    sessionReceipt: { status: 'READY', sessionId: 'sess-123' },
    items: [{ sku: 'P73282-B21', quantity: 1 }]
  });
  const b19Ready = resReady.find(c => c.id === 'B19');
  assert.equal(b19Ready.status, 'FAILED');
  assert.ok(b19Ready.detail.includes('Session readiness receipt'));

  // 3. Timestamp-only object without status/manifest rejected
  const resTimestampOnly = validateBoqEvaluationCriteria({
    portalValidationStatus: 'ACCEPTED_BY_VENDOR',
    sessionReceipt: { startedAt: new Date().toISOString() },
    items: [{ sku: 'P73282-B21', quantity: 1 }]
  });
  const b19TimestampOnly = resTimestampOnly.find(c => c.id === 'B19');
  assert.equal(b19TimestampOnly.status, 'FAILED');
  assert.ok(b19TimestampOnly.detail.includes('missing required verification fields'));

  // 4. Conflicting output vs context validation statuses fail closed
  const resConflict = validateBoqEvaluationCriteria(
    { portalValidationStatus: 'ACCEPTED_BY_VENDOR', items: [{ sku: 'P73282-B21', quantity: 1 }] },
    { portalValidationStatus: 'PORTAL_VALIDATION_PENDING' }
  );
  const b19Conflict = resConflict.find(c => c.id === 'B19');
  assert.equal(b19Conflict.status, 'FAILED');
  assert.ok(b19Conflict.detail.includes('Conflicting portal validation claims'));

  // 5. Future capture timestamp rejected
  const resFuture = validateBoqEvaluationCriteria({
    portalValidationStatus: 'CLIC_ACCEPTED',
    sessionReceipt: {
      status: 'CLIC_ACCEPTED',
      capturedAt: new Date(Date.now() + 10 * 60000).toISOString(),
      manifestSha256: 'a'.repeat(64)
    },
    items: [{ sku: 'P73282-B21', quantity: 1 }]
  });
  const b19Future = resFuture.find(c => c.id === 'B19');
  assert.equal(b19Future.status, 'FAILED');
  assert.ok(b19Future.detail.includes('future'));
});
