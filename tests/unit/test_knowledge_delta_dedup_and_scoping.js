'use strict';

const test = require('node:test');
const assert = require('node:assert');
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
    const registry = buildMasterKnowledgeRegistry();
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
});
