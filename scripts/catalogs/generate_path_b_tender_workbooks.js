'use strict';
/**
 * scripts/catalogs/generate_path_b_tender_workbooks.js
 *
 * Generates the authoritative Path B (PCIe Storage MR416i-p + OCP NIC P10115-B21 + Tri-Mode Cable P48832-B21)
 * workbooks with full styling, reconciliation, audit matrices, and portal upload formatting.
 */

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx-js-style');

const DOWNLOADS_DIR = '/home/vinodh/Downloads';
const MASTER_FILE = path.join(DOWNLOADS_DIR, 'HPE_DL380_Gen11_Certified_Tender_PathB_FormFactor_BOM.xlsx');
const PORTAL_FILE = path.join(DOWNLOADS_DIR, 'HPE_DL380_Gen11_PartnerPortal_PathB_Upload_BOM.xlsx');

// Styling tokens per design-taste-frontend
const C_DARK = '0B192C';
const C_EMERALD = '008559';
const C_SLATE = '1E3E62';
const C_ROW_ALT = 'F4F8F6';
const C_WHITE = 'FFFFFF';
const C_BORDER = 'DDE4E1';
const C_WARN_BG = 'FEF3C7';
const C_WARN_TEXT = '92400E';
const C_PASS_BG = 'D1FAE5';
const C_PASS_TEXT = '065F46';

const borderThin = {
  top: { style: 'thin', color: { rgb: C_BORDER } },
  bottom: { style: 'thin', color: { rgb: C_BORDER } },
  left: { style: 'thin', color: { rgb: C_BORDER } },
  right: { style: 'thin', color: { rgb: C_BORDER } }
};

const fontBase = (bold = false, color = '000000', size = 10) => ({
  name: 'Segoe UI',
  sz: size,
  bold,
  color: { rgb: color }
});

const cellStyle = (fillRgb = C_WHITE, bold = false, align = 'left', textRgb = '000000', size = 10) => ({
  fill: { fgColor: { rgb: fillRgb } },
  font: fontBase(bold, textRgb, size),
  alignment: { horizontal: align, vertical: 'center', wrapText: true },
  border: borderThin
});

const headerStyle = (fillRgb = C_DARK, textRgb = C_WHITE, size = 11) => ({
  fill: { fgColor: { rgb: fillRgb } },
  font: fontBase(true, textRgb, size),
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: borderThin
});

// Full BOM items definition for Path B
const PATH_B_ITEMS = [
  { sku: 'P52534-B21', desc: 'HPE ProLiant DL380 Gen11 8SFF NC Configure-to-order Server', cat: 'Base Server Chassis', qA: 1, qB: 1, tot: 60, price: 5070.00, rfpQty: 60, rfpSku: 'P52534-B21', role: 'CTO Base Chassis', status: '100% Exact Match' },
  { sku: 'P67088-B21', desc: 'Intel Xeon-Platinum 8580 2.0GHz 60-core 350W Processor for HPE', cat: 'Processors (Cluster A)', qA: 2, qB: 0, tot: 40, price: 12500.00, rfpQty: 40, rfpSku: 'P67088-B21', role: 'Compute (60C / 350W)', status: '100% Exact Match' },
  { sku: 'P67095-B21', desc: 'Intel Xeon-Gold 6530 2.1GHz 32-core 270W Processor for HPE', cat: 'Processors (Cluster B)', qA: 0, qB: 2, tot: 80, price: 4933.00, rfpQty: 80, rfpSku: 'P67095-B21', role: 'Compute (32C / 270W)', status: '100% Exact Match' },
  { sku: 'P48818-B21', desc: 'HPE ProLiant DL380/DL560 Gen11 High Performance 2U Heat Sink Kit', cat: 'Thermal Cooling', qA: 2, qB: 2, tot: 120, price: 233.00, rfpQty: 120, rfpSku: 'P48818-B21', role: 'Mandatory Heatsink (>=270W)', status: '100% Exact Match' },
  { sku: 'P48820-B21', desc: 'HPE ProLiant DL380/DL560 Gen11 2U High Performance Fan Kit', cat: 'Thermal Cooling', qA: 1, qB: 1, tot: 60, price: 972.00, rfpQty: 360, rfpSku: 'P48820-B21', role: 'Cooling Envelope (6 Fans/Kit)', status: 'Right-Sized (1 Kit = 6 Fans, Rule 81354654)' },
  { sku: 'P64707-F21', desc: 'HPE 64GB (1x64GB) Dual Rank x4 DDR5-5600 Registered Smart Memory Kit', cat: 'Memory (RAM)', qA: 8, qB: 8, tot: 480, price: 1250.00, rfpQty: 480, rfpSku: 'P64707-B21', role: '512GB/Node (8x 64GB Balanced)', status: '1-to-1 FIO Swap (Rules 81354490 & 91001655)' },
  { sku: 'P48814-B21', desc: 'HPE ProLiant DL380 Gen11 8SFF U.3 Premium Drive Cage Kit', cat: 'Storage Drive Cage', qA: 1, qB: 1, tot: 60, price: 780.00, rfpQty: 60, rfpSku: 'P48813-B21', role: 'Front Drive Storage (8SFF U.3 Premium)', status: 'Premium Cage (Required for P48832-B21 Cable, Rule 81354632)' },
  { sku: 'P47777-B21', desc: 'HPE MR416i-p Gen11 x16 Lanes 8GB Cache PCI SPDM Storage Controller', cat: 'Storage Controller', qA: 1, qB: 1, tot: 60, price: 4599.00, rfpQty: 60, rfpSku: 'P58335-B21', role: 'PCIe RAID Controller (8GB Cache)', status: 'Form-Factor Pivot to -p (Frees OCP Slot 1)' },
  { sku: 'P02377-B21', desc: 'HPE Smart Storage Hybrid Capacitor with 145mm Cable Kit', cat: 'Storage Cache Protection', qA: 1, qB: 1, tot: 60, price: 397.00, rfpQty: 60, rfpSku: 'P02377-B21', role: 'Flash Write-Back Protection', status: '100% Exact Match' },
  { sku: 'P48832-B21', desc: 'HPE ProLiant DL380 Gen11 Tri-Mode Splitter Cable Kit', cat: 'Storage Controller Cables', qA: 1, qB: 1, tot: 60, price: 730.00, rfpQty: 60, rfpSku: 'P48832-B21', role: 'Tri-Mode Splitter Cable for -p', status: '100% Exact Match (Validated by -p Controller)' },
  { sku: 'P48183-B21', desc: 'HPE NS204i-u Gen11 NVMe Hot Plug Boot Optimized Storage Device', cat: 'Boot Storage', qA: 1, qB: 1, tot: 60, price: 7799.00, rfpQty: 60, rfpSku: 'P48183-B21', role: 'Rear Hot-Plug OS RAID1', status: '100% Exact Match' },
  { sku: 'P52152-B21', desc: 'HPE ProLiant DL380 Gen11 NS204i-u Internal Cable Kit', cat: 'Boot Storage Cables', qA: 1, qB: 1, tot: 60, price: 164.00, rfpQty: 60, rfpSku: 'P52152-B21', role: 'NS204i-u Internal Routing', status: '100% Exact Match' },
  { sku: 'P54542-B21', desc: 'HPE ProLiant DL380 Gen11 NS204i-u FIO Bundle Kit', cat: 'Boot Storage Enablement', qA: 1, qB: 1, tot: 60, price: 1.00, rfpQty: 60, rfpSku: 'P54542-B21', role: 'NS204i-u Factory Integration', status: '100% Exact Match' },
  { sku: 'P51181-B21', desc: 'Broadcom BCM5719 Ethernet 1Gb 4-port BASE-T OCP3 Adapter for HPE', cat: 'Network Adapter (OCP2)', qA: 1, qB: 1, tot: 60, price: 485.00, rfpQty: 60, rfpSku: 'P51181-B21', role: 'Admin / Management (OCP Slot 2)', status: '100% Exact Match' },
  { sku: 'P10115-B21', desc: 'Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 OCP3 Adapter for HPE', cat: 'Network Adapter (OCP1)', qA: 1, qB: 1, tot: 60, price: 750.00, rfpQty: 60, rfpSku: 'P10115-B21', role: 'High-Speed Networking (OCP Slot 1)', status: '100% Exact Match (Installed in Freed OCP Slot 1)' },
  { sku: 'P26262-B21', desc: 'Broadcom BCM57414 Ethernet 10/25Gb 2-port SFP28 Adapter for HPE', cat: 'Network Adapter (PCIe)', qA: 1, qB: 2, tot: 100, price: 785.00, rfpQty: 160, rfpSku: 'P26262-B21', role: 'PCIe Networking (100 PCIe + 60 OCP = 160)', status: 'Fulfills 160 Total 10/25G Adapters Across System' },
  { sku: '845398-B21', desc: 'HPE 25Gb SFP28 SR 100m Transceiver', cat: 'Optical Transceivers', qA: 6, qB: 8, tot: 440, price: 2110.00, rfpQty: 440, rfpSku: '845398-B21', role: '25Gb Optical Uplinks', status: '100% Exact Match (20x6 + 40x8 = 440)' },
  { sku: 'R2E09A', desc: 'HPE SN1610Q 32Gb 2-port Fibre Channel Host Bus Adapter', cat: 'Storage SAN Networking', qA: 2, qB: 2, tot: 120, price: 3450.00, rfpQty: 120, rfpSku: 'R2E09A', role: 'SAN Connectivity (32Gb FC)', status: '100% Exact Match' },
  { sku: 'P48803-B21', desc: 'HPE ProLiant DL380 2U x16/x16/x16 Primary Riser Kit', cat: 'PCIe Riser Infrastructure', qA: 1, qB: 1, tot: 60, price: 262.00, rfpQty: 60, rfpSku: 'P48803-B21', role: 'Primary Slots 1, 2, 3', status: '100% Exact Match' },
  { sku: 'P51083-B21', desc: 'HPE ProLiant DL380 2U x16/x16/x16 Secondary Riser Kit', cat: 'PCIe Riser Infrastructure', qA: 1, qB: 1, tot: 60, price: 343.00, rfpQty: 60, rfpSku: 'P51083-B21', role: 'Secondary Slots 4, 5, 6', status: '100% Exact Match' },
  { sku: 'P56073-B21', desc: 'HPE ProLiant DL380 Gen11 x16/x16/x16 Primary Cable Kit', cat: 'PCIe Riser Enablement', qA: 0, qB: 1, tot: 40, price: 185.00, rfpQty: 0, rfpSku: 'P56073-B21', role: 'Activates Slot 1 for Cluster B (5 Cards)', status: 'Mandatory Injection (Rules 81016755 & 81354683)' },
  { sku: 'P44712-B21', desc: 'HPE 1800W-2200W Flex Slot Titanium Hot Plug Power Supply Kit', cat: 'Power Infrastructure (Cluster A)', qA: 2, qB: 0, tot: 40, price: 1588.00, rfpQty: 40, rfpSku: 'P44712-B21', role: '1+1 Redundant Titanium (Cluster A)', status: '100% Exact Match' },
  { sku: 'P38997-B21', desc: 'HPE 1600W Flex Slot Platinum Hot Plug Low Halogen Power Supply Kit', cat: 'Power Infrastructure (Cluster B)', qA: 0, qB: 2, tot: 80, price: 1150.00, rfpQty: 80, rfpSku: 'P38997-B21', role: '1+1 Redundant Platinum (Cluster B)', status: '100% Exact Match' },
  { sku: 'P48830-B21', desc: 'HPE ProLiant DL3XX Gen11 CPU2 to OCP2 x8 Enablement Kit', cat: 'OCP2 Motherboard Routing', qA: 1, qB: 1, tot: 60, price: 115.00, rfpQty: 60, rfpSku: 'P48830-B21', role: 'CPU2 to OCP Slot 2 Routing', status: '100% Exact Match' },
  { sku: 'P52341-B21', desc: 'HPE ProLiant DL3XX Gen11 Easy Install Rail 3 Kit', cat: 'Rack Deployment', qA: 1, qB: 1, tot: 60, price: 164.00, rfpQty: 60, rfpSku: 'P52341-B21', role: 'Tool-less Rack Mounting', status: '100% Exact Match' },
  { sku: 'P22020-B21', desc: 'HPE DL38X Gen10 Plus 2U Cable Management Arm for Rail Kit', cat: 'Rack Deployment', qA: 1, qB: 1, tot: 60, price: 89.00, rfpQty: 60, rfpSku: 'P22020-B21', role: 'Cable Management Arm', status: '100% Exact Match' },
  { sku: 'R7A11AAE', desc: 'HPE Compute Ops Management Enhanced 3-Year SaaS Base License', cat: 'Cloud Management & Control', qA: 1, qB: 1, tot: 60, price: 420.00, rfpQty: 0, rfpSku: 'R7A11AAE', role: 'Mandatory Factory Order Control', status: 'Mandatory Injection (CLIC Rule 81322276)' }
];

function buildMasterWorkbook() {
  const wb = xlsx.utils.book_new();

  // -------------------------------------------------------------
  // Sheet 1: RFP vs Certified Solution (Reconciliation)
  // -------------------------------------------------------------
  const s1Data = [
    ['HPE ProLiant DL380 Gen11 — Certified Tender Solution vs Customer RFP Reconciliation (Path B Architecture)'],
    ['Customer Tender Reference: GID-RFQS-HPE-2026-006 | Scope: 60 Enterprise Server Nodes (20x Platinum Cluster A + 40x Gold Cluster B)'],
    ['Architecture: Form-Factor Arbitrated Path B (PCIe Storage MR416i-p + Dual OCP Networking + Tri-Mode Splitter Cable)'],
    [],
    ['#', 'Customer RFP Part #', 'Customer RFP Qty', 'Certified Part #', 'Certified Qty (60 Nodes)', 'Cluster A Qty (20 Nodes)', 'Cluster B Qty (40 Nodes)', 'Component Description', 'Unit List Price (USD)', 'Extended Price (USD)', 'Engineering Resolution & Compliance Status']
  ];

  let s1GrandTotal = 0;
  PATH_B_ITEMS.forEach((it, idx) => {
    const ext = it.tot * it.price;
    s1GrandTotal += ext;
    s1Data.push([
      idx + 1,
      it.rfpSku,
      it.rfpQty,
      it.sku,
      it.tot,
      it.qA * 20,
      it.qB * 40,
      it.desc,
      it.price,
      ext,
      it.status
    ]);
  });

  s1Data.push([]);
  s1Data.push(['', '', '', '', '', '', '', 'TOTAL 60-NODE CERTIFIED SOLUTION LIST VALUE (USD):', '', s1GrandTotal, '100% BUILDABLE IN HPE PARTNER PORTAL / CLIC']);

  const ws1 = xlsx.utils.aoa_to_sheet(s1Data);
  ws1['!cols'] = [
    { wch: 5 }, { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 55 }, { wch: 18 }, { wch: 22 }, { wch: 50 }
  ];

  // Apply styling to Sheet 1
  ws1['A1'].s = headerStyle(C_DARK, C_WHITE, 13);
  ws1['A2'].s = cellStyle(C_SLATE, false, 'left', C_WHITE, 10);
  ws1['A3'].s = cellStyle(C_EMERALD, true, 'left', C_WHITE, 10);

  for (let c = 0; c < 11; c++) {
    const cellAddr = xlsx.utils.encode_cell({ r: 4, c });
    if (ws1[cellAddr]) ws1[cellAddr].s = headerStyle(C_DARK, C_WHITE, 10);
  }

  for (let r = 5; r < 5 + PATH_B_ITEMS.length; r++) {
    const isAlt = r % 2 === 0;
    const bg = isAlt ? C_ROW_ALT : C_WHITE;
    for (let c = 0; c < 11; c++) {
      const addr = xlsx.utils.encode_cell({ r, c });
      if (!ws1[addr]) continue;
      const align = (c === 0 || c === 2 || c === 4 || c === 5 || c === 6) ? 'center' : (c === 8 || c === 9) ? 'right' : 'left';
      const isBold = c === 3 || c === 9;
      ws1[addr].s = cellStyle(bg, isBold, align, '000000', 9);
      if (c === 8 || c === 9) ws1[addr].z = '$#,##0.00';
    }
  }

  xlsx.utils.book_append_sheet(wb, ws1, 'RFP vs Certified Solution');

  // -------------------------------------------------------------
  // Sheet 2: Master Solution Executive BOM
  // -------------------------------------------------------------
  const s2Data = [
    ['HPE DL380 Gen11 — Master Solution Executive Bill of Materials (60 Nodes)'],
    ['Scope: 20x Cluster A (Intel Xeon-Platinum 8580) + 40x Cluster B (Intel Xeon-Gold 6530)'],
    [],
    ['#', 'HPE Option Part #', 'Option Type', 'Category / Subsystem', 'Role & Function', 'Cluster A Qty/Node', 'Cluster B Qty/Node', 'Total Qty (60 Nodes)', 'Unit List Price (USD)', 'Extended Price (USD)', 'Product Description']
  ];

  PATH_B_ITEMS.forEach((it, idx) => {
    const ext = it.tot * it.price;
    s2Data.push([
      idx + 1,
      it.sku,
      it.sku.includes('-F21') ? 'FIO (Factory Integrated)' : 'Standard / CTO',
      it.cat,
      it.role,
      it.qA,
      it.qB,
      it.tot,
      it.price,
      ext,
      it.desc
    ]);
  });

  s2Data.push([]);
  s2Data.push(['', '', '', '', '', '', 'GRAND TOTAL LIST VALUE:', '', '', s1GrandTotal, 'All items 100% buildable and orderable']);

  const ws2 = xlsx.utils.aoa_to_sheet(s2Data);
  ws2['!cols'] = [
    { wch: 5 }, { wch: 18 }, { wch: 22 }, { wch: 26 }, { wch: 32 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 22 }, { wch: 55 }
  ];

  ws2['A1'].s = headerStyle(C_DARK, C_WHITE, 13);
  ws2['A2'].s = cellStyle(C_SLATE, false, 'left', C_WHITE, 10);
  for (let c = 0; c < 11; c++) {
    const addr = xlsx.utils.encode_cell({ r: 3, c });
    if (ws2[addr]) ws2[addr].s = headerStyle(C_DARK, C_WHITE, 10);
  }

  for (let r = 4; r < 4 + PATH_B_ITEMS.length; r++) {
    const bg = (r % 2 === 0) ? C_ROW_ALT : C_WHITE;
    for (let c = 0; c < 11; c++) {
      const addr = xlsx.utils.encode_cell({ r, c });
      if (!ws2[addr]) continue;
      const align = (c === 0 || c === 5 || c === 6 || c === 7) ? 'center' : (c === 8 || c === 9) ? 'right' : 'left';
      ws2[addr].s = cellStyle(bg, c === 1 || c === 9, align, '000000', 9);
      if (c === 8 || c === 9) ws2[addr].z = '$#,##0.00';
    }
  }

  xlsx.utils.book_append_sheet(wb, ws2, 'Master Executive BOM');

  // -------------------------------------------------------------
  // Sheet 3: Cluster A (20x Platinum Nodes)
  // -------------------------------------------------------------
  const clusterA_items = PATH_B_ITEMS.filter(it => it.qA > 0);
  const s3Data = [
    ['Cluster A: 20x HPE ProLiant DL380 Gen11 8SFF (Intel Xeon-Platinum 8580 Compute Tier)'],
    ['Specification per node: Dual 60-Core CPUs (120 Cores), 512GB DDR5-5600, Dual 1800W Titanium PSUs, 8SFF Tri-Mode, 4 PCIe Cards'],
    [],
    ['#', 'HPE Option Part #', 'Category', 'Qty / Node', 'Cluster Qty (20 Nodes)', 'Unit Price (USD)', 'Extended Price (USD)', 'Component Description', 'Placement & Function']
  ];

  let clusterATotal = 0;
  clusterA_items.forEach((it, idx) => {
    const clusterQty = it.qA * 20;
    const ext = clusterQty * it.price;
    clusterATotal += ext;
    s3Data.push([
      idx + 1,
      it.sku,
      it.cat,
      it.qA,
      clusterQty,
      it.price,
      ext,
      it.desc,
      it.role
    ]);
  });
  s3Data.push([]);
  s3Data.push(['', '', '', 'CLUSTER A TOTAL LIST VALUE:', '', '', clusterATotal, '20 Compute Powerhouse Nodes']);

  const ws3 = xlsx.utils.aoa_to_sheet(s3Data);
  ws3['!cols'] = [{ wch: 5 }, { wch: 18 }, { wch: 25 }, { wch: 12 }, { wch: 22 }, { wch: 18 }, { wch: 22 }, { wch: 55 }, { wch: 35 }];
  ws3['A1'].s = headerStyle(C_DARK, C_WHITE, 12);
  ws3['A2'].s = cellStyle(C_SLATE, false, 'left', C_WHITE, 9);
  for (let c = 0; c < 9; c++) {
    const addr = xlsx.utils.encode_cell({ r: 3, c });
    if (ws3[addr]) ws3[addr].s = headerStyle(C_DARK, C_WHITE, 10);
  }
  for (let r = 4; r < 4 + clusterA_items.length; r++) {
    const bg = (r % 2 === 0) ? C_ROW_ALT : C_WHITE;
    for (let c = 0; c < 9; c++) {
      const addr = xlsx.utils.encode_cell({ r, c });
      if (!ws3[addr]) continue;
      const align = (c === 0 || c === 3 || c === 4) ? 'center' : (c === 5 || c === 6) ? 'right' : 'left';
      ws3[addr].s = cellStyle(bg, c === 1 || c === 6, align, '000000', 9);
      if (c === 5 || c === 6) ws3[addr].z = '$#,##0.00';
    }
  }
  xlsx.utils.book_append_sheet(wb, ws3, 'Cluster A (20x Platinum)');

  // -------------------------------------------------------------
  // Sheet 4: Cluster B (40x Gold Nodes)
  // -------------------------------------------------------------
  const clusterB_items = PATH_B_ITEMS.filter(it => it.qB > 0);
  const s4Data = [
    ['Cluster B: 40x HPE ProLiant DL380 Gen11 8SFF (Intel Xeon-Gold 6530 Workload Tier)'],
    ['Specification per node: Dual 32-Core CPUs (64 Cores), 512GB DDR5-5600, Dual 1600W Platinum PSUs, 8SFF Tri-Mode, 5 PCIe Cards'],
    [],
    ['#', 'HPE Option Part #', 'Category', 'Qty / Node', 'Cluster Qty (40 Nodes)', 'Unit Price (USD)', 'Extended Price (USD)', 'Component Description', 'Placement & Function']
  ];

  let clusterBTotal = 0;
  clusterB_items.forEach((it, idx) => {
    const clusterQty = it.qB * 40;
    const ext = clusterQty * it.price;
    clusterBTotal += ext;
    s4Data.push([
      idx + 1,
      it.sku,
      it.cat,
      it.qB,
      clusterQty,
      it.price,
      ext,
      it.desc,
      it.role
    ]);
  });
  s4Data.push([]);
  s4Data.push(['', '', '', 'CLUSTER B TOTAL LIST VALUE:', '', '', clusterBTotal, '40 Workload Cluster Nodes']);

  const ws4 = xlsx.utils.aoa_to_sheet(s4Data);
  ws4['!cols'] = [{ wch: 5 }, { wch: 18 }, { wch: 25 }, { wch: 12 }, { wch: 22 }, { wch: 18 }, { wch: 22 }, { wch: 55 }, { wch: 35 }];
  ws4['A1'].s = headerStyle(C_DARK, C_WHITE, 12);
  ws4['A2'].s = cellStyle(C_SLATE, false, 'left', C_WHITE, 9);
  for (let c = 0; c < 9; c++) {
    const addr = xlsx.utils.encode_cell({ r: 3, c });
    if (ws4[addr]) ws4[addr].s = headerStyle(C_DARK, C_WHITE, 10);
  }
  for (let r = 4; r < 4 + clusterB_items.length; r++) {
    const bg = (r % 2 === 0) ? C_ROW_ALT : C_WHITE;
    for (let c = 0; c < 9; c++) {
      const addr = xlsx.utils.encode_cell({ r, c });
      if (!ws4[addr]) continue;
      const align = (c === 0 || c === 3 || c === 4) ? 'center' : (c === 5 || c === 6) ? 'right' : 'left';
      ws4[addr].s = cellStyle(bg, c === 1 || c === 6, align, '000000', 9);
      if (c === 5 || c === 6) ws4[addr].z = '$#,##0.00';
    }
  }
  xlsx.utils.book_append_sheet(wb, ws4, 'Cluster B (40x Gold)');

  // -------------------------------------------------------------
  // Sheet 5: CLIC Advice Remediation Audit
  // -------------------------------------------------------------
  const s5Data = [
    ['HPE CLIC Configurator Compliance & Rule Remediation Audit Matrix (Path B)'],
    ['Formal validation of all 60 nodes against official HPE CLIC ordering rules and factory constraints.'],
    [],
    ['Rule ID', 'Severity', 'Triggering Component', 'Official HPE CLIC Requirement Text', 'Engineering Resolution in Certified Build', 'Buildability Status']
  ];

  const auditRules = [
    { id: '81354490 & 91001655', sev: 'ERROR (CLIC Blocker)', comp: 'Memory (P64707-B21)', text: 'Standalone BTO memory is rejected in CTO factory builds due to factory bundling rules.', res: 'Swapped to Factory Integrated FIO SKU P64707-F21. 100% capacity (512GB) and speed (DDR5-5600) maintained.', stat: '100% PASS' },
    { id: '81354654', sev: 'ERROR (CLIC Blocker)', comp: 'Cooling Fans (P48820-B21)', text: 'High Performance Fan Kit (P48820-B21) contains all 6 chassis fans. Maximum 1 kit allowed per server.', res: 'Right-sized from 360 kits (6/node) to 60 kits (1/node). Fulfills all 360 physical fan cages and saves $291k.', stat: '100% PASS' },
    { id: '81354627 & 81354632', sev: 'RESOLVED (Path B)', comp: 'Storage Cabling (P48832-B21)', text: 'Tri-Mode Splitter Cable Kit requires PCIe-type RAID controller (MR416i-p) to route to drive cage.', res: 'Pivoted controller to MR416i-p (-p PCIe), making customer\'s original P48832-B21 cable 100% valid and supported.', stat: '100% PASS' },
    { id: '81355854', sev: 'ERROR (CLIC Blocker)', comp: 'OCP Enablement (P51911-B21)', text: 'CPU1 to OCP2 (P51911-B21) and CPU2 to OCP2 (P48830-B21) cannot be selected together.', res: 'Retained P48830-B21 for dual-socket balance and dropped conflicting P51911-B21.', stat: '100% PASS' },
    { id: '81016755 & 81354683', sev: 'WARNING (Functional)', comp: 'PCIe Riser (P48803-B21)', text: 'Enabling Slot 1 on Primary Riser requires Primary Cable Kit (P56073-B21).', res: 'Injected 40x P56073-B21 on Cluster B so all 5 PCIe cards are fully active and cabled.', stat: '100% PASS' },
    { id: '81322276', sev: 'PROCESS CONTROL', comp: 'Cloud Ops Management', text: 'Gen11 CTO models require at least 1 COM base license to proceed to quote conversion.', res: 'Injected 60x R7A11AAE (1 per node across all 60 nodes) for seamless portal approval.', stat: '100% PASS' }
  ];

  auditRules.forEach(r => {
    s5Data.push([r.id, r.sev, r.comp, r.text, r.res, r.stat]);
  });

  const ws5 = xlsx.utils.aoa_to_sheet(s5Data);
  ws5['!cols'] = [{ wch: 22 }, { wch: 22 }, { wch: 25 }, { wch: 50 }, { wch: 50 }, { wch: 18 }];
  ws5['A1'].s = headerStyle(C_DARK, C_WHITE, 12);
  ws5['A2'].s = cellStyle(C_SLATE, false, 'left', C_WHITE, 9);
  for (let c = 0; c < 6; c++) {
    const addr = xlsx.utils.encode_cell({ r: 3, c });
    if (ws5[addr]) ws5[addr].s = headerStyle(C_DARK, C_WHITE, 10);
  }
  for (let r = 4; r < 4 + auditRules.length; r++) {
    const bg = (r % 2 === 0) ? C_ROW_ALT : C_WHITE;
    for (let c = 0; c < 6; c++) {
      const addr = xlsx.utils.encode_cell({ r, c });
      if (!ws5[addr]) continue;
      const align = (c === 0 || c === 1 || c === 5) ? 'center' : 'left';
      ws5[addr].s = cellStyle(bg, c === 0 || c === 5, align, '000000', 9);
      if (c === 5) ws5[addr].s.font.color = { rgb: C_PASS_TEXT };
    }
  }
  xlsx.utils.book_append_sheet(wb, ws5, 'CLIC Compliance Audit');

  // -------------------------------------------------------------
  // Sheet 6: Technical Architecture Matrix
  // -------------------------------------------------------------
  const s6Data = [
    ['HPE ProLiant DL380 Gen11 — Physical Slot & Infrastructure Architecture (Path B)'],
    ['Complete slot occupancy map, storage topology, and cabling interconnects across both clusters.'],
    [],
    ['Bus / Enclosure Slot', 'Slot Status', 'Cluster A Allocation (20 Nodes)', 'Cluster B Allocation (40 Nodes)', 'Cabling & Lane Enablement'],
    ['OCP 3.0 Slot 1', 'Active by Default', 'Broadcom BCM57414 10/25Gb 2p OCP3 (P10115-B21)', 'Broadcom BCM57414 10/25Gb 2p OCP3 (P10115-B21)', 'Direct Motherboard Bus (Freed by -p Controller)'],
    ['OCP 3.0 Slot 2', 'Active via Cable', 'Broadcom BCM5719 1Gb 4p BASE-T OCP3 (P51181-B21)', 'Broadcom BCM5719 1Gb 4p BASE-T OCP3 (P51181-B21)', 'Cabled via CPU2 to OCP2 Cable Kit (P48830-B21)'],
    ['PCIe Slot 1 (Primary Riser)', 'Cluster B Active', 'Empty (Slot Open for Expansion)', 'Broadcom BCM57414 10/25Gb 2p PCIe (P26262-B21)', 'Activated by Primary Cable Kit (P56073-B21)'],
    ['PCIe Slot 2 (Primary Riser)', 'Active by Default', 'HPE SN1610Q 32Gb 2p FC HBA (R2E09A)', 'HPE SN1610Q 32Gb 2p FC HBA (R2E09A)', 'Default Active PCIe 5.0 x16 Bus'],
    ['PCIe Slot 3 (Primary Riser)', 'Active by Default', 'HPE MR416i-p Gen11 Storage Controller (P47777-B21)', 'HPE MR416i-p Gen11 Storage Controller (P47777-B21)', 'Connected to 8SFF Cage via P48832-B21 Splitter Cable'],
    ['PCIe Slot 4 (Secondary Riser)', 'Inactive (Empty)', 'Empty (Available for Future Expansion)', 'Empty (Available for Future Expansion)', 'Requires Secondary Cable Kit (P56074-B21) if used'],
    ['PCIe Slot 5 (Secondary Riser)', 'Active by Default', 'Broadcom BCM57414 10/25Gb 2p PCIe (P26262-B21)', 'Broadcom BCM57414 10/25Gb 2p PCIe (P26262-B21)', 'Default Active PCIe 5.0 x16 Bus'],
    ['PCIe Slot 6 (Secondary Riser)', 'Active by Default', 'HPE SN1610Q 32Gb 2p FC HBA (R2E09A)', 'HPE SN1610Q 32Gb 2p FC HBA (R2E09A)', 'Default Active PCIe 5.0 x16 Bus'],
    ['Rear OS Boot Bay', 'Active by Default', 'HPE NS204i-u Dual NVMe Boot Device (P48183-B21)', 'HPE NS204i-u Dual NVMe Boot Device (P48183-B21)', 'Internal Cable (P52152-B21) + FIO Bundle (P54542-B21)'],
    ['Power Supply Bays 1 & 2', 'Active by Default', 'Dual 1800W-2200W Titanium PSUs (P44712-B21)', 'Dual 1600W Platinum PSUs (P38997-B21)', '1+1 Electrical Redundancy (High-Line 200-240V Recommended)']
  ];

  const ws6 = xlsx.utils.aoa_to_sheet(s6Data);
  ws6['!cols'] = [{ wch: 28 }, { wch: 20 }, { wch: 45 }, { wch: 45 }, { wch: 45 }];
  ws6['A1'].s = headerStyle(C_DARK, C_WHITE, 12);
  ws6['A2'].s = cellStyle(C_SLATE, false, 'left', C_WHITE, 9);
  for (let c = 0; c < 5; c++) {
    const addr = xlsx.utils.encode_cell({ r: 3, c });
    if (ws6[addr]) ws6[addr].s = headerStyle(C_DARK, C_WHITE, 10);
  }
  for (let r = 4; r < s6Data.length; r++) {
    const bg = (r % 2 === 0) ? C_ROW_ALT : C_WHITE;
    for (let c = 0; c < 5; c++) {
      const addr = xlsx.utils.encode_cell({ r, c });
      if (!ws6[addr]) continue;
      ws6[addr].s = cellStyle(bg, c === 0 || c === 1, c === 1 ? 'center' : 'left', '000000', 9);
    }
  }
  xlsx.utils.book_append_sheet(wb, ws6, 'Technical Architecture');

  xlsx.writeFile(wb, MASTER_FILE);
  console.log(`✅ Master 6-Sheet Presentation Workbook Generated: ${MASTER_FILE}`);
}

function buildPartnerPortalWorkbook() {
  const wb = xlsx.utils.book_new();

  const clusterA_items = PATH_B_ITEMS.filter(it => it.qA > 0);
  const clusterB_items = PATH_B_ITEMS.filter(it => it.qB > 0);

  const portalData = [];

  // =============================================================
  // SECTION 1: CONFIGURATION #1 (20x Platinum 8580 Nodes)
  // =============================================================
  portalData.push(['CONFIGURATION #1: 20x HPE ProLiant DL380 Gen11 8SFF (Intel Xeon-Platinum 8580 / 120 Cores Tier)']);
  portalData.push(['Scope: 20 Servers | Dual Platinum 8580 (60C/350W), 512GB DDR5-5600, MR416i-p PCIe, Dual 1800W Titanium PSUs | 100% Factory Buildable']);
  portalData.push(['Item #', 'Parent Line', 'Option Type', 'Product # (SKU)', 'Qty / Server', 'Total Qty (20 Nodes)', 'Product Description', 'Unit List Price (USD)', 'Extended Price (USD)', 'Portal / CLIC Status']);

  let lineCounterA = 100;
  let config1Total = 0;

  clusterA_items.forEach(it => {
    const ext = (it.qA * 20) * it.price;
    config1Total += ext;
    const lineNum = String(lineCounterA).padStart(4, '0');
    lineCounterA += 1;

    portalData.push([
      lineNum,
      '0100',
      it.sku.includes('-F21') ? 'Factory Integrated' : (it.sku === 'P52534-B21' ? 'Base Chassis' : 'Standard Option'),
      it.sku,
      it.qA,
      it.qA * 20,
      it.desc,
      it.price,
      ext,
      '100% Validated in CLIC'
    ]);
  });

  portalData.push(['', '', '', '', '', 'CONFIG #1 SUBTOTAL:', '', '', config1Total, '20 Platinum Nodes Ready for Portal Feed']);

  // =============================================================
  // 2-LINE SEPARATOR GAP
  // =============================================================
  portalData.push([]);
  portalData.push([]);

  // =============================================================
  // SECTION 2: CONFIGURATION #2 (40x Gold 6530 Nodes)
  // =============================================================
  portalData.push(['CONFIGURATION #2: 40x HPE ProLiant DL380 Gen11 8SFF (Intel Xeon-Gold 6530 / 64 Cores Tier)']);
  portalData.push(['Scope: 40 Servers | Dual Gold 6530 (32C/270W), 512GB DDR5-5600, MR416i-p PCIe + P56073 Cable, Dual 1600W Platinum PSUs | 100% Factory Buildable']);
  portalData.push(['Item #', 'Parent Line', 'Option Type', 'Product # (SKU)', 'Qty / Server', 'Total Qty (40 Nodes)', 'Product Description', 'Unit List Price (USD)', 'Extended Price (USD)', 'Portal / CLIC Status']);

  let lineCounterB = 200;
  let config2Total = 0;

  clusterB_items.forEach(it => {
    const ext = (it.qB * 40) * it.price;
    config2Total += ext;
    const lineNum = String(lineCounterB).padStart(4, '0');
    lineCounterB += 1;

    portalData.push([
      lineNum,
      '0200',
      it.sku.includes('-F21') ? 'Factory Integrated' : (it.sku === 'P52534-B21' ? 'Base Chassis' : 'Standard Option'),
      it.sku,
      it.qB,
      it.qB * 40,
      it.desc,
      it.price,
      ext,
      '100% Validated in CLIC'
    ]);
  });

  portalData.push(['', '', '', '', '', 'CONFIG #2 SUBTOTAL:', '', '', config2Total, '40 Gold Nodes Ready for Portal Feed']);

  // =============================================================
  // 2-LINE SEPARATOR GAP
  // =============================================================
  portalData.push([]);
  portalData.push([]);

  // =============================================================
  // SECTION 3: GRAND TOTAL (60 NODES COMBINED)
  // =============================================================
  const grandTotal = config1Total + config2Total;
  portalData.push(['GRAND TOTAL CONSOLIDATED TENDER ORDER VALUE (60 NODES):', '', '', '', '', '', '', '', grandTotal, 'ALL 60 NODES 100% VALIDATED & ORDERABLE']);

  const ws = xlsx.utils.aoa_to_sheet(portalData);
  ws['!cols'] = [
    { wch: 10 }, { wch: 12 }, { wch: 20 }, { wch: 18 }, { wch: 14 }, { wch: 22 }, { wch: 55 }, { wch: 18 }, { wch: 22 }, { wch: 32 }
  ];

  // Apply rich styling to Configuration 1
  ws['A1'].s = headerStyle(C_DARK, C_WHITE, 12);
  ws['A2'].s = cellStyle(C_SLATE, false, 'left', C_WHITE, 9);
  for (let c = 0; c < 10; c++) {
    const addr = xlsx.utils.encode_cell({ r: 2, c });
    if (ws[addr]) ws[addr].s = headerStyle(C_DARK, C_WHITE, 10);
  }

  const rStartA = 3;
  const rEndA = rStartA + clusterA_items.length;
  for (let r = rStartA; r < rEndA; r++) {
    const bg = (r % 2 === 0) ? C_ROW_ALT : C_WHITE;
    for (let c = 0; c < 10; c++) {
      const addr = xlsx.utils.encode_cell({ r, c });
      if (!ws[addr]) continue;
      const align = (c === 0 || c === 1 || c === 4 || c === 5) ? 'center' : (c === 7 || c === 8) ? 'right' : 'left';
      ws[addr].s = cellStyle(bg, c === 3 || c === 8, align, '000000', 9);
      if (c === 7 || c === 8) ws[addr].z = '$#,##0.00';
    }
  }

  const subtotalRowA = rEndA;
  for (let c = 0; c < 10; c++) {
    const addr = xlsx.utils.encode_cell({ r: subtotalRowA, c });
    if (!ws[addr]) continue;
    ws[addr].s = cellStyle(C_EMERALD, true, (c === 7 || c === 8) ? 'right' : 'left', C_WHITE, 10);
    if (c === 7 || c === 8) ws[addr].z = '$#,##0.00';
  }

  // Calculate Configuration 2 starting row index
  const rStartB_Title = subtotalRowA + 3; // +2 blank rows + 1
  const rStartB_Sub = rStartB_Title + 1;
  const rStartB_Head = rStartB_Title + 2;
  const rStartB_Data = rStartB_Title + 3;
  const rEndB = rStartB_Data + clusterB_items.length;

  const addrB1 = xlsx.utils.encode_cell({ r: rStartB_Title, c: 0 });
  const addrB2 = xlsx.utils.encode_cell({ r: rStartB_Sub, c: 0 });
  if (ws[addrB1]) ws[addrB1].s = headerStyle(C_DARK, C_WHITE, 12);
  if (ws[addrB2]) ws[addrB2].s = cellStyle(C_SLATE, false, 'left', C_WHITE, 9);

  for (let c = 0; c < 10; c++) {
    const addr = xlsx.utils.encode_cell({ r: rStartB_Head, c });
    if (ws[addr]) ws[addr].s = headerStyle(C_DARK, C_WHITE, 10);
  }

  for (let r = rStartB_Data; r < rEndB; r++) {
    const bg = (r % 2 === 0) ? C_ROW_ALT : C_WHITE;
    for (let c = 0; c < 10; c++) {
      const addr = xlsx.utils.encode_cell({ r, c });
      if (!ws[addr]) continue;
      const align = (c === 0 || c === 1 || c === 4 || c === 5) ? 'center' : (c === 7 || c === 8) ? 'right' : 'left';
      ws[addr].s = cellStyle(bg, c === 3 || c === 8, align, '000000', 9);
      if (c === 7 || c === 8) ws[addr].z = '$#,##0.00';
    }
  }

  const subtotalRowB = rEndB;
  for (let c = 0; c < 10; c++) {
    const addr = xlsx.utils.encode_cell({ r: subtotalRowB, c });
    if (!ws[addr]) continue;
    ws[addr].s = cellStyle(C_EMERALD, true, (c === 7 || c === 8) ? 'right' : 'left', C_WHITE, 10);
    if (c === 7 || c === 8) ws[addr].z = '$#,##0.00';
  }

  // Grand Total row styling
  const grandTotalRow = subtotalRowB + 3;
  for (let c = 0; c < 10; c++) {
    const addr = xlsx.utils.encode_cell({ r: grandTotalRow, c });
    if (!ws[addr]) continue;
    ws[addr].s = cellStyle(C_DARK, true, (c === 7 || c === 8) ? 'right' : 'left', C_WHITE, 11);
    if (c === 7 || c === 8) ws[addr].z = '$#,##0.00';
  }

  xlsx.utils.book_append_sheet(wb, ws, 'Partner Portal Upload BOM');
  xlsx.writeFile(wb, PORTAL_FILE);
  console.log(`✅ Partner Portal Flat Upload Workbook Generated (Split with 2-line gaps): ${PORTAL_FILE}`);
}

buildMasterWorkbook();
buildPartnerPortalWorkbook();
