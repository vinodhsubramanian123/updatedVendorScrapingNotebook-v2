'use strict';
const assert = require('assert');
const { preprocessAndGroupBOQ } = require('../../scripts/lib/boq/boq_preprocessor.js');

function runTests() {
  console.log('🧪 Starting BOQ Preprocessor Test Suite...');

  // Test multi-node customer quotes with multiple chassis
  const rawBOQ = `
[Database Nodes - 5x]
P76706-B21,HPE ProLiant DL380 Gen12 8SFF CTO Server,5
P49033-B21,HPE DL38X Gen12 Intel Xeon-G 6430 CPU,10
P43331-B21,HPE 64GB 2Rx4 PC5-4800B-R Smart Kit,40
P40502-B21,HPE 800GB NVMe Gen4 High Performance SSD,20

[Web Nodes - 8x]
P56900-B21,HPE ProLiant DL380 Gen11 8SFF CTO Server,8
P49030-B21,HPE DL38X Gen11 Intel Xeon-S 4410Y CPU,16
P43328-B21,HPE 32GB 2Rx4 PC5-4800B-R Smart Kit,64
P40502-B21,HPE 800GB NVMe Gen4 High Performance SSD,16

[Storage - 2x]
R0Q21A,HPE MSA 2060 10GbE iSCSI LFF Storage,2
R0Q21A-B21,HPE MSA 2060 10GbE iSCSI LFF Storage Array,2
  `;

  console.log('▶ Test: Multi-Node Complex BOQ Grouping');
  const result = preprocessAndGroupBOQ(null, rawBOQ);

  assert.ok(result, 'Result should not be null');
  assert.strictEqual(result.totalVariations, 3, 'Should extract 3 distinct configurations');
  assert.strictEqual(result.variations.length, 3, 'Variations array should match totalVariations');

  // Verify configuration mappings
  const dbNode = result.variations.find(v => v.baseChassisQty === 5);
  assert.ok(dbNode, 'Database node configuration missing');
  assert.strictEqual(dbNode.baseChassisQty, 5, 'Database chassis quantity mismatch');

  const webNode = result.variations.find(v => v.baseChassisQty === 8);
  assert.ok(webNode, 'Web node configuration missing');
  assert.strictEqual(webNode.baseChassisQty, 8, 'Web chassis quantity mismatch');

  const storageNode = result.variations.find(v => v.name.includes('Storage') || v.baseChassisQty === 2);
  assert.ok(storageNode, 'Storage configuration missing');
  assert.strictEqual(storageNode.baseChassisQty, 2, 'Storage chassis quantity mismatch');

  // Check preflight pipeline
  assert.ok(result.preflightPipeline, 'Preflight pipeline missing');
  assert.strictEqual(result.preflightPipeline.stagesCleared, 5, 'Should clear all 5 pipeline stages');
  assert.ok(Array.isArray(result.preflightPipeline.stages), 'Pipeline stages should be an array');
  assert.strictEqual(result.preflightPipeline.isHitlRequired, false, 'HITL should not be required for this clean config');

  console.log('✅ All BOQ Preprocessor tests passed!\n');
}

runTests();
