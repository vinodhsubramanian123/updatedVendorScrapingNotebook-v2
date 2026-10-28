'use strict';

const assert = require('node:assert/strict');

// 1. Proposed extractWorkloadDna
function proposed_extractWorkloadDna(items = []) {
  const safeItems = Array.isArray(items) ? items : [];
  let totalCores = 0;
  let maxFreqGhz = 0;
  let cpuCount = 0;
  let totalMemoryGb = 0;
  let memoryCount = 0;
  let detectedChannelWidth = 8;
  let hasGpu = false;
  let gpuModels = [];
  let totalGpuCount = 0;
  let driveCount = 0;
  let storageType = 'NONE';
  let storageWorkload = 'READ_INTENSIVE';

  safeItems.forEach(it => {
    const desc = (it.description || '').toLowerCase();
    const qty = it.quantity || 1;

    // CPU Profile
    if (desc.includes('processor') || desc.includes('xeon') || desc.includes('epyc')) {
      if (!desc.includes('heatsink') && !desc.includes('heat sink') && !desc.includes('fan') && !desc.includes('cage') && !desc.includes('cable')) {
        cpuCount += qty;
      }
      if (desc.includes('epyc') && (desc.includes('9004') || desc.includes('9005') || desc.includes('genoa') || desc.includes('bergamo') || desc.includes('turin'))) {
        detectedChannelWidth = 12;
      } else if (desc.includes('xeon') && (desc.includes('4200') || desc.includes('5200') || desc.includes('6200') || desc.includes('8200') || desc.includes('cascade lake') || desc.includes('skylake'))) {
        detectedChannelWidth = 6;
      }
      const coreMatch = desc.match(/(\d+)\s*-?\s*core/i);
      if (coreMatch) totalCores += (parseInt(coreMatch[1], 10) * qty);
      const ghzMatch = desc.match(/(\d+\.\d+)\s*ghz/i);
      if (ghzMatch) {
        const ghz = parseFloat(ghzMatch[1]);
        if (ghz > maxFreqGhz) maxFreqGhz = ghz;
      }
    }

    // Memory Profile
    const isDriveOrStorage = desc.includes('ssd') || desc.includes('nvme') || desc.includes('hdd') || desc.includes('drive') || desc.includes('battery');
    if (!isDriveOrStorage && (desc.includes('memory') || desc.includes('rdimm') || desc.includes('ddr5') || desc.includes('ddr4') || desc.includes('dimm'))) {
      memoryCount += qty;
      const gbMatch = desc.match(/(\d+)\s*gb/i);
      if (gbMatch) totalMemoryGb += (parseInt(gbMatch[1], 10) * qty);
    }

    // GPU Profile
    if (!/cable|bridge|enablement|riser|fan|heatsink|switchboard|configuration/.test(desc) &&
      (desc.includes('nvidia') || desc.includes('gpu') || desc.includes('rtx') || desc.includes('h200') || desc.includes('l40s') || desc.includes('l4') || desc.includes('accelerator') || desc.includes('h100') || desc.includes('a100'))) {
      hasGpu = true;
      if (!gpuModels.includes(it.description)) {
        gpuModels.push(it.description);
      }
      totalGpuCount += qty;
    }

    // Storage I/O Profile
    if (desc.includes('ssd') || desc.includes('nvme') || desc.includes('hdd') || desc.includes('drive')) {
      if (!desc.includes('controller') && !desc.includes('cage') && !desc.includes('no drive')) {
        driveCount += qty;
        if (desc.includes('write intensive') || desc.includes('wi')) storageWorkload = 'WRITE_INTENSIVE';
        else if (desc.includes('mixed use') || desc.includes('mu')) storageWorkload = 'MIXED_USE';
        else if (desc.includes('read intensive') || desc.includes('ri')) storageWorkload = 'READ_INTENSIVE';
        else if (desc.includes('hdd') || desc.includes('sas 10k')) storageWorkload = 'CAPACITY_STORAGE';

        if (desc.includes('nvme')) storageType = 'NVME_GEN4';
        else if (desc.includes('sas')) storageType = 'SAS_12G';
        else if (desc.includes('sata')) storageType = 'SATA_6G';
      }
    }
  });

  const gbPerCore = totalCores > 0 ? parseFloat((totalMemoryGb / totalCores).toFixed(1)) : 0;
  const gpuModelStr = gpuModels.join(', ');

  let primaryWorkload = 'BALANCED_ENTERPRISE';
  let workloadDescription = 'General Enterprise Workload (Balanced Compute & Storage)';

  if (hasGpu) {
    primaryWorkload = 'VDI_AI_GRAPHICS';
    workloadDescription = `VDI / AI Inference & Graphics Acceleration (${totalGpuCount}x ${gpuModelStr || 'NVIDIA GPU'})`;
  } else if (gbPerCore >= 16 || totalMemoryGb >= 768) {
    primaryWorkload = 'DATABASE_IN_MEMORY';
    workloadDescription = `In-Memory Database & Analytics (High Memory Footprint: ${totalMemoryGb}GB RAM, ${gbPerCore}GB/Core)`;
  } else if (storageWorkload === 'WRITE_INTENSIVE' || storageWorkload === 'MIXED_USE') {
    primaryWorkload = 'STORAGE_HIGH_IOPS';
    workloadDescription = `High-IOPS Transactional Storage (${storageWorkload} ${storageType} SSDs)`;
  } else if (totalCores >= 64) {
    primaryWorkload = 'VIRTUALIZATION_DENSE';
    workloadDescription = `Dense Virtualization & Cloud Host (${totalCores} Total CPU Cores)`;
  }

  const sockets = Math.max(1, cpuCount || 1);
  const dimmsPerSocket = memoryCount > 0 ? (memoryCount / sockets) : 0;
  const isSocketSymmetric = memoryCount > 0 && cpuCount > 0 && (memoryCount % cpuCount === 0);
  const is1DpcBalanced = isSocketSymmetric && (dimmsPerSocket === detectedChannelWidth);
  const is2DpcBalanced = isSocketSymmetric && (dimmsPerSocket === detectedChannelWidth * 2);
  const isBalancedInterleaving = is1DpcBalanced || is2DpcBalanced;
  const isSupportedPopulation = isSocketSymmetric && [1, 2, 4, detectedChannelWidth, detectedChannelWidth * 2].includes(dimmsPerSocket);
  const numaTopology = {
    cpuSockets: cpuCount,
    memoryDimmCount: memoryCount,
    totalMemoryGb,
    dimmsPerSocket,
    channelWidth: detectedChannelWidth,
    isSocketSymmetric,
    isBalancedInterleaving,
    is1DpcBalanced,
    is2DpcBalanced,
    isSupportedPopulation,
    interleavingMode: is1DpcBalanced
      ? '1DPC_BALANCED_OPTIMAL'
      : (is2DpcBalanced ? '2DPC_BALANCED_MAX_CAPACITY' : (isSupportedPopulation ? 'PARTIAL_INTERLEAVED' : 'UNBALANCED_CHANNEL_POPULATION'))
  };

  return {
    primaryWorkload,
    workloadDescription,
    totalCores,
    maxFreqGhz,
    cpuCount,
    totalMemoryGb,
    memoryDimmCount: memoryCount,
    numaTopology,
    gbPerCore,
    hasGpu,
    gpuModel: gpuModelStr,
    gpuModels,
    totalGpuCount,
    driveCount,
    storageType,
    storageWorkload
  };
}

// 2. Proposed validateNumaMemoryTopology
function proposed_validateNumaMemoryTopology(items = [], options = {}) {
  const opts = options || {};
  const dna = Array.isArray(items) ? proposed_extractWorkloadDna(items) : (items?.numaTopology ? items : proposed_extractWorkloadDna([]));
  const channelWidth = opts.channelWidth || dna.numaTopology?.channelWidth || 8;
  const cpuSockets = opts.cpuSockets !== undefined ? opts.cpuSockets : (dna.numaTopology?.cpuSockets || dna.cpuCount || 1);
  const dimmCount = opts.dimmCount !== undefined ? opts.dimmCount : (dna.numaTopology?.memoryDimmCount || 0);
  const totalMemoryGb = opts.totalMemoryGb !== undefined ? opts.totalMemoryGb : (dna.totalMemoryGb || 0);

  const dimmsPerSocket = cpuSockets > 0 ? (dimmCount / cpuSockets) : 0;
  const isSocketSymmetric = cpuSockets > 0 && dimmCount > 0 && (dimmCount % cpuSockets === 0);
  const is1DpcBalanced = isSocketSymmetric && dimmsPerSocket === channelWidth;
  const is2DpcBalanced = isSocketSymmetric && dimmsPerSocket === (channelWidth * 2);
  const isBalancedInterleaving = is1DpcBalanced || is2DpcBalanced;
  const isSupportedPopulation = isSocketSymmetric && [1, 2, 4, channelWidth, channelWidth * 2].includes(dimmsPerSocket);

  const errors = [];
  if (dimmCount === 0 && cpuSockets > 0) {
    errors.push('No memory DIMMs detected for installed processors.');
  } else if (!isSocketSymmetric) {
    errors.push(`Unbalanced socket symmetry: ${dimmCount} DIMMs cannot be evenly distributed across ${cpuSockets} CPU sockets.`);
  } else if (!isSupportedPopulation) {
    errors.push(`Unbalanced channel population: ${dimmsPerSocket} DIMMs/socket violates ${channelWidth}-channel interleaving guidelines.`);
  }

  return {
    isValid: errors.length === 0,
    isSocketSymmetric,
    isBalancedInterleaving,
    is1DpcBalanced,
    is2DpcBalanced,
    isSupportedPopulation,
    cpuSockets,
    dimmCount,
    dimmsPerSocket,
    channelWidth,
    totalMemoryGb,
    interleavingMode: is1DpcBalanced
      ? '1DPC_BALANCED_OPTIMAL'
      : (is2DpcBalanced ? '2DPC_BALANCED_MAX_CAPACITY' : (isSupportedPopulation ? 'PARTIAL_INTERLEAVED' : 'UNBALANCED')),
    errors
  };
}

// 3. Proposed transformCompetitorQuote
const path = require('node:path');
const {
  parseCompetitorSpecification,
  audit12PointPhysicalParity,
  detectFabricProtocol
} = require(path.resolve(process.cwd(), 'scripts/lib/boq/cross_vendor_transformer.js'));

function proposed_transformCompetitorQuote(input, sourceVendor = null, targetChassis = null, options = {}) {
  const opts = options || {};
  const competitorSpec = parseCompetitorSpecification(input, sourceVendor);
  const nodeMultiplier = opts.nodeMultiplier ?? opts.nodes ?? 1;
  if (!Number.isSafeInteger(nodeMultiplier) || nodeMultiplier < 1) throw new Error('Node multiplier must be a positive integer.');
  const candidateBom = structuredClone(opts.targetBom || []);
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

// 4. Proposed _evaluateNetworkingFabricParity
const FABRIC_PROTOCOL_RANKS = {
  INFINIBAND_NDR: 4,
  INFINIBAND_HDR: 3,
  ROCE_V2: 2,
  ETHERNET: 1
};

function proposed_evaluateNetworkingFabricParity(spec, bom) {
  const reqSpeed = spec.networking?.speedGb;
  const reqPorts = spec.networking?.portsCount;
  const reqProtocol = spec.networking?.fabricProtocol || 'ETHERNET';

  if (reqSpeed === null && reqPorts === null && !spec.networking?.fabricProtocol) {
    return { subsystem: 'OCP_NETWORKING_FABRIC', status: 'NOT_EVALUATED', details: 'No competitor network fabric specification provided.' };
  }

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

// ─────────────────────────────────────────────────────────────
// VERIFICATION RUNNER
// ─────────────────────────────────────────────────────────────

console.log('Running proposed fix verifications...');

// 1. extractWorkloadDna(null)
const dnaNull = proposed_extractWorkloadDna(null);
assert.equal(typeof dnaNull, 'object');
assert.equal(dnaNull.primaryWorkload, 'BALANCED_ENTERPRISE');
console.log('✓ extractWorkloadDna(null) does not throw and returns valid default DNA');

// 2. validateNumaMemoryTopology([], null)
const numaNull = proposed_validateNumaMemoryTopology([], null);
assert.equal(typeof numaNull, 'object');
assert.equal(numaNull.isValid, false);
assert.equal(numaNull.channelWidth, 8);
console.log('✓ validateNumaMemoryTopology([], null) does not throw and handles null options');

// 3. transformCompetitorQuote(..., null)
const xformNull = proposed_transformCompetitorQuote('2x Xeon', 'DELL', 'DL380_Gen11', null);
assert.equal(typeof xformNull, 'object');
assert.equal(xformNull.nodeMultiplier, 1);
assert.equal(xformNull.targetChassis, 'DL380_Gen11');
console.log('✓ transformCompetitorQuote(..., null) does not throw and defaults nodeMultiplier to 1');

// 4. _evaluateNetworkingFabricParity targetProtocol tracking
const specNdr = parseCompetitorSpecification('1x NVIDIA ConnectX-7 NDR 400Gb/s InfiniBand OSFP Adapter');
const roceBom = [{ description: 'HPE 400Gb 1-port QSFP112 RoCEv2 Adapter', quantity: 1 }];
const resRoce = proposed_evaluateNetworkingFabricParity(specNdr, roceBom);
assert.equal(resRoce.status, 'DEFICIT');
assert.match(resRoce.details, /target BOM provides ROCE_V2/);
console.log('✓ _evaluateNetworkingFabricParity reports ROCE_V2 instead of ETHERNET on protocol mismatch:');
console.log('  Details:', resRoce.details);

// 4b. Mixed target adapters: 1GbE + 200Gb HDR adapter vs NDR requirement
const hdrBom = [
  { description: 'Broadcom 1GbE 4-port Base-T Adapter', quantity: 1 },
  { description: 'HPE InfiniBand HDR 200Gb 1-port QSFP56 Adapter', quantity: 1 }
];
const resHdr = proposed_evaluateNetworkingFabricParity(specNdr, hdrBom);
assert.equal(resHdr.status, 'DEFICIT');
assert.match(resHdr.details, /target BOM provides INFINIBAND_HDR/);
console.log('✓ _evaluateNetworkingFabricParity selects highest detected protocol (INFINIBAND_HDR > ETHERNET):');
console.log('  Details:', resHdr.details);

// 4c. Exceeds case: HDR required vs NDR provided
const specHdr = parseCompetitorSpecification('1x ConnectX-6 HDR 200Gb/s InfiniBand Adapter');
const ndrBom = [{ description: 'HPE InfiniBand NDR 400Gb 1-port OSFP Adapter', quantity: 1 }];
const resExceed = proposed_evaluateNetworkingFabricParity(specHdr, ndrBom);
assert.equal(resExceed.status, 'EXCEEDS');
console.log('✓ Exceeds case still works correctly:', resExceed.details);

console.log('\nAll 4 remediations verified successfully!');
