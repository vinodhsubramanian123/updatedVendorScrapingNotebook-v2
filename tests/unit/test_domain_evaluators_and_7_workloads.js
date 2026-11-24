'use strict';

/**
 * tests/unit/test_domain_evaluators_and_7_workloads.js
 *
 * Phase 3B Unit + Negative-Control Verification Suite:
 * 1. All 7 Enterprise Workload Sizing Profiles (VMware VCF, SAP HANA, AI/LLM, MS SQL OLTP, VDI, Big Data/Kafka, HPC)
 * 2. Alletra MP B10000 (B10100 Switchless vs B10200 Switched) & X10000 Domain Evaluator (INV-265..268)
 * 3. Synergy 12000 Composite Evaluator (Bays, ICM Pairing, Mezz-Fabric, FLM HA, 6x PSU, Per-Icon Support + Boundary Controls)
 * 4. MSL3040 Tape Promotion & Aspect Registry Wiring (DOMAIN_CAPABILITY_MATRIX + Unprofiled Guard)
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  SUPPORTED_PILOT_WORKLOADS,
  WORKLOAD_SIZING_PROFILES,
  PROVENANCE_VALUES,
  getWorkloadReferenceProfile,
  evaluateWorkloadSizingPilot,
  evaluateWorkloadSizingWithProfiles
} = require('../../scripts/lib/conflict/sizing/workload_demand.js');

const {
  isAlletraMpItems,
  evaluateAlletraMp
} = require('../../scripts/lib/boq/alletra_mp_evaluator.js');

const {
  isCompleteSynergyComposite,
  evaluateSynergyComposite,
  validateOcaContainerDivisibility
} = require('../../scripts/lib/boq/synergy_composite_evaluator.js');

const {
  DOMAIN_CAPABILITY_MATRIX,
  getRegisteredAspectsForDomain,
  evaluateDomainAspects
} = require('../../scripts/lib/aspects/aspect_registry.js');

const { evaluatePhysicalMath } = require('../../scripts/lib/boq/boq_evaluator.js');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: 7 Enterprise Workload Sizing Profiles
// ═══════════════════════════════════════════════════════════════════════════

test('Phase 3B [1/4]: All 7 workload profiles registered; pilot guard preserved; unknown families still refuse extrapolation', () => {
  const expectedFamilies = [
    'VMWARE_VCF',
    'SAP_HANA',
    'AI_INFERENCE_TRAINING',
    'MICROSOFT_SQL_OLTP',
    'VDI_ENTERPRISE',
    'BIG_DATA_KAFKA',
    'HPC_COMPUTE'
  ];
  assert.deepEqual(Object.keys(WORKLOAD_SIZING_PROFILES), expectedFamilies);
  assert.equal(SUPPORTED_PILOT_WORKLOADS.has('VMWARE_VCF'), true);
  assert.equal(SUPPORTED_PILOT_WORKLOADS.has('SAP_HANA'), false);

  for (const fam of expectedFamilies) {
    const prof = getWorkloadReferenceProfile(fam);
    assert.ok(prof, `Profile must exist for ${fam}`);
    assert.ok(prof.referenceArchitecture?.citation, `${fam} must cite an HPE Reference Architecture`);
  }
  assert.equal(getWorkloadReferenceProfile('UNKNOWN'), null);
  assert.equal(getWorkloadReferenceProfile('CUSTOM_QUANTUM_SIM'), null);

  // Pilot backward-compatibility guard: SAP_HANA without basis or allowReferenceProfiles refuses extrapolation
  const refusedPilot = evaluateWorkloadSizingPilot({
    workloadFamily: 'SAP_HANA',
    workingSetGb: 1024,
    requiredCores: 64
  });
  assert.equal(refusedPilot.pilotCoverage, 'UNPROFILED_REQUIRES_AUTHORITATIVE_SIZING_BASIS');
  assert.equal(refusedPilot.extrapolationRefused, true);
  assert.equal(refusedPilot.isQualified, false);
  assert.ok(refusedPilot.hardConstraintFailures.some(f => f.code === 'UNPROFILED_WORKLOAD_FAMILY'));

  // Truly unknown / unlisted family refuses extrapolation even in evaluateWorkloadSizingWithProfiles
  const unknownEval = evaluateWorkloadSizingWithProfiles(
    { workloadFamily: 'CUSTOM_QUANTUM_SIM', workingSetGb: 512, requiredCores: 64 },
    { totalNodes: 2, perNodeMemoryGb: 512, perNodeCores: 64 }
  );
  assert.equal(unknownEval.extrapolationRefused, true);
  assert.equal(unknownEval.isQualified, false);
  assert.ok(unknownEval.hardConstraintFailures.some(f => f.code === 'UNPROFILED_WORKLOAD_FAMILY'));
});

test('Phase 3B [1B/4]: SAP HANA TDI profile enforces symmetric DIMMs, memory-to-core ratio, and TDI persistence storage', () => {
  const demand = {
    workloadFamily: 'SAP_HANA',
    workingSetGb: 1024,
    requiredCores: 64,
    resilienceMode: 'N+1',
    storageSpec: { usableStorageTb: 2.5, raidLevel: 'RAID 10' }
  };

  // Positive: 2x nodes, 1024GB RAM, 64 cores, 1DPC balanced (16 DIMMs on 2S x 8ch), 3.84TB usable RAID 10
  const ok = evaluateWorkloadSizingPilot(demand, {
    totalNodes: 2,
    perNodeMemoryGb: 1024,
    perNodeCores: 64,
    cpuSocketsPerNode: 2,
    perNodeDimms: 16,
    channelWidth: 8,
    storage: { driveCount: 8, driveSizeTb: 0.96, raidLevel: 'RAID 10' }
  }, { allowReferenceProfiles: true });
  assert.equal(ok.pilotCoverage, 'PROFILE_SUPPORTED');
  assert.equal(ok.isQualified, true);
  assert.equal(ok.checks.workloadSpecific.pass, true);
  assert.equal(ok.profileBasis.provenance.authoritativeSizingBasis, PROVENANCE_VALUES.CITED_MEASUREMENT);

  // Negative: partial channel DIMMs (8 DIMMs on 2S x 8ch -> 4 DIMMs/socket) fails SAP HANA TDI symmetry
  const badSymmetry = evaluateWorkloadSizingWithProfiles(demand, {
    totalNodes: 2,
    perNodeMemoryGb: 1024,
    perNodeCores: 64,
    cpuSocketsPerNode: 2,
    perNodeDimms: 8,
    channelWidth: 8,
    storage: { driveCount: 8, driveSizeTb: 0.96, raidLevel: 'RAID 10' }
  });
  assert.equal(badSymmetry.isQualified, false);
  assert.ok(badSymmetry.hardConstraintFailures.some(f => f.code === 'SAP_HANA_TDI_SYMMETRY_VIOLATION'));
});

test('Phase 3B [1C/4]: AI/LLM profile sizes FP8/BF16 GPU VRAM and training RDMA interconnect with explicit provenance', () => {
  // 70B model in BF16 inference -> 70 * 2 * 1.25 = 175 GB VRAM
  const inferDemand = {
    workloadFamily: 'AI_INFERENCE_TRAINING',
    modelParamsBillions: 70,
    precision: 'BF16',
    aiMode: 'INFERENCE',
    resilienceMode: 'N+1'
  };

  // Positive: 2 nodes x 4x 80GB H100 (320GB/node surviving VRAM >= 175GB)
  const inferOk = evaluateWorkloadSizingWithProfiles(inferDemand, {
    totalNodes: 2,
    perNodeMemoryGb: 512,
    perNodeCores: 64,
    perNodeGpus: 4,
    perGpuVramGb: 80
  });
  assert.equal(inferOk.isQualified, true);
  assert.equal(inferOk.checks.workloadSpecific.metrics.requiredVramGb, 175);
  assert.equal(inferOk.checks.workloadSpecific.metrics.vramProvenance, PROVENANCE_VALUES.CITED_MEASUREMENT);

  // Negative: 2 nodes x 2x 48GB L40S (96GB surviving VRAM < 175GB required)
  const inferFail = evaluateWorkloadSizingWithProfiles(inferDemand, {
    totalNodes: 2,
    perNodeMemoryGb: 512,
    perNodeCores: 64,
    perNodeGpus: 2,
    perGpuVramGb: 48
  });
  assert.equal(inferFail.isQualified, false);
  assert.ok(inferFail.hardConstraintFailures.some(f => f.code === 'AI_GPU_VRAM_DEFICIT'));

  // Negative: Multi-node AI training with 25GbE interconnect (< 200 Gbps required)
  const trainFail = evaluateWorkloadSizingWithProfiles({
    workloadFamily: 'AI_INFERENCE_TRAINING',
    modelParamsBillions: 70,
    precision: 'FP8',
    aiMode: 'TRAINING',
    resilienceMode: 'NONE'
  }, {
    totalNodes: 4,
    perNodeMemoryGb: 1024,
    perNodeCores: 64,
    perNodeGpus: 8,
    perGpuVramGb: 80,
    fabric: { protocol: 'ETHERNET', speedGbps: 25, portsPerNode: 2 }
  });
  assert.equal(trainFail.isQualified, false);
  assert.ok(trainFail.hardConstraintFailures.some(f => f.code === 'AI_TRAINING_INTERCONNECT_UNDERSIZED'));
});

test('Phase 3B [1D/4]: MS SQL OLTP, VDI Enterprise, Big Data/Kafka, and HPC profiles validate domain rules', () => {
  // MS SQL OLTP: RAID 5 rejected at 50k IOPS; RAID 10 NVMe passes
  const sqlBad = evaluateWorkloadSizingWithProfiles({
    workloadFamily: 'MICROSOFT_SQL_OLTP',
    workingSetGb: 512,
    requiredCores: 64,
    requiredIops: 50000,
    resilienceMode: 'N+1',
    storageSpec: { usableStorageTb: 10, raidLevel: 'RAID 5' }
  }, {
    totalNodes: 2,
    perNodeMemoryGb: 512,
    perNodeCores: 64,
    storage: { driveCount: 6, driveSizeTb: 3.84, raidLevel: 'RAID 5', mediaType: 'NVME' }
  });
  assert.equal(sqlBad.isQualified, false);
  assert.ok(sqlBad.hardConstraintFailures.some(f => f.code === 'SQL_OLTP_RAID_WRITE_PENALTY'));

  const sqlOk = evaluateWorkloadSizingWithProfiles({
    workloadFamily: 'MICROSOFT_SQL_OLTP',
    workingSetGb: 512,
    requiredCores: 64,
    requiredIops: 50000,
    resilienceMode: 'N+1',
    storageSpec: { usableStorageTb: 10, raidLevel: 'RAID 10' }
  }, {
    totalNodes: 2,
    perNodeMemoryGb: 512,
    perNodeCores: 64,
    storage: { driveCount: 8, driveSizeTb: 3.84, raidLevel: 'RAID 10', mediaType: 'NVME' }
  });
  assert.equal(sqlOk.isQualified, true);

  // VDI Enterprise: 100 CAD_3D users -> 3200GB RAM, 400GB vGPU VRAM
  const vdiFailVgpu = evaluateWorkloadSizingWithProfiles({
    workloadFamily: 'VDI_ENTERPRISE',
    vdiUsers: 100,
    vdiTier: 'CAD_3D',
    resilienceMode: 'N+1'
  }, {
    totalNodes: 5,
    perNodeMemoryGb: 1024,
    perNodeCores: 96,
    perNodeGpus: 1,
    perGpuVramGb: 48
  });
  assert.equal(vdiFailVgpu.isQualified, false);
  assert.ok(vdiFailVgpu.hardConstraintFailures.some(f => f.code === 'VDI_VGPU_VRAM_DEFICIT'));

  const vdiOk = evaluateWorkloadSizingWithProfiles({
    workloadFamily: 'VDI_ENTERPRISE',
    vdiUsers: 100,
    vdiTier: 'CAD_3D',
    resilienceMode: 'N+1'
  }, {
    totalNodes: 5,
    perNodeMemoryGb: 1024,
    perNodeCores: 96,
    perNodeGpus: 2,
    perGpuVramGb: 64
  });
  assert.equal(vdiOk.isQualified, true);

  // Big Data / Kafka: RF=3 rejects 2-node cluster (quorum deficit) and passes 4-node 25GbE cluster
  const kafkaBad = evaluateWorkloadSizingWithProfiles({
    workloadFamily: 'BIG_DATA_KAFKA',
    workingSetGb: 256,
    requiredCores: 32,
    replicationFactor: 3,
    logicalStorageTb: 40,
    resilienceMode: 'NONE'
  }, {
    totalNodes: 2,
    perNodeMemoryGb: 256,
    perNodeCores: 32,
    clusterRawStorageTb: 80,
    fabric: { protocol: 'ETHERNET', speedGbps: 10, portsPerNode: 2 }
  });
  assert.equal(kafkaBad.isQualified, false);
  assert.ok(kafkaBad.hardConstraintFailures.some(f => f.code === 'BIG_DATA_QUORUM_NODE_DEFICIT'));
  assert.ok(kafkaBad.hardConstraintFailures.some(f => f.code === 'BIG_DATA_REPLICATED_STORAGE_DEFICIT'));
  assert.ok(kafkaBad.hardConstraintFailures.some(f => f.code === 'BIG_DATA_EAST_WEST_BANDWIDTH_DEFICIT'));

  const kafkaOk = evaluateWorkloadSizingWithProfiles({
    workloadFamily: 'BIG_DATA_KAFKA',
    workingSetGb: 512,
    requiredCores: 64,
    replicationFactor: 3,
    logicalStorageTb: 40,
    resilienceMode: 'N+1'
  }, {
    totalNodes: 4,
    perNodeMemoryGb: 256,
    perNodeCores: 32,
    clusterRawStorageTb: 160,
    fabric: { protocol: 'ETHERNET', speedGbps: 25, portsPerNode: 2 }
  });
  assert.equal(kafkaOk.isQualified, true);

  // HPC Compute: rejects 25GbE interconnect & unbalanced DIMMs; passes 200Gb InfiniBand + 1DPC
  const hpcBad = evaluateWorkloadSizingWithProfiles({
    workloadFamily: 'HPC_COMPUTE',
    workingSetGb: 512,
    requiredCores: 128,
    resilienceMode: 'NONE'
  }, {
    totalNodes: 4,
    perNodeMemoryGb: 256,
    perNodeCores: 64,
    cpuSocketsPerNode: 2,
    perNodeDimms: 8,
    channelWidth: 8,
    fabric: { protocol: 'ETHERNET', speedGbps: 25, portsPerNode: 2 }
  });
  assert.equal(hpcBad.isQualified, false);
  assert.ok(hpcBad.hardConstraintFailures.some(f => f.code === 'HPC_INTERCONNECT_BANDWIDTH_DEFICIT'));
  assert.ok(hpcBad.hardConstraintFailures.some(f => f.code === 'HPC_MEMORY_BANDWIDTH_UNBALANCED'));

  const hpcOk = evaluateWorkloadSizingWithProfiles({
    workloadFamily: 'HPC_COMPUTE',
    workingSetGb: 512,
    requiredCores: 128,
    resilienceMode: 'NONE'
  }, {
    totalNodes: 4,
    perNodeMemoryGb: 256,
    perNodeCores: 64,
    cpuSocketsPerNode: 2,
    perNodeDimms: 16,
    channelWidth: 8,
    fabric: { protocol: 'INFINIBAND', speedGbps: 200, portsPerNode: 2 }
  });
  assert.equal(hpcOk.isQualified, true);
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: Alletra MP B10000 & X10000 Domain Evaluator (INV-265..268)
// ═══════════════════════════════════════════════════════════════════════════

test('Phase 3B [2/4]: Alletra MP B10100 Switchless vs B10200 Switched & X10000 enforce INV-265..268 and nullable prices', () => {
  // Positive B10100 Switchless (2x B10130 nodes, 16x NVMe SSDs, 2x FC HBAs, 2x PSUs, 0 switches)
  const b10100Valid = [
    { sku: 'S0B84A', description: 'HPE Alletra Storage MP B10100 Base Configuration', quantity: 1 },
    { sku: 'R7C75A', description: 'HPE Alletra Storage MP 10000 2U Chassis', quantity: 1, unitPriceUsd: 13749 },
    { sku: 'S0R21A', description: 'HPE Alletra Storage MP B10130 Controller Node', quantity: 2, unitPriceUsd: 166193 },
    { sku: 'R9H67A', description: 'HPE Alletra Storage MP 3.84TB NVMe SFF Self-encrypting SSD', quantity: 16, unitPriceUsd: 53373 },
    { sku: 'S2S64A', description: 'HPE Alletra Storage MP 32Gb 4-port Fibre Channel OCP Host Bus Adapter', quantity: 2 },
    { sku: 'Q2P62A', description: 'HPE 32Gb SFP28 Short Wave 1-pack Pull Tab Optical Transceiver', quantity: 8 },
    { sku: 'R7C76A', description: 'HPE Alletra Storage MP C14 1600W AC Power Supply', quantity: 2 },
    { sku: 'HU4B2A3', description: 'HPE 3Y Tech Care Basic Service', quantity: 1 }
  ];
  assert.equal(isAlletraMpItems(b10100Valid), true);
  const resB10100 = evaluatePhysicalMath(b10100Valid);
  assert.equal(resB10100.productType, 'ALLETRA_MP');
  assert.equal(resB10100.solutionTopology.domain, 'alletra_mp');
  assert.equal(resB10100.alletraMpVariant, 'B10100_SWITCHLESS');
  assert.equal(resB10100.isMathClean, true);
  assert.equal(resB10100.portalValidationStatus, 'PENDING');
  assert.equal(resB10100.ninjaOnlineTelemetry.loaded, true);
  // Nullable price check: unpriced SKUs (S0B84A, S2S64A, etc.) must keep estimatedCostUsd === null (never $0)
  const cand = resB10100.conflictGraph.rankedSolutions[0];
  assert.equal(cand.estimatedCostUsd, null);
  assert.equal(cand.pricingComplete, false);
  assert.ok(cand.unresolvedPriceSkus.includes('S0B84A'));

  // Negative B10100 Switchless with backend switch -> FAIL
  const b10100WithSwitch = [
    ...b10100Valid,
    { sku: 'S1R08A', description: 'HPE Alletra Storage MP 32-port 100GbE Switch Bundle', quantity: 1 }
  ];
  const resB10100BadSw = evaluatePhysicalMath(b10100WithSwitch);
  assert.equal(resB10100BadSw.isMathClean, false);
  assert.ok(resB10100BadSw.errors.some(e => e.includes('Switchless B10100')));

  // Negative mixing S0B84A and S1R06A -> FAIL
  const mixedVariants = [
    ...b10100Valid,
    { sku: 'S1R06A', description: 'HPE Alletra Storage MP B10200 Base Configuration', quantity: 1 }
  ];
  const resMixed = evaluateAlletraMp(mixedVariants);
  assert.equal(resMixed.isMathClean, false);
  assert.ok(resMixed.errors.some(e => e.includes('Mutual Exclusion Violation')));

  // Positive B10200 Switched (4 nodes, 2 JBOFs, 48 drives, 1x switch bundle = 2 switches, 4 HBAs, 8 PSUs)
  const b10200Valid = [
    { sku: 'S1R06A', description: 'HPE Alletra Storage MP B10200 Base Configuration', quantity: 1 },
    { sku: 'R7C75A', description: 'HPE Alletra Storage MP 10000 2U Chassis', quantity: 2 },
    { sku: 'R7D02A', description: 'HPE Alletra Storage MP B10230 Controller Node', quantity: 4 },
    { sku: 'S1J10A', description: 'HPE Alletra Storage MP 10001 NVMe Configure-to-order Expansion Shelf', quantity: 2 },
    { sku: 'S1R08A', description: 'HPE Alletra Storage MP 32-port 100GbE Switch Bundle', quantity: 1 },
    { sku: 'R9F76A', description: 'HPE Aruba Networking 100G QSFP28 to QSFP28 2m Active Optical Cable', quantity: 16 },
    { sku: 'R9H68A', description: 'HPE Alletra Storage MP 7.68TB NVMe SFF Self-encrypting SSD', quantity: 48 },
    { sku: 'S4V68A', description: 'HPE Alletra Storage MP 64Gb 4-port Fibre Channel OCP Host Bus Adapter', quantity: 4 },
    { sku: 'R7C76A', description: 'HPE Alletra Storage MP C14 1600W AC Power Supply', quantity: 8 },
    { sku: 'HU4B2A3', description: 'HPE 3Y Tech Care Basic Service', quantity: 1 }
  ];
  const resB10200 = evaluatePhysicalMath(b10200Valid);
  assert.equal(resB10200.productType, 'ALLETRA_MP');
  assert.equal(resB10200.alletraMpVariant, 'B10200_SWITCHED');
  assert.equal(resB10200.isMathClean, true);
  assert.equal(resB10200.portalValidationStatus, 'PENDING');

  // Negative B10200 Switched missing JBOFs and missing backend switches -> FAIL
  const b10200Broken = b10200Valid.filter(i => i.sku !== 'S1J10A' && i.sku !== 'S1R08A');
  const resB10200Bad = evaluatePhysicalMath(b10200Broken);
  assert.equal(resB10200Bad.isMathClean, false);
  assert.ok(resB10200Bad.errors.some(e => e.includes('mandates 1-8 JBOF')));
  assert.ok(resB10200Bad.errors.some(e => e.includes('requires redundant backend NVMe-oF switches')));

  // Positive & Negative X10000
  const x10kValid = [
    { sku: 'S3L12A', description: 'HPE Alletra Storage MP X10000 Base Configuration', quantity: 1 },
    { sku: 'R7C75A', description: 'HPE Alletra Storage MP 10000 2U Chassis', quantity: 2 },
    { sku: 'R7C71A', description: 'HPE Alletra Storage MP X10250 Controller Node', quantity: 4 },
    { sku: 'S1J10A', description: 'HPE Alletra Storage MP 10001 NVMe Configure-to-order Expansion Shelf', quantity: 2 },
    { sku: 'S1R08A', description: 'HPE Alletra Storage MP 32-port 100GbE Switch Bundle', quantity: 1 },
    { sku: 'R9F76A', description: 'HPE Aruba Networking 100G QSFP28 to QSFP28 2m Active Optical Cable', quantity: 24 },
    { sku: 'R9H69A', description: 'HPE Alletra Storage MP 15.36TB NVMe SFF Self-encrypting SSD', quantity: 24 },
    { sku: 'S2A68A', description: 'HPE Alletra Storage MP 100GbE 2-port OCP Host Bus Adapter', quantity: 4 },
    { sku: 'R7C76A', description: 'HPE Alletra Storage MP C14 1600W AC Power Supply', quantity: 8 },
    { sku: 'HU4B2A3', description: 'HPE 3Y Tech Care Basic Service', quantity: 1 }
  ];
  const resX10k = evaluatePhysicalMath(x10kValid);
  assert.equal(resX10k.productKey, 'Alletra_MP_X10000');
  assert.equal(resX10k.alletraMpVariant, 'X10000');
  assert.equal(resX10k.isMathClean, true);

  // Negative X10000: only 2 nodes (< 3 minimum) + mixed TLC & QLC drives
  const x10kBad = [
    ...x10kValid.map(i => i.sku === 'R7C71A' ? { ...i, quantity: 2 } : i),
    { sku: 'S3L74A', description: 'HPE Alletra Storage MP 30.72TB NVMe SFF QLC SSD', quantity: 8 }
  ];
  const resX10kBad = evaluateAlletraMp(x10kBad);
  assert.equal(resX10kBad.isMathClean, false);
  assert.ok(resX10kBad.errors.some(e => e.includes('at least 3 controller nodes')));
  assert.ok(resX10kBad.errors.some(e => e.includes('Media Tier Conflict')));
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: Synergy 12000 Composite Evaluator & Boundary Negative Controls
// ═══════════════════════════════════════════════════════════════════════════

test('Phase 3B [3/4]: Synergy 12000 Composite validates bays, ICM pairing, mezz-fabric, FLM HA, 6x PSU, per-icon support & boundaries', () => {
  const synergyValid = [
    { sku: 'P51174-B21', description: 'HPE Synergy 12000 Configure-to-order Frame', quantity: 1 },
    { sku: 'P68217-B21', description: 'HPE Synergy 480 Gen12 Configure-to-order Compute Module', quantity: 4 },
    { sku: '867796-B21', description: 'HPE Virtual Connect SE 100Gb F32 Module for Synergy', quantity: 2 },
    { sku: 'P77653-B21', description: 'Brocade 64Gb Fibre Channel Module for HPE Synergy', quantity: 2 },
    { sku: 'P64724-B21', description: 'HPE Synergy 6310C 25/50Gb Ethernet Adapter', quantity: 4 },
    { sku: 'P68131-B21', description: 'HPE Synergy 7330C 64Gb Fibre Channel Host Bus Adapter', quantity: 4 },
    { sku: '876852-B21', description: 'HPE Synergy 4-port Frame Link Module', quantity: 2 },
    { sku: 'P27750-B21', description: 'HPE 6x 3000W Titanium Hot Plug FIO Power Supply Kit', quantity: 1 },
    { sku: '882251-B21', description: 'HPE Synergy 100GbE/4x25GbE/4x32GbFC QSFP28 Transceiver', quantity: 4 },
    { sku: 'HU4B2A3#FRM', description: 'HPE 3Y Tech Care Basic Synergy 12000 Frame Service', quantity: 1 },
    { sku: 'HU4B2A3#CMP', description: 'HPE 3Y Tech Care Basic SY480 Gen12 Compute Service', quantity: 4 },
    { sku: 'HU4B2A3#ICM', description: 'HPE 3Y Tech Care Basic Virtual Connect F32 Interconnect Service', quantity: 4 }
  ];

  assert.equal(isCompleteSynergyComposite(synergyValid), true);
  const resOk = evaluatePhysicalMath(synergyValid);
  assert.equal(resOk.productType, 'SYNERGY_COMPOSITE');
  assert.equal(resOk.solutionTopology.domain, 'synergy_composite');
  assert.equal(resOk.isMathClean, true);
  assert.equal(resOk.portalValidationStatus, 'PENDING');
  assert.equal(resOk.aspectChecks.length, 6);
  assert.equal(resOk.aspectChecks.every(c => c.status === 'PASS'), true);

  // Negative 1: Compute bay overflow (13 half-height blades in 1 frame > 12 bays)
  const bayOverflow = synergyValid.map(i => i.sku === 'P68217-B21' ? { ...i, quantity: 13 } : i);
  const resOverflow = evaluateSynergyComposite(bayOverflow);
  assert.equal(resOverflow.isMathClean, false);
  assert.ok(resOverflow.errors.some(e => e.includes('Compute Bay Overflow')));

  // Negative 2: Full-height SY660 x 7 = 14 bays > 12 bays
  const fullHeightOverflow = [
    ...synergyValid.filter(i => i.sku !== 'P68217-B21'),
    { sku: '871929-B21', description: 'HPE Synergy 660 Gen10 Configure-to-order Compute Module', quantity: 7 }
  ];
  assert.equal(evaluateSynergyComposite(fullHeightOverflow).isMathClean, false);

  // Negative 3: Odd ICM count (1x F32 breaks bay pairing), 1x FLM (breaks HA ring), 4x PSUs (< 6 required), missing FC ICM for 64Gb FC HBA
  const multiDefect = [
    { sku: 'P51174-B21', description: 'HPE Synergy 12000 Configure-to-order Frame', quantity: 1 },
    { sku: 'P68217-B21', description: 'HPE Synergy 480 Gen12 Configure-to-order Compute Module', quantity: 2 },
    { sku: '867796-B21', description: 'HPE Virtual Connect SE 100Gb F32 Module for Synergy', quantity: 1 },
    { sku: 'P68131-B21', description: 'HPE Synergy 7330C 64Gb Fibre Channel Host Bus Adapter', quantity: 2 },
    { sku: '876852-B21', description: 'HPE Synergy 4-port Frame Link Module', quantity: 1 },
    { sku: 'P27749-B21', description: 'HPE 3000W Titanium Hot Plug Power Supply Kit', quantity: 4 },
    { sku: 'HU4B2A3#FRM', description: 'HPE 3Y Tech Care Basic Synergy 12000 Frame Service', quantity: 1 }
  ];
  const resBad = evaluatePhysicalMath(multiDefect);
  assert.equal(resBad.isMathClean, false);
  assert.ok(resBad.errors.some(e => e.includes('Ethernet ICM Bay Pairing Violation')));
  assert.ok(resBad.errors.some(e => e.includes('FC Mezzanine-to-Fabric Mismatch')));
  assert.ok(resBad.errors.some(e => e.includes('Frame Link Module HA Violation')));
  assert.ok(resBad.errors.some(e => e.includes('Shared Frame Power Deficit')));
  assert.ok(resBad.warnings.some(w => w.includes('Per-Icon Support Conflation Risk')));

  // Boundary Control A: Standalone SY480 without Frame must NOT route to synergy_composite & must flag incomplete enclosure relationships
  const standaloneSy480 = [
    { sku: 'P68217-B21', description: 'HPE Synergy 480 Gen12 Configure-to-order Compute Module', quantity: 1 },
    { sku: 'P73831-B21', description: 'Intel Xeon 6747P 2.7GHz 48-core 330W Processor for HPE', quantity: 2 },
    { sku: 'P69728-F21', description: 'HPE 64GB DDR5-6400 Registered Smart FIO Memory Kit', quantity: 16 }
  ];
  assert.equal(isCompleteSynergyComposite(standaloneSy480), false);
  const resStandalone = evaluatePhysicalMath(standaloneSy480, null, '', { skipGraphValidation: true });
  assert.notEqual(resStandalone.productType, 'SYNERGY_COMPOSITE');
  assert.equal(resStandalone.isMathClean, false);

  // Boundary Control B: Unknown heterogeneous mixed assembly (DL380 + Alletra MP + SN3600B) MUST still return VALIDATION_PROFILE_REQUIRED
  const unknownMixed = [
    { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server', quantity: 2 },
    { sku: 'S0B84A', description: 'HPE Alletra Storage MP B10100 Base Configuration', quantity: 1 },
    { sku: 'R7R97A', description: 'HPE StoreFabric SN3600B 32Gb FC Switch', quantity: 2 }
  ];
  assert.equal(isAlletraMpItems(unknownMixed), false);
  assert.equal(isCompleteSynergyComposite(unknownMixed), false);
  const resMixedBoundary = evaluatePhysicalMath(unknownMixed);
  assert.equal(resMixedBoundary.isMathClean, false);
  assert.ok(resMixedBoundary.warnings.some(w => w.includes('VALIDATION_PROFILE_REQUIRED')));
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: MSL3040 Tape Promotion & Aspect Registry Wiring
// ═══════════════════════════════════════════════════════════════════════════

test('Phase 3B [4/4]: MSL3040 Tape evaluates cleanly in boq_evaluator.js and aspect_registry wires all new domains', () => {
  assert.equal(DOMAIN_CAPABILITY_MATRIX.alletra_mp.status, 'PRODUCTION_SUPPORTED');
  assert.equal(DOMAIN_CAPABILITY_MATRIX.synergy_composite.status, 'PRODUCTION_SUPPORTED');
  assert.equal(DOMAIN_CAPABILITY_MATRIX.archive_tape.status, 'PRODUCTION_SUPPORTED');
  assert.equal(DOMAIN_CAPABILITY_MATRIX.archive.status, 'NOT_EVALUATED');

  assert.equal(getRegisteredAspectsForDomain('alletra_mp').length, 6);
  assert.equal(getRegisteredAspectsForDomain('synergy_composite').length, 6);

  // Positive MSL3040 Tape via evaluatePhysicalMath
  const validTape = [
    { sku: 'Q6Q62C', description: 'HPE StoreEver MSL3040 Scalable Base Module', quantity: 1 },
    { sku: 'R1R75A', description: 'HPE StoreEver MSL LTO-9 Ultrium 45000 SAS Drive Upgrade Kit', quantity: 1 },
    { sku: '716195-B21', description: 'HPE 2.0m External Mini-SAS High Density to Mini-SAS HD Cable', quantity: 1 },
    { sku: 'Q2079A', description: 'HPE LTO-9 Ultrium 45TB RW Data Cartridge', quantity: 20 },
    { sku: 'C7978A', description: 'HPE Ultrium Universal Cleaning Cartridge', quantity: 1 },
    { sku: 'Q2014A', description: 'HPE LTO-9 Ultrium Bar Code Label Pack', quantity: 1 },
    { sku: 'HU4B2A3', description: 'HPE 3Y Tech Care Basic Service', quantity: 1 }
  ];
  const resTapeOk = evaluatePhysicalMath(validTape);
  assert.equal(resTapeOk.productType, 'ARCHIVE_TAPE');
  assert.equal(resTapeOk.solutionTopology.domain, 'archive_tape');
  assert.equal(resTapeOk.isMathClean, true);
  assert.equal(resTapeOk.portalValidationStatus, 'PENDING');

  // Negative MSL3040 Tape: 7 expansion modules (> 6 max) and missing SAS cable -> FAIL
  const badTape = [
    { sku: 'Q6Q62C', description: 'HPE StoreEver MSL3040 Scalable Base Module', quantity: 1 },
    { sku: 'Q6Q63A', description: 'HPE StoreEver MSL3040 Expansion Module', quantity: 7 },
    { sku: 'R1R75A', description: 'HPE StoreEver MSL LTO-9 Ultrium 45000 SAS Drive Upgrade Kit', quantity: 1 }
  ];
  const resTapeBad = evaluatePhysicalMath(badTape);
  assert.equal(resTapeBad.productType, 'ARCHIVE_TAPE');
  assert.equal(resTapeBad.isMathClean, false);
  assert.ok(resTapeBad.errors.some(e => e.includes('maximum expansion module limit')));
  assert.ok(resTapeBad.errors.some(e => e.includes('Mini-SAS HD external cable')));

  // Aspect registry end-to-end check for alletra_mp & synergy_composite
  const aspectAlletra = evaluateDomainAspects('alletra_mp', [
    { sku: 'S0B84A', description: 'HPE Alletra Storage MP B10100 Base Configuration', quantity: 1 },
    { sku: 'S1R08A', description: 'HPE Alletra Storage MP 32-port 100GbE Switch Bundle', quantity: 1 }
  ]);
  assert.equal(aspectAlletra.capability.status, 'PRODUCTION_SUPPORTED');
  assert.equal(aspectAlletra.hasFailures, true);
  assert.ok(aspectAlletra.errors.some(e => e.includes('Switchless B10100')));

  const aspectSynergy = evaluateDomainAspects('synergy_composite', [
    { sku: 'P51174-B21', description: 'HPE Synergy 12000 Configure-to-order Frame', quantity: 1 },
    { sku: 'P68217-B21', description: 'HPE Synergy 480 Gen12 Configure-to-order Compute Module', quantity: 14 }
  ]);
  assert.equal(aspectSynergy.capability.status, 'PRODUCTION_SUPPORTED');
  assert.equal(aspectSynergy.hasFailures, true);
  assert.ok(aspectSynergy.errors.some(e => e.includes('Compute Bay Overflow')));
});

test('Phase 3B [5/5]: Synergy Dual-Slot PSU Adapter (12 PSUs/frame), 64Gb->32Gb FC Negotiation & OCA Container Divisibility', () => {
  // Positive 2-frame Gen12 Synergy BOM (12x P44074-B21 adapters + 24x P44712-B21 PSUs + P68131-B21 64Gb FC HBA -> Q2E57A 32Gb FC ICM)
  const synergyDualSlot = [
    { sku: 'P51174-B21', description: 'HPE Synergy 12000 Configure-to-order Frame', quantity: 2 },
    { sku: 'P68217-B21', description: 'HPE Synergy 480 Gen12 Configure-to-order Compute Module', quantity: 24 },
    { sku: '867796-B21', description: 'HPE Virtual Connect SE 100Gb F32 Module for Synergy', quantity: 2 },
    { sku: '867793-B21', description: 'HPE Synergy 50Gb Interconnect Link Module', quantity: 2 },
    { sku: 'Q2E57A', description: 'Brocade 32Gb/20 4SFP+ Power Pack+ Fibre Channel SAN Switch Module for HPE Synergy', quantity: 4 },
    { sku: 'P64724-B21', description: 'HPE Synergy 6310C 25/50Gb Ethernet Adapter', quantity: 24 },
    { sku: 'P68131-B21', description: 'HPE Synergy 7330C 64Gb Fibre Channel Host Bus Adapter', quantity: 24 },
    { sku: '876852-B21', description: 'HPE Synergy 4-port Frame Link Module', quantity: 4 },
    { sku: 'P44074-B21', description: 'HPE Synergy Dual Slot Power Supply Adapter', quantity: 12 },
    { sku: 'P44712-B21', description: 'HPE 1800W-2200W Flex Slot Titanium Hot Plug Power Supply Kit', quantity: 24 },
    { sku: '882251-B21', description: 'HPE Synergy 100GbE/4x25GbE/4x32GbFC QSFP28 Transceiver', quantity: 12 },
    { sku: 'HU4B2A3     WJN', description: 'HPE Synergy 1200 Frame Supp', quantity: 2 },
    { sku: 'HU4B2A30BT7', description: 'HPE SY480 Gen12 Support', quantity: 24 },
    { sku: 'HU4B2A3     Z1R', description: 'HPE Synergy VC SE 100Gb F32 Module Supp', quantity: 2 }
  ];
  const resDualOk = evaluateSynergyComposite(synergyDualSlot);
  assert.equal(resDualOk.isMathClean, true);
  assert.equal(resDualOk.evalSummary.psuCount, 24);
  const powerCheck = resDualOk.aspectChecks.find(c => c.id === 'SYNERGY_SHARED_FRAME_POWER');
  assert.equal(powerCheck.status, 'PASS');
  assert.ok(powerCheck.detail.includes('24/24'));
  const fcCheck = resDualOk.aspectChecks.find(c => c.id === 'SYNERGY_MEZZ_FABRIC_ALIGNMENT');
  assert.equal(fcCheck.status, 'WARN');
  assert.ok(fcCheck.warnings.some(w => w.includes('negotiates backward to 32Gb FC ICM')));

  // Negative PSU boundaries
  const over12WithAdapters = [
    { sku: 'P51174-B21', description: 'HPE Synergy 12000 Configure-to-order Frame', quantity: 1 },
    { sku: 'P44074-B21', description: 'HPE Synergy Dual Slot Power Supply Adapter', quantity: 6 },
    { sku: 'P44712-B21', description: 'HPE 1800W-2200W Flex Slot Titanium Hot Plug Power Supply Kit', quantity: 13 }
  ];
  assert.ok(evaluateSynergyComposite(over12WithAdapters).errors.some(e => e.includes('PSU Bay Overflow')));

  const over6WithoutAdapters = [
    { sku: 'P51174-B21', description: 'HPE Synergy 12000 Configure-to-order Frame', quantity: 1 },
    { sku: 'P44712-B21', description: 'HPE 1800W-2200W Flex Slot Titanium Hot Plug Power Supply Kit', quantity: 8 }
  ];
  assert.ok(evaluateSynergyComposite(over6WithoutAdapters).errors.some(e => e.includes('PSU Bay Overflow')));

  const adapterOverflow = [
    { sku: 'P51174-B21', description: 'HPE Synergy 12000 Configure-to-order Frame', quantity: 1 },
    { sku: 'P44074-B21', description: 'HPE Synergy Dual Slot Power Supply Adapter', quantity: 7 },
    { sku: 'P44712-B21', description: 'HPE 1800W-2200W Flex Slot Titanium Hot Plug Power Supply Kit', quantity: 12 }
  ];
  assert.ok(evaluateSynergyComposite(adapterOverflow).errors.some(e => e.includes('Dual-Slot PSU Adapter Overflow')));

  // OCA Container Divisibility Positive Control (2/2 = 1 + loose in AdHoc)
  const divOk = validateOcaContainerDivisibility([
    { sku: '876852-B21', description: 'HPE Synergy 4-port Frame Link Module', qty: 2, cfg: '4-port Frame Link Module #2' },
    { sku: '876852-B21  0D1', description: 'Factory Integrated', qty: 2, cfg: '4-port Frame Link Module #2' },
    { sku: '453154-B21', description: 'HPE BladeSystem CClass Virtual Connect 1G SFP RJ45 Transceiver', qty: 2, cfg: '4-port Frame Link Module #2' },
    { sku: '453154-B21  0D1', description: 'Factory Integrated', qty: 2, cfg: '4-port Frame Link Module #2' },
    { sku: 'QK734A', description: 'HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 5m Cable', qty: 24, cfg: 'Ad-Hoc #1' }
  ]);
  assert.equal(divOk.valid, true);
  assert.equal(divOk.violations.length, 0);
  assert.equal(divOk.adHocNamingWarnings.length, 0);

  // OCA Container Divisibility & Ad-Hoc Naming Negative Control (1/2 = 0.5 under FLM #1/#2 + non-standard AdHoc label)
  const divBad = validateOcaContainerDivisibility([
    { sku: '876852-B21', description: 'HPE Synergy 4-port Frame Link Module', qty: 2, cfg: '4-port Frame Link Module #1' },
    { sku: '876852-B21  0D1', description: 'Factory Integrated', qty: 2, cfg: '4-port Frame Link Module #1' },
    { sku: '453154-B21', description: 'HPE BladeSystem CClass Virtual Connect 1G SFP RJ45 Transceiver', qty: 1, cfg: '4-port Frame Link Module #1' },
    { sku: '453154-B21  0D1', description: 'Factory Integrated', qty: 1, cfg: '4-port Frame Link Module #1' },
    { sku: '876852-B21', description: 'HPE Synergy 4-port Frame Link Module', qty: 2, cfg: '4-port Frame Link Module #2' },
    { sku: '453154-B21', description: 'HPE BladeSystem CClass Virtual Connect 1G SFP RJ45 Transceiver', qty: 1, cfg: '4-port Frame Link Module #2' },
    { sku: 'QK734A', description: 'HPE Premier Flex LC/LC Multi-mode OM4 2 Fiber 5m Cable', qty: 24, cfg: 'AdHoc - SFP + Cables' }
  ]);
  assert.equal(divBad.valid, false);
  assert.equal(divBad.violations.length, 2);
  assert.equal(divBad.violations[0].childSku, '453154-B21');
  assert.equal(divBad.violations[0].perParent, 0.5);
  assert.equal(divBad.violations[1].childSku, '453154-B21');
  assert.equal(divBad.violations[1].perParent, 0.5);
  assert.equal(divBad.adHocNamingWarnings.length, 1);
  assert.ok(divBad.adHocNamingWarnings[0].reason.includes('Ad-Hoc #1'));
});
