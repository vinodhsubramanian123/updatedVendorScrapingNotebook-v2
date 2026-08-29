const { analyzeAndPartitionClusters } = require('./scripts/lib/boq/multi_cluster_splitter.js');

const rawItems = [
  { sku: 'DL380_Gen11_8SFF_NC_CTO', description: 'Base Chassis', quantity: 22, category: 'Base Chassis' },
  { sku: 'CPU-0', description: 'Processor 0 270W', quantity: 16, category: 'Processor' },
  { sku: 'CPU-1', description: 'Processor 1 270W', quantity: 15, category: 'Processor' },
  { sku: 'CPU-2', description: 'Processor 2 270W', quantity: 13, category: 'Processor' }
];

const result = analyzeAndPartitionClusters(rawItems);
console.log(result.clusters.map(c => c.multiplier));
