'use strict';
/**
 * scripts/lib/conflict/workload_dna.js — Workload DNA & Hardware Profiling
 *
 * Analyzes CPU cores/frequency, RAM per core ratio, GPU presence, and storage I/O specs
 * to classify the customer's primary workload profile.
 */

/**
 * Extract Workload DNA & Profile from BOQ hardware items.
 *
 * @param {Array<object>} items
 * @returns {{
 *   primaryWorkload: string,
 *   workloadDescription: string,
 *   totalCores: number,
 *   maxFreqGhz: number,
 *   totalMemoryGb: number,
 *   gbPerCore: number,
 *   hasGpu: boolean,
 *   gpuModel: string,
 *   gpuModels: Array<string>,
 *   totalGpuCount: number,
 *   driveCount: number,
 *   storageType: string,
 *   storageWorkload: string
 * }}
 */
function extractWorkloadDna(items = []) {
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

  // Classify Primary Workload DNA
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

  // NUMA & Memory Channel Interleaving Profile
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

module.exports = {
  extractWorkloadDna,
  validateNumaMemoryTopology
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
