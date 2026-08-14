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

// ── Column widths for 23-field SKU schema (18 base + 5 diff fields) ──────────
const SKU_COL_WIDTHS = [
  { wch: 25 }, // Main Category
  { wch: 35 }, // Sub-Category
  { wch: 70 }, // Hierarchy Path
  { wch: 22 }, // Component Role
  { wch: 15 }, // Constraint Text
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
        font: { name: 'Calibri', sz: 11, color: { rgb: '137333' }, bold: true },
        fill: { fgColor: { rgb: 'E6F4EA' } }
      };
    } else if (status === 'REMOVED') {
      style = {
        font: { name: 'Calibri', sz: 11, color: { rgb: 'C5221F' }, strike: true },
        fill: { fgColor: { rgb: 'FDE7E7' } }
      };
    } else if (status === 'REINSTATED') {
      style = {
        font: { name: 'Calibri', sz: 11, color: { rgb: '7B4F00' }, bold: true },
        fill: { fgColor: { rgb: 'FFF8E1' } }   // Gold/amber — returned from discontinuation
      };
    } else if (status === 'PRICE_CHANGED') {
      style = {
        font: { name: 'Calibri', sz: 11, color: { rgb: 'B06000' }, bold: true },
        fill: { fgColor: { rgb: 'FFF3E0' } }
      };
    } else if (status === 'ATTRIBUTE_CHANGED') {
      style = {
        font: { name: 'Calibri', sz: 11, color: { rgb: '1A73E8' } },
        fill: { fgColor: { rgb: 'E8F0FE' } }   // Blue — attribute change only
      };
    } else if (status === 'PRICE_AND_ATTRIBUTE_CHANGED') {
      style = {
        font: { name: 'Calibri', sz: 11, color: { rgb: '6B0080' }, bold: true },
        fill: { fgColor: { rgb: 'F3E5F5' } }   // Purple — both changed
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

// ── Enable Freeze Header Row & AutoFilter for clean UX ───────────────────────
function enableSheetUsability(ws) {
  if (!ws || !ws['!ref']) return;
  ws['!autofilter'] = { ref: ws['!ref'] };
  ws['!views']      = [{ state: 'frozen', xSplit: 0, ySplit: 1, activeCell: 'A2' }];

  // Style header row
  const range = XLSX.utils.decode_range(ws['!ref']);
  const headerStyle = {
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '0072C6' } },
    alignment: { vertical: 'center' }
  };
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[cellRef]) {
      ws[cellRef].s = headerStyle;
    }
  }
}

// Sheet 1: Category Summary
const summaryWS = XLSX.utils.json_to_sheet(summaryData.data);
summaryWS['!cols'] = [
  { wch: 30 }, { wch: 45 }, { wch: 15 },
  { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
];
enableSheetUsability(summaryWS);
XLSX.utils.book_append_sheet(wb, summaryWS, 'Category Summary');

// Sheet 2: All SKUs
const skuWS = XLSX.utils.json_to_sheet(skuData.data);
skuWS['!cols'] = SKU_COL_WIDTHS;
applyDiffStyles(skuWS, skuData.data);
enableSheetUsability(skuWS);
XLSX.utils.book_append_sheet(wb, skuWS, 'All SKUs');

// Sheet 2b: Chassis Variants — Dedicated sheet showing all CTO base chassis options with pricing.
// This is the foundational selection — all downstream component rules depend on the chosen variant.
const chassisVariantRows = skuData.data.filter(r => r['Main Category'] === 'Chassis');
if (chassisVariantRows.length > 0) {
  // Enrich with a human-readable Form Factor column derived from description
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
  const variantWS = XLSX.utils.json_to_sheet(variantSheetRows);
  variantWS['!cols'] = [
    { wch: 18 }, // Product #
    { wch: 30 }, // Form Factor
    { wch: 75 }, // Description
    { wch: 14 }, // Option Type
    { wch: 18 }, // List Price (USD)
    { wch: 40 }, // Constraint
    { wch: 14 }, // Start Date
    { wch: 18 }, // Discontinued Date
    { wch: 16 }, // Diff Status
    { wch: 100 }, // Price History Trail
    { wch: 80 }, // Note
  ];
  // Style header with a distinct emerald green to highlight importance
  const variantRange = XLSX.utils.decode_range(variantWS['!ref']);
  const variantHeaderStyle = {
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '01A781' } }, // HPE Emerald
    alignment: { vertical: 'center' }
  };
  for (let c = variantRange.s.c; c <= variantRange.e.c; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c });
    if (variantWS[cellRef]) variantWS[cellRef].s = variantHeaderStyle;
  }
  applyDiffStyles(variantWS, variantSheetRows);
  variantWS['!autofilter'] = { ref: variantWS['!ref'] };
  variantWS['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: 1, activeCell: 'A2' }];
  XLSX.utils.book_append_sheet(wb, variantWS, 'Chassis Variants');
  console.log(`  ✅ Sheet 'Chassis Variants' — ${variantSheetRows.length} CTO base options with pricing.`);
}

// Sheet 3: Rules & Constraints
const rulesWS = XLSX.utils.json_to_sheet(rulesData.data);
rulesWS['!cols'] = [
  { wch: 30 }, { wch: 45 }, { wch: 15 }, { wch: 20 }, { wch: 100 },
];
enableSheetUsability(rulesWS);
XLSX.utils.book_append_sheet(wb, rulesWS, 'Rules & Constraints');

// Sheet 4a: Hardware Accessories — Non-software items from the services TSV.
// These are valid hardware options (bezel kits, cable kits, rack accessories)
// that are separated from the main catalog because they are qty=0 by default.
// Sheet 4b: Software & Licenses — iLO licenses, GreenLake, Compute Ops Management subscriptions.
const HPE_HW_SKU_REGEX = /^[A-Z0-9]{6,12}-[A-Z0-9]{2,4}$/; // Standard hardware: P73282-B21 format
if (servicesData.data.length > 0) {
  const hwAccessories = servicesData.data.filter(r => HPE_HW_SKU_REGEX.test((r['Product #'] || '').trim()));
  const swLicenses    = servicesData.data.filter(r => !HPE_HW_SKU_REGEX.test((r['Product #'] || '').trim()));

  if (hwAccessories.length > 0) {
    const hwWS = XLSX.utils.json_to_sheet(hwAccessories);
    hwWS['!cols'] = SKU_COL_WIDTHS;
    applyDiffStyles(hwWS, hwAccessories);
    enableSheetUsability(hwWS);
    XLSX.utils.book_append_sheet(wb, hwWS, 'Hardware Accessories');
    console.log(`  ✅ Sheet 'Hardware Accessories' — ${hwAccessories.length} accessory SKUs (bezel kits, cable kits, rack add-ons).`);
  }

  if (swLicenses.length > 0) {
    const swWS = XLSX.utils.json_to_sheet(swLicenses);
    swWS['!cols'] = SKU_COL_WIDTHS;
    applyDiffStyles(swWS, swLicenses);
    enableSheetUsability(swWS);
    XLSX.utils.book_append_sheet(wb, swWS, 'Software & Licenses');
    console.log(`  ✅ Sheet 'Software & Licenses' — ${swLicenses.length} software/service SKUs (iLO, GreenLake, Compute Ops).`);
  }

  if (hwAccessories.length === 0 && swLicenses.length === 0) {
    // Fallback: dump everything as before
    const servicesWS = XLSX.utils.json_to_sheet(servicesData.data);
    servicesWS['!cols'] = SKU_COL_WIDTHS;
    applyDiffStyles(servicesWS, servicesData.data);
    enableSheetUsability(servicesWS);
    XLSX.utils.book_append_sheet(wb, servicesWS, 'All Service SKUs');
  }
} else {
  console.log(`  ℹ️  No service/accessory SKUs found in TSV — sheets skipped.`);
}

// Sheet 4: Catalog Diff (Dedicated diff sheet — ONLY when diffs exist)
const diffRows = skuData.data.filter(r =>
  r['Diff Status'] === 'ADDED' || r['Diff Status'] === 'REMOVED' || r['Diff Status'] === 'PRICE_CHANGED'
);

if (diffRows.length > 0) {
  const diffWS = XLSX.utils.json_to_sheet(diffRows);
  diffWS['!cols'] = SKU_COL_WIDTHS;
  applyDiffStyles(diffWS, diffRows);
  enableSheetUsability(diffWS);
  XLSX.utils.book_append_sheet(wb, diffWS, 'Catalog Diffs');
}

// Sheet 5: Price History Timeline (Dedicated sheet for viewing the complete timeline of all SKUs)
const timelineWS = XLSX.utils.json_to_sheet(skuData.data.map(r => ({
  'Main Category': r['Main Category'],
  'Sub-Category': r['Sub-Category'],
  'Product #': r['Product #'],
  'Description': r['Description'],
  'Current Price (USD)': r['Unit Price (USD)'],
  'Diff Status': r['Diff Status'],
  'Price History Trail': r['Price History Trail']
})));

timelineWS['!cols'] = [
  { wch: 25 }, // Main Category
  { wch: 35 }, // Sub-Category
  { wch: 16 }, // Product #
  { wch: 70 }, // Description
  { wch: 18 }, // Current Price (USD)
  { wch: 16 }, // Diff Status
  { wch: 100 } // Price History Trail (wider for timeline readability)
];

// Apply same diff styles based on 'Diff Status'
applyDiffStyles(timelineWS, skuData.data);
enableSheetUsability(timelineWS);
XLSX.utils.book_append_sheet(wb, timelineWS, 'Price History Timeline');

// Sheets 5+: Category drill-downs — dynamically discovered from SKU data
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

const usedSheetNames = wb.SheetNames.slice(); // Track names already in use

for (const cat of orderedCategories) {
  const catSKUs = skuData.data.filter(r => r['Main Category'] === cat);
  if (catSKUs.length === 0) continue;   // Skip categories with no SKUs
  const ws       = XLSX.utils.json_to_sheet(catSKUs);
  ws['!cols']    = SKU_COL_WIDTHS;
  applyDiffStyles(ws, catSKUs);
  enableSheetUsability(ws);
  const sheetName = sanitizeSheetName(cat, usedSheetNames);
  usedSheetNames.push(sheetName);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
}

// Sheet: Discontinued & Reinstated SKU Registry
// Loaded directly from discontinued_skus.json — the single source of truth for
// all SKUs ever removed from the HPE OCA portal for this chassis.
const discontinuedJsonPath = path.join(targetDir, 'history', 'discontinued_skus.json');
let discontinuedRows = [];
if (fs.existsSync(discontinuedJsonPath)) {
  try {
    const discObj = JSON.parse(fs.readFileSync(discontinuedJsonPath, 'utf-8'));
    discontinuedRows = Object.values(discObj).map(d => ({
      'Product #':        d.productNumber    || '',
      'Description':      d.description      || '',
      'Main Category':    d.mainCategory     || '',
      'Sub-Category':     d.subCategory      || '',
      'Status':           d.status           || '',
      'First Seen Date':  d.firstSeenDate    || '',
      'Discontinued Date':d.discontinuedDate || '',
      'Reinstated Date':  d.reinstatedDate   || '',
      'Days Active':      String(d.daysActive || ''),
      'Last Known Price': d.lastKnownPrice   || '',
      'Full Price Trail': d.fullPriceTrail   || '',
      'Reason':           d.reason           || ''
    }));
  } catch (e) { console.warn('Could not read discontinued_skus.json:', e.message); }
}
if (discontinuedRows.length > 0) {
  const discWS = XLSX.utils.json_to_sheet(discontinuedRows);
  discWS['!cols'] = [
    { wch: 16 }, // Product #
    { wch: 70 }, // Description
    { wch: 28 }, // Main Category
    { wch: 28 }, // Sub-Category
    { wch: 14 }, // Status
    { wch: 14 }, // First Seen Date
    { wch: 16 }, // Discontinued Date
    { wch: 16 }, // Reinstated Date
    { wch: 12 }, // Days Active
    { wch: 18 }, // Last Known Price
    { wch: 100 },// Full Price Trail
    { wch: 50 }, // Reason
  ];
  // Style rows by status
  const discRange = XLSX.utils.decode_range(discWS['!ref']);
  for (let r = 1; r <= discRange.e.r; r++) {
    const row = discontinuedRows[r - 1];
    if (!row) continue;
    const isDiscontinued = row['Status'] === 'DISCONTINUED';
    const isReinstated   = row['Status'] === 'REINSTATED';
    const rowStyle = isDiscontinued
      ? { font: { name: 'Calibri', sz: 11, color: { rgb: 'C5221F' }, strike: true }, fill: { fgColor: { rgb: 'FDE7E7' } } }
      : isReinstated
      ? { font: { name: 'Calibri', sz: 11, color: { rgb: '7B4F00' }, bold: true }, fill: { fgColor: { rgb: 'FFF8E1' } } }
      : null;
    if (rowStyle) {
      for (let c = discRange.s.c; c <= discRange.e.c; c++) {
        const ref = XLSX.utils.encode_cell({ r, c });
        if (discWS[ref]) discWS[ref].s = rowStyle;
      }
    }
  }
  enableSheetUsability(discWS);
  XLSX.utils.book_append_sheet(wb, discWS, 'Discontinued SKUs');
  console.log(`  ✅ Sheet 'Discontinued SKUs' — ${discontinuedRows.length} entries (${discontinuedRows.filter(r => r['Status'] === 'DISCONTINUED').length} discontinued, ${discontinuedRows.filter(r => r['Status'] === 'REINSTATED').length} reinstated).`);
}

// Sheet: Metadata — all values derived dynamically
const catalogJsonPath = path.join(targetDir, `${filePrefix}_Catalog.json`);
let catalogMeta = {};
if (fs.existsSync(catalogJsonPath)) {
  try { catalogMeta = JSON.parse(fs.readFileSync(catalogJsonPath, 'utf-8')).metadata || {}; } catch (e) { console.warn('Caught suppressed error in generate_xlsx.js:', e); }
}

const diffSummary = catalogMeta.diffSummary || {};

const servicesJsonPath = path.join(targetDir, `${filePrefix}_Services.json`);
let servicesMeta = {};
if (fs.existsSync(servicesJsonPath)) {
  try { servicesMeta = JSON.parse(fs.readFileSync(servicesJsonPath, 'utf-8')).metadata || {}; } catch (e) { /* suppress */ }
}

const metaData = [
  { Field: 'Chassis',                Value: catalogMeta.chassis       || filePrefix.replace(/_/g, ' ') },
  { Field: 'Scrape Date',            Value: catalogMeta.scrapeDate    || new Date().toISOString() },
  { Field: 'Source',                 Value: 'OCA (Online Configuration Application)' },
  { Field: 'Total Sub-Categories',   Value: String(summaryData.data.length) },
  { Field: 'Total Hardware SKUs',        Value: String(skuData.data.length) },
  { Field: 'Chassis Variant Options',    Value: String(skuData.data.filter(r => r['Main Category'] === 'Chassis').length) },
  { Field: 'Hardware Accessories',       Value: String(servicesData.data.filter(r => HPE_HW_SKU_REGEX.test((r['Product #'] || '').trim())).length) },
  { Field: 'Software & License SKUs',   Value: String(servicesData.data.filter(r => !HPE_HW_SKU_REGEX.test((r['Product #'] || '').trim())).length) },
  { Field: 'Total Rules',                Value: String(rulesData.data.length) },
  { Field: 'Total Tables',               Value: String(catalogMeta.totalTables || '') },
  { Field: 'Diff Added SKUs',            Value: String(diffSummary.added || 0) },
  { Field: 'Diff Removed SKUs',          Value: String(diffSummary.removed || 0) },
  { Field: 'Diff Price Changed',         Value: String(diffSummary.priceChanged || 0) },
  { Field: 'Diff Attr Changed',          Value: String(diffSummary.attributeChanged || 0) },
  { Field: 'Diff Unchanged SKUs',        Value: String(diffSummary.unchanged || skuData.data.length) },
  { Field: 'Discontinued (All-Time)',    Value: String(discontinuedRows.filter(r => r['Status'] === 'DISCONTINUED').length) },
  { Field: 'Reinstated (All-Time)',      Value: String(discontinuedRows.filter(r => r['Status'] === 'REINSTATED').length) },
  { Field: 'Services JSON',              Value: fs.existsSync(servicesJsonPath) ? servicesJsonPath : '(Not yet generated)' },
  { Field: 'Output Folder',              Value: targetDir },
];
const metaWS = XLSX.utils.json_to_sheet(metaData);
metaWS['!cols'] = [{ wch: 25 }, { wch: 80 }];
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

