'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { cleanBaseSKU, isValidHpeSKU } = require('../../scripts/lib/catalog/sku.js');
const { generateLifecycleRecommendations } = require('../../scripts/lib/conflict/resolution_matrix.js');
const { evalSupportServices } = require('../../scripts/lib/aspects/support_services.js');

test('Lifecycle Status Tag & Clean PID Separation (INV-21)', async (t) => {
  await t.test('should cleanly strip obsolete (OB) and direct ship (DS) badges from base SKUs', () => {
    const obInput = 'OB\n P49631-B21';
    const dsInput = 'DS \t P49632-B21CTO';
    const ninetyInput = '90\n\tP49639-B21';
    const eolInput = '[EOL] P49638-B21';

    assert.strictEqual(cleanBaseSKU(obInput), 'P49631-B21');
    assert.strictEqual(cleanBaseSKU(dsInput), 'P49632-B21');
    assert.strictEqual(cleanBaseSKU(ninetyInput), 'P49639-B21');
    assert.strictEqual(cleanBaseSKU(eolInput), 'P49638-B21');
  });

  await t.test('should validate cleaned SKUs with isValidHpeSKU() without regex rejection', () => {
    const cleaned = cleanBaseSKU('OB P49631-B21');
    assert.strictEqual(cleaned, 'P49631-B21');
    assert.strictEqual(isValidHpeSKU(cleaned), true);
  });
});

test('Lifecycle Aspect Evaluator & Matrix Recommendations (INV-20, INV-22)', async (t) => {
  await t.test('should flag Obsolete and EOL Warning in evalSupportServices', () => {
    const mockItems = [
      { sku: 'P49631-B21', description: 'Intel Xeon-Platinum 8468V 2.4GHz 48-core Processor [OB]' },
      { sku: 'P49639-B21', description: '90-Day Warning EOL Part', lifecycleStatus: '90-Day' },
      { sku: 'P43328-B21', description: 'HPE 64GB 2Rx4 DDR5-4800 DIMM', lifecycleStatus: 'Active' }
    ];

    const result = evalSupportServices(mockItems);
    assert.strictEqual(result.hasObsoleteRisk, true, 'Should detect Obsolete risk');
    assert.strictEqual(result.hasEolWarning, true, 'Should detect EOL warning risk');
  });

  await t.test('should generate actionable upgrade recommendations for lifecycle risks in resolution_matrix', () => {
    const mockItems = [
      { sku: 'P49631-B21', description: 'Intel Xeon-Platinum 8468V 2.4GHz 48-core Processor [OB]' },
      { sku: '90 P49639-B21', description: 'Some EOL Part' },
      { sku: 'P43328-B21', description: 'Active Part' }
    ];

    const recommendations = generateLifecycleRecommendations(mockItems);
    assert.strictEqual(recommendations.length, 2, 'Should generate exactly 2 recommendations');
    
    const obRec = recommendations.find(r => r.risk === 'Obsolete (OB)');
    assert.ok(obRec, 'Must have Obsolete recommendation');
    assert.strictEqual(obRec.action, 'Upgrade to Next-Gen Equivalent');
    
    const eolRec = recommendations.find(r => r.risk === 'EOL Warning (90-Day)');
    assert.ok(eolRec, 'Must have EOL recommendation');
    assert.strictEqual(eolRec.action, 'Plan upgrade within 90 days');
  });
});
