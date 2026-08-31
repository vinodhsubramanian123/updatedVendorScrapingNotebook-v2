const test = require('node:test');
const assert = require('node:assert');
const { queryLocalKnowledgeBase } = require('../../scripts/lib/rag/local_rag_search');

test('Generation Firewall (INV-48) — Gen12 Query Isolation', () => {
  const res = queryLocalKnowledgeBase('Intel Xeon Processor 64 cores', 'DL380_Gen12');
  assert.ok(res, 'Should return search result');
  assert.ok(Array.isArray(res.citations), 'Citations should be an array');
  
  // Verify none of the citations are from Gen11
  for (const c of res.citations) {
    assert.strictEqual(c.url.includes('DL380_Gen11'), false, `Gen12 query must not cite Gen11: ${c.url}`);
    assert.strictEqual(c.title.includes('Gen11') || c.title.includes('Gen 11'), false, `Gen12 query must not return Gen11 title: ${c.title}`);
  }
});

test('Generation Firewall (INV-48) — Gen11 Query Isolation', () => {
  const res = queryLocalKnowledgeBase('Intel Xeon Scalable Processor', 'DL380_Gen11');
  assert.ok(res, 'Should return search result');
  
  // Verify none of the citations are from Gen12
  for (const c of res.citations) {
    assert.strictEqual(c.url.includes('DL380_Gen12'), false, `Gen11 query must not cite Gen12: ${c.url}`);
    assert.strictEqual(c.title.includes('Gen12') || c.title.includes('Gen 12'), false, `Gen11 query must not return Gen12 title: ${c.title}`);
  }
});

test('Generation Firewall (INV-48) — Zero Fallback on Unmatched Chassis', () => {
  const res = queryLocalKnowledgeBase('Intel Xeon Processor', 'NonExistent_Chassis_9999');
  assert.ok(res, 'Should return result object');
  assert.strictEqual(res.citations.length, 0, 'Unmatched chassis must NOT fall back to dumping all other catalogs');
});
