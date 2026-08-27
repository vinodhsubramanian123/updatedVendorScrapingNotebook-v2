'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  classifyKnowledgeScope,
  buildMasterKnowledgeRegistry
} = require('../../scripts/lib/sync/knowledge_sync.js');
const { processPortalFeedback } = require('../../scripts/lib/feedback/feedback_loop.js');
const { safeParseKnowledgeDelta } = require('../../scripts/lib/system/schemas.js');

test('Knowledge Taxonomy, Feedback Loop, and Schema Contracts Fuzzing', async (t) => {

  await t.test('classifyKnowledgeScope() classification pathways', async (t2) => {
    // 1. String input - UNIVERSAL_VENDOR
    assert.strictEqual(classifyKnowledgeScope('applies to all hpe servers worldwide'), 'UNIVERSAL_VENDOR');
    assert.strictEqual(classifyKnowledgeScope('requires dc lug'), 'UNIVERSAL_VENDOR');
    
    // 2. Object input - UNIVERSAL_VENDOR
    assert.strictEqual(classifyKnowledgeScope({ rawMessage: 'telco compliance issue' }), 'UNIVERSAL_VENDOR');
    
    // 3. String input - FAMILY_GEN
    assert.strictEqual(classifyKnowledgeScope('bto configuration not supported'), 'FAMILY_GEN');
    assert.strictEqual(classifyKnowledgeScope('requires ddr5 memory'), 'FAMILY_GEN');
    assert.strictEqual(classifyKnowledgeScope('high performance fan kit'), 'FAMILY_GEN');

    // 4. Object input - FAMILY_GEN (ruleType)
    assert.strictEqual(classifyKnowledgeScope({ ruleType: 'OPTION_TYPE_SUBSTITUTION' }), 'FAMILY_GEN');
    
    // 5. Object input - FAMILY_GEN (chassis keyword)
    assert.strictEqual(classifyKnowledgeScope({ chassis: 'DL380_Gen12_SFF' }), 'FAMILY_GEN');
    
    // 6. Object input - CHASSIS_SPECIFIC
    assert.strictEqual(classifyKnowledgeScope({ chassis: 'custom_chassis_99', rawMessage: 'random issue' }), 'CHASSIS_SPECIFIC');
    
    // 7. Missing chassis and no keywords - CHASSIS_SPECIFIC
    assert.strictEqual(classifyKnowledgeScope({}), 'CHASSIS_SPECIFIC');
    assert.strictEqual(classifyKnowledgeScope('random string'), 'CHASSIS_SPECIFIC');
  });

  await t.test('processPortalFeedback() edge cases and resilience', async (t2) => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oca-feedback-test-'));
    const historyDir = path.join(tmpDir, 'history');
    const deltaFile = path.join(historyDir, 'catalog_deltas.json');
    
    try {
      // 1. Normal feedback generation
      const f1 = processPortalFeedback('Out of stock on P48820-B21, requires P01366-B21', tmpDir);
      assert.ok(f1.deltaId.startsWith('DELTA-'));
      assert.strictEqual(f1.affectedSku, 'P48820-B21');
      assert.strictEqual(f1.requiredDependencySku, 'P01366-B21');
      assert.strictEqual(f1.errorType, 'TEMPORARY_SUPPLY_CONSTRAINT');
      assert.strictEqual(f1.chassis, path.basename(tmpDir));

      // 2. Corrupted JSON file recovery
      fs.writeFileSync(deltaFile, '[{corrupted_json_syntax: true');
      const f2 = processPortalFeedback('Random physical error on 123456-B21', tmpDir);
      assert.strictEqual(f2.affectedSku, '123456-B21');
      assert.strictEqual(f2.errorType, 'PERMANENT_PHYSICAL_DEPENDENCY');
      
      // Verify backup was created
      const files = fs.readdirSync(historyDir);
      const bakFiles = files.filter(f => f.endsWith('.bak'));
      assert.strictEqual(bakFiles.length, 1);
      
      // 3. Deduplication logic
      const f3 = processPortalFeedback('Random physical error on 123456-B21', tmpDir, { humanReasoning: 'Updated reasoning' });
      assert.strictEqual(f3.humanReasoning, 'Updated reasoning');
      
      const deltasContent = JSON.parse(fs.readFileSync(deltaFile, 'utf-8'));
      assert.strictEqual(deltasContent.length, 1);
      assert.strictEqual(deltasContent[0].humanReasoning, 'Updated reasoning');
      
      // 4. Concurrent feedback writes
      const f4 = processPortalFeedback('Error 1 on 111111-B21', tmpDir);
      const f5 = processPortalFeedback('Error 2 on 222222-B21', tmpDir);
      const deltasContentAfter = JSON.parse(fs.readFileSync(deltaFile, 'utf-8'));
      assert.strictEqual(deltasContentAfter.length, 3);
      
      // 5. Special characters
      const f6 = processPortalFeedback('Error 3 on 333333-B21 with emoji 🚀 and \n new lines\t\t', tmpDir);
      assert.strictEqual(f6.affectedSku, '333333-B21');
      assert.ok(f6.rawMessage.includes('🚀'));
      
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  await t.test('buildMasterKnowledgeRegistry() bucket routing and schema compatibility', async (t2) => {
    t2.mock.method(fs, 'existsSync', (p) => {
      if (typeof p === 'string' && (p.endsWith('outputs') || p.endsWith('history'))) return true;
      if (typeof p === 'string' && p.includes('chassis_A')) return true;
      return false;
    });

    t2.mock.method(fs, 'readdirSync', (p, options) => {
      if (typeof p === 'string' && p.endsWith('outputs')) {
        return [
          { name: 'history', isDirectory: () => true },
          { name: 'chassis_A', isDirectory: () => true }
        ];
      }
      if (typeof p === 'string' && p.endsWith('history')) {
        return [
          { name: 'catalog_deltas.json', isDirectory: () => false }
        ];
      }
      if (typeof p === 'string' && p.endsWith('chassis_A')) {
        return [
          { name: 'catalog_deltas.json', isDirectory: () => false }
        ];
      }
      return [];
    });

    t2.mock.method(fs, 'writeFileSync', () => {});
    t2.mock.method(fs, 'renameSync', () => {});
    t2.mock.method(fs, 'unlinkSync', () => {});
    t2.mock.method(fs, 'mkdirSync', () => {});
    
    const originalReadFileSync = fs.readFileSync;
    t2.mock.method(fs, 'readFileSync', (p, encoding) => {
      if (typeof p === 'string' && p.endsWith('.tmp')) {
        return '{}';
      }
      if (typeof p === 'string' && p.endsWith('master_knowledge_registry.json')) {
        return '{}';
      }
      if (typeof p === 'string' && p.includes('history/catalog_deltas.json')) {
        return JSON.stringify([
          { deltaId: 'D1', affectedSku: 'S1', rawMessage: 'all hpe' },
          { deltaId: 'D2', affectedSku: 'S2', rawMessage: 'bto' }
        ]);
      }
      if (typeof p === 'string' && p.includes('chassis_A/catalog_deltas.json')) {
        return JSON.stringify([
          { deltaId: 'D3', affectedSku: 'S3', rawMessage: 'random', chassis: 'chassis_A' }
        ]);
      }
      return originalReadFileSync(p, encoding);
    });

    const registry = buildMasterKnowledgeRegistry();
    
    assert.strictEqual(registry.counts.universal, 1);
    assert.strictEqual(registry.counts.familyGen, 1);
    assert.strictEqual(registry.counts.chassisSpecific, 1);
    
    assert.strictEqual(registry.universalRules[0].deltaId, 'D1');
    assert.strictEqual(registry.familyGenRules[0].deltaId, 'D2');
    assert.strictEqual(registry.chassisSpecificRules[0].deltaId, 'D3');
  });

  await t.test('KnowledgeDelta Schema Contracts', async (t2) => {
    const validDelta = {
      deltaId: 'DELTA-123',
      chassis: 'DL380_Gen12',
      affectedSku: '123456-B21',
      requiredDependencySku: '654321-B21',
      scope: 'FAMILY_GEN',
      scopeTaxonomy: 'FAMILY_GEN_RULES',
      errorType: 'MISSING_MANDATORY_DEPENDENCY',
      ruleUpdate: 'Required',
      humanReasoning: 'Test',
      confidence: 1.0,
      timestamp: new Date().toISOString()
    };
    
    const res1 = safeParseKnowledgeDelta(validDelta);
    assert.strictEqual(res1.success, true);
    
    const invalidDelta = {
      deltaId: 'DELTA-123'
    };
    
    const res2 = safeParseKnowledgeDelta(invalidDelta);
    assert.strictEqual(res2.success, false);
    assert.ok(res2.errors);
  });
});
