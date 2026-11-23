'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { cleanBaseSKU, isValidHpeSKU, classifyLifecycleState } = require('../../scripts/lib/catalog/sku.js');
const { generateLifecycleRecommendations } = require('../../scripts/lib/conflict/resolution_matrix.js');
const { evalSupportServices } = require('../../scripts/lib/aspects/support_services.js');
const { parseVendorDate, analyzeRetirementDate } = require('../../scripts/lib/catalog/lifecycle.js');

test('OS, CS, DS and 90-day rows get a scoped active alternative even when their badges are the only evidence', () => {
  const { parseSkuLines } = require('../../scripts/lib/boq/boq_parser.js');
  const { identifyTroublesomeSkus } = require('../../scripts/lib/conflict/least_delta_combinator.js');
  const description = 'HPE 3.84TB NVMe Gen4 Read Intensive SFF U.3 SSD';
  const originalRows = ['OS', 'CS', 'DS', '90'].map((badge, index) => ({
    'Product #': `P6100${index}-B21 [${badge}]`,
    Description: description,
    'Lifecycle Status': 'Active'
  }));
  const active = { 'Product #': 'P61008-B21', Description: description, 'Lifecycle Status': 'Active' };
  const hidden = { ...active, 'Product #': 'P61004-B21', visibilityState: 'HIDDEN' };
  const lowerCapacity = { ...active, 'Product #': 'P61005-B21', Description: description.replace('3.84TB', '1.92TB') };
  const catalog = { entries: [{ parentCategory: 'Storage', subCategory: 'NVMe', skus: [...originalRows, active, hidden, lowerCapacity] }] };
  const items = originalRows.map(row => ({ sku: cleanBaseSKU(row['Product #']), description, quantity: 2 }));
  const recommendations = generateLifecycleRecommendations(items, catalog);

  assert.deepStrictEqual(recommendations.map(row => row.lifecycleStatus), [
    'OBSOLETE', 'CONSTRAINED_SUPPLY', 'DIRECT_SHIP', '90_DAY_WARNING'
  ]);
  for (const recommendation of recommendations) {
    assert.strictEqual(recommendation.replacement.sku, active['Product #']);
    assert.strictEqual(recommendation.replacement.leadTimeDays, null);
    assert.strictEqual(recommendation.replacement.price, null);
    assert.match(recommendation.commercialRemarks.original, new RegExp(recommendation.sku));
  }
  assert.equal(identifyTroublesomeSkus(items, { evalSummary: { lifecycleRecommendations: recommendations } }, catalog)
    .filter(action => action.type === 'LIFECYCLE_SKU_SUBSTITUTION').length, 4);

  const restrictedOnly = { entries: [{ ...catalog.entries[0], skus: [...originalRows, hidden, lowerCapacity] }] };
  assert.ok(generateLifecycleRecommendations(items, restrictedOnly).every(row => row.replacement === null));
  assert.equal(parseSkuLines(['SKU,Quantity,Description', 'OS P61005-B21,2,Test SSD']).items[0].lifecycleStatus, 'OBSOLETE');
  assert.equal(parseSkuLines(['SKU,Quantity,Description,Lifecycle Status', 'P61005-B21,2,Test SSD,OS']).items[0].lifecycleStatus, 'OBSOLETE');
  assert.equal(classifyLifecycleState('Active', '', 'P61005-B21', 'OS licensing option').isNonActive, false);
});

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

  await t.test('should warn when an active catalog SKU is close to its scraped discontinuation date', () => {
    const catalog = {
      entries: [{
        parentCategory: 'Memory',
        subCategory: 'DIMMs',
        skus: [{
          'Product #': 'P43328-B21',
          Description: 'HPE 64GB DIMM',
          'Lifecycle Status': 'Active',
          'Discontinued Date': '03/01/2027'
        }]
      }]
    };
    const items = [{ sku: 'P43328-B21', description: 'HPE 64GB DIMM' }];
    const options = { now: new Date('2026-09-09T00:00:00Z'), warningDays: 180 };

    const result = evalSupportServices(items, catalog, options);
    assert.strictEqual(result.hasEolWarning, true);
    assert.strictEqual(result.nearExpirySkus.length, 1);
    assert.strictEqual(result.nearExpirySkus[0].daysRemaining, 173);

    const recommendations = generateLifecycleRecommendations(items, catalog, options);
    assert.strictEqual(recommendations[0].risk, 'Approaching Discontinuation');
    assert.strictEqual(recommendations[0].discontinuedDate, '2027-03-01');
  });

  await t.test('should parse both OCA numeric date layouts and reject invalid dates', () => {
    assert.strictEqual(parseVendorDate('09/30/2026').toISOString().slice(0, 10), '2026-09-30');
    assert.strictEqual(parseVendorDate('2026-09-30').toISOString().slice(0, 10), '2026-09-30');
    assert.strictEqual(parseVendorDate('02/30/2026'), null);
    assert.strictEqual(analyzeRetirementDate('', {}).known, false);
  });
});
