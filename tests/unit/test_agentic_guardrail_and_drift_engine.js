'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const { extractKnowledgeFromRagAnswer } = require('../../scripts/lib/notebook/knowledge_extractor.js');
const { inspectKnowledgeDrift } = require('../../scripts/lib/sync/drift_inspector.js');
const { generateNotebookSyncPayload } = require('../../scripts/lib/sync/sync_payload_builder.js');

test('Test extractKnowledgeFromRagAnswer()', async (t) => {
  await t.test('Extract BTO -> FIO option substitution', () => {
    const markdown = "The component P69728-B21 (BTO) is not allowed in CTO. You must use FIO SKU P69728-F21 instead.";
    const deltas = extractKnowledgeFromRagAnswer(markdown, 'outputs/ProLiant/Gen12/DL380_Gen12');
    assert.strictEqual(deltas.length, 1);
    assert.strictEqual(deltas[0].affectedSku, 'P69728-B21');
    assert.strictEqual(deltas[0].requiredDependencySku, 'P69728-F21');
    assert.strictEqual(deltas[0].ruleType, 'OPTION_TYPE_SUBSTITUTION');
  });

  await t.test('Extract Cross-Generation Carry-Over Validation', () => {
    const markdown = "Part P48918-B21 is fully supported and validated inside DL380 Gen12.";
    const deltas = extractKnowledgeFromRagAnswer(markdown, 'outputs/ProLiant/Gen12/DL380_Gen12');
    assert.strictEqual(deltas.length, 1);
    assert.strictEqual(deltas[0].affectedSku, 'P48918-B21');
    assert.strictEqual(deltas[0].ruleType, 'CARRY_OVER_VALIDATED');
  });

  await t.test('Extract Hardware Dependency Chain', () => {
    const markdown = "Using P47777-B21 mandates P76453-B21 for routing.";
    const deltas = extractKnowledgeFromRagAnswer(markdown, 'outputs/ProLiant/Gen12/DL380_Gen12');
    assert.strictEqual(deltas.length, 1);
    assert.strictEqual(deltas[0].affectedSku, 'P47777-B21');
    assert.strictEqual(deltas[0].requiredDependencySku, 'P76453-B21');
    assert.strictEqual(deltas[0].ruleType, 'DEPENDENCY_CHAIN');
  });

  await t.test('Handling responses with no rules', () => {
    const markdown = "There are no rules mentioned here. Just a normal response.";
    const deltas = extractKnowledgeFromRagAnswer(markdown, 'outputs/ProLiant/Gen12/DL380_Gen12');
    assert.strictEqual(deltas.length, 0);
  });

  await t.test('Handling ambiguous text without clear SKUs', () => {
    const markdown = "The component requires a cable, but I don't know the SKU.";
    const deltas = extractKnowledgeFromRagAnswer(markdown, 'outputs/ProLiant/Gen12/DL380_Gen12');
    assert.strictEqual(deltas.length, 0);
  });

  await t.test('Multiple simultaneous dependencies in one RAG answer', () => {
    const markdown = `
      The part P47777-B21 requires P76453-B21 for routing.
      Also, P69728-B21 (BTO) is not allowed in CTO. You must use FIO SKU P69728-F21 instead.
      Part P48918-B21 is fully supported and validated inside DL380 Gen12.
    `;
    const deltas = extractKnowledgeFromRagAnswer(markdown, 'outputs/ProLiant/Gen12/DL380_Gen12');
    assert.strictEqual(deltas.length, 3);
    
    const types = deltas.map(d => d.ruleType).sort();
    assert.deepStrictEqual(types, ['CARRY_OVER_VALIDATED', 'DEPENDENCY_CHAIN', 'OPTION_TYPE_SUBSTITUTION']);
  });
});

test('Test inspectKnowledgeDrift()', async (t) => {
  await t.test('Simulate BASELINE_READY', () => {
    const chassisName = 'DL380_Gen12_SFF';
    const registry = {
      chassisSpecificRules: [],
      familyGenRules: [],
      universalRules: []
    };
    const cfg = { notebooks: { 'DL380_Gen12_SFF': '123' }, defaultNotebookId: '123' };
    
    const result = inspectKnowledgeDrift(chassisName, registry, cfg);
    assert.strictEqual(result.status, 'BASELINE_READY');
  });

  await t.test('Simulate NO_NOTEBOOK_CONFIGURED', () => {
    const chassisName = 'DL380_Gen12_SFF';
    const registry = {
      chassisSpecificRules: [{ chassis: 'DL380_Gen12_SFF', ruleUpdate: 'test' }],
      familyGenRules: [],
      universalRules: []
    };
    const cfg = { notebooks: { 'DL380_Gen12_SFF': null }, defaultNotebookId: "" };
    
    const result = inspectKnowledgeDrift(chassisName, registry, cfg);
    assert.strictEqual(result.status, 'NO_NOTEBOOK_CONFIGURED');
  });

  await t.test('Simulate DRIFT_DETECTED and correct counts', () => {
    const chassisName = 'DL380_Gen12_SFF';
    const registry = {
      chassisSpecificRules: [
        { chassis: 'DL380_Gen12_SFF', ruleUpdate: 'test 1' },
        { chassis: 'DL380_Gen12_SFF', ruleUpdate: 'test 2' }
      ]
    };
    const cfg = {
      notebooks: {
        'DL380_Gen12_SFF': {
          notebookId: '123',
          lastSyncDeltaCount: 0
        }
      }
    };
    
    const result = inspectKnowledgeDrift(chassisName, registry, cfg);
    assert.strictEqual(result.status, 'DRIFT_DETECTED');
    assert.strictEqual(result.chassisRuleCount, 2);
    assert.strictEqual(result.unSyncedDeltasCount, 2);
  });
  
  await t.test('Simulate SYNCHRONIZED', () => {
    const chassisName = 'DL380_Gen12_SFF';
    const registry = {
      chassisSpecificRules: [
        { chassis: 'DL380_Gen12_SFF', ruleUpdate: 'test 1' },
        { chassis: 'DL380_Gen12_SFF', ruleUpdate: 'test 2' }
      ]
    };
    const cfg = {
      notebooks: {
        'DL380_Gen12_SFF': {
          notebookId: '123',
          lastSyncDeltaCount: 2
        }
      }
    };
    
    const result = inspectKnowledgeDrift(chassisName, registry, cfg);
    assert.strictEqual(result.status, 'SYNCHRONIZED');
    assert.strictEqual(result.chassisRuleCount, 2);
    assert.strictEqual(result.unSyncedDeltasCount, 0);
  });
});

test('Test INV-7 generateNotebookSyncPayload chassis pattern routing', async (t) => {
  await t.test('Test edge-test-* routing to temp/test_payloads', () => {
    const payload = generateNotebookSyncPayload('edge-test-123', false, null);
    assert.ok(payload.payloadPath !== null, "payloadPath should not be null");
    assert.ok(payload.payloadPath.includes(path.join('outputs', 'temp', 'test_payloads')), "Should route to outputs/temp/test_payloads/");
    assert.ok(!payload.payloadPath.includes(path.join('outputs', 'history')), "Should not route to outputs/history/");
  });

  await t.test('Test hpe-chaos-test-* routing to temp/test_payloads', () => {
    const payload = generateNotebookSyncPayload('hpe-chaos-test-456', false, null);
    assert.ok(payload.payloadPath !== null, "payloadPath should not be null");
    assert.ok(payload.payloadPath.includes(path.join('outputs', 'temp', 'test_payloads')), "Should route to outputs/temp/test_payloads/");
    assert.ok(!payload.payloadPath.includes(path.join('outputs', 'history')), "Should not route to outputs/history/");
  });

  await t.test('Test real chassis routing to outputs/history when no catalog exists', () => {
    const payload = generateNotebookSyncPayload('Some_Valid_Chassis_No_Cat', false, null);
    assert.ok(payload.payloadPath !== null, "payloadPath should not be null");
    assert.ok(!payload.payloadPath.includes(path.join('outputs', 'temp', 'test_payloads')), "Should not route to outputs/temp/test_payloads/");
    assert.ok(payload.payloadPath.includes(path.join('outputs', 'history')), "Should route to outputs/history/");
  });
});
