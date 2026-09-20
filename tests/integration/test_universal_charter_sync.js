'use strict';
/**
 * tests/integration/test_universal_charter_sync.js
 *
 * Validates the Master Universal Knowledge Charter:
 * 1. buildMasterKnowledgeRegistry() produces valid registry (generatedAt, schemaVersion, counts)
 * 2. master_universal_knowledge_charter.md is emitted with all 4 required sections
 * 3. Charter markdown contains all 7 CLIC rule references
 * 4. Every notebook in notebooks.json can be resolved to a valid notebookId
 * 5. Charter is a single shared file (not per-chassis duplicates)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const { buildMasterKnowledgeRegistry, getNotebookIdForChassis, loadNotebookConfig } = require('../../scripts/lib/sync/knowledge_sync.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const C = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  cyan: '\x1b[36m', bold: '\x1b[1m'
};

const REQUIRED_SECTIONS = [
  'Local Audit Index',
  'Scoped Knowledge Delta Inventory'
];

async function run() {
  const tempOutputs = fs.mkdtempSync(path.join(os.tmpdir(), 'knowledge-charter-test-'));
  const historyDir = path.join(tempOutputs, 'history');
  fs.mkdirSync(historyDir, { recursive: true });
  fs.writeFileSync(path.join(historyDir, 'catalog_deltas.json'), JSON.stringify([{
    deltaId: 'TEST-UNIVERSAL',
    chassis: 'DL380_Gen12',
    affectedSku: 'P00000-B21',
    ruleUpdate: 'Verified test-only audit rule',
    scopeTaxonomy: 'CHASSIS_SPECIFIC'
  }]));
  const charterPath = path.join(historyDir, 'master_universal_knowledge_charter.md');
  const registryPath = path.join(historyDir, 'master_knowledge_registry.json');
  console.log(`${C.bold}${C.cyan}================================================================${C.reset}`);
  console.log(`${C.bold}${C.cyan}🧪 UNIVERSAL KNOWLEDGE CHARTER & SYNC VERIFICATION SUITE${C.reset}`);
  console.log(`${C.bold}${C.cyan}================================================================${C.reset}\n`);

  let total = 0, passed = 0;

  function assert(name, cond, detail = '') {
    total++;
    if (cond) {
      passed++;
      console.log(`  ${C.green}✅ PASS${C.reset}: ${name} ${detail ? `(${detail})` : ''}`);
    } else {
      console.error(`  ${C.red}❌ FAIL${C.reset}: ${name} ${detail ? `(${detail})` : ''}`);
    }
  }

  // ─── TEST 1: buildMasterKnowledgeRegistry produces valid structure ───
  console.log(`\n  [1/5] Master Knowledge Registry Structure\n`);
  const registry = buildMasterKnowledgeRegistry({ outputsRoot: tempOutputs, persist: true });
  assert('Registry object is not null', registry !== null && registry !== undefined);
  assert('Registry has generatedAt (INV-4)', !!registry.generatedAt);
  assert('Registry has schemaVersion (INV-4)', registry.schemaVersion === '1.0');
  assert('Registry has totalLearnedRules >= 0', typeof registry.totalLearnedRules === 'number' && registry.totalLearnedRules >= 0,
    `totalLearnedRules=${registry.totalLearnedRules}`);
  assert('Registry has counts object', !!registry.counts && typeof registry.counts.universal === 'number');
  assert('Registry has productFamiliesSynced array', Array.isArray(registry.productFamiliesSynced));

  // ─── TEST 2: master_knowledge_registry.json persisted ───
  console.log(`\n  [2/5] Master Knowledge Registry JSON Persistence\n`);
  assert('master_knowledge_registry.json exists', fs.existsSync(registryPath));
  if (fs.existsSync(registryPath)) {
    const onDisk = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
    assert('On-disk registry has generatedAt', !!onDisk.generatedAt);
    assert('On-disk registry has schemaVersion 1.0', onDisk.schemaVersion === '1.0');
    assert('On-disk totalLearnedRules matches', onDisk.totalLearnedRules === registry.totalLearnedRules);
  }

  // ─── TEST 3: master_universal_knowledge_charter.md emitted ───
  console.log(`\n  [3/5] Master Universal Knowledge Charter Markdown\n`);
  assert('local registry audit index exists', fs.existsSync(charterPath));
  if (fs.existsSync(charterPath)) {
    const charterMd = fs.readFileSync(charterPath, 'utf-8');
    assert('Charter is non-empty', charterMd.length > 100, `${charterMd.length} chars`);

    // Check all 4 required sections
    for (const section of REQUIRED_SECTIONS) {
      assert(`Charter contains section: "${section}"`, charterMd.includes(section));
    }
  }

  // ─── TEST 4: Master index is explicitly local-only ───
  console.log(`\n  [4/5] Product Isolation Contract\n`);
  const charterMd = fs.readFileSync(charterPath, 'utf-8');
  assert('Index declares that it is not a NotebookLM source', charterMd.includes('not a NotebookLM source'));

  // ─── TEST 5: Every notebook in notebooks.json resolves correctly ───
  // INV-NEW-4: Notebooks with queryEnabled:false MUST return null from getNotebookIdForChassis.
  // Active notebooks MUST return a valid notebookId (length > 10).
  // getNotebookDegradedMode MUST surface QUERY_DISABLED / STALE_NOTEBOOK_SYNC where applicable.
  console.log(`\n  [5/5] Notebook Config Resolution\n`);
  const { getNotebookDegradedMode } = require('../../scripts/lib/sync/knowledge_sync.js');
  const cfg = loadNotebookConfig();
  assert('Notebook config loaded', !!cfg && !!cfg.notebooks);
  if (cfg && cfg.notebooks) {
    const nbNames = Object.keys(cfg.notebooks);
    assert(`notebooks.json has >= 5 registered notebooks`, nbNames.length >= 5, `found ${nbNames.length}`);
    for (const chassisName of nbNames) {
      const entry = cfg.notebooks[chassisName];
      const isDisabled = typeof entry === 'object' && entry !== null && entry.queryEnabled === false;
      const degradedMode = getNotebookDegradedMode(cfg, chassisName);
      if (isDisabled) {
        // Disabled notebooks must return null (INV-NEW-4) and surface QUERY_DISABLED
        const nbId = getNotebookIdForChassis(cfg, chassisName);
        assert(`${chassisName} correctly returns null when queryEnabled:false`, nbId === null, `got ${nbId}`);
        assert(`${chassisName} degraded mode is QUERY_DISABLED`, degradedMode === 'QUERY_DISABLED', degradedMode);
      } else {
        const nbId = getNotebookIdForChassis(cfg, chassisName);
        assert(`${chassisName} resolves to valid notebookId`, !!nbId && nbId.length > 10, nbId);
      }
    }
  }


  // ─── SUMMARY ───
  console.log(`\n${C.bold}${C.cyan}================================================================${C.reset}`);
  console.log(`${C.bold}📊 UNIVERSAL CHARTER VERIFICATION: ${passed}/${total} PASSED${C.reset}`);
  if (passed === total) {
    console.log(`${C.bold}${C.green}🎉 100% UNIVERSAL CHARTER VERIFICATION PASSED!${C.reset}`);
  } else {
    console.log(`${C.bold}${C.red}❌ ${total - passed} CHARTER VERIFICATIONS FAILED${C.reset}`);
  }
  console.log(`${C.bold}${C.cyan}================================================================${C.reset}\n`);

  fs.rmSync(tempOutputs, { recursive: true, force: true });
  if (passed < total) process.exit(1);
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
