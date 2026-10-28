'use strict';
/**
 * tests/chaos/test_m3_fabric_and_numa_stress.js
 *
 * EMPIRICAL ADVERSARIAL CHALLENGER SUITE (Milestone 3 / Challenger M3_1)
 * High-Speed Fabric Matching, Parity Audits & NUMA Interleaving Adversarial Stress
 *
 * Rigorously stress-tests:
 * - scripts/lib/boq/cross_vendor_transformer.js
 *   (detectFabricProtocol, detectArchitectureChannelWidth, parseCompetitorSpecification,
 *    audit12PointPhysicalParity, transformCompetitorQuote, _evaluateNetworkingFabricParity,
 *    _evaluateMemoryTopologyParity, _evaluateGpuParity, _evaluateStorageControllerParity,
 *    _evaluateOpticalTransceiverParity, _evaluatePowerSupplyParity, _evaluateManagementLicenseParity,
 *    _evaluateThermalParity)
 * - scripts/lib/conflict/workload_dna.js
 *   (extractWorkloadDna, validateNumaMemoryTopology)
 *
 * Attack Vectors Tested:
 * 1. High-Speed Fabric Matching:
 *    - InfiniBand NDR (400G), HDR (200G), RoCEv2, Ethernet protocol classification
 *    - Protocol mismatches with identical speeds (400G RoCEv2 vs 400G NDR; 200G RoCEv2 vs 200G HDR)
 *    - Protocol downgrades (HDR 200G vs NDR 400G requirement; Ethernet vs RoCEv2 requirement)
 *    - Protocol upgrade allowance (NDR 400G for HDR requirement; InfiniBand for RoCEv2 requirement)
 *    - Port count deficits with matching protocols (4-port NDR required vs 2-port NDR provided)
 *    - Multi-adapter aggregation (2x 1-port adapters satisfying 2-port requirement; multi-adapter deficit)
 * 2. 12-Point Physical Parity Audits:
 *    - GPU tier mismatches (TRAINING_FLAGSHIP vs ENTERPRISE_INFERENCE vs ENTRY_INFERENCE)
 *    - GPU count deficit, zero GPU, and TDP deficit (700W SXM5 vs 75W PCIe)
 *    - Storage controller cache deficit (8GB vs 4GB vs 2GB vs HBA 0GB)
 *    - Optical transceivers count deficit, zero count, and speed deficit (100G vs 25G)
 *    - Power supply wattage deficit (2000W vs 800W), Titanium vs Platinum efficiency, PSU count deficit
 *    - Remote management tier deficit (Enterprise iDRAC / Intersight vs no iLO Advanced)
 *    - Thermal cooling deficit (Direct Liquid Cooling required vs air cooling heatsink)
 * 3. NUMA Memory Interleaving Topology & Multi-Socket Scaling:
 *    - Multi-socket scaling: 1P, 2P, 4P, 8P systems
 *    - Odd & asymmetric DIMM allocations: 3, 5, 7, 9, 10, 11, 13, 15, 17 DIMMs
 *    - Unsupported/unbalanced symmetric populations on 8-channel (5, 6, 7, 9, 10 DIMMs/CPU)
 *    - 12-channel AMD EPYC Genoa/Bergamo/Turin architecture (24 DIMMs 1DPC; 48 DIMMs 2DPC; 16 DIMMs deficit)
 *    - 6-channel Intel Cascade Lake / Skylake architecture (12 DIMMs 1DPC; 24 DIMMs 2DPC; 16 DIMMs deficit)
 *    - Balanced 1DPC specification enforcement vs lower supported populations
 *    - DIMM blanks non-inflation in memory count
 * 4. Defensive Boundary Mining & Discovered Vulnerability Benchmarks:
 *    - null options TypeError vulnerability in validateNumaMemoryTopology (workload_dna.js:174)
 *    - null items TypeError vulnerability in extractWorkloadDna (workload_dna.js:43)
 *    - null options TypeError vulnerability in transformCompetitorQuote (cross_vendor_transformer.js:859)
 *    - Discrepancy in _evaluateNetworkingFabricParity error details where targetProtocol reports ETHERNET
 *    - Safe null-handling for audit12PointPhysicalParity and parseCompetitorSpecification
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  AUDIT_SUBSYSTEMS,
  GPU_TIERS,
  detectFabricProtocol,
  detectArchitectureChannelWidth,
  parseCompetitorSpecification,
  audit12PointPhysicalParity,
  transformCompetitorQuote,
  _evaluateComputeProcessorsParity,
  _evaluateMemoryTopologyParity,
  _evaluateGpuParity,
  _evaluateThermalParity,
  _evaluateStorageControllerParity,
  _evaluateOpticalTransceiverParity,
  _evaluateDriveParity,
  _evaluateBootStorageParity,
  _evaluatePcieRisersParity,
  _evaluateNetworkingFabricParity,
  _evaluatePowerSupplyParity,
  _evaluateManagementLicenseParity
} = require('../../scripts/lib/boq/cross_vendor_transformer.js');

const {
  extractWorkloadDna,
  validateNumaMemoryTopology
} = require('../../scripts/lib/conflict/workload_dna.js');

describe('Milestone 3 Fabric & NUMA Adversarial Stress Suite (Challenger M3_1)', () => {

  // ─────────────────────────────────────────────────────────────────────────────
  // ATTACK VECTOR 1: High-Speed Fabric Matching & Protocol Parity Stress
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Attack Vector 1: High-Speed Fabric Matching & Protocol Parity Stress', () => {

    it('1.1 Classifies InfiniBand NDR (400Gb/s) across diverse vendor keyword variants', () => {
      const ndrVariants = [
        'NVIDIA ConnectX-7 NDR 400Gb/s InfiniBand OSFP Single-Port Adapter',
        'HPE InfiniBand NDR/Ethernet 400Gb 1-port OSFP PCIe5 x16 MCX75310AAS-NEAT Adapter',
        'Mellanox MCX755106AS-NEAT ConnectX-7 NDR InfiniBand 2-port QSFP112 PCIe Adapter',
        'Dell Mellanox ConnectX-7 NDR 400GbE / 400Gb IB HCA Subnet Manager'
      ];
      for (const text of ndrVariants) {
        assert.equal(detectFabricProtocol(text), 'INFINIBAND_NDR', `Failed to detect NDR for: ${text}`);
      }
    });

    it('1.2 Classifies InfiniBand HDR (200Gb/s) across diverse vendor keyword variants', () => {
      const hdrVariants = [
        'Mellanox ConnectX-6 HDR 200Gb/s InfiniBand QSFP56 Dual-Port Adapter',
        'HPE InfiniBand HDR/Ethernet 200Gb 1-port QSFP56 PCIe3 x16 MCX653105A-HDAT Adapter',
        'Mellanox ConnectX-6 HDR100 100Gb/s InfiniBand Adapter',
        'Dell 200Gb/s HDR InfiniBand HCA'
      ];
      for (const text of hdrVariants) {
        assert.equal(detectFabricProtocol(text), 'INFINIBAND_HDR', `Failed to detect HDR for: ${text}`);
      }
    });

    it('1.3 Classifies RoCEv2 (RDMA over Converged Ethernet) accurately', () => {
      const roceVariants = [
        'Broadcom BCM57508 100GbE 2-port RoCEv2 OCP3 Adapter',
        'Mellanox MCX623106AS-CDAT Ethernet 100Gb 2-port QSFP56 Adapter with RoCE',
        'Broadcom Thor2 BCM57608 200G 2-port RDMA over Converged Ethernet Adapter'
      ];
      for (const text of roceVariants) {
        assert.equal(detectFabricProtocol(text), 'ROCE_V2', `Failed to detect RoCEv2 for: ${text}`);
      }
    });

    it('1.4 Classifies Standard Ethernet (no RoCE / no InfiniBand)', () => {
      const ethVariants = [
        'Intel I350 1GbE 4-port Base-T Adapter',
        'Broadcom BCM5719 1GbE 4-port Base-T OCP3 Adapter',
        'Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 Adapter for HPE',
        'Intel E810-XXVDA2 10/25GbE 2-port SFP28 PCIe Adapter'
      ];
      for (const text of ethVariants) {
        assert.equal(detectFabricProtocol(text), 'ETHERNET', `Failed to detect ETHERNET for: ${text}`);
      }
    });

    it('1.5 Protocol Mismatch at Same Speed: 400G RoCEv2 rejected when 400G NDR is required', () => {
      const spec = parseCompetitorSpecification('1x NVIDIA ConnectX-7 NDR 400Gb/s InfiniBand OSFP Adapter');
      assert.equal(spec.networking.fabricProtocol, 'INFINIBAND_NDR');
      assert.equal(spec.networking.speedGb, 400);

      const roceBom = [
        { sku: 'P58123-B21', quantity: 1, description: 'HPE 400Gb 1-port QSFP112 RoCEv2 Adapter' }
      ];
      const parity = _evaluateNetworkingFabricParity(spec, roceBom);
      assert.equal(parity.status, 'DEFICIT', 'Must reject RoCEv2 when NDR is required');
      assert.match(parity.details, /protocol mismatch/i);
    });

    it('1.6 Protocol Mismatch at Same Speed: 200G RoCEv2 rejected when 200G HDR is required', () => {
      const spec = parseCompetitorSpecification('1x Mellanox ConnectX-6 HDR 200Gb/s InfiniBand QSFP56 Adapter');
      assert.equal(spec.networking.fabricProtocol, 'INFINIBAND_HDR');
      assert.equal(spec.networking.speedGb, 200);

      const roceBom = [
        { sku: 'P58124-B21', quantity: 1, description: 'Broadcom Thor2 200Gb 1-port QSFP56 RoCEv2 Adapter' }
      ];
      const parity = _evaluateNetworkingFabricParity(spec, roceBom);
      assert.equal(parity.status, 'DEFICIT', 'Must reject RoCEv2 when HDR is required');
      assert.match(parity.details, /protocol mismatch/i);
    });

    it('1.7 Protocol Downgrade: HDR 200G rejected when NDR 400G is required', () => {
      const spec = parseCompetitorSpecification('1x NVIDIA ConnectX-7 NDR 400Gb/s InfiniBand 1-port Adapter');
      const hdrBom = [
        { sku: 'P45640-B21', quantity: 1, description: 'HPE InfiniBand HDR 200Gb 1-port QSFP56 Adapter' }
      ];
      const parity = _evaluateNetworkingFabricParity(spec, hdrBom);
      assert.equal(parity.status, 'DEFICIT', 'Must reject HDR when NDR is required');
    });

    it('1.8 Protocol Upgrade: NDR 400G accepted with EXCEEDS when HDR 200G is required', () => {
      const spec = parseCompetitorSpecification('1x Mellanox ConnectX-6 HDR 200Gb/s InfiniBand 1-port Adapter');
      const ndrBom = [
        { sku: 'P45641-H23', quantity: 1, description: 'HPE InfiniBand NDR/Ethernet 400Gb 1-port OSFP Adapter' }
      ];
      const parity = _evaluateNetworkingFabricParity(spec, ndrBom);
      assert.equal(parity.status, 'EXCEEDS', 'NDR must satisfy HDR with EXCEEDS status');
      assert.match(parity.details, /INFINIBAND_NDR/);
    });

    it('1.9 Protocol Parity: InfiniBand accepted when RoCEv2 is required (RoCE capability superset)', () => {
      const spec = parseCompetitorSpecification('1x Broadcom BCM57508 100GbE 2-port RoCEv2 Adapter');
      const ibBom = [
        { sku: 'P45640-B21', quantity: 1, description: 'HPE InfiniBand HDR 200Gb 2-port QSFP56 Adapter' }
      ];
      const parity = _evaluateNetworkingFabricParity(spec, ibBom);
      assert.ok(['MATCHED', 'EXCEEDS'].includes(parity.status), 'InfiniBand must satisfy RoCE requirement');
    });

    it('1.10 Port Count Deficit: 4-port NDR required vs 2-port NDR provided', () => {
      const spec = parseCompetitorSpecification('2x NVIDIA ConnectX-7 NDR 400Gb/s InfiniBand 2-port Adapter');
      assert.equal(spec.networking.totalPorts, 4);

      const targetBom = [
        { sku: 'P45641-H23', quantity: 1, description: 'HPE InfiniBand NDR/Ethernet 400Gb 2-port OSFP Adapter' }
      ];
      const parity = _evaluateNetworkingFabricParity(spec, targetBom);
      assert.equal(parity.status, 'DEFICIT');
      assert.match(parity.details, /ports \(2\) are fewer than competitor \(4\)/i);
    });

    it('1.11 Multi-Adapter Aggregation: 2x 1-port NDR adapters satisfy 2-port NDR requirement', () => {
      const spec = parseCompetitorSpecification('1x NVIDIA ConnectX-7 NDR 400Gb/s InfiniBand 2-port OSFP Adapter');
      assert.equal(spec.networking.totalPorts, 2);

      const aggregatedBom = [
        { sku: 'P45641-H23', quantity: 2, description: 'HPE InfiniBand NDR 400Gb 1-port OSFP Adapter' }
      ];
      const parity = _evaluateNetworkingFabricParity(spec, aggregatedBom);
      assert.equal(parity.status, 'MATCHED');
      assert.match(parity.details, /2 ports.*400Gb/);
    });

    it('1.12 Multi-Adapter Port Deficit: 2x 1-port adapters fail a 4-port requirement', () => {
      const spec = parseCompetitorSpecification('1x 100GbE 4-port QSFP28 Adapter');
      assert.equal(spec.networking.totalPorts, 4);

      const deficitBom = [
        { sku: 'P26262-B21', quantity: 2, description: 'Broadcom 100GbE 1-port QSFP28 Adapter' }
      ];
      const parity = _evaluateNetworkingFabricParity(spec, deficitBom);
      assert.equal(parity.status, 'DEFICIT');
      assert.match(parity.details, /ports \(2\) are fewer than competitor \(4\)/i);
    });

  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ATTACK VECTOR 2: Comprehensive 12-Point Physical Parity Audits
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Attack Vector 2: Comprehensive 12-Point Physical Parity Audits', () => {

    it('2.1 GPU Tier Mismatch: TRAINING_FLAGSHIP (H100) vs ENTERPRISE_INFERENCE (L40S) rejected with DEFICIT', () => {
      const spec = parseCompetitorSpecification('2x NVIDIA H100 80GB SXM5 GPU');
      const bom = [{ sku: 'P58123-B21', quantity: 2, description: 'NVIDIA L40S 48GB PCIe Accelerator' }];
      const res = _evaluateGpuParity(spec, bom);
      assert.equal(res.status, 'DEFICIT');
      assert.match(res.details, /does not meet competitor compute tier/i);
    });

    it('2.2 GPU Tier Mismatch: TRAINING_FLAGSHIP (H100) vs ENTRY_INFERENCE (L4) rejected with DEFICIT', () => {
      const spec = parseCompetitorSpecification('2x NVIDIA H100 80GB SXM5 GPU');
      const bom = [{ sku: 'P53401-B21', quantity: 2, description: 'NVIDIA L4 24GB PCIe Accelerator' }];
      const res = _evaluateGpuParity(spec, bom);
      assert.equal(res.status, 'DEFICIT');
      assert.match(res.details, /does not meet competitor compute tier/i);
    });

    it('2.3 GPU Tier Mismatch: ENTERPRISE_INFERENCE (L40S) vs ENTRY_INFERENCE (T4) rejected with DEFICIT', () => {
      const spec = parseCompetitorSpecification('2x NVIDIA L40S 48GB PCIe Accelerator');
      const bom = [{ sku: 'R0W29C', quantity: 2, description: 'NVIDIA T4 16GB PCIe Accelerator' }];
      const res = _evaluateGpuParity(spec, bom);
      assert.equal(res.status, 'DEFICIT');
      assert.match(res.details, /does not meet competitor compute tier/i);
    });

    it('2.4 GPU Tier Match: H100 matched by H200 or A100 (TRAINING_FLAGSHIP)', () => {
      const spec = parseCompetitorSpecification('2x NVIDIA H100 80GB GPU');
      const bomH200 = [{ sku: 'P74123-B21', quantity: 2, description: 'NVIDIA H200 141GB SXM5 GPU' }];
      assert.equal(_evaluateGpuParity(spec, bomH200).status, 'MATCHED');

      const bomA100 = [{ sku: 'R9S37A', quantity: 2, description: 'NVIDIA A100 80GB PCIe Accelerator' }];
      assert.equal(_evaluateGpuParity(spec, bomA100).status, 'MATCHED');
    });

    it('2.5 GPU Count Deficit: 4x H100 required vs 2x H100 provided', () => {
      const spec = parseCompetitorSpecification('4x NVIDIA H100 80GB GPU');
      const bom = [{ sku: 'P64821-B21', quantity: 2, description: 'NVIDIA H100 80GB PCIe Accelerator' }];
      const res = _evaluateGpuParity(spec, bom);
      assert.equal(res.status, 'DEFICIT');
      assert.match(res.details, /Deficit: 2/);
    });

    it('2.6 GPU Zero Count: 2x H100 required vs 0 GPUs in target BOM', () => {
      const spec = parseCompetitorSpecification('2x NVIDIA H100 80GB GPU');
      const res = _evaluateGpuParity(spec, []);
      assert.equal(res.status, 'DEFICIT');
      assert.match(res.details, /contains 0 GPU accelerators/i);
    });

    it('2.7 GPU TDP Deficit: 700W SXM5 required vs 75W PCIe provided', () => {
      const spec = parseCompetitorSpecification('1x NVIDIA H100 80GB 700W SXM5 GPU');
      const lowPowerBom = [{ sku: 'P64821-B21', quantity: 1, description: 'NVIDIA H100 80GB 75W PCIe Accelerator' }];
      const res = _evaluateGpuParity(spec, lowPowerBom);
      assert.equal(res.status, 'DEFICIT');
      assert.match(res.details, /power envelope.*is significantly lower/i);
    });

    it('2.8 Storage Controller Cache Deficit: 8GB cache required vs 4GB provided', () => {
      const spec = parseCompetitorSpecification('Dell PERC H755 with 8GB Cache RAID Controller');
      const bom4Gb = [{ sku: 'P48824-B21', quantity: 1, description: 'HPE Smart Array MR416i-p 4GB Cache Controller' }];
      const res = _evaluateStorageControllerParity(spec, bom4Gb);
      assert.equal(res.status, 'DEFICIT');
      assert.match(res.details, /controller cache \(4GB\) is lower than competitor requirement \(8GB\)/i);
    });

    it('2.9 Storage Controller Cache Deficit: 8GB cache required vs 0GB (HBA) provided', () => {
      const spec = parseCompetitorSpecification('Dell PERC H755 with 8GB Cache RAID Controller');
      const bomHba = [{ sku: 'P48826-B21', quantity: 1, description: 'HPE Smart Array H240 12G SAS HBA Controller' }];
      const res = _evaluateStorageControllerParity(spec, bomHba);
      assert.equal(res.status, 'DEFICIT');
      assert.match(res.details, /controller cache \(0GB\) is lower than competitor requirement \(8GB\)/i);
    });

    it('2.10 Optical Transceivers Zero Count: 4x transceivers required vs 0 provided', () => {
      const spec = parseCompetitorSpecification('4x 25G SFP28 SR Optical Transceiver');
      const res = _evaluateOpticalTransceiverParity(spec, []);
      assert.equal(res.status, 'DEFICIT');
      assert.match(res.details, /lacks optical transceivers/i);
    });

    it('2.11 Optical Transceivers Count Deficit: 4x 100G required vs 2x 100G provided', () => {
      const spec = parseCompetitorSpecification('4x 100G QSFP28 SR Optical Transceiver');
      const bom = [{ sku: '845398-B21', quantity: 2, description: 'HPE 100Gb QSFP28 SR Optical Transceiver' }];
      const res = _evaluateOpticalTransceiverParity(spec, bom);
      assert.equal(res.status, 'DEFICIT');
      assert.match(res.details, /Deficit: 2/);
    });

    it('2.12 Optical Transceivers Speed Deficit: 4x 100G required vs 4x 25G provided', () => {
      const spec = parseCompetitorSpecification('4x 100G QSFP28 SR Optical Transceiver');
      const bom = [{ sku: '845398-B21', quantity: 4, description: 'HPE 25Gb SFP28 SR Optical Transceiver' }];
      const res = _evaluateOpticalTransceiverParity(spec, bom);
      assert.equal(res.status, 'DEFICIT');
      assert.match(res.details, /transceiver speed \(25G\) is lower than competitor requirement \(100G\)/i);
    });

    it('2.13 Power Supply Wattage Deficit: 2000W required vs 800W provided', () => {
      const spec = parseCompetitorSpecification('2x 2000W Platinum Power Supply');
      const bom = [{ sku: 'P48801-B21', quantity: 2, description: 'HPE 800W Flex Slot Platinum Power Supply Kit' }];
      const res = _evaluatePowerSupplyParity(spec, bom);
      assert.equal(res.status, 'DEFICIT');
      assert.match(res.details, /wattage \(800W\) is lower than competitor requirement \(2000W\)/i);
    });

    it('2.14 Power Supply Efficiency Deficit: Titanium required vs Platinum provided', () => {
      const spec = parseCompetitorSpecification('2x 1600W Titanium Power Supply');
      const bom = [{ sku: 'P48802-B21', quantity: 2, description: 'HPE 1600W Flex Slot Platinum Power Supply Kit' }];
      const res = _evaluatePowerSupplyParity(spec, bom);
      assert.equal(res.status, 'DEFICIT');
      assert.match(res.details, /efficiency \(Platinum\) does not satisfy required Titanium/i);
    });

    it('2.15 Management License Parity: Enterprise iDRAC / Intersight required vs no iLO Advanced', () => {
      const spec = parseCompetitorSpecification('Dell iDRAC9 Enterprise Remote Management');
      const bomWithoutLicense = [{ sku: 'P73282-B21', quantity: 1, description: 'HPE ProLiant DL380 Gen12 8SFF NC CTO Server' }];
      const res = _evaluateManagementLicenseParity(spec, bomWithoutLicense);
      assert.equal(res.status, 'DEFICIT');
      assert.match(res.details, /lacks explicit iLO Advanced/i);
    });

    it('2.16 Thermal Environment Parity: Direct Liquid Cooling required vs Air cooling heatsink', () => {
      const spec = parseCompetitorSpecification('Direct Liquid Cooling with 350W Processors');
      const bomAirOnly = [
        { sku: 'P48818-B21', quantity: 2, description: 'HPE ProLiant DL380 Gen12 Standard Heatsink Kit' },
        { sku: 'P48820-B21', quantity: 1, description: 'HPE ProLiant DL380 Gen12 High Performance Fan Kit' }
      ];
      const res = _evaluateThermalParity(spec, bomAirOnly);
      assert.equal(res.status, 'DEFICIT');
      assert.match(res.details, /lacks Direct Liquid Cooling \(DLC\) kit/i);
    });

  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ATTACK VECTOR 3: NUMA Memory Interleaving Topology & Multi-Socket Stress
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Attack Vector 3: NUMA Memory Interleaving Topology & Multi-Socket Stress', () => {

    it('3.1 1P System (8-ch): 8 DIMMs (1DPC Balanced Optimal) -> MATCHED', () => {
      const spec = parseCompetitorSpecification('1x Intel Xeon 8480+; 256GB RAM');
      const bom = [
        { description: 'Intel Xeon Platinum 8480+ Processor', quantity: 1 },
        { description: 'HPE 32GB DDR5 Smart Memory', quantity: 8 }
      ];
      const res = _evaluateMemoryTopologyParity(spec, bom);
      assert.equal(res.status, 'MATCHED');
      assert.match(res.details, /1DPC Optimal/i);
    });

    it('3.2 1P System (8-ch): 16 DIMMs (2DPC Balanced Max Capacity) -> MATCHED', () => {
      const spec = parseCompetitorSpecification('1x Intel Xeon 8480+; 512GB RAM');
      const bom = [
        { description: 'Intel Xeon Platinum 8480+ Processor', quantity: 1 },
        { description: 'HPE 32GB DDR5 Smart Memory', quantity: 16 }
      ];
      const res = _evaluateMemoryTopologyParity(spec, bom);
      assert.equal(res.status, 'MATCHED');
      assert.match(res.details, /2DPC Maximum Capacity/i);
    });

    it('3.3 1P System (8-ch): 5, 7, 10, 12 DIMMs rejected with DEFICIT (Unbalanced interleaving)', () => {
      const spec = parseCompetitorSpecification('1x Intel Xeon 8480+; 256GB RAM');
      const invalidCounts = [5, 7, 10, 12];
      for (const count of invalidCounts) {
        const bom = [
          { description: 'Intel Xeon Platinum 8480+ Processor', quantity: 1 },
          { description: 'HPE 64GB DDR5 Smart Memory', quantity: count }
        ];
        const res = _evaluateMemoryTopologyParity(spec, bom);
        assert.equal(res.status, 'DEFICIT', `Expected 1P with ${count} DIMMs to fail`);
        assert.match(res.details, /Unbalanced memory channel interleaving/i);
      }
    });

    it('3.4 2P System (8-ch): 16 DIMMs (1DPC Balanced Optimal) -> MATCHED', () => {
      const spec = parseCompetitorSpecification('2x Intel Xeon 8480+; 512GB RAM');
      const bom = [
        { description: 'Intel Xeon Platinum 8480+ Processor', quantity: 2 },
        { description: 'HPE 32GB DDR5 Smart Memory', quantity: 16 }
      ];
      const res = _evaluateMemoryTopologyParity(spec, bom);
      assert.equal(res.status, 'MATCHED');
      assert.match(res.details, /1DPC Optimal/i);
    });

    it('3.5 2P System (8-ch): 32 DIMMs (2DPC Balanced Max Capacity) -> MATCHED', () => {
      const spec = parseCompetitorSpecification('2x Intel Xeon 8480+; 1024GB RAM');
      const bom = [
        { description: 'Intel Xeon Platinum 8480+ Processor', quantity: 2 },
        { description: 'HPE 32GB DDR5 Smart Memory', quantity: 32 }
      ];
      const res = _evaluateMemoryTopologyParity(spec, bom);
      assert.equal(res.status, 'MATCHED');
      assert.match(res.details, /2DPC Maximum Capacity/i);
    });

    it('3.6 2P System (8-ch): Odd/Asymmetric DIMMs (3, 5, 7, 9, 11, 13, 15, 17) rejected with DEFICIT', () => {
      const spec = parseCompetitorSpecification('2x Intel Xeon 8480+; 64GB RAM');
      const oddCounts = [3, 5, 7, 9, 11, 13, 15, 17];
      for (const count of oddCounts) {
        const bom = [
          { description: 'Intel Xeon Platinum 8480+ Processor', quantity: 2 },
          { description: 'HPE 32GB DDR5 Smart Memory', quantity: count }
        ];
        const res = _evaluateMemoryTopologyParity(spec, bom);
        assert.equal(res.status, 'DEFICIT', `Expected 2P with ${count} odd DIMMs to fail`);
        assert.match(res.details, /asymmetric across 2 sockets/i);
      }
    });

    it('3.7 2P System (8-ch): Even but Unbalanced DIMMs (10, 12, 14, 18, 20) rejected with DEFICIT', () => {
      const spec = parseCompetitorSpecification('2x Intel Xeon 8480+; 256GB RAM');
      const unbalancedCounts = [10, 12, 14, 18, 20];
      for (const count of unbalancedCounts) {
        const bom = [
          { description: 'Intel Xeon Platinum 8480+ Processor', quantity: 2 },
          { description: 'HPE 64GB DDR5 Smart Memory', quantity: count }
        ];
        const res = _evaluateMemoryTopologyParity(spec, bom);
        assert.equal(res.status, 'DEFICIT', `Expected 2P with ${count} DIMMs (${count / 2}/CPU) to fail on 8-channel`);
        assert.match(res.details, /Unbalanced memory channel interleaving/i);
      }
    });

    it('3.8 4P System (8-ch): 32 DIMMs (1DPC) and 64 DIMMs (2DPC) -> MATCHED', () => {
      const spec = parseCompetitorSpecification('4x Intel Xeon 8480+; 1024GB RAM');
      const bom32 = [
        { description: 'Intel Xeon Platinum 8480+ Processor', quantity: 4 },
        { description: 'HPE 32GB DDR5 Smart Memory', quantity: 32 }
      ];
      assert.equal(_evaluateMemoryTopologyParity(spec, bom32).status, 'MATCHED');

      const bom64 = [
        { description: 'Intel Xeon Platinum 8480+ Processor', quantity: 4 },
        { description: 'HPE 32GB DDR5 Smart Memory', quantity: 64 }
      ];
      assert.equal(_evaluateMemoryTopologyParity(spec, bom64).status, 'EXCEEDS');
    });

    it('3.9 4P System (8-ch): Asymmetric DIMMs (10, 30 DIMMs across 4 sockets) rejected with DEFICIT', () => {
      const spec = parseCompetitorSpecification('4x Intel Xeon 8480+; 256GB RAM');
      const asymmCounts = [10, 30];
      for (const count of asymmCounts) {
        const bom = [
          { description: 'Intel Xeon Platinum 8480+ Processor', quantity: 4 },
          { description: 'HPE 64GB DDR5 Smart Memory', quantity: count }
        ];
        const res = _evaluateMemoryTopologyParity(spec, bom);
        assert.equal(res.status, 'DEFICIT');
        assert.match(res.details, /asymmetric across 4 sockets/i);
      }
    });

    it('3.10 8P System (8-ch): 64 DIMMs (1DPC) -> MATCHED; 70 DIMMs (Asymmetric) rejected with DEFICIT', () => {
      const spec = parseCompetitorSpecification('8x Intel Xeon 8480+; 2048GB RAM');
      const bom64 = [
        { description: 'Intel Xeon Platinum 8480+ Processor', quantity: 8 },
        { description: 'HPE 32GB DDR5 Smart Memory', quantity: 64 }
      ];
      assert.equal(_evaluateMemoryTopologyParity(spec, bom64).status, 'MATCHED');

      const bom70 = [
        { description: 'Intel Xeon Platinum 8480+ Processor', quantity: 8 },
        { description: 'HPE 32GB DDR5 Smart Memory', quantity: 70 }
      ];
      const resAsymm = _evaluateMemoryTopologyParity(spec, bom70);
      assert.equal(resAsymm.status, 'DEFICIT');
      assert.match(resAsymm.details, /asymmetric across 8 sockets/i);
    });

    it('3.11 12-Channel Architecture (AMD EPYC Genoa/Bergamo/Turin): 24 DIMMs on 2P (1DPC Optimal) -> MATCHED', () => {
      const spec = parseCompetitorSpecification('2x AMD EPYC 9654 96-core Genoa; 1536GB RAM', 'DELL');
      assert.equal(spec.memory.channelWidth, 12);

      const bom24 = [
        { sku: 'P53696-B21', quantity: 2, description: 'AMD EPYC 9654 2.4GHz 96-core Processor' },
        { sku: 'P43328-B21', quantity: 24, description: 'HPE 64GB DDR5 Smart Memory' }
      ];
      const res = _evaluateMemoryTopologyParity(spec, bom24, 'DL385_Gen11');
      assert.equal(res.status, 'MATCHED');
      assert.match(res.details, /12-channel.*1DPC Optimal/i);
    });

    it('3.12 12-Channel Architecture: 48 DIMMs on 2P (2DPC Max Capacity) -> MATCHED', () => {
      const spec = parseCompetitorSpecification('2x AMD EPYC 9654 96-core Genoa; 3072GB RAM', 'DELL');
      const bom48 = [
        { sku: 'P53696-B21', quantity: 2, description: 'AMD EPYC 9654 2.4GHz 96-core Processor' },
        { sku: 'P43328-B21', quantity: 48, description: 'HPE 64GB DDR5 Smart Memory' }
      ];
      const res = _evaluateMemoryTopologyParity(spec, bom48, 'DL385_Gen11');
      assert.equal(res.status, 'MATCHED');
      assert.match(res.details, /12-channel.*2DPC Maximum Capacity/i);
    });

    it('3.13 12-Channel Architecture: 16 DIMMs on 2P (8/socket) rejected with DEFICIT', () => {
      const spec = parseCompetitorSpecification('2x AMD EPYC 9654 96-core Genoa; 1024GB RAM', 'DELL');
      const bom16 = [
        { sku: 'P53696-B21', quantity: 2, description: 'AMD EPYC 9654 2.4GHz 96-core Processor' },
        { sku: 'P43328-B21', quantity: 16, description: 'HPE 64GB DDR5 Smart Memory' }
      ];
      const res = _evaluateMemoryTopologyParity(spec, bom16, 'DL385_Gen11');
      assert.equal(res.status, 'DEFICIT');
      assert.match(res.details, /Unbalanced memory channel interleaving: 8 DIMMs per CPU on 12-channel/i);
    });

    it('3.14 6-Channel Architecture (Intel Cascade Lake / Skylake): 12 DIMMs on 2P (1DPC Optimal) -> MATCHED', () => {
      const spec = parseCompetitorSpecification('2x Intel Xeon Gold 6248R 24-core Cascade Lake; 384GB RAM', 'DELL');
      assert.equal(spec.memory.channelWidth, 6);

      const bom12 = [
        { description: 'Intel Xeon Gold 6248R 24-core Processor', quantity: 2 },
        { description: 'HPE 32GB DDR4-2933 Smart Memory', quantity: 12 }
      ];
      const res = _evaluateMemoryTopologyParity(spec, bom12, 'DL380_Gen10');
      assert.equal(res.status, 'MATCHED');
      assert.match(res.details, /6-channel.*1DPC Optimal/i);
    });

    it('3.15 6-Channel Architecture: 24 DIMMs on 2P (2DPC Max Capacity) -> MATCHED', () => {
      const spec = parseCompetitorSpecification('2x Intel Xeon Gold 6248R Cascade Lake; 768GB RAM', 'DELL');
      const bom24 = [
        { description: 'Intel Xeon Gold 6248R 24-core Processor', quantity: 2 },
        { description: 'HPE 32GB DDR4-2933 Smart Memory', quantity: 24 }
      ];
      const res = _evaluateMemoryTopologyParity(spec, bom24, 'DL380_Gen10');
      assert.equal(res.status, 'MATCHED');
      assert.match(res.details, /6-channel.*2DPC Maximum Capacity/i);
    });

    it('3.16 6-Channel Architecture: 16 DIMMs on 2P (8/socket) rejected with DEFICIT', () => {
      const spec = parseCompetitorSpecification('2x Intel Xeon Gold 6248R Cascade Lake; 512GB RAM', 'DELL');
      const bom16 = [
        { description: 'Intel Xeon Gold 6248R 24-core Processor', quantity: 2 },
        { description: 'HPE 32GB DDR4-2933 Smart Memory', quantity: 16 }
      ];
      const res = _evaluateMemoryTopologyParity(spec, bom16, 'DL380_Gen10');
      assert.equal(res.status, 'DEFICIT');
      assert.match(res.details, /Unbalanced memory channel interleaving: 8 DIMMs per CPU on 6-channel/i);
    });

    it('3.17 Balanced 1DPC Specification Enforcement: Competitor requires 1DPC; target provides 2 DIMMs/socket -> DEFICIT', () => {
      const spec = parseCompetitorSpecification('2x Intel Xeon; 16x 32GB RDIMM');
      assert.equal(spec.memory.isBalanced1Dpc, true);

      // Target satisfies capacity (512GB) and supported symmetric population (2 DIMMs/socket), but violates 1DPC requirement
      const bom4x128 = [
        { description: 'Intel Xeon Platinum 8480+ Processor', quantity: 2 },
        { description: 'HPE 128GB DDR5 Smart Memory', quantity: 4 }
      ];
      const res = _evaluateMemoryTopologyParity(spec, bom4x128);
      assert.equal(res.status, 'DEFICIT');
      assert.match(res.details, /Competitor specified balanced 1DPC memory \(8 DIMMs\/socket\), but target provides 2 DIMMs\/socket/i);
    });

    it('3.18 DIMM Blanks Non-Inflation: Memory blanks do not corrupt DIMM count calculation', () => {
      const spec = parseCompetitorSpecification('2x Intel Xeon; 16x 32GB RDIMM');
      const bomWithBlanks = [
        { description: 'Intel Xeon Platinum 8480+ Processor', quantity: 2 },
        { description: 'HPE 32GB DDR5 Smart Memory', quantity: 16 },
        { description: 'HPE DDR5 DIMM Blank Kit', quantity: 16 }
      ];
      const res = _evaluateMemoryTopologyParity(spec, bomWithBlanks);
      assert.equal(res.status, 'MATCHED');
      assert.match(res.details, /16x DIMMs/i);
    });

  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ATTACK VECTOR 4: Defensive Boundaries, Fuzzing & Discovered Vulnerability Benchmarks
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Attack Vector 4: Defensive Boundaries, Fuzzing & Discovered Vulnerability Benchmarks', () => {

    it('4.1 REMEDIATED: validateNumaMemoryTopology with null options handles defaults safely without TypeError', () => {
      assert.doesNotThrow(() => {
        const res = validateNumaMemoryTopology([], null);
        assert.equal(typeof res, 'object');
        assert.equal(res.isValid, false);
        assert.equal(res.channelWidth, 8);
      });
    });

    it('4.2 REMEDIATED: extractWorkloadDna with null items returns default DNA safely without TypeError', () => {
      assert.doesNotThrow(() => {
        const dna = extractWorkloadDna(null);
        assert.equal(typeof dna, 'object');
        assert.equal(dna.primaryWorkload, 'BALANCED_ENTERPRISE');
      });
    });

    it('4.3 REMEDIATED: transformCompetitorQuote with null options defaults safely without TypeError', () => {
      assert.doesNotThrow(() => {
        const res = transformCompetitorQuote('2x Xeon', 'DELL', 'DL380_Gen11', null);
        assert.equal(typeof res, 'object');
        assert.equal(res.nodeMultiplier, 1);
      });
    });

    it('4.4 REMEDIATED: _evaluateNetworkingFabricParity details reports highest detected protocol (ROCE_V2) on mismatch', () => {
      const specNdr = parseCompetitorSpecification('1x NVIDIA ConnectX-7 NDR 400Gb/s InfiniBand OSFP Adapter');
      const roceBom = [{ description: 'HPE 400Gb 1-port QSFP112 RoCEv2 Adapter', quantity: 1 }];
      const res = _evaluateNetworkingFabricParity(specNdr, roceBom);

      // The status correctly rejects as DEFICIT:
      assert.equal(res.status, 'DEFICIT');
      // And the error string accurately reports that target BOM provides ROCE_V2:
      assert.match(res.details, /target BOM provides ROCE_V2/);
    });

    it('4.5 Robustness: audit12PointPhysicalParity with null competitor spec and empty BOM does not crash', () => {
      const res = audit12PointPhysicalParity(null, [], 'DL380_Gen12');
      assert.equal(res.status, 'NOT_EVALUATED');
      assert.equal(res.auditItems.length, 12);
      assert.equal(res.totalSubsystemsAudited, 0);
    });

    it('4.6 Robustness: parseCompetitorSpecification with null/empty input does not crash', () => {
      const resNull = parseCompetitorSpecification(null);
      assert.ok(typeof resNull === 'object');
      assert.equal(resNull.compute.cpuCount, null);

      const resEmpty = parseCompetitorSpecification('');
      assert.ok(typeof resEmpty === 'object');
      assert.equal(resEmpty.memory.totalMemoryGb, null);
    });

  });

});
