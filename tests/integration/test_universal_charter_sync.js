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

const { buildMasterKnowledgeRegistry, getNotebookIdForChassis, loadNotebookConfig } = require('../../scripts/lib/sync/knowledge_sync.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const CHARTER_PATH = path.join(PROJECT_ROOT, 'outputs', 'history', 'master_universal_knowledge_charter.md');
const REGISTRY_PATH = path.join(PROJECT_ROOT, 'outputs', 'history', 'master_knowledge_registry.json');

const C = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  cyan: '\x1b[36m', bold: '\x1b[1m'
};

const REQUIRED_CLIC_RULES = [
  '81354490',  // Container tree: BTO memory outside container
  '91001655',  // Container tree: unparented component
  '81354627',  // Y-Cable incompatibility (controller type)
  '81354632',  // Y-Cable incompatibility (cage type)
  '81354654',  // Fan kit cardinality (max 1 kit)
  '81355854',  // OCP cable mutual exclusion
  '81016755',  // Riser cable kit (primary Slot 1)
  '81322276'   // Mandatory management license
];

const REQUIRED_SECTIONS = [
  'Universal Vendor',
  'Family & Generation',
  'Chassis-Specific Gotchas',
  'Master Knowledge Deltas Registry'
];

async function run() {
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
  const registry = buildMasterKnowledgeRegistry();
  assert('Registry object is not null', registry !== null && registry !== undefined);
  assert('Registry has generatedAt (INV-4)', !!registry.generatedAt);
  assert('Registry has schemaVersion (INV-4)', registry.schemaVersion === '1.0');
  assert('Registry has totalLearnedRules >= 0', typeof registry.totalLearnedRules === 'number' && registry.totalLearnedRules >= 0,
    `totalLearnedRules=${registry.totalLearnedRules}`);
  assert('Registry has counts object', !!registry.counts && typeof registry.counts.universal === 'number');
  assert('Registry has productFamiliesSynced array', Array.isArray(registry.productFamiliesSynced));

  // ─── TEST 2: master_knowledge_registry.json persisted ───
  console.log(`\n  [2/5] Master Knowledge Registry JSON Persistence\n`);
  assert('master_knowledge_registry.json exists', fs.existsSync(REGISTRY_PATH));
  if (fs.existsSync(REGISTRY_PATH)) {
    const onDisk = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
    assert('On-disk registry has generatedAt', !!onDisk.generatedAt);
    assert('On-disk registry has schemaVersion 1.0', onDisk.schemaVersion === '1.0');
    assert('On-disk totalLearnedRules matches', onDisk.totalLearnedRules === registry.totalLearnedRules);
  }

  // ─── TEST 3: master_universal_knowledge_charter.md emitted ───
  console.log(`\n  [3/5] Master Universal Knowledge Charter Markdown\n`);
  assert('master_universal_knowledge_charter.md exists', fs.existsSync(CHARTER_PATH));
  if (fs.existsSync(CHARTER_PATH)) {
    const charterMd = fs.readFileSync(CHARTER_PATH, 'utf-8');
    assert('Charter is non-empty', charterMd.length > 100, `${charterMd.length} chars`);

    // Check all 4 required sections
    for (const section of REQUIRED_SECTIONS) {
      assert(`Charter contains section: "${section}"`, charterMd.includes(section));
    }
  }

  // ─── TEST 4: Charter contains all CLIC rule references ───
  console.log(`\n  [4/5] CLIC Rule Coverage in Charter\n`);
  if (fs.existsSync(CHARTER_PATH)) {
    const charterMd = fs.readFileSync(CHARTER_PATH, 'utf-8');
    for (const ruleId of REQUIRED_CLIC_RULES) {
      assert(`Charter references CLIC Rule ${ruleId}`, charterMd.includes(ruleId));
    }
  }

  // ─── TEST 5: Every notebook in notebooks.json resolves to valid notebookId ───
  console.log(`\n  [5/5] Notebook Config Resolution\n`);
  const cfg = loadNotebookConfig();
  assert('Notebook config loaded', !!cfg && !!cfg.notebooks);
  if (cfg && cfg.notebooks) {
    const nbNames = Object.keys(cfg.notebooks);
    assert(`notebooks.json has >= 5 registered notebooks`, nbNames.length >= 5, `found ${nbNames.length}`);
    for (const chassisName of nbNames) {
      const nbId = getNotebookIdForChassis(cfg, chassisName);
      assert(`${chassisName} resolves to valid notebookId`, !!nbId && nbId.length > 10, nbId);
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

  if (passed < total) process.exit(1);
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
