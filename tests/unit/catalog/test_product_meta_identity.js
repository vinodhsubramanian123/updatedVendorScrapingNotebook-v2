'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseProductMeta } = require('../../../scripts/lib/catalog/product_meta.js');

test('product parser preserves DL380a identity and canonicalizes chassis variants', () => {
  assert.deepEqual(parseProductMeta('HPE ProLiant DL380a Gen12 8SFF CTO Server'), {
    family: 'ProLiant',
    gen: 'Gen12',
    cleanName: 'DL380a_Gen12'
  });
  assert.deepEqual(parseProductMeta('HPE ProLiant DL380 Gen12 24SFF CTO Server'), {
    family: 'ProLiant',
    gen: 'Gen12',
    cleanName: 'DL380_Gen12'
  });
  assert.notEqual(
    parseProductMeta('HPE ProLiant DL380a Gen12').cleanName,
    parseProductMeta('HPE ProLiant DL380 Gen12').cleanName
  );
});
