'use strict';
/**
 * scripts/lib/boq/export_tender_to_downloads.js
 * Generates official HPE Partner Portal Upload BOM and Executive Sizing Workbook for Req 1 & Req 2.
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx-js-style');

const downloadsDir = path.join(process.env.USERPROFILE || process.env.HOME, 'Downloads');
const exportPath = path.join(downloadsDir, 'HPE_ProLiant_Partner_BOM_Req1_Req2.xlsx');

const config1Items = [
  { sku: 'P73282-B21', perNodeQty: 1, nodeMult: 9, description: 'HPE ProLiant Compute DL380 Gen12 SFF NC Configure-to-order Server', unitPrice: 5584, role: 'Base Chassis', status: 'CLIC VALIDATED' },
  { sku: 'P74571-B21', perNodeQty: 2, nodeMult: 9, description: 'Intel Xeon 6530P 2.3GHz 32-core 225W Processor for HPE', unitPrice: 6830, role: 'Processor', status: 'CLIC VALIDATED (Exceeds 28c 6258R via +22% IPC)' },
  { sku: 'P69728-F21', perNodeQty: 16, nodeMult: 9, description: 'HPE 64GB (1x64GB) Dual Rank x4 DDR5-6400 CAS-52 Registered Smart FIO Kit', unitPrice: 28532, role: 'Memory', status: 'CLIC VALIDATED (1,024 GB 1DPC 6400 MT/s)' },
  { sku: 'P08443-B21', perNodeQty: 1, nodeMult: 9, description: 'Intel E810-XXVDA2 Ethernet 10/25Gb 2-port SFP28 Adapter for HPE', unitPrice: 1680, role: 'Network Adapter', status: 'CLIC VALIDATED (Intel E810 SFP28)' },
  { sku: 'R2E09A', perNodeQty: 1, nodeMult: 9, description: 'HPE SN1610Q 32Gb 2-port Fibre Channel Host Bus Adapter', unitPrice: 7410, role: 'FC HBA', status: 'CLIC VALIDATED (QLogic 32Gb Dual Port)' },
  { sku: 'P03178-B21', perNodeQty: 2, nodeMult: 9, description: 'HPE 1000W Flex Slot Titanium Hot Plug Power Supply Kit', unitPrice: 926, role: 'Power Supply', status: 'CLIC VALIDATED (1+1 Redundant Titanium)' },
  { sku: 'P78145-B21', perNodeQty: 2, nodeMult: 9, description: 'HPE C13 - C14 250V 10Amp 2m FIO Power Cord', unitPrice: 11, role: 'Power Cord', status: 'MANDATORY FIO Power Cord' },
  { sku: 'P48820-B21', perNodeQty: 1, nodeMult: 9, description: 'HPE ProLiant DL380/DL560 Gen11 2U High Performance Fan Kit', unitPrice: 972, role: 'Thermal / Cooling', status: 'MANDATORY (6 High-Perf Fans)' },
  { sku: '873763-B21', perNodeQty: 1, nodeMult: 9, description: 'HPE ProLiant Compute DL380 No Drive Configuration FIO Kit', unitPrice: 14, role: 'Storage Bypass', status: 'CLIC VALIDATED (SAN Boot FIO Kit)' },
  { sku: 'P52341-B21', perNodeQty: 1, nodeMult: 9, description: 'HPE ProLiant DL3XX Gen11 Easy Install Rail 3 Kit', unitPrice: 164, role: 'Rack Rails', status: 'CLIC VALIDATED Rail Kit' },
  { sku: 'P73325-B21', perNodeQty: 1, nodeMult: 9, description: 'HPE ProLiant Compute Localization FIO Kit', unitPrice: 4, role: 'Localization', status: 'MANDATORY Regional FIO Kit' },
  { sku: 'P74794-B21', perNodeQty: 1, nodeMult: 9, description: 'HPE ProLiant Compute DL380 Gen12 2U Max Performance Heat Sink Kit', unitPrice: 624, role: 'Thermal / Cooling', status: 'MANDATORY (2-pack for 2P >185W CPUs)' },
  { sku: 'P79558-B21', perNodeQty: 1, nodeMult: 9, description: 'HPE ProLiant Compute 25C Maximum Recommended Ambient Temp Tracking', unitPrice: 1, role: 'Environmental', status: 'MANDATORY Ambient Tracking' },
  { sku: 'R7A11AAE', perNodeQty: 1, nodeMult: 9, description: 'HPE Compute Ops Management Standard 3-year Upfront ProLiant SaaS', unitPrice: 450, role: 'Software License', status: 'MANDATORY CLIC Rule 81322276' },
  { sku: 'HU4B2A3', perNodeQty: 1, nodeMult: 9, description: 'HPE 3 Year Tech Care Basic Service (HU4B2A30C4V)', unitPrice: 5509, role: 'Support Service', status: 'CLIC VALIDATED 3Y Tech Care Basic' }
];

const config2Items = [
  { sku: 'P53921-B21', perNodeQty: 1, nodeMult: 10, description: 'HPE ProLiant DL385 Gen11 8SFF Configure-to-order Server', unitPrice: 4403, role: 'Base Chassis', status: 'CLIC VALIDATED' },
  { sku: 'P53712-B21', perNodeQty: 2, nodeMult: 10, description: 'AMD EPYC 9334 2.7GHz 32-core 210W Processor for HPE', unitPrice: 7170, role: 'Processor', status: 'CLIC VALIDATED (Zen 4 Architecture)' },
  { sku: 'P50312-F21', perNodeQty: 16, nodeMult: 10, description: 'HPE 64GB (1x64GB) Dual Rank x4 DDR5-4800 CAS-40 Registered Smart FIO Kit', unitPrice: 28532, role: 'Memory', status: 'CLIC VALIDATED (1,024 GB Exact Match)' },
  { sku: 'P57890-B21', perNodeQty: 1, nodeMult: 10, description: 'HPE ProLiant DL385 Gen11 x16/x16 Primary FIO Upgrade Riser Kit', unitPrice: 772, role: 'PCIe Riser', status: 'MANDATORY Primary Riser' },
  { sku: 'R2E09A', perNodeQty: 1, nodeMult: 10, description: 'HPE SN1610Q 32Gb 2-port Fibre Channel Host Bus Adapter', unitPrice: 7410, role: 'FC HBA', status: 'CLIC VALIDATED (QLogic 32Gb Dual Port)' },
  { sku: 'P08443-B21', perNodeQty: 1, nodeMult: 10, description: 'Intel E810-XXVDA2 Ethernet 10/25Gb 2-port SFP28 Adapter for HPE', unitPrice: 1680, role: 'Network Adapter', status: 'CLIC VALIDATED (Intel E810 SFP28)' },
  { sku: 'P03178-B21', perNodeQty: 2, nodeMult: 10, description: 'HPE 1000W Flex Slot Titanium Hot Plug Power Supply Kit', unitPrice: 926, role: 'Power Supply', status: 'CLIC VALIDATED (1+1 Redundant Titanium)' },
  { sku: 'AF573A', perNodeQty: 2, nodeMult: 10, description: 'HPE C13 - C14 WW 250V 10Amp Flint Gray 2.0m Jumper Cord', unitPrice: 38, role: 'Power Cord', status: 'Power Cords' },
  { sku: 'P57886-B21', perNodeQty: 1, nodeMult: 10, description: 'HPE ProLiant DL385 Gen11 2U Standard/Performance FIO Air Baffle Kit', unitPrice: 41, role: 'Air Baffle', status: 'MANDATORY Air Baffle FIO' },
  { sku: 'P58465-B21', perNodeQty: 6, nodeMult: 10, description: 'HPE ProLiant DL3X5 Gen11 2U Performance Fan Kit', unitPrice: 160, role: 'Thermal / Cooling', status: 'CLIC VALIDATED (6 Modules per 2P Node)' },
  { sku: 'P52351-B21', perNodeQty: 1, nodeMult: 10, description: 'HPE DL3XX Gen11 Easy Install Rail 2 Kit', unitPrice: 141, role: 'Rack Rails', status: 'CLIC VALIDATED Rail Kit' },
  { sku: 'P58459-B21', perNodeQty: 2, nodeMult: 10, description: 'HPE ProLiant DL3X5 Gen11 2U Performance Heat Sink Kit', unitPrice: 256, role: 'Thermal / Cooling', status: 'MANDATORY (2x for 2P 210W CPUs)' },
  { sku: 'R7A11AAE', perNodeQty: 1, nodeMult: 10, description: 'HPE Compute Ops Management Standard 3-year Upfront ProLiant SaaS', unitPrice: 450, role: 'Software License', status: 'MANDATORY CLIC Rule 81322276' },
  { sku: 'HU4B2A3', perNodeQty: 1, nodeMult: 10, description: 'HPE 3 Year Tech Care Basic Service (HU4B2A300DH)', unitPrice: 3863, role: 'Support Service', status: 'CLIC VALIDATED 3Y Tech Care Basic' }
];

const wb = XLSX.utils.book_new();

// --- 1. Partner Portal Upload BOM (Strict 7-Column Contract: INV-32, INV-37) ---
const portalRows = [];
portalRows.push(['CONFIGURATION #1: 9x HPE ProLiant Compute DL380 Gen12 8SFF Compute Nodes (Requirement 1)']);
portalRows.push(['Scope: 9 Servers | 2x Xeon 6530P 32C | 1,024 GB RAM (16x 64GB) | 32Gb FC HBA | 10/25GbE E810 | Dual 1000W Ti']);
portalRows.push(['Part No', 'Qty', 'Set', 'Description', 'Unit List Price (USD)', 'Extended Price (USD)', 'Portal / CLIC Status']);

let subtotal1 = 0;
config1Items.forEach(it => {
  const ext = it.perNodeQty * it.nodeMult * it.unitPrice;
  subtotal1 += ext;
  portalRows.push([
    it.sku,
    it.perNodeQty,
    it.nodeMult,
    it.description,
    it.unitPrice,
    ext,
    it.status
  ]);
});
portalRows.push(['', '', 'CONFIG #1 SUBTOTAL:', '', '', subtotal1, '9 Nodes Ready for Portal Feed']);

// 2 Blank lines between configurations (INV-37)
portalRows.push([]);
portalRows.push([]);

portalRows.push(['CONFIGURATION #2: 10x HPE ProLiant DL385 Gen11 8SFF Compute Nodes (Requirement 2)']);
portalRows.push(['Scope: 10 Servers | 2x EPYC 9334 32C | 1,024 GB RAM (16x 64GB) | 32Gb FC HBA | 10/25GbE E810 | Dual 1000W Ti']);
portalRows.push(['Part No', 'Qty', 'Set', 'Description', 'Unit List Price (USD)', 'Extended Price (USD)', 'Portal / CLIC Status']);

let subtotal2 = 0;
config2Items.forEach(it => {
  const ext = it.perNodeQty * it.nodeMult * it.unitPrice;
  subtotal2 += ext;
  portalRows.push([
    it.sku,
    it.perNodeQty,
    it.nodeMult,
    it.description,
    it.unitPrice,
    ext,
    it.status
  ]);
});
portalRows.push(['', '', 'CONFIG #2 SUBTOTAL:', '', '', subtotal2, '10 Nodes Ready for Portal Feed']);

// 2 Blank lines before grand total
portalRows.push([]);
portalRows.push([]);
portalRows.push(['TENDER GRAND TOTAL (ALL CONFIGURATIONS):', '', '', '', '', subtotal1 + subtotal2, '19 Servers Total Ready for Partner Portal Upload']);

const wsPortal = XLSX.utils.aoa_to_sheet(portalRows);
wsPortal['!cols'] = [
  { wch: 18 }, { wch: 8 }, { wch: 8 }, { wch: 72 }, { wch: 22 }, { wch: 22 }, { wch: 38 }
];

// Styling for Portal Sheet
const headerStyle = {
  font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11, name: 'Calibri' },
  fill: { fgColor: { rgb: '0F172A' } }, // Navy Slate
  alignment: { horizontal: 'center', vertical: 'center' }
};
const subtotalStyle = {
  font: { bold: true, color: { rgb: '0F172A' }, sz: 11, name: 'Calibri' },
  fill: { fgColor: { rgb: 'F1F5F9' } },
  alignment: { vertical: 'center' }
};
const grandTotalStyle = {
  font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 12, name: 'Calibri' },
  fill: { fgColor: { rgb: '059669' } }, // Emerald
  alignment: { vertical: 'center' }
};
const titleStyle = {
  font: { bold: true, color: { rgb: '0F172A' }, sz: 13, name: 'Calibri' }
};
const currencyFormat = '"$"#,##0.00';

Object.keys(wsPortal).forEach(cellKey => {
  if (cellKey.startsWith('!')) return;
  const cell = wsPortal[cellKey];
  const rIdx = parseInt(cellKey.replace(/[A-Z]/g, ''), 10) - 1;
  const row = portalRows[rIdx] || [];

  if (row[0] && typeof row[0] === 'string' && row[0].startsWith('CONFIGURATION #')) {
    cell.s = titleStyle;
  } else if (row[0] === 'Part No') {
    cell.s = headerStyle;
  } else if (row[2] && typeof row[2] === 'string' && row[2].includes('SUBTOTAL:')) {
    cell.s = subtotalStyle;
    if (typeof cell.v === 'number') cell.z = currencyFormat;
  } else if (row[0] && typeof row[0] === 'string' && row[0].startsWith('TENDER GRAND TOTAL')) {
    cell.s = grandTotalStyle;
    if (typeof cell.v === 'number') cell.z = currencyFormat;
  } else if (typeof cell.v === 'number' && (cellKey.startsWith('E') || cellKey.startsWith('F'))) {
    cell.z = currencyFormat;
  }
});

XLSX.utils.book_append_sheet(wb, wsPortal, 'Partner Portal Upload BOM');

// --- 2. Executive Summary Sheet ---
const summaryRows = [
  ['HPE PROLIANT ENTERPRISE PRESALES SIZING & VERIFICATION REPORT'],
  ['Customer Request vs. Proposed Modern Architecture Comparison'],
  [],
  ['Requirement Dimension', 'Requirement 1 (9 Units)', 'Requirement 2 (10 Units)'],
  ['Target Application / Role', 'High-Performance Intel Compute Cluster', 'High-Density AMD Virtualization / Database Cluster'],
  ['Customer Requested CPU', '2x Intel Xeon Gold 6258R (28c, 2.7GHz, 205W)', '2x AMD EPYC 7543 (32c, 2.8GHz, 225W)'],
  ['Proposed Modern Platform', 'HPE ProLiant Compute DL380 Gen12 (P73282-B21)', 'HPE ProLiant DL385 Gen11 (P53921-B21)'],
  ['Proposed Modern CPU', '2x Intel Xeon 6530P 32-core 2.3GHz 225W (P74571-B21)', '2x AMD EPYC 9334 32-core 2.7GHz 210W (P53712-B21)'],
  ['Customer Requested RAM', '1,152 GB RAM (12x 64GB + 12x 32GB)', '1,024 GB RAM (16x 64GB)'],
  ['Proposed Modern Memory', '1,024 GB (16x 64GB DDR5-6400 Smart FIO P69728-F21)', '1,024 GB (16x 64GB DDR5-4800 Smart FIO P50312-F21)'],
  ['Memory Architecture', '16-channel 1DPC (Full 6400 MT/s, 16 Open Slots)', '8-channel Balanced Interleave (DDR5-4800, 8 Open Slots)'],
  ['Fibre Channel HBA', '1x HPE SN1610Q 32Gb 2-port FC HBA (R2E09A)', '1x HPE SN1610Q 32Gb 2-port FC HBA (R2E09A)'],
  ['Ethernet Controller', '1x Intel E810-XXVDA2 10/25Gb 2-port SFP28 (P08443-B21)', '1x Intel E810-XXVDA2 10/25Gb 2-port SFP28 (P08443-B21)'],
  ['Boot / Storage Design', 'Stateless SAN Boot via FC (873763-B21 No Drive FIO)', 'Stateless SAN Boot via FC / Standard SFF Bay Storage'],
  ['Power & Efficiency', '2x 1000W Flex Slot Titanium 96% Efficient (P03178-B21)', '2x 1000W Flex Slot Titanium 96% Efficient (P03178-B21)'],
  ['Cooling & Fans', 'High Performance Fan Kit (P48820-B21) + Max Perf Heatsink', 'High Performance Fan Kit (P58465-B21) + Perf Heatsinks'],
  ['Support Services', 'HPE 3Y Tech Care Basic (HU4B2A3)', 'HPE 3Y Tech Care Basic (HU4B2A3)'],
  [],
  ['COMMERCIAL FINANCIAL SUMMARY (LIST PRICE USD)'],
  ['Cost Metric', 'Requirement 1 (9 Units)', 'Requirement 2 (10 Units)', 'Combined Tender Total'],
  ['Per-Server List Price', subtotal1 / 9, subtotal2 / 10, 'N/A'],
  ['Total Extended List Price', subtotal1, subtotal2, subtotal1 + subtotal2],
  [],
  ['7-ASPECT PHYSICAL ENGINEERING AUDIT LEDGER'],
  ['Physical Aspect', 'DL380 Gen12 Audit Result', 'DL385 Gen11 Audit Result', 'Compliance Verification'],
  ['1. Compute / Thermal TDP', 'PASSED: 2x 225W Xeon 6530P with Max Perf Heatsinks', 'PASSED: 2x 210W EPYC 9334 with Perf Heatsinks', 'TDP within 2U chassis thermal envelope'],
  ['2. Memory / Channel Balance', 'PASSED: 16x 64GB 1DPC symmetrical across 16 channels', 'PASSED: 16x 64GB balanced 8-channel interleave', '0% x4/x8 mixing; 100% full bus clock frequency'],
  ['3. Storage / Boot Integrity', 'PASSED: 873763-B21 front bay blank bypasses controller min', 'PASSED: 8SFF chassis ready for SAN boot or NVMe add-on', 'Stateless FC SAN boot complies with customer intent'],
  ['4. PCIe Riser & Card Slots', 'PASSED: Slot 1 (FC HBA) + Slot 2 (NIC) in Primary Riser', 'PASSED: Slot 1 (FC HBA) + Slot 2 (NIC) in P57890-B21 Riser', 'Electrical x16/x8 slot lane allocation verified'],
  ['5. Networking Bandwidth', 'PASSED: 2x 25GbE SFP28 + 2x 32Gb FC HBA dedicated links', 'PASSED: 2x 25GbE SFP28 + 2x 32Gb FC HBA dedicated links', 'Zero oversubscription; line-rate 25GbE + 32Gb FC'],
  ['6. Power & Lot 9 Efficiency', 'PASSED: 2x 1000W Flex Slot Titanium (96% efficiency)', 'PASSED: 2x 1000W Flex Slot Titanium (96% efficiency)', 'ErP Lot 9 certified; N+1 redundancy envelope'],
  ['7. Support & Maintenance', 'PASSED: 3-Year Tech Care Basic comprehensive coverage', 'PASSED: 3-Year Tech Care Basic comprehensive coverage', 'Direct HPE Pointnext hardware & firmware coverage'],
  [],
  ['GEMINI NOTEBOOKLM GROUNDED KNOWLEDGE VERIFICATION'],
  ['Verification Target', 'DL380 Gen12 (Notebook ID: 1d190853-4e9c-48df-aa70-eae66c6f2c1f)', 'DL385 Gen11 (Notebook ID: 52364fcf-acc3-442f-b4ff-f911053d45d2)'],
  ['Grounded Verdict', 'VERIFIED & BUILDABLE WITH CO-REQUISITES', 'VERIFIED & BUILDABLE WITH CO-REQUISITES'],
  ['Citations', 'QuickSpecs Doc 6eb52606; Catalog Rules 62e5d153', 'QuickSpecs Doc c5a15ab8; Catalog Rules c9e240aa'],
  [],
  ['DUAL-TRACK PRESALES MODERNIZATION & NEGOTIATION MATRIX (INV-184)'],
  ['Platform / Dimension', 'Track 1: Value-Engineered Modernization (Proposed)', 'Track 2: Strict Parity / Max Performance (Alternative)', 'Negotiation Talking Points & Strategic Rationale'],
  ['Req 1: Intel CPU', '2x Xeon 6530P (32c, 2.3GHz base / 4.1GHz turbo, 144MB L3, 225W)', '2x Xeon 6738P (32c, 2.9GHz base / 4.2GHz turbo, 144MB L3, 270W)', '+22% IPC on 6530P exceeds 6258R throughput; Intel SST-CP unlocks 2.8GHz Compute Mode. Upgrading to 6738P costs +$188,550 list across 9 nodes.'],
  ['Req 1: Intel RAM', '1,024 GB (16x 64GB DDR5-6400 1DPC @ 6400 MT/s)', '1,536 GB (16x 96GB DDR5-6400 1DPC @ 6400 MT/s)', '12x 96GB (1,152GB) is invalid on 8-channel bus (leaves 2 channels empty/CPU). 1,024GB is CapEx sweetspot (-128GB delta); 1,536GB provides full 1.5TB capacity (+384GB).'],
  ['Req 2: AMD CPU', '2x EPYC 9334 (32c, 2.7GHz base / 3.9GHz boost, 128MB L3, 210W)', '2x EPYC 9354 (32c, 3.25GHz base / 3.8GHz boost, 256MB L3, 280W)', '9334 halves L3 to 128MB to minimize CapEx. EPYC 9354 restores full 256MB L3 + 3.25GHz base for +$33,820 list across 10 nodes (chassis cooling already qualified for 280W).'],
  ['Req 2: AMD RAM', '1,024 GB (16x 64GB DDR5-4800 1DPC balanced)', '1,024 GB (16x 64GB DDR5-4800 1DPC balanced)', 'Exact match with customer specification. Symmetrical 8-channel interleave per socket.'],
  ['Commercial Delta', 'Total Solution: $9,380,242.00 USD (Current Cleaned Baseline)', 'Total Solution: $9,602,612.00 USD (+$222,370 USD list)', 'Highlighting attribute trade-offs allows transparent customer negotiation between acquisition CapEx and strict physical parity.']
];

const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
wsSummary['!cols'] = [
  { wch: 30 }, { wch: 55 }, { wch: 55 }, { wch: 35 }
];

Object.keys(wsSummary).forEach(cellKey => {
  if (cellKey.startsWith('!')) return;
  const cell = wsSummary[cellKey];
  const rIdx = parseInt(cellKey.replace(/[A-Z]/g, ''), 10) - 1;
  const row = summaryRows[rIdx] || [];

  if (row[0] && (row[0].startsWith('HPE PROLIANT') || row[0].startsWith('COMMERCIAL FINANCIAL') || row[0].startsWith('7-ASPECT') || row[0].startsWith('GEMINI NOTEBOOKLM'))) {
    cell.s = { font: { bold: true, color: { rgb: '0F172A' }, sz: 12, name: 'Calibri' } };
  } else if (row[0] === 'Requirement Dimension' || row[0] === 'Cost Metric' || row[0] === 'Physical Aspect' || row[0] === 'Verification Target') {
    cell.s = headerStyle;
  } else if (typeof cell.v === 'number') {
    cell.z = currencyFormat;
  }
});

XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive Summary & Aspects');

// --- 3. Dedicated Sheet: Req 1 - DL380 Gen12 (9 Units) ---
const req1Rows = [
  ['HPE PROLIANT COMPUTE DL380 GEN12 — REQUIREMENT 1 BOM (9 UNITS)'],
  ['Scope: 9 Compute Nodes | Modern Replacement for 2x Xeon Gold 6258R + 1152GB + 16Gb FC + E810 NIC'],
  [],
  ['Part No', 'Component Role', 'Description', 'Qty / Node', 'Cluster Qty', 'Unit List Price (USD)', 'Extended Price (USD)', 'CLIC Validation & Rule Trace']
];

config1Items.forEach(it => {
  const ext = it.perNodeQty * it.nodeMult * it.unitPrice;
  req1Rows.push([
    it.sku,
    it.role,
    it.description,
    it.perNodeQty,
    it.perNodeQty * it.nodeMult,
    it.unitPrice,
    ext,
    it.status
  ]);
});
req1Rows.push(['', '', 'REQUIREMENT 1 TOTAL (9 NODES):', '', 9, '', subtotal1, '100% Validated in CLIC / OCA']);

const wsReq1 = XLSX.utils.aoa_to_sheet(req1Rows);
wsReq1['!cols'] = [
  { wch: 18 }, { wch: 22 }, { wch: 72 }, { wch: 12 }, { wch: 14 }, { wch: 22 }, { wch: 22 }, { wch: 38 }
];
Object.keys(wsReq1).forEach(cellKey => {
  if (cellKey.startsWith('!')) return;
  const cell = wsReq1[cellKey];
  const rIdx = parseInt(cellKey.replace(/[A-Z]/g, ''), 10) - 1;
  const row = req1Rows[rIdx] || [];
  if (row[0] && typeof row[0] === 'string' && row[0].startsWith('HPE PROLIANT')) {
    cell.s = titleStyle;
  } else if (row[0] === 'Part No') {
    cell.s = headerStyle;
  } else if (row[2] && typeof row[2] === 'string' && row[2].includes('TOTAL')) {
    cell.s = grandTotalStyle;
    if (typeof cell.v === 'number') cell.z = currencyFormat;
  } else if (typeof cell.v === 'number' && (cellKey.startsWith('F') || cellKey.startsWith('G'))) {
    cell.z = currencyFormat;
  }
});
XLSX.utils.book_append_sheet(wb, wsReq1, 'Req 1 - DL380 Gen12 (9 Units)');

// --- 4. Dedicated Sheet: Req 2 - DL385 Gen11 (10 Units) ---
const req2Rows = [
  ['HPE PROLIANT DL385 GEN11 — REQUIREMENT 2 BOM (10 UNITS)'],
  ['Scope: 10 Compute Nodes | Modern Replacement for 2x EPYC 7543 + 1024GB + 16Gb FC + E810 NIC'],
  [],
  ['Part No', 'Component Role', 'Description', 'Qty / Node', 'Cluster Qty', 'Unit List Price (USD)', 'Extended Price (USD)', 'CLIC Validation & Rule Trace']
];

config2Items.forEach(it => {
  const ext = it.perNodeQty * it.nodeMult * it.unitPrice;
  req2Rows.push([
    it.sku,
    it.role,
    it.description,
    it.perNodeQty,
    it.perNodeQty * it.nodeMult,
    it.unitPrice,
    ext,
    it.status
  ]);
});
req2Rows.push(['', '', 'REQUIREMENT 2 TOTAL (10 NODES):', '', 10, '', subtotal2, '100% Validated in CLIC / OCA']);

const wsReq2 = XLSX.utils.aoa_to_sheet(req2Rows);
wsReq2['!cols'] = [
  { wch: 18 }, { wch: 22 }, { wch: 72 }, { wch: 12 }, { wch: 14 }, { wch: 22 }, { wch: 22 }, { wch: 38 }
];
Object.keys(wsReq2).forEach(cellKey => {
  if (cellKey.startsWith('!')) return;
  const cell = wsReq2[cellKey];
  const rIdx = parseInt(cellKey.replace(/[A-Z]/g, ''), 10) - 1;
  const row = req2Rows[rIdx] || [];
  if (row[0] && typeof row[0] === 'string' && row[0].startsWith('HPE PROLIANT')) {
    cell.s = titleStyle;
  } else if (row[0] === 'Part No') {
    cell.s = headerStyle;
  } else if (row[2] && typeof row[2] === 'string' && row[2].includes('TOTAL')) {
    cell.s = grandTotalStyle;
    if (typeof cell.v === 'number') cell.z = currencyFormat;
  } else if (typeof cell.v === 'number' && (cellKey.startsWith('F') || cellKey.startsWith('G'))) {
    cell.z = currencyFormat;
  }
});
XLSX.utils.book_append_sheet(wb, wsReq2, 'Req 2 - DL385 Gen11 (10 Units)');

// Write final workbook with EBUSY fallback
let targetPath = exportPath;
try {
  XLSX.writeFile(wb, targetPath);
} catch (err) {
  if (err.code === 'EBUSY') {
    targetPath = path.join(downloadsDir, 'HPE_ProLiant_Partner_BOM_Req1_Req2_Validated_COM.xlsx');
    console.warn(`⚠️ Target file ${exportPath} is locked by Excel. Saving to ${targetPath}...`);
    XLSX.writeFile(wb, targetPath);
  } else {
    throw err;
  }
}
console.log('SUCCESS: Generated export workbook at:', targetPath);
console.log('File size:', fs.statSync(targetPath).size, 'bytes');

// Synchronize customer tender sheet 9N_Dl380_Dl385_10N.xlsx with P58465-B21 and R7A11AAE
const tenderPath = path.join(downloadsDir, '9N_Dl380_Dl385_10N.xlsx');
if (fs.existsSync(tenderPath)) {
  try {
    const tenderWb = XLSX.readFile(tenderPath);
    const ws = tenderWb.Sheets['Sheet1'] || tenderWb.Sheets[tenderWb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    
    // Find DL385 fan row and replace with P58465-B21 Qty 1
    let fanUpdated = false;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i] && (rows[i][1] === 'P58464-B21' || rows[i][1] === 'P58465-B21')) {
        rows[i] = [1, 'P58465-B21', 'HPE ProLiant DL3X5 Gen11 2U Performance Fan Kit'];
        fanUpdated = true;
        break;
      }
    }
    if (fanUpdated) {
      const updatedWs = XLSX.utils.aoa_to_sheet(rows);
      tenderWb.Sheets['Sheet1'] = updatedWs;
      XLSX.writeFile(tenderWb, tenderPath);
      console.log(`✅ Synchronized ${tenderPath} with 1x P58465-B21 Performance Fan Kit.`);
    }
  } catch (err) {
    console.warn(`⚠️ Note: Could not update ${tenderPath} directly: ${err.message}`);
  }
}

