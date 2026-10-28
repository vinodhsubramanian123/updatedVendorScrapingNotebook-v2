'use strict';
/**
 * tests/chaos/test_m3_it2_adversarial_challenger_audit.js
 *
 * EMPIRICAL ADVERSARIAL CHALLENGER SUITE — Challenger M3_It2_1
 * Deep Chaos & Fuzzing Verification for Fabric Protocol Tracking and NUMA Memory Topology
 *
 * Adversarial Requirements Covered:
 * 1. Stress test validateNumaMemoryTopology:
 *    - null options, undefined options, partial keys, null items, empty arrays, extreme channel widths.
 * 2. Stress test extractWorkloadDna:
 *    - null, non-arrays, objects, items with missing descriptions/categories/quantities.
 * 3. Stress test transformCompetitorQuote:
 *    - null options, zero crashes, invalid options bounds.
 * 4. Stress test _evaluateNetworkingFabricParity:
 *    - All protocol combinations: NDR vs RoCEv2, HDR vs RoCEv2, NDR vs Ethernet, RoCEv2 vs Ethernet, etc.
 *    - Diagnostic reporting truth: verify exact reporting of targetProtocol on mismatch.
 * 5. General robustness and edge case mining across fabric and NUMA subsystems.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  AUDIT_SUBSYSTEMS,
  FABRIC_PROTOCOL_RANKS,
  detectFabricProtocol,
  detectArchitectureChannelWidth,
  parseCompetitorSpecification,
  audit12PointPhysicalParity,
  transformCompetitorQuote,
  _evaluateNetworkingFabricParity,
  _evaluateMemoryTopologyParity
} = require('../../scripts/lib/boq/cross_vendor_transformer.js');

const {
  extractWorkloadDna,
  validateNumaMemoryTopology
} = require('../../scripts/lib/conflict/workload_dna.js');

describe('Adversarial Challenger M3_It2_1: Fabric & NUMA Chaos Suite', () => {

  // =========================================================================
  // 1. STRESS TESTING validateNumaMemoryTopology
  // =========================================================================
  describe('1. Stress Testing validateNumaMemoryTopology Null Safety & Boundary Fuzzing', () => {

    it('1.1 Handles null options safely without TypeError', () => {
      const res = validateNumaMemoryTopology([], null);
      assert.equal(typeof res, 'object');
      assert.equal(res.isValid, false);
      assert.equal(res.channelWidth, 8);
      assert.equal(res.cpuSockets, 1);
      assert.equal(res.dimmCount, 0);
      assert.ok(Array.isArray(res.errors));
    });

    it('1.2 Handles undefined options safely', () => {
      const res = validateNumaMemoryTopology([], undefined);
      assert.equal(typeof res, 'object');
      assert.equal(res.channelWidth, 8);
      assert.equal(res.isValid, false);
    });

    it('1.3 Handles null items and null options simultaneously', () => {
      const res = validateNumaMemoryTopology(null, null);
      assert.equal(typeof res, 'object');
      assert.equal(res.isValid, false);
      assert.equal(res.channelWidth, 8);
      assert.equal(res.cpuSockets, 1);
      assert.equal(res.dimmCount, 0);
    });

    it('1.4 Handles null items and undefined options', () => {
      const res = validateNumaMemoryTopology(null, undefined);
      assert.equal(typeof res, 'object');
      assert.equal(res.isValid, false);
    });

    it('1.5 Handles undefined items and undefined options', () => {
      const res = validateNumaMemoryTopology(undefined, undefined);
      assert.equal(typeof res, 'object');
      assert.equal(res.isValid, false);
    });

    it('1.6 Handles partial keys in options object', () => {
      // Only channelWidth provided
      const resWidth = validateNumaMemoryTopology([], { channelWidth: 12 });
      assert.equal(resWidth.channelWidth, 12);
      assert.equal(resWidth.cpuSockets, 1);
      assert.equal(resWidth.dimmCount, 0);

      // Only cpuSockets provided
      const resSockets = validateNumaMemoryTopology([], { cpuSockets: 2 });
      assert.equal(resSockets.cpuSockets, 2);
      assert.equal(resSockets.channelWidth, 8);
      assert.equal(resSockets.dimmCount, 0);

      // Only dimmCount provided
      const resDimms = validateNumaMemoryTopology([], { dimmCount: 16 });
      assert.equal(resDimms.dimmCount, 16);
      assert.equal(resDimms.cpuSockets, 1);
      assert.equal(resDimms.channelWidth, 8);
      assert.equal(resDimms.is2DpcBalanced, true);

      // Only totalMemoryGb provided
      const resMem = validateNumaMemoryTopology([], { totalMemoryGb: 512 });
      assert.equal(resMem.totalMemoryGb, 512);
    });

    it('1.7 Handles empty arrays with full valid options', () => {
      const res = validateNumaMemoryTopology([], {
        cpuSockets: 2,
        dimmCount: 16,
        channelWidth: 8,
        totalMemoryGb: 512
      });
      assert.equal(res.isValid, true);
      assert.equal(res.is1DpcBalanced, true);
      assert.equal(res.interleavingMode, '1DPC_BALANCED_OPTIMAL');
      assert.equal(res.errors.length, 0);
    });

    it('1.8 Handles extreme channel widths (4, 6, 12, 16, 24, 32)', () => {
      // 12-channel (AMD Genoa/Turin)
      const res12 = validateNumaMemoryTopology([], { cpuSockets: 2, dimmCount: 24, channelWidth: 12 });
      assert.equal(res12.isValid, true);
      assert.equal(res12.is1DpcBalanced, true);
      assert.equal(res12.interleavingMode, '1DPC_BALANCED_OPTIMAL');

      // 16-channel extreme
      const res16 = validateNumaMemoryTopology([], { cpuSockets: 2, dimmCount: 32, channelWidth: 16 });
      assert.equal(res16.isValid, true);
      assert.equal(res16.is1DpcBalanced, true);

      // 24-channel extreme
      const res24 = validateNumaMemoryTopology([], { cpuSockets: 2, dimmCount: 48, channelWidth: 24 });
      assert.equal(res24.isValid, true);
      assert.equal(res24.is1DpcBalanced, true);

      // 4-channel narrow
      const res4 = validateNumaMemoryTopology([], { cpuSockets: 2, dimmCount: 8, channelWidth: 4 });
      assert.equal(res4.isValid, true);
      assert.equal(res4.is1DpcBalanced, true);

      // 1-channel minimal
      const res1 = validateNumaMemoryTopology([], { cpuSockets: 1, dimmCount: 1, channelWidth: 1 });
      assert.equal(res1.isValid, true);
      assert.equal(res1.is1DpcBalanced, true);
    });

    it('1.9 Handles non-array inputs for items gracefully', () => {
      const nonArrays = ['invalid_string', 12345, false, true, NaN, {}];
      for (const input of nonArrays) {
        assert.doesNotThrow(() => {
          const res = validateNumaMemoryTopology(input, null);
          assert.equal(typeof res, 'object');
          assert.equal(res.isValid, false);
        }, `Failed on non-array input: ${String(input)}`);
      }
    });

    it('1.10 Ingests pre-computed DNA topology object', () => {
      const precomputedDna = {
        numaTopology: {
          cpuSockets: 2,
          memoryDimmCount: 16,
          channelWidth: 8,
          totalMemoryGb: 512
        }
      };
      const res = validateNumaMemoryTopology(precomputedDna, null);
      assert.equal(res.isValid, true);
      assert.equal(res.cpuSockets, 2);
      assert.equal(res.dimmCount, 16);
      assert.equal(res.channelWidth, 8);
      assert.equal(res.is1DpcBalanced, true);
    });

    it('1.11 Handles zero and negative sockets/DIMMs gracefully without crash', () => {
      const resZeroSockets = validateNumaMemoryTopology([], { cpuSockets: 0, dimmCount: 8 });
      assert.equal(resZeroSockets.isValid, false);
      assert.equal(resZeroSockets.isSocketSymmetric, false);

      const resNegSockets = validateNumaMemoryTopology([], { cpuSockets: -2, dimmCount: 8 });
      assert.equal(resNegSockets.isValid, false);

      const resNegDimms = validateNumaMemoryTopology([], { cpuSockets: 2, dimmCount: -8 });
      assert.equal(resNegDimms.isValid, false);
    });

  });

  // =========================================================================
  // 2. STRESS TESTING extractWorkloadDna
  // =========================================================================
  describe('2. Stress Testing extractWorkloadDna Defensive Bounds', () => {

    it('2.1 Handles null input safely', () => {
      const res = extractWorkloadDna(null);
      assert.equal(typeof res, 'object');
      assert.equal(res.primaryWorkload, 'BALANCED_ENTERPRISE');
      assert.equal(res.totalCores, 0);
      assert.equal(res.cpuCount, 0);
      assert.equal(res.totalMemoryGb, 0);
      assert.equal(res.memoryDimmCount, 0);
      assert.equal(res.hasGpu, false);
      assert.ok(typeof res.numaTopology === 'object');
    });

    it('2.2 Handles undefined input safely', () => {
      const res = extractWorkloadDna(undefined);
      assert.equal(typeof res, 'object');
      assert.equal(res.primaryWorkload, 'BALANCED_ENTERPRISE');
    });

    it('2.3 Handles non-array inputs (strings, numbers, booleans, objects)', () => {
      const nonArrays = [
        'Intel Xeon Gold 6430 32-core',
        123456,
        true,
        false,
        {},
        { description: 'GPU' }
      ];
      for (const input of nonArrays) {
        assert.doesNotThrow(() => {
          const res = extractWorkloadDna(input);
          assert.equal(typeof res, 'object');
          assert.equal(res.primaryWorkload, 'BALANCED_ENTERPRISE');
        }, `Failed on input: ${JSON.stringify(input)}`);
      }
    });

    it('2.4 Handles items with missing descriptions, quantities, and categories', () => {
      const messyItems = [
        {},
        { sku: 'P12345-B21' },
        { description: null, quantity: null },
        { description: undefined, quantity: undefined },
        { description: '', quantity: 0 },
        { description: 'Some random unclassified part', quantity: 5 }
      ];
      assert.doesNotThrow(() => {
        const res = extractWorkloadDna(messyItems);
        assert.equal(typeof res, 'object');
        assert.equal(res.totalCores, 0);
        assert.equal(res.hasGpu, false);
      });
    });

    it('2.5 Classifies primary workloads correctly across stress profiles', () => {
      // GPU presence -> VDI_AI_GRAPHICS
      const gpuDna = extractWorkloadDna([
        { description: 'NVIDIA L40S 48GB PCIe Accelerator', quantity: 2 }
      ]);
      assert.equal(gpuDna.primaryWorkload, 'VDI_AI_GRAPHICS');
      assert.equal(gpuDna.hasGpu, true);
      assert.equal(gpuDna.totalGpuCount, 2);

      // High memory (>= 768GB) -> DATABASE_IN_MEMORY
      const dbDna = extractWorkloadDna([
        { description: 'HPE 64GB 2Rx4 DDR5-5600 RDIMM', quantity: 16 }
      ]);
      assert.equal(dbDna.primaryWorkload, 'DATABASE_IN_MEMORY');
      assert.equal(dbDna.totalMemoryGb, 1024);

      // Dense cores (>= 64 cores) -> VIRTUALIZATION_DENSE
      const denseDna = extractWorkloadDna([
        { description: 'Intel Xeon Platinum 8480+ 56-core Processor', quantity: 2 }
      ]);
      assert.equal(denseDna.primaryWorkload, 'VIRTUALIZATION_DENSE');
      assert.equal(denseDna.totalCores, 112);

      // Write-intensive storage -> STORAGE_HIGH_IOPS
      const storageDna = extractWorkloadDna([
        { description: 'HPE 1.6TB NVMe Gen4 High Performance Write Intensive SFF SSD', quantity: 8 }
      ]);
      assert.equal(storageDna.primaryWorkload, 'STORAGE_HIGH_IOPS');
      assert.equal(storageDna.storageWorkload, 'WRITE_INTENSIVE');
    });

  });

  // =========================================================================
  // 3. STRESS TESTING transformCompetitorQuote
  // =========================================================================
  describe('3. Stress Testing transformCompetitorQuote Null Safety & Robustness', () => {

    it('3.1 Handles null options safely without TypeError', () => {
      assert.doesNotThrow(() => {
        const res = transformCompetitorQuote('2x Xeon Gold 6430, 256GB RAM', 'DELL', 'DL380_Gen11', null);
        assert.equal(typeof res, 'object');
        assert.equal(res.nodeMultiplier, 1);
        assert.equal(res.targetChassis, 'DL380_Gen11');
        assert.equal(res.portalValidationStatus, 'PORTAL VALIDATION PENDING');
      });
    });

    it('3.2 Handles undefined options safely', () => {
      assert.doesNotThrow(() => {
        const res = transformCompetitorQuote('2x Xeon Gold 6430, 256GB RAM', 'DELL', 'DL380_Gen11', undefined);
        assert.equal(typeof res, 'object');
        assert.equal(res.nodeMultiplier, 1);
      });
    });

    it('3.3 Handles null input and null sourceVendor gracefully', () => {
      assert.doesNotThrow(() => {
        const res = transformCompetitorQuote(null, null, 'DL380_Gen11', null);
        assert.equal(typeof res, 'object');
        assert.equal(res.targetChassis, 'DL380_Gen11');
      });
    });

    it('3.4 Returns TARGET_PRODUCT_REQUIRED when targetChassis is null', () => {
      const res = transformCompetitorQuote('2x Xeon Gold 6430', 'DELL', null, null);
      assert.equal(res.status, 'TARGET_PRODUCT_REQUIRED');
    });

    it('3.5 Enforces nodeMultiplier positive integer boundary', () => {
      const invalidMultipliers = [0, -1, 1.5, NaN, 'three', null];
      for (const mult of invalidMultipliers) {
        if (mult === null) {
          // null defaults to 1 via ?? operator
          const res = transformCompetitorQuote('2x Xeon', 'DELL', 'DL380_Gen11', { nodeMultiplier: mult });
          assert.equal(res.nodeMultiplier, 1);
        } else {
          assert.throws(() => {
            transformCompetitorQuote('2x Xeon', 'DELL', 'DL380_Gen11', { nodeMultiplier: mult });
          }, /Node multiplier must be a positive integer/);
        }
      }
    });

    it('3.6 Rejects non-array targetBom with clean error', () => {
      assert.throws(() => {
        transformCompetitorQuote('2x Xeon', 'DELL', 'DL380_Gen11', { targetBom: 'not_an_array' });
      }, /targetBom must be an array/);
    });

    it('3.7 Rejects candidate items lacking SKU or valid quantity', () => {
      assert.throws(() => {
        transformCompetitorQuote('2x Xeon', 'DELL', 'DL380_Gen11', {
          targetBom: [{ quantity: 1 }] // missing SKU
        });
      }, /Candidate items require a SKU and positive integer quantity/);

      assert.throws(() => {
        transformCompetitorQuote('2x Xeon', 'DELL', 'DL380_Gen11', {
          targetBom: [{ sku: 'P12345-B21', quantity: 0 }] // zero quantity
        });
      }, /Candidate items require a SKU and positive integer quantity/);
    });

  });

  // =========================================================================
  // 4. COMPREHENSIVE FABRIC PROTOCOL PERMUTATIONS & TRUTHFUL DIAGNOSTICS
  // =========================================================================
  describe('4. Comprehensive Fabric Protocol Permutations & Truthful Diagnostics', () => {

    // Helper to evaluate fabric parity cleanly
    function testFabricParity(competitorDesc, targetBomItems) {
      const spec = parseCompetitorSpecification(competitorDesc);
      return _evaluateNetworkingFabricParity(spec, targetBomItems);
    }

    it('4.1 NDR (400G) vs RoCEv2 (400G): DEFICIT with truthful diagnostic mentioning ROCE_V2', () => {
      const res = testFabricParity('1x NVIDIA ConnectX-7 NDR 400Gb/s InfiniBand OSFP Adapter', [
        { description: 'HPE 400Gb 1-port QSFP112 RoCEv2 Adapter', quantity: 1 }
      ]);
      assert.equal(res.status, 'DEFICIT');
      assert.match(res.details, /competitor specified INFINIBAND_NDR \(400Gb\/s\)/);
      assert.match(res.details, /target BOM provides ROCE_V2/);
      assert.doesNotMatch(res.details, /target BOM provides ETHERNET/);
    });

    it('4.2 NDR (400G) vs HDR (200G): DEFICIT with truthful diagnostic mentioning INFINIBAND_HDR', () => {
      const res = testFabricParity('1x NVIDIA ConnectX-7 NDR 400Gb/s InfiniBand OSFP Adapter', [
        { description: 'HPE InfiniBand HDR 200Gb 1-port QSFP56 Adapter', quantity: 1 }
      ]);
      assert.equal(res.status, 'DEFICIT');
      assert.match(res.details, /target BOM provides INFINIBAND_HDR/);
      assert.doesNotMatch(res.details, /target BOM provides ETHERNET/);
    });

    it('4.3 NDR (400G) vs Ethernet (400G): DEFICIT with truthful diagnostic mentioning ETHERNET', () => {
      const res = testFabricParity('1x NVIDIA ConnectX-7 NDR 400Gb/s InfiniBand OSFP Adapter', [
        { description: 'Broadcom 400Gb 1-port Ethernet Adapter', quantity: 1 }
      ]);
      assert.equal(res.status, 'DEFICIT');
      assert.match(res.details, /competitor specified INFINIBAND_NDR \(400Gb\/s\)/);
      assert.match(res.details, /target BOM provides ETHERNET/);
    });

    it('4.4 HDR (200G) vs RoCEv2 (200G): DEFICIT with truthful diagnostic mentioning ROCE_V2', () => {
      const res = testFabricParity('1x NVIDIA ConnectX-6 HDR 200Gb/s InfiniBand QSFP56 Adapter', [
        { description: 'Mellanox ConnectX-6 Dx 200GbE 1-port RoCEv2 Adapter', quantity: 1 }
      ]);
      assert.equal(res.status, 'DEFICIT');
      assert.match(res.details, /competitor specified INFINIBAND_HDR \(200Gb\/s\)/);
      assert.match(res.details, /target BOM provides ROCE_V2/);
    });

    it('4.5 HDR (200G) vs Ethernet (200G/100G): DEFICIT with truthful diagnostic mentioning ETHERNET', () => {
      const res = testFabricParity('1x NVIDIA ConnectX-6 HDR 200Gb/s InfiniBand QSFP56 Adapter', [
        { description: 'Intel E810 100Gb 2-port Ethernet Adapter', quantity: 1 }
      ]);
      assert.equal(res.status, 'DEFICIT');
      assert.match(res.details, /competitor specified INFINIBAND_HDR \(200Gb\/s\)/);
      assert.match(res.details, /target BOM provides ETHERNET/);
    });

    it('4.6 HDR (200G) vs NDR (400G): EXCEEDS protocol upgrade', () => {
      const res = testFabricParity('1x NVIDIA ConnectX-6 HDR 200Gb/s InfiniBand QSFP56 Adapter', [
        { description: 'HPE InfiniBand NDR 400Gb 1-port OSFP Adapter', quantity: 1 }
      ]);
      assert.equal(res.status, 'EXCEEDS');
      assert.match(res.details, /satisfies competitor INFINIBAND_HDR requirements/);
    });

    it('4.7 RoCEv2 (100G) vs Ethernet (100G): DEFICIT with truthful diagnostic', () => {
      const res = testFabricParity('1x Mellanox ConnectX-6 Dx 100GbE 2-port RoCEv2 Adapter', [
        { description: 'Intel E810-XXVDA2 100Gb 2-port Ethernet Adapter', quantity: 1 }
      ]);
      assert.equal(res.status, 'DEFICIT');
      assert.match(res.details, /competitor specified ROCE_V2/);
      assert.match(res.details, /target BOM provides ETHERNET/);
    });

    it('4.8 RoCEv2 (100G) vs InfiniBand NDR (400G): EXCEEDS / MATCHED (InfiniBand superset)', () => {
      const res = testFabricParity('1x Mellanox ConnectX-6 Dx 100GbE 2-port RoCEv2 Adapter', [
        { description: 'HPE InfiniBand NDR 400Gb 2-port QSFP112 Adapter', quantity: 1 }
      ]);
      assert.ok(res.status === 'MATCHED' || res.status === 'EXCEEDS');
      assert.match(res.details, /satisfies competitor ROCE_V2 requirements/);
    });

    it('4.9 RoCEv2 (100G) vs InfiniBand HDR (200G): EXCEEDS / MATCHED (InfiniBand superset)', () => {
      const res = testFabricParity('1x Mellanox ConnectX-6 Dx 100GbE 2-port RoCEv2 Adapter', [
        { description: 'HPE InfiniBand HDR 200Gb 2-port QSFP56 Adapter', quantity: 1 }
      ]);
      assert.ok(res.status === 'MATCHED' || res.status === 'EXCEEDS');
      assert.match(res.details, /satisfies competitor ROCE_V2 requirements/);
    });

    it('4.10 RoCEv2 (25G) vs RoCEv2 (25G): MATCHED', () => {
      const res = testFabricParity('1x Broadcom BCM57414 25Gb 2-port RoCEv2 Adapter', [
        { description: 'HPE BCM57414 10/25GbE 2-port SFP28 RoCE Adapter', quantity: 1 }
      ]);
      assert.equal(res.status, 'MATCHED');
      assert.match(res.details, /protocol ROCE_V2\) satisfies competitor ROCE_V2/);
    });

    it('4.11 Ethernet (25G) vs Ethernet (25G): MATCHED', () => {
      const res = testFabricParity('1x Intel E810 25Gb 2-port SFP28 Ethernet Adapter', [
        { description: 'HPE Intel E810-XXVDA2 10/25GbE 2-port SFP28 Adapter', quantity: 1 }
      ]);
      assert.equal(res.status, 'MATCHED');
      assert.match(res.details, /satisfies competitor ETHERNET requirements/);
    });

    it('4.12 Ethernet (25G) vs RoCEv2 (25G): MATCHED', () => {
      const res = testFabricParity('1x Intel E810 25Gb 2-port Ethernet Adapter', [
        { description: 'HPE BCM57414 10/25GbE 2-port SFP28 RoCEv2 Adapter', quantity: 1 }
      ]);
      assert.equal(res.status, 'MATCHED');
    });

    it('4.13 Multi-protocol BOM picks highest protocol rank for targetProtocol', () => {
      // BOM contains 1Gb Ethernet (rank 1), 25Gb RoCE (rank 2), and 200Gb HDR (rank 3)
      const mixedBom = [
        { description: 'Broadcom 1Gb 4-port 5719 Ethernet Adapter', quantity: 1 },
        { description: 'HPE 25Gb 2-port BCM57414 RoCEv2 Adapter', quantity: 1 },
        { description: 'HPE InfiniBand HDR 200Gb 1-port QSFP56 Adapter', quantity: 1 }
      ];
      // When competitor requested 400G NDR:
      const res = testFabricParity('1x NVIDIA ConnectX-7 NDR 400Gb/s InfiniBand Adapter', mixedBom);
      assert.equal(res.status, 'DEFICIT');
      // Must report INFINIBAND_HDR (the highest protocol in BOM), NOT Ethernet or RoCE
      assert.match(res.details, /target BOM provides INFINIBAND_HDR/);
    });

    it('4.14 Target BOM with 0 network adapters returns DEFICIT with clear message', () => {
      const res = testFabricParity('1x NVIDIA ConnectX-7 NDR 400Gb/s InfiniBand Adapter', []);
      assert.equal(res.status, 'DEFICIT');
      assert.match(res.details, /Target BOM contains 0 network adapters/);
    });

    it('4.15 Competitor spec without networking specification returns NOT_EVALUATED', () => {
      const res = testFabricParity('2x Intel Xeon Gold 6430, 256GB RAM', [
        { description: 'HPE 10/25Gb 2-port Ethernet Adapter', quantity: 1 }
      ]);
      assert.equal(res.status, 'NOT_EVALUATED');
      assert.match(res.details, /No competitor network fabric specification provided/);
    });

  });

  // =========================================================================
  // 5. HELPER AND SUBSYSTEM DEFENSIVE MINING
  // =========================================================================
  describe('5. Helper Functions & Subsystem Defensive Mining', () => {

    it('5.1 detectFabricProtocol safely handles non-string and falsy inputs', () => {
      const falsyInputs = [null, undefined, '', 0, false, NaN, {}, []];
      for (const input of falsyInputs) {
        assert.equal(detectFabricProtocol(input), 'ETHERNET');
      }
    });

    it('5.2 detectArchitectureChannelWidth handles empty and null inputs safely', () => {
      assert.equal(detectArchitectureChannelWidth(null, null), 8);
      assert.equal(detectArchitectureChannelWidth(undefined, undefined), 8);
      assert.equal(detectArchitectureChannelWidth('', ''), 8);
      assert.equal(detectArchitectureChannelWidth('AMD Genoa 9654', 'DL385_Gen11'), 12);
      assert.equal(detectArchitectureChannelWidth('Intel Cascade Lake 6248', 'DL380_Gen10'), 6);
    });

    it('5.3 audit12PointPhysicalParity produces exactly 12 subsystems', () => {
      const res = audit12PointPhysicalParity(null, [], 'DL380_Gen12');
      assert.equal(res.status, 'NOT_EVALUATED');
      assert.equal(res.auditItems.length, 12);
      const subsystemNames = res.auditItems.map(i => i.subsystem);
      for (const expected of AUDIT_SUBSYSTEMS) {
        assert.ok(subsystemNames.includes(expected), `Missing subsystem: ${expected}`);
      }
    });

  });

});
