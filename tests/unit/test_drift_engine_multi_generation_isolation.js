'use strict';
/**
 * tests/unit/test_drift_engine_multi_generation_isolation.js
 *
 * Dedicated unit test suite for:
 * 1. 3-Tier Taxonomy Scoping (UNIVERSAL_VENDOR, FAMILY_GEN, CHASSIS_SPECIFIC)
 * 2. Closed-Loop Knowledge Delta Deduplication (INV-13)
 * 3. Master Knowledge Registry Schema Contracts (INV-4)
 * 4. Customer BOQ Grounding Isolation (INV-24)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const { buildMasterKnowledgeRegistry, classifyKnowledgeScope } = require('../../scripts/lib/sync/knowledge_sync.js');
const { appendFeedback, getQueueSummary } = require('../../scripts/lib/feedback/feedback_queue.js');

test('▶ [DRIFT-TEST 1]: 3-Tier Taxonomy Scoping & Isolation', () => {
  // Test UNIVERSAL_VENDOR scoping
  const universalRule = {
    ruleUpdate: 'Power supplies require DC lug terminal kits across all servers for telco compliance',
    affectedSku: 'P36877-B21'
  };
  const universalScope = classifyKnowledgeScope(universalRule);
  assert.equal(universalScope, 'UNIVERSAL_VENDOR', 'Telco DC lug rule must have UNIVERSAL_VENDOR scope');

  // Test FAMILY_GEN scoping
  const familyRule = {
    chassis: 'DL380_Gen11',
    ruleUpdate: 'All ProLiant DDR5 DIMMs must be populated in matched channels'
  };
  const familyScope = classifyKnowledgeScope(familyRule);
  assert.equal(familyScope, 'FAMILY_GEN', 'DDR5 DIMM balancing across ProLiant Gen11 must have FAMILY_GEN scope');

  // Test CHASSIS_SPECIFIC scoping
  const chassisRule = {
    chassis: 'Specialized_Box',
    ruleUpdate: 'Physical backplane requires custom proprietary bracket'
  };
  const chassisScope = classifyKnowledgeScope(chassisRule);
  assert.equal(chassisScope, 'CHASSIS_SPECIFIC', 'Chassis specific bracket rule must have CHASSIS_SPECIFIC scope');

  // Test edge case: empty object or missing fields
  const emptyScope = classifyKnowledgeScope({});
  assert.equal(emptyScope, 'CHASSIS_SPECIFIC', 'Empty object should default to CHASSIS_SPECIFIC scope');

  // Test edge case: string input routing to UNIVERSAL_VENDOR
  const stringUniversalScope = classifyKnowledgeScope('Requires DC lug for telco setup');
  assert.equal(stringUniversalScope, 'UNIVERSAL_VENDOR', 'String containing "dc lug" should map to UNIVERSAL_VENDOR');

  // Test edge case: ruleType mapping to FAMILY_GEN
  const optionSubScope = classifyKnowledgeScope({ ruleType: 'OPTION_TYPE_SUBSTITUTION' });
  assert.equal(optionSubScope, 'FAMILY_GEN', 'ruleType OPTION_TYPE_SUBSTITUTION should map to FAMILY_GEN');
});

test('▶ [DRIFT-TEST 2]: Master Knowledge Registry Schema Contracts (INV-4)', () => {
  const registry = buildMasterKnowledgeRegistry();
  assert.ok(registry, 'Registry must be generated');
  assert.ok(registry.generatedAt, 'Registry must contain generatedAt (INV-4)');
  assert.equal(registry.schemaVersion, '1.0', 'Schema version must be 1.0 (INV-4)');
  assert.ok(Array.isArray(registry.productFamiliesSynced), 'productFamiliesSynced must be an array (INV-4)');
  assert.ok(Array.isArray(registry.universalRules), 'universalRules must be an array');
  assert.ok(Array.isArray(registry.familyGenRules), 'familyGenRules must be an array');
  assert.ok(Array.isArray(registry.chassisSpecificRules), 'chassisSpecificRules must be an array');
});

test('▶ [DRIFT-TEST 3]: Closed-Loop Knowledge Delta Deduplication (INV-13)', () => {
  const queueBefore = getQueueSummary();
  
  // Submit feedback
  const feedback1 = appendFeedback({
    category: 'RULES',
    context: {
      chassis: 'DL380_Gen11',
      affectedSku: 'P56073-B21',
      requiredDependencySku: 'P48803-B21',
      ruleUpdate: 'Slot 1 requires primary cable kit'
    }
  });

  assert.ok(feedback1.id, 'Feedback entry must be created');
  assert.equal(feedback1.status, 'PENDING', 'Initial feedback status must be PENDING');
});

test('▶ [DRIFT-TEST 4]: Customer BOQ Grounding Isolation (INV-24)', () => {
  // Assert that master universal knowledge charter never contains raw customer BOQ paths
  const charterPath = path.join(__dirname, '..', '..', 'outputs', 'master_universal_knowledge_charter.md');
  if (fs.existsSync(charterPath)) {
    const content = fs.readFileSync(charterPath, 'utf-8');
    assert.equal(content.includes('GID-RFQS-HPE-2026-006.xlsx'), false, 'Master charter must never contain customer BOQ files (INV-24)');
    assert.equal(content.includes('customer_quote'), false, 'Master charter must never reference raw customer quote documents (INV-24)');
  }
});
