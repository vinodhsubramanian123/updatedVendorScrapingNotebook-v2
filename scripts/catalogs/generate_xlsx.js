/**
 * generate_xlsx.js — Generic HPE OCA Catalog Excel Generator (with Color-Coded Diffs)
 * Usage: node scripts/generate_xlsx.js <output_xlsx_path>
 *
 * Derives ALL file paths from the xlsx output path — ZERO hardcoded product names.
 * TSV intermediates are read from:  <xlsx_dir>/intermittent_scraps/<prefix>_Catalog_*.tsv
 * Category drill-down sheets are generated dynamically from SKU data — no hardcoded list.
 * Uses xlsx-js-style for cell styling (Green=Added, Red=Removed, Amber=Price Changed).
 */

'use strict';

const fs   = require('fs');
const XLSX = require('xlsx-js-style');
const path = require('path');

/**
 * Sanitize a string for use as an Excel sheet name.
 * - Strips illegal characters: : \ / ? * [ ]
 * - Truncates to 31 characters (Excel limit)
 * - Deduplicates collisions by appending _2, _3, etc.
 * @param {string} name - Raw category name
 * @param {string[]} existingNames - Already-used sheet names for collision detection
 * @returns {string} Safe, unique sheet name
 */
function sanitizeSheetName(name, existingNames) {
  let safe = String(name)
    .replace(/[:\\/?*\[\]]/g, '')  // Strip Excel-illegal characters
    .replace(/^'+|'+$/g, '')       // Strip leading/trailing single quotes
    .trim();
  if (safe.length === 0) safe = 'Sheet';
  safe = safe.substring(0, 31);

  // Deduplicate: if collision, append _2, _3, etc.
  let candidate = safe;
  let counter = 2;
  while (existingNames.includes(candidate)) {
    const suffix = `_${counter}`;
    candidate = safe.substring(0, 31 - suffix.length) + suffix;
    counter++;
  }
  return candidate;
}

// ── Argument handling ─────────────────────────────────────────────────────────
const xlsxPath = process.argv[2];
if (!xlsxPath) {
  console.error('Usage: node scripts/generate_xlsx.js <outputs/.../Foo_OCA_Catalog.xlsx>');
  process.exit(1);
}

const targetDir = path.dirname(xlsxPath);
const scrapsDir = path.join(targetDir, 'intermittent_scraps');

// Derive clean prefix: DL380_Gen12_SFF_OCA_Catalog.xlsx → DL380_Gen12_SFF
const xlsxBase   = path.basename(xlsxPath, '.xlsx');         // e.g. DL380_Gen12_SFF_OCA_Catalog
const filePrefix = xlsxBase.replace(/_OCA_Catalog$/, '');    // e.g. DL380_Gen12_SFF

// ── TSV parser — required: exits on missing; optional: returns empty ─────────
function parseTSV(filepath, { required = true } = {}) {
  if (!fs.existsSync(filepath)) {
    if (required) {
      console.error(`ERROR: TSV not found: ${filepath}`);
      process.exit(1);
    }
    console.warn(`⚠️  Optional TSV not found (skipping sheet): ${filepath}`);
    return { headers: [], data: [] };
  }
  const lines   = fs.readFileSync(filepath, 'utf-8').split('\n');
  const headers = lines[0].split('\t');
  const data    = lines.slice(1).filter(l => l.trim()).map(line => {
    const cells = line.split('\t');
    const obj   = {};
    headers.forEach((h, i) => { obj[h] = cells[i] || ''; });
    return obj;
  });
  return { headers, data };
}

// ── Load TSV files ─────────────────────────────────────────────────────────
// Hardware TSVs are required. Services TSV is optional (generated only when
// service entries are present in the scrape).
const skuData      = parseTSV(path.join(scrapsDir, `${filePrefix}_Catalog_SKUs.tsv`));
const rulesData    = parseTSV(path.join(scrapsDir, `${filePrefix}_Catalog_Rules.tsv`));
const summaryData  = parseTSV(path.join(scrapsDir, `${filePrefix}_Catalog_Summary.tsv`));
const servicesData = parseTSV(path.join(scrapsDir, `${filePrefix}_Services_SKUs.tsv`), { required: false });

// ── Build workbook ────────────────────────────────────────────────────────────
const wb = XLSX.utils.book_new();

// ── Column widths for 24-field SKU schema (19 base + 5 diff fields) ──────────
// GAP FIX #2: Added Subcategory Min Qty column between Constraint Text and Subcategory Max Qty
const SKU_COL_WIDTHS = [
  { wch: 25 }, // Main Category
  { wch: 35 }, // Sub-Category
  { wch: 70 }, // Hierarchy Path
  { wch: 22 }, // Component Role
  { wch: 15 }, // Constraint Text
  { wch: 15 }, // Subcategory Min Qty
  { wch: 15 }, // Subcategory Max Qty
  { wch: 60 }, // Table Rule/Note
  { wch: 16 }, // Product #
  { wch: 14 }, // Option Type
  { wch: 70 }, // Description
  { wch: 12 }, // Current Qty
  { wch: 16 }, // Unit Price (USD)
  { wch: 16 }, // Price Delta (USD)
  { wch: 18 }, // Extended Price (USD)
  { wch: 15 }, // Price per GB (USD)
  { wch: 14 }, // HPE Recommended
  { wch: 12 }, // Start Date
  { wch: 16 }, // Discontinued Date
  { wch: 16 }, // Diff Status
  { wch: 22 }, // Previous List Price (USD)
  { wch: 18 }, // Price Change (USD)
  { wch: 16 }, // Price Change (%)
  { wch: 55 }, // Price History Trail
];

// ── Cell Styling Helper for Diff Status ──────────────────────────────────────
function applyDiffStyles(ws, data) {
  if (!ws['!ref']) return;
  const range = XLSX.utils.decode_range(ws['!ref']);

  for (let r = 1; r <= range.e.r; r++) {
    const rowObj = data[r - 1];
    if (!rowObj) continue;

    const status = rowObj['Diff Status'] || 'UNCHANGED';
    let style = null;

    if (status === 'ADDED') {
      style = {
        font: { name: 'Calibri', sz: 11, color: { rgb: 'FF137333' }, bold: true },
        fill: { fgColor: { rgb: 'FFE6F4EA' } }
      };
    } else if (status === 'REMOVED') {
      style = {
        font: { name: 'Calibri', sz: 11, color: { rgb: 'FFC5221F' }, strike: true },
        fill: { fgColor: { rgb: 'FFFDE7E7' } }
      };
    } else if (status === 'REINSTATED') {
      style = {
        font: { name: 'Calibri', sz: 11, color: { rgb: 'FF7B4F00' }, bold: true },
        fill: { fgColor: { rgb: 'FFFFF8E1' } }   // Gold/amber
      };
    } else if (status === 'PRICE_CHANGED') {
      style = {
        font: { name: 'Calibri', sz: 11, color: { rgb: 'FFB06000' }, bold: true },
        fill: { fgColor: { rgb: 'FFFFF3E0' } }
      };
    } else if (status === 'ATTRIBUTE_CHANGED') {
      style = {
        font: { name: 'Calibri', sz: 11, color: { rgb: 'FF1A73E8' } },
        fill: { fgColor: { rgb: 'FFE8F0FE' } }   // Blue
      };
    } else if (status === 'PRICE_AND_ATTRIBUTE_CHANGED') {
      style = {
        font: { name: 'Calibri', sz: 11, color: { rgb: 'FF6B0080' }, bold: true },
        fill: { fgColor: { rgb: 'FFF3E5F5' } }   // Purple
      };
    }

    if (style) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        if (ws[cellRef]) {
          ws[cellRef].s = style;
        }
      }
    }
  }
}

// ── Enable Freeze Header Row, Header Colors & AutoFilter for clean UX ──────────
function enableSheetUsability(ws, headerFg = 'FF0072C6') {
  if (!ws || !ws['!ref']) return;
  ws['!autofilter'] = { ref: ws['!ref'] };
  ws['!views']      = [{ state: 'frozen', xSplit: 0, ySplit: 1, activeCell: 'A2' }];

  // Style header row — use 8-char ARGB FFFFFFFF to ensure 100% opacity in Excel
  const range = XLSX.utils.decode_range(ws['!ref']);
  const headerStyle = {
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFFFF' } },
    fill: { fgColor: { rgb: headerFg } },
    alignment: { vertical: 'center' }
  };
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[cellRef]) {
      ws[cellRef].s = headerStyle;
    }
  }
}

// ── Convert String Numbers to Native Excel Types (Numeric Math & Sorting) ─────
function normalizeRowsForExcel(rows) {
  return rows.map(r => {
    const out = {};
    for (const [k, v] of Object.entries(r)) {
      if (v === null || v === undefined || v === '') {
        out[k] = '';
        continue;
      }
      const sVal = String(v).trim();
      
      // Price fields
      if (k.includes('Price') || k.includes('Cost')) {
        if (sVal === 'N/A' || sVal === '-' || sVal.startsWith('[REMOVED') || sVal.includes('(')) {
          out[k] = sVal;
        } else {
          const cleanNum = sVal.replace(/[\$,\s]/g, '');
          const num = parseFloat(cleanNum);
          out[k] = isNaN(num) ? sVal : num;
        }
      }
      // Quantity / Count fields
      else if (k.includes('Qty') || k.includes('Count') || k.includes('Unique SKUs') || k.includes('Total SKUs') || k === 'Days Active') {
        if (sVal === 'Unlimited' || sVal === 'Required' || sVal === 'N/A' || sVal === '-') {
          out[k] = sVal;
        } else {
          const cleanInt = sVal.replace(/[^0-9\-]/g, '');
          const num = parseInt(cleanInt, 10);
          out[k] = isNaN(num) ? sVal : num;
        }
      } else {
        out[k] = sVal;
      }
    }
    return out;
  });
}

function formatNumericCells(ws) {
  if (!ws || !ws['!ref']) return;
  const range = XLSX.utils.decode_range(ws['!ref']);
  const headers = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c });
    headers[c] = ws[cellRef] ? ws[cellRef].v : '';
  }
  for (let r = 1; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const h = headers[c] || '';
      const cellRef = XLSX.utils.encode_cell({ r, c });
      const cell = ws[cellRef];
      if (cell && typeof cell.v === 'number') {
        if (h.includes('Price') || h.includes('Cost')) {
          cell.z = '$#,##0.00';
        } else if (h.includes('Qty') || h.includes('Count') || h.includes('SKUs') || h === 'Days Active') {
          cell.z = '#,##0';
        }
      }
    }
  }
}

function createStyledSheet(data, colWidths = null, diffData = null, headerFg = 'FF0072C6') {
  const normalized = normalizeRowsForExcel(data);
  const ws = XLSX.utils.json_to_sheet(normalized);
  if (colWidths) ws['!cols'] = colWidths;
  if (diffData) applyDiffStyles(ws, diffData);
  else applyDiffStyles(ws, data);
  formatNumericCells(ws);
  enableSheetUsability(ws, headerFg);
  return ws;
}

// Sheet 1: Category Summary
const summaryWS = createStyledSheet(summaryData.data, [
  { wch: 30 }, { wch: 45 }, { wch: 15 },
  { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
]);
XLSX.utils.book_append_sheet(wb, summaryWS, 'Category Summary');

// Sheet 2: All SKUs
const skuWS = createStyledSheet(skuData.data, SKU_COL_WIDTHS);
XLSX.utils.book_append_sheet(wb, skuWS, 'All SKUs');

// Sheet 2b: Chassis Variants — Dedicated sheet showing all CTO base chassis options with pricing.
const chassisVariantRows = skuData.data.filter(r => r['Main Category'] === 'Chassis');
if (chassisVariantRows.length > 0) {
  const FORM_FACTOR_MAP = {
    '8SFF': 'Small Form Factor (8-Bay)', '24SFF': 'Small Form Factor (24-Bay)',
    '12LFF': 'Large Form Factor (12-Bay)', '8LFF': 'Large Form Factor (8-Bay)',
    '16EDSFF': 'eDesign SFF (16-Bay)', 'High Power': 'High Power / Telco',
    'Telco': 'High Power / Telco'
  };
  const variantSheetRows = chassisVariantRows.map(r => {
    const desc = r['Description'] || '';
    let formFactor = 'Unknown';
    for (const [key, label] of Object.entries(FORM_FACTOR_MAP)) {
      if (desc.includes(key)) { formFactor = label; break; }
    }
    return {
      'Product #':           r['Product #'],
      'Form Factor':         formFactor,
      'Description':         r['Description'],
      'Option Type':         r['Option Type'],
      'List Price (USD)':    r['Unit Price (USD)'],
      'Constraint':          r['Constraint Text'] || 'max 1 — Mandatory Base Chassis',
      'Start Date':          r['Start Date'],
      'Discontinued Date':   r['Discontinued Date'] || 'Active',
      'Diff Status':         r['Diff Status'],
      'Price History Trail': r['Price History Trail'],
      'Note': 'Select ONE chassis variant as the mandatory CTO base. All component rules, drive bay limits, and power constraints depend on this selection.'
    };
  });
  const variantWS = createStyledSheet(variantSheetRows, [
    { wch: 18 }, { wch: 30 }, { wch: 75 }, { wch: 14 },
    { wch: 18 }, { wch: 40 }, { wch: 14 }, { wch: 18 },
    { wch: 16 }, { wch: 100 }, { wch: 80 }
  ], variantSheetRows, 'FF01A781'); // HPE Emerald
  XLSX.utils.book_append_sheet(wb, variantWS, 'Chassis Variants');
  console.log(`  ✅ Sheet 'Chassis Variants' — ${variantSheetRows.length} CTO base options with pricing.`);
}

// Sheet 3: Rules & Constraints
const rulesWS = createStyledSheet(rulesData.data, [
  { wch: 30 }, { wch: 45 }, { wch: 15 }, { wch: 20 }, { wch: 100 }
]);
XLSX.utils.book_append_sheet(wb, rulesWS, 'Rules & Constraints');

// Sheet 4a: Hardware Accessories, Software & Licenses, and Support Services (Routing by Category)
const isSoftwareRow = (r) => {
  const cat = (r['Main Category'] || '').toLowerCase();
  const sub = (r['Sub-Category'] || '').toLowerCase();
  const desc = (r['Description'] || '').toLowerCase();
  return cat.includes('software') || cat.includes('license') || sub.includes('software') || sub.includes('license') || desc.includes('oneview') || desc.includes('ilo ') || desc.includes('e-ltu');
};

const isSupportRow = (r) => {
  const cat = (r['Main Category'] || '').toLowerCase();
  const sub = (r['Sub-Category'] || '').toLowerCase();
  const desc = (r['Description'] || '').toLowerCase();
  return (cat.includes('support') || cat.includes('service') || sub.includes('pointnext') || sub.includes('tech care') || desc.includes('tech care')) && !isSoftwareRow(r);
};

const swLicenses = [
  ...skuData.data.filter(isSoftwareRow),
  ...servicesData.data.filter(isSoftwareRow)
];

const supportServices = servicesData.data.filter(isSupportRow);
const hwAccessories   = servicesData.data.filter(r => !isSoftwareRow(r) && !isSupportRow(r));

if (hwAccessories.length > 0) {
  const hwWS = createStyledSheet(hwAccessories, SKU_COL_WIDTHS);
  XLSX.utils.book_append_sheet(wb, hwWS, 'Hardware Accessories');
  console.log(`  ✅ Sheet 'Hardware Accessories' — ${hwAccessories.length} accessory SKUs.`);
}

if (swLicenses.length > 0) {
  const swWS = createStyledSheet(swLicenses, SKU_COL_WIDTHS);
  XLSX.utils.book_append_sheet(wb, swWS, 'Software & Licenses');
  console.log(`  ✅ Sheet 'Software & Licenses' — ${swLicenses.length} consolidated software/license SKUs.`);
}

if (supportServices.length > 0) {
  const spWS = createStyledSheet(supportServices, SKU_COL_WIDTHS);
  XLSX.utils.book_append_sheet(wb, spWS, 'Support Services');
  console.log(`  ✅ Sheet 'Support Services' — ${supportServices.length} service/support SKUs.`);
}

// Sheet 4: Catalog Diff (Combined Hardware + Services Diffs)
const allCombinedData = [...skuData.data, ...servicesData.data];
const diffRows = allCombinedData.filter(r =>
  r['Diff Status'] === 'ADDED' || r['Diff Status'] === 'REMOVED' || r['Diff Status'] === 'PRICE_CHANGED' ||
  r['Diff Status'] === 'ATTRIBUTE_CHANGED' || r['Diff Status'] === 'PRICE_AND_ATTRIBUTE_CHANGED' || r['Diff Status'] === 'REINSTATED'
);

if (diffRows.length > 0) {
  const diffWS = createStyledSheet(diffRows, SKU_COL_WIDTHS);
  XLSX.utils.book_append_sheet(wb, diffWS, 'Catalog Diffs');
  console.log(`  ✅ Sheet 'Catalog Diffs' — ${diffRows.length} modified SKUs across hardware and services.`);
}

// Sheet 5: Price History Timeline (Complete timeline covering hardware + services)
const timelineRows = allCombinedData.map(r => ({
  'Main Category': r['Main Category'],
  'Sub-Category': r['Sub-Category'],
  'Product #': r['Product #'],
  'Description': r['Description'],
  'Current Price (USD)': r['Unit Price (USD)'],
  'Diff Status': r['Diff Status'],
  'Price History Trail': r['Price History Trail']
}));

const timelineWS = createStyledSheet(timelineRows, [
  { wch: 25 }, { wch: 35 }, { wch: 16 }, { wch: 70 },
  { wch: 18 }, { wch: 16 }, { wch: 100 }
], allCombinedData);
XLSX.utils.book_append_sheet(wb, timelineWS, 'Price History Timeline');

// Dynamic Category Drill-Down Sheets
const REQUIRED_CATEGORIES = [
  'Processor', 'Memory', 'Smart Chassis', 'Storage Devices',
  'Networking', 'Power Supplies', 'Graphics Options',
  'HPE Pointnext & Tech Care (3Y-5Y)', 'Support & Services',
  'Supported Operating System', 'Server Management Software'
];

const allCategoriesInData = [...new Set(
  skuData.data.map(r => r['Main Category']).filter(Boolean)
)];

const orderedCategories = [
  ...REQUIRED_CATEGORIES,
  ...allCategoriesInData.filter(c => !REQUIRED_CATEGORIES.includes(c))
];

const usedSheetNames = wb.SheetNames.slice();

for (const cat of orderedCategories) {
  if (cat.toLowerCase().includes('software') || cat.toLowerCase().includes('license')) continue; // Already consolidated into 'Software & Licenses'
  const catSKUs = skuData.data.filter(r => r['Main Category'] === cat);
  if (catSKUs.length === 0) continue;
  const ws = createStyledSheet(catSKUs, SKU_COL_WIDTHS);
  const sheetName = sanitizeSheetName(cat, usedSheetNames);
  usedSheetNames.push(sheetName);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
}

// Discontinued SKUs Sheet
const discontinuedJsonPath = path.join(targetDir, 'history', 'discontinued_skus.json');
let discontinuedRows = [];
if (fs.existsSync(discontinuedJsonPath)) {
  try {
    const discObj = JSON.parse(fs.readFileSync(discontinuedJsonPath, 'utf-8'));
    discontinuedRows = Object.values(discObj).map(d => {
      // If category is unknown, resolve from allCombinedData
      let mainCat = d.mainCategory || '';
      let subCat = d.subCategory || '';
      if (!mainCat || mainCat === 'Unknown' || mainCat === 'Deprecation Archive') {
        const found = allCombinedData.find(r => r['Product #'] === d.productNumber);
        if (found) {
          mainCat = found['Main Category'];
          subCat = found['Sub-Category'];
        }
      }
      return {
        'Product #':        d.productNumber    || '',
        'Description':      d.description      || '',
        'Main Category':    mainCat || 'General Hardware',
        'Sub-Category':     subCat  || 'Discontinued Options',
        'Status':           d.status           || 'DISCONTINUED',
        'First Seen Date':  d.firstSeenDate    || '',
        'Discontinued Date':d.discontinuedDate || '',
        'Reinstated Date':  d.reinstatedDate   || '',
        'Days Active':      String(d.daysActive || ''),
        'Last Known Price': d.lastKnownPrice   || '',
        'Full Price Trail': d.fullPriceTrail   || '',
        'Reason':           d.reason           || '[DISCONTINUED] Deprecated from latest HPE OCA portal'
      };
    });
  } catch (e) { console.warn('Could not read discontinued_skus.json:', e.message); }
}

if (discontinuedRows.length > 0) {
  const discWS = createStyledSheet(discontinuedRows, [
    { wch: 16 }, { wch: 70 }, { wch: 28 }, { wch: 28 },
    { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 },
    { wch: 12 }, { wch: 18 }, { wch: 100 }, { wch: 50 }
  ]);
  const discRange = XLSX.utils.decode_range(discWS['!ref']);
  for (let r = 1; r <= discRange.e.r; r++) {
    const row = discontinuedRows[r - 1];
    if (!row) continue;
    const isDiscontinued = row['Status'] === 'DISCONTINUED' || row['Status'] === 'REMOVED';
    const isReinstated   = row['Status'] === 'REINSTATED';
    const rowStyle = isDiscontinued
      ? { font: { name: 'Calibri', sz: 11, color: { rgb: 'FFC5221F' }, strike: true }, fill: { fgColor: { rgb: 'FFFDE7E7' } } }
      : isReinstated
      ? { font: { name: 'Calibri', sz: 11, color: { rgb: 'FF7B4F00' }, bold: true }, fill: { fgColor: { rgb: 'FFFFF8E1' } } }
      : null;
    if (rowStyle) {
      for (let c = discRange.s.c; c <= discRange.e.c; c++) {
        const ref = XLSX.utils.encode_cell({ r, c });
        if (discWS[ref]) discWS[ref].s = rowStyle;
      }
    }
  }
  XLSX.utils.book_append_sheet(wb, discWS, 'Discontinued SKUs');
  console.log(`  ✅ Sheet 'Discontinued SKUs' — ${discontinuedRows.length} entries (${discontinuedRows.filter(r => r['Status'] === 'DISCONTINUED' || r['Status'] === 'REMOVED').length} discontinued, ${discontinuedRows.filter(r => r['Status'] === 'REINSTATED').length} reinstated).`);
}

// Sheet: Metadata — all values derived dynamically
const catalogJsonPath = path.join(targetDir, `${filePrefix}_Catalog.json`);
let catalogMeta = {};
if (fs.existsSync(catalogJsonPath)) {
  try { catalogMeta = JSON.parse(fs.readFileSync(catalogJsonPath, 'utf-8')).metadata || {}; } catch (e) { console.warn('Caught suppressed error in generate_xlsx.js:', e); }
}

const diffCounts = {
  added: allCombinedData.filter(r => r['Diff Status'] === 'ADDED').length,
  removed: allCombinedData.filter(r => r['Diff Status'] === 'REMOVED').length,
  reinstated: allCombinedData.filter(r => r['Diff Status'] === 'REINSTATED').length,
  priceChanged: allCombinedData.filter(r => r['Diff Status'] === 'PRICE_CHANGED' || r['Diff Status'] === 'PRICE_AND_ATTRIBUTE_CHANGED').length,
  attributeChanged: allCombinedData.filter(r => r['Diff Status'] === 'ATTRIBUTE_CHANGED').length,
  unchanged: allCombinedData.filter(r => r['Diff Status'] === 'UNCHANGED' || r['Diff Status'] === 'BASELINE' || !r['Diff Status']).length,
};

const servicesJsonPath = path.join(targetDir, `${filePrefix}_Services.json`);

const metaData = [
  { Field: 'Chassis',                Value: catalogMeta.chassis       || filePrefix.replace(/_/g, ' ') },
  { Field: 'Scrape Date',            Value: catalogMeta.scrapeDate    || new Date().toISOString() },
  { Field: 'Source',                 Value: 'OCA (Online Configuration Application)' },
  { Field: 'Total Sub-Categories',   Value: String(summaryData.data.length) },
  { Field: 'Total Hardware SKUs',        Value: String(catalogMeta.totalUniqueSKUs !== undefined ? catalogMeta.totalUniqueSKUs : skuData.data.length) },
  { Field: 'Total Service/Software SKUs', Value: String(servicesData.data.length) },
  { Field: 'Total Combined SKUs',        Value: String(allCombinedData.length) },
  { Field: 'Chassis Variant Options',    Value: String(skuData.data.filter(r => r['Main Category'] === 'Chassis').length) },
  { Field: 'Total Rules',                Value: String(rulesData.data.length) },
  { Field: 'Total Tables',               Value: String(catalogMeta.totalTables || '') },
  { Field: 'Diff Added SKUs',            Value: String(diffCounts.added) },
  { Field: 'Diff Removed SKUs',          Value: String(diffCounts.removed) },
  { Field: 'Diff Price Changed',         Value: String(diffCounts.priceChanged) },
  { Field: 'Diff Attr Changed',          Value: String(diffCounts.attributeChanged) },
  { Field: 'Diff Reinstated SKUs',       Value: String(diffCounts.reinstated) },
  { Field: 'Diff Unchanged SKUs',        Value: String(diffCounts.unchanged) },
  { Field: 'Discontinued (All-Time)',    Value: String(discontinuedRows.filter(r => r['Status'] === 'DISCONTINUED' || r['Status'] === 'REMOVED').length) },
  { Field: 'Reinstated (All-Time)',      Value: String(discontinuedRows.filter(r => r['Status'] === 'REINSTATED').length) },
  { Field: 'Services JSON',              Value: fs.existsSync(servicesJsonPath) ? servicesJsonPath : '(Not yet generated)' },
  { Field: 'Output Folder',              Value: targetDir },
];
const metaWS = createStyledSheet(metaData, [{ wch: 30 }, { wch: 80 }]);
XLSX.utils.book_append_sheet(wb, metaWS, 'Metadata');

// ── Write file ────────────────────────────────────────────────────────────────
XLSX.writeFile(wb, xlsxPath);

console.log('\n✅ Excel workbook saved: ' + xlsxPath);
console.log(`   Hardware SKUs: ${skuData.data.length} | Service SKUs: ${servicesData.data.length} | Rules: ${rulesData.data.length}`);
console.log('\nSheets:');
wb.SheetNames.forEach((name, i) => {
  const ws    = wb.Sheets[name];
  const range = ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']) : { e: { r: 0 } };
  console.log(`  ${i + 1}. ${name} (${range.e.r} data rows)`);
});

// ── Cleanup intermediate TSV scraps ───────────────────────────────────────────
try {
  if (fs.existsSync(scrapsDir)) {
    // We purposefully do not delete the intermediate TSV files so they remain available for inspection or standalone re-runs.
  }
} catch (err) {
  console.warn(`\n⚠️  Could not clean up intermediate scraps: ${err.message}`);
}

