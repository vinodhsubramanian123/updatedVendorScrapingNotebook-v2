'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');
const { ProductCapabilityManifestSchema } = require('../../scripts/lib/system/schemas.js');
const { loadAllProductManifests, resolveManifestForKey } = require('../../scripts/lib/rules/product_manifest_loader.js');
const { getPlatformProfile } = require('../../scripts/lib/rules/platform_profiles.js');
const { getVendorAdapter, listVendorAdapters, registerVendorAdapter } = require('../../scripts/lib/adapters/adapter_registry.js');
const { runOnboarding } = require('../../scripts/maintenance/onboard_product.js');
const notebooksConfig = require('../../scripts/config/notebooks.json');

function runTests() {
  console.log('=== WAVE F MANIFESTS, VENDOR ADAPTER REGISTRY & ONBOARDING SUITE ===');
  let passed = 0;
  let failed = 0;

  function check(name, fn) {
    try {
      fn();
      passed++;
      console.log(`  PASS: ${name}`);
    } catch (err) {
      failed++;
      console.error(`  FAIL: ${name} -> ${err.message}`);
    }
  }

  check('All 17 active products have Schema-valid capability manifests and resolve via getPlatformProfile', () => {
    const activeIds = Object.keys(notebooksConfig.notebooks || {}).filter(k => {
      const nb = notebooksConfig.notebooks[k];
      return nb && nb.coverageStatus !== 'ARCHIVED_STUB' && nb.queryEnabled !== false;
    });
    assert.strictEqual(activeIds.length, 17, `Expected 17 active products, got ${activeIds.length}`);

    const loaded = loadAllProductManifests(undefined, { forceReload: true });
    assert.strictEqual(loaded.size, 17, `Expected 17 valid manifests loaded, got ${loaded.size}`);

    for (const id of activeIds) {
      const m = resolveManifestForKey(id);
      assert.ok(m, `Missing manifest for active product ${id}`);
      const checkSchema = ProductCapabilityManifestSchema.safeParse(m);
      assert.strictEqual(checkSchema.success, true, `Schema validation failed for ${id}`);
      const profile = getPlatformProfile(id);
      assert.ok(profile && profile.domain === m.domain, `getPlatformProfile(${id}) failed manifest resolution`);
    }
  });

  check('Adapter registry validates HPE, DELL, HUAWEI, CISCO, LENOVO and dynamic custom adapter', () => {
    const listed = listVendorAdapters().map(a => a.vendorId);
    for (const v of ['HPE', 'DELL', 'HUAWEI', 'CISCO', 'LENOVO']) {
      assert.ok(listed.includes(v), `Missing vendor adapter ${v}`);
      const inst = getVendorAdapter(v);
      assert.ok(inst && inst.descriptor.vendorId === v);
      assert.ok(inst.resolveSupportPolicy({}).tier);
    }

    const cisco = getVendorAdapter('CISCO');
    const ciscoSrv = cisco.classifyComponent({ description: 'Cisco UCS C240 M7 Rack Server' });
    assert.strictEqual(ciscoSrv.domain, 'server');

    const lenovo = getVendorAdapter('LENOVO');
    const lenovoSrv = lenovo.classifyComponent({ description: 'Lenovo ThinkSystem SR650 V3 2U Chassis' });
    assert.strictEqual(lenovoSrv.domain, 'server');

    registerVendorAdapter('MOCK_TEST_VENDOR', () => ({
      descriptor: {
        vendorId: 'MOCK_TEST_VENDOR',
        contractVersion: 1,
        domains: ['server'],
        capabilities: ['IDENTIFIER', 'CLASSIFICATION', 'ROLE_RESOLUTION', 'SUPPORT_POLICY', 'GLOSSARY'],
        implementationStatus: 'IMPLEMENTED',
        evidenceLimits: ['Unit test fixture']
      },
      normalizeIdentifier: s => String(s || '').toUpperCase(),
      classifyComponent: () => ({ role: 'server', domain: 'server' }),
      resolveRole: (role) => ({ role, candidates: [], status: 'UNRESOLVED' }),
      resolveSupportPolicy: () => ({ tier: 'STD', durationYears: 3 }),
      getGlossary: () => ({})
    }));
    assert.ok(getVendorAdapter('MOCK_TEST_VENDOR'));
  });

  check('HpeVendorAdapter.resolveRole resolves real SKUs from scoped catalog data', () => {
    const hpe = getVendorAdapter('HPE');
    const unscoped = hpe.resolveRole('Memory', {});
    assert.strictEqual(unscoped.status, 'SCOPED_CATALOG_REQUIRED');

    const mockCatalog = {
      entries: [
        {
          parentCategory: 'Memory',
          subCategory: 'DDR5 Smart Memory',
          skus: [
            { 'Product #': 'P74879-F21', Description: 'HPE 64GB 2Rx4 DDR5-6400 Smart FIO Memory Kit', 'GPL ($)': '1200' }
          ]
        }
      ]
    };
    const scoped = hpe.resolveRole('Memory', { catalogData: mockCatalog, productId: 'DL380_Gen12' });
    assert.strictEqual(scoped.status, 'RESOLVED');
    assert.ok(scoped.candidates.some(c => c.sku === 'P74879-F21'));
  });

  check('onboard_product CLI infers and validates manifest in --dry-run mode cleanly', () => {
    const tmpCat = path.join(__dirname, '..', '..', 'outputs', 'tmp_onboard_test_catalog.json');
    fs.mkdirSync(path.dirname(tmpCat), { recursive: true });
    fs.writeFileSync(tmpCat, JSON.stringify({
      metadata: { vendor: 'HPE', generation: 'Gen12', family: 'ProLiant Compute' },
      entries: [
        { parentCategory: 'Base Chassis', skus: [{ 'Product #': 'P99999-B21', Description: 'HPE ProLiant DL360 Gen12 1U Server CTO Server' }] }
      ]
    }), 'utf8');
    try {
      const res = runOnboarding(['--product-id', 'DL360_Gen12_Test', '--catalog-path', tmpCat, '--dry-run']);
      assert.strictEqual(res.dryRun, true);
      assert.strictEqual(res.manifest.productId, 'DL360_Gen12_Test');
      assert.strictEqual(res.manifest.formFactor, '1U Rack');
      assert.ok(res.manifest.skuAliases.includes('P99999-B21'));
    } finally {
      if (fs.existsSync(tmpCat)) fs.unlinkSync(tmpCat);
    }
  });

  console.log(`\nSUMMARY: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runTests();
