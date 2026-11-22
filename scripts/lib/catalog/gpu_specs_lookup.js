'use strict';
/**
 * scripts/lib/catalog/gpu_specs_lookup.js
 *
 * Authoritative QuickSpecs-sourced GPU/Accelerator hardware specifications
 * (TDP, VRAM, form factor, auxiliary power connector, and workload tier)
 * plus LTO tape generation capacity specifications.
 *
 * Ordered from most specific to least specific model matcher.
 */

const GPU_SPEC_TABLE = Object.freeze([
  // NVIDIA Blackwell / Hopper / Ada / Ampere Data Center GPUs
  {
    pattern: /\b(?:nvidia\s+)?gb200\b/i,
    gpuModel: 'NVIDIA GB200',
    tdpWatts: 1200,
    vramGb: 192,
    formFactor: 'SXM/OAM',
    auxPower: 'Direct Liquid / Baseboard',
    tier: 'Training / HPC'
  },
  {
    pattern: /\b(?:nvidia\s+)?b200\b/i,
    gpuModel: 'NVIDIA B200',
    tdpWatts: 1000,
    vramGb: 180,
    formFactor: 'SXM/OAM',
    auxPower: 'SXM Baseboard',
    tier: 'Training / HPC'
  },
  {
    pattern: /\b(?:nvidia\s+)?b100\b/i,
    gpuModel: 'NVIDIA B100',
    tdpWatts: 700,
    vramGb: 192,
    formFactor: 'SXM/OAM',
    auxPower: 'SXM Baseboard',
    tier: 'Training / HPC'
  },
  {
    pattern: /\b(?:nvidia\s+)?h200\s*nvl\b/i,
    gpuModel: 'NVIDIA H200 NVL',
    tdpWatts: 600,
    vramGb: 141,
    formFactor: 'Double-Wide PCIe',
    auxPower: '16-pin (12V-2x6)',
    tier: 'Training / HPC'
  },
  {
    pattern: /\b(?:nvidia\s+)?h200\b/i,
    gpuModel: 'NVIDIA H200',
    tdpWatts: 700,
    vramGb: 141,
    formFactor: 'SXM/OAM',
    auxPower: 'SXM Baseboard',
    tier: 'Training / HPC'
  },
  {
    pattern: /\b(?:nvidia\s+)?h100\s*nvl\b/i,
    gpuModel: 'NVIDIA H100 NVL',
    tdpWatts: 400,
    vramGb: 94,
    formFactor: 'Double-Wide PCIe',
    auxPower: '16-pin (12VHPWR)',
    tier: 'Training / HPC'
  },
  {
    pattern: /\b(?:nvidia\s+)?h100\b.*\bsxm\b|\bsxm\b.*\bh100\b/i,
    gpuModel: 'NVIDIA H100 SXM',
    tdpWatts: 700,
    vramGb: 80,
    formFactor: 'SXM/OAM',
    auxPower: 'SXM Baseboard',
    tier: 'Training / HPC'
  },
  {
    pattern: /\b(?:nvidia\s+)?h100\b/i,
    gpuModel: 'NVIDIA H100 PCIe',
    tdpWatts: 350,
    vramGb: 80,
    formFactor: 'Double-Wide PCIe',
    auxPower: '16-pin (12VHPWR)',
    tier: 'Training / HPC'
  },
  {
    pattern: /\b(?:nvidia\s+)?l40s\b/i,
    gpuModel: 'NVIDIA L40S',
    tdpWatts: 350,
    vramGb: 48,
    formFactor: 'Double-Wide PCIe',
    auxPower: '16-pin (12VHPWR)',
    tier: 'Inference / AI'
  },
  {
    pattern: /\b(?:nvidia\s+)?l40\b/i,
    gpuModel: 'NVIDIA L40',
    tdpWatts: 300,
    vramGb: 48,
    formFactor: 'Double-Wide PCIe',
    auxPower: '16-pin (12VHPWR)',
    tier: 'Inference / AI'
  },
  {
    pattern: /\b(?:nvidia\s+)?l4\b/i,
    gpuModel: 'NVIDIA L4',
    tdpWatts: 72,
    vramGb: 24,
    formFactor: 'Single-Wide PCIe',
    auxPower: 'None (PCIe Slot Powered)',
    tier: 'Inference / AI'
  },
  {
    pattern: /\b(?:nvidia\s+)?a100\b.*\bsxm\b|\bsxm\b.*\ba100\b/i,
    gpuModel: 'NVIDIA A100 SXM',
    tdpWatts: 400,
    vramGb: 80,
    formFactor: 'SXM/OAM',
    auxPower: 'SXM Baseboard',
    tier: 'Training / HPC'
  },
  {
    pattern: /\b(?:nvidia\s+)?a100\b.*\b40\s*gb\b/i,
    gpuModel: 'NVIDIA A100 40GB PCIe',
    tdpWatts: 250,
    vramGb: 40,
    formFactor: 'Double-Wide PCIe',
    auxPower: '8-pin CPU/EPS',
    tier: 'Training / HPC'
  },
  {
    pattern: /\b(?:nvidia\s+)?a100\b/i,
    gpuModel: 'NVIDIA A100 80GB PCIe',
    tdpWatts: 300,
    vramGb: 80,
    formFactor: 'Double-Wide PCIe',
    auxPower: '8-pin CPU/EPS',
    tier: 'Training / HPC'
  },
  {
    pattern: /\b(?:nvidia\s+)?a40\b/i,
    gpuModel: 'NVIDIA A40',
    tdpWatts: 300,
    vramGb: 48,
    formFactor: 'Double-Wide PCIe',
    auxPower: '8-pin CPU/EPS',
    tier: 'Workstation / Viz'
  },
  {
    pattern: /\b(?:nvidia\s+)?a30\b/i,
    gpuModel: 'NVIDIA A30',
    tdpWatts: 165,
    vramGb: 24,
    formFactor: 'Double-Wide PCIe',
    auxPower: '8-pin CPU/EPS',
    tier: 'Inference / AI'
  },
  {
    pattern: /\b(?:nvidia\s+)?a16\b/i,
    gpuModel: 'NVIDIA A16',
    tdpWatts: 250,
    vramGb: 64,
    formFactor: 'Double-Wide PCIe',
    auxPower: '8-pin CPU/EPS',
    tier: 'Inference / AI'
  },
  {
    pattern: /\b(?:nvidia\s+)?a2\b/i,
    gpuModel: 'NVIDIA A2',
    tdpWatts: 60,
    vramGb: 16,
    formFactor: 'Single-Wide PCIe',
    auxPower: 'None (PCIe Slot Powered)',
    tier: 'Inference / AI'
  },
  {
    pattern: /\b(?:nvidia\s+)?rtx\s*pro\s*6000\s*blackwell\b/i,
    gpuModel: 'NVIDIA RTX PRO 6000 Blackwell',
    tdpWatts: 600,
    vramGb: 96,
    formFactor: 'Double-Wide PCIe',
    auxPower: '16-pin (12V-2x6)',
    tier: 'Workstation / Viz'
  },
  {
    pattern: /\b(?:nvidia\s+)?rtx\s*pro\s*4500\s*blackwell\b/i,
    gpuModel: 'NVIDIA RTX PRO 4500 Blackwell',
    tdpWatts: 200,
    vramGb: 32,
    formFactor: 'Double-Wide PCIe',
    auxPower: '16-pin (12V-2x6)',
    tier: 'Workstation / Viz'
  },
  {
    pattern: /\b(?:nvidia\s+)?rtx\s*6000\s*ada\b/i,
    gpuModel: 'NVIDIA RTX 6000 Ada',
    tdpWatts: 300,
    vramGb: 48,
    formFactor: 'Double-Wide PCIe',
    auxPower: '16-pin (12VHPWR)',
    tier: 'Workstation / Viz'
  },
  {
    pattern: /\b(?:nvidia\s+)?rtx\s*5000\s*ada\b/i,
    gpuModel: 'NVIDIA RTX 5000 Ada',
    tdpWatts: 250,
    vramGb: 32,
    formFactor: 'Double-Wide PCIe',
    auxPower: '16-pin (12VHPWR)',
    tier: 'Workstation / Viz'
  },
  {
    pattern: /\b(?:nvidia\s+)?rtx\s*4000\s*sff\s*ada\b/i,
    gpuModel: 'NVIDIA RTX 4000 SFF Ada',
    tdpWatts: 70,
    vramGb: 20,
    formFactor: 'Single-Wide PCIe',
    auxPower: 'None (PCIe Slot Powered)',
    tier: 'Workstation / Viz'
  },
  {
    pattern: /\b(?:nvidia\s+)?rtx\s*4000\s*ada\b/i,
    gpuModel: 'NVIDIA RTX 4000 Ada',
    tdpWatts: 130,
    vramGb: 20,
    formFactor: 'Single-Wide PCIe',
    auxPower: '16-pin (12VHPWR)',
    tier: 'Workstation / Viz'
  },
  // AMD Instinct & Intel Gaudi Accelerators
  {
    pattern: /\b(?:amd\s+)?(?:instinct\s+)?mi325x\b/i,
    gpuModel: 'AMD Instinct MI325X',
    tdpWatts: 1000,
    vramGb: 256,
    formFactor: 'SXM/OAM',
    auxPower: 'OAM Baseboard',
    tier: 'Training / HPC'
  },
  {
    pattern: /\b(?:amd\s+)?(?:instinct\s+)?mi300x\b/i,
    gpuModel: 'AMD Instinct MI300X',
    tdpWatts: 750,
    vramGb: 192,
    formFactor: 'SXM/OAM',
    auxPower: 'OAM Baseboard',
    tier: 'Training / HPC'
  },
  {
    pattern: /\b(?:amd\s+)?(?:instinct\s+)?mi300a\b/i,
    gpuModel: 'AMD Instinct MI300A',
    tdpWatts: 760,
    vramGb: 128,
    formFactor: 'SXM/OAM',
    auxPower: 'OAM Baseboard',
    tier: 'Training / HPC'
  },
  {
    pattern: /\b(?:amd\s+)?(?:instinct\s+)?mi210\b/i,
    gpuModel: 'AMD Instinct MI210',
    tdpWatts: 300,
    vramGb: 64,
    formFactor: 'Double-Wide PCIe',
    auxPower: '8-pin CPU/EPS',
    tier: 'Training / HPC'
  },
  {
    pattern: /\b(?:intel\s+)?gaudi\s*3\b/i,
    gpuModel: 'Intel Gaudi 3',
    tdpWatts: 600,
    vramGb: 128,
    formFactor: 'Double-Wide PCIe',
    auxPower: '16-pin (12V-2x6)',
    tier: 'Training / HPC'
  }
]);

const LTO_SPEC_TABLE = Object.freeze({
  'LTO-9': { nativeCapacityTb: 18, compressedCapacityTb: 45 },
  'LTO-8': { nativeCapacityTb: 12, compressedCapacityTb: 30 },
  'LTO-7': { nativeCapacityTb: 6, compressedCapacityTb: 15 },
  'LTO-6': { nativeCapacityTb: 2.5, compressedCapacityTb: 6.25 },
  'LTO-5': { nativeCapacityTb: 1.5, compressedCapacityTb: 3 },
  'LTO-4': { nativeCapacityTb: 0.8, compressedCapacityTb: 1.6 },
  'LTO-3': { nativeCapacityTb: 0.4, compressedCapacityTb: 0.8 }
});

function lookupGpuQuickSpecs(desc = '') {
  const text = String(desc || '');
  for (const spec of GPU_SPEC_TABLE) {
    if (spec.pattern.test(text)) {
      return {
        gpuModel: spec.gpuModel,
        tdpWatts: spec.tdpWatts,
        vramGb: spec.vramGb,
        formFactor: spec.formFactor,
        auxPower: spec.auxPower,
        tier: spec.tier
      };
    }
  }
  return null;
}

function lookupLtoQuickSpecs(desc = '') {
  const match = String(desc || '').match(/\blto[-\s]?([3-9])\b/i);
  if (!match) return null;
  const ltoGen = `LTO-${match[1]}`;
  const spec = LTO_SPEC_TABLE[ltoGen];
  return spec ? { ltoGen, ...spec } : { ltoGen, nativeCapacityTb: null, compressedCapacityTb: null };
}

module.exports = {
  GPU_SPEC_TABLE,
  LTO_SPEC_TABLE,
  lookupGpuQuickSpecs,
  lookupLtoQuickSpecs
};
