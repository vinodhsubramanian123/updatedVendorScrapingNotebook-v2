'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { synthesize5TierRankedSolutions, _clearStrategyAddonsCache } = require('../../scripts/lib/conflict/strategy_synthesizer.js');
const { extractWorkloadDna } = require('../../scripts/lib/conflict/workload_dna.js');

test('Chaos & Adversarial Fuzzing: Strategy Synthesizer & Workload DNA', async (t) => {

  await t.test('extractWorkloadDna - Extreme and Adversarial BOQs', () => {
    // 0-SKU empty list
    let dna = extractWorkloadDna([]);
    assert.strictEqual(dna.primaryWorkload, 'BALANCED_ENTERPRISE');

    // undefined/null fields, negative quantities, malformed strings
    dna = extractWorkloadDna([
      { sku: null, description: undefined, quantity: -5 },
      { sku: 'TEST', description: 'NVIDIA GPU RTX 4090', quantity: NaN },
      { sku: 'TEST2', description: 'Xeon 32-core 2.4GHz', quantity: 2 },
      { sku: 'TEST3', description: '64GB RDIMM', quantity: 4 },
      { sku: 'TEST4', description: 'Mixed Use NVMe SSD', quantity: null },
    ]);
    
    // Processor has 32 cores * 2 = 64 cores
    assert.ok(dna.totalCores === 64, `Total cores should be 64, got ${dna.totalCores}`);
    assert.strictEqual(dna.primaryWorkload, 'VDI_AI_GRAPHICS', 'Should detect GPU workload');
  });

  await t.test('extractWorkloadDna - Fallbacks and Workloads', () => {
    // Dense compute
    let dna = extractWorkloadDna([
      { description: 'EPYC 64-core', quantity: 1 }
    ]);
    assert.strictEqual(dna.primaryWorkload, 'VIRTUALIZATION_DENSE');

    // High-IOPS storage
    dna = extractWorkloadDna([
      { description: 'Write Intensive NVMe SSD', quantity: 5 }
    ]);
    assert.strictEqual(dna.primaryWorkload, 'STORAGE_HIGH_IOPS');

    // Database in-memory
    dna = extractWorkloadDna([
      { description: 'Xeon 8-core', quantity: 1 },
      { description: '256GB RDIMM', quantity: 4 }
    ]);
    assert.strictEqual(dna.primaryWorkload, 'DATABASE_IN_MEMORY');
  });

  await t.test('synthesize5TierRankedSolutions - 0-SKU empty list', () => {
    const res = synthesize5TierRankedSolutions([], {}, {}, { model: 'Fake' });
    assert.strictEqual(res.length, 5);
    res.forEach((rank, i) => {
      assert.strictEqual(rank.rank, i + 1);
      assert.ok(rank.ragSecondOpinion.length > 0);
    });
  });

  await t.test('synthesize5TierRankedSolutions - 500+ SKU massive list', () => {
    const massiveList = Array.from({ length: 600 }, (_, i) => ({
      sku: `SKU-${i}`,
      description: i % 2 === 0 ? 'Xeon 8-core' : '16GB RDIMM',
      quantity: 1,
      unitPriceUsd: 100
    }));

    const res = synthesize5TierRankedSolutions(massiveList, {}, {}, { model: 'Fake' });
    assert.strictEqual(res.length, 5);
    assert.strictEqual(res[0].rank, 1);
    assert.strictEqual(res[4].rank, 5);
    
    const rankIds = new Set(res.map(r => r.rank));
    assert.strictEqual(rankIds.size, 5, 'No duplicate ranks');
  });

  await t.test('synthesize5TierRankedSolutions - Malformed currency strings & null fields', () => {
    const malformedList = [
      { sku: 'BAD1', description: 'Processor', quantity: -10, unitPriceUsd: '$--' },
      { sku: 'BAD2', description: 'Memory', quantity: NaN, unitPriceUsd: 'N/A' },
      { sku: 'BAD3', description: 'SSD', quantity: null, unitPriceUsd: -500 },
      { sku: null, description: undefined, quantity: undefined, unitPriceUsd: undefined }
    ];

    const res = synthesize5TierRankedSolutions(malformedList, {}, {}, { model: 'Fake' });
    assert.strictEqual(res.length, 5);
    res.forEach((rank, i) => {
      assert.strictEqual(rank.rank, i + 1);
      assert.ok(rank.ragSecondOpinion.length > 0);
    });
  });

  await t.test('synthesize5TierRankedSolutions - Missing/Corrupted strategy_addons.json', (t2) => {
    const originalReadFileSync = fs.readFileSync;
    const originalExistsSync = fs.existsSync;
    
    t2.mock.method(fs, 'existsSync', (p) => {
      if (typeof p === 'string' && p.includes('strategy_addons.json')) return true;
      return originalExistsSync(p);
    });

    t2.mock.method(fs, 'readFileSync', (p, enc) => {
      if (typeof p === 'string' && p.includes('strategy_addons.json')) {
        throw new Error('Simulated corruption');
      }
      return originalReadFileSync(p, enc);
    });

    _clearStrategyAddonsCache();

    // Workload: GPU / AI
    let res = synthesize5TierRankedSolutions([{ sku: 'GPU1', description: 'NVIDIA H100', quantity: 2 }], {}, {}, { model: 'Fake' });
    assert.strictEqual(res.length, 5, 'Should synthesize 5 ranks even with corrupted addons file');
    
    let rank3Addons = res[2].skuPartsList.filter(p => p.isStrategyAddon);
    assert.ok(rank3Addons.some(a => a.sku.includes('HPE-PCIE-RISER-DNA')), 'Should have PCIe riser DNA fallback for GPU workload');
    
    let rankIds = new Set(res.map(r => r.rank));
    assert.strictEqual(rankIds.size, 5);

    // Workload: High-IOPS
    res = synthesize5TierRankedSolutions([{ sku: 'SSD1', description: 'Mixed Use NVMe SSD', quantity: 10 }], {}, {}, { model: 'Fake' });
    rank3Addons = res[2].skuPartsList.filter(p => p.isStrategyAddon);
    assert.ok(rank3Addons.some(a => a.sku.includes('HPE-CACHE-BATTERY-DNA')), 'Should have cache battery DNA fallback for Storage workload');
    rankIds = new Set(res.map(r => r.rank));
    assert.strictEqual(rankIds.size, 5);

    // Workload: Dense Compute / Dual-Socket
    res = synthesize5TierRankedSolutions([
      { sku: 'CPU1', description: 'Xeon 16-core', quantity: 1 },
      { sku: 'CPU2', description: 'Xeon 16-core', quantity: 1 }
    ], {}, {}, { model: 'Fake' });
    let rank4Addons = res[3].skuPartsList.filter(p => p.isStrategyAddon);
    assert.ok(rank4Addons.some(a => a.sku.includes('HPE-PCIE-SEC-RISER-DNA')), 'Should have sec riser DNA fallback for dual socket');
    assert.ok(rank4Addons.some(a => a.sku.includes('HPE-HIGH-PERF-FAN-DNA')), 'Should have fan DNA fallback');
    
    rankIds = new Set(res.map(r => r.rank));
    assert.strictEqual(rankIds.size, 5);
  });

  await t.test('synthesize5TierRankedSolutions - Duplicate ranks prevention', () => {
    const res = synthesize5TierRankedSolutions([{ sku: 'A', quantity: 1, description: 'Test' }], {}, {}, { model: 'dl380' });
    assert.strictEqual(res.length, 5);
    const ranks = res.map(r => r.rank);
    assert.deepStrictEqual(ranks, [1, 2, 3, 4, 5]);

    const names = new Set(res.map(r => r.name));
    assert.strictEqual(names.size, 5);
  });
});
