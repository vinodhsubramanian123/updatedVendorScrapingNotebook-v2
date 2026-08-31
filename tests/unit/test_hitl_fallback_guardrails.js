'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { detectChassisVariant, autoDetectChassisDetailed } = require('../../scripts/lib/catalog/catalog_discovery.js');
const { loadCatalogRules } = require('../../scripts/lib/catalog/catalog_rules.js');

console.log('================================================================');
console.log('🧪 TEST: Human-in-the-Loop Fallback Guardrails & Chassis Isolation');
console.log('================================================================\n');

// 1. Unknown BOQ items must trigger Human-In-The-Loop Confirmation, NOT silent Gen12
const unknownBoq = [
  { sku: 'UNRECOGNIZED-001', description: 'Generic third-party server part', quantity: 1 }
];

const detectedVariant = detectChassisVariant(unknownBoq);
console.log('[1] Testing detectChassisVariant on unknown BOQ:');
console.log('    Result:', detectedVariant);
assert.strictEqual(detectedVariant.unknown, true, 'Must flag unknown: true');
assert.strictEqual(detectedVariant.requiresUserConfirmation, true, 'Must flag requiresUserConfirmation: true');
assert.notStrictEqual(detectedVariant.id, 'DL380_Gen12_SFF', 'Must NOT silently fall back to DL380_Gen12_SFF');
console.log('    ✅ PASS: Unknown BOQ correctly flagged for Human-in-the-Loop confirmation.');

// 2. autoDetectChassisDetailed must return confidenceScore 0.0 and requiresUserConfirmation
const detailedDetection = autoDetectChassisDetailed(unknownBoq);
console.log('\n[2] Testing autoDetectChassisDetailed on unknown BOQ:');
console.log('    Result:', detailedDetection);
assert.strictEqual(detailedDetection.requiresUserConfirmation, true, 'Must require user confirmation');
assert.strictEqual(detailedDetection.confidenceScore, 0.0, 'Confidence score must be 0.0');
assert.strictEqual(detailedDetection.chassisDir, '', 'Chassis directory must be empty');
console.log('    ✅ PASS: autoDetectChassisDetailed requires confirmation and sets confidenceScore 0.0.');

// 3. Known Gen11 BOQ items must resolve to DL380_Gen11, NOT Gen12
const gen11Boq = [
  { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF Configure-to-order Server', quantity: 1 }
];
const gen11Variant = detectChassisVariant(gen11Boq);
console.log('\n[3] Testing detectChassisVariant on DL380 Gen11 BOQ:');
console.log('    Result:', gen11Variant);
assert.strictEqual(gen11Variant.gen, 'Gen11', 'Gen must be Gen11');
assert.strictEqual(gen11Variant.model, 'DL380 Gen11 8SFF', 'Model must be DL380 Gen11 8SFF');
assert.notStrictEqual(gen11Variant.id, 'DL380_Gen12_SFF', 'Must NOT be DL380_Gen12_SFF');
console.log('    ✅ PASS: Gen11 BOQ accurately resolved to Gen11 without Gen12 cross-pollution.');

// 4. loadCatalogRules('') with empty or invalid path must return safe empty rules
const emptyRules = loadCatalogRules('');
console.log('\n[4] Testing loadCatalogRules on empty target:');
assert.strictEqual(emptyRules.sourceFile, 'NONE', 'sourceFile must be NONE');
assert.strictEqual(emptyRules.parsedRules.length, 0, 'parsedRules must be empty');
console.log('    ✅ PASS: Empty target returns safe empty rule structure without defaulting to Gen12.');

// 5. Per-chassis Notebook ID resolution
const notebooksCfg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../scripts/config/notebooks.json'), 'utf-8'));
assert.strictEqual(notebooksCfg.notebooks['DL380_Gen11'].notebookId, 'd37fa851-90cb-45b7-a8e1-78488a0bc6e6', 'Gen11 notebook ID must match');
const gen12Entry = notebooksCfg.notebooks['DL380_Gen12'] || notebooksCfg.notebooks['DL380_Gen12_SFF'];
assert.strictEqual(gen12Entry.notebookId, '1d190853-4e9c-48df-aa70-eae66c6f2c1f', 'Gen12 notebook ID must match');
assert.strictEqual(notebooksCfg.notebooks['Alletra_Storage_System'].notebookId, 'a67629ba-3434-42ab-b465-bd6d71852198', 'Alletra notebook ID must match');
console.log('\n[5] ✅ PASS: Per-chassis notebook IDs verified in config/notebooks.json.');

console.log('\n================================================================');
console.log('🎉 ALL HITL FALLBACK & ISOLATION TESTS PASSED (100% COMPLIANT)');
console.log('================================================================\n');
