'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { safeWriteJsonAtomic } = require('../../scripts/lib/system/fs_compat');
const { buildRuntimeDiscoveryPlan, formatRuntimeDiscoveryPlan } = require('../../scripts/lib/boq/runtime_discovery_plan');
const { validateUniversalCriteria } = require('../../scripts/lib/boq/bom_verifier');
const { resolveProductIdentity } = require('../../scripts/lib/catalog/product_scope');

// Synthetic fixtures; not product compatibility evidence.
const catalog = { metadata: { model: 'DL380_Gen12' }, entries: [
  { parentCategory: 'Chassis', skus: [{ sku: 'P73282-B21', 'Option Type': 'CTO' }] },
  { parentCategory: 'GPU', skus: [{ sku: 'P47824-B21', visibilityState: 'PORTAL_CONDITIONAL', conditionKey: 'ambientTempC', conditionOperator: 'lte', thresholdValue: 27 }] }
] };
const items = [
  { sku: 'P73282-B21', quantity: 1, configurationId: 'sheet1/configA' },
  { sku: 'P47824-B21#0D1', quantity: 2, configurationId: 'sheet1/configA' },
  { sku: 'P99999-B21', quantity: 1, configurationId: 'sheet1/configA' }
];
const options = { catalogData: catalog, productId: 'DL380_Gen12' };

test('plan retains conditional and absent SKUs without declaring incompatibility or acceptance', () => {
  const plan = buildRuntimeDiscoveryPlan({ items }, options);
  assert.equal(plan.configurations[0].probes.length, 2);
  assert.equal(plan.configurations[0].probes[0].conditions[0].thresholdValue, 27);
  assert.equal(plan.configurations[0].probes[1].reason, 'ABSENT_FROM_CAPTURE_NOT_PROOF_OF_UNSUPPORTED');
  assert.equal(plan.configurations[0].manifest.find(row => row.sku.includes('#')).sku, 'P47824-B21#0D1');
  assert.equal(plan.configurations[0].status, 'PORTAL_VALIDATION_PENDING');
  assert.match(formatRuntimeDiscoveryPlan(plan), /P99999-B21/);
  assert.match(plan.unattendedSelectorExecution, /NOT_IMPLEMENTED/);
});

test('runtime fingerprint changes with quantity, owner, selector, catalog or suffix; row order is stable', () => {
  const fingerprint = (parts, extra = {}) => buildRuntimeDiscoveryPlan({ items: parts }, { ...options, ...extra }).configurations[0].manifestSha256;
  const baseline = fingerprint(items);
  assert.equal(fingerprint([...items].reverse()), baseline);
  assert.notEqual(fingerprint(items.map(row => ({ ...row, quantity: row.quantity + 1 }))), baseline);
  assert.notEqual(fingerprint(items.map(row => ({ ...row, configurationId: 'sheet2/configB' }))), baseline);
  assert.notEqual(fingerprint(items, { selectorsByConfiguration: { 'sheet1/configA': { ambientTempC: 35 } } }), baseline);
  assert.notEqual(fingerprint(items.map(row => ({ ...row, sku: row.sku.replace('#0D1', '#BTO') }))), baseline);
  assert.notEqual(fingerprint(items, { catalogData: { ...catalog, metadata: { ...catalog.metadata, scrapeTimestamp: '2026-09-30T00:00:00Z' } } }), baseline);
});

test('every rank and owner remains separate; only identical scoped manifests deduplicate', () => {
  const plan = buildRuntimeDiscoveryPlan({ items, rankedSolutions: [
    { rank: '1L', skuPartsList: items },
    { rank: '1A', skuPartsList: items.map(row => ({ ...row, configurationId: 'sheet2/configB' })) }
  ] }, options);
  assert.equal(plan.configurations.length, 3);
  assert.equal(plan.uniqueProbeManifests, 2);
});

test('persisted conditional rules and services are used; unreadable evidence remains a blocker', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-discovery-'));
  const dir = path.join(root, 'DL380_Gen12');
  fs.mkdirSync(path.join(dir, 'raw_data'), { recursive: true });
  try {
    safeWriteJsonAtomic(path.join(dir, 'DL380_Gen12_Catalog.json'), catalog);
    safeWriteJsonAtomic(path.join(dir, 'DL380_Gen12_Services.json'), { entries: [{ skus: [{ sku: 'H01A1E' }] }] });
    safeWriteJsonAtomic(path.join(dir, 'raw_data/conditional_skus.json'), { skus: [{ sku: 'P99999-B21', conditionType: 'AMBIENT_GATE', thresholdDegC: 25, operator: 'lte' }] });
    const plan = buildRuntimeDiscoveryPlan({ items: [...items, { sku: 'H01A1E', quantity: 1, configurationId: 'sheet1/configA' }] }, { targetDir: dir });
    assert.ok(plan.configurations[0].probes.some(probe => probe.sku === 'P99999-B21' && probe.reason === 'PORTAL_CONDITIONAL'));
    assert.ok(!plan.configurations[0].probes.some(probe => probe.sku === 'H01A1E'));
    fs.writeFileSync(path.join(dir, 'raw_data/conditional_skus.json'), '{');
    assert.ok(buildRuntimeDiscoveryPlan({ items }, { targetDir: dir }).configurations[0].blockers.some(reason => reason.startsWith('UNREADABLE_EVIDENCE')));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('acceptance exposes unresolved investigations even if supplied a fabricated completed plan', () => {
  const checks = validateUniversalCriteria({ items, runtimeDiscoveryPlan: { status: 'ACCEPTED' } }, options);
  assert.equal(checks.find(check => check.id === 'U6').status, 'UNKNOWN');
});

test('unknown generation cannot resolve to a different registered generation', () => {
  const registry = { notebooks: { DL380_Gen12: { vendor: 'HPE', family: 'ProLiant', gen: 'Gen12' } } };
  assert.equal(resolveProductIdentity('DL380 Gen13', registry), null);
});
