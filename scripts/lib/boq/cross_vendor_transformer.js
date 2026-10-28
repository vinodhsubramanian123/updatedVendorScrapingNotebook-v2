'use strict';

// Requirement extraction and candidate handoff, not a vendor acceptance engine.
// Product selection belongs to the scoped sizing/evaluation pipelines.
const AUDIT_SUBSYSTEMS = [
  'COMPUTE_PROCESSORS', 'MEMORY_TOPOLOGY', 'ACCELERATORS_GPU',
  'THERMAL_ENVIRONMENT', 'STORAGE_CONTROLLER_CACHE', 'STORAGE_CABLING',
  'DATA_STORAGE_DRIVES', 'BOOT_STORAGE_SUBSYSTEM', 'PCIE_EXPANSION_RISERS',
  'OCP_NETWORKING_FABRIC', 'POWER_AND_REDUNDANCY', 'INFRASTRUCTURE_MANAGEMENT'
];

const GPU_TIERS = {
  TRAINING_FLAGSHIP: ['H200', 'B200', 'H100', 'A100', 'GH200'],
  ENTERPRISE_INFERENCE: ['L40S', 'L40', 'RTX6000', 'A40'],
  ENTRY_INFERENCE: ['L4', 'T4', 'A2', 'A16']
};

const FABRIC_PROTOCOL_RANKS = {
  INFINIBAND_NDR: 4,
  INFINIBAND_HDR: 3,
  ROCE_V2: 2,
  ETHERNET: 1
};

function numberMatch(text, pattern) {
  const match = typeof text === 'string' ? text.match(pattern) : null;
  return match ? Number(match[1]) : null;
}

function detectFabricProtocol(text) {
  if (!text || typeof text !== 'string') return 'ETHERNET';
  const t = text.toLowerCase();

  // 1. InfiniBand NDR (400Gb/s per port, OSFP or QSFP112)
  const isNdrKeyword = /\b(ndr|ndr400|osfp|mcx75\d+|cx7.*ndr)\b/i.test(t);
  const isIbKeyword = /\b(infiniband|\bib\b|hca|subnet)\b/i.test(t);
  if (isNdrKeyword && isIbKeyword) return 'INFINIBAND_NDR';
  if (isIbKeyword && /\b(400\s*(?:gb|g\b|gbe|gbps|gb\/s)|osfp|qsfp112)\b/i.test(t)) return 'INFINIBAND_NDR';
  if (/\b(connectx-7|mcx7\d+)\b/i.test(t) && isIbKeyword) return 'INFINIBAND_NDR';

  // 2. InfiniBand HDR (200Gb/s per port, QSFP56)
  const isHdrKeyword = /\b(hdr|hdr200|hdr100|mcx65\d+|cx6.*hdr)\b/i.test(t);
  if (isHdrKeyword && isIbKeyword) return 'INFINIBAND_HDR';
  if (isIbKeyword && /\b(200\s*(?:gb|g\b|gbe|gbps|gb\/s)|qsfp56)\b/i.test(t)) return 'INFINIBAND_HDR';
  if (/\b(connectx-6|mcx6\d+)\b/i.test(t) && isIbKeyword) return 'INFINIBAND_HDR';
  if (isIbKeyword) return 'INFINIBAND_HDR'; // General InfiniBand fallback

  // 3. RoCEv2 (RDMA over Converged Ethernet)
  if (/\b(roce|rocev2|rdma over converged ethernet)\b/i.test(t)) return 'ROCE_V2';
  if (/\b(connectx-[678]|cx[678]|bcm57504|bcm57508|bcm57414|thor|thor2)\b/i.test(t) && /\b(rdma|roce)\b/i.test(t)) return 'ROCE_V2';

  // 4. Standard Ethernet
  return 'ETHERNET';
}

function detectArchitectureChannelWidth(text = '', targetChassis = null) {
  const t = String(text || '').toLowerCase();
  const c = String(targetChassis || '').toLowerCase();
  if (t.includes('9004') || t.includes('9005') || t.includes('genoa') || t.includes('bergamo') || t.includes('turin') ||
      c.includes('dl385') || c.includes('dl365') || c.includes('dl345')) {
    return 12;
  }
  if (t.includes('cascade lake') || t.includes('skylake') ||
      /\b(4[12]\d{2}|5[12]\d{2}|6[12]\d{2}|8[12]\d{2})\b/.test(t) ||
      (c.includes('gen10') && !c.includes('gen10 plus'))) {
    return 6;
  }
  return 8;
}

function _parseComputeSpec(cpu) {
  const cpuCount = numberMatch(cpu, /(\d+)\s*[x*]\s*(?:intel|amd|xeon|epyc|processor)/i)
    ?? (/\bdual\b/i.test(cpu) ? 2 : /\bsingle\b/i.test(cpu) ? 1 : null);
  const cpuCores = numberMatch(cpu, /(\d+)[\s-]*(?:cores?\b|c\b|c\/)/i);
  return {
    cpuCount,
    cpuModel: cpu.match(/(?:xeon\s*(?:platinum|gold|silver|bronze)?|epyc)\s*([\d][\w+]*)/i)?.[1] || null,
    cpuCores,
    cpuTdpWatts: numberMatch(cpu, /(\d+)\s*w\b/i),
    totalCores: cpuCount !== null && cpuCores !== null ? cpuCount * cpuCores : null
  };
}

function _parseMemorySpec(memory, cpuText = '', targetChassis = null, cpuCount = null) {
  const dimmCount = numberMatch(memory, /(\d+)\s*(?:[x*]|dimms?\s*of)\s*\d+\s*gb/i)
    ?? numberMatch(memory, /(\d+)\s*[x*]/i)
    ?? numberMatch(memory, /(\d+)\s*dimms?\b/i);
  const dimmCapacityGb = numberMatch(memory, /(\d+)\s*gb/i);
  const totalMemoryGb = (dimmCount !== null && dimmCapacityGb !== null ? dimmCount * dimmCapacityGb : null)
    ?? (numberMatch(memory, /(\d+(?:\.\d+)?)\s*tb\b/i) ? Math.round(numberMatch(memory, /(\d+(?:\.\d+)?)\s*tb\b/i) * 1024) : null)
    ?? numberMatch(memory, /(\d+)\s*gb\b/i);
  const channelWidth = detectArchitectureChannelWidth(cpuText, targetChassis);
  const isSocketSymmetric = cpuCount > 0 && dimmCount > 0 ? (dimmCount % cpuCount === 0) : null;
  const is1DpcBalanced = cpuCount > 0 && dimmCount > 0 ? (dimmCount % cpuCount === 0 && (dimmCount / cpuCount) === channelWidth) : null;
  const isBalancedInterleaving = cpuCount > 0 && dimmCount > 0 ? (dimmCount % cpuCount === 0 && [channelWidth, channelWidth * 2].includes(dimmCount / cpuCount)) : null;

  return {
    dimmCount,
    dimmCapacityGb,
    memorySpeedMt: numberMatch(memory, /ddr[45]-(\d+)/i) ?? numberMatch(memory, /(\d+)\s*(?:mt\/s|mhz)/i),
    totalMemoryGb,
    channelWidth,
    isSocketSymmetric,
    isBalanced1Dpc: is1DpcBalanced,
    isBalancedInterleaving
  };
}

function _parseNetworkSpec(net) {
  const hasNet = Boolean(net && typeof net === 'string' && net.trim().length > 0);
  let netSpeed = numberMatch(net, /(\d+)\s*(?:gb|gbe|gb\/s|gbps)/i);
  if (!netSpeed && hasNet) {
    if (/\b400\s*(?:gbe|gb\/s|gbps|gb|g)\b/i.test(net) || /\bndr\b/i.test(net)) netSpeed = 400;
    else if (/\b200\s*(?:gbe|gb\/s|gbps|gb|g)\b/i.test(net) || /\b(hdr|ndr200)\b/i.test(net)) netSpeed = 200;
    else if (/\b100\s*(?:gbe|gb\/s|gbps|gb|g)\b/i.test(net) || /\bhdr100\b/i.test(net)) netSpeed = 100;
    else if (/\b25\s*(?:gbe|gb\/s|gbps|gb|g)\b/i.test(net)) netSpeed = 25;
    else if (/\b10\s*(?:gbe|gb\/s|gbps|gb|g)\b/i.test(net)) netSpeed = 10;
  }
  const adapterCount = hasNet ? (numberMatch(net, /(\d+)\s*[x*]/i) ?? 1) : null;
  const netPorts = hasNet
    ? (numberMatch(net, /(\d+)\s*(?:port|ports|-port)/i)
      ?? (/\bdual\b/i.test(net) ? 2 : /\bquad\b/i.test(net) ? 4 : /\bsingle\b/i.test(net) ? 1 : null))
    : null;
  const fabricProtocol = hasNet ? detectFabricProtocol(net) : null;
  return {
    adapterCount,
    portsCount: netPorts,
    totalPorts: netPorts !== null ? (adapterCount || 1) * netPorts : null,
    speedGb: netSpeed,
    isOcp: Boolean(hasNet && /\bocp\b/i.test(net)),
    fabricProtocol
  };
}

function _parseStorageSpec(drive, ctrl, boot) {
  const driveCount = numberMatch(drive, /(\d+)\s*[x*]/i);
  const driveCapacityTb = numberMatch(drive, /(\d+(?:\.\d+)?)\s*tb/i)
    ?? (numberMatch(drive, /(\d+)\s*gb/i) ? numberMatch(drive, /(\d+)\s*gb/i) / 1000 : null);

  const localDrives = {
    count: driveCount,
    capacityTb: driveCapacityTb,
    interface: /nvme/i.test(drive) ? 'NVMe' : /sas/i.test(drive) ? 'SAS' : /sata/i.test(drive) ? 'SATA' : null
  };

  const storageController = {
    controllerModel: ctrl.match(/(?:perc|megaraid|smart array|controller)\s*([\w\d]+)/i)?.[1] || null,
    cacheSizeGb: numberMatch(ctrl, /(\d+)\s*gb/i),
    isRaid: /\braid\b/i.test(ctrl) || /perc|megaraid|smart array/i.test(ctrl)
  };

  const bootStorage = {
    count: numberMatch(boot, /(\d+)\s*[x*]/i) ?? (boot ? 1 : null),
    bootDeviceType: /boss/i.test(boot) ? 'BOSS' : (/ns204i/i.test(boot) ? 'NS204I' : (boot ? 'M2_NVME' : null))
  };

  return { localDrives, storageController, bootStorage };
}

function parseCompetitorSpecification(input, sourceVendor = null) {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    return { ...structuredClone(input), sourceVendor: sourceVendor || input.sourceVendor || null };
  }
  const lines = Array.isArray(input)
    ? input.map(item => `${item.quantity ?? item.qty ?? ''}x ${item.description || item.name || item.sku || ''}`)
    : String(input ?? '').split(/[;\n]+/);
  const text = lines.join('; ');
  const cpu = lines.find(line => /\b(xeon|epyc|processor)\b/i.test(line)) || '';
  const memory = lines.find(line => /\b(rdimm|dimm|memory|ddr[45]|ram)\b/i.test(line)) || '';
  const gpu = lines.find(line => /\b(gpu|accelerator|nvidia|h100|h200|l40|a100|l4\b|t4\b|gh200|b200)\b/i.test(line)) || '';
  const drive = lines.find(line => /\b(ssd|hdd|nvme|drive)\b/i.test(line) && !/\b(tape|controller|transceiver|boot)\b/i.test(line)) || '';
  const ctrl = lines.find(line => /\b(raid|controller|hba|smart array|megaraid|perc)\b/i.test(line)) || '';
  const net = lines.find(line => /\b(nic|network|ethernet|ocp|sfp|base-t|\d+gbe|adapter|infiniband|\bib\b|hca|roce|mellanox|connectx|mcx\d+)\b/i.test(line)) || '';
  const optics = lines.find(line => /\b(transceiver|sfp28|qsfp28|qsfp56|qsfp112|osfp|optical|dac|direct attach|aoc)\b/i.test(line) && !/\b(nic|adapter)\b/i.test(line)) || '';
  const psu = lines.find(line => /\b(power supply|psu|flex slot|titanium|platinum)\b/i.test(line)) || '';
  const mgmt = lines.find(line => /\b(idrac|ilo|xcc|ipmi|enterprise|advanced|intersight)\b/i.test(line)) || '';
  const boot = lines.find(line => /\b(boss|ns204i|boot device|boot ssd|m\.2 nvme)\b/i.test(line)) || '';
  const thermal = lines.find(line => /\b(heatsink|fan kit|high perf fan|liquid cooling|dlc)\b/i.test(line)) || '';
  const riser = lines.find(line => /\b(riser|expansion card|pcie slot)\b/i.test(line)) || '';

  const compute = _parseComputeSpec(cpu);
  const { localDrives, storageController, bootStorage } = _parseStorageSpec(drive, ctrl, boot);

  return {
    sourceVendor: sourceVendor ? String(sourceVendor).toUpperCase() : null,
    sourceItems: Array.isArray(input) ? structuredClone(input) : null,
    rawInputText: text,
    sourceLines: lines,
    extractionStatus: 'PARTIAL_REQUIREMENTS_REVIEW_REQUIRED',
    compute,
    memory: _parseMemorySpec(memory, cpu + ' ' + text, null, compute.cpuCount),
    accelerators: {
      gpuCount: numberMatch(gpu, /(\d+)\s*[x*]/i),
      gpuModel: gpu.match(/(?:nvidia\s*)?([hlatb]\d{1,3}s?|gh\d{3})/i)?.[1]?.toUpperCase() || (gpu ? 'GPU' : null),
      gpuTdpWatts: numberMatch(gpu, /(\d+)\s*w\b/i)
    },
    localDrives,
    storageController,
    networking: _parseNetworkSpec(net),
    opticalTransceivers: {
      count: numberMatch(optics, /(\d+)\s*[x*]/i) ?? numberMatch(optics, /(\d+)\s*(?:transceiver|sfp|qsfp)/i),
      speedGb: numberMatch(optics, /(\d+)\s*(?:gb|g\b|gbe)/i),
      formFactor: optics.match(/\b(osfp|qsfp112|qsfp56|qsfp28|sfp28|sfp\+)\b/i)?.[1]?.toUpperCase() || null,
      mediaType: /dac|direct attach/i.test(optics) ? 'DAC' : (/aoc/i.test(optics) ? 'AOC' : (optics ? 'OPTICAL' : null))
    },
    power: {
      psuCount: numberMatch(psu, /(\d+)\s*[x*]/i) ?? (/\b(redundant|dual)\b/i.test(psu) ? 2 : null),
      psuWattage: numberMatch(psu, /(\d{3,4})\s*w\b/i),
      efficiency: /titanium/i.test(psu) ? 'Titanium' : (/platinum/i.test(psu) ? 'Platinum' : null)
    },
    management: {
      tier: /enterprise/i.test(mgmt) ? 'Enterprise' : /advanced/i.test(mgmt) ? 'Advanced' : mgmt ? 'Standard' : null
    },
    thermal: {
      requiresHighPerfFans: /\b(high perf|high performance|performance fan)\b/i.test(thermal),
      requiresLiquidCooling: /\b(liquid|dlc|direct liquid)\b/i.test(thermal),
      heatsinkType: /standard/i.test(thermal) ? 'Standard' : (/performance|high perf/i.test(thermal) ? 'High Performance' : null)
    },
    bootStorage,
    pcieRisers: {
      riserCount: numberMatch(riser, /(\d+)\s*[x*]/i) ?? (riser ? 1 : null),
      hasSecondaryRiser: /\b(secondary|tertiary|riser 2|riser 3)\b/i.test(riser)
    },
    unresolvedRequirements: ['Review every source line, including storage, GPU, fabric, support and quantity basis.']
  };
}

function _evaluateComputeProcessorsParity(spec, bom) {
  const reqCores = spec.compute?.totalCores;
  const reqCpuCount = spec.compute?.cpuCount;
  if (reqCores === null && reqCpuCount === null) {
    return { subsystem: 'COMPUTE_PROCESSORS', status: 'NOT_EVALUATED', details: 'No competitor compute/processor requirements specified.' };
  }
  let targetCpus = 0;
  let targetCores = 0;
  for (const item of bom) {
    const desc = (item.description || item.sku || '').toLowerCase();
    if (/\b(processor|xeon|epyc)\b/i.test(desc) && !/\b(heatsink|heat sink|fan|cage)\b/i.test(desc)) {
      const q = item.quantity || 1;
      targetCpus += q;
      const coreMatch = desc.match(/(\d+)[\s-]*(?:cores?\b|c\b|c\/)/i);
      const coresPerCpu = coreMatch ? parseInt(coreMatch[1], 10) : 16;
      targetCores += (coresPerCpu * q);
    }
  }
  if (targetCpus === 0) {
    return { subsystem: 'COMPUTE_PROCESSORS', status: 'DEFICIT', details: `Target BOM contains 0 processors; competitor specified ${reqCpuCount || 'CPUs'}.` };
  }
  if (reqCores != null) {
    if (targetCores >= reqCores) {
      return { subsystem: 'COMPUTE_PROCESSORS', status: targetCores > reqCores ? 'EXCEEDS' : 'MATCHED', details: `Target provides ${targetCores} cores (${targetCpus} CPUs) vs competitor ${reqCores} cores.` };
    }
    return { subsystem: 'COMPUTE_PROCESSORS', status: 'DEFICIT', details: `Target provides ${targetCores} cores vs competitor ${reqCores} cores (Deficit: ${reqCores - targetCores} cores).` };
  }
  if (reqCpuCount != null) {
    if (targetCpus >= reqCpuCount) {
      return { subsystem: 'COMPUTE_PROCESSORS', status: targetCpus > reqCpuCount ? 'EXCEEDS' : 'MATCHED', details: `Target provides ${targetCpus} CPU sockets vs competitor ${reqCpuCount} sockets.` };
    }
    return { subsystem: 'COMPUTE_PROCESSORS', status: 'DEFICIT', details: `Target provides ${targetCpus} CPU sockets vs competitor ${reqCpuCount} sockets.` };
  }
  return { subsystem: 'COMPUTE_PROCESSORS', status: 'NOT_EVALUATED', details: 'Insufficient processor specification.' };
}

function _evaluateMemoryTopologyParity(spec, bom, targetChassis = null) {
  const reqMemGb = spec.memory?.totalMemoryGb;
  if (reqMemGb === null || reqMemGb === undefined) {
    return { subsystem: 'MEMORY_TOPOLOGY', status: 'NOT_EVALUATED', details: 'No competitor memory capacity specified.' };
  }
  let targetCpus = 0;
  let cpuDesc = '';
  for (const item of bom) {
    const desc = (item.description || item.sku || '').toLowerCase();
    if (/\b(processor|xeon|epyc)\b/i.test(desc) && !/\b(heatsink|heat sink|fan|cage|cable)\b/i.test(desc)) {
      targetCpus += (item.quantity || 1);
      cpuDesc += ' ' + desc;
    }
  }
  if (targetCpus === 0) {
    targetCpus = spec.compute?.cpuCount || 2;
  }
  const channelWidth = detectArchitectureChannelWidth((spec.rawInputText || '') + ' ' + cpuDesc, targetChassis);

  let targetMemGb = 0;
  let targetDimmCount = 0;
  for (const item of bom) {
    const desc = (item.description || item.sku || '').toLowerCase();
    if (/\b(dimm|rdimm|lrdimm|mrdimm|smart memory|memory)\b/i.test(desc) && !/\b(battery|controller|cage|flash|nvme|drive|blank)\b/i.test(desc)) {
      const capMatch = desc.match(/(\d+)\s*gb/i);
      const cap = capMatch ? parseInt(capMatch[1], 10) : 32;
      const q = item.quantity || 1;
      targetDimmCount += q;
      targetMemGb += cap * q;
    }
  }

  const isAsymmetric = targetCpus > 1 && targetDimmCount > 0 && (targetDimmCount % targetCpus !== 0);

  if (targetMemGb < reqMemGb) {
    const asymmNote = isAsymmetric ? `; additionally, ${targetDimmCount} DIMMs is asymmetric across ${targetCpus} sockets, breaking NUMA channel interleaving` : '';
    return {
      subsystem: 'MEMORY_TOPOLOGY',
      status: 'DEFICIT',
      details: `Target provides ${targetMemGb} GB RAM vs competitor requirement of ${reqMemGb} GB (Deficit: ${reqMemGb - targetMemGb} GB)${asymmNote}.`
    };
  }

  if (isAsymmetric) {
    return {
      subsystem: 'MEMORY_TOPOLOGY',
      status: 'DEFICIT',
      details: `Unbalanced socket memory symmetry: target memory topology (${targetDimmCount} DIMMs, ${targetMemGb} GB) is asymmetric across ${targetCpus} sockets, breaking NUMA channel interleaving. NUMA performance will be degraded (${(targetDimmCount / targetCpus).toFixed(1)} DIMMs/socket).`
    };
  }

  const dimmsPerCpu = targetCpus > 0 && targetDimmCount > 0 ? (targetDimmCount / targetCpus) : 0;
  const isSupportedPopulation = [1, 2, 4, channelWidth, channelWidth * 2].includes(dimmsPerCpu);
  const is1DpcBalanced = dimmsPerCpu === channelWidth;
  const is2DpcBalanced = dimmsPerCpu === (channelWidth * 2);

  if (targetDimmCount > 0 && !isSupportedPopulation) {
    return {
      subsystem: 'MEMORY_TOPOLOGY',
      status: 'DEFICIT',
      details: `Unbalanced memory channel interleaving: ${dimmsPerCpu} DIMMs per CPU on ${channelWidth}-channel architecture (${targetDimmCount} DIMMs total for ${targetCpus}P). Optimal memory bandwidth requires 1 DIMM per channel (${channelWidth} per CPU, ${channelWidth * targetCpus} total) or 2 DIMMs per channel (${channelWidth * 2} per CPU).`
    };
  }

  if (spec.memory?.isBalanced1Dpc && !is1DpcBalanced) {
    return {
      subsystem: 'MEMORY_TOPOLOGY',
      status: 'DEFICIT',
      details: `Competitor specified balanced 1DPC memory (${channelWidth} DIMMs/socket), but target provides ${dimmsPerCpu} DIMMs/socket.`
    };
  }

  const modeStr = is1DpcBalanced ? '1DPC Optimal' : is2DpcBalanced ? '2DPC Maximum Capacity' : 'Supported Symmetric';
  const isExceed = targetMemGb > reqMemGb;
  return {
    subsystem: 'MEMORY_TOPOLOGY',
    status: isExceed ? 'EXCEEDS' : 'MATCHED',
    details: `Target provides ${targetMemGb} GB RAM (${targetDimmCount}x DIMMs, ${dimmsPerCpu} DIMMs/socket) with balanced ${channelWidth}-channel NUMA interleaving (${modeStr}): satisfies competitor requirement of ${reqMemGb} GB.`
  };
}

function _getGpuTier(model) {
  if (!model) return 'ENTRY_INFERENCE';
  const m = model.toUpperCase();
  for (const [tier, models] of Object.entries(GPU_TIERS)) {
    if (models.some(cand => m.includes(cand))) return tier;
  }
  return 'ENTRY_INFERENCE';
}

function _evaluateGpuParity(spec, bom) {
  const reqGpu = spec.accelerators?.gpuCount;
  const reqModel = spec.accelerators?.gpuModel;
  const reqTdp = spec.accelerators?.gpuTdpWatts;

  if ((reqGpu === null || reqGpu === undefined || reqGpu === 0) && !reqModel) {
    return { subsystem: 'ACCELERATORS_GPU', status: 'NOT_EVALUATED', details: 'No competitor GPU accelerators specified.' };
  }

  let targetGpu = 0;
  let targetModel = null;
  let maxTdp = 0;

  for (const item of bom) {
    const desc = (item.description || item.sku || '').toLowerCase();
    if (/\b(gpu|accelerator|nvidia|h100|h200|l40s?|a100|l4\b|t4\b|gh200|b200)\b/i.test(desc) && !/\b(cage|cable|riser|power|tray)\b/i.test(desc)) {
      const q = item.quantity || 1;
      targetGpu += q;
      const modelMatch = desc.match(/(?:nvidia\s*)?([hlatb]\d{1,3}s?|gh\d{3}|rtx\s*\d{4})/i);
      if (modelMatch && !targetModel) targetModel = modelMatch[1].toUpperCase();
      const tdpMatch = desc.match(/(\d+)\s*w\b/i);
      if (tdpMatch) maxTdp = Math.max(maxTdp, parseInt(tdpMatch[1], 10));
    }
  }

  const expectedGpuCount = reqGpu || 1;
  if (targetGpu === 0) {
    return { subsystem: 'ACCELERATORS_GPU', status: 'DEFICIT', details: `Target BOM contains 0 GPU accelerators; competitor specified ${expectedGpuCount}x ${reqModel || 'GPU'}.` };
  }

  if (targetGpu < expectedGpuCount) {
    return { subsystem: 'ACCELERATORS_GPU', status: 'DEFICIT', details: `Target provides ${targetGpu} GPU accelerator(s) vs competitor ${expectedGpuCount} (Deficit: ${expectedGpuCount - targetGpu}).` };
  }

  if (reqModel) {
    const reqTier = _getGpuTier(reqModel);
    const targetTier = _getGpuTier(targetModel);
    const tierRanks = { TRAINING_FLAGSHIP: 3, ENTERPRISE_INFERENCE: 2, ENTRY_INFERENCE: 1 };
    if (tierRanks[targetTier] < tierRanks[reqTier]) {
      return {
        subsystem: 'ACCELERATORS_GPU',
        status: 'DEFICIT',
        details: `Target GPU architecture (${targetModel || 'Entry GPU'}, tier ${targetTier}) does not meet competitor compute tier (${reqModel}, tier ${reqTier}).`
      };
    }
  }

  if (reqTdp && maxTdp > 0 && maxTdp < reqTdp * 0.7) {
    return {
      subsystem: 'ACCELERATORS_GPU',
      status: 'DEFICIT',
      details: `Target GPU power envelope (${maxTdp}W) is significantly lower than competitor specified (${reqTdp}W).`
    };
  }

  const isExceed = targetGpu > expectedGpuCount;
  return {
    subsystem: 'ACCELERATORS_GPU',
    status: isExceed ? 'EXCEEDS' : 'MATCHED',
    details: `Target provides ${targetGpu}x ${targetModel || 'GPU'} accelerator(s) matching competitor requirement of ${expectedGpuCount}x ${reqModel || 'GPU'}.`
  };
}

function _evaluateStorageControllerParity(spec, bom) {
  const reqModel = spec.storageController?.controllerModel;
  const reqCache = spec.storageController?.cacheSizeGb;
  const isRaidReq = spec.storageController?.isRaid || reqModel != null || reqCache != null;

  if (!isRaidReq && !reqModel && reqCache == null) {
    return { subsystem: 'STORAGE_CONTROLLER_CACHE', status: 'NOT_EVALUATED', details: 'No competitor storage controller or cache specified.' };
  }

  let targetControllers = 0;
  let targetCacheGb = 0;
  let targetControllerName = '';

  for (const item of bom) {
    const desc = (item.description || item.sku || '').toLowerCase();
    if (/\b(controller|smart array|megaraid|tri-mode|mr416i|mr216i|sr932i|sr416i|sr262i|hba)\b/i.test(desc) && !/\b(cable|battery|cage|backplane)\b/i.test(desc)) {
      targetControllers += (item.quantity || 1);
      if (!targetControllerName) targetControllerName = item.description || item.sku;
      const cacheMatch = desc.match(/(\d+)\s*gb\s*(?:cache|fbwc)/i);
      if (cacheMatch) {
        targetCacheGb = Math.max(targetCacheGb, parseInt(cacheMatch[1], 10));
      } else if (/\bmr416i\b/i.test(desc) || /\bsr416i\b/i.test(desc)) {
        targetCacheGb = Math.max(targetCacheGb, 4);
      } else if (/\bsr932i\b/i.test(desc)) {
        targetCacheGb = Math.max(targetCacheGb, 8);
      }
    }
  }

  if (targetControllers === 0) {
    return {
      subsystem: 'STORAGE_CONTROLLER_CACHE',
      status: 'DEFICIT',
      details: `Target BOM lacks storage controller; competitor specified ${reqModel || 'hardware RAID controller'}${reqCache ? ' (' + reqCache + 'GB cache)' : ''}.`
    };
  }

  if (reqCache != null && targetCacheGb < reqCache) {
    return {
      subsystem: 'STORAGE_CONTROLLER_CACHE',
      status: 'DEFICIT',
      details: `Target controller cache (${targetCacheGb}GB) is lower than competitor requirement (${reqCache}GB).`
    };
  }

  const isExceed = reqCache != null && targetCacheGb > reqCache;
  return {
    subsystem: 'STORAGE_CONTROLLER_CACHE',
    status: isExceed ? 'EXCEEDS' : 'MATCHED',
    details: `Target storage controller (${targetControllerName || 'HPE Tri-Mode'}, ${targetCacheGb}GB cache) satisfies competitor requirements.`
  };
}

function _evaluateOpticalTransceiverParity(spec, bom) {
  const reqOptics = spec.opticalTransceivers;
  const reqCount = reqOptics?.count;
  const reqSpeed = reqOptics?.speedGb;
  const reqForm = reqOptics?.formFactor;

  if (!reqCount && !reqSpeed && !reqForm) {
    return { subsystem: 'STORAGE_CABLING', status: 'NOT_EVALUATED', details: 'No competitor optical transceivers or interconnect cabling specified.' };
  }

  let targetOpticsCount = 0;
  let targetMaxSpeed = 0;
  let targetFormFactor = '';

  for (const item of bom) {
    const desc = (item.description || item.sku || '').toLowerCase();
    if (/\b(transceiver|sfp28|qsfp28|qsfp56|qsfp112|osfp|sfp\+|dac|optical|cable kit|direct attach)\b/i.test(desc) && !/\b(power|power supply)\b/i.test(desc)) {
      const q = item.quantity || 1;
      targetOpticsCount += q;
      const speedMatch = desc.match(/(\d+)\s*(?:gb|g\b|gbe)/i);
      if (speedMatch) targetMaxSpeed = Math.max(targetMaxSpeed, parseInt(speedMatch[1], 10));
      if (/\bosfp\b/i.test(desc)) { targetFormFactor = 'OSFP'; targetMaxSpeed = Math.max(targetMaxSpeed, 400); }
      else if (/\bqsfp112\b/i.test(desc)) { targetFormFactor = 'QSFP112'; targetMaxSpeed = Math.max(targetMaxSpeed, 400); }
      else if (/\bqsfp56\b/i.test(desc)) { targetFormFactor = 'QSFP56'; targetMaxSpeed = Math.max(targetMaxSpeed, 200); }
      else if (/\bqsfp28\b/i.test(desc)) { targetFormFactor = 'QSFP28'; targetMaxSpeed = Math.max(targetMaxSpeed, 100); }
      else if (/\bsfp28\b/i.test(desc)) { targetFormFactor = 'SFP28'; targetMaxSpeed = Math.max(targetMaxSpeed, 25); }
      else if (/\bsfp\+\b/i.test(desc)) { targetFormFactor = 'SFP+'; targetMaxSpeed = Math.max(targetMaxSpeed, 10); }
    }
  }

  if (targetOpticsCount === 0) {
    return {
      subsystem: 'STORAGE_CABLING',
      status: 'DEFICIT',
      details: `Target BOM lacks optical transceivers/cabling; competitor specified ${reqCount || 1}x ${reqSpeed ? reqSpeed + 'G ' : ''}${reqForm || 'transceivers'}.`
    };
  }

  if (reqCount && targetOpticsCount < reqCount) {
    return {
      subsystem: 'STORAGE_CABLING',
      status: 'DEFICIT',
      details: `Target provides ${targetOpticsCount} optical transceiver(s)/cable(s) vs competitor ${reqCount} (Deficit: ${reqCount - targetOpticsCount}).`
    };
  }

  if (reqSpeed && targetMaxSpeed < reqSpeed) {
    return {
      subsystem: 'STORAGE_CABLING',
      status: 'DEFICIT',
      details: `Target transceiver speed (${targetMaxSpeed}G) is lower than competitor requirement (${reqSpeed}G).`
    };
  }

  const isExceed = (reqCount && targetOpticsCount > reqCount) || (reqSpeed && targetMaxSpeed > reqSpeed);
  return {
    subsystem: 'STORAGE_CABLING',
    status: isExceed ? 'EXCEEDS' : 'MATCHED',
    details: `Target provides ${targetOpticsCount}x ${targetFormFactor || 'transceiver(s)'} (${targetMaxSpeed}G) matching competitor requirement of ${reqCount || 1}x.`
  };
}

function _evaluateDriveParity(spec, bom) {
  const reqDrives = spec.localDrives?.count;
  if (reqDrives === null || reqDrives === undefined || reqDrives === 0) {
    return { subsystem: 'DATA_STORAGE_DRIVES', status: 'NOT_EVALUATED', details: 'No competitor drive count specified.' };
  }
  let targetDrives = 0;
  for (const item of bom) {
    const desc = (item.description || item.sku || '').toLowerCase();
    if (/\b(ssd|hdd|nvme|drive)\b/i.test(desc) && !/\b(cage|backplane|cable|controller|power)\b/i.test(desc)) {
      targetDrives += (item.quantity || 1);
    }
  }
  if (targetDrives >= reqDrives) {
    return { subsystem: 'DATA_STORAGE_DRIVES', status: targetDrives > reqDrives ? 'EXCEEDS' : 'MATCHED', details: `Target provides ${targetDrives} drive(s) vs competitor ${reqDrives}.` };
  }
  return { subsystem: 'DATA_STORAGE_DRIVES', status: 'DEFICIT', details: `Target provides ${targetDrives} drive(s) vs competitor ${reqDrives}.` };
}

function _evaluateThermalParity(spec, bom) {
  const reqThermal = spec.thermal;
  const reqCpuTdp = spec.compute?.cpuTdpWatts || 0;
  const isHighTdp = reqCpuTdp >= 250 || reqThermal?.requiresHighPerfFans || reqThermal?.requiresLiquidCooling;

  if (!isHighTdp && !reqThermal?.heatsinkType) {
    return { subsystem: 'THERMAL_ENVIRONMENT', status: 'NOT_EVALUATED', details: 'No high-TDP or special thermal requirements specified.' };
  }

  let hasHighPerfFans = false;
  let hasDlc = false;

  for (const item of bom) {
    const desc = (item.description || item.sku || '').toLowerCase();
    if (/\b(performance fan|high perf fan|fan kit)\b/i.test(desc)) hasHighPerfFans = true;
    if (/\b(direct liquid cooling|dlc|liquid cooling)\b/i.test(desc)) hasDlc = true;
  }

  if (reqThermal?.requiresLiquidCooling && !hasDlc) {
    return { subsystem: 'THERMAL_ENVIRONMENT', status: 'DEFICIT', details: 'Competitor specifies liquid cooling but target BOM lacks Direct Liquid Cooling (DLC) kit.' };
  }

  if (reqCpuTdp >= 300 && !hasHighPerfFans) {
    return { subsystem: 'THERMAL_ENVIRONMENT', status: 'DEFICIT', details: `High-TDP processor (${reqCpuTdp}W) requires High Performance Fan Kit in target BOM.` };
  }

  return {
    subsystem: 'THERMAL_ENVIRONMENT',
    status: 'MATCHED',
    details: `Target thermal solution (${hasDlc ? 'DLC' : (hasHighPerfFans ? 'High Perf Fans + ' : '') + 'Heatsinks'}) satisfies processor thermal requirements.`
  };
}

function _evaluateBootStorageParity(spec, bom) {
  const reqBoot = spec.bootStorage;
  if (!reqBoot?.count && !reqBoot?.bootDeviceType) {
    return { subsystem: 'BOOT_STORAGE_SUBSYSTEM', status: 'NOT_EVALUATED', details: 'No competitor dedicated boot storage subsystem specified.' };
  }

  let hasBootDevice = false;
  let bootDeviceName = '';

  for (const item of bom) {
    const desc = (item.description || item.sku || '').toLowerCase();
    if (/\b(ns204i|boss|boot controller|m\.2|boot ssd|nvme boot)\b/i.test(desc)) {
      hasBootDevice = true;
      bootDeviceName = item.description || item.sku;
      break;
    }
  }

  if (!hasBootDevice) {
    return {
      subsystem: 'BOOT_STORAGE_SUBSYSTEM',
      status: 'DEFICIT',
      details: `Target BOM lacks dedicated boot controller; competitor specified ${reqBoot.bootDeviceType || 'M.2/BOSS boot device'}.`
    };
  }

  return {
    subsystem: 'BOOT_STORAGE_SUBSYSTEM',
    status: 'MATCHED',
    details: `Target includes dedicated boot storage (${bootDeviceName}) satisfying competitor requirement.`
  };
}

function _evaluatePcieRisersParity(spec, bom) {
  const reqRisers = spec.pcieRisers;
  if (!reqRisers?.riserCount && !reqRisers?.hasSecondaryRiser) {
    return { subsystem: 'PCIE_EXPANSION_RISERS', status: 'NOT_EVALUATED', details: 'No competitor PCIe expansion riser requirements specified.' };
  }

  let riserCount = 0;
  for (const item of bom) {
    const desc = (item.description || item.sku || '').toLowerCase();
    if (/\b(riser|expansion slot|pcie cage)\b/i.test(desc) && !/\b(cable|power)\b/i.test(desc)) {
      riserCount += (item.quantity || 1);
    }
  }

  const expectedRisers = reqRisers.riserCount || 1;
  if (riserCount < expectedRisers) {
    return {
      subsystem: 'PCIE_EXPANSION_RISERS',
      status: 'DEFICIT',
      details: `Target provides ${riserCount} PCIe riser(s) vs competitor ${expectedRisers} (Deficit: ${expectedRisers - riserCount}).`
    };
  }

  return {
    subsystem: 'PCIE_EXPANSION_RISERS',
    status: riserCount > expectedRisers ? 'EXCEEDS' : 'MATCHED',
    details: `Target provides ${riserCount} PCIe riser(s) satisfying competitor expansion slot requirements.`
  };
}

function _evaluateNetworkingFabricParity(spec, bom) {
  const reqSpeed = spec.networking?.speedGb ?? null;
  const reqPorts = spec.networking?.portsCount ?? null;
  const rawProtocol = spec.networking?.fabricProtocol ?? null;

  if (reqSpeed === null && reqPorts === null && !rawProtocol) {
    return { subsystem: 'OCP_NETWORKING_FABRIC', status: 'NOT_EVALUATED', details: 'No competitor network fabric specification provided.' };
  }

  const reqProtocol = rawProtocol || 'ETHERNET';

  let targetPorts = 0;
  let maxSpeed = 0;
  let targetProtocol = 'ETHERNET';
  let hasMatchingProtocol = false;

  for (const item of bom) {
    const desc = (item.description || item.sku || '').toLowerCase();
    if (/\b(nic|adapter|ethernet|ocp3?|sfp\d*|bcm\d*|infiniband|\bib\b|connectx|mcx\d+)\b/i.test(desc) && !/\b(power|chassis|cable)\b/i.test(desc)) {
      const portMatch = desc.match(/(\d+)\s*[-]?port/i);
      const speedMatch = desc.match(/(\d+)\s*(?:gb|gbe|gb\/s|gbps)/i);
      const p = portMatch ? parseInt(portMatch[1], 10) : (/\bdual\b/i.test(desc) ? 2 : /\bquad\b/i.test(desc) ? 4 : 1);

      let s = speedMatch ? parseInt(speedMatch[1], 10) : 10;
      if (/\b400\s*(?:gb|gbe|g\b|gbps)/i.test(desc) || /\bndr\b/i.test(desc)) s = 400;
      else if (/\b200\s*(?:gb|gbe|g\b|gbps)/i.test(desc) || /\bhdr\b/i.test(desc) || /\bndr200\b/i.test(desc)) s = 200;
      else if (/\b100\s*(?:gb|gbe|g\b|gbps)/i.test(desc)) s = 100;
      else if (/\b25\s*(?:gb|gbe|g\b|gbps)/i.test(desc)) s = 25;

      const itemProto = detectFabricProtocol(desc);
      targetPorts += p * (item.quantity || 1);
      maxSpeed = Math.max(maxSpeed, s);

      if ((FABRIC_PROTOCOL_RANKS[itemProto] || 0) > (FABRIC_PROTOCOL_RANKS[targetProtocol] || 0)) {
        targetProtocol = itemProto;
      }

      if (reqProtocol === 'INFINIBAND_NDR') {
        if (itemProto === 'INFINIBAND_NDR') {
          hasMatchingProtocol = true;
        }
      } else if (reqProtocol === 'INFINIBAND_HDR') {
        if (itemProto === 'INFINIBAND_HDR' || itemProto === 'INFINIBAND_NDR') {
          hasMatchingProtocol = true;
        }
      } else if (reqProtocol === 'ROCE_V2') {
        if (itemProto === 'ROCE_V2' || itemProto.startsWith('INFINIBAND')) {
          hasMatchingProtocol = true;
        }
      } else {
        hasMatchingProtocol = true;
      }
    }
  }

  if (targetPorts === 0) {
    return { subsystem: 'OCP_NETWORKING_FABRIC', status: 'DEFICIT', details: `Target BOM contains 0 network adapters; competitor specified ${reqPorts || 'ports'} ${reqSpeed ? reqSpeed + 'Gb' : ''} ${reqProtocol}.` };
  }

  if (!hasMatchingProtocol) {
    return {
      subsystem: 'OCP_NETWORKING_FABRIC',
      status: 'DEFICIT',
      details: `Target network fabric protocol mismatch: competitor specified ${reqProtocol}${reqSpeed ? ' (' + reqSpeed + 'Gb/s)' : ''}, but target BOM provides ${targetProtocol}. High-speed cluster interconnect requires protocol parity.`
    };
  }

  if (reqSpeed && maxSpeed < reqSpeed) {
    return { subsystem: 'OCP_NETWORKING_FABRIC', status: 'DEFICIT', details: `Target network adapter speed (${maxSpeed}Gb) is lower than competitor (${reqSpeed}Gb).` };
  }

  const reqTotalPorts = spec.networking?.totalPorts || (reqPorts ? (spec.networking?.adapterCount || 1) * reqPorts : null);

  if (reqTotalPorts && targetPorts < reqTotalPorts) {
    return { subsystem: 'OCP_NETWORKING_FABRIC', status: 'DEFICIT', details: `Target network ports (${targetPorts}) are fewer than competitor (${reqTotalPorts}).` };
  }

  const isExceed = (reqSpeed && maxSpeed > reqSpeed) || (reqTotalPorts && targetPorts > reqTotalPorts) || (reqProtocol === 'INFINIBAND_HDR' && targetProtocol === 'INFINIBAND_NDR');
  return {
    subsystem: 'OCP_NETWORKING_FABRIC',
    status: isExceed ? 'EXCEEDS' : 'MATCHED',
    details: `Target network fabric (${targetPorts} ports, max ${maxSpeed}Gb, protocol ${targetProtocol}) satisfies competitor ${reqProtocol} requirements.`
  };
}

function _evaluatePowerSupplyParity(spec, bom) {
  const reqPsu = spec.power?.psuCount;
  const reqWattage = spec.power?.psuWattage;
  const reqEfficiency = spec.power?.efficiency;

  if (reqPsu === null && reqWattage === null && !reqEfficiency) {
    return { subsystem: 'POWER_AND_REDUNDANCY', status: 'NOT_EVALUATED', details: 'No competitor power redundancy requirements specified.' };
  }

  let targetPsu = 0;
  let targetWattage = 0;
  let isTitanium = false;
  let isPlatinum = false;

  for (const item of bom) {
    const desc = (item.description || item.sku || '').toLowerCase();
    if (/\b(power supply|psu|flex slot)\b/i.test(desc) && !/\b(cage|cable|backplane|bracket)\b/i.test(desc)) {
      targetPsu += (item.quantity || 1);
      const wMatch = desc.match(/(\d{3,4})\s*w\b/i);
      if (wMatch) targetWattage = Math.max(targetWattage, parseInt(wMatch[1], 10));
      if (/\btitanium\b/i.test(desc)) isTitanium = true;
      if (/\bplatinum\b/i.test(desc)) isPlatinum = true;
    }
  }

  const expectedPsu = reqPsu || 2;
  if (targetPsu === 0) {
    return { subsystem: 'POWER_AND_REDUNDANCY', status: 'DEFICIT', details: `Target BOM contains 0 power supplies; competitor specified ${expectedPsu}x ${reqWattage ? reqWattage + 'W' : 'PSU'}.` };
  }

  if (targetPsu < expectedPsu) {
    return { subsystem: 'POWER_AND_REDUNDANCY', status: 'DEFICIT', details: `Target provides ${targetPsu} power supplies vs competitor ${expectedPsu} (Deficit: ${expectedPsu - targetPsu}).` };
  }

  if (reqWattage && targetWattage < reqWattage) {
    return { subsystem: 'POWER_AND_REDUNDANCY', status: 'DEFICIT', details: `Target PSU wattage (${targetWattage}W) is lower than competitor requirement (${reqWattage}W).` };
  }

  if (reqEfficiency === 'Titanium' && !isTitanium) {
    return { subsystem: 'POWER_AND_REDUNDANCY', status: 'DEFICIT', details: 'Target PSU efficiency (Platinum) does not satisfy required Titanium efficiency grade.' };
  }

  const isExceed = targetPsu > expectedPsu || (reqWattage && targetWattage > reqWattage);
  const targetEffDesc = isTitanium ? 'Titanium' : (isPlatinum ? 'Platinum' : '');
  return {
    subsystem: 'POWER_AND_REDUNDANCY',
    status: isExceed ? 'EXCEEDS' : 'MATCHED',
    details: `Target provides ${targetPsu}x ${targetWattage ? targetWattage + 'W ' : ''}${targetEffDesc} power supplies satisfying competitor requirements.`
  };
}

function _evaluateManagementLicenseParity(spec, bom) {
  const reqMgmt = spec.management?.tier;
  if (!reqMgmt) {
    return { subsystem: 'INFRASTRUCTURE_MANAGEMENT', status: 'NOT_EVALUATED', details: 'No competitor remote management tier specified.' };
  }

  const hasAdvancedLicense = bom.some(item => {
    const desc = (item.description || item.sku || '').toLowerCase();
    return /\b(ilo advanced|compute ops|ilo adv|intersight|xcc enterprise|idrac enterprise)\b/i.test(desc) ||
           /\b(e6u59abe|bd505a|r7a11aae|r7a10aae)\b/i.test(item.sku || '');
  });

  const isAdvancedTier = ['Enterprise', 'Advanced', 'Datacenter', 'Premier'].includes(reqMgmt);
  if (isAdvancedTier && !hasAdvancedLicense) {
    return {
      subsystem: 'INFRASTRUCTURE_MANAGEMENT',
      status: 'DEFICIT',
      details: `Target lacks explicit iLO Advanced / Compute Ops license required to match competitor ${reqMgmt} management tier.`
    };
  }

  return {
    subsystem: 'INFRASTRUCTURE_MANAGEMENT',
    status: 'MATCHED',
    details: `Target includes HPE ${hasAdvancedLicense ? 'iLO Advanced / Compute Ops Management' : 'iLO Standard'} license matching competitor ${reqMgmt} tier.`
  };
}

function audit12PointPhysicalParity(competitorSpec, targetBom = [], targetChassis = null) {
  const bom = Array.isArray(targetBom) ? targetBom : [];
  const spec = competitorSpec || {};

  const auditItems = AUDIT_SUBSYSTEMS.map(subsystem => {
    if (bom.length === 0) {
      return {
        subsystem,
        status: 'NOT_EVALUATED',
        details: 'Requires exact source requirements, target catalog facts and scoped physical evaluation.'
      };
    }

    switch (subsystem) {
      case 'COMPUTE_PROCESSORS': return _evaluateComputeProcessorsParity(spec, bom);
      case 'MEMORY_TOPOLOGY': return _evaluateMemoryTopologyParity(spec, bom, targetChassis);
      case 'ACCELERATORS_GPU': return _evaluateGpuParity(spec, bom);
      case 'THERMAL_ENVIRONMENT': return _evaluateThermalParity(spec, bom);
      case 'STORAGE_CONTROLLER_CACHE': return _evaluateStorageControllerParity(spec, bom);
      case 'STORAGE_CABLING': return _evaluateOpticalTransceiverParity(spec, bom);
      case 'DATA_STORAGE_DRIVES': return _evaluateDriveParity(spec, bom);
      case 'BOOT_STORAGE_SUBSYSTEM': return _evaluateBootStorageParity(spec, bom);
      case 'PCIE_EXPANSION_RISERS': return _evaluatePcieRisersParity(spec, bom);
      case 'OCP_NETWORKING_FABRIC': return _evaluateNetworkingFabricParity(spec, bom);
      case 'POWER_AND_REDUNDANCY': return _evaluatePowerSupplyParity(spec, bom);
      case 'INFRASTRUCTURE_MANAGEMENT': return _evaluateManagementLicenseParity(spec, bom);
      default:
        return {
          subsystem,
          status: 'NOT_EVALUATED',
          details: 'Requires target chassis physical aspect evaluation and QuickSpecs verification.'
        };
    }
  });

  const passedSubsystems = auditItems.filter(i => i.status === 'MATCHED' || i.status === 'EXCEEDS').length;
  const actionRequiredSubsystems = auditItems.filter(i => i.status === 'DEFICIT').length;
  const unresolvedSubsystems = auditItems.filter(i => i.status === 'NOT_EVALUATED').length;
  const totalAudited = passedSubsystems + actionRequiredSubsystems;
  const is100PercentCompliant = totalAudited > 0 && actionRequiredSubsystems === 0 && unresolvedSubsystems === 0;

  return {
    status: totalAudited === 0 ? 'NOT_EVALUATED' : (actionRequiredSubsystems > 0 ? 'ACTION_REQUIRED' : 'PASSED'),
    targetChassis,
    is100PercentCompliant,
    portalValidationStatus: 'PORTAL VALIDATION PENDING',
    auditItems,
    missingEnablementKits: [],
    engineeringTradeoffs: [],
    totalSubsystemsAudited: totalAudited,
    passedSubsystems,
    actionRequiredSubsystems,
    warningSubsystems: 0,
    unresolvedSubsystems,
    sourceRequirements: competitorSpec,
    candidateItemCount: bom.length
  };
}

function transformCompetitorQuote(input, sourceVendor = null, targetChassis = null, options = {}) {
  const safeOptions = options || {};
  const competitorSpec = parseCompetitorSpecification(input, sourceVendor);
  const nodeMultiplier = safeOptions.nodeMultiplier ?? safeOptions.nodes ?? 1;
  if (!Number.isSafeInteger(nodeMultiplier) || nodeMultiplier < 1) throw new Error('Node multiplier must be a positive integer.');
  const candidateBom = structuredClone(safeOptions.targetBom || []);
  if (!Array.isArray(candidateBom)) throw new Error('targetBom must be an array of per-node items.');
  for (const item of candidateBom) {
    const quantity = item.quantity ?? item.qty;
    if (!item.sku || !Number.isSafeInteger(quantity) || quantity < 1) throw new Error('Candidate items require a SKU and positive integer quantity.');
  }
  const auditReport = audit12PointPhysicalParity(competitorSpec, candidateBom, targetChassis);
  return {
    status: !targetChassis ? 'TARGET_PRODUCT_REQUIRED' : candidateBom.length ? 'CANDIDATE_EVALUATION_REQUIRED' : 'SCOPED_SIZING_REQUIRED',
    portalValidationStatus: 'PORTAL VALIDATION PENDING',
    competitorSpec, targetChassis, nodeMultiplier, quantityBasis: 'PER_NODE', candidateBom,
    auditReport, strategyMatrix: {}, recommendedBom: [],
    nextAction: 'Use route_query RFP sizing for the exact target, then eval_boq for each candidate and the structured NotebookLM validator before live vendor acceptance.'
  };
}

module.exports = {
  AUDIT_SUBSYSTEMS,
  GPU_TIERS,
  FABRIC_PROTOCOL_RANKS,
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
};
