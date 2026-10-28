'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompetitorSpecification, audit12PointPhysicalParity } = require('../../scripts/lib/boq/cross_vendor_transformer.js');
const { extractWorkloadDna, validateNumaMemoryTopology } = require('../../scripts/lib/conflict/workload_dna.js');

test('Feature 10: Multi-Socket NUMA Channel Interleaving Topology', async (t) => {
  await t.test('1. Detects balanced 1DPC memory configuration (8 channels / 16 DIMMs on 2P)', () => {
    const spec = parseCompetitorSpecification('2x Intel Xeon Platinum 8480+ 56C; 16x 32GB DDR5-5600 RDIMM', 'DELL');
    assert.equal(spec.memory.totalMemoryGb, 512);
    assert.equal(spec.memory.channelWidth, 8);
    assert.equal(spec.memory.isSocketSymmetric, true);
    assert.equal(spec.memory.isBalanced1Dpc, true);

    const bom = [
      { sku: 'P49610-B21', quantity: 2, description: 'Intel Xeon-Gold 6430 32-core Processor' },
      { sku: 'P43328-B21', quantity: 16, description: 'HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory Kit' }
    ];
    const audit = audit12PointPhysicalParity(spec, bom, 'DL380_Gen11');
    const memAudit = audit.auditItems.find(a => a.subsystem === 'MEMORY_TOPOLOGY');
    assert.equal(memAudit.status, 'MATCHED');
    assert.ok(memAudit.details.includes('1DPC Optimal'));
  });

  await t.test('2. Flags DEFICIT when DIMMs are asymmetric across sockets (e.g. 7 DIMMs on 2P)', () => {
    const spec = parseCompetitorSpecification('2x Intel Xeon; 8x 32GB RDIMM', 'CISCO');
    const bom = [
      { sku: 'P49610-B21', quantity: 2, description: 'Intel Xeon-Gold 6430 32-core Processor' },
      { sku: 'P43328-B21', quantity: 7, description: 'HPE 64GB DDR5 Smart Memory' } // 448GB >= 256GB, but 7 DIMMs on 2 sockets!
    ];
    const audit = audit12PointPhysicalParity(spec, bom, 'DL380_Gen11');
    const memAudit = audit.auditItems.find(a => a.subsystem === 'MEMORY_TOPOLOGY');
    assert.equal(memAudit.status, 'DEFICIT');
    assert.ok(memAudit.details.includes('Unbalanced socket memory symmetry'));
  });

  await t.test('3. Flags DEFICIT when DIMM population violates channel interleaving (e.g. 10 DIMMs on 2P Intel 8-ch)', () => {
    const spec = parseCompetitorSpecification('2x Intel Xeon; 16x 32GB RDIMM', 'LENOVO');
    const bom = [
      { sku: 'P49610-B21', quantity: 2, description: 'Intel Xeon-Gold 6430 32-core Processor' },
      { sku: 'P43328-B21', quantity: 10, description: 'HPE 64GB DDR5 Smart Memory' } // 640GB >= 512GB, 5 DIMMs/socket violates 8-channel interleaving!
    ];
    const audit = audit12PointPhysicalParity(spec, bom, 'DL380_Gen11');
    const memAudit = audit.auditItems.find(a => a.subsystem === 'MEMORY_TOPOLOGY');
    assert.equal(memAudit.status, 'DEFICIT');
    assert.ok(memAudit.details.includes('Unbalanced memory channel interleaving'));
  });

  await t.test('4. Correctly validates 12-channel AMD EPYC Genoa/Bergamo architecture', () => {
    const spec = parseCompetitorSpecification('2x AMD EPYC 9654 96-core Genoa; 24x 64GB DDR5 RDIMM', 'DELL');
    assert.equal(spec.memory.channelWidth, 12);
    assert.equal(spec.memory.isBalanced1Dpc, true);

    const bom = [
      { sku: 'P53696-B21', quantity: 2, description: 'AMD EPYC 9654 2.4GHz 96-core Processor' },
      { sku: 'P43328-B21', quantity: 24, description: 'HPE 64GB DDR5 Smart Memory' }
    ];
    const audit = audit12PointPhysicalParity(spec, bom, 'DL385_Gen11');
    const memAudit = audit.auditItems.find(a => a.subsystem === 'MEMORY_TOPOLOGY');
    assert.equal(memAudit.status, 'MATCHED');
    assert.ok(memAudit.details.includes('12-channel'));
  });

  await t.test('5. validateNumaMemoryTopology utility correctly returns structured interleaving status', () => {
    const topo = validateNumaMemoryTopology([], { cpuSockets: 2, dimmCount: 16, channelWidth: 8 });
    assert.equal(topo.isValid, true);
    assert.equal(topo.is1DpcBalanced, true);
    assert.equal(topo.interleavingMode, '1DPC_BALANCED_OPTIMAL');

    const badTopo = validateNumaMemoryTopology([], { cpuSockets: 2, dimmCount: 6, channelWidth: 8 });
    assert.equal(badTopo.isValid, false);
    assert.equal(badTopo.interleavingMode, 'UNBALANCED');
  });

  await t.test('6. extractWorkloadDna tracks cpuCount and returns numaTopology', () => {
    const items = [
      { sku: 'P49610-B21', quantity: 2, description: 'Intel Xeon-Gold 6430 32-core Processor' },
      { sku: 'P43328-B21', quantity: 16, description: 'HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory Kit' },
      { sku: 'P40499-B21', quantity: 4, description: 'HPE 3.84TB NVMe Gen4 Read Intensive SFF SSD' }
    ];
    const dna = extractWorkloadDna(items);
    assert.equal(dna.cpuCount, 2);
    assert.equal(dna.memoryDimmCount, 16);
    assert.ok(dna.numaTopology);
    assert.equal(dna.numaTopology.channelWidth, 8);
    assert.equal(dna.numaTopology.is1DpcBalanced, true);
  });

  await t.test('7. extractWorkloadDna safely handles null, undefined, and non-object array elements', () => {
    const sparseItems = [
      null,
      undefined,
      123,
      'invalid-item',
      false,
      { sku: 'P40548-B21' },
      { sku: 'P49610-B21', quantity: 2, description: 'Intel Xeon-Gold 6430 32-core Processor' },
      null,
      { sku: 'P43328-B21', quantity: 16, description: 'HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory Kit' },
      undefined
    ];
    const dna = extractWorkloadDna(sparseItems);
    assert.equal(dna.cpuCount, 2);
    assert.equal(dna.totalCores, 64);
    assert.equal(dna.memoryDimmCount, 16);
    assert.equal(dna.totalMemoryGb, 512);
    assert.equal(dna.numaTopology.is1DpcBalanced, true);

    const topo = validateNumaMemoryTopology(sparseItems);
    assert.equal(topo.isValid, true);
    assert.equal(topo.is1DpcBalanced, true);
  });
});

