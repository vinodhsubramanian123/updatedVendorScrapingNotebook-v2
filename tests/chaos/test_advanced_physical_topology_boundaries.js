'use strict';
/**
 * tests/chaos/test_advanced_physical_topology_boundaries.js
 *
 * Stress-tests advanced physical topology boundaries across:
 * 1. Asymmetric dual-socket TDP compute & thermal envelopes.
 * 2. 12-channel (Gen12) vs 8-channel (Gen11) memory interleaving & non-standard DIMM unbalancing.
 * 3. Tri-Mode SAS4/SATA3/NVMe backplane routing, controllers, expanders, and smart storage batteries.
 * 4. PCIe 5.0 6-slot expansion riser power cabling (P56073-B21).
 * 5. OS & Hypervisor physical core licensing multiplier math (Windows Server & VMware Cloud Foundation).
 */

const { evalComputeThermal } = require('../../scripts/lib/aspects/compute_thermal.js');
const { evalMemoryChannel } = require('../../scripts/lib/aspects/memory_channel.js');
const { evalStorageTriMode } = require('../../scripts/lib/aspects/storage_tri_mode.js');
const { evalPcieRiserSlots } = require('../../scripts/lib/aspects/pcie_riser.js');
const { evalSupportManufacturing } = require('../../scripts/lib/aspects/support_manufacturing.js');

let totalPasses = 0;
let totalFails = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    totalPasses++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    totalFails++;
  }
}

async function runTests() {
  console.log(`================================================================`);
  console.log(`🧪 ADVANCED PHYSICAL TOPOLOGY BOUNDARIES TEST SUITE`);
  console.log(`================================================================\n`);

  // -------------------------------------------------------------
  // Test Group 1: Asymmetric Dual-Socket Thermal Envelope
  // -------------------------------------------------------------
  console.log(`🔹 Test Group 1: Asymmetric Dual-Socket Thermal Envelope`);
  const asymmetricCpuItems = [
    { sku: 'P73282-B21', quantity: 1, description: 'HPE ProLiant DL380 Gen12 8SFF CTO Server' },
    { sku: 'P74573-B21', quantity: 1, description: 'Intel Xeon Platinum 8592+ 64C 350W Processor' },
    { sku: 'P73300-B21', quantity: 1, description: 'Intel Xeon Gold 6530 32C 205W Processor' }
  ];

  const thermalResult = evalComputeThermal(asymmetricCpuItems, null, { HIGH_PERF_FAN_KIT: { sku: 'P48820-B21' } });
  assert(thermalResult.cpuCount === 2, 'Detected 2 CPUs in asymmetric dual-socket configuration');
  assert(thermalResult.maxCpuTdpWatts === 350, `Detected max CPU TDP of 350W accurately (Actual: ${thermalResult.maxCpuTdpWatts}W)`);
  assert(thermalResult.hasHighPerfFans === false, 'Flags missing High-Performance Fan Kit for 350W processor');

  // -------------------------------------------------------------
  // Test Group 2: 12-Channel (Gen12) vs 8-Channel (Gen11) Memory Symmetry
  // -------------------------------------------------------------
  console.log(`\n🔹 Test Group 2: Memory Channel Interleaving & Symmetry`);
  
  // Gen12 12-channel chassis with non-standard 7 DIMMs (unbalanced)
  const gen12MemoryItems = [
    { sku: 'P73282-B21', quantity: 1, description: 'HPE ProLiant DL380 Gen12 Server' },
    { sku: 'P74573-B21', quantity: 2, description: 'Intel Xeon Platinum 8592+ 64C Dual Processor' },
    { sku: 'P64707-B21', quantity: 7, description: 'HPE 64GB 2Rx4 DDR5-5600 Registered Smart Memory' }
  ];

  const gen12MemResult = evalMemoryChannel(gen12MemoryItems, 2, null, false, 12);
  assert(gen12MemResult.isBalancedChannel === false, 'Detected unbalanced memory population on 12-channel Gen12 architecture (7 DIMMs)');
  assert(gen12MemResult.memoryCount === 7, `Total DIMM count calculated correctly (Actual: ${gen12MemResult.memoryCount})`);
  assert(gen12MemResult.totalMemoryGb === 448, `Total RAM capacity calculated correctly: 7 x 64GB = 448GB (Actual: ${gen12MemResult.totalMemoryGb})`);

  // Balanced 12-channel population: 24 DIMMs across 2 sockets
  const balancedGen12Items = [
    { sku: 'P73282-B21', quantity: 1, description: 'HPE ProLiant DL380 Gen12 Server' },
    { sku: 'P74573-B21', quantity: 2, description: 'Intel Xeon Platinum 8592+ 64C Dual Processor' },
    { sku: 'P64707-B21', quantity: 24, description: 'HPE 64GB 2Rx4 DDR5-5600 Registered Smart Memory' }
  ];
  const balancedMemResult = evalMemoryChannel(balancedGen12Items, 2, null, false, 12);
  assert(balancedMemResult.isBalancedChannel === true, 'Certified 100% balanced memory symmetry on 24 DIMMs (12 ch/socket)');

  // -------------------------------------------------------------
  // Test Group 3: Tri-Mode Storage, SAS Expander & Battery Backup
  // -------------------------------------------------------------
  console.log(`\n🔹 Test Group 3: Tri-Mode Storage, SAS Expander & Smart Storage Battery`);
  const heavyStorageItems = [
    { sku: 'P73282-B21', quantity: 1, description: 'HPE ProLiant DL380 Gen12 8SFF Server' },
    { sku: 'P48820-B21', quantity: 1, description: 'HPE DL380 Gen12 Fan Kit' },
    { sku: 'P50478-B21', quantity: 16, description: 'HPE 1.92TB NVMe Read Intensive SSD' },
    { sku: 'P06366-B21', quantity: 1, description: 'HPE MR408i-o Gen11 SPDM 8-Port Storage Controller' }
  ];

  const storageResult = evalStorageTriMode(heavyStorageItems, null, {});
  assert(storageResult.driveCount === 16, `Detected 16 physical drives (Actual: ${storageResult.driveCount})`);
  assert(storageResult.needsSasExpander === true, 'Mandates SAS Expander / Tri-Mode Switch for 16 drives on single 8-port controller');
  assert(storageResult.needsSmartStorageBattery === true, 'Flags requirement for Smart Storage Battery (P02377-B21) with hardware RAID controller');

  // -------------------------------------------------------------
  // Test Group 4: PCIe 5.0 6-Slot Riser Cabling
  // -------------------------------------------------------------
  console.log(`\n🔹 Test Group 4: PCIe Riser 5th Slot Power Delivery Cable (INV-31)`);
  const heavyPcieItems = [
    { sku: 'P73282-B21', quantity: 1, description: 'HPE ProLiant DL380 Gen12 Server' },
    { sku: 'P48803-B21', quantity: 1, description: 'HPE DL380 Gen12 x16/x16 2-Slot Primary Riser Kit' },
    { sku: 'P48804-B21', quantity: 1, description: 'HPE DL380 Gen12 x16/x16 2-Slot Secondary Riser Kit' },
    { sku: 'P26965-B21', quantity: 2, description: 'HPE SN1610Q 32Gb Dual Port Fibre Channel HBA' },
    { sku: 'P21112-B21', quantity: 2, description: 'HPE 10/25GbE 2-port SFP28 PCIe Adapter' },
    { sku: 'P06367-B21', quantity: 1, description: 'HPE MR416i-p PCIe Storage Controller' }
  ];

  const pcieResult = evalPcieRiserSlots(heavyPcieItems, null);
  assert(pcieResult.requiredPcieCards === 5, `Accurately counted 5 PCIe expansion cards (Actual: ${pcieResult.requiredPcieCards})`);
  assert(pcieResult.needsPrimaryCableKit === true, 'Mandated Primary Cable Kit (P56073-B21) when >=5 PCIe expansion cards populated');

  // -------------------------------------------------------------
  // Test Group 5: OS & Hypervisor Physical Core Multiplier Licensing (INV-28)
  // -------------------------------------------------------------
  console.log(`\n🔹 Test Group 5: OS & Hypervisor Physical Core Licensing Math`);
  const osLicensingItems = [
    { sku: 'P73282-B21', quantity: 1, description: 'HPE ProLiant DL380 Gen12 Server' },
    { sku: 'P74573-B21', quantity: 2, description: 'Intel Xeon Platinum 8592+ 64-Core Dual Processor' },
    { sku: 'P46174-B21', quantity: 1, description: 'MS WS2022 DC 16-Core FIO Base License' }
  ];

  const mfgResult = evalSupportManufacturing(osLicensingItems, null, 128, 1);
  assert(mfgResult.needsAdditionalWindowsCores === true, 'Detected under-licensed 128-core system with only 16-core base Windows Server license');
  assert(mfgResult.missingCoreLicenses === 112, `Calculated exact missing core licenses: 128 - 16 = 112 missing cores (Actual: ${mfgResult.missingCoreLicenses})`);

  console.log(`\n================================================================`);
  console.log(`📊 PHYSICAL TOPOLOGY TEST SUMMARY: ${totalPasses} PASSED | ${totalFails} FAILED`);
  console.log(`================================================================\n`);

  if (totalFails > 0) {
    process.exit(1);
  }
}

runTests();
