'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { analyzeAndPartitionClusters } = require('../../scripts/lib/boq/multi_cluster_splitter.js');

test('Multi-Cluster BOQ Splitter Chaos & Boundary Stress Suite', async (t) => {
  await t.test('handles empty input', () => {
    const rawItems = [];
    const result = analyzeAndPartitionClusters(rawItems);
    assert.strictEqual(result.isMultiCluster, false);
    assert.strictEqual(result.totalChassis, 1); // Default fallback when no chassis is found
    assert.strictEqual(result.clusters.length, 1);
    assert.strictEqual(result.clusters[0].multiplier, 1);
  });

  await t.test('handles single item input', () => {
    const rawItems = [{
      sku: 'P49611-B21',
      description: 'Intel Xeon-G 6430 2.1GHz 32-core 270W Processor',
      quantity: 2,
      category: 'Processor'
    }];
    const result = analyzeAndPartitionClusters(rawItems);
    assert.strictEqual(result.isMultiCluster, false);
    assert.strictEqual(result.clusters.length, 1);
  });
  
  await t.test('handles extreme totalChassis boundary (large multiplier)', () => {
    const rawItems = [
      { sku: 'DL380_Gen11_8SFF_NC_CTO', description: 'Base Chassis', quantity: 1000000, category: 'Base Chassis' },
      { sku: 'P67088-B21', description: 'Processor Platinum 350W', quantity: 1000000, category: 'Processor' },
      { sku: 'P67095-B21', description: 'Processor Gold 270W', quantity: 1000000, category: 'Processor' }
    ];
    
    const result = analyzeAndPartitionClusters(rawItems);
    assert.strictEqual(result.isMultiCluster, true);
    assert.strictEqual(result.totalChassis, 1000000);
    assert.strictEqual(result.clusters.length, 2);
    assert.strictEqual(result.clusters[0].multiplier, 500000);
    assert.strictEqual(result.clusters[1].multiplier, 500000);
  });
  
  await t.test('handles fractional quantities / odd quantities for CPU gracefully', () => {
    const rawItems = [
      { sku: 'DL380_Gen11_8SFF_NC_CTO', description: 'Base Chassis', quantity: 60, category: 'Base Chassis' },
      { sku: 'P67088-B21', description: 'Processor Platinum 350W', quantity: 41, category: 'Processor' },
      { sku: 'P67095-B21', description: 'Processor Gold 270W', quantity: 79, category: 'Processor' }
    ];
    const result = analyzeAndPartitionClusters(rawItems);
    assert.strictEqual(result.isMultiCluster, true);
    assert.strictEqual(result.clusters[0].multiplier, 21); // Math.round(41/2) = 21
    assert.strictEqual(result.clusters[1].multiplier, 40); // Math.round(79/2) = 40
  });

  await t.test('stress tests with thousands of items', () => {
    const rawItems = [
      { sku: 'DL380_Gen11_8SFF_NC_CTO', description: 'Base Chassis', quantity: 60, category: 'Base Chassis' },
      { sku: 'P67088-B21', description: 'Processor Platinum 350W', quantity: 40, category: 'Processor' },
      { sku: 'P67095-B21', description: 'Processor Gold 270W', quantity: 80, category: 'Processor' }
    ];
    
    // Add 10,000 accessory items
    for (let i = 0; i < 10000; i++) {
        rawItems.push({
            sku: `ACC-${i}`,
            description: `Generic Accessory ${i}`,
            quantity: 60,
            category: 'Options'
        });
    }

    const start = performance.now();
    const result = analyzeAndPartitionClusters(rawItems);
    const end = performance.now();
    
    assert.strictEqual(result.isMultiCluster, true);
    assert.ok(result.clusters[0].items.length > 10000);
    assert.ok(end - start < 1000, 'Should process 10,000 items in less than 1 second');
  });

  await t.test('handles missing TDP information fallback gracefully', () => {
      const rawItems = [
          { sku: 'DL380_Gen11_8SFF_NC_CTO', description: 'Base Chassis', quantity: 60, category: 'Base Chassis' },
          { sku: 'CPU-1', description: 'Processor Unspecified', quantity: 40, category: 'Processor' },
          { sku: 'CPU-2', description: 'Another Processor', quantity: 80, category: 'Processor' }
      ];
      const result = analyzeAndPartitionClusters(rawItems);
      assert.strictEqual(result.isMultiCluster, true);
      assert.strictEqual(result.clusters.length, 2);
      
      const cluster1 = result.clusters.find(c => c.multiplier === 20);
      const cluster2 = result.clusters.find(c => c.multiplier === 40);
      assert.strictEqual(cluster1.cpuTdp, 205); // Neutral fallback when TDP not in description
      assert.strictEqual(cluster2.cpuTdp, 205); // Neutral fallback when TDP not in description
  });

  await t.test('distributes memory proportionally when mismatched', () => {
    const rawItems = [
        { sku: 'DL380_Gen11_8SFF_NC_CTO', description: 'Base Chassis', quantity: 60, category: 'Base Chassis' },
        { sku: 'P67088-B21', description: 'Processor Platinum 350W', quantity: 40, category: 'Processor' },
        { sku: 'P67095-B21', description: 'Processor Gold 270W', quantity: 80, category: 'Processor' },
        { sku: 'RAM-1', description: '32GB DIMM Memory', quantity: 450, category: 'Memory' }, // Odd number
    ];
    const result = analyzeAndPartitionClusters(rawItems);
    assert.strictEqual(result.isMultiCluster, true);
    const c1 = result.clusters.find(c => c.multiplier === 20);
    const c2 = result.clusters.find(c => c.multiplier === 40);
    
    const ram1 = c1.items.find(i => i.category === 'Memory');
    const ram2 = c2.items.find(i => i.category === 'Memory');
    
    assert.strictEqual(ram1.quantity, Math.round(450 / 60)); // 8
    assert.strictEqual(ram1.totalQuantity, 20 * 8); // 160

    assert.strictEqual(ram2.quantity, Math.round(450 / 60)); // 8
    assert.strictEqual(ram2.totalQuantity, 40 * 8); // 320
  });

  await t.test('missing processor category gracefully degrades', () => {
    const rawItems = [
        { sku: 'DL380_Gen11_8SFF_NC_CTO', description: 'Base Chassis', quantity: 60, category: 'Base Chassis' },
        { sku: 'P49611-B21', description: 'Intel Xeon-G 6430 2.1GHz 32-core 270W Processor', quantity: 40, category: 'Unknown' }, // But description has 'processor'
        { sku: 'P49611-B22', description: 'Intel Xeon-G 6430 2.1GHz 32-core 270W Processor', quantity: 80, category: 'Unknown' } 
    ];
    const result = analyzeAndPartitionClusters(rawItems);
    assert.strictEqual(result.isMultiCluster, true);
    assert.strictEqual(result.clusters.length, 2);
  });
});
