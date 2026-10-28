'use strict';
/**
 * tests/chaos/test_m3_it3_challenger_adversarial_harness.js
 *
 * EMPIRICAL ADVERSARIAL CHALLENGER HARNESS (Milestone 3 / Iteration 3)
 * Rigorous Fuzzing & Stress Testing:
 * 1. Sparse & Corrupted Arrays in extractWorkloadDna ([null, undefined, 123, 'bad', NaN, {}])
 * 2. _evaluateNetworkingFabricParity across quotes without networking vs empty BOMs,
 *    single-adapter BOMs, and high-speed fabrics
 * 3. NUMA Memory Topology Null Safety and Channel Interleaving
 * 4. End-to-end Competitor Quote Transformation Parity Integrity
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  extractWorkloadDna,
  validateNumaMemoryTopology
} = require('../../scripts/lib/conflict/workload_dna.js');

const {
  detectFabricProtocol,
  parseCompetitorSpecification,
  audit12PointPhysicalParity,
  transformCompetitorQuote,
  _evaluateNetworkingFabricParity
} = require('../../scripts/lib/boq/cross_vendor_transformer.js');

describe('Empirical Adversarial Challenger M3_It3_1: Fabric & NUMA Chaos Harness', () => {

  // =========================================================================
  // VECTOR 1: Sparse & Corrupted Array Fuzzing on extractWorkloadDna
  // =========================================================================
  describe('Vector 1: Sparse & Corrupted Array Fuzzing on extractWorkloadDna', () => {

    it('1.1 Safely handles exact dispatch vector [null, undefined, 123, "bad", NaN, {}]', () => {
      const corruptedInput = [null, undefined, 123, 'bad', NaN, {}];
      assert.doesNotThrow(() => {
        const dna = extractWorkloadDna(corruptedInput);
        assert.equal(typeof dna, 'object');
        assert.equal(dna.primaryWorkload, 'BALANCED_ENTERPRISE');
        assert.equal(dna.totalCores, 0);
        assert.equal(dna.cpuCount, 0);
        assert.equal(dna.totalMemoryGb, 0);
        assert.equal(dna.memoryDimmCount, 0);
        assert.equal(dna.hasGpu, false);
        assert.ok(typeof dna.numaTopology === 'object');
        assert.equal(dna.numaTopology.cpuSockets, 0);
        assert.equal(dna.numaTopology.memoryDimmCount, 0);
      });
    });

    it('1.2 Safely handles array with sparse unallocated holes (Array(20))', () => {
      // Creates sparse array with empty slots
      // eslint-disable-next-line no-sparse-arrays
      const sparseArray = new Array(20);
      sparseArray[5] = { description: 'Intel Xeon Platinum 8480+ 56-core Processor', quantity: 2 };
      sparseArray[12] = { description: 'HPE 64GB 2Rx4 DDR5-4800 DIMM', quantity: 16 };

      assert.doesNotThrow(() => {
        const dna = extractWorkloadDna(sparseArray);
        assert.equal(dna.cpuCount, 2);
        assert.equal(dna.totalCores, 112);
        assert.equal(dna.memoryDimmCount, 16);
        assert.equal(dna.totalMemoryGb, 1024);
        assert.equal(dna.numaTopology.is1DpcBalanced, true);
        assert.equal(dna.numaTopology.interleavingMode, '1DPC_BALANCED_OPTIMAL');
      });
    });

    it('1.3 Safely handles exotic non-object JavaScript types in array', () => {
      const exoticArray = [
        Symbol('corrupted-token'),
        true,
        false,
        () => 'malicious-function',
        9999999999999999n,
        [],
        new Date(),
        new RegExp(/fail/)
      ];

      assert.doesNotThrow(() => {
        const dna = extractWorkloadDna(exoticArray);
        assert.equal(dna.primaryWorkload, 'BALANCED_ENTERPRISE');
        assert.equal(dna.cpuCount, 0);
        assert.equal(dna.totalCores, 0);
      });
    });

    it('1.4 Ingests valid hardware items interspersed with corrupted elements', () => {
      const mixedBOM = [
        null,
        12345,
        { sku: 'P49610-B21', description: 'Intel Xeon-Gold 6430 32-core Processor', quantity: 2 },
        undefined,
        'corrupted string',
        { sku: 'P43328-B21', description: 'HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory Kit', quantity: 16 },
        NaN,
        { sku: 'P40656-B21', description: 'NVIDIA L40S 48GB PCIe Accelerator', quantity: 2 },
        {},
        { sku: 'P40498-B21', description: 'HPE 1.92TB NVMe Mixed Use SFF BC SSD', quantity: 8 }
      ];

      const dna = extractWorkloadDna(mixedBOM);
      assert.equal(dna.cpuCount, 2);
      assert.equal(dna.totalCores, 64);
      assert.equal(dna.memoryDimmCount, 16);
      assert.equal(dna.totalMemoryGb, 512);
      assert.equal(dna.hasGpu, true);
      assert.equal(dna.totalGpuCount, 2);
      assert.equal(dna.primaryWorkload, 'VDI_AI_GRAPHICS');
      assert.equal(dna.driveCount, 8);
      assert.equal(dna.storageType, 'NVME_GEN4');
      assert.equal(dna.storageWorkload, 'MIXED_USE');
      assert.equal(dna.numaTopology.is1DpcBalanced, true);
    });

    it('1.5 Safely handles items with null, undefined, or missing descriptions and quantities', () => {
      const items = [
        {},
        { sku: 'TEST-SKU-1' },
        { description: null, quantity: null },
        { description: undefined, quantity: undefined },
        { description: '', quantity: 0 },
        { description: 'Unrecognized accessory kit', quantity: 10 }
      ];

      assert.doesNotThrow(() => {
        const dna = extractWorkloadDna(items);
        assert.equal(dna.cpuCount, 0);
        assert.equal(dna.totalCores, 0);
        assert.equal(dna.memoryDimmCount, 0);
      });
    });

    it('1.6 Completely non-array inputs fall back to safe empty defaults', () => {
      const nonArrays = [null, undefined, 42, 'string', true, false, { notAnArray: true }];
      for (const input of nonArrays) {
        assert.doesNotThrow(() => {
          const dna = extractWorkloadDna(input);
          assert.equal(typeof dna, 'object');
          assert.equal(dna.primaryWorkload, 'BALANCED_ENTERPRISE');
          assert.equal(dna.cpuCount, 0);
        });
      }
    });
  });

  // =========================================================================
  // VECTOR 2: _evaluateNetworkingFabricParity across Quoting & BOM Scenarios
  // =========================================================================
  describe('Vector 2: _evaluateNetworkingFabricParity Quoting & BOM Permutations', () => {

    it('2.1 Unspecified competitor networking vs Empty BOM evaluates to NOT_EVALUATED', () => {
      const spec = { networking: { adapterCount: null, portsCount: null, speedGb: null, fabricProtocol: null } };
      const bom = [];
      const res = _evaluateNetworkingFabricParity(spec, bom);
      assert.equal(res.subsystem, 'OCP_NETWORKING_FABRIC');
      assert.equal(res.status, 'NOT_EVALUATED');
      assert.match(res.details, /No competitor network fabric specification provided/);
    });

    it('2.2 Unspecified competitor networking vs Single-Adapter Ethernet BOM evaluates to NOT_EVALUATED', () => {
      const spec = { networking: { adapterCount: null, portsCount: null, speedGb: null, fabricProtocol: null } };
      const bom = [
        { sku: 'P12345-B21', description: 'Broadcom 57414 10/25GbE 2-port SFP28 Adapter', quantity: 1 }
      ];
      const res = _evaluateNetworkingFabricParity(spec, bom);
      assert.equal(res.subsystem, 'OCP_NETWORKING_FABRIC');
      assert.equal(res.status, 'NOT_EVALUATED');
    });

    it('2.3 Unspecified competitor networking vs High-Speed InfiniBand NDR BOM evaluates to NOT_EVALUATED', () => {
      const spec = { networking: { adapterCount: null, portsCount: null, speedGb: null, fabricProtocol: null } };
      const bom = [
        { sku: 'P45641-B21', description: 'NVIDIA MCX75310AAS-NEAT ConnectX-7 NDR InfiniBand 400Gb/s 1-port OSFP Adapter', quantity: 1 }
      ];
      const res = _evaluateNetworkingFabricParity(spec, bom);
      assert.equal(res.subsystem, 'OCP_NETWORKING_FABRIC');
      assert.equal(res.status, 'NOT_EVALUATED');
    });

    it('2.4 Unspecified competitor networking vs High-Speed RoCEv2 BOM evaluates to NOT_EVALUATED', () => {
      const spec = { networking: { adapterCount: null, portsCount: null, speedGb: null, fabricProtocol: null } };
      const bom = [
        { sku: 'P21112-B21', description: 'Broadcom BCM57508 100GbE 2-port QSFP56 RoCEv2 Adapter', quantity: 1 }
      ];
      const res = _evaluateNetworkingFabricParity(spec, bom);
      assert.equal(res.subsystem, 'OCP_NETWORKING_FABRIC');
      assert.equal(res.status, 'NOT_EVALUATED');
    });

    it('2.5 Specified competitor networking (25GbE 2-port) vs Empty BOM flags DEFICIT', () => {
      const spec = { networking: { adapterCount: 1, portsCount: 2, totalPorts: 2, speedGb: 25, fabricProtocol: 'ETHERNET' } };
      const bom = [];
      const res = _evaluateNetworkingFabricParity(spec, bom);
      assert.equal(res.subsystem, 'OCP_NETWORKING_FABRIC');
      assert.equal(res.status, 'DEFICIT');
      assert.match(res.details, /Target BOM contains 0 network adapters/);
    });

    it('2.6 Specified competitor networking (25GbE 2-port) vs Matching Single-Adapter BOM flags MATCHED', () => {
      const spec = { networking: { adapterCount: 1, portsCount: 2, totalPorts: 2, speedGb: 25, fabricProtocol: 'ETHERNET' } };
      const bom = [
        { sku: 'P12345-B21', description: 'Broadcom 57414 10/25GbE 2-port SFP28 Adapter', quantity: 1 }
      ];
      const res = _evaluateNetworkingFabricParity(spec, bom);
      assert.equal(res.status, 'MATCHED');
      assert.match(res.details, /satisfies competitor ETHERNET requirements/);
    });

    it('2.7 Specified competitor networking (25GbE 2-port) vs Slower 10GbE BOM flags DEFICIT (speed)', () => {
      const spec = { networking: { adapterCount: 1, portsCount: 2, totalPorts: 2, speedGb: 25, fabricProtocol: 'ETHERNET' } };
      const bom = [
        { sku: 'P10000-B21', description: 'Intel I350 10GbE 2-port Base-T Adapter', quantity: 1 }
      ];
      const res = _evaluateNetworkingFabricParity(spec, bom);
      assert.equal(res.status, 'DEFICIT');
      assert.match(res.details, /speed \(10Gb\) is lower than competitor \(25Gb\)/);
    });

    it('2.8 Specified competitor networking (25GbE 4-port) vs 2-port BOM flags DEFICIT (port count)', () => {
      const spec = { networking: { adapterCount: 1, portsCount: 4, totalPorts: 4, speedGb: 25, fabricProtocol: 'ETHERNET' } };
      const bom = [
        { sku: 'P12345-B21', description: 'Broadcom 57414 10/25GbE 2-port SFP28 Adapter', quantity: 1 }
      ];
      const res = _evaluateNetworkingFabricParity(spec, bom);
      assert.equal(res.status, 'DEFICIT');
      assert.match(res.details, /Target network ports \(2\) are fewer than competitor \(4\)/);
    });

    it('2.9 Specified NDR InfiniBand (400Gb/s) vs 400G Ethernet BOM flags DEFICIT (protocol mismatch)', () => {
      const spec = { networking: { adapterCount: 1, portsCount: 1, totalPorts: 1, speedGb: 400, fabricProtocol: 'INFINIBAND_NDR' } };
      const bom = [
        { sku: 'P40000-B21', description: 'Generic Ethernet 400GbE 1-port QSFP112 Adapter', quantity: 1 }
      ];
      const res = _evaluateNetworkingFabricParity(spec, bom);
      assert.equal(res.status, 'DEFICIT');
      assert.match(res.details, /protocol mismatch: competitor specified INFINIBAND_NDR/);
      assert.match(res.details, /target BOM provides ETHERNET/);
    });

    it('2.10 Specified NDR InfiniBand (400Gb/s) vs 400G RoCEv2 BOM flags DEFICIT (protocol mismatch)', () => {
      const spec = { networking: { adapterCount: 1, portsCount: 1, totalPorts: 1, speedGb: 400, fabricProtocol: 'INFINIBAND_NDR' } };
      const bom = [
        { sku: 'P40001-B21', description: 'Broadcom Thor2 400GbE 1-port RoCEv2 Adapter', quantity: 1 }
      ];
      const res = _evaluateNetworkingFabricParity(spec, bom);
      assert.equal(res.status, 'DEFICIT');
      assert.match(res.details, /protocol mismatch: competitor specified INFINIBAND_NDR/);
      assert.match(res.details, /target BOM provides ROCE_V2/);
    });

    it('2.11 Specified NDR InfiniBand (400Gb/s) vs HDR InfiniBand (200Gb/s) flags DEFICIT (downgrade)', () => {
      const spec = { networking: { adapterCount: 1, portsCount: 1, totalPorts: 1, speedGb: 400, fabricProtocol: 'INFINIBAND_NDR' } };
      const bom = [
        { sku: 'P20000-B21', description: 'NVIDIA ConnectX-6 HDR InfiniBand 200Gb 1-port QSFP56 Adapter', quantity: 1 }
      ];
      const res = _evaluateNetworkingFabricParity(spec, bom);
      assert.equal(res.status, 'DEFICIT');
      assert.match(res.details, /protocol mismatch/);
    });

    it('2.12 Specified HDR InfiniBand (200Gb/s) vs NDR InfiniBand (400Gb/s) flags EXCEEDS (upgrade)', () => {
      const spec = { networking: { adapterCount: 1, portsCount: 1, totalPorts: 1, speedGb: 200, fabricProtocol: 'INFINIBAND_HDR' } };
      const bom = [
        { sku: 'P45641-B21', description: 'NVIDIA MCX75310AAS-NEAT ConnectX-7 NDR InfiniBand 400Gb/s 1-port OSFP Adapter', quantity: 1 }
      ];
      const res = _evaluateNetworkingFabricParity(spec, bom);
      assert.equal(res.status, 'EXCEEDS');
      assert.match(res.details, /satisfies competitor INFINIBAND_HDR requirements/);
    });

    it('2.13 Specified RoCEv2 (100Gb/s) vs InfiniBand NDR (400Gb/s) flags EXCEEDS (superset)', () => {
      const spec = { networking: { adapterCount: 1, portsCount: 1, totalPorts: 1, speedGb: 100, fabricProtocol: 'ROCE_V2' } };
      const bom = [
        { sku: 'P45641-B21', description: 'NVIDIA ConnectX-7 NDR InfiniBand 400Gb/s 1-port OSFP Adapter', quantity: 1 }
      ];
      const res = _evaluateNetworkingFabricParity(spec, bom);
      assert.equal(res.status, 'EXCEEDS');
    });

    it('2.14 Multi-adapter aggregation: 2x 2-port 100G satisfies competitor 4-port 100G requirement', () => {
      const spec = { networking: { adapterCount: 1, portsCount: 4, totalPorts: 4, speedGb: 100, fabricProtocol: 'ETHERNET' } };
      const bom = [
        { sku: 'P10001-B21', description: 'Mellanox ConnectX-6 100GbE 2-port Adapter', quantity: 2 }
      ];
      const res = _evaluateNetworkingFabricParity(spec, bom);
      assert.equal(res.status, 'MATCHED');
      assert.match(res.details, /4 ports, max 100Gb/);
    });

    it('2.15 Multi-adapter aggregation deficit: 2x 1-port 100G fails competitor 4-port 100G requirement', () => {
      const spec = { networking: { adapterCount: 1, portsCount: 4, totalPorts: 4, speedGb: 100, fabricProtocol: 'ETHERNET' } };
      const bom = [
        { sku: 'P10002-B21', description: 'Mellanox ConnectX-6 100GbE 1-port Adapter', quantity: 2 }
      ];
      const res = _evaluateNetworkingFabricParity(spec, bom);
      assert.equal(res.status, 'DEFICIT');
      assert.match(res.details, /Target network ports \(2\) are fewer than competitor \(4\)/);
    });
  });

  // =========================================================================
  // VECTOR 3: NUMA Memory Topology & Multi-Socket Channel Interleaving Stress
  // =========================================================================
  describe('Vector 3: NUMA Memory Topology & Multi-Socket Channel Interleaving Stress', () => {

    it('3.1 Intel 8-channel (Gen11/Gen12 Xeon): 16 DIMMs on 2P achieves 1DPC_BALANCED_OPTIMAL', () => {
      const items = [
        { description: 'Intel Xeon Gold 6430 32-core Processor', quantity: 2 },
        { description: 'HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory Kit', quantity: 16 }
      ];
      const topo = validateNumaMemoryTopology(items);
      assert.equal(topo.isValid, true);
      assert.equal(topo.cpuSockets, 2);
      assert.equal(topo.dimmCount, 16);
      assert.equal(topo.dimmsPerSocket, 8);
      assert.equal(topo.channelWidth, 8);
      assert.equal(topo.isSocketSymmetric, true);
      assert.equal(topo.is1DpcBalanced, true);
      assert.equal(topo.isBalancedInterleaving, true);
      assert.equal(topo.interleavingMode, '1DPC_BALANCED_OPTIMAL');
      assert.equal(topo.errors.length, 0);
    });

    it('3.2 Intel 8-channel (Gen11/Gen12 Xeon): 32 DIMMs on 2P achieves 2DPC_BALANCED_MAX_CAPACITY', () => {
      const items = [
        { description: 'Intel Xeon Platinum 8480+ 56-core Processor', quantity: 2 },
        { description: 'HPE 64GB 2Rx4 DDR5-4800 Registered Smart Memory Kit', quantity: 32 }
      ];
      const topo = validateNumaMemoryTopology(items);
      assert.equal(topo.isValid, true);
      assert.equal(topo.cpuSockets, 2);
      assert.equal(topo.dimmCount, 32);
      assert.equal(topo.dimmsPerSocket, 16);
      assert.equal(topo.isSocketSymmetric, true);
      assert.equal(topo.is2DpcBalanced, true);
      assert.equal(topo.isBalancedInterleaving, true);
      assert.equal(topo.interleavingMode, '2DPC_BALANCED_MAX_CAPACITY');
    });

    it('3.3 Intel 8-channel: Flags DEFICIT on odd / asymmetric DIMM count (e.g. 7 DIMMs on 2P)', () => {
      const items = [
        { description: 'Intel Xeon Gold 6430 Processor', quantity: 2 },
        { description: 'HPE 32GB DDR5 DIMM', quantity: 7 }
      ];
      const topo = validateNumaMemoryTopology(items);
      assert.equal(topo.isValid, false);
      assert.equal(topo.isSocketSymmetric, false);
      assert.match(topo.errors[0], /Unbalanced socket symmetry: 7 DIMMs cannot be evenly distributed across 2 CPU sockets/);
    });

    it('3.4 Intel 8-channel: Flags DEFICIT on symmetric but un-interleaved DIMMs (e.g. 10 DIMMs on 2P = 5/socket)', () => {
      const items = [
        { description: 'Intel Xeon Gold 6430 Processor', quantity: 2 },
        { description: 'HPE 32GB DDR5 DIMM', quantity: 10 }
      ];
      const topo = validateNumaMemoryTopology(items);
      assert.equal(topo.isValid, false);
      assert.equal(topo.isSocketSymmetric, true);
      assert.equal(topo.isSupportedPopulation, false);
      assert.match(topo.errors[0], /Unbalanced channel population: 5 DIMMs\/socket violates 8-channel interleaving/);
    });

    it('3.5 AMD 12-channel (Genoa/Bergamo/Turin): 24 DIMMs on 2P achieves 1DPC_BALANCED_OPTIMAL', () => {
      const items = [
        { description: 'AMD EPYC 9654 Genoa 96-core Processor', quantity: 2 },
        { description: 'HPE 64GB 2Rx4 DDR5-4800 DIMM', quantity: 24 }
      ];
      const topo = validateNumaMemoryTopology(items);
      assert.equal(topo.isValid, true);
      assert.equal(topo.channelWidth, 12);
      assert.equal(topo.dimmsPerSocket, 12);
      assert.equal(topo.is1DpcBalanced, true);
      assert.equal(topo.interleavingMode, '1DPC_BALANCED_OPTIMAL');
    });

    it('3.6 AMD 12-channel: 48 DIMMs on 2P achieves 2DPC_BALANCED_MAX_CAPACITY', () => {
      const items = [
        { description: 'AMD EPYC 9754 Bergamo 128-core Processor', quantity: 2 },
        { description: 'HPE 64GB 2Rx4 DDR5-4800 DIMM', quantity: 48 }
      ];
      const topo = validateNumaMemoryTopology(items);
      assert.equal(topo.isValid, true);
      assert.equal(topo.channelWidth, 12);
      assert.equal(topo.dimmsPerSocket, 24);
      assert.equal(topo.is2DpcBalanced, true);
      assert.equal(topo.interleavingMode, '2DPC_BALANCED_MAX_CAPACITY');
    });

    it('3.7 Intel 6-channel (Cascade Lake / Gen10): 12 DIMMs on 2P achieves 1DPC_BALANCED_OPTIMAL', () => {
      const items = [
        { description: 'Intel Xeon Gold 6248R Cascade Lake 24-core Processor', quantity: 2 },
        { description: 'HPE 32GB DDR4-2933 DIMM', quantity: 12 }
      ];
      const topo = validateNumaMemoryTopology(items);
      assert.equal(topo.isValid, true);
      assert.equal(topo.channelWidth, 6);
      assert.equal(topo.dimmsPerSocket, 6);
      assert.equal(topo.is1DpcBalanced, true);
      assert.equal(topo.interleavingMode, '1DPC_BALANCED_OPTIMAL');
    });

    it('3.8 Multi-socket 4P & 8P scaling tests', () => {
      // 4P system with 32 DIMMs (8/socket on 8-channel)
      const topo4P = validateNumaMemoryTopology([], { cpuSockets: 4, dimmCount: 32, channelWidth: 8 });
      assert.equal(topo4P.isValid, true);
      assert.equal(topo4P.is1DpcBalanced, true);

      // 8P system with 64 DIMMs (8/socket on 8-channel)
      const topo8P = validateNumaMemoryTopology([], { cpuSockets: 8, dimmCount: 64, channelWidth: 8 });
      assert.equal(topo8P.isValid, true);
      assert.equal(topo8P.is1DpcBalanced, true);

      // 4P with asymmetric 30 DIMMs
      const topo4PDeficit = validateNumaMemoryTopology([], { cpuSockets: 4, dimmCount: 30, channelWidth: 8 });
      assert.equal(topo4PDeficit.isValid, false);
    });

    it('3.9 Null, undefined, and empty options objects handled safely', () => {
      assert.doesNotThrow(() => {
        const res1 = validateNumaMemoryTopology(null, null);
        assert.equal(typeof res1, 'object');

        const res2 = validateNumaMemoryTopology(undefined, undefined);
        assert.equal(typeof res2, 'object');

        const res3 = validateNumaMemoryTopology([], {});
        assert.equal(typeof res3, 'object');
      });
    });
  });

  // =========================================================================
  // VECTOR 4: End-to-End Competitor Transformation & Parity Audit Integration
  // =========================================================================
  describe('Vector 4: End-to-End Competitor Transformation & Parity Integration', () => {

    it('4.1 Competitor quote without networking evaluates OCP_NETWORKING_FABRIC to NOT_EVALUATED in full 12-point audit', () => {
      const rawCompetitorText = `
        Dell PowerEdge R760 Rack Server
        2x Intel Xeon Gold 6430 (32 cores, 2.1GHz, 270W)
        16x 32GB DDR5-4800 RDIMM (512GB Total, Balanced 1DPC)
        8x 1.92TB NVMe Mixed-Use Gen4 SSD
        PERC H965i Front SAS/SATA/NVMe RAID Controller with 8GB Flash Cache
        2x 1400W Titanium Hot-Plug Redundant Power Supplies
        iDRAC9 Enterprise Remote Management
        2x PCIe Riser with 6 Available Slots
      `;

      const competitorSpec = parseCompetitorSpecification(rawCompetitorText, 'DELL');
      assert.equal(competitorSpec.networking.speedGb, null);
      assert.equal(competitorSpec.networking.portsCount, null);
      assert.equal(competitorSpec.networking.fabricProtocol, null);

      const targetBom = [
        { sku: 'P49610-B21', description: 'Intel Xeon-Gold 6430 2.1GHz 32-core 270W Processor', quantity: 2 },
        { sku: 'P43328-B21', description: 'HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory Kit', quantity: 16 },
        { sku: 'P40498-B21', description: 'HPE 1.92TB NVMe Mixed Use SFF BC SSD', quantity: 8 },
        { sku: 'P48820-B21', description: 'HPE ProLiant DL380 Gen11 High Performance Fan Kit', quantity: 1 },
        { sku: 'P48818-B21', description: 'HPE ProLiant DL380 Gen11 2P High Performance Heatsink Kit', quantity: 1 },
        { sku: 'P01366-B21', description: 'HPE 96W Smart Storage Battery with 145mm Cable', quantity: 1 },
        { sku: 'P26256-B21', description: 'HPE MR416i-p Gen11 16-port SAS/NVMe Controller 8GB Cache', quantity: 1 },
        { sku: 'P03178-B21', description: 'HPE 1600W Flex Slot Titanium Hot Plug Low Halogen Power Supply', quantity: 2 },
        { sku: 'E6U59ABE', description: 'HPE iLO Advanced 1-server License with 3yr Support on iLO Licensed Features', quantity: 1 },
        { sku: 'P48832-B21', description: 'HPE ProLiant DL380 Gen11 2U 8SFF Primary Riser Kit', quantity: 2 }
      ];

      const audit = audit12PointPhysicalParity(competitorSpec, targetBom, 'DL380_Gen12');
      const netAudit = audit.auditItems.find(i => i.subsystem === 'OCP_NETWORKING_FABRIC');
      assert.ok(netAudit, 'OCP_NETWORKING_FABRIC must be present in 12-point audit');
      assert.equal(netAudit.status, 'NOT_EVALUATED');
      assert.match(netAudit.details, /No competitor network fabric specification provided/);

      // Verify that no false DEFICIT is present anywhere in the audit
      const deficits = audit.auditItems.filter(i => i.status === 'DEFICIT');
      assert.equal(deficits.length, 0, `Expected 0 deficits but found: ${JSON.stringify(deficits)}`);
      assert.equal(audit.status, 'PASSED');
    });

    it('4.2 Competitor quote with InfiniBand NDR requirements enforces protocol match end-to-end', () => {
      const rawCompetitorText = `
        Dell PowerEdge R760xa
        2x Intel Xeon Platinum 8480+ (56 cores, 350W)
        32x 64GB DDR5-4800 RDIMM (2TB Total)
        1x NVIDIA ConnectX-7 Single Port NDR 400Gb/s InfiniBand OSFP Adapter
        2x 2400W Titanium Hot-Plug Redundant Power Supplies
      `;

      const competitorSpec = parseCompetitorSpecification(rawCompetitorText, 'DELL');
      assert.equal(competitorSpec.networking.fabricProtocol, 'INFINIBAND_NDR');
      assert.equal(competitorSpec.networking.speedGb, 400);

      // BOM with only 100GbE Ethernet
      const deficientBom = [
        { sku: 'P10000-B21', description: 'Broadcom 100GbE 2-port QSFP28 Adapter', quantity: 1 }
      ];

      const deficientAudit = audit12PointPhysicalParity(competitorSpec, deficientBom, 'DL380_Gen12');
      const deficientNet = deficientAudit.auditItems.find(i => i.subsystem === 'OCP_NETWORKING_FABRIC');
      assert.equal(deficientNet.status, 'DEFICIT');
      assert.match(deficientNet.details, /protocol mismatch: competitor specified INFINIBAND_NDR/);

      // BOM with genuine NDR InfiniBand
      const matchedBom = [
        { sku: 'P45641-B21', description: 'NVIDIA MCX75310AAS-NEAT ConnectX-7 NDR InfiniBand 400Gb/s 1-port OSFP Adapter', quantity: 1 }
      ];

      const matchedAudit = audit12PointPhysicalParity(competitorSpec, matchedBom, 'DL380_Gen12');
      const matchedNet = matchedAudit.auditItems.find(i => i.subsystem === 'OCP_NETWORKING_FABRIC');
      assert.equal(matchedNet.status, 'MATCHED');
    });

    it('4.3 detectFabricProtocol handles null, undefined, numeric, and empty text safely', () => {
      const falsy = [null, undefined, '', 1234, false, true, {}];
      for (const input of falsy) {
        assert.equal(detectFabricProtocol(input), 'ETHERNET');
      }
    });

    it('4.4 transformCompetitorQuote executes safely when targetBom satisfies all non-networking requirements', () => {
      const input = 'Dell PowerEdge R760 2x Xeon Gold 6430 16x 32GB RAM';
      const result = transformCompetitorQuote(input, 'DELL', 'DL380_Gen12', {
        targetBom: [
          { sku: 'P49610-B21', description: 'Intel Xeon-Gold 6430 Processor', quantity: 2 },
          { sku: 'P43328-B21', description: 'HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory Kit', quantity: 16 }
        ]
      });

      assert.equal(result.status, 'CANDIDATE_EVALUATION_REQUIRED');
      assert.equal(result.auditReport.auditItems.find(i => i.subsystem === 'OCP_NETWORKING_FABRIC').status, 'NOT_EVALUATED');
    });
  });
});
