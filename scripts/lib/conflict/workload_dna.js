'use strict';
/**
 * scripts/lib/conflict/workload_dna.js — Workload DNA & Hardware Profiling
 *
 * Analyzes CPU cores/frequency, RAM per core ratio, GPU presence, and storage I/O specs
 * to classify the customer's primary workload profile.
 */

const GPU_EXCLUSION_PATTERN = /cable|bridge|enablement|riser|fan|heatsink|switchboard|configuration/i;
const GPU_DETECTION_PATTERN = /nvidia|gpu|rtx|h200|l40s|l4|accelerator|h100|a100/i;
const MEMORY_DETECTION_PATTERN = /memory|rdimm|ddr5|ddr4|dimm/i;
const {
  createWorkloadDemandRecord,
  extractWorkloadDemand,
  evaluateWorkloadSizingPilot
} = require('./sizing/workload_demand.js');

function _detectCpuChannelWidth(desc) {
  if (desc.includes('epyc') && (desc.includes('9004') || desc.includes('9005') || desc.includes('genoa') || desc.includes('bergamo') || desc.includes('turin'))) {
    return 12;
  }
  if (/\b(?:67|69)\d{2}p\b|granite\s*rapids/i.test(desc)) {
    return 12;
  }
  if (/\b(?:43|53|63|83|44|54|64|84|45|55|65|85)\d{2}[a-z+]*\b|ice\s*lake|sapphire\s*rapids|emerald\s*rapids|sierra\s*forest|\b67\d{2}e\b/i.test(desc)) {
    return 8;
  }
  if (desc.includes('xeon') && (desc.includes('4200') || desc.includes('5200') || desc.includes('6200') || desc.includes('8200') || /\b(?:42|52|62|82)\d{2}[a-z]*\b/i.test(desc) || desc.includes('cascade lake') || desc.includes('skylake'))) {
    return 6;
  }
  return null;
}

function _inspectCpuItem(desc, qty, state) {
  if (!desc.includes('processor') && !desc.includes('xeon') && !desc.includes('epyc')) return false;
  if (!desc.includes('heatsink') && !desc.includes('heat sink') && !desc.includes('fan') && !desc.includes('cage') && !desc.includes('cable')) {
    state.cpuCount += qty;
  }
  const detectedWidth = _detectCpuChannelWidth(desc);
  if (detectedWidth !== null) {
    state.detectedChannelWidth = detectedWidth;
  }
  const coreMatch = desc.match(/(\d+)\s*-?\s*core/i);
  if (coreMatch) state.totalCores += (parseInt(coreMatch[1], 10) * qty);
  const ghzMatch = desc.match(/(\d+\.\d+)\s*ghz/i);
  if (ghzMatch) {
    const ghz = parseFloat(ghzMatch[1]);
    if (ghz > state.maxFreqGhz) state.maxFreqGhz = ghz;
  }
  return true;
}

function _inspectMemoryItem(desc, qty, state) {
  const isDriveOrStorage = desc.includes('ssd') || desc.includes('nvme') || desc.includes('hdd') || desc.includes('drive') || desc.includes('battery');
  if (isDriveOrStorage || !MEMORY_DETECTION_PATTERN.test(desc)) return false;
  state.memoryCount += qty;
  const gbMatch = desc.match(/(\d+)\s*gb/i);
  if (gbMatch) state.totalMemoryGb += (parseInt(gbMatch[1], 10) * qty);
  return true;
}

function _inspectGpuItem(it, desc, qty, state) {
  if (GPU_EXCLUSION_PATTERN.test(desc) || !GPU_DETECTION_PATTERN.test(desc)) return false;
  state.hasGpu = true;
  if (!state.gpuModels.includes(it.description)) {
    state.gpuModels.push(it.description);
  }
  state.totalGpuCount += qty;
  const vramMatch = desc.match(/\b(\d{2,3})\s*gb\b/i);
  if (vramMatch) {
    state.gpuTotalVramGb = (state.gpuTotalVramGb || 0) + (parseInt(vramMatch[1], 10) * qty);
  }
  const tdpMatch = desc.match(/\b(\d{2,3})\s*w\b/i);
  if (!tdpMatch) state.gpuPowerAssumed = true;
  const estWatts = tdpMatch ? parseInt(tdpMatch[1], 10)
    : (/h200|h100|b100|b200/i.test(desc) ? 700 : (/l40s?|a40/i.test(desc) ? 350 : 75));
  state.gpuEstimatedPowerWatts = (state.gpuEstimatedPowerWatts || 0) + (estWatts * qty);
  if (desc.includes('nvlink') || desc.includes('nvl') || desc.includes('sxm')) {
    state.gpuHasNvlink = true;
  }
  return true;
}

function _inspectStorageItem(desc, qty, state) {
  if (!desc.includes('ssd') && !desc.includes('nvme') && !desc.includes('hdd') && !desc.includes('drive')) return false;
  if (desc.includes('controller') || desc.includes('cage') || desc.includes('no drive')) return false;

  state.driveCount += qty;
  if (desc.includes('write intensive') || /\bwi\b/i.test(desc)) state.storageWorkload = 'WRITE_INTENSIVE';
  else if (desc.includes('mixed use') || /\bmu\b/i.test(desc)) state.storageWorkload = 'MIXED_USE';
  else if (desc.includes('read intensive') || /\bri\b/i.test(desc)) state.storageWorkload = 'READ_INTENSIVE';
  else if (desc.includes('hdd') || desc.includes('sas 10k')) state.storageWorkload = 'CAPACITY_STORAGE';
  else if (state.storageWorkload === 'NONE') state.storageWorkload = 'UNKNOWN';

  if (desc.includes('nvme')) state.storageType = 'NVME_GEN4';
  else if (desc.includes('sas')) state.storageType = 'SAS_12G';
  else if (desc.includes('sata')) state.storageType = 'SATA_6G';
  return true;
}

function _inspectDnaHardwareItem(it, state) {
  if (!it || typeof it !== 'object') return;
  const desc = (it.description || '').toLowerCase();
  const qty = it.quantity || 1;

  _inspectCpuItem(desc, qty, state);
  _inspectMemoryItem(desc, qty, state);
  _inspectGpuItem(it, desc, qty, state);
  _inspectStorageItem(desc, qty, state);
}

function _classifyPrimaryWorkload({ hasGpu, totalGpuCount, gpuModelStr, totalCores, totalMemoryGb, gbPerCore, storageWorkload, storageType }) {
  if (hasGpu) {
    return {
      primaryWorkload: 'VDI_AI_GRAPHICS',
      workloadDescription: `VDI / AI Inference & Graphics Acceleration (${totalGpuCount}x ${gpuModelStr || 'NVIDIA GPU'})`
    };
  }
  if (gbPerCore >= 16 || totalMemoryGb >= 768) {
    return {
      primaryWorkload: 'DATABASE_IN_MEMORY',
      workloadDescription: `In-Memory Database & Analytics (High Memory Footprint: ${totalMemoryGb}GB RAM, ${gbPerCore}GB/Core)`
    };
  }
  if (storageWorkload === 'WRITE_INTENSIVE' || storageWorkload === 'MIXED_USE') {
    return {
      primaryWorkload: 'STORAGE_HIGH_IOPS',
      workloadDescription: `High-IOPS Transactional Storage (${storageWorkload} ${storageType} SSDs)`
    };
  }
  if (totalCores >= 64) {
    return {
      primaryWorkload: 'VIRTUALIZATION_DENSE',
      workloadDescription: `Dense Virtualization & Cloud Host (${totalCores} Total CPU Cores)`
    };
  }
  return {
    primaryWorkload: 'BALANCED_ENTERPRISE',
    workloadDescription: 'General Enterprise Workload (Balanced Compute & Storage)'
  };
}

function _computeNumaTopology({ cpuCount, memoryCount, totalMemoryGb, detectedChannelWidth }) {
  const dimmsPerSocket = cpuCount > 0 && memoryCount > 0 ? (memoryCount / cpuCount) : 0;
  const isSocketSymmetric = memoryCount > 0 && cpuCount > 0 && (memoryCount % cpuCount === 0);
  if (!Number.isSafeInteger(detectedChannelWidth) || detectedChannelWidth <= 0) {
    return {
      cpuSockets: cpuCount,
      memoryDimmCount: memoryCount,
      totalMemoryGb,
      dimmsPerSocket,
      channelWidth: null,
      isSocketSymmetric,
      isBalancedInterleaving: false,
      is1DpcBalanced: false,
      is2DpcBalanced: false,
      isSupportedPopulation: false,
      interleavingMode: 'UNKNOWN_CHANNEL_WIDTH'
    };
  }
  const is1DpcBalanced = isSocketSymmetric && (dimmsPerSocket === detectedChannelWidth);
  const is2DpcBalanced = isSocketSymmetric && (dimmsPerSocket === detectedChannelWidth * 2);
  const isBalancedInterleaving = is1DpcBalanced || is2DpcBalanced;
  const isSupportedPopulation = isSocketSymmetric && [1, 2, 4, detectedChannelWidth, detectedChannelWidth * 2].includes(dimmsPerSocket);

  let interleavingMode = 'UNBALANCED_CHANNEL_POPULATION';
  if (is1DpcBalanced) {
    interleavingMode = '1DPC_BALANCED_OPTIMAL';
  } else if (is2DpcBalanced) {
    interleavingMode = '2DPC_BALANCED_MAX_CAPACITY';
  } else if (isSupportedPopulation) {
    interleavingMode = 'PARTIAL_INTERLEAVED';
  }

  return {
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
    interleavingMode
  };
}

/**
 * Extract Workload DNA & Profile from BOQ hardware items.
 */
function extractWorkloadDna(items = []) {
  const safeItems = Array.isArray(items) ? items : [];
  const state = {
    totalCores: 0,
    maxFreqGhz: 0,
    cpuCount: 0,
    totalMemoryGb: 0,
    memoryCount: 0,
    detectedChannelWidth: null,
    hasGpu: false,
    gpuModels: [],
    totalGpuCount: 0,
    gpuPowerAssumed: false,
    driveCount: 0,
    storageType: 'NONE',
    storageWorkload: 'NONE'
  };

  safeItems.forEach(it => _inspectDnaHardwareItem(it, state));

  const gbPerCore = state.totalCores > 0 ? parseFloat((state.totalMemoryGb / state.totalCores).toFixed(1)) : 0;
  const gpuModelStr = state.gpuModels.join(', ');

  const { primaryWorkload, workloadDescription } = _classifyPrimaryWorkload({
    hasGpu: state.hasGpu,
    totalGpuCount: state.totalGpuCount,
    gpuModelStr,
    totalCores: state.totalCores,
    totalMemoryGb: state.totalMemoryGb,
    gbPerCore,
    storageWorkload: state.storageWorkload,
    storageType: state.storageType
  });

  const numaTopology = _computeNumaTopology({
    cpuCount: state.cpuCount,
    memoryCount: state.memoryCount,
    totalMemoryGb: state.totalMemoryGb,
    detectedChannelWidth: state.detectedChannelWidth
  });

  return {
    primaryWorkload,
    workloadDescription,
    totalCores: state.totalCores,
    maxFreqGhz: state.maxFreqGhz,
    cpuCount: state.cpuCount,
    totalMemoryGb: state.totalMemoryGb,
    memoryDimmCount: state.memoryCount,
    numaTopology,
    gbPerCore,
    hasGpu: state.hasGpu,
    gpuModel: gpuModelStr,
    gpuModels: state.gpuModels,
    totalGpuCount: state.totalGpuCount,
    gpuTotalVramGb: state.gpuTotalVramGb || 0,
    gpuEstimatedPowerWatts: state.gpuEstimatedPowerWatts || 0,
    gpuPowerBasis: state.hasGpu ? (state.gpuPowerAssumed ? 'HEURISTIC_ESTIMATE' : 'PARSED_DESCRIPTION') : 'NONE',
    gpuHasNvlink: Boolean(state.gpuHasNvlink),
    driveCount: state.driveCount,
    storageType: state.storageType,
    storageWorkload: state.storageWorkload
  };
}

/**
 * Validate NUMA memory topology and channel interleaving balance.
 *
 * @param {Array<object>|object} items - Hardware items or existing DNA/topology
 * @param {object} options - Optional overrides { channelWidth, cpuSockets, dimmCount, totalMemoryGb }
 * @returns {object} Validation result
 */
function validateNumaMemoryTopology(items = [], options = {}) {
  const safeOpts = options || {};
  const dna = Array.isArray(items) ? extractWorkloadDna(items) : (items?.numaTopology ? items : extractWorkloadDna([]));
  const channelWidth = safeOpts.channelWidth || dna.numaTopology?.channelWidth || 8;
  const cpuSockets = safeOpts.cpuSockets !== undefined ? safeOpts.cpuSockets : (dna.numaTopology?.cpuSockets || dna.cpuCount || 1);
  const dimmCount = safeOpts.dimmCount !== undefined ? safeOpts.dimmCount : (dna.numaTopology?.memoryDimmCount || 0);
  const totalMemoryGb = safeOpts.totalMemoryGb !== undefined ? safeOpts.totalMemoryGb : (dna.totalMemoryGb || 0);

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

/**
 * Infer Workload DNA from natural language query or RFP text.
 *
 * @param {string} text
 * @returns {object|null}
 */
function inferWorkloadDnaFromText(text = '') {
  const q = String(text || '').toLowerCase();
  const WORKLOAD_SIGNATURES = [
    {
      type: 'SAP_HANA',
      label: 'SAP HANA In-Memory Database',
      pattern: /\b(?:sap\s*hana|s\/?4\s*hana|bw\/?4\s*hana|hana\s*(?:db|database|in-memory))\b/i,
      recommendedGbPerCore: 16,
      storageWorkload: 'WRITE_INTENSIVE',
      confidence: 0.95
    },
    {
      type: 'AI_INFERENCE_TRAINING',
      label: 'AI/LLM Fine-Tuning & High-Throughput Inference',
      pattern: /\b(?:ai\s*training|llm\s*training|model\s*training|deep\s*learning|ai\s*inference|llm\s*inference|vllm|genai|generative\s*ai|rag\s*pipeline)\b/i,
      recommendedGbPerCore: 8,
      storageWorkload: 'MIXED_USE',
      hasGpu: true,
      confidence: 0.95
    },
    {
      type: 'VMWARE_VCF',
      label: 'VMware Cloud Foundation & Virtualization',
      pattern: /\b(?:vmware|vsphere|vcf|esxi|vsan|virtual\s*datacenter)\b/i,
      recommendedGbPerCore: 8,
      storageWorkload: 'MIXED_USE',
      confidence: 0.90
    },
    {
      type: 'MICROSOFT_SQL_OLTP',
      label: 'Mission-Critical SQL & High-Concurrency OLTP',
      pattern: /\b(?:microsoft\s*sql|ms\s*sql|sql\s*server|oracle\s*(?:db|database)|postgresql|oltp)\b/i,
      recommendedGbPerCore: 8,
      storageWorkload: 'WRITE_INTENSIVE',
      confidence: 0.90
    },
    {
      type: 'VDI_ENTERPRISE',
      label: 'Enterprise Virtual Desktop Infrastructure (VDI)',
      pattern: /\b(?:vdi|virtual\s*desktops?|horizon|citrix\s*(?:xen|virtual))\b/i,
      recommendedGbPerCore: 4,
      storageWorkload: 'READ_INTENSIVE',
      confidence: 0.88
    },
    {
      type: 'BIG_DATA_KAFKA',
      label: 'Streaming Analytics & Distributed Message Queue',
      pattern: /\b(?:kafka|spark|hadoop|cassandra|clickhouse|elasticsearch|opensearch)\b/i,
      recommendedGbPerCore: 4,
      storageWorkload: 'WRITE_INTENSIVE',
      confidence: 0.88
    },
    {
      type: 'HPC_COMPUTE',
      label: 'High-Performance Technical Computing (HPC)',
      pattern: /\b(?:hpc|supercomputing|fluid\s*dynamics|ansys|openfoam|molecular\s*dynamics)\b/i,
      recommendedGbPerCore: 4,
      storageWorkload: 'READ_INTENSIVE',
      confidence: 0.85
    }
  ];

  for (const sig of WORKLOAD_SIGNATURES) {
    if (sig.pattern.test(q)) {
      return {
        workloadType: sig.type,
        primaryWorkload: sig.label,
        confidence: sig.confidence,
        recommendedGbPerCore: sig.recommendedGbPerCore,
        storageWorkload: sig.storageWorkload,
        hasGpu: Boolean(sig.hasGpu),
        matchedPattern: sig.type
      };
    }
  }

  return null;
}

function _buildCandidateHardwareFromDna(dna, options = {}) {
  if (!dna) return null;
  return {
    totalNodes: options.totalNodes ?? options.nodeCount,
    perNodeMemoryGb: dna.totalMemoryGb > 0 ? dna.totalMemoryGb : undefined,
    perNodeCores: dna.totalCores > 0 ? dna.totalCores : undefined,
    cpuSocketsPerNode: dna.cpuCount > 0 ? dna.cpuCount : undefined,
    perNodeDimms: dna.memoryDimmCount > 0 ? dna.memoryDimmCount : undefined,
    channelWidth: dna.numaTopology?.channelWidth ?? undefined
  };
}

function _firstValue(values, fallback = null) {
  for (const val of values) {
    if (val !== undefined && val !== null && val !== '') return val;
  }
  return fallback;
}

function _resolveDemandProfileInputs(input, options) {
  const safeOpts = _firstValue([options], {});
  if (typeof input === 'string') {
    return { rawText: input, items: null, demandSource: input, candidate: _firstValue([safeOpts.candidate]) };
  }
  if (Array.isArray(input)) {
    return {
      rawText: String(_firstValue([safeOpts.rawText], '')),
      items: input,
      demandSource: _firstValue([safeOpts.demand], {}),
      candidate: _firstValue([safeOpts.candidate])
    };
  }
  const src = (input && typeof input === 'object') ? input : {};
  return {
    rawText: String(_firstValue([src.text, src.queryText, safeOpts.rawText], '')),
    items: Array.isArray(src.items) ? src.items : null,
    demandSource: _firstValue([src.demand, src], {}),
    candidate: _firstValue([src.candidate, safeOpts.candidate])
  };
}

/**
 * Build an explicit Workload Demand Profile & VMware VCF Sizing Pilot assessment.
 */
function buildWorkloadDemandProfile(input = {}, options = {}) {
  const safeOpts = options || {};
  const { rawText, items, demandSource, candidate } = _resolveDemandProfileInputs(input, safeOpts);
  const workloadDna = items ? extractWorkloadDna(items) : null;
  const inferredTextDna = rawText ? inferWorkloadDnaFromText(rawText) : null;

  const inferredFamily = safeOpts.workloadFamily || inferredTextDna?.workloadType;
  const demandOpts = { ...safeOpts, rawText, workloadFamily: inferredFamily };
  const demandRecord = extractWorkloadDemand(demandSource, demandOpts);
  const candidateSpec = candidate || _buildCandidateHardwareFromDna(workloadDna, safeOpts);
  const sizingEvaluation = evaluateWorkloadSizingPilot(demandRecord, candidateSpec, demandOpts);

  return {
    schemaVersion: '1.0',
    demandRecord,
    sizingEvaluation,
    workloadDna,
    inferredTextDna
  };
}

module.exports = {
  extractWorkloadDna,
  inferWorkloadDnaFromText,
  validateNumaMemoryTopology,
  buildWorkloadDemandProfile,
  createWorkloadDemandRecord,
  extractWorkloadDemand,
  evaluateWorkloadSizingPilot
};

// ── CLI Runner ─────────────────────────────────────────────────────────────
if (require.main === module) {
  const fs = require('fs');
  const path = require('path');
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node scripts/lib/conflict/workload_dna.js <boq_file.xlsx|csv|json> [--json]');
    process.exit(0);
  }

  const filePath = path.resolve(args[0]);
  const jsonOut = args.includes('--json');

  try {
    let items = [];
    if (filePath.endsWith('.json')) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      items = Array.isArray(data) ? data : (data.items || data.parsedItems || []);
    } else if (filePath.endsWith('.xlsx') || filePath.endsWith('.xls')) {
      const xlsx = require('xlsx-js-style');
      const wb = xlsx.readFile(filePath);
      const { parseSkuLines } = require('../boq/boq_parser.js');
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const csv = xlsx.utils.sheet_to_csv(sheet);
      items = parseSkuLines(csv.split(/\r?\n/)).items;
    } else {
      const { parseSkuLines } = require('../boq/boq_parser.js');
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      items = parseSkuLines(fileContent.split(/\r?\n/)).items;
    }

    const dna = extractWorkloadDna(items);

    if (jsonOut) {
      console.log(JSON.stringify(dna, null, 2));
    } else {
      console.log('\n===============================================================');
      console.log(`🧬 WORKLOAD DNA & APPLICATION PROFILING: ${path.basename(filePath)}`);
      console.log('---------------------------------------------------------------');
      console.log(`🎯 Primary Workload     : ${dna.primaryWorkload}`);
      console.log(`📝 Workload Profile    : ${dna.workloadDescription}`);
      console.log(`⚡ Total CPU Cores     : ${dna.totalCores} cores (Max Freq: ${dna.maxFreqGhz || 'N/A'} GHz)`);
      console.log(`💾 Total System RAM    : ${dna.totalMemoryGb} GB (${dna.gbPerCore} GB/Core)`);
      console.log(`🎮 GPU Acceleration    : ${dna.hasGpu ? `${dna.totalGpuCount}x ${dna.gpuModel}` : 'None'}`);
      console.log(`💽 Storage Profile     : ${dna.driveCount} drives (${dna.storageType}, ${dna.storageWorkload})`);
      console.log('===============================================================\n');
    }
  } catch (err) {
    console.error(`Workload DNA extraction error: ${err.message}`);
    process.exit(1);
  }
}
