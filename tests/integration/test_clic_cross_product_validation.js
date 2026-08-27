'use strict';
/**
 * tests/integration/test_clic_cross_product_validation.js
 *
 * Cross-Product CLIC Validation Test Suite
 *
 * Validates ALL 7 CLIC root causes against EVERY ProLiant generation (Gen11 + Gen12),
 * ensuring validation rules are generic (description-primary, zero-hardcoding)
 * and not locked to a single chassis SKU.
 *
 * Root Causes Tested:
 *   1. Container Tree BTO→FIO (Rules 81354490 & 91001655)
 *   2. Incompatible Y-Cable (Rules 81354627 & 81354632)
 *   3. Fan Kit Cardinality (Rule 81354654)
 *   4. OCP Cable Mutual Exclusion (Rule 81355854)
 *   5. PCIe Riser Cable Kit Enablement (Rules 81016755 & 81354683)
 *   6. Mandatory Management License (Rule 81322276)
 *   7. Smart Storage Battery (Standard Rule)
 */

const { evaluatePhysicalMath } = require('../../scripts/lib/boq/boq_evaluator.js');

const C = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m', bold: '\x1b[1m'
};

const GENERATIONS = [
  { name: 'DL380 Gen11', baseSku: 'P52534-B21', memSku: 'P64707-B21', desc: 'HPE ProLiant DL380 Gen11 CTO Server' },
  { name: 'DL380 Gen12 SFF', baseSku: 'P73282-B21', memSku: 'P73300-B21', desc: 'HPE ProLiant DL380 Gen12 SFF CTO Server' }
];

async function run() {
  console.log(`${C.bold}${C.cyan}================================================================${C.reset}`);
  console.log(`${C.bold}${C.cyan}🧪 CROSS-PRODUCT CLIC VALIDATION SUITE (Gen11 × Gen12)${C.reset}`);
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

  for (const gen of GENERATIONS) {
    console.log(`\n${C.bold}${C.blue}▶ Testing: ${gen.name} (${gen.baseSku})${C.reset}\n`);

    // ─── TEST 1: Container Tree BTO→FIO (Rules 81354490 & 91001655) ───
    console.log(`${C.yellow}  [1/7] Container Tree BTO→FIO Memory (Rules 81354490 & 91001655)${C.reset}`);
    {
      const items = [
        { sku: gen.baseSku, description: gen.desc, quantity: 1 },
        { sku: gen.memSku, description: 'HPE 32GB 2Rx8 DDR5-5600 Smart Memory Kit', quantity: 16 },
        { sku: 'P48820-B21', description: 'High Performance Fan Kit', quantity: 1 },
        { sku: 'P73299-B21', description: 'Intel Xeon Gold 6548Y 2.8GHz 280W Processor', quantity: 2 },
        { sku: 'P48818-B21', description: 'HPE 800W Flex Slot Platinum Power Supply', quantity: 2 },
        { sku: 'R7A11AAE', description: 'HPE Compute Ops Management Enhanced 3yr SaaS', quantity: 1 }
      ];
      const result = evaluatePhysicalMath(items);
      const hasBtoViolation = result.evalSummary?.memory?.hasBtoMemoryInCto === true;
      assert(`${gen.name}: BTO memory (${gen.memSku}) flagged in CTO container`, hasBtoViolation,
        `hasBtoMemoryInCto=${hasBtoViolation}`);
    }

    // ─── TEST 2: Incompatible Y-Cable (Rules 81354627 & 81354632) ───
    console.log(`${C.yellow}  [2/7] Incompatible Y-Cable with OCP Controller (Rules 81354627 & 81354632)${C.reset}`);
    {
      const items = [
        { sku: gen.baseSku, description: gen.desc, quantity: 1 },
        { sku: 'P58335-B21', description: 'Broadcom MR408i-o Gen11 OCP Storage Controller', quantity: 1 },
        { sku: 'P48813-B21', description: 'HPE DL380 Gen11 Standard 8SFF Drive Cage', quantity: 1 },
        { sku: 'P48832-B21', description: 'HPE DL380 Gen11 Tri-Mode Splitter Cable Kit', quantity: 1 },
        { sku: 'P73300-F21', description: 'HPE 32GB DDR5 Smart Memory FIO Kit', quantity: 16 },
        { sku: 'P73299-B21', description: 'Intel Xeon Gold 6548Y 280W Processor', quantity: 2 },
        { sku: 'P48820-B21', description: 'High Performance Fan Kit', quantity: 1 },
        { sku: 'P48818-B21', description: 'HPE 800W Flex Slot Platinum Power Supply', quantity: 2 },
        { sku: 'R7A11AAE', description: 'HPE Compute Ops Management Enhanced 3yr SaaS', quantity: 1 }
      ];
      const result = evaluatePhysicalMath(items);
      const hasIncompatible = result.evalSummary?.storage?.hasIncompatibleYCable === true;
      assert(`${gen.name}: Tri-Mode Y-Cable flagged with OCP controller`, hasIncompatible,
        `hasIncompatibleYCable=${hasIncompatible}`);
    }

    // ─── TEST 3: Fan Kit Cardinality (Rule 81354654) ───
    console.log(`${C.yellow}  [3/7] Fan Kit Cardinality Max 1 Kit/Server (Rule 81354654)${C.reset}`);
    {
      const items = [
        { sku: gen.baseSku, description: gen.desc, quantity: 1 },
        { sku: 'P48820-B21', description: 'High Performance Fan Kit', quantity: 6 },
        { sku: 'P73300-F21', description: 'HPE 32GB DDR5 Smart Memory FIO Kit', quantity: 16 },
        { sku: 'P73299-B21', description: 'Intel Xeon Gold 6548Y 280W Processor', quantity: 2 },
        { sku: 'P48818-B21', description: 'HPE 800W Flex Slot Platinum Power Supply', quantity: 2 },
        { sku: 'R7A11AAE', description: 'HPE Compute Ops Management Enhanced 3yr SaaS', quantity: 1 }
      ];
      const result = evaluatePhysicalMath(items);
      const exceeds = result.evalSummary?.compute?.fanKitExceedsMax === true;
      assert(`${gen.name}: 6 fan kits flagged as exceeding max 1/server`, exceeds,
        `fanKitExceedsMax=${exceeds}`);
    }

    // ─── TEST 4: OCP Cable Mutual Exclusion (Rule 81355854) ───
    console.log(`${C.yellow}  [4/7] OCP Cable Mutual Exclusion (Rule 81355854)${C.reset}`);
    {
      const items = [
        { sku: gen.baseSku, description: gen.desc, quantity: 1 },
        { sku: 'P51911-B21', description: 'HPE DL380 Gen11 CPU1 to OCP2 Enablement Kit', quantity: 1 },
        { sku: 'P48830-B21', description: 'HPE DL380 Gen11 CPU2 to OCP2 Enablement Kit', quantity: 1 },
        { sku: 'P73300-F21', description: 'HPE 32GB DDR5 Smart Memory FIO Kit', quantity: 16 },
        { sku: 'P73299-B21', description: 'Intel Xeon Gold 6548Y 280W Processor', quantity: 2 },
        { sku: 'P48820-B21', description: 'High Performance Fan Kit', quantity: 1 },
        { sku: 'P48818-B21', description: 'HPE 800W Flex Slot Platinum Power Supply', quantity: 2 },
        { sku: 'R7A11AAE', description: 'HPE Compute Ops Management Enhanced 3yr SaaS', quantity: 1 }
      ];
      const result = evaluatePhysicalMath(items);
      const conflicting = result.evalSummary?.networking?.hasConflictingOcpCables === true;
      assert(`${gen.name}: CPU1/OCP2 + CPU2/OCP2 flagged as mutually exclusive`, conflicting,
        `hasConflictingOcpCables=${conflicting}`);
    }

    // ─── TEST 5: PCIe Riser Cable Kit Enablement (Rules 81016755 & 81354683) ───
    console.log(`${C.yellow}  [5/7] PCIe Riser Cable Kit Enablement (Rules 81016755 & 81354683)${C.reset}`);
    {
      const items = [
        { sku: gen.baseSku, description: gen.desc, quantity: 1 },
        { sku: 'P48803-B21', description: 'HPE DL380 Gen11 Primary x16/x16/x16 Riser', quantity: 1 },
        { sku: 'P11111-B21', description: 'NVIDIA A100 GPU Accelerator', quantity: 3 },
        { sku: 'P73300-F21', description: 'HPE 32GB DDR5 Smart Memory FIO Kit', quantity: 16 },
        { sku: 'P73299-B21', description: 'Intel Xeon Gold 6548Y 280W Processor', quantity: 2 },
        { sku: 'P48820-B21', description: 'High Performance Fan Kit', quantity: 1 },
        { sku: 'P48818-B21', description: 'HPE 800W Flex Slot Platinum Power Supply', quantity: 2 },
        { sku: 'R7A11AAE', description: 'HPE Compute Ops Management Enhanced 3yr SaaS', quantity: 1 }
      ];
      const result = evaluatePhysicalMath(items);
      const needsPrimary = result.evalSummary?.pcie?.needsPrimaryCableKit === true;
      assert(`${gen.name}: 3 GPU cards on Primary Riser flags need for P56073-B21 Cable Kit`, needsPrimary,
        `needsPrimaryCableKit=${needsPrimary}`);
    }

    // ─── TEST 6: Mandatory Management License (Rule 81322276) ───
    console.log(`${C.yellow}  [6/7] Mandatory Management License (Rule 81322276)${C.reset}`);
    {
      const items = [
        { sku: gen.baseSku, description: gen.desc, quantity: 1 },
        { sku: 'P73300-F21', description: 'HPE 32GB DDR5 Smart Memory FIO Kit', quantity: 16 },
        { sku: 'P73299-B21', description: 'Intel Xeon Gold 6548Y 280W Processor', quantity: 2 },
        { sku: 'P48820-B21', description: 'High Performance Fan Kit', quantity: 1 },
        { sku: 'P48818-B21', description: 'HPE 800W Flex Slot Platinum Power Supply', quantity: 2 }
        // Intentionally NO R7A11AAE management license
      ];
      const result = evaluatePhysicalMath(items);
      const missingMgmt = result.missingDependencies.some(d => d.key === 'MANAGEMENT_LICENSE_COM');
      assert(`${gen.name}: Missing management license detected in dependencies`, missingMgmt,
        `MANAGEMENT_LICENSE_COM in missingDeps=${missingMgmt}`);
    }

    // ─── TEST 7: Smart Storage Battery (Standard Rule) ───
    console.log(`${C.yellow}  [7/7] Smart Storage Battery for RAID Controller${C.reset}`);
    {
      const items = [
        { sku: gen.baseSku, description: gen.desc, quantity: 1 },
        { sku: 'P12345-B21', description: 'Broadcom MegaRAID MR416i-p Gen11 Storage Controller', quantity: 1 },
        { sku: 'P73300-F21', description: 'HPE 32GB DDR5 Smart Memory FIO Kit', quantity: 16 },
        { sku: 'P73299-B21', description: 'Intel Xeon Gold 6548Y 280W Processor', quantity: 2 },
        { sku: 'P48820-B21', description: 'High Performance Fan Kit', quantity: 1 },
        { sku: 'P48818-B21', description: 'HPE 800W Flex Slot Platinum Power Supply', quantity: 2 },
        { sku: 'R7A11AAE', description: 'HPE Compute Ops Management Enhanced 3yr SaaS', quantity: 1 }
        // Intentionally NO P01366-B21 Smart Storage Battery
      ];
      const result = evaluatePhysicalMath(items);
      const missingBattery = result.missingDependencies.some(d => d.key === 'SMART_STORAGE_BATTERY');
      assert(`${gen.name}: Missing Smart Storage Battery detected for MR416i-p`, missingBattery,
        `SMART_STORAGE_BATTERY in missingDeps=${missingBattery}`);
    }
  }

  // ─── SUMMARY ───
  console.log(`\n${C.bold}${C.cyan}================================================================${C.reset}`);
  console.log(`${C.bold}📊 CROSS-PRODUCT CLIC VALIDATION: ${passed}/${total} PASSED${C.reset}`);
  if (passed === total) {
    console.log(`${C.bold}${C.green}🎉 100% CLIC CROSS-PRODUCT VALIDATION PASSED!${C.reset}`);
  } else {
    console.log(`${C.bold}${C.red}❌ ${total - passed} CLIC VALIDATIONS FAILED — REGRESSION DETECTED${C.reset}`);
  }
  console.log(`${C.bold}${C.cyan}================================================================${C.reset}\n`);

  if (passed < total) process.exit(1);
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
