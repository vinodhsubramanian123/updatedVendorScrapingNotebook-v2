'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const {
  extractModelGeneration,
  isExactProductCandidate
} = require('../../scripts/lib/scraper/navigate_oca.js');

describe('OCA navigator exact standard CTO selection', () => {
  test('preserves the DL380 versus DL380a product boundary', () => {
    assert.deepEqual(extractModelGeneration('HPE ProLiant DL380a Gen12 CTO Server'), {
      model: 'dl380a', generation: 'gen12'
    });
    assert.equal(isExactProductCandidate('DL380a Gen12', {
      text: 'HPE ProLiant DL380 Gen12 8SFF Configure-to-order Server',
      sku: 'P73282-B21', isCto: true
    }), false);
  });

  test('accepts exact standard CTO and rejects TAA, GTA, and BTO variants', () => {
    const standard = {
      text: 'HPE ProLiant Compute DL380a Gen12 8DW Configure-to-order Server',
      sku: 'P76706-B21', isCto: true
    };
    assert.equal(isExactProductCandidate('DL380a Gen12', standard), true);
    assert.equal(isExactProductCandidate('DL380a Gen12', { ...standard, isBto: true }), false);
    assert.equal(isExactProductCandidate('DL380a Gen12', { ...standard, isTaa: true }), false);
    assert.equal(isExactProductCandidate('DL380a Gen12', { ...standard, sku: 'P76706-B21#GTA' }), false);
  });
});
