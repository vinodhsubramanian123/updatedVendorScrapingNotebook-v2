'use strict';
/**
 * tests/integration/test_boq_eval_benchmarks.js — BOQ Aspect-Math & Evaluation Benchmark Suite
 *
 * Runs isolated synthetic BOQ scenarios against the BOQ Evaluator & Conflict Graph Engine.
 * Enforces strict FP/FN accounting, honest null metrics for zero denominators, isolated temp
 * CSV execution (never mutating tests/fixtures/), and explicit opt-in v2 atomic report saving.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { evaluateBOQMultiAspect } = require('../../scripts/lib/boq/boq_evaluator.js');
const { evaluateWholeSolutionGraph } = require('../../scripts/lib/conflict/conflict_graph.js');
const { recordEvaluationTelemetry } = require('../../scripts/lib/system/telemetry.js');
const { safeWriteJsonAtomic } = require('../../scripts/lib/system/fs_compat.js');

const BENCHMARK_REPORT_SCHEMA_VERSION = 2;
const DEFAULT_REPORT_PATH = path.join(__dirname, '../..', 'outputs', 'history', 'boq_eval_benchmark_report.json');

const VIOLATION_ERROR_PATTERNS = {
  HIGH_PERF_FAN_KIT: /high-?performance fan|240w limit|cooling envelope/i,
  DC_LUG_KIT: /lug kit|-48vdc/i,
  SMART_STORAGE_BATTERY: /smart storage battery|hybrid capacitor|cache backup/i,
  POWER_SUPPLY_REDUNDANCY: /single power supply|power.*redundancy/i,
  SAS_EXPANDER_CARD: /sas expander|exceeding 8 drives|exceeds direct controller/i,
  GPU_AUX_POWER_CABLE_KIT: /gpu.*aux.*power cable|gpu.*16-pin/i,
  HIGH_PERF_HEATSINK: /heatsink|heat sink/i,
  CE_MARK_REMOVAL_KIT: /ce mark|lot 9/i,
  PRIMARY_RISER_CABLE_KIT: /primary riser cable|activate slot 1|pcie active slot|exceeds electrically cabled/i,
  OCP_SLOT_EXCEEDED: /ocp.*slot|ocp adapter count/i,
  UNSOLICITED_OPTIONAL_SERVICE: /unsolicited optional service/i,
  FIO_MEMORY_: /standalone bto memory|factory integrated option/i,
  WINDOWS_CORE_LICENSES: /windows server.*core|core licensing/i
};

// ── Synthetic Test Benchmarks Suite (Isolated Clean & Single/Dual Fault CTO Baselines) ──
const BENCHMARK_SCENARIOS = [
  {
    id: 'BENCH-01-HIGH-TDP-THERMAL',
    name: 'High CPU TDP Thermal Fan Requirement (>240W)',
    description: 'DL380 Gen12 SFF with 280W TDP Intel Xeon CPU without High Performance Fan Kit',
    boqContent: `Product #,Description,Qty
P73282-B21,HPE ProLiant DL380 Gen12 SFF CTO Server,1
P73299-B21,Intel Xeon Gold 6548Y 2.8GHz 32-core 280W Processor for HPE,2
P73300-F21,HPE 32GB 2Rx8 DDR5-5600 Smart Memory FIO Kit,8
P74792-B21,HPE ProLiant DL380 Gen11/Gen12 High Performance Heat Sink Kit,2
P38995-B21,HPE 1600W Flex Slot Titanium Hot Plug Low Halogen Power Supply Kit,2
873763-B21,HPE ProLiant No Drive FIO Kit,1
R7A11AAE,HPE Compute Ops Management Enhanced 3-year Upfront ProLiant SaaS,1`,
    expectedViolations: ['HIGH_PERF_FAN_KIT'],
    expectedDomain: 'THERMAL'
  },
  {
    id: 'BENCH-02-TELCO-DC-LUG-KIT',
    name: 'Telco -48VDC Power Supply Missing Cable Lug Kit',
    description: '-48VDC telco power supply installed without required cable lug kit',
    boqContent: `Product #,Description,Qty
P73282-B21,HPE ProLiant DL380 Gen12 SFF CTO Server,1
P73299-B21,Intel Xeon Gold 6548Y 2.8GHz 32-core 280W Processor for HPE,2
P73300-F21,HPE 32GB 2Rx8 DDR5-5600 Smart Memory FIO Kit,8
P48820-B21,HPE ProLiant High Performance Fan Kit,1
P74792-B21,HPE ProLiant DL380 Gen11/Gen12 High Performance Heat Sink Kit,2
865434-B21,HPE 1600W Flex Slot -48VDC Hot Plug Power Supply,2
873763-B21,HPE ProLiant No Drive FIO Kit,1
R7A11AAE,HPE Compute Ops Management Enhanced 3-year Upfront ProLiant SaaS,1`,
    expectedViolations: ['DC_LUG_KIT'],
    expectedDomain: 'ELECTRICAL'
  },
  {
    id: 'BENCH-03-STORAGE-CACHE-BATTERY',
    name: 'Storage Controller Missing Smart Storage Battery',
    description: 'Smart Array RAID controller with write cache missing backup battery',
    boqContent: `Product #,Description,Qty
P73282-B21,HPE ProLiant DL380 Gen12 SFF CTO Server,1
P73299-B21,Intel Xeon Gold 6548Y 2.8GHz 32-core 280W Processor for HPE,2
P73300-F21,HPE 32GB 2Rx8 DDR5-5600 Smart Memory FIO Kit,8
P48820-B21,HPE ProLiant High Performance Fan Kit,1
P74792-B21,HPE ProLiant DL380 Gen11/Gen12 High Performance Heat Sink Kit,2
P38995-B21,HPE 1600W Flex Slot Titanium Hot Plug Low Halogen Power Supply Kit,2
P48803-B21,HPE ProLiant DL380 Gen11 x16/x16/x16 Primary Riser Kit,1
P75741-B21,HPE ProLiant Compute DL3XX Gen12 8SFF x4 U.3 Tri-Mode Drive Cage Kit,1
P76456-B21,HPE ProLiant Compute DL380 Gen12 8SFF x2 PCIe Box 2 Controller Cable Kit,1
P55415-B21,HPE Broadcom MR416i-o Gen11 x16 Lanes 8GB Cache Tri-Mode Controller,1
P48918-B21,HPE DL380 Gen11 Storage Controller Enablement Cable Kit,1
P40498-B21,HPE 960GB SAS 12G Read Intensive SFF BC Multi Vendor SSD,2
R7A11AAE,HPE Compute Ops Management Enhanced 3-year Upfront ProLiant SaaS,1`,
    expectedViolations: ['SMART_STORAGE_BATTERY'],
    expectedDomain: 'STORAGE_CACHE_BATTERY'
  },
  {
    id: 'BENCH-04-MULTI-CHASSIS-CTO-DIVISION',
    name: 'Multi-Chassis CTO Multiplier Fractional Division',
    description: '4x Server Nodes order with 32x total DIMMs (8x per node)',
    boqContent: `4x HPE DL380 Gen12 Server Nodes
P73282-B21,HPE ProLiant DL380 Gen12 SFF CTO Server,4
P73299-B21,Intel Xeon Gold 6548Y 2.8GHz 32-core 280W Processor for HPE,8
P73300-F21,HPE 32GB 2Rx8 DDR5-5600 Smart Memory FIO Kit,32
P48820-B21,HPE ProLiant High Performance Fan Kit,4
P74792-B21,HPE ProLiant DL380 Gen11/Gen12 High Performance Heat Sink Kit,8
P38995-B21,HPE 1600W Flex Slot Titanium Hot Plug Low Halogen Power Supply Kit,8
873763-B21,HPE ProLiant No Drive FIO Kit,4
R7A11AAE,HPE Compute Ops Management Enhanced 3-year Upfront ProLiant SaaS,4`,
    expectedViolations: [],
    expectedDomain: 'CLEANSING_FRACTIONAL'
  },
  {
    id: 'BENCH-05-PSU-REDUNDANCY-SINGLE',
    name: 'Single Power Supply Redundancy Warning',
    description: 'Dual-socket server node configured with only 1x PSU',
    boqContent: `Product #,Description,Qty
P73282-B21,HPE ProLiant DL380 Gen12 SFF CTO Server,1
P73299-B21,Intel Xeon Gold 6548Y 2.8GHz 32-core 280W Processor for HPE,2
P73300-F21,HPE 32GB 2Rx8 DDR5-5600 Smart Memory FIO Kit,8
P48820-B21,HPE ProLiant High Performance Fan Kit,1
P74792-B21,HPE ProLiant DL380 Gen11/Gen12 High Performance Heat Sink Kit,2
P38995-B21,HPE 1600W Flex Slot Titanium Hot Plug Low Halogen Power Supply Kit,1
873763-B21,HPE ProLiant No Drive FIO Kit,1
R7A11AAE,HPE Compute Ops Management Enhanced 3-year Upfront ProLiant SaaS,1`,
    expectedViolations: ['POWER_SUPPLY_REDUNDANCY'],
    expectedDomain: 'POWER_REDUNDANCY'
  },
  {
    id: 'BENCH-06-TRI-MODE-EXPANDER',
    name: 'Storage Expander Requirement for >16 SFF Drives on Single Controller',
    description: 'DL380 Gen11 24SFF with 24 SSDs and 1x 16-port Tri-Mode Controller without SAS Expander',
    boqContent: `Product #,Description,Qty
P52562-B21,HPE ProLiant DL380 Gen11 24SFF CTO Server,1
P49614-B21,Intel Xeon Silver 4410Y 2.0GHz 12-core 150W Processor for HPE,2
P43328-F21,HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory FIO Kit,8
P48905-B21,HPE ProLiant DL380 Gen11 Standard Heat Sink Kit,2
P48820-B21,HPE ProLiant High Performance Fan Kit,1
P38995-B21,HPE 1600W Flex Slot Titanium Hot Plug Low Halogen Power Supply Kit,2
P48803-B21,HPE ProLiant DL380 Gen11 x16/x16/x16 Primary Riser Kit,1
P48813-B21,HPE ProLiant DL380 Gen11 8SFF Tri-Mode Drive Cage Kit,3
P55415-B21,HPE Broadcom MR416i-o Gen11 x16 Lanes 8GB Cache Tri-Mode Controller,1
P48918-B21,HPE DL380 Gen11 Storage Controller Enablement Cable Kit,1
P01366-B21,HPE 96W Smart Storage Battery,1
P40498-B21,HPE 960GB SAS 12G Read Intensive SFF BC Multi Vendor SSD,24
R7A11AAE,HPE Compute Ops Management Enhanced 3-year Upfront ProLiant SaaS,1`,
    expectedViolations: ['SAS_EXPANDER_CARD'],
    expectedDomain: 'STORAGE_EXPANDER'
  },
  {
    id: 'BENCH-07-GPU-AUX-POWER-AND-FANS',
    name: 'PCIe GPU Accelerator Auxiliary Power Cable and Fan Requirement',
    description: 'DL380 Gen12 with 2x NVIDIA L40S PCIe GPUs without Aux Power Cable Kit or High Perf Fans',
    boqContent: `Product #,Description,Qty
P73282-B21,HPE ProLiant DL380 Gen12 SFF CTO Server,1
P73299-B21,Intel Xeon Gold 6548Y 2.8GHz 32-core 280W Processor for HPE,2
P73300-F21,HPE 32GB 2Rx8 DDR5-5600 Smart Memory FIO Kit,8
P74792-B21,HPE ProLiant DL380 Gen11/Gen12 High Performance Heat Sink Kit,2
P38995-B21,HPE 1600W Flex Slot Titanium Hot Plug Low Halogen Power Supply Kit,2
P48803-B21,HPE ProLiant DL380 Gen11 x16/x16/x16 Primary Riser Kit,1
P51083-B21,HPE ProLiant DL380 Gen11 x16/x16/x16 Secondary Riser Kit,1
P63584-B21,NVIDIA L40S 48GB PCIe Accelerator for HPE,2
873763-B21,HPE ProLiant No Drive FIO Kit,1
R7A11AAE,HPE Compute Ops Management Enhanced 3-year Upfront ProLiant SaaS,1`,
    expectedViolations: ['GPU_AUX_POWER_CABLE_KIT', 'HIGH_PERF_FAN_KIT'],
    expectedDomain: 'GPU_THERMAL_POWER'
  },
  {
    id: 'BENCH-08-HEATSINK-GEN11-ISOLATION',
    name: 'Gen11 High TDP Performance Heatsink Isolation (P74792-B21)',
    description: 'DL380 Gen11 with dual high-TDP 270W Intel Xeon Gold processors without heatsink',
    boqContent: `Product #,Description,Qty
P52560-B21,HPE ProLiant DL380 Gen11 8SFF CTO Server,1
P49614-B21,Intel Xeon Gold 6430 2.1GHz 32-core 270W Processor for HPE,2
P43328-F21,HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory FIO Kit,8
P48820-B21,HPE ProLiant High Performance Fan Kit,1
P38995-B21,HPE 1600W Flex Slot Titanium Hot Plug Low Halogen Power Supply Kit,2
873763-B21,HPE ProLiant No Drive FIO Kit,1
R7A11AAE,HPE Compute Ops Management Enhanced 3-year Upfront ProLiant SaaS,1`,
    expectedViolations: ['HIGH_PERF_HEATSINK'],
    expectedDomain: 'HEATSINK_ISOLATION'
  },
  {
    id: 'BENCH-09-ERP-LOT9-CE-MARK',
    name: 'EU Ecodesign Lot 9 Platinum PSU CE Mark Removal Requirement',
    description: 'High-draw dual-CPU server with 94% Platinum PSUs (>500W load) requiring CE Mark Removal Kit',
    boqContent: `Product #,Description,Qty
P73282-B21,HPE ProLiant DL380 Gen12 SFF CTO Server,1
P73299-B21,Intel Xeon Gold 6548Y 2.8GHz 32-core 280W Processor for HPE,2
P73300-F21,HPE 32GB 2Rx8 DDR5-5600 Smart Memory FIO Kit,16
P48820-B21,HPE ProLiant High Performance Fan Kit,1
P74792-B21,HPE ProLiant DL380 Gen11/Gen12 High Performance Heat Sink Kit,2
P38997-B21,HPE 1600W Flex Slot Platinum Hot Plug Power Supply,2
873763-B21,HPE ProLiant No Drive FIO Kit,1
R7A11AAE,HPE Compute Ops Management Enhanced 3-year Upfront ProLiant SaaS,1`,
    expectedViolations: ['CE_MARK_REMOVAL_KIT'],
    expectedDomain: 'REGULATORY_LOT9'
  },
  {
    id: 'BENCH-10-RISER-SLOT1-POWER-CABLE',
    name: 'Primary 3x16 Riser Slot 1 Cable Kit Requirement (>4 PCIe Cards)',
    description: 'DL380 Gen11 with 5 PCIe cards across risers requiring Primary Cable Kit P56073-B21',
    boqContent: `Product #,Description,Qty
P52560-B21,HPE ProLiant DL380 Gen11 8SFF CTO Server,1
P49614-B21,Intel Xeon Silver 4410Y 2.0GHz 12-core 150W Processor for HPE,2
P43328-F21,HPE 32GB 2Rx8 DDR5-4800 Registered Smart Memory FIO Kit,8
P48905-B21,HPE ProLiant DL380 Gen11 Standard Heat Sink Kit,2
P38995-B21,HPE 1600W Flex Slot Titanium Hot Plug Low Halogen Power Supply Kit,2
P48803-B21,HPE ProLiant DL380 Gen11 x16/x16/x16 Primary Riser Kit,1
P51083-B21,HPE ProLiant DL380 Gen11 x16/x16/x16 Secondary Riser Kit,1
P56074-B21,HPE ProLiant DL380 Gen11 x16/x16/x16 Secondary Riser Cable Kit,1
P26919-B21,HPE SN1610E 32Gb 1-port Fibre Channel Host Bus Adapter,2
P26922-B21,HPE SN1610E 32Gb 2-port Fibre Channel Host Bus Adapter,2
Q0L11A,HPE 32Gb SFP28 Short Wave 1-pack Pull Tab Optical Transceiver,6
P06250-B21,Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 Adapter for HPE,1
873763-B21,HPE ProLiant No Drive FIO Kit,1
R7A11AAE,HPE Compute Ops Management Enhanced 3-year Upfront ProLiant SaaS,1`,
    expectedViolations: ['PRIMARY_RISER_CABLE_KIT'],
    expectedDomain: 'PCIE_CABLING'
  },
  {
    id: 'BENCH-11-FORM-FACTOR-BUS-PIVOT',
    name: 'OCP Slot Overflow Requiring PCIe Form-Factor Pivot (INV-39)',
    description: '3x OCP form-factor devices exceeding 2 available OCP physical slots',
    boqContent: `Product #,Description,Qty
P73282-B21,HPE ProLiant DL380 Gen12 SFF CTO Server,1
P73299-B21,Intel Xeon Gold 6548Y 2.8GHz 32-core 280W Processor for HPE,2
P73300-F21,HPE 32GB 2Rx8 DDR5-5600 Smart Memory FIO Kit,8
P48820-B21,HPE ProLiant High Performance Fan Kit,1
P74792-B21,HPE ProLiant DL380 Gen11/Gen12 High Performance Heat Sink Kit,2
P38995-B21,HPE 1600W Flex Slot Titanium Hot Plug Low Halogen Power Supply Kit,2
P48803-B21,HPE ProLiant DL380 Gen11 x16/x16/x16 Primary Riser Kit,1
P75741-B21,HPE ProLiant Compute DL3XX Gen12 8SFF x4 U.3 Tri-Mode Drive Cage Kit,1
P76456-B21,HPE ProLiant Compute DL380 Gen12 8SFF x2 PCIe Box 2 Controller Cable Kit,1
P48828-B21,HPE ProLiant DL380 Gen11 CPU2 OCP2 x8 Enablement Cable Kit,1
P22758-B21,Intel E810-XXVDA2 Ethernet 10/25Gb 2-port SFP28 OCP3 Adapter for HPE,1
P10115-B21,Mellanox MCX631432AS-ADAT Ethernet 10/25Gb 2-port SFP28 OCP3 Adapter for HPE,1
P55415-B21,HPE Broadcom MR416i-o Gen11 x16 Lanes 8GB Cache Tri-Mode Controller,1
P48918-B21,HPE DL380 Gen11 Storage Controller Enablement Cable Kit,1
P01366-B21,HPE 96W Smart Storage Battery,1
P40498-B21,HPE 960GB SAS 12G Read Intensive SFF BC Multi Vendor SSD,2
R7A11AAE,HPE Compute Ops Management Enhanced 3-year Upfront ProLiant SaaS,1`,
    expectedViolations: ['OCP_SLOT_EXCEEDED'],
    expectedDomain: 'OCP_FORM_FACTOR_PIVOT'
  },
  {
    id: 'BENCH-12-UNSOLICITED-SERVICES-STRIP',
    name: 'Unsolicited Service & Software Exclusion (INV-32)',
    description: 'Customer BOQ containing unsolicited startup installation services and SaaS license',
    boqContent: `Product #,Description,Qty
P73282-B21,HPE ProLiant DL380 Gen12 SFF CTO Server,1
P73299-B21,Intel Xeon Gold 6548Y 2.8GHz 32-core 280W Processor for HPE,2
P73300-F21,HPE 32GB 2Rx8 DDR5-5600 Smart Memory FIO Kit,8
P48820-B21,HPE ProLiant High Performance Fan Kit,1
P74792-B21,HPE ProLiant DL380 Gen11/Gen12 High Performance Heat Sink Kit,2
P38995-B21,HPE 1600W Flex Slot Titanium Hot Plug Low Halogen Power Supply Kit,2
873763-B21,HPE ProLiant No Drive FIO Kit,1
R7A11AAE,HPE Compute Ops Management Enhanced 3-year Upfront ProLiant SaaS,1
HA114A1,HPE Installation and Startup Service,1
S1A05A,HPE GreenLake Private Cloud Business Edition SaaS,1`,
    expectedViolations: ['UNSOLICITED_OPTIONAL_SERVICE'],
    matchChannel: 'warning',
    expectedDomain: 'COMMERCIAL_SERVICE_EXCLUSION'
  },
  {
    id: 'BENCH-13-MULTI-CLUSTER-TENDER-SPLIT',
    name: 'Multi-Node Cluster Infrastructure & Rail Kit Sizing (INV-29)',
    description: '10x DL380 Server Nodes tender evaluating cluster RU and power envelope',
    boqContent: `10x HPE ProLiant DL380 Gen12 Server Cluster
P73282-B21,HPE ProLiant DL380 Gen12 SFF CTO Server,10
P73299-B21,Intel Xeon Gold 6548Y 2.8GHz 32-core 280W Processor for HPE,20
P73300-F21,HPE 32GB 2Rx8 DDR5-5600 Smart Memory FIO Kit,80
P48820-B21,HPE ProLiant High Performance Fan Kit,10
P74792-B21,HPE ProLiant DL380 Gen11/Gen12 High Performance Heat Sink Kit,20
P38995-B21,HPE 1600W Flex Slot Titanium Hot Plug Low Halogen Power Supply Kit,20
873763-B21,HPE ProLiant No Drive FIO Kit,10
R7A11AAE,HPE Compute Ops Management Enhanced 3-year Upfront ProLiant SaaS,10`,
    expectedViolations: [],
    expectedDomain: 'CLUSTER_SIZING'
  },
  {
    id: 'BENCH-14-FIO-MEMORY-IN-CTO-BASE',
    name: 'BTO Memory in CTO Base Chassis Constraint (Rule 81354490)',
    description: 'Standalone BTO memory SKU ordered inside CTO server container requiring FIO replacement',
    boqContent: `Product #,Description,Qty
P73282-B21,HPE ProLiant DL380 Gen12 SFF CTO Server,1
P73299-B21,Intel Xeon Gold 6548Y 2.8GHz 32-core 280W Processor for HPE,2
P64707-B21,HPE 32GB 2Rx8 DDR5-5600 Smart Memory BTO,8
P48820-B21,HPE ProLiant High Performance Fan Kit,1
P74792-B21,HPE ProLiant DL380 Gen11/Gen12 High Performance Heat Sink Kit,2
P38995-B21,HPE 1600W Flex Slot Titanium Hot Plug Low Halogen Power Supply Kit,2
873763-B21,HPE ProLiant No Drive FIO Kit,1
R7A11AAE,HPE Compute Ops Management Enhanced 3-year Upfront ProLiant SaaS,1`,
    expectedViolations: ['FIO_MEMORY_P64707-F21'],
    expectedDomain: 'CONTAINER_TREE_FIO'
  },
  {
    id: 'BENCH-15-OS-CORE-LICENSING',
    name: 'Windows Server 64-Core Physical Core Multiplier Licensing (INV-28)',
    description: 'Dual 32-core CPU node (64 cores total) with only 16-core Windows Server base license',
    boqContent: `Product #,Description,Qty
P73282-B21,HPE ProLiant DL380 Gen12 SFF CTO Server,1
P73299-B21,Intel Xeon Gold 6548Y 2.8GHz 32-core 280W Processor for HPE,2
P73300-F21,HPE 32GB 2Rx8 DDR5-5600 Smart Memory FIO Kit,8
P48820-B21,HPE ProLiant High Performance Fan Kit,1
P74792-B21,HPE ProLiant DL380 Gen11/Gen12 High Performance Heat Sink Kit,2
P38995-B21,HPE 1600W Flex Slot Titanium Hot Plug Low Halogen Power Supply Kit,2
873763-B21,HPE ProLiant No Drive FIO Kit,1
R7A11AAE,HPE Compute Ops Management Enhanced 3-year Upfront ProLiant SaaS,1
P46199-B21,Microsoft Windows Server 2022 Standard 16 Core FIO Base License,1`,
    expectedViolations: ['WINDOWS_CORE_LICENSES'],
    expectedDomain: 'SOFTWARE_OS_LICENSING'
  }
];

function _validateEvalResultStructure(evalResults) {
  return Boolean(
    evalResults &&
    typeof evalResults === 'object' &&
    Array.isArray(evalResults.errors) &&
    Array.isArray(evalResults.warnings) &&
    Array.isArray(evalResults.missingDependencies)
  );
}

function _collectUniqueDeps(missingDependencies) {
  const byCode = new Map();
  for (const dep of missingDependencies) {
    if (!dep || typeof dep !== 'object') continue;
    const code = String(dep.key || dep.sku || '').trim();
    if (!code || byCode.has(code)) continue;
    byCode.set(code, dep);
  }
  return byCode;
}

function _resolveErrorPattern(code) {
  if (VIOLATION_ERROR_PATTERNS[code]) return VIOLATION_ERROR_PATTERNS[code];
  if (String(code).startsWith('FIO_MEMORY_')) return VIOLATION_ERROR_PATTERNS.FIO_MEMORY_;
  return null;
}

function _matchExpectedViolation(exp, bench, depsMap, warnings) {
  if (bench.matchChannel === 'warning') {
    const pattern = _resolveErrorPattern(exp);
    const needle = String(exp).toLowerCase();
    return warnings.some(w => {
      const text = String(w || '');
      return pattern ? pattern.test(text) : text.toLowerCase().includes(needle);
    });
  }
  for (const [code, dep] of depsMap.entries()) {
    if (code === exp || dep.sku === exp || dep.key === exp) return code;
  }
  return null;
}

function _isErrorExplained(errMsg, matchedExpectations) {
  const text = String(errMsg || '');
  const lower = text.toLowerCase();
  return matchedExpectations.some(exp => {
    const pattern = _resolveErrorPattern(exp);
    if (pattern && pattern.test(text)) return true;
    return lower.includes(String(exp).toLowerCase());
  });
}

function _extractObservedTiers(graphResults) {
  const candidates = Array.isArray(graphResults?.resolutionMatrix?.candidates)
    ? graphResults.resolutionMatrix.candidates
    : (Array.isArray(graphResults?.rankedSolutions) ? graphResults.rankedSolutions : []);
  const validatedTiersCount = candidates.filter(c =>
    c && (c.physicalMathClean === true || c.isClean === true || c.isBuildable === true)
  ).length;
  return { ranksGenerated: candidates.length, validatedTiersCount };
}

function scoreBenchmarkScenario(bench, evalResults, graphResults = null, durationMs = 0) {
  const expected = Array.isArray(bench?.expectedViolations) ? bench.expectedViolations : [];
  const { ranksGenerated, validatedTiersCount } = _extractObservedTiers(graphResults);
  if (!_validateEvalResultStructure(evalResults)) {
    return {
      id: bench.id,
      name: bench.name,
      passed: false,
      invalidResult: true,
      durationMs,
      confidenceScore: null,
      ranksGenerated,
      validatedTiersCount,
      expectedCount: expected.length,
      truePositives: 0,
      falseNegatives: expected.length,
      falsePositives: 0,
      missedViolations: [...expected],
      unexpectedViolations: [],
      unexpectedErrors: ['Invalid evaluator response structure']
    };
  }

  const depsMap = _collectUniqueDeps(evalResults.missingDependencies);
  const warnings = evalResults.warnings;
  const errors = evalResults.errors;
  const matchedCodes = new Set();
  const matchedExpectations = [];
  const missedViolations = [];

  for (const exp of expected) {
    const matchedCode = _matchExpectedViolation(exp, bench, depsMap, warnings);
    if (matchedCode) {
      matchedExpectations.push(exp);
      if (typeof matchedCode === 'string') matchedCodes.add(matchedCode);
    } else {
      missedViolations.push(exp);
    }
  }

  const unexpectedViolations = [...depsMap.keys()].filter(code => !matchedCodes.has(code));
  const unexpectedErrors = errors.filter(err =>
    expected.length === 0 || !_isErrorExplained(err, matchedExpectations)
  );
  const truePositives = matchedExpectations.length;
  const falseNegatives = missedViolations.length;
  const falsePositives = unexpectedViolations.length + unexpectedErrors.length;
  const rawScore = evalResults?.confidence?.score;
  const confidenceScore = (typeof rawScore === 'number' && Number.isFinite(rawScore)) ? rawScore : null;

  return {
    id: bench.id,
    name: bench.name,
    passed: falseNegatives === 0 && falsePositives === 0,
    invalidResult: false,
    durationMs,
    confidenceScore,
    ranksGenerated,
    validatedTiersCount,
    expectedCount: expected.length,
    truePositives,
    falseNegatives,
    falsePositives,
    missedViolations,
    unexpectedViolations,
    unexpectedErrors
  };
}

function computeBenchmarkMetrics(scenarioResults = []) {
  const safeResults = Array.isArray(scenarioResults) ? scenarioResults : [];
  let passedScenarios = 0;
  let invalidResultsCount = 0;
  let totalTruePositives = 0;
  let totalFalsePositives = 0;
  let totalFalseNegatives = 0;
  let totalViolationsExpected = 0;
  let totalRanksGenerated = 0;
  let totalValidatedTiers = 0;

  for (const r of safeResults) {
    if (!r) continue;
    if (r.passed) passedScenarios++;
    if (r.invalidResult) invalidResultsCount++;
    totalTruePositives += r.truePositives || 0;
    totalFalsePositives += r.falsePositives || 0;
    totalFalseNegatives += r.falseNegatives || 0;
    totalViolationsExpected += r.expectedCount || 0;
    totalRanksGenerated += r.ranksGenerated || 0;
    totalValidatedTiers += r.validatedTiersCount || 0;
  }

  const totalScenarios = safeResults.length;
  const totalViolationsDetected = totalTruePositives + totalFalsePositives;
  const precision = totalViolationsDetected > 0 ? (totalTruePositives / totalViolationsDetected) * 100 : null;
  const recall = totalViolationsExpected > 0 ? (totalTruePositives / totalViolationsExpected) * 100 : null;
  const accuracy = totalScenarios > 0 ? (passedScenarios / totalScenarios) * 100 : null;

  return {
    schemaVersion: BENCHMARK_REPORT_SCHEMA_VERSION,
    passedScenarios,
    failedScenarios: totalScenarios - passedScenarios,
    totalScenarios,
    invalidResultsCount,
    totalViolationsExpected,
    totalViolationsDetected,
    totalTruePositives,
    totalFalsePositives,
    totalFalseNegatives,
    totalRanksGenerated,
    totalValidatedTiers,
    precision,
    recall,
    accuracy
  };
}

function readBenchmarkReport(reportPath = DEFAULT_REPORT_PATH) {
  const raw = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  const schemaVersion = Number.isFinite(raw?.schemaVersion) ? raw.schemaVersion : 1;
  const results = Array.isArray(raw?.results) ? raw.results : [];
  return {
    ...raw,
    schemaVersion,
    isLegacySchema: schemaVersion < BENCHMARK_REPORT_SCHEMA_VERSION,
    precision: raw?.precision ?? null,
    recall: raw?.recall ?? null,
    accuracy: raw?.accuracy ?? null,
    results: results.map(entry => ({
      ...entry,
      confidenceScore: (typeof entry?.confidenceScore === 'number' && Number.isFinite(entry.confidenceScore))
        ? entry.confidenceScore
        : null
    }))
  };
}

function _formatPercentOrLabel(value, nullLabel = 'NOT_MEASURABLE') {
  return (typeof value === 'number' && Number.isFinite(value)) ? `${value.toFixed(1)}%` : nullLabel;
}

function _logScenarioOutcome(scored, expectEmpty, logFn) {
  if (scored.invalidResult) {
    logFn(`  ❌ INVALID EVALUATOR OUTPUT (${scored.durationMs}ms)`);
    return;
  }
  if (scored.missedViolations.length > 0) {
    logFn(`  ❌ Missed Expected Violation(s): ${JSON.stringify(scored.missedViolations)}`);
  }
  if (scored.unexpectedViolations.length > 0) {
    logFn(`  ❌ Unexpected False-Positive Violation(s): ${JSON.stringify(scored.unexpectedViolations)}`);
  }
  if (scored.unexpectedErrors.length > 0) {
    logFn(`  ❌ Unexpected Error(s): ${JSON.stringify(scored.unexpectedErrors)}`);
  }
  if (expectEmpty && scored.falsePositives === 0) {
    logFn('  ✅ 0 False Positives detected on clean BOQ');
  }
  const confText = scored.confidenceScore !== null ? `${(scored.confidenceScore * 100).toFixed(0)}%` : 'UNASSESSED';
  const tierText = `Tiers ${scored.validatedTiersCount}/${scored.ranksGenerated}`;
  logFn(scored.passed
    ? `  ✅ PASSED (${scored.durationMs}ms) - Confidence: ${confText} - ${tierText}`
    : `  ❌ FAILED (${scored.durationMs}ms) - Confidence: ${confText} - ${tierText}`);
}

async function runBenchmarkSuite(options = {}) {
  const scenarios = Array.isArray(options.scenarios) ? options.scenarios : BENCHMARK_SCENARIOS;
  const evaluateFn = options.evaluateFn || evaluateBOQMultiAspect;
  const graphFn = options.graphFn || evaluateWholeSolutionGraph;
  const recordTelemetryFn = options.recordTelemetryFn || recordEvaluationTelemetry;
  const quiet = options.quiet === true;
  const logFn = quiet ? () => {} : console.log;

  logFn('================================================================');
  logFn('🚀 RUNNING AUTOMATED BOQ ASPECT-MATH & EVALUATION BENCHMARK SUITE');
  logFn('================================================================\n');

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'boq-bench-'));
  const scenarioResults = [];

  try {
    for (const bench of scenarios) {
      const startTime = Date.now();
      logFn(`▶ Running [${bench.id}]: ${bench.name}`);

      const filePath = path.join(tempDir, `${bench.id}.csv`);
      fs.writeFileSync(filePath, bench.boqContent, 'utf-8');

      const evalResults = await evaluateFn(filePath);
      const graphResults = (evalResults && Array.isArray(evalResults.items))
        ? await graphFn(evalResults.items, evalResults.chassisInfo)
        : null;
      const durationMs = Date.now() - startTime;

      if (options.recordTelemetry === true) {
        recordTelemetryFn(evalResults, filePath, durationMs);
      }

      const scored = scoreBenchmarkScenario(bench, evalResults, graphResults, durationMs);
      scenarioResults.push(scored);
      _logScenarioOutcome(scored, (bench.expectedViolations || []).length === 0, logFn);
      logFn('');
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  const metrics = computeBenchmarkMetrics(scenarioResults);
  const report = {
    schemaVersion: BENCHMARK_REPORT_SCHEMA_VERSION,
    timestamp: new Date().toISOString(),
    ...metrics,
    results: scenarioResults
  };

  logFn('================================================================');
  logFn('📊 EVALUATION BENCHMARK METRICS SUMMARY');
  logFn('================================================================');
  logFn(`  Scenarios Passed      : ${report.passedScenarios}/${report.totalScenarios} (${_formatPercentOrLabel(report.accuracy)})`);
  logFn(`  Violation Recall Rate : ${_formatPercentOrLabel(report.recall)}`);
  logFn(`  Violation Precision   : ${_formatPercentOrLabel(report.precision)} (FP=${report.totalFalsePositives}, FN=${report.totalFalseNegatives})`);
  logFn(`  Observed Clean Tiers  : ${report.totalValidatedTiers}/${report.totalRanksGenerated}`);
  logFn('================================================================\n');

  if (options.save === true) {
    const reportPath = options.reportPath || DEFAULT_REPORT_PATH;
    safeWriteJsonAtomic(reportPath, report);
    logFn(`💾 Benchmark report saved atomically to: ${path.relative(process.cwd(), reportPath)}`);
  }

  return report;
}

function _parseBenchmarkCliArgs(argv = process.argv.slice(2)) {
  const options = { save: false, recordTelemetry: false };
  for (const arg of argv) {
    if (arg === '--save') options.save = true;
    else if (arg === '--record-telemetry') options.recordTelemetry = true;
    else if (arg.startsWith('--report-path=')) options.reportPath = arg.slice('--report-path='.length);
  }
  return options;
}

if (require.main === module) {
  runBenchmarkSuite(_parseBenchmarkCliArgs())
    .then(report => {
      if (report.passedScenarios < report.totalScenarios || report.invalidResultsCount > 0) {
        process.exitCode = 1;
      }
    })
    .catch(err => {
      console.error('Benchmark suite error:', err);
      process.exitCode = 1;
    });
}

module.exports = {
  BENCHMARK_REPORT_SCHEMA_VERSION,
  BENCHMARK_SCENARIOS,
  DEFAULT_REPORT_PATH,
  scoreBenchmarkScenario,
  computeBenchmarkMetrics,
  readBenchmarkReport,
  runBenchmarkSuite
};
