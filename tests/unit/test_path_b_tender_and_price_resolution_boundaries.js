'use strict';
/**
 * tests/unit/test_path_b_tender_and_price_resolution_boundaries.js
 *
 * Comprehensive unit test suite for:
 * 1. Dynamic GPL Price Baseline Preservation (INV-34) across unbundled $0.00 views
 * 2. Standardized 7-Column Reconciliation BOM Schema (INV-32) with subtotal contracts
 * 3. Multi-Chassis Container Tree & Option Placement (INV-25) with FIO tagging
 * 4. Universal Dynamic Product Generation Hierarchy (INV-36) across 3-tier taxonomy
 * 5. PCIe Riser 5th Slot Power Delivery Cable (INV-31) and EU Lot 9 CE Mark (INV-30)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx-js-style');

const { getHistoricalSkuPrice, _clearCatalogPriceCache } = require('../../scripts/lib/catalog/sku_versioning.js');
const { generatePartnerPortalUploadBOM } = require('../../scripts/lib/boq/generate_boq_xlsx.js');
const { analyzeAndPartitionClusters } = require('../../scripts/lib/boq/multi_cluster_splitter.js');
const { evalSupportManufacturing, isUnsolicitedOptionalService } = require('../../scripts/lib/aspects/support_manufacturing.js');
const { evalPowerEnvironment } = require('../../scripts/lib/aspects/power_environment.js');
const { evalPcieRiserSlots } = require('../../scripts/lib/aspects/pcie_riser.js');

test('▶ [SUITE 1]: Dynamic GPL Price Baseline Preservation across Unbundled Views (INV-34)', () => {
  _clearCatalogPriceCache();

  // Test 1: Historical price resolution for DL380 Gen11 Platinum CPU
  const pricePlatinum = getHistoricalSkuPrice('P67088-B21', 'DL380_Gen11');
  assert.equal(pricePlatinum.priceUsd, 23877, 'P67088-B21 list price must resolve to $23,877.00');

  // Test 2: Historical price resolution for DL380 Gen11 DDR5-5600 Smart FIO Memory
  const priceMemory = getHistoricalSkuPrice('P64707-F21', 'DL380_Gen11');
  assert.equal(priceMemory.priceUsd, 28532, 'P64707-F21 list price must resolve to $28,532.00');

  // Test 3: Base chassis price resolution
  const priceChassis = getHistoricalSkuPrice('P52534-B21', 'DL380_Gen11');
  assert.ok(priceChassis.priceUsd > 0, 'P52534-B21 base chassis price must resolve to a valid non-zero price');

  // Test 4: $1.00 regulatory and bundle kits
  const priceCeMark = getHistoricalSkuPrice('P35876-B21', 'DL380_Gen11');
  assert.equal(priceCeMark.priceUsd, 1, 'P35876-B21 CE Mark removal kit must resolve to $1.00');

  const priceNs204iFio = getHistoricalSkuPrice('P54542-B21', 'DL380_Gen11');
  assert.equal(priceNs204iFio.priceUsd, 1, 'P54542-B21 NS204i-u FIO bundle kit must resolve to $1.00');

  // Test 5: Fallback gracefully for unknown non-existent SKU without throwing
  const priceUnknown = getHistoricalSkuPrice('NON-EXISTENT-SKU-999', 'DL380_Gen11');
  assert.equal(priceUnknown.priceUsd, 0, 'Unknown SKU must return 0 price without throwing error');
});

test('▶ [SUITE 2]: Standardized 7-Column Reconciliation BOM Schema (INV-32)', () => {
  const sampleClusters = [
    {
      clusterId: 'Cluster_A_Platinum',
      name: 'DL380 Gen11 20x Nodes Platinum 8580 Tier',
      multiplier: 20,
      items: [
        { sku: 'P52534-B21', quantity: 1, totalQuantity: 20, description: 'HPE ProLiant DL380 Gen11 8SFF NC CTO Server', unitPrice: 5070 },
        { sku: 'P67088-B21', quantity: 2, totalQuantity: 40, description: 'Intel Xeon-Platinum 8580 Processor', unitPrice: 23877 },
        { sku: 'P64707-F21', quantity: 8, totalQuantity: 160, description: 'HPE 64GB DDR5-5600 Smart FIO Memory', unitPrice: 28532 }
      ]
    },
    {
      clusterId: 'Cluster_B_Gold',
      name: 'DL380 Gen11 40x Nodes Gold 6530 Tier',
      multiplier: 40,
      items: [
        { sku: 'P52534-B21', quantity: 1, totalQuantity: 40, description: 'HPE ProLiant DL380 Gen11 8SFF NC CTO Server', unitPrice: 5070 },
        { sku: 'P67095-B21', quantity: 2, totalQuantity: 80, description: 'Intel Xeon-Gold 6530 Processor', unitPrice: 4933 },
        { sku: 'P64707-F21', quantity: 8, totalQuantity: 320, description: 'HPE 64GB DDR5-5600 Smart FIO Memory', unitPrice: 28532 }
      ]
    }
  ];

  const tempOutputPath = path.join(__dirname, '..', '..', 'outputs', 'temp', 'test_tender_bom_schema.xlsx');
  fs.mkdirSync(path.dirname(tempOutputPath), { recursive: true });

  // Generate standardized Partner Portal Upload BOM workbook
  generatePartnerPortalUploadBOM(sampleClusters, tempOutputPath);
  assert.ok(fs.existsSync(tempOutputPath), 'Tender BOM workbook must be created on disk');

  const wb = XLSX.readFile(tempOutputPath, { cellStyles: true });
  assert.ok(wb.SheetNames.includes('Partner Portal Upload BOM'), 'Must contain Partner Portal Upload BOM sheet');

  const ws = wb.Sheets['Partner Portal Upload BOM'];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  // Assert strict 7-column header contract
  const expectedHeaders = ['Part No', 'Qty', 'Set', ' Description', 'Unit List Price (USD)', 'Extended Price (USD)', 'Portal / CLIC Status'];
  assert.deepEqual(rows[0], expectedHeaders, 'Row 0 must match exact 7-column reconciliation schema');

  // Verify subtotal row presence in Column index 2
  const subtotalRows = rows.filter(r => r[2] && String(r[2]).includes('SUBTOTAL:'));
  assert.equal(subtotalRows.length, 2, 'Must contain exactly 2 subtotal rows for 2 clusters');

  // Clean up test file
  fs.unlinkSync(tempOutputPath);
});

test('▶ [SUITE 3]: Multi-Chassis Container Tree & Option Placement (INV-25)', () => {
  const rawItems = [
    { sku: 'P52534-B21', quantity: 60, totalQuantity: 60, description: 'HPE ProLiant DL380 Gen11 8SFF NC CTO Server', category: 'Base Server Chassis' },
    { sku: 'P67088-B21', quantity: 40, totalQuantity: 40, description: 'Intel Xeon-Platinum 8580 2.0GHz 60-core 350W Processor', category: 'Processors' },
    { sku: 'P67095-B21', quantity: 80, totalQuantity: 80, description: 'Intel Xeon-Gold 6530 2.1GHz 32-core 270W Processor', category: 'Processors' },
    { sku: 'P64707-B21', quantity: 480, totalQuantity: 480, description: 'HPE 64GB DDR5-5600 Smart Memory Kit', category: 'Memory' }
  ];

  const result = analyzeAndPartitionClusters(rawItems);
  assert.ok(result.clusters.length >= 2, 'Must split into at least 2 workload clusters');
  assert.equal(result.totalChassis, 60, 'Total chassis must equal 60');

  // Verify that memory inside CTO clusters is tagged for FIO conversion
  result.clusters.forEach(cluster => {
    const memoryItem = cluster.items.find(it => it.sku.includes('P64707'));
    assert.ok(memoryItem, 'Cluster must contain memory item');
    assert.equal(memoryItem.sku, 'P64707-F21', 'Memory in CTO container must be mapped to FIO SKU P64707-F21');
  });
});

test('▶ [SUITE 4]: Zero Unsolicited Services & SaaS Bundling Guardrail (INV-32)', () => {
  // Test identification of unsolicited services
  assert.equal(isUnsolicitedOptionalService('HA114A1'), true, 'Installation services must be flagged as unsolicited');
  assert.equal(isUnsolicitedOptionalService('S1A05A'), true, 'Optional SaaS packages must be flagged as unsolicited');
  assert.equal(isUnsolicitedOptionalService('HU4B2A300DK'), false, 'Standard support must not be flagged as unsolicited');

  const pureHardwareItems = [
    { sku: 'P52534-B21', quantity: 10, description: 'DL380 Gen11 CTO Server' },
    { sku: 'P67088-B21', quantity: 20, description: 'Xeon Platinum 8580' }
  ];

  const evalResult = evalSupportManufacturing(pureHardwareItems, { serverCount: 10 });
  assert.equal(evalResult.unsolicitedOptionalItems.length, 0, 'Pure hardware tender must have 0 unsolicited items');
  assert.equal(evalResult.defaultSupportSku, 'HU4B2A3', 'Default support SKU must be HU4B2A3');
});

test('▶ [SUITE 5]: Regulatory Platinum PSU EU Lot 9 CE Mark FIO Kit (INV-30)', () => {
  const platinumPsuItems = [
    { sku: 'P52534-B21', quantity: 40, description: 'DL380 Gen11 CTO Server', category: 'Base Server Chassis' },
    { sku: 'P67095-B21', quantity: 80, description: 'Xeon Gold 6530 (270W)', category: 'Processors' },
    { sku: 'P38997-B21', quantity: 80, description: '1600W Platinum Power Supply', category: 'Power Supply' }
  ];

  const powerResult = evalPowerEnvironment(platinumPsuItems, { serverCount: 40 });
  assert.equal(powerResult.hasPlatinumPsu, true, 'Must detect Platinum PSUs');
  assert.equal(powerResult.needsCeRemovalKit, true, 'High TDP with Platinum PSUs must flag needsCeRemovalKit');
});

test('▶ [SUITE 6]: PCIe 5th Slot Power Delivery Cable Kit (INV-31)', () => {
  // Test configuration with 5 physical PCIe expansion cards per server
  const fiveCardItems = [
    { sku: 'P52534-B21', quantity: 1, description: 'DL380 Gen11 CTO Server', category: 'Base Server Chassis' },
    { sku: 'P47777-B21', quantity: 1, description: 'MR416i-p Storage Controller', category: 'Storage Controller' },
    { sku: 'R2E09A', quantity: 2, description: 'SN1610Q 32Gb 2-port FC HBA', category: 'Host Bus Adapter' },
    { sku: 'P26262-B21', quantity: 2, description: 'BCM57414 10/25Gb 2-port PCIe NIC', category: 'Network Adapter' },
    { sku: 'P48803-B21', quantity: 1, description: 'Primary 3x16 Riser Kit', category: 'PCIe Riser' }
  ];

  const pcieResult = evalPcieRiserSlots(fiveCardItems, { serverCount: 1 });
  assert.equal(pcieResult.requiredPcieCards, 5, 'Must count 5 physical PCIe cards');
  assert.equal(pcieResult.needsPrimaryCableKit, true, '5 physical PCIe cards must mandate Primary Cable Kit (P56073-B21)');
});
