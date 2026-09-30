'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  SCRAPING_VERIFIABILITY_MATRIX,
  verifyScrapingStep,
  selfReflectOnScrapingSession,
  AtomicStepAnomalyError
} = require('../../scripts/lib/scraper/scraping_verifiability.js');

test('Scraping Verifiability Matrix structure covers Steps 1 to 10', () => {
  for (let step = 1; step <= 10; step++) {
    const spec = SCRAPING_VERIFIABILITY_MATRIX[step];
    assert.ok(spec, `Step ${step} must be defined in SCRAPING_VERIFIABILITY_MATRIX`);
    assert.ok(typeof spec.stage === 'string' && spec.stage.length > 0, `Step ${step} stage must be non-empty`);
    assert.ok(typeof spec.name === 'string' && spec.name.length > 0, `Step ${step} name must be non-empty`);
    assert.ok(Array.isArray(spec.assertions) && spec.assertions.length > 0, `Step ${step} must have assertions`);

    for (const a of spec.assertions) {
      assert.ok(typeof a.id === 'string' && a.id.length > 0, `Assertion id must be non-empty in step ${step}`);
      assert.ok(typeof a.description === 'string', `Assertion description must be string in step ${step}`);
      assert.ok(typeof a.verify === 'function', `Assertion verify must be function in step ${step}`);
      assert.ok(typeof a.remediation === 'string' && a.remediation.length > 0, `Assertion remediation must be non-empty in step ${step}`);
    }
  }
});

test('Step 1 (CDP_CONNECT) verification logic', () => {
  // Pass with wsConnected flag
  const pass1 = verifyScrapingStep(1, { wsConnected: true });
  assert.equal(pass1.valid, true);
  assert.equal(pass1.stage, 'CDP_CONNECT');
  assert.equal(pass1.checks[0].id, 'WS_CONNECTED');
  assert.equal(pass1.checks[0].passed, true);

  // Pass with readyState === 1
  const pass2 = verifyScrapingStep(1, { ws: { readyState: 1 } });
  assert.equal(pass2.valid, true);

  // Fail when disconnected
  const fail = verifyScrapingStep(1, { wsConnected: false, ws: null });
  assert.equal(fail.valid, false);
  assert.equal(fail.failure.assertionId, 'WS_CONNECTED');
  assert.ok(fail.failure.remediation.includes('9222'));
});

test('Step 2 (PORTAL_NAV) verification logic', () => {
  const pass = verifyScrapingStep(2, { solutionName: 'HPE ProLiant DL380 Gen12' });
  assert.equal(pass.valid, true);
  assert.equal(pass.stage, 'PORTAL_NAV');

  const fail = verifyScrapingStep(2, { solutionName: '' });
  assert.equal(fail.valid, false);
  assert.equal(fail.failure.assertionId, 'SOLUTION_RESOLVED');
});

test('Step 3 (CATEGORY_DISCOVERY) verification logic', () => {
  const pass = verifyScrapingStep(3, {
    cleanName: 'DL380_Gen12',
    family: 'ProLiant',
    gen: 'Gen12',
    firewallPassed: true
  });
  assert.equal(pass.valid, true);
  assert.equal(pass.stage, 'CATEGORY_DISCOVERY');

  const failIdentity = verifyScrapingStep(3, {
    cleanName: 'Unknown',
    family: 'ProLiant',
    gen: 'Gen12'
  });
  assert.equal(failIdentity.valid, false);
  assert.equal(failIdentity.failure.assertionId, 'PRODUCT_IDENTITY_VALID');

  const failFirewall = verifyScrapingStep(3, {
    cleanName: 'DL380_Gen12',
    family: 'ProLiant',
    gen: 'Gen12',
    firewallPassed: false
  });
  assert.equal(failFirewall.valid, false);
  assert.equal(failFirewall.failure.assertionId, 'PRODUCT_FIREWALL_VERIFIED');
});

test('Step 4 (PAGE_EXPAND) verification logic', () => {
  const pass = verifyScrapingStep(4, { tablesCount: 15, scrollHeight: 18000, totalRows: 240 });
  assert.equal(pass.valid, true);
  assert.equal(pass.stage, 'PAGE_EXPAND');

  const fail = verifyScrapingStep(4, { tablesCount: 0 });
  assert.equal(fail.valid, false);
  assert.equal(fail.failure.assertionId, 'TABLES_DETECTED_POST_EXPAND');
});

test('Step 5 (DOM_EXTRACTION) verification logic', () => {
  const pass = verifyScrapingStep(5, { textLength: 120000, rowsCount: 450 });
  assert.equal(pass.valid, true);
  assert.equal(pass.stage, 'DOM_EXTRACTION');

  const failText = verifyScrapingStep(5, { textLength: 10, rowsCount: 450 });
  assert.equal(failText.valid, false);
  assert.equal(failText.failure.assertionId, 'TEXT_PAYLOAD_AVAILABLE');

  const failRows = verifyScrapingStep(5, { textLength: 120000, rowsCount: 0 });
  assert.equal(failRows.valid, false);
  assert.equal(failRows.failure.assertionId, 'ROWS_SCRAPED_NON_ZERO');
});

test('Step 6 (RULES_PARSING) verification logic', () => {
  const pass = verifyScrapingStep(6, { ctoVariantsCount: 5 });
  assert.equal(pass.valid, true);
  assert.equal(pass.stage, 'RULES_PARSING');

  const fail = verifyScrapingStep(6, { ctoVariantsCount: 0 });
  assert.equal(fail.valid, false);
  assert.equal(fail.failure.assertionId, 'CTO_VARIANTS_IDENTIFIED');
});

test('Step 7 (CATALOG_GEN) verification logic', () => {
  const pass = verifyScrapingStep(7, { diffAnomalySafe: true, recommendedColumnVerified: true });
  assert.equal(pass.valid, true);
  assert.equal(pass.stage, 'CATALOG_GEN');

  const failDiff = verifyScrapingStep(7, { diffAnomalySafe: false, recommendedColumnVerified: true });
  assert.equal(failDiff.valid, false);
  assert.equal(failDiff.failure.assertionId, 'DIFF_ANOMALY_SAFE');

  const failRec = verifyScrapingStep(7, { diffAnomalySafe: true, recommendedColumnVerified: false });
  assert.equal(failRec.valid, false);
  assert.equal(failRec.failure.assertionId, 'RECOMMENDED_COLUMN_POPULATED');
});

test('Step 8 (STAGING_AUDIT) verification logic', () => {
  const pass = verifyScrapingStep(8, { tallyAuditPassed: true });
  assert.equal(pass.valid, true);
  assert.equal(pass.stage, 'STAGING_AUDIT');

  const fail = verifyScrapingStep(8, { tallyAuditPassed: false });
  assert.equal(fail.valid, false);
  assert.equal(fail.failure.assertionId, 'TALLY_AUDIT_PASSED');
});

test('Step 9 (KNOWLEDGE_SYNC) verification logic', () => {
  const pass = verifyScrapingStep(9, { cloudSyncVerified: true });
  assert.equal(pass.valid, true);
  assert.equal(pass.stage, 'KNOWLEDGE_SYNC');

  const fail = verifyScrapingStep(9, { cloudSyncVerified: false });
  assert.equal(fail.valid, false);
  assert.equal(fail.failure.assertionId, 'CLOUD_SYNC_VERIFIED');
});

test('Step 10 (REGISTRY_SYNC) verification logic', () => {
  const pass = verifyScrapingStep(10, { registryUpdated: true });
  assert.equal(pass.valid, true);
  assert.equal(pass.stage, 'REGISTRY_SYNC');

  const fail = verifyScrapingStep(10, { registryUpdated: false });
  assert.equal(fail.valid, false);
  assert.equal(fail.failure.assertionId, 'REGISTRY_UPDATED');
});

test('Unknown step fails closed without throwing', () => {
  const result = verifyScrapingStep(999, {});
  assert.equal(result.valid, false);
  assert.equal(result.stage, 'UNKNOWN_STEP');
  assert.equal(result.stepNum, 999);
  assert.deepEqual(result.checks, []);
});

test('AtomicStepAnomalyError captures diagnostics correctly', () => {
  const err = new AtomicStepAnomalyError(
    7,
    'CATALOG_GEN',
    'DIFF_ANOMALY_SAFE',
    'Catalog dropped >25% SKUs unexpectedly',
    { previousCount: 100, newCount: 50 }
  );

  assert.equal(err.name, 'AtomicStepAnomalyError');
  assert.equal(err.stepNum, 7);
  assert.equal(err.stage, 'CATALOG_GEN');
  assert.equal(err.assertionId, 'DIFF_ANOMALY_SAFE');
  assert.deepEqual(err.diagnosticContext, { previousCount: 100, newCount: 50 });
  assert.ok(err.message.includes('[Step 7: CATALOG_GEN]'));
  assert.ok(err.message.includes('DIFF_ANOMALY_SAFE'));
});

test('selfReflectOnScrapingSession writes structured reflection to disk', () => {
  const testSession = {
    product: 'TEST_PROD_GENX',
    family: 'ProLiant',
    generation: 'GenX',
    durationMs: 42000,
    totalSkusScraped: 520,
    hwSkuCount: 480,
    serviceSkuCount: 40,
    cloudSyncState: 'CLOUD_VERIFIED',
    anomalies: ['Transient slow scroll on category 4'],
    remediations: ['Auto-retried expandSections after 4000ms'],
    stepTelemetry: {
      1: { valid: true },
      2: { valid: true }
    }
  };

  const reflection = selfReflectOnScrapingSession(testSession);
  assert.ok(reflection.reflectionId.startsWith('REFL-'));
  assert.equal(reflection.product, 'TEST_PROD_GENX');
  assert.equal(reflection.totalSkusScraped, 520);
  assert.equal(reflection.hwSkuCount, 480);
  assert.equal(reflection.serviceSkuCount, 40);
  assert.equal(reflection.cloudSyncState, 'CLOUD_VERIFIED');
  assert.deepEqual(reflection.anomaliesEncountered, ['Transient slow scroll on category 4']);
  assert.deepEqual(reflection.remediationsApplied, ['Auto-retried expandSections after 4000ms']);

  const reflectionsDir = path.join(__dirname, '..', '..', 'outputs', 'history', 'scraping_reflections');
  const files = fs.readdirSync(reflectionsDir).filter(f => f.includes('TEST_PROD_GENX'));
  assert.ok(files.length >= 1, 'Reflection file must exist on disk');

  // Verify file content matches
  const writtenFile = path.join(reflectionsDir, files[0]);
  const diskData = JSON.parse(fs.readFileSync(writtenFile, 'utf8'));
  assert.equal(diskData.product, 'TEST_PROD_GENX');
  assert.equal(diskData.totalSkusScraped, 520);

  // Clean up test artifact
  try {
    fs.unlinkSync(writtenFile);
  } catch (_) {}
});

test('Missing affirmative evidence cannot pass a stage', () => {
  for (const step of [3, 7, 8, 9, 10]) assert.equal(verifyScrapingStep(step, {}).valid, false);
});
