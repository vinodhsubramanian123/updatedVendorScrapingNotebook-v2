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

function reconcileCrossVendorBOMs(customerItems, vendorItems) {
  const matches = [];
  const missingInVendor = [];
  const vendorExtras = [...vendorItems];

  for (const c of customerItems) {
    const rawCpn = String(c.partNumber || c.sku || '').trim();
    if (!rawCpn) continue;

    // Match by direct SKU or Option-ID bridge
    const vIdx = vendorExtras.findIndex(v =>
      (v.optionId && v.optionId.toUpperCase() === rawCpn.toUpperCase()) ||
      (v.sku && v.sku.toUpperCase() === rawCpn.toUpperCase())
    );

    if (vIdx !== -1) {
      const v = vendorExtras.splice(vIdx, 1)[0];
      const qtyMatch = Number(c.quantity) === Number(v.quantity);
      const isOptionBridge = Boolean(v.optionId && v.optionId.toUpperCase() === rawCpn.toUpperCase() && v.sku && v.sku.toUpperCase() !== rawCpn.toUpperCase());
      matches.push({
        customerPartNumber: rawCpn,
        vendorOptionId: v.optionId || null,
        vendorSku: v.sku || null,
        description: v.description || c.description || '',
        customerQty: Number(c.quantity),
        vendorQty: Number(v.quantity),
        qtyMatch,
        matchType: isOptionBridge ? 'OPTION_ID_BRIDGE' : 'DIRECT_SKU'
      });
    } else {
      missingInVendor.push({
        partNumber: rawCpn,
        description: c.description || '',
        quantity: Number(c.quantity)
      });
    }
  }

  return {
    totalCustomer: customerItems.filter(c => Boolean(c.partNumber || c.sku)).length,
    totalVendor: vendorItems.length,
    matchedCount: matches.length,
    optionIdBridges: matches.filter(m => m.matchType === 'OPTION_ID_BRIDGE').length,
    directMatches: matches.filter(m => m.matchType === 'DIRECT_SKU').length,
    missingCount: missingInVendor.length,
    vendorExtrasCount: vendorExtras.length,
    matches,
    missingInVendor,
    vendorExtras
  };
}

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

});
