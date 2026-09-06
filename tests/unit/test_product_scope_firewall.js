'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const notebookConfig = require('../../scripts/config/notebooks.json');
const config = require('../../scripts/config/notebooks.json');
const {
  resolveProductIdentity,
  ruleAppliesToProduct,
  scopeRegistryForProduct
} = require('../../scripts/lib/catalog/product_scope.js');

test('product identities distinguish DL380, DL380a, DL145, and generations', () => {
  const dl380g12 = resolveProductIdentity('DL380_Gen12_SFF', config);
  const dl380a = resolveProductIdentity('DL380a_Gen12', config);
  const dl145 = resolveProductIdentity('DL145_Gen11', config);
  assert.equal(dl380g12.productId, 'DL380_Gen12');
  assert.equal(dl380a.productId, 'DL380a_Gen12');
  assert.equal(dl145.generation, 'Gen11');
  assert.notEqual(dl380g12.productId, dl380a.productId);
});

test('chassis-specific and family-generation rules cannot cross scope boundaries', () => {
  const dl380g12 = resolveProductIdentity('DL380_Gen12', config);
  const dl380a = resolveProductIdentity('DL380a_Gen12', config);
  const dl380g11 = resolveProductIdentity('DL380_Gen11', config);
  const specific = { scopeTaxonomy: 'CHASSIS_SPECIFIC', chassis: 'DL380_Gen12' };
  const legacyProductRule = { scopeTaxonomy: 'FAMILY_GEN', chassis: 'DL380_Gen12' };
  const verifiedFamilyGen = { scopeTaxonomy: 'FAMILY_GEN', chassis: 'DL380_Gen12', familyWideVerified: true };
  assert.equal(ruleAppliesToProduct(specific, dl380g12, config), true);
  assert.equal(ruleAppliesToProduct(specific, dl380a, config), false);
  assert.equal(ruleAppliesToProduct(legacyProductRule, dl380a, config), false);
  assert.equal(ruleAppliesToProduct(verifiedFamilyGen, dl380a, config), true);
  assert.equal(ruleAppliesToProduct(verifiedFamilyGen, dl380g11, config), false);
});

test('product registry projection contains only applicable rules', () => {
  const registry = {
    universalRules: [{ deltaId: 'U', scopeTaxonomy: 'UNIVERSAL_VENDOR', vendor: 'HPE' }],
    familyGenRules: [
      { deltaId: 'G12', scopeTaxonomy: 'FAMILY_GEN', chassis: 'DL380_Gen12', familyWideVerified: true },
      { deltaId: 'G11', scopeTaxonomy: 'FAMILY_GEN', chassis: 'DL380_Gen11' }
    ],
    chassisSpecificRules: [
      { deltaId: '380', scopeTaxonomy: 'CHASSIS_SPECIFIC', chassis: 'DL380_Gen12' },
      { deltaId: '380a', scopeTaxonomy: 'CHASSIS_SPECIFIC', chassis: 'DL380a_Gen12' }
    ]
  };
  const scoped = scopeRegistryForProduct(registry, 'DL380a_Gen12', config);
  assert.deepEqual([...scoped.universalRules, ...scoped.familyGenRules, ...scoped.chassisSpecificRules].map(r => r.deltaId), ['U', 'G12', '380a']);
});

test('DL380 and DL380a never share canonical Drive identifiers', () => {
  const dl380 = notebookConfig.notebooks.DL380_Gen12;
  const dl380a = notebookConfig.notebooks.DL380a_Gen12;
  assert.notEqual(dl380.notebookId, dl380a.notebookId);
  assert.ok(dl380a.driveSheetId);
  assert.ok(dl380a.driveSourceId);
  assert.notEqual(dl380.driveSheetId, dl380a.driveSheetId);
  assert.notEqual(dl380.driveSourceId, dl380a.driveSourceId);
});
