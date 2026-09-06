'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  collectAllDeltas,
  buildMasterKnowledgeRegistry,
  classifyKnowledgeScope
} = require('../../scripts/lib/sync/knowledge_sync.js');

test('Knowledge Delta Deduplication & Scoped Taxonomy Unit Suite', async (t) => {
  await t.test('classifyKnowledgeScope correctly classifies scopes across 3-tier taxonomy', () => {
    // Universal vendor rule (TAA / GTA / Telco / All HPE)
    const universal = classifyKnowledgeScope({
      ruleType: 'GLOBAL_RULE',
      rawMessage: 'TAA compliant server builds across all servers require special sourcing'
    });
    assert.strictEqual(universal, 'UNIVERSAL_VENDOR');

    // Family / Gen rule (DDR5 / Gen12 / ProLiant)
    const familyGen = classifyKnowledgeScope({
      ruleType: 'MEMORY_RULE',
      rawMessage: 'ProLiant Gen12 requires DDR5 1DPC balanced memory channels'
    });
    assert.strictEqual(familyGen, 'FAMILY_GEN');

    // Chassis-specific rule (specific chassis without universal/family keywords)
    const chassisSpecific = classifyKnowledgeScope({
      ruleType: 'CABLE_KIT',
      chassis: 'Custom_Chassis_Box',
      rawMessage: 'Requires bracket kit SKU-999-B21'
    });
    assert.strictEqual(chassisSpecific, 'CHASSIS_SPECIFIC');
  });

  await t.test('buildMasterKnowledgeRegistry returns valid registry structure with timestamps (INV-4)', () => {
    const registry = buildMasterKnowledgeRegistry({ persist: false });
    assert.ok(registry.schemaVersion === '1.0');
    assert.ok(registry.generatedAt);
    assert.ok(Array.isArray(registry.productFamiliesSynced));
    assert.ok(Array.isArray(registry.universalRules));
    assert.ok(Array.isArray(registry.familyGenRules));
    assert.ok(Array.isArray(registry.chassisSpecificRules));
  });

  await t.test('collectAllDeltas deduplicates entries semantically (INV-13)', () => {
    const deltas = collectAllDeltas();
    assert.ok(Array.isArray(deltas));
    
    // Assert no exact duplicates on (chassis, affectedSku, requiredDependencySku, rawText)
    const seen = new Set();
    let hasDuplicate = false;
    for (const d of deltas) {
      const rawText = d.rawMessage || d.ruleUpdate || '';
      const key = `${d.chassis}|${d.affectedSku}|${d.requiredDependencySku || ''}|${rawText}`;
      if (seen.has(key)) {
        hasDuplicate = true;
        break;
      }
      seen.add(key);
    }
    assert.strictEqual(hasDuplicate, false, 'No duplicate deltas should exist in collection');
  });

  await t.test('temporary staging deltas can never enter the live knowledge registry', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'knowledge-scope-root-'));
    try {
      const live = path.join(root, 'ProLiant', 'Gen12', 'DL380a_Gen12');
      const temp = path.join(root, 'temp', 'staging_DL380a_old');
      fs.mkdirSync(live, { recursive: true });
      fs.mkdirSync(temp, { recursive: true });
      fs.writeFileSync(path.join(live, 'catalog_deltas.json'), JSON.stringify([
        { deltaId: 'LIVE', chassis: 'DL380a_Gen12', affectedSku: 'P76706-B21', ruleUpdate: 'Verified live rule', status: 'VERIFIED' }
      ]));
      fs.writeFileSync(path.join(temp, 'catalog_deltas.json'), JSON.stringify([
        { deltaId: 'STALE', chassis: 'DL380a_Gen12', affectedSku: 'P76706-B21', ruleUpdate: 'Stale staging rule', status: 'VERIFIED' }
      ]));
      assert.deepStrictEqual(collectAllDeltas(root).map(delta => delta.deltaId), ['LIVE']);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
