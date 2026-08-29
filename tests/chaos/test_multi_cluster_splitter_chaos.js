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
    // Largest Remainder Method:
    // P67088-B21 base: floor(41/2) = 20, remainder: 0.5
    // P67095-B21 base: floor(79/2) = 39, remainder: 0.5
    // Deficit: 60 - (20 + 39) = 1
    // Tie-breaker: 79 > 41, so P67095 gets the deficit.
    // Result: 20 and 40.
    const platCluster = result.clusters.find(c => c.cpuSku === 'P67088-B21');
    const goldCluster = result.clusters.find(c => c.cpuSku === 'P67095-B21');
    assert.strictEqual(platCluster.multiplier, 20);
    assert.strictEqual(goldCluster.multiplier, 40);
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

  await t.test('fuzz tests exact chassis distribution over 10,000 iterations (Diophantine)', () => {
    for (let i = 0; i < 10000; i++) {
      const totalChassis = Math.floor(Math.random() * 491) + 10;
      const numCpuTypes = Math.floor(Math.random() * 4) + 2;

      let totalCpus = 2 * totalChassis;
      const rawItems = [
        { sku: 'DL380_Gen11_8SFF_NC_CTO', description: 'Base Chassis', quantity: totalChassis, category: 'Base Chassis' }
      ];

      let remainingCpus = totalCpus;
      for (let c = 0; c < numCpuTypes; c++) {
        let noise = Math.floor(Math.random() * 5) - 2;
        let qty = Math.floor(totalCpus / numCpuTypes) + noise;
        if (c === numCpuTypes - 1) {
          qty = Math.max(1, remainingCpus);
        }
        remainingCpus -= qty;

        rawItems.push({
          sku: `CPU-${c}`,
          description: `Processor ${c} 270W`,
          quantity: qty,
          category: 'Processor'
        });
      }

      const result = analyzeAndPartitionClusters(rawItems);
      const sumMultipliers = result.clusters.reduce((sum, cluster) => sum + cluster.multiplier, 0);

      if (sumMultipliers !== totalChassis) {
         throw new Error(`Failed! totalChassis: ${totalChassis}, sum: ${sumMultipliers}, cpus: ${JSON.stringify(rawItems.filter(i => i.category === 'Processor').map(i => i.quantity))}`);
      }
      assert.strictEqual(sumMultipliers, totalChassis);
    }
  });
});
