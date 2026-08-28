'use strict';
/**
 * tests/unit/test_partner_portal_upload_bom_format.js
 *
 * Tests the standardized 7-column Partner Portal Upload BOM layout required
 * for automated reconciliation with ReactVendorSolution (INV-32).
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx-js-style');

const { generatePartnerPortalUploadBOM } = require('../../scripts/lib/boq/generate_boq_xlsx.js');
const {
  evalSupportManufacturing,
  isUnsolicitedOptionalService,
  UNSOLICITED_OPTIONAL_SERVICE_SKUS
} = require('../../scripts/lib/aspects/support_manufacturing.js');

describe('Partner Portal Upload BOM & INV-32 Reconciliation Suite', () => {

  test('1. INV-32: Unsolicited optional software and startup services are classified accurately', () => {
    assert.equal(isUnsolicitedOptionalService('S1A05A'), true);
    assert.equal(isUnsolicitedOptionalService('HA114A1'), true);
    assert.equal(isUnsolicitedOptionalService('HA114A1 5A6'), true);
    assert.equal(isUnsolicitedOptionalService('HA124A1'), true);
    assert.equal(isUnsolicitedOptionalService('H7J38A1'), true);

    // Hardware and mandatory SKUs should NOT be classified as unsolicited optional
    assert.equal(isUnsolicitedOptionalService('P52534-B21'), false);
    assert.equal(isUnsolicitedOptionalService('R7A11AAE'), false);
    assert.equal(isUnsolicitedOptionalService('P48820-B21'), false);
    assert.equal(isUnsolicitedOptionalService('HU4B2A3'), false);
  });

  test('2. evalSupportManufacturing flags unsolicited items while maintaining basic support baseline', () => {
    const rawItems = [
      { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF Server', quantity: 1 },
      { sku: 'P67088-B21', description: 'Intel Xeon-Platinum 8580 60-core Processor', quantity: 2 },
      { sku: 'S1A05A', description: 'HPE Compute Ops Management Standard 3-year SaaS E-LTU', quantity: 1 },
      { sku: 'HA114A1 5A6', description: 'HPE Proliant DL/ML ONS Startup SVC', quantity: 1 }
    ];

    const result = evalSupportManufacturing(rawItems, null, 120);

    assert.equal(result.unsolicitedOptionalItems.length, 2);
    assert.equal(result.unsolicitedOptionalItems[0].sku, 'S1A05A');
    assert.equal(result.unsolicitedOptionalItems[1].sku, 'HA114A1 5A6');
    assert.equal(result.defaultSupportSku, 'HU4B2A3');
    assert.equal(result.defaultManagementSku, 'R7A11AAE');
  });

  test('3. generatePartnerPortalUploadBOM produces exact 7-column schema matching ReactVendorSolution contract', () => {
    const tempExportPath = path.join(__dirname, '..', '..', 'outputs', 'temp', 'test_portal_upload_bom.xlsx');

    const sampleClusters = [
      {
        name: 'Cluster_A',
        multiplier: 20,
        items: [
          { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF Server', quantity: 1, unitPriceUsd: 5070 },
          { sku: 'P67088-B21', description: 'Intel Xeon-Platinum 8580 60-core Processor', quantity: 2, unitPriceUsd: 12500 }
        ]
      },
      {
        name: 'Cluster_B',
        multiplier: 40,
        items: [
          { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF Server', quantity: 1, unitPriceUsd: 5070 },
          { sku: 'P67095-B21', description: 'Intel Xeon-Gold 6530 32-core Processor', quantity: 2, unitPriceUsd: 4933 }
        ]
      }
    ];

    generatePartnerPortalUploadBOM(sampleClusters, tempExportPath);
    assert.equal(fs.existsSync(tempExportPath), true);

    const wb = XLSX.readFile(tempExportPath);
    assert.equal(wb.SheetNames.includes('Partner Portal Upload BOM'), true);

    const sheet = wb.Sheets['Partner Portal Upload BOM'];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Row 1: Header Schema
    const expectedHeaders = ['Part No', 'Qty', 'Set', ' Description', 'Unit List Price (USD)', 'Extended Price (USD)', 'Portal / CLIC Status'];
    assert.deepEqual(rows[0], expectedHeaders);

    // Row 2: First item in Cluster A
    assert.equal(rows[1][0], 'P52534-B21'); // Part No
    assert.equal(rows[1][1], 1);            // Qty per server
    assert.equal(rows[1][2], 20);           // Set multiplier
    assert.equal(rows[1][4], 5070);         // Unit price
    assert.equal(rows[1][5], 101400);       // Extended price = 1 * 20 * 5070
    assert.equal(rows[1][6], '100% Validated in CLIC');

    // Row 3: Second item in Cluster A
    assert.equal(rows[2][0], 'P67088-B21');
    assert.equal(rows[2][1], 2);
    assert.equal(rows[2][2], 20);
    assert.equal(rows[2][4], 12500);
    assert.equal(rows[2][5], 500000);       // 2 * 20 * 12500

    // Row 4: Config 1 Subtotal
    assert.equal(rows[3][2], 'CONFIG #1 SUBTOTAL:');
    assert.equal(rows[3][5], 601400);       // 101400 + 500000

    // Verify 2-line separator gap
    assert.equal(!rows[4] || rows[4].length === 0, true);
    assert.equal(!rows[5] || rows[5].length === 0, true);

    // Config 2 Title & Headers
    assert.equal(rows[6][0], 'CONFIGURATION #2: 40x Cluster_B');
    assert.equal(rows[8][0], 'Part No');
    assert.equal(rows[8][1], 'Qty');
    assert.equal(rows[8][2], 'Total Qty');

    // Clean up temporary test file
    fs.unlinkSync(tempExportPath);
  });

});
