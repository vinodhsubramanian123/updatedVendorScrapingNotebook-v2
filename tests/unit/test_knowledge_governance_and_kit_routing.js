'use strict';
/**
 * tests/unit/test_knowledge_governance_and_kit_routing.js
 *
 * Validates Phase 1, Phase 2 & Phase 3B governance, kit routing, and pillar inference:
 * 1. assertNotebookHealth() detects healthy and degraded notebooks
 * 2. resolveProductNotebookId() form-factor suffix stripping
 * 3. getMandatorySkusForChassis() data-driven kit routing matchers
 * 4. isCatalogFresh() 72h freshness verification
 * 5. inferPillar() multi-vendor pillar mapping
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const { assertNotebookHealth } = require('../../scripts/lib/sync/knowledge_sync.js');
const { resolveProductNotebookId } = require('../../scripts/lib/sync/nlm_solution_source_validator.js');
const { getMandatorySkusForChassis } = require('../../scripts/lib/catalog/catalog_rules.js');
const { isCatalogFresh } = require('../../scripts/lib/catalog/catalog_freshness_guard.js');
const { inferPillar, PILLAR_FAMILIES } = require('../../scripts/lib/catalog/product_scope.js');
const logger = require('../../scripts/lib/system/pipeline_logger.js');

console.log('🧪 Starting test_knowledge_governance_and_kit_routing...');

// Test 1: assertNotebookHealth
{
  const mockCfg = {
    notebooks: {
      DL380_Gen12: {
        notebookId: '1d190853-4e9c-48df-aa70-eae66c6f2c1f',
        cloudSyncState: 'VERIFIED',
        queryEnabled: true
      },
      Alletra_Storage_System: {
        notebookId: 'a67629ba-3434-42ab-b465-bd6d71852198',
        cloudSyncState: 'FAILED',
        lastSyncError: 'invalid_grant',
        queryEnabled: true
      }
    }
  };

  const healthy = assertNotebookHealth(mockCfg, 'DL380_Gen12', logger);
  assert.strictEqual(healthy.isHealthy, true, 'Healthy notebook should be healthy');
  assert.strictEqual(healthy.confidenceLabel, 'GROUNDED');

  const degraded = assertNotebookHealth(mockCfg, 'Alletra_Storage_System', logger);
  assert.strictEqual(degraded.isHealthy, false, 'Failed sync notebook must be flagged degraded');
  assert.strictEqual(degraded.confidenceLabel, 'DEGRADED_UNGROUNDED');
  assert.strictEqual(degraded.degradationMode, 'STALE_NOTEBOOK_SYNC');

  const unmapped = assertNotebookHealth(mockCfg, 'Unknown_Server_Chassis', logger);
  assert.strictEqual(unmapped.isHealthy, false);
  assert.strictEqual(unmapped.confidenceLabel, 'UNGROUNDED_NO_NOTEBOOK');
  console.log('  ✅ Test 1 Passed: assertNotebookHealth accurately isolates degraded/ungrounded states');
}

// Test 2: resolveProductNotebookId form-factor suffix strip
{
  const idExact = resolveProductNotebookId('DL380_Gen12');
  assert(idExact, 'DL380_Gen12 must resolve directly');

  const idSuffix = resolveProductNotebookId('DL380_Gen12_24SFF');
  assert.strictEqual(idSuffix, idExact, 'DL380_Gen12_24SFF must resolve to DL380_Gen12 notebook ID via suffix strip');

  const idEdsff = resolveProductNotebookId('DL380_Gen12_EDSFF');
  assert.strictEqual(idEdsff, idExact, 'DL380_Gen12_EDSFF must resolve to DL380_Gen12 notebook ID via suffix strip');
  console.log('  ✅ Test 2 Passed: resolveProductNotebookId strips form-factor suffixes correctly');
}

// Test 3: getMandatorySkusForChassis data-driven matchers
{
  const dl380Kits = getMandatorySkusForChassis({ family: 'ProLiant', model: 'DL380', gen: 'Gen12' });
  assert.strictEqual(dl380Kits.HIGH_PERF_FAN_KIT.sku, 'P48820-B21', 'DL380 Gen12 fan kit');

  const dl145Kits = getMandatorySkusForChassis({ family: 'ProLiant', model: 'DL145', gen: 'Gen11' });
  assert(dl145Kits, 'DL145 Gen11 must match via kit_routing');

  const alletraKits = getMandatorySkusForChassis({ family: 'Alletra', model: '9000', gen: 'Storage' });
  assert(alletraKits, 'Alletra must match via kit_routing');
  console.log('  ✅ Test 3 Passed: getMandatorySkusForChassis routes via data-driven matchers');
}

// Test 4: isCatalogFresh
{
  const projectRoot = path.resolve(__dirname, '../../');
  const liveDir = path.join(projectRoot, 'outputs', 'ProLiant', 'Gen12', 'DL380_Gen12');
  if (fs.existsSync(liveDir)) {
    const isFresh = isCatalogFresh(liveDir, 100000); // Very high threshold should be true
    assert.strictEqual(isFresh, true);
  }
  const nonExistent = isCatalogFresh('/invalid/nonexistent/dir', 72);
  assert.strictEqual(nonExistent, true, 'Non-existent catalog fails open to true');
  console.log('  ✅ Test 4 Passed: isCatalogFresh validates catalog directory timestamps');
}

// Test 5: inferPillar multi-vendor coverage
{
  assert.strictEqual(inferPillar('ProLiant'), 'SERVER');
  assert.strictEqual(inferPillar('purestorage'), 'STORAGE');
  assert.strictEqual(inferPillar('netapp'), 'STORAGE');
  assert.strictEqual(inferPillar('arista'), 'NETWORKING');
  assert.strictEqual(inferPillar('brocade'), 'NETWORKING');
  assert.strictEqual(inferPillar('Synergy', 'SY100Gb_F32'), 'NETWORKING');
  assert.strictEqual(inferPillar('Synergy', 'SY480_Compute'), 'SERVER');
  console.log('  ✅ Test 5 Passed: inferPillar handles multi-vendor storage & networking families');
}

console.log('🎉 All test_knowledge_governance_and_kit_routing tests passed successfully!\n');
process.exit(0);
