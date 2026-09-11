'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../../scripts/config/notebooks.json');
const { buildTrustedSourceIds } = require('../../scripts/lib/sync/nlm_sync_client.js');

const CERTIFIED_PRODUCTS = ['DL380_Gen11', 'DL380_Gen12', 'DL380a_Gen12', 'DL145_Gen11'];

test('product NotebookLM trust sets exclude every quarantined source', () => {
  for (const product of CERTIFIED_PRODUCTS) {
    const entry = config.notebooks[product];
    const quarantined = new Set(entry.quarantinedSourceIds || []);
    assert.deepEqual(entry.trustedSourceIds.filter(id => quarantined.has(id)), [], product);
    const expectedCanonical = [entry.driveSourceId, entry.runningKnowledgeSourceId].filter(Boolean);
    assert.deepEqual(entry.canonicalKnowledgeSourceIds, expectedCanonical, product);
    assert(entry.trustedSourceIds.includes(entry.driveSourceId), product);
    if (entry.runningKnowledgeSourceId) {
      assert(entry.trustedSourceIds.includes(entry.runningKnowledgeSourceId), product);
    }
    assert(entry.officialSourceIds.every(id => entry.trustedSourceIds.includes(id)), product);
  }
});

test('sync trust-set builder cannot re-enable a quarantined source', () => {
  const trusted = buildTrustedSourceIds({
    officialSourceIds: ['official'],
    certifiedCatalogSourceIds: ['sheet'],
    verifiedLearningSourceIds: ['unsafe-learning', 'verified-learning'],
    quarantinedSourceIds: ['unsafe-learning', 'shared-master']
  }, 'sheet', 'sheet');
  assert.deepEqual(trusted, ['official', 'sheet', 'verified-learning']);
});
