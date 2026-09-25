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
  const cpuCores = numberMatch(cpu, /(\d+)\s*(?:cores?\b|c\b|c\/)/i);
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
  const auditItems = AUDIT_SUBSYSTEMS.map(subsystem => ({
    subsystem, status: 'NOT_EVALUATED',
    details: 'Requires exact source requirements, target catalog facts and scoped physical evaluation.'
  }));
  return {
    status: 'NOT_EVALUATED', targetChassis, is100PercentCompliant: false,
    portalValidationStatus: 'PORTAL VALIDATION PENDING',
    auditItems, missingEnablementKits: [], engineeringTradeoffs: [],
    totalSubsystemsAudited: 0, passedSubsystems: 0,
    actionRequiredSubsystems: 0, warningSubsystems: 0,
    unresolvedSubsystems: auditItems.length,
    sourceRequirements: competitorSpec, candidateItemCount: targetBom.length
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
