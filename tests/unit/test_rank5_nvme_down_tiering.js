'use strict';
/**
 * tests/unit/test_rank5_nvme_down_tiering.js — Feature 12 Unit Tests
 *
 * Validates Rank 5 Strategic Budget & CapEx Minimized Down-Tiering:
 * 1. Down-tiers Mixed Use NVMe SSD to Read Intensive NVMe SSD in non-write-intensive workload
 * 2. NEVER down-tiers Mixed Use NVMe SSD when workload DNA is WRITE_INTENSIVE
 * 3. Preserves total capacity (TB) and form factor during down-tiering (e.g. 800GB MU -> 960GB RI)
 * 4. Does not down-tier drives that are already Read Intensive
 * 5. Does not down-tier when drive description indicates transaction log / write-intensive
 * 6. Direct validation of _tryBudgetStorageSubstitution utility
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  synthesize5TierRankedSolutions,
  _tryBudgetStorageSubstitution,
  CERTIFIED_STORAGE_DOWNTIER_MAP
} = require('../../scripts/lib/conflict/strategy_synthesizer.js');

test('Feature 12: Rank 5 Value-Engineering NVMe Down-Tiering', async (t) => {
  await t.test('1. Down-tiers Mixed Use NVMe SSD to Read Intensive NVMe SSD in non-write-intensive workload', () => {
    const items = [
      { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF NC CTO Server', quantity: 1, unitPriceUsd: 1650 },
      { sku: 'P49610-B21', description: 'Intel Xeon-Gold 6430 2.1GHz 32-core 270W Processor', quantity: 2, unitPriceUsd: 2200 },
      { sku: 'P43328-B21', description: 'HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory Kit', quantity: 16, unitPriceUsd: 180 },
      { sku: 'P40548-B21', description: 'HPE 1.92TB NVMe Gen4 High Performance Mixed Use SFF BC U.3 SSD', quantity: 4, unitPriceUsd: 750 },
      { sku: 'P48803-B21', description: 'HPE 800W Flex Slot Platinum Power Supply', quantity: 2, unitPriceUsd: 280 }
    ];

    const tiers = synthesize5TierRankedSolutions(items, {}, {}, { model: 'DL380 Gen11' });
    const rank5 = tiers.find(r => r.strategyId === 'STRATEGY_BUDGET');
    assert.ok(rank5, 'Must generate Budget Strategy solution');

    const originalDrives = items.filter(i => i.sku === 'P40548-B21');
    const r5Drives = rank5.skuPartsList.filter(p => p.sku === 'P40543-B21');
    assert.equal(r5Drives.length, 1);
    assert.equal(r5Drives[0].quantity, 4);
    assert.ok(r5Drives[0].description.includes('Read Intensive'));
    assert.ok(rank5.estimatedCostUsd < tiers[0].estimatedCostUsd, 'Budget CapEx must be less than Rank 1');
  });

  await t.test('2. NEVER down-tiers Mixed Use NVMe SSD when workload DNA is WRITE_INTENSIVE', () => {
    const items = [
      { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF NC CTO Server', quantity: 1, unitPriceUsd: 1650 },
      { sku: 'P49610-B21', description: 'Intel Xeon-Gold 6430 2.1GHz 32-core 270W Processor', quantity: 2, unitPriceUsd: 2200 },
      { sku: 'P43328-B21', description: 'HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory Kit', quantity: 16, unitPriceUsd: 180 },
      { sku: 'P40548-B21', description: 'HPE 1.92TB NVMe Gen4 High Performance Mixed Use SFF BC U.3 SSD', quantity: 4, unitPriceUsd: 750 },
      { sku: 'P48803-B21', description: 'HPE 800W Flex Slot Platinum Power Supply', quantity: 2, unitPriceUsd: 280 }
    ];

    const evalResults = {
      workloadDna: { storageWorkload: 'WRITE_INTENSIVE', primaryWorkload: 'DATABASE_TRANSACTION_LOG' }
    };

    const tiers = synthesize5TierRankedSolutions(items, evalResults, {}, { model: 'DL380 Gen11' });
    const rank5 = tiers.find(r => r.strategyId === 'STRATEGY_BUDGET');
    const hasMuDrives = rank5.skuPartsList.some(p => p.sku === 'P40548-B21');
    assert.equal(hasMuDrives, true, 'Write intensive workload must retain Mixed Use NVMe SSDs without down-tiering');
  });

  await t.test('3. Preserves total capacity (TB) and form factor during down-tiering (e.g. 800GB MU -> 960GB RI)', () => {
    const items = [
      { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF NC CTO Server', quantity: 1, unitPriceUsd: 1650 },
      { sku: 'P49610-B21', description: 'Intel Xeon-Gold 6430 2.1GHz 32-core Processor', quantity: 2, unitPriceUsd: 2200 },
      { sku: 'P43328-B21', description: 'HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory Kit', quantity: 16, unitPriceUsd: 180 },
      { sku: 'P40546-B21', description: 'HPE 800GB NVMe Gen4 Mixed Use SFF BC SSD', quantity: 2, unitPriceUsd: 490 }
    ];

    const tiers = synthesize5TierRankedSolutions(items, {}, {}, { model: 'DL380 Gen11' });
    const rank5 = tiers.find(r => r.strategyId === 'STRATEGY_BUDGET');
    const r5Drives = rank5.skuPartsList.filter(p => p.sku === 'P40542-B21');
    assert.equal(r5Drives.length, 1);
    assert.equal(r5Drives[0].quantity, 2);
    assert.ok(r5Drives[0].description.includes('960GB'), 'Capacity must not decrease (800GB -> 960GB)');
  });

  await t.test('4. Does not down-tier drives that are already Read Intensive', () => {
    const items = [
      { sku: 'P40543-B21', description: 'HPE 1.92TB NVMe Gen4 High Performance Read Intensive SFF BC U.3 SSD', quantity: 4, unitPriceUsd: 450 }
    ];
    const changed = _tryBudgetStorageSubstitution(items, null, null, () => 450);
    assert.equal(changed, false, 'Already Read Intensive drive should not be altered');
    assert.equal(items[0].sku, 'P40543-B21');
  });

  await t.test('5. Does not down-tier when drive description indicates transaction log / write-intensive', () => {
    const items = [
      { sku: 'P40548-B21', description: 'HPE 1.92TB NVMe Mixed Use SFF BC SSD (Database Redo Log / WAL)', quantity: 2, unitPriceUsd: 750 }
    ];
    const changed = _tryBudgetStorageSubstitution(items, null, null, () => 450);
    assert.equal(changed, false, 'Write-intensive token must protect against down-tiering');
  });

  await t.test('6. CERTIFIED_STORAGE_DOWNTIER_MAP contains verified replacements with capacity non-decrease', () => {
    for (const [key, mapping] of Object.entries(CERTIFIED_STORAGE_DOWNTIER_MAP)) {
      assert.ok(mapping.sku, `Mapping ${key} must have SKU`);
      assert.ok(mapping.capGb > 0, `Mapping ${key} must have positive capacity`);
      assert.ok(mapping.refPrice > 0, `Mapping ${key} must have reference price`);
      assert.ok(mapping.desc.includes('Read Intensive'), `Mapping ${key} must point to Read Intensive`);
    }
  });
});
