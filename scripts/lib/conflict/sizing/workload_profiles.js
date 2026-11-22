'use strict';

/**
 * scripts/lib/conflict/sizing/workload_profiles.js
 *
 * Authoritative Reference Architecture Sizing Profiles & Domain-Specific Checks
 * across all 7 Enterprise Workload Families:
 *   1. VMWARE_VCF
 *   2. SAP_HANA
 *   3. AI_INFERENCE_TRAINING
 *   4. MICROSOFT_SQL_OLTP
 *   5. VDI_ENTERPRISE
 *   6. BIG_DATA_KAFKA
 *   7. HPC_COMPUTE
 *
 * Every derived metric carries explicit provenance (CITED_MEASUREMENT vs ASSUMPTION).
 * Unknown / unlisted workload families are never extrapolated.
 */

const PROVENANCE = Object.freeze({
  USER_FACT: 'USER_FACT',
  CITED_MEASUREMENT: 'CITED_MEASUREMENT',
  ASSUMPTION: 'ASSUMPTION',
  ESTIMATE: 'ESTIMATE',
  MISSING: 'MISSING'
});

const WORKLOAD_SIZING_PROFILES = Object.freeze({
  VMWARE_VCF: Object.freeze({
    family: 'VMWARE_VCF',
    displayName: 'VMware Cloud Foundation / vSphere Virtualization',
    memoryToCoreRatioGb: Object.freeze({ min: 4, typical: 8, max: 16 }),
    vcpuToPcoreRatio: Object.freeze({ typical: 4, max: 6 }),
    defaultResilienceMode: 'N+1',
    numaPolicy: 'BALANCED_PREFERRED',
    referenceArchitecture: Object.freeze({
      sourceId: 'HPE-RA-VMWARE-VCF-GEN12',
      citation: 'HPE Reference Architecture for VMware Cloud Foundation on ProLiant Gen12',
      basisType: 'CITED_VENDOR_GUIDE'
    })
  }),
  SAP_HANA: Object.freeze({
    family: 'SAP_HANA',
    displayName: 'SAP HANA Tailored Datacenter Integration (TDI)',
    memoryToCoreRatioGb: Object.freeze({ min: 8, typical: 16, max: 32 }),
    tdiCertifiedSymmetryRequired: true,
    storageMultipliers: Object.freeze({ dataFactor: 1.2, logFactor: 0.5, logCapGb: 512, sharedFactor: 1.0, sharedCapGb: 1024 }),
    recommendedRaidLevels: Object.freeze(['RAID 10']),
    defaultResilienceMode: 'N+1',
    numaPolicy: 'STRICT_BALANCED_TDI',
    referenceArchitecture: Object.freeze({
      sourceId: 'HPE-RA-SAP-HANA-TDI-GEN12',
      citation: 'HPE Reference Configuration for SAP HANA Tailored Datacenter Integration (TDI)',
      basisType: 'CITED_VENDOR_GUIDE'
    })
  }),
  AI_INFERENCE_TRAINING: Object.freeze({
    family: 'AI_INFERENCE_TRAINING',
    displayName: 'AI / LLM Inference & Training',
    memoryToCoreRatioGb: Object.freeze({ min: 4, typical: 8, max: 16 }),
    hostRamToVramRatioMin: 1.5,
    precisionBytesPerParam: Object.freeze({
      FP32: 4,
      BF16: 2,
      FP16: 2,
      FP8: 1,
      INT8: 1,
      INT4: 0.5
    }),
    vramOverheadMultiplier: Object.freeze({
      INFERENCE: 1.25,
      TRAINING: 4.0
    }),
    minInterconnectGbps: Object.freeze({
      INFERENCE: 100,
      TRAINING: 200
    }),
    defaultResilienceMode: 'N+1',
    numaPolicy: 'BALANCED_PREFERRED',
    referenceArchitecture: Object.freeze({
      sourceId: 'HPE-RA-AI-LLM-DL380A-GEN12',
      citation: 'HPE Private Cloud AI & ProLiant Compute DL380a Gen12 GPU Sizing Reference',
      basisType: 'CITED_VENDOR_GUIDE'
    })
  }),
  MICROSOFT_SQL_OLTP: Object.freeze({
    family: 'MICROSOFT_SQL_OLTP',
    displayName: 'Microsoft SQL Server / Transactional OLTP RDBMS',
    memoryToCoreRatioGb: Object.freeze({ min: 4, typical: 8, max: 16 }),
    preferredRaidLevels: Object.freeze(['RAID 10']),
    highWriteIopsThreshold: 20000,
    perDriveIops: Object.freeze({ NVME: 50000, SAS_SSD: 15000, SATA_SSD: 8000, HDD: 180 }),
    targetMaxLatencyMs: 2.0,
    defaultResilienceMode: 'N+1',
    numaPolicy: 'BALANCED_PREFERRED',
    referenceArchitecture: Object.freeze({
      sourceId: 'HPE-RA-MSSQL-OLTP-GEN12',
      citation: 'HPE Reference Architecture for Microsoft SQL Server OLTP on ProLiant Gen12',
      basisType: 'CITED_VENDOR_GUIDE'
    })
  }),
  VDI_ENTERPRISE: Object.freeze({
    family: 'VDI_ENTERPRISE',
    displayName: 'Enterprise VDI (Omnissa Horizon / Citrix)',
    memoryToCoreRatioGb: Object.freeze({ min: 4, typical: 8, max: 12 }),
    userTiers: Object.freeze({
      TASK_WORKER: Object.freeze({ vcpu: 2, ramGb: 4, vgpuGb: 0, maxVcpuPerPcore: 6 }),
      KNOWLEDGE_WORKER: Object.freeze({ vcpu: 4, ramGb: 8, vgpuGb: 1, maxVcpuPerPcore: 5 }),
      POWER_USER: Object.freeze({ vcpu: 6, ramGb: 16, vgpuGb: 2, maxVcpuPerPcore: 4 }),
      CAD_3D: Object.freeze({ vcpu: 8, ramGb: 32, vgpuGb: 4, maxVcpuPerPcore: 3 })
    }),
    defaultResilienceMode: 'N+1',
    numaPolicy: 'BALANCED_PREFERRED',
    referenceArchitecture: Object.freeze({
      sourceId: 'HPE-RA-VDI-HORIZON-CITRIX-GEN12',
      citation: 'HPE Reference Architecture for Enterprise VDI (Horizon / Citrix) on ProLiant Gen12',
      basisType: 'CITED_VENDOR_GUIDE'
    })
  }),
  BIG_DATA_KAFKA: Object.freeze({
    family: 'BIG_DATA_KAFKA',
    displayName: 'Big Data / Apache Kafka & Spark Scale-Out',
    memoryToCoreRatioGb: Object.freeze({ min: 4, typical: 8, max: 16 }),
    defaultReplicationFactor: 3,
    minQuorumNodes: 3,
    storageHeadroomMultiplier: 1.25,
    minEastWestFabricGbps: 25,
    defaultResilienceMode: 'N+1',
    numaPolicy: 'BALANCED_PREFERRED',
    referenceArchitecture: Object.freeze({
      sourceId: 'HPE-RA-BIGDATA-KAFKA-SPARK',
      citation: 'HPE Reference Architecture for Apache Kafka & Spark Distributed Data Platforms',
      basisType: 'CITED_VENDOR_GUIDE'
    })
  }),
  HPC_COMPUTE: Object.freeze({
    family: 'HPC_COMPUTE',
    displayName: 'High-Performance Computing (MPI / CFD / CAE)',
    memoryToCoreRatioGb: Object.freeze({ min: 2, typical: 4, max: 8 }),
    minInterconnectGbps: 100,
    preferredInterconnectProtocols: Object.freeze(['INFINIBAND', 'ROCEV2']),
    defaultResilienceMode: 'NONE',
    numaPolicy: '1DPC_BANDWIDTH_OPTIMAL',
    referenceArchitecture: Object.freeze({
      sourceId: 'HPE-RA-HPC-MPI-GEN12',
      citation: 'HPE Cray & ProLiant Compute HPC Cluster MPI Reference Architecture',
      basisType: 'CITED_VENDOR_GUIDE'
    })
  })
});

function _toPosNum(val) {
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function getWorkloadReferenceProfile(family) {
  const key = String(family || '').trim().toUpperCase();
  return WORKLOAD_SIZING_PROFILES[key] || null;
}

function _deriveAiVramRequirement(rawInput, profile) {
  const explicitVram = _toPosNum(rawInput.requiredVramGb);
  if (explicitVram) {
    return {
      requiredVramGb: explicitVram,
      provenance: PROVENANCE.USER_FACT,
      precision: String(rawInput.precision || 'BF16').toUpperCase(),
      aiMode: String(rawInput.aiMode || 'INFERENCE').toUpperCase(),
      modelParamsBillions: _toPosNum(rawInput.modelParamsBillions),
      formula: `explicit requiredVramGb = ${explicitVram} GB`
    };
  }
  const paramsB = _toPosNum(rawInput.modelParamsBillions);
  if (!paramsB) return null;
  const precision = String(rawInput.precision || 'BF16').toUpperCase();
  const bytesPerParam = profile.precisionBytesPerParam[precision] || profile.precisionBytesPerParam.BF16;
  const aiMode = String(rawInput.aiMode || 'INFERENCE').toUpperCase() === 'TRAINING' ? 'TRAINING' : 'INFERENCE';
  const overhead = _toPosNum(rawInput.kvCacheOverheadFactor) || profile.vramOverheadMultiplier[aiMode];
  const requiredVramGb = Number((paramsB * bytesPerParam * overhead).toFixed(2));
  const provenance = (rawInput.precision && rawInput.aiMode)
    ? PROVENANCE.CITED_MEASUREMENT
    : PROVENANCE.ASSUMPTION;
  return {
    requiredVramGb,
    provenance,
    precision,
    aiMode,
    modelParamsBillions: paramsB,
    overheadMultiplier: overhead,
    formula: `${paramsB}B params * ${bytesPerParam} B/param (${precision}) * ${overhead}x (${aiMode}) = ${requiredVramGb} GB VRAM`
  };
}

function _deriveVdiDemand(rawInput, profile) {
  const users = _toPosNum(rawInput.vdiUsers)
    || (_toPosNum(rawInput.throughputOrConcurrency?.value) && /user|desktop|vdi|seat/i.test(String(rawInput.throughputOrConcurrency?.unit || ''))
      ? _toPosNum(rawInput.throughputOrConcurrency.value)
      : null);
  if (!users) return null;
  const tierKey = String(rawInput.vdiTier || 'KNOWLEDGE_WORKER').trim().toUpperCase();
  const tier = profile.userTiers[tierKey] || profile.userTiers.KNOWLEDGE_WORKER;
  const derivedWorkingSetGb = Number((users * tier.ramGb).toFixed(2));
  const derivedCores = Math.ceil((users * tier.vcpu) / tier.maxVcpuPerPcore);
  const derivedVgpuGb = Number((users * tier.vgpuGb).toFixed(2));
  const provenance = rawInput.vdiTier ? PROVENANCE.CITED_MEASUREMENT : PROVENANCE.ASSUMPTION;
  return {
    users,
    tierKey,
    tier,
    derivedWorkingSetGb,
    derivedCores,
    derivedVgpuGb,
    provenance
  };
}

function deriveProfileDemandOverrides(rawInput = {}, demandRecord = {}, profile = null) {
  if (!profile) return { workingSetGb: null, requiredCores: null, derivedProvenance: {}, details: null };
  const derivedProvenance = {};
  let workingSetGb = null;
  let requiredCores = null;
  let details = null;

  if (profile.family === 'AI_INFERENCE_TRAINING') {
    const ai = _deriveAiVramRequirement(rawInput, profile);
    if (ai) {
      details = ai;
      if (!_toPosNum(demandRecord.workingSetGb)) {
        workingSetGb = Number((ai.requiredVramGb * profile.hostRamToVramRatioMin).toFixed(2));
        derivedProvenance.workingSetGb = ai.provenance;
      }
      if (!_toPosNum(demandRecord.requiredCores)) {
        requiredCores = Math.max(16, Math.ceil(workingSetGb ? workingSetGb / profile.memoryToCoreRatioGb.typical : 32));
        derivedProvenance.requiredCores = PROVENANCE.ASSUMPTION;
      }
    }
  } else if (profile.family === 'VDI_ENTERPRISE') {
    const vdi = _deriveVdiDemand(rawInput, profile);
    if (vdi) {
      details = vdi;
      if (!_toPosNum(demandRecord.workingSetGb)) {
        workingSetGb = vdi.derivedWorkingSetGb;
        derivedProvenance.workingSetGb = vdi.provenance;
      }
      if (!_toPosNum(demandRecord.requiredCores)) {
        requiredCores = vdi.derivedCores;
        derivedProvenance.requiredCores = vdi.provenance;
      }
    }
  } else if (profile.family === 'SAP_HANA' && _toPosNum(demandRecord.workingSetGb) && !_toPosNum(demandRecord.requiredCores)) {
    requiredCores = Math.max(16, Math.ceil(demandRecord.workingSetGb / profile.memoryToCoreRatioGb.typical));
    derivedProvenance.requiredCores = PROVENANCE.ASSUMPTION;
    details = { derivedCoresFromTdiRatio: requiredCores, memoryToCoreRatioGb: profile.memoryToCoreRatioGb.typical };
  }

  return { workingSetGb, requiredCores, derivedProvenance, details };
}

function _evalSapHanaChecks(profile, ctx) {
  const { numa, resilience, storage, effectiveWorkingSetGb } = ctx;
  const violations = [];
  const advisories = [];

  if (numa && numa.status !== 'NOT_PROVIDED' && !numa.isBalancedInterleaving) {
    violations.push({
      code: 'SAP_HANA_TDI_SYMMETRY_VIOLATION',
      domain: 'WORKLOAD_SPECIFIC_SAP_HANA',
      message: `SAP HANA TDI certification requires full-channel balanced 1DPC or 2DPC DIMM symmetry; detected ${numa.interleavingMode}.`
    });
  }
  const perNodeMem = _toPosNum(resilience?.perNodeMemoryGb);
  const perNodeCores = _toPosNum(resilience?.perNodeCores);
  if (perNodeMem && perNodeCores) {
    const ratio = Number((perNodeMem / perNodeCores).toFixed(2));
    if (ratio < profile.memoryToCoreRatioGb.min) {
      violations.push({
        code: 'SAP_HANA_MEMORY_TO_CORE_UNDERPROVISIONED',
        domain: 'WORKLOAD_SPECIFIC_SAP_HANA',
        message: `SAP HANA node memory-to-core ratio (${ratio} GB/core) is below TDI minimum (${profile.memoryToCoreRatioGb.min} GB/core).`
      });
    } else if (ratio > profile.memoryToCoreRatioGb.max) {
      advisories.push(`SAP HANA node memory-to-core ratio (${ratio} GB/core) exceeds typical OLTP TDI ceiling (${profile.memoryToCoreRatioGb.max} GB/core); verify certified SAP HANA sizing table.`);
    }
  }

  const m = profile.storageMultipliers;
  const dataGb = effectiveWorkingSetGb * m.dataFactor;
  const logGb = Math.min(effectiveWorkingSetGb * m.logFactor, m.logCapGb);
  const sharedGb = Math.min(effectiveWorkingSetGb * m.sharedFactor, m.sharedCapGb);
  const recommendedMinTdiStorageTb = Number(((dataGb + logGb + sharedGb) / 1024).toFixed(2));
  if (storage && storage.status !== 'NOT_APPLICABLE' && _toPosNum(storage.candidateUsableStorageTb) && storage.candidateUsableStorageTb < recommendedMinTdiStorageTb) {
    violations.push({
      code: 'SAP_HANA_TDI_STORAGE_DEFICIT',
      domain: 'WORKLOAD_SPECIFIC_SAP_HANA',
      message: `SAP HANA TDI persistence (Data 1.2x + Log 0.5x + Shared) requires >= ${recommendedMinTdiStorageTb} TB usable; candidate provides ${storage.candidateUsableStorageTb} TB.`
    });
  }

  return {
    family: 'SAP_HANA',
    pass: violations.length === 0,
    status: violations.length === 0 ? 'PASS' : 'FAIL',
    metrics: { recommendedMinTdiStorageTb, tdiSymmetryRequired: true },
    violations,
    advisories
  };
}

function _evalAiChecks(profile, ctx) {
  const { rawInput, candidate, resilience } = ctx;
  const violations = [];
  const advisories = [];
  const aiReq = _deriveAiVramRequirement(rawInput || {}, profile);
  const perNodeGpus = _toPosNum(candidate.perNodeGpus ?? candidate.gpuCountPerNode ?? candidate.gpuCount) || 0;
  const perGpuVramGb = _toPosNum(candidate.perGpuVramGb ?? candidate.gpuVramGb) || 0;
  const survivingNodes = _toPosNum(resilience?.survivingNodes) || _toPosNum(candidate.totalNodes) || 1;
  const perNodeVramGb = perNodeGpus * perGpuVramGb;
  const survivingVramGb = perNodeVramGb * survivingNodes;

  if (aiReq) {
    if (perNodeVramGb <= 0) {
      violations.push({
        code: 'AI_GPU_VRAM_MISSING',
        domain: 'WORKLOAD_SPECIFIC_AI',
        message: `AI/LLM workload requires ${aiReq.requiredVramGb} GB VRAM (${aiReq.formula}), but candidate specifies 0 GPU VRAM.`
      });
    } else if (survivingVramGb < aiReq.requiredVramGb) {
      violations.push({
        code: 'AI_GPU_VRAM_DEFICIT',
        domain: 'WORKLOAD_SPECIFIC_AI',
        message: `Surviving GPU VRAM (${survivingVramGb} GB across ${survivingNodes} surviving node(s)) is below required ${aiReq.requiredVramGb} GB (${aiReq.formula}).`
      });
    }
    const perNodeMem = _toPosNum(resilience?.perNodeMemoryGb);
    if (perNodeMem && perNodeVramGb > 0 && perNodeMem < perNodeVramGb * profile.hostRamToVramRatioMin) {
      advisories.push(`Host system RAM (${perNodeMem} GB/node) is below recommended ${profile.hostRamToVramRatioMin}x GPU VRAM (${perNodeVramGb * profile.hostRamToVramRatioMin} GB/node) for model staging and KV-cache offload.`);
    }
    const minFabric = profile.minInterconnectGbps[aiReq.aiMode] || 100;
    const totalNodes = _toPosNum(resilience?.totalNodes) || _toPosNum(candidate.totalNodes) || 1;
    const candSpeed = _toPosNum(candidate.fabric?.speedGbps);
    if (aiReq.aiMode === 'TRAINING' && totalNodes > 1 && candSpeed && candSpeed < minFabric) {
      violations.push({
        code: 'AI_TRAINING_INTERCONNECT_UNDERSIZED',
        domain: 'WORKLOAD_SPECIFIC_AI',
        message: `Multi-node AI training requires >= ${minFabric} Gbps RDMA/InfiniBand fabric; candidate provides ${candSpeed} Gbps.`
      });
    }
  }

  return {
    family: 'AI_INFERENCE_TRAINING',
    pass: violations.length === 0,
    status: violations.length === 0 ? 'PASS' : 'FAIL',
    metrics: {
      requiredVramGb: aiReq ? aiReq.requiredVramGb : null,
      vramProvenance: aiReq ? aiReq.provenance : PROVENANCE.MISSING,
      vramFormula: aiReq ? aiReq.formula : null,
      perNodeVramGb,
      survivingVramGb
    },
    violations,
    advisories
  };
}

function _evalSqlOltpChecks(profile, ctx) {
  const { rawInput, demandRecord, candidate, storage } = ctx;
  const violations = [];
  const advisories = [];
  const requiredIops = _toPosNum(rawInput?.requiredIops)
    || (_toPosNum(demandRecord.throughputOrConcurrency?.value) && /iops/i.test(String(demandRecord.throughputOrConcurrency?.unit || ''))
      ? _toPosNum(demandRecord.throughputOrConcurrency.value)
      : null);
  const raidLevel = storage?.raidLevel || demandRecord.storageSpec?.raidLevel || candidate.storage?.raidLevel || null;

  if (raidLevel && /RAID\s*[56]\b/i.test(raidLevel) && (rawInput?.requireRaid10 === true || (requiredIops && requiredIops >= profile.highWriteIopsThreshold))) {
    violations.push({
      code: 'SQL_OLTP_RAID_WRITE_PENALTY',
      domain: 'WORKLOAD_SPECIFIC_SQL_OLTP',
      message: `High-IOPS OLTP (${requiredIops || 'transactional'} IOPS) rejects ${raidLevel} write parity penalty; RAID 10 is required for transaction log and hot data volumes.`
    });
  } else if (raidLevel && /RAID\s*[56]\b/i.test(raidLevel)) {
    advisories.push(`OLTP best practice: RAID 10 is preferred over ${raidLevel} for random write transaction logs.`);
  }

  const candMaxIops = _toPosNum(candidate.storage?.maxIops)
    || (_toPosNum(candidate.storage?.driveCount)
      ? candidate.storage.driveCount * (profile.perDriveIops[String(candidate.storage?.mediaType || 'NVME').toUpperCase()] || profile.perDriveIops.NVME)
      : null);
  if (requiredIops && candMaxIops !== null && candMaxIops < requiredIops) {
    violations.push({
      code: 'SQL_OLTP_IOPS_DEFICIT',
      domain: 'WORKLOAD_SPECIFIC_SQL_OLTP',
      message: `Candidate storage IOPS capacity (${candMaxIops} IOPS) is below required SQL OLTP demand (${requiredIops} IOPS).`
    });
  }

  return {
    family: 'MICROSOFT_SQL_OLTP',
    pass: violations.length === 0,
    status: violations.length === 0 ? 'PASS' : 'FAIL',
    metrics: { requiredIops, candidateMaxIops: candMaxIops, raidLevel },
    violations,
    advisories
  };
}

function _evalVdiChecks(profile, ctx) {
  const { rawInput, candidate, resilience } = ctx;
  const violations = [];
  const advisories = [];
  const vdi = _deriveVdiDemand(rawInput || {}, profile);

  if (vdi) {
    const survivingCores = _toPosNum(resilience?.survivingCores);
    const totalVcpus = vdi.users * vdi.tier.vcpu;
    if (survivingCores && (totalVcpus / survivingCores) > vdi.tier.maxVcpuPerPcore) {
      violations.push({
        code: 'VDI_VCPU_OVERSUBSCRIPTION_EXCEEDED',
        domain: 'WORKLOAD_SPECIFIC_VDI',
        message: `VDI ${vdi.tierKey} density (${(totalVcpus / survivingCores).toFixed(2)} vCPU/pCore) exceeds max ${vdi.tier.maxVcpuPerPcore}:1 oversubscription ratio.`
      });
    }
    const requiresVgpu = rawInput?.requireVgpu === true || vdi.tierKey === 'CAD_3D' || (rawInput?.vdiTier && vdi.tier.vgpuGb > 0 && candidate.perGpuVramGb !== undefined);
    const survivingNodes = _toPosNum(resilience?.survivingNodes) || 1;
    const survivingVramGb = (_toPosNum(candidate.perNodeGpus) || 0) * (_toPosNum(candidate.perGpuVramGb) || 0) * survivingNodes;
    if (requiresVgpu && vdi.derivedVgpuGb > 0 && survivingVramGb < vdi.derivedVgpuGb) {
      violations.push({
        code: 'VDI_VGPU_VRAM_DEFICIT',
        domain: 'WORKLOAD_SPECIFIC_VDI',
        message: `VDI ${vdi.tierKey} (${vdi.users} users x ${vdi.tier.vgpuGb} GB vGPU) requires ${vdi.derivedVgpuGb} GB surviving GPU VRAM; candidate provides ${survivingVramGb} GB.`
      });
    }
  }

  return {
    family: 'VDI_ENTERPRISE',
    pass: violations.length === 0,
    status: violations.length === 0 ? 'PASS' : 'FAIL',
    metrics: vdi ? { users: vdi.users, tier: vdi.tierKey, derivedVgpuGb: vdi.derivedVgpuGb, provenance: vdi.provenance } : {},
    violations,
    advisories
  };
}

function _evalBigDataKafkaChecks(profile, ctx) {
  const { rawInput, candidate, resilience } = ctx;
  const violations = [];
  const advisories = [];
  const rf = _toPosNum(rawInput?.replicationFactor) || profile.defaultReplicationFactor;
  const totalNodes = _toPosNum(resilience?.totalNodes) || _toPosNum(candidate.totalNodes);
  const minQuorum = Math.max(profile.minQuorumNodes, rf);

  if (totalNodes !== null && totalNodes < minQuorum) {
    violations.push({
      code: 'BIG_DATA_QUORUM_NODE_DEFICIT',
      domain: 'WORKLOAD_SPECIFIC_BIG_DATA',
      message: `Distributed cluster with replication factor RF=${rf} requires at least ${minQuorum} nodes for quorum; candidate has ${totalNodes}.`
    });
  }

  const logicalTb = _toPosNum(rawInput?.logicalStorageTb);
  const requiredRawReplicatedTb = logicalTb
    ? Number((logicalTb * rf * profile.storageHeadroomMultiplier).toFixed(2))
    : null;
  const candClusterRawTb = _toPosNum(candidate.clusterRawStorageTb)
    || (_toPosNum(candidate.storage?.rawStorageTb) && totalNodes ? Number((candidate.storage.rawStorageTb * totalNodes).toFixed(2)) : null);
  if (requiredRawReplicatedTb && candClusterRawTb !== null && candClusterRawTb < requiredRawReplicatedTb) {
    violations.push({
      code: 'BIG_DATA_REPLICATED_STORAGE_DEFICIT',
      domain: 'WORKLOAD_SPECIFIC_BIG_DATA',
      message: `Logical ${logicalTb} TB with RF=${rf} and 25% compaction headroom requires ${requiredRawReplicatedTb} TB raw cluster storage; candidate provides ${candClusterRawTb} TB.`
    });
  }

  const fabricSpeed = _toPosNum(candidate.fabric?.speedGbps);
  if (fabricSpeed !== null && fabricSpeed < profile.minEastWestFabricGbps) {
    violations.push({
      code: 'BIG_DATA_EAST_WEST_BANDWIDTH_DEFICIT',
      domain: 'WORKLOAD_SPECIFIC_BIG_DATA',
      message: `Kafka/Spark east-west replication requires >= ${profile.minEastWestFabricGbps} GbE; candidate has ${fabricSpeed} GbE.`
    });
  }

  return {
    family: 'BIG_DATA_KAFKA',
    pass: violations.length === 0,
    status: violations.length === 0 ? 'PASS' : 'FAIL',
    metrics: { replicationFactor: rf, minQuorumNodes: minQuorum, requiredRawReplicatedTb, candClusterRawTb },
    violations,
    advisories
  };
}

function _evalHpcChecks(profile, ctx) {
  const { candidate, resilience, numa } = ctx;
  const violations = [];
  const advisories = [];
  const totalNodes = _toPosNum(resilience?.totalNodes) || _toPosNum(candidate.totalNodes) || 1;
  const fabricSpeed = _toPosNum(candidate.fabric?.speedGbps);
  const fabricProto = String(candidate.fabric?.protocol || '').toUpperCase();

  if (totalNodes > 1 && fabricSpeed !== null && fabricSpeed < profile.minInterconnectGbps) {
    violations.push({
      code: 'HPC_INTERCONNECT_BANDWIDTH_DEFICIT',
      domain: 'WORKLOAD_SPECIFIC_HPC',
      message: `Multi-node HPC MPI workload requires >= ${profile.minInterconnectGbps} Gbps low-latency interconnect (InfiniBand or RoCEv2); candidate provides ${fabricSpeed} Gbps.`
    });
  }
  if (totalNodes > 1 && fabricProto && !profile.preferredInterconnectProtocols.includes(fabricProto)) {
    advisories.push(`HPC interconnect uses ${fabricProto}; InfiniBand (HDR/NDR) or RoCEv2 RDMA is strongly recommended for MPI collective latency.`);
  }
  if (numa && numa.status !== 'NOT_PROVIDED' && !numa.isBalancedInterleaving) {
    violations.push({
      code: 'HPC_MEMORY_BANDWIDTH_UNBALANCED',
      domain: 'WORKLOAD_SPECIFIC_HPC',
      message: `HPC STREAM memory bandwidth requires full-channel balanced DIMM population; detected ${numa.interleavingMode}.`
    });
  }
  const perNodeMem = _toPosNum(resilience?.perNodeMemoryGb);
  const perNodeCores = _toPosNum(resilience?.perNodeCores);
  if (perNodeMem && perNodeCores && (perNodeMem / perNodeCores) < profile.memoryToCoreRatioGb.min) {
    violations.push({
      code: 'HPC_MEMORY_PER_CORE_DEFICIT',
      domain: 'WORKLOAD_SPECIFIC_HPC',
      message: `HPC memory density (${(perNodeMem / perNodeCores).toFixed(2)} GB/core) is below minimum ${profile.memoryToCoreRatioGb.min} GB/core.`
    });
  }

  return {
    family: 'HPC_COMPUTE',
    pass: violations.length === 0,
    status: violations.length === 0 ? 'PASS' : 'FAIL',
    metrics: { minInterconnectGbps: profile.minInterconnectGbps, candidateFabricGbps: fabricSpeed },
    violations,
    advisories
  };
}

function evaluateWorkloadSpecificChecks(profile, ctx) {
  if (!profile) return { family: 'UNKNOWN', pass: false, status: 'UNKNOWN', metrics: {}, violations: [], advisories: [] };
  switch (profile.family) {
    case 'SAP_HANA':
      return _evalSapHanaChecks(profile, ctx);
    case 'AI_INFERENCE_TRAINING':
      return _evalAiChecks(profile, ctx);
    case 'MICROSOFT_SQL_OLTP':
      return _evalSqlOltpChecks(profile, ctx);
    case 'VDI_ENTERPRISE':
      return _evalVdiChecks(profile, ctx);
    case 'BIG_DATA_KAFKA':
      return _evalBigDataKafkaChecks(profile, ctx);
    case 'HPC_COMPUTE':
      return _evalHpcChecks(profile, ctx);
    default:
      return {
        family: profile.family,
        pass: true,
        status: 'PASS',
        metrics: { memoryToCoreRatioGb: profile.memoryToCoreRatioGb },
        violations: [],
        advisories: []
      };
  }
}

module.exports = {
  WORKLOAD_SIZING_PROFILES,
  getWorkloadReferenceProfile,
  deriveProfileDemandOverrides,
  evaluateWorkloadSpecificChecks
};
