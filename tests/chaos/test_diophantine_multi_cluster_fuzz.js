'use strict';
/**
 * tests/chaos/test_diophantine_multi_cluster_fuzz.js
 *
 * Chaos and randomized fuzz testing for Diophantine multi-cluster allocation (INV-39).
 * Verifies that the Largest Remainder Method distributes exactly totalChassis
 * servers across arbitrary random CPU counts over 10,000 iterations.
 */

const test = require('node:test');
const assert = require('node:assert');
const { analyzeAndPartitionClusters } = require('../../scripts/lib/boq/multi_cluster_splitter.js');

test('Diophantine Multi-Cluster Fuzzing Suite (INV-39)', async (t) => {
  await t.test('fuzz tests exact chassis distribution over 10,000 randomized iterations', () => {
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
