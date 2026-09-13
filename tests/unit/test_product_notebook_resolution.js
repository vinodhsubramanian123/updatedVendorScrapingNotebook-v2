'use strict';
/**
 * tests/unit/test_product_notebook_resolution.js
 *
 * Unit tests validating product and notebook isolation between DL380a (AI GPU server)
 * and standard DL380 (Gen11 & Gen12) across:
 * 1. resolveProductIdentity (product_scope.js)
 * 2. detectChassisVariant (catalog_discovery.js)
 * 3. getNotebookConfigEntry / resolveNotebookIdAsync (notebook_query_utils.js)
 * 4. getChassisCatalog / executeRoutedQuery (route_query.js)
 * 5. filterCatalogsByChassisFirewall (local_rag_search.js)
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');

const { resolveProductIdentity } = require('../../scripts/lib/catalog/product_scope.js');
const { detectChassisVariant } = require('../../scripts/lib/catalog/catalog_discovery.js');
const { resolveNotebookIdAsync, getNotebookConfigEntry } = require('../../scripts/lib/notebook/notebook_query_utils.js');
const { executeRoutedQuery } = require('../../scripts/evaluators/route_query.js');
const { queryLocalKnowledgeBase } = require('../../scripts/lib/rag/local_rag_search.js');
const notebookConfig = require('../../scripts/config/notebooks.json');

describe('🔒 Product & Notebook Resolution Isolation Suite (DL380a vs DL380)', () => {

  test('1. resolveProductIdentity resolves DL380a variants and preserves isolation from DL380', () => {
    const dl380aVariants = ['DL380a', 'DL 380a', 'DL 380 a', 'DL380a_Gen12', 'DL 380a Gen12'];
    dl380aVariants.forEach(variant => {
      const id = resolveProductIdentity(variant, notebookConfig);
      assert.ok(id, `Must resolve identity for variant '${variant}'`);
      assert.strictEqual(id.productId, 'DL380a_Gen12', `'${variant}' must resolve to DL380a_Gen12`);
      assert.notStrictEqual(id.productId, 'DL380_Gen12', `'${variant}' must never resolve to standard DL380_Gen12`);
    });

    const standardVariants = ['DL380_Gen12', 'DL 380 Gen12', 'DL380 Gen 12'];
    standardVariants.forEach(variant => {
      const id = resolveProductIdentity(variant, notebookConfig);
      assert.ok(id, `Must resolve identity for '${variant}'`);
      assert.strictEqual(id.productId, 'DL380_Gen12');
    });

    const gen11Variants = ['DL380_Gen11', 'DL 380 Gen11', 'DL380 Gen 11'];
    gen11Variants.forEach(variant => {
      const id = resolveProductIdentity(variant, notebookConfig);
      assert.ok(id, `Must resolve identity for '${variant}'`);
      assert.strictEqual(id.productId, 'DL380_Gen11');
    });
  });

  test('2. detectChassisVariant identifies DL380a with various whitespace patterns', () => {
    const testCases = [
      { desc: 'HPE ProLiant Compute DL 380a Gen12 8DW/16SW CTO Server', expected: 'DL380a_Gen12' },
      { desc: 'HPE ProLiant Compute DL380a Gen12 8DW/16SW CTO Server', expected: 'DL380a_Gen12' },
      { desc: 'HPE ProLiant Compute DL 380 a Gen12 Server', expected: 'DL380a_Gen12' },
      { desc: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', expected: 'DL380_Gen12' },
      { desc: 'HPE ProLiant DL 380 Gen12 8SFF CTO Server', expected: 'DL380_Gen12' },
      { desc: 'HPE ProLiant DL 380 Gen11 8SFF CTO Server', expected: 'DL380_Gen11' }
    ];

    testCases.forEach(({ desc, expected }) => {
      const detected = detectChassisVariant([{ description: desc }]);
      assert.strictEqual(detected.id, expected, `Description '${desc}' must detect as '${expected}'`);
    });
  });

  test('3. resolveNotebookIdAsync dynamically maps DL380a to its dedicated notebook UUID without nudging', async () => {
    const expectedDl380aNotebookId = notebookConfig.notebooks['DL380a_Gen12'].notebookId;
    assert.ok(expectedDl380aNotebookId, 'DL380a_Gen12 notebookId must exist in notebooks.json');

    const dl380aContexts = [
      { chassis: 'DL380a' },
      { chassis: 'DL 380a' },
      { chassis: 'DL 380 a' },
      { chassis: 'DL380a_Gen12' },
      { query: 'Tell me about DL 380a GPU configurations' },
      { text: 'Customer tender for DL 380a servers' }
    ];

    for (const ctx of dl380aContexts) {
      const resolved = await resolveNotebookIdAsync(null, ctx);
      assert.strictEqual(resolved, expectedDl380aNotebookId, `Context ${JSON.stringify(ctx)} must resolve to DL380a notebook ${expectedDl380aNotebookId}`);
      assert.notStrictEqual(resolved, notebookConfig.notebooks['DL380_Gen12'].notebookId, 'Must not resolve to standard DL380 Gen12 notebook');
    }
  });

  test('4. executeRoutedQuery routes freeform DL 380a queries to DL380a catalog and returns DL380a processors', async () => {
    const res = await executeRoutedQuery('What are the processor options for DL 380a?');
    assert.strictEqual(res.classification.intent, 'FREEFORM_QA');
    assert.strictEqual(res.result.chassis, 'DL380a_Gen12');
    assert.ok(res.result.citations.length > 0, 'Must have citations from DL380a catalog');
    assert.ok(res.result.answer.includes('DL380a_Gen12'), 'Answer must reference DL380a_Gen12');
    assert.ok(!res.result.answer.includes('(DL380_Gen12)'), 'Answer must not reference standard DL380_Gen12');
  });

  test('5. queryLocalKnowledgeBase returns valid results for DL380a aliases and adheres to firewall', () => {
    const resDl380a = queryLocalKnowledgeBase('Intel Xeon', 'DL 380a');
    assert.ok(resDl380a.citations.length > 0, 'DL 380a query must return citations');
    resDl380a.citations.forEach(c => {
      assert.ok(c.url.includes('DL380a_Gen12') || c.url.includes('master_knowledge_registry.json'), `Citation ${c.url} must point to DL380a directory or master registry`);
    });

    const resStandard = queryLocalKnowledgeBase('Intel Xeon', 'DL380_Gen12');
    assert.ok(resStandard.citations.length > 0, 'DL380_Gen12 query must return citations');
    resStandard.citations.forEach(c => {
      assert.ok(!c.url.includes('DL380a_Gen12'), `Citation ${c.url} must NOT point to DL380a directory`);
    });
  });

});
