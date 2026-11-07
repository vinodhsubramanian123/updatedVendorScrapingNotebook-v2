'use strict';
/**
 * tests/test_knowledge_extractor.js — Unit & Integration Test for RAG Knowledge Extractor
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  extractKnowledgeFromRagAnswer,
  extractAndPersistLearnedDeltas
} = require('../../scripts/lib/notebook/knowledge_extractor.js');

console.log('================================================================');
console.log('🧪 RUNNING GENERIC RAG KNOWLEDGE EXTRACTOR & LEARNING LOOP TESTS');
console.log('================================================================');

// Sample Grounded Answer from NotebookLM with realistic citations
const sampleRagResponse = `
### Core Compatibility Analysis for DL380 Gen12

1. **Option Suffix Constraints (BTO vs FIO)**:
   The standalone BTO Memory SKU P69728-B21 is standard retail packaging and is not allowed in a CTO Base Model. The configurator blocks it with a hard validation error. To pass factory validation, you must configure the FIO equivalent: P69728-F21.

2. **Cross-Generation Enablement Cables**:
   The part P48918-B21 (HPE ProLiant DL360 Gen11 Storage Controller Enablement Cable Kit) is officially validated and listed under QuickSpecs Cable Kits for DL380 Gen12. It acts as the sideband logic bridge between the P47777-B21 controller and the motherboard.

3. **PCIe Slot Riser Dependencies**:
   Populating primary riser P48803-B21 requires P76471-B21 enablement cable kit to activate Slot 1.
`;

// Test 1: BTO -> FIO Option Extraction
const deltas = extractKnowledgeFromRagAnswer(sampleRagResponse, 'outputs/ProLiant/Gen12/DL380_Gen12', {
  chassis: 'DL380_Gen12'
});

console.log(`▶ Extracted ${deltas.length} Knowledge Deltas:`);
deltas.forEach(d => console.log(`  - [${d.ruleType}] Affected: ${d.affectedSku} -> Required/Paired: ${d.requiredDependencySku}`));

assert.ok(deltas.length >= 3, `Expected at least 3 deltas, got ${deltas.length}`);

const fioDelta = deltas.find(d => d.ruleType === 'OPTION_TYPE_SUBSTITUTION');
assert.ok(fioDelta, 'Expected OPTION_TYPE_SUBSTITUTION delta');
assert.strictEqual(fioDelta.affectedSku, 'P69728-B21');
assert.strictEqual(fioDelta.requiredDependencySku, 'P69728-F21');
console.log('  ✅ PASS: Extracted BTO to FIO substitution (P69728-B21 -> P69728-F21)');

const carryOverDelta = deltas.find(d => d.ruleType === 'CARRY_OVER_VALIDATED');
assert.ok(carryOverDelta, 'Expected CARRY_OVER_VALIDATED delta');
assert.strictEqual(carryOverDelta.affectedSku, 'P48918-B21');
console.log('  ✅ PASS: Extracted carry-over validation (P48918-B21 on DL380 Gen12)');

const depDelta = deltas.find(d => d.ruleType === 'DEPENDENCY_CHAIN');
assert.ok(depDelta, 'Expected DEPENDENCY_CHAIN delta');
assert.strictEqual(depDelta.affectedSku, 'P48803-B21');
assert.strictEqual(depDelta.requiredDependencySku, 'P76471-B21');
console.log('  ✅ PASS: Extracted riser cable dependency chain (P48803-B21 -> P76471-B21)');

// Test 2: Persistence & Deduping with High Confidence (Auto-Promotion)
const { setQuarantineFilePath } = require('../../scripts/lib/feedback/quarantined_deltas.js');
const testRoot = path.join(os.tmpdir(), `vendor-notebook-extractor-${process.pid}`);
fs.mkdirSync(testRoot, { recursive: true });
const testQuarantineFile = path.join(testRoot, 'test_extractor_quarantine.json');
setQuarantineFilePath(testQuarantineFile);

const tempDir = path.join(testRoot, 'test_learning_loop');
if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true });
fs.mkdirSync(tempDir, { recursive: true });

const verifiedContext = {
  chassis: 'Test_Chassis',
  confidenceScore: 0.90,
  source: 'NOTEBOOK_LM_CLOUD',
  groundingVerification: 'VERIFIED_GROUNDED',
  citations: [{ title: 'HPE DL380 Gen12 QuickSpecs', sourceId: 'trusted-source-1' }]
};
const persistResult1 = extractAndPersistLearnedDeltas(sampleRagResponse, tempDir, verifiedContext);
assert.ok(persistResult1.count >= 3, 'Expected at least 3 deltas saved');
console.log(`  ✅ PASS: First pass persisted ${persistResult1.count} deltas to disk with confidence >= 0.85`);

const persistResult2 = extractAndPersistLearnedDeltas(sampleRagResponse, tempDir, verifiedContext);
assert.strictEqual(persistResult2.count, 0, 'Second pass with same text should add 0 duplicates');
console.log('  ✅ PASS: Duplicate suppression verified (0 duplicates added)');

// Test 3: Default confidence (0.70) routes to Quarantine (INV-48)
const quarantineTempDir = path.join(testRoot, 'test_learning_loop_q');
if (fs.existsSync(quarantineTempDir)) fs.rmSync(quarantineTempDir, { recursive: true });
fs.mkdirSync(quarantineTempDir, { recursive: true });

const persistResultQ = extractAndPersistLearnedDeltas(sampleRagResponse, quarantineTempDir, {
  ...verifiedContext,
  chassis: 'Test_Chassis_Q',
  confidenceScore: 0.70
});
assert.strictEqual(persistResultQ.count, 0, 'Default 0.70 confidence deltas must not be auto-promoted');
assert.ok(persistResultQ.quarantinedCount >= 3, 'Default 0.70 confidence deltas must be held in quarantine');
console.log(`  ✅ PASS: Default confidence (0.70) correctly held ${persistResultQ.quarantinedCount} deltas in quarantine`);

// Test 4: Block extraction from Local Fallback or Forbidden Source
const fallbackResult = extractAndPersistLearnedDeltas(sampleRagResponse, quarantineTempDir, {
  chassis: 'Test_Chassis_Q',
  source: 'LOCAL_RAG_FALLBACK'
});
assert.strictEqual(fallbackResult.count, 0, 'Must not extract deltas from LOCAL_RAG_FALLBACK');
assert.strictEqual(fallbackResult.quarantinedCount, 0, 'Must not quarantine deltas from LOCAL_RAG_FALLBACK');
console.log('  ✅ PASS: Blocked delta extraction from LOCAL_RAG_FALLBACK');

// Test 5: Corrupt active knowledge must fail closed and remain untouched.
const corruptDeltaPath = path.join(tempDir, 'history', 'catalog_deltas.json');
const corruptLedger = '[{"deltaId":"BROKEN"';
fs.writeFileSync(corruptDeltaPath, corruptLedger, 'utf-8');
assert.throws(
  () => extractAndPersistLearnedDeltas(sampleRagResponse, tempDir, verifiedContext),
  /JSON|Unexpected end/,
  'Corrupt active knowledge must stop extraction instead of being replaced'
);
assert.strictEqual(fs.readFileSync(corruptDeltaPath, 'utf-8'), corruptLedger, 'Corrupt ledger must remain available for recovery');
console.log('  ✅ PASS: Corrupt active knowledge ledger fails closed without overwrite');

// Test 6: Negative-path guard against prohibitions, disjunctive alternatives, co-listed SKUs, and invalid-SKU substitutions
const negativeRagResponse = `
1. **Thermal Heatsink Prohibition**:
   Standard Heatsink P48814-B21 is strictly barred/prohibited with P48813-B21 or P48815-B21 in high-TDP 350W configurations.

2. **Disjunctive Cage Alternatives**:
   Configuring 24x SFF NVMe drives requires P48805-B21 (8SFF U.3 x4 Cage Kit) or P48802-B21 (8SFF U.3 x1 Cage Kit).

3. **Co-Listed Subject Drives**:
   Mixing SAS and NVMe drives (P28586-B21 and P40430-B21) on the same backplane requires P47777-B21 Tri-Mode controller.

4. **Invalid SKU Substitution**:
   Invalid SKU P48818-B21 is not a valid DL380 Gen12 battery; the valid Smart Storage Hybrid Capacitor SKU is P38995-B21.
`;
const negDeltas = extractKnowledgeFromRagAnswer(negativeRagResponse, 'outputs/ProLiant/Gen12/DL380_Gen12', {
  chassis: 'DL380_Gen12'
});
const falseProhibitedDep = negDeltas.find(d => d.ruleType === 'DEPENDENCY_CHAIN' && d.affectedSku === 'P48814-B21');
assert.strictEqual(falseProhibitedDep, undefined, 'Prohibited heatsink clause must NOT emit a DEPENDENCY_CHAIN');
const falseDisjunctiveDep = negDeltas.find(d => d.ruleType === 'DEPENDENCY_CHAIN' && d.affectedSku === 'P48805-B21' && d.requiredDependencySku === 'P48802-B21');
assert.strictEqual(falseDisjunctiveDep, undefined, 'Disjunctive cage alternative (A or B) must NOT emit a DEPENDENCY_CHAIN');
const falseColistedDep = negDeltas.find(d => d.ruleType === 'DEPENDENCY_CHAIN' && d.affectedSku === 'P28586-B21' && d.requiredDependencySku === 'P40430-B21');
assert.strictEqual(falseColistedDep, undefined, 'Co-listed subject SKUs (A and B) before requires verb must NOT emit A -> B DEPENDENCY_CHAIN');
const validSubDelta = negDeltas.find(d => d.ruleType === 'SKU_SUBSTITUTION' && d.affectedSku === 'P48818-B21' && d.requiredDependencySku === 'P38995-B21');
assert.ok(validSubDelta, 'Invalid SKU ... valid SKU is ... must extract as SKU_SUBSTITUTION');
console.log('  ✅ PASS: Negative-path guards prevented false DEPENDENCY_CHAIN extraction and classified SKU_SUBSTITUTION');

// Clean up temp dirs and reset quarantine
fs.rmSync(tempDir, { recursive: true, force: true });
fs.rmSync(quarantineTempDir, { recursive: true, force: true });
setQuarantineFilePath(null);
if (fs.existsSync(testQuarantineFile)) fs.rmSync(testQuarantineFile, { force: true });
fs.rmSync(testRoot, { recursive: true, force: true });

console.log('================================================================');
console.log('🎉 ALL KNOWLEDGE EXTRACTOR & LEARNING LOOP TESTS PASSED (100%)');
console.log('================================================================');
