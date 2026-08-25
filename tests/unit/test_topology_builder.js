'use strict';

const assert = require('assert');

async function runTests() {
  const { identifySubProducts, detectProductFamily, getSubsystemForSku } = await import('../../dashboard/src/services/topologyGraphBuilder.js');

  console.log('🧪 Starting Topology Graph Builder Tests...\n');

  // 1. Test Product Family Detection
  console.log('▶ Test 1: Product Family Detection');
  assert.strictEqual(detectProductFamily({ chassis: 'synergy' }), 'Synergy');
  assert.strictEqual(detectProductFamily({ chassis: 'alletra' }), 'Alletra');
  assert.strictEqual(detectProductFamily({ chassis: 'storeever' }), 'StoreEver');
  assert.strictEqual(detectProductFamily({ chassis: 'cray' }), 'Cray');
  assert.strictEqual(detectProductFamily({ chassis: 'proliant' }), 'ProLiant');
  console.log('  ✅ Product families identified correctly.');

  // 2. Test Subsystem Branch Mapping
  console.log('\n▶ Test 2: Subsystem Branch Mapping (6 Subsystems)');
  // COMPUTE matches
  assert.strictEqual(getSubsystemForSku({ category: 'Processor' }), 'COMPUTE');
  assert.strictEqual(getSubsystemForSku({ subCategory: 'processor' }), 'COMPUTE');
  assert.strictEqual(getSubsystemForSku({ description: 'Intel Xeon Gold' }), 'COMPUTE');
  assert.strictEqual(getSubsystemForSku({ description: 'AMD EPYC' }), 'COMPUTE');
  assert.strictEqual(getSubsystemForSku({ description: 'High Performance Heatsink' }), 'COMPUTE');

  // MEMORY matches
  assert.strictEqual(getSubsystemForSku({ category: 'Memory' }), 'MEMORY');
  assert.strictEqual(getSubsystemForSku({ subCategory: 'Memory' }), 'MEMORY');
  assert.strictEqual(getSubsystemForSku({ description: '64GB DDR5 DIMM' }), 'MEMORY');
  assert.strictEqual(getSubsystemForSku({ description: 'HPE Smart Memory' }), 'MEMORY');

  // STORAGE matches
  assert.strictEqual(getSubsystemForSku({ category: 'Drive' }), 'STORAGE');
  assert.strictEqual(getSubsystemForSku({ category: 'Storage Controllers' }), 'STORAGE');
  assert.strictEqual(getSubsystemForSku({ subCategory: 'storage' }), 'STORAGE');
  assert.strictEqual(getSubsystemForSku({ description: '800GB NVMe SSD' }), 'STORAGE');
  assert.strictEqual(getSubsystemForSku({ description: 'Smart Array Controller' }), 'STORAGE');

  // PCIE_NETWORK matches
  assert.strictEqual(getSubsystemForSku({ category: 'Networking' }), 'PCIE_NETWORK');
  assert.strictEqual(getSubsystemForSku({ subCategory: 'Riser' }), 'PCIE_NETWORK');
  assert.strictEqual(getSubsystemForSku({ description: 'NVIDIA GPU Accelerator' }), 'PCIE_NETWORK');
  assert.strictEqual(getSubsystemForSku({ description: 'OCP Ethernet Adapter' }), 'PCIE_NETWORK');
  assert.strictEqual(getSubsystemForSku({ description: 'Fibre Channel Transceiver' }), 'PCIE_NETWORK');

  // POWER_THERMAL matches
  assert.strictEqual(getSubsystemForSku({ category: 'Power' }), 'POWER_THERMAL');
  assert.strictEqual(getSubsystemForSku({ category: 'Thermal' }), 'POWER_THERMAL');
  assert.strictEqual(getSubsystemForSku({ description: '800W Flex Slot Power Supply' }), 'POWER_THERMAL');
  assert.strictEqual(getSubsystemForSku({ description: 'PDU Cable' }), 'POWER_THERMAL');

  // SERVICES matches
  assert.strictEqual(getSubsystemForSku({ category: 'Support Services' }), 'SERVICES');
  assert.strictEqual(getSubsystemForSku({ category: 'Service' }), 'SERVICES');
  assert.strictEqual(getSubsystemForSku({ description: 'Tech Care Essential' }), 'SERVICES');
  assert.strictEqual(getSubsystemForSku({ description: 'Installation Service' }), 'SERVICES');

  // Edge cases and Fallback matches
  assert.strictEqual(getSubsystemForSku({}), 'STORAGE');
  assert.strictEqual(getSubsystemForSku({ category: 'Unknown', description: 'Random item' }), 'STORAGE');
  assert.strictEqual(getSubsystemForSku({ category: null, description: undefined }), 'STORAGE');
  assert.strictEqual(getSubsystemForSku({ description: 'xEoN' }), 'COMPUTE');

  console.log('  ✅ Subsystem branches mapped correctly.');

  // 3. Test Multi-Product Family Decomposition
  console.log('\n▶ Test 3: Multi-Product Family Decomposition');
  const items = [
    { sku: 'SKU1', description: 'HPE ProLiant DL380 Gen12 CTO Server', category: 'Chassis', subCategory: 'Variants' },
    { sku: 'SKU2', description: 'HPE Synergy 480 Gen10 Compute Module', category: 'Chassis' }
  ];

  const result = identifySubProducts(items, 'Multi');
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].sku, 'SKU1');
  assert.strictEqual(result[1].sku, 'SKU2');
  console.log('  ✅ Multi-product decomposition verified.');

  // 4. Test identifySubProducts Edge Cases and Happy Path
  console.log('\n▶ Test 4: identifySubProducts Edge Cases and Happy Path');
  const happyPathItems = [
    { sku: 'NODE1', description: 'HPE ProLiant DL380 CTO Server Node 1', category: 'Chassis' },
    { sku: 'NODE2', description: 'HPE ProLiant Compute Module Node 2', category: 'Chassis' },
    { sku: 'RANDOM', description: 'Some random accessory', category: 'Accessory' }
  ];
  const happyPathResult = identifySubProducts(happyPathItems, 'ProLiant');
  assert.strictEqual(happyPathResult.length, 2, 'Should return 2 sub-products for 2 chassis items');
  assert.strictEqual(happyPathResult[0].sku, 'NODE1');
  assert.strictEqual(happyPathResult[1].sku, 'NODE2');

  const noChassisResult = identifySubProducts([], 'ProLiant');
  assert.strictEqual(noChassisResult.length, 0, 'Should return empty array for 0 items and ProLiant');

  const oneChassisResult = identifySubProducts([
    { sku: 'SKU1', description: 'HPE ProLiant DL380 Gen12 CTO Server', category: 'Chassis' }
  ], 'ProLiant');
  assert.strictEqual(oneChassisResult.length, 0, 'Should return empty array for 1 item and ProLiant');

  const synergyResult = identifySubProducts([
    { sku: 'SKU1', description: 'Random Item', category: 'Accessory' }
  ], 'Synergy');
  assert.strictEqual(synergyResult.length, 2, 'Should return 2 hardcoded sub-products for Synergy');
  assert.strictEqual(synergyResult[0].sku, 'SY480-GEN11');
  assert.strictEqual(synergyResult[1].sku, 'SY100Gb_F32_Module');

  console.log('  ✅ identifySubProducts edge cases verified.');

  console.log('\n🎉 ALL TOPOLOGY GRAPH BUILDER TESTS PASSED (100%)!');
}

runTests().catch(err => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
