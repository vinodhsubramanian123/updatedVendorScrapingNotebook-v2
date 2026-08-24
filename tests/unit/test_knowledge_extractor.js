'use strict';
/**
 * tests/test_knowledge_extractor.js — Unit & Integration Test for RAG Knowledge Extractor
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
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
const deltas = extractKnowledgeFromRagAnswer(sampleRagResponse, 'outputs/ProLiant/Gen12/DL380_Gen12_SFF', {
  chassis: 'DL380_Gen12_SFF'
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

// Test 2: Persistence & Deduping
const tempDir = path.join(__dirname, '../..', 'outputs', 'temp', 'test_learning_loop');
if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true });
fs.mkdirSync(tempDir, { recursive: true });

const persistResult1 = extractAndPersistLearnedDeltas(sampleRagResponse, tempDir, { chassis: 'Test_Chassis' });
assert.ok(persistResult1.count >= 3, 'Expected at least 3 deltas saved');
console.log(`  ✅ PASS: First pass persisted ${persistResult1.count} deltas to disk`);

const persistResult2 = extractAndPersistLearnedDeltas(sampleRagResponse, tempDir, { chassis: 'Test_Chassis' });
assert.strictEqual(persistResult2.count, 0, 'Second pass with same text should add 0 duplicates');
console.log('  ✅ PASS: Duplicate suppression verified (0 duplicates added)');

// Clean up temp dir
fs.rmSync(tempDir, { recursive: true });

console.log('================================================================');
console.log('🎉 ALL KNOWLEDGE EXTRACTOR & LEARNING LOOP TESTS PASSED (100%)');
console.log('================================================================');
