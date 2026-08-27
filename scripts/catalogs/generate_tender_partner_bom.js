'use strict';
/**
 * scripts/catalogs/generate_tender_partner_bom.js
 * 
 * Generates an OCA / HPE Partner Portal ready BOM Excel workbook from
 * the partitioned customer tender GID-RFQS-HPE-2026-006.xlsx.
 * 
 * Formatted with:
 * - Columns: Part Number, Category, Description, Qty (Per Node), Set / Multiplier, Total Order Qty
 * - Set / Multiplier is a merged vertical span across the entire configuration block.
 * - Config 1 (Cluster A - 20x Platinum 8580) and Config 2 (Cluster B - 40x Gold 6530)
 *   clearly separated by 2 blank lines and visual cluster header banners.
 * - Styled with Emerald Green / Slate professional palette via xlsx-js-style.
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx-js-style');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const DOWNLOADS_DIR = path.join(process.env.HOME || '/home/vinodh', 'Downloads');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'outputs', 'ProLiant', 'Gen11', 'DL380_Gen11');

// Style definitions
const STYLES = {
  title: {
    font: { name: 'Calibri', sz: 15, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '0F172A' } }, // Slate 900
    alignment: { horizontal: 'center', vertical: 'center' }
  },
  clusterHeaderA: {
    font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '059669' } }, // Emerald 600
    alignment: { horizontal: 'left', vertical: 'center' }
  },
  clusterHeaderB: {
    font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '2563EB' } }, // Blue 600
    alignment: { horizontal: 'left', vertical: 'center' }
  },
  tableHeader: {
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1E293B' } }, // Slate 800
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'medium', color: { rgb: '059669' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    }
  },
  multiplierSpanA: {
    font: { name: 'Calibri', sz: 13, bold: true, color: { rgb: '065F46' } }, // Dark Emerald
    fill: { fgColor: { rgb: 'ECFDF5' } }, // Emerald 50
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'medium', color: { rgb: '059669' } },
      bottom: { style: 'medium', color: { rgb: '059669' } },
      left: { style: 'medium', color: { rgb: '059669' } },
      right: { style: 'medium', color: { rgb: '059669' } }
    }
  },
  multiplierSpanB: {
    font: { name: 'Calibri', sz: 13, bold: true, color: { rgb: '1E40AF' } }, // Dark Blue
    fill: { fgColor: { rgb: 'EFF6FF' } }, // Blue 50
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'medium', color: { rgb: '2563EB' } },
      bottom: { style: 'medium', color: { rgb: '2563EB' } },
      left: { style: 'medium', color: { rgb: '2563EB' } },
      right: { style: 'medium', color: { rgb: '2563EB' } }
    }
  },
  rowEven: {
    font: { name: 'Calibri', sz: 10, color: { rgb: '0F172A' } },
    fill: { fgColor: { rgb: 'F8FAFC' } },
    alignment: { vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } }
    }
  },
  rowOdd: {
    font: { name: 'Calibri', sz: 10, color: { rgb: '0F172A' } },
    fill: { fgColor: { rgb: 'FFFFFF' } },
    alignment: { vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } }
    }
  },
  centerEven: {
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '0F172A' } },
    fill: { fgColor: { rgb: 'F8FAFC' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } }
    }
  },
  centerOdd: {
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '0F172A' } },
    fill: { fgColor: { rgb: 'FFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } }
    }
  },
  skuEven: {
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '0369A1' } },
    fill: { fgColor: { rgb: 'F8FAFC' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } }
    }
  },
  skuOdd: {
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '0369A1' } },
    fill: { fgColor: { rgb: 'FFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } }
    }
  }
};

const CLUSTER_A_ITEMS = [
  { sku: 'P52534-B21', category: 'Base Chassis', desc: 'HPE ProLiant DL380 Gen11 8SFF NC Configure-to-order Server', qty: 1, mult: 20, total: 20 },
  { sku: 'P67088-B21', category: 'Processor', desc: 'Intel Xeon-Platinum 8580 2.0GHz 60-core 350W Processor for HPE', qty: 2, mult: 20, total: 40 },
  { sku: 'P48818-B21', category: 'Thermal', desc: 'HPE ProLiant DL380/DL560 Gen11 High-performance 2U Heat Sink Kit', qty: 2, mult: 20, total: 40 },
  { sku: 'P48820-B21', category: 'Thermal', desc: 'HPE ProLiant DL380/DL560 Gen11 2U High Performance Fan Kit (All 6 Fans)', qty: 1, mult: 20, total: 20 },
  { sku: 'P64707-F21', category: 'Memory', desc: 'HPE 64GB (1x64GB) Dual Rank x4 DDR5-5600 CAS-46-45-45 EC8 Registered Smart FIO Memory Kit', qty: 8, mult: 20, total: 160 },
  { sku: 'P44712-B21', category: 'Power Supply', desc: 'HPE 1800W-2200W Flex Slot Titanium Hot Plug Power Supply Kit', qty: 2, mult: 20, total: 40 },
  { sku: 'P58335-B21', category: 'Storage Controller', desc: 'HPE MR408i-o Gen11 x8 Lanes 4GB Cache OCP SPDM Storage Controller', qty: 1, mult: 20, total: 20 },
  { sku: 'P02377-B21', category: 'Storage Battery', desc: 'HPE Smart Storage Hybrid Capacitor with 145mm Cable Kit', qty: 1, mult: 20, total: 20 },
  { sku: 'P48918-B21', category: 'Storage Cable', desc: 'HPE ProLiant DL380 Gen11 Storage Controller Enablement Cable Kit (for MR408i-o)', qty: 1, mult: 20, total: 20 },
  { sku: 'P48183-B21', category: 'Boot Device', desc: 'HPE NS204i-u Gen11 NVMe Hot Plug Boot Optimized Storage Device', qty: 1, mult: 20, total: 20 },
  { sku: 'P52152-B21', category: 'Boot Device', desc: 'HPE ProLiant DL380 Gen11 NS204i-u Internal 40 Cable Kit', qty: 1, mult: 20, total: 20 },
  { sku: 'P54542-B21', category: 'Boot Device', desc: 'HPE ProLiant DL380 Gen11 NS204i-u FIO Bundle Kit', qty: 1, mult: 20, total: 20 },
  { sku: 'P48813-B21', category: 'Drive Cage', desc: 'HPE ProLiant DL380 Gen11 2U 8SFF x1 Tri-Mode U.3 Drive Cage Kit', qty: 1, mult: 20, total: 20 },
  { sku: 'P48830-B21', category: 'OCP Enablement', desc: 'HPE ProLiant DL3XX Gen11 CPU2 to OCP2 x8 Enablement Kit', qty: 1, mult: 20, total: 20 },
  { sku: 'P51181-B21', category: 'Network Adapter', desc: 'Broadcom BCM5719 Ethernet 1Gb 4-port BASE-T OCP3 Adapter for HPE', qty: 1, mult: 20, total: 20 },
  { sku: 'P26262-B21', category: 'Network Adapter', desc: 'Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 Adapter for HPE', qty: 2, mult: 20, total: 40 },
  { sku: '845398-B21', category: 'Transceiver', desc: 'HPE 25Gb SFP28 SR 100m Transceiver', qty: 6, mult: 20, total: 120 },
  { sku: 'R2E09A', category: 'FC HBA', desc: 'HPE SN1610Q 32Gb 2-port Fiber Channel Host Bus Adapter', qty: 2, mult: 20, total: 40 },
  { sku: 'P48803-B21', category: 'PCIe Riser', desc: 'HPE ProLiant DL380 Gen11 2U x16/x16/x16 Primary Riser Kit', qty: 1, mult: 20, total: 20 },
  { sku: 'P51083-B21', category: 'PCIe Riser', desc: 'HPE ProLiant DL380 Gen11 2U x16/x16/x16 Secondary Riser Kit', qty: 1, mult: 20, total: 20 },
  { sku: 'P52341-B21', category: 'Racking', desc: 'HPE ProLiant DL3XX Gen11 Easy Install Rail 3 Kit', qty: 1, mult: 20, total: 20 },
  { sku: 'P22020-B21', category: 'Racking', desc: 'HPE DL38X Gen10 Plus 2U Cable Management Arm for Rail Kit', qty: 1, mult: 20, total: 20 },
  { sku: 'R7A11AAE', category: 'Management License', desc: 'HPE Compute Ops Management Enhanced 3-year SaaS', qty: 1, mult: 20, total: 20 }
];

const CLUSTER_B_ITEMS = [
  { sku: 'P52534-B21', category: 'Base Chassis', desc: 'HPE ProLiant DL380 Gen11 8SFF NC Configure-to-order Server', qty: 1, mult: 40, total: 40 },
  { sku: 'P67095-B21', category: 'Processor', desc: 'Intel Xeon-Gold 6530 2.1GHz 32-core 270W Processor for HPE', qty: 2, mult: 40, total: 80 },
  { sku: 'P48818-B21', category: 'Thermal', desc: 'HPE ProLiant DL380/DL560 Gen11 High-performance 2U Heat Sink Kit', qty: 2, mult: 40, total: 80 },
  { sku: 'P48820-B21', category: 'Thermal', desc: 'HPE ProLiant DL380/DL560 Gen11 2U High Performance Fan Kit (All 6 Fans)', qty: 1, mult: 40, total: 40 },
  { sku: 'P64707-F21', category: 'Memory', desc: 'HPE 64GB (1x64GB) Dual Rank x4 DDR5-5600 CAS-46-45-45 EC8 Registered Smart FIO Memory Kit', qty: 8, mult: 40, total: 320 },
  { sku: 'P38997-B21', category: 'Power Supply', desc: 'HPE 1600W Flex Slot Platinum Hot Plug Low Halogen Power Supply Kit', qty: 2, mult: 40, total: 80 },
  { sku: 'P58335-B21', category: 'Storage Controller', desc: 'HPE MR408i-o Gen11 x8 Lanes 4GB Cache OCP SPDM Storage Controller', qty: 1, mult: 40, total: 40 },
  { sku: 'P02377-B21', category: 'Storage Battery', desc: 'HPE Smart Storage Hybrid Capacitor with 145mm Cable Kit', qty: 1, mult: 40, total: 40 },
  { sku: 'P48918-B21', category: 'Storage Cable', desc: 'HPE ProLiant DL380 Gen11 Storage Controller Enablement Cable Kit (for MR408i-o)', qty: 1, mult: 40, total: 40 },
  { sku: 'P48183-B21', category: 'Boot Device', desc: 'HPE NS204i-u Gen11 NVMe Hot Plug Boot Optimized Storage Device', qty: 1, mult: 40, total: 40 },
  { sku: 'P52152-B21', category: 'Boot Device', desc: 'HPE ProLiant DL380 Gen11 NS204i-u Internal 40 Cable Kit', qty: 1, mult: 40, total: 40 },
  { sku: 'P54542-B21', category: 'Boot Device', desc: 'HPE ProLiant DL380 Gen11 NS204i-u FIO Bundle Kit', qty: 1, mult: 40, total: 40 },
  { sku: 'P48813-B21', category: 'Drive Cage', desc: 'HPE ProLiant DL380 Gen11 2U 8SFF x1 Tri-Mode U.3 Drive Cage Kit', qty: 1, mult: 40, total: 40 },
  { sku: 'P48830-B21', category: 'OCP Enablement', desc: 'HPE ProLiant DL3XX Gen11 CPU2 to OCP2 x8 Enablement Kit', qty: 1, mult: 40, total: 40 },
  { sku: 'P51181-B21', category: 'Network Adapter', desc: 'Broadcom BCM5719 Ethernet 1Gb 4-port BASE-T OCP3 Adapter for HPE', qty: 1, mult: 40, total: 40 },
  { sku: 'P26262-B21', category: 'Network Adapter', desc: 'Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 Adapter for HPE', qty: 3, mult: 40, total: 120 },
  { sku: '845398-B21', category: 'Transceiver', desc: 'HPE 25Gb SFP28 SR 100m Transceiver', qty: 8, mult: 40, total: 320 },
  { sku: 'R2E09A', category: 'FC HBA', desc: 'HPE SN1610Q 32Gb 2-port Fiber Channel Host Bus Adapter', qty: 2, mult: 40, total: 80 },
  { sku: 'P48803-B21', category: 'PCIe Riser', desc: 'HPE ProLiant DL380 Gen11 2U x16/x16/x16 Primary Riser Kit', qty: 1, mult: 40, total: 40 },
  { sku: 'P56073-B21', category: 'PCIe Riser Cable', desc: 'HPE ProLiant DL380 Gen11 x16/x16/x16 Primary Cable Kit (Slot 1 Enablement)', qty: 1, mult: 40, total: 40 },
  { sku: 'P51083-B21', category: 'PCIe Riser', desc: 'HPE ProLiant DL380 Gen11 2U x16/x16/x16 Secondary Riser Kit', qty: 1, mult: 40, total: 40 },
  { sku: 'P52341-B21', category: 'Racking', desc: 'HPE ProLiant DL3XX Gen11 Easy Install Rail 3 Kit', qty: 1, mult: 40, total: 40 },
  { sku: 'P22020-B21', category: 'Racking', desc: 'HPE DL38X Gen10 Plus 2U Cable Management Arm for Rail Kit', qty: 1, mult: 40, total: 40 },
  { sku: 'R7A11AAE', category: 'Management License', desc: 'HPE Compute Ops Management Enhanced 3-year SaaS', qty: 1, mult: 40, total: 40 }
];

function generatePartnerPortalWorkbook() {
  const wb = XLSX.utils.book_new();
  const wsData = [];
  const merges = [];

  // Row 1: Title Banner
  wsData.push(['HPE PROLIANT DL380 GEN11 — PARTNER PORTAL / OCA TENDER BOM EXPORT', '', '', '', '', '']);
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } });

  // Row 2: Subtitle Metadata
  wsData.push(['Tender Reference: GID-RFQS-HPE-2026-006 | Total Solution Quantity: 60 Server Nodes (2 Distinct Homogeneous Clusters)', '', '', '', '', '']);
  merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 5 } });

  // Row 3: Blank
  wsData.push([]);

  // ==========================================
  // CONFIGURATION 1: CLUSTER A (PLATINUM 8580)
  // ==========================================
  const startRowA = wsData.length;
  wsData.push(['CONFIGURATION 1: High-Performance Platinum Compute Cluster (20x Nodes | Dual Xeon-Platinum 8580 60C 350W)', '', '', '', '', '']);
  merges.push({ s: { r: startRowA, c: 0 }, e: { r: startRowA, c: 5 } });

  // Table Headers
  wsData.push(['Part Number (SKU)', 'Category', 'Description', 'Qty (Per Node)', 'Set / Multiplier', 'Total Order Qty']);

  // Table Rows for Cluster A (First row gets multiplier label, following rows empty for span merge)
  const dataStartRowA = wsData.length;
  CLUSTER_A_ITEMS.forEach((item, idx) => {
    const multLabel = idx === 0 ? '20x Server Nodes\n(Multiplier: 20)' : '';
    wsData.push([item.sku, item.category, item.desc, item.qty, multLabel, item.total]);
  });
  const dataEndRowA = wsData.length - 1;

  // Add Multiplier Column Vertical Merge for Config 1
  merges.push({ s: { r: dataStartRowA, c: 4 }, e: { r: dataEndRowA, c: 4 } });

  // ==========================================
  // 2 BLANK LINES SEPARATING CONFIGURATIONS
  // ==========================================
  wsData.push([]); // Blank Line 1
  wsData.push([]); // Blank Line 2

  // ==========================================
  // CONFIGURATION 2: CLUSTER B (GOLD 6530)
  // ==========================================
  const startRowB = wsData.length;
  wsData.push(['CONFIGURATION 2: Dense Gold Compute Workload Cluster (40x Nodes | Dual Xeon-Gold 6530 32C 270W)', '', '', '', '', '']);
  merges.push({ s: { r: startRowB, c: 0 }, e: { r: startRowB, c: 5 } });

  // Table Headers
  wsData.push(['Part Number (SKU)', 'Category', 'Description', 'Qty (Per Node)', 'Set / Multiplier', 'Total Order Qty']);

  // Table Rows for Cluster B (First row gets multiplier label, following rows empty for span merge)
  const dataStartRowB = wsData.length;
  CLUSTER_B_ITEMS.forEach((item, idx) => {
    const multLabel = idx === 0 ? '40x Server Nodes\n(Multiplier: 40)' : '';
    wsData.push([item.sku, item.category, item.desc, item.qty, multLabel, item.total]);
  });
  const dataEndRowB = wsData.length - 1;

  // Add Multiplier Column Vertical Merge for Config 2
  merges.push({ s: { r: dataStartRowB, c: 4 }, e: { r: dataEndRowB, c: 4 } });

  // Convert to worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!merges'] = merges;

  // Set Column Widths
  ws['!cols'] = [
    { wch: 20 }, // Part Number
    { wch: 22 }, // Category
    { wch: 72 }, // Description
    { wch: 16 }, // Qty (Per Node)
    { wch: 22 }, // Set / Multiplier (Span)
    { wch: 18 }  // Total Order Qty
  ];

  // Apply cell styling
  const range = XLSX.utils.decode_range(ws['!ref']);

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
      const cell = ws[cellRef];

      // Row 0: Main Title
      if (R === 0) {
        cell.s = STYLES.title;
      }
      // Row 1: Subtitle
      else if (R === 1) {
        cell.s = {
          font: { name: 'Calibri', sz: 10, italic: true, color: { rgb: '94A3B8' } },
          fill: { fgColor: { rgb: '1E293B' } },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      }
      // Cluster A Header Banner
      else if (R === startRowA) {
        cell.s = STYLES.clusterHeaderA;
      }
      // Cluster B Header Banner
      else if (R === startRowB) {
        cell.s = STYLES.clusterHeaderB;
      }
      // Table Header Rows
      else if (R === startRowA + 1 || R === startRowB + 1) {
        cell.s = STYLES.tableHeader;
      }
      // Multiplier Span for Cluster A
      else if (R >= dataStartRowA && R <= dataEndRowA && C === 4) {
        cell.s = STYLES.multiplierSpanA;
      }
      // Multiplier Span for Cluster B
      else if (R >= dataStartRowB && R <= dataEndRowB && C === 4) {
        cell.s = STYLES.multiplierSpanB;
      }
      // Data Rows for Cluster A
      else if (R >= dataStartRowA && R <= dataEndRowA) {
        const isEven = (R - dataStartRowA) % 2 === 0;
        if (C === 0) cell.s = isEven ? STYLES.skuEven : STYLES.skuOdd;
        else if (C === 3 || C === 5) cell.s = isEven ? STYLES.centerEven : STYLES.centerOdd;
        else cell.s = isEven ? STYLES.rowEven : STYLES.rowOdd;
      }
      // Data Rows for Cluster B
      else if (R >= dataStartRowB && R <= dataEndRowB) {
        const isEven = (R - dataStartRowB) % 2 === 0;
        if (C === 0) cell.s = isEven ? STYLES.skuEven : STYLES.skuOdd;
        else if (C === 3 || C === 5) cell.s = isEven ? STYLES.centerEven : STYLES.centerOdd;
        else cell.s = isEven ? STYLES.rowEven : STYLES.rowOdd;
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Partner Portal BOM');

  // Save to Downloads and Outputs
  const outFileName = 'HPE_DL380_Gen11_PartnerPortal_BOM_GID-RFQS-HPE-2026-006.xlsx';
  const downloadsPath = path.join(DOWNLOADS_DIR, outFileName);
  const outputsPath = path.join(OUTPUT_DIR, outFileName);

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  XLSX.writeFile(wb, downloadsPath);
  XLSX.writeFile(wb, outputsPath);

  console.log(`✅ Partner Portal BOM Excel generated successfully with Multiplier Vertical Spans!`);
  console.log(`   📁 Downloads Path : ${downloadsPath}`);
  console.log(`   📁 Workspace Path : ${outputsPath}`);
  return { downloadsPath, outputsPath };
}

if (require.main === module) {
  generatePartnerPortalWorkbook();
}

module.exports = { generatePartnerPortalWorkbook };
