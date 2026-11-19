'use strict';

/**
 * tests/unit/test_si06_sizing_and_alternatives.js
 *
 * SI-06 Acceptance Suite (10/10 cases):
 * 1. Same workload label with different demand + unprofiled workload guard
 * 2. Missing critical demand draft ('SIZING_DRAFT_SCENARIO_RANGE') & nextRequiredInput + per-field provenance
 * 3. N+1 (and 2N) failover capacity loss math (survivingNodes = totalNodes - 1)
 * 4. Raw vs usable RAID storage overhead calculation
 * 5. Memory / NUMA channel symmetry & 1DPC vs 2DPC interleaving trade-off
 * 6. Required fabric parity check (protocol, speedGbps, portsPerNode, redundancy)
 * 7. Explicit service requirement check (SLA tier, durationYears, media retention)
 * 8. Null prices + null/stale lead times + QUOTE/LIST/HISTORICAL metadata preservation
 * 9. Deterministic ranking under input array permutation & closest-rank policy (changed SKU lines, then changed units)
 * 10. Cheap hard-requirement-violating candidate disqualified before ranking + scoped evaluatedCandidateSet & isGlobalMinimum guard
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  WORKLOAD_DEMAND_SCHEMA_VERSION,
  PROVENANCE_VALUES,
  createWorkloadDemandRecord,
  extractWorkloadDemand,
  evaluateWorkloadSizingPilot
} = require('../../scripts/lib/conflict/sizing/workload_demand.js');

const {
  qualifyCandidatesBeforeRanking,
  rankQualifiedCandidatesDeterministically,
  computeParetoFrontier
} = require('../../scripts/lib/conflict/sizing/pareto_ranker.js');

const {
  extractWorkloadDna,
  buildWorkloadDemandProfile
} = require('../../scripts/lib/conflict/workload_dna.js');

const {
  parseLeadTimeDays,
  scoreAndSortCandidates,
  synthesize5TierRankedSolutions
} = require('../../scripts/lib/conflict/strategy_synthesizer.js');

test('SI-06 [1/10]: Same workload label with different demand yields distinct sizing; unprofiled labels refuse extrapolation', () => {
  const nodeTemplate = { perNodeMemoryGb: 512, perNodeCores: 64, channelWidth: 8, cpuSocketsPerNode: 2, perNodeDimms: 16 };

  const smallDemand = createWorkloadDemandRecord({
    workloadFamily: 'VMWARE_VCF',
    throughputOrConcurrency: { value: 80, unit: 'VMs' },
    workingSetGb: 512,
    requiredCores: 64,
    growthFactor: 1.0,
    resilienceMode: 'N+1'
  });

  const largeDemand = createWorkloadDemandRecord({
    workloadFamily: 'VMWARE_VCF',
    throughputOrConcurrency: { value: 400, unit: 'VMs' },
    workingSetGb: 2048,
    requiredCores: 256,
    growthFactor: 1.25,
    resilienceMode: 'N+1'
  });

  assert.equal(smallDemand.schemaVersion, WORKLOAD_DEMAND_SCHEMA_VERSION);
  assert.equal(smallDemand.workloadFamily, 'VMWARE_VCF');
  assert.equal(largeDemand.workloadFamily, 'VMWARE_VCF');

  const smallEval = evaluateWorkloadSizingPilot(smallDemand, nodeTemplate);
  const largeEval = evaluateWorkloadSizingPilot(largeDemand, nodeTemplate);

  assert.equal(smallEval.pilotCoverage, 'PILOT_SUPPORTED');
  assert.equal(smallEval.sizingStatus, 'SIZED_QUALIFIED');
  assert.equal(smallEval.recommendedCluster.requiredSurvivingNodes, 1);
  assert.equal(smallEval.recommendedCluster.recommendedTotalNodes, 2);

  assert.equal(largeEval.pilotCoverage, 'PILOT_SUPPORTED');
  assert.equal(largeEval.sizingStatus, 'SIZED_QUALIFIED');
  assert.equal(largeEval.effectiveDemand.workingSetGb, 2560);
  assert.equal(largeEval.effectiveDemand.requiredCores, 320);
  assert.equal(largeEval.recommendedCluster.requiredSurvivingNodes, 5);
  assert.equal(largeEval.recommendedCluster.recommendedTotalNodes, 6);
  assert.notEqual(
    smallEval.recommendedCluster.recommendedTotalNodes,
    largeEval.recommendedCluster.recommendedTotalNodes
  );

  // Unprofiled workload label must never extrapolate performance from label alone
  const unprofiledEval = evaluateWorkloadSizingPilot({
    workloadFamily: 'SAP_HANA',
    workingSetGb: 2048,
    requiredCores: 128
  });
  assert.equal(unprofiledEval.pilotCoverage, 'UNPROFILED_REQUIRES_AUTHORITATIVE_SIZING_BASIS');
  assert.equal(unprofiledEval.extrapolationRefused, true);
  assert.equal(unprofiledEval.isQualified, false);
});

test('SI-06 [2/10]: Missing critical demand emits SIZING_DRAFT_SCENARIO_RANGE, nextRequiredInput, and per-field provenance', () => {
  const bareLabel = extractWorkloadDemand('Deploy VMware VCF production cluster with N+1 HA');
  assert.equal(bareLabel.workloadFamily, 'VMWARE_VCF');
  assert.equal(bareLabel.resilienceMode, 'N+1');
  assert.equal(bareLabel.provenance.workloadFamily, PROVENANCE_VALUES.USER_FACT);
  assert.equal(bareLabel.provenance.resilienceMode, PROVENANCE_VALUES.USER_FACT);
  assert.equal(bareLabel.provenance.workingSetGb, PROVENANCE_VALUES.MISSING);
  assert.equal(bareLabel.provenance.throughputOrConcurrency, PROVENANCE_VALUES.MISSING);
  assert.equal(bareLabel.provenance.growthFactor, PROVENANCE_VALUES.MISSING);

  const draftMissingMem = evaluateWorkloadSizingPilot(bareLabel);
  assert.equal(draftMissingMem.sizingStatus, 'SIZING_DRAFT_SCENARIO_RANGE');
  assert.equal(draftMissingMem.isQualified, false);
  assert.equal(draftMissingMem.extrapolationRefused, true);
  assert.ok(draftMissingMem.missingCriticalInputs.includes('workingSetGb'));
  assert.equal(draftMissingMem.nextRequiredInput, 'workingSetGb');
  assert.ok(draftMissingMem.scenarioRange);
  assert.equal(draftMissingMem.scenarioRange.isDraftOnly, true);
  assert.equal(draftMissingMem.scenarioRange.conservativeScenario.requiredWorkingSetGb, null);

  // Supply workingSetGb, verify nextRequiredInput advances to compute demand
  const withMemOnly = createWorkloadDemandRecord({
    workloadFamily: 'VMWARE_VCF',
    workingSetGb: 1024,
    resilienceMode: 'N+1',
    provenance: { workingSetGb: 'CITED_MEASUREMENT' }
  });
  assert.equal(withMemOnly.provenance.workingSetGb, PROVENANCE_VALUES.CITED_MEASUREMENT);

  const draftMissingCores = evaluateWorkloadSizingPilot(withMemOnly);
  assert.equal(draftMissingCores.sizingStatus, 'SIZING_DRAFT_SCENARIO_RANGE');
  assert.equal(draftMissingCores.nextRequiredInput, 'throughputOrConcurrency');
  assert.equal(draftMissingCores.scenarioRange.conservativeScenario.requiredWorkingSetGb, 1024);
  assert.equal(draftMissingCores.scenarioRange.growthBufferedScenario.requiredWorkingSetGb, 1280);

  // Missing candidate perNodeMemoryGb / perNodeCores must NEVER fabricate 512 GB / 64 core defaults
  const missingNodeCap = evaluateWorkloadSizingPilot(
    { workloadFamily: 'VMWARE_VCF', workingSetGb: 256, requiredCores: 32, resilienceMode: 'N+1' },
    { totalNodes: 2 }
  );
  assert.equal(missingNodeCap.isQualified, false);
  assert.equal(missingNodeCap.sizingStatus, 'SIZING_DRAFT_SCENARIO_RANGE');
  assert.equal(missingNodeCap.checks.resilience.status, 'UNKNOWN');
  assert.equal(missingNodeCap.checks.resilience.pass, false);
  assert.equal(missingNodeCap.checks.resilience.perNodeMemoryGb, null);
  assert.equal(missingNodeCap.checks.resilience.perNodeCores, null);
  assert.deepEqual(missingNodeCap.missingCriticalInputs, ['perNodeMemoryGb', 'perNodeCores']);
  assert.equal(missingNodeCap.nextRequiredInput, 'perNodeMemoryGb');
  assert.ok(missingNodeCap.hardConstraintFailures.some(f => f.code === 'MISSING_CANDIDATE_NODE_CAPACITY'));

  const chassisOnlyProfile = buildWorkloadDemandProfile({
    text: 'VMware VCF cluster with 256 GB working set, 32 cores, N+1 HA',
    items: [{ sku: 'P73282-B21', quantity: 2, description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server' }]
  });
  assert.equal(chassisOnlyProfile.sizingEvaluation.isQualified, false);
  assert.equal(chassisOnlyProfile.sizingEvaluation.sizingStatus, 'SIZING_DRAFT_SCENARIO_RANGE');
  assert.ok(chassisOnlyProfile.sizingEvaluation.hardConstraintFailures.some(f => f.code === 'MISSING_CANDIDATE_NODE_CAPACITY'));
});

test('SI-06 [3/10]: VMware VCF N+1 capacity loss math enforces survivingNodes = totalNodes - 1 for working set + growth + cores', () => {
  const demand = createWorkloadDemandRecord({
    workloadFamily: 'VMWARE_VCF',
    throughputOrConcurrency: { value: 200, unit: 'VMs' },
    workingSetGb: 1000,
    requiredCores: 100,
    growthFactor: 1.2, // requires 1200 GB RAM and 120 cores on surviving nodes
    resilienceMode: 'N+1'
  });

  // 3 nodes x 512 GB = 1536 GB raw total (>= 1200 GB), but N+1 survivingNodes = 2 -> 1024 GB (< 1200 GB)
  const threeNodeEval = evaluateWorkloadSizingPilot(demand, {
    totalNodes: 3,
    perNodeMemoryGb: 512,
    perNodeCores: 64
  });
  assert.equal(threeNodeEval.isQualified, false);
  assert.equal(threeNodeEval.sizingStatus, 'SIZED_CONSTRAINT_VIOLATION');
  assert.equal(threeNodeEval.checks.resilience.totalNodes, 3);
  assert.equal(threeNodeEval.checks.resilience.survivingNodes, 2);
  assert.equal(threeNodeEval.checks.resilience.totalMemoryGb, 1536);
  assert.equal(threeNodeEval.checks.resilience.survivingMemoryGb, 1024);
  assert.equal(threeNodeEval.checks.resilience.memoryPass, false);
  assert.equal(threeNodeEval.checks.resilience.memoryDeficitGb, 176);
  assert.equal(threeNodeEval.recommendedCluster.recommendedTotalNodes, 4);
  assert.ok(threeNodeEval.hardConstraintFailures.some(f => f.code === 'N_PLUS_1_FAILOVER_CAPACITY_DEFICIT'));

  // 4 nodes x 512 GB -> survivingNodes = 3 -> 1536 GB (>= 1200 GB) & 192 cores (>= 120 cores)
  const fourNodeEval = evaluateWorkloadSizingPilot(demand, {
    totalNodes: 4,
    perNodeMemoryGb: 512,
    perNodeCores: 64
  });
  assert.equal(fourNodeEval.isQualified, true);
  assert.equal(fourNodeEval.sizingStatus, 'SIZED_QUALIFIED');
  assert.equal(fourNodeEval.checks.resilience.survivingNodes, 3);
  assert.equal(fourNodeEval.checks.resilience.survivingMemoryGb, 1536);
  assert.equal(fourNodeEval.checks.resilience.pass, true);
});

test('SI-06 [4/10]: Raw vs usable RAID storage overhead rejects raw-only fit and qualifies true usable capacity', () => {
  const demand = extractWorkloadDemand({
    workloadFamily: 'VMWARE_VCF',
    workingSetGb: 512,
    requiredCores: 64,
    resilienceMode: 'N+1',
    storageSpec: {
      usableStorageTb: 25,
      raidLevel: 'RAID 6'
    }
  });

  // 8x 3.84 TB = 30.72 TB raw (>= 25 TB), but RAID 6 subtracts 2 parity drives -> 6x 3.84 = 23.04 TB usable (< 25 TB)
  const rawOnlyCandidate = evaluateWorkloadSizingPilot(demand, {
    totalNodes: 2,
    perNodeMemoryGb: 512,
    perNodeCores: 64,
    storage: {
      driveCount: 8,
      driveSizeTb: 3.84,
      raidLevel: 'RAID 6',
      hotSpares: 0
    }
  });
  assert.equal(rawOnlyCandidate.isQualified, false);
  assert.equal(rawOnlyCandidate.checks.storage.candidateRawStorageTb, 30.72);
  assert.equal(rawOnlyCandidate.checks.storage.candidateUsableStorageTb, 23.04);
  assert.equal(rawOnlyCandidate.checks.storage.parityOverheadTb, 7.68);
  assert.equal(rawOnlyCandidate.checks.storage.usableDeficitTb, 1.96);
  assert.equal(rawOnlyCandidate.checks.storage.pass, false);
  assert.equal(rawOnlyCandidate.checks.storage.reason, 'INSUFFICIENT_USABLE_STORAGE_AFTER_RAID_OVERHEAD');

  // 10x 3.84 TB under RAID 6 with 1 hot spare -> 7 data drives = 26.88 TB usable (>= 25 TB)
  const usableCompliantCandidate = evaluateWorkloadSizingPilot(demand, {
    totalNodes: 2,
    perNodeMemoryGb: 512,
    perNodeCores: 64,
    storage: {
      driveCount: 10,
      driveSizeTb: 3.84,
      raidLevel: 'RAID 6',
      hotSpares: 1
    }
  });
  assert.equal(usableCompliantCandidate.isQualified, true);
  assert.equal(usableCompliantCandidate.checks.storage.candidateRawStorageTb, 38.4);
  assert.equal(usableCompliantCandidate.checks.storage.candidateUsableStorageTb, 26.88);
  assert.equal(usableCompliantCandidate.checks.storage.pass, true);
});

test('SI-06 [5/10]: Memory / NUMA channel symmetry & 1DPC vs 2DPC interleaving trade-off and unknown channel width guard', () => {
  const demand = {
    workloadFamily: 'VMWARE_VCF',
    workingSetGb: 512,
    requiredCores: 64,
    resilienceMode: 'N+1'
  };

  // 1DPC optimal (2 sockets, 8 channels/socket, 16 DIMMs)
  const eval1Dpc = evaluateWorkloadSizingPilot(demand, {
    totalNodes: 2,
    perNodeMemoryGb: 512,
    perNodeCores: 64,
    cpuSocketsPerNode: 2,
    perNodeDimms: 16,
    channelWidth: 8
  });
  assert.equal(eval1Dpc.isQualified, true);
  assert.equal(eval1Dpc.checks.numa.interleavingMode, '1DPC_BALANCED_OPTIMAL');
  assert.equal(eval1Dpc.checks.numa.tradeoffClassification, 'PEAK_BANDWIDTH_1DPC');

  // 2DPC balanced capacity trade-off (2 sockets, 8 channels/socket, 32 DIMMs)
  const eval2Dpc = evaluateWorkloadSizingPilot(demand, {
    totalNodes: 2,
    perNodeMemoryGb: 1024,
    perNodeCores: 64,
    cpuSocketsPerNode: 2,
    perNodeDimms: 32,
    channelWidth: 8
  });
  assert.equal(eval2Dpc.isQualified, true);
  assert.equal(eval2Dpc.checks.numa.interleavingMode, '2DPC_BALANCED_MAX_CAPACITY');
  assert.equal(eval2Dpc.checks.numa.tradeoffClassification, 'MAX_CAPACITY_2DPC_SPEED_STEPDOWN_TRADEOFF');

  // Unbalanced population (2 sockets, 8 channels/socket, 12 DIMMs = 6 DIMMs/socket)
  const evalUnbalanced = evaluateWorkloadSizingPilot(demand, {
    totalNodes: 2,
    perNodeMemoryGb: 768,
    perNodeCores: 64,
    cpuSocketsPerNode: 2,
    perNodeDimms: 12,
    channelWidth: 8
  });
  assert.equal(evalUnbalanced.isQualified, false);
  assert.equal(evalUnbalanced.checks.numa.interleavingMode, 'UNBALANCED');
  assert.ok(evalUnbalanced.hardConstraintFailures.some(f => f.code === 'NUMA_SYMMETRY_OR_CHANNEL_VIOLATION'));

  // Unknown channel width must not assume 8 channels (preserves SI-01 invariant)
  const evalUnknownWidth = evaluateWorkloadSizingPilot(demand, {
    totalNodes: 2,
    perNodeMemoryGb: 512,
    perNodeCores: 64,
    cpuSocketsPerNode: 2,
    perNodeDimms: 16,
    channelWidth: null
  });
  assert.equal(evalUnknownWidth.isQualified, false);
  assert.equal(evalUnknownWidth.checks.numa.interleavingMode, 'UNKNOWN_CHANNEL_WIDTH');
  assert.ok(evalUnknownWidth.hardConstraintFailures.some(f => f.code === 'NUMA_CHANNEL_WIDTH_UNKNOWN'));
});

test('SI-06 [6/10]: Required fabric parity rejects speed, protocol, or port-redundancy downgrades', () => {
  const demand = extractWorkloadDemand(
    'VMware VCF cluster with 1024 GB working set, 128 cores, N+1 HA, 100GbE RoCEv2 dual-port fabric parity'
  );
  assert.equal(demand.fabricParityRequired, true);
  assert.equal(demand.fabricSpec.protocol, 'ROCEV2');
  assert.equal(demand.fabricSpec.minSpeedGbps, 100);
  assert.equal(demand.fabricSpec.minPortsPerNode, 2);
  assert.equal(demand.fabricSpec.redundancyRequired, true);

  const downgradedFabricEval = evaluateWorkloadSizingPilot(demand, {
    totalNodes: 3,
    perNodeMemoryGb: 512,
    perNodeCores: 64,
    fabric: { protocol: 'ETHERNET', speedGbps: 25, portsPerNode: 1, redundant: false }
  });
  assert.equal(downgradedFabricEval.isQualified, false);
  assert.equal(downgradedFabricEval.checks.fabricParity.pass, false);
  assert.equal(downgradedFabricEval.checks.fabricParity.violations.length, 4);

  const compliantFabricEval = evaluateWorkloadSizingPilot(demand, {
    totalNodes: 3,
    perNodeMemoryGb: 512,
    perNodeCores: 64,
    fabric: { protocol: 'RoCEv2', speedGbps: 100, portsPerNode: 2, redundant: true }
  });
  assert.equal(compliantFabricEval.isQualified, true);
  assert.equal(compliantFabricEval.checks.fabricParity.pass, true);
});

test('SI-06 [7/10]: Explicit service requirement blocks default/lower SLA or shorter duration', () => {
  const demand = extractWorkloadDemand(
    'VMware VCF cluster with 1024 GB working set, 128 cores, N+1 HA, 5-year Tech Care Critical with CDMR support'
  );
  assert.ok(demand.explicitServiceRequirement);
  assert.equal(demand.explicitServiceRequirement.required, true);
  assert.equal(demand.explicitServiceRequirement.slaLevel, 'CRITICAL');
  assert.equal(demand.explicitServiceRequirement.durationYears, 5);
  assert.equal(demand.explicitServiceRequirement.retention, 'CDMR');

  // Default 3-year Basic service must fail explicit 5-year Critical + CDMR requirement
  const basic3YrEval = evaluateWorkloadSizingPilot(demand, {
    totalNodes: 3,
    perNodeMemoryGb: 512,
    perNodeCores: 64,
    service: { slaLevel: 'Basic', durationYears: 3, retention: null }
  });
  assert.equal(basic3YrEval.isQualified, false);
  assert.equal(basic3YrEval.checks.explicitService.pass, false);
  assert.equal(basic3YrEval.checks.explicitService.violations.length, 3);

  // Exact 5-year Critical with CDMR passes
  const critical5YrEval = evaluateWorkloadSizingPilot(demand, {
    totalNodes: 3,
    perNodeMemoryGb: 512,
    perNodeCores: 64,
    service: { slaLevel: 'Critical', durationYears: 5, retention: 'CDMR' }
  });
  assert.equal(critical5YrEval.isQualified, true);
  assert.equal(critical5YrEval.checks.explicitService.pass, true);
});

test('SI-06 [8/10]: Pareto frontier preserves null prices, null/stale lead times, and QUOTE/LIST/HISTORICAL metadata', () => {
  const nowMs = Date.parse('2026-11-19T12:00:00Z');
  const freshIso = '2026-11-19T08:00:00Z';
  const staleIso = '2026-11-10T08:00:00Z'; // > 72h old

  const candidates = [
    {
      candidateId: 'CAND_QUOTE_FRESH',
      name: 'Quoted Fast Candidate',
      physicalMathClean: true,
      totalCostUsd: 15000,
      pricingComplete: true,
      priceBasis: 'QUOTE',
      currency: 'USD',
      region: 'US-EAST',
      observedAt: freshIso,
      leadTimeDays: 7,
      leadTimeObservedAt: freshIso,
      performanceScore: 100,
      skuPartsList: [{ sku: 'P73282-B21', quantity: 1, unitPriceUsd: 15000 }]
    },
    {
      candidateId: 'CAND_NULL_PRICE',
      name: 'Unpriced High-Capacity Candidate',
      physicalMathClean: true,
      totalCostUsd: null,
      pricingComplete: false,
      priceBasis: null,
      currency: 'USD',
      region: 'US-EAST',
      observedAt: freshIso,
      leadTimeDays: 7,
      leadTimeObservedAt: freshIso,
      performanceScore: 100,
      skuPartsList: [{ sku: 'P73282-B21', quantity: 1 }, { sku: 'P99991-B21', quantity: 2 }]
    },
    {
      candidateId: 'CAND_STALE_LEAD',
      name: 'Stale 2-Day Lead Time Candidate',
      physicalMathClean: true,
      totalCostUsd: 15000,
      pricingComplete: true,
      priceBasis: 'HISTORICAL',
      currency: 'USD',
      region: 'EU-WEST',
      observedAt: staleIso,
      leadTimeDays: 2,
      leadTimeObservedAt: staleIso,
      performanceScore: 100,
      skuPartsList: [{ sku: 'P73282-B21', quantity: 1 }, { sku: 'P88881-B21', quantity: 1 }]
    },
    {
      candidateId: 'CAND_LIST_DOMINATED',
      name: 'Dominated List-Price Slow Candidate',
      physicalMathClean: true,
      totalCostUsd: 19500,
      pricingComplete: true,
      priceBasis: 'LIST',
      currency: 'USD',
      region: 'US-EAST',
      observedAt: freshIso,
      leadTimeDays: 21,
      leadTimeObservedAt: freshIso,
      performanceScore: 90,
      skuPartsList: [{ sku: 'P73282-B21', quantity: 1 }, { sku: 'P77771-B21', quantity: 1 }]
    }
  ];

  const pareto = computeParetoFrontier(candidates, {
    nowMs,
    searchSpaceComplete: true,
    product: 'DL380_Gen12'
  });

  const frontierIds = pareto.frontierCandidates.map(c => c.candidateId);
  const dominatedIds = pareto.dominatedCandidates.map(c => c.candidateId);

  // 1. CAND_NULL_PRICE must NOT be converted to $0 and must NOT dominate CAND_QUOTE_FRESH
  assert.ok(frontierIds.includes('CAND_QUOTE_FRESH'), 'Fresh quoted candidate must remain on Pareto frontier');
  const nullPriceCand = pareto.frontierCandidates.find(c => c.candidateId === 'CAND_NULL_PRICE');
  assert.ok(nullPriceCand, 'Null-price candidate remains undominated with unknown cost');
  assert.equal(nullPriceCand.priceMetadata.costUsd, null);
  assert.equal(nullPriceCand.priceMetadata.priceBasis, null);

  // 2. CAND_STALE_LEAD (stale 2d) must NOT dominate CAND_QUOTE_FRESH (fresh 7d)
  const staleCand = pareto.frontierCandidates.find(c => c.candidateId === 'CAND_STALE_LEAD');
  assert.ok(staleCand);
  assert.equal(staleCand.leadTimeMetadata.leadTimeDays, 2);
  assert.equal(staleCand.leadTimeMetadata.isStaleLeadTime, true);
  assert.equal(staleCand.leadTimeMetadata.comparableLeadTimeDays, null);
  assert.equal(staleCand.priceMetadata.priceBasis, 'HISTORICAL');
  assert.equal(staleCand.priceMetadata.region, 'EU-WEST');

  // 3. CAND_LIST_DOMINATED ($19.5k, 21d, perf 90) is dominated by CAND_QUOTE_FRESH ($15k, 7d, perf 100)
  assert.deepEqual(dominatedIds, ['CAND_LIST_DOMINATED']);
  assert.equal(pareto.dominatedCandidates[0].priceMetadata.priceBasis, 'LIST');

  // 4. Minimum cost claim ignores null price ($15,000, never $0) and sets isGlobalMinimum: false because an eligible price is null
  assert.equal(pareto.minimumCostClaim.lowestKnownCostUsd, 15000);
  assert.equal(pareto.minimumCostClaim.lowestKnownCostCandidateId, 'CAND_QUOTE_FRESH');
  assert.equal(pareto.isGlobalMinimum, false);

  // 5. Candidate with a subtotal but a part marked priceKnown: false must stay pricingComplete: false & costUsd: null
  const partialPartPareto = computeParetoFrontier([
    {
      candidateId: 'CAND_PARTIAL_PART_UNPRICED',
      name: 'Partial Part Unpriced',
      physicalMathClean: true,
      totalCostUsd: 9000,
      leadTimeDays: 7,
      skuPartsList: [
        { sku: 'P73282-B21', quantity: 1, unitPriceUsd: 9000, priceKnown: true },
        { sku: 'P99999-B21', quantity: 1, unitPriceUsd: 0, priceKnown: false }
      ]
    }
  ], { searchSpaceComplete: true });
  assert.equal(partialPartPareto.frontierCandidates[0].priceMetadata.pricingComplete, false);
  assert.equal(partialPartPareto.frontierCandidates[0].priceMetadata.costUsd, null);
  assert.equal(partialPartPareto.isGlobalMinimum, false);
});

test('SI-06 [9/10]: Deterministic closest-rank ordering (changed SKU lines first, then changed units) is invariant under input permutations', () => {
  const baselineItems = [
    { sku: 'P73282-B21', quantity: 1, description: 'DL380 Gen12 Chassis' },
    { sku: 'P67088-B21', quantity: 2, description: 'Xeon Processor' },
    { sku: 'P64707-B21', quantity: 8, description: '64GB DDR5 Memory' }
  ];

  // Cand A: 1 changed SKU line (+2 DIMMs on existing memory SKU -> 1 line changed, 2 units changed)
  const cand1Line2Units = {
    candidateId: 'CAND_1_LINE_2_UNITS',
    name: 'One Line Two Units',
    physicalMathClean: true,
    totalCostUsd: 16000,
    pricingComplete: true,
    leadTimeDays: 10,
    skuPartsList: [
      { sku: 'P73282-B21', quantity: 1 },
      { sku: 'P67088-B21', quantity: 2 },
      { sku: 'P64707-B21', quantity: 10 }
    ]
  };

  // Cand B: 1 changed SKU line (+1 accessory SKU -> 1 line changed, 1 unit changed) -> beats Cand A on changedUnits!
  const cand1Line1Unit = {
    candidateId: 'CAND_1_LINE_1_UNIT',
    name: 'One Line One Unit',
    physicalMathClean: true,
    totalCostUsd: 16500,
    pricingComplete: true,
    leadTimeDays: 12,
    skuPartsList: [
      { sku: 'P73282-B21', quantity: 1 },
      { sku: 'P67088-B21', quantity: 2 },
      { sku: 'P64707-B21', quantity: 8 },
      { sku: 'P48820-B21', quantity: 1 }
    ]
  };

  // Cand C: 2 changed SKU lines (+1 fan, +1 battery -> 2 lines changed, 2 units changed) -> loses to Cand A (1 line, 2 units)
  const cand2Lines2Units = {
    candidateId: 'CAND_2_LINES_2_UNITS',
    name: 'Two Lines Two Units',
    physicalMathClean: true,
    totalCostUsd: 14000,
    pricingComplete: true,
    leadTimeDays: 5,
    skuPartsList: [
      { sku: 'P73282-B21', quantity: 1 },
      { sku: 'P67088-B21', quantity: 2 },
      { sku: 'P64707-B21', quantity: 8 },
      { sku: 'P48820-B21', quantity: 1 },
      { sku: 'P01366-B21', quantity: 1 }
    ]
  };

  // Cand D: tied with Cand B on lines (1) and units (1), different SKU for canonical tie-breaker
  const cand1Line1UnitTie = {
    candidateId: 'CAND_1_LINE_1_UNIT_TIE',
    name: 'One Line One Unit Tie',
    physicalMathClean: true,
    totalCostUsd: 16500,
    pricingComplete: true,
    leadTimeDays: 12,
    skuPartsList: [
      { sku: 'P73282-B21', quantity: 1 },
      { sku: 'P67088-B21', quantity: 2 },
      { sku: 'P64707-B21', quantity: 8 },
      { sku: 'P52343-B21', quantity: 1 }
    ]
  };

  const permutations = [
    [cand2Lines2Units, cand1Line2Units, cand1Line1UnitTie, cand1Line1Unit],
    [cand1Line1Unit, cand1Line2Units, cand2Lines2Units, cand1Line1UnitTie],
    [cand1Line1UnitTie, cand2Lines2Units, cand1Line1Unit, cand1Line2Units],
    [cand1Line2Units, cand1Line1Unit, cand1Line1UnitTie, cand2Lines2Units]
  ];

  const expectedOrder = [
    'CAND_1_LINE_1_UNIT',
    'CAND_1_LINE_1_UNIT_TIE',
    'CAND_1_LINE_2_UNITS',
    'CAND_2_LINES_2_UNITS'
  ];

  for (const perm of permutations) {
    const ranked = rankQualifiedCandidatesDeterministically(perm, { baselineItems });
    assert.deepEqual(
      ranked.map(c => c.candidateId),
      expectedOrder,
      'Permutation must produce identical deterministic closest-rank ordering'
    );
    assert.equal(ranked[0].changedSkuLines, 1);
    assert.equal(ranked[0].changedUnits, 1);
    assert.equal(ranked[2].changedSkuLines, 1);
    assert.equal(ranked[2].changedUnits, 2);
    assert.equal(ranked[3].changedSkuLines, 2);
    assert.equal(ranked[3].changedUnits, 2);
    assert.equal(ranked[0].workloadTradeoffs.separatedFromEligibility, true);
  }
});

test('SI-06 [10/10]: Cheap hard-requirement-violating candidate is disqualified before ranking; evaluatedCandidateSet & isGlobalMinimum guard enforced', () => {
  const baselineItems = [
    { sku: 'P73282-B21', quantity: 1, description: 'DL380 Gen12 Chassis' }
  ];

  const cheapViolatingReq = {
    candidateId: 'CHEAP_VIOLATES_REQ',
    name: 'Attractive Cheap Violator ($4,000)',
    physicalMathClean: true,
    totalCostUsd: 4000,
    estimatedCostUsd: 4000,
    pricingComplete: true,
    priceBasis: 'QUOTE',
    leadTimeDays: 2,
    performanceScore: 150,
    requirementCoverage: { blocksPositiveRecommendation: true },
    skuPartsList: [{ sku: 'P73282-B21', quantity: 1, unitPriceUsd: 4000 }]
  };

  const cheapViolatingFabric = {
    candidateId: 'CHEAP_VIOLATES_FABRIC',
    name: 'Cheap Fabric Violator ($5,000)',
    physicalMathClean: true,
    totalCostUsd: 5000,
    estimatedCostUsd: 5000,
    pricingComplete: true,
    priceBasis: 'LIST',
    leadTimeDays: 3,
    performanceScore: 140,
    fabricParity: { pass: false, status: 'FAIL', violations: ['25GbE < 100GbE required'] },
    skuPartsList: [{ sku: 'P73282-B21', quantity: 1, unitPriceUsd: 5000 }]
  };

  const compliantStandard = {
    candidateId: 'COMPLIANT_STANDARD',
    name: 'Compliant Standard ($14,500)',
    physicalMathClean: true,
    totalCostUsd: 14500,
    estimatedCostUsd: 14500,
    pricingComplete: true,
    priceBasis: 'QUOTE',
    leadTimeDays: 10,
    performanceScore: 100,
    requirementCoverage: { blocksPositiveRecommendation: false },
    fabricParity: { pass: true, status: 'PASS', violations: [] },
    explicitServiceRequirement: { pass: true, status: 'PASS', violations: [] },
    skuPartsList: [
      { sku: 'P73282-B21', quantity: 1, unitPriceUsd: 12000 },
      { sku: 'P48820-B21', quantity: 1, unitPriceUsd: 2500 }
    ]
  };

  // 1. Pre-ranking qualification isolates both cheap violators into disqualifiedCandidates
  const qual = qualifyCandidatesBeforeRanking([cheapViolatingReq, cheapViolatingFabric, compliantStandard]);
  assert.equal(qual.qualifiedCandidates.length, 1);
  assert.equal(qual.qualifiedCandidates[0].candidateId, 'COMPLIANT_STANDARD');
  assert.equal(qual.disqualifiedCandidates.length, 2);

  // 2. scoreAndSortCandidates places compliant candidate at index 0 ahead of cheap violators
  const rawForSynthesizer = [cheapViolatingReq, cheapViolatingFabric, compliantStandard].map(c => ({ ...c }));
  scoreAndSortCandidates(rawForSynthesizer, baselineItems);
  assert.equal(rawForSynthesizer[0].candidateId, 'COMPLIANT_STANDARD');
  assert.equal(rawForSynthesizer[0].qualifiedForRecommendation, true);
  assert.equal(rawForSynthesizer[0].changedSkuLines, 1);
  assert.equal(rawForSynthesizer[1].qualifiedForRecommendation, false);
  assert.equal(rawForSynthesizer[2].qualifiedForRecommendation, false);

  // Unnamed candidates and prioritizeFastShipAsRank2 must not leak qualification or promote disqualified Fast-Ship to Rank 2
  const unnamedPair = [
    {
      physicalMathClean: true,
      score: 0.9,
      requirementCoverage: { blocksPositiveRecommendation: false },
      skuPartsList: [{ sku: 'P73282-B21', quantity: 1 }, { sku: 'P48820-B21', quantity: 1 }, { sku: 'P01366-B21', quantity: 1 }]
    },
    {
      physicalMathClean: true,
      score: 0.99,
      isFastShipRank2: true,
      requirementCoverage: { blocksPositiveRecommendation: true },
      skuPartsList: [{ sku: 'P73282-B21', quantity: 1 }]
    },
    {
      physicalMathClean: true,
      score: 0.9,
      requirementCoverage: { blocksPositiveRecommendation: false },
      skuPartsList: [{ sku: 'P73282-B21', quantity: 1 }, { sku: 'P48820-B21', quantity: 3 }]
    }
  ];
  scoreAndSortCandidates(unnamedPair, baselineItems, undefined, { prioritizeFastShipAsRank2: true });
  assert.equal(unnamedPair[0].qualifiedForRecommendation, true);
  assert.equal(unnamedPair[0].changedSkuLines, 1); // 1 changed SKU line beats 2 changed SKU lines even with 3 units
  assert.equal(unnamedPair[1].qualifiedForRecommendation, true);
  assert.equal(unnamedPair[1].changedSkuLines, 2);
  assert.equal(unnamedPair[2].qualifiedForRecommendation, false);
  assert.equal(unnamedPair[2].isFastShipRank2, true);

  // 3. computeParetoFrontier excludes disqualified candidates & enforces searchSpaceComplete for isGlobalMinimum
  const incompleteScopePareto = computeParetoFrontier(
    [cheapViolatingReq, cheapViolatingFabric, compliantStandard],
    { searchSpaceComplete: false, product: 'DL380_Gen12' }
  );
  assert.equal(incompleteScopePareto.frontierCandidates.length, 1);
  assert.equal(incompleteScopePareto.frontierCandidates[0].candidateId, 'COMPLIANT_STANDARD');
  assert.equal(incompleteScopePareto.disqualifiedCandidates.length, 2);
  assert.equal(incompleteScopePareto.evaluatedCandidateSet.totalCandidatesEvaluated, 3);
  assert.equal(incompleteScopePareto.evaluatedCandidateSet.eligibleCandidateCount, 1);
  assert.equal(incompleteScopePareto.evaluatedCandidateSet.disqualifiedCandidateCount, 2);
  assert.equal(incompleteScopePareto.evaluatedCandidateSet.searchSpaceComplete, false);
  assert.equal(incompleteScopePareto.isGlobalMinimum, false);
  assert.equal(incompleteScopePareto.minimumCostClaim.lowestKnownCostUsd, 14500);
  assert.equal(incompleteScopePareto.minimumCostClaim.claimScope, 'SCOPED_TO_EVALUATED_CANDIDATE_SET_ONLY');

  const completeScopePareto = computeParetoFrontier(
    [cheapViolatingReq, compliantStandard],
    { searchSpaceComplete: true, product: 'DL380_Gen12' }
  );
  assert.equal(completeScopePareto.evaluatedCandidateSet.searchSpaceComplete, true);
  assert.equal(completeScopePareto.evaluatedCandidateSet.allEligiblePricesKnown, true);
  assert.equal(completeScopePareto.isGlobalMinimum, true);
  assert.equal(completeScopePareto.minimumCostClaim.claimScope, 'GLOBAL_MINIMUM_IN_COMPLETE_DECLARED_SCOPE');

  // 4. Verify workload_dna.js & strategy_synthesizer.js additive integrations + EDT prefix fix preservation
  assert.equal(parseLeadTimeDays('EDT 10 - 14 days'), 12);
  assert.equal(parseLeadTimeDays('EDT: 7 business days'), 7);

  const dna = extractWorkloadDna([{ sku: 'CUSTOM-CPU', quantity: 2, description: 'Custom 32-core Processor' }]);
  assert.equal(dna.numaTopology.interleavingMode, 'UNKNOWN_CHANNEL_WIDTH');
  assert.equal(dna.storageWorkload, 'NONE');
  assert.equal(dna.gpuPowerBasis, 'NONE');

  const profile = buildWorkloadDemandProfile({
    text: 'VMware VCF cluster with 1024 GB working set, 128 cores, 20% growth, N+1 HA',
    candidate: { totalNodes: 4, perNodeMemoryGb: 512, perNodeCores: 64 }
  });
  assert.equal(profile.demandRecord.workloadFamily, 'VMWARE_VCF');
  assert.equal(profile.sizingEvaluation.isQualified, true);

  const tiers = synthesize5TierRankedSolutions(baselineItems, { missingDependencies: [] }, {}, { model: 'DL380 Gen12' });
  assert.equal(tiers.length, 5);
  assert.ok(tiers.paretoFrontier);
  assert.ok(tiers.evaluatedCandidateSet);
});
