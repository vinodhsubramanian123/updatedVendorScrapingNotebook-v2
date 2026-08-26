'use strict';
/**
 * tests/unit/test_drift_inspector.js
 *
 * Tests for scripts/lib/sync/drift_inspector.js:
 * - inspectKnowledgeDrift status transitions (NO_NOTEBOOK_CONFIGURED, BASELINE_READY, DRIFT_DETECTED, SYNCHRONIZED)
 * - Taxonomy filtering across chassisSpecificRules, familyGenRules, universalRules
 * - Payload generator callback integration
 */

const test = require('node:test');
const assert = require('node:assert');
const { inspectKnowledgeDrift } = require('../../scripts/lib/sync/drift_inspector.js');

test('inspectKnowledgeDrift returns NO_NOTEBOOK_CONFIGURED when notebook is explicitly missing', () => {
  const result = inspectKnowledgeDrift('DL380_Gen12_SFF', {}, { notebooks: { DL380_Gen12_SFF: { notebookId: null } } });
  assert.strictEqual(result.status, 'NO_NOTEBOOK_CONFIGURED');
  assert.strictEqual(result.notebookId, null);
  assert.strictEqual(result.chassisName, 'DL380_Gen12_SFF');
});

test('inspectKnowledgeDrift returns BASELINE_READY when rule count is 0', () => {
  const cfg = {
    notebooks: {
      DL380_Gen12_SFF: {
        notebookId: 'nb-12345',
        lastSyncDeltaCount: 0
      }
    }
  };
  const registry = {
    totalLearnedRules: 0,
    chassisSpecificRules: [],
    familyGenRules: [],
    universalRules: []
  };

  const result = inspectKnowledgeDrift('DL380_Gen12_SFF', registry, cfg);
  assert.strictEqual(result.status, 'BASELINE_READY');
  assert.strictEqual(result.chassisRuleCount, 0);
  assert.strictEqual(result.unSyncedDeltasCount, 0);
  assert.strictEqual(result.notebookId, 'nb-12345');
});

test('inspectKnowledgeDrift detects DRIFT_DETECTED when local rules exceed synced count', () => {
  const cfg = {
    notebooks: {
      DL380_Gen12_SFF: {
        notebookId: 'nb-12345',
        lastSyncDeltaCount: 2,
        lastSyncedAt: '2026-08-20T10:00:00Z'
      }
    }
  };
  const registry = {
    totalLearnedRules: 5,
    chassisSpecificRules: [
      { chassis: 'DL380_Gen12_SFF', rule: 'High TDP fan requirement' },
      { chassis: 'DL380_Gen12_SFF', rule: 'Tri-Mode cable requirement' },
      { chassis: 'DL380_Gen12_SFF', rule: 'DC Lug requirement' }
    ],
    familyGenRules: [
      { scopeTaxonomy: 'FAMILY_GEN', rule: 'DDR5 16-channel interleaving' }
    ],
    universalRules: [
      { scopeTaxonomy: 'UNIVERSAL_VENDOR', rule: 'iLO 6 Advanced License' }
    ]
  };

  const fakePayloadGen = (chassis, dryRun) => ({ payloadPath: `/tmp/sync_${chassis}.md` });

  const result = inspectKnowledgeDrift('DL380_Gen12_SFF', registry, cfg, fakePayloadGen);
  assert.strictEqual(result.status, 'DRIFT_DETECTED');
  assert.strictEqual(result.chassisRuleCount, 5);
  assert.strictEqual(result.lastSyncedRulesCount, 2);
  assert.strictEqual(result.unSyncedDeltasCount, 3);
  assert.strictEqual(result.payloadPath, '/tmp/sync_DL380_Gen12_SFF.md');
});

test('inspectKnowledgeDrift returns SYNCHRONIZED when rules equal last synced count', () => {
  const cfg = {
    notebooks: {
      DL380_Gen12_SFF: {
        notebookId: 'nb-12345',
        lastSyncDeltaCount: 2
      }
    }
  };
  const registry = {
    totalLearnedRules: 2,
    chassisSpecificRules: [
      { chassis: 'DL380_Gen12_SFF', rule: 'High TDP fan requirement' },
      { chassis: 'DL380_Gen12_SFF', rule: 'Tri-Mode cable requirement' }
    ],
    familyGenRules: [],
    universalRules: []
  };

  const result = inspectKnowledgeDrift('DL380_Gen12_SFF', registry, cfg);
  assert.strictEqual(result.status, 'SYNCHRONIZED');
  assert.strictEqual(result.unSyncedDeltasCount, 0);
});

test('inspectKnowledgeDrift isolates chassis-specific rules between models', () => {
  const cfg = {
    notebooks: {
      MSL3040_Tape: {
        notebookId: 'nb-tape',
        lastSyncDeltaCount: 0
      }
    }
  };
  const registry = {
    totalLearnedRules: 3,
    chassisSpecificRules: [
      { chassis: 'DL380_Gen12_SFF', rule: 'DL380 fan rule' },
      { chassis: 'DL380_Gen12_SFF', rule: 'DL380 PCIe riser rule' }
    ],
    familyGenRules: [],
    universalRules: []
  };

  const result = inspectKnowledgeDrift('MSL3040_Tape', registry, cfg);
  assert.strictEqual(result.chassisRuleCount, 0);
  assert.strictEqual(result.status, 'BASELINE_READY');
});
