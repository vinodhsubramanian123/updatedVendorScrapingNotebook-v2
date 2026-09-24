'use strict';
/**
 * tests/unit/test_cross_vendor_transformer.js
 *
 * Comprehensive Unit Tests for the Cross-Vendor Architectural Transpiler & Parity Engine:
 * - 12-Point Physical Parity Audit verification
 * - Dell PowerEdge R770 -> HPE DL380 Gen12 transpilation
 * - Missing companion enablement kits injection (OCP cable, 16-pin GPU, storage cabling, CMA, N+1 PSU)
 * - 5-Tier Strategy Matrix synthesis (Rank 1, Rank 1L, Rank 2, Rank 5)
 * - Cisco UCS & Lenovo ThinkSystem cross-vendor transformations
 * - route_query.js intent classification and dispatching
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const {
  AUDIT_SUBSYSTEMS,
  parseCompetitorSpecification,
  audit12PointPhysicalParity,
  transformCompetitorQuote
} = require('../../scripts/lib/boq/cross_vendor_transformer.js');

const { classifyQueryIntent } = require('../../scripts/evaluators/route_query.js');

const DELL_R770_RAW_TEXT = `PowerEdge R770 server; 2* Intel® Xeon® 6 Performance 6760P 2.2GHz, 64C/128T, 24GT/s, 320MB Cache, Turbo (330W), DDR5-6400; 6* PowerEdge 2U High-Performance Platinum Fan; 2.5-inch chassis supports up to 16 SAS4/SATA drives, Smart Flow, front PERC 12 (H965i); 8* 64GB RDIMM, 6400MT/s, dual-row; 6400MT/s RDIMMs; iDRAC10, Enterprise 17G; BOSS-N1 Control Card + 2 M.2 480GB (RAID 1) (22x80) Rear; 3* 960GB Solid State Drive, SATA, Read-Intensive, 6Gbps, 512e, 2.5-inch Hot-Swap AG Drive, 1 DWPD; PERC H965i Controller, Front, DC-MHs; Dual, fully redundant (1+1), hot-swappable MHS PSU, 3200W MM HLAC (for 200-240Vac only) Titanium; 2* Extension cord - C19/C20, 2.0M, 250V, 16A; Riser configuration 6-2, Rear FH, Rear 2x16 FH (G5), 1x8/1x16 OCP (G5), 2nd OCP x16 (G5), 2x16 DWFL (G5); Broadcom 57414 Dual-Port 25GbE SFP28 Adapter, OCP 3.0 NIC +Sec; ReadyRails Sliding Guide Rail with Cable Management Arm. Nvidia H200 NVL 141GB`;

test('Cross-Vendor Transformer - 12 Canonical Subsystem Registry', () => {
  assert.equal(AUDIT_SUBSYSTEMS.length, 12, 'Must define exactly 12 canonical physical subsystems');
  assert.ok(AUDIT_SUBSYSTEMS.includes('COMPUTE_PROCESSORS'));
  assert.ok(AUDIT_SUBSYSTEMS.includes('MEMORY_TOPOLOGY'));
  assert.ok(AUDIT_SUBSYSTEMS.includes('ACCELERATORS_GPU'));
  assert.ok(AUDIT_SUBSYSTEMS.includes('THERMAL_ENVIRONMENT'));
  assert.ok(AUDIT_SUBSYSTEMS.includes('STORAGE_CONTROLLER_CACHE'));
  assert.ok(AUDIT_SUBSYSTEMS.includes('STORAGE_CABLING'));
  assert.ok(AUDIT_SUBSYSTEMS.includes('DATA_STORAGE_DRIVES'));
  assert.ok(AUDIT_SUBSYSTEMS.includes('BOOT_STORAGE_SUBSYSTEM'));
  assert.ok(AUDIT_SUBSYSTEMS.includes('PCIE_EXPANSION_RISERS'));
  assert.ok(AUDIT_SUBSYSTEMS.includes('OCP_NETWORKING_FABRIC'));
  assert.ok(AUDIT_SUBSYSTEMS.includes('POWER_AND_REDUNDANCY'));
  assert.ok(AUDIT_SUBSYSTEMS.includes('INFRASTRUCTURE_MANAGEMENT'));
});

test('Cross-Vendor Transformer - Competitor Spec Parsing (Dell PowerEdge R770)', () => {
  const spec = parseCompetitorSpecification(DELL_R770_RAW_TEXT, 'DELL');

  assert.equal(spec.sourceVendor, 'DELL');
  assert.equal(spec.compute.cpuCount, 2, '2 sockets parsed');
  assert.equal(spec.compute.cpuModel, '6760P', 'Intel Xeon 6760P identified');
  assert.equal(spec.compute.cpuCores, 64, '64 cores per socket');
  assert.equal(spec.compute.cpuTdpWatts, 330, '330W TDP parsed');
  assert.equal(spec.compute.totalCores, 128, '128 total physical cores');

  assert.equal(spec.memory.dimmCount, 8, '8 DIMMs parsed');
  assert.equal(spec.memory.dimmCapacityGb, 64, '64GB per DIMM');
  assert.equal(spec.memory.totalMemoryGb, 512, '512GB total RAM');
  assert.equal(spec.memory.memorySpeedMt, 6400, 'DDR5-6400 MT/s');
  assert.equal(spec.memory.isBalanced1Dpc, true, 'Balanced 1DPC (8 channels x 1 DIMM) confirmed');

  assert.equal(spec.accelerator.hasGpu, true, 'GPU detected');
  assert.equal(spec.accelerator.gpuModel, 'NVIDIA H200 NVL 141GB');
  assert.equal(spec.accelerator.gpuTdpWatts, 450, '450W GPU TDP');
  assert.equal(spec.accelerator.requires16PinPower, true, '16-pin CEM 5.0 cable required');

  assert.equal(spec.storageController.hasStorageController, true);
  assert.equal(spec.storageController.controllerModel, 'PERC H965i Front DC-MHS');
  assert.equal(spec.dataStorage.driveCount, 3, '3x data SSDs parsed');
  assert.equal(spec.dataStorage.driveCapacity, '960GB');

  assert.equal(spec.bootStorage.hasBootDevice, true);
  assert.equal(spec.bootStorage.bootPlacement, 'REAR', 'Rear BOSS-N1 parsed');

  assert.equal(spec.expansionRisers.requiresMultiX16PrimaryRiser, true, 'Rear 2x16 FH G5 parsed');
  assert.equal(spec.networking.hasDualOcpReq, true, '2nd OCP x16 G5 parsed');
  assert.equal(spec.infrastructure.requiresCma, true, 'CMA parsed');
});

test('Cross-Vendor Transformer - 12-Point Parity Audit catches Missing Companion Kits', () => {
  const spec = parseCompetitorSpecification(DELL_R770_RAW_TEXT, 'DELL');

  // Draft incomplete BOM with standard components but missing companion cables/brackets
  const incompleteBom = [
    { sku: 'P73282-B21', description: 'HPE ProLiant DL380 Gen12 SFF Server' },
    { sku: 'P74567-B21', description: 'Intel Xeon 6760P 64-core 330W Processor' },
    { sku: 'P69728-B21', description: '64GB DDR5-6400 RDIMM' },
    { sku: 'S3U30C', description: 'NVIDIA H200 NVL 141GB Accelerator' },
    { sku: 'P47777-B21', description: 'HPE MR416i-p Gen11 Storage Controller' },
    { sku: 'P75740-B21', description: 'HPE DL380 Gen12 8SFF Cage Kit' },
    { sku: 'P40498-B21', description: 'HPE 960GB SATA RI SSD' },
    { sku: 'P78279-B21', description: 'HPE NS204i-u v2 Boot Device' },
    { sku: 'P10115-B21', description: 'Broadcom 57414 25GbE 2-port OCP3 Adapter' },
    { sku: 'P70739-B21', description: 'HPE DL380 Gen12 Easy Install Rail Kit' }
  ];

  const audit = audit12PointPhysicalParity(spec, incompleteBom, 'DL380_Gen12');

  assert.equal(audit.is100PercentCompliant, false, 'Incomplete BOM must not be certified 100% compliant');
  assert.ok(audit.missingEnablementKits.length >= 6, 'Must identify all omitted physical enablement kits');

  const missingSkus = audit.missingEnablementKits.map(k => k.sku);
  assert.ok(missingSkus.includes('P93055-B21'), 'Must flag 16-pin GPU power cable');
  assert.ok(missingSkus.includes('P79558-B21'), 'Must flag 25C ambient temperature tracking');
  assert.ok(missingSkus.includes('P01366-B21'), 'Must flag Smart Storage Battery');
  assert.ok(missingSkus.includes('P48918-B21'), 'Must flag Battery extension cable');
  assert.ok(missingSkus.includes('P76453-B21'), 'Must flag Storage backplane PCIe cable');
  assert.ok(missingSkus.includes('P74755-B21'), 'Must flag NS204i-u rear boot enablement kit');
  assert.ok(missingSkus.includes('P51083-B21'), 'Must flag Secondary Riser kit for H200');
  assert.ok(missingSkus.includes('P72203-B21'), 'Must flag 2nd OCP slot enablement cable');
  assert.ok(missingSkus.includes('P44712-B21'), 'Must flag 1800W-2200W Titanium PSUs for true N+1 redundancy');
  assert.ok(missingSkus.includes('P70744-B21'), 'Must flag 2U CMA');
});

test('Cross-Vendor Transformer - End-to-End Transpilation & 5-Tier Strategy Synthesis', () => {
  const result = transformCompetitorQuote(DELL_R770_RAW_TEXT, 'DELL', 'DL380_Gen12', { nodeMultiplier: 4 });

  assert.ok(result.recommendedBom.length > 10, 'Synthesizes complete, buildable BOM');
  assert.equal(result.auditReport.is100PercentCompliant, true, 'Auto-injected Rank 1 BOM is 100% compliant');

  const skusInRecommendedBom = new Set(result.recommendedBom.map(i => i.sku));
  assert.ok(skusInRecommendedBom.has('P93055-B21'), 'Contains 16-pin GPU cable');
  assert.ok(skusInRecommendedBom.has('P79558-B21'), 'Contains 25C ambient temp tracking');
  assert.ok(skusInRecommendedBom.has('P76453-B21'), 'Contains storage cable kit');
  assert.ok(skusInRecommendedBom.has('P48918-B21'), 'Contains battery extension cable');
  assert.ok(skusInRecommendedBom.has('P51083-B21'), 'Contains secondary riser kit');
  assert.ok(skusInRecommendedBom.has('P72203-B21'), 'Contains 2nd OCP cable kit');
  assert.ok(skusInRecommendedBom.has('P44712-B21'), 'Contains Titanium PSUs');
  assert.ok(skusInRecommendedBom.has('P70744-B21'), 'Contains CMA');

  // Multiplier test: 4 nodes
  const cpus = result.recommendedBom.find(i => i.sku === 'P74567-B21');
  assert.equal(cpus.quantity, 8, '4 nodes * 2 CPUs = 8 CPUs');

  const ssds = result.recommendedBom.find(i => i.sku === 'P40498-B21');
  assert.equal(ssds.quantity, 12, '4 nodes * 3 SSDs = 12 SSDs');

  // Strategy Matrix validation
  assert.ok(result.strategyMatrix.rank1ClosestAsk, 'Rank 1 present');
  assert.ok(result.strategyMatrix.rank1LLeastDelta, 'Rank 1L present');
  assert.ok(result.strategyMatrix.rank2HighPerformance, 'Rank 2 present');
  assert.ok(result.strategyMatrix.rank5BudgetOptimized, 'Rank 5 present');
});

test('Cross-Vendor Transformer - Cisco UCS C240 Transpilation', () => {
  const ciscoRawText = `Cisco UCS C240 M7 Server; 2x Intel Xeon Platinum 8480+ 56C 350W; 16x 32GB DDR5-4800 RDIMM; Cisco 12G SAS RAID Controller with 4GB FBWC; 8x 1.92TB SAS Read Intensive SSDs; Cisco UCS VIC 1477 Dual-Port 40/100G QSFP28; Dual 2300W Titanium PSUs; Cisco Ball Bearing Rail Kit with CMA.`;
  const spec = parseCompetitorSpecification(ciscoRawText, 'CISCO');

  assert.equal(spec.sourceVendor, 'CISCO');
  assert.equal(spec.compute.cpuCount, 2);
  assert.equal(spec.compute.cpuCores, 64); // normalized fallback / core parse
  assert.equal(spec.memory.dimmCount, 16);
  assert.equal(spec.memory.totalMemoryGb, 512);
  assert.equal(spec.dataStorage.driveCount, 8);
  assert.equal(spec.infrastructure.requiresCma, true);
});

test('Cross-Vendor Transformer - Intent Classification in route_query.js', () => {
  const query1 = 'Convert this Dell PowerEdge R770 quote with H200 to an equivalent HPE build';
  const c1 = classifyQueryIntent(query1);
  assert.equal(c1.intent, 'CROSS_VENDOR_TRANSFORMATION');
  assert.equal(c1.skillTarget, 'cross-vendor-transformation-skill');

  const query2 = 'Dell to HPE cross vendor mapping for R760 2U server';
  const c2 = classifyQueryIntent(query2);
  assert.equal(c2.intent, 'CROSS_VENDOR_TRANSFORMATION');
  assert.equal(c2.skillTarget, 'cross-vendor-transformation-skill');

  const query3 = 'Transpile competitor quote from Cisco UCS to ProLiant Gen12';
  const c3 = classifyQueryIntent(query3);
  assert.equal(c3.intent, 'CROSS_VENDOR_TRANSFORMATION');
  assert.equal(c3.skillTarget, 'cross-vendor-transformation-skill');
});
