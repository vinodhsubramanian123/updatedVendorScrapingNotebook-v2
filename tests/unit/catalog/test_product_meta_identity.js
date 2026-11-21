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
  assert.deepEqual(parseProductMeta('Q6Q62C - HPE MSL3040 Scalable Base Module'), {
    family: 'StoreEver',
    gen: 'Tape',
    cleanName: 'MSL3040_Tape'
  });
  const { isCanonicalCtoChassisCandidate } = require('../../../scripts/catalogs/build_catalog.js');
  assert.equal(
    isCanonicalCtoChassisCandidate({ sku: 'Q6Q62C', text: 'Q6Q62C - HPE MSL3040 Scalable Base Module', isBto: false }, 'MSL3040_Tape'),
    true
  );
  assert.equal(
    isCanonicalCtoChassisCandidate({ sku: 'Q6Q64A', text: 'Q6Q64A - HPE StoreEver MSL3040 Upgrade Power Supply Kit', isBto: false }, 'MSL3040_Tape'),
    false
  );
});
