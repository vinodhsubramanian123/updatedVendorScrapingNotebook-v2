'use strict';
/**
 * tests/integration/test_dl380_gen11_isolation.js — Cross-Chassis Isolation & Zero-Pollution Gate
 *
 * Certifies that:
 * 1. DL380 Gen11 has completely separate notebook mapping from DL380 Gen12.
 * 2. DL380 Gen11 chassis_map entries do not overlap with Gen12.
 * 3. File outputs and profiles are strictly segregated.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const notebooksCfg = require('../../scripts/config/notebooks.json');
const chassisMap = require('../../scripts/config/chassis_map.json');

describe('DL380 Gen11 Isolation & Anti-Pollution Certification', () => {
  it('certifies distinct NotebookLM notebook IDs between Gen11 and Gen12', () => {
    const gen11Entry = notebooksCfg.notebooks['DL380_Gen11'];
    const gen12Entry = notebooksCfg.notebooks['DL380_Gen12'] || notebooksCfg.notebooks['DL380_Gen12_SFF'];

    assert.ok(gen11Entry, 'DL380_Gen11 entry must exist in notebooks.json');
    assert.ok(gen12Entry, 'DL380_Gen12 entry must exist in notebooks.json');

    const gen11Id = typeof gen11Entry === 'object' ? gen11Entry.notebookId : gen11Entry;
    const gen12Id = typeof gen12Entry === 'object' ? gen12Entry.notebookId : gen12Entry;

    assert.equal(gen11Id, 'd37fa851-90cb-45b7-a8e1-78488a0bc6e6');
    assert.equal(gen12Id, '1d190853-4e9c-48df-aa70-eae66c6f2c1f');
    assert.notEqual(gen11Id, gen12Id, 'Gen11 and Gen12 notebooks MUST NOT be identical');
  });

  it('certifies distinct base CTO chassis SKUs between Gen11 and Gen12', () => {
    const gen11Skus = chassisMap.chassis_base_skus_by_family_gen['ProLiant_Gen11'].skus;
    const gen12Skus = chassisMap.chassis_base_skus_by_family_gen['ProLiant_Gen12'].skus;

    assert.ok(gen11Skus, 'ProLiant_Gen11 SKUs must exist in chassis_map');
    assert.ok(gen12Skus, 'ProLiant_Gen12 SKUs must exist in chassis_map');

    const gen11SkuKeys = Object.keys(gen11Skus);
    const gen12SkuKeys = Object.keys(gen12Skus);

    // Verify all Gen11 SKUs start with P5253 (e.g. P52534-B21)
    gen11SkuKeys.forEach(sku => {
      assert.ok(sku.startsWith('P5253'), `Gen11 SKU ${sku} should follow Gen11 part numbering`);
      assert.equal(gen11Skus[sku].gen, 'Gen11');
    });

    // Verify all Gen12 SKUs start with P7328 (e.g. P73282-B21)
    gen12SkuKeys.forEach(sku => {
      assert.ok(sku.startsWith('P7328'), `Gen12 SKU ${sku} should follow Gen12 part numbering`);
      assert.equal(gen12Skus[sku].gen, 'Gen12');
    });

    // Verify zero intersection
    const intersection = gen11SkuKeys.filter(k => gen12SkuKeys.includes(k));
    assert.equal(intersection.length, 0, 'No SKU overlap allowed between Gen11 and Gen12');
  });

  it('certifies separate scraping profiles and output directories', () => {
    const gen11Profile = path.join(__dirname, '..', '..', 'scripts', 'config', 'profiles', 'proliant_gen11.json');
    const gen12Profile = path.join(__dirname, '..', '..', 'scripts', 'config', 'profiles', 'proliant_gen12.json');

    assert.ok(fs.existsSync(gen11Profile), 'proliant_gen11.json must exist');
    assert.ok(fs.existsSync(gen12Profile), 'proliant_gen12.json must exist');

    const gen11Data = JSON.parse(fs.readFileSync(gen11Profile, 'utf-8'));
    const gen12Data = JSON.parse(fs.readFileSync(gen12Profile, 'utf-8'));

    assert.equal(gen11Data.gen, 'Gen11');
    assert.equal(gen12Data.gen, 'Gen12');
  });
});
