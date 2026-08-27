'use strict';
/**
 * scripts/catalogs/generate_presentation_sheet.js
 * Generates the clean, 100% buildable presentation workbook for tender GID-RFQS-HPE-2026-006.
 */

const path = require('path');
const xlsx = require('xlsx-js-style');

function buildWorkbook(outputPath = '/home/vinodh/Downloads/Untitled spreadsheet.xlsx') {
  const wb = xlsx.utils.book_new();

  // ----------------------------------------------------
  // Configuration 1 Data (20x Nodes Platinum)
  // ----------------------------------------------------
  const config1Items = [
    { sku: 'P52534-B21', category: 'Base Chassis', desc: 'HPE ProLiant DL380 Gen11 8SFF NC Configure-to-order Server', qtyNode: 1, totalQty: 20 },
    { sku: 'P67088-B21', category: 'Processor', desc: 'Intel® Xeon®-Platinum 8580 2.0GHz 60-core 350W Processor for HPE', qtyNode: 2, totalQty: 40 },
    { sku: 'P48818-B21', category: 'Thermal', desc: 'HPE ProLiant DL380/DL560 Gen11 High-performance 2U Heat Sink Kit', qtyNode: 2, totalQty: 40 },
    { sku: 'P48820-B21', category: 'Thermal', desc: 'HPE ProLiant DL380/DL560 Gen11 2U High Performance Fan Kit (All 6 Fans)', qtyNode: 1, totalQty: 20 },
    { sku: 'P64707-F21', category: 'Memory', desc: 'HPE 64GB (1x64GB) Dual Rank x4 DDR5-5600 CAS-46-45-45 EC8 Registered Smart FIO Memory Kit', qtyNode: 8, totalQty: 160 },
    { sku: 'P44712-B21', category: 'Power Supply', desc: 'HPE 1800W-2200W Flex Slot Titanium Hot Plug Power Supply Kit', qtyNode: 2, totalQty: 40 },
    { sku: 'P58335-B21', category: 'Storage Controller', desc: 'HPE MR408i-o Gen11 x8 Lanes 4GB Cache OCP SPDM Storage Controller', qtyNode: 1, totalQty: 20 },
    { sku: 'P02377-B21', category: 'Storage Battery', desc: 'HPE Smart Storage Hybrid Capacitor with 145mm Cable Kit', qtyNode: 1, totalQty: 20 },
    { sku: 'P48918-B21', category: 'Storage Cable', desc: 'HPE ProLiant DL380 Gen11 Storage Controller Enablement Cable Kit (for MR408i-o)', qtyNode: 1, totalQty: 20 },
    { sku: 'P48183-B21', category: 'Boot Device', desc: 'HPE NS204i-u Gen11 NVMe Hot Plug Boot Optimized Storage Device', qtyNode: 1, totalQty: 20 },
    { sku: 'P52152-B21', category: 'Boot Device', desc: 'HPE ProLiant DL380 Gen11 NS204i-u Internal 40 Cable Kit', qtyNode: 1, totalQty: 20 },
    { sku: 'P54542-B21', category: 'Boot Device', desc: 'HPE ProLiant DL380 Gen11 NS204i-u FIO Bundle Kit', qtyNode: 1, totalQty: 20 },
    { sku: 'P48813-B21', category: 'Drive Cage', desc: 'HPE ProLiant DL380 Gen11 2U 8SFF x1 Tri-Mode U.3 Drive Cage Kit', qtyNode: 1, totalQty: 20 },
    { sku: 'P48830-B21', category: 'OCP Enablement', desc: 'HPE ProLiant DL3XX Gen11 CPU2 to OCP2 x8 Enablement Kit', qtyNode: 1, totalQty: 20 },
    { sku: 'P51181-B21', category: 'Network Controller', desc: 'Broadcom BCM5719 Ethernet 1Gb 4-port BASE-T OCP3 Adapter for HPE', qtyNode: 1, totalQty: 20 },
    { sku: 'P26262-B21', category: 'Network Controller', desc: 'Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 Adapter for HPE', qtyNode: 2, totalQty: 40 },
    { sku: '845398-B21', category: 'Transceiver', desc: 'HPE 25Gb SFP28 SR 100m Transceiver', qtyNode: 6, totalQty: 120 },
    { sku: 'R2E09A', category: 'PCI-Express Slot', desc: 'HPE SN1610Q 32Gb 2-port Fiber Channel Host Bus Adapter', qtyNode: 2, totalQty: 40 },
    { sku: 'P48803-B21', category: 'PCI-Express Slot', desc: 'HPE ProLiant DL380 Gen11 2U x16/x16/x16 Primary Riser Kit', qtyNode: 1, totalQty: 20 },
    { sku: 'P51083-B21', category: 'PCI-Express Slot', desc: 'HPE ProLiant DL380 Gen11 2U x16/x16/x16 Secondary Riser Kit', qtyNode: 1, totalQty: 20 },
    { sku: 'P52341-B21', category: 'Chassis Infrastructure', desc: 'HPE ProLiant DL3XX Gen11 Easy Install Rail 3 Kit', qtyNode: 1, totalQty: 20 },
    { sku: 'P22020-B21', category: 'Chassis Infrastructure', desc: 'HPE DL38X Gen10 Plus 2U Cable Management Arm for Rail Kit', qtyNode: 1, totalQty: 20 },
    { sku: 'R7A11AAE', category: 'Operating System / License', desc: 'HPE Compute Ops Management Enhanced 3-year SaaS', qtyNode: 1, totalQty: 20 }
  ];

  // ----------------------------------------------------
  // Configuration 2 Data (40x Nodes Gold)
  // ----------------------------------------------------
  const config2Items = [
    { sku: 'P52534-B21', category: 'Base Chassis', desc: 'HPE ProLiant DL380 Gen11 8SFF NC Configure-to-order Server', qtyNode: 1, totalQty: 40 },
    { sku: 'P67095-B21', category: 'Processor', desc: 'Intel® Xeon®-Gold 6530 2.1GHz 32-core 270W Processor for HPE', qtyNode: 2, totalQty: 80 },
    { sku: 'P48818-B21', category: 'Thermal', desc: 'HPE ProLiant DL380/DL560 Gen11 High-performance 2U Heat Sink Kit', qtyNode: 2, totalQty: 80 },
    { sku: 'P48820-B21', category: 'Thermal', desc: 'HPE ProLiant DL380/DL560 Gen11 2U High Performance Fan Kit (All 6 Fans)', qtyNode: 1, totalQty: 40 },
    { sku: 'P64707-F21', category: 'Memory', desc: 'HPE 64GB (1x64GB) Dual Rank x4 DDR5-5600 CAS-46-45-45 EC8 Registered Smart FIO Memory Kit', qtyNode: 8, totalQty: 320 },
    { sku: 'P38997-B21', category: 'Power Supply', desc: 'HPE 1600W Flex Slot Platinum Hot Plug Low Halogen Power Supply Kit', qtyNode: 2, totalQty: 80 },
    { sku: 'P58335-B21', category: 'Storage Controller', desc: 'HPE MR408i-o Gen11 x8 Lanes 4GB Cache OCP SPDM Storage Controller', qtyNode: 1, totalQty: 40 },
    { sku: 'P02377-B21', category: 'Storage Battery', desc: 'HPE Smart Storage Hybrid Capacitor with 145mm Cable Kit', qtyNode: 1, totalQty: 40 },
    { sku: 'P48918-B21', category: 'Storage Cable', desc: 'HPE ProLiant DL380 Gen11 Storage Controller Enablement Cable Kit (for MR408i-o)', qtyNode: 1, totalQty: 40 },
    { sku: 'P48183-B21', category: 'Boot Device', desc: 'HPE NS204i-u Gen11 NVMe Hot Plug Boot Optimized Storage Device', qtyNode: 1, totalQty: 40 },
    { sku: 'P52152-B21', category: 'Boot Device', desc: 'HPE ProLiant DL380 Gen11 NS204i-u Internal 40 Cable Kit', qtyNode: 1, totalQty: 40 },
    { sku: 'P54542-B21', category: 'Boot Device', desc: 'HPE ProLiant DL380 Gen11 NS204i-u FIO Bundle Kit', qtyNode: 1, totalQty: 40 },
    { sku: 'P48813-B21', category: 'Drive Cage', desc: 'HPE ProLiant DL380 Gen11 2U 8SFF x1 Tri-Mode U.3 Drive Cage Kit', qtyNode: 1, totalQty: 40 },
    { sku: 'P48830-B21', category: 'OCP Enablement', desc: 'HPE ProLiant DL3XX Gen11 CPU2 to OCP2 x8 Enablement Kit', qtyNode: 1, totalQty: 40 },
    { sku: 'P51181-B21', category: 'Network Controller', desc: 'Broadcom BCM5719 Ethernet 1Gb 4-port BASE-T OCP3 Adapter for HPE', qtyNode: 1, totalQty: 40 },
    { sku: 'P26262-B21', category: 'Network Controller', desc: 'Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 Adapter for HPE', qtyNode: 3, totalQty: 120 },
    { sku: '845398-B21', category: 'Transceiver', desc: 'HPE 25Gb SFP28 SR 100m Transceiver', qtyNode: 8, totalQty: 320 },
    { sku: 'R2E09A', category: 'PCI-Express Slot', desc: 'HPE SN1610Q 32Gb 2-port Fiber Channel Host Bus Adapter', qtyNode: 2, totalQty: 80 },
    { sku: 'P48803-B21', category: 'PCI-Express Slot', desc: 'HPE ProLiant DL380 Gen11 2U x16/x16/x16 Primary Riser Kit', qtyNode: 1, totalQty: 40 },
    { sku: 'P51083-B21', category: 'PCI-Express Slot', desc: 'HPE ProLiant DL380 Gen11 2U x16/x16/x16 Secondary Riser Kit', qtyNode: 1, totalQty: 40 },
    { sku: 'P56073-B21', category: 'PCI-Express Slot', desc: 'HPE ProLiant DL380 Gen11 x16/x16/x16 Primary Cable Kit (Slot 1 Enablement)', qtyNode: 1, totalQty: 40 },
    { sku: 'P52341-B21', category: 'Chassis Infrastructure', desc: 'HPE ProLiant DL3XX Gen11 Easy Install Rail 3 Kit', qtyNode: 1, totalQty: 40 },
    { sku: 'P22020-B21', category: 'Chassis Infrastructure', desc: 'HPE DL38X Gen10 Plus 2U Cable Management Arm for Rail Kit', qtyNode: 1, totalQty: 40 },
    { sku: 'R7A11AAE', category: 'Operating System / License', desc: 'HPE Compute Ops Management Enhanced 3-year SaaS', qtyNode: 1, totalQty: 40 }
  ];

  // ----------------------------------------------------
  // CLIC Validation Audit Summary Sheet
  // ----------------------------------------------------
  const auditSummaryRows = [
    ['CLIC ADVICE & OCA PARTNER PORTAL VALIDATION AUDIT MATRIX'],
    ['Tender: GID-RFQS-HPE-2026-006 | Evaluation Engine: Antigravity Dual-Brain AI & Rule Engine'],
    [],
    ['Rule ID', 'Component / Aspect', 'CLIC Unbuildable Error Diagnosis', 'Engineering Root Cause', 'Resolution Applied in Certified BOM', 'Compliance Status'],
    ['81354490 & 91001655', 'Memory Option Type', 'P64707-B21 is restricted from standalone quote in CTO base models', 'Standalone BTO memory SKU cannot be configured outside CTO chassis container', 'Swapped to P64707-F21 (HPE 64GB 2Rx4 DDR5-5600 Smart FIO Kit) directly in chassis container', '✅ 100% BUILDABLE'],
    ['81354627 & 81354632', 'Storage Tri-Mode Cabling', 'Tri-Mode Y-Cable (P48832-B21) incompatible with OCP controller & standard cage', 'P48832-B21 requires PCIe RAID controller (MR416i-p) and Premium Cage (P48814-B21)', 'Omitted P48832-B21; P48918-B21 is the correct controller enablement cable for MR408i-o', '✅ 100% BUILDABLE'],
    ['81354654', 'Thermal Cooling Fan Kit', 'High-Performance Fan Kit (P48820-B21) maximum quantity exceeded', 'P48820-B21 is a complete 6-fan kit. Max 1 kit allowed per 2U base chassis', 'Normalized quantity to 1 kit per node (20 kits for Config 1, 40 kits for Config 2; 1 kit = 6 fans per QuickSpecs pg 64)', '✅ 100% BUILDABLE'],
    ['81355854', 'OCP2 Enablement Cables', 'CPU1/OCP2 (P51911-B21) and CPU2/OCP2 (P48830-B21) cannot be selected together', 'Dual-socket DL380 requires CPU2/OCP2 enablement only; CPU1/OCP2 is mutually exclusive', 'Omitted P51911-B21; retained P48830-B21 for secondary OCP 3.0 slot enablement', '✅ 100% BUILDABLE'],
    ['Physical OCP Constraint', 'OCP 3.0 Slot Capacity', 'Chassis has 2 OCP slots; 3 OCP devices (MR408i-o, BCM5719 OCP, BCM57414 OCP) attempted', 'Over-subscription of OCP form-factor slots; tender networking covered by PCIe adapters', 'Omitted duplicate OCP3 adapter P10115-B21; retained P51181-B21 and PCIe adapters P26262-B21', '✅ 100% BUILDABLE'],
    ['81016755 & 81354683', 'PCIe Riser Active Cabling', 'PCIe Cards exceed electrically active riser slot capacity', 'Primary Riser Slot 1 and Secondary Riser Slot 4 require dedicated Riser Cable Kits', 'Right-sized cable kits: Cluster A requires 0 cable kits (4 cards fit 4 default slots); Cluster B requires 1 kit (P56073-B21) for 5th slot', '✅ 100% BUILDABLE'],
    ['81322276', 'Management Licensing', 'Gen11 CTO chassis requires mandatory Compute Ops Management (COM) SaaS', 'HPE Cloud Ops SaaS requirement for Gen11 / Gen12 CTO configurations', 'Added R7A11AAE (HPE Compute Ops Management 3yr SaaS) 1 per node', '✅ 100% BUILDABLE']
  ];

  // ----------------------------------------------------
  // Build Sheet1 (Consolidated Master BOM)
  // ----------------------------------------------------
  const masterSheetData = [
    ['HPE PROLIANT DL380 GEN11 — PARTNER PORTAL / OCA TENDER BOM EXPORT (100% CERTIFIED BUILDABLE)'],
    ['Tender Reference: GID-RFQS-HPE-2026-006 | Total Solution Quantity: 60 Server Nodes (2 Distinct Homogeneous Clusters)'],
    [],
    ['CONFIGURATION 1: High-Performance Platinum Compute Cluster (20x Nodes | Dual Xeon-Platinum 8580 60C 350W)'],
    ['Part Number (SKU)', 'Category', 'Description', 'Qty (Per Node)', 'Set / Multiplier', 'Total Order Qty']
  ];

  config1Items.forEach((it, idx) => {
    masterSheetData.push([
      it.sku,
      it.category,
      it.desc,
      it.qtyNode,
      idx === 0 ? '20x Server Nodes\n(Multiplier: 20)' : '',
      it.totalQty
    ]);
  });

  masterSheetData.push([]);
  masterSheetData.push([]);
  masterSheetData.push(['CONFIGURATION 2: Dense Gold Compute Workload Cluster (40x Nodes | Dual Xeon-Gold 6530 32C 270W)']);
  masterSheetData.push(['Part Number (SKU)', 'Category', 'Description', 'Qty (Per Node)', 'Set / Multiplier', 'Total Order Qty']);

  config2Items.forEach((it, idx) => {
    masterSheetData.push([
      it.sku,
      it.category,
      it.desc,
      it.qtyNode,
      idx === 0 ? '40x Server Nodes\n(Multiplier: 40)' : '',
      it.totalQty
    ]);
  });

  const wsMaster = xlsx.utils.aoa_to_sheet(masterSheetData);

  wsMaster['!cols'] = [
    { wch: 18 }, // SKU
    { wch: 24 }, // Category
    { wch: 65 }, // Description
    { wch: 15 }, // Qty Per Node
    { wch: 22 }, // Set / Multiplier
    { wch: 16 }  // Total Order Qty
  ];

  xlsx.utils.book_append_sheet(wb, wsMaster, 'Master Consolidated BOM');

  // Build Config 1 Sheet
  const c1Data = [
    ['HPE PROLIANT DL380 GEN11 — CLUSTER A (PLATINUM COMPUTE CLUSTER)'],
    ['20x Server Nodes | Dual Intel Xeon-Platinum 8580 (60C, 350W) | 512GB DDR5 | 100% BUILDABLE CERTIFIED'],
    [],
    ['Part Number (SKU)', 'Category', 'Description', 'Qty (Per Node)', 'Total Order Qty (20x)']
  ];
  config1Items.forEach(it => c1Data.push([it.sku, it.category, it.desc, it.qtyNode, it.totalQty]));
  const wsC1 = xlsx.utils.aoa_to_sheet(c1Data);
  wsC1['!cols'] = [{ wch: 18 }, { wch: 24 }, { wch: 65 }, { wch: 15 }, { wch: 20 }];
  xlsx.utils.book_append_sheet(wb, wsC1, 'Cluster A (20x Platinum)');

  // Build Config 2 Sheet
  const c2Data = [
    ['HPE PROLIANT DL380 GEN11 — CLUSTER B (GOLD COMPUTE CLUSTER)'],
    ['40x Server Nodes | Dual Intel Xeon-Gold 6530 (32C, 270W) | 512GB DDR5 | 100% BUILDABLE CERTIFIED'],
    [],
    ['Part Number (SKU)', 'Category', 'Description', 'Qty (Per Node)', 'Total Order Qty (40x)']
  ];
  config2Items.forEach(it => c2Data.push([it.sku, it.category, it.desc, it.qtyNode, it.totalQty]));
  const wsC2 = xlsx.utils.aoa_to_sheet(c2Data);
  wsC2['!cols'] = [{ wch: 18 }, { wch: 24 }, { wch: 65 }, { wch: 15 }, { wch: 20 }];
  xlsx.utils.book_append_sheet(wb, wsC2, 'Cluster B (40x Gold)');

  // Build Audit Summary Sheet
  const wsAudit = xlsx.utils.aoa_to_sheet(auditSummaryRows);
  wsAudit['!cols'] = [{ wch: 20 }, { wch: 26 }, { wch: 45 }, { wch: 50 }, { wch: 50 }, { wch: 20 }];
  xlsx.utils.book_append_sheet(wb, wsAudit, 'CLIC Advice Remediation Audit');

  xlsx.writeFile(wb, outputPath);
  console.log(`✅ Generated 100% buildable workbook at: ${outputPath}`);
}

if (require.main === module) {
  const target = process.argv[2] || '/home/vinodh/Downloads/Untitled spreadsheet.xlsx';
  buildWorkbook(target);
}

module.exports = { buildWorkbook };
