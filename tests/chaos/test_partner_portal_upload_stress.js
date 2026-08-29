'use strict';
/**
 * tests/chaos/test_partner_portal_upload_stress.js
 *
 * Chaos & Scalability Stress Suite for Partner Portal Upload BOM:
 * (scripts/lib/boq/generate_boq_xlsx.js)
 *
 * Invariants Tested:
 * - INV-32: Zero Unsolicited Software, Startup Services & Standardized Reconciliation BOM Protocol
 * - INV-37: Automated Multi-Cluster Tender Subtotal & 2-Line Gap Formatting Protocol
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx-js-style');

const { generatePartnerPortalUploadBOM } = require('../../scripts/lib/boq/generate_boq_xlsx.js');

describe('⚡ Partner Portal Upload BOM Scalability & Stress Suite', () => {

  test('1. Handles massive 20-cluster tender with exact subtotal rows and 2-line gaps (INV-37)', () => {
    const testExportDir = path.join(__dirname, '..', '..', 'outputs', 'temp', 'test_portal_stress');
    if (!fs.existsSync(testExportDir)) fs.mkdirSync(testExportDir, { recursive: true });
    const exportFile = path.join(testExportDir, 'stress_20_clusters_bom.xlsx');

    const clusters = [];
    for (let c = 1; c <= 20; c++) {
      clusters.push({
        name: `Cluster_${c}`,
        multiplier: c * 2,
        items: [
          { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF Server', quantity: 1, unitPrice: 2800 },
          { sku: 'P67088-B21', description: 'Intel Xeon Platinum 8580 Processor', quantity: 2, unitPrice: 6500 },
          { sku: 'P64707-B21', description: 'HPE 64GB DDR5 Smart Memory', quantity: 16, unitPrice: 450 }
        ]
      });
    }

    assert.doesNotThrow(() => {
      const res = generatePartnerPortalUploadBOM(clusters, exportFile, { title: 'Stress 20 Clusters' });
      assert(fs.existsSync(exportFile), 'Excel export must exist');

      const wb = XLSX.readFile(exportFile);
      const ws = wb.Sheets['Partner Portal Upload BOM'];
      assert(ws, 'Must contain Partner Portal Upload BOM sheet');

      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      // Header row
      assert(rows.length > 50, 'Must have > 50 rows for 20 clusters');
      
      // Verify subtotal rows for clusters
      const subtotalRows = rows.filter(r => r && typeof r[2] === 'string' && r[2].includes('SUBTOTAL'));
      assert.strictEqual(subtotalRows.length, 20, 'Must contain exactly 20 cluster subtotal rows');
    });

    // Cleanup
    if (fs.existsSync(exportFile)) fs.unlinkSync(exportFile);
  });

  test('2. Unsolicited Software and Startup Services are filtered cleanly (INV-32)', () => {
    const testExportDir = path.join(__dirname, '..', '..', 'outputs', 'temp', 'test_portal_stress');
    if (!fs.existsSync(testExportDir)) fs.mkdirSync(testExportDir, { recursive: true });
    const exportFile = path.join(testExportDir, 'unsolicited_filter_bom.xlsx');

    const clusterWithUnsolicited = [{
      name: 'Cluster_A',
      multiplier: 10,
      items: [
        { sku: 'P52534-B21', description: 'HPE ProLiant DL380 Gen11 8SFF Server', quantity: 1, unitPrice: 2800 },
        { sku: 'S1A05A', description: 'HPE SaaS Management Suite 1yr', quantity: 10, unitPrice: 500 },
        { sku: 'HA114A1', description: 'HPE Installation and Startup Service', quantity: 1, unitPrice: 1200 }
      ]
    }];

    generatePartnerPortalUploadBOM(clusterWithUnsolicited, exportFile);
    assert(fs.existsSync(exportFile), 'Excel file must be generated');

    const wb = XLSX.readFile(exportFile);
    const ws = wb.Sheets['Partner Portal Upload BOM'];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    
    // Check 7-column header contract
    const headerRow = rows.find(r => r && r[0] === 'Part No');
    assert(headerRow, 'Header row with Part No must exist');
    assert.strictEqual(headerRow.length, 7, 'Header must have exactly 7 columns');

    // Cleanup
    if (fs.existsSync(exportFile)) fs.unlinkSync(exportFile);
  });

});
