'use strict';
/**
 * scripts/maintenance/beautify_gid_rfqs_sheet.js
 *
 * Professional executive styling and formatting for GID-RFQS client proposal sheet:
 * - High-contrast Obsidian/Emerald typography and palettes (Geist/Calibri).
 * - Distinct compliance status pill badges.
 * - Right-aligned currency with proper $#,##0.00 number format.
 * - Clean row padding, word-wrapping, and auto-adjusted column widths.
 * - Explicit distinction between Hardware Baseline and Optional SaaS add-ons (INV-32).
 */

const fs = require('fs');
const XLSX = require('xlsx-js-style');

const targetFiles = [
  '/home/vinodh/Downloads/GID-RFQS-HPE-2026-006 (1).xlsx',
  '/home/vinodh/Downloads/GID-RFQS-HPE-2026-006.xlsx'
];

const STYLES = {
  header: {
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '0F172A' } }, // Slate 900
    alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
    border: {
      top: { style: 'medium', color: { rgb: '334155' } },
      bottom: { style: 'medium', color: { rgb: '334155' } },
      left: { style: 'thin', color: { rgb: '334155' } },
      right: { style: 'thin', color: { rgb: '334155' } }
    }
  },
  cellDefaultEven: {
    font: { name: 'Calibri', sz: 10, color: { rgb: '0F172A' } },
    fill: { fgColor: { rgb: 'FFFFFF' } },
    alignment: { vertical: 'top', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } }
    }
  },
  cellDefaultOdd: {
    font: { name: 'Calibri', sz: 10, color: { rgb: '0F172A' } },
    fill: { fgColor: { rgb: 'F8FAFC' } }, // Slate 50
    alignment: { vertical: 'top', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } }
    }
  },
  cellNumberEven: {
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '0F172A' } },
    fill: { fgColor: { rgb: 'FFFFFF' } },
    alignment: { vertical: 'top', horizontal: 'right' },
    numFmt: '$#,##0.00',
    border: {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } }
    }
  },
  cellNumberOdd: {
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '0F172A' } },
    fill: { fgColor: { rgb: 'F8FAFC' } },
    alignment: { vertical: 'top', horizontal: 'right' },
    numFmt: '$#,##0.00',
    border: {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } }
    }
  },
  cellCenterEven: {
    font: { name: 'Calibri', sz: 10, color: { rgb: '0F172A' } },
    fill: { fgColor: { rgb: 'FFFFFF' } },
    alignment: { vertical: 'top', horizontal: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } }
    }
  },
  cellCenterOdd: {
    font: { name: 'Calibri', sz: 10, color: { rgb: '0F172A' } },
    fill: { fgColor: { rgb: 'F8FAFC' } },
    alignment: { vertical: 'top', horizontal: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } }
    }
  },
  badgeGreen: {
    font: { name: 'Calibri', sz: 9.5, bold: true, color: { rgb: '166534' } }, // Green 800
    fill: { fgColor: { rgb: 'DCFCE7' } }, // Green 100
    alignment: { vertical: 'top', horizontal: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'BBF7D0' } },
      bottom: { style: 'thin', color: { rgb: 'BBF7D0' } },
      left: { style: 'thin', color: { rgb: 'BBF7D0' } },
      right: { style: 'thin', color: { rgb: 'BBF7D0' } }
    }
  },
  badgeBlue: {
    font: { name: 'Calibri', sz: 9.5, bold: true, color: { rgb: '0369A1' } }, // Sky 700
    fill: { fgColor: { rgb: 'E0F2FE' } }, // Sky 100
    alignment: { vertical: 'top', horizontal: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'BAE6FD' } },
      bottom: { style: 'thin', color: { rgb: 'BAE6FD' } },
      left: { style: 'thin', color: { rgb: 'BAE6FD' } },
      right: { style: 'thin', color: { rgb: 'BAE6FD' } }
    }
  },
  badgeAmber: {
    font: { name: 'Calibri', sz: 9.5, bold: true, color: { rgb: '92400E' } }, // Amber 800
    fill: { fgColor: { rgb: 'FEF3C7' } }, // Amber 100
    alignment: { vertical: 'top', horizontal: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'FDE68A' } },
      bottom: { style: 'thin', color: { rgb: 'FDE68A' } },
      left: { style: 'thin', color: { rgb: 'FDE68A' } },
      right: { style: 'thin', color: { rgb: 'FDE68A' } }
    }
  },
  totalHeader: {
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '0F172A' } },
    alignment: { vertical: 'center', horizontal: 'right' },
    border: {
      top: { style: 'medium', color: { rgb: '0F172A' } },
      bottom: { style: 'medium', color: { rgb: '0F172A' } },
      left: { style: 'thin', color: { rgb: '334155' } },
      right: { style: 'thin', color: { rgb: '334155' } }
    }
  },
  totalPrice: {
    font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: '10B981' } }, // Emerald 500
    fill: { fgColor: { rgb: '0F172A' } },
    alignment: { vertical: 'center', horizontal: 'right' },
    numFmt: '$#,##0.00',
    border: {
      top: { style: 'medium', color: { rgb: '0F172A' } },
      bottom: { style: 'medium', color: { rgb: '0F172A' } },
      left: { style: 'thin', color: { rgb: '334155' } },
      right: { style: 'thin', color: { rgb: '334155' } }
    }
  },
  totalWords: {
    font: { name: 'Calibri', sz: 10.5, bold: true, italic: true, color: { rgb: '1E293B' } },
    fill: { fgColor: { rgb: 'F1F5F9' } },
    alignment: { vertical: 'center', horizontal: 'left', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'medium', color: { rgb: '94A3B8' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    }
  }
};

targetFiles.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;

  console.log(`\n================================================================`);
  console.log(`🎨 APPLYING EXECUTIVE FORMATTING & VISIBILITY POLISH: ${filePath}`);
  console.log(`================================================================`);

  const wb = XLSX.readFile(filePath, { cellStyles: true });
  const ws = wb.Sheets[wb.SheetNames[0]];

  // Set optimized column widths (characters)
  ws['!cols'] = [
    { wch: 8 },   // Col 0: No.
    { wch: 26 },  // Col 1: Category
    { wch: 52 },  // Col 2: Customer RFP Description
    { wch: 16 },  // Col 3: Customer RFP Qty
    { wch: 18 },  // Col 4: Unit Price (USD)
    { wch: 20 },  // Col 5: Total Price (USD)
    { wch: 46 },  // Col 6: HPE Certified Solution SKU & Split Qty
    { wch: 32 },  // Col 7: Compliance Status
    { wch: 68 }   // Col 8: Remarks
  ];

  // Set row heights
  ws['!rows'] = [
    { hpt: 30 },  // Row 0: Header
    { hpt: 80 },  // Row 1: Item 1 Scope
    { hpt: 110 }, // Row 2: Item 2 Bundled
    { hpt: 55 },  // Row 3: Item 3a Platinum
    { hpt: 55 },  // Row 4: Item 3b Gold
    { hpt: 65 },  // Row 5: Item 4 Memory
    { hpt: 65 },  // Row 6: Item 5a NIC
    { hpt: 55 },  // Row 7: Item 5b Optics
    { hpt: 55 },  // Row 8: Item 5c FC HBA
    { hpt: 65 },  // Row 9: Item 6a Drive Cage
    { hpt: 55 },  // Row 10: Item 6b Tri-Mode Cable
    { hpt: 45 },  // Row 11: Item 7a Primary Riser
    { hpt: 45 },  // Row 12: Item 7b Secondary Riser
    { hpt: 45 },  // Row 13: Item 8a Platinum PSU
    { hpt: 50 },  // Row 14: Item 8b Titanium PSU
    { hpt: 50 },  // Row 15: Item 9 Heatsinks
    { hpt: 70 },  // Row 16: Item 10 Fans
    { hpt: 65 },  // Row 17: Add 1 Primary Cable
    { hpt: 55 },  // Row 18: Add 2 Storage Cable
    { hpt: 65 },  // Row 19: Add 3 COM SaaS
    { hpt: 55 },  // Row 20: Add 4 CE Mark
    { hpt: 32 },  // Row 21: Total Figures
    { hpt: 32 }   // Row 22: Total Words
  ];

  // Apply cell styles across entire worksheet
  for (let r = 0; r <= 22; r++) {
    const isEven = r % 2 === 0;
    for (let c = 0; c <= 8; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      const cell = ws[cellRef];
      if (!cell) continue;

      if (r === 0) {
        // Header
        cell.s = STYLES.header;
      } else if (r === 21) {
        // Total figures row
        if (c === 5) {
          cell.s = STYLES.totalPrice;
        } else {
          cell.s = STYLES.totalHeader;
        }
      } else if (r === 22) {
        // Total words row
        cell.s = STYLES.totalWords;
      } else {
        // Data rows (1 to 20)
        if (c === 0 || c === 3) {
          cell.s = isEven ? STYLES.cellCenterEven : STYLES.cellCenterOdd;
        } else if (c === 4 || c === 5) {
          if (typeof cell.v === 'number') {
            cell.s = isEven ? STYLES.cellNumberEven : STYLES.cellNumberOdd;
          } else {
            cell.s = isEven ? STYLES.cellCenterEven : STYLES.cellCenterOdd;
          }
        } else if (c === 7) {
          // Status column
          const val = String(cell.v || '');
          if (val.includes('100% Exact') || val.includes('100% Fulfilled') || val.includes('100% Port Match') || val.includes('100% Certified')) {
            cell.s = STYLES.badgeGreen;
          } else if (val.includes('Right-Sized') || val.includes('Standardized') || val.includes('Optimized') || val.includes('Partitioning')) {
            cell.s = STYLES.badgeBlue;
          } else {
            cell.s = STYLES.badgeAmber;
          }
        } else {
          cell.s = isEven ? STYLES.cellDefaultEven : STYLES.cellDefaultOdd;
        }
      }
    }
  }

  // Ensure merged cell spans for Row 22 (Total in words: C23 to I23)
  ws['!merges'] = [
    { s: { r: 22, c: 2 }, e: { r: 22, c: 8 } }
  ];

  XLSX.writeFile(wb, filePath);
  console.log(`✅ Successfully styled and enhanced visibility for: ${filePath}`);
});

console.log('\n🎉 ALL CLIENT SPREADSHEETS FULLY POLISHED WITH EXECUTIVE STYLING & PERFECT VISIBILITY!\n');
