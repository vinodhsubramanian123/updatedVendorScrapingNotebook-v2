const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { classifyKnowledgeScope, buildMasterKnowledgeRegistry } = require('../scripts/lib/knowledge_sync.js');
const { generateNotebookSyncPayload } = require('../scripts/lib/sync/sync_payload_builder.js');
const { cleanTestPayloads } = require('../scripts/lib/post_flow_sync.js');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUTPUTS_ROOT = path.join(PROJECT_ROOT, 'outputs');
const HISTORY_DIR = path.join(OUTPUTS_ROOT, 'history');
const TEMP_TEST_DIR = path.join(OUTPUTS_ROOT, 'temp', 'test_payloads');

describe('Closed-Loop Knowledge Sync & Multi-Family Drift engine tests', () => {

  test('classifyKnowledgeScope across all 5 families (UNIVERSAL_VENDOR, FAMILY_GEN, CHASSIS_SPECIFIC)', () => {
    // UNIVERSAL_VENDOR
    assert.strictEqual(classifyKnowledgeScope({ rawMessage: 'Apply across all HPE servers' }), 'UNIVERSAL_VENDOR');
    assert.strictEqual(classifyKnowledgeScope({ rawMessage: 'This is a global policy' }), 'UNIVERSAL_VENDOR');
    assert.strictEqual(classifyKnowledgeScope({ rawMessage: 'vendor-wide notice' }), 'UNIVERSAL_VENDOR');

    // FAMILY_GEN (ProLiant, Synergy, Alletra, StoreEver, Cray)
    assert.strictEqual(classifyKnowledgeScope({ chassis: 'proliant_gen11' }), 'FAMILY_GEN');
    assert.strictEqual(classifyKnowledgeScope({ chassis: 'synergy_frame' }), 'FAMILY_GEN');
    assert.strictEqual(classifyKnowledgeScope({ chassis: 'alletra_storage' }), 'FAMILY_GEN');
    assert.strictEqual(classifyKnowledgeScope({ chassis: 'cray_ex' }), 'FAMILY_GEN');
    assert.strictEqual(classifyKnowledgeScope({ chassis: 'storeever_tape' }), 'FAMILY_GEN');

    // Test rule types and substitutions that promote to FAMILY_GEN
    assert.strictEqual(classifyKnowledgeScope({ ruleType: 'OPTION_TYPE_SUBSTITUTION' }), 'FAMILY_GEN');
    assert.strictEqual(classifyKnowledgeScope({ rawMessage: 'ddr5 memory rules' }), 'FAMILY_GEN');

    // CHASSIS_SPECIFIC
    assert.strictEqual(classifyKnowledgeScope({ chassis: 'custom_chassis_x' }), 'CHASSIS_SPECIFIC');
    assert.strictEqual(classifyKnowledgeScope({ rawMessage: 'random message' }), 'CHASSIS_SPECIFIC');
  });

  test('generateNotebookSyncPayload routes test chassis payloads to outputs/temp/test_payloads/', () => {
    const testChassis = 'edge-test-chassis-123';
    const payload = generateNotebookSyncPayload(testChassis, false);

    // Verify it creates the file in outputs/temp/test_payloads/
    const expectedDir = path.join(OUTPUTS_ROOT, 'temp', 'test_payloads');
    const expectedPath = path.join(expectedDir, `notebook_sync_payload_${testChassis}.md`);

    assert.strictEqual(payload.payloadPath, expectedPath);
    assert.ok(fs.existsSync(expectedPath));
  });

  test('cleanTestPayloads executes cleanly and removes test payloads from history', () => {
    // First, let's artificially create a test payload in outputs/history/
    if (!fs.existsSync(HISTORY_DIR)) {
      fs.mkdirSync(HISTORY_DIR, { recursive: true });
    }
    const testFilename = 'notebook_sync_payload_hpe-chaos-test-cleanup.md';
    const testFilePath = path.join(HISTORY_DIR, testFilename);
    fs.writeFileSync(testFilePath, '# Fake test payload for cleanup');

    // Verify it was created
    assert.ok(fs.existsSync(testFilePath));

    // Run cleanup
    cleanTestPayloads();

    // Verify it was deleted
    assert.ok(!fs.existsSync(testFilePath));
  });

  test('master_knowledge_registry.json generation includes canonical generatedAt and schemaVersion', () => {
    // Call buildMasterKnowledgeRegistry
    const registry = buildMasterKnowledgeRegistry();

    // Check that it's written
    const registryPath = path.join(HISTORY_DIR, 'master_knowledge_registry.json');
    assert.ok(fs.existsSync(registryPath));

    // Read and verify schemaVersion and generatedAt
    const rawData = fs.readFileSync(registryPath, 'utf8');
    const parsedData = JSON.parse(rawData);

    assert.strictEqual(parsedData.schemaVersion, '1.0');
    assert.ok(parsedData.generatedAt, 'generatedAt should be defined');

    // Also verify the returned object directly matches what we expect
    assert.strictEqual(registry.schemaVersion, '1.0');
    assert.ok(registry.generatedAt, 'generatedAt should be present in the returned registry object');
    // Ensure it's a valid ISO string
    assert.doesNotThrow(() => new Date(registry.generatedAt).toISOString());
  });
});
