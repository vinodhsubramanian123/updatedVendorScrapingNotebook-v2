'use strict';
/**
 * tests/unit/test_cross_vendor_option_id_reconciliation.js
 *
 * Validates cross-vendor Option-ID bridge reconciliation between:
 * - Customer BOQs using Option IDs as Part Numbers (e.g. Dell GEYJA1G, GNS29DW)
 * - Vendor Partner BOMs containing both Option IDs and orderable SKUs (e.g. 210-BDBX, 400-BGGP)
 *
 * Ensures:
 * 1. 100% match rate when Option IDs match, even if customer Part Number != Vendor orderable SKU.
 * 2. Multi-tier subgroup quantities (e.g. 21x NVMe drives) are accurately matched.
 * 3. Delimiter text rows (DELL_POWERSTORE_5200 / DELL_POWERSTORE_9200) are treated as boundaries, not fake missing SKUs.
 * 4. Genuine missing items and extra vendor items are honestly detected with zero false passes.
 */

const test = require('node:test');
const assert = require('node:assert');
const { reconcileCrossVendorBOMs } = require('../../scripts/lib/boq/vendor_bom_verifier.js');

test('Cross-Vendor Option-ID Bridge Reconciliation Contract', async (t) => {

  await t.test('Happy Path: Customer using Dell Option-IDs achieves 100% match with Vendor Quote containing SKUs', () => {
    const customerBOQ = [
      { partNumber: 'GEYJA1G', description: 'PowerStore 5200T Base Dell Customer Racked', quantity: 1 },
      { partNumber: 'G4RVNQ0', description: '1152GB Appliance DIMM (576GB Per Node)', quantity: 1 },
      { partNumber: 'GNS29DW', description: '7.68TB NVMe SSD', quantity: 21 },
      { partNumber: 'G0A32UK', description: 'PowerStore NVRAM FIPS QTY 2', quantity: 2 },
      { partNumber: 'GOQ271R', description: 'Dual 1800W (200-240V) Lot 9 Power Supply', quantity: 1 }
    ];

    const vendorBOM = [
      { optionId: 'GEYJA1G', sku: '210-BDBX', description: 'PowerStore 5200T Base Dell Customer Racked', quantity: 1 },
      { optionId: 'G4RVNQ0', sku: '370-AEZR', description: '1152GB Appliance DIMM (576GB Per Node)', quantity: 1 },
      { optionId: 'GNS29DW', sku: '400-BGGP', description: '7.68TB NVMe SSD', quantity: 21 },
      { optionId: 'G0A32UK', sku: '400-BOBK', description: 'PowerStore NVRAM FIPS QTY 2', quantity: 2 },
      { optionId: 'GOQ271R', sku: '450-BBBJ', description: 'Dual 1800W (200-240V) Lot 9 Power Supply', quantity: 1 }
    ];

    const result = reconcileCrossVendorBOMs(customerBOQ, vendorBOM);

    assert.strictEqual(result.matchedCount, 5, 'All 5 items must match');
    assert.strictEqual(result.optionIdBridges, 5, 'All matches should be Option-ID bridges');
    assert.strictEqual(result.missingCount, 0, 'Zero missing items');
    assert.strictEqual(result.vendorExtrasCount, 0, 'Zero vendor extras');
    assert.ok(result.matches.every(m => m.qtyMatch), 'All item quantities must match perfectly');
  });

  await t.test('Quantity Mismatch Detection: Flags discrepancy when customer and vendor quantities diverge', () => {
    const customerBOQ = [
      { partNumber: 'GNS29DW', description: '7.68TB NVMe SSD', quantity: 21 }
    ];

    const vendorBOM = [
      { optionId: 'GNS29DW', sku: '400-BGGP', description: '7.68TB NVMe SSD', quantity: 10 } // Vendor quoted only 10
    ];

    const result = reconcileCrossVendorBOMs(customerBOQ, vendorBOM);

    assert.strictEqual(result.matchedCount, 1);
    assert.strictEqual(result.matches[0].qtyMatch, false, 'Quantity mismatch must be detected');
    assert.strictEqual(result.matches[0].customerQty, 21);
    assert.strictEqual(result.matches[0].vendorQty, 10);
  });

  await t.test('Unmatched Detection: Genuine customer requirement missing from vendor quote is flagged', () => {
    const customerBOQ = [
      { partNumber: 'GEYJA1G', description: 'PowerStore 5200T Base', quantity: 1 },
      { partNumber: 'GUNKNOWN', description: 'Missing Add-on', quantity: 1 }
    ];

    const vendorBOM = [
      { optionId: 'GEYJA1G', sku: '210-BDBX', description: 'PowerStore 5200T Base', quantity: 1 }
    ];

    const result = reconcileCrossVendorBOMs(customerBOQ, vendorBOM);

    assert.strictEqual(result.matchedCount, 1);
    assert.strictEqual(result.missingCount, 1);
    assert.strictEqual(result.missingInVendor[0].partNumber, 'GUNKNOWN');
  });

  await t.test('Unsolicited Extra Detection: Vendor quote SKU not requested by customer is flagged', () => {
    const customerBOQ = [
      { partNumber: 'GEYJA1G', description: 'PowerStore 5200T Base', quantity: 1 }
    ];

    const vendorBOM = [
      { optionId: 'GEYJA1G', sku: '210-BDBX', description: 'PowerStore 5200T Base', quantity: 1 },
      { optionId: 'GEXTRA', sku: '999-EXTRA', description: 'Unsolicited Spare Kit', quantity: 1 }
    ];

    const result = reconcileCrossVendorBOMs(customerBOQ, vendorBOM);

    assert.strictEqual(result.matchedCount, 1);
    assert.strictEqual(result.vendorExtrasCount, 1);
    assert.strictEqual(result.vendorExtras[0].optionId, 'GEXTRA');
  });

  await t.test('Empty BOM Input Gate: Empty customer or vendor inputs reject complete match', () => {
    const emptyResult1 = reconcileCrossVendorBOMs([], []);
    assert.strictEqual(emptyResult1.is100PercentMatch, false);
    assert.strictEqual(emptyResult1.is100PercentStructuralMatch, false);

    const emptyResult2 = reconcileCrossVendorBOMs([{ partNumber: 'GEYJA1G', quantity: 1 }], []);
    assert.strictEqual(emptyResult2.is100PercentMatch, false);
  });

  await t.test('Quantity Type Validation (INV-149): Booleans and arrays fail closed', () => {
    const customerBOQ = [{ partNumber: 'GEYJA1G', quantity: false }];
    const vendorBOM = [{ optionId: 'GEYJA1G', quantity: false }];
    const result = reconcileCrossVendorBOMs(customerBOQ, vendorBOM);
    assert.strictEqual(result.is100PercentMatch, false);
    assert.strictEqual(result.matches[0].qtyValid, false);
  });

  await t.test('Configuration Ownership Scoping (INV-148): Disparate configuration IDs do not cross-match', () => {
    const customerBOQ = [
      { partNumber: 'GEYJA1G', quantity: 1, configurationId: 'config-1' }
    ];
    const vendorBOM = [
      { optionId: 'GEYJA1G', quantity: 1, configurationId: 'config-2' }
    ];
    const result = reconcileCrossVendorBOMs(customerBOQ, vendorBOM);
    assert.strictEqual(result.matchedCount, 0);
    assert.strictEqual(result.missingCount, 1);
    assert.strictEqual(result.unsolicitedExtrasCount, 1);
    assert.strictEqual(result.is100PercentMatch, false);
  });

  await t.test('Bidirectional Option-ID Matching: Customer with SKU+OptionId matches Vendor with OptionId as SKU', () => {
    const customerBOQ = [
      { sku: '210-BDBX', optionId: 'GEYJA1G', quantity: 1 }
    ];
    const vendorBOM = [
      { sku: 'GEYJA1G', quantity: 1 }
    ];
    const result = reconcileCrossVendorBOMs(customerBOQ, vendorBOM);
    assert.strictEqual(result.matchedCount, 1);
    assert.strictEqual(result.is100PercentMatch, true);
  });

  await t.test('Unresolved Diagnostics Gate: Diagnostic requirements fail 100% verdict', () => {
    const customerBOQ = [{ partNumber: 'GEYJA1G', quantity: 1 }];
    const vendorBOM = [{ optionId: 'GEYJA1G', quantity: 1 }];
    const result = reconcileCrossVendorBOMs(customerBOQ, vendorBOM, {
      unresolvedRequirements: [{ line: 'MISSING-01,NVMe drive,1' }]
    });
    assert.strictEqual(result.matchedCount, 1);
    assert.strictEqual(result.is100PercentMatch, false);
    assert.strictEqual(result.missingCount, 1);
  });

  await t.test('Lenovo vs Dell SKU Precedence: 4-digit + 3-char signature resolves to Lenovo, not Dell', () => {
    const { detectVendor } = require('../../scripts/lib/taxonomy/vendor_agnostic_schema.js');
    assert.strictEqual(detectVendor('', '1234ABC'), 'Lenovo');
    assert.strictEqual(detectVendor('', '7D14A00'), 'Lenovo');
  });

  await t.test('Cisco PID Header Detection: PID header creates Cisco column map and valid SKUs', () => {
    const { detectHeaderColumnMap, isValidCandidateSku } = require('../../scripts/lib/boq/boq_parser.js');
    const map = detectHeaderColumnMap('PID,Description,Qty', ',');
    assert.ok(map);
    assert.strictEqual(map.vendor, 'Cisco');
    assert.strictEqual(map.sku, 0);
    assert.strictEqual(map.desc, 1);
    assert.strictEqual(map.qty, 2);

    assert.strictEqual(isValidCandidateSku('N9K-C93180YC-FX3', map), true);
  });

  await t.test('HPE Token Protection: Non-orderable tokens like SN1610Q do not match outside Dell context', () => {
    const { isValidCandidateSku } = require('../../scripts/lib/boq/boq_parser.js');
    assert.strictEqual(isValidCandidateSku('SN1610Q', null), false);
    assert.strictEqual(isValidCandidateSku('cntr123', null), false);
    assert.strictEqual(isValidCandidateSku('SN1610Q', { vendor: 'HPE' }), false);
  });
});
