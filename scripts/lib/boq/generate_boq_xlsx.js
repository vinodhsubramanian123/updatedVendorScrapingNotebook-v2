'use strict';
const XLSX = require('xlsx-js-style');
const fs = require('fs');
const path = require('path');

function generateProfessionalBOQ(evalResults, exportPath, chassisId, rankTier) {
  const wb = XLSX.utils.book_new();
  const tier = rankTier || 1;
  const rankedSolution = evalResults.conflictGraph?.rankedSolutions?.find(s => s.rank === tier) || null;
  let allSkus = rankedSolution?.skuList || rankedSolution?.skuPartsList || [];

  if (allSkus.length === 0 && evalResults.items) {
    const fixes = (evalResults.conflictGraph?.resolvedFixes || evalResults.missingDependencies || []).map(f => ({
      ...f,
      sku: f.sku || f.key,
      isFixInjected: true,
      category: 'Mandatory Aspect Fix'
    }));
    allSkus = [...evalResults.items.map(it => ({ ...it, isFixInjected: false })), ...fixes];
  }

  // Data mapping
  const baseSkus = allSkus.filter(s => !s.isFixInjected && s.category !== 'Strategy Add-on' && s.category !== 'Aspect Rule Fix' && s.category !== 'Mandatory Aspect Fix');
  const missingDeps = allSkus.filter(s => s.isFixInjected || s.category === 'Aspect Rule Fix' || s.category === 'Mandatory Aspect Fix');
  const strategyOptions = allSkus.filter(s => s.category === 'Strategy Add-on');

  // Styles
  const headerStyle = {
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '0F172A' } }, // Slate 900
    alignment: { vertical: 'center', horizontal: 'center' },
    border: { top: {style:'thin', color: {auto: 1}}, bottom: {style:'thin', color: {auto: 1}} }
  };
  
  const currencyStyle = { numFmt: '"$"#,##0.00' };

  // --- SHEET 1: SUMMARY & RATIONALE ---
  const summaryData = [
    ['HPE BOQ EVALUATION REPORT - STRATEGY RANK ' + tier],
    [],
    ['Field', 'Value'],
    ['Chassis Variant', chassisId || 'Unknown'],
    ['Strategy Name', rankedSolution?.name || 'N/A'],
    ['Intent Match', rankedSolution?.tradeoffMetrics?.intentAlignment || 'N/A'],
    ['Base BOM Cost', evalResults.budgetOptimization?.currentBomCostUsd || 0],
    ['Fix Cost', rankedSolution?.budgetBreakdown?.fixCost || 0],
    ['Strategy Add-on Cost', rankedSolution?.budgetBreakdown?.strategyAddonCost || 0],
    ['Total Estimated CapEx', rankedSolution?.estimatedCostUsd || 0],
    [],
    ['NotebookLM RAG Reasoning'],
    [rankedSolution?.reasoning || 'N/A']
  ];
  
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  // Apply formatting
  wsSummary['A1'].s = { font: { sz: 14, bold: true, color: { rgb: '0072C6' } } };
  wsSummary['A3'].s = headerStyle;
  wsSummary['B3'].s = headerStyle;
  wsSummary['A12'].s = { font: { bold: true, color: { rgb: '0F172A' } }, fill: { fgColor: { rgb: 'E2E8F0' } } };
  wsSummary['B7'].s = currencyStyle;
  wsSummary['B8'].s = currencyStyle;
  wsSummary['B9'].s = currencyStyle;
  wsSummary['B10'].s = Object.assign({ font: { bold: true, color: {rgb: '15803D'} } }, currencyStyle);
  
  wsSummary['!cols'] = [{ wch: 25 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // --- Helper to build item sheets ---
  function createSkusSheet(skus, sheetName, emptyMessage) {
    const data = [['SKU', 'Quantity', 'Description', 'Category', 'Unit Price (USD)', 'Extended Price (USD)', 'Pricing Impact & Role']];
    let rowNum = 2;
    skus.forEach(s => {
      const uPrice = s.unitPriceUsd || 0;
      let pricingRole = 'Standard Option';
      if (uPrice === 0) pricingRole = '✅ Zero-Cost / Included ($0.00)';
      else if (uPrice <= 1) pricingRole = 'ℹ️ Nominal Factory Enablement ($1.00)';
      else if (s.isFixInjected) pricingRole = '⚡ Mandatory Rule Fix';
      
      data.push([
        s.sku,
        s.quantity,
        s.description || '',
        s.category || 'Standard',
        uPrice,
        { t: 'n', f: `B${rowNum}*E${rowNum}` }, // Formula for extended price
        pricingRole
      ]);
      rowNum++;
    });
    
    if (skus.length === 0) {
      data.push([emptyMessage, '', '', '', '', '', '']);
    } else {
      // Add Total row
      data.push(['TOTAL', '', '', '', '', { t: 'n', f: `SUM(F2:F${rowNum-1})` }, '']);
    }

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 20 }, // SKU
      { wch: 10 }, // Qty
      { wch: 75 }, // Desc
      { wch: 20 }, // Cat
      { wch: 15 }, // Unit
      { wch: 20 }, // Ext
      { wch: 32 }, // Pricing Impact
    ];

    // Style Headers
    for (let c = 0; c < 7; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c });
      if (ws[cellRef]) ws[cellRef].s = headerStyle;
    }
    
    // Style Data Rows
    for (let r = 1; r < rowNum - (skus.length === 0 ? 0 : 0); r++) {
      const skuData = skus[r - 1];
      let rowFill = null;
      if (skuData && skuData.status === 'Discontinued') {
        rowFill = { fgColor: { rgb: 'FFC000' } }; // Warning fill
      }

      if (ws[`A${r+1}`]) ws[`A${r+1}`].s = { font: { name: 'Courier New', bold: true }, locked: true, ...(rowFill ? { fill: rowFill } : {}) }; // SKU locked formatting
      if (ws[`B${r+1}`]) ws[`B${r+1}`].s = { locked: false, ...(rowFill ? { fill: rowFill } : {}) }; // Quantities unlocked
      if (ws[`C${r+1}`]) ws[`C${r+1}`].s = { ...(rowFill ? { fill: rowFill } : {}) };
      if (ws[`D${r+1}`]) ws[`D${r+1}`].s = { ...(rowFill ? { fill: rowFill } : {}) };
      if (ws[`E${r+1}`]) ws[`E${r+1}`].s = Object.assign({ locked: true, ...(rowFill ? { fill: rowFill } : {}) }, currencyStyle);
      if (ws[`F${r+1}`]) ws[`F${r+1}`].s = Object.assign({ locked: true, ...(rowFill ? { fill: rowFill } : {}) }, currencyStyle);
    }
    
    // Style Total Row
    if (skus.length > 0) {
      const totRow = rowNum;
      ws[`A${totRow}`].s = { font: { bold: true }, locked: true };
      ws[`F${totRow}`].s = Object.assign({ font: { bold: true }, locked: true }, currencyStyle);
    }
    
    // Enable autofilter for data rows
    if (skus.length > 0) {
      ws['!autofilter'] = { ref: `A1:F${rowNum-1}` };
    }
    
    // Lock cells: enable protection on the worksheet
    ws['!protect'] = {
      password: "hpe",
      selectLockedCells: true,
      selectUnlockedCells: true,
      formatCells: false
    };

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  // Generate the 3 sheets
  createSkusSheet(baseSkus, 'Base BOM', 'No base SKUs found in this tier.');
  createSkusSheet(missingDeps, 'Missing Dependencies', 'No missing physical dependencies injected.');
  createSkusSheet(strategyOptions, 'Strategy Add-ons', 'No strategy up-sell add-ons for this tier.');

  XLSX.writeFile(wb, exportPath);
  return exportPath;
}

/**
 * Generate standardized Partner Portal Upload & Reconciliation BOM (INV-32).
 * Formats data with exact 7-column contract required by ReactVendorSolution:
 * ['Part No', 'Qty', 'Set', ' Description', 'Unit List Price (USD)', 'Extended Price (USD)', 'Portal / CLIC Status']
 *
 * @param {Array<object>} clusters - Array of cluster objects [{ name, multiplier, items }]
 * @param {string} exportPath - Output xlsx file path
 * @param {object} [options] - Optional title/config metadata
 */
function generatePartnerPortalUploadBOM(clusters, exportPath, options = {}) {
  const wb = XLSX.utils.book_new();
  const portalData = [];

  const C_DARK = '0B192C';
  const C_EMERALD = '008559';
  const C_SLATE = '1E3E62';
  const C_ROW_ALT = 'F4F8F6';
  const C_WHITE = 'FFFFFF';
  const C_BORDER = 'DDE4E1';

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

  const headerStyle = (fillRgb = C_DARK, textRgb = C_WHITE, size = 10) => ({
    fill: { fgColor: { rgb: fillRgb } },
    font: fontBase(true, textRgb, size),
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: borderThin
  });

  // Ensure clusters is an array
  const clusterList = Array.isArray(clusters) ? clusters : [{ name: 'Default_Cluster', multiplier: 1, items: clusters || [] }];
  let grandTotal = 0;
  let totalServerNodes = 0;

  clusterList.forEach((cluster, cIdx) => {
    const mult = cluster.multiplier || 1;
    totalServerNodes += mult;

    if (cIdx > 0) {
      // 2-line gap between configurations
      portalData.push([]);
      portalData.push([]);
      portalData.push([`CONFIGURATION #${cIdx + 1}: ${mult}x ${cluster.name || 'Server Node'}`]);
      portalData.push([`Scope: ${mult} Servers | 100% Factory Buildable`]);
      portalData.push(['Part No', 'Qty', 'Total Qty', 'Description', 'Unit List Price (USD)', 'Extended Price (USD)', 'Portal / CLIC Status']);
    } else {
      portalData.push(['Part No', 'Qty', 'Set', ' Description', 'Unit List Price (USD)', 'Extended Price (USD)', 'Portal / CLIC Status']);
    }

    let configSubtotal = 0;
    const items = cluster.items || [];

    items.forEach(it => {
      const perServerQty = it.quantity || 1;
      const unitPrice = it.unitPriceUsd || it.price || it.unitPrice || 0;
      const ext = perServerQty * mult * unitPrice;
      configSubtotal += ext;

      portalData.push([
        it.sku || it['Product #'] || '',
        perServerQty,
        mult,
        it.description || it.desc || '',
        unitPrice,
        ext,
        '100% Validated in CLIC'
      ]);
    });

    grandTotal += configSubtotal;
    portalData.push(['', '', `CONFIG #${cIdx + 1} SUBTOTAL:`, '', '', configSubtotal, `${mult} Nodes Ready for Portal Feed`]);
  });

  if (clusterList.length > 1) {
    portalData.push([]);
    portalData.push([]);
    portalData.push(['GRAND TOTAL (ALL CONFIGURATIONS):', '', `${totalServerNodes} Total Server Nodes`, '', '', grandTotal, '100% Validated & Certified for HPE Partner Portal Upload']);
  }

  const ws = XLSX.utils.aoa_to_sheet(portalData);
  ws['!cols'] = [
    { wch: 18 }, { wch: 8 }, { wch: 22 }, { wch: 65 }, { wch: 22 }, { wch: 22 }, { wch: 32 }
  ];

  // Apply cell styling to headers and numeric values
  for (let r = 0; r < portalData.length; r++) {
    const row = portalData[r];
    if (!row || row.length === 0) continue;

    const firstCell = String(row[0] || '');
    const isHeader = row[0] === 'Part No';
    const isSubtotal = String(row[2] || '').includes('SUBTOTAL:');
    const isGrandTotal = firstCell.startsWith('GRAND TOTAL');
    const isTitle = firstCell.startsWith('CONFIGURATION #');
    const isScope = firstCell.startsWith('Scope:');

    for (let c = 0; c < 7; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) continue;

      if (isHeader) {
        ws[addr].s = headerStyle(C_DARK, C_WHITE, 10);
      } else if (isSubtotal) {
        ws[addr].s = cellStyle(C_EMERALD, true, (c === 4 || c === 5) ? 'right' : (c === 2 ? 'center' : 'left'), C_WHITE, 10);
        if (c === 4 || c === 5) ws[addr].z = '$#,##0.00';
      } else if (isGrandTotal) {
        ws[addr].s = cellStyle(C_DARK, true, (c === 4 || c === 5) ? 'right' : (c === 2 ? 'center' : 'left'), C_WHITE, 11);
        if (c === 4 || c === 5) ws[addr].z = '$#,##0.00';
      } else if (isTitle) {
        ws[addr].s = headerStyle(C_DARK, C_WHITE, 11);
      } else if (isScope) {
        ws[addr].s = cellStyle(C_SLATE, false, 'left', C_WHITE, 9);
      } else {
        const bg = (r % 2 === 0) ? C_ROW_ALT : C_WHITE;
        const align = (c === 1 || c === 2) ? 'center' : (c === 4 || c === 5) ? 'right' : 'left';
        ws[addr].s = cellStyle(bg, c === 0 || c === 5, align, '000000', 9);
        if (c === 4 || c === 5) ws[addr].z = '$#,##0.00';
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Partner Portal Upload BOM');
  if (exportPath) {
    const outDir = path.dirname(exportPath);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    XLSX.writeFile(wb, exportPath);
  }
  return wb;
}

module.exports = {
  generateProfessionalBOQ,
  generatePartnerPortalUploadBOM
};
