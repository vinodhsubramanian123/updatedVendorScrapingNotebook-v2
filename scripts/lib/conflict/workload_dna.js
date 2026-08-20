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
  let totalCores = 0;
  let maxFreqGhz = 0;
  let totalMemoryGb = 0;
  let memoryCount = 0;
  let hasGpu = false;
  let gpuModels = [];
  let totalGpuCount = 0;
  let driveCount = 0;
  let storageType = 'NONE';
  let storageWorkload = 'READ_INTENSIVE';

  items.forEach(it => {
    const desc = (it.description || '').toLowerCase();
    const qty = it.quantity || 1;

    // CPU Profile
    if (desc.includes('processor') || desc.includes('xeon') || desc.includes('epyc')) {
      const coreMatch = desc.match(/(\d+)\s*-?\s*core/i);
      if (coreMatch) totalCores += (parseInt(coreMatch[1], 10) * qty);
      const ghzMatch = desc.match(/(\d+\.\d+)\s*ghz/i);
      if (ghzMatch) {
        const ghz = parseFloat(ghzMatch[1]);
        if (ghz > maxFreqGhz) maxFreqGhz = ghz;
      }
    }

    // Memory Profile
    if (desc.includes('memory') || desc.includes('rdimm') || desc.includes('ddr5')) {
      memoryCount += qty;
      const gbMatch = desc.match(/(\d+)\s*gb/i);
      if (gbMatch) totalMemoryGb += (parseInt(gbMatch[1], 10) * qty);
    }

    // GPU Profile
    if (desc.includes('nvidia') || desc.includes('gpu') || desc.includes('rtx') || desc.includes('h200') || desc.includes('l40s') || desc.includes('l4') || desc.includes('accelerator') || desc.includes('h100') || desc.includes('a100')) {
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

  return {
    primaryWorkload,
    workloadDescription,
    totalCores,
    maxFreqGhz,
    totalMemoryGb,
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

module.exports = {
  extractWorkloadDna
};
