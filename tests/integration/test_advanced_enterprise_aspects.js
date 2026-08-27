'use strict';
/**
 * tests/integration/test_advanced_enterprise_aspects.js
 *
 * Automated Test Suite for Advanced Enterprise BOQ Intelligence:
 * 1. Storage Expander & Multi-Drive Channel Limits (>8 drives on 8-port controller)
 * 2. GPU Accelerator Auxiliary Power Cable Kits (NVIDIA L40S / A100 / H100)
 * 3. Windows Server Core Licensing Math (16-core base + additional core packs)
 * 4. Power Supply Low-Line 110V Derating & 220V Utility Circuit Advisory
 * 5. Cluster Infrastructure Sizing Matrix (Rack Units, 42U Racks, Peak Facility kW)
 */

const { evaluatePhysicalMath } = require('../../scripts/lib/boq/boq_evaluator.js');

const C = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m', bold: '\x1b[1m'
};

async function run() {
  console.log(`${C.bold}${C.cyan}================================================================${C.reset}`);
  console.log(`${C.bold}${C.cyan}🧪 ADVANCED ENTERPRISE BOQ INTELLIGENCE TEST SUITE${C.reset}`);
  console.log(`${C.bold}${C.cyan}================================================================${C.reset}\n`);

  let total = 0, passed = 0;

  function assert(name, cond, detail = '') {
    total++;
    if (cond) {
      passed++;
      console.log(`  ${C.green}✅ PASS${C.reset}: ${name} ${detail ? `(${detail})` : ''}`);
    } else {
      console.error(`  ${C.red}❌ FAIL${C.reset}: ${name} ${detail ? `(${detail})` : ''}`);
    }
  }

  // ─── TEST 1: Storage Expander Math (>8 drives on 8-port controller) ───
  console.log(`\n${C.bold}${C.blue}▶ [1/5] Storage Expander & Multi-Drive Channel Limits${C.reset}`);
  {
    // Negative case: 16 drives with 8-port controller and no SAS expander
    const itemsNegative = [
      { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 CTO Server', quantity: 1 },
      { sku: 'P58335-B21', description: 'Broadcom MR408i-o Gen11 OCP Storage Controller', quantity: 1 },
      { sku: 'P48813-B21', description: 'HPE DL380 Gen11 Standard 8SFF Drive Cage', quantity: 2 },
      { sku: 'P49048-B21', description: 'HPE 800GB SAS 12G Mixed Use SFF SSD', quantity: 16 },
      { sku: 'P01366-B21', description: '96W Smart Storage Battery', quantity: 1 },
      { sku: 'P48918-B21', description: 'Controller Enablement Cable Kit', quantity: 1 },
      { sku: 'P48820-B21', description: 'High Performance Fan Kit', quantity: 1 },
      { sku: 'P73299-B21', description: 'Intel Xeon Gold 6548Y 280W Processor', quantity: 2 },
      { sku: 'P73300-F21', description: 'HPE 32GB DDR5 Smart Memory FIO Kit', quantity: 16 },
      { sku: 'P48818-B21', description: 'HPE 800W Flex Slot Platinum Power Supply', quantity: 2 },
      { sku: 'R7A11AAE', description: 'HPE Compute Ops Management Enhanced 3yr SaaS', quantity: 1 }
    ];
    const resNegative = evaluatePhysicalMath(itemsNegative);
    assert('16 drives on 8-port controller flags needsSasExpander', resNegative.evalSummary?.storage?.needsSasExpander === true,
      `needsSasExpander=${resNegative.evalSummary?.storage?.needsSasExpander}`);
    assert('SAS Expander Card missing dependency suggested', resNegative.missingDependencies.some(d => d.key === 'SAS_EXPANDER_CARD'));

    // Positive case: 16 drives with SAS Expander Card added
    const itemsPositive = [
      ...itemsNegative,
      { sku: 'P48835-B21', description: 'HPE ProLiant DL380 Gen11 24SFF SAS Expander Card Kit', quantity: 1 }
    ];
    const resPositive = evaluatePhysicalMath(itemsPositive);
    assert('Adding P48835-B21 SAS Expander resolves needsSasExpander to false', resPositive.evalSummary?.storage?.needsSasExpander === false);
  }

  // ─── TEST 2: GPU Accelerator Auxiliary Power Cable Kit ───
  console.log(`\n${C.bold}${C.blue}▶ [2/5] GPU Accelerator Auxiliary Power Cable Kits${C.reset}`);
  {
    // Negative case: 2x NVIDIA L40S GPUs without GPU power cable kit
    const itemsNegative = [
      { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 CTO Server', quantity: 1 },
      { sku: 'P58335-B21', description: 'Broadcom MR408i-o Gen11 OCP Storage Controller', quantity: 1 },
      { sku: 'P48813-B21', description: 'HPE DL380 Gen11 Standard 8SFF Drive Cage', quantity: 1 },
      { sku: 'P49048-B21', description: 'HPE 800GB SAS SSD', quantity: 2 },
      { sku: 'P01366-B21', description: '96W Smart Storage Battery', quantity: 1 },
      { sku: 'P48918-B21', description: 'Controller Enablement Cable Kit', quantity: 1 },
      { sku: 'P48820-B21', description: 'High Performance Fan Kit', quantity: 1 },
      { sku: 'P73299-B21', description: 'Intel Xeon Gold 6548Y 280W Processor', quantity: 2 },
      { sku: 'P73300-F21', description: 'HPE 32GB DDR5 Smart Memory FIO Kit', quantity: 16 },
      { sku: 'P48818-B21', description: 'HPE 1600W Flex Slot Platinum Power Supply', quantity: 2 },
      { sku: 'P48803-B21', description: 'Primary 3x16 Riser', quantity: 1 },
      { sku: 'P56073-B21', description: 'Primary Cable Kit', quantity: 1 },
      { sku: 'P11111-B21', description: 'NVIDIA L40S 48GB PCIe GPU Accelerator', quantity: 2 },
      { sku: 'R7A11AAE', description: 'HPE Compute Ops Management Enhanced 3yr SaaS', quantity: 1 }
    ];
    const resNegative = evaluatePhysicalMath(itemsNegative);
    assert('2x GPU cards without cable kit flags needsGpuPowerCableKit', resNegative.evalSummary?.pcie?.needsGpuPowerCableKit === true,
      `needsGpuPowerCableKit=${resNegative.evalSummary?.pcie?.needsGpuPowerCableKit}`);
    assert('GPU Aux Power Cable Kit missing dependency suggested', resNegative.missingDependencies.some(d => d.key === 'GPU_AUX_POWER_CABLE_KIT'));

    // Positive case: GPU power cable kit added
    const itemsPositive = [
      ...itemsNegative,
      { sku: 'P48816-B21', description: 'HPE ProLiant DL380 Gen11 GPU Power Cable Kit', quantity: 1 }
    ];
    const resPositive = evaluatePhysicalMath(itemsPositive);
    assert('Adding P48816-B21 resolves needsGpuPowerCableKit to false', resPositive.evalSummary?.pcie?.needsGpuPowerCableKit === false);
  }

  // ─── TEST 3: Windows Server Core Licensing Multiplier ───
  console.log(`\n${C.bold}${C.blue}▶ [3/5] Windows Server Core Licensing Multipliers${C.reset}`);
  {
    // 2x 32-core CPUs = 64 physical cores, but only 1x 16-core base Windows Server license
    const itemsUnderLicensed = [
      { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 CTO Server', quantity: 1 },
      { sku: 'P73299-B21', description: 'Intel Xeon Gold 6548Y 32-core 280W Processor', quantity: 2 },
      { sku: 'P73300-F21', description: 'HPE 32GB DDR5 Smart Memory FIO Kit', quantity: 16 },
      { sku: 'P48820-B21', description: 'High Performance Fan Kit', quantity: 1 },
      { sku: 'P48818-B21', description: 'HPE 800W Flex Slot Power Supply', quantity: 2 },
      { sku: 'P46199-B21', description: 'Microsoft Windows Server 2022 Standard 16-Core Base FIO License', quantity: 1 },
      { sku: 'R7A11AAE', description: 'HPE Compute Ops Management Enhanced 3yr SaaS', quantity: 1 }
    ];
    const res = evaluatePhysicalMath(itemsUnderLicensed);
    assert('64 physical cores with 16-core license flags needsAdditionalWindowsCores', res.evalSummary?.support?.needsAdditionalWindowsCores === true);
    assert('Calculates 48 missing core licenses correctly', res.evalSummary?.support?.missingCoreLicenses === 48,
      `missingCoreLicenses=${res.evalSummary?.support?.missingCoreLicenses}`);
  }

  // ─── TEST 4: Power Supply High-Line 220V Derating Advisory ───
  console.log(`\n${C.bold}${C.blue}▶ [4/5] Power Supply Low-Line 110V Derating Advisory${C.reset}`);
  {
    // Heavy configuration: 2x 280W CPUs + 2x 300W GPUs = 1160W + memory/drives/board = ~1500W draw
    const itemsHeavy = [
      { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 CTO Server', quantity: 1 },
      { sku: 'P73299-B21', description: 'Intel Xeon Gold 6548Y 32-core 280W Processor', quantity: 2 },
      { sku: 'P73300-F21', description: 'HPE 32GB DDR5 Smart Memory FIO Kit', quantity: 16 },
      { sku: 'P48820-B21', description: 'High Performance Fan Kit', quantity: 1 },
      { sku: 'P11111-B21', description: 'NVIDIA L40S GPU Accelerator', quantity: 2 },
      { sku: 'P48816-B21', description: 'GPU Power Cable Kit', quantity: 1 },
      { sku: 'P48818-B21', description: 'HPE 1600W Flex Slot Platinum Power Supply', quantity: 2 },
      { sku: 'R7A11AAE', description: 'HPE Compute Ops Management Enhanced 3yr SaaS', quantity: 1 }
    ];
    const res = evaluatePhysicalMath(itemsHeavy);
    assert('High-power node (>800W) with 1600W PSU flags needsHighLine220v advisory', res.evalSummary?.power?.needsHighLine220v === true);
    assert('Estimated node wattage calculated accurately (>1200W)', res.evalSummary?.power?.estimatedNodeWattage > 1200,
      `estimatedNodeWattage=${res.evalSummary?.power?.estimatedNodeWattage}W`);
  }

  // ─── TEST 5: Cluster Infrastructure Sizing Matrix ───
  console.log(`\n${C.bold}${C.blue}▶ [5/5] Multi-Node Cluster Infrastructure Sizing Matrix${C.reset}`);
  {
    // 60-server cluster order (like the GID-RFQS-HPE-2026-006 RFQ)
    const itemsCluster = [
      { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 CTO Server', quantity: 60 },
      { sku: 'P73299-B21', description: 'Intel Xeon Gold 6548Y 280W Processor', quantity: 120 },
      { sku: 'P73300-F21', description: 'HPE 32GB DDR5 Smart Memory FIO Kit', quantity: 960 },
      { sku: 'P48820-B21', description: 'High Performance Fan Kit', quantity: 60 },
      { sku: 'P48818-B21', description: 'HPE 1600W Flex Slot Platinum Power Supply', quantity: 120 },
      { sku: 'R7A11AAE', description: 'HPE Compute Ops Management Enhanced 3yr SaaS', quantity: 60 }
    ];
    const res = evaluatePhysicalMath(itemsCluster);
    assert('Cluster server count correctly resolved as 60', res.evalSummary?.clusterSizing?.serverCount === 60);
    assert('Total Rack Units is 120U (60 * 2U)', res.evalSummary?.clusterSizing?.totalRackUnits === 120);
    assert('Standard 42U Racks required is 3 racks (ceil(120/42))', res.evalSummary?.clusterSizing?.standard42uRacksRequired === 3);
    assert('Total peak facility power is 96.0 kW (60 * 1600W / 1000)', res.evalSummary?.clusterSizing?.totalFacilityPowerKw === 96.0,
      `totalFacilityPowerKw=${res.evalSummary?.clusterSizing?.totalFacilityPowerKw} kW`);
  }

  // ─── SUMMARY ───
  console.log(`\n${C.bold}${C.cyan}================================================================${C.reset}`);
  console.log(`${C.bold}📊 ADVANCED ENTERPRISE BOQ INTELLIGENCE: ${passed}/${total} PASSED${C.reset}`);
  if (passed === total) {
    console.log(`${C.bold}${C.green}🎉 100% ADVANCED ENTERPRISE ASPECTS CERTIFIED!${C.reset}`);
  } else {
    console.log(`${C.bold}${C.red}❌ ${total - passed} ASSERTIONS FAILED — REGRESSION DETECTED${C.reset}`);
  }
  console.log(`${C.bold}${C.cyan}================================================================${C.reset}\n`);

  if (passed < total) process.exit(1);
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
