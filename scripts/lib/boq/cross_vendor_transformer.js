'use strict';

// Requirement extraction and candidate handoff, not a vendor acceptance engine.
// Product selection belongs to the scoped sizing/evaluation pipelines.
const AUDIT_SUBSYSTEMS = [
  'COMPUTE_PROCESSORS', 'MEMORY_TOPOLOGY', 'ACCELERATORS_GPU',
  'THERMAL_ENVIRONMENT', 'STORAGE_CONTROLLER_CACHE', 'STORAGE_CABLING',
  'DATA_STORAGE_DRIVES', 'BOOT_STORAGE_SUBSYSTEM', 'PCIE_EXPANSION_RISERS',
  'OCP_NETWORKING_FABRIC', 'POWER_AND_REDUNDANCY', 'INFRASTRUCTURE_MANAGEMENT'
];

function numberMatch(text, pattern) {
  const match = text.match(pattern);
  return match ? Number(match[1]) : null;
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
  const memory = lines.find(line => /\b(rdimm|dimm|memory|ddr[45])\b/i.test(line)) || '';
  const gpu = lines.find(line => /\b(gpu|accelerator|nvidia|h100|h200|l40|a100|l4|t4)\b/i.test(line)) || '';
  const drive = lines.find(line => /\b(ssd|hdd|nvme|drive)\b/i.test(line) && !/\b(tape|controller)\b/i.test(line)) || '';
  const ctrl = lines.find(line => /\b(raid|controller|hba|smart array|megaraid|perc)\b/i.test(line)) || '';
  const net = lines.find(line => /\b(nic|network|ethernet|ocp|sfp|base-t|10gbe|25gbe|100gbe|adapter)\b/i.test(line)) || '';
  const psu = lines.find(line => /\b(power supply|psu|flex slot|titanium|platinum)\b/i.test(line)) || '';
  const mgmt = lines.find(line => /\b(idrac|ilo|xcc|ipmi|enterprise|advanced)\b/i.test(line)) || '';

  const cpuCount = numberMatch(cpu, /(\d+)\s*[x*]\s*(?:intel|amd|xeon|epyc|processor)/i)
    ?? (/\bdual\b/i.test(cpu) ? 2 : /\bsingle\b/i.test(cpu) ? 1 : null);
  const cpuCores = numberMatch(cpu, /(\d+)[\s-]*(?:cores?\b|c\b|c\/)/i);
  const dimmCount = numberMatch(memory, /(\d+)\s*[x*]\s*\d+\s*gb/i);
  const dimmCapacityGb = numberMatch(memory, /(\d+)\s*gb/i);

  const driveCount = numberMatch(drive, /(\d+)\s*[x*]/i);
  const driveCapacityTb = numberMatch(drive, /(\d+(?:\.\d+)?)\s*tb/i) ?? (numberMatch(drive, /(\d+)\s*gb/i) ? numberMatch(drive, /(\d+)\s*gb/i) / 1000 : null);

  const gpuCount = numberMatch(gpu, /(\d+)\s*[x*]/i);
  const psuCount = numberMatch(psu, /(\d+)\s*[x*]/i) ?? (/\b(redundant|dual)\b/i.test(psu) ? 2 : null);

  return {
    sourceVendor: sourceVendor ? String(sourceVendor).toUpperCase() : null,
    sourceItems: Array.isArray(input) ? structuredClone(input) : null,
    rawInputText: text, sourceLines: lines,
    extractionStatus: 'PARTIAL_REQUIREMENTS_REVIEW_REQUIRED',
    compute: {
      cpuCount,
      cpuModel: cpu.match(/(?:xeon\s*(?:platinum|gold|silver|bronze)?|epyc)\s*([\d][\w+]*)/i)?.[1] || null,
      cpuCores, cpuTdpWatts: numberMatch(cpu, /(\d+)\s*w\b/i),
      totalCores: cpuCount !== null && cpuCores !== null ? cpuCount * cpuCores : null
    },
    memory: {
      dimmCount, dimmCapacityGb,
      memorySpeedMt: numberMatch(memory, /ddr[45]-(\d+)/i) ?? numberMatch(memory, /(\d+)\s*(?:mt\/s|mhz)/i),
      totalMemoryGb: dimmCount !== null && dimmCapacityGb !== null ? dimmCount * dimmCapacityGb : null,
      isBalanced1Dpc: null
    },
    accelerators: {
      gpuCount,
      gpuModel: gpu.match(/(?:nvidia\s*)?([hlat]\d{1,3}s?|gh\d{3})/i)?.[1]?.toUpperCase() || (gpu ? 'GPU' : null),
      gpuTdpWatts: numberMatch(gpu, /(\d+)\s*w\b/i)
    },
    localDrives: {
      count: driveCount,
      capacityTb: driveCapacityTb,
      interface: /nvme/i.test(drive) ? 'NVMe' : /sas/i.test(drive) ? 'SAS' : /sata/i.test(drive) ? 'SATA' : null
    },
    storageController: {
      controllerModel: ctrl.match(/(?:perc|megaraid|smart array|controller)\s*([\w\d]+)/i)?.[1] || null,
      cacheSizeGb: numberMatch(ctrl, /(\d+)\s*gb/i)
    },
    networking: {
      portsCount: numberMatch(net, /(\d+)\s*(?:port|ports|-port)/i) ?? null,
      speedGb: numberMatch(net, /(\d+)\s*(?:gb|gbe)/i),
      isOcp: /\bocp\b/i.test(net)
    },
    power: {
      psuCount,
      psuWattage: numberMatch(psu, /(\d{3,4})\s*w\b/i)
    },
    management: {
      tier: /enterprise/i.test(mgmt) ? 'Enterprise' : /advanced/i.test(mgmt) ? 'Advanced' : mgmt ? 'Standard' : null
    },
    unresolvedRequirements: ['Review every source line, including storage, GPU, fabric, support and quantity basis.']
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
      case 'COMPUTE_PROCESSORS': {
        const reqCores = spec.compute?.totalCores;
        const reqCpuCount = spec.compute?.cpuCount;
        if (reqCores === null && reqCpuCount === null) {
          return { subsystem, status: 'NOT_EVALUATED', details: 'No competitor compute/processor requirements specified.' };
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
          return { subsystem, status: 'DEFICIT', details: `Target BOM contains 0 processors; competitor specified ${reqCpuCount || 'CPUs'}.` };
        }
        if (reqCores != null) {
          if (targetCores >= reqCores) {
            return { subsystem, status: targetCores > reqCores ? 'EXCEEDS' : 'MATCHED', details: `Target provides ${targetCores} cores (${targetCpus} CPUs) vs competitor ${reqCores} cores.` };
          }
          return { subsystem, status: 'DEFICIT', details: `Target provides ${targetCores} cores vs competitor ${reqCores} cores (Deficit: ${reqCores - targetCores} cores).` };
        }
        if (reqCpuCount != null) {
          if (targetCpus >= reqCpuCount) {
            return { subsystem, status: targetCpus > reqCpuCount ? 'EXCEEDS' : 'MATCHED', details: `Target provides ${targetCpus} CPU sockets vs competitor ${reqCpuCount} sockets.` };
          }
          return { subsystem, status: 'DEFICIT', details: `Target provides ${targetCpus} CPU sockets vs competitor ${reqCpuCount} sockets.` };
        }
        return { subsystem, status: 'NOT_EVALUATED', details: 'Insufficient processor specification.' };
      }

      case 'MEMORY_TOPOLOGY': {
        const reqMemGb = spec.memory?.totalMemoryGb;
        if (reqMemGb === null || reqMemGb === undefined) {
          return { subsystem, status: 'NOT_EVALUATED', details: 'No competitor memory capacity specified.' };
        }
        let targetMemGb = 0;
        for (const item of bom) {
          const desc = (item.description || item.sku || '').toLowerCase();
          if (/\b(dimm|rdimm|smart memory|memory)\b/i.test(desc) && !/\b(battery|controller)\b/i.test(desc)) {
            const capMatch = desc.match(/(\d+)\s*gb/i);
            const cap = capMatch ? parseInt(capMatch[1], 10) : 32;
            targetMemGb += cap * (item.quantity || 1);
          }
        }
        if (targetMemGb >= reqMemGb) {
          return { subsystem, status: targetMemGb > reqMemGb ? 'EXCEEDS' : 'MATCHED', details: `Target provides ${targetMemGb} GB RAM vs competitor requirement of ${reqMemGb} GB.` };
        }
        return { subsystem, status: 'DEFICIT', details: `Target provides ${targetMemGb} GB RAM vs competitor requirement of ${reqMemGb} GB (Deficit: ${reqMemGb - targetMemGb} GB).` };
      }

      case 'ACCELERATORS_GPU': {
        const reqGpu = spec.accelerators?.gpuCount;
        if (reqGpu === null || reqGpu === undefined || reqGpu === 0) {
          return { subsystem, status: 'NOT_EVALUATED', details: 'No competitor GPU accelerators specified.' };
        }
        let targetGpu = 0;
        for (const item of bom) {
          const desc = (item.description || item.sku || '').toLowerCase();
          if (/\b(gpu|accelerator|nvidia|h100|h200|l40|l4)\b/i.test(desc)) {
            targetGpu += (item.quantity || 1);
          }
        }
        if (targetGpu >= reqGpu) {
          return { subsystem, status: targetGpu > reqGpu ? 'EXCEEDS' : 'MATCHED', details: `Target provides ${targetGpu} GPU accelerator(s) vs competitor ${reqGpu}.` };
        }
        return { subsystem, status: 'DEFICIT', details: `Target provides ${targetGpu} GPU accelerator(s) vs competitor ${reqGpu} (Deficit: ${reqGpu - targetGpu}).` };
      }

      case 'DATA_STORAGE_DRIVES': {
        const reqDrives = spec.localDrives?.count;
        if (reqDrives === null || reqDrives === undefined || reqDrives === 0) {
          return { subsystem, status: 'NOT_EVALUATED', details: 'No competitor drive count specified.' };
        }
        let targetDrives = 0;
        for (const item of bom) {
          const desc = (item.description || item.sku || '').toLowerCase();
          if (/\b(ssd|hdd|nvme|drive)\b/i.test(desc) && !/\b(cage|backplane|cable|controller|power)\b/i.test(desc)) {
            targetDrives += (item.quantity || 1);
          }
        }
        if (targetDrives >= reqDrives) {
          return { subsystem, status: targetDrives > reqDrives ? 'EXCEEDS' : 'MATCHED', details: `Target provides ${targetDrives} drive(s) vs competitor ${reqDrives}.` };
        }
        return { subsystem, status: 'DEFICIT', details: `Target provides ${targetDrives} drive(s) vs competitor ${reqDrives} (Deficit: ${reqDrives - targetDrives}).` };
      }

      case 'OCP_NETWORKING_FABRIC': {
        const reqSpeed = spec.networking?.speedGb;
        const reqPorts = spec.networking?.portsCount;
        if (reqSpeed === null && reqPorts === null) {
          return { subsystem, status: 'NOT_EVALUATED', details: 'No competitor network fabric specification provided.' };
        }
        let targetPorts = 0;
        let maxSpeed = 0;
        for (const item of bom) {
          const desc = (item.description || item.sku || '').toLowerCase();
          if (/\b(nic|adapter|ethernet|ocp3?|sfp\d*|bcm\d*)\b/i.test(desc) && !/\b(power|chassis|cable)\b/i.test(desc)) {
            const portMatch = desc.match(/(\d+)\s*[-]?port/i);
            const speedMatch = desc.match(/(\d+)\s*(?:gb|gbe)/i);
            const p = portMatch ? parseInt(portMatch[1], 10) : 2;
            const s = speedMatch ? parseInt(speedMatch[1], 10) : 10;
            targetPorts += p * (item.quantity || 1);
            maxSpeed = Math.max(maxSpeed, s);
          }
        }
        if (reqSpeed && maxSpeed < reqSpeed) {
          return { subsystem, status: 'DEFICIT', details: `Target network adapter speed (${maxSpeed}GbE) is lower than competitor (${reqSpeed}GbE).` };
        }
        if (reqPorts && targetPorts < reqPorts) {
          return { subsystem, status: 'DEFICIT', details: `Target network ports (${targetPorts}) are fewer than competitor (${reqPorts}).` };
        }
        return { subsystem, status: 'MATCHED', details: `Target network fabric (${targetPorts} ports, max ${maxSpeed}GbE) satisfies competitor requirements.` };
      }

      case 'POWER_AND_REDUNDANCY': {
        const reqPsu = spec.power?.psuCount;
        if (reqPsu === null || reqPsu === undefined) {
          return { subsystem, status: 'NOT_EVALUATED', details: 'No competitor power redundancy requirements specified.' };
        }
        let targetPsu = 0;
        for (const item of bom) {
          const desc = (item.description || item.sku || '').toLowerCase();
          if (/\b(power supply|psu|flex slot)\b/i.test(desc)) {
            targetPsu += (item.quantity || 1);
          }
        }
        if (targetPsu >= reqPsu) {
          return { subsystem, status: targetPsu > reqPsu ? 'EXCEEDS' : 'MATCHED', details: `Target provides ${targetPsu} power supplies vs competitor ${reqPsu}.` };
        }
        return { subsystem, status: 'DEFICIT', details: `Target provides ${targetPsu} power supplies vs competitor ${reqPsu}.` };
      }

      case 'INFRASTRUCTURE_MANAGEMENT': {
        const reqMgmt = spec.management?.tier;
        if (!reqMgmt) {
          return { subsystem, status: 'NOT_EVALUATED', details: 'No competitor remote management tier specified.' };
        }
        const hasIlo = bom.some(item => /\b(ilo|compute ops|idrac|xcc)\b/i.test(item.description || item.sku || ''));
        return {
          subsystem,
          status: hasIlo ? 'MATCHED' : 'DEFICIT',
          details: hasIlo ? `Target includes HPE iLO management license matching ${reqMgmt} tier.` : `Target lacks explicit iLO management license for ${reqMgmt} tier.`
        };
      }

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
  const competitorSpec = parseCompetitorSpecification(input, sourceVendor);
  const nodeMultiplier = options.nodeMultiplier ?? options.nodes ?? 1;
  if (!Number.isSafeInteger(nodeMultiplier) || nodeMultiplier < 1) throw new Error('Node multiplier must be a positive integer.');
  const candidateBom = structuredClone(options.targetBom || []);
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

module.exports = { AUDIT_SUBSYSTEMS, parseCompetitorSpecification, audit12PointPhysicalParity, transformCompetitorQuote };
