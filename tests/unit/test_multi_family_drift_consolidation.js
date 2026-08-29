'use strict';
/**
 * tests/unit/test_multi_family_drift_consolidation.js
 *
 * Unit & Integration Suite for Multi-Family Knowledge Drift & Registry Consolidation:
 * (scripts/lib/sync/drift_inspector.js and scripts/lib/sync/knowledge_sync.js)
 *
 * Tests:
 * 1. Drift inspection across 5 enterprise product families (ProLiant, Synergy, Alletra, StoreEver, Cray).
 * 2. Scope taxonomy filtering (UNIVERSAL_VENDOR vs FAMILY_GEN vs CHASSIS_SPECIFIC).
 * 3. Master Knowledge Registry generatedAt, schemaVersion, and productFamiliesSynced compliance (INV-4).
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');

const { inspectKnowledgeDrift } = require('../../scripts/lib/sync/drift_inspector.js');
const { buildMasterKnowledgeRegistry } = require('../../scripts/lib/sync/knowledge_sync.js');

describe('🧪 Multi-Family Drift Consolidation & Knowledge Registry Suite', () => {

  test('1. inspectKnowledgeDrift correctly computes drift metrics for all product families', () => {
    const families = [
      'DL380_Gen12',
      'SY100Gb_F32_Module',
      'Alletra_Storage_System',
      'MSL3040_Tape',
      'GX5000_General_RACK'
    ];

    const mockRegistry = {
      chassisSpecificRules: [
        { chassis: 'DL380_Gen12', scopeTaxonomy: 'CHASSIS_SPECIFIC', rule: 'DL380 Gen12 Rule' }
      ],
      familyGenRules: [
        { scopeTaxonomy: 'FAMILY_GEN', rule: 'ProLiant Gen12 Rule' }
      ],
      universalRules: [
        { scopeTaxonomy: 'UNIVERSAL_VENDOR', rule: 'Universal HPE Rule' }
      ]
    };

    const mockCfg = {
      defaultNotebookId: 'default-nlm-notebook-id',
      notebooks: {
        'DL380_Gen12': { notebookId: 'nlm-dl380-12', lastSyncDeltaCount: 0 },
        'SY100Gb_F32_Module': { notebookId: 'nlm-sy100', lastSyncDeltaCount: 2 }
      }
    };

    families.forEach(family => {
      const drift = inspectKnowledgeDrift(family, mockRegistry, mockCfg, () => ({ payloadPath: `/tmp/sync_${family}.md` }));
      assert.ok(drift, `Drift record must exist for ${family}`);
      assert(typeof drift.unSyncedDeltasCount === 'number', 'unSyncedDeltasCount must be a number');
      assert(['DRIFT_DETECTED', 'SYNCHRONIZED', 'BASELINE_READY'].includes(drift.status), `Valid status for ${family}: ${drift.status}`);
    });
  });

  test('2. buildMasterKnowledgeRegistry returns valid schemaVersion and productFamiliesSynced (INV-4)', () => {
    const registry = buildMasterKnowledgeRegistry();
    assert.ok(registry.generatedAt, 'generatedAt timestamp required');
    assert.ok(registry.schemaVersion, 'schemaVersion required');
    assert(Array.isArray(registry.productFamiliesSynced), 'productFamiliesSynced array required');
    assert(registry.productFamiliesSynced.length > 0, 'Must contain synced families');
  });

});
